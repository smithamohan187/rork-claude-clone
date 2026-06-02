import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, Users, Heart } from 'lucide-react-native';
import HeaderAvatarTrigger from '@/components/HeaderAvatarTrigger';
import {
  useReferralChat,
  formatRelativeTime,
  getLastMessagePreview,
  type ReferralChat,
} from '@/contexts/ReferralChatContext';

const ACCENT = '#1A5C35';
const ACCENT_SOFT = '#E8F5EE';
const PURPLE = '#00B246';
const TEAL = '#0D9488';
const BG = '#F8F7FF';
const TEXT_DARK = '#1A5C35';
const TEXT_MUTED = '#1A5C35';

type SegmentKey = 'businesses' | 'people';

interface Conversation {
  id: string;
  businessName: string;
  businessInitials: string;
  businessColor: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  lastSenderType: 'business' | 'customer';
}

interface Broadcast {
  id: string;
  businessName: string;
  businessInitials: string;
  businessColor: string;
  title: string;
  timestamp: string;
  unread: boolean;
}

const CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    businessName: "Richard's Pastry",
    businessInitials: 'RP',
    businessColor: '#1A5C35',
    lastMessage: 'Yes, the almond croissant is available today!',
    lastMessageAt: '2 mins ago',
    unreadCount: 2,
    lastSenderType: 'business',
  },
  {
    id: '2',
    businessName: 'Kochi Fitness Hub',
    businessInitials: 'KF',
    businessColor: '#0F6E56',
    lastMessage: 'Thank you for joining our bootcamp!',
    lastMessageAt: 'Yesterday',
    unreadCount: 0,
    lastSenderType: 'business',
  },
  {
    id: '3',
    businessName: 'The Beauty Lounge',
    businessInitials: 'BL',
    businessColor: '#993556',
    lastMessage: 'Hi, I wanted to ask about your facial offer',
    lastMessageAt: '3 days ago',
    unreadCount: 0,
    lastSenderType: 'customer',
  },
];

const BROADCASTS: Broadcast[] = [
  {
    id: 'b1',
    businessName: "Richard's Pastry",
    businessInitials: 'RP',
    businessColor: '#1A5C35',
    title: 'Flash sale this evening — 20% off all pastries from 6 PM',
    timestamp: '1 hour ago',
    unread: true,
  },
  {
    id: 'b2',
    businessName: 'Kochi Fitness Hub',
    businessInitials: 'KF',
    businessColor: '#0F6E56',
    title: 'New morning bootcamp slots open at Marine Drive',
    timestamp: '5 hours ago',
    unread: false,
  },
];

export default function ChatListScreen() {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [segment, setSegment] = useState<SegmentKey>('businesses');

  const {
    chats: peopleChats,
    getMessages,
    currentUserId,
    totalUnread: peopleTotalUnread,
  } = useReferralChat();

  const filtered = useMemo<Conversation[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONVERSATIONS;
    return CONVERSATIONS.filter((c) =>
      c.businessName.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredPeople = useMemo<ReferralChat[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return peopleChats;
    return peopleChats.filter((c) => c.friend.name.toLowerCase().includes(q));
  }, [peopleChats, query]);

  const openChat = useCallback(
    (item: Conversation) => {
      console.log('[ChatList] open chat', item.id);
      router.push({
        pathname: '/chat-detail/[id]' as never,
        params: {
          id: item.id,
          businessName: item.businessName,
          businessInitials: item.businessInitials,
          businessColor: item.businessColor,
        },
      } as never);
    },
    [router]
  );

  const openPeopleChat = useCallback(
    (chat: ReferralChat) => {
      router.push({
        pathname: '/referral-chat/[id]' as never,
        params: { id: chat.id, source: 'trusted_friends' },
      } as never);
    },
    [router]
  );

  const handleExplore = useCallback(() => {
    router.push('/(tabs)/marketplace' as never);
  }, [router]);

  const handleInviteFriend = useCallback(() => {
    router.push('/my-referrals' as never);
  }, [router]);

  const goToTrustedFriends = useCallback(() => {
    router.push('/my-referrals' as never);
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <TouchableOpacity
        testID={`chat-row-${item.id}`}
        style={styles.row}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <View
            style={[styles.avatar, { backgroundColor: item.businessColor }]}
          >
            <Text style={styles.avatarText}>{item.businessInitials}</Text>
          </View>
          {item.unreadCount > 0 && <View style={styles.avatarDot} />}
        </View>
        <View style={styles.rowMain}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>
              {item.businessName}
            </Text>
            <Text style={styles.time}>{item.lastMessageAt}</Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={styles.preview} numberOfLines={1}>
              {item.lastSenderType === 'customer' && (
                <Text style={styles.youPrefix}>You: </Text>
              )}
              {item.lastMessage}
            </Text>
            {item.unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [openChat]
  );

  const renderPersonRow = useCallback(
    ({ item }: { item: ReferralChat }) => {
      const msgs = getMessages(item.id);
      const preview = getLastMessagePreview(msgs, currentUserId);
      const viaLabel =
        item.contextType === 'business'
          ? `Via ${item.businessName ?? 'Business'}`
          : 'Via App';
      return (
        <TouchableOpacity
          testID={`person-row-${item.id}`}
          style={styles.row}
          onPress={() => openPeopleChat(item)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarWrap}>
            <View
              style={[styles.avatar, { backgroundColor: item.friend.avatarColor }]}
            >
              <Text style={styles.avatarText}>{item.friend.initials}</Text>
            </View>
            {item.unreadCount > 0 && <View style={styles.avatarDot} />}
          </View>
          <View style={styles.rowMain}>
            <View style={styles.rowTop}>
              <View style={styles.nameWrap}>
                <Heart size={11} color={TEAL} fill={TEAL} />
                <Text style={styles.name} numberOfLines={1}>
                  {item.friend.name}
                </Text>
              </View>
              <Text style={styles.time}>
                {formatRelativeTime(item.lastMessageAt)}
              </Text>
            </View>
            <View style={styles.viaRow}>
              <View
                style={[
                  styles.viaChip,
                  item.contextType === 'business'
                    ? styles.viaChipBiz
                    : styles.viaChipApp,
                ]}
              >
                <Text
                  style={[
                    styles.viaChipText,
                    item.contextType === 'business'
                      ? styles.viaChipTextBiz
                      : styles.viaChipTextApp,
                  ]}
                  numberOfLines={1}
                >
                  {viaLabel}
                </Text>
              </View>
            </View>
            <View style={styles.rowBottom}>
              <Text style={styles.preview} numberOfLines={1}>
                {preview ? (
                  <>
                    {preview.isYou && <Text style={styles.youPrefix}>You: </Text>}
                    {preview.text}
                  </>
                ) : (
                  'Say hi 👋'
                )}
              </Text>
              {item.unreadCount > 0 ? (
                <View style={[styles.badge, styles.badgeTrusted]}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [currentUserId, getMessages, openPeopleChat]
  );

  const ListFooter = useMemo(
    () => (
      <View style={styles.broadcastSection}>
        <Text style={styles.sectionLabel}>FROM BUSINESSES</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.broadcastScroll}
        >
          {BROADCASTS.map((b) => (
            <View key={b.id} style={styles.broadcastCard}>
              <View style={styles.broadcastHeader}>
                <View
                  style={[
                    styles.broadcastAvatar,
                    { backgroundColor: b.businessColor },
                  ]}
                >
                  <Text style={styles.broadcastAvatarText}>
                    {b.businessInitials}
                  </Text>
                </View>
                <Text style={styles.broadcastBiz} numberOfLines={1}>
                  {b.businessName}
                </Text>
                {b.unread && <View style={styles.broadcastDot} />}
              </View>
              <Text style={styles.broadcastTitle} numberOfLines={2}>
                {b.title}
              </Text>
              <Text style={styles.broadcastTime}>{b.timestamp}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    ),
    []
  );

  const isBusinessSegment = segment === 'businesses';
  const isEmpty =
    isBusinessSegment &&
    filtered.length === 0 &&
    query.trim().length === 0;
  const isPeopleEmpty =
    !isBusinessSegment && filteredPeople.length === 0 && query.trim().length === 0;

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
          <Text
            style={[
              styles.segmentText,
              isBusinessSegment && styles.segmentTextActive,
            ]}
          >
            Businesses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentPill, !isBusinessSegment && styles.segmentPillActive]}
          onPress={() => setSegment('people')}
          activeOpacity={0.85}
          testID="segment-people"
        >
          <Text
            style={[
              styles.segmentText,
              !isBusinessSegment && styles.segmentTextActive,
            ]}
          >
            Trusted Friends
          </Text>
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
          placeholder={
            isBusinessSegment
              ? 'Search conversations...'
              : 'Search referral chats...'
          }
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
          iconColor={ACCENT}
          elevation={0}
        />
      </View>

      {isBusinessSegment ? (
        isEmpty ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MessageSquare size={36} color={ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>
              Subscribe to a business to start chatting
            </Text>
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
            data={filtered}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={
              <View style={styles.noResults}>
                <Text style={styles.emptyTitle}>No conversations found</Text>
                <Text style={styles.emptySub}>Try a different search term</Text>
              </View>
            }
          />
        )
      ) : isPeopleEmpty ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: '#CCFBF1' }]}>
            <Heart size={36} color={TEAL} fill={TEAL} />
          </View>
          <Text style={styles.emptyTitle}>No friend chats yet</Text>
          <Text style={styles.emptySub}>
            Start a conversation from your Trusted Friends list.
          </Text>
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
          data={filteredPeople}
          keyExtractor={(it) => it.id}
          renderItem={renderPersonRow}
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
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
  segmentPillActive: {
    backgroundColor: ACCENT,
  },
  segmentText: {
    fontSize: 12,
    color: '#888780',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  segmentBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '700',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  search: {
    backgroundColor: '#F1EFE8',
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { boxShadow: 'none' as const } : null),
  },
  searchInput: {
    fontSize: 14,
    color: TEXT_DARK,
    minHeight: 0,
  },
  listContent: { paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: BG,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
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
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  time: { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
    fontSize: 12,
    color: TEXT_MUTED,
    marginRight: 8,
  },
  youPrefix: { color: ACCENT, fontWeight: '600' },
  viaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  viaChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  viaChipApp: {
    backgroundColor: ACCENT_SOFT,
  },
  viaChipBiz: {
    backgroundColor: '#E1F5EE',
  },
  viaChipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  viaChipTextApp: {
    color: ACCENT,
  },
  viaChipTextBiz: {
    color: '#0F6E56',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTrusted: {
    backgroundColor: PURPLE,
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 8,
  },
  emptyTextBtn: {
    marginTop: 14,
  },
  emptyTextBtnText: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '700',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sep: {
    height: 0.5,
    backgroundColor: '#F0EFF8',
    marginLeft: 74,
  },
  broadcastSection: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  broadcastScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  broadcastCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
  },
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  broadcastAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  broadcastBiz: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  broadcastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  broadcastTitle: {
    fontSize: 13,
    color: TEXT_DARK,
    lineHeight: 18,
    marginBottom: 8,
  },
  broadcastTime: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  noResults: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 16,
    borderRadius: 10,
  },
  emptyBtnContent: {
    paddingHorizontal: 8,
    height: 42,
  },
});
