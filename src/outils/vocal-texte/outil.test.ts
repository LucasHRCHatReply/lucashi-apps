import { describe, expect, it } from 'vitest';
import { dureeS, ECHANTILLONNAGE, enMono, estOgg, fenetres, horloge, motsJustes, nomSortie, reechantillonner, tailleMo, versSrt, versTexte } from './outil';

describe('fenêtres de 30 s', () => {
  it('un vocal de 18 s tient dans une seule fenêtre', () => {
    const f = fenetres(18 * ECHANTILLONNAGE);
    expect(f).toEqual([{ debut: 0, fin: 18 * ECHANTILLONNAGE, dernier: true }]);
  });
  it('30,4 s (l’essai réel) → 2 fenêtres, pas de 20 s', () => {
    const f = fenetres(Math.round(30.37 * ECHANTILLONNAGE));
    expect(f).toHaveLength(2);
    expect(f[1].debut).toBe(20 * ECHANTILLONNAGE);
    expect(f[1].dernier).toBe(true);
  });
  it('exactement 30 s → une fenêtre ; 30 min → 90 fenêtres couvrant tout', () => {
    expect(fenetres(30 * ECHANTILLONNAGE)).toHaveLength(1);
    const f = fenetres(1800 * ECHANTILLONNAGE);
    expect(f).toHaveLength(90);
    expect(f.at(-1)!.fin).toBe(1800 * ECHANTILLONNAGE);
    for (let i = 1; i < f.length; i++) expect(f[i].debut).toBeLessThan(f[i - 1].fin); // recouvrement
  });
});

describe('audio', () => {
  it('reconnaît un Ogg par ses quatre premiers octets', () => {
    expect(estOgg(new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 2]))).toBe(true);
    expect(estOgg(new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]))).toBe(false); // .m4a (ftyp)
  });
  it('48 kHz → 16 kHz garde la durée et la valeur moyenne', () => {
    const n = 48000;
    const entree = new Float32Array(n).fill(0.5);
    const sortie = reechantillonner(entree, 48000);
    expect(sortie).toHaveLength(16000);
    expect(sortie[100]).toBeCloseTo(0.5, 6);
    expect(dureeS(sortie.length)).toBe(1);
  });
  it('44,1 kHz → 16 kHz : 1 s reste 1 s', () => {
    const sortie = reechantillonner(new Float32Array(44100).fill(0.25), 44100);
    expect(Math.abs(sortie.length - 16000)).toBeLessThanOrEqual(1);
    expect(sortie[5000]).toBeCloseTo(0.25, 5);
  });
  it('mélange stéréo en mono par moyenne', () => {
    const m = enMono([new Float32Array([1, 0]), new Float32Array([0, 1])]);
    expect(Array.from(m)).toEqual([0.5, 0.5]);
  });
});

describe('formats de sortie', () => {
  const segs = [{ debut: 0, fin: 4.2, texte: ' Bonjour, c’est Marie. ' }, { debut: 4.2, fin: 3725.5, texte: 'La réunion est déplacée.' }];
  it('.srt : numéro, horodatage à la milliseconde, texte', () => {
    expect(versSrt(segs)).toBe('1\n00:00:00,000 --> 00:00:04,200\nBonjour, c’est Marie.\n\n2\n00:00:04,200 --> 01:02:05,500\nLa réunion est déplacée.\n');
  });
  it('texte continu', () => expect(versTexte(segs)).toBe('Bonjour, c’est Marie. La réunion est déplacée.'));
  it('majuscule au début et guillemet orphelin retiré (sortie réelle de Whisper)', () => {
    expect(versTexte([{ debut: 0, fin: 3, texte: ' bonjour, c’est Marie.' }])).toBe('Bonjour, c’est Marie.');
    expect(versTexte([{ debut: 0, fin: 3, texte: ' « Bonjour, c’est Marie.' }])).toBe('Bonjour, c’est Marie.');
    expect(versTexte([{ debut: 0, fin: 3, texte: '« Allô » dit-elle.' }])).toBe('« Allô » dit-elle.');
  });
  it('horloge et tailles', () => {
    expect(horloge(75)).toBe('1:15');
    expect(horloge(3725)).toBe('1:02:05');
    expect(tailleMo(98_490_000)).toBe('98 Mo');
    expect(tailleMo(5_400_000, 'en')).toBe('5.4 MB');
    expect(tailleMo(5_400_000)).toBe('5,4 Mo');
  });
  it('noms de fichiers', () => {
    expect(nomSortie('PTT-20261020-WA0007.opus', 'txt')).toBe('PTT-20261020-WA0007.txt');
    expect(nomSortie('Mémo vocal 12.m4a', 'srt')).toBe('Mémo vocal 12.srt');
  });
});

describe('taux de mots justes', () => {
  it('identique → 1, casse et ponctuation ignorées', () => {
    expect(motsJustes('Bonjour, c’est Marie.', 'bonjour c est marie')).toBe(1);
  });
  it('un mot faux sur quatre → 0,75', () => {
    expect(motsJustes('un deux trois quatre', 'un deux trios quatre')).toBe(0.75);
  });
  it('mot manquant ou ajouté compte comme une erreur', () => {
    expect(motsJustes('a b c d', 'a b c')).toBe(0.75);
    expect(motsJustes('a b c d', 'a b x c d')).toBe(0.75);
  });
  it('référence vide → n/a', () => expect(motsJustes('', 'x')).toBeNaN());
});
