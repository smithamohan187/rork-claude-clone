// backend/src/modules/points/points.controller.ts
import type { Context } from 'hono';
import { pointsService } from './points.service';
import { PointsAdjustmentSchema } from './points.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const pointsController = {
  async balance(c: Context) {
    try {
      const userId = c.req.param('userId');
      const businessId = c.req.query('business_id') ?? undefined;
      const result = await pointsService.getUserPoints(userId, businessId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('pointsController.balance', err), 500);
    }
  },

  async credit(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = PointsAdjustmentSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await pointsService.creditPoints(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('pointsController.credit', err), 500);
    }
  },

  async deduct(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = PointsAdjustmentSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await pointsService.deductPoints(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('pointsController.deduct', err), 500);
    }
  },

  async transactions(c: Context) {
    try {
      const userId = c.req.param('userId');
      const businessId = c.req.query('business_id') ?? undefined;
      const result = await pointsService.getTransactions(userId, businessId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('pointsController.transactions', err), 500);
    }
  },
};
