import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Node-side service-role client for one-off scripts / GitHub Actions.
// Distinct from src/lib/supabase.ts, which reads bindings via `cloudflare:workers`
// and only works inside the deployed Worker runtime — plain Node scripts read
// process.env (populated here from `.env`, gitignored) instead.
export function getScriptSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see jobboard/.env)');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
