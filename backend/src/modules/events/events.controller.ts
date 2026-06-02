// backend/src/modules/events/events.controller.ts
import type { Context } from 'hono';
import { eventsService } from './events.service';
import { CreateEventSchema } from './events.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const eventsController = {
  async list(c: Context) {
    try {
      const businessId = c.req.query('business_id') ?? undefined;
      const result = await eventsService.getEvents({ businessId });
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('eventsController.list', err), 500);
    }
  },

  async create(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = CreateEventSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await eventsService.createEvent(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('eventsController.create', err), 500);
    }
  },

  async cancel(c: Context) {
    try {
      const id = c.req.param('id');
      const result = await eventsService.cancelEvent(id);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('eventsController.cancel', err), 500);
    }
  },
};
