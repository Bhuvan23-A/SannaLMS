#!/bin/bash
# Let's Encrypt SSL setup for SannaLMS — run as root on the NEW server (Ubuntu 22.04).
#
# PREREQUISITES (order matters — DNS first, certs second):
#   1. DNS A records for both domains must point at THIS server's IP
#      (sannalms.sannainnovations.com  and  admin.sannalms.sannainnovations.com)
#   2. Port 80 must be reachable from the internet (certbot HTTP-01 challenge)
#   3. The LMS stack must be running (nginx container on 8085, admin-ui on 8086,
#      Kong on 8010) — same ports as the current server.
#
# Usage: ./setup-ssl.sh [app_domain] [admin_domain] [contact_email]
# Defaults: sannalms.sannainnovations.com / admin.sannalms.sannainnovations.com
set -e

APP_DOMAIN="${1:-sannalms.sannainnovations.com}"
ADMIN_DOMAIN="${2:-admin.sannalms.sannainnovations.com}"
EMAIL="${3:-admin@sannainnovations.com}"

echo "==> Installing nginx + certbot"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Writing site configs (replicating current production setup)"

# ---- Student portal site (sannalms.*) -------------------------------------
cat > /etc/nginx/sites-available/sannalms <<CONF
server {
    listen 80;
    server_name __APP_DOMAIN__;

    location / {
        proxy_pass http://127.0.0.1:8085;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/__APP_DOMAIN__/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/__APP_DOMAIN__/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
CONF

# ---- Admin UI site (admin.sannalms.*) -------------------------------------
cat > /etc/nginx/sites-available/sannalms-admin <<CONF
server {
    listen 80;
    server_name __ADMIN_DOMAIN__;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name __ADMIN_DOMAIN__;

    ssl_certificate /etc/letsencrypt/live/__ADMIN_DOMAIN__/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/__ADMIN_DOMAIN__/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://127.0.0.1:8086;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Assignment / course file uploads live in the shared uploads volume served
    # by the student portal nginx (8085) -> course-service. Without this route,
    # trainer "Submitted file" links on the admin domain 404.
    location /uploads/ {
        proxy_pass http://127.0.0.1:8085;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
CONF

sed -i "s/__APP_DOMAIN__/$APP_DOMAIN/g; s/__ADMIN_DOMAIN__/$ADMIN_DOMAIN/g" \
  /etc/nginx/sites-available/sannalms /etc/nginx/sites-available/sannalms-admin

# Enable sites (remove default)
ln -sf /etc/nginx/sites-available/sannalms /etc/nginx/sites-enabled/sannalms
ln -sf /etc/nginx/sites-available/sannalms-admin /etc/nginx/sites-enabled/sannalms-admin
rm -f /etc/nginx/sites-enabled/default

echo "==> Testing nginx config"
nginx -t

echo "==> Issuing certificates (HTTP-01 challenge — requires DNS already pointed here)"
certbot --nginx -d "$APP_DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
certbot --nginx -d "$ADMIN_DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo "==> Reloading nginx"
systemctl reload nginx

echo ""
echo "Done! Verify:"
echo "  curl -I https://$APP_DOMAIN"
echo "  curl -I https://$ADMIN_DOMAIN"
echo "Renewal is automatic via /etc/cron.d/certbot (twice daily check)."
