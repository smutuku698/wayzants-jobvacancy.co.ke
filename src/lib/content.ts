export interface LandingCopy {
  h1: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
}

const SITE = 'JobVacancy.co.ke';

export const CATEGORY_CONTENT: Record<string, LandingCopy> = {
  'ngo-jobs': {
    h1: 'NGO Jobs in Kenya',
    intro:
      'Browse the latest NGO jobs in Kenya from UN agencies, INGOs and local development organisations — programme, M&E, humanitarian and admin roles updated daily.',
    metaTitle: `NGO Jobs in Kenya – Latest Vacancies | ${SITE}`,
    metaDescription:
      'Find the latest NGO jobs in Kenya. New vacancies from UN agencies, international NGOs and local non-profits in Nairobi and across the country, updated daily.',
  },
  'teaching-jobs': {
    h1: 'Teaching Jobs in Kenya',
    intro:
      'Find teaching vacancies in primary schools, secondary schools, colleges and universities across Kenya — from Nairobi to the counties, updated daily.',
    metaTitle: `Teaching Jobs in Kenya – Latest Vacancies | ${SITE}`,
    metaDescription:
      'Explore the latest teaching jobs in Kenya. Vacancies for primary, secondary, college and university teachers across the country, updated daily.',
  },
  'tsc-jobs': {
    h1: 'TSC Jobs & Teaching Vacancies',
    intro:
      'Track the latest Teachers Service Commission (TSC) jobs in Kenya — internship, replacement and permanent teaching vacancies from TSC and partner schools.',
    metaTitle: `TSC Jobs in Kenya – Latest TSC Vacancies | ${SITE}`,
    metaDescription:
      'Latest TSC jobs in Kenya: Teachers Service Commission internships, replacement postings and permanent teaching vacancies, updated daily.',
  },
  'government-jobs': {
    h1: 'Government Jobs in Kenya',
    intro:
      'Discover the latest government jobs in Kenya — public service, county government, parastatals and state corporations, all in one place.',
    metaTitle: `Government Jobs in Kenya – Latest Vacancies | ${SITE}`,
    metaDescription:
      'Find the latest government jobs in Kenya: public service commission, county government, parastatal and state corporation vacancies, updated daily.',
  },
  'internships-graduate-trainee': {
    h1: 'Internships & Graduate Trainee Jobs in Kenya',
    intro:
      'Kickstart your career with the latest internship, attachment and graduate trainee programs from employers across Kenya.',
    metaTitle: `Internships & Graduate Trainee Jobs in Kenya | ${SITE}`,
    metaDescription:
      'Browse internship, industrial attachment and graduate trainee opportunities in Kenya for students and recent graduates, updated daily.',
  },
  'it-software-jobs': {
    h1: 'IT & Software Jobs in Kenya',
    intro:
      'Software development, IT support, data and technology jobs from Kenyan and international employers hiring in Nairobi and remotely.',
    metaTitle: `IT & Software Jobs in Kenya – Latest Vacancies | ${SITE}`,
    metaDescription:
      'Latest IT and software jobs in Kenya: developer, IT support, data and technology vacancies in Nairobi and remote roles, updated daily.',
  },
  'sales-marketing-jobs': {
    h1: 'Sales & Marketing Jobs in Kenya',
    intro:
      'Sales, marketing, business development and brand jobs from companies hiring across Kenya.',
    metaTitle: `Sales & Marketing Jobs in Kenya | ${SITE}`,
    metaDescription:
      'Find the latest sales and marketing jobs in Kenya, including business development, brand and digital marketing vacancies, updated daily.',
  },
  'accounting-finance-jobs': {
    h1: 'Accounting & Finance Jobs in Kenya',
    intro: 'Accounting, audit, banking and finance vacancies from employers across Kenya.',
    metaTitle: `Accounting & Finance Jobs in Kenya | ${SITE}`,
    metaDescription:
      'Latest accounting and finance jobs in Kenya: audit, banking, accountant and finance officer vacancies, updated daily.',
  },
  'admin-secretarial-jobs': {
    h1: 'Administration & Secretarial Jobs in Kenya',
    intro: 'Office administration, secretarial, receptionist and personal assistant jobs across Kenya.',
    metaTitle: `Administration & Secretarial Jobs in Kenya | ${SITE}`,
    metaDescription:
      'Find administration, secretarial, receptionist and office assistant jobs in Kenya, updated daily.',
  },
  'healthcare-medical-jobs': {
    h1: 'Healthcare & Medical Jobs in Kenya',
    intro: 'Nursing, clinical, hospital and medical jobs from healthcare employers across Kenya.',
    metaTitle: `Healthcare & Medical Jobs in Kenya | ${SITE}`,
    metaDescription:
      'Latest healthcare and medical jobs in Kenya: nursing, clinical officer and hospital vacancies, updated daily.',
  },
  'engineering-construction-jobs': {
    h1: 'Engineering & Construction Jobs in Kenya',
    intro: 'Civil, electrical and mechanical engineering plus construction site jobs across Kenya.',
    metaTitle: `Engineering & Construction Jobs in Kenya | ${SITE}`,
    metaDescription:
      'Find engineering and construction jobs in Kenya: civil, electrical, mechanical and site management vacancies, updated daily.',
  },
  'driving-logistics-jobs': {
    h1: 'Driving & Logistics Jobs in Kenya',
    intro: 'Driving, supply chain, warehouse and logistics jobs from employers across Kenya.',
    metaTitle: `Driving & Logistics Jobs in Kenya | ${SITE}`,
    metaDescription:
      'Latest driving and logistics jobs in Kenya: driver, warehouse and supply chain vacancies, updated daily.',
  },
  'security-jobs': {
    h1: 'Security Jobs in Kenya',
    intro: 'Security guard, risk and safety officer jobs from employers across Kenya.',
    metaTitle: `Security Jobs in Kenya – Latest Vacancies | ${SITE}`,
    metaDescription: 'Find the latest security jobs in Kenya, updated daily.',
  },
  'hospitality-tourism-jobs': {
    h1: 'Hospitality & Tourism Jobs in Kenya',
    intro: 'Hotel, restaurant, travel and tourism jobs from employers across Kenya.',
    metaTitle: `Hospitality & Tourism Jobs in Kenya | ${SITE}`,
    metaDescription:
      'Latest hospitality and tourism jobs in Kenya: hotel, restaurant and travel vacancies, updated daily.',
  },
  'customer-service-jobs': {
    h1: 'Customer Service Jobs in Kenya',
    intro: 'Call centre, customer support and client service jobs from employers across Kenya.',
    metaTitle: `Customer Service Jobs in Kenya | ${SITE}`,
    metaDescription: 'Find the latest customer service and call centre jobs in Kenya, updated daily.',
  },
  'online-remote-jobs': {
    h1: 'Online & Remote Jobs in Kenya',
    intro:
      'Remote and online jobs you can do from anywhere in Kenya — including international employers hiring virtual talent.',
    metaTitle: `Online Jobs in Kenya – Remote Work Vacancies | ${SITE}`,
    metaDescription:
      'Find legitimate online and remote jobs in Kenya, including international remote positions you can do from home, updated daily.',
  },
};

export const LOCATION_CONTENT: Record<string, LandingCopy> = {
  nairobi: {
    h1: 'Jobs in Nairobi',
    intro: 'The latest job vacancies in Nairobi, Kenya’s capital and largest job market — updated daily.',
    metaTitle: `Jobs in Nairobi – Latest Vacancies Today | ${SITE}`,
    metaDescription: 'Find the latest jobs in Nairobi, Kenya across all industries, updated daily.',
  },
  mombasa: {
    h1: 'Jobs in Mombasa',
    intro: 'The latest job vacancies in Mombasa and the Kenyan Coast, updated daily.',
    metaTitle: `Jobs in Mombasa – Latest Vacancies Today | ${SITE}`,
    metaDescription: 'Find the latest jobs in Mombasa, Kenya across all industries, updated daily.',
  },
  kisumu: {
    h1: 'Jobs in Kisumu',
    intro: 'The latest job vacancies in Kisumu and the Nyanza region, updated daily.',
    metaTitle: `Jobs in Kisumu – Latest Vacancies Today | ${SITE}`,
    metaDescription: 'Find the latest jobs in Kisumu, Kenya across all industries, updated daily.',
  },
  eldoret: {
    h1: 'Jobs in Eldoret',
    intro: 'The latest job vacancies in Eldoret and the North Rift, updated daily.',
    metaTitle: `Jobs in Eldoret – Latest Vacancies Today | ${SITE}`,
    metaDescription: 'Find the latest jobs in Eldoret, Kenya across all industries, updated daily.',
  },
  nakuru: {
    h1: 'Jobs in Nakuru',
    intro: 'The latest job vacancies in Nakuru and the Rift Valley, updated daily.',
    metaTitle: `Jobs in Nakuru – Latest Vacancies Today | ${SITE}`,
    metaDescription: 'Find the latest jobs in Nakuru, Kenya across all industries, updated daily.',
  },
  thika: {
    h1: 'Jobs in Thika',
    intro: 'The latest job vacancies in Thika and the wider Central region, updated daily.',
    metaTitle: `Jobs in Thika – Latest Vacancies Today | ${SITE}`,
    metaDescription: 'Find the latest jobs in Thika, Kenya across all industries, updated daily.',
  },
  nyeri: {
    h1: 'Jobs in Nyeri',
    intro: 'The latest job vacancies in Nyeri and the Central region, updated daily.',
    metaTitle: `Jobs in Nyeri – Latest Vacancies Today | ${SITE}`,
    metaDescription: 'Find the latest jobs in Nyeri, Kenya across all industries, updated daily.',
  },
  machakos: {
    h1: 'Jobs in Machakos',
    intro: 'The latest job vacancies in Machakos and the Eastern region, updated daily.',
    metaTitle: `Jobs in Machakos – Latest Vacancies Today | ${SITE}`,
    metaDescription: 'Find the latest jobs in Machakos, Kenya across all industries, updated daily.',
  },
  'remote-online-kenya': {
    h1: 'Remote & Online Jobs in Kenya',
    intro: 'Work-from-home and remote jobs you can do from anywhere in Kenya, updated daily.',
    metaTitle: `Remote Jobs in Kenya – Work From Home | ${SITE}`,
    metaDescription: 'Find remote and work-from-home jobs in Kenya, updated daily.',
  },
  'international-remote': {
    h1: 'International Jobs in Kenya (100% Remote)',
    intro:
      'International remote jobs you can do from Kenya — virtual roles with global employers. Every listing here is 100% online, no relocation required.',
    metaTitle: `International Remote Jobs for Kenyans | ${SITE}`,
    metaDescription:
      'Find international remote jobs you can do from Kenya. 100% virtual roles with global employers — no relocation needed, updated daily.',
  },
};

export function getCategoryContent(slug: string, name: string): LandingCopy {
  return (
    CATEGORY_CONTENT[slug] ?? {
      h1: `${name} in Kenya`,
      intro: `Browse the latest ${name.toLowerCase()} in Kenya, updated daily.`,
      metaTitle: `${name} in Kenya – Latest Vacancies | ${SITE}`,
      metaDescription: `Find the latest ${name.toLowerCase()} in Kenya, updated daily.`,
    }
  );
}

export function getLocationContent(slug: string, name: string): LandingCopy {
  return (
    LOCATION_CONTENT[slug] ?? {
      h1: `Jobs in ${name}`,
      intro: `The latest job vacancies in ${name}, Kenya, updated daily.`,
      metaTitle: `Jobs in ${name} – Latest Vacancies Today | ${SITE}`,
      metaDescription: `Find the latest jobs in ${name}, Kenya across all industries, updated daily.`,
    }
  );
}
