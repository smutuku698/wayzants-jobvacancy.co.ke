import type { APIRoute } from 'astro';
import { submitInquiry } from '../../../lib/queries';
import type { InquiryType } from '../../../lib/types';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_TYPES = new Set<InquiryType>(['comment', 'partnership', 'sponsorship', 'advertising']);

const MAX_LENGTHS = { name: 150, email: 254, company: 200, message: 4000 };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }

  const get = (key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim() : '');

  // Honeypot — a hidden field real users never fill in. Any value here means a bot.
  if (get('website')) {
    return json({ ok: true });
  }

  const type = get('type') as InquiryType;
  const name = get('name');
  const email = get('email');
  const company = get('company') || null;
  const message = get('message');

  if (!VALID_TYPES.has(type) || !name || !email || !message) {
    return json({ ok: false, error: 'missing_fields' }, 400);
  }

  // Partnership/sponsorship/advertising inquiries need a company name to be
  // actionable — general comments don't.
  if (type !== 'comment' && !company) {
    return json({ ok: false, error: 'missing_company' }, 400);
  }

  if (
    name.length > MAX_LENGTHS.name ||
    email.length > MAX_LENGTHS.email ||
    message.length > MAX_LENGTHS.message ||
    (company?.length ?? 0) > MAX_LENGTHS.company
  ) {
    return json({ ok: false, error: 'invalid_fields' }, 400);
  }

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400);
  }

  try {
    await submitInquiry({ type, name, email, company, message });
  } catch {
    return json({ ok: false, error: 'server_error' }, 500);
  }

  return json({ ok: true });
};
