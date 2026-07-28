// Ongoing scraper for cruise ship crew jobs (AllCruiseJobs.com, see
// scripts/lib/cruise-sources.ts), writing straight into Supabase. Safe to
// rerun — upserts on source_url, reuses existing slugs, only pays for the
// detail-page fetch and AI enhancement on genuinely new jobs.

import 'dotenv/config';
import { getScriptSupabaseAdmin } from './lib/supabase-admin';
import { uniqueSlug } from './lib/slug';
import { mapJobType, CRUISE_CATEGORY_SLUG, ABROAD_LOCATION_SLUG } from './lib/category-mapping';
import { liveEnhance } from './lib/ai-enhance';
import { fetchAllCruiseJobListings, fetchCruiseJobDetails } from './lib/cruise-sources';

const PLACEHOLDER_CONTACT_EMAIL = 'jobs@jobvacancy.co.ke';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity);

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
  const catId = categoryId.get(CRUISE_CATEGORY_SLUG);
  const locId = locationId.get(ABROAD_LOCATION_SLUG);
  if (!catId) throw new Error('cruise-ship-jobs category not found');
  if (!locId) throw new Error(`${ABROAD_LOCATION_SLUG} location not found`);

  console.log('Fetching cruise ship jobs from AllCruiseJobs.com...');
  const allJobs = await fetchAllCruiseJobListings();
  console.log(`Fetched ${allJobs.length} unique cruise ship job listings.`);
  const jobs = Number.isFinite(limit) ? allJobs.slice(0, limit) : allJobs;

  const existingSlugs = await fetchExistingSlugsByUrl(supabase);
  console.log(`${existingSlugs.size} jobs already in the database (by source_url).`);

  if (dryRun) {
    for (const job of jobs.slice(0, 20)) {
      const isNew = !existingSlugs.has(job.url);
      const detailed = isNew ? await fetchCruiseJobDetails(job) : job;
      console.log('\n---');
      console.log(JSON.stringify({ title: detailed.title, company: detailed.company, url: detailed.url, isNew }, null, 2));
    }
    console.log(`\nDRY RUN — ${jobs.length} rows would be processed, nothing written.`);
    return;
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    const isNew = !existingSlugs.has(job.url);
    const detailed = isNew ? await fetchCruiseJobDetails(job) : job;

    const row: Record<string, unknown> = {
      title: detailed.title,
      company_name: detailed.company || 'Cruise Line Employer',
      company_logo_url: null,
      description: detailed.description || detailed.title,
      category_id: catId,
      location_id: locId,
      job_type: mapJobType(`${detailed.title} ${detailed.description}`),
      is_remote: true,
      is_international: true,
      salary_min: null,
      salary_max: null,
      salary_currency: 'KES',
      application_method: 'url',
      application_value: detailed.url,
      deadline: null,
      status: 'approved',
      contact_name: null,
      contact_email: PLACEHOLDER_CONTACT_EMAIL,
      created_at: detailed.pubDate,
      source_url: detailed.url,
      source: detailed.source,
    };

    if (isNew) {
      row.approved_at = new Date().toISOString();
      row.ai_enhancement = await liveEnhance(supabase, {
        title: detailed.title,
        company: detailed.company || 'Cruise Line Employer',
        description: detailed.description,
        categorySlug: CRUISE_CATEGORY_SLUG,
        sourceCategory: detailed.category,
      });
      row.slug = await uniqueSlug(supabase, detailed.title, detailed.company || 'Cruise Line Employer');
    } else {
      row.slug = existingSlugs.get(detailed.url);
    }

    const { error } = await supabase.from('jobs').upsert(row, { onConflict: 'source_url' });
    if (error) {
      failed += 1;
      console.error(`Failed: ${detailed.title} — ${error.message}`);
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
