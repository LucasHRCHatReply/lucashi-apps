#!/usr/bin/env zsh
# Installe le worker de Déclic sur un Mac : il tourne en arrière-plan (launchd), redémarre seul, et fait faire
# le travail par Claude Sonnet (effort bas) via Claude Code, connecté au compte Max. Rien n'est ouvert sur ce Mac.
# Usage : copier le jeton sur ce Mac (presse-papiers universel), puis  curl -fsSL <site>/installer-mini.sh | zsh
set -eu
SITE="https://declic.srv875929.hstgr.cloud"
DOSSIER="$HOME/declic-worker"; PLIST="$HOME/Library/LaunchAgents/fr.lucashi.declic-worker.plist"; ETIQ="fr.lucashi.declic-worker"

NODE="$(command -v node || true)"
[ -n "$NODE" ] && [ "$("$NODE" -p 'process.versions.node.split(".")[0]')" -ge 20 ] || { echo "Node 20 ou plus est requis (nodejs.org). Rien n'a été modifié."; exit 3; }
CLAUDE="$(command -v claude || true)"
[ -n "$CLAUDE" ] || { for c in "$HOME/.local/bin/claude" /usr/local/bin/claude /opt/homebrew/bin/claude; do [ -x "$c" ] && CLAUDE="$c" && break; done; }
[ -n "$CLAUDE" ] || { echo "Claude Code est introuvable (npm i -g @anthropic-ai/claude-code, ou claude.ai/download). Rien n'a été modifié."; exit 3; }
echo "Essai de Claude Code (Sonnet, effort bas)…"
REP="$(cd "$(mktemp -d)" && echo 'Réponds par le mot ok' | "$CLAUDE" -p --model sonnet --effort low --tools '' --no-session-persistence --setting-sources '' --output-format text 2>&1 | tail -3)"
echo "$REP" | grep -qi "ok" || { echo "Claude Code n'a pas répondu (pas connecté au compte Max ?) : $REP. Lance « claude » une fois pour te connecter, puis relance. Rien n'a été modifié."; exit 3; }

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
  <key>MOTEUR</key><string>claude</string><key>CLAUDE</key><string>$CLAUDE</string><key>MODELE</key><string>sonnet</string><key>EFFORT</key><string>low</string><key>PARALLELE</key><string>2</string>
  <key>PATH</key><string>/usr/bin:/bin:/usr/local/bin:$(dirname "$NODE"):$(dirname "$CLAUDE")</string><key>HOME</key><string>$HOME</string>
 </dict>
 <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
 <key>StandardOutPath</key><string>$DOSSIER/worker.log</string><key>StandardErrorPath</key><string>$DOSSIER/worker.log</string>
</dict></plist>
P
# la note de reprise et le code complet, pour qu'une session Claude sur ce Mac reprenne le développement
curl -fsS -H "Authorization: Bearer $TOKEN" "$SITE/api/worker/reprise" -o "$DOSSIER/REPRISE.md" || echo "(note de reprise non téléchargée)"
if [ ! -d "$HOME/declic-source" ]; then mkdir -p "$HOME/declic-source" && curl -fsS -H "Authorization: Bearer $TOKEN" "$SITE/api/worker/source.tgz" | tar -xzf - -C "$HOME/declic-source" || echo "(code non téléchargé)"; fi
chmod 600 "$PLIST"
launchctl bootout "gui/$(id -u)/$ETIQ" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 8; tail -3 "$DOSSIER/worker.log"
echo; curl -fsS "$SITE/api/etat" | grep -q '"cerveau":true' && echo "OK : le cerveau est en ligne depuis ce Mac." || echo "Le jeu ne voit pas encore le worker : regarde $DOSSIER/worker.log"
