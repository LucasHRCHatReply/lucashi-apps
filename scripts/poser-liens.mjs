// Pose le bloc « Va bien avec » (deux ou trois apps voisines) juste avant le pied de chaque page de vente.
// Paires et raisons : scripts/liens.json ; nom, icône et page : public/apps.json. Relançable.
// Usage : node scripts/poser-liens.mjs [id…]   (sans argument : toutes les apps)
import fs from 'node:fs';

const DEBUT = '<!-- liens:debut -->', FIN = '<!-- liens:fin -->';
const liens = JSON.parse(fs.readFileSync(new URL('./liens.json', import.meta.url)));
const apps = Object.fromEntries(JSON.parse(fs.readFileSync('public/apps.json')).apps.map((a) => [a.id, a]));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(liens);
const esc = (s) => s.replace(/ ([%:;?!»])/g, ' $1').replace(/« /g, '« ').replace(/&/g, '&amp;').replace(/</g, '&lt;');

const style = `<style>
.vba{--vb-fond:#f5f5f7;--vb-carte:#fff;--vb-texte:#1d1d1f;--vb-doux:#6e6e73;--vb-trait:rgba(0,0,0,.08);
  background:var(--vb-fond);color:var(--vb-texte);padding:72px 16px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;text-align:left}
@media (prefers-color-scheme:dark){.vba{--vb-fond:#111113;--vb-carte:#1c1c1f;--vb-texte:#f5f5f7;--vb-doux:#a1a1a6;--vb-trait:rgba(255,255,255,.1)}}
.vba .vb-in{max-width:1040px;margin:0 auto}
.vba .vb-s{font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--vb-doux);margin:0 0 8px}
.vba .vb-h{font-size:32px;line-height:1.15;font-weight:700;letter-spacing:-.02em;margin:0 0 28px;color:var(--vb-texte)}
.vba .vb-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.vba a.vb-c{display:flex;gap:16px;align-items:flex-start;background:var(--vb-carte);border:1px solid var(--vb-trait);border-radius:22px;padding:20px;
  text-decoration:none;color:inherit;transition:transform .2s ease,box-shadow .2s ease}
.vba a.vb-c:hover,.vba a.vb-c:focus-visible{transform:translateY(-3px);box-shadow:0 12px 34px rgba(0,0,0,.14);outline:none}
.vba .vb-c img{width:56px;height:56px;flex:none;border-radius:13px}
.vba .vb-n{display:block;font-size:18px;font-weight:650;margin:2px 0 4px;color:var(--vb-texte)}
.vba .vb-n i{font-style:normal;font-weight:500;color:var(--vb-c,var(--vb-doux));margin-left:6px;transition:margin .2s ease}
.vba a.vb-c:hover .vb-n i{margin-left:10px}
.vba .vb-r{display:block;font-size:15px;line-height:1.45;color:var(--vb-doux)}
.vba .vb-t{margin:24px 0 0;font-size:15px}.vba .vb-t a{color:var(--vb-doux)}
@media (max-width:760px){.vba{padding:48px 16px}.vba .vb-h{font-size:26px}}
@media (prefers-reduced-motion:reduce){.vba a.vb-c{transition:none}.vba a.vb-c:hover{transform:none}}
</style>`;

function bloc(id) {
  const cartes = liens[id].filter(([v]) => apps[v]).map(([v, raison]) => {
    const a = apps[v];
    return `<a class="vb-c" href="../${a.page}" style="--vb-c:${a.couleur}"><img src="../${a.icone}" alt="" width="56" height="56" loading="lazy">` +
      `<span><span class="vb-n">${esc(a.nom)}<i aria-hidden="true">→</i></span><span class="vb-r">${esc(raison)}</span></span></a>`;
  }).join('\n');
  return `${DEBUT}\n${style}\n<section class="vba" id="va-bien-avec" aria-label="Apps de la même collection"><div class="vb-in">
<p class="vb-s">Même collection</p><p class="vb-h">Va bien avec</p>
<div class="vb-g">\n${cartes}\n</div>
<p class="vb-t"><a href="../">Toutes les apps →</a></p>
</div></section>\n${FIN}\n`;
}

for (const id of ids) {
  const f = `public/${id}/index.html`;
  if (!fs.existsSync(f) || !liens[id]) { console.log(`${id} : ignorée (page ou liens absents)`); continue; }
  let s = fs.readFileSync(f, 'utf8');
  const a = s.indexOf(DEBUT), b = s.indexOf(FIN);
  if (a >= 0 && b > a) s = s.slice(0, a) + s.slice(b + FIN.length).replace(/^\n/, '');
  const k = s.lastIndexOf('<footer');
  if (k < 0) { console.log(`${id} : pas de <footer>, rien posé`); continue; }
  fs.writeFileSync(f, s.slice(0, k) + bloc(id) + s.slice(k));
  console.log(`${id} : liens posés`);
}
