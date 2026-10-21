// Côté page : parle au Worker du chemin rapide. Annuler = terminer le worker (libère aussi les encodeurs matériels).
import type { Plan } from './outil';
import type { Sonde } from './webcodecs';
import type { Demande, Reponse } from './worker';

export class Annule extends Error {}
export class Illisible extends Error {}
export class Echec extends Error {}

export interface Lancement { fin: Promise<Blob>; annuler: () => Promise<void> }

const ADRESSE = '/outils-assets/video-legere/worker.js';

function lancer<T>(d: Demande, quand: (r: Reponse) => T | undefined, onProgres?: (ratio: number, images: number) => void): { fin: Promise<T>; annuler: () => Promise<void> } {
  const w = new Worker(ADRESSE, { type: 'module' });
  let rejeter: (e: Error) => void = () => {};
  const fin = new Promise<T>((ok, ko) => {
    rejeter = ko;
    w.onmessage = (m: MessageEvent<Reponse>) => {
      const r = m.data;
      if (r.type === 'progres') { onProgres?.(r.ratio, r.images); return; }
      if (r.type === 'erreur') { w.terminate(); ko(r.illisible ? new Illisible() : new Echec(r.message)); return; }
      const v = quand(r);
      if (v !== undefined) { w.terminate(); ok(v); }
    };
    w.onerror = (ev) => { w.terminate(); ko(new Echec(ev.message || 'worker')); };
    w.postMessage(d);
  });
  return { fin, annuler: async () => { w.terminate(); rejeter(new Annule()); } };
}

export const sonder = (fichier: File): Promise<Sonde> => lancer<Sonde>({ type: 'sonder', fichier }, (r) => (r.type === 'sonde' ? r.sonde : undefined)).fin;

export const convertirVideo = (fichier: File, o: { plan: Plan; sonde: Sonde; onProgres: (ratio: number, images: number) => void }): Lancement =>
  lancer<Blob>({ type: 'video', fichier, plan: o.plan, sonde: o.sonde }, (r) => (r.type === 'fini' ? r.blob : undefined), o.onProgres);

export const extraireSon = (fichier: File, onProgres: (ratio: number) => void): Lancement =>
  lancer<Blob>({ type: 'son', fichier }, (r) => (r.type === 'fini' ? r.blob : undefined), (ratio) => onProgres(ratio));
