import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';

const AMBER = '#F59E0B';
const MUTED = '#E8F5EE';
const MUTED_TEXT = '#1A5C35';
const DARK_TEXT = '#1A5C35';

interface Props {
  averageRating: number;
  ratingCount: number;
  size?: 'small' | 'medium';
  showCount?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return n.toString();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export const StarRatingDisplay = React.memo(function StarRatingDisplay({
  averageRating,
  ratingCount,
  size = 'small',
  showCount = true,
}: Props) {
  const iconSize = size === 'small' ? 14 : 18;
  const numberSize = size === 'small' ? 12 : 15;
  const countSize = size === 'small' ? 11 : 13;

  const stars = useMemo(() => {
    const arr: ('full' | 'half' | 'empty')[] = [];
    for (let i = 1; i <= 5; i += 1) {
      const fill = clamp(averageRating - (i - 1), 0, 1);
      if (fill >= 0.75) arr.push('full');
      else if (fill >= 0.25) arr.push('half');
      else arr.push('empty');
    }
    return arr;
  }, [averageRating]);

  if (!ratingCount || ratingCount <= 0) {
    return (
      <View style={styles.row} testID="star-rating-display-empty">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} source="star-outline" size={iconSize} color={MUTED} />
        ))}
        <Text style={[styles.noRatings, { fontSize: countSize }]}>No ratings yet</Text>
      </View>
    );
  }

  const safeAvg = Number.isFinite(averageRating) ? averageRating : 0;

  return (
    <View style={styles.row} testID="star-rating-display">
      {stars.map((kind, i) => {
        const iconName =
          kind === 'full' ? 'star' : kind === 'half' ? 'star-half-full' : 'star-outline';
        const color = kind === 'empty' ? MUTED : AMBER;
        return <Icon key={i} source={iconName} size={iconSize} color={color} />;
      })}
      <Text style={[styles.number, { fontSize: numberSize }]}>{safeAvg.toFixed(1)}</Text>
      {showCount ? (
        <Text style={[styles.count, { fontSize: countSize }]}>
          ({formatCount(ratingCount)} {ratingCount === 1 ? 'rating' : 'ratings'})
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  number: {
    fontWeight: '800',
    color: DARK_TEXT,
    marginLeft: 2,
  },
  count: {
    color: MUTED_TEXT,
    fontWeight: '500',
  },
  noRatings: {
    color: MUTED_TEXT,
    fontStyle: 'italic',
    marginLeft: 4,
  },
});
