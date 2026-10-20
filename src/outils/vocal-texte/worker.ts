// Web Worker de « Vocal en texte » : décode l'Ogg Opus, charge Whisper (base, quantifié) et transcrit par fenêtres de 30 s.
// Construit en un seul fichier par construire-worker.mjs → public/outils-assets/vocal-texte/worker.js (le résultat est commité).
// Rien ne sort de la page : le modèle et le moteur viennent de /lourds/vocal-texte/ (lourds.sh), jamais de huggingface.co.
import { env, pipeline, Tensor } from '@huggingface/transformers';
import { OggOpusDecoder } from 'ogg-opus-decoder';
import { ECHANTILLONNAGE, enMono, fenetres, reechantillonner, type Segment } from './outil';

export type Demande =
  | { type: 'ogg'; octets: ArrayBuffer }
  | { type: 'transcrire'; pcm: Float32Array };

export type Reponse =
  | { type: 'pcm'; pcm: Float32Array }
  | { type: 'charge'; charge: number; fichiers: number }
  | { type: 'pret'; depuisCache: boolean; ms: number }
  | { type: 'fenetre'; fait: number; total: number }
  | { type: 'fini'; segments: Segment[]; langue: string; msTranscription: number }
  | { type: 'erreur'; code: 'ogg' | 'modele' | 'transcription'; detail: string };

const RACINE = '/lourds/vocal-texte/';
env.allowRemoteModels = false;        // jamais huggingface.co
env.allowLocalModels = true;
env.localModelPath = `${RACINE}models/`;
env.useBrowserCache = true;           // Cache API : le modèle reste dans le navigateur après le premier usage
// @ts-expect-error — wasmPaths accepte une chaîne (dossier) ; le typage de la dépendance ne l'expose pas partout
env.backends.onnx.wasm.wasmPaths = `${RACINE}ort/`;

const envoyer = (r: Reponse, transfert: Transferable[] = []) => (self as unknown as Worker).postMessage(r, transfert);

let transcripteur: any = null;

/** Moteur onnxruntime (WebAssembly, ~22 Mo) : lu depuis le cache du navigateur s'il y est, sinon téléchargé avec sa progression puis rangé dans le cache. */
async function chargerMoteur(rapporter: (octets: number) => void): Promise<boolean> {
  const url = `${RACINE}ort/ort-wasm-simd-threaded.jsep.wasm`;
  let cache: Cache | null = null;
  try { cache = await caches.open('vocal-texte-moteur'); } catch { /* pas de Cache API */ }
  const connu = await cache?.match(url);
  const reponse = connu ?? (await fetch(url));
  if (!reponse.ok) throw new Error(`moteur : HTTP ${reponse.status}`);
  const copie = connu ? null : reponse.clone();
  const lecteur = reponse.body!.getReader();
  const morceaux: Uint8Array[] = [];
  let recu = 0;
  for (;;) { const { done, value } = await lecteur.read(); if (done) break; morceaux.push(value); recu += value.length; if (!connu) rapporter(recu); }
  const tout = new Uint8Array(recu); let o = 0; for (const m of morceaux) { tout.set(m, o); o += m.length; }
  // @ts-expect-error — wasmBinary est accepté par onnxruntime-web (le moteur n'est alors pas redemandé par le réseau)
  env.backends.onnx.wasm.wasmBinary = tout.buffer;
  if (copie && cache) await cache.put(url, copie).catch(() => {});
  return !!connu;
}

async function charger() {
  if (transcripteur) return;
  const debut = performance.now();
  const parFichier = new Map<string, number>();
  let depuisCache = true;
  let octetsMoteur = 0;
  const somme = () => { let t = octetsMoteur; parFichier.forEach((v) => (t += v)); return t; };
  const moteurCache = await chargerMoteur((n) => { octetsMoteur = n; depuisCache = false; envoyer({ type: 'charge', charge: somme(), fichiers: parFichier.size }); });
  if (!moteurCache) depuisCache = false;
  transcripteur = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', {
    // WebAssembly, poids quantifiés en 8 bits. WebGPU essayé et écarté (voir la note d'essai) : en fp16 le texte sort corrompu, en mixte il est plus lent.
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p: any) => {
      if (p.status === 'progress' && typeof p.loaded === 'number') {
        depuisCache = false;
        parFichier.set(p.file, p.loaded);
        envoyer({ type: 'charge', charge: somme(), fichiers: parFichier.size });
      }
    },
  });
  envoyer({ type: 'pret', depuisCache, ms: Math.round(performance.now() - debut) });
}

/** Langue parlée : un seul pas du décodeur sur la première fenêtre, on lit le jeton de langue le plus probable. */
async function detecterLangue(sub: Float32Array): Promise<string> {
  const { model, processor, tokenizer } = transcripteur;
  const feat = await processor(sub);
  const lang_to_id: Record<string, number> = model.generation_config?.lang_to_id ?? {};
  const sortie = await model.forward({ input_features: feat.input_features, decoder_input_ids: new Tensor('int64', [BigInt(tokenizer.model.convert_tokens_to_ids(['<|startoftranscript|>'])[0])], [1, 1]) });
  const logits = sortie.logits.data as Float32Array;
  let meilleur = 'en', score = -Infinity;
  for (const [jeton, id] of Object.entries(lang_to_id)) {
    if (logits[id] > score) { score = logits[id]; meilleur = jeton.replace(/[<|>]/g, ''); }
  }
  return meilleur;
}

async function transcrire(pcm: Float32Array) {
  const { model, processor, tokenizer } = transcripteur;
  const debut = performance.now();
  const fen = fenetres(pcm.length);
  const hop = processor.feature_extractor.config.hop_length;
  const precision = processor.feature_extractor.config.chunk_length / model.config.max_source_positions;
  const langue = await detecterLangue(pcm.subarray(0, Math.min(pcm.length, 30 * ECHANTILLONNAGE)));
  const recouvre = 5;
  const morceaux: any[] = [];
  for (let i = 0; i < fen.length; i++) {
    const f = fen[i];
    const sub = pcm.subarray(f.debut, f.fin);
    const feat = await processor(sub);
    const data = await model.generate({ inputs: feat.input_features, return_timestamps: true, language: langue, task: 'transcribe', num_frames: Math.floor(sub.length / hop) });
    morceaux.push({ stride: [sub.length / ECHANTILLONNAGE, i === 0 ? 0 : recouvre, f.dernier ? 0 : recouvre], tokens: data[0].tolist(), input_features: feat.input_features, is_last: f.dernier });
    envoyer({ type: 'fenetre', fait: i + 1, total: fen.length });
  }
  const [, optionnel] = tokenizer._decode_asr(morceaux, { time_precision: precision, return_timestamps: true, force_full_sequences: false });
  const segments: Segment[] = (optionnel?.chunks ?? []).map((c: any) => ({ debut: c.timestamp[0] ?? 0, fin: c.timestamp[1] ?? c.timestamp[0] ?? 0, texte: c.text }));
  envoyer({ type: 'fini', segments, langue, msTranscription: Math.round(performance.now() - debut) });
}

self.onmessage = async (ev: MessageEvent<Demande>) => {
  const d = ev.data;
  if (d.type === 'ogg') {
    try {
      const dec = new OggOpusDecoder();
      await dec.ready;
      const r = await dec.decodeFile(new Uint8Array(d.octets));
      dec.free();
      const pcm = reechantillonner(enMono(r.channelData), r.sampleRate);
      envoyer({ type: 'pcm', pcm }, [pcm.buffer]);
    } catch (e) { envoyer({ type: 'erreur', code: 'ogg', detail: String((e as Error)?.message ?? e) }); }
    return;
  }
  try { await charger(); }
  catch (e) { envoyer({ type: 'erreur', code: 'modele', detail: String((e as Error)?.message ?? e) }); return; }
  try { await transcrire(d.pcm); }
  catch (e) { envoyer({ type: 'erreur', code: 'transcription', detail: String((e as Error)?.message ?? e) }); }
};
