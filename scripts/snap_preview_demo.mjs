// Screenshot the production preview server's public demo mode (port 4173).
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:4173/?demo=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'scripts/snap_demo_prod.png', fullPage: true });
console.log('SAVED scripts/snap_demo_prod.png');
console.log('PAGE_ERRORS', JSON.stringify(errors.slice(0, 10)));
await browser.close();
