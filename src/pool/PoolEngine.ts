import * as THREE from 'three';
import {
  blurFrag,
  buildRippleMap,
  causticsFrag,
  causticsVert,
  deckFrag,
  dropFrag,
  fullscreenVert,
  MAX_DROPS,
  normalFrag,
  poolFrag,
  poolVert,
  swellAt,
  updateFrag,
  waterFrag,
  waterVert,
} from './shaders';
import { FloatShadows } from './FloatShadows';
import { buildPlanting, type Planting } from './plants';
import { builders, toyBuilders, disposeObjectResources, type BuiltObject } from './objects';
import { toySlots, landscapeLayout, POOL, portraitLayout, type PoolObjectId, type Slot } from './layout';

export interface Anchor {
  x: number;
  y: number;
  r: number;
}

export interface EngineOptions {
  reducedMotion: boolean;
  coarse: boolean;
  /** diagnostic switches from `?poolfx=`; see capability.ts */
  fx: Set<string>;
  ids: PoolObjectId[];
  onHover(id: PoolObjectId | null): void;
  onActivate(id: PoolObjectId): void;
  /** Has the page room for a planter at this canvas position? */
  plantFits(x: number, y: number, r: number): boolean;
  onFrame(anchors: Map<PoolObjectId, Anchor>, portrait: boolean, cta: { x: number; y: number }): void;
  onFirstFrame(): void;
  onContextLost(): void;
}

interface ObjState {
  /** null for decorative floats, which link nowhere */
  id: PoolObjectId | null;
  holder: THREE.Group;
  built: BuiltObject;
  slots: { landscape: Slot; portrait: Slot };
  home: THREE.Vector2;
  pos: THREE.Vector2;
  vel: THREE.Vector2;
  yaw: number;
  scale: number;
  hover: number;
  phase: number;
  prevY: number;
  /** vertical spring state: floats lag the swell rather than trace it */
  lift: number;
  liftVel: number;
  nextRipple: number;
  tilt: THREE.Vector2;
  tiltVel: THREE.Vector2;
  dive: number;
  diving: boolean;
}

/** Sun, as direction towards it. Upper left on screen in either orientation. */
const SUN_LANDSCAPE: [number, number, number] = [-0.4, 1.0, -0.22];
const SUN_PORTRAIT: [number, number, number] = [-0.22, 1.0, 0.4];

/** Where the call to action floats, just past "welcome to my world" on screen. */
const CTA_LANDSCAPE = { x: 0, z: 0.6, halfX: 0.42, halfZ: 0.1 };
const CTA_PORTRAIT = { x: 0.33, z: 0, halfX: 0.09, halfZ: 0.42 };

/** Camera tilt from straight down, in radians: enough to see the far wall. */
const TILT_LANDSCAPE = 0.54;
const TILT_PORTRAIT = 0.26;

/** Portrait: how far (world units) a float may leave its cell, so labels stay clear. */
const CELL_FLOAT = 0.05;
const CELL_TOY = 0.075;

const { halfX: W, halfZ: L, depth: D, rimH: RIM, coping: COPING } = POOL;

/**
 * Real-time pool: heightfield water simulation on the GPU, caustics, a
 * ray-traced tiled interior, a tiled deck, seven linked floats and a few small toys.
 * All state lives here; React only mounts it and draws DOM labels.
 */
export class PoolEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  private simScene = new THREE.Scene();
  private simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private simQuad: THREE.Mesh;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private causticRT: THREE.WebGLRenderTarget;
  private causticRaw: THREE.WebGLRenderTarget;
  private causticScratch: THREE.WebGLRenderTarget;
  /** seconds for the caustic map to catch up with the water */
  private causticSettle: number;
  private causticSeeded = false;
  /**
   * Touch devices draw sunlight from a formula instead of the projected mesh map.
   * Do not route phones back through the map: see docs/INCIDENTS.md.
   */
  private useCausticMap: boolean;
  /** wave speed. Slower on touch devices, where each frame jump costs most. */
  private windRate: number;
  /** accumulated wave time, so the rate can change without the waves jumping */
  private windClock = 0;
  private causticBlur: THREE.ShaderMaterial;
  private rippleTex: THREE.DataTexture;
  private causticScene = new THREE.Scene();
  private dropMat: THREE.ShaderMaterial;
  private updateMat: THREE.ShaderMaterial;
  private normalMat: THREE.ShaderMaterial;
  private causticMat: THREE.ShaderMaterial;
  private waterMat: THREE.ShaderMaterial;
  private poolMat: THREE.ShaderMaterial;
  private deckMat: THREE.ShaderMaterial;
  private shared: Record<string, THREE.IUniform>;
  private objects: ObjState[] = [];
  private hits: THREE.Object3D[] = [];
  private planting: Planting;
  private floatShadows: FloatShadows;
  private drops: THREE.Vector4[] = [];
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private tmpV3 = new THREE.Vector3();
  private tmpV3b = new THREE.Vector3();
  private anchors = new Map<PoolObjectId, Anchor>();
  private raf = 0;
  private running = false;
  private last = 0;
  private time = 0;
  private nextAmbient = 0;
  private firstFrameSent = false;
  private portrait = false;
  private cw = 1;
  private ch = 1;
  private hoverId: PoolObjectId | null = null;
  private focusId: PoolObjectId | null = null;
  private pointer = { inside: false, down: false, downX: 0, downY: 0, downId: null as PoolObjectId | null, lastDrop: new THREE.Vector2(99, 99), px: 0, py: 0 };
  private lastPointerWorld: THREE.Vector2 | null = null;
  private parallax = new THREE.Vector2();
  private parallaxTarget = new THREE.Vector2();
  private frameTimes: number[] = [];
  private pixelRatio = 1;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private floorTypeTex: THREE.CanvasTexture;
  private leafTex: THREE.CanvasTexture;
  private disposed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private frameEl: HTMLElement,
    private opts: EngineOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0xf5f0e7, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps brand colours and duck yellow from shifting (the water and
    // deck are hand-graded shaders and bypass tone mapping entirely).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, opts.coarse ? 1.5 : 2);
    this.renderer.setPixelRatio(this.pixelRatio);

    // --- Simulation targets ------------------------------------------
    const simW = opts.coarse ? 192 : 256;
    const simH = Math.round((simW * L) / W);
    const rtOpts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.rtA = new THREE.WebGLRenderTarget(simW, simH, rtOpts);
    this.rtB = new THREE.WebGLRenderTarget(simW, simH, rtOpts);
    // Deliberately small: the map is blurred, and low resolution helps it stay soft.
    this.useCausticMap = opts.fx.has('analytic-caustics') ? false : !opts.coarse || opts.fx.has('map-caustics');
    const cRes = !this.useCausticMap ? 2 : opts.coarse ? 384 : 512;
    this.causticRT = new THREE.WebGLRenderTarget(cRes, Math.round((cRes * L) / W), rtOpts);
    this.causticRaw = new THREE.WebGLRenderTarget(cRes, Math.round((cRes * L) / W), rtOpts);
    this.causticScratch = new THREE.WebGLRenderTarget(cRes, Math.round((cRes * L) / W), rtOpts);
    this.causticSettle = 0.05;
    this.windRate = opts.coarse ? 0.55 : 1;
    this.causticBlur = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: blurFrag,
      uniforms: { tex: { value: null }, direction: { value: new THREE.Vector2() }, settle: { value: 1 } },
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false,
    });
    const rippleSize = opts.coarse ? 128 : 192;
    this.rippleTex = new THREE.DataTexture(buildRippleMap(rippleSize), rippleSize, rippleSize, THREE.RGBAFormat);
    this.rippleTex.wrapS = this.rippleTex.wrapT = THREE.RepeatWrapping;
    this.rippleTex.minFilter = THREE.LinearMipmapLinearFilter;
    this.rippleTex.magFilter = THREE.LinearFilter;
    this.rippleTex.generateMipmaps = true;
    this.rippleTex.needsUpdate = true;

    const delta = new THREE.Vector2(1 / simW, 1 / simH);
    this.dropMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: dropFrag,
      uniforms: {
        tex: { value: null },
        halfSize: { value: new THREE.Vector2(W, L) },
        count: { value: 0 },
        drops: { value: Array.from({ length: MAX_DROPS }, () => new THREE.Vector4()) },
      },
    });
    this.updateMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: updateFrag,
      uniforms: { tex: { value: null }, delta: { value: delta }, damping: { value: 0.993 } },
    });
    this.normalMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: normalFrag,
      uniforms: {
        tex: { value: null },
        delta: { value: delta },
        cell: { value: new THREE.Vector2((2 * W) / simW, (2 * L) / simH) },
        halfSize: { value: new THREE.Vector2(W, L) },
        windTime: { value: 0 },
      },
    });
    this.simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.updateMat);
    this.simQuad.frustumCulled = false;
    this.simScene.add(this.simQuad);

    // Draw once onto a canvas: the lettering is sampled by the *floor* shader,
    // so live waves refract the name and moving caustics pass over its ink.
    const lettering = document.createElement('canvas');
    lettering.width = 1536;
    lettering.height = 960;
    const ink = lettering.getContext('2d');
    const paintLettering = () => {
      if (!ink) return;
      ink.clearRect(0, 0, lettering.width, lettering.height);
      ink.textAlign = 'center';
      ink.textBaseline = 'middle';
      ink.fillStyle = '#fff';
      ink.font = '400 190px "Piedra", Georgia, serif';
      ink.fillText('Martin Zhong', 768, 440, 1000);
      ink.font = '400 80px "Geo", ui-monospace, monospace';
      ink.fillText('welcome to my world', 768, 588, 820);
      if (this.floorTypeTex) this.floorTypeTex.needsUpdate = true;
    };
    paintLettering();
    this.floorTypeTex = new THREE.CanvasTexture(lettering);
    Promise.all([document.fonts?.load('400 192px "Piedra"'), document.fonts?.load('400 76px "Geo"')]).then(paintLettering).catch(() => undefined);
    this.floorTypeTex.generateMipmaps = true;
    this.floorTypeTex.minFilter = THREE.LinearMipmapLinearFilter;
    this.floorTypeTex.magFilter = THREE.LinearFilter;
    this.floorTypeTex.anisotropy = 4;

    this.leafTex = paintFoliage();

    // --- Shared pool uniforms ----------------------------------------
    const light = new THREE.Vector3(...SUN_LANDSCAPE).normalize();
    this.shared = {
      halfSize: { value: new THREE.Vector2(W, L) },
      depth: { value: D },
      rimH: { value: RIM },
      floorTypeTex: { value: this.floorTypeTex },
      leafTex: { value: this.leafTex },
      portraitMode: { value: 0 },
      poolTime: { value: 0 },
      light: { value: light },
      causticTex: { value: this.causticRT.texture },
      shadowTex: { value: null },
      // Multipliers for diagnostics: caustics, glitter, fine ripples, hull rings.
      fx: { value: new THREE.Vector4(opts.fx.has('no-caustics') ? 0 : 1, opts.fx.has('no-glitter') ? 0 : 1, opts.fx.has('no-fine') ? 0 : 1, opts.fx.has('no-rings') ? 0 : 1) },
      fxLeaf: { value: opts.fx.has('no-leaf') ? 0 : 1 },
    };

    // --- Caustics ------------------------------------------------------
    const gridGeo = (sx: number, sz: number) => {
      const g = new THREE.PlaneGeometry(2 * W, 2 * L, sx, sz);
      g.rotateX(-Math.PI / 2);
      return g;
    };
    this.causticMat = new THREE.ShaderMaterial({
      vertexShader: causticsVert,
      fragmentShader: causticsFrag,
      uniforms: {
        water: { value: null },
        light: this.shared.light,
        halfSize: this.shared.halfSize,
        depth: this.shared.depth,
        focusGain: { value: 9.5 },
      },
      blending: THREE.AdditiveBlending,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const cMesh = new THREE.Mesh(gridGeo(simW, simH), this.causticMat);
    cMesh.frustumCulled = false;
    this.causticScene.add(cMesh);

    // --- Visible scene -------------------------------------------------
    const causticDefines: Record<string, number> = this.useCausticMap ? {} : { ANALYTIC_CAUSTICS: 1 };
    this.waterMat = new THREE.ShaderMaterial({
      defines: causticDefines,
      vertexShader: waterVert,
      fragmentShader: waterFrag,
      uniforms: {
        ...this.shared,
        water: { value: null },
        sunDir: { value: light },
        absorb: { value: new THREE.Vector3(0.66, 0.1, 0.03) },
        deepColor: { value: new THREE.Vector3(0.05, 0.58, 0.9) },
        time: { value: 0 },
        footprintTex: { value: null },
        contactTex: { value: null },
        haloTex: { value: null },
        rippleTex: { value: this.rippleTex },
      },
    });
    const water = new THREE.Mesh(gridGeo(simW, simH), this.waterMat);
    water.frustumCulled = false;
    this.scene.add(water);

    this.poolMat = new THREE.ShaderMaterial({
      defines: causticDefines,
      vertexShader: poolVert,
      fragmentShader: poolFrag,
      uniforms: { ...this.shared },
      side: THREE.BackSide,
    });
    const poolBox = new THREE.Mesh(new THREE.BoxGeometry(2 * W, D + RIM, 2 * L), this.poolMat);
    poolBox.position.y = (RIM - D) / 2;
    this.scene.add(poolBox);

    this.deckMat = new THREE.ShaderMaterial({
      vertexShader: poolVert,
      fragmentShader: deckFrag,
      uniforms: { halfSize: this.shared.halfSize, coping: { value: COPING }, leafTex: this.shared.leafTex, poolTime: this.shared.poolTime },
    });
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(24, 24).rotateX(-Math.PI / 2), this.deckMat);
    deck.position.y = RIM;
    this.scene.add(deck);

    // Lighting for the floats: a hand-built summer sky, so their reflections
    // show the same sun that drives the caustics and shadows.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const sky = skyDome(light);
    this.envRT = pmrem.fromScene(sky, 0.02);
    pmrem.dispose();
    sky.traverse((n) => {
      const m = n as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.42;
    // Turquoise bounce from the water fills the undersides.
    this.scene.add(new THREE.HemisphereLight(0xfffaf0, 0x53d4e6, 1.0));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.3);
    sun.position.copy(light).multiplyScalar(6);
    this.scene.add(sun);

    // Satin-metal pool rails: a lightweight, physically lit detail at the
    // upper-left coping in the approved homepage reference.
    const railMat = new THREE.MeshStandardMaterial({ color: 0xeef3f6, metalness: 0.92, roughness: 0.16 });
    for (const z of [-0.79, -0.54]) {
      const railCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-W - 0.15, 0.19, z),
        new THREE.Vector3(-W - 0.10, 0.20, z),
        new THREE.Vector3(-W + 0.01, 0.14, z),
        new THREE.Vector3(-W + 0.115, 0.015, z),
        new THREE.Vector3(-W + 0.17, -0.24, z),
      ]);
      const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 28, 0.017, 10, false), railMat);
      this.scene.add(rail);
    }

    this.planting = buildPlanting();
    this.scene.add(this.planting.group);

    // --- Objects -------------------------------------------------------
    const addFloat = (id: PoolObjectId | null, built: BuiltObject, slots: ObjState['slots']) => {
      const holder = new THREE.Group();
      holder.add(built.group);
      if (id) {
        const hit = new THREE.Mesh(
          new THREE.CylinderGeometry(built.radius * 1.12, built.radius * 1.12, built.top + 0.16, 24),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hit.position.y = built.top / 2;
        hit.userData.id = id;
        holder.add(hit);
        this.hits.push(hit);
      }
      this.scene.add(holder);
      const i = this.objects.length;
      this.objects.push({
        id,
        holder,
        built,
        slots,
        home: new THREE.Vector2(),
        pos: new THREE.Vector2(),
        vel: new THREE.Vector2(),
        yaw: 0,
        scale: 1,
        hover: 0,
        phase: i * 1.37,
        prevY: 0,
        lift: 0,
        liftVel: 0,
        nextRipple: 0.19 * i,
        tilt: new THREE.Vector2(),
        tiltVel: new THREE.Vector2(),
        dive: 0,
        diving: false,
      });
    };
    opts.ids.forEach((id) => addFloat(id, builders[id](), { landscape: landscapeLayout[id], portrait: portraitLayout[id] }));
    toyBuilders.forEach((build, i) => addFloat(null, build(), toySlots[i]));

    this.floatShadows = new FloatShadows(this.renderer, this.objects.map(o => o.built.group), this.shared.halfSize.value, D, light, opts.coarse);
    this.shared.shadowTex.value = this.floatShadows.target.texture;
    this.waterMat.uniforms.footprintTex.value = this.floatShadows.footprint.texture;
    this.waterMat.uniforms.contactTex.value = this.floatShadows.contact.texture;
    this.waterMat.uniforms.haloTex.value = this.floatShadows.halo.texture;
    this.bind();
    this.resize(true);
    // Lets a test drive the pool one exact frame at a time.
    if (opts.fx.size) (window as unknown as { __pool: unknown }).__pool = {
      renderer: this.renderer,
      causticRT: this.causticRT,
      drop: (x: number, z: number, radius: number, strength: number) => this.queueDrop(x, z, radius, strength),
      usesCausticMap: this.useCausticMap,
      project: (x: number, z: number) => {
        const p = new THREE.Vector3(x, 0, z).project(this.camera);
        return { x: (p.x * 0.5 + 0.5) * this.cw, y: (-p.y * 0.5 + 0.5) * this.ch };
      },
      // Each planter's place and reach on screen, for overlap tests.
      plants: () =>
        this.planting.spots().map((s) => {
          const c = new THREE.Vector3(s.x, RIM, s.z).project(this.camera);
          const e = new THREE.Vector3(s.x, RIM, s.z).addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion), s.reach).project(this.camera);
          const x = (c.x * 0.5 + 0.5) * this.cw;
          const y = (-c.y * 0.5 + 0.5) * this.ch;
          return { x, y, r: Math.hypot((e.x * 0.5 + 0.5) * this.cw - x, (-e.y * 0.5 + 0.5) * this.ch - y) };
        }),
      // Every toy's place and size on screen, for overlap tests.
      toys: () =>
        this.objects
          .filter((o) => !o.id)
          .map((o) => {
            const p = new THREE.Vector3(o.pos.x, o.holder.position.y + o.built.top * o.scale * 0.5, o.pos.y);
            const edge = p.clone().addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion), o.built.radius * o.holder.scale.x);
            p.project(this.camera);
            edge.project(this.camera);
            const x = (p.x * 0.5 + 0.5) * this.cw;
            const y = (-p.y * 0.5 + 0.5) * this.ch;
            return { x, y, r: Math.hypot((edge.x * 0.5 + 0.5) * this.cw - x, (-edge.y * 0.5 + 0.5) * this.ch - y) };
          }),
      step: (dt: number) => {
        this.stop();
        this.frame(this.last + dt * 1000);
      },
    };
    // A few opening drops so the first frame already looks like water.

    this.queueDrop(-0.9, 0.15, 0.16, 0.024);
    this.queueDrop(0.46, -0.55, 0.08, -0.032);
    this.queueDrop(1.02, 0.36, 0.07, 0.028);
  }

  /* ------------------------------------------------------------ events */
  private onMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.pointer.px = x;
    this.pointer.py = y;
    this.pointer.inside = true;
    this.ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
    this.parallaxTarget.set(this.ndc.x, this.ndc.y);
    const id = this.pick();
    this.setHover(id);
    this.canvas.style.cursor = id ? 'pointer' : 'grab';
    const p = this.waterPoint();
    if (p) {
      // A moving mouse brushes the floats aside. No force comes from a cursor
      // held still; on touchscreens movement requires a deliberate drag.
      if (this.lastPointerWorld && !this.opts.reducedMotion && (e.pointerType === 'mouse' || this.pointer.down)) {
        const movement = p.clone().sub(this.lastPointerWorld);
        const length = movement.length();
        if (length > 0.002 && length < 0.9) {
          const step = Math.min(0.1, length);
          for (const obj of this.objects) {
            if (obj.diving) continue;
            const delta = obj.pos.clone().sub(p);
            const dist = delta.length();
            const radius = obj.built.radius * obj.scale;
            const reach = radius + 0.17;
            if (dist > reach) continue;
            // Push in the pointer's direction, plus a small outward component
            // so a direct hit still visibly displaces the float.
            const outward = dist > 0.001 ? delta.multiplyScalar(1 / dist) : movement.clone().normalize();
            const falloff = Math.pow(1 - dist / reach, 1.25);
            const strength = Math.min(0.47, step * 3.1) * falloff;
            obj.vel.addScaledVector(movement.clone().normalize(), strength * 0.72);
            obj.vel.addScaledVector(outward, strength * 0.36);
            obj.tiltVel.x += outward.y * strength * 0.35;
            obj.tiltVel.y -= outward.x * strength * 0.35;
            this.queueDrop(obj.pos.x, obj.pos.y, Math.max(0.045, radius * 0.45), -Math.min(0.045, strength * 0.12));
          }
        }
      }
      if (p.distanceTo(this.pointer.lastDrop) > 0.045) {
        const strength = this.pointer.down ? 0.0066 : e.pointerType === 'mouse' ? 0.0026 : 0.004;
        this.queueDrop(p.x, p.y, this.pointer.down ? 0.075 : 0.055, strength);
        this.pointer.lastDrop.copy(p);
      }
      this.lastPointerWorld = p;
    } else {
      this.lastPointerWorld = null;
    }
  };

  private onDown = (e: PointerEvent) => {
    this.onMove(e);
    this.pointer.down = true;
    this.pointer.downX = e.clientX;
    this.pointer.downY = e.clientY;
    this.pointer.downId = this.pick();
  };

  private onUp = (e: PointerEvent) => {
    if (!this.pointer.down) return;
    this.pointer.down = false;
    const moved = Math.hypot(e.clientX - this.pointer.downX, e.clientY - this.pointer.downY);
    const id = this.pick();
    // The target may have drifted away during the click: keep the original
    // pointer-down hit so gentle floating physics cannot eat navigation.
    if (moved < 9 && this.pointer.downId) {
      this.opts.onActivate(this.pointer.downId);
    } else if (moved < 9 && !id) {
      const p = this.waterPoint();
      if (p) this.splash(p.x, p.y, 0.07, 0.06);
    }
    this.pointer.downId = null;
  };

  private onLeave = () => {
    this.pointer.inside = false;
    this.pointer.down = false;
    this.lastPointerWorld = null;
    this.pointer.lastDrop.set(99, 99);
    this.parallaxTarget.set(0, 0);
    this.setHover(null);
  };

  private onCancel = () => {
    this.pointer.down = false;
    this.pointer.downId = null;
    this.lastPointerWorld = null;
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.opts.onContextLost();
  };

  private onVisibility = () => {
    if (document.hidden) this.stop();
    else if (this.visible) this.start();
  };

  private visible = true;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;

  private bind() {
    const c = this.canvas;
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointerleave', this.onLeave);
    c.addEventListener('pointercancel', this.onCancel);
    c.addEventListener('webglcontextlost', this.onContextLost);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(c);
    this.ro.observe(this.frameEl);
    this.io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible && !document.hidden) this.start();
        else this.stop();
      },
      { threshold: 0 },
    );
    this.io.observe(c);
  }

  /* ----------------------------------------------------------- picking */
  private pick(): PoolObjectId | null {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.hits, false);
    return hits.length ? (hits[0].object.userData.id as PoolObjectId) : null;
  }

  private waterPoint(): THREE.Vector2 | null {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const p = this.raycaster.ray.intersectPlane(this.waterPlane, this.tmpV3);
    if (!p || Math.abs(p.x) > W - 0.02 || Math.abs(p.z) > L - 0.02) return null;
    return new THREE.Vector2(p.x, p.z);
  }

  private setHover(id: PoolObjectId | null) {
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.opts.onHover(id ?? this.focusId);
  }

  /** Keyboard focus from the DOM overlay. */
  setFocus(id: PoolObjectId | null) {
    this.focusId = id;
    if (id) {
      const o = this.objects.find((x) => x.id === id);
      if (o) this.splash(o.pos.x, o.pos.y + 0.0, 0.05, 0.02, false);
    }
  }

  /** Called before navigating: the object dips under with a splash. */
  activate(id: PoolObjectId): Promise<void> {
    const o = this.objects.find((x) => x.id === id);
    if (!o || this.opts.reducedMotion) return Promise.resolve();
    o.diving = true;
    this.splash(o.pos.x, o.pos.y, 0.16, -0.09);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      this.queueDrop(o.pos.x + Math.cos(a) * 0.22, o.pos.y + Math.sin(a) * 0.22, 0.05, 0.03);
    }
    return new Promise((res) => setTimeout(res, 520));
  }

  /** Reset after returning via the back/forward cache. */
  reset() {
    for (const o of this.objects) {
      o.diving = false;
      o.dive = 0;
    }
  }

  /* -------------------------------------------------------------- drops */
  queueDrop(x: number, z: number, radius: number, strength: number) {
    if (this.drops.length >= MAX_DROPS) return;
    this.drops.push(new THREE.Vector4(x, z, radius, strength));
  }

  private splash(x: number, z: number, radius: number, strength: number, push = true) {
    this.queueDrop(x, z, radius, strength);
    if (!push) return;
    for (const o of this.objects) {
      const dx = o.pos.x - x;
      const dz = o.pos.y - z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6 && d > 1e-4) {
        const k = Math.abs(strength) * 9 * (1 - d / 0.6);
        o.vel.x += (dx / d) * k;
        o.vel.y += (dz / d) * k;
        o.tiltVel.x += (dz / d) * k * 6;
        o.tiltVel.y -= (dx / d) * k * 6;
      }
    }
  }

  /* ------------------------------------------------------------- layout */
  resize(force = false) {
    if (this.disposed) return;
    const rect = this.canvas.getBoundingClientRect();
    const fr = this.frameEl.getBoundingClientRect();
    const cw = Math.max(1, rect.width);
    const ch = Math.max(1, rect.height);
    if (!force && cw === this.cw && ch === this.ch && this.lastFrame && sameRect(this.lastFrame, fr, rect)) return;
    this.lastFrame = { x: fr.left - rect.left, y: fr.top - rect.top, w: fr.width, h: fr.height };
    this.cw = cw;
    this.ch = ch;
    this.renderer.setSize(cw, ch, false);

    const f = this.lastFrame;
    const portrait = f.h > f.w;
    const changed = portrait !== this.portrait || force;
    this.portrait = portrait;
    this.shared.portraitMode.value = portrait ? 1 : 0;
    // The texture artwork is lit from screen upper-left. Rotate world sunlight
    // with the portrait camera so floor shadows always fall screen lower-right.
    this.shared.light.value.set(...(portrait ? SUN_PORTRAIT : SUN_LANDSCAPE)).normalize();
    this.scene.environmentRotation.y = portrait ? Math.PI / 2 : 0;
    const sunlight = this.scene.children.find(n => n instanceof THREE.DirectionalLight);
    sunlight?.position.copy(this.shared.light.value).multiplyScalar(6);
    const a = portrait ? L : W; // half extent along screen-x
    const b = portrait ? W : L; // half extent along screen-y
    const tilt = portrait ? TILT_PORTRAIT : TILT_LANDSCAPE;
    const s = Math.max(a / (f.w / 2), (b * Math.cos(tilt)) / (f.h / 2)); // world units per CSS px at rim
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    // Stand back far enough that the near rim, the widest part, fits the frame.
    const dist = (s * (ch / 2)) / Math.tan(fov / 2) + b * Math.sin(tilt);
    this.camDist = dist;
    this.camera.aspect = cw / ch;
    this.camera.up.set(portrait ? -1 : 0, 0, portrait ? 0 : -1);
    this.ndcShift.set((f.x + f.w / 2 - cw / 2) / (cw / 2), -(f.y + f.h / 2 - ch / 2) / (ch / 2));
    this.placeCamera();

    this.planting.place(portrait, this.shared.light.value, (x, z, reach) => {
      const c = new THREE.Vector3(x, RIM, z).project(this.camera);
      const e = new THREE.Vector3(x, RIM, z).addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion), reach).project(this.camera);
      const sx = (c.x * 0.5 + 0.5) * cw;
      const sy = (-c.y * 0.5 + 0.5) * ch;
      return this.opts.plantFits(sx, sy, Math.hypot((e.x * 0.5 + 0.5) * cw - sx, (-e.y * 0.5 + 0.5) * ch - sy));
    });
    if (changed) {
      for (const o of this.objects) {
        const slot = portrait ? o.slots.portrait : o.slots.landscape;
        const m = 0.9;
        const hx = portrait ? slot.sy * W * m : slot.sx * W * m;
        const hz = portrait ? -slot.sx * L * m : slot.sy * L * m;
        o.home.set(hx, hz);
        o.pos.copy(o.home);
        o.vel.set(0, 0);
        o.yaw = slot.yaw + (portrait ? Math.PI / 2 : 0);
        o.scale = slot.size;
      }
    }
    // Resizing clears the canvas, so always redraw before the browser paints.
    this.renderOnce();
  }

  private lastFrame: { x: number; y: number; w: number; h: number } | null = null;
  private camDist = 4;
  private ndcShift = new THREE.Vector2();
  private shiftM = new THREE.Matrix4();

  private placeCamera() {
    const px = this.opts.reducedMotion ? 0 : this.parallax.x * 0.05;
    const pz = this.opts.reducedMotion ? 0 : -this.parallax.y * 0.035;
    const tilt = this.portrait ? TILT_PORTRAIT : TILT_LANDSCAPE;
    const back = this.camDist * Math.sin(tilt); // towards the bottom of the screen
    const up = RIM + this.camDist * Math.cos(tilt);
    if (this.portrait) this.camera.position.set(back - pz, up, -px);
    else this.camera.position.set(px, up, back + pz);
    this.camera.lookAt(0, RIM - 0.04, 0);
    this.camera.updateProjectionMatrix();
    this.shiftM.set(1, 0, 0, this.ndcShift.x, 0, 1, 0, this.ndcShift.y, 0, 0, 1, 0, 0, 0, 0, 1);
    this.camera.projectionMatrix.premultiply(this.shiftM);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.camera.updateMatrixWorld();
  }

  /* --------------------------------------------------------------- loop */
  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private renderOnce() {
    this.frame(performance.now(), true);
  }

  private frame(now: number, still = false) {
    const dt = still ? 0 : Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.windClock += dt * this.windRate;
    const rm = this.opts.reducedMotion;

    // Parallax easing
    if (!rm) {
      this.parallax.lerp(this.parallaxTarget, 1 - Math.exp(-dt * 2.5));
      this.placeCamera();
    }

    // The odd stray gust. The wave field does the steady work.
    if (!rm && this.time > this.nextAmbient) {
      this.nextAmbient = this.time + 0.5 + Math.random() * 0.9;
      const x = (Math.random() * 2 - 1) * (W - 0.1);
      const z = (Math.random() * 2 - 1) * (L - 0.1);
      this.queueDrop(x, z, 0.04 + Math.random() * 0.04, (Math.random() < 0.5 ? -1 : 1) * (0.0015 + Math.random() * 0.002));
    }

    this.updateObjects(dt);
    if (!rm) this.planting.animate(this.time);

    // --- Simulation passes
    const r = this.renderer;
    if (this.drops.length) {
      const u = this.dropMat.uniforms;
      this.drops.forEach((d, i) => (u.drops.value as THREE.Vector4[])[i].copy(d));
      u.count.value = this.drops.length;
      this.pass(this.dropMat);
      this.drops.length = 0;
    }
    if (dt > 0) {
      const steps = Math.min(3, Math.max(1, Math.round(dt * 120)));
      for (let i = 0; i < steps; i++) this.pass(this.updateMat);
    }
    // Reduced motion freezes the wind rather than flattening the water.
    this.normalMat.uniforms.windTime.value = rm ? 0 : this.windClock;
    this.pass(this.normalMat);

    // --- Caustics
    if (this.useCausticMap) this.updateCausticMap(dt);

    // --- Main view
    this.floatShadows.render();
    this.waterMat.uniforms.water.value = this.rtA.texture;
    this.waterMat.uniforms.time.value = rm ? 0 : this.time;
    this.shared.poolTime.value = rm ? 0 : this.time;
    r.setRenderTarget(null);
    r.setClearColor(0xf5f0e7, 1);
    r.render(this.scene, this.camera);

    this.emitAnchors();
    if (!this.firstFrameSent) {
      this.firstFrameSent = true;
      this.opts.onFirstFrame();
    }
    if (!still) this.adaptQuality(dt);
  }

  private updateCausticMap(dt: number) {
    const r = this.renderer;
    const u = this.causticBlur.uniforms;
    this.causticMat.uniforms.water.value = this.rtA.texture;
    r.setRenderTarget(this.causticRaw);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.causticScene, this.simCam);
    // Soften it in two passes, sharing the fullscreen quad with the simulation.
    this.simQuad.material = this.causticBlur;
    u.settle.value = 1;
    u.tex.value = this.causticRaw.texture;
    u.direction.value.set(0.55 / this.causticRaw.width, 0);
    r.setRenderTarget(this.causticScratch);
    r.render(this.simScene, this.simCam);
    // Focus lines move several of their own widths between frames. Shown as they
    // are, each line jumps, and a long thin jump reads as a flash. So the visible
    // map eases towards the latest one over a fixed time, at any frame rate.
    u.settle.value = this.causticSeeded && dt > 0 ? 1 - Math.exp(-dt / this.causticSettle) : 1;
    this.causticSeeded = true;
    u.tex.value = this.causticScratch.texture;
    u.direction.value.set(0, 0.55 / this.causticRT.height);
    r.setRenderTarget(this.causticRT);
    const autoClear = r.autoClear;
    r.autoClear = false;
    r.render(this.simScene, this.simCam);
    r.autoClear = autoClear;
  }

  private pass(mat: THREE.ShaderMaterial) {
    mat.uniforms.tex.value = this.rtA.texture;
    this.simQuad.material = mat;
    this.renderer.setRenderTarget(this.rtB);
    this.renderer.render(this.simScene, this.simCam);
    const t = this.rtA;
    this.rtA = this.rtB;
    this.rtB = t;
  }

  private updateObjects(dt: number) {
    const rm = this.opts.reducedMotion;
    const active = this.hoverId ?? this.focusId;
    for (const o of this.objects) {
      // Light buoyancy: keep drifting for a moment, then return slowly toward
      // each float's starting area rather than snapping into place. Toys pull
      // less, and paddle around a slowly wandering home of their own.
      const decor = !o.id;
      const k = rm ? 4.0 : decor ? 0.5 : 1.15;
      const c = rm ? 3.0 : decor ? 0.9 : 1.35;
      const roam = this.portrait ? 0.3 : 1;
      const homeX = o.home.x + (decor && !rm ? Math.sin(this.time * 0.13 + o.phase) * 0.2 * roam : 0);
      const homeZ = o.home.y + (decor && !rm ? Math.cos(this.time * 0.1 + o.phase * 1.7) * 0.05 * roam : 0);
      o.vel.x += ((homeX - o.pos.x) * k - o.vel.x * c) * dt;
      o.vel.y += ((homeZ - o.pos.y) * k - o.vel.y * c) * dt;
      o.vel.clampLength(0, 0.85);
      const speed = o.vel.length();
      o.pos.addScaledVector(o.vel, dt);
      // Toys turn to face where they are going.
      if (decor && speed > 0.008) {
        const turn = Math.atan2(o.vel.x, o.vel.y) - o.yaw;
        o.yaw += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-dt * 1.2));
      }
      const target = active === o.id ? 1 : 0;
      o.hover += (target - o.hover) * (1 - Math.exp(-dt * 12));
      o.dive += ((o.diving ? 1 : 0) - o.dive) * (1 - Math.exp(-dt * 7));

      // Buoyancy: the float is sprung to the swell it is sitting on, with a
      // little lag and overshoot that grow with its mass.
      const t = this.time;
      const swell = rm ? null : swellAt(o.pos.x, o.pos.y, this.windClock);
      const mass = o.built.mass;
      o.liftVel += (((swell?.height ?? 0) * 2.6 - o.lift) * (46 / mass) - o.liftVel * (7 / mass)) * dt;
      o.lift += o.liftVel * dt;
      const cosYaw = Math.cos(o.yaw);
      const sinYaw = Math.sin(o.yaw);
      const pitchTarget = swell ? -(swell.slopeZ * cosYaw - swell.slopeX * sinYaw) * 2.4 : 0;
      const rollTarget = swell ? (swell.slopeX * cosYaw + swell.slopeZ * sinYaw) * 2.4 : 0;
      o.tiltVel.x += ((pitchTarget - o.tilt.x) * (24 / mass) - o.tiltVel.x * 4.5) * dt;
      o.tiltVel.y += ((rollTarget - o.tilt.y) * (24 / mass) - o.tiltVel.y * 4.5) * dt;
      o.tilt.addScaledVector(o.tiltVel, dt);
      // Rock only as far as the freeboard allows: past this the low edge of a
      // wide float would dip through the opaque water surface.
      o.tilt.clampScalar(-o.built.maxTilt, o.built.maxTilt);

      const y = o.lift + o.hover * 0.012 - o.dive * 0.32;
      const h = o.holder;
      h.position.set(o.pos.x, y, o.pos.y);
      h.rotation.set(o.tilt.x, o.yaw + (rm ? 0 : Math.sin(t * 0.22 + o.phase) * 0.05), o.tilt.y, 'YXZ');
      h.scale.setScalar(o.scale * (1 + o.hover * 0.05) * (1 - o.dive * 0.25));
      if (!rm) o.built.animate?.(t, o.hover, speed);

      // Bobbing and drifting push water around the float.
      if (dt > 0) {
        const dy = y - o.prevY;
        const r = o.built.radius * o.scale * 0.85;
        if (Math.abs(dy) > 1e-4) this.queueDrop(o.pos.x, o.pos.y, r, -dy * 0.5);
        if (speed > 0.05) this.queueDrop(o.pos.x - o.vel.x * 0.15, o.pos.y - o.vel.y * 0.15, r * 0.6, speed * 0.004);
        // An occasional low ring off the hull, as the float settles.
        if (!rm && this.time >= o.nextRipple) {
          this.queueDrop(o.pos.x, o.pos.y, Math.max(0.05, r * 0.72), -0.01);
          o.nextRipple = this.time + 1.3 + 0.2 * o.phase;
        }
      }
      o.prevY = y;
    }

    // Symmetric circle collisions and pool-edge constraints. The centre float
    // is physically larger; smaller ducks separate without overlapping it.
    for (let i = 0; i < this.objects.length; i++) {
      const a = this.objects[i];
      for (let j = i + 1; j < this.objects.length; j++) {
        const b = this.objects[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.y - a.pos.y;
        const dist = Math.hypot(dx, dz);
        const ra = a.built.radius * a.scale * 0.92;
        const rb = b.built.radius * b.scale * 0.92;
        const required = ra + rb + 0.022;
        if (dist >= required) continue;
        const nx = dist > 1e-5 ? dx / dist : 1;
        const nz = dist > 1e-5 ? dz / dist : 0;
        // In portrait a toy gives way entirely: it never shoves a project float.
        const shareA = this.portrait && a.id && !b.id ? 0 : this.portrait && b.id && !a.id ? 1 : 0.5;
        const overlap = required - dist;
        a.pos.x -= nx * overlap * shareA;
        a.pos.y -= nz * overlap * shareA;
        b.pos.x += nx * overlap * (1 - shareA);
        b.pos.y += nz * overlap * (1 - shareA);
        const closing = (a.vel.x - b.vel.x) * nx + (a.vel.y - b.vel.y) * nz;
        if (closing > 0) {
          const bounce = closing * 0.47;
          a.vel.x -= nx * bounce;
          a.vel.y -= nz * bounce;
          b.vel.x += nx * bounce;
          b.vel.y += nz * bounce;
        }
      }
    }
    for (const o of this.objects) {
      const radius = o.built.radius * o.scale;
      // Nothing drifts under the call to action: slide out along screen-vertical.
      const keep = this.portrait ? CTA_PORTRAIT : CTA_LANDSCAPE;
      const reachX = keep.halfX + radius;
      const reachZ = keep.halfZ + radius;
      const offX = o.pos.x - keep.x;
      const offZ = o.pos.y - keep.z;
      if (Math.abs(offX) < reachX && Math.abs(offZ) < reachZ) {
        if (this.portrait) {
          o.pos.x = keep.x + (offX < 0 ? -reachX : reachX);
          o.vel.x *= -0.3;
        } else {
          o.pos.y = keep.z + (offZ < 0 ? -reachZ : reachZ);
          o.vel.y *= -0.3;
        }
      }
      const edgeX = W - radius - 0.035;
      const edgeZ = L - radius - 0.035;
      if (Math.abs(o.pos.x) > edgeX) {
        o.pos.x = Math.sign(o.pos.x) * edgeX;
        o.vel.x *= -0.26;
      }
      if (Math.abs(o.pos.y) > edgeZ) {
        o.pos.y = Math.sign(o.pos.y) * edgeZ;
        o.vel.y *= -0.26;
      }
      if (this.portrait) {
        const cell = o.id ? CELL_FLOAT : CELL_TOY;
        const offX = o.pos.x - o.home.x;
        const offZ = o.pos.y - o.home.y;
        const off = Math.hypot(offX, offZ);
        if (off > cell) {
          o.pos.x = o.home.x + (offX / off) * cell;
          o.pos.y = o.home.y + (offZ / off) * cell;
          o.vel.multiplyScalar(0.4);
        }
      }
      // Deliberately allow toys on either side: the headline is now painted
      // on the pool floor and can be refracted beneath the water.
      // Collision response is reflected in the visible geometry this frame.
      o.holder.position.x = o.pos.x;
      o.holder.position.z = o.pos.y;
    }
  }

  private emitAnchors() {
    const rightW = this.tmpV3b.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    for (const o of this.objects) {
      if (!o.id) continue;
      const p = this.tmpV3.set(o.pos.x, o.holder.position.y + o.built.top * o.scale * 0.5, o.pos.y);
      const r = o.built.radius * o.holder.scale.x;
      const edge = p.clone().addScaledVector(rightW, r).project(this.camera);
      p.project(this.camera);
      const x = (p.x * 0.5 + 0.5) * this.cw;
      const y = (-p.y * 0.5 + 0.5) * this.ch;
      const ex = (edge.x * 0.5 + 0.5) * this.cw;
      const ey = (-edge.y * 0.5 + 0.5) * this.ch;
      this.anchors.set(o.id, { x, y, r: Math.hypot(ex - x, ey - y) });
    }
    const keep = this.portrait ? CTA_PORTRAIT : CTA_LANDSCAPE;
    const spot = this.tmpV3.set(keep.x, 0, keep.z).project(this.camera);
    this.opts.onFrame(this.anchors, this.portrait, { x: (spot.x * 0.5 + 0.5) * this.cw, y: (-spot.y * 0.5 + 0.5) * this.ch });
  }

  /** Step down one rung at a time while the frame rate stays under 40 fps. */
  private adaptQuality(dt: number) {
    if (this.frameTimes.length > 200) return;
    if (this.time < 1.5) return; // ignore warm-up
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg <= 1 / 40) {
      this.frameTimes.length = 201; // done measuring
    } else if (this.pixelRatio > 1) {
      this.pixelRatio = 1;
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(this.cw, this.ch, false);
      this.renderOnce(); // resizing clears the canvas: never show that blank frame
    } else if (this.causticSettle < 0.15) {
      // Never refresh the light less often: that is what makes it flash. A slow
      // device takes bigger steps, so the light moves slower and softer instead.
      this.causticSettle = 0.16;
      this.windRate = Math.min(this.windRate, 0.34);
    } else {
      this.frameTimes.length = 201; // nothing left to give up
    }
  }

  /* ------------------------------------------------------------ cleanup */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    const c = this.canvas;
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('pointercancel', this.onCancel);
    c.removeEventListener('webglcontextlost', this.onContextLost);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.ro?.disconnect();
    this.io?.disconnect();
    const disposeTree = (root: THREE.Object3D) =>
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    disposeTree(this.scene);
    disposeTree(this.simScene);
    disposeTree(this.causticScene);
    [this.dropMat, this.updateMat, this.normalMat].forEach((m) => m.dispose());
    disposeObjectResources();
    this.rtA.dispose();
    this.rtB.dispose();
    this.causticRT.dispose();
    this.causticRaw.dispose();
    this.causticScratch.dispose();
    this.causticBlur.dispose();
    this.rippleTex.dispose();
    this.envRT?.dispose();
    this.floorTypeTex.dispose();
    this.planting.dispose();
    this.leafTex.dispose();
    this.floatShadows.dispose();
    this.renderer.dispose();
  }
}

/** A sky to light the floats by: blue overhead, pale haze, one warm sun, water below. */
function skyDome(sunDir: THREE.Vector3) {
  const scene = new THREE.Scene();
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { sunDir: { value: sunDir.clone() } },
        vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 sunDir; varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            vec3 c = mix(vec3(0.95, 1.0, 1.05), vec3(0.34, 0.62, 1.0), pow(max(d.y, 0.0), 0.6));
            if (d.y < 0.0) c = mix(c, vec3(0.08, 0.62, 0.74), smoothstep(0.0, -0.18, d.y));
            float a = max(dot(d, sunDir), 0.0);
            c += vec3(1.0, 0.92, 0.78) * (pow(a, 900.0) * 60.0 + pow(a, 24.0) * 1.1);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    ),
  );
  return scene;
}

/**
 * Palm and leaf shadows for the deck and pool floor, drawn once at low
 * resolution: upscaling is what softens them, and canvas filters are not
 * available everywhere. The red channel is shade (1 = full shadow).
 */
function paintFoliage() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d');
  c?.scale(2, 2);
  let wobble = 3;
  const jitter = () => ((wobble = (wobble * 7919) % 1009) / 1009 - 0.5);
  const frond = (x: number, y: number, angle: number, length: number, leaves: number) => {
    if (!c) return;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    for (let i = 1; i <= leaves; i++) {
      const along = (i / leaves) * length;
      const size = length * 0.46 * Math.sin((i / leaves) * Math.PI * 0.86 + 0.14);
      for (const side of [1, -1]) {
        const reach = size * (0.85 + jitter() * 0.5);
        const sweep = along + reach * (0.8 + jitter() * 0.4);
        c.beginPath();
        c.moveTo(along, 0);
        c.quadraticCurveTo(along + reach * 0.4, side * reach * 0.42, sweep, side * reach);
        c.quadraticCurveTo(along + reach * 0.12, side * reach * 0.3, along + 0.6, 0);
        c.fill();
      }
    }
    c.restore();
  };
  const round = (x: number, y: number, count: number, spread: number) => {
    if (!c) return;
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996;
      const d = Math.sqrt(i / count) * spread;
      c.beginPath();
      c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 3.2 + (i % 3), 1.8 + (i % 2), a, 0, Math.PI * 2);
      c.fill();
    }
  };
  if (c) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#fff';
    // Palm over the top-left corner, towards the sun, reaching over the coping.
    for (const [a, l] of [[0.1, 46], [0.62, 56], [1.15, 54], [1.75, 42], [-0.42, 36]] as const) frond(50, 66, a, l, 9);
    // Leafy trees past the left deck and along the top edge.
    round(28, 150, 34, 30);
    round(120, 34, 26, 26);
    // Palm reaching in from the far corner, along the bottom and right decks.
    for (const [a, l] of [[3.5, 40], [4.05, 44], [2.95, 34], [4.6, 30]] as const) frond(214, 190, a, l, 8);
    round(150, 222, 30, 24);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false; // canvas y is world z
  return texture;
}

function sameRect(a: { x: number; y: number; w: number; h: number }, fr: DOMRect, cr: DOMRect) {
  return (
    Math.abs(a.x - (fr.left - cr.left)) < 0.5 &&
    Math.abs(a.y - (fr.top - cr.top)) < 0.5 &&
    Math.abs(a.w - fr.width) < 0.5 &&
    Math.abs(a.h - fr.height) < 0.5
  );
}
