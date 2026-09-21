// Service layer for the public business profile endpoint.
// Screens never call apiClient directly — they go through hooks, which call these functions.
import { apiClient } from '@/api/client';
import { resolveImageUrl as resolveUrl } from '@/utils/resolveImageUrl';

export interface BusinessHour {
  day_of_week: number;    // 0 = Sunday … 6 = Saturday
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

// Full shape returned by GET /businesses/:id
export interface BusinessProfile {
  id: string;
  profile_id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  business_type: 'goodwill' | 'incentivised';
  category_id: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  cover_url: string | null;
  category_name: string | null;
  subscriber_count: number;
  avg_rating: number;
  rating_count: number;
  active_offer_count: number;
  welcome_bonus_points: number;
  updated_at: string;
  inhouse_referral: boolean;
  inhouse_referral_url: string | null;
  hours: BusinessHour[];
}


/**
 * Fetch a public business profile by id.
 * Throws on network error or non-2xx response so the hook can catch and set error state.
 */
export async function fetchBusinessProfile(id: string): Promise<BusinessProfile> {
  const result = await apiClient.get<{ business: BusinessProfile }>(`/businesses/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load business profile');
  const biz = result.data!.business;
  return {
    ...biz,
    logo_url:  resolveUrl(biz.logo_url),
    cover_url: resolveUrl(biz.cover_url),
  };
}
