// Logique pure de l'outil « signature d'e-mail » : aucun DOM. Le HTML produit tient en tableaux,
// avec des styles en ligne seulement (ni <style>, ni classe, ni script), parce que les messageries les retirent.

export type Modele = 'classique' | 'moderne' | 'sobre' | 'bandeau';
export const MODELES: Modele[] = ['classique', 'moderne', 'sobre', 'bandeau'];
export const COULEUR_DEFAUT = '#0067b3';
export const LARGEUR_MAX = 600;

export interface Donnees {
  nom: string;
  poste: string;
  entreprise: string;
  telephone: string;
  email: string;
  site: string;
  adresse: string;
  linkedin: string;
  x: string;
  instagram: string;
  facebook: string;
  youtube: string;
  photo: string; // URL https, ou data:image/… (image déposée, restée locale)
  couleur: string;
  modele: Modele;
  rond: boolean;
}

export const DONNEES_EXEMPLE: Donnees = {
  nom: 'Camille Martin',
  poste: 'Responsable communication',
  entreprise: 'Atelier Exemple',
  telephone: '+33 6 12 34 56 78',
  email: 'camille.martin@exemple.fr',
  site: 'www.exemple.fr',
  adresse: '12 rue des Lilas, 75011 Paris',
  linkedin: 'linkedin.com/in/camille-martin-exemple',
  x: '',
  instagram: '',
  facebook: '',
  youtube: '',
  photo: '',
  couleur: COULEUR_DEFAUT,
  modele: 'classique',
  rond: true,
};

export const RESEAUX = [
  { cle: 'linkedin', nom: 'LinkedIn' },
  { cle: 'x', nom: 'X' },
  { cle: 'instagram', nom: 'Instagram' },
  { cle: 'facebook', nom: 'Facebook' },
  { cle: 'youtube', nom: 'YouTube' },
] as const;

/** Échappe un texte pour le HTML (contenu et attribut). */
export function echapper(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Adresse web sûre : http(s) seulement ; ajoute https:// si absent ; refuse javascript:, data:, etc. */
export function urlSure(brut: string): string {
  const v = brut.trim();
  if (!v) return '';
  const avecSchema = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v.replace(/^\/\//, '')}`;
  try {
    const u = new URL(avecSchema);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    if (!u.hostname.includes('.')) return '';
    return u.href;
  } catch {
    return '';
  }
}

/** Image : URL https/http, ou data:image raster (pas de SVG, bloqué par les messageries). */
export function imageSure(brut: string): string {
  const v = brut.trim();
  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=]+$/i.test(v)) return v;
  return urlSure(v);
}

export function couleurSure(c: string): string {
  const v = c.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  return COULEUR_DEFAUT;
}

export const emailValide = (e: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(e.trim());
export const telHref = (t: string) => {
  const n = t.replace(/[^\d+]/g, '');
  return n.replace(/\D/g, '').length >= 6 ? `tel:${n}` : '';
};
export const sansSchema = (u: string) => u.replace(/^https?:\/\//i, '').replace(/\/$/, '');

const POLICE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const ENCRE = '#222222';
const GRIS = '#666666';

interface Pret {
  nom: string; poste: string; entreprise: string; tel: string; telHref: string; email: string; emailOk: boolean;
  site: string; siteHref: string; adresse: string; reseaux: { nom: string; href: string }[]; photo: string; couleur: string; rond: boolean;
}

function preparer(d: Donnees): Pret {
  const reseaux = RESEAUX.map((r) => ({ nom: r.nom, href: urlSure(d[r.cle]) })).filter((r) => r.href);
  const siteHref = urlSure(d.site);
  return {
    nom: d.nom.trim(), poste: d.poste.trim(), entreprise: d.entreprise.trim(),
    tel: d.telephone.trim(), telHref: telHref(d.telephone),
    email: d.email.trim(), emailOk: emailValide(d.email),
    site: siteHref ? sansSchema(d.site.trim()) : d.site.trim(), siteHref,
    adresse: d.adresse.trim(), reseaux, photo: imageSure(d.photo), couleur: couleurSure(d.couleur), rond: d.rond,
  };
}

const lien = (href: string, texte: string, couleur: string, extra = '') =>
  `<a href="${echapper(href)}" style="color:${couleur};text-decoration:none;${extra}">${echapper(texte)}</a>`;

function imgPhoto(p: Pret, taille: number): string {
  if (!p.photo) return '';
  const rayon = p.rond ? `border-radius:${taille / 2}px;` : 'border-radius:6px;';
  return `<img src="${echapper(p.photo)}" width="${taille}" height="${taille}" alt="${echapper(p.nom || 'Photo')}" style="display:block;width:${taille}px;height:${taille}px;object-fit:cover;border:0;${rayon}">`;
}

/** Lignes de contact : { lib, html } — lib = lettre d'étiquette (T, E, W…). */
function contacts(p: Pret, couleurLien: string): { lib: string; html: string }[] {
  const out: { lib: string; html: string }[] = [];
  if (p.tel) out.push({ lib: 'T', html: p.telHref ? lien(p.telHref, p.tel, ENCRE) : echapper(p.tel) });
  if (p.email) out.push({ lib: 'E', html: p.emailOk ? lien(`mailto:${p.email}`, p.email, couleurLien) : echapper(p.email) });
  if (p.site) out.push({ lib: 'W', html: p.siteHref ? lien(p.siteHref, p.site, couleurLien) : echapper(p.site) });
  if (p.adresse) out.push({ lib: 'A', html: echapper(p.adresse) });
  return out;
}

const liensReseaux = (p: Pret, couleur: string, sep = ' &middot; ') =>
  p.reseaux.map((r) => lien(r.href, r.nom, couleur, 'font-weight:bold;')).join(sep);

const racine = (corps: string) =>
  `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;max-width:${LARGEUR_MAX}px;font-family:${POLICE};font-size:14px;line-height:20px;color:${ENCRE};">${corps}</table>`;

function classique(p: Pret): string {
  const c = p.couleur;
  const lignes = contacts(p, c).map((l) =>
    `<tr><td style="padding:0 8px 0 0;font-size:13px;line-height:20px;font-weight:bold;color:${c};">${l.lib}</td><td style="padding:0;font-size:13px;line-height:20px;color:${ENCRE};">${l.html}</td></tr>`).join('');
  const photo = imgPhoto(p, 88);
  const gauche = photo ? `<td valign="top" style="padding:0 16px 0 0;">${photo}</td>` : '';
  const bord = photo ? `border-left:3px solid ${c};padding-left:16px;` : `border-left:3px solid ${c};padding-left:14px;`;
  const sous = [p.poste && echapper(p.poste), p.entreprise && `<b style="color:${c};">${echapper(p.entreprise)}</b>`].filter(Boolean).join(' &middot; ');
  const res = p.reseaux.length ? `<tr><td colspan="2" style="padding:8px 0 0 0;font-size:13px;line-height:20px;">${liensReseaux(p, c)}</td></tr>` : '';
  const droite = `<td valign="top" style="${bord}"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">`
    + `<tr><td colspan="2" style="padding:0;font-size:18px;line-height:24px;font-weight:bold;color:${ENCRE};">${echapper(p.nom)}</td></tr>`
    + (sous ? `<tr><td colspan="2" style="padding:0 0 8px 0;font-size:14px;line-height:20px;color:${GRIS};">${sous}</td></tr>` : '')
    + lignes + res + '</table></td>';
  return racine(`<tr>${gauche}${droite}</tr>`);
}

function moderne(p: Pret): string {
  const c = p.couleur;
  const photo = imgPhoto(p, 72);
  const entete = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr>`
    + (photo ? `<td valign="middle" style="padding:0 14px 0 0;">${photo}</td>` : '')
    + `<td valign="middle" style="padding:0;"><div style="font-size:20px;line-height:26px;font-weight:bold;color:${ENCRE};">${echapper(p.nom)}</div>`
    + (p.poste ? `<div style="font-size:14px;line-height:20px;color:${c};font-weight:bold;">${echapper(p.poste)}</div>` : '')
    + (p.entreprise ? `<div style="font-size:13px;line-height:20px;color:${GRIS};">${echapper(p.entreprise)}</div>` : '')
    + `</td></tr></table>`;
  const ct = contacts(p, c).filter((l) => l.lib !== 'A').map((l) => l.html).join(` <span style="color:${c};">&#124;</span> `);
  const adresse = p.adresse ? `<div style="font-size:12px;line-height:18px;color:${GRIS};padding-top:2px;">${echapper(p.adresse)}</div>` : '';
  const res = p.reseaux.length ? `<div style="padding-top:6px;font-size:12px;line-height:18px;">${liensReseaux(p, c)}</div>` : '';
  const bas = ct || adresse || res ? `<tr><td style="padding:10px 0 0 0;border-top:2px solid ${c};font-size:13px;line-height:20px;">${ct}${adresse}${res}</td></tr>` : '';
  return racine(`<tr><td style="padding:0 0 10px 0;">${entete}</td></tr>${bas}`);
}

function sobre(p: Pret): string {
  const c = p.couleur;
  const l1 = `<div style="font-size:15px;line-height:22px;font-weight:bold;color:${ENCRE};">${echapper(p.nom)}</div>`;
  const l2 = [p.poste && echapper(p.poste), p.entreprise && echapper(p.entreprise)].filter(Boolean).join(', ');
  const ct = contacts(p, c).map((l) => l.html).join(' &middot; ');
  const res = p.reseaux.length ? liensReseaux(p, c) : '';
  const photo = imgPhoto(p, 48);
  const texte = l1
    + (l2 ? `<div style="font-size:13px;line-height:20px;color:${GRIS};">${l2}</div>` : '')
    + (ct ? `<div style="font-size:13px;line-height:20px;color:${ENCRE};padding-top:4px;">${ct}</div>` : '')
    + (res ? `<div style="font-size:13px;line-height:20px;padding-top:2px;">${res}</div>` : '');
  return racine(`<tr>${photo ? `<td valign="top" style="padding:0 12px 0 0;">${photo}</td>` : ''}<td valign="top" style="padding:0;">${texte}</td></tr>`);
}

function bandeau(p: Pret): string {
  const c = p.couleur;
  const photo = imgPhoto(p, 64);
  const haut = `<tr>${photo ? `<td valign="middle" style="padding:0 14px 12px 0;">${photo}</td>` : ''}<td valign="middle" style="padding:0 0 12px 0;">`
    + `<div style="font-size:19px;line-height:24px;font-weight:bold;color:${ENCRE};">${echapper(p.nom)}</div>`
    + `<div style="font-size:14px;line-height:20px;color:${GRIS};">${[p.poste && echapper(p.poste), p.entreprise && `<b>${echapper(p.entreprise)}</b>`].filter(Boolean).join(' &middot; ')}</div></td></tr>`;
  const ct = contacts(p, '#ffffff').filter((l) => l.lib !== 'A').map((l) => l.html.replace(new RegExp(`color:${ENCRE}`, 'g'), 'color:#ffffff')).join(' &nbsp;&middot;&nbsp; ');
  const res = p.reseaux.length ? liensReseaux(p, '#ffffff', ' &nbsp;&middot;&nbsp; ') : '';
  const adr = p.adresse ? echapper(p.adresse) : '';
  const interne = [ct, adr, res].filter(Boolean).map((x, i) => `<div style="${i ? 'padding-top:4px;' : ''}font-size:13px;line-height:20px;color:#ffffff;">${x}</div>`).join('');
  const bas = interne ? `<tr><td colspan="2" bgcolor="${c}" style="background-color:${c};padding:10px 14px;border-radius:6px;color:#ffffff;">${interne}</td></tr>` : '';
  return racine(haut + bas);
}

/** La signature en HTML (tableaux, styles en ligne). Chaîne vide si rien n'est saisi. */
export function construireHtml(d: Donnees): string {
  const p = preparer(d);
  if (!p.nom && !p.poste && !p.entreprise && !p.tel && !p.email && !p.site && !p.adresse && !p.reseaux.length && !p.photo) return '';
  switch (d.modele) {
    case 'moderne': return moderne(p);
    case 'sobre': return sobre(p);
    case 'bandeau': return bandeau(p);
    default: return classique(p);
  }
}

/** Version texte brut (repli du presse-papiers et des messageries en texte seul). */
export function construireTexte(d: Donnees): string {
  const p = preparer(d);
  const lignes = [
    p.nom,
    [p.poste, p.entreprise].filter(Boolean).join(' - '),
    p.tel && `T ${p.tel}`,
    p.email && `E ${p.email}`,
    p.site && `W ${p.site}`,
    p.adresse,
    ...p.reseaux.map((r) => `${r.nom} : ${r.href}`),
  ];
  return lignes.filter(Boolean).join('\n');
}

/** Document .html complet à ouvrir ou à insérer (la signature seule reste sans <style>). */
export function documentHtml(signature: string, lang: 'fr' | 'en' = 'fr'): string {
  return `<!doctype html>\n<html lang="${lang}"><head><meta charset="utf-8"><title>${lang === 'fr' ? 'Signature' : 'Signature'}</title></head>\n<body style="margin:16px;background:#ffffff;">\n${signature}\n</body></html>\n`;
}

/** Poids approximatif d'une image intégrée (octets décodés), 0 si ce n'est pas une image intégrée. */
export function poidsImageIntegree(src: string): number {
  const m = /^data:image\/[a-z]+;base64,([a-z0-9+/=]+)$/i.exec(src);
  return m ? Math.floor((m[1].length * 3) / 4) : 0;
}
