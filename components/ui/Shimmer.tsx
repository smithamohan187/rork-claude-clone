import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { THEME } from '@/theme/tokens';

interface ShimmerProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Shimmer = React.memo(function Shimmer({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  testID,
}: ShimmerProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      testID={testID}
      style={[
        { width: width as number, height, borderRadius, backgroundColor: THEME.colors.surfaceVariant, opacity },
        style,
      ]}
    />
  );
});

export const ShimmerCard = React.memo(function ShimmerCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Shimmer width={44} height={44} borderRadius={22} />
        <View style={styles.rowBody}>
          <Shimmer width={`70%` as const} height={14} />
          <View style={{ height: 8 }} />
          <Shimmer width={`40%` as const} height={12} />
        </View>
      </View>
      <View style={{ height: THEME.spacing.md }} />
      <Shimmer width={`100%` as const} height={14} />
      <View style={{ height: 8 }} />
      <Shimmer width={`85%` as const} height={14} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    ...THEME.shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, marginLeft: THEME.spacing.md },
});

export default Shimmer;
