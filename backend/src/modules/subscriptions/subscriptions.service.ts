// backend/src/modules/subscriptions/subscriptions.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { SubscribeToBusinessInput } from './subscriptions.schema';

export const subscriptionsService = {
  async getPlans(): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db().from('subscription_plans').select('*').order('price', { ascending: true });
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('subscriptionsService.getPlans', String(err));
      return fail('Failed to fetch plans');
    }
  },

  async subscribeToBusiness(input: SubscribeToBusinessInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db()
        .from('business_subscribers')
        .upsert({ user_id: input.user_id, business_id: input.business_id, plan_id: input.plan_id ?? null })
        .select()
        .single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('subscriptionsService.subscribeToBusiness', String(err));
      return fail('Failed to subscribe');
    }
  },

  async getMySubscriptions(userId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db()
        .from('business_subscribers')
        .select('*, business:businesses(*)')
        .eq('user_id', userId);
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('subscriptionsService.getMySubscriptions', String(err));
      return fail('Failed to fetch my subscriptions');
    }
  },

  async getBusinessSubscribers(businessId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db()
        .from('business_subscribers')
        .select('*, profile:profiles(*)')
        .eq('business_id', businessId);
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('subscriptionsService.getBusinessSubscribers', String(err));
      return fail('Failed to fetch subscribers');
    }
  },
};
