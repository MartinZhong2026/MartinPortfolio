// Regenerates public/og.png from the real live pool (run `npm run build` first).
// Uses the machine's GPU; rerun after a visible change to the pool.
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const server = await startServer({ port: 0 });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '.site-header,.pool__bar{display:none!important}.pool{--fw:880px;min-height:630px}.pool__layout{grid-template-rows:0 minmax(var(--fh),1fr) 0}' });
  await page.waitForFunction(() => document.documentElement.dataset.pool === 'live', null, { timeout: 60000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'public/og.png' });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
