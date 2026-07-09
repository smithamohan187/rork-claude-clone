import { apiClient } from '@/api/client';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export interface SavedOfferItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  expires_at: string | null;
  status: string;
  business_name: string;
  business_logo: string | null;
  saved_at: string;
}

export async function toggleSaveOffer(offerId: string): Promise<{ saved: boolean }> {
  const result = await apiClient.post<{ saved: boolean }>('/saved-offers/toggle', { offer_id: offerId });
  if (!result.success) throw new Error(result.error ?? 'Toggle save failed');
  return result.data!;
}

export async function getSavedOffers(): Promise<SavedOfferItem[]> {
  const result = await apiClient.get<SavedOfferItem[]>('/saved-offers/my-offers');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch saved offers');
  return (result.data ?? []).map((o) => ({
    ...o,
    image_url: resolveUrl(o.image_url),
    business_logo: resolveUrl(o.business_logo),
  }));
}
