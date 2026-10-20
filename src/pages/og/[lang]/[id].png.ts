// Image de partage (1200x630) d'un outil, générée à la construction : fond du site + nom de l'outil.
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { fiches, LIBELLES_CATEGORIES, type Fiche } from '../../../lib/outils';

export const getStaticPaths = (async () => {
  const liste = await fiches();
  return liste.map((fiche) => ({ params: { lang: fiche.data.lang, id: fiche.data.id }, props: { fiche } }));
}) satisfies GetStaticPaths;

const police = (poids: string) => readFileSync(join(process.cwd(), `node_modules/@fontsource/inter/files/inter-latin-${poids}-normal.woff`));
let polices: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | undefined;

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });
// Inter (sous-ensemble latin) n'a pas la flèche : on la remplace.
const nettoyer = (s: string) => s.replace(/→/g, '>').replace(/’/g, "'");

export const GET: APIRoute = async ({ props }) => {
  const { fiche } = props as { fiche: Fiche };
  polices ??= [
    { name: 'Inter', data: police('400'), weight: 400, style: 'normal' },
    { name: 'Inter', data: police('700'), weight: 700, style: 'normal' },
  ];
  const d = fiche.data;
  const fond = [
    'radial-gradient(circle at 8% 0%, #ff4fa8 0%, rgba(255,79,168,0) 46%)',
    'radial-gradient(circle at 100% 30%, #2fb1ff 0%, rgba(47,177,255,0) 50%)',
    'radial-gradient(circle at 30% 110%, #ffa63d 0%, rgba(255,166,61,0) 48%)',
    'radial-gradient(circle at 95% 105%, #7a55ff 0%, rgba(122,85,255,0) 42%)',
  ].join(',');
  const arbre = el('div', { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, backgroundColor: '#16227a', backgroundImage: fond, fontFamily: 'Inter', color: '#fff' }, [
    el('div', { display: 'flex', fontSize: 30, fontWeight: 700, opacity: 0.95 }, d.lang === 'fr' ? 'Apps de Lucas · Outils gratuits' : "Lucas's apps · Free tools"),
    el('div', { display: 'flex', flexDirection: 'column', padding: '40px 48px', borderRadius: 40, backgroundColor: 'rgba(8,12,40,0.62)', border: '2px solid rgba(255,255,255,0.25)' }, [
      el('div', { display: 'flex', fontSize: 26, fontWeight: 400, opacity: 0.9, marginBottom: 14 }, nettoyer(LIBELLES_CATEGORIES[d.lang][d.categorie]).toUpperCase()),
      el('div', { display: 'flex', fontSize: 74, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }, nettoyer(d.nom_court)),
      el('div', { display: 'flex', fontSize: 32, fontWeight: 400, marginTop: 18, opacity: 0.95 }, nettoyer(d.phrase)),
    ]),
    el('div', { display: 'flex', fontSize: 26, fontWeight: 400, opacity: 0.9 }, d.serveur ? (d.lang === 'fr' ? 'Gratuit · rien n’est conservé' : 'Free · nothing is stored') : d.calcul ? (d.lang === 'fr' ? 'Gratuit · sans inscription' : 'Free · no sign-up') : (d.lang === 'fr' ? 'Gratuit · traité sur votre appareil' : 'Free · processed on your device')),
  ]);
  const svg = await satori(arbre as never, { width: 1200, height: 630, fonts: polices });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
