/**
 * Builds the SannaLMS customer user guide as a single self-contained HTML file
 * with all screenshots embedded as base64 (easy to share / print to PDF).
 *
 * Usage: node build-guide.js
 */
const fs = require('fs');
const path = require('path');

// Use the optimized JPEGs if present, otherwise fall back to the raw PNGs.
const SHOTS_OPT = path.join(__dirname, 'screenshots-opt');
const SHOTS = path.join(__dirname, 'screenshots');
const OUT = path.join(__dirname, 'SannaLMS-User-Guide.html');

const img = (name, alt, cls) => {
  const jpg = path.join(SHOTS_OPT, name.replace(/\.png$/, '.jpg'));
  const png = path.join(SHOTS, name);
  const p = fs.existsSync(jpg) ? jpg : png;
  if (!fs.existsSync(p)) return `<div class="missing">missing: ${name}</div>`;
  const b64 = fs.readFileSync(p).toString('base64');
  const mime = p.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
  return `<figure class="${cls || ''}"><img src="data:${mime};base64,${b64}" alt="${alt}" loading="lazy"/><figcaption>${alt}</figcaption></figure>`;
};

// ── TOC structure ──────────────────────────────────────────────────────────
const sections = [
  {
    id: 'intro', title: '1. Welcome to SannaLMS',
    body: `
      <p><strong>SannaLMS</strong> is a complete digital campus for colleges and universities. It brings
      <em>learning, teaching, assessment, attendance, communication, and certification</em> into one
      secure web platform — no separate tools, spreadsheets, or messaging apps needed.</p>
      <div class="cards">
        <div class="card"><h4>🎓 For Students</h4><p>Courses &amp; lessons, quizzes, assignments, AI tutor, attendance, live classes, grade card &amp; certificates.</p></div>
        <div class="card"><h4>👨‍🏫 For Trainers</h4><p>Build courses, manage question banks, create quizzes &amp; assignments, grade work, take attendance, run live classes.</p></div>
        <div class="card"><h4>🏛️ For College Admins</h4><p>Run one college: departments, branches, semesters, subjects, sections, courses, users, grades &amp; analytics.</p></div>
        <div class="card"><h4>🏢 For Super Admins</h4><p>Run the whole platform: onboard multiple colleges, manage them all from one dashboard, send announcements.</p></div>
      </div>
      <h3>Every role sees exactly what they need</h3>
      <p>The platform is role-based: a student never sees another college's data or another student's
      answers. A trainer only sees their teaching tools. A college admin only sees their own college.</p>
    `,
  },
  {
    id: 'quickstart', title: '2. Quick Start — Log In',
    body: `
      <h3>Two web addresses</h3>
      <ul>
        <li><strong>Student &amp; staff portal:</strong> <code>https://sannalms.sannainnovations.com</code> — where students learn, take tests, and track progress. It is also the single sign-on entry point for everyone.</li>
        <li><strong>Admin dashboard:</strong> <code>https://admin.sannalms.sannainnovations.com</code> — where admins and trainers manage the college.</li>
      </ul>
      <p>Open the portal in any modern browser (Chrome, Edge, Firefox, Safari) on a computer, tablet, or phone. You will see the secure login screen below — sign in with the username and password your institution gives you.</p>
      ${img('login.png', 'The SannaLMS sign-in screen (single secure login for all roles)')}
      <h3>Demo accounts</h3>
      <p>For testing, every demo account uses the password <code>Test@1234</code>:</p>
      <table>
        <tr><th>Role</th><th>Username</th><th>What they can do</th></tr>
        <tr><td>Super Admin</td><td><code>test_superadmin</code></td><td>Manage every college on the platform</td></tr>
        <tr><td>College Admin</td><td><code>test_collegeadmin</code></td><td>Run one college end-to-end</td></tr>
        <tr><td>Primary Trainer</td><td><code>test_trainer</code></td><td>Teach, create content, grade students</td></tr>
        <tr><td>Teaching Assistant</td><td><code>test_assistant</code></td><td>Help the trainer with grading &amp; attendance</td></tr>
        <tr><td>Student</td><td><code>test_student</code></td><td>Learn, take tests, track progress</td></tr>
      </table>
      <p class="tip">💡 <strong>Tip:</strong> sign in once on the portal, and the admin dashboard opens automatically if you have an admin or trainer role. The screenshots in this guide were taken with a fully set-up demo college (Green Valley University).</p>
    `,
  },
  {
    id: 'superadmin', title: '3. Super Admin Guide',
    body: `
      <p>The Super Admin owns the whole platform — the "control room" for one college or a group of colleges.
      Every college on the platform is completely separate: their data can never mix.</p>

      <h3>3.1 Dashboard</h3>
      <p>After login you land on the dashboard with platform-wide stats: number of colleges, departments, courses, and enrollments.</p>
      ${img('admin-superadmin-dashboard.png', 'Super Admin dashboard — platform-wide statistics')}

      <h3>3.2 Onboard a college (Colleges)</h3>
      <p>Click <strong>Colleges</strong> → <strong>+ Add College</strong>. Enter the college name, the admin's email and name, and a tenant ID. The college is created with its own private space, its own admin login, and its own data. You can put a college <em>On Hold</em> (soft suspend) or delete it permanently.</p>
      ${img('admin-superadmin-colleges.png', 'Colleges page — create, suspend, or delete colleges')}

      <h3>3.3 Bulk import users</h3>
      <p>Click <strong>Bulk Import Users</strong> to upload a CSV of students/staff with their role, department, branch, and year. This is the fastest way to onboard hundreds of students.</p>
      ${img('admin-superadmin-bulk-import.png', 'Bulk import users from CSV')}

      <h3>3.4 Build the college structure</h3>
      <p>Every college is organized the way a real institution is: <strong>Departments → Branches → Semesters → Subjects → Sections</strong>. Pick the college from the dropdown to see or edit only that college's structure.</p>
      ${img('admin-superadmin-departments.png', 'Departments page')}
      ${img('admin-superadmin-branches.png', 'Branches page (each branch belongs to a department)')}
      ${img('admin-superadmin-semesters.png', 'Semesters page (e.g. Sem 1–8 per branch)')}
      ${img('admin-superadmin-subjects.png', 'Subjects catalog with codes & credits')}
      ${img('admin-superadmin-sections.png', 'Sections — split a semester into A, B, C, D class sections')}

      <h3>3.5 Courses</h3>
      <p>Courses are teaching instances of a subject for a specific cohort (branch + semester + section). Assign trainers and enroll students here.</p>
      ${img('admin-superadmin-courses.png', 'Courses page — offerings per college/cohort')}

      <h3>3.6 Assessment center</h3>
      <p>Manage the <strong>Question Bank</strong> (upload questions from a PDF or add them manually), create <strong>Quizzes</strong> and <strong>Assignments</strong>, and watch results in the <strong>Gradebook</strong>.</p>
      ${img('admin-superadmin-question-bank.png', 'Question bank — import from PDF or add manually')}
      ${img('admin-superadmin-quizzes.png', 'Quizzes — build from the question bank')}
      ${img('admin-superadmin-assignments.png', 'Assignments')}
      ${img('admin-superadmin-gradebook.png', 'Gradebook — per-student scores, grades & CGPA')}

      <h3>3.7 Attendance &amp; live classes</h3>
      ${img('admin-superadmin-attendance.png', 'Attendance — sessions & check-ins')}
      ${img('admin-superadmin-live-classes.png', 'Live classes — schedule Jitsi video sessions per course')}

      <h3>3.8 Certificates &amp; analytics</h3>
      ${img('admin-superadmin-certificates.png', 'Certificates — issue & verify completion certificates')}
      ${img('admin-superadmin-analytics.png', 'Analytics — platform performance at a glance')}

      <h3>3.9 Communication tools</h3>
      ${img('admin-superadmin-calendar.png', 'Calendar — schedule events for one or all colleges')}
      ${img('admin-superadmin-notifications.png', 'Notifications — target a college, department, branch, semester, course, role, or specific users')}
      ${img('admin-superadmin-forums.png', 'Discussion forums')}
      ${img('admin-superadmin-chat.png', 'Chat — group rooms and direct messages')}
      ${img('admin-superadmin-search.png', 'Search — find anything across the platform')}
    `,
  },
  {
    id: 'collegeadmin', title: '4. College Admin Guide',
    body: `
      <p>The College Admin runs one college. Everything they see is scoped to their college — they can never
      touch another college's data.</p>

      <h3>4.1 Dashboard &amp; college structure</h3>
      <p>The menu mirrors the Super Admin's, minus the cross-college tools. Set up the college: departments, branches, semesters, subjects, sections, and courses.</p>
      ${img('admin-collegeadmin-dashboard.png', 'College Admin dashboard')}
      ${img('admin-collegeadmin-departments.png', 'Departments')}
      ${img('admin-collegeadmin-branches.png', 'Branches')}
      ${img('admin-collegeadmin-semesters.png', 'Semesters')}
      ${img('admin-collegeadmin-subjects.png', 'Subjects')}
      ${img('admin-collegeadmin-sections.png', 'Sections')}
      ${img('admin-collegeadmin-courses.png', 'Courses — assign trainers & enroll students')}

      <h3>4.2 Assessments</h3>
      <p>Build the question bank, quizzes, assignments, and track the gradebook — all for your college only.</p>
      ${img('admin-collegeadmin-question-bank.png', 'Question bank')}
      ${img('admin-collegeadmin-quizzes.png', 'Quizzes')}
      ${img('admin-collegeadmin-assignments.png', 'Assignments')}
      ${img('admin-collegeadmin-gradebook.png', 'Gradebook')}

      <h3>4.3 Attendance, live classes, certificates &amp; analytics</h3>
      ${img('admin-collegeadmin-attendance.png', 'Attendance')}
      ${img('admin-collegeadmin-live-classes.png', 'Live classes')}
      ${img('admin-collegeadmin-certificates.png', 'Certificates')}
      ${img('admin-collegeadmin-analytics.png', 'Analytics')}

      <h3>4.4 Communication</h3>
      ${img('admin-collegeadmin-calendar.png', 'Calendar')}
      ${img('admin-collegeadmin-notifications.png', 'Notifications')}
      ${img('admin-collegeadmin-forums.png', 'Forums')}
      ${img('admin-collegeadmin-chat.png', 'Chat')}
    `,
  },
  {
    id: 'trainer', title: '5. Trainer & Teaching Assistant Guide',
    body: `
      <p>Trainers and Teaching Assistants get a focused teaching dashboard: their courses, the assessment
      tools, attendance, and communication — with no platform-level settings.</p>

      <h3>5.1 My Courses</h3>
      <p>See the courses you teach, open the course builder, and manage curriculum (modules → lessons → topics, with videos, PDFs, and notes).</p>
      ${img('admin-trainer-my-courses.png', 'Trainer — My Courses')}

      <h3>5.2 Question bank</h3>
      <p>Add multiple-choice or essay questions, or import a question PDF. Questions are stored per subject/course and reused across quizzes.</p>
      ${img('admin-trainer-question-bank.png', 'Trainer question bank')}

      <h3>5.3 Quizzes &amp; assignments</h3>
      ${img('admin-trainer-quizzes.png', 'Create & publish quizzes')}
      ${img('admin-trainer-assignments.png', 'Create assignments & review submissions')}

      <h3>5.4 Gradebook</h3>
      <p>Quiz scores are auto-graded on submission. Review assignment submissions, release scores, and one click recalculates every student's grade and CGPA.</p>
      ${img('admin-trainer-gradebook.png', 'Trainer gradebook')}

      <h3>5.5 Attendance &amp; live classes</h3>
      ${img('admin-trainer-attendance.png', 'Take attendance (QR / GPS / manual)')}
      ${img('admin-trainer-live-classes.png', 'Schedule & run live classes')}

      <h3>5.6 Communication</h3>
      ${img('admin-trainer-notifications.png', 'Notifications')}
      ${img('admin-trainer-calendar.png', 'Calendar')}
      ${img('admin-trainer-forums.png', 'Forums')}
      ${img('admin-trainer-chat.png', 'Chat')}
    `,
  },
  {
    id: 'student', title: '6. Student Guide',
    body: `
      <p>The student portal is the heart of the product — everything a student needs for their day, from
      learning to attendance to certificates.</p>

      <h3>6.1 Overview</h3>
      <p>Your home screen: enrolled courses with progress, quick access to the code sandbox, adaptive exam, and AI tutor.</p>
      ${img('student-overview.png', 'Student overview — courses, progress & quick launch')}

      <h3>6.2 My Courses &amp; lesson player</h3>
      <p>Open a course to see its modules and lessons. Each lesson has videos, PDFs, and notes. Progress is tracked automatically.</p>
      ${img('student-courses.png', 'Course curriculum & lesson player')}

      <h3>6.3 Code Sandbox</h3>
      <p>Write and run real Python, C++, or Java code in the browser — executed safely in an isolated sandbox. Perfect for programming courses.</p>
      ${img('student-sandbox.png', 'Code sandbox — run real code in the browser')}

      <h3>6.4 Adaptive Exam</h3>
      <p>Take the quizzes your trainers published. The test adapts to your level, has a timer, and auto-submits when time runs out. Scores appear instantly in your gradebook.</p>
      ${img('student-adaptive-exam.png', 'Adaptive exam / quizzes')}

      <h3>6.5 AI Tutor</h3>
      <p>A 24/7 AI tutor that answers questions strictly from your course material. Doubt at 11 PM? The tutor is awake.</p>
      ${img('student-ai-tutor.png', 'AI Tutor — answers from your course material')}

      <h3>6.6 Leaderboard &amp; XP</h3>
      <p>Earn XP for completing lessons and quizzes, and climb the leaderboard — learning is gamified to keep you engaged.</p>
      ${img('student-leaderboard.png', 'Leaderboard & XP rankings')}

      <h3>6.7 Certificates</h3>
      <p>When you complete a course, your certificate appears here with a unique verification code anyone can check.</p>
      ${img('student-certificates.png', 'My certificates')}

      <h3>6.8 Assignments</h3>
      <p>See assigned work, submit files or code, and fix a wrong attachment by re-uploading — no new submission needed.</p>
      ${img('student-assignments.png', 'Assignments & submissions')}

      <h3>6.9 Attendance</h3>
      <p>Check in to a live session with one tap (QR or GPS). See which course and session you're marking attendance for.</p>
      ${img('student-attendance.png', 'Attendance check-in')}

      <h3>6.10 Live classes</h3>
      <p>Join scheduled video classes from your trainer with one click.</p>
      ${img('student-live-classes.png', 'Live classes — join video sessions')}

      <h3>6.11 My Grades</h3>
      <p>Your grade card per course — scores, grades, and CGPA, updated live as trainers grade your work.</p>
      ${img('student-grades.png', 'My grades & progress')}

      <h3>6.12 Notifications, Calendar, Forums &amp; Chat</h3>
      <p>Stay in the loop: announcements, college events, discussion forums, and chat with classmates and trainers.</p>
      ${img('student-notifications.png', 'Notifications inbox')}
      ${img('student-calendar.png', 'College calendar & events')}
      ${img('student-forums.png', 'Discussion forums')}
      ${img('student-chat.png', 'Chat — rooms & direct messages')}
    `,
  },
  {
    id: 'workflows', title: '7. End-to-End Workflows',
    body: `
      <h3>7.1 The trainer → quiz → student → gradebook loop</h3>
      <ol>
        <li>Trainer opens <strong>Question Bank</strong> → adds (or imports) questions.</li>
        <li>Trainer creates a <strong>Quiz</strong> from those questions and publishes it.</li>
        <li>Student opens <strong>Adaptive Exam</strong> → sees the quiz → takes it → submits.</li>
        <li>The score is auto-graded instantly and appears in the trainer's <strong>Gradebook</strong> and the student's <strong>My Grades</strong>.</li>
      </ol>
      <h3>7.2 Onboard a college (Super Admin)</h3>
      <ol>
        <li><strong>Colleges</strong> → <strong>+ Add College</strong> → fill name, admin email, tenant ID.</li>
        <li>College admin logs in and builds <strong>Departments → Branches → Semesters → Subjects → Sections</strong>.</li>
        <li>College admin creates <strong>Courses</strong> and assigns trainers.</li>
        <li>Import students via <strong>Bulk Import Users</strong> (CSV), or enroll them course by course.</li>
        <li>Trainers publish quizzes/assignments; students learn and take tests; the gradebook fills in.</li>
      </ol>
      <h3>7.3 Attendance flow</h3>
      <ol>
        <li>Trainer/Admin creates an <strong>Attendance session</strong> for a course (with a QR code).</li>
        <li>Trainer <strong>starts</strong> the session; students can check in only while it is live.</li>
        <li>Students tap <strong>Check In</strong> — attendance is recorded instantly.</li>
        <li>When the trainer ends the session, attendance auto-closes.</li>
      </ol>
      <h3>7.4 Live class flow</h3>
      <ol>
        <li>Trainer schedules a <strong>Live Class</strong> for a course (title, date/time, duration).</li>
        <li>Students see it in their <strong>Live Classes</strong> tab.</li>
        <li>Trainer clicks <strong>Go Live</strong> → students join the video room.</li>
        <li>Trainer ends the class; it is marked <em>Ended</em> and cannot restart.</li>
      </ol>
      <h3>7.5 Certificate flow</h3>
      <ol>
        <li>Admin/Trainer issues a certificate to a student (course, grade, CGPA).</li>
        <li>Student sees it in <strong>Certificates</strong> with a unique number.</li>
        <li>Anyone can <strong>verify</strong> the number — no login needed.</li>
      </ol>
    `,
  },
  {
    id: 'faq', title: '8. Common Questions',
    body: `
      <h3>Can one platform really run multiple colleges?</h3>
      <p>Yes. Every college is a separate tenant with its own data, admin, and structure — all managed from one Super Admin dashboard. College admins and students only ever see their own college.</p>
      <h3>Do students need an app install?</h3>
      <p>No. Everything runs in any modern web browser on any device.</p>
      <h3>How are quiz scores calculated?</h3>
      <p>Multiple-choice questions are graded automatically on submission. Essay/code questions are graded by the trainer, who releases the score. The gradebook then calculates the grade and CGPA.</p>
      <h3>Can students cheat on attendance?</h3>
      <p>QR and GPS check-in are bound to a live session started by the trainer, so students can only check in while the class is actually running.</p>
      <h3>Are certificates verifiable?</h3>
      <p>Yes — each certificate has a unique number that can be verified publicly without logging in, so employers and universities can confirm authenticity.</p>
      <h3>What happens when a semester ends?</h3>
      <p>Students can be promoted to the next semester; grades, grade cards, and CGPA follow them.</p>
    `,
  },
];

// ── HTML template ──────────────────────────────────────────────────────────
const navItems = sections.map(s => `<a href="#${s.id}">${s.title}</a>`).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>SannaLMS — User Guide</title>
<style>
  :root {
    --bg: #f6f8fb; --panel: #ffffff; --ink: #1c2434; --muted: #5b6577;
    --accent: #3b82f6; --accent2: #8b5cf6; --border: #e5e9f0; --ok: #0a7d43;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
         background: var(--bg); color: var(--ink); line-height: 1.6; }
  header.cover { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #7c3aed 100%);
         color: #fff; padding: 70px 40px 60px; text-align: center; }
  header.cover h1 { font-size: 42px; letter-spacing: -0.5px; margin-bottom: 12px; }
  header.cover p { font-size: 18px; opacity: .92; max-width: 720px; margin: 0 auto; }
  header.cover .tag { display: inline-block; margin-top: 20px; background: rgba(255,255,255,.14);
         border: 1px solid rgba(255,255,255,.25); padding: 6px 16px; border-radius: 20px; font-size: 13px; }
  .layout { display: flex; max-width: 1280px; margin: 0 auto; }
  nav.toc { width: 280px; min-width: 280px; padding: 30px 20px; position: sticky; top: 0; align-self: flex-start;
         max-height: 100vh; overflow-y: auto; display: none; }
  nav.toc a { display: block; padding: 8px 12px; border-radius: 8px; color: var(--ink);
         text-decoration: none; font-size: 14px; }
  nav.toc a:hover { background: #eef2f8; }
  main { flex: 1; padding: 40px 30px 80px; min-width: 0; }
  section { background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
         padding: 32px 36px; margin-bottom: 28px; }
  section > h2 { font-size: 26px; margin-bottom: 14px; color: #111827; }
  section h3 { font-size: 19px; margin: 26px 0 10px; color: #1e3a8a; }
  section p, section li { color: var(--ink); }
  section ul, section ol { padding-left: 22px; margin: 10px 0; }
  section li { margin: 5px 0; }
  code { background: #eef2f8; border-radius: 5px; padding: 2px 7px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
  th, td { border: 1px solid var(--border); padding: 10px 14px; text-align: left; }
  th { background: #f1f5fb; }
  figure { margin: 18px 0; }
  figure img { width: 100%; border: 1px solid var(--border); border-radius: 10px;
         box-shadow: 0 4px 18px rgba(15,23,42,.08); }
  figcaption { font-size: 12.5px; color: var(--muted); margin-top: 6px; text-align: center; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin: 18px 0; }
  .card { border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; background: #fafbfe; }
  .card h4 { margin-bottom: 6px; color: #1e3a8a; }
  .card p { font-size: 14px; color: var(--muted); }
  .tip { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 16px;
         color: var(--ok); font-size: 14px; margin: 14px 0; }
  .missing { color: #b91c1c; padding: 20px; border: 1px dashed #fca5a5; border-radius: 8px; margin: 14px 0; }
  footer { text-align: center; color: var(--muted); font-size: 13px; padding: 30px 0 50px; }
  @media (min-width: 1100px) { nav.toc { display: block; } }
  @media print {
    nav.toc { display: none; }
    section { break-inside: auto; box-shadow: none; }
    body { background: #fff; }
  }
</style>
</head>
<body>
<header class="cover">
  <h1>📘 SannaLMS User Guide</h1>
  <p>A complete digital campus — learning, teaching, assessment, attendance, communication, and certification in one secure platform.</p>
  <span class="tag">For students · trainers · college admins · platform admins</span>
</header>
<div class="layout">
  <nav class="toc"><h3 style="padding:0 12px 10px;font-size:15px;color:#1e3a8a;">Contents</h3>${navItems}</nav>
  <main>
    ${sections.map(s => `<section id="${s.id}"><h2>${s.title}</h2>${s.body}</section>`).join('')}
    <footer>SannaLMS User Guide · Screenshots show the live demo environment.<br/>© Sanna Innovations</footer>
  </main>
</div>
</body>
</html>`;

fs.writeFileSync(OUT, html);
console.log('Wrote', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(1) + ' MB');
