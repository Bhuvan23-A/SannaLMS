#!/bin/bash
# Restore all SannaLMS data from the most recent backup.
# Usage: ./restore_all.sh [YYYYmmdd_HHMM]
# Restores Postgres databases, then Mongo, then MinIO (if archives exist).
set -e

BACKUP_ROOT="/root/SannaLMS/backups/db"
CONTAINER=sannalms-postgres

if [ -n "$1" ]; then
  SRC="$BACKUP_ROOT/$1"
else
  SRC=$(ls -1dt "$BACKUP_ROOT"/*/ 2>/dev/null | head -1 | sed 's:/$::')
fi

if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "No backup found in $BACKUP_ROOT"; exit 1
fi
echo "Restoring from: $SRC"

# --- 1. Postgres -----------------------------------------------------------
for dump in "$SRC"/*.dump; do
  [ -f "$dump" ] || continue
  db=$(basename "$dump" .dump)
  docker exec "$CONTAINER" psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$db' AND pid<>pg_backend_pid();" >/dev/null 2>&1 || true
  docker exec "$CONTAINER" psql -U postgres -c "DROP DATABASE IF EXISTS \"$db\";" >/dev/null
  docker exec "$CONTAINER" psql -U postgres -c "CREATE DATABASE \"$db\";" >/dev/null
  docker exec -i "$CONTAINER" pg_restore -U postgres -d "$db" --no-owner < "$dump" >/dev/null 2>&1 \
    && echo "OK  pg/$db" || echo "WARN pg/$db (partial restore - inspect manually)"
done

# --- 2. MongoDB --------------------------------------------------------------
MONGO_ARCHIVE="$SRC/mongo_lms_production_db.archive.gz"
if [ -f "$MONGO_ARCHIVE" ] && docker ps --format '{{.Names}}' | grep -qx sannalms-mongodb; then
  if docker exec -i sannalms-mongodb mongorestore --archive --gzip --drop < "$MONGO_ARCHIVE" 2>/dev/null; then
    echo "OK  mongo/lms_production_db"
  else
    echo "WARN mongo/ (restore reported errors - inspect manually)"
  fi
else
  echo "SKIP mongo/ (no archive or container not running)"
fi

# --- 3. MinIO -----------------------------------------------------------------
MINIO_TAR="$SRC/minio_data.tar.gz"
if [ -f "$MINIO_TAR" ] && docker volume ls -q | grep -qx sannalms_minio_data; then
  # Note: MinIO must be stopped (or files written) — docker exec is safer on a stopped container.
  if docker run --rm -v sannalms_minio_data:/data -v "$SRC":/backup alpine \
      sh -c 'rm -rf /data/* && tar xzf /backup/minio_data.tar.gz -C /data' 2>/dev/null; then
    echo "OK  minio"
  else
    echo "WARN minio/ (inspect manually; consider stopping sannalms-minio first)"
  fi
else
  echo "SKIP minio/ (no archive or volume not found)"
fi

echo "Restore complete."
