// Deterministic build/content smoke test. No headless browser required.
import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { dist } from './lib.mjs';

const slugs = ['adapt-to-china', 'meetfolio', 'abtrace', 'supplier-document-intelligence', 'fanscope'];
const allPages = ['index.html', 'work/index.html', 'about/index.html', '404.html', ...slugs.map((s) => `work/${s}/index.html`)];
for (const route of allPages) {
  const html = await readFile(join(dist, route), 'utf8');
  assert.match(html, /<html\b/i, `Missing HTML element: ${route}`);
  assert.match(html, /<title>/i, `Missing document title: ${route}`);
  assert.match(html, /<main\b/i, `Missing main landmark: ${route}`);
}
const home = await readFile(join(dist, 'index.html'), 'utf8');
for (const slug of slugs) {
  assert(home.includes(`/work/${slug}/`), `Homepage is missing ${slug}`);
}
assert(!home.toLowerCase().includes('marble3d'), 'Removed project appeared in homepage');
assert.match(home, /Adapt to China/);
const atc = await readFile(join(dist, 'work/adapt-to-china/index.html'), 'utf8');
assert(atc.length > 3000, 'Flagship case study seems incomplete');
await stat(join(dist, 'favicon.svg'));
console.log(`✓ ${allPages.length} static HTML routes, all five project links, favicon and flagship content checked`);

// Source-backed checks: only explicitly consented, verbatim excerpts can render.
const { build } = await import('esbuild');
const { mkdir, rm } = await import('node:fs/promises');
const { pathToFileURL } = await import('node:url');
const { root } = await import('./lib.mjs');
await mkdir(join(root, '.build'), { recursive: true });
const checkModule = join(root, '.build', 'content-check.mjs');
try {
  await build({ stdin: { contents: "export { testimonials } from './src/data/testimonials'; export { Testimonial } from './src/components/Testimonial';", resolveDir: root, loader: 'tsx' }, bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', outfile: checkModule });
  const { testimonials, Testimonial } = await import(pathToFileURL(checkModule).href);
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { createElement } = await import('react');
  assert.equal(testimonials.length, 2, 'Only the two approved testimonials are allowed');
  for (const t of testimonials) {
    const rendered = renderToStaticMarkup(createElement(Testimonial, { id: t.id, compact: t.id === 'hospital-navigation' }));
    assert(t.consent === true && rendered.includes('data-consent="true"'));
    assert(atc.includes(rendered), `Approved excerpt changed: ${t.id}`);
    t.consent = false;
    assert.equal(renderToStaticMarkup(createElement(Testimonial, { id: t.id, compact: t.id === 'hospital-navigation' })), '', 'Unapproved testimonial rendered');
    t.consent = true;
  }
  console.log('✓ Two authorized verbatim testimonials; revoked consent renders nothing');
} finally { await rm(checkModule, { force: true }); }

for (const route of allPages) {
  const html = await readFile(join(dist, route), 'utf8');
  assert(!/TODO\(Martin\)|\[VERIFY\]/.test(html), `Editorial marker leaked: ${route}`);
  assert(!/CCTV|government (?:internship|project)/i.test(html), 'Excluded experience appeared');
  for (const tag of html.matchAll(/<img\b[^>]*>/g)) {
    assert(/\balt="[^"]*"/.test(tag[0]), `Image alt missing: ${route}`);
    assert(/\bwidth="\d+"/.test(tag[0]) && /\bheight="\d+"/.test(tag[0]), `Image dimensions missing: ${route}`);
    const src = tag[0].match(/\bsrc="([^"]+)"/)?.[1];
    if (src?.startsWith('/')) await stat(join(dist, src));
  }
  for (const match of html.matchAll(/data-testimonial="([^"]+)"/g)) {
    assert(['beijing-support', 'hospital-navigation'].includes(match[1]));
    assert(html.includes(`data-testimonial="${match[1]}" data-consent="true"`));
  }
}
const about = await readFile(join(dist, 'about/index.html'), 'utf8');
assert(about.includes('shanghai-run-group') && about.includes('hiking-group'), 'Requested five-photo About gallery incomplete');
assert(about.includes('YBBE TECH') && about.includes('Mintel') && about.includes('2028'));
assert(about.includes('mailto:adapttochina@163.com'), 'Confirmed public email missing');
assert(about.includes('>adapttochina@163.com</a>'), 'Public email address not visible on About');
assert(!(await stat(join(dist, 'contact/index.html')).then(() => true, () => false)), 'Standalone Contact page should not exist');
for (const route of allPages) {
  const html = await readFile(join(dist, route), 'utf8');
  assert(!html.includes('martinzhong@mail.sjtu.edu.cn'), 'Unconfirmed candidate email rendered');
  for (const match of html.matchAll(/href="mailto:([^"]+)"/g)) {
    assert.equal(match[1], 'adapttochina@163.com', 'Unconfirmed email link rendered');
  }
}
console.log('✓ Confirmed public email appears in the About contact block and footers; no standalone Contact page; no unconfirmed email links');
for (const slug of slugs) {
  const html = await readFile(join(dist, `work/${slug}/index.html`), 'utf8');
  assert.equal((html.match(/>Status &amp; limits\.</g) || []).length + (html.match(/>Status &amp; limits</g) || []).length, 1, `Expected one status/limits section: ${slug}`);
}
console.log('✓ All images have alt/dimensions and resolve; no editorial markers, excluded roles or unconfirmed contacts; every case has one limits section');
