import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
  type NotificationType,
} from '@/api/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

export type { NotificationType, AppNotification };

export interface NotificationDisplay {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timeAgo: string;
  isRead: boolean;
  group: 'today' | 'earlier';
  data: Record<string, unknown> | null;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(diffDay / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.floor(diffDay / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function toDisplay(notif: AppNotification): NotificationDisplay {
  return {
    id: notif.id,
    type: notif.type,
    title: notif.title ?? '',
    description: notif.body ?? '',
    timeAgo: relativeTime(notif.created_at),
    isRead: notif.is_read,
    group: isToday(notif.created_at) ? 'today' : 'earlier',
    data: notif.data,
  };
}

export function useNotifications() {
  const { authLoading, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const [list, count] = await Promise.all([fetchMyNotifications(), fetchUnreadCount()]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const displayNotifications: NotificationDisplay[] = useMemo(
    () => notifications.map(toDisplay),
    [notifications],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    });
    markNotificationRead(id).catch(() => {});
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => {});
  }, []);

  return {
    notifications: displayNotifications,
    unreadCount,
    isLoading,
    isError,
    markAsRead,
    markAllAsRead,
    refetch: load,
  };
}

export function useUnreadNotificationCount(): number {
  const { authLoading, isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !isAuthenticated) return;
      fetchUnreadCount().then(setCount).catch(() => {});
    }, [authLoading, isAuthenticated]),
  );

  return count;
}
