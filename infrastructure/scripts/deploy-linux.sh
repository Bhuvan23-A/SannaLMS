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
POSTGRES_PASSWORD=SannaLMS_Pass_2026!
POSTGRES_DB=sannalms_master
POSTGRES_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_secure
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
JWT_SECRET=sannalms_prod_jwt_secret_2026
EOF
fi
echo "[INFO] Installing frontend dependencies and compiling static bundle..."
if [ -d "frontend/saas-web-app" ]; then
    cd frontend/saas-web-app
    npm install --no-audit --no-fund
    npm run build
    cd ../..
fi

echo "[INFO] Pulling and building Docker infrastructure containers..."
docker-compose up -d --build

echo "[INFO] Checking container status..."
docker-compose ps

echo "=========================================="
echo " Deployment Complete!"
echo " Services live at http://localhost:8085"
echo " MinIO Console: http://localhost:9001"
echo "=========================================="
