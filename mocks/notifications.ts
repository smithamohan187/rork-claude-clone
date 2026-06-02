export type NotificationType = 'offer' | 'reward' | 'event';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timeAgo: string;
  isRead: boolean;
  group: 'today' | 'earlier';
}

export const mockNotifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'offer',
    title: 'New Offer from Nourish Kitchen',
    description: 'Weekend Brunch Special — 20% off your next visit!',
    timeAgo: '15 min ago',
    isRead: false,
    group: 'today',
  },
  {
    id: 'n2',
    type: 'reward',
    title: 'You earned 50 points!',
    description: 'Welcome bonus credited for subscribing to FitZone Gym.',
    timeAgo: '2 hours ago',
    isRead: false,
    group: 'today',
  },
  {
    id: 'n3',
    type: 'event',
    title: 'SoundWave Festival is Tomorrow',
    description: 'Don\'t forget — your early bird ticket is confirmed!',
    timeAgo: '4 hours ago',
    isRead: false,
    group: 'today',
  },
  {
    id: 'n4',
    type: 'offer',
    title: 'Flash Sale at Urban Threads',
    description: 'Spring collection 15% off ends tonight. Don\'t miss out!',
    timeAgo: '6 hours ago',
    isRead: true,
    group: 'today',
  },
  {
    id: 'n5',
    type: 'reward',
    title: 'Tier Upgrade: Silver Member',
    description: 'Congratulations! You\'ve reached Silver tier at Glow Studio.',
    timeAgo: '1 day ago',
    isRead: true,
    group: 'earlier',
  },
  {
    id: 'n6',
    type: 'event',
    title: 'Rivera Coffee Tasting Event',
    description: 'Join us this Saturday for a free coffee tasting session.',
    timeAgo: '2 days ago',
    isRead: true,
    group: 'earlier',
  },
  {
    id: 'n7',
    type: 'offer',
    title: 'Glow Studio: First Facial 30% Off',
    description: 'Book your first treatment and save big this week.',
    timeAgo: '3 days ago',
    isRead: true,
    group: 'earlier',
  },
  {
    id: 'n8',
    type: 'reward',
    title: 'Referral Bonus: 25 Points',
    description: 'Your friend joined via your referral link. Points added!',
    timeAgo: '5 days ago',
    isRead: true,
    group: 'earlier',
  },
];
