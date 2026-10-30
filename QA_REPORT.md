# Pool Portfolio — Panda & Ducks Revision QA
Date: 2026-10-26

## Implemented in the supplied source
- Dominant 3D panda and striped inflatable torus for the flagship Adapt to China.
- Four small, differently coloured 3D rubber ducks: yellow Meetfolio, green lab AbTrace, pink documents, orange snorkel FanScope.
- Unchanged origami About boat, navigation, case-study source content and water shaders.
- Mouse-speed-driven floating impulses, damping, gentle return, collision avoidance, pool walls, continuing wave ripples.
- Geometry below `y=0` for submerged portions; WebGL surface depth-occludes it.
- Updated flat SVG fallbacks and label sizing.
- Fixed Windows local-server `/` redirect using the original URL path rather than platform-normalised separators.
- Added scripts/check-content.mjs and scripts/e2e.mjs; `npm test` covers typecheck/build/content, browser test is separately invoked.

## Actually checked in this environment
- Input ZIP was decompressed successfully.
- TypeScript transpilation / JSX syntax diagnostics on edited TS/TSX: 0.
- Node script syntax checks (node --check): passed.
- Source-code feature and package structure checks: passed.
- Final ZIP integrity (CRC): verified after packaging.

## Not verified here
- `npm install` did not complete because the npm registry is unreachable in this environment (DNS/network restriction).
- Thus full TypeScript type checking with dependencies, production build, Playwright browser tests, real runtime interactions, and visual waterline inspection are **not claimed to have passed**.

## Local Windows verification
From the folder containing package.json:
```
npm install
npm run dev
```
Open http://localhost:4321 and examine the waterline. Move the cursor near each duck; the duck should nudge away, create ripples, and slowly return. Click each float and verify the case study. Check mobile proportions and deliberate touch drag.

Run additional checks:
```
npm test
npx playwright install chromium
npm run test:e2e
```
For forced no-WebGL fallback use `http://localhost:4321/?pool=static`.
