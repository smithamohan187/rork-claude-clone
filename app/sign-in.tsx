import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Alert,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { isApiConfigured } from '@/api/client';
import { authApi } from '@/api/auth.api';
import { useAuth } from '@/contexts/AuthContext';
import { THEME } from '@/theme/tokens';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Smartphone,
  ArrowRight,
} from 'lucide-react-native';

const PRIMARY = THEME.colors.primary;
const PRIMARY_DARK = THEME.colors.primaryDark;
const INPUT_BG = '#F2F2F2';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#6B6B6B';
const TEXT_TERTIARY = '#9E9E9E';
const ERROR_COLOR = '#D14343';

const AUTH_BG = require('../assets/images/auth-bg.png');

type AuthMode = 'email' | 'otp';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, restoreLastProfile } = useAuth();

  const [mode] = useState<AuthMode>('email');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const emailError = submitted && mode === 'email' && !isValidEmail(email) ? 'Enter a valid email address' : '';
  const passwordError = submitted && mode === 'email' && password.length === 0 ? 'Password is required' : '';
  const phoneError = submitted && mode === 'otp' && phoneNumber.trim().length < 6 ? 'Enter a valid phone number' : '';

  const handleLogin = useCallback(async () => {
    setSubmitted(true);
    if (mode === 'email') {
      if (!isValidEmail(email) || password.length === 0) return;
    } else {
      if (phoneNumber.trim().length < 6) return;
    }
    setApiError(null);
    setLoading(true);
    try {
      if (!isApiConfigured) {
        setApiError('Backend is not configured.');
        return;
      }
      if (mode === 'email') {
        console.log('[SignIn] Logging in with email:', email);
        const result = await authApi.login({ email: email.trim(), password });
                if (!result.success) {
                  console.log('[SignIn] Auth error:', result.error);
                  const isNetworkError =
                    result.error === 'Network request failed' ||
                    result.error === 'Failed to fetch' ||
                    result.error === 'Network error';
                  setApiError(isNetworkError ? 'Unable to connect. Please try again.' : (result.error ?? 'Login failed'));
                  return;
                }
        console.log('[SignIn] Login success, restoring last active profile...');
        const profileType = await restoreLastProfile();
        console.log('[SignIn] Restored profile type:', profileType);
        router.replace('/(tabs)/feed' as never);
        
      } else {
        console.log('[SignIn] Sending OTP to:', phoneNumber);
        const result = await authApi.sendOtp({ identifier: phoneNumber.trim(), type: 'phone' });
        if (!result.success) {
          console.log('[SignIn] OTP error:', result.error);
          const isNetworkError =
            result.error === 'Network request failed' ||
            result.error === 'Failed to fetch' ||
            result.error === 'Network error';
          setApiError(isNetworkError ? 'Unable to connect. Please try again.' : (result.error ?? 'Could not send code'));
          return;
        }
        Alert.alert('OTP Sent', 'Check your phone for the verification code.');
      }
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, phoneNumber, login, restoreLastProfile, router]);

  return (
    <ImageBackground source={AUTH_BG} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="back-btn"
          >
            <ArrowLeft size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>

              {mode === 'email' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused, !!emailError && styles.inputWrapError]}>
                      <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor={TEXT_TERTIARY}
                        value={email}
                        onChangeText={(t) => { setEmail(t); if (submitted) setSubmitted(false); setApiError(null); }}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        testID="email-input"
                      />
                    </View>
                    {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <TouchableOpacity
                        testID="forgot-password-link"
                        onPress={() => router.push('/forgot-password')}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.forgotLink}>Forgot Password?</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused, !!passwordError && styles.inputWrapError]}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor={TEXT_TERTIARY}
                        value={password}
                        onChangeText={(t) => { setPassword(t); if (submitted) setSubmitted(false); setApiError(null); }}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        testID="password-input"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        {showPassword ? <EyeOff size={18} color={TEXT_TERTIARY} /> : <Eye size={18} color={TEXT_TERTIARY} />}
                      </TouchableOpacity>
                    </View>
                    {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                  </View>
                </>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={[styles.inputWrap, focusedField === 'phone' && styles.inputWrapFocused, !!phoneError && styles.inputWrapError]}>
                    <TextInput
                      style={styles.input}
                      placeholder="+1 (555) 000-0000"
                      placeholderTextColor={TEXT_TERTIARY}
                      value={phoneNumber}
                      onChangeText={(t) => { setPhoneNumber(t); if (submitted) setSubmitted(false); setApiError(null); }}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="phone-pad"
                      testID="phone-input"
                    />
                  </View>
                  {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
                  <Text style={styles.otpHint}>We&apos;ll send a one-time verification code to this number</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.9}
                disabled={loading}
                testID="login-btn"
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {mode === 'email' ? 'Login' : 'Send OTP'}
                  </Text>
                )}
              </TouchableOpacity>
              {!!apiError && <Text style={styles.apiErrorText}>{apiError}</Text>}

              <TouchableOpacity
                style={styles.otpToggle}
                onPress={() => router.push('/otp-request' as never)}
                activeOpacity={0.7}
                testID="otp-toggle"
              >
                <Smartphone size={16} color={PRIMARY_DARK} />
                <Text style={styles.otpToggleText}>Login with OTP instead</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.85}
                onPress={() => console.log('[SignIn] Google login tapped')}
                testID="google-btn"
              >
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signUpLink}
                onPress={() => router.replace('/sign-up' as never)}
                activeOpacity={0.7}
                testID="signup-link"
              >
                <Text style={styles.signUpLinkText}>
                  Don&apos;t have an account? <Text style={styles.signUpLinkBold}>Sign Up</Text>
                  <ArrowRight size={12} color={PRIMARY_DARK} />
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0E2A1A' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontFamily: THEME.font.bold,
    fontSize: 28,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: THEME.font.regular,
    fontSize: 14,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    marginTop: 6,
    marginBottom: 22,
  },
  inputGroup: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontFamily: THEME.font.semibold,
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  forgotLink: {
    fontFamily: THEME.font.semibold,
    fontSize: 13,
    fontWeight: '600' as const,
    color: PRIMARY_DARK,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    height: 52,
    gap: 10,
  },
  inputWrapFocused: {
    borderColor: PRIMARY,
  },
  inputWrapError: {
    borderColor: ERROR_COLOR,
  },
  input: {
    flex: 1,
    fontFamily: THEME.font.regular,
    fontSize: 15,
    fontWeight: '400' as const,
    color: TEXT_PRIMARY,
    height: '100%',
  },
  errorText: {
    fontFamily: THEME.font.medium,
    fontSize: 12,
    fontWeight: '500' as const,
    color: ERROR_COLOR,
    marginTop: 6,
    paddingLeft: 4,
  },
  otpHint: {
    fontFamily: THEME.font.regular,
    fontSize: 12,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    marginTop: 8,
    paddingLeft: 4,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_DARK,
    height: 52,
    borderRadius: 50,
    marginTop: 10,
  },
  primaryBtnText: {
    fontFamily: THEME.font.semibold,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  apiErrorText: {
    fontFamily: THEME.font.medium,
    fontSize: 13,
    fontWeight: '500' as const,
    color: ERROR_COLOR,
    textAlign: 'center',
    marginTop: 10,
  },
  otpToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 8,
  },
  otpToggleText: {
    fontFamily: THEME.font.semibold,
    fontSize: 14,
    fontWeight: '600' as const,
    color: PRIMARY_DARK,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0F0F0' },
  dividerText: {
    fontFamily: THEME.font.medium,
    fontSize: 12,
    fontWeight: '500' as const,
    color: TEXT_SECONDARY,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: INPUT_BG,
    borderRadius: 50,
    height: 52,
  },
  socialIcon: {
    fontFamily: THEME.font.bold,
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4285F4',
  },
  socialText: {
    fontFamily: THEME.font.semibold,
    fontSize: 15,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
  },
  signUpLink: { alignItems: 'center', paddingVertical: 16 },
  signUpLinkText: {
    fontFamily: THEME.font.regular,
    fontSize: 14,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
  },
  signUpLinkBold: {
    fontFamily: THEME.font.semibold,
    fontWeight: '600' as const,
    color: PRIMARY_DARK,
  },
});
