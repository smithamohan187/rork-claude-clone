import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  registerUser,
  RegisterError,
  type RegisterInput,
  type RegisterResult,
} from '@/services/authService';

export interface UseRegisterOptions {
  onSuccess?: (result: RegisterResult) => void;
}

export function useRegister(options?: UseRegisterOptions) {
  const [authError, setAuthError] = useState<string>('');
  const [showSlowSpinner, setShowSlowSpinner] = useState<boolean>(false);

  const mutation = useMutation<RegisterResult, Error, RegisterInput>({
    mutationFn: async (input: RegisterInput) => {
      setAuthError('');
      return registerUser(input);
    },
    onSuccess: (result) => {
      console.log('[useRegister] Success, hasSession:', result.hasSession);
      options?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      const kind = error instanceof RegisterError ? error.kind : 'db';
      console.log('[useRegister] Failed:', kind, error.message);
      if (kind === 'auth') {
        setAuthError(error.message);
      }
    },
  });

  useEffect(() => {
    if (!mutation.isPending) {
      setShowSlowSpinner(false);
      return;
    }
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

  const lastError = mutation.error;
  const isDbError =
    !!lastError &&
    lastError instanceof RegisterError &&
    lastError.kind === 'db';

  return {
    register,
    isPending: mutation.isPending,
    authError,
    clearAuthError,
    showSlowSpinner,
    isDbError,
    reset: mutation.reset,
  };
}
