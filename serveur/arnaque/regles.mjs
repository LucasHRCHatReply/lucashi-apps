// Règles d'analyse « Arnaque ou pas ? » : logique pure, sans réseau, sans dépendance.
// Le même fichier sert le serveur (Node 22) et la page (premier avis immédiat dans le navigateur).

// ---------- Domaines ----------

// Suffixes à deux niveaux (liste courte des plus courants) et services qui hébergent n'importe qui :
// pour eux, l'âge du domaine ne dit rien, le sous-domaine est le vrai nom.
const SUFFIXES_DOUBLES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.br', 'com.au', 'co.jp', 'co.in', 'com.cn', 'com.tr', 'com.mx', 'co.za',
  'gouv.fr', 'asso.fr', 'com.fr', 'tm.fr', 'gouv.ci', 'com.ar', 'com.co', 'co.nz', 'com.pl', 'com.ua', 'co.id',
]);
export const HEBERGEURS_PUBLICS = new Set([
  'github.io', 'gitlab.io', 'webflow.io', 'pages.dev', 'vercel.app', 'netlify.app', 'workers.dev', 'web.app',
  'firebaseapp.com', 'blogspot.com', 'weebly.com', 'wixsite.com', 'herokuapp.com', 'glitch.me', 'repl.co',
  'tw1.ru', 'ukit.me', 'godaddysites.com', 'site123.me', 'framer.app', 'carrd.co', 'myshopify.com', 'bubbleapps.io',
  'surge.sh', 'onrender.com', 'fly.dev', 'azurewebsites.net', 'cloudfront.net', 'storage.googleapis.com', 'r2.dev',
  'notion.site', 'canva.site', 'my.canva.site', 'sites.google.com', 'forms.gle', 'duckdns.org', 'ngrok.io', 'ngrok-free.app',
]);
export const RACCOURCISSEURS = new Set([
  'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'v.gd', 'rb.gy', 'ow.ly', 'buff.ly', 's.id',
  'shorturl.at', 'tiny.cc', 't.ly', 'urlz.fr', 'lnkd.in', 'goo.gl', 'rebrand.ly', 'bit.do', 'qrco.de', 'tr.ee',
  'l.ead.me', 'short.io', 'soo.gd', 'clck.ru', 'urlr.me', 'x.co', 'dlvr.it', 'wp.me', 'fb.me', 'amzn.to', 'youtu.be',
  'linktr.ee', 'smarturl.it', 'adf.ly', 'lc.cx', 'u.to', 'shorturl.asia', 'shorte.st', 'gg.gg', '1url.com', 'chilp.it',
]);
// Extensions que les arnaques emploient beaucoup (indice faible : des sites honnêtes les utilisent aussi).
const TLD_BAVARDS = new Set(['xyz', 'top', 'icu', 'cyou', 'buzz', 'click', 'bond', 'sbs', 'cfd', 'rest', 'monster', 'vip', 'cam', 'tk', 'ml', 'ga', 'cf', 'gq', 'lol', 'quest', 'autos', 'help', 'support', 'live', 'life', 'work', 'world', 'today', 'site', 'online', 'shop', 'store', 'link', 'ru', 'cn']);
const TLD_CONNUS = new Set(['com', 'fr', 'net', 'org', 'info', 'eu', 'de', 'uk', 'es', 'it', 'nl', 'be', 'ch', 'ca', 'us', 'io', 'co', 'me', 'tv', 'cc', 'ly', 'app', 'dev', 'page', 'pw', 'su', 'in', 'br', 'pl', 'ua', 'tr', 'mx', 'ar', 'jp', 'kr', 'id', 'vn', 'ng', 'ci', 'sn', 'ma', 'dz', 'tn', 'biz', 'name', 'pro', 'mobi', 'asia', 'bank', 'gouv', 'paris', 'bzh', ...TLD_BAVARDS]);

/** Découpe un nom d'hôte : { hote, suffixe, domaine (nom enregistrable), nom (partie avant le suffixe), sous (sous-domaines) }. */
export function decouperDomaine(hote) {
  const h = String(hote).toLowerCase().replace(/\.$/, '');
  const labels = h.split('.');
  if (labels.length === 1) return { hote: h, suffixe: h, domaine: h, nom: h, sous: [] };
  let n = 1;
  const deux = labels.slice(-2).join('.');
  // com.ml, net.br, gov.xx… : un second niveau générique sous une extension de pays est un suffixe double, même hors liste
  const generique = /^(com|net|org|co|gov|gouv|edu|ac)$/.test(labels[labels.length - 2]) && labels[labels.length - 1].length === 2;
  if (labels.length >= 3 && (SUFFIXES_DOUBLES.has(deux) || HEBERGEURS_PUBLICS.has(deux) || generique)) n = 2;
  for (const hp of HEBERGEURS_PUBLICS) if (hp.split('.').length === 3 && h.endsWith(`.${hp}`)) n = 3;
  if (labels.length <= n) return { hote: h, suffixe: h, domaine: h, nom: labels[0], sous: [] };
  const domaine = labels.slice(-(n + 1)).join('.');
  return { hote: h, suffixe: labels.slice(-n).join('.'), domaine, nom: labels[labels.length - n - 1], sous: labels.slice(0, -(n + 1)) };
}
export const estHebergeurPublic = (d) => [...HEBERGEURS_PUBLICS].some((hp) => d === hp || d.endsWith(`.${hp}`));

// Décodage punycode (RFC 3492), pour lire « xn--... » sans dépendance.
export function punycodeVersUnicode(entree) {
  const base = 36, tmin = 1, tmax = 26, skew = 38, damp = 700;
  const adapt = (delta, nb, premier) => {
    delta = premier ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / nb);
    let k = 0;
    while (delta > ((base - tmin) * tmax) >> 1) { delta = Math.floor(delta / (base - tmin)); k += base; }
    return k + Math.floor(((base - tmin + 1) * delta) / (delta + skew));
  };
  const sortie = [];
  let b = entree.lastIndexOf('-');
  if (b < 0) b = 0;
  for (let j = 0; j < b; j++) sortie.push(entree.charCodeAt(j));
  let i = 0, n = 128, biais = 72;
  for (let idx = b > 0 ? b + 1 : 0; idx < entree.length;) {
    const oldi = i;
    for (let w = 1, k = base; ; k += base) {
      if (idx >= entree.length) throw new Error('punycode invalide');
      const c = entree.charCodeAt(idx++);
      const digit = c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : base;
      if (digit >= base) throw new Error('punycode invalide');
      i += digit * w;
      const t = k <= biais ? tmin : k >= biais + tmax ? tmax : k - biais;
      if (digit < t) break;
      w *= base - t;
    }
    biais = adapt(i - oldi, sortie.length + 1, oldi === 0);
    n += Math.floor(i / (sortie.length + 1));
    i %= sortie.length + 1;
    sortie.splice(i++, 0, n);
  }
  return String.fromCodePoint(...sortie);
}
export function hoteUnicode(hote) {
  try { return hote.split('.').map((l) => (l.startsWith('xn--') ? punycodeVersUnicode(l.slice(4)) : l)).join('.'); } catch { return hote; }
}

// Lettres d'autres alphabets qui ressemblent à des lettres latines.
const HOMOGLYPHES = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ɡ: 'g', ո: 'n', ս: 'u', ν: 'v', ο: 'o', ρ: 'p', α: 'a', ι: 'i', κ: 'k', τ: 't', ı: 'i', ɩ: 'i', ⅼ: 'l', ǀ: 'l', һ: 'h', ь: 'b', в: 'b', м: 'm', н: 'h', т: 't', к: 'k', ᴍ: 'm', ɑ: 'a', ꓲ: 'l',
};
/** « Squelette » : ce que l'œil lit. Accents retirés, homoglyphes et chiffres trompeurs ramenés à la lettre qu'ils imitent. */
export function squelette(s) {
  let r = s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  r = [...r].map((c) => HOMOGLYPHES[c] ?? c).join('');
  return r.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/[1il|]/g, 'l').replace(/0/g, 'o').replace(/5/g, 's').replace(/3/g, 'e');
}
export function distance(a, b) {
  const m = a.length, n = b.length;
  let prec = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prec = cur;
  }
  return prec[n];
}

// ---------- Marques ----------
// fortes : un domaine qui les contient sans être officiel est une imitation ; courantes : mots du quotidien, signal moyen ;
// exactes : jetons courts qui ne comptent que s'ils forment un mot entier du domaine (« caf », « lcl »).
const amazonTld = ['com', 'fr', 'de', 'co.uk', 'es', 'it', 'nl', 'be', 'ca', 'com.be', 'pl', 'se', 'ae', 'com.au', 'com.br', 'in', 'co.jp'];
export const MARQUES = [
  { id: 'laposte', nom: 'La Poste / Colissimo', officiels: ['laposte.fr', 'colissimo.fr', 'laposte.net', 'lapostemobile.fr', 'laposte.com'], fortes: ['laposte', 'colissimo'], textes: [/la\s?poste/i, /colissimo/i] },
  { id: 'chronopost', nom: 'Chronopost', officiels: ['chronopost.fr', 'chronopost.com'], fortes: ['chronopost'], textes: [/chronopost/i] },
  { id: 'ameli', nom: 'Assurance maladie (Ameli)', officiels: ['ameli.fr', 'assurance-maladie.fr', 'mesdroitssociaux.gouv.fr'], fortes: ['ameli', 'assurancemaladie'], textes: [/ameli/i, /assurance\s+maladie/i, /carte\s+vitale/i] },
  { id: 'impots', nom: 'l\'administration fiscale', officiels: ['impots.gouv.fr', 'economie.gouv.fr', 'service-public.fr', 'franceconnect.gouv.fr'], gouv: true, fortes: ['dgfip', 'financespubliques'], courantes: ['impots', 'impot', 'remboursementimpot'], textes: [/imp[oô]ts?/i, /dgfip/i, /finances\s+publiques/i, /direction g[ée]n[ée]rale des finances/i] },
  { id: 'antai', nom: 'ANTAI (amendes)', officiels: ['antai.gouv.fr', 'amendes.gouv.fr'], gouv: true, fortes: ['antai'], courantes: ['amende', 'amendes', 'pvamende'], textes: [/antai/i, /amende/i, /\bpv\b/i, /contravention/i] },
  { id: 'caf', nom: 'CAF', officiels: ['caf.fr', 'mesdroitssociaux.gouv.fr', 'msa.fr'], gouv: true, exactes: ['caf'], courantes: ['allocationsfamiliales'], textes: [/\bcaf\b/i, /allocations?\s+familiales?/i, /\bapl\b/i, /prime d['’]activit[ée]/i] },
  { id: 'francetravail', nom: 'France Travail', officiels: ['francetravail.fr', 'pole-emploi.fr', 'francetravail.org'], fortes: ['francetravail', 'poleemploi'], textes: [/france\s+travail/i, /p[oô]le\s+emploi/i] },
  { id: 'bnp', nom: 'BNP Paribas', officiels: ['bnpparibas.com', 'bnpparibas.net', 'bnpparibas.fr', 'mabanque.bnpparibas', 'bnpparibas'], fortes: ['bnpparibas'], exactes: ['bnp'], textes: [/bnp(\s+paribas)?/i] },
  { id: 'sg', nom: 'Société Générale', officiels: ['societegenerale.fr', 'societegenerale.com', 'sg.fr'], fortes: ['societegenerale', 'socgen'], textes: [/soci[ée]t[ée]\s+g[ée]n[ée]rale/i] },
  { id: 'ca', nom: 'Crédit Agricole', officiels: ['credit-agricole.fr', 'credit-agricole.com'], regexOfficiel: /^ca-[a-z0-9-]+\.fr$/, fortes: ['creditagricole'], textes: [/cr[ée]dit\s+agricole/i] },
  { id: 'lcl', nom: 'LCL', officiels: ['lcl.fr', 'lcl.com'], exactes: ['lcl'], textes: [/\blcl\b/i] },
  { id: 'boursorama', nom: 'Boursorama / BoursoBank', officiels: ['boursorama.com', 'boursorama.fr', 'boursorama-banque.com', 'boursobank.com'], fortes: ['boursorama', 'boursobank'], textes: [/boursorama/i, /bourso\s?bank/i] },
  { id: 'lbp', nom: 'La Banque Postale', officiels: ['labanquepostale.fr', 'labanquepostale.com'], fortes: ['labanquepostale'], textes: [/banque\s+postale/i] },
  { id: 'cm', nom: 'Crédit Mutuel / CIC', officiels: ['creditmutuel.fr', 'credit-mutuel.fr', 'creditmutuel.com', 'cmb.fr', 'cic.fr', 'cic.com'], fortes: ['creditmutuel'], exactes: ['cic'], textes: [/cr[ée]dit\s+mutuel/i, /\bcic\b/i] },
  { id: 'netflix', nom: 'Netflix', officiels: ['netflix.com', 'netflix.net', 'nflxext.com'], fortes: ['netflix'], textes: [/netflix/i] },
  { id: 'amazon', nom: 'Amazon', officiels: ['amazonaws.com', 'amazon.jobs', 'amzn.to', 'amzn.eu', ...amazonTld.map((t) => `amazon.${t}`)], fortes: ['amazon'], textes: [/amazon/i] },
  { id: 'vinted', nom: 'Vinted', officiels: ['vinted.fr', 'vinted.com', 'vinted.de', 'vinted.es', 'vinted.it', 'vinted.nl', 'vinted.be', 'vinted.pl', 'vinted.co.uk'], fortes: ['vinted'], textes: [/vinted/i] },
  { id: 'leboncoin', nom: 'Leboncoin', officiels: ['leboncoin.fr'], fortes: ['leboncoin'], textes: [/leboncoin|le\s+bon\s+coin/i] },
  { id: 'orange', nom: 'Orange', officiels: ['orange.fr', 'orange.com', 'orange-business.com', 'orange.net', 'orange.be'], courantes: ['orange'], textes: [/\borange\b/i] },
  { id: 'sfr', nom: 'SFR', officiels: ['sfr.fr', 'red-by-sfr.fr', 'sfrbusiness.fr', 'sfr.com', 'altice.net'], exactes: ['sfr'], textes: [/\bsfr\b/i] },
  { id: 'free', nom: 'Free', officiels: ['free.fr', 'free-mobile.fr', 'freebox.fr', 'free.com'], fortes: ['freemobile'], exactes: ['free'], textes: [/\bfree(box|\s+mobile)?\b/i] },
  { id: 'bouygues', nom: 'Bouygues Telecom', officiels: ['bouyguestelecom.fr', 'bouygues.com', 'bouygues-telecom.fr', 'bouygues-immobilier.com', 'bouyguesimmobilier.com'], fortes: ['bouygues', 'bouyguestelecom'], textes: [/bouygues/i] },
];

const sansTiret = (s) => s.replace(/-/g, '');
function estOfficiel(m, d) {
  if (m.officiels.some((o) => d === o || d.endsWith(`.${o}`))) return true;
  if (m.regexOfficiel && m.regexOfficiel.test(d)) return true;
  return false;
}
const estGouv = (d) => d.endsWith('.gouv.fr') || d === 'gouv.fr';
/** La marque dont ce domaine est un site officiel, ou null. */
export function marqueOfficielle(domaine) {
  const d = decouperDomaine(domaine).domaine;
  const h = domaine.toLowerCase();
  for (const m of MARQUES) if (estOfficiel(m, h) || estOfficiel(m, d)) return m;
  if (estGouv(h)) return MARQUES.find((m) => m.gouv && (m.id === 'impots')) ?? null; // un site de l'État
  return null;
}
/** Marques citées dans le texte du message. */
export function marquesCitees(texte) {
  return MARQUES.filter((m) => m.textes.some((r) => r.test(texte)));
}
const jetons = (nom) => nom.split('-').filter(Boolean);

/** Raisons d'imitation de marque pour un nom d'hôte (celui qu'on lit, pas celui où l'on atterrit). */
export function imitations(hote) {
  const hu = hoteUnicode(hote);
  const sorties = [];
  const variantes = [...new Set([hote.toLowerCase(), hu])];
  const vus = new Set();
  for (const v of variantes) {
    const { domaine, nom, sous, suffixe } = decouperDomaine(v);
    if (marqueOfficielle(domaine)) continue;
    if (marqueOfficielle(v)) continue;
    const gouvDomaine = estGouv(domaine);
    if (gouvDomaine) continue;
    const nomSq = squelette(sansTiret(nom));
    const sousSq = squelette(sansTiret(sous.join('')));
    for (const m of MARQUES) {
      if (vus.has(m.id)) continue;
      const fortes = (m.fortes ?? []).map((c) => squelette(c));
      const courantes = (m.courantes ?? []).map((c) => squelette(c));
      const exactes = m.exactes ?? [];
      const nomOfficiel = m.officiels.map((o) => decouperDomaine(o).nom);
      const marque = (texte, niveau) => { vus.add(m.id); sorties.push({ code: 'marque', niveau, marque: m.id, texte }); };
      // 1. la marque dans un sous-domaine : laposte.fr.suivi-colis.com
      const dansSous = sous.some((s) => fortes.some((c) => squelette(sansTiret(s)).includes(c)) || (exactes.includes(s) && m.id !== 'free') || nomOfficiel.some((n) => n.length >= 5 && squelette(s) === squelette(n)));
      if (dansSous || (sousSq && fortes.some((c) => sousSq.includes(c)))) {
        marque(`Le nom ${m.nom} apparaît au début de l'adresse, mais le vrai site est ${domaine} : ce n'est pas un site de ${m.nom}.`, 'fort');
        continue;
      }
      // 2. le nom contient la marque : laposte-suivi.com, ameli-remboursement.fr
      if (fortes.some((c) => nomSq.includes(c))) {
        marque(`Le domaine ${domaine} reprend le nom ${m.nom}, mais ce n'est pas un domaine de ${m.nom} (${m.officiels.slice(0, 3).join(', ')}…).`, 'fort');
        continue;
      }
      if (exactes.some((c) => jetons(nom).includes(c)) && nom !== exactes.find((c) => jetons(nom).includes(c)) || exactes.includes(nom)) {
        marque(`Le domaine ${domaine} emploie le nom ${m.nom} sans être un domaine de ${m.nom}.`, m.id === 'free' ? 'moyen' : 'fort');
        continue;
      }
      // 3. fautes de frappe et lettres déguisées : l4poste.fr, iaposte.fr, ɑmeli.fr
      const proche = nomOfficiel.find((n) => {
        if (n.length < 4) return false;
        const a = squelette(sansTiret(n));
        if (a === nomSq) return true;
        const d = distance(a, nomSq);
        return d >= 1 && d <= (a.length >= 9 ? 2 : 1) && Math.abs(a.length - nomSq.length) <= 2;
      });
      if (proche) {
        marque(`Le domaine ${domaine} ressemble à « ${proche} » (${m.nom}) à une lettre près : c'est une imitation.`, 'fort');
        continue;
      }
      // 4. même nom, autre extension : laposte.xyz
      if (nomOfficiel.some((n) => n === nom) && !m.officiels.includes(domaine)) {
        marque(`Le nom « ${nom} » est celui de ${m.nom}, mais avec l'extension .${suffixe} que ${m.nom} n'utilise pas.`, 'fort');
        continue;
      }
      // 5. mots courants (impôts, amende, orange) dans le domaine
      if (courantes.some((c) => nomSq.includes(c)) && !estHebergeurPublic(domaine)) {
        marque(`Le domaine ${domaine} reprend un mot lié à ${m.nom} sans être un site officiel.`, 'moyen');
      } else if (courantes.some((c) => sousSq.includes(c))) {
        marque(`Le début de l'adresse évoque ${m.nom}, mais le vrai site est ${domaine}.`, 'moyen');
      }
    }
  }
  return sorties;
}

// ---------- Liens dans le texte ----------

/** Libellé court d'un lien pour l'affichage (sans http, sans /). */
export const abreger = (u) => String(u).replace(/^https?:\/\//i, '').replace(/\/$/, '');

const RE_HOTE = '(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})';
const RE_LIEN = new RegExp(`(?:https?:\\/\\/[^\\s<>"'«»]+)|(?:(?<![@\\w.-])(?:www\\.)?${RE_HOTE}(?::\\d{2,5})?(?:[\\/?#][^\\s<>"'«»]*)?(?![\\w@-]))`, 'giu');

/**
 * Liens trouvés dans le texte, avec ou sans http, raccourcis compris. Les adresses e-mail ne sont pas des liens
 * (leur domaine est renvoyé à part dans `adresses`).
 */
export function extraireLiens(texte, max = 8) {
  const liens = [];
  const vus = new Set();
  const nettoyer = (s) => s.replace(/[.,;:!?)\]}»]+$/u, '');
  for (const m of texte.matchAll(RE_LIEN)) {
    let brut = nettoyer(m[0]);
    const explicite = /^https?:\/\//i.test(brut);
    if (!explicite) {
      const tld = brut.replace(/[/?#:].*$/, '').split('.').pop().toLowerCase();
      if (!TLD_CONNUS.has(tld) && !tld.startsWith('xn--')) continue; // « fin.Merci » n'est pas une adresse
      if (/^\d+(\.\d+)+$/.test(brut)) continue;
    }
    let url;
    try { url = new URL(explicite ? brut : `https://${brut}`); } catch { continue; }
    if (!/^https?:$/.test(url.protocol)) continue;
    const cle = url.href;
    if (vus.has(cle)) continue;
    vus.add(cle);
    liens.push({ brut, url: url.href, hote: url.hostname.replace(/^\[|\]$/g, '').toLowerCase(), explicite, arobase: url.username !== '' ? decodeURIComponent(url.username) : '' });
    if (liens.length >= max) break;
  }
  const adresses = [...new Set([...texte.matchAll(/[\w.+-]+@((?:[a-z0-9-]+\.)+[a-z]{2,24})/gi)].map((m) => m[1].toLowerCase()))].slice(0, 4);
  return { liens, adresses };
}

// ---------- Indices du texte ----------

const NEG = /\b(ne|n['’])\s*(?:\w+\s+){0,3}(?:jamais|pas|aucun)|jamais|ne (?:le )?(?:communiquez|partagez|donnez|transmettez)/i;
const INDICES = [
  { code: 'urgence', poids: 1, re: /\b(urgent|urgence|imm[ée]diatement|sous\s+(?:\d+|vingt-quatre|quarante-huit)\s*(?:h|heures?|jours?)|dans\s+les\s+(?:24|48)\s*h|dernier(?:e)?\s+(?:rappel|avis|d[ée]lai|chance)|sans\s+d[ée]lai|d[èe]s\s+maintenant|avant\s+(?:ce soir|demain|minuit))/i, texte: 'Le message presse : une échéance courte pousse à agir sans réfléchir.' },
  { code: 'petit-montant', poids: 1, re: /(?:(?:frais|r[ée]gulari|payer|paiement|r[èe]glement|livraison|douane|redevance|rembours|r[ée]gler)[^.\n]{0,60}\b\d{1,2}(?:[.,]\d{1,2})?\s?(?:€|eur|euros?)|\b\d{1,2}(?:[.,]\d{1,2})?\s?(?:€|eur|euros?)[^.\n]{0,60}(?:frais|r[ée]gulari|paiement|r[èe]glement|livraison|douane|redevance))/i, texte: 'Il réclame un petit montant (quelques euros) : le piège classique pour récupérer une carte bancaire.' },
  { code: 'colis-attente', poids: 1, re: /colis[^.\n]{0,60}(?:attente|bloqu[ée]|suspendu|retenu|impossible|[ée]chec|souffrance|non\s+livr[ée])|livraison[^.\n]{0,40}(?:[ée]chou[ée]e|impossible|suspendue|en\s+attente)|adresse\s+(?:incompl[èe]te|incorrecte|erron[ée]e)/i, texte: 'Il annonce un colis en attente ou bloqué : le prétexte le plus répandu des faux SMS.' },
  { code: 'surtaxe', poids: 1, re: /\b0\s?8[129]\d(?:[\s.]?\d{2}){3}\b/, texte: 'Il donne un numéro à tarification spéciale (08 1x, 08 2x ou 08 9x), souvent surtaxé.' },
  { code: 'demande-code', poids: 2, re: /(?:communiqu|envoy|saisi|transmet|donn|indiqu|entr|renseign|confirm|valid|fourni|r[ée]pond)\w*[\s-]+(?:[\wéèêàç']+[\s-]+){0,3}(?:code|mot\s+de\s+passe|identifiants?|num[ée]ro\s+de\s+carte|coordonn[ée]es\s+bancaires|cvv|cryptogramme)/i, texte: 'Il demande un code, un mot de passe ou des données de carte : aucun organisme sérieux ne les réclame par message.', garde: (t, i) => !NEG.test(t.slice(Math.max(0, i - 40), i + 20)) },
  { code: 'menace', poids: 1, re: /(?:compte|carte|acc[èe]s|abonnement|droits?|dossier)[^.\n]{0,40}(?:suspendu|bloqu[ée]|d[ée]sactiv[ée]|cl[ôo]tur[ée]|r[ée]sili[ée]|expir[ée]|restreint|supprim[ée])|poursuites|huissier|major[ée]e?|sera\s+(?:suspendu|bloqu[ée]|r[ée]sili[ée])|sanction/i, texte: 'Il menace d\'un blocage, d\'une suspension ou d\'une majoration pour faire peur.' },
  { code: 'remboursement', poids: 1, re: /rembours|trop[-\s]per[çc]u|vous\s+avez\s+gagn[ée]|f[ée]licitations|cadeau|prime\s+exceptionnelle|vous\s+[êe]tes\s+[ée]ligible/i, texte: 'Il promet un remboursement ou un gain : l\'appât inverse de la menace.' },
  { code: 'infos', poids: 1, re: /mett(?:ez|re)\s+[àa]\s+jour\s+vos\s+(?:informations|coordonn[ée]es|donn[ée]es)|v[ée]rifi(?:ez|er)\s+votre\s+(?:identit[ée]|compte)|confirm(?:ez|er)\s+votre\s+identit[ée]|valid(?:ez|er)\s+votre\s+(?:compte|identit[ée]|carte)/i, texte: 'Il demande de « mettre à jour » ou de « vérifier » vos informations.' },
];
/** Indices du texte : [{ code, poids, texte }]. En complément, jamais seuls pour conclure à une arnaque. */
export function indicesTexte(texte) {
  const res = [];
  for (const ind of INDICES) {
    const re = new RegExp(ind.re.source, ind.re.flags.includes('g') ? ind.re.flags : `${ind.re.flags}g`);
    for (const m of texte.matchAll(re)) {
      if (ind.garde && !ind.garde(texte, m.index)) continue;
      res.push({ code: ind.code, poids: ind.poids, texte: ind.texte });
      break;
    }
  }
  return res;
}

// ---------- Raisons pour un lien ----------

const jours = (n) => (n <= 0 ? 'aujourd\'hui' : n === 1 ? 'hier' : `il y a ${n} jours`);
function dureeFr(j) {
  if (j < 60) return `${j} jour${j > 1 ? 's' : ''}`;
  if (j < 730) return `${Math.round(j / 30.4)} mois`;
  return `${Math.floor(j / 365)} ans`;
}

/**
 * Raisons tirées d'un lien. `lien` = { saisi, hote, arobase?, chaine?, finale?, age?, ageIndispo?, liste?, erreur? }
 * Dans le navigateur, seuls `saisi` et `hote` existent ; le serveur ajoute le reste.
 * Renvoie [{ code, niveau: 'fort'|'moyen'|'faible'|'ok'|'info', texte }].
 */
export function raisonsLien(lien, { marques = [] } = {}) {
  const r = [];
  const hote = lien.hote;
  const dom = decouperDomaine(hote);
  const affiche = abreger(lien.saisi ?? hote);
  const finalHote = lien.finale?.hote ?? null;
  const domFinal = finalHote ? decouperDomaine(finalHote) : null;
  const typeRaccourci = RACCOURCISSEURS.has(dom.domaine);
  // un raccourci dont la destination n'a pas pu être lue reste un raccourci : on ne juge pas son « domaine »
  const raccourci = typeRaccourci && (!domFinal || RACCOURCISSEURS.has(domFinal.domaine));

  if (lien.liste) {
    r.push({ code: 'liste', niveau: lien.liste.exact ? 'fort' : 'moyen', texte: `${lien.liste.exact ? 'Cette adresse' : 'Ce site'} figure dans la liste ${lien.liste.source}${lien.liste.exact ? '' : ' (une autre page du même site)'}.` });
  }
  if (lien.arobase) {
    const trompeuse = /\./.test(lien.arobase);
    r.push({ code: 'arobase', niveau: trompeuse ? 'fort' : 'moyen', texte: `Le lien cache sa vraie destination : tout ce qui précède l'arobase (« ${lien.arobase} ») est ignoré, le site réel est ${hote}.` });
  }
  if (/^\d+(\.\d+){3}$/.test(hote) || hote.includes(':')) {
    r.push({ code: 'ip', niveau: 'moyen', texte: `Le lien vise une adresse numérique (${hote}) et non un nom de site : aucune entreprise sérieuse n'envoie cela.` });
  }
  if (typeRaccourci) {
    r.push({ code: 'raccourci', niveau: 'faible', texte: raccourci
      ? `Lien raccourci (${dom.domaine}) dont la destination reste invisible${lien.chaine ? ' : il ne mène plus nulle part ou refuse d\'être suivi' : ''}.`
      : `Lien raccourci (${dom.domaine}) : il cachait sa destination, c'est pourquoi le serveur l'a suivi.` });
    if (raccourci && marques.length) r.push({ code: 'marque-raccourci', niveau: 'moyen', texte: `Le message parle de ${marques.map((m) => m.nom).slice(0, 2).join(' / ')} mais cache son lien derrière un raccourci : un organisme sérieux envoie l'adresse de son propre site.` });
  }
  if (/xn--/.test(hote)) {
    const u = hoteUnicode(hote);
    r.push({ code: 'punycode', niveau: 'moyen', texte: `L'adresse utilise des caractères spéciaux : « ${u} » s'écrit en réalité ${hote}. Les imitations de sites s'en servent.` });
  }
  const imit = imitations(hote);
  for (const i of imit) r.push({ ...i, lien: affiche });
  const marquesLues = new Set(imit.map((i) => i.marque));
  // la destination finale, si elle diffère de ce qu'on lit
  let domaineFinal = dom;
  if (domFinal && domFinal.domaine !== dom.domaine) {
    domaineFinal = domFinal;
    r.push({ code: 'redirection', niveau: 'info', texte: `Le lien mène en réalité à ${domFinal.domaine}${lien.chaine && lien.chaine.length > 2 ? ` après ${lien.chaine.length - 1} redirections` : ''}.` });
    for (const i of imitations(finalHote)) if (!marquesLues.has(i.marque)) r.push({ ...i, texte: `Destination finale : ${i.texte}` });
    if (/xn--/.test(finalHote)) r.push({ code: 'punycode', niveau: 'moyen', texte: `La destination finale utilise des caractères spéciaux (« ${hoteUnicode(finalHote)} »).` });
  }
  const officielle = marqueOfficielle(domaineFinal.hote) ?? marqueOfficielle(domaineFinal.domaine);
  const imitationFinale = r.some((x) => x.code === 'marque');
  const hebergeur = estHebergeurPublic(domaineFinal.domaine);
  if (officielle && !imitationFinale && !raccourci) {
    r.push({ code: 'officiel', niveau: 'ok', texte: `Le lien mène bien à ${domaineFinal.domaine}, un site officiel de ${officielle.nom}.` });
  }
  if (hebergeur && !officielle) {
    r.push({ code: 'hebergeur', niveau: 'faible', texte: `Le site est hébergé gratuitement sur ${domaineFinal.domaine} : n'importe qui peut y publier une page.` });
  }
  if (!officielle && !hebergeur && !raccourci && TLD_BAVARDS.has(domaineFinal.suffixe.split('.').pop())) {
    r.push({ code: 'extension', niveau: 'faible', texte: `L'extension .${domaineFinal.suffixe.split('.').pop()} est très employée par les arnaques (et par des sites honnêtes).` });
  }
  if (!officielle && domaineFinal.sous.length >= 3) {
    r.push({ code: 'sous-domaines', niveau: 'faible', texte: `Adresse à rallonge (${domaineFinal.sous.length} sous-domaines avant ${domaineFinal.domaine}) : le vrai nom du site est tout à la fin.` });
  }
  if (!officielle && (domaineFinal.nom.match(/-/g) ?? []).length >= 3) {
    r.push({ code: 'tirets', niveau: 'faible', texte: `Le nom ${domaineFinal.nom} accumule les tirets, typique des sites montés pour une campagne.` });
  }
  // âge du domaine
  if (lien.age && Number.isFinite(lien.age.jours) && !hebergeur) {
    const j = lien.age.jours;
    if (officielle && !imitationFinale) r.push({ code: 'age', niveau: 'ok', texte: `Domaine ${domaineFinal.domaine} créé en ${lien.age.creeLe.slice(0, 4)} (${dureeFr(j)}).` });
    else if (j < 30) r.push({ code: 'age', niveau: 'moyen', texte: `Le domaine ${domaineFinal.domaine} a été créé ${jours(j)} : les faux sites sont presque toujours récents.` });
    else if (j < 180) r.push({ code: 'age', niveau: 'faible', texte: `Le domaine ${domaineFinal.domaine} est récent (créé il y a ${dureeFr(j)}).` });
    else r.push({ code: 'age', niveau: 'info', texte: `Domaine ${domaineFinal.domaine} créé il y a ${dureeFr(j)}.` });
  }
  // message qui se réclame d'une marque, lien vers un autre domaine
  if (!officielle && !hebergeur && !raccourci && marques.length && !imitationFinale && !marques.some((m) => marqueOfficielle(domaineFinal.domaine)?.id === m.id)) {
    r.push({ code: 'marque-texte', niveau: 'moyen', texte: `Le message parle de ${marques.map((m) => m.nom).slice(0, 2).join(' / ')}, mais le lien mène à ${domaineFinal.domaine}, qui n'est pas son site.` });
  }
  if (lien.erreur) r.push({ code: 'inaccessible', niveau: lien.erreurNiveau ?? 'info', texte: lien.erreur });
  return r.map((x) => ({ ...x, lien: x.lien ?? affiche }));
}

// ---------- Verdict ----------

const POINTS = { fort: 5, moyen: 2, faible: 1, info: 0, ok: 0 };
export const VERDICTS = {
  tres_probable: { cle: 'tres_probable', phrase: 'Arnaque très probable', conseil: 'N\'ouvrez pas le lien, ne répondez pas, ne donnez ni code ni numéro de carte. Signalez le message : 33700 (SMS), signal-spam.fr (mail), internet-signalement.gouv.fr.' },
  douteux: { cle: 'douteux', phrase: 'Douteux', conseil: 'Ne cliquez pas depuis le message : allez sur le site ou l\'application de l\'organisme en tapant vous-même l\'adresse.' },
  rien: { cle: 'rien', phrase: 'Rien de suspect trouvé', conseil: 'Cela ne prouve pas que le message est honnête : une arnaque toute neuve peut ne figurer nulle part. Dans le doute, passez par le site de l\'organisme.' },
};
/**
 * Verdict à partir des raisons de tous les liens et des indices du texte.
 * Les indices du texte comptent peu (3 points au plus) et ne suffisent jamais pour « très probable ».
 */
export function verdict(raisonsLiens, indices = [], { aDesLiens = false, tousOfficiels = false } = {}) {
  const pts = raisonsLiens.reduce((s, x) => s + (POINTS[x.niveau] ?? 0), 0);
  const brut = indices.reduce((s, x) => s + x.poids, 0);
  const pt = Math.min(3, brut * 0.75);
  const fort = raisonsLiens.some((x) => x.niveau === 'fort');
  const moyen = raisonsLiens.some((x) => x.niveau === 'moyen');
  let cle;
  if (fort) cle = 'tres_probable';
  else if (tousOfficiels && !moyen) cle = 'rien';
  else if (moyen && pts + pt >= 4) cle = 'tres_probable';
  else if (pts + pt >= 2) cle = 'douteux';
  else cle = 'rien';
  return { ...VERDICTS[cle], points: Math.round((pts + pt) * 10) / 10 };
}
const ORDRE = { fort: 0, moyen: 1, faible: 2, ok: 3, info: 4 };
/** Analyse complète à partir de liens déjà décrits : raisons triées, verdict. Utilisée telle quelle par le serveur et par la page. */
export function conclure(texte, liens) {
  const { adresses } = extraireLiens(texte);
  const marques = marquesCitees(texte);
  const indices = indicesTexte(texte);
  const raisonsLiens = [];
  for (const l of liens) raisonsLiens.push(...raisonsLien(l, { marques }));
  for (const a of adresses) {
    const imit = imitations(a).filter((i) => !raisonsLiens.some((x) => x.code === 'marque' && x.marque === i.marque && x.texte.includes(i.texte.slice(0, 30))));
    for (const i of imit) raisonsLiens.push({ ...i, texte: `Adresse d'expéditeur : ${i.texte}`, lien: a });
  }
  const tousOfficiels = liens.length > 0 && liens.every((l) => raisonsLien(l, { marques }).some((x) => x.code === 'officiel')) && !raisonsLiens.some((x) => x.niveau === 'fort');
  const v = verdict(raisonsLiens, tousOfficiels ? [] : indices, { aDesLiens: liens.length > 0, tousOfficiels });
  const raisons = [...raisonsLiens, ...indices.map((i) => ({ code: i.code, niveau: tousOfficiels ? 'info' : 'texte', texte: i.texte }))];
  raisons.sort((a, b) => (ORDRE[a.niveau] ?? 3.5) - (ORDRE[b.niveau] ?? 3.5));
  if (!raisons.length) raisons.push({ code: 'aucun', niveau: 'info', texte: liens.length ? 'Aucun signe d\'imitation, de liste noire ou de domaine neuf n\'a été trouvé.' : 'Aucun lien dans ce texte et aucun signe d\'arnaque dans la formulation.' });
  return { verdict: v, raisons, marques: marques.map((m) => m.nom) };
}
