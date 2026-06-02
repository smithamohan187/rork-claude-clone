// backend/src/modules/offers/offers.schema.ts
import { z } from 'zod';

export const CreateOfferSchema = z.object({
  business_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  discount_label: z.string().optional(),
  valid_until: z.string().optional(),
  status: z.enum(['active', 'paused', 'expired']).default('active'),
});

export const ToggleOfferStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'expired']),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type ToggleOfferStatusInput = z.infer<typeof ToggleOfferStatusSchema>;
