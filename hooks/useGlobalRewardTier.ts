import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getGlobalTier, GlobalRewardTierStatus } from '@/api/services/globalRewardTierService';

const EMPTY_STATUS: GlobalRewardTierStatus = {
  netBalance: 0,
  tier: null,
  nextTier: null,
  pointsToNextTier: null,
  progressPercent: 0,
  tiers: [],
};

export function useGlobalRewardTier() {
  const [status, setStatus] = useState<GlobalRewardTierStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getGlobalTier()
        .then(data => { if (active) setStatus(data); })
        .catch(err => { if (active) setError(err?.message ?? 'Failed to load reward tier'); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  return { status, loading, error };
}
