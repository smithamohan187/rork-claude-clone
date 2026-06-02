import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Send,
  Info,
  Paperclip,
  Tag,
  Check,
  CheckCheck,
} from 'lucide-react-native';

const ACCENT = '#1A5C35';
const BG = '#F8F7FF';
const TEXT_DARK = '#1A5C35';
const TEXT_MUTED = '#1A5C35';
const BORDER = '#E8F5EE';

interface ChatMessage {
  id: string;
  senderType: 'customer' | 'business';
  content: string;
  time: string;
  isRead: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    senderType: 'customer',
    content: 'Hi! Is the almond croissant available today?',
    time: '9:30 AM',
    isRead: true,
  },
  {
    id: '2',
    senderType: 'business',
    content:
      'Good morning! Yes, we have fresh almond croissants today. They usually sell out by noon though!',
    time: '9:32 AM',
    isRead: true,
  },
  {
    id: '3',
    senderType: 'customer',
    content: 'Great! Is the 20% offer still valid on them?',
    time: '9:33 AM',
    isRead: true,
  },
  {
    id: '4',
    senderType: 'business',
    content:
      'Yes, the 20% off applies to all pastries including the almond croissant. See you soon!',
    time: '9:35 AM',
    isRead: false,
  },
];

function formatNow(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${ampm}`;
}

function TypingDots() {
  const a1 = useRef(new Animated.Value(0.3)).current;
  const a2 = useRef(new Animated.Value(0.3)).current;
  const a3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeLoop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: 400,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    const l1 = makeLoop(a1, 0);
    const l2 = makeLoop(a2, 150);
    const l3 = makeLoop(a3, 300);
    l1.start();
    l2.start();
    l3.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [a1, a2, a3]);

  return (
    <View style={styles.typingDots}>
      <Animated.View style={[styles.typingDot, { opacity: a1 }]} />
      <Animated.View style={[styles.typingDot, { opacity: a2 }]} />
      <Animated.View style={[styles.typingDot, { opacity: a3 }]} />
    </View>
  );
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    businessName?: string;
    businessInitials?: string;
    businessColor?: string;
  }>();

  const businessName = params.businessName ?? 'Business';
  const businessInitials = params.businessInitials ?? 'B';
  const businessColor = params.businessColor ?? ACCENT;

  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToEnd = useCallback((animated: boolean = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollToEnd(false), 50);
    return () => clearTimeout(t);
  }, [scrollToEnd]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleOpenOffer = useCallback(() => {
    router.push({ pathname: '/view-offer' as never, params: { offerId: '1' } as never });
  }, [router]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      senderType: 'customer',
      content: text,
      time: formatNow(),
      isRead: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      scrollToEnd(true);
    }, 1500);
    scrollToEnd(true);
  }, [inputText, scrollToEnd]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isCustomer = item.senderType === 'customer';
      if (isCustomer) {
        return (
          <View style={styles.rowRight}>
            <View style={styles.bubbleWrapRight}>
              <View style={styles.bubbleCustomer}>
                <Text style={styles.bubbleTextCustomer}>{item.content}</Text>
              </View>
              <View style={styles.metaRight}>
                <Text style={styles.metaTime}>{item.time}</Text>
                {item.isRead ? (
                  <CheckCheck size={12} color="#3B82F6" />
                ) : (
                  <CheckCheck size={12} color="#E8F5EE" />
                )}
              </View>
            </View>
          </View>
        );
      }
      return (
        <View style={styles.rowLeft}>
          <View
            style={[styles.msgAvatar, { backgroundColor: businessColor }]}
          >
            <Text style={styles.msgAvatarText}>{businessInitials}</Text>
          </View>
          <View style={styles.bubbleWrapLeft}>
            <View style={styles.bubbleBusiness}>
              <Text style={styles.bubbleTextBusiness}>{item.content}</Text>
            </View>
            <Text style={styles.metaTimeLeft}>{item.time}</Text>
          </View>
        </View>
      );
    },
    [businessColor, businessInitials]
  );

  const ListHeader = (
    <View style={styles.dayPillWrap}>
      <View style={styles.dayPill}>
        <Text style={styles.dayPillText}>Today</Text>
      </View>
    </View>
  );

  const ListFooter = isTyping ? (
    <View style={styles.rowLeft}>
      <View style={[styles.msgAvatar, { backgroundColor: businessColor }]}>
        <Text style={styles.msgAvatarText}>{businessInitials}</Text>
      </View>
      <View style={styles.bubbleWrapLeft}>
        <View style={[styles.bubbleBusiness, styles.typingBubble]}>
          <TypingDots />
        </View>
      </View>
    </View>
  ) : null;

  const canSend = inputText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-btn"
          onPress={handleBack}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View
            style={[styles.headerAvatar, { backgroundColor: businessColor }]}
          >
            <Text style={styles.headerAvatarText}>{businessInitials}</Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>
              {businessName}
            </Text>
            <Text style={styles.headerStatus}>
              Typically replies in 1 hour
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Info size={20} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        testID="offer-strip"
        activeOpacity={0.8}
        onPress={handleOpenOffer}
        style={styles.offerStrip}
      >
        <View style={styles.offerIconWrap}>
          <Tag size={12} color={ACCENT} />
        </View>
        <Text style={styles.offerText} numberOfLines={1}>
          Re: 20% off all pastries today
        </Text>
        <Text style={styles.offerLink}>View offer →</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToEnd(false)}
        />

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7}>
            <Paperclip size={20} color="#E8F5EE" />
          </TouchableOpacity>
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
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  headerTextWrap: { flex: 1 },
  headerName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  headerStatus: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  offerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8F5EE',
    gap: 8,
  },
  offerIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerText: {
    flex: 1,
    fontSize: 12,
    color: '#1A5C35',
    fontWeight: '500',
  },
  offerLink: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: '700',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  dayPillWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dayPill: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dayPillText: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  rowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bubbleWrapRight: {
    maxWidth: '75%',
    alignItems: 'flex-end',
    gap: 3,
  },
  bubbleWrapLeft: {
    maxWidth: '75%',
    alignItems: 'flex-start',
    gap: 3,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
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
  bubbleTextCustomer: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextBusiness: {
    color: TEXT_DARK,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 2,
  },
  metaTime: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  metaTimeLeft: {
    fontSize: 10,
    color: TEXT_MUTED,
    paddingLeft: 2,
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8F5EE',
  },
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
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#E8F5EE',
  },
});
