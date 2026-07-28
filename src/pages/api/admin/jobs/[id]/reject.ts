import type { APIRoute } from 'astro';
import { rejectJob } from '../../../../../lib/queries';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  if (params.id) {
    await rejectJob(params.id).catch(() => null);
  }
  return new Response(null, { status: 303, headers: { Location: '/admin/' } });
};
