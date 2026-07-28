// One-time historical import: reads the three legacy JSON datasets from the
// old Next.js jobvacancy.co.ke project and inserts them into Supabase as
// approved jobs. Safe to re-run — every row upserts on `source_url` (real URL
// for remote/NGO jobs, a synthesized content hash for local jobs, which have
// none in the source data).
//
// Usage:
//   tsx scripts/import-legacy-jobs.ts --dry-run --limit=20
//   tsx scripts/import-legacy-jobs.ts --only=local --limit=50
//   tsx scripts/import-legacy-jobs.ts                 (full run, all sources)

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getScriptSupabaseAdmin } from './lib/supabase-admin';
import { uniqueSlug } from './lib/slug';
import { parseSalary } from './lib/salary-parser';
import {
  mapLocalJobCategory,
  mapLocalJobLocation,
  mapNgoJobLocation,
  mapJobType,
  REMOTE_CATEGORY_SLUG,
} from './lib/category-mapping';
import { remapLegacyEnhancement, deriveEnhancementFromLocalJob } from './lib/ai-enhance';
import { decodeHtmlEntities, repairMojibake, cleanCompanyName, isLikelyNonJobListing } from './lib/text-utils';
import type { AiEnhancement } from '../src/lib/types';
import type { LegacyLocalJob, LegacyNgoJob, LegacyRemoteJob } from './lib/legacy-types';

const LEGACY_DATA_DIR = 'C:\\Users\\Atom\\Documents\\jobvacancy.co.ke-main-themechange\\data';
const PLACEHOLDER_CONTACT_EMAIL = 'jobs@jobvacancy.co.ke';
// local-jobs.json's own "how_to_apply" text points at whatever inbox was set
// when it was scraped (some rows say hr@legithustle.co.ke, a different site) —
// user confirmed all local-job applications should route to this inbox instead.
const LOCAL_JOBS_APPLY_EMAIL = 'hr@jobvacancy.co.ke';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity);
const onlySource = args.find((a) => a.startsWith('--only='))?.split('=')[1] as 'remote' | 'ngo' | 'local' | undefined;

interface NewJobRow {
  title: string;
  company_name: string;
  company_logo_url: null;
  description: string;
  category_id: string;
  location_id: string;
  job_type: string;
  is_remote: boolean;
  is_international: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  application_method: 'email' | 'url';
  application_value: string;
  deadline: null;
  status: 'approved';
  contact_name: null;
  contact_email: string;
  created_at: string;
  approved_at: string;
  source_url: string;
  source: string;
  ai_enhancement: AiEnhancement | null;
}

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

/** Parses a legacy date string to ISO; clamps future-dated/invalid entries to now() so "posted X ago" and sitemap lastmod stay sane. */
function toPastIso(raw: string | undefined): string {
  const now = new Date();
  if (!raw) return now.toISOString();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()) || parsed > now) return now.toISOString();
  return parsed.toISOString();
}

function loadJson<T>(filename: string): T {
  const raw = readFileSync(path.join(LEGACY_DATA_DIR, filename), 'utf8');
  return JSON.parse(raw) as T;
}

function buildRemoteRows(categoryId: Map<string, string>, locationId: Map<string, string>): NewJobRow[] {
  const data = loadJson<{ jobs: LegacyRemoteJob[] }>('enhanced-jobs.json');
  const cat = categoryId.get(REMOTE_CATEGORY_SLUG)!;
  const loc = locationId.get('international-remote')!;

  return data.jobs
    .filter((j) => j.url && j.title && j.company && !isLikelyNonJobListing(j.title))
    .map((j): NewJobRow => {
      const enhancement = remapLegacyEnhancement(j);
      const salary =
        j.enhancement?.kenyaSalaryMin != null
          ? { salary_min: j.enhancement.kenyaSalaryMin, salary_max: j.enhancement.kenyaSalaryMax ?? j.enhancement.kenyaSalaryMin, salary_currency: 'KES' }
          : parseSalary(undefined);
      return {
        title: repairMojibake(decodeHtmlEntities(j.title)),
        company_name: cleanCompanyName(j.company),
        company_logo_url: null,
        description: repairMojibake(decodeHtmlEntities(j.description ?? '')).trim() || j.title,
        category_id: cat,
        location_id: loc,
        job_type: mapJobType(`${j.title} ${(j.tags ?? []).join(' ')}`),
        is_remote: true,
        is_international: true,
        ...salary,
        application_method: 'url',
        application_value: j.url,
        deadline: null,
        status: 'approved',
        contact_name: null,
        contact_email: PLACEHOLDER_CONTACT_EMAIL,
        created_at: toPastIso(j.pubDate),
        approved_at: new Date().toISOString(),
        source_url: j.url,
        source: j.source,
        ai_enhancement: enhancement,
      };
    });
}

function buildNgoRows(categoryId: Map<string, string>, locationId: Map<string, string>): NewJobRow[] {
  const data = loadJson<{ jobs: LegacyNgoJob[] }>('enhanced-ngo-jobs.json');
  const cat = categoryId.get('ngo-jobs')!;

  return data.jobs
    .filter((j) => j.url && j.title && j.company && !isLikelyNonJobListing(j.title))
    .map((j): NewJobRow => {
      const enhancement = remapLegacyEnhancement(j);
      const locSlug = mapNgoJobLocation(j.location ?? '');
      const isRemote = locSlug === 'international-remote';
      const salary =
        j.enhancement?.kenyaSalaryMin != null
          ? { salary_min: j.enhancement.kenyaSalaryMin, salary_max: j.enhancement.kenyaSalaryMax ?? j.enhancement.kenyaSalaryMin, salary_currency: 'KES' }
          : parseSalary(undefined);
      return {
        title: repairMojibake(decodeHtmlEntities(j.title)),
        company_name: cleanCompanyName(j.company),
        company_logo_url: null,
        description: repairMojibake(decodeHtmlEntities(j.description ?? '')).trim() || j.title,
        category_id: cat,
        location_id: locationId.get(locSlug)!,
        job_type: mapJobType(`${j.title} ${(j.tags ?? []).join(' ')}`),
        is_remote: isRemote,
        is_international: isRemote,
        ...salary,
        application_method: 'url',
        application_value: j.url,
        deadline: null,
        status: 'approved',
        contact_name: null,
        contact_email: PLACEHOLDER_CONTACT_EMAIL,
        created_at: toPastIso(j.pubDate),
        approved_at: new Date().toISOString(),
        source_url: j.url,
        source: j.source,
        ai_enhancement: enhancement,
      };
    });
}

function buildLocalRows(categoryId: Map<string, string>, locationId: Map<string, string>): NewJobRow[] {
  const data = loadJson<{ jobs: LegacyLocalJob[] }>('local-jobs.json');

  return data.jobs
    .filter((j) => j.job_title)
    .map((j): NewJobRow => {
      const categorySlug = mapLocalJobCategory(j);
      const locationSlug = mapLocalJobLocation(j.job_location ?? '');
      const applyEmail = LOCAL_JOBS_APPLY_EMAIL;
      const salary = parseSalary(j.salary);

      const description = [
        j.duties_and_responsibilities && `Duties and Responsibilities\n${j.duties_and_responsibilities}`,
        j.key_requirements_skills_qualification && `Key Requirements / Skills / Qualifications\n${j.key_requirements_skills_qualification}`,
        j.benefits && `Benefits\n${j.benefits}`,
        j.work_environment && `Work Environment\n${j.work_environment}`,
        j.career_growth && `Career Growth\n${j.career_growth}`,
        j.company_insights && `About the Employer\n${j.company_insights}`,
        j.market_context && `Kenya Job Market Context\n${j.market_context}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const dedupeSource = `britesmanagement:${sha1(`${j.job_title}|${j.date}|${j.job_location}|${(j.duties_and_responsibilities ?? '').slice(0, 80)}`)}`;

      return {
        title: j.job_title,
        company_name: 'Confidential Employer',
        company_logo_url: null,
        description: description || j.job_title,
        category_id: categoryId.get(categorySlug)!,
        location_id: locationId.get(locationSlug)!,
        job_type: mapJobType(j.nature_of_job ?? ''),
        is_remote: locationSlug === 'international-remote' || locationSlug === 'remote-online-kenya',
        is_international: locationSlug === 'international-remote',
        ...salary,
        application_method: 'email',
        application_value: applyEmail,
        deadline: null,
        status: 'approved',
        contact_name: null,
        contact_email: applyEmail,
        created_at: toPastIso(j.date),
        approved_at: new Date().toISOString(),
        source_url: dedupeSource,
        source: 'britesmanagement',
        ai_enhancement: deriveEnhancementFromLocalJob(j),
      };
    });
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

  let rows: NewJobRow[] = [];
  if (!onlySource || onlySource === 'remote') rows = rows.concat(buildRemoteRows(categoryId, locationId));
  if (!onlySource || onlySource === 'ngo') rows = rows.concat(buildNgoRows(categoryId, locationId));
  if (!onlySource || onlySource === 'local') rows = rows.concat(buildLocalRows(categoryId, locationId));

  const invalid = rows.filter((r) => !r.category_id || !r.location_id || !r.title || !r.company_name);
  if (invalid.length > 0) {
    console.error(`${invalid.length} row(s) failed to map to a valid category/location — aborting. First: ${JSON.stringify(invalid[0])}`);
    process.exit(1);
  }

  const limited = Number.isFinite(limit) ? rows.slice(0, limit) : rows;
  console.log(`Prepared ${limited.length} of ${rows.length} total rows${dryRun ? ' — DRY RUN, nothing will be written' : ''}.`);

  if (dryRun) {
    for (const r of limited.slice(0, 20)) {
      console.log('\n---');
      console.log(
        JSON.stringify(
          {
            title: r.title,
            company_name: r.company_name,
            category_id: r.category_id,
            location_id: r.location_id,
            job_type: r.job_type,
            is_remote: r.is_remote,
            salary_min: r.salary_min,
            salary_max: r.salary_max,
            salary_currency: r.salary_currency,
            application_method: r.application_method,
            application_value: r.application_value,
            contact_email: r.contact_email,
            source: r.source,
            source_url: r.source_url,
            created_at: r.created_at,
            ai_enhancement: r.ai_enhancement,
          },
          null,
          2
        )
      );
    }
    return;
  }

  let inserted = 0;
  let failed = 0;
  for (const row of limited) {
    const slug = await uniqueSlug(supabase, row.title, row.company_name);
    const { error } = await supabase.from('jobs').upsert({ ...row, slug }, { onConflict: 'source_url' });
    if (error) {
      failed += 1;
      console.error(`Failed: ${row.title} (${row.source}) — ${error.message}`);
    } else {
      inserted += 1;
      if (inserted % 100 === 0) console.log(`...${inserted} rows written`);
    }
  }

  console.log(`\nDone. ${inserted} rows written, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
