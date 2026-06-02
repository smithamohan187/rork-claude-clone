import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export const isApiConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

console.log('[apiClient] URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING');
console.log('[apiClient] Key:', supabaseAnonKey ? 'SET (' + supabaseAnonKey.length + ' chars)' : 'MISSING');
console.log('[apiClient] Configured:', isApiConfigured);

if (!isApiConfigured) {
  console.warn('[apiClient] Backend URL or Key is missing. Auth and data calls will not work.');
}

/**
 * Custom fetch wrapper that silently converts network failures into a
 * synthetic 503 response. This prevents Supabase's background auth refresh
 * loop from spamming "AuthRetryableFetchError: Failed to fetch" when the
 * preview environment can't reach the Supabase host (e.g. sandboxed web
 * preview, offline, or misconfigured URL).
 */
const safeFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (err) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    console.log('[apiClient] network unreachable:', url?.substring(0, 60));
    return new Response(
      JSON.stringify({ error: 'network_unreachable', message: 'Network request failed' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

const client: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjYwMDAwMDAsImV4cCI6MTk0MTU3NjAwMH0.placeholder',
  {
    auth: {
      storage: AsyncStorage,
      // Disable the background auto-refresh loop. The app uses mock auth
      // via AuthContext, so we only need on-demand session calls. This
      // prevents repeating "Failed to fetch" errors when the Supabase
      // host is unreachable from the preview sandbox.
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: safeFetch,
    },
  },
);

export type ApiError = { message: string; code?: string };
export type ApiResult<T> = { data: T | null; error: ApiError | null };

function toApiError(err: unknown): ApiError {
  if (!err) return { message: 'Unknown error' };
  if (err instanceof Error) {
    if (/Failed to fetch|NetworkError|Network request failed|fetch failed/i.test(err.message)) {
      return {
        message:
          'Could not reach the server. Please check your internet connection and try again.',
        code: 'NETWORK',
      };
    }
    return { message: err.message };
  }
  const any = err as { message?: string; code?: string };
  if (any?.message) return { message: any.message, code: any.code };
  return { message: String(err) };
}

export type FilterValue = string | number | boolean | null;
export type Filters = Record<string, FilterValue>;

export type QueryOptions = {
  columns?: string;
  single?: boolean;
  maybeSingle?: boolean;
  order?: { column: string; ascending?: boolean };
  limit?: number;
};

export type WriteOptions = {
  returning?: boolean;
  single?: boolean;
};

export type UpsertOptions = WriteOptions & {
  onConflict?: string;
};

async function get<T = unknown>(
  table: string,
  filters: Filters = {},
  options: QueryOptions = {},
): Promise<ApiResult<T>> {
  try {
    let q = client.from(table).select(options.columns ?? '*');
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v as never);
    }
    if (options.order) {
      q = q.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    if (options.limit) {
      q = q.limit(options.limit);
    }
    const res = options.single
      ? await q.single()
      : options.maybeSingle
      ? await q.maybeSingle()
      : await q;
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: res.data as T, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function post<T = unknown>(
  table: string,
  body: unknown,
  options: WriteOptions = {},
): Promise<ApiResult<T>> {
  try {
    const base = client.from(table).insert(body as never);
    if (options.returning) {
      const sel = base.select();
      const res = options.single ? await sel.single() : await sel;
      if (res.error) return { data: null, error: toApiError(res.error) };
      return { data: res.data as T, error: null };
    }
    const res = await base;
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: null as T, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function put<T = unknown>(
  table: string,
  filters: Filters,
  body: unknown,
  options: WriteOptions = {},
): Promise<ApiResult<T>> {
  try {
    let base = client.from(table).update(body as never);
    for (const [k, v] of Object.entries(filters)) {
      base = base.eq(k, v as never);
    }
    if (options.returning) {
      const sel = base.select();
      const res = options.single ? await sel.single() : await sel;
      if (res.error) return { data: null, error: toApiError(res.error) };
      return { data: res.data as T, error: null };
    }
    const res = await base;
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: null as T, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function upsert<T = unknown>(
  table: string,
  body: unknown,
  options: UpsertOptions = {},
): Promise<ApiResult<T>> {
  try {
    const base = client
      .from(table)
      .upsert(body as never, options.onConflict ? { onConflict: options.onConflict } : undefined);
    if (options.returning) {
      const sel = base.select();
      const res = options.single ? await sel.single() : await sel;
      if (res.error) return { data: null, error: toApiError(res.error) };
      return { data: res.data as T, error: null };
    }
    const res = await base;
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: null as T, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function del(table: string, filters: Filters): Promise<ApiResult<null>> {
  try {
    let base = client.from(table).delete();
    for (const [k, v] of Object.entries(filters)) {
      base = base.eq(k, v as never);
    }
    const res = await base;
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function rpc<T = unknown>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  try {
    const res = await client.rpc(fn, args as never);
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: res.data as T, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function getCurrentUser(): Promise<ApiResult<User>> {
  try {
    const res = await client.auth.getUser();
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: res.data.user ?? null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function getSession(): Promise<ApiResult<Session>> {
  try {
    const res = await client.auth.getSession();
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: res.data.session ?? null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function getToken(): Promise<ApiResult<string>> {
  const { data, error } = await getSession();
  if (error) return { data: null, error };
  return { data: data?.access_token ?? null, error: null };
}

export type SignInResult = { userId: string; hasSession: boolean };

async function signIn(
  email: string,
  password: string,
): Promise<ApiResult<SignInResult>> {
  try {
    const res = await client.auth.signInWithPassword({ email, password });
    if (res.error) return { data: null, error: toApiError(res.error) };
    return {
      data: { userId: res.data.user?.id ?? '', hasSession: !!res.data.session },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function signInWithOtp(input: {
  email?: string;
  phone?: string;
}): Promise<ApiResult<null>> {
  try {
    const payload = input.email
      ? { email: input.email }
      : input.phone
      ? { phone: input.phone }
      : null;
    if (!payload) {
      return { data: null, error: { message: 'Email or phone is required' } };
    }
    const res = await client.auth.signInWithOtp(payload);
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

export type OtpType = 'email' | 'phone';

async function sendOtp(
  identifier: string,
  type: OtpType,
): Promise<ApiResult<null>> {
  try {
    const payload =
      type === 'email' ? { email: identifier } : { phone: identifier };
    const res = await client.auth.signInWithOtp(payload);
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function verifyOtp(
  identifier: string,
  token: string,
  type: OtpType,
): Promise<ApiResult<SignInResult>> {
  try {
    const res =
      type === 'email'
        ? await client.auth.verifyOtp({ email: identifier, token, type: 'email' })
        : await client.auth.verifyOtp({ phone: identifier, token, type: 'sms' });
    if (res.error) return { data: null, error: toApiError(res.error) };
    return {
      data: {
        userId: res.data.user?.id ?? '',
        hasSession: !!res.data.session,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

export type SignUpInput = {
  email?: string;
  phone?: string;
  password: string;
  metadata?: Record<string, unknown>;
};

async function signUp(input: SignUpInput): Promise<ApiResult<SignInResult>> {
  try {
    const options = input.metadata ? { data: input.metadata } : undefined;
    const payload: Parameters<typeof client.auth.signUp>[0] = input.email
      ? { email: input.email, password: input.password, options }
      : input.phone
      ? { phone: input.phone, password: input.password, options }
      : ({ password: input.password, options } as never);
    const res = await client.auth.signUp(payload);
    if (res.error) return { data: null, error: toApiError(res.error) };
    if (!res.data) {
      return {
        data: null,
        error: { message: 'No response from auth server. Please try again.' },
      };
    }
    return {
      data: { userId: res.data.user?.id ?? '', hasSession: !!res.data.session },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

async function signOut(): Promise<ApiResult<null>> {
  try {
    const res = await client.auth.signOut();
    if (res.error) return { data: null, error: toApiError(res.error) };
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

export type AuthEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'INITIAL_SESSION'
  | string;

export type AuthStateCallback = (event: AuthEvent, session: Session | null) => void;

function onAuthStateChange(cb: AuthStateCallback): () => void {
  const { data } = client.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}

const storage = {
  async upload(
    bucket: string,
    path: string,
    body: Blob | ArrayBuffer,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<ApiResult<null>> {
    try {
      const res = await client.storage.from(bucket).upload(path, body as Blob, {
        upsert: options?.upsert,
        contentType: options?.contentType,
      });
      if (res.error) return { data: null, error: toApiError(res.error) };
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: toApiError(e) };
    }
  },
  getPublicUrl(bucket: string, path: string): string {
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },
};

async function resetPassword(
  email: string,
  options?: { redirectTo?: string },
): Promise<ApiResult<null>> {
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: options?.redirectTo,
    });
    if (error) return { data: null, error: toApiError(error) };
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

export const apiClient = {
  get,
  post,
  put,
  upsert,
  delete: del,
  rpc,
  getCurrentUser,
  getSession,
  getToken,
  signIn,
  signInWithOtp,
  sendOtp,
  verifyOtp,
  signUp,
  signOut,
  onAuthStateChange,
  resetPassword,
  storage,
};

export default apiClient;
