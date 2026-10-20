# Déployer sur le VPS (préparé, non lancé)

Objectif : construire ce dépôt (Astro) sur le VPS, servir `dist/` en HTTPS et le tenir à jour à chaque push. Le site n'est
plus servable tel quel depuis la racine du dépôt (GitHub Pages ne convient plus : il faut une construction).

**Pré-requis : Node 22 ou plus (avec npm) sur le VPS.** Adresse et indexation se règlent dans `/etc/lucashi-apps.env`
(`SITE_URL`, `INDEXABLE`) ; tant que `INDEXABLE` n'est pas `true`, chaque page porte `noindex` et `robots.txt` interdit tout.

Rien de ce qui suit n'a été exécuté. Le script se lance **sur** le VPS, en root, et ne modifie rien sans qu'on le demande.

## 1. Se connecter

La clé SSH de Lucas doit d'abord être autorisée sur le VPS (panneau Hostinger › VPS › Clés SSH). Ensuite :

```
ssh root@<IP>
```

## 2. État des lieux (lecture seule)

```
curl -fsSL https://raw.githubusercontent.com/LucasHRCHatReply/lucashi-apps/main/deploiement/vps.sh | bash -s etat
```

Il liste le système, les ports en écoute, les services, Docker, les serveurs web déjà présents, le pare-feu, la config ssh
et les tâches planifiées. À lire en entier avant la suite : si les ports 80 ou 443 servent déjà quelque chose, l'étape 3
refuse et rien n'est touché.

## 3. Installer Caddy et le site

L'hôte provisoire est `<IP-avec-tirets>.sslip.io` (par exemple l'IP 1.2.3.4 donne `1-2-3-4.sslip.io`) ; il est résolu sans
DNS. `app.lucashi.fr` s'ajoute dans la même commande : son certificat s'émettra dès que le DNS pointera sur le VPS.

```
curl -fsSL https://raw.githubusercontent.com/LucasHRCHatReply/lucashi-apps/main/deploiement/vps.sh -o vps.sh
bash vps.sh installer <IP-avec-tirets>.sslip.io app.lucashi.fr
```

Il installe Caddy (dépôt officiel), clone ce dépôt dans `/srv/lucashi-apps`, écrit `/etc/caddy/sites/lucashi-apps.caddy`
(sans toucher aux autres sites : une ligne `import sites/*` est ajoutée au Caddyfile, une copie est gardée en
`Caddyfile.avant-lucashi`), sert `dist/` (le dépôt lui-même n'est pas exposé), relaie `/api/compte` vers le compteur, puis active un timer systemd qui
met à jour et reconstruit toutes les 2 minutes : chaque push est en ligne dans les 2 minutes.

### Variante : nginx tient déjà 80 et 443

`installer` refuse alors de toucher à quoi que ce soit. Sur un VPS qui sert déjà d'autres sites par nginx et Certbot :

```
bash vps.sh installer-nginx <hôte>
```

Il ajoute un seul site statique, `/etc/nginx/sites-available/lucashi-apps` (racine `dist/`, proxy `/api/compte`), demande son certificat
à Certbot avec redirection HTTP → HTTPS, et active le même timer de mise à jour. Les autres sites ne sont pas modifiés.
C'est la variante en service sur le VPS Hostinger : `https://apps.srv875929.hstgr.cloud` (16/10/2026).

### Passer un site déjà installé à Astro (`migrer-astro`)

Le VPS Hostinger sert encore la racine du dépôt (nginx, avant Astro). Ordre à suivre, pour qu'aucune page ne casse :

```
ssh root@<IP>
systemctl stop lucashi-apps-maj.timer                 # plus de git pull pendant la bascule
# (poussez main depuis le Mac)
curl -fsSL https://raw.githubusercontent.com/LucasHRCHatReply/lucashi-apps/main/deploiement/vps.sh -o vps.sh
bash vps.sh migrer-astro
```

`migrer-astro` : vérifie Node 22, écrit `/etc/lucashi-apps.env` (adresse lue dans la conf nginx, `INDEXABLE=false`), installe
`/usr/local/bin/lucashi-apps-maj`, garde une copie `lucashi-apps.avant-astro`, remplace la racine par `dist/`, ajoute
`location /api/compte` (vers `127.0.0.1:8240`, le compteur), construit une première fois, recharge nginx, relance le timer.
Retour arrière : recopier `lucashi-apps.avant-astro` sur la conf et recharger nginx.

La mise à jour (timer, toutes les 2 minutes) fait `git pull` ; si HEAD a changé (ou si `dist/` manque), `nice -n 15 npm ci`
puis `npm run build` dans `dist.new/`, échangé d'un coup avec `dist/`.

Passage en production (quand `app.lucashi.fr` pointe sur le VPS) : dans `/etc/lucashi-apps.env`, `SITE_URL=https://app.lucashi.fr`
et `INDEXABLE=true`, puis `/usr/local/bin/lucashi-apps-maj` après avoir supprimé `dist/` (ou pousser un commit).

## 4. Pare-feu (étape à part)

```
bash vps.sh pare-feu
```

ufw : tout entrant refusé sauf le port ssh réel (lu dans `sshd -T`), 80 et 443. À ne lancer qu'après avoir lu l'état des
lieux : un autre service qui écoute sur un autre port serait coupé de l'extérieur.

## 5. DNS

Quand `app.lucashi.fr` doit pointer sur le VPS : IONOS › DNS › enregistrement **A**, hôte `app`, valeur l'IP du VPS (à la
place du CNAME vers GitHub Pages, qui se supprime). Contrôle : `dig +short app.lucashi.fr`, puis
`curl -sI https://app.lucashi.fr | head -1`.

## Vérifier et défaire

- Site : `curl -sI https://<hôte> | head -1` (attendu : `HTTP/2 200`) ; mises à jour : `systemctl list-timers lucashi-apps-maj.timer`.
- Journal Caddy : `journalctl -u caddy -n 50`.
- Retirer le site : `rm /etc/caddy/sites/lucashi-apps.caddy && systemctl reload caddy`, puis
  `systemctl disable --now lucashi-apps-maj.timer`.

Le nom `<IP>.sslip.io` contient l'IP du VPS : elle n'est volontairement pas écrite dans ce dépôt public.
