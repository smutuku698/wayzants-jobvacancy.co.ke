import type { Job, Location } from './types';

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

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function locationLabel(job: Pick<Job, 'is_remote' | 'is_international'> & { locations?: Pick<Location, 'name'> | null }): string {
  if (job.is_international) return 'International — 100% Remote';
  if (job.is_remote) return 'Remote / Online';
  return job.locations?.name ?? 'Kenya';
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
