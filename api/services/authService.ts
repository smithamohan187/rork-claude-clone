import { apiClient } from '../client';
import type { SignupPayload, AuthTokens } from '../auth.api';

export type { SignupPayload };
export type SignUpResponse = AuthTokens;

export async function signUp(payload: SignupPayload): Promise<SignUpResponse> {
  const result = await apiClient.post<SignUpResponse>('/auth/signup', payload);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Registration failed. Please try again.');
  }
  return result.data;
}
