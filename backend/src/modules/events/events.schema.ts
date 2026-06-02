// backend/src/modules/events/events.schema.ts
import { z } from 'zod';

export const CreateEventSchema = z.object({
  business_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  starts_at: z.string(),
  ends_at: z.string().optional(),
  location: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
