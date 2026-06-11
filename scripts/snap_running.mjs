// Screenshot a page on the ALREADY-RUNNING dev server (port 3000).
// Usage: node scripts/snap_running.mjs <path> <outfile>
import { chromium } from 'playwright';

const path = process.argv[2] || '/';
const out = process.argv[3] || 'scripts/snap.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: out });
console.log('SAVED', out);
await browser.close();
