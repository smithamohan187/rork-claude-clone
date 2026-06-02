// backend/src/modules/points/points.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { PointsAdjustmentInput } from './points.schema';

export const pointsService = {
  async getUserPoints(userId: string, businessId?: string): Promise<ApiResponse<{ total: number; perBusiness: unknown[] }>> {
    try {
      let q = db().from('user_points').select('*').eq('user_id', userId);
      if (businessId) q = q.eq('business_id', businessId);
      const { data, error } = await q;
      if (error) return fail(error.message);
      const rows = data ?? [];
      const total = rows.reduce((sum: number, row: { balance?: number }) => sum + (row.balance ?? 0), 0);
      return ok({ total, perBusiness: rows });
    } catch (err) {
      logger.error('pointsService.getUserPoints', String(err));
      return fail('Failed to fetch points');
    }
  },

  async creditPoints(input: PointsAdjustmentInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().rpc('credit_user_points', {
        p_user_id: input.user_id,
        p_business_id: input.business_id,
        p_amount: input.amount,
        p_reason: input.reason ?? null,
      });
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('pointsService.creditPoints', String(err));
      return fail('Failed to credit points');
    }
  },

  async deductPoints(input: PointsAdjustmentInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().rpc('deduct_user_points', {
        p_user_id: input.user_id,
        p_business_id: input.business_id,
        p_amount: input.amount,
        p_reason: input.reason ?? null,
      });
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('pointsService.deductPoints', String(err));
      return fail('Failed to deduct points');
    }
  },

  async getTransactions(userId: string, businessId?: string): Promise<ApiResponse<unknown[]>> {
    try {
      let q = db().from('point_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (businessId) q = q.eq('business_id', businessId);
      const { data, error } = await q;
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('pointsService.getTransactions', String(err));
      return fail('Failed to fetch transactions');
    }
  },
};
