/**
 * Resize + compress screenshots (width 1280, JPEG q80) so the HTML guide stays
 * small enough to share. Uses Chrome headless screenshot->jpeg via puppeteer.
 *
 * Usage: node optimize.js
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = path.join(__dirname, 'screenshots');
const OPT = path.join(__dirname, 'screenshots-opt');

(async () => {
  fs.mkdirSync(OPT, { recursive: true });
  const files = fs.readdirSync(SHOTS).filter(f => f.endsWith('.png'));
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  let total = 0;
  for (const f of files) {
    const src = path.join(SHOTS, f);
    const out = path.join(OPT, f.replace(/\.png$/, '.jpg'));
    const data = fs.readFileSync(src).toString('base64');
    await page.setContent(`<html><body style="margin:0"><img id="i" src="data:image/png;base64,${data}"/></body></html>`, { waitUntil: 'load' });
    const el = await page.$('#i');
    await el.screenshot({ path: out, type: 'jpeg', quality: 80 });
    total += fs.statSync(out).size;
  }
  await browser.close();
  console.log(`optimized ${files.length} screenshots -> ${(total / 1024 / 1024).toFixed(1)} MB total in ${OPT}`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
