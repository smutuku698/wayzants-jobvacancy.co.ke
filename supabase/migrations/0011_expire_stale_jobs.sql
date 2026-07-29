-- Free/scraped/imported jobs never got an explicit expiration date (only
-- paid listings set `expires_at`, via markJobPaymentPaid's 60-day window).
-- We want stale free listings to stop appearing in job search/listings after
-- a `deadline` passes, or after 90 days if no `deadline` was ever set — but
-- unlike the paid-listing `expires_at` cutoff (enforced today via RLS, which
-- makes the permalink 404 once it lapses), we deliberately do NOT want the
-- job's own detail page to 404. A 404 dead-ends anyone who already has the
-- URL bookmarked or indexed by Google; instead the detail page stays live
-- and renders a "closed" state (see jobs/[slug].astro), which is one of
-- Google's own documented options for handling an expired JobPosting.
--
-- So expiry is enforced in two different places instead of one blanket RLS
-- rule: this view (`active_jobs`) is what every LISTING query reads from
-- (search, category/location pages, related/featured jobs, the sitemap), so
-- expired jobs disappear from discovery surfaces immediately. The `jobs`
-- table itself keeps its original, permissive read policy so a job's own
-- permalink (`getJobBySlug`) can still fetch it after expiry and render the
-- closed state instead of a dead end.
drop policy if exists "Public can read approved, unexpired jobs" on jobs;

create policy "Public can read approved jobs"
  on jobs for select
  using (status = 'approved');

create or replace view active_jobs as
select *
from jobs
where status = 'approved'
  and (expires_at is null or expires_at > now())
  and (
    case
      when deadline is not null then deadline >= current_date
      else created_at > now() - interval '90 days'
    end
  );

grant select on active_jobs to anon, authenticated;
