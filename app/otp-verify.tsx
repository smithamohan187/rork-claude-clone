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
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
//import { sendOtp, verifyOtp } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

const ACCENT = '#1A5C35';
const BG = '#FAFAFA';
const SURFACE = '#FFFFFF';
const BORDER = '#E8ECF0';
const TEXT_PRIMARY = '#1B1B2F';
const TEXT_SECONDARY = '#6B7280';
const TEXT_TERTIARY = '#A0A7B5';
const ERROR_COLOR = '#EF4444';

const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 3;

function maskIdentifier(identifier: string, type: 'email' | 'phone'): string {
  if (!identifier) return '';
  if (type === 'email') {
    const [name, domain] = identifier.split('@');
    if (!domain) return identifier;
    const visible = name.slice(0, 2);
    return `${visible}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
  }
  const digits = identifier.replace(/\D/g, '');
  if (digits.length <= 4) return identifier;
  const last = digits.slice(-4);
  return `${identifier.startsWith('+') ? '+' : ''}${'•'.repeat(digits.length - 4)}${last}`;
}

export default function OtpVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ identifier?: string; type?: string }>();
  const { restoreLastProfile } = useAuth();

  const identifier = typeof params.identifier === 'string' ? params.identifier : '';
  const type: 'email' | 'phone' = params.type === 'phone' ? 'phone' : 'email';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [attempts, setAttempts] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(RESEND_SECONDS);
  const [error, setError] = useState<string>('');
  const inputsRef = useRef<Array<TextInput | null>>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 250);
    return () => clearTimeout(t);
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const locked = attempts >= MAX_ATTEMPTS;
  const code = digits.join('');
  const allFilled = code.length === 6 && digits.every((d) => d.length === 1);

  const setDigitAt = useCallback((index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleChange = useCallback(
    (index: number, text: string) => {
      if (error) setError('');
      const cleaned = text.replace(/\D/g, '');
      if (cleaned.length === 0) {
        setDigitAt(index, '');
        return;
      }
      if (cleaned.length === 1) {
        setDigitAt(index, cleaned);
        if (index < 5) inputsRef.current[index + 1]?.focus();
        return;
      }
      const chars = cleaned.slice(0, 6 - index).split('');
      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < chars.length; i++) {
          next[index + i] = chars[i];
        }
        return next;
      });
      const focusIdx = Math.min(index + chars.length, 5);
      inputsRef.current[focusIdx]?.focus();
    },
    [error, setDigitAt],
  );

  const handleKeyPress = useCallback(
    (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Backspace') {
        if (digits[index] === '' && index > 0) {
          inputsRef.current[index - 1]?.focus();
          setDigitAt(index - 1, '');
        }
      }
    },
    [digits, setDigitAt],
  );

  const verifyMutation = useMutation({
    mutationFn: async () => {
      console.log('[OtpVerify] Verifying code for', identifier);
      const res = await verifyOtp(identifier, code, type);
      if (res.error) {
        const msg = res.error.message || 'Invalid code. Please try again.';
        const expired = /expired/i.test(msg);
        throw Object.assign(new Error(msg), { expired });
      }
      return res.data;
    },
    onSuccess: async () => {
      console.log('[OtpVerify] Success, navigating to feed');
      try {
        await restoreLastProfile();
      } catch (e) {
        console.log('[OtpVerify] restoreLastProfile failed:', e);
      }
      router.replace('/(tabs)/feed' as never);
    },
    onError: (e: Error & { expired?: boolean }) => {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (e.expired) {
        setError('This code has expired. Please request a new one.');
      } else if (nextAttempts >= MAX_ATTEMPTS) {
        setError('Too many attempts. Please request a new code.');
      } else {
        setError(e.message || 'Invalid code. Please try again.');
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      console.log('[OtpVerify] Resending OTP to', identifier);
      const res = await sendOtp(identifier, type);
      if (res.error) throw new Error(res.error.message);
      return null;
    },
    onSuccess: () => {
      setAttempts(0);
      setError('');
      setDigits(['', '', '', '', '', '']);
      setRemaining(RESEND_SECONDS);
      inputsRef.current[0]?.focus();
    },
    onError: (e: Error) => {
      setError(e.message || 'Could not resend code. Please try again.');
    },
  });

  const handleVerify = useCallback(() => {
    if (!allFilled || locked || verifyMutation.isPending) return;
    verifyMutation.mutate();
  }, [allFilled, locked, verifyMutation]);

  const handleResend = useCallback(() => {
    if (resendMutation.isPending) return;
    if (!locked && remaining > 0) return;
    resendMutation.mutate();
  }, [locked, remaining, resendMutation]);

  const masked = useMemo(() => maskIdentifier(identifier, type), [identifier, type]);
  const canResend = locked || remaining <= 0;

  const countdownText = useMemo(() => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `Resend in ${m}:${s.toString().padStart(2, '0')}`;
  }, [remaining]);

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
              <Text style={styles.headerTitle}>Enter OTP</Text>
              <Text style={styles.headerSubtitle}>6-digit verification code</Text>
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
              A 6-digit code was sent to{'\n'}
              <Text style={styles.introBold}>{masked}</Text>
            </Text>

            <View style={styles.otpRow}>
              {digits.map((digit, index) => {
                const isActive = digit !== '' || (index === digits.findIndex((d) => d === '') && !locked);
                return (
                  <View
                    key={`otp-${index}`}
                    style={[
                      styles.otpBox,
                      digit !== '' && styles.otpBoxFilled,
                      isActive && styles.otpBoxActive,
                      !!error && styles.otpBoxError,
                    ]}
                  >
                    <TextInput
                      ref={(ref) => {
                        inputsRef.current[index] = ref;
                      }}
                      style={styles.otpInput}
                      value={digit}
                      onChangeText={(t) => handleChange(index, t)}
                      onKeyPress={(e) => handleKeyPress(index, e)}
                      keyboardType="number-pad"
                      maxLength={index === 0 ? 6 : 1}
                      textContentType="oneTimeCode"
                      autoComplete={Platform.OS === 'ios' ? 'one-time-code' : 'sms-otp'}
                      editable={!locked && !verifyMutation.isPending}
                      selectTextOnFocus
                      testID={`otp-box-${index}`}
                    />
                  </View>
                );
              })}
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!allFilled || locked || verifyMutation.isPending) && styles.primaryBtnDisabled,
              ]}
              onPress={handleVerify}
              activeOpacity={0.85}
              disabled={!allFilled || locked || verifyMutation.isPending}
              testID="verify-btn"
            >
              {verifyMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Verify</Text>
                  <ArrowRight size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.resendWrap}>
              {canResend ? (
                <TouchableOpacity
                  onPress={handleResend}
                  activeOpacity={0.7}
                  disabled={resendMutation.isPending}
                  testID="resend-btn"
                >
                  {resendMutation.isPending ? (
                    <ActivityIndicator color={ACCENT} size="small" />
                  ) : (
                    <Text style={styles.resendActive}>Resend OTP</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendCountdown}>{countdownText}</Text>
              )}
            </View>
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
    textAlign: 'center',
  },
  introBold: {
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: ACCENT,
    backgroundColor: '#F8F6FF',
  },
  otpBoxActive: {
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  otpBoxError: {
    borderColor: ERROR_COLOR,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: ERROR_COLOR,
    marginTop: 6,
    marginBottom: 10,
    paddingLeft: 4,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
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
  resendWrap: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 4,
  },
  resendCountdown: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: TEXT_TERTIARY,
  },
  resendActive: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: ACCENT,
  },
});
