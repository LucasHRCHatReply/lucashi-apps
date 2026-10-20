# Ajouter un outil gratuit

Un outil = un dossier `src/outils/<id>/`. Aucun fichier commun à modifier : les routes, le hub, l'accueil, le sitemap et l'image de partage le découvrent seuls.

1. Copier `_modele/` vers `src/outils/<id>/` (le préfixe `_` exclut le modèle de la publication ; `OUTILS_MODELE=1 npm run dev` l'affiche pour l'essayer).
2. `outil.ts` : la logique pure (aucun DOM), et `outil.test.ts` : des cas réels, valeurs de référence sourcées.
3. `Outil.astro` : l'interface, avec les composants de `src/composants/` (`ZoneDepot`, `Champ`, `Choix`, `Resultat`, `Telecharger`, `Note`, `Bouton`) — jamais recréés. Il reçoit `lang` (`'fr' | 'en'`). Son `<script>` importe `./outil`, `../../lib/ui` et `../../lib/compteur`.
4. `fr.md` (et `en.md` pour un outil universel) : frontmatter validé par `src/lib/schema-fiche.ts` (titre ≤ 60 caractères, description 140 à 160, icône de `src/lib/icones.ts`, catégorie `images | documents | argent | pratique`), puis 300 à 700 mots utiles. `calcul: true` pour un outil de calcul.
5. Appeler `compter('utilise', '<id>')` (de `../../lib/compteur`) une fois par résultat produit ; la vue est comptée par le gabarit.
6. Affichage du résultat : `afficherResultat(id, texte)` ; téléchargement : `proposerTelechargement(id, [{ nom, donnees, type }])` (un fichier = un bouton, plusieurs = un zip). Les deux blocs restent cachés tant qu'ils n'ont rien à montrer.
7. Assets lourds (wasm, données de langue) : `public/outils-assets/<id>/`, chargés au premier usage (`fetch` ou `import()` au clic), jamais à l'ouverture. Librairies par npm, servies par le site : aucun appel tiers.
8. `npm run verifier` doit passer (types, tests, build, contrôle du dépôt public).

Chemins : FR `/outils/<slug>/`, EN `/en/tools/<slug>/`. Image de partage : `/og/<lang>/<id>.png`, générée.
