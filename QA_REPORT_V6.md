# V6 — About personal brand landing page

Updated on 27 October 2026. Base: `martin_pool_portfolio_brand_polish_v5.zip`.

## What changed

- Rebuilt `/about/` as a responsive editorial landing page for hiring managers, recruiters and potential collaborators.
- Added a clear career positioning and CTA to selected work; résumé CTA appears only after a verified link is set in `src/data/site.ts`.
- Made the provided Shanghai night portrait prominent in the first screen.
- Added scannable proof links to Adapt to China, Meetfolio and AbTrace, plus a narrative about moving from public administration and consumer insight into hands-on AI products.
- Added a four-part strengths section, distinct professional timeline and five-photo lifestyle gallery (running, Jing'an 10 km, hiking, Victoria Peak drawing).
- Added mobile/tablet adaptations, accessible image descriptions and reduced-motion handling.
- Updated About SEO title and description.
- No changes to WebGL pool, water shaders, float models, case-study implementations or unrelated routes.

## Checks actually performed

- 21 source `.ts` and `.tsx` files parsed using the installed TypeScript parser: **0 syntax errors**.
- `.mjs` scripts passed `node --check`.
- Main CSS parsed with tinycss2: **0 top-level parse errors**.
- All six images referenced by the new About page exist and decode successfully.
- About internal links match existing route slugs and navigation paths.

## Unverified (do not claim passed)

- The npm registry is inaccessible in this editing sandbox (`EAI_AGAIN` on `registry.npmjs.org`). As a result, full type checking, production build, server boot and browser screenshots have **not** been completed here.
- Responsive typography and photo crop need visual verification at desktop 1440×900, tablet 1024×768 and phone 390×844.

## Windows PowerShell verification

```powershell
cd "C:\PATH\TO\martin-pool-portfolio"
npm install
npm run typecheck
npm run build
npm run test:content
npm run dev
```

Open `http://localhost:4321/about/` and review the page at desktop and mobile widths. `npm run test:e2e` can be used after installing Playwright's browser (`npx playwright install chromium`).

## Before publishing

1. Fill in verified public contact information in `src/data/site.ts`.
2. Add an approved résumé PDF to `public/` and set `site.contact.resume` if you want a résumé button to appear.
3. Get permission where needed from people appearing in group photos before making the gallery public.
4. Review claims, final layout and responsive crop with the actual Windows build.
