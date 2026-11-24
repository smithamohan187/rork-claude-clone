import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { signIn, SignInPayload } from '@/api/services/authService';
import { getPendingShareReferral, clearPendingShareReferral } from '@/utils/shareReferral';
import { resolvePendingInvite } from '@/api/services/customerInviteService';
import { resolvePendingBusinessReferral } from '@/api/services/businessReferralService';
import { scanSubscribeToBusiness } from '@/api/services/subscriptionService';
import { getDeviceLabel } from '@/utils/deviceInfo';

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function isValidPhone(val: string): boolean {
  return /^\d{10}$/.test(val.replace(/\D/g, ''));
}

type InputMode = 'email' | 'phone' | 'unknown';

function detectMode(val: string): InputMode {
  if (val.includes('@')) return 'email';
  if (/\d/.test(val)) return 'phone';
  return 'unknown';
}

export function useSignIn() {
  const { loginWithTokens, setHoldAuthRedirect } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [authError, setAuthError]   = useState('');

  const mode: InputMode = useMemo(() => detectMode(identifier), [identifier]);

  const identifierError = useMemo(() => {
    if (!submitted) return '';
    if (identifier.trim().length === 0) return 'Email or phone number is required';
    if (mode === 'email' && !isValidEmail(identifier)) return 'Enter a valid email address';
    if (mode === 'phone' && !isValidPhone(identifier)) return 'Enter a valid 10-digit phone number';
    if (mode === 'unknown') return 'Enter a valid email or phone number';
    return '';
  }, [submitted, identifier, mode]);

  const passwordError = submitted && password.length === 0 ? 'Password is required' : '';

  const clearErrors = useCallback((setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (submitted) setSubmitted(false);
    setAuthError('');
  }, [submitted]);

  const handleLogin = useCallback(async () => {
    setSubmitted(true);
    if (identifier.trim().length === 0) return;
    if (mode === 'email' && !isValidEmail(identifier)) return;
    if (mode === 'phone' && !isValidPhone(identifier)) return;
    if (mode === 'unknown') return;
    if (password.length === 0) return;

    setAuthError('');
    setLoading(true);

    try {
      const payload: SignInPayload = {
        identifier: mode === 'email'
          ? identifier.trim().toLowerCase()
          : identifier.replace(/\D/g, ''),
        password,
        device_info: getDeviceLabel(),
      };

      const data = await signIn(payload);
      // Hold off the (auth) layout's "already authenticated, bounce to feed" guard — it would
      // otherwise fire the instant loginWithTokens flips isAuthenticated, racing ahead of (and
      // winning over) this function's own async referral-resolution + redirect below. Same
      // mechanism/reason as useSignUp.ts's handleRegister.
      setHoldAuthRedirect(true);
      await loginWithTokens(data, mode === 'email' ? identifier.trim().toLowerCase() : undefined);

      // If this login was reached via a customer-invite link (or a business-QR scan), auto-subscribe
      // to the inviting business and credit any configured welcome points, then land directly on
      // business-profile with `welcomePoints` so its existing welcome-banner effect fires — the same
      // mechanism useShareDeepLink.ts uses for an already-authenticated tap — instead of this screen
      // showing its own one-off business-specific message. Best-effort — a failure here must not
      // block the (already-successful) login itself.
      const pending = await getPendingShareReferral();
      if (pending?.content_type === 'business') {
        try {
          const resolved = await resolvePendingInvite(pending.referral_code);
          if (resolved.matched && resolved.business) {
            await clearPendingShareReferral();
            setHoldAuthRedirect(false);
            router.replace({
              pathname: '/business-profile/[id]' as never,
              params: { id: resolved.business.id, welcomePoints: String(resolved.welcomePoints) } as never,
            });
            return;
          }
        } catch (resolveErr) {
          if (__DEV__) console.error('[useSignIn] resolvePendingInvite error:', resolveErr);
        }
      }

      // Same as the customer-invite branch above, but reached via a subscriber's own standing
      // referral link — resolved by code, landing via pending.business_id (the resolve call
      // itself returns no business object, only matched/welcomePoints, unlike resolvePendingInvite).
      if (pending?.content_type === 'business_subscriber_referral' && pending.business_id) {
        try {
          const resolved = await resolvePendingBusinessReferral(pending.referral_code);
          await clearPendingShareReferral();
          setHoldAuthRedirect(false);
          router.replace({
            pathname: '/business-profile/[id]' as never,
            params: { id: pending.business_id, welcomePoints: String(resolved.welcomePoints) } as never,
          });
          return;
        } catch (resolveErr) {
          if (__DEV__) console.error('[useSignIn] resolvePendingBusinessReferral error:', resolveErr);
        }
      }

      // Same as the customer-invite branch above, but reached via a business QR scan — resolved
      // by businessId directly rather than an invite code.
      if (pending?.content_type === 'business_qr' && pending.business_id) {
        try {
          const resolved = await scanSubscribeToBusiness(pending.business_id);
          await clearPendingShareReferral();
          setHoldAuthRedirect(false);
          router.replace({
            pathname: '/business-profile/[id]' as never,
            params: { id: resolved.business.id, welcomePoints: String(resolved.welcomePoints) } as never,
          });
          return;
        } catch (resolveErr) {
          if (__DEV__) console.error('[useSignIn] scanSubscribeToBusiness error:', resolveErr);
        }
      }

      // Plain content share (post/offer/event/broadcast) or an app-level referral — no resolve
      // call needed, just land on the originally shared detail screen, same as useSignUp.ts's
      // postSignupRedirect. `business_invite` is deliberately excluded and left in storage — it
      // isn't resolved at personal-account login, it survives until the user goes through Create
      // Business (see useSignUp.ts/business-create.md).
      //
      // Replace to feed first, then push the detail screen on top — so the detail screen's back
      // button returns to feed instead of to app/index.tsx (the root onboarding screen, still
      // sitting under sign-in in the stack from before login), same fix as sign-up.tsx's
      // handleSnackbarDismiss.
      if (pending && pending.content_type !== 'business_invite') {
        await clearPendingShareReferral();
        setHoldAuthRedirect(false);
        router.replace('/feed' as never);
        router.push({
          pathname: pending.route as never,
          params: {
            [pending.id_param]: pending.content_id,
            businessId: pending.business_id,
          } as never,
        });
        return;
      }

      setHoldAuthRedirect(false);
      router.replace('/feed' as never);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      if (__DEV__) console.error('[useSignIn] handleLogin error:', err);
      setAuthError(msg);
      setHoldAuthRedirect(false);
    } finally {
      setLoading(false);
    }
  }, [identifier, password, mode, loginWithTokens, router, setHoldAuthRedirect]);

  return {
    identifier,
    setIdentifier: clearErrors(setIdentifier),
    password,
    setPassword: clearErrors(setPassword),
    mode,
    identifierError,
    passwordError,
    loading,
    authError,
    handleLogin,
  };
}