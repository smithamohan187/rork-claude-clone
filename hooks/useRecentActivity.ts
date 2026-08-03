import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchRecentActivity, type RecentActivityItem } from '@/api/services/dashboardFeedService';

const PAGE_SIZE = 20;

export function useRecentActivity() {
  const [items, setItems] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchRecentActivity(PAGE_SIZE, 0);
      setItems(page);
      offsetRef.current = page.length;
      setHasMore(page.length === PAGE_SIZE);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load recent activity');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchRecentActivity(PAGE_SIZE, offsetRef.current);
      setItems((prev) => [...prev, ...page]);
      offsetRef.current += page.length;
      setHasMore(page.length === PAGE_SIZE);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load more activity');
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
