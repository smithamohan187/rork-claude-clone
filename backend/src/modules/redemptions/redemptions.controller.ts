// backend/src/modules/redemptions/redemptions.controller.ts
import type { Context } from 'hono';
import { redemptionsService } from './redemptions.service';
import { CreateRedemptionSchema } from './redemptions.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const redemptionsController = {
  async create(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = CreateRedemptionSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await redemptionsService.createRedemption(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('redemptionsController.create', err), 500);
    }
  },

  async coupon(c: Context) {
    try {
      const id = c.req.param('id');
      const result = await redemptionsService.fetchCoupon(id);
      return c.json(result, result.success ? 200 : 404);
    } catch (err) {
      return c.json(handleError('redemptionsController.coupon', err), 500);
    }
  },

  async generate(c: Context) {
    try {
      const id = c.req.param('id');
      const result = await redemptionsService.generateCoupon(id);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('redemptionsController.generate', err), 500);
    }
  },

  async expire(c: Context) {
    try {
      const id = c.req.param('id');
      const result = await redemptionsService.expireCoupon(id);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('redemptionsController.expire', err), 500);
    }
  },
};
