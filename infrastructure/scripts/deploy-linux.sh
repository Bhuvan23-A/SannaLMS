#!/usr/bin/env bash
# SannaLMS Linux Automated Deployment Script

set -e

echo "=========================================="
echo " Starting SannaLMS Linux Server Deployment"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "[ERROR] Docker Compose is not installed."
    exit 1
fi

# Create default .env if missing
if [ ! -f .env ]; then
    echo "[INFO] Creating default .env file..."
    cat <<EOF > .env
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
EOF
fi
echo "[INFO] Installing frontend dependencies and compiling static bundle..."
if [ -d "frontend/saas-web-app" ]; then
    cd frontend/saas-web-app
    npm install --no-audit --no-fund
    npm run build
    cd ../..
fi

# Fail loudly if the frontend build produced no index.html — a missing build
# silently turns the site into nginx's cryptic 403/500 after deploy.
if [ ! -f "frontend/saas-web-app/dist/index.html" ]; then
    echo "[ERROR] Frontend build missing frontend/saas-web-app/dist/index.html — aborting deployment."
    exit 1
fi

echo "[INFO] Pulling and building Docker infrastructure containers..."
docker-compose up -d --build

# Re-bind nginx to the freshly built dist/ directory. If dist/ was replaced
# (rm -rf + recreate) while the container was running, the bind mount keeps
# pointing at the old empty directory and the site 403s until the container
# is recreated.
docker-compose up -d --no-deps --force-recreate nginx

echo "[INFO] Checking container status..."
docker-compose ps

echo "=========================================="
echo " Deployment Complete!"
echo " Services live at http://localhost:8085"
echo " MinIO Console: http://localhost:9001"
echo "=========================================="
