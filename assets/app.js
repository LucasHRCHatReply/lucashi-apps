// Construit les cartes de l'accueil depuis apps.json ; lit la version sur l'API publique des releases
// avec repli sur la version écrite dans apps.json.
(async function () {
  const cible = document.getElementById("cartes");
  if (!cible) return;
  let data;
  try { data = await (await fetch("apps.json", { cache: "no-cache" })).json(); }
  catch (e) { cible.textContent = "Les apps ne se chargent pas. Réessayer plus tard."; return; }
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h) n.innerHTML = h; return n; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  for (const a of data.apps) {
    const zip = `https://github.com/${a.depot}/releases/latest/download/${a.zip}`;
    const caps = a.captures.map(c => c.sombre
      ? `<picture><source srcset="${esc(c.sombre)}" media="(prefers-color-scheme: dark)"><img src="${esc(c.src)}" alt="${esc(c.alt)}" loading="lazy"></picture>`
      : `<img src="${esc(c.src)}" alt="${esc(c.alt)}" loading="lazy">`).join("");
    const carte = el("article", "carte" + (a.large ? " large" : ""));
    carte.style.setProperty("--c", a.couleur);
    carte.id = a.id;
    carte.innerHTML = `
      <div>
        <div class="tete"><img class="ic" src="${esc(a.icone)}" alt="" width="64" height="64">
          <div><h2>${esc(a.nom)}</h2><div class="v" data-v>Version ${esc(a.version)}</div></div></div>
        <p class="ph">${esc(a.phrase)}</p>
        <div class="boutons">
          <a class="btn p" href="${esc(a.page)}">Découvrir</a>
          <a class="btn" href="${esc(zip)}" data-zip>Télécharger</a>
          <a class="btn" href="https://github.com/${esc(a.depot)}" rel="noopener">GitHub</a>
        </div>
      </div>
      <div class="caps${a.captures.length > 1 ? " deux" : ""}">${caps}</div>`;
    cible.appendChild(carte);
    fetch(`https://api.github.com/repos/${a.depot}/releases/latest`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => { if (j.tag_name) carte.querySelector("[data-v]").textContent = "Version " + j.tag_name.replace(/^v/, ""); })
      .catch(() => {});
  }
})();
