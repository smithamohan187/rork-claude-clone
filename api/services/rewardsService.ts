import { apiClient } from '@/api/client';

export interface RedeemableRewardItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  type: 'discount' | 'free_item' | 'voucher';
  pointsRequired: number;
  quantityAvailable: number | null;
  affordable: boolean;
}

export interface RedeemResult {
  couponId: string;
  couponCode: string;
  expiresAt: number;
  businessId: string;
  businessName: string;
  rewardName: string;
  rewardDescription: string;
  rewardType: 'discount' | 'free_item' | 'voucher';
  pointsRequired: number;
}

export async function getRedeemableRewards(businessId: string): Promise<RedeemableRewardItem[]> {
  const res = await apiClient.get<{ rewards: RedeemableRewardItem[] }>(`/businesses/${businessId}/rewards`);
  const { rewards } = res.data as { rewards: RedeemableRewardItem[] };
  return rewards.map(r => ({
    ...r,
    // DB stores 'perk'; map to 'voucher' so existing icon switch statements work unchanged
    type: (r.type as string) === 'perk' ? 'voucher' : r.type,
  }));
}

export async function redeemReward(businessId: string, rewardId: string): Promise<RedeemResult> {
  const res = await apiClient.post<RedeemResult>(
    `/businesses/${businessId}/rewards/${rewardId}/redeem`,
    {}
  );
  const raw = res.data as RedeemResult;
  return {
    ...raw,
    rewardType: (raw.rewardType as string) === 'perk' ? 'voucher' : raw.rewardType,
  };
}

export async function checkCouponExpiry(couponId: string): Promise<{ expired: boolean }> {
  const res = await apiClient.post<{ expired: boolean }>(`/coupons/${couponId}/expire-check`, {});
  return res.data as { expired: boolean };
}
