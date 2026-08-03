import os
import re

DOCKERFILES = [
    "services/part1-infra-auth/auth-service/Dockerfile",
    "services/part1-infra-auth/user-service/Dockerfile",
    "services/part2-core-lms/assessment-service/Dockerfile",
    "services/part2-core-lms/attendance-service/Dockerfile",
    "services/part2-core-lms/calendar-service/Dockerfile",
    "services/part2-core-lms/certificate-service/Dockerfile",
    "services/part2-core-lms/chat-service/Dockerfile",
    "services/part2-core-lms/college-service/Dockerfile",
    "services/part2-core-lms/course-service/Dockerfile",
    "services/part2-core-lms/discussion-service/Dockerfile",
    "services/part2-core-lms/gateway-service/Dockerfile",
    "services/part2-core-lms/liveclass-service/Dockerfile",
    "services/part2-core-lms/notification-service/Dockerfile",
    "services/part2-core-lms/search-service/Dockerfile",
    "services/part3-assessment-sandbox/assessment-service/Dockerfile",
    "services/part3-assessment-sandbox/assignment-service/Dockerfile",
]

def patch_file(filepath):
    full_path = os.path.join("f:/SannaLMS", filepath)
    if not os.path.exists(full_path):
        print(f"[WARN] File not found: {full_path}")
        return
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace FROM node:22-alpine with node:22-slim and add openssl install
    patched = content.replace("FROM node:22-alpine AS builder", "FROM node:22-slim AS builder\nRUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*")
    patched = patched.replace("FROM node:22-alpine AS production", "FROM node:22-slim AS production\nRUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*")
    
    with open(full_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(patched)
    print(f"[OK] Patched: {filepath}")

if __name__ == "__main__":
    for df in DOCKERFILES:
        patch_file(df)
