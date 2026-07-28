import { env } from 'cloudflare:workers';

/** Typed access to Cloudflare bindings/vars + secrets (see src/env.d.ts). */
export function getEnv() {
  return env;
}
