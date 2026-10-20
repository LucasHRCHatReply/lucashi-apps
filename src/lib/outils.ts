import { getCollection, type CollectionEntry } from 'astro:content';
import type { Categorie } from './schema-fiche';

export type Fiche = CollectionEntry<'outils'>;
export type Lang = 'fr' | 'en';

export const LIBELLES_CATEGORIES: Record<Lang, Record<Categorie, string>> = {
  fr: { images: 'Images', documents: 'Documents', argent: 'Argent', pratique: 'Pratique' },
  en: { images: 'Images', documents: 'Documents', argent: 'Money', pratique: 'Practical' },
};
export const ORDRE_CATEGORIES: Categorie[] = ['images', 'documents', 'argent', 'pratique'];

export const chemin = (f: Fiche) => (f.data.lang === 'fr' ? `/outils/${f.data.slug}/` : `/en/tools/${f.data.slug}/`);
export const cheminHub = (lang: Lang) => (lang === 'fr' ? '/outils/' : '/en/tools/');
export const cheminOg = (f: Fiche) => `/og/${f.data.lang}/${f.data.id}.png`;

export async function fiches(lang?: Lang): Promise<Fiche[]> {
  const toutes = await getCollection('outils');
  return toutes
    .filter((f) => !lang || f.data.lang === lang)
    .sort((a, b) => a.data.nom_court.localeCompare(b.data.nom_court, a.data.lang));
}

/** La fiche du même outil dans l'autre langue, si elle existe. */
export function autreLangue(f: Fiche, toutes: Fiche[]): Fiche | undefined {
  return toutes.find((x) => x.data.id === f.data.id && x.data.lang !== f.data.lang);
}

/** « Autres outils » : trois de la même catégorie d'abord, puis les autres, dans la langue de la page. */
export function autresOutils(f: Fiche, toutes: Fiche[], max = 6): Fiche[] {
  const memeLangue = toutes.filter((x) => x.data.lang === f.data.lang && x.data.id !== f.data.id);
  const proches = memeLangue.filter((x) => x.data.categorie === f.data.categorie).slice(0, 3);
  const reste = memeLangue.filter((x) => !proches.includes(x));
  return [...proches, ...reste].slice(0, max);
}

export function parCategorie(liste: Fiche[]): { categorie: Categorie; fiches: Fiche[] }[] {
  return ORDRE_CATEGORIES.map((categorie) => ({ categorie, fiches: liste.filter((f) => f.data.categorie === categorie) })).filter((g) => g.fiches.length);
}

export const dateLongue = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
