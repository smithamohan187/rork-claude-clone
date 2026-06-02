import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  CreditCard,
  Calendar,
  RefreshCw,
  XCircle,
  Check,
  ChevronRight,
  Settings,
  Gift,
  Calculator,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { formatCurrency } from '@/mocks/bizcom-subscriptions';
import type { BizComMemberTier } from '@/types';

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const {
    bizComSubscription,
    currentBizComTier,
    bizComTiers,
    bizComChangeTier,
    bizComCancel,
    bizComReactivate,
  } = useSubscription();

  const [showChangeTier, setShowChangeTier] = useState<boolean>(false);
  const [showCancelSection, setShowCancelSection] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [cardAnim]);

  const handleChangeTier = useCallback((tier: BizComMemberTier) => {
    if (!bizComSubscription) return;
    if (tier.id === bizComSubscription.tierId) {
      Alert.alert('Same Tier', 'You are already on this tier.');
      return;
    }

    const isUpgrade = tier.monthlyPrice > bizComSubscription.monthlyPrice;

    Alert.alert(
      isUpgrade ? 'Upgrade Tier' : 'Change Tier',
      `${isUpgrade ? 'Upgrade' : 'Switch'} to ${tier.label} at ${formatCurrency(tier.monthlyPrice, tier.currency)}/month?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isUpgrade ? 'Upgrade' : 'Switch',
          onPress: () => {
            bizComChangeTier(tier.id);
            setShowChangeTier(false);
            Alert.alert('Tier Updated', `You are now on the ${tier.label} tier.`);
          },
        },
      ]
    );
  }, [bizComSubscription, bizComChangeTier]);

  const CANCEL_REASONS = useMemo(() => [
    { id: 'too_expensive', label: 'Too expensive' },
    { id: 'not_using', label: 'Not using enough features' },
    { id: 'switching', label: 'Switching to another service' },
    { id: 'closing_business', label: 'Closing my business' },
    { id: 'missing_features', label: 'Missing features I need' },
    { id: 'other', label: 'Other reason' },
  ], []);

  const handleCancelConfirm = useCallback(() => {
    if (!cancelReason) {
      Alert.alert('Select a Reason', 'Please select a reason for cancelling.');
      return;
    }
    Alert.alert(
      'Confirm Cancellation',
      'This will cancel your BizCom subscription. You will retain access until the end of your current billing period.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            bizComCancel();
            setShowCancelSection(false);
            setCancelReason(null);
            Alert.alert('Subscription Cancelled', 'Your plan will remain active until the end of the current billing period.');
          },
        },
      ]
    );
  }, [bizComCancel, cancelReason]);

  const handleReactivate = useCallback(() => {
    Alert.alert(
      'Reactivate Subscription',
      'Would you like to reactivate your BizCom subscription?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: () => {
            bizComReactivate();
            Alert.alert('Welcome Back!', 'Your BizCom subscription has been reactivated.');
          },
        },
      ]
    );
  }, [bizComReactivate]);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  if (!bizComSubscription || !currentBizComTier) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
              <ArrowLeft size={22} color={Colors.bannerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Subscription</Text>
            <View style={styles.headerBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Users size={40} color={Colors.navyDark} />
          </View>
          <Text style={styles.emptyTitle}>No Active Subscription</Text>
          <Text style={styles.emptySubtitle}>
            Set up your BizCom subscription to connect with customers and grow your business.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/create-business-profile' as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyBtnText}>Set Up Subscription</Text>
            <ChevronRight size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isCancelled = bizComSubscription.status === 'cancelled';
  const isTrialing = bizComSubscription.status === 'trialing';
  const isActive = bizComSubscription.status === 'active';

  const statusConfig = useMemo(() => {
    if (isCancelled) return { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2', icon: XCircle };
    if (isTrialing) return { label: 'Free Trial', color: '#D97706', bg: '#FFFBEB', icon: Clock };
    return { label: 'Active', color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle2 };
  }, [isCancelled, isTrialing]);

  const daysRemaining = useMemo(() => {
    const endDate = isTrialing && bizComSubscription.trialEndsAt
      ? new Date(bizComSubscription.trialEndsAt)
      : new Date(bizComSubscription.nextBillingDate);
    const now = new Date();
    const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [bizComSubscription, isTrialing]);

  const cardScale = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  const StatusIcon = statusConfig.icon;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Subscription</Text>
          <View style={styles.headerBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.statusHeroCard, { transform: [{ scale: cardScale }], opacity: cardAnim }]}>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <StatusIcon size={16} color={'#FFFFFF'} />
            <Text style={[styles.statusBadgeText, { color: '#FFFFFF' }]}>{statusConfig.label}</Text>
          </View>
          <Text style={styles.statusHeroTitle}>Your Plan</Text>
          <Text style={styles.statusHeroTier}>{currentBizComTier.label}</Text>
          <View style={styles.statusHeroPriceRow}>
            <Text style={styles.statusHeroPrice}>
              {formatCurrency(bizComSubscription.monthlyPrice, bizComSubscription.currency)}
            </Text>
            <Text style={styles.statusHeroPricePeriod}>/month</Text>
          </View>
          {isTrialing && (
            <View style={styles.statusHeroTrialNote}>
              <Gift size={14} color="#FFD180" />
              <Text style={styles.statusHeroTrialText}>
                {daysRemaining} days remaining in free trial
              </Text>
            </View>
          )}
          {isCancelled && (
            <View style={styles.statusHeroCancelNote}>
              <AlertCircle size={14} color="#FCA5A5" />
              <Text style={styles.statusHeroCancelText}>
                Access until {formatDate(bizComSubscription.nextBillingDate)}
              </Text>
            </View>
          )}
          {isActive && (
            <View style={styles.statusHeroActiveNote}>
              <Shield size={14} color={'#FFFFFF'} />
              <Text style={styles.statusHeroActiveText}>Your subscription is active and in good standing</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.currentPlanCard}>
          <View style={styles.planCardHeader}>
            <View style={styles.planIconCircle}>
              <Users size={26} color={Colors.navyDark} />
            </View>
            <View style={styles.planCardInfo}>
              <Text style={styles.planCardName}>BizCom Subscription</Text>
              <Text style={styles.planCardTagline}>{currentBizComTier.label}</Text>
            </View>
          </View>

          <View style={styles.priceBlock}>
            <Text style={styles.priceBlockAmount}>
              {formatCurrency(bizComSubscription.monthlyPrice, bizComSubscription.currency)}
            </Text>
            <Text style={styles.priceBlockPeriod}>per month</Text>
          </View>

          {isTrialing && bizComSubscription.trialEndsAt && (
            <View style={styles.trialInfoCard}>
              <Gift size={16} color="#F59E0B" />
              <View style={styles.trialInfoContent}>
                <Text style={styles.trialInfoTitle}>3-Month Free Trial Active</Text>
                <Text style={styles.trialInfoText}>
                  Your trial ends on {formatDate(bizComSubscription.trialEndsAt)}. Billing begins after the trial.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Calendar size={16} color={Colors.textSecondary} />
              <View>
                <Text style={styles.detailLabel}>Started</Text>
                <Text style={styles.detailValue}>{formatDate(bizComSubscription.startDate)}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <CreditCard size={16} color={Colors.textSecondary} />
              <View>
                <Text style={styles.detailLabel}>
                  {isCancelled ? 'Access until' : isTrialing ? 'Trial ends' : 'Next billing'}
                </Text>
                <Text style={styles.detailValue}>
                  {isTrialing && bizComSubscription.trialEndsAt
                    ? formatDate(bizComSubscription.trialEndsAt)
                    : formatDate(bizComSubscription.nextBillingDate)
                  }
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
              <View>
                <Text style={styles.detailLabel}>Plan Status</Text>
                <Text style={[styles.detailValue, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Users size={16} color={Colors.textSecondary} />
              <View>
                <Text style={styles.detailLabel}>Member range</Text>
                <Text style={styles.detailValue}>
                  {currentBizComTier.maxMembers
                    ? `${currentBizComTier.minMembers.toLocaleString()} – ${currentBizComTier.maxMembers.toLocaleString()}`
                    : `${currentBizComTier.minMembers.toLocaleString()}+`
                  }
                </Text>
              </View>
            </View>
            {bizComSubscription.paymentLast4 && (
              <View style={styles.detailItem}>
                <CreditCard size={16} color={Colors.textSecondary} />
                <View>
                  <Text style={styles.detailLabel}>Payment method</Text>
                  <Text style={styles.detailValue}>
                    {bizComSubscription.paymentBrand ? `${bizComSubscription.paymentBrand} ` : ''}•••• {bizComSubscription.paymentLast4}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.featuresPreview}>
            <Text style={styles.featuresPreviewTitle}>Included</Text>
            {[
              'Full BizCom member management',
              'Customer messaging & engagement',
              'Analytics & insights dashboard',
              'Promotional posts (up to 4/week)',
              'Hyperlocal marketplace listing',
              'Auto-adjusting tier based on members',
            ].map((feature, idx) => (
              <View key={idx} style={styles.featurePreviewRow}>
                <Check size={14} color={Colors.teal} />
                <Text style={styles.featurePreviewText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.autoCalcBanner}>
          <Calculator size={16} color={Colors.navyLight} />
          <Text style={styles.autoCalcText}>
            Your bill is automatically calculated each month based on your actual BizCom member count.
            If your members grow, you&apos;ll move to the next tier automatically.
          </Text>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.actionsSectionTitle}>Manage Subscription</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setShowChangeTier(!showChangeTier)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Settings size={18} color="#00B246" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Change Tier</Text>
              <Text style={styles.actionSubtitle}>Switch to a different member tier</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} style={{ transform: [{ rotate: showChangeTier ? '90deg' : '0deg' }] }} />
          </TouchableOpacity>

          {showChangeTier && (
            <View style={styles.changeTierList}>
              {bizComTiers.map((tier) => {
                const isCurrentTier = tier.id === bizComSubscription.tierId;
                const isUpgrade = tier.monthlyPrice > bizComSubscription.monthlyPrice;
                const isDowngrade = tier.monthlyPrice < bizComSubscription.monthlyPrice;

                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.changeTierItem, isCurrentTier && styles.changeTierItemCurrent]}
                    onPress={() => !isCurrentTier && handleChangeTier(tier)}
                    activeOpacity={isCurrentTier ? 1 : 0.7}
                    disabled={isCurrentTier}
                  >
                    <View style={styles.changeTierInfo}>
                      <Text style={styles.changeTierLabel}>{tier.label}</Text>
                      <Text style={styles.changeTierMembers}>
                        {tier.maxMembers
                          ? `${tier.minMembers.toLocaleString()} – ${tier.maxMembers.toLocaleString()} members`
                          : `${tier.minMembers.toLocaleString()}+ members`
                        }
                      </Text>
                    </View>
                    <View style={styles.changeTierRight}>
                      <Text style={[styles.changeTierPrice, isCurrentTier && styles.changeTierPriceCurrent]}>
                        {formatCurrency(tier.monthlyPrice, tier.currency)}/mo
                      </Text>
                      {isCurrentTier ? (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      ) : isUpgrade ? (
                        <View style={[styles.switchBadge, { backgroundColor: '#DCFCE7' }]}>
                          <Text style={[styles.switchBadgeText, { color: '#16A34A' }]}>Upgrade</Text>
                        </View>
                      ) : isDowngrade ? (
                        <View style={[styles.switchBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.switchBadgeText, { color: '#D97706' }]}>Downgrade</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {isCancelled ? (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleReactivate}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: Colors.success + '20' }]}>
                <RefreshCw size={18} color={Colors.success} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: Colors.success }]}>Reactivate Subscription</Text>
                <Text style={styles.actionSubtitle}>Resume your BizCom subscription</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowCancelSection(!showCancelSection)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <XCircle size={18} color={Colors.error} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: Colors.error }]}>Cancel Subscription</Text>
                <Text style={styles.actionSubtitle}>No lock-in contracts — cancel anytime</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} style={{ transform: [{ rotate: showCancelSection ? '90deg' : '0deg' }] }} />
            </TouchableOpacity>
          )}

          {showCancelSection && !isCancelled && (
            <View style={styles.cancelSection}>
              <View style={styles.cancelWarningBanner}>
                <XCircle size={20} color={Colors.error} />
                <View style={styles.cancelWarningContent}>
                  <Text style={styles.cancelWarningTitle}>Before you go...</Text>
                  <Text style={styles.cancelWarningText}>
                    Cancelling will remove access to all BizCom features at the end of your billing period on {formatDate(bizComSubscription.nextBillingDate)}.
                  </Text>
                </View>
              </View>

              <Text style={styles.cancelReasonLabel}>Help us improve — why are you cancelling?</Text>
              {CANCEL_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.cancelReasonOption,
                    cancelReason === reason.id && styles.cancelReasonOptionSelected,
                  ]}
                  onPress={() => setCancelReason(reason.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.cancelReasonRadio,
                    cancelReason === reason.id && styles.cancelReasonRadioSelected,
                  ]}>
                    {cancelReason === reason.id && <View style={styles.cancelReasonRadioDot} />}
                  </View>
                  <Text style={[
                    styles.cancelReasonText,
                    cancelReason === reason.id && styles.cancelReasonTextSelected,
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.cancelActions}>
                <TouchableOpacity
                  style={styles.cancelKeepBtn}
                  onPress={() => {
                    setShowCancelSection(false);
                    setCancelReason(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelKeepBtnText}>Keep My Plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cancelConfirmBtn,
                    !cancelReason && styles.cancelConfirmBtnDisabled,
                  ]}
                  onPress={handleCancelConfirm}
                  activeOpacity={cancelReason ? 0.7 : 1}
                >
                  <Text style={styles.cancelConfirmBtnText}>Cancel Subscription</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.allTiersSection}>
          <Text style={styles.allTiersTitle}>All Pricing Tiers</Text>
          <Text style={styles.allTiersSubtitle}>Your tier auto-adjusts based on your BizCom member count each month</Text>
          {bizComTiers.map((tier) => {
            const isCurrentTier = tier.id === bizComSubscription.tierId;
            return (
              <View
                key={tier.id}
                style={[styles.tierRow, isCurrentTier && styles.tierRowCurrent]}
              >
                <View style={styles.tierRowLeft}>
                  <View style={[styles.tierDot, isCurrentTier && styles.tierDotCurrent]} />
                  <View>
                    <Text style={[styles.tierRowLabel, isCurrentTier && styles.tierRowLabelCurrent]}>
                      {tier.label}
                    </Text>
                    <Text style={styles.tierRowMembers}>
                      {tier.maxMembers
                        ? `${tier.minMembers.toLocaleString()} – ${tier.maxMembers.toLocaleString()} members`
                        : `${tier.minMembers.toLocaleString()}+ members`
                      }
                    </Text>
                  </View>
                </View>
                <View style={styles.tierRowRight}>
                  <Text style={[styles.tierRowPrice, isCurrentTier && styles.tierRowPriceCurrent]}>
                    {formatCurrency(tier.monthlyPrice, tier.currency)}
                  </Text>
                  <Text style={styles.tierRowPeriod}>/month</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.banner,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.banner,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  statusHeroCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
    borderRadius: 20,
    padding: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  statusHeroTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.lavender,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusHeroTier: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  statusHeroPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 12,
  },
  statusHeroPrice: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.5,
  },
  statusHeroPricePeriod: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.lavender,
  },
  statusHeroTrialNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusHeroTrialText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFD180',
  },
  statusHeroCancelNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusHeroCancelText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FCA5A5',
  },
  statusHeroActiveNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusHeroActiveText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  currentPlanCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 22,
    padding: 22,
    overflow: 'hidden',
    backgroundColor: '#F0F7FF',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  planIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navyDark + '15',
  },
  planCardInfo: {
    flex: 1,
  },
  planCardName: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    color: Colors.navyDark,
  },
  planCardTagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 4,
    backgroundColor: Colors.navyDark + '08',
  },
  priceBlockAmount: {
    fontSize: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    color: Colors.navyDark,
  },
  priceBlockPeriod: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400' as const,
  },
  trialInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    alignItems: 'flex-start',
  },
  trialInfoContent: {
    flex: 1,
  },
  trialInfoTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 2,
  },
  trialInfoText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  detailsGrid: {
    marginTop: 18,
    gap: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 1,
  },
  featuresPreview: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  featuresPreviewTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  featurePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  featurePreviewText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  autoCalcBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.navyDark + '06',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.navyDark + '10',
  },
  autoCalcText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  actionsSection: {
    paddingHorizontal: 20,
  },
  actionsSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    gap: 14,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  changeTierList: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  changeTierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  changeTierItemCurrent: {
    opacity: 0.6,
  },
  changeTierInfo: {
    flex: 1,
  },
  changeTierLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  changeTierMembers: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  changeTierRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  changeTierPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  changeTierPriceCurrent: {
    color: Colors.textSecondary,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.navyDark + '10',
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  switchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  switchBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cancelSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelWarningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  cancelWarningContent: {
    flex: 1,
  },
  cancelWarningTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#991B1B',
    marginBottom: 4,
  },
  cancelWarningText: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  cancelReasonLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  cancelReasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    gap: 12,
    backgroundColor: Colors.background,
  },
  cancelReasonOptionSelected: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelReasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReasonRadioSelected: {
    borderColor: Colors.error,
  },
  cancelReasonRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  cancelReasonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  cancelReasonTextSelected: {
    color: '#991B1B',
    fontWeight: '600' as const,
  },
  cancelActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelKeepBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelKeepBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2563EB',
  },
  cancelConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelConfirmBtnDisabled: {
    backgroundColor: '#FECACA',
  },
  cancelConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  allTiersSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  allTiersTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  allTiersSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 14,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  tierRowCurrent: {
    borderColor: Colors.navyDark,
    backgroundColor: Colors.navyDark + '06',
  },
  tierRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.borderLight,
  },
  tierDotCurrent: {
    backgroundColor: Colors.navyDark,
  },
  tierRowLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  tierRowLabelCurrent: {
    color: Colors.navyDark,
  },
  tierRowMembers: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  tierRowRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  tierRowPrice: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  tierRowPriceCurrent: {
    color: Colors.navyDark,
  },
  tierRowPeriod: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
});

