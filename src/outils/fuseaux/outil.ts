// Logique pure de l'outil « fuseaux horaires » : aucun DOM, tout passe par Intl (base de fuseaux du navigateur, heure d'été comprise).
// La liste de villes (villes.json) vient de GeoNames cities15000, licence CC-BY 4.0 (voir construire-villes.mjs).
import donnees from './villes.json';

export type Lang = 'fr' | 'en';

export interface Ville {
  id: string;
  en: string;
  fr: string;
  cc: string; // code pays ISO 3166-1 alpha-2 ('' pour un fuseau libre)
  tz: string; // identifiant IANA
}

export const MAX_VILLES = 8;

export const VILLES: Ville[] = (donnees as string[][]).map(([id, en, fr, cc, tz]) => ({ id, en, fr, cc, tz }));
const PAR_ID = new Map(VILLES.map((v) => [v.id, v]));

// ───────── Intl : composantes et décalage ─────────

const formats = new Map<string, Intl.DateTimeFormat>();
function format(tz: string): Intl.DateTimeFormat {
  let f = formats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formats.set(tz, f);
  }
  return f;
}

export interface Composantes { y: number; m: number; d: number; h: number; mi: number; s: number }

/** Date et heure locales d'un instant (ms epoch) dans un fuseau. */
export function composantes(ms: number, tz: string): Composantes {
  const o: Record<string, number> = {};
  for (const p of format(tz).formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour === 24 ? 0 : o.hour, mi: o.minute, s: o.second };
}

/** Décalage à UTC en minutes (Paris l'été : 120, Kolkata : 330, New York l'hiver : -300). */
export function decalage(ms: number, tz: string): number {
  const c = composantes(ms, tz);
  return Math.round((Date.UTC(c.y, c.m - 1, c.d, c.h, c.mi, c.s) - Math.floor(ms / 1000) * 1000) / 60000);
}

export function libelleUtc(minutes: number): string {
  const signe = minutes < 0 ? '−' : '+';
  const a = Math.abs(minutes);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `UTC${signe}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

const p2 = (n: number) => String(n).padStart(2, '0');
export const dateIso = (c: Composantes) => `${c.y}-${p2(c.m)}-${p2(c.d)}`;
export const heureIso = (c: Composantes) => `${p2(c.h)}:${p2(c.mi)}`;

export type Statut = 'ok' | 'inexistante' | 'ambigue';

/**
 * Instant correspondant à une date et une heure locales dans un fuseau.
 * - heure inexistante (saut du printemps, 02:30 à Paris le 29/03/2026) : décalée après le saut, statut « inexistante » ;
 * - heure qui existe deux fois (retour de l'automne) : première occurrence, statut « ambigue ».
 */
export function instantLocal(date: string, heure: string, tz: string): { ms: number; statut: Statut } {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = heure.split(':').map(Number);
  const essai = Date.UTC(y, m - 1, d, h, mi);
  const decalages = new Set([decalage(essai - 86400000, tz), decalage(essai + 86400000, tz)]);
  const valides = [...decalages].map((o) => essai - o * 60000).filter((t) => decalage(t, tz) === (essai - t) / 60000).sort((a, b) => a - b);
  if (valides.length >= 2) return { ms: valides[0], statut: 'ambigue' };
  if (valides.length === 1) return { ms: valides[0], statut: 'ok' };
  return { ms: essai - decalage(essai - 86400000, tz) * 60000, statut: 'inexistante' };
}

// ───────── villes ─────────

export function fuseauValide(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return /^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+)+$|^UTC$/.test(tz); } catch { return false; }
}

/** Ville connue (id du fichier) ou fuseau libre « tz:Europe/Lisbon ». */
export function villeParId(id: string): Ville | undefined {
  const v = PAR_ID.get(id);
  if (v) return v;
  if (id.startsWith('tz:') && fuseauValide(id.slice(3))) {
    const tz = id.slice(3);
    const nom = tz.split('/').pop()!.replace(/_/g, ' ');
    return { id, en: nom, fr: nom, cc: '', tz };
  }
  return undefined;
}

export const nomVille = (v: Ville, lang: Lang) => (lang === 'fr' ? v.fr : v.en);

const pays = new Map<string, Intl.DisplayNames | null>();
export function nomPays(cc: string, lang: Lang): string {
  if (!cc) return '';
  let dn = pays.get(lang);
  if (dn === undefined) {
    try { dn = new Intl.DisplayNames([lang], { type: 'region' }); } catch { dn = null; }
    pays.set(lang, dn);
  }
  try { return dn?.of(cc) ?? cc; } catch { return cc; }
}

export const sansAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ').trim();

/** Recherche de villes : début du nom d'abord, puis mot, puis contenu, puis pays. */
export function chercherVilles(q: string, lang: Lang, exclues: string[] = [], max = 8): Ville[] {
  const n = sansAccents(q);
  if (!n) return [];
  const sortie: { v: Ville; score: number }[] = [];
  for (const v of VILLES) {
    if (exclues.includes(v.id)) continue;
    const noms = [sansAccents(v.fr), sansAccents(v.en)];
    let score = 9;
    for (const nom of noms) {
      if (nom.startsWith(n)) score = Math.min(score, 0);
      else if (nom.split(/[\s-]+/).some((mot) => mot.startsWith(n))) score = Math.min(score, 1);
      else if (nom.includes(n)) score = Math.min(score, 2);
    }
    if (score === 9 && v.cc && sansAccents(nomPays(v.cc, lang)).startsWith(n)) score = 3;
    if (score < 9) sortie.push({ v, score });
  }
  sortie.sort((a, b) => a.score - b.score || nomVille(a.v, lang).localeCompare(nomVille(b.v, lang), lang));
  return sortie.slice(0, max).map((s) => s.v);
}

/** Ville du visiteur (fuseau du navigateur) + deux villes utiles, sans deux villes dans le même fuseau à l'instant donné. */
export function villesParDefaut(tzVisiteur: string, lang: Lang, ms: number): Ville[] {
  const choisies: Ville[] = [];
  const dec = (v: Ville) => decalage(ms, v.tz);
  const pose = (v?: Ville) => { if (v && !choisies.some((c) => c.id === v.id || dec(c) === dec(v))) choisies.push(v); };
  const memeFuseau = VILLES.filter((v) => v.tz === tzVisiteur);
  const capitale = (ids: string[]) => ids.map((i) => memeFuseau.find((v) => v.id === i)).find(Boolean);
  pose(capitale(['paris', 'london', 'new-york', 'tokyo', 'sydney', 'los-angeles']) ?? memeFuseau[0] ?? villeParId(`tz:${tzVisiteur}`));
  const candidats = lang === 'fr' ? ['new-york', 'tokyo', 'london', 'dubai'] : ['london', 'new-york', 'tokyo', 'sydney'];
  for (const id of candidats) if (choisies.length < 3) pose(PAR_ID.get(id));
  return choisies;
}

// ───────── réglette ─────────

export type Plage = 'bureau' | 'bord' | 'nuit';

/** Bureau 9 h–18 h, « bord » 7–9 h et 18–22 h, nuit le reste (heure locale fractionnaire). */
export function plage(heureLocale: number): Plage {
  const x = ((heureLocale % 24) + 24) % 24;
  if (x >= 9 && x < 18) return 'bureau';
  if ((x >= 7 && x < 9) || (x >= 18 && x < 22)) return 'bord';
  return 'nuit';
}

export interface Case { h: number; mi: number; plage: Plage }

/** Les 24 cases d'une ville : une par heure à partir de `debutMs`. La plage est jugée au milieu de la case. */
export function casesDe(debutMs: number, tz: string): Case[] {
  return Array.from({ length: 24 }, (_, i) => {
    const t = debutMs + i * 3600000;
    const c = composantes(t, tz);
    const milieu = composantes(t + 1800000, tz);
    return { h: c.h, mi: c.mi, plage: plage(milieu.h + milieu.mi / 60) };
  });
}

/** Début de la réglette : minuit local de la date dans la ville de référence. */
export const debutFenetre = (date: string, tzRef: string) => instantLocal(date, '00:00', tzRef).ms;

// ───────── état partagé dans le #fragment ─────────

export interface Etat { villes: string[]; ref: string; ms: number }

const dateHeureLocale = (ms: number, tz: string) => { const c = composantes(ms, tz); return `${dateIso(c)}T${heureIso(c)}`; };

/** `#v=paris,tokyo,new-york&r=paris&t=2026-10-21T14:00` : t est l'heure locale dans la ville r (par défaut la première). */
export function versFragment(e: Etat): string {
  const ville = villeParId(e.ref) ?? villeParId(e.villes[0]);
  const t = ville ? dateHeureLocale(e.ms, ville.tz) : '';
  return `#v=${e.villes.join(',')}&r=${e.ref}&t=${t}`;
}

export interface Lu { villes: string[]; ref?: string; ms?: number }

export function depuisFragment(fragment: string): Lu {
  const p = new URLSearchParams(fragment.replace(/^#/, ''));
  const villes: string[] = [];
  for (const id of (p.get('v') ?? '').split(',')) {
    const i = id.trim();
    if (i && villeParId(i) && !villes.includes(i) && villes.length < MAX_VILLES) villes.push(i);
  }
  const r = p.get('r') ?? undefined;
  const ref = r && villes.includes(r) ? r : villes[0];
  const t = (p.get('t') ?? '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  let ms: number | undefined;
  if (t && ref) {
    const [, d, h] = t;
    const ok = !Number.isNaN(Date.parse(`${d}T${h}:00Z`)) && Number(h.slice(0, 2)) < 24 && Number(h.slice(3)) < 60;
    if (ok) ms = instantLocal(d, h, villeParId(ref)!.tz).ms;
  }
  return { villes, ref, ms };
}

// ───────── affichage ─────────

export function dateCourte(ms: number, tz: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(ms));
}

/** Écart de jour calendaire entre la ville et la référence : -1, 0, +1… */
export function ecartJour(ms: number, tz: string, tzRef: string): number {
  const a = composantes(ms, tz);
  const b = composantes(ms, tzRef);
  return Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86400000);
}

export function heureLocale(ms: number, tz: string): string {
  return heureIso(composantes(ms, tz));
}

/** Résumé texte à copier : une ligne par ville. */
export function resume(ms: number, villes: Ville[], tzRef: string, lang: Lang): string {
  return villes.map((v) => {
    const ecart = ecartJour(ms, v.tz, tzRef);
    const jour = ecart === 0 ? '' : ` (${ecart > 0 ? '+' : '−'}${Math.abs(ecart)} ${lang === 'fr' ? 'j' : 'd'})`;
    return `${dateCourte(ms, v.tz, lang)} ${heureLocale(ms, v.tz)}${jour} — ${nomVille(v, lang)} (${libelleUtc(decalage(ms, v.tz))})`;
  }).join('\n');
}

// ───────── calendrier (.ics) ─────────

const echapperIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const utcIcs = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Pliage des lignes à 75 octets (RFC 5545, 3.1). */
function plier(ligne: string): string[] {
  const enc = new TextEncoder();
  const sortie: string[] = [];
  let cur = '';
  for (const ch of ligne) {
    const max = sortie.length === 0 ? 75 : 74; // la ligne de continuation commence par une espace
    if (enc.encode(cur + ch).length > max) { sortie.push(cur); cur = ch; } else cur += ch;
  }
  sortie.push(cur);
  return sortie.map((l, i) => (i === 0 ? l : ' ' + l));
}

export interface ParamsIcs { debutMs: number; dureeMin?: number; titre: string; description: string; maintenantMs?: number }

export function genererIcs({ debutMs, dureeMin = 60, titre, description, maintenantMs = Date.now() }: ParamsIcs): string {
  const lignes = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//lucashi-apps//fuseaux//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${debutMs}-${Math.floor(debutMs / 60000).toString(36)}@fuseaux`,
    `DTSTAMP:${utcIcs(maintenantMs)}`,
    `DTSTART:${utcIcs(debutMs)}`,
    `DTEND:${utcIcs(debutMs + dureeMin * 60000)}`,
    `SUMMARY:${echapperIcs(titre)}`,
    `DESCRIPTION:${echapperIcs(description)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lignes.flatMap(plier).join('\r\n') + '\r\n';
}
