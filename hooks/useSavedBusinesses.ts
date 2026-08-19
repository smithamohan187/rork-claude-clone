import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getSavedBusinesses, unsaveBusiness, type SavedBusinessItem } from '@/api/services/savedBusinessService';
import { useAuth } from '@/contexts/AuthContext';

export function useSavedBusinesses() {
  const { authLoading, isAuthenticated } = useAuth();
  const [businesses, setBusinesses] = useState<SavedBusinessItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await getSavedBusinesses();
      setBusinesses(data);
    } catch {
      /* silently fail — list stays empty */
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const unsave = useCallback(async (businessId: string) => {
    setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
    try {
      await unsaveBusiness(businessId);
    } catch {
      refresh();
    }
  }, [refresh]);

  return { businesses, isLoading, unsave, refresh };
}
