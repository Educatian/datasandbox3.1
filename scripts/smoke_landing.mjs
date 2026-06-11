// Smoke: landing page (no demo param -> LoginPage) + loading screen capture.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const child = spawn('npm', ['run', 'dev'], { shell: true, cwd: process.cwd() });
const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://localhost:3000/')).ok) return; } catch { }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
};

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'scripts/smoke_landing.png' });
  console.log('SAVED smoke_landing.png');
  console.log('PAGE_ERRORS', JSON.stringify(errors.slice(0, 10)));
  await browser.close();
} finally {
  try { spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { shell: true }); } catch { }
}
