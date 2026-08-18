# Green Valley University — Complete Manual Testing Kit

Everything you need to onboard **Green Valley University** manually on the demo server and test every feature. Files in this folder:

| File | What it's for |
|---|---|
| `greenvalley-users.csv` | Bulk-import all 40 users (32 students, 4 professors, 4 teaching assistants) |
| `greenvalley-user-mapping.md` | Who's who — email ↔ name table for all accounts |
| `greenvalley-question-bank.pdf` | Single combined PDF (10 subjects' MCQs) for quick import testing |
| `question-banks/` | 16 course-specific PDFs — import each under its own subject |

**Every imported user logs in with:** `Test@1234` (set on the Bulk Import page; password is changeable at first login).

---

## Step 1 — Onboard the college (Super Admin)

In the Super Admin panel → **Colleges** → **Add College**:

- **College name:** `Green Valley University`
- **Subdomain:** `greenvalley`
- (Leave active / not on hold.)

## Step 2 — Create the org structure (Super Admin)

Create in this order — **department → branch → semester → section**. The dropdowns only show what exists, so each step must finish before the next.

### Departments (4)
1. `School of Engineering`
2. `School of Management`
3. `School of Sciences`
4. `School of Humanities`

### Branches (8) — each under its department

| Branch | Department |
|---|---|
| B.Tech CSE | School of Engineering |
| B.Tech ECE | School of Engineering |
| BBA | School of Management |
| MBA | School of Management |
| B.Sc Mathematics | School of Sciences |
| B.Sc Physics | School of Sciences |
| BA English | School of Humanities |
| BA History | School of Humanities |

### Semesters — under each branch
Create **Semester 1** and **Semester 2** for every branch (enough to place both Year-1 and Year-2 students; real colleges run 1–8 for B.Tech, 1–6 for the rest — add the rest anytime).

### Academic session + Sections — under each branch
Create the session **`2026-27`**, then for each branch make **two sections**:

| Section | Year of study | Semester | Students it will hold |
|---|---|---|---|
| `2026-27 · Sem 1 · A` | 1 | 1 | the 2 Year-1 students |
| `2026-27 · Sem 3 · A` | 2 | 3 | the 2 Year-2 students |

> Year of study = `ceil(semester / 2)`: Sem 1–2 → Year 1, Sem 3–4 → Year 2. The section is the *cohort*; promotion later moves the same account Sem 1 → Sem 2 → Sem 3 …

## Step 3 — Create subjects (College Admin)

Login as the Green Valley **college admin** (see credentials below) → **Subjects**. Create these 16 subjects — the names and branch scoping **must match the question-bank PDFs exactly**:

| Subject | Code | Branch |
|---|---|---|
| Programming Fundamentals | CSE101 | B.Tech CSE |
| Data Structures | CSE201 | B.Tech CSE |
| Circuit Theory | ECE101 | B.Tech ECE |
| Digital Electronics | ECE201 | B.Tech ECE |
| Principles of Management | BBA101 | BBA |
| Business Communication | BBA201 | BBA |
| Managerial Economics | MBA101 | MBA |
| Marketing Management | MBA201 | MBA |
| Calculus I | MATH101 | B.Sc Mathematics |
| Linear Algebra | MATH201 | B.Sc Mathematics |
| Mechanics | PHY101 | B.Sc Physics |
| Electromagnetism | PHY201 | B.Sc Physics |
| English Literature I | ENG101 | BA English |
| Literary Theory | ENG201 | BA English |
| World History I | HIS101 | BA History |
| Modern Indian History | HIS201 | BA History |

## Step 4 — Create course offerings (College Admin)

For each subject, create a **course offering** pointing at the right section:

- `Programming Fundamentals · CSE · 2026-27 Sem 1 A` → subject CSE101, section `2026-27 · Sem 1 · A`, semester 1, year 1
- `Data Structures · CSE · 2026-27 Sem 3 A` → subject CSE201, section `2026-27 · Sem 3 · A`, semester 3, year 2
- …and so on for all 16 (semester 1/year 1 for the first 8, semester 2/year 1 or 3/year 2 matching each PDF's header — each PDF's first line states its course, branch, semester and year; follow it).

Then **enroll students** into the offerings: use the ➕ Add Student button on each course and pick the 2 students of the matching branch + year from the CSV.

## Step 5 — Bulk import users (Super Admin)

Super Admin → **Users → Bulk Import**:

1. Select college **Green Valley University**
2. Upload `greenvalley-users.csv`
3. Temporary password: `Test@1234`
4. **Import** → expect `Created: 40`

The importer stores department/branch as user attributes, so no pre-created org node is required for the import itself — the org tree from Steps 2–4 is what powers enrollment and course scoping.

## Step 6 — Import question banks

**Option A (quick):** one PDF → Super Admin / College Admin → **Question Bank → Import from PDF** → upload `greenvalley-question-bank.pdf`.

**Option B (realistic):** import each of the 16 course PDFs under its matching subject, e.g.:
1. Open **Question Bank → Import from PDF**
2. Select subject `Data Structures` (course offering under it auto-fills)
3. Upload `question-banks/greenvalley-data-structures.pdf`
4. Verify: `Imported 12 questions` (10 MCQ + 2 essay per PDF)

**PDF structure the importer understands** (so you can also create your own):
```
1. Which data structure works on the FIFO principle?
a) Stack
b) Queue
c) Tree
d) Graph
Answer: b
...
11. Explain the difference between a stack and a queue with examples.
(essay question — no options, no Answer line)
```
Rules: numbered questions (`1.` or `Q1:`), options `a)–d)` with `)` or `.`, an `Answer: x` line per MCQ, plain text, no images/tables. Lines that don't fit MCQ become essay questions automatically.

---

## Credentials summary

| Role | Email | Password |
|---|---|---|
| College Admin (Green Valley) | created on the Users page during onboarding | set by you |
| Professor — Engineering | `gv.engineering.trainer@greenvalley.edu` | `Test@1234` |
| Professor — Management | `gv.management.trainer@greenvalley.edu` | `Test@1234` |
| Professor — Sciences | `gv.sciences.trainer@greenvalley.edu` | `Test@1234` |
| Professor — Humanities | `gv.humanities.trainer@greenvalley.edu` | `Test@1234` |
| TA — Engineering | `gv.engineering.ta@greenvalley.edu` | `Test@1234` |
| TA — Management | `gv.management.ta@greenvalley.edu` | `Test@1234` |
| TA — Sciences | `gv.sciences.ta@greenvalley.edu` | `Test@1234` |
| TA — Humanities | `gv.humanities.ta@greenvalley.edu` | `Test@1234` |
| Students | `gv2026.<branch>.<NNN>@greenvalley.edu` (full list in `greenvalley-user-mapping.md`) | `Test@1234` |

---

## Manual test checklist

**Super Admin**
- [ ] Create college → create departments → branches → semesters → sections (dropdowns stay filtered by college)
- [ ] Bulk import users, verify all 40 created
- [ ] Question-bank PDF import works and questions show under the right subject
- [ ] Create/delete courses, hold/unhold college, edit departments

**College Admin**
- [ ] Create subjects + course offerings scoped to branch/semester/section
- [ ] Enroll students in courses, assign trainers to courses
- [ ] Create quizzes/assignments/attendance/events for a course
- [ ] Grade assignments and quizzes; gradebook reflects it

**Professor**
- [ ] Sees only assigned courses; creates quiz/assignment for those courses
- [ ] Runs live classes; marks attendance; grades submissions

**TA**
- [ ] Sees only assigned courses; assists with grading/marks

**Student**
- [ ] Sees enrolled courses with the right course+section shown while giving attendance
- [ ] Submits assignment, takes quiz, sees grades in gradebook
- [ ] AI Tutor answers from the imported course material

**Cross-checks**
- [ ] Green Valley data is invisible to any other college's admin/trainer/student
- [ ] Promote a Year-1 student to Year-2 (Sem 1 → Sem 2 → Sem 3) — same login, new section, gradecard/history intact
- [ ] Analytics dashboard loads without error for super admin, college admin, trainer
