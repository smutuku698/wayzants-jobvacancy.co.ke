import { slugify } from '../../src/lib/format';
import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_SLUG_LENGTH = 80;

/** Generates a slug unique against the `jobs` table, reusing the same slugify() the live /post-a-job/ form uses. */
export async function uniqueSlug(supabase: SupabaseClient, title: string, companyName: string): Promise<string> {
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
