import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchPointsHistory, type PointsHistoryItem } from '@/api/services/pointsService';
import { useAuth } from '@/contexts/AuthContext';

export function usePointsHistory() {
  const { authLoading, isAuthenticated } = useAuth();
  const [items, setItems] = useState<PointsHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchPointsHistory());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { items, loading, error, refresh: load };
}
