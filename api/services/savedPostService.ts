import { apiClient } from '@/api/client';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export interface SavedPostItem {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  business_name: string;
  business_logo: string | null;
  saved_at: string;
}

export async function toggleSavePost(postId: string): Promise<{ saved: boolean }> {
  const result = await apiClient.post<{ saved: boolean }>('/saved-posts/toggle', { post_id: postId });
  if (!result.success) throw new Error(result.error ?? 'Toggle save failed');
  return result.data!;
}

export async function getSavedPosts(): Promise<SavedPostItem[]> {
  const result = await apiClient.get<SavedPostItem[]>('/saved-posts/my-posts');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch saved posts');
  return (result.data ?? []).map((p) => ({
    ...p,
    image_url: resolveUrl(p.image_url),
    business_logo: resolveUrl(p.business_logo),
  }));
}
