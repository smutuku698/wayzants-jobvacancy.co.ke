// Shapes of the three legacy JSON datasets from the old Next.js jobvacancy.co.ke
// site (C:\Users\Atom\Documents\jobvacancy.co.ke-main-themechange\data). Read-only
// reference types for the import script — not used by the live Astro app.

export interface LegacyEnhancement {
  skills: string[];
  relatedSkills?: string[];
  careerLevel: string;
  careerLevelYears?: string;
  kenyaSalaryEstimate: string;
  kenyaSalaryMin?: number;
  kenyaSalaryMax?: number;
  estimatedSalaryUSD?: string;
  metaDescription: string;
  jobSummary?: string;
  applicationTips: string[];
}

export interface LegacyRemoteJob {
  title: string;
  company: string;
  description: string;
  location: string;
  url: string;
  category: string;
  pubDate: string;
  tags?: string[];
  source: string;
  enhancement?: LegacyEnhancement;
  kenyaContext?: string;
  enhancementSource?: 'ai' | 'template' | 'database-match';
  enhancementMetadata?: { timestamp?: string; template?: string };
}

export interface LegacyNgoJob extends LegacyRemoteJob {
  careerCategory?: string[];
  theme?: string[];
}

// Historical cruise-ship-jobs seed (C:\Users\Atom\Documents\jobs-in-kenya-scrapper\
// cruise_ship_jobs_scraper\enhanced_cruise_jobs_*.json) — same rich-prose
// enhancement shape the old site's local-jobs pipeline used, not the
// skills/metaDescription shape of LegacyEnhancement above.
export interface LegacyCruiseJob {
  id: string;
  title: string;
  url: string;
  apply_url?: string;
  location?: string;
  category?: string;
  employer?: string;
  description?: string;
  source: string;
  scraped_at?: string;
  company_insights?: string;
  career_growth?: string;
  work_environment?: string;
  benefits?: string;
  application_tips?: string;
  market_context?: string;
}

// Historical teaching-jobs-abroad seed (C:\Users\Atom\Documents\jobs-in-kenya-scrapper\
// teaching_jobs_abroad_scraper\data\enhanced_teaching_jobs_latest.json).
export interface LegacyTeachingAbroadJob {
  id: string;
  title: string;
  url: string;
  apply_url?: string;
  location?: string;
  region?: string;
  employer?: string;
  description?: string;
  source: string;
  posted_date?: string;
  about_teaching_abroad?: string;
  career_benefits?: string;
  lifestyle_benefits?: string;
  package_highlights?: string;
  application_advice?: string;
  regional_insight?: string;
}

export interface LegacyLocalJob {
  id: number;
  date: string;
  job_title: string;
  nature_of_job: string;
  industry: string;
  salary: string;
  job_location: string;
  duties_and_responsibilities: string;
  key_requirements_skills_qualification: string;
  how_to_apply: string;
  company_insights?: string;
  career_growth?: string;
  work_environment?: string;
  benefits?: string;
  application_tips?: string;
  market_context?: string;
}
