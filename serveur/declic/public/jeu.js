// Déclic — client. Tout texte venant du serveur passe par textContent (jamais innerHTML).
const $ = (s) => document.querySelector(s)
const NS = 'http://www.w3.org/2000/svg'
const h = (tag, attrs = {}, ...enfants) => {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) k === 'class' ? (e.className = v) : k.startsWith('on') ? e.addEventListener(k.slice(2), v) : k === 'style' ? (e.style.cssText = v) : e.setAttribute(k, v)
  for (const c of enfants.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c))
  return e
}
const sv = (tag, attrs = {}, ...enfants) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); for (const c of enfants) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c)); return e }
const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: n < 1 ? 7 : 2 }).format(n)
const scene = $('#scene')

// ---------- mémoire locale (facultative) ----------
const mem = { xp: 0 }
try { Object.assign(mem, JSON.parse(localStorage.getItem('declic') || '{}')) } catch {}
const sauver = () => { try { localStorage.setItem('declic', JSON.stringify(mem)) } catch {} }
const em = (x) => (x?.emoji ? x.emoji + ' ' : '')
const NIVEAUX = [[0, '🐣', 'Curieux'], [100, '🔭', 'Explorateur'], [300, '🧠', 'Savant'], [700, '🦉', 'Sage'], [1500, '🏛️', 'Encyclopédie']]
const niveau = (xp) => [...NIVEAUX].reverse().find((n) => xp >= n[0])
const majXp = () => { const n = niveau(mem.xp); $('#xp').textContent = `${n[1]} ${n[2]} · ${fmt(mem.xp)} XP` }
majXp()
// sons synthétisés (aucun fichier) ; coupés par le bouton 🔊, et jamais avant un premier geste
let ctx = null; let muet = false
try { muet = localStorage.getItem('declic-muet') === '1' } catch {}
function son(notes) {
  if (muet) return
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)(); const t0 = ctx.currentTime
    notes.forEach(([f, d, delai = 0], i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination)
      const t = t0 + delai; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d + 0.05) })
  } catch {}
}
const SONS = { bon: [[660, 0.15], [880, 0.25, 0.1]], mauvais: [[220, 0.3], [180, 0.35, 0.12]], niveau: [[523, 0.15], [659, 0.15, 0.12], [784, 0.15, 0.24], [1047, 0.4, 0.36]] }
function bascule() { muet = !muet; try { localStorage.setItem('declic-muet', muet ? '1' : '0') } catch {} $('#son').textContent = muet ? '🔇' : '🔊'; if (!muet) son(SONS.bon) }
$('#son').textContent = muet ? '🔇' : '🔊'; $('#son').addEventListener('click', bascule)
function toast(texte) { const t = h('div', { class: 'toast' }, texte); document.body.append(t); setTimeout(() => t.remove(), 2600) }
// gerbe d'emojis qui jaillit d'un point (ou pluie sur tout l'écran si x est nul)
function gerbe(x, y, emojis, n = 14) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 110
    const e = h('span', { class: x == null ? 'pluie' : 'gerbe', style: x == null ? `left:${Math.random() * 100}vw;animation-delay:${Math.random() * 0.8}s;font-size:${18 + Math.random() * 18}px` : `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 40}px;font-size:${16 + Math.random() * 14}px` }, emojis[i % emojis.length])
    document.body.append(e); setTimeout(() => e.remove(), 2400)
  }
}

const api = async (chemin, corps) => {
  const r = await fetch(chemin, corps ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) } : undefined)
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.erreur || 'Le serveur ne répond pas.')
  return j
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- visuels ----------
const V = {}
V['grand-chiffre'] = (d) => {
  const v = h('div', { class: 'v' }, d.valeur)
  const n = Number(d.valeur.replace(/\s/g, '').replace(',', '.'))
  if (Number.isFinite(n) && /^[\d\s.,]+$/.test(d.valeur)) {
    const dec = (d.valeur.split(/[.,]/)[1] || '').length; const t0 = performance.now()
    const pas = (t) => { const k = Math.min(1, (t - t0) / 1200); v.textContent = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pas) }
    requestAnimationFrame(pas)
  }
  return h('div', { class: 'gc' }, d.emoji && h('div', { class: 'gce' }, d.emoji), v, d.unite && h('div', { class: 'u' }, d.unite), h('div', { class: 'l' }, d.legende))
}
V.chiffres = (d) => {
  const max = Math.max(...d.items.map((i) => i.valeur)) || 1
  const piste = []
  const el = h('div', { class: 'barres' }, d.items.map((i) => { const f = h('i'); piste.push([f, Math.max(2, (i.valeur / max) * 100)])
    return h('div', { class: 'barre' }, h('div', { class: 't' }, h('b', {}, em(i) + i.etiquette), h('span', {}, `${fmt(i.valeur)} ${i.unite}`.trim())), h('div', { class: 'piste' }, f)) }))
  requestAnimationFrame(() => requestAnimationFrame(() => piste.forEach(([f, w], k) => setTimeout(() => (f.style.width = w + '%'), k * 120))))
  return el
}
V.echelle = (d) => {
  const items = [...d.items].sort((a, b) => a.valeur - b.valeur)
  const lg = items.map((i) => Math.log10(i.valeur)); const lo = Math.floor(Math.min(...lg)), hi = Math.max(lo + 1, Math.ceil(Math.max(...lg)))
  const W = 700, H = 230, X0 = 50, X1 = W - 50, y = 115
  const x = (l) => X0 + ((l - lo) / (hi - lo)) * (X1 - X0)
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' })
  svg.append(sv('line', { x1: X0 - 10, y1: y, x2: X1 + 10, y2: y, stroke: '#3a4270', 'stroke-width': 3, 'stroke-linecap': 'round' }))
  const pasTick = Math.max(1, Math.ceil((hi - lo) / 8))
  for (let k = lo; k <= hi; k += pasTick) { svg.append(sv('line', { x1: x(k), y1: y - 6, x2: x(k), y2: y + 6, stroke: '#5a6396' }), sv('text', { x: x(k), y: y + 22, 'text-anchor': 'middle', class: 'm' }, k === 0 ? '1' : k > 0 && k < 7 ? fmt(10 ** k) : `10^${k}`)) }
  const niveaux = [-62, 66, -108, 108]; const couleurs = ['#7c8cff', '#ff7ab6', '#3dd6c6', '#ffb454', '#c084fc', '#4ade80', '#f87171']
  items.forEach((i, k) => {
    const px = x(lg[k]), dy = niveaux[k % 4], ancre = px < 110 ? 'start' : px > W - 110 ? 'end' : 'middle'
    const g = sv('g', { style: `opacity:0;transition:opacity .5s ${k * 0.15}s` })
    g.append(sv('line', { x1: px, y1: y, x2: px, y2: y + dy * 0.62, stroke: couleurs[k], 'stroke-width': 1.5 }), sv('circle', { cx: px, cy: y, r: 8, fill: couleurs[k], stroke: '#0d1122', 'stroke-width': 3 }),
      sv('text', { x: px, y: y + dy * 0.62 + (dy < 0 ? -22 : 16), 'text-anchor': ancre, 'font-weight': 700 }, em(i) + i.etiquette), sv('text', { x: px, y: y + dy * 0.62 + (dy < 0 ? -8 : 30), 'text-anchor': ancre, class: 'm' }, `${fmt(i.valeur)} ${i.unite}`.trim()))
    svg.append(g); requestAnimationFrame(() => requestAnimationFrame(() => (g.style.opacity = 1)))
  })
  return h('div', { class: 'echelle' }, svg, h('div', { class: 'note' }, 'Échelle logarithmique : chaque graduation vaut dix fois la précédente.'))
}
V.frise = (d) => h('div', { class: 'frise' }, d.evenements.map((e, k) => h('div', { class: 'fr', style: `animation-delay:${k * 0.12}s` }, h('b', {}, e.annee), h('div', {}, em(e) + e.titre), e.detail && h('small', {}, e.detail))))
V.comparaison = (d) => h('div', { class: 'vs' }, [d.gauche, d.droite].map((c) => h('div', {}, h('h4', {}, em(c) + c.titre), h('ul', {}, c.points.map((p) => h('li', {}, p))))))
// disposition en couronne : sert à l'anatomie (rayons) et aux cycles (flèches)
function couronne(items, { centre, cycle }) {
  const n = items.length, R = 38
  const pos = (k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / n; return [50 + R * Math.cos(a), 50 + R * Math.sin(a), a] }
  const svg = sv('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' })
  svg.append(sv('defs', {}, sv('marker', { id: 'fl', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, sv('path', { d: 'M0 0 10 5 0 10z', fill: '#3dd6c6' }))))
  const detail = h('div', { class: 'detail' }); const noeuds = []
  items.forEach((it, k) => {
    const [x, y, a] = pos(k)
    if (cycle) { const m = 0.24, a2 = -Math.PI / 2 + ((k + 1) * 2 * Math.PI) / n, p1 = [50 + R * Math.cos(a + m), 50 + R * Math.sin(a + m)], p2 = [50 + R * Math.cos(a2 - m), 50 + R * Math.sin(a2 - m)]
      svg.append(sv('path', { d: `M${p1[0]} ${p1[1]} A${R} ${R} 0 0 1 ${p2[0]} ${p2[1]}`, fill: 'none', stroke: '#3dd6c6', 'stroke-width': 1, 'marker-end': 'url(#fl)', opacity: 0.8 })) }
    else svg.append(sv('line', { x1: 50, y1: 50, x2: x, y2: y, stroke: '#4a548a', 'stroke-width': 0.7, 'stroke-dasharray': '2 1.6' }))
    const nd = h('button', { class: 'nd', style: `left:${x}%;top:${y}%;animation-delay:${0.1 + k * 0.1}s`, onclick: () => choisir(k) }, cycle ? `${it.emoji || k + 1 + '.'} ${it.titre}` : em(it) + it.nom)
    noeuds.push(nd)
  })
  const choisir = (k) => { noeuds.forEach((e, j) => e.classList.toggle('sel', j === k)); const it = items[k]; detail.replaceChildren(h('b', {}, em(it) + (it.titre ?? it.nom)), it.detail ? ' — ' + it.detail : '') }
  choisir(0)
  return h('div', {}, h('div', { class: 'radial' }, svg, h('div', { class: 'centre' }, centre), noeuds), detail)
}
V.etapes = (d) => d.cycle ? couronne(d.etapes, { centre: 'cycle', cycle: true })
  : h('div', { class: 'pas' }, d.etapes.map((e, k) => h('div', { style: `animation-delay:${k * 0.12}s` }, h('span', { class: 'n' }, e.emoji || k + 1), h('div', {}, h('b', {}, e.titre), e.detail && h('small', {}, e.detail)))))
V.anatomie = (d) => couronne(d.parties, { centre: d.centre, cycle: false })
const visuel = (kind, d) => h('div', { class: 'visuel' }, (V[kind] ?? (() => h('div')))(d))

const photo = (img, alt) => !img ? null : h('figure', { class: 'photo' }, h('img', { src: img.url, alt, loading: 'lazy', referrerpolicy: 'no-referrer', onerror: (e) => e.target.closest('figure').remove() }),
  h('figcaption', {}, '📷 ', h('a', { href: img.page, target: '_blank', rel: 'noopener noreferrer' }, 'Wikimédia Commons')))
// ---------- écrans ----------
let etat = null          // partie en cours
const vider = (...n) => { scene.replaceChildren(...n); window.scrollTo(0, 0) }

async function accueil() {
  etat = null
  vider(h('div', { class: 'entree' }, h('section', { class: 'hero' }, h('h1', {}, 'Apprends en ', h('em', {}, 'voyant.')),
    h('p', {}, 'Choisis un thème, n’importe lequel. Une IA lit Wikipédia, choisit six faits qui font « déclic » et les dessine. Un clic sur « Dis-m’en plus » ouvre un mini-cours visuel.')),
    h('form', { class: 'saisie', id: 'form', onsubmit: (e) => { e.preventDefault(); lancer($('#theme').value) } }, h('input', { id: 'theme', placeholder: 'Les trous noirs, la Révolution, le jazz…', maxlength: 60, autocomplete: 'off', enterkeyhint: 'go' }), h('button', { class: 'btn', type: 'submit' }, 'C’est parti 🚀')),
    h('div', { class: 'note', id: 'etatnote' }), h('div', { id: 'prets' })))
  try {
    const e = await api('/api/etat'); majCerveau(e.cerveau)
    const prets = $('#prets'); if (!prets) return
    if (e.prets.length) prets.append(h('div', { class: 'titre-section' }, '⚡ Prêts tout de suite'), h('div', { class: 'grille' }, e.prets.map((p) => h('button', { class: 'theme', onclick: () => lancer(p.theme) }, h('span', { class: 'e' }, p.emoji || '✨'), h('b', {}, p.titre), h('span', {}, p.accroche)))))
    const attente = e.graines - e.prets.length
    if (attente > 0) prets.append(h('p', { class: 'note' }, e.cerveau ? `${attente} autre${attente > 1 ? 's' : ''} thème${attente > 1 ? 's' : ''} en préparation par GPT…` : 'Le Mac qui fait tourner GPT est éteint : seuls les thèmes prêts se jouent pour l’instant.'))
    prets.append(h('div', { class: 'titre-section' }, '🎲 Ou essaie'), h('div', { class: 'puces' }, [['🕳️', 'Les trous noirs'], ['🎷', 'Le jazz'], ['⚔️', 'La Révolution française'], ['🦖', 'Les dinosaures'], ['☕', 'Le café'], ['♟️', 'Les échecs'], ['🌱', 'La photosynthèse'], ['🚤', 'Venise'], ['🍫', 'Le chocolat'], ['🐙', 'Les pieuvres']].map(([e, t]) => h('button', { class: 'puce', onclick: () => lancer(t) }, `${e} ${t}`))))
  } catch { const n = $('#etatnote'); if (n) n.textContent = 'Le serveur ne répond pas pour le moment.' }
}
function majCerveau(on) { const c = $('#cerveau'); c.classList.toggle('on', !!on); c.querySelector('span').textContent = on ? 'GPT en ligne' : 'GPT hors ligne' }
setInterval(() => { if (!etat) api('/api/etat').then((e) => majCerveau(e.cerveau)).catch(() => {}) }, 20000)

const PHASES = ['Je lis Wikipédia…', 'Je choisis les faits qui font déclic…', 'Je dessine les schémas…', 'J’écris les questions…', 'Je vérifie les chiffres…']
async function attendre(lancement, titre, sous) {
  const barre = h('div', { class: 'etapes-att' }, [0, 1, 2, 3].map(() => h('i')))
  const phase = h('p'); const t0 = Date.now()
  const ecran = h('div', { class: 'attente entree' }, h('div', { class: 'orbe' }), h('h2', {}, titre), phase, barre, sous && h('p', { class: 'note' }, sous))
  return { ecran, run: async () => {
    const r = await lancement; if (r.pret) return r.resultat
    for (;;) {
      const j = await api('/api/job/' + r.id)
      if (j.etat === 'fini') return j.resultat
      if (j.etat === 'echec') throw new Error(j.erreur)
      const k = Math.min(4, Math.floor((Date.now() - t0) / 12000))
      phase.textContent = j.etat === 'lecture' ? PHASES[0] : j.etat === 'attente' ? (j.cerveau ? (j.position > 0 ? `${j.position} personne${j.position > 1 ? 's' : ''} avant toi…` : 'GPT prend ton thème…') : 'Le Mac qui fait tourner GPT est éteint — ton thème attend son réveil.') : PHASES[Math.max(1, k)]
      ;[...barre.children].forEach((b, i) => b.classList.toggle('on', i <= (j.etat === 'lecture' ? 0 : j.etat === 'attente' ? 1 : Math.min(3, 1 + Math.floor((Date.now() - t0) / 20000)))))
      await dormir(1500)
    }
  } }
}

async function lancer(theme) {
  theme = (theme || '').trim()
  if (theme.length < 2) return $('#theme')?.focus()
  let a; try { a = await attendre(api('/api/parcours', { theme }), `« ${theme} »`, 'Premier lancement d’un thème : compte une à deux minutes. Ensuite il est instantané pour tout le monde.') } catch (e) { return erreur(e.message) }
  vider(a.ecran)
  try { const p = await a.run(); etat = { theme, p, i: 0, score: 0, serie: 0, res: [] }; carte() } catch (e) { erreur(e.message) }
}
function erreur(msg) { etat = null; vider(h('div', { class: 'attente entree' }, h('h2', {}, 'Oups'), h('p', {}, msg), h('div', { class: 'actions', style: 'justify-content:center' }, h('button', { class: 'btn', onclick: accueil }, 'Autre thème')))) }

function carte() {
  const { p, i } = etat, c = p.cartes[i]; let repondu = false
  const progres = h('div', {}, h('div', { class: 'progres' }, p.cartes.map((_, k) => h('i', { class: k < i ? (etat.res[k] ? 'fait' : 'rate') : k === i ? 'cour' : '' }))), etat.serie > 1 ? h('div', { class: 'serie' }, `🔥 série de ${etat.serie}`) : null)
  const fb = h('div'); const actions = h('div', { class: 'actions' })
  const choix = h('div', { class: 'choix' }, c.question.choix.map((t, k) => h('button', { onclick: () => repondre(k) }, h('span', { class: 'lettre' }, 'ABCD'[k]), t)))
  function repondre(k) {
    if (repondu) return; repondu = true; const avant = niveau(mem.xp)[0]
    const bon = k === c.question.bonne; etat.res[i] = bon
    etat.serie = bon ? etat.serie + 1 : 0; const gain = bon ? 10 + 5 * Math.min(etat.serie - 1, 3) : 0
    if (bon) { etat.score++; mem.xp += gain; sauver(); majXp(); const r = choix.children[k].getBoundingClientRect(); son(SONS.bon); gerbe(r.left + 40, r.top + r.height / 2, etat.serie > 2 ? ['🔥', '✨', '⭐'] : ['✨', '⭐', '🎉']); if (niveau(mem.xp)[0] > avant) { const n = niveau(mem.xp); setTimeout(() => { son(SONS.niveau); toast(`🎊 Nouveau niveau : ${n[1]} ${n[2]} !`); gerbe(null, 0, ['🎉', '🎊', '⭐', n[1]], 26) }, 500) } }
    else { son(SONS.mauvais); choix.children[k].classList.add('secoue') }
    ;[...choix.children].forEach((b, j) => { b.disabled = true; if (j === c.question.bonne) b.classList.add('bon'); else if (j === k) b.classList.add('mauvais') })
    fb.replaceChildren(h('div', { class: 'retour' + (bon ? '' : ' non') }, h('b', {}, bon ? `🎯 Déclic ! +${gain} XP${etat.serie > 1 ? ` · série de ${etat.serie} 🔥` : ''}` : '🤔 Pas tout à fait…'), c.question.pourquoi),
      c.source && h('div', { class: 'src' }, 'Source : ', h('a', { href: c.source.url, target: '_blank', rel: 'noopener noreferrer' }, `📖 Wikipédia — ${c.source.titre}`)))
    actions.replaceChildren(h('button', { class: 'btn sec', onclick: () => cours(i) }, '✨ Dis-m’en plus'), h('button', { class: 'btn', onclick: () => (i + 1 < p.cartes.length ? (etat.i++, carte()) : fin()) }, i + 1 < p.cartes.length ? 'Carte suivante ➡️' : 'Voir mon score 🏁'))
  }
  vider(h('div', {}, progres, h('article', { class: 'carte' }, h('div', { class: 'carte-t' }, h('span', { class: 'e' }, c.emoji || '💡'), h('div', {}, h('small', {}, `${p.titre} · ${i + 1}/${p.cartes.length}`), h('h2', {}, c.titre))),
    photo(c.source?.image, c.titre), h('p', { class: 'explic' }, c.explication), visuel(c.visuel, c.donnees), h('div', { class: 'q' }, h('h3', {}, c.question.enonce), choix, fb, actions)),
    h('div', { class: 'actions' }, h('button', { class: 'btn sec', onclick: () => cours(i) }, '✨ Dis-m’en plus avant de répondre'))))
}

function fin() {
  const { p, score } = etat, n = p.cartes.length
  if (score >= n - 1) setTimeout(() => gerbe(null, 0, ['🎉', '🎊', '⭐', '✨'], 30), 300)
  const msg = score === n ? 'Sans faute. Tu pourrais l’enseigner.' : score >= n - 2 ? 'Solide : l’essentiel est dans ta tête.' : score >= n / 2 ? 'Bon début — les cours « Dis-m’en plus » t’attendent.' : 'Ce thème t’a surpris : c’est exactement le but.'
  vider(h('div', { class: 'fin entree' }, h('div', { class: 'trophee' }, score === n ? '🏆' : score >= n - 2 ? '🥇' : score >= n / 2 ? '🥈' : '🌱'), h('div', { class: 'score' }, `${score}/${n}`), h('h2', {}, msg), h('p', {}, `${p.titre} · ${fmt(mem.xp)} XP au total`),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { etat = { theme: etat.theme, p, i: 0, score: 0, serie: 0, res: [] }; carte() } }, 'Rejouer 🔁'), h('button', { class: 'btn sec', onclick: accueil }, 'Autre thème 🎲')),
    p.suite.length ? h('div', {}, h('div', { class: 'titre-section' }, '🧭 Pour aller plus loin'), h('div', { class: 'puces', style: 'justify-content:center' }, p.suite.map((t) => h('button', { class: 'puce', onclick: () => lancer(t) }, t)))) : null))
}

async function cours(index) {
  const c = etat.p.cartes[index]
  const voile = h('div', { class: 'voile' }); document.body.append(voile); document.body.style.overflow = 'hidden'
  const fermer = () => { voile.remove(); document.body.style.overflow = '' }
  const entete = h('div', { class: 'cours-h' }, h('small', { class: 'note' }, `${c.emoji || ''} ${c.titre}`), h('button', { class: 'fermer', onclick: fermer }, 'Fermer ✕'))
  let a; try { a = await attendre(api('/api/cours', { theme: etat.theme, index }), 'Je prépare ton cours…', 'Une à deux minutes la première fois, instantané ensuite.') } catch (e) { voile.append(h('div', { class: 'cours' }, entete, h('p', {}, e.message))); return }
  voile.append(h('div', { class: 'cours' }, entete, a.ecran))
  try {
    const k = await a.run()
    voile.replaceChildren(h('div', { class: 'cours' }, entete, h('h1', {}, k.titre), photo(k.image, k.titre), h('p', { class: 'intro' }, k.intro),
      k.sections.map((s, n) => h('section', { class: 'section', style: `animation-delay:${Math.min(n, 3) * 0.1}s` }, h('h3', {}, h('span', { class: 'n' }, n + 1), s.titre), h('p', {}, s.texte), visuel(s.visuel, s.donnees))),
      k.aretenir.length ? h('div', { class: 'retenir' }, h('h3', {}, '💡 À retenir'), h('ul', {}, k.aretenir.map((x) => h('li', {}, x)))) : null,
      k.sources.length ? h('p', { class: 'src' }, 'Sources : ', k.sources.map((s, n) => [n ? ' · ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.titre)])) : null,
      h('div', { class: 'actions', style: 'margin-top:24px' }, h('button', { class: 'btn', onclick: fermer }, 'Retour à la partie ↩️'))))
    voile.scrollTop = 0
  } catch (e) { voile.replaceChildren(h('div', { class: 'cours' }, entete, h('p', {}, e.message))) }
}

$('#logo').addEventListener('click', accueil)
accueil()
