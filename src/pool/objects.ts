import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PoolObjectId } from './layout';

/**
 * Branded 3D rounded floats use local app icon textures and physical
 * beveled side shells; About uses a folded paper-boat mesh. Every builder returns a group whose top face points +y,
 * whose "screen-up" points -z and whose waterline sits at y = 0.
 */
export interface BuiltObject {
  group: THREE.Group;
  /** footprint half extents in local x / z (before yaw) */
  hx: number;
  hz: number;
  /** total height above the waterline */
  top: number;
  /** footprint used by the water shader: 0 rounded square, 1 disc, -1 none */
  shape: number;
  updateWater?(water: THREE.Texture, halfSize: THREE.Vector2, bob: number): void;
}

const disposables: { dispose(): void }[] = [];
const track = <T extends { dispose(): void }>(x: T): T => {
  disposables.push(x);
  return x;
};
export const disposeObjectResources = () => {
  while (disposables.length) disposables.pop()!.dispose();
};

const clay = (color: string, roughness = 0.5, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
  track(
    new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      clearcoat: 0.4,
      clearcoatRoughness: 0.35,
      ...extra,
    }),
  );


const rbox = (w: number, h: number, d: number, r: number, seg = 4) =>
  track(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)));

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  return m;
}

/* ------------------------------------------------------------- */
/* Canvas helpers                                                   */
/* ------------------------------------------------------------- */
const roundRectPath = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

const fontsReady = (): Promise<void> => {
  const f = (globalThis as { document?: Document }).document?.fonts;
  if (!f) return Promise.resolve();
  return Promise.all([f.load('700 64px "Source Serif 4"'), f.load('italic 500 40px "Source Serif 4"')])
    .then(() => undefined)
    .catch(() => undefined);
};

/* ------------------------------------------------------------- */
/* About — Martin's paper boat                                     */
/* ------------------------------------------------------------- */
function paperBoat(): BuiltObject {
  const g = new THREE.Group();
  const H = 0.085; // gunwale height
  const A = 0.235; // bow/stern half length at the top
  const B = 0.12; // keel half length
  const W = 0.085; // half beam at the top
  const K = -0.025; // keel height
  // Hull side texture carries the name, like the printed boat in the reference.
  const sideCanvas = document.createElement('canvas');
  sideCanvas.width = 1024;
  sideCanvas.height = 256;
  const sideTex = track(new THREE.CanvasTexture(sideCanvas));
  sideTex.colorSpace = THREE.SRGBColorSpace;
  sideTex.anisotropy = 8;
  const paintSide = () => {
    const c = sideCanvas.getContext('2d');
    if (!c) return;
    const grad = c.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#eef0ee');
    c.fillStyle = grad;
    c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = 'rgba(120,140,150,0.18)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(512, 0);
    c.lineTo(512, 256);
    c.stroke();
    c.fillStyle = '#16345a';
    c.font = 'italic 800 104px "Instrument Sans", Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.save();
    c.translate(512, 118);
    c.rotate(-0.06);
    c.fillText('About Martin', 0, 0, 760);
    c.restore();
    sideTex.needsUpdate = true;
  };
  paintSide();
  fontsReady().then(paintSide);

  const paper = clay('#fbfbf8', 0.82, { side: THREE.DoubleSide, clearcoat: 0.05 });
  const paperShade = clay('#e6ebe8', 0.86, { side: THREE.DoubleSide, clearcoat: 0 });
  const printed = track(new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.85, side: THREE.DoubleSide }));

  const geo = (pos: number[], uv?: number[]) => {
    const b = track(new THREE.BufferGeometry());
    b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uv) b.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    b.computeVertexNormals();
    return b;
  };
  const uvOf = (x: number, y: number) => [(x + A) / (2 * A), (y - K) / (H - K)];
  for (const side of [1, -1]) {
    const bow = [-A, H, 0], ul = [-0.11, H, side * W], ur = [0.11, H, side * W], stern = [A, H, 0];
    const kl = [-B, K, 0], kr = [B, K, 0];
    const tris = [bow, kl, ul, ul, kl, kr, ul, kr, ur, ur, kr, stern];
    const pos = tris.flat();
    const uv = tris.flatMap(([x, y]) => uvOf(x, y));
    g.add(new THREE.Mesh(geo(pos, uv), side > 0 ? printed : paper));
  }
  // Inside of the hull (seen from above) and the two-layer sail.
  g.add(new THREE.Mesh(geo([-A, H - 0.004, 0, -0.11, H - 0.004, W, 0.11, H - 0.004, W, -A, H - 0.004, 0, 0.11, H - 0.004, W, A, H - 0.004, 0,
    -A, H - 0.004, 0, 0.11, H - 0.004, -W, -0.11, H - 0.004, -W, -A, H - 0.004, 0, A, H - 0.004, 0, 0.11, H - 0.004, -W]), paperShade));
  for (const side of [1, -1]) {
    g.add(new THREE.Mesh(geo([-0.12, H, side * 0.022, 0.12, H, side * 0.022, 0, H + 0.16, 0]), side > 0 ? paper : paperShade));
  }
  // Tip the boat toward the overhead camera so the printed side and the sail read.
  g.rotation.x = -1.05;
  g.position.y = 0.035;
  const wrap = new THREE.Group();
  wrap.add(g);
  return { group: wrap, hx: 0.235, hz: 0.12, top: 0.16, shape: -1 };
}

type BrandId = 'meetfolio' | 'abtrace' | 'document-ai' | 'fanscope' | 'adapt-to-china';

const FACE: Record<BrandId, { body: string; ink: string; name: string | null }> = {
  'adapt-to-china': { body: '#f7f2ea', ink: '#1d3a5f', name: null },
  meetfolio: { body: '#2b5f4c', ink: '#ffffff', name: 'Meetfolio' },
  abtrace: { body: '#0f5c52', ink: '#ffffff', name: 'AbTrace' },
  'document-ai': { body: '#f4f7fa', ink: '#1d3a5f', name: 'Document AI' },
  fanscope: { body: '#173a63', ink: '#ffffff', name: 'FanScope' },
};

/** Paint the top face of a float: brand mark + printed name, like an app-icon cushion. */
function paintFace(id: BrandId, canvas: HTMLCanvasElement, icon: HTMLImageElement | null, round: boolean) {
  const S = canvas.width;
  const c = canvas.getContext('2d');
  if (!c) return;
  const f = FACE[id];
  c.clearRect(0, 0, S, S);
  c.save();
  if (round) {
    c.beginPath();
    c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  } else roundRectPath(c, 0, 0, S, S, S * 0.2);
  c.clip();
  c.fillStyle = f.body;
  c.fillRect(0, 0, S, S);

  if (id === 'adapt-to-china') {
    if (icon) c.drawImage(icon, 0, 0, S, S);
  } else if (id === 'fanscope') {
    // Brand mark redrawn crisply: teal tile with a white play mark.
    const t = S * 0.4, x = (S - t) / 2, y = S * 0.14;
    const g = c.createLinearGradient(x, y, x + t, y + t);
    g.addColorStop(0, '#5fd4c8');
    g.addColorStop(1, '#1f9a96');
    c.fillStyle = g;
    roundRectPath(c, x, y, t, t, t * 0.24);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x + t * 0.38, y + t * 0.3);
    c.lineTo(x + t * 0.38, y + t * 0.7);
    c.lineTo(x + t * 0.72, y + t * 0.5);
    c.closePath();
    c.fill();
  } else if (icon) {
    // Crop the mark out of the supplied icon and feather it into the cushion colour.
    const off = document.createElement('canvas');
    off.width = off.height = S;
    const o = off.getContext('2d')!;
    const k = ({ meetfolio: [0.72, 0.56, 0.4, 0.52], abtrace: [0.8, 0.62, 0.42, 0.53], 'document-ai': [0.86, 0.66, 0.47, 0.55] } as Record<string, number[]>)[id] ?? [0.7, 0.58, 0.4, 0.52];
    const crop = k[0], sx = icon.width * (1 - crop) / 2, sy = icon.height * (1 - crop) / 2;
    const size = S * k[1], dx = (S - size) / 2, dy = S * 0.05;
    o.drawImage(icon, sx, sy, icon.width * crop, icon.height * crop, dx, dy, size, size);
    o.globalCompositeOperation = 'destination-in';
    const m = o.createRadialGradient(S / 2, dy + size / 2, size * k[2], S / 2, dy + size / 2, size * k[3]);
    m.addColorStop(0, 'rgba(0,0,0,1)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = m;
    o.fillRect(0, 0, S, S);
    c.drawImage(off, 0, 0);
  }

  if (f.name) {
    c.fillStyle = f.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${Math.round(S * 0.15)}px "Cahuenga", "Source Serif 4", Georgia, serif`;
    c.shadowColor = f.ink === '#ffffff' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.4)';
    c.shadowBlur = S * 0.01;
    c.shadowOffsetY = S * 0.006;
    c.fillText(f.name, S / 2, S * 0.8, S * 0.84);
  }
  // Wet, glossy top: soft highlight from the upper-left sun.
  c.shadowColor = 'transparent';
  const gl = c.createLinearGradient(0, 0, S * 0.7, S * 0.9);
  gl.addColorStop(0, 'rgba(255,255,255,0.20)');
  gl.addColorStop(0.45, 'rgba(255,255,255,0.0)');
  c.fillStyle = gl;
  c.fillRect(0, 0, S, S);
  c.restore();
}

/**
 * App-icon cushion float: a soft, puffy rounded body in the brand colour with
 * the mark and the project name printed on top. The lower part sits below the
 * waterline; the water shader draws it refracted and tinted (submergedBodies).
 */
function brandFloat(id: BrandId, isRound = false): BuiltObject {
  const group = new THREE.Group();
  const diameter = isRound ? 0.6 : 0.42;
  const radius = diameter * 0.5;
  const f = FACE[id];
  const body = clay(f.body, 0.32, { clearcoat: 0.85, clearcoatRoughness: 0.12, sheen: 0.2 });
  if (isRound) {
    group.add(mesh(track(new THREE.CylinderGeometry(radius, radius, 0.13, 96)), body, 0, 0.0, 0));
    const torus = mesh(track(new THREE.TorusGeometry(radius - 0.03, 0.032, 18, 96)), body, 0, 0.064, 0);
    torus.rotation.x = -Math.PI / 2;
    group.add(torus);
    group.add(mesh(track(new THREE.CylinderGeometry(radius - 0.03, radius - 0.03, 0.03, 96)), body, 0, 0.068, 0));
  } else {
    // Puffy cushion: a very rounded box plus a slightly domed top pad.
    group.add(mesh(rbox(diameter, 0.135, diameter, 0.07, 8), body, 0, 0.0, 0));
    group.add(mesh(rbox(diameter * 0.94, 0.04, diameter * 0.94, 0.06, 6), body, 0, 0.058, 0));
  }
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const tex = track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 12;
  let icon: HTMLImageElement | null = null;
  const repaint = () => {
    paintFace(id, canvas, icon, isRound);
    tex.needsUpdate = true;
  };
  repaint();
  if (id !== 'fanscope') {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      icon = img;
      repaint();
    };
    img.src = `/assets/icons/${id}.png`;
  }
  fontsReady().then(repaint);
  const faceMat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, toneMapped: false }));
  const face = isRound
    ? track(new THREE.CircleGeometry(radius - 0.045, 96)).rotateX(-Math.PI / 2)
    : track(new THREE.PlaneGeometry(diameter * 0.9, diameter * 0.9)).rotateX(-Math.PI / 2);
  const faceMesh = mesh(face, faceMat, 0, isRound ? 0.0845 : 0.0795, 0);
  faceMesh.renderOrder = 1;
  group.add(faceMesh);
  return { group, hx: radius, hz: radius, top: 0.09, shape: isRound ? 1 : 0 };
}

export const builders: Record<PoolObjectId, () => BuiltObject> = {
  'adapt-to-china': () => brandFloat('adapt-to-china', true),
  meetfolio: () => brandFloat('meetfolio'),
  abtrace: () => brandFloat('abtrace'),
  'supplier-document-intelligence': () => brandFloat('document-ai'),
  fanscope: () => brandFloat('fanscope'),
  about: paperBoat,
};

/** Consistent, physically modest app floats around the underwater identity. */
export const baseScale: Record<PoolObjectId, number> = {
  'adapt-to-china': 1.0,
  meetfolio: 1.00,
  abtrace: 1.00,
  'supplier-document-intelligence': 1.00,
  fanscope: 1.00,
  about: 1.35,
};
