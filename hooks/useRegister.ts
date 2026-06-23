/*import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi, type SignupPayload } from '@/api/auth.api';

// ── Public types ──────────────────────────────────────────────────────────────

export interface RegisterInput {
  fullName:     string;
  email:        string;
  password:     string;
  phoneNumber?: string;
  location?:    string;
  interests?:   string[];
  referralCode?: string;
}

export interface RegisterResult {
  hasSession: boolean;
  userId:     string;
}

export class RegisterError extends Error {
  kind: 'auth' | 'db';
  constructor(message: string, kind: 'auth' | 'db') {
    super(message);
    this.kind = kind;
    this.name = 'RegisterError';
  }
}

export interface UseRegisterOptions {
  onSuccess?: (result: RegisterResult) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRegister(options?: UseRegisterOptions) {
  const [authError, setAuthError]           = useState('');
  const [showSlowSpinner, setShowSlowSpinner] = useState(false);

  const mutation = useMutation<RegisterResult, RegisterError, RegisterInput>({
    mutationFn: async (input: RegisterInput) => {
      setAuthError('');

      // Map hook input → API payload (normalisation/casing lives in the backend schema)
      const payload: SignupPayload = {
        email:         input.email,
        password:      input.password,
        full_name:     input.fullName,
        phone:         input.phoneNumber || undefined,
        location:      input.location   || undefined,
        interests:     input.interests?.length ? input.interests : undefined,
        referral_code: input.referralCode     || undefined,
      };

      const result = await authApi.signup(payload);

      if (!result.success || !result.data) {
        // Server returns a plain error string — classify it so the UI knows
        // whether to show it inline ("auth") or as a generic alert ("db").
        const isDuplicate = /already registered|duplicate/i.test(result.error ?? '');
        throw new RegisterError(
          result.error ?? 'Registration failed. Please try again.',
          isDuplicate ? 'auth' : 'db',
        );
      }

      return {
        hasSession: !!result.data.accessToken,
        userId:     result.data.userId,
      };
    },

    onSuccess: (result) => {
      console.log('[useRegister] Success, userId:', result.userId);
      options?.onSuccess?.(result);
    },

    onError: (error: RegisterError) => {
      console.log('[useRegister] Failed:', error.kind, error.message);
      if (error.kind === 'auth') setAuthError(error.message);
    },
  });

  // Show a spinner after 2 s so the user knows something is happening
  useEffect(() => {
    if (!mutation.isPending) { setShowSlowSpinner(false); return; }
    const t = setTimeout(() => setShowSlowSpinner(true), 2000);
    return () => clearTimeout(t);
  }, [mutation.isPending]);

  const register = useCallback(
    (input: RegisterInput) => {
      if (mutation.isPending) return;
      mutation.mutate(input);
    },
    [mutation],
  );

  const clearAuthError = useCallback(() => setAuthError(''), []);

  const isDbError =
    !!mutation.error && mutation.error instanceof RegisterError && mutation.error.kind === 'db';

  return {
    register,
    isPending:       mutation.isPending,
    authError,
    clearAuthError,
    showSlowSpinner,
    isDbError,
    reset:           mutation.reset,
  };
}
*/