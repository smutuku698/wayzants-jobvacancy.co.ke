-- CV & Resume builder orders (/cv-builder/). Rows only ever get created by the service-role
-- client, and only after Paystack confirms payment — see src/lib/cv-orders.ts
-- (promoteCvOrderDraft). Before payment succeeds, submitted data lives only in the
-- CV_ORDER_DRAFTS Cloudflare KV namespace (temporary, TTL'd), never here — this table has no
-- public insert policy at all, unlike jobs/inquiries.
-- Run this once in the Supabase SQL editor.

create type cv_order_path_type as enum ('form', 'upload');
create type cv_order_tier as enum ('standard', 'professional', 'premium', 'executive');
create type cv_order_status as enum ('new', 'in_progress', 'delivered', 'archived');

create table cv_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status cv_order_status not null default 'new',
  path_type cv_order_path_type not null,
  tier cv_order_tier not null,
  addons jsonb not null default '[]'::jsonb,
  template_id text,
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null,
  linkedin_url text,
  portfolio_url text,
  target_job text,
  cv_data jsonb,
  upload_notes text,
  upload_focus jsonb,
  file_url text,
  payment_reference text not null,
  payment_phone text not null
);

create unique index cv_orders_payment_reference_idx on cv_orders (payment_reference);
create index cv_orders_status_idx on cv_orders (status);
create index cv_orders_created_at_idx on cv_orders (created_at desc);

alter table cv_orders enable row level security;
-- No grants/policies for anon or authenticated — every read and write goes through the
-- service-role admin client (bypasses RLS), matching how promoteCvOrderDraft() and
-- /admin/cv-orders/ both operate. Public clients cannot see or insert rows at all.
