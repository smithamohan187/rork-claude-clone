function log(level, scope, message, meta) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [${scope}] ${message}`;
  meta !== undefined ? console.log(line, meta) : console.log(line);
}

const logger = {
  info:  (scope, message, meta) => log('info',  scope, message, meta),
  warn:  (scope, message, meta) => log('warn',  scope, message, meta),
  error: (scope, message, meta) => log('error', scope, message, meta),
  debug: (scope, message, meta) => log('debug', scope, message, meta),
};

module.exports = { logger };
