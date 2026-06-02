// backend/src/modules/auth/auth.controller.ts
import type { Context } from 'hono';
import { authService } from './auth.service';
import { LoginSchema, SignupSchema } from './auth.schema';
import { fail } from '../../utils/apiResponse';
import { handleError } from '../../middleware/errorHandler';

export const authController = {
  async signup(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = SignupSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await authService.signup(parsed.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('authController.signup', err), 500);
    }
  },

  async login(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = LoginSchema.safeParse(body);
      if (!parsed.success) return c.json(fail(parsed.error.message), 400);
      const result = await authService.login(parsed.data);
      return c.json(result, result.success ? 200 : 401);
    } catch (err) {
      return c.json(handleError('authController.login', err), 500);
    }
  },

  async logout(c: Context) {
    try {
      const token = c.req.header('Authorization')?.replace('Bearer ', '') ?? '';
      const result = await authService.logout(token);
      return c.json(result, result.success ? 200 : 400);
    } catch (err) {
      return c.json(handleError('authController.logout', err), 500);
    }
  },

  async session(c: Context) {
    try {
      const token = c.req.header('Authorization')?.replace('Bearer ', '') ?? '';
      const result = await authService.getSession(token);
      return c.json(result, result.success ? 200 : 401);
    } catch (err) {
      return c.json(handleError('authController.session', err), 500);
    }
  },
};
