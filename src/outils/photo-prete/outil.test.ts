import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cibleEffective, DESTINATIONS, formaterDate, formaterGps, lienCarte, lireMetadonnees, nomSortie, phrasesRetire, segmentsMetadonnees } from './outil';
import { construireTiff, DEFAUT, injecter } from './fixture';

const fx = (n: string) => new Uint8Array(readFileSync(new URL(`../heic-jpg/__fixtures__/${n}`, import.meta.url)));
const avecGps = () => injecter(fx('base.jpg'), construireTiff(DEFAUT));

describe('lireMetadonnees', () => {
  it('lit GPS, appareil, date, orientation et XMP dans un JPG fabriqué (Paris, iPhone 15 Pro)', () => {
    const m = lireMetadonnees(avecGps());
    expect(m.appareil).toBe('iPhone 15 Pro');
    expect(m.orientation).toBe(6);
    expect(m.date).toBe('2026:10:20 14:30:00');
    expect(m.xmp).toBe(true);
    expect(m.gps!.lat).toBeCloseTo(48.8566, 3);
    expect(m.gps!.lon).toBeCloseTo(2.3522, 3);
  });
  it('lit le HEIC des fixtures (fabricant TestCam, date, GPS, rotation 6)', () => {
    const m = lireMetadonnees(fx('exif.heic'));
    expect(m.appareil).toContain('TestCam');
    expect(m.date).toBe('2026:10:20 14:30:00');
    expect(m.orientation).toBe(6);
    expect(m.gps).not.toBeNull();
  });
  it('rend « rien » pour un fichier sans métadonnées ou illisible, sans exception', () => {
    expect(lireMetadonnees(fx('base.jpg')).gps).toBeNull();
    expect(lireMetadonnees(fx('paysage.heic')).exif).toBe(false);
    expect(lireMetadonnees(new Uint8Array([1, 2, 3])).appareil).toBeNull();
    expect(lireMetadonnees(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1])).gps).toBeNull();
  });
  it('hémisphères sud et ouest donnent des signes négatifs', () => {
    const m = lireMetadonnees(injecter(fx('base.jpg'), construireTiff({ ...DEFAUT, lat: -33.8688, lon: -70.6693 })));
    expect(m.gps!.lat).toBeCloseTo(-33.8688, 3);
    expect(m.gps!.lon).toBeCloseTo(-70.6693, 3);
  });
});

describe('segmentsMetadonnees', () => {
  it('trouve APP1 Exif et APP1 XMP dans la photo fabriquée', () => {
    expect(segmentsMetadonnees(avecGps())).toEqual(['APP1 Exif', 'APP1 XMP']);
  });
  it('un JPG sans métadonnées (JFIF seul) rend une liste vide', () => {
    expect(segmentsMetadonnees(fx('base.jpg'))).toEqual([]);
  });
});

describe('affichage', () => {
  it('formate les coordonnées', () => {
    expect(formaterGps({ lat: 48.8566, lon: 2.3522 })).toBe('48,857° N, 2,352° E');
    expect(formaterGps({ lat: -33.8688, lon: -70.6693 }, 'en')).toBe('33.869° S, 70.669° W');
  });
  it('lien OpenStreetMap', () => expect(lienCarte({ lat: 48.8566, lon: 2.3522 })).toContain('mlat=48.85660&mlon=2.35220'));
  it('formate la date', () => { expect(formaterDate('2026:10:20 14:30:00')).toBe('20/10/2026'); expect(formaterDate('n/a')).toBeNull(); });
  it('ne dit que ce que la photo contenait', () => {
    const p = phrasesRetire(lireMetadonnees(avecGps()));
    expect(p[0]).toBe('Position GPS retirée : 48,857° N, 2,352° E');
    expect(p).toContain('Appareil retiré : iPhone 15 Pro');
    expect(p).toContain('Date de prise retirée (20/10/2026)');
    expect(phrasesRetire(lireMetadonnees(fx('base.jpg')))).toEqual([]);
  });
});

describe('destinations et noms', () => {
  it('destinations', () => {
    expect(DESTINATIONS.formulaire.cible).toBe(1_000_000);
    expect(DESTINATIONS.leboncoin.cote).toBe(1600);
    expect(DESTINATIONS.allege.cible).toBeNull();
  });
  it('cible effective : sous le poids d’origine quand il passe déjà', () => {
    expect(cibleEffective(1_000_000, 300_000)).toBe(285_000);
    expect(cibleEffective(1_000_000, 4_000_000)).toBe(1_000_000);
  });
  it('nom de sortie', () => expect(nomSortie('IMG_0412.HEIC')).toBe('IMG_0412-prete.jpg'));
});

// --- Chaîne réelle : encodeur mozjpeg (celui du worker du compresseur) + recherche du poids visé ---
import { createRequire } from 'node:module';
import { beforeAll } from 'vitest';
import { encoder } from '../compresseur/encodeurs';
import { appliquerEchelle, viserPoids } from '../compresseur/outil';

describe('JPG produit par l’encodeur réel', () => {
  const req = createRequire(import.meta.url);
  beforeAll(async () => {
    const j = await import('@jsquash/jpeg/encode');
    await j.init({ wasmBinary: readFileSync(req.resolve('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm')) } as never);
  });
  const photo = (w: number, h: number) => {
    let s = 7;
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) { s = (s * 1664525 + 1013904223) >>> 0; const b = (s / 2 ** 32 - 0.5) * 40; d[i * 4] = (i % w) / w * 200 + b; d[i * 4 + 1] = Math.floor(i / w) / h * 180 + b; d[i * 4 + 2] = 100 + b; d[i * 4 + 3] = 255; }
    return { data: d, width: w, height: h };
  };
  it('ne contient aucun segment APP1 Exif/XMP ni GPS, et tient sous le poids visé (1 Mo)', async () => {
    const p = photo(1600, 1200);
    const cible = 1_000_000;
    const r = await viserPoids(async (q, e) => { const d = appliquerEchelle(p.width, p.height, e); return (await encoder('jpeg', e === 1 ? p : photo(d.largeur, d.hauteur), q)).byteLength; }, cible, { plusGrandCote: 1600 });
    const dm = appliquerEchelle(p.width, p.height, r.essai.echelle);
    const sortie = await encoder('jpeg', r.essai.echelle === 1 ? p : photo(dm.largeur, dm.hauteur), r.essai.qualite);
    expect(r.atteint).toBe(true);
    expect(sortie.byteLength).toBeLessThanOrEqual(cible);
    expect(segmentsMetadonnees(sortie)).toEqual([]);
    expect(lireMetadonnees(sortie).gps).toBeNull();
    expect(new TextDecoder('latin1').decode(sortie)).not.toMatch(/Exif|ns\.adobe\.com/);
  }, 60000);
});
