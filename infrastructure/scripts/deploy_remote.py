import os
import zipfile
import paramiko
import time

# Remote Server Config
HOST = "195.35.21.204"
USER = "root"
PASSWORD = "FCx.xfQ9grQg7WdB"
REMOTE_DIR = "/root/SannaLMS"
ZIP_FILE_PATH = "f:/SannaLMS/sannalms_deploy.zip"
REMOTE_ZIP_PATH = "/root/sannalms_deploy.zip"

def create_zip(source_dir, output_filename):
    print(f"[INFO] Compressing workspace: {source_dir} -> {output_filename}...")
    
    # Exclude list
    exclude_folders = {
        'node_modules', '.git', 'postgres_data', 'redis_data', 'minio_data',
        'kong_data', '.venv', 'venv', '__pycache__', '.idea', '.vscode'
    }
    
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in exclude_folders]
            
            for file in files:
                if file.endswith('.zip') or file.endswith('.tar.gz'):
                    continue
                
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, source_dir)
                zipf.write(abs_path, rel_path)
                
    print("[INFO] Compression complete.")

def deploy():
    # 1. Create local zip
    source_dir = "f:/SannaLMS"
    create_zip(source_dir, ZIP_FILE_PATH)
    
    # 2. Connect via SSH
    print(f"[INFO] Connecting to remote server {HOST} via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=15)
        print("[INFO] SSH Connection successful.")
    except Exception as e:
        print(f"[ERROR] SSH Connection failed: {e}")
        return

    # 3. Check Docker status on host
    print("[INFO] Checking Docker & Docker Compose installation on server...")
    stdin, stdout, stderr = ssh.exec_command("docker --version")
    docker_out = stdout.read().decode('utf-8')
    if "docker" not in docker_out.lower():
        print("[INFO] Installing Docker on remote server...")
        commands = [
            "apt-get update",
            "apt-get install -y apt-transport-https ca-certificates curl software-properties-common unzip",
            "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -",
            "add-apt-repository \"deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\"",
            "apt-get update",
            "apt-get install -y docker-ce docker-compose-plugin docker-compose"
        ]
        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            stdout.read() # wait for execution
    else:
        print(f"[INFO] Docker is present: {docker_out.strip()}")

    # Detect compose version
    stdin, stdout, stderr = ssh.exec_command("docker compose version")
    plugin_out = stdout.read().decode('utf-8')
    stdin, stdout, stderr = ssh.exec_command("docker-compose --version")
    standalone_out = stdout.read().decode('utf-8')
    
    if "version" in plugin_out.lower():
        compose_cmd = "docker compose"
    elif "version" in standalone_out.lower():
        compose_cmd = "docker-compose"
    else:
        print("[INFO] Installing docker-compose standalone as fallback...")
        stdin, stdout, stderr = ssh.exec_command("apt-get update && apt-get install -y docker-compose")
        stdout.read()
        compose_cmd = "docker-compose"

    print(f"[INFO] Using compose command: {compose_cmd}")

    # 4. Upload zip file using SFTP
    print(f"[INFO] Uploading {ZIP_FILE_PATH} to {REMOTE_ZIP_PATH} (this might take a minute)...")
    sftp = ssh.open_sftp()
    sftp.put(ZIP_FILE_PATH, REMOTE_ZIP_PATH)
    sftp.close()
    print("[INFO] Upload complete.")

    # 5. Extract zip on server
    print(f"[INFO] Extracting zip file into {REMOTE_DIR}...")
    ssh.exec_command(f"mkdir -p {REMOTE_DIR}")
    ssh.exec_command("apt-get install -y unzip")
    
    stdin, stdout, stderr = ssh.exec_command(f"unzip -o {REMOTE_ZIP_PATH} -d {REMOTE_DIR}")
    stdout.read() # Wait for extraction to complete
    print("[INFO] Extraction complete.")

    # 5.5 Fail loudly if the frontend build is missing — a missing dist/
    # silently turns the site into nginx's cryptic 403/500 after deploy.
    print("[INFO] Verifying frontend build output (dist/index.html)...")
    stdin, stdout, stderr = ssh.exec_command(f"test -f {REMOTE_DIR}/frontend/saas-web-app/dist/index.html")
    if stdout.channel.recv_exit_status() != 0:
        print("[ERROR] Frontend build missing: frontend/saas-web-app/dist/index.html not found. Aborting deployment.")
        ssh.close()
        return

    # 6. Execute docker compose build and run
    print("[INFO] Spawning docker containers on server...")
    docker_cmd = f"cd {REMOTE_DIR} && {compose_cmd} down && {compose_cmd} up -d --build"
    stdin, stdout, stderr = ssh.exec_command(docker_cmd)
    
    while True:
        line = stdout.readline()
        if not line:
            break
        # Strip out any non-ascii characters to prevent Windows console encoding crashes
        clean_line = line.strip().encode('ascii', errors='ignore').decode('ascii')
        print(f"   [DOCKER] {clean_line}")
        
    err_output = stderr.read().decode('utf-8', errors='ignore')
    if err_output:
        print(f"   [DOCKER ERR] {err_output}")

    # Verify live containers
    print("[INFO] Verifying live containers...")
    stdin, stdout, stderr = ssh.exec_command("docker ps")
    print(stdout.read().decode('utf-8'))

    # Clean up remote zip
    ssh.exec_command(f"rm {REMOTE_ZIP_PATH}")
    ssh.close()
    
    if os.path.exists(ZIP_FILE_PATH):
        os.remove(ZIP_FILE_PATH)
        
    print("\n=======================================================")
    print(" Deploy finished!")
    print(f" Access URL: http://{HOST}:8085")
    print(f" MinIO console: http://{HOST}:9091")
    print("=======================================================")

if __name__ == "__main__":
    deploy()
