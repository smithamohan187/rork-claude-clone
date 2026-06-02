// backend/src/modules/chat/chat.controller.ts
import type { Context } from 'hono';
import { chatService } from './chat.service';
import { BroadcastSchema, SendMessageSchema } from './chat.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const chatController = {
  async messages(c: Context) {
    try {
      const id = c.req.param('conversationId');
      const result = await chatService.getMessages(id);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('chatController.messages', err), 500);
    }
  },

  async send(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = SendMessageSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await chatService.sendMessage(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('chatController.send', err), 500);
    }
  },

  async broadcasts(c: Context) {
    try {
      const id = c.req.param('businessId');
      const result = await chatService.getBroadcasts(id);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('chatController.broadcasts', err), 500);
    }
  },

  async createBroadcast(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = BroadcastSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await chatService.createBroadcast(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('chatController.createBroadcast', err), 500);
    }
  },
};
