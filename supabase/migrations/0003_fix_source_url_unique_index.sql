-- Fixes the partial unique index from 0002: Supabase/PostgREST's upsert
-- (`.upsert(row, { onConflict: 'source_url' })`) issues a plain
-- `ON CONFLICT (source_url) DO UPDATE`, which Postgres can't resolve against a
-- *partial* index (`where source_url is not null`) — it needs an index whose
-- predicate matches the conflict target exactly, and PostgREST doesn't let the
-- client express that predicate. A plain (non-partial) unique index works
-- fine here anyway: standard SQL treats every NULL as distinct from every
-- other NULL, so manually-submitted jobs (which never set source_url) can
-- still coexist without tripping the constraint.

drop index if exists jobs_source_url_key;

create unique index if not exists jobs_source_url_key on jobs (source_url);
