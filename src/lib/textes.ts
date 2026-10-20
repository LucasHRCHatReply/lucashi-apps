// Libellés communs des composants, FR et EN. Un outil peut les surcharger par props.
export type Lang = 'fr' | 'en';
const T = {
  fr: {
    deposer: 'Déposer des fichiers',
    deposerAide: 'Glisser ici, cliquer pour choisir, ou coller (Cmd+V)',
    copier: 'Copier',
    copie: 'Copié',
    copieEchec: 'Sélectionné : Cmd+C pour copier',
    resultat: 'Résultat',
    telecharger: 'Télécharger',
    toutTelecharger: 'Tout télécharger (.zip)',
    info: 'Information',
    recu1: 'fichier reçu',
    recuN: 'fichiers reçus',
    refus: 'Aucun fichier de ce type',
  },
  en: {
    deposer: 'Drop files',
    deposerAide: 'Drag here, click to choose, or paste (Cmd+V)',
    copier: 'Copy',
    copie: 'Copied',
    copieEchec: 'Selected: press Cmd+C to copy',
    resultat: 'Result',
    telecharger: 'Download',
    toutTelecharger: 'Download all (.zip)',
    info: 'Information',
    recu1: 'file received',
    recuN: 'files received',
    refus: 'No file of this type',
  },
} as const;
export type Cle = keyof (typeof T)['fr'];
export const t = (lang: Lang, cle: Cle): string => T[lang][cle];

let n = 0;
/** Identifiant de repli quand le composant n'en reçoit pas (stable au sein d'une page). */
export const idUnique = (prefixe: string) => `${prefixe}-${++n}`;
