import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
  Image as RNImage,
  Modal,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MessageSquare,
  Megaphone,
  Shield,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Users,
  Handshake,
  Mail,
  Maximize2,
  Minimize2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 24;

const LOGO_URL = 'https://r2-pub.rork.com/generated-images/de5b7891-f946-4e79-9164-416c4c9266a2.png';
const PRESENTER_IMAGE = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face';

const TOTAL_CYCLE_MS = 40000;

interface BusinessSlide {
  id: string;
  type: 'intro' | 'feature' | 'cta';
  title: string;
  subtitle: string;
  backgroundImage: string;
  overlayGradient: [string, string, string];
  icon?: React.ReactNode;
  accentColor: string;
  supportImages?: string[];
  ctaText?: string;
  ctaRoute?: string;
}

const businessSlides: BusinessSlide[] = [
  {
    id: 'intro',
    type: 'intro',
    title: 'TouchPoint',
    subtitle: "All Your Business\nAll in One Place",
    backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(27,42,74,0.92)', 'rgba(27,42,74,0.7)', 'rgba(27,42,74,0.95)'],
    accentColor: '#F59E0B',
  },
  {
    id: 'engage-customers',
    type: 'feature',
    title: 'Engage Your REAL Customers',
    subtitle: 'A new way to have passive or active dialogue, one-to-one or one-to-many, with your REAL customers — cutting out the drivel of social media',
    backgroundImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(19,78,94,0.9)', 'rgba(27,67,50,0.65)', 'rgba(45,106,79,0.92)'],
    icon: <MessageSquare size={24} color="#52B788" />,
    accentColor: '#52B788',
    supportImages: [
      'https://images.unsplash.com/photo-1552581234-26160f608093?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'avoid-spam',
    type: 'feature',
    title: 'No More Spam & Junk',
    subtitle: 'Avoid spamming and losing your most important business messages in junk mail — use personal feed announcements and posts to reach customers directly',
    backgroundImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(26,26,46,0.9)', 'rgba(22,33,62,0.65)', 'rgba(15,52,96,0.92)'],
    icon: <Mail size={24} color="#60A5FA" />,
    accentColor: '#60A5FA',
    supportImages: [
      'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'promotions',
    type: 'feature',
    title: 'Social Media, Your Way',
    subtitle: 'Use the power of Social Media with easily customised and managed promotions, offers and discounts — all under your control',
    backgroundImage: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(120,53,15,0.88)', 'rgba(180,83,9,0.6)', 'rgba(146,64,14,0.92)'],
    icon: <Megaphone size={24} color="#FCD34D" />,
    accentColor: '#FCD34D',
    supportImages: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'referrals',
    type: 'feature',
    title: 'Word of Mouth Power',
    subtitle: "Leverage the world's most successful method to drive more sales and find more customers using our unique goodwill or incentivised referrals engine",
    backgroundImage: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(30,64,175,0.88)', 'rgba(37,99,235,0.6)', 'rgba(29,78,216,0.92)'],
    icon: <Handshake size={24} color="#93C5FD" />,
    accentColor: '#93C5FD',
    supportImages: [
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'trust',
    type: 'feature',
    title: 'Build Trust & Reputation',
    subtitle: 'Share feedback, ratings and community network intelligence to build lasting trust with your customers',
    backgroundImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(55,48,163,0.88)', 'rgba(67,56,202,0.6)', 'rgba(26,92,53,0.92)'],
    icon: <Shield size={24} color="#E8F5EE" />,
    accentColor: '#E8F5EE',
    supportImages: [
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1559526324-593bc073d938?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'easy-tools',
    type: 'cta',
    title: 'Simple, Powerful Tools',
    subtitle: 'Avoid complex and costly digital campaigns with our easy-to-use tools and insights — everything you need in one place',
    backgroundImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(13,148,136,0.9)', 'rgba(20,184,166,0.65)', 'rgba(15,118,110,0.92)'],
    icon: <BarChart3 size={24} color="#99F6E4" />,
    accentColor: '#99F6E4',
    supportImages: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=200&h=200&fit=crop',
    ],
    ctaText: 'Get Started',
    ctaRoute: '/(tabs)/marketplace',
  },
];

const SLIDE_DURATION = TOTAL_CYCLE_MS / businessSlides.length;

const TrustNetworkGraphic = React.memo(function TrustNetworkGraphic() {
  const tiers = [
    { name: 'Verified', color: '#22C55E' },
    { name: 'Trusted', color: '#3B82F6' },
    { name: 'Recommended', color: '#F59E0B' },
    { name: 'Community', color: '#00B246' },
  ];

  return (
    <View style={trustStyles.container}>
      {tiers.map((tier, i) => (
        <React.Fragment key={tier.name}>
          <View style={[trustStyles.badge, { backgroundColor: tier.color + '30', borderColor: tier.color }]}>
            <View style={[trustStyles.dot, { backgroundColor: tier.color }]} />
            <Text style={[trustStyles.text, { color: tier.color }]}>{tier.name}</Text>
          </View>
          {i < tiers.length - 1 && (
            <ChevronRight size={10} color="rgba(255,255,255,0.4)" />
          )}
        </React.Fragment>
      ))}
    </View>
  );
});

const trustStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  text: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
});

export default function BusinessVideoPost() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const fadeAnims = useRef<Animated.Value[]>(
    businessSlides.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const overallProgress = useRef(new Animated.Value(0)).current;
  const slideIndexRef = useRef<number>(0);
  const slideTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef<boolean>(false);
  const startCycleRef = useRef<() => void>(() => {});
  const goToSlideRef = useRef<(direction: 'next' | 'prev') => void>(() => {});

  const slide = businessSlides[currentSlide];

  const clearAllTimers = useCallback(() => {
    slideTimersRef.current.forEach(t => clearTimeout(t));
    slideTimersRef.current = [];
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
  }, []);

  const transitionToSlide = useCallback((nextIndex: number, direction: 'left' | 'right' | 'fade' = 'fade') => {
    const prevIndex = slideIndexRef.current;
    if (prevIndex === nextIndex) return;
    console.log('[BusinessRolling] Transitioning from slide', prevIndex, 'to', nextIndex, 'direction:', direction);
    slideIndexRef.current = nextIndex;
    setCurrentSlide(nextIndex);

    if (direction === 'fade') {
      contentFade.setValue(0);
      Animated.timing(contentFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      Animated.timing(fadeAnims[nextIndex], { toValue: 1, duration: 900, useNativeDriver: true }).start();
      Animated.timing(fadeAnims[prevIndex], { toValue: 0, duration: 900, useNativeDriver: true }).start();
    } else {
      const enterFrom = direction === 'left' ? CARD_WIDTH : -CARD_WIDTH;
      fadeAnims[prevIndex].setValue(1);
      fadeAnims[nextIndex].setValue(1);
      contentFade.setValue(1);
      swipeAnim.setValue(enterFrom);
      Animated.spring(swipeAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start(() => {
        fadeAnims[prevIndex].setValue(0);
      });
    }
  }, [fadeAnims, contentFade, swipeAnim]);

  const startCycle = useCallback(() => {
    clearAllTimers();
    console.log('[BusinessRolling] Starting 40s rolling cycle');

    slideIndexRef.current = 0;
    setCurrentSlide(0);
    fadeAnims.forEach((anim, i) => anim.setValue(i === 0 ? 1 : 0));
    contentFade.setValue(1);
    swipeAnim.setValue(0);
    overallProgress.setValue(0);

    Animated.timing(overallProgress, {
      toValue: 1,
      duration: TOTAL_CYCLE_MS,
      useNativeDriver: false,
    }).start();

    for (let i = 1; i < businessSlides.length; i++) {
      const delay = SLIDE_DURATION * i;
      const timer = setTimeout(() => {
        transitionToSlide(i);
      }, delay);
      slideTimersRef.current.push(timer);
    }

    cycleTimerRef.current = setTimeout(() => {
      console.log('[BusinessRolling] Cycle complete, restarting');
      startCycleRef.current();
    }, TOTAL_CYCLE_MS);
  }, [clearAllTimers, fadeAnims, contentFade, overallProgress, swipeAnim, transitionToSlide]);

  startCycleRef.current = startCycle;

  const goToSlide = useCallback((direction: 'next' | 'prev') => {
    const current = slideIndexRef.current;
    let next: number;
    if (direction === 'next') {
      next = current < businessSlides.length - 1 ? current + 1 : 0;
    } else {
      next = current > 0 ? current - 1 : businessSlides.length - 1;
    }
    console.log('[BusinessRolling] Swipe', direction, 'from', current, 'to', next);
    clearAllTimers();
    transitionToSlide(next, direction === 'next' ? 'left' : 'right');

    const elapsed = SLIDE_DURATION * next;
    overallProgress.setValue(elapsed / TOTAL_CYCLE_MS);
    Animated.timing(overallProgress, {
      toValue: 1,
      duration: TOTAL_CYCLE_MS - elapsed,
      useNativeDriver: false,
    }).start();

    for (let i = next + 1; i < businessSlides.length; i++) {
      const delay = SLIDE_DURATION * (i - next);
      const timer = setTimeout(() => {
        transitionToSlide(i);
      }, delay);
      slideTimersRef.current.push(timer);
    }

    const cycleDelay = SLIDE_DURATION * (businessSlides.length - next);
    cycleTimerRef.current = setTimeout(() => {
      console.log('[BusinessRolling] Cycle complete after swipe, restarting');
      startCycleRef.current();
    }, cycleDelay);
  }, [clearAllTimers, transitionToSlide, overallProgress]);

  goToSlideRef.current = goToSlide;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        isSwipingRef.current = true;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isSwipingRef.current) return;
        isSwipingRef.current = false;
        const threshold = 40;
        if (gestureState.dx < -threshold) {
          goToSlideRef.current('next');
        } else if (gestureState.dx > threshold) {
          goToSlideRef.current('prev');
        }
      },
      onPanResponderTerminate: () => {
        isSwipingRef.current = false;
      },
    })
  ).current;

  useEffect(() => {
    startCycle();
    return () => {
      clearAllTimers();
    };
  }, [startCycle, clearAllTimers]);

  const handleCtaPress = useCallback(() => {
    if (slide.ctaRoute) {
      router.push(slide.ctaRoute as never);
    }
  }, [slide, router]);

  const handleToggleFullscreen = useCallback(() => {
    console.log('[BusinessRolling] Toggle fullscreen:', !isFullscreen);
    setIsFullscreen(prev => !prev);
  }, [isFullscreen]);

  const overallProgressWidth = useMemo(() => overallProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  }), [overallProgress]);

  const renderContent = (fullscreen: boolean) => (
    <View style={fullscreen ? styles.fullscreenCard : styles.card} {...panResponder.panHandlers}>
      {businessSlides.map((s, i) => (
        <Animated.View
          key={s.id}
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: fadeAnims[i],
              zIndex: i === currentSlide ? 2 : 1,
              transform: i === currentSlide ? [{ translateX: swipeAnim }] : [],
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={{ uri: s.backgroundImage }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <LinearGradient
            colors={s.overlayGradient}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      ))}

      <View style={styles.topSection}>
        <View style={styles.presenterRow}>
          <View>
            <Image source={{ uri: PRESENTER_IMAGE }} style={styles.presenterAvatar} contentFit="cover" />
            <View style={styles.liveDot} />
          </View>
          <View style={styles.presenterInfo}>
            <Text style={styles.presenterName}>TouchPoint Business</Text>
            <Text style={styles.presenterLabel}>Business Guide</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          <Pressable
            style={styles.expandBtn}
            onPress={handleToggleFullscreen}
            testID="business-expand-btn"
          >
            {fullscreen ? (
              <Minimize2 size={16} color="#FFFFFF" />
            ) : (
              <Maximize2 size={16} color="#FFFFFF" />
            )}
          </Pressable>
          {!fullscreen && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>~40s</Text>
            </View>
          )}
        </View>
      </View>

      <Animated.View style={[fullscreen ? styles.fullscreenContentArea : styles.contentArea, { opacity: contentFade }]} pointerEvents="box-none">
        {slide.type === 'intro' ? (
          <View style={styles.introContent}>
            <RNImage source={{ uri: LOGO_URL }} style={styles.logoIcon} resizeMode="contain" />
            <Text style={styles.introTitle}>{slide.title}</Text>
            <Text style={[styles.introSubtitle, { color: slide.accentColor }]}>{slide.subtitle}</Text>
            <View style={styles.introTagline}>
              <Users size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.introTaglineText}>For Business Owners</Text>
            </View>
          </View>
        ) : (
          <View style={styles.featureContent}>
            {slide.icon && (
              <View style={[styles.iconCircle, { backgroundColor: slide.accentColor + '20', borderColor: slide.accentColor + '40' }]}>
                {slide.icon}
              </View>
            )}
            <Text style={styles.featureTitle}>{slide.title}</Text>
            <Text style={styles.featureSubtitle}>{slide.subtitle}</Text>
            {slide.id === 'trust' && <TrustNetworkGraphic />}
            {slide.ctaText && (
              <Pressable style={[styles.ctaButton, { backgroundColor: slide.accentColor }]} onPress={handleCtaPress}>
                <Text style={styles.ctaButtonText}>{slide.ctaText}</Text>
                <ArrowRight size={14} color={Colors.navyDark} />
              </Pressable>
            )}
          </View>
        )}
      </Animated.View>

      <View style={styles.bottomBar}>
        <View style={styles.dotsRow}>
          {businessSlides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dotIndicator,
                i === currentSlide ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: overallProgressWidth }]} />
        </View>
        <Text style={styles.counterText}>{currentSlide + 1}/{businessSlides.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container} testID="business-rolling-post">
      {renderContent(false)}

      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        statusBarTranslucent
        onRequestClose={handleToggleFullscreen}
      >
        <View style={styles.fullscreenContainer}>
          {renderContent(true)}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.navyDark,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCard: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.navyDark,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    zIndex: 10,
  },
  presenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presenterAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  liveDot: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: Colors.navyDark,
  },
  presenterInfo: {
    gap: 1,
  },
  presenterName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  presenterLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  durationBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 20,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 6,
  },
  fullscreenContentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 6,
  },
  introContent: {
    alignItems: 'center',
    gap: 6,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginBottom: 4,
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '200' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center' as const,
  },
  introSubtitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  introTagline: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  introTaglineText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  featureContent: {
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  featureSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center' as const,
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
    gap: 5,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    letterSpacing: 0.2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  counterText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
});
