import { apiClient } from '@/api/client';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export type ContentType = 'offer' | 'event' | 'post';

export interface ToggleLikeResult {
  liked: boolean;
  like_count: number;
}

export interface LikeStatus {
  like_count: number;
  liked_by_me: boolean;
}

export interface LikerProfile {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
}

export async function toggleLike(
  content_type: ContentType,
  content_id: string,
): Promise<ToggleLikeResult> {
  const result = await apiClient.post<ToggleLikeResult>('/likes/toggle', {
    content_type,
    content_id,
  });
  if (!result.success) throw new Error(result.error ?? 'Failed to toggle like');
  return result.data!;
}

export async function getLikeStatus(
  content_type: ContentType,
  content_id: string,
): Promise<LikeStatus> {
  const result = await apiClient.get<LikeStatus>(`/likes/${content_type}/${content_id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to get like status');
  return result.data!;
}

export async function getLikers(
  content_type: ContentType,
  content_id: string,
  limit = 20,
  offset = 0,
): Promise<LikerProfile[]> {
  const result = await apiClient.get<LikerProfile[]>(
    `/likes/${content_type}/${content_id}/likers`,
    { query: { limit, offset } },
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to get likers');
  return (result.data ?? []).map((p) => ({
    ...p,
    avatar_url: resolveUrl(p.avatar_url),
  }));
}
