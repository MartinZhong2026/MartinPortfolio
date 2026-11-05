import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const paths = ['/', '/about/', '/work/', '/life/', ...['adapt-to-china', 'meetfolio', 'abtrace', 'supplier-document-intelligence', 'fanscope'].map(s => `/work/${s}/`), '/404'];
const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
await mkdir('test-results/bilingual', { recursive: true });
try {
  for (const width of [320, 390, 820, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, hasTouch: width < 500, isMobile: width < 500, reducedMotion: 'reduce', locale: 'zh-CN' });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(90000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    for (const prefix of ['', '/zh']) for (const path of paths) {
      await page.goto(origin + prefix + path + (path === '/' ? '?pool=static' : ''), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('html').getAttribute('lang'), prefix ? 'zh-Hans' : 'en');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow: ${prefix}${path} at ${width}`);
      const controls = await page.locator('.site-header a').evaluateAll(els => els.map(el => {
        const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, text: el.textContent };
      }));
      for (const [i, a] of controls.entries()) {
        assert(a.x >= 0 && a.right <= width + 1, `Header offscreen: ${a.text} at ${width}`);
        for (const b of controls.slice(i + 1)) assert(!(a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y), `Header overlap: ${a.text}/${b.text} at ${width}`);
      }
      if (path === '/') assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), `Home scrolls: ${prefix} ${width}`);
      const target = prefix ? 'en' : 'zh';
      const switchLink = page.locator(`[data-language="${target}"]`);
      assert.equal(await switchLink.getAttribute('href'), (prefix ? '' : '/zh') + path + (path === '/' ? '?pool=static' : ''));
      // Exercise the actual switch on every document, not only its href.
      await switchLink.click();
      await page.waitForURL(origin + (prefix ? '' : '/zh') + path + (path === '/' ? '?pool=static' : ''));
      assert.equal(await page.locator('html').getAttribute('lang'), prefix ? 'en' : 'zh-Hans');
    }
    assert.deepEqual(errors, [], `Console/hydration errors at ${width}`);
    results.push({ width, pages: paths.length * 2, switches: paths.length * 2 });
    await context.close();
    console.log(`✓ Both languages at ${width}px: 20 pages, every switch, header bounds and Home height`);
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'zh-CN' });
  const page = await context.newPage();
  // Browser language must never select Chinese for a new visitor.
  await page.goto(origin + '/?pool=static', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.goto(origin + '/work/#main', { waitUntil: 'networkidle' });
  await page.locator('[data-filter="client"]').click();
  assert.equal(await page.locator('[data-language="zh"]').getAttribute('href'), '/zh/work/?filter=client#main');
  await page.locator('[data-language="zh"]').click();
  await page.waitForURL(origin + '/zh/work/?filter=client#main');
  assert.equal(await page.locator('[data-filter-count]').textContent(), '2 个项目');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hans');
  await page.locator('.nav a[href="/zh/about/"]').click();
  await page.waitForURL(origin + '/zh/about/');
  await page.goBack({ waitUntil: 'networkidle' });
  assert.equal(new URL(page.url()).pathname, '/zh/work/');
  await page.goForward({ waitUntil: 'networkidle' });
  assert.equal(new URL(page.url()).pathname, '/zh/about/');
  await page.goto(origin + '/work/meetfolio/', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Direct English URL stays English despite saved Chinese preference');
  await page.goto('about:blank');
  await page.goto(origin + '/?pool=static', { waitUntil: 'networkidle' });
  await page.waitForURL(origin + '/zh/?pool=static');
  await page.locator('[data-language="en"]').click();
  await page.waitForURL(origin + '/?pool=static');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  for (const [path, expected] of [['/zh/#contact', '/zh/about/#contact'], ['/zh/#projects', '/zh/work/'], ['/zh/#outside', '/zh/life/'], ['/zh/about/#outside', '/zh/life/'], ['/zh/contact', '/zh/about/#contact'], ['/contact', '/about/#contact']]) {
    await page.goto(origin + path, { waitUntil: 'networkidle' });
    await page.waitForURL(origin + expected);
  }
  for (const prefix of ['', '/zh']) {
    const response = await page.goto(origin + prefix + '/does-not-exist', { waitUntil: 'networkidle' });
    assert.equal(response.status(), 404);
    assert.equal(await page.locator('html').getAttribute('lang'), prefix ? 'zh-Hans' : 'en');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex');
  }
  await context.close();
  // All static pages and pool destinations work without JavaScript or storage.
  const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await nojs.newPage();
  for (const prefix of ['', '/zh']) {
    await staticPage.goto(origin + prefix + '/');
    assert.equal(await staticPage.locator('.pool__objects a').count(), 7);
    for (const [place, top] of [['about', '-13px'], ['life', '-11px']]) {
      assert.equal(await staticPage.locator(`.pool__objects a[href="${prefix}/${place}/"] .pool-obj__label`).evaluate(el => getComputedStyle(el).top), top, `Static ${prefix}/${place} label placement`);
    }
    await staticPage.locator(`[data-language="${prefix ? 'en' : 'zh'}"]`).click();
    assert.equal(new URL(staticPage.url()).pathname, prefix ? '/' : '/zh/');
  }
  await nojs.close();
  const blocked = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await blocked.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) { return /webgl/.test(kind) ? null : get.call(this, kind, ...args); };
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
  });
  const fallback = await blocked.newPage();
  await fallback.goto(origin + '/zh/', { waitUntil: 'networkidle' });
  await fallback.waitForFunction(() => document.documentElement.dataset.pool === 'unsupported');
  assert((await fallback.locator('.pool__status').textContent()).includes('这台设备'));
  await fallback.locator('[data-language="en"]').click();
  await fallback.waitForURL(origin + '/');
  assert.equal(await fallback.locator('html').getAttribute('lang'), 'en');
  await blocked.close();
  await writeFile('test-results/bilingual/results.json', JSON.stringify(results, null, 2));
  console.log('✓ English first visit, saved preference, deep links, query/hash, filters, refresh, Back/Forward, legacy links, localized 404, no-JS, denied storage and no-WebGL fallback');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
