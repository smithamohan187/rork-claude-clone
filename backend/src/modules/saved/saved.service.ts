// backend/src/modules/saved/saved.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { SaveItemInput } from './saved.schema';

export const savedService = {
  async getSavedBusinesses(userId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db()
        .from('saved_businesses')
        .select('*, business:businesses(*)')
        .eq('user_id', userId);
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('savedService.getSavedBusinesses', String(err));
      return fail('Failed to fetch saved businesses');
    }
  },

  async getSaved(userId: string, itemType?: string): Promise<ApiResponse<unknown[]>> {
    try {
      let q = db().from('saved_items').select('*').eq('user_id', userId);
      if (itemType) q = q.eq('item_type', itemType);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('savedService.getSaved', String(err));
      return fail('Failed to fetch saved items');
    }
  },

  async saveOffer(input: SaveItemInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('saved_items').insert(input).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('savedService.saveOffer', String(err));
      return fail('Failed to save item');
    }
  },

  async removeSavedOffer(userId: string, itemType: string, itemId: string): Promise<ApiResponse<{ ok: true }>> {
    try {
      const { error } = await db()
        .from('saved_items')
        .delete()
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .eq('item_id', itemId);
      if (error) return fail(error.message);
      return ok({ ok: true });
    } catch (err) {
      logger.error('savedService.removeSavedOffer', String(err));
      return fail('Failed to remove saved item');
    }
  },
};
