// Lucas App Store : l'accueil. Les cartes sont construites par Astro depuis apps.json ;
// ici : filtres par famille, recherche, version lue sur l'API publique des releases, mouvement au défilement.
(function () {
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  // version publiée (repli : la version écrite dans apps.json, déjà affichée)
  function versions() {
    document.querySelectorAll(".ac-app[data-depot]").forEach(carte => {
      const v = carte.querySelector("[data-v]");
      if (!v) return;
      fetch(`https://api.github.com/repos/${carte.dataset.depot}/releases/latest`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(j => { if (j.tag_name) v.textContent = (carte.dataset.pre ? "Préversion " : "Version ") + j.tag_name.replace(/^v/, ""); })
        .catch(() => {});
    });
  }

  // filtres par famille + recherche ; l'état vit dans l'adresse (?f=systeme&q=batterie)
  function filtres() {
    const champ = document.getElementById("cherche"), chips = [...document.querySelectorAll(".ac-chip")];
    const cartes = [...document.querySelectorAll(".ac-app")], groupes = [...document.querySelectorAll(".ac-groupe")];
    const vide = document.getElementById("vide"), statut = document.getElementById("statut");
    if (!champ || !cartes.length) return;
    const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const p = new URLSearchParams(location.search);
    let f = chips.some(c => c.dataset.f === p.get("f")) ? p.get("f") : "tout";
    champ.value = p.get("q") || "";

    function appliquer() {
      const mots = norm(champ.value).split(/\s+/).filter(Boolean);
      const trouve = c => mots.every(m => c.dataset.index.includes(m));
      // les compteurs des familles suivent la recherche
      const n = { tout: 0 };
      cartes.forEach(c => { if (trouve(c)) { n.tout++; n[c.dataset.famille] = (n[c.dataset.famille] || 0) + 1; } });
      document.querySelectorAll("[data-n]").forEach(i => { i.textContent = n[i.dataset.n] || 0; });
      chips.forEach(c => c.setAttribute("aria-pressed", String(c.dataset.f === f)));
      let total = 0;
      cartes.forEach(c => { const ok = trouve(c) && (f === "tout" || c.dataset.famille === f); c.hidden = !ok; if (ok) total++; });
      groupes.forEach(g => {
        const visibles = g.querySelectorAll(".ac-app:not([hidden])").length;
        g.hidden = !visibles;
        const s = g.querySelector("h2 span"); if (s) s.textContent = visibles;
      });
      vide.hidden = total > 0;
      statut.textContent = mots.length || f !== "tout" ? `${total} app${total > 1 ? "s" : ""}` : "";
      const q = new URLSearchParams();
      if (f !== "tout") q.set("f", f);
      if (champ.value.trim()) q.set("q", champ.value.trim());
      const s = q.toString();
      history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + location.hash);
    }
    chips.forEach(c => c.addEventListener("click", () => { f = c.dataset.f; appliquer(); }));
    champ.addEventListener("input", appliquer);
    champ.addEventListener("keydown", e => {
      if (e.key === "Escape") { champ.value = ""; appliquer(); }
      if (e.key === "Enter") { const premiere = cartes.find(c => !c.hidden); if (premiere) location.href = premiere.querySelector("h3 a").href; }
    });
    document.getElementById("raz").addEventListener("click", () => { champ.value = ""; f = "tout"; appliquer(); champ.focus(); });
    addEventListener("keydown", e => {
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); champ.focus(); champ.select(); }
    });
    appliquer();
    // sur téléphone, la puce choisie reste visible dans la rangée qui défile
    const choisie = chips.find(c => c.dataset.f === f), rang = choisie && choisie.parentElement;
    if (rang && rang.scrollWidth > rang.clientWidth) rang.scrollLeft = Math.max(0, choisie.offsetLeft - rang.offsetLeft - 20);
  }

  // apparition au défilement (section « Ce que je construis »)
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

  filtres(); versions(); reveler(); mouvement();
})();

// Cartes de skill : « Copier le prompt » met dans le presse-papiers le prompt d'installation à coller dans Claude Code.
document.querySelectorAll("[data-prompt]").forEach(b => b.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(b.dataset.prompt); }
  catch { const z = document.createElement("textarea"); z.value = b.dataset.prompt; document.body.append(z); z.select(); document.execCommand("copy"); z.remove(); }
  const avant = b.textContent; b.textContent = "✓ Copié — collez-le dans Claude"; setTimeout(() => { b.textContent = avant; }, 2200);
}));
