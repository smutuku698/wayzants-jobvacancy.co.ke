export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'volunteer';
export type ApplicationMethod = 'email' | 'url';
export type JobStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface JobCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface Location {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  is_remote: boolean;
  is_international: boolean;
  sort_order: number;
}

export interface AiEnhancement {
  skills: string[];
  careerLevel: string;
  kenyaSalaryEstimate: string;
  metaDescription: string;
  applicationTips: string[];
  kenyaContext: string;
  /** 2-3 sentence overview of the role — a lead-in paragraph before the raw scraped description. */
  jobSummary?: string;
  /** Paragraph on the employer/organisation itself. */
  companyInsights?: string;
  /** Paragraph on career progression/advancement in this kind of role. */
  careerGrowth?: string;
  /** Paragraph on day-to-day work environment and culture. */
  workEnvironment?: string;
  /** Paragraph on benefits/compensation beyond base salary. */
  benefits?: string;
  /** Paragraph on market demand/industry context for this kind of role. */
  marketContext?: string;
  enhancementSource: 'ai' | 'template' | 'cache' | 'legacy';
  enhancedAt: string;
}

export interface Job {
  id: string;
  title: string;
  slug: string;
  company_name: string;
  company_logo_url: string | null;
  description: string;
  category_id: string;
  location_id: string;
  job_type: JobType;
  is_remote: boolean;
  is_international: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  application_method: ApplicationMethod;
  application_value: string;
  deadline: string | null;
  status: JobStatus;
  contact_name: string | null;
  contact_email: string;
  views_count: number;
  created_at: string;
  approved_at: string | null;
  expires_at: string | null;
  source_url: string | null;
  source: string | null;
  ai_enhancement: AiEnhancement | null;
}

export interface JobWithRelations extends Job {
  job_categories: JobCategory;
  locations: Location;
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  volunteer: 'Volunteer',
};
