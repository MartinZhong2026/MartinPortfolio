# English and Simplified Chinese

The same static React pages produce English at the existing URLs and Simplified
Chinese under `/zh/`. All five project slugs are unchanged. `/zh/404.html` is the
nearest error page for unknown Chinese paths on Cloudflare Pages; the local
preview server mirrors that behaviour. Both `/contact` and `/zh/contact` redirect
to the corresponding About contact section.

## Content and rendering

The English source remains authoritative and unchanged, including the approved
essay fixture and consent-gated testimonial excerpts. Chinese is written and
reviewed in `src/data/locales/zh-CN.json`. Keys are the complete published English
text units, with whitespace normalized. Values are reviewed Chinese copy, not
machine-generated output at runtime. Long paragraphs stay whole so their
sentences can be restructured naturally. Inline emphasis remains in the shared
template, so review its adjacent fragments together in the rendered page.

`src/ssg/localize.ts` uses **parse5**, a build-only HTML parser, to translate text
nodes, image descriptions, accessible names and metadata. It rewrites internal
page links to `/zh/`; assets, downloads, mail links and external destinations are
shared. It never replaces raw HTML strings, scripts, styles, CSS classes, data
attributes or IDs. Any unpublished English string in a Chinese document fails
the build instead of silently falling back. Proper names, email addresses and
technical terms intentionally retained in English have explicit catalog entries.
This keeps shared layouts in one place, catches English-source changes during
builds, and leaves complete Chinese HTML for crawlers and visitors without JS.

The pool is the exception to the build transform because it hydrates.
`pool.zh-CN.json` is its small shared catalog; `PoolStage` receives an explicit
locale from the URL for both server rendering and browser hydration. The outer
compiler skips this island. The engine receives the same locale for floor, boat,
ring and document-float lettering. Geometry, layout, simulation and shaders are
unchanged. Only the pool catalog, not the essay or case-study catalog or parse5,
ships in browser JavaScript. The dynamic project count uses a Chinese count
format in the existing filter enhancement.

Chinese testimonials are faithful translations of the two consented excerpts,
with a visible translation note. Revoking consent removes them in both languages.
Original product screenshots and logos remain authentic evidence; their visible
interface language is not edited. Surrounding copy, captions and alt text are
localized. External product destinations remain fixed.

## URLs and preference

URLs are authoritative: a direct `/zh/work/meetfolio/` always renders Chinese,
and `/work/meetfolio/` always renders English, even with a saved Chinese choice.
The header has two real links with language names, `lang`, `hreflang`, and an
accessible current-language state. They work without JavaScript. Enhancement
preserves query strings and hash fragments and saves only an explicit click in
`localStorage['portfolio-language']`. No browser-language detection is performed.
Same-language links preserve the choice across pages and refreshes.

For a returning visitor entering `/` externally or in a new tab, the early boot
restores an explicitly saved Chinese choice before rendering the page. It does
not override same-origin navigation or Back/Forward. If storage is blocked, the
URL and real links still work. The CSP hashes the actual exported boot snippet,
so editing it cannot accidentally break it in production.

## SEO

The production origin is `https://martin.adapttochina.com`, confirmed by Martin.
Both languages have absolute self-canonicals and reciprocal `en`, `zh-Hans` and
`x-default` links. English is the default. Titles, descriptions and Open Graph
copy are localized, with `en_US` / `zh_CN` Open Graph locales.
Chinese pages use a separate pool capture, `og-zh.png` (regenerate with
`node scripts/capture-og.mjs --zh`), keeping the existing English share image.
`sitemap.xml`
includes 18 indexable URLs with reciprocal language alternates. The two error
pages are `noindex` and excluded from the sitemap and canonical alternates.
The `pages.dev` deployment remains accessible and points at the preferred domain
through metadata; no domain or hosting setting is changed by this work.

## Typography and editorial review

Chinese uses a self-hosted regular **Noto Serif SC** subset, with Song-style
fallbacks. It complements the paper-and-ink layout; Latin names and the pool's
main name retain Piedra. Chinese overrides are scoped with `html:lang(zh)` and
leave English reading typography intact. Source, SHA-256 and OFL licence are in
`public/fonts/licenses/`. Regenerate the subset after adding characters:

```powershell
python -m pip install fonttools brotli
python scripts/subset-chinese-font.py path/to/NotoSerifCJKsc-Regular.otf
```

When adding copy, edit the English source only if authorized, add Chinese
catalog entries, regenerate the font when necessary, and review the complete
page. Prefer short, direct Chinese sentences and a personal voice. Preserve all
dates, counts, roles, qualifications, caveats and approval boundaries. Do not
invent a Chinese personal name, expand claims, add experience or translate
product branding gratuitously. Read About's nine paragraphs together against the
approved English essay, and read inline heading fragments as a complete phrase.

## Verification

```powershell
npm test
npm run test:localization
npm run test:e2e
npm run test:about
npm run test:mobile
node scripts/mobile-layout.mjs --zh
npm run capture -- --gpu --pages --cases
npm run capture -- --gpu --pages --cases --zh --out test-results/capture-zh
```

`check-localization` verifies all 20 documents, catalog coverage, reciprocal
metadata, paths, status/limits, fonts, redirects and sitemap, and proves that
unknown text and alt copy fail localization. Browser tests visit every page and
exercise every switch at 320, 390, 820 and 1440 pixels, plus persistence, filters,
deep links, anchors, history, old links, 404, no-JS, blocked storage and no-WebGL.
About and mobile composition tests run for Chinese too. Captures require visual
inspection; emulation does not establish real-phone GPU behaviour.
