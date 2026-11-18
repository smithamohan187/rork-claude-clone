import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  fetchBusinessOffers,
  toggleOfferStatus,
  type Offer,
} from '@/api/services/offersService';
import { useAuth } from '@/contexts/AuthContext';

export type OfferFilter = 'all' | 'active' | 'expired' | 'disabled';

export function useBusinessOffers(businessId: string, filter: OfferFilter) {
  const { authLoading, isAuthenticated } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await fetchBusinessOffers(businessId, status);
      setOffers(data);
    } catch {
      // silently fail — list stays empty
    } finally {
      setIsLoading(false);
    }
  }, [businessId, filter]);

  // Wait for AuthContext's session-restore to finish — firing before it settles hits the API
  // with no access token yet, 401s, and silently leaves the list empty on fresh page loads.
  // useFocusEffect (not useEffect) because expo-router keeps the business-profile screen mounted
  // across navigation — a status change made elsewhere (e.g. manage-content.tsx) would otherwise
  // keep showing stale status here until a full unmount/remount.
  useFocusEffect(
    useCallback(() => {
      if (authLoading || !isAuthenticated) return;
      refresh();
    }, [refresh, authLoading, isAuthenticated]),
  );

  const toggleDisable = useCallback(
    async (offerId: string, currentStatus: 'active' | 'disabled' | 'expired') => {
      if (currentStatus === 'expired') return;
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      try {
        await toggleOfferStatus(offerId, newStatus);
        await refresh();
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Could not update offer status.');
      }
    },
    [refresh],
  );

  return { offers, isLoading, refresh, toggleDisable };
}
