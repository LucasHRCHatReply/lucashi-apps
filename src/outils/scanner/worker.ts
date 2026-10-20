// Worker du scanner : détection des bords, redressement, fond blanchi, encodage JPEG. Rien ne sort du navigateur.
// Reçoit { id, bitmap, coins?, rendu, quarts, maxi } (coins normalisés 0..1 dans l'image) ; renvoie des messages
// { id, etape } pendant le travail (progression réelle) puis { id, ok, jpeg, largeur, hauteur, coins, fiable, note, format, ms }.
import { blanchir, detecterCoins, dimensionsSortie, pivoter, redresser, type Image, type Quad, type Rendu } from './outil';

export interface Demande { id: number; bitmap: ImageBitmap; coins?: Quad; rendu: Rendu; quarts: number; maxi: number; qualite: number }
export type Etape = 'lecture' | 'bords' | 'redressement' | 'fond' | 'encodage';
export interface Reponse {
  id: number; ok: boolean; erreur?: string; etape?: Etape;
  jpeg?: ArrayBuffer; largeur?: number; hauteur?: number; coins?: Quad; fiable?: boolean; note?: number; format?: 'A4' | 'mesure'; methode?: string; ms?: number;
}

const COTE_MAX = 3600; // une photo plus grande est réduite avant le travail (le PDF vise < 1 Mo par page)
const dire = (m: Reponse) => (self as unknown as Worker).postMessage(m);

async function traiter(d: Demande): Promise<Reponse> {
  const t0 = performance.now();
  dire({ id: d.id, ok: true, etape: 'lecture' });
  const { bitmap } = d;
  const e = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * e)), h = Math.max(1, Math.round(bitmap.height * e));
  const toile = new OffscreenCanvas(w, h);
  const ctx = toile.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const px = ctx.getImageData(0, 0, w, h);
  const img: Image = { data: px.data, width: w, height: h };

  let coins: Quad, fiable = true, note = 1, methode = 'manuel';
  if (d.coins) coins = d.coins.map((p) => ({ x: p.x * w, y: p.y * h })) as Quad;
  else {
    dire({ id: d.id, ok: true, etape: 'bords' });
    const det = detecterCoins(img);
    coins = det.coins; fiable = det.fiable; note = det.note; methode = det.methode;
  }
  dire({ id: d.id, ok: true, etape: 'redressement' });
  const dim = dimensionsSortie(coins, d.maxi, { w, h });
  const plat = redresser(img, coins, dim.largeur, dim.hauteur);
  dire({ id: d.id, ok: true, etape: 'fond' });
  const net = pivoter(blanchir(plat, d.rendu), d.quarts);
  dire({ id: d.id, ok: true, etape: 'encodage' });
  const sortie = new OffscreenCanvas(net.width, net.height);
  sortie.getContext('2d')!.putImageData(new ImageData(net.data as Uint8ClampedArray<ArrayBuffer>, net.width, net.height), 0, 0);
  const blob = await sortie.convertToBlob({ type: 'image/jpeg', quality: d.qualite });
  return {
    id: d.id, ok: true, jpeg: await blob.arrayBuffer(), largeur: net.width, hauteur: net.height,
    coins: coins.map((p) => ({ x: p.x / w, y: p.y / h })) as Quad, fiable, note, format: dim.format, methode, ms: Math.round(performance.now() - t0),
  };
}

self.onmessage = async (ev: MessageEvent<Demande>) => {
  try { const r = await traiter(ev.data); (self as unknown as Worker).postMessage(r, r.jpeg ? [r.jpeg] : []); }
  catch (err) { dire({ id: ev.data.id, ok: false, erreur: String((err as Error)?.message ?? err) }); }
};
