#!/usr/bin/env bash
# Recopie la page de vente d'une app depuis son dépôt local, contrôle, commite, pousse.
# Usage : scripts/mettre-a-jour.sh <id> [--sans-push]
set -euo pipefail
cd "$(dirname "$0")/.."
ID="${1:?usage : scripts/mettre-a-jour.sh <id> [--sans-push]}"; PUSH=1; [ "${2:-}" = "--sans-push" ] && PUSH=0
champ() { python3 -I - "$ID" "$1" <<'PY'
import json,sys,os
a=[x for x in json.load(open("apps.json"))["apps"] if x["id"]==sys.argv[1]]
if not a: sys.exit("app inconnue dans apps.json : "+sys.argv[1])
v=a[0].get(sys.argv[2]); print(os.path.expanduser(v) if isinstance(v,str) else "")
PY
}
SRC=$(champ source_page); BUILD=$(champ build_page); SORTIE=$(champ page_construite)
[ -n "$SRC" ] || { echo "$ID : pas de source_page dans apps.json, page écrite à la main dans $ID/ : rien à recopier."; }
if [ -n "$SRC" ]; then
  [ -d "$SRC" ] || { echo "dossier source introuvable : $SRC"; exit 1; }
  mkdir -p "$ID"
  if [ -n "$BUILD" ]; then
    (cd "$SRC" && eval "$BUILD")
    [ -f "$SORTIE" ] || { echo "page construite introuvable : $SORTIE"; exit 1; }
    cp "$SORTIE" "$ID/index.html"
  else
    rsync -a --exclude 'build*' --exclude '.git' --exclude '.DS_Store' "$SRC"/ "$ID"/
  fi
  # le retour « Toutes les apps » reste relatif : le site est servi sous plusieurs noms (VPS, puis app.lucashi.fr)
  sed -i '' 's#href="https://app.lucashi.fr/"#href="../"#g' "$ID/index.html"
fi
scripts/controle.sh
git config core.hooksPath scripts/hooks
git add -A
if git diff --cached --quiet; then echo "rien n'a changé"; exit 0; fi
git commit -q -m "lucashi-apps : page de $ID mise a jour"
[ $PUSH -eq 1 ] && git push origin main && echo "poussé : le site se met à jour dans une minute"
