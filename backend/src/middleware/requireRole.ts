// backend/src/middleware/requireRole.ts
import type { AuthContext } from './authenticate';

export function requireRole(ctx: AuthContext | null, roles: string[]): { allowed: boolean; reason?: string } {
  if (!ctx) return { allowed: false, reason: 'Not authenticated' };
  if (!ctx.role) return { allowed: false, reason: 'No role assigned' };
  if (!roles.includes(ctx.role)) return { allowed: false, reason: 'Insufficient permissions' };
  return { allowed: true };
}
