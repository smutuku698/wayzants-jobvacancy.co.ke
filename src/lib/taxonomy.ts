// Static mirror of the seeded job_categories / locations tables — used for
// nav, footer and sitemap links so every page render doesn't need a DB round
// trip just to build the site chrome. Keep in sync with
// supabase/migrations/0001_init.sql.

export interface NavItem {
  slug: string;
  name: string;
}

export const NAV_CATEGORIES: NavItem[] = [
  { slug: 'ngo-jobs', name: 'NGO Jobs' },
  { slug: 'teaching-jobs', name: 'Teaching Jobs' },
  { slug: 'tsc-jobs', name: 'TSC Jobs' },
  { slug: 'government-jobs', name: 'Government Jobs' },
  { slug: 'internships-graduate-trainee', name: 'Internships & Graduate Trainee' },
  { slug: 'it-software-jobs', name: 'IT & Software Jobs' },
  { slug: 'sales-marketing-jobs', name: 'Sales & Marketing Jobs' },
  { slug: 'accounting-finance-jobs', name: 'Accounting & Finance Jobs' },
  { slug: 'admin-secretarial-jobs', name: 'Administration & Secretarial Jobs' },
  { slug: 'healthcare-medical-jobs', name: 'Healthcare & Medical Jobs' },
  { slug: 'engineering-construction-jobs', name: 'Engineering & Construction Jobs' },
  { slug: 'driving-logistics-jobs', name: 'Driving & Logistics Jobs' },
  { slug: 'security-jobs', name: 'Security Jobs' },
  { slug: 'hospitality-tourism-jobs', name: 'Hospitality & Tourism Jobs' },
  { slug: 'customer-service-jobs', name: 'Customer Service Jobs' },
  { slug: 'online-remote-jobs', name: 'Online & Remote Jobs' },
  { slug: 'teaching-jobs-abroad', name: 'Teaching Jobs Abroad' },
  { slug: 'cruise-ship-jobs', name: 'Cruise Ship Jobs' },
];

export const NAV_LOCATIONS: NavItem[] = [
  { slug: 'nairobi', name: 'Nairobi' },
  { slug: 'mombasa', name: 'Mombasa' },
  { slug: 'kisumu', name: 'Kisumu' },
  { slug: 'eldoret', name: 'Eldoret' },
  { slug: 'nakuru', name: 'Nakuru' },
  { slug: 'thika', name: 'Thika' },
  { slug: 'nyeri', name: 'Nyeri' },
  { slug: 'machakos', name: 'Machakos' },
  { slug: 'remote-online-kenya', name: 'Remote / Online (Kenya)' },
  { slug: 'international-remote', name: 'International (Remote)' },
];

/**
 * Semantically related categories — used both for a job detail page's
 * "explore related categories" interlinking (site-wide, for SEO) and as the
 * first thing tried on an empty category page (e.g. tsc-jobs has no
 * dedicated scraper source, so it should surface teaching-jobs /
 * teaching-jobs-abroad rather than an unrelated top category). Deliberately
 * only defined for genuinely related pairs, not every category — an
 * irrelevant "related" link is worse than none. Symmetric on purpose: if
 * ngo-jobs or teaching-jobs ever went empty too, the reverse mapping kicks in.
 */
export const RELATED_CATEGORIES: Record<string, string[]> = {
  'tsc-jobs': ['teaching-jobs', 'teaching-jobs-abroad'],
  'teaching-jobs': ['tsc-jobs', 'teaching-jobs-abroad'],
  'teaching-jobs-abroad': ['teaching-jobs', 'tsc-jobs'],
  'government-jobs': ['ngo-jobs'],
  'ngo-jobs': ['government-jobs'],
  'cruise-ship-jobs': ['hospitality-tourism-jobs'],
  'hospitality-tourism-jobs': ['cruise-ship-jobs'],
  'it-software-jobs': ['online-remote-jobs'],
  'online-remote-jobs': ['it-software-jobs'],
  'sales-marketing-jobs': ['customer-service-jobs'],
  'customer-service-jobs': ['sales-marketing-jobs'],
  'accounting-finance-jobs': ['admin-secretarial-jobs'],
  'admin-secretarial-jobs': ['accounting-finance-jobs'],
};

export const TOP_NAV_CATEGORIES: NavItem[] = [
  NAV_CATEGORIES[0], // NGO
  NAV_CATEGORIES[1], // Teaching
  NAV_CATEGORIES[2], // TSC
  NAV_CATEGORIES[3], // Government
  NAV_CATEGORIES[15], // Online & Remote
];

export const TOP_NAV_LOCATIONS: NavItem[] = [
  NAV_LOCATIONS[0],
  NAV_LOCATIONS[1],
  NAV_LOCATIONS[2],
  NAV_LOCATIONS[3],
  NAV_LOCATIONS[4],
];
