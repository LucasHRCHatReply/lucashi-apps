import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { creer, verifierLot } from './perfs.mjs';

const CLE = 'a'.repeat(32);
const fiche = (x = {}) => JSON.stringify({ v: 2, compte: 'essai', session: '0069a1a7', projet: 'p-0a54a9', debut: '2026-10-21T21:26:52.770Z',
  fin: '2026-10-21T21:26:55.092Z', modele: 'sonnet', effort: 'low', cout: 0.05, agents: [{ type: 'Explore', modele: 'hérité', effort: 'défaut' }],
  erreurs_outils: { '?': 1 }, outils: { Bash: 3, mcp__ccd_session__start_session: 1 }, skills: ['projet'], ...x });

async function demarrer(opts = {}) {
  const donnees = fs.mkdtempSync(path.join(os.tmpdir(), 'perfs-'));
  const p = creer({ donnees, ...opts });
  await new Promise((r) => p.serveur.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${p.serveur.address().port}`;
  return { donnees, base, fin: () => new Promise((r) => p.serveur.close(r)) };
}
const post = (base, corps, compte = 'essai', cle = CLE) =>
  fetch(`${base}/api/perfs`, { method: 'POST', headers: { 'x-compte': compte, 'x-cle': cle }, body: corps });

test('une fiche réelle passe, le texte libre est refusé', () => {
  assert.deepEqual(verifierLot(fiche() + '\n' + fiche({ session: '007f33b1' }) + '\n', 'essai'), { lignes: 2 });
  assert.match(verifierLot(fiche({ prompt: 'Peux-tu corriger le bug, merci !' }), 'essai').erreur, /contenu/);
  assert.match(verifierLot(fiche({ modele: 'x'.repeat(81) }), 'essai').erreur, /contenu/);
  assert.match(verifierLot(fiche({ session: 'pas-hex' }), 'essai').erreur, /session/);
  assert.match(verifierLot(fiche(), 'autre').erreur, /compte/);
  assert.match(verifierLot('{pas du json', 'essai').erreur, /JSON/);
  assert.match(verifierLot('', 'essai').erreur, /vide/);
});

test('réception, écriture et clé attachée au compte', async () => {
  const s = await demarrer();
  const r = await post(s.base, fiche() + '\n');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { recu: 1 });
  const fichiers = fs.readdirSync(path.join(s.donnees, 'recus', 'essai'));
  assert.equal(fichiers.length, 1);
  assert.match(fichiers[0], /^\d{4}-\d{2}-\d{2}-[0-9a-f]{6}\.jsonl$/);
  assert.equal((await post(s.base, fiche(), 'essai', 'b'.repeat(32))).status, 403);
  assert.equal((await post(s.base, fiche(), 'Essai')).status, 400);
  assert.equal((await post(s.base, fiche(), 'essai', 'court')).status, 400);
  assert.equal((await post(s.base, fiche({ texte: 'Bonjour, voici mon code' }))).status, 400);
  await s.fin();
});

test('limite de débit par heure', async () => {
  const s = await demarrer({ parHeure: 2 });
  assert.equal((await post(s.base, fiche())).status, 200);
  assert.equal((await post(s.base, fiche())).status, 200);
  assert.equal((await post(s.base, fiche())).status, 429);
  await s.fin();
});

test('santé et routes inconnues', async () => {
  const s = await demarrer();
  assert.equal(await (await fetch(`${s.base}/api/perfs/sante`)).text(), 'ok');
  assert.equal((await fetch(`${s.base}/api/perfs`)).status, 404);
  await s.fin();
});
