#!/usr/bin/env bash
# Télécharge les fichiers lourds de « Vocal en texte » dans le dossier donné :
#   <dossier>/models/onnx-community/whisper-base/…   (modèle Whisper base quantifié, ~80 Mo)
#   <dossier>/ort/…                                    (moteur onnxruntime en WebAssembly, ~22 Mo)
# Usage : bash src/outils/vocal-texte/lourds.sh public/lourds/vocal-texte
#         (en ligne : bash lourds.sh /srv/lucashi-lourds/vocal-texte, servi sous /lourds/vocal-texte/)
# Chaque fichier vient d'une URL épinglée (révision du modèle, version du paquet) et son empreinte sha256 est vérifiée ; un fichier déjà bon n'est pas retéléchargé.
set -euo pipefail
CIBLE="${1:?dossier cible requis}"
REV=1846881b6b3a3024392c1eea3ad983695bc23925   # onnx-community/whisper-base
MODELE="https://huggingface.co/onnx-community/whisper-base/resolve/$REV"
ORT="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist"

sha() { shasum -a 256 "$1" | cut -d' ' -f1; }
prendre() { # $1 = URL, $2 = chemin relatif, $3 = sha256
  local dest="$CIBLE/$2"
  mkdir -p "$(dirname "$dest")"
  if [ -f "$dest" ] && [ "$(sha "$dest")" = "$3" ]; then echo "déjà là : $2"; return; fi
  echo "télécharge : $2"
  curl -fL --retry 3 -s -o "$dest.part" "$1"
  if [ "$(sha "$dest.part")" != "$3" ]; then rm -f "$dest.part"; echo "EMPREINTE FAUSSE : $2" >&2; exit 1; fi
  mv "$dest.part" "$dest"
}

M=models/onnx-community/whisper-base
prendre "$MODELE/config.json" $M/config.json f4d0608f7d918166da7edb3e188de5ef1bfe70d9802e785d271fd88111e9cf4b
prendre "$MODELE/generation_config.json" $M/generation_config.json 61070cf8de25b1e9256e8e102ded49d8d24a8369ed36ef84fdf21549e68125a0
prendre "$MODELE/preprocessor_config.json" $M/preprocessor_config.json a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d
prendre "$MODELE/tokenizer.json" $M/tokenizer.json 27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566
prendre "$MODELE/tokenizer_config.json" $M/tokenizer_config.json 2e036e4dbacfdeb7242c7d4ec4149f4a16e86026048f94d1637e3a8ee9c6a573
prendre "$MODELE/onnx/encoder_model_quantized.onnx" $M/onnx/encoder_model_quantized.onnx 5862993336bf33acd23736071aae2b32261d3b1b2f37780194460d4ef974dd46
prendre "$MODELE/onnx/decoder_model_merged_quantized.onnx" $M/onnx/decoder_model_merged_quantized.onnx fa3ef9902734ce5ae6f9ef2bdb2ba9a6c4b5785b09f4f420ce036573dc9d090b
prendre "$ORT/ort-wasm-simd-threaded.jsep.mjs" ort/ort-wasm-simd-threaded.jsep.mjs 08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9
prendre "$ORT/ort-wasm-simd-threaded.jsep.wasm" ort/ort-wasm-simd-threaded.jsep.wasm c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39
echo "fait : $CIBLE"
