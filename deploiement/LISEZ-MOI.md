# Déployer sur le VPS (préparé, non lancé)

Objectif : servir ce dépôt en HTTPS depuis le VPS, avec Caddy, et le tenir à jour à chaque push. GitHub Pages reste en
place tant que le VPS n'est pas prêt.

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
`Caddyfile.avant-lucashi`), cache `/.git`, `/scripts`, `/deploiement` et ce fichier, puis active un timer systemd qui
fait `git pull` toutes les 2 minutes : chaque push est en ligne dans les 2 minutes.

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
