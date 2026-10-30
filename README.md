# Martin Zhong — Pool Portfolio V6 Refresh

An update of the approved V6 portfolio: React + TypeScript, build-time static HTML via esbuild, and a Three.js r184 water island. The V6 pool, typography, routes and five-project roster are retained. No deployment or push was performed.

## Open on Windows

Extract this ZIP, then open PowerShell in `martin-pool-portfolio`:

```powershell
npm ci
npm run dev
```

Open `http://localhost:4321/`. The About page is `http://localhost:4321/about/`.
Use `http://localhost:4321/?pool=static` for the illustrated fallback. A WebGL2-capable browser normally selects the interactive pool automatically.

Run `npm run build` to generate a fresh `dist/` production build, then serve it using `npm run preview`. The old Refresh `dist/` is deliberately omitted from V6.2 to avoid serving outdated HTML. Opening `index.html` directly with `file://` is unsupported because routes and assets use site-root URLs.

## Checks

```powershell
npm run typecheck
npm run build
npm run test:content
npx playwright install chromium
npm run test:e2e
```

The first three checks passed in the *previous Refresh revision*, not in this V6.2 revision. V6.2 could not reinstall npm dependencies in this environment, so only offline source and asset checks were executed. See `QA_REPORT_V6_2.md`.

## What changed

- Alpha-distance immersion, a refracted submerged-volume approximation, projected alpha-silhouette floor shadows with separable blur, softer caustics and a faceted origami boat.
- Fixed the desktop-only collision constraint that incorrectly pushed portrait floats into the lower half. Portrait layout and runtime label avoidance are updated.
- Same float art in the no-WebGL fallback; three viewport screenshots show that fallback, not the live shaders.
- Supplied career narrative, specific decision evidence, seeking-opportunity details, approved life photos and two anonymous, consent-guarded user excerpts.
- Real ATC homepage evidence, the retired medical-booklet experiment, a historical poster and one consolidated status/limits section per case.
- `public/og.png`, with the name and tagline over a real static-pool screenshot.
- More complete content and browser acceptance scripts. Existing npm dependency declarations are unchanged; a lockfile is included for repeatability.

## Edit content

- `src/data/site.ts`: verified public links, production origin and role preferences. Null links stay hidden.
- `src/data/about.ts`: career, strengths, approved photos, regions and unapproved metaphor.
- `src/data/testimonials.ts`: only two authorized, original-wording excerpts. `consent: false` prevents rendering and is tested.
- `src/data/artifacts.ts`: optional medical booklet originals and verification source.
- `src/pool/layout.ts`: portrait/landscape object slots.
- `src/pool/objects.ts`, `FloatShadows.ts`, `shaders.ts`: object and water rendering.

The optional `scripts/generate-float-masks.py` is an authoring tool requiring Pillow, NumPy and SciPy. It is not needed to run or build the website: all five masks are supplied.

## Before launch

The public contact email is **adapttochina@163.com**, confirmed by Martin. The final origin still needs to be configured. Group photos are visible in this local review build at Martin’s request; confirm third-party photo-release permission before publishing. Unconfirmed general account links and the proposed metaphor remain hidden. Retain the prototype, House Planner, ERP and FanScope boundaries. Follow `CONTENT_TODO.md`.

Run `npm run test:e2e` after installing dependencies on Windows. Older QA and screenshot files included in the original Refresh belong to that historical build; `QA_REPORT_V6_2.md` is the current source-review report.


### V6.2 content / layout refresh (2026-10-27)
- About hero now features a first-person introduction and two education credential rows, including scholarships and **QS World University Rankings 2027** numbers linked to QS institution profiles. These are *overall university* rankings, not program rankings.
- Meetfolio case study uses the provided application screenshot and the supplied repository URL (`https://github.com/MartinZhong2026/meetfolio`). **The URL could not be independently verified because GitHub returned 403 / account suspended** at check time; verify access before deployment.
- About lifestyle image captions are transparent with small cyan labels. The requested five-photo running/hiking gallery is shown in this local package; confirm group-photo participant privacy before public deployment.
- Government and CCTV-related work experience remains excluded; V6 pool, About composition, case-study routes and interactions otherwise stay untouched.

## V6.4 visual refresh (October 27, 2026)

The homepage places **Martin Zhong / welcome to my world** on the pool floor under the active WebGL surface. The five portfolio projects now float as thick, branded app icons; the original About origami boat remains. Source icon faces are at `public/assets/icons/`. New dated product screenshots are on the FanScope and Adapt to China case pages. The approved V6 About design is preserved.

Please read `QA_REPORT_V6_4.md` before deploying. The provided homepage mockup under `docs/` is a **visual target**, not a screenshot captured from this code.
