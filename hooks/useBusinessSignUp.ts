import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signUp } from '@/api/services/authService';
import { registerBusiness } from '@/api/services/businessService';

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function computeStrength(pw: string): StrengthLevel {
  if (pw.length === 0) return 0;
  if (pw.length < 8) return 1;
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

const SPECIAL_CHAR_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

// Business owners get a minimal signup: Business Name, Email/Password, Category only. Under the
// hood this still needs a real user account (registerBusiness only adds a business profile onto
// an already-authenticated user — see business-create.md), so this chains the ordinary customer
// signUp() call (full_name defaulted to the business name since the minimal form doesn't collect
// one; location is already optional server-side) with registerBusiness(), then refreshProfiles()
// to pick up the resulting accountType flip to 'business'.
export function useBusinessSignUp() {
  const { loginWithTokens, refreshProfiles, updateAuthUser } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [categoryId, setCategoryId]     = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [authError, setAuthError] = useState('');
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false);

  const strength = useMemo(() => computeStrength(password), [password]);

  const nameError = submitted && businessName.trim().length === 0 ? 'Business name is required' : '';
  const emailError = submitted && !isValidEmail(email) ? 'Enter a valid email address' : '';
  const passwordError = submitted
    ? password.length < 8 ? 'Password must be at least 8 characters'
      : !/[A-Z]/.test(password) ? 'Password must contain at least one uppercase letter'
      : !SPECIAL_CHAR_RE.test(password) ? 'Password must contain at least one special character'
      : ''
    : '';
  const confirmError = submitted && confirmPassword !== password ? 'Passwords do not match' : '';
  const categoryError = submitted && !categoryId ? 'Please select a category' : '';

  const inputFocus = useCallback((field: string) => () => setFocusedField(field), []);
  const inputBlur = useCallback(() => setFocusedField(null), []);
  const clearOnChange = useCallback(
    (setter: (v: string) => void) => (v: string) => {
      setter(v);
      if (submitted) setSubmitted(false);
    },
    [submitted],
  );

  const handleRegister = useCallback(async () => {
    if (loading) return;

    setSubmitted(true);
    setAuthError('');

    if (businessName.trim().length === 0) return;
    if (!isValidEmail(email)) return;
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !SPECIAL_CHAR_RE.test(password)
    ) return;
    if (confirmPassword !== password) return;
    if (!categoryId) return;

    setLoading(true);
    try {
      const trimmedName = businessName.trim();

      const authData = await signUp({
        email: email.trim().toLowerCase(),
        password,
        full_name: trimmedName,
      });
      await loginWithTokens(authData, email.trim().toLowerCase());

      await registerBusiness({
        business_name: trimmedName,
        category_id: categoryId,
        business_type: 'goodwill',
        inhouse_referral: false,
      });

      // registerBusiness flips the active profile server-side; refreshProfiles re-hydrates
      // accountType from the session so the app actually renders the business dashboard.
      updateAuthUser({ role: 'business' });
      await refreshProfiles();

      setRegistrationSucceeded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      if (__DEV__) console.error('[useBusinessSignUp] handleRegister error:', err);
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    loading, businessName, email, password, confirmPassword, categoryId,
    loginWithTokens, refreshProfiles, updateAuthUser,
  ]);

  return {
    businessName, setBusinessName,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    categoryId, setCategoryId,

    showPassword, setShowPassword,
    showConfirm, setShowConfirm,
    focusedField,

    strength,
    nameError, emailError, passwordError, confirmError, categoryError,

    loading, authError, registrationSucceeded,

    handleRegister,
    inputFocus,
    inputBlur,
    clearOnChange,
  };
}
