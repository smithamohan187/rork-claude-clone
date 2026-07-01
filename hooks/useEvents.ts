// useEvents.ts — state hooks for the events module.
import { useState, useCallback, useEffect } from 'react';
import {
  fetchMyEvents,
  fetchEventById,
  createEvent,
  updateEvent,
  cancelEvent as cancelEventService,
  type Event,
  type CreateEventPayload,
  type UpdateEventPayload,
} from '@/api/services/eventsService';

export function useEvents(initialFilter?: string) {
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (filter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyEvents(filter ?? initialFilter);
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [initialFilter]);

  useEffect(() => { load(); }, [load]);

  const addEvent = useCallback(async (payload: CreateEventPayload): Promise<Event> => {
    const event = await createEvent(payload);
    setEvents(prev => [event, ...prev]);
    return event;
  }, []);

  const editEvent = useCallback(async (id: string, payload: UpdateEventPayload): Promise<Event> => {
    const updated = await updateEvent(id, payload);
    setEvents(prev => prev.map(e => e.id === id ? updated : e));
    return updated;
  }, []);

  const doCancel = useCallback(async (id: string): Promise<void> => {
    const updated = await cancelEventService(id);
    setEvents(prev => prev.map(e => e.id === id ? updated : e));
  }, []);

  return { events, loading, error, refresh: load, addEvent, editEvent, cancelEvent: doCancel };
}

export function useEvent(id: string) {
  const [event, setEvent]     = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchEventById(id);
        if (!cancelled) setEvent(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { event, loading, error };
}
