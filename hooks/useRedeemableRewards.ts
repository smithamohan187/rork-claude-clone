import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getRedeemableRewards, RedeemableRewardItem } from '@/api/services/rewardsService';

export function useRedeemableRewards(businessId: string | null) {
  const [rewards, setRewards] = useState<RedeemableRewardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!businessId) return;
      let active = true;
      setLoading(true);
      setError(null);
      getRedeemableRewards(businessId)
        .then(data => { if (active) setRewards(data); })
        .catch(e => { if (active) setError(e.message ?? 'Failed to load rewards'); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [businessId])
  );

  return { rewards, loading, error };
}
