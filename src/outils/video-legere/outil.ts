// Vidéo légère : logique pure (aucun DOM). Calcule le débit à viser pour tenir sous un poids cible,
// choisit la définition de sortie, estime poids et temps, et prépare la passe suivante si le résultat est trop lourd.

export type Destination = 'whatsapp' | 'mail';

/** Poids cibles en octets (1 Mo = 1 048 576 octets, comme l'affiche Finder). */
export const CIBLES: Record<Destination, number> = { whatsapp: 16 * 1048576, mail: 25 * 1048576 };

/** Marge de sécurité : on vise 95 % de la cible, l'encodeur dépasse rarement de plus de quelques pour cent. */
export const MARGE = 0.95;
/** Débit audio réservé (bits/s). Descend à 64 000 quand le budget est très serré. */
export const DEBIT_AUDIO = 96_000;
export const DEBIT_AUDIO_BAS = 64_000;
/** Débit de l'extraction « son seul » (bits/s). */
export const DEBIT_SON = 128_000;
/** Plancher de débit vidéo : en dessous, l'image n'est plus regardable. */
export const DEBIT_VIDEO_MIN = 150_000;
/** Images par seconde maximum en sortie (au-delà, l'œil gagne peu et le débit s'étale). */
export const FPS_MAX = 30;
/** Échelle de définitions essayées, de la plus haute à la plus basse (hauteur du petit côté). */
export const ECHELLE = [1080, 720, 480, 360] as const;

export interface Source {
  duree: number;       // secondes
  largeur: number;     // pixels affichés (rotation appliquée)
  hauteur: number;
  fps: number;
  octets: number;
  aAudio: boolean;
}

export interface Plan {
  debitVideo: number;  // bits/s
  debitAudio: number;  // bits/s
  petitCote: number;   // hauteur visée du petit côté (px)
  largeur: number;     // dimensions de sortie, paires
  hauteur: number;
  fps: number;
  octetsEstimes: number;
  reduit: boolean;     // la définition est plus basse que la source
}

const pair = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Débit minimal (bits/s) pour qu'une image H.264 reste propre : ~0,03 bit par pixel et par image. */
export function debitMinimal(largeur: number, hauteur: number, fps: number): number {
  return Math.round(largeur * hauteur * Math.min(fps, FPS_MAX) * 0.03);
}

/** Dimensions pour un petit côté donné, sans jamais agrandir. */
export function dimensions(largeur: number, hauteur: number, petitCote: number): { largeur: number; hauteur: number } {
  const p = Math.min(largeur, hauteur);
  if (petitCote >= p) return { largeur: pair(largeur), hauteur: pair(hauteur) };
  const k = petitCote / p;
  return { largeur: pair(largeur * k), hauteur: pair(hauteur * k) };
}

/**
 * Plan d'encodage pour tenir sous `cible` octets.
 * `facteur` (≤ 1) réduit le budget pour une passe de rattrapage ; `plafondPetitCote` interdit les définitions plus hautes.
 */
export function planifier(s: Source, cible: number, facteur = 1, plafondPetitCote = Infinity): Plan {
  const duree = Math.max(s.duree, 0.1);
  const budget = (cible * 8 * MARGE * facteur) / duree; // bits/s pour tout le fichier
  let debitAudio = s.aAudio ? DEBIT_AUDIO : 0;
  if (s.aAudio && budget - debitAudio < DEBIT_VIDEO_MIN * 3) debitAudio = DEBIT_AUDIO_BAS;
  const debitVideo = Math.max(DEBIT_VIDEO_MIN, Math.floor(budget - debitAudio));
  const fps = Math.min(Math.round(s.fps) || 30, FPS_MAX);
  const petitSource = Math.min(s.largeur, s.hauteur);
  const departs = [Math.min(petitSource, plafondPetitCote), ...ECHELLE.filter((h) => h < petitSource && h <= plafondPetitCote)];
  const echelle = [...new Set(departs)].sort((a, b) => b - a);
  let choix = echelle[echelle.length - 1];
  for (const h of echelle) {
    const d = dimensions(s.largeur, s.hauteur, h);
    if (debitVideo >= debitMinimal(d.largeur, d.hauteur, fps)) { choix = h; break; }
  }
  const d = dimensions(s.largeur, s.hauteur, choix);
  // Le fichier ne peut pas dépasser ce que la source contient : on ne gonfle jamais un petit fichier.
  const debitSource = s.octets > 0 ? Math.floor((s.octets * 8) / duree) : Infinity;
  const debitVideoFinal = Math.min(debitVideo, Math.max(DEBIT_VIDEO_MIN, Math.floor(debitSource * 0.9) - debitAudio));
  return {
    debitVideo: debitVideoFinal, debitAudio, petitCote: choix, largeur: d.largeur, hauteur: d.hauteur, fps,
    octetsEstimes: Math.round(((debitVideoFinal + debitAudio) * duree) / 8),
    reduit: choix < petitSource,
  };
}

/**
 * Passe suivante si le fichier produit dépasse la cible.
 * - Dépassement modéré : le budget est réduit d'après le dépassement mesuré, définition inchangée ou plafonnée.
 * - Dépassement énorme (> 1,5 × ce que le débit demandé aurait dû donner) : l'encodeur n'a pas tenu le débit à cette définition
 *   (image très bruitée, encodeur matériel) ; on descend d'un palier de définition au lieu de rogner le débit.
 */
export function repasse(s: Source, cible: number, dernier: Plan, octetsObtenus: number, facteurPrecedent: number): { plan: Plan; facteur: number } {
  if (octetsObtenus > dernier.octetsEstimes * 1.5) {
    const plus_bas = ECHELLE.filter((h) => h < dernier.petitCote);
    const plafond = plus_bas.length ? plus_bas[0] : dernier.petitCote;
    const facteur = facteurPrecedent * 0.97;
    return { plan: planifier(s, cible, facteur, plafond), facteur };
  }
  const facteur = facteurPrecedent * Math.max(0.6, Math.min(0.92, (cible * MARGE) / octetsObtenus) * 0.97);
  return { plan: planifier(s, cible, facteur, dernier.petitCote), facteur };
}

// --- Temps estimé -----------------------------------------------------------------------------------------------
/** Pixels traités par seconde, mesurés le 21/10/2026 sur Mac Apple silicon (essai 70 s 1080p : WebCodecs 38 s, ffmpeg.wasm 10 s de 1080p en 24 s) ; ordre de grandeur annoncé avant le calcul. */
export const DEBIT_TRAITEMENT = { webcodecs: 80_000_000, ffmpeg: 22_000_000 } as const;

export function tempsEstime(s: Source, plan: Plan, chemin: keyof typeof DEBIT_TRAITEMENT): number {
  const images = s.duree * plan.fps;
  const pixelsSource = s.largeur * s.hauteur;
  // décodage au format source + encodage au format de sortie : la source pèse davantage
  const pixels = images * (pixelsSource * 0.5 + plan.largeur * plan.hauteur * 0.5);
  return Math.max(1, Math.round(pixels / DEBIT_TRAITEMENT[chemin]));
}

// --- Affichage -------------------------------------------------------------------------------------------------
export function formaterDuree(sec: number, fr = true): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return fr ? `${r} s` : `${r} s`;
  return `${m} min ${String(r).padStart(2, '0')} s`;
}

export function formaterPoids(octets: number, fr = true): string {
  const unite = fr ? ['o', 'Ko', 'Mo', 'Go'] : ['B', 'KB', 'MB', 'GB'];
  let v = octets, i = 0;
  while (v >= 1048576 && i < 3) { v /= 1024; i++; }
  if (i === 0 && v >= 1024) { v /= 1024; i = 1; }
  if (v >= 1024 && i < 3) { v /= 1024; i++; }
  const n = v >= 100 || i === 0 ? Math.round(v).toString() : v.toFixed(1);
  return `${fr ? n.replace('.', ',') : n} ${unite[i]}`;
}

export function nomSortie(nom: string, son: boolean): string {
  const base = nom.replace(/\.[^./\\]+$/, '') || 'video';
  return son ? `${base}-son.m4a` : `${base}-leger.mp4`;
}

export const EXTENSIONS = /\.(mov|mp4|m4v|webm|mkv|3gp)$/i;
