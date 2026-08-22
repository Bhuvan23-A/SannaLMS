#!/usr/bin/env python3
"""
SannaLMS deploy helper — the ONE safe way to push code to the production server.

Why this exists
---------------
Two production outages taught us the rules:

1. NEVER delete/recreate a bind-mounted folder during a deploy. `rm -rf dist &&
   mkdir -p dist` while the nginx container is running breaks the Docker bind
   mount: the container keeps pointing at the ORIGINAL (now-deleted, empty)
   directory inode and serves 503 / ERR_INVALID_RESPONSE until the container
   is recreated. sync_dist() uploads files IN PLACE via SFTP — it never
   touches the directory itself, only the files inside it.

2. ALWAYS run health_check() before and after every deploy. A regression that
   turns the site into a 503/blank page is caught the moment it happens.

IMPORTANT GOTCHA (fixed): sync_dist() must upload via SFTP from THIS machine.
Running rsync on the SERVER with a local (Windows) source path silently fails
because the source doesn't exist there — and since the old files remain, every
check still passes while the new build is never actually deployed. Uploading
via SFTP guarantees the new files land.

Usage
-----
    from deploy_helper import ssh_connect, sync_dist, health_check, run

    ssh = ssh_connect()
    run(ssh, "cd /root/SannaLMS && docker-compose build admin-ui", timeout=900)
    sync_dist(ssh, "frontend/saas-web-app/dist",
              "/root/SannaLMS/frontend/saas-web-app/dist")
    run(ssh, "cd /root/SannaLMS && docker-compose up -d admin-ui", timeout=300)
    ssh.close()
"""

import os
import stat

HOST = "195.35.21.204"
USER = "root"
PASSWORD = "FCx.xfQ9grQg7WdB"
REMOTE_DIR = "/root/SannaLMS"

# URLs probed before/after every deploy — a status code change from 200 to
# anything else (or a 000 timeout) after a deploy means something regressed.
HEALTH_URLS = {
    "student portal": "https://sannalms.sannainnovations.com/",
    "admin portal": "https://admin.sannalms.sannainnovations.com/",
    "api gateway": "https://sannalms.sannainnovations.com/api/v1/courses",
    "nginx uploads": "https://sannalms.sannainnovations.com/uploads/healthz",
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
    Safely push a frontend build into a bind-mounted folder, IN PLACE.

    Uploads every file via SFTP (files are replaced individually — the folder
    itself and its inode are never touched, so a running container's bind
    mount stays valid). Then deletes files that exist remotely but not in the
    new build (stale hashed bundles) — again file-by-file, never the folder.

    Returns the set of uploaded file paths so callers can verify afterwards.
    """
    local_dist = os.path.abspath(local_dist)
    index = os.path.join(local_dist, "index.html")
    if not os.path.isfile(index):
        raise SystemExit(f"[ERROR] Build missing: {index} not found. Build first.")
    print(f"\n[sync] {local_dist} -> {remote_dist}")

    if sftp is None:
        sftp = ssh.open_sftp()

    # mkdir -p is safe: it's a no-op on an existing directory (inode untouched).
    _, out, _ = ssh.exec_command(f"mkdir -p {remote_dist}", timeout=60)
    out.read()

    # Collect local files (clean relative paths — no leading "./" — so they
    # match the remote walk exactly; a mismatch would delete top-level files
    # like index.html as "stale").
    local_files = set()
    for root, dirs, files in os.walk(local_dist):
        rel = os.path.relpath(root, local_dist)
        for f in files:
            rel_path = os.path.join(rel, f).replace("\\", "/")
            if rel_path.startswith("./"):
                rel_path = rel_path[2:]
            local_files.add(rel_path)

    # Upload each file in place.
    uploaded = set()
    for rel in sorted(local_files):
        local_path = os.path.join(local_dist, rel.replace("/", os.sep))
        remote_path = os.path.join(remote_dist, rel).replace("\\", "/")
        sftp.put(local_path, remote_path)
        uploaded.add(rel)
    print(f"  uploaded {len(uploaded)} files")

    # Delete stale remote files that are no longer in the new build — done via
    # SFTP file-by-file (never `find -delete`, which matched basenames and wiped
    # the whole folder including index.html). Only files are removed; empty
    # directories are left alone so the bind mount inode is never touched.
    def list_remote_files(sftp, base, prefix=""):
        result = []
        try:
            entries = sftp.listdir_attr(base)
        except IOError:
            return result
        for e in entries:
            rel = f"{prefix}/{e.filename}" if prefix else e.filename
            is_dir = e.st_mode is not None and stat.S_ISDIR(e.st_mode)
            if is_dir:
                result.extend(list_remote_files(sftp, f"{base}/{e.filename}", rel))
            else:
                result.append(rel)
        return result

    try:
        remote_files = list_remote_files(sftp, remote_dist)
    except Exception:
        remote_files = []
    stale = [r for r in remote_files if r not in local_files]
    for rel in stale:
        try:
            sftp.remove(os.path.join(remote_dist, rel).replace("\\", "/"))
        except IOError:
            pass
    if stale:
        print(f"  removed {len(stale)} stale files")

    # Verify the new index.html actually landed (the earlier bug deleted it).
    _, out, _ = ssh.exec_command(f"test -f {remote_dist}/index.html && echo DIST_OK", timeout=60)
    print(" ", out.read().decode().strip())
    return uploaded


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
        print("\nDeploy helper OK — use sync_dist() (in-place SFTP) and always run "
              "health_check() before/after deploying.")
    finally:
        ssh.close()
