export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  icon: 'Users' | 'Tag' | 'Zap' | 'Ticket' | 'Calendar';
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
    id: 'events',
    label: 'Upcoming Events',
    value: '0',
    icon: 'Calendar',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
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
  { id: 'add-content', label: 'Add Post / Event / Offer', icon: 'PlusCircle', route: '/(tabs)/content' },
  { id: 'view-members', label: 'Members', icon: 'UsersRound', route: '/(tabs)/marketplace' },
  { id: 'messages', label: 'Messages', icon: 'MessageSquare', route: '/(tabs)/messages' },
];

export const currentPlan: SubscriptionPlan = {
  name: 'Business Pro',
  expiryDate: 'Aug 15, 2025',
  isActive: true,
};
