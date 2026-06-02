// backend/src/config/database.ts
// Supabase client used by backend services for now.
// This will be swapped to a PostgreSQL pool (pg / drizzle / prisma) later
// without changing any service-layer call sites.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let _client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    env.SUPABASE_URL || 'https://placeholder.supabase.co',
    env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || 'placeholder',
    { auth: { persistSession: false } },
  );
  return _client;
}
