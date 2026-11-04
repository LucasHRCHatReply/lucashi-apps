// Déclic — serveur du jeu. Aucune dépendance. Il ne parle jamais à GPT : il prépare le travail (sources Wikipédia,
// prompt), le met en file, et un worker sur un Mac (abonnement ChatGPT via Codex) vient le chercher et le rendre.
import http from 'node:http'
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normaliser, themeValide, promptParcours, promptMoitie, promptCours, validerParcours, cartesValides, validerCours, extraireJson } from './prompts.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8243)
const DATA = process.env.DATA || path.join(ICI, 'data')
const TOKEN = process.env.WORKER_TOKEN || ''
const CAP_JOUR = Number(process.env.CAP_JOUR || 80)      // générations par jour, tous visiteurs confondus
const IP_MAX = Number(process.env.IP_MAX || 6)           // générations par IP et par 10 minutes
const UA = 'Declic/1.0 (jeu de culture generale; https://apps.srv875929.hstgr.cloud)'
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.mjs': 'text/javascript; charset=utf-8', '.sh': 'text/plain; charset=utf-8' }

const jobs = new Map()          // id -> job
const parCle = new Map()        // clé -> job en cours
const vuIp = new Map()          // ip -> [horodatages]
let dernierSondage = 0, compteJour = { jour: '', n: 0 }
let graines = []

const sha = (s) => createHash('sha1').update(s).digest('hex')
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)) }
const cerveauEnLigne = () => Date.now() - dernierSondage < 45_000

// ---------- cache disque ----------
const fichierCache = (cle) => path.join(DATA, 'cache', sha(cle) + '.json')
async function lireCache(cle) { try { return JSON.parse(await readFile(fichierCache(cle), 'utf8')) } catch { return null } }
async function ecrireCache(cle, entree) { await writeFile(fichierCache(cle), JSON.stringify(entree)) }

// ---------- sources Wikipédia ----------
async function wiki(params) {
  const r = await fetch('https://fr.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params }), { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12_000) })
  if (!r.ok) throw new Error('Wikipédia : HTTP ' + r.status)
  return r.json()
}
async function sourcesWikipedia(requete, n, caracteres) {
  const rech = await wiki({ action: 'query', list: 'search', srsearch: requete, srlimit: String(n), srprop: '' })
  const titres = (rech.query?.search ?? []).map((s) => s.title)
  const pages = await Promise.all(titres.map(async (titre) => {
    const d = await wiki({ action: 'query', prop: 'extracts|pageimages', piprop: 'thumbnail|name', pithumbsize: '640', explaintext: '1', exsectionformat: 'plain', exchars: String(caracteres), titles: titre, redirects: '1' })
    const page = d.query?.pages?.[0]; const texte = (page?.extract ?? '').replace(/\n{2,}/g, '\n').trim()
    const vignette = page?.thumbnail?.source; const fichier = page?.pageimage
    const mini = typeof vignette === 'string' ? vignette.replace(/\/\d+px-/, '/500px-') : vignette   // 500 px : 115 Ko au lieu de 305 Ko
    const image = typeof vignette === 'string' && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(vignette) && fichier && !/\.(svg|tif|tiff)$/i.test(fichier) ? { url: mini, page: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(fichier) } : null
    return texte.length > 300 ? { titre, url: 'https://fr.wikipedia.org/wiki/' + encodeURIComponent(titre.replace(/ /g, '_')), texte, image } : null
  }))
  return pages.filter(Boolean)
}

// ---------- file de travail ----------
function nouveauJob(type, cle, theme, extra = {}) {
  const job = { id: randomUUID(), type, cle, theme, etat: 'lecture', priorite: extra.priorite ?? 5, essai: 0, cree: Date.now(), ...extra }
  jobs.set(job.id, job); parCle.set(cle, job)
  preparer(job).catch((e) => echec(job, e))
  return job
}
function echec(job, e) {
  if (job.parent) { for (const f of job.parent.enfants) f.etat = 'echec'; return echec(job.parent, e) }
  for (const f of job.enfants ?? []) f.etat = 'echec'
  job.etat = 'echec'; job.erreur = e?.message ? String(e.message).slice(0, 300) : 'erreur inconnue'; parCle.delete(job.cle)
  console.error(new Date().toISOString(), 'échec', job.type, job.theme, '→', job.erreur)
}
async function preparer(job) {
  if (job.type === 'parcours') job.sources = await sourcesWikipedia(job.theme, 4, 3500)
  else job.sources = await sourcesWikipedia(`${job.carte.titre} ${job.theme}`, 4, 4200)
  if (job.sources.length < 1) throw new Error('Aucune page Wikipédia trouvée sur ce sujet : essaie d’autres mots.')
  if (job.type === 'parcours' && job.sources.length >= 2) {
    // deux moitiés écrites en parallèle par les deux boucles du worker : environ deux fois plus vite
    job.enfants = ['A', 'B'].map((partie) => {
      const f = { id: randomUUID(), type: 'moitie', partie, parent: job, cle: job.cle + '#' + partie, theme: job.theme, etat: 'attente', priorite: job.priorite, essai: 0, cree: job.cree, prompt: promptMoitie(job.theme, job.sources, partie) }
      jobs.set(f.id, f); return f
    })
  } else job.prompt = job.type === 'parcours' ? promptParcours(job.theme, job.sources) : promptCours(job.theme, job.carte, job.sources)
  job.etat = 'attente'
}
const enAttente = () => [...jobs.values()].filter((j) => j.etat === 'attente' && !j.enfants).sort((a, b) => a.priorite - b.priorite || a.cree - b.cree)

function reserver(ip) {
  const jour = new Date().toISOString().slice(0, 10)
  if (compteJour.jour !== jour) compteJour = { jour, n: 0 }
  if (compteJour.n >= CAP_JOUR) return 'Le cerveau a assez travaillé pour aujourd’hui : choisis un thème déjà prêt, ou reviens demain.'
  const t = (vuIp.get(ip) ?? []).filter((x) => Date.now() - x < 600_000)
  if (t.length >= IP_MAX) return 'Doucement : tu as lancé beaucoup de thèmes d’un coup. Réessaie dans quelques minutes.'
  t.push(Date.now()); vuIp.set(ip, t); compteJour.n++
  return null
}

async function lancer(type, cle, theme, ip, extra) {
  const c = await lireCache(cle)
  if (c) return { pret: true, resultat: c.resultat }
  const enCours = parCle.get(cle)
  if (enCours) return { id: enCours.id }
  const refus = reserver(ip)
  if (refus) return { refus }
  return { id: nouveauJob(type, cle, theme, extra).id }
}

// ---------- API ----------
async function corps(req, max) {
  let n = 0; const morceaux = []
  for await (const m of req) { n += m.length; if (n > max) throw Object.assign(new Error('corps trop gros'), { code: 413 }); morceaux.push(m) }
  return Buffer.concat(morceaux).toString('utf8')
}
const jetonValide = (req) => {
  const a = createHash('sha256').update(String(req.headers.authorization ?? '')).digest()
  const b = createHash('sha256').update('Bearer ' + TOKEN).digest()
  return TOKEN.length >= 24 && timingSafeEqual(a, b)
}

async function api(req, res, url) {
  const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress)
  const m = req.method, p = url.pathname

  if (m === 'GET' && p === '/api/etat') {
    const prets = []
    for (const g of graines) { const c = await lireCache('p:' + normaliser(g)); if (c) prets.push({ theme: g, titre: c.resultat.titre, accroche: c.resultat.accroche, emoji: c.resultat.cartes[0]?.emoji ?? '' }) }
    return json(res, 200, { cerveau: cerveauEnLigne(), file: enAttente().length, prets, graines: graines.length })
  }
  if (m === 'POST' && p === '/api/parcours') {
    const { theme } = JSON.parse(await corps(req, 1000))
    if (!themeValide(theme)) return json(res, 400, { erreur: 'Thème invalide : 2 à 60 caractères, lettres et chiffres.' })
    const t = theme.trim()
    const r = await lancer('parcours', 'p:' + normaliser(t), t, ip)
    return json(res, r.refus ? 429 : 200, r.refus ? { erreur: r.refus } : r)
  }
  if (m === 'POST' && p === '/api/cours') {
    const { theme, index } = JSON.parse(await corps(req, 1000))
    if (!themeValide(theme) || !Number.isInteger(index) || index < 0 || index > 5) return json(res, 400, { erreur: 'Demande invalide.' })
    const parcours = await lireCache('p:' + normaliser(theme.trim()))
    const carte = parcours?.resultat.cartes[index]
    if (!carte) return json(res, 404, { erreur: 'Parcours inconnu : relance le thème.' })
    const r = await lancer('cours', `c:${normaliser(theme.trim())}|${index}`, theme.trim(), ip, { carte: { titre: carte.titre, explication: carte.explication } })
    return json(res, r.refus ? 429 : 200, r.refus ? { erreur: r.refus } : r)
  }
  if (m === 'GET' && p.startsWith('/api/job/')) {
    const job = jobs.get(p.slice(9))
    if (!job) return json(res, 404, { erreur: 'Travail inconnu.' })
    if (job.etat === 'fini') return json(res, 200, { etat: 'fini', resultat: job.resultat })
    if (job.etat === 'echec') return json(res, 200, { etat: 'echec', erreur: job.erreur })
    const file = enAttente(); const ids = new Set([job.id, ...(job.enfants ?? []).map((f) => f.id)])
    return json(res, 200, { etat: job.etat, position: file.findIndex((j) => ids.has(j.id)), cerveau: cerveauEnLigne(),
      moities: job.enfants ? job.enfants.filter((f) => f.brut).length : undefined })
  }

  // --- côté worker (le Mac) ---
  if (p.startsWith('/api/worker/')) {
    if (!jetonValide(req)) return json(res, 401, { erreur: 'jeton' })
    if (m === 'GET' && p === '/api/worker/prendre') {
      const fin = Date.now() + Math.min(Number(url.searchParams.get('attente') || 20), 25) * 1000
      do {
        dernierSondage = Date.now()
        const job = enAttente()[0]
        if (job) { job.etat = 'ecriture'; job.pris = Date.now(); job.essai++; if (job.parent) job.parent.etat = 'ecriture'; return json(res, 200, { id: job.id, type: job.type, prompt: job.prompt }) }
        await dormir(500)
      } while (Date.now() < fin && !res.destroyed)
      return json(res, 200, { rien: true })
    }
    if (m === 'POST' && p.startsWith('/api/worker/rendre/')) {
      const job = jobs.get(p.slice(19)); if (!job || job.etat !== 'ecriture') return json(res, 404, { erreur: 'inconnu' })
      const { texte, erreur } = JSON.parse(await corps(req, 300_000))
      try {
        if (erreur) throw new Error('GPT : ' + String(erreur).slice(0, 200))
        const brut = extraireJson(texte)
        if (job.parent) {                                    // une moitié de parcours
          const P = job.parent
          if (!Array.isArray(brut?.cartes) || brut.cartes.length < 2) throw new Error('moitié sans cartes')
          job.brut = brut; job.etat = 'fini'
          const [A, B] = P.enfants
          if (A.brut && B.brut) {
            try { for (const f of [A, B]) if (!cartesValides(f.brut, P.sources).length) console.log('invalide', f.partie, JSON.stringify(f.brut.cartes[0]).slice(0, 700)); console.log(new Date().toISOString(), 'moitiés', P.theme, `A ${A.brut.cartes.length}→${cartesValides(A.brut, P.sources).length}`, `B ${B.brut.cartes.length}→${cartesValides(B.brut, P.sources).length}`); P.resultat = validerParcours(A.brut, P.sources, B.brut) }
            catch (e) { for (const f of P.enfants) { f.brut = null; f.etat = 'attente'; f.essai = Math.min(f.essai, 1); f.prompt += `\n\nATTENTION : l'assemblage a été refusé (${String(e.message).slice(0, 160)}). Respecte exactement les formats.` } ; if (P.refus) throw e; P.refus = true; return json(res, 200, { ok: true }) }
            await ecrireCache(P.cle, { cle: P.cle, type: P.type, theme: P.theme, cree: new Date().toISOString(), resultat: P.resultat })
            P.etat = 'fini'; parCle.delete(P.cle)
            console.log(new Date().toISOString(), 'fini parcours', P.theme, `${Math.round((Date.now() - P.cree) / 1000)} s (deux moitiés)`)
          }
          return json(res, 200, { ok: true })
        }
        job.resultat = job.type === 'parcours' ? validerParcours(brut, job.sources) : validerCours(brut, job.sources)
        await ecrireCache(job.cle, { cle: job.cle, type: job.type, theme: job.theme, cree: new Date().toISOString(), resultat: job.resultat })
        job.etat = 'fini'; parCle.delete(job.cle)
        console.log(new Date().toISOString(), 'fini', job.type, job.theme, `${Math.round((Date.now() - job.pris) / 1000)} s`)
      } catch (e) {
        if (job.essai < 2) { job.etat = 'attente'; job.prompt += `\n\nATTENTION : ta réponse précédente a été refusée (${String(e.message).slice(0, 160)}). Corrige et respecte exactement les formats.` }
        else echec(job, e)
      }
      return json(res, 200, { ok: true })
    }
  }
  return json(res, 404, { erreur: 'introuvable' })
}

// ---------- fichiers statiques ----------
async function statique(req, res, url) {
  const nom = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)
  if (!/^[\w.-]+$/.test(nom) || !TYPES[path.extname(nom)]) { res.writeHead(404); return res.end('introuvable') }
  try {
    const f = await readFile(path.join(ICI, 'public', nom))
    res.writeHead(200, { 'content-type': TYPES[path.extname(nom)], 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex',
      'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://upload.wikimedia.org https://thumb.wikimedia.org; frame-ancestors 'none'", 'referrer-policy': 'no-referrer' })
    res.end(f)
  } catch { res.writeHead(404); res.end('introuvable') }
}

// ---------- démarrage ----------
await mkdir(path.join(DATA, 'cache'), { recursive: true })
try { graines = JSON.parse(await readFile(path.join(ICI, 'graines.json'), 'utf8')) } catch { graines = [] }

// Les thèmes « prêts » se fabriquent seuls, un à la fois, dès que le cerveau est en ligne et que la file est vide.
setInterval(async () => {
  try {
    if (!cerveauEnLigne() || jobs.size && [...jobs.values()].some((j) => ['lecture', 'attente', 'ecriture'].includes(j.etat))) return
    for (const g of graines) { const cle = 'p:' + normaliser(g); if (!(await lireCache(cle)) && !parCle.has(cle)) { nouveauJob('parcours', cle, g, { priorite: 9 }); return } }
  } catch (e) { console.error('graines', e.message) }
}, 15_000)
// Un travail resté « écriture » plus de 5 minutes (worker tombé) retourne en file ; les vieux jobs finis s'oublient.
setInterval(() => {
  for (const j of jobs.values()) {
    if (j.etat === 'ecriture' && Date.now() - j.pris > 300_000) j.etat = j.essai < 2 ? 'attente' : (echec(j, new Error('le cerveau n’a pas répondu')), 'echec')
    if (['fini', 'echec'].includes(j.etat) && Date.now() - j.cree > 3_600_000) jobs.delete(j.id)
  }
}, 30_000)

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x')
    if (url.pathname.startsWith('/api/')) return await api(req, res, url)
    return await statique(req, res, url)
  } catch (e) {
    console.error(e)
    if (!res.headersSent) json(res, e.code === 413 ? 413 : 400, { erreur: 'Requête invalide.' })
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Déclic écoute sur 127.0.0.1:${PORT} (${graines.length} thèmes prêts à fabriquer)`))
