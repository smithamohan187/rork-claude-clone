// backend/src/modules/rewards/rewards.schema.ts
import { z } from 'zod';

export const RewardConfigSchema = z.object({
  business_id: z.string().uuid(),
  points_per_visit: z.number().int().nonnegative().optional(),
  points_per_currency: z.number().nonnegative().optional(),
  redemption_threshold: z.number().int().positive().optional(),
});

export type RewardConfigInput = z.infer<typeof RewardConfigSchema>;
