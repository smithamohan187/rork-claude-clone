import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Check, CheckCheck, Store, Users, Heart } from 'lucide-react-native';
import {
  useReferralChat,
  formatDayLabel,
  formatClockTime,
  type ReferralChatMessage,
} from '@/contexts/ReferralChatContext';
import { OfferShareBubble } from '@/components/chat/OfferShareBubble';

const ACCENT = '#1A5C35';
const ACCENT_DARK = '#1A5C35';
const PURPLE = '#00B246';
const TEAL = '#0D9488';
const TEAL_SOFT = '#CCFBF1';
const BG = '#F4F2FC';
const SURFACE = '#FFFFFF';
const TEXT_DARK = '#1A5C35';
const TEXT_MUTED = '#1A5C35';

type FlatListItem =
  | { type: 'message'; message: ReferralChatMessage }
  | { type: 'day'; id: string; label: string };

export default function ReferralChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; source?: string }>();
  const chatId = (params.id ?? '') as string;
  const isTrustedFriend = params.source === 'trusted_friends';

  const {
    getChat,
    getMessages,
    sendMessage,
    markChatRead,
    currentUserId,
  } = useReferralChat();

  const chat = getChat(chatId);
  const messages = useMemo(() => getMessages(chatId), [getMessages, chatId]);
  const [draft, setDraft] = useState<string>('');
  const listRef = useRef<FlatList<FlatListItem>>(null);

  useEffect(() => {
    if (chatId) {
      markChatRead(chatId);
    }
  }, [chatId, markChatRead]);

  const data = useMemo<FlatListItem[]>(() => {
    const out: FlatListItem[] = [];
    let lastDay = '';
    messages.forEach((m) => {
      const label = formatDayLabel(m.createdAt);
      if (label !== lastDay) {
        out.push({ type: 'day', id: `day-${m.id}`, label });
        lastDay = label;
      }
      out.push({ type: 'message', message: m });
    });
    return out;
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || !chatId) return;
    sendMessage(chatId, text);
    setDraft('');
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [draft, chatId, sendMessage]);

  const openProfile = useCallback(() => {
    if (!chat) return;
    router.push({
      pathname: '/public-profile',
      params: { profileId: chat.friend.profileId, name: chat.friend.name },
    } as never);
  }, [chat, router]);

  const renderItem: ListRenderItem<FlatListItem> = useCallback(
    ({ item }) => {
      if (item.type === 'day') {
        return (
          <View style={styles.dayWrap}>
            <View style={styles.dayPill}>
              <Text style={styles.dayText}>{item.label}</Text>
            </View>
          </View>
        );
      }
      const m = item.message;
      const mine = m.senderId === currentUserId;
      if (m.kind === 'offer_share' && m.offerPayload) {
        return (
          <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
            <OfferShareBubble
              payload={m.offerPayload}
              body={m.body}
              mine={mine}
              senderName={mine ? undefined : chat?.friend.name}
              senderAvatar={
                mine
                  ? undefined
                  : chat
                  ? { initials: chat.friend.initials, color: chat.friend.avatarColor }
                  : undefined
              }
              timestamp={formatClockTime(m.createdAt)}
            />
          </View>
        );
      }
      return (
        <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
          <View
            style={[
              styles.bubble,
              mine
                ? isTrustedFriend
                  ? styles.bubbleMineTrusted
                  : styles.bubbleMine
                : styles.bubbleTheirs,
              mine ? styles.bubbleTailMine : styles.bubbleTailTheirs,
            ]}
          >
            <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
              {m.body}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.timeText, mine && styles.timeTextMine]}>
                {formatClockTime(m.createdAt)}
              </Text>
              {mine ? (
                m.status === 'read' ? (
                  <CheckCheck size={12} color="#A9E7FF" />
                ) : (
                  <Check size={12} color="rgba(255,255,255,0.7)" />
                )
              ) : null}
            </View>
          </View>
        </View>
      );
    },
    [currentUserId, chat, isTrustedFriend]
  );

  if (!chat) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <ArrowLeft size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chat</Text>
            <View style={styles.iconBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.missingWrap}>
          <Text style={styles.missingText}>This chat is no longer available.</Text>
        </View>
      </View>
    );
  }

  const contextLabel =
    chat.contextType === 'business'
      ? `Connected via ${chat.businessName ?? 'Business'} Referral`
      : 'Connected via App Referral';

  return (
    <View style={styles.root} testID="referral-chat-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            testID="back-btn"
          >
            <ArrowLeft size={22} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerCenter}
            onPress={openProfile}
            activeOpacity={0.8}
            testID="open-friend-profile"
          >
            <View style={[styles.headerAvatar, { backgroundColor: chat.friend.avatarColor }]}>
              <Text style={styles.headerAvatarText}>{chat.friend.initials}</Text>
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerName} numberOfLines={1}>
                {chat.friend.name}
              </Text>
              {isTrustedFriend ? (
                <View style={styles.trustedChip} testID="trusted-friend-chip">
                  <Heart size={10} color={TEAL} fill={TEAL} />
                  <Text style={styles.trustedChipText}>Trusted Friend</Text>
                </View>
              ) : (
                <View style={styles.contextChip}>
                  {chat.contextType === 'business' ? (
                    <Store size={10} color="#E8F5EE" />
                  ) : (
                    <Users size={10} color="#E8F5EE" />
                  )}
                  <Text style={styles.contextText} numberOfLines={1}>
                    {contextLabel}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.iconBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={(item) => (item.type === 'day' ? item.id : item.message.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          testID="chat-messages"
        />

        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message..."
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
            multiline
            maxLength={1000}
            testID="chat-input"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              isTrustedFriend && styles.sendBtnTrusted,
              !draft.trim() && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!draft.trim()}
            activeOpacity={0.85}
            testID="chat-send"
          >
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeTop: { backgroundColor: ACCENT_DARK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: ACCENT_DARK,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  headerTextWrap: { flex: 1 },
  headerName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  contextText: {
    fontSize: 10,
    color: '#E8F5EE',
    fontWeight: '500',
  },
  body: { flex: 1 },
  listContent: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  dayWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dayPill: {
    backgroundColor: 'rgba(83, 52, 183, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  bubbleRow: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 2,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: ACCENT,
  },
  bubbleMineTrusted: {
    backgroundColor: PURPLE,
  },
  trustedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    backgroundColor: TEAL_SOFT,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  trustedChipText: {
    color: TEAL,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bubbleTheirs: {
    backgroundColor: SURFACE,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
  },
  bubbleTailMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTailTheirs: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: TEXT_DARK,
    lineHeight: 19,
  },
  bubbleTextMine: { color: '#ffffff' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 3,
  },
  timeText: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  timeTextMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#E8F5EE',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: '#F4F2FC',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 11 : 8,
    paddingBottom: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 14,
    color: TEXT_DARK,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#E8F5EE',
  },
  sendBtnTrusted: {
    backgroundColor: PURPLE,
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  missingText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
});
