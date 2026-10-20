import { describe, expect, it } from 'vitest';
import { compterMots, resume } from './outil';

describe('compterMots', () => {
  it('compte les mots d’une phrase simple', () => {
    const c = compterMots('Le chat dort sur le canapé.');
    expect(c.mots).toBe(6);
    expect(c.phrases).toBe(1);
  });
  it('garde l’apostrophe et le trait d’union dans un seul mot', () => {
    expect(compterMots("l'été porte-clés aujourd’hui").mots).toBe(3);
  });
  it('compte les accents et les chiffres', () => {
    expect(compterMots('Où ça ? 3 fois, 2026.').mots).toBe(5);
  });
  it('sépare les paragraphes par une ligne vide', () => {
    expect(compterMots('Un.\n\nDeux.\r\n\r\nTrois.').paragraphes).toBe(3);
  });
  it('un texte vide donne zéro partout, y compris la lecture', () => {
    expect(compterMots('')).toEqual({ mots: 0, caracteres: 0, caracteresSansEspaces: 0, phrases: 0, paragraphes: 0, minutesLecture: 0 });
  });
  it('compte les caractères avec et sans espaces (émojis = 1)', () => {
    const c = compterMots('a b 😀');
    expect(c.caracteres).toBe(5);
    expect(c.caracteresSansEspaces).toBe(3);
  });
  it('lecture : 460 mots = 2 minutes à 230 mots par minute', () => {
    expect(compterMots('mot '.repeat(460)).minutesLecture).toBe(2);
  });
});

describe('resume', () => {
  it('écrit le résumé dans la langue demandée', () => {
    const c = compterMots('Hello world.');
    expect(resume(c, 'en')).toContain('Words: 2');
    expect(resume(c, 'fr')).toContain('Mots : 2');
  });
});
