// Quick visual smoke check: boots vite dev, opens ?demo=1, saves a screenshot.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 3000;
const child = spawn('npm', ['run', 'dev'], { shell: true, cwd: process.cwd() });
child.stdout.on('data', d => process.stdout.write(d));

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) return;
    } catch { }
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
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/?demo=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const out = process.argv[2] || 'scripts/smoke.png';
  await page.screenshot({ path: out, fullPage: false });
  console.log('SCREENSHOT_SAVED', out);

  // Optional: click into a module by visible title and screenshot it too.
  const moduleTitle = process.argv[3];
  if (moduleTitle) {
    await page.getByText(moduleTitle, { exact: false }).first().click();
    await page.waitForTimeout(2500);
    const out2 = out.replace(/\.png$/, '_module.png');
    await page.screenshot({ path: out2, fullPage: false });
    console.log('SCREENSHOT_SAVED', out2);
  }

  console.log('PAGE_ERRORS', JSON.stringify(errors.slice(0, 10)));
  await browser.close();
} finally {
  try { spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { shell: true }); } catch { }
}
