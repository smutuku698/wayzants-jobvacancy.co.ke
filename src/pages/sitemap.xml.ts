import type { APIRoute } from 'astro';
import { getSupabase } from '../lib/supabase';
import { NAV_CATEGORIES, NAV_LOCATIONS } from '../lib/taxonomy';
import { SITE_URL } from '../lib/seo';

export const prerender = false;

const STATIC_PATHS = ['/', '/jobs/', '/post-a-job/', '/about/', '/contact/'];

function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string) {
  return `<url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${
    lastmod ? `<lastmod>${lastmod}</lastmod>` : ''
  }</url>`;
}

export const GET: APIRoute = async () => {
  const entries: string[] = [];

  for (const path of STATIC_PATHS) {
    entries.push(urlEntry(`${SITE_URL}${path}`, path === '/' ? 'daily' : 'daily', path === '/' ? '1.0' : '0.8'));
  }
  for (const c of NAV_CATEGORIES) {
    entries.push(urlEntry(`${SITE_URL}/category/${c.slug}/`, 'daily', '0.9'));
  }
  for (const l of NAV_LOCATIONS) {
    entries.push(urlEntry(`${SITE_URL}/location/${l.slug}/`, 'daily', '0.9'));
  }

  try {
    // Supabase/PostgREST silently caps a single query at its configured
    // max-rows (commonly 1000) regardless of .limit() — with 5,000+ jobs
    // already in the table, a single request here would drop the vast
    // majority of the catalog from the sitemap. Page through in batches
    // instead so every approved job is included regardless of table size.
    // Google's own cap is 50,000 URLs per sitemap file — comfortably above
    // where this site is today; if the catalog ever approaches that, this
    // would need to split into a sitemap index instead.
    const BATCH_SIZE = 1000;
    const MAX_JOB_URLS = 45000;
    let offset = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data } = await getSupabase()
        .from('jobs')
        .select('slug, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);
      if (!data || data.length === 0) break;
      for (const job of data) {
        entries.push(urlEntry(`${SITE_URL}/jobs/${job.slug}/`, 'daily', '0.7', new Date(job.created_at).toISOString()));
      }
      if (data.length < BATCH_SIZE || entries.length >= MAX_JOB_URLS) break;
      offset += BATCH_SIZE;
    }
  } catch {
    // If Supabase is unreachable, still return the static/taxonomy URLs.
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join(
    ''
  )}</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
