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

  if (job.deadline) {
    json.validThrough = new Date(job.deadline).toISOString();
  } else {
    // No explicit deadline — mirror the active_jobs view's 90-day free-listing
    // cutoff (migration 0011) so the structured data agrees with the "closed"
    // state the page itself renders past that point, instead of implicitly
    // telling Google the listing is still open indefinitely.
    const ninetyDaysAfterPosted = new Date(new Date(job.created_at).getTime() + 90 * 24 * 60 * 60 * 1000);
    if (ninetyDaysAfterPosted.getTime() <= Date.now()) {
      json.validThrough = ninetyDaysAfterPosted.toISOString();
    }
  }

  if (job.is_remote) {
    json.jobLocationType = 'TELECOMMUTE';
    json.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'KE',
    };
  }
  if (!job.is_remote || !job.is_international) {
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
