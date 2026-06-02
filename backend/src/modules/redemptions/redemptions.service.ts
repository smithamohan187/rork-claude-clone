// backend/src/modules/redemptions/redemptions.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { CreateRedemptionInput } from './redemptions.schema';

function generateCouponCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase() + '-' + Date.now().toString(36).slice(-4).toUpperCase();
}

export const redemptionsService = {
  async createRedemption(input: CreateRedemptionInput): Promise<ApiResponse<unknown>> {
    try {
      const code = generateCouponCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db()
        .from('redemptions')
        .insert({ ...input, coupon_code: code, expires_at: expiresAt, status: 'active' })
        .select()
        .single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('redemptionsService.createRedemption', String(err));
      return fail('Failed to create redemption');
    }
  },

  async generateCoupon(redemptionId: string): Promise<ApiResponse<{ code: string }>> {
    try {
      const code = generateCouponCode();
      const { data, error } = await db()
        .from('redemptions')
        .update({ coupon_code: code })
        .eq('id', redemptionId)
        .select()
        .single();
      if (error) return fail(error.message);
      return ok({ code: (data as { coupon_code?: string } | null)?.coupon_code ?? code });
    } catch (err) {
      logger.error('redemptionsService.generateCoupon', String(err));
      return fail('Failed to generate coupon');
    }
  },

  async expireCoupon(redemptionId: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db()
        .from('redemptions')
        .update({ status: 'expired' })
        .eq('id', redemptionId)
        .select()
        .single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('redemptionsService.expireCoupon', String(err));
      return fail('Failed to expire coupon');
    }
  },

  async fetchCoupon(redemptionId: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('redemptions').select('*').eq('id', redemptionId).single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('redemptionsService.fetchCoupon', String(err));
      return fail('Failed to fetch coupon');
    }
  },
};
