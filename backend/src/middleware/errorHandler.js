const { fail } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

// Typed application error — carries an HTTP status code so controllers
// can return the right status without extra logic.
class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Use in catch blocks: res.json(handleError(scope, err))
function handleError(scope, err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error(scope, message, err);
  return fail(message);
}

// Express 4-argument error middleware — registered last in app.js
function globalErrorHandler(err, req, res, next) {
  logger.error('globalErrorHandler', err.message, err);
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(fail(err.message));
  }
  res.status(err.status || 500).json(fail(err.message || 'Internal server error'));
}

module.exports = { AppError, handleError, globalErrorHandler };
