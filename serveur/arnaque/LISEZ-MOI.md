# Arnaque ou pas ? (serveur)

Petit serveur Node 22 sans dépendance. Route `POST /api/arnaque` (JSON `{"texte": "..."}`, 5 000 caractères au plus). Il extrait les liens, les suit sans JavaScript, lit l'âge du domaine (RDAP), consulte des listes publiques d'hameçonnage et rend un verdict avec ses raisons. Il ne garde ni le texte, ni l'IP, ni journal de requêtes : la limite de débit (20 par minute et par IP) vit en mémoire, sur une empreinte salée de l'IP.

Fichiers : `arnaque.mjs` (HTTP, limite de débit), `ssrf.mjs` (suivi sûr), `regles.mjs` (règles de verdict, partagées avec la page), `rdap.mjs`, `listes.mjs`.

## Sécurité (SSRF)

http/https seulement, ports 80 et 443, DNS résolu par le serveur puis refus de toute IP privée ou réservée (127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, 100.64/10, 0/8, ::1, fc00::/7, fe80::/10, IPv4 mappées, NAT64, 6to4, Teredo), connexion à l'IP vérifiée sans seconde résolution, 8 redirections au plus chacune revérifiée, 5 s par saut, 15 s au total, 256 Kio lus, aucun cookie, agent `ArnaqueOuPas/1.0`. Preuves : `node --test serveur/arnaque/arnaque.test.mjs`.

## Listes publiques et conditions d'usage

- OpenPhish, flux communautaire (https://github.com/openphish/public_feed) : mis à jour toutes les 12 h, **usage non commercial uniquement** ; conditions : https://openphish.com/terms.html. L'outil est gratuit, sans publicité.
- URLhaus (abuse.ch) : liste des sites diffusant des logiciels malveillants, usage équitable (https://urlhaus.abuse.ch/api/) ; une copie toutes les 12 h.
Les copies sont écrites dans `$DONNEES/listes/` (seuls fichiers écrits). Phishing.Database n'est pas branché.

## Lancement (sur le serveur)

```
cd /srv/lucashi-apps/serveur/arnaque
PORT=8241 DONNEES=/var/lib/lucashi-arnaque /opt/node22/bin/node --version
PORT=8241 DONNEES=/var/lib/lucashi-arnaque pm2 start arnaque.mjs --name lucashi-arnaque --interpreter /opt/node22/bin/node
pm2 save
```

## nginx

Le serveur écoute en local ; nginx transmet l'IP réelle (le serveur ne la lit que si la connexion vient de 127.0.0.1) :

```
location /api/arnaque {
    proxy_pass http://127.0.0.1:8241;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 24k;
    proxy_read_timeout 25s;
}
```

Placer ce bloc à côté de `location /api/compte` ; sans `proxy_set_header X-Real-IP`, tous les visiteurs partageraient une seule limite.

## Développement

```
ARNAQUE_CORS_DEV=1 node serveur/arnaque/arnaque.mjs
PUBLIC_ARNAQUE_API=http://127.0.0.1:8241/api/arnaque npx astro dev --port 4345
```

Santé : `GET /api/arnaque/sante`. Tests : `node --test serveur/arnaque/arnaque.test.mjs`.
