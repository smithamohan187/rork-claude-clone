// backend/src/modules/referrals/referrals.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { CreateReferralInput, CreditReferralPointsInput } from './referrals.schema';

export const referralsService = {
  async createReferral(input: CreateReferralInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('referrals').insert(input).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('referralsService.createReferral', String(err));
      return fail('Failed to create referral');
    }
  },

  async getReferralsByUser(userId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db()
        .from('referrals')
        .select('*, referred:profiles!referrals_referred_id_fkey(*), referrer:profiles!referrals_referrer_id_fkey(*)')
        .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('referralsService.getReferralsByUser', String(err));
      return fail('Failed to fetch referrals');
    }
  },

  async getReferralCode(userId: string): Promise<ApiResponse<{ code: string }>> {
    try {
      const { data, error } = await db().from('profiles').select('referral_code').eq('id', userId).single();
      if (error) return fail(error.message);
      return ok({ code: (data as { referral_code?: string } | null)?.referral_code ?? '' });
    } catch (err) {
      logger.error('referralsService.getReferralCode', String(err));
      return fail('Failed to fetch referral code');
    }
  },

  async creditReferralPoints(input: CreditReferralPointsInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().rpc('credit_referral_points', {
        p_referral_id: input.referral_id,
        p_points: input.points,
      });
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('referralsService.creditReferralPoints', String(err));
      return fail('Failed to credit referral points');
    }
  },
};
