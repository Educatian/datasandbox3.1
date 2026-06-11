// Self-contained Playwright screencast of Data Sandbox sim modules.
// Launches the vite dev server, opens each module with ?demo=1 (local auth bypass),
// performs generic interactions to capture motion, records a .webm + full-page .png,
// then shuts the server down. LOCAL ONLY — nothing is committed or deployed.
//
// Run from the repo root after deps are installed:
//   npm install && npm i -D playwright && npx playwright install chromium && node run_screencast.mjs

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'C:/Users/jewoo/Desktop/iLRN2026_presentations/177_DataSandbox/assets/screencast';
const VIDEO_TMP = path.join(OUT, '_tmp_video');
const VIEW = { width: 1600, height: 1000 };

const MODULES = [
  { id: 'portal',          title: null },                         // CurriculumView grid
  { id: 'dart-board',      title: 'The Dart Board' },             // SD / variability
  { id: 'god-mode',        title: 'The God Mode Switch' },        // observational vs experimental
  { id: 'galton-board',    title: 'The Galton Board' },           // CLT / normal curve
  { id: 'balance-beam',    title: 'The Balance Beam' },           // mean vs median
  { id: 'coin-flipper',    title: 'The Coin Flipper' },           // p-values
  { id: 'p-hacking',       title: 'The P-Hacking Fisher' },       // multiple comparisons
  { id: 'sample-pumper',   title: 'The Sample Size Pumper' },     // sampling dist / SE
  { id: 'effect-magnifier',title: 'The Effect Size Magnifier' },  // effect size
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stripAnsi = (s) => s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

async function probe(url) {
  try { const r = await fetch(url, { method: 'GET' }); return r.status < 500; }
  catch { return false; }
}

async function startDevServer() {
  console.log('> starting vite dev server (npm run dev)...');
  const child = spawn('npm', ['run', 'dev'], { shell: true, cwd: process.cwd() });
  let port = null;
  child.stdout.on('data', (d) => {
    const s = stripAnsi(d.toString());           // vite colorizes its URL; strip ANSI first
    process.stdout.write('[vite] ' + s);
    const m = s.match(/localhost:(\d+)/i) || s.match(/127\.0\.0\.1:(\d+)/i);
    if (m && !port) port = m[1];
  });
  child.stderr.on('data', (d) => process.stderr.write('[vite!] ' + stripAnsi(d.toString())));
  // wait briefly for the port to be printed, then probe candidates until one answers
  for (let i = 0; i < 24 && !port; i++) await sleep(500);
  const candidates = [];
  if (port) candidates.push(`http://localhost:${port}`);
  for (const p of [3000, 5173, 4173, 5174, 8080]) candidates.push(`http://localhost:${p}`);
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    for (const url of candidates) {
      if (await probe(url)) { console.log('> dev base =', url); return { child, base: url }; }
    }
    await sleep(800);
  }
  throw new Error('dev server did not become reachable (tried: ' + candidates.join(', ') + ')');
}

async function interact(page) {
  // 1) sweep up to two range sliders across their range
  const sliders = await page.$$('input[type=range]');
  for (const s of sliders.slice(0, 2)) {
    try {
      await s.scrollIntoViewIfNeeded();
      await s.focus();
      for (let k = 0; k < 14; k++) { await page.keyboard.press('ArrowRight'); await sleep(110); }
      for (let k = 0; k < 8; k++) { await page.keyboard.press('ArrowLeft'); await sleep(110); }
    } catch { /* keep going */ }
  }
  // 2) click action buttons that drive the simulation
  const re = /throw|flip|drop|run|start|toggle|experiment|observation|generate|sample|spin|add|shuffle|reset|fish|ball|roll|simulate|\bgo\b|play|pump|next/i;
  const buttons = await page.$$('button');
  let used = 0;
  for (const b of buttons) {
    if (used >= 5) break;
    let t = '';
    try { t = (await b.innerText()) || ''; } catch { /* ignore */ }
    if (re.test(t)) {
      for (let k = 0; k < 4; k++) { try { await b.click({ timeout: 800 }); } catch { /* ignore */ } await sleep(450); }
      used++;
    }
  }
  // 3) click inside a LARGE canvas in the content area only.
  //    (Do NOT click <svg> — the first svg on a module page is the fixed
  //     top-right logout icon; clicking it signs out and drops ?demo=1.)
  const canvases = await page.$$('canvas');
  for (const c of canvases) {
    let box = null;
    try { box = await c.boundingBox(); } catch { /* ignore */ }
    if (box && box.width > 150 && box.height > 150 && box.y > 90) {
      for (let k = 0; k < 8; k++) {
        await page.mouse.click(box.x + box.width * (0.3 + 0.4 * Math.random()),
                               box.y + box.height * (0.3 + 0.4 * Math.random()));
        await sleep(320);
      }
      break;
    }
  }
}

async function captureModule(browser, base, mod) {
  const context = await browser.newContext({
    viewport: VIEW,
    recordVideo: { dir: VIDEO_TMP, size: VIEW },
  });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + (e && e.message ? e.message : String(e))));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const video = page.video();
  let status = 'ok';
  try {
    await page.goto(base + '/?demo=1', { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(900);
    if (mod.id === 'portal') {
      const diag = await page.evaluate(() => {
        const root = document.getElementById('root') || document.body;
        return { len: (document.body && document.body.innerText || '').length, html: root.innerHTML.slice(0, 220) };
      }).catch(() => ({ len: -1, html: '' }));
      console.log('  [diag] bodyTextLen=', diag.len, '| rootHTML:', diag.html.replace(/\s+/g, ' '));
    }
    // portal must render (auth bypassed) — wait for a known module title
    await page.waitForSelector('text=The Dart Board', { timeout: 15000 }).catch(() => {});
    await sleep(1200);

    if (mod.id === 'portal') {
      // pan the curriculum grid for ambient motion
      for (let y = 0; y < 1600; y += 350) { await page.mouse.wheel(0, 350); await sleep(700); }
      await page.mouse.wheel(0, -1600); await sleep(600);
    } else {
      // enter the module by clicking its card (button contains the title)
      const card = page.locator('button', { hasText: mod.title }).first();
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await card.click({ timeout: 8000 });
      await sleep(1500);
      await interact(page);
      await sleep(1200);
    }
    await page.screenshot({ path: path.join(OUT, mod.id + '.png'), fullPage: true });
  } catch (e) {
    status = 'PARTIAL: ' + (e && e.message ? e.message.split('\n')[0] : e);
    try { await page.screenshot({ path: path.join(OUT, mod.id + '.png') }); } catch {}
  }
  await context.close(); // flush video
  try {
    const vp = await video.path();
    const dest = path.join(OUT, mod.id + '.webm');
    fs.copyFileSync(vp, dest);
    fs.rmSync(vp, { force: true });
  } catch (e) { status += ' (no-video)'; }
  console.log(`  - ${mod.id}: ${status}${errs.length ? ' | ERR ' + errs.slice(0, 2).join(' || ').slice(0, 300) : ''}`);
  return status;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(VIDEO_TMP, { recursive: true });
  const { child, base } = await startDevServer();
  const browser = await chromium.launch();
  const results = [];
  for (const mod of MODULES) {
    results.push([mod.id, await captureModule(browser, base, mod)]);
  }
  await browser.close();
  try { child.kill(); } catch {}
  try { spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { shell: true }); } catch {}
  try { fs.rmdirSync(VIDEO_TMP, { recursive: true }); } catch {}

  console.log('\n=== SCREENCAST SUMMARY ===');
  console.log('output dir:', OUT);
  for (const [id, st] of results) console.log(`  ${id.padEnd(18)} ${st}`);
  const files = fs.readdirSync(OUT).filter(f => /\.(webm|png)$/.test(f));
  console.log('files:', files.length);
  for (const f of files) {
    const sz = fs.statSync(path.join(OUT, f)).size;
    console.log(`  ${f.padEnd(26)} ${(sz/1024).toFixed(0)} KB`);
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
