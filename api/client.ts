import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim() ||
  (process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '').trim();

if (__DEV__) console.log('[apiClient] API_BASE_URL from env:', process.env.EXPO_PUBLIC_API_BASE_URL);
if (__DEV__) console.log('[apiClient] API_BASE_URL from legacy env:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);

export const isApiConfigured: boolean = API_BASE_URL.length > 0;

if (__DEV__) console.log('[apiClient] base URL:', API_BASE_URL);
if (__DEV__) console.log('[apiClient] configured:', isApiConfigured);

// ── Token storage ─────────────────────────────────────────────────────────────
const REFRESH_TOKEN_KEY = 'refreshToken';

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export async function setRefreshToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    else       await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (err) {
    console.warn('[apiClient] failed to persist refresh token', err);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem(REFRESH_TOKEN_KEY); }
  catch { return null; }
}

export async function clearTokens(): Promise<void> {
  _accessToken = null;
  await setRefreshToken(null);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type ApiResult<T> = {
  success: boolean;
  data:    T | null;
  error:   string | null;
  meta?:   Record<string, unknown>;
};

type RequestOptions = {
  query?:   Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?:  AbortSignal;
};

// ── Axios instance ─────────────────────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 10000,
});

// ── Request interceptor — attach access token ─────────────────────────────────
axiosInstance.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Silent token refresh ──────────────────────────────────────────────────────
async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res  = await axiosInstance.post('/auth/refresh', { refreshToken });
    const data = res.data?.data ?? res.data;
    const accessToken      = data?.accessToken ?? data?.tokens?.accessToken;
    const nextRefreshToken = data?.refreshToken ?? data?.tokens?.refreshToken;
    if (accessToken) {
      setAccessToken(accessToken);
      if (nextRefreshToken) await setRefreshToken(nextRefreshToken);
      if (__DEV__) console.log('[apiClient] access token refreshed silently');
      return true;
    }
    await clearTokens();
    return false;
  } catch {
    return false;
  }
}

// ── Response interceptor — handle 401 with one silent refresh retry ───────────
axiosInstance.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config as AxiosRequestConfig & { _isRetry?: boolean };

    // ✅ Skip interceptor for auth endpoints
    const requestUrl = original?.url ?? '';
    const isAuthRoute = requestUrl.includes('/auth/login') ||
                        requestUrl.includes('/auth/signup') ||
                        requestUrl.includes('/auth/refresh');

    if (err.response?.status === 401 && !original._isRetry && !isAuthRoute) {
      original._isRetry = true;
      const refreshed = await tryRefreshAccessToken();
      if (refreshed) return axiosInstance(original);
      return Promise.reject(new Error('Session expired, please log in again'));
    }
    return Promise.reject(err);
  }
);

// ── Core request ──────────────────────────────────────────────────────────────
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  if (!isApiConfigured) {
    return { success: false, data: null, error: 'API not configured. Check your .env file.' };
  }

  const { query, headers, signal } = options;

  if (__DEV__) console.log(`[apiClient] ${method} ${path}`);

  try {
    const res = await axiosInstance.request<{ data?: T } | T>({
      method,
      url: path,
      data: body,
      params: query,
      headers,
      signal,
    });

    const payload = (res.data as { data?: T })?.data ?? (res.data as T);
    return { success: true, data: payload, error: null };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        err.message;
      return { success: false, data: null, error: message };
    }
    const message = err instanceof Error ? err.message : 'Network error';
    console.warn('[apiClient] request failed', message);
    return { success: false, data: null, error: message };
  }
}

// ── Convenience methods ───────────────────────────────────────────────────────
export const apiClient = {
  get:    <T>(path: string, opts?: RequestOptions) =>
            apiRequest<T>('GET', path, undefined, opts),
  post:   <T>(path: string, body?: unknown, opts?: RequestOptions) =>
            apiRequest<T>('POST', path, body, opts),
  patch:  <T>(path: string, body?: unknown, opts?: RequestOptions) =>
            apiRequest<T>('PATCH', path, body, opts),
  put:    <T>(path: string, body?: unknown, opts?: RequestOptions) =>
            apiRequest<T>('PUT', path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) =>
            apiRequest<T>('DELETE', path, undefined, opts),
};
