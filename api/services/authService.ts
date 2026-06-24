import { apiClient } from '../client';
import type { SignupPayload, AuthTokens } from '../auth.api';

export type { SignupPayload };
export type SignUpResponse = AuthTokens;
export type AuthResponse = AuthTokens;

export async function signUp(payload: SignupPayload): Promise<SignUpResponse> {
  const result = await apiClient.post<SignUpResponse>('/auth/signup', payload);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Registration failed. Please try again.');
  }
  return result.data;
}

export interface SignInPayload {
  identifier: string;
  password: string;
}
export async function signIn(payload: SignInPayload): Promise<AuthResponse> {
  const result = await apiClient.post<AuthResponse>('/auth/login', payload);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Login failed. Please try again.');
  }
  return result.data;
}

export async function signOut(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}
