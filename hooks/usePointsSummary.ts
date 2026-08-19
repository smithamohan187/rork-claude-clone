import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getPointsSummary, PointsSummary } from '@/api/services/pointsService';
import { useAuth } from '@/contexts/AuthContext';

export function usePointsSummary() {
  const { authLoading, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<PointsSummary>({ total: 0, breakdown: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !isAuthenticated) return;

      let active = true;
      setLoading(true);
      getPointsSummary()
        .then(data => { if (active) setSummary(data); })
        .catch(err => { if (active) setError(err?.message ?? 'Failed to load points'); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [authLoading, isAuthenticated])
  );

  return { summary, loading, error };
}
