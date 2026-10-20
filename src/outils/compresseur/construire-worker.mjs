// Construit le Web Worker du compresseur en un seul fichier ES et copie les .wasm à côté (le code des encodeurs les cherche à côté de lui).
// Usage : node src/outils/compresseur/construire-worker.mjs   (à relancer si worker.ts, encodeurs.ts ou @jsquash/* changent ; le résultat est commité).
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const sortie = join(racine, 'public', 'outils-assets', 'compresseur');
mkdirSync(sortie, { recursive: true });
await build({
  entryPoints: [join(racine, 'src/outils/compresseur/worker.ts')],
  outfile: join(sortie, 'worker.js'),
  bundle: true, format: 'esm', target: 'es2022', minify: true, legalComments: 'none',
});
const js = join(racine, 'node_modules/@jsquash');
for (const f of ['jpeg/codec/enc/mozjpeg_enc.wasm', 'webp/codec/enc/webp_enc.wasm', 'webp/codec/enc/webp_enc_simd.wasm', 'png/codec/pkg/squoosh_png_bg.wasm', 'oxipng/codec/pkg/squoosh_oxipng_bg.wasm']) {
  copyFileSync(join(js, f), join(sortie, f.split('/').pop()));
}
console.log('worker et wasm écrits dans public/outils-assets/compresseur/');
