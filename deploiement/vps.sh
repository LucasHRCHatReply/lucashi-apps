#!/usr/bin/env bash
# Prépare le VPS pour servir ce dossier en HTTPS avec Caddy. À lancer SUR le VPS (en root).
#   vps.sh etat                         état des lieux, en lecture seule (rien n'est modifié)
#   vps.sh installer <hôte> [<hôte>…]   Caddy + clone + mise à jour toutes les 2 minutes (refuse si 80/443 sont pris)
#   vps.sh pare-feu                     ufw : 22 (ou le port ssh réel), 80 et 443 seulement
# Exemple : vps.sh installer <IP-avec-tirets>.sslip.io app.lucashi.fr
set -euo pipefail
DEPOT="https://github.com/LucasHRCHatReply/lucashi-apps.git"
DOSSIER="/srv/lucashi-apps"
[ "$(id -u)" -eq 0 ] || { echo "à lancer en root"; exit 1; }

etat() {
  echo "== système";        . /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"; uptime; df -h / | tail -1; free -h | sed -n 2p
  echo "== ports en écoute"; ss -tlnpH 2>/dev/null || true
  echo "== services actifs"; systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '{print $1}' | grep -v -E '^(systemd|dbus|getty|serial|user@|cron|rsyslog|polkit|udisks|multipathd|unattended|snapd|ModemManager|networkd|chrony|qemu)' || true
  echo "== docker";         (command -v docker >/dev/null && docker ps --format '{{.Names}}\t{{.Ports}}') || echo "absent"
  echo "== serveurs web";   for s in caddy nginx apache2 httpd traefik; do echo "$s : $(systemctl is-active "$s" 2>/dev/null || true)"; done
  echo "== sites déjà servis"; ls /etc/nginx/sites-enabled /etc/caddy /etc/apache2/sites-enabled 2>/dev/null || echo "aucun répertoire connu"
  echo "== pare-feu";       (command -v ufw >/dev/null && ufw status verbose) || echo "ufw absent"; iptables -S 2>/dev/null | head -5 || true
  echo "== ssh";            sshd -T 2>/dev/null | grep -E '^(port|passwordauthentication|permitrootlogin) ' || true
  echo "== tâches planifiées"; crontab -l 2>/dev/null | grep -v '^#' || true; systemctl list-timers --no-legend 2>/dev/null | head -8
}

installer() {
  [ $# -ge 1 ] || { echo "indiquer au moins un hôte"; exit 2; }
  for p in 80 443; do
    u=$(ss -tlnpH "sport = :$p" 2>/dev/null | grep -v '"caddy"' || true)
    [ -z "$u" ] || { echo "le port $p est déjà utilisé :"; echo "$u"; echo "rien n'est installé : voir « vps.sh etat »."; exit 3; }
  done
  command -v git >/dev/null || { apt-get update -qq; apt-get install -y -qq git; }
  if ! command -v caddy >/dev/null; then
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq; apt-get install -y -qq caddy
  fi
  [ -d "$DOSSIER/.git" ] || git clone --depth 1 "$DEPOT" "$DOSSIER"
  mkdir -p /etc/caddy/sites
  HOTES=$(printf '%s, ' "$@"); HOTES=${HOTES%, }
  cat > /etc/caddy/sites/lucashi-apps.caddy <<CADDY
$HOTES {
	root * $DOSSIER
	encode zstd gzip
	file_server
	@prive path /.git/* /scripts/* /deploiement/* /LISEZ-MOI.md
	respond @prive 404
	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
}
CADDY
  [ -f /etc/caddy/Caddyfile ] || touch /etc/caddy/Caddyfile
  grep -q 'import sites/\*' /etc/caddy/Caddyfile || { cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.avant-lucashi; echo 'import sites/*' >> /etc/caddy/Caddyfile; }
  caddy validate --config /etc/caddy/Caddyfile
  # mise à jour : un git pull toutes les 2 minutes (timer systemd)
  cat > /etc/systemd/system/lucashi-apps-maj.service <<UNIT
[Unit]
Description=Met à jour le site des apps de Lucas
[Service]
Type=oneshot
ExecStart=/usr/bin/git -C $DOSSIER pull --ff-only --quiet
UNIT
  cat > /etc/systemd/system/lucashi-apps-maj.timer <<UNIT
[Unit]
Description=Mise à jour du site toutes les 2 minutes
[Timer]
OnBootSec=1min
OnUnitActiveSec=2min
[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload; systemctl enable --now lucashi-apps-maj.timer; systemctl enable caddy; systemctl reload caddy || systemctl restart caddy
  echo "en ligne : $HOTES (le certificat de chaque hôte s'émet dès que son DNS pointe sur ce VPS)"
}

pare_feu() {
  command -v ufw >/dev/null || apt-get install -y -qq ufw
  SSHP=$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}'); SSHP=${SSHP:-22}
  ufw default deny incoming; ufw default allow outgoing
  ufw allow "$SSHP/tcp"; ufw allow 80/tcp; ufw allow 443/tcp
  ufw --force enable; ufw status verbose
}

case "${1:-}" in
  etat) etat ;;
  installer) shift; installer "$@" ;;
  pare-feu) pare_feu ;;
  *) sed -n 2,7p "$0"; exit 2 ;;
esac
