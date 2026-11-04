// Worker de Déclic — tourne sur un Mac (le Mac mini en production). Il va chercher le travail sur le VPS
// (connexion sortante uniquement, rien n'est ouvert sur le Mac) et le fait faire par GPT via Codex, connecté
// à l'abonnement : aucune clé d'API. Variables : DECLIC_URL, DECLIC_TOKEN, MOTEUR (claude | codex), CLAUDE, CODEX, PARALLELE, MODELE (sonnet | gpt-6-luna), EFFORT (low).
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

// Deux moteurs au choix (MOTEUR) : « claude » (Claude Code, abonnement Max, Sonnet en effort bas, aucun outil)
// ou « codex » (ChatGPT). Dans les deux cas : dossier vide, aucun outil, le texte sort et le serveur le valide.
const MOTEUR = process.env.MOTEUR ?? 'claude'
const CLAUDE = process.env.CLAUDE ?? 'claude'

function lancer(cmd, args, prompt, cwd, lireSortie) {
  return new Promise((ok, ko) => {
    const p = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '', err = ''; p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { err = (err + d).slice(-600) })
    const t = setTimeout(() => { p.kill('SIGKILL'); ko(new Error('délai dépassé')) }, DELAI)
    p.on('error', ko)
    p.on('close', async (code) => { clearTimeout(t)
      try { const r = await lireSortie(out); r.trim() ? ok(r) : ko(new Error('réponse vide')) }
      catch { ko(new Error(`${MOTEUR} a échoué (code ${code}) ${err.split('\n').filter((l) => !/rmcp|AuthRequired/.test(l)).join(' ').slice(-200)}`)) } })
    p.stdin.end(prompt)
  })
}

async function gpt(prompt) {
  const dossier = await mkdtemp(path.join(tmpdir(), 'declic-'))   // dossier vide : le modèle n'a rien à lire autour de lui
  try {
    if (MOTEUR === 'claude') {
      // pas d'outils, pas de réglages ni de CLAUDE.md de l'utilisateur, pas de session gardée : juste texte → texte
      const args = ['-p', '--model', process.env.MODELE ?? 'sonnet', '--effort', process.env.EFFORT ?? 'low', '--tools', '', '--no-session-persistence',
        '--disable-slash-commands', '--setting-sources', '', '--strict-mcp-config', '--output-format', 'text']
      return await lancer(CLAUDE, args, prompt, dossier, async (out) => out)
    }
    const sortie = path.join(dossier, 'reponse.txt')
    const args = ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '--color', 'never', '-c', `model_reasoning_effort="${process.env.EFFORT ?? 'low'}"`, '-o', sortie, '-m', process.env.MODELE ?? 'gpt-6-luna', '-']
    return await lancer(CODEX, args, prompt, dossier, () => readFile(sortie, 'utf8'))
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
console.log(`Worker Déclic → ${URL_VPS} · ${PARALLELE} en parallèle · ${MOTEUR} ${process.env.MODELE ?? (MOTEUR === 'claude' ? 'sonnet' : 'gpt-6-luna')}`)
for (let i = 1; i <= PARALLELE; i++) boucle(i)
