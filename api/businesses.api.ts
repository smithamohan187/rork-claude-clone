// mobile/src/api/businesses.api.ts
import { apiClient, ApiResult } from './client';

export type Business = {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  category?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
};

export type UpdateBusinessPayload = Partial<Omit<Business, 'id'>>;

export const businessesApi = {
  list(params?: { category?: string; search?: string }): Promise<ApiResult<Business[]>> {
    return apiClient.get<Business[]>('/businesses', { query: params });
  },
  getBusinessProfile(id: string): Promise<ApiResult<Business>> {
    return apiClient.get<Business>(`/businesses/${id}`);
  },
  updateBusiness(id: string, payload: UpdateBusinessPayload): Promise<ApiResult<Business>> {
    return apiClient.patch<Business>(`/businesses/${id}`, payload);
  },
  getSubscribers(id: string): Promise<ApiResult<unknown[]>> {
    return apiClient.get<unknown[]>(`/businesses/${id}/subscribers`);
  },
};
