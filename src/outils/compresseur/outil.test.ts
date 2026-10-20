import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import { appliquerEchelle, bilan, cibleEnOctets, dimensionsCible, formatEntree, formatSortie, gain, nomSortie, taille, viserPoids, QUALITE_MIN } from './outil';
import { encoder, preparerOxipng, type Pixels } from './encodeurs';

describe('formats et noms', () => {
  it('reconnaît le format par le type puis par l’extension', () => {
    expect(formatEntree('image/jpeg', 'a.bin')).toBe('jpeg');
    expect(formatEntree('', 'IMG_0042.JPEG')).toBe('jpeg');
    expect(formatEntree('', 'capture.PNG')).toBe('png');
    expect(formatEntree('image/avif', 'x')).toBe('avif');
    expect(formatEntree('application/pdf', 'x.pdf')).toBe('autre');
  });
  it('« identique » garde le format ; AVIF sort en WebP', () => {
    expect(formatSortie('png', 'meme')).toBe('png');
    expect(formatSortie('avif', 'meme')).toBe('webp');
    expect(formatSortie('png', 'jpeg')).toBe('jpeg');
  });
  it('nomme le fichier de sortie', () => {
    expect(nomSortie('Vacances 2026.HEIC.png', 'webp')).toBe('Vacances 2026.HEIC-compresse.webp');
    expect(nomSortie('sans-extension', 'jpeg')).toBe('sans-extension-compresse.jpg');
  });
});

describe('dimensions', () => {
  it('réduit au plus grand côté en gardant les proportions (4032×3024 -> 1600)', () => {
    expect(dimensionsCible(4032, 3024, 1600)).toEqual({ largeur: 1600, hauteur: 1200 });
    expect(dimensionsCible(3024, 4032, 1600)).toEqual({ largeur: 1200, hauteur: 1600 });
  });
  it('n’agrandit jamais et ignore une valeur vide', () => {
    expect(dimensionsCible(800, 600, 1600)).toEqual({ largeur: 800, hauteur: 600 });
    expect(dimensionsCible(800, 600, null)).toEqual({ largeur: 800, hauteur: 600 });
    expect(dimensionsCible(800, 600, 0)).toEqual({ largeur: 800, hauteur: 600 });
  });
  it('applique une échelle sans descendre sous 1 px', () => {
    expect(appliquerEchelle(1000, 500, 0.5)).toEqual({ largeur: 500, hauteur: 250 });
    expect(appliquerEchelle(3, 1, 0.1)).toEqual({ largeur: 1, hauteur: 1 });
  });
});

describe('gain et affichage', () => {
  it('calcule le gain, négatif si le fichier grossit, n/a sans référence', () => {
    expect(gain(2_000_000, 500_000)).toEqual({ octets: 1_500_000, pourcent: 75 });
    expect(gain(1000, 1100).pourcent).toBe(-10);
    expect(gain(0, 10).pourcent).toBeNull();
  });
  it('écrit les tailles en Ko/Mo décimaux, virgule en français', () => {
    expect(taille(842)).toBe('842 o');
    expect(taille(12_400)).toBe('12,4 Ko');
    expect(taille(1_380_000)).toBe('1,38 Mo');
    expect(taille(1_380_000, 'en')).toBe('1.38 MB');
    expect(taille(250_000)).toBe('250 Ko');
  });
  it('refuse un poids cible absurde', () => {
    expect(cibleEnOctets(500)).toBe(500_000);
    expect(cibleEnOctets(1)).toBeNull();
    expect(cibleEnOctets(NaN)).toBeNull();
  });
  it('résume un lot', () => {
    expect(bilan([{ avant: 3_000_000, apres: 600_000 }, { avant: 1_000_000, apres: 400_000 }])).toBe('2 images : 4,00 Mo → 1,00 Mo (−75 %, 3,00 Mo gagnés)');
    expect(bilan([{ avant: 100, apres: 150 }], 'en')).toBe('1 image: 100 B → 150 B (+50 %, 50 B more)');
  });
});

describe('viserPoids (encodeur simulé)', () => {
  // poids ≈ 100 000 × (échelle²) × (0,2 + qualité/100)
  const faux = (q: number, e: number) => Promise.resolve(Math.round(100_000 * e * e * (0.2 + q / 100)));
  it('garde la qualité maximale quand tout passe déjà', async () => {
    const r = await viserPoids(faux, 500_000);
    expect(r.atteint).toBe(true);
    expect(r.essai.qualite).toBe(95);
    expect(r.essai.echelle).toBe(1);
  });
  it('trouve la plus haute qualité qui passe par dichotomie, en peu d’essais', async () => {
    const r = await viserPoids(faux, 60_000);
    expect(r.atteint).toBe(true);
    expect(r.essai.octets).toBeLessThanOrEqual(60_000);
    expect(r.essai.qualite).toBe(40); // 0,2 + 0,40 = 0,60 -> 60 000 ; 41 dépasserait
    expect(r.essais).toBeLessThanOrEqual(10);
  });
  it('réduit l’image quand la qualité minimale ne suffit pas', async () => {
    const r = await viserPoids(faux, 10_000, { plusGrandCote: 3000 });
    expect(r.atteint).toBe(true);
    expect(r.essai.echelle).toBeLessThan(1);
    expect(r.essai.octets).toBeLessThanOrEqual(10_000);
  });
  it('PNG (sans perte) : ne joue que sur l’échelle', async () => {
    const png = (_q: number, e: number) => Promise.resolve(Math.round(400_000 * e * e));
    const r = await viserPoids(png, 100_000, { sansQualite: true, plusGrandCote: 3000 });
    expect(r.atteint).toBe(true);
    expect(r.essai.echelle).toBeLessThan(0.55);
  });
  it('dit honnêtement qu’il n’y arrive pas (cible hors de portée, côté plancher atteint)', async () => {
    const r = await viserPoids(() => Promise.resolve(50_000), 1000, { plusGrandCote: 200 });
    expect(r.atteint).toBe(false);
    expect(r.essai.qualite).toBe(QUALITE_MIN);
  });
});

// --- Encodeurs réels (mozjpeg, oxipng, libwebp en WebAssembly), images synthétiques « photo » reproductibles ---
const req = createRequire(import.meta.url);
const bin = (p: string) => readFileSync(req.resolve(p));

function photo(w: number, h: number, graine: number): Pixels {
  let s = graine;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const cercle = Math.hypot(x - w / 2, y - h / 2) < h / 3 ? 60 : 0;
    const bruit = (rnd() - 0.5) * 36; // grain de capteur
    data[i] = (x / w) * 200 + cercle + bruit;
    data[i + 1] = (y / h) * 180 + Math.sin(x / 23) * 25 + bruit;
    data[i + 2] = 90 + Math.cos((x + y) / 31) * 60 + bruit;
    data[i + 3] = 255;
  }
  return { data, width: w, height: h };
}
function reduire(p: Pixels, l: number, h: number): Pixels {
  const data = new Uint8ClampedArray(l * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
    const a = (Math.floor((y * p.height) / h) * p.width + Math.floor((x * p.width) / l)) * 4;
    data.set(p.data.subarray(a, a + 4), (y * l + x) * 4);
  }
  return { data, width: l, height: h };
}

describe('encodeurs réels', () => {
  beforeAll(async () => {
    const j = await import('@jsquash/jpeg/encode');
    const p = await import('@jsquash/png/encode');
    const w = await import('@jsquash/webp/encode');
    await j.init({ wasmBinary: bin('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm') } as never);
    await p.init(await WebAssembly.compile(bin('@jsquash/png/codec/pkg/squoosh_png_bg.wasm')));
    await preparerOxipng(await WebAssembly.compile(bin('@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm')));
    await w.init({ wasmBinary: bin('@jsquash/webp/codec/enc/webp_enc_simd.wasm') } as never);
  }, 60_000);

  const images = [photo(1200, 800, 1), photo(800, 1000, 2), photo(1600, 900, 3)];

  for (const format of ['jpeg', 'webp'] as const) {
    it(`${format} : le poids cible (150 Ko) est respecté sur 3 images`, async () => {
      for (const img of images) {
        const r = await viserPoids(async (q, e) => {
          const d = appliquerEchelle(img.width, img.height, e);
          return (await encoder(format, e === 1 ? img : reduire(img, d.largeur, d.hauteur), q)).byteLength;
        }, 150_000, { plusGrandCote: Math.max(img.width, img.height) });
        expect(r.atteint).toBe(true);
        expect(r.essai.octets).toBeLessThanOrEqual(150_000);
        expect(r.essai.octets).toBeGreaterThan(60_000); // pas gaspillé : on se rapproche de la cible
      }
    }, 120_000);
  }

  it('png : la sortie est un PNG valide et plus petite que 4 octets par pixel', async () => {
    const o = await encoder('png', images[0], 95);
    expect([...o.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(o.byteLength).toBeLessThan(1200 * 800 * 4);
  }, 60_000);

  it('une qualité plus basse donne un fichier plus léger (jpeg 90 > 40)', async () => {
    const haut = (await encoder('jpeg', images[0], 90)).byteLength;
    const bas = (await encoder('jpeg', images[0], 40)).byteLength;
    expect(bas).toBeLessThan(haut);
  }, 60_000);

  it('la réduction à 400 px diminue le poids (dimensions vérifiées dans l’en-tête JPEG)', async () => {
    const d = dimensionsCible(1200, 800, 400);
    expect(d).toEqual({ largeur: 400, hauteur: 267 });
    const grand = (await encoder('jpeg', images[0], 80)).byteLength;
    const petit = await encoder('jpeg', reduire(images[0], d.largeur, d.hauteur), 80);
    expect(petit.byteLength).toBeLessThan(grand / 4);
    // marqueur SOF0/SOF2 : hauteur puis largeur sur 2 octets
    let i = 2, h = 0, l = 0;
    while (i < petit.length) {
      if (petit[i] === 0xff && (petit[i + 1] === 0xc0 || petit[i + 1] === 0xc2)) { h = (petit[i + 5] << 8) | petit[i + 6]; l = (petit[i + 7] << 8) | petit[i + 8]; break; }
      i += 2 + ((petit[i + 2] << 8) | petit[i + 3]);
    }
    expect({ l, h }).toEqual({ l: 400, h: 267 });
  }, 60_000);
});
