import { apiClient } from '@/api/client';
import { type EventType } from '@/api/services/eventsService';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export interface SavedEventItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  event_type: EventType;
  business_name: string;
  business_logo: string | null;
  saved_at: string;
}

export async function toggleSaveEvent(eventId: string): Promise<{ saved: boolean }> {
  const result = await apiClient.post<{ saved: boolean }>('/saved-events/toggle', { event_id: eventId });
  if (!result.success) throw new Error(result.error ?? 'Toggle save failed');
  return result.data!;
}

export async function getSavedEvents(): Promise<SavedEventItem[]> {
  const result = await apiClient.get<SavedEventItem[]>('/saved-events/my-events');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch saved events');
  return (result.data ?? []).map((e) => ({
    ...e,
    image_url: resolveUrl(e.image_url),
    business_logo: resolveUrl(e.business_logo),
  }));
}
