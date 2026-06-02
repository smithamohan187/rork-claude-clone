// backend/src/utils/logger.ts
type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, scope: string, message: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [${scope}] ${message}`;
  if (meta !== undefined) {
    console.log(line, meta);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (scope: string, message: string, meta?: unknown) => log('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: unknown) => log('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: unknown) => log('error', scope, message, meta),
  debug: (scope: string, message: string, meta?: unknown) => log('debug', scope, message, meta),
};
