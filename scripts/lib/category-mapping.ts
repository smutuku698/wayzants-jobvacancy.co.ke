// Maps the old site's free-text categories/industries/locations onto this
// project's fixed 16-category / 10-location taxonomy (supabase/migrations/0001_init.sql,
// mirrored in src/lib/taxonomy.ts). Lives outside src/ — this is import/scraper
// tooling, not part of the deployed app, and never touches taxonomy.ts itself.

// The Brites Management scraper's fixed apply-contact — user-confirmed
// inbox for all local-jobs listings (the source site never discloses the
// real employer's email in a stable, machine-extractable way).
export const LOCAL_JOBS_APPLY_EMAIL = 'hr@jobvacancy.co.ke';

export const FALLBACK_CATEGORY_SLUG = 'admin-secretarial-jobs';
export const REMOTE_CATEGORY_SLUG = 'online-remote-jobs';
export const NGO_CATEGORY_SLUG = 'ngo-jobs';

// Ordered so more specific/discriminative keywords are checked before generic
// ones. Matched against title first (most reliable), then industry, then the
// duties/requirements text as a last resort — mirrors the old site's
// title-then-description fallback in lib/job-utils.ts, but title-first, since
// local-jobs.json's `industry` field is noisy (~20% of rows just say "SALARY").
const CATEGORY_KEYWORDS: [slug: string, keywords: string[]][] = [
  ['tsc-jobs', ['tsc ', 'teachers service commission']],
  ['teaching-jobs', ['teacher', 'tutor', 'lecturer', 'principal', 'headteacher', 'education officer', 'trainer ']],
  ['government-jobs', ['county government', 'ministry of', 'public service commission', 'parastatal', 'state corporation']],
  [
    'internships-graduate-trainee',
    ['intern', 'internship', 'attachment', 'graduate trainee', 'trainee program'],
  ],
  [
    'it-software-jobs',
    [
      'software', 'developer', 'programmer', 'devops', 'system administrator', 'network engineer',
      'it officer', 'it support', 'data analyst', 'data scientist', 'ict ', 'full stack', 'frontend',
      'backend', 'qa engineer', 'cybersecurity', 'database administrator',
    ],
  ],
  [
    'sales-marketing-jobs',
    [
      'sales executive', 'sales representative', 'sales manager', 'business development', 'marketing executive',
      'marketing manager', 'brand ', 'digital marketing', 'account manager', 'field sales', 'merchandiser',
      'sales agent', 'territory manager', 'growth marketing',
    ],
  ],
  [
    'accounting-finance-jobs',
    [
      'accountant', 'accounts assistant', 'auditor', 'finance manager', 'financial analyst', 'bookkeeper',
      'credit controller', 'payroll', 'tax ', 'cashier', 'banking', 'treasury',
    ],
  ],
  [
    'admin-secretarial-jobs',
    [
      'administrator', 'admin assistant', 'personal assistant', 'executive assistant', 'secretary',
      'receptionist', 'office manager', 'front desk', 'talent acquisition', 'human resource', 'hr officer',
      'hr manager', 'recruiter', 'procurement', 'operations manager',
    ],
  ],
  [
    'healthcare-medical-jobs',
    ['nurse', 'clinical officer', 'doctor', 'pharmacist', 'medical', 'hospital', 'healthcare', 'dentist', 'lab technician'],
  ],
  [
    'engineering-construction-jobs',
    [
      'civil engineer', 'electrical engineer', 'mechanical engineer', 'construction', 'site supervisor',
      'quantity surveyor', 'architect', 'foreman', 'project engineer', 'real estate', 'property manager',
      'quality assurance manager', 'production manager', 'manufacturing', 'factory',
    ],
  ],
  [
    'driving-logistics-jobs',
    ['driver', 'logistics', 'supply chain', 'warehouse', 'dispatch', 'fleet ', 'delivery rider', 'forklift'],
  ],
  ['security-jobs', ['security guard', 'security manager', 'security officer', 'security supervisor', 'risk officer']],
  [
    'hospitality-tourism-jobs',
    [
      'hotel', 'restaurant', 'chef', 'waiter', 'waitress', 'housekeeping', 'tour guide', 'travel consultant',
      'hospitality', 'barista', 'bartender', 'beauty', 'spa', 'salon',
    ],
  ],
  [
    'customer-service-jobs',
    ['customer service', 'customer care', 'call centre', 'call center', 'client relations', 'help desk', 'support agent'],
  ],
  [NGO_CATEGORY_SLUG, ['ngo', 'non-profit', 'nonprofit', 'humanitarian', 'donor', 'relief']],
];

const INDUSTRY_FALLBACK: Record<string, string> = {
  HOSPITALITY: 'hospitality-tourism-jobs',
  HEALTHCARE: 'healthcare-medical-jobs',
  'HEALTH & WELLNESS': 'healthcare-medical-jobs',
  CONSTRUCTION: 'engineering-construction-jobs',
  'REAL ESTATE': 'engineering-construction-jobs',
  MANUFACTURING: 'engineering-construction-jobs',
  'MANUFACTURING (FMCG)': 'engineering-construction-jobs',
  'MANUFACTURING COMPANY': 'engineering-construction-jobs',
  'OIL &GAS/ENERGY': 'engineering-construction-jobs',
  'PETROLEUM / OIL & GAS': 'engineering-construction-jobs',
  'FURNITURE & INTERIOR DESIGN': 'engineering-construction-jobs',
  'PROPERTY & FURNITURE': 'engineering-construction-jobs',
  NGO: NGO_CATEGORY_SLUG,
  'TRAVEL & TOURISM': 'hospitality-tourism-jobs',
  'TRAVEL AND TOURISM': 'hospitality-tourism-jobs',
  'FINANCIAL SERVICES': 'accounting-finance-jobs',
  IT: 'it-software-jobs',
  EDUCATION: 'teaching-jobs',
  FASHION: 'sales-marketing-jobs',
  BEAUTY: 'hospitality-tourism-jobs',
  'BEAUTY & COSMETICS': 'hospitality-tourism-jobs',
  'BEAUTY & PERSONAL CARE': 'hospitality-tourism-jobs',
  'AUTOMOTIVE LUBRICANTS RETAIL': 'sales-marketing-jobs',
  'ALCOHOLIC BEVERAGES': 'sales-marketing-jobs',
  RETAIL: 'sales-marketing-jobs',
  FMCG: 'sales-marketing-jobs',
  'RECORD PRODUCTION AND DISTRIBUTION': 'sales-marketing-jobs',
  TEXTILE: 'engineering-construction-jobs',
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Plain .includes() let short keywords match inside unrelated words — "intern"
// inside "international", "tutor" inside "statutory" — both caused real
// miscategorizations. Word-boundary regex avoids that; \s+ lets a multi-word
// keyword tolerate irregular whitespace between words.
function matchesKeyword(text: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegex(keyword.trim()).replace(/\s+/g, '\\s+')}\\b`);
  return pattern.test(text);
}

/** Best-effort category slug from a Brites-Management-style local job. Title checked before the noisy `industry` field. */
export function mapLocalJobCategory(job: { job_title: string; industry: string; duties_and_responsibilities?: string }): string {
  const title = job.job_title.toLowerCase();
  for (const [slug, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => matchesKeyword(title, k))) return slug;
  }

  const industry = job.industry.trim().toUpperCase();
  if (INDUSTRY_FALLBACK[industry]) return INDUSTRY_FALLBACK[industry];

  const duties = (job.duties_and_responsibilities ?? '').toLowerCase();
  for (const [slug, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => matchesKeyword(duties, k))) return slug;
  }

  return FALLBACK_CATEGORY_SLUG;
}

// "Mombasa Road" is a Nairobi industrial corridor, not the coastal city of
// Mombasa — must be checked before the bare "mombasa" match below.
const NAIROBI_ALIASES = [
  'mombasa road', 'westlands', 'ruiru', 'mlolongo', 'upper hill', 'embakasi', 'kikuyu', 'mai mahiu', 'cbd',
  'lavington', 'kitengela', 'karen', 'industrial area', 'ongata rongai', 'syokimau', 'ruaraka', 'kahawa west',
  'airport', 'kitisuru', 'south c', 'south b', 'rongai', 'athi river', 'nairobi west', 'parklands', 'gigiri',
  'kilimani', 'langata', 'hurlingham', 'kileleshwa', 'donholm', 'komarock', 'buruburu', 'eastleigh', 'dagoretti',
  'waiyaki way', 'ngara', 'muthaiga', 'runda', 'ruai', 'thika road', 'kagundo',
];

const KENYA_LOCATION_SLUGS = ['nairobi', 'mombasa', 'kisumu', 'eldoret', 'nakuru', 'thika', 'nyeri', 'machakos'];

const FOREIGN_MARKERS = ['mauritius', 'south africa', 'uganda', 'tanzania', 'rwanda', 'nigeria', 'ghana', 'international'];

/** Best-effort location slug for a local (Kenya) job from its free-text job_location. */
export function mapLocalJobLocation(jobLocation: string): string {
  const loc = jobLocation.toLowerCase();

  if (FOREIGN_MARKERS.some((m) => loc.includes(m))) return 'international-remote';
  if (loc.includes('mombasa road')) return 'nairobi';
  for (const slug of KENYA_LOCATION_SLUGS) {
    if (loc.includes(slug)) return slug;
  }
  if (NAIROBI_ALIASES.some((alias) => loc.includes(alias))) return 'nairobi';

  return 'nairobi'; // majority default — Brites Management is Nairobi-based
}

/** Kenya-city location slug for an NGO job's free-text location, else international. */
export function mapNgoJobLocation(location: string): string {
  const loc = location.toLowerCase();
  for (const slug of KENYA_LOCATION_SLUGS) {
    if (loc.includes(slug)) return slug;
  }
  return 'international-remote';
}

export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'volunteer';

/** Maps free-text employment type (e.g. local-jobs.json's "nature_of_job", or a remote job's title/tags) onto the fixed job_type enum. */
export function mapJobType(text: string): JobType {
  const t = text.toLowerCase();
  if (t.includes('intern')) return 'internship';
  if (t.includes('volunteer')) return 'volunteer';
  if (t.includes('contract')) return 'contract';
  if (t.includes('part') && t.includes('time')) return 'part_time';
  if (t.includes('part-time')) return 'part_time';
  return 'full_time';
}
