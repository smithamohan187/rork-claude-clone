import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  Building2,
  Users,
  UserPlus,
  Send,
  ShieldCheck,
  Gift,
  ArrowDown,
  Play,
  RotateCcw,
  Sparkles,
  EyeOff,
  CheckCircle,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 24;

const STEPS = [
  {
    id: 'send',
    icon: Building2,
    label: 'Business',
    action: 'Sends referral request',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  {
    id: 'member',
    icon: Users,
    label: 'BizCom Member',
    action: 'Forwards anonymized request',
    color: '#00B246',
    bgColor: '#E8F5EE',
    borderColor: '#E8F5EE',
  },
  {
    id: 'friend',
    icon: UserPlus,
    label: 'Friend',
    action: 'Accepts & requests to join',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  {
    id: 'approve',
    icon: ShieldCheck,
    label: 'Business',
    action: 'Approves the request',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  {
    id: 'reward',
    icon: Gift,
    label: 'Everyone',
    action: 'Parties are rewarded!',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
];

export default function ReferralProcessInfographic() {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [loopCount, setLoopCount] = useState<number>(0);

  const stepAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const arrowAnims = useRef(STEPS.slice(0, -1).map(() => new Animated.Value(0))).current;
  const pulseAnims = useRef(STEPS.map(() => new Animated.Value(1))).current;
  const glowAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAnims = useCallback(() => {
    stepAnims.forEach(a => a.setValue(0));
    arrowAnims.forEach(a => a.setValue(0));
    pulseAnims.forEach(a => a.setValue(1));
    glowAnims.forEach(a => a.setValue(0));
    setActiveStep(-1);
  }, [stepAnims, arrowAnims, pulseAnims, glowAnims]);

  const animateStep = useCallback((index: number) => {
    if (index >= STEPS.length) {
      Animated.parallel(
        pulseAnims.map(a =>
          Animated.loop(
            Animated.sequence([
              Animated.timing(a, { toValue: 1.05, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
              Animated.timing(a, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]),
            { iterations: 3 }
          )
        )
      ).start();

      timerRef.current = setTimeout(() => {
        if (isPlaying) {
          setLoopCount(prev => prev + 1);
        }
      }, 4000);
      return;
    }

    setActiveStep(index);

    Animated.parallel([
      Animated.spring(stepAnims[index], { toValue: 1, speed: 10, bounciness: 8, useNativeDriver: true }),
      Animated.timing(glowAnims[index], { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      if (index < STEPS.length - 1) {
        Animated.timing(arrowAnims[index], { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(() => {
          timerRef.current = setTimeout(() => animateStep(index + 1), 200);
        });
      } else {
        animateStep(index + 1);
      }
    });
  }, [stepAnims, arrowAnims, pulseAnims, glowAnims, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      resetAnims();
      timerRef.current = setTimeout(() => animateStep(0), 600);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopCount]);

  const handleReplay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    resetAnims();
    setIsPlaying(true);
    setLoopCount(prev => prev + 1);
  }, [resetAnims]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      setIsPlaying(true);
      resetAnims();
      setLoopCount(prev => prev + 1);
    }
  }, [isPlaying, resetAnims]);

  return (
    <View style={styles.container} testID="referral-process-infographic">
      <View style={styles.titleBar}>
        <View style={styles.titleLeft}>
          <View style={styles.titleIconWrap}>
            <Send size={13} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.titleText}>Referral Process</Text>
            <Text style={styles.subtitleText}>How referrals work in BizCom</Text>
          </View>
        </View>
        <View style={styles.titleActions}>
          <Pressable style={styles.replayBtn} onPress={handleReplay} hitSlop={8}>
            <RotateCcw size={14} color={Colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.playBtn} onPress={handleTogglePlay} hitSlop={8}>
            <Play size={14} color={isPlaying ? '#3B82F6' : Colors.textSecondary} fill={isPlaying ? '#3B82F6' : 'none'} />
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <LinearGradient
          colors={['#F8FAFC', '#EEF2FF', '#F0F9FF']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>How Referrals Work</Text>
          <View style={styles.cardBadge}>
            <Sparkles size={10} color="#F59E0B" />
            <Text style={styles.cardBadgeText}>5 Steps</Text>
          </View>
        </View>

        <View style={styles.flowContainer}>
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const scale = Animated.multiply(stepAnims[index], pulseAnims[index]);

            return (
              <View key={step.id} style={styles.stepRow}>
                <Animated.View
                  style={[
                    styles.stepCard,
                    {
                      borderColor: step.borderColor,
                      backgroundColor: step.bgColor,
                      opacity: stepAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.25, 1],
                      }),
                      transform: [
                        { scale },
                        {
                          translateX: stepAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Animated.View style={[styles.stepGlow, { backgroundColor: step.color, opacity: glowAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }) }]} />

                  <View style={styles.stepNumber}>
                    <Text style={[styles.stepNumberText, { color: step.color }]}>{index + 1}</Text>
                  </View>

                  <View style={[styles.stepIconCircle, { backgroundColor: step.color }]}>
                    <StepIcon size={16} color="#FFFFFF" />
                  </View>

                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepLabel, { color: step.color }]}>{step.label}</Text>
                    <Text style={styles.stepAction}>{step.action}</Text>
                  </View>

                  {index === activeStep && (
                    <View style={styles.activeIndicator}>
                      <View style={[styles.activeDot, { backgroundColor: step.color }]} />
                    </View>
                  )}

                  {step.id === 'member' && (
                    <View style={styles.anonymizedBadge}>
                      <EyeOff size={8} color="#00B246" />
                      <Text style={styles.anonymizedText}>Anonymous</Text>
                    </View>
                  )}

                  {step.id === 'reward' && (
                    <View style={styles.rewardBadge}>
                      <CheckCircle size={8} color="#10B981" />
                      <Text style={styles.rewardText}>Complete</Text>
                    </View>
                  )}
                </Animated.View>

                {index < STEPS.length - 1 && (
                  <Animated.View
                    style={[
                      styles.arrowContainer,
                      {
                        opacity: arrowAnims[index],
                        transform: [{
                          scale: arrowAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        }],
                      },
                    ]}
                  >
                    <View style={[styles.arrowLine, { backgroundColor: STEPS[index + 1].color }]} />
                    <ArrowDown size={12} color={STEPS[index + 1].color} />
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressDots}>
          {STEPS.map((step, i) => {
            const isActive = i <= activeStep;
            return (
              <View
                key={step.id}
                style={[
                  styles.progressDot,
                  isActive && { width: 14, backgroundColor: step.color, borderRadius: 3 },
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.footerHint}>Auto-playing infographic</Text>
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
    backgroundColor: '#EFF6FF',
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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.navyDark,
    letterSpacing: -0.3,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#D97706',
  },
  flowContainer: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 6,
  },
  stepRow: {
    alignItems: 'center',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  stepGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '900' as const,
  },
  stepIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepInfo: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  stepAction: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.text,
    marginTop: 1,
  },
  activeIndicator: {
    position: 'absolute' as const,
    right: 12,
    top: '50%' as unknown as number,
    marginTop: -4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  anonymizedBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
  },
  anonymizedText: {
    fontSize: 7,
    fontWeight: '700' as const,
    color: '#00B246',
  },
  rewardBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  rewardText: {
    fontSize: 7,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  arrowLine: {
    width: 2,
    height: 8,
    borderRadius: 1,
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
  footerHint: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.1,
  },
});
