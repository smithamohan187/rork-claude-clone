// backend/src/modules/offers/offers.controller.ts
import type { Context } from 'hono';
import { offersService } from './offers.service';
import { CreateOfferSchema, ToggleOfferStatusSchema } from './offers.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const offersController = {
  async list(c: Context) {
    try {
      const businessId = c.req.query('business_id') ?? undefined;
      const status = c.req.query('status') ?? undefined;
      const result = await offersService.getOffers({ businessId, status });
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('offersController.list', err), 500);
    }
  },

  async create(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = CreateOfferSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await offersService.createOffer(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('offersController.create', err), 500);
    }
  },

  async toggleStatus(c: Context) {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const parsed = ToggleOfferStatusSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await offersService.toggleOfferStatus(id, parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('offersController.toggleStatus', err), 500);
    }
  },
};
