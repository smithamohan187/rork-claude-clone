import { Platform } from 'react-native';
import apiClient, {
  ApiResult,
  AuthStateCallback,
  isApiConfigured,
  OtpType,
  SignInResult,
} from './apiClient';
import { createUser, userExists } from './userService';
import {
  createProfile,
  getDefaultProfileId,
  updateDefaultProfile,
} from './profileService';
import {
  createUserSession,
  getSessionByUserId,
  updateUserSession,
} from './sessionService';

export type RegisterMode = 'email' | 'phone';

export interface RegisterInput {
  mode: RegisterMode;
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface RegisterResult {
  authUserId: string;
  hasSession: boolean;
  skipped: boolean;
}

export class RegisterError extends Error {
  kind: 'auth' | 'db';
  constructor(message: string, kind: 'auth' | 'db') {
    super(message);
    this.kind = kind;
    this.name = 'RegisterError';
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<ApiResult<{ userId: string; hasSession: boolean }>> {
  if (!isApiConfigured) {
    return {
      data: null,
      error: {
        message:
          'Backend is not configured. Please set up your environment variables.',
      },
    };
  }
  return apiClient.signIn(email.trim(), password);
}

export async function signInWithPhoneOtp(
  phone: string,
): Promise<ApiResult<null>> {
  if (!isApiConfigured) {
    return {
      data: null,
      error: {
        message:
          'Backend is not configured. Please set up your environment variables.',
      },
    };
  }
  return apiClient.signInWithOtp({ phone: phone.trim() });
}

export async function getCurrentSession() {
  return apiClient.getSession();
}

export async function getCurrentUser() {
  return apiClient.getCurrentUser();
}

export function onAuthStateChange(cb: AuthStateCallback): () => void {
  return apiClient.onAuthStateChange(cb);
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  console.log('[authService] Starting registration, mode:', input.mode);
  if (!isApiConfigured) {
    throw new RegisterError(
      'Backend is not configured. Please set up your environment variables.',
      'auth',
    );
  }

  const { mode, fullName, email, phoneNumber, password } = input;
  const trimmedName = fullName.trim();
  const nowIso = new Date().toISOString();

  const signUpRes = await apiClient.signUp(
    mode === 'email'
      ? { email: email.trim(), password, metadata: { full_name: trimmedName } }
      : {
          phone: `+91${phoneNumber.trim()}`,
          password,
          metadata: { full_name: trimmedName },
        },
  );
  if (signUpRes.error) {
    console.log('[authService] Auth error:', signUpRes.error.message);
    throw new RegisterError(signUpRes.error.message, 'auth');
  }
  const authUserId = signUpRes.data?.userId ?? '';
  const hasSession = !!signUpRes.data?.hasSession;
  if (!authUserId) {
    throw new RegisterError(
      'Unable to create account. Please verify your account and try again.',
      'auth',
    );
  }
  console.log('[authService] Auth user created:', authUserId);

  const existsRes = await userExists(authUserId);
  console.log('[authService] Existing user:', existsRes.data, 'err:', existsRes.error);
  if (!existsRes.data) {
    const createRes = await createUser({
      id: authUserId,
      email: mode === 'email' ? email.trim() : null,
      phone: mode === 'phone' ? `+91${phoneNumber.trim()}` : null,
      full_name: trimmedName,
      auth_provider: 'email',
      is_active: true,
      is_verified: false,
      created_at: nowIso,
      updated_at: nowIso,
    });
    console.log('[authService] Step 2 - User insert error:', createRes.error);
    if (createRes.error) {
      throw new RegisterError(
        `Failed to save user: ${createRes.error.message}`,
        'db',
      );
    }
    console.log('[authService] Step 2 - User insert SUCCESS');
  } else {
    console.log('[authService] Step 2 - User already exists, skipping insert');
  }

  const existingProfileRes = await getDefaultProfileId(authUserId);
  console.log(
    '[authService] Step 3 - Existing profile:',
    existingProfileRes.data,
    'err:',
    existingProfileRes.error,
  );

  let profileId = existingProfileRes.data?.id ?? '';
  if (!profileId) {
    const createProfileRes = await createProfile({
      user_id: authUserId,
      profile_type: 'personal',
      display_name: trimmedName,
      avatar_url: null,
      is_default: true,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    });
    console.log(
      '[authService] Step 3 - Profile insert error:',
      createProfileRes.error,
    );
    console.log('[authService] Step 3 - Profile data:', createProfileRes.data);
    if (createProfileRes.error) {
      throw new RegisterError(
        `Failed to create profile: ${createProfileRes.error.message}`,
        'db',
      );
    }
    profileId = createProfileRes.data?.id ?? '';
    if (!profileId) {
      throw new RegisterError('Profile creation failed', 'db');
    }
    console.log('[authService] Step 3 - New profile id:', profileId);
  } else {
    console.log('[authService] Step 3 - Profile already exists:', profileId);
  }

  try {
    const existingSession = await getSessionByUserId(authUserId);
    console.log('[authService] Step 4 - Existing session:', existingSession.data);
    if (existingSession.data) {
      const upd = await updateUserSession(authUserId, {
        active_profile_id: profileId || null,
        last_seen_at: nowIso,
      });
      console.log('[authService] Step 4 - Session update error:', upd.error);
      if (upd.error) {
        console.log('[authService] Session update failed:', upd.error.message);
      } else {
        console.log('[authService] Step 4 - Session updated SUCCESS');
      }
    } else {
      const deviceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ins = await createUserSession({
        user_id: authUserId,
        active_profile_id: profileId || null,
        device_id: deviceId,
        platform: Platform.OS,
        last_seen_at: nowIso,
        created_at: nowIso,
      });
      console.log('[authService] Step 4 - Session insert error:', ins.error);
      if (ins.error) {
        console.log('[authService] Session insert failed:', ins.error.message);
      } else {
        console.log('[authService] Step 4 - Session insert SUCCESS');
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log('[authService] Session failed but continuing:', msg);
  }

  return { authUserId, hasSession, skipped: false };
}

export async function handleSignOut(): Promise<void> {
  console.log('[authService] handleSignOut: starting');
  const userRes = await apiClient.getCurrentUser();
  const authUserId = userRes.data?.id;
  if (authUserId) {
    const upd = await updateUserSession(authUserId, {
      active_profile_id: null,
      last_seen_at: new Date().toISOString(),
    });
    if (upd.error) {
      console.log(
        '[authService] handleSignOut: session update failed (non-blocking):',
        upd.error.message,
      );
    }
  } else {
    console.log('[authService] handleSignOut: no auth user id, skipping session update');
  }

  const signOutRes = await apiClient.signOut();
  if (signOutRes.error) {
    console.log('[authService] handleSignOut: auth signOut error:', signOutRes.error.message);
    throw new Error(signOutRes.error.message);
  }
  console.log('[authService] handleSignOut: complete');
}

export async function sendPasswordResetEmail(
  email: string,
): Promise<ApiResult<null>> {
  if (!isApiConfigured) {
    return {
      data: null,
      error: {
        message:
          'Backend is not configured. Please set up your environment variables.',
      },
    };
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return {
      data: null,
      error: { message: 'Please enter a valid email address.', code: 'INVALID_EMAIL' },
    };
  }
  console.log('[authService] sendPasswordResetEmail:', trimmed);
  const redirectTo = 'rork-app://reset-password';
  const res = await apiClient.resetPassword(trimmed, { redirectTo });
  if (res.error) {
    const raw = res.error.message || '';
    let friendly = 'We could not send the reset email. Please try again.';
    if (res.error.code === 'NETWORK') {
      friendly =
        'Could not reach the server. Please check your internet connection and try again.';
    } else if (/user not found|no user|not found/i.test(raw)) {
      friendly = "We couldn't find an account with that email.";
    } else if (/rate|too many|limit/i.test(raw)) {
      friendly = 'Too many requests. Please wait a moment before trying again.';
    } else if (/invalid|email/i.test(raw)) {
      friendly = 'Please enter a valid email address.';
    }
    return { data: null, error: { message: friendly, code: res.error.code } };
  }
  return { data: null, error: null };
}

export async function sendOtp(
  identifier: string,
  type: OtpType,
): Promise<ApiResult<null>> {
  if (!isApiConfigured) {
    return {
      data: null,
      error: {
        message:
          'Backend is not configured. Please set up your environment variables.',
      },
    };
  }
  const trimmed = identifier.trim();
  if (!trimmed) {
    return {
      data: null,
      error: { message: 'Please enter your email or phone number.' },
    };
  }
  console.log('[authService] sendOtp:', type, trimmed);
  const res = await apiClient.sendOtp(trimmed, type);
  if (res.error) {
    const raw = res.error.message || '';
    let friendly = 'We could not send the code. Please try again.';
    if (res.error.code === 'NETWORK') {
      friendly =
        'Could not reach the server. Please check your internet connection and try again.';
    } else if (/signups? not allowed|not found|no user/i.test(raw)) {
      friendly = "We couldn't find an account with those details.";
    } else if (/rate|too many|limit/i.test(raw)) {
      friendly = 'Too many requests. Please wait a moment before trying again.';
    } else if (/invalid/i.test(raw)) {
      friendly = 'Please enter a valid email or phone number.';
    }
    return { data: null, error: { message: friendly, code: res.error.code } };
  }
  return { data: null, error: null };
}

export async function verifyOtp(
  identifier: string,
  token: string,
  type: OtpType,
): Promise<ApiResult<SignInResult>> {
  if (!isApiConfigured) {
    return {
      data: null,
      error: {
        message:
          'Backend is not configured. Please set up your environment variables.',
      },
    };
  }
  const trimmed = identifier.trim();
  const code = token.trim();
  console.log('[authService] verifyOtp:', type, trimmed);
  const res = await apiClient.verifyOtp(trimmed, code, type);
  if (res.error) {
    const raw = res.error.message || '';
    let friendly = 'Invalid code. Please try again.';
    if (res.error.code === 'NETWORK') {
      friendly =
        'Could not reach the server. Please check your internet connection and try again.';
    } else if (/expired/i.test(raw)) {
      friendly = 'This code has expired. Please request a new one.';
    } else if (/rate|too many|limit/i.test(raw)) {
      friendly = 'Too many attempts. Please request a new code.';
    }
    return { data: null, error: { message: friendly, code: res.error.code } };
  }
  return { data: res.data, error: null };
}

export async function updateAvatarOnProfile(
  userId: string,
  avatarUrl: string,
): Promise<ApiResult<null>> {
  return updateDefaultProfile(userId, {
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  });
}
