# Sunrise University — Complete Manual Testing Kit

Everything you need to onboard **Sunrise University** manually on the demo server and test every feature — including **multi-college isolation** against Green Valley University. Files in this folder:

| File | What it's for |
|---|---|
| `sunrise-users.csv` | Bulk-import all 40 users (32 students, 4 professors, 4 teaching assistants) |
| `sunrise-user-mapping.md` | Who's who — email ↔ name table for all accounts |
| `sunrise-question-bank.pdf` | Single combined PDF (16 subjects' sample MCQs) for quick import testing |
| `question-banks/` | 16 course-specific PDFs — import each under its own subject |
| `generate_question_banks.py` | Regenerates all the PDFs if you ever want to tweak questions |

**Every imported user logs in with:** `Test@1234` (set on the Bulk Import page; password is changeable at first login).

> Sunrise uses **completely different departments, branches, and subjects** from Green Valley — so you can confirm that a Sunrise admin/trainer/student never sees Green Valley data and vice-versa.

---

## Step 1 — Onboard the college (Super Admin)

In the Super Admin panel → **Colleges** → **Add College**:

- **College name:** `Sunrise University`
- **Subdomain:** `sunrise`
- **Tenant ID:** `sunrise` (must be unique; Green Valley already uses `greenvalley`)
- (Leave active / not on hold.)

## Step 2 — Create the org structure (Super Admin)

Create in this order — **department → branch → semester → section**. The dropdowns only show what exists, so each step must finish before the next. **Select `Sunrise University` in the College dropdown at every step** (it's a second college now, so the picker defaults to the first one).

### Departments (4)
1. `School of Technology`
2. `School of Business`
3. `School of Design`
4. `School of Health Sciences`

### Branches (8) — each under its department

| Branch | Department |
|---|---|
| B.Tech IT | School of Technology |
| B.Tech AI & ML | School of Technology |
| BBA | School of Business |
| B.Com | School of Business |
| B.Des | School of Design |
| B.Arch | School of Design |
| B.Sc Nursing | School of Health Sciences |
| B.Pharm | School of Health Sciences |

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

Login as the Sunrise **college admin** (see credentials below) → **Subjects**. Create these 16 subjects — the names and branch scoping **must match the question-bank PDFs exactly**:

| Subject | Code | Branch |
|---|---|---|
| Computer Networks | IT101 | B.Tech IT |
| Web Development | IT201 | B.Tech IT |
| Machine Learning | AIML101 | B.Tech AI & ML |
| Data Science | AIML201 | B.Tech AI & ML |
| Business Analytics | BBA101 | BBA |
| Marketing Management | BBA201 | BBA |
| Financial Accounting | COM101 | B.Com |
| Cost Accounting | COM201 | B.Com |
| Design Fundamentals | DES101 | B.Des |
| Typography | DES201 | B.Des |
| Architectural Drawing | ARC101 | B.Arch |
| Building Materials | ARC201 | B.Arch |
| Anatomy and Physiology | NUR101 | B.Sc Nursing |
| Pharmacology | NUR201 | B.Sc Nursing |
| Pharmaceutical Chemistry | PHR101 | B.Pharm |
| Pharmaceutics | PHR201 | B.Pharm |

## Step 4 — Create course offerings (College Admin)

For each subject, create a **course offering** pointing at the right section:

- `Computer Networks · IT · 2026-27 Sem 1 A` → subject IT101, section `2026-27 · Sem 1 · A`, semester 1, year 1
- `Web Development · IT · 2026-27 Sem 3 A` → subject IT201, section `2026-27 · Sem 3 · A`, semester 3, year 2
- …and so on for all 16 (semester 1/year 1 for the first 8, semester 2/year 1 or 3/year 2 matching each PDF's header — each PDF's first line states its course, branch, semester and year; follow it).

Then **enroll students** into the offerings: use the ➕ Add Student button on each course and pick the 2 students of the matching branch + year from the CSV.

## Step 5 — Bulk import users (Super Admin)

Super Admin → **Users → Bulk Import**:

1. Select college **Sunrise University**
2. Upload `sunrise-users.csv`
3. Temporary password: `Test@1234`
4. **Import** → expect `Created: 40`

The importer stores department/branch as user attributes, so no pre-created org node is required for the import itself — the org tree from Steps 2–4 is what powers enrollment and course scoping.

## Step 6 — Import question banks

**Option A (quick):** one PDF → Super Admin / College Admin → **Question Bank → Import from PDF** → upload `sunrise-question-bank.pdf` (16 subjects' sample questions in one import — also a great dedup test: re-import it and confirm the skipped count).

**Option B (realistic):** import each of the 16 course PDFs under its matching subject, e.g.:
1. Open **Question Bank → Import from PDF**
2. Select subject `Machine Learning` (course offering under it auto-fills)
3. Upload `question-banks/sunrise-machine-learning.pdf`
4. Verify: `Imported 12 questions` (10 MCQ + 2 essay per PDF)

**PDF structure the importer understands** (so you can also create your own):
```
1. Which protocol provides reliable, connection-oriented delivery?
a) UDP
b) IP
c) TCP
d) ARP
Answer: c
...
11. Explain the difference between TCP and UDP with one example use case for each.
(essay question — no options, no Answer line)
```
Rules: numbered questions (`1.` or `Q1:`), options `a)–d)` with `)` or `.`, an `Answer: x` line per MCQ, plain text, no images/tables. Lines that don't fit MCQ become essay questions automatically.

---

## Credentials summary

| Role | Email | Password |
|---|---|---|
| College Admin (Sunrise) | created on the Users page during onboarding | set by you |
| Professor — Technology | `su.technology.trainer@sunrise.edu` | `Test@1234` |
| Professor — Business | `su.business.trainer@sunrise.edu` | `Test@1234` |
| Professor — Design | `su.design.trainer@sunrise.edu` | `Test@1234` |
| Professor — Health Sciences | `su.health.trainer@sunrise.edu` | `Test@1234` |
| TA — Technology | `su.technology.ta@sunrise.edu` | `Test@1234` |
| TA — Business | `su.business.ta@sunrise.edu` | `Test@1234` |
| TA — Design | `su.design.ta@sunrise.edu` | `Test@1234` |
| TA — Health Sciences | `su.health.ta@sunrise.edu` | `Test@1234` |
| Students | `su2026.<branch>.<NNN>@sunrise.edu` (full list in `sunrise-user-mapping.md`) | `Test@1234` |

---

## Manual test checklist (second college)

**Super Admin**
- [ ] Create the second college → build structure with the College dropdown selected at each step
- [ ] Bulk import 40 Sunrise users; verify the college filter only shows Sunrise users
- [ ] Question-bank PDF import works under the right Sunrise subject

**College Admin (Sunrise)**
- [ ] Create subjects + course offerings scoped to Sunrise branch/semester/section
- [ ] Enroll students, assign trainers — only Sunrise users appear in the pickers
- [ ] Create quizzes/assignments/attendance for Sunrise courses

**Cross-checks (multi-college isolation)**
- [ ] Login as Green Valley college admin → **cannot see any Sunrise course, subject, user, or event**
- [ ] Login as Sunrise student `su2026.it.001@sunrise.edu` → sees only IT courses, never Green Valley's
- [ ] Super admin analytics/course pickers let you switch between the two colleges
- [ ] Notifications/forums/chat/calendar created by one college never leak to the other

**Same checks as Green Valley (re-run for Sunrise)**
- [ ] Promote a Year-1 Sunrise student to Year-2 — same login, new section, gradecard intact
- [ ] Gradebook, attendance, live classes, certificates all work for Sunrise users
