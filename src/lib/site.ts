// Adresse publique et indexation, lues à la construction (variables d'environnement).
export const SITE_URL = (process.env.SITE_URL ?? 'https://app.lucashirschauer.fr').replace(/\/$/, '');
export const INDEXABLE = process.env.INDEXABLE === 'true';
export const AUTEUR = 'Lucas Hirschauer';
export const url = (chemin: string) => SITE_URL + chemin;
