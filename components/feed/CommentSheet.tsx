import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PostComment } from '@/mocks/posts';

const PURPLE = '#1A5C35';

interface Props {
  visible: boolean;
  comments: PostComment[];
  onClose: () => void;
  onSend: (text: string) => void;
}

export default function CommentSheet({ visible, comments, onClose, onSend }: Props) {
  const [input, setInput] = useState<string>('');
  const scrollRef = useRef<ScrollView | null>(null);
  const insets = useSafeAreaInsets();

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [input, onSend]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <View style={styles.sheet} testID="comment-sheet">
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <X size={22} color="#1A5C35" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {comments.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Be the first to comment</Text>
              </View>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.row}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{c.user.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.bodyCol}>
                    <View style={styles.bodyHead}>
                      <Text style={styles.user}>{c.user}</Text>
                      <Text style={styles.time}>{c.time}</Text>
                    </View>
                    <Text style={styles.text}>{c.text}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Write a comment…"
              placeholderTextColor="#9aa0a6"
              style={styles.input}
              multiline
              testID="comment-input"
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              disabled={!input.trim()}
              testID="comment-send"
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    maxHeight: '80%',
    minHeight: '50%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A5C35',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    color: '#1A5C35',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1EEF7',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: PURPLE,
    fontWeight: '700',
  },
  bodyCol: {
    flex: 1,
  },
  bodyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  user: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A5C35',
  },
  time: {
    fontSize: 11,
    color: '#9aa0a6',
  },
  text: {
    fontSize: 14,
    color: '#222',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F4F2FA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 14,
    color: '#1A5C35',
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
