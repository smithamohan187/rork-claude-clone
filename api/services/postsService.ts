import { apiClient, getAccessToken, API_BASE_URL } from '@/api/client';
import { Platform } from 'react-native';

export interface Post {
  id: string;
  type: 'post';
  business_id: string;
  title: string;
  content: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePostPayload {
  title: string;
  content: string;
}

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function resolvePost(post: Post): Post {
  return { ...post, type: 'post', image_url: resolveUrl(post.image_url) };
}

export async function fetchMyPosts(filter?: 'active' | 'disabled'): Promise<Post[]> {
  const qs = filter ? `?status=${filter}` : '';
  const result = await apiClient.get<{ posts: Post[] }>(`/posts/my${qs}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load posts');
  return (result.data!.posts ?? []).map(resolvePost);
}

export async function fetchPostById(id: string): Promise<Post> {
  const result = await apiClient.get<{ post: Post }>(`/posts/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load post');
  return resolvePost(result.data!.post);
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  const result = await apiClient.post<{ post: Post }>('/posts', payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to create post');
  return resolvePost(result.data!.post);
}

export async function updatePost(id: string, payload: Partial<CreatePostPayload>): Promise<Post> {
  const result = await apiClient.put<{ post: Post }>(`/posts/${id}`, payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to update post');
  return resolvePost(result.data!.post);
}

export async function togglePostStatus(id: string, isActive: boolean): Promise<Post> {
  const result = await apiClient.patch<{ post: Post }>(`/posts/${id}/status`, { is_active: isActive });
  if (!result.success) throw new Error(result.error ?? 'Failed to update post status');
  return resolvePost(result.data!.post);
}

export async function deletePost(id: string): Promise<void> {
  const result = await apiClient.delete<{ id: string }>(`/posts/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to delete post');
}

async function buildPostFormData(uri: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    form.append('image', new File([blob], 'post.jpg', { type: 'image/jpeg' }));
  } else {
    form.append('image', { uri, name: 'post.jpg', type: 'image/jpeg' } as any);
  }
  return form;
}

export async function uploadPostImage(postId: string, uri: string): Promise<Post> {
  const token = getAccessToken();
  const form = await buildPostFormData(uri);
  const response = await fetch(`${BASE_URL}/posts/${postId}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Image upload failed');
  return resolvePost(data.data.post);
}
