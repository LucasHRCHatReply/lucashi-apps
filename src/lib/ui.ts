// Aides côté navigateur pour les composants communs. Aucune donnée ne quitte la page.
import type { Lang } from './textes';

export interface FichierSortie {
  nom: string;
  donnees: Blob | Uint8Array | string;
  type?: string;
}

/** Vrai si le fichier correspond à un attribut `accept` (types MIME, jokers « image/* », extensions « .heic »). */
export function fichierAccepte(f: { name: string; type: string }, accept: string): boolean {
  const regles = accept.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (!regles.length) return true;
  const nom = f.name.toLowerCase();
  const type = (f.type || '').toLowerCase();
  return regles.some((r) => {
    if (r.startsWith('.')) return nom.endsWith(r);
    if (r.endsWith('/*')) return type.startsWith(r.slice(0, -1));
    return type === r;
  });
}

/** Rend les noms uniques dans un zip : « a.jpg », « a (2).jpg »… */
export function nomsUniques(noms: string[]): string[] {
  const vus = new Map<string, number>();
  return noms.map((n) => {
    const k = n.toLowerCase();
    const c = (vus.get(k) ?? 0) + 1;
    vus.set(k, c);
    if (c === 1) return n;
    const i = n.lastIndexOf('.');
    return i > 0 ? `${n.slice(0, i)} (${c})${n.slice(i)}` : `${n} (${c})`;
  });
}

async function enOctets(d: FichierSortie['donnees']): Promise<Uint8Array> {
  if (d instanceof Uint8Array) return d;
  if (typeof d === 'string') return new TextEncoder().encode(d);
  return new Uint8Array(await d.arrayBuffer());
}

/** Fabrique un zip (fflate, chargé au premier usage). */
export async function fabriquerZip(fichiers: FichierSortie[]): Promise<Uint8Array> {
  const { zipSync } = await import('fflate');
  const noms = nomsUniques(fichiers.map((f) => f.nom));
  const entrees: Record<string, Uint8Array> = {};
  for (let i = 0; i < fichiers.length; i++) entrees[noms[i]] = await enOctets(fichiers[i].donnees);
  return zipSync(entrees, { level: 0 }); // images et PDF sont déjà compressés
}

const blobDe = (f: FichierSortie): Blob =>
  f.donnees instanceof Blob ? f.donnees : new Blob([f.donnees as BlobPart], { type: f.type ?? 'application/octet-stream' });

const trouve = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`composant introuvable : #${id}`);
  return el;
};

/** Affiche un texte dans un composant Resultat (le bloc apparaît à ce moment-là). */
export function afficherResultat(id: string, texte: string): void {
  const el = trouve(id);
  const sortie = el.querySelector<HTMLElement>('[data-sortie]');
  if (sortie) sortie.textContent = texte;
  el.hidden = false;
}
export function masquerResultat(id: string): void {
  const el = trouve(id);
  el.hidden = true;
  const sortie = el.querySelector<HTMLElement>('[data-sortie]');
  if (sortie) sortie.textContent = '';
}

const liensCrees = new WeakMap<HTMLElement, string[]>();
function libererLiens(el: HTMLElement) {
  (liensCrees.get(el) ?? []).forEach((u) => URL.revokeObjectURL(u));
  liensCrees.set(el, []);
}

/**
 * Propose le téléchargement dans un composant Telecharger : un seul fichier = un bouton ;
 * plusieurs = un bouton par fichier et « Tout télécharger (.zip) ». Le bloc apparaît à ce moment-là.
 */
export async function proposerTelechargement(id: string, fichiers: FichierSortie[], options: { nomZip?: string } = {}): Promise<void> {
  const el = trouve(id);
  const lang = (el.dataset.lang as Lang) === 'en' ? 'en' : 'fr';
  const libelles = lang === 'en' ? { un: 'Download', zip: 'Download all (.zip)' } : { un: 'Télécharger', zip: 'Tout télécharger (.zip)' };
  const liste = el.querySelector<HTMLElement>('[data-liste]')!;
  libererLiens(el);
  liste.replaceChildren();
  const urls: string[] = [];
  const lien = (href: string, nom: string, texte: string, principal: boolean) => {
    const a = document.createElement('a');
    a.className = principal ? 'o-btn o-btn--principal' : 'o-btn o-btn--secondaire';
    a.href = href;
    a.download = nom;
    a.textContent = texte;
    return a;
  };
  if (fichiers.length === 1) {
    const u = URL.createObjectURL(blobDe(fichiers[0]));
    urls.push(u);
    liste.append(lien(u, fichiers[0].nom, `${libelles.un} ${fichiers[0].nom}`, true));
  } else if (fichiers.length > 1) {
    const zip = await fabriquerZip(fichiers);
    const uz = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
    urls.push(uz);
    liste.append(lien(uz, options.nomZip ?? 'fichiers.zip', libelles.zip, true));
    for (const f of fichiers) {
      const u = URL.createObjectURL(blobDe(f));
      urls.push(u);
      liste.append(lien(u, f.nom, f.nom, false));
    }
  }
  liensCrees.set(el, urls);
  el.hidden = fichiers.length === 0;
}
export function masquerTelechargement(id: string): void {
  const el = trouve(id);
  libererLiens(el);
  el.querySelector('[data-liste]')?.replaceChildren();
  el.hidden = true;
}

/** Lit un fichier texte déposé. */
export const lireTexte = (f: File): Promise<string> => f.text();
