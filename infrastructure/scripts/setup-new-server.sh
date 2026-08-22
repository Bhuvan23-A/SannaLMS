#!/bin/bash
# SannaLMS — Fresh server setup (Ubuntu 22.04)
set -e

echo "=========================================="
echo " SannaLMS Server Setup"
echo "=========================================="

# --- 1. System update ---
echo "[1/6] Updating system..."
apt-get update -y
apt-get upgrade -y

# --- 2. Install Docker ---
echo "[2/6] Installing Docker..."
apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --batch --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

ARCH=$(dpkg --print-architecture)
CODENAME=$(lsb_release -cs)
echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $CODENAME stable" > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

docker --version
docker compose version

# --- 3. Install tools ---
echo "[3/6] Installing utilities..."
apt-get install -y git curl wget htop unzip

# --- 4. Clone repo ---
echo "[4/6] Cloning SannaLMS..."
cd /root
if [ -d "SannaLMS" ]; then
  echo "SannaLMS directory exists, pulling..."
  cd SannaLMS
  git fetch --all
  git checkout develop 2>/dev/null || git checkout main
  git pull
else
  git clone https://github.com/Bhuvan23-A/SannaLMS.git SannaLMS
  cd SannaLMS
  git checkout develop 2>/dev/null || git checkout main
fi

# --- 5. Create .env ---
echo "[5/6] Creating .env..."
cat > /root/SannaLMS/.env <<'ENVEOF'
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
ENVEOF

# --- 6. Build frontend ---
echo "[6/6] Building student portal..."
cd /root/SannaLMS/frontend/saas-web-app
npm install --no-audit --no-fund
npm run build
cd /root/SannaLMS

if [ -f "frontend/saas-web-app/dist/index.html" ]; then
  echo "Frontend build OK"
else
  echo "ERROR: Frontend build missing!"
  exit 1
fi

echo "=========================================="
echo " Setup script complete!"
echo "=========================================="
