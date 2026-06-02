import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

function Shimmer({ style }: { style: object }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.shimmer, style, { opacity }]} />;
}

export const FeedSkeleton = React.memo(function FeedSkeleton() {
  return (
    <View style={styles.wrap} testID="feed-skeleton">
      <Shimmer style={styles.hero} />
      <View style={styles.avatarRow}>
        {[0, 1, 2, 3].map((i) => (
          <Shimmer key={i} style={styles.avatar} />
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <Shimmer style={styles.cardAvatar} />
            <Shimmer style={styles.cardName} />
          </View>
          <Shimmer style={styles.cardTitle} />
          <Shimmer style={styles.cardDesc} />
          <Shimmer style={styles.cardDescShort} />
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { paddingTop: 12 },
  shimmer: {
    backgroundColor: '#E8F5EE',
    borderRadius: 8,
  },
  hero: {
    height: 140,
    marginHorizontal: 16,
    borderRadius: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  cardName: {
    width: 120,
    height: 12,
  },
  cardTitle: {
    width: '80%',
    height: 18,
    marginTop: 12,
  },
  cardDesc: {
    width: '100%',
    height: 12,
    marginTop: 10,
  },
  cardDescShort: {
    width: '60%',
    height: 12,
    marginTop: 6,
  },
});
