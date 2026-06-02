import React, { useState, useRef, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  X as XIcon,
  Crown,
  Zap,
  Rocket,
  Shield,
  ChevronRight,
  MessageCircle,
  BarChart3,
  MailX,
  Users,
  Star,
  Gift,
  Search,
  Megaphone,
  Store,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { BillingCycle, SubscriptionPlan, SubscriptionTier } from '@/types';


const TIER_ICONS: Record<string, React.ElementType> = {
  starter: Zap,
  professional: Crown,
  enterprise: Rocket,
};

const TIER_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  starter: { bg: '#F0F7FF', accent: '#3B82F6', text: '#1E40AF' },
  professional: { bg: '#FFF7ED', accent: '#F59E0B', text: '#92400E' },
  enterprise: { bg: '#F0FDF4', accent: '#10B981', text: '#065F46' },
};

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromProfile?: string }>();
  const { subscribe, isSubscribing, subscription, isSubscribed } = useSubscription();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('professional');
  const [expandedPlan, setExpandedPlan] = useState<string | null>('plan_professional');
  const toggleAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnims = useRef<Record<string, Animated.Value>>({
    starter: new Animated.Value(1),
    professional: new Animated.Value(1),
    enterprise: new Animated.Value(1),
  }).current;

  const { plans } = useSubscription();

  const handleToggleBilling = useCallback((cycle: BillingCycle) => {
    Animated.sequence([
      Animated.timing(toggleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(toggleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setBillingCycle(cycle);
  }, [toggleAnim]);

  const handleSelectPlan = useCallback((tier: SubscriptionTier, planId: string) => {
    const anim = buttonScaleAnims[tier];
    if (anim) {
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.96, duration: 60, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
    setSelectedTier(tier);
    setExpandedPlan(prev => prev === planId ? null : planId);
  }, [buttonScaleAnims]);

  const handleSubscribe = useCallback(() => {
    if (isSubscribed && subscription?.tier === selectedTier) {
      Alert.alert('Already Subscribed', 'You are already on this plan.');
      return;
    }

    subscribe(selectedTier, billingCycle);

    const plan = plans.find(p => p.tier === selectedTier);
    const price = billingCycle === 'monthly' ? plan?.monthlyPrice : plan?.annualPrice;

    Alert.alert(
      'Subscription Activated!',
      `You're now on the ${plan?.name} plan at $${price?.toFixed(2)}/${billingCycle === 'monthly' ? 'mo' : 'yr'}. Welcome aboard!`,
      [{
        text: 'Continue',
        onPress: () => {
          if (params.fromProfile === 'true') {
            router.back();
          } else {
            router.replace('/manage-subscription' as any);
          }
        },
      }]
    );
  }, [selectedTier, billingCycle, subscribe, plans, isSubscribed, subscription, params.fromProfile, router]);

  const getPrice = (plan: SubscriptionPlan) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    const monthlyTotal = plan.monthlyPrice * 12;
    const annualTotal = plan.annualPrice;
    const savings = monthlyTotal - annualTotal;
    return savings;
  };

  const renderBillingToggle = () => (
    <Animated.View style={[styles.billingToggle, { transform: [{ scale: toggleAnim }] }]}>
      <TouchableOpacity
        style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
        onPress={() => handleToggleBilling('monthly')}
        activeOpacity={0.7}
      >
        <Text style={[styles.billingOptionText, billingCycle === 'monthly' && styles.billingOptionTextActive]}>
          Monthly
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.billingOption, billingCycle === 'annual' && styles.billingOptionActive]}
        onPress={() => handleToggleBilling('annual')}
        activeOpacity={0.7}
      >
        <Text style={[styles.billingOptionText, billingCycle === 'annual' && styles.billingOptionTextActive]}>
          Annual
        </Text>
        <View style={styles.saveBadge}>
          <Text style={styles.saveBadgeText}>Save 17%</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isSelected = selectedTier === plan.tier;
    const isExpanded = expandedPlan === plan.id;
    const tierColor = TIER_COLORS[plan.tier] ?? TIER_COLORS.starter;
    const TierIcon = TIER_ICONS[plan.tier] ?? Zap;
    const scaleAnim = buttonScaleAnims[plan.tier];
    const price = getPrice(plan);
    const savings = getSavings(plan);

    return (
      <Animated.View
        key={plan.id}
        style={[{ transform: [{ scale: scaleAnim ?? new Animated.Value(1) }] }]}
      >
        <TouchableOpacity
          style={[
            styles.planCard,
            isSelected && styles.planCardSelected,
            isSelected && { borderColor: tierColor.accent },
          ]}
          onPress={() => handleSelectPlan(plan.tier, plan.id)}
          activeOpacity={0.8}
          testID={`plan-card-${plan.tier}`}
        >
          {plan.badge && (
            <View style={[styles.planBadge, { backgroundColor: tierColor.accent }]}>
              <Text style={styles.planBadgeText}>{plan.badge}</Text>
            </View>
          )}

          <View style={styles.planHeader}>
            <View style={[styles.planIconWrap, { backgroundColor: tierColor.bg }]}>
              <TierIcon size={22} color={tierColor.accent} />
            </View>
            <View style={styles.planHeaderText}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planTagline}>{plan.tagline}</Text>
            </View>
            <View style={[styles.radioOuter, isSelected && { borderColor: tierColor.accent }]}>
              {isSelected && <View style={[styles.radioInner, { backgroundColor: tierColor.accent }]} />}
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.priceAmount, { color: tierColor.text }]}>
              ${price.toFixed(2)}
            </Text>
            <Text style={styles.pricePeriod}>
              /{billingCycle === 'monthly' ? 'month' : 'year'}
            </Text>
            {billingCycle === 'annual' && savings > 0 && (
              <View style={[styles.savingsChip, { backgroundColor: tierColor.bg }]}>
                <Text style={[styles.savingsText, { color: tierColor.accent }]}>
                  Save ${savings.toFixed(0)}
                </Text>
              </View>
            )}
          </View>

          {isExpanded && (
            <View style={styles.featuresSection}>
              <View style={styles.featuresDivider} />
              {plan.features.map(feature => (
                <View key={feature.id} style={styles.featureRow}>
                  {feature.included ? (
                    <View style={[styles.featureCheck, { backgroundColor: tierColor.bg }]}>
                      <Check size={12} color={tierColor.accent} />
                    </View>
                  ) : (
                    <View style={styles.featureX}>
                      <XIcon size={12} color={Colors.textTertiary} />
                    </View>
                  )}
                  <Text style={[styles.featureLabel, !feature.included && styles.featureLabelDisabled]}>
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!isExpanded && (
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() => setExpandedPlan(plan.id)}
              activeOpacity={0.6}
            >
              <Text style={[styles.expandBtnText, { color: tierColor.accent }]}>View features</Text>
              <ChevronRight size={14} color={tierColor.accent} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Your Plan</Text>
          <View style={styles.headerBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Shield size={32} color={Colors.navyDark} />
          </View>
          <Text style={styles.heroTitle}>Unlock Business Features</Text>
          <Text style={styles.heroSubtitle}>
            Choose the plan that fits your business. Upgrade or downgrade anytime.
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsSectionTitle}>What you get</Text>
          {[
            { icon: MessageCircle, text: 'Engage one to one or one to many with the customers that matter most to you' },
            { icon: BarChart3, text: 'Use our customer insights dashboards' },
            { icon: MailX, text: "Avoid spamming your customers with emails they often don't read" },
            { icon: Users, text: 'Track your active and passive followers and engage more effectively' },
            { icon: Star, text: 'Build trust by sharing customer feedback and ratings' },
            { icon: Gift, text: 'Use our goodwill, customised or generic promotions tools to drive new sales' },
            { icon: Search, text: 'Find new customers through our advanced referrals tools' },
            { icon: Megaphone, text: 'Create up to four promotional posts per week within your subscription' },
            { icon: Store, text: 'Get a dynamic business listing in our Hyperlocal Marketplace' },
          ].map((item, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <item.icon size={16} color={Colors.teal} />
              </View>
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {renderBillingToggle()}

        <View style={styles.plansContainer}>
          {plans.map(renderPlanCard)}
        </View>

        <View style={styles.guaranteeSection}>
          <Shield size={16} color={Colors.teal} />
          <Text style={styles.guaranteeText}>
            14-day free trial on all plans. Cancel anytime, no questions asked.
          </Text>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
        <View style={styles.footer}>
          <View style={styles.footerPriceWrap}>
            <Text style={styles.footerPlanName}>
              {plans.find(p => p.tier === selectedTier)?.name}
            </Text>
            <Text style={styles.footerPrice}>
              ${getPrice(plans.find(p => p.tier === selectedTier)!).toFixed(2)}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.subscribeBtn}
            onPress={handleSubscribe}
            activeOpacity={0.8}
            disabled={isSubscribing}
            testID="subscribe-button"
          >
            <Text style={styles.subscribeBtnText}>
              {isSubscribing ? 'Processing...' : 'Start Free Trial'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    paddingBottom: 30,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    maxWidth: 280,
  },
  billingToggle: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    gap: 6,
  },
  billingOptionActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  billingOptionTextActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  saveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  plansContainer: {
    paddingHorizontal: 24,
    gap: 14,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  planCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  planBadge: {
    position: 'absolute',
    top: -1,
    right: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeaderText: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  planTagline: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 14,
    paddingLeft: 56,
    gap: 2,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400' as const,
  },
  savingsChip: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  featuresSection: {
    marginTop: 14,
  },
  featuresDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureX: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  featureLabelDisabled: {
    color: Colors.textTertiary,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4,
  },
  expandBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  guaranteeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 32,
  },
  benefitsSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  benefitsSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  benefitIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E6F7F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  benefitText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    flex: 1,
    fontWeight: '500' as const,
  },
  guaranteeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    flex: 1,
  },
  footerSafe: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  footerPriceWrap: {
    flex: 1,
  },
  footerPlanName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  footerPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subscribeBtn: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  subscribeBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});

