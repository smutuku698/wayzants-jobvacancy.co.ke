import type { APIRoute } from 'astro';
import { archiveInquiry } from '../../../../../lib/queries';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  if (params.id) {
    await archiveInquiry(params.id).catch(() => null);
  }
  return new Response(null, { status: 303, headers: { Location: '/admin/inquiries/' } });
};
