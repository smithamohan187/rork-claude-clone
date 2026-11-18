const { Router } = require('express');
const { signupHandler, loginHandler, logoutHandler, refreshHandler, sessionHandler, switchProfileHandler, changePasswordHandler, listSessionsHandler, revokeSessionHandler, exportDataHandler } = require('./auth.controller');
const { validateRequest } = require('../../middleware/validateRequest');
const { registerSchema, loginSchema, logoutSchema, changePasswordSchema } = require('./auth.schema');
const { authenticate } = require('../../middleware/authenticate');

const router = Router();
router.post('/signup',  validateRequest(registerSchema), signupHandler);
router.post('/login',   validateRequest(loginSchema),   loginHandler);
router.post('/logout',  authenticate, validateRequest(logoutSchema), logoutHandler);
router.post('/refresh', refreshHandler);
router.get('/session', authenticate, sessionHandler);
router.post('/switch-profile', authenticate, switchProfileHandler);
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), changePasswordHandler);
router.get('/sessions', authenticate, listSessionsHandler);
router.delete('/sessions/:id', authenticate, revokeSessionHandler);
router.get('/export-data', authenticate, exportDataHandler);

module.exports = router;
