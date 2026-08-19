// Hook layer — manages all state and side-effects for the business directory screen.
// The screen imports this hook only; it never calls apiClient or services directly.
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchBusinessDirectory,
  fetchBusinessCategories,
  BusinessDirectoryItem,
  BusinessCategory,
} from '@/api/services/businessDirectoryService';
import { useAuth } from '@/contexts/AuthContext';

export const useBusinessDirectory = () => {
  // This endpoint works fine logged-out, so we don't gate on isAuthenticated — only on
  // authLoading, so that when the user IS logged in, the initial fetch waits for session
  // restore to finish setting the in-memory access token first. Otherwise, on a fresh page
  // load, this fires before the token is set, silently loses is_subscribed for every card
  // (no 401 to trigger a retry, since the route itself doesn't require auth), and never
  // recovers until the next manual refresh/filter change.
  const { authLoading } = useAuth();
  const [businesses, setBusinesses]       = useState<BusinessDirectoryItem[]>([]);
  const [categories, setCategories]       = useState<BusinessCategory[]>([]);
  const [search, setSearch]               = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage]                   = useState<number>(1);
  const [total, setTotal]                 = useState<number>(0);
  const [loading, setLoading]             = useState<boolean>(false);    // initial / filter-change load
  const [loadingMore, setLoadingMore]     = useState<boolean>(false);    // pagination append
  const [error, setError]                 = useState<string | null>(null);

  // hasMore: true when the list we have is shorter than the total matching count
  const hasMore = businesses.length < total;

  // Ref for the debounce timer so we can cancel it when the user types again quickly
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Load helpers ---

  // loadPage replaces the current list (used for first page or filter changes)
  const loadPage = useCallback(async (
    searchVal: string,
    categoryVal: string | null,
    pageNum: number,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBusinessDirectory({
        search:   searchVal   || undefined,
        category: categoryVal || undefined,
        page:     pageNum,
      });
      setBusinesses(data.businesses);
      setTotal(data.total);
      setPage(data.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  // loadMore appends the next page to the existing list
  const loadMore = useCallback(async (
    searchVal: string,
    categoryVal: string | null,
    nextPage: number,
  ) => {
    setLoadingMore(true);
    try {
      const data = await fetchBusinessDirectory({
        search:   searchVal   || undefined,
        category: categoryVal || undefined,
        page:     nextPage,
      });
      setBusinesses((prev) => [...prev, ...data.businesses]);
      setTotal(data.total);
      setPage(data.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoadingMore(false);
    }
  }, []);

  // --- Initial load — fetch categories and first page of businesses in parallel ---
  useEffect(() => {
    if (authLoading) return;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cats, data] = await Promise.all([
          fetchBusinessCategories(),
          fetchBusinessDirectory({ page: 1 }),
        ]);
        setCategories(cats);
        setBusinesses(data.businesses);
        setTotal(data.total);
        setPage(1);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [authLoading]);

  // --- Handlers ---

  /**
   * Called every time the search TextInput changes.
   * Debounced 400ms so we don't fire an API call on every keystroke.
   */
  const handleSearch = useCallback((text: string) => {
    setSearch(text);

    // Cancel the previous debounce timer before setting a new one
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      // Always go back to page 1 when the search changes
      loadPage(text, activeCategory, 1);
    }, 400);
  }, [activeCategory, loadPage]);

  /**
   * Toggle a category chip. Selecting the same chip again deselects it (clears the filter).
   */
  const handleCategorySelect = useCallback((cat: string | null) => {
    const next = cat === activeCategory ? null : cat;
    setActiveCategory(next);
    // Reset to page 1 and replace the list whenever the category filter changes
    loadPage(search, next, 1);
  }, [activeCategory, search, loadPage]);

  /**
   * Append the next page of results. Skips silently when already loading or nothing left.
   */
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadMore(search, activeCategory, page + 1);
  }, [loadingMore, hasMore, search, activeCategory, page, loadMore]);

  return {
    businesses,
    categories,
    search,
    activeCategory,
    page,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    handleSearch,
    handleCategorySelect,
    handleLoadMore,
  };
};
