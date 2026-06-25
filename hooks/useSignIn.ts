import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { signIn, SignInPayload } from '@/api/services/authService';

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
  const { loginWithTokens} = useAuth();
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
    if (password.length === 0) return;

    setAuthError('');
    setLoading(true);

    try {
      const payload: SignInPayload = {
        identifier: mode === 'email'
          ? identifier.trim().toLowerCase()
          : identifier.replace(/\D/g, ''),
        password,
      };

      const data = await signIn(payload);
      await loginWithTokens(data, mode === 'email' ? identifier.trim().toLowerCase() : undefined);
      //await restoreLastProfile();
      //router.replace('/my-profile' as never);
      router.replace('/feed' as never);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      if (__DEV__) console.error('[useSignIn] handleLogin error:', err);
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  }, [identifier, password, mode, loginWithTokens, router]);

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