import { apiClient, apiRequest } from '@/api/client';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

function resolveLogoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export interface SavedBusinessItem {
  id: string;
  name: string;
  city: string | null;
  logo_url: string | null;
  category_name: string | null;
  subscriber_count: number;
  avg_rating: number | null;
  saved_at: string;
}

export async function saveBusiness(businessId: string): Promise<{ saved: boolean }> {
  const result = await apiClient.post<{ saved: boolean }>('/saved-businesses', { business_id: businessId });
  if (!result.success) throw new Error(result.error ?? 'Save failed');
  return result.data!;
}

export async function unsaveBusiness(businessId: string): Promise<{ saved: boolean }> {
  const result = await apiRequest<{ saved: boolean }>('DELETE', '/saved-businesses', { business_id: businessId });
  if (!result.success) throw new Error(result.error ?? 'Unsave failed');
  return result.data!;
}

export async function getSavedStatus(businessId: string): Promise<{ isSaved: boolean }> {
  const result = await apiClient.get<{ isSaved: boolean }>(`/saved-businesses/status?business_id=${businessId}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch saved status');
  return result.data!;
}

export async function getSavedBusinesses(): Promise<SavedBusinessItem[]> {
  const result = await apiClient.get<SavedBusinessItem[]>('/saved-businesses/my-businesses');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch saved businesses');
  return (result.data ?? []).map((b) => ({ ...b, logo_url: resolveLogoUrl(b.logo_url) }));
}
