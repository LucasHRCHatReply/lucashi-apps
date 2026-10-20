// Logique pure de « QR code Wi-Fi » : chaîne WIFI:, validation, nom de fichier. Aucun DOM.
// Format : WIFI:T:<WPA|WEP|nopass>;S:<réseau>;P:<mot de passe>;H:<true|false>;;
// Référence : format de code-barres de ZXing (« Wi-Fi Network config »), lu par l'appareil photo d'iOS et d'Android.
export type Securite = 'WPA' | 'WEP' | 'nopass';

export interface ReseauWifi {
  ssid: string;
  mdp: string;
  securite: Securite;
  masque: boolean;
}

/** Échappe \ ; , : " avec une barre oblique inverse, comme l'exige le format. */
export function echapper(valeur: string): string {
  return valeur.replace(/[\\;,:"]/g, (c) => `\\${c}`);
}

/** Chaîne à encoder dans le QR code. Sans mot de passe (réseau ouvert), le champ P est omis. */
export function chaineWifi(r: ReseauWifi): string {
  const p = r.securite === 'nopass' || r.mdp === '' ? '' : `P:${echapper(r.mdp)};`;
  return `WIFI:T:${r.securite};S:${echapper(r.ssid)};${p}H:${r.masque ? 'true' : 'false'};;`;
}

const octets = (s: string) => new TextEncoder().encode(s).length;
const HEX = /^[0-9a-fA-F]+$/;

export type CodeErreur = 'ssid-vide' | 'ssid-long' | 'mdp-court' | 'mdp-long' | 'wep-longueur';

/** Erreurs qui rendraient le code inutilisable (un réseau qui refuserait la connexion). */
export function valider(r: ReseauWifi): CodeErreur[] {
  const e: CodeErreur[] = [];
  if (r.ssid === '') e.push('ssid-vide');
  else if (octets(r.ssid) > 32) e.push('ssid-long'); // un nom de réseau fait 32 octets au plus (IEEE 802.11)
  if (r.securite === 'WPA') {
    const n = [...r.mdp].length;
    const psk = n === 64 && HEX.test(r.mdp); // clé de 64 chiffres hexadécimaux admise
    if (n < 8) e.push('mdp-court');
    else if (n > 63 && !psk) e.push('mdp-long');
  } else if (r.securite === 'WEP') {
    const n = r.mdp.length;
    const ok = [5, 13].includes(n) || ([10, 26].includes(n) && HEX.test(r.mdp));
    if (!ok) e.push('wep-longueur');
  }
  return e;
}

const MESSAGES = {
  fr: {
    'ssid-vide': 'Saisissez le nom du réseau.',
    'ssid-long': 'Un nom de réseau fait 32 octets au plus : celui-ci est trop long.',
    'mdp-court': 'Un mot de passe WPA compte 8 caractères au minimum.',
    'mdp-long': 'Un mot de passe WPA compte 63 caractères au maximum.',
    'wep-longueur': 'Une clé WEP compte 5 ou 13 caractères (10 ou 26 en hexadécimal).',
  },
  en: {
    'ssid-vide': 'Enter the network name.',
    'ssid-long': 'A network name is 32 bytes at most: this one is too long.',
    'mdp-court': 'A WPA password has at least 8 characters.',
    'mdp-long': 'A WPA password has at most 63 characters.',
    'wep-longueur': 'A WEP key has 5 or 13 characters (10 or 26 in hexadecimal).',
  },
} as const;
export const messageErreur = (e: CodeErreur, lang: 'fr' | 'en' = 'fr') => MESSAGES[lang][e];

/** Caractères que le PDF (police Helvetica, WinAnsi) sait écrire ; les autres y seraient remplacés par « ? ». */
export function compatiblePDF(texte: string): boolean {
  return /^[\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]*$/.test(texte);
}

/** Nom de fichier sûr, sans le mot de passe : « qr-wifi-<réseau>-<modèle>.<ext> ». */
export function nomFichier(ssid: string, modele: string, ext: string): string {
  const base = ssid.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  return `qr-wifi-${base || 'reseau'}-${modele}.${ext}`;
}
