import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiEnhancement } from '../../src/lib/types';
import type { LegacyLocalJob, LegacyRemoteJob } from './legacy-types';
import { decodeHtmlEntities, repairMojibake } from './text-utils';

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
  return {
    skills: e.skills ?? [],
    careerLevel: e.careerLevel ?? 'Not specified',
    kenyaSalaryEstimate: e.kenyaSalaryEstimate ?? '',
    metaDescription: repairMojibake(decodeHtmlEntities(e.metaDescription ?? '')),
    applicationTips: (e.applicationTips ?? []).map((t) => repairMojibake(decodeHtmlEntities(t))),
    kenyaContext: repairMojibake(decodeHtmlEntities(job.kenyaContext ?? '')),
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
    enhancementSource: 'legacy',
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
  return `You write concise, Kenya-localized job enhancement metadata for a Kenyan job board. Given this job, respond with ONLY a JSON object (no markdown fences) with keys: skills (string array, max 6), careerLevel (string, e.g. "Entry Level"/"Mid Level"/"Senior Level"), kenyaSalaryEstimate (string, e.g. "KES 80,000 - 150,000/month"), metaDescription (string, <=155 chars), applicationTips (string array, max 5), kenyaContext (1-2 sentence string with practical Kenya-market advice for this role).

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
    enhancementSource: 'template',
    enhancedAt: new Date().toISOString(),
  };
}

/** Used by the ongoing scrapers for jobs with no pre-existing enhancement data. Never throws — falls back to a template. */
export async function liveEnhance(supabase: SupabaseClient, job: EnhanceInput): Promise<AiEnhancement> {
  const normalized = normalizeTitle(job.title);

  const cached = await findCachedEnhancement(supabase, normalized, job.categorySlug);
  if (cached) return cached;

  const prompt = buildPrompt(job);
  for (const provider of [callOpenAI, callClaude, callPerplexity, callOpenRouter]) {
    try {
      const raw = await provider(prompt);
      if (!raw) continue;
      const parsed = parseEnhancementJson(raw);
      if (!parsed) continue;
      await saveToCache(supabase, normalized, job.categorySlug, { ...parsed, enhancementSource: 'ai', enhancedAt: new Date().toISOString() });
      return { ...parsed, enhancementSource: 'ai', enhancedAt: new Date().toISOString() };
    } catch {
      continue;
    }
  }

  return templateEnhancement(job);
}
