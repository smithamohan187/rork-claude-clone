import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Modal,
  Platform,
  Alert,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Searchbar, Button, Dialog, Portal, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Users,
  Download,
  X,
  Zap,
  Gift,
  TrendingUp,
  Calendar,
  Clock,
  Search as SearchIcon,
  Award,
  MessageSquare,
  Trash2,
} from 'lucide-react-native';
import {
  subscribers as MOCK_SUBSCRIBERS,
  TIER_COLORS,
  TIER_THRESHOLDS,
  getInitials,
  formatDate,
  formatRelative,
  type Subscriber,
  type SubscriberTier,
} from '@/mocks/subscribers';
import { BadgePill } from '@/components/badges';
import { getBadgeForPoints } from '@/config/badgeTiers';

const PURPLE = '#1A5C35';
const PURPLE_DARK = '#1A5C35';
const PURPLE_FAINT = '#F7F6FB';
const INK = '#1A1730';
const MUTED = '#E8F5EE';

type TierFilter = 'all' | SubscriberTier;

const FILTERS: { key: TierFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bronze', label: 'Bronze' },
  { key: 'silver', label: 'Silver' },
  { key: 'gold', label: 'Gold' },
];

function triggerHaptic(style: 'light' | 'medium' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

const FilterChip = React.memo(function FilterChip({
  label,
  active,
  onPress,
  tier,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tier?: SubscriberTier;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const dotColor = tier ? TIER_COLORS[tier].ring : undefined;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onPress();
        }}
        onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        style={[styles.chip, active && styles.chipActive]}
        testID={`subs-filter-${label}`}
      >
        {dotColor && <View style={[styles.chipDot, { backgroundColor: dotColor }]} />}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
});

const SubscriberCard = React.memo(function SubscriberCard({
  subscriber,
  onPress,
  onMessage,
  onRemove,
}: {
  subscriber: Subscriber;
  onPress: () => void;
  onMessage: () => void;
  onRemove: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const tc = TIER_COLORS[subscriber.tier];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          triggerHaptic('medium');
          onPress();
        }}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 3 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 3 }).start()}
        style={styles.card}
        testID={`subscriber-card-${subscriber.id}`}
      >
        <View style={[
          styles.avatar,
          {
            borderColor: getBadgeForPoints(subscriber.totalPoints)?.colors.border ?? tc.ring,
            backgroundColor: tc.bg,
          },
        ]}>
          <Text style={[styles.avatarText, { color: tc.fg }]}>{getInitials(subscriber.name)}</Text>
        </View>

        <View style={styles.cardMiddle}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{subscriber.name}</Text>
            <View style={styles.badgeWrap}>
              <BadgePill points={subscriber.totalPoints} size="sm" />
            </View>
          </View>

          <View style={styles.metaLine}>
            <View style={styles.metaRow}>
              <Calendar size={11} color={MUTED} />
              <Text style={styles.metaText} numberOfLines={1}>Joined {formatDate(subscriber.joinDate)}</Text>
            </View>
            <View style={styles.lastActive}>
              <Clock size={11} color={MUTED} />
              <Text style={styles.metaText} numberOfLines={1}>{formatRelative(subscriber.lastActivity)}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Zap size={11} color={PURPLE} fill={PURPLE} />
              <Text style={styles.statPillText}>{subscriber.totalPoints.toLocaleString()} pts</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              onMessage();
            }}
            hitSlop={10}
            style={styles.msgBtn}
            testID={`subscriber-msg-${subscriber.id}`}
          >
            <MessageSquare size={16} color={PURPLE} />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              triggerHaptic('medium');
              onRemove();
            }}
            hitSlop={10}
            style={styles.removeBtn}
            accessibilityLabel={`Remove ${subscriber.name}`}
            testID={`subscriber-remove-${subscriber.id}`}
          >
            <Trash2 size={16} color="#D04848" />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
});

function DetailSheet({
  subscriber,
  visible,
  onClose,
}: {
  subscriber: Subscriber | null;
  visible: boolean;
  onClose: () => void;
}) {
  const translateY = useRef(new Animated.Value(600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const thresholds = subscriber ? TIER_THRESHOLDS[subscriber.tier] : null;
  const tc = subscriber ? TIER_COLORS[subscriber.tier] : null;

  const progress = useMemo(() => {
    if (!subscriber || !thresholds) return 0;
    if (thresholds.next === null) return 1;
    const span = thresholds.next - thresholds.min;
    const gained = subscriber.totalPoints - thresholds.min;
    return Math.max(0, Math.min(1, gained / span));
  }, [subscriber, thresholds]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      ]).start();
      progressAnim.setValue(0);
      Animated.timing(progressAnim, { toValue: progress, duration: 800, useNativeDriver: false }).start();
    } else {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, progress, backdrop, translateY, progressAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 16 }).start();
        }
      },
    })
  ).current;

  if (!subscriber || !tc || !thresholds) return null;

  const nextPointsRemaining = thresholds.next !== null ? Math.max(0, thresholds.next - subscriber.totalPoints) : 0;
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="subs-sheet-backdrop" />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={[styles.avatarLg, { borderColor: tc.ring, backgroundColor: tc.bg }]}>
              <Text style={[styles.avatarTextLg, { color: tc.fg }]}>{getInitials(subscriber.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{subscriber.name}</Text>
              <Text style={styles.sheetEmail}>{subscriber.email}</Text>
              <View style={[styles.tierBadge, { backgroundColor: tc.bg, marginTop: 6, alignSelf: 'flex-start' }]}>
                <Award size={11} color={tc.fg} />
                <Text style={[styles.tierBadgeText, { color: tc.fg }]}>
                  {subscriber.tier[0].toUpperCase() + subscriber.tier.slice(1)} Member
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} testID="subs-sheet-close">
              <X size={18} color={INK} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
            <View style={styles.statsGrid}>
              <View style={styles.statBlock}>
                <View style={[styles.statIconWrap, { backgroundColor: '#E8F8EE' }]}>
                  <TrendingUp size={16} color="#1E9E5A" />
                </View>
                <Text style={styles.statValue}>{subscriber.pointsEarned.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Earned</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={[styles.statIconWrap, { backgroundColor: '#FCEAE9' }]}>
                  <Gift size={16} color="#D04848" />
                </View>
                <Text style={styles.statValue}>{subscriber.pointsRedeemed.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Redeemed</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={[styles.statIconWrap, { backgroundColor: '#EDE9F6' }]}>
                  <Zap size={16} color={PURPLE} fill={PURPLE} />
                </View>
                <Text style={styles.statValue}>{subscriber.totalPoints.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Balance</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionTopRow}>
                <Text style={styles.sectionLabel}>Tier Progress</Text>
                {thresholds.next !== null ? (
                  <Text style={styles.sectionHint}>
                    {nextPointsRemaining.toLocaleString()} pts to {thresholds.nextLabel}
                  </Text>
                ) : (
                  <Text style={[styles.sectionHint, { color: tc.fg }]}>Top Tier</Text>
                )}
              </View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: tc.ring }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressEdge}>
                  {subscriber.tier[0].toUpperCase() + subscriber.tier.slice(1)}
                </Text>
                <Text style={styles.progressEdge}>{thresholds.nextLabel ?? 'Max'}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Activity</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Joined</Text>
                <Text style={styles.detailVal}>{formatDate(subscriber.joinDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Last activity</Text>
                <Text style={styles.detailVal}>{formatRelative(subscriber.lastActivity)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Coupons used</Text>
                <Text style={[styles.detailVal, { color: PURPLE, fontWeight: '700' as const }]}>
                  {subscriber.couponsUsed}
                </Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={onClose}
              style={styles.closeCta}
              contentStyle={{ paddingVertical: 6 }}
              buttonColor={PURPLE}
              textColor="#fff"
              testID="subs-sheet-done"
            >
              Close
            </Button>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function SubscribersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<string>('');
  const [tier, setTier] = useState<TierFilter>('all');
  const [selected, setSelected] = useState<Subscriber | null>(null);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);
  const [subscribersList, setSubscribersList] = useState<Subscriber[]>(MOCK_SUBSCRIBERS);
  const [removeTarget, setRemoveTarget] = useState<Subscriber | null>(null);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const filtered = useMemo(() => {
    let list = subscribersList;
    if (tier !== 'all') list = list.filter(s => s.tier === tier);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [query, tier, subscribersList]);

  const counts = useMemo(() => {
    return {
      all: subscribersList.length,
      bronze: subscribersList.filter(s => s.tier === 'bronze').length,
      silver: subscribersList.filter(s => s.tier === 'silver').length,
      gold: subscribersList.filter(s => s.tier === 'gold').length,
    };
  }, [subscribersList]);

  const confirmRemoveSubscriber = useCallback(async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    const previousList = subscribersList;
    console.log('[Subscribers] Removing subscriber:', target.id, target.name);
    setSubscribersList((prev) => prev.filter((s) => s.id !== target.id));
    setRemoveTarget(null);
    triggerHaptic('medium');

    try {
      // Simulate Supabase update: subscriptions set status='removed_by_business'
      // In a real env: await supabase.from('subscriptions').update({ status: 'removed_by_business', updated_at: new Date().toISOString() }).match({ business_id, subscriber_profile_id: target.id });
      await new Promise((resolve) => setTimeout(resolve, 250));
      setSnackbar({ visible: true, message: 'Member removed.' });
    } catch (err) {
      console.log('[Subscribers] Remove failed, reverting:', err);
      setSubscribersList(previousList);
      setSnackbar({ visible: true, message: 'Failed to remove member. Please try again.' });
    }
  }, [removeTarget, subscribersList]);

  const openSheet = useCallback((sub: Subscriber) => {
    console.log('[Subscribers] open detail', sub.id);
    setSelected(sub);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setSelected(null), 220);
  }, []);

  const handleExport = useCallback(() => {
    triggerHaptic('medium');
    console.log('[Subscribers] export tapped');
    Alert.alert('Export Members', 'CSV export will be available soon.');
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleBlock}>
            <Users size={22} color="#fff" />
            <Text style={styles.headerTitle}>Members</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{counts.all}</Text>
            </View>
          </View>
          <Pressable
            onPress={handleExport}
            style={styles.exportBtn}
            hitSlop={8}
            testID="subs-export"
          >
            <Download size={16} color="#fff" />
            <Text style={styles.exportText}>Export</Text>
          </Pressable>
        </View>

        <Searchbar
          placeholder="Search by name..."
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
          iconColor={PURPLE}
          placeholderTextColor={MUTED}
          elevation={0}
          testID="subs-search"
        />
      </SafeAreaView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        style={styles.chipRow}
      >
        {FILTERS.map(f => (
          <FilterChip
            key={f.key}
            label={
              f.key === 'all'
                ? `${f.label} (${counts.all})`
                : `${f.label} (${counts[f.key]})`
            }
            active={tier === f.key}
            tier={f.key === 'all' ? undefined : f.key}
            onPress={() => setTier(f.key)}
          />
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <SearchIcon size={34} color={PURPLE} />
          </View>
          <Text style={styles.emptyTitle}>No members found</Text>
          <Text style={styles.emptySub}>Try a different name or tier filter.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
        >
          {filtered.map(sub => (
            <SubscriberCard
              key={sub.id}
              subscriber={sub}
              onPress={() => openSheet(sub)}
              onMessage={() => {
                console.log('[Subscribers] message', sub.id);
                router.push({
                  pathname: '/chat-detail/[id]',
                  params: {
                    id: sub.id,
                    businessName: sub.name,
                    businessInitials: getInitials(sub.name),
                    businessColor: PURPLE,
                  },
                } as never);
              }}
              onRemove={() => setRemoveTarget(sub)}
            />
          ))}
        </ScrollView>
      )}

      <DetailSheet subscriber={selected} visible={sheetVisible} onClose={closeSheet} />

      <Portal>
        <Dialog
          visible={removeTarget !== null}
          onDismiss={() => setRemoveTarget(null)}
          testID="remove-subscriber-dialog"
        >
          <Dialog.Title>Remove Member?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 14, color: INK, lineHeight: 20 }}>
              {`Are you sure you want to remove ${removeTarget?.name ?? ''} from your members? They will no longer receive your offers and broadcasts.`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRemoveTarget(null)} textColor={MUTED} testID="remove-cancel">
              Cancel
            </Button>
            <Button
              onPress={confirmRemoveSubscriber}
              textColor="#D04848"
              testID="remove-confirm"
            >
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={2500}
        style={{ backgroundColor: '#1A5C35', marginBottom: 80 }}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PURPLE_FAINT },
  headerArea: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 16,
    shadowColor: PURPLE_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 30,
    alignItems: 'center',
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' as const },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  exportText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  search: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    height: 46,
  },
  searchInput: {
    fontSize: 14,
    color: INK,
    minHeight: 0,
  },
  chipRow: { marginTop: 14, maxHeight: 48 },
  chipScroll: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E6EF',
  },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipText: { fontSize: 13, fontWeight: '600' as const, color: '#1A5C35' },
  chipTextActive: { color: '#fff' },
  chipDot: { width: 8, height: 8, borderRadius: 4 },

  listContent: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
    alignItems: 'center',
    shadowColor: PURPLE_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.2 },
  cardMiddle: { flex: 1, gap: 6, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '700' as const, color: INK, letterSpacing: -0.2, flex: 1, minWidth: 0 },
  badgeWrap: { flexShrink: 0 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierBadgeText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, color: MUTED, fontWeight: '500' as const },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statPillText: { fontSize: 11, fontWeight: '700' as const, color: PURPLE },
  lastActive: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  msgBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FCEAE9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EDE9F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' as const, color: INK, marginBottom: 4 },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,15,48,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '86%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E1DEEA',
    marginBottom: 14,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatarLg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarTextLg: { fontSize: 20, fontWeight: '700' as const },
  sheetName: { fontSize: 18, fontWeight: '700' as const, color: INK, letterSpacing: -0.3 },
  sheetEmail: { fontSize: 12, color: MUTED, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F0F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBlock: {
    flex: 1,
    backgroundColor: '#F7F6FB',
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
    gap: 6,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '700' as const, color: INK, letterSpacing: -0.2 },
  statLabel: { fontSize: 11, color: MUTED, fontWeight: '500' as const },

  sectionCard: {
    backgroundColor: '#F7F6FB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sectionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700' as const, color: INK, letterSpacing: -0.1 },
  sectionHint: { fontSize: 11, color: MUTED, fontWeight: '600' as const },
  progressTrack: {
    height: 10,
    backgroundColor: '#E8E6EF',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressEdge: { fontSize: 10, fontWeight: '600' as const, color: MUTED, letterSpacing: 0.3 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  detailKey: { fontSize: 13, color: MUTED },
  detailVal: { fontSize: 13, fontWeight: '600' as const, color: INK },
  closeCta: { marginTop: 6, borderRadius: 14 },
});
