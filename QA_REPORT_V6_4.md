# Martin Pool Portfolio · V6.4 — Brand Floats + Underwater Identity

**Base:** The user-supplied V6.3 ZIP (`Martin_Pool_Portfolio_V6_3_Pool_Visual_Fixes_20261027(1).zip`). The approved V6 About page, education, scholarships, testimonials and existing five case studies have not been replaced with the rejected V7 design.

## Implemented

1. **New pool composition:** removed the duplicate left-column "Hi, I'm Martin" introduction. The exact strings **Martin Zhong** and **welcome to my world** are rendered as a CanvasTexture *on the pool floor* through the existing ray-traced pool interior, rather than as a flat UI overlay. Water waves refract the floor lettering and the caustics pass over it. Static/no-WebGL mode retains readable text.
2. **Real brand floats:** Meetfolio (green book), AbTrace (green A), FanScope (teal sail), and Adapt to China (circular skyline logo). Document AI uses a reference-inspired white document + AI icon because a separate official logo was not supplied. The five sprites also replace cartoon duck glyphs on the Work cards and case-study artwork.
3. **3D water contact:** Each icon has a bevelled shell crossing the waterline and a separately textured upper face; a common physical light direction and the existing silhouette-shadow pass provide floor shadows. The About paper boat and pointer physics remain intact.
4. **Layout:** six floats redistributed around the underwater name. Separate portrait layout. Removed the obsolete collision wall that confined most objects to the right half of the pool. Existing ripple, hit-testing and click routes preserved.
5. **Environment:** preserved tile geometry and blue lane markings; added softly lit pool ladder rails and subtle ambient deck shadows. The approved mockup is saved under `docs/v6-4-target-mockup.jpg` **as a reference, not a runtime screenshot**.
6. **Real case study evidence:** new `public/assets/fanscope/research-trends-20261027.webp` and `public/assets/adapt/founder-blog-20261027.webp` inserted with captions distinguishing local data coverage and the editorial site.

## Source/asset review

- Source: 27 TypeScript/TSX files transpile without syntax errors; PostCSS parsed 556 stylesheet nodes.
- `node scripts/check-v62-source.mjs` passed, confirming the V6.2 ranked education, scholarships, Meetfolio screenshot/GitHub, and excluded experience remain in place.
- Five 512×512 RGBA icon files and two real interface screenshots exist at the paths used by source code.
- The original five project route slugs are unchanged.
- The new SVG-style Document AI icon is **not** presented as a real user-provided product logo.

## Not tested in this environment

Network restrictions prevented installing dependencies from the npm registry (EAI_AGAIN). Therefore **no full `npm run build`, full `npm run typecheck`, or WebGL browser screenshot can be claimed as passing here**. In particular, shader compilation, reflections, floor-lettering orientation on mobile, icon material highlights, shadows, object overlap and touch interactions **must be verified in a real Chrome GPU environment** before deployment. The build outputs included in previous versions were not reused to make false claims.

## Windows acceptance steps

Open the project folder containing `package.json` and run:

```powershell
npm ci
npm run typecheck
npm run build
npm run test:content
npm run dev
```

Open `http://localhost:4321/`, `http://localhost:4321/work/fanscope/`, `http://localhost:4321/work/adapt-to-china/`, and `http://localhost:4321/work/`.

Check 1440×900, 1024×768, and 390×844. Verify: underwater centered text, correct logos, waterline, floor-shadow direction, sunlit tiles and lane markings, pointer push + inertia, label separation, six links and keyboard access. Inspect Chrome DevTools console for shader errors. The static fallback must be checked with `?pool=static`. For automated tests run `npx playwright install chromium` and `npm run test:e2e`; headless GPU support may still differ from actual hardware.

## Remaining decisions

- Replace reference-inspired Document AI app icon with a formal brand asset, if available.
- Adjust icon/underwater lettering sizes against GPU screenshots if needed.
- This is a genuine source-code update, not a pixel-identical reproduction of the supplied reference painting; the real-time water / lighting remains subject to browser verification.
