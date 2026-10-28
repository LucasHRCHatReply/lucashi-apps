// Pose le bloc « Le problème / La solution » juste après le héros de chaque page de vente.
// Textes : scripts/arguments.json. Relançable : le bloc entre ses marqueurs est remplacé.
// Usage : node scripts/poser-arguments.mjs [id…]   (sans argument : toutes les apps)
import fs from 'node:fs';

const DEBUT = '<!-- arguments:debut -->', FIN = '<!-- arguments:fin -->';
const textes = JSON.parse(fs.readFileSync(new URL('./arguments.json', import.meta.url)));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(textes);
const esc = (s) => s.replace(/ ([%:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0').replace(/&/g, '&amp;').replace(/</g, '&lt;');

const style = `<style>
.pbsol{--pb-fond:#f5f5f7;--pb-carte:#fff;--pb-texte:#1d1d1f;--pb-doux:#6e6e73;--pb-rouge:#e5484d;--pb-vert:#30a46c;
  background:var(--pb-fond);color:var(--pb-texte);padding:72px 16px;font-family:inherit}
@media (prefers-color-scheme:dark){.pbsol{--pb-fond:#111113;--pb-carte:#1c1c1f;--pb-texte:#f5f5f7;--pb-doux:#a1a1a6}}
.pbsol .pb-in{max-width:1040px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:20px}
.pbsol .pb-c{background:var(--pb-carte);border-radius:24px;padding:32px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 30px rgba(0,0,0,.06)}
.pbsol .pb-t{font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:0 0 18px;display:flex;align-items:center;gap:8px}
.pbsol .pb-t i{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;color:#fff;font-style:normal;font-size:13px}
.pbsol .pb-p .pb-t{color:var(--pb-rouge)}.pbsol .pb-p .pb-t i{background:var(--pb-rouge)}
.pbsol .pb-s .pb-t{color:var(--pb-vert)}.pbsol .pb-s .pb-t i{background:var(--pb-vert)}
.pbsol ul{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.pbsol li{font-size:19px;line-height:1.45;color:var(--pb-doux)}
.pbsol li:last-child{color:var(--pb-texte);font-weight:600}
.pbsol .pb-s p:not(.pb-t){margin:0;font-size:22px;line-height:1.45;font-weight:600}
@media (max-width:760px){.pbsol{padding:48px 16px}.pbsol .pb-in{grid-template-columns:1fr}.pbsol .pb-c{padding:24px}.pbsol li{font-size:17px}.pbsol .pb-s p:not(.pb-t){font-size:19px}}
</style>`;

function bloc({ probleme, solution }) {
  return `${DEBUT}\n${style}\n<section class="pbsol" id="probleme-solution" aria-label="Le problème et la solution"><div class="pb-in">
<div class="pb-c pb-p"><p class="pb-t"><i>!</i>Le problème</p><ul>${probleme.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
<div class="pb-c pb-s"><p class="pb-t"><i>✓</i>La solution</p><p>${esc(solution)}</p></div>
</div></section>\n${FIN}`;
}

for (const id of ids) {
  const f = `public/${id}/index.html`;
  if (!fs.existsSync(f) || !textes[id]) { console.log(`${id} : ignorée (page ou texte absent)`); continue; }
  let s = fs.readFileSync(f, 'utf8');
  const a = s.indexOf(DEBUT), b = s.indexOf(FIN);
  if (a >= 0 && b > a) s = s.slice(0, a) + s.slice(b + FIN.length);
  if (/id="probleme"/.test(s)) { fs.writeFileSync(f, s); console.log(`${id} : a déjà sa propre section « problème », rien posé`); continue; }
  const fin = s.indexOf('</header>');
  if (fin < 0) { console.log(`${id} : pas de </header>, rien posé`); continue; }
  const k = fin + '</header>'.length;
  s = s.slice(0, k) + '\n' + bloc(textes[id]) + s.slice(k);
  fs.writeFileSync(f, s);
  console.log(`${id} : posé`);
}
