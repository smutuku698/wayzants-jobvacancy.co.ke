// Faithful port of the old site's lib/template-fallbacks.ts — same
// category-specific skills/tips/salary-ranges/Kenya-context, used when no AI
// provider is configured (or none produced a usable result). Keyed by the
// old-style function categories (Programming, Finance, Marketing...) that
// remote/NGO sources' own category fields already provide — separate from
// this project's Kenya-sector category_id (which is fixed to
// online-remote-jobs/ngo-jobs for every row regardless of function).

interface CategoryTemplate {
  skills: string[];
  applicationTips: string[];
}

const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  Programming: {
    skills: ['JavaScript', 'Git', 'Problem Solving', 'Remote Collaboration'],
    applicationTips: [
      'Include your GitHub profile with relevant projects',
      'Showcase projects using modern tech stack',
      'Highlight remote work experience and self-management',
      'Mention your timezone (EAT) and availability for team meetings',
      'Demonstrate problem-solving skills through code samples',
    ],
  },
  Design: {
    skills: ['UI/UX Design', 'Figma', 'Visual Design', 'User Research'],
    applicationTips: [
      'Share your portfolio (Behance, Dribbble, or personal website)',
      'Include case studies showing your design process',
      'Demonstrate familiarity with collaboration tools',
      'Highlight remote design work experience',
      'Show understanding of user-centered design principles',
    ],
  },
  Marketing: {
    skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics'],
    applicationTips: [
      'Show measurable results from previous campaigns',
      'Demonstrate knowledge of analytics and ROI tracking',
      'Include relevant certifications (Google Analytics, HubSpot, etc.)',
      'Highlight experience with marketing tools',
      'Provide portfolio of successful marketing campaigns',
    ],
  },
  Sales: {
    skills: ['Sales', 'Communication', 'Relationship Building', 'CRM'],
    applicationTips: [
      'Highlight your sales track record with specific numbers',
      'Demonstrate knowledge of the sales cycle',
      'Show experience with CRM tools (Salesforce, HubSpot, etc.)',
      'Emphasize communication and relationship-building skills',
      'Mention remote sales experience if applicable',
    ],
  },
  'Customer Service': {
    skills: ['Customer Support', 'Communication', 'Problem Solving', 'Empathy'],
    applicationTips: [
      'Emphasize your communication skills and English proficiency',
      'Show experience with support tools and ticketing systems',
      'Highlight your availability and reliability',
      'Demonstrate problem-solving and patience',
      'Mention experience handling difficult customers professionally',
    ],
  },
  Writing: {
    skills: ['Content Writing', 'Research', 'SEO Writing', 'Editing'],
    applicationTips: [
      'Provide writing samples relevant to the industry',
      'Demonstrate SEO knowledge if applicable',
      'Show ability to meet deadlines consistently',
      'Highlight research and fact-checking skills',
      'Include any published work or portfolio links',
    ],
  },
  Data: {
    skills: ['Data Analysis', 'SQL', 'Excel', 'Statistical Analysis'],
    applicationTips: [
      'Showcase data projects and analysis work',
      'Demonstrate proficiency with analytics tools',
      'Highlight statistical and mathematical skills',
      'Show ability to communicate insights clearly',
      'Include certifications in data analysis or related fields',
    ],
  },
  Finance: {
    skills: ['Financial Analysis', 'Accounting', 'Excel', 'Reporting'],
    applicationTips: [
      'Highlight relevant certifications (CPA, ACCA, CFA)',
      'Demonstrate attention to detail and accuracy',
      'Show experience with financial software',
      'Emphasize analytical and problem-solving skills',
      'Mention understanding of regulations and compliance',
    ],
  },
  HR: {
    skills: ['Human Resources', 'Recruiting', 'Employee Relations', 'Communication'],
    applicationTips: [
      'Highlight experience with HR software and systems',
      'Demonstrate understanding of HR best practices',
      'Show strong interpersonal and communication skills',
      'Mention relevant certifications (SHRM, HRCI)',
      'Emphasize confidentiality and professionalism',
    ],
  },
  Product: {
    skills: ['Product Management', 'Roadmap Planning', 'Stakeholder Management', 'Agile'],
    applicationTips: [
      "Showcase products you've managed or contributed to",
      'Demonstrate understanding of product lifecycle',
      'Highlight data-driven decision making',
      'Show experience with agile methodologies',
      'Emphasize cross-functional collaboration skills',
    ],
  },
  Management: {
    skills: ['Project Management', 'Team Leadership', 'Budget Management', 'Stakeholder Engagement'],
    applicationTips: [
      'Highlight your experience managing humanitarian or development projects',
      'Demonstrate ability to work with diverse stakeholders',
      'Show evidence of successful project delivery within budget',
      'Emphasize cross-cultural communication skills',
      'Include examples of team leadership in challenging environments',
    ],
  },
  Healthcare: {
    skills: ['Health Programming', 'Medical Knowledge', 'Community Health', 'M&E'],
    applicationTips: [
      'Highlight relevant medical or public health qualifications',
      'Show experience in community-based health programs',
      'Demonstrate knowledge of Kenyan health system',
      'Emphasize M&E and reporting experience',
      'Include any emergency response or humanitarian health experience',
    ],
  },
  Education: {
    skills: ['Education Programming', 'Curriculum Development', 'Training', 'M&E'],
    applicationTips: [
      'Highlight teaching or education program experience',
      'Show knowledge of Kenyan education system and curriculum',
      'Demonstrate experience with capacity building',
      'Emphasize child safeguarding awareness',
      'Include examples of successful education interventions',
    ],
  },
  Other: {
    skills: ['Communication', 'Time Management', 'Problem Solving', 'Remote Work'],
    applicationTips: [
      'Highlight relevant experience for this specific role',
      'Demonstrate your ability to learn quickly',
      'Show strong communication skills',
      'Emphasize reliability and self-management',
      'Mention remote work experience if applicable',
    ],
  },
};

const KENYA_CONTEXT: Record<string, string> = {
  Programming:
    '🇰🇪 Kenya has a growing tech ecosystem with strong developer talent. Remote programming roles offer exposure to international standards and technologies. Ensure you have reliable internet (10+ Mbps) and a professional workspace.',
  Design:
    '🇰🇪 Remote design work from Kenya is increasingly popular with international companies. Strong portfolio and excellent communication skills are essential. Make sure you can collaborate effectively across timezones.',
  Marketing:
    '🇰🇪 Digital marketing roles from Kenya offer competitive pay and skill development. Understanding of both local and international markets is valuable. Show your ability to drive measurable results.',
  Sales:
    '🇰🇪 Remote sales positions welcome Kenyan professionals with proven track records. Strong English communication and relationship-building skills are crucial. Demonstrate your sales achievements with numbers.',
  'Customer Service':
    "🇰🇪 Kenya's customer service professionals are well-regarded globally. Excellent English communication, empathy, and reliability are key. Stable internet and quiet workspace are essential.",
  Writing:
    '🇰🇪 Content writing and copywriting opportunities are abundant for skilled Kenyan writers. Strong research, writing, and SEO skills open many doors. Build a portfolio showcasing your best work.',
  Data: '🇰🇪 Data analysis skills are in high demand globally. Kenyan data professionals can compete internationally with strong technical skills. Highlight your analytical abilities and tool proficiency.',
  Finance:
    '🇰🇪 Remote finance roles require accuracy, attention to detail, and professionalism. Kenyan finance professionals with relevant certifications are competitive. Emphasize your technical and analytical skills.',
  HR: '🇰🇪 Human resources professionals from Kenya bring strong interpersonal skills and cultural awareness. Remote HR work requires excellent communication and confidentiality. Highlight your people management experience.',
  Product:
    '🇰🇪 Product management roles welcome Kenyan professionals with strategic thinking and technical understanding. Show your ability to balance user needs with business goals.',
  Management:
    '🇰🇪 Kenya is a regional hub for NGO and humanitarian work in East Africa. Management roles in this sector offer meaningful impact and career growth. Strong project management skills, cultural sensitivity, and local context knowledge are valuable assets.',
  Healthcare:
    '🇰🇪 Kenya has a strong healthcare and public health sector with many international organizations. Health professionals with field experience and M&E skills are in demand. Demonstrate your commitment to improving community health outcomes.',
  Education:
    '🇰🇪 Education development is a priority in Kenya with numerous NGO programs. Experience with the Kenyan curriculum, teacher training, and community engagement are valuable. Show your passion for improving educational outcomes for vulnerable populations.',
  Other:
    '🇰🇪 This remote position is open to qualified Kenyan professionals. Demonstrate your relevant skills, reliability, and ability to work independently. Strong communication is essential.',
};

// Additional paragraph-length content per function category — mirrors the
// depth the old site's local-jobs pipeline had (career_growth/work_environment/
// benefits/market_context), which the remote/NGO/cruise/teaching-abroad
// pipelines never had until now. companyInsights is deliberately omitted here
// (unlike the other four) since a template has no real information about the
// specific employer — inventing generic-sounding "insights" about a company
// we know nothing about would read as filler, not genuine content.
const EXTRA_CONTEXT: Record<string, { careerGrowth: string; workEnvironment: string; benefits: string; marketContext: string }> = {
  Programming: {
    careerGrowth: 'Developers who consistently ship reliable work tend to move into senior, staff, or tech-lead roles within a few years, or branch into specialisations like DevOps, architecture, or engineering management.',
    workEnvironment: 'Most remote programming roles are async-friendly with some overlap hours for standups and reviews — expect a mix of focused solo coding time and collaborative code review.',
    benefits: 'Remote tech roles commonly include a laptop/equipment allowance, learning budget, and flexible hours; some international employers also offer health cover or stipends — confirm specifics with the employer.',
    marketContext: 'Demand for skilled remote developers from Kenya remains strong, driven by the cost-effectiveness and English proficiency of the local talent pool relative to Western markets.',
  },
  Design: {
    careerGrowth: 'Designers who build a strong portfolio and take ownership of end-to-end projects often progress to senior or lead design roles, or specialise in UX research or design systems.',
    workEnvironment: 'Expect close collaboration with product and engineering teams, regular design critiques, and a mix of independent creative work with feedback cycles.',
    benefits: 'Remote design roles often include software/tool subscriptions (Figma, Adobe), a home-office allowance, and flexible scheduling.',
    marketContext: 'International companies increasingly hire remote designers from Kenya for the quality-to-cost ratio — a strong portfolio matters more than location for these roles.',
  },
  Marketing: {
    careerGrowth: 'Marketers who can show measurable campaign results typically advance to senior marketing manager or head-of-growth roles within a few years.',
    workEnvironment: 'Expect a mix of data analysis, content/campaign planning, and cross-team coordination, often with monthly or quarterly performance targets.',
    benefits: 'Performance bonuses tied to campaign results are common in marketing roles, alongside standard remote-work perks like flexible hours.',
    marketContext: 'Digital marketing skills are in steady demand as more companies shift ad spend online — analytics and paid-media experience are especially valuable right now.',
  },
  Sales: {
    careerGrowth: 'Strong performers in sales roles often move into senior account executive, sales management, or business development leadership positions, usually tied directly to track record.',
    workEnvironment: 'Sales roles are typically target-driven with regular pipeline reviews — expect a mix of outreach, calls/demos, and CRM management.',
    benefits: 'Commission or bonus structures on top of base salary are standard in sales roles — confirm the exact structure with the employer before accepting.',
    marketContext: 'Remote sales roles for international companies are growing, particularly for candidates who can demonstrate a proven closing record.',
  },
  'Customer Service': {
    careerGrowth: 'Customer service representatives who perform consistently often move into team-lead, quality-assurance, or training roles within the same organisation.',
    workEnvironment: 'Expect shift-based scheduling to cover customer time zones, with clear response-time and resolution-quality targets.',
    benefits: 'Shift differentials for non-standard hours and performance bonuses tied to customer satisfaction scores are common in this field.',
    marketContext: 'Kenyan customer service professionals are well-regarded internationally for English proficiency and reliability, keeping demand steady.',
  },
  Writing: {
    careerGrowth: 'Writers who build a strong portfolio and meet deadlines consistently often move into senior content strategist, editor, or content-lead roles.',
    workEnvironment: 'Most writing roles are deadline- and deliverable-driven rather than hourly, giving more flexibility over when you work.',
    benefits: 'Per-word or per-piece rates are common alongside or instead of salary for writing roles — clarify the payment structure upfront.',
    marketContext: 'Demand for skilled English-language content writers remains strong, especially for SEO and technical writing niches.',
  },
  Data: {
    careerGrowth: 'Data professionals who develop strong business-communication skills alongside technical ones tend to progress fastest, into senior analyst or data science roles.',
    workEnvironment: 'Expect a mix of independent analysis work and presenting findings to stakeholders — strong communication matters as much as technical skill.',
    benefits: 'Learning budgets for courses/certifications are common in data roles given how fast the tooling changes.',
    marketContext: 'Data analysis and data science skills are in high global demand, and remote roles for skilled Kenyan analysts are increasingly available.',
  },
  Finance: {
    careerGrowth: 'Finance professionals with relevant certifications (CPA, ACCA, CFA) and a track record of accuracy typically progress into senior analyst, controller, or finance-manager roles.',
    workEnvironment: 'Expect month-end/quarter-end crunch periods alongside steadier day-to-day reconciliation and reporting work.',
    benefits: 'Support for professional certifications is a common benefit in finance roles, given how directly they affect career progression.',
    marketContext: 'Remote finance roles require a high degree of trust, so relevant certifications and verifiable experience carry significant weight with employers.',
  },
  HR: {
    careerGrowth: 'HR professionals who build strong stakeholder relationships and process knowledge often progress into HR business partner or HR manager roles.',
    workEnvironment: 'Expect a mix of confidential casework, process administration, and cross-team coordination — discretion is essential.',
    benefits: 'HR certifications (SHRM, HRCI) are often supported or required, and many employers value demonstrated confidentiality and judgement above all.',
    marketContext: 'Remote HR roles are less common than other remote functions, but demand exists for HR professionals who understand distributed-team dynamics.',
  },
  Product: {
    careerGrowth: 'Product managers who ship well-received features and can back decisions with data typically progress into senior PM or head-of-product roles.',
    workEnvironment: 'Expect constant cross-functional coordination with engineering, design and stakeholders — communication skills matter as much as strategic thinking.',
    benefits: 'Product roles at growth-stage companies sometimes include equity/stock options in addition to base salary — confirm what is on offer.',
    marketContext: 'Product management remains a competitive, in-demand field globally — a track record of shipped, successful features is the strongest differentiator.',
  },
  Management: {
    careerGrowth: 'Program/project managers in the NGO and development sector who deliver projects on budget and on time typically progress into senior program manager or country-director-track roles.',
    workEnvironment: 'Expect a mix of field coordination, donor reporting, and team leadership — cultural sensitivity and adaptability are valued as much as project-management technique.',
    benefits: 'NGO management roles often include hardship/field allowances, medical cover, and R&R leave for postings in challenging locations.',
    marketContext: 'Kenya remains a regional hub for humanitarian and development work in East Africa, keeping steady demand for experienced program managers.',
  },
  Healthcare: {
    careerGrowth: 'Health program staff with strong M&E and field experience often progress into program-coordinator or technical-advisor roles within international health organisations.',
    workEnvironment: 'Expect a mix of community-facing fieldwork and reporting/documentation, often within multi-partner health programs.',
    benefits: 'Health-sector roles with international organisations commonly include medical cover, hazard allowances for field postings, and continuing-education support.',
    marketContext: 'Kenya\'s strong public-health sector and concentration of international health organisations keeps demand steady for experienced health professionals.',
  },
  Education: {
    careerGrowth: 'Education program staff who demonstrate strong classroom or curriculum results often progress into training, curriculum-development, or program-coordinator roles.',
    workEnvironment: 'Expect a mix of direct teaching/training delivery and program documentation, often with community and parent engagement components.',
    benefits: 'Education-sector NGO roles often include training/professional-development support alongside standard benefits.',
    marketContext: 'Education remains a funding priority for NGOs and donors operating in Kenya, keeping steady demand for qualified education staff.',
  },
  Other: {
    careerGrowth: 'Consistent, reliable performance in this kind of role is typically the clearest path to more senior responsibility over time.',
    workEnvironment: 'Review the full listing for specifics on schedule, team structure and reporting lines — these vary a lot by employer.',
    benefits: 'Confirm the exact benefits package directly with the employer, since it isn\'t always specified in the listing.',
    marketContext: 'Demand for this kind of role varies with the wider job market — a well-tailored application against the listed requirements is the best strategy.',
  },
};

const SALARY_RANGES: Record<string, Record<string, { min: number; max: number }>> = {
  Programming: { 'Entry Level': { min: 80000, max: 180000 }, 'Mid Level': { min: 180000, max: 400000 }, 'Senior Level': { min: 400000, max: 800000 } },
  Design: { 'Entry Level': { min: 60000, max: 150000 }, 'Mid Level': { min: 150000, max: 350000 }, 'Senior Level': { min: 350000, max: 700000 } },
  Marketing: { 'Entry Level': { min: 50000, max: 120000 }, 'Mid Level': { min: 120000, max: 300000 }, 'Senior Level': { min: 300000, max: 600000 } },
  Sales: { 'Entry Level': { min: 60000, max: 150000 }, 'Mid Level': { min: 150000, max: 400000 }, 'Senior Level': { min: 400000, max: 1000000 } },
  'Customer Service': { 'Entry Level': { min: 40000, max: 100000 }, 'Mid Level': { min: 100000, max: 200000 }, 'Senior Level': { min: 200000, max: 400000 } },
  Writing: { 'Entry Level': { min: 50000, max: 120000 }, 'Mid Level': { min: 120000, max: 250000 }, 'Senior Level': { min: 250000, max: 500000 } },
  Data: { 'Entry Level': { min: 70000, max: 180000 }, 'Mid Level': { min: 180000, max: 450000 }, 'Senior Level': { min: 450000, max: 900000 } },
  Finance: { 'Entry Level': { min: 60000, max: 150000 }, 'Mid Level': { min: 150000, max: 350000 }, 'Senior Level': { min: 350000, max: 700000 } },
  HR: { 'Entry Level': { min: 50000, max: 120000 }, 'Mid Level': { min: 120000, max: 280000 }, 'Senior Level': { min: 280000, max: 550000 } },
  Product: { 'Entry Level': { min: 100000, max: 220000 }, 'Mid Level': { min: 220000, max: 500000 }, 'Senior Level': { min: 500000, max: 1000000 } },
  Other: { 'Entry Level': { min: 40000, max: 100000 }, 'Mid Level': { min: 100000, max: 250000 }, 'Senior Level': { min: 250000, max: 500000 } },
};

function detectCareerLevel(title: string, description: string): string {
  const combined = `${title} ${description}`.toLowerCase();
  if (/\b(senior|lead|principal|staff|architect|head of|director|vp)\b/.test(combined)) return 'Senior Level';
  if (/\b(mid-level|intermediate|mid|experienced)\b/.test(combined)) return 'Mid Level';
  if (/\b(junior|entry|entry-level|graduate|associate|intern)\b/.test(combined)) return 'Entry Level';
  const yearsMatch = combined.match(/(\d+)\+?\s*years?/);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1], 10);
    if (years >= 5) return 'Senior Level';
    if (years >= 2) return 'Mid Level';
    return 'Entry Level';
  }
  return 'Mid Level';
}

export interface TemplateFallbackResult {
  skills: string[];
  careerLevel: string;
  kenyaSalaryEstimate: string;
  metaDescription: string;
  applicationTips: string[];
  kenyaContext: string;
  jobSummary: string;
  careerGrowth: string;
  workEnvironment: string;
  benefits: string;
  marketContext: string;
}

// The two historical datasets (enhanced-jobs.json, enhanced-ngo-jobs.json) store
// ~139 distinct free-text `category` values — a handful of clean function names
// (Programming, Design, Marketing...) mixed with noisy single-word scrape tags
// (python, react, manager, saas...). Matched most-specific-first so compound
// terms (e.g. "front-end") aren't swallowed by a shorter unrelated substring.
const CATEGORY_KEYWORDS: [string, string][] = [
  ['front-end', 'Programming'], ['front end', 'Programming'], ['frontend', 'Programming'],
  ['back-end', 'Programming'], ['back end', 'Programming'], ['backend', 'Programming'],
  ['full-stack', 'Programming'], ['full stack', 'Programming'], ['fullstack', 'Programming'],
  ['devops', 'Programming'], ['sysadmin', 'Programming'], ['software', 'Programming'],
  ['programming', 'Programming'], ['developer', 'Programming'], ['engineer', 'Programming'],
  ['architect', 'Programming'], ['python', 'Programming'], ['javascript', 'Programming'],
  ['golang', 'Programming'], ['php', 'Programming'], ['react', 'Programming'], ['c#', 'Programming'],
  ['ios', 'Programming'], ['mobile', 'Programming'], ['embedded', 'Programming'], ['unity', 'Programming'],
  ['elasticsearch', 'Programming'], ['grafana', 'Programming'], ['ansible', 'Programming'],
  ['redis', 'Programming'], ['cloud', 'Programming'], ['aws', 'Programming'], ['security', 'Programming'],
  ['infosec', 'Programming'], ['ai / ml', 'Programming'], ['ai/ml', 'Programming'], ['web3', 'Programming'],
  ['crypto', 'Programming'], ['defi', 'Programming'], ['nft', 'Programming'], ['code', 'Programming'],
  ['qa', 'Programming'], ['test', 'Programming'], ['system', 'Programming'], ['technical', 'Programming'],
  ['osx', 'Programming'], ['microsoft', 'Programming'], ['jira', 'Programming'],
  ['designer', 'Design'], ['design', 'Design'], ['3d', 'Design'], ['vfx', 'Design'], ['ui', 'Design'], ['ux', 'Design'],
  ['game', 'Design'], ['video', 'Design'],
  ['writer', 'Writing'], ['writing', 'Writing'], ['copywriter', 'Writing'],
  ['marketing', 'Marketing'], ['growth', 'Marketing'], ['content', 'Marketing'], ['strategist', 'Marketing'],
  ['saas', 'Marketing'],
  ['sales', 'Sales'], ['salesforce', 'Sales'],
  ['customer support', 'Customer Service'], ['customer service', 'Customer Service'],
  ['support', 'Customer Service'], ['happiness', 'Customer Service'],
  ['data analysis', 'Data'], ['data', 'Data'], ['analyst', 'Data'], ['excel', 'Data'],
  ['finance / legal', 'Finance'], ['finance   legal', 'Finance'], ['finance', 'Finance'],
  ['financial', 'Finance'], ['accountant', 'Finance'], ['accounting', 'Finance'], ['bank', 'Finance'],
  ['payroll', 'Finance'], ['cfo', 'Finance'], ['legal', 'Finance'],
  ['human resources', 'HR'], ['hr', 'HR'], ['recruiter', 'HR'],
  ['product', 'Product'],
  ['project management', 'Management'], ['management', 'Management'], ['manager', 'Management'],
  ['supervisor', 'Management'], ['lead', 'Management'], ['leader', 'Management'], ['director', 'Management'],
  ['ceo', 'Management'], ['cto', 'Management'], ['founder', 'Management'], ['exec', 'Management'],
  ['executive', 'Management'], ['consultant', 'Management'], ['consulting', 'Management'],
  ['coordinator', 'Management'], ['operations', 'Management'], ['operational', 'Management'],
  ['medical', 'Healthcare'], ['biotech', 'Healthcare'],
  ['teacher', 'Education'], ['teaching', 'Education'], ['tutor', 'Education'], ['instructor', 'Education'],
  ['trainer', 'Education'], ['training', 'Education'], ['education', 'Education'], ['students', 'Education'],
  ['adult', 'Education'],
];

/** Maps a legacy dataset's messy free-text `category` value onto one of this file's template keys — exact match first, then a keyword scan, falling back to `Other`. */
export function normalizeLegacyCategory(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (value in CATEGORY_TEMPLATES) return value;
  const lower = value.toLowerCase();
  for (const [keyword, key] of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) return key;
  }
  return 'Other';
}

/** Category-specific template fallback for remote/NGO jobs, keyed by the source's own function category (Programming, Finance, Marketing, etc). */
export function generateTemplateFallback(job: { title: string; company: string; description: string; sourceCategory: string }): TemplateFallbackResult {
  const sourceCategory = normalizeLegacyCategory(job.sourceCategory);
  const template = CATEGORY_TEMPLATES[sourceCategory] ?? CATEGORY_TEMPLATES.Other;
  const extra = EXTRA_CONTEXT[sourceCategory] ?? EXTRA_CONTEXT.Other;
  const careerLevel = detectCareerLevel(job.title, job.description);
  const ranges = SALARY_RANGES[sourceCategory] ?? SALARY_RANGES.Other;
  const range = ranges[careerLevel] ?? ranges['Mid Level'];
  const kenyaSalaryEstimate = `KES ${range.min.toLocaleString()} - ${range.max.toLocaleString()}/month`;

  return {
    skills: template.skills,
    careerLevel,
    kenyaSalaryEstimate,
    metaDescription: `${job.title} at ${job.company}. Remote work from Kenya. ${job.sourceCategory} opportunity. ${kenyaSalaryEstimate}. Apply now!`.slice(0, 155),
    applicationTips: template.applicationTips,
    kenyaContext: KENYA_CONTEXT[sourceCategory] ?? KENYA_CONTEXT.Other,
    jobSummary: `${job.company} is looking for a ${job.title.toLowerCase().includes(job.sourceCategory.toLowerCase()) ? job.title : `${job.title} (${job.sourceCategory})`}. Review the full listing below for the exact requirements and how to apply.`,
    careerGrowth: extra.careerGrowth,
    workEnvironment: extra.workEnvironment,
    benefits: extra.benefits,
    marketContext: extra.marketContext,
  };
}
