import type { APIRoute } from 'astro';
import { verifyWebhookSignature } from '../../../lib/payments';
import { markJobPaymentPaid, markJobPaymentFailed } from '../../../lib/queries';

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
      const tier = event.data.metadata?.tier === '14day' ? '14day' : '5day';
      await markJobPaymentPaid(reference, tier);
    } else if (event.event === 'charge.failed') {
      await markJobPaymentFailed(reference);
    }
  } catch {
    // Swallow — Paystack retries non-2xx responses 3x then quarantines the
    // endpoint, and a transient DB error here shouldn't cause that. The
    // payment status will simply stay 'pending' until the next retry (if
    // any) or the client-side poll times out.
  }

  return new Response(null, { status: 200 });
};
