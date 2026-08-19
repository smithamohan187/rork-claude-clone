import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSavedEvents, toggleSaveEvent, type SavedEventItem } from '@/api/services/savedEventService';
import { useAuth } from '@/contexts/AuthContext';

export function useSavedEvents() {
  const { authLoading, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<SavedEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await getSavedEvents();
      setEvents(data);
    } catch {
      /* silently fail — list stays empty */
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const remove = useCallback(async (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await toggleSaveEvent(eventId);
    } catch {
      refresh();
    }
  }, [refresh]);

  return { events, isLoading, remove, refresh };
}
