import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchDashboardSummary, fetchMyBusinessId, type DashboardSummary } from '@/api/services/businessDashboardService';
import { useAuth } from '@/contexts/AuthContext';

export function useBusinessDashboard() {
  const { authLoading, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [data, id] = await Promise.all([fetchDashboardSummary(), fetchMyBusinessId()]);
      setSummary(data);
      setBusinessId(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { summary, loading, error, refresh: load, businessId };
}
