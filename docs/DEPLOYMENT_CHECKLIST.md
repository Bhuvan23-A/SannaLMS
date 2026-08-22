# SannaLMS Deployment Rules

> **Purpose:** This document is for everyone who deploys or manages anything on the SannaLMS production server (`195.35.21.204`).
>
> **Owner:** Platform Team · **Last updated:** 2026-08-20

---

## The Golden Rule

> **If your deployment does ANY of the things in the "NEVER" list below, you will break the LMS. When in doubt: ask before you run.**

---

## NEVER do these on the server

| # | Action | Why it destroys things |
|---|--------|------------------------|
| 1 | **Never run `docker compose down` in `/root/SannaLMS`** | Stops postgres + every LMS container. Use `docker compose up -d --build <service>` for a rebuild. |
| 2 | **Never run `docker system prune -a --volumes`** | Can permanently delete the LMS postgres data volume. All user data gone. |
| 3 | **Never run `prisma db push --accept-data-loss`** against any `sannalms_*` database | Destructive schema pushes wipe databases. |
| 4 | **Never point your app at the LMS postgres** (port `5432` or internal `sannalms-postgres:5432`) | Bugs damage LMS data. Create your own database container. |
| 5 | **Never edit the LMS nginx config or SSL certs** (`/root/SannaLMS/infrastructure/nginx/`) | Breaks the LMS domains. |
| 6 | **Never run `docker stop` / `docker rm` / `docker kill` on any `sannalms-*` container** | Obvious. |
| 7 | **Never reboot without warning** | Reboot during a database write can cause issues. |

---

## DO these when deploying

| # | Action | How |
|---|--------|-----|
| 1 | **Pick a fresh port** for your service | Check what's free: `ss -tlnp`. Use 8090-8999 range. |
| 2 | **Create your own database** if needed | Own port, own volume, own password. |
| 3 | **After deploying, verify the LMS is healthy** | `curl -s -o /dev/null -w '%{http_code}' https://sannalms.sannainnovations.com/` should return 200. |

---

## LMS ports you must NOT use

| Port | Service |
|------|---------|
| 8085 | Portal nginx (`sannalms.sannainnovations.com`) |
| 8086 | Admin dashboard (`admin.sannalms.sannainnovations.com`) |
| 8010 | Kong API gateway |
| 8011 | Kong admin API |
| 8445/8446 | Kong HTTPS |
| 8180 | Keycloak |
| 8008 | AI service |
| 4003 | Coding sandbox |
| 5432 | LMS postgres |

---

## Health Check (30 seconds)

```bash
# Quick status
curl -s -o /dev/null -w '%{http_code}' https://sannalms.sannainnovations.com/
curl -s -o /dev/null -w '%{http_code}' https://admin.sannalms.sannainnovations.com/
curl -s -o /dev/null -w '%{http_code}' https://sannalms.sannainnovations.com/api/v1/courses
```

Expected: 200, 200, 403 (auth required). Anything else = investigate.

---

## What to do if you broke something

1. Don't panic, don't hide it.
2. Don't run more destructive commands to "fix" it.
3. Check health: `docker compose ps` in `/root/SannaLMS`.
4. Backup available at `/root/SannaLMS/backups/` — nightly backups at 02:00.
