import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  fetchBusinessEvents,
  toggleEventStatus,
  type Event,
} from '@/api/services/eventsService';

export type EventFilter = 'all' | 'upcoming' | 'past' | 'cancelled';

export function useBusinessEvents(businessId: string, filter: EventFilter) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const filterParam = filter === 'all' ? undefined : filter;
      const data = await fetchBusinessEvents(businessId, filterParam);
      setEvents(data);
    } catch {
      // silently fail — list stays empty
    } finally {
      setIsLoading(false);
    }
  }, [businessId, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleStatus = useCallback(
    async (eventId: string) => {
      try {
        await toggleEventStatus(eventId);
        await refresh();
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Could not update event status.');
      }
    },
    [refresh],
  );

  return { events, isLoading, refresh, toggleStatus };
}
