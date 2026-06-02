// backend/src/modules/auth/auth.routes.ts
import { Hono } from 'hono';
import { authController } from './auth.controller';

const auth = new Hono();

auth.post('/signup', authController.signup);
auth.post('/login', authController.login);
auth.post('/logout', authController.logout);
auth.get('/session', authController.session);

export default auth;
