import { useMemo } from 'react';
import { referralNetwork, type ReferralPerson } from '@/mocks/referrals';

export interface UseReferralListResult {
  referrals: ReferralPerson[];
  loading: boolean;
  error: Error | null;
}

export function useReferralList(): UseReferralListResult {
  const referrals = useMemo<ReferralPerson[]>(() => referralNetwork, []);
  return { referrals, loading: false, error: null };
}

export type { ReferralPerson };
