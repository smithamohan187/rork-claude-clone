import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCheck,
  BellOff,
  Tag,
  CalendarDays,
  Award,
  Gift,
  Users,
  Building2,
  MessageSquare,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNotifications, type NotificationDisplay, type NotificationType } from '@/hooks/useNotifications';

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F6FB';

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Tag; color: string; bg: string }> = {
  new_offer:           { icon: Tag,          color: '#B8860B', bg: '#FBF3DC' },
  new_event:           { icon: CalendarDays, color: '#1D4ED8', bg: '#E3EBFD' },
  points_earned:       { icon: Award,        color: '#1A5C35', bg: '#E8F5EE' },
  reward_redeemed:     { icon: Gift,         color: '#B91C1C', bg: '#FCE8E8' },
  referral_joined:     { icon: Users,        color: '#7C3AED', bg: '#F0E9FD' },
  offer_referral_subscribed: { icon: Tag,    color: '#7C3AED', bg: '#F0E9FD' },
  customer_subscribed: { icon: Users,        color: '#7C3AED', bg: '#F0E9FD' },
  invited_business_joined: { icon: Building2, color: '#0D9488', bg: '#F0FDFA' },
  new_message:         { icon: MessageSquare, color: '#0D9488', bg: '#F0FDFA' },
};

function iconConfigFor(type: NotificationType) {
  return TYPE_CONFIG[type] ?? { icon: Tag, color: PURPLE, bg: '#E8F5EE' };
}

function routeFor(item: NotificationDisplay): { pathname: string; params?: Record<string, string> } | null {
  const data = (item.data ?? {}) as Record<string, unknown>;
  const businessId = typeof data.business_id === 'string' ? data.business_id : undefined;

  switch (item.type) {
    case 'new_offer':
      if (typeof data.offer_id === 'string') {
        return { pathname: '/view-offer', params: { offerId: data.offer_id, businessId: businessId ?? '' } };
      }
      return businessId ? { pathname: `/business-profile/${businessId}` } : null;
    case 'new_event':
      if (typeof data.event_id === 'string') {
        return { pathname: '/view-event', params: { eventId: data.event_id, businessId: businessId ?? '' } };
      }
      return businessId ? { pathname: `/business-profile/${businessId}` } : null;
    case 'reward_redeemed':
      if (typeof data.coupon_id === 'string') {
        return { pathname: `/coupon/${data.coupon_id}` };
      }
      return businessId ? { pathname: `/business-profile/${businessId}` } : null;
    case 'new_message': {
      const senderProfileId = typeof data.sender_profile_id === 'string' ? data.sender_profile_id : undefined;
      const conversationType = typeof data.conversation_type === 'string' ? data.conversation_type : 'friend';
      if (!senderProfileId) return null;
      const senderName = item.title.replace(/^New message from /, '') || 'Chat';
      return {
        pathname: '/chat-detail/[id]',
        params: {
          id: senderProfileId,
          targetProfileId: senderProfileId,
          type: conversationType,
          name: senderName,
        },
      };
    }
    case 'offer_referral_subscribed':
      if (typeof data.offer_id === 'string') {
        return { pathname: '/view-offer', params: { offerId: data.offer_id, businessId: businessId ?? '' } };
      }
      return businessId ? { pathname: `/business-profile/${businessId}` } : null;
    case 'points_earned':
    case 'referral_joined':
    case 'customer_subscribed':
    case 'invited_business_joined':
    default:
      return businessId ? { pathname: `/business-profile/${businessId}` } : null;
  }
}

interface NotificationItemProps {
  item: NotificationDisplay;
  onPress: (item: NotificationDisplay) => void;
}

const NotificationItem = React.memo(function NotificationItem({ item, onPress }: NotificationItemProps) {
  const { icon: Icon, color, bg } = iconConfigFor(item.type);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(item)} style={styles.notifRowOuter}>
      <View style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}>
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <Icon size={20} color={color} />
        </View>

        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifDesc} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.notifTime}>{item.timeAgo}</Text>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
});

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleMarkAllRead = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    markAllAsRead();
  }, [markAllAsRead]);

  const handlePress = useCallback((item: NotificationDisplay) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    const route = routeFor(item);
    if (route) {
      router.push(route as never);
    }
  }, [markAsRead, router]);

  const todayNotifs = useMemo(
    () => notifications.filter(n => n.group === 'today'),
    [notifications]
  );

  const earlierNotifs = useMemo(
    () => notifications.filter(n => n.group === 'earlier'),
    [notifications]
  );

  type SectionItem =
    | { type: 'header'; title: string; key: string }
    | { type: 'notification'; data: NotificationDisplay; key: string };

  const flatData = useMemo<SectionItem[]>(() => {
    const result: SectionItem[] = [];
    if (todayNotifs.length > 0) {
      result.push({ type: 'header', title: 'Today', key: 'header-today' });
      todayNotifs.forEach(n => result.push({ type: 'notification', data: n, key: n.id }));
    }
    if (earlierNotifs.length > 0) {
      result.push({ type: 'header', title: 'Earlier', key: 'header-earlier' });
      earlierNotifs.forEach(n => result.push({ type: 'notification', data: n, key: n.id }));
    }
    return result;
  }, [todayNotifs, earlierNotifs]);

  const renderItem = useCallback(({ item }: { item: SectionItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
          <View style={styles.sectionDivider} />
        </View>
      );
    }
    return <NotificationItem item={item.data} onPress={handlePress} />;
  }, [handlePress]);

  const isEmpty = !isLoading && notifications.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.7}
              onPress={() => router.back()}
              testID="notifications-back"
            >
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.markAllBtn}
              activeOpacity={0.7}
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0}
              testID="mark-all-read"
            >
              <CheckCheck size={16} color={unreadCount > 0 ? '#fff' : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
                Read all
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <BellOff size={44} color="#1A5C35" />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>When you receive offers, rewards, or updates,{'\n'}they'll appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PURPLE} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE_FAINT,
  },
  headerWrap: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  safeHeader: {
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#fff',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  markAllTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
    gap: 12,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#8E8E9A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E6EF',
  },
  notifRowOuter: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notifCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    backgroundColor: '#F1F8F4',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1730',
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  notifTitleUnread: {
    fontWeight: '700' as const,
    color: '#0F0D1A',
  },
  notifDesc: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#1A5C35',
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#1A5C35',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
    marginTop: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1730',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E9A',
    textAlign: 'center',
    lineHeight: 20,
  },
});
