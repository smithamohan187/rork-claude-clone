import { Platform } from 'react-native';
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

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function dataUriToBlob(dataUri: string): Blob {
  const [header, data] = dataUri.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(data);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mimeType });
}

export async function fetchMyProfile(): Promise<ProfileData> {
  const result = await apiClient.get<ProfileData>('/profile/me');
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to load profile');
  return result.data;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<ProfileData> {
  const result = await apiClient.put<ProfileData>('/profile/me', payload);
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to update profile');
  return result.data;
}

export async function uploadAvatarFile(params: {
  fileUri: string;
  base64DataUri: string;
  token: string;
}): Promise<string> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const blob = dataUriToBlob(params.base64DataUri);
    formData.append('avatar', blob, 'avatar.jpg');
  } else {
    formData.append('avatar', { uri: params.fileUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
  }
  const res = await fetch(`${BASE_URL}/profile/me/avatar-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.token}` },
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Failed to upload avatar');
  return json.data.url as string;
}

export async function saveAvatarUrl(relativeUrl: string): Promise<string> {
  const result = await apiClient.patch<{ avatar_url: string }>(
    '/profile/me/avatar',
    { avatar_url: relativeUrl },
  );
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to save avatar URL');
  return result.data.avatar_url;
}

export async function fetchInterestCategories(): Promise<InterestCategory[]> {
  const result = await apiClient.get<InterestCategory[]>('/profile/interests');
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to load interests');
  return result.data;
}
