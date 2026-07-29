import { getSupabase, getSupabaseAdmin } from './supabase';
import type { CvOrder, CvOrderStatus, Inquiry, InquiryType, Job, JobCategory, JobWithRelations, Location } from './types';

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

/**
 * Categories that currently have at least one approved job, ranked by count —
 * used to suggest "try these instead" chips on an empty category page. Only
 * runs when a category is already empty, so the extra per-category count
 * queries (there are 17 categories) don't touch normal page loads.
 */
export async function getPopulatedCategories(excludeSlug: string, limit = 3): Promise<JobCategory[]> {
  const categories = await getCategories();
  const counts = await Promise.all(
    categories
      .filter((c) => c.slug !== excludeSlug)
      .map(async (c) => {
        const { count } = await getSupabase()
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .eq('category_id', c.id);
        return { category: c, count: count ?? 0 };
      })
  );
  return counts
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((c) => c.category);
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
  categoryId?: string;
  locationSlug?: string;
  locationId?: string;
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

  // Filtering on job_categories.slug/locations.slug (embedded resources) only
  // narrows the returned rows if the join is INNER, and never narrows the
  // `count: 'exact'` total either way — Postgrest computes that count before
  // the embedded-resource filter applies. Resolving to the real category_id/
  // location_id columns on `jobs` itself fixes both the rows AND the count.
  // Callers that already have the category/location row (category/[slug].astro,
  // location/[slug].astro both fetch it for the page title before calling this)
  // should pass categoryId/locationId directly to skip this redundant lookup —
  // only resolve by slug when the caller genuinely only has one (e.g. the
  // /jobs/ filter form, which reads slugs straight from the query string).
  const [category, location] = await Promise.all([
    filters.categoryId ? null : filters.categorySlug ? getCategoryBySlug(filters.categorySlug) : Promise.resolve(null),
    filters.locationId ? null : filters.locationSlug ? getLocationBySlug(filters.locationSlug) : Promise.resolve(null),
  ]);
  const categoryId = filters.categoryId ?? category?.id;
  const locationId = filters.locationId ?? location?.id;

  let query = getSupabase()
    .from('jobs')
    .select(JOB_SELECT, { count: 'exact' })
    .eq('status', 'approved')
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (locationId) {
    query = query.eq('location_id', locationId);
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

  const jobs = (data ?? []) as unknown as JobWithRelations[];
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

/**
 * Powers the homepage "Featured Jobs" carousel. Paid, currently-active
 * featured placements are always shown first; if there aren't enough of them
 * yet (e.g. early on, before paid submissions build up), the rest of the
 * carousel is backfilled with the most recent approved jobs so the grid
 * never shows empty gaps — matches this section's pre-existing look, which
 * was always fully populated.
 */
export async function getFeaturedJobs(limit = 6): Promise<JobWithRelations[]> {
  const { data: featuredData, error: featuredError } = await getSupabase()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'approved')
    .eq('is_featured', true)
    .gt('featured_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (featuredError) throw featuredError;
  const featured = (featuredData ?? []) as unknown as JobWithRelations[];

  if (featured.length >= limit) return featured;

  const excludeIds = featured.map((j) => j.id);
  let backfillQuery = getSupabase()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit - featured.length);
  if (excludeIds.length > 0) {
    backfillQuery = backfillQuery.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  const { data: backfillData, error: backfillError } = await backfillQuery;
  if (backfillError) throw backfillError;
  const backfill = (backfillData ?? []) as unknown as JobWithRelations[];

  return [...featured, ...backfill].slice(0, limit);
}

/** Latest jobs in a specific category by slug — used for the "related categories" fallback/interlinking. */
export async function getJobsByCategorySlug(categorySlug: string, limit = 6): Promise<JobWithRelations[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];
  const { data, error } = await getSupabase()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'approved')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as JobWithRelations[];
}

/**
 * Latest Kenya-based (non-remote) jobs, regardless of category — used as the
 * empty-state fallback on category pages with no listings yet (e.g.
 * tsc-jobs/government-jobs, which have no dedicated scraper source). Visitors
 * landing on a Kenya-specific category expect Kenya-based roles, not
 * unrelated remote/international ones, even when their exact category is empty.
 */
export async function getLatestLocalJobs(limit = 6): Promise<JobWithRelations[]> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'approved')
    .eq('is_remote', false)
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
  custom_category_label?: string | null;
  custom_location_label?: string | null;
  job_type: string;
  is_remote: boolean;
  is_international: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  application_method: 'email' | 'url';
  application_value: string;
  whatsapp_number?: string | null;
  deadline?: string | null;
  contact_name?: string | null;
  contact_email: string;
  id: string;
  pricing_tier: '5day' | '14day';
  payment_status: 'pending';
  payment_reference: string;
  payment_phone: string;
}

export async function submitJob(submission: NewJobSubmission) {
  const { error } = await getSupabase().from('jobs').insert(submission);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Admin (service-role) queries — never called from client-exposed code paths.
// ---------------------------------------------------------------------------

/**
 * Jobs awaiting admin review. Scoped to payment_status='paid' so abandoned or
 * still-processing public submissions (payment pending/failed) never clutter
 * this queue — scraper/legacy-import rows never reach 'pending' status at all,
 * so this filter only affects the public submission funnel.
 */
export async function getPendingJobs(): Promise<JobWithRelations[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('jobs')
    .select(JOB_SELECT)
    .eq('status', 'pending')
    .eq('payment_status', 'paid')
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

const FEATURED_DAYS: Record<'5day' | '14day', number> = { '5day': 5, '14day': 14 };
const LISTING_DAYS = 60;

/**
 * Looks up payment_status by reference for the post-payment polling page.
 * Must use the service-role client — the job is still status='pending' at
 * this point, which the public RLS read policy (status='approved' only)
 * would otherwise hide entirely.
 */
export async function getJobPaymentByReference(
  reference: string
): Promise<{ payment_status: string; pricing_tier: '5day' | '14day' } | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('jobs')
    .select('payment_status, pricing_tier')
    .eq('payment_reference', reference)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Applies a successful M-Pesa payment: featured placement + a 60-day listing
 * window. Scoped to payment_status='pending' so a redelivered webhook is a
 * safe no-op (0 rows affected) rather than double-applying the update.
 */
export async function markJobPaymentPaid(reference: string, tier: '5day' | '14day'): Promise<void> {
  const now = Date.now();
  const featuredUntil = new Date(now + FEATURED_DAYS[tier] * 24 * 60 * 60 * 1000).toISOString();
  const expiresAt = new Date(now + LISTING_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await getSupabaseAdmin()
    .from('jobs')
    .update({
      payment_status: 'paid',
      is_featured: true,
      featured_until: featuredUntil,
      expires_at: expiresAt,
    })
    .eq('payment_reference', reference)
    .eq('payment_status', 'pending');
  if (error) throw error;
}

export async function markJobPaymentFailed(reference: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('jobs')
    .update({ payment_status: 'failed' })
    .eq('payment_reference', reference)
    .eq('payment_status', 'pending');
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Inquiries ("Work With Us" footer widget)
// ---------------------------------------------------------------------------

export interface NewInquiry {
  type: InquiryType;
  name: string;
  email: string;
  company: string | null;
  message: string;
}

export async function submitInquiry(inquiry: NewInquiry): Promise<void> {
  const { error } = await getSupabase().from('inquiries').insert(inquiry);
  if (error) throw error;
}

export async function getInquiries(status: 'new' | 'read' | 'archived'): Promise<Inquiry[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('inquiries')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markInquiryRead(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('inquiries').update({ status: 'read' }).eq('id', id);
  if (error) throw error;
}

export async function archiveInquiry(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('inquiries').update({ status: 'archived' }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// CV & Resume builder orders (/cv-builder/) — admin only, see lib/cv-orders.ts
// for how rows get created (only after payment is confirmed).
// ---------------------------------------------------------------------------

export async function getCvOrders(status: CvOrderStatus): Promise<CvOrder[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('cv_orders')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateCvOrderStatus(id: string, status: CvOrderStatus): Promise<void> {
  const { error } = await getSupabaseAdmin().from('cv_orders').update({ status }).eq('id', id);
  if (error) throw error;
}
