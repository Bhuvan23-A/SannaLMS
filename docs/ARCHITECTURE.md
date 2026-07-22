# SaaS LMS Architecture Blueprint

## System Overview
SannaLMS is built as a cloud-native, multi-tenant Software-as-a-Service (SaaS) platform targeting educational institutions, universities, and enterprise learning centers.

```
                  +-----------------------------------+
                  |   SaaS Web Client (Vite React TS) |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |      Kong API Gateway / NGINX      |
                  +-----------------+-----------------+
                                    |
        +---------------------------+---------------------------+
        |                           |                           |
        v                           v                           v
+-------+-------+           +-------+-------+           +-------+-------+
| Part 1 Services|           | Part 2 Services|           | Part 3 Services|
| Auth & Identity|           | LMS & Content |           | Sandbox & Test|
| (Go / Node)   |           | (Node / WS)   |           | (Go Engine)   |
+-------+-------+           +-------+-------+           +-------+-------+
        |                           |                           |
        +---------------------------+---------------------------+
                                    |
                                    v
                        +-----------+-----------+
                        |     Part 4 Services   |
                        |   AI, Proctor & Data  |
                        |    (Python FastAPI)   |
                        +-----------+-----------+
                                    |
       +----------------------------+----------------------------+
       |                            |                            |
       v                            v                            v
+------+------+              +------+------+              +------+------+
|  PostgreSQL |              |    Redis    |              |    MinIO    |
| (Multi-Tenant|             | (Cache/PubSub|             | (S3 Storage)|
|  Schemas)   |              +-------------+              +-------------+
+-------------+
```

---

## Multi-Tenancy Architecture (Schema-Per-Tenant)
Each college or organization onboarded onto SannaLMS gets an isolated schema within PostgreSQL:
- `tenant_default`: Master schema containing system admins, subscriptions, and tenant registry.
- `tenant_<tenant_id>`: Isolated schema containing tenant users, courses, grades, assessments, and attendance.

---

## Microservices Breakdown

### Part 1: Infrastructure & Auth (`services/part1-infra-auth`)
- **`auth-service`**: OAuth2/OIDC provider wrapper, JWT issuance with tenant payload context, TOTP multi-factor verification.
- **`user-service`**: User CRUD, roles & RBAC (Admin, Trainer, Student, SuperAdmin).

### Part 2: LMS Core & Realtime (`services/part2-core-lms`)
- **`college-service`**: College, department, branch, and semester management.
- **`course-service`**: Drag-and-drop course builder, module sequencing.
- **`content-service`**: Video transcoding (HLS m3u8 via FFmpeg), document uploads, SCORM package parsing.
- **`chat-service`**: WebSockets (Socket.IO) real-time 1-on-1 and group messaging.
- **`live-class-service`**: Jitsi Meet & WebRTC integration links and video sessions.
- **`attendance-service`**: QR-code token generator, GPS coordinate fencing validator, manual entry.

### Part 3: Assessment & Code Sandbox (`services/part3-assessment-sandbox`)
- **`assessment-service`**: Adaptive testing engine, MCQ/Essay evaluation, anti-cheat randomized questions, countdown timers.
- **`coding-service`**: Secure Docker-isolated code runner engine. Executes Python, Java, C++ against hidden test cases with strict memory/CPU limits.
- **`assignment-service`**: Assignment workflow, peer review system, MOSS (Measure of Software Similarity) plagiarism scanner.

### Part 4: AI, Analytics & Placements (`services/part4-ai-analytics`)
- **`ai-service`** (Python FastAPI): RAG-based AI Tutor (LangChain/LlamaIndex), automated question generation, OpenCV face/gaze proctoring engine.
- **`analytics-service`**: Cohort performance metrics, retention charts.
- **`gamification-service`**: Student XP, level calculation, badges, tenant leaderboards.
- **`placement-service`**: Company job board, resume generator, drive tracker.
- **`certificate-service`**: Digital PDF certificate generator with cryptographic signature.
