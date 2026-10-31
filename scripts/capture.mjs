// Screenshots of the built site in a real browser, for looking at what actually
// rendered. Writes to test-results/capture/. Usage:
//   node scripts/capture.mjs                  pool at desktop + mobile
//   node scripts/capture.mjs --pages          plus About, Work and Life
//   node scripts/capture.mjs --gpu            use the machine's GPU, not SwiftShader
//   node scripts/capture.mjs --out docs/v10   write somewhere else
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const has = (flag) => process.argv.includes(flag);
const arg = (flag, fallback) => { const i = process.argv.indexOf(flag); return i < 0 ? fallback : process.argv[i + 1]; };
const out = arg('--out', 'test-results/capture');
const software = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const gpu = ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];

const views = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180, touch: true },
  { name: 'mobile', width: 390, height: 844, touch: true, scale: 2 },
];

await mkdir(out, { recursive: true });
const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: has('--gpu') ? gpu : software });
try {
  for (const v of views) {
    const context = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale ?? 1, isMobile: !!v.touch, hasTouch: !!v.touch });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error(`[${v.name}] page error: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' || /THREE\.|WebGL/i.test(m.text())) console.error(`[${v.name}] ${m.text()}`); });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => ['live', 'unsupported'].includes(document.documentElement.dataset.pool), null, { timeout: 60000 });
    await page.waitForTimeout(3500);
    console.log(`${v.name}: pool ${await page.locator('html').getAttribute('data-pool')}`);
    await page.screenshot({ path: `${out}/pool-${v.name}.png` });
    if (has('--pages')) {
      for (const path of ['about', 'work', 'life']) {
        await page.goto(`${origin}/${path}/`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${out}/${path}-${v.name}.png`, fullPage: true });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
