import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  Star,
  Search,
  MapPin,
  Store,
  CheckCircle2,
  Clock,
  XCircle,
  UserPlus,
  Smartphone,
  MessageCircle,
  Hourglass,
} from 'lucide-react-native';
import { useReferralChat } from '@/contexts/ReferralChatContext';

type ReferralType = 'app' | 'business';
type ReferralStatus = 'completed' | 'pending' | 'expired';

interface TrustedFriend {
  id: string;
  type: ReferralType;
  name: string;
  handle: string;
  avatarColor: string;
  joinedAt: string;
  joinedDate: Date;
  isPending: boolean;
  destination: string;
  status: ReferralStatus;
  pointsEarned: number;
  avatarUri?: string;
}

const PURPLE = '#00B246';
const PURPLE_DARK = '#1A5C35';
const ORANGE = '#1A5C35';
const GREEN = '#16A34A';
const AMBER = '#D97706';
const PENDING_BG = '#E5E7EB';
const PENDING_TEXT = '#6B7280';

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
};

const MOCK_FRIENDS: TrustedFriend[] = [
  {
    id: 'tf-1',
    type: 'app',
    name: 'Emily Carter',
    handle: '@emilycarter',
    avatarColor: '#00B246',
    joinedAt: '02 May 2026',
    joinedDate: new Date('2026-05-02'),
    isPending: false,
    destination: 'TouchPoint',
    status: 'completed',
    pointsEarned: 100,
  },
  {
    id: 'tf-2',
    type: 'business',
    name: 'Michael Johnson',
    handle: '@mikejohn',
    avatarColor: '#0F766E',
    joinedAt: '28 Apr 2026',
    joinedDate: new Date('2026-04-28'),
    isPending: false,
    destination: 'Brooklyn Coffee Roasters',
    status: 'completed',
    pointsEarned: 75,
  },
  {
    id: 'tf-3',
    type: 'app',
    name: 'Olivia Martinez',
    handle: '@oliviam',
    avatarColor: '#DB2777',
    joinedAt: '24 Apr 2026',
    joinedDate: new Date('2026-04-24'),
    isPending: false,
    destination: 'TouchPoint',
    status: 'completed',
    pointsEarned: 100,
  },
  {
    id: 'tf-4',
    type: 'business',
    name: 'Daniel Rodriguez',
    handle: '+1 (415) 555-0142',
    avatarColor: '#1E40AF',
    joinedAt: '18 Apr 2026',
    joinedDate: new Date('2026-04-18'),
    isPending: true,
    destination: 'Sunset Yoga Studio',
    status: 'pending',
    pointsEarned: 0,
  },
  {
    id: 'tf-5',
    type: 'app',
    name: 'Sophia Williams',
    handle: '@sophiaw',
    avatarColor: '#B45309',
    joinedAt: '12 Apr 2026',
    joinedDate: new Date('2026-04-12'),
    isPending: false,
    destination: 'TouchPoint',
    status: 'completed',
    pointsEarned: 100,
  },
  {
    id: 'tf-6',
    type: 'business',
    name: 'James Anderson',
    handle: '@jamesa',
    avatarColor: '#065F46',
    joinedAt: '05 Apr 2026',
    joinedDate: new Date('2026-04-05'),
    isPending: false,
    destination: 'Austin BBQ Co.',
    status: 'completed',
    pointsEarned: 75,
  },
  {
    id: 'tf-7',
    type: 'business',
    name: 'Ava Thompson',
    handle: '+1 (212) 555-0118',
    avatarColor: '#00B246',
    joinedAt: '28 Mar 2026',
    joinedDate: new Date('2026-03-28'),
    isPending: true,
    destination: 'Lakeside Bookstore',
    status: 'pending',
    pointsEarned: 0,
  },
  {
    id: 'tf-8',
    type: 'app',
    name: 'Benjamin Davis',
    handle: '@bendavis',
    avatarColor: '#0EA5E9',
    joinedAt: '15 Mar 2026',
    joinedDate: new Date('2026-03-15'),
    isPending: false,
    destination: 'TouchPoint',
    status: 'expired',
    pointsEarned: 0,
  },
];

export function getTrustedFriendsSummary(): { count: number; pointsEarned: number } {
  const count = MOCK_FRIENDS.length;
  const pointsEarned = MOCK_FRIENDS.reduce((s, f) => s + f.pointsEarned, 0);
  return { count, pointsEarned };
}

export default function TrustedFriendsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const { ensureChat } = useReferralChat();

  const handleOpenChat = useCallback(
    (friend: TrustedFriend) => {
      const chatId = ensureChat({
        friend: {
          profileId: `tf-${friend.id}`,
          name: friend.name,
          initials: initials(friend.name),
          avatarColor: friend.avatarColor,
        },
        contextType: friend.type,
        businessName: friend.type === 'business' ? friend.destination : undefined,
      });
      console.log('[TrustedFriends] open chat', chatId, friend.name);
      router.push({
        pathname: '/referral-chat/[id]' as never,
        params: { id: chatId, source: 'trusted_friends' },
      } as never);
    },
    [ensureChat, router]
  );

  const sorted = useMemo(
    () => [...MOCK_FRIENDS].sort((a, b) => b.joinedDate.getTime() - a.joinedDate.getTime()),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (f) => f.name.toLowerCase().includes(q) || f.handle.toLowerCase().includes(q)
    );
  }, [query, sorted]);

  const totalPoints = useMemo(
    () => sorted.reduce((s, f) => s + f.pointsEarned, 0),
    [sorted]
  );

  const handleInvite = useCallback(() => {
    router.push('/invite-friends/contacts' as never);
  }, [router]);

  return (
    <View style={styles.root} testID="trusted-friends-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="trusted-friends-back"
          >
            <ArrowLeft size={22} color="#1A5C35" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Trusted Friends</Text>
            <Text style={styles.headerSubtitle}>
              Friends you&apos;ve brought into TouchPoint
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statsRow}>
          <View style={[styles.statChip, styles.statChipPurple]}>
            <Users size={14} color={PURPLE_DARK} />
            <Text style={[styles.statChipText, { color: PURPLE_DARK }]}>
              {sorted.length} Friends
            </Text>
          </View>
          <View style={[styles.statChip, styles.statChipOrange]}>
            <Star size={14} color="#9A3412" />
            <Text style={[styles.statChipText, { color: '#9A3412' }]}>
              {totalPoints} Points Earned
            </Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search trusted friends..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            testID="trusted-friends-search"
          />
        </View>

        {filtered.length === 0 ? (
          sorted.length === 0 ? (
            <EmptyState onInvite={handleInvite} />
          ) : (
            <View style={styles.noMatch}>
              <Text style={styles.noMatchTitle}>No matches</Text>
              <Text style={styles.noMatchSub}>
                No trusted friends match &quot;{query.trim()}&quot;
              </Text>
            </View>
          )
        ) : (
          filtered.map((f) => (
            <FriendCard key={f.id} friend={f} onChat={handleOpenChat} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function FriendCard({
  friend,
  onChat,
}: {
  friend: TrustedFriend;
  onChat: (friend: TrustedFriend) => void;
}) {
  const isApp = friend.type === 'app';
  const accent = isApp ? PURPLE : ORANGE;

  return (
    <View style={styles.card} testID={`trusted-friend-${friend.id}`}>
      <View style={[styles.cardStrip, { backgroundColor: accent }]} />

      <View style={styles.cardInner}>
        <View style={styles.cardTopRow}>
          <View
            style={[styles.avatar, { backgroundColor: friend.avatarColor }]}
          >
            <Text style={styles.avatarText}>{initials(friend.name)}</Text>
          </View>

          <View style={styles.cardCenter}>
            <Text style={styles.friendName} numberOfLines={1}>
              {friend.name}
            </Text>
            <Text style={styles.friendHandle} numberOfLines={1}>
              {friend.handle}
            </Text>
            <Text style={styles.friendMeta}>
              {friend.isPending ? 'Invited' : 'Joined'}: {friend.joinedAt}
            </Text>
          </View>

          <TypeBadge type={friend.type} />
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBottomRow}>
          <View style={styles.destinationWrap}>
            {isApp ? (
              <MapPin size={13} color={PURPLE_DARK} />
            ) : (
              <Store size={13} color={PURPLE_DARK} />
            )}
            <Text style={styles.destinationText} numberOfLines={1}>
              Referred to {friend.destination}
            </Text>
          </View>

          <StatusChip status={friend.status} />
        </View>

        <View style={styles.cardActionRow}>
          {friend.isPending ? (
            <View style={styles.pendingPill} testID={`pending-${friend.id}`}>
              <Hourglass size={12} color={PENDING_TEXT} />
              <Text style={styles.pendingPillText}>Invite Pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => onChat(friend)}
              activeOpacity={0.85}
              testID={`chat-now-${friend.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Chat with ${friend.name}`}
            >
              <MessageCircle size={13} color="#FFFFFF" />
              <Text style={styles.chatBtnText}>Chat Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function TypeBadge({ type }: { type: ReferralType }) {
  if (type === 'app') {
    return (
      <View style={[styles.typeBadge, styles.typeBadgePurple]}>
        <Smartphone size={10} color="#FFFFFF" />
        <Text style={styles.typeBadgeText}>TouchPoint</Text>
      </View>
    );
  }
  return (
    <View style={[styles.typeBadge, styles.typeBadgeOrange]}>
      <Store size={10} color="#FFFFFF" />
      <Text style={styles.typeBadgeText}>Business</Text>
    </View>
  );
}

function StatusChip({ status }: { status: ReferralStatus }) {
  if (status === 'completed') {
    return (
      <View style={[styles.statusChip, { backgroundColor: '#DCFCE7' }]}>
        <CheckCircle2 size={11} color={GREEN} />
        <Text style={[styles.statusChipText, { color: '#166534' }]}>Points Earned</Text>
      </View>
    );
  }
  if (status === 'pending') {
    return (
      <View style={[styles.statusChip, { backgroundColor: '#FEF3C7' }]}>
        <Clock size={11} color={AMBER} />
        <Text style={[styles.statusChipText, { color: '#92400E' }]}>Pending</Text>
      </View>
    );
  }
  return (
    <View style={[styles.statusChip, { backgroundColor: '#E5E7EB' }]}>
      <XCircle size={11} color="#6B7280" />
      <Text style={[styles.statusChipText, { color: '#4B5563' }]}>Expired</Text>
    </View>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <View style={styles.empty} testID="trusted-friends-empty">
      <View style={styles.emptyIconWrap}>
        <View style={[styles.emptyIconBubble, { backgroundColor: '#E8F5EE' }]}>
          <Users size={32} color={PURPLE} />
        </View>
        <View style={[styles.emptyIconBadge, { backgroundColor: ORANGE }]}>
          <UserPlus size={14} color="#FFFFFF" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No trusted friends yet</Text>
      <Text style={styles.emptySub}>
        Invite friends and businesses to join TouchPoint and earn points!
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={onInvite}
        activeOpacity={0.85}
        testID="trusted-friends-invite"
      >
        <UserPlus size={16} color="#FFFFFF" />
        <Text style={styles.emptyBtnText}>Invite Friends</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  safeTop: {
    backgroundColor: '#F8F7FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A5C35',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#1A5C35',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statChipPurple: {
    backgroundColor: '#E8F5EE',
  },
  statChipOrange: {
    backgroundColor: '#E8F5EE',
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1A5C35',
    padding: 0,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardStrip: {
    width: 3,
  },
  cardInner: {
    flex: 1,
    padding: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cardCenter: {
    flex: 1,
    minWidth: 0,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A5C35',
  },
  friendHandle: {
    fontSize: 11,
    color: '#1A5C35',
    marginTop: 1,
  },
  friendMeta: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgePurple: {
    backgroundColor: PURPLE,
  },
  typeBadgeOrange: {
    backgroundColor: ORANGE,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#EEF0F4',
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  destinationWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  destinationText: {
    fontSize: 11,
    fontWeight: '600',
    color: PURPLE_DARK,
    flexShrink: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PURPLE,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    height: 32,
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chatBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PENDING_BG,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    height: 32,
  },
  pendingPillText: {
    color: PENDING_TEXT,
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  emptyIconBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F8F7FF',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A5C35',
  },
  emptySub: {
    fontSize: 12,
    color: '#1A5C35',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 18,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  noMatch: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  noMatchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A5C35',
  },
  noMatchSub: {
    fontSize: 12,
    color: '#1A5C35',
    marginTop: 4,
    textAlign: 'center',
  },
});
