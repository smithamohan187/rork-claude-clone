import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signUp, SignupPayload } from '@/api/services/authService';
import { getPendingShareReferral, clearPendingShareReferral } from '@/utils/shareReferral';
import { resolvePendingInvite } from '@/api/services/customerInviteService';

// Where to land the user after signup: the shared detail screen when they arrived via a share
// deep link, otherwise null (screen falls back to its default landing).
export interface PostSignupRedirect {
  pathname: string;
  params: Record<string, string>;
}

// Populated only when signup was submitted via a customer-invite link — lets the success screen
// show one combined "joined + welcome points" message instead of a generic one.
export interface WelcomeInfo {
  businessName: string;
  welcomePoints: number;
}

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

export function useSignUp() {
  const { loginWithTokens } = useAuth();

  // ── Form fields ───────────────────────────────────────────────────────────
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [phoneNumber, setPhoneNumber]         = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation]               = useState('');
  const [interests, setInterests]             = useState<string[]>([]);
  const [referralCode, setReferralCode]       = useState('');

  // ── UI toggles ────────────────────────────────────────────────────────────
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [focusedField, setFocusedField]   = useState<string | null>(null);

  // ── Submission state ──────────────────────────────────────────────────────
  const [submitted, setSubmitted]             = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [authError, setAuthError]             = useState('');
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false);
  const [postSignupRedirect, setPostSignupRedirect] = useState<PostSignupRedirect | null>(null);
  const [welcomeInfo, setWelcomeInfo] = useState<WelcomeInfo | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  const strength = useMemo(() => computeStrength(password), [password]);
  const nameError  = submitted && fullName.trim().length === 0 ? 'Full name is required' : '';
  const emailError = submitted && !isValidEmail(email) ? 'Enter a valid email address' : '';
  
  const passwordError = submitted
    ? password.length < 8 ? 'Password must be at least 8 characters'
      : !/[A-Z]/.test(password) ? 'Password must contain at least one uppercase letter'
      : !SPECIAL_CHAR_RE.test(password) ? 'Password must contain at least one special character'
      : ''
    : '';
   

  const confirmError = submitted && confirmPassword !== password ? 'Passwords do not match' : '';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleInterest = useCallback((cat: string) => {
    setInterests(prev =>
      prev.includes(cat) ? prev.filter(i => i !== cat) : [...prev, cat],
    );
  }, []);

  const inputFocus = useCallback(
    (field: string) => () => setFocusedField(field),
    [],
  );

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

    // Client-side validation — bail without touching loading state
    if (fullName.trim().length === 0) return;
    if (!isValidEmail(email)) return;
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !SPECIAL_CHAR_RE.test(password)
    ) return;
    if (confirmPassword !== password) return;

    setLoading(true);

    try {
      // If the user arrived from a deep link, submit the stashed code under the field the backend
      // expects for that code's kind — customer invites link a business, content shares link a
      // post/offer/event, app referrals link a referring friend — and remember where to redirect
      // them after signup.
      const pending = await getPendingShareReferral();
      const isCustomerInvite = pending?.content_type === 'business';
      const isAppReferral = pending?.content_type === 'app_referral';
      // Business-invite codes resolve at business-registration time, not personal signup — there's
      // nothing to submit here. The pending referral is deliberately NOT cleared below so it
      // survives until the user goes through Create Business.
      const isBusinessInvite = pending?.content_type === 'business_invite';

      const payload: SignupPayload = {
        email:         email.trim().toLowerCase(),
        password,
        full_name:     fullName.trim(),
        phone:         phoneNumber.trim() || undefined,
        location:      location.trim()   || undefined,
        interests:     interests.length  ? interests : undefined,
        referral_code: isAppReferral ? pending?.referral_code : (referralCode.trim().toUpperCase() || undefined),
        share_referral_code: isCustomerInvite || isAppReferral || isBusinessInvite ? undefined : pending?.referral_code,
        customer_invite_code: isCustomerInvite ? pending?.referral_code : undefined,
      };

      const data = await signUp(payload);
      await loginWithTokens(data, email.trim().toLowerCase());

      if (pending) {
        setPostSignupRedirect({
          pathname: pending.route,
          params: { [pending.id_param]: pending.content_id, businessId: pending.business_id },
        });
        if (!isBusinessInvite) {
          await clearPendingShareReferral();
        }
      }

      // Customer-invite signup: auto-subscribe to the inviting business and credit any configured
      // welcome points, then show a combined confirmation. Best-effort — a failure here must not
      // block the (already-successful) registration itself.
      if (isCustomerInvite && pending?.referral_code) {
        try {
          const resolved = await resolvePendingInvite(pending.referral_code);
          if (resolved.matched && resolved.business) {
            setWelcomeInfo({ businessName: resolved.business.name, welcomePoints: resolved.welcomePoints });
          }
        } catch (resolveErr) {
          if (__DEV__) console.error('[useSignUp] resolvePendingInvite error:', resolveErr);
        }
      }

      setRegistrationSucceeded(true);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      if (__DEV__) console.error('[useSignUp] handleRegister error:', err);
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    loading, fullName, email, phoneNumber,
    password, confirmPassword, location, interests, referralCode,
    loginWithTokens,
  ]);

  return {
    // Form values + setters
    fullName,    setFullName,
    email,       setEmail,
    phoneNumber, setPhoneNumber,
    password,    setPassword,
    confirmPassword, setConfirmPassword,
    location,    setLocation,
    interests,
    referralCode, setReferralCode,

    // UI toggles
    showPassword, setShowPassword,
    showConfirm,  setShowConfirm,
    focusedField,

    // Computed
    strength,
    nameError, emailError, passwordError, confirmError,

    // Submission state
    loading, authError, registrationSucceeded,
    postSignupRedirect,
    welcomeInfo,

    // Handlers
    handleRegister,
    toggleInterest,
    inputFocus,
    inputBlur,
    clearOnChange,
  };
}
