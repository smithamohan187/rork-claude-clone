// backend/src/middleware/authenticate.ts
import { db } from '../config/database';
import { logger } from '../utils/logger';

export type AuthContext = {
  userId: string;
  email?: string;
  role?: string;
};

export async function authenticate(token: string | null | undefined): Promise<AuthContext | null> {
  if (!token) return null;
  try {
    const cleaned = token.startsWith('Bearer ') ? token.slice(7) : token;
    const { data, error } = await db().auth.getUser(cleaned);
    if (error || !data?.user) {
      logger.warn('authenticate', 'invalid token', error?.message);
      return null;
    }
    return {
      userId: data.user.id,
      email: data.user.email ?? undefined,
      role: (data.user.app_metadata as { role?: string } | null)?.role,
    };
  } catch (err) {
    logger.error('authenticate', 'unexpected error', err);
    return null;
  }
}
