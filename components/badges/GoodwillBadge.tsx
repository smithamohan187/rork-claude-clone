import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';

export const GOODWILL_TEAL = '#0D9488';
export const GOODWILL_TEAL_LIGHT = '#14B8A6';
export const GOODWILL_TEAL_SOFT = '#CCFBF1';

type Size = 'sm' | 'md' | 'lg';

interface GoodwillBadgeProps {
  size?: Size;
  showLabel?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const SIZE_MAP: Record<Size, { box: number; icon: number; label: number }> = {
  sm: { box: 18, icon: 10, label: 9 },
  md: { box: 30, icon: 16, label: 11 },
  lg: { box: 56, icon: 30, label: 13 },
};

/**
 * Goodwill mode badge — teal shield with white heart icon. Used everywhere
 * tier badges appear for users in goodwill mode.
 */
export const GoodwillBadge = React.memo(function GoodwillBadge({
  size = 'md',
  showLabel = false,
  style,
  testID,
}: GoodwillBadgeProps) {
  const dims = SIZE_MAP[size];
  return (
    <View style={[styles.wrap, style]} testID={testID ?? 'goodwill-badge'}>
      <View
        style={[
          styles.shield,
          {
            width: dims.box,
            height: dims.box,
            borderRadius: dims.box * 0.32,
            backgroundColor: GOODWILL_TEAL,
            shadowColor: GOODWILL_TEAL,
          },
        ]}
      >
        <View
          style={[
            styles.shieldHighlight,
            {
              width: dims.box,
              height: dims.box * 0.5,
              borderTopLeftRadius: dims.box * 0.32,
              borderTopRightRadius: dims.box * 0.32,
              backgroundColor: GOODWILL_TEAL_LIGHT,
            },
          ]}
        />
        <Heart size={dims.icon} color="#FFFFFF" fill="#FFFFFF" />
      </View>
      {showLabel && (
        <Text style={[styles.label, { fontSize: dims.label }]} numberOfLines={1}>
          GOODWILL
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  shield: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  shieldHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.55,
  },
  label: {
    fontWeight: '800' as const,
    color: GOODWILL_TEAL,
    letterSpacing: 1.2,
  },
});

export default GoodwillBadge;
