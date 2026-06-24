import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
//import { sendOtp } from '@/services/authService';
import { ArrowLeft, ArrowRight, Mail, Phone } from 'lucide-react-native';

const ACCENT = '#1A5C35';
const BG = '#FAFAFA';
const SURFACE = '#FFFFFF';
const BORDER = '#E8ECF0';
const TEXT_PRIMARY = '#1B1B2F';
const TEXT_SECONDARY = '#6B7280';
const TEXT_TERTIARY = '#A0A7B5';
const ERROR_COLOR = '#EF4444';

type DetectedType = 'email' | 'phone' | 'unknown';

function detectType(input: string): DetectedType {
  const t = input.trim();
  if (!t) return 'unknown';
  if (t.includes('@')) return 'email';
  const digits = t.replace(/[\s-]/g, '');
  if (/^\+?\d+$/.test(digits)) return 'phone';
  return 'unknown';
}

function normalizePhone(input: string): string {
  const digits = input.replace(/[\s-]/g, '');
  if (digits.startsWith('+')) return digits;
  return `+${digits}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(input: string): boolean {
  const digits = input.replace(/[^\d]/g, '');
  return digits.length >= 10;
}

export default function OtpRequestScreen() {
  const router = useRouter();
  const [value, setValue] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [focused, setFocused] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const type = useMemo<DetectedType>(() => detectType(value), [value]);

  const validationError = useMemo<string>(() => {
    if (!submitted) return '';
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter your email or phone number';
    if (type === 'email' && !isValidEmail(trimmed)) return 'Enter a valid email or phone number';
    if (type === 'phone' && !isValidPhone(trimmed)) return 'Enter a valid email or phone number';
    if (type === 'unknown') return 'Enter a valid email or phone number';
    return '';
  }, [submitted, value, type]);

  const canSubmit = useMemo<boolean>(() => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (type === 'email') return isValidEmail(trimmed);
    if (type === 'phone') return isValidPhone(trimmed);
    return false;
  }, [value, type]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const identifier = type === 'phone' ? normalizePhone(value) : value.trim().toLowerCase();
      const otpType = type === 'phone' ? 'phone' : 'email';
      console.log('[OtpRequest] Sending OTP to:', identifier, 'type:', otpType);
      const res = await sendOtp(identifier, otpType);
      if (res.error) {
        console.log('[OtpRequest] send error:', res.error.message);
        throw new Error(res.error.message);
      }
      return { identifier, otpType };
    },
    onSuccess: ({ identifier, otpType }) => {
      console.log('[OtpRequest] OTP sent, navigating to verify');
      router.push({
        pathname: '/otp-verify',
        params: { identifier, type: otpType },
      });
    },
  });

  const handleSend = useCallback(() => {
    setSubmitted(true);
    if (!canSubmit) {
      console.log('[OtpRequest] Validation failed');
      return;
    }
    sendMutation.mutate();
  }, [canSubmit, sendMutation]);

  const hintText =
    type === 'email'
      ? "We'll send an OTP to your email"
      : type === 'phone'
      ? "We'll send an OTP to your phone"
      : 'Enter your email or phone number';

  const HintIcon = type === 'phone' ? Phone : Mail;
  const apiError = sendMutation.error instanceof Error ? sendMutation.error.message : '';
  const showError = !!validationError || !!apiError;
  const errorText = validationError || apiError;

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="back-btn"
            >
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Login with OTP</Text>
              <Text style={styles.headerSubtitle}>We&apos;ll send you a one-time code</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.headerDecorCircle1} />
        <View style={styles.headerDecorCircle2} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.introText}>
              Enter your registered email or mobile number. We&apos;ll send you a one-time code.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email or Phone</Text>
              <View
                style={[
                  styles.inputWrap,
                  focused && styles.inputWrapFocused,
                  showError && styles.inputWrapError,
                ]}
              >
                <HintIcon size={18} color={focused ? ACCENT : TEXT_TERTIARY} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com or +1 555 000 0000"
                  placeholderTextColor={TEXT_TERTIARY}
                  value={value}
                  onChangeText={(t) => {
                    setValue(t);
                    if (submitted) setSubmitted(false);
                    if (sendMutation.error) sendMutation.reset();
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType={type === 'phone' ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="otp-identifier-input"
                />
              </View>
              <View style={styles.hintRow}>
                <HintIcon size={12} color={TEXT_SECONDARY} />
                <Text style={styles.hintText}>{hintText}</Text>
              </View>
              {showError ? <Text style={styles.errorText}>{errorText}</Text> : null}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!canSubmit || sendMutation.isPending) && styles.primaryBtnDisabled,
              ]}
              onPress={handleSend}
              activeOpacity={0.85}
              disabled={!canSubmit || sendMutation.isPending}
              testID="send-otp-btn"
            >
              {sendMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Send OTP</Text>
                  <ArrowRight size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.back()}
              activeOpacity={0.7}
              testID="back-to-login"
            >
              <Text style={styles.backLinkText}>
                Back to <Text style={styles.backLinkBold}>Password Login</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  headerArea: { backgroundColor: ACCENT, paddingBottom: 28, overflow: 'hidden' },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingTop: 2 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  headerDecorCircle1: {
    position: 'absolute' as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -30,
    right: -30,
  },
  headerDecorCircle2: {
    position: 'absolute' as const,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -20,
    left: 30,
  },
  scrollContent: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 24 },
  introText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  inputWrapFocused: {
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapError: { borderColor: ERROR_COLOR },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    color: TEXT_PRIMARY,
    height: '100%',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingLeft: 4,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TEXT_SECONDARY,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: ERROR_COLOR,
    marginTop: 6,
    paddingLeft: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  backLink: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  backLinkText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
  },
  backLinkBold: {
    fontWeight: '700' as const,
    color: ACCENT,
  },
});
