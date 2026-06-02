import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReviewItem {
  id: string;
  userId: string;
  authorName: string;
  avatarUrl?: string | null;
  rating: number;
  reviewText: string;
  updatedAt: string;
}

interface UserRatingRecord {
  rating: number;
  review: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'touchpoints_biz_rating_';

// DUMMY DATA — aggregate seed data per business. Replace with Supabase query when
// business_ratings table is wired.
const DUMMY_BUSINESS_RATINGS: Record<
  string,
  { average: number; count: number; breakdown: Record<number, number>; reviews: ReviewItem[] }
> = {
  default: {
    average: 4.3,
    count: 128,
    breakdown: { 5: 84, 4: 28, 3: 10, 2: 4, 1: 2 },
    reviews: [
      {
        id: 'r1',
        userId: 'u1',
        authorName: 'Priya S.',
        avatarUrl: null,
        rating: 5,
        reviewText:
          'Absolutely love this place — the staff remember my name and the coffee is unmatched. Worth every point!',
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'r2',
        userId: 'u2',
        authorName: 'Rahul K.',
        avatarUrl: null,
        rating: 4,
        reviewText: 'Great offers for subscribers. Wish the Indiranagar branch had more seating.',
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'r3',
        userId: 'u3',
        authorName: 'Aisha M.',
        avatarUrl: null,
        rating: 5,
        reviewText: 'Redeemed my first reward today. So easy and the team made it feel special.',
        updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'r4',
        userId: 'u4',
        authorName: 'Arun P.',
        avatarUrl: null,
        rating: 3,
        reviewText: 'Solid experience overall. Offers could be a bit more varied.',
        updatedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'r5',
        userId: 'u5',
        authorName: 'Neha T.',
        avatarUrl: null,
        rating: 5,
        reviewText: 'Referred three friends — we all keep coming back. Best neighbourhood spot.',
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
};

interface UseBusinessRatingResult {
  averageRating: number;
  ratingCount: number;
  breakdown: Record<number, number>;
  reviews: ReviewItem[];
  userRating: number | null;
  userReview: string;
  hasRated: boolean;
  isSubscriber: boolean;
  isOwner: boolean;
  loading: boolean;
  submitting: boolean;
  submitRating: (stars: number, review: string) => Promise<void>;
  deleteRating: () => Promise<void>;
}

interface Options {
  businessId: string;
  isSubscriber: boolean;
  isOwner?: boolean;
}

export function useBusinessRating({
  businessId,
  isSubscriber,
  isOwner = false,
}: Options): UseBusinessRatingResult {
  const seed = DUMMY_BUSINESS_RATINGS.default;

  const [averageRating, setAverageRating] = useState<number>(seed.average);
  const [ratingCount, setRatingCount] = useState<number>(seed.count);
  const [breakdown, setBreakdown] = useState<Record<number, number>>({ ...seed.breakdown });
  const [reviews, setReviews] = useState<ReviewItem[]>(seed.reviews);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userReview, setUserReview] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const storageKey = useMemo(() => `${STORAGE_PREFIX}${businessId}`, [businessId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw) as UserRatingRecord;
          setUserRating(parsed.rating);
          setUserReview(parsed.review ?? '');
        } else {
          setUserRating(null);
          setUserReview('');
        }
      } catch (err) {
        console.log('[useBusinessRating] load error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const submitRating = useCallback(
    async (stars: number, review: string) => {
      if (isOwner) {
        console.log('[useBusinessRating] owners cannot rate their own business');
        return;
      }
      if (!isSubscriber) {
        console.log('[useBusinessRating] non-subscriber cannot rate');
        return;
      }
      if (stars < 1 || stars > 5) return;

      setSubmitting(true);
      const prevUserRating = userRating;
      const hadRated = prevUserRating !== null;

      const newCount = hadRated ? ratingCount : ratingCount + 1;
      const newAvg = hadRated
        ? ratingCount > 0
          ? (averageRating * ratingCount - (prevUserRating ?? 0) + stars) / ratingCount
          : stars
        : (averageRating * ratingCount + stars) / newCount;

      const nextBreakdown: Record<number, number> = { ...breakdown };
      if (hadRated && prevUserRating) {
        nextBreakdown[prevUserRating] = Math.max(0, (nextBreakdown[prevUserRating] ?? 0) - 1);
      }
      nextBreakdown[stars] = (nextBreakdown[stars] ?? 0) + 1;

      setAverageRating(newAvg);
      setRatingCount(newCount);
      setBreakdown(nextBreakdown);
      setUserRating(stars);
      setUserReview(review);

      if (review.trim().length > 0) {
        setReviews((prev) => {
          const withoutMine = prev.filter((r) => r.userId !== 'me');
          const mine: ReviewItem = {
            id: `me-${Date.now()}`,
            userId: 'me',
            authorName: 'You',
            avatarUrl: null,
            rating: stars,
            reviewText: review,
            updatedAt: new Date().toISOString(),
          };
          return [mine, ...withoutMine].slice(0, 10);
        });
      }

      try {
        const record: UserRatingRecord = {
          rating: stars,
          review,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(record));
      } catch (err) {
        console.log('[useBusinessRating] save error', err);
      } finally {
        setSubmitting(false);
      }
    },
    [
      averageRating,
      breakdown,
      isOwner,
      isSubscriber,
      ratingCount,
      storageKey,
      userRating,
    ],
  );

  const deleteRating = useCallback(async () => {
    if (userRating === null) return;
    setSubmitting(true);
    const stars = userRating;
    const newCount = Math.max(0, ratingCount - 1);
    const newAvg =
      newCount === 0 ? 0 : (averageRating * ratingCount - stars) / newCount;
    const nextBreakdown: Record<number, number> = { ...breakdown };
    nextBreakdown[stars] = Math.max(0, (nextBreakdown[stars] ?? 0) - 1);

    setAverageRating(newAvg);
    setRatingCount(newCount);
    setBreakdown(nextBreakdown);
    setUserRating(null);
    setUserReview('');
    setReviews((prev) => prev.filter((r) => r.userId !== 'me'));

    try {
      await AsyncStorage.removeItem(storageKey);
    } catch (err) {
      console.log('[useBusinessRating] delete error', err);
    } finally {
      setSubmitting(false);
    }
  }, [averageRating, breakdown, ratingCount, storageKey, userRating]);

  return {
    averageRating,
    ratingCount,
    breakdown,
    reviews,
    userRating,
    userReview,
    hasRated: userRating !== null,
    isSubscriber,
    isOwner,
    loading,
    submitting,
    submitRating,
    deleteRating,
  };
}
