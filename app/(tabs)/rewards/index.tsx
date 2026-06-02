import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Shield,
  Crown,
  Gem,
  Diamond,
  ChevronRight,
  Gift,
  Ticket,
  Tag,
  UserPlus,
  Share2,
  Star,
  Zap,
  Trophy,
  Clock,
  X,
  Check,
  ArrowUpRight,
} from 'lucide-react-native';
import { useCoupons } from '@/contexts/CouponContext';
import { useAuth } from '@/contexts/AuthContext';
import { currentMemberFollowedBusinesses } from '@/mocks/data';
import type { MemberFollowedBusiness } from '@/mocks/data';
import {
  redeemableRewards,
  activityEvents,
  tierLadder,
} from '@/mocks/rewardsData';
import type { RedeemableReward, ActivityEvent, TierInfo } from '@/mocks/rewardsData';
import HeaderAvatarTrigger from '@/components/HeaderAvatarTrigger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PURPLE = '#1A5C35';
const PURPLE_DARK = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F5FC';

function getTierIcon(tierName: string, size: number, color: string) {
  switch (tierName) {
    case 'Bronze': return <Shield size={size} color={color} />;
    case 'Silver': return <Shield size={size} color={color} />;
    case 'Gold': return <Crown size={size} color={color} />;
    case 'Platinum': return <Gem size={size} color={color} />;
    case 'Diamond': return <Diamond size={size} color={color} />;
    default: return <Shield size={size} color={color} />;
  }
}

function getActivityIcon(type: ActivityEvent['type'], color: string) {
  switch (type) {
    case 'subscribe': return <Zap size={16} color={color} />;
    case 'referral': return <UserPlus size={16} color={color} />;
    case 'share': return <Share2 size={16} color={color} />;
    case 'review': return <Star size={16} color={color} />;
    case 'welcome': return <Gift size={16} color={color} />;
    case 'redeem': return <Ticket size={16} color={color} />;
    case 'milestone': return <Trophy size={16} color={color} />;
    default: return <Zap size={16} color={color} />;
  }
}

function getRewardTypeIcon(type: RedeemableReward['type']) {
  switch (type) {
    case 'discount': return <Tag size={20} color={PURPLE} />;
    case 'free_item': return <Gift size={20} color={PURPLE} />;
    case 'voucher': return <Ticket size={20} color={PURPLE} />;
  }
}

function TotalPointsCard({ totalPoints, currentTier, nextTier, pointsToNext }: {
  totalPoints: number;
  currentTier: TierInfo;
  nextTier: TierInfo | null;
  pointsToNext: number;
}) {
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim]);

  const progress = nextTier
    ? (totalPoints - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)
    : 1;
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={heroStyles.container}>
      <View style={heroStyles.purpleBg}>
        <View style={heroStyles.patternCircle1} />
        <View style={heroStyles.patternCircle2} />
        <View style={heroStyles.patternCircle3} />
        <View style={heroStyles.content}>
          <Text style={heroStyles.label}>Total Points</Text>
          <Text style={heroStyles.points}>{totalPoints.toLocaleString()}</Text>
          <Animated.View style={[heroStyles.tierBadge, { opacity: glowAnim, backgroundColor: currentTier.color + '30' }]}>
            {getTierIcon(currentTier.name, 16, '#fff')}
            <Text style={heroStyles.tierText}>{currentTier.name} Member</Text>
          </Animated.View>
          {nextTier && (
            <View style={heroStyles.progressSection}>
              <View style={heroStyles.progressBarBg}>
                <View style={[heroStyles.progressBarFill, { width: `${clampedProgress * 100}%` }]} />
              </View>
              <Text style={heroStyles.progressText}>
                {pointsToNext} pts to {nextTier.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  purpleBg: {
    backgroundColor: PURPLE,
    paddingVertical: 28,
    paddingHorizontal: 24,
    position: 'relative',
  },
  patternCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  patternCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  patternCircle3: {
    position: 'absolute',
    top: 10,
    right: 60,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  points: {
    fontSize: 48,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 54,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tierText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  progressSection: {
    width: '100%',
    marginTop: 18,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center' as const,
    marginTop: 8,
  },
});

function TierProgressRow({ currentTierName }: { currentTierName: string }) {
  const currentIdx = tierLadder.findIndex(t => t.name === currentTierName);

  return (
    <View style={tierStyles.container}>
      <Text style={tierStyles.sectionTitle}>Tier Progress</Text>
      <View style={tierStyles.row}>
        {tierLadder.map((tier, idx) => {
          const isActive = idx === currentIdx;
          const isPast = idx < currentIdx;
          const isLast = idx === tierLadder.length - 1;

          return (
            <View key={tier.name} style={tierStyles.tierItem}>
              <View style={tierStyles.nodeRow}>
                <View style={[
                  tierStyles.node,
                  isActive && { backgroundColor: tier.color, borderColor: tier.color },
                  isPast && { backgroundColor: tier.color, borderColor: tier.color, opacity: 0.5 },
                  !isActive && !isPast && { backgroundColor: '#E8E6EF', borderColor: '#E8E6EF' },
                ]}>
                  {getTierIcon(tier.name, isActive ? 14 : 11, isActive || isPast ? '#fff' : '#B0AEBC')}
                </View>
                {!isLast && (
                  <View style={[
                    tierStyles.line,
                    (isPast || isActive) && idx < currentIdx
                      ? { backgroundColor: tierLadder[idx + 1 <= currentIdx ? idx + 1 : idx].color + '60' }
                      : { backgroundColor: '#E8E6EF' },
                  ]} />
                )}
              </View>
              <Text style={[
                tierStyles.tierName,
                isActive && { color: tier.color, fontWeight: '700' as const },
              ]}>{tier.name}</Text>
              <Text style={tierStyles.tierThreshold}>{tier.threshold === 0 ? '0' : `${tier.threshold}`}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const tierStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1730',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierItem: {
    alignItems: 'center',
    flex: 1,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  node: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 1,
  },
  line: {
    position: 'absolute',
    height: 3,
    left: '55%',
    right: '-50%',
    top: 15,
    borderRadius: 2,
    zIndex: 0,
  },
  tierName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#8E8E9A',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  tierThreshold: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: '#B0AEBC',
    marginTop: 2,
  },
});

function BusinessPointCard({ biz, onRedeem }: {
  biz: MemberFollowedBusiness;
  onRedeem: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progress = Math.min(biz.pointsEarned / 1000, 1);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={bizStyles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`biz-points-${biz.businessId}`}
      >
        <Image source={{ uri: biz.businessAvatar }} style={bizStyles.avatar} />
        <View style={bizStyles.info}>
          <View style={bizStyles.nameRow}>
            <Text style={bizStyles.name} numberOfLines={1}>{biz.businessName}</Text>
            <View style={[bizStyles.tierPill, { backgroundColor: biz.tierColor + '18' }]}>
              <View style={[bizStyles.tierDot, { backgroundColor: biz.tierColor }]} />
              <Text style={[bizStyles.tierLabel, { color: biz.tierColor }]}>{biz.currentTier}</Text>
            </View>
          </View>
          <View style={bizStyles.progressRow}>
            <View style={bizStyles.progressBarBg}>
              <View style={[bizStyles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: biz.tierColor }]} />
            </View>
            <Text style={bizStyles.ptsText}>{biz.pointsEarned} pts</Text>
          </View>
        </View>
        <TouchableOpacity style={bizStyles.redeemBtn} activeOpacity={0.75} onPress={onRedeem}>
          <Gift size={13} color="#fff" />
          <Text style={bizStyles.redeemText}>Redeem</Text>
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}

const bizStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F0EFF5',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1A1730',
    flexShrink: 1,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: '#E8E6EF',
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ptsText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#1A1730',
    minWidth: 42,
    textAlign: 'right' as const,
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  redeemText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.2,
  },
});

function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <View style={actStyles.item}>
      <View style={[actStyles.iconCircle, { backgroundColor: event.accentColor + '15' }]}>
        {getActivityIcon(event.type, event.accentColor)}
      </View>
      <View style={actStyles.info}>
        <Text style={actStyles.title} numberOfLines={1}>{event.title}</Text>
        <Text style={actStyles.desc} numberOfLines={1}>{event.description}</Text>
      </View>
      <View style={actStyles.right}>
        <Text style={[actStyles.points, { color: event.points > 0 ? '#16A34A' : '#EF4444' }]}>
          +{event.points}
        </Text>
        <Text style={actStyles.time}>{event.timestamp}</Text>
      </View>
    </View>
  );
}

const actStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1A1730',
  },
  desc: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#8E8E9A',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  time: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#B0AEBC',
    marginTop: 2,
  },
});

function RedeemBottomSheet({ visible, businessId, businessName, onClose, onCouponGenerated }: {
  visible: boolean;
  businessId: string;
  businessName: string;
  onClose: () => void;
  onCouponGenerated: (coupon: { id: string }) => void;
}) {
  const router = useRouter();
  const { addCoupon, findActiveForReward } = useCoupons();
  const { currentUser } = useAuth();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [selectedReward, setSelectedReward] = useState<RedeemableReward | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const confirmSlideAnim = useRef(new Animated.Value(0)).current;
  const rewards = redeemableRewards[businessId] || [];

  useEffect(() => {
    if (visible) {
      setSelectedReward(null);
      setShowConfirmation(false);
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 4 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  useEffect(() => {
    if (showConfirmation) {
      Animated.spring(confirmSlideAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 4 }).start();
    } else {
      Animated.timing(confirmSlideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [showConfirmation, confirmSlideAnim]);

  const handleGeneratePress = useCallback(() => {
    if (!selectedReward) return;
    console.log('[Rewards] Showing confirmation for:', selectedReward.title);
    setShowConfirmation(true);
  }, [selectedReward]);

  const handleConfirmRedeem = useCallback(() => {
    if (!selectedReward) return;
    console.log('[Rewards] Confirmed redeem for:', selectedReward.title);

    const existing = findActiveForReward(selectedReward.id);
    if (existing) {
      console.log('[Rewards] Reusing existing active coupon', existing.couponCode);
      onCouponGenerated({ id: existing.id });
      setShowConfirmation(false);
      onClose();
      setTimeout(() => {
        router.push(`/coupon/${existing.id}` as never);
      }, 300);
      return;
    }

    const segA = Math.random().toString(36).slice(2, 6).toUpperCase();
    const segB = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `TP-${segA}-${segB}`;
    const expiresAt = Date.now() + selectedReward.expiryMinutes * 60 * 1000;
    const created = addCoupon({
      businessId,
      businessName,
      rewardId: selectedReward.id,
      rewardTitle: selectedReward.title,
      rewardDescription: selectedReward.description,
      rewardType: selectedReward.type,
      couponCode: code,
      pointsDeducted: selectedReward.pointsCost,
      customerName: currentUser?.name,
      expiresAt,
    });
    onCouponGenerated({ id: created.id });
    setShowConfirmation(false);
    onClose();
    setTimeout(() => {
      router.push(`/coupon/${created.id}` as never);
    }, 300);
  }, [selectedReward, businessId, businessName, onCouponGenerated, onClose, router, addCoupon, findActiveForReward, currentUser]);

  const handleCancelConfirm = useCallback(() => {
    console.log('[Rewards] User cancelled confirmation');
    setShowConfirmation(false);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const confirmTranslateY = confirmSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const confirmOverlayOpacity = confirmSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
        <View style={sheetStyles.wrapper}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
            <Animated.View style={[sheetStyles.overlay, { opacity: overlayOpacity }]} />
          </Pressable>
          <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY }] }]}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.header}>
              <View>
                <Text style={sheetStyles.headerTitle}>Redeem Rewards</Text>
                <Text style={sheetStyles.headerSub}>{businessName}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={sheetStyles.closeBtn} testID="close-redeem-sheet">
                <X size={20} color="#8E8E9A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={sheetStyles.rewardsList}>
              {rewards.map(reward => {
                const isSelected = selectedReward?.id === reward.id;
                return (
                  <TouchableOpacity
                    key={reward.id}
                    style={[sheetStyles.rewardCard, isSelected && sheetStyles.rewardCardSelected]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedReward(reward)}
                    testID={`reward-option-${reward.id}`}
                  >
                    <View style={[sheetStyles.rewardIcon, isSelected && { backgroundColor: PURPLE_LIGHT }]}>
                      {getRewardTypeIcon(reward.type)}
                    </View>
                    <View style={sheetStyles.rewardInfo}>
                      <Text style={sheetStyles.rewardTitle}>{reward.title}</Text>
                      <Text style={sheetStyles.rewardDesc}>{reward.description}</Text>
                    </View>
                    <View style={sheetStyles.rewardCost}>
                      <Text style={[sheetStyles.rewardCostNum, isSelected && { color: PURPLE }]}>{reward.pointsCost}</Text>
                      <Text style={sheetStyles.rewardCostLabel}>pts</Text>
                    </View>
                    {isSelected && (
                      <View style={sheetStyles.checkCircle}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {rewards.length === 0 && (
                <View style={sheetStyles.emptyRewards}>
                  <Text style={sheetStyles.emptyText}>No rewards available yet</Text>
                </View>
              )}
              <TouchableOpacity
                style={[sheetStyles.generateBtn, !selectedReward && sheetStyles.generateBtnDisabled]}
                activeOpacity={0.75}
                onPress={handleGeneratePress}
                disabled={!selectedReward}
                testID="generate-coupon-btn"
              >
                <Ticket size={16} color="#fff" />
                <Text style={sheetStyles.generateText}>Generate Coupon</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showConfirmation} transparent animationType="none" onRequestClose={() => {}}>
        <View style={sheetStyles.wrapper}>
          <Animated.View style={[sheetStyles.overlay, StyleSheet.absoluteFillObject, { opacity: confirmOverlayOpacity }]} />
          <Animated.View style={[confirmStyles.sheet, { transform: [{ translateY: confirmTranslateY }] }]}>
            <View style={confirmStyles.iconContainer}>
              <View style={confirmStyles.clockCircle}>
                <Clock size={32} color={PURPLE} />
              </View>
            </View>

            <Text style={confirmStyles.title}>Ready to redeem?</Text>

            <View style={confirmStyles.bodyContainer}>
              <Text style={confirmStyles.bodyLine}>Your coupon will be active for 30 minutes only.</Text>
              <Text style={confirmStyles.bodyLine}>The countdown starts the moment you confirm.</Text>
              <Text style={confirmStyles.bodyLine}>Only redeem when you are at the store and ready to use it right now.</Text>
            </View>

            <View style={confirmStyles.warningStrip}>
              <Text style={confirmStyles.warningText}>Points are deducted now. Unused coupons can't be refunded.</Text>
            </View>

            <View style={confirmStyles.buttonsContainer}>
              <TouchableOpacity
                style={confirmStyles.primaryBtn}
                activeOpacity={0.8}
                onPress={handleConfirmRedeem}
                testID="confirm-redeem-btn"
              >
                <Text style={confirmStyles.primaryBtnText}>Yes, I'm at the store — Redeem Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={confirmStyles.secondaryBtn}
                activeOpacity={0.8}
                onPress={handleCancelConfirm}
                testID="cancel-redeem-btn"
              >
                <Text style={confirmStyles.secondaryBtnText}>Not yet, go back</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const confirmStyles = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  clockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#1A1730',
    textAlign: 'center' as const,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  bodyContainer: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 6,
  },
  bodyLine: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#1A5C35',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  warningStrip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#92400E',
    textAlign: 'center' as const,
  },
  buttonsContainer: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D1D6',
    backgroundColor: '#fff',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1A5C35',
  },
});

const sheetStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0DEE6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFF5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#1A1730',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E9A',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0EFF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  rewardCardSelected: {
    borderColor: PURPLE,
    backgroundColor: PURPLE_FAINT,
  },
  rewardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0EFF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1A1730',
  },
  rewardDesc: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#8E8E9A',
    marginTop: 2,
  },
  rewardCost: {
    alignItems: 'center',
  },
  rewardCostNum: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#1A1730',
  },
  rewardCostLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#B0AEBC',
  },
  checkCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRewards: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8E8E9A',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
    gap: 8,
  },
  generateBtnDisabled: {
    backgroundColor: '#E8F5EE',
  },
  generateText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.2,
  },
});

export default function RewardsDashboard() {
  const router = useRouter();
  const { coupons } = useCoupons();
  const [redeemSheet, setRedeemSheet] = useState<{ visible: boolean; businessId: string; businessName: string }>({
    visible: false, businessId: '', businessName: '',
  });

  const totalPoints = useMemo(
    () => currentMemberFollowedBusinesses.reduce((sum, b) => sum + b.pointsEarned, 0),
    []
  );

  const currentTier = useMemo(() => {
    let tier = tierLadder[0];
    for (const t of tierLadder) {
      if (totalPoints >= t.threshold) tier = t;
    }
    return tier;
  }, [totalPoints]);

  const nextTier = useMemo(() => {
    const idx = tierLadder.findIndex(t => t.name === currentTier.name);
    return idx < tierLadder.length - 1 ? tierLadder[idx + 1] : null;
  }, [currentTier]);

  const pointsToNext = useMemo(
    () => nextTier ? nextTier.threshold - totalPoints : 0,
    [nextTier, totalPoints]
  );

  const handleRedeem = useCallback((biz: MemberFollowedBusiness) => {
    console.log('[Rewards] Opening redeem for:', biz.businessName);
    setRedeemSheet({ visible: true, businessId: biz.businessId, businessName: biz.businessName });
  }, []);

  const handleCloseSheet = useCallback(() => {
    setRedeemSheet(prev => ({ ...prev, visible: false }));
  }, []);

  const handleCouponGenerated = useCallback((coupon: { id: string }) => {
    console.log('[Rewards] Coupon generated id:', coupon.id);
  }, []);

  const activeCouponCount = useMemo(() => {
    const now = Date.now();
    return coupons.filter(c => c.status !== 'used' && c.expiresAt > now).length;
  }, [coupons]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.headerBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <HeaderAvatarTrigger />
            <Text style={styles.headerTitle}>My Rewards</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.couponBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/rewards/coupons')}
              testID="my-coupons-btn"
            >
              <Ticket size={16} color={PURPLE} />
              <Text style={styles.couponBtnText}>Coupons</Text>
              {activeCouponCount > 0 && (
                <View style={styles.couponBadge}>
                  <Text style={styles.couponBadgeText}>{activeCouponCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.headerBadge}>
              <Zap size={12} color={PURPLE} />
              <Text style={styles.headerBadgeText}>{totalPoints} pts</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TotalPointsCard
          totalPoints={totalPoints}
          currentTier={currentTier}
          nextTier={nextTier}
          pointsToNext={pointsToNext}
        />

        <TierProgressRow currentTierName={currentTier.name} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Per Business</Text>
            <View style={styles.bizCount}>
              <Text style={styles.bizCountText}>{currentMemberFollowedBusinesses.length} businesses</Text>
            </View>
          </View>
          {currentMemberFollowedBusinesses.map(biz => (
            <BusinessPointCard key={biz.businessId} biz={biz} onRedeem={() => handleRedeem(biz)} />
          ))}
        </View>

        <View style={styles.activitySection}>
          <View style={styles.sectionHeaderAlt}>
            <ArrowUpRight size={16} color={PURPLE} />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          <View style={styles.activityCard}>
            {activityEvents.map((event, idx) => (
              <React.Fragment key={event.id}>
                <ActivityItem event={event} />
                {idx < activityEvents.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>

      <RedeemBottomSheet
        visible={redeemSheet.visible}
        businessId={redeemSheet.businessId}
        businessName={redeemSheet.businessName}
        onClose={handleCloseSheet}
        onCouponGenerated={handleCouponGenerated}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFF5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#1A1730',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: PURPLE + '20',
  },
  couponBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: PURPLE,
  },
  couponBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  couponBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#fff',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: PURPLE,
  },
  scroll: {
    paddingBottom: 30,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeaderAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A1730',
    letterSpacing: -0.2,
  },
  bizCount: {
    backgroundColor: '#E8E6EF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bizCountText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1A5C35',
  },
  activitySection: {
    marginTop: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EFF5',
    marginHorizontal: 16,
  },
});
