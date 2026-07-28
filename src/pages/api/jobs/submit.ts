import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { submitJob } from '../../../lib/queries';
import { slugify } from '../../../lib/format';

export const prerender = false;

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function redirectTo(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirectTo('/post-a-job/?error=server_error');
  }

  const get = (key: string) => (formData.get(key) as string | null)?.trim() || '';

  const title = get('title');
  const company_name = get('company_name');
  const category_id = get('category_id');
  const location_id = get('location_id');
  const job_type = get('job_type');
  const description = get('description');
  const application_method = get('application_method') as 'email' | 'url';
  const application_value = get('application_value');
  const contact_email = get('contact_email');
  const contact_name = get('contact_name') || null;
  const deadline = get('deadline') || null;

  if (
    !title ||
    !company_name ||
    !category_id ||
    !location_id ||
    !job_type ||
    !description ||
    !application_method ||
    !application_value ||
    !contact_email
  ) {
    return redirectTo('/post-a-job/?error=missing_fields');
  }

  const is_international = formData.get('is_international') === '1';
  const is_remote = is_international || formData.get('is_remote') === '1';

  const salaryMinRaw = get('salary_min');
  const salaryMaxRaw = get('salary_max');
  const salary_min = salaryMinRaw ? Number(salaryMinRaw) : null;
  const salary_max = salaryMaxRaw ? Number(salaryMaxRaw) : null;

  let company_logo_url: string | null = null;
  const logo = formData.get('logo');
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_LOGO_TYPES.has(logo.type) || logo.size > MAX_LOGO_BYTES) {
      return redirectTo('/post-a-job/?error=invalid_logo');
    }
    try {
      const env = getEnv();
      const ext = logo.type === 'image/png' ? 'png' : logo.type === 'image/webp' ? 'webp' : 'jpg';
      const key = `logos/${crypto.randomUUID()}.${ext}`;
      await env.JOB_IMAGES.put(key, await logo.arrayBuffer(), {
        httpMetadata: { contentType: logo.type },
      });
      company_logo_url = `${env.PUBLIC_R2_PUBLIC_URL}/${key}`;
    } catch {
      return redirectTo('/post-a-job/?error=server_error');
    }
  }

  const slug = `${slugify(`${title}-${company_name}`)}-${crypto.randomUUID().slice(0, 6)}`;

  try {
    await submitJob({
      title,
      slug,
      company_name,
      company_logo_url,
      description,
      category_id,
      location_id,
      job_type,
      is_remote,
      is_international,
      salary_min,
      salary_max,
      application_method,
      application_value,
      deadline,
      contact_name,
      contact_email,
    });
  } catch {
    return redirectTo('/post-a-job/?error=server_error');
  }

  return redirectTo('/post-a-job/thank-you/');
};
