// backend/src/modules/rewards/rewards.controller.ts
import type { Context } from 'hono';
import { rewardsService } from './rewards.service';
import { RewardConfigSchema } from './rewards.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const rewardsController = {
  async catalog(c: Context) {
    try {
      const businessId = c.req.query('business_id') ?? undefined;
      const result = await rewardsService.getRewardCatalog(businessId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('rewardsController.catalog', err), 500);
    }
  },

  async tiers(c: Context) {
    try {
      const businessId = c.req.param('businessId');
      const result = await rewardsService.getRewardTiers(businessId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('rewardsController.tiers', err), 500);
    }
  },

  async config(c: Context) {
    try {
      const businessId = c.req.param('businessId');
      const result = await rewardsService.getRewardConfig(businessId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('rewardsController.config', err), 500);
    }
  },

  async upsertConfig(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = RewardConfigSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await rewardsService.upsertRewardConfig(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('rewardsController.upsertConfig', err), 500);
    }
  },
};
