# SannaLMS Deploy Runbook

The ONE safe way to push code to the production server (`103.160.144.225`).
Use `deploy_helper.py` for every deploy — it prevents the two failure modes
we've hit in production:

## The two rules (learned the hard way)

### 1. NEVER delete a bind-mounted folder during a deploy

`rm -rf dist && mkdir -p dist` while the nginx container is running breaks the
Docker bind mount: the container keeps pointing at the ORIGINAL (now-deleted,
empty) directory inode and serves `503 / ERR_INVALID_RESPONSE` until the
container is recreated.

**Always use `sync_dist()`** from `deploy_helper.py` — it runs
`rsync -a --delete` INTO the existing folder. rsync replaces file contents in
place and only removes stale files *inside* the folder; it never deletes or
recreates the folder itself, so the bind mount survives.

```python
from deploy_helper import ssh_connect, sync_dist, run

ssh = ssh_connect()
sync_dist(ssh, "frontend/saas-web-app/dist", "/root/SannaLMS/frontend/saas-web-app/dist")
# ... rebuild/restart containers ...
ssh.close()
```

If you must touch the folder, the only safe operation is `mkdir -p` (no-op on
an existing directory — its inode is untouched).

### 2. ALWAYS run health checks before and after every deploy

```python
from deploy_helper import ssh_connect, health_check, expect_healthy

ssh = ssh_connect()
health_check(ssh, label="pre-deploy")          # baseline — must be healthy first
# ... deploy ...
codes = health_check(ssh, label="post-deploy") # catch regressions immediately
expect_healthy(codes, "post-deploy")           # exits non-zero if the site is down
ssh.close()
```

Expected codes: student + admin portal = **200**, api gateway = **401/403**
(needs auth), nginx uploads probe = **404** (route exists, no file at
`/healthz`). Anything `000/500/502/503` after a deploy is a regression — stop
and investigate (check `docker ps`, `docker logs sannalms-nginx`, and the bind
mount with `docker inspect sannalms-nginx`).

## Full deploy flow (typical)

1. **Typecheck + build locally** — `npx tsc --noEmit` in each service, `npm run
   build` in `frontend/saas-web-app` and `frontend/admin-ui`.
2. **Health check (pre-deploy)** — confirm the site is already healthy.
3. **Sync changed source files** to `/root/SannaLMS` (SFTP `put` per file).
4. **Sync frontend builds** with `sync_dist()` (student dist is bind-mounted
   into nginx; admin-ui is a container build via `docker-compose build`).
5. **Run DB migrations** if the schema changed (see below).
6. **Rebuild + restart** affected containers:
   `cd /root/SannaLMS && docker-compose build <svc> && docker-compose up -d <svc>`
7. **Reload Kong after any container recreate** — recreating a service can
   give it a new Docker network IP, and Kong caches the upstream hostname
   resolution, so the gateway returns **502 `Connection refused`** to the old
   IP until the DNS cache expires. Always run:
   `docker exec sannalms-kong kong reload`
   (confirmed required Aug 2026: college-service moved from `.17` to `.20`
   and the API gateway 502'd until the reload).
8. **Health check (post-deploy)** + `expect_healthy()`.
9. Verify the specific feature live via the API, then commit + push.

## DB migrations on production

The attendance/course databases were originally created with `prisma db push`,
so `prisma migrate deploy` fails with P3005 (no migration history) on the live
DB. For live schema changes, apply the SQL directly:

```bash
docker exec sannalms-postgres psql -U postgres -d sannalms_attendance \
  -c 'ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT '"'"'SCHEDULED'"'"';'
```

Keep the migration file in the repo too (`prisma/migrations/…/migration.sql`)
so a fresh server install can apply it cleanly with `migrate deploy`.

## If the site ever goes down mid-deploy

1. `docker ps` — is `sannalms-nginx` up? Is every service up?
2. `curl -s http://127.0.0.1:8085/` — if it returns the "build missing" 503
   text, the nginx bind mount is pointing at an empty folder.
3. `docker inspect sannalms-nginx --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'`
   and compare `ls` of the host path vs `docker exec sannalms-nginx ls`.
4. Fix: recreate the container so it re-binds —
   `cd /root/SannaLMS && docker-compose up -d --force-recreate nginx`
