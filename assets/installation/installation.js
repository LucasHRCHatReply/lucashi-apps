/* lucashi-kit · site/installation · bloc « Installer » commun. Sans dépendance. Se recopie tel quel.
   <div data-lucashi-installation data-nom="Pince" data-depot="LucasHRCHatReply/pince-releases"
        data-couleur="#009EFF" data-icone="icone.png" data-dmg="Pince.dmg"
        data-requis='["macOS 15 ou plus","Mac à puce Apple"]'></div>
   data-dmg : à renseigner seulement si la Release contient vraiment le .dmg. Sans lui, pas de bloc .dmg. */
(function () {
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function monter(el) {
    var d = el.dataset, nom = esc(d.nom), depot = d.depot, dmg = d.dmg || "";
    var requis = []; try { requis = JSON.parse(d.requis || "[]"); } catch (e) {}
    var cmd = "curl -fsSL https://raw.githubusercontent.com/" + depot + "/main/installer.sh | zsh";
    var ico = d.icone ? '<img src="' + esc(d.icone) + '" alt="" width="34" height="34">' : "";
    var etapes = [
      ["Blocage", "Au premier lancement, macOS refuse d'ouvrir l'app : elle est signée mais pas notarisée par Apple. Choisir « Terminé ».",
        '<div class="lk-mac">' + ico + '<b>« ' + nom + ' » n\'a pas été ouverte</b><p>Apple n\'a pas pu vérifier que « ' + nom + ' » ne contient pas de logiciel malveillant.</p><div class="lk-bt"><span>Placer dans la corbeille</span><span class="lk-d">Terminé</span></div></div>'],
      ["Réglages Système", "Ouvrir Réglages Système › Confidentialité et sécurité, descendre jusqu'à « Sécurité » : l'app y est listée avec un bouton.",
        '<div class="lk-mac lk-reg"><small>Confidentialité et sécurité</small><div class="lk-lg"><span>« ' + nom + ' » a été bloquée pour protéger votre Mac.</span><span class="lk-d">Ouvrir quand même</span></div></div>'],
      ["Confirmation", "macOS demande une dernière fois. Choisir « Ouvrir quand même » et entrer le mot de passe du Mac. L'app s'ouvre, et ne redemandera plus.",
        '<div class="lk-mac">' + ico + '<b>Ouvrir « ' + nom + ' » ?</b><p>Votre Mac ne peut pas vérifier cette app.</p><div class="lk-bt"><span>Annuler</span><span class="lk-d">Ouvrir quand même</span></div></div>']
    ];
    el.classList.add("lk-inst"); if (d.couleur) el.style.setProperty("--lk-c", d.couleur);
    el.innerHTML =
      '<h2>Installer.</h2><p class="lk-lead">Une commande, dans Terminal. Elle installe, et met à jour les fois suivantes.</p>' +
      (dmg ? '<h3><span class="lk-num">1</span> La commande <span class="lk-tag">Recommandée</span></h3>' : "") +
      '<div class="lk-cmd"><pre>' + esc(cmd) + '</pre><button class="lk-btn" type="button">Copier</button></div>' +
      (dmg ? '<h3><span class="lk-num">2</span> Le .dmg</h3><p class="lk-lead" style="margin-bottom:16px">Ouvrir le .dmg, glisser ' + nom + ' dans Applications. ' + nom + ' n\'est pas notarisée : macOS la bloque au premier lancement et ne la débloque que sur demande. La commande ci-dessus évite ce blocage.</p>' +
        '<a class="lk-btn" href="https://github.com/' + esc(depot) + '/releases/latest/download/' + esc(dmg) + '">Télécharger le .dmg</a>' +
        '<ol class="lk-steps">' + etapes.map(function (e, i) { return '<li tabindex="0"><div class="lk-vig" aria-hidden="true">' + e[2] + '</div><div class="lk-leg"><span class="lk-n">' + (i + 1) + '</span>' + e[0] + '</div><p class="lk-det">' + esc(e[1]) + '</p></li>'; }).join("") + '</ol>' +
        '<p class="lk-note">Ne jamais désactiver Gatekeeper pour installer une app. Ces vignettes sont dessinées d\'après macOS, ce ne sont pas des captures.</p>' : "") +
      (requis.length ? '<h3>Configuration requise</h3><ul class="lk-req">' + requis.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>" : "") +
      '<p class="lk-note"><b>' + nom + ' n\'est pas notarisée par Apple.</b> Elle est signée, mais la notarisation demande un compte développeur payant : macOS la juge non vérifiée au premier lancement. Le script retire ce blocage sur ' + nom + '.app seulement. Il se lit en entier : <a href="https://github.com/' + esc(depot) + '/blob/main/installer.sh" rel="noopener">installer.sh</a>. Toutes les versions : <a href="https://github.com/' + esc(depot) + '/releases" rel="noopener">releases</a>.</p>';
    var b = el.querySelector("button");
    b.addEventListener("click", function () {
      var ok = function () { var t = b.textContent; b.textContent = "Copié"; b.classList.add("lk-ok"); setTimeout(function () { b.textContent = t; b.classList.remove("lk-ok"); }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cmd).then(ok, function () { sel(); });
      else sel();
      function sel() { var r = document.createRange(); r.selectNodeContents(el.querySelector("pre")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    });
  }
  // Arrivée par l'ancre (…/#installer) : le navigateur a calculé sa position avant que le bloc existe, et les images
  // de la page décalent la mise en page ensuite. On recale la vue sur le bloc après le montage, puis une fois la page chargée.
  function recaler(el) {
    var h = decodeURIComponent((location.hash || "").slice(1));
    if (!h) return;
    var cible = document.getElementById(h);
    if (!cible || !(cible === el || cible.contains(el) || el.contains(cible))) return;
    var aller = function () { cible.scrollIntoView({ block: "start", behavior: "instant" }); };
    aller(); requestAnimationFrame(aller); addEventListener("load", aller, { once: true });
  }
  function tout() { document.querySelectorAll("[data-lucashi-installation]").forEach(function (el) { monter(el); recaler(el); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tout); else tout();
  window.LucashiInstallation = { monter: monter };
})();
