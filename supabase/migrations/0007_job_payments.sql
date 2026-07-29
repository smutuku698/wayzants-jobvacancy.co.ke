-- Paid job posting via M-Pesa (Paystack Charge API).
-- Every public submission now requires payment before it reaches the admin
-- approval queue; scraper/legacy-import rows (inserted straight to 'approved'
-- via the service-role client) are unaffected and keep payment_status='not_required'.

create type job_payment_status as enum ('not_required', 'pending', 'paid', 'failed');

alter table jobs
  add column pricing_tier text check (pricing_tier in ('5day', '14day')),
  add column payment_status job_payment_status not null default 'not_required',
  add column payment_reference text,
  add column payment_phone text,
  add column is_featured boolean not null default false,
  add column featured_until timestamptz;

create unique index jobs_payment_reference_idx on jobs (payment_reference) where payment_reference is not null;
create index jobs_featured_idx on jobs (is_featured, featured_until) where is_featured;
