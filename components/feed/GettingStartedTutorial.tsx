import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SlidersHorizontal,
  ShoppingBag,
  Megaphone,
  Gift,
  UserPlus,
  Link,
  LayoutDashboard,
  ShieldCheck,
  Settings,
  Shield,
  ChevronRight,
  MousePointer2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 24;
const CARD_HEIGHT = CARD_WIDTH * 0.85;

const MENU_ITEMS = [
  { label: 'Business listing', icon: ShoppingBag, color: Colors.navyDark },
  { label: 'My promotions', icon: Megaphone, color: Colors.navyDark },
  { label: 'Rewards Set-up', icon: Gift, color: Colors.navyDark },
  { label: 'Invite new BizCom members', icon: UserPlus, color: '#10B981', highlight: true },
  { label: 'Referral Request', icon: Link, color: Colors.navyDark },
  { label: 'BizCom dashboard', icon: LayoutDashboard, color: Colors.navyDark },
  { label: 'TouchPoint Verification', icon: ShieldCheck, color: Colors.navyDark },
  { label: 'Subscriptions', icon: Settings, color: Colors.navyDark },
  { label: 'Admin Login', icon: Shield, color: '#0D9488' },
];

type AnimPhase = 'idle' | 'showFilter' | 'cursorToFilter' | 'filterOpens' | 'menuAppears' | 'cursorToInvite' | 'clickInvite' | 'done';

const PHASE_TIMINGS: Record<AnimPhase, number> = {
  idle: 800,
  showFilter: 600,
  cursorToFilter: 900,
  filterOpens: 400,
  menuAppears: 600,
  cursorToInvite: 1200,
  clickInvite: 800,
  done: 2000,
};

export default function GettingStartedTutorial() {
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [loopCount, setLoopCount] = useState<number>(0);

  const filterGlow = useRef(new Animated.Value(0)).current;
  const cursorX = useRef(new Animated.Value(CARD_WIDTH * 0.85)).current;
  const cursorY = useRef(new Animated.Value(CARD_HEIGHT * 0.15)).current;
  const cursorOpacity = useRef(new Animated.Value(0)).current;
  const cursorScale = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(-20)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const highlightScale = useRef(new Animated.Value(0.95)).current;
  const filterIconScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const stepTextOpacity = useRef(new Animated.Value(0)).current;
  const [stepText, setStepText] = useState<string>('');
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAnims = useCallback(() => {
    filterGlow.setValue(0);
    cursorX.setValue(CARD_WIDTH * 0.85);
    cursorY.setValue(CARD_HEIGHT * 0.15);
    cursorOpacity.setValue(0);
    cursorScale.setValue(1);
    menuOpacity.setValue(0);
    menuTranslateY.setValue(-20);
    highlightOpacity.setValue(0);
    highlightScale.setValue(0.95);
    filterIconScale.setValue(1);
    overlayOpacity.setValue(0);
    stepTextOpacity.setValue(0);
    setStepText('');
  }, [filterGlow, cursorX, cursorY, cursorOpacity, cursorScale, menuOpacity, menuTranslateY, highlightOpacity, highlightScale, filterIconScale, overlayOpacity, stepTextOpacity]);

  const runPhase = useCallback((p: AnimPhase) => {
    console.log('[GettingStarted] Phase:', p);
    setPhase(p);

    switch (p) {
      case 'idle':
        resetAnims();
        setStepText('Tap the filter icon to get started');
        Animated.timing(stepTextOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        phaseTimerRef.current = setTimeout(() => runPhase('showFilter'), PHASE_TIMINGS.idle);
        break;

      case 'showFilter':
        Animated.loop(
          Animated.sequence([
            Animated.timing(filterGlow, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(filterGlow, { toValue: 0.3, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
          { iterations: 2 }
        ).start();
        phaseTimerRef.current = setTimeout(() => runPhase('cursorToFilter'), PHASE_TIMINGS.showFilter);
        break;

      case 'cursorToFilter':
        Animated.timing(cursorOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        Animated.parallel([
          Animated.timing(cursorX, { toValue: 30, duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
          Animated.timing(cursorY, { toValue: 18, duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
        ]).start();
        phaseTimerRef.current = setTimeout(() => runPhase('filterOpens'), PHASE_TIMINGS.cursorToFilter);
        break;

      case 'filterOpens':
        Animated.sequence([
          Animated.timing(cursorScale, { toValue: 0.7, duration: 150, useNativeDriver: true }),
          Animated.timing(cursorScale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
        Animated.sequence([
          Animated.timing(filterIconScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
          Animated.timing(filterIconScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        setStepText('The filter menu opens');
        Animated.timing(stepTextOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        phaseTimerRef.current = setTimeout(() => runPhase('menuAppears'), PHASE_TIMINGS.filterOpens);
        break;

      case 'menuAppears':
        Animated.parallel([
          Animated.timing(menuOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(menuTranslateY, { toValue: 0, speed: 14, bounciness: 6, useNativeDriver: true }),
        ]).start();
        phaseTimerRef.current = setTimeout(() => runPhase('cursorToInvite'), PHASE_TIMINGS.menuAppears);
        break;

      case 'cursorToInvite': {
        setStepText('Select "Invite new BizCom members"');
        Animated.timing(stepTextOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        const targetY = 52 + 3 * 28 + 14;
        Animated.parallel([
          Animated.timing(cursorX, { toValue: CARD_WIDTH * 0.55, duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
          Animated.timing(cursorY, { toValue: targetY, duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
        ]).start();
        phaseTimerRef.current = setTimeout(() => runPhase('clickInvite'), PHASE_TIMINGS.cursorToInvite);
        break;
      }

      case 'clickInvite':
        Animated.sequence([
          Animated.timing(cursorScale, { toValue: 0.7, duration: 120, useNativeDriver: true }),
          Animated.timing(cursorScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        Animated.parallel([
          Animated.timing(highlightOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(highlightScale, { toValue: 1, speed: 18, bounciness: 4, useNativeDriver: true }),
        ]).start();
        phaseTimerRef.current = setTimeout(() => runPhase('done'), PHASE_TIMINGS.clickInvite);
        break;

      case 'done':
        setStepText('You\'re all set! Invite your network');
        Animated.timing(stepTextOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        phaseTimerRef.current = setTimeout(() => {
          if (isPlaying) {
            setLoopCount(prev => prev + 1);
            runPhase('idle');
          }
        }, PHASE_TIMINGS.done);
        break;
    }
  }, [resetAnims, filterGlow, cursorX, cursorY, cursorOpacity, cursorScale, menuOpacity, menuTranslateY, highlightOpacity, highlightScale, filterIconScale, overlayOpacity, stepTextOpacity, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      runPhase('idle');
    }
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopCount]);

  const handleReplay = useCallback(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    resetAnims();
    setIsPlaying(true);
    setLoopCount(prev => prev + 1);
  }, [resetAnims]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    } else {
      setIsPlaying(true);
      resetAnims();
      setLoopCount(prev => prev + 1);
    }
  }, [isPlaying, resetAnims]);

  return (
    <View style={styles.container} testID="getting-started-tutorial">
      <View style={styles.titleBar}>
        <View style={styles.titleLeft}>
          <View style={styles.titleIconWrap}>
            <Sparkles size={14} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.titleText}>Getting Started</Text>
            <Text style={styles.subtitleText}>How to invite members</Text>
          </View>
        </View>
        <View style={styles.titleActions}>
          <Pressable style={styles.replayBtn} onPress={handleReplay} hitSlop={8}>
            <RotateCcw size={14} color={Colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.playBtn} onPress={handleTogglePlay} hitSlop={8}>
            <Play size={14} color={isPlaying ? '#10B981' : Colors.textSecondary} fill={isPlaying ? '#10B981' : 'none'} />
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <LinearGradient
          colors={['#1B2A4A', '#2C3E5A', '#1B2A4A']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.mockHeader}>
          <Animated.View style={[styles.mockFilterBtn, { transform: [{ scale: filterIconScale }] }]}>
            <SlidersHorizontal size={14} color="#FFFFFF" />
            <Animated.View style={[styles.filterGlow, { opacity: filterGlow }]} />
          </Animated.View>
          <View style={styles.mockHeaderCenter}>
            <Text style={styles.mockAppName}>TouchPoint</Text>
            <Text style={styles.mockSubName}>Manage my Business</Text>
          </View>
          <View style={styles.mockAvatar} />
        </View>

        <Animated.View style={[styles.menuOverlayBg, { opacity: overlayOpacity }]} pointerEvents="none" />

        <Animated.View
          style={[
            styles.menuPanel,
            {
              opacity: menuOpacity,
              transform: [{ translateY: menuTranslateY }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.menuPanelHeader}>
            <Text style={styles.menuPanelTitle}>Navigate</Text>
          </View>
          {MENU_ITEMS.map((item, idx) => {
            const isInvite = item.highlight;
            return (
              <Animated.View
                key={item.label}
                style={[
                  styles.menuRow,
                  idx === MENU_ITEMS.length - 1 && styles.menuRowLast,
                  isInvite && {
                    opacity: highlightOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1],
                    }),
                    transform: [{ scale: isInvite ? highlightScale : 1 }],
                  },
                ]}
              >
                {isInvite && (
                  <Animated.View style={[styles.menuRowHighlight, { opacity: highlightOpacity }]} />
                )}
                <View style={[styles.menuRowIcon, isInvite && (phase === 'clickInvite' || phase === 'done') && styles.menuRowIconHighlighted]}>
                  <item.icon size={10} color={item.color} />
                </View>
                <Text
                  style={[
                    styles.menuRowLabel,
                    isInvite && (phase === 'clickInvite' || phase === 'done') && styles.menuRowLabelHighlighted,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <ChevronRight size={8} color="rgba(160,170,187,0.6)" />
              </Animated.View>
            );
          })}
        </Animated.View>

        <Animated.View
          style={[
            styles.cursor,
            {
              opacity: cursorOpacity,
              transform: [
                { translateX: cursorX },
                { translateY: cursorY },
                { scale: cursorScale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.cursorShadow} />
          <MousePointer2 size={22} color="#FFFFFF" fill="rgba(255,255,255,0.3)" />
        </Animated.View>

        <View style={styles.stepTextContainer}>
          <Animated.View style={[styles.stepTextBg, { opacity: stepTextOpacity }]}>
            <Text style={styles.stepTextValue}>{stepText}</Text>
          </Animated.View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressDots}>
          {['idle', 'cursorToFilter', 'menuAppears', 'clickInvite', 'done'].map((p, i) => {
            const phases: AnimPhase[] = ['idle', 'showFilter', 'cursorToFilter', 'filterOpens', 'menuAppears', 'cursorToInvite', 'clickInvite', 'done'];
            const currentIdx = phases.indexOf(phase);
            const dotPhases: AnimPhase[] = ['idle', 'cursorToFilter', 'menuAppears', 'clickInvite', 'done'];
            const dotIdx = phases.indexOf(dotPhases[i]);
            const isActive = currentIdx >= dotIdx;
            return (
              <View
                key={p}
                style={[styles.progressDot, isActive && styles.progressDotActive]}
              />
            );
          })}
        </View>
        <Text style={styles.footerHint}>Auto-playing tutorial</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  mockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 5,
  },
  mockFilterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    overflow: 'visible',
  },
  filterGlow: {
    position: 'absolute' as const,
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.4)',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  mockHeaderCenter: {
    alignItems: 'center',
  },
  mockAppName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  mockSubName: {
    fontSize: 8,
    fontWeight: '400' as const,
    color: 'rgba(255,215,0,0.7)',
    marginTop: 1,
  },
  mockAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  menuOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 8,
  },
  menuPanel: {
    position: 'absolute' as const,
    top: 46,
    left: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuPanelHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    marginBottom: 2,
  },
  menuPanelTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
  },
  menuRowIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  menuRowIconHighlighted: {
    backgroundColor: '#D1FAE5',
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: '500' as const,
    color: Colors.text,
    letterSpacing: 0.05,
  },
  menuRowLabelHighlighted: {
    color: '#059669',
    fontWeight: '700' as const,
  },
  cursor: {
    position: 'absolute' as const,
    zIndex: 20,
    width: 22,
    height: 22,
  },
  cursorShadow: {
    position: 'absolute' as const,
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  stepTextContainer: {
    position: 'absolute' as const,
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  stepTextBg: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepTextValue: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center' as const,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 5,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
  },
  progressDotActive: {
    width: 16,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  footerHint: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.1,
  },
});
