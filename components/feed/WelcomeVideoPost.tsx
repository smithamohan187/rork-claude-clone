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
  Alert,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Store,
  Megaphone,
  Trophy,
  Share2,
  Gift,
  Search,
  Eye,
  Users,
  ArrowRight,
  ChevronRight,
  Send,
  Check,
  Maximize2,
  Minimize2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 24;

const LOGO_URL = 'https://r2-pub.rork.com/generated-images/de5b7891-f946-4e79-9164-416c4c9266a2.png';
const PRESENTER_IMAGE = 'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=300&h=300&fit=crop&crop=face';

const TOTAL_CYCLE_MS = 40000;

interface WelcomeSlide {
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

const welcomeSlides: WelcomeSlide[] = [
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
    id: 'support-local',
    type: 'feature',
    title: 'Support Your Local Businesses',
    subtitle: 'Discover amazing businesses right in your neighbourhood',
    backgroundImage: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(19,78,94,0.88)', 'rgba(27,67,50,0.65)', 'rgba(45,106,79,0.92)'],
    icon: <Store size={24} color="#52B788" />,
    accentColor: '#52B788',
    supportImages: [
      'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'updates-promos',
    type: 'feature',
    title: 'Latest Updates & Promotions',
    subtitle: 'Stay in the loop with business news, deals & exclusive offers',
    backgroundImage: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(26,26,46,0.9)', 'rgba(22,33,62,0.65)', 'rgba(15,52,96,0.92)'],
    icon: <Megaphone size={24} color="#E94560" />,
    accentColor: '#E94560',
    supportImages: [
      'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1549931319-a545753467c8?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'earn-rewards',
    type: 'feature',
    title: 'Earn Points & Win Prizes',
    subtitle: 'Get rewarded for supporting the businesses you love most',
    backgroundImage: 'https://images.unsplash.com/photo-1553729459-afe8f2e2ed08?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(120,53,15,0.88)', 'rgba(180,83,9,0.6)', 'rgba(146,64,14,0.92)'],
    icon: <Trophy size={24} color="#FCD34D" />,
    accentColor: '#FCD34D',
    supportImages: [
      'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'share-refer',
    type: 'feature',
    title: 'Share & Refer Others',
    subtitle: 'Engage with businesses by sharing and referring friends & family',
    backgroundImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(30,64,175,0.88)', 'rgba(37,99,235,0.6)', 'rgba(29,78,216,0.92)'],
    icon: <Share2 size={24} color="#93C5FD" />,
    accentColor: '#93C5FD',
    supportImages: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'win-prizes',
    type: 'feature',
    title: 'Win Points & Prizes',
    subtitle: 'Climb reward tiers from Bronze to Diamond and unlock exclusive perks',
    backgroundImage: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(109,40,217,0.88)', 'rgba(124,58,237,0.6)', 'rgba(91,33,182,0.92)'],
    icon: <Gift size={24} color="#E8F5EE" />,
    accentColor: '#E8F5EE',
  },
  {
    id: 'start-now',
    type: 'feature',
    title: 'Start Now!',
    subtitle: 'Navigate to the "BIZ:" page to begin your journey',
    backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(13,148,136,0.9)', 'rgba(20,184,166,0.65)', 'rgba(15,118,110,0.92)'],
    icon: <Store size={24} color="#99F6E4" />,
    accentColor: '#99F6E4',
    ctaText: 'Go to BIZ:',
    ctaRoute: '/(tabs)/marketplace',
  },
  {
    id: 'search-business',
    type: 'feature',
    title: 'Search for a Business',
    subtitle: 'Find businesses that matter to you using hyperlocal search',
    backgroundImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(30,58,138,0.88)', 'rgba(30,64,175,0.6)', 'rgba(23,37,84,0.92)'],
    icon: <Search size={24} color="#60A5FA" />,
    accentColor: '#60A5FA',
    supportImages: [
      'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'review-details',
    type: 'feature',
    title: 'Review Business Details',
    subtitle: 'Explore community posts, promotions, products & more for each business',
    backgroundImage: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(55,48,163,0.88)', 'rgba(67,56,202,0.6)', 'rgba(26,92,53,0.92)'],
    icon: <Eye size={24} color="#E8F5EE" />,
    accentColor: '#E8F5EE',
    supportImages: [
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1534778101976-62847782c213?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'join-bizcom',
    type: 'cta',
    title: 'Join a BizCom',
    subtitle: 'Request to join business communities and connect with like-minded members',
    backgroundImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=1000&fit=crop',
    overlayGradient: ['rgba(27,42,74,0.92)', 'rgba(44,62,90,0.7)', 'rgba(27,42,74,0.95)'],
    icon: <Users size={24} color="#F59E0B" />,
    accentColor: '#F59E0B',
    supportImages: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    ],
    ctaText: 'Explore BizComs',
    ctaRoute: '/(tabs)/marketplace',
  },
];

const SLIDE_DURATION = TOTAL_CYCLE_MS / welcomeSlides.length;

const TierBadges = React.memo(function TierBadges() {
  const tiers = [
    { name: 'Bronze', color: '#CD7F32' },
    { name: 'Silver', color: '#A8A9AD' },
    { name: 'Gold', color: '#FFD000' },
    { name: 'Platinum', color: '#00B246' },
    { name: 'Diamond', color: '#06B6D4' },
  ];

  return (
    <View style={tierStyles.container}>
      {tiers.map((tier, i) => (
        <React.Fragment key={tier.name}>
          <View style={[tierStyles.badge, { backgroundColor: tier.color + '30', borderColor: tier.color }]}>
            <View style={[tierStyles.dot, { backgroundColor: tier.color }]} />
            <Text style={[tierStyles.text, { color: tier.color }]}>{tier.name}</Text>
          </View>
          {i < tiers.length - 1 && (
            <ChevronRight size={10} color="rgba(255,255,255,0.4)" />
          )}
        </React.Fragment>
      ))}
    </View>
  );
});

const tierStyles = StyleSheet.create({
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

export default function WelcomeVideoPost() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const fadeAnims = useRef<Animated.Value[]>(
    welcomeSlides.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const overallProgress = useRef(new Animated.Value(0)).current;
  const slideIndexRef = useRef<number>(0);
  const slideTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSent, setIsSent] = useState<boolean>(false);
  const sendCheckScale = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef<boolean>(false);
  const startCycleRef = useRef<() => void>(() => {});
  const goToSlideRef = useRef<(direction: 'next' | 'prev') => void>(() => {});

  const slide = welcomeSlides[currentSlide];

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
    console.log('[WelcomeRolling] Transitioning from slide', prevIndex, 'to', nextIndex, 'direction:', direction);
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
    console.log('[WelcomeRolling] Starting 40s rolling cycle');

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

    for (let i = 1; i < welcomeSlides.length; i++) {
      const delay = SLIDE_DURATION * i;
      const timer = setTimeout(() => {
        transitionToSlide(i);
      }, delay);
      slideTimersRef.current.push(timer);
    }

    cycleTimerRef.current = setTimeout(() => {
      console.log('[WelcomeRolling] Cycle complete, restarting');
      startCycleRef.current();
    }, TOTAL_CYCLE_MS);
  }, [clearAllTimers, fadeAnims, contentFade, overallProgress, swipeAnim, transitionToSlide]);

  startCycleRef.current = startCycle;

  const goToSlide = useCallback((direction: 'next' | 'prev') => {
    const current = slideIndexRef.current;
    let next: number;
    if (direction === 'next') {
      next = current < welcomeSlides.length - 1 ? current + 1 : 0;
    } else {
      next = current > 0 ? current - 1 : welcomeSlides.length - 1;
    }
    console.log('[WelcomeRolling] Swipe', direction, 'from', current, 'to', next);
    clearAllTimers();
    transitionToSlide(next, direction === 'next' ? 'left' : 'right');

    const elapsed = SLIDE_DURATION * next;
    overallProgress.setValue(elapsed / TOTAL_CYCLE_MS);
    Animated.timing(overallProgress, {
      toValue: 1,
      duration: TOTAL_CYCLE_MS - elapsed,
      useNativeDriver: false,
    }).start();

    for (let i = next + 1; i < welcomeSlides.length; i++) {
      const delay = SLIDE_DURATION * (i - next);
      const timer = setTimeout(() => {
        transitionToSlide(i);
      }, delay);
      slideTimersRef.current.push(timer);
    }

    const cycleDelay = SLIDE_DURATION * (welcomeSlides.length - next);
    cycleTimerRef.current = setTimeout(() => {
      console.log('[WelcomeRolling] Cycle complete after swipe, restarting');
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

  const handleSendToMaya = useCallback(() => {
    if (isSending || isSent) return;
    console.log('[WelcomeRolling] Sending presentation to Maya Chen');
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);

      Animated.spring(sendCheckScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();

      Alert.alert(
        'Sent!',
        'TouchPoint Welcome Tour has been sent to Maya Chen.',
        [
          { text: 'View Chat', onPress: () => router.push('/chat/pm-1' as never) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }, 1500);
  }, [isSending, isSent, sendCheckScale, router]);

  const overallProgressWidth = useMemo(() => overallProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  }), [overallProgress]);

  const handleToggleFullscreen = useCallback(() => {
    console.log('[WelcomeRolling] Toggle fullscreen:', !isFullscreen);
    setIsFullscreen(prev => !prev);
  }, [isFullscreen]);

  const renderContent = (fullscreen: boolean) => (
    <View style={fullscreen ? styles.fullscreenCard : styles.card} {...panResponder.panHandlers}>
        {welcomeSlides.map((s, i) => (
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
            <Text style={styles.presenterName}>TouchPoint Guide</Text>
            <Text style={styles.presenterLabel}>Welcome Tour</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <Pressable
            style={styles.expandBtn}
            onPress={handleToggleFullscreen}
            testID="welcome-expand-btn"
          >
            {fullscreen ? (
              <Minimize2 size={16} color="#FFFFFF" />
            ) : (
              <Maximize2 size={16} color="#FFFFFF" />
            )}
          </Pressable>
          {!fullscreen && (
            <Pressable
              style={[styles.sendBtn, isSent && styles.sendBtnSent]}
              onPress={handleSendToMaya}
              disabled={isSending || isSent}
              testID="send-to-maya"
            >
              {isSending ? (
                <View style={styles.sendSpinner} />
              ) : isSent ? (
                <Animated.View style={{ transform: [{ scale: sendCheckScale }] }}>
                  <Check size={12} color="#FFFFFF" />
                </Animated.View>
              ) : (
                <Send size={12} color="#FFFFFF" />
              )}
              <Text style={styles.sendBtnText}>
                {isSending ? 'Sending...' : isSent ? 'Sent' : 'Send to Maya'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View style={[fullscreen ? styles.fullscreenContentArea : styles.contentArea, { opacity: contentFade }]} pointerEvents="box-none">
          {slide.type === 'intro' ? (
            <View style={styles.introContent}>
              <RNImage source={{ uri: LOGO_URL }} style={styles.logoIcon} resizeMode="contain" />
              <Text style={styles.introTitle}>{slide.title}</Text>
              <Text style={[styles.introSubtitle, { color: slide.accentColor }]}>{slide.subtitle}</Text>
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
              {slide.id === 'win-prizes' && <TierBadges />}
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
            {welcomeSlides.map((_, i) => (
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
        <Text style={styles.counterText}>{currentSlide + 1}/{welcomeSlides.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container} testID="welcome-rolling-post">
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
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(59,130,246,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 20,
  },
  sendBtnSent: {
    backgroundColor: 'rgba(34,197,94,0.85)',
  },
  sendBtnText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  sendSpinner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
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
