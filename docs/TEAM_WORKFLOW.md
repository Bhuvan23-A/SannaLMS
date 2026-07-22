# Team Collaboration & Git Branching Guide

Welcome to the **SannaLMS Monorepo**. This guide explains how your 4-person team should clone, isolate work on dedicated branches, test locally, and merge changes without causing conflicts.

---

## 1. Branch Ownership Breakdown

| Team Member | Branch Name | Directory Scope | Domain Responsibility |
| :--- | :--- | :--- | :--- |
| **Member 1 (DevOps & Auth)** | `part1/infra-auth-identity` | `infrastructure/`, `.github/`, `services/part1-infra-auth/` | Keycloak, Auth/User Services, PostgreSQL schemas, MinIO, Kong, CI/CD |
| **Member 2 (LMS Core)** | `part2/core-lms-content-chat` | `services/part2-core-lms/`, `frontend/saas-web-app/src/modules/lms/` | College, Course, Content (HLS/SCORM), Chat (Socket.IO), Live Class, Attendance |
| **Member 3 (Assessment & Sandbox)** | `part3/assessment-coding-sandbox` | `services/part3-assessment-sandbox/`, `frontend/saas-web-app/src/modules/assessment/` | Question bank, Adaptive Testing engine, Docker Code Sandbox, Plagiarism |
| **Member 4 (AI & Analytics)** | `part4/ai-analytics-placements` | `services/part4-ai-analytics/`, `frontend/saas-web-app/src/modules/analytics/` | FastAPI AI Tutor (RAG), OpenCV proctoring, Dashboards, Gamification, Certificates |

---

## 2. Initial Setup Instructions for Teammates

Each team member should run the following commands in their terminal after getting access to the repository:

### Step 1: Clone the Repository
```bash
git clone <REPOSITORY_URL>
cd SannaLMS
```

### Step 2: Fetch All Branches
```bash
git fetch --all
```

### Step 3: Switch to Your Dedicated Branch
Select your assigned branch:

- **Member 1**:
  ```bash
  git checkout part1/infra-auth-identity
  ```
- **Member 2**:
  ```bash
  git checkout part2/core-lms-content-chat
  ```
- **Member 3**:
  ```bash
  git checkout part3/assessment-coding-sandbox
  ```
- **Member 4**:
  ```bash
  git checkout part4/ai-analytics-placements
  ```

---

## 3. Daily Development Workflow

To ensure you **only make changes in your branch** and stay up-to-date:

### Step 1: Pull Latest Base Changes from `develop`
Before starting new work each day, pull updates from the `develop` integration branch into your working branch:
```bash
git pull origin develop
```

### Step 2: Work strictly within your microservices directory
- **Member 1**: Edit `services/part1-infra-auth/*` and `infrastructure/*`
- **Member 2**: Edit `services/part2-core-lms/*`
- **Member 3**: Edit `services/part3-assessment-sandbox/*`
- **Member 4**: Edit `services/part4-ai-analytics/*`

### Step 3: Commit and Push to Your Remote Branch
```bash
# Stage your changes
git add .

# Commit with a clear descriptive message
git commit -m "feat(course-service): add HLS video upload pipeline"

# Push strictly to YOUR branch on GitHub
git push origin <YOUR_BRANCH_NAME>
```
*Example for Member 2:*
```bash
git push origin part2/core-lms-content-chat
```

---

## 4. Merging Code into `develop` / `main`

When a feature or part milestone is ready:

1. Go to GitHub / GitLab and create a **Pull Request (PR)**.
2. Set **Base Branch** to `develop` and **Compare Branch** to your branch (e.g. `part2/core-lms-content-chat`).
3. Ensure CI/CD tests pass automatically.
4. Request code review from at least one teammate.
5. Once approved, perform a **Squash and Merge** or **Rebase Merge** into `develop`.
6. `main` will be updated for production deployment.

---

## 5. Local Orchestration with Docker

Run all infrastructure services (Postgres multi-tenant, Redis, MinIO, Kong) locally:

```bash
docker-compose up -d
```

To view running containers:
```bash
docker-compose ps
```

To stop containers:
```bash
docker-compose down
```
