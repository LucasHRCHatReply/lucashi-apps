// Logique pure du calcul des frais de notaire (aucun DOM). Les barèmes sont dans baremes-2026.ts.
import {
  CSI_MINIMUM, CSI_TAUX, DEPARTEMENTS, FORMALITES_HT, FRAIS_ASSIETTE, LOTS, MAJORATION_EMOLUMENTS, MOBILIER_MAX,
  PLAFOND_EMOLUMENTS, PLAFOND_EMOLUMENTS_MINIMUM, REMISE_MAX, REMISE_SEUIL, TAXE_COMMUNALE, TAUX_TPF_NEUF, TRANCHES_EMOLUMENTS,
  TVA, TVA_NEUF, departementParCode, type CleLots, type Departement,
} from './baremes-2026';

export interface Entree {
  type: 'ancien' | 'neuf';
  prix: number;
  mobilier?: number;
  departement: string; // code
  primo?: boolean;
  lots?: CleLots; // neuf seulement
  remise?: number; // % de remise du notaire sur la fraction au-delà de 100 000 €
}

export interface Resultat {
  ok: true;
  type: 'ancien' | 'neuf';
  prix: number;
  mobilier: number;
  departement: Departement;
  tauxDepartemental: number; // % appliqué (primo-accédant compris)
  primoApplique: boolean;
  droits: number; // droits de mutation (ancien) ou taxe de publicité foncière (neuf)
  emoluments: number;
  formalites: number;
  tva: number;
  csi: number;
  debours: number;
  total: number;
  pourcent: number; // total / prix, en %
  partEtat: number; // part des droits et de la contribution dans le total, en %
  plafonne: boolean; // émoluments ramenés à 10 % du prix
  remiseEuros: number;
}
export interface Erreur { ok: false; code: 'prix' | 'mobilier' | 'departement' }

/** Émoluments proportionnels A444-91 (HT) sur un prix, avant coefficient et remise. */
export function emolumentsProportionnels(prix: number): number {
  let total = 0;
  for (const t of TRANCHES_EMOLUMENTS) {
    const haut = t.jusqua ?? Infinity;
    if (prix <= t.de) break;
    total += (Math.min(prix, haut) - t.de) * (t.taux / 100);
  }
  return total;
}

/** Débours estimés (alignés sur le simulateur des notaires) : 400 € dès 15 000 €, 300 € au plus en dessous, 5 % du prix sur les très petits prix. */
export function deboursEstimes(prix: number): number {
  if (prix >= 15_000) return 400;
  return Math.min(300, Math.round(prix * 0.05));
}

export function calculer(e: Entree): Resultat | Erreur {
  const prix = e.prix;
  if (!Number.isFinite(prix) || prix <= 0) return { ok: false, code: 'prix' };
  const mobilier = e.mobilier ?? 0;
  if (!Number.isFinite(mobilier) || mobilier < 0 || mobilier > prix * MOBILIER_MAX) return { ok: false, code: 'mobilier' };
  const dep = departementParCode(e.departement);
  if (!dep) return { ok: false, code: 'departement' };

  const assiette = prix - mobilier;
  const primoApplique = !!e.primo && dep.tauxPrimo < dep.taux;
  const tauxDepartemental = e.primo ? dep.tauxPrimo : dep.taux;

  const droits = e.type === 'neuf'
    ? (assiette / (1 + TVA_NEUF)) * (TAUX_TPF_NEUF / 100)
    : assiette * ((tauxDepartemental * (1 + FRAIS_ASSIETTE) + TAXE_COMMUNALE) / 100);
  const csi = Math.max(CSI_MINIMUM, assiette * CSI_TAUX);

  const lots = LOTS.find((l) => l.cle === (e.lots ?? '25-99')) ?? LOTS[2];
  const coefficient = (e.type === 'neuf' ? lots.coefficient : 1) * (MAJORATION_EMOLUMENTS[dep.code] ?? 1);
  let emoluments = emolumentsProportionnels(prix) * coefficient;
  let remiseEuros = 0;
  const remise = Math.min(Math.max(e.remise ?? 0, 0), REMISE_MAX);
  if (remise > 0 && prix > REMISE_SEUIL) {
    remiseEuros = ((emolumentsProportionnels(prix) - emolumentsProportionnels(REMISE_SEUIL)) * coefficient * remise) / 100;
    emoluments -= remiseEuros;
  }
  let formalites = FORMALITES_HT * (MAJORATION_EMOLUMENTS[dep.code] ?? 1);
  const plafond = Math.max(PLAFOND_EMOLUMENTS_MINIMUM, prix * PLAFOND_EMOLUMENTS);
  const plafonne = emoluments + formalites > plafond;
  if (plafonne) {
    const f = plafond / (emoluments + formalites);
    emoluments *= f;
    formalites *= f;
  }
  const tva = (emoluments + formalites) * TVA;
  const debours = deboursEstimes(prix);

  // Chaque ligne est arrondie à l'euro : le total affiché est la somme exacte des lignes affichées.
  const [rDroits, rCsi, rEmol, rForm, rTva, rDeb] = [droits, csi, emoluments, formalites, tva, debours].map(Math.round);
  const total = rDroits + rCsi + rEmol + rForm + rTva + rDeb;
  return {
    ok: true, type: e.type, prix, mobilier, departement: dep, tauxDepartemental, primoApplique,
    droits: rDroits, emoluments: rEmol, formalites: rForm, tva: rTva, csi: rCsi, debours: rDeb, total,
    pourcent: (total / prix) * 100,
    partEtat: ((rDroits + rCsi + rTva) / total) * 100,
    plafonne, remiseEuros: Math.round(remiseEuros),
  };
}

/** Recherche de département par numéro ou nom (sans accents ni tirets). */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function chercherDepartements(requete: string, liste: Departement[] = DEPARTEMENTS): Departement[] {
  const q = norm(requete);
  if (!q) return liste;
  const num = /^[0-9]+[ab]?$/.test(q);
  const sorties = liste
    .map((d) => {
      const n = norm(d.nom);
      const c = d.code.toLowerCase();
      let score = -1;
      if (c === q) score = 0;
      else if (num && c.startsWith(q)) score = 1;
      else if (!num && n.startsWith(q)) score = 1;
      else if (!num && n.split(' ').some((m) => m.startsWith(q))) score = 2;
      else if (!num && n.includes(q)) score = 3;
      return { d, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || DEPARTEMENTS.indexOf(a.d) - DEPARTEMENTS.indexOf(b.d));
  return sorties.map((x) => x.d);
}

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} €`;
export const formatEuros = eur;
export const formatPourcent = (n: number, d = 1) => `${n.toFixed(d).replace('.', ',')} %`;

/** Texte à copier. */
export function resume(r: Resultat): string {
  const lib = r.type === 'neuf' ? 'Taxe de publicité foncière' : 'Droits de mutation';
  return [
    `Frais d'acquisition estimés (${r.type === 'neuf' ? 'neuf, VEFA' : 'ancien'}, ${r.departement.nom} ${r.departement.code}) pour un prix de ${eur(r.prix)}`,
    `${lib} : ${eur(r.droits)}`,
    `Émoluments du notaire : ${eur(r.emoluments)}`,
    `Formalités : ${eur(r.formalites)}`,
    `TVA : ${eur(r.tva)}`,
    `Contribution de sécurité immobilière : ${eur(r.csi)}`,
    `Débours estimés : ${eur(r.debours)}`,
    `Total : ${eur(r.total)} (${formatPourcent(r.pourcent)} du prix)`,
  ].join('\n');
}
