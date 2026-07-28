import { defineMiddleware } from 'astro:middleware';
import { getEnv } from './lib/env';

export const onRequest = defineMiddleware(async (context, next) => {
  const isProtected = context.url.pathname.startsWith('/admin') || context.url.pathname.startsWith('/api/admin');
  if (!isProtected) return next();

  const env = getEnv();
  const expected = `Basic ${btoa(`admin:${env.ADMIN_PASSWORD}`)}`;
  const provided = context.request.headers.get('Authorization');

  if (provided !== expected) {
    return new Response('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="JobVacancy Admin"' },
    });
  }

  return next();
});
