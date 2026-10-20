// Calcul de dates pour la lettre : jours fériés français (Pâques compris), jours ouvrables, délais en jours et en mois.
// Dates manipulées en texte « AAAA-MM-JJ », sans fuseau : aucun décalage d'heure d'été possible.
// Règle de prorogation : un délai qui expire un samedi, un dimanche ou un jour férié ou chômé est prorogé jusqu'au premier jour
// ouvrable suivant (art. 642 du Code de procédure civile ; art. L221-19, 3° du Code de la consommation).
// Limite connue : les jours fériés locaux d'Alsace-Moselle (Vendredi saint, 26 décembre) ne sont pas comptés.

export type DateISO = string; // « 2026-10-20 »

const pad = (n: number) => String(n).padStart(2, '0');
const versUTC = (iso: DateISO) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j));
};
const depuisUTC = (d: Date): DateISO => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function estDateValide(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = versUTC(iso);
  return depuisUTC(d) === iso;
}

export function ajouterJours(iso: DateISO, n: number): DateISO {
  const d = versUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return depuisUTC(d);
}

/** Ajoute des mois (négatif possible) : même quantième, à défaut le dernier jour du mois (art. 641 CPC). */
export function ajouterMois(iso: DateISO, n: number): DateISO {
  const [a, m, j] = iso.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  const an = Math.floor(total / 12);
  const mois = total - an * 12; // 0 à 11
  const dernier = new Date(Date.UTC(an, mois + 1, 0)).getUTCDate();
  return `${an}-${pad(mois + 1)}-${pad(Math.min(j, dernier))}`;
}

/** Jour de la semaine : 0 = dimanche … 6 = samedi. */
export const jourSemaine = (iso: DateISO) => versUTC(iso).getUTCDay();

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher, calendrier grégorien). */
export function paques(annee: number): DateISO {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return `${annee}-${pad(mois)}-${pad(jour)}`;
}

/** Les onze jours fériés légaux de l'année, avec leur nom. */
export function joursFeries(annee: number): Map<DateISO, string> {
  const p = paques(annee);
  const f = new Map<DateISO, string>();
  f.set(`${annee}-01-01`, 'Jour de l’an');
  f.set(ajouterJours(p, 1), 'Lundi de Pâques');
  f.set(`${annee}-05-01`, 'Fête du Travail');
  f.set(`${annee}-05-08`, 'Victoire 1945');
  f.set(ajouterJours(p, 39), 'Ascension');
  f.set(ajouterJours(p, 50), 'Lundi de Pentecôte');
  f.set(`${annee}-07-14`, 'Fête nationale');
  f.set(`${annee}-08-15`, 'Assomption');
  f.set(`${annee}-11-01`, 'Toussaint');
  f.set(`${annee}-11-11`, 'Armistice 1918');
  f.set(`${annee}-12-25`, 'Noël');
  return f;
}

export const nomFerie = (iso: DateISO): string | undefined => joursFeries(Number(iso.slice(0, 4))).get(iso);

/** Raison pour laquelle le jour n'est pas ouvrable (samedi, dimanche, nom du férié), ou null s'il l'est. */
export function raisonNonOuvrable(iso: DateISO): string | null {
  const s = jourSemaine(iso);
  const ferie = nomFerie(iso);
  if (ferie) return ferie;
  if (s === 6) return 'samedi';
  if (s === 0) return 'dimanche';
  return null;
}

export const estOuvrable = (iso: DateISO) => raisonNonOuvrable(iso) === null;

export interface Echeance {
  brute: DateISO;      // le dernier jour du délai avant prorogation
  date: DateISO;       // le dernier jour du délai après prorogation
  proroge: boolean;
  raison: string | null; // pourquoi la date brute ne compte pas (« samedi », « Toussaint »…)
}

/** Premier jour ouvrable à partir de la date (elle-même comprise) : prorogation d'un délai qui expire. */
export function proroger(brute: DateISO): Echeance {
  let d = brute;
  const raison = raisonNonOuvrable(brute);
  while (!estOuvrable(d)) d = ajouterJours(d, 1);
  return { brute, date: d, proroge: d !== brute, raison };
}

/** Dernier jour ouvrable avant la date (elle-même comprise) : pour un délai « au plus tard avant » qu'on ne proroge pas. */
export function veilleOuvrable(iso: DateISO): DateISO {
  let d = iso;
  while (!estOuvrable(d)) d = ajouterJours(d, -1);
  return d;
}

/**
 * Délai de rétractation de 14 jours : le jour de départ (conclusion du contrat ou réception du bien) n'est pas compté
 * (art. L221-19, 1°), le délai expire à la fin du 14e jour, puis prorogation éventuelle (art. L221-19, 3°).
 */
export function delaiRetractation(depart: DateISO, jours = 14): Echeance {
  return proroger(ajouterJours(depart, jours));
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « lundi 2 novembre 2026 » (le 1er du mois s'écrit « 1er »). */
export function dateLongue(iso: DateISO): string {
  const [a, m, j] = iso.split('-').map(Number);
  return `${JOURS[jourSemaine(iso)]} ${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
}
/** « 2 novembre 2026 » : pour le corps d'une lettre. */
export function dateCourante(iso: DateISO): string {
  const [a, m, j] = iso.split('-').map(Number);
  return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
}

/** Écart en jours entiers entre deux dates (b - a). */
export const ecartJours = (a: DateISO, b: DateISO) => Math.round((versUTC(b).getTime() - versUTC(a).getTime()) / 86400000);

/** Date du jour dans le fuseau de l'appareil, au format « AAAA-MM-JJ ». */
export function aujourdhui(): DateISO {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
