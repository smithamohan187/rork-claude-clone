import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Users,
  Tag,
  Zap,
  Ticket,
  Megaphone,
  CalendarPlus,
  UsersRound,
  MessageSquare,
  PenSquare,
  TrendingUp,
  ChevronRight,
  UserPlus,
  Gift,
  QrCode,
  Eye,
  ChevronDown,
  PlusCircle,
  ClipboardEdit,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import ProfileSwitcherModal from '@/components/ProfileSwitcherModal';
import { useCoupons } from '@/contexts/CouponContext';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  dashboardStats,
  quickActions,
  recentActivity,
} from '@/mocks/businessDashboard';
import type {
  DashboardStat,
  QuickAction,
  ActivityItem,
  ActivityType,
} from '@/mocks/businessDashboard';

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F6FB';
const PURPLE_DARK = '#1A5C35';

const ICON_MAP = {
  Users,
  Tag,
  Zap,
  Ticket,
} as const;

const ACTION_ICON_MAP = {
  Megaphone,
  CalendarPlus,
  UsersRound,
  MessageSquare,
  PenSquare,
  PlusCircle,
} as const;

const BUSINESS_UNREAD_MESSAGES = 2;

const ACTIVITY_CONFIG: Record<ActivityType, { color: string; icon: typeof UserPlus }> = {
  subscriber: { color: '#22C55E', icon: UserPlus },
  points: { color: PURPLE, icon: Zap },
  redemption: { color: '#E5A100', icon: Gift },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const StatCard = React.memo(function StatCard({ stat, onPress }: { stat: DashboardStat; onPress?: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const IconComp = ICON_MAP[stat.icon];

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.statCardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.statCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`stat-card-${stat.id}`}
      >
        <View style={[styles.statIconWrap, { backgroundColor: stat.bgColor }]}>
          <IconComp size={18} color={stat.color} />
        </View>
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
        {stat.trend && (
          <View style={styles.trendBadge}>
            <TrendingUp size={10} color="#22C55E" />
            <Text style={styles.trendText}>{stat.trend}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const QuickActionButton = React.memo(function QuickActionButton({
  action,
  onPress,
}: {
  action: QuickAction;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const IconComp = ACTION_ICON_MAP[action.icon];
  const showUnreadDot = action.id === 'messages' && BUSINESS_UNREAD_MESSAGES > 0;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.actionBtnWrap, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.actionBtn}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`quick-action-${action.id}`}
      >
        <View style={styles.actionIconCircle}>
          <IconComp size={20} color={PURPLE} />
          {showUnreadDot ? <View style={styles.actionUnreadDot} /> : null}
        </View>
        <Text style={styles.actionLabel}>{action.label}</Text>
      </Pressable>
    </Animated.View>
  );
});

const ActivityRow = React.memo(function ActivityRow({ item }: { item: ActivityItem }) {
  const config = ACTIVITY_CONFIG[item.type];
  const IconComp = config.icon;

  return (
    <View style={styles.activityRow} testID={`activity-${item.id}`}>
      <View style={[styles.activityDot, { backgroundColor: config.color + '20' }]}>
        <IconComp size={14} color={config.color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityDesc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.activityTime}>{item.timeAgo}</Text>
      </View>
    </View>
  );
});

export default function BusinessDashboard() {
  const { currentUser, businessProfileData, activeProfile, profiles } = useAuth();
  const router = useRouter();
  const { coupons } = useCoupons();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [switcherVisible, setSwitcherVisible] = useState<boolean>(false);
  const hasMultipleProfiles = profiles.length > 1;

  const handleViewAsCustomer = useCallback(() => {
    if (!currentUser?.id) return;
    console.log('[BusinessDashboard] View as customer:', currentUser.id);
    router.push({ pathname: '/business-profile/[id]', params: { id: currentUser.id, preview: '1' } } as never);
  }, [router, currentUser]);

  const businessId = currentUser?.id ?? '';

  const redemptionStats = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startTs = start.getTime();
    const todays = coupons.filter(
      (c) =>
        c.status === 'used' &&
        c.scannedByBusinessId === businessId &&
        (c.usedAt ?? 0) >= startTs
    );
    const pts = todays.reduce((s, c) => s + (c.pointsDeducted ?? 0), 0);
    return { count: todays.length, points: pts };
  }, [coupons, businessId]);

  const recentRedemptions = useMemo(() => {
    return coupons
      .filter(
        (c) => c.status === 'used' && c.scannedByBusinessId === businessId
      )
      .sort((a, b) => (b.usedAt ?? 0) - (a.usedAt ?? 0))
      .slice(0, 10);
  }, [coupons, businessId]);

  const greeting = useMemo(() => getGreeting(), []);
  const businessName = businessProfileData?.name || currentUser?.name || 'Business';

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    console.log('[BusinessDashboard] Refreshing...');
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleActionPress = useCallback((action: QuickAction) => {
    console.log('[BusinessDashboard] Quick action pressed:', action.id);
    router.push(action.route as never);
  }, [router]);

  const handleManageContent = useCallback(() => {
    console.log('[BusinessDashboard] Manage content banner pressed');
    router.push('/(tabs)/content' as never);
  }, [router]);

  const handleNotifications = useCallback(() => {
    console.log('[BusinessDashboard] Notifications pressed');
    router.push('/(tabs)/feed/notifications' as never);
  }, [router]);

  const handleStatPress = useCallback((stat: DashboardStat) => {
    console.log('[BusinessDashboard] Stat pressed:', stat.id);
    if (stat.id === 'subscribers') {
      router.push('/(tabs)/marketplace' as never);
      return;
    }
    if (stat.id === 'offers') {
      const businessId = currentUser?.id;
      if (businessId) {
        router.push(`/business-profile/${businessId}` as never);
      }
    }
  }, [router, currentUser]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        <View style={styles.headerWrap}>
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <View style={styles.switcherRow}>
              <TouchableOpacity
                style={styles.profileChip}
                onPress={() => setSwitcherVisible(true)}
                disabled={!hasMultipleProfiles}
                activeOpacity={0.85}
                testID="biz-profile-switcher-chip"
              >
                <Image source={{ uri: activeProfile.avatarUrl }} style={styles.profileChipAvatar} contentFit="cover" />
                <Text style={styles.profileChipName} numberOfLines={1}>{activeProfile.displayName}</Text>
                <View style={styles.profileChipBadge}>
                  <Text style={styles.profileChipBadgeText}>Business</Text>
                </View>
                {hasMultipleProfiles && (
                  <ChevronDown size={14} color="#fff" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewAsBtn}
                onPress={handleViewAsCustomer}
                activeOpacity={0.85}
                testID="biz-view-as-customer"
              >
                <Eye size={14} color="#fff" />
                <Text style={styles.viewAsText}>View My Business</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.topBar}>
              <View style={styles.greetingBlock}>
                <Text style={styles.greetingText}>{greeting}, </Text>
                <Text style={styles.businessNameText} numberOfLines={1}>{businessName}</Text>
                <Text style={styles.greetingSub}>Here's your business overview</Text>
              </View>
              <TouchableOpacity
                style={styles.bellBtn}
                activeOpacity={0.7}
                onPress={handleNotifications}
                testID="biz-notification-bell"
              >
                <Bell size={22} color="#fff" />
                <View style={styles.bellDot} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.statsGrid}>
          {dashboardStats.map((stat) => {
            const isNavigable = stat.id === 'subscribers' || stat.id === 'offers';
            return (
              <StatCard
                key={stat.id}
                stat={stat}
                onPress={isNavigable ? () => handleStatPress(stat) : undefined}
              />
            );
          })}
        </View>

        <Pressable
          onPress={handleManageContent}
          style={styles.manageBanner}
          testID="manage-content-banner"
        >
          <View style={styles.manageAccent} />
          <View style={styles.manageIconWrap}>
            <ClipboardEdit size={20} color={PURPLE} />
          </View>
          <View style={styles.manageTextBlock}>
            <Text style={styles.manageTitle}>Manage Your Content</Text>
            <Text style={styles.manageSubtitle}>Edit your offers, events & posts</Text>
          </View>
          <ChevronRight size={18} color={PURPLE} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <QuickActionButton
              key={action.id}
              action={action}
              onPress={() => handleActionPress(action)}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable style={styles.seeAllBtn} hitSlop={8}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={14} color={PURPLE} />
          </Pressable>
        </View>
        <View style={styles.activityCard}>
          {recentActivity.map((item, index) => (
            <React.Fragment key={item.id}>
              <ActivityRow item={item} />
              {index < recentActivity.length - 1 && <View style={styles.activityDivider} />}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <QrCode size={15} color={PURPLE} />
            <Text style={styles.sectionTitle}>Redemptions</Text>
          </View>
          <Pressable
            style={styles.seeAllBtn}
            hitSlop={8}
            onPress={() => router.push('/scan-coupon' as never)}
            testID="open-scan"
          >
            <Text style={styles.seeAllText}>Scan coupon</Text>
            <ChevronRight size={14} color={PURPLE} />
          </Pressable>
        </View>

        <View style={styles.redemptionsCard}>
          <View style={styles.redemptionSummaryRow}>
            <View style={styles.redemptionSummaryCell}>
              <Text style={styles.redemptionSummaryVal}>{redemptionStats.count}</Text>
              <Text style={styles.redemptionSummaryLabel}>Today's redemptions</Text>
            </View>
            <View style={styles.redemptionSummaryDivider} />
            <View style={styles.redemptionSummaryCell}>
              <Text style={styles.redemptionSummaryVal}>{redemptionStats.points}</Text>
              <Text style={styles.redemptionSummaryLabel}>Points redeemed today</Text>
            </View>
          </View>

          {recentRedemptions.length === 0 ? (
            <View style={styles.redemptionEmpty}>
              <Text style={styles.redemptionEmptyText}>
                No redemptions yet. Tap "Scan coupon" to get started.
              </Text>
            </View>
          ) : (
            <View>
              {recentRedemptions.map((c, idx) => {
                const initials = (c.customerName ?? 'CU')
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <React.Fragment key={c.id}>
                    <View style={styles.redemptionRow}>
                      <View style={styles.redemptionAvatar}>
                        <Text style={styles.redemptionAvatarText}>{initials || 'CU'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.redemptionName} numberOfLines={1}>
                          {c.customerName ?? 'Customer'}
                        </Text>
                        <Text style={styles.redemptionReward} numberOfLines={1}>
                          {c.rewardTitle}
                        </Text>
                        <Text style={styles.redemptionCode}>{c.couponCode}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.redemptionPoints}>−{c.pointsDeducted} pts</Text>
                        <Text style={styles.redemptionTime}>
                          {c.usedAt ? format(new Date(c.usedAt), 'dd MMM, hh:mm a') : '—'}
                        </Text>
                      </View>
                    </View>
                    {idx < recentRedemptions.length - 1 && (
                      <View style={styles.activityDivider} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      <ProfileSwitcherModal visible={switcherVisible} onDismiss={() => setSwitcherVisible(false)} />
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STAT_CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - 12) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE_FAINT,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerWrap: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  safeHeader: {
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  greetingBlock: {
    flex: 1,
    marginRight: 12,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.1,
  },
  businessNameText: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  profileChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 10,
    borderRadius: 999,
    gap: 8,
  },
  profileChipAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  profileChipName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.1,
  },
  profileChipBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  profileChipBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  viewAsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
  },
  viewAsText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.1,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: PURPLE,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: -16,
    gap: 12,
  },
  statCardWrap: {
    width: STAT_CARD_WIDTH,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#1A1730',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8E8E9A',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#22C55E',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A1730',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: PURPLE,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  actionBtnWrap: {
    flex: 1,
  },
  actionBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE9F6',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1A1730',
    textAlign: 'center' as const,
  },
  actionUnreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  manageBanner: {
    marginHorizontal: 20,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  manageAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: PURPLE,
  },
  manageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  manageTextBlock: {
    flex: 1,
  },
  manageTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: PURPLE_DARK,
    letterSpacing: -0.2,
  },
  manageSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#1A5C35',
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  activityDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityDesc: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#1A1730',
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#8E8E9A',
    marginTop: 3,
  },
  activityDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0EFF5',
    marginLeft: 62,
    marginRight: 16,
  },
  planBanner: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 16,
    backgroundColor: PURPLE_DARK,
    overflow: 'hidden',
  },
  planBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  planIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(229,161,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  activeBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#22C55E',
  },
  planExpiry: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  upgradeBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: PURPLE,
  },
  bottomSpacer: {
    height: 16,
  },
  redemptionsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  redemptionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  redemptionSummaryCell: {
    flex: 1,
    alignItems: 'center',
  },
  redemptionSummaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: '#E6E3F0',
  },
  redemptionSummaryVal: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#1A1730',
    letterSpacing: -0.3,
  },
  redemptionSummaryLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8E8E9A',
    marginTop: 4,
  },
  redemptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  redemptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redemptionAvatarText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: PURPLE,
  },
  redemptionName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1A1730',
  },
  redemptionReward: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#1A5C35',
    marginTop: 1,
  },
  redemptionCode: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#B0AEBC',
    marginTop: 2,
    letterSpacing: 0.8,
  },
  redemptionPoints: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#E5A100',
  },
  redemptionTime: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#8E8E9A',
    marginTop: 2,
  },
  redemptionEmpty: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  redemptionEmptyText: {
    fontSize: 12,
    color: '#8E8E9A',
    textAlign: 'center' as const,
    lineHeight: 17,
  },
});
