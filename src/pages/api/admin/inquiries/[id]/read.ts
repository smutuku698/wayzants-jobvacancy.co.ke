import type { APIRoute } from 'astro';
import { markInquiryRead } from '../../../../../lib/queries';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  if (params.id) {
    await markInquiryRead(params.id).catch(() => null);
  }
  return new Response(null, { status: 303, headers: { Location: '/admin/inquiries/' } });
};
