import apiClient, { ApiResult } from './apiClient';

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type CreateProfileInput = {
  user_id: string;
  profile_type: string;
  display_name: string;
  avatar_url: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getDefaultProfile(
  userId: string,
): Promise<ApiResult<ProfileRow>> {
  return apiClient.get<ProfileRow>(
    'profiles',
    { user_id: userId, is_default: true },
    { columns: 'id, display_name, avatar_url', maybeSingle: true },
  );
}

export async function getDefaultProfileId(
  userId: string,
): Promise<ApiResult<{ id: string }>> {
  return apiClient.get<{ id: string }>(
    'profiles',
    { user_id: userId, is_default: true },
    { columns: 'id', maybeSingle: true },
  );
}

export async function createProfile(
  body: CreateProfileInput,
): Promise<ApiResult<{ id: string }>> {
  return apiClient.post<{ id: string }>('profiles', body, {
    returning: true,
    single: true,
  });
}

export async function updateDefaultProfile(
  userId: string,
  body: Partial<{
    display_name: string;
    avatar_url: string | null;
    updated_at: string;
  }>,
): Promise<ApiResult<null>> {
  return apiClient.put(
    'profiles',
    { user_id: userId, is_default: true },
    body,
  );
}
