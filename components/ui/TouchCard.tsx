import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { THEME } from '@/theme/tokens';

interface TouchCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  testID?: string;
}

const TouchCard = React.memo(function TouchCard({
  children,
  onPress,
  style,
  padded = true,
  testID,
}: TouchCardProps) {
  const content = <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: THEME.colors.rippleTint }}
      style={({ pressed }) => [pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    ...THEME.shadows.card,
  },
  padded: {
    padding: THEME.spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default TouchCard;
