import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { fabriquerZip, fichierAccepte, nomsUniques } from './ui';

describe('fichierAccepte', () => {
  const heic = { name: 'IMG_0001.HEIC', type: '' };
  const jpg = { name: 'a.jpg', type: 'image/jpeg' };
  it('accepte par extension, même sans type MIME (HEIC déposé depuis un iPhone)', () => expect(fichierAccepte(heic, 'image/*,.heic,.heif')).toBe(true));
  it('accepte par joker MIME', () => expect(fichierAccepte(jpg, 'image/*')).toBe(true));
  it('refuse un autre type', () => expect(fichierAccepte({ name: 'a.pdf', type: 'application/pdf' }, 'image/*,.heic')).toBe(false));
  it('accepte tout sans règle', () => expect(fichierAccepte(jpg, '')).toBe(true));
});

describe('nomsUniques', () => {
  it('numérote les doublons en gardant l’extension', () => expect(nomsUniques(['a.jpg', 'A.jpg', 'b.png', 'a.jpg'])).toEqual(['a.jpg', 'A (2).jpg', 'b.png', 'a (3).jpg']));
});

describe('fabriquerZip', () => {
  it('range tous les fichiers, texte compris, avec des noms uniques', async () => {
    const zip = await fabriquerZip([
      { nom: 'x.txt', donnees: 'bonjour' },
      { nom: 'x.txt', donnees: new Uint8Array([1, 2, 3]) },
      { nom: 'y.txt', donnees: new Blob(['é']) },
    ]);
    const f = unzipSync(zip);
    expect(Object.keys(f).sort()).toEqual(['x (2).txt', 'x.txt', 'y.txt']);
    expect(strFromU8(f['x.txt'])).toBe('bonjour');
    expect(Array.from(f['x (2).txt'])).toEqual([1, 2, 3]);
    expect(strFromU8(f['y.txt'])).toBe('é');
  });
});
