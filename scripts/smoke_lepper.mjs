// Smoke: (1) ANOVA module shows scenario banner + mission panel,
//        (2) PredictGate commit flow on Coin Flipper.
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

  // 1. ANOVA: scenario banner + mission panel
  await page.goto('http://localhost:3000/?demo=1', { waitUntil: 'networkidle' });
  await page.getByText('ANOVA Analysis', { exact: false }).first().click();
  await page.waitForTimeout(2000);
  await page.getByText('Sandbox Mode', { exact: false }).first().click(); // mission mode on
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'scripts/smoke_lepper_anova.png' });
  console.log('SAVED smoke_lepper_anova.png');

  // 2. Coin Flipper: PredictGate commit
  await page.goto('http://localhost:3000/?demo=1', { waitUntil: 'networkidle' });
  await page.getByText('The Coin Flipper', { exact: false }).first().click();
  await page.waitForTimeout(1500);
  await page.getByRole('radio').nth(1).click();
  await page.getByText('Lock in my prediction', { exact: false }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scripts/smoke_lepper_coin.png' });
  console.log('SAVED smoke_lepper_coin.png');

  console.log('PAGE_ERRORS', JSON.stringify(errors.slice(0, 10)));
  await browser.close();
} finally {
  try { spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { shell: true }); } catch { }
}
