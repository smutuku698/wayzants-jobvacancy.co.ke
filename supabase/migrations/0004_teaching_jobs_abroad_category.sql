-- Adds a 17th category, kept honestly separate from the Kenya-local
-- teaching-jobs/tsc-jobs categories: teaching_jobs_abroad_scraper /
-- indeed_teaching_jobs_scraper (see C:\Users\Atom\Documents\jobs-in-kenya-scrapper)
-- produce overseas placements (Saudi Arabia, US, etc.) for Kenyan teachers,
-- not local Kenya vacancies — mixing them into teaching-jobs would mislead
-- anyone landing there expecting a Kenya-based role.

insert into job_categories (slug, name, description, sort_order) values
  ('teaching-jobs-abroad', 'Teaching Jobs Abroad', 'International teaching placements for Kenyan teachers — schools in the Middle East, USA and beyond.', 17)
on conflict (slug) do nothing;
