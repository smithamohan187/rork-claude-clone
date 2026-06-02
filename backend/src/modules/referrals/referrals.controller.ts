// backend/src/modules/referrals/referrals.controller.ts
import type { Context } from 'hono';
import { referralsService } from './referrals.service';
import { CreateReferralSchema, CreditReferralPointsSchema } from './referrals.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const referralsController = {
  async create(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = CreateReferralSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await referralsService.createReferral(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('referralsController.create', err), 500);
    }
  },

  async listByUser(c: Context) {
    try {
      const userId = c.req.param('userId');
      const result = await referralsService.getReferralsByUser(userId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('referralsController.listByUser', err), 500);
    }
  },

  async code(c: Context) {
    try {
      const userId = c.req.param('userId');
      const result = await referralsService.getReferralCode(userId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('referralsController.code', err), 500);
    }
  },

  async credit(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = CreditReferralPointsSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await referralsService.creditReferralPoints(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('referralsController.credit', err), 500);
    }
  },
};
