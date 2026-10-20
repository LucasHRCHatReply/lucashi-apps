// Barèmes des frais d'acquisition immobilière, relevés et datés. Une seule source de vérité : ce fichier.
//
// Sources
//  - Taux des droits d'enregistrement par département : DGFiP, tableau « Droits d'enregistrement et taxe de publicité
//    foncière : taux, abattements de base et réductions de taux applicables au 1er juin 2026 », fichier dmto_2026-06.pdf
//    publié sur impots.gouv.fr (rubrique Partenaire > Notaires, Géomètres-Experts > Droits d'enregistrement), relevé le 20/10/2026.
//  - Relèvement à 5 % : article 116 de la loi de finances pour 2025 (loi n° 2025-127 du 14 février 2025), actes du
//    1er avril 2025 au 31 mars 2028 ; calendrier réécrit par l'article 121 de la loi de finances pour 2026. Le relèvement
//    ne s'applique pas à un primo-accédant qui achète sa résidence principale (CCH, art. L. 31-10-3).
//  - Taxe communale additionnelle 1,20 % (CGI, art. 1584) et frais d'assiette et de recouvrement 2,37 % du droit
//    départemental (CGI, art. 1647).
//  - Émoluments proportionnels : article A444-91 du Code de commerce, tarif en vigueur pour les prestations
//    accomplies à partir du 1er mars 2026 (arrêté du 25 février 2026, applicable jusqu'au 29 février 2028), tel que publié
//    par notaires.fr (acte n° 54, vente de gré à gré d'immeuble). TVA 20 %.
//  - Contribution de sécurité immobilière : 0,10 % du prix, minimum 15 € (CGI, art. 879).
//  - Taxe de publicité foncière réduite du neuf (VEFA) : 0,715 % du prix hors taxe.
//  - Formalités (850 € HT), débours estimés, dégressivité par nombre de lots, plafond de 10 % : estimations alignées sur le
//    simulateur des notaires (immobilier.notaires.fr/fr/frais-de-notaire), relevé le 20/10/2026.

export const DATE_RELEVE = '2026-10-20';
export const DATE_TAUX_DEPARTEMENTS = '2026-06-01';
export const DATE_TARIF_EMOLUMENTS = '2026-03-01';

export const TAXE_COMMUNALE = 1.2; // % du prix
export const FRAIS_ASSIETTE = 0.0237; // part ajoutée au droit départemental (2,37 %)
export const TAUX_DE_BASE = 4.5; // taux de droit commun avant relèvement (3,80 % : Indre seulement)
export const TAUX_TPF_NEUF = 0.715; // % du prix hors taxe
export const TVA_NEUF = 0.2;
export const CSI_TAUX = 0.001;
export const CSI_MINIMUM = 15;
export const TVA = 0.2;
export const FORMALITES_HT = 850;
export const PLAFOND_EMOLUMENTS = 0.1; // émoluments plafonnés à 10 % du prix, minimum 90 €
export const PLAFOND_EMOLUMENTS_MINIMUM = 90;
export const MOBILIER_MAX = 0.2; // le mobilier doit rester sous 20 % du prix
export const REMISE_MAX = 20; // % ; la remise porte sur la fraction de l'assiette au-delà de 100 000 €
export const REMISE_SEUIL = 100_000;

/** Tranches du barème proportionnel A444-91 (taux en %). `jusqua: null` = sans limite. */
export const TRANCHES_EMOLUMENTS: { de: number; jusqua: number | null; taux: number }[] = [
  { de: 0, jusqua: 6_500, taux: 3.945 },
  { de: 6_500, jusqua: 17_000, taux: 1.627 },
  { de: 17_000, jusqua: 60_000, taux: 1.085 },
  { de: 60_000, jusqua: null, taux: 0.814 },
];

/** Neuf : coefficient sur les émoluments selon le nombre de lots du programme. */
export const LOTS = [
  { cle: '1-10', libelle: '1 à 10', coefficient: 1 },
  { cle: '11-24', libelle: '11 à 24', coefficient: 0.8 },
  { cle: '25-99', libelle: '25 à 99', coefficient: 2 / 3 },
  { cle: '100-249', libelle: '100 à 249', coefficient: 0.5 },
  { cle: '250-499', libelle: '250 à 499', coefficient: 0.4 },
  { cle: '500+', libelle: '500 et plus', coefficient: 1 / 3 },
] as const;
export type CleLots = (typeof LOTS)[number]['cle'];

/** Majoration des émoluments dans les départements d'outre-mer (notaires.fr : +25 % GP/GF/MQ, +40 % La Réunion). */
export const MAJORATION_EMOLUMENTS: Record<string, number> = { '971': 1.25, '972': 1.25, '973': 1.25, '974': 1.4 };

export interface Departement {
  code: string;
  nom: string;
  /** Taux départemental voté, en % (hors primo-accédant). */
  taux: number;
  /** Taux pour un primo-accédant qui achète sa résidence principale. */
  tauxPrimo: number;
}

const D = (code: string, nom: string, taux: number, tauxPrimo?: number): Departement => ({
  code,
  nom,
  taux,
  tauxPrimo: tauxPrimo ?? Math.min(taux, TAUX_DE_BASE),
});

export const DEPARTEMENTS: Departement[] = [
  D('01', 'Ain', 5), D('02', 'Aisne', 5), D('03', 'Allier', 5), D('04', 'Alpes-de-Haute-Provence', 5),
  D('05', 'Hautes-Alpes', 4.5), D('06', 'Alpes-Maritimes', 4.5), D('07', 'Ardèche', 4.5), D('08', 'Ardennes', 5),
  D('09', 'Ariège', 5), D('10', 'Aube', 5), D('11', 'Aude', 5), D('12', 'Aveyron', 5),
  D('13', 'Bouches-du-Rhône', 5), D('14', 'Calvados', 5), D('15', 'Cantal', 5), D('16', 'Charente', 4.5),
  D('17', 'Charente-Maritime', 5), D('18', 'Cher', 5), D('19', 'Corrèze', 5), D('2A', 'Corse-du-Sud', 5),
  D('2B', 'Haute-Corse', 5), D('21', "Côte-d'Or", 5), D('22', "Côtes-d'Armor", 5), D('23', 'Creuse', 5),
  D('24', 'Dordogne', 5), D('25', 'Doubs', 5), D('26', 'Drôme', 4.5), D('27', 'Eure', 5),
  D('28', 'Eure-et-Loir', 5), D('29', 'Finistère', 5), D('30', 'Gard', 5), D('31', 'Haute-Garonne', 5),
  D('32', 'Gers', 5), D('33', 'Gironde', 5), D('34', 'Hérault', 5), D('35', 'Ille-et-Vilaine', 5),
  D('36', 'Indre', 3.8), D('37', 'Indre-et-Loire', 5), D('38', 'Isère', 5), D('39', 'Jura', 5),
  D('40', 'Landes', 5), D('41', 'Loir-et-Cher', 5), D('42', 'Loire', 5), D('43', 'Haute-Loire', 5),
  D('44', 'Loire-Atlantique', 5), D('45', 'Loiret', 5), D('46', 'Lot', 5), D('47', 'Lot-et-Garonne', 5),
  D('48', 'Lozère', 4.5), D('49', 'Maine-et-Loire', 5), D('50', 'Manche', 5), D('51', 'Marne', 5),
  D('52', 'Haute-Marne', 5), D('53', 'Mayenne', 5), D('54', 'Meurthe-et-Moselle', 5), D('55', 'Meuse', 5),
  D('56', 'Morbihan', 5), D('57', 'Moselle', 5), D('58', 'Nièvre', 5), D('59', 'Nord', 5),
  D('60', 'Oise', 4.5), D('61', 'Orne', 5), D('62', 'Pas-de-Calais', 5), D('63', 'Puy-de-Dôme', 5),
  D('64', 'Pyrénées-Atlantiques', 5), D('65', 'Hautes-Pyrénées', 4.5), D('66', 'Pyrénées-Orientales', 5),
  D('67', 'Bas-Rhin', 5), D('68', 'Haut-Rhin', 5), D('69', 'Rhône', 5), D('70', 'Haute-Saône', 5),
  D('71', 'Saône-et-Loire', 4.5), D('72', 'Sarthe', 5), D('73', 'Savoie', 5, 4), D('74', 'Haute-Savoie', 5),
  D('75', 'Paris', 5), D('76', 'Seine-Maritime', 5), D('77', 'Seine-et-Marne', 5), D('78', 'Yvelines', 5),
  D('79', 'Deux-Sèvres', 5), D('80', 'Somme', 5), D('81', 'Tarn', 5), D('82', 'Tarn-et-Garonne', 5),
  D('83', 'Var', 5), D('84', 'Vaucluse', 5), D('85', 'Vendée', 5), D('86', 'Vienne', 5),
  D('87', 'Haute-Vienne', 5), D('88', 'Vosges', 5), D('89', 'Yonne', 5), D('90', 'Territoire de Belfort', 5),
  D('91', 'Essonne', 5), D('92', 'Hauts-de-Seine', 5), D('93', 'Seine-Saint-Denis', 5), D('94', 'Val-de-Marne', 5),
  D('95', "Val-d'Oise", 5), D('971', 'Guadeloupe', 4.5), D('972', 'Martinique', 5), D('973', 'Guyane', 5),
  D('974', 'La Réunion', 5), D('976', 'Mayotte', 4.5),
];

export const departementParCode = (code: string): Departement | undefined => DEPARTEMENTS.find((d) => d.code === code);
