// scripts/playtest.mjs — headless smoke playtest for the dev server.
// Usage:
//   node scripts/playtest.mjs            # walk nav views
//   node scripts/playtest.mjs stages     # admin-unlock + walk all 24 3D stages
//   node scripts/playtest.mjs [mode] http://localhost:8888/
// Requires: `playwright` (devDep) + chromium shell (`npx playwright install chromium`).
// Notes: headless uses SOFTWARE WebGL (no GPU) — perf warnings, emoji tofu, and the
// occasional slow/black 3D first-paint are ENV artifacts; confirm suspected 3D bugs in real Chrome.
import { chromium } from 'playwright';
import fs from 'fs';

const MODE = (process.argv[2] && !process.argv[2].startsWith('http')) ? process.argv[2] : 'nav';
const URL = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:8888/';
const OUT = 'scratch/shots';
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e?.message || e)));
page.on('dialog', async (d) => { try { await d.accept('12345'); } catch { /* */ } });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const dismissModal = async () => { try { await page.getByText('Maybe Later', { exact: false }).first().click({ timeout: 2500 }); } catch { /* */ } };

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await dismissModal();
  await page.waitForTimeout(400);

  if (MODE === 'stages') {
    try { await page.getByRole('button', { name: /Admin/i }).first().click({ timeout: 2500 }); } catch { /* */ }
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /3D Math Quest/i }).first().click({ timeout: 4000 });
    await page.waitForTimeout(6000);
    const select = page.locator('select').first();
    const has = await select.count();
    for (let n = 1; n <= 24; n++) {
      if (has) { try { await select.selectOption({ index: n - 1 }); } catch { /* */ } }
      await page.waitForTimeout(2000);
      await shot(`q-stage${String(n).padStart(2, '0')}`);
      process.stdout.write(`  stage ${n} (errs ${errors.length})\n`);
    }
  } else {
    await shot('01-dashboard');
    const views = ['3D Math Quest', 'Run Game', 'Sandbox', 'Practice Lab', 'My Hero', 'Shop'];
    let i = 2;
    for (const v of views) {
      try { await page.getByRole('button', { name: new RegExp(v, 'i') }).first().click({ timeout: 3000 }); } catch { /* */ }
      await page.waitForTimeout(3000);
      await shot(`${String(i++).padStart(2, '0')}-${v.replace(/[^a-z0-9]+/gi, '_')}`);
      console.log(`  nav "${v}" (errs ${errors.length})`);
    }
  }
} catch (e) {
  console.log('HARNESS ERROR:', e.message);
} finally {
  await browser.close();
  console.log(`\n=== ${MODE} playtest: ${errors.length} console/page errors ===`);
  [...new Set(errors)].slice(0, 40).forEach((e) => console.log(' •', e));
}
