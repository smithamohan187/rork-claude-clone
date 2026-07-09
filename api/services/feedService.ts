import { apiClient } from '@/api/client';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export interface FeedApiItem {
  item_type: 'offer' | 'event' | 'post';
  item_id: string;
  business_id: string;
  business_name: string;
  business_logo: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  relevant_date: string | null;
  is_saved?: boolean;
  like_count?: number;
  liked_by_me?: boolean;
  is_owner?: boolean;
  comment_count?: number;
}

export interface RecommendedBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  category: string | null;
  subscriber_count: number;
  avg_rating?: number;
}

export type FeedMode =
  | 'feed'
  | 'category_recommendations'
  | 'location_recommendations'
  | 'top_rated';

export interface FeedResponse {
  mode: FeedMode;
  items: FeedApiItem[] | RecommendedBusiness[];
}

function resolveItem(item: FeedApiItem): FeedApiItem {
  return {
    ...item,
    business_logo: resolveUrl(item.business_logo),
    image_url: resolveUrl(item.image_url),
  };
}

function resolveRecommendation(biz: RecommendedBusiness): RecommendedBusiness {
  return { ...biz, logo_url: resolveUrl(biz.logo_url), cover_url: resolveUrl(biz.cover_url) };
}

export async function getFeed(params?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<FeedResponse> {
  const res = await apiClient.get<FeedResponse>('/feed', {
    query: {
      category: params?.category,
      limit: params?.limit,
      offset: params?.offset,
    },
  });
  const data = res.data as FeedResponse;
  if (data.mode === 'feed') {
    return {
      mode: 'feed',
      items: (data.items as FeedApiItem[]).map(resolveItem),
    };
  }
  return {
    mode: data.mode,
    items: (data.items as RecommendedBusiness[]).map(resolveRecommendation),
  };
}
