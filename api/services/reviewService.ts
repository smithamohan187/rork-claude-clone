import { apiClient } from '@/api/client';

export interface RatingSummary {
  average_rating: number;
  review_count: number;
}

export interface UserReview {
  id: string;
  profile_id: string;
  business_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

export async function submitReview(
  businessId: string,
  rating: number,
  reviewText: string
): Promise<RatingSummary> {
  const result = await apiClient.post<RatingSummary>('/reviews', {
    business_id: businessId,
    rating,
    review_text: reviewText,
  });
  if (!result.success || !result.data) throw new Error(result.error ?? 'Submit review failed');
  return result.data;
}

export async function deleteReview(businessId: string): Promise<RatingSummary> {
  const result = await apiClient.delete<RatingSummary>('/reviews', {
    query: { business_id: businessId },
  });
  if (!result.success || !result.data) throw new Error(result.error ?? 'Delete review failed');
  return result.data;
}

export async function getRatingSummary(businessId: string): Promise<RatingSummary> {
  const result = await apiClient.get<RatingSummary>(`/reviews/summary?business_id=${businessId}`);
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to fetch rating summary');
  return result.data;
}

export async function getMyReview(businessId: string): Promise<UserReview | null> {
  const result = await apiClient.get<{ review: UserReview | null }>(`/reviews/me?business_id=${businessId}`);
  if (!result.success || !result.data) return null;
  return result.data.review;
}

export interface ReviewListItem {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  display_name: string;
  avatar_url: string | null;
}

export interface BreakdownItem {
  rating: number;
  count: number;
  percentage: number;
}

export async function getBusinessReviews(
  businessId: string,
  limit = 20,
  offset = 0
): Promise<ReviewListItem[]> {
  const result = await apiClient.get<{ reviews: ReviewListItem[] }>(
    `/reviews/list?business_id=${businessId}&limit=${limit}&offset=${offset}`
  );
  if (!result.success || !result.data) return [];
  return result.data.reviews;
}

export async function getRatingBreakdown(businessId: string): Promise<BreakdownItem[]> {
  const result = await apiClient.get<{ breakdown: BreakdownItem[] }>(
    `/reviews/breakdown?business_id=${businessId}`
  );
  if (!result.success || !result.data) return [];
  return result.data.breakdown;
}
