import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {
  Users,
  CreditCard,
  Check,
  Shield,
  Clock,
  Gift,
  Calculator,
  Lock,
  CircleDollarSign,
  XCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { BIZCOM_MEMBER_TIERS, getTierForMemberCount, formatCurrency } from '@/mocks/bizcom-subscriptions';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { BizComMemberTier } from '@/types';

type SubscriptionStep = 'plans' | 'payment' | 'processing' | 'confirmed';

interface BizComSubscriptionProps {
  onComplete: () => void;
  onSkip?: () => void;
  businessName?: string;
}

export default function BizComSubscription({ onComplete, onSkip, businessName }: BizComSubscriptionProps) {
  const { bizComSubscribe } = useSubscription();
  const [step, setStep] = useState<SubscriptionStep>('plans');
  const [selectedTier, setSelectedTier] = useState<BizComMemberTier>(BIZCOM_MEMBER_TIERS[0]);
  const [memberEstimate, setMemberEstimate] = useState<string>('');
  const [showCalculator, setShowCalculator] = useState<boolean>(false);

  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = useCallback((nextStep: SubscriptionStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleSelectTier = useCallback((tier: BizComMemberTier) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTier(tier);
    console.log('[BizComSubscription] Selected tier:', tier.id, tier.label);
  }, []);

  const handleCalculateEstimate = useCallback(() => {
    const count = parseInt(memberEstimate, 10);
    if (isNaN(count) || count < 0) {
      Alert.alert('Invalid Number', 'Please enter a valid number of members.');
      return;
    }
    const tier = getTierForMemberCount(count);
    setSelectedTier(tier);
    setShowCalculator(false);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    console.log('[BizComSubscription] Calculated tier for', count, 'members:', tier.label, tier.monthlyPrice);
  }, [memberEstimate]);

  const formatCardNumber = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  }, []);

  const formatExpiry = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  }, []);

  const validatePayment = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 16) errors.cardNumber = 'Enter a valid card number';
    if (cardExpiry.length < 5) errors.cardExpiry = 'Enter a valid expiry';
    if (cardCvc.length < 3) errors.cardCvc = 'Enter CVC';
    if (!cardName.trim()) errors.cardName = 'Enter cardholder name';
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  }, [cardNumber, cardExpiry, cardCvc, cardName]);

  const handleProceedToPayment = useCallback(() => {
    animateTransition('payment');
    console.log('[BizComSubscription] Proceeding to payment for tier:', selectedTier.label);
  }, [animateTransition, selectedTier]);

  const handleSubmitPayment = useCallback(() => {
    if (!validatePayment()) return;
    console.log('[BizComSubscription] Submitting payment...');
    animateTransition('processing');

    const cleanCard = cardNumber.replace(/\s/g, '');
    const last4 = cleanCard.slice(-4);

    setTimeout(() => {
      bizComSubscribe(selectedTier.id, last4, 'Visa');
      console.log('[BizComSubscription] Synced subscription to context, tier:', selectedTier.id);

      setStep('confirmed');
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(checkmarkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      console.log('[BizComSubscription] Payment confirmed!');
    }, 2500);
  }, [validatePayment, animateTransition, successScale, checkmarkAnim, bizComSubscribe, selectedTier, cardNumber]);

  const renderTrialBanner = () => (
    <View style={styles.trialBanner}>
      <View style={styles.trialIconWrap}>
        <Gift size={20} color="#F59E0B" />
      </View>
      <View style={styles.trialContent}>
        <Text style={styles.trialTitle}>3-Month Free Trial</Text>
        <Text style={styles.trialDesc}>
          Start free for 3 months. Billing begins after your trial ends. Cancel anytime.
        </Text>
      </View>
    </View>
  );

  const renderPlansStep = () => (
    <View>
      <View style={styles.stepHeaderSection}>
        <View style={styles.stepIconCircle}>
          <Users size={24} color={Colors.navyDark} />
        </View>
        <Text style={styles.stepTitle}>BizCom Subscription</Text>
        <Text style={styles.stepSubtitle}>
          Your monthly fee is based on the number of BizCom members your business has at the end of each calendar month.
        </Text>
      </View>

      {renderTrialBanner()}

      <View style={styles.tierListHeader}>
        <Text style={styles.tierListTitle}>Pricing Tiers</Text>
        <TouchableOpacity
          style={styles.calculatorBtn}
          onPress={() => setShowCalculator(!showCalculator)}
          activeOpacity={0.7}
        >
          <Calculator size={14} color={Colors.navyDark} />
          <Text style={styles.calculatorBtnText}>Estimate</Text>
        </TouchableOpacity>
      </View>

      {showCalculator && (
        <View style={styles.calculatorCard}>
          <Text style={styles.calculatorLabel}>Enter estimated member count</Text>
          <View style={styles.calculatorInputRow}>
            <TextInput
              style={styles.calculatorInput}
              value={memberEstimate}
              onChangeText={setMemberEstimate}
              placeholder="e.g. 5000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              testID="member-estimate-input"
            />
            <TouchableOpacity
              style={styles.calculatorGoBtn}
              onPress={handleCalculateEstimate}
              activeOpacity={0.7}
            >
              <Text style={styles.calculatorGoBtnText}>Calculate</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.calculatorHint}>
            Your plan will auto-adjust each month based on actual member count
          </Text>
        </View>
      )}

      {BIZCOM_MEMBER_TIERS.map((tier) => {
        const isSelected = selectedTier.id === tier.id;
        return (
          <TouchableOpacity
            key={tier.id}
            style={[styles.tierCard, isSelected && styles.tierCardSelected]}
            onPress={() => handleSelectTier(tier)}
            activeOpacity={0.7}
            testID={`tier-${tier.id}`}
          >
            <View style={styles.tierCardLeft}>
              <View style={[styles.tierRadio, isSelected && styles.tierRadioSelected]}>
                {isSelected && <View style={styles.tierRadioInner} />}
              </View>
              <View style={styles.tierInfo}>
                <Text style={[styles.tierLabel, isSelected && styles.tierLabelSelected]}>
                  {tier.label}
                </Text>
                <Text style={styles.tierMemberRange}>
                  {tier.maxMembers
                    ? `${tier.minMembers.toLocaleString()} – ${tier.maxMembers.toLocaleString()}`
                    : `${tier.minMembers.toLocaleString()}+`
                  } members
                </Text>
              </View>
            </View>
            <View style={styles.tierPriceWrap}>
              <Text style={[styles.tierPrice, isSelected && styles.tierPriceSelected]}>
                {formatCurrency(tier.monthlyPrice, tier.currency)}
              </Text>
              <Text style={styles.tierPricePeriod}>/month</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.autoCalcBanner}>
        <Calculator size={16} color={Colors.navyLight} />
        <Text style={styles.autoCalcText}>
          Your bill is automatically calculated each month based on your actual BizCom member count. 
          If your members grow, you&apos;ll move to the next tier automatically.
        </Text>
      </View>

      <View style={styles.cancelBanner}>
        <XCircle size={16} color={Colors.teal} />
        <Text style={styles.cancelText}>Cancel at any time – no lock-in contracts</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleProceedToPayment}
        activeOpacity={0.8}
        testID="proceed-to-payment"
      >
        <CreditCard size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Set Up Payment</Text>
      </TouchableOpacity>

      {onSkip && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={onSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPaymentStep = () => (
    <View>
      <View style={styles.stepHeaderSection}>
        <View style={styles.stepIconCircle}>
          <CreditCard size={24} color={Colors.navyDark} />
        </View>
        <Text style={styles.stepTitle}>Payment Details</Text>
        <Text style={styles.stepSubtitle}>
          Add your payment method. You won&apos;t be charged during your 3-month free trial.
        </Text>
      </View>

      <View style={styles.selectedPlanSummary}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>Selected Plan</Text>
          <Text style={styles.summaryTierName}>{selectedTier.label}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryPrice}>{formatCurrency(selectedTier.monthlyPrice, selectedTier.currency)}/mo</Text>
          <Text style={styles.summaryTrialNote}>Free for 3 months</Text>
        </View>
      </View>

      <View style={styles.paymentForm}>
        <Text style={styles.paymentFormTitle}>Card Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cardholder Name</Text>
          <TextInput
            style={[styles.input, cardErrors.cardName ? styles.inputError : undefined]}
            value={cardName}
            onChangeText={(t) => { setCardName(t); setCardErrors(prev => { const n = {...prev}; delete n.cardName; return n; }); }}
            placeholder="John Smith"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
            testID="card-name-input"
          />
          {cardErrors.cardName && <Text style={styles.fieldError}>{cardErrors.cardName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Card Number</Text>
          <View style={styles.cardInputRow}>
            <TextInput
              style={[styles.input, styles.cardInput, cardErrors.cardNumber ? styles.inputError : undefined]}
              value={cardNumber}
              onChangeText={(t) => { setCardNumber(formatCardNumber(t)); setCardErrors(prev => { const n = {...prev}; delete n.cardNumber; return n; }); }}
              placeholder="4242 4242 4242 4242"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={19}
              testID="card-number-input"
            />
            <View style={styles.cardBrandWrap}>
              <CreditCard size={18} color={Colors.textTertiary} />
            </View>
          </View>
          {cardErrors.cardNumber && <Text style={styles.fieldError}>{cardErrors.cardNumber}</Text>}
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Expiry</Text>
            <TextInput
              style={[styles.input, cardErrors.cardExpiry ? styles.inputError : undefined]}
              value={cardExpiry}
              onChangeText={(t) => { setCardExpiry(formatExpiry(t)); setCardErrors(prev => { const n = {...prev}; delete n.cardExpiry; return n; }); }}
              placeholder="MM/YY"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={5}
              testID="card-expiry-input"
            />
            {cardErrors.cardExpiry && <Text style={styles.fieldError}>{cardErrors.cardExpiry}</Text>}
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>CVC</Text>
            <TextInput
              style={[styles.input, cardErrors.cardCvc ? styles.inputError : undefined]}
              value={cardCvc}
              onChangeText={(t) => { setCardCvc(t.replace(/\D/g, '').slice(0, 4)); setCardErrors(prev => { const n = {...prev}; delete n.cardCvc; return n; }); }}
              placeholder="123"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              testID="card-cvc-input"
            />
            {cardErrors.cardCvc && <Text style={styles.fieldError}>{cardErrors.cardCvc}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.securityNote}>
        <Lock size={14} color={Colors.textTertiary} />
        <Text style={styles.securityNoteText}>
          Your payment details are encrypted and secure. You won&apos;t be charged during the free trial.
        </Text>
      </View>

      <View style={styles.billingPreview}>
        <Text style={styles.billingPreviewTitle}>Billing Summary</Text>
        <View style={styles.billingRow}>
          <Text style={styles.billingRowLabel}>Today</Text>
          <Text style={styles.billingRowValue}>£0.00</Text>
        </View>
        <View style={styles.billingRow}>
          <Text style={styles.billingRowLabel}>After free trial (3 months)</Text>
          <Text style={styles.billingRowValue}>{formatCurrency(selectedTier.monthlyPrice, selectedTier.currency)}/mo</Text>
        </View>
        <View style={styles.billingDivider} />
        <View style={styles.billingRow}>
          <Text style={styles.billingRowLabelMuted}>Auto-adjusts based on member count</Text>
        </View>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => animateTransition('plans')}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtnFlex}
          onPress={handleSubmitPayment}
          activeOpacity={0.8}
          testID="confirm-payment"
        >
          <Shield size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Start Free Trial</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mockHint}>
        <Text style={styles.mockHintText}>Demo: Enter any card details to proceed</Text>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.processingWrap}>
      <ActivityIndicator size="large" color={Colors.navyDark} />
      <Text style={styles.processingTitle}>Setting up your subscription...</Text>
      <Text style={styles.processingSubtext}>
        Verifying payment details{businessName ? ` for ${businessName}` : ''}
      </Text>
    </View>
  );

  const renderConfirmedStep = () => (
    <Animated.View style={[styles.confirmedWrap, { transform: [{ scale: successScale }] }]}>
      <Animated.View style={[styles.successCheckWrap, { opacity: checkmarkAnim }]}>
        <CheckCircle2 size={56} color={Colors.teal} fill={Colors.teal} />
      </Animated.View>

      <Text style={styles.confirmedTitle}>You&apos;re All Set!</Text>
      <Text style={styles.confirmedSubtext}>
        Your 3-month free trial has started{businessName ? ` for ${businessName}` : ''}. 
        You&apos;ll be billed {formatCurrency(selectedTier.monthlyPrice, selectedTier.currency)}/month 
        after the trial, adjusted based on your BizCom member count.
      </Text>

      <View style={styles.confirmedSummaryCard}>
        <View style={styles.confirmedSummaryRow}>
          <Gift size={16} color="#F59E0B" />
          <Text style={styles.confirmedSummaryLabel}>Free trial</Text>
          <Text style={styles.confirmedSummaryValue}>3 months</Text>
        </View>
        <View style={styles.confirmedSummaryDivider} />
        <View style={styles.confirmedSummaryRow}>
          <CircleDollarSign size={16} color={Colors.navyDark} />
          <Text style={styles.confirmedSummaryLabel}>Starting tier</Text>
          <Text style={styles.confirmedSummaryValue}>{selectedTier.label}</Text>
        </View>
        <View style={styles.confirmedSummaryDivider} />
        <View style={styles.confirmedSummaryRow}>
          <CreditCard size={16} color={Colors.navyLight} />
          <Text style={styles.confirmedSummaryLabel}>Monthly rate</Text>
          <Text style={styles.confirmedSummaryValue}>{formatCurrency(selectedTier.monthlyPrice, selectedTier.currency)}/mo</Text>
        </View>
        <View style={styles.confirmedSummaryDivider} />
        <View style={styles.confirmedSummaryRow}>
          <Clock size={16} color={Colors.textSecondary} />
          <Text style={styles.confirmedSummaryLabel}>First charge</Text>
          <Text style={styles.confirmedSummaryValue}>After trial</Text>
        </View>
      </View>

      <View style={styles.confirmedFeatures}>
        {[
          'Auto-calculates billing based on member count',
          'Tier upgrades happen automatically',
          'Cancel anytime with no penalties',
          'Full access during free trial',
        ].map((feat, i) => (
          <View key={i} style={styles.confirmedFeatureRow}>
            <Check size={14} color={Colors.teal} />
            <Text style={styles.confirmedFeatureText}>{feat}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={onComplete}
        activeOpacity={0.8}
        testID="subscription-complete"
      >
        <Text style={styles.primaryBtnText}>Continue</Text>
        <ArrowRight size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {step === 'plans' && renderPlansStep()}
      {step === 'payment' && renderPaymentStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'confirmed' && renderConfirmedStep()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {},
  stepHeaderSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 19,
    maxWidth: 300,
  },
  trialBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  trialIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialContent: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 3,
  },
  trialDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  tierListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tierListTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  calculatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  calculatorBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  calculatorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
  },
  calculatorLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  calculatorInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  calculatorInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  calculatorGoBtn: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculatorGoBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  calculatorHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 8,
    lineHeight: 15,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: 8,
  },
  tierCardSelected: {
    borderColor: Colors.navyDark,
    backgroundColor: Colors.navyDark + '06',
  },
  tierCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  tierRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRadioSelected: {
    borderColor: Colors.navyDark,
  },
  tierRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.navyDark,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  tierLabelSelected: {
    color: Colors.navyDark,
  },
  tierMemberRange: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  tierPriceWrap: {
    alignItems: 'flex-end',
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  tierPriceSelected: {
    color: Colors.navyDark,
  },
  tierPricePeriod: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  autoCalcBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.navyDark + '06',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.navyDark + '10',
  },
  autoCalcText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  cancelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.teal,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navyDark,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navyDark,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  selectedPlanSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.navyDark + '08',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navyDark + '15',
    marginBottom: 20,
  },
  summaryLeft: {},
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  summaryTierName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.navyDark,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.navyDark,
    letterSpacing: -0.3,
  },
  summaryTrialNote: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  paymentForm: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
  },
  paymentFormTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  inputError: {
    borderColor: Colors.error,
  },
  cardInputRow: {
    position: 'relative' as const,
  },
  cardInput: {
    paddingRight: 44,
  },
  cardBrandWrap: {
    position: 'absolute' as const,
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldError: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  billingPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  billingPreviewTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billingRowLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  billingRowLabelMuted: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontStyle: 'italic' as const,
  },
  billingRowValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.navyDark,
  },
  billingDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  mockHint: {
    alignItems: 'center',
    marginTop: 14,
    opacity: 0.5,
  },
  mockHintText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  processingWrap: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 14,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  processingSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  confirmedWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successCheckWrap: {
    marginBottom: 16,
  },
  confirmedTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  confirmedSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 24,
  },
  confirmedSummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    width: '100%',
    marginBottom: 20,
  },
  confirmedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  confirmedSummaryLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  confirmedSummaryValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  confirmedSummaryDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  confirmedFeatures: {
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  confirmedFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmedFeatureText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
});
