-- JobVacancy.co.ke — legacy data import + AI enhancement support
-- Additive only: existing columns/tables/policies are untouched.
-- Run this once in the Supabase SQL editor (or via `supabase db push`), after 0001_init.sql.

-- ---------------------------------------------------------------------------
-- jobs: provenance + AI enhancement columns
-- ---------------------------------------------------------------------------
alter table jobs add column if not exists source_url text;
alter table jobs add column if not exists source text;
alter table jobs add column if not exists ai_enhancement jsonb;

-- Dedup key for scraped jobs (upsert target). Not partial — Supabase/PostgREST's
-- upsert issues a plain `ON CONFLICT (source_url)`, which requires a plain
-- index to match against. Standard SQL treats every NULL as distinct, so
-- manually-posted jobs (which never set source_url) still coexist fine.
create unique index if not exists jobs_source_url_key on jobs (source_url);

create index if not exists jobs_source_idx on jobs (source);

-- ---------------------------------------------------------------------------
-- AI enhancement reuse cache — avoids re-paying for near-duplicate job titles.
-- Postgres-native replacement for the old site's enhancement-knowledge-base.json.
-- ---------------------------------------------------------------------------
create table if not exists ai_enhancement_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_title text not null,
  category_slug text not null,
  payload jsonb not null,
  times_reused integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_enhancement_cache_lookup_idx
  on ai_enhancement_cache (category_slug, normalized_title);

-- Service-role only: scripts run with the service-role key and bypass RLS
-- entirely, same as the admin approve/reject routes. No public policies needed.
alter table ai_enhancement_cache enable row level security;
