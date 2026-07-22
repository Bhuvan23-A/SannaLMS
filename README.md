# SannaLMS - Multi-Tenant SaaS Learning Management System

SannaLMS is a production-ready, cloud-native, multi-tenant Software-as-a-Service (SaaS) Learning Management System designed for colleges, universities, and technical learning institutions.

---

## 🚀 Architectural Division (4-Person Team)

The platform is split into 4 independent domain parts, allowing a 4-person team to work in parallel on isolated microservices and Git branches:

### 1. Part 1: Infrastructure, Security & User Identity (DevOps & Auth)
- **Branch**: `part1/infra-auth-identity`
- **Key Features**: Keycloak SSO, OAuth2, multi-factor authentication (TOTP), PostgreSQL schema-per-tenant isolation, MinIO object storage, NGINX/Kong gateway routing, and GitHub Actions CI/CD pipelines.

### 2. Part 2: Learning Management, Content & Real-Time Communication (Full-Stack Core)
- **Branch**: `part2/core-lms-content-chat`
- **Key Features**: College/Branch structure, drag-and-drop course builder, video transcoding (HLS m3u8), document & SCORM package parsing, Socket.IO real-time chat, Jitsi WebRTC live classes, and QR/GPS attendance tracking.

### 3. Part 3: Assessment, Proctoring & Coding Sandbox (Backend & Sandbox)
- **Branch**: `part3/assessment-coding-sandbox`
- **Key Features**: Question bank (MCQs, essays), adaptive testing engine with timers, Docker-isolated code runner engine (Python, Java, C++), assignment submission workflows, peer review, and MOSS plagiarism detection.

### 4. Part 4: AI Integration, Analytics & Placements (AI/ML & Data)
- **Branch**: `part4/ai-analytics-placements`
- **Key Features**: FastAPI RAG-based AI Tutor, OpenCV face detection and gaze estimation proctoring, student performance dashboards, XP & gamification leaderboards, placement job portal, and auto-generated digital certificates.

---

## 🛠️ Tech Stack Overview

- **Frontend**: Vite + React + TypeScript, Tailwind / Custom Modular CSS.
- **Backend Services**: Node.js / Express (Core LMS & Auth), Go (Isolated Code Execution Engine), Python / FastAPI (AI & Proctoring).
- **Databases**: PostgreSQL (Schema-per-tenant isolation), Redis (Session cache & Socket Pub/Sub).
- **Storage & Infrastructure**: MinIO (S3 compatible), Docker Compose, NGINX / Kong Gateway.

---

## ⚡ Quick Start for Development

### 1. Clone & Set Up Branch
```bash
git clone <REPOSITORY_URL>
cd SannaLMS
git fetch --all

# Switch to your assigned part branch (e.g., Part 2):
git checkout part2/core-lms-content-chat
```

### 2. Start Infrastructure via Docker Compose
```bash
docker-compose up -d
```
Access points:
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **MinIO Storage Console**: `http://localhost:9001`
- **NGINX Gateway**: `http://localhost:8080`

### 3. Deployment on Linux & Windows
See detailed guides in [docs/DEPLOYMENT_GUIDE.md](file:///f:/SannaLMS/docs/DEPLOYMENT_GUIDE.md):
- **Linux (Ubuntu)**: `./infrastructure/scripts/deploy-linux.sh`
- **Windows Server**: `.\infrastructure\scripts\deploy-windows.ps1`

---

## 📖 Team Guides
- [Team Git Workflow Guide](file:///f:/SannaLMS/docs/TEAM_WORKFLOW.md)
- [Architecture Blueprint](file:///f:/SannaLMS/docs/ARCHITECTURE.md)
- [Deployment Guide](file:///f:/SannaLMS/docs/DEPLOYMENT_GUIDE.md)
