// Lecture du journal d'ffmpeg (`ffmpeg -i fichier`) : pure, testée. Sert au repli quand le démuxeur WebCodecs ne lit pas le conteneur.
export interface Source { duree: number; largeur: number; hauteur: number; fps: number; octets: number; aAudio: boolean }

export function analyserSondeFfmpeg(journal: string): Omit<Source, 'octets'> | null {
  const d = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(journal);
  const v = /Stream #[^\n]*Video:[^\n]*?(\d{2,5})x(\d{2,5})[^\n]*/.exec(journal);
  if (!d || !v) return null;
  const duree = Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]);
  let largeur = Number(v[1]), hauteur = Number(v[2]);
  const f = /(\d+(?:\.\d+)?)\s*fps/.exec(v[0]);
  const rot = /rotation of (-?\d+(?:\.\d+)?) degrees/.exec(journal);
  if (rot && Math.abs(Math.round(Number(rot[1]))) % 180 === 90) [largeur, hauteur] = [hauteur, largeur];
  return { duree, largeur, hauteur, fps: f ? Number(f[1]) : 30, aAudio: /Stream #[^\n]*Audio:/.test(journal) };
}
