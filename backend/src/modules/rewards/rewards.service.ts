// backend/src/modules/rewards/rewards.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { RewardConfigInput } from './rewards.schema';

export const rewardsService = {
  async getRewardCatalog(businessId?: string): Promise<ApiResponse<unknown[]>> {
    try {
      let q = db().from('rewards').select('*');
      if (businessId) q = q.eq('business_id', businessId);
      const { data, error } = await q;
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('rewardsService.getRewardCatalog', String(err));
      return fail('Failed to fetch reward catalog');
    }
  },

  async getRewardTiers(businessId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db().from('reward_tiers').select('*').eq('business_id', businessId).order('threshold');
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('rewardsService.getRewardTiers', String(err));
      return fail('Failed to fetch reward tiers');
    }
  },

  async getRewardConfig(businessId: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('reward_configs').select('*').eq('business_id', businessId).maybeSingle();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('rewardsService.getRewardConfig', String(err));
      return fail('Failed to fetch reward config');
    }
  },

  async upsertRewardConfig(input: RewardConfigInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('reward_configs').upsert(input).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('rewardsService.upsertRewardConfig', String(err));
      return fail('Failed to save reward config');
    }
  },
};
