import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getMyReferrals,
  CombinedReferral,
  ReferralDirection,
} from '@/api/services/referralService';
import { useAuth } from '@/contexts/AuthContext';

const SEARCH_DEBOUNCE_MS = 300;

export function useMyReferrals() {
  const { authLoading, isAuthenticated } = useAuth();
  const [direction, setDirection] = useState<ReferralDirection>('all');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [referrals, setReferrals] = useState<CombinedReferral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyReferrals(direction, debouncedSearch);
      setReferrals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [direction, debouncedSearch, authLoading, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return {
    direction,
    setDirection,
    search,
    setSearch,
    referrals,
    loading,
    error,
    refetch: load,
  };
}
