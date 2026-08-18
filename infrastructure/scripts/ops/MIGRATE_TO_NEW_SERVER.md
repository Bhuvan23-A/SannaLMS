# SannaLMS → New Server Migration Runbook

Target: **EzerHost SM 400** (8 vCPU / 32 GB / 400 GB NVMe / 16 TB, Delhi NCR)
Source: `103.160.144.225` (shared 2 vCPU / 8 GB box hosting ~15 other sites)

**Goal:** move ONLY the SannaLMS stack + its two domains. The ~15 other sites on the
old server are untouched. Zero-config port compatibility: the new server keeps the same
container names, volume names, and host ports as today.

---

## The 3 things that must happen, in order

| # | Step | Who | Downtime impact |
|---|---|---|---|
| 1 | Base server + Docker + stack deployed | Me (after you give me the IP/SSH) | none (new box) |
| 2 | Data migrated (Postgres + Mongo + MinIO + images) | Me | none |
| 3 | **DNS repointed** (`sannalms.*` A records → new IP) | **You** (DNS panel) | **this is the cutover moment** |
| 4 | SSL issued via Let's Encrypt | Me | minutes after DNS propagates |
| 5 | Backups + health checks installed (incl. offsite) | Me | none |

Steps 1–2 happen while the old server keeps running. Only step 3 interrupts service
(typically 5–15 min of propagation + verify). Keep the old server running for 1–2 weeks
after cutover as a rollback — if anything is wrong, flip the DNS back and we're live again.

---

## Phase 0 — What I need from you (after you buy EzerHost)

1. New server **IP address** + **root SSH credentials** (or your SSH key).
2. Confirm the OS at checkout is **Ubuntu 22.04 LTS (64-bit)**, Control Panel **None**.
3. Access to wherever `sannainnovations.com` DNS is managed (Godaddy/Cloudflare/etc.)
   — I'll give you the two A records to add when the time comes.
4. (Optional, recommended) A **Cloudflare R2 or Backblaze B2** account for offsite backups
   (both have a free tier — our backups are only ~10 MB today). Or skip it: offsite is
   optional in the kit.

## Phase 1 — Base setup on the new server (me)

```bash
apt-get update && apt-get install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx fail2ban ufw
# firewall: allow 22, 80, 443 + Docker-adjacent ports; everything else closed
```

## Phase 2 — Data migration (me, old → new)

On the **old** server:
```bash
# 1. Freeze writes for a consistent snapshot (brief)
docker compose -f /root/SannaLMS/docker-compose.yml stop  # or: docker pause <postgres|mongo|minio>

# 2. Dump everything (reuses the improved backup script)
bash /root/SannaLMS/backups/backup_all.sh
#  -> /root/SannaLMS/backups/db/<timestamp>/  (pg .dump files + mongo archive + minio tar)

# 3. Save all images (one file, no compression needed — fast local disk)
docker save $(docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | tr '\n' ' ') -o /root/sannalms_images.tar

# 4. Ship to new server
scp /root/sannalms_images.tar /root/SannaLMS/backups/db/<timestamp> root@<NEW_IP>:/root/
```

On the **new** server:
```bash
# 5. Deploy the repo (git clone / upload zip) + load images
docker load -i /root/sannalms_images.tar
docker compose up -d --no-build        # containers start with prebuilt images
# 6. Restore data (Postgres + Mongo + MinIO)
bash /root/SannaLMS/backups/restore_all.sh <timestamp>
# 7. Smoke test on the new IP:  curl -s http://<NEW_IP>:8085  (frontend),  :8010/api/v1/courses (gateway)
```

## Phase 3 — DNS cutover (**you** — the only action you must take)

In your DNS panel, point these two A records at the **new IP**:
```
sannalms.sannainnovations.com     A  <NEW_IP>
admin.sannalms.sannainnovations.com  A  <NEW_IP>
```
(Leave every other record alone — the other ~15 sites stay on the old server.)

Wait ~5–10 min for propagation, then tell me — I verify the new server is answering.

## Phase 4 — SSL (me, only after DNS has propagated)

```bash
cd infrastructure/scripts/ops
./setup-ssl.sh   # installs certbot, writes the exact same nginx site configs as today,
                 # issues Let's Encrypt certs for both domains, enables auto-renewal
```
- Requires port 80 open to the internet for the HTTP-01 challenge.
- Certbot auto-renews via `/etc/cron.d/certbot` (no manual action ever again).
- Result: `https://sannalms.sannainnovations.com` + `https://admin.sannalms.sannainnovations.com`
  with HSTS on the admin domain — same security posture as the current server.

## Phase 5 — Backups + monitoring (me)

```bash
cd infrastructure/scripts/ops
./setup-backups.sh [rclone_remote]   # optional remote = offsite copies
```
Installs:
- **02:00 daily** — improved `backup_all.sh`: Postgres (all DBs incl. Keycloak users) +
  **Mongo** (analytics/placements) + **MinIO** (file uploads) — the old script only did Postgres.
- **Every 30 min** — `health_check.sh`: auto-restarts postgres, verifies DBs, probes the gateway.
- **7-day local retention** + **14-day offsite retention** (if a remote is configured).
- Adds a monthly `restore_all.sh` drill to the calendar (a backup that's never restored is a hope).

---

## Gaps in the CURRENT server that this kit fixes

1. **MinIO and Mongo are not backed up today.** Assignment uploads, course materials,
   images, and the analytics/placements DB would be lost in a disk failure. The kit backs up all three.
2. **Backups live on the same disk as the data** (single point of failure). The kit adds
   an optional rclone offsite push (R2/B2 free tiers).
3. SSL/backups exist today only as *unversioned* files on the old server. After this
   migration they're **in the repo** (`infrastructure/scripts/ops/`), reproducible on any box.

## Rollback plan

If anything is wrong after cutover: flip the two DNS A records back to `103.160.144.225`.
The old server is left running untouched, so the LMS works there within propagation time.
No data is lost — the new server was populated from a backup, and daily backups continue
on whichever server is live.
