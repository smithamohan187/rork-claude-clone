import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchBusinessAnalytics, type BusinessAnalytics, type AnalyticsPeriod } from '@/api/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';

export type Range = '7d' | '30d' | '90d';

const RANGE_TO_PERIOD: Record<Range, AnalyticsPeriod> = { '7d': 7, '30d': 30, '90d': 90 };

export function useBusinessAnalytics() {
  const { authLoading, isAuthenticated } = useAuth();
  const [range, setRange] = useState<Range>('30d');
  const [data, setData] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBusinessAnalytics(RANGE_TO_PERIOD[range]);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [range, authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { data, loading, error, range, setRange, refresh: load };
}
