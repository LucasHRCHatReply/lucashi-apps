import { describe, expect, it } from 'vitest';
import { calculer, chercherDepartements, deboursEstimes, emolumentsProportionnels, resume, type Entree, type Resultat } from './outil';
import { DEPARTEMENTS, TRANCHES_EMOLUMENTS } from './baremes-2026';

// Valeurs de référence : simulateur officiel des notaires de France (immobilier.notaires.fr/fr/frais-de-notaire),
// relevé le 20/10/2026. Le simulateur affiche chaque ligne arrondie à l'euro et le total arrondi à la centaine supérieure.
interface Ref { droits: number; csi: number; emol: number; formalites: number; tva: number; debours: number; totalAffiche: number }
const ok = (e: Entree): Resultat => {
  const r = calculer(e);
  if (!r.ok) throw new Error(r.code);
  return r;
};
const verifier = (r: Resultat, ref: Ref) => {
  expect(Math.abs(r.droits - ref.droits)).toBeLessThan(2);
  expect(Math.abs(r.csi - ref.csi)).toBeLessThan(2); // la référence affiche des lignes arrondies (écart ≤ 1 €)
  expect(Math.abs(r.emoluments - ref.emol)).toBeLessThan(2); // la référence affiche des lignes arrondies (écart ≤ 1 €)
  expect(Math.abs(r.formalites - ref.formalites)).toBeLessThan(2); // la référence affiche des lignes arrondies (écart ≤ 1 €)
  expect(Math.abs(r.tva - ref.tva)).toBeLessThan(2); // la référence affiche des lignes arrondies (écart ≤ 1 €)
  expect(r.debours).toBe(ref.debours);
  const somme = ref.droits + ref.csi + ref.emol + ref.formalites + ref.tva + ref.debours;
  expect(Math.abs(r.total - somme)).toBeLessThanOrEqual(2); // arrondis des lignes
  expect(Math.ceil(r.total / 100) * 100).toBe(ref.totalAffiche);
};

describe('4 cas de référence (relevé du 20/10/2026, immobilier.notaires.fr)', () => {
  it('ancien, Paris (5 %), 400 000 € : 31 500 €', () => {
    verifier(ok({ type: 'ancien', prix: 400_000, departement: '75' }), { droits: 25274, csi: 400, emol: 3661, formalites: 850, tva: 902, debours: 400, totalAffiche: 31_500 });
  });
  it('ancien, Gironde (5 %), 250 000 € : 20 400 €', () => {
    verifier(ok({ type: 'ancien', prix: 250_000, departement: '33' }), { droits: 15796, csi: 250, emol: 2440, formalites: 850, tva: 658, debours: 400, totalAffiche: 20_400 });
  });
  it('neuf (VEFA, 25 à 99 lots), 250 000 € : 5 200 €', () => {
    verifier(ok({ type: 'neuf', prix: 250_000, departement: '33', lots: '25-99' }), { droits: 1490, csi: 250, emol: 1626, formalites: 850, tva: 495, debours: 400, totalAffiche: 5_200 });
  });
  it('ancien, Alpes-Maritimes (4,50 %), 300 000 € dont 20 000 € de mobilier : 21 400 €', () => {
    verifier(ok({ type: 'ancien', prix: 300_000, mobilier: 20_000, departement: '06' }), { droits: 16259, csi: 280, emol: 2847, formalites: 850, tva: 739, debours: 400, totalAffiche: 21_400 });
  });
});

describe('cas complémentaires du même relevé', () => {
  it('Indre (3,80 %), 150 000 € : 11 200 €', () => {
    verifier(ok({ type: 'ancien', prix: 150_000, departement: '36' }), { droits: 7635, csi: 150, emol: 1626, formalites: 850, tva: 495, debours: 400, totalAffiche: 11_200 });
  });
  it('petit prix : émoluments plafonnés à 10 % (10 000 € : 1 000 € HT, débours 300 €)', () => {
    const r = ok({ type: 'ancien', prix: 10_000, departement: '33' });
    expect(r.plafonne).toBe(true);
    expect(Math.abs(r.emoluments + r.formalites - 1000)).toBeLessThanOrEqual(1);
    expect(Math.round(r.tva)).toBe(200);
    expect(r.csi).toBe(15);
    expect(Math.round(r.droits)).toBe(632);
    expect(r.debours).toBe(300);
    expect(Math.ceil(r.total / 100) * 100).toBe(2_200);
  });
  it('neuf : dégressivité par nombre de lots (250 000 € : 2 440 / 1 952 / 1 626 / 1 220 / 975 / 813 €)', () => {
    const attendu: [Parameters<typeof ok>[0]['lots'], number][] = [['1-10', 2440], ['11-24', 1952], ['25-99', 1626], ['100-249', 1220], ['250-499', 975], ['500+', 813]];
    for (const [lots, e] of attendu) expect(Math.abs(ok({ type: 'neuf', prix: 250_000, departement: '33', lots }).emoluments - e)).toBeLessThanOrEqual(1.5);
  });
});

describe('barème des émoluments A444-91, tarif du 1er mars 2026', () => {
  it('quatre tranches : 3,945 % / 1,627 % / 1,085 % / 0,814 %', () => {
    expect(TRANCHES_EMOLUMENTS.map((t) => t.taux)).toEqual([3.945, 1.627, 1.085, 0.814]);
  });
  it('valeur à chaque borne de tranche', () => {
    expect(emolumentsProportionnels(6_500)).toBeCloseTo(256.425, 3);
    expect(emolumentsProportionnels(17_000)).toBeCloseTo(427.26, 3);
    expect(emolumentsProportionnels(60_000)).toBeCloseTo(893.81, 3);
    expect(emolumentsProportionnels(100_000)).toBeCloseTo(1219.41, 3);
  });
  it('un euro au-delà d’une borne coûte le taux de la tranche suivante', () => {
    expect(emolumentsProportionnels(6_501) - emolumentsProportionnels(6_500)).toBeCloseTo(0.01627, 6);
    expect(emolumentsProportionnels(17_001) - emolumentsProportionnels(17_000)).toBeCloseTo(0.01085, 6);
    expect(emolumentsProportionnels(60_001) - emolumentsProportionnels(60_000)).toBeCloseTo(0.00814, 6);
  });
  it('est nul à zéro et croît avec le prix', () => {
    expect(emolumentsProportionnels(0)).toBe(0);
    expect(emolumentsProportionnels(200_000)).toBeGreaterThan(emolumentsProportionnels(199_999));
  });
});

describe('régimes et options', () => {
  it('101 départements, 89 à 5 %, 11 à 4,50 % et l’Indre à 3,80 %', () => {
    expect(DEPARTEMENTS).toHaveLength(101);
    expect(new Set(DEPARTEMENTS.map((d) => d.code)).size).toBe(101);
    expect(DEPARTEMENTS.filter((d) => d.taux === 5)).toHaveLength(89);
    expect(DEPARTEMENTS.filter((d) => d.taux === 4.5)).toHaveLength(11);
    expect(DEPARTEMENTS.filter((d) => d.taux === 3.8).map((d) => d.code)).toEqual(['36']);
  });
  it('primo-accédant : 4,50 % dans un département à 5 %, 4 % en Savoie, sans effet à 4,50 %', () => {
    const base = { type: 'ancien' as const, prix: 200_000 };
    expect(ok({ ...base, departement: '33', primo: true }).tauxDepartemental).toBe(4.5);
    expect(ok({ ...base, departement: '33', primo: true }).primoApplique).toBe(true);
    expect(ok({ ...base, departement: '73', primo: true }).tauxDepartemental).toBe(4);
    expect(ok({ ...base, departement: '06', primo: true }).primoApplique).toBe(false);
    expect(ok({ ...base, departement: '33', primo: true }).droits).toBeLessThan(ok({ ...base, departement: '33' }).droits);
  });
  it('remise du notaire : 20 % sur la fraction au-delà de 100 000 €', () => {
    const sans = ok({ type: 'ancien', prix: 400_000, departement: '75' });
    const avec = ok({ type: 'ancien', prix: 400_000, departement: '75', remise: 20 });
    expect(Math.abs(sans.emoluments - avec.emoluments - (emolumentsProportionnels(400_000) - emolumentsProportionnels(100_000)) * 0.2)).toBeLessThan(2); // la référence affiche des lignes arrondies (écart ≤ 1 €)
    expect(ok({ type: 'ancien', prix: 80_000, departement: '75', remise: 20 }).remiseEuros).toBe(0);
  });
  it('outre-mer : émoluments majorés (Réunion +40 %)', () => {
    const m = ok({ type: 'ancien', prix: 200_000, departement: '974' });
    expect(Math.abs(m.emoluments - emolumentsProportionnels(200_000) * 1.4)).toBeLessThan(0.51);
  });
  it('débours : 400 € dès 15 000 €, 300 € de 6 000 à 14 999 €, 5 % en dessous', () => {
    expect(deboursEstimes(15_000)).toBe(400);
    expect(deboursEstimes(14_999)).toBe(300);
    expect(deboursEstimes(3_000)).toBe(150);
  });
  it('refuse les saisies impossibles', () => {
    expect(calculer({ type: 'ancien', prix: 0, departement: '75' })).toEqual({ ok: false, code: 'prix' });
    expect(calculer({ type: 'ancien', prix: 100_000, mobilier: 30_000, departement: '75' })).toEqual({ ok: false, code: 'mobilier' });
    expect(calculer({ type: 'ancien', prix: 100_000, departement: 'XX' })).toEqual({ ok: false, code: 'departement' });
  });
});

describe('recherche de département', () => {
  it('par numéro et par nom, sans accent ni tiret', () => {
    expect(chercherDepartements('75')[0].nom).toBe('Paris');
    expect(chercherDepartements('2a')[0].nom).toBe('Corse-du-Sud');
    expect(chercherDepartements('ardeche')[0].code).toBe('07');
    expect(chercherDepartements('alpes maritimes')[0].code).toBe('06');
    expect(chercherDepartements('rhone').map((d) => d.code)).toContain('69');
    expect(chercherDepartements('zzz')).toHaveLength(0);
  });
});

describe('résumé', () => {
  it('écrit le total et le pourcentage', () => {
    const t = resume(ok({ type: 'ancien', prix: 400_000, departement: '75' }));
    expect(t).toContain('Total : 31 487 €');
    expect(t).toContain('Paris 75');
  });
});
