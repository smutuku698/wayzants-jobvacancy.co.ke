// Port of the Brites Management Python scraper (job_scraper.py, from the
// user's private jobs-in-kenya-scraper repo) to TypeScript/cheerio. Same
// field-extraction regexes, same fixed how-to-apply text, same dedup
// improvement as before (real job URL as source_url instead of a content
// hash). The listing URL itself needed updating: the site has since moved
// from `/jobs?start=N` (which the original scraper used — that path now
// serves an empty header-template stub, not real listings) to `/all-jobs/`,
// an Elementor/JetEngine grid that shows the latest 30 postings with an
// AJAX "Load More" button for anything beyond that. Reverse-engineering that
// AJAX endpoint wasn't worth it for a *recurring* scraper — the latest-30
// window naturally rotates in new postings every run, the same "recency
// window" approach the remote/NGO sources already use.

import * as cheerio from 'cheerio';
import { LOCAL_JOBS_APPLY_EMAIL } from './category-mapping';

export interface LocalJobListing {
  job_title: string;
  date: string;
  nature_of_job: string;
  industry: string;
  salary: string;
  job_location: string;
  job_summary: string;
  duties_and_responsibilities: string;
  key_requirements_skills_qualification: string;
  how_to_apply: string;
  url: string;
}

const LISTING_URL = 'https://www.britesmanagement.com/all-jobs/';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractField(content: string, pattern: RegExp): string {
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? '';
}

async function collectJobLinks(): Promise<string[]> {
  try {
    const response = await fetch(LISTING_URL, { headers: HEADERS });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const links = new Set<string>();
    $('a[href*="/jobs/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && /\/jobs\/[a-z0-9-]+\/?$/i.test(href)) links.add(href);
    });
    return [...links];
  } catch (err) {
    console.error('Failed to fetch job listing page:', err);
    return [];
  }
}

async function scrapeJobPage(url: string): Promise<LocalJobListing | null> {
  try {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);
    const content = $('body').text();

    const job_title = extractField(content, /JOB TITLE\s*\n\s*([^\n]+)/i);
    if (!job_title) return null;

    const summary = content.match(/JOB SUMMARY\s*\n([\s\S]*?)(?=DUTIES AND RESPONSIBILITIES|KEY REQUIREMENT|$)/i);
    const duties = content.match(/DUTIES AND RESPONSIBILITIES\s*\n([\s\S]*?)(?=KEY REQUIREMENT|$)/i);
    const requirements = content.match(/KEY REQUIREMENT[^\n]*\n([\s\S]*?)(?=HOW TO APPLY|$)/i);

    return {
      job_title,
      date: extractField(content, /(\d{1,2}\s+\w+\s+\d{4})/),
      nature_of_job: extractField(content, /NATURE OF JOB\s*\n\s*([^\n]+)/i),
      industry: extractField(content, /INDUSTRY\s*\n\s*([^\n]+)/i),
      salary: extractField(content, /SALARY\s*\n\s*([^\n]+)/i),
      job_location: extractField(content, /JOB LOCATION\s*\n\s*([^\n]+)/i),
      job_summary: summary?.[1]?.trim() ?? '',
      duties_and_responsibilities: duties?.[1]?.trim() ?? '',
      key_requirements_skills_qualification: requirements?.[1]?.trim() ?? '',
      how_to_apply: `If you meet the above qualifications, skills and experience share CV on: ${LOCAL_JOBS_APPLY_EMAIL}\nInterviews will be carried out on a rolling basis until the position is filled.\nOnly the shortlisted candidates will be contacted.`,
      url,
    };
  } catch (err) {
    console.error(`Failed to scrape job page ${url}:`, err);
    return null;
  }
}

/** Fetches the latest ~30 current Brites Management job listings (see module comment on the "Load More" limitation). */
export async function fetchLocalJobs(): Promise<LocalJobListing[]> {
  console.log(`Collecting job links from ${LISTING_URL}...`);
  const links = await collectJobLinks();
  console.log(`Found ${links.length} distinct job links.`);

  const jobs: LocalJobListing[] = [];
  for (const link of links) {
    const job = await scrapeJobPage(link);
    if (job) jobs.push(job);
    await delay(500);
  }
  return jobs;
}
