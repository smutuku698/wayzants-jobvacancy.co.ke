import type { APIRoute } from 'astro';
import { getPricingTier, stageCvOrderDraft, resolveAddons, CV_ORDER_REF_PREFIX } from '../../../lib/cv-orders';
import { normalizeKenyanPhone } from '../../../lib/format';
import { initiateMpesaCharge } from '../../../lib/payments';
import type { CvOrderDraft, CvOrderPathType, CvUploadFocus, CvWizardData } from '../../../lib/types';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Confirms the uploaded bytes actually match the claimed file type — same defense-in-depth
 * pattern as matchesImageSignature() in api/jobs/submit.ts. */
function matchesDocumentSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'application/pdf') {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return bytes[0] === 0x50 && bytes[1] === 0x4b; // PK.. (zip container)
  }
  if (mimeType === 'application/msword') {
    return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0; // OLE compound file
  }
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ ok: false, error: 'Could not read your submission. Please try again.' }, 400);
  }

  const get = (key: string) => (formData.get(key) as string | null)?.trim() || '';

  const path_type = get('path_type') as CvOrderPathType;
  const tierId = get('tier');
  const template_id = get('template_id') || null;
  const contact_name = get('contact_name');
  const contact_phone_raw = get('contact_phone');
  const contact_email = get('contact_email');
  const target_job = get('target_job') || null;
  const payment_phone_raw = get('payment_phone');

  if (path_type !== 'form' && path_type !== 'upload') {
    return json({ ok: false, error: 'Invalid submission.' }, 400);
  }

  const tier = getPricingTier(tierId);
  if (!tier) {
    return json({ ok: false, error: 'Invalid plan selected.' }, 400);
  }

  // Never trust a client-supplied total — the addon ids are the only thing we accept from the
  // client, price always comes from the server-side catalog in lib/cv-orders.ts.
  const addonsRaw = get('addons');
  const { addons, addonsTotalKes } = resolveAddons(addonsRaw ? addonsRaw.split(',') : []);
  const amountKes = tier.priceKes + addonsTotalKes;

  if (!contact_name || contact_name.length > 150 || !contact_phone_raw || !contact_email) {
    return json({ ok: false, error: 'Please fill in your name, phone and email.' }, 400);
  }
  if (!EMAIL_RE.test(contact_email) || contact_email.length > 254) {
    return json({ ok: false, error: 'Please enter a valid email address.' }, 400);
  }

  const contact_phone = normalizeKenyanPhone(contact_phone_raw);
  if (!contact_phone) {
    return json({ ok: false, error: 'Please enter a valid Kenyan phone number.' }, 400);
  }

  const payment_phone = normalizeKenyanPhone(payment_phone_raw);
  if (!payment_phone) {
    return json({ ok: false, error: 'Please enter a valid Safaricom/Airtel M-Pesa number.' }, 400);
  }

  let cv_data: CvWizardData | null = null;
  let upload_notes: string | null = null;
  let upload_focus: CvUploadFocus | null = null;
  let fileBytes: Uint8Array | null = null;
  let fileType: string | null = null;
  let fileName: string | null = null;
  let linkedin_url: string | null = null;
  let portfolio_url: string | null = null;

  if (path_type === 'form') {
    const cvDataRaw = get('cv_data');
    try {
      cv_data = JSON.parse(cvDataRaw) as CvWizardData;
    } catch {
      return json({ ok: false, error: 'Could not read your answers. Please try again.' }, 400);
    }
    if (!cv_data?.personal?.full_name) {
      return json({ ok: false, error: 'Please complete the personal details step.' }, 400);
    }
    // Mirrored to a top-level field so the admin dashboard has one place to read from
    // regardless of which path (form vs upload) the order came through.
    linkedin_url = cv_data.personal.linkedin_url || null;
    portfolio_url = cv_data.personal.portfolio_url || null;
  } else {
    linkedin_url = get('linkedin_url') || null;
    portfolio_url = get('portfolio_url') || null;
    const focusRaw = get('upload_focus');
    if (focusRaw) {
      try {
        upload_focus = JSON.parse(focusRaw) as CvUploadFocus;
      } catch {
        upload_focus = null;
      }
    }
    upload_notes = upload_focus?.other || null;

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return json({ ok: false, error: 'Please attach your CV file.' }, 400);
    }
    if (file.size > MAX_FILE_BYTES || !ALLOWED_FILE_TYPES.has(file.type)) {
      return json({ ok: false, error: 'Your CV must be a genuine PDF, DOC or DOCX file under 5MB.' }, 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesDocumentSignature(bytes, file.type)) {
      return json({ ok: false, error: 'Your CV must be a genuine PDF, DOC or DOCX file under 5MB.' }, 400);
    }
    fileBytes = bytes;
    fileType = file.type;
    fileName = file.name;
  }

  const reference = `${CV_ORDER_REF_PREFIX}${crypto.randomUUID()}`;

  const draft: CvOrderDraft = {
    path_type,
    tier: tier.id,
    addons,
    template_id,
    contact_name,
    contact_phone,
    contact_email,
    linkedin_url,
    portfolio_url,
    target_job,
    cv_data,
    upload_notes,
    upload_focus,
    file_name: fileName,
    file_type: fileType,
    payment_phone,
  };

  try {
    await stageCvOrderDraft(reference, draft, fileBytes && fileType ? { bytes: fileBytes, type: fileType } : null);
  } catch {
    return json({ ok: false, error: 'Something went wrong on our end. Please try again.' }, 500);
  }

  const charge = await initiateMpesaCharge({
    amountKes,
    email: contact_email,
    phone: payment_phone,
    reference,
    metadata: { cv_order: true, tier: tier.id, addons },
  }).catch((): { ok: false; message: string } => ({ ok: false, message: 'network_error' }));

  if (!charge.ok) {
    return json({ ok: false, error: charge.message || "We couldn't start the M-Pesa payment. Please check your number and try again." }, 400);
  }

  return json({ ok: true, redirect: `/cv-builder/pay/?ref=${reference}` });
};
