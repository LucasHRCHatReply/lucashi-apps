// Worker de l'outil HEIC -> JPG / PNG. Décode avec libheif (wasm, servi par ce site), puis encode via OffscreenCanvas.
// Rien ne sort du navigateur. Messages reçus : { id, octets, format, qualite, exif } ; réponse : { id, ok, ... }.
/* global libheif, importScripts */
importScripts('libheif.js');

let pret = null;
function charger() {
  if (!pret) {
    pret = fetch('libheif.wasm')
      .then((r) => r.arrayBuffer())
      .then((wasmBinary) => libheif({ wasmBinary }));
  }
  return pret;
}

const afficher = (image, donnees) =>
  new Promise((ok, ko) => image.display(donnees, (r) => (r ? ok(r) : ko(new Error('affichage impossible')))));

async function convertir({ octets, format, qualite }) {
  const lib = await charger();
  const images = new lib.HeifDecoder().decode(new Uint8Array(octets));
  if (!images || !images.length) throw new Error('aucune image');
  const image = images[0]; // image principale (les photos Live et rafales sont des fichiers à part ou des images secondaires)
  const largeur = image.get_width();
  const hauteur = image.get_height();
  const rendu = await afficher(image, { data: new Uint8ClampedArray(largeur * hauteur * 4), width: largeur, height: hauteur });
  const pixels = new ImageData(rendu.data, largeur, hauteur);

  const toile = new OffscreenCanvas(largeur, hauteur);
  const ctx = toile.getContext('2d');
  if (format === 'jpg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, largeur, hauteur); } // le JPG n'a pas de transparence
  const plein = new OffscreenCanvas(largeur, hauteur);
  plein.getContext('2d').putImageData(pixels, 0, 0);
  ctx.drawImage(plein, 0, 0);
  const blob = await toile.convertToBlob(format === 'jpg' ? { type: 'image/jpeg', quality: qualite / 100 } : { type: 'image/png' });

  const cote = 160;
  const echelle = Math.min(1, cote / Math.max(largeur, hauteur));
  const miniature = new OffscreenCanvas(Math.max(1, Math.round(largeur * echelle)), Math.max(1, Math.round(hauteur * echelle)));
  miniature.getContext('2d').drawImage(plein, 0, 0, miniature.width, miniature.height);
  const vignette = await miniature.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
  return { blob, vignette, largeur, hauteur };
}

self.onmessage = async (e) => {
  const { id } = e.data;
  try {
    const r = await convertir(e.data);
    self.postMessage({ id, ok: true, ...r });
  } catch (err) {
    self.postMessage({ id, ok: false, erreur: String((err && err.message) || err) });
  }
};
