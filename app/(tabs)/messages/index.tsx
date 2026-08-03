import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MessageSquare, Heart } from 'lucide-react-native';
import HeaderAvatarTrigger from '@/components/HeaderAvatarTrigger';
import { useConversations } from '@/hooks/useConversations';
import { useSubscribedBusinesses, useFriends } from '@/hooks/useChatRosters';
import type { Conversation } from '@/api/services/chatService';

const ACCENT = '#1A5C35';
const ACCENT_SOFT = '#E8F5EE';
const PURPLE = '#00B246';
const TEAL = '#0D9488';
const BG = '#F8F7FF';
const TEXT_DARK = '#1A5C35';
const TEXT_MUTED = '#1A5C35';

type SegmentKey = 'businesses' | 'people';

interface BusinessRow {
  key: string;
  businessId: string;
  targetProfileId: string;
  name: string;
  initials: string;
  color: string;
  preview: string | null;
  time: string | null;
  unread: number;
  isYou: boolean;
}

interface FriendRow {
  key: string;
  targetProfileId: string;
  name: string;
  initials: string;
  color: string;
  preview: string | null;
  time: string | null;
  unread: number;
  isYou: boolean;
}

const initialsOf = (name: string): string =>
  (name.trim().split(/\s+/).map((w) => w[0] ?? '').slice(0, 2).join('') || 'C').toUpperCase();

function formatRelative(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChatListScreen() {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [segment, setSegment] = useState<SegmentKey>('businesses');

  const { businesses, loading: bizLoading } = useSubscribedBusinesses();
  const { friends, loading: friendsLoading } = useFriends();
  const { conversations: bizConvos } = useConversations('business');
  const { conversations: friendConvos } = useConversations('friend');

  // Index conversations by the other participant's profile id for O(1) decoration.
  const bizConvoByProfile = useMemo(() => {
    const m = new Map<string, Conversation>();
    bizConvos.forEach((c) => m.set(c.other_profile_id, c));
    return m;
  }, [bizConvos]);

  const friendConvoByProfile = useMemo(() => {
    const m = new Map<string, Conversation>();
    friendConvos.forEach((c) => m.set(c.other_profile_id, c));
    return m;
  }, [friendConvos]);

  const businessRows = useMemo<BusinessRow[]>(() => {
    const q = query.trim().toLowerCase();
    return businesses
      .map((b) => {
        const convo = bizConvoByProfile.get(b.business_profile_id);
        return {
          key: b.id,
          businessId: b.id,
          targetProfileId: b.business_profile_id,
          name: b.name,
          initials: initialsOf(b.name),
          color: ACCENT,
          preview: convo?.last_message_body ?? null,
          time: formatRelative(convo?.last_message_at ?? null),
          unread: convo?.unread_count ?? 0,
          isYou:
            !!convo?.last_message_sender_id &&
            convo.last_message_sender_id !== convo.other_profile_id,
        };
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [businesses, bizConvoByProfile, query]);

  const friendRows = useMemo<FriendRow[]>(() => {
    const q = query.trim().toLowerCase();
    return friends
      .map((f) => {
        const convo = friendConvoByProfile.get(f.profile_id);
        return {
          key: f.profile_id,
          targetProfileId: f.profile_id,
          name: f.display_name,
          initials: initialsOf(f.display_name),
          color: PURPLE,
          preview: convo?.last_message_body ?? null,
          time: formatRelative(convo?.last_message_at ?? null),
          unread: convo?.unread_count ?? 0,
          isYou:
            !!convo?.last_message_sender_id &&
            convo.last_message_sender_id !== convo.other_profile_id,
        };
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [friends, friendConvoByProfile, query]);

  const peopleTotalUnread = useMemo(
    () => friendConvos.reduce((s, c) => s + (c.unread_count ?? 0), 0),
    [friendConvos],
  );

  const openBusiness = useCallback(
    (row: BusinessRow) => {
      router.push({
        pathname: '/chat-detail/[id]' as never,
        params: {
          id: row.targetProfileId,
          targetProfileId: row.targetProfileId,
          type: 'business',
          name: row.name,
          businessColor: row.color,
        },
      } as never);
    },
    [router],
  );

  const openFriend = useCallback(
    (row: FriendRow) => {
      router.push({
        pathname: '/chat-detail/[id]' as never,
        params: {
          id: row.targetProfileId,
          targetProfileId: row.targetProfileId,
          type: 'friend',
          name: row.name,
          avatarColor: row.color,
        },
      } as never);
    },
    [router],
  );

  const handleExplore = useCallback(() => router.push('/(tabs)/marketplace' as never), [router]);
  const handleInviteFriend = useCallback(() => router.push('/my-referrals' as never), [router]);
  const goToTrustedFriends = useCallback(() => router.push('/my-referrals' as never), [router]);

  const renderBusiness = useCallback(
    ({ item }: { item: BusinessRow }) => (
      <TouchableOpacity
        testID={`chat-row-${item.key}`}
        style={styles.row}
        onPress={() => openBusiness(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: item.color }]}>
            <Text style={styles.avatarText}>{item.initials}</Text>
          </View>
          {item.unread > 0 && <View style={styles.avatarDot} />}
        </View>
        <View style={styles.rowMain}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            {item.time && <Text style={styles.time}>{item.time}</Text>}
          </View>
          <View style={styles.rowBottom}>
            <Text style={styles.preview} numberOfLines={1}>
              {item.preview ? (
                <>
                  {item.isYou && <Text style={styles.youPrefix}>You: </Text>}
                  {item.preview}
                </>
              ) : (
                'Tap to start chatting'
              )}
            </Text>
            {item.unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [openBusiness],
  );

  const renderFriend = useCallback(
    ({ item }: { item: FriendRow }) => (
      <TouchableOpacity
        testID={`person-row-${item.key}`}
        style={styles.row}
        onPress={() => openFriend(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: item.color }]}>
            <Text style={styles.avatarText}>{item.initials}</Text>
          </View>
          {item.unread > 0 && <View style={styles.avatarDot} />}
        </View>
        <View style={styles.rowMain}>
          <View style={styles.rowTop}>
            <View style={styles.nameWrap}>
              <Heart size={11} color={TEAL} fill={TEAL} />
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            {item.time && <Text style={styles.time}>{item.time}</Text>}
          </View>
          <View style={styles.rowBottom}>
            <Text style={styles.preview} numberOfLines={1}>
              {item.preview ? (
                <>
                  {item.isYou && <Text style={styles.youPrefix}>You: </Text>}
                  {item.preview}
                </>
              ) : (
                'Say hi 👋'
              )}
            </Text>
            {item.unread > 0 ? (
              <View style={[styles.badge, styles.badgeTrusted]}>
                <Text style={styles.badgeText}>{item.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [openFriend],
  );

  const isBusinessSegment = segment === 'businesses';
  const isEmpty = isBusinessSegment && !bizLoading && businessRows.length === 0 && query.trim().length === 0;
  const isPeopleEmpty = !isBusinessSegment && !friendsLoading && friendRows.length === 0 && query.trim().length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <HeaderAvatarTrigger />
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segmentPill, isBusinessSegment && styles.segmentPillActive]}
          onPress={() => setSegment('businesses')}
          activeOpacity={0.85}
          testID="segment-businesses"
        >
          <Text style={[styles.segmentText, isBusinessSegment && styles.segmentTextActive]}>Businesses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentPill, !isBusinessSegment && styles.segmentPillActive]}
          onPress={() => setSegment('people')}
          activeOpacity={0.85}
          testID="segment-people"
        >
          <Text style={[styles.segmentText, !isBusinessSegment && styles.segmentTextActive]}>Trusted Friends</Text>
          {peopleTotalUnread > 0 && (
            <View style={styles.segmentBadge}>
              <Text style={styles.segmentBadgeText}>{peopleTotalUnread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Searchbar
          testID="chat-search"
          placeholder={isBusinessSegment ? 'Search businesses...' : 'Search friends...'}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
          iconColor={ACCENT}
          elevation={0}
        />
      </View>

      {isBusinessSegment ? (
        bizLoading && businessRows.length === 0 ? (
          <View style={styles.loadingFill}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : isEmpty ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MessageSquare size={36} color={ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Subscribe to a business to start chatting</Text>
            <Button
              mode="contained"
              onPress={handleExplore}
              buttonColor={ACCENT}
              style={styles.emptyBtn}
              contentStyle={styles.emptyBtnContent}
            >
              Explore Businesses
            </Button>
          </View>
        ) : (
          <FlatList
            data={businessRows}
            keyExtractor={(it) => it.key}
            renderItem={renderBusiness}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.noResults}>
                <Text style={styles.emptyTitle}>No businesses found</Text>
                <Text style={styles.emptySub}>Try a different search term</Text>
              </View>
            }
          />
        )
      ) : friendsLoading && friendRows.length === 0 ? (
        <View style={styles.loadingFill}>
          <ActivityIndicator color={PURPLE} />
        </View>
      ) : isPeopleEmpty ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: '#CCFBF1' }]}>
            <Heart size={36} color={TEAL} fill={TEAL} />
          </View>
          <Text style={styles.emptyTitle}>No friend chats yet</Text>
          <Text style={styles.emptySub}>Start a conversation from your Trusted Friends list.</Text>
          <TouchableOpacity
            onPress={goToTrustedFriends}
            activeOpacity={0.7}
            style={styles.emptyTextBtn}
            testID="go-to-trusted-friends"
          >
            <Text style={styles.emptyTextBtnText}>Go to Trusted Friends →</Text>
          </TouchableOpacity>
          <Button
            mode="contained"
            onPress={handleInviteFriend}
            buttonColor={PURPLE}
            style={styles.emptyBtn}
            contentStyle={styles.emptyBtnContent}
          >
            Invite a friend
          </Button>
        </View>
      ) : (
        <FlatList
          data={friendRows}
          keyExtractor={(it) => it.key}
          renderItem={renderFriend}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptySub}>Try a different search term</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: -0.2,
  },
  headerSpacer: { width: 36, height: 36 },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1EFE8',
    borderRadius: 24,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 10,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 20,
  },
  segmentPillActive: { backgroundColor: ACCENT },
  segmentText: { fontSize: 12, color: '#888780', fontWeight: '600' },
  segmentTextActive: { color: '#ffffff', fontWeight: '700' },
  segmentBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: { color: ACCENT, fontSize: 10, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  search: {
    backgroundColor: '#F1EFE8',
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { boxShadow: 'none' as const } : null),
  },
  searchInput: { fontSize: 14, color: TEXT_DARK, minHeight: 0 },
  listContent: { paddingBottom: 40 },
  loadingFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: BG,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  avatarDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: BG,
  },
  rowMain: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  time: { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview: { flex: 1, fontSize: 12, color: TEXT_MUTED, marginRight: 8 },
  youPrefix: { color: ACCENT, fontWeight: '600' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTrusted: { backgroundColor: PURPLE },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 8 },
  emptyTextBtn: { marginTop: 14 },
  emptyTextBtnText: { color: PURPLE, fontSize: 13, fontWeight: '700' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  sep: { height: 0.5, backgroundColor: '#F0EFF8', marginLeft: 74 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 8 },
  noResults: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 40, gap: 8 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  emptySub: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },
  emptyBtn: { marginTop: 16, borderRadius: 10 },
  emptyBtnContent: { paddingHorizontal: 8, height: 42 },
});
