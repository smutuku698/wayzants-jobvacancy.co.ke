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
  /** Free-text override shown instead of the generic "Other" category/location name when the poster picked "Other". */
  custom_category_label: string | null;
  custom_location_label: string | null;
  job_type: JobType;
  is_remote: boolean;
  is_international: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  application_method: ApplicationMethod;
  application_value: string;
  /** Optional extra channel — applicants can also send a CV/cover letter here alongside the primary method. */
  whatsapp_number: string | null;
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

export type InquiryType = 'comment' | 'partnership' | 'sponsorship' | 'advertising';
export type InquiryStatus = 'new' | 'read' | 'archived';

export interface Inquiry {
  id: string;
  type: InquiryType;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
}

export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  comment: 'General Comment',
  partnership: 'Partnership Opportunity',
  sponsorship: 'Sponsorship',
  advertising: 'Advertising Opportunity',
};

// ---------------------------------------------------------------------------
// CV & Resume builder
// ---------------------------------------------------------------------------

export type CvOrderTier = 'standard' | 'professional' | 'premium' | 'executive';
export type CvAddonId = 'express_delivery' | 'interview_prep' | 'bilingual_upgrade';
export type CvOrderPathType = 'form' | 'upload';
export type CvOrderStatus = 'new' | 'in_progress' | 'delivered' | 'archived';

export interface CvEducationEntry {
  institution: string;
  qualification: string;
  field: string;
  start_year: string;
  end_year: string;
}

export interface CvExperienceEntry {
  employer: string;
  title: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  responsibilities: string;
}

export interface CvCertificationEntry {
  name: string;
  issuer: string;
  year: string;
}

export interface CvRefereeEntry {
  name: string;
  relationship: string;
  organization: string;
  phone: string;
  email: string;
}

export interface CvWizardData {
  personal: {
    full_name: string;
    phone: string;
    email: string;
    location: string;
    professional_title: string;
    summary: string;
    linkedin_url: string;
    portfolio_url: string;
  };
  education: CvEducationEntry[];
  experience: CvExperienceEntry[];
  skills: string[];
  certifications: CvCertificationEntry[];
  referees: CvRefereeEntry[];
}

export interface CvUploadFocus {
  update_work_experience: boolean;
  redesign_only: boolean;
  add_section: boolean;
  other: string;
}

/** What's staged in Cloudflare KV between "customer clicked Pay" and "Paystack confirmed
 * payment" — never written to Supabase until then. See lib/cv-orders.ts. */
export interface CvOrderDraft {
  path_type: CvOrderPathType;
  tier: CvOrderTier;
  addons: CvAddonId[];
  template_id: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  /** Always populated from cv_data.personal for the wizard path, or from the upload form's own
   * fields for the upload path — one place the admin dashboard can always read from regardless
   * of which path the order came through. */
  linkedin_url: string | null;
  portfolio_url: string | null;
  target_job: string | null;
  cv_data: CvWizardData | null;
  upload_notes: string | null;
  upload_focus: CvUploadFocus | null;
  file_name: string | null;
  file_type: string | null;
  payment_phone: string;
}

export interface CvOrder {
  id: string;
  created_at: string;
  status: CvOrderStatus;
  path_type: CvOrderPathType;
  tier: CvOrderTier;
  addons: CvAddonId[];
  template_id: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  linkedin_url: string | null;
  portfolio_url: string | null;
  target_job: string | null;
  cv_data: CvWizardData | null;
  upload_notes: string | null;
  upload_focus: CvUploadFocus | null;
  file_url: string | null;
  payment_reference: string;
  payment_phone: string;
}
