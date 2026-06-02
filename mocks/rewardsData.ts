export interface RedeemableReward {
  id: string;
  businessId: string;
  title: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'free_item' | 'voucher';
  expiryMinutes: number;
}

export interface ActivityEvent {
  id: string;
  type: 'subscribe' | 'referral' | 'share' | 'review' | 'welcome' | 'redeem' | 'milestone';
  title: string;
  description: string;
  points: number;
  timestamp: string;
  businessName?: string;
  accentColor: string;
}

export const redeemableRewards: Record<string, RedeemableReward[]> = {
  b1: [
    { id: 'rw1', businessId: 'b1', title: '15% Off Next Order', description: 'Get 15% off your next coffee order', pointsCost: 200, type: 'discount', expiryMinutes: 30 },
    { id: 'rw2', businessId: 'b1', title: 'Free Espresso Shot', description: 'Add a free espresso shot to any drink', pointsCost: 100, type: 'free_item', expiryMinutes: 30 },
    { id: 'rw3', businessId: 'b1', title: '$5 Gift Voucher', description: 'Redeem a $5 voucher for in-store use', pointsCost: 350, type: 'voucher', expiryMinutes: 30 },
  ],
  b3: [
    { id: 'rw4', businessId: 'b3', title: 'Free Day Pass', description: 'One free day pass for the gym', pointsCost: 150, type: 'free_item', expiryMinutes: 30 },
    { id: 'rw5', businessId: 'b3', title: '20% Off Membership', description: '20% off your next month membership', pointsCost: 250, type: 'discount', expiryMinutes: 30 },
  ],
  b4: [
    { id: 'rw6', businessId: 'b4', title: 'Free Pastry', description: 'Get a free pastry with any order', pointsCost: 80, type: 'free_item', expiryMinutes: 30 },
    { id: 'rw7', businessId: 'b4', title: '10% Off Catering', description: '10% off your next catering order', pointsCost: 120, type: 'discount', expiryMinutes: 30 },
  ],
};

export const activityEvents: ActivityEvent[] = [
  { id: 'ae1', type: 'subscribe', title: 'Subscribed to Rivera Coffee', description: 'Earned welcome bonus', points: 50, timestamp: '2 hours ago', businessName: 'Rivera Coffee Co.', accentColor: '#1A5C35' },
  { id: 'ae2', type: 'referral', title: 'Referred Sofia Martinez', description: 'Friend joined via your link', points: 50, timestamp: '5 hours ago', accentColor: '#1A5C35' },
  { id: 'ae3', type: 'share', title: 'Shared a post', description: 'Rivera Coffee Ethiopian blend', points: 15, timestamp: '1 day ago', businessName: 'Rivera Coffee Co.', accentColor: '#0EA5E9' },
  { id: 'ae4', type: 'review', title: 'Left a review', description: 'FitZone Gym - 5 stars', points: 10, timestamp: '2 days ago', businessName: 'FitZone Gym', accentColor: '#10B981' },
  { id: 'ae5', type: 'welcome', title: 'Joined FitZone community', description: 'Welcome points earned', points: 25, timestamp: '3 days ago', businessName: 'FitZone Gym', accentColor: '#00B246' },
  { id: 'ae6', type: 'milestone', title: 'Hit 750 pts at Rivera Coffee', description: 'Milestone achievement unlocked', points: 100, timestamp: '4 days ago', businessName: 'Rivera Coffee Co.', accentColor: '#EF4444' },
  { id: 'ae7', type: 'share', title: 'Shared FitZone challenge', description: '30-day transformation post', points: 15, timestamp: '5 days ago', businessName: 'FitZone Gym', accentColor: '#0EA5E9' },
  { id: 'ae8', type: 'referral', title: 'Referred Liam O\'Brien', description: 'Friend subscribed to Nourish', points: 50, timestamp: '1 week ago', accentColor: '#1A5C35' },
];

export interface TierInfo {
  name: string;
  threshold: number;
  color: string;
  icon: string;
}

export const tierLadder: TierInfo[] = [
  { name: 'Bronze', threshold: 0, color: '#CD7F32', icon: 'shield' },
  { name: 'Silver', threshold: 500, color: '#A8A9AD', icon: 'shield' },
  { name: 'Gold', threshold: 1500, color: '#FFD700', icon: 'crown' },
  { name: 'Platinum', threshold: 3000, color: '#00B246', icon: 'gem' },
  { name: 'Diamond', threshold: 5000, color: '#06B6D4', icon: 'diamond' },
];
