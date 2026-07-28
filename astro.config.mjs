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
});
