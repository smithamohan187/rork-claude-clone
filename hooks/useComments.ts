import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchComments,
  fetchReplies,
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
  type Comment,
  type ContentType,
} from '@/api/services/commentsService';
import { toggleLike as apiToggleLike } from '@/api/services/likesService';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 20;

// Flat, display-ready shape consumed by CommentSection/FullScreenFeedViewer —
// separate from the raw `Comment` API shape so those components don't need to
// know about profile lookups, reply nesting, etc.
export interface CommentItem {
  id: string;
  author: string;
  authorInitials: string;
  avatarColor: string;
  body: string;
  createdAt: string;
  likeCount: number;
  hasLiked: boolean;
  isBusinessReply: boolean;
  parentId: string | null;
  profileId: string | null;
  isDeleted: boolean;
  replyCount: number;
}

// A deleted top-level comment only counts while it still anchors a live reply (preserving the
// thread); a deleted reply never counts. Shared by the initial fetch and every mutation so the
// displayed count can never drift from what's actually rendered.
function countVisible(list: Comment[]): number {
  return list.reduce((acc, c) => {
    const liveReplies = (c.replies ?? []).filter((r) => !r.is_deleted).length;
    const selfCounts = !c.is_deleted || liveReplies > 0;
    return acc + (selfCounts ? 1 : 0) + liveReplies;
  }, 0);
}

const AVATAR_COLORS = ['#1A5C35', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6', '#10B981'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function mapCommentToItem(c: Comment): CommentItem {
  const author = c.display_name ?? 'Anonymous';
  return {
    id: c.id,
    author,
    authorInitials: initialsForName(author),
    avatarColor: colorForName(author),
    body: c.body,
    createdAt: c.created_at,
    likeCount: c.like_count ?? 0,
    hasLiked: c.liked_by_me ?? false,
    isBusinessReply: false,
    parentId: c.parent_comment_id,
    profileId: c.profile_id,
    isDeleted: c.is_deleted,
    replyCount: c.reply_count ?? 0,
  };
}

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
  toggleCommentLike: (commentId: string) => void;
}

export function useComments({ contentType, contentId, enabled }: UseCommentsOptions): UseCommentsResult {
  const { authLoading } = useAuth();
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
    if (authLoading || !enabled || loading) return;
    setLoading(true);
    try {
      const offset = reset ? 0 : offsetRef.current;
      const page = await fetchComments(contentType, contentId, PAGE_SIZE, offset);
      if (!mountedRef.current) return;
      setComments((prev) => reset ? page : [...prev, ...page]);
      offsetRef.current = offset + page.length;
      setHasMore(page.length === PAGE_SIZE);
      if (reset) {
        setCommentCount(countVisible(page));
      }
    } catch {
      // silently fail — comments are non-critical
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [contentType, contentId, enabled, loading, authLoading]);

  useEffect(() => {
    if (enabled && !authLoading) {
      offsetRef.current = 0;
      setComments([]);
      setHasMore(true);
      fetchPage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, contentType, contentId, authLoading]);

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
    const updated = applyDelete(prev);
    setComments(updated);
    // Recompute from the full updated list, not a delta — deleting the last live reply under an
    // already-deleted parent must also drop that parent's tombstone from the count in one step.
    setCommentCount(countVisible(updated));

    try {
      await apiDeleteComment(commentId);
    } catch {
      if (!mountedRef.current) return;
      setComments(prev);
      setCommentCount(countVisible(prev));
      throw new Error('Failed to delete comment');
    }
  }, [comments]);

  const toggleCommentLike = useCallback((commentId: string) => {
    const applyToggle = (list: Comment[], delta: number, liked: boolean): Comment[] =>
      list.map((c) => {
        if (c.id === commentId) {
          return { ...c, liked_by_me: liked, like_count: Math.max(0, (c.like_count ?? 0) + delta) };
        }
        if (c.replies?.some((r) => r.id === commentId)) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId
                ? { ...r, liked_by_me: liked, like_count: Math.max(0, (r.like_count ?? 0) + delta) }
                : r
            ),
          };
        }
        return c;
      });

    const target =
      comments.find((c) => c.id === commentId) ??
      comments.flatMap((c) => c.replies ?? []).find((r) => r.id === commentId);
    if (!target) return;
    const wasLiked = target.liked_by_me ?? false;

    setComments((prev) => applyToggle(prev, wasLiked ? -1 : 1, !wasLiked));

    apiToggleLike('comment', commentId)
      .then((res) => {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) return { ...c, liked_by_me: res.liked, like_count: res.like_count };
            if (c.replies?.some((r) => r.id === commentId)) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId ? { ...r, liked_by_me: res.liked, like_count: res.like_count } : r
                ),
              };
            }
            return c;
          })
        );
      })
      .catch(() => {
        setComments((prev) => applyToggle(prev, wasLiked ? 1 : -1, wasLiked));
      });
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

  return { comments, commentCount, loading, hasMore, loadMore, submitComment, removeComment, loadReplies, toggleCommentLike };
}
