import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Send } from 'lucide-react-native';
import type { CommentItem } from '@/hooks/useComments';
import { formatRelativeTime } from '@/mocks/posts';

interface Props {
  comments: CommentItem[];
  commentText: string;
  setCommentText: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  onViewAll?: () => void;
  onLikeComment: (commentId: string) => void;
  onReply: (comment: CommentItem) => void;
  onDelete: (commentId: string) => void;
  currentProfileId: string | null;
  replyingToName?: string | null;
  onDismissReply?: () => void;
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
  onLikeComment,
  onReply,
  onDelete,
  currentProfileId,
  replyingToName,
  onDismissReply,
  currentUserInitials,
  currentUserColor,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // A deleted comment with no replies has nothing left to preserve a thread for — drop it
  // entirely instead of showing a permanent tombstone. Replies can never have their own
  // children (1-level nesting), so a deleted reply is always dropped. Live-reply presence is
  // computed from the actual flat list (not the static replyCount field from the original
  // fetch), so deleting a parent's last reply also drops the parent's tombstone in one step.
  const parentsWithLiveReplies = new Set(
    comments.filter((c) => c.parentId && !c.isDeleted).map((c) => c.parentId)
  );
  const renderable = comments.filter(
    (c) => !c.isDeleted || (c.parentId === null && parentsWithLiveReplies.has(c.id))
  );
  const visible = renderable.slice(-3);
  const hasMore = renderable.length > 3;

  const handleLongPress = useCallback(
    (comment: CommentItem) => {
      if (comment.isDeleted || !currentProfileId || comment.profileId !== currentProfileId) return;
      Alert.alert('Delete comment', 'Remove this comment?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
      ]);
    },
    [currentProfileId, onDelete]
  );

  return (
    <View style={styles.wrap} testID="comment-section">
      <Text style={styles.count}>
        {renderable.length === 0 ? 'Be the first to comment' : `${renderable.length} comment${renderable.length === 1 ? '' : 's'}`}
      </Text>

      {visible.map((c) => (
        <Pressable
          key={c.id}
          style={styles.commentRow}
          onLongPress={() => handleLongPress(c)}
        >
          <View style={[styles.avatar, { backgroundColor: c.avatarColor }]}>
            <Text style={styles.avatarText}>{c.authorInitials}</Text>
          </View>
          <View style={[styles.bubble, c.isBusinessReply && styles.bubbleBusiness]}>
            {!c.isDeleted && (
              <View style={styles.bubbleHeader}>
                <Text style={[styles.author, c.isBusinessReply && styles.authorBusiness]} numberOfLines={1}>
                  {c.author}
                </Text>
                {c.isBusinessReply ? (
                  <Text style={styles.bizTag}>· Business</Text>
                ) : null}
              </View>
            )}
            <Text style={[styles.body, c.isDeleted && styles.bodyDeleted]}>{c.body}</Text>
            {!c.isDeleted && (
              <View style={styles.microRow}>
                <Pressable hitSlop={6} onPress={() => onLikeComment(c.id)}>
                  <Text style={[styles.microAction, c.hasLiked && styles.microActionActive]}>
                    {c.hasLiked ? '👍 Liked' : '👍 Like'}{c.likeCount > 0 ? ` (${c.likeCount})` : ''}
                  </Text>
                </Pressable>
                {!c.parentId && (
                  <Pressable hitSlop={6} onPress={() => onReply(c)}>
                    <Text style={styles.microAction}>↩ Reply</Text>
                  </Pressable>
                )}
                {currentProfileId && c.profileId === currentProfileId && (
                  <Pressable hitSlop={6} onPress={() => handleLongPress(c)} testID={`delete-comment-${c.id}`}>
                    <Text style={styles.microActionDelete}>🗑 Delete</Text>
                  </Pressable>
                )}
                <Text style={styles.timestamp}>{formatRelativeTime(c.createdAt)}</Text>
              </View>
            )}
          </View>
        </Pressable>
      ))}

      {hasMore && onViewAll ? (
        <Pressable onPress={onViewAll} hitSlop={6} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View all {renderable.length} comments →</Text>
        </Pressable>
      ) : null}

      {replyingToName ? (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText} numberOfLines={1}>
            Replying to <Text style={styles.replyBannerName}>{replyingToName}</Text>
          </Text>
          <Pressable onPress={onDismissReply} hitSlop={8}>
            <Text style={styles.replyBannerDismiss}>✕</Text>
          </Pressable>
        </View>
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
            placeholder={replyingToName ? `Reply to ${replyingToName}…` : 'Add a comment…'}
            placeholderTextColor="#1A5C35"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={onSubmit}
            editable={!submitting}
            testID="comment-input"
          />
          <Pressable onPress={onSubmit} style={styles.sendBtn} disabled={submitting || !commentText.trim()} hitSlop={6} testID="comment-send-btn">
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
  bodyDeleted: {
    fontStyle: 'italic',
    color: '#9aa0a6',
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
  microActionActive: {
    color: '#0F3D22',
    fontWeight: '800',
  },
  microActionDelete: {
    fontSize: 10,
    color: '#E24B4A',
    fontWeight: '600',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  replyBannerText: {
    fontSize: 11,
    color: '#1A5C35',
    flex: 1,
    marginRight: 8,
  },
  replyBannerName: {
    fontWeight: '800',
  },
  replyBannerDismiss: {
    fontSize: 12,
    color: '#1A5C35',
    fontWeight: '700',
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
