# Deployment Guide for Linux & Windows Servers

This guide details how to deploy SannaLMS on both **Linux (Ubuntu Server)** and **Windows Server** environments using Docker Compose and NGINX/Kong reverse proxies.

---

## Prerequisites

1. **Linux Server**:
   - OS: Ubuntu 22.04 LTS
   - Software: Docker Engine v24+, Docker Compose v2.20+, Git, Curl.
   - Minimum: 4 cores, 8GB RAM, 50GB disk

2. **Windows Server**:
   - OS: Windows Server 2022 or Windows 10/11 Pro/Enterprise
   - Software: Docker Desktop (WSL 2 backend) or Docker Engine Windows, PowerShell 7+, Git.

---

## 1. Quick Automated Deployment

### Deployment on Linux (Ubuntu Server)
Run the automated bash script from the root directory:
```bash
chmod +x infrastructure/scripts/deploy-linux.sh
./infrastructure/scripts/deploy-linux.sh
```

---

## 2. Production Docker Compose Setup

To launch all services:
```bash
docker compose up -d --build
```

### Checking Service Logs
```bash
docker compose logs -f
```

---

## 3. Environment Configuration (`.env`)

The deploy script auto-generates `.env` if missing. To create manually:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sannalms_master
POSTGRES_PORT=5432

REDIS_HOST=redis
REDIS_PORT=6379

MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

JWT_SECRET=sannalms_prod_jwt_secret_2026

KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=SannaLMS_KC_2026!

KONG_PG_USER=kong
KONG_PG_PASSWORD=kongpass_sannalms_2026
KONG_PG_DATABASE=kong

KEYCLOAK_ADMIN_SECRET=sannalms-api-svc-local
```

### Critical: Password Consistency

The following values **MUST** match across `.env` and `docker-compose.yml`:

| Value | .env key | Must match |
|---|---|---|
| Postgres password | `POSTGRES_PASSWORD=postgres` | All `DATABASE_URL` passwords in docker-compose.yml use `postgres` |
| MinIO root user | `MINIO_ROOT_USER=admin` | All `MINIO_ACCESS_KEY` in services use `admin` |
| MinIO root password | `MINIO_ROOT_PASSWORD=minioadmin` | All `MINIO_SECRET_KEY` in services use `minioadmin` |
| Keycloak admin secret | `KEYCLOAK_ADMIN_SECRET=sannalms-api-svc-local` | Must match `infrastructure/keycloak/realm-export.json` client secret |

---

## 4. First-Time Server Setup

### Install Docker + Docker Compose
```bash
apt-get update && apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Clone and Build
```bash
cd /root
git clone https://github.com/Bhuvan23-A/SannaLMS.git SannaLMS
cd SannaLMS
git checkout develop

# Create databases
docker compose up -d postgres
sleep 15
for db in sannalms sannalms_master sannalms_course sannalms_assessment sannalms_user sannalms_college sannalms_liveclass sannalms_calendar sannalms_attendance sannalms_discussion sannalms_notification sannalms_certificate kong; do
  docker exec sannalms-postgres psql -U postgres -c "CREATE DATABASE \"$db\"" 2>/dev/null
done

# Build frontend
apt-get install -y nodejs
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
cd frontend/saas-web-app && npm install && npm run build && cd ../..

# Start everything
docker compose up -d --build
```

### Create Superadmin User
Use Keycloak Admin API to create the superadmin. See `infrastructure/scripts/create-superadmin.py`.

---

## 5. SSL Setup (Let's Encrypt)

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

### DNS Records Required
| Record | Points To |
|---|---|
| `sannalms.sannainnovations.com` | Server IP |
| `admin.sannalms.sannainnovations.com` | Server IP |

### Get Certificates
```bash
certbot --nginx -d sannalms.sannainnovations.com --non-interactive --agree-tos --email admin@sannainnovations.com --redirect
certbot --nginx -d admin.sannalms.sannainnovations.com --non-interactive --agree-tos --email admin@sannainnovations.com --redirect
```

Certificates auto-renew via cron. Verify with `certbot renew --dry-run`.

---

## 6. Backups & Health Checks

### Nightly Backup (02:00 via cron)
```bash
bash /root/SannaLMS/infrastructure/scripts/ops/backup_all.sh
```
Covers: Postgres (all databases), MongoDB, MinIO uploads. Retains 7 days local.

### Health Check (every 30 min via cron)
```bash
bash /root/SannaLMS/infrastructure/scripts/ops/health_check.sh
```

### Manual Health Check
```bash
curl -s -o /dev/null -w '%{http_code}' https://sannalms.sannainnovations.com/     # 200
curl -s -o /dev/null -w '%{http_code}' https://admin.sannalms.sannainnovations.com/ # 200
curl -s -o /dev/null -w '%{http_code}' https://sannalms.sannainnovations.com/api/v1/courses # 403 (auth required)
```
