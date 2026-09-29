import React, { useRef, useEffect, useState } from 'react';
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
import { Snackbar } from 'react-native-paper';
import { THEME } from '@/theme/tokens';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useBusinessSignUp } from '@/hooks/useBusinessSignUp';
import { fetchBusinessCategories, Category } from '@/api/services/categoriesService';

const PRIMARY      = THEME.colors.primary;
const PRIMARY_DARK = THEME.colors.primaryDark;
const INPUT_BG     = '#F2F2F2';
const TEXT_PRIMARY   = '#1A1A1A';
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

const AUTH_BG = require('../../assets/images/auth-bg.png');

export default function BusinessSignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    businessName, setBusinessName,
    email,        setEmail,
    password,     setPassword,
    confirmPassword, setConfirmPassword,
    categoryId,   setCategoryId,
    showPassword, setShowPassword,
    showConfirm,  setShowConfirm,
    focusedField,
    strength,
    nameError, emailError, passwordError, confirmError, categoryError,
    loading, authError, registrationSucceeded,
    handleRegister,
    inputFocus,
    inputBlur,
    clearOnChange,
  } = useBusinessSignUp();

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    setCategoriesLoading(true);
    fetchBusinessCategories()
      .then(setCategories)
      .catch(err => { if (__DEV__) console.error('[business-sign-up] fetchBusinessCategories error:', err); })
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    if (registrationSucceeded) setSnackbarVisible(true);
  }, [registrationSucceeded]);

  const handleSnackbarDismiss = () => {
    setSnackbarVisible(false);
    router.replace('/(tabs)/feed' as never);
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

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

              <Text style={styles.title}>Set up your business</Text>
              <Text style={styles.subtitle}>Just the basics for now — you can finish the rest from your dashboard.</Text>
              <View style={styles.accentBar} />

              <Text style={styles.sectionLabel}>BUSINESS INFO</Text>

              {/* Business Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Business Name<Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrap, focusedField === 'name' && styles.inputWrapFocused, !!nameError && styles.inputWrapError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Brew & Co"
                    placeholderTextColor={TEXT_TERTIARY}
                    value={businessName}
                    onChangeText={clearOnChange(setBusinessName)}
                    onFocus={inputFocus('name')}
                    onBlur={inputBlur}
                    autoCapitalize="words"
                    maxLength={100}
                    testID="business-signup-name-input"
                  />
                </View>
                {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Category<Text style={styles.required}> *</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.inputWrap, !!categoryError && styles.inputWrapError]}
                  onPress={() => setShowCategoryPicker(v => !v)}
                  activeOpacity={0.7}
                  testID="business-signup-category-selector"
                >
                  <Text style={[styles.input, !selectedCategory && { color: TEXT_TERTIARY }]}>
                    {selectedCategory ? selectedCategory.name : 'Select a category'}
                  </Text>
                  {categoriesLoading && <ActivityIndicator size="small" color={PRIMARY} />}
                </TouchableOpacity>
                {showCategoryPicker && (
                  <View style={styles.categoryList}>
                    {categories.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.categoryItem}
                        onPress={() => { setCategoryId(cat.id); setShowCategoryPicker(false); }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.categoryItemText, categoryId === cat.id && styles.categoryItemTextSelected]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {!!categoryError && <Text style={styles.errorText}>{categoryError}</Text>}
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>ACCOUNT</Text>

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
                    testID="business-signup-email-input"
                  />
                </View>
                {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

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
                    testID="business-signup-password-input"
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
                    testID="business-signup-confirm-input"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {showConfirm ? <EyeOff size={18} color={TEXT_TERTIARY} /> : <Eye size={18} color={TEXT_TERTIARY} />}
                  </TouchableOpacity>
                </View>
                {!!confirmError && <Text style={styles.errorText}>{confirmError}</Text>}
              </View>

              {!!authError && (
                <View style={styles.authErrorBox}>
                  <Text style={styles.authErrorText}>{authError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.9}
                disabled={loading}
                testID="business-signup-submit-btn"
              >
                {loading ? (
                  <View style={styles.primaryBtnInner}>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={styles.primaryBtnText}>Setting up…</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Create Business Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.replace('/(auth)/sign-in' as never)}
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={handleSnackbarDismiss}
        duration={3000}
      >
        Business account created! Let's finish setting things up.
      </Snackbar>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg:      { flex: 1, backgroundColor: '#0E2A1A' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.32)' },
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

  title: {
    fontFamily: THEME.font.bold,
    fontSize: 26,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: THEME.font.regular,
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 6,
  },
  accentBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY,
    marginTop: 12,
    marginBottom: 20,
  },

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

  categoryList: {
    marginTop: 8,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  categoryItemText: {
    fontFamily: THEME.font.regular,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  categoryItemTextSelected: {
    fontFamily: THEME.font.semibold,
    fontWeight: '600' as const,
    color: PRIMARY_DARK,
  },

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

  loginLink: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  loginLinkText: {
    fontFamily: THEME.font.regular,
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#6B6B6B',
  },
  loginLinkBold: {
    fontFamily: THEME.font.semibold,
    fontWeight: '600' as const,
    color: PRIMARY_DARK,
  },
});
