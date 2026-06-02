// backend/src/modules/points/points.schema.ts
import { z } from 'zod';

export const PointsAdjustmentSchema = z.object({
  user_id: z.string().uuid(),
  business_id: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().optional(),
});

export type PointsAdjustmentInput = z.infer<typeof PointsAdjustmentSchema>;
