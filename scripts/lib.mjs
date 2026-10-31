// Build pipeline: esbuild bundles the client islands + CSS, and a Node bundle of
// the React pages renders every route to static HTML.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dist = join(root, 'dist');
const tmp = join(root, '.build');

const rel = (p) => '/' + p.replace(/\\/g, '/').split('/dist/').pop();

export async function buildSite({ dev = false, log = true } = {}) {
  const t0 = performance.now();
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  // 1) Client JS (code-split: three.js lands in its own lazy chunk)
  const client = await build({
    absWorkingDir: root,
    entryPoints: { home: 'src/client/home.tsx', site: 'src/client/site.ts' },
    bundle: true,
    splitting: true,
    format: 'esm',
    target: ['es2020', 'safari15'],
    outdir: join(dist, 'assets'),
    entryNames: '[name]-[hash]',
    chunkNames: 'chunks/[name]-[hash]',
    minify: !dev,
    sourcemap: dev ? 'inline' : false,
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production') },
    metafile: true,
    legalComments: 'linked',
    logLevel: 'warning',
  });

  // 2) CSS
  const css = await build({
    absWorkingDir: root,
    entryPoints: { main: 'src/styles/main.css' },
    bundle: true,
    outdir: join(dist, 'assets'),
    entryNames: '[name]-[hash]',
    minify: !dev,
    external: ['/fonts/*'],
    metafile: true,
    logLevel: 'warning',
  });

  // 3) Server renderer
  await rm(tmp, { recursive: true, force: true });
  const ssgOut = join(tmp, `render-${Date.now()}.mjs`);
  await build({
    absWorkingDir: root,
    entryPoints: ['src/ssg/render.tsx'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: ssgOut,
    jsx: 'automatic',
    packages: 'external',
    define: { 'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production') },
    logLevel: 'warning',
  });

  const outputs = (meta) => Object.entries(meta.outputs);
  const entryFile = (name) => {
    const hit = outputs(client.metafile).find(([, o]) => o.entryPoint && o.entryPoint.endsWith(name));
    if (!hit) throw new Error(`entry ${name} not found`);
    return rel(resolve(root, hit[0]));
  };
  const cssFile = rel(resolve(root, outputs(css.metafile).find(([f]) => f.endsWith('.css'))[0]));
  const scripts = { home: entryFile('client/home.tsx'), site: entryFile('client/site.ts') };

  const mod = await import(pathToFileURL(ssgOut).href + `?t=${Date.now()}`);
  const { routes, renderRoute, site } = mod;

  // 4) Pages
  for (const route of routes) {
    let html = renderRoute(route, {
      css: cssFile,
      scripts: [scripts[route.entry]],
      // The pool letters its floor with Piedra and Geo before first paint.
      preload: route.entry === 'home' ? ['/fonts/piedra.woff2', '/fonts/geo.woff2'] : ['/fonts/special-elite.woff2', '/fonts/piedra.woff2'],
    });
    if (dev) html = html.replace('</body>', `<script>${LIVE_RELOAD}</script></body>`);
    const file = join(dist, route.file);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
  }

  // 5) Static files
  await cp(join(root, 'public'), dist, { recursive: true });

  // 6) Cloudflare Pages headers (CSP allows only our own inline boot snippet)
  const boot = "document.documentElement.classList.add('js')";
  const hash = createHash('sha256').update(boot).digest('base64');
  const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-${hash}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'

/assets/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
`;
  await writeFile(join(dist, '_headers'), headers);
  let robots = 'User-agent: *\nAllow: /\n';
  if (site.origin) {
    const urls = routes.filter((r) => r.meta.index !== false).map((r) => `  <url><loc>${site.origin}${r.meta.path}</loc></url>`);
    await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
    robots += `Sitemap: ${site.origin}/sitemap.xml\n`;
  }
  await writeFile(join(dist, 'robots.txt'), robots);
  // The standalone Contact page was merged into About (V9).
  await writeFile(join(dist, '_redirects'), '/contact /about/#contact 301\n/contact/ /about/#contact 301\n');

  await rm(tmp, { recursive: true, force: true });
  if (log) console.log(`✓ built ${routes.length} pages in ${Math.round(performance.now() - t0)} ms → dist/`);
  return { routes: routes.map((r) => r.file) };
}

export const LIVE_RELOAD = `(()=>{try{const s=new EventSource('/__reload');s.onmessage=()=>location.reload();}catch(e){}})();`;
