// Fabrique un JPEG d'essai qui porte un bloc EXIF (Make, Model, Orientation, date, GPS) et un bloc XMP.
// Usage : node --experimental-strip-types fixture.ts <jpeg-entree> <jpeg-sortie> [orientation] — sert aussi aux tests.
import { readFileSync, writeFileSync } from 'node:fs';

interface Champ { tag: number; type: 2 | 3 | 5; valeur: string | number | number[] }

/** Bloc TIFF petit-boutiste : IFD0 (Make, Model, Orientation, ExifIFD, GPS IFD), ExifIFD (DateTimeOriginal), GPS (lat/lon 48°51'23.76" N, 2°21'7.92" E). */
export function construireTiff(opts: { make: string; model: string; orientation: number; date: string; lat: number; lon: number }): Uint8Array {
  const sortie: number[] = [0x49, 0x49, 0x2a, 0, 8, 0, 0, 0];
  const u16 = (v: number) => [v & 255, v >> 8];
  const u32 = (v: number) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  const ecrireIfd = (champs: (Champ & { ptr?: () => number })[]) => {
    const debut = sortie.length;
    const taille = 2 + champs.length * 12 + 4;
    const donnees: number[] = [];
    const entrees: number[] = [...u16(champs.length)];
    for (const c of champs) {
      let oct: number[]; let n: number;
      if (c.type === 2) { oct = [...String(c.valeur)].map((x) => x.charCodeAt(0)).concat(0); n = oct.length; }
      else if (c.type === 3) { oct = u16(Number(c.valeur)); n = 1; }
      else { const v = c.valeur as number[]; oct = v.flatMap((x, i) => (i % 2 ? u32(x) : u32(x))); n = v.length / 2; }
      let champ4: number[];
      if (oct.length <= 4) champ4 = [...oct, 0, 0, 0, 0].slice(0, 4);
      else { champ4 = u32(debut + taille + donnees.length); donnees.push(...oct); }
      entrees.push(...u16(c.tag), ...u16(c.type === 5 ? 5 : c.type), ...u32(n), ...champ4);
    }
    sortie.push(...entrees, 0, 0, 0, 0, ...donnees);
    return debut;
  };
  // Les pointeurs 0x8769 / 0x8825 sont de type LONG (4) : on les écrit à la main après coup.
  const ifdDate = (): number => ecrireIfd([{ tag: 0x9003, type: 2, valeur: opts.date }]);
  const deg = (v: number) => { const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.round(((a - d) * 60 - m) * 60 * 100); return [d, 1, m, 1, s, 100]; };
  const ifd0Pos = ecrireIfd([
    { tag: 0x010f, type: 2, valeur: opts.make },
    { tag: 0x0110, type: 2, valeur: opts.model },
    { tag: 0x0112, type: 3, valeur: opts.orientation },
    { tag: 0x8769, type: 3, valeur: 0 },
    { tag: 0x8825, type: 3, valeur: 0 },
  ]);
  const posDate = ifdDate();
  const posGps = ecrireIfd([
    { tag: 1, type: 2, valeur: opts.lat >= 0 ? 'N' : 'S' },
    { tag: 2, type: 5, valeur: deg(opts.lat) },
    { tag: 3, type: 2, valeur: opts.lon >= 0 ? 'E' : 'W' },
    { tag: 4, type: 5, valeur: deg(opts.lon) },
  ]);
  const b = Uint8Array.from(sortie);
  // entrées 4 et 5 de l'IFD0 : type -> LONG (4), valeur -> position
  const e = (i: number) => ifd0Pos + 2 + i * 12;
  for (const [i, pos] of [[3, posDate], [4, posGps]] as const) { b[e(i) + 2] = 4; b[e(i) + 3] = 0; b.set(u32(pos), e(i) + 8); }
  return b;
}

export function injecter(jpeg: Uint8Array, tiff: Uint8Array): Uint8Array {
  const exif = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]);
  const xmp = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF/></x:xmpmeta>');
  const seg = (m: number, c: Uint8Array) => [0xff, m, (c.length + 2) >> 8, (c.length + 2) & 255, ...c];
  return Uint8Array.from([...jpeg.subarray(0, 2), ...seg(0xe1, exif), ...seg(0xe1, xmp), ...jpeg.subarray(2)]);
}

export const DEFAUT = { make: 'Apple', model: 'iPhone 15 Pro', orientation: 6, date: '2026:10:20 14:30:00', lat: 48.8566, lon: 2.3522 };

if (process.argv[1]?.endsWith('fixture.ts') && process.argv[2]) {
  const jpeg = new Uint8Array(readFileSync(process.argv[2]));
  writeFileSync(process.argv[3], injecter(jpeg, construireTiff({ ...DEFAUT, orientation: Number(process.argv[4] ?? 6) })));
}
