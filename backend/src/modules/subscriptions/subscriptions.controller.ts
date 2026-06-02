// backend/src/modules/subscriptions/subscriptions.controller.ts
import type { Context } from 'hono';
import { subscriptionsService } from './subscriptions.service';
import { SubscribeToBusinessSchema } from './subscriptions.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const subscriptionsController = {
  async plans(c: Context) {
    try {
      const result = await subscriptionsService.getPlans();
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('subscriptionsController.plans', err), 500);
    }
  },

  async subscribe(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = SubscribeToBusinessSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await subscriptionsService.subscribeToBusiness(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('subscriptionsController.subscribe', err), 500);
    }
  },

  async mine(c: Context) {
    try {
      const userId = c.req.param('userId');
      const result = await subscriptionsService.getMySubscriptions(userId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('subscriptionsController.mine', err), 500);
    }
  },

  async businessSubscribers(c: Context) {
    try {
      const businessId = c.req.param('businessId');
      const result = await subscriptionsService.getBusinessSubscribers(businessId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('subscriptionsController.businessSubscribers', err), 500);
    }
  },
};
