#!/bin/bash
# SannaLMS health check - every 30 min via cron.
# 1. Ensures the postgres container is running (starts it if not).
# 2. Verifies the expected databases exist; if missing, restores from the latest backup.
# 3. Probes the API gateway.
set -e

LOG=/root/SannaLMS/backups/health.log
CONTAINER=sannalms-postgres
EXPECTED="sannalms sannalms_master sannalms_course sannalms_assessment sannalms_user sannalms_college sannalms_liveclass sannalms_calendar sannalms_attendance sannalms_discussion sannalms_notification sannalms_certificate"

ts() { date -u '+%Y-%m-%d %H:%M:%S'; }

# --- Step 1: make sure postgres is up --------------------------------------
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "$(ts) ALERT: $CONTAINER not running - attempting start" >> "$LOG"
  docker start "$CONTAINER" >> "$LOG" 2>&1 || echo "$(ts) ERROR: could not start $CONTAINER" >> "$LOG"
  sleep 10
fi

# --- Step 2: verify databases ----------------------------------------------
missing=""
for db in $EXPECTED; do
  ok=$(docker exec "$CONTAINER" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" 2>/dev/null || true)
  [ "$ok" = "1" ] || missing="$missing $db"
done

if [ -n "$missing" ]; then
  echo "$(ts) ALERT: missing databases:$missing" >> "$LOG"
  # Auto-restore from the latest backup (only if postgres is actually up)
  if docker exec "$CONTAINER" psql -U postgres -tAc 'SELECT 1' >/dev/null 2>&1; then
    /root/SannaLMS/backups/restore_all.sh >> "$LOG" 2>&1 || true
  else
    echo "$(ts) ERROR: postgres not reachable, skipped restore" >> "$LOG"
  fi
else
  echo "$(ts) OK: all databases present" >> "$LOG"
fi

# --- Step 3: API probe (403/401 means gateway is up) -----------------------
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:8010/api/v1/courses || echo 000)
echo "$(ts) API gateway status: $code" >> "$LOG"
