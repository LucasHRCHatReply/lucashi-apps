// Construit le Web Worker du scanner en un seul fichier ES (aucun wasm : tout est en TypeScript).
// Usage : node src/outils/scanner/construire-worker.mjs   (à relancer si worker.ts ou outil.ts changent ; le résultat est commité).
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const sortie = join(racine, 'public', 'outils-assets', 'scanner');
mkdirSync(sortie, { recursive: true });
await build({
  entryPoints: [join(racine, 'src/outils/scanner/worker.ts')],
  outfile: join(sortie, 'worker.js'),
  bundle: true, format: 'iife', target: 'es2022', minify: true, legalComments: 'none',
  // pdf-lib n'est pas utilisé par le worker : le PDF se fabrique sur la page, au dernier moment
  external: ['pdf-lib'],
});
console.log('worker écrit dans public/outils-assets/scanner/');
