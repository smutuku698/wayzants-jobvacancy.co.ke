import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { submitJob } from '../../../lib/queries';
import { slugify } from '../../../lib/format';

export const prerender = false;

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_CURRENCIES = new Set(['KES', 'USD', 'GBP', 'EUR']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LENGTHS = {
  title: 200,
  company_name: 200,
  description: 10000,
  contact_name: 150,
  application_value: 500,
  contact_email: 254,
};

function redirectTo(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

/** Confirms the uploaded bytes actually are the image type claimed — a spoofed
 * Content-Type on the FormData part is trivial for a client to send. */
function matchesImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((b, i) => bytes[i] === b);
  }
  if (mimeType === 'image/webp') {
    const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    return isRiff && isWebp;
  }
  return false;
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

  if (
    title.length > MAX_LENGTHS.title ||
    company_name.length > MAX_LENGTHS.company_name ||
    description.length > MAX_LENGTHS.description ||
    application_value.length > MAX_LENGTHS.application_value ||
    contact_email.length > MAX_LENGTHS.contact_email ||
    (contact_name?.length ?? 0) > MAX_LENGTHS.contact_name
  ) {
    return redirectTo('/post-a-job/?error=invalid_fields');
  }

  if (!EMAIL_RE.test(contact_email)) {
    return redirectTo('/post-a-job/?error=invalid_fields');
  }

  if (application_method === 'email' && !EMAIL_RE.test(application_value)) {
    return redirectTo('/post-a-job/?error=invalid_fields');
  }
  if (application_method === 'url' && !/^https:\/\//i.test(application_value)) {
    return redirectTo('/post-a-job/?error=invalid_fields');
  }
  if (application_method !== 'email' && application_method !== 'url') {
    return redirectTo('/post-a-job/?error=invalid_fields');
  }

  const is_international = formData.get('is_international') === '1';
  const is_remote = is_international || formData.get('is_remote') === '1';

  const salaryMinRaw = get('salary_min');
  const salaryMaxRaw = get('salary_max');
  const salary_min = salaryMinRaw ? Number(salaryMinRaw) : null;
  const salary_max = salaryMaxRaw ? Number(salaryMaxRaw) : null;
  const salaryCurrencyRaw = get('salary_currency').toUpperCase();
  const salary_currency = ALLOWED_CURRENCIES.has(salaryCurrencyRaw) ? salaryCurrencyRaw : 'KES';

  let company_logo_url: string | null = null;
  const logo = formData.get('logo');
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_LOGO_TYPES.has(logo.type) || logo.size > MAX_LOGO_BYTES) {
      return redirectTo('/post-a-job/?error=invalid_logo');
    }
    try {
      const bytes = new Uint8Array(await logo.arrayBuffer());
      // The browser-reported MIME type is just a label the client attaches to
      // the upload — trivially spoofable. Confirm the file's actual header
      // bytes match before trusting it as that image type.
      if (!matchesImageSignature(bytes, logo.type)) {
        return redirectTo('/post-a-job/?error=invalid_logo');
      }
      const env = getEnv();
      const ext = logo.type === 'image/png' ? 'png' : logo.type === 'image/webp' ? 'webp' : 'jpg';
      const key = `logos/${crypto.randomUUID()}.${ext}`;
      await env.JOB_IMAGES.put(key, bytes, {
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
      salary_currency,
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
