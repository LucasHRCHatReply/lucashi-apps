// Logique pure de « Photo prête à envoyer » : aucun DOM. Lecture de ce qui sera retiré (EXIF, GPS, appareil, XMP),
// destinations, poids visé, vérification qu'un JPG produit ne porte plus aucune métadonnée.
// Réutilise en lecture seule : ../heic-jpg/outil (nature, extraireExif HEIC) et ../compresseur/outil (taille, gain).
import { extraireExif, nature } from '../heic-jpg/outil';
export { nature };
export { taille, gain } from '../compresseur/outil';

export type DestId = 'formulaire' | 'mail' | 'leboncoin' | 'allege';
export interface Destination {
  id: DestId;
  /** Poids maximal en octets (1 Mo = 1 000 000 o : marge sous les 1 048 576 o d'un « 1 Mo » binaire), ou null. */
  cible: number | null;
  /** Plus grand côté maximal en pixels, ou null. */
  cote: number | null;
  /** Qualité fixe quand il n'y a pas de poids visé. */
  qualite: number;
}
// Leboncoin : aucun plafond officiel trouvé (recherche du 20/10/2026, l'aide du site ne donne pas de chiffre) ;
// 2 Mo et 1600 px sont des valeurs prudentes qui passent le formulaire d'annonce, pas une limite documentée.
export const DESTINATIONS: Record<DestId, Destination> = {
  formulaire: { id: 'formulaire', cible: 1_000_000, cote: null, qualite: 85 },
  mail: { id: 'mail', cible: 2_000_000, cote: null, qualite: 85 },
  leboncoin: { id: 'leboncoin', cible: 2_000_000, cote: 1600, qualite: 85 },
  allege: { id: 'allege', cible: null, cote: null, qualite: 85 },
};

/** Poids visé effectif : si la photo est déjà sous la cible, on vise 5 % sous son poids pour que le résultat ne grossisse pas. */
export function cibleEffective(cible: number, original: number): number {
  return original > 0 && original <= cible ? Math.floor(original * 0.95) : cible;
}

// ---------- lecture TIFF / EXIF ----------
export interface Metadonnees {
  appareil: string | null;
  date: string | null;
  logiciel: string | null;
  gps: { lat: number; lon: number } | null;
  orientation: number | null;
  /** Un bloc XMP est présent (JPEG). */
  xmp: boolean;
  /** Un bloc EXIF est présent, même vide d'intérêt. */
  exif: boolean;
}
export const AUCUNE: Metadonnees = { appareil: null, date: null, logiciel: null, gps: null, orientation: null, xmp: false, exif: false };

const quatre = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const ascii = (b: Uint8Array, o: number, n: number) => {
  let s = '';
  for (let i = 0; i < n && o + i < b.length; i++) s += String.fromCharCode(b[o + i]);
  return s;
};
const egal = (b: Uint8Array, o: number, s: string) => ascii(b, o, s.length) === s;

interface Entree { tag: number; type: number; n: number; pos: number }
function lecteurTiff(t: Uint8Array) {
  const petit = t[0] === 0x49;
  const u16 = (o: number) => (o + 2 > t.length ? 0 : petit ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1]);
  const u32 = (o: number) => (o + 4 > t.length ? 0 : (petit ? t[o] | (t[o + 1] << 8) | (t[o + 2] << 16) | (t[o + 3] << 24) : (t[o] << 24) | (t[o + 1] << 16) | (t[o + 2] << 8) | t[o + 3]) >>> 0);
  const ifd = (o: number): Entree[] => {
    const liste: Entree[] = [];
    if (!o || o + 2 > t.length) return liste;
    const n = Math.min(u16(o), 512);
    for (let i = 0; i < n; i++) {
      const e = o + 2 + i * 12;
      if (e + 12 > t.length) break;
      const type = u16(e + 2), compte = u32(e + 4);
      const taille = compte * ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 } as Record<number, number>)[type];
      liste.push({ tag: u16(e), type, n: compte, pos: taille > 4 ? u32(e + 8) : e + 8 });
    }
    return liste;
  };
  const texte = (e?: Entree) => (e && e.type === 2 ? ascii(t, e.pos, e.n).replace(/\0.*$/s, '').trim() || null : null);
  const rationnels = (e?: Entree): number[] | null => {
    if (!e || e.type !== 5 || e.n < 1 || e.n > 6) return null;
    const v: number[] = [];
    for (let i = 0; i < e.n; i++) { const d = u32(e.pos + i * 8 + 4); v.push(d ? u32(e.pos + i * 8) / d : 0); }
    return v;
  };
  return { petit, u16, u32, ifd, texte, rationnels };
}

/** Lit ce qui compte dans un bloc TIFF (EXIF). Un bloc illisible rend ce qui a pu être lu, jamais d'exception. */
export function lireTiff(t: Uint8Array): Metadonnees {
  const r: Metadonnees = { ...AUCUNE, exif: true };
  try {
    if (t.length < 8 || !((t[0] === 0x49 && t[1] === 0x49) || (t[0] === 0x4d && t[1] === 0x4d))) return r;
    const L = lecteurTiff(t);
    const ifd0 = L.ifd(L.u32(4));
    const par = (liste: Entree[], tag: number) => liste.find((e) => e.tag === tag);
    const make = L.texte(par(ifd0, 0x010f)), model = L.texte(par(ifd0, 0x0110));
    r.appareil = model ? (make && !/^apple$/i.test(make) && !model.toLowerCase().includes(make.toLowerCase().split(' ')[0]) ? `${make} ${model}` : model) : make;
    r.logiciel = L.texte(par(ifd0, 0x0131));
    const o = par(ifd0, 0x0112);
    r.orientation = o ? L.u16(o.pos) : null;
    const sous = par(ifd0, 0x8769);
    if (sous) {
      const ex = L.ifd(L.u32(sous.pos));
      r.date = L.texte(par(ex, 0x9003)) ?? L.texte(par(ex, 0x9004));
    }
    r.date ??= L.texte(par(ifd0, 0x0132));
    const g = par(ifd0, 0x8825);
    if (g) {
      const gi = L.ifd(L.u32(g.pos));
      const la = L.rationnels(par(gi, 2)), lo = L.rationnels(par(gi, 4));
      if (la && lo && la.length === 3 && lo.length === 3) {
        const lat = (la[0] + la[1] / 60 + la[2] / 3600) * (L.texte(par(gi, 1)) === 'S' ? -1 : 1);
        const lon = (lo[0] + lo[1] / 60 + lo[2] / 3600) * (L.texte(par(gi, 3)) === 'W' ? -1 : 1);
        if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) r.gps = { lat, lon };
      }
    }
  } catch { /* on rend ce qu'on a */ }
  return r;
}

const XMP_JPEG = 'http://ns.adobe.com/xap/1.0/';
/** Lit les métadonnées d'un fichier image (JPEG, HEIC, PNG, WebP) d'après ses octets. */
export function lireMetadonnees(b: Uint8Array): Metadonnees {
  const n = nature(b);
  try {
    if (n === 'heic') { const t = extraireExif(b); return t ? lireTiff(t) : { ...AUCUNE }; }
    if (n === 'jpeg') {
      let r: Metadonnees = { ...AUCUNE }, xmp = false;
      for (const s of segmentsJpeg(b)) {
        if (s.marqueur === 0xe1 && egal(b, s.debut, 'Exif\0\0') && !r.exif) r = lireTiff(b.subarray(s.debut + 6, s.fin));
        else if (s.marqueur === 0xe1 && egal(b, s.debut, XMP_JPEG)) xmp = true;
      }
      return { ...r, xmp };
    }
    if (n === 'png') {
      for (let o = 8; o + 12 <= b.length;) {
        const len = ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
        if (quatre(b, o + 4) === 'eXIf') return lireTiff(b.subarray(o + 8, o + 8 + len));
        o += 12 + len;
      }
    }
    if (n === 'webp') {
      for (let o = 12; o + 8 <= b.length;) {
        const len = b[o + 4] | (b[o + 5] << 8) | (b[o + 6] << 16) | (b[o + 7] << 24);
        if (quatre(b, o) === 'EXIF') { const d = egal(b, o + 8, 'Exif\0\0') ? 6 : 0; return lireTiff(b.subarray(o + 8 + d, o + 8 + len)); }
        o += 8 + len + (len & 1);
      }
    }
  } catch { /* fichier abîmé : rien à lire */ }
  return { ...AUCUNE };
}

// ---------- marqueurs JPEG ----------
export interface SegmentJpeg { marqueur: number; /** début du contenu (après la longueur) */ debut: number; fin: number }
/** Parcourt les segments d'un JPEG jusqu'au début des données (SOS). */
export function segmentsJpeg(b: Uint8Array): SegmentJpeg[] {
  const l: SegmentJpeg[] = [];
  if (b[0] !== 0xff || b[1] !== 0xd8) return l;
  let o = 2;
  while (o + 4 <= b.length && b[o] === 0xff) {
    const m = b[o + 1];
    if (m === 0xff) { o++; continue; }
    if (m === 0xda || m === 0xd9) break;
    const len = (b[o + 2] << 8) | b[o + 3];
    l.push({ marqueur: m, debut: o + 4, fin: o + 2 + len });
    o += 2 + len;
  }
  return l;
}

/**
 * Segments de métadonnées d'un JPEG : APP1 (Exif, XMP), APP13 (Photoshop/IPTC), commentaires (COM), et tout APPn hors JFIF (APP0) et profil de couleur ICC (APP2 « ICC_PROFILE »).
 * Un JPG « propre » rend une liste vide.
 */
export function segmentsMetadonnees(b: Uint8Array): string[] {
  const trouves: string[] = [];
  for (const s of segmentsJpeg(b)) {
    if (s.marqueur === 0xfe) trouves.push('COM');
    else if (s.marqueur === 0xe1) trouves.push(egal(b, s.debut, 'Exif') ? 'APP1 Exif' : egal(b, s.debut, XMP_JPEG) ? 'APP1 XMP' : 'APP1');
    else if (s.marqueur >= 0xe3 && s.marqueur <= 0xef) trouves.push(`APP${s.marqueur - 0xe0}`);
    else if (s.marqueur === 0xe2 && !egal(b, s.debut, 'ICC_PROFILE')) trouves.push('APP2');
  }
  return trouves;
}

// ---------- affichage ----------
const nombre = (v: number, lang: 'fr' | 'en') => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
/** « 48,856° N, 2,352° E » */
export function formaterGps(g: { lat: number; lon: number }, lang: 'fr' | 'en' = 'fr'): string {
  return `${nombre(Math.abs(g.lat), lang)}° ${g.lat >= 0 ? 'N' : 'S'}, ${nombre(Math.abs(g.lon), lang)}° ${g.lon >= 0 ? 'E' : lang === 'fr' ? 'O' : 'W'}`;
}
/** Lien OpenStreetMap que l'utilisateur ouvre lui-même ; aucune requête n'est faite par l'outil. */
export const lienCarte = (g: { lat: number; lon: number }) =>
  `https://www.openstreetmap.org/?mlat=${g.lat.toFixed(5)}&mlon=${g.lon.toFixed(5)}#map=15/${g.lat.toFixed(5)}/${g.lon.toFixed(5)}`;

/** « 2026:10:20 14:30:00 » -> « 20/10/2026 » (ou 2026-10-20 en anglais). */
export function formaterDate(d: string, lang: 'fr' | 'en' = 'fr'): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(d);
  if (!m) return null;
  return lang === 'fr' ? `${m[3]}/${m[2]}/${m[1]}` : `${m[1]}-${m[2]}-${m[3]}`;
}

/** Phrases « retiré » vraies de cette photo : seulement ce qu'elle contenait réellement. */
export function phrasesRetire(m: Metadonnees, lang: 'fr' | 'en' = 'fr'): string[] {
  const fr = lang === 'fr';
  const p: string[] = [];
  const deux = fr ? ' :' : ':';
  if (m.gps) p.push(`${fr ? 'Position GPS retirée' : 'GPS location removed'}${deux} ${formaterGps(m.gps, lang)}`);
  if (m.appareil) p.push(`${fr ? 'Appareil retiré' : 'Camera removed'}${deux} ${m.appareil}`);
  const d = m.date ? formaterDate(m.date, lang) : null;
  if (m.date) p.push(`${fr ? 'Date de prise retirée' : 'Date taken removed'}${d ? ` (${d})` : ''}`);
  if (m.logiciel) p.push(`${fr ? 'Logiciel retiré' : 'Software removed'}${deux} ${m.logiciel}`);
  if (m.xmp) p.push(fr ? 'Bloc XMP retiré' : 'XMP block removed');
  return p;
}

/** « IMG_0412.HEIC » -> « IMG_0412-prete.jpg » */
export function nomSortie(nom: string): string {
  const base = nom.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '') || 'photo';
  return `${base}-prete.jpg`;
}
