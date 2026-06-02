// mobile/src/api/rewards.api.ts
import { apiClient, ApiResult } from './client';

export type RewardCatalogItem = {
  id: string;
  business_id: string;
  title: string;
  description?: string | null;
  cost_points: number;
  image_url?: string | null;
};

export type RewardTier = {
  id: string;
  business_id: string;
  name: string;
  threshold: number;
  benefits?: string | null;
};

export type RewardConfig = {
  business_id: string;
  points_per_visit?: number;
  points_per_currency?: number;
  redemption_threshold?: number;
};

export const rewardsApi = {
  getRewardCatalog(businessId?: string): Promise<ApiResult<RewardCatalogItem[]>> {
    return apiClient.get<RewardCatalogItem[]>('/rewards/catalog', {
      query: { business_id: businessId },
    });
  },
  getRewardTiers(businessId: string): Promise<ApiResult<RewardTier[]>> {
    return apiClient.get<RewardTier[]>(`/rewards/businesses/${businessId}/tiers`);
  },
  getRewardConfig(businessId: string): Promise<ApiResult<RewardConfig | null>> {
    return apiClient.get<RewardConfig | null>(`/rewards/businesses/${businessId}/config`);
  },
  upsertRewardConfig(payload: RewardConfig): Promise<ApiResult<RewardConfig>> {
    return apiClient.put<RewardConfig>('/rewards/config', payload);
  },
};
