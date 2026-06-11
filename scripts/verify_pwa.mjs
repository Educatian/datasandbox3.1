// Verifies PWA installability signals + phone-viewport rendering on the LIVE site.
import { chromium, devices } from 'playwright';

const BASE = 'https://datasandbox-36k.pages.dev';
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();

await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? { scope: reg.scope, active: !!reg.active } : null;
});
console.log('SW_REGISTRATION', JSON.stringify(sw));

const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return null;
  const res = await fetch(link.href);
  const m = await res.json();
  return { name: m.name, display: m.display, icons: m.icons?.length, start_url: m.start_url };
});
console.log('MANIFEST', JSON.stringify(manifest));

// dismiss tour if present, then phone screenshots
const skip = page.getByText('Skip', { exact: true });
if (await skip.isVisible().catch(() => false)) { await skip.click(); await page.waitForTimeout(500); }
await page.screenshot({ path: 'scripts/snap_phone_portal.png' });
await page.getByText('The Galton Board', { exact: false }).first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: 'scripts/snap_phone_module.png' });
console.log('SCREENSHOTS_SAVED');

await browser.close();
