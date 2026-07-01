// eventsService.ts — API service layer for the events module.
import { apiClient, getAccessToken, API_BASE_URL } from '@/api/client';
import { Platform } from 'react-native';

export interface Event {
  id: string;
  type: 'event';
  business_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: 'upcoming' | 'ongoing' | 'past' | 'cancelled';
  effective_status: 'upcoming' | 'past' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at?: string | null;
}

export type UpdateEventPayload = Partial<CreateEventPayload> & { image_url?: string | null };

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function resolveEvent(event: Event): Event {
  return { ...event, type: 'event', image_url: resolveUrl(event.image_url) };
}

export async function fetchMyEvents(filter?: string): Promise<Event[]> {
  const qs = filter ? `?filter=${filter}` : '';
  const result = await apiClient.get<{ events: Event[] }>(`/events${qs}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load events');
  return (result.data!.events ?? []).map(resolveEvent);
}

export async function fetchEventById(id: string): Promise<Event> {
  const result = await apiClient.get<{ event: Event }>(`/events/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load event');
  return resolveEvent(result.data!.event);
}

export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  const result = await apiClient.post<{ event: Event }>('/events', payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to create event');
  return resolveEvent(result.data!.event);
}

export async function updateEvent(id: string, payload: UpdateEventPayload): Promise<Event> {
  const result = await apiClient.patch<{ event: Event }>(`/events/${id}`, payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to update event');
  return resolveEvent(result.data!.event);
}

export async function cancelEvent(id: string): Promise<Event> {
  const result = await apiClient.patch<{ event: Event }>(`/events/${id}/cancel`, {});
  if (!result.success) throw new Error(result.error ?? 'Failed to cancel event');
  return resolveEvent(result.data!.event);
}

async function buildEventFormData(uri: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    form.append('image', new File([blob], 'event.jpg', { type: 'image/jpeg' }));
  } else {
    form.append('image', { uri, name: 'event.jpg', type: 'image/jpeg' } as any);
  }
  return form;
}

export async function uploadEventImage(eventId: string, uri: string): Promise<Event> {
  const token = getAccessToken();
  const form = await buildEventFormData(uri);
  const response = await fetch(`${BASE_URL}/events/${eventId}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Image upload failed');
  return resolveEvent(data.data.event);
}
