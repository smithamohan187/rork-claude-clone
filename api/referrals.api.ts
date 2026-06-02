// mobile/src/api/referrals.api.ts
import { apiClient, ApiResult } from './client';

export type Referral = {
  id: string;
  referrer_id: string;
  referred_id?: string | null;
  referred_email?: string | null;
  referred_phone?: string | null;
  code?: string | null;
  status?: string | null;
  created_at?: string;
};

export const referralsApi = {
  getReferralCode(userId: string): Promise<ApiResult<{ code: string }>> {
    return apiClient.get<{ code: string }>(`/referrals/users/${userId}/code`);
  },
  getReferralsByUser(userId: string): Promise<ApiResult<Referral[]>> {
    return apiClient.get<Referral[]>(`/referrals/users/${userId}`);
  },
  submitReferral(payload: {
    referrer_id: string;
    referred_email?: string;
    referred_phone?: string;
    code?: string;
  }): Promise<ApiResult<Referral>> {
    return apiClient.post<Referral>('/referrals', payload);
  },
  creditReferralPoints(payload: { referral_id: string; points: number }): Promise<ApiResult<unknown>> {
    return apiClient.post<unknown>('/referrals/credit', payload);
  },
};
