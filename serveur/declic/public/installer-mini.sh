#!/usr/bin/env zsh
# Installe le worker de Déclic sur un Mac : il tourne en arrière-plan (launchd), redémarre seul, et fait faire
# le travail par GPT (petit modèle) via Codex, connecté au compte ChatGPT. Rien n'est ouvert sur ce Mac.
# Usage : copier le jeton sur ce Mac (presse-papiers universel), puis  curl -fsSL <site>/installer-mini.sh | zsh
set -eu
SITE="https://declic.srv875929.hstgr.cloud"
DOSSIER="$HOME/declic-worker"; PLIST="$HOME/Library/LaunchAgents/fr.lucashi.declic-worker.plist"; ETIQ="fr.lucashi.declic-worker"

NODE="$(command -v node || true)"
[ -n "$NODE" ] && [ "$("$NODE" -p 'process.versions.node.split(".")[0]')" -ge 20 ] || { echo "Node 20 ou plus est requis (nodejs.org). Rien n'a été modifié."; exit 3; }
CODEX=""
for c in /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex "$(command -v codex || true)"; do [ -x "$c" ] && CODEX="$c" && break; done
[ -n "$CODEX" ] || { echo "Codex est introuvable : installe l'app ChatGPT (ou « npm i -g @openai/codex ») et connecte-la à ton compte. Rien n'a été modifié."; exit 3; }
"$CODEX" login status 2>&1 | grep -qi "logged in" || { echo "Codex n'est pas connecté : lance « $CODEX login », choisis « Sign in with ChatGPT », puis relance cette commande."; exit 3; }

TOKEN="${DECLIC_TOKEN:-$(pbpaste | grep -E '^DECLIC_TOKEN=' | head -1 | cut -d= -f2)}"
[ ${#TOKEN} -ge 24 ] || { echo "Le jeton manque (variable DECLIC_TOKEN ou presse-papiers). Sur le Mac de Lucas : pbcopy < ~/.config/declic/worker.env, puis relance."; exit 4; }

mkdir -p "$DOSSIER"; curl -fsSL "$SITE/worker.mjs" -o "$DOSSIER/worker.mjs"
cat > "$PLIST" <<P
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
 <key>Label</key><string>$ETIQ</string>
 <key>ProgramArguments</key><array><string>/usr/bin/caffeinate</string><string>-i</string><string>$NODE</string><string>$DOSSIER/worker.mjs</string></array>
 <key>EnvironmentVariables</key><dict>
  <key>DECLIC_URL</key><string>$SITE</string><key>DECLIC_TOKEN</key><string>$TOKEN</string>
  <key>CODEX</key><string>$CODEX</string><key>PARALLELE</key><string>2</string>
  <key>PATH</key><string>/usr/bin:/bin:/usr/local/bin:$(dirname "$NODE")</string><key>HOME</key><string>$HOME</string>
 </dict>
 <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
 <key>StandardOutPath</key><string>$DOSSIER/worker.log</string><key>StandardErrorPath</key><string>$DOSSIER/worker.log</string>
</dict></plist>
P
chmod 600 "$PLIST"
launchctl bootout "gui/$(id -u)/$ETIQ" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 8; tail -3 "$DOSSIER/worker.log"
echo; curl -fsS "$SITE/api/etat" | grep -q '"cerveau":true' && echo "OK : le cerveau est en ligne depuis ce Mac." || echo "Le jeu ne voit pas encore le worker : regarde $DOSSIER/worker.log"
