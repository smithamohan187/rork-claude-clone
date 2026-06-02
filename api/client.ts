// mobile/src/api/client.ts
// Base API client. Every request goes through here.
// Currently points at the placeholder backend URL; auth token is attached
// from AsyncStorage if available.

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1';

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim() ||
  (process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '').trim() ||
  DEFAULT_BASE_URL;

export const isApiConfigured: boolean = API_BASE_URL.length > 0 && API_BASE_URL !== DEFAULT_BASE_URL
  ? true
  : ((process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().length > 0 &&
     (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim().length > 0);

console.log('[apiClient] base URL:', API_BASE_URL);
console.log('[apiClient] configured:', isApiConfigured);

const TOKEN_STORAGE_KEY = 'auth.access_token';

export type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
};

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.warn('[apiClient] failed to persist token', err);
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const cleanedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${cleanedPath}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, query, headers = {}, signal } = options;
  const token = await getAuthToken();
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const url = buildUrl(path, query);
  console.log(`[apiClient] ${method} ${url}`);

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    const text = await res.text();
    let parsed: ApiResult<T> | null = null;
    try {
      parsed = text ? (JSON.parse(text) as ApiResult<T>) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: parsed?.error ?? `HTTP ${res.status}`,
      };
    }
    if (parsed && typeof parsed === 'object' && 'success' in parsed) {
      return parsed;
    }
    return { success: true, data: parsed as unknown as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    console.warn('[apiClient] request failed', message);
    return { success: false, data: null, error: message };
  }
}

export const apiClient = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
