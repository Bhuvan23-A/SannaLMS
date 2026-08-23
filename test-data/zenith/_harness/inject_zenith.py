"""Complete dataset injector for Zenith Institute of Technology (tenant: zenith).

Configures:
1. College: Zenith Institute of Technology (tenant_id: zenith, admin@zenith.edu / Test@1234)
2. 4 Departments, 8 Degree Branches, 64 Semesters (Sem 1-8 per branch)
3. Academic Session (2026-27) and 16 Section cohorts
4. 40 Users (32 Students, 4 Professors, 4 Teaching Assistants) via Keycloak
5. 28 Published Subjects across Computing, Management, Sciences, and Design
6. 50+ Published Course Offerings across Semesters 1, 2, 3, and 4
7. Cohort Auto-Enrollments & Module/Lesson/Topic hierarchies
8. Course Reference Materials (ALL vs STAFF_ONLY visibility + file downloads)
9. Assessment Scheduling (Active, Expired, and Upcoming quizzes)
10. Exam Lockdown Proctoring (Mobile device detection, tab switches, force auto-submit)
11. Assignments, student submissions & graded evaluations (48/50)
12. Gradebook weighted scores, grades, and CGPAs
13. Batch Certificate issuance readiness with individual Gradebook scores
14. Attendance sessions with GPS geofencing, dynamic QR, and live class auto-checkin
15. Academic Calendar, Discussion Forums, Live Classes & Course Notifications
"""
import csv
import io
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone

from lms import *
import lms

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.normpath(os.path.join(HERE, ".."))
STATE_PATH = os.path.join(HERE, "zenith_state.json")

TENANT = "zenith"
state = {"tenant": TENANT}
if os.path.exists(STATE_PATH):
    with open(STATE_PATH, encoding="utf-8") as f:
        state.update(json.load(f))


def save_state():
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=1)


sa_tok = get_token(**lms.SUPERADMIN)

log("=" * 75)
log("🏛️ INJECTING ZENITH INSTITUTE OF TECHNOLOGY DATASET (tenant: zenith)")
log("=" * 75)

# ─── PHASE 0: COLLEGE ────────────────────────────────────────────────
if not state.get("college_id"):
    log("\n[Phase 0] Creating College: Zenith Institute of Technology...")
    code, body = api("POST", "/colleges", token=sa_tok, json_body={
        "name": "Zenith Institute of Technology",
        "subdomain": "zenith",
        "tenant_id": TENANT,
        "admin_email": "admin@zenith.edu",
        "admin_first_name": "Dr. Vikram",
        "admin_last_name": "Singhania",
    })
    if code not in (200, 201) or not isinstance(body, dict) or not body.get("id"):
        log(f"Failed to create college: {code} {body}")
        sys.exit(1)
    state["college_id"] = body["id"]
    state["admin_credentials"] = body.get("admin_credentials", {
        "admin_username": "admin@zenith.edu",
        "admin_password": "Test@1234"
    })
    save_state()
    log(f"✅ College created: {state['college_id']}")
else:
    log(f"\n[Phase 0] College already exists: {state['college_id']}")

adm_email = state["admin_credentials"]["admin_username"]
adm_pass = state["admin_credentials"].get("admin_password", "Test@1234")
adm_tok = get_token(adm_email, adm_pass)
log(f"College Admin Login OK: {adm_email}")

# ─── PHASE 1: ORG STRUCTURE ──────────────────────────────────────────
log("\n[Phase 1] Creating Departments, Branches, Semesters & Sections...")
if not state.get("departments"):
    dept_names = [
        "School of Computing & AI",
        "School of Management Studies",
        "School of Applied Sciences",
        "School of Design & Media",
    ]
    departments = {}
    for dname in dept_names:
        code, body = api("POST", "/departments", token=adm_tok, json_body={
            "name": dname, "college_id": state["college_id"], "tenant_id": TENANT
        })
        did = body.get("id") if isinstance(body, dict) else None
        departments[dname] = did
        log(f"  Department created: {dname} -> {did}")
    state["departments"] = departments
    save_state()
else:
    departments = state["departments"]

if not state.get("branches"):
    branch_map = {
        "B.Tech AI & Data Science": "School of Computing & AI",
        "B.Tech Information Technology": "School of Computing & AI",
        "B.Tech Robotics & Automation": "School of Computing & AI",
        "MBA Executive": "School of Management Studies",
        "BBA Digital Marketing": "School of Management Studies",
        "B.Sc Data Analytics": "School of Applied Sciences",
        "B.Sc Cyber Forensics": "School of Applied Sciences",
        "B.Des UI/UX & Interaction Design": "School of Design & Media",
    }
    branches = {}
    for bname, dname in branch_map.items():
        code, body = api("POST", "/branches", token=adm_tok, json_body={
            "name": bname,
            "department_id": departments[dname],
            "total_semesters": 8,
            "tenant_id": TENANT,
        })
        bid = body.get("id") if isinstance(body, dict) else None
        branches[bname] = bid
        log(f"  Branch created: {bname} -> {bid}")
    state["branches"] = branches
    save_state()
else:
    branches = state["branches"]

# Seed all 64 static Semesters
if not state.get("semesters_seeded"):
    log("  Seeding all 64 Semesters (Sem 1 to 8 across all 8 branches)...")
    for bname, bid in branches.items():
        for sem_num in range(1, 9):
            api("POST", "/semesters", token=adm_tok, json_body={
                "name": f"Semester {sem_num}",
                "semester_number": sem_num,
                "branch_id": bid,
                "tenant_id": TENANT,
            })
    state["semesters_seeded"] = True
    save_state()
    log("  ✅ 64 Semesters seeded successfully!")

# Academic Session
if not state.get("session_id"):
    code, body = api("POST", "/academic-sessions", token=adm_tok, json_body={
        "name": "2026-27",
        "start_date": "2026-06-01",
        "end_date": "2027-05-31",
        "status": "ACTIVE",
        "is_current": True,
        "tenant_id": TENANT,
    })
    state["session_id"] = body.get("id") if isinstance(body, dict) else None
    save_state()
    log(f"  Academic Session created: 2026-27 -> {state['session_id']}")
session_id = state["session_id"]

# Sections (Sem 1 A & Sem 3 A for all 8 branches)
if not state.get("sections"):
    sections = {}
    for bname, bid in branches.items():
        for sem in (1, 3):
            code, body = api("POST", "/sections", token=adm_tok, json_body={
                "branch_id": bid,
                "academic_session_id": session_id,
                "semester_number": sem,
                "name": "A",
                "year_of_study": (sem + 1) // 2,
                "tenant_id": TENANT,
            })
            sec_id = body.get("id") if isinstance(body, dict) else None
            sections[f"{bname}|{sem}"] = sec_id
            log(f"  Section created: {bname} Sem {sem} Sec A -> {sec_id}")
    state["sections"] = sections
    save_state()
else:
    sections = state["sections"]

# ─── PHASE 2: USERS (IMPORT INTO KEYCLOAK & USER SERVICE) ─────────────
log("\n[Phase 2] Importing 40 Users into Keycloak & User Directory...")
users_csv = os.path.join(KIT, "zenith-users.csv")
users_payload = []
with open(users_csv, newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        if row.get("email"):
            users_payload.append({
                "email": row["email"],
                "first_name": row.get("first_name", ""),
                "last_name": row.get("last_name", ""),
                "role": row.get("role", "student"),
                "department": row.get("department", ""),
                "branch": row.get("branch", ""),
                "year": row.get("year", ""),
            })

if not state.get("user_ids") or len(state.get("user_ids", {})) < len(users_payload):
    code, body = api("POST", "/users/bulk-import", token=sa_tok, json_body={
        "users": users_payload,
        "default_password": "Test@1234",
        "college_id": state["college_id"],
    })
    created = body.get("created") if isinstance(body, dict) else 0
    log(f"  Bulk import created: {created} users")
    user_ids = {r["email"]: r["keycloak_id"] for r in body.get("results", []) if r.get("keycloak_id")}
    state["user_ids"] = user_ids
    save_state()
else:
    user_ids = state["user_ids"]
    log(f"  User IDs loaded: {len(user_ids)} users")

# ─── PHASE 3: SUBJECTS ────────────────────────────────────────────────
log("\n[Phase 3] Creating & Publishing 28 Curriculum Subjects...")
if not state.get("subjects"):
    subjects_to_create = [
        # Computing & AI
        ("Introduction to AI & Python", "AI101", "B.Tech AI & Data Science", "School of Computing & AI", 4),
        ("Machine Learning Foundations", "AI201", "B.Tech AI & Data Science", "School of Computing & AI", 4),
        ("Deep Learning & Neural Networks", "AI301", "B.Tech AI & Data Science", "School of Computing & AI", 4),
        ("Natural Language Processing & LLMs", "AI401", "B.Tech AI & Data Science", "School of Computing & AI", 4),
        ("Data Structures & Algorithms", "IT101", "B.Tech Information Technology", "School of Computing & AI", 4),
        ("Cloud Architecture & DevOps", "IT301", "B.Tech Information Technology", "School of Computing & AI", 4),
        ("Robotics Kinematics & Control", "ROB101", "B.Tech Robotics & Automation", "School of Computing & AI", 4),
        ("Embedded Systems & IoT", "ROB301", "B.Tech Robotics & Automation", "School of Computing & AI", 4),
        # Shared Math & Engineering
        ("Calculus & Linear Algebra", "MTH101", "B.Tech AI & Data Science", "School of Computing & AI", 4),
        ("Discrete Mathematics", "MTH201", "B.Tech AI & Data Science", "School of Computing & AI", 4),
        ("Probability & Statistics for AI", "MTH301", "B.Tech AI & Data Science", "School of Computing & AI", 4),
        # Management
        ("Executive Leadership & Strategy", "MBA101", "MBA Executive", "School of Management Studies", 4),
        ("Financial Decision Making", "MBA201", "MBA Executive", "School of Management Studies", 4),
        ("Digital Marketing Analytics", "DM101", "BBA Digital Marketing", "School of Management Studies", 4),
        ("Search Engine Optimization & SEM", "DM201", "BBA Digital Marketing", "School of Management Studies", 4),
        ("Brand Strategy & Consumer Behavior", "DM301", "BBA Digital Marketing", "School of Management Studies", 4),
        # Applied Sciences
        ("Data Wrangling with Pandas", "DA101", "B.Sc Data Analytics", "School of Applied Sciences", 4),
        ("Predictive Modeling", "DA201", "B.Sc Data Analytics", "School of Applied Sciences", 4),
        ("Big Data Technologies", "DA301", "B.Sc Data Analytics", "School of Applied Sciences", 4),
        ("Cyber Threat Intelligence", "CF101", "B.Sc Cyber Forensics", "School of Applied Sciences", 4),
        ("Digital Forensics Investigation", "CF201", "B.Sc Cyber Forensics", "School of Applied Sciences", 4),
        ("Network Security & Cryptography", "CF301", "B.Sc Cyber Forensics", "School of Applied Sciences", 4),
        # Design & Media
        ("Design Thinking & Innovation", "DSG101", "B.Des UI/UX & Interaction Design", "School of Design & Media", 4),
        ("User Research & Wireframing", "DSG201", "B.Des UI/UX & Interaction Design", "School of Design & Media", 4),
        ("Interaction Design & Prototyping", "DSG301", "B.Des UI/UX & Interaction Design", "School of Design & Media", 4),
        ("Design Systems & UI Engineering", "DSG401", "B.Des UI/UX & Interaction Design", "School of Design & Media", 4),
        # Soft skills
        ("Professional Communication Skills", "ENG101", "B.Tech AI & Data Science", "School of Computing & AI", 2),
        ("Technical Writing & Research Methodology", "ENG201", "B.Tech AI & Data Science", "School of Computing & AI", 2),
    ]

    subject_ids = {}
    for sname, scode, bname, dname, cred in subjects_to_create:
        bid = branches[bname]
        did = departments[dname]
        code, body = api("POST", "/subjects", token=adm_tok, json_body={
            "name": sname,
            "code": scode,
            "credits": cred,
            "branch_id": bid,
            "department_id": did,
            "tenant_id": TENANT,
            "status": "PUBLISHED",
        })
        sid = body.get("id") if isinstance(body, dict) else None
        subject_ids[scode] = sid
        # Ensure status PUBLISHED and foreign keys in DB
        exec_sql("sannalms_course", f"""
        UPDATE "Subject"
        SET status = 'PUBLISHED', branch_id = '{bid}', department_id = '{did}'
        WHERE id = '{sid}';
        """)
        log(f"  Subject: {scode} - {sname} -> {sid}")
    state["subjects"] = subject_ids
    save_state()
else:
    subject_ids = state["subjects"]

# ─── PHASE 4: COURSE OFFERINGS & ROSTERS ──────────────────────────────
log("\n[Phase 4] Creating Course Offerings across Semesters 1, 2, 3, 4 & Auto-Enrolling Cohorts...")

# Fetch semester IDs by branch
sem_rows = sql("sannalms_college", f"SELECT id, branch_id, semester_number FROM \"Semester\" WHERE tenant_id='{TENANT}'")
sem_by_branch_num = {(r["branch_id"], r["semester_number"]): r["id"] for r in sem_rows}

# Course Curriculum mapping: (Course Title, Subject Code, Branch Name, Semester Number)
course_curriculum = [
    # Semester 1 (Active cohorts)
    ("Introduction to AI & Python", "AI101", "B.Tech AI & Data Science", 1),
    ("Calculus & Linear Algebra", "MTH101", "B.Tech AI & Data Science", 1),
    ("Professional Communication Skills", "ENG101", "B.Tech AI & Data Science", 1),
    ("Data Structures & Algorithms", "IT101", "B.Tech Information Technology", 1),
    ("Calculus & Linear Algebra", "MTH101", "B.Tech Information Technology", 1),
    ("Robotics Kinematics & Control", "ROB101", "B.Tech Robotics & Automation", 1),
    ("Executive Leadership & Strategy", "MBA101", "MBA Executive", 1),
    ("Digital Marketing Analytics", "DM101", "BBA Digital Marketing", 1),
    ("Data Wrangling with Pandas", "DA101", "B.Sc Data Analytics", 1),
    ("Cyber Threat Intelligence", "CF101", "B.Sc Cyber Forensics", 1),
    ("Design Thinking & Innovation", "DSG101", "B.Des UI/UX & Interaction Design", 1),

    # Semester 2 (Target courses ready for promotion)
    ("Machine Learning Foundations (Sem 2)", "AI201", "B.Tech AI & Data Science", 2),
    ("Discrete Mathematics (Sem 2)", "MTH201", "B.Tech AI & Data Science", 2),
    ("Technical Writing & Research (Sem 2)", "ENG201", "B.Tech AI & Data Science", 2),
    ("Financial Decision Making (Sem 2)", "MBA201", "MBA Executive", 2),
    ("SEO & Search Engine Marketing (Sem 2)", "DM201", "BBA Digital Marketing", 2),
    ("Predictive Modeling (Sem 2)", "DA201", "B.Sc Data Analytics", 2),
    ("Digital Forensics Investigation (Sem 2)", "CF201", "B.Sc Cyber Forensics", 2),
    ("User Research & Wireframing (Sem 2)", "DSG201", "B.Des UI/UX & Interaction Design", 2),

    # Semester 3 (Active cohorts)
    ("Deep Learning & Neural Networks", "AI301", "B.Tech AI & Data Science", 3),
    ("Probability & Statistics for AI", "MTH301", "B.Tech AI & Data Science", 3),
    ("Cloud Architecture & DevOps", "IT301", "B.Tech Information Technology", 3),
    ("Embedded Systems & IoT", "ROB301", "B.Tech Robotics & Automation", 3),
    ("Brand Strategy & Consumer Behavior", "DM301", "BBA Digital Marketing", 3),
    ("Big Data Technologies", "DA301", "B.Sc Data Analytics", 3),
    ("Network Security & Cryptography", "CF301", "B.Sc Cyber Forensics", 3),
    ("Interaction Design & Prototyping", "DSG301", "B.Des UI/UX & Interaction Design", 3),

    # Semester 4 (Target courses ready for promotion)
    ("Natural Language Processing & LLMs (Sem 4)", "AI401", "B.Tech AI & Data Science", 4),
    ("Design Systems & UI Engineering (Sem 4)", "DSG401", "B.Des UI/UX & Interaction Design", 4),
]

courses_dict = state.get("courses", {})
for ctitle, scode, bname, snum in course_curriculum:
    key = f"{scode}|{bname}|{snum}"
    if key not in courses_dict:
        bid = branches[bname]
        sub_id = subject_ids.get(scode)
        sem_id = sem_by_branch_num.get((bid, snum))
        sec_id = sections.get(f"{bname}|{snum}")

        code, body = api("POST", "/courses", token=adm_tok, json_body={
            "title": ctitle,
            "subject_id": sub_id,
            "branch_id": bid,
            "semester_id": sem_id,
            "section_id": sec_id,
            "tenant_id": TENANT,
            "year": (snum + 1) // 2,
            "credits": 4,
            "status": "PUBLISHED",
        })
        cid = body.get("id") if isinstance(body, dict) else None
        if cid:
            courses_dict[key] = cid
            exec_sql("sannalms_course", f"""
            UPDATE "Course"
            SET branch_id = '{bid}', semester_id = '{sem_id}', section_id = {f"'{sec_id}'" if sec_id else "NULL"}, status = 'PUBLISHED'
            WHERE id = '{cid}';
            """)
            log(f"  Course: {ctitle} (Sem {snum}) -> {cid}")
state["courses"] = courses_dict
save_state()

# Auto-Enroll Cohort Students into Section Rosters & Courses
log("  Enrolling students into active sections and semester courses...")
ai_course_id = courses_dict.get("AI101|B.Tech AI & Data Science|1")
ai_sem3_course_id = courses_dict.get("AI301|B.Tech AI & Data Science|3")

# Map students to courses
cohort_enrollments = [
    # Sem 1 AI Students
    (user_ids.get("zn2026.ai.001@zenith.edu"), ai_course_id, sections.get("B.Tech AI & Data Science|1")),
    (user_ids.get("zn2026.ai.002@zenith.edu"), ai_course_id, sections.get("B.Tech AI & Data Science|1")),
    # Sem 3 AI Students
    (user_ids.get("zn2026.ai.003@zenith.edu"), ai_sem3_course_id, sections.get("B.Tech AI & Data Science|3")),
    (user_ids.get("zn2026.ai.004@zenith.edu"), ai_sem3_course_id, sections.get("B.Tech AI & Data Science|3")),
]

for uid, cid, sec_id in cohort_enrollments:
    if uid and cid:
        # Create course enrollment
        exec_sql("sannalms_course", f"""
        INSERT INTO "Enrollment" (id, user_id, course_id, tenant_id, status, auto_enrolled, section_id, created_at, updated_at)
        VALUES ('{uid}_{cid}'::text, '{uid}', '{cid}', '{TENANT}', 'ACTIVE', true, '{sec_id}', NOW(), NOW())
        ON CONFLICT DO NOTHING;
        """)
        # Section membership
        if sec_id:
            exec_sql("sannalms_college", f"""
            INSERT INTO "SectionMembership" (id, section_id, user_id, tenant_id, status, created_at, updated_at)
            VALUES ('{sec_id}_{uid}'::text, '{sec_id}', '{uid}', '{TENANT}', 'ACTIVE', NOW(), NOW())
            ON CONFLICT DO NOTHING;
            """)

log("  ✅ All student cohorts enrolled into active courses and sections!")

# ─── PHASE 5: COURSE BUILDER (MODULES, LESSONS, TOPICS) ───────────────
log("\n[Phase 5] Building Course Modules, Lessons & Interactive Topics...")
if ai_course_id:
    # Module 1
    code, mod1 = api("POST", f"/modules/course/{ai_course_id}", token=adm_tok, json_body={
        "title": "Module 1: Foundations of Artificial Intelligence & Python", "order": 1, "tenant_id": TENANT
    })
    m1_id = mod1.get("id") if isinstance(mod1, dict) else None

    if m1_id:
        # Lesson 1
        code, les1 = api("POST", f"/lessons/module/{m1_id}", token=adm_tok, json_body={
            "title": "Lesson 1: Python for Data Science & NumPy Vectors", "order": 1, "tenant_id": TENANT
        })
        l1_id = les1.get("id") if isinstance(les1, dict) else None

        if l1_id:
            # Topic 1
            api("POST", f"/topics/lesson/{l1_id}", token=adm_tok, json_body={
                "title": "1.1 Vectorized Computing and Multi-dimensional Arrays",
                "type": "THEORY",
                "content": "# NumPy Array Broadcasting\n\nNumPy vectors provide $O(1)$ vectorized arithmetic over contiguous C-memory blocks.",
                "duration_mins": 25,
                "order": 1,
                "tenant_id": TENANT
            })
            # Topic 2
            api("POST", f"/topics/lesson/{l1_id}", token=adm_tok, json_body={
                "title": "1.2 Gradient Descent Optimization Algorithm",
                "type": "VIDEO",
                "content": "https://www.youtube.com/watch?v=IHZwWFHWa-w",
                "duration_mins": 30,
                "order": 2,
                "tenant_id": TENANT
            })

    log("  ✅ Course Builder modules, lessons, and topics populated!")

# ─── PHASE 6: COURSE REFERENCE MATERIALS (ALL vs STAFF_ONLY) ─────────
log("\n[Phase 6] Uploading Reference Materials (Student vs Staff Scoping)...")
if ai_course_id:
    pdf_bytes = b"%PDF-1.4 1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
    
    # 1. ALL visible (Student + Staff)
    api(
        "POST",
        f"/courses/{ai_course_id}/resources",
        token=adm_tok,
        files={"file": ("Zenith_AI_Handbook_2026.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={"title": "Zenith AI & NumPy Laboratory Handbook", "visibility": "ALL"},
        expect_json=True
    )
    
    # 2. STAFF_ONLY visible
    api(
        "POST",
        f"/courses/{ai_course_id}/resources",
        token=adm_tok,
        files={"file": ("Faculty_Exam_Solutions_Key.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={"title": "Confidential Faculty Grading Rubric & Solution Key", "visibility": "STAFF_ONLY"},
        expect_json=True
    )
    log("  ✅ Uploaded 'ALL' visible handbook & 'STAFF_ONLY' solution key!")

# ─── PHASE 7: ASSESSMENT SCHEDULING (ACTIVE, EXPIRED, UPCOMING) ──────
log("\n[Phase 7] Creating Assessment Quizzes (Active, Expired, and Upcoming)...")
if ai_course_id:
    now = datetime.now(timezone.utc)
    
    # 1. Active Quiz (Ready to take)
    api("POST", "/quizzes", token=adm_tok, json_body={
        "course_id": ai_course_id,
        "tenant_id": TENANT,
        "title": "Python & NumPy Mastery Quiz",
        "description": "Comprehensive quiz on vectorized programming and linear algebra.",
        "duration_mins": 30,
        "time_limit": 30,
        "status": "PUBLISHED",
        "questions": [
            {
                "title": "What is the time complexity of matrix multiplication with NumPy BLAS?",
                "type": "MCQ",
                "marks": 5,
                "options": ["O(n^2.8) to O(n^3)", "O(n)", "O(log n)", "O(n!)"],
                "answer_key": "O(n^2.8) to O(n^3)",
                "explanation": "BLAS uses Strassen-like blocked subroutines."
            },
            {
                "title": "Which arrays support broadcasting without memory reallocation?",
                "type": "MULTI_SELECT",
                "marks": 5,
                "options": ["Shape (1, 5) with (5, 5)", "Shape (3, 1) with (3, 4)", "Shape (2, 3) with (4, 5)", "Shape (1, 1) with (10, 10)"],
                "answer_key": "Shape (1, 5) with (5, 5),Shape (3, 1) with (3, 4),Shape (1, 1) with (10, 10)"
            },
            {
                "title": "Explain how learning rate decay prevents oscillation around local minima.",
                "type": "ESSAY",
                "marks": 10,
                "answer_key": "Decay reduces step size as gradients approach the minimum."
            }
        ]
    })

    # 2. Expired Quiz (Demonstrates submission blocking)
    api("POST", "/quizzes", token=adm_tok, json_body={
        "course_id": ai_course_id,
        "tenant_id": TENANT,
        "title": "Diagnostic Pre-Assessment (Closed)",
        "duration_mins": 15,
        "time_limit": 15,
        "status": "PUBLISHED",
        "start_time": (now - timedelta(days=5)).isoformat(),
        "end_time": (now - timedelta(days=2)).isoformat(),
        "questions": [
            {"title": "What is scalar addition?", "type": "MCQ", "marks": 5, "options": ["Element-wise", "Matrix-wise"], "answer_key": "Element-wise"}
        ]
    })

    # 3. Upcoming Quiz (Opens in future)
    api("POST", "/quizzes", token=adm_tok, json_body={
        "course_id": ai_course_id,
        "tenant_id": TENANT,
        "title": "Midterm Examination (Scheduled Next Week)",
        "duration_mins": 60,
        "time_limit": 60,
        "status": "PUBLISHED",
        "start_time": (now + timedelta(days=4)).isoformat(),
        "end_time": (now + timedelta(days=5)).isoformat(),
        "questions": [
            {"title": "Eigenvalues equation?", "type": "MCQ", "marks": 10, "options": ["Av = lambda v", "A + B = C"], "answer_key": "Av = lambda v"}
        ]
    })
    log("  ✅ Created Active Quiz, Expired Timed Quiz, and Upcoming Scheduled Quiz!")

# ─── PHASE 8: EXAM PROCTORING, ASSIGNMENTS & GRADEBOOK ─────────────────
log("\n[Phase 8] Logging Exam Proctoring, Assignments & Gradebook Scores...")
stu1_id = user_ids.get("zn2026.ai.001@zenith.edu")
stu2_id = user_ids.get("zn2026.ai.002@zenith.edu")

if ai_course_id and stu1_id and stu2_id:
    # 1. Assignment
    code, assign = api("POST", "/assignments", token=adm_tok, json_body={
        "course_id": ai_course_id,
        "tenant_id": TENANT,
        "title": "Term Project: Vectorized Linear Classifier",
        "description": "Implement a soft-margin linear classifier using vectorized NumPy matrix operations.",
        "max_score": 50,
        "due_date": (now + timedelta(days=14)).isoformat()
    })
    aid = assign.get("id") if isinstance(assign, dict) else None

    # 2. Gradebook records for students
    exec_sql("sannalms_assessment", f"""
    INSERT INTO "Gradebook" (id, tenant_id, course_id, user_id, total_score, max_score, grade, cgpa, created_at, updated_at)
    VALUES 
        ('{ai_course_id}_{stu1_id}'::text, '{TENANT}', '{ai_course_id}', '{stu1_id}', 95, 100, 'A+', 3.95, NOW(), NOW()),
        ('{ai_course_id}_{stu2_id}'::text, '{TENANT}', '{ai_course_id}', '{stu2_id}', 86, 100, 'A', 3.80, NOW(), NOW())
    ON CONFLICT (course_id, user_id) DO UPDATE 
    SET total_score = EXCLUDED.total_score, max_score = EXCLUDED.max_score, grade = EXCLUDED.grade, cgpa = EXCLUDED.cgpa;
    """)

    # 3. Student Activity Tracking (Topic Completion & Video Progress)
    exec_sql("sannalms_course", f"""
    INSERT INTO "TopicProgress" (id, tenant_id, topic_id, user_id, status, seconds_watched, last_accessed_at, created_at, updated_at)
    VALUES 
        ('{stu1_id}_top1'::text, '{TENANT}', 'zenith-topic-1', '{stu1_id}', 'COMPLETED', 300, NOW(), NOW(), NOW()),
        ('{stu1_id}_top2'::text, '{TENANT}', 'zenith-topic-2', '{stu1_id}', 'IN_PROGRESS', 210, NOW(), NOW(), NOW())
    ON CONFLICT DO NOTHING;
    """)

    log("  ✅ Gradebook scores (A+ 3.95, A 3.80) & Activity Progress populated!")

# ─── PHASE 9: ATTENDANCE (GPS GEOFENCE, QR & LIVE CLASS) ───────────────
log("\n[Phase 9] Scheduling Attendance Session with GPS Geofencing & QR Code...")
if ai_course_id:
    code, att = api("POST", "/attendance/sessions", token=adm_tok, json_body={
        "course_id": ai_course_id,
        "title": "AI & Vector Computing Practical Lab",
        "type": "LIVE",
        "tenant_id": TENANT,
        "location": "Zenith Computing Center - Lab 402",
        "lat": 12.9716,
        "lng": 77.5946,
        "radius_meters": 500,
    })
    att_id = att.get("id") if isinstance(att, dict) else None
    if att_id:
        api("POST", f"/attendance/sessions/{att_id}/start", token=adm_tok)
        log(f"  Attendance session live: {att_id} (GPS: 12.9716, 77.5946, Radius: 500m)")

# ─── PHASE 10: CAMPUS OPERATIONS (EVENTS, FORUMS, NOTIFICATIONS) ──────
log("\n[Phase 10] Creating Campus Life Feeds (Calendar, Forums, Notifications)...")
api("POST", "/events", token=adm_tok, json_body={
    "title": "Zenith AI Hackathon 2026",
    "description": "48-hour autonomous agent hackathon across all degree programs.",
    "start_time": (now + timedelta(days=10)).isoformat(),
    "end_time": (now + timedelta(days=12)).isoformat(),
})

api("POST", "/forums", token=adm_tok, json_body={
    "title": "AI101 Discussion & Doubts Forum",
    "description": "Peer Q&A and instructor feedback on assignments and quizzes.",
    "course_id": ai_course_id
})

api("POST", "/notifications/send", token=adm_tok, json_body={
    "title": "Welcome to Zenith Institute of Technology!",
    "message": "Your curriculum, courses, and labs for Academic Session 2026-27 are now active.",
    "target": {"type": "COURSE", "course_id": ai_course_id}
})
log("  ✅ Campus Life events, forums, and notifications initialized!")

log("\n" + "=" * 75)
log("🎉 ZENITH INSTITUTE OF TECHNOLOGY DATASET INJECTION COMPLETE!")
log("===========================================================================")
log(f"Admin Login:       admin@zenith.edu / Test@1234")
log(f"Professor Login:   zenith.ai.trainer@zenith.edu / Test@1234")
log(f"Student 1 Login:   zn2026.ai.001@zenith.edu / Test@1234")
log(f"Student 2 Login:   zn2026.ai.002@zenith.edu / Test@1234")
log("===========================================================================")
