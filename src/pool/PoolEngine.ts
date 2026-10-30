import * as THREE from 'three';
import {
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
import { builders, disposeObjectResources, type BuiltObject } from './objects';
import { landscapeLayout, POOL, portraitLayout, type PoolObjectId } from './layout';

export interface Anchor {
  x: number;
  y: number;
  r: number;
}

export interface EngineOptions {
  reducedMotion: boolean;
  coarse: boolean;
  ids: PoolObjectId[];
  onHover(id: PoolObjectId | null): void;
  onActivate(id: PoolObjectId): void;
  onFrame(anchors: Map<PoolObjectId, Anchor>, portrait: boolean): void;
  onFirstFrame(): void;
  onContextLost(): void;
}

interface ObjState {
  id: PoolObjectId;
  holder: THREE.Group;
  built: BuiltObject;
  hit: THREE.Mesh;
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

const { halfX: W, halfZ: L, depth: D, rimH: RIM, coping: COPING } = POOL;

/**
 * Real-time pool: heightfield water simulation on the GPU, caustics, a
 * ray-traced tiled interior, a tiled deck, and seven floating objects.
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
  /** Caustics are re-rendered every Nth frame; slow devices raise this. */
  private causticEvery: number;
  private frameCount = 0;
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
    // Light pattern moves slowly: phones can refresh it every other frame unseen.
    this.causticEvery = opts.coarse ? 2 : 1;
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
    const cRes = opts.coarse ? 640 : 1024;
    this.causticRT = new THREE.WebGLRenderTarget(cRes, Math.round((cRes * L) / W), rtOpts);

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
      ink.font = '400 192px "Piedra", Georgia, serif';
      ink.fillText('Martin Zhong', 768, 442, 1120);
      ink.font = '400 76px "Geo", ui-monospace, monospace';
      ink.fillText('welcome to my world', 768, 582, 900);
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
    const light = new THREE.Vector3(-0.35, 1.0, -0.56).normalize();
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
        focusGain: { value: 6.5 },
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
    this.waterMat = new THREE.ShaderMaterial({
      vertexShader: waterVert,
      fragmentShader: waterFrag,
      uniforms: {
        ...this.shared,
        water: { value: null },
        sunDir: { value: light },
        absorb: { value: new THREE.Vector3(0.62, 0.055, 0.02) },
        deepColor: { value: new THREE.Vector3(0.02, 0.62, 0.86) },
        time: { value: 0 },
        footprintTex: { value: null },
        contactTex: { value: null },
      },
    });
    const water = new THREE.Mesh(gridGeo(simW, simH), this.waterMat);
    water.frustumCulled = false;
    this.scene.add(water);

    this.poolMat = new THREE.ShaderMaterial({
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
    this.scene.add(new THREE.HemisphereLight(0xfffaf0, 0x53d4e6, 0.95));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.05);
    sun.position.copy(light).multiplyScalar(6);
    this.scene.add(sun);

    // Satin-metal pool rails: a lightweight, physically lit detail at the
    // upper-left coping in the approved homepage reference.
    const railMat = new THREE.MeshStandardMaterial({ color: 0xd0dee3, metalness: 0.83, roughness: 0.23 });
    for (const z of [-0.79, -0.54]) {
      const railCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-W - 0.15, 0.19, z),
        new THREE.Vector3(-W - 0.10, 0.20, z),
        new THREE.Vector3(-W + 0.01, 0.14, z),
        new THREE.Vector3(-W + 0.115, 0.015, z),
        new THREE.Vector3(-W + 0.17, -0.24, z),
      ]);
      const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 28, 0.012, 10, false), railMat);
      this.scene.add(rail);
    }

    // --- Objects -------------------------------------------------------
    opts.ids.forEach((id, i) => {
      const built = builders[id]();
      const holder = new THREE.Group();
      holder.add(built.group);
      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(built.radius * 1.12, built.radius * 1.12, built.top + 0.16, 24),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.y = built.top / 2;
      hit.userData.id = id;
      holder.add(hit);
      this.scene.add(holder);
      this.objects.push({
        id,
        holder,
        built,
        hit,
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
    });

    this.floatShadows = new FloatShadows(this.renderer, this.objects.map(o => o.built.group), this.shared.halfSize.value, D, light, opts.coarse);
    this.shared.shadowTex.value = this.floatShadows.target.texture;
    this.waterMat.uniforms.footprintTex.value = this.floatShadows.footprint.texture;
    this.waterMat.uniforms.contactTex.value = this.floatShadows.contact.texture;
    this.bind();
    this.resize(true);
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
        const strength = this.pointer.down ? 0.0114 : e.pointerType === 'mouse' ? 0.0054 : 0.0072;
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
    const hits = this.raycaster.intersectObjects(
      this.objects.map((o) => o.hit),
      false,
    );
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
    this.shared.light.value.set(-0.35, 1.0, portrait ? 0.56 : -0.56).normalize();
    this.scene.environmentRotation.y = portrait ? 2 * Math.atan2(0.56, 0.35) : 0;
    const sunlight = this.scene.children.find(n => n instanceof THREE.DirectionalLight);
    sunlight?.position.copy(this.shared.light.value).multiplyScalar(6);
    const a = portrait ? L : W; // half extent along screen-x
    const b = portrait ? W : L; // half extent along screen-y
    const s = Math.max(a / (f.w / 2), b / (f.h / 2)); // world units per CSS px at rim
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const dist = (s * (ch / 2)) / Math.tan(fov / 2);
    this.camDist = dist;
    this.camera.aspect = cw / ch;
    this.camera.up.set(portrait ? -1 : 0, 0, portrait ? 0 : -1);
    this.ndcShift.set((f.x + f.w / 2 - cw / 2) / (cw / 2), -(f.y + f.h / 2 - ch / 2) / (ch / 2));
    this.placeCamera();

    if (changed) {
      const layout = portrait ? portraitLayout : landscapeLayout;
      for (const o of this.objects) {
        const slot = layout[o.id];
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
    if (!this.running) this.renderOnce();
  }

  private lastFrame: { x: number; y: number; w: number; h: number } | null = null;
  private camDist = 4;
  private ndcShift = new THREE.Vector2();
  private shiftM = new THREE.Matrix4();

  private placeCamera() {
    const px = this.opts.reducedMotion ? 0 : this.parallax.x * 0.05;
    const pz = this.opts.reducedMotion ? 0 : -this.parallax.y * 0.035;
    const ox = this.portrait ? -pz : px;
    const oz = this.portrait ? -px : pz;
    const depthBias = this.portrait ? 0.16 : 0.22;
    const yawBias = this.portrait ? -0.08 : 0.0;
    this.camera.position.set(ox + yawBias, RIM + this.camDist * 0.94, oz + this.camDist * depthBias);
    this.camera.lookAt(0, RIM - 0.04, this.portrait ? -0.02 : 0.08);
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
    this.normalMat.uniforms.windTime.value = rm ? 0 : this.time;
    this.pass(this.normalMat);

    // --- Caustics
    if (this.frameCount++ % this.causticEvery === 0 || still) {
      this.causticMat.uniforms.water.value = this.rtA.texture;
      r.setRenderTarget(this.causticRT);
      r.setClearColor(0x000000, 1);
      r.clear();
      r.render(this.causticScene, this.simCam);
    }

    // --- Main view
    this.floatShadows.render();
    this.waterMat.uniforms.water.value = this.rtA.texture;
    this.waterMat.uniforms.time.value = this.time;
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
      // each project's starting area rather than snapping into place.
      const k = rm ? 4.0 : 1.15;
      const c = rm ? 3.0 : 1.35;
      o.vel.x += ((o.home.x - o.pos.x) * k - o.vel.x * c) * dt;
      o.vel.y += ((o.home.y - o.pos.y) * k - o.vel.y * c) * dt;
      o.vel.clampLength(0, 0.85);
      const speed = o.vel.length();
      o.pos.addScaledVector(o.vel, dt);
      const target = active === o.id ? 1 : 0;
      o.hover += (target - o.hover) * (1 - Math.exp(-dt * 12));
      o.dive += ((o.diving ? 1 : 0) - o.dive) * (1 - Math.exp(-dt * 7));

      // Buoyancy: the float is sprung to the swell it is sitting on, with a
      // little lag and overshoot that grow with its mass.
      const t = this.time;
      const swell = rm ? null : swellAt(o.pos.x, o.pos.y, t);
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
          this.queueDrop(o.pos.x, o.pos.y, Math.max(0.055, r * 0.85), -0.0016);
          o.nextRipple = this.time + 1.7 + 0.2 * o.phase;
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
        const correction = (required - dist) * 0.5;
        a.pos.x -= nx * correction;
        a.pos.y -= nz * correction;
        b.pos.x += nx * correction;
        b.pos.y += nz * correction;
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
    this.opts.onFrame(this.anchors, this.portrait);
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
    } else if (this.causticEvery < 2) {
      this.causticEvery = 2;
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
    this.envRT?.dispose();
    this.floorTypeTex.dispose();
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
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  const frond = (x: number, y: number, angle: number, length: number, leaves: number) => {
    if (!c) return;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    for (let i = 1; i <= leaves; i++) {
      const along = (i / leaves) * length;
      const size = length * 0.42 * Math.sin((i / leaves) * Math.PI * 0.86 + 0.14);
      for (const side of [1, -1]) {
        c.beginPath();
        c.moveTo(along, 0);
        c.quadraticCurveTo(along + size * 0.45, side * size * 0.34, along + size * 0.72, side * size);
        c.quadraticCurveTo(along + size * 0.2, side * size * 0.42, along, 0);
        c.fill();
      }
    }
    c.restore();
  };
  if (c) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#fff';
    // Palm over the top-left corner, towards the sun, reaching over the coping.
    for (const [a, l] of [[0.1, 46], [0.62, 56], [1.15, 54], [1.75, 42], [-0.42, 36]] as const) frond(50, 66, a, l, 11);
    // Lower growth on the far corner, on the deck.
    for (const [a, l] of [[3.5, 40], [4.05, 44], [2.95, 34], [4.6, 30]] as const) frond(214, 190, a, l, 10);
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
