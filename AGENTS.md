# AGENTS.md

Shared guidelines for AI coding agents (and people) working on this repository. Technical detail lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); setup lives in [README.md](README.md).

## Project

Martin Zhong's personal portfolio: an independent creative developer's world, not a corporate résumé. The homepage is a real-time WebGL swimming pool; the floats in it lead to the pages and project case studies. It should feel playful, sophisticated and summery, never childish or cluttered.

Static HTML is generated at build time by React, then enhanced in the browser. There is no client-side router, no CSS framework and no server.

## Stack

- React 19 for server rendering; one hydrated island (the pool)
- TypeScript, esbuild, plain CSS
- Three.js r184 for the pool
- Playwright for browser tests
- Node 20.10 or newer

Do not add dependencies without a clear reason. Fonts are self-hosted files, not packages.

## Repository map

| Path | What it holds |
| --- | --- |
| `src/pages/pages.tsx` | Home, Work, About, Life, 404 |
| `src/pages/cases/` | The five case studies |
| `src/components/` | Layout (document, header, footer), cards, case-study parts |
| `src/data/` | All editable content: site, projects, about, testimonials, artifacts |
| `src/ssg/render.tsx` | The route table |
| `src/client/` | Browser entry points |
| `src/pool/` | The WebGL pool |
| `src/styles/main.css` | All styles. Later blocks override earlier ones; V10 is at the end |
| `scripts/` | Build, dev server and test scripts |
| `public/` | Files copied as they are: images, fonts, licences |
| `docs/` | Architecture notes, design references, screenshots |

## Commands

```powershell
npm ci                    # install
npm run dev               # build, serve on :4321, rebuild on change
npm run build             # production build to dist/
npm run preview           # serve dist/ on :4321
npm run typecheck
npm test                  # typecheck + build + content checks
npm run test:e2e          # real browser; needs `npx playwright install chromium`
npm run test:about        # About layout at four viewports (needs a build)
npm run test:mobile       # phone overlaps, touch, flicker gate (needs a build)
npm run test:v62:source   # source-level content checks
npm run capture           # screenshots to test-results/capture/ (see flags in the script)
node scripts/gen-story.mjs  # regenerate src/data/story.ts from the approved essay
node scripts/capture-og.mjs   # regenerate public/og.png from the live pool
```

Run `npm run build` before the e2e, About and capture scripts: they serve `dist/`.

## Code conventions

- Match the surrounding code. Keep comments sparse and about why.
- Content belongs in `src/data/`, not in components. A `null` link is never rendered.
- Pages are static: no hooks or browser APIs outside `PoolStage` and `src/client/`.
- New pages need a route in `src/ssg/render.tsx`, a nav entry in `src/data/site.ts` if primary, and a line in `scripts/check-content.mjs`.
- Add CSS to the end of `main.css` rather than editing deep in the cascade, unless you are removing something.

## Design system

Keep the V6 identity: warm paper, deep ink, editorial spacing, aqua accents. Tokens are in `:root` in `main.css`.

| Role | Font | Token | Use |
| --- | --- | --- | --- |
| Display | Piedra | `--font-display` | The name, `h1`, `h2`, card titles. 24px or larger. One weight, no italic |
| Reading | Special Elite | `--font-body` | All long-form body text: paragraphs, summaries, quotations |
| Story | Boogaloo | `--font-story` | The paragraphs of the About story, and nothing else |
| Editorial | Cherry Cream Soda | `--font-editorial` | One short statement at a time; nav, buttons, pool labels, printed float names |
| Label | Geo | `--font-label` | "welcome to my world", eyebrows, hints, in sentence case |
| Small headings | Source Serif 4 | `--font-serif` | `h3`, `h4`, bold names, mock UI, pool tooltips |
| Data | JetBrains Mono | `--font-mono` | Dates, ranks, counts, chips, simulated data |

Two rules exist because of real legibility failures. Do not put names people navigate by in Geo: its capital A reads as an R ("Rbout"). Do not put numbers in Geo: its numerals are old-style, so "5" reads as "s".

Special Elite has one weight, a wide set and a strong texture. Keep it at 13px or larger, give it generous leading, and leave `word-spacing` on `body` alone: the V11 block in `main.css` is tuned as a set. `font-synthesis` is off globally, then allowed for `strong` and `em`, so inline emphasis still shows in Special Elite. Every font and its licence is in `public/fonts/`.

Responsive rules: design from 320px up; `max-aspect-ratio: 5/6` switches the pool to portrait; Home must fit one screen with no scrolling at common sizes.

## The pool

Read the Pool section of [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing anything in `src/pool/`. Constraints that are easy to break:

- **The water mesh is opaque.** Anything below y = 0 is hidden and is drawn by the water shader from the footprint map. A float that rocks too far dips through the surface, which is why every object declares `maxTilt`.
- **The look is soft on purpose.** Caustics stay broad and white, never a bright cyan web. Long waves shape them; fine detail comes from `rippleTex`, which never reaches the caustics. Before raising `focusGain`, wave slopes or pointer drop strength, check a stirred pool, not just an idle one. `test:e2e` fails if the water's brightness spread reaches 52.
- **Toys are decoration.** Ducks, the beach ball, doughnut ring and turtle have no link, hit target or label, and they wander. Keep their slots in `toySlots` clear of the name on the floor. Add few: they stay secondary to the project floats.
- **The call to action floats on the water.** `CTA_LANDSCAPE` and `CTA_PORTRAIT` in `PoolEngine.ts` set where it sits. The engine projects that point for the DOM link and keeps floats out of the area.
- **Water shaders never loop over objects.** Per-object data reaches the water through `FloatShadows` textures, so adding a float adds no per-pixel cost.
- **`WAVES` is shared.** GPU refraction, caustics and CPU buoyancy all read it. Change amplitudes in one place and retune `focusGain`.
- **Water and deck bypass tone mapping.** Their colours are display values, hand-graded in `shaders.ts`. Three.js materials are tone mapped (Neutral), so tune the two separately.
- **Keep `ids` and DOM links in step.** Each `poolItems` entry needs a builder in `objects.ts` and a slot in both layouts in `layout.ts`. `toyBuilders` and `toySlots` must stay the same length.
- **Mobile budget.** Touch devices get smaller targets and a pixel ratio cap of 1.5. Avoid new full-screen passes, and test any change at 390×844.
- **Never refresh the caustics less than once a frame.** Skipping frames makes the focus lines jump, which reads as bright flashes on phones. See "Caustics and flicker" in the architecture notes. Run `node scripts/flicker.mjs --only base --fps 30` after changing waves, `focusGain` or the caustic pipeline.
- **Portrait is a fixed composition.** Labels are pinned and floats stay in cells. Run `npm run test:mobile` after moving anything in `portraitLayout` or `toySlots`.

## Do not regress

- All routes: `/`, `/about/`, `/work/`, `/life/`, the five `/work/<slug>/` pages, 404, and the `/contact` redirect.
- Exactly five projects, flagship first. Do not add a sixth.
- "Martin Zhong" centred on the pool floor with "welcome to my world" beneath, refracted but readable, with no float or duck resting on it.
- Project branding and clickable floats, plus a matching real link for every float.
- The no-JavaScript and no-WebGL pool, `prefers-reduced-motion`, keyboard focus and skip link.
- Published content rules enforced by `scripts/check-content.mjs`: only the confirmed email, only consented testimonials verbatim, no excluded experience, every image with `alt` and dimensions, one status/limits section per case.
- Honest claims: prototypes stay labelled as prototypes. Do not invent metrics, quotes or links.
- The About essay is approved copy. Never rewrite, shorten or add to `scripts/fixtures/about-story.md`; `check-content` fails on any difference. No public page carries employer or internship references; project case studies describe client work neutrally ("enterprise client prototype"). External links to Adapt to China and FanScope are fixed destinations, opened with `target="_blank" rel="noopener noreferrer"`.

## Verifying visual work

A passing build proves nothing about rendering. For any visual change, run `npm run capture` and look at the images. WebGL work needs desktop and mobile, plus a close look at the area you changed. Software rendering (SwiftShader) is what e2e uses: it checks correctness, but its frame rate says nothing about real devices.

## Git and pull requests

- Branch from up-to-date `main`; never commit directly to it. Use `feat/…` or `fix/…`.
- Run `npm test` and `npm run test:e2e` before pushing, and batch work into one push per milestone.
- PRs describe the change, the test results and anything unverified, with screenshots for visual work.
- Never merge or deploy to production without Martin's approval.
- `dist/` and `node_modules/` are tracked for historical reasons. `npm run build` is the only source of `dist/`. If you commit it, rebuild from the final code first, in its own commit, so the tracked copy never holds a half-finished build.
- Never commit secrets or tokens.
