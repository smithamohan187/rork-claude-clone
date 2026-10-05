import { apiClient, getAccessToken, API_BASE_URL } from '@/api/client';
import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import { resolveImageUrl as resolveUrl } from '@/utils/resolveImageUrl';

export interface MediaItem {
  id: string;
  business_id: string;
  image_url: string;
  created_at: string;
}

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

function resolveMedia(item: MediaItem): MediaItem {
  return { ...item, image_url: resolveUrl(item.image_url) ?? item.image_url };
}

export async function fetchMyUploads(
  limit = 20,
  offset = 0,
): Promise<{ items: MediaItem[]; hasMore: boolean }> {
  const result = await apiClient.get<{ items: MediaItem[]; hasMore: boolean }>(
    `/business-media?limit=${limit}&offset=${offset}`,
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to load your uploads');
  return {
    items: (result.data!.items ?? []).map(resolveMedia),
    hasMore: !!result.data!.hasMore,
  };
}

async function buildMediaFormData(uri: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    form.append('image', new File([blob], 'media.jpg', { type: 'image/jpeg' }));
  } else {
    // expo/fetch (SDK 57+) only accepts string | Blob | {bytes()} FormData parts —
    // the old {uri, name, type} object shape throws "Unsupported FormData part implementation".
    const file = new ExpoFile(uri);
    form.append('image', file, 'media.jpg');
  }
  return form;
}

export async function uploadMedia(uri: string): Promise<MediaItem> {
  const token = getAccessToken();
  const form = await buildMediaFormData(uri);
  const response = await fetch(`${BASE_URL}/business-media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Upload failed');
  return resolveMedia(data.data.media);
}

export async function deleteMedia(id: string): Promise<void> {
  const result = await apiClient.delete<{ id: string }>(`/business-media/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to delete photo');
}
