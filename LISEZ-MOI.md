# app.lucashi.fr — les apps de Lucas

Site statique (HTML, CSS, un peu de JS) publié par GitHub Pages depuis la branche `main`.
Adresse définitive : https://app.lucashi.fr — adresse provisoire : https://lucashrchatreply.github.io/lucashi-apps/

## Mettre à jour la page d'une app (une commande)

```
~/lucashi-apps/scripts/mettre-a-jour.sh pince
```

Le script reconstruit la page de vente depuis le dépôt local de l'app (champ `source_page` de `apps.json`), la recopie
dans `pince/index.html`, lance le contrôle, commite et pousse. Le site est à jour une minute plus tard.
`--sans-push` s'arrête avant le push.

## Ajouter une app (deux commandes)

1. Le dépôt public `<app>-releases` existe, avec une Release qui contient le zip (comme Pince et Jauge).
2. ```
   cd ~/lucashi-apps
   scripts/ajouter-app.sh tiroir Tiroir "Une phrase." "#23CC99" LucasHRCHatReply/tiroir-releases Tiroir.zip ~/Tiroir/Resources/AppIcon.icns ~/Tiroir/site
   ```
   Cela convertit l'icône, ajoute l'entrée dans `apps.json` et recopie la page de vente. Pour que la carte de l'accueil
   montre des captures, poser les images dans `tiroir/` et les lister dans `captures` de l'entrée (`src`, `alt`,
   et `sombre` pour une version sombre).
3. `git push` (le contrôle se lance tout seul avant) — ou `scripts/mettre-a-jour.sh tiroir` pour commiter et pousser.

Sans page de vente à recopier (comme Jauge) : écrire `<id>/index.html` à la main, `source_page` reste `null`.

## `apps.json`

Une entrée par app : `id`, `nom`, `phrase`, `couleur`, `icone`, `captures`, `page`, `depot` (dépôt public des releases),
`zip` (nom du fichier de la Release), `version` (repli), `source_page`, `build_page`, `page_construite`.
Au chargement, l'accueil lit la version sur l'API publique des releases ; si elle ne répond pas, il affiche `version`.
Le bouton « Télécharger » pointe sur `releases/latest/download/<zip>` : il suit toujours la dernière Release.

## Le contrôle avant push

`scripts/controle.sh` refuse (et bloque le push) s'il trouve dans les fichiers du site : un nom de client, un chemin de
la machine, un jeton, une adresse e-mail (hors adresses d'exemple), un lien vers un dépôt non public. Il est branché
comme hook `pre-push` (`git config core.hooksPath scripts/hooks`, déjà fait ; à refaire après un nouveau `git clone`).

## DNS chez IONOS (à faire par Lucas)

Dans IONOS › Domaines › lucashi.fr › DNS › Ajouter un enregistrement :

| Type | Hôte | Valeur | TTL |
|---|---|---|---|
| CNAME | `app` | `lucashrchatreply.github.io` | 1 heure |

Vérifier après quelques minutes :

```
dig +short app.lucashi.fr
```

La réponse doit contenir `lucashrchatreply.github.io.` puis des adresses GitHub (185.199.108–111.153).

## Activer HTTPS (une fois le DNS propagé)

Le domaine est déjà déclaré dans Pages (fichier `CNAME`). GitHub émet le certificat seul, de quelques minutes à une heure
après la propagation. Ensuite : dépôt `lucashi-apps` › Settings › Pages › cocher **Enforce HTTPS**. En ligne de commande :

```
~/.local/bin/gh api -X PUT repos/LucasHRCHatReply/lucashi-apps/pages -F https_enforced=true
```

Contrôle : `curl -sI https://app.lucashi.fr | head -1` doit répondre `HTTP/2 200`.

## Contenu du dépôt

| Chemin | Rôle |
|---|---|
| `index.html`, `assets/` | accueil, styles, script des cartes, icônes, image d'aperçu (`og.png`) |
| `apps.json` | toutes les apps |
| `pince/` | page de vente de Pince (copie de `~/Pince/site`, ne pas la modifier ici) |
| `jauge/` | page de vente de Jauge, écrite ici |
| `scripts/` | `mettre-a-jour.sh`, `ajouter-app.sh`, `controle.sh`, hook `pre-push` |
| `CNAME` | `app.lucashi.fr` |
