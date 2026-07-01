// Service layer for the public business profile endpoint.
// Screens never call apiClient directly — they go through hooks, which call these functions.
import { apiClient, API_BASE_URL } from '@/api/client';

export interface BusinessHour {
  day_of_week: number;    // 0 = Sunday … 6 = Saturday
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

// Full shape returned by GET /businesses/:id
export interface BusinessProfile {
  id: string;
  name: string;
  description: string | null;
  business_type: 'goodwill' | 'incentivised';
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
  inhouse_referral: boolean;
  inhouse_referral_url: string | null;
  hours: BusinessHour[];
}

// Strip trailing slash so relative paths like /uploads/... append cleanly
const BASE_URL = API_BASE_URL.replace(/\/$/, '');

/**
 * Convert a relative server path to an absolute URL for expo-image.
 * e.g. /uploads/businesses/logo.jpg → http://localhost:3000/uploads/businesses/logo.jpg
 */
function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
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
