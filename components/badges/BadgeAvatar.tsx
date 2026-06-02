import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { getBadgeForPoints } from '@/config/badgeTiers';

interface BadgeAvatarProps {
  avatarUrl?: string | null;
  totalPoints: number;
  size?: number;
  fallback?: React.ReactNode;
  testID?: string;
}

/**
 * Avatar wrapped in a tier-colored ring. Adds a soft glow for Gold and
 * Platinum tiers. Falls back to a neutral grey ring when the user has
 * no badge yet.
 */
export default function BadgeAvatar({
  avatarUrl,
  totalPoints,
  size = 48,
  fallback,
  testID,
}: BadgeAvatarProps) {
  const badge = getBadgeForPoints(totalPoints);
  const ringColor = badge?.colors.border ?? '#E0E0E0';
  const glowColor = badge?.colors.glow ?? 'transparent';
  const showGlow = badge && badge.tier !== 'silver';

  return (
    <View
      style={[
        styles.ring,
        {
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          borderColor: ringColor,
          borderWidth: badge ? 2.5 : 1.5,
          shadowColor: glowColor,
          shadowOpacity: showGlow ? 0.55 : 0,
          shadowRadius: showGlow ? 6 : 0,
          elevation: showGlow ? 4 : 0,
        },
      ]}
      testID={testID ?? 'badge-avatar'}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        fallback ?? null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 0 } },
      default: {},
    }),
  },
});
