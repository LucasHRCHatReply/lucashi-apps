// Chemin rapide : lecture, redimensionnement et encodage H.264/AAC par WebCodecs, via mediabunny (démuxeur et muxeur MP4 maintenus).
import {
  ALL_FORMATS, BlobSource, BufferTarget, Conversion, ConversionCanceledError, Input, Mp4OutputFormat, Output,
  canEncodeAudio, canEncodeVideo,
} from 'mediabunny';
import type { Plan, Source } from './outil';

export interface Sonde extends Source {
  /** WebCodecs sait décoder la vidéo source et encoder H.264 + AAC dans ce navigateur. */
  rapide: boolean;
  /** Le fichier a une piste vidéo (faux pour un fichier audio seul). */
  aVideo: boolean;
}

export class FichierIllisible extends Error {}

export const ouvrir = (f: File) => new Input({ source: new BlobSource(f), formats: ALL_FORMATS });

/** Lit durée, définition, cadence et pistes ; dit si le chemin rapide est possible. Lève FichierIllisible si le conteneur est inconnu. */
export async function sonder(f: File): Promise<Sonde> {
  const input = ouvrir(f);
  try {
    if (!(await input.canRead())) throw new FichierIllisible();
    const duree = await input.computeDuration();
    const v = await input.getPrimaryVideoTrack();
    const a = await input.getPrimaryAudioTrack();
    if (!v && !a) throw new FichierIllisible();
    let largeur = 0, hauteur = 0, fps = 30, rapide = true;
    if (v) {
      largeur = await v.getDisplayWidth();
      hauteur = await v.getDisplayHeight();
      try { fps = (await v.computePacketStats(300)).averagePacketRate || 30; } catch { /* cadence par défaut */ }
      rapide = (await v.canDecode()) && (await canEncodeVideo('avc', { width: Math.min(largeur, 1920), height: Math.min(hauteur, 1080), bitrate: 2_000_000 }));
    }
    if (a) rapide = rapide && (await a.canDecode());
    rapide = rapide && (await canEncodeAudio('aac'));
    return { duree, largeur, hauteur, fps, octets: f.size, aAudio: !!a, aVideo: !!v, rapide };
  } catch (e) {
    if (e instanceof FichierIllisible) throw e;
    throw new FichierIllisible();
  } finally { input.dispose(); }
}

export interface Lancement {
  fin: Promise<Blob>;
  annuler: () => Promise<void>;
}

interface OptionsVideo { plan: Plan; sonde: Sonde; onProgres: (ratio: number, images: number) => void }

/** Encode la vidéo selon le plan (H.264 + AAC dans un MP4 « fast start »). Les images comptées sont celles réellement passées à l'encodeur. */
export function convertirVideo(f: File, o: OptionsVideo): Lancement {
  let conv: Conversion | null = null;
  let annule = false;
  const fin = (async () => {
    const input = ouvrir(f);
    const sortie = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    let images = 0;
    conv = await Conversion.init({
      input, output: sortie,
      video: {
        codec: 'avc', width: o.plan.largeur, height: o.plan.hauteur, fit: 'fill', bitrate: o.plan.debitVideo,
        ...(o.sonde.fps > o.plan.fps + 0.5 ? { frameRate: o.plan.fps } : {}),
        forceTranscode: true,
        process: (s) => { images++; return s; },
      },
      audio: o.sonde.aAudio ? { codec: 'aac', bitrate: o.plan.debitAudio, forceTranscode: true } : { discard: true },
    });
    if (annule) throw new ConversionCanceledError();
    if (!conv.isValid) throw new Error('conversion impossible : ' + conv.discardedTracks.map((d) => d.reason).join(', '));
    conv.onProgress = (p) => o.onProgres(Math.min(1, p), images);
    await conv.execute();
    input.dispose();
    const tampon = (sortie.target as BufferTarget).buffer;
    if (!tampon) throw new Error('sortie vide');
    return new Blob([tampon], { type: 'video/mp4' });
  })();
  return { fin, annuler: async () => { annule = true; await conv?.cancel(); } };
}

/** Extrait la piste audio en AAC dans un MP4 audio (.m4a). */
export function extraireSon(f: File, onProgres: (ratio: number) => void): Lancement {
  let conv: Conversion | null = null;
  let annule = false;
  const fin = (async () => {
    const input = ouvrir(f);
    const sortie = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    conv = await Conversion.init({ input, output: sortie, video: { discard: true }, audio: { codec: 'aac', bitrate: 128_000, forceTranscode: true } });
    if (annule) throw new ConversionCanceledError();
    if (!conv.isValid) throw new Error('aucune piste audio');
    conv.onProgress = (p) => onProgres(Math.min(1, p));
    await conv.execute();
    input.dispose();
    const tampon = (sortie.target as BufferTarget).buffer;
    if (!tampon) throw new Error('sortie vide');
    return new Blob([tampon], { type: 'audio/mp4' });
  })();
  return { fin, annuler: async () => { annule = true; await conv?.cancel(); } };
}

export { ConversionCanceledError };
