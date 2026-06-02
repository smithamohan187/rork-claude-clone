// backend/src/modules/chat/chat.schema.ts
import { z } from 'zod';

export const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  receiver_id: z.string().uuid().optional(),
  message_type: z.enum(['text', 'offer_share', 'broadcast']).default('text'),
  content: z.string().optional(),
  offer_share_payload: z.record(z.string(), z.unknown()).optional(),
});

export const BroadcastSchema = z.object({
  business_id: z.string().uuid(),
  content: z.string().min(1),
  audience: z.enum(['all', 'subscribers', 'referrals']).default('all'),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type BroadcastInput = z.infer<typeof BroadcastSchema>;
