# AGENTS.md

## Project Overview
SannaLMS is a multi-tenant SaaS LMS platform built for educational institutions. It supports 30+ feature modules across 4 architectural tiers, with Keycloak SSO, Kong API Gateway, and role-based access control (superadmin / tenantadmin).

---

## Quick Reference

### Servers
| Item | New Server (Active) | Old Server (Backup) |
|------|---------------------|---------------------|
| IP | `195.35.21.204` | `103.160.144.225` |
| SSH | `ssh root@195.35.21.204` | `ssh root@103.160.144.225` |
| SSH Password | `FCx.xfQ9grQg7WdB` | `KB6Vn72p2gS`\`(\F` |
| Location | Hostinger Mumbai | Hostinger (old) |
| Purpose | Primary production | Backup — decommission after 1-2 weeks |

### URLs
- Student Portal: `https://sannalms.sannainnovations.com`
- Admin Portal: `https://admin.sannalms.sannainnovations.com`
- API Gateway: `https://sannalms.sannainnovations.com/api/v1/`
- Keycloak: `https://sannalms.sannainnovations.com/auth/` (proxied via nginx → port 8180)

### Credentials
| Service | Username | Password |
|---------|----------|----------|
| Superadmin (LMS) | `superadmin` | `Admin@123` |
| Superadmin email | `admin@sannainnovations.com` | |
| Keycloak Admin | `admin` | `SannaLMS_KC_2026!` |
| Postgres | `postgres` | `postgres` |
| MinIO | `admin` | `minioadmin` |
| Keycloak Realm | `sannalms` | |
| Keycloak Client Secret | `sannalms-api-svc-local` | (matches realm-export.json) |

### GitHub
- Repo: `https://github.com/Bhuvan23-A/SannaLMS.git` (private)
- Branch: `develop` (main dev branch)
- Token: `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`

---

## Architecture

### Tiers
- **Part 1:** Core infra — `auth-service`, `user-service`, `college-service`, `course-service`
- **Part 2:** Feature modules — `assessment-service`, `attendance-service`, `calendar-service`, `certificate-service`, `discussion-service`, `liveclass-service`, `notification-service`, `search-service`, `chat-service`
- **Part 3:** Assessment sandbox — `assessment-p2`, `assignment-service`, `coding-service`
- **Part 4:** AI/analytics — `ai-service`

### Key Infrastructure
- **Postgres:** Single instance, multiple databases per service (`sannalms_*`)
- **Keycloak:** SSO provider, realm `sannalms`, client `sannalms`
- **Kong:** API Gateway, proxies `/api/v1/*` to services
- **Nginx:** Serves React SPA + proxies to Keycloak
- **MinIO:** File storage (avatars, uploads, submissions)
- **Redis:** Session/cache
- **MongoDB:** Chat/search data

### Databases
`sannalms` (main), `sannalms_master`, `sannalms_user`, `sannalms_college`, `sannalms_course`, `sannalms_assessment`, `sannalms_liveclass`, `sannalms_calendar`, `sannalms_attendance`, `sannalms_discussion`, `sannalms_notification`, `sannalms_certificate`, `kong`

---

## Build & Deploy

### Local Development
```bash
docker compose up -d postgres redis minio mongodb keycloak kong-db kong
cd services/part1-core-infrastructure/auth-service && npm install && npm run dev
cd frontend/saas-web-app && npm install && npm run dev  # localhost:5173
cd frontend/admin-ui && npm run dev                     # localhost:5174
```

### Production Deploy
```bash
# Via deploy helper (recommended)
cd infrastructure/scripts/ops
python deploy_helper.py push_and_deploy

# Or manual
python deploy_helper.py health_check pre-deploy
python deploy_helper.py push_and_deploy "message"
python deploy_helper.py reload_kong
python deploy_helper.py health_check post-deploy
```

### After Any Container Recreate
```bash
docker exec sannalms-kong kong reload
```

---

## Critical Config Rules

### Password Consistency
The `.env` file and `docker-compose.yml` MUST agree on these values:

| Value | Must be | Used by |
|-------|---------|---------|
| Postgres password | `postgres` | All `DATABASE_URL` passwords, `.env POSTGRES_PASSWORD` |
| MinIO root user | `admin` | `.env MINIO_ROOT_USER`, all `MINIO_ACCESS_KEY` |
| MinIO root password | `minioadmin` | `.env MINIO_ROOT_PASSWORD`, all `MINIO_SECRET_KEY` |
| Keycloak admin secret | `sannalms-api-svc-local` | `.env KEYCLOAK_ADMIN_SECRET`, `realm-export.json`, Kong |

### Frontend Role Names (lowercase)
The React frontend checks for lowercase role names:
- `superadmin` — redirects to `/super-admin`
- `tenantadmin` — redirects to `/admin`
- Keycloak stores roles as `SUPER_ADMIN` / `TENANT_ADMIN`, so the frontend lowercases them for comparison

---

## Services & Ports

| Port | Service |
|------|---------|
| 5432 | Postgres |
| 6379 | Redis |
| 9000 | MinIO S3 |
| 9001 | MinIO Console |
| 8180 | Keycloak |
| 8080 | Kong HTTP |
| 8443 | Kong HTTPS |
| 8010 | Kong (mapped) |
| 8085 | Nginx (student portal) |
| 8086 | Admin UI |
| 3001 | College/Course service |
| 3002 | User service |
| 3003 | Auth service |
| 4003 | Coding sandbox |
| 4004 | Assessment (Part 2) |
| 4005 | Assignment service |
| 5000 | Attendance service |
| 5001 | Chat service |
| 5002 | Discussion service |
| 5003 | Notification service |
| 5004 | Calendar service |
| 5005 | Certificate service |
| 5006 | Liveclass service |
| 5007 | Search service |
| 8008 | AI service |

---

## Common Issues & Fixes

### Kong 502 after container recreate
Container got new Docker IP. Run: `docker exec sannalms-kong kong reload`

### Auth 401 "Invalid user credentials" but password is correct
Keycloak `sannalms` client has `Direct Access Grants Enabled: ON` in Settings. Check via Keycloak Admin → Clients → sannalms → Settings.

### Keycloak admin password lost
```bash
docker exec -it sannalms-keycloak /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master --user admin
docker exec -it sannalms-keycloak /opt/keycloak/bin/kcadm.sh set-users \
  --realm sannalms --username admin --set-password=true --new-password=NEW_PASS
```

### Frontend shows blank page or build missing
```bash
cd frontend/saas-web-app && npm install && npm run build
# Then sync dist/ to server and recreate nginx
```

### Health check
```bash
curl -s -o /dev/null -w '%{http_code}' https://sannalms.sannainnovations.com/        # 200
curl -s -o /dev/null -w '%{http_code}' https://admin.sannalms.sannainnovations.com/  # 200
```

### Nightly backups
Cron runs `backup_all.sh` at 02:00 daily. Retains 7 days in `/root/SannaLMS/backups/`.

---

## Deployment Docs
- `docs/DEPLOYMENT_GUIDE.md` — Full setup guide
- `docs/DEPLOYMENT_CHECKLIST.md` — Server rules and port usage
- `infrastructure/scripts/ops/DEPLOYING.md` — Deploy runbook
- `infrastructure/scripts/ops/deploy_helper.py` — Automated deploy tool
- `infrastructure/scripts/ops/MIGRATE_TO_NEW_SERVER.md` — Server migration notes
