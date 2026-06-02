// backend/src/modules/subscriptions/subscriptions.schema.ts
import { z } from 'zod';

export const SubscribeToBusinessSchema = z.object({
  user_id: z.string().uuid(),
  business_id: z.string().uuid(),
  plan_id: z.string().optional(),
});

export type SubscribeToBusinessInput = z.infer<typeof SubscribeToBusinessSchema>;
