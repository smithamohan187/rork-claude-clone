import React, { useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Trash2,
  CheckCheck,
  BellOff,
  Bell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNotifications, type NotificationDisplay } from '@/hooks/useNotifications';

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F6FB';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = -80;
const DELETE_WIDTH = 80;

const ICON_CONFIG = { color: '#1A5C35', bg: '#E8F5EE' };

interface NotificationItemProps {
  item: NotificationDisplay;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}

const NotificationItem = React.memo(function NotificationItem({ item, onDismiss, onMarkRead }: NotificationItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
          deleteOpacity.setValue(Math.min(1, Math.abs(gestureState.dx) / DELETE_WIDTH));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -SCREEN_WIDTH,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(rowHeight, {
              toValue: 0,
              duration: 250,
              useNativeDriver: false,
            }),
          ]).start(() => {
            onDismiss(item.id);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 40,
            bounciness: 6,
          }).start();
          Animated.timing(deleteOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    if (!item.isRead) {
      onMarkRead(item.id);
    }
  }, [item.id, item.isRead, onMarkRead]);

  return (
    <Animated.View
      style={[
        styles.notifRowOuter,
        {
          maxHeight: rowHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 200],
          }),
          opacity: rowHeight,
        },
      ]}
    >
      <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
        <Trash2 size={20} color="#fff" />
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
      >
        <Animated.View
          style={[
            styles.notifCard,
            !item.isRead && styles.notifCardUnread,
            { transform: [{ translateX }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.iconWrap, { backgroundColor: ICON_CONFIG.bg }]}>
            <Bell size={20} color={ICON_CONFIG.color} />
          </View>

          <View style={styles.notifContent}>
            <Text
              style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.notifDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.notifTime}>{item.timeAgo}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleDismiss = useCallback((id: string) => {
    deleteNotification(id);
  }, [deleteNotification]);

  const handleMarkAllRead = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    markAllAsRead();
  }, [markAllAsRead]);

  const handleMarkRead = useCallback((id: string) => {
    markAsRead(id);
  }, [markAsRead]);

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
    return <NotificationItem item={item.data} onDismiss={handleDismiss} onMarkRead={handleMarkRead} />;
  }, [handleDismiss, handleMarkRead]);

  const isEmpty = notifications.length === 0;

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
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 24,
    gap: 6,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
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
