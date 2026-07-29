import type { APIRoute } from 'astro';
import { updateCvOrderStatus } from '../../../../../lib/queries';
import type { CvOrderStatus } from '../../../../../lib/types';

export const prerender = false;

const VALID_STATUSES = new Set<CvOrderStatus>(['new', 'in_progress', 'delivered', 'archived']);

export const POST: APIRoute = async ({ params, request }) => {
  const formData = await request.formData().catch(() => null);
  const status = formData?.get('status') as CvOrderStatus | null;
  const redirectTab = (formData?.get('from') as string | null) || 'new';

  if (params.id && status && VALID_STATUSES.has(status)) {
    await updateCvOrderStatus(params.id, status).catch(() => null);
  }
  return new Response(null, { status: 303, headers: { Location: `/admin/cv-orders/?tab=${redirectTab}` } });
};
