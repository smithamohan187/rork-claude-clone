import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  Search,
  MapPin,
  Store,
  CheckCircle2,
  UserPlus,
  Smartphone,
  MessageCircle,
} from 'lucide-react-native';
import { useMyReferrals } from '@/hooks/useMyReferrals';
import { getMyReferrals, CombinedReferral, ReferralDirection } from '@/api/services/referralService';
import { useAuth } from '@/contexts/AuthContext';

type ReferralType = 'app' | 'business';
// Only 'completed' is reachable today: the backend only returns rows that have actually joined
// (referrals are always type='app'/status='completed'; customer_invites are filtered to
// registered/subscribed). No points crediting exists yet for either referral type.
type ReferralStatus = 'completed';

interface TrustedFriend {
  id: string;
  type: ReferralType;
  name: string;
  avatarColor: string;
  joinedAt: string;
  destination: string;
  status: ReferralStatus;
  pointsEarned: number;
  direction: 'joined_via_me' | 'i_joined_via';
  joinedContext: 'touchpoints' | 'business';
  businessName: string | null;
  referralCodeUsed: string;
}

const PURPLE = '#00B246';
const PURPLE_DARK = '#1A5C35';
const ORANGE = '#1A5C35';
const GREEN = '#16A34A';

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
};

const formatJoinedAt = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

function toTrustedFriend(row: CombinedReferral): TrustedFriend {
  const isApp = row.joined_context === 'touchpoints';
  return {
    id: row.profile_id,
    type: isApp ? 'app' : 'business',
    name: row.display_name,
    avatarColor: isApp ? PURPLE : ORANGE,
    joinedAt: formatJoinedAt(row.joined_at),
    destination: isApp ? 'TouchPoint' : (row.business_name ?? 'a business'),
    status: 'completed',
    pointsEarned: 0,
    direction: row.direction,
    joinedContext: row.joined_context,
    businessName: row.business_name,
    referralCodeUsed: row.referral_code_used,
  };
}

// Real friend count for the TrustedFriendsBanner — no crediting exists yet, so pointsEarned is
// always 0 (kept in the return shape so the banner's copy doesn't need to change).
export function useTrustedFriendsSummary(): { count: number; pointsEarned: number; loading: boolean } {
  const { authLoading, isAuthenticated } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getMyReferrals('joined_via_me' as ReferralDirection);
        if (!cancelled) setCount(rows.length);
      } catch (err) {
        if (__DEV__) console.log('[useTrustedFriendsSummary] failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  return { count, pointsEarned: 0, loading };
}

const DIRECTION_FILTERS: { key: ReferralDirection; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'joined_via_me', label: 'Joined via me' },
  { key: 'i_joined_via', label: 'I joined via' },
];

export default function TrustedFriendsScreen() {
  const router = useRouter();
  const { direction, setDirection, search, setSearch, referrals, loading, error } = useMyReferrals();

  const friends = useMemo(() => referrals.map(toTrustedFriend), [referrals]);
  const isSearching = search.trim().length > 0;

  const handleOpenChat = useCallback(
    (friend: TrustedFriend) => {
      router.push({
        pathname: '/chat-detail/[id]' as never,
        params: {
          id: friend.id,
          targetProfileId: friend.id,
          type: 'friend',
          name: friend.name,
          avatarColor: friend.avatarColor,
        },
      } as never);
    },
    [router]
  );

  const handleOpenProfile = useCallback(
    (friend: TrustedFriend) => {
      router.push({
        pathname: '/public-profile',
        params: {
          profileId: friend.id,
          name: friend.name,
          joinedContext: friend.joinedContext,
          direction: friend.direction,
          businessName: friend.businessName ?? undefined,
          joinedAt: friend.joinedAt,
          referralCodeUsed: friend.referralCodeUsed,
        },
      } as never);
    },
    [router]
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
            <Text style={styles.headerTitle}>My Referrals</Text>
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
              {friends.length} Friends
            </Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or business..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            testID="trusted-friends-search"
          />
        </View>

        <View style={styles.filterRow}>
          {DIRECTION_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setDirection(f.key)}
              style={[styles.filterChip, direction === f.key && styles.filterChipActive]}
              testID={`trusted-friends-filter-${f.key}`}
            >
              <Text style={[styles.filterChipText, direction === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.noMatch}>
            <ActivityIndicator color={PURPLE_DARK} />
          </View>
        ) : error ? (
          <View style={styles.noMatch}>
            <Text style={styles.noMatchTitle}>Something went wrong</Text>
            <Text style={styles.noMatchSub}>{error}</Text>
          </View>
        ) : friends.length === 0 ? (
          isSearching ? (
            <View style={styles.noMatch}>
              <Text style={styles.noMatchTitle}>No matches</Text>
              <Text style={styles.noMatchSub}>
                No referrals match &quot;{search.trim()}&quot;
              </Text>
            </View>
          ) : (
            <EmptyState onInvite={handleInvite} />
          )
        ) : (
          friends.map((f) => (
            <FriendCard key={f.id} friend={f} onChat={handleOpenChat} onOpenProfile={handleOpenProfile} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function FriendCard({
  friend,
  onChat,
  onOpenProfile,
}: {
  friend: TrustedFriend;
  onChat: (friend: TrustedFriend) => void;
  onOpenProfile: (friend: TrustedFriend) => void;
}) {
  const isApp = friend.type === 'app';
  const accent = isApp ? PURPLE : ORANGE;

  return (
    <View style={styles.card} testID={`trusted-friend-${friend.id}`}>
      <View style={[styles.cardStrip, { backgroundColor: accent }]} />

      <View style={styles.cardInner}>
        <TouchableOpacity
          style={styles.cardTopRow}
          onPress={() => onOpenProfile(friend)}
          activeOpacity={0.7}
          testID={`view-profile-${friend.id}`}
          accessibilityRole="button"
          accessibilityLabel={`View ${friend.name}'s profile`}
        >
          <View
            style={[styles.avatar, { backgroundColor: friend.avatarColor }]}
          >
            <Text style={styles.avatarText}>{initials(friend.name)}</Text>
          </View>

          <View style={styles.cardCenter}>
            <Text style={styles.friendName} numberOfLines={1}>
              {friend.name}
            </Text>
            <Text style={styles.friendMeta}>
              Joined: {friend.joinedAt}
            </Text>
          </View>

          <TypeBadge type={friend.type} />
        </TouchableOpacity>

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
  return (
    <View style={[styles.statusChip, { backgroundColor: '#DCFCE7' }]}>
      <CheckCircle2 size={11} color={GREEN} />
      <Text style={[styles.statusChipText, { color: '#166534' }]}>Joined</Text>
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
      <Text style={styles.emptyTitle}>No referrals yet</Text>
      <Text style={styles.emptySub}>
        Share your referral link to get started.
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1A5C35',
    borderColor: '#1A5C35',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A5C35',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
