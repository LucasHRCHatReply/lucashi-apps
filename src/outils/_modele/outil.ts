// Logique pure du modèle « compter les mots » : aucun DOM, testable seule.
export interface Comptes {
  mots: number;
  caracteres: number;
  caracteresSansEspaces: number;
  phrases: number;
  paragraphes: number;
  minutesLecture: number; // à 230 mots par minute (lecture silencieuse, adulte, français)
}

export const MOTS_PAR_MINUTE = 230;

export function compterMots(texte: string, motsParMinute = MOTS_PAR_MINUTE): Comptes {
  const t = texte.replace(/\r\n?/g, '\n');
  const mots = (t.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).length;
  const phrases = (t.match(/[^.!?…\n]+[.!?…]*/g) ?? []).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
  const paragraphes = t.split(/\n\s*\n/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
  return {
    mots,
    caracteres: [...t].length,
    caracteresSansEspaces: [...t.replace(/\s/g, '')].length,
    phrases,
    paragraphes,
    minutesLecture: mots === 0 ? 0 : Math.max(1, Math.round(mots / motsParMinute)),
  };
}

export function resume(c: Comptes, lang: 'fr' | 'en' = 'fr'): string {
  return lang === 'fr'
    ? [`Mots : ${c.mots}`, `Caractères : ${c.caracteres}`, `Caractères sans espaces : ${c.caracteresSansEspaces}`, `Phrases : ${c.phrases}`, `Paragraphes : ${c.paragraphes}`, `Lecture : environ ${c.minutesLecture} min`].join('\n')
    : [`Words: ${c.mots}`, `Characters: ${c.caracteres}`, `Characters without spaces: ${c.caracteresSansEspaces}`, `Sentences: ${c.phrases}`, `Paragraphs: ${c.paragraphes}`, `Reading time: about ${c.minutesLecture} min`].join('\n');
}
