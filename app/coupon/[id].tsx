import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Platform,
  AppState,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  Ticket,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { differenceInSeconds, format } from 'date-fns';
import { useCoupons, StoredCoupon } from '@/contexts/CouponContext';
import QRCodeView from '@/components/coupons/QRCodeView';

const PURPLE = '#1A5C35';
const PURPLE_DARK = '#1A5C35';
const AMBER = '#F59E0B';
const RED = '#EF4444';
const GREEN = '#10B981';
const MUTED = '#8E8E9A';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatCountdown(secs: number): string {
  if (secs <= 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      key: i,
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      rot: new Animated.Value(0),
      angle: Math.random() * Math.PI * 2,
      dist: 120 + Math.random() * 120,
      color: ['#F59E0B', '#10B981', '#1A5C35', '#EC4899', '#0EA5E9'][i % 5],
      size: 6 + Math.round(Math.random() * 6),
    }))
  ).current;

  useEffect(() => {
    const anims = pieces.map((p) => {
      const dx = Math.cos(p.angle) * p.dist;
      const dy = Math.sin(p.angle) * p.dist;
      return Animated.parallel([
        Animated.timing(p.x, {
          toValue: dx,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: dy,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(p.rot, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });
    Animated.parallel(anims).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {pieces.map((p) => {
          const rotate = p.rot.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '540deg'],
          });
          return (
            <Animated.View
              key={p.key}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: 2,
                backgroundColor: p.color,
                opacity: p.opacity,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { rotate },
                ],
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function SuccessOverlay({
  visible,
  rewardTitle,
  businessName,
  onClose,
}: {
  visible: boolean;
  rewardTitle: string;
  businessName: string;
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const dash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0);
    dash.setValue(0);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
      Animated.timing(dash, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [visible, onClose, scale, dash]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={successStyles.backdrop}
      >
        <Confetti />
        <Animated.View
          style={[
            successStyles.checkWrap,
            { transform: [{ scale }] },
          ]}
        >
          <Animated.View style={{ opacity: dash }}>
            <CheckCircle2 size={72} color="#fff" fill={GREEN} strokeWidth={2.5} />
          </Animated.View>
        </Animated.View>
        <Text style={successStyles.title}>Reward Redeemed!</Text>
        <Text style={successStyles.reward}>{rewardTitle}</Text>
        <Text style={successStyles.biz}>{businessName}</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const successStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  checkWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  reward: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  biz: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
});

function Initials({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PURPLE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size / 2.5 }}>
        {initials || 'TP'}
      </Text>
    </View>
  );
}

export default function CouponDisplayScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById } = useCoupons();
  const prevUsedRef = useRef<boolean>(false);

  const [coupon, setCoupon] = useState<StoredCoupon | undefined>(() =>
    id ? getById(id) : undefined
  );
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const refresh = useCallback(() => {
    if (!id) return;
    const c = getById(id);
    setCoupon(c);
  }, [id, getById]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(Date.now());
      refresh();
    }, 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refresh();
        setNowTs(Date.now());
      }
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    let originalBrightness: number | null = null;
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Brightness.requestPermissionsAsync();
          if (status === 'granted') {
            originalBrightness = await Brightness.getBrightnessAsync();
            await Brightness.setBrightnessAsync(1);
          }
          await activateKeepAwakeAsync('coupon');
        }
      } catch (e) {
        console.log('[CouponDisplay] brightness/keepawake err', e);
      }
    })();
    return () => {
      (async () => {
        try {
          if (Platform.OS !== 'web') {
            if (originalBrightness !== null) {
              await Brightness.setBrightnessAsync(originalBrightness);
            } else {
              await Brightness.restoreSystemBrightnessAsync();
            }
            deactivateKeepAwake('coupon');
          }
        } catch (e) {
          console.log('[CouponDisplay] restore err', e);
        }
      })();
    };
  }, []);

  useEffect(() => {
    if (coupon?.status === 'used' && !prevUsedRef.current) {
      prevUsedRef.current = true;
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined
        );
      }
      setShowSuccess(true);
    }
  }, [coupon?.status]);

  const secondsLeft = useMemo(() => {
    if (!coupon) return 0;
    return Math.max(0, differenceInSeconds(new Date(coupon.expiresAt), new Date(nowTs)));
  }, [coupon, nowTs]);

  const isUrgent = secondsLeft > 0 && secondsLeft < 300;

  useEffect(() => {
    if (!isUrgent) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isUrgent, pulseAnim]);

  if (!coupon) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#1A1730', fontSize: 16, fontWeight: '600' }}>
          Coupon not found
        </Text>
        <TouchableOpacity
          style={[styles.backToRewardsBtn, { marginTop: 16 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backToRewardsText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const effectiveStatus = coupon.status;
  const isUsed = effectiveStatus === 'used';
  const isExpired = effectiveStatus === 'expired' || (secondsLeft === 0 && !isUsed);

  const timerColor = isUrgent ? RED : secondsLeft < 600 ? AMBER : GREEN;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: PURPLE }}>
        <View style={styles.headerStrip}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="coupon-back"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={styles.wordmarkRow}>
              <Sparkles size={14} color="#fff" />
              <Text style={styles.wordmark}>TouchPoint</Text>
            </View>
            <Text style={styles.headerSubLabel}>SUBSCRIBER REWARD</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bizBlock}>
          <Initials name={coupon.businessName} size={56} />
          <Text style={styles.bizName} numberOfLines={1}>
            {coupon.businessName}
          </Text>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>Reward Coupon</Text>
          </View>
        </View>

        <View style={styles.rewardBlock}>
          <Text style={styles.rewardTitle}>{coupon.rewardTitle}</Text>
          <Text style={styles.rewardDesc} numberOfLines={2}>
            {coupon.rewardDescription}
          </Text>
          {coupon.pointsDeducted > 0 ? (
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsBadgeText}>−{coupon.pointsDeducted} pts</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.showLabel}>Show this to store staff</Text>

        <View style={styles.qrCard}>
          <View style={styles.qrInner}>
            <QRCodeView
              value={coupon.qrPayload}
              size={220}
              color="#1a1a2e"
              backgroundColor="#FFFFFF"
              logoSize={44}
              logoElement={
                <View style={styles.qrLogoWrap}>
                  <Ticket size={22} color={PURPLE} />
                </View>
              }
            />

            {isUsed ? (
              <>
                <View style={styles.usedDim} pointerEvents="none" />
                <View style={styles.ribbonWrap} pointerEvents="none">
                  <View style={styles.ribbon}>
                    <Text style={styles.ribbonText}>REDEEMED ✓</Text>
                  </View>
                </View>
              </>
            ) : null}

            {isExpired && !isUsed ? (
              <View style={styles.expiredDim} pointerEvents="none">
                <Text style={styles.expiredOverlayText}>EXPIRED</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.codeBlock}>
            <Text style={styles.codeText} selectable testID="coupon-code">
              {coupon.couponCode}
            </Text>
            <Text style={styles.codeLabel}>Coupon Code</Text>
          </View>
        </View>

        {!isUsed && !isExpired ? (
          <Animated.View
            style={[
              styles.timerBlock,
              { opacity: pulseAnim },
            ]}
          >
            {isUrgent ? (
              <View style={styles.urgentBanner}>
                <Text style={styles.urgentBannerText}>
                  ⚠️ Coupon expiring soon! Show to staff now.
                </Text>
              </View>
            ) : null}
            <Text style={[styles.timerDigits, { color: timerColor }]}>
              {formatCountdown(secondsLeft)}
            </Text>
            <Text style={styles.timerLabel}>remaining</Text>
          </Animated.View>
        ) : null}

        {isUsed ? (
          <View style={styles.usedBlock}>
            <CheckCircle2 size={20} color={GREEN} />
            <Text style={styles.usedText}>
              Used on {coupon.usedAt ? format(new Date(coupon.usedAt), 'dd MMM yyyy, hh:mm a') : '—'}
            </Text>
          </View>
        ) : null}

        {isExpired && !isUsed ? (
          <View style={styles.expiredBlock}>
            <Clock size={20} color={RED} />
            <Text style={styles.expiredTitle}>Coupon Expired</Text>
            <Text style={styles.expiredSub}>
              This coupon is no longer valid. Your points have not been refunded.
            </Text>
            <TouchableOpacity
              style={styles.backToRewardsBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
              testID="back-to-rewards"
            >
              <Text style={styles.backToRewardsText}>Back to Rewards</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.tearLine} />

        <View style={styles.chipsRow}>
          <View style={styles.chipPill}>
            <Text style={styles.chipText}>📱 Scan QR</Text>
          </View>
          <View style={styles.chipPill}>
            <Text style={styles.chipText}>💬 Or type code</Text>
          </View>
          <View style={styles.chipPill}>
            <Text style={styles.chipText}>✅ Get reward</Text>
          </View>
        </View>

        <Text style={styles.termsText}>
          Valid only at {coupon.businessName}. Single use only.
        </Text>
      </ScrollView>

      <SuccessOverlay
        visible={showSuccess}
        rewardTitle={coupon.rewardTitle}
        businessName={coupon.businessName}
        onClose={() => {
          setShowSuccess(false);
          router.replace('/(tabs)/rewards/coupons');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    backgroundColor: PURPLE,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bizBlock: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    gap: 10,
  },
  bizName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1730',
    letterSpacing: -0.3,
  },
  categoryChip: {
    backgroundColor: '#EDE9F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: PURPLE_DARK,
    letterSpacing: 0.3,
  },
  rewardBlock: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 18,
    gap: 8,
  },
  rewardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: PURPLE,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  rewardDesc: {
    fontSize: 13,
    color: '#1A5C35',
    textAlign: 'center',
    lineHeight: 19,
  },
  pointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  showLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: MUTED,
    textAlign: 'center',
    marginBottom: 10,
  },
  qrCard: {
    marginHorizontal: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E6E3F0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1A1730',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  qrInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#EDE9F6',
  },
  usedDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  ribbonWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbon: {
    backgroundColor: GREEN,
    paddingHorizontal: 28,
    paddingVertical: 8,
    transform: [{ rotate: '-35deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  ribbonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 3,
  },
  expiredDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredOverlayText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
  },
  codeBlock: {
    marginTop: 18,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1730',
    letterSpacing: 4,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  codeLabel: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  timerBlock: {
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 16,
  },
  urgentBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  urgentBannerText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  timerDigits: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  timerLabel: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  usedBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 20,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  usedText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
  },
  expiredBlock: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 32,
    gap: 8,
  },
  expiredTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1730',
  },
  expiredSub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  backToRewardsBtn: {
    marginTop: 14,
    backgroundColor: PURPLE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToRewardsText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  tearLine: {
    marginTop: 24,
    marginHorizontal: 24,
    borderTopWidth: 1,
    borderColor: '#E6E3F0',
    borderStyle: 'dashed',
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  chipPill: {
    backgroundColor: '#F4F3F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    color: '#1A5C35',
    fontWeight: '600',
  },
  termsText: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
});
