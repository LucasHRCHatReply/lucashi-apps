// Web Worker : réduit l'image si besoin, puis encode (qualité fixe ou recherche du poids cible). Rien ne sort de la page.
import { encoder } from './encodeurs';
import { appliquerEchelle, dimensionsCible, viserPoids, type Format } from './outil';

export interface Demande {
  id: number;
  bitmap: ImageBitmap;
  format: Format;
  mode: 'qualite' | 'poids';
  qualite: number;
  cibleOctets: number;
  cote: number | null;
}
export interface Reponse {
  id: number;
  ok: boolean;
  erreur?: string;
  octets?: ArrayBuffer;
  largeur?: number;
  hauteur?: number;
  qualite?: number;
  atteint?: boolean;
}

function pixels(bitmap: ImageBitmap, l: number, h: number, format: Format) {
  const c = new OffscreenCanvas(l, h);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  if (format === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, l, h); } // pas de transparence en JPG : fond blanc
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, l, h);
  return ctx.getImageData(0, 0, l, h);
}

self.onmessage = async (e: MessageEvent<Demande>) => {
  const d = e.data;
  try {
    const base = dimensionsCible(d.bitmap.width, d.bitmap.height, d.cote);
    let sortie: Uint8Array, dim = base, q = d.qualite, atteint = true;
    if (d.mode === 'qualite') {
      const img = pixels(d.bitmap, base.largeur, base.hauteur, d.format);
      sortie = await encoder(d.format, img, d.qualite);
    } else {
      const memo = new Map<string, Uint8Array>();
      let dernier = '';
      const r = await viserPoids(async (qual, ech) => {
        const dm = appliquerEchelle(base.largeur, base.hauteur, ech);
        const o = await encoder(d.format, pixels(d.bitmap, dm.largeur, dm.hauteur, d.format), qual);
        if (o.byteLength <= d.cibleOctets || !memo.size) memo.set(`${qual}|${ech}`, o); // on ne garde que ce qui passe (mémoire)
        dernier = `${qual}|${ech}`;
        if (!memo.has(dernier)) memo.set(dernier, o);
        return o.byteLength;
      }, d.cibleOctets, { sansQualite: d.format === 'png', plusGrandCote: Math.max(base.largeur, base.hauteur) });
      sortie = memo.get(`${r.essai.qualite}|${r.essai.echelle}`)!;
      dim = appliquerEchelle(base.largeur, base.hauteur, r.essai.echelle);
      q = r.essai.qualite; atteint = r.atteint;
    }
    d.bitmap.close();
    const buf = sortie.buffer.slice(sortie.byteOffset, sortie.byteOffset + sortie.byteLength) as ArrayBuffer;
    (self as unknown as Worker).postMessage({ id: d.id, ok: true, octets: buf, largeur: dim.largeur, hauteur: dim.hauteur, qualite: q, atteint } satisfies Reponse, [buf]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: d.id, ok: false, erreur: String((err as Error)?.message ?? err) } satisfies Reponse);
  }
};
