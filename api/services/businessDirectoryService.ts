// Service layer — wraps apiClient calls for the business directory endpoints.
// Screens never call apiClient directly; they go through hooks, which call these functions.
import { apiClient } from '@/api/client';

// Shape returned by GET /businessdirectory/categories
export interface BusinessCategory {
  id: string;
  name: string;
  icon: string | null;   // MaterialCommunityIcons name, e.g. 'food-fork-drink'
}

// Shape of a single business row returned by the directory endpoint
export interface BusinessDirectoryItem {
  id: string;
  name: string;
  business_type: string;          // 'goodwill' | 'incentivised'
  city: string | null;
  logo_url: string | null;        // absolute http:// URL after transform in this service
  category_name: string | null;   // from business_categories.name via JOIN
  category_icon: string | null;   // from business_categories.icon via JOIN
  subscriber_count: number;
  avg_rating: number | null;      // null when no ratings have been submitted yet
  rating_count: number;
}

// Shape of the paginated response from GET /businessdirectory
export interface BusinessDirectoryResult {
  businesses: BusinessDirectoryItem[];
  total: number;    // total matching rows (ignoring pagination) — used to detect hasMore
  page: number;
}

// Strip trailing slash so we can safely append paths like /uploads/businesses/file.jpg
const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Turn a relative logo path into an absolute URL.
 * React Native expo-image requires http:// — passing /uploads/... renders nothing.
 */
function resolveLogoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;   // already absolute
  return `${BASE_URL}${url}`;
}

/**
 * Fetch a page of businesses, optionally filtered by search text and category name.
 * Throws on failure so the hook can catch and set an error state.
 */
export const fetchBusinessDirectory = async (params: {
  search?: string;
  category?: string;
  page?: number;
}): Promise<BusinessDirectoryResult> => {
  const result = await apiClient.get<BusinessDirectoryResult>('/businessdirectory', {
    query: {
      search:   params.search   ?? undefined,
      category: params.category ?? undefined,
      page:     params.page     ?? 1,
    },
  });
  if (!result.success) throw new Error(result.error ?? 'Failed to load businesses');

  // Fix logo_url to be absolute so expo-image can load it on both iOS and Android
  const businesses = result.data!.businesses.map((b) => ({
    ...b,
    logo_url: resolveLogoUrl(b.logo_url),
  }));

  return { ...result.data!, businesses };
};

/**
 * Fetch the list of business categories (id, name, icon) for filter chips.
 */
export const fetchBusinessCategories = async (): Promise<BusinessCategory[]> => {
  const result = await apiClient.get<{ categories: BusinessCategory[] }>('/businessdirectory/categories');
  if (!result.success) throw new Error(result.error ?? 'Failed to load categories');
  return result.data!.categories;
};
