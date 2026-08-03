import { apiClient } from '@/api/client';

export type NotificationType =
  | 'new_offer'
  | 'new_event'
  | 'points_earned'
  | 'reward_redeemed'
  | 'referral_joined'
  | 'customer_subscribed'
  | 'invited_business_joined'
  | 'new_message';

export interface AppNotification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export async function fetchMyNotifications(opts?: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<AppNotification[]> {
  const params = new URLSearchParams();
  if (opts?.unreadOnly) params.set('unreadOnly', 'true');
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.offset != null) params.set('offset', String(opts.offset));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const result = await apiClient.get<{ notifications: AppNotification[] }>(`/notifications/mine${qs}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load notifications');
  return result.data!.notifications ?? [];
}

export async function fetchUnreadCount(): Promise<number> {
  const result = await apiClient.get<{ count: number }>('/notifications/mine/unread-count');
  if (!result.success) throw new Error(result.error ?? 'Failed to load unread count');
  return result.data!.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const result = await apiClient.patch<{ notification: AppNotification }>(`/notifications/${id}/read`, {});
  if (!result.success) throw new Error(result.error ?? 'Failed to mark notification as read');
}

export async function markAllNotificationsRead(): Promise<void> {
  const result = await apiClient.patch<{ markedCount: number }>('/notifications/mine/read-all', {});
  if (!result.success) throw new Error(result.error ?? 'Failed to mark all notifications as read');
}
