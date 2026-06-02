import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  usePersonalisedFeed,
  type FeedItem,
  type SubscribedBusiness,
} from '@/hooks/usePersonalisedFeed';
import UnifiedTopHeader from '@/components/feed/UnifiedTopHeader';
import { FeedFilterChips } from '@/components/feed/FeedFilterChips';
import { HeroDiscoveryBanner } from '@/components/feed/HeroDiscoveryBanner';
import { ValuePropositionStrip } from '@/components/feed/ValuePropositionStrip';
import { OfferFeedCard } from '@/components/feed/OfferFeedCard';
import { EventFeedCard } from '@/components/feed/EventFeedCard';
import { DiscoveryCard } from '@/components/feed/DiscoveryCard';
import PostFeedCard from '@/components/feed/PostFeedCard';
import { BusinessNudgeBanner } from '@/components/feed/BusinessNudgeBanner';
import { usePosts } from '@/contexts/PostsContext';
import type { BusinessPost } from '@/mocks/posts';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import apiClient from '@/services/apiClient';
import { useCoupons } from '@/contexts/CouponContext';
import { FullScreenFeedViewer, type ViewerEntry } from '@/components/feed/FullScreenFeedViewer';
import { useNotifications } from '@/hooks/useNotifications';

interface DiscoveryRenderItem {
  __kind: 'discovery';
  key: string;
  business: SubscribedBusiness;
}

interface FeedRenderItem {
  __kind: 'feed';
  key: string;
  item: FeedItem;
}

interface PostRenderItem {
  __kind: 'post';
  key: string;
  post: BusinessPost;
}

type RenderItem = FeedRenderItem | DiscoveryRenderItem | PostRenderItem;

const CURRENT_USER = { name: 'You', initials: 'YO', color: '#1A5C35' };

export default function PersonalisedFeedScreen() {
  const router = useRouter();
  const {
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
  } = usePersonalisedFeed();
  const { posts: businessPosts } = usePosts();

  const listRef = useRef<FlatList<RenderItem>>(null);
  const discoveryOffsetRef = useRef<number>(0);

  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMsg, setSnackMsg] = useState<string>('');
  const [activePanel, setActivePanel] = useState<{ cardId: string; panel: 'comments' | 'share' } | null>(null);
  const [searchActive, setSearchActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewerVisible, setViewerVisible] = useState<boolean>(false);
  const [viewerIndex, setViewerIndex] = useState<number>(0);

  const [selectedChip, setSelectedChip] = useState<string>('trending');
  const [showBusinessNudge, setShowBusinessNudge] = useState<boolean>(true); // TEMP: force true for debugging
  const isBookmarkedFilter = selectedChip === 'bookmarked';

  const { unreadCount } = useNotifications();
  useEffect(() => {
    const checkNudge = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('business_nudge_dismissed');
        if (dismissed) return;

        const { data: userData } = await apiClient.getCurrentUser();
        if (!userData) return;

        const { data: profile } = await apiClient.get<{ id: string }>(
          'profiles',
          { user_id: userData.id, profile_type: 'business' as never },
          { maybeSingle: true },
        );

        if (!profile) setShowBusinessNudge(true);
      } catch {
        // Suppress — banner stays hidden if checks fail
      }
    };
    checkNudge();
  }, []);

  const handleDismissNudge = useCallback(async () => {
    await AsyncStorage.setItem('business_nudge_dismissed', 'true');
    setShowBusinessNudge(false);
  }, []);

  const handleSetUpBusiness = useCallback(() => {
    router.push('/create-business-profile' as never);
  }, [router]);

  // Retain useCoupons import usage no-op to avoid unused import warning if needed
  useCoupons();

  const showToast = useCallback((msg: string) => {
    console.log('[PersonalisedFeed] toast:', msg);
    setSnackMsg(msg);
    setSnackVisible(true);
  }, []);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = searchActive && trimmedQuery.length > 0;

  const mergedData = useMemo<RenderItem[]>(() => {
    const out: RenderItem[] = [];
    let discoveryIdx = 0;
    const postEntries: PostRenderItem[] = businessPosts.map((p) => ({ __kind: 'post' as const, key: `p-${p.id}`, post: p }));
    const feedEntries: FeedRenderItem[] = feedItems.map((item) => ({ __kind: 'feed' as const, key: `f-${item.feedType}-${item.id}`, item }));
    const sorted: (FeedRenderItem | PostRenderItem)[] = [...postEntries, ...feedEntries].sort((a, b) => {
      const aTime = a.__kind === 'post' ? new Date(a.post.created_at).getTime() : new Date(a.item.createdAt).getTime();
      const bTime = b.__kind === 'post' ? new Date(b.post.created_at).getTime() : new Date(b.item.createdAt).getTime();
      return bTime - aTime;
    });

    if (isBookmarkedFilter) {
      const bookmarked = sorted.filter((entry) => {
        if (entry.__kind === 'post') return false;
        if (entry.__kind === 'feed' && entry.item.feedType === 'offer') {
          return entry.item.bookmarked;
        }
        return false;
      });

      bookmarked.forEach((entry, idx) => {
        out.push(entry);
        if ((idx + 1) % 4 === 0 && discoveryIdx < discoveryBusinesses.length) {
          const biz = discoveryBusinesses[discoveryIdx];
          out.push({ __kind: 'discovery', key: `d-${biz.id}`, business: biz });
          discoveryIdx += 1;
        }
      });
      return out;
    }

    if (isSearching) {
      const q = trimmedQuery;
      const filtered = sorted.filter((entry) => {
        if (entry.__kind === 'post') {
          const p = entry.post;
          return (
            p.business_name.toLowerCase().includes(q) ||
            p.text.toLowerCase().includes(q)
          );
        }
        const f = entry.item;
        if (f.feedType === 'offer') {
          return (
            f.businessName.toLowerCase().includes(q) ||
            f.title.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q)
          );
        }
        return (
          f.businessName.toLowerCase().includes(q) ||
          f.title.toLowerCase().includes(q) ||
          f.venue.toLowerCase().includes(q)
        );
      });
      return filtered;
    }

    sorted.forEach((entry, idx) => {
      out.push(entry);
      if ((idx + 1) % 4 === 0 && discoveryIdx < discoveryBusinesses.length) {
        const biz = discoveryBusinesses[discoveryIdx];
        out.push({ __kind: 'discovery', key: `d-${biz.id}`, business: biz });
        discoveryIdx += 1;
      }
    });
    while (discoveryIdx < discoveryBusinesses.length) {
      const biz = discoveryBusinesses[discoveryIdx];
      out.push({ __kind: 'discovery', key: `d-tail-${biz.id}`, business: biz });
      discoveryIdx += 1;
    }
    return out;
  }, [feedItems, discoveryBusinesses, businessPosts, isSearching, trimmedQuery, isBookmarkedFilter]);

  const firstDiscoveryIndex = useMemo(() => mergedData.findIndex((r) => r.__kind === 'discovery'), [mergedData]);

  const navigateToBusiness = useCallback((businessId: string) => {
    console.log('[PersonalisedFeed] navigate business', businessId);
    router.push(`/business-profile/${businessId}` as never);
  }, [router]);

  const navigateToRewards = useCallback(() => {
    console.log('[PersonalisedFeed] navigate rewards');
    router.push('/subscription-plans' as never);
  }, [router]);

  const viewerEntries = useMemo<ViewerEntry[]>(() => {
    const out: ViewerEntry[] = [];
    mergedData.forEach((r) => {
      if (r.__kind === 'post') out.push({ kind: 'post', key: r.key, post: r.post });
      else if (r.__kind === 'feed') out.push({ kind: 'feed', key: r.key, item: r.item });
    });
    return out;
  }, [mergedData]);

  const openViewerByEntryKey = useCallback((entryKey: string) => {
    const idx = viewerEntries.findIndex((e) => e.key === entryKey);
    if (idx < 0) return;
    setViewerIndex(idx);
    setViewerVisible(true);
  }, [viewerEntries]);

  const navigateToOffer = useCallback((offerId: string) => {
    console.log('[PersonalisedFeed] open offer in viewer', offerId);
    openViewerByEntryKey(`f-offer-${offerId}`);
  }, [openViewerByEntryKey]);

  const navigateToEvent = useCallback((eventId: string) => {
    console.log('[PersonalisedFeed] open event in viewer', eventId);
    openViewerByEntryKey(`f-event-${eventId}`);
  }, [openViewerByEntryKey]);

  const navigateToPostViewer = useCallback((postId: string) => {
    console.log('[PersonalisedFeed] open post in viewer', postId);
    openViewerByEntryKey(`p-${postId}`);
  }, [openViewerByEntryKey]);

  const handleSubscribe = useCallback((business: SubscribedBusiness) => {
    const picked = subscribeToDiscovery(business.id);
    if (picked) {
      showToast(`✅ Subscribed! You'll now earn points with ${picked.name}`);
    }
  }, [subscribeToDiscovery, showToast]);

  const scrollToDiscovery = useCallback(() => {
    if (firstDiscoveryIndex < 0 || !listRef.current) {
      showToast('Loading suggestions…');
      return;
    }
    try {
      listRef.current.scrollToIndex({ index: firstDiscoveryIndex, animated: true, viewPosition: 0 });
    } catch (e) {
      console.log('[PersonalisedFeed] scrollToIndex failed', e);
      listRef.current.scrollToOffset({ offset: discoveryOffsetRef.current, animated: true });
    }
  }, [firstDiscoveryIndex, showToast]);

  const setCardPanel = useCallback((cardId: string) => (panel: 'comments' | 'share' | null) => {
    setActivePanel((prev) => {
      if (panel === null) {
        if (prev?.cardId === cardId) return null;
        return prev;
      }
      return { cardId, panel };
    });
  }, []);

  const getCardPanel = useCallback((cardId: string): 'comments' | 'share' | null => {
    if (activePanel?.cardId === cardId) return activePanel.panel;
    return null;
  }, [activePanel]);

const header = useMemo(() => {
    if (isSearching) return null;
    return (
      <View>
        <HeroDiscoveryBanner
          onExplorePress={() => router.push('/(tabs)/marketplace' as never)}
        />
        {showBusinessNudge && (
          <BusinessNudgeBanner
            onDismiss={handleDismissNudge}
            onSetUpPress={handleSetUpBusiness}
          />
        )}
        <ValuePropositionStrip
          onCardPress={(destination, cardId) => {
            console.log('[PersonalisedFeed] value-prop tap', cardId, destination);
            if (cardId === 'earn') {
              scrollToDiscovery();
              return;
            }
            router.push(destination as never);
          }}
          onDiscoverPress={scrollToDiscovery}
        />
        {feedItems.length > 0 ? (
          <Text style={styles.sectionLabel}>My News Feed</Text>
        ) : null}
        <FeedFilterChips selected={selectedChip} onSelect={setSelectedChip} />
      </View>
    );
  }, [feedItems.length, selectedChip, isSearching, router, scrollToDiscovery, showBusinessNudge, handleDismissNudge, handleSetUpBusiness]);

  const listFooter = useMemo(() => null, [isSearching]);

  const renderItem = useCallback(({ item }: { item: RenderItem }) => {
    if (item.__kind === 'post') {
      const cardId = `post-${item.post.id}`;
      const postId = item.post.id;
      return (
        <PostFeedCard
          post={item.post}
          onImagePress={() => navigateToPostViewer(postId)}
          onShowToast={showToast}
          activePanel={getCardPanel(cardId)}
          onOpenPanel={(p) => setCardPanel(cardId)(p)}
          currentUser={CURRENT_USER}
        />
      );
    }
    if (item.__kind === 'discovery') {
      const cardId = `d-${item.business.id}`;
      const panel = getCardPanel(cardId) === 'share' ? 'share' : null;
      return (
        <DiscoveryCard
          business={item.business}
          onSubscribe={() => handleSubscribe(item.business)}
          onViewProfile={() => navigateToBusiness(item.business.id)}
          activePanel={panel as 'share' | null}
          onOpenPanel={(p) => setCardPanel(cardId)(p)}
          onShowToast={showToast}
        />
      );
    }
    const f = item.item;
    const cardId = `${f.feedType}-${f.id}`;
    if (f.feedType === 'offer') {
      return (
        <OfferFeedCard
          offer={f}
          onPress={() => navigateToOffer(f.id)}
          onToggleBookmark={() => toggleBookmark(f.id)}
          onShowToast={showToast}
          activePanel={getCardPanel(cardId)}
          onOpenPanel={(p) => setCardPanel(cardId)(p)}
          currentUser={CURRENT_USER}
        />
      );
    }
    return (
      <EventFeedCard
        event={f}
        onPress={() => navigateToEvent(f.id)}
        onToggleInterested={() => toggleInterested(f.id)}
        onShowToast={showToast}
        activePanel={getCardPanel(cardId)}
        onOpenPanel={(p) => setCardPanel(cardId)(p)}
        currentUser={CURRENT_USER}
      />
    );
  }, [handleSubscribe, navigateToBusiness, navigateToOffer, navigateToEvent, navigateToPostViewer, toggleBookmark, toggleInterested, showToast, getCardPanel, setCardPanel]);

  const emptyComponent = useMemo(() => {
    if (loading) return null;
    if (isSearching) {
      return (
        <View style={styles.emptyWrap} testID="feed-search-empty">
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No results for &quot;{searchQuery.trim()}&quot;</Text>
          <Text style={styles.emptySub}>
            Try searching for a business name, offer, or post.
          </Text>
        </View>
      );
    }
    if (feedItems.length > 0) return null;
    return (
      <View style={styles.emptyWrap} testID="feed-empty">
        <Text style={styles.emptyEmoji}>🪺</Text>
        <Text style={styles.emptyTitle}>Nothing new right now</Text>
        <Text style={styles.emptySub}>
          Your subscribed businesses haven&apos;t posted yet. Check back soon, or explore more below.
        </Text>
        <Pressable style={styles.emptyBtn} onPress={scrollToDiscovery} testID="feed-empty-discover">
          <Text style={styles.emptyBtnText}>Discover Businesses</Text>
        </Pressable>
      </View>
    );
  }, [loading, feedItems.length, scrollToDiscovery, isSearching, searchQuery]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <UnifiedTopHeader
        searchEnabled
        searchActive={searchActive}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchOpen={() => setSearchActive(true)}
        onSearchClose={() => { setSearchActive(false); setSearchQuery(''); }}
        unreadNotificationCount={unreadCount}
      />

      {loading ? (
        <FeedSkeleton />
      ) : (
        <FlatList
          ref={listRef}
          data={mergedData}
          keyExtractor={(it) => it.key}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListFooterComponent={listFooter}
          ListEmptyComponent={emptyComponent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#1A5C35"
              colors={["#1A5C35"]}
            />
          }
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            console.log('[PersonalisedFeed] scrollToIndexFailed', info);
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          }}
          testID="personalised-feed-list"
        />
      )}

      <FullScreenFeedViewer
        visible={viewerVisible}
        entries={viewerEntries}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
        onToggleBookmark={toggleBookmark}
        onToggleInterested={toggleInterested}
        onShowToast={showToast}
        currentUser={CURRENT_USER}
      />

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2400}
        style={styles.snackbar}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  safe: {
    backgroundColor: '#F8F7FF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A5C35',
    letterSpacing: -0.2,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A5C35',
  },
  emptySub: {
    fontSize: 13,
    color: '#1A5C35',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#1A5C35',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  snackbar: {
    backgroundColor: '#1A5C35',
    marginBottom: 20,
  },
});
