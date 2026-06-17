import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import {
  apiClient,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from '@/api/client';
import type { AccountType } from '@/types';

const ACCOUNT_TYPE_KEY = 'account_type';
const LAST_ACTIVE_PROFILE_KEY = 'last_active_profile_id';

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  profile?: Record<string, unknown>;
} | null;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [hasBusinessProfile, setHasBusinessProfile] = useState<boolean>(false);

  const isAuthenticated = !!currentUser;

  // ── Session restore ────────────────────────────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }
      try {
        const result = await apiClient.post<{ accessToken: string; user: CurrentUser }>(
          '/api/auth/refresh',
          { refreshToken }
        );
        if (result.success && result.data?.accessToken && result.data?.user) {
          setAccessToken(result.data.accessToken);
          setCurrentUser(result.data.user);
          const stored = await AsyncStorage.getItem(ACCOUNT_TYPE_KEY);
          if (stored) setAccountType(stored as AccountType);
        } else {
          await clearTokens();
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: CurrentUser;
    }>('/api/auth/login', { email, password });

    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Login failed');
    }

    setAccessToken(result.data.accessToken);
    await setRefreshToken(result.data.refreshToken);
    setCurrentUser(result.data.user);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = await getRefreshToken();
    try {
      await apiClient.post('/api/auth/logout', { refreshToken });
    } catch {
      // best-effort — clear tokens regardless
    }
    await clearTokens();
    setCurrentUser(null);
    setAccountType('personal');
  }, []);

  // ── Profile switching ──────────────────────────────────────────────────────
  const switchAccount = useCallback(async (type: AccountType) => {
    setAccountType(type);
    await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, type);
  }, []);

  const switchProfile = useCallback(async (type: 'personal' | 'business') => {
    await switchAccount(type);
    await AsyncStorage.setItem(LAST_ACTIVE_PROFILE_KEY, type);
    console.log('[Auth] switchProfile:', type);
  }, [switchAccount]);

  return {
    currentUser,
    isLoading,
    isAuthenticated,
    accountType,
    hasBusinessProfile,
    setHasBusinessProfile,
    login,
    logout,
    switchAccount,
    switchProfile,
  };
});
