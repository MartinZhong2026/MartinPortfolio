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
 * alpha-silhouette soft shadows for the floating project objects, turquoise
 * absorption model and a sun-glint term tuned for a near top-down camera.
 */

export const fullscreenVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const MAX_DROPS = 16;
export const MAX_SHADOWS = 8;

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

export const normalFrag = /* glsl */ `
precision highp float;
uniform sampler2D tex;
uniform vec2 delta;
uniform vec2 cell; // world size of one texel
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tex, vUv);
  vec3 dx = vec3(cell.x, texture2D(tex, vec2(vUv.x + delta.x, vUv.y)).r - info.r, 0.0);
  vec3 dy = vec3(0.0, texture2D(tex, vec2(vUv.x, vUv.y + delta.y)).r - info.r, cell.y);
  info.ba = normalize(cross(dy, dx)).xz;
  gl_FragColor = info;
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
uniform vec4 shadows[${MAX_SHADOWS}]; // xy: object centre (world xz), zw: radii
uniform float shadowY[${MAX_SHADOWS}];
uniform int shadowCount;
uniform sampler2D floorTypeTex;
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
  vec3 tile = vec3(0.58, 0.83, 0.93) * (0.965 + 0.05 * v);
  // Lane rectangle with crossing ends (reference: two long lanes joined by
  // two short ones, each line running one tile past the corner).
  float lw = 0.042;
  float zl = 0.66, xl = 1.26;
  float hLine = step(abs(abs(p.y) - zl), lw) * step(abs(p.x), xl + 0.16);
  float vLine = step(abs(abs(p.x) - xl), lw) * step(abs(p.y), zl + 0.16);
  float lane = max(hLine, vLine);
  tile = mix(tile, vec3(0.12, 0.38, 0.74) * (0.97 + 0.05 * v), lane * 0.95);
  tile = mix(tile, vec3(0.55, 0.80, 0.91), grout(c, 0.03));
  // UV for the identity on the tiled floor, not above the water. Portrait
  // rotates the print to follow the camera, while retaining refraction.
  vec2 oriented = portraitMode > 0.5
    // portrait: screen-right = world -z, screen-up = world -x; keep the
    // canvas aspect (1536×960) by mapping its height onto 1.25 world units.
    ? vec2(-p.y / halfSize.y, -p.x / 0.625)
    : vec2(p.x / halfSize.x, -p.y / halfSize.y);
  vec2 inkUv = oriented * 0.5 + 0.5;
  vec4 ink = texture2D(floorTypeTex, inkUv);
  return mix(tile, vec3(0.07, 0.33, 0.62), ink.a * 0.88);
}

vec3 wallTiles(vec2 c2, float y) {
  // Waterline band of small teal mosaic just below the rim.
  if (y > -0.035) {
    vec2 c = c2 / 0.0375;
    float v = hash12(floor(c));
    vec3 m = mix(vec3(0.28, 0.68, 0.80), vec3(0.42, 0.80, 0.88), v);
    return mix(m, vec3(0.83, 0.96, 0.98), grout(c, 0.055));
  }
  vec2 c = c2 / 0.1;
  float v = hash12(floor(c) + 17.0);
  vec3 tile = vec3(0.66, 0.87, 0.94) * (0.97 + 0.05 * v);
  return mix(tile, vec3(0.56, 0.80, 0.90), grout(c, 0.032));
}

float objectShadow(vec2 q) {
  vec2 uv = q / halfSize * 0.5 + 0.5;
  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return 1.0 - 0.25 * texture2D(shadowTex, clamp(uv, 0.0, 1.0)).r * smoothstep(0.0, 0.015, edge);
}

// Interference caustics: a moving, multi-frequency network of thin refracted
// sunlight ribbons. The GPU wave heightfield still drives refraction and the
// physically projected caustic pass; this supplies finer ambient highlights
// when the heightfield is almost flat between pointer interactions.
float ambientCaustics(vec2 p, float t) {
  vec2 q = p * 15.5;
  vec2 warp = vec2(
    0.52 * sin(q.y * 0.62 + t * 0.47) + 0.20 * cos(q.y * 1.27 - t * 0.29),
    0.48 * cos(q.x * 0.70 - t * 0.39) + 0.24 * sin(q.x * 1.17 + t * 0.34)
  );
  q += warp;
  float a = sin(q.x * 1.13 + 0.62 * sin(q.y * 0.76 + t * 0.22));
  float b = sin(q.y * 0.98 + 0.74 * sin(q.x * 0.73 - t * 0.31));
  float joint = sin(q.x * 0.61 - q.y * 0.74 + t * 0.25);
  float filament = 1.0 - smoothstep(0.035, 0.26, abs(a * b + 0.18 * joint));
  float smaller = 1.0 - smoothstep(0.045, 0.24, abs(a - b) * 0.65);
  float modulation = 0.72 + 0.28 * sin(q.x * 0.41 + q.y * 0.39 + t * 0.16);
  return clamp((filament * 0.72 + smaller * 0.28) * modulation, 0.0, 1.0);
}

vec3 faceNormal(vec3 p) {
  if (abs(p.x) > halfSize.x - 0.001) return vec3(-sign(p.x), 0.0, 0.0);
  if (abs(p.z) > halfSize.y - 0.001) return vec3(0.0, 0.0, -sign(p.z));
  return vec3(0.0, 1.0, 0.0);
}

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

  vec3 rl = -refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
  float diffuse = max(0.0, dot(rl, n));

  // Where does the light that reaches p cross the floor plane? Sample the
  // caustic map there (exact on the floor, an approximation on walls).
  float t = (p.y + depth) / rl.y;
  vec2 q = p.xz - rl.xz * t;
  vec2 cuv = q / halfSize * 0.5 + 0.5;
  // Trace sunlight back to the surface: only the up-light walls cast a shadow.
  vec2 entry = p.xz + rl.xz * max(0.0, -p.y + rimH) / rl.y;
  vec2 wallDistance = halfSize - abs(entry);
  // Broad wall penumbra: avoid the hard-edged bright rectangle in V6.5.
  float inside = 0.88 + 0.12 * smoothstep(-0.42, 0.47, min(wallDistance.x, wallDistance.y));
  float caustic = 1.0 - exp(-3.1 * max(0.0, texture2D(causticTex, clamp(cuv, 0.0, 1.0)).r));
  float sh = objectShadow(q);
  float organic = ambientCaustics(q, poolTime);

  float light_;
  if (underwater) {
    float causticVisibility = mix(0.25, 1.0, smoothstep(0.57, 1.0, sh));
    light_ = (0.74 + 0.12 * diffuse + caustic * (n.y > 0.5 ? 0.22 : 0.12) * causticVisibility) * inside;
    light_ *= sh;
    // Sunlight focused by the surface reads as near-white ribbons on top of
    // the tile colour (not just a brighter tile), as in the reference image.
    float ribbons = (organic * (n.y > 0.5 ? 0.36 : 0.17) + caustic * 0.07) * causticVisibility * inside * sh;
    return base * light_ * ao + vec3(0.92, 1.0, 1.0) * ribbons;
  } else {
    light_ = 0.95 + 0.25 * max(0.0, dot(light, n));
  }
  return base * light_ * ao;
}
`;

export const causticsVert = /* glsl */ `
const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;
uniform sampler2D water;
uniform vec3 light;
uniform vec2 halfSize;
uniform float depth;
varying vec3 oldPos;
varying vec3 newPos;

vec3 projectToFloor(vec3 origin, vec3 ray) {
  float t = (-depth - origin.y) / ray.y;
  return origin + ray * t;
}

void main() {
  vec2 uv = position.xz / halfSize * 0.5 + 0.5;
  vec4 info = texture2D(water, uv);
  info.ba *= 0.5;
  vec3 normal = vec3(info.b, sqrt(max(0.0, 1.0 - dot(info.ba, info.ba))), info.a);
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
  gl_FragColor = vec4(min(oldArea / max(newArea, 1e-7) * 0.25, 1.55), 0.0, 0.0, 1.0);
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
uniform vec3 sunDir;
uniform vec3 absorb;
uniform vec3 deepColor;
uniform float time;
uniform vec3 floatColors[8];
uniform vec4 floatBody[8];   // x, z, half extent, yaw
uniform float floatShape[8]; // 0 rounded square, 1 disc, -1 none
varying vec3 vPos;

// Signed distance to a float's footprint (rounded square or disc), local frame.
float bodySdf(vec2 p, int i, out vec2 dir) {
  vec4 b = floatBody[i];
  vec2 d = p - b.xy;
  float c = cos(b.w), s = sin(b.w);
  vec2 q = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  float h = b.z;
  float sdf;
  if (floatShape[i] > 0.5) {
    sdf = length(q) - h;
    dir = normalize(d + 1e-5);
  } else {
    float r = h * 0.42;
    vec2 k = abs(q) - vec2(h - r);
    sdf = length(max(k, 0.0)) + min(max(k.x, k.y), 0.0) - r;
    vec2 g = sign(q) * max(k, 0.0);
    g = length(g) > 1e-4 ? normalize(g) : (abs(q.x) > abs(q.y) ? vec2(sign(q.x), 0.0) : vec2(0.0, sign(q.y)));
    dir = vec2(c * g.x + s * g.y, -s * g.x + c * g.y);
  }
  return sdf;
}

// The part of each cushion below the waterline, seen through the refracting
// surface: tinted by the water and wobbling with the waves.
vec3 submergedBodies(vec3 origin, vec3 ray, vec3 col) {
  float t = (-0.075 - origin.y) / ray.y;
  if (t <= 0.0) return col;
  vec2 hit = origin.xz + ray.xz * t;
  for (int i = 0; i < 8; i++) {
    if (i >= shadowCount) break;
    if (floatShape[i] < -0.5) continue;
    vec2 dir;
    float sdf = bodySdf(hit, i, dir);
    float body = 1.0 - smoothstep(-0.006, 0.006, sdf + 0.004);
    if (body > 0.0) {
      vec3 under = mix(floatColors[i], vec3(0.38, 0.80, 0.90), 0.55);
      under *= 0.92 + 0.10 * smoothstep(-0.06, 0.0, sdf);
      col = mix(col, under, body * 0.9);
    }
  }
  return col;
}

// Analytic underwater volumes: a refracted view ray sees a tinted submerged shell.
vec3 submerged(vec3 origin, vec3 ray, vec3 col, float floorDistance) {
  float nearest = floorDistance;
  for (int i = 0; i < 8; i++) {
    if (i >= shadowCount) break;
    vec4 o = shadows[i];
    vec3 radii = vec3(o.z * 0.77, 0.07, o.w * 0.77);
    vec3 v = (origin - vec3(o.x, -0.055 + shadowY[i], o.y)) / radii;
    vec3 d = ray / radii;
    float a = dot(d,d), b = dot(v,d), c = dot(v,v)-1.0;
    float h = b*b-a*c;
    if (h > 0.0) {
      float enter = (-b - sqrt(h)) / a;
      float exit_ = (-b + sqrt(h)) / a;
      float t = enter > 0.0 ? enter : exit_;
      if (t > 0.0 && t < nearest) {
        nearest = t;
        vec2 bodyUV = (origin + ray * t).xz / halfSize * 0.5 + 0.5;
        float softCaustic = 1.0 - exp(-2.4 * max(0.0, texture2D(causticTex, bodyUV).r));
        col = mix(floatColors[i] * 0.72, deepColor, 0.42) + vec3(0.03,0.06,0.05) + softCaustic * 0.065;
      }
    }
  }
  return col;
}

vec3 sky(vec3 r) {
  vec3 horizon = vec3(0.90, 0.96, 0.98);
  vec3 zenith = vec3(0.995, 0.988, 0.97);
  return mix(horizon, zenith, clamp(r.y, 0.0, 1.0));
}

void main() {
  vec2 uv = vPos.xz / halfSize * 0.5 + 0.5;
  vec4 info = texture2D(water, uv);
  vec2 slope = info.ba;
  // Concentric rings travelling out from every float (reference image),
  // expressed as a surface slope so they refract the tiles and catch the sun.
  float ringGlint = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= shadowCount) break;
    if (floatShape[i] < -0.5) continue;
    vec2 dir;
    float sdf = bodySdf(vPos.xz, i, dir);
    if (sdf > 0.0 && sdf < 0.34) {
      float phase = sdf * 48.0 - time * 2.1 + float(i) * 1.7;
      float env = smoothstep(0.0, 0.012, sdf) * exp(-sdf * 6.0);
      slope += dir * cos(phase) * 0.09 * env;
      ringGlint = max(ringGlint, pow(max(0.0, sin(phase)), 10.0) * env);
    }
  }
  vec3 normal = normalize(vec3(slope.x, sqrt(max(0.0, 1.0 - dot(slope, slope))), slope.y));
  vec3 incoming = normalize(vPos - cameraPosition);
  vec3 refl = reflect(incoming, normal);
  vec3 refr = refract(incoming, normal, IOR_AIR / IOR_WATER);

  vec2 t = intersectBox(vPos, refr, vec3(-halfSize.x, -depth, -halfSize.y), vec3(halfSize.x, rimH + 1.0, halfSize.y));
  vec3 hit = vPos + refr * t.y;
  vec3 col = poolSurface(hit, true);
  // Do not draw generic underwater ellipsoids for flat art-direction reliefs
  // or the origami boat: viewed from above they appeared as solid dark disks.
  // The artwork itself keeps its subtle meniscus tint in objects.ts.
  float dist = t.y;
  col = submergedBodies(vPos, refr, col);
  col *= exp(-dist * absorb);
  col = mix(col, deepColor, 1.0 - exp(-dist * 0.31));

  float cosT = max(0.0, dot(normal, -incoming));
  float fresnel = 0.035 + 0.965 * pow(1.0 - cosT, 5.0);
  vec3 c = mix(col, sky(refl), fresnel);
  float spec = clamp(pow(max(dot(refl, sunDir), 0.0), 600.0) * 0.4, 0.0, 0.32);
  c += vec3(1.0, 0.99, 0.95) * (spec + ringGlint * 0.38);
  // Thin broken meniscus highlights near each moving float, not full
  // concentric neon rings. Physical interactions still use the GPU heightfield.
  float meniscus = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= shadowCount) break;
    vec4 o = shadows[i];
    vec2 d = (vPos.xz - o.xy) / max(o.zw, vec2(0.03));
    float r = length(d);
    float sector = 0.60 + 0.40 * sin(atan(d.y, d.x) * 5.0 + time * 0.62 + float(i));
    float edgeGlow = exp(-pow((r - 1.24) * 18.0, 2.0)) * sector;
    meniscus = max(meniscus, edgeGlow);
  }
  c += vec3(0.10, 0.14, 0.14) * meniscus * 0.6;

  // Soft darkening where the water meets the wall (rim shadow / meniscus).
  float dw = min(halfSize.x - abs(vPos.x), halfSize.y - abs(vPos.z));
  c *= mix(0.96, 1.0, smoothstep(0.0, 0.035, dw));

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
varying vec3 vPos;

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

  // Large warm off-white tiles, offset so grout lines meet the coping cleanly.
  vec2 c = (p - halfSize - coping) / 0.25;
  vec2 g = abs(fract(c) - 0.5);
  float edge = 0.5 - max(g.x, g.y);
  float aa = max(fwidth(c.x), fwidth(c.y)) * 1.2;
  float gr = 1.0 - smoothstep(0.012, 0.012 + aa, edge);
  float v = hash12(floor(c));
  vec3 tile = vec3(0.955, 0.945, 0.92) * (0.99 + 0.02 * v);
  vec3 col = mix(tile, vec3(0.88, 0.88, 0.86), gr);

  // Coping stones around the opening: brighter, with a rounded bullnose edge.
  if (e < coping) {
    vec3 cop = vec3(0.99, 0.977, 0.95);
    float bull = smoothstep(0.0, 0.03, e);
    cop *= mix(0.80, 1.0, bull);
    // Joints in the coping every 0.4
    float along = o.x > o.y ? p.y : p.x;
    float j = abs(fract(along / 0.4) - 0.5);
    float jaa = fwidth(along / 0.4) * 1.5;
    cop = mix(cop, vec3(0.88, 0.86, 0.82), 1.0 - smoothstep(0.004, 0.004 + jaa, 0.5 - j));
    col = cop;
  } else {
    // Contact shadow cast by the coping lip onto the deck.
    col *= mix(0.93, 1.0, smoothstep(coping, coping + 0.05, e));
  }

  // Soft palm-like shadows in the deck corners, matching the approved reference.
  float leafA = exp(-dot((p - vec2(-halfSize.x - 0.35, -halfSize.y - 0.22)) * vec2(1.2, 0.85), (p - vec2(-halfSize.x - 0.35, -halfSize.y - 0.22)) * vec2(1.2, 0.85)) * 0.32);
  float leafB = exp(-dot((p - vec2(halfSize.x + 0.42, halfSize.y + 0.24)) * vec2(1.1, 0.8), (p - vec2(halfSize.x + 0.42, halfSize.y + 0.24)) * vec2(1.1, 0.8)) * 0.3);
  float palm = max(leafA, leafB);
  float frond = 0.5 + 0.5 * sin((p.x + p.y * 0.7) * 12.0);
  col *= 1.0 - palm * 0.0 * frond;

  // Gentle falloff toward the edges of the deck.
  float r = length(p / (halfSize + 1.4));
  col *= mix(1.0, 0.975, smoothstep(0.8, 1.5, r));
  // Fine grain so flat colour doesn't band.
  col += (hash12(p * 431.0) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`;
