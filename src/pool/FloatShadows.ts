import * as THREE from 'three';
import { fullscreenVert } from './shaders';

/** Hulls deeper than this are cut away, leaving only what meets the water. */
const WATERLINE_Y = 0.04;

/**
 * Everything the water needs to know about the floats, rendered once a frame
 * so the water shader never has to loop over objects:
 *  - `target`: alpha silhouettes projected along refracted sunlight, blurred in
 *    floor space (the floor shadow).
 *  - `footprint`: the hulls at the waterline, seen from straight above, in their
 *    own colours (rgb premultiplied, a = coverage).
 *  - `contact`: the footprint blurred, for the crease, meniscus and reflections.
 *  - `halo`: the footprint blurred widely, in half float so its long tail stays
 *    smooth. The water reads ripple rings from it.
 * The proxies share geometry and textures, but own their materials and targets.
 */
export class FloatShadows {
  readonly target: THREE.WebGLRenderTarget;
  readonly footprint: THREE.WebGLRenderTarget;
  readonly contact: THREE.WebGLRenderTarget;
  readonly halo: THREE.WebGLRenderTarget;
  private haloScratch: THREE.WebGLRenderTarget;
  private scratch: THREE.WebGLRenderTarget;
  private contactScratch: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private footprintScene = new THREE.Scene();
  private camera = new THREE.Camera();
  private blurScene = new THREE.Scene();
  private blurMat: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private entries: { source: THREE.Mesh; proxies: THREE.Mesh[] }[] = [];
  private materials: THREE.Material[] = [];

  constructor(private renderer: THREE.WebGLRenderer, roots: THREE.Object3D[], half: THREE.Vector2, private depth: number, light: THREE.Vector3, coarse: boolean) {
    const options = { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const [w, h] = coarse ? [384, 240] : [512, 320];
    this.target = new THREE.WebGLRenderTarget(w, h, options);
    this.scratch = new THREE.WebGLRenderTarget(w, h, options);
    this.footprint = new THREE.WebGLRenderTarget(w, h, options);
    this.contact = new THREE.WebGLRenderTarget(192, 120, options);
    this.contactScratch = new THREE.WebGLRenderTarget(192, 120, options);
    this.halo = new THREE.WebGLRenderTarget(96, 60, { ...options, type: THREE.HalfFloatType });
    this.haloScratch = new THREE.WebGLRenderTarget(96, 60, { ...options, type: THREE.HalfFloatType });

    for (const root of roots) root.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || (node.material as THREE.Material).visible === false) return;
      const source = node.material as THREE.MeshPhysicalMaterial;
      const map = source.map ?? null;
      const shadowMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: map }, hasMap: { value: !!map }, halfSize: { value: half }, depth: { value: depth }, light: { value: light } },
        vertexShader: `varying vec2 vUv; uniform vec2 halfSize; uniform float depth; uniform vec3 light;
          void main() { vUv=uv; vec3 p=(modelMatrix*vec4(position,1.0)).xyz;
          vec3 ray=refract(-light,vec3(0.,1.,0.),1./1.333);
          vec2 q=p.xz+ray.xz*((-depth-p.y)/ray.y);
          gl_Position=vec4(q/halfSize,0.,1.); }`,
        fragmentShader: `uniform sampler2D map; uniform bool hasMap; varying vec2 vUv;
          void main() { float a=hasMap?texture2D(map,vUv).a:1.; if(a<.05)discard; gl_FragColor=vec4(a); }`,
        transparent: true, blending: THREE.NormalBlending, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
      });
      const footMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: map }, hasMap: { value: !!map }, tint: { value: (source.color ?? new THREE.Color('#ffffff')).clone() }, halfSize: { value: half } },
        vertexShader: `varying vec2 vUv; varying float vY; uniform vec2 halfSize;
          void main() { vUv=uv; vec3 p=(modelMatrix*vec4(position,1.0)).xyz; vY=p.y;
          gl_Position=vec4(p.xz/halfSize,0.,1.); }`,
        fragmentShader: `uniform sampler2D map; uniform bool hasMap; uniform vec3 tint; varying vec2 vUv; varying float vY;
          void main() { if(vY>${WATERLINE_Y.toFixed(3)})discard;
          vec4 c=hasMap?texture2D(map,vUv):vec4(1.); if(c.a<.05)discard;
          gl_FragColor=vec4(pow(c.rgb*tint,vec3(1./2.2)),1.); }`,
        side: THREE.DoubleSide, depthTest: false, depthWrite: false,
      });
      const proxies = [new THREE.Mesh(node.geometry, shadowMat), new THREE.Mesh(node.geometry, footMat)];
      for (const proxy of proxies) {
        proxy.matrixAutoUpdate = false;
        proxy.frustumCulled = false;
      }
      this.scene.add(proxies[0]);
      this.footprintScene.add(proxies[1]);
      this.entries.push({ source: node, proxies });
      this.materials.push(shadowMat, footMat);
    });

    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: `uniform sampler2D tex; uniform vec2 direction; varying vec2 vUv;
        void main(){ vec4 c=texture2D(tex,vUv)*.227027;
        c+=(texture2D(tex,vUv+direction*1.384615)+texture2D(tex,vUv-direction*1.384615))*.316216;
        c+=(texture2D(tex,vUv+direction*3.230769)+texture2D(tex,vUv-direction*3.230769))*.070270;
        gl_FragColor=c; }`,
      uniforms: { tex: { value: null }, direction: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMat);
    this.quad.frustumCulled = false;
    this.blurScene.add(this.quad);
  }

  private blur(from: THREE.WebGLRenderTarget, via: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, radius: number) {
    const r = this.renderer;
    const u = this.blurMat.uniforms;
    u.tex.value = from.texture;
    u.direction.value.set(radius / to.width, 0);
    r.setRenderTarget(via);
    r.render(this.blurScene, this.camera);
    u.tex.value = via.texture;
    u.direction.value.set(0, radius / to.height);
    r.setRenderTarget(to);
    r.render(this.blurScene, this.camera);
  }

  render() {
    let maxHeight = 0;
    for (const { source, proxies } of this.entries) {
      let visible = true;
      for (let n: THREE.Object3D | null = source; n; n = n.parent) visible = visible && n.visible;
      source.updateWorldMatrix(true, false);
      for (const proxy of proxies) {
        proxy.visible = visible;
        if (visible) proxy.matrix.copy(source.matrixWorld);
      }
      if (visible) maxHeight = Math.max(maxHeight, source.matrixWorld.elements[13]);
    }
    const r = this.renderer;
    r.setClearColor(0, 0);
    r.setRenderTarget(this.target);
    r.clear();
    r.render(this.scene, this.camera);
    this.blur(this.target, this.scratch, this.target, 1.85 + (this.depth + maxHeight) * 1.2);

    r.setRenderTarget(this.footprint);
    r.clear();
    r.render(this.footprintScene, this.camera);
    this.blur(this.footprint, this.contactScratch, this.contact, 1.25);
    this.blur(this.contact, this.haloScratch, this.halo, 1.6);
    this.blur(this.halo, this.haloScratch, this.halo, 2.4);
  }

  dispose() {
    [this.target, this.scratch, this.footprint, this.contact, this.contactScratch, this.halo, this.haloScratch].forEach((t) => t.dispose());
    this.blurMat.dispose();
    this.quad.geometry.dispose();
    this.materials.forEach((m) => m.dispose());
  }
}
