const { Router } = require('express');
const { signupHandler, loginHandler, logoutHandler } = require('./auth.controller');
const { validateRequest } = require('../../middleware/validateRequest');
const { registerSchema, loginSchema, logoutSchema } = require('./auth.schema');
const { authenticate } = require('../../middleware/authenticate');

const router = Router();
router.post('/signup', validateRequest(registerSchema), signupHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/logout', authenticate, validateRequest(logoutSchema), logoutHandler);

module.exports = router;
