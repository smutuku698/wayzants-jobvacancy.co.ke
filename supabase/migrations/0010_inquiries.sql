-- "Work With Us" footer widget — public inquiries (comment / partnership /
-- sponsorship / advertising). Insert-only from the public; only the
-- service-role admin client (used by /admin/inquiries/) reads or updates rows.
-- Run this once in the Supabase SQL editor.

create type inquiry_type as enum ('comment', 'partnership', 'sponsorship', 'advertising');
create type inquiry_status as enum ('new', 'read', 'archived');

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  type inquiry_type not null,
  name text not null,
  email text not null,
  company text,
  message text not null,
  status inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create index inquiries_status_idx on inquiries (status);
create index inquiries_created_at_idx on inquiries (created_at desc);

alter table inquiries enable row level security;

grant insert on inquiries to anon, authenticated;

-- Public submissions always land as 'new' — clients cannot self-mark as
-- read/archived, and there is no public select policy, so submitted rows are
-- only ever readable via the service-role admin client.
create policy "Anyone can submit an inquiry"
  on inquiries for insert
  to anon, authenticated
  with check (status = 'new');
