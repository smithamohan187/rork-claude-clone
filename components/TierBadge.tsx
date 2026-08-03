import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Medal, Crown, Gem, Diamond, type LucideIcon } from 'lucide-react-native';

export type TierBadgeSize = 'small' | 'medium' | 'large';

interface TierStyle {
  gradient: [string, string];
  glow: string;
  icon: LucideIcon;
}

const TIER_STYLES: Record<string, TierStyle> = {
  Bronze:   { gradient: ['#CD7F32', '#8C5A2B'], glow: '#CD7F32', icon: Shield },
  Silver:   { gradient: ['#C0C0C0', '#8E8E93'], glow: '#C0C0C0', icon: Medal },
  Gold:     { gradient: ['#FFD700', '#B8860B'], glow: '#FFD700', icon: Crown },
  Platinum: { gradient: ['#E5E4E2', '#B8B8B8'], glow: '#FFFFFF', icon: Gem },
  Diamond:  { gradient: ['#B9F2FF', '#06B6D4'], glow: '#06B6D4', icon: Diamond },
};

const FALLBACK_STYLE: TierStyle = { gradient: ['#9CA3AF', '#6B7280'], glow: '#9CA3AF', icon: Shield };
const LOCKED_GRADIENT: [string, string] = ['#D9D9DE', '#AEAEB6'];
const LOCKED_ICON_COLOR = '#9AA3AD';
const LOCKED_TEXT_COLOR = '#9AA3AD';

function getTierStyle(tierName: string): TierStyle {
  return TIER_STYLES[tierName] ?? FALLBACK_STYLE;
}

export function getTierGradient(tierName: string): [string, string] {
  return getTierStyle(tierName).gradient;
}

export function getTierIconComponent(tierName: string): LucideIcon {
  return getTierStyle(tierName).icon;
}

const CIRCLE_SIZE: Record<TierBadgeSize, number> = { small: 28, medium: 44, large: 72 };
const CIRCLE_ICON_SIZE: Record<TierBadgeSize, number> = { small: 13, medium: 20, large: 32 };
const PILL_ICON_SIZE: Record<TierBadgeSize, number> = { small: 12, medium: 16, large: 20 };
const PILL_TEXT_SIZE: Record<TierBadgeSize, number> = { small: 10, medium: 12, large: 15 };
const PILL_PADDING_H: Record<TierBadgeSize, number> = { small: 8, medium: 12, large: 16 };
const PILL_PADDING_V: Record<TierBadgeSize, number> = { small: 4, medium: 6, large: 8 };

interface TierBadgeProps {
  tierName: string;
  size?: TierBadgeSize;
  showLabel?: boolean;
  locked?: boolean;
  testID?: string;
}

export default function TierBadge({
  tierName,
  size = 'medium',
  showLabel = false,
  locked = false,
  testID,
}: TierBadgeProps) {
  const tierStyle = getTierStyle(tierName);
  const gradient = locked ? LOCKED_GRADIENT : tierStyle.gradient;
  const iconColor = locked ? LOCKED_ICON_COLOR : '#FFFFFF';
  const Icon = tierStyle.icon;

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (size !== 'large' || locked) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 950, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [size, locked, pulse]);

  const glowStyle = locked
    ? {}
    : Platform.select({
        ios: { shadowColor: tierStyle.glow, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
        android: { elevation: 6 },
        default: {},
      });

  if (showLabel) {
    return (
      <Animated.View
        style={[{ transform: [{ scale: size === 'large' ? pulse : 1 }] }]}
        testID={testID}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            pillStyles.pill,
            {
              paddingHorizontal: PILL_PADDING_H[size],
              paddingVertical: PILL_PADDING_V[size],
              borderColor: locked ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.35)',
            },
            glowStyle,
          ]}
        >
          <Icon size={PILL_ICON_SIZE[size]} color={iconColor} />
          <Text style={[pillStyles.text, { fontSize: PILL_TEXT_SIZE[size], color: locked ? LOCKED_TEXT_COLOR : '#FFFFFF' }]}>
            {tierName}
          </Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[{ transform: [{ scale: size === 'large' ? pulse : 1 }] }]}
      testID={testID}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          circleStyles.circle,
          {
            width: CIRCLE_SIZE[size],
            height: CIRCLE_SIZE[size],
            borderRadius: CIRCLE_SIZE[size] / 2,
            borderColor: locked ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.4)',
          },
          glowStyle,
        ]}
      >
        <Icon size={CIRCLE_ICON_SIZE[size]} color={iconColor} />
      </LinearGradient>
    </Animated.View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  text: {
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
});

const circleStyles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
