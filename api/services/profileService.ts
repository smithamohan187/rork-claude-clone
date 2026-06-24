import { apiClient } from '../client';

export interface InterestCategory {
  id: string;
  name: string;
  icon: string;
}

export interface ProfileData {
  email: string;
  phone?: string;
  profile_id: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  profile_type: string;
  is_active: boolean;
  created_at: string;
  interests: InterestCategory[];
}

export interface UpdateProfilePayload {
  display_name?: string;
  phone?: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  interest_ids?: string[];
}

export async function fetchMyProfile(): Promise<ProfileData> {
  console.log("Fetching my profile...");
  const result = await apiClient.get<ProfileData>('/profile/me');
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to load profile');
  return result.data;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<ProfileData> {
  const result = await apiClient.put<ProfileData>('/profile/me', payload);
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to update profile');
  return result.data;
}

export async function uploadAvatar(base64DataUri: string): Promise<string> {
  const result = await apiClient.patch<{ avatar_url: string }>(
    '/profile/me/avatar',
    { avatar_url: base64DataUri },
  );
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to upload avatar');
  return result.data.avatar_url;
}

export async function fetchInterestCategories(): Promise<InterestCategory[]> {
  const result = await apiClient.get<InterestCategory[]>('/profile/interests');
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to load interests');
  return result.data;
}
