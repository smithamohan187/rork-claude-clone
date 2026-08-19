import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Info, CheckCheck } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useConversation } from '@/hooks/useConversation';
import type { ChatMessage } from '@/api/services/chatService';
import type { ConversationType } from '@/api/services/chatService';
import { resolveShareReferral } from '@/api/services/sharesService';
import { parseReferralFromUrl } from '@/utils/shareReferral';
import { useSnackbar } from '@/contexts/SnackbarContext';

const ACCENT = '#1A5C35';
const BG = '#F8F7FF';
const TEXT_DARK = '#1A5C35';
const TEXT_MUTED = '#1A5C35';
const BORDER = '#E8F5EE';

// Matches a SHARE_BASE_URL/s/<code> link so it can be split out of a message body and rendered as
// a tappable segment. Resolved in-app (not via Linking.openURL) since Universal/App Links aren't
// configured — see invite-friends.md's documented gap.
const SHARE_LINK_SPLIT = /(https?:\/\/\S+\/s\/[A-Za-z0-9-]+)/g;
const SHARE_LINK_MATCH = /^https?:\/\/\S+\/s\/[A-Za-z0-9-]+$/;

function splitMessageBody(body: string): { text: string; isLink: boolean }[] {
  const parts = body.split(SHARE_LINK_SPLIT);
  return parts.filter((p) => p.length > 0).map((p) => ({ text: p, isLink: SHARE_LINK_MATCH.test(p) }));
}

// Real photo when available (other party's avatar/business logo); colored-initials
// circle fallback otherwise — used for both the header and per-message avatars.
function Avatar({ uri, color, initials, size, textSize }: {
  uri: string | null;
  color: string;
  initials: string;
  size: number;
  textSize: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarFallbackText, { fontSize: textSize }]}>{initials}</Text>
    </View>
  );
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${ampm}`;
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    targetProfileId?: string;
    type?: string;
    name?: string;
    // legacy params still passed by some callers
    businessName?: string;
    businessInitials?: string;
    businessColor?: string;
    avatarColor?: string;
  }>();

  const type = (params.type as ConversationType | undefined) ?? undefined;
  // When opened from a roster (Businesses/Friends tab, my-referrals, business
  // profile) the [id] route segment is just filler — resolve/create by
  // targetProfileId + type instead. Only treat params.id as a real
  // conversation id when no roster target was supplied.
  const rosterOpen = !!params.targetProfileId && !!type;

  const { conversationId, otherParty, messages, loading, error, sending, send, myProfileId } = useConversation({
    conversationId: rosterOpen ? undefined : params.id,
    targetProfileId: params.targetProfileId,
    type,
  });

  // otherParty (fetched via getOrCreateConversation) is the backend's real name/photo —
  // preferred over the route params, which are only a same-instant navigation fallback so
  // the header isn't blank while that fetch is in flight.
  const otherName = otherParty?.name ?? params.name ?? params.businessName ?? 'Chat';
  const otherAvatarUrl = otherParty?.avatarUrl ?? null;
  const avatarColor = params.businessColor ?? params.avatarColor ?? ACCENT;
  const initials = (params.businessInitials ??
    otherName
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase()) || 'C';

  const { showSnackbar } = useSnackbar();
  const [inputText, setInputText] = useState<string>('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => scrollToEnd(false), 50);
      return () => clearTimeout(t);
    }
  }, [messages.length, scrollToEnd]);

  const handleBack = useCallback(() => router.back(), [router]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    scrollToEnd(true);
    send(text).then((ok) => {
      if (!ok) {
        // Restore the text so a failed send doesn't just silently vanish — the
        // optimistic message was already removed by useConversation's send().
        setInputText(text);
        showSnackbar("Couldn't send your message. Please try again.");
      }
    });
  }, [inputText, send, scrollToEnd, showSnackbar]);

  // Resolves a tapped share-link in-app (code -> route) rather than Linking.openURL, since
  // Universal/App Links aren't configured — see invite-friends.md's documented gap.
  const handleLinkPress = useCallback(
    async (url: string) => {
      const code = parseReferralFromUrl(url);
      if (!code) return;
      const resolved = await resolveShareReferral(code);
      if (!resolved) return;
      router.push({
        pathname: resolved.route as never,
        params: { [resolved.id_param]: resolved.content_id, businessId: resolved.business_id } as never,
      });
    },
    [router],
  );

  const renderMessageBody = useCallback(
    (body: string, mineStyle: boolean) => (
      <Text style={mineStyle ? styles.bubbleTextCustomer : styles.bubbleTextBusiness}>
        {splitMessageBody(body).map((part, idx) =>
          part.isLink ? (
            <Text
              key={idx}
              style={mineStyle ? styles.linkTextOnAccent : styles.linkText}
              onPress={() => handleLinkPress(part.text)}
            >
              {part.text}
            </Text>
          ) : (
            <Text key={idx}>{part.text}</Text>
          ),
        )}
      </Text>
    ),
    [handleLinkPress],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const mine = !!myProfileId && item.sender_profile_id === myProfileId;
      if (mine) {
        return (
          <View style={styles.rowRight}>
            <View style={styles.bubbleWrapRight}>
              <View style={styles.bubbleCustomer}>
                {renderMessageBody(item.body, true)}
              </View>
              <View style={styles.metaRight}>
                <Text style={styles.metaTime}>{formatClock(item.created_at)}</Text>
                <CheckCheck size={12} color="#3B82F6" />
              </View>
            </View>
          </View>
        );
      }
      return (
        <View style={styles.rowLeft}>
          <Avatar uri={otherAvatarUrl} color={avatarColor} initials={initials} size={28} textSize={10} />
          <View style={styles.bubbleWrapLeft}>
            <View style={styles.bubbleBusiness}>
              {renderMessageBody(item.body, false)}
            </View>
            <Text style={styles.metaTimeLeft}>{formatClock(item.created_at)}</Text>
          </View>
        </View>
      );
    },
    [avatarColor, initials, otherAvatarUrl, myProfileId, renderMessageBody],
  );

  const ListHeader = useMemo(
    () =>
      messages.length > 0 ? (
        <View style={styles.dayPillWrap}>
          <View style={styles.dayPill}>
            <Text style={styles.dayPillText}>Today</Text>
          </View>
        </View>
      ) : null,
    [messages.length],
  );

  const canSend = inputText.trim().length > 0 && !!conversationId && !sending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={handleBack} style={styles.headerBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Avatar uri={otherAvatarUrl} color={avatarColor} initials={initials} size={34} textSize={11} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherName}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Info size={20} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : error && messages.length === 0 ? (
          <View style={styles.centerFill}>
            <Text style={styles.errorTitle}>Chat unavailable</Text>
            <Text style={styles.errorSub}>{error}</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <View style={styles.centerFill}>
                <Text style={styles.errorSub}>Say hi 👋</Text>
              </View>
            }
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollToEnd(false)}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            testID="message-input"
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
            multiline
          />
          <TouchableOpacity
            testID="send-btn"
            onPress={handleSend}
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            activeOpacity={0.85}
            disabled={!canSend}
          >
            <Send size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  errorTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  errorSub: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: '#FFFFFF', fontWeight: '700' },
  headerTextWrap: { flex: 1 },
  headerName: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 10, flexGrow: 1 },
  dayPillWrap: { alignItems: 'center', marginBottom: 4 },
  dayPill: { backgroundColor: '#E8F5EE', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10 },
  dayPillText: { fontSize: 10, color: TEXT_MUTED, fontWeight: '600' },
  rowRight: { flexDirection: 'row', justifyContent: 'flex-end' },
  rowLeft: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleWrapRight: { maxWidth: '75%', alignItems: 'flex-end', gap: 3 },
  bubbleWrapLeft: { maxWidth: '75%', alignItems: 'flex-start', gap: 3 },
  bubbleCustomer: {
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleBusiness: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
  },
  bubbleTextCustomer: { color: '#FFFFFF', fontSize: 13, lineHeight: 18 },
  bubbleTextBusiness: { color: TEXT_DARK, fontSize: 13, lineHeight: 18 },
  linkText: { color: ACCENT, textDecorationLine: 'underline', fontWeight: '600' },
  linkTextOnAccent: { color: '#FFFFFF', textDecorationLine: 'underline', fontWeight: '700' },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 2 },
  metaTime: { fontSize: 10, color: TEXT_MUTED },
  metaTimeLeft: { fontSize: 10, color: TEXT_MUTED, paddingLeft: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
    color: TEXT_DARK,
    maxHeight: 100,
    minHeight: 36,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#E8F5EE' },
});
