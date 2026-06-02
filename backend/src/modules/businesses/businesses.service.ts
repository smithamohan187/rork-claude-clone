// backend/src/modules/businesses/businesses.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { UpdateBusinessInput } from './businesses.schema';

export const businessesService = {
  async getBusinessProfile(businessId: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('businesses').select('*').eq('id', businessId).single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('businessesService.getBusinessProfile', String(err));
      return fail('Failed to fetch business');
    }
  },

  async listBusinesses(filters?: { category?: string; search?: string }): Promise<ApiResponse<unknown[]>> {
    try {
      let q = db().from('businesses').select('*');
      if (filters?.category) q = q.eq('category', filters.category);
      if (filters?.search) q = q.ilike('name', `%${filters.search}%`);
      const { data, error } = await q;
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('businessesService.listBusinesses', String(err));
      return fail('Failed to list businesses');
    }
  },

  async updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('businesses').update(input).eq('id', businessId).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('businessesService.updateBusiness', String(err));
      return fail('Failed to update business');
    }
  },

  async getSubscribers(businessId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db()
        .from('business_subscribers')
        .select('*, profile:profiles(*)')
        .eq('business_id', businessId);
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('businessesService.getSubscribers', String(err));
      return fail('Failed to fetch subscribers');
    }
  },
};
