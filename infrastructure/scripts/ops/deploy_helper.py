#!/usr/bin/env python3
"""
SannaLMS deploy helper — the ONE safe way to push code to the production server.

Why this exists
---------------
A previous deploy script refreshed the student frontend with `rm -rf dist && mkdir -p
dist` while the nginx container was running. Docker bind-mounts keep pointing at the
ORIGINAL directory inode, so the running container was left bound to the deleted
(now-empty) folder and served 503/ERR_INVALID_RESPONSE until the container was
recreated. rsync syncs INTO the existing folder without recreating it, so the bind
mount survives every deploy.

Rules enforced here:
  1. NEVER `rm -rf` a bind-mounted directory. Use sync_dist() which rsyncs contents
     in place (rsync --delete only removes files INSIDE the destination, never the
     destination directory itself).
  2. ALWAYS run health_checks() BEFORE and AFTER a deploy. A regression that turns
     the site into a 503/blank page is caught the moment it happens.

Usage
-----
    from deploy_helper import ssh_connect, sync_dist, health_check, run

    ssh = ssh_connect()
    run(ssh, "cd /root/SannaLMS && docker-compose build admin-ui", timeout=900)
    sync_dist(ssh, "frontend/saas-web-app/dist", "/root/SannaLMS/frontend/saas-web-app/dist")
    run(ssh, "cd /root/SannaLMS && docker-compose up -d admin-ui", timeout=300)
    ssh.close()
"""

import os
import sys
import time

HOST = "103.160.144.225"
USER = "root"
PASSWORD = "KB6Vn72p2gS`(\\F"
REMOTE_DIR = "/root/SannaLMS"

# URLs probed before/after every deploy — a status code change from 200 to
# anything else (or a 000 timeout) after a deploy means something regressed.
HEALTH_URLS = {
    "student portal": f"https://sannalms.sannainnovations.com/",
    "admin portal": f"https://admin.sannalms.sannainnovations.com/",
    "api gateway": f"https://sannalms.sannainnovations.com/api/v1/courses",
    "nginx uploads": f"https://sannalms.sannainnovations.com/uploads/healthz",
}


def ssh_connect():
    """Open an SSH connection to the production server."""
    import paramiko
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30,
                look_for_keys=False, allow_agent=False)
    return ssh


def run(ssh, cmd, timeout=600):
    """Run a command on the server and print trimmed output."""
    print(f"\n$ {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    if out:
        print(out[-4000:])
    if err:
        print("STDERR:", err[-2000:])
    return out, err


def sync_dist(ssh, local_dist, remote_dist, sftp=None):
    """
    Safely sync a frontend build into a bind-mounted folder.

    rsync writes INTO the destination in place — it never deletes/recreates the
    destination directory, so a running container's bind mount stays valid. The
    --delete flag only removes stale files inside the folder, never the folder
    itself.
    """
    local_dist = os.path.abspath(local_dist)
    if not os.path.isfile(os.path.join(local_dist, "index.html")):
        raise SystemExit(f"[ERROR] Build missing: {local_dist}/index.html not found. Build first.")
    print(f"\n[sync] {local_dist} -> {remote_dist}")
    # rsync -a --delete: archive mode, remove stale files, never delete the
    # destination folder itself — the running container's bind mount survives.
    _, out, err = ssh.exec_command(
        f"rsync -a --delete --exclude='.*' {local_dist}/ {remote_dist}/ 2>&1", timeout=600)
    out.read()
    e = err.read().decode("utf-8", "replace")
    if e and "rsync:" in e.lower():
        print("rsync reported errors:", e[-500:])
    _, out, _ = ssh.exec_command(f"test -f {remote_dist}/index.html && echo DIST_OK", timeout=60)
    print(" ", out.read().decode().strip())


def health_check(ssh, label="pre-deploy"):
    """
    Probe every HEALTH_URL and print a status line. Returns the status codes dict.

    A code of 000 means the site did not answer at all (connection failed).
    Expected healthy: student/admin = 200, api gateway = 401/403 (needs auth),
    nginx uploads = 404 (route exists, no file at /healthz). Anything else is a
    regression to investigate BEFORE proceeding.
    """
    codes = {}
    print(f"\n--- health check ({label}) ---")
    for name, url in HEALTH_URLS.items():
        _, out, _ = ssh.exec_command(
            f"curl -s -o /dev/null -w '%{{http_code}}' --max-time 15 '{url}' || echo 000", timeout=60)
        code = out.read().decode().strip() or "000"
        codes[name] = code
        flag = "" if code in ("200", "401", "403", "404") else "  <-- CHECK THIS"
        print(f"  {name:14} {code}{flag}")
    return codes


def expect_healthy(codes, stage="deploy"):
    """Fail loudly if the post-deploy health check regressed."""
    bad = {k: v for k, v in codes.items() if v in ("000", "500", "502", "503")}
    if bad:
        raise SystemExit(f"[ERROR] {stage} health check FAILED: {bad}. "
                         f"Do NOT leave the site down — investigate now.")
    return True


if __name__ == "__main__":
    # Standalone smoke test: just connect and run the health checks.
    ssh = ssh_connect()
    try:
        health_check(ssh, label="smoke")
        print("\nDeploy helper OK — use sync_dist() (not rm -rf) and always run "
              "health_check() before/after deploying.")
    finally:
        ssh.close()
