// backend/src/modules/referrals/referrals.schema.ts
import { z } from 'zod';

export const CreateReferralSchema = z.object({
  referrer_id: z.string().uuid(),
  referred_email: z.string().email().optional(),
  referred_phone: z.string().optional(),
  code: z.string().optional(),
});

export const CreditReferralPointsSchema = z.object({
  referral_id: z.string().uuid(),
  points: z.number().int().positive(),
});

export type CreateReferralInput = z.infer<typeof CreateReferralSchema>;
export type CreditReferralPointsInput = z.infer<typeof CreditReferralPointsSchema>;
