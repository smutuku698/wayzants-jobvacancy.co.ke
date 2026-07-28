// International teaching jobs -- teachingabroaddirect.co.uk. Plain server-
// rendered HTML, no JS needed (unlike Edvectus/TeachAway, both now
// browser-only -- see scripts/README.md). Deliberately scrapes the
// unfiltered global /teaching-jobs listing rather than a country/region page
// -- no hardcoded country list to maintain, whatever countries the site
// posts (Qatar, UAE, Singapore, Brazil, ...) flow through automatically.

import * as cheerio from 'cheerio';
import { isLikelyNonJobListing, decodeHtmlEntities, repairMojibake } from './text-utils';

export interface TeachingAbroadJobListing {
  title: string;
  company: string;
  description: string;
  location: string;
  url: string;
  pubDate: string;
  tags: string[];
  category: 'Education';
  source: 'teachingabroaddirect';
}

const BASE_URL = 'https://www.teachingabroaddirect.co.uk';
const LISTING_URL = BASE_URL + '/teaching-jobs';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Job detail links look like /teaching-jobs/{city-or-country-slug}/{title-slug}-{id}
const JOB_HREF_RE = /\/teaching-jobs\/[a-z0-9-]+\/[a-z0-9-]+-(\d+)$/i;

async function fetchListingPage(page: number): Promise<{ id: string; title: string; url: string }[]> {
  const url = page === 1 ? LISTING_URL : LISTING_URL + '?page=' + page;
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

/** Listing-only pass -- cheap, no per-job detail fetch. Call fetchTeachingAbroadJobDetails() afterward, but only for genuinely new jobs. */
export async function fetchAllTeachingAbroadListings(maxPages = 15): Promise<TeachingAbroadJobListing[]> {
  const all: TeachingAbroadJobListing[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    let pageJobs: { id: string; title: string; url: string }[];
    try {
      pageJobs = await fetchListingPage(page);
    } catch (err) {
      console.error('Teaching Abroad Direct page ' + page + ' failed:', err);
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
        category: 'Education',
        source: 'teachingabroaddirect',
      });
    }
  }

  return all;
}

interface TeachingAbroadJsonLd {
  description?: string;
  datePosted?: string;
  jobLocation?: { address?: { addressLocality?: string; addressCountry?: string } };
}

/** Strips ASCII control characters (codes 0-31) that this site's own JobPosting JSON-LD sometimes embeds raw inside string values, which trips JSON.parse. Built via char codes, not a regex escape, to avoid the literal bytes being written to disk. */
function stripControlChars(text: string): string {
  const CONTROL_CHAR_MAX = 32;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out += code < CONTROL_CHAR_MAX ? ' ' : text[i];
  }
  return out;
}

/** "British International School" out of "Secondary History Teacher - British International School - Qatar" -- the site's own hiringOrganization in JSON-LD is always "Teaching Abroad Direct" (the agency), not the actual school, so the title's own middle segment is the only real signal. */
function guessSchoolFromTitle(title: string): string | null {
  const parts = title
    .split(/\s[–-]\s/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;
  const candidate = parts.slice(1, -1).join(' - ');
  return candidate.length > 2 && candidate.length < 80 ? candidate : null;
}

/** Enriches a single job with description/location from its detail page. Only worth calling for genuinely new jobs. */
export async function fetchTeachingAbroadJobDetails(job: TeachingAbroadJobListing): Promise<TeachingAbroadJobListing> {
  try {
    const response = await fetch(job.url, { headers: HEADERS });
    if (!response.ok) return job;
    const html = await response.text();
    const $ = cheerio.load(html);

    let description = '';
    let location = '';
    const ldRaw = $('script[type="application/ld+json"]').first().html();
    if (ldRaw) {
      try {
        const ld = JSON.parse(stripControlChars(ldRaw)) as TeachingAbroadJsonLd;
        if (ld.description) description = cheerio.load(ld.description).text().replace(/\s+/g, ' ').trim();
        const address = ld.jobLocation?.address;
        if (address) location = (address.addressLocality || address.addressCountry || '').trim();
      } catch {
        // fall through to meta-description fallback below
      }
    }
    if (!description) {
      description = $('meta[name="description"]').attr('content')?.trim() ?? '';
    }

    const company = guessSchoolFromTitle(job.title) ?? 'Teaching Abroad Direct';

    return {
      ...job,
      company: repairMojibake(decodeHtmlEntities(company)),
      description: description ? repairMojibake(decodeHtmlEntities(description)).slice(0, 2000) : job.description,
      location: location || job.location,
    };
  } catch (err) {
    console.error('Teaching Abroad Direct detail fetch failed for ' + job.url + ':', err);
    return job;
  }
}
