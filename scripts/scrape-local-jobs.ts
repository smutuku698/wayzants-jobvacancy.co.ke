// Ongoing scraper for Brites Management (Kenya local jobs), writing straight
// into Supabase. Unlike the historical import, uses the job's real URL as
// source_url (available since we fetch each job's own page), so dedup here
// is exact rather than a content-hash guess.

import 'dotenv/config';
import { getScriptSupabaseAdmin } from './lib/supabase-admin';
import { uniqueSlug } from './lib/slug';
import { parseSalary } from './lib/salary-parser';
import { mapLocalJobCategory, mapLocalJobLocation, mapJobType, LOCAL_JOBS_APPLY_EMAIL } from './lib/category-mapping';
import { liveEnhance } from './lib/ai-enhance';
import { fetchLocalJobs, type LocalJobListing } from './lib/local-sources';

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

function buildDescription(job: LocalJobListing): string {
  return [
    job.job_summary && `Job Summary\n${job.job_summary}`,
    job.duties_and_responsibilities && `Duties and Responsibilities\n${job.duties_and_responsibilities}`,
    job.key_requirements_skills_qualification && `Key Requirements / Skills / Qualifications\n${job.key_requirements_skills_qualification}`,
  ]
    .filter(Boolean)
    .join('\n\n') || job.job_title;
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

  const allJobs = await fetchLocalJobs();
  console.log(`Scraped ${allJobs.length} current job listings from britesmanagement.com.`);
  const jobs = Number.isFinite(limit) ? allJobs.slice(0, limit) : allJobs;

  const existingSlugs = await fetchExistingSlugsByUrl(supabase);
  console.log(`${existingSlugs.size} jobs already in the database (by source_url).`);

  if (dryRun) {
    for (const job of jobs.slice(0, 20)) {
      const categorySlug = mapLocalJobCategory(job);
      const locationSlug = mapLocalJobLocation(job.job_location);
      console.log('\n---');
      console.log(
        JSON.stringify({ title: job.job_title, categorySlug, locationSlug, salary: job.salary, url: job.url, isNew: !existingSlugs.has(job.url) }, null, 2)
      );
    }
    console.log(`\nDRY RUN — ${jobs.length} rows would be processed, nothing written.`);
    return;
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    const isNew = !existingSlugs.has(job.url);
    const categorySlug = mapLocalJobCategory(job);
    const locationSlug = mapLocalJobLocation(job.job_location);
    const catId = categoryId.get(categorySlug);
    const locId = locationId.get(locationSlug);
    if (!catId || !locId) {
      failed += 1;
      console.error(`Failed: ${job.job_title} — unknown category/location slug`);
      continue;
    }

    const salary = parseSalary(job.salary);
    const description = buildDescription(job);

    const row: Record<string, unknown> = {
      title: job.job_title,
      company_name: 'Confidential Employer',
      company_logo_url: null,
      description,
      category_id: catId,
      location_id: locId,
      job_type: mapJobType(job.nature_of_job),
      is_remote: locationSlug === 'international-remote' || locationSlug === 'remote-online-kenya',
      is_international: locationSlug === 'international-remote',
      salary_min: salary.salary_min,
      salary_max: salary.salary_max,
      salary_currency: salary.salary_currency,
      application_method: 'email',
      application_value: LOCAL_JOBS_APPLY_EMAIL,
      deadline: null,
      status: 'approved',
      contact_name: null,
      contact_email: LOCAL_JOBS_APPLY_EMAIL,
      source_url: job.url,
      source: 'britesmanagement',
    };

    if (isNew) {
      row.created_at = new Date().toISOString();
      row.approved_at = new Date().toISOString();
      row.ai_enhancement = await liveEnhance(supabase, { title: job.job_title, company: 'Confidential Employer', description, categorySlug });
      row.slug = await uniqueSlug(supabase, job.job_title, 'Confidential Employer');
    } else {
      row.slug = existingSlugs.get(job.url);
    }

    const { error } = await supabase.from('jobs').upsert(row, { onConflict: 'source_url' });
    if (error) {
      failed += 1;
      console.error(`Failed: ${job.job_title} — ${error.message}`);
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
