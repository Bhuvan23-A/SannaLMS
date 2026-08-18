# SannaLMS — Customer Demo Script

**Goal:** Show a potential customer the complete learning-management flow — who does what, how it all connects, and why SannaLMS beats other LMS platforms.
**Style:** Simple language. No technical jargon. Anyone in the room should understand.
**Total time:** 25–30 minutes (5 roles × ~4–5 minutes each, plus a 3-minute opener and a 3-minute closer).

> ⚠️ **Last verified against the live server:** all facts in this script were checked —
> AI Tutor (Gemini key active), QR + GPS attendance, certificate verification, code sandbox,
> gradebook — all working. Two things are **NOT ready to demo live**: joining a live class
> (known bug, in the fix queue) and plagiarism checking (not implemented — don't claim it).

---

## Demo Setup (before the customer arrives — 10 minutes)

**Open two tabs** and log in to both (all passwords are `Test@1234`):
- Student portal: `https://sannalms.sannainnovations.com`
- Admin dashboard: `https://admin.sannalms.sannainnovations.com`

| Role | Username | What they can do |
|---|---|---|
| Super Admin | `test_superadmin` | Runs the whole platform (sees all colleges) |
| College Admin | `test_collegeadmin` | Runs one college (Green Valley) |
| Primary Trainer | `test_trainer` | Teaches Data Structures + Programming Fundamentals |
| Teaching Assistant | `test_assistant` | Supports the same two courses |
| Student | `test_student` | Enrolled in 3 courses (Data Structures, Programming Fundamentals, Linear Algebra) |

**Before the customer arrives:**
1. Press **Ctrl + Shift + R** (hard refresh) on both tabs so you show the latest build.
2. Open the **AI Tutor** tab as `test_student` and ask one question (e.g. *"What does this lesson teach?"*) — confirm the answer comes back **before** the customer sits down. If it's slow or errors, skip the AI Tutor segment gracefully (see "If something goes wrong" at the end).
3. Keep the Green Valley kit handy: `test-data/greenvalley/greenvalley-onboarding-guide.md` (and the Sunrise kit `test-data/sunrise/` if you want to show a second college live).
4. Have the URLs + demo logins written on paper for them to take away.

**Golden rule of the demo:** show one full student journey end-to-end (login → learn → take a quiz → see the score in the trainer's gradebook). A complete story beats jumping between menus.

---

## Part 0 — The 3-Minute Opener (say this to the customer)

> "Thank you for your time today. What we're going to show you is SannaLMS — a complete digital campus for your institution. Think of it as three things in one: a place where students learn, a toolbox where teachers teach and test, and a control room where your college runs smoothly.
>
> Here's the big idea: **everyone gets their own view.** Students see their courses and exams. Teachers see their classes and grading. The principal sees the whole college. And if you manage multiple colleges, each one gets its own private space — but you control them all from one screen.
>
> You don't need to know anything technical to use it. It works in any browser, on any device, and the security is built in, not bolted on.
>
> Let me show you, step by step, what each person in your institution will do with it — starting from the top."

---

## Part 1 — Super Admin Walkthrough (~5 minutes)

> "The Super Admin is you — the person who owns the platform. This is the 'God view' of everything."

**1. Login**
- Log in as `test_superadmin` on the admin dashboard URL.
- **Say:** "Watch what happens — because of your role, you're taken straight into the admin dashboard. No confusing screens in between."

**2. The College Directory (one platform, many colleges)**
- Click **Colleges**.
- **Say:** "This is the heart of the product. One login, one platform, but **every college is completely separate** — their data cannot mix. Green Valley University here is a live college running on this platform. Watch — let me add a new college."
- Click **+ Add College**, fill in a name (e.g. "ABC Engineering College"), and Save.
- **Say:** "That college is now live with its own space, its own data, and its own admins. That's how you can onboard dozens of colleges without any extra hardware or software. *(Note: if you've prepared the Sunrise kit, you can instead open the already-onboarded second college and show the college list with two entries — even more convincing.)*"

**3. College structure (Departments → Branches → Semesters)**
- Click through **Departments**, **Branches**, **Semesters**.
- **Say:** "Each college is organized exactly the way your institution is structured — departments, branches, semesters. This is the skeleton that courses and students hang on. Notice every screen has a **College dropdown** — as the platform owner you can switch between colleges and build structure inside any one of them, without ever mixing their data."

**4. Oversight**
- Open **Analytics** and **Gradebook**.
- **Say:** "From here you can see how every college is performing — attendance, test scores, activity — all in one place. You're not flying blind. If a college needs help, you see it in the numbers."
- *(If analytics is slow or empty on the day, skip to the next point — don't dwell.)*

**5. Platform-wide tools**
- Open **Calendar**, **Notifications**, **Forums**, **Chat**.
- **Say:** "The Super Admin can schedule institution-wide events, broadcast announcements, and open discussion forums — and you choose which college, department, or course each announcement goes to. It's a full communication platform, not just a test-taking tool."

---

## Part 2 — College Admin Walkthrough (~5 minutes)

> "The College Admin runs one college. Everything they see is scoped to their college — they can't touch anyone else's data."

**1. Login**
- Log out, log in as `test_collegeadmin`.
- **Say:** "Notice the menu is different now. The College Admin gets exactly what their college needs — nothing more, nothing less."

**2. Build the college**
- Click **Departments**, **Branches**, **Semesters**, **Subjects**, **Courses**.
- **Say:** "The College Admin sets up the course catalog for their college — the 16 Green Valley subjects you see here, each tied to a branch and semester. They also decide who teaches what, and enroll students into courses."

**3. The assessment center**
- Click **Assessments**, then **Question Bank**, **Quizzes**, **Assignments**, **Gradebook**.
- **Say:** "This is where tests come alive. The question bank is the library of questions. The College Admin can also **upload a PDF of questions and the system reads them automatically** — no retyping. Then they build quizzes and assignments from the bank, and the gradebook shows every student's results in real time."

**4. Attendance & live classes (schedule, don't join)**
- Click **Attendance**, then **Live Classes**.
- **Say:** "Attendance is a big deal in every college — here it takes seconds. The teacher starts a session, and students check in with a **QR code or their phone's GPS** — no calling roll, no proxy attendance. Live classes are scheduled right here and students see them instantly."
- ⚠️ **Do not click "Join" on a live class** — the join flow is being fixed. Only show the schedule list. If asked, say: "The joining experience is being polished for the next release."

**5. Certificates & verification**
- Click **Certificates**.
- **Say:** "When students finish, certificates are generated automatically — each with its own verification code. Anyone can check a certificate is genuine using the public verify link — that's the kind of thing employers actually use."

**6. Day-to-day**
- Open **Calendar**, **Notifications**, **Forums**, **Chat**.
- **Say:** "Scheduling, announcements, forums, chat — the College Admin runs their whole campus from here. No separate tools, no email chains, no WhatsApp groups."

---

## Part 3 — Primary Trainer Walkthrough (~4 minutes)

> "The Trainer is the teacher — the person who creates the learning content and evaluates students."

**1. Login**
- Log out, log in as `test_trainer`.
- **Say:** "The trainer lands in a dashboard built around teaching. Notice they only see their **assigned courses** — Data Structures and Programming Fundamentals — not the whole college."

**2. Course content**
- Open a course → **Modules / Lessons / Resources**.
- **Say:** "A trainer builds a course with modules and lessons — text, videos, notes, and file resources. This becomes exactly what the student sees in their portal. *(Demo tip: open the topic with the uploaded PDF and open the file to show it serves correctly.)*"

**3. Create questions**
- Open **Question Bank**, click **+ Add Question**.
- **Say:** "Let's add a multiple-choice question with the correct answer marked. Questions live in the bank once — then get reused in any quiz. Build once, use many times."

**4. Build a quiz**
- Open **Quizzes**, click **+ Create Quiz**, pick a title, attach questions, set a duration, publish.
- **Say:** "The trainer assembles a quiz from the question bank and publishes it. The moment it's published, it appears in every enrolled student's portal."

**5. Create an assignment**
- Open **Assignments**, create one.
- **Say:** "Assignments work the same way. Students upload their work as a file, and the trainer reviews it right here and gives marks with feedback. The submission, the review, and the final grade all live in one place."

**6. Gradebook & recalculate**
- Open **Gradebook**.
- **Say:** "And here's the payoff — the trainer watches results flow in live. Quiz scores are auto-graded the second a student submits. One click recalculates everything. No spreadsheets."

---

## Part 4 — Teaching Assistant Walkthrough (~2 minutes)

> "The Teaching Assistant supports the trainer — help with grading, attendance, and keeping classes moving."

**1. Login**
- Log out, log in as `test_assistant`.
- **Say:** "The assistant gets the same teaching tools, scoped to what they help with."

**2. Attendance & gradebook**
- Open **Attendance**, then **Gradebook**.
- **Say:** "The assistant can mark attendance, see who checked in, and help grade assignments — while the trainer keeps full control."

**3. Why this matters**
- **Say:** "In many systems, sharing teaching duties is messy. Here, the college admin decides who gets access, and everyone works on the same live data — no spreadsheets, no duplication, no version confusion."

---

## Part 5 — Student Walkthrough (~7 minutes — the star of the show)

> "Now the most important part — the student's day, from start to finish. This is where the whole system comes together."

**1. Login**
- Log out, log in as `test_student` on the **student portal** URL.
- **Say:** "This is the student's home. Clean, simple, everything they need on the left."

**2. Overview & courses**
- Open **Overview**, then **My Courses**.
- **Say:** "Courses, progress, lessons with videos and resources. Students always know where they stand."

**3. Code Sandbox (live wow moment)**
- Open **Code Sandbox**.
- **Say:** "Here's something most LMS platforms can't do. Students write real code — Python, C++, or Java — right in the browser, and it runs in a safe, isolated sandbox. Let's run this."
- Click **Execute Code**.
- **Say:** "Real code, real output, real-time. And it's completely safe — the code runs in a locked-down box, so students can't harm the system. Perfect for programming colleges."

**4. Adaptive Exam (the quiz the trainer published)**
- Open **Adaptive Exam**, click **Start Quiz** on a visible quiz.
- **Say:** "This is a quiz built from the question bank. Watch the question, pick an answer, move on. There's a timer, and it auto-submits when time runs out. *(If the trainer published a new quiz in Part 3, it appears here automatically — that's the live connection.)*"
- Answer a couple of questions, click **Submit Quiz**.
- **Say:** "Submitted. The score is calculated instantly — and it's recorded in the trainer's gradebook. The quiz now shows 'Completed'."

**5. Assignments**
- Open **Assignments**, pick the assignment, submit with a file.
- **Say:** "The student uploads their assignment in one click, and can even replace the file if they made a mistake. The trainer sees it immediately."

**6. AI Tutor (another wow moment)**
- Open **AI Tutor**, ask *"What does this lesson teach?"*
- **Say:** "Every student gets a 24/7 AI tutor that answers questions **based on their actual course material** — the lessons and PDFs their teacher uploaded. Doubt at 11 PM? No problem — the tutor is awake. *(We verified this works on the live demo before we started.)*"

**7. Leaderboard & XP**
- Open **Leaderboard**.
- **Say:** "Learning is gamified. Students earn XP for taking quizzes and checking in, level up, and compete on the leaderboard. It keeps engagement high — students don't just sit through classes, they participate."

**8. Certificates**
- Open **Certificates**.
- **Say:** "Completed courses produce certificates with verification codes, so employers and anyone else can verify them instantly. *(Optional: show the public verify URL with a certificate number.)*"

**9. Attendance (QR check-in)**
- Open **Attendance**, pick a session, click **Check In via QR**.
- **Say:** "And attendance takes seconds — a QR check-in or GPS check-in from the student's phone. The teacher starts the session, the student checks in, done. *(Demo tip: create a session as the trainer first, start it, then check in as the student — the whole loop in 60 seconds.)*"

---

## Part 6 — Security & Trust (1 minute)

> "Before I wrap up, a few things that matter to any institution:
> - **One login for everything.** Students and staff use a single secure sign-on — no remembering ten passwords.
> - **Everyone sees only what they should.** A student can never see another student's answers or another college's data. The separation is enforced at every level — we verified it live with two colleges on this platform.
> - **Your data is yours and it's protected.** Role-based access control, activity monitoring, and regular backups so nothing is ever lost.
> - **It runs on your own servers or in the cloud** — however you prefer."

---

## Part 7 — Why SannaLMS is Better (closing talking points)

Use these to answer "what makes you different?":

1. **One platform, many colleges.** Most LMS products handle one college. SannaLMS gives you a control room for your whole group of institutions — while keeping each college completely private. That's rare.
2. **Real learning tools, not just videos.** A built-in code sandbox, an AI tutor grounded in the course material, auto-graded quizzes, and certificates with public verification.
3. **Attendance that takes seconds.** QR and GPS check-in from a phone replaces roll calls and proxy attendance.
4. **Engagement by design.** XP points, levels, leaderboards, and instant feedback keep students actively participating — not just watching.
5. **Live, connected data.** When a trainer publishes a quiz, the student sees it instantly. When a student submits, the gradebook updates instantly. No files, no spreadsheets, no delays.
6. **Simple for everyone.** Teachers and students don't need training videos to use it. The interface is clean, and every role only sees what they need.
7. **Secure by default.** Role-based access, per-college isolation, and regular backups — without any extra cost.

---

## Honest responses to common questions

**"How do students join a live class?"**
> "Live class sessions are scheduled and visible in the portal. The joining experience is being polished for the next release — we'll be happy to show it when it ships."

**"Is there plagiarism detection on assignments?"**
> "Right now assignments are reviewed and graded by the trainer with feedback. Automated plagiarism checking is on our roadmap — the submission trail and grading are already in place so it can plug straight in."

**"Can it handle our number of students?"**
> "Yes — the platform is built for multi-college scale. Each college is isolated, so adding colleges and thousands of students doesn't affect performance for any single one."

**"Who creates the college admin accounts?"**
> "When you onboard a college, the platform creates the college admin account automatically and hands you the credentials — you then create trainers and students inside that college, or bulk-import them from a spreadsheet."

---

## Demo Tips

- **If something takes longer than 2 seconds to load:** keep talking. "The system is fetching live data from the server..." — never show an awkward silence.
- **Let the customer drive** one step — e.g., let them add a question or start the quiz. Engagement beats perfection.
- **End with the student story.** The trainer → quiz → student → gradebook loop is the one demo people remember.
- **Have the URLs written on paper** for them, with the demo logins, so they can try it themselves later.

---

## If something goes wrong

- **AI Tutor slow or errors:** skip it and say "the tutor answers from the course material — we saw it working earlier; the network is a little slow right now."
- **Live class join accidentally clicked:** "the joining experience is being polished for the next release" — then move on to certificates or forums.
- **Analytics shows an error:** skip it and say "analytics is a live view — we'll look at the per-course gradebook instead," then open Gradebook.
- **Any screen won't load:** hard-refresh (Ctrl + Shift + R) once. Still broken? Say "let me show you that from the other role's view" and switch tabs — never promise to fix it on the spot in front of a customer.
