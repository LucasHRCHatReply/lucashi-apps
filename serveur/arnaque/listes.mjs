// Listes publiques d'hameçonnage et de sites malveillants, téléchargées périodiquement (jamais à chaque requête).
//  - OpenPhish, flux communautaire : https://github.com/openphish/public_feed — mis à jour toutes les 12 h, USAGE NON COMMERCIAL
//    (conditions : https://openphish.com/terms.html).
//  - URLhaus (abuse.ch), sites diffusant des logiciels malveillants : https://urlhaus.abuse.ch/ — données ouvertes (CC0),
//    usage équitable (conditions : https://urlhaus.abuse.ch/api/). Une copie par 12 h reste très en dessous du seuil.
// Ces listes sont des données publiques ; ce sont les seuls fichiers que le serveur écrit sur disque.
import fs from 'node:fs';
import path from 'node:path';

export const SOURCES = [
  { id: 'openphish', nom: 'OpenPhish (flux communautaire)', url: 'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt' },
  { id: 'urlhaus', nom: 'URLhaus (abuse.ch)', url: 'https://urlhaus.abuse.ch/downloads/text_online/' },
];
// Services très utilisés : une page listée ne rend pas tout le service suspect.
const GRANDS_SERVICES = new Set(['docs.google.com', 'drive.google.com', 'forms.gle', 'sites.google.com', 'github.com', 'raw.githubusercontent.com', 'dropbox.com', 'www.dropbox.com', 'onedrive.live.com', '1drv.ms', 'sharepoint.com', 'wetransfer.com', 'we.tl', 'bit.ly', 't.co', 'tinyurl.com', 'cutt.ly', 'linktr.ee', 'storage.googleapis.com', 'weebly.com', 'wixsite.com', 'blogspot.com', 'web.app', 'firebaseapp.com', 'pages.dev', 'netlify.app', 'vercel.app', 'workers.dev', 'canva.com', 'notion.site', 'typeform.com', 'airtable.com', 'forms.office.com', 'discord.com', 'cdn.discordapp.com', 't.me', 'youtube.com', 'youtu.be']);

export function cleUrl(u) {
  try {
    const x = new URL(u);
    return `${x.hostname.toLowerCase()}${x.pathname.replace(/\/+$/, '')}${x.search}`;
  } catch { return null; }
}

export function creerListes({ dossier, chercher = fetch, maintenant = () => Date.now(), sources = SOURCES, pas = 12 * 3600 * 1000 } = {}) {
  const etat = Object.fromEntries(sources.map((s) => [s.id, { nom: s.nom, cles: new Set(), hotes: new Set(), le: null, nombre: 0 }]));
  const fichier = (id) => (dossier ? path.join(dossier, `${id}.txt`) : null);

  function charger(id, texte, le) {
    const cles = new Set(), hotes = new Set();
    for (const ligne of texte.split('\n')) {
      const l = ligne.trim();
      if (!l || l.startsWith('#')) continue;
      const k = cleUrl(l);
      if (!k) continue;
      cles.add(k);
      hotes.add(k.split(/[/?]/)[0]);
    }
    Object.assign(etat[id], { cles, hotes, le, nombre: cles.size });
  }
  function depuisDisque() {
    for (const s of sources) {
      const f = fichier(s.id);
      if (!f) continue;
      try { charger(s.id, fs.readFileSync(f, 'utf8'), fs.statSync(f).mtimeMs); } catch { /* pas encore téléchargée */ }
    }
  }
  async function rafraichir({ force = false } = {}) {
    for (const s of sources) {
      const e = etat[s.id];
      if (!force && e.le && maintenant() - e.le < pas) continue;
      try {
        const r = await chercher(s.url, { headers: { 'user-agent': 'ArnaqueOuPas/1.0 (copie toutes les 12 h)' }, signal: AbortSignal.timeout(60000), redirect: 'follow' });
        if (!r.ok) throw new Error(`http ${r.status}`);
        const texte = await r.text();
        if (texte.length < 100) throw new Error('liste vide');
        const f = fichier(s.id);
        if (f) { fs.mkdirSync(dossier, { recursive: true }); fs.writeFileSync(`${f}.tmp`, texte); fs.renameSync(`${f}.tmp`, f); }
        charger(s.id, texte, maintenant());
      } catch (err) {
        console.error(`liste ${s.id} : ${err.message}`);
      }
    }
  }
  /** Présence d'une adresse : { source, exact } ou null. */
  function chercherAdresse(url) {
    const k = cleUrl(url);
    if (!k) return null;
    const hote = k.split(/[/?]/)[0];
    const sansQuery = k.split('?')[0];
    for (const s of sources) {
      const e = etat[s.id];
      if (e.cles.has(k) || e.cles.has(sansQuery)) return { source: e.nom, exact: true };
    }
    for (const s of sources) {
      const e = etat[s.id];
      if (e.hotes.has(hote) && !GRANDS_SERVICES.has(hote) && !GRANDS_SERVICES.has(hote.split('.').slice(-2).join('.'))) return { source: e.nom, exact: false };
    }
    return null;
  }
  const resume = () => Object.entries(etat).map(([id, e]) => ({ id, nom: e.nom, nombre: e.nombre, le: e.le ? new Date(e.le).toISOString() : null }));
  return { depuisDisque, rafraichir, chercherAdresse, resume, charger: (id, t, le = maintenant()) => charger(id, t, le) };
}
