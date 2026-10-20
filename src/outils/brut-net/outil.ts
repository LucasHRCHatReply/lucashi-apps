// Logique pure de « salaire brut / net » : aucun DOM. Les taux viennent de taux-2026.ts.
import { MULTIPLES, PMSS_MENSUEL, TAUX } from './taux-2026';

export type Statut = 'non-cadre' | 'cadre' | 'public';

export interface Entree {
  statut: Statut;
  /** Temps de travail en % (le plafond de la Sécurité sociale est réduit d'autant). */
  quotite?: number;
  /** Part salarié de la mutuelle, en euros par mois (la part employeur est supposée égale). */
  mutuelle?: number;
  /** Fonction publique : part des primes dans le brut, en %. */
  primes?: number;
  /** Taux de prélèvement à la source, en %. */
  tauxImpot?: number;
}

export type Groupe = 'retraite' | 'csg' | 'autres';

export interface Ligne {
  id: string;
  groupe: Groupe;
  /** Assiette en euros par mois, taux en %, montant retenu en euros par mois. */
  base: number;
  taux: number;
  montant: number;
}

export interface Resultat {
  brut: number;
  lignes: Ligne[];
  cotisations: number;
  netAvantImpot: number;
  netImposable: number;
  impot: number;
  netApresImpot: number;
}

const pct = (x: number) => x / 100;
const arrondi = (x: number) => Math.round(x * 100) / 100;
const borne = (x: number, min: number, max: number) => Math.min(Math.max(x, min), max);

/** Brut mensuel → cotisations salariales, net avant impôt, net après impôt (tout par mois). */
export function depuisBrut(brutMensuel: number, e: Entree): Resultat {
  const B = Math.max(0, brutMensuel);
  const q = borne((e.quotite ?? 100) / 100, 0.01, 1);
  const P = PMSS_MENSUEL * q;
  const m = Math.max(0, e.mutuelle ?? 0);
  const lignes: Ligne[] = [];
  const ajoute = (id: string, groupe: Groupe, base: number, taux: number) => {
    if (base <= 0 || taux === 0) return;
    lignes.push({ id, groupe, base: arrondi(base), taux, montant: base * pct(taux) });
  };
  const t1 = Math.min(B, P);
  const t2 = borne(B - P, 0, (MULTIPLES.plafondAgirc - 1) * P);
  let prevoyanceEmployeur = 0;

  if (e.statut === 'public') {
    const primesPct = borne(e.primes ?? 0, 0, 100);
    const primes = B * pct(primesPct);
    const traitement = B - primes;
    ajoute('pension', 'retraite', traitement, TAUX.pensionCivile);
    ajoute('rafp', 'retraite', Math.min(primes, traitement * pct(TAUX.rafpPlafondPrimes)), TAUX.rafp);
  } else {
    ajoute('vieillessePlafonnee', 'retraite', t1, TAUX.vieillessePlafonnee);
    ajoute('vieillesseDeplafonnee', 'retraite', B, TAUX.vieillesseDeplafonnee);
    ajoute('agircT1', 'retraite', t1, TAUX.agircT1);
    ajoute('agircT2', 'retraite', t2, TAUX.agircT2);
    ajoute('cegT1', 'retraite', t1, TAUX.cegT1);
    ajoute('cegT2', 'retraite', t2, TAUX.cegT2);
    if (B > P) ajoute('cet', 'retraite', Math.min(B, MULTIPLES.plafondAgirc * P), TAUX.cet);
    if (e.statut === 'cadre') {
      ajoute('apec', 'autres', Math.min(B, MULTIPLES.plafondApec * P), TAUX.apec);
      prevoyanceEmployeur = t1 * pct(TAUX.prevoyanceCadreEmployeur);
    }
  }

  const plafondCsg = MULTIPLES.plafondCsg * P;
  const assietteCsg = Math.min(B, plafondCsg) * pct(TAUX.abattementCsg) + Math.max(B - plafondCsg, 0) + prevoyanceEmployeur + m;
  ajoute('csgDeductible', 'csg', assietteCsg, TAUX.csgDeductible);
  ajoute('csgNonDeductible', 'csg', assietteCsg, TAUX.csgNonDeductible);
  ajoute('crds', 'csg', assietteCsg, TAUX.crds);
  if (m > 0) lignes.push({ id: 'mutuelle', groupe: 'autres', base: arrondi(m), taux: 100, montant: m });

  const cotisations = lignes.reduce((s, l) => s + l.montant, 0);
  const netAvantImpot = B - cotisations;
  const csgNonDeduc = lignes.filter((l) => l.id === 'csgNonDeductible' || l.id === 'crds').reduce((s, l) => s + l.montant, 0);
  const netImposable = netAvantImpot + csgNonDeduc + m + prevoyanceEmployeur;
  const impot = netImposable * pct(Math.max(0, e.tauxImpot ?? 0));
  return { brut: B, lignes, cotisations, netAvantImpot, netImposable, impot, netApresImpot: netAvantImpot - impot };
}

/** Net avant impôt mensuel → brut mensuel (recherche par dichotomie : le net croît avec le brut, à un saut près au plafond). */
export function depuisNet(netMensuel: number, e: Entree): Resultat {
  const cible = Math.max(0, netMensuel);
  if (cible === 0) return depuisBrut(0, e);
  let bas = cible;
  let haut = cible * 3 + 100;
  for (let i = 0; i < 80; i++) {
    const milieu = (bas + haut) / 2;
    if (depuisBrut(milieu, e).netAvantImpot < cible) bas = milieu; else haut = milieu;
  }
  return depuisBrut(haut, e);
}

export interface Demande {
  sens: 'brut' | 'net';
  montant: number;
  periode: 'mensuel' | 'annuel';
  /** Nombre de mois de salaire versés dans l'année : 12 ou 13. */
  mois: 12 | 13;
  entree: Entree;
}

export interface Synthese extends Resultat {
  mois: number;
  /** Les mêmes grandeurs sur l'année (mensuel × mois versés). */
  annuel: { brut: number; cotisations: number; netAvantImpot: number; netApresImpot: number };
  /** Le net après impôt n'est donné que si un taux est saisi. */
  tauxImpot: number;
}

export function calculer(d: Demande): Synthese {
  const mois = d.mois;
  const parMois = d.periode === 'annuel' ? d.montant / mois : d.montant;
  const r = d.sens === 'brut' ? depuisBrut(parMois, d.entree) : depuisNet(parMois, d.entree);
  return {
    ...r,
    mois,
    tauxImpot: Math.max(0, d.entree.tauxImpot ?? 0),
    annuel: { brut: r.brut * mois, cotisations: r.cotisations * mois, netAvantImpot: r.netAvantImpot * mois, netApresImpot: r.netApresImpot * mois },
  };
}

/** Euros arrondis au centime (affichage fait par l'interface). */
export const centimes = arrondi;
