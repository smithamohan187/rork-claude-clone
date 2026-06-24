/**
 * AuthContext.tsx
 *
 * Single source of truth for authentication state across the app.
 * Holds the logged-in user, access token (in memory), account type,
 * and a loading flag while the app is restoring a previous session.
 *
 * This file has NO mock data, NO test users, NO admin mode, NO business
 * profile state, and NO react-query. It is the clean production auth layer.
 */

import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import createContextHook from '@nkzw/create-context-hook';
import { signOut } from '@/api/services/authService';
import {
  apiClient,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from '@/api/client';
import { authApi, AuthTokens, SessionResponse } from '@/api/auth.api';
import type { AccountType } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// AsyncStorage key — the only key this context owns.
// The refresh token key is owned by api/client.ts (cleared via clearTokens).
// ─────────────────────────────────────────────────────────────────────────────
const ACCOUNT_TYPE_KEY = 'account_type';

// ─────────────────────────────────────────────────────────────────────────────
// AuthUser — the shape we store in React state after login or session restore.
// Includes profile fields so updateAuthUser can merge edits without a backend
// call (the profile screen writes then calls this to keep state in sync).
// ─────────────────────────────────────────────────────────────────────────────
type AuthUser = {
  id: string;
  name?: string;
  full_name?: string; // backend uses full_name; toAuthUser normalises → name
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  bio?: string;
  location?: string;
  state?: string;
  country?: string;
  interests?: string[];
  activeProfileId?: string;   // ← add this
  isVerified?: boolean;       // ← add this too while you're here
};

// ─────────────────────────────────────────────────────────────────────────────
// AuthRefreshResponse — shape the backend returns on POST /auth/refresh.
// Supports both flat token fields and a nested tokens object because the
// backend may rotate to either shape between versions.
// ─────────────────────────────────────────────────────────────────────────────
type AuthRefreshResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: SessionResponse;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getTokens — extracts access and refresh tokens regardless of whether the
// backend sent them as flat fields or nested under a "tokens" object.
// Both shapes are valid; we just normalise to a consistent pair here.
// ─────────────────────────────────────────────────────────────────────────────
function getTokens(data: AuthTokens | AuthRefreshResponse | null | undefined) {
  return {
    accessToken: data?.accessToken ?? data?.tokens?.accessToken ?? null,
    refreshToken: data?.refreshToken ?? data?.tokens?.refreshToken ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// toAuthUser — converts a raw backend session/user object into our AuthUser
// shape. The backend sends full_name; we copy it to name so the rest of the
// app can use user.name consistently.
// Returns null if the object has no id (safety guard).
// ─────────────────────────────────────────────────────────────────────────────
function toAuthUser(user: SessionResponse | AuthUser | null | undefined): AuthUser | null {
  if (!user?.id) return null;
  return {
    ...user,
    name: user.name ?? user.full_name ?? user.email ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchCurrentUser — fallback when the refresh response doesn't include user
// data. Hits GET /auth/session which validates the access token we just set
// and returns the current user object.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchCurrentUser(): Promise<AuthUser | null> {
  const session = await authApi.getSession();
  return session.success ? toAuthUser(session.data) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider / useAuth — created with createContextHook so the provider and
// the consumer hook are always in sync and the context never needs to be
// manually wired with React.createContext.
// ─────────────────────────────────────────────────────────────────────────────
export const [AuthProvider, useAuth] = createContextHook(() => {
  const router = useRouter();

  // ── Core auth state ──────────────────────────────────────────────────────
  // authUser: the logged-in user object. Null when logged out.
  // accessToken: mirrors the in-memory token in api/client.ts so components
  //   can read it reactively without calling getAccessToken() imperatively.
  // accountType: 'personal' or 'business'. Read from AsyncStorage on mount.
  // authLoading: true while restoreSession is running on app startup.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // ── Session restore on app startup ───────────────────────────────────────
  // Reads the refresh token from AsyncStorage (where it was persisted at
  // login). If found, calls the refresh endpoint to get a new access token.
  // If the refresh response includes user data we use it directly; otherwise
  // we call GET /auth/session as a fallback. Either way authUser is set from
  // real backend data — no mock users, no guessing.
  useEffect(() => {
    async function restoreSession() {
      // Read account type preference first (non-blocking, best-effort).
      // We do this inside restoreSession so we don't need a second useEffect.
      try {
        const storedType = await AsyncStorage.getItem(ACCOUNT_TYPE_KEY);
        if (storedType === 'personal' || storedType === 'business') {
          setAccountType(storedType);
        }
      } catch {
        // If AsyncStorage fails here just leave the default 'personal'.
      }

      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        if (__DEV__) console.log('[AuthContext] restoreSession: no refresh token found, skipping restore');
        setAuthLoading(false);
        return;
      }

      if (__DEV__) console.log('[AuthContext] restoreSession: refresh token found, attempting restore');

      try {
        const result = await apiClient.post<AuthRefreshResponse>('/auth/refresh', { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = getTokens(result.data);

        if (result.success && newAccess) {
          // Store the new access token in client.ts (request interceptor) and
          // in React state so components can read it reactively.
          setAccessToken(newAccess);
          setAccessTokenState(newAccess);

          // If the backend rotated the refresh token, persist the new one.
          if (newRefresh) await setRefreshToken(newRefresh);

          // Prefer user data embedded in the refresh response (saves a round
          // trip). Fall back to GET /auth/session if it wasn't included.
          const userFromRefresh = toAuthUser(result.data?.user);
          if (userFromRefresh) {
            if (__DEV__) console.log('[AuthContext] restoreSession: user came from refresh response, id:', userFromRefresh.id);
            setAuthUser(userFromRefresh);
          } else {
            if (__DEV__) console.log('[AuthContext] restoreSession: no user in refresh response, calling fetchCurrentUser');
            const userFromSession = await fetchCurrentUser();
            if (__DEV__) console.log('[AuthContext] restoreSession: fetchCurrentUser returned id:', userFromSession?.id ?? 'null');
            setAuthUser(userFromSession);
          }
        } else {
          // Refresh call succeeded HTTP-wise but returned no access token —
          // treat this as an expired/invalid session.
          if (__DEV__) console.log('[AuthContext] restoreSession: refresh succeeded but no access token in response, clearing');
          await clearTokens();
          setAuthUser(null);
        }
      } catch (err) {
        // Network error or 401 from the refresh endpoint — session is gone.
        if (__DEV__) console.log('[AuthContext] restoreSession: refresh threw, clearing session:', err);
        await clearTokens();
        setAuthUser(null);
      } finally {
        // Always clear the loading flag so the app can render the right screen.
        setAuthLoading(false);
      }
    }

    restoreSession();
  }, []);

  // ── loginWithTokens ───────────────────────────────────────────────────────
  // Called by sign-in and sign-up hooks after the backend responds with tokens.
  // Receives the full auth response object and an optional fallback email in
  // case the backend omits user data from the login response.
  //
  // What it reads:  backend auth response (AuthTokens shape)
  // What it sets:   accessToken in client.ts + React state, refreshToken in
  //                 AsyncStorage, authUser in React state
  const loginWithTokens = useCallback(
    async (data: AuthTokens, fallbackEmail?: string): Promise<AuthUser> => {
      const { accessToken: newAccess, refreshToken: newRefresh } = getTokens(data);

      if (!newAccess || !newRefresh) {
        throw new Error('Login response did not include auth tokens');
      }

      // Persist tokens to the right locations.
      setAccessToken(newAccess);        // in-memory module var in client.ts
      setAccessTokenState(newAccess);   // React state for reactive consumers
      await setRefreshToken(newRefresh); // AsyncStorage for session restore

      // Resolve the user: prefer embedded user → userId + fallbackEmail → API call.
      const user =
        toAuthUser(data.user) ??
        (data.userId ? { id: data.userId, email: fallbackEmail } : null) ??
        (await fetchCurrentUser());

      if (!user) {
        await clearTokens();
        throw new Error('Login response did not include user details');
      }

      setAuthUser(user);
      //console.log(user);
      if (__DEV__) console.log('[AuthContext] loginWithTokens: set authUser DETAILS:', user);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: set accessToken:', newAccess);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: set refreshToken:', newRefresh);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: accountType is', accountType);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: fallbackEmail is', fallbackEmail);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: data.user is', data.user);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: data.userId is', data.userId);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: data.tokens is', data.tokens);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: data.accessToken is', data.accessToken);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: data.refreshToken is', data.refreshToken);
      //if (__DEV__) console.log('[AuthContext] loginWithTokens: data is', data);

      if (!user.id) {
        await clearTokens();
        throw new Error('Login response did not include user ID');
      }
      if (__DEV__) console.log('[AuthContext] loginWithTokens: success, user id:', user.id);
      return user;
    },
    [],
  );

  // ── updateAuthUser ────────────────────────────────────────────────────────
  // Merges partial updates into authUser in memory after a profile edit.
  // Does NOT call the backend — the profile hook handles the API call and
  // then calls this to keep the in-memory state in sync.
  //
  // What it reads:  current authUser state
  // What it sets:   authUser state (partial merge)
  const updateAuthUser = useCallback((updates: Partial<AuthUser>) => {
    if (__DEV__) console.log('[AuthContext] updateAuthUser: updating fields:', Object.keys(updates).join(', '));
    setAuthUser(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  // Signs the user out on the server (best-effort — errors are swallowed so a
  // failed network call doesn't trap the user in a logged-in state), then
  // clears all local tokens and state, and navigates to the sign-in screen.
  //
  // What it reads:  refresh token from AsyncStorage (via getRefreshToken)
  // What it sets:   clears everything, navigates to /sign-in
  const logout = useCallback(async (): Promise<void> => {
    if (__DEV__) console.log('[AuthContext] logout: called');

    try {
      const storedRefreshToken = await getRefreshToken();
      if (storedRefreshToken) await signOut(storedRefreshToken);
    } catch (err) {
      // If the server call fails (network down, token already expired) we still
      // want to clear local state so the user isn't stuck.
      if (__DEV__) console.warn('[AuthContext] logout: backend signOut failed (ignored):', err);
    } finally {
      // Clear tokens first so any in-flight requests after this point fail cleanly.
      await clearTokens();
      setAccessTokenState(null);

      // Remove the account type preference so the next login starts fresh.
      await AsyncStorage.removeItem(ACCOUNT_TYPE_KEY);

      // Reset all React state to logged-out defaults.
      setAuthUser(null);
      setAccountType('personal');

      router.replace('/sign-in');
    }
  }, [router]);

  // ── switchAccount ─────────────────────────────────────────────────────────
  // Switches the active account view between 'personal' and 'business'.
  // Persists the preference to AsyncStorage so it survives an app restart.
  //
  // What it reads:  type parameter ('personal' | 'business')
  // What it sets:   accountType state + AsyncStorage
  const switchAccount = useCallback(async (type: 'personal' | 'business') => {
    setAccountType(type);
    await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, type);
  }, []);

  // ── Exposed context value ─────────────────────────────────────────────────
  // Only expose what the app actually needs. Keeping this surface small makes
  // it easy to audit what downstream components can touch.
  return {
    authUser,
    accessToken,
    accountType,
    authLoading,
    isAuthenticated: !!authUser,
    loginWithTokens,
    updateAuthUser,
    logout,
    switchAccount,
  };
});
