// backend/hono.ts
// Minimal Hono entrypoint required by the deployment system.
// The real backend (Node.js + PostgreSQL) lives under backend/src/.
// This file simply exposes a placeholder Hono app so deploys succeed
// while the new modular backend is being built out.

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.get('/', (c) => c.json({ success: true, message: 'TouchPoint backend placeholder' }));
app.get('/health', (c) => c.json({ success: true, status: 'ok' }));

export default app;
