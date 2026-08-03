import { apiClient } from '@/api/client';

export interface RewardConfig {
  id: string;
  business_id: string;
  welcome_bonus_points: number;
  referral_bonus_points: number;
  share_points: number;
  purchase_enabled: boolean;
  points_per_rupee: number;
  points_validity_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RewardItem {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  type: 'discount' | 'free_item' | 'perk';
  points_required: number;
  quantity_available: number | null;
  quantity_redeemed: number;
  is_active: boolean;
  created_at: string;
}

export interface RewardConfigFull {
  config: RewardConfig | null;
  rewards: RewardItem[];
}

export interface UpsertConfigPayload {
  welcome_bonus_points?: number;
  referral_bonus_points?: number;
  share_points?: number;
  purchase_enabled?: boolean;
  points_per_rupee?: number;
}

export interface CreateRewardPayload {
  name: string;
  description?: string | null;
  type?: 'discount' | 'free_item' | 'perk';
  points_required: number;
  quantity_available?: number | null;
}

export async function fetchRewardConfig(businessId: string): Promise<RewardConfigFull> {
  const result = await apiClient.get<RewardConfigFull>(`/reward-config/${businessId}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load reward configuration');
  return result.data!;
}

export async function upsertRewardConfig(
  businessId: string,
  payload: UpsertConfigPayload,
): Promise<RewardConfig> {
  const result = await apiClient.put<{ config: RewardConfig }>(`/reward-config/${businessId}`, payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to save reward configuration');
  return result.data!.config;
}

export async function createReward(payload: CreateRewardPayload): Promise<RewardItem> {
  const result = await apiClient.post<{ reward: RewardItem }>('/rewards-catalog', payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to create reward');
  return result.data!.reward;
}

export async function deleteReward(id: string): Promise<void> {
  const result = await apiClient.delete<{ id: string }>(`/rewards-catalog/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to delete reward');
}

export interface UpdateRewardPayload {
  name?: string;
  description?: string | null;
  type?: 'discount' | 'free_item' | 'perk';
  points_required?: number;
  quantity_available?: number | null;
}

export async function updateReward(id: string, payload: UpdateRewardPayload): Promise<RewardItem> {
  const result = await apiClient.put<{ reward: RewardItem }>(`/rewards-catalog/${id}`, payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to update reward');
  return result.data!.reward;
}
