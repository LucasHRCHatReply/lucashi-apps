// Icônes d'outils : nom de type SF Symbols -> tracé SVG (24x24, trait). Une icône inconnue est refusée par le test des fiches.
export const ICONES: Record<string, string> = {
  'photo': '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  'arrow.down.right.and.arrow.up.left': '<path d="M14 10l7-7M21 8V3h-5M10 14l-7 7M3 16v5h5"/>',
  'text.viewfinder': '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 9h8M12 9v7"/>',
  'qrcode': '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2"/>',
  'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'envelope': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
  'doc.text': '<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M8 13h8M8 17h6"/>',
  'eurosign.circle': '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5a4 4 0 1 0 0 7M8 11h5M8 13.5h5"/>',
  'house': '<path d="m3 11 9-7 9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  'textformat': '<path d="M4 19 10 5l6 14M6.5 14h7M17 12h3.5M18.7 12v7"/>',
  'wifi': '<path d="M3 9.5a14 14 0 0 1 18 0M6 13a9.5 9.5 0 0 1 12 0M9 16.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r=".8"/>',
  'percent': '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  'signature': '<path d="M3 17c3 0 4-9 6-9s-1 9 1 9 2-4 4-4 1 4 3 4h4"/><path d="M3 21h18"/>',
  'wrench': '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5z"/>',
};
export const ICONE_PAR_DEFAUT = 'wrench';
export const svgIcone = (nom: string) => ICONES[nom] ?? ICONES[ICONE_PAR_DEFAUT];
