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
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '@/theme/tokens';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import { setAuthToken, setRefreshToken } from '@/api/client';

const PRIMARY      = THEME.colors.primary;
const PRIMARY_DARK = THEME.colors.primaryDark;
const INPUT_BG     = '#F2F2F2';
const TEXT_PRIMARY   = '#1A1A1A';
const TEXT_SECONDARY = '#6B6B6B';
const TEXT_TERTIARY  = '#9E9E9E';
const ERROR_COLOR    = '#D14343';
const SECTION_COLOR  = 'rgba(26,92,53,0.55)';

const STRENGTH_COLORS = {
  0: '#E5E5E5',
  1: '#D14343',
  2: '#E0A52E',
  3: '#C9A227',
  4: '#00B246',
} as const;
const STRENGTH_LABELS = { 0: '', 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong' } as const;

const INTEREST_CATEGORIES = [
  'Food & Dining',
  'Shopping & Fashion',
  'Health & Fitness',
  'Beauty & Wellness',
  'Entertainment',
  'Travel & Tourism',
  'Technology',
  'Home & Garden',
  'Sports & Recreation',
  'Education',
  'Automotive',
  'Finance & Banking',
];

const AUTH_BG = require('../assets/images/auth-bg.png');

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function computeStrength(pw: string): StrengthLevel {
  if (pw.length === 0) return 0;
  if (pw.length < 6) return 1;
  const hasUpper   = /[A-Z]/.test(pw);
  const hasLower   = /[a-z]/.test(pw);
  const hasNumber  = /[0-9]/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  if (pw.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial) return 4;
  if (/[a-zA-Z]/.test(pw) && hasNumber) return 3;
  return 2;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignUpScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  // Form fields
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [phoneNumber, setPhoneNumber]         = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation]               = useState('');
  const [interests, setInterests]             = useState<string[]>([]);
  const [referralCode, setReferralCode]       = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [focusedField, setFocusedField]       = useState<string | null>(null);
  const [submitted, setSubmitted]             = useState(false);

  // Registration state — managed locally so finally() always resets it
  const [loading, setLoading]   = useState(false);
  const [authError, setAuthError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const strength = useMemo(() => computeStrength(password), [password]);

  const nameError     = submitted && fullName.trim().length === 0 ? 'Full name is required' : '';
  const emailError    = submitted && !isValidEmail(email) ? 'Enter a valid email address' : '';
  const passwordError = submitted
    ? password.length < 6 ? 'Password must be at least 6 characters'
      : strength < 2 ? 'Password is too weak' : ''
    : '';
  const confirmError = submitted && confirmPassword !== password ? 'Passwords do not match' : '';

  const toggleInterest = useCallback((cat: string) => {
    setInterests(prev =>
      prev.includes(cat) ? prev.filter(i => i !== cat) : [...prev, cat],
    );
  }, []);

  // ── Registration handler ────────────────────────────────────────────────────
  const handleRegister = useCallback(async () => {
    if (loading) return;

    setSubmitted(true);
    setAuthError('');
    setDebugInfo('');

    // Client-side validation — bail out without touching loading state
    if (fullName.trim().length === 0) return;
    if (!isValidEmail(email)) return;
    if (password.length < 6 || computeStrength(password) < 2) return;
    if (confirmPassword !== password) return;

    setLoading(true);

    try {
      setDebugInfo('Step 1/4 — Sending registration request…');
      const result = await authApi.signup({
        email:         email.trim().toLowerCase(),
        password,
        full_name:     fullName.trim(),
        phone:         phoneNumber.trim() || undefined,
        location:      location.trim()   || undefined,
        interests:     interests.length  ? interests : undefined,
        referral_code: referralCode.trim().toUpperCase() || undefined,
      });

      if (!result.success || !result.data) {
        const msg = result.error ?? 'Registration failed. Please try again.';
        setDebugInfo(`Error: ${msg}`);
        setAuthError(msg);
        return; // finally still runs
      }

      setDebugInfo('Step 2/4 — Storing access token…');
      await setAuthToken(result.data.accessToken);

      setDebugInfo('Step 3/4 — Storing refresh token…');
      await setRefreshToken(result.data.refreshToken);

      setDebugInfo('Step 4/4 — Success! Navigating to home…');
      // Replace immediately — no Alert blocking the thread
      router.replace('/(tabs)/feed' as never);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      console.error('[SignUp] handleRegister error:', msg, err);
      setDebugInfo(`Error: ${msg}`);
      setAuthError(msg);
    } finally {
      // Always re-enable the button so the screen is never frozen
      setLoading(false);
    }
  }, [
    loading, fullName, email, phoneNumber,
    password, confirmPassword, location, interests, referralCode, router,
  ]);

  const inputFocus    = (field: string) => () => setFocusedField(field);
  const inputBlur     = () => setFocusedField(null);
  const clearOnChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (submitted) setSubmitted(false);
  };

  return (
    <ImageBackground source={AUTH_BG} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

              {/* Header */}
              <Text style={styles.title}>Create your account</Text>
              <View style={styles.accentBar} />

              {/* ── Personal Info ── */}
              <Text style={styles.sectionLabel}>PERSONAL INFO</Text>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Full Name<Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrap, focusedField === 'name' && styles.inputWrapFocused, !!nameError && styles.inputWrapError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={fullName}
                    onChangeText={clearOnChange(setFullName)}
                    onFocus={inputFocus('name')}
                    onBlur={inputBlur}
                    autoCapitalize="words"
                  />
                </View>
                {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Email Address<Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused, !!emailError && styles.inputWrapError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={email}
                    onChangeText={clearOnChange(setEmail)}
                    onFocus={inputFocus('email')}
                    onBlur={inputBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

              {/* Phone (optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Phone Number<Text style={styles.optionalTag}> (Optional)</Text>
                </Text>
                <View style={[styles.inputWrap, focusedField === 'phone' && styles.inputWrapFocused]}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="98765 43210"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={phoneNumber}
                    onChangeText={(t) => setPhoneNumber(t.replace(/\D/g, ''))}
                    onFocus={inputFocus('phone')}
                    onBlur={inputBlur}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              {/* ── Security ── */}
              <Text style={styles.sectionLabel}>SECURITY</Text>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Password<Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused, !!passwordError && styles.inputWrapError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={password}
                    onChangeText={clearOnChange(setPassword)}
                    onFocus={inputFocus('password')}
                    onBlur={inputBlur}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {showPassword ? <EyeOff size={18} color={TEXT_TERTIARY} /> : <Eye size={18} color={TEXT_TERTIARY} />}
                  </TouchableOpacity>
                </View>
                {password.length > 0 && (
                  <View style={styles.strengthWrap}>
                    <View style={styles.strengthBar}>
                      {([1, 2, 3, 4] as const).map(i => (
                        <View key={i} style={[styles.strengthSeg, { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : '#E5E5E5' }]} />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                      {STRENGTH_LABELS[strength]}
                    </Text>
                  </View>
                )}
                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Confirm Password<Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrap, focusedField === 'confirm' && styles.inputWrapFocused, !!confirmError && styles.inputWrapError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={confirmPassword}
                    onChangeText={clearOnChange(setConfirmPassword)}
                    onFocus={inputFocus('confirm')}
                    onBlur={inputBlur}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {showConfirm ? <EyeOff size={18} color={TEXT_TERTIARY} /> : <Eye size={18} color={TEXT_TERTIARY} />}
                  </TouchableOpacity>
                </View>
                {!!confirmError && <Text style={styles.errorText}>{confirmError}</Text>}
              </View>

              <View style={styles.divider} />

              {/* ── Preferences ── */}
              <Text style={styles.sectionLabel}>PREFERENCES</Text>

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Location<Text style={styles.optionalTag}> (Optional)</Text>
                </Text>
                <View style={[styles.inputWrap, focusedField === 'location' && styles.inputWrapFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="City or area you're in"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={location}
                    onChangeText={setLocation}
                    onFocus={inputFocus('location')}
                    onBlur={inputBlur}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Areas of Interest */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Areas of Interest<Text style={styles.optionalTag}> (Optional)</Text>
                </Text>
                <Text style={styles.helperText}>Select all that apply</Text>
                <View style={styles.chipsWrap}>
                  {INTEREST_CATEGORIES.map(cat => {
                    const selected = interests.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => toggleInterest(cat)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.divider} />

              {/* ── Referral ── */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Referral Code<Text style={styles.optionalTag}> (Optional)</Text>
                </Text>
                <View style={[styles.inputWrap, focusedField === 'referral' && styles.inputWrapFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter code if you have one"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={referralCode}
                    onChangeText={setReferralCode}
                    onFocus={inputFocus('referral')}
                    onBlur={inputBlur}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
                <Text style={styles.helperText}>Earn bonus points when you sign up with a friend's code.</Text>
              </View>

              {/* Inline auth error */}
              {!!authError && (
                <View style={styles.authErrorBox}>
                  <Text style={styles.authErrorText}>{authError}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.9}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.primaryBtnInner}>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={styles.primaryBtnText}>Creating account…</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* Debug progress — visible step-by-step trace */}
              {!!debugInfo && (
                <Text style={styles.debugInfo} testID="debug-info">{debugInfo}</Text>
              )}

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.replace('/sign-in' as never)}
                activeOpacity={0.7}
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
  bg:      { flex: 1, backgroundColor: '#0E2A1A' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
  safe:    { flex: 1 },
  flex:    { flex: 1 },
  headerRow: { paddingHorizontal: 16, paddingTop: 4 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },

  /* Header */
  title: {
    fontFamily: THEME.font.bold,
    fontSize: 26,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  accentBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY,
    marginTop: 10,
    marginBottom: 20,
  },

  /* Section labels */
  sectionLabel: {
    fontFamily: THEME.font.semibold,
    fontSize: 11,
    fontWeight: '600' as const,
    color: SECTION_COLOR,
    letterSpacing: 1.1,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 20,
  },

  /* Fields */
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontFamily: THEME.font.semibold,
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  required: {
    color: '#D14343',
    fontSize: 13,
  },
  optionalTag: {
    fontFamily: THEME.font.regular,
    fontSize: 12,
    fontWeight: '400' as const,
    color: TEXT_TERTIARY,
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
  inputWrapError:   { borderColor: ERROR_COLOR },
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
    borderRightColor: '#E0E0E0',
    height: 24,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontFamily: THEME.font.semibold,
    fontSize: 15,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
  },

  /* Password strength */
  strengthWrap:  { marginTop: 10 },
  strengthBar:   { flexDirection: 'row', gap: 6 },
  strengthSeg:   { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: {
    fontFamily: THEME.font.semibold,
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 6,
    paddingLeft: 2,
  },

  /* Chips */
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#D8D8D8',
    backgroundColor: '#F7F7F7',
  },
  chipSelected: {
    backgroundColor: PRIMARY_DARK,
    borderColor: PRIMARY_DARK,
  },
  chipText: {
    fontFamily: THEME.font.medium,
    fontSize: 13,
    fontWeight: '500' as const,
    color: TEXT_SECONDARY,
  },
  chipTextSelected: { color: '#FFFFFF' },

  /* Helpers & errors */
  helperText: {
    fontFamily: THEME.font.regular,
    fontSize: 12,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    marginTop: 6,
    paddingLeft: 2,
  },
  errorText: {
    fontFamily: THEME.font.medium,
    fontSize: 12,
    fontWeight: '500' as const,
    color: ERROR_COLOR,
    marginTop: 6,
    paddingLeft: 2,
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

  /* Button */
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_DARK,
    height: 52,
    borderRadius: 50,
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtnText: {
    fontFamily: THEME.font.semibold,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },

  /* Debug info — step-by-step trace shown below the button */
  debugInfo: {
    fontFamily: THEME.font.regular,
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#888888',
    marginTop: 10,
    paddingHorizontal: 4,
    lineHeight: 16,
    textAlign: 'center',
  },

  /* Footer */
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
