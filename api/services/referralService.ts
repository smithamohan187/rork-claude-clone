// Service layer — wraps apiClient calls for the app-level referrals endpoints (Invite Friends).
// Screens never call apiClient directly; they go through hooks, which call these functions.
import { apiClient } from '@/api/client';
import { resolveAvatarUrl } from '@/api/services/chatService';

export interface MyReferral {
  code: string;
  url: string;
}

export type ReferralDirection = 'all' | 'joined_via_me' | 'i_joined_via';

export interface CombinedReferral {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  direction: 'joined_via_me' | 'i_joined_via';
  joined_context: 'touchpoints' | 'business';
  business_name: string | null;
  joined_at: string;
  referral_code_used: string;
}

export const getMyReferral = async (): Promise<MyReferral> => {
  const result = await apiClient.get<MyReferral>('/referrals/my-code');
  if (!result.success) throw new Error(result.error ?? 'Failed to load referral link');
  return result.data!;
};

export const getMyReferrals = async (
  direction: ReferralDirection = 'all',
  search = '',
  excludeBusinessOwnerOf?: string,
): Promise<CombinedReferral[]> => {
  const result = await apiClient.get<{ referrals: CombinedReferral[] }>('/referrals/mine', {
    query: { direction, search: search || undefined, excludeBusinessOwnerOf: excludeBusinessOwnerOf || undefined },
  });
  if (!result.success) throw new Error(result.error ?? 'Failed to load referrals');
  return result.data!.referrals.map((r) => ({ ...r, avatar_url: resolveAvatarUrl(r.avatar_url) }));
};
