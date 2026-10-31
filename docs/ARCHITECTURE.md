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
- **About story.** `AboutStory` is a two-column spread: a collage of real images (`storyCollage` in `about.ts`) beside the essay. The essay is Martin's approved copy, its paragraphs set in Boogaloo, kept in `scripts/fixtures/about-story.md` and turned into `src/data/story.ts` by `scripts/gen-story.mjs`, so the page cannot drift from it. The collage grows downwards: each image takes its own row, alternates left and right, and tucks under the one above, so appending an entry to `storyCollage` reflows it without CSS changes. `tuck` raises an image into the space beside the one above. `kind` (`browser`, `phone`, `photo`, `logo`) sets its frame and width. On phones it stacks above the essay.
- **Home call to action.** `PoolStage` renders a "Dive into my world →" link to `/work/` as a float on the water, below the name. The engine projects a fixed water point (`CTA_LANDSCAPE`, `CTA_PORTRAIT`) to screen each frame so the link follows the camera, keeps floats out of that area, and label placement avoids it. Without WebGL it sits at a fixed position in the CSS pool. The instruction line stays in the bar under the pool.
- `src/components/case.tsx` provides the case-study building blocks used by `src/pages/cases/`.
- Content lives in `src/data/`: `site.ts` (links, origin, roles), `projects.ts` (the five projects), `about.ts` (strengths, Life content, photos, the About collage), `story.ts` (the About essay, generated), `testimonials.ts` (consent-gated quotes), `artifacts.ts` (optional originals).

## The pool

`PoolStage.tsx` is the only hydrated React component. It is server-rendered as a working static pool of real links, then `capability.ts` checks for WebGL2 and renderable float buffers. If they exist, `PoolEngine` is imported lazily and takes over the `<canvas>`. All simulation and render state lives in the engine; React only mounts it and positions DOM links.

### Frame order

`PoolEngine.frame()` runs these in order:

1. Update objects (springs, collisions) and queue ripple drops.
2. **Drop pass:** add up to 16 ripples to the height field.
3. **Update passes:** 1 to 3 steps of the wave equation.
4. **Normal pass:** combine ripple slope with the analytic wind slope (`windSlope`).
5. **Caustics:** project a grid of the surface onto the floor, record how much each cell of light was focused, then blur the result.
6. **`FloatShadows.render()`:** floor shadow, footprint, contact and halo maps.
7. **Main view:** water, pool interior, deck, rails and floats.
8. **Anchors:** project float positions to CSS pixels so the DOM links can follow.

### Simulation textures

`rtA`/`rtB` are half-float targets (256 wide, 192 on touch devices) swapped each pass. Channels: `r` height, `g` velocity, `ba` the surface normal's x and z. Wind is deliberately not in the height channel: it is analytic, so it needs no simulation and cannot go unstable.

### Water appearance

`WAVES` in `shaders.ts` is one field of eight directional waves, weighted towards long and middle wavelengths. It drives three things:

- **Refraction and reflection**, through the normal in `ba`. The view ray uses a softened normal so the name stays readable.
- **Caustics**, through `causticsVert`, which multiplies slope by `focusGain` because the pool is shallow, then limits steep slopes so a stirred pool stays soft. The result is physically derived, not a painted pattern. Past the sun-side wall no light lands, which is what draws the wall's shadow.
- **Buoyancy**, through `swellAt()`, a CPU copy of the longest three waves.

On desktop the caustic map is deliberately small (512 wide) and blurred. `poolSurface()` samples it three times, offset by wavelength for slight dispersion, breaks it into slow patches, and rolls off the peaks. Tiles are lit as ambient plus that sun term. The brightest light is added as white rather than multiplied into the tile colour, which is what keeps it from reading as neon cyan.

#### Two caustic paths

- **Touch devices** define `ANALYTIC_CAUSTICS` and draw sunlight from `ambientCaustics()`, a formula of position and time. There is no render target, mesh or wave input, and the map passes do not run. This is deliberate: see [INCIDENTS.md](INCIDENTS.md).
- **Desktop** uses the projected map. `causticRaw` holds the latest map, and the sampled `causticRT` eases towards it over `causticSettle`, because focus lines jump between frames. Never refresh it less than once a frame. `adaptQuality()` lengthens the settling and slows the waves on slow machines. `windClock` accumulates time, so the rate can change smoothly.

`?poolfx=map-caustics` and `?poolfx=analytic-caustics` force either path for testing. Touch devices also run the waves at 0.55 speed, and buoyancy reads the same clock. Lane edges are anti-aliased, because a hard edge seen through moving water flips whole rows of pixels.

`waterFrag` then adds absorption, in-scattering, deeper colour towards the walls, Fresnel sky reflection, sun glitter, and the contact effects below. `rippleTex` is a tiling slope map built once by `buildRippleMap()`. Two scrolling samples give the surface fine detail at a fixed cost, and it never reaches the caustics.

### Float contact

`FloatShadows.ts` renders each float three ways so `waterFrag` never loops over objects:

| Target | Size (touch) | Purpose |
| --- | --- | --- |
| `target` | 512×320 (384×240) | Silhouette projected along the refracted sun, blurred: floor shadow |
| `footprint` | 512×320 (384×240) | Hulls at the waterline from straight above, in colour: refracted submerged hull |
| `contact` | 192×120 | Footprint blurred: dark crease, bright meniscus, surface bend, reflected colour |
| `halo` | 96×60, half float | Footprint blurred widely: ripple rings |

Geometry above `WATERLINE_Y` is discarded from the footprint, so only what actually meets the water counts. This works for any shape, including the ring's hole. A wide Gaussian falls off as exp(-d²), so `waterFrag` recovers a distance from `halo` with sqrt(-log) and uses it as the phase of rings that follow each hull's shape.

### Floats

`objects.ts` builds each float as a `BuiltObject` (`group`, `radius`, `top`, `mass`, `maxTilt`, optional `animate`):

- Five `brandFloat`s: thick cushions shaped as a superquadric, with the brand mark and name painted to a canvas and projected onto the top. The marks come from `public/assets/icons/`.
- `paperBoat` links to About and carries "About Martin" on its camera-side hull. `swimRing` links to Life.
- Five decorative toys from `toyBuilders`: two `rubberDuck`s, a `beachBall`, a `doughnutRing` and a `toyTurtle`. They have no link or hit target and paddle around a slowly wandering home.

`updateObjects()` applies a spring toward each home position, pointer and collision impulses, and a mass-weighted spring to the local swell. `layout.ts` is the single source of positions for both the live scene and the CSS fallback, in screen-normalised coordinates. Adjust slots there, not in the engine. `toySlots` holds the toys; the fallback does not show them.

Portrait is a fixed composition, because a narrow pool has no room to spare. Each slot in `portraitLayout` names the side its label is pinned to (`pinLabel()`), so a label never searches for a spot. Project floats may leave their home by only `CELL_FLOAT` and toys by `CELL_TOY`, and a toy gives way entirely when it meets a project float. Keep this in mind when moving a slot: run `npm run test:mobile`, which measures every pair of objects.

### Planting

`plants.ts` builds three stone planters of leaves and flowers. Each planter's foliage merges into one vertex-coloured mesh, so the arrangement costs a few draw calls and no extra passes. `POSES` holds positions for each orientation, because the top of the screen is a different side of the pool in portrait. On resize, `PoolStage.plantFits` checks each planter against the header, the instruction line and the screen edge, and a planter with no room hides. They have no hit target and do not affect the water.

### Lighting

One `light` direction is used by caustics, shadows, the directional light and a procedural sky dome baked to an environment map, so reflections agree with shadows. The sun sits high and to the side so its mirror image, the glitter zone, stays off the name. The camera is tilted (`TILT_LANDSCAPE`, `TILT_PORTRAIT`) so the far wall and the sides of the floats show, and `resize()` backs it off until the near rim fits the frame. In portrait the camera turns 90°, so `resize()` turns the sun with it to keep shadows falling screen lower-right. Palm shadows come from a small canvas (`paintFoliage`) sampled by the deck and pool floor shaders. Water and deck output display-referred colour directly; Three.js materials use Neutral tone mapping so brand colours hold.

### Lettering

"Martin Zhong" and "welcome to my world" are drawn to a canvas in Piedra and Geo, then sampled by `floorTiles()`. They are therefore part of the floor: waves refract them and caustics cross them. The canvas repaints when the fonts finish loading. Portrait remaps the canvas and widens the lanes so the name fits between them.

### Performance

- Three.js is a lazy chunk; the first paint is static HTML.
- The loop stops when the canvas is off-screen or the tab is hidden.
- Pixel ratio is capped at 2, or 1.5 on touch devices. Touch devices also use smaller targets.
- Water shaders read textures instead of looping over objects, so floats add draw calls but no per-pixel cost.
- `adaptQuality()` measures after warm-up. Under 40 fps it drops the pixel ratio to 1, then slows the light. Resizing clears the canvas, so both it and `resize()` redraw straight away, or the browser would show a blank frame.

## Assets, fonts and styling

- `public/assets/` holds project screenshots, icons and photographs. Image references need `alt`, `width` and `height` (enforced by tests). `public/assets/floats/` is no longer used at runtime; only `scripts/generate-float-masks.py` reads it.
- Fonts are self-hosted in `public/fonts/` with licences in `public/fonts/licenses/`. Home preloads Piedra and Geo because the pool needs them; other pages preload Piedra and Special Elite.
- `src/styles/main.css` is plain CSS with tokens in `:root`, in version-labelled blocks where later blocks override earlier ones. The V10 block near the end defines the type roles, Home layout, Life page and water accents, and the V11 block after it tunes Special Elite for reading.

## Responsive behaviour and accessibility

- **Layout.** Pool size comes from `--fw`/`--fh`, calculated from viewport width and height. At `max-aspect-ratio: 5/6` the pool becomes portrait: the engine detects `frame.height > frame.width`, rotates the camera and uses `portraitLayout`. Below 560px the header drops the brand name to fit four links.
- **Labels.** Floats print their own names, so labels appear on hover and keyboard focus. On touch devices, where print is too small and there is no hover, they stay on. In landscape, `labels.ts` places them each frame, avoiding other labels, floats and the name.
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
| `npm test` | Types, build, and `check-content.mjs`: routes, content rules, consent, images, fonts, the About essay against its approved copy, no employer or internship references on any page, and the exact external links on Adapt to China and FanScope |
| `npm run test:e2e` | Chromium with software WebGL at 1440, 1024 and 390 wide: live pool, pixel checks on water colour, brightness spread (the neon guard) and the name, float hover and click, nav, one-screen Home, fonts, labels, keyboard, reduced motion, no-JS, fallback, redirects, filters, 404 |
| `npm run test:mobile` | Overlaps of labels, floats, toys, the name and the call to action on animated frames at phone sizes, after a finger drag; a touch on every float and label; and the flicker gate. See [MOBILE_TESTING.md](MOBILE_TESTING.md) |
| `npm run test:about` | About reading order and layout at four viewports |
| `npm run test:v62:source` | Source-level checks of approved content |
