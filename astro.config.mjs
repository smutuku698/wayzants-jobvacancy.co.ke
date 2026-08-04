// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Note: sitemap is hand-rolled at src/pages/sitemap.xml.ts instead of
// @astrojs/sitemap, since most routes here are SSR (job/category/location
// pages come from Supabase at request time) rather than statically generated,
// so the integration can't discover their concrete URLs at build time.
export default defineConfig({
  site: 'https://www.jobvacancy.co.ke',
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  trailingSlash: 'always',
  // Paths from the old Next.js site (jobvacancy.co.ke-main-themechange,
  // pre-relaunch) that Google still has indexed but don't exist as routes
  // here. 301s them to the closest equivalent instead of leaving them as
  // 404s, to carry over any existing search ranking/backlinks. Registered
  // in the trailing-slash form to match this project's `trailingSlash:
  // 'always'` below — the deployed Cloudflare Worker already 301s any
  // bare-path request to its trailing-slash form first (verified live),
  // so a request for the old site's non-slash URL still resolves correctly
  // through both hops. (The local `astro dev` server doesn't replicate that
  // adapter-level normalization, so bare paths 404 in dev only — expected.)
  redirects: {
    '/jobs-in-kenya/': '/jobs/',
    '/jobs-in-nairobi/': '/location/nairobi/',
    '/jobs-in-mombasa/': '/location/mombasa/',
    '/jobs-in-kisumu/': '/location/kisumu/',
    '/jobs-in-eldoret/': '/location/eldoret/',
    '/jobs-in-nakuru/': '/location/nakuru/',
    '/jobs-in-thika/': '/location/thika/',
    '/jobs-in-nyeri/': '/location/nyeri/',
    '/jobs-in-machakos/': '/location/machakos/',
    '/jobs-in-kakamega/': '/location/kakamega/',
    '/ngo-jobs-in-kenya/': '/category/ngo-jobs/',
    '/online-jobs-in-kenya/': '/category/online-remote-jobs/',
    '/teaching-jobs-in-kenya/': '/category/teaching-jobs/',
    '/cruise-ship-jobs/': '/category/cruise-ship-jobs/',
  },
});
