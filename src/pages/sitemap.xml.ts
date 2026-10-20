import type { APIRoute } from 'astro';
import { fiches, chemin, cheminHub, autreLangue } from '../lib/outils';
import { toutesLesApps } from '../lib/apps';
import { url } from '../lib/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
interface Entree { loc: string; alt?: { fr?: string; en?: string } }

export const GET: APIRoute = async () => {
  const toutes = await fiches();
  const entrees: Entree[] = [
    { loc: '/' },
    ...toutesLesApps.map((a) => ({ loc: '/' + a.page })),
    { loc: cheminHub('fr'), alt: { fr: cheminHub('fr'), en: cheminHub('en') } },
    { loc: cheminHub('en'), alt: { fr: cheminHub('fr'), en: cheminHub('en') } },
    { loc: '/en/', alt: { fr: '/', en: '/en/' } },
    ...toutes.map((f) => {
      const autre = autreLangue(f, toutes);
      return { loc: chemin(f), alt: { [f.data.lang]: chemin(f), ...(autre ? { [autre.data.lang]: chemin(autre) } : {}) } as Entree['alt'] };
    }),
  ];
  const lignes = entrees.map((e) => {
    const liens = e.alt
      ? Object.entries(e.alt).map(([l, p]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(url(p as string))}"/>`)
          .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(url((e.alt.fr ?? e.alt.en) as string))}"/>`)
      : [];
    return `  <url>\n    <loc>${esc(url(e.loc))}</loc>${liens.length ? '\n' + liens.join('\n') : ''}\n  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${lignes.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
