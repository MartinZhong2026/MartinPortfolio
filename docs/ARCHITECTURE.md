# Architecture

How the site is built. For rules and conventions see [AGENTS.md](../AGENTS.md).

## Routing and page generation

The site is a multi-page static site. `scripts/build.mjs` calls `buildSite()` in `scripts/lib.mjs`, which:

1. Bundles the two client entries with esbuild (`home`, `site`), splitting Three.js into a lazy chunk.
2. Bundles `src/styles/main.css`, leaving `/fonts/*` URLs external.
3. Bundles `src/ssg/render.tsx` for Node and imports it.
4. Renders each entry in its `routes` array to a static HTML file.
5. Copies `public/` into `dist/`.
6. Writes `_headers`, `robots.txt`, `_redirects`, and `sitemap.xml` when `site.origin` is set.

| Route | Component | Client entry |
| --- | --- | --- |
| `/` | `Home` | `home` |
| `/about/` | `About` | `site` |
| `/work/` | `Work` | `site` |
| `/work/<slug>/` | One per project in `src/pages/cases/` | `site` |
| `/life/` | `Life` | `site` |
| `/404` (`404.html`) | `NotFound` | `site` |

There is no client-side router: links are full page loads. Same-origin cross-fades come from the CSS `@view-transition` rule. Sections that once lived on the homepage are kept reachable: `src/client/home.tsx` redirects `/#projects`, `/#about`, `/#my-story`, `/#outside` and `/#contact`, and `src/client/site.ts` redirects `/about/#outside`.

## Components and data

- `src/components/Layout.tsx` renders the full document, header, footer and skip link. The primary nav comes from `nav` in `src/data/site.ts`.
- `src/pages/pages.tsx` holds the top-level pages. About is composed of `AboutHero`, `AboutProof`, `AboutStory`, `AboutStrengths` and `AboutClosing`.
- `src/components/case.tsx` provides the case-study building blocks used by `src/pages/cases/`.
- Content lives in `src/data/`: `site.ts` (links, origin, roles), `projects.ts` (the five projects), `about.ts` (career, strengths, Life content, photos), `testimonials.ts` (consent-gated quotes), `artifacts.ts` (optional originals).

## The pool

`PoolStage.tsx` is the only hydrated React component. It is server-rendered as a working static pool of real links, then `capability.ts` checks for WebGL2 and renderable float buffers. If they exist, `PoolEngine` is imported lazily and takes over the `<canvas>`. All simulation and render state lives in the engine; React only mounts it and positions DOM links.

### Frame order

`PoolEngine.frame()` runs these in order:

1. Update objects (springs, collisions) and queue ripple drops.
2. **Drop pass:** add up to 16 ripples to the height field.
3. **Update passes:** 1 to 3 steps of the wave equation.
4. **Normal pass:** combine ripple slope with the analytic wind slope (`windSlope`).
5. **Caustics:** project a grid of the surface onto the floor and record how much each cell of light was focused.
6. **`FloatShadows.render()`:** floor shadow, footprint and contact maps.
7. **Main view:** water, pool interior, deck, rails and floats.
8. **Anchors:** project float positions to CSS pixels so the DOM links can follow.

### Simulation textures

`rtA`/`rtB` are half-float targets (256 wide, 192 on touch devices) swapped each pass. Channels: `r` height, `g` velocity, `ba` the surface normal's x and z. Wind is deliberately not in the height channel: it is analytic, so it needs no simulation and cannot go unstable.

### Water appearance

`WAVES` in `shaders.ts` is one field of nine directional waves. It drives three things:

- **Refraction and reflection**, through the normal in `ba`. The view ray uses a softened normal so the name stays readable.
- **Caustics**, through `causticsVert`, which multiplies slope by `focusGain` because the pool is shallow. The result is physically derived, not a painted pattern. Past the sun-side wall no light lands, which is what draws the wall's shadow.
- **Buoyancy**, through `swellAt()`, a CPU copy of the longest four waves.

`poolSurface()` lights tiles as ambient plus sun, where sun is the caustic focus reduced by float shadows and foliage. The focus is sampled three times, offset by wavelength, for slight dispersion. `waterFrag` then adds absorption, in-scattering, Fresnel sky reflection, sun glitter, and the contact effects below.

### Float contact

`FloatShadows.ts` renders each float three ways so `waterFrag` never loops over objects:

| Target | Size (touch) | Purpose |
| --- | --- | --- |
| `target` | 512×320 (384×240) | Silhouette projected along the refracted sun, blurred: floor shadow |
| `footprint` | 512×320 (384×240) | Hulls at the waterline from straight above, in colour: refracted submerged hull |
| `contact` | 192×120 | Footprint blurred: dark crease, bright meniscus, surface bend, reflected colour |

Geometry above `WATERLINE_Y` is discarded from the footprint, so only what actually meets the water counts. This works for any shape, including the ring's hole.

### Floats

`objects.ts` builds seven objects, each returning a `BuiltObject` (`group`, `radius`, `top`, `mass`, `maxTilt`, optional `animate`):

- Five `brandFloat`s: a kickboard carrying the icon from `public/assets/icons/`, pushed by a `rubberDuck` wearing a project-themed accessory. Duck geometry is shared across instances.
- `paperBoat` links to About; `swimRing` links to Life.

`updateObjects()` applies a spring toward each home position, pointer and collision impulses, and a mass-weighted spring to the local swell. `layout.ts` is the single source of positions for both the live scene and the CSS fallback, in screen-normalised coordinates. Adjust slots there, not in the engine.

### Lighting

One `light` direction is used by caustics, shadows, the directional light and a procedural sky dome baked to an environment map, so reflections agree with shadows. In portrait the camera rotates, so `resize()` mirrors the sun to keep shadows falling screen lower-right. Palm shadows come from a small canvas (`paintFoliage`) sampled by the deck and pool floor shaders. Water and deck output display-referred colour directly; Three.js materials use Neutral tone mapping so brand colours hold.

### Lettering

"Martin Zhong" and "welcome to my world" are drawn to a canvas in Piedra and Geo, then sampled by `floorTiles()`. They are therefore part of the floor: waves refract them and caustics cross them. The canvas repaints when the fonts finish loading. Portrait remaps the canvas and widens the lanes so the name fits between them.

### Performance

- Three.js is a lazy chunk; the first paint is static HTML.
- The loop stops when the canvas is off-screen or the tab is hidden.
- Pixel ratio is capped at 2, or 1.5 on touch devices. Touch devices also use smaller targets and refresh caustics on alternate frames.
- `adaptQuality()` measures after warm-up. Under 40 fps it drops the pixel ratio to 1, then halves the caustic rate.

## Assets, fonts and styling

- `public/assets/` holds project screenshots, icons and photographs. Image references need `alt`, `width` and `height` (enforced by tests). `public/assets/floats/` is no longer used at runtime; only `scripts/generate-float-masks.py` reads it.
- Fonts are self-hosted in `public/fonts/` with licences in `public/fonts/licenses/`. Home preloads Piedra and Geo because the pool needs them; other pages preload Piedra and Source Serif 4.
- `src/styles/main.css` is plain CSS with tokens in `:root`, in version-labelled blocks where later blocks override earlier ones. The V10 block at the end defines the current type system, Home layout, Life page and water accents.

## Responsive behaviour and accessibility

- **Layout.** Pool size comes from `--fw`/`--fh`, calculated from viewport width and height. At `max-aspect-ratio: 5/6` the pool becomes portrait: the engine detects `frame.height > frame.width`, rotates the camera and uses `portraitLayout`. Below 560px the header drops the brand name to fit four links.
- **Labels.** `labels.ts` places pool labels each frame, avoiding other labels, floats and the name.
- **Semantics.** The canvas is `aria-hidden`. Every float is a real `<a>`, so keyboard and screen-reader users get the same navigation; focus also highlights the float. Home has a visually hidden `h1`, and a skip link leads every page.
- **Fallbacks.** Without JavaScript or WebGL2, or with `?pool=static`, the CSS pool shows the same links. Losing the WebGL context switches to it too, and a restored context rebuilds the engine.
- **Motion.** `prefers-reduced-motion` freezes wind, parallax, idle animation and the dive, leaving a still but lit pool.

## Build output and deployment

`npm run build` writes everything to `dist/`, including:

- `_headers`: a Content-Security-Policy with a hash for the one inline script, security headers, and immutable caching for `/assets/*` and `/fonts/*`.
- `_redirects`: `/contact` to `/about/#contact`.

These are Cloudflare Pages file formats. The intended project settings are build command `npm run build`, output directory `dist`, Node 20.10 or newer. This repository holds no Cloudflare configuration, so check those settings in the Cloudflare dashboard. `scripts/serve.mjs` mimics the same routing locally, but it does not apply `_headers`.

Before launch, set `site.origin` in `src/data/site.ts` to enable canonical URLs and the sitemap. See `CONTENT_TODO.md`.

## Tests

| Command | Covers |
| --- | --- |
| `npm test` | Types, build, and `check-content.mjs`: routes, content rules, consent, images, fonts |
| `npm run test:e2e` | Chromium with software WebGL at 1440, 1024 and 390 wide: live pool, pixel checks on water colour and the name, float hover and click, nav, one-screen Home, fonts, labels, keyboard, reduced motion, no-JS, fallback, redirects, filters, 404 |
| `npm run test:about` | About reading order and layout at four viewports |
| `npm run test:v62:source` | Source-level checks of approved content |
