#!/usr/bin/env bash
# Télécharge le cœur wasm d'ffmpeg (repli de « Vidéo légère ») dans le dossier donné, et vérifie son empreinte.
# Usage : bash src/outils/video-legere/lourds.sh <dossier-cible>
#   en dev : bash src/outils/video-legere/lourds.sh public/lourds/video-legere
#   en ligne : sur le VPS, vers /srv/lucashi-lourds/video-legere/ (servi par nginx sous /lourds/video-legere/)
set -euo pipefail
cible="${1:?dossier cible manquant}"
version="0.12.10"
url="https://unpkg.com/@ffmpeg/core@${version}/dist/esm/ffmpeg-core.wasm"
sha="9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7"
mkdir -p "$cible"
dest="$cible/ffmpeg-core.wasm"
if [ -f "$dest" ] && [ "$(shasum -a 256 "$dest" | cut -d' ' -f1)" = "$sha" ]; then echo "deja la, empreinte bonne : $dest"; exit 0; fi
curl -fsSL "$url" -o "$dest.tmp"
somme="$(shasum -a 256 "$dest.tmp" | cut -d' ' -f1)"
if [ "$somme" != "$sha" ]; then rm -f "$dest.tmp"; echo "empreinte differente ($somme)" >&2; exit 1; fi
mv "$dest.tmp" "$dest"
echo "ok : $dest ($(wc -c < "$dest" | tr -d ' ') octets)"
