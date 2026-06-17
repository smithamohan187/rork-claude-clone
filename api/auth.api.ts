import {
  apiClient,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  ApiResult,
} from './client';

// ── Payload types (mirror backend auth.schema.js) ─────────────────────────────
export type SignupPayload = {
  email:         string;
  password:      string;
  full_name:     string;
  phone?:        string;
  location?:     string;
  interests?:    string[];
  referral_code?: string;
};

export type LoginPayload = {
  email:    string;
  password: string;
};

export type AuthTokens = {
  userId:        string;
  profileId?:    string;
  accessToken:   string;
  refreshToken:  string;
  user?:         SessionResponse;
  tokens?: {
    accessToken?:  string;
    refreshToken?: string;
  };
};

export type SessionResponse = {
  id:        string;
  email:     string;
  full_name?: string;
  name?:      string;
  role?:      string;
  profile?:   Record<string, unknown>;
};

function extractAuthTokens(data: AuthTokens): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: data.accessToken ?? data.tokens?.accessToken ?? null,
    refreshToken: data.refreshToken ?? data.tokens?.refreshToken ?? null,
  };
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {

  // Register a new account — stores both tokens on success
  async signup(payload: SignupPayload): Promise<ApiResult<AuthTokens>> {
    const result = await apiClient.post<AuthTokens>('/auth/signup', payload);
    if (result.success && result.data) {
      const { accessToken, refreshToken } = extractAuthTokens(result.data);
      if (!accessToken || !refreshToken) {
        return { success: false, data: null, error: 'Signup response did not include auth tokens' };
      }
      await setAccessToken(accessToken);
      await setRefreshToken(refreshToken);
      console.log('[authApi] signup success, userId:', result.data.userId);
    }
    return result;
  },

  // Log in — stores both tokens on success
  async login(payload: LoginPayload): Promise<ApiResult<AuthTokens>> {
    try {
      const result = await apiClient.post<AuthTokens>(
        '/auth/login',
        payload
      );

      if (result.success && result.data) {
        const { accessToken, refreshToken } = extractAuthTokens(result.data);
        if (!accessToken || !refreshToken) {
          return { success: false, data: null, error: 'Login response did not include auth tokens' };
        }
        result.data.accessToken = accessToken;
        result.data.refreshToken = refreshToken;
        await setAccessToken(accessToken);
        await setRefreshToken(refreshToken);

        console.log('[authApi] login success, userId:', result.data.user?.id ?? result.data.userId);
      }

      return result;

    } catch (error) {
      console.error('[authApi] login failed', error);

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
},

  // Exchange refresh token for a new access token (called automatically by client.ts on 401)
  async refresh(): Promise<ApiResult<{ accessToken: string }>> {
    const token = await getRefreshToken();
    if (!token) return { success: false, data: null, error: 'No refresh token stored' };
    const result = await apiClient.post<{ accessToken: string }>(
      '/auth/refresh',
      { refreshToken: token },
      { _isRetry: true } as never, // skip the client-level auto-refresh to avoid loops
    );
    const accessToken = result.data?.accessToken ?? (result.data as { tokens?: { accessToken?: string } } | null)?.tokens?.accessToken;
    if (result.success && accessToken) {
      await setAccessToken(accessToken);
    }
    return result;
  },

  // Log out — clears session on server and removes tokens locally
  async logout(): Promise<ApiResult<{ ok: true }>> {
    const result = await apiClient.post<{ ok: true }>('/auth/logout');
    await clearTokens();
    console.log('[authApi] logged out');
    return result;
  },

  // Send OTP to email or phone
  async sendOtp(payload: { identifier: string; type: 'email' | 'phone' }): Promise<ApiResult<{ ok: true }>> {
    return apiClient.post<{ ok: true }>('/auth/otp/send', payload);
  },

  // Fetch the current user from the server (validates access token)
  async getSession(): Promise<ApiResult<SessionResponse>> {
    return apiClient.get<SessionResponse>('/auth/session');
  },
};
