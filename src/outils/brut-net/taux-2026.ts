// Taux et plafonds 2026 de l'outil « salaire brut / net ». Un seul fichier à relire chaque janvier.
// Toutes les parts sont des parts SALARIALES (en %), sauf mention contraire.
// Vérifié le 20/10/2026 : plafond (arrêté du 22/12/2025, JO du 23/12/2025), CSG/CRDS (URSSAF), Agirc-Arrco (Chiffr'Agirc-Arrco 2026),
// pension civile (Service des retraites de l'État), RAFP (rafp.fr). Contrôle croisé : simulateur mon-entreprise.urssaf.fr (voir outil.test.ts).
export const MILLESIME = 2026;
export const DATE_TAUX = '2026-01-01';
export const DATE_VERIFICATION = '2026-10-20';

/** Plafond mensuel de la Sécurité sociale (1 PMSS), en euros. */
export const PMSS_MENSUEL = 4005;

export const TAUX = {
  // Sécurité sociale (régime général)
  vieillessePlafonnee: 6.9, // sur la part du brut ≤ 1 PMSS
  vieillesseDeplafonnee: 0.4, // sur tout le brut

  // Agirc-Arrco : taux contractuels 6,20 % (T1) et 17 % (T2), × taux d'appel 127 %, dont 40 % à la charge du salarié
  agircT1: 3.15, // tranche 1 : brut jusqu'à 1 PMSS
  agircT2: 8.64, // tranche 2 : brut de 1 à 8 PMSS
  cegT1: 0.86, // contribution d'équilibre général, tranche 1
  cegT2: 1.08, // tranche 2
  cet: 0.14, // contribution d'équilibre technique, sur T1 + T2, due seulement si le brut dépasse 1 PMSS
  apec: 0.024, // cadres : jusqu'à 4 PMSS
  prevoyanceCadreEmployeur: 1.5, // minimum conventionnel, à la charge de l'employeur, sur T1 : ne se déduit pas du net mais entre dans l'assiette de la CSG

  // CSG / CRDS : assiette = 98,25 % du brut jusqu'à 4 PMSS, 100 % au-delà (+ part employeur de mutuelle et de prévoyance)
  csgDeductible: 6.8,
  csgNonDeductible: 2.4,
  crds: 0.5,
  abattementCsg: 98.25,

  // Fonction publique (fonctionnaire d'État, simplifié)
  pensionCivile: 11.1, // retenue pour pension, sur le traitement indiciaire
  rafp: 5.0, // retraite additionnelle, sur les primes
  rafpPlafondPrimes: 20, // les primes ne comptent que jusqu'à 20 % du traitement indiciaire
} as const;

export const MULTIPLES = { plafondCsg: 4, plafondApec: 4, plafondAgirc: 8 } as const;

export const SOURCES_TAUX = [
  { titre: 'Plafond de la Sécurité sociale 2026 (arrêté du 22 décembre 2025)', url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053143451' },
  { titre: 'Taux de cotisations du secteur privé — Urssaf', url: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html' },
  { titre: 'Taux de cotisations du secteur public — Urssaf', url: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-public.html' },
  { titre: 'La CSG-CRDS : assiette et taux — Urssaf', url: 'https://www.urssaf.fr/accueil/employeur/cotisations/liste-cotisations/csg-crds.html' },
  { titre: 'Chiffr’Agirc-Arrco 2026 — taux de la retraite complémentaire', url: 'https://www.agirc-arrco.fr/storage/chiffrAA_2026_VF.pdf' },
  { titre: 'Simulateur salaire brut / net — mon-entreprise.urssaf.fr', url: 'https://mon-entreprise.urssaf.fr/simulateurs/salaire-brut-net' },
  { titre: 'Mes cotisations (retenue pour pension) — Service des retraites de l’État', url: 'https://retraitesdeletat.gouv.fr/actif/ma-carriere/mes-cotisations' },
  { titre: 'Fiche de paie : les cotisations — service-public.fr', url: 'https://www.service-public.fr/particuliers/vosdroits/F559' },
];
