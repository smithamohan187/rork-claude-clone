// backend/src/modules/saved/saved.schema.ts
import { z } from 'zod';

export const SaveItemSchema = z.object({
  user_id: z.string().uuid(),
  item_type: z.enum(['business', 'offer', 'event']),
  item_id: z.string().uuid(),
});

export type SaveItemInput = z.infer<typeof SaveItemSchema>;
