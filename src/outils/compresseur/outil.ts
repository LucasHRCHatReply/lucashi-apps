// Logique pure du compresseur d'images : formats, dimensions, poids cible. Aucun DOM, aucun codec.
export type Format = 'jpeg' | 'png' | 'webp';
export type ChoixFormat = 'meme' | 'webp' | 'jpeg';

export const TYPES: Record<Format, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const EXTENSIONS: Record<Format, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };
export const QUALITE_MIN = 5;
export const QUALITE_MAX = 95;
export const COTE_MIN = 64; // en dessous, une image n'a plus d'usage : la réduction automatique s'arrête là

/** Format d'entrée d'après le type MIME, sinon l'extension. `avif` et `gif` sont lus mais jamais écrits tels quels. */
export function formatEntree(type: string, nom: string): Format | 'avif' | 'autre' {
  const t = type.toLowerCase();
  const ext = nom.toLowerCase().split('.').pop() ?? '';
  if (t === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (t === 'image/png' || ext === 'png') return 'png';
  if (t === 'image/webp' || ext === 'webp') return 'webp';
  if (t === 'image/avif' || ext === 'avif') return 'avif';
  return 'autre';
}

/** Format de sortie : « identique » garde jpeg/png/webp ; un AVIF ou autre sort en WebP (le plus léger lisible partout). */
export function formatSortie(entree: ReturnType<typeof formatEntree>, choix: ChoixFormat): Format {
  if (choix === 'webp') return 'webp';
  if (choix === 'jpeg') return 'jpeg';
  return entree === 'jpeg' || entree === 'png' || entree === 'webp' ? entree : 'webp';
}

/** « photo.PNG » -> « photo-compresse.webp » */
export function nomSortie(nom: string, format: Format): string {
  const i = nom.lastIndexOf('.');
  const base = i > 0 ? nom.slice(0, i) : nom;
  return `${base}-compresse.${EXTENSIONS[format]}`;
}

/** Dimensions après réduction au côté maximal (le plus grand côté), jamais d'agrandissement. `cote` vide ou 0 = inchangé. */
export function dimensionsCible(largeur: number, hauteur: number, cote: number | null | undefined): { largeur: number; hauteur: number } {
  const max = Math.max(largeur, hauteur);
  if (!cote || cote <= 0 || cote >= max) return { largeur, hauteur };
  const k = cote / max;
  return { largeur: Math.max(1, Math.round(largeur * k)), hauteur: Math.max(1, Math.round(hauteur * k)) };
}

/** Gain en octets et en pourcentage entier (négatif si le fichier grossit). `n/a` si le poids d'origine est inconnu ou nul. */
export function gain(avant: number, apres: number): { octets: number; pourcent: number | null } {
  if (!(avant > 0)) return { octets: 0, pourcent: null };
  return { octets: avant - apres, pourcent: Math.round(((avant - apres) / avant) * 100) };
}

/** Taille lisible : 842 o, 12,4 Ko, 1,38 Mo (Ko = 1000 octets, comme les systèmes de fichiers Apple). */
export function taille(octets: number, lang: 'fr' | 'en' = 'fr'): string {
  const u = lang === 'fr' ? ['o', 'Ko', 'Mo', 'Go'] : ['B', 'KB', 'MB', 'GB'];
  if (octets < 1000) return `${octets} ${u[0]}`;
  let v = octets, i = 0;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  const n = v >= 100 ? Math.round(v).toString() : v.toFixed(v >= 10 ? 1 : 2);
  return `${lang === 'fr' ? n.replace('.', ',') : n} ${u[i]}`;
}

/** Poids cible saisi en Ko -> octets ; null si invalide. */
export function cibleEnOctets(ko: number): number | null {
  return Number.isFinite(ko) && ko >= 5 ? Math.round(ko * 1000) : null;
}

export interface Essai { octets: number; qualite: number; echelle: number }
export interface ResultatCible { atteint: boolean; essai: Essai; essais: number }

/**
 * Cherche le meilleur réglage qui tient sous `cible` octets.
 * 1) dichotomie sur la qualité à taille réelle (la plus haute qualité qui passe) ;
 * 2) si même la qualité minimale dépasse, l'image est réduite par paliers de 15 % (jusqu'à COTE_MIN) et la dichotomie recommence.
 * `encoder(qualite, echelle)` rend le poids produit. `sansQualite` (PNG, sans perte) ne joue que sur l'échelle.
 */
export async function viserPoids(
  encoder: (qualite: number, echelle: number) => Promise<number>,
  cible: number,
  opts: { sansQualite?: boolean; plusGrandCote?: number } = {},
): Promise<ResultatCible> {
  let essais = 0;
  const mesurer = async (q: number, e: number): Promise<Essai> => { essais++; return { octets: await encoder(q, e), qualite: q, echelle: e }; };
  const parQualite = async (echelle: number): Promise<{ ok: Essai | null; dernier: Essai }> => {
    if (opts.sansQualite) { const e = await mesurer(QUALITE_MAX, echelle); return { ok: e.octets <= cible ? e : null, dernier: e }; }
    const haut = await mesurer(QUALITE_MAX, echelle);
    if (haut.octets <= cible) return { ok: haut, dernier: haut };
    const bas = await mesurer(QUALITE_MIN, echelle);
    if (bas.octets > cible) return { ok: null, dernier: bas };
    let b = QUALITE_MIN, h = QUALITE_MAX, meilleur = bas;
    while (h - b > 1) {
      const m = Math.round((b + h) / 2);
      const e = await mesurer(m, echelle);
      if (e.octets <= cible) { b = m; meilleur = e; } else h = m;
    }
    return { ok: meilleur, dernier: meilleur };
  };
  let echelle = 1;
  let dernier: Essai;
  for (;;) {
    const r = await parQualite(echelle);
    dernier = r.dernier;
    if (r.ok) return { atteint: true, essai: r.ok, essais };
    const suivante = echelle * 0.85;
    if (opts.plusGrandCote && opts.plusGrandCote * suivante < COTE_MIN) break;
    if (!opts.plusGrandCote && suivante < 0.1) break;
    echelle = suivante;
  }
  return { atteint: false, essai: dernier, essais };
}

/** Dimensions après application d'une échelle, jamais sous 1 px. */
export const appliquerEchelle = (largeur: number, hauteur: number, echelle: number) => ({
  largeur: Math.max(1, Math.round(largeur * echelle)),
  hauteur: Math.max(1, Math.round(hauteur * echelle)),
});

export interface LigneBilan { avant: number; apres: number }
/** Bilan d'un lot : totaux et gain global. */
export function bilan(lignes: LigneBilan[], lang: 'fr' | 'en' = 'fr'): string {
  const avant = lignes.reduce((s, l) => s + l.avant, 0);
  const apres = lignes.reduce((s, l) => s + l.apres, 0);
  const g = gain(avant, apres);
  const n = lignes.length;
  const pc = g.pourcent === null ? 'n/a' : `${g.pourcent > 0 ? '−' : g.pourcent < 0 ? '+' : ''}${Math.abs(g.pourcent)} %`;
  return lang === 'fr'
    ? `${n} image${n > 1 ? 's' : ''} : ${taille(avant)} → ${taille(apres)} (${pc}, ${taille(Math.abs(g.octets))} ${g.octets >= 0 ? 'gagnés' : 'en plus'})`
    : `${n} image${n > 1 ? 's' : ''}: ${taille(avant, 'en')} → ${taille(apres, 'en')} (${pc}, ${taille(Math.abs(g.octets), 'en')} ${g.octets >= 0 ? 'saved' : 'more'})`;
}
