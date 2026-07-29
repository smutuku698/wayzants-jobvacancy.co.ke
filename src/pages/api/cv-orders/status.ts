import type { APIRoute } from 'astro';
import { isCvOrderReference, promoteCvOrderDraft } from '../../../lib/cv-orders';
import { verifyCharge } from '../../../lib/payments';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const reference = url.searchParams.get('ref');
  if (!reference || !isCvOrderReference(reference)) {
    return new Response(JSON.stringify({ status: null }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const respond = (status: string) => new Response(JSON.stringify({ status }), { headers: { 'Content-Type': 'application/json' } });

  // Already promoted (by the webhook, or a previous poll) — cheap DB check before touching Paystack.
  let alreadyPromoted = false;
  try {
    const { data } = await getSupabaseAdmin().from('cv_orders').select('id').eq('payment_reference', reference).maybeSingle();
    alreadyPromoted = !!data;
  } catch {
    alreadyPromoted = false;
  }
  if (alreadyPromoted) return respond('paid');

  const verified = await verifyCharge(reference).catch(() => 'unknown' as const);
  if (verified === 'success') {
    await promoteCvOrderDraft(reference).catch(() => null);
    return respond('paid');
  }
  if (verified === 'failed') return respond('failed');
  return respond('pending');
};
