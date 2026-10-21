// Repli ffmpeg.wasm (monothread) : chargé seulement quand WebCodecs ne peut pas lire ou écrire la vidéo.
// Ce fichier est compilé en un seul module par construire-repli.mjs vers public/outils-assets/video-legere/repli.js.
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { analyserSondeFfmpeg, type Source } from './sonde-ffmpeg';

export interface OptionsRepli {
  coreURL: string;
  wasmURL: string;
  workerURL: string;
  fichier: File;
  /** Avancement : ratio 0..1 et nombre d'images déjà encodées (lu dans le journal d'ffmpeg). */
  onProgres: (ratio: number, images: number) => void;
  signal?: AbortSignal;
}

export interface DemandeVideo { largeur: number; hauteur: number; fps: number; debitVideo: number; debitAudio: number; aAudio: boolean; duree: number }

let instance: FFmpeg | null = null;
let charge = false;

async function preparer(o: OptionsRepli): Promise<FFmpeg> {
  if (!instance) instance = new FFmpeg();
  if (!charge) {
    await instance.load({ coreURL: o.coreURL, wasmURL: o.wasmURL, classWorkerURL: o.workerURL });
    charge = true;
  }
  return instance;
}

function oublier() { try { instance?.terminate(); } catch { /* déjà arrêté */ } instance = null; charge = false; }

async function avecFichier<T>(ff: FFmpeg, f: File, travail: (chemin: string) => Promise<T>): Promise<T> {
  // WORKERFS lit le fichier à la demande : pas de copie complète en mémoire.
  try { await ff.createDir('/in'); } catch { /* déjà là */ }
  await ff.mount('WORKERFS' as never, { files: [f] }, '/in');
  try { return await travail(`/in/${f.name}`); } finally { try { await ff.unmount('/in'); } catch { /* ignoré */ } }
}

/** Lit durée, définition, cadence et présence du son quand le démuxeur WebCodecs n'a pas su. */
export async function sonder(o: OptionsRepli): Promise<Source> {
  const ff = await preparer(o);
  const lignes: string[] = [];
  const ecoute = ({ message }: { message: string }) => lignes.push(message);
  ff.on('log', ecoute);
  try {
    await avecFichier(ff, o.fichier, (chemin) => ff.exec(['-hide_banner', '-i', chemin, '-f', 'null', '-t', '0.01', '-']));
  } finally { ff.off('log', ecoute); }
  const s = analyserSondeFfmpeg(lignes.join('\n'));
  if (!s) throw new Error('illisible');
  return { ...s, octets: o.fichier.size };
}

async function lancer(o: OptionsRepli, args: (chemin: string) => string[], sortie: string, dureeTotale: number, imagesTotales: number): Promise<Uint8Array> {
  const ff = await preparer(o);
  const surLog = ({ message }: { message: string }) => {
    const m = /frame=\s*(\d+)/.exec(message);
    if (m) o.onProgres(Math.min(1, Number(m[1]) / Math.max(1, imagesTotales)), Number(m[1]));
  };
  const surProgres = ({ progress }: { progress: number }) => {
    if (progress > 0 && progress <= 1) o.onProgres(progress, Math.round(progress * imagesTotales));
  };
  ff.on('log', surLog); ff.on('progress', surProgres);
  const annuler = () => oublier();
  o.signal?.addEventListener('abort', annuler);
  try {
    const code = await avecFichier(ff, o.fichier, (chemin) => ff.exec(args(chemin)));
    if (o.signal?.aborted) throw new DOMException('annulé', 'AbortError');
    if (code !== 0) throw new Error('ffmpeg a échoué');
    const d = await ff.readFile(sortie);
    const copie = typeof d === 'string' ? new TextEncoder().encode(d) : new Uint8Array(d);
    await ff.deleteFile(sortie);
    void dureeTotale;
    return copie;
  } catch (e) {
    if (o.signal?.aborted) throw new DOMException('annulé', 'AbortError');
    throw e;
  } finally {
    o.signal?.removeEventListener('abort', annuler);
    try { ff.off('log', surLog); ff.off('progress', surProgres); } catch { /* instance terminée */ }
  }
}

export function convertirVideo(o: OptionsRepli, d: DemandeVideo): Promise<Uint8Array> {
  const k = Math.round(d.debitVideo / 1000);
  return lancer(o, (chemin) => [
    '-hide_banner', '-i', chemin,
    '-vf', `scale=${d.largeur}:${d.hauteur},format=yuv420p`, '-r', String(d.fps),
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', `${k}k`, '-maxrate', `${Math.round(k * 1.25)}k`, '-bufsize', `${k * 2}k`,
    ...(d.aAudio ? ['-c:a', 'aac', '-b:a', `${Math.round(d.debitAudio / 1000)}k`] : ['-an']),
    '-movflags', '+faststart', '-y', 'sortie.mp4',
  ], 'sortie.mp4', d.duree, Math.round(d.duree * d.fps));
}

export function extraireSon(o: OptionsRepli, duree: number): Promise<Uint8Array> {
  return lancer(o, (chemin) => ['-hide_banner', '-i', chemin, '-vn', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', 'sortie.m4a'], 'sortie.m4a', duree, Math.round(duree * 30));
}

export function arreter() { oublier(); }
