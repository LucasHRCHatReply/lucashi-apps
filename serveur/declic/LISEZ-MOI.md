# Déclic — note de reprise (04/11/2026)

> À lire en entier avant de toucher au code. Rédigée pour qu'une session Claude sur le Mac mini reprenne le développement, en fasse un dépôt GitHub et le branche sur la plateforme de jeux.

## 1. Ce que c'est

Un jeu web de culture générale **visuel**. Le joueur choisit un thème (texte libre) ; le serveur lit des pages Wikipédia ; une IA écrit six cartes (un fait réel, un schéma, une question à choix multiple) ; un clic sur « ✨ Dis-m'en plus » ouvre un mini-cours visuel de cinq sections. Points d'expérience, niveaux, séries, photos Wikimédia, emojis, sons synthétisés.

- **Adresse** : https://declic.srv875929.hstgr.cloud (VPS Hostinger `31.97.156.179`, `noindex`).
- **Service** : `declic.service` (systemd, utilisateur `declic`, `127.0.0.1:8243`), derrière nginx (`/etc/nginx/sites-available/declic`, certificat Let's Encrypt).
- **Code sur le VPS** : `/srv/declic` (copié par rsync, pas de git). **Données** : `/var/lib/declic/cache/*.json` (un fichier par parcours ou cours généré).
- **Code source d'origine** : dépôt `lucashi-apps`, dossier `serveur/declic/` (commits `bfec8a4`, `2793b84`, branche main, sur le Mac de Lucas, non poussé).

## 2. Architecture en une image

```
Navigateur ──HTTPS──> nginx ──> server.mjs (VPS)  ──files d'attente──>  worker.mjs (Mac mini) ──> Claude Code / Codex
                                   │  Wikipédia (sources + photo)              (connexion SORTANTE, aucun port ouvert)
                                   └─ cache disque (valide, nettoie, borne tout ce que rend l'IA)
```

**Règle d'or : le VPS ne parle jamais à l'IA.** Il prépare le travail (extraits Wikipédia numérotés + prompt) et le met en file. Le worker, sur un Mac, l'interroge en long-poll (`GET /api/worker/prendre`), fait écrire le texte par le modèle de l'abonnement, et le rend (`POST /api/worker/rendre/<id>`). Les jetons de compte ne quittent jamais le Mac. Aucune clé d'API.

Un parcours = **deux moitiés** (cartes 1-3 avec titre/accroche/suite, cartes 4-6) écrites en parallèle par les deux boucles du worker, sur des sources différentes (rangs pairs / impairs). Un cours « Dis-m'en plus » = un seul appel.

## 3. Fichiers (`serveur/declic/`)

| Fichier | Rôle |
|---|---|
| `server.mjs` | Serveur sans dépendance : API publique (`/api/etat`, `/api/parcours`, `/api/cours`, `/api/job/<id>`), API worker (jeton Bearer), cache, plafonds, Wikipédia, fichiers statiques. |
| `prompts.mjs` | Prompts (`promptMoitie`, `promptParcours`, `promptCours`), **validation stricte** (`validerParcours`, `cartesValides`, `validerCours`), extraction JSON. Tout texte de l'IA est nettoyé et borné. |
| `worker.mjs` | Le worker. `MOTEUR=claude` (Claude Code, `-p`, aucun outil) ou `codex` (ChatGPT). Dossier temporaire vide, délai 240 s. |
| `public/index.html`, `jeu.css`, `jeu.js` | Le jeu. Pas de build. Tout texte serveur passe par `textContent`. Sept visuels : grand-chiffre, chiffres, echelle (log), frise, etapes/cycle, comparaison, anatomie. |
| `public/installer-mini.sh`, `public/worker.mjs` | Servis par le site : installation du worker sur un Mac (launchd). `public/worker.mjs` est une **copie** de `worker.mjs` : à recopier après modification. |
| `graines.json` | Les 8 thèmes « prêts » fabriqués seuls dès que le worker est en ligne. |
| `deployer.sh` | `installer` (première fois) / `maj` (rsync + redémarrage), depuis le Mac de Lucas (clé `~/.ssh/hostinger_vps`). |
| `lancer-worker.sh` | Lance le worker à la main (lit `~/.config/declic/worker.env`). |
| `prompts.test.mjs` | 8 tests (`node --test prompts.test.mjs`). |

## 4. Où sont les secrets (jamais dans le dépôt)

- Jeton du worker : `/etc/declic/declic.env` sur le VPS (`WORKER_TOKEN`), `~/.config/declic/worker.env` sur le Mac de Lucas, et dans le plist launchd du mini. **Ne l'affiche jamais, ne le commite jamais.**
- Aucune clé d'API nulle part.

## 5. Protections de l'abonnement (déjà en place)

80 générations par jour (tous visiteurs), 6 par IP et par 10 minutes (`CAP_JOUR`, `IP_MAX`), cache par clé (un thème déjà généré ne coûte plus rien), thème limité à 60 caractères de lettres/chiffres, modèle sans outil dans un dossier vide, sources et thème traités comme des données (prompt anti-injection), sources citées par **numéro** (le serveur met la vraie adresse : une URL inventée est impossible).

## 6. Mesures (journal `journalctl -u declic`, 04/11/2026)

- Un seul appel, Codex gpt-6-astra : 65 à 79 s. gpt-6-luna : 32 à 37 s.
- Deux moitiés en parallèle (luna) : **20 s** pour « Les volcans » (10:53). Cours « Dis-m'en plus » : 53 s (astra).
- Piège corrigé : « ne mets pas de titre » dans le prompt de la 2ᵉ moitié faisait supprimer le titre de chaque carte (3 invalides sur 3, trois essais, 63 à 68 s).
- Photos : 20 pages testées sur 20 avaient une image Wikipédia (CC BY-SA 2.0 à 4.0 ou domaine public). Miniature redimensionnée à 500 px (`thumb.wikimedia.org`).

## 7. État au moment de la note

- Le worker sur le mini tourne encore avec **Codex (gpt-6-luna)** ; Lucas vient de décider de passer à **Claude Sonnet, effort bas**, sur son compte Claude Max (`MOTEUR=claude`, déjà dans `worker.mjs` et l'installeur, **jamais testé** : relancer l'installeur sur le mini, il fait un essai « ok » avant d'installer). À mesurer : durée d'une moitié, validité (journal `moitiés A x→y B x→y`).
- Le worker du Mac de Lucas est arrêté.
- Non fait : essai sur téléphone ; écoute des sons ; mesure de la qualité des questions avec Sonnet.

## 8. Ce que Lucas demande à la session du mini

1. **Mettre le worker sur Claude Sonnet** (relancer `installer-mini.sh`) et mesurer.
2. **Créer un dépôt GitHub privé** à partir de `~/declic-source` (voir §9), sur le compte GitHub personnel de Lucas `lucasdevh01-prog` (vérifier `gh auth status` ; si le compte n'est pas clair, demander). `.gitignore` : `data/`, `node_modules/`.
3. **Brancher Déclic sur la plateforme « Jeanne »** — hypothèse : **Jeannette**, déjà sur le VPS : site `https://jeannette.srv875929.hstgr.cloud` (`/var/www/jeannette`, nginx `jeannette`), serveur privé `/srv/jeannette-jeux/server.js` (pm2 `jeannette-jeux`, `127.0.0.1:8150`, salons de jeux à deux en WebSocket et « petites fonctions IA »). **À confirmer avec Lucas avant d'agir** : de quelle plateforme parle-t-il exactement ? Lire d'abord comment Jeannette ajoute un jeu (liste, vignette, style), puis proposer le branchement (lien/vignette dans Jeannette, ou intégration) **avant** d'écrire dans `/srv/jeannette-jeux` ou `/var/www/jeannette`. Ne rien modifier là sans accord (règle : toute écriture sur un système partagé se demande).
4. Ensuite, dans l'ordre de valeur : essai téléphone, bouton de partage d'un score, thème du jour, mode défi à deux sur Jeannette (WebSocket existant), crédits des photos par carte (auteur + licence via `prop=imageinfo&iiprop=extmetadata`).

## 9. Reprendre le code sur le mini

`installer-mini.sh` dépose cette note dans `~/declic-worker/REPRISE.md` et le code complet dans `~/declic-source/` (archive servie par le VPS sur `/api/worker/source.tgz`, protégée par le jeton). Pour déployer une modification du serveur ou de la page : `deployer.sh maj` exige la clé SSH du VPS (`hostinger_vps`), **que le mini n'a pas** ; deux voies : copier la clé avec l'accord de Lucas, ou demander à Lucas de lancer `deployer.sh maj` depuis son Mac après un `git pull`. Ne copie aucune clé sans son accord.

## 10. Règles de travail de Lucas qui comptent ici

Messages de commit : `<projet> : <constat>` en français, minuscules, sans accents. Déclic est un projet personnel : aucune dépendance, aucun lien, aucune mention d'un projet professionnel. Documenter au fil de l'eau dans le coffre `~/pboard/Projets/Lucashi-apps/` (décision L-08). Un chiffre porte sa source ; `n/a` si non mesurable. Ton direct et impersonnel dans les notes.
