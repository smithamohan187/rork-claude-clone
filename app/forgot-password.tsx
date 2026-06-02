import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { sendPasswordResetEmail } from '@/services/authService';
import { ArrowLeft, Mail, ArrowRight } from 'lucide-react-native';

const ACCENT = '#1A5C35';
const BG = '#FAFAFA';
const SURFACE = '#FFFFFF';
const BORDER = '#E8ECF0';
const TEXT_PRIMARY = '#1B1B2F';
const TEXT_SECONDARY = '#6B7280';
const TEXT_TERTIARY = '#A0A7B5';
const ERROR_COLOR = '#EF4444';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [focused, setFocused] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const sendMutation = useMutation({
    mutationFn: async (targetEmail: string) => {
      const res = await sendPasswordResetEmail(targetEmail);
      if (res.error) throw new Error(res.error.message);
      return targetEmail;
    },
    onSuccess: (targetEmail) => {
      console.log('[ForgotPassword] reset email sent to', targetEmail);
      router.replace({
        pathname: '/password-reset-sent',
        params: { email: targetEmail },
      } as never);
    },
    onError: (err: Error) => {
      console.log('[ForgotPassword] send failed:', err.message);
      setError(err.message);
    },
  });

  const handleSubmit = useCallback(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    sendMutation.mutate(trimmed);
  }, [email, sendMutation]);

  return (
    <View style={styles.container} testID="forgot-password-screen">
      <View style={styles.headerArea}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="forgot-back-btn"
            >
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Reset Password</Text>
              <Text style={styles.headerSubtitle}>We&apos;ll help you get back in</Text>
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
            <Text style={styles.heading}>Forgot Password</Text>
            <Text style={styles.subtext}>
              Enter your registered email. We&apos;ll send you a reset link.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputWrap,
                  focused && styles.inputWrapFocused,
                  !!error && styles.inputWrapError,
                ]}
              >
                <Mail size={18} color={focused ? ACCENT : TEXT_TERTIARY} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={TEXT_TERTIARY}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t.toLowerCase());
                    if (error) setError('');
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="forgot-email-input"
                />
              </View>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                sendMutation.isPending && styles.primaryBtnDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={sendMutation.isPending}
              testID="send-reset-link-btn"
            >
              {sendMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                  <ArrowRight size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.back()}
              activeOpacity={0.7}
              testID="back-to-login-link"
            >
              <Text style={styles.backLinkText}>
                Remembered it? <Text style={styles.backLinkBold}>Back to Login</Text>
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
  headerArea: {
    backgroundColor: ACCENT,
    paddingBottom: 28,
    overflow: 'hidden',
  },
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
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 28,
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
  primaryBtnDisabled: { opacity: 0.6 },
  backLink: {
    alignItems: 'center',
    paddingVertical: 18,
    marginTop: 6,
  },
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
