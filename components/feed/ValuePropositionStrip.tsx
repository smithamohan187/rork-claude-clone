import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';
import { ChevronRight } from 'lucide-react-native';

import InviteFriendsIllustration from './illustrations/InviteFriendsIllustration';
import ExploreBusinessesIllustration from './illustrations/ExploreBusinessesIllustration';
import EngageTrustIllustration from './illustrations/EngageTrustIllustration';
import GoodwillRewardsIllustration from './illustrations/GoodwillRewardsIllustration';

const CARD_WIDTH = 220 as const;
const CARD_MIN_HEIGHT = 300 as const;
const CARD_GAP = 16 as const;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const ILLUSTRATION_HEIGHT = 160 as const;

interface CardDef {
  id: string;
  number: string;
  title: string;
  body: string;
  actionLabel: string;
  destination: string;
  Illustration: React.ComponentType<{ width?: number | string; height?: number | string }>;
  gradientStart: string;
  gradientEnd: string;
  gradientDiagonal?: boolean;
}

const CARDS: CardDef[] = [
  {
    id: 'invite',
    number: '01',
    title: 'Invite your trusted friends to join your network',
    body: 'Bring the people you trust onto TouchPoint and grow your circle.',
    actionLabel: 'Invite friends',
    destination: '/invite-friends/contacts',
    Illustration: InviteFriendsIllustration,
    gradientStart: '#1A5C35',
    gradientEnd: '#00B246',
  },
  {
    id: 'explore',
    number: '02',
    title: 'Explore and follow the businesses that matter to you',
    body: 'Discover local businesses and follow the ones you love most.',
    actionLabel: 'Explore businesses',
    destination: '/(tabs)/marketplace',
    Illustration: ExploreBusinessesIllustration,
    gradientStart: '#059669',
    gradientEnd: '#0D9488',
  },
  {
    id: 'engage',
    number: '03',
    title: 'Engage with businesses and build trust',
    body: 'Chat, react and connect with the businesses you follow.',
    actionLabel: 'Open chats',
    destination: '/subscribed-businesses',
    Illustration: EngageTrustIllustration,
    gradientStart: '#D97706',
    gradientEnd: '#DC2626',
    gradientDiagonal: true,
  },
  {
    id: 'goodwill',
    number: '04',
    title: 'Make goodwill referrals or earn Points & Rewards together',
    body: 'Refer for goodwill or earn points and rewards with the businesses you love.',
    actionLabel: 'View rewards',
    destination: '/(tabs)/rewards',
    Illustration: GoodwillRewardsIllustration,
    gradientStart: '#00B246',
    gradientEnd: '#DB2777',
  },
];

interface Props {
  onCardPress?: (destination: string, cardId: string) => void;
  /** Legacy prop — invoked when the first (Earn) card is pressed if onCardPress is not provided. */
  onDiscoverPress?: () => void;
}

interface AnimatedCardProps {
  card: CardDef;
  anim: Animated.Value;
  onPress: () => void;
}

const AnimatedCard = React.memo(function AnimatedCard({ card, anim, onPress }: AnimatedCardProps) {
  const theme = useTheme();
  const isDark = theme.dark;

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const Illustration = card.Illustration;

  const surfaceBg = isDark ? theme.colors.surface : '#ffffff';
  const titleColor = isDark ? '#ffffff' : '#1a1a2e';
  const bodyColor = isDark ? '#94a3b8' : '#64748b';
  const numberBg = isDark ? theme.colors.surfaceVariant : '#f1f5f9';
  const numberColor = isDark ? theme.colors.onSurfaceVariant : '#94a3b8';

  const containerStyle: Animated.WithAnimatedObject<ViewStyle> = {
    opacity: anim,
    transform: [{ translateX }],
  };

  return (
    <Animated.View style={[styles.cardOuter, containerStyle]}>
      <Pressable
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${card.title}. ${card.body}. Tap to ${card.actionLabel}.`}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
        testID={`value-prop-card-${card.id}`}
      >
        <View style={[styles.cardSurface, { backgroundColor: surfaceBg }]}>
          <LinearGradient
            colors={[card.gradientStart, card.gradientEnd]}
            start={card.gradientDiagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
            end={card.gradientDiagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
            style={styles.illustrationBlock}
          >
            <View
              style={styles.illustrationInner}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Illustration height={ILLUSTRATION_HEIGHT} />
            </View>
          </LinearGradient>

          <View style={styles.textBlock}>
            <View style={[styles.numberPill, { backgroundColor: numberBg }]}>
              <Text style={[styles.numberText, { color: numberColor }]}>{card.number}</Text>
            </View>

            <Text style={[styles.title, { color: titleColor }]} numberOfLines={3}>
              {card.title}
            </Text>
            <Text style={[styles.body, { color: bodyColor }]} numberOfLines={3}>
              {card.body}
            </Text>

            <View style={styles.actionRow}>
              <Text style={[styles.actionLink, { color: theme.colors.primary }]}>
                Learn more
              </Text>
              <ChevronRight size={14} color={theme.colors.primary} strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export const ValuePropositionStrip = React.memo(function ValuePropositionStrip({
  onCardPress,
  onDiscoverPress,
}: Props) {
  const theme = useTheme();
  const animsRef = useRef<Animated.Value[]>(CARDS.map(() => new Animated.Value(0)));
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Stagger entry animation
  useEffect(() => {
    const animations = animsRef.current.map((v) =>
      Animated.parallel([
        Animated.timing(v, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    const sequence = Animated.stagger(120, animations);
    const timer = setTimeout(() => sequence.start(), 200);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const dotWidthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(dotWidthAnim, {
      toValue: activeIndex,
      tension: 80,
      friction: 9,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, dotWidthAnim]);

  const handlePress = useCallback(
    (card: CardDef) => {
      console.log('[ValueProp] tap', card.id, '->', card.destination);
      if (onCardPress) {
        onCardPress(card.destination, card.id);
        return;
      }
      if (card.id === 'explore' && onDiscoverPress) {
        onDiscoverPress();
      }
    },
    [onCardPress, onDiscoverPress]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;
    const first = viewableItems[0];
    if (typeof first.index === 'number') {
      setActiveIndex(first.index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: CardDef; index: number }) => (
      <AnimatedCard
        card={item}
        anim={animsRef.current[index]}
        onPress={() => handlePress(item)}
      />
    ),
    [handlePress]
  );

  const headerTitleColor = theme.dark ? '#ffffff' : '#1a1a2e';
  const headerSubColor = theme.dark ? '#94a3b8' : '#1A5C35';

  const dots = useMemo(() => {
    return CARDS.map((_, i) => {
      const isActive = i === activeIndex;
      return (
        <View
          key={`dot-${i}`}
          style={[
            styles.dot,
            isActive
              ? { width: 16, backgroundColor: theme.colors.primary }
              : { width: 6, backgroundColor: theme.dark ? '#3f3f46' : '#d4d4d8' },
          ]}
        />
      );
    });
  }, [activeIndex, theme.colors.primary, theme.dark]);

  return (
    <View style={styles.wrap} testID="value-prop-strip">
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: headerTitleColor }]}>How it works</Text>
          <Text style={[styles.headerSub, { color: headerSubColor }]}>
            Everything you can do on TouchPoint
          </Text>
        </View>
        <View
          style={styles.dotsRow}
          accessibilityRole="adjustable"
          accessibilityLabel={`Card ${activeIndex + 1} of ${CARDS.length}`}
        >
          {dots}
        </View>
      </View>

      <FlatList
        data={CARDS}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        testID="value-prop-list"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    marginBottom: 8,
  },
  headerRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: CARD_GAP,
    paddingVertical: 6,
  },
  cardOuter: {
    width: CARD_WIDTH,
    minHeight: CARD_MIN_HEIGHT,
  },
  cardPressable: {
    flex: 1,
    borderRadius: 20,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  cardSurface: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  illustrationBlock: {
    height: ILLUSTRATION_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: '100%',
    height: ILLUSTRATION_HEIGHT,
  },
  textBlock: {
    flexDirection: 'column',
    minHeight: CARD_MIN_HEIGHT - ILLUSTRATION_HEIGHT,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    position: 'relative',
  },
  numberPill: {
    position: 'absolute',
    top: 10,
    right: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  numberText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    paddingRight: 36,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  actionRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLink: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ValuePropositionStrip;
