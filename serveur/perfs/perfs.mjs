// Réception des perfs mensuelles du skill d'orchestration. Node 22, aucune dépendance.
// POST /api/perfs : un fichier JSONL produit par outils/extraire.mjs (chiffres seulement).
// Chaque ligne est vérifiée : clés et chaînes courtes, sans texte libre ; sinon tout le lot est refusé.
// Les lots acceptés s'écrivent dans DONNEES/recus/<compte>/ ; le Mac analyste les rapatrie par ssh.
// Ni IP, ni agent utilisateur n'est gardé : la limite de débit vit en mémoire, sur une empreinte salée.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TAILLE_MAX = 8 * 1024 * 1024;
const LIGNES_MAX = 20000;
const LIGNE_MAX = 32 * 1024;
const PAR_HEURE = 6;
const DISQUE_MAX = 500 * 1024 * 1024;
const COMPTE = /^[a-z0-9-]{1,40}$/;
const CLE = /^[0-9a-f]{32,64}$/;
const SURE = /^[\p{L}\p{N}_ .:\-\[\]\/@+?]*$/u;
const CHAINES = { compte: COMPTE, session: /^[0-9a-f]{8}$/, projet: /^p-[0-9a-f]{6}$/, debut: /^[0-9TZ:.\-]{0,30}$/, fin: /^[0-9TZ:.\-]{0,30}$/ };

// Vrai si la valeur ne contient que des nombres, booléens et chaînes courtes sans texte libre.
function propre(v, profondeur = 0) {
  if (profondeur > 4) return false;
  if (v === null || typeof v === 'number' || typeof v === 'boolean') return true;
  if (typeof v === 'string') return v.length <= 80 && SURE.test(v);
  if (Array.isArray(v)) return v.length <= 2000 && v.every((x) => propre(x, profondeur + 1));
  if (typeof v === 'object') {
    const e = Object.entries(v);
    return e.length <= 500 && e.every(([k, x]) => k.length <= 80 && SURE.test(k) && propre(x, profondeur + 1));
  }
  return false;
}

export function verifierLot(texte, compte) {
  const lignes = texte.split('\n').filter((l) => l.trim());
  if (!lignes.length) return { erreur: 'lot vide' };
  if (lignes.length > LIGNES_MAX) return { erreur: 'trop de lignes' };
  for (const [i, l] of lignes.entries()) {
    if (l.length > LIGNE_MAX) return { erreur: `ligne ${i + 1} trop longue` };
    let f;
    try { f = JSON.parse(l); } catch { return { erreur: `ligne ${i + 1} : JSON invalide` }; }
    if (!f || typeof f !== 'object' || Array.isArray(f) || typeof f.v !== 'number') return { erreur: `ligne ${i + 1} : fiche invalide` };
    for (const [k, re] of Object.entries(CHAINES))
      if (typeof f[k] !== 'string' || !re.test(f[k])) return { erreur: `ligne ${i + 1} : champ ${k}` };
    if (f.compte !== compte) return { erreur: `ligne ${i + 1} : compte différent de l'en-tête` };
    if (!propre(f)) return { erreur: `ligne ${i + 1} : contenu non autorisé` };
  }
  return { lignes: lignes.length };
}

function tailleDossier(d) {
  let t = 0;
  for (const e of fs.readdirSync(d, { withFileTypes: true, recursive: true }))
    if (e.isFile()) t += fs.statSync(path.join(e.parentPath ?? e.path, e.name)).size;
  return t;
}

export function creer({ donnees = './donnees', maintenant = () => new Date(), parHeure = PAR_HEURE } = {}) {
  const recus = path.join(donnees, 'recus');
  fs.mkdirSync(recus, { recursive: true });
  const fichierCles = path.join(donnees, 'cles.json');
  let cles = {};
  try { cles = JSON.parse(fs.readFileSync(fichierCles, 'utf8')); } catch {}
  const sel = crypto.randomBytes(16);
  const debit = new Map(); // empreinte -> [instants]

  const empreinte = (s) => crypto.createHash('sha256').update(sel).update(s).digest('hex').slice(0, 16);
  const empreinteCle = (c) => crypto.createHash('sha256').update(c).digest('hex');

  function autorise(ip) {
    const k = empreinte(ip);
    const t = maintenant().getTime();
    const l = (debit.get(k) || []).filter((x) => t - x < 3600000);
    if (l.length >= parHeure) { debit.set(k, l); return false; }
    l.push(t);
    debit.set(k, l);
    return true;
  }

  // Première clé vue pour un compte : elle lui reste attachée (personne d'autre n'écrit sous ce nom).
  function cleValide(compte, cle) {
    const h = empreinteCle(cle);
    if (!cles[compte]) {
      cles[compte] = h;
      const tmp = `${fichierCles}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(cles, null, 1));
      fs.renameSync(tmp, fichierCles);
      return true;
    }
    return crypto.timingSafeEqual(Buffer.from(cles[compte]), Buffer.from(h));
  }

  const repondre = (res, code, corps) => {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(corps));
  };

  const serveur = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/api/perfs/sante') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('ok');
    }
    if (req.method !== 'POST' || url.pathname !== '/api/perfs') { res.writeHead(404); return res.end(); }

    const compte = String(req.headers['x-compte'] || '');
    const cle = String(req.headers['x-cle'] || '');
    if (!COMPTE.test(compte) || !CLE.test(cle)) return repondre(res, 400, { erreur: 'en-têtes x-compte ou x-cle invalides' });
    // L'IP réelle n'est lue que si nginx (127.0.0.1) la transmet.
    const local = req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::ffff:127.0.0.1';
    const ip = (local && req.headers['x-real-ip']) || req.socket.remoteAddress || '';
    if (!autorise(String(ip))) return repondre(res, 429, { erreur: 'trop d’envois, réessayer dans une heure' });

    let taille = 0;
    let rejete = false;
    const morceaux = [];
    req.on('data', (m) => {
      taille += m.length;
      if (taille > TAILLE_MAX) {
        if (!rejete) { rejete = true; repondre(res, 413, { erreur: 'lot trop gros' }); }
        req.destroy();
        return;
      }
      morceaux.push(m);
    });
    req.on('end', () => {
      if (rejete) return;
      const v = verifierLot(Buffer.concat(morceaux).toString('utf8'), compte);
      if (v.erreur) return repondre(res, 400, v);
      if (!cleValide(compte, cle)) return repondre(res, 403, { erreur: 'ce nom de compte appartient à une autre installation' });
      if (tailleDossier(recus) + taille > DISQUE_MAX) return repondre(res, 507, { erreur: 'réception pleine' });
      const dossier = path.join(recus, compte);
      fs.mkdirSync(dossier, { recursive: true });
      const nom = `${maintenant().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString('hex')}.jsonl`;
      const tmp = path.join(dossier, `.${nom}.tmp`);
      fs.writeFileSync(tmp, Buffer.concat(morceaux));
      fs.renameSync(tmp, path.join(dossier, nom));
      repondre(res, 200, { recu: v.lignes });
    });
  });

  return { serveur };
}

// Lancé directement (node perfs.mjs) ou par pm2, dont le conteneur change argv[1] : pm_id le signale.
const principal = process.env.pm_id !== undefined
  || (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href);
if (principal) {
  const p = creer({ donnees: process.env.DONNEES || './donnees' });
  const arret = () => { p.serveur.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1000).unref(); };
  process.on('SIGTERM', arret);
  process.on('SIGINT', arret);
  p.serveur.listen(Number(process.env.PORT) || 8242, '127.0.0.1');
}
