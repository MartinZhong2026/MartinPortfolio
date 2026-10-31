# Incidents

The record of significant bugs, regressions and failed fixes, so nobody repeats them. Read this before changing anything an entry touches.

## Convention

Add an entry for a user-visible bug that survived a fix, a regression, or a fault you could only confirm on a real device. Newest first. Keep each entry short, and link to commits rather than pasting logs.

Use these headings: **Status**, **Symptoms**, **Evidence**, **Cause**, **Failed fixes**, **Fix**, **Tests**, **Open questions**, **Rules for next time**.

Label claims. **Confirmed** was observed or measured. **Hypothesis** fits the evidence but was not proven. **Unresolved** is unknown. Only the person holding the device can close a real-device entry: until then its status stays *Fix awaiting real-device confirmation*.

---

## 2026-10 Bright streaks flashing across the pool on phones

**Status:** Fix awaiting real-device confirmation. Do not mark resolved until Martin confirms it on his phone.

### Symptoms

Bright white diagonal streaks repeatedly flash across the pool, running upper-left to lower-right, on Martin's real phone in portrait. They were not noticed on desktop. Device model and browser are not yet recorded.

### Evidence

**Confirmed on the real phone (Martin):**

| Build and address | Result |
| --- | --- |
| `8112d63`, normal | Flickers |
| `8112d63`, `?poolfx=no-caustics` | No flicker |
| `8112d63`, `?poolfx=no-glitter` | Flickers |

`no-caustics` only stops the floor using the caustic map. The map's render passes keep running. So those passes running is not enough to cause the fault: it needs the map's result on screen.

**Confirmed by comparing code:**

| | `e06f666` (no flicker reported) | `b04cf74` onwards |
| --- | --- | --- |
| Main visible sunlight | Analytic `ambientCaustics()` in the floor shader | Projected mesh caustic map |
| Slope fed to the map | ×0.5 | ×9.5 (`focusGain`), 19 times stronger |
| Map on screen | `1 - exp(-3.1 m)`, weight 0.22 | ×4, plus additive white bloom |
| Wind waves in the map | None | Eight, always moving |
| Mobile map size | 640 wide | 384 wide |
| Mobile refresh | Every frame | Every second frame (removed in `8112d63`) |

**Confirmed in emulation** (`scripts/flicker.mjs`, Chromium and WebKit on a desktop GPU): the map's focus lines travel several of their own widths between frames, and the longest wave's crests lie at about +40° on a portrait screen, matching the streak direction.

### Cause

**Confirmed:** the regression entered at `b04cf74`, when the analytic pattern was deleted and an extreme mesh map became the only sunlight. The fault is in the map path: removing its output removes the flicker.

**Hypotheses, not separated yet:**

- Bad vertices. A corrupted or extreme vertex makes a long thin triangle across the map, and the grid's triangle diagonals also run upper-left to lower-right in portrait. Desktop GPUs would not show this. It would explain why emulation looked fixed while the phone did not.
- Mobile GPU behaviour in the map path: half-float vertex texture fetch, half-float blending, or derivatives on thin triangles.
- Lines jumping at low frame rates, as seen in emulation. This is real, but `8112d63` reduced it greatly in emulation and the phone still flickered, so it cannot be the whole story.

**Unresolved:** the exact phone-side mechanism. The fix removes the whole path on phones, so it does not need this answered.

### Failed fixes

- **`b4934b7` / `8112d63`:** eased the map over time, refreshed it every frame, slowed the waves, and computed light per vertex (`VERTEX_AREA`). Emulation showed streak marks down from 344 to 1 at 60 fps. **The phone still flickered.** Lesson: the emulated test measured a real problem, but not necessarily the one on the phone. `VERTEX_AREA` has been removed.
- **Lowering the mesh map's strength** was tried repeatedly during the visual refinements, for appearance. It never removed the path.

### Fix

Touch devices no longer use the mesh map. `ANALYTIC_CAUSTICS` restores a pattern adapted from `e06f666`: a formula of position and time, with no render target, no mesh and no wave input, so it cannot jump between frames. The map passes do not run there at all. Desktop keeps the map, with easing, because no fault has been reported there.

### Tests

In emulation at 390×844, streak marks were 0 at 60, 30, 20 and 15 fps, and 2 short marks with a finger dragging. These numbers show the design works in emulation. **They are not proof for phones**, as the failed fix showed. Procedure: [MOBILE_TESTING.md](MOBILE_TESTING.md).

### Open questions

- Does the fix hold on Martin's phone?
- Which phone model and browser? Is it one GPU family?
- Does `?poolfx=map-caustics` on the new build bring the flicker back? That would confirm the map path as the cause.
- Could the same fault reach desktops with weak GPUs? None reported. `?poolfx=analytic-caustics` tests the phone path on desktop.

### Rules for next time

- Do not route touch devices through the mesh map, or add a render-target or mesh step to their sunlight, without testing on a real phone.
- Do not fix this class of fault with smoothing. Find where the output first goes wrong.
- A passing emulated test does not prove a mobile GPU fix.
- When a user reports a regression, compare against the last good commit first.
