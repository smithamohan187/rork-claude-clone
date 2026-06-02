import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Gift, Shield } from 'lucide-react-native';
import {
  getBadgeForPoints,
  getProgressToNextTier,
  NO_BADGE_ICON,
} from '@/config/badgeTiers';

interface BadgeCardProps {
  points: number;
  onPress?: () => void;
  testID?: string;
}

/** Hero badge card shown on the personal profile. */
export default function BadgeCard({ points, onPress, testID }: BadgeCardProps) {
  const badge = getBadgeForPoints(points);
  const { nextTier, progress, pointsNeeded } = getProgressToNextTier(points);

  const pulse = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 950, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulse]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 850,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const Icon = badge?.icon ?? NO_BADGE_ICON;
  const headerGradient: [string, string] = badge
    ? badge.colors.gradient
    : ['#F5F5F5', '#E0E0E0'];
  const headerText = badge ? badge.colors.text : '#6B7A8D';

  const widthInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable onPress={onPress} testID={testID ?? 'badge-card'}>
      <View
        style={[
          styles.wrap,
          {
            shadowColor: badge?.colors.glow ?? '#000',
            shadowOpacity: badge ? 0.3 : 0.08,
          },
        ]}
      >
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <View
              style={[
                styles.iconHalo,
                { backgroundColor: 'rgba(255,255,255,0.35)' },
              ]}
            >
              <Icon size={48} color={headerText} strokeWidth={2.2} />
            </View>
          </Animated.View>

          <Text style={[styles.headerTitle, { color: headerText }]}>
            {badge ? `${badge.emoji} ${badge.label} Member` : 'No Badge Yet'}
          </Text>

          <Text style={[styles.headerSub, { color: headerText }]}>
            {badge
              ? badge.description
              : 'Earn 100 points to unlock your first badge!'}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Points</Text>
            <View style={styles.totalValue}>
              <Star size={18} color="#FFB300" fill="#FFB300" />
              <Text style={styles.totalNumber}>{points.toLocaleString()}</Text>
            </View>
          </View>

          {nextTier ? (
            <>
              <View style={styles.progressHead}>
                <Text style={styles.progressLabel}>
                  Progress to {nextTier.emoji} {nextTier.label}
                </Text>
                <Text
                  style={[
                    styles.progressRemaining,
                    { color: nextTier.colors.text },
                  ]}
                >
                  {pointsNeeded.toLocaleString()} pts to go
                </Text>
              </View>
              <View style={styles.track}>
                <Animated.View
                  style={[
                    styles.fill,
                    {
                      width: widthInterpolate,
                      backgroundColor: nextTier.colors.border,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressHint}>
                Keep subscribing, referring & redeeming to level up!
              </Text>
            </>
          ) : badge ? (
            <View style={styles.maxedWrap}>
              <Text style={styles.maxedText}>
                💎 You&apos;ve reached the highest tier! Keep earning to maintain
                your Platinum status.
              </Text>
            </View>
          ) : null}

          {badge && (
            <View
              style={[
                styles.perks,
                {
                  backgroundColor: badge.colors.background,
                  borderColor: badge.colors.border,
                },
              ]}
            >
              <Gift size={16} color={badge.colors.text} />
              <Text style={[styles.perksText, { color: badge.colors.text }]}>
                {badge.perksLabel}
              </Text>
            </View>
          )}

          {!badge && (
            <View style={styles.perksMuted}>
              <Shield size={14} color="#9AA3AD" />
              <Text style={styles.perksMutedText}>
                Tap to see all badge tiers
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden' as const,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  header: {
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
  },
  iconHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12.5,
    opacity: 0.85,
    textAlign: 'center' as const,
    marginTop: 6,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
  body: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  totalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7A8D',
    fontWeight: '500' as const,
  },
  totalValue: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  totalNumber: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#1B2A4A',
    letterSpacing: -0.5,
  },
  progressHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, color: '#6B7A8D', fontWeight: '600' as const },
  progressRemaining: { fontSize: 12, fontWeight: '700' as const },
  track: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  fill: { height: '100%' as const, borderRadius: 4 },
  progressHint: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 8,
    textAlign: 'center' as const,
  },
  maxedWrap: {
    backgroundColor: '#E8F5EE',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
  },
  maxedText: {
    fontSize: 13,
    color: '#00B246',
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  perks: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  perksText: { fontSize: 13, fontWeight: '600' as const, flex: 1 },
  perksMuted: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    justifyContent: 'center' as const,
  },
  perksMutedText: { fontSize: 12, color: '#9AA3AD', fontWeight: '500' as const },
});
