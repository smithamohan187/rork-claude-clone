const { Router } = require('express');
const { signupHandler, loginHandler, registerHandler } = require('./auth.controller');
const { validateRequest } = require('../../middleware/validateRequest');
const { registerSchema, loginSchema } = require('./auth.schema');

const router = Router();
router.post('/signup', validateRequest(registerSchema), signupHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/register', registerHandler);

module.exports = router;
