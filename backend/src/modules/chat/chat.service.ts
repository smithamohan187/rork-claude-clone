// backend/src/modules/chat/chat.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { BroadcastInput, SendMessageInput } from './chat.schema';

export const chatService = {
  async getMessages(conversationId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db()
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('chatService.getMessages', String(err));
      return fail('Failed to fetch messages');
    }
  },

  async sendMessage(input: SendMessageInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('messages').insert(input).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('chatService.sendMessage', String(err));
      return fail('Failed to send message');
    }
  },

  async getBroadcasts(businessId: string): Promise<ApiResponse<unknown[]>> {
    try {
      const { data, error } = await db()
        .from('broadcasts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) return fail(error.message);
      return ok(data ?? []);
    } catch (err) {
      logger.error('chatService.getBroadcasts', String(err));
      return fail('Failed to fetch broadcasts');
    }
  },

  async createBroadcast(input: BroadcastInput): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await db().from('broadcasts').insert(input).select().single();
      if (error) return fail(error.message);
      return ok(data);
    } catch (err) {
      logger.error('chatService.createBroadcast', String(err));
      return fail('Failed to create broadcast');
    }
  },
};
