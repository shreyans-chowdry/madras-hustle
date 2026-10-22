// ===================== WEATHER + CINEMATIC GRADE =====================
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// final full-screen grade: contrast/saturation, vignette, speed blur + chromatic aberration, grain, damage pulse
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uSpeed: { value: 0 }, uHurt: { value: 0 }, uSat: { value: 1.12 }, uContrast: { value: 1.06 }, uVignette: { value: 0.38 }, uWet: { value: 0 }, uFlash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uSpeed, uHurt, uSat, uContrast, uVignette, uWet, uFlash; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.0) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r = length(c);
      vec3 col;
      if (uSpeed > 0.01) {                       // radial zoom blur that grows toward the edges
        vec3 acc = vec3(0.0); float k = uSpeed * 0.045 * smoothstep(0.1, 0.7, r);
        for (int i = 0; i < 8; i++) { float t = float(i) / 7.0; vec2 uv = vUv - c * k * t;
          acc += vec3(texture2D(tDiffuse, uv + c * k * 0.25).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * k * 0.25).b); }
        col = acc / 8.0;
      } else col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSat - uWet * 0.25);
      col = (col - 0.5) * uContrast + 0.5;
      col *= mix(vec3(1.0), vec3(0.86, 0.93, 1.05), uWet);                  // cool, wet tint in rain
      col *= 1.0 - uVignette * smoothstep(0.35, 0.85, r);
      col += vec3(0.75, 0.0, 0.0) * uHurt * smoothstep(0.25, 0.8, r);
      col += vec3(0.85, 0.9, 1.0) * uFlash;                                 // lightning
      col += (h(vUv * 800.0) - 0.5) * 0.035;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};
let gradePass = null;
function makeGradePass() { gradePass = new ShaderPass(GradeShader); return gradePass; }

const Weather = {
  kinds: ['clear', 'cloudy', 'rain', 'fog', 'storm'],
  current: 'clear', target: 'clear', mix: { rain: 0, fog: 0, cloud: 0, storm: 0 }, flash: 0, nextBolt: 6, autoT: 300,
  rain: null,
  init() {
    // 4000 streaks in a box that follows the camera
    const N = 4000, pos = new Float32Array(N * 6), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * 80, y = Math.random() * 40, z = (Math.random() - 0.5) * 80; pos.set([x, y, z, x, y - 1.6, z], i * 6); seed[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMat = new THREE.LineBasicMaterial({ color: 0xbfd2e6, transparent: true, opacity: 0, depthWrite: false });
    this.rain = new THREE.LineSegments(g, this.rainMat); this.rain.frustumCulled = false; this.rain.renderOrder = 6; scene.add(this.rain);
    this.boltLight = new THREE.DirectionalLight(0xdfe8ff, 0); this.boltLight.position.set(0, 400, 0); scene.add(this.boltLight);
  },
  set(kind) { if (!this.kinds.includes(kind)) return false; this.target = kind; this.current = kind; this.autoT = 400; EventBus.emit('weather:change', { kind }); return true; },
  update(dt, cam) {
    if (!this.rain) this.init();
    // slow automatic cycle in live-time mode
    if (typeof timeMode !== 'undefined' && timeMode === 'live') { this.autoT -= dt; if (this.autoT < 0) { this.autoT = 240 + Math.random() * 300; this.set(pick(['clear', 'clear', 'cloudy', 'rain', 'fog', 'storm'])); } }
    const T = this.target, k = Math.min(1, dt * 0.35);
    const want = { rain: T === 'rain' || T === 'storm' ? 1 : 0, fog: T === 'fog' ? 1 : T === 'rain' ? 0.35 : T === 'storm' ? 0.5 : 0, cloud: T === 'clear' ? 0 : 1, storm: T === 'storm' ? 1 : 0 };
    for (const key in want) this.mix[key] += (want[key] - this.mix[key]) * k;
    const m = this.mix;
    // rain streaks fall and wrap around the camera
    this.rainMat.opacity = m.rain * 0.7; this.rain.visible = m.rain > 0.02 && !(player && player.interior);
    if (this.rain.visible) {
      const p = this.rain.geometry.attributes.position.array, fall = (28 + m.storm * 14) * dt, wind = m.storm * 6 * dt;
      for (let i = 0; i < p.length; i += 6) { p[i + 1] -= fall; p[i + 4] -= fall; p[i] += wind; p[i + 3] += wind; if (p[i + 4] < -2) { p[i + 1] += 40; p[i + 4] += 40; } if (p[i] > 40) { p[i] -= 80; p[i + 3] -= 80; } }
      this.rain.geometry.attributes.position.needsUpdate = true; this.rain.position.set(cam.position.x, cam.position.y - 18, cam.position.z);
      if (Sound.amb && Sound.ctx) Sound.amb.gain.setTargetAtTime(0.04 + m.rain * 0.12, Sound.ctx.currentTime, 0.5);
    }
    // lightning
    this.flash = Math.max(0, this.flash - dt * 3.5);
    if (m.storm > 0.6 && !(player && player.interior)) { this.nextBolt -= dt; if (this.nextBolt < 0) { this.nextBolt = 4 + Math.random() * 9; this.flash = 1; setTimeout(() => { if (Sound.ctx) { Sound.boom(); } }, 400 + Math.random() * 1600); } }
    this.boltLight.intensity = this.flash * 6;
    return m;
  },
  // applied after time-of-day so it darkens/greys the scene on top
  applyAtmosphere() {
    const m = this.mix; if (!this.rain) return;
    const grey = m.cloud * 0.5 + m.storm * 0.35;
    skyUniforms.cloudy.value = m.cloud; skyUniforms.storm.value = m.storm;
    sun.intensity *= 1 - grey * 0.8; scene.environmentIntensity *= 1 - grey * 0.4;
    skyUniforms.top.value.lerp(_wcol.setHex(0x6c7480), grey); skyUniforms.hor.value.lerp(_wcol.setHex(0xa8aeb4), grey);
    scene.fog.color.lerp(_wcol.setHex(0x9aa3ab), Math.max(grey, m.fog) * 0.8);
    const baseFar = player.veh && player.veh.y > 80 ? Q.fogFar * 1.8 : Q.fogFar;
    scene.fog.near = Q.fogNear * (1 - m.fog * 0.82); scene.fog.far = Math.max(160, baseFar * (1 - m.fog * 0.72));
    // wet roads: glossier asphalt with stronger reflections
    M.road.roughness = 0.85 - m.rain * 0.6; M.road.metalness = m.rain * 0.25; M.walk.roughness = 0.9 - m.rain * 0.5;
    if (gradePass) { gradePass.uniforms.uWet.value = m.rain; gradePass.uniforms.uFlash.value = this.flash * 0.35; }
  },
};
const _wcol = new THREE.Color();
