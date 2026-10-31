import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { POOL } from './layout';

/**
 * Planters on the deck: real geometry under the same sun as the floats. Each
 * planter's leaves and flowers merge into one mesh, so the whole arrangement is
 * a handful of draw calls. Placement differs by orientation because "the top of
 * the screen" is a different side of the pool in portrait.
 */
type Colour = [number, number, number];

const rgb = (hex: string): Colour => {
  const c = new THREE.Color(hex).convertSRGBToLinear();
  return [c.r, c.g, c.b];
};
const mix = (a: Colour, b: Colour, t: number): Colour => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const LEAF_DARK = rgb('#1f6b3e');
const LEAF_LIGHT = rgb('#5fbf63');
const FROND_DARK = rgb('#2c7d46');
const FROND_LIGHT = rgb('#8ad06a');
const RIB = rgb('#b4e08a');

interface Blade {
  origin: THREE.Vector3;
  yaw: number;
  /** how steeply it rises, as a slope */
  rise: number;
  /** how much it falls back towards the tip */
  droop: number;
  length: number;
  width: number;
  base: Colour;
  tip: Colour;
  rib?: Colour;
  segments?: number;
}

/** Collects blades into one indexed mesh. */
class Foliage {
  private positions: number[] = [];
  private colours: number[] = [];
  private indices: number[] = [];

  blade({ origin, yaw, rise, droop, length, width, base, tip, rib, segments = 8 }: Blade) {
    const start = this.positions.length / 3;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const along = length * t;
      const up = length * (rise * t - droop * t * t);
      const half = width * Math.sin(Math.PI * Math.pow(t, 0.75));
      for (const side of [-1, 0, 1]) {
        // Folded along the rib, so the two halves catch the sun differently.
        const out = side * half;
        const lift = up + Math.abs(side) * half * 0.34;
        this.positions.push(origin.x + along * c - out * s, origin.y + lift, origin.z + along * s + out * c);
        const colour = mix(base, tip, t * 0.85);
        const shade = side === 0 && rib ? mix(colour, rib, 0.7) : colour;
        this.colours.push(...shade);
      }
    }
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < 2; j++) {
        const a = start + i * 3 + j;
        this.indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
      }
    }
  }

  /** A palm-like frond: a stem carrying pairs of narrow leaflets. */
  frond(origin: THREE.Vector3, yaw: number, length: number, rise: number) {
    const pairs = 11;
    const droop = rise * 1.25;
    for (let i = 1; i <= pairs; i++) {
      const t = i / (pairs + 1);
      const along = length * t;
      const at = new THREE.Vector3(origin.x + along * Math.cos(yaw), origin.y + length * (rise * t - droop * t * t), origin.z + along * Math.sin(yaw));
      const size = length * 0.42 * Math.sin(Math.PI * (0.16 + t * 0.8));
      for (const side of [-1, 1]) {
        this.blade({ origin: at, yaw: yaw + side * (1.15 - t * 0.5), rise: 0.2, droop: 0.5, length: size, width: size * 0.09, base: FROND_DARK, tip: FROND_LIGHT, segments: 3 });
      }
    }
  }

  /** Five soft petals around a small centre. */
  flower(at: THREE.Vector3, size: number, outer: Colour, inner: Colour, turn: number) {
    for (let i = 0; i < 5; i++) {
      this.blade({ origin: at, yaw: turn + (i / 5) * Math.PI * 2, rise: 0.5, droop: 0.42, length: size, width: size * 0.44, base: inner, tip: outer, segments: 4 });
    }
    const heart = rgb('#ffd84d');
    for (let i = 0; i < 3; i++) {
      this.blade({ origin: at, yaw: turn + i * 2.1, rise: 1.4, droop: 0.2, length: size * 0.34, width: size * 0.09, base: heart, tip: heart, segments: 2 });
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colours, 3));
    g.setIndex(this.indices);
    g.computeVertexNormals();
    return g;
  }
}

/** Small seeded generator, so the planting is the same on every visit. */
function seeded(seed: number) {
  let n = seed;
  return (lo = 0, hi = 1) => {
    n = (n * 16807) % 2147483647;
    return lo + (n / 2147483647) * (hi - lo);
  };
}

const CORAL = rgb('#f2553d');
const PINK = rgb('#ff8fb0');
const WHITE = rgb('#fff6e6');
const BLUSH = rgb('#ffd07a');

interface PlanterSpec {
  width: number;
  depth: number;
  seed: number;
  blades: number;
  fronds: number;
  flowers: [Colour, Colour][];
}

const SPECS: PlanterSpec[] = [
  { width: 0.66, depth: 0.19, seed: 41, blades: 11, fronds: 4, flowers: [[CORAL, PINK], [WHITE, BLUSH], [CORAL, PINK], [WHITE, BLUSH], [PINK, WHITE]] },
  { width: 0.26, depth: 0.2, seed: 97, blades: 6, fronds: 2, flowers: [[WHITE, BLUSH], [PINK, WHITE]] },
  { width: 0.2, depth: 0.17, seed: 211, blades: 4, fronds: 2, flowers: [[CORAL, PINK]] },
];

function plantedGeometry(spec: PlanterSpec) {
  const random = seeded(spec.seed);
  const f = new Foliage();
  const soil = 0.09;
  const spot = (t: number) => new THREE.Vector3((t - 0.5) * spec.width * 0.82, soil, random(-0.3, 0.3) * spec.depth);
  for (let i = 0; i < spec.fronds; i++) {
    f.frond(spot((i + 0.5) / spec.fronds), (i / spec.fronds) * Math.PI * 2 + random(-0.4, 0.4), random(0.24, 0.31), 1.05);
  }
  for (let i = 0; i < spec.blades; i++) {
    const length = random(0.17, 0.27);
    f.blade({
      origin: spot(random()),
      yaw: (i / spec.blades) * Math.PI * 2 + random(-0.3, 0.3),
      rise: random(1.1, 1.8),
      droop: random(0.8, 1.2),
      length,
      width: length * random(0.15, 0.2),
      base: LEAF_DARK,
      tip: LEAF_LIGHT,
      rib: RIB,
    });
  }
  // Flowers sit on top, near the front edges, where a camera above can see them.
  spec.flowers.forEach(([outer, inner], i) => {
    const t = (i + 0.5) / spec.flowers.length;
    const at = new THREE.Vector3((t - 0.5) * spec.width * 0.86, soil + random(0.05, 0.1), random(-0.5, 0.5) * spec.depth);
    f.flower(at, random(0.042, 0.054), outer, inner, random(0, 6));
  });
  return f.build();
}

interface Pose {
  x: number;
  z: number;
  yaw: number;
  size: number;
}

// Portrait: screen-up is world -x, screen-right is world -z, the ladder is near
// z = -0.7, so the planting gathers to its left. Landscape: screen-up is world -z.
const POSES: { landscape: Pose; portrait: Pose }[] = [
  { landscape: { x: -0.06, z: -1.33, yaw: 0, size: 0.66 }, portrait: { x: -1.95, z: 0.5, yaw: Math.PI / 2, size: 0.74 } },
  { landscape: { x: 1.84, z: -1.29, yaw: 0.5, size: 0.56 }, portrait: { x: -1.97, z: -0.16, yaw: 1.2, size: 0.62 } },
  { landscape: { x: 0.44, z: -1.34, yaw: 0.2, size: 0.5 }, portrait: { x: 1.9, z: -0.42, yaw: 0.4, size: 0.66 } },
];

export interface Planting {
  group: THREE.Group;
  /** `fits` says whether a planter has room at a world position; if not, it hides */
  place(portrait: boolean, sun: THREE.Vector3, fits: (x: number, z: number, reach: number) => boolean): void;
  animate(time: number): void;
  /** world position and reach of each planter, for layout tests */
  spots(): { x: number; z: number; reach: number }[];
  dispose(): void;
}

export function buildPlanting(): Planting {
  const group = new THREE.Group();
  group.position.y = POOL.rimH;
  const leaves = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, side: THREE.DoubleSide });
  const stone = new THREE.MeshStandardMaterial({ color: '#efe4d0', roughness: 0.82 });
  const soil = new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 1 });

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const c = shadowCanvas.getContext('2d');
  if (c) {
    const g = c.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(70,52,44,0.62)');
    g.addColorStop(0.55, 'rgba(70,52,44,0.3)');
    g.addColorStop(1, 'rgba(70,52,44,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  shadowTex.colorSpace = THREE.SRGBColorSpace;
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false });
  const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  const planters = SPECS.map((spec) => {
    const holder = new THREE.Group();
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.002;
    shadow.scale.set(spec.width * 2.1, 1, spec.depth * 4.6);
    shadow.renderOrder = 1;
    const box = new THREE.Mesh(new RoundedBoxGeometry(spec.width, 0.1, spec.depth, 3, 0.022), stone);
    box.position.y = 0.05;
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(spec.width - 0.05, spec.depth - 0.05).rotateX(-Math.PI / 2), soil);
    dirt.position.y = 0.101;
    const foliage = new THREE.Group();
    foliage.add(new THREE.Mesh(plantedGeometry(spec), leaves));
    holder.add(shadow, box, dirt, foliage);
    group.add(holder);
    return { holder, shadow, foliage, phase: spec.seed };
  });

  return {
    group,
    place(portrait, sun, fits) {
      planters.forEach(({ holder, shadow }, i) => {
        const pose = portrait ? POSES[i].portrait : POSES[i].landscape;
        holder.visible = fits(pose.x, pose.z, 0.3 * pose.size);
        holder.position.set(pose.x, 0, pose.z);
        holder.rotation.y = pose.yaw;
        holder.scale.setScalar(pose.size);
        // Cast away from the sun, whichever way the planter is turned.
        const away = new THREE.Vector3(-sun.x, 0, -sun.z).multiplyScalar(0.34).applyAxisAngle(new THREE.Vector3(0, 1, 0), -pose.yaw);
        shadow.position.set(away.x, 0.002, away.z);
      });
    },
    animate(time) {
      for (const p of planters) p.foliage.rotation.y = Math.sin(time * 0.5 + p.phase) * 0.012;
    },
    spots() {
      return planters.filter(({ holder }) => holder.visible).map(({ holder }) => ({ x: holder.position.x, z: holder.position.z, reach: 0.3 * holder.scale.x }));
    },
    dispose() {
      shadowTex.dispose();
    },
  };
}
