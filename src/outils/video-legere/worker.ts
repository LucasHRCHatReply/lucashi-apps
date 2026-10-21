// Web Worker du chemin rapide : tout mediabunny / WebCodecs tourne ici, loin du fil principal de la page.
// Compilé par construire-repli.mjs vers public/outils-assets/video-legere/worker.js. Annulation : la page termine le worker.
import { convertirVideo, extraireSon, sonder, FichierIllisible } from './webcodecs';
import type { Plan } from './outil';
import type { Sonde } from './webcodecs';

export type Demande =
  | { type: 'sonder'; fichier: File }
  | { type: 'video'; fichier: File; plan: Plan; sonde: Sonde }
  | { type: 'son'; fichier: File };
export type Reponse =
  | { type: 'sonde'; sonde: Sonde }
  | { type: 'progres'; ratio: number; images: number }
  | { type: 'fini'; blob: Blob }
  | { type: 'erreur'; illisible: boolean; message: string };

const envoyer = (r: Reponse) => (self as unknown as Worker).postMessage(r);

self.onmessage = async (e: MessageEvent<Demande>) => {
  const d = e.data;
  try {
    if (d.type === 'sonder') envoyer({ type: 'sonde', sonde: await sonder(d.fichier) });
    else if (d.type === 'video') envoyer({ type: 'fini', blob: await convertirVideo(d.fichier, { plan: d.plan, sonde: d.sonde, onProgres: (ratio, images) => envoyer({ type: 'progres', ratio, images }) }).fin });
    else envoyer({ type: 'fini', blob: await extraireSon(d.fichier, (ratio) => envoyer({ type: 'progres', ratio, images: 0 })).fin });
  } catch (err) {
    envoyer({ type: 'erreur', illisible: err instanceof FichierIllisible, message: String((err as Error)?.message ?? err) });
  }
};
