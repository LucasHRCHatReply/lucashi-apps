// « Arnaque ou pas ? » : analyse d'un SMS, d'un mail ou d'un lien. Node 22, aucune dépendance.
// Ne garde rien du texte reçu ; ne journalise ni texte, ni adresse, ni IP ; la limite de débit vit en mémoire.
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { extraireLiens, conclure, decouperDomaine, estHebergeurPublic, marqueOfficielle, RACCOURCISSEURS } from './regles.mjs';
import { suivre } from './ssrf.mjs';
import { creerRdap } from './rdap.mjs';
import { creerListes } from './listes.mjs';
import net from 'node:net';

export const MAX_TEXTE = 5000;
const MAX_LIENS_SUIVIS = 5;
const PLAFOND_ANALYSE = 20000;

const ERREURS_LIEN = {
  dns: { niveau: 'faible', texte: 'Ce nom de site n\'existe pas (ou plus) : les faux sites sont souvent supprimés peu après l\'envoi.' },
  ip: { niveau: 'moyen', texte: 'Le lien mène vers une adresse interne ou réservée : le serveur a refusé de le suivre.' },
  tls: { niveau: 'faible', texte: 'Le certificat de sécurité du site est invalide : un site sérieux n\'a pas ce défaut.' },
  sauts: { niveau: 'faible', texte: 'Le lien enchaîne un nombre inhabituel de redirections : le suivi s\'est arrêté.' },
  delai: { niveau: 'info', texte: 'Le site met trop de temps à répondre : le suivi du lien a été interrompu.' },
  connexion: { niveau: 'info', texte: 'Le site ne répond pas : impossible de voir où le lien mène.' },
  port: { niveau: 'info', texte: 'Le lien demande un port inhabituel : non suivi.' },
  protocole: { niveau: 'info', texte: 'Ce lien n\'est pas une adresse web : non suivi.' },
  url: { niveau: 'info', texte: 'Adresse illisible : non suivie.' },
};

/** Analyse complète d'un texte. `deps` (tests) : suivre, rdap, listes. */
export async function analyser(texte, deps) {
  const { suivre: suivreLien = suivre, rdap, listes } = deps;
  const debut = Date.now();
  const { liens } = extraireLiens(texte);
  const traites = await Promise.all(liens.map(async (l, i) => {
    const hote = l.hote;
    const dom = decouperDomaine(hote);
    const lien = { saisi: l.brut, hote, arobase: l.arobase };
    const suivi = i < MAX_LIENS_SUIVIS ? await suivreLien(l.url) : null;
    if (suivi) {
      lien.chaine = suivi.chaine.map((c) => ({ url: c.url, statut: c.statut, via: c.via ?? null }));
      const dernier = suivi.finale?.hostname ?? (suivi.chaine.length ? new URL(suivi.chaine[suivi.chaine.length - 1].url).hostname : null);
      if (dernier) lien.finale = { hote: dernier.replace(/^\[|\]$/g, ''), url: suivi.finale?.href ?? suivi.chaine[suivi.chaine.length - 1].url };
      if (suivi.erreur) { const e = ERREURS_LIEN[suivi.erreur.code] ?? ERREURS_LIEN.connexion; lien.erreur = e.texte; lien.erreurNiveau = e.niveau; lien.erreurCode = suivi.erreur.code; }
    }
    // listes : adresse saisie et chaque saut
    const aVerifier = [l.url, ...(lien.chaine ?? []).map((c) => c.url)];
    for (const u of aVerifier) { const t = listes.chercherAdresse(u); if (t) { lien.liste = t; lien.listeAdresse = u; break; } }
    // âge : domaine final, sinon domaine saisi (hors raccourcisseur)
    const cible = decouperDomaine(lien.finale?.hote ?? hote).domaine;
    if (!net.isIP(cible) && cible.includes('.') && !estHebergeurPublic(cible) && !RACCOURCISSEURS.has(cible)) {
      const a = await rdap.age(cible).catch(() => null);
      if (a?.jours !== undefined) lien.age = a;
      else if (a?.introuvable && !lien.erreur) { lien.erreur = `Le registre ne connaît pas le domaine ${cible}.`; lien.erreurNiveau = 'faible'; }
    }
    void dom;
    return lien;
  }));
  const res = conclure(texte, traites);
  return {
    ...res,
    liens: traites.map((l) => ({
      saisi: l.saisi, hote: l.hote, finale: l.finale?.hote ?? null, chaine: l.chaine ?? [], age: l.age ?? null, liste: l.liste ?? null,
      domaine: decouperDomaine(l.finale?.hote ?? l.hote).domaine, officiel: marqueOfficielle(decouperDomaine(l.finale?.hote ?? l.hote).domaine)?.nom ?? null,
    })),
    listes: listes.resume().map(({ nom, nombre, le }) => ({ nom, nombre, le })),
    duree_ms: Date.now() - debut,
  };
}

export function creer({ donnees = './donnees', cors = false, limiteParMinute = 20, simultanes = 10, deps = {} } = {}) {
  const rdap = deps.rdap ?? creerRdap();
  const listes = deps.listes ?? creerListes({ dossier: path.join(donnees, 'listes') });
  const sel = crypto.randomBytes(16);
  const fenetres = new Map(); // empreinte de l'IP (en mémoire seulement) -> { debut, n }
  let enCours = 0;

  const empreinte = (ip) => crypto.createHash('sha256').update(sel).update(ip).digest('base64').slice(0, 16);
  function ipClient(req) {
    const a = req.socket.remoteAddress || '';
    const local = a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
    const x = local && (req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0]);
    return String(x || a).trim();
  }
  function autorise(req) {
    const k = empreinte(ipClient(req));
    const now = Date.now();
    const f = fenetres.get(k);
    if (!f || now - f.debut >= 60000) { fenetres.set(k, { debut: now, n: 1 }); return { ok: true }; }
    f.n += 1;
    return f.n <= limiteParMinute ? { ok: true } : { ok: false, attendre: Math.ceil((60000 - (now - f.debut)) / 1000) };
  }
  const purge = setInterval(() => { const now = Date.now(); for (const [k, f] of fenetres) if (now - f.debut >= 60000) fenetres.delete(k); }, 30000);
  purge.unref();

  const entetes = (extra = {}) => ({
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    ...(cors ? { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET, OPTIONS' } : {}),
    ...extra,
  });
  const repondre = (res, code, corps, extra) => { res.writeHead(code, entetes(extra)); res.end(JSON.stringify(corps)); };

  const serveur = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (cors && req.method === 'OPTIONS') { res.writeHead(204, entetes()); return res.end(); }
    if (req.method === 'GET' && url.pathname === '/api/arnaque/sante') {
      return repondre(res, 200, { ok: true, listes: listes.resume().map(({ nom, nombre, le }) => ({ nom, nombre, le })) });
    }
    if (req.method !== 'POST' || url.pathname !== '/api/arnaque') { res.writeHead(404, entetes()); return res.end('{}'); }
    const lim = autorise(req);
    if (!lim.ok) return repondre(res, 429, { erreur: 'Trop de demandes : réessayez dans une minute.' }, { 'retry-after': String(lim.attendre) });

    let taille = 0;
    const morceaux = [];
    let rejete = false;
    req.on('data', (m) => {
      taille += m.length;
      if (taille > MAX_TEXTE * 4 + 1024) {
        if (!rejete) { rejete = true; repondre(res, 413, { erreur: `Texte trop long : ${MAX_TEXTE} caractères au plus.` }); }
        req.destroy();
        return;
      }
      morceaux.push(m);
    });
    req.on('end', async () => {
      if (rejete) return;
      let v;
      try { v = JSON.parse(Buffer.concat(morceaux).toString('utf8')); } catch { v = null; }
      if (!v || typeof v.texte !== 'string' || !v.texte.trim()) return repondre(res, 400, { erreur: 'Collez un SMS, un mail ou un lien.' });
      if (v.texte.length > MAX_TEXTE) return repondre(res, 413, { erreur: `Texte trop long : ${MAX_TEXTE} caractères au plus.` });
      if (enCours >= simultanes) return repondre(res, 503, { erreur: 'Le serveur est occupé : réessayez dans un instant.' }, { 'retry-after': '5' });
      enCours += 1;
      try {
        const out = await analyser(v.texte, { rdap, listes, ...deps });
        repondre(res, 200, out);
      } catch {
        repondre(res, 500, { erreur: 'L\'analyse a échoué : réessayez.' });
      } finally {
        enCours -= 1;
      }
    });
  });
  return { serveur, listes, rdap, fenetres, purge };
}

// Lancé directement ou par pm2 (dont le conteneur change argv[1] : pm_id le signale).
const principal = process.env.pm_id !== undefined
  || (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href);
if (principal) {
  const a = creer({ donnees: process.env.DONNEES || './donnees', cors: process.env.ARNAQUE_CORS_DEV === '1' });
  a.listes.depuisDisque();
  a.listes.rafraichir().catch(() => {});
  const minuteur = setInterval(() => a.listes.rafraichir().catch(() => {}), 3600 * 1000);
  const arret = () => {
    clearInterval(minuteur);
    a.serveur.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.on('SIGTERM', arret);
  process.on('SIGINT', arret);
  a.serveur.listen(Number(process.env.PORT) || 8241, '127.0.0.1');
}
