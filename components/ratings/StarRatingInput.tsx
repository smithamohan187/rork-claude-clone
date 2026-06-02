import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';

const AMBER = '#F59E0B';
const MUTED = '#E8F5EE';
const ACCENT = '#1A5C35';
const MUTED_TEXT = '#1A5C35';

interface Props {
  value: number;
  onChange: (stars: number) => void;
  size?: number;
  disabled?: boolean;
}

const LABELS: Record<number, string> = {
  0: '',
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function StarRatingInput({ value, onChange, size = 36, disabled = false }: Props) {
  const scales = useRef<Animated.Value[]>([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const prevValue = useRef<number>(value);

  useEffect(() => {
    if (value === prevValue.current) return;
    prevValue.current = value;
    if (value <= 0) return;

    const animations = scales.slice(0, value).map((s, idx) =>
      Animated.sequence([
        Animated.delay(idx * 30),
        Animated.spring(s, {
          toValue: 1.3,
          useNativeDriver: true,
          friction: 4,
          tension: 160,
        }),
        Animated.spring(s, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
          tension: 140,
        }),
      ]),
    );
    Animated.stagger(0, animations).start();
  }, [value, scales]);

  const handlePress = (i: number) => {
    if (disabled) return;
    if (value === i) onChange(0);
    else onChange(i);
  };

  const label = useMemo(() => LABELS[value] ?? '', [value]);

  return (
    <View style={[styles.wrap, disabled && styles.disabled]}>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= value;
          return (
            <Pressable
              key={i}
              onPress={() => handlePress(i)}
              disabled={disabled}
              hitSlop={6}
              style={styles.starBtn}
              testID={`star-input-${i}`}
            >
              <Animated.View style={{ transform: [{ scale: scales[i - 1] }] }}>
                <Icon
                  source={filled ? 'star' : 'star-outline'}
                  size={size}
                  color={filled ? AMBER : MUTED}
                />
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.label, value > 0 && styles.labelActive]}>
        {label || ' '}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  starBtn: {
    padding: 4,
    borderRadius: 20,
  },
  label: {
    fontSize: 13,
    color: MUTED_TEXT,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 18,
  },
  labelActive: {
    color: ACCENT,
    fontWeight: '700',
  },
});
