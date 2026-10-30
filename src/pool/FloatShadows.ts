import * as THREE from 'three';
import { fullscreenVert } from './shaders';

/** Alpha silhouettes projected along refracted sunlight, then blurred in floor space.
 * The shadow meshes share geometry/textures, but own their materials and targets.
 */
export class FloatShadows {
  readonly target: THREE.WebGLRenderTarget;
  private scratch: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private blurScene = new THREE.Scene();
  private blurMat: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private entries: { source: THREE.Mesh; proxy: THREE.Mesh }[] = [];
  private materials: THREE.Material[] = [];

  constructor(private renderer: THREE.WebGLRenderer, roots: THREE.Object3D[], half: THREE.Vector2, private depth: number, light: THREE.Vector3) {
    const options = { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.target = new THREE.WebGLRenderTarget(512, 320, options);
    this.scratch = new THREE.WebGLRenderTarget(512, 320, options);
    for (const root of roots) root.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || node.userData.submerged || (node.material as THREE.Material).visible === false) return;
      const map = (node.material as THREE.MeshPhysicalMaterial).map ?? null;
      const material = new THREE.ShaderMaterial({
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
      const proxy = new THREE.Mesh(node.geometry, material);
      proxy.matrixAutoUpdate = false;
      proxy.frustumCulled = false;
      this.scene.add(proxy);
      this.entries.push({ source: node, proxy });
      this.materials.push(material);
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

  render() {
    let maxHeight = 0;
    for (const { source, proxy } of this.entries) {
      let visible = true;
      for (let n: THREE.Object3D | null = source; n; n = n.parent) visible = visible && n.visible;
      proxy.visible = visible;
      if (visible) {
        source.updateWorldMatrix(true, false);
        proxy.matrix.copy(source.matrixWorld);
        maxHeight = Math.max(maxHeight, source.matrixWorld.elements[13]);
      }
    }
    const r = this.renderer;
    const softness = 1.85 + (this.depth + maxHeight) * 1.2;
    r.setRenderTarget(this.target); r.setClearColor(0, 0); r.clear(); r.render(this.scene, this.camera);
    this.blurMat.uniforms.tex.value = this.target.texture;
    this.blurMat.uniforms.direction.value.set(softness / 512, 0);
    r.setRenderTarget(this.scratch); r.render(this.blurScene, this.camera);
    this.blurMat.uniforms.tex.value = this.scratch.texture;
    this.blurMat.uniforms.direction.value.set(0, softness / 320);
    r.setRenderTarget(this.target); r.render(this.blurScene, this.camera);
  }

  dispose() {
    this.target.dispose(); this.scratch.dispose(); this.blurMat.dispose(); this.quad.geometry.dispose();
    this.materials.forEach(m => m.dispose());
  }
}
