// Vocal en texte : logique pure (aucun DOM, aucun réseau) — découpage en fenêtres de 30 s, rééchantillonnage, formats de sortie, taux de mots justes.
// Le transcripteur lui-même (Whisper) vit dans worker.ts ; l'interface dans Outil.astro.

export const ECHANTILLONNAGE = 16000;
export const FENETRE_S = 30;
export const RECOUVREMENT_S = 5;
export const DUREE_MAX_S = 30 * 60;

/** Poids affiché à l'écran pour le premier usage : octets réels des fichiers servis (lourds.sh). */
export const POIDS_MODELE = { modele: 79_664_191, moteur: 21_640_503 };

/** Le fichier est-il un Ogg (WhatsApp .opus / .ogg) ? On lit les quatre premiers octets, pas l'extension. */
export function estOgg(octets: Uint8Array): boolean {
  return octets.length > 4 && octets[0] === 0x4f && octets[1] === 0x67 && octets[2] === 0x67 && octets[3] === 0x53;
}

/** Fenêtres de 30 s qui se recouvrent de 5 de chaque côté (pas de 20 s) : les coupes tombent à l'écart des mots. */
export function fenetres(nEchantillons: number): { debut: number; fin: number; dernier: boolean }[] {
  const taille = FENETRE_S * ECHANTILLONNAGE;
  const saut = taille - 2 * RECOUVREMENT_S * ECHANTILLONNAGE;
  const out: { debut: number; fin: number; dernier: boolean }[] = [];
  let debut = 0;
  for (;;) {
    const fin = Math.min(debut + taille, nEchantillons);
    const dernier = debut + taille >= nEchantillons;
    out.push({ debut, fin, dernier });
    if (dernier) break;
    debut += saut;
  }
  return out;
}

/** Mélange les canaux en un seul (moyenne). */
export function enMono(canaux: Float32Array[]): Float32Array {
  if (canaux.length === 1) return canaux[0];
  const n = Math.min(...canaux.map((c) => c.length));
  const out = new Float32Array(n);
  for (const c of canaux) for (let i = 0; i < n; i++) out[i] += c[i];
  for (let i = 0; i < n; i++) out[i] /= canaux.length;
  return out;
}

/** Rééchantillonne en 16 kHz : moyenne par blocs quand le rapport est entier (48 kHz → ×3), sinon interpolation sur une moyenne glissante. */
export function reechantillonner(donnees: Float32Array, de: number, vers = ECHANTILLONNAGE): Float32Array {
  if (de === vers) return donnees;
  const rapport = de / vers;
  const n = Math.floor(donnees.length / rapport);
  const out = new Float32Array(n);
  if (Number.isInteger(rapport)) {
    for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < rapport; k++) s += donnees[i * rapport + k]; out[i] = s / rapport; }
    return out;
  }
  for (let i = 0; i < n; i++) { // moyenne de la fenêtre [i·r, (i+1)·r[ avec poids aux bords
    const a = i * rapport, b = Math.min((i + 1) * rapport, donnees.length);
    let s = 0, poids = 0;
    for (let j = Math.floor(a); j < Math.ceil(b); j++) { const w = Math.min(j + 1, b) - Math.max(j, a); s += donnees[j] * w; poids += w; }
    out[i] = poids ? s / poids : 0;
  }
  return out;
}

export const dureeS = (nEchantillons: number) => nEchantillons / ECHANTILLONNAGE;

/** 75 → « 1:15 » ; 3725 → « 1:02:05 ». */
export function horloge(s: number): string {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const d = (x: number) => String(x).padStart(2, '0');
  return h ? `${h}:${d(m)}:${d(sec)}` : `${m}:${d(sec)}`;
}

/** Octets → « 77 Mo » / « 77 MB » (base 1 000 000, comme l'explorateur de fichiers du Mac). */
export function tailleMo(octets: number, lang: 'fr' | 'en' = 'fr'): string {
  const mo = octets / 1_000_000;
  return `${mo >= 10 ? Math.round(mo) : Math.round(mo * 10) / 10} ${lang === 'fr' ? 'Mo' : 'MB'}`.replace(/(\d)\.(\d)/, lang === 'fr' ? '$1,$2' : '$1.$2');
}

export interface Segment { debut: number; fin: number; texte: string }

const tempsSrt = (s: number) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const d = (x: number, n = 2) => String(x).padStart(n, '0');
  return `${d(Math.floor(ms / 3600000))}:${d(Math.floor((ms % 3600000) / 60000))}:${d(Math.floor((ms % 60000) / 1000))},${d(ms % 1000, 3)}`;
};

/** Sous-titres .srt à partir des segments horodatés. */
export function versSrt(segments: Segment[]): string {
  return segments.filter((s) => s.texte.trim()).map((s, i) => `${i + 1}\n${tempsSrt(s.debut)} --> ${tempsSrt(s.fin)}\n${s.texte.trim()}\n`).join('\n');
}

/** Texte continu : segments recollés, espaces propres. */
export function versTexte(segments: Segment[]): string {
  const t = segments.map((s) => s.texte.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const net = t.startsWith('«') && !t.includes('»') ? t.slice(1).trim() : t; // Whisper ouvre parfois un guillemet qu'il ne ferme pas
  return net.charAt(0).toUpperCase() + net.slice(1);
}

/** Nom lisible d'une langue (code ISO « fr » → « français »). */
export function nomLangue(code: string, interface_: 'fr' | 'en' = 'fr'): string {
  try { return new Intl.DisplayNames([interface_], { type: 'language' }).of(code) ?? code; } catch { return code; }
}

/** Nom des fichiers produits : « memo.m4a » → « memo.txt ». */
export function nomSortie(nom: string, ext: 'txt' | 'srt'): string {
  const base = nom.replace(/\.[^./\\]+$/, '');
  return `${base || 'vocal'}.${ext}`;
}

const mots = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

/** Taux de mots justes : 1 − (distance d'édition sur les mots / mots de référence). Casse, accents et ponctuation ignorés. */
export function motsJustes(reference: string, obtenu: string): number {
  const a = mots(reference), b = mots(obtenu);
  if (!a.length) return NaN;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return Math.max(0, 1 - prev[b.length] / a.length);
}

export const EXTENSIONS_ACCEPTEES = 'audio/*,video/*,.opus,.ogg,.oga,.m4a,.mp3,.wav,.aac,.flac,.amr,.mp4,.mov,.webm,.mkv,.3gp';
