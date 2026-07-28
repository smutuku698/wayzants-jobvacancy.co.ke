import type { APIRoute } from 'astro';
import { approveJob } from '../../../../../lib/queries';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  if (params.id) {
    await approveJob(params.id).catch(() => null);
  }
  return new Response(null, { status: 303, headers: { Location: '/admin/' } });
};
