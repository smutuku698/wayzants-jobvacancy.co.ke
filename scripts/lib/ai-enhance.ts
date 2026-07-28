import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiEnhancement } from '../../src/lib/types';
import type { LegacyLocalJob, LegacyRemoteJob, LegacyCruiseJob, LegacyTeachingAbroadJob } from './legacy-types';
import { CRUISE_CATEGORY_SLUG, TEACHING_ABROAD_CATEGORY_SLUG } from './category-mapping';

// Cruise-ship and teaching-abroad jobs are paid in foreign currency, not KES
// — the job detail page's "Kenya Salary Estimate" heading is fixed (design-
// frozen), so a real foreign-currency figure would read as a mismatched/wrong
// label instead of just an odd one; a blank estimate lets that section hide
// itself (the page already skips rendering when this is empty).
const ABROAD_PLACEMENT_CATEGORY_SLUGS = new Set([CRUISE_CATEGORY_SLUG, TEACHING_ABROAD_CATEGORY_SLUG]);
import { decodeHtmlEntities, repairMojibake, cleanCompanyName } from './text-utils';
import { generateTemplateFallback } from './template-fallbacks';

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(a.split(' ').filter(Boolean));
  const bTokens = new Set(b.split(' ').filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let shared = 0;
  for (const t of aTokens) if (bTokens.has(t)) shared += 1;
  return shared / Math.max(aTokens.size, bTokens.size);
}

// --- Direct carry-over for the two legacy datasets that already shipped with
// AI/template-generated enhancement data from the old site's own pipeline ---
// (see ARCHITECTURE.md in the old project) — no API calls needed for these.
export function remapLegacyEnhancement(job: LegacyRemoteJob): AiEnhancement | null {
  if (!job.enhancement) return null;
  const e = job.enhancement;
  // relatedSkills was a separate list in the old shape — folded into the one
  // skills cloud here rather than adding yet another heading for it.
  const skills = [...(e.skills ?? []), ...(e.relatedSkills ?? [])];
  const careerLevel = [e.careerLevel, e.careerLevelYears].filter(Boolean).join(' — ') || 'Not specified';
  const kenyaSalaryEstimate = [e.kenyaSalaryEstimate, e.estimatedSalaryUSD && `(approx. ${e.estimatedSalaryUSD})`].filter(Boolean).join(' ');
  // jobSummary is a pre-written sentence from the old site's own pipeline
  // that sometimes embeds the raw, uncleaned company field (e.g. a multi-line
  // document-header dump like "One Acre Fund\nFounded in...") — swap in the
  // same cleaned name the row's own company_name column uses, so the two
  // don't visibly disagree on the page.
  const cleanedCompany = cleanCompanyName(job.company);
  const jobSummary = (e.jobSummary ?? '').replace(job.company, cleanedCompany);
  return {
    skills,
    careerLevel,
    kenyaSalaryEstimate,
    metaDescription: repairMojibake(decodeHtmlEntities(e.metaDescription ?? '')),
    applicationTips: (e.applicationTips ?? []).map((t) => repairMojibake(decodeHtmlEntities(t))),
    kenyaContext: repairMojibake(decodeHtmlEntities(job.kenyaContext ?? '')),
    jobSummary: repairMojibake(decodeHtmlEntities(jobSummary)) || undefined,
    enhancementSource: 'legacy',
    enhancedAt: job.enhancementMetadata?.timestamp ?? job.pubDate,
  };
}

// --- local-jobs.json already carries rich, hand/AI-written Kenya-localized
// paragraphs per job (market_context, career_growth, benefits, etc.) from the
// old Brites Management pipeline — synthesize the same structured shape from
// those instead of paying for fresh AI calls on data that's already good. ---
export function deriveEnhancementFromLocalJob(job: LegacyLocalJob): AiEnhancement {
  const skills = (job.key_requirements_skills_qualification ?? '')
    .split('\n')
    .map((l) => l.replace(/^[-•\s]+/, '').trim())
    .filter((l) => l.length > 0 && l.length < 80)
    .slice(0, 6);

  const applicationTips = (job.application_tips ?? '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 5);

  const metaDescription = `${job.job_title} at a company in ${job.job_location}, Kenya. ${job.salary ? `Salary: ${job.salary}. ` : ''}Apply now on JobVacancy.co.ke.`.slice(
    0,
    155
  );

  return {
    skills,
    careerLevel: 'Not specified',
    kenyaSalaryEstimate: job.salary ?? '',
    metaDescription,
    applicationTips,
    kenyaContext: job.market_context ?? job.company_insights ?? '',
    companyInsights: job.company_insights || undefined,
    careerGrowth: job.career_growth || undefined,
    workEnvironment: job.work_environment || undefined,
    benefits: job.benefits || undefined,
    marketContext: job.market_context || undefined,
    enhancementSource: 'legacy',
    enhancedAt: new Date().toISOString(),
  };
}

function splitIntoTips(text: string | undefined): string[] {
  return (text ?? '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
    .slice(0, 5);
}

// --- cruise_ship_jobs_scraper's enhanced_cruise_jobs_*.json already carries
// rich prose fields (company_insights, career_growth, etc) from its own
// OpenAI-based enhancer — synthesize the same AiEnhancement shape instead of
// paying for a fresh AI call on data that's already good. No Kenya salary
// data exists for these (foreign-currency onboard pay), so that field is
// left for the reader to check with the employer. ---
export function deriveEnhancementFromCruiseJob(job: LegacyCruiseJob): AiEnhancement {
  return {
    skills: [],
    careerLevel: 'Not specified',
    kenyaSalaryEstimate: '',
    metaDescription: `${job.title} — cruise ship crew position. Apply now on JobVacancy.co.ke.`.slice(0, 155),
    applicationTips: splitIntoTips(job.application_tips),
    kenyaContext: job.market_context ?? job.company_insights ?? '',
    companyInsights: job.company_insights || undefined,
    careerGrowth: job.career_growth || undefined,
    workEnvironment: job.work_environment || undefined,
    benefits: job.benefits || undefined,
    marketContext: job.market_context || undefined,
    enhancementSource: 'legacy',
    enhancedAt: job.scraped_at ?? new Date().toISOString(),
  };
}

// --- teaching_jobs_abroad_scraper's enhanced_teaching_jobs_*.json carries
// its own rich prose fields (about_teaching_abroad, career_benefits, etc) —
// same rationale as deriveEnhancementFromCruiseJob above. ---
export function deriveEnhancementFromTeachingAbroadJob(job: LegacyTeachingAbroadJob): AiEnhancement {
  return {
    skills: [],
    careerLevel: 'Not specified',
    kenyaSalaryEstimate: '',
    metaDescription: `${job.title}${job.location ? ` in ${job.location}` : ''} — international teaching placement. Apply now on JobVacancy.co.ke.`.slice(0, 155),
    applicationTips: splitIntoTips(job.application_advice),
    kenyaContext: job.regional_insight ?? job.about_teaching_abroad ?? '',
    companyInsights: job.about_teaching_abroad || undefined,
    careerGrowth: job.career_benefits || undefined,
    workEnvironment: job.lifestyle_benefits || undefined,
    benefits: job.package_highlights || undefined,
    marketContext: job.regional_insight || undefined,
    enhancementSource: 'legacy',
    enhancedAt: job.posted_date ?? new Date().toISOString(),
  };
}

const GENERIC_APPLICATION_TIPS = [
  'Tailor your CV to highlight experience relevant to this specific role.',
  'Include your contact details and a professional email address.',
  'Follow the application instructions exactly as listed.',
  'Double-check your CV for typos before sending.',
];

/**
 * Freshly-scraped local jobs (unlike the historical local-jobs.json) don't
 * have the rich market_context/application_tips prose an earlier AI-rewriting
 * pass added — but they do have real duties/requirements text worth mining,
 * so this still beats the fully-generic fallback used when no source
 * category is available at all (see templateEnhancement in this file).
 */
export function deriveEnhancementFromFreshLocalJob(job: {
  job_title: string;
  job_location: string;
  salary: string;
  key_requirements_skills_qualification: string;
}): AiEnhancement {
  const skills = job.key_requirements_skills_qualification
    .split('\n')
    .map((l) => l.replace(/^[-•\s]+/, '').trim())
    .filter((l) => l.length > 0 && l.length < 80)
    .slice(0, 6);

  return {
    skills,
    careerLevel: 'Not specified',
    kenyaSalaryEstimate: job.salary || 'Salary not specified — inquire with employer',
    metaDescription: `${job.job_title} in ${job.job_location}, Kenya. ${job.salary ? `Salary: ${job.salary}. ` : ''}Apply now on JobVacancy.co.ke.`.slice(0, 155),
    applicationTips: GENERIC_APPLICATION_TIPS,
    kenyaContext: `This role is based in ${job.job_location}, Kenya — check typical local salary ranges before negotiating an offer.`,
    enhancementSource: 'template',
    enhancedAt: new Date().toISOString(),
  };
}

// --- Live enhancement for genuinely new jobs (used by the ongoing scrapers,
// not the historical import) — multi-provider fallback chain with a Postgres-
// backed reuse cache, mirroring the old site's cost-saving design. ---

interface EnhanceInput {
  title: string;
  company: string;
  description: string;
  categorySlug: string;
  /** The source's own old-style function category (Programming, Finance, Marketing...), when available — picks a richer, category-specific template fallback instead of the generic one. */
  sourceCategory?: string;
}

interface CacheRow {
  id: string;
  normalized_title: string;
  payload: AiEnhancement;
  times_reused: number;
}

async function findCachedEnhancement(
  supabase: SupabaseClient,
  normalizedTitle: string,
  categorySlug: string
): Promise<AiEnhancement | null> {
  const { data, error } = await supabase
    .from('ai_enhancement_cache')
    .select('id, normalized_title, payload, times_reused')
    .eq('category_slug', categorySlug)
    .limit(200);
  if (error || !data) return null;

  const rows = data as unknown as CacheRow[];
  let best: CacheRow | null = null;
  let bestScore = 0;
  for (const row of rows) {
    const score = tokenOverlap(normalizedTitle, row.normalized_title);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  if (!best || bestScore < 0.6) return null;

  await supabase
    .from('ai_enhancement_cache')
    .update({ times_reused: best.times_reused + 1 })
    .eq('id', best.id);

  return { ...best.payload, enhancementSource: 'cache', enhancedAt: new Date().toISOString() };
}

async function saveToCache(supabase: SupabaseClient, normalizedTitle: string, categorySlug: string, payload: AiEnhancement) {
  await supabase.from('ai_enhancement_cache').insert({ normalized_title: normalizedTitle, category_slug: categorySlug, payload });
}

function buildPrompt(job: EnhanceInput): string {
  const isAbroad = ABROAD_PLACEMENT_CATEGORY_SLUGS.has(job.categorySlug);
  const salaryInstruction = isAbroad
    ? 'kenyaSalaryEstimate (string — this role is paid in foreign currency, not KES, so leave this as an empty string "")'
    : 'kenyaSalaryEstimate (string, e.g. "KES 80,000 - 150,000/month")';
  const contextInstruction = isAbroad
    ? 'kenyaContext (1-2 sentence string with practical advice for a Kenyan applicant relocating abroad for this specific role — visa/work-permit process, what to verify before accepting, cultural/logistics tips — NOT local Kenya salary or market context, since this job is not in Kenya)'
    : 'kenyaContext (1-2 sentence string with practical Kenya-market advice for this role)';

  return `You write concise job enhancement metadata for a Kenyan job board. Given this job, respond with ONLY a JSON object (no markdown fences) with keys: skills (string array, max 6), careerLevel (string, e.g. "Entry Level"/"Mid Level"/"Senior Level"), ${salaryInstruction}, metaDescription (string, <=155 chars), applicationTips (string array, max 5), ${contextInstruction}, jobSummary (2-3 sentence plain-language overview of the role), companyInsights (2-3 sentence paragraph about the employer/organisation, inferred from the description — what they do, their scale/reputation if apparent), careerGrowth (2-3 sentence paragraph on typical career progression from this kind of role), workEnvironment (2-3 sentence paragraph on the likely day-to-day work environment and culture for this role), benefits (2-3 sentence paragraph on likely benefits/compensation beyond base salary for this kind of role — be honest if the description doesn't specify any, keep it general), marketContext (2-3 sentence paragraph on demand/outlook for this kind of role). All the paragraph fields should be genuinely informative, not generic filler — ground them in the actual title/description given.

Title: ${job.title}
Company: ${job.company}
Category: ${job.categorySlug}
Description: ${job.description.slice(0, 1500)}`;
}

function parseEnhancementJson(raw: string): Omit<AiEnhancement, 'enhancementSource' | 'enhancedAt'> | null {
  try {
    const jsonText = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonText);
    if (!parsed.skills || !parsed.metaDescription) return null;
    return {
      skills: parsed.skills ?? [],
      careerLevel: parsed.careerLevel ?? 'Not specified',
      kenyaSalaryEstimate: parsed.kenyaSalaryEstimate ?? '',
      metaDescription: String(parsed.metaDescription).slice(0, 160),
      applicationTips: parsed.applicationTips ?? [],
      kenyaContext: parsed.kenyaContext ?? '',
      jobSummary: parsed.jobSummary || undefined,
      companyInsights: parsed.companyInsights || undefined,
      careerGrowth: parsed.careerGrowth || undefined,
      workEnvironment: parsed.workEnvironment || undefined,
      benefits: parsed.benefits || undefined,
      marketContext: parsed.marketContext || undefined,
    };
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.4 }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

async function callClaude(prompt: string): Promise<string | null> {
  const key = process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { text?: string }[] };
  return data.content?.[0]?.text ?? null;
}

async function callPerplexity(prompt: string): Promise<string | null> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

async function callOpenRouter(prompt: string): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

function templateEnhancement(job: EnhanceInput): AiEnhancement {
  if (job.sourceCategory) {
    const fallback = generateTemplateFallback({ title: job.title, company: job.company, description: job.description, sourceCategory: job.sourceCategory });
    return { ...fallback, enhancementSource: 'template', enhancedAt: new Date().toISOString() };
  }

  // No old-style source category to key a rich template off (e.g. local
  // Brites Management jobs) — generic fallback.
  return {
    skills: [],
    careerLevel: 'Not specified',
    kenyaSalaryEstimate: 'Salary not specified — inquire with employer',
    metaDescription: `${job.title} at ${job.company}. Apply now on JobVacancy.co.ke.`.slice(0, 155),
    applicationTips: [
      'Tailor your CV to highlight experience relevant to this specific role.',
      'Follow the application instructions exactly as listed.',
      'Double-check your CV for typos before sending.',
    ],
    kenyaContext: 'Research typical salary ranges for this role in Kenya before negotiating an offer.',
    jobSummary: `${job.company} is hiring for a ${job.title} position. Review the full listing below for the exact requirements and how to apply.`,
    careerGrowth: 'Roles like this typically offer room to grow into more senior positions with experience, added responsibility, and a track record of strong performance.',
    workEnvironment: 'Day-to-day expectations vary by employer — review the listing for specifics on schedule, location and team structure, and don’t hesitate to ask during the interview.',
    marketContext: 'Demand for this kind of role fluctuates with the wider economy — a well-tailored application that speaks directly to the listed requirements gives you the best chance.',
    enhancementSource: 'template',
    enhancedAt: new Date().toISOString(),
  };
}

const ABROAD_APPLICATION_CONTEXT =
  'Confirm the visa/work-permit sponsorship, contract length and repatriation terms in writing before accepting — and get the full compensation package (housing, flights, insurance) in writing too, since it varies a lot by employer.';

/**
 * Applied to every enhancement this function returns, regardless of source
 * (cache/AI/template) — a cached or AI-generated result can still carry a
 * Kenya-salary framing if it predates this fix or an AI provider ignores the
 * prompt instruction, so this is the one place that's guaranteed to catch it.
 */
function normalizeForCategory(enhancement: AiEnhancement, categorySlug: string): AiEnhancement {
  if (!ABROAD_PLACEMENT_CATEGORY_SLUGS.has(categorySlug)) return enhancement;
  return {
    ...enhancement,
    kenyaSalaryEstimate: '',
    kenyaContext: ABROAD_APPLICATION_CONTEXT,
  };
}

/** Used by the ongoing scrapers for jobs with no pre-existing enhancement data. Never throws — falls back to a template. */
export async function liveEnhance(supabase: SupabaseClient, job: EnhanceInput): Promise<AiEnhancement> {
  const normalized = normalizeTitle(job.title);

  const cached = await findCachedEnhancement(supabase, normalized, job.categorySlug);
  if (cached) return normalizeForCategory(cached, job.categorySlug);

  const prompt = buildPrompt(job);
  for (const provider of [callOpenAI, callClaude, callPerplexity, callOpenRouter]) {
    try {
      const raw = await provider(prompt);
      if (!raw) continue;
      const parsed = parseEnhancementJson(raw);
      if (!parsed) continue;
      await saveToCache(supabase, normalized, job.categorySlug, { ...parsed, enhancementSource: 'ai', enhancedAt: new Date().toISOString() });
      return normalizeForCategory({ ...parsed, enhancementSource: 'ai', enhancedAt: new Date().toISOString() }, job.categorySlug);
    } catch {
      continue;
    }
  }

  return normalizeForCategory(templateEnhancement(job), job.categorySlug);
}
