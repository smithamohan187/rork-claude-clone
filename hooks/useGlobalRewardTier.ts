import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getGlobalTier, GlobalRewardTierStatus } from '@/api/services/globalRewardTierService';
import { useAuth } from '@/contexts/AuthContext';

const EMPTY_STATUS: GlobalRewardTierStatus = {
  netBalance: 0,
  tier: null,
  nextTier: null,
  pointsToNextTier: null,
  progressPercent: 0,
  tiers: [],
};

export function useGlobalRewardTier() {
  const { authLoading, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<GlobalRewardTierStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Wait for session restore to finish — otherwise this fires on a cold page load
      // before the access token is back in memory and silently 401s.
      if (authLoading || !isAuthenticated) return;

      let active = true;
      setLoading(true);
      getGlobalTier()
        .then(data => { if (active) setStatus(data); })
        .catch(err => { if (active) setError(err?.message ?? 'Failed to load reward tier'); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [authLoading, isAuthenticated])
  );

  return { status, loading, error };
}
