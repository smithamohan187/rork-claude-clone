import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Avatar } from 'react-native-paper';
import { ArrowLeft, Send, MessagesSquare } from 'lucide-react-native';
import {
  businessConversations,
  businessChatMessages,
  currentBusinessUser,
} from '@/mocks/data';
import type { Message } from '@/types';

const ACCENT = '#1A5C35';
const ACCENT_SOFT = '#E8F5EE';
const BUBBLE_OTHER = '#F2F0F7';

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const listRef = useRef<FlatList<Message>>(null);

  const conversation = useMemo(
    () => businessConversations.find((c) => c.id === id),
    [id]
  );

  const [messages, setMessages] = useState<Message[]>(
    () => (id ? businessChatMessages[id] ?? [] : [])
  );
  const [draft, setDraft] = useState<string>('');

  const businessId = currentBusinessUser.id;

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const display = `${((hh + 11) % 12) + 1}:${mm
      .toString()
      .padStart(2, '0')} ${ampm}`;

    const newMessage: Message = {
      id: `local-${Date.now()}`,
      senderId: businessId,
      text,
      timestamp: display,
      read: false,
    };
    console.log('[ChatThread] send', newMessage);
    setMessages((prev) => [...prev, newMessage]);
    setDraft('');
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [draft, businessId]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMe = item.senderId === businessId;
      const prev = messages[index - 1];
      const next = messages[index + 1];
      const sameSenderAsNext = next && next.senderId === item.senderId;
      const isFirstInGroup = !prev || prev.senderId !== item.senderId;
      const isLastInGroup = !sameSenderAsNext;

      return (
        <View
          style={[
            styles.bubbleRow,
            isMe ? styles.rowRight : styles.rowLeft,
            { marginTop: isFirstInGroup ? 12 : 2 },
          ]}
        >
          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              isMe
                ? {
                    borderBottomRightRadius: isLastInGroup ? 6 : 20,
                  }
                : {
                    borderBottomLeftRadius: isLastInGroup ? 6 : 20,
                  },
            ]}
          >
            <Text style={isMe ? styles.textMe : styles.textOther}>
              {item.text}
            </Text>
          </View>
          {isLastInGroup ? (
            <Text
              style={[
                styles.timestamp,
                isMe ? styles.timestampRight : styles.timestampLeft,
              ]}
            >
              {item.timestamp}
            </Text>
          ) : null}
        </View>
      );
    },
    [messages, businessId]
  );

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="chat-back"
          >
            <ArrowLeft size={22} color="#14121C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Conversation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="chat-back"
        >
          <ArrowLeft size={22} color="#14121C" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Avatar.Image
            size={36}
            source={{ uri: conversation.participant.avatar }}
          />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversation.participant.name}
            </Text>
            <Text style={styles.headerStatus}>
              {conversation.participant.isOnline ? 'Active now' : 'Business'}
            </Text>
          </View>
        </View>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={
            messages.length === 0 ? styles.emptyList : styles.listContent
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MessagesSquare size={32} color={ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.emptySub}>
                Send your first message to {conversation.participant.name}
              </Text>
            </View>
          }
        />

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <RNTextInput
              testID="chat-input"
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor="#E8F5EE"
              style={styles.input}
              multiline
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity
            testID="chat-send"
            onPress={handleSend}
            disabled={!draft.trim()}
            activeOpacity={0.85}
            style={[
              styles.sendBtn,
              !draft.trim() && styles.sendBtnDisabled,
            ]}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEF5',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  headerTextWrap: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#14121C' },
  headerStatus: { fontSize: 12, color: '#E8F5EE', marginTop: 1 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#14121C' },
  listContent: { paddingHorizontal: 12, paddingVertical: 12 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 6,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#14121C' },
  emptySub: {
    fontSize: 14,
    color: '#E8F5EE',
    textAlign: 'center',
    marginTop: 2,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleRow: { paddingHorizontal: 4 },
  rowLeft: { alignItems: 'flex-start' },
  rowRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleMe: { backgroundColor: ACCENT },
  bubbleOther: { backgroundColor: BUBBLE_OTHER },
  textMe: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  textOther: { color: '#14121C', fontSize: 15, lineHeight: 20 },
  timestamp: {
    fontSize: 11,
    color: '#E8F5EE',
    marginTop: 4,
    marginHorizontal: 8,
  },
  timestampLeft: { alignSelf: 'flex-start' },
  timestampRight: { alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EEF5',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#F3F1F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: '#14121C',
    maxHeight: 120,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E8F5EE' },
});
