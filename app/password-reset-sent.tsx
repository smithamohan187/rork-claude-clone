import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
//import { sendPasswordResetEmail } from '@/services/authService';
import { MailCheck } from 'lucide-react-native';

const ACCENT = '#1A5C35';
const ACCENT_LIGHT = '#E8F5EE';
const BG = '#FAFAFA';
const BORDER = '#E8ECF0';
const TEXT_PRIMARY = '#1B1B2F';
const TEXT_SECONDARY = '#6B7280';

const COOLDOWN_SECONDS = 60;

export default function PasswordResetSentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? '').toString();

  const [secondsLeft, setSecondsLeft] = useState<number>(COOLDOWN_SECONDS);
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await sendPasswordResetEmail(email);
      if (res.error) throw new Error(res.error.message);
      return true;
    },
    onSuccess: () => {
      console.log('[PasswordResetSent] resent to', email);
      setSecondsLeft(COOLDOWN_SECONDS);
      Alert.alert('Email Sent', 'We sent another reset link to your inbox.');
    },
    onError: (err: Error) => {
      console.log('[PasswordResetSent] resend failed:', err.message);
      Alert.alert('Could Not Resend', err.message);
    },
  });

  const handleResend = useCallback(() => {
    if (secondsLeft > 0 || resendMutation.isPending) return;
    resendMutation.mutate();
  }, [secondsLeft, resendMutation]);

  const handleBackToLogin = useCallback(() => {
    router.replace('/sign-in' as never);
  }, [router]);

  const canResend = secondsLeft === 0 && !resendMutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="password-reset-sent-screen">
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconBadge,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.iconInner}>
            <MailCheck size={44} color={ACCENT} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.heading}>Check Your Email</Text>
          <Text style={styles.subtext}>
            We&apos;ve sent a password reset link to{' '}
            <Text style={styles.emailHighlight}>{email || 'your email'}</Text>. Check your
            inbox and follow the link to reset your password.
          </Text>
        </Animated.View>

        <TouchableOpacity
          style={[styles.secondaryBtn, !canResend && styles.secondaryBtnDisabled]}
          onPress={handleResend}
          activeOpacity={0.85}
          disabled={!canResend}
          testID="resend-email-btn"
        >
          {resendMutation.isPending ? (
            <ActivityIndicator color={ACCENT} size="small" />
          ) : (
            <Text style={[styles.secondaryBtnText, !canResend && styles.secondaryBtnTextDisabled]}>
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend Email'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.backLink}
        onPress={handleBackToLogin}
        activeOpacity={0.7}
        testID="back-to-login-btn"
      >
        <Text style={styles.backLinkText}>Back to Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.6,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: 36,
  },
  emailHighlight: {
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnDisabled: {
    borderColor: BORDER,
    backgroundColor: '#F5F5F7',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: ACCENT,
  },
  secondaryBtnTextDisabled: {
    color: TEXT_SECONDARY,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 8,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: ACCENT,
  },
});
