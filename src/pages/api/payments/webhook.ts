import type { APIRoute } from 'astro';
import { verifyWebhookSignature } from '../../../lib/payments';
import { markJobPaymentPaid, markJobPaymentFailed } from '../../../lib/queries';
import { isCvOrderReference, promoteCvOrderDraft } from '../../../lib/cv-orders';

export const prerender = false;

interface PaystackEvent {
  event: string;
  data: {
    reference: string;
    metadata?: { job_id?: string; tier?: '5day' | '14day' };
  };
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return new Response(null, { status: 200 });
  }

  try {
    if (event.event === 'charge.success') {
      if (isCvOrderReference(reference)) {
        // Moves the staged draft from KV into the real cv_orders table — see lib/cv-orders.ts.
        // This is the reliable path for mobile M-Pesa payments (customer backgrounds the
        // browser to approve the STK push, so the client-side status poll can't be trusted
        // alone); /api/cv-orders/status also calls this as an idempotent fallback.
        await promoteCvOrderDraft(reference);
      } else {
        const tier = event.data.metadata?.tier === '14day' ? '14day' : '5day';
        await markJobPaymentPaid(reference, tier);
      }
    } else if (event.event === 'charge.failed') {
      // CV-order drafts need no action on failure — they simply expire out of KV (see
      // CV_DRAFT_TTL_SECONDS) since nothing was ever written to Supabase for them.
      if (!isCvOrderReference(reference)) {
        await markJobPaymentFailed(reference);
      }
    }
  } catch {
    // Swallow — Paystack retries non-2xx responses 3x then quarantines the
    // endpoint, and a transient DB error here shouldn't cause that. The
    // payment status will simply stay 'pending' until the next retry (if
    // any) or the client-side poll times out.
  }

  return new Response(null, { status: 200 });
};
