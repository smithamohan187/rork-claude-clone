import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Ticket,
  Tag,
  Gift,
  Clock,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCoupons, StoredCoupon } from '@/contexts/CouponContext';

const PURPLE = '#1A5C35';
const PURPLE_DARK = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F5FC';

function getRewardIcon(type: StoredCoupon['rewardType']) {
  switch (type) {
    case 'discount': return <Tag size={20} color={PURPLE} />;
    case 'free_item': return <Gift size={20} color={PURPLE} />;
    case 'voucher': return <Ticket size={20} color={PURPLE} />;
  }
}

function getStatusConfig(status: StoredCoupon['status']) {
  switch (status) {
    case 'active':
      return { label: 'Active', bg: '#ECFDF5', color: '#059669', icon: <CheckCircle size={12} color="#059669" /> };
    case 'expired':
      return { label: 'Expired', bg: '#FEF2F2', color: '#DC2626', icon: <XCircle size={12} color="#DC2626" /> };
    case 'used':
      return { label: 'Used', bg: '#F3F4F6', color: '#6B7280', icon: <AlertCircle size={12} color="#6B7280" /> };
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function TimerBanner({ coupons }: { coupons: StoredCoupon[] }) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCoupons = coupons.filter(
    (c) => c.status !== 'used' && c.expiresAt > now
  );
  if (activeCoupons.length === 0) return null;

  const soonestExpiry = Math.min(...activeCoupons.map((c) => c.expiresAt));
  const remaining = soonestExpiry - now;
  const isUrgent = remaining < 5 * 60 * 1000;

  return (
    <View
      style={[
        bannerStyles.container,
        { backgroundColor: isUrgent ? '#FEE2E2' : '#FEF3C7' },
      ]}
    >
      <Clock size={14} color={isUrgent ? '#DC2626' : '#92400E'} />
      <Text
        style={[
          bannerStyles.text,
          { color: isUrgent ? '#DC2626' : '#92400E' },
        ]}
      >
        {isUrgent
          ? 'Hurry \u2014 less than 5 minutes remaining!'
          : 'Use this coupon within 30 minutes or it will expire'}
      </Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
});

function CouponCard({ coupon, onOpen }: { coupon: StoredCoupon; onOpen: () => void }) {
  const [now, setNow] = useState<number>(Date.now());
  const [copied, setCopied] = useState<boolean>(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const isActive = coupon.status !== 'used' && coupon.expiresAt > Date.now();
  const effectiveStatus: StoredCoupon['status'] =
    coupon.status === 'used' ? 'used' : isActive ? 'active' : 'expired';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (effectiveStatus !== 'active') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [effectiveStatus]);

  const remaining = coupon.expiresAt - now;
  const statusCfg = getStatusConfig(effectiveStatus);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(coupon.couponCode);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('[Coupons] Copied code:', coupon.couponCode);
    } catch (e) {
      console.log('[Coupons] Copy failed:', e);
    }
  }, [coupon.couponCode]);

  return (
    <Animated.View style={[cardStyles.wrapper, { opacity: fadeAnim }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpen}
        testID={`open-coupon-${coupon.id}`}
        style={[cardStyles.card, effectiveStatus !== 'active' && cardStyles.cardInactive]}
      >
        <View style={cardStyles.dashTop} />

        <View style={cardStyles.content}>
          <View style={cardStyles.topRow}>
            <View style={cardStyles.iconWrap}>
              {getRewardIcon(coupon.rewardType)}
            </View>
            <View style={cardStyles.topInfo}>
              <Text style={cardStyles.businessName} numberOfLines={1}>
                {coupon.businessName}
              </Text>
              <Text style={cardStyles.rewardTitle} numberOfLines={1}>
                {coupon.rewardTitle}
              </Text>
            </View>
            <View style={[cardStyles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              {statusCfg.icon}
              <Text style={[cardStyles.statusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>

          <Text style={cardStyles.rewardDesc} numberOfLines={2}>
            {coupon.rewardDescription}
          </Text>

          <View style={cardStyles.codeRow}>
            <View style={cardStyles.codeBox}>
              <Text style={[cardStyles.codeText, effectiveStatus !== 'active' && { opacity: 0.5 }]}>
                {coupon.couponCode}
              </Text>
            </View>
            <TouchableOpacity
              style={[cardStyles.copyBtn, copied && cardStyles.copyBtnDone]}
              activeOpacity={0.7}
              onPress={handleCopy}
            >
              {copied ? (
                <CheckCircle size={14} color="#fff" />
              ) : (
                <Copy size={14} color="#fff" />
              )}
              <Text style={cardStyles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          <View style={cardStyles.footer}>
            {effectiveStatus === 'active' && remaining > 0 ? (
              <View style={cardStyles.timerRow}>
                <Clock size={13} color={remaining < 300000 ? '#DC2626' : '#F59E0B'} />
                <Text style={[
                  cardStyles.timerText,
                  { color: remaining < 300000 ? '#DC2626' : '#F59E0B' },
                ]}>
                  Expires in {formatCountdown(remaining)}
                </Text>
              </View>
            ) : (
              <View style={cardStyles.timerRow}>
                <Clock size={13} color="#B0AEBC" />
                <Text style={cardStyles.dateText}>
                  {effectiveStatus === 'expired' ? 'Expired' : 'Used'}
                </Text>
              </View>
            )}
            <Text style={cardStyles.dateText}>
              {formatDate(coupon.createdAt)}
            </Text>
          </View>
        </View>

        <View style={cardStyles.dashBottom} />

        <View style={cardStyles.notchLeft} />
        <View style={cardStyles.notchRight} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    position: 'relative',
  },
  cardInactive: {
    opacity: 0.7,
  },
  dashTop: {
    height: 2,
    borderStyle: 'dashed' as const,
    borderTopWidth: 2,
    borderColor: PURPLE + '25',
    marginHorizontal: 16,
    marginTop: 0,
  },
  dashBottom: {
    height: 2,
    borderStyle: 'dashed' as const,
    borderTopWidth: 2,
    borderColor: PURPLE + '25',
    marginHorizontal: 16,
  },
  content: {
    padding: 18,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8E8E9A',
    letterSpacing: 0.2,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#1A1730',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  rewardDesc: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#1A5C35',
    lineHeight: 18,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeBox: {
    flex: 1,
    backgroundColor: PURPLE_FAINT,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PURPLE + '15',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: PURPLE,
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 5,
  },
  copyBtnDone: {
    backgroundColor: '#059669',
  },
  copyText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#B0AEBC',
  },
  notchLeft: {
    position: 'absolute',
    left: -10,
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PURPLE_FAINT,
    marginTop: -10,
  },
  notchRight: {
    position: 'absolute',
    right: -10,
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PURPLE_FAINT,
    marginTop: -10,
  },
});

export default function MyCouponsScreen() {
  const router = useRouter();
  const { getSortedCoupons, loaded } = useCoupons();
  const [coupons, setCoupons] = useState<StoredCoupon[]>([]);

  useEffect(() => {
    if (loaded) {
      setCoupons(getSortedCoupons());
    }
  }, [loaded, getSortedCoupons]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCoupons(getSortedCoupons());
    }, 10000);
    return () => clearInterval(interval);
  }, [getSortedCoupons]);

  const activeCount = coupons.filter(
    (c) => c.status !== 'used' && c.expiresAt > Date.now()
  ).length;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            testID="coupons-back-btn"
          >
            <ArrowLeft size={22} color="#1A1730" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ticket size={18} color={PURPLE} />
            <Text style={styles.headerTitle}>My Coupons</Text>
          </View>
          {activeCount > 0 && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{activeCount}</Text>
            </View>
          )}
          {activeCount === 0 && <View style={{ width: 36 }} />}
        </View>
      </SafeAreaView>

      {coupons.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ticket size={48} color={PURPLE + '40'} />
          </View>
          <Text style={styles.emptyTitle}>No coupons yet</Text>
          <Text style={styles.emptyDesc}>
            Redeem your points to get coupons.{'\n'}They'll appear here for easy access.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            activeOpacity={0.75}
            onPress={() => router.back()}
          >
            <Gift size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Go to Rewards</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <TimerBanner coupons={coupons} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
            </Text>
            {activeCount > 0 && (
              <View style={styles.summaryActivePill}>
                <View style={styles.greenDot} />
                <Text style={styles.summaryActiveText}>{activeCount} active</Text>
              </View>
            )}
          </View>
          {coupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onOpen={() => router.push(`/coupon/${coupon.id}` as never)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE_FAINT,
  },
  safeTop: {
    backgroundColor: '#fff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFF5',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F5F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#1A1730',
    letterSpacing: -0.4,
  },
  activeBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#fff',
  },
  scroll: {
    paddingTop: 14,
    paddingBottom: 30,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A5C35',
  },
  summaryActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  summaryActiveText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#059669',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#1A1730',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E9A',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
