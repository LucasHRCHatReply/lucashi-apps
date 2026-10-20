// Construit le Web Worker de « Vocal en texte » en un seul fichier ES (transformers.js + décodeur Opus embarqués).
// Usage : node src/outils/vocal-texte/construire-worker.mjs   (à relancer si worker.ts, outil.ts ou les dépendances changent ; le résultat est commité).
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const sortie = join(racine, 'public', 'outils-assets', 'vocal-texte');
mkdirSync(sortie, { recursive: true });
await build({
  entryPoints: [join(racine, 'src/outils/vocal-texte/worker.ts')],
  outfile: join(sortie, 'worker.js'),
  bundle: true, format: 'esm', target: 'es2022', minify: true, legalComments: 'none',
  alias: { '@wasm-audio-decoders/opus-ml': join(racine, 'src/outils/vocal-texte/opus-ml-vide.js') },
  platform: 'browser', conditions: ['browser', 'import'],
  external: ['onnxruntime-node', 'sharp', 'fs', 'path', 'url', 'os', 'node:*'],
});
console.log('worker écrit dans public/outils-assets/vocal-texte/worker.js');
