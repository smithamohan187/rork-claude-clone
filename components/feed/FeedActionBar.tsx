import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TouchableRipple } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { MessageCircle, Share2, UserPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  reactionCount: number;
  hasLiked: boolean;
  isOwner: boolean;
  commentCount: number;
  showComments: boolean;
  showShare: boolean;
  onLike: () => void;
  onOpenLikers: () => void;
  onComment: () => void;
  onShare: () => void;
  onRefer?: () => void;
}

const PRIMARY = '#1A5C35';
const MUTED = '#1A5C35';
const LIKED_COLOR = '#E53935';

export const FeedActionBar = React.memo(function FeedActionBar({
  reactionCount,
  hasLiked,
  isOwner,
  commentCount,
  showComments,
  showShare,
  onLike,
  onOpenLikers,
  onComment,
  onShare,
  onRefer,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevLiked = useRef<boolean>(hasLiked);

  useEffect(() => {
    if (prevLiked.current !== hasLiked && hasLiked) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.25, friction: 4, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
    prevLiked.current = hasLiked;
  }, [hasLiked, scale]);

  const handleLike = useCallback(() => {
    if (isOwner) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    onLike();
  }, [onLike, isOwner]);

  const handleLikePress = isOwner ? onOpenLikers : handleLike;

  return (
    <View>
      {commentCount > 0 && (
        <TouchableOpacity onPress={onComment} activeOpacity={0.7}>
          <Text style={styles.commentSummary}>
            View all {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      )}
    <View style={styles.bar} testID="feed-action-bar">
      <TouchableRipple
        onPress={handleLikePress}
        style={styles.btn}
        borderless
        rippleColor="rgba(83,52,183,0.08)"
        accessibilityLabel={isOwner ? 'View likes' : 'Like'}
        testID="feed-like-btn"
      >
        <View style={styles.inner}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialCommunityIcons
              name={hasLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={hasLiked ? LIKED_COLOR : PRIMARY}
            />
          </Animated.View>
          <Text
            style={[styles.label, hasLiked && styles.labelLiked]}
            onPress={reactionCount > 0 ? onOpenLikers : undefined}
          >
            {reactionCount > 0 ? `${reactionCount}` : (isOwner ? 'Likes' : 'Like')}
          </Text>
        </View>
      </TouchableRipple>

      <View style={styles.divider} />

      <TouchableRipple onPress={onComment} style={styles.btn} borderless rippleColor="rgba(83,52,183,0.08)">
        <View style={styles.inner}>
          <MessageCircle size={18} color={showComments ? PRIMARY : MUTED} fill={showComments ? PRIMARY : 'transparent'} />
          <Text style={[styles.label, showComments && styles.labelPrimary]}>
            {commentCount > 0 ? `${commentCount}` : 'Comment'}
          </Text>
        </View>
      </TouchableRipple>

      <View style={styles.divider} />

      <TouchableRipple onPress={onShare} style={styles.btn} borderless rippleColor="rgba(83,52,183,0.08)">
        <View style={styles.inner}>
          <Share2 size={18} color={showShare ? PRIMARY : MUTED} />
          <Text style={[styles.label, showShare && styles.labelPrimary]}>Share</Text>
        </View>
      </TouchableRipple>

      {onRefer ? (
        <>
          <View style={styles.divider} />
          <TouchableRipple onPress={onRefer} style={styles.btn} borderless rippleColor="rgba(83,52,183,0.08)" testID="feed-refer-btn">
            <View style={styles.inner}>
              <UserPlus size={18} color={PRIMARY} />
              <Text style={[styles.label, styles.labelPrimary]}>Refer</Text>
            </View>
          </TouchableRipple>
        </>
      ) : null}
    </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E8F5EE',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  btn: {
    flex: 1,
    borderRadius: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  divider: {
    width: 0.5,
    backgroundColor: '#E8F5EE',
    marginVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },
  labelLiked: {
    color: LIKED_COLOR,
  },
  labelPrimary: {
    color: PRIMARY,
  },
  commentSummary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 2,
  },
});
