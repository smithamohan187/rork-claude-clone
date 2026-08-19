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
  refreshAccessToken,
} from '@/api/client';
import { authApi, AuthTokens, SessionResponse, BackendProfile } from '@/api/auth.api';
import type { AccountType, ProfileEntry } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// AsyncStorage key — the only key this context owns.
// The refresh token key is owned by api/client.ts (cleared via clearTokens).
// ─────────────────────────────────────────────────────────────────────────────
const ACCOUNT_TYPE_KEY = 'account_type';

function resolveUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}${url}`;
}
const ACTIVE_PROFILE_ID_KEY = 'active_profile_id';

// Map backend profile row to the ProfileEntry shape used by components
function toProfileEntry(p: BackendProfile): ProfileEntry {
  return {
    id: p.id,
    type: p.profile_type,
    displayName: p.display_name,
    avatarUrl: resolveUrl(p.avatar_url) ?? '',
    logoUrl: resolveUrl(p.logo_url) ?? undefined,
  };
}

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
  if (!user) return null;
  const u = user as Record<string, unknown>;
  const id = (u.id ?? u.user_id) as string | undefined;
  if (!id) return null;
  return {
    ...user,
    id,
    name:   (u.name ?? u.full_name ?? u.display_name ?? u.displayName ?? u.email) as string | undefined,
    avatar: resolveUrl((u.avatar ?? u.avatar_url) as string | null | undefined),
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
  const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // ── hydrateProfiles ──────────────────────────────────────────────────────
  // Calls GET /auth/session and extracts the profiles array + active_profile_id.
  // Must only be called when a valid access token is already in memory.
  // Non-fatal — callers swallow errors so a failed hydration doesn't block login.
  async function hydrateProfiles() {
    const sessionResult = await authApi.getSession();
    if (!sessionResult.success || !sessionResult.data) return;
    const data = sessionResult.data as SessionResponse;
    const backendProfiles: BackendProfile[] = data.profiles ?? [];
    setProfiles(backendProfiles.map(toProfileEntry));
    // Fall back to profile_id — in the session query it equals the active profile id
    // (the JOIN is p.id = u.active_profile_id) — so a missing active_profile_id field
    // can never null out the state again.
    const aid = data.active_profile_id ?? (data as { profile_id?: string }).profile_id ?? null;
    if (aid) {
      setActiveProfileId(aid);
      await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, aid);
      // Derive accountType from whichever profile is currently active
      const activeP = backendProfiles.find(p => p.id === aid);
      if (activeP) {
        const t: 'personal' | 'business' = activeP.profile_type === 'business' ? 'business' : 'personal';
        setAccountType(t);
        await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, t);
      }
    }
  }

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
        const storedProfileId = await AsyncStorage.getItem(ACTIVE_PROFILE_ID_KEY);
        if (storedProfileId) setActiveProfileId(storedProfileId);
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
        // Shared, deduped refresh — if a 401-triggered retry elsewhere (response
        // interceptor) is also refreshing right now, both callers await the exact
        // same in-flight request/result instead of racing the single-use rotation.
        const result = await refreshAccessToken();

        if (result.success && result.accessToken) {
          // api/client.ts's performRefresh already called setAccessToken() and
          // persisted the rotated refresh token — just mirror it into React state.
          setAccessTokenState(result.accessToken);

          // Prefer user data embedded in the refresh response (saves a round
          // trip). Fall back to GET /auth/session if it wasn't included.
          const userFromRefresh = toAuthUser(result.user as SessionResponse | AuthUser | null | undefined);
          if (userFromRefresh) {
            if (__DEV__) console.log('[AuthContext] restoreSession: user came from refresh response, id:', userFromRefresh.id);
            setAuthUser(userFromRefresh);
          } else {
            if (__DEV__) console.log('[AuthContext] restoreSession: no user in refresh response, calling fetchCurrentUser');
            const userFromSession = await fetchCurrentUser();
            if (__DEV__) console.log('[AuthContext] restoreSession: fetchCurrentUser returned id:', userFromSession?.id ?? 'null');
            setAuthUser(userFromSession);
          }

          // Hydrate profiles now that we have a valid access token.
          // Non-fatal — if this fails the user can still use the app.
          try { await hydrateProfiles(); } catch { /* non-fatal */ }
        } else {
          // Refresh failed (invalid/expired token, network error, or lost the
          // single-use race to a concurrent caller) — clearTokens() already ran
          // inside performRefresh, just reflect the logged-out state here.
          if (__DEV__) console.log('[AuthContext] restoreSession: refresh did not yield a valid session, clearing');
          setAuthUser(null);
        }
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

      // The backend's login/signup `user` object rarely carries a display
      // name or avatar — they live on the sibling `profile` object instead
      // (camelCase on login, snake_case on signup). Prefer those over
      // falling back to email / no avatar.
      const profileData = (data as unknown as {
        profile?: { displayName?: string; display_name?: string; avatarUrl?: string; avatar_url?: string };
      }).profile;
      if (!user.name || user.name === user.email) {
        user.name = profileData?.displayName ?? profileData?.display_name ?? user.name;
      }
      if (!user.avatar) {
        user.avatar = resolveUrl(profileData?.avatarUrl ?? profileData?.avatar_url) ?? user.avatar;
      }

      setAuthUser(user);
      // Login response doesn't include the profiles array — fetch session to hydrate.
      try { await hydrateProfiles(); } catch { /* non-fatal */ }
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

      // Remove persisted preferences so the next login starts fresh.
      await AsyncStorage.removeItem(ACCOUNT_TYPE_KEY);
      await AsyncStorage.removeItem(ACTIVE_PROFILE_ID_KEY);

      // Reset all React state to logged-out defaults.
      setAuthUser(null);
      setAccountType('personal');
      setProfiles([]);
      setActiveProfileId(null);

      router.replace('/(auth)/sign-in');
    }
  }, [router]);

  // ── switchProfile ─────────────────────────────────────────────────────────
  // Switch the active profile by calling the backend.
  // Updates active_profile_id on the server, then syncs local state.
  // Falls back gracefully if the API call fails.
  const switchProfile = useCallback(async (profileId: string) => {
    try {
      const result = await authApi.switchProfile(profileId);
      if (result.success && result.data) {
        const { active_profile_type, active_profile_id, display_name, avatar_url } = result.data;
        setAccountType(active_profile_type);
        setActiveProfileId(active_profile_id);
        await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, active_profile_type);
        await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, active_profile_id);
        // Keep authUser's name/avatar in sync with the newly active profile — components like
        // ActiveProfileBadge and user-profile.tsx read authUser directly rather than
        // activeProfile, so without this they keep showing the previous profile after a switch.
        setAuthUser(prev => prev ? { ...prev, name: display_name, avatar: resolveUrl(avatar_url) } : prev);
        if (__DEV__) console.log('[AuthContext] switchProfile: switched to', active_profile_type);
      }
    } catch (err) {
      if (__DEV__) console.warn('[AuthContext] switchProfile: API call failed', err);
    }
  }, []);

  // ── switchAccount ─────────────────────────────────────────────────────────
  // Compatibility alias for ProfileSwitcherModal which switches by type name.
  // Looks up the profile of the requested type and delegates to switchProfile.
  // Falls back to local-only if the user has no profile of that type yet.
  const switchAccount = useCallback(async (type: 'personal' | 'business') => {
    const target = profiles.find(p => p.type === type);
    if (target) {
      await switchProfile(target.id);
    } else {
      // No profile of this type exists yet — update local state only
      setAccountType(type);
      await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, type);
    }
  }, [profiles, switchProfile]);

  // Derived — the full ProfileEntry for whichever profile is currently active.
  // Used by ProfileSwitcherPill to highlight the active pill.
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // ── Exposed context value ─────────────────────────────────────────────────
  return {
    authUser,
    accessToken,
    accountType,
    activeProfileId,
    activeProfile,       // ProfileEntry | undefined — used by ProfileSwitcherPill
    profiles,            // ProfileEntry[] — all profiles for this user
    authLoading,
    isAuthenticated: !!authUser,
    loginWithTokens,
    updateAuthUser,
    logout,
    switchAccount,       // compatibility alias (type-based switching)
    switchProfile,       // preferred: profile-id-based, calls backend
    refreshProfiles: hydrateProfiles, // call after creating/deleting a profile
  };
});
