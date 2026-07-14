import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSavedEvents, toggleSaveEvent, type SavedEventItem } from '@/api/services/savedEventService';

export function useSavedEvents() {
  const [events, setEvents] = useState<SavedEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSavedEvents();
      setEvents(data);
    } catch {
      /* silently fail — list stays empty */
    } finally {
      setIsLoading(false);
    }
  }, []);

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
