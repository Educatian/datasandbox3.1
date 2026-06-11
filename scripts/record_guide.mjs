// Records the guided-tour screencast with a visible synthetic cursor that
// glides between UI targets. Emits SCENE timestamps (ms from video start)
// on stdout so narration can be aligned afterwards.
//
//   node scripts/record_guide.mjs
//   -> scripts/guide_assets/raw_video/*.webm + scene_times.json
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, renameSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT_DIR = 'scripts/guide_assets';
mkdirSync(`${OUT_DIR}/raw_video`, { recursive: true });

const child = spawn('npm', ['run', 'dev'], { shell: true, cwd: process.cwd() });
const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://localhost:3000/')).ok) return; } catch { }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
};

const CURSOR_INIT = `
  const c = document.createElement('div');
  c.id = '__tourCursor';
  c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;border-radius:50%;border:3px solid #f59e0b;background:rgba(245,158,11,.25);z-index:999999;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 14px rgba(245,158,11,.8);transition:none;';
  document.documentElement.appendChild(c);
  window.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  window.addEventListener('mousedown', () => {
    c.style.background = 'rgba(245,158,11,.7)'; c.style.width = '34px'; c.style.height = '34px';
    setTimeout(() => { c.style.background = 'rgba(245,158,11,.25)'; c.style.width = '26px'; c.style.height = '26px'; }, 220);
  }, true);
`;

try {
  await waitForServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: `${OUT_DIR}/raw_video`, size: { width: 1280, height: 720 } },
  });
  await context.addInitScript(CURSOR_INIT);
  const page = await context.newPage();

  const t0 = Date.now();
  const scenes = [];
  const scene = (name) => { const ms = Date.now() - t0; scenes.push({ name, ms }); console.log('SCENE', name, ms); };

  const glideTo = async (locator) => {
    const box = await locator.boundingBox();
    if (!box) return;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 35 });
  };
  const glideClick = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await glideTo(locator);
    await page.waitForTimeout(350);
    await locator.click();
  };

  // --- Scene 1: Landing ---
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.mouse.move(640, 360);
  scene('landing');
  await page.waitForTimeout(2500);
  await glideTo(page.getByText('50+ hands-on simulations'));
  await page.waitForTimeout(1500);
  await glideTo(page.getByText('Dr. Gem, Socratic AI tutor'));
  await page.waitForTimeout(1500);

  // --- Scene 2: Enter demo / portal ---
  scene('portal');
  await glideClick(page.getByText('Try the demo', { exact: false }));
  await page.waitForTimeout(2500);
  // dismiss the onboarding tour if it appears
  const skip = page.getByText('Skip', { exact: true });
  if (await skip.isVisible().catch(() => false)) {
    await glideClick(skip);
    await page.waitForTimeout(600);
  }
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(1600);
  await page.mouse.wheel(0, -350);
  await page.waitForTimeout(1000);

  // --- Scene 3: Galton Board + PredictGate ---
  scene('predict');
  await glideClick(page.getByText('The Galton Board', { exact: false }).first());
  await page.waitForTimeout(2200);
  await glideClick(page.getByRole('radio').nth(1));
  await page.waitForTimeout(900);
  const slider = page.getByLabel('Confidence in your prediction');
  if (await slider.isVisible().catch(() => false)) {
    await glideTo(slider);
    await slider.fill('75');
    await page.waitForTimeout(700);
  }
  await glideClick(page.getByText('Lock in my prediction', { exact: false }));
  await page.waitForTimeout(1500);

  // --- Scene 4: run the simulation, then reveal ---
  scene('observe');
  await glideClick(page.getByText('Stream Balls', { exact: false }));
  await page.waitForTimeout(6500);
  await glideClick(page.getByText("I've experimented", { exact: false }));
  await page.waitForTimeout(2800);

  // --- Scene 5: Dart Board missions ---
  scene('missions');
  await glideClick(page.getByText('Back to Portal', { exact: false }).first());
  await page.waitForTimeout(1500);
  await glideClick(page.getByText('The Dart Board', { exact: false }).first());
  await page.waitForTimeout(2000);
  await glideClick(page.getByRole('radio').first());
  await page.waitForTimeout(600);
  await glideClick(page.getByText('Lock in my prediction', { exact: false }));
  await page.waitForTimeout(1200);
  const missionToggle = page.getByText('Sandbox Mode', { exact: false }).first();
  if (await missionToggle.isVisible().catch(() => false)) {
    await glideClick(missionToggle);
    await page.waitForTimeout(2500);
  }

  // --- Scene 6: outro on portal ---
  scene('outro');
  await glideClick(page.getByText('Back to Portal', { exact: false }).first());
  await page.waitForTimeout(3000);
  scene('end');

  await context.close(); // flushes the video
  await browser.close();

  // Rename the produced video deterministically
  const vids = readdirSync(`${OUT_DIR}/raw_video`).filter(f => f.endsWith('.webm'));
  if (vids.length) renameSync(`${OUT_DIR}/raw_video/${vids[0]}`, `${OUT_DIR}/tour_raw.webm`);
  writeFileSync(`${OUT_DIR}/scene_times.json`, JSON.stringify(scenes, null, 2));
  console.log('DONE scenes:', JSON.stringify(scenes));
} finally {
  try { spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { shell: true }); } catch { }
}
