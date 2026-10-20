# app.lucashi.fr — les apps de Lucas (le « Lucas App Store »)

Site statique construit par **Astro 5** (TypeScript, Node 22) : l'accueil, les pages d'apps, et des **outils gratuits** pour le référencement
(`src/outils/`, voir `src/outils/LISEZ-MOI.md`). Le VPS construit et sert `dist/` ; adresse de dev : https://apps.srv875929.hstgr.cloud,
adresse définitive : https://app.lucashi.fr. Les pages d'apps, `assets/` et `apps.json` vivent dans `public/` et sont servis tels quels.

```
npm ci            # une fois
npm run dev       # développement (OUTILS_MODELE=1 npm run dev : affiche l'outil modèle)
npm run verifier  # astro check + tests + build + contrôle du dépôt public sur dist/
```

Variables de construction : `SITE_URL` (défaut : adresse de dev) et `INDEXABLE` (défaut `false` : `noindex` partout, `robots.txt` interdit tout).
Production : `SITE_URL=https://app.lucashi.fr INDEXABLE=true npm run build`.

## Mettre à jour la page d'une app (une commande)

```
~/lucashi-apps/scripts/mettre-a-jour.sh pince
```

Le script reconstruit la page de vente depuis le dépôt local de l'app (champ `source_page` de `apps.json`), la recopie
dans `public/pince/index.html`, lance le contrôle, commite et pousse. Le site est à jour deux minutes plus tard (le VPS reconstruit).
`--sans-push` s'arrête avant le push.

## Ajouter une app (deux commandes)

1. Le dépôt public `<app>-releases` existe, avec une Release qui contient le zip (comme Pince et Jauge).
2. ```
   cd ~/lucashi-apps
   scripts/ajouter-app.sh tiroir Tiroir "Une phrase." "#23CC99" LucasHRCHatReply/tiroir-releases Tiroir.zip ~/Tiroir/Resources/AppIcon.icns ~/Tiroir/site
   ```
   Cela convertit l'icône, ajoute l'entrée dans `public/apps.json` et recopie la page de vente. Pour que la carte de l'accueil
   montre des captures, poser les images dans `public/tiroir/` et les lister dans `captures` de l'entrée (`src`, `alt`,
   et `sombre` pour une version sombre).
3. `git push` (le contrôle se lance tout seul avant) — ou `scripts/mettre-a-jour.sh tiroir` pour commiter et pousser.

Sans page de vente à recopier (comme Jauge) : écrire `public/<id>/index.html` à la main, `source_page` reste `null`.

## `public/apps.json`

Une entrée par app : `id`, `nom`, `phrase`, `couleur`, `icone`, `captures` (`src`, `alt`, `sombre`), `page` (la page de vente `<id>/`, ouverte par « Découvrir »),
`requis` (configuration requise, passée au bloc Installer),
`dmg` (nom du .dmg de la Release, seulement s'il y est vraiment : `gh release view --repo <depot>` ; sans ce champ, aucune page n'affiche de bloc .dmg), `depot` (dépôt public des releases), `zip` (nom du fichier de la Release), `version` (repli), `source_page`, `build_page`, `page_construite`.
Il n'y a pas de fiche intermédiaire : « Découvrir » ouvre la page de vente. Le bloc « Installer » (commande, .dmg, étape Gatekeeper, configuration) est commun, dans le kit privé : `lucashi-kit/site/installation` (README) ; `public/assets/installation/` en est une copie verbatim, utilisée par la page de Jauge. `fiche/?app=<id>` redirige vers `<id>/#installer`.

**Règle** : une app n'entre ici que si elle a un dépôt public `<app>-releases`. Le code reste privé ; « GitHub » pointe toujours vers ce dépôt de releases.
Au chargement, l'accueil lit la version sur l'API publique des releases ; si elle ne répond pas, il affiche `version`.
Le bouton « Télécharger » pointe sur `releases/latest/download/<zip>` : il suit toujours la dernière Release.

## Le contrôle avant push

`scripts/controle.sh [dist]` (sans argument : les fichiers suivis ; avec `dist` : aussi les fichiers construits) refuse (et bloque le push) s'il trouve dans les fichiers du site : un nom de client, un chemin de
la machine, un jeton, une adresse e-mail (hors adresses d'exemple), un lien vers un dépôt non public. Il est branché
comme hook `pre-push` (`git config core.hooksPath scripts/hooks`, déjà fait ; à refaire après un nouveau `git clone`).

## VPS

Le déploiement sur le VPS (construction, nginx ou Caddy, HTTPS, mise à jour toutes les 2 minutes, pare-feu) est préparé dans `deploiement/` : voir `deploiement/LISEZ-MOI.md`.

## DNS chez IONOS (à faire par Lucas, au passage en production)

Dans IONOS › Domaines › lucashi.fr › DNS : enregistrement **A**, hôte `app`, valeur l'IP du VPS (voir `deploiement/LISEZ-MOI.md`) ;
supprimer l'ancien CNAME vers GitHub Pages. Vérifier : `dig +short app.lucashi.fr`, puis `curl -sI https://app.lucashi.fr | head -1`.
Ensuite, dans `/etc/lucashi-apps.env` du VPS : `SITE_URL=https://app.lucashi.fr` et `INDEXABLE=true`.

## Contenu du dépôt

| Chemin | Rôle |
|---|---|
| `src/pages/index.astro` | accueil (même HTML qu'avant) + section « Outils gratuits » |
| `src/outils/<id>/` | un outil : `Outil.astro`, `outil.ts`, `outil.test.ts`, `fr.md`, `en.md` (`_modele/` = exemple, non publié) |
| `src/composants/`, `src/layouts/`, `src/lib/`, `src/styles/` | composants communs, gabarits, aides, styles des outils |
| `src/pages/outils/`, `src/pages/en/` | routes FR et EN, hubs, `sitemap.xml`, `robots.txt`, images de partage |
| `public/` | servi tel quel : `assets/`, `apps.json`, `pince/`, `jauge/`, `tiroir/`, `glisse/`, `penombre/`, `autofoldericon/`, `fiche/`, `CNAME` |
| `deploiement/` | `vps.sh` et son mode d'emploi (VPS) |
| `scripts/` | `mettre-a-jour.sh`, `ajouter-app.sh`, `controle.sh`, hook `pre-push` |
