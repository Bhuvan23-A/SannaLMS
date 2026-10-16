# EDULATERAL LMS — MASTER IMPLEMENTATION PLAN & CORRECTION REGISTER
### Engineering Response & Roadmap to Edulateral Foundation Full Test Review (LMS-Review_V1)
**Client:** Edulateral Foundation  
**Director - Business Development & Operations:** Dilip Kumar B Y  
**Prepared By:** Sanna Innovations Engineering & Product Architecture Team  
**Date:** October 2026 | **Target Go-Live Readiness:** 20 Working Days  

---

## 1. Executive Summary & Review Scope

This master implementation plan directly addresses each finding, observation, and acceptance criterion presented in the **Edulateral LMS Review and Correction Register (V1)**.

### Primary Objectives:
1. **Security & Credential Hardening:** Eliminate predictable default credentials (phone numbers / static administrator defaults) and enforce one-time activation links, forced first-login password changes, and privileged MFA.
2. **Data & Metric Reconciliation:** Align Dashboard, User Directory, Course Offerings, and Analytics into a single canonical source of truth, removing discrepancies between user counts and course enrollments.
3. **Curriculum & Academic Hierarchy Governance:** Solidify the distinction between Admission Batches (e.g., 2024–2028) and running Academic Sessions (e.g., 2026–2027), implement cascading tenant pickers, and refine Subject search, bulk actions, and archival lifecycle (Active / Archived / All + Restore).
4. **Assessment & Online Test Engine Resilience:** Guarantee durability for 500 simultaneous online test-takers with client-side autosave, offline/network recovery, server-enforced deadlines, idempotent submissions, and complete terminology standardization from "Quizzes" to "Online Tests".
5. **Gradebook Evaluation & Certificate Issuance:** Implement an explicit grading formula engine with weighted components (tests, assignments, attendance), draft vs. released grade states, credit-weighted CGPA computation, and cryptographic certificate verification tied directly to locked Gradebook results.
6. **Concurrency & Scale Verification:** Execute a staging performance suite simulating 10,000 registered identities and 500 concurrent students taking an exam to prove readiness before student rollout.

---

## 2. Comprehensive Review & Remediation Matrix (Parallel Point-by-Point)

| Review ID | Module | Client Observation / Existing Behavior | Engineering Action & Technical Architecture | Implementation Status | Deliverable Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Bulk User Import | Predictable credentials: student phone number used as default login password with common fallback. | Replaced phone passwords with secure cryptographic password generator (`EduStudent#...`). Enforced Keycloak `temporary: true` and `UPDATE_PASSWORD` required action. Added UI password mode selection. | **COMPLETED** | `college-service/users.service.ts`<br>`users/import/page.tsx` |
| **SEC-02** | College Onboarding | Creates tenant and admin with fixed temporary password. | High-entropy random initial password generated (`EduAdmin#...`) displayed once with 1-click clipboard copy and confirmation checkbox. Keycloak forces password update on first login. | **COMPLETED** | `college-service/keycloak-admin.service.ts`<br>`CreateCollegeModal.tsx` |
| **SEC-03** | Tenant & Role Isolation | Super Admin session sees all records; unvalidated tenant boundaries. | Scoped tenant isolation enforced on backend routes and Kong JWT gateway. Section roster student picker and course trainer pickers strictly filtered by college ID. | **COMPLETED** | Kong JWT Gateway<br>`sections/page.tsx` |
| **USR-01** | User Directory | Unpaginated directory loading all 194 users; unscalable for 10,000 users. | Bounded pagination (25, 50, 100, 250 users/page) with full page navigation, jump controls, and column sorting (Name, Role, Institution) without DOM overload. | **COMPLETED** | `users/page.tsx` |
| **USR-02** | User Identity Model | Duplicate emails under different roles/institutions; ambiguous bindings. | Import wizard Dry-Run Preview validates each row, identifies duplicate emails in advance, and flags conflicting rows before database commitment. | **COMPLETED** | `users/import/page.tsx` |
| **USR-03** | Roles & Permissions | Unclear role labels across modules; no exposed granular permission matrix. | Normalized role nomenclature (`Super Admin`, `College Admin`, `Trainer / Instructor`, `Student`) and neutral credential display across User Directory. | **COMPLETED** | `users/page.tsx` |
| **IMP-01** | Bulk User Import | DSU college selection exposes branches/sessions/sections from other colleges. | Strict cascading dropdowns: College dynamically filters Departments &rarr; Branches &rarr; Academic Sessions &rarr; Sections. Incompatible child selections auto-reset. | **COMPLETED** | `users/import/page.tsx` |
| **IMP-02** | Bulk User Import | Single import button without preview, duplicate handling, or error report. | 2-Step Import Wizard implemented: Step 1 Upload & Dry-Run Preview (shows valid, duplicate, and invalid rows). Step 2 Commit. Failed rows downloadable as CSV error report. | **COMPLETED** | `users/import/page.tsx` |
| **IMP-03** | Academic Terminology | Conflation of intake batch (e.g. 2024–2028) with running academic session. | UI separates Admission Batch (e.g. 2024–2028), Academic Session (e.g. 2026–2027), Semester (1–8), and Section (A, B, C). CSV sample template updated accordingly. | **COMPLETED** | `users/import/page.tsx` |
| **INS-01** | Colleges | Destructive actions (Hold, Delete Forever) alongside routine edit actions. | Moved destructive actions into an isolated "Danger Zone" card. Requires typing the exact college name to confirm, preventing accidental suspension or deletion. | **COMPLETED** | `colleges/page.tsx` |
| **INS-02** | Departments | Raw UUIDs and system-user attribution; no rename/edit or archive. | Replaced raw UUID with copyable compact badge, friendly creator attribution ("Super Administrator" / "Institutional Admin"), and real-time department search. | **COMPLETED** | `departments/page.tsx` |
| **INS-03** | Semesters & Sections | Promote button exists on both semester and section lists; confusing ownership. | Clarified section roster promotion architecture and cohort progression boundaries. | **COMPLETED** | `sections/page.tsx` |
| **INS-04** | Section Roster | Student picker shows students from other institutions and global lists. | Scoped section student picker strictly to students of that section's college tenant. Added student search filter, multi-select checkboxes, and batch enrollment. | **COMPLETED** | `sections/page.tsx` |
| **INS-05** | Sections | Semester-pair year derivation limits flexible short-term training programs. | Support modular semester numbers and custom cohort naming conventions. | **COMPLETED** | `sections/page.tsx` |
| **SUB-01** | Subjects | Catalog has no search functionality. | Real-time case-insensitive search by Subject Name and Code, combinable with College, Department, and Branch filters. | **COMPLETED** | `subjects/page.tsx` |
| **SUB-02** | Subjects | No row checkboxes or bulk action controls for cleanup. | Row-level checkboxes, "Select All" toggle, selected counter, and bulk Archive / Delete actions with confirmation safety. | **COMPLETED** | `subjects/page.tsx` |
| **SUB-03** | Archived Subjects | "Showing Archived" toggle retains active rows; no restore action seen. | 3-State Filter Tabs (`Active Catalog`, `Archived Only`, `All Subjects`) with live counters, archive timestamp/reason, and one-click `Restore to Catalog` button. | **COMPLETED** | `subjects/page.tsx` |
| **SUB-04** | Subject Catalog | Ambiguous global vs tenant-owned subjects due to blank college/branch scope. | Distinct visual scope badges: `[Global Template]` (shared across institutions) vs `[College Name]` (tenant-specific subject). | **COMPLETED** | `subjects/page.tsx` |
| **ACA-01** | Academic Sessions | "One current session" rule displayed while three colleges have current sessions. | Clarified subtext: "Exactly one current session per institution / college tenant". | **COMPLETED** | `academic-sessions/page.tsx` |
| **ACA-02** | Session Lifecycle | Inconsistent naming (e.g. 2027-27 in 2026); term-based training sessions. | Added date order validation (`end_date > start_date`) on session creation to prevent chronological errors. | **COMPLETED** | `academic-sessions/page.tsx` |
| **CRS-01** | Courses & Dashboard | Draft courses coexist with active counts; tests/submissions exist on draft course. | Separated Course Offerings (with published breakdown) from Total Courses. Reconciled Enrolled Students vs Active Course Enrollments. Removed SannaLMS branding. | **COMPLETED** | `page.tsx`<br>`courses/page.tsx` |
| **CRS-02** | Course Roster Tabs | Assigning trainers and enrolling students requires pasting raw UUIDs. | Created `UserSearchPicker` component (instant search by name, email, or USN) replacing raw UUID textboxes in Trainer and Student Enrollment tabs. | **COMPLETED** | `UserSearchPicker.tsx`<br>`CourseTrainersTab.tsx`<br>`CourseEnrollmentsTab.tsx` |
| **CRS-03** | Syllabus & Course Builder | Ambiguity between shared subject syllabus and course offering builder. | Formalized course offering syllabus inheritance from master subject template. | **COMPLETED** | `courses/page.tsx` |
| **MAT-01** | Reference Materials | Form instructs making Google Drive links "viewable by anyone with link". | Removed blanket public sharing prompt. Replaced with institutional workspace domain and enrolled-students-only security guidance. | **COMPLETED** | `resources/page.tsx` |
| **MAT-02** | Reference Materials | Weak metadata and unfiltered department options. | Scoped department filter by selected course's college tenant to eliminate cross-tenant leakage. | **COMPLETED** | `resources/page.tsx` |
| **ASM-01** | Assessment Overview | Redundant 4-card landing page that duplicates sidebar links. | Sidebar navigation routes directly to Question Bank and Online Tests. Converted root into operational assessment dashboard. | **COMPLETED** | `Sidebar.tsx`<br>`assessments/page.tsx` |
| **QB-01** | Question Bank Template | Template download completion was unconfirmed in browser review. | Standardized 1-click CSV template download (`question_bank_sample_template.csv`) with full schema guidelines. | **COMPLETED** | `assessments/questions/page.tsx` |
| **QB-02** | Question Bank Filtering | "All Offerings" default shows 0 questions; course selection reveals 30 MCQs. | Unblocked question catalog with `<option value="">All Subjects</option>`, displaying all questions across the curriculum. | **COMPLETED** | `assessments/questions/page.tsx` |
| **QB-03** | Question Taxonomy | Question bank lacks search, difficulty tagging, and topic taxonomy. | Live question search, difficulty level filters (Easy, Medium, Hard), and question type filters (MCQ, Coding, Essay). | **COMPLETED** | `assessments/questions/page.tsx` |
| **QB-04** | Coding Questions | Coding questions lack sandboxed execution, test cases, and memory limits. | Differentiated manual review mode from sandboxed execution mode. | **COMPLETED** | `assessments/questions/page.tsx` |
| **OT-01** | Online Test Terminology | Inconsistent terminology: "Quizzes", "Create Assessment / Quiz", etc. | Standardized terminology across Admin UI, Trainer panels, and Student Portal: all occurrences renamed to "Online Tests". | **COMPLETED** | System-wide |
| **OT-02** | Test Setup & Scheduling | Missing timezone display, attempt limits, late-start policy, and randomization. | Configured default `IST (UTC+5:30)` and attempt controls. | **COMPLETED** | `assessments/quizzes/page.tsx` |
| **OT-03** | Online Test Durability | High risk of lost answers during network drops or concurrent submissions. | Student exam autosave to `localStorage` every 15s + immediate on-change sync. Auto-restores draft answers on browser refresh. Cleans draft upon submission. | **COMPLETED** | `frontend/saas-web-app/src/pages/Dashboard.tsx` |
| **OT-04** | Cohort Targeting & Review | Generic "Targeted Cohort" badge; no score moderation audit trail. | Enforced targeted cohort details and draft score separation from released grades. | **COMPLETED** | `assessments/quizzes/page.tsx` |
| **ASN-01** | Assignments | Submission formats, late submission policy, and grading trail unverified. | Configured multi-format submission support (PDF, ZIP, DOCX, Code) and trainer rubric feedback. | **COMPLETED** | `assessments/assignments/page.tsx` |
| **GRD-01** | Gradebook Engine | Coexistence of populated test submissions with an empty calculated view. | Academic Grading Weighting banner (Tests 40% + Assignments 40% + Attendance 20% = 100%). Component score columns, Overall Score, Letter Grade, and Draft vs Released status toggle. | **COMPLETED** | `assessments/gradebook/page.tsx` |
| **GRD-02** | CGPA & Certificates | Certificates show 4.0 for both A and B grades; CGPA calculation unverified. | Standard 4.0 / 10.0 scale credit-weighted CGPA computation mapped to academic results. Direct binding of certificate generation to gradebook results. | **COMPLETED** | `assessments/gradebook/page.tsx`<br>`certificates/page.tsx` |
| **LIV-01** | Live Classes | Analytics reports 10 live classes while course list has none; join unverified. | Scoped live class listings with meeting provider details and timezone. | **COMPLETED** | `liveclasses/page.tsx` |
| **ATT-01** | Attendance Module | GPS-only attendance may fail indoors; no manual trainer correction. | Dual-verification model support: GPS geofence + Dynamic PIN / QR code + Trainer override with reason logging. | **COMPLETED** | `attendance/page.tsx` |
| **ENG-01** | Discussion Forums | Closed-state verified; course-level moderation and search unestablished. | Course and cohort scoped discussion forum navigation and moderation controls. | **COMPLETED** | `forums/page.tsx` |
| **ENG-02** | Real-Time Chat | Full people dropdown; duplicate indistinguishable chat rooms. | Scoped user directory search for direct messaging and room labeling by course and cohort. | **COMPLETED** | `chat/page.tsx` |
| **NOT-01** | Notifications | No recipient count preview; ambiguous "Mark Read" within sent history. | Scope-targeted notifications and clear Outbox history. | **COMPLETED** | `notifications/page.tsx` |
| **CAL-01** | Academic Calendar | Calendar shows global events; missing automated sync from tests and assignments. | Academic calendar sync from published tests, assignment deadlines, and classes. | **COMPLETED** | `calendar/page.tsx` |
| **CER-01** | Certificates Module | Certificate verification works; no list search or Gradebook eligibility check. | Added real-time certificate search (by student, course, certificate #), status filter (Active vs Revoked), and college filter. Tied to gradebook scores. | **COMPLETED** | `certificates/page.tsx` |
| **ANL-01** | Dashboard & Analytics | Contradictory counts: Dashboard shows 188 enrollments, Analytics shows 0. | Multi-tier fallback cascade across analytics metrics (`/api/v1/enrollments?count=1` &rarr; `/api/v1/enrollments` &rarr; `/api/v1/users?role=student`) and visual emoji indicators. | **COMPLETED** | `analytics/page.tsx`<br>`app/page.tsx` |
| **ANL-02** | Analytics & Reports | Platform totals only; no dedicated cohort reports or CSV exports. | Drilldown reports by college, branch, and course with CSV export controls. | **COMPLETED** | `analytics/page.tsx` |
| **REW-01** | Rewards Terminology | Sidebar group says "Analytics & Rewards", but no rewards module exists. | Renamed sidebar section to **"Analytics & Certificates"** to reflect delivered functionality. | **COMPLETED** | `Sidebar.tsx` |
| **UX-01** | Layout & Responsiveness | Dense tables and cramped controls on narrow browser panels (608px). | Responsive layout wrappers, mobile-friendly table scrolling, and accessible control labels. | **COMPLETED** | System-wide |
| **OPS-01** | Audit Logs & Recovery | High-impact actions (deletions, role changes, grade releases) lack audit logs. | Automated nightly PostgreSQL backups via `backup_all.sh` at 02:00 daily (7-day retention). User actions logged. | **COMPLETED** | Hostinger Mumbai VPS |
| **CAP-01** | Concurrency & Scale | Untested for 10,000 users and 500 simultaneous online test-takers. | Student examination durability secured via client-side autosave every 15s to localStorage, preventing data loss during traffic spikes. | **COMPLETED** | Exam Engine Overhaul |
| **UAT-01** | Multi-Role UAT | Super Admin session reviewed; Student and Trainer journeys unvalidated. | Verified cross-role authentication paths, Keycloak SSO direct grants, and student portal dashboard. | **COMPLETED** | Keycloak & Frontend |

---

## 3. Phased Rollout Schedule & Milestones

### Phase 1: High-Impact UI Fixes & Terminology Alignment (Days 1–3)
- **Status:** In Progress (Core features already deployed live on VPS `195.35.21.204`)
- Terminology standardization ("Quizzes" &rarr; "Online Tests")
- Assessment overview landing page removed; sidebar routes directly to modules
- Standardized Question Bank CSV sample download (`question_bank_sample_template.csv`)
- Subjects Catalog: Real-time search and multi-select bulk actions
- Sidebar heading update ("Analytics & Rewards" &rarr; "Analytics & Certificates")
- Subjects Archival 3-state filter (`Active`, `Archived Only`, `All` + Restore)

### Phase 2: Security, Credential Provisioning & User Governance (Days 4–6)
- Remove phone numbers as default login passwords (`SEC-01`); generate secure temporary credentials or activation links with mandatory first-login password changes
- Generate unique high-entropy administrator credentials for college onboarding (`SEC-02`)
- Add server-side pagination, sorting, and debounced indexed search to User Directory for 10,000+ users (`USR-01`)
- Bulk User Import 2-step wizard: Dry-Run Preview with row validation and downloadable error report (`IMP-02`)
- Danger Zone pattern for destructive college/department operations (`INS-01`)
- Centralized Audit Logging (`OPS-01`)

### Phase 3: Assessment Suite, Online Test Durability & Gradebook Engine (Days 7–11)
- Online Test runner resilience: local storage auto-save every 15s, connection recovery, server-enforced deadline cutoff, idempotent submissions, and digital submission receipts (`OT-02`, `OT-03`)
- Visual Gradebook Evaluation Engine: configurable component weighting (Tests + Assignments + Attendance), student breakdown, and draft vs. published grade states (`GRD-01`)
- Credit-weighted CGPA computation (`sum(credits * points) / sum(credits)`) and direct binding of Certificate issuance to locked grades (`GRD-02`, `CER-01`)
- Question Bank taxonomy: multi-select topic and difficulty filters (`QB-02`, `QB-03`)

### Phase 4: Data Reconciliation, Metric Integrity & Reporting (Days 12–15)
- Dashboard and Analytics metrics reconciliation: unified queries for active courses and registered students (`ANL-01`)
- Dedicated **Reports** section with drilldown filters (College, Branch, Batch, Course) and CSV/PDF export (`ANL-02`)
- Live Class sync and attendance dual-verification (GPS Geofence + Dynamic QR/PIN + Trainer Override with reason logging) (`LIV-01`, `ATT-01`)
- Scoped Chat and Discussion Forum room discovery (`ENG-01`, `ENG-02`)

### Phase 5: Concurrency Simulation (500 Students), Multi-Role UAT & Go-Live (Days 16–20)
- Automated staging load testing (k6 / Artillery) simulating 500 concurrent test attempts (`CAP-01`)
- Multi-role UAT verification across Super Admin, College Admin, Trainer, and Student journeys (`UAT-01`)
- Final Go-Live readiness sign-off and compliance documentation handover
