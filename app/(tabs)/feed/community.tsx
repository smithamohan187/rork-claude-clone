import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Pressable,
  RefreshControl,
  TextInput,
  Platform,
  Modal,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { MessageCircle, X, Search, Share2, Megaphone, Users, SlidersHorizontal, Shield, ShoppingBag, Gift, User as UserIcon, ChevronRight, Settings, UserPlus, MapPin, Clock, Flame, Calendar, Ticket, ArrowRight, Target, Heart, ChevronUp, LayoutDashboard, Link, Sparkles, Settings2, PenTool, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import AppHeader from '@/components/AppHeader';
import { posts, mockLocalEvents, postLocalData, touchPointsPinnedPost } from '@/mocks/data';
import type { LocalEvent } from '@/mocks/data';
import type { Post } from '@/types';
import PostCard from '@/components/feed/FeedPostCard';
import WelcomeVideoPost from '@/components/feed/WelcomeVideoPost';
import BusinessVideoPost from '@/components/feed/BusinessVideoPost';
import VideoActionBar from '@/components/feed/VideoActionBar';
import GettingStartedTutorial from '@/components/feed/GettingStartedTutorial';
import ReferralProcessInfographic from '@/components/feed/ReferralProcessInfographic';
import { BrandedShareGrid } from '@/components/feed/BrandedShareGrid';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const EVENT_CATEGORY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  food: { color: '#1A5C35', bg: '#FFF7ED', icon: 'utensils' },
  fitness: { color: '#10B981', bg: '#ECFDF5', icon: 'dumbbell' },
  music: { color: '#00B246', bg: '#E8F5EE', icon: 'music' },
  art: { color: '#EC4899', bg: '#FDF2F8', icon: 'palette' },
  community: { color: '#0EA5E9', bg: '#F0F9FF', icon: 'heart' },
  wellness: { color: '#14B8A6', bg: '#F0FDFA', icon: 'leaf' },
  market: { color: '#00B246', bg: '#FAF5FF', icon: 'store' },
  nightlife: { color: '#F43F5E', bg: '#FFF1F2', icon: 'wine' },
};

const EventCard = React.memo(function EventCard({ event, onPress }: { event: LocalEvent; onPress: () => void }) {
  const config = EVENT_CATEGORY_CONFIG[event.category] || EVENT_CATEGORY_CONFIG.community;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={eventStyles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={eventStyles.imageWrap}>
          <Image source={{ uri: event.image }} style={eventStyles.image} contentFit="cover" />
          <View style={eventStyles.imageOverlay} />
          {event.isHot && (
            <View style={eventStyles.hotBadge}>
              <Flame size={10} color="#fff" />
              <Text style={eventStyles.hotText}>HOT</Text>
            </View>
          )}
          <View style={eventStyles.dateBadge}>
            <Text style={eventStyles.dateBadgeDay}>{event.date.split(', ')[1]?.split(' ')[1] || event.date.split(' ')[1]}</Text>
            <Text style={eventStyles.dateBadgeMonth}>{event.date.split(', ')[1]?.split(' ')[0] || event.date.split(' ')[0]}</Text>
          </View>
          <View style={eventStyles.imageMeta}>
            <View style={[eventStyles.categoryPill, { backgroundColor: config.color }]}>
              <Text style={eventStyles.categoryPillText}>{event.category.charAt(0).toUpperCase() + event.category.slice(1)}</Text>
            </View>
            {!event.isFree && (
              <View style={eventStyles.pricePill}>
                <Ticket size={10} color="#fff" />
                <Text style={eventStyles.priceText}>{event.price}</Text>
              </View>
            )}
            {event.isFree && (
              <View style={[eventStyles.pricePill, { backgroundColor: '#10B981' }]}>
                <Text style={eventStyles.priceText}>FREE</Text>
              </View>
            )}
          </View>
        </View>
        <View style={eventStyles.cardBody}>
          <Text style={eventStyles.eventTitle} numberOfLines={2}>{event.title}</Text>
          <Text style={eventStyles.eventDesc} numberOfLines={2}>{event.description}</Text>
          <View style={eventStyles.metaRow}>
            <MapPin size={12} color={Colors.textTertiary} />
            <Text style={eventStyles.metaText} numberOfLines={1}>{event.location}</Text>
          </View>
          <View style={eventStyles.metaRow}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={eventStyles.metaText}>{event.time}</Text>
          </View>
          <View style={eventStyles.cardFooter}>
            <View style={eventStyles.hostRow}>
              <Image source={{ uri: event.hostAvatar }} style={eventStyles.hostAvatar} />
              <Text style={eventStyles.hostName} numberOfLines={1}>{event.host}</Text>
            </View>
            <View style={eventStyles.attendeesBadge}>
              <Users size={11} color={config.color} />
              <Text style={[eventStyles.attendeesText, { color: config.color }]}>{event.attendees}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

function EventsSection({ onEventPress }: { onEventPress: (event: LocalEvent) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = useMemo(() => [
    { key: 'all', label: 'All Events' },
    { key: 'food', label: 'Food & Drink' },
    { key: 'wellness', label: 'Wellness' },
    { key: 'art', label: 'Arts' },
    { key: 'community', label: 'Community' },
    { key: 'nightlife', label: 'Nightlife' },
    { key: 'market', label: 'Markets' },
  ], []);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'all') return mockLocalEvents;
    return mockLocalEvents.filter(e => e.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <View style={eventStyles.section}>
      <View style={eventStyles.sectionHeader}>
        <View style={eventStyles.sectionTitleRow}>
          <View style={eventStyles.sectionIconWrap}>
            <Calendar size={16} color="#fff" />
          </View>
          <View>
            <Text style={eventStyles.sectionTitle}>Upcoming Events</Text>
            <Text style={eventStyles.sectionSubtitle}>What's happening near you</Text>
          </View>
        </View>
        <Pressable style={eventStyles.seeAllBtn} onPress={() => console.log('See all events')}>
          <Text style={eventStyles.seeAllText}>See All</Text>
          <ArrowRight size={14} color={Colors.teal} />
        </Pressable>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item.key}
        contentContainerStyle={eventStyles.categoryScroll}
        renderItem={({ item: cat }) => {
          const isActive = selectedCategory === cat.key;
          return (
            <Pressable
              style={[eventStyles.categoryChip, isActive && eventStyles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={[eventStyles.categoryChipText, isActive && eventStyles.categoryChipTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={eventStyles.eventsScroll}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH * 0.72 + 12}
        renderItem={({ item: event }) => (
          <EventCard event={event} onPress={() => onEventPress(event)} />
        )}
        ListEmptyComponent={
          <View style={eventStyles.emptyEvents}>
            <Calendar size={28} color={Colors.textTertiary} />
            <Text style={eventStyles.emptyEventsText}>No events in this category</Text>
          </View>
        }
      />
    </View>
  );
}

const eventStyles = StyleSheet.create({
  section: {
    marginTop: 6,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.teal,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryChipActive: {
    backgroundColor: Colors.navyDark,
    borderColor: Colors.navyDark,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  eventsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 6,
  },
  card: {
    width: SCREEN_WIDTH * 0.72,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageWrap: {
    position: 'relative' as const,
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  hotBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  hotText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  dateBadge: {
    position: 'absolute' as const,
    top: 10,
    left: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBadgeDay: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.navyDark,
    lineHeight: 20,
  },
  dateBadgeMonth: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  imageMeta: {
    position: 'absolute' as const,
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  priceText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  cardBody: {
    padding: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  hostAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  hostName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  attendeesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  attendeesText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  emptyEvents: {
    width: SCREEN_WIDTH * 0.72,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    gap: 8,
  },
  emptyEventsText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
});

function FullScreenFeedViewer({ visible, posts: feedPosts, initialIndex, onClose }: { visible: boolean; posts: Post[]; initialIndex: number; onClose: () => void }) {
  const flatListRef = useRef<FlatList<Post>>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [shareSheetOpen, setShareSheetOpen] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const router = useRouter();

  const postsWithImages = useMemo(() => feedPosts.filter(p => !!p.image), [feedPosts]);

  const actualInitialIndex = useMemo(() => {
    const targetPost = feedPosts[initialIndex];
    if (!targetPost) return 0;
    return postsWithImages.findIndex(p => p.id === targetPost.id);
  }, [feedPosts, initialIndex, postsWithImages]);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(actualInitialIndex >= 0 ? actualInitialIndex : 0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, actualInitialIndex, fadeAnim]);

  const toggleOverlay = useCallback(() => {
    setShowOverlay(prev => {
      const next = !prev;
      Animated.timing(overlayOpacity, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }).start();
      return next;
    });
  }, [overlayOpacity]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  const renderFullScreenPost = useCallback(({ item, index }: { item: Post; index: number }) => {
    const _isActive = index === currentIndex;
    return (
      <Pressable style={fullScreenStyles.page} onPress={toggleOverlay}>
        <Image source={{ uri: item.image! }} style={fullScreenStyles.fullImage} contentFit="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.25, 0.55, 1]}
          style={fullScreenStyles.gradient}
        />
        <Animated.View style={[fullScreenStyles.overlay, { opacity: overlayOpacity }]} pointerEvents={showOverlay ? 'auto' : 'none'}>
          <View style={fullScreenStyles.topBar}>
            <Pressable onPress={onClose} style={fullScreenStyles.closeButton} hitSlop={12}>
              <X size={24} color="#fff" />
            </Pressable>
            <View style={fullScreenStyles.counterPill}>
              <Text style={fullScreenStyles.counterText}>{index + 1} / {postsWithImages.length}</Text>
            </View>
          </View>

          <View style={fullScreenStyles.bottomContent}>
            <View style={fullScreenStyles.authorSection}>
              <Pressable style={fullScreenStyles.authorRow} onPress={() => { onClose(); setTimeout(() => router.push(`/business/${item.author.id}` as never), 300); }}>
                <Image source={{ uri: item.author.avatar }} style={fullScreenStyles.authorAvatar} />
                <View style={fullScreenStyles.authorTextWrap}>
                  <Text style={fullScreenStyles.authorName}>{item.author.name}</Text>
                  <Text style={fullScreenStyles.authorTime}>{item.createdAt}</Text>
                </View>
              </Pressable>
              {item.type === 'promotion' && (
                <View style={fullScreenStyles.promoPill}>
                  <Megaphone size={10} color="#000" />
                  <Text style={fullScreenStyles.promoText}>Promo</Text>
                </View>
              )}
            </View>
            <Text style={fullScreenStyles.postText} numberOfLines={4}>{item.content}</Text>
            <View style={fullScreenStyles.statsRow}>
              <View style={fullScreenStyles.statItem}>
                <MessageCircle size={16} color="#fff" />
                <Text style={fullScreenStyles.statText}>{item.comments}</Text>
              </View>
              <View style={fullScreenStyles.statItem}>
                <Share2 size={16} color="#fff" />
                <Text style={fullScreenStyles.statText}>{item.shares}</Text>
              </View>
              <View style={fullScreenStyles.statItem}>
                <Heart size={16} color={item.isLiked ? '#EF4444' : '#fff'} fill={item.isLiked ? '#EF4444' : 'none'} />
                <Text style={fullScreenStyles.statText}>{item.likes}</Text>
              </View>
            </View>
          </View>

          <View style={fullScreenStyles.sideActions}>
            <Pressable style={fullScreenStyles.sideBtn}>
              <Heart size={26} color={item.isLiked ? '#EF4444' : '#fff'} fill={item.isLiked ? '#EF4444' : 'none'} />
              <Text style={fullScreenStyles.sideBtnText}>{item.likes}</Text>
            </Pressable>
            <Pressable style={fullScreenStyles.sideBtn}>
              <MessageCircle size={26} color="#fff" />
              <Text style={fullScreenStyles.sideBtnText}>{item.comments}</Text>
            </Pressable>
            <Pressable style={fullScreenStyles.sideBtn} onPress={() => setShareSheetOpen(true)} testID="community-fs-share">
              <Share2 size={26} color="#fff" />
              <Text style={fullScreenStyles.sideBtnText}>{item.shares}</Text>
            </Pressable>
            <Pressable
              style={fullScreenStyles.sideBtn}
              onPress={() => { onClose(); setTimeout(() => router.push(`/my-referrals?postId=${encodeURIComponent(item.id)}` as never), 280); }}
              testID="community-fs-refer"
            >
              <UserPlus size={26} color="#fff" />
              <Text style={fullScreenStyles.sideBtnText}>Refer</Text>
            </Pressable>
            <Pressable style={fullScreenStyles.sideBtn}>
              <Gift size={26} color="#fff" />
              <Text style={fullScreenStyles.sideBtnText}>Rewards</Text>
            </Pressable>
          </View>

          {postsWithImages.length > 1 && (
            <View style={fullScreenStyles.scrollHint}>
              <ChevronUp size={16} color="rgba(255,255,255,0.5)" />
              <Text style={fullScreenStyles.scrollHintText}>Swipe for more</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    );
  }, [currentIndex, toggleOverlay, showOverlay, overlayOpacity, onClose, postsWithImages.length, router]);

  const activeShareItem = postsWithImages[currentIndex];
  const shareLink = activeShareItem ? `https://touchpoint.app/post/${activeShareItem.id}` : '';
  const shareMessage = activeShareItem
    ? `Check out this post by ${activeShareItem.author.name} on TouchPoint! ${shareLink}`
    : '';

  if (!visible || postsWithImages.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[fullScreenStyles.container, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={postsWithImages}
          keyExtractor={(item) => `fs-${item.id}`}
          renderItem={renderFullScreenPost}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialScrollIndex={actualInitialIndex >= 0 ? actualInitialIndex : 0}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          decelerationRate="fast"
          bounces={false}
        />
        {shareSheetOpen ? (
          <Pressable style={fullScreenStyles.shareBackdrop} onPress={() => setShareSheetOpen(false)}>
            <Pressable style={fullScreenStyles.shareCard} onPress={() => undefined}>
              <View style={fullScreenStyles.shareGrabber} />
              <View style={fullScreenStyles.shareHeader}>
                <Text style={fullScreenStyles.shareTitle}>Share</Text>
                <Pressable onPress={() => setShareSheetOpen(false)} hitSlop={12}>
                  <X size={22} color={Colors.text} />
                </Pressable>
              </View>
              <View style={fullScreenStyles.shareBody}>
                <BrandedShareGrid
                  message={shareMessage}
                  link={shareLink}
                  emailSubject={activeShareItem ? `${activeShareItem.author.name} on TouchPoint` : 'TouchPoint'}
                  onToast={(m) => { setShareToast(m); setShareSheetOpen(false); }}
                  testIDPrefix="community-fs-share"
                />
              </View>
              {shareToast ? <Text style={fullScreenStyles.shareToast}>{shareToast}</Text> : null}
            </Pressable>
          </Pressable>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

const fullScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative' as const,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterPill: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  bottomContent: {
    position: 'absolute' as const,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 60,
    paddingHorizontal: 16,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  authorTextWrap: {
    marginLeft: 10,
  },
  authorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  authorTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '400' as const,
    marginTop: 1,
  },
  promoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  promoText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#000',
  },
  postText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  sideActions: {
    position: 'absolute' as const,
    right: 12,
    bottom: Platform.OS === 'ios' ? 120 : 100,
    alignItems: 'center',
    gap: 20,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 4,
  },
  sideBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shareBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  shareCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
  },
  shareGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8F5EE',
    alignSelf: 'center',
    marginTop: 8,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },
  shareTitle: { fontSize: 17, fontWeight: '800' as const, color: '#1A5C35' },
  shareBody: { paddingTop: 4, paddingBottom: 4 },
  shareToast: { textAlign: 'center', color: '#0F6E56', fontWeight: '700' as const, marginTop: 10 },
  scrollHint: {
    position: 'absolute' as const,
    bottom: Platform.OS === 'ios' ? 50 : 30,
    alignSelf: 'center',
    alignItems: 'center',
  },
  scrollHintText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});

export default function FeedScreen() {
  const { accountType, currentUser } = useAuth();
  const { announcements } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);

  const mainListRef = useRef<FlatList<Post>>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const tabNavigator = navigation.getParent();
    if (!tabNavigator) return;
    const unsubscribe = tabNavigator.addListener('tabPress' as any, () => {
      mainListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<LocalEvent | null>(null);
  const [fullScreenIndex, setFullScreenIndex] = useState<number>(-1);
  const [showRewardChoice, setShowRewardChoice] = useState<boolean>(false);
  const [bookmarkTooltipVisible, setBookmarkTooltipVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!bookmarkTooltipVisible) return;
    const t = setTimeout(() => setBookmarkTooltipVisible(false), 1500);
    return () => clearTimeout(t);
  }, [bookmarkTooltipVisible]);

  const router = useRouter();

  const filteredPosts = useMemo(() => {
    const adminPosts = announcements.filter(a => a.status === 'active');
    const regularPosts = posts.filter(p => p.status !== 'removed');

    let basePosts: Post[];
    if (accountType === 'business') {
      basePosts = regularPosts.filter(p => p.author.id === currentUser.id);
    } else {
      basePosts = [touchPointsPinnedPost, ...adminPosts, ...regularPosts];
    }

    if (!searchQuery.trim()) return basePosts;
    const q = searchQuery.toLowerCase().trim();
    return basePosts.filter((post) => {
      const localInfo = postLocalData.find(d => d.postId === post.id);
      return (
        post.author.name.toLowerCase().includes(q) ||
        post.type.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        localInfo?.businessLocation.neighborhood.toLowerCase().includes(q) ||
        localInfo?.localHashtags.some(t => t.toLowerCase().includes(q)) ||
        localInfo?.businessLocation.localTags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, announcements, accountType, currentUser.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const menuItems = useMemo(() => {
    if (accountType === 'business') {
      return [
        { label: 'Business listing', icon: ShoppingBag, route: '/business/b1' },
        { label: 'My promotions', icon: Megaphone, route: '/(tabs)/marketplace' },
        { label: 'Rewards Set-up', icon: Gift, route: '__reward_choice__' },
        { label: 'Invite new BizCom members', icon: UserPlus, route: '/invite' },
        { label: 'Referral Request', icon: Link, route: '/referral-request' },
        { label: 'BizCom dashboard', icon: LayoutDashboard, route: '/bizcom-dashboard' },
        { label: 'TouchPoint Verification', icon: ShieldCheck, route: '/touchpoints-verification' },
        { label: 'Subscriptions', icon: Settings, route: '/manage-subscription' },
        { label: 'Admin Login', icon: Shield, route: '/admin-login' },
      ];
    }
    return [
      { label: 'Explore Businesses', icon: ShoppingBag, route: '/(tabs)/marketplace' },
      { label: 'Invite a Friend', icon: UserPlus, route: '/invite' },
      { label: 'Invite a new business to join', icon: ShoppingBag, route: '/invite-business' },
      { label: 'My Profile', icon: UserIcon, route: '/(tabs)/profile' },
    ];
  }, [accountType]);

  const handleEventPress = useCallback((event: LocalEvent) => {
    setSelectedEvent(event);
    console.log('Event pressed:', event.title);
  }, []);

  const handleImagePress = useCallback((post: Post) => {
    const idx = filteredPosts.findIndex(p => p.id === post.id);
    if (idx >= 0) {
      console.log('Opening full-screen viewer at index:', idx, 'post:', post.id);
      setFullScreenIndex(idx);
    }
  }, [filteredPosts]);

  const headerElement = useMemo(() => (
    <View>
      <View style={accountType === 'personal' ? styles.feedHeaderPersonal : styles.feedHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={accountType === 'personal' ? styles.menuIconBtnPersonal : styles.menuIconBtn}
            activeOpacity={0.7}
            onPress={() => setMenuVisible(true)}
            testID="feed-menu-btn"
          >
            <SlidersHorizontal size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <AppHeader />
            {accountType === 'business' && (
              <Text style={styles.subGreeting}>Manage my Business</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.headerBookmarkBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/saved-activity' as any)}
            onLongPress={() => setBookmarkTooltipVisible(true)}
            accessibilityLabel="Bookmarks"
            accessibilityHint="Open your bookmarks"
            testID="feed-header-bookmarks-btn"
          >
            <Heart size={20} color={Colors.bannerText} />
          </TouchableOpacity>
          <Image source={{ uri: currentUser.avatar }} style={styles.headerAvatar} />
          {bookmarkTooltipVisible && (
            <View style={styles.headerTooltip} pointerEvents="none">
              <Text style={styles.headerTooltipText}>Bookmarks</Text>
            </View>
          )}
        </View>

        {accountType === 'business' && (
          <TouchableOpacity style={styles.createPostBtn} activeOpacity={0.8} onPress={() => router.push('/create-post' as any)}>
            <Megaphone size={18} color={Colors.navyDark} />
            <Text style={styles.createPostText}>Create New Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {accountType === 'business' && (
        <View style={styles.pointsBannerContainer}>
          <View style={styles.pointsBannerInner}>
            <Target size={16} color="#F59E0B" />
            <Text style={styles.pointsBannerText}>TouchPoint for Business owners</Text>
          </View>
        </View>
      )}

      {accountType === 'business' && (
        <BusinessVideoPost />
      )}
      {accountType === 'business' && (
        <VideoActionBar videoTitle="TouchPoint Business Guide" videoType="business" />
      )}

      {accountType === 'business' && (
        <GettingStartedTutorial />
      )}

      {accountType === 'business' && (
        <ReferralProcessInfographic />
      )}

      <View style={styles.searchBarContainer}>
        <View style={styles.searchBarInner}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search businesses, neighborhoods, hashtags..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            testID="feed-search-bar"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {accountType !== 'business' && (
        <View style={styles.welcomeBannerContainer}>
          <LinearGradient
            colors={[Colors.navyDark, Colors.navyMid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.welcomeBannerGradient}
          >
            <Sparkles size={18} color="#F59E0B" />
            <Text style={styles.welcomeBannerText}>Welcome to TouchPoint</Text>
          </LinearGradient>
        </View>
      )}

      {accountType !== 'business' && (
        <WelcomeVideoPost />
      )}
      {accountType !== 'business' && (
        <VideoActionBar videoTitle="TouchPoint Welcome Tour" videoType="welcome" />
      )}

      {accountType !== 'business' && (
        <EventsSection onEventPress={handleEventPress} />
      )}
    </View>
  ), [accountType, currentUser, searchQuery, router, handleEventPress]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop} />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuPanel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Navigate</Text>
              <Pressable onPress={() => setMenuVisible(false)} hitSlop={10}>
                <X size={20} color={Colors.text} />
              </Pressable>
            </View>
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  idx === menuItems.length - 1 && styles.menuItemLast,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuVisible(false);
                  if (item.route === '__reward_choice__') {
                    setTimeout(() => setShowRewardChoice(true), 300);
                  } else {
                    console.log('[MENU NAV] Navigating to:', item.route);
                    setTimeout(() => router.push(item.route as never), 300);
                  }
                }}
              >
                <View style={styles.menuItemIcon}>
                  <item.icon size={20} color={item.label === 'Admin Login' ? '#0D9488' : Colors.navyDark} />
                </View>
                <Text style={[
                  styles.menuItemLabel,
                  item.label === 'Admin Login' && styles.menuItemLabelAdmin,
                ]}>{item.label}</Text>
                <ChevronRight size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showRewardChoice}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowRewardChoice(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowRewardChoice(false)}>
          <Pressable style={styles.rewardChoicePanel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.rewardChoiceHeader}>
              <Text style={styles.rewardChoiceTitle}>Create a Rewards Program</Text>
              <Pressable onPress={() => setShowRewardChoice(false)} hitSlop={10}>
                <X size={20} color={Colors.text} />
              </Pressable>
            </View>
            <Text style={styles.rewardChoiceSubtitle}>Choose how you'd like to set up your rewards program</Text>

            <TouchableOpacity
              style={styles.rewardOptionCard}
              activeOpacity={0.7}
              onPress={() => {
                setShowRewardChoice(false);
                setTimeout(() => router.push('/simple-reward-setup' as never), 300);
              }}
            >
              <View style={[styles.rewardOptionIcon, { backgroundColor: '#0D9488' + '14' }]}>
                <Sparkles size={24} color="#0D9488" />
              </View>
              <View style={styles.rewardOptionContent}>
                <Text style={styles.rewardOptionTitle}>Simple Set-Up</Text>
                <Text style={styles.rewardOptionDesc}>Quick and easy rewards in minutes</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rewardOptionCard}
              activeOpacity={0.7}
              onPress={() => {
                setShowRewardChoice(false);
                setTimeout(() => router.push('/reward-settings' as never), 300);
              }}
            >
              <View style={[styles.rewardOptionIcon, { backgroundColor: '#E65100' + '14' }]}>
                <Settings2 size={24} color="#E65100" />
              </View>
              <View style={styles.rewardOptionContent}>
                <Text style={styles.rewardOptionTitle}>Advanced Set-Up</Text>
                <Text style={styles.rewardOptionDesc}>Configure points, tiers, rules and reward details</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rewardOptionCard}
              activeOpacity={0.7}
              onPress={() => {
                setShowRewardChoice(false);
                console.log('[REWARD CHOICE] Navigating to personalised-request');
                setTimeout(() => router.push('/personalised-request' as never), 300);
              }}
            >
              <View style={[styles.rewardOptionIcon, { backgroundColor: '#00B246' + '14' }]}>
                <PenTool size={24} color="#00B246" />
              </View>
              <View style={styles.rewardOptionContent}>
                <Text style={styles.rewardOptionTitle}>Personalised Request</Text>
                <Text style={styles.rewardOptionDesc}>Submit a custom rewards brief tailored to your business</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rewardChoiceDismiss}
              activeOpacity={0.7}
              onPress={() => setShowRewardChoice(false)}
            >
              <Text style={styles.rewardChoiceDismissText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        ref={mainListRef}
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} onBusinessPress={(id) => router.push(`/business/${id}` as never)} onRewardsPress={(id) => router.push(`/business-rewards/${id}` as never)} isBusinessMode={accountType === 'business'} onImagePress={handleImagePress} />}
        ListHeaderComponent={headerElement}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      />

      <Modal
        visible={selectedEvent !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </Modal>

      <FullScreenFeedViewer
        visible={fullScreenIndex >= 0}
        posts={filteredPosts}
        initialIndex={fullScreenIndex}
        onClose={() => setFullScreenIndex(-1)}
      />
    </View>
  );
}

function EventDetailModal({ event, onClose }: { event: LocalEvent; onClose: () => void }) {
  const config = EVENT_CATEGORY_CONFIG[event.category] || EVENT_CATEGORY_CONFIG.community;

  return (
    <View style={eventDetailStyles.overlay}>
      <Pressable style={eventDetailStyles.backdrop} onPress={onClose} />
      <View style={eventDetailStyles.sheet}>
        <View style={eventDetailStyles.handleBar} />
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={eventDetailStyles.heroWrap}>
            <Image source={{ uri: event.image }} style={eventDetailStyles.heroImage} contentFit="cover" />
            <View style={eventDetailStyles.heroOverlay} />
            <Pressable style={eventDetailStyles.closeBtn} onPress={onClose} hitSlop={12}>
              <X size={20} color="#fff" />
            </Pressable>
            <View style={eventDetailStyles.heroBadges}>
              <View style={[eventDetailStyles.heroCategoryPill, { backgroundColor: config.color }]}>
                <Text style={eventDetailStyles.heroCategoryText}>{event.category.charAt(0).toUpperCase() + event.category.slice(1)}</Text>
              </View>
              {event.isHot && (
                <View style={eventDetailStyles.heroHotBadge}>
                  <Flame size={11} color="#fff" />
                  <Text style={eventDetailStyles.heroHotText}>Trending</Text>
                </View>
              )}
            </View>
          </View>

          <View style={eventDetailStyles.body}>
            <Text style={eventDetailStyles.title}>{event.title}</Text>

            <View style={eventDetailStyles.infoCards}>
              <View style={eventDetailStyles.infoCard}>
                <View style={[eventDetailStyles.infoIconWrap, { backgroundColor: '#FFF7ED' }]}>
                  <Calendar size={16} color="#1A5C35" />
                </View>
                <View>
                  <Text style={eventDetailStyles.infoLabel}>Date</Text>
                  <Text style={eventDetailStyles.infoValue}>{event.date}</Text>
                </View>
              </View>
              <View style={eventDetailStyles.infoCard}>
                <View style={[eventDetailStyles.infoIconWrap, { backgroundColor: '#F0F9FF' }]}>
                  <Clock size={16} color="#0EA5E9" />
                </View>
                <View>
                  <Text style={eventDetailStyles.infoLabel}>Time</Text>
                  <Text style={eventDetailStyles.infoValue}>{event.time}</Text>
                </View>
              </View>
              <View style={eventDetailStyles.infoCard}>
                <View style={[eventDetailStyles.infoIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <MapPin size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={eventDetailStyles.infoLabel}>Location</Text>
                  <Text style={eventDetailStyles.infoValue} numberOfLines={2}>{event.location}</Text>
                </View>
              </View>
            </View>

            <View style={eventDetailStyles.descSection}>
              <Text style={eventDetailStyles.descTitle}>About</Text>
              <Text style={eventDetailStyles.descText}>{event.description}</Text>
            </View>

            <View style={eventDetailStyles.tagsRow}>
              {event.tags.map((tag) => (
                <View key={tag} style={eventDetailStyles.tag}>
                  <Text style={eventDetailStyles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={eventDetailStyles.hostCard}>
              <Image source={{ uri: event.hostAvatar }} style={eventDetailStyles.hostCardAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={eventDetailStyles.hostedByLabel}>Hosted by</Text>
                <Text style={eventDetailStyles.hostCardName}>{event.host}</Text>
              </View>
              <View style={eventDetailStyles.attendeesCount}>
                <Users size={14} color={config.color} />
                <Text style={[eventDetailStyles.attendeesCountText, { color: config.color }]}>{event.attendees} going</Text>
              </View>
            </View>

            <View style={eventDetailStyles.priceRow}>
              <View>
                <Text style={eventDetailStyles.priceLabel}>{event.isFree ? 'Free Event' : 'Entry Fee'}</Text>
                <Text style={eventDetailStyles.priceAmount}>{event.isFree ? 'No charge' : event.price}</Text>
              </View>
              <Pressable
                style={eventDetailStyles.rsvpBtn}
                onPress={() => {
                  Alert.alert('RSVP Confirmed!', `You're going to ${event.title}!`);
                  onClose();
                }}
              >
                <Text style={eventDetailStyles.rsvpText}>RSVP Now</Text>
                <ArrowRight size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const eventDetailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(44,58,78,0.55)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  heroWrap: {
    position: 'relative' as const,
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadges: {
    position: 'absolute' as const,
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  heroCategoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroCategoryText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  heroHotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  heroHotText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  body: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  infoCards: {
    gap: 10,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 1,
  },
  descSection: {
    marginBottom: 14,
  },
  descTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  descText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  hostCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  hostedByLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  hostCardName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 1,
  },
  attendeesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  attendeesCountText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    marginTop: 2,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  rsvpText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.banner,
  },
  supabaseBanner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  welcomeBannerContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  welcomeBannerGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  welcomeBannerText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#F59E0B',
    letterSpacing: 0.4,
    textAlign: 'center' as const,
  },
  signUpBannerContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  signUpBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  signUpBannerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  signUpIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  signUpBannerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: -0.2,
  },
  signUpBannerSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  signUpArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 8,
  },
  pointsBannerContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  pointsBannerInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 9,
  },
  pointsBannerText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#F59E0B',
    letterSpacing: 0.5,
    textAlign: 'center' as const,
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
    letterSpacing: 0.1,
  },
  feedHeader: {
    backgroundColor: Colors.banner,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    marginBottom: 2,
  },
  feedHeaderPersonal: {
    backgroundColor: Colors.banner,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    marginBottom: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconBtnPersonal: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,30,50,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  menuPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    letterSpacing: 0.1,
  },
  menuItemLabelAdmin: {
    color: '#0D9488',
    fontWeight: '600' as const,
  },
  greeting: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  sloganWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sloganBold: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  sloganText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  subGreeting: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: 'rgba(255,215,0,0.7)',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  headerBookmarkBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTooltip: {
    position: 'absolute',
    top: 44,
    right: 48,
    backgroundColor: 'rgba(20,20,30,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 50,
  },
  headerTooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  createPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  createPostText: {
    color: Colors.navyDark,
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  postCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  adminPostCard: {
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  adminPostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 6,
    gap: 6,
  },
  adminPostBannerText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  adminAvatar: {
    borderWidth: 2,
    borderColor: '#0D9488',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  promoBadgeText: {
    color: Colors.textOnDark,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  postTime: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  postContent: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingBottom: 12,
    letterSpacing: 0.1,
  },
  postImageWrap: {
    position: 'relative' as const,
  },
  postImage: {
    width: '100%',
    height: SCREEN_WIDTH - 24,
  },
  fullScreenHint: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  fullScreenHintText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.1,
  },
  commentPanel: {
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    paddingVertical: 6,
  },
  sendBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    padding: 6,
  },
  submittedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  submittedComment: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.text,
    flex: 1,
    letterSpacing: 0.1,
  },
  editComment: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600' as const,
    marginLeft: 8,
    letterSpacing: 0.1,
  },
  postActions: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapActive: {
    backgroundColor: Colors.accent,
  },
  actionText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  filterActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  filterActiveText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0369A1',
  },
  rewardChoicePanel: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
  rewardChoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rewardChoiceTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  rewardChoiceSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18,
  },
  rewardOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  rewardOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rewardOptionContent: {
    flex: 1,
  },
  rewardOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  rewardOptionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  rewardChoiceDismiss: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  rewardChoiceDismissText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});

