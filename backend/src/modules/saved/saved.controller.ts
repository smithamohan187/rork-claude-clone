// backend/src/modules/saved/saved.controller.ts
import type { Context } from 'hono';
import { savedService } from './saved.service';
import { SaveItemSchema } from './saved.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const savedController = {
  async list(c: Context) {
    try {
      const userId = c.req.param('userId');
      const itemType = c.req.query('item_type') ?? undefined;
      const result = await savedService.getSaved(userId, itemType);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('savedController.list', err), 500);
    }
  },

  async businesses(c: Context) {
    try {
      const userId = c.req.param('userId');
      const result = await savedService.getSavedBusinesses(userId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('savedController.businesses', err), 500);
    }
  },

  async save(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = SaveItemSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await savedService.saveOffer(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('savedController.save', err), 500);
    }
  },

  async remove(c: Context) {
    try {
      const userId = c.req.param('userId');
      const itemType = c.req.param('itemType');
      const itemId = c.req.param('itemId');
      const result = await savedService.removeSavedOffer(userId, itemType, itemId);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('savedController.remove', err), 500);
    }
  },
};
