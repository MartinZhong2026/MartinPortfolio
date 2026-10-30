# CLAUDE.md

Read [AGENTS.md](AGENTS.md) first: it holds the project rules, commands, design system and regression list. Use [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how things work. This file only covers how to work here as Claude Code.

## Workflow

1. **Inspect.** Read the code you will touch before planning. `main.css` is a long cascade, so search for the selector and check whether a later block overrides it. For pool work, read `shaders.ts`, `PoolEngine.ts` and `objects.ts` together.
2. **Plan.** For anything visual, say what should change on screen before changing code. Check `docs/design-reference.png` and `docs/v6-4-target-mockup.jpg` for art direction. They are targets, not screenshots of this code.
3. **Implement.** Keep the diff focused. Content goes in `src/data/`. Prefer tuning existing systems to adding passes or dependencies.
4. **Test.** `npm test`, then `npm run test:e2e`. Tests that assert behaviour you changed on purpose should be updated, not weakened.
5. **Look.** Run `npm run build`, then `node scripts/capture.mjs --gpu --pages`, and open the images with the Read tool. Check `pool-desktop.png` and `pool-mobile.png` at the least. Run it again after each change: shaders routinely look wrong in ways no test catches.

## Visual verification

- Judge the pool at a few moments, not one frame. Caustics vary over time, so the name can read well in one capture and poorly in the next.
- Crop close-ups of floats at 2× before calling modelling or water contact finished.
- Compare performance by alternating runs of both builds. Single SwiftShader runs vary by more than most real changes.
- `?pool=static` shows the fallback. Check it when changing floats, labels or the pool layout.

## Reporting

State what you verified and how. Say plainly when something is untested on real devices, when a result is within noise, and when you changed a test. Do not call work done because the build passed.

## Remote actions

Follow the user's GitHub safeguards: one validated push per milestone, reuse existing branches and PRs, and stop on rate limits or 403/429 responses. Do not merge or deploy without Martin's approval.
