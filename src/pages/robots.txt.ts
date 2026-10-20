import type { APIRoute } from 'astro';
import { INDEXABLE, url } from '../lib/site';

// Tant que INDEXABLE n'est pas « true » : tout est interdit aux robots.
export const GET: APIRoute = () => {
  const corps = INDEXABLE
    ? `User-agent: *\nAllow: /\n\nSitemap: ${url('/sitemap.xml')}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(corps, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
