import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchComments,
  fetchReplies,
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
  type Comment,
  type ContentType,
} from '@/api/services/commentsService';

const PAGE_SIZE = 20;

interface UseCommentsOptions {
  contentType: ContentType;
  contentId: string;
  enabled: boolean;
}

interface UseCommentsResult {
  comments: Comment[];
  commentCount: number;
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  submitComment: (body: string, parentCommentId?: string) => Promise<void>;
  removeComment: (commentId: string) => Promise<void>;
  loadReplies: (commentId: string) => Promise<void>;
}

export function useComments({ contentType, contentId, enabled }: UseCommentsOptions): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPage = useCallback(async (reset: boolean) => {
    if (!enabled || loading) return;
    setLoading(true);
    try {
      const offset = reset ? 0 : offsetRef.current;
      const page = await fetchComments(contentType, contentId, PAGE_SIZE, offset);
      if (!mountedRef.current) return;
      setComments((prev) => reset ? page : [...prev, ...page]);
      offsetRef.current = offset + page.length;
      setHasMore(page.length === PAGE_SIZE);
      if (reset) {
        const total = page.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);
        setCommentCount((prev) => Math.max(prev, total));
      }
    } catch {
      // silently fail — comments are non-critical
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [contentType, contentId, enabled, loading]);

  useEffect(() => {
    if (enabled) {
      offsetRef.current = 0;
      setComments([]);
      setHasMore(true);
      fetchPage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, contentType, contentId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) fetchPage(false);
  }, [loading, hasMore, fetchPage]);

  const submitComment = useCallback(async (body: string, parentCommentId?: string) => {
    const placeholder: Comment = {
      id: `local-${Date.now()}`,
      content_type: contentType,
      content_id: contentId,
      profile_id: null,
      parent_comment_id: parentCommentId ?? null,
      body,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_name: null,
      avatar_url: null,
      replies: [],
      reply_count: 0,
    };

    if (parentCommentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentCommentId
            ? { ...c, replies: [...(c.replies ?? []), placeholder], reply_count: (c.reply_count ?? 0) + 1 }
            : c
        )
      );
    } else {
      setComments((prev) => [...prev, placeholder]);
    }
    setCommentCount((n) => n + 1);

    try {
      const real = await apiAddComment(contentType, contentId, body, parentCommentId);
      if (!mountedRef.current) return;
      if (parentCommentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? { ...c, replies: (c.replies ?? []).map((r) => (r.id === placeholder.id ? real : r)) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.map((c) => (c.id === placeholder.id ? real : c)));
      }
    } catch {
      if (!mountedRef.current) return;
      if (parentCommentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== placeholder.id), reply_count: Math.max(0, (c.reply_count ?? 1) - 1) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== placeholder.id));
      }
      setCommentCount((n) => Math.max(0, n - 1));
      throw new Error('Failed to post comment');
    }
  }, [contentType, contentId]);

  const removeComment = useCallback(async (commentId: string) => {
    const applyDelete = (list: Comment[]): Comment[] =>
      list.map((c) => {
        if (c.id === commentId) {
          return { ...c, is_deleted: true, body: '[comment deleted]', display_name: null, avatar_url: null };
        }
        if (c.replies?.some((r) => r.id === commentId)) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId
                ? { ...r, is_deleted: true, body: '[comment deleted]', display_name: null, avatar_url: null }
                : r
            ),
          };
        }
        return c;
      });

    const prev = comments;
    setComments(applyDelete);
    setCommentCount((n) => Math.max(0, n - 1));

    try {
      await apiDeleteComment(commentId);
    } catch {
      if (!mountedRef.current) return;
      setComments(prev);
      setCommentCount((n) => n + 1);
      throw new Error('Failed to delete comment');
    }
  }, [comments]);

  const loadReplies = useCallback(async (commentId: string) => {
    try {
      const existing = comments.find((c) => c.id === commentId)?.replies ?? [];
      const newReplies = await fetchReplies(commentId, PAGE_SIZE, existing.length);
      if (!mountedRef.current) return;
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: [...(c.replies ?? []), ...newReplies] }
            : c
        )
      );
    } catch {
      // silently fail
    }
  }, [comments]);

  return { comments, commentCount, loading, hasMore, loadMore, submitComment, removeComment, loadReplies };
}
