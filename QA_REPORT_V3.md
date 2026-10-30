# V3 Source QA — Panda & Ducks Visual Quality

## Confirmed

- Source ZIP retains all five case-study pages, navigation and original water/physics engine.
- The five new transparent float images exist at `public/assets/floats/`.
- Assets have valid PNG signatures and nonempty alpha channels; visual contact-sheet inspected.
- Modified `src/pool/objects.ts` parses as TypeScript using the available TS compiler's transpileModule API.
- The previous procedural geometry remains a runtime fallback for missing texture assets.

## Not confirmed in this environment

- npm install and full typecheck/build: npm registry was unreachable from this runtime.
- Actual WebGL appearance, GPU compatibility, mouse physics feel, mobile and accessibility.

## Important rendering limitation

The duck and panda surfaces are **textured 2.5D relief meshes** with rounded volume below the waterline, not standalone photogrammetric/high-poly 3D models. This approach prioritizes fidelity to the user-approved overhead composition, while retaining authentic Three.js scene animation and hit testing. For a freely rotatable camera or extreme object tilts, full 3D models with licensed PBR textures are preferable.

Run `npm install`, `npm run typecheck`, `npm run build`, `npm run dev` on Windows. If images fail to load, verify the PNG paths and use the procedural fallback while troubleshooting.
