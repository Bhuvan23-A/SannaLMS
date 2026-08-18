const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GUIDE = 'file:///' + path.join(__dirname, 'SannaLMS-User-Guide.html').replace(/\\/g, '/');
const PDF = path.join(__dirname, 'SannaLMS-User-Guide.pdf');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  await page.goto(GUIDE, { waitUntil: 'networkidle0', timeout: 180000 });
  // Load lazy images before printing
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    for (const i of imgs) { i.loading = 'eager'; const s = i.src; i.src = ''; i.src = s; }
    await new Promise(r => setTimeout(r, 8000));
    window.scrollTo(0, 0);
  });
  await page.pdf({
    path: PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
    timeout: 300000,
  });
  await browser.close();
  console.log('Wrote', PDF, (fs.statSync(PDF).size / 1024 / 1024).toFixed(1) + ' MB');
})().catch(e => { console.error('FATAL', e); process.exit(1); });

const fs = require('fs');
