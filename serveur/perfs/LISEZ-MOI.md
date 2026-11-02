# Réception des perfs du skill d'orchestration (serveur)

Petit serveur Node 22 sans dépendance. Route `POST /api/perfs` : le fichier JSONL produit chaque mois par
`outils/partager.sh` du skill d'orchestration, après le « Partager » de la personne. Il permet aux installations faites
depuis le zip du site (sans accès au dépôt privé) d'envoyer leurs chiffres sans compte GitHub ni jeton.

## Ce qui est accepté

- En-têtes `x-compte` (`[a-z0-9-]{1,40}`) et `x-cle` (32 à 64 caractères hexadécimaux, tirés à l'installation et gardés
  dans `perfs/.cle`). La première clé vue pour un compte lui reste attachée : une autre installation ne peut pas écrire
  sous ce nom (403).
- Chaque ligne est une fiche de `extraire.mjs` : `session` en 8 hex, `projet` haché (`p-xxxxxx`), `compte` égal à
  l'en-tête ; toute chaîne fait 80 caractères au plus, sans ponctuation de phrase. Un message, un prompt ou un chemin
  fait refuser **tout** le lot (400).
- 8 Mo et 20 000 lignes par lot, 6 envois par heure et par IP (empreinte salée en mémoire), 500 Mo au total.

Les lots acceptés s'écrivent dans `$DONNEES/recus/<compte>/<AAAA-MM-JJ>-<hex>.jsonl`. Aucune route ne les relit : le Mac
analyste les rapatrie par ssh (`outils/rapatrier.sh` du dépôt `orchestration-claude`), puis les déplace dans
`$DONNEES/traites/`.

## Lancement (sur le serveur)

```
mkdir -p /var/lib/lucashi-perfs
cd /srv/lucashi-apps/serveur/perfs
PORT=8242 DONNEES=/var/lib/lucashi-perfs pm2 start perfs.mjs --name lucashi-perfs --interpreter /opt/node22/bin/node
pm2 save
```

## nginx

À côté de `location /api/compte` :

```
location /api/perfs { proxy_pass http://127.0.0.1:8242; proxy_set_header X-Real-IP $remote_addr; client_max_body_size 9m; }
```

Santé : `GET /api/perfs/sante`. Tests : `node --test serveur/perfs/perfs.test.mjs`.
