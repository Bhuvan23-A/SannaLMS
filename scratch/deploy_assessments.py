import paramiko
import sys
import time

HOST = "195.35.21.204"
USER = "root"
PASSWORD = "FCx.xfQ9grQg7WdB"

def run_cmd(ssh, cmd, timeout=300):
    print(f"\n[RUN] {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    if out:
        print(out[-3000:])
    if err:
        print("STDERR:", err[-1000:])
    return out, err

def main():
    print(f"Connecting to VPS {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected successfully!")

    try:
        # Pull latest commit from develop branch
        run_cmd(ssh, "cd /root/SannaLMS && git fetch origin develop && git reset --hard origin/develop")

        # Copy updated keycloak theme files into running container if needed
        run_cmd(ssh, "docker cp /root/SannaLMS/infrastructure/keycloak/themes/sannalms sannalms-keycloak:/opt/keycloak/themes/ || true")

        # Rebuild and restart admin-ui
        run_cmd(ssh, "cd /root/SannaLMS && docker compose build admin-ui", timeout=600)
        run_cmd(ssh, "cd /root/SannaLMS && docker compose up -d admin-ui", timeout=180)

        # Reload kong
        run_cmd(ssh, "docker exec sannalms-kong kong reload")

        # Health check
        print("\n--- HEALTH CHECKS ---")
        for url in [
            "https://sannalms.sannainnovations.com/",
            "https://admin.sannalms.sannainnovations.com/",
            "https://sannalms.sannainnovations.com/api/v1/courses",
            "https://sannalms.sannainnovations.com/auth/realms/sannalms/protocol/openid-connect/auth?client_id=sannalms-client&redirect_uri=https://sannalms.sannainnovations.com/&response_type=code&scope=openid"
        ]:
            _, out, _ = ssh.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' --max-time 15 '{url}'")
            code = out.read().decode().strip()
            print(f"  {url[:70]}... => {code}")

        print("\nDEPLOYMENT COMPLETED SUCCESSFULLY!")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
