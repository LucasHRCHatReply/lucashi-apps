# Compteur sans cookie

Petit serveur Node 22 sans dépendance. Il compte des vues et des utilisations par outil et par jour. Il ne lit et ne garde ni IP, ni agent utilisateur, ni référent, ni cookie.

## Lancement (sur le serveur)

```
cd serveur/compteur
PORT=8240 DONNEES=/var/lib/lucashi-compteur JETON_BILAN=<valeur secrète, définie sur le serveur seulement> \
  pm2 start compteur.mjs --name lucashi-compteur
pm2 save
```

Le jeton ne s'écrit jamais dans le dépôt. Sans `JETON_BILAN`, le bilan répond 404. Le dossier `DONNEES` contient un fichier `AAAA-MM-JJ.json` par jour, écrit toutes les 30 secondes et à l'arrêt.

## nginx

```
location /api/compte { proxy_pass http://127.0.0.1:8240; }
```

## Lire le bilan

- Page lisible : `https://<site>/api/compte/bilan?jeton=<jeton>&jours=30` dans un navigateur.
- JSON : même adresse avec `curl` (par jour, outil, événement).
- Santé : `/api/compte/sante` répond `ok`.

## Tests

```
node --test serveur/compteur/compteur.test.mjs
```
