import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Send } from 'lucide-react-native';
import type { CommentItem } from '@/hooks/useComments';

interface Props {
  comments: CommentItem[];
  commentText: string;
  setCommentText: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  onViewAll?: () => void;
  currentUserInitials: string;
  currentUserColor: string;
}

const PRIMARY = '#1A5C35';

export const CommentSection = React.memo(function CommentSection({
  comments,
  commentText,
  setCommentText,
  submitting,
  onSubmit,
  onViewAll,
  currentUserInitials,
  currentUserColor,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const visible = comments.slice(-3);
  const hasMore = comments.length > 3;

  return (
    <View style={styles.wrap} testID="comment-section">
      <Text style={styles.count}>
        {comments.length === 0 ? 'Be the first to comment' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
      </Text>

      {visible.map((c) => (
        <View key={c.id} style={styles.commentRow}>
          <View style={[styles.avatar, { backgroundColor: c.avatarColor }]}>
            <Text style={styles.avatarText}>{c.authorInitials}</Text>
          </View>
          <View style={[styles.bubble, c.isBusinessReply && styles.bubbleBusiness]}>
            <View style={styles.bubbleHeader}>
              <Text style={[styles.author, c.isBusinessReply && styles.authorBusiness]} numberOfLines={1}>
                {c.author}
              </Text>
              {c.isBusinessReply ? (
                <Text style={styles.bizTag}>· Business</Text>
              ) : null}
            </View>
            <Text style={styles.body}>{c.body}</Text>
            <View style={styles.microRow}>
              <Pressable hitSlop={6}>
                <Text style={styles.microAction}>👍 Like{c.likeCount > 0 ? ` (${c.likeCount})` : ''}</Text>
              </Pressable>
              <Pressable hitSlop={6}>
                <Text style={styles.microAction}>↩ Reply</Text>
              </Pressable>
              <Text style={styles.timestamp}>{c.createdAt}</Text>
            </View>
          </View>
        </View>
      ))}

      {hasMore && onViewAll ? (
        <Pressable onPress={onViewAll} hitSlop={6} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View all {comments.length} comments →</Text>
        </Pressable>
      ) : null}

      <View style={styles.inputRow}>
        <View style={[styles.avatar, { backgroundColor: currentUserColor }]}>
          <Text style={styles.avatarText}>{currentUserInitials}</Text>
        </View>
        <View style={styles.inputPill}>
          <TextInput
            ref={inputRef}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment…"
            placeholderTextColor="#1A5C35"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={onSubmit}
            editable={!submitting}
            testID="comment-input"
          />
          <Pressable onPress={onSubmit} style={styles.sendBtn} disabled={submitting || !commentText.trim()} hitSlop={6}>
            {submitting ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <Send size={16} color={commentText.trim() ? PRIMARY : '#E8F5EE'} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E8F5EE',
  },
  count: {
    fontSize: 11,
    color: '#1A5C35',
    fontWeight: '700',
    marginBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#F3F0FA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleBusiness: {
    borderLeftWidth: 2,
    borderLeftColor: PRIMARY,
    backgroundColor: '#E8F5EE',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  author: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A5C35',
  },
  authorBusiness: {
    color: PRIMARY,
  },
  bizTag: {
    fontSize: 10,
    color: PRIMARY,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    color: '#1A5C35',
    marginTop: 2,
    lineHeight: 17,
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  microAction: {
    fontSize: 10,
    color: '#1A5C35',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    color: '#1A5C35',
    marginLeft: 'auto',
  },
  viewAll: {
    marginTop: 2,
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6FB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#1A5C35',
    paddingVertical: 6,
  },
  sendBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
