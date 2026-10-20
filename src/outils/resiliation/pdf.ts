// Fabrique le PDF de la lettre avec pdf-lib (chargé au premier usage). Police Helvetica standard : son jeu de caractères
// WinAnsi couvre les accents français, œ, les guillemets typographiques et l'euro — aucune police à embarquer.
import type { Lettre } from './outil';

/** Remplace ce que Helvetica ne sait pas dessiner (espaces fines, flèches…) par un équivalent sûr. */
export function pourHelvetica(texte: string, connus: Set<number>): string {
  let s = texte.replace(/[    ]/g, ' ').replace(/[‐‑‒]/g, '-').replace(/→/g, '->');
  s = s.replace(/​/g, '');
  return [...s].map((c) => (c === '\n' || connus.has(c.codePointAt(0)!) ? c : '?')).join('');
}

export async function fabriquerPdf(lettre: Lettre): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(lettre.objet.slice(0, 120));
  doc.setCreator('Lettre de résiliation — outil gratuit, généré dans le navigateur');
  doc.setProducer('pdf-lib');
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  const connus = new Set<number>(police.getCharacterSet());

  const LARGEUR = 595.28, HAUTEUR = 841.89, MARGE = 62, TAILLE = 11, INTERLIGNE = 16;
  const utile = LARGEUR - 2 * MARGE;
  let page = doc.addPage([LARGEUR, HAUTEUR]);
  let y = HAUTEUR - MARGE;

  // « n° » reste collé au numéro qui suit : espace insécable interne (\u0001) rendue en espace à l'écriture.
  const coupe = (texte: string, f: typeof police, largeur = utile): string[] => {
    const lignes: string[] = [];
    const rendu = (t: string) => t.replace(/\u0001/g, ' ');
    for (const para of pourHelvetica(texte, connus).replace(/n° /g, 'n°\u0001').split('\n')) {
      if (!para.trim()) { lignes.push(''); continue; }
      let courant = '';
      for (const mot of para.split(' ')) {
        const essai = courant ? `${courant} ${mot}` : mot;
        if (f.widthOfTextAtSize(rendu(essai), TAILLE) <= largeur) courant = essai;
        else { if (courant) lignes.push(rendu(courant)); courant = mot; }
      }
      lignes.push(rendu(courant));
    }
    return lignes;
  };
  const ecrire = (lignes: string[], f: typeof police, xDecale = 0) => {
    for (const l of lignes) {
      if (y < MARGE) { page = doc.addPage([LARGEUR, HAUTEUR]); y = HAUTEUR - MARGE; }
      if (l) page.drawText(l, { x: MARGE + xDecale, y, size: TAILLE, font: f, color: rgb(0.1, 0.1, 0.12) });
      y -= INTERLIGNE;
    }
  };
  const blanc = (n = 1) => { y -= INTERLIGNE * n; };

  ecrire(coupe(lettre.expediteur.join('\n'), police), police);
  blanc(1.5);
  // destinataire à droite, comme une lettre française
  const decale = utile * 0.5;
  const dest = coupe(lettre.destinataire.join('\n'), police, utile - decale);
  for (const l of dest) {
    if (y < MARGE) { page = doc.addPage([LARGEUR, HAUTEUR]); y = HAUTEUR - MARGE; }
    page.drawText(l, { x: MARGE + decale, y, size: TAILLE, font: police, color: rgb(0.1, 0.1, 0.12) });
    y -= INTERLIGNE;
  }
  blanc(1);
  const date = pourHelvetica(lettre.lieuDate, connus);
  page.drawText(date, { x: LARGEUR - MARGE - police.widthOfTextAtSize(date, TAILLE), y, size: TAILLE, font: police, color: rgb(0.1, 0.1, 0.12) });
  y -= INTERLIGNE;
  blanc(1);
  ecrire(coupe(`Objet : ${lettre.objet}`, gras), gras);
  if (lettre.mentionEnvoi) ecrire(coupe(lettre.mentionEnvoi, gras), gras);
  blanc(1);
  ecrire(['Madame, Monsieur,'], police);
  blanc(0.5);
  for (const p of lettre.paragraphes) { ecrire(coupe(p, police), police); blanc(0.6); }
  ecrire(coupe(lettre.formuleFin, police), police);
  blanc(1.5);
  ecrire(coupe(lettre.signature, police), police);
  if (lettre.piecesJointes.length) {
    blanc(1);
    ecrire(coupe(`Pièce${lettre.piecesJointes.length > 1 ? 's' : ''} jointe${lettre.piecesJointes.length > 1 ? 's' : ''} : ${lettre.piecesJointes.join(' ; ')}.`, police), police);
  }
  return doc.save();
}
