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
    const { data } = await getSupabase()
      .from('jobs')
      .select('slug, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5000);
    for (const job of data ?? []) {
      entries.push(urlEntry(`${SITE_URL}/jobs/${job.slug}/`, 'daily', '0.7', new Date(job.created_at).toISOString()));
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
