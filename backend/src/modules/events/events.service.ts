// backend/src/modules/events/events.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { CreateEventInput } from './events.schema';

export const eventsService = {
  async getEvents(filters?: { businessId?: string }): Promise<ApiResponse<unknown[]>> {
    try {
      let q = db().from('events').select('*, business:businesses(*)');
      if (filters?.businessId) q = q.eq('business_id', filters.businessId);
      const { data, error } = await q.order('starts_at', { ascending: true });
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('eventsService.getEvents', String(err));
      return fail('Failed to fetch events');
    }
  },

  async createEvent(input: CreateEventInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('events').insert(input).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('eventsService.createEvent', String(err));
      return fail('Failed to create event');
    }
  },

  async cancelEvent(eventId: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('events').update({ status: 'cancelled' }).eq('id', eventId).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('eventsService.cancelEvent', String(err));
      return fail('Failed to cancel event');
    }
  },
};
