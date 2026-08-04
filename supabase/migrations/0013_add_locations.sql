-- Adds 3 more Kenyan town locations, requested for their SEO keyword value
-- ("jobs in kakamega", "jobs in meru", "jobs in naivasha") and, for Kakamega,
-- because the old site had a dedicated /jobs-in-kakamega page that's now
-- being 301-redirected here.

insert into locations (slug, name, region, is_remote, is_international, sort_order) values
  ('kakamega', 'Kakamega', 'Western', false, false, 11),
  ('meru', 'Meru', 'Eastern', false, false, 12),
  ('naivasha', 'Naivasha', 'Rift Valley', false, false, 13)
on conflict (slug) do nothing;
