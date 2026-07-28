// Ongoing scraper for worldwide remote jobs — same sources/filters as the old
// site's lib/all-jobs-fetcher.ts (see scripts/lib/remote-sources.ts), writing
// straight into Supabase instead of a JSON file. Safe to rerun on a schedule:
// upserts on source_url, and only pays for AI enhancement on genuinely new
// jobs (existing rows keep whatever enhancement they already have).

import 'dotenv/config';
import { getScriptSupabaseAdmin } from './lib/supabase-admin';
import { uniqueSlug } from './lib/slug';
import { parseSalary } from './lib/salary-parser';
import { mapJobType, REMOTE_CATEGORY_SLUG } from './lib/category-mapping';
import { liveEnhance } from './lib/ai-enhance';
import { fetchAllRemoteJobs } from './lib/remote-sources';

const PLACEHOLDER_CONTACT_EMAIL = 'jobs@jobvacancy.co.ke';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity);

// Maps source_url -> existing slug. Postgres validates NOT NULL constraints
// (like `slug`) on the upsert's insert-candidate row even when it resolves to
// an UPDATE via ON CONFLICT — omitting `slug` for an "existing row" update
// isn't safe like omitting a nullable column (e.g. ai_enhancement) is; every
// upsert call must supply a slug, so existing rows reuse their current one.
async function fetchExistingSlugsByUrl(supabase: ReturnType<typeof getScriptSupabaseAdmin>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const BATCH_SIZE = 1000;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.from('jobs').select('source_url, slug').not('source_url', 'is', null).range(offset, offset + BATCH_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) if (row.source_url) map.set(row.source_url, row.slug);
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  return map;
}

async function main() {
  const supabase = getScriptSupabaseAdmin();

  const [{ data: categories, error: catErr }, { data: locations, error: locErr }] = await Promise.all([
    supabase.from('job_categories').select('id, slug'),
    supabase.from('locations').select('id, slug'),
  ]);
  if (catErr) throw catErr;
  if (locErr) throw locErr;

  const categoryId = new Map((categories ?? []).map((c) => [c.slug, c.id]));
  const locationId = new Map((locations ?? []).map((l) => [l.slug, l.id]));
  const catId = categoryId.get(REMOTE_CATEGORY_SLUG);
  const locId = locationId.get('international-remote');
  if (!catId || !locId) throw new Error('online-remote-jobs category or international-remote location not found');

  console.log('Fetching remote jobs from WeWorkRemotely, Remotive, RemoteOK, Arbeitnow...');
  const allJobs = await fetchAllRemoteJobs();
  console.log(`Fetched ${allJobs.length} unique remote jobs matching filters.`);
  const jobs = Number.isFinite(limit) ? allJobs.slice(0, limit) : allJobs;

  const existingSlugs = await fetchExistingSlugsByUrl(supabase);
  console.log(`${existingSlugs.size} jobs already in the database (by source_url).`);

  if (dryRun) {
    for (const job of jobs.slice(0, 20)) {
      console.log('\n---');
      console.log(JSON.stringify({ title: job.title, company: job.company, source: job.source, url: job.url, pubDate: job.pubDate, isNew: !existingSlugs.has(job.url) }, null, 2));
    }
    console.log(`\nDRY RUN — ${jobs.length} rows would be processed, nothing written.`);
    return;
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    const isNew = !existingSlugs.has(job.url);
    const salary = parseSalary(job.salary);

    const row: Record<string, unknown> = {
      title: job.title,
      company_name: job.company,
      company_logo_url: null,
      description: job.description || job.title,
      category_id: catId,
      location_id: locId,
      job_type: mapJobType(`${job.title} ${job.tags.join(' ')}`),
      is_remote: true,
      is_international: true,
      salary_min: salary.salary_min,
      salary_max: salary.salary_max,
      salary_currency: salary.salary_currency,
      application_method: 'url',
      application_value: job.url,
      deadline: null,
      status: 'approved',
      contact_name: null,
      contact_email: PLACEHOLDER_CONTACT_EMAIL,
      created_at: job.pubDate,
      source_url: job.url,
      source: job.source,
    };

    if (isNew) {
      row.approved_at = new Date().toISOString();
      row.ai_enhancement = await liveEnhance(supabase, { title: job.title, company: job.company, description: job.description, categorySlug: REMOTE_CATEGORY_SLUG });
      row.slug = await uniqueSlug(supabase, job.title, job.company);
    } else {
      row.slug = existingSlugs.get(job.url);
    }

    const { error } = await supabase.from('jobs').upsert(row, { onConflict: 'source_url' });
    if (error) {
      failed += 1;
      console.error(`Failed: ${job.title} (${job.source}) — ${error.message}`);
    } else if (isNew) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  console.log(`\nDone. ${inserted} new jobs inserted, ${updated} existing jobs refreshed, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
