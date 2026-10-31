# Testing the pool on a real phone

Automated checks run in desktop browsers with device emulation. They cannot reproduce a phone's GPU, so a visual fault on a real device needs this procedure. Budget about five minutes per phone.

## Setup

Use the deployed site or a preview URL. To use a local build, run `npm run build`, then `npx serve dist` or any static server reachable from the phone over the same network.

Replace `<site>` below with that address.

## 1. Check for flashes

1. Open `<site>/` and leave the pool alone for 60 seconds. Keep your eyes on the water, not on one spot.
2. Drag a finger slowly across the water for 15 seconds, then stop.
3. Note any flash: a bright line that appears for an instant, rather than light gliding.

Soft sunlight that drifts is correct. A sudden bright line, in any direction, is the fault.

## 2. If a flash remains, find its source

Each address turns one effect off. Repeat step 1 on each and note where the flash stops.

| Address | Effect turned off |
| --- | --- |
| `<site>/?poolfx=no-caustics` | Sunlight patterns on the floor |
| `<site>/?poolfx=no-glitter` | Sun sparkle on the surface |
| `<site>/?poolfx=no-fine` | Fine surface ripples |
| `<site>/?poolfx=no-rings` | Ripple rings around floats |
| `<site>/?poolfx=no-leaf` | Palm shadows |

Switches combine: `?poolfx=no-caustics,no-glitter`. If the flash survives all of them, the fault is outside these effects, so record a screen video and report it.

Please include the phone model, operating system, browser, and whether it happens immediately or after a while.

## 3. Check the labels and floats

1. Confirm that each of the seven labels sits beside its own float and that none touch.
2. Tap each float, then go back. Repeat by tapping each label.
3. Drag across the pool, then confirm that everything returns to its place.
4. Rotate the phone to landscape and back.

## 4. Check reduced motion

Turn on the system setting (iOS: Settings → Accessibility → Motion → Reduce Motion. Android: Settings → Accessibility → Remove animations). Reload. The water should hold still.

## What the automated checks cover

`npm run test:mobile` runs `scripts/mobile-layout.mjs` and `scripts/flicker.mjs`. The first measures overlaps across phone sizes on many animated frames, after a finger drag, and taps every destination. The second steps the pool one exact frame at a time and detects long, thin marks that brighten between two frames.

Useful runs of the second script, which all need a fresh `npm run build`:

```powershell
node scripts/flicker.mjs                        # every effect on, then each one off
node scripts/flicker.mjs --only base --fps 30   # as a phone at 30 fps
node scripts/flicker.mjs --only base --fps 30 --stir --width 360 --height 740 --dpr 3
node scripts/flicker.mjs --only base --webkit   # needs: npx playwright install webkit
node scripts/flicker.mjs --only base --reduced
```

`?poolfx=` also exposes `window.__pool`, which these scripts use to step frames. It has no effect on normal visits.
