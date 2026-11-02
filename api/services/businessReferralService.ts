import { apiClient } from '@/api/client';

export interface MyBusinessReferral {
  referralCode: string;
  referralLink: string;
  bonusPerReferral: number;
  stats: {
    referredCount: number;
    completedCount: number;
    pointsEarned: number;
  };
}

// Gets (lazily creating on first call) the active profile's own standing referral code for a
// business it's subscribed to, plus live stats. 403s if the caller isn't actually subscribed.
export async function getMyBusinessReferral(businessId: string): Promise<MyBusinessReferral> {
  const result = await apiClient.get<MyBusinessReferral>(`/subscriber-referrals/business/${businessId}/mine`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load referral link');
  return result.data!;
}

export interface ResolvePendingBusinessReferralResult {
  matched: boolean;
  welcomePoints: number;
}

// Called once a logged-in friend lands via a sharer's /s/<code> subscriber-referral link —
// auto-subscribes them and (first time only) credits the sharer's referral bonus.
export async function resolvePendingBusinessReferral(referralCode: string): Promise<ResolvePendingBusinessReferralResult> {
  const result = await apiClient.post<ResolvePendingBusinessReferralResult>('/subscriber-referrals/business/resolve-pending', {
    referral_code: referralCode,
  });
  if (!result.success) throw new Error(result.error ?? 'Failed to resolve referral');
  return result.data!;
}
