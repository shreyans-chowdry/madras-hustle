// ===================== CORE: math, storage, input (keyboard, mouse, PS4/PS5 pad), audio =====================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const wrapAngle = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const headingTo = (dx, dz) => Math.atan2(dx, dz);   // forward = (sin h, cos h)
function hash2(a, b = 0) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};
let WD = null, BX0 = 0, BZ0 = 0, BX1 = 0, BZ1 = 0;

// ---------------- input ----------------
const keys = new Set();
const pressed = new Set();
const mouse = { dx: 0, dy: 0, down: false, right: false, clicked: false, lastMove: 0, wheel: 0 };
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
let inputEnabled = false;
const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
addEventListener('keydown', e => {
  if (!inputEnabled || typing(e)) return;
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouse.down = mouse.right = false; });
const canvas = $('game');
let pointerLocked = false;
document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === canvas; });
function lockPointer() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (err) { } }
canvas.addEventListener('mousedown', e => {
  if (!inputEnabled) return;
  if (e.button === 0) { if (!pointerLocked) lockPointer(); else mouse.clicked = true; mouse.down = true; }
  if (e.button === 2) mouse.right = true;
  mouse.lx = e.clientX; mouse.ly = e.clientY;
});
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; if (e.button === 2) mouse.right = false; });
addEventListener('mousemove', e => {
  if (!inputEnabled) return;
  if (pointerLocked) { mouse.dx += e.movementX; mouse.dy += e.movementY; mouse.lastMove = performance.now(); }
});
canvas.addEventListener('wheel', e => { if (inputEnabled) { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
const down = c => keys.has(c);
const hit = c => pressed.has(c);

// Gamepad (PS4 / PS5 / Xbox, standard mapping)
const GP = { connected: false, id: '', b: new Array(18).fill(0), prev: new Array(18).fill(0), ax: [0, 0, 0, 0], lastUse: 0 };
const BTN = { X: 0, O: 1, SQ: 2, TRI: 3, L1: 4, R1: 5, L2: 6, R2: 7, SHARE: 8, OPTIONS: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, PS: 16, PAD: 17 };
addEventListener('gamepadconnected', e => { GP.connected = true; GP.id = e.gamepad.id; if (typeof toast === 'function') toast('Controller connected'); });
addEventListener('gamepaddisconnected', () => { GP.connected = false; if (typeof toast === 'function') toast('Controller disconnected'); });
const dz = v => Math.abs(v) < 0.14 ? 0 : (v - Math.sign(v) * 0.14) / 0.86;
function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let p = null; for (const g of pads) if (g && g.connected) { p = g; break; }
  GP.prev = GP.b.slice();
  if (!p) { GP.connected = false; GP.b.fill(0); GP.ax = [0, 0, 0, 0]; return; }
  GP.connected = true;
  for (let i = 0; i < 18; i++) { const bt = p.buttons[i]; GP.b[i] = bt ? (typeof bt === 'object' ? bt.value : bt) : 0; }
  GP.ax = [dz(p.axes[0] || 0), dz(p.axes[1] || 0), dz(p.axes[2] || 0), dz(p.axes[3] || 0)];
  if (GP.b.some(v => v > 0.3) || GP.ax.some(v => v !== 0)) GP.lastUse = performance.now();
}
const gpDown = i => GP.b[i] > 0.4;
const gpHit = i => GP.b[i] > 0.4 && GP.prev[i] <= 0.4;
function rumble(strong = 0.5, weak = 0.5, ms = 120) {
  try { const p = [...navigator.getGamepads()].find(g => g && g.connected); if (p && p.vibrationActuator) p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (e) { }
}
// unified actions
const In = {
  mx: 0, my: 0, lx: 0, ly: 0, throttle: 0, brake: 0,
  update(inVeh) {
    pollGamepad();
    const kx = (down('KeyD') || down('ArrowRight') ? 1 : 0) - (down('KeyA') || down('ArrowLeft') ? 1 : 0);
    const ky = (down('KeyW') || down('ArrowUp') ? 1 : 0) - (down('KeyS') || down('ArrowDown') ? 1 : 0);
    this.mx = clamp(kx + GP.ax[0], -1, 1); this.my = clamp(ky - GP.ax[1], -1, 1);
    this.lx = GP.ax[2]; this.ly = GP.ax[3];
    this.throttle = Math.max(down('KeyW') || down('ArrowUp') ? 1 : 0, GP.b[BTN.R2]);
    this.brake = Math.max(down('KeyS') || down('ArrowDown') ? 1 : 0, GP.b[BTN.L2]);
  },
  held(a) {
    switch (a) {
      case 'sprint': return down('ShiftLeft') || down('ShiftRight') || gpDown(BTN.X);
      case 'handbrake': return down('Space') || gpDown(BTN.R1) || gpDown(BTN.X);
      case 'aim': return mouse.right || gpDown(BTN.L2);
      case 'fire': return (mouse.down && pointerLocked) || down('ControlLeft') || gpDown(BTN.R2);
      case 'horn': return down('KeyH') || gpDown(BTN.L3);
      case 'up': return down('Space') || GP.b[BTN.R2] > 0.3;
      case 'down': return down('ShiftLeft') || down('ShiftRight') || GP.b[BTN.L2] > 0.3;
      case 'yawL': return down('KeyQ') || gpDown(BTN.L1);
      case 'yawR': return down('KeyE') || gpDown(BTN.R1);
      case 'lookBack': return down('KeyV') || gpDown(BTN.R3);
      case 'interact': return down('KeyE') || gpDown(BTN.RIGHT);
    }
    return false;
  },
  act(a) {
    switch (a) {
      case 'enter': return hit('KeyF') || gpHit(BTN.TRI);
      case 'interact': return hit('KeyE') || gpHit(BTN.RIGHT);
      case 'jump': return hit('Space') || gpHit(BTN.SQ);
      case 'reload': return hit('KeyR') || gpHit(BTN.O);
      case 'punch': return (mouse.clicked && pointerLocked) || hit('KeyK') || gpHit(BTN.R2);
      case 'nextWeapon': return hit('Tab') || mouse.wheel > 0 || gpHit(BTN.R1);
      case 'prevWeapon': return hit('KeyX') || mouse.wheel < 0 || gpHit(BTN.L1);
      case 'camera': return hit('KeyC') || gpHit(BTN.LEFT);
      case 'map': return hit('KeyM') || gpHit(BTN.PAD);
      case 'pause': return hit('KeyP') || gpHit(BTN.OPTIONS);
      case 'daylight': return hit('KeyL') || gpHit(BTN.UP);
      case 'rides': return hit('KeyT') || gpHit(BTN.DOWN);
      case 'flip': return hit('KeyR') || gpHit(BTN.O);
      case 'phone': return hit('KeyI') || gpHit(BTN.SHARE);
      case 'gear': return hit('KeyG') || gpHit(BTN.L3);
    }
    return false;
  },
  endFrame() { pressed.clear(); mouse.dx = mouse.dy = 0; mouse.clicked = false; mouse.wheel = 0; },
};

// ---------------- audio (synthesized) ----------------
const Sound = {
  ctx: null, master: null, on: true,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.55; this.master.connect(c.destination);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;
    const eg = c.createGain(); eg.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; const o2 = c.createOscillator(); o2.type = 'square';
    const g2 = c.createGain(); g2.gain.value = 0.35;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(eg); eg.connect(this.master); o1.start(); o2.start();
    this.engine = { g: eg, o1, o2, lp };
    // rotor / prop: noise chopped by an LFO
    const rn = c.createBufferSource(); rn.buffer = nb; rn.loop = true; const rf = c.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 300;
    const rg = c.createGain(); rg.gain.value = 0; const chop = c.createGain(); chop.gain.value = 0.5; const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 18;
    const lfoG = c.createGain(); lfoG.gain.value = 0.5; lfo.connect(lfoG); lfoG.connect(chop.gain);
    rn.connect(rf); rf.connect(chop); chop.connect(rg); rg.connect(this.master); rn.start(); lfo.start();
    this.rotor = { g: rg, lfo, f: rf };
    // jet roar
    const jn = c.createBufferSource(); jn.buffer = nb; jn.loop = true; const jf = c.createBiquadFilter(); jf.type = 'bandpass'; jf.frequency.value = 900; jf.Q.value = 0.4;
    const jg = c.createGain(); jg.gain.value = 0; jn.connect(jf); jf.connect(jg); jg.connect(this.master); jn.start(); this.jet = { g: jg, f: jf };
    const hg = c.createGain(); hg.gain.value = 0; const hf = c.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 900; hf.Q.value = 0.8;
    const h1 = c.createOscillator(); h1.type = 'square'; h1.frequency.value = 415; const h2 = c.createOscillator(); h2.type = 'square'; h2.frequency.value = 523;
    h1.connect(hf); h2.connect(hf); hf.connect(hg); hg.connect(this.master); h1.start(); h2.start();
    this.horn = { g: hg, h1, h2 };
    const sg = c.createGain(); sg.gain.value = 0; const so = c.createOscillator(); so.type = 'triangle'; so.frequency.value = 700;
    const sl = c.createOscillator(); sl.frequency.value = 0.55; const lg = c.createGain(); lg.gain.value = 260;
    sl.connect(lg); lg.connect(so.frequency); so.connect(sg); sg.connect(this.master); so.start(); sl.start();
    this.siren = { g: sg };
    const ag = c.createGain(); ag.gain.value = 0.05; const af = c.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 420;
    const an = c.createBufferSource(); an.buffer = nb; an.loop = true; an.connect(af); af.connect(ag); ag.connect(this.master); an.start();
    this.amb = ag; this.nextHonk = 2;
  },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.55 : 0; },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  update(dt, st) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, e = this.engine;
    const car = st.kind === 'car' || st.kind === 'boat';
    if (car) {
      const rpm = 0.25 + st.speedRatio * 0.9 + st.throttle * 0.15, base = st.small ? 95 : st.big ? 38 : 55;
      e.o1.frequency.setTargetAtTime(base * (1 + rpm * 2.2), t, 0.08); e.o2.frequency.setTargetAtTime(base * 0.5 * (1 + rpm * 2.2), t, 0.08);
      e.lp.frequency.setTargetAtTime(350 + rpm * 1200 + st.throttle * 500, t, 0.1); e.g.gain.setTargetAtTime(0.1 + st.throttle * 0.07, t, 0.1);
    } else e.g.gain.setTargetAtTime(0, t, 0.15);
    this.rotor.g.gain.setTargetAtTime(st.kind === 'heli' ? 0.35 : st.rotorNear * 0.25, t, 0.2);
    this.rotor.lfo.frequency.setTargetAtTime(14 + st.throttle * 8, t, 0.3);
    this.jet.g.gain.setTargetAtTime(st.kind === 'plane' ? 0.08 + st.throttle * 0.12 : st.jetNear * 0.25, t, 0.3);
    this.jet.f.frequency.setTargetAtTime(500 + st.throttle * 1500, t, 0.3);
    this.horn.g.gain.setTargetAtTime(st.horn ? 0.18 : 0, t, 0.02);
    this.siren.g.gain.setTargetAtTime(st.siren * 0.11, t, 0.2);
    this.amb.gain.setTargetAtTime(st.inside ? 0.01 : 0.04, t, 0.5);
    this.nextHonk -= dt;
    if (this.nextHonk < 0 && !st.inside) { this.nextHonk = 1.5 + Math.random() * 4; this.distantHonk(); }
  },
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slide = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  burst(vol, freq, dur, q = 0.7, type = 'lowpass') {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  gun(kind, dist = 0) {
    const fall = clamp(1 - dist / 140, 0.05, 1);
    const p = { pistol: [0.5, 2200, 0.18], smg: [0.35, 2600, 0.1], shotgun: [0.7, 1200, 0.35], rifle: [0.55, 2000, 0.2], rpg: [0.5, 600, 0.6], sniper: [0.8, 1800, 0.45], minigun: [0.3, 2600, 0.08] }[kind] || [0.4, 2000, 0.15];
    this.burst(p[0] * fall, p[1], p[2]); this.tone(120, p[2] * 0.6, 'sine', 0.2 * fall, 0, -60);
  },
  click() { this.tone(1800, 0.03, 'square', 0.05); },
  distantHonk() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, f = 380 + Math.random() * 420, n = 1 + Math.floor(Math.random() * 3);
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f;
      const g = c.createGain(); const st = t + i * 0.22; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.018, st + 0.02); g.gain.linearRampToValueAtTime(0, st + 0.16);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; o.connect(bp); bp.connect(g);
      if (p) g.connect(p); else g.connect(this.master); o.start(st); o.stop(st + 0.2);
    }
    if (p) { p.pan.value = Math.random() * 2 - 1; p.connect(this.master); }
  },
  crash(v = 1) { this.burst(clamp(0.12 * v, 0.03, 0.5), 900 + v * 1500, 0.35 + v * 0.1); this.tone(70, 0.25, 'sine', clamp(0.2 * v, 0.05, 0.4), 0, -30); },
  boom() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(120, t + 1.4);
    const g = c.createGain(); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + 1.7);
    this.tone(55, 1.2, 'sine', 0.5, 0, -25);
  },
  trainHorn(vol = 0.15) { this.tone(311, 1.1, 'sawtooth', vol); this.tone(370, 1.1, 'sawtooth', vol * 0.8); },
  punch() { this.tone(160, 0.12, 'square', 0.12, 0, -90); this.crash(0.3); },
  pickup() { this.tone(880, 0.12, 'sine', 0.18); this.tone(1320, 0.2, 'sine', 0.18, 0.09); },
  cash() { [1320, 1760, 2093].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12, i * 0.06)); },
  pass() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.18, i * 0.12)); },
  fail() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.45, 'sawtooth', 0.12, i * 0.18)); },
  star() { this.tone(988, 0.15, 'square', 0.08); this.tone(740, 0.2, 'square', 0.08, 0.12); },
};
