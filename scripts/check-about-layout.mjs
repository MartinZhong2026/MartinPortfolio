import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch({ headless: true });
  await mkdir('test-results/about-refresh', { recursive: true });
  for (const viewport of [{ width: 375, height: 812 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/about/', '/']) {
      await page.goto(origin + route, { waitUntil: 'networkidle' });
      const hero = page.locator('.about-v6__hero');
      await hero.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.querySelectorAll('.about-v6__hero img')].every(img => img.complete && img.naturalWidth > 0));
      const layout = await hero.evaluate(el => {
        const rect = selector => {
          const r = el.querySelector(selector).getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        return {
          heading: rect('#about-v6-title'), portrait: rect('.about-v6__hero-portrait'),
          image: rect('.about-v6__portrait-frame img'), statement: rect('.about-v6__statement'),
          education: rect('.about-v6__education-brief'), actions: rect('.about-v6__actions'),
          keywords: rect('.about-v6__keywords'), grid: rect('.about-v6__hero-grid'),
          contentWidth: el.querySelector('.about-v6__hero-grid').clientWidth - parseFloat(getComputedStyle(el.querySelector('.about-v6__hero-grid')).paddingLeft) - parseFloat(getComputedStyle(el.querySelector('.about-v6__hero-grid')).paddingRight),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      assert(!layout.overflow, `Horizontal overflow: ${route} ${viewport.width}`);
      assert.equal(await hero.locator('img').count(), 1);
      assert.equal(await hero.locator('.about-v6__education-entry').count(), 2);
      for (const text of ['First Prize Scholarship', 'Second Prize Scholarship']) assert(await hero.getByText(text, { exact: true }).isVisible());
      if (viewport.width <= 800) {
        const ordered = ['heading', 'portrait', 'statement', 'education', 'actions', 'keywords'];
        for (let i = 1; i < ordered.length; i++) assert(layout[ordered[i]].y >= layout[ordered[i - 1]].bottom - 1, `Reading order: ${ordered[i]} at ${route} ${viewport.width}`);
        const gap = layout.portrait.y - layout.heading.bottom;
        assert(gap >= 0 && gap <= 25, `Heading/portrait gap: ${gap}`);
        assert(Math.abs(layout.image.width - layout.contentWidth) < 1, 'Portrait must fill content width');
        assert(Math.abs(layout.image.width / layout.image.height - 2 / 3) < 0.01, 'Preserve full portrait aspect ratio');
      } else {
        assert(layout.portrait.x > layout.heading.right, 'Desktop portrait belongs in right column');
        assert(layout.statement.x < layout.portrait.x, 'Desktop introduction belongs in left column');
      }
      const name = route === '/' ? 'home' : 'about';
      await hero.evaluate(el => window.scrollTo(0, el.offsetTop));
      await page.screenshot({ path: `test-results/about-refresh/${name}-${viewport.width}-viewport.png` });
      await hero.screenshot({ path: `test-results/about-refresh/${name}-${viewport.width}-hero.png` });
      if (route === '/about/') {
        // Reveal the whole page before taking a full-page record.
        for (const section of await page.locator('[data-reveal]').all()) await section.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/about-refresh/about-${viewport.width}-full.png`, fullPage: true });
      }
      results.push({ route, viewport, layout });
    }
    assert.deepEqual(errors, [], `Browser errors at ${viewport.width}`);
    await page.close();
    console.log(`PASS: About + homepage at ${viewport.width} × ${viewport.height}, reading order, portrait, education, overflow and console`);
  }
  await writeFile('test-results/about-refresh/layout-results.json', JSON.stringify(results, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
