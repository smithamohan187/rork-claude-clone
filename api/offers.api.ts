// mobile/src/api/offers.api.ts
import { apiClient, ApiResult } from './client';

export type Offer = {
  id: string;
  business_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  discount_label?: string | null;
  valid_until?: string | null;
  status: 'active' | 'paused' | 'expired';
};

export type CreateOfferPayload = Omit<Offer, 'id' | 'status'> & { status?: Offer['status'] };

export const offersApi = {
  fetchOffers(params?: { businessId?: string; status?: string }): Promise<ApiResult<Offer[]>> {
    return apiClient.get<Offer[]>('/offers', {
      query: { business_id: params?.businessId, status: params?.status },
    });
  },
  createOffer(payload: CreateOfferPayload): Promise<ApiResult<Offer>> {
    return apiClient.post<Offer>('/offers', payload);
  },
  toggleStatus(id: string, status: Offer['status']): Promise<ApiResult<Offer>> {
    return apiClient.patch<Offer>(`/offers/${id}/status`, { status });
  },
  getOffersByBusiness(businessId: string): Promise<ApiResult<Offer[]>> {
    return apiClient.get<Offer[]>('/offers', { query: { business_id: businessId } });
  },
};
