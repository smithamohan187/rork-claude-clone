import { useCallback, useState } from 'react';
import { toggleLike as apiToggleLike, type ContentType } from '@/api/services/likesService';

interface UseLikeOptions {
  contentType: ContentType;
  contentId: string;
  initialLikeCount: number;
  initialHasLiked: boolean;
  isOwner: boolean;
}

export interface UseLikeResult {
  likeCount: number;
  hasLiked: boolean;
  isOwner: boolean;
  toggle: () => void;
}

export function useLike({
  contentType,
  contentId,
  initialLikeCount,
  initialHasLiked,
  isOwner,
}: UseLikeOptions): UseLikeResult {
  const [likeCount, setLikeCount] = useState<number>(initialLikeCount);
  const [hasLiked, setHasLiked] = useState<boolean>(initialHasLiked);

  const toggle = useCallback(() => {
    if (isOwner) return;

    const wasLiked = hasLiked;
    const prevCount = likeCount;
    setHasLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));

    apiToggleLike(contentType, contentId)
      .then((res) => {
        setHasLiked(res.liked);
        setLikeCount(res.like_count);
      })
      .catch(() => {
        setHasLiked(wasLiked);
        setLikeCount(prevCount);
      });
  }, [isOwner, hasLiked, likeCount, contentType, contentId]);

  return { likeCount, hasLiked, isOwner, toggle };
}
