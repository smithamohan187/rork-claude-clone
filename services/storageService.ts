import apiClient, { ApiResult } from './apiClient';

export async function uploadAvatar(
  userId: string,
  body: Blob | ArrayBuffer,
  contentType: string = 'image/jpeg',
): Promise<ApiResult<{ path: string; publicUrl: string }>> {
  const path = `${userId}/profile.jpg`;
  const { error } = await apiClient.storage.upload('avatars', path, body, {
    upsert: true,
    contentType,
  });
  if (error) return { data: null, error };
  const publicUrl = apiClient.storage.getPublicUrl('avatars', path);
  return { data: { path, publicUrl }, error: null };
}
