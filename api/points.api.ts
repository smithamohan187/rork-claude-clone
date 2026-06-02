// mobile/src/api/points.api.ts
import { apiClient, ApiResult } from './client';

export type PointsBalance = {
  total: number;
  perBusiness: Array<{ business_id: string; balance: number }>;
};

export type PointTransaction = {
  id: string;
  user_id: string;
  business_id: string;
  amount: number;
  reason?: string | null;
  created_at: string;
};

export const pointsApi = {
  getUserPoints(userId: string, businessId?: string): Promise<ApiResult<PointsBalance>> {
    return apiClient.get<PointsBalance>(`/points/users/${userId}`, {
      query: { business_id: businessId },
    });
  },
  getTransactions(userId: string, businessId?: string): Promise<ApiResult<PointTransaction[]>> {
    return apiClient.get<PointTransaction[]>(`/points/users/${userId}/transactions`, {
      query: { business_id: businessId },
    });
  },
  creditPoints(payload: { user_id: string; business_id: string; amount: number; reason?: string }): Promise<ApiResult<unknown>> {
    return apiClient.post<unknown>('/points/credit', payload);
  },
  deductPoints(payload: { user_id: string; business_id: string; amount: number; reason?: string }): Promise<ApiResult<unknown>> {
    return apiClient.post<unknown>('/points/deduct', payload);
  },
};
