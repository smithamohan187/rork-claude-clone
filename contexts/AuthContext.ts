import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { testUsers, currentBusinessUser } from '@/mocks/data';
import { adminUser } from '@/contexts/AdminContext';
import {
  apiClient,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from '@/api/client';
import { authApi, AuthTokens, SessionResponse } from '@/api/auth.api';
import type { AccountType, User, BusinessProfileData, ProfileEntry } from '@/types';

const ACCOUNT_TYPE_KEY = 'account_type';
const ONBOARDED_KEY = 'onboarded';
const HAS_BUSINESS_PROFILE_KEY = 'has_business_profile';
const BUSINESS_PROFILE_DATA_KEY = 'business_profile_data';
const IS_ADMIN_KEY = 'is_admin';
const LAST_ACTIVE_PROFILE_KEY = 'last_active_profile_id';

export type { BusinessProfileData } from '@/types';

type AuthUser = Partial<User> & {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  profile?: Record<string, unknown>;
};

type AuthRefreshResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: SessionResponse;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

const TEST_USER_HAS_BUSINESS: Record<number, boolean> = {
  0: true,
  1: false,
  2: false,
};

function getTokens(data: AuthTokens | AuthRefreshResponse | null | undefined) {
  return {
    accessToken: data?.accessToken ?? data?.tokens?.accessToken ?? null,
    refreshToken: data?.refreshToken ?? data?.tokens?.refreshToken ?? null,
  };
}

function toAuthUser(user: SessionResponse | AuthUser | null | undefined): AuthUser | null {
  if (!user?.id) return null;
  return {
    ...user,
    name: user.name ?? user.full_name,
    email: user.email ?? undefined,
  };
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const session = await authApi.getSession();
  return session.success ? toAuthUser(session.data) : null;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(true);
  const [hasBusinessProfile, setHasBusinessProfile] = useState<boolean>(true);
  const [businessProfileData, setBusinessProfileData] = useState<BusinessProfileData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [testUserIndex, setTestUserIndex] = useState<number>(0);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const storedType = useQuery({
    queryKey: ['accountType'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(ACCOUNT_TYPE_KEY);
      return (stored as AccountType) || 'personal';
    },
  });

  const storedOnboarded = useQuery({
    queryKey: ['onboarded'],
    queryFn: async () => {
      const val = await AsyncStorage.getItem(ONBOARDED_KEY);
      return val === 'true';
    },
  });

  const storedAdmin = useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      const val = await AsyncStorage.getItem(IS_ADMIN_KEY);
      return val === 'true';
    },
  });

  useEffect(() => {
    if (storedAdmin.data !== undefined) setIsAdmin(storedAdmin.data);
  }, [storedAdmin.data]);

  const storedBusinessProfile = useQuery({
    queryKey: ['hasBusinessProfile'],
    queryFn: async () => {
      const val = await AsyncStorage.getItem(HAS_BUSINESS_PROFILE_KEY);
      if (val === null) return null;
      return val === 'true';
    },
  });

  useEffect(() => {
    if (storedType.data) setAccountType(storedType.data);
  }, [storedType.data]);

  useEffect(() => {
    if (storedOnboarded.data !== undefined) setHasOnboarded(storedOnboarded.data);
  }, [storedOnboarded.data]);

  useEffect(() => {
    if (storedBusinessProfile.data !== undefined) {
      if (storedBusinessProfile.data === null) {
        const defaultHasBusiness = TEST_USER_HAS_BUSINESS[testUserIndex] ?? false;
        setHasBusinessProfile(defaultHasBusiness);
      } else {
        setHasBusinessProfile(storedBusinessProfile.data);
      }
    } else {
      const defaultHasBusiness = TEST_USER_HAS_BUSINESS[testUserIndex] ?? false;
      setHasBusinessProfile(defaultHasBusiness);
    }
  }, [storedBusinessProfile.data, testUserIndex]);

  const storedProfileData = useQuery({
    queryKey: ['businessProfileData'],
    queryFn: async () => {
      const val = await AsyncStorage.getItem(BUSINESS_PROFILE_DATA_KEY);
      return val ? (JSON.parse(val) as BusinessProfileData) : null;
    },
  });

  useEffect(() => {
    if (storedProfileData.data !== undefined) setBusinessProfileData(storedProfileData.data);
  }, [storedProfileData.data]);

  useEffect(() => {
    async function restoreSession() {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        setAuthLoading(false);
        return;
      }

      try {
        const result = await apiClient.post<AuthRefreshResponse>(
          '/auth/refresh',
          { refreshToken },
          { _isRetry: true },
        );
        const { accessToken, refreshToken: nextRefreshToken } = getTokens(result.data);

        if (result.success && accessToken) {
          setAccessToken(accessToken);
          if (nextRefreshToken) await setRefreshToken(nextRefreshToken);
          setAuthUser(toAuthUser(result.data?.user) ?? await fetchCurrentUser());
        } else {
          await clearTokens();
          setAuthUser(null);
        }
      } catch {
        await clearTokens();
        setAuthUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    restoreSession();
  }, []);

  const switchAccount = useCallback(async (type: AccountType) => {
    if (type === 'admin') {
      setIsAdmin(true);
      setAccountType('personal');
      await AsyncStorage.setItem(IS_ADMIN_KEY, 'true');
      return;
    }
    setAccountType(type);
    await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, type);
  }, []);

  const loginWithTokens = useCallback(async (data: AuthTokens, fallbackEmail?: string): Promise<AuthUser> => {
    const { accessToken, refreshToken } = getTokens(data);
    if (!accessToken || !refreshToken) {
      throw new Error('Login response did not include auth tokens');
    }

    setAccessToken(accessToken);
    await setRefreshToken(refreshToken);

    const user =
      toAuthUser(data.user) ??
      await fetchCurrentUser() ??
      (data.userId ? { id: data.userId, email: fallbackEmail } : null);

    if (!user) {
      await clearTokens();
      throw new Error('Login response did not include user details');
    }

    setAuthUser(user);
    console.log('[Auth] loginWithTokens success, user:', user);
    return user;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await authApi.login({ email, password });
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Login failed');
    }
    await loginWithTokens(result.data, email);
  }, [loginWithTokens]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      await clearTokens();
    }
    setAuthUser(null);
    setAccountType('personal');
  }, []);

  const loginAsAdmin = useCallback(async () => {
    setIsAdmin(true);
    await AsyncStorage.setItem(IS_ADMIN_KEY, 'true');
    console.log('[Auth] Admin session activated');
  }, []);

  const logoutAdmin = useCallback(async () => {
    setIsAdmin(false);
    await AsyncStorage.setItem(IS_ADMIN_KEY, 'false');
    console.log('[Auth] Admin session terminated');
  }, []);

  const completeOnboarding = useCallback(async (type: AccountType) => {
    setAccountType(type);
    setHasOnboarded(true);
    await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, type);
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
  }, []);

  const completeBusinessProfile = useCallback(async (profileData?: BusinessProfileData) => {
    setHasBusinessProfile(true);
    setAccountType('business');
    const activePersonalUser = testUsers[testUserIndex];
    if (profileData) {
      const dataWithAdmin: BusinessProfileData = {
        ...profileData,
        designatedAdmin: profileData.designatedAdmin ?? {
          id: activePersonalUser.id,
          name: activePersonalUser.name,
          username: activePersonalUser.username,
          avatar: activePersonalUser.avatar,
        },
      };
      setBusinessProfileData(dataWithAdmin);
      await AsyncStorage.setItem(BUSINESS_PROFILE_DATA_KEY, JSON.stringify(dataWithAdmin));
    }
    await AsyncStorage.setItem(HAS_BUSINESS_PROFILE_KEY, 'true');
    await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, 'business');
    queryClient.invalidateQueries({ queryKey: ['businessProfileData'] });
  }, [queryClient, testUserIndex]);

  const switchTestUser = useCallback(async (index: number) => {
    if (index >= 0 && index < testUsers.length) {
      const defaultHasBusiness = TEST_USER_HAS_BUSINESS[index] ?? false;
      setTestUserIndex(index);
      setHasBusinessProfile(defaultHasBusiness);
      setAccountType('personal');
      await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, 'personal');
      await AsyncStorage.setItem(HAS_BUSINESS_PROFILE_KEY, defaultHasBusiness ? 'true' : 'false');
      console.log('[Auth] Switched to test user:', testUsers[index].name, '| hasBusinessProfile:', defaultHasBusiness);
    }
  }, []);

  const resetAllData = useCallback(async () => {
    console.log('[Auth] Resetting all test mode data...');
    await AsyncStorage.clear();
    await clearTokens();
    setAuthUser(null);
    setAccountType('personal');
    setHasOnboarded(true);
    setHasBusinessProfile(false);
    setBusinessProfileData(null);
    setIsAdmin(false);
    setTestUserIndex(0);
    queryClient.clear();
    queryClient.invalidateQueries();
    console.log('[Auth] All data reset complete');
  }, [queryClient]);

  const businessUser: User = businessProfileData
    ? {
        ...currentBusinessUser,
        name: businessProfileData.name,
        username: businessProfileData.username,
        bio: businessProfileData.bio,
        avatar: businessProfileData.avatar || currentBusinessUser.avatar,
        phone: businessProfileData.phone,
        email: businessProfileData.email,
        website: businessProfileData.website,
        address: businessProfileData.address,
        category: businessProfileData.category,
        hours: businessProfileData.hours,
      }
    : currentBusinessUser;

  const currentPersonalUser = testUsers[testUserIndex];
  const activeUser: User = isAdmin ? adminUser : (accountType === 'personal' ? currentPersonalUser : businessUser);
  const currentUser: User = authUser
    ? {
        ...activeUser,
        ...authUser,
        name: authUser.name ?? authUser.full_name ?? activeUser.name,
        avatar: authUser.avatar ?? activeUser.avatar,
      }
    : activeUser;

  const profiles: ProfileEntry[] = [
    {
      id: currentPersonalUser.id,
      type: 'personal',
      displayName: currentPersonalUser.name,
      avatarUrl: currentPersonalUser.avatar,
    },
    ...(hasBusinessProfile
      ? [
          {
            id: businessUser.id,
            type: 'business' as const,
            displayName: businessUser.name,
            avatarUrl: businessUser.avatar,
          },
        ]
      : []),
  ];

  const activeProfile: ProfileEntry = {
    id: currentUser.id,
    type: (accountType === 'admin' ? 'personal' : accountType) as 'personal' | 'business',
    displayName: currentUser.name,
    avatarUrl: currentUser.avatar,
  };

  const profilesRef = React.useRef(profiles);
  profilesRef.current = profiles;

  const switchProfile = useCallback(async (profileId: string) => {
    const currentProfiles = profilesRef.current;
    const target = currentProfiles.find((p) => p.id === profileId);
    if (!target) {
      console.log('[Auth] switchProfile: profile not found for id', profileId, 'available:', currentProfiles.map(p => p.id));
      return;
    }
    console.log('[Auth] switchProfile:', target.type, target.displayName);
    await switchAccount(target.type);
    await AsyncStorage.setItem(LAST_ACTIVE_PROFILE_KEY, profileId);
    console.log('[Auth] Persisted last_active_profile_id:', profileId);
  }, [switchAccount]);

  const restoreLastProfile = useCallback(async (): Promise<'personal' | 'business'> => {
    const currentProfiles = profilesRef.current;
    console.log('[Auth] restoreLastProfile: available profiles:', currentProfiles.map(p => `${p.id}(${p.type})`));
    try {
      const lastId = await AsyncStorage.getItem(LAST_ACTIVE_PROFILE_KEY);
      console.log('[Auth] restoreLastProfile: stored last_active_profile_id:', lastId);
      if (lastId) {
        const target = currentProfiles.find((p) => p.id === lastId);
        if (target) {
          console.log('[Auth] restoreLastProfile: restoring', target.type, target.displayName);
          await switchAccount(target.type);
          return target.type;
        }
        console.log('[Auth] restoreLastProfile: stored profile no longer valid, defaulting to personal');
      }
    } catch (err) {
      console.log('[Auth] restoreLastProfile: error reading storage', err);
    }
    await switchAccount('personal');
    const personalProfile = currentProfiles.find((p) => p.type === 'personal');
    if (personalProfile) {
      await AsyncStorage.setItem(LAST_ACTIVE_PROFILE_KEY, personalProfile.id);
    }
    return 'personal';
  }, [switchAccount]);

  const setPersonalAsActive = useCallback(async () => {
    const currentProfiles = profilesRef.current;
    const personalProfile = currentProfiles.find((p) => p.type === 'personal');
    console.log('[Auth] setPersonalAsActive: personal profile:', personalProfile?.id);
    await switchAccount('personal');
    if (personalProfile) {
      await AsyncStorage.setItem(LAST_ACTIVE_PROFILE_KEY, personalProfile.id);
      console.log('[Auth] setPersonalAsActive: persisted', personalProfile.id);
    }
  }, [switchAccount]);

  return {
    accountType,
    currentUser,
    personalUser: currentPersonalUser,
    hasOnboarded,
    hasBusinessProfile,
    businessProfileData,
    isAdmin,
    isAuthenticated: !!authUser,
    authUser,
    loginWithTokens,
    login,
    logout,
    switchAccount,
    loginAsAdmin,
    logoutAdmin,
    completeOnboarding,
    completeBusinessProfile,
    switchTestUser,
    resetAllData,
    testUserIndex,
    testUsers,
    isLoading: authLoading || storedType.isLoading || storedOnboarded.isLoading || storedBusinessProfile.isLoading,
    activeProfile,
    profiles,
    switchProfile,
    restoreLastProfile,
    setPersonalAsActive,
  };
});
