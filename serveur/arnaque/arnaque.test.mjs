import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { ipInterdite, verifierUrl, resoudreSur, suivre, saut, redirectionDansPage, Refus } from './ssrf.mjs';
import { creer, analyser } from './arnaque.mjs';
import { creerListes, cleUrl } from './listes.mjs';
import { creerRdap } from './rdap.mjs';

// ---------- IP interdites ----------
test('les adresses privees et reservees sont toutes refusees', () => {
  for (const ip of ['127.0.0.1', '127.255.255.254', '10.0.0.1', '10.255.1.2', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '100.127.255.255', '0.0.0.0', '0.1.2.3', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'fe80::abcd%en0', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.1.2.3', '::ffff:169.254.169.254', '::ffff:c0a8:0101', '64:ff9b::7f00:1', '2002:7f00:1::1', 'ff02::1']) {
    assert.equal(ipInterdite(ip), true, ip);
  }
});
test('les adresses publiques passent', () => {
  for (const ip of ['8.8.8.8', '93.184.216.34', '172.15.0.1', '172.32.0.1', '100.63.255.255', '100.128.0.1', '193.50.1.1', '2606:4700:4700::1111', '2a00:1450:4007:80d::200e', '::ffff:8.8.8.8']) {
    assert.equal(ipInterdite(ip), false, ip);
  }
});

// ---------- URL ----------
test('seuls http et https, ports 80 et 443', () => {
  assert.throws(() => verifierUrl('ftp://example.org/x'), { code: 'protocole' });
  assert.throws(() => verifierUrl('file:///etc/passwd'), { code: 'protocole' });
  assert.throws(() => verifierUrl('gopher://example.org'), { code: 'protocole' });
  assert.throws(() => verifierUrl('http://example.org:8080/'), { code: 'port' });
  assert.throws(() => verifierUrl('https://example.org:22/'), { code: 'port' });
  assert.doesNotThrow(() => verifierUrl('http://example.org:80/'));
  assert.doesNotThrow(() => verifierUrl('https://example.org:443/x'));
});
test('http://127.0.0.1 et http://[::1] sont refuses avant toute connexion', async () => {
  for (const u of ['http://127.0.0.1/', 'http://127.0.0.1:80/', 'http://[::1]/', 'https://[::1]/x', 'http://[::ffff:127.0.0.1]/', 'http://localhost/', 'http://2130706433/', 'http://0x7f.1/', 'http://017700000001/', 'http://169.254.169.254/latest/meta-data/']) {
    let appels = 0;
    const r = await suivre(u, { resolveur: async (h) => (h === 'localhost' ? [{ address: '127.0.0.1', family: 4 }] : [{ address: '8.8.8.8', family: 4 }]), transport: async () => { appels++; return { statut: 200, corps: '' }; } });
    assert.equal(appels, 0, `connexion tentee vers ${u}`);
    assert.equal(r.finale, null, u);
    assert.equal(r.erreur.code, 'ip', u);
  }
});
test('un nom qui resout en 10.x est refuse, meme si une autre reponse est publique', async () => {
  await assert.rejects(resoudreSur('interne.example.org', async () => [{ address: '10.1.2.3', family: 4 }]), { code: 'ip' });
  await assert.rejects(resoudreSur('mixte.example.org', async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.5', family: 4 }]), { code: 'ip' });
  await assert.rejects(resoudreSur('v6.example.org', async () => [{ address: 'fd00::1', family: 6 }]), { code: 'ip' });
  await assert.rejects(resoudreSur('mappe.example.org', async () => [{ address: '::ffff:192.168.0.9', family: 6 }]), { code: 'ip' });
  let appels = 0;
  const r = await suivre('http://interne.example.org/', { resolveur: async () => [{ address: '10.1.2.3', family: 4 }], transport: async () => { appels++; return { statut: 200, corps: '' }; } });
  assert.equal(appels, 0);
  assert.equal(r.erreur.code, 'ip');
});
test('une redirection vers 169.254.169.254 est refusee au saut suivant', async () => {
  const vus = [];
  const r = await suivre('http://depart.example.org/', {
    resolveur: async () => [{ address: '93.184.216.34', family: 4 }],
    transport: async (u) => { vus.push(u.href); return { statut: 302, location: 'http://169.254.169.254/latest/meta-data/iam/', corps: '' }; },
  });
  assert.deepEqual(vus, ['http://depart.example.org/']);
  assert.equal(r.erreur.code, 'ip');
  assert.equal(r.chaine.length, 1);
});
test('une redirection vers un nom qui resout en prive est refusee, vers une IP ecrite en decimal aussi', async () => {
  for (const cible of ['http://evil.example.net/', 'http://2852039166/', 'http://[::1]/', 'file:///etc/passwd', 'http://example.org:6379/']) {
    const vus = [];
    const r = await suivre('http://depart.example.org/', {
      resolveur: async (h) => (h === 'evil.example.net' ? [{ address: '192.168.1.10', family: 4 }] : [{ address: '93.184.216.34', family: 4 }]),
      transport: async (u) => { vus.push(u.href); return { statut: 301, location: cible, corps: '' }; },
    });
    assert.equal(vus.length, 1, cible);
    assert.ok(['ip', 'protocole', 'port'].includes(r.erreur.code), `${cible} -> ${r.erreur?.code}`);
  }
});
test('8 redirections au plus', async () => {
  let n = 0;
  const r = await suivre('http://a0.example.org/', {
    resolveur: async () => [{ address: '93.184.216.34', family: 4 }],
    transport: async () => { n++; return { statut: 302, location: `http://a${n}.example.org/`, corps: '' }; },
  });
  assert.equal(n, 9); // départ + 8 redirections suivies
  assert.equal(r.erreur.code, 'sauts');
});
test('chaque saut est resolu a nouveau et verifie', async () => {
  const noms = [];
  await suivre('http://un.example.org/', {
    resolveur: async (h) => { noms.push(h); return [{ address: '93.184.216.34', family: 4 }]; },
    transport: async (u) => (u.hostname === 'un.example.org' ? { statut: 302, location: 'https://deux.example.org/a', corps: '' } : { statut: 200, type: 'text/html', corps: '<p>ok</p>' }),
  });
  assert.deepEqual(noms, ['un.example.org', 'deux.example.org']);
});
test('delai total : le suivi s\'arrete', async () => {
  const r = await suivre('http://lent.example.org/', {
    resolveur: async () => [{ address: '93.184.216.34', family: 4 }],
    limites: { sauts: 8, delaiSaut: 5000, delaiTotal: 150, octets: 1000 },
    transport: (u, ip, { signal }) => new Promise((_, rej) => { signal.addEventListener('abort', () => rej(new Error('abandon'))); }),
  });
  assert.equal(r.erreur.code, 'delai');
});

// ---------- Redirections dans la page ----------
test('meta refresh et location simple sont lus sans executer de JavaScript', () => {
  assert.equal(redirectionDansPage('<html><meta http-equiv="refresh" content="0; url=https://b.example.org/x"></html>', 'http://a.example.org/'), 'https://b.example.org/x');
  assert.equal(redirectionDansPage("<meta http-equiv='Refresh' content='3;URL=/suite'>", 'http://a.example.org/dir/'), 'http://a.example.org/suite');
  assert.equal(redirectionDansPage('<script>window.location.href = "https://c.example.org/";</script>', 'http://a.example.org/'), 'https://c.example.org/');
  assert.equal(redirectionDansPage("<script>location.replace('https://d.example.org/p')</script>", 'http://a.example.org/'), 'https://d.example.org/p');
  assert.equal(redirectionDansPage('<script>location = "/rel"</script>', 'http://a.example.org/'), 'http://a.example.org/rel');
  assert.equal(redirectionDansPage('<p>rien</p>', 'http://a.example.org/'), null);
  assert.equal(redirectionDansPage('<script>var x = a + b; go(x)</script>', 'http://a.example.org/'), null); // du code qu'on n'execute pas
});

// ---------- Vrai transport, serveur local (autorise seulement par ce test) ----------
test('le vrai saut lit un corps de 256 Kio au plus, envoie un agent honnete, aucun cookie', async () => {
  let recu;
  const s = http.createServer((req, res) => {
    recu = req.headers;
    if (req.url === '/gros') { res.writeHead(200, { 'content-type': 'text/html', 'set-cookie': 'a=b' }); res.end('x'.repeat(2_000_000)); }
    else if (req.url === '/r') { res.writeHead(302, { location: '/gros' }); res.end(); }
    else { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<meta http-equiv="refresh" content="0;url=/r">'); }
  });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const port = s.address().port;
  const u = new URL(`http://exemple.test:${port}/`);
  const ip = { address: '127.0.0.1', family: 4 }; // le test fournit lui-même l'IP : le saut ne résout rien
  const a = await saut(u, ip);
  assert.equal(a.statut, 200);
  assert.match(recu['user-agent'], /^ArnaqueOuPas/);
  assert.equal(recu.cookie, undefined);
  assert.equal(recu.host, `exemple.test:${port}`);
  const g = await saut(new URL(`http://exemple.test:${port}/gros`), ip);
  assert.equal(g.corps.length, 256 * 1024);
  const r = await saut(new URL(`http://exemple.test:${port}/r`), ip);
  assert.equal(r.statut, 302);
  assert.equal(r.location, '/gros');
  s.close();
});
test('le vrai saut ne resout aucun nom : il se connecte a l\'IP fournie', async () => {
  const s = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  // ce nom n'existe pas en DNS : seule l'IP fournie peut faire aboutir la requête
  const r = await saut(new URL(`http://ce-nom-n-existe-pas.invalid:${s.address().port}/`), { address: '127.0.0.1', family: 4 });
  assert.equal(r.statut, 200);
  s.close();
});

// ---------- Serveur ----------
async function demarrer(opts = {}, deps = {}) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'arn-'));
  const listes = creerListes({ dossier, sources: [{ id: 'openphish', nom: 'OpenPhish (flux communautaire)', url: 'x' }] });
  listes.charger('openphish', 'https://laposte-colis-suivi.top/pay\nhttp://faux-ameli.example.org/\n' + '#'.repeat(100));
  const rdap = { age: async (d) => (d === 'laposte.fr' ? { jours: 10000, creeLe: '1996-05-23T22:00:00.000Z' } : d.endsWith('.top') || d.endsWith('.example.org') ? { jours: 3, creeLe: new Date(Date.now() - 3 * 864e5).toISOString() } : null) };
  const a = creer({ donnees: dossier, deps: { rdap, listes, suivre: async (u) => ({ chaine: [{ url: u, statut: 200 }], finale: new URL(u) }), ...deps }, ...opts });
  await new Promise((r) => a.serveur.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${a.serveur.address().port}`;
  return { a, base, dossier, fin: () => new Promise((r) => { a.serveur.close(r); a.serveur.closeAllConnections?.(); }) };
}
const post = (base, corps, h = {}) => fetch(`${base}/api/arnaque`, { method: 'POST', headers: h, body: typeof corps === 'string' ? corps : JSON.stringify(corps) });

test('validation du corps', async () => {
  const s = await demarrer();
  assert.equal((await post(s.base, 'pas du json')).status, 400);
  assert.equal((await post(s.base, { texte: '   ' })).status, 400);
  assert.equal((await post(s.base, { autre: 1 })).status, 400);
  assert.equal((await post(s.base, { texte: 'a'.repeat(5001) })).status, 413);
  assert.equal((await post(s.base, { texte: 'a'.repeat(5000) })).status, 200);
  assert.equal((await fetch(`${s.base}/api/arnaque`)).status, 404);
  assert.equal((await fetch(`${s.base}/api/arnaque/sante`)).status, 200);
  await s.fin();
});
test('pas d\'en-tetes CORS sans ARNAQUE_CORS_DEV', async () => {
  const s = await demarrer();
  const r = await post(s.base, { texte: 'bonjour' });
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  await s.fin();
  const d = await demarrer({ cors: true });
  const r2 = await post(d.base, { texte: 'bonjour' });
  assert.equal(r2.headers.get('access-control-allow-origin'), '*');
  assert.equal((await fetch(`${d.base}/api/arnaque`, { method: 'OPTIONS' })).status, 204);
  await d.fin();
});
test('limite de debit par IP, lue dans x-real-ip derriere nginx', async () => {
  const s = await demarrer({ limiteParMinute: 3 });
  for (let i = 0; i < 3; i++) assert.equal((await post(s.base, { texte: 'a' }, { 'x-real-ip': '203.0.113.7' })).status, 200);
  const r = await post(s.base, { texte: 'a' }, { 'x-real-ip': '203.0.113.7' });
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers.get('retry-after')) > 0);
  assert.equal((await post(s.base, { texte: 'a' }, { 'x-real-ip': '203.0.113.8' })).status, 200);
  // aucune IP en clair dans la memoire de limitation
  for (const k of s.a.fenetres.keys()) assert.ok(!k.includes('203.0.113'));
  await s.fin();
});
test('rien n\'est ecrit sur disque a part les listes publiques, et rien ne sort dans les journaux', async () => {
  const s = await demarrer();
  const sortie = [];
  const ecrire = process.stdout.write, err = process.stderr.write;
  process.stdout.write = (c, ...r) => { sortie.push(String(c)); return true; };
  process.stderr.write = (c, ...r) => { sortie.push(String(c)); return true; };
  try { await post(s.base, { texte: 'Colis en attente https://secret-marqueur-123.example.org/xyz' }, { 'x-real-ip': '203.0.113.9' }); } finally { process.stdout.write = ecrire; process.stderr.write = err; }
  assert.equal(sortie.filter((l) => /secret-marqueur|203\.0\.113/.test(l)).length, 0);
  const lu = (d) => fs.readdirSync(d, { recursive: true }).map((f) => path.join(d, f)).filter((f) => fs.statSync(f).isFile());
  for (const f of lu(s.dossier)) assert.ok(!/secret-marqueur|203\.0\.113/.test(fs.readFileSync(f, 'utf8')), f);
  await s.fin();
});

// ---------- Analyse ----------
test('une arnaque a la La Poste : adresse imitee, liste publique, domaine de 3 jours', async () => {
  const s = await demarrer();
  const r = await (await post(s.base, { texte: 'La Poste: votre colis est en attente. Regularisez 1,99 EUR sous 24h : https://laposte-colis-suivi.top/pay' })).json();
  assert.equal(r.verdict.phrase, 'Arnaque très probable');
  const texte = r.raisons.map((x) => x.texte).join('\n');
  assert.match(texte, /liste OpenPhish/);
  assert.match(texte, /créé aujourd'hui|créé il y a 3 jours/);
  assert.match(texte, /laposte/i);
  assert.equal(r.liens[0].domaine, 'laposte-colis-suivi.top');
  await s.fin();
});
test('un message legitime avec un lien officiel : rien de suspect', async () => {
  const s = await demarrer();
  const r = await (await post(s.base, { texte: 'La Poste : votre colis 6A12345678901 sera livre demain. Suivi : https://www.laposte.fr/outils/suivre-vos-envois' })).json();
  assert.equal(r.verdict.phrase, 'Rien de suspect trouvé');
  assert.match(r.raisons.map((x) => x.texte).join('\n'), /site officiel de La Poste/);
  assert.match(r.raisons.map((x) => x.texte).join('\n'), /créé en 1996/);
  await s.fin();
});
test('analyser suit la chaine et juge la destination finale', async () => {
  const listes = creerListes({ sources: [] });
  const r = await analyser('Votre colis : bit.ly/abc123', {
    rdap: { age: async () => ({ jours: 2, creeLe: new Date(Date.now() - 2 * 864e5).toISOString() }) }, listes,
    suivre: async () => ({ chaine: [{ url: 'https://bit.ly/abc123', statut: 301, via: 'http' }, { url: 'https://colissimo-livraison.example.org/', statut: 200 }], finale: new URL('https://colissimo-livraison.example.org/') }),
  });
  assert.equal(r.verdict.phrase, 'Arnaque très probable');
  assert.equal(r.liens[0].finale, 'colissimo-livraison.example.org');
  assert.match(r.raisons.map((x) => x.texte).join('\n'), /mène en réalité à example\.org/);
});

// ---------- Listes ----------
test('listes : adresse exacte, meme site, grand service', () => {
  const l = creerListes({ sources: [{ id: 'a', nom: 'Liste A', url: 'x' }] });
  l.charger('a', 'https://mauvais.example.org/pay?x=1\nhttps://docs.google.com/forms/d/e/abc/viewform\n' + '#'.repeat(100));
  assert.deepEqual(l.chercherAdresse('https://mauvais.example.org/pay?x=1'), { source: 'Liste A', exact: true });
  assert.deepEqual(l.chercherAdresse('https://mauvais.example.org/autre'), { source: 'Liste A', exact: false });
  assert.equal(l.chercherAdresse('https://docs.google.com/document/d/zzz'), null);
  assert.equal(l.chercherAdresse('https://laposte.fr/'), null);
  assert.equal(cleUrl('HTTPS://Example.org/a/'), 'example.org/a');
});

// ---------- RDAP ----------
test('rdap : bootstrap IANA, puis serveur du TLD, age en jours', async () => {
  const appels = [];
  const maintenant = Date.parse('2026-10-20T12:00:00Z');
  const rdap = creerRdap({
    maintenant: () => maintenant,
    chercher: async (url) => {
      appels.push(url);
      if (url.includes('iana.org')) return { ok: true, status: 200, json: async () => ({ services: [[['top'], ['https://rdap.nic.top/']], [['com'], ['https://rdap.verisign.com/com/v1/']]] }) };
      return { ok: true, status: 200, json: async () => ({ events: [{ eventAction: 'registration', eventDate: '2026-10-17T08:00:00Z' }] }) };
    },
  });
  const a = await rdap.age('faux-colis.top');
  assert.equal(a.jours, 3);
  assert.ok(appels.includes('https://rdap.nic.top/domain/faux-colis.top'));
  await rdap.age('faux-colis.top'); // en cache
  assert.equal(appels.filter((u) => u.includes('nic.top')).length, 1);
});
test('rdap : .fr sans entree dans le bootstrap passe par l\'AFNIC', async () => {
  const appels = [];
  const rdap = creerRdap({ chercher: async (url) => { appels.push(url); return url.includes('iana') ? { ok: true, status: 200, json: async () => ({ services: [] }) } : { ok: true, status: 200, json: async () => ({ events: [{ eventAction: 'registration', eventDate: '1996-05-23T22:00:00Z' }] }) }; } });
  const a = await rdap.age('laposte.fr');
  assert.ok(a.jours > 9000);
  assert.ok(appels.includes('https://rdap.nic.fr/domain/laposte.fr'));
});
