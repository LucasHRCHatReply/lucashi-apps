// Âge d'un domaine par RDAP (registre officiel). Bootstrap IANA, puis serveur RDAP de l'extension ; AFNIC pour .fr.
// Les adresses interrogées viennent du fichier IANA, jamais du texte collé : seul le nom de domaine est envoyé.
const BOOTSTRAP = 'https://data.iana.org/rdap/dns.json';
const UN_JOUR = 24 * 3600 * 1000;

export function creerRdap({ chercher = fetch, maintenant = () => Date.now(), delai = 4000 } = {}) {
  let bootstrap = null;
  let bootstrapLe = 0;
  const cache = new Map(); // domaine -> { le, valeur }

  const json = async (url) => {
    const r = await chercher(url, { headers: { accept: 'application/rdap+json, application/json', 'user-agent': 'ArnaqueOuPas/1.0' }, signal: AbortSignal.timeout(delai), redirect: 'follow' });
    if (r.status === 404) return { introuvable: true };
    if (!r.ok) throw new Error(`rdap ${r.status}`);
    return r.json();
  };

  async function serveurs(tld) {
    if (!bootstrap || maintenant() - bootstrapLe > UN_JOUR) {
      try { bootstrap = (await json(BOOTSTRAP)).services; bootstrapLe = maintenant(); } catch { bootstrap = bootstrap ?? []; }
    }
    const s = bootstrap.find(([tlds]) => tlds.includes(tld));
    const liste = s ? s[1] : [];
    if (tld === 'fr' && !liste.length) return ['https://rdap.nic.fr/'];
    return liste.filter((u) => /^https:\/\//.test(u)).concat(liste.filter((u) => /^http:\/\//.test(u)).map((u) => u.replace(/^http:/, 'https:')));
  }

  /** { jours, creeLe } ou { introuvable: true } ou null si le registre ne répond pas. */
  async function age(domaine) {
    const d = domaine.toLowerCase();
    const c = cache.get(d);
    if (c && maintenant() - c.le < UN_JOUR) return c.valeur;
    const tld = d.split('.').pop();
    let valeur = null;
    try {
      for (const base of await serveurs(tld)) {
        try {
          const rep = await json(`${base.replace(/\/?$/, '/')}domain/${encodeURIComponent(d)}`);
          if (rep.introuvable) { valeur = { introuvable: true }; break; }
          const ev = (rep.events || []).find((e) => e.eventAction === 'registration');
          if (ev?.eventDate) {
            const t = Date.parse(ev.eventDate);
            if (Number.isFinite(t)) { valeur = { creeLe: new Date(t).toISOString(), jours: Math.max(0, Math.floor((maintenant() - t) / UN_JOUR)) }; break; }
          }
        } catch { /* serveur suivant */ }
      }
    } catch { valeur = null; }
    cache.set(d, { le: maintenant(), valeur });
    if (cache.size > 2000) cache.delete(cache.keys().next().value);
    return valeur;
  }
  return { age };
}
