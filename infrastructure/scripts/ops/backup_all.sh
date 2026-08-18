#!/bin/bash
# SannaLMS nightly backup — run as root via cron (02:00 daily).
# Covers ALL persistent data, not just Postgres:
#   1. Postgres  — every database (includes Keycloak user data + all services)
#   2. MongoDB   — AI service analytics / placements / gamification (lms_production_db)
#   3. MinIO     — file uploads (assignments, course materials, images, PDFs)
#   4. Offsite   — optional rclone push (see setup-backups.sh; removes single-point-of-failure)
set -e

BACKUP_ROOT="/root/SannaLMS/backups"
DATE=$(date +%Y%m%d_%H%M)
DEST="$BACKUP_ROOT/db/$DATE"
mkdir -p "$DEST"

# Source optional offsite config (OFFSITE_REMOTE=rclone-remote:path)
[ -f "$BACKUP_ROOT/offsite.env" ] && . "$BACKUP_ROOT/offsite.env"

# --- 1. Postgres ------------------------------------------------------------
CONTAINER=sannalms-postgres
if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  DBS=$(docker exec "$CONTAINER" psql -U postgres -tAc \
    "SELECT datname FROM pg_database WHERE datname NOT IN ('template0','template1') ORDER BY datname")
  for db in $DBS; do
    if docker exec "$CONTAINER" pg_dump -U postgres -Fc "$db" > "$DEST/$db.dump" 2>/dev/null; then
      echo "OK  pg/$db"
    else
      echo "FAIL pg/$db"
    fi
  done
else
  echo "FAIL pg/ (container $CONTAINER not running)"
fi

# --- 2. MongoDB ---------------------------------------------------------------
if docker ps --format '{{.Names}}' | grep -qx sannalms-mongodb; then
  if docker exec sannalms-mongodb mongodump --archive --gzip --db lms_production_db \
      > "$DEST/mongo_lms_production_db.archive.gz" 2>/dev/null; then
    echo "OK  mongo/lms_production_db"
  else
    echo "FAIL mongo/lms_production_db"
  fi
else
  echo "FAIL mongo/ (container sannalms-mongodb not running)"
fi

# --- 3. MinIO (file uploads) ---------------------------------------------------
if docker volume ls -q | grep -qx sannalms_minio_data; then
  if docker run --rm -v sannalms_minio_data:/data:ro -v "$DEST":/backup alpine \
      tar czf /backup/minio_data.tar.gz -C /data . 2>/dev/null; then
    echo "OK  minio"
  else
    echo "FAIL minio"
  fi
else
  echo "FAIL minio/ (volume sannalms_minio_data not found)"
fi

# --- 4. Retention: keep 7 days of local dumps -----------------------------------
find "$BACKUP_ROOT/db" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

# --- 5. Offsite push (optional) ---------------------------------------------------
if [ -n "$OFFSITE_REMOTE" ] && command -v rclone >/dev/null 2>&1; then
  if rclone copy "$DEST" "$OFFSITE_REMOTE/sannalms-backups/$DATE" --transfers 4 2>/dev/null; then
    echo "OK  offsite"
    # Keep 14 days offsite (longer than local 7 — this is the disaster copy)
    rclone delete --min-age 14d "$OFFSITE_REMOTE/sannalms-backups/" 2>/dev/null || true
  else
    echo "FAIL offsite"
  fi
else
  echo "SKIP offsite (OFFSITE_REMOTE unset or rclone missing)"
fi

# --- 6. Manifest ------------------------------------------------------------
ls -la "$DEST" > "$DEST/MANIFEST.txt"
echo "Backup complete: $DEST ($(date -u))"
