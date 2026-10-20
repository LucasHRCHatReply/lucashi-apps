// Suivi sûr d'un lien : le serveur ne va que là où on le laisse aller.
// Règles : http/https seulement, ports 80 et 443, DNS résolu ici puis chaque IP vérifiée, connexion à l'IP vérifiée
// (aucune seconde résolution), 8 redirections au plus et chaque saut revérifié, 5 s par saut, 15 s en tout,
// 256 Kio lus au plus, ni cookie ni JavaScript.
import dns from 'node:dns';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';

export const LIMITES = { sauts: 8, delaiSaut: 5000, delaiTotal: 15000, octets: 256 * 1024 };
export const AGENT = 'ArnaqueOuPas/1.0 (verification de lien par un outil gratuit, sans JavaScript ni cookie)';

// ---------- IP interdites ----------

function octetsV4(ip) {
  const p = ip.split('.').map(Number);
  return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? p : null;
}
export function v4Interdite(ip) {
  const p = octetsV4(ip);
  if (!p) return true;
  const [a, b, c] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||        // 100.64/10 (CGNAT)
    (a === 169 && b === 254) ||                   // lien local, métadonnées des clouds
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // 192.0.0/24, 192.0.2/24
    (a === 198 && (b === 18 || b === 19)) ||     // 198.18/15 (bancs d'essai)
    (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) ||
    a >= 224                                      // multicast, réservé, diffusion
  );
}
/** Développe une IPv6 en huit mots de 16 bits ; null si ce n'est pas une IPv6 valide. */
function mots6(ip) {
  let s = ip.toLowerCase().replace(/%.*$/, '');
  if (!net.isIPv6(s)) return null;
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const p = octetsV4(v4[1]);
    if (!p) return null;
    s = s.slice(0, -v4[1].length) + ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16);
  }
  const [tete, queue] = s.split('::');
  const t = tete ? tete.split(':') : [];
  const q = queue === undefined ? [] : queue ? queue.split(':') : [];
  const trou = 8 - t.length - q.length;
  const tout = queue === undefined ? t : [...t, ...Array(Math.max(0, trou)).fill('0'), ...q];
  return tout.length === 8 ? tout.map((x) => parseInt(x || '0', 16)) : null;
}
export function v6Interdite(ip) {
  const m = mots6(ip);
  if (!m) return true;
  const tousNuls = (de, a) => m.slice(de, a).every((x) => x === 0);
  if (tousNuls(0, 8)) return true;                                  // ::
  if (tousNuls(0, 7) && m[7] === 1) return true;                    // ::1
  if (tousNuls(0, 5) && m[5] === 0xffff) return v4Interdite(`${m[6] >> 8}.${m[6] & 255}.${m[7] >> 8}.${m[7] & 255}`); // ::ffff:a.b.c.d (IPv4 mappée)
  if (tousNuls(0, 6)) return true;                                  // ::a.b.c.d (compatible IPv4, obsolète)
  if (m[0] === 0x64 && m[1] === 0xff9b) return true;               // 64:ff9b::/96 (NAT64) : traduit vers de l'IPv4 non vérifiée
  if ((m[0] & 0xfe00) === 0xfc00) return true;                      // fc00::/7
  if ((m[0] & 0xffc0) === 0xfe80) return true;                      // fe80::/10
  if ((m[0] & 0xffc0) === 0xfec0) return true;                      // fec0::/10 (obsolète)
  if ((m[0] & 0xff00) === 0xff00) return true;                      // multicast
  if (m[0] === 0x2001 && m[1] === 0x0db8) return true;              // documentation
  if (m[0] === 0x2002) return true;                                 // 6to4 : encapsule de l'IPv4 non vérifiée
  if (m[0] === 0x2001 && m[1] === 0) return true;                   // Teredo
  return false;
}
export function ipInterdite(ip) {
  const f = net.isIP(ip);
  if (f === 4) return v4Interdite(ip);
  if (f === 6) return v6Interdite(ip);
  return true;
}

// ---------- URL ----------

export class Refus extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** Vérifie la forme d'une URL (avant toute résolution). Renvoie l'objet URL. */
export function verifierUrl(texte) {
  let u;
  try { u = new URL(texte); } catch { throw new Refus('url', 'Adresse illisible.'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Refus('protocole', 'Seules les adresses http et https sont suivies.');
  const port = u.port === '' ? (u.protocol === 'https:' ? 443 : 80) : Number(u.port);
  if (port !== 80 && port !== 443) throw new Refus('port', 'Seuls les ports 80 et 443 sont suivis.');
  if (u.username || u.password) { u.username = ''; u.password = ''; } // jamais d'identifiants vers l'extérieur
  const hote = u.hostname.replace(/^\[|\]$/g, '');
  if (!hote) throw new Refus('url', 'Adresse sans nom de site.');
  if (net.isIP(hote) && ipInterdite(hote)) throw new Refus('ip', 'Adresse interne ou réservée : non suivie.');
  return u;
}

const resolutionNative = (hote) => dns.promises.lookup(hote, { all: true, verbatim: true });

/** Résout le nom, refuse si UNE des IP est interdite (un nom qui mène à du privé est refusé en bloc), renvoie la première IP sûre. */
export async function resoudreSur(hote, resolveur = resolutionNative) {
  const h = hote.replace(/^\[|\]$/g, '');
  if (net.isIP(h)) {
    if (ipInterdite(h)) throw new Refus('ip', 'Adresse interne ou réservée : non suivie.');
    return { address: h, family: net.isIP(h) };
  }
  let reponses;
  try { reponses = await resolveur(h); } catch { throw new Refus('dns', 'Ce nom de site n\'existe pas (ou ne répond pas).'); }
  if (!reponses?.length) throw new Refus('dns', 'Ce nom de site n\'existe pas (ou ne répond pas).');
  for (const r of reponses) if (ipInterdite(r.address)) throw new Refus('ip', 'Ce nom de site pointe vers une adresse interne ou réservée : non suivi.');
  return reponses[0];
}

// ---------- Un saut HTTP ----------

/** Une requête GET vers l'IP déjà vérifiée. Renvoie { statut, location, type, corps (≤ 256 Kio, texte) }. */
export function saut(u, ip, { delai = LIMITES.delaiSaut, octets = LIMITES.octets, signal } = {}) {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === 'https:' ? https : http;
    const hote = u.hostname.replace(/^\[|\]$/g, '');
    const req = lib.request({
      host: hote,
      port: u.port === '' ? (u.protocol === 'https:' ? 443 : 80) : Number(u.port),
      path: `${u.pathname}${u.search}`,
      method: 'GET',
      servername: net.isIP(hote) ? undefined : hote, // SNI et vérification du certificat sur le NOM, connexion sur l'IP
      agent: false,
      // aucune seconde résolution : la socket se connecte à l'IP déjà vérifiée
      lookup: (_h, opts, cb) => (opts && opts.all ? cb(null, [{ address: ip.address, family: ip.family }]) : cb(null, ip.address, ip.family)),
      headers: { 'user-agent': AGENT, accept: 'text/html,*/*;q=0.5', 'accept-encoding': 'identity', 'accept-language': 'fr', connection: 'close', host: u.host },
      timeout: delai,
      signal,
    }, (res) => {
      const type = String(res.headers['content-type'] || '');
      const morceaux = [];
      let n = 0, fini = false;
      const clore = (extra = {}) => {
        if (fini) return; fini = true;
        resolve({ statut: res.statusCode, location: res.headers.location || null, type, corps: Buffer.concat(morceaux).toString('utf8'), ...extra });
        res.destroy();
      };
      // les redirections HTTP et les pages non HTML n'ont pas besoin de corps
      if ((res.statusCode >= 300 && res.statusCode < 400) || !/html|text|xml|^$/i.test(type)) return clore();
      res.on('data', (m) => {
        n += m.length;
        morceaux.push(n > octets ? m.subarray(0, m.length - (n - octets)) : m);
        if (n >= octets) clore({ tronque: true });
      });
      res.on('end', () => clore());
      res.on('error', () => clore());
    });
    req.on('timeout', () => req.destroy(new Refus('delai', 'Le site met trop de temps à répondre.')));
    req.on('error', (e) => reject(e instanceof Refus ? e : classer(e)));
    req.end();
  });
}
function classer(e) {
  const c = e?.code || '';
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS|HOSTNAME_MISMATCH|EPROTO|WRONG_VERSION/i.test(c + (e.message || ''))) return new Refus('tls', 'Le certificat de sécurité du site est invalide.');
  if (c === 'ABORT_ERR' || e?.name === 'AbortError') return new Refus('delai', 'Le suivi du lien a pris trop de temps.');
  if (c === 'ECONNREFUSED' || c === 'ECONNRESET' || c === 'EHOSTUNREACH' || c === 'ENETUNREACH' || c === 'ETIMEDOUT') return new Refus('connexion', 'Le site ne répond pas.');
  return new Refus('connexion', 'Le site n\'a pas pu être joint.');
}

// ---------- Redirections « dans la page » : <meta refresh> et location = '...' simples ----------

export function redirectionDansPage(html, base) {
  if (!html) return null;
  const tete = html.slice(0, 262144);
  const metas = tete.match(/<meta\b[^>]*>/gi) || [];
  for (const m of metas) {
    if (!/http-equiv\s*=\s*["']?refresh/i.test(m)) continue;
    const c = m.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const val = c && (c[1] ?? c[2] ?? c[3]);
    const u = val && val.match(/\d*\s*[;,]\s*(?:url\s*=\s*)?["']?\s*([^"'\s>][^"']*?)["']?\s*$/i);
    if (u) { try { return new URL(u[1].trim(), base).href; } catch { /* suivant */ } }
  }
  // location = "…", location.href = "…", location.replace("…"), window.location = '…' (littéraux seulement, sans exécuter quoi que ce soit)
  const js = tete.match(/(?:window\.|top\.|self\.|document\.)?location(?:\.href)?\s*=\s*["']([^"'\s]{4,})["']|location\.(?:replace|assign)\(\s*["']([^"'\s]{4,})["']\s*\)/i);
  const cible = js && (js[1] ?? js[2]);
  if (cible) { try { return new URL(cible, base).href; } catch { /* rien */ } }
  return null;
}

/**
 * Suit un lien jusqu'au bout, sans JavaScript. Renvoie { chaine: [{ url, statut, via }], finale: URL | null, erreur?: {code, message} }.
 * `deps` ne sert qu'aux tests : resolveur (nom → [{address, family}]), transport (remplace saut()).
 */
export async function suivre(depart, deps = {}) {
  const { resolveur = resolutionNative, transport = saut, limites = LIMITES } = deps;
  const chaine = [];
  const debut = Date.now();
  const ctl = new AbortController();
  const minuteur = setTimeout(() => ctl.abort(new Refus('delai', 'Le suivi du lien a pris trop de temps.')), limites.delaiTotal);
  let courante = depart;
  try {
    for (let i = 0; i <= limites.sauts; i++) {
      const u = verifierUrl(courante);
      const ip = await resoudreSur(u.hostname, resolveur);
      if (Date.now() - debut > limites.delaiTotal) throw new Refus('delai', 'Le suivi du lien a pris trop de temps.');
      let rep;
      try {
        rep = await transport(u, ip, { delai: limites.delaiSaut, octets: limites.octets, signal: ctl.signal });
      } catch (e) {
        if (ctl.signal.aborted) throw ctl.signal.reason instanceof Refus ? ctl.signal.reason : new Refus('delai', 'Le suivi du lien a pris trop de temps.');
        throw e;
      }
      const noeud = { url: u.href, statut: rep.statut };
      chaine.push(noeud);
      let suite = null;
      if (rep.statut >= 300 && rep.statut < 400 && rep.location) {
        try { suite = new URL(rep.location, u).href; noeud.via = 'http'; } catch { suite = null; }
      } else if (rep.statut >= 200 && rep.statut < 300) {
        suite = redirectionDansPage(rep.corps, u.href);
        if (suite) noeud.via = 'page';
      }
      if (!suite || suite === u.href) return { chaine, finale: u };
      if (i === limites.sauts) throw new Refus('sauts', `Plus de ${limites.sauts} redirections : le suivi s'arrête.`);
      courante = suite;
    }
    return { chaine, finale: null };
  } catch (e) {
    const err = e instanceof Refus ? e : new Refus('connexion', 'Le site n\'a pas pu être joint.');
    return { chaine, finale: null, erreur: { code: err.code, message: err.message } };
  } finally {
    clearTimeout(minuteur);
  }
}
