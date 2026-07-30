import { JOB_TYPE_LABELS } from './types';
import type { JobWithRelations } from './types';

export const SITE_URL = 'https://www.jobvacancy.co.ke';
export const SITE_NAME = 'JobVacancy.co.ke';

const EMPLOYMENT_TYPE_SCHEMA: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
  volunteer: 'VOLUNTEER',
};

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: 'Hustles Ltd',
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: 'Kenya’s job board for NGO, government, teaching, TSC and online jobs.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Moi Avenue, Delta Plaza, Room 45',
      addressLocality: 'Nairobi',
      postalCode: '00100',
      addressCountry: 'KE',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+254-736-407-642',
      email: 'hr@jobvacancy.co.ke',
      areaServed: 'KE',
      availableLanguage: ['English', 'Swahili'],
    },
    sameAs: [
      'https://www.facebook.com/profile.php?id=61579442721300',
      'https://twitter.com/jobvacancyke',
      'https://instagram.com/jobvacancy.co.ke',
      'https://www.linkedin.com/company/jobvacancy-kenya',
    ],
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/** Generic Service + OfferCatalog schema — used by the CV builder to expose its priced tiers as
 * structured data (Google doesn't have a dedicated "CV writing" type, `Service` + `Offer` is the
 * documented pattern for a priced professional service). Kept generic/parameterized in `seo.ts`
 * rather than importing `CV_PRICING_TIERS` directly, to avoid this SEO-only module depending on
 * the CV-orders module's Supabase/KV imports. */
export function serviceJsonLd(params: {
  name: string;
  description: string;
  areaServed?: string;
  offers: { name: string; description: string; priceKes: number }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: params.name,
    name: params.name,
    description: params.description,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: {
      '@type': 'Country',
      name: params.areaServed ?? 'Worldwide',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: params.name,
      itemListElement: params.offers.map((o) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: o.name,
          description: o.description,
        },
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: o.priceKes,
          priceCurrency: 'KES',
        },
      })),
    },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/jobs/?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// cruise-ship-jobs and teaching-jobs-abroad are physical, in-person placements
// (onboard a ship / at a specific overseas school) — not telecommute — but
// both are stored with is_remote=true purely because the DB's location
// taxonomy has no "physical location outside Kenya" option yet, only
// Kenya-physical/Kenya-remote/international-remote (see `locations` table
// seed in 0001_init.sql and the `international_must_be_remote` check
// constraint). Using job.is_remote alone for jobLocationType would falsely
// label these as TELECOMMUTE, which Google's structured-data guidelines
// specifically warn against for jobs that actually require physical presence
// at a real (if varying) location.
const ABROAD_PHYSICAL_CATEGORY_SLUGS = new Set(['cruise-ship-jobs', 'teaching-jobs-abroad']);

// Best-effort country lookup from a job's own title/description text, so
// abroad-physical jobs get a real jobLocation instead of a false TELECOMMUTE
// label. City-level aliases are listed first (more specific/reliable than a
// bare country name) and resolve to both a locality and a country.
const CITY_ALIASES: [RegExp, { locality: string; country: string }][] = [
  [/\bAbu Dhabi\b/i, { locality: 'Abu Dhabi', country: 'AE' }],
  [/\bDubai\b/i, { locality: 'Dubai', country: 'AE' }],
  [/\bDoha\b/i, { locality: 'Doha', country: 'QA' }],
  [/\bHong Kong\b/i, { locality: 'Hong Kong', country: 'HK' }],
];

const COUNTRY_ALIASES: [RegExp, string][] = [
  [/\bQatar\b/i, 'QA'],
  [/\bUnited Arab Emirates\b|\bUAE\b/i, 'AE'],
  [/\bSaudi Arabia\b/i, 'SA'],
  [/\bKuwait\b/i, 'KW'],
  [/\bBahrain\b/i, 'BH'],
  [/\bOman\b/i, 'OM'],
  [/\bSingapore\b/i, 'SG'],
  [/\bVietnam\b/i, 'VN'],
  [/\bThailand\b/i, 'TH'],
  [/\bMalaysia\b/i, 'MY'],
  [/\bIndonesia\b/i, 'ID'],
  [/\bEgypt\b/i, 'EG'],
  [/\bPortugal\b/i, 'PT'],
  [/\bSpain\b/i, 'ES'],
  [/\bFrance\b/i, 'FR'],
  [/\bGermany\b/i, 'DE'],
  [/\bItaly\b/i, 'IT'],
  [/\bNetherlands\b/i, 'NL'],
  [/\bSwitzerland\b/i, 'CH'],
  [/\bChina\b/i, 'CN'],
  [/\bBrazil\b/i, 'BR'],
  [/\bTurkey\b/i, 'TR'],
  [/\bNigeria\b/i, 'NG'],
  [/\bSouth Africa\b/i, 'ZA'],
  [/\bIndia\b/i, 'IN'],
  [/\bJapan\b/i, 'JP'],
  [/\bSouth Korea\b/i, 'KR'],
  [/\bPhilippines\b/i, 'PH'],
  [/\bJordan\b/i, 'JO'],
  [/\bLebanon\b/i, 'LB'],
  [/\bMorocco\b/i, 'MA'],
  [/\bRwanda\b/i, 'RW'],
  [/\bTanzania\b/i, 'TZ'],
  [/\bUganda\b/i, 'UG'],
  [/\bEthiopia\b/i, 'ET'],
];

/**
 * "UK curriculum"/"US curriculum" is a very common phrase in these listings
 * (describing which school syllabus is taught) and would otherwise falsely
 * match GB/US as the job's actual location — stripped before matching.
 */
function stripCurriculumMentions(text: string): string {
  return text.replace(/\b(UK|US|American|British)\s+curriculum/gi, '');
}

function guessAbroadLocation(job: JobWithRelations): { locality?: string; country: string } | null {
  const title = job.title ?? '';
  const description = stripCurriculumMentions(job.description ?? '');

  for (const source of [title, description]) {
    for (const [pattern, loc] of CITY_ALIASES) {
      if (pattern.test(source)) return loc;
    }
    for (const [pattern, country] of COUNTRY_ALIASES) {
      if (pattern.test(source)) return { country };
    }
  }
  return null;
}

export function jobPostingJsonLd(job: JobWithRelations) {
  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    identifier: {
      '@type': 'PropertyValue',
      name: SITE_NAME,
      value: job.id,
    },
    datePosted: job.created_at,
    employmentType: EMPLOYMENT_TYPE_SCHEMA[job.job_type] ?? 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name,
      ...(job.company_logo_url ? { logo: job.company_logo_url } : {}),
    },
    directApply: job.application_method === 'url',
  };

  // Every job is treated as valid for 90 days from posting for structured-data
  // purposes, regardless of `deadline` — this is invisible to users (the page
  // and all listings keep showing the job normally, per policy), it only
  // tells Google's Jobs-search feature the posting has an end date, which is
  // what keeps a large catalog of long-lived listings from reading as stale/
  // spammy to Google without ever having to take anything off the site.
  json.validThrough = new Date(new Date(job.created_at).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  if (ABROAD_PHYSICAL_CATEGORY_SLUGS.has(job.job_categories?.slug ?? '')) {
    // Physical placement outside Kenya (cruise ship / overseas school), not
    // telecommute — give it a real jobLocation when a country can be
    // determined from the job's own text, and omit both jobLocation and
    // jobLocationType otherwise rather than asserting an incorrect one.
    const location = guessAbroadLocation(job);
    if (location) {
      json.jobLocation = {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          ...(location.locality ? { addressLocality: location.locality } : {}),
          addressCountry: location.country,
        },
      };
    }
  } else if (job.is_remote) {
    json.jobLocationType = 'TELECOMMUTE';
    json.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'KE',
    };
  } else {
    json.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.locations?.name ?? 'Kenya',
        addressCountry: 'KE',
      },
    };
  }

  if (job.salary_min || job.salary_max) {
    json.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salary_currency,
      value: {
        '@type': 'QuantitativeValue',
        ...(job.salary_min ? { minValue: job.salary_min } : {}),
        ...(job.salary_max ? { maxValue: job.salary_max } : {}),
        unitText: 'MONTH',
      },
    };
  }

  return json;
}

export function jobTypeLabel(type: string): string {
  return JOB_TYPE_LABELS[type as keyof typeof JOB_TYPE_LABELS] ?? type;
}
