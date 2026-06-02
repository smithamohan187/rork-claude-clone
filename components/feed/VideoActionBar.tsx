import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import {
  MessageCircle,
  UserPlus,
  Share2,
  Gift,
  X,
  Send,
  Search,
  Check,
  Star,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { personalUsers } from '@/mocks/data';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoActionBarProps {
  videoTitle: string;
  videoType: 'welcome' | 'business';
}

interface CommentItem {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  rating: number;
  createdAt: string;
}

const MOCK_COMMENTS: CommentItem[] = [
  {
    id: 'vc1',
    userName: 'Sarah Chen',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    text: 'Great introduction! Really helpful.',
    rating: 5,
    createdAt: '2h ago',
  },
  {
    id: 'vc2',
    userName: 'James Wilson',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    text: 'Love the concept of supporting local businesses!',
    rating: 4,
    createdAt: '5h ago',
  },
];

function CommentsSheet({ visible, onClose, videoTitle, comments, onAddComment }: {
  visible: boolean;
  onClose: () => void;
  videoTitle: string;
  comments: CommentItem[];
  onAddComment: (text: string, rating: number) => void;
}) {
  const [newComment, setNewComment] = useState<string>('');
  const [newRating, setNewRating] = useState<number>(0);

  const handleSubmit = useCallback(() => {
    if (!newComment.trim() && newRating === 0) return;
    onAddComment(newComment.trim(), newRating);
    setNewComment('');
    setNewRating(0);
  }, [newComment, newRating, onAddComment]);

  const averageRating = comments.filter(c => c.rating > 0).length > 0
    ? comments.filter(c => c.rating > 0).reduce((sum, c) => sum + c.rating, 0) / comments.filter(c => c.rating > 0).length
    : 0;

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
      <View style={sheetStyles.overlay}>
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handleBar} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.headerTitle}>Comments</Text>
            <Pressable onPress={onClose} hitSlop={12} style={sheetStyles.closeBtn}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          {averageRating > 0 && (
            <View style={sheetStyles.ratingOverview}>
              <Text style={sheetStyles.ratingBigNumber}>{averageRating.toFixed(1)}</Text>
              <View style={sheetStyles.ratingStars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} color="#F59E0B" fill={s <= Math.round(averageRating) ? '#F59E0B' : 'none'} />
                ))}
              </View>
              <Text style={sheetStyles.ratingCount}>
                {comments.filter(c => c.rating > 0).length} rating{comments.filter(c => c.rating > 0).length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <ScrollView style={sheetStyles.commentsList} showsVerticalScrollIndicator={false}>
            {comments.length === 0 ? (
              <View style={sheetStyles.emptyContainer}>
                <MessageCircle size={32} color={Colors.textTertiary} />
                <Text style={sheetStyles.emptyText}>No comments yet</Text>
                <Text style={sheetStyles.emptySubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={sheetStyles.commentRow}>
                  <Image source={{ uri: c.userAvatar }} style={sheetStyles.commentAvatar} />
                  <View style={sheetStyles.commentContent}>
                    <View style={sheetStyles.commentHeader}>
                      <Text style={sheetStyles.commentName}>{c.userName}</Text>
                      <Text style={sheetStyles.commentTime}>{c.createdAt}</Text>
                    </View>
                    {c.rating > 0 && (
                      <View style={sheetStyles.commentStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} color="#F59E0B" fill={s <= c.rating ? '#F59E0B' : 'none'} />
                        ))}
                      </View>
                    )}
                    {c.text ? <Text style={sheetStyles.commentText}>{c.text}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={sheetStyles.inputArea}>
            <View style={sheetStyles.ratingRow}>
              <Text style={sheetStyles.ratingLabel}>Rate:</Text>
              <View style={sheetStyles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => setNewRating(s === newRating ? 0 : s)} hitSlop={4}>
                    <Star size={20} color="#F59E0B" fill={s <= newRating ? '#F59E0B' : 'none'} />
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={sheetStyles.inputRow}>
              <TextInput
                style={sheetStyles.textInput}
                placeholder="Add a comment..."
                placeholderTextColor={Colors.textTertiary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <Pressable
                style={[sheetStyles.sendBtn, (!newComment.trim() && newRating === 0) && sheetStyles.sendBtnDisabled]}
                onPress={handleSubmit}
                disabled={!newComment.trim() && newRating === 0}
              >
                <Send size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RecommendSheet({ visible, onClose, videoTitle }: {
  visible: boolean;
  onClose: () => void;
  videoTitle: string;
}) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState<boolean>(false);

  const friends = personalUsers.slice(0, 8);
  const filtered = friends.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = useCallback(() => {
    if (selected.size === 0) return;
    console.log('[VideoActionBar] Referring video to', selected.size, 'contacts');
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setSelected(new Set());
      onClose();
    }, 1500);
  }, [selected, onClose]);

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
      <View style={sheetStyles.overlay}>
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handleBar} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.headerTitle}>Refer to Friends</Text>
            <Pressable onPress={onClose} hitSlop={12} style={sheetStyles.closeBtn}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          <View style={sheetStyles.searchRow}>
            <Search size={16} color={Colors.textTertiary} />
            <TextInput
              style={sheetStyles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView style={sheetStyles.contactsList} showsVerticalScrollIndicator={false}>
            {sent ? (
              <View style={sheetStyles.sentContainer}>
                <View style={sheetStyles.sentCheck}>
                  <Check size={28} color="#FFFFFF" />
                </View>
                <Text style={sheetStyles.sentText}>Referred!</Text>
                <Text style={sheetStyles.sentSubtext}>Sent to {selected.size} contact{selected.size !== 1 ? 's' : ''}</Text>
              </View>
            ) : (
              filtered.map((friend) => {
                const isSelected = selected.has(friend.id);
                return (
                  <Pressable
                    key={friend.id}
                    style={sheetStyles.friendRow}
                    onPress={() => {
                      setSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(friend.id)) next.delete(friend.id);
                        else next.add(friend.id);
                        return next;
                      });
                    }}
                  >
                    <Image source={{ uri: friend.avatar }} style={sheetStyles.friendAvatar} />
                    <View style={sheetStyles.friendInfo}>
                      <Text style={sheetStyles.friendName}>{friend.name}</Text>
                      <Text style={sheetStyles.friendUsername}>@{friend.username}</Text>
                    </View>
                    <View style={[sheetStyles.checkOuter, isSelected && sheetStyles.checkOuterSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {!sent && (
            <View style={sheetStyles.footer}>
              <Pressable
                style={[sheetStyles.sendButton, selected.size === 0 && sheetStyles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={selected.size === 0}
              >
                <UserPlus size={18} color="#FFFFFF" />
                <Text style={sheetStyles.sendButtonText}>
                  Refer{selected.size > 0 ? ` (${selected.size})` : ''}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ShareSheet({ visible, onClose, videoTitle }: {
  visible: boolean;
  onClose: () => void;
  videoTitle: string;
}) {
  const shareMessage = `Check out "${videoTitle}" on TouchPoint! Discover and support your local businesses.`;
  const shareLink = 'https://touchpoint.app';

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
      <View style={sheetStyles.overlay}>
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={[sheetStyles.sheet, { maxHeight: SCREEN_HEIGHT * 0.45 }]}>
          <View style={sheetStyles.handleBar} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.headerTitle}>Share</Text>
            <Pressable onPress={onClose} hitSlop={12} style={sheetStyles.closeBtn}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          <View style={sheetStyles.shareOptions}>
            <BrandedShareGrid
              message={shareMessage}
              link={shareLink}
              emailSubject={`${videoTitle} — TouchPoint`}
              testIDPrefix="video-share"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function VideoActionBar({ videoTitle, videoType }: VideoActionBarProps) {
  const router = useRouter();
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showRecommend, setShowRecommend] = useState<boolean>(false);
  const [showShare, setShowShare] = useState<boolean>(false);
  const [comments, setComments] = useState<CommentItem[]>(MOCK_COMMENTS);

  const handleAddComment = useCallback((text: string, rating: number) => {
    const newItem: CommentItem = {
      id: `vc-${Date.now()}`,
      userName: 'You',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      text,
      rating,
      createdAt: 'Just now',
    };
    setComments(prev => [newItem, ...prev]);
    console.log('[VideoActionBar] Comment added:', text, 'rating:', rating);
  }, []);

  const handleRewardsPress = useCallback(() => {
    console.log('[VideoActionBar] Rewards pressed for', videoType, 'video');
    router.push('/(tabs)/rewards' as never);
  }, [router, videoType]);

  const scaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const handlePressIn = useCallback((index: number) => {
    Animated.spring(scaleAnims[index], { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnims]);

  const handlePressOut = useCallback((index: number) => {
    Animated.spring(scaleAnims[index], { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnims]);

  return (
    <View style={actionStyles.container} testID={`video-action-bar-${videoType}`}>
      <Animated.View style={{ transform: [{ scale: scaleAnims[0] }] }}>
        <Pressable
          style={actionStyles.actionBtn}
          onPress={() => { console.log('[VideoActionBar] Comment pressed'); setShowComments(true); }}
          onPressIn={() => handlePressIn(0)}
          onPressOut={() => handlePressOut(0)}
        >
          <View style={[actionStyles.actionIconWrap, comments.length > 0 && { backgroundColor: '#EEF2FF' }]}>
            <MessageCircle size={16} color={comments.length > 0 ? '#00B246' : Colors.textSecondary} fill={comments.length > 0 ? '#00B246' : 'none'} />
          </View>
          <Text style={[actionStyles.actionText, comments.length > 0 && { color: '#00B246' }]}>Comment</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleAnims[1] }] }}>
        <Pressable
          style={actionStyles.actionBtn}
          onPress={() => { console.log('[VideoActionBar] Refer pressed'); setShowRecommend(true); }}
          onPressIn={() => handlePressIn(1)}
          onPressOut={() => handlePressOut(1)}
        >
          <View style={[actionStyles.actionIconWrap, { backgroundColor: '#ECFDF5' }]}>
            <UserPlus size={16} color="#10B981" />
          </View>
          <Text style={[actionStyles.actionText, { color: '#10B981' }]}>Refer</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleAnims[2] }] }}>
        <Pressable
          style={actionStyles.actionBtn}
          onPress={() => { console.log('[VideoActionBar] Share pressed'); setShowShare(true); }}
          onPressIn={() => handlePressIn(2)}
          onPressOut={() => handlePressOut(2)}
        >
          <View style={actionStyles.actionIconWrap}>
            <Share2 size={16} color={Colors.textSecondary} />
          </View>
          <Text style={actionStyles.actionText}>Share</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleAnims[3] }] }}>
        <Pressable
          style={actionStyles.actionBtn}
          onPress={handleRewardsPress}
          onPressIn={() => handlePressIn(3)}
          onPressOut={() => handlePressOut(3)}
        >
          <View style={actionStyles.actionIconWrap}>
            <Gift size={16} color={Colors.textSecondary} />
          </View>
          <Text style={actionStyles.actionText}>Rewards</Text>
        </Pressable>
      </Animated.View>

      <CommentsSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        videoTitle={videoTitle}
        comments={comments}
        onAddComment={handleAddComment}
      />

      <RecommendSheet
        visible={showRecommend}
        onClose={() => setShowRecommend(false)}
        videoTitle={videoTitle}
      />

      <ShareSheet
        visible={showShare}
        onClose={() => setShowShare(false)}
        videoTitle={videoTitle}
      />
    </View>
  );
}

const actionStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginTop: -4,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44,58,78,0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    minHeight: SCREEN_HEIGHT * 0.4,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  closeBtn: {
    position: 'absolute' as const,
    right: 16,
  },
  ratingOverview: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  ratingBigNumber: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  commentStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
  },
  commentText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  inputArea: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
  },
  contactsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  sentCheck: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sentSubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  friendUsername: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  checkOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOuterSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  shareOption: {
    alignItems: 'center',
    gap: 8,
  },
  shareIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
