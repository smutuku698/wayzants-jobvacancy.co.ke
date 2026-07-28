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
