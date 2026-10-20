// Logique pure de l'outil « image en texte » : aucun DOM, testable seule.
// La reconnaissance elle-même (tesseract.js) est pilotée par Outil.astro ; ici : langues, réglages,
// nettoyage du texte, mesure de qualité et zones à surligner.

export type Langue = 'fra' | 'eng' | 'fra+eng';
export const LANGUES: Langue[] = ['fra', 'eng', 'fra+eng'];

/** Dossier des fichiers servis par le site (cœur wasm, worker, données de langue) : aucun CDN. */
export const DOSSIER_ASSETS = '/outils-assets/ocr';

/** Côté le plus long accepté avant réduction : au-delà, la mémoire du téléphone souffre sans gain de lecture. */
export const COTE_MAX = 3200;

/** Langue proposée au départ d'après la langue de la page ou du navigateur. */
export function langueParDefaut(lang: 'fr' | 'en'): Langue {
  return lang === 'en' ? 'eng' : 'fra';
}

/** Réduit des dimensions (entières) pour que le côté le plus long ne dépasse pas `max`, sans jamais agrandir. */
export function dimensionsReduites(largeur: number, hauteur: number, max = COTE_MAX): { largeur: number; hauteur: number; facteur: number } {
  const plus = Math.max(largeur, hauteur);
  if (plus <= max) return { largeur, hauteur, facteur: 1 };
  const facteur = max / plus;
  return { largeur: Math.max(1, Math.round(largeur * facteur)), hauteur: Math.max(1, Math.round(hauteur * facteur)), facteur };
}

/**
 * Recolle les lignes d'un même paragraphe (une capture coupe les lignes à la largeur de la fenêtre).
 * Une ligne vide sépare deux paragraphes ; un mot coupé par un trait d'union en fin de ligne est reformé
 * (« exem-\nple » → « exemple ») seulement si la ligne suivante commence par une minuscule.
 * Les listes (« - », « • », « 1. ») gardent une ligne par élément.
 */
export function recollerParagraphes(texte: string): string {
  const lignes = texte.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/g, ''));
  const puce = /^\s*(?:[-–—•·*▪◦]|\d{1,3}[.)])\s+/u;
  const paragraphes: string[] = [];
  let courant = '';
  const clore = () => { if (courant) paragraphes.push(courant); courant = ''; };
  for (const brute of lignes) {
    const l = brute.trim();
    if (!l) { clore(); continue; }
    if (puce.test(l)) { clore(); courant = l; continue; }
    if (!courant) { courant = l; continue; }
    if (/[\p{L}]-$/u.test(courant) && /^\p{Ll}/u.test(l)) courant = courant.slice(0, -1) + l;
    else courant += ' ' + l;
  }
  clore();
  return paragraphes.join('\n\n');
}

/** Distance de Levenshtein entre deux chaînes (par caractères Unicode). */
export function distance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prec = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prec = cur;
  }
  return prec[y.length];
}

const blancs = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Part de caractères justes (0 à 1) du texte lu par rapport au texte attendu, espaces normalisés ; n/a si la référence est vide. */
export function tauxCaracteresJustes(attendu: string, lu: string): number | null {
  const ref = blancs(attendu);
  if (!ref) return null;
  return Math.max(0, 1 - distance(ref, blancs(lu)) / [...ref].length);
}

export interface Mot { texte: string; confiance: number; x0: number; y0: number; x1: number; y1: number }

/** Mots à surligner : on écarte les boîtes vides ou de surface nulle. */
export function motsValides(mots: Mot[] | undefined): Mot[] {
  return (mots ?? []).filter((m) => m.texte.trim() && m.x1 > m.x0 && m.y1 > m.y0);
}

/** Boîte d'un mot en pourcentages de l'image, pour un surlignage qui suit n'importe quelle taille d'affichage. */
export function boiteEnPourcent(m: Mot, largeur: number, hauteur: number): { gauche: number; haut: number; largeur: number; hauteur: number } {
  return {
    gauche: (m.x0 / largeur) * 100,
    haut: (m.y0 / hauteur) * 100,
    largeur: ((m.x1 - m.x0) / largeur) * 100,
    hauteur: ((m.y1 - m.y0) / hauteur) * 100,
  };
}

/** Confiance moyenne du moteur (0 à 100) sur les mots lus ; n/a (null) s'il n'y en a pas. */
export function confianceMoyenne(mots: Mot[]): number | null {
  if (!mots.length) return null;
  return mots.reduce((s, m) => s + m.confiance, 0) / mots.length;
}

/** Libellé de progression honnête : le pourcentage n'est affiché que pour la reconnaissance, la seule étape mesurée. */
export function etatProgression(statut: string, progression: number, lang: 'fr' | 'en'): { texte: string; valeur: number | null } {
  const fr = lang === 'fr';
  const pct = Math.round(Math.min(1, Math.max(0, progression)) * 100);
  if (statut === 'recognizing text') return { texte: fr ? `Lecture ${pct} %` : `Reading ${pct}%`, valeur: pct };
  if (statut.startsWith('loading language')) return { texte: fr ? 'Chargement de la langue' : 'Loading language', valeur: null };
  if (statut.startsWith('loading tesseract')) return { texte: fr ? 'Chargement du moteur' : 'Loading engine', valeur: null };
  return { texte: fr ? 'Préparation' : 'Preparing', valeur: null };
}
