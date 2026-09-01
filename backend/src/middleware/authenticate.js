const jwt = require('jsonwebtoken');
const { fail } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

function authenticate(req, res, next) { 
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json(fail('No token provided'));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    logger.warn('authenticate', 'invalid token', err.message);
    return res.status(401).json(fail('Invalid or expired token'));
  }
}

// For public routes that want to personalise the response when the caller happens to be
// logged in (e.g. flagging subscribed businesses), without requiring auth. Never rejects —
// req.user is simply left undefined if there's no token or it's invalid/expired.
function optionalAuthenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Silently ignore — this route works fine unauthenticated.
  }
  next();
}

module.exports = { authenticate, optionalAuthenticate };
