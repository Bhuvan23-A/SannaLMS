/**
 * SannaLMS user-guide screenshot capture.
 *
 * Admin UI: gets a JWT per role via the password grant, then navigates to
 * each page with ?token= (the Topbar reads the token from the URL).
 * Student portal: performs a real Keycloak login, then clicks each sidebar tab.
 *
 * Usage: node capture.js [--only admin|student] [--pages p1,p2]
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ADMIN = 'https://admin.sannalms.sannainnovations.com';
const PORTAL = 'https://sannalms.sannainnovations.com';
const TOKEN_URL = 'https://sannalms.sannainnovations.com/auth/realms/sannalms/protocol/openid-connect/token';
const OUT = path.join(__dirname, 'screenshots');

const VIEWPORT = { width: 1440, height: 900 };

// ── role credentials (all passwords Test@1234) ────────────────────────────
const CREDS = {
  superadmin: { username: 'test_superadmin', role: 'SUPER_ADMIN' },
  collegeadmin: { username: 'test_collegeadmin', role: 'COLLEGE_ADMIN' },
  trainer: { username: 'test_trainer', role: 'PRIMARY_TRAINER' },
  assistant: { username: 'test_assistant', role: 'TEACHING_ASSISTANT' },
  student: { username: 'test_student', role: 'STUDENT' },
};

// ── admin pages per role ───────────────────────────────────────────────────
const ADMIN_PAGES = {
  superadmin: [
    ['dashboard', '/'],
    ['colleges', '/colleges'],
    ['bulk-import', '/users/import'],
    ['departments', '/departments'],
    ['branches', '/branches'],
    ['semesters', '/semesters'],
    ['subjects', '/subjects'],
    ['academic-sessions', '/academic-sessions'],
    ['sections', '/sections'],
    ['courses', '/courses'],
    ['assessments', '/assessments'],
    ['question-bank', '/assessments/questions'],
    ['quizzes', '/assessments/quizzes'],
    ['assignments', '/assessments/assignments'],
    ['gradebook', '/assessments/gradebook'],
    ['attendance', '/attendance'],
    ['live-classes', '/liveclasses'],
    ['certificates', '/certificates'],
    ['analytics', '/analytics'],
    ['calendar', '/calendar'],
    ['notifications', '/notifications'],
    ['search', '/search'],
    ['forums', '/forums'],
    ['chat', '/chat'],
  ],
  collegeadmin: [
    ['dashboard', '/'],
    ['departments', '/departments'],
    ['branches', '/branches'],
    ['semesters', '/semesters'],
    ['subjects', '/subjects'],
    ['sections', '/sections'],
    ['courses', '/courses'],
    ['question-bank', '/assessments/questions'],
    ['quizzes', '/assessments/quizzes'],
    ['assignments', '/assessments/assignments'],
    ['gradebook', '/assessments/gradebook'],
    ['attendance', '/attendance'],
    ['live-classes', '/liveclasses'],
    ['certificates', '/certificates'],
    ['analytics', '/analytics'],
    ['calendar', '/calendar'],
    ['notifications', '/notifications'],
    ['forums', '/forums'],
    ['chat', '/chat'],
  ],
  trainer: [
    ['my-courses', '/courses'],
    ['notifications', '/notifications'],
    ['calendar', '/calendar'],
    ['forums', '/forums'],
    ['chat', '/chat'],
    ['question-bank', '/assessments/questions'],
    ['quizzes', '/assessments/quizzes'],
    ['assignments', '/assessments/assignments'],
    ['gradebook', '/assessments/gradebook'],
    ['attendance', '/attendance'],
    ['live-classes', '/liveclasses'],
  ],
};

// ── student portal tabs (clicked in the sidebar; label = button text) ──────
const STUDENT_TABS = [
  ['overview', 'Overview'],
  ['courses', 'My Courses'],
  ['sandbox', 'Code Sandbox'],
  ['adaptive-exam', 'Adaptive Exam'],
  ['ai-tutor', 'AI Tutor'],
  ['leaderboard', 'Leaderboard'],
  ['certificates', 'Certificates'],
  ['assignments', 'Assignments'],
  ['attendance', 'Attendance'],
  ['live-classes', 'Live Classes'],
  ['grades', 'My Grades'],
  ['notifications', 'Notifications'],
  ['calendar', 'Calendar'],
  ['forums', 'Forums'],
  ['chat', 'Chat'],
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
const only = arg('--only');        // 'admin' | 'student'
const onlyPages = arg('--pages');  // comma list

async function getToken(page, cred) {
  const resp = await page.evaluate(async ({ url, username, password }) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=password&client_id=sannalms-client&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    });
    const j = await r.json();
    return j.access_token || '';
  }, { url: TOKEN_URL, username: cred.username, password: 'Test@1234' });
  return resp;
}

async function captureAdmin(browser) {
  for (const [roleKey, pages] of Object.entries(ADMIN_PAGES)) {
    const cred = CREDS[roleKey];
    console.log(`\n=== ADMIN role: ${roleKey} ===`);
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    const token = await getToken(page, cred);
    if (!token) { console.log('  no token for', roleKey); await page.close(); continue; }
    for (const [name, route] of pages) {
      if (onlyPages && !onlyPages.split(',').includes(name)) continue;
      const url = `${ADMIN}${route}${route === '/' ? '?' : '?'}token=${encodeURIComponent(token)}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2500)); // let charts/lists render
        const fname = `admin-${roleKey}-${name}.png`;
        await page.screenshot({ path: path.join(OUT, fname), fullPage: true });
        console.log('  ✔', fname);
      } catch (e) {
        console.log('  ✘', name, e.message.slice(0, 100));
      }
    }
    await page.close();
  }
}

async function doStudentLogin(browser) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.goto(PORTAL, { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 2500));
  // Keycloak redirect: find username/password inputs
  const loggedIn = await page.evaluate(() => !!document.querySelector('.lms-dashboard-wrapper, .sidebar'));
  if (!loggedIn) {
    const u = await page.waitForSelector('#username', { timeout: 20000 });
    const p = await page.waitForSelector('#password', { timeout: 10000 });
    await u.type(CREDS.student.username);
    await p.type('Test@1234');
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 4000));
  }
  const ok = await page.evaluate(() => !!document.querySelector('.lms-dashboard-wrapper, .sidebar'));
  console.log('student login ok:', ok);
  return page;
}

async function captureStudent(browser) {
  const page = await doStudentLogin(browser);
  if (onlyPages) {
    const wanted = onlyPages.split(',');
    for (const [name, header] of STUDENT_TABS) {
      if (!wanted.includes(name)) continue;
      await clickTab(page, name, header);
    }
  } else {
    for (const [name, header] of STUDENT_TABS) {
      await clickTab(page, name, header);
    }
  }
  await page.close();
}

async function clickTab(page, name, header) {
  // Tabs are buttons in the sidebar nav; match by header text or button text.
  try {
    const clicked = await page.evaluate((hdr) => {
      const btns = Array.from(document.querySelectorAll('.nav-link-btn'));
      const b = btns.find(x => x.textContent.trim().includes(hdr));
      if (b) { b.click(); return true; }
      return false;
    }, header);
    if (!clicked) { console.log('  ✘ tab not found:', name); return; }
    await new Promise(r => setTimeout(r, 3000));
    const fname = `student-${name}.png`;
    await page.screenshot({ path: path.join(OUT, fname), fullPage: true });
    console.log('  ✔', fname);
  } catch (e) {
    console.log('  ✘', name, e.message.slice(0, 100));
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: VIEWPORT,
  });
  try {
    if (only !== 'student') await captureAdmin(browser);
    if (only !== 'admin') await captureStudent(browser);
  } finally {
    await browser.close();
  }
  console.log('\nDONE — screenshots in', OUT);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
