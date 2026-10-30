# Martin Pool Portfolio V6.3 — targeted pool repairs

## Baseline
`Martin_Pool_Portfolio_V6_2_Education_Meetfolio_Gallery_20261027.zip` provided earlier in this conversation. V6 design and all V6.2 education, scholarship, gallery and Meetfolio content remain intact.

## User-reported problems and modifications
1. **Panda float has transparent/missing regions near its red-and-white ring**: traced to BOTH an undersized source cutout and sampling a displaced PNG alpha in the immersion material. Regenerated `public/assets/floats/adapt-to-china.png` from the complete approved reference artwork, updated its matching SDF, adjusted relief aspect ratio; the `objects.ts` shader now always preserves the original source alpha and perturbs only RGB lightly near the silhouette. Reduces jagged holes and keeps facial details unaffected.
2. **Paper boat appears glued to a dark circular disc**: `shaders.ts` previously inserted a generic underwater ellipsoid for every float including the slim origami boat. Disabled this analytic submerged-disc compositing. The objects still sit over live animated water; relief edges retain subtle waterline treatment; floor shadows retain silhouette-based projection but are softer and lighter.
3. **About button redundant with paper-boat About Martin navigation**: removed the `About me` hero CTA; retained the clickable and keyboard-accessible paper-boat About link, top navigation About link, and About page. Moved paper boat modestly upward and updated DOM label packing to avoid the main hero block.

## Deliberately preserved
- Three.js water simulation, caustics pipeline, existing object movement, inertia, collisions and click navigation.
- All five projects, the content and visual hierarchy of V6.2, and static/no-WebGL fallback.
- No deployment, no GitHub push, no framework migration.

## Checks actually performed
- TypeScript's `transpileModule` compiled all 27 TS/TSX files at **syntax level only**, no syntax errors.
- `node scripts/check-v62-source.mjs` passed.
- PNG and SDF dimensions verified for every pool float; recreated panda mask matches the new image.
- Asset files available and ZIP archive CRC integrity checked.

## Checks **not** performed in this environment
- Full `npm run typecheck`, `npm run build`, `npm run test:content` and actual dynamic WebGL screenshot comparisons. The Node dependency tarballs are unavailable offline here. Attempted `npm ci --offline` failed (`ENOTCACHED`), so none of those checks can be claimed as passed.
- Any changes to shaders could produce different visual results across browser/GPU combinations: verify in Windows Chrome with actual WebGL, not only the fallback.

## Windows acceptance instructions
Extract into a **new** folder (do not overwrite old versions), open PowerShell where `package.json` lives and run:

```powershell
npm ci
npm run dev
```

Open `http://localhost:4321/` and verify:
1. The panda's entire ring stays intact when stationary and when bobbing or pushed.
2. No opaque turquoise or dark circular disc surrounds the paper boat.
3. There is only one hero CTA (`Dive into my work`); `About Martin` on the paper boat remains clickable, and its label stays clear of the hero.
4. All six objects still move on mouse interaction and still navigate to their correct pages.
5. No WebGL console errors; test 390×844 mobile layout and /about/.

Then stop the server with Ctrl+C and run `npm run typecheck`, `npm run build`, `npm run test:content`, `npm run test:e2e`. Report failures and share screenshots for targeted adjustments.
