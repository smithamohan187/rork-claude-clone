import { apiClient } from '@/api/client';

export interface MyBusinessReferral {
  code: string;
  url: string;
}

// Permanent, reusable, per-profile business-referral code — the caller's own personal link for
// inviting businesses. Get-or-create: same code/url on every call. Works for either a personal or
// business active profile.
export async function getMyBusinessReferralCode(): Promise<MyBusinessReferral> {
  const res = await apiClient.get<MyBusinessReferral>('/marketplace/my-referral-code');
  if (!res.success) throw new Error(res.error ?? 'Failed to load referral link');
  return res.data!;
}
