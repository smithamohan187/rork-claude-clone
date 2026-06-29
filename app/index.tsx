import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  ViewToken,
  Platform,
  Easing,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Rss } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Green design system
const BRAND_GREEN = '#00B246';
const BRAND_DEEP = '#1A5C35';
const BRAND_DARKER = '#0D3D20';
const OVERLAY = 'rgba(26, 92, 53, 0.72)';
const BG_IMAGE = 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800&q=90';
const GOLD = '#4CAF50';
const GOLD_BG = 'rgba(56, 180, 90, 0.18)';

// Legacy aliases (kept so existing slide styling still compiles)
const AMBER = BRAND_GREEN;
const AMBER_DEEP = BRAND_DEEP;
const ORANGE = BRAND_DEEP;
const CREAM = BRAND_DEEP;
const INK = '#FFFFFF';
const INK_SOFT = 'rgba(255,255,255,0.85)';
const GREEN = BRAND_GREEN;
const GREEN_SOFT = 'rgba(255,255,255,0.15)';

const ONBOARDING_KEY = 'onboarding_complete';

type SlideId = 'welcome' | 'subscribe' | 'refer' | 'earn' | 'redeem' | 'ready';

interface SlideMeta {
  id: SlideId;
}

const SLIDES: SlideMeta[] = [
  { id: 'welcome' },
  { id: 'subscribe' },
  { id: 'refer' },
  { id: 'earn' },
  { id: 'redeem' },
  { id: 'ready' },
];

interface Confetti {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const CONFETTI: Confetti[] = Array.from({ length: 14 }).map((_, i) => ({
  left: (i * 31) % 100,
  delay: (i * 280) % 4000,
  duration: 4200 + ((i * 173) % 2200),
  color: ['#FBBF24', '#1A5C35', '#FCD34D', '#FFFFFF'][i % 4],
  size: 6 + (i % 3) * 3,
}));

function ConfettiLayer() {
  const anims = useRef(CONFETTI.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(CONFETTI[i].delay),
          Animated.timing(v, {
            toValue: 1,
            duration: CONFETTI[i].duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {CONFETTI.map((c, i) => {
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-40, height * 0.55],
        });
        const rotate = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });
        const opacity = anims[i].interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${c.left}%`,
              width: c.size,
              height: c.size,
              borderRadius: c.size / 2,
              backgroundColor: c.color,
              opacity,
              transform: [{ translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

function PulsingView({ children, scaleTo = 1.08, duration = 900, style }: { children: React.ReactNode; scaleTo?: number; duration?: number; style?: any }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: scaleTo, duration, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(v, { toValue: 1, duration, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, scaleTo, duration]);
  return (
    <Animated.View style={[{ transform: [{ scale: v }] }, style]}>
      {children}
    </Animated.View>
  );
}

function StaggeredFadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 450, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [opacity, translate, delay]);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: translate }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Slide bodies
// ────────────────────────────────────────────────────────────────────────────

function WelcomeSlide() {
  return (
    <View style={styles.slideInner}>
      <ConfettiLayer />
      <View style={styles.slideContent}>
        <PulsingView scaleTo={1.06} duration={1200}>
          <View style={styles.iconHaloGold}>
            <MaterialCommunityIcons name="map-marker-radius" size={56} color={GOLD} />
          </View>
        </PulsingView>
        <Text style={styles.heading}>Welcome to TouchPoint!</Text>
        <Text style={styles.subtitle}>ALL your business ALL in one place</Text>
        <Text style={styles.subtext}>
          A smarter way to support and engage with local businesses and enjoy a more rewarding experience with every TouchPoint
        </Text>
      </View>
    </View>
  );
}

function SubscribeSlide() {
  const businesses = [
    { emoji: '☕', name: 'Brew & Co' },
    { emoji: '💇', name: 'StyleHub' },
    { emoji: '🍕', name: 'Slice Palace' },
  ];
  const benefits = ['First to know', 'Personalised offers', 'All in one feed'];
  return (
    <View style={styles.slideInner}>
      <View style={styles.slideContent}>
        <PulsingView scaleTo={1.05}>
          <View style={styles.iconHaloGold}>
            <MaterialCommunityIcons name="bell-ring-outline" size={56} color={GOLD} />
          </View>
        </PulsingView>

        <Text style={styles.heading}>Follow the businesses that you value most</Text>
        <Text style={styles.subtext}>
          Be the first to know about their news, promotions, offers, events, and rewards and engage with them without the congestion of social media
        </Text>

        <View style={styles.chipRow}>
          {businesses.map((b, i) => (
            <StaggeredFadeIn key={b.name} delay={300 + i * 220}>
              <View style={styles.bizPill}>
                <Text style={styles.bizPillEmoji}>{b.emoji}</Text>
                <Text style={styles.bizPillText}>{b.name}</Text>
              </View>
            </StaggeredFadeIn>
          ))}
        </View>

        <View style={[styles.chipRow, { marginTop: 14 }]}>
          {benefits.map((b, i) => (
            <StaggeredFadeIn key={b} delay={900 + i * 180}>
              <View style={styles.benefitPill}>
                <Text style={styles.benefitPillText}>{b}</Text>
              </View>
            </StaggeredFadeIn>
          ))}
        </View>
      </View>
    </View>
  );
}

function ReferSlide() {
  const tiers = [
    { emoji: '🥈', name: 'Silver Connector', color: '#9CA3AF', tag: 'Refer 1–4 friends' },
    { emoji: '🥇', name: 'Amber Insider', color: AMBER, tag: 'Refer 5–14 friends' },
    { emoji: '👑', name: 'Purple VIP', color: '#00B246', tag: '15+ friends, top perks' },
  ];
  return (
    <View style={styles.slideInner}>
      <View style={styles.slideContent}>
        <PulsingView scaleTo={1.05}>
          <View style={styles.iconHaloGold}>
            <MaterialCommunityIcons name="account-group-outline" size={56} color={GOLD} />
          </View>
        </PulsingView>

        <Text style={styles.heading}>Build a trusted friends business network</Text>
        <Text style={styles.subtext}>
          Refer and Share your experiences and build a portfolio of rewards points and recognition – it feels good to share a great business experience.
        </Text>

        <View style={styles.tierList}>
          {tiers.map((t, i) => (
            <StaggeredFadeIn key={t.name} delay={250 + i * 180}>
              <View style={[styles.tierRow, { borderLeftColor: t.color }]}>
                <Text style={styles.tierEmoji}>{t.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>{t.name}</Text>
                  <Text style={styles.tierTag}>{t.tag}</Text>
                </View>
              </View>
            </StaggeredFadeIn>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          Points are non-monetary — they unlock badges, perks, and exclusive access. No cash value.
        </Text>
      </View>
    </View>
  );
}

function EarnSlide() {
  const actions = [
    { emoji: '🏬', label: 'Subscribe to a business', pts: '+50' },
    { emoji: '👥', label: 'Refer a friend', pts: '+100' },
    { emoji: '🎟️', label: 'Redeem an offer', pts: '+25' },
    { emoji: '📅', label: 'Attend a business event', pts: '+75' },
    { emoji: '↗️', label: 'Share a business post', pts: '+10' },
  ];
  return (
    <View style={styles.slideInner}>
      <View style={[styles.slideContent, { paddingBottom: 48, flexShrink: 1 }]}>
        <PulsingView scaleTo={1.08}>
          <View style={styles.iconHaloGold}>
            <MaterialCommunityIcons name="star-circle-outline" size={56} color={GOLD} />
          </View>
        </PulsingView>

        <Text style={styles.heading}>Every TouchPoint is an opportunity</Text>
        <Text style={[styles.subtext, { lineHeight: 26 }]}>
          Choose to engage through simple goodwill gratitude or take advantage of a range of points and prizes
        </Text>

        <View style={styles.earnList}>
          {actions.map((a, i) => (
            <StaggeredFadeIn key={a.label} delay={200 + i * 140}>
              <View style={styles.earnRow}>
                <View style={styles.earnIcon}>
                  <Text style={styles.earnEmoji}>{a.emoji}</Text>
                </View>
                <Text style={styles.earnLabel}>{a.label}</Text>
                <View style={styles.ptsPill}>
                  <Text style={styles.ptsPillText}>{a.pts} pts</Text>
                </View>
              </View>
            </StaggeredFadeIn>
          ))}
        </View>
      </View>
    </View>
  );
}

function RedeemSlide() {
  const perks = ['10% Off', 'Free Coffee', 'VIP Access'];
  const grid = [
    { emoji: '🏷️', label: 'Discounts', sub: 'In-store deals just for you' },
    { emoji: '🎁', label: 'Free Items', sub: 'Surprise drops & freebies' },
    { emoji: '⏱️', label: 'Early Access', sub: 'Beat the crowd to launches' },
    { emoji: '👑', label: 'VIP Perks', sub: 'Exclusive events & status' },
  ];
  return (
    <View style={styles.slideInner}>
      <View style={styles.slideContent}>
        <PulsingView scaleTo={1.05}>
          <View style={styles.iconHaloGold}>
            <MaterialCommunityIcons name="gift-outline" size={56} color={GOLD} />
          </View>
        </PulsingView>

        <Text style={styles.heading}>Convert your points into REAL benefits & rewards</Text>
        <Text style={styles.subtext}>
          Use your points to unlock personalised deals, Prizes, VIP access and priority attention driven by loyalty
        </Text>

        <View style={styles.chipRow}>
          {perks.map((p, i) => (
            <StaggeredFadeIn key={p} delay={250 + i * 220}>
              <View style={styles.perkChip}>
                <Text style={styles.perkChipText}>{p}</Text>
              </View>
            </StaggeredFadeIn>
          ))}
        </View>

        <View style={styles.grid2}>
          {grid.map((g, i) => (
            <StaggeredFadeIn key={g.label} delay={500 + i * 120} style={styles.gridCellWrap}>
              <View style={styles.gridCell}>
                <Text style={styles.gridEmoji}>{g.emoji}</Text>
                <Text style={styles.gridLabel}>{g.label}</Text>
                <Text style={styles.gridSub}>{g.sub}</Text>
              </View>
            </StaggeredFadeIn>
          ))}
        </View>
      </View>
    </View>
  );
}

function ReadySlide({ onExplore, onFeed, onLogIn }: { onExplore: () => void; onFeed: () => void; onLogIn: () => void }) {
  const glow = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  return (
    <View style={styles.slideInner}>
      <View style={styles.slideContent}>
        <View style={styles.rocketWrap}>
          <Animated.View style={[styles.rocketGlow, { opacity: glow }]} />
          <PulsingView scaleTo={1.1} duration={1100}>
            <View style={styles.iconHaloGold}>
              <MaterialCommunityIcons name="rocket-launch-outline" size={56} color={GOLD} />
            </View>
          </PulsingView>
        </View>

        <Text style={[styles.heading, { color: '#FFFFFF' }]}>You&apos;re Ready to go</Text>
        <View style={{ marginBottom: 18, gap: 10 }}>
          <Text style={[styles.subtext, { color: 'rgba(255,255,255,0.88)', marginBottom: 0 }]}>
            •  Invite friends to join your business network
          </Text>
          <Text style={[styles.subtext, { color: 'rgba(255,255,255,0.88)', marginBottom: 0 }]}>
            •  Explore businesses important to you
          </Text>
          <Text style={[styles.subtext, { color: 'rgba(255,255,255,0.88)', marginBottom: 0 }]}>
            •  Go to your Newsfeed
          </Text>
        </View>

        <View style={styles.readyButtons}>
          <TouchableOpacity
            style={styles.primaryReadyBtn}
            onPress={onExplore}
            activeOpacity={0.85}
            testID="ready-explore-btn"
          >
            <Text style={styles.primaryReadyText}>🔍  Explore Businesses Near Me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryReadyBtn}
            onPress={onFeed}
            activeOpacity={0.8}
            testID="ready-feed-btn"
          >
            <Text style={styles.secondaryReadyText}>Go to My Feed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onLogIn}
            activeOpacity={0.7}
            style={styles.loginLink}
            testID="login-link"
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.bottomNote}>
          You can revisit this guide anytime from Profile → Help → Getting Started.
        </Text>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<SlideMeta>>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.log('[Onboarding] save error', e);
    }
  }, []);

  const haptic = useCallback((style: 'light' | 'medium' = 'light') => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(style === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => undefined);
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    haptic('light');
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  }, [activeIndex, haptic]);

  const handleSkip = useCallback(() => {
    haptic('light');
    void completeOnboarding();
    router.push('/(auth)/sign-up');
  }, [router, haptic, completeOnboarding]);

  const handleExplore = useCallback(() => {
    haptic('medium');
    void completeOnboarding();
    router.push('/(auth)/sign-up');
  }, [router, haptic, completeOnboarding]);

  const handleFeed = useCallback(() => {
    haptic('light');
    void completeOnboarding();
    router.push('/(tabs)/feed' as never);
  }, [router, haptic, completeOnboarding]);

  const handleLogIn = useCallback(() => {
    haptic('light');
    void completeOnboarding();
    router.push('/(auth)/sign-in');
  }, [router, haptic, completeOnboarding]);

  const handleBrowseFeeds = useCallback(() => {
    haptic('light');
    router.push('/(tabs)/feed' as never);
  }, [router, haptic]);

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
      ),
    [scrollX]
  );

  const renderSlide = useCallback(({ item }: { item: SlideMeta }) => {
    let body: React.ReactNode = null;
    switch (item.id) {
      case 'welcome':
        body = <WelcomeSlide />;
        break;
      case 'subscribe':
        body = <SubscribeSlide />;
        break;
      case 'refer':
        body = <ReferSlide />;
        break;
      case 'earn':
        body = <EarnSlide />;
        break;
      case 'redeem':
        body = <RedeemSlide />;
        break;
      case 'ready':
        body = <ReadySlide onExplore={handleExplore} onFeed={handleFeed} onLogIn={handleLogIn} />;
        break;
    }
    return <View style={{ width, height: '100%' }}>{body}</View>;
  }, [handleExplore, handleFeed, handleLogIn]);

  const isReadySlide = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: BG_IMAGE }}
        resizeMode="cover"
        style={styles.bgImage}
      />
      <View style={styles.overlay}>
      <SafeAreaView style={styles.safeArea} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <View style={[styles.logoDot, { backgroundColor: '#FFFFFF' }]} />
            <Text style={[styles.logoText, { color: '#FFFFFF' }]}>TouchPoint</Text>
          </View>
          {!isReadySlide && (
            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              testID="skip-btn"
              activeOpacity={0.6}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        testID="onboarding-carousel"
      />

      <SafeAreaView edges={['bottom']} style={styles.bottomArea} pointerEvents="box-none">
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 26, 8], extrapolate: 'clamp' });
            const dotColor = '#FFFFFF';
            const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: dotColor }]}
              />
            );
          })}
        </View>

        {!isReadySlide && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.9}
            testID="next-btn"
          >
            <Text style={styles.nextButtonText}>{activeIndex === 0 ? "Let's Go" : 'Next'}  →</Text>
          </TouchableOpacity>
        )}

        {!isReadySlide && (
          <TouchableOpacity
            style={styles.feedsButton}
            onPress={handleBrowseFeeds}
            activeOpacity={0.7}
            testID="view-feeds-btn"
          >
            <Rss size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            <Text style={styles.feedsButtonText}>Browse Feeds</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_DEEP,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 40, 20, 0.62)',
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logoText: {
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  slideInner: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  slideContent: {
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: 28,
    paddingTop: 96,
    paddingBottom: 32,
    alignItems: 'center',
  },
  iconHaloGold: {
    backgroundColor: GOLD_BG,
    borderRadius: 50,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmojiCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  bigEmoji: {
    fontSize: 80,
  },
  iconHalo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 46,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginBottom: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    letterSpacing: -0.4,
    lineHeight: 26,
    marginBottom: 8,
    opacity: 0.9,
  },
  subtext: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center' as const,
    lineHeight: 24,
    paddingHorizontal: 28,
    marginBottom: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  bizPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bizPillEmoji: {
    fontSize: 14,
  },
  bizPillText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  benefitPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  benefitPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    gap: 6,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  dottedLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    opacity: 0.55,
  },
  starEmoji: {
    fontSize: 22,
    marginHorizontal: 4,
  },
  tierList: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 0.5,
  },
  tierEmoji: {
    fontSize: 22,
  },
  tierName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  tierTag: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  disclaimer: {
    fontSize: 11,
    fontStyle: 'italic' as const,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center' as const,
    marginTop: 14,
    paddingHorizontal: 8,
  },
  earnList: {
    width: '100%',
    marginTop: 8,
    gap: 6,
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  earnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnEmoji: {
    fontSize: 18,
  },
  earnLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  ptsPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ptsPillText: {
    color: BRAND_DEEP,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  perkChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  perkChipText: {
    color: BRAND_DEEP,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  grid2: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  gridCellWrap: {
    width: '48.5%',
  },
  gridCell: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 90,
  },
  gridEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  gridSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    lineHeight: 14,
  },
  rocketWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  rocketGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  rocketEmoji: {
    fontSize: 100,
  },
  readyButtons: {
    width: '100%',
    marginTop: 18,
  },
  primaryReadyBtn: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryReadyText: {
    color: BRAND_DEEP,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryReadyBtn: {
    height: 52,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  secondaryReadyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  loginLink: {
    alignItems: 'center' as const,
    paddingVertical: 12,
    marginTop: 6,
  },
  loginLinkText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  loginLinkBold: {
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  bottomNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center' as const,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  bottomArea: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  skipBottom: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.75)',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: BRAND_DEEP,
    letterSpacing: 0.2,
  },
  feedsButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  feedsButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
    textDecorationLine: 'underline' as const,
  },
});

// keep ScrollView import used so eslint doesn't strip the import in any future edit
const _keep = ScrollView;
void _keep;
