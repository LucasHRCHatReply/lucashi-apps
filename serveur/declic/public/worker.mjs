// Worker de Déclic — tourne sur un Mac (le Mac mini en production). Il va chercher le travail sur le VPS
// (connexion sortante uniquement, rien n'est ouvert sur le Mac) et le fait faire par GPT via Codex, connecté
// au compte ChatGPT : l'abonnement paie, aucune clé d'API. Variables : DECLIC_URL, DECLIC_TOKEN, CODEX, PARALLELE, MODELE (gpt-6-luna), EFFORT (low).
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_VPS = process.env.DECLIC_URL ?? 'https://declic.srv875929.hstgr.cloud'
const TOKEN = process.env.DECLIC_TOKEN ?? ''
const CODEX = process.env.CODEX ?? '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'
const PARALLELE = Number(process.env.PARALLELE ?? 2)
const DELAI = Number(process.env.DELAI_S ?? 240) * 1000
if (TOKEN.length < 24) { console.error('DECLIC_TOKEN manquant'); process.exit(2) }
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const hdr = { authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' }

async function gpt(prompt) {
  const dossier = await mkdtemp(path.join(tmpdir(), 'declic-'))   // dossier vide : GPT n'a rien à lire autour de lui
  const sortie = path.join(dossier, 'reponse.txt')
  const args = ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '--color', 'never', '-c', `model_reasoning_effort="${process.env.EFFORT ?? 'low'}"`, '-o', sortie]
  args.push('-m', process.env.MODELE ?? 'gpt-6-luna')   // le petit modèle : l'abonnement est modeste
  args.push('-')
  try {
    return await new Promise((ok, ko) => {
      const p = spawn(CODEX, args, { cwd: dossier, stdio: ['pipe', 'ignore', 'pipe'] })
      let err = ''; p.stderr.on('data', (d) => { err = (err + d).slice(-600) })
      const t = setTimeout(() => { p.kill('SIGKILL'); ko(new Error('délai dépassé')) }, DELAI)
      p.on('error', ko)
      p.on('close', async (code) => { clearTimeout(t); try { const r = await readFile(sortie, 'utf8'); r.trim() ? ok(r) : ko(new Error('réponse vide')) } catch { ko(new Error(`codex a échoué (code ${code}) ${err.split('\n').filter((l) => !/rmcp|AuthRequired/.test(l)).join(' ').slice(-200)}`)) } })
      p.stdin.end(prompt)
    })
  } finally { await rm(dossier, { recursive: true, force: true }) }
}

async function boucle(n) {
  for (;;) {
    try {
      const r = await fetch(`${URL_VPS}/api/worker/prendre?attente=20`, { headers: hdr, signal: AbortSignal.timeout(35_000) })
      if (!r.ok) throw new Error('prendre : HTTP ' + r.status)
      const job = await r.json()
      if (job.rien) continue
      const t0 = Date.now(); let corps
      try { corps = { texte: await gpt(job.prompt) } } catch (e) { corps = { erreur: e.message } }
      console.log(new Date().toISOString(), `[${n}]`, job.type, corps.erreur ? 'ÉCHEC ' + corps.erreur : 'ok', `${Math.round((Date.now() - t0) / 1000)} s`)
      await fetch(`${URL_VPS}/api/worker/rendre/${job.id}`, { method: 'POST', headers: hdr, body: JSON.stringify(corps), signal: AbortSignal.timeout(30_000) })
    } catch (e) { console.error(new Date().toISOString(), `[${n}]`, e.message); await dormir(5000) }
  }
}
console.log(`Worker Déclic → ${URL_VPS} · ${PARALLELE} en parallèle`)
for (let i = 1; i <= PARALLELE; i++) boucle(i)
