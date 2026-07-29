import type { Job, JobCategory, Location } from './types';

export function formatSalary(job: Pick<Job, 'salary_min' | 'salary_max' | 'salary_currency'>): string | null {
  const { salary_min, salary_max, salary_currency } = job;
  if (!salary_min && !salary_max) return null;
  const fmt = (n: number) => n.toLocaleString('en-KE');
  if (salary_min && salary_max) {
    return `${salary_currency} ${fmt(salary_min)} – ${fmt(salary_max)} / month`;
  }
  const single = salary_min ?? salary_max ?? 0;
  return `${salary_currency} ${fmt(single)} / month`;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let value = seconds;
  let unit = 'second';
  let acc = 1;
  for (const [amount, name] of units) {
    if (value < amount) {
      unit = name;
      break;
    }
    value = Math.floor(value / amount);
    acc *= amount;
    unit = name;
  }
  if (unit === 'second' && value < 30) return 'Just posted';
  return `${value} ${unit}${value !== 1 ? 's' : ''} ago`;
}

const FREE_LISTING_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Mirrors the `active_jobs` view's expiry logic (migration 0011) for
 * rendering purposes on the job's own permalink, which intentionally still
 * fetches expired jobs (see getJobBySlug) so it can show a "closed" state
 * instead of 404ing on a bookmarked/indexed URL.
 */
export function isJobExpired(job: Pick<Job, 'deadline' | 'created_at' | 'expires_at'>): boolean {
  if (job.expires_at && new Date(job.expires_at).getTime() <= Date.now()) return true;
  if (job.deadline) {
    const today = new Date().toISOString().slice(0, 10);
    return job.deadline < today;
  }
  return Date.now() - new Date(job.created_at).getTime() > FREE_LISTING_MAX_AGE_MS;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function locationLabel(
  job: Pick<Job, 'is_remote' | 'is_international' | 'custom_location_label'> & { locations?: Pick<Location, 'name'> | null }
): string {
  if (job.is_international) return 'International — 100% Remote';
  if (job.is_remote) return 'Remote / Online';
  return job.custom_location_label || job.locations?.name || 'Kenya';
}

/** Poster's free-text override when they picked the generic "Other" category, shown instead of the word "Other". */
export function categoryLabel(job: Pick<Job, 'custom_category_label'> & { job_categories?: Pick<JobCategory, 'name'> | null }): string {
  return job.custom_category_label || job.job_categories?.name || 'Other';
}

/**
 * Normalizes common Kenyan mobile number formats (0722..., 254722..., +254722...)
 * into Paystack's required "+254722000000" shape. Returns null if the input
 * doesn't look like a plausible Safaricom/Airtel/Telkom mobile number.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  let nine: string | null = null;
  if (digits.length === 10 && digits.startsWith('0')) {
    nine = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('254')) {
    nine = digits.slice(3);
  } else if (digits.length === 9) {
    nine = digits;
  }
  if (!nine || !/^[17]\d{8}$/.test(nine)) return null;
  return `+254${nine}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export interface DescriptionBlock {
  type: 'h2' | 'h3' | 'p';
  text: string;
}

// Section labels the import/scraper scripts prepend to a job's description
// (e.g. "Duties and Responsibilities\n...") — rendered as real <h2> headings
// instead of plain text lines.
const KNOWN_SECTION_HEADINGS = new Set([
  'job summary',
  'duties and responsibilities',
  'key requirements / skills / qualifications',
  'benefits',
  'work environment',
  'career growth',
  'about the employer',
  'kenya job market context',
]);

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Turns a job's plain-text description into structured heading/paragraph
 * blocks at render time — runs on every page view, so it applies uniformly to
 * historical and newly-scraped jobs alike without ever rewriting stored data.
 * Recognized section labels become <h2>; short title-like lines that
 * introduce a longer block (e.g. "Security Strategy & Planning" inside a
 * duties list) become <h3>; everything else is split at sentence boundaries
 * into separate paragraphs so long unbroken scrapes don't read as one block.
 */
export function formatJobDescription(description: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  const sections = description
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const section of sections) {
    const lines = section
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    let bodyLines = lines;
    const firstLine = lines[0];
    if (KNOWN_SECTION_HEADINGS.has(firstLine.toLowerCase())) {
      blocks.push({ type: 'h2', text: firstLine });
      bodyLines = lines.slice(1);
    } else if (lines.length > 1 && firstLine.length <= 70 && !/[.!?]$/.test(firstLine)) {
      blocks.push({ type: 'h3', text: firstLine });
      bodyLines = lines.slice(1);
    }

    for (const line of bodyLines) {
      for (const sentence of splitIntoSentences(line)) {
        blocks.push({ type: 'p', text: sentence });
      }
    }
  }

  return blocks;
}
