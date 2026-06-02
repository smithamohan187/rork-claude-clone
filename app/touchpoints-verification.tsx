import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  BadgeCheck,
  Check,
  ChevronRight,
  Building2,
  FileText,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  Award,
  Star,
  Lock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type VerificationStep = 'eligibility' | 'details' | 'review' | 'submitted';

interface VerificationField {
  key: string;
  label: string;
  value: string;
  icon: React.ElementType;
  verified: boolean;
}

const ACCREDITATION_BENEFITS = [
  { id: '1', title: 'Verified Badge', desc: 'Display a trusted verification badge on your profile', icon: BadgeCheck, color: '#0D9488' },
  { id: '2', title: 'Priority Listing', desc: 'Appear higher in search results and discovery feeds', icon: Star, color: '#F59E0B' },
  { id: '3', title: 'Trust Score Boost', desc: 'Increased credibility with community members', icon: Award, color: '#00B246' },
  { id: '4', title: 'Exclusive Features', desc: 'Access premium business tools and analytics', icon: Sparkles, color: '#3B82F6' },
];

const REQUIREMENTS = [
  'Active business subscription plan',
  'Completed business profile with all required fields',
  'Valid business contact information',
  'At least 1 week of active membership',
];

export default function TouchPointVerificationScreen() {
  const router = useRouter();
  const { accountType, hasBusinessProfile, businessProfileData, currentUser } = useAuth();
  const { isSubscribed, subscription, currentPlan } = useSubscription();

  const [currentStep, setCurrentStep] = useState<VerificationStep>('eligibility');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnims = useRef<Record<string, Animated.Value>>({}).current;

  const isRegisteredBusiness = accountType === 'business' && hasBusinessProfile;
  const isEligible = isRegisteredBusiness && isSubscribed;

  const verificationFields: VerificationField[] = [
    {
      key: 'name',
      label: 'Business Name',
      value: businessProfileData?.name || currentUser.name || '',
      icon: Building2,
      verified: !!(businessProfileData?.name || currentUser.name),
    },
    {
      key: 'category',
      label: 'Business Category',
      value: businessProfileData?.category || currentUser.category || '',
      icon: FileText,
      verified: !!(businessProfileData?.category || currentUser.category),
    },
    {
      key: 'website',
      label: 'Website',
      value: businessProfileData?.website || currentUser.website || '',
      icon: Globe,
      verified: !!(businessProfileData?.website || currentUser.website),
    },
    {
      key: 'phone',
      label: 'Phone Number',
      value: businessProfileData?.phone || currentUser.phone || '',
      icon: Phone,
      verified: !!(businessProfileData?.phone || currentUser.phone),
    },
    {
      key: 'email',
      label: 'Email Address',
      value: businessProfileData?.email || currentUser.email || '',
      icon: Mail,
      verified: !!(businessProfileData?.email || currentUser.email),
    },
    {
      key: 'address',
      label: 'Business Address',
      value: businessProfileData?.address || currentUser.address || '',
      icon: MapPin,
      verified: !!(businessProfileData?.address || currentUser.address),
    },
    {
      key: 'hours',
      label: 'Operating Hours',
      value: businessProfileData?.hours || currentUser.hours || '',
      icon: Clock,
      verified: !!(businessProfileData?.hours || currentUser.hours),
    },
  ];

  const verifiedCount = verificationFields.filter(f => f.verified).length;
  const completionPercent = Math.round((verifiedCount / verificationFields.length) * 100);

  const animateStepTransition = useCallback((nextStep: VerificationStep) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(nextStep);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
      ]).start();
    });

    const stepProgress = nextStep === 'eligibility' ? 0 : nextStep === 'details' ? 0.33 : nextStep === 'review' ? 0.66 : 1;
    Animated.timing(progressAnim, { toValue: stepProgress, duration: 400, useNativeDriver: false }).start();
  }, [fadeAnim, slideAnim, progressAnim]);

  const getCheckAnim = useCallback((key: string) => {
    if (!checkScaleAnims[key]) {
      checkScaleAnims[key] = new Animated.Value(0);
    }
    return checkScaleAnims[key];
  }, [checkScaleAnims]);

  const animateCheck = useCallback((key: string) => {
    const anim = getCheckAnim(key);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }).start();
  }, [getCheckAnim]);

  React.useEffect(() => {
    verificationFields.forEach((field, idx) => {
      if (field.verified) {
        setTimeout(() => animateCheck(field.key), 100 + idx * 80);
      }
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!agreedToTerms) {
      Alert.alert('Terms Required', 'Please agree to the verification terms to proceed.');
      return;
    }

    animateStepTransition('submitted');
    console.log('[Verification] TouchPoint verification submitted');
  }, [agreedToTerms, animateStepTransition]);

  const handleGoBack = useCallback(() => {
    if (currentStep === 'details') {
      animateStepTransition('eligibility');
    } else if (currentStep === 'review') {
      animateStepTransition('details');
    } else {
      router.back();
    }
  }, [currentStep, animateStepTransition, router]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!isRegisteredBusiness) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
              <ArrowLeft size={22} color={Colors.bannerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>TouchPoint Verification</Text>
            <View style={styles.headerBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.blockedContainer}>
          <View style={styles.blockedIconWrap}>
            <Lock size={44} color={Colors.navyDark} />
          </View>
          <Text style={styles.blockedTitle}>Business Account Required</Text>
          <Text style={styles.blockedDesc}>
            TouchPoint Verification is exclusively available to registered businesses. Please create a business profile to access this feature.
          </Text>
          <TouchableOpacity
            style={styles.blockedBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/create-business-profile' as never)}
          >
            <Building2 size={18} color="#fff" />
            <Text style={styles.blockedBtnText}>Create Business Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.blockedSecondaryBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.blockedSecondaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderEligibilityStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#0D9488', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBg}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconWrap}>
              <ShieldCheck size={36} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>TouchPoint Verification</Text>
            <Text style={styles.heroSubtitle}>
              Claim your accreditation badge and build trust with the community
            </Text>
          </View>
          <View style={styles.heroPattern}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[styles.patternDot, { left: (i * 60) + 10, top: (i % 3) * 25 + 5, opacity: 0.15 }]} />
            ))}
          </View>
        </LinearGradient>
      </View>

      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Verification Benefits</Text>
        {ACCREDITATION_BENEFITS.map((benefit) => {
          const BenefitIcon = benefit.icon;
          return (
            <View key={benefit.id} style={styles.benefitCard}>
              <View style={[styles.benefitIconWrap, { backgroundColor: benefit.color + '14' }]}>
                <BenefitIcon size={22} color={benefit.color} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDesc}>{benefit.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.requirementsSection}>
        <Text style={styles.sectionTitle}>Requirements</Text>
        <View style={styles.requirementsCard}>
          {REQUIREMENTS.map((req, idx) => {
            const isMet = idx === 0 ? isSubscribed : idx === 1 ? hasBusinessProfile : idx === 2 ? verifiedCount >= 4 : true;
            return (
              <View key={idx} style={styles.requirementRow}>
                <View style={[styles.requirementCheck, isMet ? styles.requirementCheckMet : styles.requirementCheckUnmet]}>
                  {isMet ? (
                    <Check size={12} color="#fff" />
                  ) : (
                    <AlertCircle size={12} color={Colors.textTertiary} />
                  )}
                </View>
                <Text style={[styles.requirementText, !isMet && styles.requirementTextUnmet]}>{req}</Text>
              </View>
            );
          })}
        </View>

        {!isSubscribed && (
          <TouchableOpacity
            style={styles.subscribePrompt}
            activeOpacity={0.8}
            onPress={() => router.push('/subscription-plans' as never)}
          >
            <AlertCircle size={18} color="#D97706" />
            <View style={styles.subscribePromptContent}>
              <Text style={styles.subscribePromptTitle}>Subscription Required</Text>
              <Text style={styles.subscribePromptDesc}>Subscribe to a business plan to proceed</Text>
            </View>
            <ChevronRight size={16} color="#D97706" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.ctaSection}>
        <TouchableOpacity
          style={[styles.primaryBtn, !isEligible && styles.primaryBtnDisabled]}
          activeOpacity={0.8}
          disabled={!isEligible}
          onPress={() => animateStepTransition('details')}
          testID="start-verification-btn"
        >
          <Text style={styles.primaryBtnText}>
            {isEligible ? 'Start Verification' : 'Complete Requirements First'}
          </Text>
          {isEligible && <ChevronRight size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDetailsStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.detailsHeader}>
        <Text style={styles.detailsTitle}>Verify Your Details</Text>
        <Text style={styles.detailsSubtitle}>
          We'll use your business profile information for verification
        </Text>
      </View>

      <View style={styles.completionBar}>
        <View style={styles.completionBarTrack}>
          <View style={[styles.completionBarFill, { width: `${completionPercent}%` }]} />
        </View>
        <Text style={styles.completionText}>{completionPercent}% complete</Text>
      </View>

      <View style={styles.fieldsContainer}>
        {verificationFields.map((field) => {
          const FieldIcon = field.icon;
          const checkAnim = getCheckAnim(field.key);
          return (
            <View key={field.key} style={styles.fieldCard}>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldIconWrap, field.verified ? styles.fieldIconVerified : styles.fieldIconUnverified]}>
                  <FieldIcon size={18} color={field.verified ? '#0D9488' : Colors.textTertiary} />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={[styles.fieldValue, !field.value && styles.fieldValueMissing]} numberOfLines={1}>
                    {field.value || 'Not provided'}
                  </Text>
                </View>
                {field.verified ? (
                  <Animated.View style={[styles.fieldCheckMark, { transform: [{ scale: checkAnim }] }]}>
                    <CheckCircle2 size={20} color="#0D9488" />
                  </Animated.View>
                ) : (
                  <View style={styles.fieldMissingMark}>
                    <AlertCircle size={20} color="#F59E0B" />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>Additional Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Any additional information to support your verification..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={additionalNotes}
          onChangeText={setAdditionalNotes}
          testID="verification-notes-input"
        />
      </View>

      <View style={styles.ctaSection}>
        <TouchableOpacity
          style={[styles.primaryBtn, completionPercent < 70 && styles.primaryBtnDisabled]}
          activeOpacity={0.8}
          disabled={completionPercent < 70}
          onPress={() => animateStepTransition('review')}
          testID="continue-to-review-btn"
        >
          <Text style={styles.primaryBtnText}>
            {completionPercent < 70 ? 'Complete More Fields' : 'Continue to Review'}
          </Text>
          {completionPercent >= 70 && <ChevronRight size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderReviewStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewIconWrap}>
          <FileText size={28} color="#0D9488" />
        </View>
        <Text style={styles.reviewTitle}>Review & Submit</Text>
        <Text style={styles.reviewSubtitle}>
          Please review your verification details before submitting
        </Text>
      </View>

      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <Image source={{ uri: currentUser.avatar }} style={styles.reviewAvatar} />
          <View style={styles.reviewCardInfo}>
            <Text style={styles.reviewBusinessName}>{businessProfileData?.name || currentUser.name}</Text>
            <Text style={styles.reviewBusinessCategory}>{businessProfileData?.category || currentUser.category || 'Business'}</Text>
          </View>
          <View style={styles.reviewBadge}>
            <BadgeCheck size={14} color="#0D9488" />
            <Text style={styles.reviewBadgeText}>Pending</Text>
          </View>
        </View>

        <View style={styles.reviewDivider} />

        <View style={styles.reviewFieldsList}>
          {verificationFields.filter(f => f.verified).map((field) => (
            <View key={field.key} style={styles.reviewFieldRow}>
              <Text style={styles.reviewFieldLabel}>{field.label}</Text>
              <Text style={styles.reviewFieldValue} numberOfLines={1}>{field.value}</Text>
            </View>
          ))}
        </View>

        {additionalNotes.length > 0 && (
          <>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewNotesWrap}>
              <Text style={styles.reviewNotesLabel}>Additional Notes</Text>
              <Text style={styles.reviewNotesText}>{additionalNotes}</Text>
            </View>
          </>
        )}

        {subscription && currentPlan && (
          <>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewPlanWrap}>
              <Text style={styles.reviewPlanLabel}>Active Plan</Text>
              <Text style={styles.reviewPlanValue}>{currentPlan.name} ({subscription.billingCycle})</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.termsSection}>
        <TouchableOpacity
          style={styles.termsRow}
          activeOpacity={0.7}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          testID="agree-terms-btn"
        >
          <View style={[styles.termsCheckbox, agreedToTerms && styles.termsCheckboxChecked]}>
            {agreedToTerms && <Check size={14} color="#fff" />}
          </View>
          <Text style={styles.termsText}>
            I confirm that all information provided is accurate and I agree to the TouchPoint Verification terms and conditions
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.ctaSection}>
        <TouchableOpacity
          style={[styles.submitBtn, !agreedToTerms && styles.primaryBtnDisabled]}
          activeOpacity={0.8}
          disabled={!agreedToTerms}
          onPress={handleSubmit}
          testID="submit-verification-btn"
        >
          <ShieldCheck size={20} color="#fff" />
          <Text style={styles.submitBtnText}>Submit Verification</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSubmittedStep = () => (
    <View style={styles.submittedContainer}>
      <View style={styles.submittedContent}>
        <LinearGradient
          colors={['#0D9488', '#0F766E']}
          style={styles.submittedIconWrap}
        >
          <CheckCircle2 size={52} color="#fff" />
        </LinearGradient>
        <Text style={styles.submittedTitle}>Verification Submitted!</Text>
        <Text style={styles.submittedDesc}>
          Your TouchPoint verification request has been submitted successfully. Our team will review your application within 2-3 business days.
        </Text>

        <View style={styles.submittedInfoCard}>
          <View style={styles.submittedInfoRow}>
            <Text style={styles.submittedInfoLabel}>Business</Text>
            <Text style={styles.submittedInfoValue}>{businessProfileData?.name || currentUser.name}</Text>
          </View>
          <View style={styles.submittedInfoDivider} />
          <View style={styles.submittedInfoRow}>
            <Text style={styles.submittedInfoLabel}>Status</Text>
            <View style={styles.submittedStatusBadge}>
              <Clock size={12} color="#D97706" />
              <Text style={styles.submittedStatusText}>Under Review</Text>
            </View>
          </View>
          <View style={styles.submittedInfoDivider} />
          <View style={styles.submittedInfoRow}>
            <Text style={styles.submittedInfoLabel}>Expected Response</Text>
            <Text style={styles.submittedInfoValue}>2-3 Business Days</Text>
          </View>
        </View>

        <View style={styles.submittedNextSteps}>
          <Text style={styles.submittedNextTitle}>What Happens Next?</Text>
          <View style={styles.submittedStep}>
            <View style={styles.submittedStepDot}>
              <Text style={styles.submittedStepNum}>1</Text>
            </View>
            <Text style={styles.submittedStepText}>Our team reviews your business information</Text>
          </View>
          <View style={styles.submittedStep}>
            <View style={styles.submittedStepDot}>
              <Text style={styles.submittedStepNum}>2</Text>
            </View>
            <Text style={styles.submittedStepText}>We may request additional documentation</Text>
          </View>
          <View style={styles.submittedStep}>
            <View style={styles.submittedStepDot}>
              <Text style={styles.submittedStepNum}>3</Text>
            </View>
            <Text style={styles.submittedStepText}>Once approved, your verified badge goes live</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submittedDoneBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
          testID="verification-done-btn"
        >
          <Text style={styles.submittedDoneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 'eligibility': return 'TouchPoint Verification';
      case 'details': return 'Verify Details';
      case 'review': return 'Review & Submit';
      case 'submitted': return 'Submitted';
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={currentStep === 'submitted' ? () => router.back() : handleGoBack}
            style={styles.headerBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getStepTitle()}</Text>
          <View style={styles.headerBtn} />
        </View>
        {currentStep !== 'submitted' && currentStep !== 'eligibility' && (
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        )}
      </SafeAreaView>

      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {currentStep === 'eligibility' && renderEligibilityStep()}
        {currentStep === 'details' && renderDetailsStep()}
        {currentStep === 'review' && renderReviewStep()}
        {currentStep === 'submitted' && renderSubmittedStep()}
      </Animated.View>
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
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#0D9488',
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroBg: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    position: 'relative',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center' as const,
    lineHeight: 20,
    maxWidth: 280,
  },
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternDot: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  benefitsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  benefitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  benefitDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  requirementsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  requirementsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requirementCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementCheckMet: {
    backgroundColor: '#0D9488',
  },
  requirementCheckUnmet: {
    backgroundColor: Colors.surfaceAlt,
  },
  requirementText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  requirementTextUnmet: {
    color: Colors.textTertiary,
  },
  subscribePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 12,
  },
  subscribePromptContent: {
    flex: 1,
  },
  subscribePromptTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  subscribePromptDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  ctaSection: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.borderLight,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  detailsHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  detailsSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  completionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  completionBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: 6,
    backgroundColor: '#0D9488',
    borderRadius: 3,
  },
  completionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#0D9488',
  },
  fieldsContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  fieldCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIconVerified: {
    backgroundColor: '#0D948814',
  },
  fieldIconUnverified: {
    backgroundColor: Colors.surfaceAlt,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 2,
  },
  fieldValueMissing: {
    color: Colors.textTertiary,
    fontStyle: 'italic' as const,
  },
  fieldCheckMark: {},
  fieldMissingMark: {},
  notesSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    minHeight: 100,
    lineHeight: 20,
  },
  reviewHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  reviewIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0D948814',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  reviewSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 280,
  },
  reviewCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  reviewCardInfo: {
    flex: 1,
  },
  reviewBusinessName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  reviewBusinessCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D948814',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#0D9488',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  reviewFieldsList: {
    gap: 10,
  },
  reviewFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewFieldLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  reviewFieldValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    maxWidth: SCREEN_WIDTH * 0.5,
    textAlign: 'right' as const,
  },
  reviewNotesWrap: {},
  reviewNotesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  reviewNotesText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },
  reviewPlanWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewPlanLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  reviewPlanValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  termsSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  termsCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsCheckboxChecked: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  submittedContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  submittedContent: {
    alignItems: 'center',
  },
  submittedIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  submittedTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  submittedDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
    maxWidth: 300,
    marginBottom: 24,
  },
  submittedInfoCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  submittedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  submittedInfoLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  submittedInfoValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  submittedInfoDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  submittedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  submittedStatusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  submittedNextSteps: {
    width: '100%',
    marginBottom: 28,
  },
  submittedNextTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
    textAlign: 'center' as const,
  },
  submittedStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  submittedStepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0D948814',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedStepNum: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#0D9488',
  },
  submittedStepText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  submittedDoneBtn: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 14,
  },
  submittedDoneBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  blockedIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  blockedDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
    marginBottom: 28,
  },
  blockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 14,
  },
  blockedBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  blockedSecondaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  blockedSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
});

