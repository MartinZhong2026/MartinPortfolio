/**
 * GLSL for the pool.
 *
 * The heightfield wave simulation, the normal pass, the caustics "area ratio"
 * technique and the analytic ray-traced pool interior are adapted from
 * Evan Wallace's WebGL Water (MIT, 2011) and its Three.js port
 * jeantimex/threejs-water (MIT, 2026). See ATTRIBUTION.md / licenses/.
 *
 * Changes for this portfolio: rectangular pool with arbitrary half extents,
 * batched multi-drop pass, procedural tile + lane artwork (no texture files),
 * an analytic wind-wave field shared by refraction, caustics and buoyancy,
 * footprint-map waterlines (no per-object shader loops), projected soft
 * shadows, foliage dappling and a sun-glint term for a near top-down camera.
 */

/** One directional wave: wavenumber vector, slope amplitude, speed, phase. */
interface Wave {
  kx: number;
  kz: number;
  slope: number;
  omega: number;
  phase: number;
}

/**
 * Wind waves, fanned out by the golden angle so no two line up. Energy sits in
 * the long and middle waves: those shape broad, irregular patches of light,
 * where short waves would draw a thin bright web. Fine surface detail comes from
 * `rippleTex` instead, which never reaches the caustics. Evaluated on the GPU
 * (all of them) for the surface normal and on the CPU (the long ones) so the
 * floats ride the waves the water is showing.
 */
export const WAVES: Wave[] = Array.from({ length: 8 }, (_, i) => {
  const wavelength = 1.7 * Math.pow(0.74, i);
  const k = (2 * Math.PI) / wavelength;
  const angle = 0.7 + i * 2.39996;
  return { kx: Math.cos(angle) * k, kz: Math.sin(angle) * k, slope: 0.024 * Math.pow(0.84, i), omega: Math.sqrt(k) * 0.78, phase: i * 1.91 };
});

/** Waves long enough to move a float. Short chop averages out under a hull. */
const SWELL = WAVES.slice(0, 3);

/** Surface height and slope of the swell at a world point (CPU side). */
export function swellAt(x: number, z: number, t: number) {
  let height = 0;
  let slopeX = 0;
  let slopeZ = 0;
  for (const w of SWELL) {
    const k = Math.hypot(w.kx, w.kz);
    const a = w.slope / k;
    const theta = w.kx * x + w.kz * z + w.omega * t + w.phase;
    height += a * Math.sin(theta);
    const c = a * Math.cos(theta);
    slopeX += c * w.kx;
    slopeZ += c * w.kz;
  }
  return { height, slopeX, slopeZ };
}

const glslFloat = (n: number) => n.toFixed(5);

const windGlsl = /* glsl */ `
vec2 windSlope(vec2 p, float t) {
  // A slow domain warp breaks up the regularity of summed sines.
  vec2 q = p + 0.075 * vec2(sin(p.y * 2.3 + t * 0.21), cos(p.x * 1.9 - t * 0.17));
  vec2 s = vec2(0.0);
  float a;
${WAVES.map(
  (w) => `  a = ${glslFloat(w.slope / Math.hypot(w.kx, w.kz))} * cos(dot(vec2(${glslFloat(w.kx)}, ${glslFloat(w.kz)}), q) + ${glslFloat(w.omega)} * t + ${glslFloat(w.phase)});
  s += a * vec2(${glslFloat(w.kx)}, ${glslFloat(w.kz)});`,
).join('\n')}
  return s;
}
`;

/**
 * Tiling slope map for fine surface detail, built from random waves with whole
 * cycles per tile. Two scrolling samples of it give the water a living surface
 * at fragment rate, with a fixed cost however large the pool is on screen.
 */
export function buildRippleMap(size: number) {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const waves = Array.from({ length: 26 }, () => {
    const cycles = 2 + Math.floor(random() * random() * 22);
    const angle = random() * Math.PI * 2;
    const fx = Math.round(Math.cos(angle) * cycles);
    const fz = Math.round(Math.sin(angle) * cycles);
    return { fx, fz, phase: random() * Math.PI * 2, amp: 1 / (2 + cycles * 0.45) };
  });
  const data = new Uint8Array(size * size * 4);
  const tau = (Math.PI * 2) / size;
  for (let z = 0, i = 0; z < size; z++) {
    for (let x = 0; x < size; x++, i += 4) {
      let sx = 0;
      let sz = 0;
      for (const w of waves) {
        const c = w.amp * Math.cos((w.fx * x + w.fz * z) * tau + w.phase);
        sx += c * w.fx * 0.06;
        sz += c * w.fz * 0.06;
      }
      data[i] = Math.max(0, Math.min(255, 127.5 + sx * 90));
      data[i + 1] = Math.max(0, Math.min(255, 127.5 + sz * 90));
      data[i + 3] = 255;
    }
  }
  return data;
}

export const fullscreenVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const MAX_DROPS = 16;

export const dropFrag = /* glsl */ `
precision highp float;
const float PI = 3.141592653589793;
uniform sampler2D tex;
uniform vec2 halfSize;
uniform int count;
uniform vec4 drops[${MAX_DROPS}]; // xy: centre (world xz), z: radius, w: strength
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tex, vUv);
  vec2 p = (vUv * 2.0 - 1.0) * halfSize;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= count) break;
    vec4 d = drops[i];
    float f = max(0.0, 1.0 - length(p - d.xy) / d.z);
    f = 0.5 - cos(f * PI) * 0.5;
    info.r += f * d.w;
  }
  gl_FragColor = info;
}
`;

export const updateFrag = /* glsl */ `
precision highp float;
uniform sampler2D tex;
uniform vec2 delta;
uniform float damping;
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tex, vUv);
  vec2 dx = vec2(delta.x, 0.0);
  vec2 dy = vec2(0.0, delta.y);
  float average = (
    texture2D(tex, vUv - dx).r +
    texture2D(tex, vUv - dy).r +
    texture2D(tex, vUv + dx).r +
    texture2D(tex, vUv + dy).r
  ) * 0.25;
  info.g += (average - info.r) * 2.0;
  info.g *= damping;
  info.r += info.g;
  info.r *= 0.9993; // slow relaxation back to a flat surface
  gl_FragColor = info;
}
`;

/** Softens the caustic map: sunlight through water has no hard edges. */
export const blurFrag = /* glsl */ `
precision highp float;
uniform sampler2D tex;
uniform vec2 direction;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tex, vUv) * 0.227027;
  c += (texture2D(tex, vUv + direction * 1.384615) + texture2D(tex, vUv - direction * 1.384615)) * 0.316216;
  c += (texture2D(tex, vUv + direction * 3.230769) + texture2D(tex, vUv - direction * 3.230769)) * 0.070270;
  gl_FragColor = c;
}
`;

export const normalFrag = /* glsl */ `
precision highp float;
uniform sampler2D tex;
uniform vec2 delta;
uniform vec2 cell; // world size of one texel
uniform vec2 halfSize;
uniform float windTime;
varying vec2 vUv;
${windGlsl}
void main() {
  vec4 info = texture2D(tex, vUv);
  vec2 ripple = vec2(
    texture2D(tex, vec2(vUv.x + delta.x, vUv.y)).r - info.r,
    texture2D(tex, vec2(vUv.x, vUv.y + delta.y)).r - info.r
  ) / cell;
  // Wind stays out of the height channel: it is analytic, so it needs no
  // simulation and cannot blow up, and pointer ripples still ride on top of it.
  vec2 slope = ripple + windSlope((vUv * 2.0 - 1.0) * halfSize, windTime);
  info.ba = -slope / sqrt(1.0 + dot(slope, slope));
  gl_FragColor = info;
}
`;

/** Foliage gobo: a slow sway, in world-space uv shared by the deck and the floor. */
const leafGlsl = /* glsl */ `
vec2 leafUv(vec2 p) {
  vec2 sway = 0.012 * vec2(sin(poolTime * 0.43 + p.y * 1.3), cos(poolTime * 0.37 + p.x * 1.1));
  return (p + sway) / 7.2 + 0.5;
}
`;

/** Shared uniforms + helpers for anything that shades the pool interior. */
const poolCommon = /* glsl */ `
const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;
uniform vec2 halfSize;
uniform float depth;
uniform float rimH;
uniform vec3 light;
uniform sampler2D causticTex;
uniform sampler2D shadowTex;
uniform sampler2D floorTypeTex;
uniform sampler2D leafTex;
uniform float portraitMode;
uniform float poolTime;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 intersectBox(vec3 origin, vec3 ray, vec3 bmin, vec3 bmax) {
  vec3 tMin = (bmin - origin) / ray;
  vec3 tMax = (bmax - origin) / ray;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  return vec2(max(max(t1.x, t1.y), t1.z), min(min(t2.x, t2.y), t2.z));
}

// Grout mask for a square tile grid; 1 = grout.
float grout(vec2 c, float width) {
  vec2 g = abs(fract(c) - 0.5);
  float e = 0.5 - max(g.x, g.y);
  float aa = max(fwidth(c.x), fwidth(c.y)) * 1.2;
  return 1.0 - smoothstep(width, width + aa, e);
}

vec3 floorTiles(vec2 p) {
  float size = 0.1;
  vec2 c = p / size;
  vec2 id = floor(c);
  float v = hash12(id);
  vec3 tile = vec3(0.66, 0.91, 0.965) * (0.97 + 0.05 * v);
  // Lane rectangle with crossing ends (reference: two long lanes joined by
  // two short ones, each line running one tile past the corner).
  float lw = 0.05;
  // Portrait opens the lanes out so the name sits between them.
  float zl = portraitMode > 0.5 ? 0.86 : 0.66, xl = 1.26;
  float hLine = step(abs(abs(p.y) - zl), lw) * step(abs(p.x), xl + 0.16);
  float vLine = step(abs(abs(p.x) - xl), lw) * step(abs(p.y), zl + 0.16);
  float lane = max(hLine, vLine);
  tile = mix(tile, vec3(0.10, 0.34, 0.66) * (0.97 + 0.06 * v), lane * 0.84);
  // UV for the identity on the tiled floor, not above the water. Portrait
  // rotates the print to follow the camera, while retaining refraction.
  vec2 oriented = portraitMode > 0.5
    // portrait: screen-right = world -z, screen-up = world -x; the canvas keeps
    // its 1536×960 aspect, spread across 2.2 × 1.375 world units.
    ? vec2(-p.y / 1.1, -p.x / 0.6875)
    : vec2(p.x / halfSize.x, -p.y / halfSize.y);
  vec4 ink = texture2D(floorTypeTex, oriented * 0.5 + 0.5);
  // Printed before the grout so the lettering reads as inlaid mosaic.
  tile = mix(tile, vec3(0.05, 0.24, 0.54), ink.a * 0.93);
  return mix(tile, vec3(0.78, 0.94, 0.97), grout(c, 0.02) * (1.0 - ink.a * 0.6) * 0.42);
}

vec3 wallTiles(vec2 c2, float y) {
  vec2 c = c2 / 0.1;
  float v = hash12(floor(c) + 17.0);
  vec3 tile = vec3(0.60, 0.89, 0.96) * (0.97 + 0.05 * v);
  return mix(tile, vec3(0.78, 0.94, 0.97), grout(c, 0.024) * 0.42);
}

// Soft silhouette shadow of the floats, projected along the refracted sun.
float objectShadow(vec2 q) {
  vec2 uv = q / halfSize * 0.5 + 0.5;
  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return 1.0 - 0.55 * texture2D(shadowTex, clamp(uv, 0.0, 1.0)).r * smoothstep(0.0, 0.015, edge);
}

vec3 faceNormal(vec3 p) {
  if (abs(p.x) > halfSize.x - 0.001) return vec3(-sign(p.x), 0.0, 0.0);
  if (abs(p.z) > halfSize.y - 0.001) return vec3(0.0, 0.0, -sign(p.z));
  return vec3(0.0, 1.0, 0.0);
}

${leafGlsl}

// Colour of a point on the pool's interior surface (floor or walls).
vec3 poolSurface(vec3 p, bool underwater) {
  vec3 n = faceNormal(p);
  vec3 base;
  float ao = 1.0;
  if (n.y > 0.5) {
    base = floorTiles(p.xz);
    float dw = min(halfSize.x - abs(p.x), halfSize.y - abs(p.z));
    ao = mix(0.9, 1.0, smoothstep(0.0, 0.22, dw));
  } else {
    vec2 c = abs(n.x) > 0.5 ? vec2(p.z, p.y) : vec2(p.x, p.y);
    base = wallTiles(c, p.y);
    float df = p.y + depth;
    ao = mix(0.86, 1.0, smoothstep(0.0, 0.2, df));
    float along = abs(n.x) > 0.5 ? halfSize.y - abs(p.z) : halfSize.x - abs(p.x);
    ao *= mix(0.91, 1.0, smoothstep(0.0, 0.12, along));
  }

  // Above the water the walls are the pale stone of the coping.
  if (!underwater) return vec3(0.97, 0.94, 0.88) * (0.8 + 0.3 * max(0.0, dot(light, n)));

  vec3 rl = -refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
  float facing = max(0.0, dot(rl, n));
  // Where does the sunlight reaching p cross the floor plane? The caustic map
  // is exact on the floor and an approximation on the walls. Past the sun-side
  // wall the map is empty, which is what draws the wall's shadow on the floor.
  float t = (p.y + depth) / rl.y;
  vec2 q = p.xz - rl.xz * t;
  vec2 cuv = q / halfSize * 0.5 + 0.5;
  vec2 spread = normalize(rl.xz + 1e-4) * 0.0028;
  // Water disperses a little: split the focus lines by wavelength.
  vec3 focus = vec3(
    texture2D(causticTex, clamp(cuv + spread, 0.0, 1.0)).r,
    texture2D(causticTex, clamp(cuv, 0.0, 1.0)).r,
    texture2D(causticTex, clamp(cuv - spread, 0.0, 1.0)).r
  ) * 4.0;
  // Light comes and goes in patches as the longer swell passes over.
  float drift = sin(q.x * 1.7 + q.y * 0.9 + poolTime * 0.11) * sin(q.y * 2.3 - q.x * 0.7 - poolTime * 0.09);
  float strength = 0.62 + 0.38 * smoothstep(-0.7, 0.7, drift);
  focus = max(mix(min(focus, vec3(1.0)), focus, strength), vec3(0.0));
  // Roll off the peaks like a camera does, so focus never clips to neon.
  focus = focus * 1.28 / (1.0 + 0.28 * focus);
  float object = objectShadow(q);
  float blocked = object * (1.0 - 0.6 * texture2D(leafTex, leafUv(q)).r);
  if (n.y < 0.5) focus = mix(vec3(1.0), focus, 0.35) * (0.6 + 0.4 * facing);
  vec3 sun = vec3(1.0, 0.985, 0.95) * focus * blocked;
  vec3 lit = vec3(0.70, 0.75, 0.79) * mix(0.82, 1.0, object) + sun * 0.26;
  // Concentrated sunlight is white, not a brighter blue: add it, don't multiply.
  vec3 bloom = vec3(0.97, 1.0, 1.0) * smoothstep(1.12, 2.15, sun.g) * 0.26;
  return base * lit * ao + bloom;
}
`;

export const causticsVert = /* glsl */ `
const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;
uniform sampler2D water;
uniform vec3 light;
uniform vec2 halfSize;
uniform float depth;
uniform float focusGain;
varying vec3 oldPos;
varying vec3 newPos;

vec3 projectToFloor(vec3 origin, vec3 ray) {
  float t = (-depth - origin.y) / ray.y;
  return origin + ray * t;
}

void main() {
  vec2 uv = position.xz / halfSize * 0.5 + 0.5;
  vec4 info = texture2D(water, uv);
  // The pool is shallower than a real one: exaggerate the slope so the wave
  // lenses still come to a focus on the floor.
  vec2 slope = info.ba * focusGain;
  // Limit steep slopes, so a stirred pool stays soft instead of focusing into a web.
  slope /= 1.0 + dot(slope, slope) * 2.4;
  vec3 normal = normalize(vec3(slope.x, 1.0, slope.y));
  vec3 refractedLight = refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
  vec3 ray = refract(-light, normal, IOR_AIR / IOR_WATER);
  oldPos = projectToFloor(vec3(position.x, 0.0, position.z), refractedLight);
  newPos = projectToFloor(vec3(position.x, info.r, position.z), ray);
  gl_Position = vec4(newPos.x / halfSize.x, newPos.z / halfSize.y, 0.0, 1.0);
}
`;

export const causticsFrag = /* glsl */ `
precision highp float;
varying vec3 oldPos;
varying vec3 newPos;
void main() {
  float oldArea = length(dFdx(oldPos)) * length(dFdy(oldPos));
  float newArea = length(dFdx(newPos)) * length(dFdy(newPos));
  gl_FragColor = vec4(min(oldArea / max(newArea, 1e-7), 8.0) * 0.25, 0.0, 0.0, 1.0);
}
`;

export const waterVert = /* glsl */ `
uniform sampler2D water;
uniform vec2 halfSize;
varying vec3 vPos;
void main() {
  vec2 uv = position.xz / halfSize * 0.5 + 0.5;
  vec4 info = texture2D(water, uv);
  vPos = position;
  vPos.y += info.r;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
}
`;

export const waterFrag = /* glsl */ `
precision highp float;
${poolCommon}
uniform sampler2D water;
uniform sampler2D footprintTex; // sharp hulls at the waterline: rgb colour, a coverage
uniform sampler2D contactTex;   // the same map, blurred
uniform sampler2D haloTex;      // the footprint blurred widely, for ripples
uniform sampler2D rippleTex;    // tiling fine surface slopes
uniform vec3 sunDir;
uniform vec3 absorb;
uniform vec3 deepColor;
uniform float time;
varying vec3 vPos;

vec3 sky(vec3 r) {
  float up = clamp(r.y, 0.0, 1.0);
  vec3 c = mix(vec3(0.93, 0.97, 1.0), vec3(0.55, 0.80, 0.99), pow(up, 0.7));
  // Two soft fair-weather clouds, enough to break up the reflection.
  vec2 s = r.xz / max(r.y, 0.12);
  float cloud = sin(s.x * 2.3 + 1.0) * sin(s.y * 1.9 - 0.6) + 0.5 * sin(s.x * 5.3 - s.y * 3.1);
  return mix(c, vec3(1.0), smoothstep(0.2, 1.1, cloud) * 0.6);
}

void main() {
  vec2 uv = vPos.xz / halfSize * 0.5 + 0.5;
  vec4 info = texture2D(water, uv);
  vec2 slope = info.ba;

  // The water climbs a hull for a few millimetres: bend the surface around the
  // blurred footprint so it refracts the tiles and catches the light.
  vec2 e = vec2(1.0 / 192.0, 1.0 / 120.0);
  float near = texture2D(contactTex, uv).a;
  vec2 lift = vec2(
    texture2D(contactTex, uv + vec2(e.x, 0.0)).a - texture2D(contactTex, uv - vec2(e.x, 0.0)).a,
    texture2D(contactTex, uv + vec2(0.0, e.y)).a - texture2D(contactTex, uv - vec2(0.0, e.y)).a
  );
  slope -= lift * 0.55;

  // Fine surface detail: two layers drifting across each other. It ruffles the
  // reflections and glitter, and barely touches the view of the floor.
  vec2 q = vPos.xz;
  vec2 fine = (texture2D(rippleTex, q * 0.61 + time * vec2(0.021, 0.013)).rg
             + texture2D(rippleTex, q.yx * 1.13 - time * vec2(0.016, 0.027)).gr - 1.0) * 0.12;

  // Gentle rings spreading from each hull. A wide Gaussian falls off as
  // exp(-d^2), so sqrt(-log) recovers a distance that follows the hull's shape.
  float aura = texture2D(haloTex, uv).a;
  vec2 he = vec2(1.0 / 96.0, 1.0 / 60.0);
  vec2 auraSlope = vec2(texture2D(haloTex, uv + vec2(he.x, 0.0)).a - aura, texture2D(haloTex, uv + vec2(0.0, he.y)).a - aura);
  float reach = sqrt(max(-log(max(aura, 1e-4)), 0.0));
  float ringFade = smoothstep(0.003, 0.05, aura) * (1.0 - smoothstep(0.42, 0.8, aura));
  float swell = cos(reach * 19.0 - time * 2.1 + fine.x * 7.0);
  slope += auraSlope / (length(auraSlope) + 1e-4) * swell * 0.05 * ringFade;

  vec3 normal = normalize(vec3(slope.x + fine.x, 1.0, slope.y + fine.y));
  vec3 incoming = normalize(vPos - cameraPosition);
  vec3 refl = reflect(incoming, normal);
  // Looking down through the water the view bends less than the light does, so
  // the caustics stay lively while the name on the floor stays readable.
  vec2 bend = slope * 0.62 + fine * 0.08;
  vec3 refr = refract(incoming, normalize(vec3(bend.x, 1.0, bend.y)), IOR_AIR / IOR_WATER);

  vec2 t = intersectBox(vPos, refr, vec3(-halfSize.x, -depth, -halfSize.y), vec3(halfSize.x, rimH + 1.0, halfSize.y));
  float dist = t.y;
  vec3 col = poolSurface(vPos + refr * dist, true);

  // The hull below the waterline, seen through the moving surface: a shallow
  // sample for its flank and a deeper one for its belly.
  for (int i = 0; i < 2; i++) {
    float hullDepth = i == 0 ? 0.075 : 0.03;
    vec2 hullUv = (vPos.xz + refr.xz * ((hullDepth + vPos.y) / max(-refr.y, 0.05))) / halfSize * 0.5 + 0.5;
    vec4 hull = texture2D(footprintTex, hullUv);
    if (hull.a > 0.003) {
      vec3 tinted = mix(hull.rgb / hull.a, col, i == 0 ? 0.68 : 0.46) * 0.9;
      col = mix(col, tinted, hull.a * 0.9);
    }
  }

  col *= exp(-dist * absorb);
  col = mix(col, deepColor, 1.0 - exp(-dist * 0.24));
  // Colour pools towards the walls and shifts slowly across the floor.
  vec3 seen = vPos + refr * dist;
  float shelf = smoothstep(0.0, 0.62, min(halfSize.x - abs(seen.x), halfSize.y - abs(seen.z)));
  col *= mix(vec3(0.62, 0.86, 0.95), vec3(1.0), shelf);
  float drift = sin(seen.x * 1.3 + 1.0) * sin(seen.z * 1.7 - 0.4);
  col *= mix(vec3(0.93, 0.97, 1.0), vec3(1.03, 1.01, 1.0), drift * 0.5 + 0.5);

  // Contact: a tight dark line where the hull meets the water, then a thin
  // bright meniscus. Both fade out a short way from the hull.
  float crease = smoothstep(0.34, 0.92, near);
  float ring = smoothstep(0.02, 0.2, near) * (1.0 - smoothstep(0.2, 0.5, near));
  col *= 1.0 - crease * 0.5;

  float cosT = max(0.0, dot(normal, -incoming));
  float fresnel = 0.03 + 0.97 * pow(1.0 - cosT, 5.0);
  vec3 reflected = sky(refl);
  // The floats colour the water beside them.
  vec2 mirrorUv = uv + refl.xz * 0.05;
  vec4 mirror = texture2D(contactTex, mirrorUv);
  reflected = mix(reflected, mirror.rgb / max(mirror.a, 0.02), clamp(mirror.a * 1.5, 0.0, 0.9));
  float mirrorGain = 1.0 + mirror.a * 5.0;
  vec3 c = mix(col, reflected, clamp(fresnel * mirrorGain, 0.0, 1.0));

  // Sun glitter: small, scattered, and only where a facet faces the sun.
  vec3 faceted = normalize(vec3(slope.x + fine.x * 3.4, 1.0, slope.y + fine.y * 3.4));
  float sparkle = pow(max(dot(reflect(incoming, faceted), sunDir), 0.0), 2000.0);
  float leaf = 1.0 - 0.8 * texture2D(leafTex, leafUv(vPos.xz)).r;
  c += vec3(1.0, 0.99, 0.95) * min(sparkle * 0.9, 0.5) * leaf * (1.0 - crease);
  c += vec3(0.88, 0.97, 0.98) * ring * 0.05;
  // Crests of the rings catch the sky, broken up so they never read as circles.
  c += vec3(0.95, 1.0, 1.0) * pow(max(swell, 0.0), 5.0) * ringFade * smoothstep(-0.02, 0.05, fine.x + fine.y) * 0.2;

  // Soft darkening where the water meets the wall (rim shadow / meniscus).
  float dw = min(halfSize.x - abs(vPos.x), halfSize.y - abs(vPos.z));
  c *= mix(0.8, 1.0, smoothstep(0.0, 0.035, dw));

  gl_FragColor = vec4(c, 1.0);
}
`;

export const poolVert = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
}
`;

export const poolFrag = /* glsl */ `
precision highp float;
${poolCommon}
varying vec3 vPos;
void main() {
  vec3 p = vPos;
  p.xz = clamp(p.xz, -halfSize, halfSize);
  gl_FragColor = vec4(poolSurface(p, false), 1.0);
}
`;

export const deckFrag = /* glsl */ `
precision highp float;
uniform vec2 halfSize;
uniform float coping;
uniform sampler2D leafTex;
uniform float poolTime;
varying vec3 vPos;
${leafGlsl}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 p = vPos.xz;
  vec2 o = abs(p) - halfSize;
  float e = max(o.x, o.y); // signed distance-ish to the pool opening (outside > 0)
  if (e < 0.0) discard;

  // Large warm stone pavers, offset so joints meet the coping cleanly.
  vec2 c = (p - halfSize - coping) / 0.42;
  vec2 g = abs(fract(c) - 0.5);
  float edge = 0.5 - max(g.x, g.y);
  float aa = max(fwidth(c.x), fwidth(c.y)) * 1.2;
  float gr = 1.0 - smoothstep(0.008, 0.008 + aa, edge);
  float v = hash12(floor(c));
  vec3 tile = vec3(0.985, 0.945, 0.875) * (0.975 + 0.04 * v);
  vec3 col = mix(tile, vec3(0.90, 0.85, 0.77), gr);

  // Coping stones around the opening: brighter, with a rounded bullnose edge.
  if (e < coping) {
    vec3 cop = vec3(1.0, 0.975, 0.925);
    float bull = smoothstep(0.0, 0.035, e);
    cop *= mix(0.74, 1.0, bull);
    float along = o.x > o.y ? p.y : p.x;
    float j = abs(fract(along / 0.46) - 0.5);
    float jaa = fwidth(along / 0.46) * 1.5;
    cop = mix(cop, vec3(0.86, 0.81, 0.73), 1.0 - smoothstep(0.004, 0.004 + jaa, 0.5 - j));
    col = cop;
  } else {
    // Contact shadow cast by the coping lip onto the deck.
    col *= mix(0.9, 1.0, smoothstep(coping, coping + 0.05, e));
  }

  // Foliage overhead dapples the sunlit stone; shade stays warm, never grey.
  vec2 luv = leafUv(p);
  float shade = 0.0;
  for (int i = 0; i < 4; i++) {
    float a = float(i) * 1.5708 + 0.6;
    shade += texture2D(leafTex, luv + vec2(cos(a), sin(a)) * 0.0026).r;
  }
  col *= mix(vec3(1.0), vec3(0.64, 0.58, 0.57), shade * 0.25);

  // Gentle falloff toward the edges of the deck.
  float r = length(p / (halfSize + 1.4));
  col *= mix(1.0, 0.96, smoothstep(0.8, 1.5, r));
  // Fine grain so flat colour doesn't band.
  col += (hash12(p * 431.0) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`;
