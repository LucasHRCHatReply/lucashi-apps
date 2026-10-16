// Lucas App Store : cartes, fiche, copie de la commande, mouvement au défilement.
// Tout vient de apps.json ; la version est lue sur l'API publique des releases (repli : version écrite).
(function () {
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const racine = document.body.dataset.racine || "";
  const cmd = a => `curl -fsSL https://raw.githubusercontent.com/${a.depot}/main/installer.sh | zsh`;
  const zip = a => `https://github.com/${a.depot}/releases/latest/download/${a.zip}`;
  const img = (c, cls) => c.sombre
    ? `<picture><source srcset="${racine}${esc(c.sombre)}" media="(prefers-color-scheme: dark)"><img ${cls ? `class="${cls}" ` : ""}src="${racine}${esc(c.src)}" alt="${esc(c.alt)}" loading="lazy"></picture>`
    : `<img ${cls ? `class="${cls}" ` : ""}src="${racine}${esc(c.src)}" alt="${esc(c.alt)}" loading="lazy">`;

  function version(a, racineEl) {
    fetch(`https://api.github.com/repos/${a.depot}/releases/latest`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => { if (j.tag_name) racineEl.querySelectorAll("[data-v]").forEach(e => e.textContent = "Version " + j.tag_name.replace(/^v/, "")); })
      .catch(() => {});
  }
  function copier(btn, a) {
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(cmd(a)); }
      catch (e) { location.href = `${racine}fiche/?app=${a.id}#installer`; return; }
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


  // étape Gatekeeper : trois vignettes en HTML, fidèles à macOS, pas des captures
  function dmgBloc(a) {
    const url = `https://github.com/${a.depot}/releases/latest/download/${a.dmg}`;
    const n = esc(a.nom);
    const etapes = [
      ["Blocage", "Au premier lancement, macOS refuse d'ouvrir l'app : elle est signée mais pas notarisée par Apple. Choisir « Terminé ».",
        `<div class="mac dlg"><div class="ic">${`<img src="${racine}${esc(a.icone)}" alt="" width="34" height="34">`}</div><b>« ${n} » n'a pas été ouverte</b><p>Apple n'a pas pu vérifier que « ${n} » ne contient pas de logiciel malveillant.</p><div class="bt"><span>Placer dans la corbeille</span><span class="d">Terminé</span></div></div>`],
      ["Réglages Système", "Ouvrir Réglages Système › Confidentialité et sécurité, descendre jusqu'à « Sécurité » : l'app y est listée avec un bouton.",
        `<div class="mac reg"><small>Confidentialité et sécurité</small><div class="lg"><span>« ${n} » a été bloquée pour protéger votre Mac.</span><span class="d">Ouvrir quand même</span></div></div>`],
      ["Confirmation", "macOS demande une dernière fois. Choisir « Ouvrir quand même » et entrer le mot de passe du Mac. L'app s'ouvre, et ne redemandera plus.",
        `<div class="mac dlg"><div class="ic"><img src="${racine}${esc(a.icone)}" alt="" width="34" height="34"></div><b>Ouvrir « ${n} » ?</b><p>Votre Mac ne peut pas vérifier cette app.</p><div class="bt"><span>Annuler</span><span class="d">Ouvrir quand même</span></div></div>`]
    ];
    return `<h3 class="sous rv"><span class="num">2</span> Le .dmg</h3>
          <p class="lead rv" style="margin-bottom:18px">Ouvrir le .dmg, glisser ${n} dans Applications. ${n} n'est pas notarisée : macOS la bloque au premier lancement, et ne la débloque que sur demande. La commande ci-dessus évite ce blocage.</p>
          <p class="rv"><a class="btn p" href="${esc(url)}">Télécharger le .dmg</a></p>
          <ol class="etapes rv">${etapes.map((e, i) => `<li tabindex="0"><div class="vig" aria-hidden="true">${e[2]}</div><div class="leg"><span class="n">${i + 1}</span><b>${e[0]}</b></div><p class="det">${esc(e[1])}</p></li>`).join("")}</ol>
          <p class="note rv" style="max-width:62ch">Ne jamais désactiver Gatekeeper pour installer une app. Ces vignettes sont dessinées d'après macOS, ce ne sont pas des captures.</p>`;
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
        <h3>${esc(a.nom)}</h3><div class="v" data-v>Version ${esc(a.version)}</div>
        <p class="ph">${esc(a.phrase)}</p>
        <div class="boutons">
          <a class="btn p" href="${esc(a.page)}">Découvrir</a>
          <button class="btn" type="button" data-copier>Installer</button>
          <a class="btn" href="https://github.com/${esc(a.depot)}" rel="noopener">GitHub</a>
        </div>`;
      grille.appendChild(t); copier(t.querySelector("[data-copier]"), a); version(a, t);
    });
    const bande = document.getElementById("bande");
    const caps = data.apps.flatMap(a => a.captures.map(c => ({ a, c })));
    if (bande && caps.length) bande.innerHTML = caps.map(({ a, c }) => `<a class="vue" href="${esc(a.page)}" style="--c:${a.couleur}">${img(c)}<span>${esc(a.nom)}</span></a>`).join("");
    else if (bande) bande.closest("section").remove();
    reveler(); mouvement();
  }

  async function fiche() {
    const data = await charger(); const id = new URLSearchParams(location.search).get("app");
    const a0 = data && data.apps.find(x => x.id === id);
    const a = a0 && Object.assign({ points: [], requis: [], captures: [] }, a0);
    const cible = document.getElementById("fiche");
    if (!a) { location.replace(racine || "../"); return; }
    document.title = `${a.nom} — Apps de Lucas`;
    document.documentElement.style.setProperty("--c", a.couleur);
    document.querySelector('meta[name="description"]').content = a.phrase;
    const releases = `https://github.com/${a.depot}/releases`;
    cible.innerHTML = `
      <header class="app-hero wrap">
        <img class="ic" src="${racine}${esc(a.icone)}" alt="" width="104" height="104">
        <h1>${esc(a.nom)}</h1><p>${esc(a.phrase)}</p>
        <div class="boutons">
          <a class="btn p" href="${esc(zip(a))}">Télécharger</a>
          <a class="btn" href="#installer">Installer</a>
          <a class="btn" href="https://github.com/${esc(a.depot)}" rel="noopener">GitHub</a>
        </div>
        <div class="v" data-v style="margin-top:16px;opacity:.85">Version ${esc(a.version)}</div>
      </header>
      ${a.captures.length ? `<div class="wrap galerie rv">${a.captures.map(c => `<div class="vitre">${img(c)}</div>`).join("")}</div>` : ""}
      <div class="plat" style="margin-top:80px">
        <section><div class="wrap">
          ${a.points.length ? `<div class="trois">${a.points.map(p => `<div class="rv"><b>${esc(p[0])}</b><span>${esc(p[1])}</span></div>`).join("")}</div>` : ""}
          ${a.page_vente ? `<p style="margin-top:36px" class="rv"><a class="btn" href="${racine}${esc(a.page_vente)}">Voir la page complète</a></p>` : ""}
        </div></section>
        <section id="installer"><div class="wrap">
          <h2 class="t rv">Installer.</h2>
          <p class="lead rv">Une commande, dans Terminal. Elle installe, et met à jour les fois suivantes.</p>
          ${a.dmg ? `<h3 class="sous rv"><span class="num">1</span> La commande <span class="pastille">Recommandée</span></h3>` : ""}
          <div class="cmdbox rv"><pre class="cmd" id="cmd">${esc(cmd(a))}</pre><button class="btn p" type="button" data-copier>Copier</button></div>
          ${a.dmg ? dmgBloc(a) : ""}
          ${a.requis.length ? `<h3 class="sous rv">Configuration requise</h3>
          <ul class="liste rv">${a.requis.map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
          <p class="note rv" style="margin-top:28px"><b>${esc(a.nom)} n'est pas notarisée par Apple.</b> Elle est signée, mais la notarisation demande un compte développeur payant : macOS la juge non vérifiée au premier lancement. Le script retire ce blocage sur ${esc(a.nom)}.app seulement. Il se lit en entier : <a href="https://github.com/${esc(a.depot)}/blob/main/installer.sh" rel="noopener">installer.sh</a>.</p>
          <p class="rv" style="margin-top:22px;color:var(--ink2)">Toutes les versions : <a href="${esc(releases)}" rel="noopener">${esc(releases.replace("https://", ""))}</a></p>
        </div></section>
        <footer><div class="wrap"><a href="${racine || "./"}">Toutes les apps</a><span>© Lucas Hirschauer</span></div></footer>
      </div>`;
    copier(cible.querySelector("[data-copier]"), a); version(a, cible);
    reveler(); mouvement();
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  }

  document.body.dataset.page === "fiche" ? fiche() : accueil();
})();
