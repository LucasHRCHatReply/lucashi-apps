// Adresse publique et indexation, lues à la construction (variables d'environnement).
export const SITE_URL = (process.env.SITE_URL ?? 'https://apps.srv875929.hstgr.cloud').replace(/\/$/, '');
export const INDEXABLE = process.env.INDEXABLE === 'true';
export const AUTEUR = 'Lucas Hirschauer';
export const url = (chemin: string) => SITE_URL + chemin;
