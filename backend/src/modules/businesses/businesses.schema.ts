// backend/src/modules/businesses/businesses.schema.ts
import { z } from 'zod';

export const UpdateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  logo_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
});

export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;
