import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchRecentRedemptions, type RecentRedemption } from '@/api/services/dashboardFeedService';

const PAGE_SIZE = 20;

export function useRecentRedemptions() {
  const [items, setItems] = useState<RecentRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchRecentRedemptions(PAGE_SIZE, 0);
      setItems(page);
      offsetRef.current = page.length;
      setHasMore(page.length === PAGE_SIZE);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load redemptions');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchRecentRedemptions(PAGE_SIZE, offsetRef.current);
      setItems((prev) => [...prev, ...page]);
      offsetRef.current += page.length;
      setHasMore(page.length === PAGE_SIZE);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load more redemptions');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { items, loading, loadingMore, hasMore, error, refresh: load, loadMore };
}
