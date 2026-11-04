#!/usr/bin/env bash
# Lance le worker de Déclic sur ce Mac (sous caffeinate : le Mac ne s'endort pas tant que le worker tourne).
set -euo pipefail
cd "$(dirname "$0")"
set -a; . "$HOME/.config/declic/worker.env"; set +a
exec caffeinate -i node worker.mjs
