const jwt = require('jsonwebtoken');
const { fail } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

function authenticate(req, res, next) {
  console.log("req.headers:", req.headers);
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  console.log("Token:", token);
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

module.exports = { authenticate };
