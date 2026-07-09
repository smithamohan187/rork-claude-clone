import { apiClient, API_BASE_URL } from '@/api/client';

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export type ContentType = 'offer' | 'event' | 'post';

export interface Comment {
  id: string;
  content_type: ContentType;
  content_id: string;
  profile_id: string | null;
  parent_comment_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  avatar_url: string | null;
  replies?: Comment[];
  reply_count?: number;
}

function resolveComment(c: Comment): Comment {
  return {
    ...c,
    avatar_url: resolveUrl(c.avatar_url),
    replies: c.replies?.map(resolveComment),
  };
}

export async function fetchComments(
  contentType: ContentType,
  contentId: string,
  limit = 20,
  offset = 0,
): Promise<Comment[]> {
  const result = await apiClient.get<{ comments: Comment[] }>(
    `/comments/${contentType}/${contentId}?limit=${limit}&offset=${offset}`
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to load comments');
  return (result.data!.comments ?? []).map(resolveComment);
}

export async function fetchReplies(
  commentId: string,
  limit = 20,
  offset = 0,
): Promise<Comment[]> {
  const result = await apiClient.get<{ replies: Comment[] }>(
    `/comments/${commentId}/replies?limit=${limit}&offset=${offset}`
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to load replies');
  return (result.data!.replies ?? []).map(resolveComment);
}

export async function addComment(
  contentType: ContentType,
  contentId: string,
  body: string,
  parentCommentId?: string,
): Promise<Comment> {
  const result = await apiClient.post<{ comment: Comment }>('/comments', {
    content_type: contentType,
    content_id: contentId,
    body,
    ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
  });
  if (!result.success) throw new Error(result.error ?? 'Failed to add comment');
  return resolveComment(result.data!.comment);
}

export async function deleteComment(commentId: string): Promise<void> {
  const result = await apiClient.delete<{ deleted: boolean }>(`/comments/${commentId}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to delete comment');
}
