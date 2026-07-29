import type { APIRoute } from 'astro';
import { getJobPaymentStatusByReference } from '../../../lib/queries';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const reference = url.searchParams.get('ref');
  if (!reference) {
    return new Response(JSON.stringify({ status: null }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const status = await getJobPaymentStatusByReference(reference).catch(() => null);
  return new Response(JSON.stringify({ status }), { headers: { 'Content-Type': 'application/json' } });
};
