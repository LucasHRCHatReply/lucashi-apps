// Logique pure de l'outil HEIC -> JPG / PNG : aucun DOM, testable seule.
// Le décodage lui-même (libheif en wasm) vit dans le Worker `public/outils-assets/heic-jpg/worker.js`.

export type Format = 'jpg' | 'png';

const lire16 = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const lire32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const lireN = (b: Uint8Array, o: number, n: number) => {
  let v = 0;
  for (let i = 0; i < n; i++) v = v * 256 + b[o + i];
  return v;
};
const quatre = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

/** Ce que contient réellement un fichier, d'après ses premiers octets (une extension .heic peut mentir). */
export type Nature = 'heic' | 'jpeg' | 'png' | 'webp' | 'gif' | 'inconnu';
export function nature(b: Uint8Array): Nature {
  if (b.length >= 12 && quatre(b, 4) === 'ftyp') {
    const marques = [quatre(b, 8)];
    for (let o = 16; o + 4 <= Math.min(b.length, lire32(b, 0)); o += 4) marques.push(quatre(b, o));
    if (marques.some((m) => ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'heif'].includes(m))) return 'heic';
    return 'inconnu';
  }
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length >= 12 && quatre(b, 0) === 'RIFF' && quatre(b, 8) === 'WEBP') return 'webp';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
  return 'inconnu';
}

interface Boite { type: string; debut: number; contenu: number; fin: number }
function boites(b: Uint8Array, de: number, a: number): Boite[] {
  const liste: Boite[] = [];
  let o = de;
  while (o + 8 <= a) {
    let taille = lire32(b, o);
    let tete = 8;
    if (taille === 1) { taille = lireN(b, o + 8, 8); tete = 16; }
    else if (taille === 0) taille = a - o;
    if (taille < tete || o + taille > a) break;
    liste.push({ type: quatre(b, o + 4), debut: o, contenu: o + tete, fin: o + taille });
    o += taille;
  }
  return liste;
}

/**
 * Extrait le bloc EXIF (en-tête TIFF « II*\0 » ou « MM\0* ») d'un HEIC, ou null s'il n'y en a pas.
 * Parcourt les boîtes meta > iinf (quel item est « Exif ») et meta > iloc (où sont ses octets).
 */
export function extraireExif(b: Uint8Array): Uint8Array | null {
  try {
    const meta = boites(b, 0, b.length).find((x) => x.type === 'meta');
    if (!meta) return null;
    const enfants = boites(b, meta.contenu + 4, meta.fin);
    const iinf = enfants.find((x) => x.type === 'iinf');
    const iloc = enfants.find((x) => x.type === 'iloc');
    if (!iinf || !iloc) return null;

    let idExif = -1;
    const vInf = b[iinf.contenu];
    const debutInfe = iinf.contenu + 4 + (vInf === 0 ? 2 : 4);
    for (const infe of boites(b, debutInfe, iinf.fin)) {
      if (infe.type !== 'infe') continue;
      const v = b[infe.contenu];
      if (v < 2) continue;
      const id = v === 2 ? lire16(b, infe.contenu + 4) : lire32(b, infe.contenu + 4);
      const typeOff = infe.contenu + 4 + (v === 2 ? 2 : 4) + 2;
      if (quatre(b, typeOff) === 'Exif') { idExif = id; break; }
    }
    if (idExif < 0) return null;

    const v = b[iloc.contenu];
    let o = iloc.contenu + 4;
    const tailleOffset = b[o] >> 4, tailleLongueur = b[o] & 15;
    const tailleBase = b[o + 1] >> 4, tailleIndex = v >= 1 ? b[o + 1] & 15 : 0;
    o += 2;
    const nb = v < 2 ? lire16(b, o) : lire32(b, o);
    o += v < 2 ? 2 : 4;
    for (let i = 0; i < nb; i++) {
      const id = v < 2 ? lire16(b, o) : lire32(b, o);
      o += v < 2 ? 2 : 4;
      let methode = 0;
      if (v >= 1) { methode = lire16(b, o) & 15; o += 2; }
      o += 2; // data_reference_index
      const base = lireN(b, o, tailleBase);
      o += tailleBase;
      const nbExtents = lire16(b, o);
      o += 2;
      const morceaux: Uint8Array[] = [];
      for (let e = 0; e < nbExtents; e++) {
        if (v >= 1 && tailleIndex > 0) o += tailleIndex;
        const off = lireN(b, o, tailleOffset);
        o += tailleOffset;
        const len = lireN(b, o, tailleLongueur);
        o += tailleLongueur;
        morceaux.push(b.subarray(base + off, base + off + len));
      }
      if (id !== idExif) continue;
      if (methode !== 0) return null;
      const tout = new Uint8Array(morceaux.reduce((s, m) => s + m.length, 0));
      let p = 0;
      for (const m of morceaux) { tout.set(m, p); p += m.length; }
      if (tout.length < 12) return null;
      const decalage = lire32(tout, 0); // distance entre ce champ et l'en-tête TIFF
      const tiff = tout.subarray(4 + decalage);
      const ok = (tiff[0] === 0x49 && tiff[1] === 0x49 && tiff[2] === 0x2a) || (tiff[0] === 0x4d && tiff[1] === 0x4d && tiff[3] === 0x2a);
      return ok ? tiff : null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Valeur de l'étiquette Orientation (0x0112) du bloc TIFF, ou null. */
export function orientationExif(tiff: Uint8Array): number | null {
  const pos = positionOrientation(tiff);
  if (pos === null) return null;
  return lireTiff16(tiff, pos);
}
const petit = (t: Uint8Array) => t[0] === 0x49;
const lireTiff16 = (t: Uint8Array, o: number) => (petit(t) ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1]);
const lireTiff32 = (t: Uint8Array, o: number) =>
  petit(t) ? (t[o] | (t[o + 1] << 8) | (t[o + 2] << 16) | (t[o + 3] << 24)) >>> 0 : lire32(t, o);
function positionOrientation(tiff: Uint8Array): number | null {
  if (tiff.length < 8) return null;
  const ifd = lireTiff32(tiff, 4);
  if (ifd + 2 > tiff.length) return null;
  const n = lireTiff16(tiff, ifd);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > tiff.length) return null;
    if (lireTiff16(tiff, e) === 0x0112) return e + 8;
  }
  return null;
}

/**
 * Copie du bloc EXIF avec l'orientation remise à 1 : libheif a déjà tourné les pixels
 * (rotation « irot » du HEIC), laisser 6 ou 8 ferait tourner la photo une seconde fois.
 */
export function exifSansRotation(tiff: Uint8Array): Uint8Array {
  const copie = tiff.slice();
  const pos = positionOrientation(copie);
  if (pos !== null) {
    if (petit(copie)) { copie[pos] = 1; copie[pos + 1] = 0; } else { copie[pos] = 0; copie[pos + 1] = 1; }
  }
  return copie;
}

/** Insère le bloc EXIF dans un JPEG (segment APP1), après l'en-tête JFIF s'il y en a un. Un JPEG qui a déjà un EXIF est rendu tel quel. */
export function injecterExifJpeg(jpeg: Uint8Array, tiff: Uint8Array): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg;
  const charge = 2 + 6 + tiff.length; // longueur + « Exif\0\0 » + TIFF
  if (charge > 0xffff) return jpeg; // un APP1 ne peut pas dépasser 64 Ko
  let pos = 2;
  while (jpeg[pos] === 0xff && jpeg[pos + 1] >= 0xe0 && jpeg[pos + 1] <= 0xef) {
    const longueur = (jpeg[pos + 2] << 8) | jpeg[pos + 3];
    if (jpeg[pos + 1] === 0xe1 && quatre(jpeg, pos + 4) === 'Exif') return jpeg;
    if (jpeg[pos + 1] !== 0xe0) break;
    pos += 2 + longueur;
  }
  const segment = new Uint8Array(2 + charge);
  segment.set([0xff, 0xe1, charge >> 8, charge & 255, 0x45, 0x78, 0x69, 0x66, 0, 0], 0);
  segment.set(tiff, 10);
  const sortie = new Uint8Array(jpeg.length + segment.length);
  sortie.set(jpeg.subarray(0, pos), 0);
  sortie.set(segment, pos);
  sortie.set(jpeg.subarray(pos), pos + segment.length);
  return sortie;
}

/** « IMG_0412.HEIC » -> « IMG_0412.jpg ». Les points du nom sont gardés. */
export function nomSortie(nom: string, format: Format): string {
  const base = nom.replace(/^.*[\\/]/, '').replace(/\.(heic|heif|hif)$/i, '') || 'photo';
  return `${base}.${format}`;
}

export function formaterTaille(octets: number, lang: 'fr' | 'en' = 'fr'): string {
  const nombre = (v: number, d: number) => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  if (octets < 1024) return `${octets} ${lang === 'fr' ? 'o' : 'B'}`;
  if (octets < 1024 * 1024) return `${nombre(octets / 1024, 0)} ${lang === 'fr' ? 'Ko' : 'KB'}`;
  return `${nombre(octets / 1024 / 1024, 1)} ${lang === 'fr' ? 'Mo' : 'MB'}`;
}

/** Message pour un fichier qui n'est pas un HEIC lisible. */
export function messageRefus(n: Nature, lang: 'fr' | 'en' = 'fr'): string {
  const fr = lang === 'fr';
  if (n === 'jpeg') return fr ? 'Déjà un JPG, rien à convertir.' : 'Already a JPG, nothing to convert.';
  if (n === 'png') return fr ? 'C’est déjà un PNG.' : 'This is already a PNG.';
  if (n === 'webp' || n === 'gif') return fr ? 'Ce n’est pas un HEIC (image WebP ou GIF).' : 'Not a HEIC file (WebP or GIF image).';
  return fr ? 'Fichier HEIC illisible ou abîmé.' : 'HEIC file unreadable or damaged.';
}
