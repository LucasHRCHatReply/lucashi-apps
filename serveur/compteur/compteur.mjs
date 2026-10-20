// Compteur d'audience sans cookie. Node 22, aucune dépendance.
// Ne lit, ne garde ni ne journalise IP, agent utilisateur, référent ou cookie.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PLAFOND = 20000;
const EVENEMENTS = ['vue', 'utilise'];

export function jourCourant(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function creer({ donnees = './donnees', jeton = '', maintenant = () => new Date() } = {}) {
  fs.mkdirSync(donnees, { recursive: true });
  const memoire = {}; // jour -> outil -> evenement -> total
  const sales = new Set();

  const fichier = (jour) => path.join(donnees, `${jour}.json`);

  function charger(jour) {
    if (memoire[jour]) return memoire[jour];
    try {
      memoire[jour] = JSON.parse(fs.readFileSync(fichier(jour), 'utf8'));
    } catch {
      memoire[jour] = {};
    }
    return memoire[jour];
  }

  function ecrire() {
    for (const jour of sales) {
      const cible = fichier(jour);
      const tmp = `${cible}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(memoire[jour]));
      fs.renameSync(tmp, cible);
    }
    sales.clear();
  }

  function incrementer(outil, evenement) {
    const jour = jourCourant(maintenant());
    const j = charger(jour);
    const o = (j[outil] ||= {});
    const total = (o.vue || 0) + (o.utilise || 0);
    if (total >= PLAFOND) return;
    o[evenement] = (o[evenement] || 0) + 1;
    sales.add(jour);
  }

  function lireBilan(jours) {
    const res = {};
    const base = maintenant();
    for (let i = 0; i < jours; i++) {
      const jour = jourCourant(new Date(base.getTime() - i * 86400000));
      const j = charger(jour);
      if (Object.keys(j).length) res[jour] = j;
    }
    return res;
  }

  function egal(a, b) {
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
  }

  const echapper = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function pageHtml(bilan, jours) {
    const cumul = {};
    let vues = 0;
    let util = 0;
    for (const j of Object.values(bilan))
      for (const [o, ev] of Object.entries(j)) {
        const c = (cumul[o] ||= { vue: 0, utilise: 0 });
        c.vue += ev.vue || 0;
        c.utilise += ev.utilise || 0;
        vues += ev.vue || 0;
        util += ev.utilise || 0;
      }
    const lignes = Object.entries(cumul)
      .sort((a, b) => b[1].vue + b[1].utilise - (a[1].vue + a[1].utilise))
      .map(([o, c]) => `<tr><td>${echapper(o)}</td><td>${c.vue}</td><td>${c.utilise}</td></tr>`)
      .join('');
    return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Bilan</title>
<style>body{font:16px system-ui;margin:2rem auto;max-width:36rem;padding:0 1rem}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #8884;padding:.4rem;text-align:left}</style>
<h1>Bilan sur ${jours} jours</h1><p><strong>${vues}</strong> vues, <strong>${util}</strong> utilisations</p>
<table><tr><th>Outil</th><th>Vues</th><th>Utilisations</th></tr>${lignes}</table></html>`;
  }

  const serveur = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/api/compte/sante') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('ok');
    }
    if (req.method === 'GET' && url.pathname === '/api/compte/bilan') {
      if (!jeton) { res.writeHead(404); return res.end(); }
      const fourni = url.searchParams.get('jeton') || '';
      if (!egal(fourni, jeton)) { res.writeHead(404); return res.end(); }
      const jours = Math.min(366, Math.max(1, parseInt(url.searchParams.get('jours') || '30', 10) || 30));
      const bilan = lireBilan(jours);
      if ((req.headers.accept || '').includes('text/html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(pageHtml(bilan, jours));
      }
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(bilan));
    }
    if (req.method === 'POST' && url.pathname === '/api/compte') {
      let taille = 0;
      const morceaux = [];
      let rejete = false;
      req.on('data', (m) => {
        taille += m.length;
        if (taille > 200) {
          if (!rejete) { rejete = true; res.writeHead(400); res.end(); }
          req.destroy();
          return;
        }
        morceaux.push(m);
      });
      req.on('end', () => {
        if (rejete) return;
        let v;
        try { v = JSON.parse(Buffer.concat(morceaux).toString('utf8')); } catch { v = null; }
        if (!v || typeof v.o !== 'string' || !/^[a-z0-9-]{1,40}$/.test(v.o) || !EVENEMENTS.includes(v.e)) {
          res.writeHead(400);
          return res.end();
        }
        incrementer(v.o, v.e);
        res.writeHead(204);
        res.end();
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  return { serveur, ecrire, incrementer, memoire };
}

// Lancé directement (node compteur.mjs) ou par pm2, dont le conteneur change argv[1] : pm_id le signale.
const principal = process.env.pm_id !== undefined
  || (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href);
if (principal) {
  const c = creer({
    donnees: process.env.DONNEES || './donnees',
    jeton: process.env.JETON_BILAN || '',
  });
  const minuteur = setInterval(() => c.ecrire(), 30000);
  const arret = () => {
    clearInterval(minuteur);
    c.ecrire();
    c.serveur.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.on('SIGTERM', arret);
  process.on('SIGINT', arret);
  c.serveur.listen(Number(process.env.PORT) || 8240, '127.0.0.1');
}
