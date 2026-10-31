// Checks the phone composition while the pool is moving: steps it through a long
// run and, on every sampled frame, measures labels, floats, toys, the name and the
// call to action against each other. Then taps every project. Run `npm run build` first.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const has = (flag) => process.argv.includes(flag);
const args = has('--gpu') ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const sizes = [[320, 568], [320, 700], [360, 740], [375, 812], [390, 844], [412, 915], [430, 932]];
const dprs = has('--gpu') ? [1, 2, 3] : [2];
const samples = has('--gpu') ? 40 : 10;

/** Runs in the page: every sample, returns every overlap it can find. */
async function inspect({ samples }) {
  const pool = window.__pool;
  const bad = new Set();
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const near = (box, c, shrink) => {
    const dx = Math.max(box.x - c.x, 0, c.x - box.x - box.w), dy = Math.max(box.y - c.y, 0, c.y - box.y - box.h);
    return Math.hypot(dx, dy) < c.r * shrink;
  };
  let gap = Infinity, smallest = Infinity;
  for (let s = 0; s < samples; s++) {
    for (let i = 0; i < 12; i++) pool.step(1 / 30);
    const canvas = document.querySelector('.pool__canvas').getBoundingClientRect();
    const items = [...document.querySelectorAll('.pool-obj')].map((el) => {
      const r = el.getBoundingClientRect(), l = el.querySelector('.pool-obj__label').getBoundingClientRect();
      return { name: el.getAttribute('href'), float: { x: r.x, y: r.y, r: parseFloat(el.style.getPropertyValue('--r')) }, label: { x: l.x, y: l.y, w: l.width, h: l.height } };
    });
    const toys = pool.toys().map((t) => ({ x: t.x + canvas.left, y: t.y + canvas.top, r: t.r }));
    const b = document.querySelector('.pool__cta').getBoundingClientRect();
    const cta = { x: b.x, y: b.y, w: b.width, h: b.height };
    const f = document.querySelector('.pool__frame').getBoundingClientRect();
    // The name and tagline on the floor, from where they are printed in the world.
    const nw = pool.project(-0.37, 0.72), se = pool.project(0.05, -0.72);
    const name = { x: nw.x + canvas.left, y: nw.y + canvas.top, w: se.x - nw.x, h: se.y - nw.y };
    for (const [i, a] of items.entries()) {
      smallest = Math.min(smallest, a.float.r * 2);
      if (a.label.x < f.x || a.label.x + a.label.w > f.right) bad.add(`label off the water: ${a.name}`);
      if (hit(a.label, cta)) bad.add(`label on CTA: ${a.name}`);
      if (hit(a.label, name)) bad.add(`label on name: ${a.name}`);
      if (near(cta, a.float, 0.85)) bad.add(`CTA on float: ${a.name}`);
      if (near(name, a.float, 0.8)) bad.add(`float on name: ${a.name}`);
      for (const [j, c] of items.entries()) {
        if (j <= i) continue;
        if (hit(a.label, c.label)) bad.add(`labels overlap: ${a.name} / ${c.name}`);
        if (Math.hypot(a.float.x - c.float.x, a.float.y - c.float.y) < (a.float.r + c.float.r) * 0.85) bad.add(`floats overlap: ${a.name} / ${c.name}`);
      }
      for (const [j, c] of items.entries()) if (j !== i && near(a.label, c.float, 0.85)) bad.add(`label on another float: ${a.name} on ${c.name}`);
      // Still reads as its own: the label touches or nearly touches its float.
      const dx = Math.max(a.label.x - a.float.x, 0, a.float.x - a.label.x - a.label.w), dy = Math.max(a.label.y - a.float.y, 0, a.float.y - a.label.y - a.label.h);
      gap = Math.min(gap, -Math.hypot(dx, dy) + a.float.r + 14);
      if (Math.hypot(dx, dy) > a.float.r + 14) bad.add(`label drifted from its float: ${a.name}`);
      for (const [t, toy] of toys.entries()) {
        if (near(a.label, toy, 0.9)) bad.add(`toy ${t} on label: ${a.name}`);
        if (Math.hypot(a.float.x - toy.x, a.float.y - toy.y) < (a.float.r + toy.r) * 0.85) bad.add(`toy ${t} on float: ${a.name}`);
      }
    }
    // Planters stay on the deck, on screen, and clear of the navigation and the ladder.
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const nav = box(document.querySelector('.site-header nav')), brand = box(document.querySelector('.brand'));
    const water = { x: f.x, y: f.y, w: f.width, h: f.height };
    const ladder = (() => { const a = pool.project(-1.6, -0.87), b = pool.project(-1.6, -0.46); return { x: Math.min(a.x, b.x) + canvas.left, y: a.y + canvas.top - 34, w: Math.abs(a.x - b.x), h: 70 }; })();
    for (const [p, plant] of pool.plants().entries()) {
      const c = { x: plant.x + canvas.left, y: plant.y + canvas.top, r: plant.r };
      if (near(nav, c, 0.72)) bad.add(`plant ${p} on navigation`);
      if (near(brand, c, 0.72)) bad.add(`plant ${p} on brand`);
      if (near(ladder, c, 0.72)) bad.add(`plant ${p} on ladder`);
      if (hit({ x: c.x - 1, y: c.y - 1, w: 2, h: 2 }, water)) bad.add(`plant ${p} in the water`);
      if (c.x - c.r * 0.72 < 0 || c.x + c.r * 0.72 > innerWidth) bad.add(`plant ${p} cut by the screen edge`);
    }
    for (const [t, toy] of toys.entries()) {
      if (near(cta, toy, 0.9)) bad.add(`toy ${t} on CTA`);
      if (near(name, toy, 0.75)) bad.add(`toy ${t} on name`);
    }
  }
  return { bad: [...bad], smallest };
}

await mkdir('test-results/mobile', { recursive: true });
const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args });
let failed = 0;
try {
  for (const dpr of dprs) for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(`${origin}/?poolfx=probe`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.pool === 'live' && window.__pool, null, { timeout: 120000 });
    // Phones must never use the mesh caustic map: see docs/INCIDENTS.md.
    assert.equal(await page.evaluate(() => window.__pool.usesCausticMap), false, 'Touch devices must use analytic caustics');
    const { bad, smallest } = await page.evaluate(inspect, { samples });
    await page.screenshot({ path: `test-results/mobile/${width}x${height}@${dpr}.png` });
    console.log(`${bad.length ? 'FAIL' : 'pass'} ${width}x${height} @${dpr}  smallest float ${smallest.toFixed(0)}px${bad.length ? '\n     ' + bad.join('\n     ') : ''}`);
    failed += bad.length ? 1 : 0;
    await context.close();
  }
  // Drag a finger hard across the floats, then measure again: nothing may be shoved out of place.
  {
    const context = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(`${origin}/?poolfx=probe`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.pool === 'live' && window.__pool, null, { timeout: 120000 });
    await page.waitForTimeout(600);
    const box = await page.locator('.pool__frame').boundingBox();
    const cdp = await context.newCDPSession(page);
    for (const row of [0.14, 0.33, 0.7, 0.86]) {
      const y = box.y + box.height * row;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 10, y }] });
      for (let i = 1; i <= 14; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 10 + ((box.width - 20) * i) / 14, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    const { bad } = await page.evaluate(inspect, { samples: 12 });
    console.log(`${bad.length ? 'FAIL' : 'pass'} after dragging across every row${bad.length ? '\n     ' + bad.join('\n     ') : ''}`);
    failed += bad.length ? 1 : 0;
    await context.close();
  }
  // Tap every project with a real touch, in the running pool.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const links = ['/work/adapt-to-china/', '/work/meetfolio/', '/work/abtrace/', '/work/supplier-document-intelligence/', '/work/fanscope/', '/about/', '/life/'];
  for (const href of links) for (const part of ['float', 'label']) {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.pool === 'live', null, { timeout: 120000 });
    await page.waitForTimeout(800);
    const p = await page.locator(`.pool__objects a[href="${href}"]`).evaluate((el, part) => {
      const r = part === 'float' ? el.getBoundingClientRect() : el.querySelector('.pool-obj__label').getBoundingClientRect();
      return part === 'float' ? { x: r.x, y: r.y } : { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, part);
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForURL(`**${href}`, { timeout: 30000 });
  }
  console.log(`pass taps: ${links.length} destinations, on the float and on its label`);
  await context.close();
  assert.equal(failed, 0, `${failed} viewport(s) had overlaps`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
process.exit(0);
