// mobile/src/api/redemptions.api.ts
import { apiClient, ApiResult } from './client';

export type Redemption = {
  id: string;
  user_id: string;
  business_id: string;
  offer_id?: string | null;
  reward_id?: string | null;
  points_used?: number | null;
  coupon_code: string;
  expires_at: string;
  status: 'active' | 'used' | 'expired';
};

export const redemptionsApi = {
  redeemOffer(payload: {
    user_id: string;
    business_id: string;
    offer_id?: string;
    reward_id?: string;
    points_used?: number;
  }): Promise<ApiResult<Redemption>> {
    return apiClient.post<Redemption>('/redemptions', payload);
  },
  fetchCoupon(redemptionId: string): Promise<ApiResult<Redemption>> {
    return apiClient.get<Redemption>(`/redemptions/${redemptionId}`);
  },
  generateCoupon(redemptionId: string): Promise<ApiResult<{ code: string }>> {
    return apiClient.post<{ code: string }>(`/redemptions/${redemptionId}/generate`);
  },
  expireCoupon(redemptionId: string): Promise<ApiResult<Redemption>> {
    return apiClient.post<Redemption>(`/redemptions/${redemptionId}/expire`);
  },
};
