// eventsService.ts — API service layer for the events module.
import { apiClient, getAccessToken, API_BASE_URL } from '@/api/client';
import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import { resolveImageUrl as resolveUrl } from '@/utils/resolveImageUrl';

export type EventType = 'In Person' | 'Online' | 'Hybrid';
export type EventCategory = 'food' | 'fitness' | 'music' | 'art' | 'community' | 'wellness' | 'market' | 'nightlife';

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
  event_type: EventType;
  category: EventCategory;
  is_free: boolean;
  price: string | null;
  tags: string[];
  is_hot: boolean;
  status: 'upcoming' | 'ongoing' | 'past' | 'cancelled';
  effective_status: 'upcoming' | 'past' | 'cancelled';
  created_at: string;
  updated_at: string;
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
  is_owner?: boolean;
  is_saved?: boolean;
}

export interface CreateEventPayload {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at?: string | null;
  event_type?: EventType;
  category?: EventCategory;
  is_free?: boolean;
  price?: string | null;
  tags?: string[];
  is_hot?: boolean;
}

export type UpdateEventPayload = Partial<CreateEventPayload> & { image_url?: string | null };

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

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

export async function fetchBusinessEvents(businessId: string, filter?: string): Promise<Event[]> {
  const qs = filter ? `?filter=${filter}` : '';
  const result = await apiClient.get<{ events: Event[] }>(`/events/business/${businessId}${qs}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load events');
  return (result.data!.events ?? []).map(resolveEvent);
}

export async function toggleEventStatus(id: string): Promise<Event> {
  const result = await apiClient.patch<{ event: Event }>(`/events/${id}/toggle-status`, {});
  if (!result.success) throw new Error(result.error ?? 'Failed to update event status');
  return resolveEvent(result.data!.event);
}

export async function cancelEvent(id: string): Promise<Event> {
  const result = await apiClient.patch<{ event: Event }>(`/events/${id}/cancel`, {});
  if (!result.success) throw new Error(result.error ?? 'Failed to cancel event');
  return resolveEvent(result.data!.event);
}

export async function deleteEvent(id: string): Promise<void> {
  const result = await apiClient.delete<{ id: string }>(`/events/${id}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to delete event');
}

async function buildEventFormData(uri: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    form.append('image', new File([blob], 'event.jpg', { type: 'image/jpeg' }));
  } else {
    // expo/fetch (SDK 57+) only accepts string | Blob | {bytes()} FormData parts —
    // the old {uri, name, type} object shape throws "Unsupported FormData part implementation".
    const file = new ExpoFile(uri);
    form.append('image', file, 'event.jpg');
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
