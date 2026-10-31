// Deterministic build/content smoke test. No headless browser required.
import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { dist, root } from './lib.mjs';

const slugs = ['adapt-to-china', 'meetfolio', 'abtrace', 'supplier-document-intelligence', 'fanscope'];
const allPages = ['index.html', 'work/index.html', 'about/index.html', 'life/index.html', '404.html', ...slugs.map((s) => `work/${s}/index.html`)];
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
assert(/<a class="pool__cta" href="\/work\/">Dive into my world/.test(home), 'Homepage call to action missing or not linked to /work/');
assert(home.includes('Tap a floating object to explore.'), 'Homepage instruction missing');
for (const href of ['/about/', '/work/', '/life/']) assert(home.includes(`href="${href}"`), `Homepage is missing a link to ${href}`);
// The homepage stays the pool: its old stacked sections live on their own pages.
for (const text of ['YBBE TECH', 'First Prize Scholarship', 'about-v6__gallery', 'card__summary']) assert(!home.includes(text), `Homepage should not contain: ${text}`);
for (const [font, license] of [['piedra.woff2', 'Piedra-OFL.txt'], ['cherry-cream-soda.woff2', 'CherryCreamSoda-Apache-2.0.txt'], ['geo.woff2', 'Geo-OFL.txt'], ['special-elite.woff2', 'SpecialElite-Apache-2.0.txt']]) {
  await stat(join(dist, 'fonts', font));
  await stat(join(dist, 'fonts/licenses', license));
}
const atc = await readFile(join(dist, 'work/adapt-to-china/index.html'), 'utf8');
assert(atc.length > 3000, 'Flagship case study seems incomplete');
await stat(join(dist, 'favicon.svg'));
console.log(`✓ ${allPages.length} static HTML routes, all five project links, favicon and flagship content checked`);

// Source-backed checks: only explicitly consented, verbatim excerpts can render.
const { build } = await import('esbuild');
const { mkdir, rm } = await import('node:fs/promises');
const { pathToFileURL } = await import('node:url');
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

// The approved essay must match the supplied copy exactly: wording, punctuation and paragraph structure.
const decode = (t) => t.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const plain = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const approved = (await readFile(join(root, 'scripts/fixtures/about-story.md'), 'utf8')).replace(/\r\n/g, '\n').trim().split(/\n\n+/);
const storyHtml = about.match(/<div class="about-v6__chapter-main"[\s\S]*?<\/section>/)[0];
assert.equal(plain(storyHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1]), approved[0].replace(/^## /, ''), 'Story heading differs from the approved copy');
assert.equal(plain(storyHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)[1]), approved[1].replace(/^### /, ''), 'Story question differs from the approved copy');
const renderedParagraphs = [...storyHtml.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => decode(m[1]));
assert.deepEqual(renderedParagraphs, approved.slice(2), 'Story paragraphs differ from the approved copy');
console.log(`✓ About story matches the approved copy exactly (${renderedParagraphs.length} paragraphs)`);
assert(!/about-v6__path|Education and career timeline/.test(about), 'Career timeline is still on About');
for (const route of allPages) {
  const html = await readFile(join(dist, route), 'utf8');
  assert(!/YBBE|Mintel|Career International|interns?|internships?|employer/i.test(html), `Employer or internship reference on ${route}`);
}
console.log('✓ No employer or internship references on any page');

// External links: exact destinations, opening safely in a new tab.
const external = [['work/adapt-to-china/index.html', ['https://adapttochina.com/', 'https://adapttochina.com/blog/', 'https://adapttochina.com/aichatbox']], ['work/fanscope/index.html', ['https://fanscope.pages.dev/']]];
for (const [file, urls] of external) {
  const html = await readFile(join(dist, file), 'utf8');
  for (const url of urls) {
    const tag = html.match(new RegExp(`<a [^>]*href="${url.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"[^>]*>`))?.[0];
    assert(tag, `Missing link ${url} on ${file}`);
    assert(/target="_blank"/.test(tag) && /rel="noopener noreferrer"/.test(tag), `Link ${url} must open safely in a new tab`);
    assert(/aria-label="[^"]+\(opens in a new tab\)"/.test(tag), `Link ${url} needs an accessible name that warns about the new tab`);
  }
}
console.log('✓ Adapt to China (3) and FanScope (1) external links: exact URLs, new tab, noopener, accessible names');
const life = await readFile(join(dist, 'life/index.html'), 'utf8');
for (const photo of ['salomon-city-run', 'jingan-10k', 'hong-kong-sketch', 'shanghai-run-group', 'hiking-group']) assert(life.includes(photo), `Life gallery is missing ${photo}`);
for (const text of ['Running gives me rhythm.', 'strength training', 'Hiking takes me somewhere unfamiliar.', 'Drawing makes me pay attention.', 'Henan', 'Macau']) assert(life.includes(text), `Life copy missing: ${text}`);
assert(about.includes('2028'));
for (const html of [about]) {
  assert(!/GPA|Academic Progress Award|First-Class|Second-Class/.test(html), 'Outdated About content rendered');
  for (const text of ['First Prize Scholarship', 'Second Prize Scholarship', 'QS 2027 #36', 'QS 2027 =258', 'Sun Yat-sen University', 'Shanghai Jiao Tong University']) assert(html.includes(text), `Education and ranking content missing: ${text}`);
}
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
