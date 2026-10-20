import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { describe, expect, it } from 'vitest';
import {
  blanchir, deplacer, detecterCoins, dimensionsSortie, enveloppeConvexe, erreurCoins, fabriquerPdf, homographie, nomPage, ordonnerCoins,
  pivoter, quadPlausible, quadrilatereCirconscrit, rapportReel, redresser, taille, traiter, type Image, type Quad,
} from './outil';

// Les photos d'essai sont fabriquées par un rendu canvas : une page A4 de texte français projetée par une caméra sténopé
// (focale et pose connues) sur un fond, avec ombre, éclairage inégal et bruit ; `verite.json` donne les vrais coins en pixels.
const dossier = new URL('./__fixtures__/', import.meta.url);
const verite: Record<string, { largeur: number; hauteur: number; coins: [number, number][] }> = JSON.parse(readFileSync(new URL('verite.json', dossier), 'utf8'));
const NOMS = Object.keys(verite);
const charger = async (nom: string): Promise<Image> => {
  const { data, info } = await sharp(new URL(`${nom}.jpg`, dossier).pathname).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
};
const coinsReels = (nom: string) => verite[nom].coins.map(([x, y]) => ({ x, y })) as Quad;
const enJpeg = (im: Image, q = 78) => sharp(Buffer.from(im.data), { raw: { width: im.width, height: im.height, channels: 4 } }).removeAlpha().jpeg({ quality: q }).toBuffer();

describe('géométrie', () => {
  it('ordonne quatre points : haut-gauche, haut-droit, bas-droit, bas-gauche', () => {
    const q = ordonnerCoins([{ x: 90, y: 80 }, { x: 10, y: 12 }, { x: 95, y: 5 }, { x: 4, y: 70 }]);
    expect(q.map((p) => [p.x, p.y])).toEqual([[10, 12], [95, 5], [90, 80], [4, 70]]);
  });
  it('enveloppe convexe : un point intérieur disparaît', () => {
    const h = enveloppeConvexe([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }]);
    expect(h).toHaveLength(4);
  });
  it('un rectangle aux coins coupés redevient un quadrilatère circonscrit de même aire', () => {
    const hull = [{ x: 2, y: 0 }, { x: 98, y: 0 }, { x: 100, y: 2 }, { x: 100, y: 58 }, { x: 98, y: 60 }, { x: 2, y: 60 }, { x: 0, y: 58 }, { x: 0, y: 2 }];
    const q = quadrilatereCirconscrit(hull)!;
    expect(q).toHaveLength(4);
    const xs = q.map((p) => p.x), ys = q.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(0, 0); expect(Math.max(...xs)).toBeCloseTo(100, 0);
    expect(Math.min(...ys)).toBeCloseTo(0, 0); expect(Math.max(...ys)).toBeCloseTo(60, 0);
  });
  it('homographie : les quatre coins du rectangle tombent sur ceux de la feuille', () => {
    const q: Quad = [{ x: 100, y: 50 }, { x: 700, y: 80 }, { x: 650, y: 900 }, { x: 60, y: 820 }];
    const H = homographie(q, 400, 600);
    const f = (u: number, v: number) => { const d = H[6] * u + H[7] * v + 1; return [(H[0] * u + H[1] * v + H[2]) / d, (H[3] * u + H[4] * v + H[5]) / d]; };
    [[0, 0], [400, 0], [400, 600], [0, 600]].forEach(([u, v], i) => { const [x, y] = f(u, v); expect(x).toBeCloseTo(q[i].x, 6); expect(y).toBeCloseTo(q[i].y, 6); });
  });
  it('quad plausible : refuse un papillon et un coin plat', () => {
    expect(quadPlausible([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }])).toBe(true);
    expect(quadPlausible([{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }])).toBe(false);
    expect(quadPlausible([{ x: 0, y: 0 }, { x: 50, y: 1 }, { x: 100, y: 0 }, { x: 50, y: 100 }])).toBe(false);
  });
});

describe('rapport réel de la feuille (perspective)', () => {
  // Caméra sténopé, focale 1950 px, photo 2400 x 1800, feuille A4 inclinée de 38° : le rapport mesuré sur la photo est faux.
  const verites = [verite['bois-biais'], verite['portrait-perspective']];
  it('retrouve A4 (1,414) à 2 % près à partir des seuls coins de la photo', () => {
    for (const v of verites) {
      const q = v.coins.map(([x, y]) => ({ x, y })) as Quad;
      const l = (Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) + Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y)) / 2;
      const h = (Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y) + Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y)) / 2;
      expect(Math.abs(h / l - Math.SQRT2)).toBeGreaterThan(0.1); // le rapport mesuré est bien faussé
      expect(rapportReel(q, v.largeur, v.hauteur)!).toBeGreaterThan(Math.SQRT2 * 0.98);
      expect(rapportReel(q, v.largeur, v.hauteur)!).toBeLessThan(Math.SQRT2 * 1.02);
    }
  });
  it('photo de face : pas de correction, le rapport mesuré est gardé', () => {
    const q: Quad = [{ x: 100, y: 100 }, { x: 500, y: 100 }, { x: 500, y: 820 }, { x: 100, y: 820 }];
    expect(rapportReel(q, 800, 800)).toBeNull();
    const d = dimensionsSortie(q, 2000, { w: 800, h: 800 });
    expect(d.format).toBe('mesure');
    expect(d.hauteur / d.largeur).toBeCloseTo(1.8, 1);
  });
  it('A4 paysage reconnu, taille plafonnée à celle de la photo', () => {
    const q: Quad = [{ x: 0, y: 0 }, { x: 1414, y: 0 }, { x: 1414, y: 1000 }, { x: 0, y: 1000 }];
    const d = dimensionsSortie(q, 2339);
    expect(d.format).toBe('A4'); expect(d.largeur).toBeGreaterThan(d.hauteur);
    expect(d.largeur).toBeLessThanOrEqual(Math.round(1414 * 1.05));
  });
});

describe('détection des bords sur des photos fabriquées', () => {
  for (const nom of NOMS) {
    it(`${nom} : coins trouvés à moins de 4 px des vrais coins (photo ${verite[nom].largeur} px)`, async () => {
      const d = detecterCoins(await charger(nom));
      expect(d.fiable).toBe(true);
      expect(erreurCoins(d.coins, coinsReels(nom))).toBeLessThan(4);
    }, 30_000);
  }
  it('une image sans feuille (bruit gris uniforme) est déclarée non fiable : l’utilisateur ajustera', () => {
    const w = 600, h = 400, data = new Uint8ClampedArray(w * h * 4);
    let s = 7; for (let i = 0; i < w * h; i++) { s = (s * 1664525 + 1013904223) >>> 0; const v = 120 + (s >>> 24) / 16; data.set([v, v, v, 255], i * 4); }
    const d = detecterCoins({ data, width: w, height: h });
    expect(d.fiable).toBe(false);
    expect(d.coins).toHaveLength(4);
  });
  it('une photo de feuille blanche cadrée serrée (aucun fond visible) n’est pas déclarée sûre', () => {
    const w = 600, h = 800, data = new Uint8ClampedArray(w * h * 4);
    let s = 3; for (let i = 0; i < w * h; i++) { s = (s * 1664525 + 1013904223) >>> 0; const v = 240 + (s >>> 28) / 3; data.set([v, v, v, 255], i * 4); }
    expect(detecterCoins({ data, width: w, height: h }).fiable).toBe(false);
  });
});

describe('redressement et fond blanchi', () => {
  it('pivoter de 90° puis de 270° rend l’image d’origine', () => {
    const im: Image = { width: 3, height: 2, data: new Uint8ClampedArray(Array.from({ length: 24 }, (_, i) => (i % 4 === 3 ? 255 : i * 9))) };
    expect(Array.from(pivoter(pivoter(im, 1), 3).data)).toEqual(Array.from(im.data));
    expect(pivoter(im, 1).width).toBe(2);
  });
  it('redresser une feuille connue donne un rectangle de la bonne taille', () => {
    const im: Image = { width: 40, height: 40, data: new Uint8ClampedArray(40 * 40 * 4).fill(255) };
    const r = redresser(im, [{ x: 5, y: 5 }, { x: 35, y: 5 }, { x: 35, y: 35 }, { x: 5, y: 35 }], 30, 30);
    expect(r.width).toBe(30);
  });
  for (const nom of NOMS) {
    it(`${nom} : page A4 au fond blanc, texte sombre, poids JPEG sous 1 Mo`, async () => {
      const p = traiter(await charger(nom), { rendu: 'net', quarts: 0, maxi: 2339 });
      expect(p.format).toBe('A4');
      expect(p.image.height / p.image.width).toBeGreaterThan(1.38); expect(p.image.height / p.image.width).toBeLessThan(1.45);
      let blancs = 0, sombres = 0; const n = p.image.width * p.image.height;
      for (let i = 0; i < n; i++) { const v = p.image.data[i * 4]; if (v >= 235) blancs++; else if (v < 110) sombres++; }
      expect(blancs / n).toBeGreaterThan(0.88);   // le fond est blanc
      expect(sombres / n).toBeGreaterThan(0.01);  // le texte est resté noir
      expect((await enJpeg(p.image)).length).toBeLessThan(1_000_000);
    }, 30_000);
  }
  it('couleur et noir et blanc : mêmes dimensions, noir et blanc strictement à deux tons', async () => {
    const plat = traiter(await charger('bois-biais'), { rendu: 'net', quarts: 0, maxi: 800 }).image;
    const nb = blanchir(plat, 'nb');
    expect(new Set(Array.from({ length: nb.width * nb.height }, (_, i) => nb.data[i * 4])).size).toBe(2);
    expect(blanchir(plat, 'couleur').width).toBe(plat.width);
  });
});

describe('PDF multipage', () => {
  it('assemble 3 pages A4 dans l’ordre demandé et pèse peu', async () => {
    const jpegs: { jpeg: Uint8Array; largeur: number; hauteur: number }[] = [];
    for (const nom of ['bois-biais', 'faible-contraste', 'fond-clair']) {
      const p = traiter(await charger(nom), { rendu: 'net', quarts: 0, maxi: 2339 });
      jpegs.push({ jpeg: new Uint8Array(await enJpeg(p.image)), largeur: p.image.width, hauteur: p.image.height });
    }
    const pdf = await fabriquerPdf(jpegs);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(842, 0);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(842 / Math.SQRT2, 0);
    expect(pdf.length / 3).toBeLessThan(1_000_000);
    expect(new TextDecoder('latin1').decode(pdf.slice(0, 5))).toBe('%PDF-');
  }, 60_000);
});

describe('textes et pages', () => {
  it('poids lisible en français et en anglais', () => {
    expect(taille(412_000)).toBe('412 Ko'); expect(taille(1_250_000)).toBe('1,3 Mo'); expect(taille(1_250_000, 'en')).toBe('1.3 MB'); expect(taille(800)).toBe('800 o');
  });
  it('noms des JPG : numérotés seulement s’il y a plusieurs pages', () => {
    expect(nomPage(0, 1)).toBe('scan.jpg'); expect(nomPage(1, 3)).toBe('scan-02.jpg');
  });
  it('déplacer une page change l’ordre sans toucher à l’original', () => {
    const a = ['p1', 'p2', 'p3'];
    expect(deplacer(a, 2, 0)).toEqual(['p3', 'p1', 'p2']); expect(a).toEqual(['p1', 'p2', 'p3']);
    expect(deplacer(a, 0, 5)).toBe(a);
  });
});

// Preuve de netteté : le texte de la page redressée est relu par la même reconnaissance que l'outil OCR du site.
describe('relecture par OCR du texte redressé (tesseract.js, hors navigateur)', () => {
  const attendu = `Facture n° 2026-0417 Atelier du Nord — 12 rue des Lilas, 59000 Lille Madame, Monsieur, Nous vous remercions de votre commande du 14 octobre et vous confirmons la livraison de trois meubles en chêne massif, assemblés et posés à votre domicile le 22 octobre entre huit et dix heures. Le règlement est attendu sous trente jours par virement bancaire. En cas de question, notre équipe vous répond du lundi au vendredi. Désignation Qté Prix Table en chêne 180 cm 1 890 € Chaise assise cuir 6 1 140 € Buffet deux portes 1 720 € Livraison et pose 1 120 € Total à payer : 2 870 € ${'Conditions générales : toute réclamation doit être adressée par écrit dans un délai de huit jours. '.repeat(8)}`;
  const mots = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}€°]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const exactitude = (lu: string) => {
    const a = mots(attendu), b = mots(lu);
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return 1 - dp[a.length][b.length] / a.length;
  };
  it('la page redressée et blanchie est lue à 95 % de mots justes ou plus ; la photo brute, nettement moins', async () => {
    const w = await createWorker('fra', 1, { langPath: new URL('../../../public/outils-assets/ocr', import.meta.url).pathname, gzip: false, cacheMethod: 'none' });
    try {
      const brute = await sharp(new URL('bois-biais.jpg', dossier).pathname).jpeg().toBuffer();
      const lueBrute = exactitude((await w.recognize(brute)).data.text);
      const p = traiter(await charger('bois-biais'), { rendu: 'net', quarts: 0, maxi: 2339 });
      const lue = exactitude((await w.recognize(await enJpeg(p.image))).data.text);
      expect(lue).toBeGreaterThanOrEqual(0.95);
      expect(lue).toBeGreaterThan(lueBrute);
    } finally { await w.terminate(); }
  }, 120_000);
});
