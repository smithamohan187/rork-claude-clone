import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface FeedFilterChip {
  key: string;
  label: string;
  emoji?: string;
  icon?: string | null;
}

export const FEED_FILTER_CHIPS: FeedFilterChip[] = [
  { key: 'bookmarked', emoji: '🔖', label: 'Bookmarked' },
  { key: 'trending', emoji: '🔥', label: 'Trending' },
];

interface Props {
  chips?: FeedFilterChip[];
  selected: string;
  onSelect: (key: string) => void;
}

const ChipItem = React.memo(function ChipItem({
  chip,
  active,
  onPress,
}: {
  chip: FeedFilterChip;
  active: boolean;
  onPress: () => void;
}) {
  const animated = useRef(new Animated.Value(active ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animated, {
      toValue: active ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [active, animated]);

  const bg = animated.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F2EFFA', '#1A5C35'],
  });
  const borderColor = animated.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E8F5EE', '#1A5C35'],
  });

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={styles.chipWrap}
      testID={`feed-chip-${chip.key}`}
    >
      <Animated.View style={[styles.chip, { backgroundColor: bg, borderColor }]}>
        {chip.emoji ? (
          <Text style={styles.emoji}>{chip.emoji}</Text>
        ) : chip.icon ? (
          <MaterialCommunityIcons name={chip.icon as any} size={14} color={active ? '#FFFFFF' : '#1A5C35'} />
        ) : null}
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {chip.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

export const FeedFilterChips = React.memo(function FeedFilterChips({ chips = FEED_FILTER_CHIPS, selected, onSelect }: Props) {
  const handlePress = useCallback((k: string) => () => onSelect(k), [onSelect]);
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        decelerationRate="normal"
        bounces
      >
        {chips.map((c) => (
          <ChipItem
            key={c.key}
            chip={c}
            active={selected === c.key}
            onPress={handlePress(c.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  scroll: {
    paddingLeft: 12,
    paddingRight: 16,
    gap: 8,
    alignItems: 'center',
    flexGrow: 0,
  },
  chipWrap: {},
  chip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C5F72',
    letterSpacing: 0.1,
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
