-- JobVacancy.co.ke — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

create type job_type as enum ('full_time', 'part_time', 'contract', 'internship', 'volunteer');
create type application_method as enum ('email', 'url');
create type job_status as enum ('pending', 'approved', 'rejected', 'expired');

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table job_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Locations (Kenyan towns + remote/international)
-- ---------------------------------------------------------------------------
create table locations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  region text,
  is_remote boolean not null default false,
  is_international boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  company_name text not null,
  company_logo_url text,
  description text not null,
  category_id uuid not null references job_categories(id),
  location_id uuid not null references locations(id),
  job_type job_type not null default 'full_time',
  is_remote boolean not null default false,
  is_international boolean not null default false,
  salary_min integer,
  salary_max integer,
  salary_currency text not null default 'KES',
  application_method application_method not null,
  application_value text not null,
  deadline date,
  status job_status not null default 'pending',
  contact_name text,
  contact_email text not null,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  expires_at timestamptz,
  constraint international_must_be_remote check (not is_international or is_remote)
);

create index jobs_status_idx on jobs (status);
create index jobs_category_idx on jobs (category_id);
create index jobs_location_idx on jobs (location_id);
create index jobs_created_at_idx on jobs (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table job_categories enable row level security;
alter table locations enable row level security;
alter table jobs enable row level security;

grant usage on schema public to anon, authenticated;
grant select on job_categories to anon, authenticated;
grant select on locations to anon, authenticated;
grant select, insert on jobs to anon, authenticated;

create policy "Categories are publicly readable"
  on job_categories for select
  using (true);

create policy "Locations are publicly readable"
  on locations for select
  using (true);

create policy "Public can read approved, unexpired jobs"
  on jobs for select
  using (status = 'approved' and (expires_at is null or expires_at > now()));

-- Public job submissions always land as 'pending' — clients cannot self-approve.
create policy "Anyone can submit a job for review"
  on jobs for insert
  with check (status = 'pending');

-- No public update/delete policy: approve/reject/expire happens only via the
-- service-role key from the admin API routes, which bypasses RLS entirely.

-- ---------------------------------------------------------------------------
-- Seed: job categories
-- ---------------------------------------------------------------------------
insert into job_categories (slug, name, description, sort_order) values
  ('ngo-jobs', 'NGO Jobs', 'NGO and non-profit jobs in Kenya, including UN, INGO and local development organisations.', 1),
  ('teaching-jobs', 'Teaching Jobs', 'Teaching vacancies in primary schools, secondary schools, colleges and universities across Kenya.', 2),
  ('tsc-jobs', 'TSC Jobs', 'Teachers Service Commission (TSC) recruitment, internship and replacement teaching vacancies.', 3),
  ('government-jobs', 'Government Jobs', 'Public service, county government, parastatal and state corporation jobs in Kenya.', 4),
  ('internships-graduate-trainee', 'Internships & Graduate Trainee', 'Internship, attachment and graduate trainee programs for young professionals in Kenya.', 5),
  ('it-software-jobs', 'IT & Software Jobs', 'Software development, IT support, data and technology jobs in Kenya.', 6),
  ('sales-marketing-jobs', 'Sales & Marketing Jobs', 'Sales, marketing, business development and brand jobs in Kenya.', 7),
  ('accounting-finance-jobs', 'Accounting & Finance Jobs', 'Accounting, audit, banking and finance jobs in Kenya.', 8),
  ('admin-secretarial-jobs', 'Administration & Secretarial Jobs', 'Office administration, secretarial, receptionist and personal assistant jobs.', 9),
  ('healthcare-medical-jobs', 'Healthcare & Medical Jobs', 'Nursing, clinical, hospital and medical jobs in Kenya.', 10),
  ('engineering-construction-jobs', 'Engineering & Construction Jobs', 'Civil, electrical, mechanical engineering and construction jobs in Kenya.', 11),
  ('driving-logistics-jobs', 'Driving & Logistics Jobs', 'Driving, supply chain, warehouse and logistics jobs in Kenya.', 12),
  ('security-jobs', 'Security Jobs', 'Security guard, risk and safety jobs in Kenya.', 13),
  ('hospitality-tourism-jobs', 'Hospitality & Tourism Jobs', 'Hotel, restaurant, travel and tourism jobs in Kenya.', 14),
  ('customer-service-jobs', 'Customer Service Jobs', 'Call centre, customer support and client service jobs in Kenya.', 15),
  ('online-remote-jobs', 'Online & Remote Jobs', 'Remote and online jobs you can do from anywhere in Kenya.', 16);

-- ---------------------------------------------------------------------------
-- Seed: locations
-- ---------------------------------------------------------------------------
insert into locations (slug, name, region, is_remote, is_international, sort_order) values
  ('nairobi', 'Nairobi', 'Nairobi County', false, false, 1),
  ('mombasa', 'Mombasa', 'Coast', false, false, 2),
  ('kisumu', 'Kisumu', 'Nyanza', false, false, 3),
  ('eldoret', 'Eldoret', 'Rift Valley', false, false, 4),
  ('nakuru', 'Nakuru', 'Rift Valley', false, false, 5),
  ('thika', 'Thika', 'Central', false, false, 6),
  ('nyeri', 'Nyeri', 'Central', false, false, 7),
  ('machakos', 'Machakos', 'Eastern', false, false, 8),
  ('remote-online-kenya', 'Remote / Online (Kenya)', null, true, false, 9),
  ('international-remote', 'International (Remote)', null, true, true, 10);
