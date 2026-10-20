import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { creer, jourCourant } from './compteur.mjs';

async function demarrer(opts = {}) {
  const donnees = opts.donnees || fs.mkdtempSync(path.join(os.tmpdir(), 'cpt-'));
  const c = creer({ donnees, ...opts });
  await new Promise((r) => c.serveur.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${c.serveur.address().port}`;
  return { c, donnees, base, fin: () => new Promise((r) => c.serveur.close(r)) };
}
const post = (base, corps) =>
  fetch(`${base}/api/compte`, { method: 'POST', body: typeof corps === 'string' ? corps : JSON.stringify(corps) });

test('validation du corps', async () => {
  const s = await demarrer();
  assert.equal((await post(s.base, { o: 'qr-wifi', e: 'vue' })).status, 204);
  assert.equal((await post(s.base, { o: 'QR', e: 'vue' })).status, 400);
  assert.equal((await post(s.base, { o: 'a', e: 'autre' })).status, 400);
  assert.equal((await post(s.base, 'pas du json')).status, 400);
  assert.equal((await post(s.base, { o: 'a'.repeat(41), e: 'vue' })).status, 400);
  assert.equal((await post(s.base, { o: 'a', e: 'vue', x: 'y'.repeat(300) })).status, 400);
  await s.fin();
});

test('increment, ecriture atomique et rechargement', async () => {
  const s = await demarrer();
  await post(s.base, { o: 'ocr', e: 'vue' });
  await post(s.base, { o: 'ocr', e: 'vue' });
  await post(s.base, { o: 'ocr', e: 'utilise' });
  s.c.ecrire();
  const f = path.join(s.donnees, `${jourCourant()}.json`);
  assert.deepEqual(JSON.parse(fs.readFileSync(f, 'utf8')), { ocr: { vue: 2, utilise: 1 } });
  assert.equal(fs.readdirSync(s.donnees).filter((n) => n.endsWith('.tmp')).length, 0);
  await s.fin();
  const s2 = await demarrer({ donnees: s.donnees });
  await post(s2.base, { o: 'ocr', e: 'vue' });
  s2.c.ecrire();
  assert.equal(JSON.parse(fs.readFileSync(f, 'utf8')).ocr.vue, 3);
  await s2.fin();
});

test('plafond par jour et par outil', async () => {
  const s = await demarrer();
  for (let i = 0; i < 20005; i++) s.c.incrementer('x', 'vue');
  assert.equal(s.c.memoire[jourCourant()].x.vue, 20000);
  await s.fin();
});

test('bilan protege', async () => {
  const s = await demarrer({ jeton: 'secret-de-test' });
  await post(s.base, { o: 'ocr', e: 'vue' });
  assert.equal((await fetch(`${s.base}/api/compte/bilan`)).status, 404);
  assert.equal((await fetch(`${s.base}/api/compte/bilan?jeton=faux`)).status, 404);
  const r = await fetch(`${s.base}/api/compte/bilan?jeton=secret-de-test&jours=30`);
  assert.equal(r.status, 200);
  assert.equal((await r.json())[jourCourant()].ocr.vue, 1);
  const h = await fetch(`${s.base}/api/compte/bilan?jeton=secret-de-test`, { headers: { accept: 'text/html' } });
  const t = await h.text();
  assert.match(t, /<table>/);
  assert.match(t, /ocr/);
  assert.equal((await fetch(`${s.base}/api/compte/sante`)).status, 200);
  await s.fin();
  const sans = await demarrer({ jeton: '' });
  assert.equal((await fetch(`${sans.base}/api/compte/bilan?jeton=`)).status, 404);
  await sans.fin();
});

test('aucun champ IP ou agent utilisateur ecrit', async () => {
  const s = await demarrer();
  await fetch(`${s.base}/api/compte`, {
    method: 'POST',
    headers: { 'user-agent': 'AgentSecret/1.0', referer: 'https://exemple.test/', cookie: 'a=b', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify({ o: 'ocr', e: 'vue' }),
  });
  s.c.ecrire();
  const contenu = fs.readdirSync(s.donnees).map((n) => fs.readFileSync(path.join(s.donnees, n), 'utf8')).join('');
  for (const interdit of ['AgentSecret', '203.0.113.9', '127.0.0.1', 'exemple.test', 'a=b']) assert.ok(!contenu.includes(interdit));
  await s.fin();
});
