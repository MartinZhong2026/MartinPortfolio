import assert from 'node:assert/strict';
import { readFile, stat, mkdir, rm } from 'node:fs/promises';
import { parse } from 'parse5';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { root, dist } from './lib.mjs';

const origin = 'https://martin.adapttochina.com';
export const paths = ['/', '/about/', '/work/', '/life/', ...['adapt-to-china', 'meetfolio', 'abtrace', 'supplier-document-intelligence', 'fanscope'].map(s => `/work/${s}/`), '/404'];
const catalogs = await Promise.all(['zh-CN', 'pool.zh-CN'].map(name => readFile(join(root, `src/data/locales/${name}.json`), 'utf8').then(JSON.parse)));
const messages = Object.assign({}, ...catalogs);
const reviewed = new Set([...Object.values(messages), '中文', 'EN']);
const normalize = text => text.replace(/\s+/g, ' ').trim();
function visit(node, fn) { fn(node); for (const child of node.childNodes ?? []) visit(child, fn); }
function elements(doc, tag) { const result = []; visit(doc, node => { if (node.tagName === tag) result.push(Object.fromEntries(node.attrs.map(a => [a.name, a.value]))); }); return result; }

for (const path of paths) {
  const file = path === '/404' ? '404.html' : path.slice(1) + 'index.html';
  const en = parse(await readFile(join(dist, file), 'utf8'));
  const zh = parse(await readFile(join(dist, 'zh', file), 'utf8'));
  for (const [doc, lang, prefix] of [[en, 'en', ''], [zh, 'zh-Hans', '/zh']]) {
    assert.equal(elements(doc, 'html')[0].lang, lang);
    const links = elements(doc, 'link');
    if (path !== '/404') {
      assert.equal(links.find(l => l.rel === 'canonical')?.href, origin + prefix + path);
      for (const [locale, url] of [['en', origin + path], ['zh-Hans', origin + '/zh' + path], ['x-default', origin + path]]) {
        assert.equal(links.find(l => l.hreflang === locale)?.href, url, `${prefix}${path} reciprocal ${locale}`);
      }
      const meta = elements(doc, 'meta');
      assert.equal(meta.find(m => m.property === 'og:url')?.content, origin + prefix + path);
      assert.equal(meta.find(m => m.property === 'og:image')?.content, `${origin}/${prefix ? 'og-zh.png' : 'og.png'}`);
      assert(meta.find(m => m.name === 'description')?.content);
    } else {
      assert.equal(elements(doc, 'meta').find(m => m.name === 'robots')?.content, 'noindex');
      assert(!links.some(l => l.hreflang || l.rel === 'canonical'));
    }
    const switches = elements(doc, 'a').filter(a => a['data-language']);
    assert.equal(switches.length, 2);
    assert.equal(switches.find(a => a['data-language'] === 'zh').href, '/zh' + path);
    assert.equal(switches.find(a => a['data-language'] === 'en').href, path);
  }
  visit(zh, node => {
    if (node.nodeName === '#text' && !['script', 'style'].includes(node.parentNode?.tagName)) {
      const text = normalize(node.value);
      assert(!/[a-zA-Z]/.test(text) || reviewed.has(text), `Unreviewed Chinese-page copy on ${path}: ${text}`);
    }
    if (node.tagName === 'a') {
      const attrs = Object.fromEntries(node.attrs.map(a => [a.name, a.value]));
      if (attrs.href?.startsWith('/') && !attrs['data-language']) assert(attrs.href.startsWith('/zh/'), `English internal link on Chinese ${path}: ${attrs.href}`);
    }
  });
  const html = await readFile(join(dist, 'zh', file), 'utf8');
  if (path.startsWith('/work/') && path !== '/work/') assert.equal((html.match(/>当前进展与边界</g) ?? []).length, 1);
}
const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) ?? []).length, 18);
assert.equal((sitemap.match(/hreflang="zh-Hans"/g) ?? []).length, 18);
assert(!sitemap.includes('pages.dev') && !sitemap.includes('/404'));
assert((await readFile(join(dist, 'robots.txt'), 'utf8')).includes(`Sitemap: ${origin}/sitemap.xml`));
for (const file of ['noto-serif-sc.woff2', 'licenses/NotoSerifSC-OFL.txt']) await stat(join(dist, 'fonts', file));
const redirects = await readFile(join(dist, '_redirects'), 'utf8');
await stat(join(dist, 'og-zh.png'));
const home = await readFile(join(dist, 'index.html'), 'utf8');
const boot = home.match(/<script>([\s\S]*?)<\/script>/)[1];
const cspHash = createHash('sha256').update(boot).digest('base64');
assert((await readFile(join(dist, '_headers'), 'utf8')).includes(`'sha256-${cspHash}'`), 'CSP must allow the exact preference boot');
for (const path of ['/contact', '/contact/', '/zh/contact', '/zh/contact/']) assert(redirects.includes(`${path} ${path.startsWith('/zh/') ? '/zh' : ''}/about/#contact 301`));

// A changed English source must never silently fall back on a Chinese page.
await mkdir(join(root, '.build'), { recursive: true });
const bundle = join(root, '.build/localization-check.mjs');
try {
  await build({ entryPoints: ['src/ssg/localize.ts'], bundle: true, platform: 'node', format: 'esm', outfile: bundle, logLevel: 'silent' });
  const { localizeHtml } = await import(pathToFileURL(bundle).href);
  assert.throws(() => localizeHtml('<p>Unreviewed new content</p>'), /Missing Chinese translation/);
  assert.throws(() => localizeHtml('<img alt="Unreviewed image description">'), /Missing Chinese translation/);
  assert(localizeHtml('<p>Home</p><script>const Home = "Home";</script>').includes('<p>首页</p>'));
  assert(localizeHtml('<script>const Home = "Home";</script>').includes('const Home = "Home";'));
} finally { await rm(bundle, { force: true }); }
console.log('✓ 20 localized documents: reviewed copy, language, reciprocal SEO, routes, limits, font, redirects, sitemap and missing-translation build gate');
