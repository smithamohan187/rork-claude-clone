import { useCallback, useEffect, useState } from 'react';
import * as reviewService from '@/api/services/reviewService';

export interface ReviewItem {
  id: string;
  userId: string;
  authorName: string;
  avatarUrl?: string | null;
  rating: number;
  reviewText: string;
  updatedAt: string;
}

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
  initialAverageRating?: number;
  initialRatingCount?: number;
}

export function useBusinessRating({
  businessId,
  isSubscriber,
  isOwner = false,
  initialAverageRating = 0,
  initialRatingCount = 0,
}: Options): UseBusinessRatingResult {
  const [averageRating, setAverageRating] = useState<number>(initialAverageRating);
  const [ratingCount, setRatingCount] = useState<number>(initialRatingCount);
  const [breakdown, setBreakdown] = useState<Record<number, number>>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userReview, setUserReview] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [summary, myReview, reviewList, breakdownData] = await Promise.all([
          reviewService.getRatingSummary(businessId),
          reviewService.getMyReview(businessId),
          reviewService.getBusinessReviews(businessId),
          reviewService.getRatingBreakdown(businessId),
        ]);
        if (!mounted) return;
        setAverageRating(Number(summary.average_rating));
        setRatingCount(Number(summary.review_count));
        if (myReview) {
          setUserRating(myReview.rating);
          setUserReview(myReview.review_text ?? '');
        }
        setReviews(reviewList.map(r => ({
          id: r.id,
          userId: r.id,
          authorName: r.display_name,
          avatarUrl: r.avatar_url,
          rating: r.rating,
          reviewText: r.review_text ?? '',
          updatedAt: r.updated_at,
        })));
        const bMap: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        for (const item of breakdownData) bMap[item.rating] = item.count;
        setBreakdown(bMap);
      } catch {
        // silently fall back to initial values from business profile fetch
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [businessId]);

  const submitRating = useCallback(
    async (stars: number, review: string) => {
      if (isOwner || !isSubscriber) return;
      if (stars < 1 || stars > 5) return;

      setSubmitting(true);
      try {
        const summary = await reviewService.submitReview(businessId, stars, review);
        setAverageRating(Number(summary.average_rating));
        setRatingCount(Number(summary.review_count));
        setUserRating(stars);
        setUserReview(review);
        const [refreshedList, refreshedBreakdown] = await Promise.all([
          reviewService.getBusinessReviews(businessId),
          reviewService.getRatingBreakdown(businessId),
        ]);
        setReviews(refreshedList.map(r => ({
          id: r.id,
          userId: r.id,
          authorName: r.display_name,
          avatarUrl: r.avatar_url,
          rating: r.rating,
          reviewText: r.review_text ?? '',
          updatedAt: r.updated_at,
        })));
        const bMap: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        for (const item of refreshedBreakdown) bMap[item.rating] = item.count;
        setBreakdown(bMap);
      } catch (err) {
        if (__DEV__) console.log('[useBusinessRating] submit error', err);
      } finally {
        setSubmitting(false);
      }
    },
    [businessId, isOwner, isSubscriber]
  );

  // Delete is not yet supported on the backend — stub to satisfy the interface
  const deleteRating = useCallback(async () => {}, []);

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
