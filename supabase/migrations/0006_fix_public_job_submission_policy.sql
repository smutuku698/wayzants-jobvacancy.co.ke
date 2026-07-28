-- Re-applies the public job-submission INSERT policy on `jobs`.
--
-- Found while QA-testing the /post-a-job/ form: a real submission through the
-- live anon key fails with Postgres error 42501 ("new row violates row-level
-- security policy for table jobs"), even though the submitted row satisfies
-- `status = 'pending'` (the column default, since the form never sets status).
-- This means the INSERT policy currently active on the live table does not
-- match 0001_init.sql — likely drift from a manual change in the Supabase
-- dashboard. Re-running this (idempotent: drop + recreate) restores the
-- intended policy without guessing at what changed.
--
-- Run this once in the Supabase SQL editor.

drop policy if exists "Anyone can submit a job for review" on jobs;

create policy "Anyone can submit a job for review"
  on jobs for insert
  to anon, authenticated
  with check (status = 'pending');

-- Table-level grant is required in addition to the policy — re-assert in case
-- this also drifted.
grant insert on jobs to anon, authenticated;
