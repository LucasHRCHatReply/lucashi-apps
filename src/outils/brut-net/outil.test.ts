import { describe, expect, it } from 'vitest';
import { calculer, depuisBrut, depuisNet, type Entree } from './outil';
import { PMSS_MENSUEL } from './taux-2026';

// Valeurs relevées le 20/10/2026 sur le simulateur officiel https://mon-entreprise.urssaf.fr/simulateurs/salaire-brut-net
// (version 07/2026, CDI, entreprise de plus de 50 salariés sans accord, mutuelle obligatoire par défaut de 20 € à la charge du salarié, temps plein).
const MUTUELLE = 20;
const CAS: { nom: string; brut: number; statut: 'non-cadre' | 'cadre'; netOfficiel: number }[] = [
  { nom: 'non-cadre au SMIC (1 823 €)', brut: 1823, statut: 'non-cadre', netOfficiel: 1421.14 },
  { nom: 'non-cadre à 3 000 €', brut: 3000, statut: 'non-cadre', netOfficiel: 2352.85 },
  { nom: 'cadre à 5 000 € (au-dessus du plafond)', brut: 5000, statut: 'cadre', netOfficiel: 3933.86 },
  { nom: 'cadre à 6 500 €', brut: 6500, statut: 'cadre', netOfficiel: 5136.65 },
  { nom: 'cadre à 17 000 € (au-dessus de 4 plafonds)', brut: 17000, statut: 'cadre', netOfficiel: 13554.72 },
];

describe('cas de référence contre le simulateur officiel (±1 %)', () => {
  for (const c of CAS) {
    it(c.nom, () => {
      const r = depuisBrut(c.brut, { statut: c.statut, mutuelle: MUTUELLE });
      expect(Math.abs(r.netAvantImpot - c.netOfficiel) / c.netOfficiel).toBeLessThan(0.01);
      // en pratique l'écart est de quelques centimes : on le garde sous 1 euro pour détecter une dérive de taux
      expect(Math.abs(r.netAvantImpot - c.netOfficiel)).toBeLessThan(1);
    });
  }
  it('cadre à 5 000 € : détail des lignes (retraite complémentaire 264,31 €, CSG déductible 339,50 €, APEC 1,20 €)', () => {
    const r = depuisBrut(5000, { statut: 'cadre', mutuelle: MUTUELLE });
    const m = (id: string) => r.lignes.filter((l) => l.id.startsWith(id)).reduce((s, l) => s + l.montant, 0);
    expect(m('vieillessePlafonnee')).toBeCloseTo(276.35, 1);
    expect(m('vieillesseDeplafonnee')).toBeCloseTo(20, 1);
    expect(m('agir') + m('ceg') + m('cet')).toBeCloseTo(264.31, 0);
    expect(m('apec')).toBeCloseTo(1.2, 2);
    expect(m('csgDeductible')).toBeCloseTo(339.5, 1);
    expect(m('csgNonDeductible') + m('crds')).toBeCloseTo(144.78, 1);
    expect(r.netImposable).toBeCloseTo(4158.72, 0);
  });
});

describe('propriétés', () => {
  const entrees: Entree[] = [
    { statut: 'non-cadre' }, { statut: 'cadre' }, { statut: 'non-cadre', mutuelle: 30, quotite: 80 },
    { statut: 'cadre', mutuelle: 20 }, { statut: 'public', primes: 15 }, { statut: 'public' },
  ];
  it('aller-retour brut → net → brut (au centime)', () => {
    for (const e of entrees) for (const brut of [1200, 1823.03, 2500, 3000, 4500, 6500, 9000, 17000, 25000]) {
      const net = depuisBrut(brut, e).netAvantImpot;
      const retour = depuisNet(net, e).brut;
      // au saut de la CET près (brut juste au-dessus du plafond), on retombe sur un brut au net identique
      expect(depuisBrut(retour, e).netAvantImpot).toBeCloseTo(net, 2);
      const p = PMSS_MENSUEL * ((e.quotite ?? 100) / 100);
      if (Math.abs(brut - p) > 10) expect(retour).toBeCloseTo(brut, 1);
    }
  });
  it('le net est inférieur au brut et croît avec lui (hors saut au plafond)', () => {
    let avant = 0;
    for (let b = 1000; b <= 20000; b += 250) {
      const n = depuisBrut(b, { statut: 'non-cadre' }).netAvantImpot;
      expect(n).toBeLessThan(b);
      if (b !== 4250) expect(n).toBeGreaterThan(avant - 0.01);
      avant = n;
    }
  });
  it('brut nul : tout vaut zéro', () => {
    const r = depuisBrut(0, { statut: 'cadre' });
    expect(r.netAvantImpot).toBe(0);
    expect(r.lignes).toHaveLength(0);
  });
  it('temps partiel : le plafond baisse avec la quotité (CET due dès 80 % de 4 005 €)', () => {
    const plein = depuisBrut(3500, { statut: 'non-cadre', quotite: 100 });
    const partiel = depuisBrut(3500, { statut: 'non-cadre', quotite: 80 });
    expect(plein.lignes.some((l) => l.id === 'cet')).toBe(false);
    expect(partiel.lignes.some((l) => l.id === 'cet')).toBe(true);
  });
});

describe('fonction publique (simplifiée)', () => {
  it('traitement seul : pension civile 11,10 %, pas de RAFP', () => {
    const r = depuisBrut(2500, { statut: 'public' });
    const pension = r.lignes.find((l) => l.id === 'pension')!;
    expect(pension.montant).toBeCloseTo(277.5, 2);
    expect(r.lignes.some((l) => l.id === 'rafp')).toBe(false);
    // CSG + CRDS : 9,70 % de 98,25 % du brut
    const csg = r.lignes.filter((l) => l.groupe === 'csg').reduce((s, l) => s + l.montant, 0);
    expect(csg).toBeCloseTo(2500 * 0.9825 * 0.097, 2);
  });
  it('primes : la RAFP porte sur les primes, plafonnées à 20 % du traitement', () => {
    const r = depuisBrut(3000, { statut: 'public', primes: 10 }); // primes 300 ; traitement 2 700 ; plafond 540
    expect(r.lignes.find((l) => l.id === 'rafp')!.montant).toBeCloseTo(15, 2);
    const fortes = depuisBrut(3000, { statut: 'public', primes: 40 }); // primes 1 200 ; traitement 1 800 ; plafond 360
    expect(fortes.lignes.find((l) => l.id === 'rafp')!.montant).toBeCloseTo(18, 2);
  });
});

describe('calculer : périodes et mois versés', () => {
  const e: Entree = { statut: 'non-cadre' };
  it('annuel sur 12 mois = mensuel × 12', () => {
    const m = calculer({ sens: 'brut', montant: 3000, periode: 'mensuel', mois: 12, entree: e });
    const a = calculer({ sens: 'brut', montant: 36000, periode: 'annuel', mois: 12, entree: e });
    expect(a.netAvantImpot).toBeCloseTo(m.netAvantImpot, 6);
    expect(a.annuel.netAvantImpot).toBeCloseTo(m.netAvantImpot * 12, 4);
  });
  it('13 mois : le brut annuel est réparti sur 13 versements', () => {
    const r = calculer({ sens: 'brut', montant: 39000, periode: 'annuel', mois: 13, entree: e });
    expect(r.brut).toBeCloseTo(3000, 6);
    expect(r.annuel.brut).toBeCloseTo(39000, 4);
  });
  it('net → brut annuel', () => {
    const r = calculer({ sens: 'net', montant: 28000, periode: 'annuel', mois: 12, entree: e });
    expect(r.annuel.netAvantImpot).toBeCloseTo(28000, 1);
  });
  it('impôt : taux appliqué au net imposable', () => {
    const r = calculer({ sens: 'brut', montant: 3000, periode: 'mensuel', mois: 12, entree: { ...e, mutuelle: 20, tauxImpot: 5.3 } });
    expect(r.netImposable).toBeCloseTo(2458.91, 0); // officiel : 2 458,91 €
    expect(r.impot).toBeCloseTo(130.3, 0); // officiel : 130,33 € au taux de 5,3 %
  });
});
