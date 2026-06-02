import React from 'react';
import { Platform, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '@/theme/tokens';
import { shadow } from './shadow';

interface BottomActionBarProps {
  children: React.ReactNode;
  /** Show a subtle top border to separate from scrolling content. */
  bordered?: boolean;
  /** Show a soft shadow lift above the bar. */
  elevated?: boolean;
  /** Background color. Defaults to surface white. */
  backgroundColor?: string;
  /** Extra horizontal/vertical padding. Defaults to 16/12. */
  paddingHorizontal?: number;
  paddingTop?: number;
  /** Minimum bottom padding even on devices without a home indicator. */
  minBottomPadding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Sticky bottom action container that automatically pads above the iPhone
 * home indicator. Drop your "Save", "Continue", "Send" CTA inside.
 */
const BottomActionBar = React.memo(function BottomActionBar({
  children,
  bordered = true,
  elevated = false,
  backgroundColor = THEME.colors.surface,
  paddingHorizontal = 16,
  paddingTop = 12,
  minBottomPadding = 12,
  style,
  testID,
}: BottomActionBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, minBottomPadding);

  return (
    <View
      style={[
        {
          backgroundColor,
          paddingHorizontal,
          paddingTop,
          paddingBottom: bottomPadding,
          borderTopWidth: bordered ? StyleSheet.hairlineWidth : 0,
          borderTopColor: THEME.colors.border,
        },
        elevated && (Platform.OS === 'ios'
          ? { shadowColor: '#1A1D2E', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10 }
          : shadow('raised')),
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
});

export default BottomActionBar;
