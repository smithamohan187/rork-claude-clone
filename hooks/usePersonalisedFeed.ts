import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getFeed, type FeedApiItem, type FeedMode, type RecommendedBusiness } from '@/api/services/feedService';
import { subscribeToBusiness } from '@/api/services/subscriptionService';
import { toggleSaveOffer } from '@/api/services/savedOfferService';
import { toggleSaveEvent } from '@/api/services/savedEventService';
import { toggleSavePost } from '@/api/services/savedPostService';
import { toggleLike as apiToggleLike } from '@/api/services/likesService';

export interface SubscribedBusiness {
  id: string;
  name: string;
  logoUrl: string;
  coverUrl: string | null;
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
  image_url: string | null;
  expiryDate: string | null;
  createdAt: string;
  bookmarked: boolean;
  like_count: number;
  liked_by_me: boolean;
  is_owner: boolean;
  comment_count: number;
}

export interface EventFeedItem {
  feedType: 'event';
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  title: string;
  description: string | null;
  image_url: string | null;
  venue: string;
  startDate: string | null;
  createdAt: string;
  interested: boolean;
  like_count: number;
  liked_by_me: boolean;
  is_owner: boolean;
  comment_count: number;
}

export interface PostFeedItem {
  feedType: 'post';
  id: string;
  type: 'post';
  business_id: string;
  business_name: string;
  business_logo: string;
  title: string;
  text: string;
  image_url: string | null;
  created_at: string;
  likes: number;
  comments: [];
  is_saved: boolean;
  like_count: number;
  liked_by_me: boolean;
  is_owner: boolean;
  comment_count: number;
}

export type FeedItem = OfferFeedItem | EventFeedItem;

export interface RewardSummary {
  id: string;
  title: string;
  emoji: string;
  pointsRequired: number;
  tierColor: string;
}

function mapToOffer(item: FeedApiItem): OfferFeedItem {
  return {
    feedType: 'offer',
    id: item.item_id,
    businessId: item.business_id,
    businessName: item.business_name,
    businessLogo: item.business_logo ?? '',
    title: item.title,
    description: item.content ?? '',
    image_url: item.image_url,
    expiryDate: item.relevant_date,
    createdAt: item.created_at,
    bookmarked: item.is_saved ?? false,
    like_count: item.like_count ?? 0,
    liked_by_me: item.liked_by_me ?? false,
    is_owner: item.is_owner ?? false,
    comment_count: item.comment_count ?? 0,
  };
}

function mapToEvent(item: FeedApiItem): EventFeedItem {
  return {
    feedType: 'event',
    id: item.item_id,
    businessId: item.business_id,
    businessName: item.business_name,
    businessLogo: item.business_logo ?? '',
    title: item.title,
    description: item.content,
    image_url: item.image_url,
    venue: item.business_name,
    startDate: item.relevant_date,
    createdAt: item.created_at,
    interested: item.is_saved ?? false,
    like_count: item.like_count ?? 0,
    liked_by_me: item.liked_by_me ?? false,
    is_owner: item.is_owner ?? false,
    comment_count: item.comment_count ?? 0,
  };
}

function mapToPost(item: FeedApiItem): PostFeedItem {
  return {
    feedType: 'post',
    id: item.item_id,
    type: 'post',
    business_id: item.business_id,
    business_name: item.business_name,
    business_logo: item.business_logo ?? '',
    title: item.title,
    text: item.content ?? '',
    image_url: item.image_url,
    created_at: item.created_at,
    likes: item.like_count ?? 0,
    comments: [],
    is_saved: item.is_saved ?? false,
    like_count: item.like_count ?? 0,
    liked_by_me: item.liked_by_me ?? false,
    is_owner: item.is_owner ?? false,
    comment_count: item.comment_count ?? 0,
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#1A5C35',
  Fitness: '#10B981',
  Beauty: '#EC4899',
  Retail: '#3B82F6',
  Events: '#00B246',
  Health: '#8B5CF6',
  Tech: '#F59E0B',
};

function mapToDiscovery(biz: RecommendedBusiness): SubscribedBusiness {
  return {
    id: biz.id,
    name: biz.name,
    logoUrl: biz.logo_url ?? '',
    coverUrl: biz.cover_url ?? null,
    category: biz.category,
    categoryColor: CATEGORY_COLORS[biz.category] ?? '#1A5C35',
    subscriberCount: biz.subscriber_count,
    bio: biz.description ?? '',
  };
}

export interface UsePersonalisedFeedResult {
  subscribedBusinesses: SubscribedBusiness[];
  feedItems: FeedItem[];
  postItems: PostFeedItem[];
  discoveryBusinesses: SubscribedBusiness[];
  mode: FeedMode | null;
  userPoints: number;
  rewardsSummary: RewardSummary | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  subscribeToDiscovery: (businessId: string) => Promise<void>;
  toggleBookmark: (offerId: string) => void;
  toggleInterested: (eventId: string) => void;
  toggleSavePost: (postId: string) => void;
  toggleFeedLike: (contentType: 'offer' | 'event' | 'post', contentId: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
}

export function usePersonalisedFeed(): UsePersonalisedFeedResult {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [postItems, setPostItems] = useState<PostFeedItem[]>([]);
  const [subscribedBusinesses] = useState<SubscribedBusiness[]>([]);
  const [discoveryBusinesses, setDiscoveryBusinesses] = useState<SubscribedBusiness[]>([]);
  const [mode, setMode] = useState<FeedMode | null>(null);
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const selectedCategoryRef = useRef<string | null>(null);

  const load = useCallback(async (isRefresh: boolean, category: string | null) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getFeed({ category: category ?? undefined, limit: 30, offset: 0 });
      if (!mountedRef.current) return;

      setMode(data.mode);

      if (data.mode === 'feed') {
        const rawItems = data.items as import('@/api/services/feedService').FeedApiItem[];
        const offers: OfferFeedItem[] = [];
        const events: EventFeedItem[] = [];
        const posts: PostFeedItem[] = [];
        for (const item of rawItems) {
          if (item.item_type === 'offer') offers.push(mapToOffer(item));
          else if (item.item_type === 'event') events.push(mapToEvent(item));
          else if (item.item_type === 'post') posts.push(mapToPost(item));
        }
        setFeedItems([...offers, ...events]);
        setPostItems(posts);
        setDiscoveryBusinesses([]);
      } else {
        setFeedItems([]);
        setPostItems([]);
        const recs = data.items as import('@/api/services/feedService').RecommendedBusiness[];
        setDiscoveryBusinesses(recs.map(mapToDiscovery));
      }
    } catch (err) {
      if (__DEV__) console.log('[usePersonalisedFeed] load error', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      load(false, selectedCategoryRef.current);
      return () => {
        mountedRef.current = false;
      };
    }, [load])
  );

  const refresh = useCallback(async () => {
    await load(true, selectedCategoryRef.current);
  }, [load]);

  const setSelectedCategory = useCallback((cat: string | null) => {
    selectedCategoryRef.current = cat;
    setSelectedCategoryState(cat);
    load(false, cat);
  }, [load]);

  const subscribeToDiscovery = useCallback(async (businessId: string) => {
    try {
      await subscribeToBusiness(businessId);
      setDiscoveryBusinesses((prev) => prev.filter((b) => b.id !== businessId));
      await load(true, selectedCategoryRef.current);
    } catch (err) {
      if (__DEV__) console.log('[usePersonalisedFeed] subscribeToDiscovery error', err);
    }
  }, [load]);

  const toggleBookmark = useCallback((offerId: string): void => {
    setFeedItems((prev) =>
      prev.map((it) => {
        if (it.feedType === 'offer' && it.id === offerId) {
          return { ...it, bookmarked: !it.bookmarked };
        }
        return it;
      })
    );
    // Persist to backend; revert optimistic update on failure
    toggleSaveOffer(offerId).catch(() => {
      setFeedItems((prev) =>
        prev.map((it) =>
          it.feedType === 'offer' && it.id === offerId
            ? { ...it, bookmarked: !it.bookmarked }
            : it
        )
      );
    });
  }, []);

  const toggleInterested = useCallback((eventId: string): void => {
    setFeedItems((prev) =>
      prev.map((it) => {
        if (it.feedType === 'event' && it.id === eventId) {
          return { ...it, interested: !it.interested };
        }
        return it;
      })
    );
    // Persist to backend; revert optimistic update on failure
    toggleSaveEvent(eventId).catch(() => {
      setFeedItems((prev) =>
        prev.map((it) =>
          it.feedType === 'event' && it.id === eventId
            ? { ...it, interested: !it.interested }
            : it
        )
      );
    });
  }, []);

  const toggleFeedLike = useCallback((contentType: 'offer' | 'event' | 'post', contentId: string): void => {
    if (contentType === 'offer' || contentType === 'event') {
      // Optimistic update
      setFeedItems((prev) =>
        prev.map((it) => {
          if (it.feedType === contentType && it.id === contentId) {
            const wasLiked = it.liked_by_me;
            return { ...it, liked_by_me: !wasLiked, like_count: Math.max(0, it.like_count + (wasLiked ? -1 : 1)) };
          }
          return it;
        })
      );
      apiToggleLike(contentType, contentId)
        .then((res) => {
          setFeedItems((prev) =>
            prev.map((it) =>
              it.feedType === contentType && it.id === contentId
                ? { ...it, liked_by_me: res.liked, like_count: res.like_count }
                : it
            )
          );
        })
        .catch(() => {
          setFeedItems((prev) =>
            prev.map((it) => {
              if (it.feedType === contentType && it.id === contentId) {
                const wasLiked = !it.liked_by_me;
                return { ...it, liked_by_me: wasLiked, like_count: Math.max(0, it.like_count + (wasLiked ? 1 : -1)) };
              }
              return it;
            })
          );
        });
    } else {
      // post
      setPostItems((prev) =>
        prev.map((it) => {
          if (it.id === contentId) {
            const wasLiked = it.liked_by_me;
            return { ...it, liked_by_me: !wasLiked, like_count: Math.max(0, it.like_count + (wasLiked ? -1 : 1)) };
          }
          return it;
        })
      );
      apiToggleLike('post', contentId)
        .then((res) => {
          setPostItems((prev) =>
            prev.map((it) =>
              it.id === contentId ? { ...it, liked_by_me: res.liked, like_count: res.like_count } : it
            )
          );
        })
        .catch(() => {
          setPostItems((prev) =>
            prev.map((it) => {
              if (it.id === contentId) {
                const wasLiked = !it.liked_by_me;
                return { ...it, liked_by_me: wasLiked, like_count: Math.max(0, it.like_count + (wasLiked ? 1 : -1)) };
              }
              return it;
            })
          );
        });
    }
  }, []);

  const toggleSavePostCallback = useCallback((postId: string): void => {
    setPostItems((prev) =>
      prev.map((it) => {
        if (it.id === postId) {
          return { ...it, is_saved: !it.is_saved };
        }
        return it;
      })
    );
    // Persist to backend; revert optimistic update on failure
    toggleSavePost(postId).catch(() => {
      setPostItems((prev) =>
        prev.map((it) =>
          it.id === postId ? { ...it, is_saved: !it.is_saved } : it
        )
      );
    });
  }, []);

  return {
    subscribedBusinesses,
    feedItems,
    postItems,
    discoveryBusinesses,
    mode,
    userPoints: 0,
    rewardsSummary: null,
    loading,
    refreshing,
    refresh,
    subscribeToDiscovery,
    toggleBookmark,
    toggleInterested,
    toggleSavePost: toggleSavePostCallback,
    toggleFeedLike,
    selectedCategory,
    setSelectedCategory,
  };
}
