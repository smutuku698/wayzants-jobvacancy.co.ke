// Faithful port of the old site's lib/all-jobs-fetcher.ts — same sources,
// same filters, same recency windows, same category normalization. Only
// change: no MAX_JOBS=300 cap (that existed to keep a JSON snapshot file
// small; here every job upserts straight into Supabase and accumulates,
// same spirit as the old site's weekly-job-scraper.ts).

import { XMLParser } from 'fast-xml-parser';
import { decodeHtmlEntities, repairMojibake } from './text-utils';

const clean = (text: string) => repairMojibake(decodeHtmlEntities(text));

export interface RemoteJobListing {
  title: string;
  company: string;
  description: string;
  location: string;
  url: string;
  category: string;
  pubDate: string;
  salary?: string;
  tags: string[];
  source: 'weworkremotely' | 'remotive' | 'remoteok' | 'arbeitnow';
}

const WWR_FEEDS: Record<string, string> = {
  Programming: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'Full-Stack': 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
  'Back-End': 'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
  'Front-End': 'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss',
  Product: 'https://weworkremotely.com/categories/remote-product-jobs.rss',
  'Sales & Marketing': 'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss',
  'Management & Finance': 'https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss',
  Design: 'https://weworkremotely.com/categories/remote-design-jobs.rss',
  'DevOps & SysAdmin': 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
  Other: 'https://weworkremotely.com/categories/all-other-remote-jobs.rss',
};

const WORLDWIDE_KEYWORDS = [
  'worldwide', 'virtual', 'remote', 'anywhere', 'global', 'any location',
  'any region', 'location independent', 'fully remote', 'work from home',
  'online', 'digital nomad', 'distributed', 'location flexible',
];

const COMMON_TAGS = [
  'javascript', 'python', 'react', 'node', 'aws', 'typescript', 'java', 'php', 'ruby', 'go', 'c++',
  'vue', 'angular', 'docker', 'kubernetes', 'devops', 'frontend', 'backend', 'fullstack', 'ui/ux',
  'product manager', 'project manager', 'marketing', 'sales', 'customer success', 'data science',
  'machine learning', 'content writing', 'copywriting', 'social media', 'seo',
];

const CATEGORY_NORMALIZATION: Record<string, string> = {
  'Sales & Marketing': 'Marketing',
  'Management & Finance': 'Finance',
  'DevOps & SysAdmin': 'Programming',
  'All Categories': 'Other',
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function extractTags(description: string): string[] {
  const desc = description.toLowerCase();
  return COMMON_TAGS.filter((tag) => desc.includes(tag));
}

function isWorldwideJob(location: string, description: string): boolean {
  const text = `${location} ${description}`.toLowerCase();
  return WORLDWIDE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function normalizeCategory(category: string): string {
  return CATEGORY_NORMALIZATION[category] ?? category;
}

function extractCompanyFromTitle(title: string): string {
  const colonIndex = title.indexOf(':');
  if (colonIndex > 0 && colonIndex < 50) return title.substring(0, colonIndex).trim();
  return 'Remote Company';
}

async function fetchWwrFeed(url: string, category: string): Promise<RemoteJobListing[]> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'JobVacancy.co.ke Job Aggregator (Mozilla/5.0)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: 'text',
      ignoreDeclaration: true,
      parseTagValue: false,
      trimValues: true,
      // WeWorkRemotely's RSS descriptions are HTML-formatted job postings with
      // hundreds of entities (&amp;, &nbsp;, etc.) — comfortably over
      // fast-xml-parser's default 1000-entity DoS guard for a real feed like
      // this. Raised, not disabled, since it's still a useful safety limit.
      processEntities: { enabled: true, maxTotalExpansions: 200000 },
    });
    const result = parser.parse(xml);
    if (!result?.rss?.channel?.item) return [];
    const items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];

    const FIFTEEN_DAYS_AGO = new Date();
    FIFTEEN_DAYS_AGO.setDate(FIFTEEN_DAYS_AGO.getDate() - 15);

    return items
      .filter((item: any) => item.title && item.link)
      .map((item: any): RemoteJobListing | null => {
        const description = stripHtml(item.description || '');
        const location = item.location || 'Remote';
        const jobDate = new Date(item.pubDate || Date.now());
        if (!isWorldwideJob(location, description) || jobDate < FIFTEEN_DAYS_AGO) return null;
        return {
          title: item.title,
          company: item.company || item['dc:creator'] || extractCompanyFromTitle(item.title),
          description,
          location: 'Remote - Worldwide',
          url: item.link,
          category: normalizeCategory(category),
          pubDate: jobDate.toISOString(),
          tags: extractTags(description),
          source: 'weworkremotely',
        };
      })
      .filter((j: RemoteJobListing | null): j is RemoteJobListing => j !== null);
  } catch (err) {
    console.error(`WeWorkRemotely (${category}) fetch failed:`, err);
    return [];
  }
}

async function fetchRemotiveJobs(): Promise<RemoteJobListing[]> {
  try {
    const response = await fetch('https://remotive.com/api/remote-jobs?location=worldwide&limit=150', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://remotive.com/' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { jobs?: any[] };
    if (!Array.isArray(data.jobs)) return [];

    const FIFTEEN_DAYS_AGO = new Date();
    FIFTEEN_DAYS_AGO.setDate(FIFTEEN_DAYS_AGO.getDate() - 15);

    return data.jobs
      .filter((job) => new Date(job.publication_date) >= FIFTEEN_DAYS_AGO)
      .map(
        (job): RemoteJobListing => ({
          title: job.title,
          company: job.company_name,
          description: stripHtml(job.description || ''),
          location: 'Remote - Worldwide',
          url: job.url,
          category: job.category || 'Other',
          pubDate: new Date(job.publication_date).toISOString(),
          salary: job.salary || undefined,
          tags: extractTags(job.description || ''),
          source: 'remotive',
        })
      );
  } catch (err) {
    console.error('Remotive fetch failed:', err);
    return [];
  }
}

async function fetchRemoteOkJobs(): Promise<RemoteJobListing[]> {
  try {
    const response = await fetch('https://remoteok.io/api?tags=', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as any[];
    if (!Array.isArray(data)) return [];

    const THIRTY_DAYS_AGO = new Date();
    THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

    return data
      .slice(1) // first element is legal text, not a job
      .filter((job) => {
        if (!job.date) return false;
        const jobDate = typeof job.date === 'string' ? new Date(job.date) : new Date(job.date * 1000);
        return jobDate >= THIRTY_DAYS_AGO;
      })
      .map((job): RemoteJobListing => {
        const pubDate = typeof job.date === 'string' ? job.date : new Date(job.date * 1000).toISOString();
        return {
          title: job.position,
          company: job.company,
          description: stripHtml(job.description || ''),
          location: 'Remote - Worldwide',
          url: job.apply_url || `https://remoteok.io/remote-jobs/${job.slug}`,
          category: job.tags?.[0] || 'Other',
          pubDate,
          salary: job.salary_min && job.salary_max ? `$${job.salary_min}-${job.salary_max}` : undefined,
          tags: job.tags || [],
          source: 'remoteok',
        };
      });
  } catch (err) {
    console.error('RemoteOK fetch failed:', err);
    return [];
  }
}

async function fetchArbeitnowJobs(): Promise<RemoteJobListing[]> {
  try {
    const response = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { data?: any[] };
    if (!Array.isArray(data.data)) return [];

    const THIRTY_DAYS_AGO = new Date();
    THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

    return data.data
      .filter((job) => {
        const isRemote =
          job.remote === true ||
          job.remote === 'true' ||
          (job.location && String(job.location).toLowerCase().includes('remote')) ||
          (job.job_types && job.job_types.some((t: string) => t.toLowerCase().includes('remote'))) ||
          !job.location;
        if (!job.created_at) return false;
        return new Date(job.created_at) >= THIRTY_DAYS_AGO && isRemote;
      })
      .map(
        (job): RemoteJobListing => ({
          title: job.title,
          company: job.company_name,
          description: stripHtml(job.description || ''),
          location: 'Remote - Worldwide',
          url: job.url,
          category: job.job_types?.[0] || 'Other',
          pubDate: new Date(job.created_at).toISOString(),
          salary: job.salary_min && job.salary_max ? `€${job.salary_min}-${job.salary_max}` : undefined,
          tags: job.tags || [],
          source: 'arbeitnow',
        })
      );
  } catch (err) {
    console.error('Arbeitnow fetch failed:', err);
    return [];
  }
}

/** Fetches every remote-job source, same filters as the old site, no cap — dedup happens at Supabase upsert time. */
export async function fetchAllRemoteJobs(): Promise<RemoteJobListing[]> {
  const all: RemoteJobListing[] = [];
  const DELAY_MS = 1500;

  for (const [category, url] of Object.entries(WWR_FEEDS)) {
    all.push(...(await fetchWwrFeed(url, category)));
    await delay(DELAY_MS);
  }

  all.push(...(await fetchRemotiveJobs()));
  await delay(DELAY_MS);
  all.push(...(await fetchRemoteOkJobs()));
  await delay(DELAY_MS);
  all.push(...(await fetchArbeitnowJobs()));

  const seen = new Set<string>();
  const unique = all
    .filter((job) => {
      if (!job.url || seen.has(job.url)) return false;
      seen.add(job.url);
      return true;
    })
    .map((job) => ({ ...job, title: clean(job.title), company: clean(job.company), description: clean(job.description) }));

  unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return unique;
}
