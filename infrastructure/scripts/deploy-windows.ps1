# SannaLMS Windows Server Automated Deployment Script

Write-Host "==========================================" -ForegroundColor Green
Write-Host " Starting SannaLMS Windows Deployment" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker CLI not found. Ensure Docker Desktop or Docker Engine is running." -ForegroundColor Red
    exit 1
}

# Create .env if missing
if (-not (Test-Path ".env")) {
    Write-Host "[INFO] Creating default .env file..." -ForegroundColor Yellow
    @"
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
"@ | Out-File -FilePath ".env" -Encoding utf8
}

Write-Host "[INFO] Starting Docker Containers..." -ForegroundColor Cyan
docker-compose up -d --build

Write-Host "[INFO] Checking active containers..." -ForegroundColor Cyan
docker-compose ps

Write-Host "==========================================" -ForegroundColor Green
Write-Host " SannaLMS Windows Deployment Successful!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
