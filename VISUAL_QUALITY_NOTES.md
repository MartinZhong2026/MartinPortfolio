# V3 visual fidelity update

## Why V2 looked worse than the concept

The V2 ducks were composed of large overlapping spheres, with eyes and beaks
placed on a nearly horizontal head surface. From the actual top-down camera,
this looked like a generic clay figurine, not a commercial rubber duck.
The V2 panda also had weak separation between its head and inflatable ring.

## V3 rendering technique

- Preserves existing Three.js water, caustics, camera, motion, collision,
  navigation, DOM overlays, and all five full case studies.
- Extracts **art-directed transparent renders** from the selected concept
  image into `public/assets/floats/` (the concept image was generated for this
  portfolio). The ducks and panda now visually match the approved art style.
- Maps each render to a lightly curved 3D relief above the water; adds an
  actual partially submerged 3D shell for volume/contact.
- Keeps V2 procedural meshes as a fallback if PNG assets fail.

**Important limitation:** The surface imagery is an art-directed top-down
2.5D representation, not high-poly sculpted GLB models. Since this is a
nearly overhead pool it looks closer to the desired concept, while retaining
all physically interactive movement and water response. For unrestricted
orbit-camera views, replace the relief objects with licensed, purpose-made
GLB models with PBR materials and a true submerged volume. Do not claim the
assets are production-quality sculpted 3D models.

## Smoke tests

In a working local Node/npm environment:

```powershell
npm install
npm run typecheck
npm run build
npm run dev
```

Inspect http://localhost:4321. Move cursor past the panda/ducks to push them;
click an item to navigate; resize to mobile; confirm no transparent square
image backgrounds or torn hat edges. If the image assets fail to load, V2
geometry appears automatically.
