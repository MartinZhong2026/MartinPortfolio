# Martin Zhong — Pool Portfolio

Martin Zhong's personal portfolio. The homepage is an interactive WebGL swimming pool: branded cushions lead to five case studies, a paper boat leads to About, a swim ring leads to Life, and a few rubber ducks drift around for company.

Built with React (static rendering), TypeScript, esbuild and Three.js. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it works and [AGENTS.md](AGENTS.md) for contribution rules.

## Getting started

Requires Node 20.10 or newer.

```powershell
npm ci
npm run dev
```

Open `http://localhost:4321/`. Editing files in `src/` or `public/` rebuilds and reloads the page.

Add `?pool=static` to the URL to see the fallback used without WebGL. Opening HTML files directly with `file://` is not supported, because routes and assets use site-root URLs.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with live reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` on port 4321 |
| `npm run typecheck` | TypeScript checks |
| `npm test` | Typecheck, build and content checks |
| `npm run test:e2e` | Real-browser acceptance tests |
| `npm run test:about` | About page layout checks |
| `npm run test:v62:source` | Source-level content checks |
| `npm run capture` | Screenshots to `test-results/capture/` |

The browser scripts need Chromium once (`npx playwright install chromium`) and a fresh `npm run build`. `npm run capture -- --pages --gpu` includes the inner pages and uses your GPU.

## Project structure

```text
src/
  pages/        Home, About, Work, Life, 404 and the five case studies
  components/   Document layout, cards, case-study parts
  data/         All editable content
  pool/         The WebGL pool: engine, shaders, floats, layout
  client/       Browser entry points
  ssg/          Route table and static renderer
  styles/       main.css
public/         Images, fonts and licences, copied as they are
scripts/        Build, dev server and tests
docs/           Architecture notes, design references, screenshots
```

## Editing content

- `src/data/site.ts`: links, production origin, role preferences. A `null` link stays hidden.
- `src/data/about.ts`: career, strengths, Life activities, photos and hiking regions.
- `src/data/projects.ts`: the five projects and their card text.
- `src/data/testimonials.ts`: the two authorised excerpts. `consent: false` stops one rendering.
- `src/data/artifacts.ts`: optional medical booklet originals.
- `src/pool/layout.ts`: where each float and duck sits, in landscape and portrait.

## Deployment

The site is designed for Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20.10 or newer

The build generates the `_headers` (security policy, caching) and `_redirects` files Cloudflare reads. The repository contains no Cloudflare configuration, so confirm these settings in the Cloudflare dashboard. Deploy only with Martin's approval.

`dist/` is tracked in git for historical reasons, so it can fall behind the source. Treat `npm run build` as the only source of `dist/`.

## Before launch

- Set `site.origin` in `src/data/site.ts` to enable canonical URLs and the sitemap.
- Confirm third-party permission for the group photos on the Life page.
- Unconfirmed account links stay hidden until supplied.
- Work through [CONTENT_TODO.md](CONTENT_TODO.md).

`QA_REPORT*.md` and `VISUAL_QUALITY_NOTES.md` are historical records of earlier versions.
