// Lucas App Store : cartes de l'accueil, copie de la commande, mouvement au défilement.
// Tout vient de apps.json ; la version est lue sur l'API publique des releases (repli : version écrite).
(function () {
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const racine = document.body.dataset.racine || "";
  const cmd = a => `curl -fsSL https://raw.githubusercontent.com/${a.depot}/main/installer.sh | zsh`;
  const img = (c, cls) => c.sombre
    ? `<picture><source srcset="${racine}${esc(c.sombre)}" media="(prefers-color-scheme: dark)"><img ${cls ? `class="${cls}" ` : ""}src="${racine}${esc(c.src)}" alt="${esc(c.alt)}" loading="lazy"></picture>`
    : `<img ${cls ? `class="${cls}" ` : ""}src="${racine}${esc(c.src)}" alt="${esc(c.alt)}" loading="lazy">`;

  function version(a, racineEl) {
    if (!a.depot) return;
    fetch(`https://api.github.com/repos/${a.depot}/releases/latest`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => { if (j.tag_name) racineEl.querySelectorAll("[data-v]").forEach(e => e.textContent = "Version " + j.tag_name.replace(/^v/, "")); })
      .catch(() => {});
  }
  function copier(btn, a) {
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(cmd(a)); }
      catch (e) { location.href = `${racine}${a.id}/#installer`; return; }
      const t = btn.textContent; btn.textContent = "Copié"; btn.classList.add("ok");
      setTimeout(() => { btn.textContent = t; btn.classList.remove("ok"); }, 2200);
    });
  }

  // apparition au défilement
  function reveler() {
    const els = document.querySelectorAll(".rv:not(.vu)");
    if (reduit || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("vu")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vu"); io.unobserve(e.target); } }), { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(e => io.observe(e));
  }
  // fond qui dérive, bande de captures qui défile, barre qui se resserre
  function mouvement() {
    const nav = document.querySelector(".nav"), fond = document.querySelector(".fond"), bande = document.getElementById("bande");
    let tick = false;
    const maj = () => {
      tick = false;
      const y = scrollY;
      if (nav) nav.classList.toggle("serre", y > 40);
      if (reduit) return;
      if (fond) fond.style.setProperty("--dy", (y * -.08).toFixed(1) + "px");
      if (bande) {
        const r = bande.parentElement.getBoundingClientRect(), h = innerHeight;
        const p = Math.min(1, Math.max(0, (h - r.top) / (h + r.height)));
        const trop = Math.max(0, bande.scrollWidth - bande.parentElement.clientWidth);
        bande.style.transform = `translate3d(${(-trop * p).toFixed(1)}px,0,0)`;
      }
    };
    addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(maj); } }, { passive: true });
    maj();
  }


  async function charger() {
    try { return await (await fetch(racine + "apps.json", { cache: "no-cache" })).json(); } catch (e) { return null; }
  }

  async function accueil() {
    const grille = document.getElementById("grille");
    const data = await charger();
    if (!data) { grille.textContent = "Les apps ne se chargent pas. Réessayer plus tard."; return; }
    data.apps.forEach((a, i) => {
      const t = document.createElement("article");
      t.className = "tuile rv"; t.style.setProperty("--c", a.couleur); t.style.setProperty("--d", (i * 90) + "ms"); t.id = a.id;
      t.innerHTML = `
        <a class="ico" href="${esc(a.page)}" aria-label="${esc(a.nom)}"><img src="${esc(a.icone)}" alt="" width="96" height="96"></a>
        <h3>${esc(a.nom)}</h3><div class="v" data-v>${a.depot ? "Version " + esc(a.version) : "Bientôt"}</div>
        <p class="ph">${esc(a.phrase)}</p>
        ${a.description ? `<p class="desc">${esc(a.description)}</p>` : ""}
        <div class="boutons">
          <a class="btn p" href="${esc(a.page)}">Découvrir</a>
          ${a.depot ? `<button class="btn" type="button" data-copier>Installer</button>
          <a class="btn" href="https://github.com/${esc(a.depot)}" rel="noopener">GitHub</a>` : ""}
        </div>`;
      grille.appendChild(t); if (a.depot) copier(t.querySelector("[data-copier]"), a); version(a, t);
    });
    const bande = document.getElementById("bande");
    const caps = data.apps.flatMap(a => a.captures.map(c => ({ a, c })));
    if (bande && caps.length) bande.innerHTML = caps.map(({ a, c }) => `<a class="vue" href="${esc(a.page)}" style="--c:${a.couleur}">${img(c)}<span>${esc(a.nom)}</span></a>`).join("");
    else if (bande) bande.closest("section").remove();
    reveler(); mouvement();
  }

  accueil();
})();
