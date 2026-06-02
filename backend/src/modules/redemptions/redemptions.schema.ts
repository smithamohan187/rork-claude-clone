// backend/src/modules/redemptions/redemptions.schema.ts
import { z } from 'zod';

export const CreateRedemptionSchema = z.object({
  user_id: z.string().uuid(),
  business_id: z.string().uuid(),
  offer_id: z.string().uuid().optional(),
  reward_id: z.string().uuid().optional(),
  points_used: z.number().int().nonnegative().optional(),
});

export type CreateRedemptionInput = z.infer<typeof CreateRedemptionSchema>;
