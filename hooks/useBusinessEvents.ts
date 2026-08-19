import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import {
  fetchBusinessEvents,
  toggleEventStatus,
  type Event,
} from '@/api/services/eventsService';
import { useAuth } from '@/contexts/AuthContext';

export type EventFilter = 'all' | 'upcoming' | 'past' | 'cancelled';

export function useBusinessEvents(businessId: string, filter: EventFilter) {
  const { authLoading, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  // Independent of the display filter, so the count badges reflect the true totals per
  // status rather than being derived from whichever filtered subset happens to be loaded.
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const filterParam = filter === 'all' ? undefined : filter;
      const [data, all] = await Promise.all([
        fetchBusinessEvents(businessId, filterParam),
        filter === 'all' ? Promise.resolve(null) : fetchBusinessEvents(businessId, undefined),
      ]);
      setEvents(data);
      setAllEvents(filter === 'all' ? data : (all ?? []));
    } catch {
      // silently fail — list stays empty
    } finally {
      setIsLoading(false);
    }
  }, [businessId, filter]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [refresh, authLoading, isAuthenticated]);

  const counts = useMemo(() => ({
    all: allEvents.length,
    upcoming: allEvents.filter((e) => e.effective_status === 'upcoming').length,
    past: allEvents.filter((e) => e.effective_status === 'past').length,
    cancelled: allEvents.filter((e) => e.effective_status === 'cancelled').length,
  }), [allEvents]);

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

  return { events, counts, isLoading, refresh, toggleStatus };
}
