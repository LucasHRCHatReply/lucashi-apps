// Encodeurs WebAssembly (jSquash : mozjpeg, oxipng, libwebp). Importés statiquement : le Worker se construit en un seul fichier
// (construire-worker.mjs). Chaque .wasm n'est téléchargé et instancié qu'au premier encodage de son format ; ils sont servis par le site.
import encoderJpeg from '@jsquash/jpeg/encode';
import encoderWebp from '@jsquash/webp/encode';
import encoderPng from '@jsquash/png/encode';
// oxipng : on appelle le module mono-fil directement. La version multi-fil de jSquash exige l'isolation cross-origin (SharedArrayBuffer), absente d'un site statique.
import initOxipng, { optimise as optimiserPng, type InitInput } from '@jsquash/oxipng/codec/pkg/squoosh_oxipng.js';
import type { Format } from './outil';

export interface Pixels { data: Uint8ClampedArray; width: number; height: number }

let oxipngPret: Promise<unknown> | null = null;
/** Prépare oxipng (un module déjà compilé peut être fourni : tests Node). */
export const preparerOxipng = (module?: InitInput) => (oxipngPret ??= initOxipng(module));

export async function encoder(format: Format, img: Pixels, qualite: number): Promise<Uint8Array> {
  const image = { data: img.data, width: img.width, height: img.height, colorSpace: 'srgb' } as ImageData;
  if (format === 'jpeg') return new Uint8Array(await encoderJpeg(image, { quality: qualite }));
  if (format === 'webp') return new Uint8Array(await encoderWebp(image, { quality: qualite }));
  const brut = new Uint8Array(await encoderPng(image));
  await preparerOxipng();
  return optimiserPng(brut, 3, false, true);
}
