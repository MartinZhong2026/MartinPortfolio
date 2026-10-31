// Measures temporal flicker in the live pool: steps it one exact frame at a time,
// reads the pixels back, and finds bright marks that appear between two frames.
// Reports how long they are and which way they run, so a streak can be told from
// ordinary shimmer. Run `npm run build` first.
//   node scripts/flicker.mjs                     every effect on, then each one off
//   node scripts/flicker.mjs --only base         one run (base or a no-* switch)
//   node scripts/flicker.mjs --fps 30 --stir     as a slow phone, with a finger dragging
//   node scripts/flicker.mjs --frames 240 --software --out test-results/flicker
//   node scripts/flicker.mjs --desktop           1440x900 with a mouse
//   node scripts/flicker.mjs --reduced           with prefers-reduced-motion
//   node scripts/flicker.mjs --webkit            in WebKit (npx playwright install webkit)
//   node scripts/flicker.mjs --gate              exit 1 if diagonal streaks return
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { startServer } from './serve.mjs';

const arg = (flag, fallback) => { const i = process.argv.indexOf(flag); return i < 0 ? fallback : process.argv[i + 1]; };
const has = (flag) => process.argv.includes(flag);
const frames = Number(arg('--frames', 240));
const out = arg('--out', 'test-results/flicker');
const only = arg('--only');
const runs = only ? [only] : ['base', 'no-caustics', 'no-glitter', 'no-fine', 'no-rings', 'no-leaf'];
const desktop = has('--desktop');
const viewport = desktop ? { width: 1440, height: 900 } : { width: Number(arg('--width', 390)), height: Number(arg('--height', 844)) };
const dpr = desktop ? 1 : Number(arg('--dpr', 3));
const fps = Number(arg('--fps', 60));
const stir = has('--stir');
const args = has('--software') ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--ignore-gpu-blocklist'];

/** Runs in the page. Steps frames and returns statistics about what changed. */
async function measure({ frames, dt, stir }) {
  // A fingertip dragging back and forth across the water, one drop a frame.
  const touch = (f) => {
    const s = (f * dt * 1.4) % 2;
    const along = (s < 1 ? s : 2 - s) * 2 - 1;
    pool.drop(along * 1.2, Math.sin(f * dt * 2) * 0.6, 0.075, 0.0066);
  };
  const pool = window.__pool;
  const gl = pool.renderer.getContext();
  let w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const frame = document.querySelector('.pool__frame').getBoundingClientRect();
  const canvas = document.querySelector('.pool__canvas').getBoundingClientRect();
  let k = w / canvas.width;
  // Water only: skip the page around the pool and a margin of the walls.
  let x0, y0, rw, rh, rgba, seen;
  const region = () => {
    w = gl.drawingBufferWidth; h = gl.drawingBufferHeight; k = w / canvas.width;
    x0 = Math.round((frame.left - canvas.left + frame.width * 0.08) * k);
    y0 = Math.round((frame.top - canvas.top + frame.height * 0.08) * k);
    rw = Math.round((frame.right - canvas.left - frame.width * 0.08) * k) - x0;
    rh = Math.round((frame.bottom - canvas.top - frame.height * 0.05) * k) - y0;
    rgba = new Uint8Array(w * h * 4);
    seen = new Int32Array(rw * rh);
  };
  region();
  const luma = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    const out = new Float32Array(rw * rh);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const i = ((h - 1 - (y + y0)) * w + x + x0) * 4; // readPixels is bottom-up
      out[y * rw + x] = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
    }
    return out;
  };
  for (let i = 0; i < 30; i++) pool.step(dt); // settle
  pool.step(dt);
  let prev = luma();
  const report = { worstLength: 0, worstAngle: 0, worstFrame: -1, streakFrames: 0, flashTotal: 0, meanDelta: 0, peakDelta: 0, diagonal: 0, resized: 0, tailDelta: 0 };
  let stamp = 0;
  let measured = 0;
  for (let f = 0; f < frames; f++) {
    if (stir) touch(f);
    pool.step(dt);
    // The engine may lower its resolution on a slow device. That is one step
    // change, not flicker: note it and carry on from the new size.
    if (gl.drawingBufferWidth !== w) {
      report.resized++;
      region();
      prev = luma();
      continue;
    }
    const now = luma();
    measured++;
    let sum = 0;
    for (let i = 0; i < now.length; i++) {
      const d = now[i] - prev[i];
      sum += Math.abs(d);
      if (d > report.peakDelta) report.peakDelta = d;
    }
    report.meanDelta += sum / now.length;
    if (f >= frames - 30) report.tailDelta += sum / now.length / 30;
    // Connected regions of pixels that jumped brighter in a single frame.
    stamp++;
    const stack = [];
    for (let start = 0; start < now.length; start++) {
      if (now[start] - prev[start] < 42 || seen[start] === stamp) continue;
      seen[start] = stamp;
      stack.push(start);
      let n = 0, sx = 0, sy = 0, xx = 0, yy = 0, xy = 0;
      while (stack.length) {
        const p = stack.pop(), x = p % rw, y = (p - x) / rw;
        n++; sx += x; sy += y; xx += x * x; yy += y * y; xy += x * y;
        for (const q of [p - 1, p + 1, p - rw, p + rw, p - rw - 1, p - rw + 1, p + rw - 1, p + rw + 1]) {
          if (q >= 0 && q < now.length && Math.abs((q % rw) - x) <= 1 && seen[q] !== stamp && now[q] - prev[q] >= 42) { seen[q] = stamp; stack.push(q); }
        }
      }
      report.flashTotal += n;
      if (n < 12) continue;
      const mx = sx / n, my = sy / n;
      const a = xx / n - mx * mx, b = xy / n - mx * my, c = yy / n - my * my;
      const root = Math.sqrt((a - c) ** 2 / 4 + b * b);
      const major = (a + c) / 2 + root, minor = Math.max((a + c) / 2 - root, 0.08);
      const length = Math.sqrt(12 * major) / k; // CSS px, as if a uniform bar
      const ratio = Math.sqrt(major / minor);
      if (ratio < 3 || length < 30) continue; // long and thin: a streak
      const angle = (0.5 * Math.atan2(2 * b, a - c) * 180) / Math.PI; // +45 runs upper-left to lower-right
      report.streakFrames++;
      if (angle > 15 && angle < 75) report.diagonal++;
      if (length > report.worstLength) { report.worstLength = length; report.worstAngle = angle; report.worstFrame = f; report.worstAt = [Math.round(((mx + x0) / k - (frame.left - canvas.left)) / frame.width * 100), Math.round(((my + y0) / k - (frame.top - canvas.top)) / frame.height * 100)]; }
    }
    prev = now;
  }
  report.meanDelta /= measured;
  return report;
}

await mkdir(out, { recursive: true });
const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = has('--webkit') ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, args });
const results = [];
try {
  for (const run of runs) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: !desktop, hasTouch: !desktop, reducedMotion: has('--reduced') ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    await page.goto(`${origin}/?poolfx=${run === 'base' ? 'probe' : run}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.pool === 'live' && window.__pool, null, { timeout: 90000 });
    const r = await page.evaluate(measure, { frames, dt: 1 / fps, stir });
    results.push({ run, ...r });
    console.log(`${run.padEnd(12)} streak marks ${String(r.streakFrames).padStart(4)}  on the diagonal ${String(r.diagonal).padStart(4)}  longest ${r.worstLength.toFixed(0).padStart(4)}px at ${r.worstAngle.toFixed(0).padStart(4)}deg (pool ${r.worstAt ?? '-'}%)  flash px ${String(r.flashTotal).padStart(7)}  mean change ${r.meanDelta.toFixed(2)}  last 30 ${r.tailDelta.toFixed(2)}  peak ${r.peakDelta.toFixed(0)}${r.resized ? '  resolution step' : ''}`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
await writeFile(`${out}/flicker-${viewport.width}.json`, JSON.stringify(results, null, 2));
// main, before the fix, gave 119 diagonal marks and a longest of 132px at 60 fps.
if (has('--gate') && results.some((r) => r.diagonal > 3 || r.worstLength > 80)) {
  console.error('Streaks are back: see docs/ARCHITECTURE.md, Caustics and flicker');
  process.exit(1);
}
process.exit(0);
