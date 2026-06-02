// mobile/src/api/auth.api.ts
import { apiClient, setAuthToken, ApiResult } from './client';

export type LoginPayload = { email: string; password: string };
export type SignupPayload = { email: string; password: string; full_name?: string };
export type LoginResponse = { userId: string; accessToken: string; refreshToken: string };
export type SessionResponse = { userId: string; email: string | null };
export type SendOtpPayload = { identifier: string; type: 'email' | 'phone' };

export const authApi = {
  async login(payload: LoginPayload): Promise<ApiResult<LoginResponse>> {
    const result = await apiClient.post<LoginResponse>('/auth/login', payload);
    if (result.success && result.data?.accessToken) {
      await setAuthToken(result.data.accessToken);
    }
    return result;
  },
  async signup(payload: SignupPayload): Promise<ApiResult<{ userId: string }>> {
    return apiClient.post<{ userId: string }>('/auth/signup', payload);
  },
  async logout(): Promise<ApiResult<{ ok: true }>> {
    const result = await apiClient.post<{ ok: true }>('/auth/logout');
    await setAuthToken(null);
    return result;
  },
  async getSession(): Promise<ApiResult<SessionResponse>> {
    return apiClient.get<SessionResponse>('/auth/session');
  },
  async sendOtp(payload: SendOtpPayload): Promise<ApiResult<{ ok: true }>> {
    return apiClient.post<{ ok: true }>('/auth/otp/send', payload);
  },
};
