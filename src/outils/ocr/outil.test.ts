import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorker } from 'tesseract.js';
import { boiteEnPourcent, confianceMoyenne, dimensionsReduites, distance, etatProgression, langueParDefaut, motsValides, recollerParagraphes, tauxCaracteresJustes } from './outil';

const ici = (f: string) => fileURLToPath(new URL(f, import.meta.url));
const attendu = (nom: string) => readFileSync(ici(`./fixtures/${nom}.txt`), 'utf8');

describe('recollerParagraphes', () => {
  it('recolle les lignes coupées par la largeur de la fenêtre', () => {
    expect(recollerParagraphes('Le tarif de l’abonnement\npasse à 12,90 € par mois\nà partir du 1er janvier.')).toBe('Le tarif de l’abonnement passe à 12,90 € par mois à partir du 1er janvier.');
  });
  it('garde une ligne vide entre deux paragraphes', () => {
    expect(recollerParagraphes('Un\ndeux\n\n\nTrois\nquatre')).toBe('Un deux\n\nTrois quatre');
  });
  it('reforme un mot coupé par un trait d’union de fin de ligne, minuscule suivante seulement', () => {
    expect(recollerParagraphes('Une réunion exem-\nplaire et un porte-\nManteau')).toBe('Une réunion exemplaire et un porte- Manteau');
  });
  it('garde un élément de liste par ligne', () => {
    expect(recollerParagraphes('Courses :\n- pain\n- lait\n1. un\n2) deux')).toBe('Courses :\n\n- pain\n\n- lait\n\n1. un\n\n2) deux');
  });
  it('accepte les fins de ligne Windows et un texte vide', () => {
    expect(recollerParagraphes('a\r\nb')).toBe('a b');
    expect(recollerParagraphes('')).toBe('');
  });
});

describe('mesure de qualité', () => {
  it('distance de Levenshtein : chat → chats = 1, é compte pour un', () => {
    expect(distance('chat', 'chats')).toBe(1);
    expect(distance('été', 'ete')).toBe(2);
    expect(distance('', 'abc')).toBe(3);
  });
  it('taux : identique = 1, un caractère faux sur dix = 0,9, espaces normalisés', () => {
    expect(tauxCaracteresJustes('abc  def', 'abc\ndef')).toBe(1);
    expect(tauxCaracteresJustes('0123456789', '0123456780')).toBeCloseTo(0.9);
  });
  it('référence vide : n/a (null), jamais 100 %', () => {
    expect(tauxCaracteresJustes('  ', 'texte')).toBeNull();
  });
  it('ne descend jamais sous zéro', () => {
    expect(tauxCaracteresJustes('ab', 'xxxxxxxxxxxx')).toBe(0);
  });
});

describe('image et zones', () => {
  it('réduit une photo de 6000×4000 à 3200 de large sans la déformer, n’agrandit jamais', () => {
    expect(dimensionsReduites(6000, 4000)).toMatchObject({ largeur: 3200, hauteur: 2133 });
    expect(dimensionsReduites(800, 600)).toEqual({ largeur: 800, hauteur: 600, facteur: 1 });
  });
  it('écarte les boîtes vides', () => {
    const mots = motsValides([
      { texte: 'ok', confiance: 90, x0: 0, y0: 0, x1: 10, y1: 5 },
      { texte: ' ', confiance: 90, x0: 0, y0: 0, x1: 10, y1: 5 },
      { texte: 'nul', confiance: 90, x0: 4, y0: 4, x1: 4, y1: 9 },
    ]);
    expect(mots.map((m) => m.texte)).toEqual(['ok']);
    expect(motsValides(undefined)).toEqual([]);
  });
  it('boîte en pourcentages de l’image', () => {
    expect(boiteEnPourcent({ texte: 'a', confiance: 1, x0: 100, y0: 50, x1: 300, y1: 100 }, 1000, 500)).toEqual({ gauche: 10, haut: 10, largeur: 20, hauteur: 10 });
  });
  it('confiance moyenne : n/a sans mot', () => {
    expect(confianceMoyenne([])).toBeNull();
    expect(confianceMoyenne([{ texte: 'a', confiance: 80, x0: 0, y0: 0, x1: 1, y1: 1 }, { texte: 'b', confiance: 100, x0: 0, y0: 0, x1: 1, y1: 1 }])).toBe(90);
  });
});

describe('réglages', () => {
  it('langue de départ selon la page', () => {
    expect(langueParDefaut('fr')).toBe('fra');
    expect(langueParDefaut('en')).toBe('eng');
  });
  it('progression : le pourcentage n’apparaît que pour la lecture', () => {
    expect(etatProgression('recognizing text', 0.426, 'fr')).toEqual({ texte: 'Lecture 43 %', valeur: 43 });
    expect(etatProgression('loading language traineddata', 0.5, 'en')).toEqual({ texte: 'Loading language', valeur: null });
    expect(etatProgression('initializing api', 1, 'fr').valeur).toBeNull();
  });
});

// Vraie reconnaissance, avec les données de langue du site (public/outils-assets/ocr), images fabriquées avec un texte connu.
describe('reconnaissance (tesseract.js, données servies par le site)', () => {
  const langPath = ici('../../../public/outils-assets/ocr');
  const lire = async (langue: string, image: string) => {
    const w = await createWorker(langue, 1, { langPath, gzip: false, cacheMethod: 'none' });
    try { return (await w.recognize(ici(`./fixtures/${image}`))).data; } finally { await w.terminate(); }
  };

  it('français : texte accentué, apostrophe, € → au moins 95 % de caractères justes', async () => {
    const d = await lire('fra', 'fr.png');
    expect(tauxCaracteresJustes(attendu('fr'), d.text)!).toBeGreaterThanOrEqual(0.95);
  }, 90_000);

  it('anglais : montant et ponctuation → au moins 95 % de caractères justes', async () => {
    const d = await lire('eng', 'en.png');
    expect(tauxCaracteresJustes(attendu('en'), d.text)!).toBeGreaterThanOrEqual(0.95);
    expect(d.text).toContain('$1,284.50');
  }, 90_000);

  it('petite capture d’écran (police 19 px, fond gris) → au moins 95 %', async () => {
    const d = await lire('fra', 'fr-petit.png');
    expect(tauxCaracteresJustes(attendu('fr'), d.text)!).toBeGreaterThanOrEqual(0.95);
  }, 90_000);

  it('fra+eng lit aussi le français, et chaque mot a une boîte', async () => {
    const d = await lire('fra+eng', 'fr.png');
    expect(tauxCaracteresJustes(attendu('fr'), d.text)!).toBeGreaterThanOrEqual(0.95);
    const mots = motsValides(d.words.map((w) => ({ texte: w.text, confiance: w.confidence, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 })));
    expect(mots.length).toBeGreaterThan(30);
  }, 90_000);
});
