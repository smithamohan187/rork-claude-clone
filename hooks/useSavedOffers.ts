import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSavedOffers, toggleSaveOffer, type SavedOfferItem } from '@/api/services/savedOfferService';

export function useSavedOffers() {
  const [offers, setOffers] = useState<SavedOfferItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSavedOffers();
      setOffers(data);
    } catch {
      /* silently fail — list stays empty */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const remove = useCallback(async (offerId: string) => {
    setOffers((prev) => prev.filter((o) => o.id !== offerId));
    try {
      await toggleSaveOffer(offerId);
    } catch {
      refresh();
    }
  }, [refresh]);

  return { offers, isLoading, remove, refresh };
}
