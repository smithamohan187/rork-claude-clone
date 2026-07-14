import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getSubscribedBusinesses,
  unsubscribeFromBusiness,
} from '@/api/services/subscriptionService';
import { API_BASE_URL } from '@/api/client';

function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url}`;
}

export interface SubscribedBusinessItem {
  id: string;
  name: string;
  category: string;
  description: string;
  cover: string;
  subscribedAt: string;
  rating: number;
  tags: string[];
  points: number;
  activeOffers: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

function mapItem(raw: any): SubscribedBusinessItem {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category_name ?? '',
    description: raw.description ?? '',
    cover: resolveUrl(raw.cover_url) ?? '',
    subscribedAt: new Date(raw.subscribed_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    rating: Number(raw.avg_rating ?? 0),
    tags: [],
    points: 0,
    activeOffers: raw.active_offer_count ?? 0,
    tier: 'Bronze',
  };
}

export function useSubscribedBusinesses() {
  const [businesses, setBusinesses] = useState<SubscribedBusinessItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const raw = await getSubscribedBusinesses();
      setBusinesses(raw.map(mapItem));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filteredBusinesses = businesses.filter((b) => {
    const matchFilter = activeFilter === 'All' || b.category === activeFilter;
    if (!matchFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
  });

  const categories = useMemo<string[]>(
    () => ['All', ...new Set(businesses.map((b) => b.category).filter(Boolean))],
    [businesses]
  );

  const unsubscribe = useCallback(async (businessId: string) => {
    setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
    try {
      await unsubscribeFromBusiness(businessId);
    } catch {
      refresh();
    }
  }, [refresh]);

  return {
    businesses,
    filteredBusinesses,
    categories,
    isLoading,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    unsubscribe,
    refresh,
  };
}
