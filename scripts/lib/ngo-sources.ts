// Faithful port of the old site's lib/ngojobsinafrica-fetcher.ts and
// lib/reliefweb-rss-fetcher.ts. Unlike the old site's strict fallback chain
// (try NGOJobsInAfrica, only try ReliefWeb if that failed), this fetches both
// every run and combines them — both sources genuinely contributed jobs
// historically (257 NGOJobsInAfrica + 26 ReliefWeb in the imported data), so
// treating ReliefWeb as fallback-only would under-cover it.

import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import { isLikelyNonJobListing, decodeHtmlEntities, repairMojibake } from './text-utils';

export interface NgoJobListing {
  title: string;
  company: string;
  description: string;
  location: string;
  url: string;
  pubDate: string;
  tags: string[];
  /** Old-style function category (Finance, Management, Healthcare...) for template-fallback selection — not the DB category_id, which is always ngo-jobs. */
  category: string;
  source: 'ngojobsinafrica' | 'reliefweb';
}

const XML_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  // Same DoS-guard adjustment as remote-sources.ts — these are known,
  // trusted feeds, not arbitrary untrusted XML.
  processEntities: { enabled: true, maxTotalExpansions: 200000 },
} as const;

const NGO_SKILL_TAGS = [
  'project management', 'monitoring and evaluation', 'm&e', 'humanitarian', 'emergency response',
  'capacity building', 'stakeholder engagement', 'report writing', 'grant writing', 'donor relations',
  'advocacy', 'community development', 'livelihoods', 'wash', 'nutrition', 'health', 'education',
  'protection', 'gender', 'safeguarding', 'logistics', 'finance', 'administration', 'hr',
  'communications', 'data analysis', 'gis', 'microsoft office', 'excel', 'ngo', 'un', 'unicef', 'who',
  'field coordination', 'budget management', 'proposal writing',
];

const KENYA_LOCATIONS = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Garissa', 'Kakamega', 'Turkana'];

function stripHtml(html: string): string {
  if (!html) return '';
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, ' ').trim();
}

function extractTags(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  return NGO_SKILL_TAGS.filter((skill) => text.includes(skill)).slice(0, 10);
}

function extractLocation(title: string, description: string): string {
  const text = `${title} ${description}`;
  for (const location of KENYA_LOCATIONS) if (text.includes(location)) return location;
  return 'Kenya';
}

// Old-style function category, for template-fallback selection only (see
// template-fallbacks.ts) — not the DB category_id, which stays fixed at
// ngo-jobs regardless. Ported as-is from the old site's mapCategory().
function mapCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('finance') || text.includes('accountant') || text.includes('budget')) return 'Finance';
  if (text.includes('communication') || text.includes('advocacy') || text.includes('marketing')) return 'Marketing';
  if (text.includes('manager') || text.includes('coordinator') || text.includes('director')) return 'Management';
  if (text.includes('data') || text.includes('m&e') || text.includes('monitoring')) return 'Data';
  if (text.includes('it ') || text.includes('technology') || text.includes('developer')) return 'Programming';
  if (text.includes('hr') || text.includes('human resource')) return 'HR';
  if (text.includes('health') || text.includes('medical') || text.includes('nurse')) return 'Healthcare';
  if (text.includes('education') || text.includes('teacher')) return 'Education';
  return 'Other';
}

// The naive "last segment after ' - '" heuristic sometimes grabs a stray
// connector word (e.g. title "X - with Y" incorrectly yielding "with") rather
// than an actual organization name — reject those instead of storing garbage.
const GENERIC_NON_COMPANY_WORDS = new Set(['with', 'and', 'for', 'the', 'from', 'to', 'in', 'on', 'at', 'of', 'or', 'a', 'an']);

function isPlausibleCompanyName(candidate: string): boolean {
  const words = candidate.toLowerCase().split(/\s+/);
  return !(words.length === 1 && GENERIC_NON_COMPANY_WORDS.has(words[0]));
}

function extractCompanyFromDescription(descriptionHtml: string, title: string): string {
  const $ = cheerio.load(descriptionHtml);
  const text = $.text();
  // \s in these patterns also matches newlines, so an unbounded match can run
  // past the organization name into the next line (e.g. "One Acre Fund\nFounded
  // in...") — take only the first line of whatever matched.
  const patterns = [/About ([A-Z][A-Za-z\s&]+)/, /([A-Z][A-Za-z\s&]+) is (a|an) (leading|international|global)/i, /working (for|at|with) ([A-Z][A-Za-z\s&]+)/i];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.split('\n')[0].trim();
    if (candidate && candidate.length > 2 && candidate.length < 50 && isPlausibleCompanyName(candidate)) return candidate;
  }
  if (title.includes(' - ')) {
    const last = title.split(' - ').pop()?.trim();
    if (last && last.length < 50 && isPlausibleCompanyName(last)) return last;
  }
  return 'NGO/International Organization';
}

export async function fetchNgoJobsInAfrica(): Promise<NgoJobListing[]> {
  try {
    const response = await fetch('https://ngojobsinafrica.com/job-location/kenya/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    if (!xml.trim()) return [];

    const parser = new XMLParser(XML_OPTIONS);
    const result = parser.parse(xml);
    if (!result?.rss?.channel?.item) return [];
    const items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];

    const THIRTY_DAYS_AGO = new Date();
    THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

    const jobs = items
      .map((item: any): NgoJobListing | null => {
        const title = item.title || 'Untitled Position';
        const link = item.link || item.guid || '';
        const htmlDescription = item['content:encoded'] || item.description || '';
        const description = stripHtml(htmlDescription);
        const pubDate = new Date(item.pubDate || Date.now());
        if (pubDate < THIRTY_DAYS_AGO || !link) return null;
        if (isLikelyNonJobListing(title)) return null;

        const fullText = `${title} ${description}`.toLowerCase();
        const isKenya = ['kenya', 'nairobi', 'mombasa', 'kisumu', 'nakuru'].some((k) => fullText.includes(k));
        if (!isKenya) return null;

        return {
          title: repairMojibake(decodeHtmlEntities(title)),
          company: repairMojibake(decodeHtmlEntities(extractCompanyFromDescription(htmlDescription, title))),
          description: repairMojibake(decodeHtmlEntities(description)).slice(0, 1000),
          location: extractLocation(title, description),
          url: link,
          pubDate: pubDate.toISOString(),
          tags: extractTags(title, description),
          category: mapCategory(title, description),
          source: 'ngojobsinafrica',
        };
      })
      .filter((j: NgoJobListing | null): j is NgoJobListing => j !== null);

    return jobs;
  } catch (err) {
    console.error('NGOJobsInAfrica fetch failed:', err);
    return [];
  }
}

export async function fetchReliefWebRss(): Promise<NgoJobListing[]> {
  try {
    const response = await fetch('https://reliefweb.int/jobs/rss.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*;q=0.8',
        Referer: 'https://reliefweb.int/jobs',
      },
    });
    if (!response.ok) {
      console.error(`ReliefWeb RSS blocked or unavailable: HTTP ${response.status}`);
      return [];
    }
    const xml = await response.text();
    if (!xml.trim()) return [];

    const parser = new XMLParser(XML_OPTIONS);
    const result = parser.parse(xml);
    if (!result?.rss?.channel?.item) return [];
    const items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];

    const THIRTY_DAYS_AGO = new Date();
    THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

    const jobs = items
      .map((item: any): NgoJobListing | null => {
        const title = item.title || 'Untitled Position';
        const link = item.link || item.guid?.['#text'] || item.guid || '';
        const description = stripHtml(item.description || item['content:encoded'] || '');
        const pubDate = new Date(item.pubDate || item.published || Date.now());
        if (pubDate < THIRTY_DAYS_AGO || !link) return null;
        if (isLikelyNonJobListing(title)) return null;

        const fullText = `${title} ${description}`.toLowerCase();
        const isKenya = ['kenya', 'nairobi', 'mombasa', 'kisumu'].some((k) => fullText.includes(k));
        if (!isKenya) return null;

        let company = 'NGO/International Organization';
        if (title.includes(' - ')) {
          const last = title.split(' - ').pop()?.trim();
          if (last && isPlausibleCompanyName(last)) company = last;
        }

        return {
          title: repairMojibake(decodeHtmlEntities(title)),
          company: repairMojibake(decodeHtmlEntities(company)),
          description: repairMojibake(decodeHtmlEntities(description || 'No description available')),
          location: extractLocation(title, description),
          url: link,
          pubDate: pubDate.toISOString(),
          tags: extractTags(title, description),
          category: mapCategory(title, description),
          source: 'reliefweb',
        };
      })
      .filter((j: NgoJobListing | null): j is NgoJobListing => j !== null);

    return jobs;
  } catch (err) {
    console.error('ReliefWeb RSS fetch failed:', err);
    return [];
  }
}

export async function fetchAllNgoJobs(): Promise<NgoJobListing[]> {
  const [ngoJobsInAfrica, reliefWeb] = await Promise.all([fetchNgoJobsInAfrica(), fetchReliefWebRss()]);
  const all = [...ngoJobsInAfrica, ...reliefWeb];

  const seen = new Set<string>();
  const unique = all.filter((job) => {
    if (!job.url || seen.has(job.url)) return false;
    seen.add(job.url);
    return true;
  });

  unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return unique;
}
