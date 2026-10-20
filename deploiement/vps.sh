#!/usr/bin/env bash
# Prépare le VPS pour servir ce dossier en HTTPS avec Caddy. À lancer SUR le VPS (en root).
#   vps.sh etat                         état des lieux, en lecture seule (rien n'est modifié)
#   vps.sh installer <hôte> [<hôte>…]   Caddy + clone + mise à jour toutes les 2 minutes (refuse si 80/443 sont pris)
#   vps.sh installer-nginx <hôte>      quand nginx tient déjà 80/443 : un site statique de plus + Certbot
#   vps.sh migrer-astro                 sur un site déjà installé par nginx : passe à la construction Astro
#                                       (dist/, proxy /api/compte, mise à jour qui construit) sans toucher au reste
#   vps.sh pare-feu                     ufw : 22 (ou le port ssh réel), 80 et 443 seulement
# Le site est construit sur le VPS : Node 22 ou plus requis. Adresse et indexation : /etc/lucashi-apps.env
# (SITE_URL, INDEXABLE) ; production = SITE_URL=https://app.lucashi.fr et INDEXABLE=true.
# Exemple : vps.sh installer <IP-avec-tirets>.sslip.io app.lucashi.fr
set -euo pipefail
DEPOT="https://github.com/LucasHRCHatReply/lucashi-apps.git"
DOSSIER="/srv/lucashi-apps"
ENV_FICHIER="/etc/lucashi-apps.env"
SCRIPT_MAJ="/usr/local/bin/lucashi-apps-maj"
PORT_COMPTEUR=8240
# Node 22 réservé au site (le Node du système sert d'autres apps sous pm2 : on n'y touche pas)
[ -x /opt/node22/bin/node ] && export PATH="/opt/node22/bin:$PATH"
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

verifier_node() {
  command -v node >/dev/null && command -v npm >/dev/null && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] \
    || { echo "Node 22 ou plus (avec npm) est requis pour construire le site : l'installer d'abord (nodejs.org), rien n'est modifié."; exit 3; }
}

ecrire_env() { # $1 = hôte public
  [ -f "$ENV_FICHIER" ] || printf 'SITE_URL=https://%s\nINDEXABLE=false\n' "$1" > "$ENV_FICHIER"
  chmod 644 "$ENV_FICHIER"
}

ecrire_script_maj() {
  # git pull ; si HEAD a changé (ou si dist/ manque) : npm ci puis build dans dist.new, échangé d'un coup (pas de page cassée entre deux).
  cat > "$SCRIPT_MAJ" <<'MAJ'
#!/usr/bin/env bash
set -euo pipefail
[ -x /opt/node22/bin/node ] && export PATH="/opt/node22/bin:$PATH"
DOSSIER="__DOSSIER__"
[ -f "__ENV__" ] && { set -a; . "__ENV__"; set +a; }
cd "$DOSSIER"
avant=$(git rev-parse HEAD)
git pull --ff-only --quiet
apres=$(git rev-parse HEAD)
if [ "$avant" != "$apres" ] || [ ! -f dist/index.html ]; then
  nice -n 15 npm ci --no-audit --no-fund --loglevel=error
  rm -rf dist.new
  OUT_DIR=dist.new nice -n 15 npm run build
  rm -rf dist.old
  [ -d dist ] && mv dist dist.old
  mv dist.new dist
  rm -rf dist.old
fi
MAJ
  sed -i "s#__DOSSIER__#$DOSSIER#; s#__ENV__#$ENV_FICHIER#g" "$SCRIPT_MAJ"
  chmod 755 "$SCRIPT_MAJ"
}

construire_une_fois() { HOME=/root "$SCRIPT_MAJ"; }

installer() {
  [ $# -ge 1 ] || { echo "indiquer au moins un hôte"; exit 2; }
  for p in 80 443; do
    u=$(ss -tlnpH "sport = :$p" 2>/dev/null | grep -v '"caddy"' || true)
    [ -z "$u" ] || { echo "le port $p est déjà utilisé :"; echo "$u"; echo "rien n'est installé : voir « vps.sh etat »."; exit 3; }
  done
  verifier_node
  command -v git >/dev/null || { apt-get update -qq; apt-get install -y -qq git; }
  if ! command -v caddy >/dev/null; then
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq; apt-get install -y -qq caddy
  fi
  [ -d "$DOSSIER/.git" ] || git clone --depth 1 "$DEPOT" "$DOSSIER"
  verifier_node; ecrire_env "$1"; ecrire_script_maj; construire_une_fois
  mkdir -p /etc/caddy/sites
  HOTES=$(printf '%s, ' "$@"); HOTES=${HOTES%, }
  cat > /etc/caddy/sites/lucashi-apps.caddy <<CADDY
$HOTES {
	encode zstd gzip
	handle /api/compte* {
		reverse_proxy 127.0.0.1:$PORT_COMPTEUR
	}
	handle {
		root * $DOSSIER/dist
		file_server
	}
	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
}
CADDY
  [ -f /etc/caddy/Caddyfile ] || touch /etc/caddy/Caddyfile
  grep -q 'import sites/\*' /etc/caddy/Caddyfile || { cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.avant-lucashi; echo 'import sites/*' >> /etc/caddy/Caddyfile; }
  caddy validate --config /etc/caddy/Caddyfile
  minuterie_maj
  systemctl enable caddy; systemctl reload caddy || systemctl restart caddy
  echo "en ligne : $HOTES (le certificat de chaque hôte s'émet dès que son DNS pointe sur ce VPS)"
}

minuterie_maj() {
  # mise à jour : un git pull toutes les 2 minutes (timer systemd)
  cat > /etc/systemd/system/lucashi-apps-maj.service <<UNIT
[Unit]
Description=Met à jour le site des apps de Lucas
[Service]
Type=oneshot
Environment=HOME=/root
TimeoutStartSec=900
ExecStart=$SCRIPT_MAJ
UNIT
  cat > /etc/systemd/system/lucashi-apps-maj.timer <<UNIT
[Unit]
Description=Mise à jour du site toutes les 2 minutes
[Timer]
OnCalendar=*:0/2
Persistent=true
[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload; systemctl enable lucashi-apps-maj.timer; systemctl restart lucashi-apps-maj.timer
}

installer_nginx() {
  [ $# -eq 1 ] || { echo "indiquer un seul hôte"; exit 2; }
  H="$1"; CONF="/etc/nginx/sites-available/lucashi-apps"
  command -v nginx >/dev/null && command -v certbot >/dev/null || { echo "nginx et certbot requis"; exit 3; }
  grep -RlE "server_name[^;]*\b$H\b" /etc/nginx/sites-enabled 2>/dev/null | grep -v lucashi-apps && { echo "$H est déjà servi ailleurs : rien n'est installé"; exit 3; }
  verifier_node
  command -v git >/dev/null || { apt-get update -qq; apt-get install -y -qq git; }
  [ -d "$DOSSIER/.git" ] || git clone --depth 1 "$DEPOT" "$DOSSIER"
  ecrire_env "$H"; ecrire_script_maj; construire_une_fois
  [ -f "$CONF" ] || cat > "$CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $H;
    root $DOSSIER/dist;
    index index.html;
    location /api/compte { proxy_pass http://127.0.0.1:$PORT_COMPTEUR; client_max_body_size 4k; }
    location / { try_files \$uri \$uri/ \$uri.html =404; }
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    gzip on; gzip_types text/css application/javascript application/json image/svg+xml;
}
NGINX
  ln -sf "$CONF" /etc/nginx/sites-enabled/lucashi-apps
  nginx -t && systemctl reload nginx
  certbot --nginx -d "$H" --non-interactive --redirect --keep-until-expiring
  nginx -t && systemctl reload nginx
  minuterie_maj
  echo "en ligne : https://$H"
}

migrer_astro() {
  verifier_node
  systemctl stop lucashi-apps-maj.timer 2>/dev/null || true   # pas de git pull entre-temps ; minuterie_maj le relance à la fin
  [ -d "$DOSSIER/.git" ] || { echo "le site n'est pas installé dans $DOSSIER : utiliser installer ou installer-nginx"; exit 3; }
  CONF="/etc/nginx/sites-available/lucashi-apps"; CADDY="/etc/caddy/sites/lucashi-apps.caddy"
  if [ -f "$CONF" ]; then
    H=$(awk '/server_name/{gsub(";","");print $2; exit}' "$CONF")
    ecrire_env "$H"; ecrire_script_maj
    cp "$CONF" "$CONF.avant-astro"
    sed -i "s#root $DOSSIER;#root $DOSSIER/dist;#" "$CONF"
    grep -q '/api/compte' "$CONF" || sed -i "/index index.html;/a\\    location /api/compte { proxy_pass http://127.0.0.1:$PORT_COMPTEUR; client_max_body_size 4k; }" "$CONF"
    # les anciennes règles « cacher .git/scripts » deviennent inutiles : dist ne contient que le site
    construire_une_fois
    nginx -t && systemctl reload nginx
  elif [ -f "$CADDY" ]; then
    echo "site servi par Caddy : relancer « vps.sh installer <hôte> » (le fichier $CADDY est réécrit avec dist/ et le proxy)"; exit 3
  else
    echo "ni $CONF ni $CADDY : rien à migrer"; exit 3
  fi
  minuterie_maj
  echo "migré : le site est servi depuis $DOSSIER/dist ; les mises à jour construisent ($ENV_FICHIER : SITE_URL, INDEXABLE). Retour arrière : les fichiers .avant-astro."
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
  installer-nginx) shift; installer_nginx "$@" ;;
  migrer-astro) migrer_astro ;;
  pare-feu) pare_feu ;;
  *) sed -n 2,12p "$0"; exit 2 ;;
esac
