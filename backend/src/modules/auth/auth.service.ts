// backend/src/modules/auth/auth.service.ts
import { db } from '../../config/database';
import { ok, fail, ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import type { LoginInput, SignupInput } from './auth.schema';

export const authService = {
  async signup(input: SignupInput): Promise<ApiResponse<{ userId: string }>> {
    try {
      const { data, error } = await db().auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { full_name: input.full_name } },
      });
      if (error) return fail(error.message);
      if (!data.user) return fail('Signup failed: no user returned');
      return ok({ userId: data.user.id });
    } catch (err) {
      logger.error('authService.signup', String(err));
      return fail('Signup failed');
    }
  },

  async login(input: LoginInput): Promise<ApiResponse<{ userId: string; accessToken: string; refreshToken: string }>> {
    try {
      const { data, error } = await db().auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) return fail(error.message);
      if (!data.session || !data.user) return fail('Login failed');
      return ok({
        userId: data.user.id,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
    } catch (err) {
      logger.error('authService.login', String(err));
      return fail('Login failed');
    }
  },

  async logout(accessToken: string): Promise<ApiResponse<{ ok: true }>> {
    try {
      const { error } = await db().auth.admin.signOut(accessToken);
      if (error) return fail(error.message);
      return ok({ ok: true });
    } catch (err) {
      logger.error('authService.logout', String(err));
      return fail('Logout failed');
    }
  },

  async getSession(accessToken: string): Promise<ApiResponse<{ userId: string; email: string | null }>> {
    try {
      const { data, error } = await db().auth.getUser(accessToken);
      if (error || !data.user) return fail(error?.message ?? 'No session');
      return ok({ userId: data.user.id, email: data.user.email ?? null });
    } catch (err) {
      logger.error('authService.getSession', String(err));
      return fail('Session lookup failed');
    }
  },
};
