// mobile/src/api/events.api.ts
import { apiClient, ApiResult } from './client';

export type Event = {
  id: string;
  business_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  status?: string | null;
};

export type CreateEventPayload = Omit<Event, 'id' | 'status'>;

export const eventsApi = {
  fetchEvents(params?: { businessId?: string }): Promise<ApiResult<Event[]>> {
    return apiClient.get<Event[]>('/events', { query: { business_id: params?.businessId } });
  },
  createEvent(payload: CreateEventPayload): Promise<ApiResult<Event>> {
    return apiClient.post<Event>('/events', payload);
  },
  cancelEvent(id: string): Promise<ApiResult<Event>> {
    return apiClient.post<Event>(`/events/${id}/cancel`);
  },
};
