-- Catch-all category/location options so posters aren't blocked when their
-- role or town doesn't fit the existing fixed taxonomy. Paired with free-text
-- custom_category_label/custom_location_label columns on jobs, which are
-- shown instead of the generic option name wherever the category/location is
-- displayed publicly, and double as a signal for which new formal
-- categories/locations are worth adding later once enough cluster together.
--
-- The location option is explicitly labeled "Another location in Kenya"
-- (not a generic "Other") and kept non-remote/non-international, so it can't
-- be confused with the existing Remote/International location rows — this
-- is specifically for a real Kenyan town just not in the fixed list of 8.

insert into job_categories (slug, name, description, sort_order) values
  ('other', 'Other', 'Roles that do not fit our existing categories.', 999)
on conflict (slug) do nothing;

insert into locations (slug, name, region, is_remote, is_international, sort_order) values
  ('other-kenya-location', 'Another location in Kenya', null, false, false, 999)
on conflict (slug) do nothing;

alter table jobs
  add column custom_category_label text,
  add column custom_location_label text;
