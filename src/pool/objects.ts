import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PoolObjectId } from './layout';

/**
 * Everything floating in the pool. Projects are thick branded cushions, a paper
 * boat sails to About, a swim ring to Life, and a few rubber ducks drift around
 * for company. Every builder returns a group whose top faces +y, whose
 * "screen-up" points -z and whose waterline sits at y = 0. Anything below y = 0
 * is hidden by the opaque water mesh and drawn by the water shader from the
 * footprint map instead (FloatShadows).
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

const signedPow = (n: number, e: number) => Math.sign(n) * Math.pow(Math.abs(n), e);

const fontsReady = (): Promise<void> => {
  const f = (globalThis as { document?: Document }).document?.fonts;
  if (!f) return Promise.resolve();
  return f.load('400 40px "Cherry Cream Soda"').then(() => undefined).catch(() => undefined);
};

function canvasTexture(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, texture, c: canvas.getContext('2d') };
}

/* ------------------------------------------------------------- */
/* Project cushions                                                 */
/* ------------------------------------------------------------- */
type BrandId = 'meetfolio' | 'abtrace' | 'document-ai' | 'fanscope' | 'adapt-to-china';

/** Share of each supplied icon that holds the mark, and how much of the face it fills. */
const FACES: Record<BrandId, { body: string; ink: string; name: string | null; crop: number; mark: number }> = {
  'adapt-to-china': { body: '#f7f2ea', ink: '#1d3a5f', name: null, crop: 1, mark: 1 },
  meetfolio: { body: '#245a47', ink: '#ffffff', name: 'Meetfolio', crop: 0.72, mark: 0.54 },
  abtrace: { body: '#0f5c52', ink: '#ffffff', name: 'AbTrace', crop: 0.82, mark: 0.6 },
  'document-ai': { body: '#f4f7fa', ink: '#0d2746', name: 'Document AI', crop: 0.86, mark: 0.6 },
  fanscope: { body: '#173a63', ink: '#ffffff', name: 'FanScope', crop: 1, mark: 0.44 },
};

/** Paint the cushion's top: the brand mark, feathered into its colour, and its name. */
function paintFace(id: BrandId, c: CanvasRenderingContext2D, size: number, icon: HTMLImageElement | null) {
  const f = FACES[id];
  c.clearRect(0, 0, size, size);
  c.fillStyle = f.body;
  c.fillRect(0, 0, size, size);
  if (icon && id === 'adapt-to-china') {
    const inset = size * 0.08;
    c.drawImage(icon, inset, inset, size - inset * 2, size - inset * 2);
  } else if (icon) {
    const off = document.createElement('canvas');
    off.width = off.height = size;
    const o = off.getContext('2d')!;
    const crop = icon.width * f.crop;
    const from = (icon.width - crop) / 2;
    const mark = size * f.mark;
    const x = (size - mark) / 2;
    const y = size * 0.15;
    o.drawImage(icon, from, from, crop, crop, x, y, mark, mark);
    o.globalCompositeOperation = 'destination-in';
    const feather = o.createRadialGradient(size / 2, y + mark / 2, mark * 0.44, size / 2, y + mark / 2, mark * 0.6);
    feather.addColorStop(0, 'rgba(0,0,0,1)');
    feather.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = feather;
    o.fillRect(0, 0, size, size);
    // Marks on a dark tile are screened on, so the tile melts into the cushion.
    c.globalCompositeOperation = id === 'abtrace' ? 'screen' : 'source-over';
    c.drawImage(off, 0, 0);
    c.globalCompositeOperation = 'source-over';
  }
  if (f.name) {
    c.fillStyle = f.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `400 ${Math.round(size * 0.112)}px "Cherry Cream Soda", Georgia, serif`;
    c.fillText(f.name, size / 2, size * 0.75, size * 0.66);
  }
}

/** A plump, rounded-square cushion (or disc), flat-topped and printed from above. */
function cushionGeometry(round: boolean) {
  const geo = sculptedSphere([96, 64], (v) => {
    const y = signedPow(v.y, 0.62);
    if (round) {
      const r = Math.hypot(v.x, v.z) || 1;
      const k = signedPow(r, 0.42) / r;
      v.set(v.x * k, y, v.z * k);
    } else {
      v.set(signedPow(v.x, 0.42), y, signedPow(v.z, 0.42));
    }
  });
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) + 1) / 2;
    uv[i * 2 + 1] = (1 - p.getZ(i)) / 2;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

function brandFloat(id: BrandId): BuiltObject {
  const round = id === 'adapt-to-china';
  const half = round ? 0.235 : 0.148;
  const height = round ? 0.13 : 0.15;
  const { canvas, texture, c } = canvasTexture(512, 512);
  let icon: HTMLImageElement | null = null;
  const repaint = () => {
    if (!c) return;
    paintFace(id, c, canvas.width, icon);
    texture.needsUpdate = true;
  };
  repaint();
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    icon = img;
    repaint();
  };
  img.src = `/assets/icons/${id}.png`;
  fontsReady().then(repaint);

  const body = mesh(
    shared(round ? 'cushion-round' : 'cushion-square', () => cushionGeometry(round)),
    vinyl('#ffffff', 0.5, { map: texture, clearcoat: 0.5, clearcoatRoughness: 0.24, envMapIntensity: 0.3 }),
    0,
    height * 0.14,
    0,
  );
  body.scale.set(half, height / 2, half);
  const group = new THREE.Group();
  group.add(body);
  return { group, radius: half + 0.012, top: height * 0.64, mass: round ? 1.7 : 1.1, maxTilt: round ? 0.11 : 0.17 };
}

/* ------------------------------------------------------------- */
/* About — the folded paper boat                                    */
/* ------------------------------------------------------------- */
function paperBoat(): BuiltObject {
  const boat = new THREE.Group();
  const sheet = matte('#ffffff', 0.78);
  sheet.side = THREE.DoubleSide;
  sheet.flatShading = true;
  const shade = matte('#dfe8ea', 0.84);
  shade.side = THREE.DoubleSide;
  shade.flatShading = true;
  const L = 0.235; // bow and stern
  const K = 0.115; // keel half length
  const B = 0.088; // half beam at the gunwale
  const H = 0.082; // gunwale height
  const D = -0.03; // keel depth
  const mid = 0.085; // where the gunwale reaches full beam
  const tris = (points: number[], mat: THREE.Material, uvs?: number[]) => {
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    if (uvs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    boat.add(new THREE.Mesh(g, mat));
  };

  // The camera-side hull carries the name, as a printed paper boat would.
  const { canvas, texture, c } = canvasTexture(1024, 256);
  const paintHull = () => {
    if (!c) return;
    c.fillStyle = '#fdfdfa';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#1d3a5f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '400 92px "Cherry Cream Soda", Georgia, serif';
    c.fillText('About Martin', 512, 128, 640);
    texture.needsUpdate = true;
  };
  paintHull();
  fontsReady().then(paintHull);
  const printed = track(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.78, side: THREE.DoubleSide }));

  for (const s of [1, -1]) {
    const hull = [
      [-L, H, 0], [-K, D, 0], [-mid, H, s * B],
      [-mid, H, s * B], [-K, D, 0], [K, D, 0],
      [-mid, H, s * B], [K, D, 0], [mid, H, s * B],
      [mid, H, s * B], [K, D, 0], [L, H, 0],
    ];
    const uvs = hull.flatMap(([x, y]) => [(x + L) / (2 * L), (y - D) / (H - D)]);
    tris(hull.flat(), s > 0 ? printed : shade, uvs);
    // Inside of the fold, seen from above.
    tris([
      -L, H, 0, -mid, H, s * B, 0, H * 0.2, 0,
      -mid, H, s * B, mid, H, s * B, 0, H * 0.2, 0,
      mid, H, s * B, L, H, 0, 0, H * 0.2, 0,
    ], shade);
    // The two faces of the central peak.
    tris([-0.11, H * 0.6, s * 0.02, 0.11, H * 0.6, s * 0.02, 0, H + 0.17, 0], s > 0 ? sheet : shade);
  }
  // Heeled away from the camera, which lifts the printed side into view.
  boat.rotation.x = -0.62;
  boat.position.y = 0.036;
  const group = new THREE.Group();
  group.add(boat);
  return {
    group,
    radius: 0.17,
    top: 0.24,
    mass: 0.7,
    maxTilt: 0.14,
    animate(time) {
      boat.rotation.z = Math.sin(time * 1.1) * 0.04;
    },
  };
}

/* ------------------------------------------------------------- */
/* Life — a striped swim ring                                       */
/* ------------------------------------------------------------- */
function swimRing(): BuiltObject {
  const { canvas, texture, c } = canvasTexture(1024, 256);
  texture.wrapS = THREE.RepeatWrapping;
  const paint = () => {
    if (!c) return;
    const segments = 8;
    const w = canvas.width / segments;
    for (let i = 0; i < segments; i++) {
      c.fillStyle = i % 2 ? '#fff8ee' : '#f2553d';
      c.fillRect(i * w, 0, w + 1, canvas.height);
    }
    // Printed across the top of the tube, on the white segments only.
    c.fillStyle = '#c93a24';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '400 58px "Cherry Cream Soda", Georgia, serif';
    c.save();
    c.translate(1.5 * w, canvas.height * 0.25);
    c.rotate(Math.PI);
    c.fillText('Life', 0, 0);
    c.restore();
    texture.needsUpdate = true;
  };
  paint();
  fontsReady().then(paint);
  const R = 0.122;
  const r = 0.056;
  const tube = mesh(track(new THREE.TorusGeometry(R, r, 28, 96)), vinyl('#ffffff', 0.24, { map: texture, clearcoat: 1, clearcoatRoughness: 0.12 }), 0, 0.016, 0);
  tube.rotation.x = Math.PI / 2;
  const valve = mesh(track(new THREE.CapsuleGeometry(0.008, 0.014, 4, 8)), matte('#f2d9c9', 0.4), R * 0.72, 0.07, R * 0.72);
  const group = new THREE.Group();
  group.add(tube, valve);
  return { group, radius: R + r, top: 0.08, mass: 0.9, maxTilt: 0.18 };
}

/* ------------------------------------------------------------- */
/* Rubber ducks                                                     */
/* ------------------------------------------------------------- */
type Accessory = 'sunglasses' | 'snorkel' | 'sunhat';

const accessoryBuilders: Record<Accessory, (head: THREE.Group) => void> = {
  sunglasses(head) {
    const frame = matte('#14171c', 0.26, 0.2);
    const rim = shared('shade-rim', () => new THREE.TorusGeometry(0.17, 0.03, 8, 26));
    const disc = shared('shade-lens', () => new THREE.CircleGeometry(0.165, 24));
    const lens = vinyl('#1b2430', 0.1);
    for (const side of [1, -1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.215, 0.16, 0.47);
      eye.rotation.set(-0.3, side * 0.42, 0);
      eye.add(new THREE.Mesh(rim, frame), new THREE.Mesh(disc, lens));
      head.add(eye);
    }
    const bridge = mesh(shared('shade-bridge', () => new THREE.CapsuleGeometry(0.024, 0.1, 4, 8)), frame, 0, 0.2, 0.53);
    bridge.rotation.z = Math.PI / 2;
    head.add(bridge);
  },
  snorkel(head) {
    const mask = vinyl('#1f9a96', 0.3);
    const visor = mesh(shared('mask-visor', () => new THREE.SphereGeometry(0.34, 20, 14)), vinyl('#a9e9f2', 0.06, { clearcoat: 1 }), 0, 0.17, 0.36);
    visor.scale.set(1.15, 0.62, 0.62);
    const skirt = mesh(shared('mask-skirt', () => new THREE.SphereGeometry(0.39, 20, 14)), mask, 0, 0.16, 0.32);
    skirt.scale.set(1.16, 0.68, 0.56);
    const strap = mesh(shared('mask-strap', () => new THREE.TorusGeometry(0.53, 0.035, 8, 40)), mask, 0, 0.1, 0);
    strap.rotation.x = Math.PI / 2 - 0.1;
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
  sunhat(head) {
    const straw = matte('#f0d9a6', 0.72);
    const brim = mesh(shared('hat-brim', () => new THREE.CylinderGeometry(0.78, 0.86, 0.035, 40)), straw, 0, 0.42, -0.04);
    const crown = mesh(shared('hat-crown', () => new THREE.SphereGeometry(0.42, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)), straw, 0, 0.42, -0.04);
    crown.scale.y = 0.82;
    const band = mesh(shared('hat-band', () => new THREE.CylinderGeometry(0.425, 0.43, 0.09, 32, 1, true)), matte('#d84a33', 0.5), 0, 0.47, -0.05);
    // Pushed back off the face, the way a hat sits on someone looking up.
    const hat = new THREE.Group();
    hat.rotation.x = -0.5;
    hat.position.set(0, -0.08, -0.12);
    hat.add(brim, crown, band);
    head.add(hat);
  },
};

/** Built around a 2-unit-long body; the caller scales it. Faces +z. */
function rubberDuck(accessory?: Accessory): BuiltObject {
  const duck = new THREE.Group();
  const rubber = vinyl('#ffcb2e', 0.27, { clearcoat: 0.9, clearcoatRoughness: 0.14, sheen: 0.4, sheenColor: new THREE.Color('#ff9d2e') });
  const hull = shared('duck-body', () =>
    sculptedSphere([44, 30], (v) => {
      // Plump, with a short upturned nub of a tail.
      const rear = ramp(-0.5, -1, v.z);
      v.y = v.y * 0.72 + rear * 0.34;
      v.x *= 0.9 - rear * 0.42;
      v.z = v.z * 0.98 - rear * 0.1;
    }),
  );
  duck.add(mesh(hull, rubber, 0, 0.26, 0));
  const neck = mesh(shared('duck-neck', () => new THREE.SphereGeometry(0.46, 20, 14)), rubber, 0, 0.72, 0.36);
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
    const w = mesh(wing, rubber, side * 0.74, 0.44, -0.12);
    w.rotation.set(-0.16, side * 0.14, side * -0.42);
    duck.add(w);
    wings.push(w);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.18, 0.46);
  head.rotation.x = -0.2;
  head.scale.setScalar(1.08);
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
    head.add(mesh(shared('duck-eye', () => new THREE.SphereGeometry(0.082, 14, 10)), pupil, side * 0.25, 0.16, 0.42));
    head.add(mesh(shared('duck-glint', () => new THREE.SphereGeometry(0.027, 8, 6)), glint, side * 0.25 - 0.02, 0.215, 0.475));
  }
  if (accessory) accessoryBuilders[accessory](head);
  duck.add(head);

  const scale = 0.088;
  duck.scale.setScalar(scale);
  const group = new THREE.Group();
  group.add(duck);
  const phase = Math.random() * 10;
  return {
    group,
    radius: scale * 1.05,
    top: scale * 1.7,
    mass: 0.6,
    maxTilt: 0.22,
    animate(time) {
      // Mostly still; every few seconds the duck glances about.
      head.rotation.y = Math.sin(time * 0.31 + phase) * Math.sin(time * 0.13 + phase * 2) * 0.5;
    },
  };
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

/** One per entry in `duckSlots`. */
export const duckBuilders: (() => BuiltObject)[] = [() => rubberDuck(), () => rubberDuck('sunglasses'), () => rubberDuck('sunhat'), () => rubberDuck('snorkel')];
