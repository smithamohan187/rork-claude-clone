// backend/src/modules/businesses/businesses.controller.ts
import type { Context } from 'hono';
import { businessesService } from './businesses.service';
import { UpdateBusinessSchema } from './businesses.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const businessesController = {
  async list(c: Context) {
    try {
      const category = c.req.query('category') ?? undefined;
      const search = c.req.query('search') ?? undefined;
      const result = await businessesService.listBusinesses({ category, search });
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('businessesController.list', err), 500);
    }
  },

  async get(c: Context) {
    try {
      const id = c.req.param('id');
      const result = await businessesService.getBusinessProfile(id);
      return c.json(result, result.success ? 200 : 404);
    } catch (err) {
      return c.json(handleError('businessesController.get', err), 500);
    }
  },

  async update(c: Context) {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const parsed = UpdateBusinessSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await businessesService.updateBusiness(id, parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('businessesController.update', err), 500);
    }
  },

  async subscribers(c: Context) {
    try {
      const id = c.req.param('id');
      const result = await businessesService.getSubscribers(id);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('businessesController.subscribers', err), 500);
    }
  },
};
