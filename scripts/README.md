# Scrapers & AI enhancement

Ongoing scrapers that write straight into Supabase (`jobs` table), safe to rerun on a
schedule — each upserts on `source_url` so re-running never creates duplicates.

| Script | Sources | DB category |
| :-- | :-- | :-- |
| `scrape-local-jobs.ts` | Brites Management (britesmanagement.com) | keyword-mapped across all 16 local categories |
| `scrape-remote-jobs.ts` | WeWorkRemotely, Remotive, RemoteOK, Arbeitnow | `online-remote-jobs` |
| `scrape-ngo-jobs.ts` | NGOJobsInAfrica, ReliefWeb | `ngo-jobs` |
| `scrape-cruise-jobs.ts` | AllCruiseJobs.com | `cruise-ship-jobs` |
| `scrape-teaching-abroad-jobs.ts` | Teaching Abroad Direct | `teaching-jobs-abroad` |

Run with `npx tsx scripts/<script>.ts`. All support `--dry-run` (prints what would be
written, writes nothing) and `--limit=N`.

`import-legacy-jobs.ts` is a one-time historical import (not a recurring scraper). Sources:
`local`, `remote`, `ngo` (the ~5,200 jobs carried over from the old Next.js site's flat JSON
files) plus a capped 50-job seed each for `cruise` and `teaching-abroad` from a separate
legacy Python scraper repo (`C:\Users\Atom\Documents\jobs-in-kenya-scrapper`) — capped
deliberately (not the full ~2-300 jobs available per source) so historical data doesn't
dwarf what the ongoing scrapers add; per-source with `--only=<source>`. Not meant to be
rerun for a given source once it's landed.

### cruise-ship-jobs — sources and what's not ported

The legacy Python scraper had two cruise sources: **Viking Cruises' own careers site**
(requires Selenium — the listing page is JS-rendered, no server HTML) and
**AllCruiseJobs.com** (plain HTML, no JS needed). Only AllCruiseJobs.com is ported as an
ongoing scraper (`scrape-cruise-jobs.ts`, `lib/cruise-sources.ts`) — this project has no
headless-browser dependency, so Viking isn't scraped live; its jobs live on in the
historical seed only. If Viking coverage matters going forward, that requires adding
Playwright (or similar) to the project first — a deliberate decision, not done by default.

Job listing pages only expose title/id — `fetchCruiseJobDetails()` fetches each new job's
own page for the real employer/description (parsed from the page's own JSON-LD
`JobPosting` structured data, not blind CSS-class guessing — allcruisejobs.com's
description container also holds an embedded `<script>` block as a text-node sibling that
a blind `.text()` selector would vacuum up). Only called for genuinely new jobs, same
cost-consciousness as AI enhancement.

### teaching-jobs-abroad — sources, live and not

The legacy scraper's original four sources are all dead ends for this project's plain-fetch
stack: ACSI and Indeed needed Selenium from the start (never ported); Edvectus moved its
listings to `app.edvectus.com`, now a pure client-rendered SPA (no server HTML — same
blocker as Viking); TeachAway upgraded its Next.js build, and job data now lives inside React
Server Components' internal streaming wire format instead of a plain `__NEXT_DATA__` script
tag — technically extractable, but only by parsing an undocumented internal protocol that can
silently break on any TeachAway deploy. None of the four are a stable scraper foundation
today. The 50-job Edvectus historical seed (`import-legacy-jobs.ts --only=teaching-abroad`)
still ships, but is frozen — no live updates from Edvectus.

The **live ongoing scraper** (`scrape-teaching-abroad-jobs.ts`, `lib/teaching-abroad-sources.ts`)
instead uses **Teaching Abroad Direct** (teachingabroaddirect.co.uk) — plain server-rendered
HTML, confirmed live, real current listings across the Middle East and Asia. It deliberately
scrapes the site's own unfiltered global `/teaching-jobs` listing rather than a per-country
page — no hardcoded country list to maintain; whatever countries the site posts (Qatar, UAE,
Singapore, Brazil, ...) flow through as-is. The site's own JSON-LD `JobPosting` blocks
sometimes contain raw ASCII control characters inside string values (invalid JSON, stripped
before parsing) and the page content itself has a distinct mojibake bug — UTF-8 bytes
misread as Windows-1252 rather than Latin-1, so punctuation shows up as extra visible glyphs
(e.g. `â€"` for an en dash) instead of invisible control characters. `repairMojibake()` in
`lib/text-utils.ts` now handles both variants — it's a shared utility used by every scraper,
so this fix applies project-wide, not just to this one source.

School/employer names aren't reliably available (the site's own JSON-LD always lists
"Teaching Abroad Direct", the recruiting agency, as `hiringOrganization`) — `guessSchoolFromTitle()`
parses the real school out of the job title itself when the title has a 3-part
"Role – School – Location" pattern, falling back to "Teaching Abroad Direct" otherwise.

## Content depth — five extra sections beyond the basics

`AiEnhancement` (`src/lib/types.ts`) carries five optional paragraph fields beyond skills/salary/
tips — `jobSummary`, `companyInsights`, `careerGrowth`, `workEnvironment`, `benefits`,
`marketContext` — rendered as their own headed sections on the job detail page
(`Company Insights`, `Work Environment & Culture`, `Career Growth & Development`,
`Benefits & Compensation`, `Market Context & Industry Insights`), each hidden individually
when empty. This exists because the old Next.js site's detail pages had this depth (real
paragraph content per section) and this project's version had thinned it down to a single
1-2 sentence "Kenya Context" blurb — genuinely thin content, bad for both readers and Google
indexing. Populated from three places, so it applies to every job on the site:
- **Historical local-jobs.json import** (`deriveEnhancementFromLocalJob`) — the old Brites
  Management pipeline's own rich prose (company_insights/career_growth/work_environment/
  benefits/market_context) is carried straight over.
- **Historical remote/NGO import** (`remapLegacyEnhancement`) — carries over `jobSummary`,
  folds `relatedSkills` into the skills cloud, and appends `careerLevelYears`/
  `estimatedSalaryUSD` onto their respective fields. (`jobSummary` sometimes embedded a raw,
  uncleaned company name from the old site's data — swapped for the row's own cleaned
  `company_name` before storing.)
- **Live scraping going forward** (`buildPrompt`/`parseEnhancementJson` in `ai-enhance.ts`) —
  the AI prompt now asks for all five paragraph fields directly, and `template-fallbacks.ts`'s
  `EXTRA_CONTEXT` map provides category-specific fallback paragraphs (careerGrowth/
  workEnvironment/benefits/marketContext) for when no AI provider is available.
  `companyInsights` is deliberately template-fallback-only-omitted — a template has no real
  information about the specific employer, so inventing generic "insights" would be filler,
  not genuine content.

## AI enhancement — always at scrape time, never at render

Every scraper calls `liveEnhance()` (`scripts/lib/ai-enhance.ts`) **once, while scraping**,
and writes the result into the job row's `ai_enhancement` JSONB column. Job detail pages
only ever *read* that column — they never call enhancement logic themselves.

```
scrape → liveEnhance() → write ai_enhancement into the Supabase row → detail page reads it
```

`liveEnhance()` resolution order, cheapest first:
1. **Cache** (`ai_enhancement_cache` table) — reuses a prior enhancement for a
   near-identical title (token-overlap ≥ 0.6) within the same category, no API call.
2. **AI** — tries OpenAI → Claude → Perplexity → OpenRouter in order, first one that
   returns a parseable response wins. Result is saved to the cache for future reuse.
3. **Template fallback** (`template-fallbacks.ts`) — if every provider fails or no API
   key is set, generates a category-aware fallback from `sourceCategory` (the scraper's
   old-style function category — Finance/Management/Healthcare/etc, *not* the DB
   `category_id`, which stays fixed per scraper). Never throws.

**Why scrape-time, not render-time:** render-time enhancement would call an LLM on every
page view/rebuild instead of once per job, and it breaks the cache's reuse-by-title design,
which only works if enhancement happens at write time. The `ai_enhancement` payload itself
is small (a handful of short strings) — it's not a meaningful driver of Supabase usage, so
that's not a reason to defer it to render either. **This is a hard rule — do not add
render-time enhancement calls.**

### Abroad placements (cruise-ship-jobs, teaching-jobs-abroad) get a special enhancement pass

Both categories are paid in foreign currency, not KES — the job detail page's "Kenya Salary
Estimate" heading is fixed (design-frozen `.astro`), so a real foreign-currency figure there
would just read as mismatched. `liveEnhance()` in `lib/ai-enhance.ts` detects these two
category slugs and, regardless of whether the result came from cache, a live AI call, or the
template fallback: blanks `kenyaSalaryEstimate` (the section just doesn't render, rather than
showing a wrong-looking KES figure) and overrides `kenyaContext` with fixed, genuinely useful
abroad-relocation advice (visa/work-permit, contract terms, compensation-in-writing) instead
of Kenya-local-market framing. The AI prompt itself is also branched for these categories so
a fresh AI call doesn't need the override in the first place — the post-processing pass exists
as a guarantee for cache hits and template fallback, not as the only fix.

### Wiring a new scraper into this

1. Give each scraped job an old-style function category via a `mapCategory(title, description)`
   helper (see `lib/ngo-sources.ts` for the pattern) — this feeds the template fallback,
   not the DB `category_id`.
2. In the scraper's main loop, call:
   ```ts
   row.ai_enhancement = await liveEnhance(supabase, {
     title: job.title,
     company: job.company,
     description: job.description,
     categorySlug: <FIXED_DB_CATEGORY_SLUG>,
     sourceCategory: job.category,
   });
   ```
   only for genuinely new rows (`isNew` — skip on updates to avoid re-paying for
   enhancement on every rerun).
3. Nothing else changes — the detail page already reads `ai_enhancement` generically.
