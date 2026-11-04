#!/usr/bin/env bash
# Déploie Déclic sur le VPS Hostinger depuis le Mac (clé ~/.ssh/hostinger_vps) : rsync, service systemd, nginx, certificat.
#   deployer.sh installer   première fois : utilisateur, service, nginx + certbot pour declic.srv875929.hstgr.cloud
#   deployer.sh maj         envoie le code et relance le service
set -euo pipefail
HOTE="declic.srv875929.hstgr.cloud"; IP="31.97.156.179"; ICI="$(cd "$(dirname "$0")" && pwd)"
SSH=(ssh -i "$HOME/.ssh/hostinger_vps" -o BatchMode=yes "root@$IP")
envoyer() { rsync -az --delete --exclude data --exclude node_modules -e "ssh -i $HOME/.ssh/hostinger_vps -o BatchMode=yes" "$ICI/" "root@$IP:/srv/declic/"; }
case "${1:-}" in
  installer)
    "${SSH[@]}" 'id declic >/dev/null 2>&1 || useradd --system --home /var/lib/declic --shell /usr/sbin/nologin declic; mkdir -p /srv/declic /var/lib/declic /etc/declic; chown declic /var/lib/declic
      [ -f /etc/declic/declic.env ] || { printf "PORT=8243\nDATA=/var/lib/declic\nWORKER_TOKEN=%s\nCAP_JOUR=80\nIP_MAX=6\n" "$(openssl rand -hex 24)" > /etc/declic/declic.env; chmod 600 /etc/declic/declic.env; }'
    envoyer
    "${SSH[@]}" "cat > /etc/systemd/system/declic.service <<'U'
[Unit]
Description=Declic (jeu de culture generale)
After=network-online.target
[Service]
User=declic
EnvironmentFile=/etc/declic/declic.env
ExecStart=/opt/node22/bin/node /srv/declic/server.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/declic
ProtectHome=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
U
cat > /etc/nginx/sites-available/declic <<'N'
server {
    listen 80;
    listen [::]:80;
    server_name $HOTE;
    location / { proxy_pass http://127.0.0.1:8243; proxy_set_header X-Real-IP \$remote_addr; proxy_read_timeout 40s; client_max_body_size 400k; }
}
N
ln -sf /etc/nginx/sites-available/declic /etc/nginx/sites-enabled/declic
systemctl daemon-reload && systemctl enable --now declic && nginx -t && systemctl reload nginx
certbot --nginx -d $HOTE --non-interactive --agree-tos --register-unsafely-without-email --redirect
nginx -t && systemctl reload nginx; sleep 1; systemctl is-active declic"
    ;;
  maj) envoyer; "${SSH[@]}" 'systemctl restart declic; sleep 1; systemctl is-active declic' ;;
  *) sed -n 2,5p "$0"; exit 1 ;;
esac
