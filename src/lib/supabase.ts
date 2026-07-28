import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

/** Anon-key client — safe for public reads, gated by RLS. */
export function getSupabase() {
  const env = getEnv();
  return createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

/** Service-role client — server-only, bypasses RLS. Never expose to the client. */
export function getSupabaseAdmin() {
  const env = getEnv();
  return createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
