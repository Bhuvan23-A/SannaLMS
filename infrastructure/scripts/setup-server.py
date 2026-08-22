"""SannaLMS server setup — upload and run on new server."""
import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HOST = "195.35.21.204"
USER = "root"
PASSWORD = "FCx.xfQ9grQg7WdB"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15,
            look_for_keys=False, allow_agent=False)


def run(cmd, timeout=300):
    print(f"\n>>> {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out:
        print(out[-3000:])
    if err and err.strip():
        print("STDERR:", err[-2000:])
    return out, err


# Step 1: Clean up failed Docker install state
print("\n=== Cleaning up previous Docker install attempt ===")
run("rm -f /etc/apt/keyrings/docker.gpg /etc/apt/sources.list.d/docker.list", timeout=10)

# Step 2: Import Docker GPG key
print("\n=== Importing Docker GPG key ===")
run("curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg", timeout=60)
run("chmod a+r /etc/apt/keyrings/docker.gpg", timeout=10)

# Step 3: Add Docker repo
print("\n=== Adding Docker repository ===")
arch, _ = run("dpkg --print-architecture", timeout=10)
arch = arch.strip()
codename, _ = run("lsb_release -cs", timeout=10)
codename = codename.strip()
print(f"  arch={arch} codename={codename}")

repo = f"deb [arch={arch} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu {codename} stable"
# Write using a heredoc to avoid quoting issues
run(f"cat > /etc/apt/sources.list.d/docker.list <<'REPOEOF'\n{repo}\nREPOEOF", timeout=10)

# Step 4: Install Docker
print("\n=== Installing Docker ===")
run("apt-get update -y", timeout=120)
run("apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin", timeout=600)

# Step 5: Verify
print("\n=== Verifying Docker ===")
run("docker --version", timeout=10)
run("docker compose version", timeout=10)

# Step 6: Install utilities
print("\n=== Installing utilities ===")
run("apt-get install -y git curl wget htop unzip", timeout=120)

# Step 7: Clone repo (private repo, needs token)
print("\n=== Cloning SannaLMS ===")
run("rm -rf /root/SannaLMS", timeout=30)
run("cd /root && git clone https://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@github.com/Bhuvan23-A/SannaLMS.git SannaLMS", timeout=300)
run("cd /root/SannaLMS && git checkout develop 2>/dev/null || git checkout main", timeout=30)

# Step 8: Create .env
print("\n=== Creating .env ===")
env_content = """POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sannalms_master
POSTGRES_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
JWT_SECRET=sannalms_prod_jwt_secret_2026
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=SannaLMS_KC_2026!
KONG_PG_USER=kong
KONG_PG_PASSWORD=kongpass_sannalms_2026
KONG_PG_DATABASE=kong
KEYCLOAK_ADMIN_SECRET=sannalms-api-svc-local"""

# Write .env using run + heredoc
run("cat > /root/SannaLMS/.env <<'ENVEOF'\n"
    "POSTGRES_USER=postgres\n"
    "POSTGRES_PASSWORD=postgres\n"
    "POSTGRES_DB=sannalms_master\n"
    "POSTGRES_PORT=5432\n"
    "REDIS_HOST=redis\n"
    "REDIS_PORT=6379\n"
    "MINIO_ROOT_USER=admin\n"
    "MINIO_ROOT_PASSWORD=minioadmin\n"
    "MINIO_PORT=9000\n"
    "MINIO_CONSOLE_PORT=9001\n"
    "JWT_SECRET=sannalms_prod_jwt_secret_2026\n"
    "KEYCLOAK_ADMIN=admin\n"
    "KEYCLOAK_ADMIN_PASSWORD=SannaLMS_KC_2026!\n"
    "KONG_PG_USER=kong\n"
    "KONG_PG_PASSWORD=kongpass_sannalms_2026\n"
    "KONG_PG_DATABASE=kong\n"
    "KEYCLOAK_ADMIN_SECRET=sannalms-api-svc-local\n"
    "ENVEOF", timeout=10)
run("head -3 /root/SannaLMS/.env", timeout=10)

# Step 9: Build frontend
print("\n=== Building student portal ===")
run("cd /root/SannaLMS/frontend/saas-web-app && npm install --no-audit --no-fund", timeout=300)
run("cd /root/SannaLMS/frontend/saas-web-app && npm run build", timeout=300)

# Verify
out, _ = run("test -f /root/SannaLMS/frontend/saas-web-app/dist/index.html && echo BUILD_OK || echo BUILD_MISSING", timeout=10)
print(f"  Frontend: {out.strip()}")

ssh.close()
print("\n=== Phase 1 complete: Docker + Repo + Frontend ready ===")
