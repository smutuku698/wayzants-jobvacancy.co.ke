-- Adds an 18th category for cruise ship crew jobs (Viking Cruises,
-- AllCruiseJobs.com, etc). Kept separate rather than folding into
-- hospitality-tourism-jobs since cruise roles are a genuinely distinct job
-- search (onboard placements abroad, not Kenya hospitality) — same rationale
-- as 0004's teaching-jobs-abroad split.

insert into job_categories (slug, name, description, sort_order) values
  ('cruise-ship-jobs', 'Cruise Ship Jobs', 'Crew and onboard positions on cruise ships worldwide — hospitality, culinary, deck, entertainment and more.', 18)
on conflict (slug) do nothing;
