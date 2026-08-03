import { apiClient } from '@/api/client';

export interface GlobalTierInfo {
  id: string;
  tier_name: string;
  min_points: number;
  badge_icon: string | null;
  sort_order: number;
}

export interface GlobalRewardTierStatus {
  netBalance: number;
  tier: GlobalTierInfo | null;
  nextTier: GlobalTierInfo | null;
  pointsToNextTier: number | null;
  progressPercent: number;
  tiers: GlobalTierInfo[];
}

export async function getGlobalTier(): Promise<GlobalRewardTierStatus> {
  const result = await apiClient.get<GlobalRewardTierStatus>('/rewards/tier');
  if (!result.success) throw new Error(result.error ?? 'Failed to load reward tier');
  return result.data!;
}
