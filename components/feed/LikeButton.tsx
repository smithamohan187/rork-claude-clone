import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useLike } from '@/hooks/useLike';
import LikersSheet from '@/components/feed/LikersSheet';
import type { ContentType } from '@/api/services/likesService';

interface Props {
  contentType: ContentType;
  contentId: string;
  initialLikeCount: number;
  initialHasLiked: boolean;
  isOwner: boolean;
}

export default function LikeButton({
  contentType,
  contentId,
  initialLikeCount,
  initialHasLiked,
  isOwner,
}: Props) {
  const { likeCount, hasLiked, toggle } = useLike({
    contentType,
    contentId,
    initialLikeCount,
    initialHasLiked,
    isOwner,
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleHeartPress = useCallback(() => {
    if (isOwner) {
      setSheetOpen(true);
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    toggle();
  }, [isOwner, toggle]);

  const handleCountPress = useCallback(() => {
    if (likeCount > 0 || isOwner) setSheetOpen(true);
  }, [likeCount, isOwner]);

  return (
    <View style={styles.row}>
      <Pressable onPress={handleHeartPress} hitSlop={6} style={styles.heartBtn}>
        <MaterialCommunityIcons
          name={hasLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={hasLiked ? '#E53935' : '#6B7280'}
        />
      </Pressable>
      <Pressable onPress={handleCountPress} hitSlop={4}>
        <Text style={[styles.count, hasLiked && styles.countActive]}>
          {likeCount > 0 ? likeCount : isOwner ? 'Likes' : 'Like'}
        </Text>
      </Pressable>
      <LikersSheet
        visible={sheetOpen}
        contentType={contentType}
        contentId={contentId}
        likeCount={likeCount}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartBtn: {
    padding: 2,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  countActive: {
    color: '#E53935',
  },
});
