import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exifSansRotation, extraireExif, formaterTaille, injecterExifJpeg, messageRefus, nature, nomSortie, orientationExif } from './outil';

const lire = (n: string) => new Uint8Array(readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url)));
// Fichiers faits sur macOS : `sips -s format heic` à partir d'une image 160x96 (moitié gauche rouge, moitié droite bleue).
// exif.heic part d'un JPEG qui portait Orientation = 6, fabricant « TestCam », date 2026:10:20 et un GPS.

describe('nature', () => {
  it('reconnaît un vrai HEIC par ses premiers octets, quelle que soit l’extension', () => {
    expect(nature(lire('paysage.heic'))).toBe('heic');
    expect(nature(lire('exif.heic'))).toBe('heic');
  });
  it('reconnaît un JPG déguisé en .heic (cas fréquent sur les sites de partage)', () => {
    expect(nature(lire('base.jpg'))).toBe('jpeg');
    expect(messageRefus('jpeg')).toMatch(/Déjà un JPG/);
  });
  it('un fichier quelconque est inconnu', () => {
    expect(nature(new TextEncoder().encode('bonjour, ceci est du texte'))).toBe('inconnu');
    expect(nature(new Uint8Array(0))).toBe('inconnu');
  });
});

describe('extraireExif', () => {
  it('lit le bloc EXIF du HEIC avec son fabricant et la rotation d’origine', () => {
    const tiff = extraireExif(lire('exif.heic'));
    expect(tiff).not.toBeNull();
    expect(new TextDecoder('latin1').decode(tiff!)).toContain('TestCam');
    expect(new TextDecoder('latin1').decode(tiff!)).toContain('2026:10:20 14:30:00');
    expect(orientationExif(tiff!)).toBe(6);
  });
  it('rend null pour un HEIC sans EXIF et pour des octets quelconques', () => {
    expect(extraireExif(lire('paysage.heic'))).toBeNull();
    expect(extraireExif(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeNull();
  });
});

describe('exifSansRotation', () => {
  it('remet l’orientation à 1 sans toucher au reste ni à l’original', () => {
    const tiff = extraireExif(lire('exif.heic'))!;
    const neuf = exifSansRotation(tiff);
    expect(orientationExif(neuf)).toBe(1);
    expect(orientationExif(tiff)).toBe(6);
    expect(neuf.length).toBe(tiff.length);
    expect(new TextDecoder('latin1').decode(neuf)).toContain('TestCam');
  });
});

describe('injecterExifJpeg', () => {
  const jpeg = lire('base.jpg');
  it('place un segment APP1 « Exif » lisible dans le JPEG, qui reste un JPEG complet', () => {
    const tiff = exifSansRotation(extraireExif(lire('exif.heic'))!);
    const sortie = injecterExifJpeg(jpeg, tiff);
    expect(sortie.length).toBe(jpeg.length + tiff.length + 10);
    expect(sortie[0]).toBe(0xff);
    expect(sortie[1]).toBe(0xd8);
    expect(sortie[sortie.length - 2]).toBe(0xff);
    expect(sortie[sortie.length - 1]).toBe(0xd9);
    const texte = new TextDecoder('latin1').decode(sortie);
    expect(texte).toContain('Exif\0\0');
    expect(texte).toContain('TestCam');
  });
  it('n’ajoute rien deux fois et refuse ce qui n’est pas un JPEG', () => {
    const tiff = extraireExif(lire('exif.heic'))!;
    const une = injecterExifJpeg(jpeg, tiff);
    expect(injecterExifJpeg(une, tiff).length).toBe(une.length);
    const pasJpeg = new Uint8Array([1, 2, 3]);
    expect(injecterExifJpeg(pasJpeg, tiff)).toBe(pasJpeg);
  });
});

describe('nomSortie', () => {
  it('change l’extension et garde le reste du nom', () => {
    expect(nomSortie('IMG_0412.HEIC', 'jpg')).toBe('IMG_0412.jpg');
    expect(nomSortie('vacances.été.2026.heif', 'png')).toBe('vacances.été.2026.png');
    expect(nomSortie('sans-extension', 'jpg')).toBe('sans-extension.jpg');
    expect(nomSortie('.heic', 'jpg')).toBe('photo.jpg');
  });
});

describe('formaterTaille', () => {
  it('écrit les tailles dans la langue', () => {
    expect(formaterTaille(512)).toBe('512 o');
    expect(formaterTaille(2048)).toBe('2 Ko');
    expect(formaterTaille(3.5 * 1024 * 1024, 'en')).toBe('3.5 MB');
  });
});

// Le décodage réel (libheif, le même wasm que dans le Worker), sur les vrais fichiers.
describe('décodage libheif des fichiers de test', async () => {
  // @ts-expect-error libheif-js ne livre pas de types pour cette entrée
  const libheif = (await import('libheif-js/wasm-bundle')).default as any;
  const decoder = (nom: string) => {
    const image = new libheif.HeifDecoder().decode(lire(nom))[0];
    const l = image.get_width(), h = image.get_height();
    return new Promise<{ l: number; h: number; px: (x: number, y: number) => number[] }>((ok) =>
      image.display({ data: new Uint8ClampedArray(l * h * 4), width: l, height: h }, (r: any) =>
        ok({ l, h, px: (x, y) => Array.from(r.data.slice((y * l + x) * 4, (y * l + x) * 4 + 3)) as number[] })));
  };
  it('garde les dimensions et les couleurs d’une photo à l’endroit', async () => {
    const d = await decoder('paysage.heic');
    expect([d.l, d.h]).toEqual([160, 96]);
    expect(d.px(5, 48)[0]).toBeGreaterThan(200); // gauche : rouge
    expect(d.px(155, 48)[2]).toBeGreaterThan(200); // droite : bleu
  });
  it('applique la rotation du HEIC : 160x96 devient 96x160, le rouge passe en haut', async () => {
    const d = await decoder('exif.heic');
    expect([d.l, d.h]).toEqual([96, 160]);
    expect(d.px(48, 5)[0]).toBeGreaterThan(200); // haut : rouge
    expect(d.px(48, 155)[2]).toBeGreaterThan(200); // bas : bleu
  });
});
