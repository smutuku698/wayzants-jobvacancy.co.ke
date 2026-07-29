import { getEnv } from './env';
import { getSupabaseAdmin } from './supabase';
import type { CvAddonId, CvOrderDraft, CvOrderPathType, CvOrderTier } from './types';

export interface CvPricingTier {
  id: CvOrderTier;
  emoji: string;
  name: string;
  subtitle: string;
  priceKes: number;
  tagline: string;
  deliveryTime: string;
  includes: string[];
  revisionsText: string;
  isFeatured?: boolean;
}

/**
 * Full 4-tier repricing confirmed with the user 2026-07-29 (replaces the earlier 3-tier
 * Starter/Standard/Premium list). Copy is the user's own — pasted verbatim from their pricing
 * doc, only the Standard-tier price was overridden per their explicit instruction (2,500 -> 750,
 * "so we don't lose undercapitalized new job seekers"). `id`s reuse 'standard'/'premium' from
 * the old 3-tier scheme where the audience roughly carries over, so existing links elsewhere
 * (cv-and-resume-services simple example -> ?tier=standard) kept working unchanged.
 */
export const CV_PRICING_TIERS: CvPricingTier[] = [
  {
    id: 'standard',
    emoji: '🚀',
    name: 'Career Launchpad',
    subtitle: 'Standard Tier',
    priceKes: 750,
    tagline: 'Perfect for interns, fresh graduates, and professionals with 0–2 years of experience looking to break into the local market or land entry-level remote internships.',
    deliveryTime: '3–5 Business Days',
    includes: [
      '100% ATS-Compliant Layout: Engineered to bypass Applicant Tracking Systems used by top recruitment agencies.',
      'Keyword Optimization: Packed with high-density industry keywords to ensure recruiters find your profile.',
      '1-Page Modern CV: A clean, punchy layout that highlights your core skills, education, and potential.',
      'Dual Format Delivery: You receive both PDF and Word (.docx) versions.',
      'Dynamic Cover Letter Template: A customizable, matching template tailored for junior applications.',
      'Job Portal Blueprint: A curated guide to the top-performing job boards and recruitment agencies in East Africa.',
      'Personalized Job Board List: A tailored list of job board sites matched to your specific qualifications and target roles, for more job-seeking opportunities.',
    ],
    revisionsText: 'Up to 2 rounds of edits within 7 days of delivery.',
  },
  {
    id: 'professional',
    emoji: '💼',
    name: 'Global Remote & Mid-Career Growth',
    subtitle: 'Professional Tier',
    priceKes: 5500,
    tagline: 'Designed for supervisors, specialists, and professionals (2–7 years experience) targeting high-paying remote international jobs or regional corporate promotions.',
    deliveryTime: '3 Business Days',
    includes: [
      'International & Remote Optimization: Structured specifically to appeal to international hiring managers and remote-first global companies.',
      'Advanced ATS Engineering: Optimized for complex algorithmic screening tools used by international tech and corporate giants.',
      'Achievement-Driven Phrasing: Re-writing your daily duties into high-impact, measurable results using global metrics.',
      '2-Page Global CV: A structured layout balancing your growing experience with sharp professional branding.',
      'Dual Format Delivery: You receive both PDF and Word (.docx) versions.',
      'Bespoke Cover Letter: A custom-written cover letter tailored to a specific job description or industry target.',
      'LinkedIn™ Optimization Checklist: A step-by-step DIY guide to updating your profile for maximum recruiter visibility.',
    ],
    revisionsText: 'Up to 3 rounds of edits within 10 days of delivery.',
  },
  {
    id: 'premium',
    emoji: '👑',
    name: 'Cross-Border Leadership & Relocation',
    subtitle: 'Premium Tier',
    priceKes: 12500,
    tagline: 'Engineered for senior managers, department heads, and technical experts (8+ years) seeking relocation packages or senior remote roles in the US, UK, Europe, or the Gulf region.',
    deliveryTime: '3–4 Business Days',
    includes: [
      'Country-Specific Target Styling: Fully tailored to the recruitment standards of your destination country (e.g., US Reverse-Chronological Resume, UK/EU Curriculum Vitae, or Gulf Region Frameworks).',
      'Executive-Grade ATS Matrix: Passed through deep keyword matching optimized for global enterprise-level HR systems.',
      'Global Value Proposition Strategy: Focuses heavily on your cross-cultural leadership, international project management, and remote team stewardship.',
      'Up to 3-Page Executive CV: A premium layout highlighting your career trajectory and business wins on a global scale.',
      'Dual Format Delivery: You receive both PDF and Word (.docx) versions.',
      'Strategic Cover Letter: Written with a sophisticated leadership tone to match high-stakes international corporate or NGO applications.',
      'Full LinkedIn™ Profile Overhaul: Complete rewriting of your About summary, headline, and experience sections by our team to attract international headhunters.',
      '30-Minute Career Strategy Session: A 1-on-1 consultation call to align your documents with your exact international target market.',
    ],
    revisionsText: 'Unlimited revisions for 14 days post-delivery.',
    isFeatured: true,
  },
  {
    id: 'executive',
    emoji: '🏛️',
    name: 'Global C-Suite Excellence',
    subtitle: 'Executive Tier',
    priceKes: 25000,
    tagline: 'The ultimate career-branding package for CEOs, CFOs, Managing Directors, and Board Members demanding elite personal marketing for international boards, multinational firms, or global expatriate roles.',
    deliveryTime: '5–7 Business Days',
    includes: [
      'Global Headhunter Optimization: Engineered to pass both strict algorithmic screens and elite executive search firm reviews worldwide.',
      'Multi-Format Global Delivery: You receive both a board-ready US Executive Resume style and a UK/International Executive CV style.',
      'Board-Ready Corporate Alignment: Flawless presentation optimized for international board positions, global NGOs, and venture-backed startups.',
      'Dual Format Delivery: You receive both PDF and Word (.docx) versions of every document.',
      '1-Page Executive Biography: A beautifully written narrative biography for speaking engagements, company websites, or international corporate proposals.',
      'Elite Leadership Cover Letter: Crafted to showcase governance, organizational transformation, and multi-million dollar fiscal stewardship.',
      'VIP LinkedIn™ Management: We log in and fully optimize your profile settings, visuals, and content for maximum international executive presence.',
      '60-Minute Executive Strategy Coaching: A deep-dive professional consulting call to prep you for high-level international networking.',
      'Priority Support: Direct, confidential communication line with your dedicated executive writer.',
    ],
    revisionsText: 'Unlimited revisions for 30 days post-delivery.',
  },
];

export function getPricingTier(id: string): CvPricingTier | null {
  return CV_PRICING_TIERS.find((t) => t.id === id) ?? null;
}

export interface CvAddon {
  id: CvAddonId;
  name: string;
  description: string;
  priceKes: number;
}

export const CV_ADDONS: CvAddon[] = [
  {
    id: 'express_delivery',
    name: 'Express 24-Hour Delivery',
    description: 'Fast-track your global CV to the top of our writing queue.',
    priceKes: 2000,
  },
  {
    id: 'interview_prep',
    name: 'Global Interview Prep Masterclass',
    description: 'A realistic 1-hour mock interview session via Zoom tailored to US/UK corporate interviewing styles (STAR method coaching).',
    priceKes: 4500,
  },
  {
    id: 'bilingual_upgrade',
    name: 'Bi-Lingual CV Upgrade',
    description: 'Translation and cultural optimization for regional or multinational positions (English/French/German).',
    priceKes: 3500,
  },
];

export function getAddon(id: string): CvAddon | null {
  return CV_ADDONS.find((a) => a.id === id) ?? null;
}

/** Validates a raw list of addon ids against the real catalog and returns the authoritative
 * total price — never trust a client-supplied total, always recompute server-side from ids. */
export function resolveAddons(rawIds: string[]): { addons: CvAddonId[]; addonsTotalKes: number } {
  const valid = rawIds.filter((id): id is CvAddonId => CV_ADDONS.some((a) => a.id === id));
  const addonsTotalKes = valid.reduce((sum, id) => sum + (getAddon(id)?.priceKes ?? 0), 0);
  return { addons: valid, addonsTotalKes };
}

/** CV-order payment references are prefixed so the shared Paystack webhook can route them
 * separately from job-listing payment references without a metadata round-trip. */
export const CV_ORDER_REF_PREFIX = 'cv_';

export function isCvOrderReference(reference: string): boolean {
  return reference.startsWith(CV_ORDER_REF_PREFIX);
}

/** Draft data stays in KV — never in Supabase — until Paystack confirms payment. Auto-expires
 * if the customer never completes payment, so an abandoned order never needs manual cleanup. */
export const CV_DRAFT_TTL_SECONDS = 60 * 60 * 48;

function draftKey(reference: string): string {
  return reference;
}
function fileKey(reference: string): string {
  return `${reference}__file`;
}

export async function stageCvOrderDraft(reference: string, draft: CvOrderDraft, file: { bytes: Uint8Array; type: string } | null): Promise<void> {
  const env = getEnv();
  await env.CV_ORDER_DRAFTS.put(draftKey(reference), JSON.stringify(draft), { expirationTtl: CV_DRAFT_TTL_SECONDS });
  if (file) {
    await env.CV_ORDER_DRAFTS.put(fileKey(reference), file.bytes, { expirationTtl: CV_DRAFT_TTL_SECONDS });
  }
}

/**
 * Moves a paid order from the temporary KV draft into the real `cv_orders` table (uploading any
 * staged file to R2 first), then deletes the draft. Safe to call more than once for the same
 * reference — from both the webhook and the status-poll fallback — since it checks for an
 * already-promoted row first and is a no-op if the draft is already gone.
 */
export async function promoteCvOrderDraft(reference: string): Promise<void> {
  const env = getEnv();
  const admin = getSupabaseAdmin();

  const existing = await admin.from('cv_orders').select('id').eq('payment_reference', reference).maybeSingle();
  if (existing.data) return;

  const raw = await env.CV_ORDER_DRAFTS.get(draftKey(reference));
  if (!raw) return;
  const draft = JSON.parse(raw) as CvOrderDraft;

  let file_url: string | null = null;
  if (draft.file_name && draft.file_type) {
    const bytes = await env.CV_ORDER_DRAFTS.get(fileKey(reference), 'arrayBuffer');
    if (bytes) {
      const ext = draft.file_name.split('.').pop()?.toLowerCase() || 'pdf';
      const key = `cv-uploads/${crypto.randomUUID()}.${ext}`;
      await env.JOB_IMAGES.put(key, bytes, { httpMetadata: { contentType: draft.file_type } });
      file_url = `${env.PUBLIC_R2_PUBLIC_URL}/${key}`;
    }
  }

  const { error } = await admin.from('cv_orders').insert({
    status: 'new',
    path_type: draft.path_type,
    tier: draft.tier,
    addons: draft.addons,
    template_id: draft.template_id,
    contact_name: draft.contact_name,
    contact_phone: draft.contact_phone,
    contact_email: draft.contact_email,
    linkedin_url: draft.linkedin_url,
    portfolio_url: draft.portfolio_url,
    target_job: draft.target_job,
    cv_data: draft.cv_data,
    upload_notes: draft.upload_notes,
    upload_focus: draft.upload_focus,
    file_url,
    payment_reference: reference,
    payment_phone: draft.payment_phone,
  });
  // Unique index on payment_reference makes a concurrent duplicate insert (webhook + status
  // poll racing) fail harmlessly here rather than double-creating the order.
  if (error && error.code !== '23505') throw error;

  await env.CV_ORDER_DRAFTS.delete(draftKey(reference));
  if (draft.file_name) await env.CV_ORDER_DRAFTS.delete(fileKey(reference));
}

export function pathTypeLabel(pathType: CvOrderPathType): string {
  return pathType === 'form' ? 'Answered Questions' : 'Uploaded Existing CV';
}
