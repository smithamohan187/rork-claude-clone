import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Send, CornerDownRight, ThumbsUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment, ContentType } from '@/api/services/commentsService';

const GREEN = '#1A5C35';

interface Props {
  visible: boolean;
  contentType: ContentType;
  contentId: string;
  initialCommentCount?: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function Avatar({ name, url, size = 34 }: { name: string | null; url: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  if (url && !failed) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setFailed(true)}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );
}

interface CommentRowProps {
  comment: Comment;
  currentProfileId: string | null;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  onLoadReplies: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  isReply?: boolean;
}

function CommentRow({ comment, currentProfileId, onReply, onDelete, onLoadReplies, onToggleLike, isReply = false }: CommentRowProps) {
  const canDelete = !comment.is_deleted && currentProfileId && comment.profile_id === currentProfileId;

  const handleLongPress = useCallback(() => {
    if (!canDelete) return;
    Alert.alert('Delete comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
    ]);
  }, [canDelete, comment.id, onDelete]);

  const shownReplies = comment.replies ?? [];
  const hiddenCount = (comment.reply_count ?? 0) - shownReplies.length;

  return (
    <View style={isReply ? styles.replyWrapper : undefined}>
      <Pressable
        onLongPress={handleLongPress}
        style={({ pressed }) => [styles.commentRow, pressed && styles.commentRowPressed]}
      >
        <Avatar name={comment.display_name} url={comment.avatar_url} size={isReply ? 28 : 34} />
        <View style={styles.commentBody}>
          {!comment.is_deleted && (
            <View style={styles.commentMeta}>
              <Text style={styles.commentName}>{comment.display_name ?? 'User'}</Text>
              <Text style={styles.commentTime}>{relativeTime(comment.created_at)}</Text>
            </View>
          )}
          <Text style={[styles.commentText, comment.is_deleted && styles.commentDeleted]}>
            {comment.body}
          </Text>
          {!comment.is_deleted && (
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => onToggleLike(comment.id)} hitSlop={8} style={styles.replyBtn}>
                <ThumbsUp
                  size={12}
                  color={comment.liked_by_me ? GREEN : '#9aa0a6'}
                  fill={comment.liked_by_me ? GREEN : 'transparent'}
                />
                <Text style={[styles.replyBtnText, comment.liked_by_me && styles.replyBtnTextActive]}>
                  Like{comment.like_count ? ` (${comment.like_count})` : ''}
                </Text>
              </TouchableOpacity>
              {!isReply && (
                <TouchableOpacity onPress={() => onReply(comment)} hitSlop={8} style={styles.replyBtn}>
                  <CornerDownRight size={12} color="#9aa0a6" />
                  <Text style={styles.replyBtnText}>Reply</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Pressable>

      {shownReplies.map((r) => (
        <CommentRow
          key={r.id}
          comment={r}
          currentProfileId={currentProfileId}
          onReply={onReply}
          onDelete={onDelete}
          onLoadReplies={onLoadReplies}
          onToggleLike={onToggleLike}
          isReply
        />
      ))}

      {hiddenCount > 0 && (
        <TouchableOpacity onPress={() => onLoadReplies(comment.id)} style={styles.loadRepliesBtn}>
          <Text style={styles.loadRepliesText}>View {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CommentSheet({ visible, contentType, contentId, initialCommentCount = 0, onClose, onCountChange }: Props) {
  const insets = useSafeAreaInsets();
  const { activeProfileId } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);

  const { comments, commentCount, loading, hasMore, loadMore, submitComment, removeComment, loadReplies, toggleCommentLike } =
    useComments({ contentType, contentId, enabled: visible });

  useEffect(() => {
    if (!visible) {
      setInputText('');
      setReplyTarget(null);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && onCountChange) {
      onCountChange(commentCount);
    }
  }, [commentCount, visible]);

  const handleReply = useCallback((comment: Comment) => {
    setReplyTarget(comment);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleDismissReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const handleSend = useCallback(async () => {
    const body = inputText.trim();
    if (!body || sending) return;
    setSending(true);
    const parent = replyTarget?.id;
    setInputText('');
    setReplyTarget(null);
    try {
      await submitComment(body, parent);
    } catch {
      // error already handled by hook
    } finally {
      setSending(false);
    }
  }, [inputText, sending, replyTarget, submitComment]);

  const displayCount = Math.max(commentCount, initialCommentCount);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {displayCount > 0 ? `${displayCount} Comment${displayCount === 1 ? '' : 's'}` : 'Comments'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={22} color={GREEN} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <CommentRow
                comment={item}
                currentProfileId={activeProfileId ?? null}
                onReply={handleReply}
                onDelete={removeComment}
                onLoadReplies={loadReplies}
                onToggleLike={toggleCommentLike}
              />
            )}
            ListEmptyComponent={
              loading ? null : (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Be the first to comment</Text>
                </View>
              )
            }
            ListFooterComponent={
              loading ? <ActivityIndicator size="small" color={GREEN} style={styles.loader} /> :
              hasMore && comments.length > 0 ? (
                <TouchableOpacity onPress={loadMore} style={styles.loadMoreBtn}>
                  <Text style={styles.loadMoreText}>Load more comments</Text>
                </TouchableOpacity>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />

          <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            {replyTarget && (
              <View style={styles.replyBanner}>
                <Text style={styles.replyBannerText} numberOfLines={1}>
                  Replying to <Text style={styles.replyBannerName}>{replyTarget.display_name ?? 'user'}</Text>
                </Text>
                <TouchableOpacity onPress={handleDismissReply} hitSlop={8}>
                  <X size={14} color="#9aa0a6" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={setInputText}
                placeholder={replyTarget ? `Reply to ${replyTarget.display_name ?? 'user'}…` : 'Write a comment…'}
                placeholderTextColor="#9aa0a6"
                style={styles.input}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputText.trim() || sending}
                style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
              >
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            </View>
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
    maxHeight: '82%',
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: GREEN,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
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
    color: '#9aa0a6',
    fontSize: 14,
  },
  loader: {
    marginVertical: 16,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '600',
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1EEF7',
  },
  commentRowPressed: {
    backgroundColor: '#F9F9F9',
  },
  commentBody: {
    flex: 1,
    marginLeft: 10,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentName: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  commentTime: {
    fontSize: 11,
    color: '#9aa0a6',
  },
  commentText: {
    fontSize: 14,
    color: '#222',
    lineHeight: 20,
  },
  commentDeleted: {
    color: '#9aa0a6',
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyBtnText: {
    fontSize: 12,
    color: '#9aa0a6',
    fontWeight: '600',
  },
  replyBtnTextActive: {
    color: GREEN,
  },
  replyWrapper: {
    marginLeft: 44,
  },
  loadRepliesBtn: {
    marginLeft: 44,
    paddingVertical: 6,
  },
  loadRepliesText: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '600',
  },
  avatar: {
    backgroundColor: '#EDE9F6',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: GREEN,
    fontWeight: '700',
  },
  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE',
    backgroundColor: '#fff',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  replyBannerText: {
    fontSize: 12,
    color: '#9aa0a6',
    flex: 1,
    marginRight: 8,
  },
  replyBannerName: {
    fontWeight: '700',
    color: GREEN,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    color: '#1A1A1A',
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
