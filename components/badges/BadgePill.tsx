import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { getBadgeForPoints } from '@/config/badgeTiers';

interface BadgePillProps {
  points: number;
  size?: 'sm' | 'md';
  testID?: string;
}

/** Compact tier pill for use in list rows next to a name. */
export default function BadgePill({ points, size = 'md', testID }: BadgePillProps) {
  const badge = getBadgeForPoints(points);
  if (!badge) return null;

  const Icon = badge.icon;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: badge.colors.background,
          borderColor: badge.colors.border,
          paddingHorizontal: isSmall ? 7 : 9,
          paddingVertical: isSmall ? 2 : 4,
          shadowColor: badge.colors.glow,
        },
      ]}
      testID={testID ?? `badge-pill-${badge.tier}`}
    >
      <Icon size={isSmall ? 11 : 13} color={badge.colors.text} />
      <Text
        style={[
          styles.text,
          {
            color: badge.colors.text,
            fontSize: isSmall ? 10 : 11,
          },
        ]}
        numberOfLines={1}
      >
        {badge.emoji} {badge.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  text: {
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
});
