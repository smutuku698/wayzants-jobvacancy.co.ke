/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

// Secrets set via `wrangler secret put` (production) or `.dev.vars` (local) —
// not declared in wrangler.jsonc `vars`, so they're merged into the
// generated `Cloudflare.Env` interface here instead (the `env` export from
// `cloudflare:workers` is typed as `Cloudflare.Env`, not the bare `Env`).
declare namespace Cloudflare {
  interface Env {
    SUPABASE_SERVICE_ROLE_KEY: string;
    ADMIN_PASSWORD: string;
    PAYSTACK_SECRET_KEY: string;
  }
}
