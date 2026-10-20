// Les fiches imprimables : une mise en page décrite en éléments (mm), dessinée à l'identique en SVG (aperçu, export,
// impression) et en PDF (pdf-lib, chargé au premier usage). Aucun DOM.
import type { MatriceQR } from './qr';
import type { Securite } from './outil';

export type Modele = 'code' | 'minimal' | 'carte' | 'affiche';
export type Visible = 'rien' | 'reseau' | 'tout';
export type Lang = 'fr' | 'en';

export interface ParamsFiche {
  modele: Modele;
  ssid: string;
  mdp: string;
  securite: Securite;
  titre: string;
  visible: Visible;
  lang: Lang;
}

export type Element =
  | { t: 'rect'; x: number; y: number; w: number; h: number; r?: number; fond?: string; trait?: string; ep?: number }
  | { t: 'texte'; x: number; y: number; s: number; texte: string; gras?: boolean; mono?: boolean; couleur: string; ancre?: 'milieu' | 'debut' }
  | { t: 'qr'; x: number; y: number; m: number; matrice: MatriceQR }
  | { t: 'chemin'; d: string; x: number; y: number; k: number; couleur: string; ep: number }
  | { t: 'ligne'; x1: number; y1: number; x2: number; y2: number; couleur: string; ep: number };

export interface Mise {
  largeur: number; // mm
  hauteur: number; // mm
  elements: Element[];
}

export const A4 = { largeur: 210, hauteur: 297 };
export const ENCRE = '#15171c';
export const GRIS = '#5d626b';
export const ACCENT = '#0b5cab';
const FOND_DOUX = '#eef1f5';
export const SANS = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const MONO = "ui-monospace, Menlo, Consolas, 'Courier New', monospace";
const WIFI = 'M3 9.5a14 14 0 0 1 18 0M6 13a9.5 9.5 0 0 1 12 0M9 16.5a5 5 0 0 1 6 0M12 20h.1';

const TEXTES = {
  fr: { reseau: 'RÉSEAU', mdp: 'MOT DE PASSE', ouvert: 'Réseau ouvert, sans mot de passe', scan: 'Scannez avec l’appareil photo', sous: 'Connectez-vous au Wi-Fi',
    pas: [['Ouvrez l’appareil', 'photo'], ['Visez ce code', ''], ['Touchez le lien', 'qui s’affiche']] },
  en: { reseau: 'NETWORK', mdp: 'PASSWORD', ouvert: 'Open network, no password', scan: 'Scan with your phone camera', sous: 'Connect to the Wi-Fi',
    pas: [['Open the camera', 'app'], ['Point it at', 'this code'], ['Tap the link', 'that appears']] },
} as const;

/** Largeur approchée d'un texte (mm) : majorante, pour réduire la taille avant de déborder. Courier = 0,6 em exact. */
export function largeurTexte(texte: string, taille: number, gras = false, mono = false): number {
  return [...texte].length * taille * (mono ? 0.6 : gras ? 0.64 : 0.58);
}
function tenir(texte: string, taille: number, max: number, gras = false, mono = false, mini = 2.2): number {
  let s = taille;
  while (s > mini && largeurTexte(texte, s, gras, mono) > max) s -= 0.1;
  return Math.round(s * 10) / 10;
}

/** Mise en page d'une fiche, à sa taille réelle. */
export function fiche(p: ParamsFiche, matrice: MatriceQR): Mise {
  const T = TEXTES[p.lang];
  const ouvert = p.securite === 'nopass';
  const montrerReseau = p.visible !== 'rien';
  const montrerMdp = p.visible === 'tout' && !ouvert && p.mdp !== '';
  const titre = p.titre.trim();
  const pas = (cote: number) => cote / matrice.taille;

  if (p.modele === 'code') {
    const total = 100;
    const m = total / (matrice.taille + 8); // zone calme de 4 modules, comme la norme
    return { largeur: total, hauteur: total, elements: [
      { t: 'rect', x: 0, y: 0, w: total, h: total, fond: '#fff' },
      { t: 'qr', x: 4 * m, y: 4 * m, m, matrice },
    ] };
  }

  // Bloc « Réseau / Mot de passe » : étiquette grise en capitales, valeur dessous.
  const bloc = (el: Element[], cx: number, y: number, largeurMax: number, tailleSsid: number, tailleMdp: number, petite: number): void => {
    if (montrerReseau) {
      el.push({ t: 'texte', x: cx, y, s: petite, texte: T.reseau, couleur: GRIS });
      y += tailleSsid * 0.95;
      el.push({ t: 'texte', x: cx, y, s: tenir(p.ssid, tailleSsid, largeurMax, true), texte: p.ssid, gras: true, couleur: ENCRE });
    }
    if (montrerMdp) {
      y += petite * 2.6;
      el.push({ t: 'texte', x: cx, y, s: petite, texte: T.mdp, couleur: GRIS });
      y += tailleMdp * 1.05;
      el.push({ t: 'texte', x: cx, y, s: tenir(p.mdp, tailleMdp, largeurMax, false, true), texte: p.mdp, mono: true, couleur: ENCRE });
    } else if (montrerReseau && ouvert) {
      y += petite * 2.4;
      el.push({ t: 'texte', x: cx, y, s: petite * 1.1, texte: T.ouvert, couleur: GRIS });
    }
  };

  if (p.modele === 'minimal') {
    const w = 105, h = 148;
    const el: Element[] = [{ t: 'rect', x: 0, y: 0, w, h, fond: '#fff' }];
    el.push({ t: 'chemin', d: WIFI, x: w / 2 - 5, y: 8, k: 10 / 24, couleur: ENCRE, ep: 1.8 });
    const cote = montrerReseau ? 72 : 82;
    el.push({ t: 'qr', x: (w - cote) / 2, y: 24, m: pas(cote), matrice });
    if (montrerReseau) bloc(el, w / 2, 112, 85, 7, 5.4, 2.8);
    el.push({ t: 'texte', x: w / 2, y: 142, s: 3.4, texte: T.scan, couleur: GRIS });
    return { largeur: w, hauteur: h, elements: el };
  }

  if (p.modele === 'carte') {
    const w = 105, h = 148;
    const el: Element[] = [{ t: 'rect', x: 0, y: 0, w, h, fond: '#fff' }, { t: 'rect', x: 4, y: 4, w: w - 8, h: h - 8, r: 5, trait: ACCENT, ep: 0.6 }];
    el.push({ t: 'chemin', d: WIFI, x: w / 2 - 6, y: 11, k: 12 / 24, couleur: ACCENT, ep: 1.8 });
    if (titre) el.push({ t: 'texte', x: w / 2, y: 40, s: tenir(titre, 9.5, 82, true), texte: titre, gras: true, couleur: ENCRE });
    const cote = montrerReseau ? 58 : 68;
    el.push({ t: 'qr', x: (w - cote) / 2, y: titre ? 47 : 36, m: pas(cote), matrice });
    if (montrerReseau) bloc(el, w / 2, titre ? 114 : 103, 82, 6.2, 4.8, 2.6);
    el.push({ t: 'texte', x: w / 2, y: 140.5, s: 3.2, texte: T.scan, couleur: GRIS });
    return { largeur: w, hauteur: h, elements: el };
  }

  // affiche A4
  const { largeur: w, hauteur: h } = A4;
  const el: Element[] = [{ t: 'rect', x: 0, y: 0, w, h, fond: '#fff' }];
  el.push({ t: 'chemin', d: WIFI, x: w / 2 - 9, y: 20, k: 18 / 24, couleur: ACCENT, ep: 1.8 });
  if (titre) el.push({ t: 'texte', x: w / 2, y: 70, s: tenir(titre, 27, 172, true), texte: titre, gras: true, couleur: ENCRE });
  el.push({ t: 'texte', x: w / 2, y: 83, s: 7, texte: T.sous, couleur: GRIS });
  const cote = 112;
  el.push({ t: 'qr', x: (w - cote) / 2, y: 92, m: pas(cote), matrice });
  // trois gestes
  const colonnes = [w / 2 - 58, w / 2, w / 2 + 58];
  T.pas.forEach((lignes, i) => {
    const cx = colonnes[i];
    el.push({ t: 'rect', x: cx - 4.5, y: 213, w: 9, h: 9, r: 4.5, fond: ACCENT });
    el.push({ t: 'texte', x: cx, y: 219.4, s: 5, texte: String(i + 1), gras: true, couleur: '#fff' });
    el.push({ t: 'texte', x: cx, y: 232, s: 4.3, texte: lignes[0], couleur: ENCRE });
    if (lignes[1]) el.push({ t: 'texte', x: cx, y: 237.6, s: 4.3, texte: lignes[1], couleur: ENCRE });
  });
  if (montrerReseau) {
    const bas = 252, haut = 36;
    el.push({ t: 'rect', x: 18, y: bas, w: w - 36, h: haut, r: 5, fond: FOND_DOUX });
    if (montrerMdp) {
      for (const [cx, etiquette, valeur, mono] of [[w / 2 - 44, T.reseau, p.ssid, false], [w / 2 + 44, T.mdp, p.mdp, true]] as const) {
        el.push({ t: 'texte', x: cx, y: bas + 11, s: 3, texte: etiquette, couleur: GRIS });
        el.push({ t: 'texte', x: cx, y: bas + 24, s: tenir(valeur, mono ? 8 : 9, 82, !mono, mono), texte: valeur, gras: !mono, mono, couleur: ENCRE });
      }
    } else {
      el.push({ t: 'texte', x: w / 2, y: bas + 12, s: 3, texte: T.reseau, couleur: GRIS });
      el.push({ t: 'texte', x: w / 2, y: bas + 25, s: tenir(p.ssid, 10, 160, true), texte: p.ssid, gras: true, couleur: ENCRE });
      if (ouvert) el.push({ t: 'texte', x: w / 2, y: bas + 32, s: 3.4, texte: T.ouvert, couleur: GRIS });
    }
  }
  return { largeur: w, hauteur: h, elements: el };
}

/** La fiche posée sur une page A4, à taille réelle, avec des repères de coupe quand elle est plus petite. Sert au PDF et à l'impression. */
export function pageA4(f: Mise): Mise {
  if (f.largeur >= A4.largeur && f.hauteur >= A4.hauteur) return f;
  const ox = (A4.largeur - f.largeur) / 2;
  const oy = 22;
  const deplacer = (e: Element): Element => {
    switch (e.t) {
      case 'rect': case 'texte': case 'qr': case 'chemin': return { ...e, x: e.x + ox, y: e.y + oy };
      case 'ligne': return { ...e, x1: e.x1 + ox, x2: e.x2 + ox, y1: e.y1 + oy, y2: e.y2 + oy };
    }
  };
  const el: Element[] = [{ t: 'rect', x: 0, y: 0, w: A4.largeur, h: A4.hauteur, fond: '#fff' }, ...f.elements.map(deplacer)];
  const rep = (x: number, y: number, dx: number, dy: number) => {
    el.push({ t: 'ligne', x1: x + dx * 2, y1: y, x2: x + dx * 8, y2: y, couleur: '#8a8f98', ep: 0.2 });
    el.push({ t: 'ligne', x1: x, y1: y + dy * 2, x2: x, y2: y + dy * 8, couleur: '#8a8f98', ep: 0.2 });
  };
  rep(ox, oy, -1, -1); rep(ox + f.largeur, oy, 1, -1); rep(ox, oy + f.hauteur, -1, 1); rep(ox + f.largeur, oy + f.hauteur, 1, 1);
  return { largeur: A4.largeur, hauteur: A4.hauteur, elements: el };
}

const n3 = (v: number) => String(Math.round(v * 1000) / 1000);

/** Chemin SVG (mm) de tous les modules sombres, en bandes horizontales fusionnées. */
export function cheminModules(e: Extract<Element, { t: 'qr' }>): string {
  const { matrice: q, m, x, y } = e;
  let d = '';
  for (let j = 0; j < q.taille; j++) {
    let i = 0;
    while (i < q.taille) {
      if (!q.sombre(i, j)) { i++; continue; }
      let k = i;
      while (k < q.taille && q.sombre(k, j)) k++;
      d += `M${n3(x + i * m)} ${n3(y + j * m)}h${n3((k - i) * m)}v${n3(m)}h${n3(-(k - i) * m)}z`;
      i = k;
    }
  }
  return d;
}

/** Rectangle à coins arrondis, en chemin SVG (mm). */
export function cheminRect(x: number, y: number, w: number, h: number, r: number): string {
  const c = Math.min(r, w / 2, h / 2);
  if (c === 0) return `M${n3(x)} ${n3(y)}h${n3(w)}v${n3(h)}h${n3(-w)}z`;
  return `M${n3(x + c)} ${n3(y)}h${n3(w - 2 * c)}a${n3(c)} ${n3(c)} 0 0 1 ${n3(c)} ${n3(c)}v${n3(h - 2 * c)}a${n3(c)} ${n3(c)} 0 0 1 ${n3(-c)} ${n3(c)}h${n3(-(w - 2 * c))}a${n3(c)} ${n3(c)} 0 0 1 ${n3(-c)} ${n3(-c)}v${n3(-(h - 2 * c))}a${n3(c)} ${n3(c)} 0 0 1 ${n3(c)} ${n3(-c)}z`;
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** SVG autonome (unités = mm). `px` fixe la taille d'affichage en pixels (pour la conversion en PNG) ; sinon l'élément s'adapte à son conteneur. */
export function versSVG(f: Mise, options: { px?: number; titre?: string } = {}): string {
  const dim = options.px ? ` width="${Math.round(options.px)}" height="${Math.round((options.px * f.hauteur) / f.largeur)}"` : '';
  const parts = f.elements.map((e) => {
    switch (e.t) {
      case 'rect':
        return `<rect x="${n3(e.x)}" y="${n3(e.y)}" width="${n3(e.w)}" height="${n3(e.h)}"${e.r ? ` rx="${e.r}"` : ''} fill="${e.fond ?? 'none'}"${e.trait ? ` stroke="${e.trait}" stroke-width="${e.ep ?? 0.3}"` : ''}/>`;
      case 'texte':
        return `<text x="${n3(e.x)}" y="${n3(e.y)}" font-size="${e.s}" font-family="${e.mono ? MONO : SANS}"${e.gras ? ' font-weight="700"' : ''} fill="${e.couleur}" text-anchor="${e.ancre === 'debut' ? 'start' : 'middle'}">${xml(e.texte)}</text>`;
      case 'qr':
        return `<path d="${cheminModules(e)}" fill="#000" shape-rendering="crispEdges"/>`;
      case 'chemin':
        return `<path d="${e.d}" transform="translate(${n3(e.x)} ${n3(e.y)}) scale(${n3(e.k)})" fill="none" stroke="${e.couleur}" stroke-width="${e.ep}" stroke-linecap="round" stroke-linejoin="round"/>`;
      case 'ligne':
        return `<line x1="${n3(e.x1)}" y1="${n3(e.y1)}" x2="${n3(e.x2)}" y2="${n3(e.y2)}" stroke="${e.couleur}" stroke-width="${e.ep}"/>`;
    }
  });
  const titre = options.titre ? `<title>${xml(options.titre)}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n3(f.largeur)} ${n3(f.hauteur)}"${dim} role="img">${titre}${parts.join('')}</svg>`;
}

const PT = 72 / 25.4;

/** PDF vectoriel (pdf-lib chargé ici, au premier usage). Les caractères hors Helvetica sont remplacés par « ? ». */
export async function versPDF(f: Mise, titre = 'QR code Wi-Fi'): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, LineCapStyle } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(titre);
  doc.setCreator('QR code Wi-Fi');
  doc.setProducer('QR code Wi-Fi');
  const H = f.hauteur * PT;
  const page = doc.addPage([f.largeur * PT, H]);
  const polices = {
    sans: await doc.embedFont(StandardFonts.Helvetica),
    gras: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
  const couleur = (hex: string) => {
    const v = parseInt(hex.length === 4 ? hex.replace(/[0-9a-f]/gi, '$&$&').slice(1) : hex.slice(1), 16);
    return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
  };
  for (const e of f.elements) {
    if (e.t === 'rect') {
      if (!e.fond && !e.trait) continue;
      page.drawSvgPath(cheminRect(e.x, e.y, e.w, e.h, e.r ?? 0), {
        x: 0, y: H, scale: PT,
        ...(e.fond ? { color: couleur(e.fond) } : {}),
        ...(e.trait ? { borderColor: couleur(e.trait), borderWidth: e.ep ?? 0.3 } : {}),
      });
    } else if (e.t === 'qr') {
      page.drawSvgPath(cheminModules(e), { x: 0, y: H, scale: PT, color: rgb(0, 0, 0) });
    } else if (e.t === 'chemin') {
      page.drawSvgPath(e.d, { x: e.x * PT, y: H - e.y * PT, scale: e.k * PT, borderColor: couleur(e.couleur), borderWidth: e.ep, borderLineCap: LineCapStyle.Round });
    } else if (e.t === 'ligne') {
      page.drawLine({ start: { x: e.x1 * PT, y: H - e.y1 * PT }, end: { x: e.x2 * PT, y: H - e.y2 * PT }, thickness: e.ep * PT, color: couleur(e.couleur) });
    } else {
      const police = e.mono ? polices.mono : e.gras ? polices.gras : polices.sans;
      const permis = new Set(police.getCharacterSet());
      const texte = [...e.texte].map((c) => (permis.has(c.codePointAt(0)!) ? c : '?')).join('');
      const taille = e.s * PT;
      const largeur = police.widthOfTextAtSize(texte, taille);
      page.drawText(texte, { x: e.x * PT - (e.ancre === 'debut' ? 0 : largeur / 2), y: H - e.y * PT, size: taille, font: police, color: couleur(e.couleur) });
    }
  }
  return doc.save();
}
