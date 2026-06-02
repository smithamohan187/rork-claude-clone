import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Phone, MoreVertical, Tag, Paperclip, Send, Zap, CheckCheck } from 'lucide-react-native';
import { conversations, chatMessages } from '@/mocks/data';
import { marketplaceMembers } from '@/mocks/marketplaceMembers';
import { useAuth } from '@/contexts/AuthContext';
import type { Message } from '@/types';

/* ───────── colours ───────── */
const DEEP_GREEN    = '#2E7D32' as const;
const ACCENT_GREEN  = '#43A047' as const;
const LIGHT_GREEN   = '#A5D6A7' as const;
const SURFACE_GREEN = '#F1F8E9' as const;
const TEXT_GREEN    = '#1B5E20' as const;
const TEXT_SEC      = '#4CAF50' as const;
const BORDER_GREEN  = '#C8E6C9' as const;
const BANNER_BG     = '#E8F5E9' as const;
const LIST_BG       = '#F9FBF9' as const;
const WHITE         = '#FFFFFF' as const;

/* ───────── types ───────── */
interface Props {
  chatId: string;
}

/* ───────── main ───────── */
export default function MarketplaceChatScreen({ chatId }: Props) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  /* lookup conversation + participant */
  const conv = useMemo(() => conversations.find(c => c.id === chatId), [chatId]);
  const participant = conv?.participant;

  /* find the marketplace member for avatar fallback */
  const member = useMemo(() => marketplaceMembers.find(m => m.name === participant?.name), [participant?.name]);

  const mySenderId = currentUser.id;

  const initialMessages = useMemo(() => chatMessages[chatId] || [], [chatId]);

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');

  /* ───────── send ───────── */
  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: `m_${Date.now()}`,
      senderId: mySenderId,
      text: inputText.trim(),
      timestamp: 'Just now',
      read: false,
      ticks: '✓',
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, mySenderId]);

  /* ───────── FAB ───────── */
  const handleFabPress = useCallback(() => {
    const quickReplies = [
      'Sounds great! Let me check and get back to you.',
      'Thank you for your interest! Would you like more details?',
      'Absolutely — happy to help!',
      'I\'ll follow up with you shortly.',
    ];
    const random = quickReplies[Math.floor(Math.random() * quickReplies.length)];
    setInputText(random);
  }, []);

  /* ───────── render helpers ───────── */
  const listHeader = useMemo(() => (
    <View style={styles.dateSep}>
      <Text style={styles.dateSepText}>Today</Text>
    </View>
  ), []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMe = item.senderId === mySenderId;

    if (isMe) {
      return (
        <View style={styles.sentWrap}>
          <View style={styles.sentBubble}>
            <Text style={styles.sentText}>{item.text}</Text>
          </View>
          <View style={styles.sentMeta}>
            <Text style={styles.sentTime}>{item.timestamp}</Text>
            {item.ticks ? (
              <CheckCheck size={14} color={LIGHT_GREEN} style={{ marginLeft: 4 }} />
            ) : null}
          </View>
        </View>
      );
    }

    /* received */
    const avatarUri = participant?.avatar || '';
    return (
      <View style={styles.recvWrap}>
        <Image
          source={{ uri: avatarUri }}
          style={styles.recvAvatar}
          contentFit="cover"
        />
        <View style={styles.recvBubbleOuter}>
          <View style={styles.recvBubble}>
            <Text style={styles.recvText}>{item.text}</Text>
          </View>
          <Text style={styles.recvTime}>{item.timestamp}</Text>
        </View>
      </View>
    );
  }, [mySenderId, participant?.avatar]);

  if (!conv || !participant) {
    return (
      <View style={styles.flex}>
        <SafeAreaView style={styles.emptyWrap} edges={['top']}>
          <Text style={styles.emptyText}>Conversation not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* ─── offer banner (always visible) ─── */}
      <SafeAreaView edges={['top']} style={styles.bannerSafe}>
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconWrap}>
              <Tag size={16} color={DEEP_GREEN} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                Re: Summer Loyalty Offer – 15% off
              </Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.bannerLink}>
            <Text style={styles.bannerLinkText}>View offer</Text>
            <Text style={styles.bannerLinkArrow}>{'  →'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ─── header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerBack}>
          <ArrowLeft size={22} color={DEEP_GREEN} />
        </TouchableOpacity>
        <Image
          source={{ uri: participant.avatar }}
          style={styles.headerAvatar}
          contentFit="cover"
          placeholder={{ backgroundColor: DEEP_GREEN }}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{participant.name}</Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.headerStatus}>Active now</Text>
          </View>
        </View>
        <TouchableOpacity hitSlop={12} style={styles.headerAction}>
          <Phone size={20} color={DEEP_GREEN} />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={12} style={styles.headerAction}>
          <MoreVertical size={20} color={DEEP_GREEN} />
        </TouchableOpacity>
      </View>

      {/* ─── message list + input ─── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          style={{ backgroundColor: LIST_BG }}
        />

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={handleFabPress}
        >
          <Zap size={20} color={WHITE} />
        </TouchableOpacity>

        {/* input bar */}
        <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
          <View style={styles.inputRow}>
            <TouchableOpacity activeOpacity={0.7} style={styles.attachBtn} hitSlop={6}>
              <Paperclip size={22} color={TEXT_SEC} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#81C784"
              multiline
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.7}
            >
              <Send size={18} color={WHITE} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ───────── styles ───────── */
const styles = StyleSheet.create({
  flex: { flex: 1 },

  /* empty */
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: LIST_BG },
  emptyText: { fontSize: 15, color: TEXT_GREEN },

  /* ─── banner ─── */
  bannerSafe: { backgroundColor: WHITE },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BANNER_BG,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GREEN,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT_GREEN,
  },
  bannerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bannerIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { fontSize: 13, fontWeight: '600' as const, color: TEXT_GREEN },
  bannerLink: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  bannerLinkText: { fontSize: 12, fontWeight: '700' as const, color: ACCENT_GREEN },
  bannerLinkArrow: { fontSize: 12, fontWeight: '700' as const, color: ACCENT_GREEN },

  /* ─── header ─── */
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER_GREEN,
    height: 56,
  },
  headerBack: { padding: 4, marginRight: 6 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: DEEP_GREEN, marginRight: 10 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700' as const, color: TEXT_GREEN },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ACCENT_GREEN, marginRight: 5 },
  headerStatus: { fontSize: 12, fontWeight: '500' as const, color: TEXT_SEC },
  headerAction: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },

  /* ─── date separator ─── */
  dateSep: {
    alignSelf: 'center' as const,
    backgroundColor: BANNER_BG,
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 14,
  },
  dateSepText: { fontSize: 12, fontWeight: '600' as const, color: TEXT_SEC },

  /* ─── message list ─── */
  msgList: { padding: 14, paddingBottom: 8 },

  /* ─── sent bubble ─── */
  sentWrap: { alignItems: 'flex-end', marginBottom: 12, marginRight: 6 },
  sentBubble: {
    backgroundColor: DEEP_GREEN,
    borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    maxWidth: '75%',
    shadowColor: DEEP_GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sentText: { fontSize: 15, fontWeight: '400' as const, color: WHITE, lineHeight: 21 },
  sentMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3, marginRight: 6 },
  sentTime: { fontSize: 11, fontWeight: '400' as const, color: TEXT_SEC },

  /* ─── received bubble ─── */
  recvWrap: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, marginLeft: 2 },
  recvAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: DEEP_GREEN, marginRight: 8, marginBottom: 2 },
  recvBubbleOuter: { maxWidth: '72%' },
  recvBubble: {
    backgroundColor: WHITE,
    borderRadius: 18, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: BORDER_GREEN,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  recvText: { fontSize: 15, fontWeight: '400' as const, color: TEXT_GREEN, lineHeight: 21 },
  recvTime: { fontSize: 11, fontWeight: '400' as const, color: TEXT_SEC, marginLeft: 6, marginTop: 3 },

  /* ─── FAB ─── */
  fab: {
    position: 'absolute' as const,
    bottom: 80, right: 18,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: ACCENT_GREEN,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: DEEP_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  /* ─── input bar ─── */
  inputSafe: { backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER_GREEN },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  attachBtn: { padding: 4 },
  input: {
    flex: 1,
    backgroundColor: SURFACE_GREEN,
    borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 8,
    fontSize: 15, color: TEXT_GREEN,
    borderWidth: 1, borderColor: BORDER_GREEN,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: DEEP_GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: BORDER_GREEN },
});
