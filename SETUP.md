# JobVacancy.co.ke — Setup Guide

This project is an Astro site deployed to **Cloudflare Workers**, using **Supabase** (Postgres) for data and a
**Cloudflare R2** bucket for company logo uploads. Nothing is wired to a live account yet — follow the steps below
to connect your own.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates the `job_categories`, `locations` and `jobs` tables, sets up Row Level Security, and seeds the
   Kenyan job categories and locations used across the site.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public key** → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret — never commit or expose this)

## 2. Cloudflare R2 (company logo uploads)

1. In the Cloudflare dashboard, go to **R2** and create a bucket, e.g. `jobvacancy-images` (matches
   `wrangler.jsonc`'s `bucket_name` — change both if you use a different name).
2. Enable **public access** on the bucket (Settings → Public Access), either via the free `r2.dev` subdomain or a
   custom domain (recommended: `images.jobvacancy.co.ke`, set up via Settings → Custom Domains).
3. Set `PUBLIC_R2_PUBLIC_URL` in `wrangler.jsonc` to that public URL (no trailing slash).

## 3. Configure `wrangler.jsonc`

Edit the `vars` block in [`wrangler.jsonc`](wrangler.jsonc) with your real values:

```jsonc
"vars": {
  "PUBLIC_SITE_URL": "https://www.jobvacancy.co.ke",
  "PUBLIC_SUPABASE_URL": "https://your-project-ref.supabase.co",
  "PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
  "PUBLIC_R2_PUBLIC_URL": "https://images.jobvacancy.co.ke"
}
```

These are safe to commit — the anon key is designed to be public and is protected by the RLS policies in the
migration; the R2/site URLs aren't secret either.

After editing, regenerate the local TypeScript types:

```sh
npm run cf-typegen
```

## 4. Secrets (service-role key + admin password)

These must **never** go in `wrangler.jsonc`.

**Local development** — copy `.dev.vars.example` to `.dev.vars` and fill in real values (already gitignored):

```sh
cp .dev.vars.example .dev.vars
```

**Production** — set them via Wrangler once you're logged in (`npx wrangler login`):

```sh
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ADMIN_PASSWORD
```

`ADMIN_PASSWORD` protects `/admin` (the job-approval queue) via HTTP Basic Auth — username `admin`, password
whatever you set.

## 5. Run locally

```sh
npm install
npm run dev
```

Visit `http://localhost:4321`. The homepage, category and location pages will render with an empty state until
you approve a job or two — post one at `/post-a-job/`, then approve it at `/admin/` (browser will prompt for the
Basic Auth login).

## 6. Deploy to Cloudflare

```sh
npx wrangler login   # first time only
npm run deploy       # astro build && wrangler deploy
```

Then point your `jobvacancy.co.ke` DNS at the Worker (Cloudflare dashboard → Workers & Pages → your worker →
Settings → Domains & Routes → Add `www.jobvacancy.co.ke`).

## Notes / things to personalize before going live

- The contact email used across the site (`hello@jobvacancy.co.ke`) is a placeholder — update it in
  `src/pages/contact/index.astro`, `src/pages/privacy-policy/index.astro` and `src/pages/terms/index.astro`, or
  set up that inbox.
- `robots.txt` and the sitemap already point at `https://www.jobvacancy.co.ke` — update `SITE_URL` in
  `src/lib/seo.ts` and `site` in `astro.config.mjs` if the final domain differs.
- Once you have real traffic, consider submitting `https://www.jobvacancy.co.ke/sitemap.xml` in Google Search
  Console and Bing Webmaster Tools.
