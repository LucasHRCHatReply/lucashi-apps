#!/usr/bin/env bash
# Ajoute une app au site : une entrée dans apps.json, son icône, sa page de vente recopiée.
# Usage : scripts/ajouter-app.sh <id> "<Nom>" "<phrase>" <#couleur> <depot-releases> <fichier.zip> <icone.icns|png> [dossier-de-la-page-de-vente]
# Exemple : scripts/ajouter-app.sh tiroir Tiroir "Une phrase." "#23CC99" LucasHRCHatReply/tiroir-releases Tiroir.zip ~/Tiroir/Resources/AppIcon.icns ~/Tiroir/site
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -ge 7 ] || { sed -n 2,5p "$0"; exit 2; }
ID=$1; NOM=$2; PHRASE=$3; COULEUR=$4; DEPOT=$5; ZIP=$6; ICONE=${7/#\~/$HOME}; SRC=${8:-}; SRC=${SRC/#\~/$HOME}
sips -s format png -z 256 256 "$ICONE" --out "assets/$ID-icon.png" >/dev/null
VERSION=$(curl -fsS "https://api.github.com/repos/$DEPOT/releases/latest" | python3 -c 'import json,sys;print(json.load(sys.stdin)["tag_name"].lstrip("v"))' || echo "1.0.0")
python3 -I - "$ID" "$NOM" "$PHRASE" "$COULEUR" "$DEPOT" "$ZIP" "$VERSION" "$SRC" <<'PY'
import json,sys
i,nom,ph,c,dep,zip_,ver,src=sys.argv[1:9]
j=json.load(open("apps.json"))
if any(a["id"]==i for a in j["apps"]): sys.exit("déjà dans apps.json : "+i)
e={"id":i,"nom":nom,"phrase":ph,"couleur":c,"icone":f"assets/{i}-icon.png","captures":[],"page":f"{i}/","depot":dep,"zip":zip_,"version":ver,"source_page":src or None}
j["apps"].append(e); json.dump(j,open("apps.json","w"),ensure_ascii=False,indent=2)
PY
echo "entrée ajoutée. Pour les captures de la carte : poser les images dans $ID/ et les lister dans apps.json (champ captures)."
[ -n "$SRC" ] && exec scripts/mettre-a-jour.sh "$ID" --sans-push
echo "Pas de page de vente fournie : écrire $ID/index.html, puis : git add -A && git commit && git push"
