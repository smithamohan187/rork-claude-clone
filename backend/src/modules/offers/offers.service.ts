// backend/src/modules/offers/offers.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { CreateOfferInput, ToggleOfferStatusInput } from './offers.schema';

export const offersService = {
  async getOffers(filters?: { businessId?: string; status?: string }): Promise<ApiResponse<unknown[]>> {
    try {
      let q = db().from('offers').select('*, business:businesses(*)');
      if (filters?.businessId) q = q.eq('business_id', filters.businessId);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('offersService.getOffers', String(err));
      return fail('Failed to fetch offers');
    }
  },

  async getOffersByBusiness(businessId: string): Promise<ApiResponse<unknown[]>> {
    return this.getOffers({ businessId });
  },

  async createOffer(input: CreateOfferInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('offers').insert(input).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('offersService.createOffer', String(err));
      return fail('Failed to create offer');
    }
  },

  async toggleOfferStatus(offerId: string, input: ToggleOfferStatusInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('offers').update({ status: input.status }).eq('id', offerId).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('offersService.toggleOfferStatus', String(err));
      return fail('Failed to toggle offer status');
    }
  },
};
