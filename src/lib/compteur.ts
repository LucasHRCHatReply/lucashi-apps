// Compteur d'audience sans cookie : n'envoie que {o: outil, e: evenement}.
const derniere: Record<string, number> = {};

export function compter(evenement: 'vue' | 'utilise', outil: string): void {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
  const hote = typeof location !== 'undefined' ? location.hostname : '';
  if (hote === 'localhost' || hote === '127.0.0.1') return;
  if (evenement === 'utilise') {
    const maintenant = Date.now();
    if (derniere[outil] !== undefined && maintenant - derniere[outil] < 1000) return;
    derniere[outil] = maintenant;
  }
  try {
    navigator.sendBeacon(
      '/api/compte',
      new Blob([JSON.stringify({ o: outil, e: evenement })], { type: 'application/json' }),
    );
  } catch {
    // le comptage ne doit jamais gêner l'outil
  }
}
