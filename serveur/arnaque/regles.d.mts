export type Niveau = 'fort' | 'moyen' | 'faible' | 'ok' | 'info' | 'texte';
export interface Raison { code: string; niveau: Niveau; texte: string; lien?: string; marque?: string }
export interface VerdictInfo { cle: 'tres_probable' | 'douteux' | 'rien'; phrase: string; conseil: string; points: number }
export interface LienDecrit {
  saisi: string; hote: string; arobase?: string;
  chaine?: { url: string; statut: number; via?: string | null }[];
  finale?: { hote: string; url?: string } | null;
  age?: { jours: number; creeLe: string } | null;
  liste?: { source: string; exact: boolean } | null;
  erreur?: string; erreurNiveau?: Niveau | string;
}
export interface Conclusion { verdict: VerdictInfo; raisons: Raison[]; marques: string[] }
export interface LienTrouve { brut: string; url: string; hote: string; explicite: boolean; arobase: string }
export function extraireLiens(texte: string, max?: number): { liens: LienTrouve[]; adresses: string[] };
export function conclure(texte: string, liens: LienDecrit[]): Conclusion;
export function decouperDomaine(hote: string): { hote: string; suffixe: string; domaine: string; nom: string; sous: string[] };
export function imitations(hote: string): Raison[];
export function indicesTexte(texte: string): { code: string; poids: number; texte: string }[];
export function marquesCitees(texte: string): { id: string; nom: string }[];
export function marqueOfficielle(domaine: string): { id: string; nom: string } | null;
export function raisonsLien(lien: LienDecrit, opts?: { marques?: { id: string; nom: string }[] }): Raison[];
export function verdict(raisons: Raison[], indices?: { poids: number }[], opts?: { aDesLiens?: boolean; tousOfficiels?: boolean }): VerdictInfo;
export function squelette(s: string): string;
export function distance(a: string, b: string): number;
export function hoteUnicode(hote: string): string;
export function punycodeVersUnicode(s: string): string;
export function abreger(u: string): string;
export const VERDICTS: Record<string, { cle: string; phrase: string; conseil: string }>;
export const MARQUES: { id: string; nom: string; officiels: string[] }[];
export const RACCOURCISSEURS: Set<string>;
export function estHebergeurPublic(d: string): boolean;
