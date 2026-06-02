export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  icon: 'Users' | 'Tag' | 'Zap' | 'Ticket';
  color: string;
  bgColor: string;
  trend?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: 'Megaphone' | 'CalendarPlus' | 'UsersRound' | 'MessageSquare' | 'PenSquare' | 'PlusCircle';
  route: string;
}

export type ActivityType = 'subscriber' | 'points' | 'redemption';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  timeAgo: string;
}

export interface SubscriptionPlan {
  name: string;
  expiryDate: string;
  isActive: boolean;
}

export const dashboardStats: DashboardStat[] = [
  {
    id: 'subscribers',
    label: 'Total Subscribers',
    value: '1,284',
    icon: 'Users',
    color: '#1A5C35',
    bgColor: '#EDE9F6',
    trend: '+12%',
  },
  {
    id: 'offers',
    label: 'Active Offers',
    value: '8',
    icon: 'Tag',
    color: '#E5A100',
    bgColor: '#FFF8E7',
  },
  {
    id: 'points',
    label: 'Points Today',
    value: '3,450',
    icon: 'Zap',
    color: '#22C55E',
    bgColor: '#ECFDF5',
    trend: '+24%',
  },
  {
    id: 'coupons',
    label: 'Redeemed',
    value: '47',
    icon: 'Ticket',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    trend: '+5%',
  },
];

export const quickActions: QuickAction[] = [
  { id: 'add-content', label: 'Add Post / Event / Offer', icon: 'PlusCircle', route: '/create-offer' },
  { id: 'view-members', label: 'Members', icon: 'UsersRound', route: '/(tabs)/marketplace' },
  { id: 'messages', label: 'Messages', icon: 'MessageSquare', route: '/business-inbox' },
];

export const recentActivity: ActivityItem[] = [
  {
    id: 'a1',
    type: 'subscriber',
    description: 'Sarah M. subscribed to your business',
    timestamp: '2025-01-15T10:30:00Z',
    timeAgo: '5 min ago',
  },
  {
    id: 'a2',
    type: 'redemption',
    description: 'James K. redeemed "20% Off Lunch" coupon',
    timestamp: '2025-01-15T10:15:00Z',
    timeAgo: '20 min ago',
  },
  {
    id: 'a3',
    type: 'points',
    description: '150 points awarded to Emily R. via referral',
    timestamp: '2025-01-15T09:45:00Z',
    timeAgo: '50 min ago',
  },
  {
    id: 'a4',
    type: 'subscriber',
    description: 'Mike T. subscribed to your business',
    timestamp: '2025-01-15T09:20:00Z',
    timeAgo: '1 hr ago',
  },
  {
    id: 'a5',
    type: 'redemption',
    description: 'Lisa P. redeemed "Free Coffee" coupon',
    timestamp: '2025-01-15T08:50:00Z',
    timeAgo: '2 hrs ago',
  },
  {
    id: 'a6',
    type: 'points',
    description: '200 points awarded to David W. for purchase',
    timestamp: '2025-01-15T08:30:00Z',
    timeAgo: '2 hrs ago',
  },
  {
    id: 'a7',
    type: 'subscriber',
    description: 'Anna C. subscribed to your business',
    timestamp: '2025-01-15T07:15:00Z',
    timeAgo: '3 hrs ago',
  },
];

export const currentPlan: SubscriptionPlan = {
  name: 'Business Pro',
  expiryDate: 'Aug 15, 2025',
  isActive: true,
};
