import { getSupabase, getSupabaseAdmin } from './supabase';
import type { Job, JobCategory, JobWithRelations, Location } from './types';

const JOB_SELECT = '*, job_categories(*), locations(*)';
const PAGE_SIZE = 20;

export async function getCategories(): Promise<JobCategory[]> {
  const { data, error } = await getSupabase()
    .from('job_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getLocations(): Promise<Location[]> {
  const { data, error } = await getSupabase()
    .from('locations')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<JobCategory | null> {
  const { data, error } = await getSupabase().from('job_categories').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLocationBySlug(slug: string): Promise<Location | null> {
  const { data, error } = await getSupabase().from('locations').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

export interface JobFilters {
  categorySlug?: string;
  locationSlug?: string;
  jobType?: string;
  remoteOnly?: boolean;
  search?: string;
  page?: number;
}

export interface JobListResult {
  jobs: JobWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getApprovedJobs(filters: JobFilters = {}): Promise<JobListResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = getSupabase()
    .from('jobs')
    .select(JOB_SELECT, { count: 'exact' })
    .eq('status', 'approved')
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.categorySlug) {
    query = query.eq('job_categories.slug', filters.categorySlug);
  }
  if (filters.locationSlug) {
    query = query.eq('locations.slug', filters.locationSlug);
  }
  if (filters.jobType) {
    query = query.eq('job_type', filters.jobType);
  }
  if (filters.remoteOnly) {
    query = query.eq('is_remote', true);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  // Supabase's PostgREST filters on embedded resources (job_categories.slug,
  // locations.slug) don't narrow the parent rows unless the join is INNER,
  // so re-filter defensively in application code.
  let jobs = (data ?? []) as unknown as JobWithRelations[];
  if (filters.categorySlug) jobs = jobs.filter((j) => j.job_categories?.slug === filters.categorySlug);
  if (filters.locationSlug) jobs = jobs.filter((j) => j.locations?.slug === filters.locationSlug);

  return { jobs, total: count ?? jobs.length, page, pageSize: PAGE_SIZE };
}

export async function getJobBySlug(slug: string): Promise<JobWithRelations | null> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle();
  if (error) throw error;
  return data as unknown as JobWithRelations | null;
}

export async function getRelatedJobs(job: JobWithRelations, limit = 4): Promise<JobWithRelations[]> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'approved')
    .eq('category_id', job.category_id)
    .neq('id', job.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as JobWithRelations[];
}

export async function getLatestJobs(limit = 12): Promise<JobWithRelations[]> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as JobWithRelations[];
}

export interface NewJobSubmission {
  title: string;
  slug: string;
  company_name: string;
  company_logo_url?: string | null;
  description: string;
  category_id: string;
  location_id: string;
  job_type: string;
  is_remote: boolean;
  is_international: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  application_method: 'email' | 'url';
  application_value: string;
  deadline?: string | null;
  contact_name?: string | null;
  contact_email: string;
}

export async function submitJob(submission: NewJobSubmission) {
  const { data, error } = await getSupabase().from('jobs').insert(submission).select('id, slug').single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Admin (service-role) queries — never called from client-exposed code paths.
// ---------------------------------------------------------------------------

export async function getPendingJobs(): Promise<JobWithRelations[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as JobWithRelations[];
}

export async function approveJob(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('jobs')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectJob(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('jobs').update({ status: 'rejected' }).eq('id', id);
  if (error) throw error;
}

export async function getJobByIdAdmin(id: string): Promise<Job | null> {
  const { data, error } = await getSupabaseAdmin().from('jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
