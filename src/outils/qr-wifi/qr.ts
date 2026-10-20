// Matrice du QR code (librairie `qrcode`, chargée au premier usage par l'interface).
import QRCode from 'qrcode';

export interface MatriceQR {
  taille: number;
  sombre: (x: number, y: number) => boolean;
}

/** Niveau de correction M (15 %) : bon compromis pour une impression courante. */
export function matriceQR(texte: string, niveau: 'L' | 'M' | 'Q' | 'H' = 'M'): MatriceQR {
  const q = QRCode.create(texte, { errorCorrectionLevel: niveau });
  const n = q.modules.size;
  const d = q.modules.data;
  return { taille: n, sombre: (x, y) => d[y * n + x] === 1 };
}
