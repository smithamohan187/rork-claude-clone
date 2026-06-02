import apiClient, { ApiResult } from './apiClient';

export type SessionRow = { id: string };

export type CreateSessionInput = {
  user_id: string;
  active_profile_id: string | null;
  device_id: string;
  platform: string;
  last_seen_at: string;
  created_at: string;
};

export async function getSessionByUserId(
  userId: string,
): Promise<ApiResult<SessionRow>> {
  return apiClient.get<SessionRow>(
    'user_sessions',
    { user_id: userId },
    { columns: 'id', maybeSingle: true },
  );
}

export async function createUserSession(
  body: CreateSessionInput,
): Promise<ApiResult<null>> {
  return apiClient.post('user_sessions', body);
}

export async function updateUserSession(
  userId: string,
  body: Partial<{
    active_profile_id: string | null;
    last_seen_at: string;
  }>,
): Promise<ApiResult<null>> {
  return apiClient.put('user_sessions', { user_id: userId }, body);
}
