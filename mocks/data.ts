import { User, Post, Product, Conversation, Message, RewardRule, Referral, BizCom, InvitationReferralCode, BizComAutoInvite, GoogleBusinessProfile } from '@/types';
import type { BusinessProfileData } from '@/types';

export const mockBusinessSignUpData: BusinessProfileData = {
  name: 'Rivera Coffee Co.',
  username: 'riveracoffee',
  bio: 'Artisan coffee roasters since 2018. Fresh beans, bold flavors, community vibes.',
  avatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
  phone: '+1 (555) 100-2018',
  email: 'hello@riveracoffee.com',
  website: 'www.riveracoffee.com',
  address: '42 Roast Lane, Brooklyn, NY 11201',
  category: 'Coffee & Beverages',
  hours: 'Mon–Fri 7am–7pm · Sat–Sun 8am–5pm',
};

export const mockBusinessSignUpProfiles: BusinessProfileData[] = [
  {
    name: 'Bloom & Petal Florals',
    username: 'bloompetal',
    bio: 'Handcrafted floral arrangements for every occasion. Same-day delivery available.',
    avatar: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200&h=200&fit=crop',
    phone: '+1 (555) 234-8901',
    email: 'orders@bloompetal.com',
    website: 'www.bloompetal.com',
    address: '118 Garden Ave, Manhattan, NY 10012',
    category: 'Flowers & Gifts',
    hours: 'Mon–Sat 9am–6pm · Sun Closed',
  },
  {
    name: 'FitZone Performance Gym',
    username: 'fitzonegym',
    bio: 'Your fitness journey starts here. Personal training, group classes & more.',
    avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    phone: '+1 (555) 456-3200',
    email: 'info@fitzonegym.com',
    website: 'www.fitzonegym.com',
    address: '500 Muscle Blvd, Queens, NY 11375',
    category: 'Fitness & Sports',
    hours: 'Mon–Fri 5am–11pm · Sat–Sun 7am–9pm',
  },
  {
    name: 'Nourish Kitchen & Table',
    username: 'nourishkitchen',
    bio: 'Farm-to-table dining with seasonal menus. Brunch, lunch & dinner daily.',
    avatar: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
    phone: '+1 (555) 789-4560',
    email: 'reservations@nourishkitchen.com',
    website: 'www.nourishkitchen.com',
    address: '88 Harvest St, SoHo, NY 10013',
    category: 'Restaurant & Dining',
    hours: 'Tue–Sun 10am–10pm · Mon Closed',
  },
];

export interface MemberAchievement {
  id: string;
  memberName: string;
  memberAvatar: string;
  type: 'points_milestone' | 'prize_won' | 'streak' | 'referral_bonus' | 'top_contributor' | 'level_up';
  title: string;
  subtitle: string;
  value: string;
  accentColor: string;
  iconBg: string;
  timestamp: string;
  businessId?: string;
  prizeId?: string;
}

export interface BusinessPrize {
  id: string;
  businessId: string;
  businessName: string;
  businessAvatar: string;
  title: string;
  description: string;
  prizeType: 'draw' | 'milestone' | 'challenge' | 'tier_reward';
  status: 'active' | 'upcoming' | 'ended';
  pointsCost: number;
  tierRequired?: string;
  totalEntries: number;
  maxWinners: number;
  winnersSelected: number;
  endsAt: string;
  createdAt: string;
  accentColor: string;
  iconBg: string;
}

export interface TierAnalytics {
  tierName: string;
  memberCount: number;
  percentage: number;
  color: string;
  pointsThreshold: number;
}

export const businessPrizes: BusinessPrize[] = [
  {
    id: 'bp1',
    businessId: 'b1',
    businessName: 'Rivera Coffee Co.',
    businessAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    title: '$50 Gift Card Weekly Draw',
    description: 'Enter for a chance to win a $50 gift card every week',
    prizeType: 'draw',
    status: 'active',
    pointsCost: 100,
    totalEntries: 234,
    maxWinners: 1,
    winnersSelected: 0,
    endsAt: '2026-02-21T23:59:00Z',
    createdAt: '2026-02-10T09:00:00Z',
    accentColor: '#F59E0B',
    iconBg: '#FEF3C7',
  },
  {
    id: 'bp2',
    businessId: 'b3',
    businessName: 'FitZone Performance Gym',
    businessAvatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    title: 'Free Spa Day Raffle',
    description: 'Monthly raffle for Gold tier members and above',
    prizeType: 'draw',
    status: 'active',
    pointsCost: 200,
    tierRequired: 'Gold',
    totalEntries: 89,
    maxWinners: 2,
    winnersSelected: 0,
    endsAt: '2026-02-28T23:59:00Z',
    createdAt: '2026-02-01T09:00:00Z',
    accentColor: '#EC4899',
    iconBg: '#FCE7F3',
  },
  {
    id: 'bp3',
    businessId: 'b4',
    businessName: 'Nourish Kitchen & Table',
    businessAvatar: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
    title: 'Dinner for Two Giveaway',
    description: 'Refer 5 friends this month to enter',
    prizeType: 'challenge',
    status: 'active',
    pointsCost: 0,
    totalEntries: 156,
    maxWinners: 3,
    winnersSelected: 1,
    endsAt: '2026-02-25T23:59:00Z',
    createdAt: '2026-02-05T09:00:00Z',
    accentColor: '#1A5C35',
    iconBg: '#E8F5EE',
  },
  {
    id: 'bp4',
    businessId: 'b1',
    businessName: 'Rivera Coffee Co.',
    businessAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    title: 'Platinum VIP Experience',
    description: 'Exclusive behind-the-scenes roastery tour + tasting',
    prizeType: 'tier_reward',
    status: 'active',
    pointsCost: 5000,
    tierRequired: 'Platinum',
    totalEntries: 12,
    maxWinners: 5,
    winnersSelected: 2,
    endsAt: '2026-03-31T23:59:00Z',
    createdAt: '2026-01-15T09:00:00Z',
    accentColor: '#00B246',
    iconBg: '#E8F5EE',
  },
  {
    id: 'bp5',
    businessId: 'b1',
    businessName: 'Rivera Coffee Co.',
    businessAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    title: '1000 Points Milestone Reward',
    description: 'Free artisan coffee bag when you hit 1000 points',
    prizeType: 'milestone',
    status: 'active',
    pointsCost: 1000,
    totalEntries: 67,
    maxWinners: 999,
    winnersSelected: 34,
    endsAt: '2026-12-31T23:59:00Z',
    createdAt: '2026-01-01T09:00:00Z',
    accentColor: '#10B981',
    iconBg: '#D1FAE5',
  },
];

export const tierAnalytics: TierAnalytics[] = [
  { tierName: 'Bronze', memberCount: 1420, percentage: 49.8, color: '#CD7F32', pointsThreshold: 500 },
  { tierName: 'Silver', memberCount: 780, percentage: 27.4, color: '#A8A9AD', pointsThreshold: 1500 },
  { tierName: 'Gold', memberCount: 412, percentage: 14.5, color: '#FFD000', pointsThreshold: 3000 },
  { tierName: 'Platinum', memberCount: 178, percentage: 6.2, color: '#00B246', pointsThreshold: 5000 },
  { tierName: 'Diamond', memberCount: 57, percentage: 2.0, color: '#06B6D4', pointsThreshold: 10000 },
];

export interface MemberFollowedBusiness {
  businessId: string;
  businessName: string;
  businessAvatar: string;
  followedSince: string;
  pointsEarned: number;
  currentTier: string;
  tierColor: string;
}

export const currentMemberFollowedBusinesses: MemberFollowedBusiness[] = [
  {
    businessId: 'b1',
    businessName: 'Rivera Coffee Co.',
    businessAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    followedSince: '2025-06-15',
    pointsEarned: 780,
    currentTier: 'Silver',
    tierColor: '#A8A9AD',
  },
  {
    businessId: 'b3',
    businessName: 'FitZone Gym',
    businessAvatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    followedSince: '2025-09-01',
    pointsEarned: 320,
    currentTier: 'Bronze',
    tierColor: '#CD7F32',
  },
  {
    businessId: 'b4',
    businessName: 'Nourish Kitchen & Table',
    businessAvatar: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
    followedSince: '2025-11-20',
    pointsEarned: 150,
    currentTier: 'Bronze',
    tierColor: '#CD7F32',
  },
];

export const currentMemberAchievements: MemberAchievement[] = [
  {
    id: 'my-ach1',
    memberName: 'Alex Rivera',
    memberAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    type: 'top_contributor',
    title: 'Top Contributor This Week!',
    subtitle: 'Most reviews & recommendations',
    value: '#1',
    accentColor: '#0EA5E9',
    iconBg: '#E0F2FE',
    timestamp: '2 days ago',
    businessId: 'b1',
  },
  {
    id: 'my-ach2',
    memberName: 'Alex Rivera',
    memberAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    type: 'points_milestone',
    title: 'Hit 750 Points at Rivera Coffee!',
    subtitle: 'Only 250 more to Silver milestone reward',
    value: '750',
    accentColor: '#10B981',
    iconBg: '#D1FAE5',
    timestamp: '1 day ago',
    businessId: 'b1',
  },
  {
    id: 'my-ach3',
    memberName: 'Alex Rivera',
    memberAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    type: 'streak',
    title: '14-Day Check-in Streak!',
    subtitle: 'FitZone Gym - earned 140 bonus points',
    value: '14',
    accentColor: '#EF4444',
    iconBg: '#FEE2E2',
    timestamp: '3 hours ago',
    businessId: 'b3',
  },
  {
    id: 'my-ach4',
    memberName: 'Alex Rivera',
    memberAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    type: 'referral_bonus',
    title: 'Referred 3 Friends to Nourish!',
    subtitle: 'Earned 150 referral points',
    value: '3',
    accentColor: '#1A5C35',
    iconBg: '#E8F5EE',
    timestamp: '5 hours ago',
    businessId: 'b4',
  },
  {
    id: 'my-ach5',
    memberName: 'Alex Rivera',
    memberAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    type: 'level_up',
    title: 'Reached Silver Tier!',
    subtitle: 'Rivera Coffee Co. - new perks unlocked',
    value: 'SLV',
    accentColor: '#A8A9AD',
    iconBg: '#F1F5F9',
    timestamp: '4 days ago',
    businessId: 'b1',
  },
  {
    id: 'my-ach6',
    memberName: 'Alex Rivera',
    memberAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    type: 'prize_won',
    title: 'Won Free Coffee Tasting!',
    subtitle: 'Rivera Coffee Co. weekly draw',
    value: 'WIN',
    accentColor: '#F59E0B',
    iconBg: '#FEF3C7',
    timestamp: '1 week ago',
    businessId: 'b1',
  },
];

export const memberAchievements: MemberAchievement[] = [
  {
    id: 'ach1',
    memberName: 'Sarah Chen',
    memberAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    type: 'prize_won',
    title: 'Won $50 Gift Card!',
    subtitle: 'Rivera Coffee Co. weekly draw',
    value: '$50',
    accentColor: '#F59E0B',
    iconBg: '#FEF3C7',
    timestamp: '2 hours ago',
  },
  {
    id: 'ach2',
    memberName: 'Marcus Johnson',
    memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    type: 'points_milestone',
    title: 'Hit 5,000 Points!',
    subtitle: 'Unlocked Gold Member status',
    value: '5K',
    accentColor: '#00B246',
    iconBg: '#E8F5EE',
    timestamp: '4 hours ago',
  },
  {
    id: 'ach3',
    memberName: 'Emma Wilson',
    memberAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    type: 'streak',
    title: '30-Day Check-in Streak!',
    subtitle: 'Earned 300 bonus points',
    value: '30',
    accentColor: '#EF4444',
    iconBg: '#FEE2E2',
    timestamp: '6 hours ago',
  },
  {
    id: 'ach4',
    memberName: 'David Park',
    memberAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    type: 'referral_bonus',
    title: 'Referred 10 Friends!',
    subtitle: 'Earned 1,000 referral points',
    value: '10',
    accentColor: '#10B981',
    iconBg: '#D1FAE5',
    timestamp: '1 day ago',
  },
  {
    id: 'ach5',
    memberName: 'Lisa Thompson',
    memberAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    type: 'prize_won',
    title: 'Won Free Spa Day!',
    subtitle: 'FitZone monthly raffle',
    value: 'SPA',
    accentColor: '#EC4899',
    iconBg: '#FCE7F3',
    timestamp: '1 day ago',
  },
  {
    id: 'ach6',
    memberName: 'Alex Rivera',
    memberAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    type: 'top_contributor',
    title: 'Top Contributor This Week!',
    subtitle: 'Most reviews & recommendations',
    value: '#1',
    accentColor: '#0EA5E9',
    iconBg: '#E0F2FE',
    timestamp: '2 days ago',
  },
  {
    id: 'ach7',
    memberName: 'Olivia Martinez',
    memberAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
    type: 'level_up',
    title: 'Reached Platinum Level!',
    subtitle: 'Exclusive perks unlocked',
    value: 'LVL',
    accentColor: '#00B246',
    iconBg: '#E0E7FF',
    timestamp: '2 days ago',
  },
  {
    id: 'ach8',
    memberName: 'James Wright',
    memberAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    type: 'prize_won',
    title: 'Won Dinner for Two!',
    subtitle: 'Nourish Kitchen giveaway',
    value: 'WIN',
    accentColor: '#1A5C35',
    iconBg: '#E8F5EE',
    timestamp: '3 days ago',
  },
  {
    id: 'ach9',
    memberName: 'Mia Zhang',
    memberAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
    type: 'prize_won',
    title: 'Won Free Coffee Bag!',
    subtitle: 'Rivera Coffee milestone reward',
    value: 'FREE',
    accentColor: '#10B981',
    iconBg: '#D1FAE5',
    timestamp: '4 hours ago',
    businessId: 'b1',
    prizeId: 'bp5',
  },
  {
    id: 'ach10',
    memberName: 'Ryan Cooper',
    memberAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    type: 'level_up',
    title: 'Reached Gold Tier!',
    subtitle: 'Unlocked FitZone Spa Day raffle',
    value: 'GOLD',
    accentColor: '#FFD000',
    iconBg: '#FEF9C3',
    timestamp: '5 hours ago',
    businessId: 'b3',
    prizeId: 'bp2',
  },
  {
    id: 'ach11',
    memberName: 'Jade Foster',
    memberAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    type: 'prize_won',
    title: 'Won VIP Roastery Tour!',
    subtitle: 'Rivera Coffee Platinum exclusive',
    value: 'VIP',
    accentColor: '#00B246',
    iconBg: '#E8F5EE',
    timestamp: '1 day ago',
    businessId: 'b1',
    prizeId: 'bp4',
  },
];

export const testUsers: User[] = [
  {
    id: 'u0',
    name: 'Alex Rivera',
    username: 'alexrivera',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    accountType: 'personal',
    bio: 'Community builder & local business advocate 🤝',
    followers: 589,
    following: 214,
    points: 1850,
  },
  {
    id: 'u2',
    name: 'Maya Chen',
    username: 'mayachen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    accountType: 'personal',
    bio: 'Exploring local businesses & sharing the best finds ✨',
    followers: 342,
    following: 128,
    points: 1250,
  },
  {
    id: 'u3',
    name: 'James Park',
    username: 'jamespark',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    accountType: 'personal',
    bio: 'Tech enthusiast & coffee lover ☕',
    followers: 178,
    following: 95,
    points: 620,
  },
];

export const currentPersonalUser: User = testUsers[0];

export const currentBusinessUser: User = {
  id: 'b1',
  name: 'Rivera Coffee Co.',
  username: 'riveracoffee',
  avatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
  accountType: 'business',
  bio: 'Artisan coffee roasters since 2018 ☕ Fresh beans, bold flavors.',
  followers: 2847,
  following: 56,
  points: 0,
  phone: '+1 (555) 100-2018',
  email: 'hello@riveracoffee.com',
  website: 'www.riveracoffee.com',
  address: '42 Roast Lane, Brooklyn, NY 11201',
  category: 'Coffee & Beverages',
  hours: 'Mon–Fri 7am–7pm · Sat–Sun 8am–5pm',
};

export const touchPointsAppBusiness: User = {
  id: 'b-touchpoints',
  name: 'TouchPoint App',
  username: 'touchpointsapp',
  avatar: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q8uu2f99j9a02128r6gp2',
  accountType: 'business',
  bio: 'The official TouchPoint App account. Connecting communities with local businesses through rewards, referrals & trust.',
  followers: 12480,
  following: 0,
  points: 0,
  phone: '+1 (800) 555-TOUCH',
  email: 'hello@touchpointapp.com',
  website: 'www.touchpointapp.com',
  address: '1 TouchPoint Plaza, New York, NY 10001',
  category: 'Technology & Apps',
  hours: 'Available 24/7',
};

export const businessUsers: User[] = [
  {
    id: 'b2',
    name: 'Bloom & Petal',
    username: 'bloompetal',
    avatar: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200&h=200&fit=crop',
    accountType: 'business',
    bio: 'Handcrafted floral arrangements 🌸',
    followers: 1520,
    following: 34,
    points: 0,
    phone: '+1 (555) 234-8901',
    email: 'orders@bloompetal.com',
    website: 'www.bloompetal.com',
    address: '118 Garden Ave, Manhattan, NY 10012',
    category: 'Flowers & Gifts',
    hours: 'Mon–Sat 9am–6pm · Sun Closed',
  },
  {
    id: 'b3',
    name: 'FitZone Gym',
    username: 'fitzonegym',
    avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    accountType: 'business',
    bio: 'Your fitness journey starts here 💪',
    followers: 3200,
    following: 18,
    points: 0,
    phone: '+1 (555) 456-3200',
    email: 'info@fitzonegym.com',
    website: 'www.fitzonegym.com',
    address: '500 Muscle Blvd, Queens, NY 11375',
    category: 'Health & Fitness',
    hours: 'Mon–Fri 5am–11pm · Sat–Sun 7am–9pm',
  },
  {
    id: 'b4',
    name: 'Artisan Bakery',
    username: 'artisanbakes',
    avatar: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
    accountType: 'business',
    bio: 'Fresh baked goods daily 🍞',
    followers: 980,
    following: 22,
    points: 0,
    phone: '+1 (555) 789-0980',
    email: 'hello@artisanbakery.com',
    website: 'www.artisanbakery.com',
    address: '77 Flour St, Williamsburg, NY 11249',
    category: 'Bakery & Cafe',
    hours: 'Tue–Sun 6am–4pm · Mon Closed',
  },
];

export const personalUsers: User[] = [
  {
    id: 'u2',
    name: 'Maya Chen',
    username: 'mayachen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    accountType: 'personal',
    bio: 'Foodie & adventure seeker',
    followers: 521,
    following: 203,
    points: 890,
    isOnline: true,
  },
  {
    id: 'u3',
    name: 'James Park',
    username: 'jamespark',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    accountType: 'personal',
    bio: 'Tech enthusiast & coffee lover',
    followers: 178,
    following: 95,
    points: 620,
    isOnline: true,
  },
  {
    id: 'u4',
    name: 'Sofia Martinez',
    username: 'sofiamtz',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    accountType: 'personal',
    bio: 'Plant mom & yoga lover 🧘‍♀️',
    followers: 412,
    following: 167,
    points: 1100,
    isOnline: false,
  },
  {
    id: 'u5',
    name: 'Liam O\'Brien',
    username: 'liamob',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    accountType: 'personal',
    bio: 'Music producer & vinyl collector 🎵',
    followers: 290,
    following: 145,
    points: 750,
    isOnline: false,
  },
];

export interface TrustedFriend {
  id: string;
  user: User;
  acceptedAt: string;
  mutualFriends: number;
}

export const mockTrustedFriends: TrustedFriend[] = [
  {
    id: 'tf1',
    user: personalUsers[0],
    acceptedAt: '2025-09-15',
    mutualFriends: 12,
  },
  {
    id: 'tf2',
    user: personalUsers[1],
    acceptedAt: '2025-11-02',
    mutualFriends: 8,
  },
  {
    id: 'tf3',
    user: personalUsers[2],
    acceptedAt: '2025-06-20',
    mutualFriends: 5,
  },
  {
    id: 'tf4',
    user: personalUsers[3],
    acceptedAt: '2026-01-10',
    mutualFriends: 3,
  },
  {
    id: 'tf5',
    user: {
      id: 'u6',
      name: 'Priya Sharma',
      username: 'priyasharma',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
      accountType: 'personal',
      bio: 'Travel blogger & photographer',
      followers: 680,
      following: 210,
      points: 920,
      isOnline: true,
    },
    acceptedAt: '2025-12-05',
    mutualFriends: 7,
  },
  {
    id: 'tf6',
    user: {
      id: 'u7',
      name: 'Daniel Kim',
      username: 'danielkim',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
      accountType: 'personal',
      bio: 'Graphic designer & sneakerhead',
      followers: 445,
      following: 190,
      points: 1050,
      isOnline: false,
    },
    acceptedAt: '2025-08-22',
    mutualFriends: 14,
  },
  {
    id: 'tf7',
    user: {
      id: 'u8',
      name: 'Emma Wilson',
      username: 'emmawilson',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      accountType: 'personal',
      bio: 'Dog mom & brunch enthusiast',
      followers: 312,
      following: 178,
      points: 670,
      isOnline: true,
    },
    acceptedAt: '2026-02-01',
    mutualFriends: 9,
  },
];

export type ConnectionDegree = 1 | 2 | 3;

export interface TrustedFriendBizComMember {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  username: string;
  memberSince: string;
  trustLevel: 'close' | 'friend' | 'acquaintance';
  degree: ConnectionDegree;
  connectedVia?: string;
  connectedViaName?: string;
  connectedViaAvatar?: string;
}

export interface BusinessTrustedConnections {
  businessId: string;
  trustedFriendsWhoAreMember: TrustedFriendBizComMember[];
  totalCommunityMembers: number;
  trustScore: number;
}

export const businessTrustedConnections: BusinessTrustedConnections[] = [
  {
    businessId: 'b1',
    trustedFriendsWhoAreMember: [
      { id: 'tfc1', userId: 'u2', name: 'Maya Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', username: 'mayachen', memberSince: '2025-07-10', trustLevel: 'close', degree: 1 },
      { id: 'tfc2', userId: 'u3', name: 'James Park', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', username: 'jamespark', memberSince: '2025-09-22', trustLevel: 'friend', degree: 1 },
      { id: 'tfc3', userId: 'u6', name: 'Priya Sharma', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop', username: 'priyasharma', memberSince: '2025-12-15', trustLevel: 'close', degree: 1 },
      { id: 'tfc4', userId: 'u7', name: 'Daniel Kim', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop', username: 'danielkim', memberSince: '2026-01-05', trustLevel: 'friend', degree: 1 },
      { id: 'tfc5', userId: 'u8', name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', username: 'emmawilson', memberSince: '2026-02-10', trustLevel: 'acquaintance', degree: 1 },
      { id: 'tfc12', userId: 'u20', name: 'Rachel Adams', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=200&fit=crop', username: 'racheladams', memberSince: '2025-10-05', trustLevel: 'friend', degree: 2, connectedVia: 'u2', connectedViaName: 'Maya Chen', connectedViaAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
      { id: 'tfc13', userId: 'u21', name: 'Tom Bradley', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', username: 'tombradley', memberSince: '2025-11-18', trustLevel: 'acquaintance', degree: 2, connectedVia: 'u3', connectedViaName: 'James Park', connectedViaAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
      { id: 'tfc14', userId: 'u22', name: 'Nina Patel', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop', username: 'ninapatel', memberSince: '2025-12-01', trustLevel: 'friend', degree: 2, connectedVia: 'u6', connectedViaName: 'Priya Sharma', connectedViaAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop' },
      { id: 'tfc15', userId: 'u23', name: 'Oscar Reyes', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop', username: 'oscarreyes', memberSince: '2026-01-12', trustLevel: 'acquaintance', degree: 2, connectedVia: 'u7', connectedViaName: 'Daniel Kim', connectedViaAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
      { id: 'tfc16', userId: 'u24', name: 'Aisha Mohammed', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop', username: 'aisham', memberSince: '2026-01-25', trustLevel: 'acquaintance', degree: 3, connectedVia: 'u20', connectedViaName: 'Rachel Adams', connectedViaAvatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=200&fit=crop' },
      { id: 'tfc17', userId: 'u25', name: 'Chris Tanaka', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop', username: 'christanaka', memberSince: '2026-02-02', trustLevel: 'acquaintance', degree: 3, connectedVia: 'u21', connectedViaName: 'Tom Bradley', connectedViaAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
      { id: 'tfc18', userId: 'u26', name: 'Freya Johansen', avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop', username: 'freyaj', memberSince: '2026-02-15', trustLevel: 'acquaintance', degree: 3, connectedVia: 'u22', connectedViaName: 'Nina Patel', connectedViaAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop' },
    ],
    totalCommunityMembers: 2847,
    trustScore: 82,
  },
  {
    businessId: 'b2',
    trustedFriendsWhoAreMember: [
      { id: 'tfc6', userId: 'u4', name: 'Sofia Martinez', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', username: 'sofiamtz', memberSince: '2025-08-01', trustLevel: 'close', degree: 1 },
      { id: 'tfc7', userId: 'u3', name: 'James Park', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', username: 'jamespark', memberSince: '2025-10-14', trustLevel: 'acquaintance', degree: 1 },
      { id: 'tfc19', userId: 'u27', name: 'Leo Fernandez', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop', username: 'leofernandez', memberSince: '2025-12-20', trustLevel: 'friend', degree: 2, connectedVia: 'u4', connectedViaName: 'Sofia Martinez', connectedViaAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop' },
      { id: 'tfc20', userId: 'u28', name: 'Hannah Brooks', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop', username: 'hannahb', memberSince: '2026-01-08', trustLevel: 'acquaintance', degree: 3, connectedVia: 'u27', connectedViaName: 'Leo Fernandez', connectedViaAvatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop' },
    ],
    totalCommunityMembers: 1520,
    trustScore: 45,
  },
  {
    businessId: 'b3',
    trustedFriendsWhoAreMember: [
      { id: 'tfc8', userId: 'u2', name: 'Maya Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', username: 'mayachen', memberSince: '2025-06-20', trustLevel: 'close', degree: 1 },
      { id: 'tfc9', userId: 'u5', name: "Liam O'Brien", avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', username: 'liamob', memberSince: '2025-11-01', trustLevel: 'friend', degree: 1 },
      { id: 'tfc10', userId: 'u8', name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', username: 'emmawilson', memberSince: '2026-01-20', trustLevel: 'friend', degree: 1 },
      { id: 'tfc21', userId: 'u29', name: 'Marcus Cole', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', username: 'marcuscole', memberSince: '2025-12-10', trustLevel: 'friend', degree: 2, connectedVia: 'u5', connectedViaName: "Liam O'Brien", connectedViaAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop' },
      { id: 'tfc22', userId: 'u30', name: 'Zara Hussain', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop', username: 'zarah', memberSince: '2026-02-01', trustLevel: 'acquaintance', degree: 2, connectedVia: 'u8', connectedViaName: 'Emma Wilson', connectedViaAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
    ],
    totalCommunityMembers: 3200,
    trustScore: 61,
  },
  {
    businessId: 'b4',
    trustedFriendsWhoAreMember: [
      { id: 'tfc11', userId: 'u6', name: 'Priya Sharma', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop', username: 'priyasharma', memberSince: '2025-11-28', trustLevel: 'close', degree: 1 },
      { id: 'tfc23', userId: 'u31', name: 'Ethan Wright', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop', username: 'ethanw', memberSince: '2026-01-15', trustLevel: 'friend', degree: 2, connectedVia: 'u6', connectedViaName: 'Priya Sharma', connectedViaAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop' },
      { id: 'tfc24', userId: 'u32', name: 'Lily Chang', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=200&fit=crop', username: 'lilychang', memberSince: '2026-02-08', trustLevel: 'acquaintance', degree: 3, connectedVia: 'u31', connectedViaName: 'Ethan Wright', connectedViaAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop' },
    ],
    totalCommunityMembers: 980,
    trustScore: 28,
  },
];

export const touchPointsPinnedPost: Post = {
  id: 'tp-pinned-1',
  author: touchPointsAppBusiness,
  content: '👋 Welcome to TouchPoint! We connect you with the best local businesses in your area. Earn points, unlock rewards, refer friends & win prizes — all while supporting the businesses you love. Tap our profile to learn more about how it all works!',
  image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=400&fit=crop',
  likes: 1847,
  comments: 312,
  shares: 589,
  isLiked: true,
  createdAt: 'Pinned',
  type: 'announcement',
  isPinned: true,
  status: 'active',
};

export const posts: Post[] = [
  {
    id: 'p1',
    author: businessUsers[0],
    content: '🌷 Spring Collection is HERE! 20% off all bouquets this weekend. Tag a friend who deserves flowers! #BloomAndPetal #SpringVibes',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&h=400&fit=crop',
    likes: 234,
    comments: 42,
    shares: 18,
    isLiked: false,
    createdAt: '2h ago',
    type: 'promotion',
  },
  {
    id: 'p2',
    author: businessUsers[1],
    content: '💪 New Year, New You! Join our 30-day transformation challenge starting Monday. First 50 sign-ups get a FREE personal training session!',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop',
    likes: 567,
    comments: 89,
    shares: 45,
    isLiked: true,
    createdAt: '4h ago',
    type: 'promotion',
  },
  {
    id: 'p3',
    author: currentBusinessUser,
    content: '☕ Introducing our new Ethiopian single-origin roast! Rich, fruity notes with a silky finish. Available in-store and online now.',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=400&fit=crop',
    likes: 189,
    comments: 31,
    shares: 12,
    isLiked: false,
    createdAt: '6h ago',
    type: 'announcement',
  },
  {
    id: 'p4',
    author: businessUsers[2],
    content: '🍞 Weekend special: Buy 2 sourdough loaves, get a free pastry! Our bakers have been working since 4am to bring you the freshest bakes.',
    image: 'https://images.unsplash.com/photo-1549931319-a545753467c8?w=600&h=400&fit=crop',
    likes: 145,
    comments: 28,
    shares: 9,
    isLiked: false,
    createdAt: '8h ago',
    type: 'promotion',
  },
  {
    id: 'p5',
    author: businessUsers[0],
    content: '🎉 We just hit 1,500 followers! Thank you all for the love and support. Stay tuned for a special giveaway announcement tomorrow!',
    likes: 312,
    comments: 67,
    shares: 23,
    isLiked: true,
    createdAt: '1d ago',
    type: 'announcement',
  },
  {
    id: 'p6',
    author: businessUsers[0],
    content: '💐 Mother\'s Day pre-orders are now open! Surprise mom with a hand-tied bouquet crafted with love. Order by May 8th for guaranteed delivery.',
    image: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&h=400&fit=crop',
    likes: 198,
    comments: 35,
    shares: 22,
    isLiked: false,
    createdAt: '2d ago',
    type: 'promotion',
  },
  {
    id: 'p7',
    author: businessUsers[0],
    content: '🌿 Behind the scenes! Our florists are busy creating this week\'s centrepieces for a gorgeous wedding. Every stem placed with care.',
    image: 'https://images.unsplash.com/photo-1523694576729-dc99ef1b0632?w=600&h=400&fit=crop',
    likes: 276,
    comments: 41,
    shares: 14,
    isLiked: false,
    createdAt: '4d ago',
    type: 'general',
  },
  {
    id: 'p8',
    author: currentBusinessUser,
    content: '🎊 Big news! We\'re launching our new loyalty card — buy 9 coffees, get the 10th free. Pick one up in-store starting tomorrow!',
    likes: 321,
    comments: 54,
    shares: 30,
    isLiked: true,
    createdAt: '1d ago',
    type: 'announcement',
  },
  {
    id: 'p9',
    author: currentBusinessUser,
    content: '🌅 Nothing beats a sunrise espresso. Our doors open at 7am sharp — come start your morning right with us.',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop',
    likes: 154,
    comments: 19,
    shares: 8,
    isLiked: false,
    createdAt: '3d ago',
    type: 'general',
  },
  {
    id: 'p10',
    author: currentBusinessUser,
    content: '🏆 Proud to be voted "Best Local Coffee" in the Brooklyn Eats Awards for the second year running. Thank you for your support!',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop',
    likes: 487,
    comments: 72,
    shares: 55,
    isLiked: true,
    createdAt: '5d ago',
    type: 'announcement',
  },
  {
    id: 'p11',
    author: currentBusinessUser,
    content: '☕ Latte art Fridays are back! Our baristas are ready to pour your favourite designs. Drop by and tag us in your cup pics.',
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&h=400&fit=crop',
    likes: 203,
    comments: 38,
    shares: 11,
    isLiked: false,
    createdAt: '1w ago',
    type: 'promotion',
  },
  {
    id: 'p12',
    author: businessUsers[1],
    content: '🏋️ Member spotlight: Congrats to @mayachen for completing her 100th class this month! Your dedication is inspiring the whole community.',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop',
    likes: 412,
    comments: 63,
    shares: 19,
    isLiked: false,
    createdAt: '2d ago',
    type: 'general',
  },
  {
    id: 'p13',
    author: businessUsers[1],
    content: '🧘 New class alert! Yoga Flow is now on the schedule every Wednesday at 6pm. All levels welcome — mats provided.',
    likes: 189,
    comments: 27,
    shares: 15,
    isLiked: false,
    createdAt: '5d ago',
    type: 'announcement',
  },
  {
    id: 'p14',
    author: businessUsers[1],
    content: '💥 Summer body starts NOW. Our personal trainers are offering free assessments all week. Book yours at the front desk!',
    image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=400&fit=crop',
    likes: 334,
    comments: 48,
    shares: 26,
    isLiked: true,
    createdAt: '1w ago',
    type: 'promotion',
  },
  {
    id: 'p15',
    author: businessUsers[2],
    content: '🥐 Croissant of the month: Pistachio & White Chocolate. Flaky, buttery, and absolutely divine. Available while supplies last!',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600&h=400&fit=crop',
    likes: 223,
    comments: 39,
    shares: 17,
    isLiked: false,
    createdAt: '2d ago',
    type: 'promotion',
  },
  {
    id: 'p16',
    author: businessUsers[2],
    content: '🎂 Custom cake orders are now open for February! Birthdays, anniversaries, or just because — we\'ll bake it with love.',
    likes: 167,
    comments: 24,
    shares: 12,
    isLiked: false,
    createdAt: '4d ago',
    type: 'announcement',
  },
  {
    id: 'p17',
    author: businessUsers[2],
    content: '🌾 Meet our head baker, Marco! He\'s been perfecting his sourdough technique for over 15 years. Come taste the difference experience makes.',
    image: 'https://images.unsplash.com/photo-1556217477-d325251ece38?w=600&h=400&fit=crop',
    likes: 298,
    comments: 51,
    shares: 20,
    isLiked: true,
    createdAt: '1w ago',
    type: 'general',
  },
];

export const products: Product[] = [
  {
    id: 'prod1',
    seller: businessUsers[0],
    title: 'Spring Bouquet - Mixed Roses',
    description: 'Beautiful hand-arranged mixed rose bouquet with seasonal greens.',
    price: 45.99,
    image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=600&fit=crop',
    category: 'Flowers',
    rating: 4.8,
    reviews: 124,
  },
  {
    id: 'prod2',
    seller: currentBusinessUser,
    title: 'Ethiopian Single-Origin Beans',
    description: 'Premium single-origin coffee beans, medium roast, 12oz bag.',
    price: 18.99,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=600&fit=crop',
    category: 'Coffee',
    rating: 4.9,
    reviews: 89,
  },
  {
    id: 'prod3',
    seller: businessUsers[1],
    title: '3-Month Gym Membership',
    description: 'Full access to all facilities including group classes.',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&h=600&fit=crop',
    category: 'Fitness',
    rating: 4.6,
    reviews: 213,
  },
  {
    id: 'prod4',
    seller: businessUsers[2],
    title: 'Artisan Sourdough Loaf',
    description: 'Freshly baked sourdough bread, made with organic flour.',
    price: 8.99,
    image: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=600&h=600&fit=crop',
    category: 'Bakery',
    rating: 4.7,
    reviews: 56,
  },
  {
    id: 'prod5',
    seller: currentBusinessUser,
    title: 'Cold Brew Concentrate',
    description: '32oz cold brew concentrate. Makes up to 8 servings.',
    price: 14.99,
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=600&fit=crop',
    category: 'Coffee',
    rating: 4.8,
    reviews: 67,
  },
  {
    id: 'prod6',
    seller: businessUsers[0],
    title: 'Succulent Arrangement',
    description: 'Handcrafted succulent garden in decorative ceramic pot.',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&h=600&fit=crop',
    category: 'Plants',
    rating: 4.5,
    reviews: 42,
  },
];

// --- Marketplace members as User objects (for chat participant references) ---
export const marketplaceUserThomas: User = {
  id: 'mkt-u1',
  name: 'Thomas Müller',
  username: 'thomasmuller',
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  accountType: 'personal',
  bio: 'Exploring Berlin one coffee at a time ☕',
  followers: 620,
  following: 145,
  points: 3450,
  isOnline: true,
};

export const marketplaceUserSophie: User = {
  id: 'mkt-u2',
  name: 'Sophie Dubois',
  username: 'sophiedubois',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  accountType: 'personal',
  bio: 'French pastry enthusiast & food blogger 🥐',
  followers: 480,
  following: 210,
  points: 1280,
  isOnline: true,
};

export const marketplaceUserLuca: User = {
  id: 'mkt-u3',
  name: 'Luca Bianchi',
  username: 'lucabianchi',
  avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
  accountType: 'personal',
  bio: 'Milan local & proud platinum member 🌟',
  followers: 890,
  following: 178,
  points: 8920,
  isOnline: false,
};

export const marketplaceUserEmma: User = {
  id: 'mkt-u4',
  name: 'Emma Johansson',
  username: 'emmajohansson',
  avatar: 'https://randomuser.me/api/portraits/women/21.jpg',
  accountType: 'personal',
  bio: 'Stockholm explorer & loyalty rewards fan 🌸',
  followers: 510,
  following: 132,
  points: 4100,
  isOnline: true,
};

export const marketplaceUserOliver: User = {
  id: 'mkt-u5',
  name: 'Oliver Bennett',
  username: 'oliverbennett',
  avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
  accountType: 'personal',
  bio: 'London foodie discovering hidden gems 🍞',
  followers: 320,
  following: 98,
  points: 650,
  isOnline: false,
};

export const marketplaceUserIsabelle: User = {
  id: 'mkt-u6',
  name: 'Isabelle Laurent',
  username: 'isabellelaurent',
  avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
  accountType: 'personal',
  bio: 'Lyon local & gastronomy lover 🧀',
  followers: 415,
  following: 160,
  points: 2100,
  isOnline: true,
};

export const conversations: Conversation[] = [
  {
    id: 'c1',
    participant: personalUsers[0],
    lastMessage: 'Have you tried that new coffee place? ☕',
    lastMessageTime: '2m ago',
    unreadCount: 2,
  },
  {
    id: 'c2',
    participant: personalUsers[1],
    lastMessage: 'Let\'s check out the gym promo together!',
    lastMessageTime: '15m ago',
    unreadCount: 0,
  },
  {
    id: 'c3',
    participant: personalUsers[2],
    lastMessage: 'Thanks for the referral! 🎉',
    lastMessageTime: '1h ago',
    unreadCount: 1,
  },
  {
    id: 'c4',
    participant: personalUsers[3],
    lastMessage: 'Check out this bakery I found',
    lastMessageTime: '3h ago',
    unreadCount: 0,
  },
  {
    id: 'pm-1',
    participant: personalUsers[0],
    lastMessage: '🎬 TouchPoint Welcome Tour video',
    lastMessageTime: 'Just now',
    unreadCount: 0,
  },
  {
    id: 'pm-2',
    participant: personalUsers[1],
    lastMessage: 'Let\'s check out the gym promo together!',
    lastMessageTime: '15m ago',
    unreadCount: 0,
  },
  {
    id: 'pm-3',
    participant: personalUsers[2],
    lastMessage: 'Are you free this weekend?',
    lastMessageTime: '1h ago',
    unreadCount: 1,
  },
  {
    id: 'pm-4',
    participant: personalUsers[3],
    lastMessage: 'Check out this bakery I found',
    lastMessageTime: '3h ago',
    unreadCount: 0,
  },
  {
    id: 'bz-1',
    participant: personalUsers[0],
    lastMessage: 'Requested to join Coffee Lovers Guild',
    lastMessageTime: '5m ago',
    unreadCount: 1,
  },
  {
    id: 'bz-2',
    participant: personalUsers[3],
    lastMessage: 'Requested to join Local Foodies',
    lastMessageTime: '30m ago',
    unreadCount: 1,
  },
  {
    id: 'bz-3',
    participant: personalUsers[2],
    lastMessage: 'Requested to join Wellness Circle',
    lastMessageTime: '2h ago',
    unreadCount: 0,
  },
  {
    id: 'ref-1',
    participant: personalUsers[2],
    lastMessage: 'Referred a new member to your business',
    lastMessageTime: '1h ago',
    unreadCount: 1,
  },
  {
    id: 'ref-2',
    participant: personalUsers[3],
    lastMessage: 'Your referral link was used by a new member',
    lastMessageTime: '4h ago',
    unreadCount: 1,
  },
  {
    id: 'ref-3',
    participant: personalUsers[0],
    lastMessage: 'Referral submission for approval',
    lastMessageTime: '1d ago',
    unreadCount: 0,
  },
  {
    id: 'sh-1',
    participant: personalUsers[1],
    lastMessage: 'Shared your post about Ethiopian coffee',
    lastMessageTime: '10m ago',
    unreadCount: 1,
  },
  {
    id: 'sh-2',
    participant: personalUsers[0],
    lastMessage: 'Shared Bloom & Petal spring collection with you',
    lastMessageTime: '45m ago',
    unreadCount: 1,
  },
  {
    id: 'sh-3',
    participant: personalUsers[2],
    lastMessage: 'Shared FitZone 30-day challenge post',
    lastMessageTime: '3h ago',
    unreadCount: 0,
  },
  {
    id: 'sh-4',
    participant: personalUsers[3],
    lastMessage: 'Shared a product listing with you',
    lastMessageTime: '1d ago',
    unreadCount: 0,
  },
  {
    id: 'rr-1',
    participant: personalUsers[0],
    lastMessage: '⭐⭐⭐⭐⭐ Amazing coffee, best in Brooklyn!',
    lastMessageTime: '20m ago',
    unreadCount: 1,
  },
  {
    id: 'rr-2',
    participant: personalUsers[1],
    lastMessage: '⭐⭐⭐⭐ Great gym, could use more equipment',
    lastMessageTime: '2h ago',
    unreadCount: 0,
  },
  // --- Marketplace member conversations ---
  {
    id: 'mkt-1',
    participant: marketplaceUserThomas,
    lastMessage: 'Absolutely, I know a great spot near Mitte. How about this weekend? ☕',
    lastMessageTime: 'Mon 10:28 AM',
    unreadCount: 1,
  },
  {
    id: 'mkt-2',
    participant: marketplaceUserSophie,
    lastMessage: 'You must visit Dupont Patisserie near Le Marais. Their croissants are divine!',
    lastMessageTime: 'Sun 3:15 PM',
    unreadCount: 1,
  },
  {
    id: 'mkt-3',
    participant: marketplaceUserLuca,
    lastMessage: 'That sounds amazing! I might actually be in Italy around then. Keep me posted!',
    lastMessageTime: 'Fri 9:50 AM',
    unreadCount: 1,
  },
  {
    id: 'mkt-4',
    participant: marketplaceUserEmma,
    lastMessage: 'I earned 500 points just last week from their loyalty stamps. Let me know if you ever visit! 🌸',
    lastMessageTime: 'Thu 2:15 PM',
    unreadCount: 1,
  },
  {
    id: 'mkt-5',
    participant: marketplaceUserOliver,
    lastMessage: 'Will do! Already found a great sourdough spot thanks to the app 🍞',
    lastMessageTime: 'Wed 11:12 AM',
    unreadCount: 1,
  },
  {
    id: 'mkt-6',
    participant: marketplaceUserIsabelle,
    lastMessage: 'Try Café Comptoir Abel — they offer 2x points on Wednesdays! Best quenelles in town 😋',
    lastMessageTime: 'Tue 4:15 PM',
    unreadCount: 1,
  },
];

export const businessConversations: Conversation[] = [
  {
    id: 'bc-msg-1',
    participant: personalUsers[0],
    lastMessage: 'Hi! I saw your promotion for the Ethiopian blend. Is it still available?',
    lastMessageTime: '5m ago',
    unreadCount: 1,
  },
  {
    id: 'bc-msg-2',
    participant: personalUsers[1],
    lastMessage: 'Thanks for the loyalty points! Will visit again soon.',
    lastMessageTime: '25m ago',
    unreadCount: 0,
  },
  {
    id: 'bc-msg-3',
    participant: personalUsers[2],
    lastMessage: 'Do you offer catering services for events?',
    lastMessageTime: '1h ago',
    unreadCount: 2,
  },
  {
    id: 'bc-msg-4',
    participant: personalUsers[3],
    lastMessage: 'The cold brew was amazing! Can I place a bulk order?',
    lastMessageTime: '2h ago',
    unreadCount: 0,
  },
];

export const businessChatMessages: Record<string, Message[]> = {
  'bc-msg-1': [
    { id: 'bm1', senderId: 'u2', text: 'Hi there! I love your coffee shop.', timestamp: '10:00 AM', read: true },
    { id: 'bm2', senderId: 'b1', text: 'Thank you so much! We appreciate your support. How can we help you today?', timestamp: '10:05 AM', read: true },
    { id: 'bm3', senderId: 'u2', text: 'I saw your promotion for the Ethiopian blend. Is it still available?', timestamp: '10:08 AM', read: false },
  ],
  'bc-msg-2': [
    { id: 'bm4', senderId: 'b1', text: 'Hi James! You\'ve earned 50 loyalty points from your last visit. Keep it up!', timestamp: '9:00 AM', read: true },
    { id: 'bm5', senderId: 'u3', text: 'That\'s awesome! How many more until I get a free coffee?', timestamp: '9:15 AM', read: true },
    { id: 'bm6', senderId: 'b1', text: 'You\'re only 30 points away! One more visit should do it.', timestamp: '9:20 AM', read: true },
    { id: 'bm7', senderId: 'u3', text: 'Thanks for the loyalty points! Will visit again soon.', timestamp: '9:25 AM', read: true },
  ],
  'bc-msg-3': [
    { id: 'bm8', senderId: 'u4', text: 'Hello! I\'m planning a corporate event next month.', timestamp: '8:00 AM', read: true },
    { id: 'bm9', senderId: 'u4', text: 'Do you offer catering services for events?', timestamp: '8:01 AM', read: false },
  ],
  'bc-msg-4': [
    { id: 'bm10', senderId: 'u5', text: 'Just wanted to say the cold brew was amazing!', timestamp: 'Yesterday', read: true },
    { id: 'bm11', senderId: 'b1', text: 'So glad you enjoyed it! It\'s our most popular item this season.', timestamp: 'Yesterday', read: true },
    { id: 'bm12', senderId: 'u5', text: 'The cold brew was amazing! Can I place a bulk order?', timestamp: 'Yesterday', read: true },
  ],
};

export const chatMessages: Record<string, Message[]> = {
  c1: [
    { id: 'm1', senderId: 'u2', text: 'Hey! How are you?', timestamp: '10:30 AM', read: true },
    { id: 'm2', senderId: 'u1', text: 'Good! Just grabbed coffee from Rivera\'s', timestamp: '10:32 AM', read: true },
    { id: 'm3', senderId: 'u2', text: 'Oh nice! I love their new Ethiopian blend', timestamp: '10:33 AM', read: true },
    { id: 'm4', senderId: 'u1', text: 'Same! You should try their cold brew too', timestamp: '10:35 AM', read: true },
    { id: 'm5', senderId: 'u2', text: 'Have you tried that new coffee place? ☕', timestamp: '10:40 AM', read: false },
    { id: 'm6', senderId: 'u2', text: 'I heard they have amazing pastries too!', timestamp: '10:41 AM', read: false },
  ],
  c2: [
    { id: 'm7', senderId: 'u3', text: 'Did you see FitZone\'s new challenge?', timestamp: '9:00 AM', read: true },
    { id: 'm8', senderId: 'u1', text: 'Yes! 30-day transformation, sounds intense', timestamp: '9:05 AM', read: true },
    { id: 'm9', senderId: 'u3', text: 'Let\'s check out the gym promo together!', timestamp: '9:10 AM', read: true },
  ],
  c3: [
    { id: 'm10', senderId: 'u1', text: 'Hey Sofia! You should check out Bloom & Petal', timestamp: '8:00 AM', read: true },
    { id: 'm11', senderId: 'u4', text: 'Just signed up, their flowers are gorgeous!', timestamp: '8:30 AM', read: true },
    { id: 'm12', senderId: 'u4', text: 'Thanks for the referral! 🎉', timestamp: '8:31 AM', read: false },
  ],
  c4: [
    { id: 'm13', senderId: 'u5', text: 'Check out this bakery I found', timestamp: 'Yesterday', read: true },
  ],
  'pm-1': [
    { id: 'pm1-1', senderId: 'u2', text: 'Hey! What are you up to today?', timestamp: '9:00 AM', read: true },
    { id: 'pm1-2', senderId: 'u1', text: 'Not much, just exploring the neighbourhood', timestamp: '9:05 AM', read: true },
    { id: 'pm1-3', senderId: 'u2', text: 'There\'s a new coffee spot on Main St, heard it\'s great', timestamp: '9:10 AM', read: true },
    { id: 'pm1-4', senderId: 'u1', text: 'Oh really? I\'ve been looking for a new place!', timestamp: '9:12 AM', read: true },
    { id: 'pm1-5', senderId: 'u2', text: 'Have you tried that new coffee place? ☕', timestamp: '9:15 AM', read: true },
    { id: 'pm1-6', senderId: 'u2', text: 'They do pour-over and cold brew!', timestamp: '9:16 AM', read: true },
    {
      id: 'pm1-video-1',
      senderId: 'u0',
      text: '🎬 TouchPoint Welcome Tour',
      timestamp: 'Just now',
      read: false,
      type: 'video_presentation' as const,
      videoPresentation: {
        title: 'TouchPoint Welcome Tour',
        thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=1000&fit=crop',
        duration: '~40s',
        slides: [
          { id: 'vs-1', title: 'TouchPoint', subtitle: 'All Your Business All in One Place', backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=1000&fit=crop', accentColor: '#F59E0B' },
          { id: 'vs-2', title: 'Support Your Local Businesses', subtitle: 'Discover amazing businesses right in your neighbourhood', backgroundImage: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800&h=1000&fit=crop', accentColor: '#52B788' },
          { id: 'vs-3', title: 'Latest Updates & Promotions', subtitle: 'Stay in the loop with business news, deals & exclusive offers', backgroundImage: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&h=1000&fit=crop', accentColor: '#E94560' },
          { id: 'vs-4', title: 'Earn Points & Win Prizes', subtitle: 'Get rewarded for supporting the businesses you love most', backgroundImage: 'https://images.unsplash.com/photo-1553729459-afe8f2e2ed08?w=800&h=1000&fit=crop', accentColor: '#FCD34D' },
          { id: 'vs-5', title: 'Share & Refer Others', subtitle: 'Engage with businesses by sharing and referring friends & family', backgroundImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=1000&fit=crop', accentColor: '#93C5FD' },
          { id: 'vs-6', title: 'Win Points & Prizes', subtitle: 'Climb reward tiers from Bronze to Diamond and unlock exclusive perks', backgroundImage: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&h=1000&fit=crop', accentColor: '#E8F5EE' },
          { id: 'vs-7', title: 'Start Now!', subtitle: 'Navigate to the BIZ page to begin your journey', backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=1000&fit=crop', accentColor: '#99F6E4' },
          { id: 'vs-8', title: 'Search for a Business', subtitle: 'Find businesses that matter to you using hyperlocal search', backgroundImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=1000&fit=crop', accentColor: '#60A5FA' },
          { id: 'vs-9', title: 'Review Business Details', subtitle: 'Explore community posts, promotions, products & more', backgroundImage: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&h=1000&fit=crop', accentColor: '#E8F5EE' },
          { id: 'vs-10', title: 'Join a BizCom', subtitle: 'Request to join business communities and connect with like-minded members', backgroundImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=1000&fit=crop', accentColor: '#F59E0B' },
        ],
      },
    },
  ],
  'pm-2': [
    { id: 'pm2-1', senderId: 'u3', text: 'Hey! Did you see FitZone\'s new promo?', timestamp: '8:30 AM', read: true },
    { id: 'pm2-2', senderId: 'u1', text: 'Yeah, 50% off first month right?', timestamp: '8:35 AM', read: true },
    { id: 'pm2-3', senderId: 'u3', text: 'Exactly! Let\'s check out the gym promo together!', timestamp: '8:40 AM', read: true },
    { id: 'pm2-4', senderId: 'u1', text: 'Sounds like a plan, when are you free?', timestamp: '8:42 AM', read: true },
  ],
  'pm-3': [
    { id: 'pm3-1', senderId: 'u1', text: 'Hi Sofia! Long time no chat', timestamp: '7:00 AM', read: true },
    { id: 'pm3-2', senderId: 'u4', text: 'I know right! How have you been?', timestamp: '7:15 AM', read: true },
    { id: 'pm3-3', senderId: 'u1', text: 'Great! Been discovering so many local businesses', timestamp: '7:20 AM', read: true },
    { id: 'pm3-4', senderId: 'u4', text: 'Are you free this weekend?', timestamp: '7:30 AM', read: false },
  ],
  'pm-4': [
    { id: 'pm4-1', senderId: 'u5', text: 'Dude you have to try Sweet Crumbs Bakery', timestamp: 'Yesterday', read: true },
    { id: 'pm4-2', senderId: 'u1', text: 'Where is it?', timestamp: 'Yesterday', read: true },
    { id: 'pm4-3', senderId: 'u5', text: 'Check out this bakery I found', timestamp: 'Yesterday', read: true },
    { id: 'pm4-4', senderId: 'u5', text: 'It\'s on 5th Ave, their croissants are insane 🥐', timestamp: 'Yesterday', read: true },
  ],
  'bz-1': [
    { id: 'bz1-1', senderId: 'u2', text: 'Hi! I\'d love to join the Coffee Lovers Guild', timestamp: '11:00 AM', read: true },
    { id: 'bz1-2', senderId: 'u1', text: 'Welcome! What made you interested in joining?', timestamp: '11:05 AM', read: true },
    { id: 'bz1-3', senderId: 'u2', text: 'I\'m a huge coffee enthusiast and want to connect with other coffee lovers in the area', timestamp: '11:08 AM', read: true },
    { id: 'bz1-4', senderId: 'u2', text: 'Requested to join Coffee Lovers Guild', timestamp: '11:10 AM', read: false },
  ],
  'bz-2': [
    { id: 'bz2-1', senderId: 'u5', text: 'Hey there! I saw the Local Foodies group and I\'m very interested', timestamp: '10:00 AM', read: true },
    { id: 'bz2-2', senderId: 'u5', text: 'I\'m always exploring new restaurants and food spots', timestamp: '10:02 AM', read: true },
    { id: 'bz2-3', senderId: 'u5', text: 'Requested to join Local Foodies', timestamp: '10:05 AM', read: false },
  ],
  'bz-3': [
    { id: 'bz3-1', senderId: 'u4', text: 'Hi! I practice yoga daily and would love to be part of Wellness Circle', timestamp: '9:00 AM', read: true },
    { id: 'bz3-2', senderId: 'u1', text: 'That\'s great! We\'d love to have you', timestamp: '9:10 AM', read: true },
    { id: 'bz3-3', senderId: 'u4', text: 'Requested to join Wellness Circle', timestamp: '9:15 AM', read: true },
  ],
  'ref-1': [
    { id: 'ref1-1', senderId: 'u4', text: 'Hey! I referred my friend Sarah to your business', timestamp: '10:30 AM', read: true },
    { id: 'ref1-2', senderId: 'u4', text: 'She\'s been looking for a good coffee place nearby', timestamp: '10:32 AM', read: true },
    { id: 'ref1-3', senderId: 'u1', text: 'That\'s awesome, thanks for the referral!', timestamp: '10:35 AM', read: true },
    { id: 'ref1-4', senderId: 'u4', text: 'Referred a new member to your business', timestamp: '10:40 AM', read: false },
  ],
  'ref-2': [
    { id: 'ref2-1', senderId: 'u5', text: 'Someone just used my referral link for your shop!', timestamp: '8:00 AM', read: true },
    { id: 'ref2-2', senderId: 'u1', text: 'Great news! We\'ll get them set up', timestamp: '8:10 AM', read: true },
    { id: 'ref2-3', senderId: 'u5', text: 'Your referral link was used by a new member', timestamp: '8:15 AM', read: false },
  ],
  'ref-3': [
    { id: 'ref3-1', senderId: 'u2', text: 'Hi! I submitted a referral for my colleague Mike', timestamp: 'Yesterday', read: true },
    { id: 'ref3-2', senderId: 'u1', text: 'Thanks Maya! We\'ll review it shortly', timestamp: 'Yesterday', read: true },
    { id: 'ref3-3', senderId: 'u2', text: 'Referral submission for approval', timestamp: 'Yesterday', read: true },
  ],
  'sh-1': [
    { id: 'sh1-1', senderId: 'u3', text: 'Just shared your Ethiopian coffee post with my followers!', timestamp: '11:30 AM', read: true },
    { id: 'sh1-2', senderId: 'u1', text: 'Thanks James! Really appreciate the support', timestamp: '11:35 AM', read: true },
    { id: 'sh1-3', senderId: 'u3', text: 'Shared your post about Ethiopian coffee', timestamp: '11:40 AM', read: false },
  ],
  'sh-2': [
    { id: 'sh2-1', senderId: 'u2', text: 'The spring collection from Bloom & Petal is gorgeous!', timestamp: '10:00 AM', read: true },
    { id: 'sh2-2', senderId: 'u2', text: 'I shared it on my feed, hope that helps!', timestamp: '10:02 AM', read: true },
    { id: 'sh2-3', senderId: 'u2', text: 'Shared Bloom & Petal spring collection with you', timestamp: '10:05 AM', read: false },
  ],
  'sh-3': [
    { id: 'sh3-1', senderId: 'u4', text: 'That 30-day challenge from FitZone looks amazing', timestamp: '8:00 AM', read: true },
    { id: 'sh3-2', senderId: 'u1', text: 'Right? I\'m thinking of signing up', timestamp: '8:10 AM', read: true },
    { id: 'sh3-3', senderId: 'u4', text: 'Shared FitZone 30-day challenge post', timestamp: '8:15 AM', read: true },
  ],
  'sh-4': [
    { id: 'sh4-1', senderId: 'u5', text: 'Found this cool product you might like', timestamp: 'Yesterday', read: true },
    { id: 'sh4-2', senderId: 'u1', text: 'Oh nice, let me take a look!', timestamp: 'Yesterday', read: true },
    { id: 'sh4-3', senderId: 'u5', text: 'Shared a product listing with you', timestamp: 'Yesterday', read: true },
  ],
  'rr-1': [
    { id: 'rr1-1', senderId: 'u2', text: 'Just visited Rivera Coffee again and had to leave a review!', timestamp: '11:00 AM', read: true },
    { id: 'rr1-2', senderId: 'u1', text: 'Thanks so much Maya! We love hearing from our customers', timestamp: '11:10 AM', read: true },
    { id: 'rr1-3', senderId: 'u2', text: '⭐⭐⭐⭐⭐ Amazing coffee, best in Brooklyn!', timestamp: '11:15 AM', read: false },
  ],
  'rr-2': [
    { id: 'rr2-1', senderId: 'u3', text: 'Went to FitZone yesterday, here\'s my honest review', timestamp: '9:00 AM', read: true },
    { id: 'rr2-2', senderId: 'u1', text: 'We appreciate the feedback James!', timestamp: '9:15 AM', read: true },
    { id: 'rr2-3', senderId: 'u3', text: '⭐⭐⭐⭐ Great gym, could use more equipment', timestamp: '9:20 AM', read: true },
  ],
  // --- Marketplace member chats ---
  'mkt-1': [
    { id: 'mkt1-1', senderId: 'u1', text: 'Hi Thomas! I saw you\'re a Gold Member — congrats!', timestamp: 'Mon 10:15 AM', read: true },
    { id: 'mkt1-2', senderId: 'mkt-u1', text: 'Danke! I\'ve been really active in the community lately', timestamp: 'Mon 10:18 AM', read: true },
    { id: 'mkt1-3', senderId: 'u1', text: 'That\'s great to hear! Have you checked out the new bakery offers in Berlin?', timestamp: 'Mon 10:20 AM', read: true },
    { id: 'mkt1-4', senderId: 'mkt-u1', text: 'Ja! I just redeemed a 20% off voucher at Müller Bakery actually 🥐', timestamp: 'Mon 10:22 AM', read: true },
    { id: 'mkt1-5', senderId: 'u1', text: 'Nice! Their sourdough is the best in town. Let me know if you want to grab coffee sometime!', timestamp: 'Mon 10:25 AM', read: true },
    { id: 'mkt1-6', senderId: 'mkt-u1', text: 'Absolutely, I know a great spot near Mitte. How about this weekend? ☕', timestamp: 'Mon 10:28 AM', read: false },
  ],
  'mkt-2': [
    { id: 'mkt2-1', senderId: 'mkt-u2', text: 'Bonjour! I noticed you\'re also into French pastry 🥖', timestamp: 'Sun 3:00 PM', read: true },
    { id: 'mkt2-2', senderId: 'u1', text: 'Yes! I visited Lefevre Fromagerie last week, their cheese selection is incredible', timestamp: 'Sun 3:05 PM', read: true },
    { id: 'mkt2-3', senderId: 'mkt-u2', text: 'Oh I love that place! Did you try their Brie de Meaux?', timestamp: 'Sun 3:08 PM', read: true },
    { id: 'mkt2-4', senderId: 'u1', text: 'Not yet, but it\'s on my list. Any other Paris recommendations?', timestamp: 'Sun 3:12 PM', read: true },
    { id: 'mkt2-5', senderId: 'mkt-u2', text: 'You must visit Dupont Patisserie near Le Marais. Their croissants are divine!', timestamp: 'Sun 3:15 PM', read: false },
  ],
  'mkt-3': [
    { id: 'mkt3-1', senderId: 'mkt-u3', text: 'Ciao! I saw you\'re a Platinum Member — impressive! 🌟', timestamp: 'Fri 9:30 AM', read: true },
    { id: 'mkt3-2', senderId: 'u1', text: 'Grazie Luca! It took a lot of referrals and community activity to get here', timestamp: 'Fri 9:35 AM', read: true },
    { id: 'mkt3-3', senderId: 'mkt-u3', text: 'I can imagine! I\'m working towards Platinum myself — any tips?', timestamp: 'Fri 9:38 AM', read: true },
    { id: 'mkt3-4', senderId: 'u1', text: 'Engage with businesses daily, write honest reviews, and refer friends. Consistency is key!', timestamp: 'Fri 9:40 AM', read: true },
    { id: 'mkt3-5', senderId: 'mkt-u3', text: 'Great advice! I\'ll start sharing more reviews. By the way, there\'s a great coffee festival in Milan next month 🇮🇹', timestamp: 'Fri 9:45 AM', read: true },
    { id: 'mkt3-6', senderId: 'u1', text: 'That sounds amazing! I might actually be in Italy around then. Keep me posted!', timestamp: 'Fri 9:50 AM', read: false },
  ],
  'mkt-4': [
    { id: 'mkt4-1', senderId: 'mkt-u4', text: 'Hi! Is the summer loyalty offer still active for members?', timestamp: '9:30 AM', read: true },
    { id: 'mkt4-2', senderId: 'u1', text: 'Yes! The 15% off applies to all purchases over £20 for subscribed members.', timestamp: '9:32 AM', read: true, ticks: '✓✓' },
    { id: 'mkt4-3', senderId: 'mkt-u4', text: 'Great! Does it apply to the new arrivals section too?', timestamp: '9:33 AM', read: true },
    { id: 'mkt4-4', senderId: 'u1', text: 'Absolutely — new arrivals are included. Come visit us before noon for the best selection!', timestamp: '9:35 AM', read: true, ticks: '✓✓' },
  ],
  'mkt-5': [
    { id: 'mkt5-1', senderId: 'mkt-u5', text: 'Hi! Just joined the platform and already loving it!', timestamp: 'Wed 11:00 AM', read: true },
    { id: 'mkt5-2', senderId: 'u1', text: 'Welcome Oliver! Glad to have you in the community. What type of businesses are you into?', timestamp: 'Wed 11:05 AM', read: true },
    { id: 'mkt5-3', senderId: 'mkt-u5', text: 'Mostly food markets and independent bakeries around London. I\'m a bit of a foodie!', timestamp: 'Wed 11:08 AM', read: true },
    { id: 'mkt5-4', senderId: 'u1', text: 'Perfect! Check out Hoffmann Deli — they have an exclusive loyalty offer for subscribers', timestamp: 'Wed 11:10 AM', read: true },
    { id: 'mkt5-5', senderId: 'mkt-u5', text: 'Will do! Already found a great sourdough spot thanks to the app 🍞', timestamp: 'Wed 11:12 AM', read: false },
  ],
  'mkt-6': [
    { id: 'mkt6-1', senderId: 'mkt-u6', text: 'Salut! I see you appreciate French bakeries too 🥖', timestamp: 'Tue 4:00 PM', read: true },
    { id: 'mkt6-2', senderId: 'u1', text: 'Absolutely! I\'ve been exploring Lyon\'s food scene through the app. So many hidden gems!', timestamp: 'Tue 4:05 PM', read: true },
    { id: 'mkt6-3', senderId: 'mkt-u6', text: 'Lyon is the gastronomic capital of France after all! Have you been to any of our bouchons?', timestamp: 'Tue 4:08 PM', read: true },
    { id: 'mkt6-4', senderId: 'u1', text: 'Not yet, but I\'ve bookmarked a few on TouchPoint. Any personal recommendations?', timestamp: 'Tue 4:12 PM', read: true },
    { id: 'mkt6-5', senderId: 'mkt-u6', text: 'Try Café Comptoir Abel — they offer 2x points on Wednesdays! Best quenelles in town 😋', timestamp: 'Tue 4:15 PM', read: false },
  ],
};

export const rewardRules: RewardRule[] = [
  { id: 'r2', action: 'Share a post', points: 15, description: 'Spread the word and earn more points', icon: 'Share2' },
  { id: 'r3', action: 'Rate and review', points: 10, description: 'Rate and review for extra points', icon: 'Star' },
  { id: 'r4', action: 'Refer a friend', points: 50, description: 'Invite friends to join and earn big', icon: 'UserPlus' },
  { id: 'r5', action: 'Welcome', points: 25, description: 'New BizCom member', icon: 'Gift' },
];

export const referrals: Referral[] = [
  {
    id: 'ref1',
    referredUser: personalUsers[2],
    status: 'rewarded',
    pointsEarned: 50,
    date: 'Jan 15',
  },
  {
    id: 'ref2',
    referredUser: personalUsers[3],
    status: 'joined',
    pointsEarned: 50,
    date: 'Jan 28',
  },
  {
    id: 'ref3',
    referredUser: { ...personalUsers[0], name: 'Pending User', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
    status: 'pending',
    pointsEarned: 0,
    date: 'Feb 2',
  },
];

export const bizComs: BizCom[] = [
  {
    id: 'bc1',
    name: 'Coffee Lovers Guild',
    avatar: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    members: 1240,
    category: 'Food & Drink',
    description: 'A community for artisan coffee enthusiasts',
    ownerId: 'b1',
  },
  {
    id: 'bc2',
    name: 'Local Foodies',
    avatar: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop',
    members: 3580,
    category: 'Food & Drink',
    description: 'Discover and share the best local eats',
    ownerId: 'b1',
  },
  {
    id: 'bc3',
    name: 'Wellness Circle',
    avatar: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop',
    members: 890,
    category: 'Health & Fitness',
    description: 'Mind, body & spirit wellness community',
    ownerId: 'b3',
  },
  {
    id: 'bc4',
    name: 'Small Biz Network',
    avatar: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=200&h=200&fit=crop',
    members: 2150,
    category: 'Business',
    description: 'Supporting local entrepreneurs',
    ownerId: 'b1',
  },
  {
    id: 'bc5',
    name: 'Plant Parents',
    avatar: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop',
    members: 760,
    category: 'Lifestyle',
    description: 'Green thumbs unite!',
    ownerId: 'b2',
  },
  {
    id: 'bc6',
    name: 'Artisan Makers',
    avatar: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=200&h=200&fit=crop',
    members: 1430,
    category: 'Creative',
    description: 'Handmade crafts & artisan goods',
    ownerId: 'b2',
  },
];

export const categories = ['All', 'Coffee', 'Flowers', 'Fitness', 'Bakery', 'Plants'];

export interface PhoneContact {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  isOnApp?: boolean;
  linkedUserId?: string;
  lastSeen?: string;
  status?: string;
}

export const phoneContacts: PhoneContact[] = [
  { id: 'pc1', name: 'David Kim', phone: '+1 (555) 234-5678', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u6', lastSeen: 'Online', status: 'Hey there! I am using TouchPoint' },
  { id: 'pc2', name: 'Rachel Green', phone: '+1 (555) 345-6789', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u7', lastSeen: 'Today at 2:30 PM', status: 'Supporting local businesses' },
  { id: 'pc3', name: 'Tom Harris', phone: '+1 (555) 456-7890', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc4', name: 'Nina Patel', phone: '+1 (555) 567-8901', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u8', lastSeen: 'Yesterday', status: 'Exploring my community' },
  { id: 'pc5', name: 'Chris Evans', phone: '+1 (555) 678-9012', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc6', name: 'Ava Thompson', phone: '+1 (555) 789-0123', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc7', name: 'Marcus Lee', phone: '+1 (555) 890-1234', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u9', lastSeen: '2 days ago', status: 'Coffee enthusiast' },
  { id: 'pc8', name: 'Zara Ali', phone: '+1 (555) 901-2345', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc9', name: 'Ethan Brooks', phone: '+1 (555) 012-3456', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc10', name: 'Lily Wang', phone: '+1 (555) 123-4567', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u10', lastSeen: 'Online', status: 'Love finding local gems!' },
  { id: 'pc11', name: 'Omar Hassan', phone: '+1 (555) 234-5679', avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc12', name: 'Priya Sharma', phone: '+1 (555) 345-6780', avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc13', name: 'Daniel Nguyen', phone: '+1 (555) 456-7891', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u11', lastSeen: 'Online', status: 'Fitness junkie & foodie' },
  { id: 'pc14', name: 'Emma Wilson', phone: '+1 (555) 567-8902', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc15', name: 'Jake Robertson', phone: '+1 (555) 678-9013', avatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc16', name: 'Samantha Cole', phone: '+1 (555) 789-0134', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u12', lastSeen: 'Today at 9:15 AM', status: 'Plant mom & coffee addict' },
  { id: 'pc17', name: 'Ben Taylor', phone: '+1 (555) 890-1245', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc18', name: 'Chloe Adams', phone: '+1 (555) 901-2356', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc19', name: 'Ryan Mitchell', phone: '+1 (555) 012-3467', avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u13', lastSeen: '3 hours ago', status: 'Discovering hidden gems' },
  { id: 'pc20', name: 'Hannah Lopez', phone: '+1 (555) 123-4578', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc21', name: 'Alex Fernandez', phone: '+1 (555) 234-5680', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc22', name: 'Mia Johnson', phone: '+1 (555) 345-6791', avatar: 'https://images.unsplash.com/photo-1546961342-ea5f71b193f3?w=200&h=200&fit=crop', isOnApp: true, linkedUserId: 'u14', lastSeen: 'Yesterday', status: 'Bakery lover & weekend explorer' },
  { id: 'pc23', name: 'Tyler Ross', phone: '+1 (555) 456-7802', avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=200&h=200&fit=crop', isOnApp: false },
  { id: 'pc24', name: 'Grace Chen', phone: '+1 (555) 567-8913', avatar: 'https://images.unsplash.com/photo-1502767089025-6572583495f9?w=200&h=200&fit=crop', isOnApp: false },
];

export type InvitationStatus = 'sent' | 'delivered' | 'opened' | 'joined' | 'expired';

export interface SentInvitation {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string;
  bizComId: string;
  bizComName: string;
  message: string;
  status: InvitationStatus;
  sentAt: string;
  respondedAt?: string;
}

export const sentInvitations: SentInvitation[] = [
  {
    id: 'inv1',
    contactId: 'pc3',
    contactName: 'Tom Harris',
    contactPhone: '+1 (555) 456-7890',
    contactAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'joined',
    sentAt: '2026-01-28T10:30:00Z',
    respondedAt: '2026-01-29T14:15:00Z',
  },
  {
    id: 'inv2',
    contactId: 'pc5',
    contactName: 'Chris Evans',
    contactPhone: '+1 (555) 678-9012',
    contactAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop',
    bizComId: 'bc2',
    bizComName: 'Local Foodies',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'delivered',
    sentAt: '2026-02-05T09:00:00Z',
  },
  {
    id: 'inv3',
    contactId: 'pc6',
    contactName: 'Ava Thompson',
    contactPhone: '+1 (555) 789-0123',
    contactAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'opened',
    sentAt: '2026-02-07T16:45:00Z',
  },
  {
    id: 'inv4',
    contactId: 'pc8',
    contactName: 'Zara Ali',
    contactPhone: '+1 (555) 901-2345',
    contactAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop',
    bizComId: 'bc4',
    bizComName: 'Small Biz Network',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'sent',
    sentAt: '2026-02-09T11:20:00Z',
  },
  {
    id: 'inv5',
    contactId: 'pc9',
    contactName: 'Ethan Brooks',
    contactPhone: '+1 (555) 012-3456',
    contactAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop',
    bizComId: 'bc2',
    bizComName: 'Local Foodies',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'expired',
    sentAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'inv6',
    contactId: 'pc11',
    contactName: 'Omar Hassan',
    contactPhone: '+1 (555) 234-5679',
    contactAvatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop',
    bizComId: 'bc3',
    bizComName: 'Wellness Circle',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'joined',
    sentAt: '2026-02-01T13:00:00Z',
    respondedAt: '2026-02-02T10:30:00Z',
  },
  {
    id: 'inv7',
    contactId: 'pc14',
    contactName: 'Emma Wilson',
    contactPhone: '+1 (555) 567-8902',
    contactAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'delivered',
    sentAt: '2026-02-10T08:30:00Z',
  },
  {
    id: 'inv8',
    contactId: 'pc15',
    contactName: 'Jake Robertson',
    contactPhone: '+1 (555) 678-9013',
    contactAvatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200&h=200&fit=crop',
    bizComId: 'bc5',
    bizComName: 'Plant Parents',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'sent',
    sentAt: '2026-02-10T15:00:00Z',
  },
  {
    id: 'inv9',
    contactId: 'pc17',
    contactName: 'Ben Taylor',
    contactPhone: '+1 (555) 890-1245',
    contactAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    bizComId: 'bc6',
    bizComName: 'Artisan Makers',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'opened',
    sentAt: '2026-02-08T12:00:00Z',
  },
  {
    id: 'inv10',
    contactId: 'pc12',
    contactName: 'Priya Sharma',
    contactPhone: '+1 (555) 345-6780',
    contactAvatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop',
    bizComId: 'bc2',
    bizComName: 'Local Foodies',
    message: 'Invitation to join my TouchPoint Business Community',
    status: 'joined',
    sentAt: '2026-01-20T09:45:00Z',
    respondedAt: '2026-01-22T17:00:00Z',
  },
];

export interface InvitationStats {
  totalSent: number;
  delivered: number;
  opened: number;
  joined: number;
  expired: number;
  conversionRate: number;
}

export const invitationStats: InvitationStats = {
  totalSent: 10,
  delivered: 2,
  opened: 2,
  joined: 3,
  expired: 1,
  conversionRate: 30,
};

export const invitationReferralCodes: InvitationReferralCode[] = [
  {
    id: 'irc1',
    code: 'TP-ARV-2026-001',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc3',
    contactName: 'Tom Harris',
    contactPhone: '+1 (555) 456-7890',
    contactAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    message: 'Invitation to join my TouchPoint Business Community',
    createdAt: '2026-01-28T10:30:00Z',
    status: 'joined',
    joinedUserId: 'u15',
    joinedUserName: 'Tom Harris',
    joinedUserAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    joinedAt: '2026-01-29T14:15:00Z',
    pointsAwarded: 50,
  },
  {
    id: 'irc2',
    code: 'TP-ARV-2026-002',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc5',
    contactName: 'Chris Evans',
    contactPhone: '+1 (555) 678-9012',
    contactAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop',
    bizComId: 'bc2',
    bizComName: 'Local Foodies',
    message: 'Invitation to join my TouchPoint Business Community',
    createdAt: '2026-02-05T09:00:00Z',
    status: 'clicked',
  },
  {
    id: 'irc3',
    code: 'TP-ARV-2026-003',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc6',
    contactName: 'Ava Thompson',
    contactPhone: '+1 (555) 789-0123',
    contactAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    message: 'Invitation to join my TouchPoint Business Community',
    createdAt: '2026-02-07T16:45:00Z',
    status: 'registered',
    joinedUserId: 'u16',
    joinedUserName: 'Ava Thompson',
    joinedUserAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
    joinedAt: '2026-02-08T09:30:00Z',
  },
  {
    id: 'irc4',
    code: 'TP-ARV-2026-004',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc8',
    contactName: 'Zara Ali',
    contactPhone: '+1 (555) 901-2345',
    contactAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop',
    bizComId: 'bc4',
    bizComName: 'Small Biz Network',
    message: 'Invitation to join my TouchPoint Business Community',
    createdAt: '2026-02-09T11:20:00Z',
    status: 'pending',
  },
  {
    id: 'irc5',
    code: 'TP-ARV-2026-005',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc11',
    contactName: 'Omar Hassan',
    contactPhone: '+1 (555) 234-5679',
    contactAvatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop',
    bizComId: 'bc3',
    bizComName: 'Wellness Circle',
    message: 'Invitation to join my TouchPoint Business Community',
    createdAt: '2026-02-01T13:00:00Z',
    status: 'joined',
    joinedUserId: 'u17',
    joinedUserName: 'Omar Hassan',
    joinedUserAvatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop',
    joinedAt: '2026-02-02T10:30:00Z',
    pointsAwarded: 50,
  },
  {
    id: 'irc6',
    code: 'TP-ARV-2026-006',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc12',
    contactName: 'Priya Sharma',
    contactPhone: '+1 (555) 345-6780',
    contactAvatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop',
    bizComId: 'bc2',
    bizComName: 'Local Foodies',
    message: 'Invitation to join my TouchPoint Business Community',
    createdAt: '2026-01-20T09:45:00Z',
    status: 'joined',
    joinedUserId: 'u18',
    joinedUserName: 'Priya Sharma',
    joinedUserAvatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop',
    joinedAt: '2026-01-22T17:00:00Z',
    pointsAwarded: 50,
  },
  {
    id: 'irc7',
    code: 'TP-ARV-2026-007',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc14',
    contactName: 'Emma Wilson',
    contactPhone: '+1 (555) 567-8902',
    contactAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    message: 'Invitation to join my TouchPoint Business Community',
    createdAt: '2026-02-10T08:30:00Z',
    status: 'pending',
  },
  {
    id: 'irc8',
    code: 'TP-ARV-2026-008',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc17',
    contactName: 'Ben Taylor',
    contactPhone: '+1 (555) 890-1245',
    contactAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    bizComId: 'bc6',
    bizComName: 'Artisan Makers',
    message: 'Invitation to join my TouchPoint Business Community',
    createdAt: '2026-02-08T12:00:00Z',
    status: 'clicked',
  },
];

export interface CreatedPromotion {
  id: string;
  name: string;
  avatar: string;
  members: number;
  category: string;
  description: string;
  ownerId: string;
  bizComType: string;
  uploadedImages: string[];
  createdAt: string;
  status: 'active' | 'paused' | 'ended';
  views: number;
  clicks: number;
}

export const mockCreatedPromotions: CreatedPromotion[] = [
  {
    id: 'promo_mock_1',
    name: 'Summer Espresso Special',
    avatar: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=600&fit=crop',
    members: 48,
    category: 'Coffee',
    description: 'Beat the heat with our iced espresso lineup — 25% off all cold drinks this month!',
    ownerId: 'b1',
    bizComType: 'primary',
    uploadedImages: [
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-10T09:00:00Z',
    status: 'active',
    views: 312,
    clicks: 87,
  },
  {
    id: 'promo_mock_2',
    name: 'Valentine Latte Art Event',
    avatar: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&h=600&fit=crop',
    members: 22,
    category: 'Coffee',
    description: 'Join us for a special Valentine\'s latte art workshop. Couples get a free pastry box!',
    ownerId: 'b1',
    bizComType: 'complimenting',
    uploadedImages: [
      'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-08T14:30:00Z',
    status: 'active',
    views: 189,
    clicks: 43,
  },
  {
    id: 'promo_mock_3',
    name: 'Loyalty Card Launch',
    avatar: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=600&fit=crop',
    members: 95,
    category: 'Coffee',
    description: 'Buy 9 coffees, get the 10th FREE. Pick up your loyalty card in-store today.',
    ownerId: 'b1',
    bizComType: 'primary',
    uploadedImages: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-05T11:00:00Z',
    status: 'active',
    views: 540,
    clicks: 156,
  },
  {
    id: 'promo_mock_4',
    name: 'Spring Bouquet Sale',
    avatar: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&h=600&fit=crop',
    members: 65,
    category: 'Flowers',
    description: '20% off all spring bouquets this weekend! Tag a friend who deserves flowers.',
    ownerId: 'b2',
    bizComType: 'primary',
    uploadedImages: [
      'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-09T08:00:00Z',
    status: 'active',
    views: 428,
    clicks: 112,
  },
  {
    id: 'promo_mock_5',
    name: 'Mother\'s Day Pre-Orders',
    avatar: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&h=600&fit=crop',
    members: 38,
    category: 'Flowers',
    description: 'Surprise mom with a hand-tied bouquet crafted with love. Order by May 8th for guaranteed delivery.',
    ownerId: 'b2',
    bizComType: 'complimenting',
    uploadedImages: [
      'https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-06T10:00:00Z',
    status: 'active',
    views: 215,
    clicks: 67,
  },
  {
    id: 'promo_mock_6',
    name: '30-Day Transformation Challenge',
    avatar: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=600&fit=crop',
    members: 120,
    category: 'Fitness',
    description: 'New Year, New You! First 50 sign-ups get a FREE personal training session!',
    ownerId: 'b3',
    bizComType: 'primary',
    uploadedImages: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-07T07:00:00Z',
    status: 'active',
    views: 892,
    clicks: 234,
  },
  {
    id: 'promo_mock_7',
    name: 'Free Fitness Assessment Week',
    avatar: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=600&fit=crop',
    members: 75,
    category: 'Fitness',
    description: 'Summer body starts NOW. Our personal trainers are offering free assessments all week.',
    ownerId: 'b3',
    bizComType: 'complimenting',
    uploadedImages: [
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-04T09:00:00Z',
    status: 'active',
    views: 567,
    clicks: 145,
  },
  {
    id: 'promo_mock_8',
    name: 'Weekend Sourdough Special',
    avatar: 'https://images.unsplash.com/photo-1549931319-a545753467c8?w=600&h=600&fit=crop',
    members: 42,
    category: 'Bakery',
    description: 'Buy 2 sourdough loaves, get a free pastry! Fresh from our ovens since 4am.',
    ownerId: 'b4',
    bizComType: 'primary',
    uploadedImages: [
      'https://images.unsplash.com/photo-1549931319-a545753467c8?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-08T06:00:00Z',
    status: 'active',
    views: 345,
    clicks: 98,
  },
  {
    id: 'promo_mock_9',
    name: 'Pistachio Croissant of the Month',
    avatar: 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600&h=600&fit=crop',
    members: 30,
    category: 'Bakery',
    description: 'Pistachio & White Chocolate croissant — flaky, buttery, and absolutely divine. Available while supplies last!',
    ownerId: 'b4',
    bizComType: 'complimenting',
    uploadedImages: [
      'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600&h=600&fit=crop',
    ],
    createdAt: '2026-02-03T07:30:00Z',
    status: 'active',
    views: 278,
    clicks: 82,
  },
];

export interface BusinessMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
  joinedAt: string;
  points: number;
  status: 'active' | 'inactive';
  lastVisit: string;
  totalPurchases: number;
  email?: string;
  phone?: string;
}

export const businessMembers: Record<string, BusinessMember[]> = {
  b1: [
    { id: 'bm1', name: 'Maya Chen', username: 'mayachen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', joinedAt: 'Jan 5, 2026', points: 890, status: 'active', lastVisit: '2 hours ago', totalPurchases: 24, email: 'maya@email.com', phone: '+1 (555) 111-2222' },
    { id: 'bm2', name: 'James Park', username: 'jamespark', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', joinedAt: 'Jan 12, 2026', points: 620, status: 'active', lastVisit: '1 day ago', totalPurchases: 18, email: 'james@email.com', phone: '+1 (555) 333-4444' },
    { id: 'bm3', name: 'Sofia Martinez', username: 'sofiamtz', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', joinedAt: 'Jan 20, 2026', points: 1100, status: 'active', lastVisit: '5 hours ago', totalPurchases: 31, email: 'sofia@email.com' },
    { id: 'bm4', name: 'Liam O\'Brien', username: 'liamob', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', joinedAt: 'Feb 1, 2026', points: 750, status: 'active', lastVisit: '3 days ago', totalPurchases: 12, phone: '+1 (555) 555-6666' },
    { id: 'bm5', name: 'David Kim', username: 'davidkim', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop', joinedAt: 'Feb 3, 2026', points: 340, status: 'active', lastVisit: '1 hour ago', totalPurchases: 8 },
    { id: 'bm6', name: 'Rachel Green', username: 'rachelg', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop', joinedAt: 'Feb 5, 2026', points: 210, status: 'inactive', lastVisit: '2 weeks ago', totalPurchases: 5 },
    { id: 'bm7', name: 'Tom Harris', username: 'tomharris', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', joinedAt: 'Feb 8, 2026', points: 150, status: 'active', lastVisit: '6 hours ago', totalPurchases: 3 },
  ],
  b2: [
    { id: 'bm8', name: 'Nina Patel', username: 'ninapatel', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', joinedAt: 'Jan 8, 2026', points: 560, status: 'active', lastVisit: '4 hours ago', totalPurchases: 15 },
    { id: 'bm9', name: 'Marcus Lee', username: 'marcuslee', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&h=200&fit=crop', joinedAt: 'Jan 18, 2026', points: 430, status: 'active', lastVisit: '1 day ago', totalPurchases: 11 },
    { id: 'bm10', name: 'Lily Wang', username: 'lilywang', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=200&fit=crop', joinedAt: 'Feb 2, 2026', points: 280, status: 'active', lastVisit: '3 hours ago', totalPurchases: 7 },
  ],
  b3: [
    { id: 'bm11', name: 'Omar Hassan', username: 'omarh', avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop', joinedAt: 'Jan 10, 2026', points: 920, status: 'active', lastVisit: '30 min ago', totalPurchases: 28 },
    { id: 'bm12', name: 'Daniel Nguyen', username: 'danieln', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop', joinedAt: 'Jan 22, 2026', points: 670, status: 'active', lastVisit: '2 hours ago', totalPurchases: 19 },
    { id: 'bm13', name: 'Samantha Cole', username: 'samcole', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', joinedAt: 'Feb 4, 2026', points: 380, status: 'active', lastVisit: '1 day ago', totalPurchases: 9 },
    { id: 'bm14', name: 'Ryan Mitchell', username: 'ryanm', avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&h=200&fit=crop', joinedAt: 'Feb 7, 2026', points: 190, status: 'inactive', lastVisit: '1 week ago', totalPurchases: 4 },
  ],
  b4: [
    { id: 'bm15', name: 'Mia Johnson', username: 'miaj', avatar: 'https://images.unsplash.com/photo-1546961342-ea5f71b193f3?w=200&h=200&fit=crop', joinedAt: 'Jan 15, 2026', points: 510, status: 'active', lastVisit: '5 hours ago', totalPurchases: 14 },
    { id: 'bm16', name: 'Hannah Lopez', username: 'hannahl', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', joinedAt: 'Jan 25, 2026', points: 320, status: 'active', lastVisit: '2 days ago', totalPurchases: 10 },
  ],
};

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'reward' | 'promo' | 'friend_request' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  avatar: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    type: 'like',
    title: 'Maya Chen',
    message: 'liked your post about local coffee shops.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    isRead: false,
    createdAt: '2 min ago',
  },
  {
    id: 'notif2',
    type: 'comment',
    title: 'James Park',
    message: 'commented: "Great recommendation! I\'ll check it out this weekend."',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    isRead: false,
    createdAt: '15 min ago',
  },
  {
    id: 'notif3',
    type: 'friend_request',
    title: 'Priya Sharma',
    message: 'sent you a friend request.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
    isRead: false,
    createdAt: '1h ago',
  },
  {
    id: 'notif4',
    type: 'reward',
    title: 'Points Earned',
    message: 'You earned 50 points for referring a friend to Coffee Lovers Guild!',
    avatar: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    isRead: false,
    createdAt: '3h ago',
  },
  {
    id: 'notif5',
    type: 'promo',
    title: 'Rivera Coffee Co.',
    message: 'New promotion: 25% off all cold drinks this month!',
    avatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    isRead: true,
    createdAt: '5h ago',
  },
  {
    id: 'notif6',
    type: 'follow',
    title: 'Daniel Kim',
    message: 'started following you.',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    isRead: true,
    createdAt: '8h ago',
  },
  {
    id: 'notif7',
    type: 'mention',
    title: 'Sofia Martinez',
    message: 'mentioned you in a comment: "@alexrivera you should try this place!"',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    isRead: true,
    createdAt: '1d ago',
  },
  {
    id: 'notif8',
    type: 'like',
    title: 'Emma Wilson',
    message: 'liked your review of Bloom & Petal.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    isRead: true,
    createdAt: '1d ago',
  },
  {
    id: 'notif9',
    type: 'system',
    title: 'ConnectHub',
    message: 'Your account has been verified. Enjoy all premium features!',
    avatar: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=200&h=200&fit=crop',
    isRead: true,
    createdAt: '2d ago',
  },
  {
    id: 'notif10',
    type: 'reward',
    title: 'Weekly Bonus',
    message: 'You earned 25 bonus points for being active this week!',
    avatar: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    isRead: true,
    createdAt: '3d ago',
  },
  {
    id: 'notif11',
    type: 'comment',
    title: 'Liam O\'Brien',
    message: 'replied to your comment: "Totally agree, best coffee in Brooklyn!"',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    isRead: true,
    createdAt: '4d ago',
  },
  {
    id: 'notif12',
    type: 'promo',
    title: 'FitZone Gym',
    message: 'New 30-day challenge starting Monday. Sign up now!',
    avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    isRead: true,
    createdAt: '5d ago',
  },
];

export interface LocalEvent {
  id: string;
  title: string;
  description: string;
  image: string;
  date: string;
  time: string;
  location: string;
  category: 'food' | 'fitness' | 'music' | 'art' | 'community' | 'wellness' | 'market' | 'nightlife';
  host: string;
  hostAvatar: string;
  attendees: number;
  isFree: boolean;
  price?: string;
  tags: string[];
  isHot?: boolean;
}

export const mockLocalEvents: LocalEvent[] = [
  {
    id: 'evt1',
    title: 'Brooklyn Night Market',
    description: 'Over 50 local food vendors, live DJs, and craft cocktails under the stars. The hottest Saturday night in Brooklyn.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop',
    date: 'Sat, Feb 22',
    time: '6:00 PM – 11:00 PM',
    location: 'Williamsburg Waterfront',
    category: 'food',
    host: 'Brooklyn Eats Collective',
    hostAvatar: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&h=100&fit=crop',
    attendees: 342,
    isFree: false,
    price: '$15',
    tags: ['Food', 'Live Music', 'Outdoor'],
    isHot: true,
  },
  {
    id: 'evt2',
    title: 'Sunrise Yoga in the Park',
    description: 'Start your Sunday with a guided vinyasa flow overlooking the East River. All levels welcome. Mats provided.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop',
    date: 'Sun, Feb 23',
    time: '7:00 AM – 8:30 AM',
    location: 'Brooklyn Bridge Park',
    category: 'wellness',
    host: 'FitZone Gym',
    hostAvatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop',
    attendees: 89,
    isFree: true,
    tags: ['Wellness', 'Outdoor', 'Free'],
  },
  {
    id: 'evt3',
    title: 'Latte Art Throwdown',
    description: 'Watch Brooklyn\'s best baristas compete head-to-head. Free tastings, prizes, and vibes.',
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&h=400&fit=crop',
    date: 'Fri, Feb 21',
    time: '5:00 PM – 9:00 PM',
    location: 'Rivera Coffee Co.',
    category: 'food',
    host: 'Rivera Coffee Co.',
    hostAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=100&h=100&fit=crop',
    attendees: 128,
    isFree: true,
    tags: ['Coffee', 'Competition', 'Free'],
    isHot: true,
  },
  {
    id: 'evt4',
    title: 'Spring Floral Workshop',
    description: 'Learn to arrange a stunning spring bouquet from our master florists. Take home your creation!',
    image: 'https://images.unsplash.com/photo-1523694576729-dc99ef1b0632?w=600&h=400&fit=crop',
    date: 'Sat, Mar 1',
    time: '2:00 PM – 4:00 PM',
    location: 'Bloom & Petal Studio',
    category: 'art',
    host: 'Bloom & Petal',
    hostAvatar: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=100&h=100&fit=crop',
    attendees: 24,
    isFree: false,
    price: '$45',
    tags: ['Workshop', 'Flowers', 'Hands-on'],
  },
  {
    id: 'evt5',
    title: 'Sourdough Masterclass',
    description: 'Learn the secrets behind our award-winning sourdough. Includes a starter kit to take home.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop',
    date: 'Sun, Mar 2',
    time: '10:00 AM – 1:00 PM',
    location: 'Artisan Bakery',
    category: 'food',
    host: 'Artisan Bakery',
    hostAvatar: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop',
    attendees: 18,
    isFree: false,
    price: '$65',
    tags: ['Baking', 'Workshop', 'Foodie'],
  },
  {
    id: 'evt6',
    title: 'Live Jazz & Wine Night',
    description: 'An intimate evening of smooth jazz, natural wines, and tapas. Limited seating — reserve your spot.',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&h=400&fit=crop',
    date: 'Thu, Feb 20',
    time: '7:30 PM – 10:30 PM',
    location: 'The Velvet Room, SoHo',
    category: 'nightlife',
    host: 'Nourish Kitchen & Table',
    hostAvatar: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
    attendees: 56,
    isFree: false,
    price: '$35',
    tags: ['Jazz', 'Wine', 'Dinner'],
    isHot: true,
  },
  {
    id: 'evt7',
    title: 'Community Clean-Up Day',
    description: 'Join your neighbors for a morning of beautifying our streets. Free breakfast & coffee for all volunteers.',
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=400&fit=crop',
    date: 'Sat, Mar 8',
    time: '9:00 AM – 12:00 PM',
    location: 'Prospect Park Entrance',
    category: 'community',
    host: 'Brooklyn Community Board',
    hostAvatar: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=100&h=100&fit=crop',
    attendees: 73,
    isFree: true,
    tags: ['Community', 'Volunteer', 'Free'],
  },
  {
    id: 'evt8',
    title: 'Artisan Makers Market',
    description: 'Discover handmade jewelry, ceramics, candles, and more from 30+ local artisans.',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop',
    date: 'Sun, Mar 9',
    time: '11:00 AM – 5:00 PM',
    location: 'Industry City, Sunset Park',
    category: 'market',
    host: 'Artisan Makers Guild',
    hostAvatar: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=100&h=100&fit=crop',
    attendees: 215,
    isFree: true,
    tags: ['Market', 'Handmade', 'Shopping'],
  },
];

export interface BusinessLocation {
  id: string;
  businessId: string;
  name: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  distance: string;
  distanceMiles: number;
  walkTime: string;
  localPopularity: number;
  localTags: string[];
  openNow: boolean;
  nextOpen?: string;
  neighborhoodVibe: string;
}

export interface SearchableLocation {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
}

export const searchableLocations: SearchableLocation[] = [
  { id: 'sl1', name: 'Brooklyn Heights', subtitle: 'Brooklyn, NY', lat: 40.6961, lng: -73.9936 },
  { id: 'sl2', name: 'SoHo', subtitle: 'Manhattan, NY', lat: 40.7233, lng: -73.9985 },
  { id: 'sl3', name: 'Williamsburg', subtitle: 'Brooklyn, NY', lat: 40.7081, lng: -73.9571 },
  { id: 'sl4', name: 'Forest Hills', subtitle: 'Queens, NY', lat: 40.7207, lng: -73.8448 },
  { id: 'sl5', name: 'Park Slope', subtitle: 'Brooklyn, NY', lat: 40.6710, lng: -73.9814 },
  { id: 'sl6', name: 'DUMBO', subtitle: 'Brooklyn, NY', lat: 40.7033, lng: -73.9890 },
  { id: 'sl7', name: 'Upper East Side', subtitle: 'Manhattan, NY', lat: 40.7736, lng: -73.9566 },
  { id: 'sl8', name: 'Astoria', subtitle: 'Queens, NY', lat: 40.7724, lng: -73.9301 },
  { id: 'sl9', name: 'Midtown Manhattan', subtitle: 'Manhattan, NY', lat: 40.7549, lng: -73.9840 },
  { id: 'sl10', name: 'Greenwich Village', subtitle: 'Manhattan, NY', lat: 40.7336, lng: -74.0027 },
  { id: 'sl11', name: 'Lower East Side', subtitle: 'Manhattan, NY', lat: 40.7150, lng: -73.9843 },
  { id: 'sl12', name: 'Bushwick', subtitle: 'Brooklyn, NY', lat: 40.6944, lng: -73.9213 },
];

export const businessLocations: BusinessLocation[] = [
  {
    id: 'loc1',
    businessId: 'b1',
    name: 'Rivera Coffee Co.',
    neighborhood: 'Brooklyn Heights',
    address: '42 Roast Lane, Brooklyn, NY 11201',
    lat: 40.6961,
    lng: -73.9936,
    distance: '0.3 mi',
    distanceMiles: 0.3,
    walkTime: '6 min',
    localPopularity: 94,
    localTags: ['Top Rated', 'Neighborhood Favorite', 'Outdoor Seating'],
    openNow: true,
    neighborhoodVibe: 'Cozy & Historic',
  },
  {
    id: 'loc2',
    businessId: 'b2',
    name: 'Bloom & Petal',
    neighborhood: 'SoHo',
    address: '118 Garden Ave, Manhattan, NY 10012',
    lat: 40.7233,
    lng: -73.9985,
    distance: '1.2 mi',
    distanceMiles: 1.2,
    walkTime: '24 min',
    localPopularity: 87,
    localTags: ['Artisan', 'Same-Day Delivery', 'Gift Ready'],
    openNow: true,
    neighborhoodVibe: 'Trendy & Artistic',
  },
  {
    id: 'loc3',
    businessId: 'b3',
    name: 'FitZone Gym',
    neighborhood: 'Forest Hills',
    address: '500 Muscle Blvd, Queens, NY 11375',
    lat: 40.7207,
    lng: -73.8448,
    distance: '3.8 mi',
    distanceMiles: 3.8,
    walkTime: '76 min',
    localPopularity: 91,
    localTags: ['Open Early', '24/7 Access', 'Personal Training'],
    openNow: true,
    neighborhoodVibe: 'Residential & Active',
  },
  {
    id: 'loc4',
    businessId: 'b4',
    name: 'Artisan Bakery',
    neighborhood: 'Williamsburg',
    address: '77 Flour St, Williamsburg, NY 11249',
    lat: 40.7081,
    lng: -73.9571,
    distance: '0.8 mi',
    distanceMiles: 0.8,
    walkTime: '16 min',
    localPopularity: 89,
    localTags: ['Fresh Daily', 'Organic', 'Family-Owned'],
    openNow: false,
    nextOpen: 'Opens 6 AM tomorrow',
    neighborhoodVibe: 'Hip & Vibrant',
  },
  {
    id: 'loc5',
    businessId: 'b5',
    name: 'Zen Yoga Studio',
    neighborhood: 'Park Slope',
    address: '200 Prospect Ave, Brooklyn, NY 11215',
    lat: 40.6710,
    lng: -73.9814,
    distance: '1.5 mi',
    distanceMiles: 1.5,
    walkTime: '30 min',
    localPopularity: 82,
    localTags: ['Hot Yoga', 'Beginner Friendly', 'Meditation'],
    openNow: true,
    neighborhoodVibe: 'Family & Wellness',
  },
  {
    id: 'loc6',
    businessId: 'b6',
    name: 'DUMBO Tech Hub',
    neighborhood: 'DUMBO',
    address: '55 Water St, Brooklyn, NY 11201',
    lat: 40.7033,
    lng: -73.9890,
    distance: '0.6 mi',
    distanceMiles: 0.6,
    walkTime: '12 min',
    localPopularity: 78,
    localTags: ['Coworking', 'Events', 'Startup Hub'],
    openNow: true,
    neighborhoodVibe: 'Creative & Tech',
  },
  {
    id: 'loc7',
    businessId: 'b7',
    name: 'Village Vinyl Records',
    neighborhood: 'Greenwich Village',
    address: '33 Bleecker St, Manhattan, NY 10012',
    lat: 40.7282,
    lng: -74.0007,
    distance: '2.1 mi',
    distanceMiles: 2.1,
    walkTime: '42 min',
    localPopularity: 85,
    localTags: ['Rare Finds', 'Live Music', 'Vintage'],
    openNow: true,
    neighborhoodVibe: 'Bohemian & Musical',
  },
  {
    id: 'loc8',
    businessId: 'b8',
    name: 'Prospect Pet Care',
    neighborhood: 'Park Slope',
    address: '410 5th Ave, Brooklyn, NY 11215',
    lat: 40.6685,
    lng: -73.9820,
    distance: '1.8 mi',
    distanceMiles: 1.8,
    walkTime: '36 min',
    localPopularity: 90,
    localTags: ['Grooming', 'Daycare', 'Organic Treats'],
    openNow: false,
    nextOpen: 'Opens 8 AM tomorrow',
    neighborhoodVibe: 'Family & Wellness',
  },
  {
    id: 'loc9',
    businessId: 'b9',
    name: 'Astoria Taverna',
    neighborhood: 'Astoria',
    address: '28-15 Steinway St, Queens, NY 11103',
    lat: 40.7724,
    lng: -73.9301,
    distance: '5.2 mi',
    distanceMiles: 5.2,
    walkTime: '104 min',
    localPopularity: 93,
    localTags: ['Greek Cuisine', 'Outdoor Dining', 'Award Winner'],
    openNow: true,
    neighborhoodVibe: 'Cultural & Lively',
  },
  {
    id: 'loc10',
    businessId: 'b10',
    name: 'UES Book Nook',
    neighborhood: 'Upper East Side',
    address: '1440 Lexington Ave, Manhattan, NY 10128',
    lat: 40.7810,
    lng: -73.9530,
    distance: '7.4 mi',
    distanceMiles: 7.4,
    walkTime: '—',
    localPopularity: 80,
    localTags: ['Indie Books', 'Author Events', 'Kids Corner'],
    openNow: true,
    neighborhoodVibe: 'Classic & Refined',
  },
  {
    id: 'loc11',
    businessId: 'b11',
    name: 'LES Tattoo Collective',
    neighborhood: 'Lower East Side',
    address: '90 Orchard St, Manhattan, NY 10002',
    lat: 40.7186,
    lng: -73.9901,
    distance: '2.5 mi',
    distanceMiles: 2.5,
    walkTime: '50 min',
    localPopularity: 76,
    localTags: ['Custom Art', 'Walk-Ins', 'Award Winner'],
    openNow: true,
    neighborhoodVibe: 'Edgy & Artistic',
  },
  {
    id: 'loc12',
    businessId: 'b12',
    name: 'Bushwick Bikes',
    neighborhood: 'Bushwick',
    address: '180 Knickerbocker Ave, Brooklyn, NY 11237',
    lat: 40.6944,
    lng: -73.9213,
    distance: '3.2 mi',
    distanceMiles: 3.2,
    walkTime: '64 min',
    localPopularity: 74,
    localTags: ['Repairs', 'Rentals', 'Custom Builds'],
    openNow: false,
    nextOpen: 'Opens 10 AM tomorrow',
    neighborhoodVibe: 'Urban & Creative',
  },
];

export interface NeighborhoodInfo {
  id: string;
  name: string;
  businessCount: number;
  topCategory: string;
  color: string;
  lat: number;
  lng: number;
}

export const neighborhoods: NeighborhoodInfo[] = [
  { id: 'n1', name: 'Brooklyn Heights', businessCount: 12, topCategory: 'Coffee & Dining', color: '#0EA5E9', lat: 40.6961, lng: -73.9936 },
  { id: 'n2', name: 'SoHo', businessCount: 28, topCategory: 'Shopping & Fashion', color: '#EC4899', lat: 40.7233, lng: -73.9985 },
  { id: 'n3', name: 'Williamsburg', businessCount: 34, topCategory: 'Food & Nightlife', color: '#1A5C35', lat: 40.7081, lng: -73.9571 },
  { id: 'n4', name: 'Forest Hills', businessCount: 8, topCategory: 'Health & Fitness', color: '#10B981', lat: 40.7207, lng: -73.8448 },
  { id: 'n5', name: 'Park Slope', businessCount: 19, topCategory: 'Family & Dining', color: '#00B246', lat: 40.6710, lng: -73.9814 },
  { id: 'n6', name: 'DUMBO', businessCount: 15, topCategory: 'Tech & Creative', color: '#06B6D4', lat: 40.7033, lng: -73.9890 },
];

export interface PostLocalData {
  postId: string;
  businessLocation: BusinessLocation;
  localReactions: number;
  neighborhoodReach: string;
  trendingInArea: boolean;
  nearbyDeals: string[];
  localHashtags: string[];
}

export const postLocalData: PostLocalData[] = [
  { postId: 'p1', businessLocation: businessLocations[1], localReactions: 182, neighborhoodReach: 'SoHo & NoLita', trendingInArea: true, nearbyDeals: ['15% off next-day delivery', 'Free gift wrap'], localHashtags: ['#SoHoFlorist', '#NYCFlowers', '#LocalLove'] },
  { postId: 'p2', businessLocation: businessLocations[2], localReactions: 341, neighborhoodReach: 'Forest Hills & Rego Park', trendingInArea: true, nearbyDeals: ['Free PT session', '$20 off first month'], localHashtags: ['#QueensFitness', '#LocalGym', '#ForestHills'] },
  { postId: 'p3', businessLocation: businessLocations[0], localReactions: 128, neighborhoodReach: 'Brooklyn Heights & DUMBO', trendingInArea: false, nearbyDeals: ['Buy 1 get 1 free espresso'], localHashtags: ['#BrooklynCoffee', '#LocalRoast', '#HeightsLife'] },
  { postId: 'p4', businessLocation: businessLocations[3], localReactions: 97, neighborhoodReach: 'Williamsburg & Greenpoint', trendingInArea: false, nearbyDeals: ['Weekend sourdough special'], localHashtags: ['#WilliamsburgEats', '#ArtisanBread', '#LocalBakery'] },
  { postId: 'p5', businessLocation: businessLocations[1], localReactions: 256, neighborhoodReach: 'SoHo & Greenwich Village', trendingInArea: true, nearbyDeals: [], localHashtags: ['#BloomAndPetal', '#SoHoLife'] },
  { postId: 'p6', businessLocation: businessLocations[1], localReactions: 145, neighborhoodReach: 'SoHo & NoLita', trendingInArea: false, nearbyDeals: ['Pre-order discount 10%'], localHashtags: ['#MothersDay', '#NYCFlorist'] },
  { postId: 'p7', businessLocation: businessLocations[1], localReactions: 198, neighborhoodReach: 'SoHo', trendingInArea: false, nearbyDeals: [], localHashtags: ['#WeddingFlowers', '#BehindTheScenes'] },
  { postId: 'p8', businessLocation: businessLocations[0], localReactions: 267, neighborhoodReach: 'Brooklyn Heights & Cobble Hill', trendingInArea: true, nearbyDeals: ['Free loyalty card'], localHashtags: ['#RiveraCoffee', '#LoyaltyRewards'] },
  { postId: 'p9', businessLocation: businessLocations[0], localReactions: 104, neighborhoodReach: 'Brooklyn Heights', trendingInArea: false, nearbyDeals: [], localHashtags: ['#MorningCoffee', '#BrooklynVibes'] },
  { postId: 'p10', businessLocation: businessLocations[0], localReactions: 389, neighborhoodReach: 'All Brooklyn', trendingInArea: true, nearbyDeals: [], localHashtags: ['#BestLocalCoffee', '#BrooklynEats'] },
  { postId: 'p11', businessLocation: businessLocations[0], localReactions: 156, neighborhoodReach: 'Brooklyn Heights & Downtown', trendingInArea: false, nearbyDeals: ['Latte art Friday specials'], localHashtags: ['#LatteArt', '#FridayVibes'] },
  { postId: 'p12', businessLocation: businessLocations[2], localReactions: 278, neighborhoodReach: 'Forest Hills & Jamaica', trendingInArea: false, nearbyDeals: [], localHashtags: ['#FitZone', '#MemberSpotlight'] },
  { postId: 'p13', businessLocation: businessLocations[2], localReactions: 134, neighborhoodReach: 'Forest Hills', trendingInArea: false, nearbyDeals: ['First class free'], localHashtags: ['#YogaFlow', '#QueensWellness'] },
  { postId: 'p14', businessLocation: businessLocations[2], localReactions: 223, neighborhoodReach: 'Queens & Brooklyn', trendingInArea: true, nearbyDeals: ['Free fitness assessment'], localHashtags: ['#SummerBody', '#PersonalTraining'] },
  { postId: 'p15', businessLocation: businessLocations[3], localReactions: 167, neighborhoodReach: 'Williamsburg & Bushwick', trendingInArea: false, nearbyDeals: ['Limited edition pastry'], localHashtags: ['#CroissantOfTheMonth', '#WilliamsburgBakery'] },
  { postId: 'p16', businessLocation: businessLocations[3], localReactions: 112, neighborhoodReach: 'Williamsburg', trendingInArea: false, nearbyDeals: ['Custom cake 10% off'], localHashtags: ['#CustomCakes', '#LocalBakery'] },
  { postId: 'p17', businessLocation: businessLocations[3], localReactions: 201, neighborhoodReach: 'Williamsburg & Greenpoint', trendingInArea: false, nearbyDeals: [], localHashtags: ['#MeetTheBaker', '#ArtisanBread'] },
  { postId: 'tp-pinned-1', businessLocation: { id: 'loc-tp', businessId: 'b-touchpoints', name: 'TouchPoint App', neighborhood: 'Midtown Manhattan', address: '1 TouchPoint Plaza, New York, NY 10001', lat: 40.7549, lng: -73.9840, distance: '—', distanceMiles: 0, walkTime: '—', localPopularity: 99, localTags: ['Official', 'Rewards', 'Community'], openNow: true, neighborhoodVibe: 'Digital & Connected' }, localReactions: 4821, neighborhoodReach: 'All New York', trendingInArea: true, nearbyDeals: [], localHashtags: ['#TouchPoint', '#LocalBusiness', '#EarnRewards'] },
];

export const bizComAutoInvites: BizComAutoInvite[] = [
  {
    id: 'bai1',
    referralCodeId: 'irc1',
    referralCode: 'TP-ARV-2026-001',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    bizComAvatar: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc3',
    contactName: 'Tom Harris',
    contactPhone: '+1 (555) 456-7890',
    contactAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    message: 'You\'ve been invited by Rivera Coffee Co. to join "Coffee Lovers Guild" on TouchPoint. This invitation was automatically created when your SMS invite was sent.',
    status: 'accepted',
    createdAt: '2026-01-28T10:30:00Z',
    sentAt: '2026-01-29T14:16:00Z',
    acceptedAt: '2026-01-29T14:20:00Z',
  },
  {
    id: 'bai2',
    referralCodeId: 'irc2',
    referralCode: 'TP-ARV-2026-002',
    bizComId: 'bc2',
    bizComName: 'Local Foodies',
    bizComAvatar: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc5',
    contactName: 'Chris Evans',
    contactPhone: '+1 (555) 678-9012',
    contactAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop',
    message: 'You\'ve been invited by Rivera Coffee Co. to join "Local Foodies" on TouchPoint. This invitation was automatically created when your SMS invite was sent.',
    status: 'sent',
    createdAt: '2026-02-05T09:00:00Z',
    sentAt: '2026-02-05T09:00:00Z',
  },
  {
    id: 'bai3',
    referralCodeId: 'irc3',
    referralCode: 'TP-ARV-2026-003',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    bizComAvatar: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc6',
    contactName: 'Ava Thompson',
    contactPhone: '+1 (555) 789-0123',
    contactAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
    message: 'You\'ve been invited by Rivera Coffee Co. to join "Coffee Lovers Guild" on TouchPoint. This invitation was automatically created when your SMS invite was sent.',
    status: 'delivered',
    createdAt: '2026-02-07T16:45:00Z',
    sentAt: '2026-02-08T09:31:00Z',
  },
  {
    id: 'bai4',
    referralCodeId: 'irc4',
    referralCode: 'TP-ARV-2026-004',
    bizComId: 'bc4',
    bizComName: 'Small Biz Network',
    bizComAvatar: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=200&h=200&fit=crop',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc8',
    contactName: 'Zara Ali',
    contactPhone: '+1 (555) 901-2345',
    contactAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop',
    message: 'You\'ve been invited by Rivera Coffee Co. to join "Small Biz Network" on TouchPoint. This invitation was automatically created when your SMS invite was sent.',
    status: 'queued',
    createdAt: '2026-02-09T11:20:00Z',
  },
  {
    id: 'bai5',
    referralCodeId: 'irc5',
    referralCode: 'TP-ARV-2026-005',
    bizComId: 'bc3',
    bizComName: 'Wellness Circle',
    bizComAvatar: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc11',
    contactName: 'Omar Hassan',
    contactPhone: '+1 (555) 234-5679',
    contactAvatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop',
    message: 'You\'ve been invited by Rivera Coffee Co. to join "Wellness Circle" on TouchPoint. This invitation was automatically created when your SMS invite was sent.',
    status: 'accepted',
    createdAt: '2026-02-01T13:00:00Z',
    sentAt: '2026-02-02T10:31:00Z',
    acceptedAt: '2026-02-02T10:35:00Z',
  },
  {
    id: 'bai6',
    referralCodeId: 'irc6',
    referralCode: 'TP-ARV-2026-006',
    bizComId: 'bc2',
    bizComName: 'Local Foodies',
    bizComAvatar: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc12',
    contactName: 'Priya Sharma',
    contactPhone: '+1 (555) 345-6780',
    contactAvatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop',
    message: 'You\'ve been invited by Rivera Coffee Co. to join "Local Foodies" on TouchPoint. This invitation was automatically created when your SMS invite was sent.',
    status: 'accepted',
    createdAt: '2026-01-20T09:45:00Z',
    sentAt: '2026-01-22T17:01:00Z',
    acceptedAt: '2026-01-22T17:05:00Z',
  },
  {
    id: 'bai7',
    referralCodeId: 'irc7',
    referralCode: 'TP-ARV-2026-007',
    bizComId: 'bc1',
    bizComName: 'Coffee Lovers Guild',
    bizComAvatar: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc14',
    contactName: 'Emma Wilson',
    contactPhone: '+1 (555) 567-8902',
    contactAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    message: 'You\'ve been invited by Rivera Coffee Co. to join "Coffee Lovers Guild" on TouchPoint. This invitation was automatically created when your SMS invite was sent.',
    status: 'queued',
    createdAt: '2026-02-10T08:30:00Z',
  },
  {
    id: 'bai8',
    referralCodeId: 'irc8',
    referralCode: 'TP-ARV-2026-008',
    bizComId: 'bc6',
    bizComName: 'Artisan Makers',
    bizComAvatar: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=200&h=200&fit=crop',
    inviterId: 'b1',
    inviterName: 'Rivera Coffee Co.',
    inviterAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
    contactId: 'pc17',
    contactName: 'Ben Taylor',
    contactPhone: '+1 (555) 890-1245',
    contactAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    message: 'You\'ve been invited by Rivera Coffee Co. to join "Artisan Makers" on TouchPoint. This invitation was automatically created when your SMS invite was sent.',
    status: 'sent',
    createdAt: '2026-02-08T12:00:00Z',
    sentAt: '2026-02-08T12:00:00Z',
  },
];

export const googleBusinessProfiles: GoogleBusinessProfile[] = [
  {
    id: 'gbp-alex-rivera',
    placeId: 'ChIJA1eXrRiv2EcRAlexRivera001',
    name: 'Rivera Coffee Co.',
    address: '42 Roast Lane, Brooklyn, NY 11201',
    phone: '+1 (555) 100-2018',
    website: 'https://riveracoffee.com',
    category: 'Coffee & Beverages',
    rating: 4.8,
    reviewCount: 1247,
    photo: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=400&h=300&fit=crop',
    hours: 'Mon-Fri 7am-7pm, Sat-Sun 8am-5pm',
    isVerified: true,
    isClaimed: false,
    latitude: 40.6892,
    longitude: -73.9857,
  },
  {
    id: 'gbp1',
    placeId: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
    name: 'The Ivy Chelsea Garden',
    address: '195-197 King\'s Rd, Chelsea, London SW3 5EQ',
    phone: '+44 20 3301 0300',
    website: 'https://theivychelseagarden.com',
    category: 'Restaurant',
    rating: 4.4,
    reviewCount: 3842,
    photo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
    hours: 'Mon-Sun 8am-11:30pm',
    isVerified: true,
    isClaimed: false,
    latitude: 51.4875,
    longitude: -0.1687,
  },
  {
    id: 'gbp2',
    placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
    name: 'Brew & Bean Coffee House',
    address: '42 Church St, Manchester M4 1PW',
    phone: '+44 161 234 5678',
    website: 'https://brewandbean.co.uk',
    category: 'Coffee Shop',
    rating: 4.7,
    reviewCount: 892,
    photo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
    hours: 'Mon-Fri 7am-6pm, Sat 8am-5pm',
    isVerified: true,
    isClaimed: false,
    latitude: 53.4808,
    longitude: -2.2426,
  },
  {
    id: 'gbp3',
    placeId: 'ChIJb8Jg766MbUgRUrsuf18HIPM',
    name: 'Harrogate Flower Emporium',
    address: '16 Parliament St, Harrogate HG1 2QY',
    phone: '+44 1423 567 890',
    website: 'https://harrogateflowers.co.uk',
    category: 'Florist',
    rating: 4.9,
    reviewCount: 456,
    photo: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=300&fit=crop',
    hours: 'Mon-Sat 9am-5:30pm, Sun Closed',
    isVerified: true,
    isClaimed: false,
    latitude: 53.9921,
    longitude: -1.5418,
  },
  {
    id: 'gbp4',
    placeId: 'ChIJL_P_aXoEdkgRGbP3B7PJHNE',
    name: 'Camden Barber Co.',
    address: '88 Camden High St, London NW1 0LT',
    phone: '+44 20 7485 1234',
    website: 'https://camdenbarberco.com',
    category: 'Barber Shop',
    rating: 4.6,
    reviewCount: 1247,
    photo: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop',
    hours: 'Mon-Sat 9am-7pm, Sun 10am-5pm',
    isVerified: true,
    isClaimed: false,
    latitude: 51.5392,
    longitude: -0.1426,
  },
  {
    id: 'gbp5',
    placeId: 'ChIJOyKVTjBYDkgRlwoKw1jPGRQ',
    name: 'Edinburgh Whisky Experience',
    address: '354 Castlehill, Edinburgh EH1 2NE',
    phone: '+44 131 220 0441',
    website: 'https://scotchwhiskyexperience.co.uk',
    category: 'Tourist Attraction',
    rating: 4.5,
    reviewCount: 2103,
    photo: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400&h=300&fit=crop',
    hours: 'Mon-Sun 10am-6pm',
    isVerified: true,
    isClaimed: false,
    latitude: 55.9496,
    longitude: -3.1956,
  },
  {
    id: 'gbp6',
    placeId: 'ChIJ8e6gO6oFdkgRUj7HTz9CTUQ',
    name: 'PureFit Gym & Wellness',
    address: '12 Brick Lane, London E1 6RF',
    phone: '+44 20 7377 8899',
    website: 'https://purefitgym.co.uk',
    category: 'Gym',
    rating: 4.3,
    reviewCount: 567,
    photo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
    hours: 'Mon-Fri 6am-10pm, Sat-Sun 8am-8pm',
    isVerified: true,
    isClaimed: false,
    latitude: 51.5219,
    longitude: -0.0715,
  },
  {
    id: 'gbp7',
    placeId: 'ChIJQVEPo6ise0gRYBKFEV3CTQE',
    name: 'The Cosy Bookshop',
    address: '7 Shambles, York YO1 7LZ',
    phone: '+44 1904 654 321',
    website: 'https://cosybookshop.co.uk',
    category: 'Book Store',
    rating: 4.8,
    reviewCount: 789,
    photo: 'https://images.unsplash.com/photo-1526243741027-444d633d7365?w=400&h=300&fit=crop',
    hours: 'Mon-Sat 9:30am-5:30pm, Sun 11am-4pm',
    isVerified: true,
    isClaimed: false,
    latitude: 53.9599,
    longitude: -1.0812,
  },
  {
    id: 'gbp8',
    placeId: 'ChIJBUVa4U7eYUgRFRKARHRkIAI',
    name: 'Bristol Street Food Market',
    address: 'Cargo, Wapping Wharf, Bristol BS1 6WP',
    phone: '+44 117 929 0088',
    website: 'https://bristolstreetfood.co.uk',
    category: 'Food Market',
    rating: 4.6,
    reviewCount: 1534,
    photo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
    hours: 'Wed-Sun 11am-9pm',
    isVerified: true,
    isClaimed: false,
    latitude: 51.4472,
    longitude: -2.5966,
  },
];

export interface BusinessTeamMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
  email: string;
  phone: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  joinedAt: string;
  lastActive: string;
  isVerified: boolean;
  permissions: string[];
}

export interface AdminTransferRequest {
  id: string;
  businessId: string;
  businessName: string;
  fromMemberId: string;
  fromMemberName: string;
  fromMemberAvatar: string;
  toMemberId: string;
  toMemberName: string;
  toMemberAvatar: string;
  status: 'pending_verification' | 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reason: string;
  requestedAt: string;
  completedAt?: string;
  verificationCode?: string;
  verifiedAt?: string;
}

export const mockBusinessTeamMembers: BusinessTeamMember[] = [
  {
    id: 'tm1',
    name: 'Alex Rivera',
    username: 'alexrivera',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    email: 'alex.rivera@email.com',
    phone: '+1 (555) 234-5678',
    role: 'owner',
    joinedAt: '2024-06-15T10:00:00Z',
    lastActive: '2026-03-15T08:30:00Z',
    isVerified: true,
    permissions: ['full_access', 'billing', 'team_management', 'content', 'analytics', 'settings'],
  },
  {
    id: 'tm2',
    name: 'Sarah Chen',
    username: 'sarahchen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 345-6789',
    role: 'admin',
    joinedAt: '2024-09-20T14:00:00Z',
    lastActive: '2026-03-14T16:45:00Z',
    isVerified: true,
    permissions: ['content', 'analytics', 'team_management', 'settings'],
  },
  {
    id: 'tm3',
    name: 'Marcus Johnson',
    username: 'marcusj',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    email: 'marcus.j@email.com',
    phone: '+1 (555) 456-7890',
    role: 'manager',
    joinedAt: '2025-01-10T09:00:00Z',
    lastActive: '2026-03-13T11:20:00Z',
    isVerified: true,
    permissions: ['content', 'analytics'],
  },
  {
    id: 'tm4',
    name: 'Emma Wilson',
    username: 'emmaw',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    email: 'emma.w@email.com',
    phone: '+1 (555) 567-8901',
    role: 'staff',
    joinedAt: '2025-06-01T12:00:00Z',
    lastActive: '2026-03-12T09:15:00Z',
    isVerified: true,
    permissions: ['content'],
  },
  {
    id: 'tm5',
    name: 'David Park',
    username: 'davidpark',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    email: 'david.park@email.com',
    phone: '+1 (555) 678-9012',
    role: 'manager',
    joinedAt: '2025-03-15T10:30:00Z',
    lastActive: '2026-03-14T14:00:00Z',
    isVerified: true,
    permissions: ['content', 'analytics', 'settings'],
  },
];

export const mockAdminTransferHistory: AdminTransferRequest[] = [
  {
    id: 'atr1',
    businessId: 'b1',
    businessName: 'Rivera Coffee Co.',
    fromMemberId: 'tm-prev1',
    fromMemberName: 'Carlos Rivera',
    fromMemberAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    toMemberId: 'tm1',
    toMemberName: 'Alex Rivera',
    toMemberAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
    status: 'completed',
    reason: 'Business ownership transfer - Carlos retiring from day-to-day operations',
    requestedAt: '2024-05-28T10:00:00Z',
    completedAt: '2024-06-15T10:00:00Z',
    verifiedAt: '2024-06-01T14:30:00Z',
  },
  {
    id: 'atr2',
    businessId: 'b1',
    businessName: 'Rivera Coffee Co.',
    fromMemberId: 'tm-prev2',
    fromMemberName: 'Jordan Lee',
    fromMemberAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    toMemberId: 'tm2',
    toMemberName: 'Sarah Chen',
    toMemberAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    status: 'completed',
    reason: 'Admin role reassignment - Jordan relocated to another branch',
    requestedAt: '2024-09-10T09:00:00Z',
    completedAt: '2024-09-20T14:00:00Z',
    verifiedAt: '2024-09-15T11:00:00Z',
  },
];
