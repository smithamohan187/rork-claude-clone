// mobile/src/api/saved.api.ts
import { apiClient, ApiResult } from './client';

export type SavedItem = {
  id: string;
  user_id: string;
  item_type: 'business' | 'offer' | 'event';
  item_id: string;
  created_at: string;
};

export const savedApi = {
  getSaved(userId: string, itemType?: SavedItem['item_type']): Promise<ApiResult<SavedItem[]>> {
    return apiClient.get<SavedItem[]>(`/saved/users/${userId}`, {
      query: { item_type: itemType },
    });
  },
  getSavedBusinesses(userId: string): Promise<ApiResult<unknown[]>> {
    return apiClient.get<unknown[]>(`/saved/users/${userId}/businesses`);
  },
  saveItem(payload: { user_id: string; item_type: SavedItem['item_type']; item_id: string }): Promise<ApiResult<SavedItem>> {
    return apiClient.post<SavedItem>('/saved', payload);
  },
  removeItem(userId: string, itemType: SavedItem['item_type'], itemId: string): Promise<ApiResult<{ ok: true }>> {
    return apiClient.delete<{ ok: true }>(`/saved/users/${userId}/${itemType}/${itemId}`);
  },
};
