import AsyncStorage from '@react-native-async-storage/async-storage';
export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim() ||
  (process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '').trim();

  console.log('[apiClient] API_BASE_URL from env:', process.env.EXPO_PUBLIC_API_BASE_URL);
  console.log('[apiClient] API_BASE_URL from legacy env:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);

  export const isApiConfigured: boolean =
  API_BASE_URL.length > 0 ;

console.log('[apiClient] base URL:', API_BASE_URL);
console.log('[apiClient] configured:', isApiConfigured);

// ── Token storage ─────────────────────────────────────────────────────────────
const REFRESH_TOKEN_KEY = 'refreshToken';

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function setAuthToken(token: string | null): void {
  setAccessToken(token);
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
  method?:   'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?:     unknown;
  query?:    Record<string, string | number | boolean | undefined | null>;
  headers?:  Record<string, string>;
  signal?:   AbortSignal;
  _isRetry?: boolean; // prevents infinite refresh loops
};

// ── URL builder ───────────────────────────────────────────────────────────────
function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url  = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.append(k, String(v));
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

// ── Silent token refresh (fires once on 401, no recursion) ───────────────────
async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res  = await fetch(buildUrl('/auth/refresh'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    const data = json?.data ?? json;
    const accessToken = data?.accessToken ?? data?.tokens?.accessToken;
    const nextRefreshToken = data?.refreshToken ?? data?.tokens?.refreshToken;
    if (res.ok && accessToken) {
      setAccessToken(accessToken);
      if (nextRefreshToken) await setRefreshToken(nextRefreshToken);
      console.log('[apiClient] access token refreshed silently');
      return true;
    }
    // Refresh token expired — clear both so the user is sent to login
    await clearTokens();
    return false;
  } catch {
    return false;
  }
}

// ── Core request ──────────────────────────────────────────────────────────────
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', body, query, headers = {}, signal, _isRetry = false } = options;

  const token = getAccessToken();
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept:         'application/json',
    ...headers,
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const url = buildUrl(path, query);
  console.log(`[apiClient] ${method} ${url}`);

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body:    body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    // On 401 try one silent refresh then retry the original request
    if (res.status === 401 && !_isRetry) {
      const refreshed = await tryRefreshAccessToken();
      if (refreshed) {
        return apiRequest<T>(path, { ...options, _isRetry: true });
      }
      return { success: false, data: null, error: 'Session expired, please log in again' };
    }

    const text = await res.text();
    let parsed: ApiResult<T> | null = null;
    try { parsed = text ? (JSON.parse(text) as ApiResult<T>) : null; } catch { parsed = null; }

    if (!res.ok) {
      return { success: false, data: null, error: parsed?.error ?? `HTTP ${res.status}` };
    }
    if (parsed && typeof parsed === 'object' && 'success' in parsed) return parsed;
    return { success: true, data: parsed as unknown as T, error: null };

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    console.warn('[apiClient] request failed', message);
    return { success: false, data: null, error: message };
  }
}

// ── Convenience methods ───────────────────────────────────────────────────────
export const apiClient = {
  get:    <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
            apiRequest<T>(path, { ...opts, method: 'GET' }),
  post:   <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
            apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch:  <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
            apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  put:    <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
            apiRequest<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
            apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
