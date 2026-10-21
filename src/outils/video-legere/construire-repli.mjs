// Compile le repli ffmpeg.wasm en fichiers autonomes (worker WebCodecs, repli ffmpeg et son worker) dans public/outils-assets/video-legere/.
// Usage : node src/outils/video-legere/construire-repli.mjs   (à relancer si repli-ffmpeg.ts ou @ffmpeg/ffmpeg changent ; le résultat est commité).
// Le cœur wasm (~32 Mo) n'est PAS ici : voir lourds.sh, servi sous /lourds/video-legere/.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const sortie = join(racine, 'public', 'outils-assets', 'video-legere');
mkdirSync(sortie, { recursive: true });
const commun = { bundle: true, format: 'esm', target: 'es2022', minify: true, legalComments: 'none' };
await build({ ...commun, entryPoints: [join(racine, 'src/outils/video-legere/repli-ffmpeg.ts')], outfile: join(sortie, 'repli.js') });
await build({ ...commun, entryPoints: [join(racine, 'src/outils/video-legere/worker.ts')], outfile: join(sortie, 'worker.js') });
await build({ ...commun, entryPoints: [join(racine, 'node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js')], outfile: join(sortie, 'ffmpeg-worker.js') });
// Le JS du cœur (112 Ko) va avec l'application ; seul le .wasm est « lourd ».
copyFileSync(join(racine, 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js'), join(sortie, 'ffmpeg-core.js'));
console.log('repli ffmpeg écrit dans public/outils-assets/video-legere/');
