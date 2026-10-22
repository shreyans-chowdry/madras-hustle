// ===================== WORLD: renderer, post-processing, materials, sky, spatial lookups =====================
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const QUALITY = {
  low: { label: 'Low', pr: 1.0, shadows: false, shadowSize: 1024, post: 0, fogNear: 160, fogFar: 700, far: 900, traffic: 22, peds: 22, parked: 8, treeDist: 300 },
  high: { label: 'High', pr: 1.5, shadows: true, shadowSize: 2048, post: 1, fogNear: 260, fogFar: 1100, far: 1400, traffic: 36, peds: 40, parked: 12, treeDist: 520 },
  ultra: { label: 'Ultra', pr: 1.5, shadows: true, shadowSize: 4096, post: 2, fogNear: 300, fogFar: 1300, far: 1600, traffic: 44, peds: 50, parked: 14, treeDist: 650 },
};
let qName = store.get('mh-quality2') || 'high'; if (!QUALITY[qName]) qName = 'high';
let Q = QUALITY[qName];

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Q.pr));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = Q.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.6, Q.far);
scene.fog = new THREE.Fog(0xd8c9a8, Q.fogNear, Q.fogFar);
const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x8a7a5c, 0.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize);
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 600 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5; sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);
const uNight = { value: 0 };
const uTime = { value: 0 };

// ---------- post-processing ----------
let composer = null, bloomPass = null, gtaoPass = null, smaaPass = null;
function buildComposer() {
  if (composer) { composer.dispose && composer.dispose(); composer = null; }
  bloomPass = null; gtaoPass = null; smaaPass = null;
  if (!Q.post) return;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: Q.post === 2 ? 0 : 4 });
  composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  if (Q.post === 2) {
    gtaoPass = new GTAOPass(scene, camera, innerWidth, innerHeight);
    gtaoPass.output = GTAOPass.OUTPUT.Default; gtaoPass.blendIntensity = 0.9;
    gtaoPass.updateGtaoMaterial({ radius: 3.2, distanceExponent: 1.4, thickness: 3, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtaoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtaoPass);
  }
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.5, 0.92);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  composer.addPass(makeGradePass());
  if (Q.post === 2) { smaaPass = new SMAAPass(size.x, size.y); composer.addPass(smaaPass); }
}
function renderFrame() { if (composer) composer.render(); else renderer.render(scene, camera); }
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
});
function applyQuality() {
  Q = QUALITY[qName];
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Q.pr));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = Q.shadows; sun.castShadow = Q.shadows;
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize);
  scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(mm => mm.needsUpdate = true); } });
  camera.far = Q.far; camera.updateProjectionMatrix();
  scene.fog.near = Q.fogNear; scene.fog.far = Q.fogFar;
  buildComposer();
  store.set('mh-quality2', qName);
}

// ---------- textures ----------
const facadeTex = makeFacadeAtlas();
const texDirt = dirtTex(), texAsphalt = asphaltTex(), texPaving = pavingTex(), texGrass = grassTex(), texSand = sandTex(), texRoof = roofTex();
const texBill = makeBillboardAtlas();
function waterNormalTex() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'); const img = x.createImageData(s, s); const hgt = new Float32Array(s * s);
  for (let k = 0; k < 10; k++) {
    const fx = (1 + Math.floor(Math.random() * 6)) * TAU / s, fz = (1 + Math.floor(Math.random() * 6)) * TAU / s, ph = Math.random() * TAU, a = 1 / (k + 1);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) hgt[j * s + i] += Math.sin(i * fx + j * fz * (k % 2 ? 1 : -1) + ph) * a;
  }
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const hx = hgt[j * s + (i + 1) % s] - hgt[j * s + (i + s - 1) % s], hz = hgt[((j + 1) % s) * s + i] - hgt[((j + s - 1) % s) * s + i], o = (j * s + i) * 4;
    img.data[o] = clamp(128 - hx * 60, 0, 255); img.data[o + 1] = clamp(128 - hz * 60, 0, 255); img.data[o + 2] = 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const texWaterN = waterNormalTex();

// ---------- materials ----------
const M = {};
const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
M.ground = std({ color: 0x9c9a88, map: texDirt });
M.road = std({ color: 0x8a8b8f, map: texAsphalt, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
M.walk = std({ color: 0xc9c4ba, map: texPaving, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
M.curb = std({ color: 0x9d9a93 });
M.mark = std({ color: 0xe8e4d6, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
M.markY = std({ color: 0xe0a91f, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
M.concrete = std({ color: 0xbdb7ab, side: THREE.DoubleSide });
M.green = std({ color: 0x86a860, map: texGrass, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
M.pitch = std({ color: 0x8cbf5c, map: texGrass, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 });
M.sand = std({ color: 0xe9d9ae, map: texSand, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
M.river = std({ color: 0x3c5b4a, roughness: 0.08, metalness: 0.1, normalMap: texWaterN, normalScale: new THREE.Vector2(0.25, 0.25), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
M.sea = std({ color: 0x1f5d7c, roughness: 0.06, metalness: 0.15, normalMap: texWaterN, normalScale: new THREE.Vector2(0.5, 0.5) });
M.pool = std({ color: 0x4fb7d6, roughness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
M.platform = std({ color: 0xbab3a4, map: texPaving });
M.ballast = std({ color: 0x7c7266, map: texDirt, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 });
M.rail = std({ color: 0x9a9a9a, metalness: 0.8, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
M.vcol = std({ vertexColors: true, roughness: 0.85 });
M.lamp = std({ color: 0x8a8578, metalness: 0.5, roughness: 0.5 });
M.lampHead = new THREE.MeshBasicMaterial({ color: 0x9a948a });
M.tank = std({ color: 0x1d1d1f, roughness: 0.6 });
M.trunk = std({ color: 0x5e4a36 });
M.leaf = std({ color: 0xffffff, roughness: 0.95 });
M.palmLeaf = std({ color: 0x6a9238, side: THREE.DoubleSide });
M.bill = std({ map: texBill, roughness: 0.6, emissive: 0xffffff, emissiveMap: texBill, emissiveIntensity: 0 });
// buildings: facade atlas sampled in the shader
M.bldg = std({ vertexColors: true, roughness: 0.9 });
M.bldg.onBeforeCompile = sh => {
  sh.uniforms.uNight = uNight; sh.uniforms.facade = { value: facadeTex }; sh.uniforms.roofMap = { value: texRoof };
  sh.vertexShader = 'attribute vec4 wd;\nvarying vec4 vWd;\nvarying vec3 vPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWd = wd; vPos = position;');
  sh.fragmentShader = `varying vec4 vWd; varying vec3 vPos; uniform float uNight; uniform sampler2D facade; uniform sampler2D roofMap;
float hh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
` + sh.fragmentShader
    .replace('#include <color_fragment>', `#include <color_fragment>
 vec3 wEmit = vec3(0.0); float glassM = 0.0;
 float sk = vWd.w;
 if (sk > -0.5) {
   float shop = step(15.5, sk); float style = sk - 16.0 * shop; float seed = floor(vWd.z * 255.0 + 0.5);
   vec2 tuv; float col, row; bool ground = shop > 0.5 && vWd.y < 1.0;
   if (ground) { tuv = vec2(vWd.x / 3.0, vWd.y); col = mod(floor(tuv.x) + seed, 4.0); row = 2.0; }
   else { tuv = vec2(vWd.x / 3.0, (vWd.y - shop) / 2.0); col = mod(style, 4.0); row = floor(style / 4.0 + 0.01); }
   vec2 f = fract(tuv) * 0.992 + 0.004;
   vec2 auv = vec2((col + f.x) / 4.0, (row + 1.0 - f.y) / 4.0);
   vec4 tx = textureGrad(facade, auv, dFdx(tuv) * 0.25, dFdy(tuv) * 0.25);
   bool baked = ground || (style > 11.5 && style < 14.5);
   diffuseColor.rgb = baked ? tx.rgb * mix(vec3(1.0), vColor.rgb, 0.15) : tx.rgb * vColor.rgb;
   glassM = tx.a;
   vec2 win = floor(tuv * vec2(3.0, 2.0));
   float lit = step(0.55, hh(win * 1.31 + seed * 7.7 + floor(tuv) * 3.1));
   wEmit = ground ? tx.rgb * tx.a * 0.9 : vec3(1.0, 0.76, 0.45) * tx.a * lit * (0.35 + 0.4 * hh(win + seed));
   diffuseColor.rgb *= 0.8 + 0.2 * smoothstep(0.0, 1.5, vWd.y);
 } else if (sk < -1.5) {
   diffuseColor.rgb *= texture2D(roofMap, vPos.xz * 0.08).rgb;
 }`)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.12, glassM);')
    .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, 0.35, glassM);')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += wEmit * uNight * 1.6;');
};

// ---------- sky ----------
const skyUniforms = { top: { value: new THREE.Color(0x4f8fd6) }, hor: { value: new THREE.Color(0xd6e6ee) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff2d0) }, night: uNight, time: uTime, cloudy: { value: 0 }, storm: { value: 0 } };
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w*0.99999; }`,
  fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; uniform float night, time, cloudy, storm; varying vec3 vD;
  float h1(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
  float hn(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hn(i), hn(i+vec2(1,0)), f.x), mix(hn(i+vec2(0,1)), hn(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a*n2(p); p *= 2.03; a *= 0.5; } return v; }
  void main(){ vec3 d = normalize(vD); float y = clamp(d.y,0.0,1.0); vec3 c = mix(hor, top, pow(y,0.5));
   if (d.y < 0.0) c = mix(hor, hor*0.6, clamp(-d.y*4.0,0.0,1.0));
   float s = max(dot(d, sunDir),0.0); c += sunCol*(pow(s,900.0)*4.0 + pow(s,12.0)*0.3 + pow(s,3.0)*0.08);
   if (d.y > 0.0) { vec2 uv = d.xz / (d.y + 0.12) * 1.4 + vec2(time*0.004, time*0.002);
     float cl = smoothstep(0.52 - cloudy * 0.42, 0.85 - cloudy * 0.3, fbm(uv)); cl *= smoothstep(0.0, 0.25, d.y);
     vec3 cc = mix(vec3(1.0,0.98,0.95), sunCol, 0.35) * (1.0 - night*0.85) * (1.0 - storm * 0.6) + hor*0.25; c = mix(c, cc, cl*(0.75 + cloudy * 0.2)); }
   vec3 g = floor(d*420.0); float st = step(0.9965, h1(g))*night*smoothstep(0.05,0.4,y); c += vec3(st);
   gl_FragColor = vec4(c,1.0); }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skyMat);
sky.scale.setScalar(1000); sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat); envScene.add(envSky);
const envGround = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0x8c8070 })); envGround.rotation.x = -Math.PI / 2; envGround.position.y = -1.5; envScene.add(envGround);
let envRT = null, envHour = -99;
function refreshEnv(hour) {
  if ((Math.abs(hour - envHour) < 0.5 || window.__norender) && envRT) return;
  envHour = hour;
  envGround.material.color.copy(scene.fog.color).multiplyScalar(0.55);
  const rt = pmrem.fromScene(envScene, 0, 0.1, 50);
  if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture;
}

const TOD = [
  [0, 0x050b1e, 0x16213a, 0x6a7dbb, 0.06, 0.25, 0x141d30, 0.15],
  [5, 0x0d1736, 0x2a3354, 0x7a88c0, 0.1, 0.28, 0x252c45, 0.2],
  [6.2, 0x45679c, 0xf0a666, 0xffb070, 1.0, 0.3, 0xd6a27a, 0.6],
  [8, 0x4d8bd3, 0xcfe0ea, 0xfff0d8, 2.4, 0.38, 0xcfd8d6, 1.0],
  [12, 0x3f86da, 0xd8e8f0, 0xfff8ea, 2.9, 0.4, 0xd8dcd6, 1.0],
  [16.5, 0x4a86cf, 0xe6dccb, 0xffe3b8, 2.5, 0.38, 0xddd2bb, 1.0],
  [18.1, 0x3d4d8d, 0xf0884a, 0xff9850, 1.2, 0.3, 0xc98a62, 0.7],
  [19.3, 0x141d44, 0x3b3358, 0x8a7ab0, 0.15, 0.27, 0x2e2a42, 0.3],
  [24, 0x050b1e, 0x16213a, 0x6a7dbb, 0.06, 0.25, 0x141d30, 0.15],
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), WHITE = new THREE.Color(0xffffff), _sd = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);
function lerpHex(a, b, t, out) { _c1.setHex(a); _c2.setHex(b); return out.copy(_c1).lerp(_c2, t); }
function applyTimeOfDay(hour, focusX, focusZ) {
  let i = 0; while (i < TOD.length - 2 && TOD[i + 1][0] <= hour) i++;
  const a = TOD[i], b = TOD[i + 1]; const t = clamp((hour - a[0]) / (b[0] - a[0]), 0, 1);
  lerpHex(a[1], b[1], t, skyUniforms.top.value); lerpHex(a[2], b[2], t, skyUniforms.hor.value);
  lerpHex(a[3], b[3], t, sun.color); sun.intensity = lerp(a[4], b[4], t); hemi.intensity = lerp(a[5], b[5], t);
  lerpHex(a[6], b[6], t, scene.fog.color);
  scene.environmentIntensity = lerp(a[7], b[7], t);
  hemi.color.copy(skyUniforms.top.value).lerp(WHITE, 0.55); hemi.groundColor.copy(scene.fog.color).multiplyScalar(0.6);
  const ang = (hour - 6) / 12 * Math.PI;
  let el = Math.sin(ang), az = Math.cos(ang);
  const isNight = el < 0.02;
  if (isNight) { el = 0.55; az = -Math.cos(ang); }
  const dir = _sd.set(az * 0.85, Math.max(0.16, el), 0.4).normalize();
  skyUniforms.sunDir.value.copy(isNight ? DOWN : dir);
  skyUniforms.sunCol.value.copy(sun.color);
  const step = 220 / Q.shadowSize * 2; const fx = Math.round(focusX / step) * step, fz = Math.round(focusZ / step) * step;
  sun.position.set(fx + dir.x * 300, dir.y * 300, fz + dir.z * 300); sun.target.position.set(fx, 0, fz);
  const night = clamp((Math.abs(hour - 12) - 5.6) / 1.4, 0, 1);
  uNight.value = night;
  M.lampHead.color.setHex(night > 0.4 ? 0xffe2b0 : 0x9a948a);
  if (typeof lightPoolMat !== 'undefined') { lightPoolMat.opacity = night * 0.6; lampGlowMat.opacity = night * 0.85; lightPoolMat.visible = lampGlowMat.visible = night > 0.02; }
  M.bill.emissiveIntensity = night * 0.6;
  if (bloomPass) bloomPass.strength = 0.22 + night * 0.45;
  refreshEnv(hour);
  return night;
}

// ---------------- helpers for geometry ----------------
function toPts(p) { const o = []; for (let i = 0; i < p.length; i += 2) { const x = p[i] / 10, z = p[i + 1] / 10; const l = o[o.length - 1]; if (!l || Math.abs(l[0] - x) > 0.01 || Math.abs(l[1] - z) > 0.01) o.push([x, z]); } if (o.length > 2) { const f = o[0], l = o[o.length - 1]; if (Math.abs(f[0] - l[0]) < 0.01 && Math.abs(f[1] - l[1]) < 0.01) o.pop(); } return o; }
function signedArea(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function centroid(pts) { let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return [x / pts.length, z / pts.length]; }
function pointInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], zi = pts[i][1], xj = pts[j][0], zj = pts[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}
// inward offset of a ring by d metres
function insetPoly(pts, d, A) {
  const n = pts.length, out = [];
  const inN = (dx, dz) => { const l = Math.hypot(dx, dz) || 1; return A > 0 ? [-dz / l, dx / l] : [dz / l, -dx / l]; };
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const n1 = inN(p1[0] - p0[0], p1[1] - p0[1]), n2 = inN(p2[0] - p1[0], p2[1] - p1[1]);
    let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const cosv = Math.max(0.4, mx * n1[0] + mz * n1[1]);
    out.push([p1[0] + mx * d / cosv, p1[1] + mz * d / cosv]);
  }
  return out;
}
class GeoBuf {
  constructor(withColor = false, withWd = false, withUv = false) { this.p = []; this.n = []; this.c = withColor ? [] : null; this.w = withWd ? [] : null; this.u = withUv ? [] : null; }
  tri(a, b, c, nx, ny, nz, col, w0, w1, w2, uv) {
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    if (this.c) this.c.push(col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b);
    if (this.w) this.w.push(...w0, ...w1, ...w2);
    if (this.u) { if (Array.isArray(uv)) this.u.push(...uv); else { uv = uv || 0; this.u.push(a[0] * uv, a[2] * uv, b[0] * uv, b[2] * uv, c[0] * uv, c[2] * uv); } }
  }
  get empty() { return this.p.length === 0; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.w) g.setAttribute('wd', new THREE.Float32BufferAttribute(this.w, 4));
    if (this.u) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
const chunked = (size) => { const m = new Map(); return { get(x, z, make) { const k = Math.floor(x / size) + ',' + Math.floor(z / size); let v = m.get(k); if (!v) { v = make(); m.set(k, v); } return v; }, each(f) { m.forEach(f); } }; };
const cullables = [];
function addCullable(obj, maxD) {
  const bs = obj.geometry ? obj.geometry.boundingSphere : null;
  if (bs) cullables.push({ obj, x: bs.center.x, z: bs.center.z, r: bs.radius, maxD });
  scene.add(obj);
}

// ---------------- spatial lookups ----------------
const BC = 16, bWallGrid = new Map(), bPolyGrid = new Map();
let walls = new Float32Array(7 * 262144), nWalls = 0; // flat [ax,az,bx,bz,h,nx,nz] per wall, n = outward normal
let wallLayer = new Uint8Array(262144);                  // Layers.* per wall (Obstacle for buildings, Curb for platform edges)
const bPolys = [];
const gkey = (ix, iz) => (ix + 1000) * 4096 + (iz + 1000);
function gridAdd(grid, cell, x0, z0, x1, z1, val) {
  const ix0 = Math.floor(Math.min(x0, x1) / cell), ix1 = Math.floor(Math.max(x0, x1) / cell);
  const iz0 = Math.floor(Math.min(z0, z1) / cell), iz1 = Math.floor(Math.max(z0, z1) / cell);
  for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
    const k = gkey(ix, iz); let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(val);
  }
}
function addWallRing(pts, h, layer = Layers.Obstacle, skip = null) {
  const A = signedArea(pts);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length]; const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz); if (l < 0.01) continue;
    if (skip && skip(p, q)) continue;
    if (nWalls + 1 > wallLayer.length) { const g = new Uint8Array(wallLayer.length * 2); g.set(wallLayer); wallLayer = g; } wallLayer[nWalls] = layer;
    const nx = A > 0 ? dz / l : -dz / l, nz = A > 0 ? -dx / l : dx / l;
    if ((nWalls + 1) * 7 > walls.length) { const g = new Float32Array(walls.length * 2); g.set(walls); walls = g; } const wi = nWalls++, o = wi * 7; walls[o] = p[0]; walls[o + 1] = p[1]; walls[o + 2] = q[0]; walls[o + 3] = q[1]; walls[o + 4] = h; walls[o + 5] = nx; walls[o + 6] = nz; gridAdd(bWallGrid, BC, p[0], p[1], q[0], q[1], wi);
  }
}
function insideBuilding(x, z) {
  const a = bPolyGrid.get(gkey(Math.floor(x / BC), Math.floor(z / BC))); if (!a) return -1;
  for (const i of a) { const b = bPolys[i]; if (x >= b.minx && x <= b.maxx && z >= b.minz && z <= b.maxz && pointInPoly(x, z, b.pts)) return i; }
  return -1;
}
const _seen = new Set();
const colRes = { x: 0, z: 0, nx: 0, nz: 0, hit: false, depth: 0 };
// one-sided walls: they only push from outside, so nothing can get trapped inside a footprint
// stepH: walls on the Curb layer no higher than y + stepH are stepped over (people climb onto platforms)
function collideCircle(x, z, r, y = 0, stepH = 0) {
  colRes.hit = false; colRes.nx = 0; colRes.nz = 0; colRes.depth = 0;
  for (let it = 0; it < 2; it++) {
    const ix0 = Math.floor((x - r) / BC), ix1 = Math.floor((x + r) / BC), iz0 = Math.floor((z - r) / BC), iz1 = Math.floor((z + r) / BC);
    _seen.clear(); let any = false;
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
      const a = bWallGrid.get(gkey(ix, iz)); if (!a) continue;
      for (const wi of a) {
        if (_seen.has(wi)) continue; _seen.add(wi);
        const wo = wi * 7; if (y > walls[wo + 4] + 0.3) continue;
        if (stepH > 0 && wallLayer[wi] === Layers.Curb && walls[wo + 4] - y <= stepH) continue;
        const ax = walls[wo + 0], az = walls[wo + 1], dx = walls[wo + 2] - ax, dz = walls[wo + 3] - az;
        if ((x - ax) * walls[wo + 5] + (z - az) * walls[wo + 6] < 0) continue;
        const L2 = dx * dx + dz * dz; let t = L2 > 0 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = ax + dx * t, cz = az + dz * t; let ex = x - cx, ez = z - cz; const d2 = ex * ex + ez * ez;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 0.0001; const push = r - d; ex /= d; ez /= d;
          x += ex * push; z += ez * push; colRes.nx += ex * push; colRes.nz += ez * push; colRes.hit = true; any = true; colRes.depth = Math.max(colRes.depth, push);
        }
      }
    }
    if (!any) break;
  }
  colRes.x = x; colRes.z = z;
  const nl = Math.hypot(colRes.nx, colRes.nz); if (nl > 0) { colRes.nx /= nl; colRes.nz /= nl; }
  return colRes;
}
function rayWalls(ax, az, bx, bz, y, y1 = y) {
  let best = 1;
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), steps = Math.ceil(len / BC) + 1;
  _seen.clear();
  for (let s = 0; s <= steps; s++) {
    const px = ax + dx * s / steps, pz = az + dz * s / steps;
    const a = bWallGrid.get(gkey(Math.floor(px / BC), Math.floor(pz / BC))); if (!a) continue;
    for (const wi of a) {
      if (_seen.has(wi)) continue; _seen.add(wi);
      const wo = wi * 7; if (Math.min(y, y1) > walls[wo + 4]) continue;
      const ex = walls[wo + 2] - walls[wo + 0], ez = walls[wo + 3] - walls[wo + 1];
      const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
      const t = ((walls[wo + 0] - ax) * ez - (walls[wo + 1] - az) * ex) / den, u = ((walls[wo + 0] - ax) * dz - (walls[wo + 1] - az) * dx) / den;
      if (t >= 0 && t <= best && u >= 0 && u <= 1 && y + (y1 - y) * t < walls[wo + 4]) best = t;
    }
  }
  return best;
}
const RC = 20, roadGrid = new Map();
const rsegs = [];
const roadRes = { d: 1e9, seg: null, t: 0, y: 0, px: 0, pz: 0, lat: 0 };
function roadQuery(x, z, maxD = 30, curY = null) {
  roadRes.d = 1e9; roadRes.seg = null;
  const r = Math.ceil(maxD / RC);
  const cx = Math.floor(x / RC), cz = Math.floor(z / RC);
  for (let ix = cx - r; ix <= cx + r; ix++) for (let iz = cz - r; iz <= cz + r; iz++) {
    const a = roadGrid.get(gkey(ix, iz)); if (!a) continue;
    for (const s of a) {
      const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz;
      let t = L2 > 0 ? ((x - s.ax) * dx + (z - s.az) * dz) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = s.ax + dx * t, pz = s.az + dz * t; const d = Math.hypot(x - px, z - pz) - s.hw;
      const hy = s.ha + (s.hb - s.ha) * t;
      if (curY !== null && Math.abs(hy - curY) > 2.5) continue;
      if (d < roadRes.d) { roadRes.d = d; roadRes.seg = s; roadRes.t = t; roadRes.y = hy; roadRes.px = px; roadRes.pz = pz; roadRes.lat = d + s.hw; }
    }
  }
  return roadRes;
}
const surfRes = { y: 0, elev: null, lat: 0, px: 0, pz: 0, ex: -99 };
const _sc = []; let _scN = 0;
// Height of the drivable surface under (x,z) near height curY, plus how far we are past the edge of the deck.
// ex = distance past the deck edge (negative = inside). It is the minimum over every elevated segment at
// this height, so where two flyover segments join or fork you are "inside" if you are on either of them.
function surfaceAt(x, z, curY) {
  surfRes.y = 0; surfRes.elev = null; surfRes.ex = -99; _scN = 0;
  const cx = Math.floor(x / RC), cz = Math.floor(z / RC);
  let best = null, bestErr = 1e9;
  for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) {
    const a = roadGrid.get(gkey(ix, iz)); if (!a) continue;
    for (const s of a) {
      if (!s.elev) continue;
      const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz;
      let t = L2 > 0 ? ((x - s.ax) * dx + (z - s.az) * dz) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = s.ax + dx * t, pz = s.az + dz * t; const lat = Math.hypot(x - px, z - pz);
      if (lat > s.hw + 2.5) continue;
      const hy = s.ha + (s.hb - s.ha) * t;
      if (hy < 0.25 || hy > curY + 1.0 || hy < curY - 2.5) continue;
      let c = _sc[_scN]; if (!c) c = _sc[_scN] = {}; _scN++;
      c.hy = hy; c.ex = lat - s.hw; c.px = px; c.pz = pz; c.s = s; c.lat = lat;
      if (lat > s.hw + 0.4) continue;
      const err = Math.abs(hy - curY);
      if (err < bestErr) { bestErr = err; best = hy; surfRes.elev = s; surfRes.lat = lat; surfRes.px = px; surfRes.pz = pz; }
    }
  }
  surfRes.y = best === null ? 0 : best;
  if (best !== null) {
    for (let i = 0; i < _scN; i++) { const c = _sc[i]; if (Math.abs(c.hy - best) > 0.9) continue; if (surfRes.ex === -99 || c.ex < surfRes.ex) { surfRes.ex = c.ex; surfRes.px = c.px; surfRes.pz = c.pz; surfRes.lat = c.lat; } }
  }
  return surfRes;
}
// raised walkable surfaces (station platforms): height lookup for people on foot
const walkPolys = [], walkGrid = new Map();
function addWalkSurface(pts, h) { let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (const p of pts) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); } const i = walkPolys.length; walkPolys.push({ pts, h, minx, maxx, minz, maxz }); gridAdd(walkGrid, 40, minx, minz, maxx, maxz, i); }
function walkSurfaceAt(x, z) { const a = walkGrid.get(gkey(Math.floor(x / 40), Math.floor(z / 40))); if (!a) return 0; for (const i of a) { const w = walkPolys[i]; if (x >= w.minx && x <= w.maxx && z >= w.minz && z <= w.maxz && pointInPoly(x, z, w.pts)) return w.h; } return 0; }
const WC = 60, waterGrid = new Map(); const waterPolys = [];
function inWater(x, z) {
  const a = waterGrid.get(gkey(Math.floor(x / WC), Math.floor(z / WC))); if (!a) return false;
  for (const i of a) {
    const w = waterPolys[i]; if (x < w.minx || x > w.maxx || z < w.minz || z > w.maxz) continue;
    if (pointInPoly(x, z, w.pts)) { if (w.holes && w.holes.some(h => pointInPoly(x, z, h))) continue; return true; }
  }
  return false;
}
