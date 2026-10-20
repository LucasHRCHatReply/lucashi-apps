// Logique de « Arnaque ou pas ? » côté page : le premier avis (liens, imitation de marque, indices du texte) vient du même fichier
// de règles que le serveur ; le serveur y ajoute la chaîne de redirections, l'âge du domaine et les listes publiques.
import { conclure, extraireLiens, type Conclusion, type LienDecrit, type Niveau, type VerdictInfo, type Raison } from '../../../serveur/arnaque/regles.mjs';

export type { Conclusion, Niveau, Raison, VerdictInfo };
export const MAX_TEXTE = 5000;

export interface LienServeur {
  saisi: string; hote: string; finale: string | null; domaine: string; officiel: string | null;
  chaine: { url: string; statut: number; via: string | null }[];
  age: { jours: number; creeLe: string } | null;
  liste: { source: string; exact: boolean } | null;
}
export interface ReponseServeur extends Conclusion {
  liens: LienServeur[];
  listes: { nom: string; nombre: number; le: string | null }[];
  duree_ms: number;
}
export interface PremierAvis extends Conclusion { nbLiens: number; hotes: string[] }

/** Premier avis immédiat, dans la page : aucun réseau. */
export function premierAvis(texte: string): PremierAvis {
  const { liens } = extraireLiens(texte);
  const res = conclure(texte, liens.map((l) => ({ saisi: l.brut, hote: l.hote, arobase: l.arobase })));
  return { ...res, nbLiens: liens.length, hotes: liens.map((l) => l.hote) };
}

export function adresseApi(env: string | undefined): string {
  return env && env.trim() ? env.trim() : '/api/arnaque';
}

export class ErreurAnalyse extends Error {
  constructor(message: string, readonly code: 'reseau' | 'limite' | 'occupe' | 'texte' | 'serveur') { super(message); }
}
export function messageHttp(statut: number, serveur?: string): ErreurAnalyse {
  if (statut === 429) return new ErreurAnalyse('Trop de demandes en peu de temps : patientez une minute, puis relancez l\'analyse.', 'limite');
  if (statut === 503) return new ErreurAnalyse('Le serveur est occupé : relancez l\'analyse dans un instant.', 'occupe');
  if (statut === 413 || statut === 400) return new ErreurAnalyse(serveur || `Le texte est trop long : ${MAX_TEXTE} caractères au plus.`, 'texte');
  return new ErreurAnalyse('Le serveur n\'a pas pu terminer l\'analyse : relancez-la.', 'serveur');
}

/** Interroge le serveur ; lève une ErreurAnalyse avec un message qui dit quoi faire. */
export async function interroger(texte: string, url: string, signal?: AbortSignal, chercher: typeof fetch = fetch): Promise<ReponseServeur> {
  let rep: Response;
  try {
    rep = await chercher(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texte }), signal });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ErreurAnalyse('Le serveur ne répond pas : vérifiez votre connexion, puis relancez l\'analyse.', 'reseau');
  }
  if (!rep.ok) {
    let msg: string | undefined;
    try { msg = (await rep.json())?.erreur; } catch { /* corps absent */ }
    throw messageHttp(rep.status, msg);
  }
  return (await rep.json()) as ReponseServeur;
}

export const LIBELLE_NIVEAU: Record<string, string> = { fort: 'Grave', moyen: 'Suspect', faible: 'Léger', ok: 'Rassurant', info: 'Info', texte: 'Dans le texte' };

/** Chemin d'un lien : les noms de site traversés, de ce qu'on lit à ce qu'on atteint (sans répéter deux fois le même). */
export function cheminHotes(l: Pick<LienServeur, 'chaine' | 'hote'>): { hote: string; statut: number | null }[] {
  const res: { hote: string; statut: number | null }[] = [];
  for (const c of l.chaine) {
    let h: string;
    try { h = new URL(c.url).hostname; } catch { continue; }
    if (res.length && res[res.length - 1].hote === h) res[res.length - 1].statut = c.statut;
    else res.push({ hote: h, statut: c.statut });
  }
  return res.length ? res : [{ hote: l.hote, statut: null }];
}

export function dateFr(iso: string | null): string {
  if (!iso) return 'n/a';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'n/a' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function secondes(ms: number): string {
  return `${(ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s`;
}
