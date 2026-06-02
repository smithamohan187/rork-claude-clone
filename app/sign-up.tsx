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
  Alert,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRegister } from '@/hooks/useRegister';
import { THEME } from '@/theme/tokens';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Phone,
} from 'lucide-react-native';

const PRIMARY = THEME.colors.primary;
const PRIMARY_DARK = THEME.colors.primaryDark;
const INPUT_BG = '#F2F2F2';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#6B6B6B';
const TEXT_TERTIARY = '#9E9E9E';
const ERROR_COLOR = '#D14343';

const STRENGTH_RED = '#D14343';
const STRENGTH_ORANGE = '#E0A52E';
const STRENGTH_YELLOW = '#C9A227';
const STRENGTH_GREEN = '#00B246';

const AUTH_BG = require('../assets/images/auth-bg.png');

type AuthMode = 'email' | 'phone';
type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function computeStrength(pw: string): StrengthLevel {
  if (pw.length === 0) return 0;
  if (pw.length < 6) return 1;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  if (pw.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial) return 4;
  if (hasLetter && hasNumber) return 3;
  return 2;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  0: '',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};
const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  0: '#E5E5E5',
  1: STRENGTH_RED,
  2: STRENGTH_ORANGE,
  3: STRENGTH_YELLOW,
  4: STRENGTH_GREEN,
};

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<AuthMode>('email');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const { register, isPending, authError, showSlowSpinner, isDbError, clearAuthError } = useRegister({
    onSuccess: (res) => {
      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (res.hasSession) {
              router.replace('/(tabs)/feed' as never);
            } else {
              router.replace('/sign-in' as never);
            }
          },
        },
      ]);
    },
  });

  useEffect(() => {
    if (isDbError) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [isDbError]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const strength = useMemo(() => computeStrength(password), [password]);

  const nameError = submitted && fullName.trim().length === 0 ? 'Full name is required' : '';
  const emailError = submitted && mode === 'email' && !isValidEmail(email) ? 'Enter a valid email address' : '';
  const phoneError = submitted && mode === 'phone' && (phoneNumber.trim().length === 0 || !/^\d+$/.test(phoneNumber.trim()))
    ? 'Enter a valid phone number'
    : '';
  const passwordError = submitted
    ? password.length < 6
      ? 'Password must be at least 6 characters'
      : strength < 2
        ? 'Password is too weak'
        : ''
    : '';
  const confirmError = submitted && confirmPassword !== password ? 'Passwords do not match' : '';

  const handleRegister = useCallback(() => {
    if (isPending) return;
    setSubmitted(true);
    clearAuthError();
    if (fullName.trim().length === 0) return;
    if (mode === 'email' && !isValidEmail(email)) return;
    if (mode === 'phone' && (phoneNumber.trim().length === 0 || !/^\d+$/.test(phoneNumber.trim()))) return;
    if (password.length < 6 || computeStrength(password) < 2) return;
    if (confirmPassword !== password) return;
    register({ mode, fullName, email, phoneNumber, password });
  }, [fullName, mode, email, phoneNumber, password, confirmPassword, isPending, register, clearAuthError]);

  const switchMode = useCallback((next: AuthMode) => {
    if (next === mode) return;
    if (next === 'email') setPhoneNumber('');
    else setEmail('');
    setMode(next);
    setSubmitted(false);
    clearAuthError();
  }, [mode, clearAuthError]);

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
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Step 2 of 2 — Your details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputWrap, focusedField === 'name' && styles.inputWrapFocused, !!nameError && styles.inputWrapError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={fullName}
                    onChangeText={(t) => { setFullName(t); if (submitted) setSubmitted(false); }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    testID="fullname-input"
                  />
                </View>
                {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'email' && styles.toggleBtnActive]}
                  onPress={() => switchMode('email')}
                  activeOpacity={0.85}
                  testID="toggle-email"
                >
                  <Mail size={16} color={mode === 'email' ? '#FFF' : TEXT_SECONDARY} />
                  <Text style={[styles.toggleText, mode === 'email' && styles.toggleTextActive]}>Use Email</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'phone' && styles.toggleBtnActive]}
                  onPress={() => switchMode('phone')}
                  activeOpacity={0.85}
                  testID="toggle-phone"
                >
                  <Phone size={16} color={mode === 'phone' ? '#FFF' : TEXT_SECONDARY} />
                  <Text style={[styles.toggleText, mode === 'phone' && styles.toggleTextActive]}>Use Phone</Text>
                </TouchableOpacity>
              </View>

              {mode === 'email' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused, !!emailError && styles.inputWrapError]}>
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor={TEXT_TERTIARY}
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (submitted) setSubmitted(false); }}
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
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={[styles.inputWrap, focusedField === 'phone' && styles.inputWrapFocused, !!phoneError && styles.inputWrapError]}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="98765 43210"
                      placeholderTextColor={TEXT_TERTIARY}
                      value={phoneNumber}
                      onChangeText={(t) => { setPhoneNumber(t.replace(/\D/g, '')); if (submitted) setSubmitted(false); }}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="phone-pad"
                      testID="phone-input"
                    />
                  </View>
                  {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused, !!passwordError && styles.inputWrapError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (submitted) setSubmitted(false); }}
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

                {password.length > 0 && (
                  <View style={styles.strengthWrap}>
                    <View style={styles.strengthBar}>
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthSeg,
                            { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : '#E5E5E5' },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                      {STRENGTH_LABELS[strength]}
                    </Text>
                  </View>
                )}

                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[styles.inputWrap, focusedField === 'confirm' && styles.inputWrapFocused, !!confirmError && styles.inputWrapError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); if (submitted) setSubmitted(false); }}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    testID="confirm-password-input"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {showConfirm ? <EyeOff size={18} color={TEXT_TERTIARY} /> : <Eye size={18} color={TEXT_TERTIARY} />}
                  </TouchableOpacity>
                </View>
                {!!confirmError && <Text style={styles.errorText}>{confirmError}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
                <View style={[styles.inputWrap, focusedField === 'referral' && styles.inputWrapFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter code if you have one"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={referralCode}
                    onChangeText={setReferralCode}
                    onFocus={() => setFocusedField('referral')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    testID="referral-code-input"
                  />
                </View>
                <Text style={styles.helperText}>
                  Have a referral code from a friend? Enter it here to earn bonus points.
                </Text>
              </View>

              {!!authError && (
                <View style={styles.authErrorBox}>
                  <Text style={styles.authErrorText}>{authError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, isPending && styles.primaryBtnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.9}
                disabled={isPending}
                testID="register-btn"
              >
                {isPending ? (
                  <View style={styles.primaryBtnInner}>
                    {showSlowSpinner && <ActivityIndicator color="#FFF" size="small" />}
                    <Text style={styles.primaryBtnText}>Creating account...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.replace('/sign-in' as never)}
                activeOpacity={0.7}
                testID="login-link"
              >
                <Text style={styles.loginLinkText}>
                  Already have an account? <Text style={styles.loginLinkBold}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0E2A1A' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerRow: { paddingHorizontal: 16, paddingTop: 4 },
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
    paddingHorizontal: 20,
    paddingTop: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontFamily: THEME.font.bold,
    fontSize: 26,
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
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontFamily: THEME.font.semibold,
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
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
  inputWrapFocused: { borderColor: PRIMARY },
  inputWrapError: { borderColor: ERROR_COLOR },
  input: {
    flex: 1,
    fontFamily: THEME.font.regular,
    fontSize: 15,
    fontWeight: '400' as const,
    color: TEXT_PRIMARY,
    height: '100%',
  },
  countryCode: {
    paddingRight: 10,
    marginRight: 2,
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
    height: 24,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontFamily: THEME.font.semibold,
    fontSize: 15,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
  },
  helperText: {
    fontFamily: THEME.font.regular,
    fontSize: 12,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    marginTop: 6,
    paddingLeft: 4,
  },
  errorText: {
    fontFamily: THEME.font.medium,
    fontSize: 12,
    fontWeight: '500' as const,
    color: ERROR_COLOR,
    marginTop: 6,
    paddingLeft: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: INPUT_BG,
    borderRadius: 50,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 50,
  },
  toggleBtnActive: { backgroundColor: PRIMARY_DARK },
  toggleText: {
    fontFamily: THEME.font.semibold,
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_SECONDARY,
  },
  toggleTextActive: { color: '#FFF' },
  strengthWrap: { marginTop: 10 },
  strengthBar: { flexDirection: 'row', gap: 6 },
  strengthSeg: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: {
    fontFamily: THEME.font.semibold,
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 6,
    paddingLeft: 4,
  },
  authErrorBox: {
    backgroundColor: '#FCEAEA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  authErrorText: {
    fontFamily: THEME.font.medium,
    fontSize: 13,
    fontWeight: '500' as const,
    color: ERROR_COLOR,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_DARK,
    height: 52,
    borderRadius: 50,
    marginTop: 4,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    fontFamily: THEME.font.semibold,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  loginLink: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  loginLinkText: {
    fontFamily: THEME.font.regular,
    fontSize: 14,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
  },
  loginLinkBold: {
    fontFamily: THEME.font.semibold,
    fontWeight: '600' as const,
    color: PRIMARY_DARK,
  },
});
