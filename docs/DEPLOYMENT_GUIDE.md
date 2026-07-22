# Deployment Guide for Linux & Windows Servers

This guide details how to deploy SannaLMS on both **Linux (Ubuntu Server)** and **Windows Server** environments using Docker Compose and NGINX/Kong reverse proxies.

---

## Prerequisites

1. **Linux Server**:
   - OS: Ubuntu 22.04 LTS / 24.04 LTS
   - Software: Docker Engine v24+, Docker Compose v2.20+, Git, Curl.

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

### Deployment on Windows Server
Run the automated PowerShell script from PowerShell (Admin):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\infrastructure\scripts\deploy-windows.ps1
```

---

## 2. Production Docker Compose Setup

To launch all infrastructure services (PostgreSQL, Redis, MinIO, Kong Gateway):

```bash
docker-compose -f docker-compose.yml up -d --build
```

### Checking Service Logs
```bash
docker-compose logs -f
```

---

## 3. Environment Configuration (`.env`)

Create a root `.env` file prior to deployment:
```env
# Multi-Tenancy DB Config
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SannaLMS_Secure_Pass_2026!
POSTGRES_DB=sannalms_master
POSTGRES_PORT=5432

# Redis Config
REDIS_HOST=redis
REDIS_PORT=6379

# MinIO Config
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_secure
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# JWT Secret
JWT_SECRET=super_secret_jwt_key_sannalms_2026
