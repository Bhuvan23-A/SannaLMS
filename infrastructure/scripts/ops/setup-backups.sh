#!/bin/bash
# Idempotent setup of SannaLMS nightly backups + 30-min health checks.
# Run as root on the NEW server, from this repo directory:
#   ./setup-backups.sh [rclone_remote_name]
# Optional arg = name of a configured rclone remote (see "rclone config") for
# OFF-SITE copies (recommended: Cloudflare R2 free tier or Backblaze B2).
# Example:  rclone config  ->  remote "r2", then:  ./setup-backups.sh r2
set -e

DEST_DIR=/root/SannaLMS/backups
mkdir -p "$DEST_DIR"

cp backup_all.sh restore_all.sh health_check.sh "$DEST_DIR/"
chmod +x "$DEST_DIR"/*.sh

# --- Offsite remote (optional) ----------------------------------------------
if [ -n "$1" ]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "OFFSITE_REMOTE=$1" > "$DEST_DIR/offsite.env"
    echo "[ok] Offsite remote configured: $1  (remote path will be .../sannalms-backups/<date>)"
  else
    echo "[warn] rclone not installed. Install it, run 'rclone config', then set OFFSITE_REMOTE in $DEST_DIR/offsite.env"
  fi
elif [ -f "$DEST_DIR/offsite.env" ]; then
  echo "[ok] Existing offsite config kept: $(cat "$DEST_DIR/offsite.env")"
else
  echo "[note] No offsite remote configured. Backups stay on this server only —"
  echo "       recommended: install rclone, add a Cloudflare R2 / B2 remote, re-run with its name."
fi

# --- Cron (idempotent: removes old SannaLMS backup lines, then adds fresh) ----
crontab -l 2>/dev/null | grep -v 'SannaLMS/backups' | crontab -
(crontab -l 2>/dev/null; \
 echo "0 2 * * * $DEST_DIR/backup_all.sh >> $DEST_DIR/backup.log 2>&1"; \
 echo "*/30 * * * * $DEST_DIR/health_check.sh") | crontab -

echo "[ok] Cron installed:"
crontab -l | grep 'SannaLMS/backups'

# --- First run to prove it works ---------------------------------------------
echo "[run] Executing backup_all.sh once to verify..."
bash "$DEST_DIR/backup_all.sh" || echo "[warn] First backup had failures — inspect output above."

echo "[done] Backups are live. Daily 02:00 + 30-min health checks. Logs: $DEST_DIR/{backup.log,health.log}"
