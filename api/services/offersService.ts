import { apiClient, getAccessToken, API_BASE_URL } from '@/api/client';
import { Platform } from 'react-native';

export interface Offer {
  id: string;
  type: 'offer';
  business_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: 'percent' | 'flat' | 'bogo' | 'freebie' | null;
  discount_value: number | null;
  original_price: number | null;
  terms: string | null;
  status: 'active' | 'expired' | 'disabled';
  effective_status: 'active' | 'disabled' | 'expired';
  starts_at: string | null;
  expires_at: string | null;
  max_redemptions: number | null;
  total_redemptions: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOfferPayload {
  title: string;
  description?: string | null;
  image_url?: string | null;
  discount_type?: 'percent' | 'flat' | 'bogo' | 'freebie' | null;
  discount_value?: number | null;
  original_price?: number | null;
  terms?: string | null;
  max_redemptions?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  status?: 'active' | 'disabled';
}

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function resolveOffer(offer: Offer): Offer {
  return { ...offer, type: 'offer', image_url: resolveUrl(offer.image_url) };
}

export async function fetchMyOffers(): Promise<Offer[]> {
  const result = await apiClient.get<{ offers: Offer[] }>('/offers/my');
  if (!result.success) throw new Error(result.error ?? 'Failed to load offers');
  return (result.data!.offers ?? []).map(resolveOffer);
}

export async function fetchBusinessOffers(businessId: string): Promise<Offer[]> {
  const result = await apiClient.get<{ offers: Offer[] }>(`/offers/business/${businessId}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load offers');
  return (result.data!.offers ?? []).map(resolveOffer);
}

export async function fetchOfferById(id: string): Promise<Offer> {
  const result = await apiClient.get<{ offer: Offer }>(`/offers/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load offer');
  return resolveOffer(result.data!.offer);
}

export async function createOffer(payload: CreateOfferPayload): Promise<Offer> {
  const result = await apiClient.post<{ offer: Offer }>('/offers', payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to create offer');
  return resolveOffer(result.data!.offer);
}

export async function updateOffer(id: string, payload: Partial<CreateOfferPayload>): Promise<Offer> {
  const result = await apiClient.put<{ offer: Offer }>(`/offers/${id}`, payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to update offer');
  return resolveOffer(result.data!.offer);
}

export async function deleteOffer(id: string): Promise<void> {
  const result = await apiClient.delete<{ id: string }>(`/offers/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to delete offer');
}

export async function toggleOfferStatus(id: string, status: 'active' | 'disabled'): Promise<Offer> {
  const result = await apiClient.patch<{ offer: Offer }>(`/offers/${id}/status`, { status });
  if (!result.success) throw new Error(result.error ?? 'Failed to update offer status');
  return resolveOffer(result.data!.offer);
}

async function buildOfferFormData(uri: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    form.append('image', new File([blob], 'offer.jpg', { type: 'image/jpeg' }));
  } else {
    form.append('image', { uri, name: 'offer.jpg', type: 'image/jpeg' } as any);
  }
  return form;
}

export async function uploadOfferImage(offerId: string, uri: string): Promise<Offer> {
  const token = getAccessToken();
  const form = await buildOfferFormData(uri);
  const response = await fetch(`${BASE_URL}/offers/${offerId}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Image upload failed');
  return resolveOffer(data.data.offer);
}
