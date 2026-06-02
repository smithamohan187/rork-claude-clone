// backend/src/middleware/errorHandler.ts
import { fail } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export function handleError(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error(scope, message, err);
  return fail(message);
}
