import { useState, useCallback, useMemo } from 'react';

export type NotificationType = 'general' | 'offer' | 'reward' | 'event';

export interface NotificationDisplay {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timeAgo: string;
  isRead: boolean;
  group: 'today' | 'earlier';
}

interface MockNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  is_read: boolean;
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const then = date.getTime();
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

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function toDisplay(notif: MockNotification): NotificationDisplay {
  return {
    id: notif.id,
    type: 'general' as NotificationType,
    title: notif.title,
    description: notif.message,
    timeAgo: relativeTime(notif.timestamp),
    isRead: notif.is_read,
    group: isToday(notif.timestamp) ? 'today' : 'earlier',
  };
}

const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: '1',
    title: '🎉 New Offer from Müller Bakery',
    message: "Get 20% off on all sourdough breads this weekend. Limited stock!",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    is_read: false,
  },
  {
    id: '2',
    title: '📅 Event Reminder – Schmidt Brewery',
    message: "The Oktoberfest tasting evening starts tomorrow at 7 PM. Don't miss it!",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    is_read: false,
  },
  {
    id: '3',
    title: '🏆 Points Earned!',
    message: 'You earned 150 points from your visit to Dupont Patisserie. Keep it up!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    is_read: false,
  },
  {
    id: '4',
    title: '👥 Referral Accepted',
    message: 'Your friend Elena Kovač joined TouchPoint using your referral code. You earned 200 bonus points!',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    is_read: true,
  },
  {
    id: '5',
    title: '🎁 Reward Ready to Redeem',
    message: 'You have a free coffee reward available at Bernardi Café. Visit the store to redeem.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    is_read: true,
  },
  {
    id: '6',
    title: '🔔 New Subscriber Milestone',
    message: 'Hoffmann Deli has reached 500 subscribers. Check out their exclusive loyalty offer!',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    is_read: true,
  },
  {
    id: '7',
    title: '⚠️ Offer Expiring Soon',
    message: "The Buy 1 Get 1 offer at Lefevre Fromagerie expires in 3 hours. Redeem before it's gone!",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    is_read: true,
  },
  {
    id: '8',
    title: '💬 New Message from Andersson Florist',
    message: 'Hi! We have a special arrangement prepared for you as a loyal subscriber. Visit us this week.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    is_read: true,
  },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<MockNotification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const displayNotifications: NotificationDisplay[] = useMemo(
    () => {
      const unread = notifications
        .filter((n) => !n.is_read)
        .map(toDisplay);
      const read = notifications
        .filter((n) => n.is_read)
        .map(toDisplay);
      return [...unread, ...read];
    },
    [notifications],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true })),
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const refetch = useCallback(() => {
    // No-op for mock data
  }, []);

  return {
    notifications: displayNotifications,
    unreadCount,
    isLoading: false,
    isError: false,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  };
}

export function useUnreadNotificationCount(): number {
  const { unreadCount } = useNotifications();
  return unreadCount;
}
