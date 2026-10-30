import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PoolObjectId } from './layout';

/**
 * Everything floating in the pool. Project floats are small branded kickboards,
 * each pushed along by a rubber duck wearing one project-themed accessory; a
 * paper boat sails to About and a swim ring to Life. Every builder returns a
 * group whose top faces +y, whose "screen-up" points -z and whose waterline
 * sits at y = 0. Anything below y = 0 is hidden by the opaque water mesh and
 * drawn by the water shader from the footprint map instead (FloatShadows).
 */
export interface BuiltObject {
  group: THREE.Group;
  /** radius used for collisions, labels and the hit target */
  radius: number;
  /** total height above the waterline */
  top: number;
  /** how sluggishly it answers the swell: 1 = small and light */
  mass: number;
  /** radians it can rock before its low edge meets the water */
  maxTilt: number;
  /** per-frame idle life: hover is 0…1, drift is the float's speed */
  animate?(time: number, hover: number, drift: number): void;
}

const disposables: { dispose(): void }[] = [];
const track = <T extends { dispose(): void }>(x: T): T => {
  disposables.push(x);
  return x;
};
export const disposeObjectResources = () => {
  while (disposables.length) disposables.pop()!.dispose();
  Object.keys(sharedGeometry).forEach((key) => delete sharedGeometry[key]);
};

const vinyl = (color: string, roughness = 0.3, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
  track(new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22, ...extra }));

const matte = (color: string, roughness = 0.5, metalness = 0) => track(new THREE.MeshStandardMaterial({ color, roughness, metalness }));

/** Ducks repeat, so their geometry is built once and shared. */
const sharedGeometry: Record<string, THREE.BufferGeometry> = {};
const shared = (key: string, build: () => THREE.BufferGeometry) => (sharedGeometry[key] ??= track(build()));

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/** A sphere pushed around per-vertex, welded so it shades without a seam. */
function sculptedSphere(detail: [number, number], shape: (v: THREE.Vector3) => void) {
  const raw = new THREE.SphereGeometry(1, detail[0], detail[1]);
  raw.deleteAttribute('uv');
  raw.deleteAttribute('normal');
  const geo = mergeVertices(raw, 1e-4);
  raw.dispose();
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    shape(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const ramp = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------- */
/* Rubber duck                                                      */
/* ------------------------------------------------------------- */
type Accessory = 'headphones' | 'goggles' | 'glasses' | 'snorkel' | 'sunhat';

const accessoryBuilders: Record<Accessory, (accent: string, head: THREE.Group) => void> = {
  // Meetfolio records and transcribes conversations.
  headphones(accent, head) {
    const band = mesh(shared('hp-band', () => new THREE.TorusGeometry(0.56, 0.06, 10, 32, Math.PI)), vinyl(accent, 0.34));
    band.position.y = 0.04;
    head.add(band);
    const cups = shared('hp-cup', () => new THREE.CapsuleGeometry(0.17, 0.08, 6, 16));
    for (const side of [1, -1]) {
      const cup = mesh(cups, matte('#f7f4ec', 0.38), side * 0.56, 0.03, 0);
      cup.rotation.z = Math.PI / 2;
      head.add(cup);
    }
  },
  // AbTrace is a laboratory workflow: safety goggles.
  goggles(accent, head) {
    const frame = vinyl(accent, 0.3);
    const lens = vinyl('#c9f3ec', 0.08, { clearcoat: 1, transmission: 0, opacity: 0.86, transparent: true });
    const rim = shared('goggle-rim', () => new THREE.TorusGeometry(0.2, 0.05, 10, 26));
    const disc = shared('goggle-lens', () => new THREE.CircleGeometry(0.19, 24));
    for (const side of [1, -1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.235, 0.21, 0.42);
      eye.rotation.set(-0.5, side * 0.42, 0);
      eye.add(new THREE.Mesh(rim, frame), new THREE.Mesh(disc, lens));
      head.add(eye);
    }
    const strap = mesh(shared('goggle-strap', () => new THREE.TorusGeometry(0.53, 0.035, 8, 40)), frame, 0, 0.1, 0);
    strap.rotation.x = Math.PI / 2 - 0.3;
    head.add(strap);
  },
  // Document AI reads every page: round reading glasses.
  glasses(accent, head) {
    const frame = matte(accent, 0.28, 0.35);
    const rim = shared('glass-rim', () => new THREE.TorusGeometry(0.17, 0.026, 8, 26));
    const disc = shared('glass-lens', () => new THREE.CircleGeometry(0.16, 24));
    const lens = vinyl('#ffffff', 0.05, { transparent: true, opacity: 0.28 });
    for (const side of [1, -1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.215, 0.2, 0.44);
      eye.rotation.set(-0.55, side * 0.4, 0);
      eye.add(new THREE.Mesh(rim, frame), new THREE.Mesh(disc, lens));
      head.add(eye);
    }
    const bridge = mesh(shared('glass-bridge', () => new THREE.CapsuleGeometry(0.022, 0.1, 4, 8)), frame, 0, 0.27, 0.5);
    bridge.rotation.z = Math.PI / 2;
    head.add(bridge);
  },
  // FanScope dives into research: mask and snorkel.
  snorkel(accent, head) {
    const mask = vinyl(accent, 0.3);
    const visor = mesh(shared('mask-visor', () => new THREE.SphereGeometry(0.34, 20, 14)), vinyl('#a9e9f2', 0.06, { clearcoat: 1 }), 0, 0.2, 0.34);
    visor.scale.set(1.15, 0.62, 0.62);
    visor.rotation.x = -0.5;
    const skirt = mesh(shared('mask-skirt', () => new THREE.SphereGeometry(0.39, 20, 14)), mask, 0, 0.19, 0.3);
    skirt.scale.set(1.16, 0.68, 0.56);
    skirt.rotation.x = -0.5;
    const strap = mesh(shared('goggle-strap', () => new THREE.TorusGeometry(0.53, 0.035, 8, 40)), mask, 0, 0.1, 0);
    strap.rotation.x = Math.PI / 2 - 0.3;
    const tube = mesh(
      shared('snorkel-tube', () =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([new THREE.Vector3(0.5, -0.12, 0.28), new THREE.Vector3(0.66, 0.1, 0.12), new THREE.Vector3(0.68, 0.48, -0.08), new THREE.Vector3(0.66, 0.82, -0.14)]),
          22, 0.05, 8,
        ),
      ),
      vinyl('#ff8a4c', 0.3),
    );
    head.add(skirt, visor, strap, tube);
  },
  // Adapt to China is about arriving somewhere new: a traveller's sun hat.
  sunhat(accent, head) {
    const straw = matte('#f0d9a6', 0.72);
    const brim = mesh(shared('hat-brim', () => new THREE.CylinderGeometry(0.78, 0.86, 0.035, 40)), straw, 0, 0.42, -0.04);
    brim.rotation.x = -0.14;
    const crown = mesh(shared('hat-crown', () => new THREE.SphereGeometry(0.42, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)), straw, 0, 0.42, -0.04);
    crown.rotation.x = -0.14;
    crown.scale.y = 0.82;
    const band = mesh(shared('hat-band', () => new THREE.CylinderGeometry(0.425, 0.43, 0.09, 32, 1, true)), matte(accent, 0.5), 0, 0.47, -0.05);
    band.rotation.x = -0.14;
    head.add(brim, crown, band);
  },
};

interface DuckOptions {
  body?: string;
  accessory: Accessory;
  accent: string;
}

/** Built around a 2-unit-long body; the caller scales it. Faces +z. */
function rubberDuck({ body = '#ffcb2e', accessory, accent }: DuckOptions) {
  const duck = new THREE.Group();
  const rubber = vinyl(body, 0.27, { clearcoat: 0.9, clearcoatRoughness: 0.14, sheen: 0.4, sheenColor: new THREE.Color('#ff9d2e') });
  const hull = shared('duck-body', () =>
    sculptedSphere([44, 30], (v) => {
      // Plump from above, with only a short upturned nub of a tail.
      const rear = ramp(-0.5, -1, v.z);
      v.y = v.y * 0.7 + rear * 0.3;
      v.x *= 0.92 - rear * 0.42;
      v.z = v.z * 0.98 - rear * 0.08;
    }),
  );
  duck.add(mesh(hull, rubber, 0, 0.2, 0));
  const neck = mesh(shared('duck-neck', () => new THREE.SphereGeometry(0.46, 20, 14)), rubber, 0, 0.62, 0.34);
  neck.scale.set(1, 1.1, 0.95);
  duck.add(neck);

  const wing = shared('duck-wing', () =>
    sculptedSphere([24, 16], (v) => {
      const tip = ramp(0.1, -1, v.z);
      v.x *= 0.14;
      v.y *= 0.3 * (1 - tip * 0.45);
      v.z *= 0.5;
      v.y += tip * tip * 0.1;
    }),
  );
  const wings: THREE.Mesh[] = [];
  for (const side of [1, -1]) {
    const w = mesh(wing, rubber, side * 0.76, 0.36, -0.12);
    w.rotation.set(-0.16, side * 0.14, side * -0.42);
    duck.add(w);
    wings.push(w);
  }

  // The head tips back to look up at the overhead camera, so the face reads.
  const head = new THREE.Group();
  head.position.set(0, 1.02, 0.42);
  head.rotation.x = -0.72;
  head.scale.setScalar(1.16);
  head.add(mesh(shared('duck-head', () => new THREE.SphereGeometry(0.52, 30, 22)), rubber));
  const bill = matte('#ff8a1e', 0.34);
  const upper = mesh(
    shared('duck-bill', () =>
      sculptedSphere([24, 14], (v) => {
        const tip = ramp(0, 1, v.z);
        v.x *= 0.3 + tip * 0.05;
        v.y = v.y * 0.1 + tip * 0.03;
        v.z *= 0.36;
      }),
    ),
    bill, 0, -0.03, 0.54,
  );
  const lower = mesh(shared('duck-lower', () => new THREE.SphereGeometry(1, 16, 10)), bill, 0, -0.1, 0.46);
  lower.scale.set(0.2, 0.05, 0.25);
  head.add(upper, lower);
  const pupil = matte('#101418', 0.12);
  const glint = track(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  for (const side of [1, -1]) {
    head.add(mesh(shared('duck-eye', () => new THREE.SphereGeometry(0.082, 14, 10)), pupil, side * 0.235, 0.2, 0.42));
    head.add(mesh(shared('duck-glint', () => new THREE.SphereGeometry(0.027, 8, 6)), glint, side * 0.235 - 0.02, 0.255, 0.465));
  }
  accessoryBuilders[accessory](accent, head);
  duck.add(head);

  const phase = Math.random() * 10;
  return {
    duck,
    animate(time: number, hover: number) {
      // Mostly still; every few seconds the duck glances about.
      const glance = Math.sin(time * 0.31 + phase) * Math.sin(time * 0.13 + phase * 2);
      head.rotation.y = glance * 0.42 + Math.sin(time * 9) * 0.1 * hover;
      head.rotation.x = -0.72 - hover * 0.1;
      const flap = hover * (0.22 + 0.14 * Math.sin(time * 16));
      wings[0].rotation.z = -0.42 + flap;
      wings[1].rotation.z = 0.42 - flap;
    },
  };
}

/* ------------------------------------------------------------- */
/* Project kickboards                                               */
/* ------------------------------------------------------------- */
type BrandId = 'meetfolio' | 'abtrace' | 'document-ai' | 'fanscope' | 'adapt-to-china';

/** Height of a board's deck above the waterline. */
const FREEBOARD = 0.034;

const FLOATS: Record<BrandId, { board: string; accessory: Accessory; accent: string; perch: number; round?: boolean }> = {
  'adapt-to-china': { board: '#f7f2ea', accessory: 'sunhat', accent: '#d84a33', perch: 2.5, round: true },
  meetfolio: { board: '#2b5f4c', accessory: 'headphones', accent: '#2f8f5b', perch: -2.62 },
  abtrace: { board: '#0f5c52', accessory: 'goggles', accent: '#14a08f', perch: 2.62 },
  'document-ai': { board: '#f4f7fa', accessory: 'glasses', accent: '#1d3a5f', perch: -2.62 },
  fanscope: { board: '#173a63', accessory: 'snorkel', accent: '#1f9a96', perch: 2.86 },
};

function brandFloat(id: BrandId): BuiltObject {
  const f = FLOATS[id];
  const size = f.round ? 0.5 : 0.31;
  const half = size / 2;
  const thickness = 0.052;
  const group = new THREE.Group();
  const board = new THREE.Group();
  group.add(board);
  const foam = vinyl(f.board, 0.42, { clearcoat: 0.55, clearcoatRoughness: 0.3 });
  if (f.round) {
    board.add(mesh(track(new THREE.CylinderGeometry(half, half * 0.97, thickness, 72)), foam));
    const lip = mesh(track(new THREE.TorusGeometry(half - 0.016, 0.022, 14, 72)), foam, 0, thickness / 2, 0);
    lip.rotation.x = Math.PI / 2;
    board.add(lip);
  } else {
    board.add(mesh(track(new RoundedBoxGeometry(size, thickness, size, 5, 0.026)), foam));
  }

  const texture = track(new THREE.TextureLoader().load(`/assets/icons/${id}.png`));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const face = f.round ? track(new THREE.CircleGeometry(half - 0.03, 64)) : track(new THREE.PlaneGeometry(size * 0.86, size * 0.86));
  face.rotateX(-Math.PI / 2);
  // Soft and low in reflection, so the sky never washes out the brand colours.
  const faceMat = track(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.74, envMapIntensity: 0.18, transparent: true, alphaTest: 0.04 }));
  board.add(mesh(face, faceMat, 0, thickness / 2 + 0.003, 0));

  // The duck rests its chest on the board's edge, pushing it along.
  const { duck, animate } = rubberDuck({ accessory: f.accessory, accent: f.accent });
  const scale = 0.102;
  const reach = half * (f.round ? 1.12 : 1.3);
  const seat = new THREE.Group();
  seat.position.set(Math.sin(f.perch) * reach, 0, Math.cos(f.perch) * reach);
  seat.rotation.y = f.perch + Math.PI;
  duck.scale.setScalar(scale);
  seat.add(duck);
  group.add(seat);

  // The board rides high enough that its deck stays dry as it rocks.
  board.position.y = FREEBOARD - thickness / 2;
  return { group, radius: half + 0.075, top: 0.14, mass: f.round ? 1.6 : 1, maxTilt: (FREEBOARD / half) * 0.8, animate };
}

/* ------------------------------------------------------------- */
/* About — the folded paper boat                                    */
/* ------------------------------------------------------------- */
function paperBoat(): BuiltObject {
  const boat = new THREE.Group();
  const sheet = matte('#ffffff', 0.8);
  sheet.side = THREE.DoubleSide;
  sheet.flatShading = true;
  const shade = matte('#dbe6e8', 0.86);
  shade.side = THREE.DoubleSide;
  shade.flatShading = true;
  const tris = (points: number[], mat: THREE.Material) => {
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    g.computeVertexNormals();
    boat.add(new THREE.Mesh(g, mat));
  };
  const L = 0.22; // bow and stern
  const K = 0.11; // keel half length
  const B = 0.085; // half beam at the gunwale
  const H = 0.07; // gunwale height
  const D = -0.03; // keel depth
  const mid = 0.08; // where the gunwale reaches full beam
  for (const s of [1, -1]) {
    tris([
      -L, H, 0, -K, D, 0, -mid, H, s * B,
      -mid, H, s * B, -K, D, 0, K, D, 0,
      -mid, H, s * B, K, D, 0, mid, H, s * B,
      mid, H, s * B, K, D, 0, L, H, 0,
    ], s > 0 ? sheet : shade);
    // Inside of the fold, seen from above.
    tris([
      -L, H, 0, -mid, H, s * B, 0, H * 0.2, 0,
      -mid, H, s * B, mid, H, s * B, 0, H * 0.2, 0,
      mid, H, s * B, L, H, 0, 0, H * 0.2, 0,
    ], shade);
    // The two faces of the central peak.
    tris([-0.1, H * 0.6, s * 0.018, 0.1, H * 0.6, s * 0.018, 0, H + 0.16, 0], s > 0 ? sheet : shade);
  }
  boat.rotation.x = -0.62;
  boat.position.y = 0.014;
  const group = new THREE.Group();
  group.add(boat);
  return {
    group,
    radius: 0.17,
    top: 0.2,
    mass: 0.7,
    maxTilt: 0.16,
    animate(time) {
      boat.rotation.z = Math.sin(time * 1.1) * 0.05;
    },
  };
}

/* ------------------------------------------------------------- */
/* Life — a striped swim ring                                       */
/* ------------------------------------------------------------- */
function swimRing(): BuiltObject {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#fff8ee' : '#f2553d';
      c.fillRect((i * 512) / 8, 0, 512 / 8 + 1, 64);
    }
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  const R = 0.135;
  const r = 0.062;
  const tube = mesh(track(new THREE.TorusGeometry(R, r, 28, 96)), vinyl('#ffffff', 0.24, { map: texture, clearcoat: 1, clearcoatRoughness: 0.12 }), 0, 0.016, 0);
  tube.rotation.x = Math.PI / 2;
  const valve = mesh(track(new THREE.CapsuleGeometry(0.008, 0.014, 4, 8)), matte('#f2d9c9', 0.4), R * 0.72, 0.076, R * 0.72);
  const group = new THREE.Group();
  group.add(tube, valve);
  return { group, radius: R + r, top: 0.08, mass: 0.9, maxTilt: 0.2 };
}

export const builders: Record<PoolObjectId, () => BuiltObject> = {
  'adapt-to-china': () => brandFloat('adapt-to-china'),
  meetfolio: () => brandFloat('meetfolio'),
  abtrace: () => brandFloat('abtrace'),
  'supplier-document-intelligence': () => brandFloat('document-ai'),
  fanscope: () => brandFloat('fanscope'),
  about: paperBoat,
  life: swimRing,
};
