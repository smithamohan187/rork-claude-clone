import { useCallback, useEffect, useRef, useState } from 'react';
import { DUMMY_COMMENTS, DUMMY_REACTIONS, type DummyComment } from '@/constants/dummyFeedData';

export type PostType = 'offer' | 'event' | 'broadcast';

export type CommentItem = DummyComment;

export interface UseCommentsResult {
  comments: CommentItem[];
  reactionCount: number;
  hasLiked: boolean;
  submitting: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  toggleLike: () => void;
  submitComment: (authorName: string, authorInitials: string, avatarColor: string) => Promise<void>;
}

export function useComments(postId: string, _postType: PostType): UseCommentsResult {
  const [comments, setComments] = useState<CommentItem[]>(() => DUMMY_COMMENTS[postId] ?? []);
  const [reactionCount, setReactionCount] = useState<number>(() => DUMMY_REACTIONS[postId] ?? 0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const toggleLike = useCallback(() => {
    setHasLiked((prev) => {
      const next = !prev;
      setReactionCount((c) => Math.max(0, c + (next ? 1 : -1)));
      return next;
    });
  }, []);

  const submitComment = useCallback(async (authorName: string, authorInitials: string, avatarColor: string) => {
    const body = commentText.trim();
    if (!body) return;
    setSubmitting(true);
    const temp: CommentItem = {
      id: `local-${Date.now()}`,
      author: authorName,
      authorInitials,
      avatarColor,
      body,
      createdAt: 'just now',
      likeCount: 0,
      isBusinessReply: false,
      parentId: null,
    };
    setComments((prev) => [...prev, temp]);
    setCommentText('');
    try {
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.log('[useComments] submit error', e);
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [commentText]);

  return {
    comments,
    reactionCount,
    hasLiked,
    submitting,
    commentText,
    setCommentText,
    toggleLike,
    submitComment,
  };
}
