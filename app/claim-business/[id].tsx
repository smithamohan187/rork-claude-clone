import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  CheckCircle2,
  Circle,
  Mail,
  FileText,
  Building2,
  Lock,
  Send,
  AlertCircle,
  PartyPopper,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { googleBusinessProfiles } from '@/mocks/data';
import BizComSubscription from '@/components/BizComSubscription';
import * as Haptics from 'expo-haptics';

type VerificationMethod = 'phone' | 'email' | 'postcard' | 'instant';
type ClaimStep = 'details' | 'verify_method' | 'verify_code' | 'confirming' | 'success' | 'subscription';

interface VerificationOption {
  id: VerificationMethod;
  title: string;
  subtitle: string;
  detail: string;
  iconColor: string;
}

const VERIFICATION_OPTIONS: VerificationOption[] = [
  {
    id: 'phone',
    title: 'Phone Verification',
    subtitle: 'Receive a call or SMS to the listed number',
    detail: 'A 6-digit code will be sent to the business phone number on file.',
    iconColor: '#22C55E',
  },
  {
    id: 'email',
    title: 'Email Verification',
    subtitle: 'Receive a code at the business email',
    detail: 'A verification link will be sent to the email associated with this business.',
    iconColor: '#3B82F6',
  },
  {
    id: 'postcard',
    title: 'Postcard by Mail',
    subtitle: 'Google sends a postcard to the business address',
    detail: 'Takes 5-14 business days. A postcard with a verification code will arrive at the listed address.',
    iconColor: '#F59E0B',
  },
  {
    id: 'instant',
    title: 'Instant Verification',
    subtitle: 'Verify via Google Search Console',
    detail: 'If you have already verified your website with Google Search Console, you may qualify.',
    iconColor: '#00B246',
  },
];

function getMethodIcon(method: VerificationMethod, color: string) {
  switch (method) {
    case 'phone': return <Phone size={20} color={color} />;
    case 'email': return <Mail size={20} color={color} />;
    case 'postcard': return <FileText size={20} color={color} />;
    case 'instant': return <ShieldCheck size={20} color={color} />;
  }
}

export default function ClaimBusinessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = googleBusinessProfiles.find(p => p.id === id);

  const [step, setStep] = useState<ClaimStep>('details');
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;

  const stepIndex = ['details', 'verify_method', 'verify_code', 'confirming', 'success', 'subscription'].indexOf(step);
  const progressPercent = stepIndex / 5;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, progressAnim]);

  const animateTransition = useCallback((nextStep: ClaimStep) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
      ]),
      Animated.timing(slideAnim, { toValue: 30, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleSelectMethod = useCallback((method: VerificationMethod) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedMethod(method);
  }, []);

  const handleProceedToCode = useCallback(() => {
    if (!selectedMethod) return;
    animateTransition('verify_code');
  }, [selectedMethod, animateTransition]);

  const handleSubmitCode = useCallback(async () => {
    if (verificationCode.length < 6) {
      setCodeError('Please enter the full 6-digit code');
      return;
    }
    setCodeError('');
    setIsSubmitting(true);
    animateTransition('confirming');

    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(confettiOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 2500);
  }, [verificationCode, animateTransition, successScale, confettiOpacity]);

  if (!profile) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Business Not Found</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.errorWrap}>
          <AlertCircle size={48} color={Colors.textTertiary} />
          <Text style={styles.errorText}>This business profile could not be found.</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderDetailsStep = () => (
    <View>
      <View style={styles.profileCard}>
        <View style={styles.profileImageWrap}>
          <Image source={{ uri: profile.photo }} style={styles.profileImage} contentFit="cover" />
          <View style={styles.profileImageOverlay} />
          <View style={styles.googleBadgeOnImage}>
            <Building2 size={12} color="#fff" />
            <Text style={styles.googleBadgeText}>Google Business</Text>
          </View>
        </View>
        <View style={styles.profileBody}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <View style={styles.profileRatingRow}>
            <Star size={14} color="#FBBF24" fill="#FBBF24" />
            <Text style={styles.profileRatingValue}>{profile.rating}</Text>
            <Text style={styles.profileReviewCount}>({profile.reviewCount.toLocaleString()} reviews)</Text>
          </View>

          <View style={styles.profileDetailRow}>
            <MapPin size={14} color={Colors.textTertiary} />
            <Text style={styles.profileDetailText}>{profile.address}</Text>
          </View>
          <View style={styles.profileDetailRow}>
            <Phone size={14} color={Colors.textTertiary} />
            <Text style={styles.profileDetailText}>{profile.phone}</Text>
          </View>
          <View style={styles.profileDetailRow}>
            <Globe size={14} color={Colors.textTertiary} />
            <Text style={[styles.profileDetailText, { color: '#4285F4' }]}>{profile.website}</Text>
          </View>
          <View style={styles.profileDetailRow}>
            <Clock size={14} color={Colors.textTertiary} />
            <Text style={styles.profileDetailText}>{profile.hours}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIconWrap}>
          <Lock size={18} color="#4285F4" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Why claim this business?</Text>
          <Text style={styles.infoDesc}>Claiming lets you manage your listing, respond to reviews, post updates, and connect with customers on TouchPoint.</Text>
        </View>
      </View>

      <View style={styles.stepsPreview}>
        <Text style={styles.stepsPreviewTitle}>Verification Process</Text>
        {['Confirm business details', 'Choose verification method', 'Enter verification code', 'Business claimed!'].map((label, i) => (
          <View key={i} style={styles.stepPreviewRow}>
            <View style={[styles.stepPreviewDot, i === 0 && styles.stepPreviewDotActive]}>
              <Text style={[styles.stepPreviewDotText, i === 0 && styles.stepPreviewDotTextActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepPreviewLabel, i === 0 && styles.stepPreviewLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        activeOpacity={0.8}
        onPress={() => animateTransition('verify_method')}
      >
        <ShieldCheck size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Start Verification</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyMethodStep = () => (
    <View>
      <Text style={styles.stepTitle}>Choose Verification Method</Text>
      <Text style={styles.stepSubtitle}>Google will verify you are the owner of this business through one of these methods.</Text>

      {VERIFICATION_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.id}
          style={[styles.methodCard, selectedMethod === opt.id && styles.methodCardSelected]}
          activeOpacity={0.8}
          onPress={() => handleSelectMethod(opt.id)}
        >
          <View style={styles.methodCardLeft}>
            <View style={[styles.methodIconWrap, { backgroundColor: opt.iconColor + '15' }]}>
              {getMethodIcon(opt.id, opt.iconColor)}
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{opt.title}</Text>
              <Text style={styles.methodSubtitle}>{opt.subtitle}</Text>
            </View>
          </View>
          <View style={styles.methodRadio}>
            {selectedMethod === opt.id ? (
              <CheckCircle2 size={22} color="#4285F4" fill="#4285F4" />
            ) : (
              <Circle size={22} color={Colors.borderLight} />
            )}
          </View>
        </TouchableOpacity>
      ))}

      {selectedMethod && (
        <View style={styles.methodDetailBanner}>
          <AlertCircle size={16} color="#4285F4" />
          <Text style={styles.methodDetailText}>
            {VERIFICATION_OPTIONS.find(o => o.id === selectedMethod)?.detail}
          </Text>
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => animateTransition('details')} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, styles.primaryBtnFlex, !selectedMethod && styles.btnDisabled]}
          activeOpacity={selectedMethod ? 0.8 : 1}
          onPress={handleProceedToCode}
        >
          <Send size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Send Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVerifyCodeStep = () => {
    const methodOpt = VERIFICATION_OPTIONS.find(o => o.id === selectedMethod);
    return (
      <View>
        <Text style={styles.stepTitle}>Enter Verification Code</Text>
        <Text style={styles.stepSubtitle}>
          {selectedMethod === 'phone' && `A 6-digit code has been sent to ${profile.phone}`}
          {selectedMethod === 'email' && 'A verification code has been sent to the business email on file'}
          {selectedMethod === 'postcard' && 'Enter the code from the postcard sent to your business address'}
          {selectedMethod === 'instant' && 'Enter the code from your Google Search Console'}
        </Text>

        <View style={styles.codeSentCard}>
          <View style={[styles.codeSentIcon, { backgroundColor: (methodOpt?.iconColor ?? '#4285F4') + '15' }]}>
            {selectedMethod && getMethodIcon(selectedMethod, methodOpt?.iconColor ?? '#4285F4')}
          </View>
          <View style={styles.codeSentInfo}>
            <Text style={styles.codeSentTitle}>Code Sent via {methodOpt?.title.split(' ')[0]}</Text>
            <Text style={styles.codeSentSubtext}>
              {selectedMethod === 'postcard' ? 'Allow 5-14 days for delivery' : 'Check your messages'}
            </Text>
          </View>
        </View>

        <Text style={styles.codeLabel}>Verification Code</Text>
        <View style={styles.codeInputWrap}>
          <TextInput
            style={styles.codeInput}
            value={verificationCode}
            onChangeText={(text) => {
              setVerificationCode(text.replace(/[^0-9]/g, '').slice(0, 6));
              setCodeError('');
            }}
            placeholder="000000"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            maxLength={6}
            testID="verification-code-input"
          />
          <View style={styles.codeDotsRow}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <View
                key={i}
                style={[
                  styles.codeDot,
                  verificationCode.length > i && styles.codeDotFilled,
                ]}
              />
            ))}
          </View>
        </View>
        {codeError !== '' && (
          <Text style={styles.codeErrorText}>{codeError}</Text>
        )}

        <TouchableOpacity style={styles.resendRow} activeOpacity={0.7}>
          <Text style={styles.resendText}>Didn't receive a code? </Text>
          <Text style={styles.resendLink}>Resend</Text>
        </TouchableOpacity>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => animateTransition('verify_method')} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.primaryBtnFlex, verificationCode.length < 6 && styles.btnDisabled]}
            activeOpacity={verificationCode.length >= 6 ? 0.8 : 1}
            onPress={handleSubmitCode}
          >
            <ShieldCheck size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Verify</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mockHint}>
          <AlertCircle size={13} color={Colors.textTertiary} />
          <Text style={styles.mockHintText}>Demo: Enter any 6 digits to proceed</Text>
        </View>
      </View>
    );
  };

  const renderConfirmingStep = () => (
    <View style={styles.confirmingWrap}>
      <ActivityIndicator size="large" color="#4285F4" />
      <Text style={styles.confirmingTitle}>Verifying with Google...</Text>
      <Text style={styles.confirmingSubtext}>Confirming your ownership of {profile.name}</Text>
    </View>
  );

  const renderSuccessStep = () => (
    <Animated.View style={[styles.successWrap, { transform: [{ scale: successScale }] }]}>
      <Animated.View style={[styles.successConfetti, { opacity: confettiOpacity }]}>
        <PartyPopper size={32} color="#FBBF24" />
      </Animated.View>
      <View style={styles.successIconWrap}>
        <CheckCircle2 size={56} color="#22C55E" fill="#22C55E" />
      </View>
      <Text style={styles.successTitle}>Business Claimed!</Text>
      <Text style={styles.successSubtext}>
        You are now the verified owner of {profile.name} on TouchPoint. You can manage your profile, respond to reviews, and connect with customers.
      </Text>

      <View style={styles.successInfoCard}>
        <Image source={{ uri: profile.photo }} style={styles.successBizImage} contentFit="cover" />
        <View style={styles.successBizInfo}>
          <Text style={styles.successBizName}>{profile.name}</Text>
          <View style={styles.successBizVerified}>
            <ShieldCheck size={12} color="#22C55E" />
            <Text style={styles.successBizVerifiedText}>Verified Owner</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        activeOpacity={0.8}
        onPress={() => {
          setStep('subscription');
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }).start();
        }}
      >
        <Text style={styles.primaryBtnText}>Set Up Subscription</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { marginTop: 10, alignSelf: 'center' as const }]}
        activeOpacity={0.7}
        onPress={() => router.back()}
      >
        <Text style={styles.secondaryBtnText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Claim Business</Text>
            <Text style={styles.headerStep}>
              {step === 'details' && 'Step 1 of 5'}
              {step === 'verify_method' && 'Step 2 of 5'}
              {step === 'verify_code' && 'Step 3 of 5'}
              {step === 'confirming' && 'Verifying...'}
              {step === 'success' && 'Step 4 of 5'}
              {step === 'subscription' && 'Step 5 of 5'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {step === 'details' && renderDetailsStep()}
          {step === 'verify_method' && renderVerifyMethodStep()}
          {step === 'verify_code' && renderVerifyCodeStep()}
          {step === 'confirming' && renderConfirmingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'subscription' && (
            <BizComSubscription
              onComplete={() => {
                console.log('[ClaimBusiness] Subscription complete for', profile.name);
                Alert.alert(
                  'All Set!',
                  `${profile.name} is claimed and your BizCom subscription is active. Your 3-month free trial has started.`,
                  [{ text: 'Continue', onPress: () => router.back() }]
                );
              }}
              onSkip={() => {
                console.log('[ClaimBusiness] Subscription skipped for', profile.name);
                router.back();
              }}
              businessName={profile.name}
            />
          )}
        </Animated.View>
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
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.2,
  },
  headerStep: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 2,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 50,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
  },
  profileImageWrap: {
    height: 160,
    position: 'relative' as const,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  googleBadgeOnImage: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#4285F4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  googleBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  profileBody: {
    padding: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  profileRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  profileRatingValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  profileReviewCount: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  profileDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  profileDetailText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#4285F4' + '0A',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4285F4' + '20',
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#4285F4' + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  infoDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  stepsPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  stepsPreviewTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  stepPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepPreviewDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stepPreviewDotActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  stepPreviewDotText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
  },
  stepPreviewDotTextActive: {
    color: '#fff',
  },
  stepPreviewLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  stepPreviewLabelActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    minHeight: 76,
  },
  methodCardSelected: {
    borderColor: '#4285F4',
    backgroundColor: '#4285F4' + '06',
  },
  methodCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  methodIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  methodSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  methodRadio: {
    marginLeft: 8,
  },
  methodDetailBanner: {
    flexDirection: 'row',
    backgroundColor: '#4285F4' + '0A',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4285F4' + '18',
  },
  methodDetailText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnFlex: {
    flex: 1,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  codeSentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 14,
    marginBottom: 28,
  },
  codeSentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeSentInfo: {
    flex: 1,
  },
  codeSentTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  codeSentSubtext: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  codeInputWrap: {
    marginBottom: 8,
  },
  codeInput: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 14,
    textAlign: 'center' as const,
  },
  codeDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  codeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  codeDotFilled: {
    backgroundColor: '#4285F4',
  },
  codeErrorText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.error,
    marginTop: 4,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#4285F4',
  },
  mockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 16,
    opacity: 0.5,
  },
  mockHintText: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
  confirmingWrap: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 14,
  },
  confirmingTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  confirmingSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  successWrap: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successConfetti: {
    marginBottom: 10,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 24,
  },
  successInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#22C55E' + '30',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  successBizImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  successBizInfo: {
    flex: 1,
  },
  successBizName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  successBizVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  successBizVerifiedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#22C55E',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  errorBtn: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
});

