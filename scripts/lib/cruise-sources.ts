// Faithful port of the old Python cruise_ship_jobs_scraper's AllCruiseJobs
// source (allcruisejobs.com) — plain HTML, no JS rendering, fetch + cheerio
// like every other scraper in this project. The scraper's other source,
// Viking Cruises' own careers site, requires Selenium (JS-rendered listing
// page) — this project has no headless-browser dependency, so that source is
// intentionally not ported live; its jobs live on in the historical seed
// (see import-legacy-jobs.ts --only=cruise) instead.

import * as cheerio from 'cheerio';
import { isLikelyNonJobListing, decodeHtmlEntities, repairMojibake } from './text-utils';

export interface CruiseJobListing {
  title: string;
  company: string;
  description: string;
  location: string;
  url: string;
  pubDate: string;
  tags: string[];
  /** Old-style function category for template-fallback selection — not the DB category_id, which is always cruise-ship-jobs. */
  category: string;
  source: 'allcruisejobs';
}

const BASE_URL = 'https://www.allcruisejobs.com';

const CATEGORIES = [
  'deck-jobs', 'engine-technical-jobs', 'housekeeping-jobs', 'galley-jobs', 'restaurant-jobs',
  'beverages-jobs', 'entertainment-jobs', 'guest-services-jobs', 'retail-jobs', 'casino-jobs',
  'spa-beauty-jobs', 'medical-jobs', 'photography-jobs', 'it-jobs', 'management-jobs',
  'youth-jobs', 'shore-excursions-jobs', 'administration-jobs', 'land-based-jobs',
];

// Ported as-is from the old site's AllCruiseJobsScraper — keyed by the
// site's own category slugs, for template-fallback selection only.
const CATEGORY_MAP: Record<string, string> = {
  'restaurant-jobs': 'Customer Service',
  'beverages-jobs': 'Customer Service',
  'guest-services-jobs': 'Customer Service',
  'retail-jobs': 'Sales',
  'shore-excursions-jobs': 'Sales',
  'medical-jobs': 'Healthcare',
  'it-jobs': 'Programming',
  'management-jobs': 'Management',
};

function mapCategory(siteCategory: string): string {
  return CATEGORY_MAP[siteCategory] ?? 'Other';
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Not anchored to the start — allcruisejobs.com's own links are absolute
// (https://www.allcruisejobs.com/i60900/...), not relative.
const JOB_HREF_RE = /\/i(\d+)\//;

async function fetchCategoryPage(category: string, page: number): Promise<{ id: string; title: string; url: string }[]> {
  const url = page === 1 ? `${BASE_URL}/${category}/` : `${BASE_URL}/${category}/${page}/`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) return [];
  const html = await response.text();
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const jobs: { id: string; title: string; url: string }[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(JOB_HREF_RE);
    if (!match) return;
    const id = match[1];
    if (seen.has(id)) return;
    const title = $(el).text().trim();
    if (!title || title.length < 4) return;
    seen.add(id);
    jobs.push({ id, title, url: new URL(href, BASE_URL).toString() });
  });
  return jobs;
}

/** Listing-only pass across all categories — cheap, no per-job detail fetch. Call fetchCruiseJobDetails() per job afterward, but only for genuinely new jobs (mirrors how liveEnhance() is only paid for on new rows). */
export async function fetchAllCruiseJobListings(maxPagesPerCategory = 2): Promise<CruiseJobListing[]> {
  const all: CruiseJobListing[] = [];
  const seenIds = new Set<string>();

  for (const category of CATEGORIES) {
    for (let page = 1; page <= maxPagesPerCategory; page++) {
      let pageJobs: { id: string; title: string; url: string }[];
      try {
        pageJobs = await fetchCategoryPage(category, page);
      } catch (err) {
        console.error(`AllCruiseJobs ${category} page ${page} failed:`, err);
        break;
      }
      if (pageJobs.length === 0) break;

      for (const job of pageJobs) {
        if (seenIds.has(job.id)) continue;
        seenIds.add(job.id);
        if (isLikelyNonJobListing(job.title)) continue;
        all.push({
          title: repairMojibake(decodeHtmlEntities(job.title)),
          company: '',
          description: '',
          location: '',
          url: job.url,
          pubDate: new Date().toISOString(),
          tags: [],
          category: mapCategory(category),
          source: 'allcruisejobs',
        });
      }
    }
  }

  return all;
}

interface CruiseJsonLd {
  description?: string;
  jobLocation?: { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string | { name?: string } } };
}

/** Enriches a single job with employer/description/location from its detail page. Only worth calling for genuinely new jobs. */
export async function fetchCruiseJobDetails(job: CruiseJobListing): Promise<CruiseJobListing> {
  try {
    const response = await fetch(job.url, { headers: HEADERS });
    if (!response.ok) return job;
    const html = await response.text();
    const $ = cheerio.load(html);

    // #job-details-summary is a <dl> of Recruiter/Category/Position/Salary/Updated
    // pairs — the recruiter's own profile link is the real employer name.
    const employer = $('#job-details-summary dd a').first().text().trim();

    // The page's own description container also contains an embedded
    // <script>/JSON-LD blob as text-node siblings, which .text() would pull
    // in — the structured JSON-LD's own `description` field is the clean copy.
    let description = '';
    const ldRaw = $('script[type="application/ld+json"]').first().html();
    if (ldRaw) {
      try {
        const ld = JSON.parse(ldRaw) as CruiseJsonLd;
        if (ld.description) description = cheerio.load(ld.description).text().replace(/\s+/g, ' ').trim();
        const address = ld.jobLocation?.address;
        if (address) {
          const country = typeof address.addressCountry === 'string' ? address.addressCountry : address.addressCountry?.name;
          const location = [address.addressLocality, address.addressRegion, country].filter(Boolean).join(', ');
          if (location) job = { ...job, location };
        }
      } catch {
        // fall through to raw description container below
      }
    }
    if (!description) {
      description = $('#job-details-description').text().replace(/\s+/g, ' ').trim();
    }

    return {
      ...job,
      company: employer ? repairMojibake(decodeHtmlEntities(employer)) : job.company,
      description: description ? repairMojibake(decodeHtmlEntities(description)).slice(0, 2000) : job.description,
    };
  } catch (err) {
    console.error(`AllCruiseJobs detail fetch failed for ${job.url}:`, err);
    return job;
  }
}
