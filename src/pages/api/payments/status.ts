import type { APIRoute } from 'astro';
import { getJobPaymentByReference, markJobPaymentPaid, markJobPaymentFailed } from '../../../lib/queries';
import { verifyCharge } from '../../../lib/payments';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const reference = url.searchParams.get('ref');
  if (!reference) {
    return new Response(JSON.stringify({ status: null }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const job = await getJobPaymentByReference(reference).catch(() => null);
  if (!job) {
    return new Response(JSON.stringify({ status: null }), { headers: { 'Content-Type': 'application/json' } });
  }

  // The webhook is the fast path, but it can be delayed or dropped — never
  // trust it alone. While our own record still shows 'pending', ask Paystack
  // directly so a slow/missing webhook doesn't strand the customer on a
  // "waiting" screen after they've actually already paid.
  if (job.payment_status === 'pending') {
    const verified = await verifyCharge(reference).catch(() => 'unknown' as const);
    if (verified === 'success') {
      await markJobPaymentPaid(reference, job.pricing_tier).catch(() => null);
      return new Response(JSON.stringify({ status: 'paid' }), { headers: { 'Content-Type': 'application/json' } });
    }
    if (verified === 'failed') {
      await markJobPaymentFailed(reference).catch(() => null);
      return new Response(JSON.stringify({ status: 'failed' }), { headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ status: job.payment_status }), { headers: { 'Content-Type': 'application/json' } });
};
