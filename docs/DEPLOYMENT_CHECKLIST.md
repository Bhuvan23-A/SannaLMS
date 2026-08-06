# 🚧 Server Deployment Rules — SannaLMS

> **Purpose:** This document is for **everyone who deploys anything on the shared server** (`103.160.144.225`) — websites, apps, databases, Docker containers, cron jobs, etc.
>
> The SannaLMS platform runs **alongside other projects on this server**. Following these rules protects the LMS (and everyone else's work) from accidental breakage.
>
> **Owner:** Platform Team · **Last updated:** 2026-08-06

---

## ⚠️ The Golden Rule

> **If your deployment does ANY of the things in the "NEVER" list below, you will break the LMS (and possibly other projects). It has happened before — twice — and every time it took hours to recover.**
>
> When in doubt: **ask before you run.** A 2-minute question is cheaper than a 2-hour recovery.

---

## 🚫 NEVER do these on the server

| # | Action | Why it destroys things |
|---|--------|------------------------|
| 1 | **Never reuse an LMS port** (see port table below) | Port conflicts block containers from starting — the LMS postgres couldn't start because another project grabbed port 5432. Result: every LMS API 500s. |
| 2 | **Never run `docker-compose down` in the LMS project folder** (`/root/SannaLMS`) | It stops postgres + every LMS container. Use `docker-compose up -d --build <service>` for a rebuild — never `down`/`up` the whole project. |
| 3 | **Never run `docker system prune -a --volumes`** | It can **permanently delete** the LMS postgres data volume. All user data, courses, grades — gone, unrecoverable. |
| 4 | **Never run `prisma db push --accept-data-loss`** against any `sannalms_*` database | Destructive schema pushes have wiped LMS databases before. Migrations go through the LMS owner only, after a backup. |
| 5 | **Never point your app at the LMS postgres** (host port `5433`, or internal `sannalms-postgres:5432`) | If your code has a bug or a destructive migration, it damages the LMS data. Create **your own** database container. |
| 6 | **Never use default credentials** (`postgres`/`postgres`, `admin`/`admin`, `minioadmin`) on anything public | The LMS postgres was **publicly reachable with default credentials** — anyone on the internet could (and likely did) run destructive SQL. Always set strong, unique passwords. |
| 7 | **Never edit the LMS nginx config or SSL certs** (`/root/SannaLMS/infrastructure/nginx/`) | A bad config breaks the LMS domains (`sannalms.sannainnovations.com`, `admin.sannalms.sannainnovations.com`). Use a separate config file for your site. |
| 8 | **Never run `docker stop` / `docker rm` / `docker kill` on any `sannalms-*` container** | Obviously — these are the LMS containers. |
| 9 | **Never reboot the server without warning the LMS owner** | The LMS now auto-restarts (`restart: always`), but a reboot during a database write can still cause issues. Coordinate. |
| 10 | **Never run destructive SQL** (`DROP DATABASE`, `TRUNCATE`, `DROP TABLE`) against any database unless you are 100% sure it is yours | Postgres logs show exactly this happened to the LMS. There are no second chances without a backup. |

---

## ✅ DO these when deploying something new

| # | Action | How |
|---|--------|-----|
| 1 | **Pick a fresh port** for your service | Check what's free first: `ss -tlnp`. Use something in the **8090–8999** range, away from LMS ports. |
| 2 | **Create your own database container** if you need one | Own port, own volume, own strong password. Example: `postgres:16-alpine` with `POSTGRES_PASSWORD` set to something unique (never `postgres`). |
| 3 | **Test on the port before going live** | `curl -s -o /dev/null -w '%{http_code}' http://localhost:<your-port>` |
| 4 | **After deploying, verify you didn't break the LMS** | Run this one-liner: <br>`bash /root/SannaLMS/backups/health_check.sh && tail -5 /root/SannaLMS/backups/health.log` <br>Good result: `OK: all databases present` + API status `401/403`. Bad result: `ALERT: missing databases...` → **stop, tell the LMS owner immediately.** |
| 5 | **Give your containers a `restart: always` policy** | So a server reboot doesn't silently kill your site either. |
| 6 | **Bind internal services to `127.0.0.1`** | If only the server itself needs to reach it (databases, admin panels), use `127.0.0.1:<port>:<port>` so the internet can't touch it. |
| 7 | **Back up your own data** | Set a nightly `pg_dump`/backup cron for your project, the same way the LMS does (`/root/SannaLMS/backups/backup_all.sh` is the reference). |

---

## 🔌 LMS ports you must NOT use

| Port | LMS Service | Notes |
|------|-------------|-------|
| **8086** | Admin dashboard (`admin.sannalms.sannainnovations.com`) | |
| **8085** | Portal nginx (`sannalms.sannainnovations.com`) | |
| **8010** | Kong API gateway (public API) | All `/api/v1/*` traffic |
| **8011** | Kong admin API | |
| **8445 / 8446** | Kong HTTPS | |
| **8180** | Keycloak (login/SSO) | |
| **8008** | AI service | |
| **4003** | Coding sandbox | |
| **5433** | LMS postgres (**localhost-only**) | Internal name: `sannalms-postgres:5432` — do not connect your apps to it |
| **5432** | ⚠️ Another project's postgres (public!) | Not the LMS, but whoever owns that project should lock it down too |

---

## 🔍 How to tell if the LMS is healthy (30 seconds)

```bash
bash /root/SannaLMS/backups/health_check.sh && tail -5 /root/SannaLMS/backups/health.log
```

**Healthy:** `OK: all databases present` and `API gateway status: 401` or `403` (401/403 means the gateway is alive — it's just asking for a login token, which is correct).

**Broken:** `ALERT: missing databases: ...` or `API gateway status: 000` or `500` → the LMS owner needs to know **immediately**.

You can also test a login quickly:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -d 'grant_type=password&client_id=sannalms-client&username=test_superadmin&password=Test@1234' \
  http://localhost:8180/auth/realms/sannalms/protocol/openid-connect/token
# 200 = LMS auth is fine
```

---

## 📞 What to do if you think you broke something

1. **Don't panic, don't hide it.** Tell the LMS owner immediately — recovery is much faster when we know early.
2. **Don't run more destructive commands** to "fix" it.
3. **Check the health log** (`tail -20 /root/SannaLMS/backups/health.log`) and share the last few lines.
4. **If the LMS databases vanished:** there is an automatic restore (`/root/SannaLMS/backups/restore_all.sh`) and nightly backups. The LMS owner (or the AI assistant managing the LMS) will restore.

---

## 📚 Reference

- The LMS has **automatic nightly backups** (02:00) and a **self-healing health check** (every 30 min) — so most problems are recoverable, but only if we know about them.
- If you're unsure about any command, **ask before you run it.** Every rule above exists because something on this list actually broke the server.
