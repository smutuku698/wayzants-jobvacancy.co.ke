import { slugify } from '../../src/lib/format';
import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_SLUG_LENGTH = 80;

/**
 * Generates a slug unique against the `jobs` table, reusing the same slugify() the live /post-a-job/ form uses.
 * When `sourceUrl` is given and already has a row, its existing slug is reused as-is — otherwise re-importing
 * (upsert on source_url) would recompute a fresh slug each time and silently rename any job whose title+company
 * needed a numeric suffix to disambiguate (its old slug still "counts" as taken, bumping the suffix every run).
 */
export async function uniqueSlug(supabase: SupabaseClient, title: string, companyName: string, sourceUrl?: string): Promise<string> {
  if (sourceUrl) {
    const { data: existing, error } = await supabase.from('jobs').select('slug').eq('source_url', sourceUrl).maybeSingle();
    if (error) throw error;
    if (existing?.slug) return existing.slug;
  }

  const base = slugify(`${title}-${companyName}`).slice(0, MAX_SLUG_LENGTH).replace(/-$/, '') || 'job';

  let candidate = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.from('jobs').select('id').eq('slug', candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
