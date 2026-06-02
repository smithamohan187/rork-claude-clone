import { useCallback, useEffect, useRef, useState } from 'react';

export interface SubscribedBusiness {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  categoryColor: string;
  subscriberCount: number;
  bio: string;
}

export interface OfferFeedItem {
  feedType: 'offer';
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  title: string;
  description: string;
  expiryDate: string;
  createdAt: string;
  bookmarked: boolean;
}

export interface EventFeedItem {
  feedType: 'event';
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  title: string;
  venue: string;
  startDate: string;
  createdAt: string;
  interested: boolean;
}

export type FeedItem = OfferFeedItem | EventFeedItem;

export interface RewardSummary {
  id: string;
  title: string;
  emoji: string;
  pointsRequired: number;
  tierColor: string;
}

const daysFromNow = (d: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date.toISOString();
};

const MOCK_SUBSCRIBED: SubscribedBusiness[] = [
  {
    id: 'b1',
    name: 'Nourish Kitchen',
    logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=160&h=160&fit=crop',
    category: 'Food',
    categoryColor: '#1A5C35',
    subscriberCount: 1240,
    bio: 'Farm-to-table brunch & dinner',
  },
  {
    id: 'b5',
    name: 'Rivera Coffee',
    logoUrl: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=160&h=160&fit=crop',
    category: 'Food',
    categoryColor: '#1A5C35',
    subscriberCount: 3400,
    bio: 'Specialty coffee & pastries',
  },
];

const MOCK_FEED: FeedItem[] = [
  {
    feedType: 'offer',
    id: 'o1',
    businessId: 'b1',
    businessName: 'Nourish Kitchen',
    businessLogo: MOCK_SUBSCRIBED[0].logoUrl,
    title: 'Weekend Brunch — 20% Off',
    description: "We're absolutely thrilled to share some exciting news with our loyal customers and community! After months of hard work and preparation, we're rolling out a brand-new loyalty rewards programme that is designed specifically to give back to the people who matter most — YOU. Every purchase you make, every referral you bring in, and every event you attend now earns you TouchPoint that can be redeemed for exclusive discounts, VIP access to special events, early product launches, and personalised offers curated just for you. We believe that every interaction with our business should feel rewarding, and this is our way of saying thank you for your continued trust and support. Stay tuned for more updates as we roll out exciting new reward tiers and partner benefits over the coming weeks. We can't wait for you to experience everything we've been building for you!",
    expiryDate: daysFromNow(2),
    createdAt: daysFromNow(-1),
    bookmarked: false,
  },
  {
    feedType: 'event',
    id: 'e1',
    businessId: 'b5',
    businessName: 'Rivera Coffee',
    businessLogo: MOCK_SUBSCRIBED[1].logoUrl,
    title: 'Latte Art Throwdown',
    venue: 'Rivera Coffee · Fort Kochi',
    startDate: daysFromNow(6),
    createdAt: daysFromNow(-2),
    interested: false,
  },
  {
    feedType: 'offer',
    id: 'o2',
    businessId: 'b5',
    businessName: 'Rivera Coffee',
    businessLogo: MOCK_SUBSCRIBED[1].logoUrl,
    title: 'Double Points Monday',
    description: 'Earn 2× TouchPoint on every espresso, pour-over, and pastry, all day Monday.',
    expiryDate: daysFromNow(9),
    createdAt: daysFromNow(-3),
    bookmarked: false,
  },
  {
    feedType: 'offer',
    id: 'o3',
    businessId: 'b1',
    businessName: 'Nourish Kitchen',
    businessLogo: MOCK_SUBSCRIBED[0].logoUrl,
    title: 'Chef\u2019s Table: Spring Tasting',
    description: 'A five-course pairing menu by Chef Arun. Members save 15% on the full tasting.',
    expiryDate: daysFromNow(14),
    createdAt: daysFromNow(-5),
    bookmarked: false,
  },
  {
    feedType: 'event',
    id: 'e2',
    businessId: 'b1',
    businessName: 'Nourish Kitchen',
    businessLogo: MOCK_SUBSCRIBED[0].logoUrl,
    title: 'Farmers Market Pop-Up',
    venue: 'Marine Drive Plaza',
    startDate: daysFromNow(11),
    createdAt: daysFromNow(-6),
    interested: false,
  },
];

const MOCK_DISCOVERY: SubscribedBusiness[] = [
  {
    id: 'b2',
    name: 'FitZone Gym',
    logoUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=160&h=160&fit=crop',
    category: 'Fitness',
    categoryColor: '#10B981',
    subscriberCount: 860,
    bio: 'Performance training, group classes',
  },
  {
    id: 'b3',
    name: 'Glow Beauty Studio',
    logoUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=160&h=160&fit=crop',
    category: 'Beauty',
    categoryColor: '#EC4899',
    subscriberCount: 2100,
    bio: 'Skincare, facials, brow bar',
  },
  {
    id: 'b4',
    name: 'Urban Threads',
    logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=160&h=160&fit=crop',
    category: 'Retail',
    categoryColor: '#3B82F6',
    subscriberCount: 530,
    bio: 'Independent fashion boutique',
  },
  {
    id: 'b6',
    name: 'SoundWave Events',
    logoUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&h=160&fit=crop',
    category: 'Events',
    categoryColor: '#00B246',
    subscriberCount: 4200,
    bio: 'Live music, festivals, meetups',
  },
];

const MOCK_REWARD: RewardSummary = {
  id: 'r1',
  title: 'Free Coffee',
  emoji: '🎁',
  pointsRequired: 500,
  tierColor: '#1A5C35',
};

const MOCK_POINTS = 240;

export interface UsePersonalisedFeedResult {
  subscribedBusinesses: SubscribedBusiness[];
  feedItems: FeedItem[];
  discoveryBusinesses: SubscribedBusiness[];
  userPoints: number;
  rewardsSummary: RewardSummary | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  subscribeToDiscovery: (businessId: string) => SubscribedBusiness | null;
  toggleBookmark: (offerId: string) => boolean;
  toggleInterested: (eventId: string) => boolean;
}

export function usePersonalisedFeed(): UsePersonalisedFeedResult {
  const [subscribedBusinesses, setSubscribedBusinesses] = useState<SubscribedBusiness[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [discoveryBusinesses, setDiscoveryBusinesses] = useState<SubscribedBusiness[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [rewardsSummary, setRewardsSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const load = useCallback(async (isRefresh: boolean) => {
    console.log('[usePersonalisedFeed] load', { isRefresh });
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    await new Promise((r) => setTimeout(r, isRefresh ? 500 : 700));

    if (!mountedRef.current) return;

    setSubscribedBusinesses(MOCK_SUBSCRIBED);
    setFeedItems(
      [...MOCK_FEED]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 30)
    );
    setDiscoveryBusinesses(MOCK_DISCOVERY);
    setUserPoints(MOCK_POINTS);
    setRewardsSummary(MOCK_REWARD);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load(false);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const subscribeToDiscovery = useCallback((businessId: string): SubscribedBusiness | null => {
    console.log('[usePersonalisedFeed] subscribeToDiscovery', businessId);
    let picked: SubscribedBusiness | null = null;
    setDiscoveryBusinesses((prev) => {
      const match = prev.find((b) => b.id === businessId);
      if (!match) return prev;
      picked = match;
      return prev.filter((b) => b.id !== businessId);
    });
    if (picked) {
      setSubscribedBusinesses((prev) => {
        if (prev.some((b) => b.id === businessId)) return prev;
        return [...prev, picked as SubscribedBusiness];
      });
    }
    return picked;
  }, []);

  const toggleBookmark = useCallback((offerId: string): boolean => {
    let next = false;
    setFeedItems((prev) =>
      prev.map((it) => {
        if (it.feedType === 'offer' && it.id === offerId) {
          next = !it.bookmarked;
          return { ...it, bookmarked: next };
        }
        return it;
      })
    );
    return next;
  }, []);

  const toggleInterested = useCallback((eventId: string): boolean => {
    let next = false;
    setFeedItems((prev) =>
      prev.map((it) => {
        if (it.feedType === 'event' && it.id === eventId) {
          next = !it.interested;
          return { ...it, interested: next };
        }
        return it;
      })
    );
    return next;
  }, []);

  return {
    subscribedBusinesses,
    feedItems,
    discoveryBusinesses,
    userPoints,
    rewardsSummary,
    loading,
    refreshing,
    refresh,
    subscribeToDiscovery,
    toggleBookmark,
    toggleInterested,
  };
}
