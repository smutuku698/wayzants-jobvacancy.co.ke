// Redirect map for URLs indexed by Google under the pre-relaunch Next.js site
// (jobvacancy.co.ke-main-themechange) that don't exist as routes here.
// Complements the static bare-category/location redirects already in
// astro.config.mjs's `redirects` — this file handles the parts that need
// pattern matching or a large one-off lookup table, which Astro's static
// config can't express. Sourced from a Google Search Console coverage export
// (~1,000 previously-crawled URLs) so real indexed/trafficked pages don't
// start returning bare 404s after the relaunch.

// Any of these prefixes + a single trailing slug segment used to be a job
// detail page under the old site's category-in-path URL scheme. This project
// stores every job under one flat /jobs/{slug}/ route regardless of category,
// so the whole prefix is dropped and only the slug is kept. If the slug was
// never imported (or came from -OLD-BACKUP, a stale duplicate path), getJobBySlug
// returns null and [slug].astro already rewrites to /404 on its own — no need
// to verify existence here.
export const JOB_DETAIL_PREFIXES = [
  '/online-jobs-in-kenya/',
  '/online-jobs-in-kenya-OLD-BACKUP/',
  '/ngo-jobs-in-kenya/',
  '/cruise-ship-jobs/',
  '/jobs-in-kenya/',
];

// The old site nested teaching-abroad job details under /teaching-jobs-in-kenya/job/{slug}
// and also had a handful of sibling filter/listing pages one level down
// (not job details) that need their own targets instead of the /jobs/{slug}/ treatment.
export const TEACHING_SUBPAGE_REDIRECTS: Record<string, string> = {
  'tsc-jobs': '/category/tsc-jobs/',
  'online-teaching-jobs': '/category/teaching-jobs-abroad/',
  'international-schools': '/category/teaching-jobs-abroad/',
  'western-countries': '/category/teaching-jobs-abroad/',
  'gulf-teaching-jobs': '/category/teaching-jobs-abroad/',
};

// One-off content pages with no dynamic equivalent on this site (old blog,
// shop, and a few retired tool/landing pages). Where a post's topic maps
// cleanly onto a current category, it redirects there instead of the
// homepage, per explicit user decision (2026-08-04) to preserve as much
// topical relevance/ranking as a 301 can carry rather than funneling
// everything to '/', which Google tends to discount as a soft-404 pattern.
export const STATIC_LEGACY_REDIRECTS: Record<string, string> = {
  '/cv-maker/': '/cv-builder/',
  '/cv-writing-services-kenya/': '/cv-and-resume-services/',
  '/our-team/': '/about/',
  '/scam-alerts/': '/scam-alert/',
  '/work-abroad/': '/',
  '/digital-skills/': '/',
  '/hustle-ideas/': '/',
  '/hustle-ideas/virtual-assistant/': '/',
  '/hustle-ideas/forex-trading/': '/',
  '/hustle-ideas/forex-trading-in-kenya/': '/',
  '/hustle-ideas/freelance-writing/': '/',
  '/shop/': '/',
  '/shop/success/': '/',
  '/net-pay-calculator-2025/': '/',
  '/visa-sponsorship-guide/': '/',

  '/blog/': '/',
  '/blog/category/ngo-jobs/': '/category/ngo-jobs/',
  '/blog/category/cv-examples/': '/cv-and-resume-services/',
  '/blog/category/digital-skills/': '/',
  '/blog/category/job-search-tips/': '/',
  '/blog/category/hustle-ideas/': '/',
  '/blog/category/online-jobs/': '/category/online-remote-jobs/',
  '/blog/sarah-freelance-success-story/': '/',
  '/blog/job-application-tips-for-international-jobs-in-kenya-2026/': '/',
  '/blog/job-application-tips-for-international-jobs-in-kenya/': '/',
  '/blog/how-to-research-salaries-before-your-interview/': '/',
  '/blog/50-businesses-that-will-give-you-more-profit-in-kenya/': '/',
  '/blog/benefits-to-negotiate-beyond-salary-in-kenya/': '/',
  '/blog/how-to-apply-for-ngo-jobs-in-kenya-step-by-step-guide/': '/category/ngo-jobs/',
  '/blog/government-jobs-in-kenya-2026-complete-guide/': '/category/government-jobs/',
  '/blog/healthcare-jobs-in-kenya-nursing-lab-tech-and-pharmacy-opportunities/': '/category/healthcare-medical-jobs/',
  '/blog/ngo-jobs-in-kenya-how-to-get-hired/': '/category/ngo-jobs/',
  '/blog/county-government-jobs-in-kenya-how-to-apply-and-succeed/': '/category/government-jobs/',
  '/blog/transcription-jobs-in-kenya-how-to-earn-500-monthly-from-home/': '/category/online-remote-jobs/',
  '/blog/online-jobs-for-kenyans-beginners-guide/': '/category/online-remote-jobs/',
  '/blog/online-jobs-for-students-kenya-guide/': '/category/online-remote-jobs/',
  '/blog/remote-jobs-kenya-2025/': '/category/online-remote-jobs/',
  '/blog/how-to-find-jobs-in-kenya/': '/',
  '/blog/it-jobs-in-kenya-skills-you-need-and-where-to-apply/': '/category/it-software-jobs/',
  '/blog/online-tutoring-jobs-for-kenyan-teachers-platforms-that-pay-in-usd/': '/category/online-remote-jobs/',
  '/blog/entry-level-jobs-in-kenya-that-dont-require-experience/': '/category/internships-graduate-trainee/',
  '/blog/average-salaries-in-kenya-by-industry-2025-20251220-235717/': '/',
  '/blog/cbc-career-pathways/': '/',
  '/blog/data-entry-jobs-in-kenya-legit-sites-that-actually-pay/': '/category/online-remote-jobs/',
  '/blog/how-to-start-a-dropshipping-business-in-kenya/': '/',
  '/blog/how-to-start-freelancing-in-kenya-a-complete-beginners-guide/': '/category/online-remote-jobs/',
  '/blog/teaching-jobs-abroad-for-kenyan-teachers-requirements-salary/': '/category/teaching-jobs-abroad/',
  '/blog/best-websites-to-find-online-jobs-in-kenya-that-pay-via-m-pesa/': '/category/online-remote-jobs/',
};

/** Returns the 301 target for a legacy URL's pathname, or null if it isn't one. */
export function resolveLegacyRedirect(pathname: string): string | null {
  for (const prefix of JOB_DETAIL_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      const rest = pathname.slice(prefix.length).replace(/\/$/, '');
      if (rest && !rest.includes('/')) return `/jobs/${rest}/`;
    }
  }

  const jobsCategoryMatch = pathname.match(/^\/jobs\/([^/]+)\/([^/]+)\/?$/);
  if (jobsCategoryMatch) return `/jobs/${jobsCategoryMatch[2]}/`;

  const teachingJobMatch = pathname.match(/^\/teaching-jobs-in-kenya\/job\/([^/]+)\/?$/);
  if (teachingJobMatch) return `/jobs/${teachingJobMatch[1]}/`;

  const teachingSubMatch = pathname.match(/^\/teaching-jobs-in-kenya\/([^/]+)\/?$/);
  if (teachingSubMatch && TEACHING_SUBPAGE_REDIRECTS[teachingSubMatch[1]]) {
    return TEACHING_SUBPAGE_REDIRECTS[teachingSubMatch[1]];
  }

  if (pathname.startsWith('/shop/product/')) return '/';

  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (STATIC_LEGACY_REDIRECTS[normalized]) return STATIC_LEGACY_REDIRECTS[normalized];

  return null;
}
