// ===================== VEHICLES: cars, bikes, boats, ships, helicopters, planes, airliners, trains =====================
// kind: car | boat | heli | plane
const SPECS = {
  hatch: { name: 'Hatchback', kind: 'car', len: 3.8, wid: 1.7, accel: 7.5, max: 40, brake: 15, steer: 0.62, steerFall: 24, grip: 7.5, wb: 2.4, mass: 1000, hp: 900, wheelR: 0.31, fuel: 40, price: 9000 },
  sedan: { name: 'Sedan', kind: 'car', len: 4.5, wid: 1.8, accel: 8.4, max: 46, brake: 15, steer: 0.6, steerFall: 25, grip: 7.6, wb: 2.7, mass: 1300, hp: 1000, wheelR: 0.32, fuel: 50, price: 16000 },
  taxi: { name: 'Taxi', kind: 'car', len: 4.5, wid: 1.8, accel: 8.0, max: 44, brake: 15, steer: 0.6, steerFall: 25, grip: 7.6, wb: 2.7, mass: 1300, hp: 1000, wheelR: 0.32, fuel: 50, price: 14000 },
  suv: { name: 'SUV', kind: 'car', len: 4.7, wid: 1.95, accel: 8.0, max: 44, brake: 14, steer: 0.58, steerFall: 24, grip: 7.2, wb: 2.8, mass: 1900, hp: 1300, wheelR: 0.38, fuel: 65, price: 32000 },
  pickup: { name: 'Pickup', kind: 'car', len: 5.2, wid: 1.95, accel: 7.6, max: 42, brake: 13, steer: 0.56, steerFall: 24, grip: 7.0, wb: 3.1, mass: 2000, hp: 1400, wheelR: 0.39, fuel: 70, price: 26000 },
  muscle: { name: 'Muscle Car', kind: 'car', len: 4.9, wid: 1.95, accel: 13, max: 62, brake: 16, steer: 0.56, steerFall: 28, grip: 7.4, wb: 2.9, mass: 1600, hp: 1100, wheelR: 0.36, fuel: 60, price: 65000 },
  sports: { name: 'Coupe', kind: 'car', len: 4.4, wid: 1.92, accel: 14, max: 66, brake: 19, steer: 0.6, steerFall: 30, grip: 8.8, wb: 2.6, mass: 1300, hp: 1000, wheelR: 0.35, fuel: 55, price: 90000 },
  super: { name: 'Supercar', kind: 'car', len: 4.6, wid: 2.05, accel: 19, max: 88, brake: 24, steer: 0.6, steerFall: 36, grip: 10, wb: 2.7, mass: 1400, hp: 1000, wheelR: 0.36, fuel: 70, price: 450000 },
  police: { name: 'Police Cruiser', kind: 'car', len: 4.7, wid: 1.88, accel: 11.5, max: 58, brake: 17, steer: 0.62, steerFall: 27, grip: 8.4, wb: 2.75, mass: 1600, hp: 1400, wheelR: 0.34, fuel: 60 },
  swat: { name: 'Armored Van', kind: 'car', len: 5.6, wid: 2.2, accel: 8.5, max: 46, brake: 14, steer: 0.52, steerFall: 22, grip: 7.4, wb: 3.3, mass: 3800, hp: 3200, wheelR: 0.45, fuel: 90 },
  van: { name: 'Security Van', kind: 'car', len: 5.6, wid: 2.2, accel: 6.5, max: 38, brake: 12, steer: 0.52, steerFall: 22, grip: 7.0, wb: 3.3, mass: 3600, hp: 2600, wheelR: 0.45, fuel: 90 },
  ambulance: { name: 'Ambulance', kind: 'car', len: 5.8, wid: 2.1, accel: 7.5, max: 44, brake: 13, steer: 0.55, steerFall: 22, grip: 7.0, wb: 3.4, mass: 3000, hp: 1800, wheelR: 0.42, fuel: 80 },
  truck: { name: 'Box Truck', kind: 'car', len: 8.2, wid: 2.45, accel: 4.2, max: 30, brake: 10, steer: 0.55, steerFall: 18, grip: 6.4, wb: 4.8, mass: 7000, hp: 2600, wheelR: 0.5, fuel: 160, price: 40000 },
  bus: { name: 'City Bus', kind: 'car', len: 11, wid: 2.55, accel: 3.6, max: 25, brake: 9, steer: 0.55, steerFall: 18, grip: 6.2, wb: 6.2, mass: 9000, hp: 2400, wheelR: 0.5, fuel: 200 },
  auto: { name: 'Auto', kind: 'car', len: 2.7, wid: 1.4, accel: 5.4, max: 20, brake: 11, steer: 0.78, steerFall: 18, grip: 6.4, wb: 1.9, mass: 420, hp: 600, wheelR: 0.24, fuel: 8, price: 3000 },
  scooter: { name: 'Scooter', kind: 'car', len: 1.8, wid: 0.65, accel: 7, max: 27, brake: 14, steer: 0.7, steerFall: 18, grip: 9, wb: 1.25, mass: 160, hp: 400, wheelR: 0.24, fuel: 6, price: 2500, bike: true },
  motorbike: { name: 'Sport Bike', kind: 'car', len: 2.1, wid: 0.75, accel: 17, max: 74, brake: 20, steer: 0.62, steerFall: 32, grip: 9.4, wb: 1.4, mass: 220, hp: 450, wheelR: 0.31, fuel: 17, price: 28000, bike: true },
  // water
  speedboat: { name: 'Speedboat', kind: 'boat', len: 7, wid: 2.4, accel: 9, max: 42, brake: 6, turn: 1.0, mass: 1800, hp: 1400, fuel: 120, price: 60000 },
  jetski: { name: 'Jet Ski', kind: 'boat', len: 3, wid: 1.1, accel: 11, max: 34, brake: 6, turn: 1.6, mass: 350, hp: 500, fuel: 30, price: 15000 },
  yacht: { name: 'Yacht', kind: 'boat', len: 24, wid: 6, accel: 3, max: 20, brake: 2, turn: 0.35, mass: 60000, hp: 6000, fuel: 2000, price: 1200000 },
  cargo: { name: 'Container Ship', kind: 'boat', len: 140, wid: 22, accel: 0.8, max: 9, brake: 0.5, turn: 0.07, mass: 5e6, hp: 1e6, fuel: 1e6, ship: true },
  // air
  heli: { name: 'Helicopter', kind: 'heli', len: 11, wid: 2.4, max: 55, hp: 1500, mass: 2500, fuel: 300, price: 750000 },
  policeheli: { name: 'Police Helicopter', kind: 'heli', len: 11, wid: 2.4, max: 55, hp: 1800, mass: 2500, fuel: 300 },
  plane: { name: 'Prop Plane', kind: 'plane', len: 8.5, wid: 11, max: 75, stall: 30, rot: 34, hp: 1200, mass: 1100, fuel: 200, price: 300000 },
  jet: { name: 'Private Jet', kind: 'plane', len: 16, wid: 15, max: 150, stall: 55, rot: 62, hp: 2500, mass: 9000, fuel: 2000, price: 2500000 },
  airliner: { name: 'Airliner', kind: 'plane', len: 40, wid: 36, max: 140, stall: 62, rot: 75, hp: 8000, mass: 70000, fuel: 20000 },
};
// collision circles along the body (offset, radius)
for (const k in SPECS) { const s = SPECS[k]; const n = s.bike ? 1 : Math.max(1, Math.round(s.len / (s.wid * 1.3))); s.circles = []; for (let i = 0; i < n; i++) s.circles.push([n === 1 ? 0 : (-s.len / 2 + s.wid * 0.5) + i * ((s.len - s.wid) / (n - 1)), s.wid * 0.52]); }
const CAR_COLS = [0xf4f4f2, 0xc9ccd0, 0x2a2d33, 0x8a1c1c, 0x1d3f7a, 0x6b7680, 0xdedad0, 0x3a5a3a, 0xb38b2d, 0x5c2a68, 0xe8e2d0, 0x10151c, 0xd8d8d8, 0x8b9399];
const SUPER_COLS = [0xff6a00, 0xf7d117, 0x0aa36b, 0xd8101a, 0x1846c8, 0xffffff, 0x111111, 0x7d2bd1];
const M2 = {
  head: new THREE.MeshBasicMaterial({ color: 0xd8d2bd }),
  red: new THREE.MeshBasicMaterial({ color: 0x5a0f0f }),
};
const geoCache = new Map();
const PAINT = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.28 });
const GLASS = new THREE.MeshStandardMaterial({ color: 0x0c141c, metalness: 0.85, roughness: 0.06 });
const WHEELM = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.55 });
const ROTOR_MAT = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.85 });
function colGeo(g, hex) { if (g.index) g = g.toNonIndexed(); const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g; }
function rb(w, h, d, r, x, y, z, hex, rx = 0) { const g = new RoundedBoxGeometry(w, h, d, 2, Math.max(0.005, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01))); if (rx) g.rotateX(rx); g.translate(x, y, z); return colGeo(g, hex); }
function bx(w, h, d, x, y, z, hex) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return colGeo(g, hex); }
function cy2(rt, rb_, h, x, y, z, hex, axis = 'y', seg = 14) { const g = new THREE.CylinderGeometry(rt, rb_, h, seg); if (axis === 'z') g.rotateX(Math.PI / 2); if (axis === 'x') g.rotateZ(Math.PI / 2); g.translate(x, y, z); return colGeo(g, hex); }
// wedge: box whose top face is sloped (front lower) - used for supercar nose and hulls
function wedge(w, h0, h1, d, x, y, z, hex) { const g = new THREE.BoxGeometry(w, 1, d); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const zz = p.getZ(i), yy = p.getY(i); const t = (zz / d) + 0.5; const top = lerp(h0, h1, t); p.setY(i, yy > 0 ? top : 0); } g.computeVertexNormals(); g.translate(x, y, z); return colGeo(g, hex); }

function carBody(type, hex) {
  const key = type + hex;
  if (geoCache.has(key)) return geoCache.get(key);
  const sp = SPECS[type], L = sp.len, W = sp.wid, P = [], Gl = [];
  const dark = 0x1b1c1e, chrome = 0xc8c8c4;
  const cabin = (base, H, cabL, cabZ, cabH, roof = hex) => {
    const cy = base + H / 2 + cabH / 2 - 0.02;
    Gl.push(rb(W * 0.84, cabH, cabL, 0.12, 0, cy, cabZ, 0));
    P.push(rb(W * 0.86, 0.07, cabL * 0.86, 0.03, 0, cy + cabH / 2, cabZ, roof));
    for (const s of [-1, 1]) {
      P.push(bx(0.05, cabH * 0.95, 0.14, s * W * 0.425, cy, cabZ + cabL / 2 - 0.08, hex), bx(0.05, cabH * 0.95, 0.14, s * W * 0.425, cy, cabZ - cabL / 2 + 0.08, hex));
      P.push(bx(0.14, 0.09, 0.18, s * (W / 2 + 0.05), cy - cabH * 0.25, cabZ + cabL / 2 - 0.1, hex));
    }
    return cy;
  };
  const bumpers = (base, H) => {
    P.push(rb(W * 0.96, 0.2, 0.16, 0.06, 0, base - H / 2 + 0.12, L / 2 + 0.02, dark), rb(W * 0.96, 0.2, 0.16, 0.06, 0, base - H / 2 + 0.12, -L / 2 - 0.02, dark));
    P.push(bx(W * 0.42, 0.12, 0.04, 0, base + 0.02, L / 2 + 0.01, 0x101010));
    for (const s of [-1, 1]) P.push(bx(0.02, 0.04, L * 0.7, s * (W / 2 + 0.005), base + 0.05, 0, dark));
  };
  if (type === 'auto') {
    const y = 0xf2c41f, g = 0x1e6b3a, blk = 0x161616;
    P.push(rb(W * 0.96, 0.62, L * 0.62, 0.14, 0, 0.6, -0.28, y), rb(W * 0.6, 0.78, 0.8, 0.2, 0, 0.66, 0.92, y), bx(W * 0.98, 0.09, L * 0.92, 0, 0.33, -0.05, g));
    P.push(rb(W * 1.02, 0.14, L * 0.86, 0.06, 0, 1.6, -0.18, blk), rb(W * 1.0, 0.9, 0.12, 0.05, 0, 1.12, -1.22, blk));
    for (const s of [-1, 1]) P.push(bx(0.05, 0.9, 0.06, s * W * 0.47, 1.1, 0.6, blk), bx(0.05, 0.9, 0.06, s * W * 0.48, 1.1, -0.9, blk));
    P.push(bx(W * 0.84, 0.16, 0.7, 0, 0.88, -0.55, 0x3b2a1e), bx(0.62, 0.05, 0.05, 0, 1.24, 1.12, chrome));
    Gl.push(bx(W * 0.76, 0.6, 0.05, 0, 1.18, 0.98, 0));
  } else if (type === 'scooter') {
    P.push(rb(0.38, 0.4, 1.0, 0.12, 0, 0.45, -0.15, hex), rb(0.32, 0.12, 0.72, 0.05, 0, 0.72, -0.25, dark), rb(0.34, 0.85, 0.2, 0.08, 0, 0.78, 0.55, hex), bx(0.72, 0.05, 0.05, 0, 1.15, 0.6, dark), bx(0.2, 0.2, 0.9, 0, 0.26, 0.3, dark));
  } else if (type === 'motorbike') {
    P.push(rb(0.34, 0.36, 0.9, 0.12, 0, 0.78, 0.15, hex), wedge(0.3, 0.18, 0.32, 0.6, 0, 0.82, 0.62, hex), rb(0.28, 0.12, 0.6, 0.05, 0, 0.92, -0.35, dark), bx(0.26, 0.28, 0.5, 0, 0.5, -0.05, 0x2a2a2a));
    P.push(cy2(0.03, 0.03, 0.75, 0, 0.66, 0.78, chrome, 'y'), bx(0.62, 0.04, 0.04, 0, 1.08, 0.72, dark), cy2(0.05, 0.06, 0.5, 0.14, 0.42, -0.45, chrome, 'z'));
    Gl.push(wedge(0.3, 0.05, 0.22, 0.2, 0, 1.0, 0.68, 0));
  } else if (type === 'bus') {
    P.push(rb(W, 1.15, L, 0.15, 0, 1.05, 0, hex), rb(W, 1.2, L, 0.15, 0, 2.2, 0, 0xe9e1c8), rb(W * 0.98, 0.25, L * 0.98, 0.12, 0, 2.92, 0, 0xe9e1c8), bx(W * 0.95, 0.32, L * 0.96, 0, 0.42, 0, dark), bx(W * 0.6, 0.32, 0.06, 0, 2.72, L / 2 + 0.01, 0xf2c41f));
    Gl.push(bx(W + 0.03, 0.85, L - 2.4, 0, 2.08, -0.3, 0), bx(W * 0.9, 1.15, 0.05, 0, 2.05, L / 2 + 0.02, 0));
  } else if (type === 'truck' || type === 'van' || type === 'swat' || type === 'ambulance') {
    const boxL = type === 'truck' ? L * 0.7 : L * 0.62, cabL2 = L - boxL - 0.1;
    const boxCol = type === 'ambulance' ? 0xf4f4f2 : type === 'swat' ? 0x22262c : type === 'van' ? 0x6a7a6a : 0xe8e8e2;
    const bh = type === 'truck' ? 2.6 : 2.0;
    P.push(rb(W, bh, boxL, 0.08, 0, 0.7 + bh / 2, -L / 2 + boxL / 2, boxCol));
    P.push(rb(W * 0.98, 1.0, cabL2, 0.15, 0, 1.0, L / 2 - cabL2 / 2, hex), rb(W * 0.96, 0.9, cabL2 * 0.75, 0.15, 0, 1.9, L / 2 - cabL2 * 0.45, hex));
    Gl.push(rb(W * 0.9, 0.7, 0.06, 0.03, 0, 1.95, L / 2 - 0.02, 0)); for (const s of [-1, 1]) Gl.push(bx(0.04, 0.6, cabL2 * 0.6, s * W * 0.485, 1.95, L / 2 - cabL2 * 0.45, 0));
    P.push(bx(W * 0.95, 0.35, L * 0.97, 0, 0.5, 0, dark), rb(W * 0.96, 0.25, 0.16, 0.06, 0, 0.6, L / 2 + 0.03, dark));
    if (type === 'ambulance') { P.push(bx(W + 0.02, 0.25, boxL * 0.95, 0, 1.6, -L / 2 + boxL / 2, 0xd01818), bx(0.8, 0.12, 0.3, 0, 3.0, -L / 2 + boxL - 0.5, 0x2a2a2a)); }
    if (type === 'swat') { P.push(bx(W + 0.02, 0.18, boxL * 0.95, 0, 1.4, -L / 2 + boxL / 2, 0x1d3f9a), bx(1.2, 0.12, 0.3, 0, 2.8, -L / 2 + boxL - 0.4, 0x2a2a2a)); }
    if (type === 'van') P.push(bx(W + 0.02, 0.4, boxL * 0.6, 0, 1.6, -L / 2 + boxL / 2, 0xd4a72c));
    if (type === 'truck') for (let i = 0; i < 3; i++) P.push(bx(W + 0.02, 0.3, 0.6, 0, 2.2, -L / 2 + 1 + i * 1.6, [0xc8251c, 0x1f4fb3, 0xf2c41f][i]));
  } else if (type === 'pickup') {
    const base = 0.75, H = 0.75; P.push(rb(W, H, L, 0.16, 0, base, 0, hex)); cabin(base, H, L * 0.32, 0.45, 0.62); bumpers(base, H);
    P.push(bx(W * 0.9, 0.05, L * 0.4, 0, base + H / 2 + 0.01, -L * 0.27, 0x222222)); for (const s of [-1, 1]) P.push(bx(0.08, 0.35, L * 0.42, s * W * 0.46, base + H / 2 + 0.17, -L * 0.27, hex));
    P.push(bx(W * 0.92, 0.35, 0.08, 0, base + H / 2 + 0.17, -L / 2 + 0.05, hex));
  } else if (type === 'super') {
    P.push(wedge(W, 0.62, 0.3, L * 0.5, 0, 0.18, L * 0.24, hex), rb(W, 0.6, L * 0.52, 0.18, 0, 0.5, -L * 0.24, hex));
    Gl.push(wedge(W * 0.78, 0.42, 0.02, L * 0.22, 0, 0.78, L * 0.02, 0)); Gl.push(rb(W * 0.76, 0.36, L * 0.22, 0.14, 0, 0.98, -L * 0.18, 0));
    P.push(rb(W * 0.78, 0.06, L * 0.2, 0.03, 0, 1.17, -L * 0.17, hex));
    P.push(bx(W * 0.95, 0.06, 0.4, 0, 1.0, -L / 2 + 0.25, dark), bx(0.08, 0.25, 0.08, W * 0.35, 0.85, -L / 2 + 0.25, dark), bx(0.08, 0.25, 0.08, -W * 0.35, 0.85, -L / 2 + 0.25, dark));
    for (const s of [-1, 1]) P.push(bx(0.05, 0.25, L * 0.25, s * (W / 2 + 0.01), 0.55, -L * 0.05, 0x111111));
    P.push(bx(W * 0.9, 0.12, 0.06, 0, 0.25, L / 2, 0x111111), bx(W * 0.9, 0.18, 0.06, 0, 0.45, -L / 2, 0x111111));
  } else if (type === 'muscle') {
    const base = 0.55, H = 0.62; P.push(rb(W, H, L, 0.14, 0, base, 0, hex)); cabin(base, H, L * 0.36, -0.45, 0.5); bumpers(base, H);
    P.push(bx(0.5, 0.12, L * 0.3, 0, base + H / 2 + 0.05, L * 0.25, dark), bx(0.25, 0.05, L * 0.95, 0.25, base + H / 2 + 0.005, 0, 0xffffff), bx(0.25, 0.05, L * 0.95, -0.25, base + H / 2 + 0.005, 0, 0xffffff));
  } else {
    const H = type === 'sports' ? 0.5 : type === 'suv' ? 0.85 : 0.64, base = type === 'sports' ? 0.44 : type === 'suv' ? 0.66 : 0.52;
    P.push(rb(W, H, L, type === 'sports' ? 0.2 : 0.16, 0, base, 0, hex));
    const cabL = type === 'hatch' ? L * 0.56 : type === 'sports' ? L * 0.4 : type === 'suv' ? L * 0.6 : L * 0.48;
    const cabZ = type === 'hatch' ? -0.28 : type === 'sports' ? -0.3 : type === 'suv' ? -0.2 : -0.12;
    const cabH = type === 'sports' ? 0.42 : type === 'suv' ? 0.68 : 0.56;
    const cy = cabin(base, H, cabL, cabZ, cabH);
    bumpers(base, H);
    if (type === 'police') { P.push(bx(W + 0.02, 0.16, L * 0.68, 0, base + 0.04, 0, 0x1d3f9a), bx(1.15, 0.08, 0.28, 0, cy + cabH / 2 + 0.08, cabZ, 0x222222)); }
    if (type === 'taxi') { P.push(bx(0.7, 0.2, 0.3, 0, cy + cabH / 2 + 0.14, cabZ, 0xffffff), bx(W + 0.02, 0.1, L * 0.7, 0, base + 0.1, 0, 0x111111)); }
    if (type === 'sports') P.push(bx(W * 0.9, 0.05, 0.32, 0, base + H / 2 + 0.22, -L / 2 + 0.22, dark), bx(0.06, 0.2, 0.06, 0.6, base + H / 2 + 0.1, -L / 2 + 0.22, dark), bx(0.06, 0.2, 0.06, -0.6, base + H / 2 + 0.1, -L / 2 + 0.22, dark));
    if (type === 'suv') P.push(bx(W * 0.06, 0.05, cabL * 0.8, W * 0.36, cy + cabH / 2 + 0.07, cabZ, dark), bx(W * 0.06, 0.05, cabL * 0.8, -W * 0.36, cy + cabH / 2 + 0.07, cabZ, dark));
  }
  const res = { body: mergeGeometries(P), glass: Gl.length ? mergeGeometries(Gl) : null };
  geoCache.set(key, res); return res;
}
function boatBody(type, hex) {
  const key = 'b' + type + hex; if (geoCache.has(key)) return geoCache.get(key);
  const sp = SPECS[type], L = sp.len, W = sp.wid, P = [], Gl = [];
  if (type === 'cargo') {
    P.push(rb(W, 9, L * 0.88, 0.5, 0, 1.5, -L * 0.04, 0x9b2a20), wedge(W * 0.8, 9, 9, L * 0.12, 0, -3, L * 0.44, 0x9b2a20));
    P.push(bx(W * 0.98, 0.4, L * 0.92, 0, 6.2, -L * 0.03, 0x3a3a3a));
    const cc = [0xc8251c, 0x1f4fb3, 0xf2c41f, 0x178a45, 0xef7d16, 0xe8e8e8, 0x6a3a8a];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2 + ((i + j) % 3); k++)
      P.push(bx(W / 3 - 0.4, 2.5, 12, (j - 1) * W / 3, 7.6 + k * 2.6, -L * 0.25 + i * 12.8, cc[(i * 7 + j * 3 + k) % cc.length]));
    P.push(rb(W * 0.9, 14, 12, 0.3, 0, 13, -L * 0.42, 0xf2f2f0)); Gl.push(bx(W * 0.92, 1.5, 12.2, 0, 17, -L * 0.42, 0));
    P.push(cy2(1.6, 1.6, 6, 0, 22, -L * 0.45, 0x222222));
  } else if (type === 'yacht') {
    P.push(wedge(W, 2.2, 2.6, L, 0, -0.6, 0, 0xf6f6f4), rb(W * 0.8, 2.2, L * 0.55, 0.4, 0, 2.9, -L * 0.08, 0xf6f6f4), rb(W * 0.6, 1.6, L * 0.3, 0.4, 0, 4.7, -L * 0.12, 0xf6f6f4));
    Gl.push(bx(W * 0.82, 0.8, L * 0.5, 0, 3.0, -L * 0.06, 0), bx(W * 0.62, 0.6, L * 0.28, 0, 4.8, -L * 0.1, 0));
    P.push(bx(W + 0.05, 0.25, L * 0.98, 0, 1.2, 0, 0x1a2a4a));
  } else if (type === 'jetski') {
    P.push(wedge(W, 0.5, 0.75, L, 0, -0.15, 0, hex), rb(0.4, 0.2, 1.0, 0.08, 0, 0.62, -0.3, 0x1a1a1a), bx(0.6, 0.05, 0.05, 0, 0.95, 0.5, 0x222222), rb(0.25, 0.4, 0.2, 0.06, 0, 0.75, 0.55, hex));
  } else {
    P.push(wedge(W, 1.0, 1.35, L, 0, -0.35, 0, 0xf4f4f2), bx(W + 0.04, 0.22, L * 0.95, 0, 0.55, 0, hex), rb(W * 0.85, 0.12, L * 0.55, 0.05, 0, 0.95, -L * 0.15, 0xd8c8a8));
    Gl.push(wedge(W * 0.8, 0.0, 0.5, 0.5, 0, 0.95, L * 0.12, 0)); P.push(bx(0.5, 0.5, 0.4, 0, 0.9, -L / 2 + 0.3, 0x222222));
  }
  const res = { body: mergeGeometries(P), glass: Gl.length ? mergeGeometries(Gl) : null }; geoCache.set(key, res); return res;
}
function airBody(type, hex) {
  const key = 'a' + type + hex; if (geoCache.has(key)) return geoCache.get(key);
  const P = [], Gl = [], white = 0xf4f4f2, dark = 0x222428;
  if (type === 'heli' || type === 'policeheli') {
    const c = type === 'policeheli' ? 0x1d2a4a : hex;
    P.push(sphereG(1.3, 0, 1.6, 0.6, c, 1, 0.95, 1.7), cy2(0.45, 0.22, 5.2, 0, 1.9, -3.6, c, 'z'), bx(0.1, 1.3, 1.0, 0, 2.6, -6.0, c), bx(1.6, 0.08, 0.6, 0, 2.0, -5.8, c));
    Gl.push(sphereG(1.18, 0, 1.75, 1.1, 0, 0.9, 0.82, 1.2));
    for (const s of [-1, 1]) { P.push(cy2(0.06, 0.06, 3.6, s * 1.0, 0.1, 0.4, dark, 'z'), bx(0.06, 0.55, 0.06, s * 0.95, 0.38, 1.2, dark), bx(0.06, 0.55, 0.06, s * 0.95, 0.38, -0.5, dark)); }
    P.push(cy2(0.15, 0.2, 0.5, 0, 3.05, 0.4, dark));
    if (type === 'policeheli') P.push(bx(2.65, 0.25, 1.8, 0, 1.4, 0.4, 0xf4f4f4));
  } else if (type === 'plane') {
    P.push(cy2(0.6, 0.35, 7, 0, 1.5, 0, hex, 'z'), sphereG(0.62, 0, 1.5, 3.4, hex, 1, 1, 1.3), cy2(0.35, 0.1, 2, 0, 1.6, -4.4, hex, 'z'));
    P.push(rb(11, 0.12, 1.5, 0.05, 0, 2.15, 0.6, white), bx(3.6, 0.08, 0.9, 0, 1.7, -4.8, white), bx(0.08, 1.4, 1.0, 0, 2.3, -4.8, hex));
    Gl.push(rb(1.0, 0.5, 1.4, 0.2, 0, 2.05, 1.6, 0));
    P.push(cy2(0.05, 0.05, 1.1, 0.9, 0.6, 1.4, dark), cy2(0.05, 0.05, 1.1, -0.9, 0.6, 1.4, dark), cy2(0.05, 0.05, 1.0, 0, 0.6, 3.0, dark));
  } else if (type === 'jet') {
    P.push(cy2(1.05, 0.7, 13, 0, 1.9, 0, white, 'z'), sphereG(1.05, 0, 1.9, 6.5, white, 1, 1, 1.8), cy2(0.7, 0.25, 3, 0, 2.0, -8, white, 'z'));
    P.push(wingG(15, 3.2, 0.2, 0, 1.4, 0.5, white, 0.35), wingG(5.5, 1.6, 0.15, 0, 4.2, -8.4, white, 0.3), bx(0.15, 2.6, 2.2, 0, 3.2, -8.3, hex));
    for (const s of [-1, 1]) P.push(cy2(0.45, 0.45, 2.6, s * 1.5, 2.4, -5.5, 0xd8d8d8, 'z'));
    P.push(bx(0.06, 0.25, 12, 1.06, 2.1, 0.5, hex), bx(0.06, 0.25, 12, -1.06, 2.1, 0.5, hex));
    Gl.push(sphereG(0.75, 0, 2.3, 7.4, 0, 1, 0.6, 1.2));
  } else if (type === 'airliner') {
    P.push(cy2(2.0, 2.0, 32, 0, 4.2, 0, white, 'z'), sphereG(2.0, 0, 4.2, 16, white, 1, 1, 2.0), cy2(2.0, 0.5, 7, 0, 4.6, -19.5, white, 'z'));
    P.push(wingG(36, 7, 0.4, 0, 3.0, 1.5, 0xe6e6e6, 0.45), wingG(13, 3.2, 0.25, 0, 5.6, -20.5, 0xe6e6e6, 0.4), bx(0.3, 7, 5.5, 0, 8.5, -20.5, hex));
    for (const s of [-1, 1]) { P.push(cy2(1.1, 1.0, 4.2, s * 6.5, 2.4, 3.2, 0xd8d8d8, 'z'), cy2(0.8, 0.8, 0.1, s * 6.5, 2.4, 5.35, 0x222222, 'z')); }
    P.push(bx(0.06, 0.6, 30, 2.01, 3.7, 0, hex), bx(0.06, 0.6, 30, -2.01, 3.7, 0, hex));
    for (let i = 0; i < 26; i++) for (const s of [-1, 1]) Gl.push(bx(0.05, 0.32, 0.25, s * 2.0, 5.0, -12 + i * 1.0, 0));
    Gl.push(sphereG(1.0, 0, 5.4, 17.2, 0, 1.2, 0.45, 1.0));
    for (const [x, z] of [[0, 13], [3, 1], [-3, 1]]) P.push(cy2(0.12, 0.12, 2.2, x, 1.1, z, dark), cy2(0.55, 0.55, 0.45, x, 0.55, z, 0x111111, 'x'));
  }
  const res = { body: mergeGeometries(P), glass: Gl.length ? mergeGeometries(Gl) : null }; geoCache.set(key, res); return res;
}
function sphereG(r, x, y, z, hex, sx = 1, sy = 1, sz = 1) { const g = new THREE.SphereGeometry(r, 16, 12); g.scale(sx, sy, sz); g.translate(x, y, z); return colGeo(g, hex); }
function wingG(span, chord, thick, x, y, z, hex, sweep) { const g = new THREE.BoxGeometry(span, thick, chord); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const ax = Math.abs(p.getX(i)) / (span / 2); p.setZ(i, p.getZ(i) * (1 - ax * 0.55) - ax * sweep * span * 0.3); } g.computeVertexNormals(); g.translate(x, y, z); return colGeo(g, hex); }
const wheelGeo = {};
function wheelG(r, w) {
  const k = r + '_' + w;
  if (!wheelGeo[k]) {
    const t = new THREE.CylinderGeometry(r, r, w, 18); t.rotateZ(Math.PI / 2);
    const rim = new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 14); rim.rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.04, 8); hub.rotateZ(Math.PI / 2);
    const sp = []; for (let i = 0; i < 5; i++) { const s = new THREE.BoxGeometry(w + 0.03, r * 0.1, r * 1.1); s.rotateX(i / 5 * Math.PI); sp.push(colGeo(s, 0x9a9ea2)); }
    wheelGeo[k] = mergeGeometries([colGeo(t, 0x161616), colGeo(rim, 0xc0c4c8), colGeo(hub, 0x505050), ...sp]);
  }
  return wheelGeo[k];
}

let VID = 0;
const vehicles = [];
class Vehicle {
  constructor(type, hex, x, z, h) {
    this.id = ++VID; this.type = type; this.spec = SPECS[type]; this.kind = this.spec.kind;
    const sp = this.spec;
    this.color = hex ?? (type === 'auto' ? 0xf2c41f : type === 'taxi' ? 0xf2c41f : type === 'bus' ? pick([0xb8322a, 0x2b5ea8, 0x2d7a46]) : type === 'police' ? 0xf2f2f0 : type === 'ambulance' ? 0xf4f4f2 : type === 'swat' ? 0x22262c : type === 'van' ? 0x5a6a5a : type === 'super' || type === 'motorbike' ? pick(SUPER_COLS) : pick(CAR_COLS));
    this.x = x; this.z = z; this.y = 0; this.h = h; this.vx = 0; this.vz = 0; this.vy = 0; this.pitch = 0; this.roll = 0;
    this.steerVis = 0; this.wheelRot = 0; this.health = sp.hp; this.driver = null; this.agent = null;
    this.burnT = -1; this.wreck = false; this.sinkT = 0; this.braking = false; this.hornT = 0; this.persist = false;
    this.lastImpact = 0; this.smokeT = 0; this.isPolice = type === 'police' || type === 'swat' || type === 'policeheli'; this.siren = false;
    this.fuel = 0.55 + Math.random() * 0.45; this.thr = 0; this.rotor = 0;
    this.group = new THREE.Group();
    const geo = this.kind === 'car' ? carBody(type, this.color) : this.kind === 'boat' ? boatBody(type, this.color) : airBody(type, this.color);
    const body = new THREE.Mesh(geo.body, PAINT); body.castShadow = true; body.receiveShadow = true; this.group.add(body); this.body = body;
    if (geo.glass) { const gm = new THREE.Mesh(geo.glass, GLASS); gm.castShadow = true; this.group.add(gm); this.glassMesh = gm; }
    this.wheels = []; this.front = [];
    const lb = (mat, ...boxes) => { const geos = boxes.map(([x, y, z, sx, sy, sz]) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return g; }); const m = new THREE.Mesh(mergeGeometries(geos), mat); this.group.add(m); return m; };
    this.tailMat = M2.red.clone();
    const L = sp.len, W = sp.wid;
    if (this.kind === 'car') {
      const r = sp.wheelR, ww = type === 'bus' || type === 'truck' ? 0.4 : sp.bike ? 0.12 : type === 'super' ? 0.32 : 0.24;
      const wx = sp.wid / 2 - ww / 2 + 0.02, fz = sp.wb / 2, rz = -sp.wb / 2;
      const pos = sp.bike ? [[0, fz, 1], [0, rz, 0]] : type === 'auto' ? [[0, fz, 1], [wx, rz, 0], [-wx, rz, 0]] : [[wx, fz, 1], [-wx, fz, 1], [wx, rz, 0], [-wx, rz, 0]];
      for (const [px, pz, f] of pos) {
        const wm = new THREE.Mesh(wheelG(r, ww), WHEELM); wm.castShadow = true;
        if (f) { const piv = new THREE.Group(); piv.position.set(px, r, pz); piv.add(wm); this.group.add(piv); this.front.push(piv); }
        else { wm.position.set(px, r, pz); this.group.add(wm); }
        this.wheels.push(wm);
      }
      if (sp.bike) { lb(M2.head, [0, 1.0, L / 2 - 0.1, 0.16, 0.12, 0.05]); lb(this.tailMat, [0, 0.8, -L / 2 + 0.05, 0.16, 0.08, 0.05]); }
      else if (type === 'auto') { lb(M2.head, [0, 0.95, 1.31, 0.2, 0.16, 0.05]); lb(this.tailMat, [0.5, 0.6, -1.36, 0.14, 0.1, 0.04], [-0.5, 0.6, -1.36, 0.14, 0.1, 0.04]); }
      else {
        const ly = ['bus', 'truck', 'van', 'swat', 'ambulance'].includes(type) ? 0.95 : type === 'sports' || type === 'super' ? 0.5 : type === 'suv' || type === 'pickup' ? 0.8 : 0.6;
        lb(M2.head, [W * 0.33, ly, L / 2 + 0.03, 0.38, 0.14, 0.05], [-W * 0.33, ly, L / 2 + 0.03, 0.38, 0.14, 0.05]);
        lb(this.tailMat, [W * 0.36, ly + 0.05, -L / 2 - 0.03, 0.32, 0.14, 0.05], [-W * 0.36, ly + 0.05, -L / 2 - 0.03, 0.32, 0.14, 0.05]);
      }
      if (type === 'police' || type === 'swat' || type === 'ambulance') {
        this.lbR = new THREE.MeshBasicMaterial({ color: 0x551111 }); this.lbB = new THREE.MeshBasicMaterial({ color: 0x111155 });
        const cy = type === 'police' ? 1.62 : type === 'swat' ? 2.95 : 3.1, z = type === 'police' ? -0.15 : -L / 2 + (type === 'swat' ? 2.4 : 2.2);
        lb(this.lbR, [0.3, cy, z, 0.4, 0.12, 0.22]); lb(this.lbB, [-0.3, cy, z, 0.4, 0.12, 0.22]);
        this.siren = false; if (type === 'ambulance') this.isPolice = false;
      }
      // a driver silhouette for traffic
      if (!sp.bike && type !== 'auto') { const d = seatedMesh(randomLook()); d.position.set(type === 'bus' || type === 'truck' ? 0.6 : 0.38, type === 'bus' ? 1.0 : type === 'truck' || type === 'van' || type === 'swat' || type === 'ambulance' ? 0.75 : type === 'super' || type === 'sports' ? -0.1 : 0.05, type === 'bus' ? L / 2 - 1.5 : type === 'truck' || type === 'van' || type === 'swat' || type === 'ambulance' ? L / 2 - 1.3 : -0.2); this.group.add(d); this.driverMesh = d; d.visible = false; }
      else if (sp.bike || type === 'auto') { const d = seatedMesh(randomLook()); d.position.set(0, sp.bike ? 0.45 : 0.4, sp.bike ? -0.35 : 0.3); if (sp.bike) d.rotation.x = 0.1; this.group.add(d); this.driverMesh = d; d.visible = false; }
    } else if (this.kind === 'boat') {
      lb(M2.head, [0, 1.2, L / 2 - 0.4, 0.3, 0.1, 0.1]);
      if (type !== 'cargo') { const d = seatedMesh(randomLook()); d.position.set(0, type === 'jetski' ? 0.35 : 0.5, type === 'jetski' ? -0.3 : -L * 0.15); this.group.add(d); this.driverMesh = d; d.visible = false; }
    } else {
      // rotors / props
      if (this.kind === 'heli') {
        const blades = new THREE.Group(); const bg = new THREE.BoxGeometry(11, 0.06, 0.32); const b1 = new THREE.Mesh(bg, ROTOR_MAT), b2 = new THREE.Mesh(bg, ROTOR_MAT); b2.rotation.y = Math.PI / 2; blades.add(b1, b2); blades.position.set(0, 3.3, 0.4); this.group.add(blades); this.blades = blades;
        const tr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.18), ROTOR_MAT); tr.position.set(0.12, 2.6, -6.0); this.group.add(tr); this.tailRotor = tr;
        const d = seatedMesh(randomLook()); d.position.set(0.35, 0.95, 1.0); this.group.add(d); this.driverMesh = d; d.visible = false;
        if (type === 'policeheli') { this.spot = new THREE.SpotLight(0xfff6e0, 0, 160, 0.22, 0.5, 1); this.spot.position.set(0, 0.8, 1.6); this.group.add(this.spot, this.spot.target); }
      } else if (type === 'plane') {
        const pr = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.06), ROTOR_MAT); pr.position.set(0, 1.5, 4.4); this.group.add(pr); this.prop = pr;
      }
      lb(new THREE.MeshBasicMaterial({ color: 0xff2020 }), [-(sp.wid / 2), 2.2, 0.4, 0.15, 0.15, 0.15]); lb(new THREE.MeshBasicMaterial({ color: 0x20ff40 }), [sp.wid / 2, 2.2, 0.4, 0.15, 0.15, 0.15]);
    }
    this.gearDown = true; this.lightsOn = false;
    this.attachModel();
    this.group.position.set(x, 0, z); this.group.rotation.y = h;
    scene.add(this.group);
    vehicles.push(this);
  }
  // swap the procedural body for the Blender model when one exists for this type
  attachModel() {
    if (this.model) { this.group.remove(this.model.root); this.model = null; }
    const mdl = Assets.vehicleModel(this.type, this.color); if (!mdl) return;
    this.model = mdl; this.group.add(mdl.root);
    this.body.visible = false; if (this.glassMesh) this.glassMesh.visible = false;
    if (mdl.rotor) { if (this.blades) this.blades.visible = false; this.blades = mdl.rotor; }
    if (mdl.prop) { if (this.prop) this.prop.visible = false; this.prop = mdl.prop; }
  }
  get speed() { return Math.hypot(this.vx, this.vz); }
  get fwdSpeed() { return this.vx * Math.sin(this.h) + this.vz * Math.cos(this.h); }
  update(dt, c) {
    if (this.kind === 'boat') return this.updateBoat(dt, c);
    if (this.kind === 'heli') return this.updateHeli(dt, c);
    if (this.kind === 'plane') return this.updatePlane(dt, c);
    const sp = this.spec;
    if (this.wreck || this.sinkT > 0) c = NOCTRL;
    let fx = Math.sin(this.h), fz = Math.cos(this.h), rx = -fz, rz = fx;
    let vf = this.vx * fx + this.vz * fz, vr = this.vx * rx + this.vz * rz;
    const onGround = this.vy === 0;
    let thr = c.throttle; const brk = c.brake;
    if (this.fuel <= 0 && this.driver === 'player') thr = 0;
    this.braking = brk > 0.1 && vf > 0.5;
    if (onGround) {
      if (thr > 0) { if (vf < -0.3) vf += sp.brake * dt * thr; else vf += sp.accel * thr * dt * Math.max(0, 1 - vf / sp.max) * (1 + (vf < 8 ? 0.4 : 0)); }
      if (brk > 0) { if (vf > 0.3) vf -= sp.brake * dt * brk; else vf -= sp.accel * 0.55 * brk * dt * Math.max(0, 1 + vf / (sp.max * 0.28)); }
      if (thr <= 0 && brk <= 0) vf -= Math.sign(vf) * Math.min(Math.abs(vf), (1.0 + Math.abs(vf) * 0.04) * dt);
      if (c.handbrake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 5.5 * dt);
      const target = c.steer * sp.steer / (1 + Math.abs(vf) / sp.steerFall);
      this.steerVis += (target - this.steerVis) * Math.min(1, dt * 7);
      const grip = c.handbrake ? sp.grip * 0.16 : sp.grip;
      vr *= Math.exp(-grip * dt);
      let yaw = vf * Math.tan(this.steerVis) / sp.wb;
      if (c.handbrake && Math.abs(vf) > 4) yaw *= 1.45;
      this.h += yaw * dt;
      if (c.handbrake && Math.abs(vr) > 3 && this.driver === 'player') this.smokeT += dt;
    }
    if (this.driver === 'player') this.fuel = Math.max(0, this.fuel - (Math.abs(vf) * 0.0000015 + thr * 0.000006) * dt * 60 / Math.max(0.3, sp.fuel / 50));
    fx = Math.sin(this.h); fz = Math.cos(this.h); rx = -fz; rz = fx;
    this.vx = fx * vf + rx * vr; this.vz = fz * vf + rz * vr;
    const spd = Math.hypot(this.vx, this.vz), n = Math.min(5, Math.max(1, Math.ceil(spd * dt / 0.45)));
    for (let k = 0; k < n; k++) this.integrate(dt / n);
    this.wheelRot += vf * dt / sp.wheelR;
  }
  integrate(dt) {
    const sp = this.spec;
    this.x += this.vx * dt; this.z += this.vz * dt;
    if (this.x < BX0 + 5) { this.x = BX0 + 5; this.vx = Math.abs(this.vx) * 0.3; } if (this.x > BX1 - 5) { this.x = BX1 - 5; this.vx = -Math.abs(this.vx) * 0.3; }
    if (this.z < BZ0 + 5) { this.z = BZ0 + 5; this.vz = Math.abs(this.vz) * 0.3; } if (this.z > BZ1 - 5) { this.z = BZ1 - 5; this.vz = -Math.abs(this.vz) * 0.3; }
    const s = surfaceAt(this.x, this.z, this.y);
    if (this.sinkT > 0) { this.y = Math.max(-2.6, this.y - dt * 0.8); this.vx *= 0.96; this.vz *= 0.96; return; }
    if (s.y >= this.y - 0.3) { this.y += (s.y - this.y) * Math.min(1, dt * 14); if (Math.abs(s.y - this.y) < 0.02) this.y = s.y; this.vy = 0; }
    else { this.vy -= 22 * dt; this.y += this.vy * dt; if (this.y <= s.y) { if (this.vy < -8) this.damage(-this.vy * 25); this.y = s.y; this.vy = 0; } }
    if (s.elev && this.y > 0.8) {
      const m = sp.wid * 0.5 + 0.15;
      if (s.ex > -m) { // past the edge of every deck segment at this height: push back on
        const ex = this.x - s.px, ez = this.z - s.pz, l = Math.hypot(ex, ez) || 1, nx = -ex / l, nz = -ez / l, push = s.ex + m;
        this.x += nx * push; this.z += nz * push;
        const vn = this.vx * nx + this.vz * nz; if (vn < 0) { this.vx -= 1.4 * vn * nx; this.vz -= 1.4 * vn * nz; this.impact(-vn); }
      }
    }
    if (this.y < 2.2) {
      const fx = Math.sin(this.h), fz = Math.cos(this.h);
      let px = 0, pz = 0, hitAny = false;
      for (const [o, r] of sp.circles) {
        const cx = this.x + fx * o + px, cz = this.z + fz * o + pz;
        const res = collideCircle(cx, cz, r, this.y);
        if (res.hit) { px += res.x - cx; pz += res.z - cz; hitAny = true; }
      }
      if (hitAny) {
        this.x += px; this.z += pz;
        const l = Math.hypot(px, pz) || 1, nx = px / l, nz = pz / l, vn = this.vx * nx + this.vz * nz;
        if (vn < 0) { this.vx -= 1.3 * vn * nx; this.vz -= 1.3 * vn * nz; this.vx *= 0.9; this.vz *= 0.9; this.impact(-vn); }
      }
    }
    if (this.y < 0.5 && inWater(this.x, this.z)) {
      const r = roadQuery(this.x, this.z, 8, this.y);
      // bridges over water have railings: keep the car on the deck instead of letting it drop into the river
      const m = sp.wid * 0.5 + 0.15;
      if (r.seg && r.seg.e.br && r.d > -m && r.d < 4) {
        const ex = this.x - r.px, ez = this.z - r.pz, l = Math.hypot(ex, ez) || 1, nx = -ex / l, nz = -ez / l, push = r.d + m;
        this.x += nx * push; this.z += nz * push;
        const vn = this.vx * nx + this.vz * nz; if (vn < 0) { this.vx -= 1.4 * vn * nx; this.vz -= 1.4 * vn * nz; this.impact(-vn); }
      } else if (!(r.seg && r.d < 1.5)) { this.sinkT = 0.001; if (this.driver === 'player') onPlayerVehicleSink(this); }
    }
  }
  updateBoat(dt, c) {
    const sp = this.spec; if (this.wreck) c = NOCTRL;
    let thr = c.throttle; if (this.fuel <= 0 && this.driver === 'player') thr = 0;
    const fx = Math.sin(this.h), fz = Math.cos(this.h);
    let vf = this.vx * fx + this.vz * fz, vr = this.vx * -fz + this.vz * fx;
    vf += (thr * sp.accel - c.brake * sp.accel * 0.6) * dt * (vf > sp.max ? 0 : 1) - vf * 0.25 * dt;
    vr *= Math.exp(-2.2 * dt);
    this.h += c.steer * sp.turn * dt * clamp(Math.abs(vf) / 6, 0.15, 1) * Math.sign(vf || 1);
    this.roll += (-c.steer * clamp(vf / sp.max, 0, 1) * 0.25 - this.roll) * dt * 3;
    this.pitch += ((thr * 0.08 * clamp(vf / sp.max, 0, 1) * (sp.ship ? 0 : 1)) - this.pitch) * dt * 2;
    const nfx = Math.sin(this.h), nfz = Math.cos(this.h);
    this.vx = nfx * vf + -nfz * vr; this.vz = nfz * vf + nfx * vr;
    const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    const bow = sp.ship ? sp.len * 0.45 : sp.len * 0.4;
    const okBow = inWater(nx + nfx * bow * Math.sign(vf || 1), nz + nfz * bow * Math.sign(vf || 1)) || nx > BX1 - 50;
    if (inWater(nx, nz) && okBow || nx > BX1 - 50) { this.x = nx; this.z = nz; }
    else { if (Math.hypot(this.vx, this.vz) > 6) this.impact(Math.hypot(this.vx, this.vz) * 0.6); this.vx *= -0.25; this.vz *= -0.25; }
    this.x = Math.min(this.x, BX1 + 1400);
    if (this.driver === 'player') this.fuel = Math.max(0, this.fuel - thr * 0.00008 * dt * 60);
    this.y = Math.sin(performance.now() / 700 + this.id) * (sp.ship ? 0.25 : 0.12);
    if (thr > 0.3 && Math.random() < 0.6 && !sp.ship) Fx.spray(this.x - nfx * sp.len * 0.5, 0.3, this.z - nfz * sp.len * 0.5);
  }
  updateHeli(dt, c) {
    if (this.wreck) { this.vy -= 18 * dt; this.y += this.vy * dt; this.h += 3 * dt; this.x += this.vx * dt; this.z += this.vz * dt; const g = groundHeightAt(this.x, this.z, this.y + 2); if (this.y <= g) { this.y = g; if (!this.blown) { this.blown = true; this.burnT = 0.01; } this.vx *= 0.5; this.vz *= 0.5; this.vy = 0; } return; }
    const on = c.active || this.driver === 'ai';
    this.rotor = clamp(this.rotor + (on ? 0.5 : -0.25) * dt, 0, 1);
    const lift = this.rotor >= 0.95;
    const fwd = c.pitch, yaw = c.yaw, side = c.roll, up = c.lift;
    this.pitch += (fwd * 0.32 - this.pitch) * dt * 2.5;
    this.roll += (side * 0.3 - this.roll) * dt * 2.5;
    this.h -= yaw * 1.3 * dt;
    const fx = Math.sin(this.h), fz = Math.cos(this.h);
    if (lift) {
      const ax = (fx * this.pitch + -fz * -this.roll) * 24, az = (fz * this.pitch + fx * -this.roll) * 24;
      this.vx += ax * dt; this.vz += az * dt;
      this.vy += ((up * 9) - this.vy) * dt * 1.8;
    } else this.vy -= 9.8 * dt;
    this.vx *= Math.exp(-0.45 * dt); this.vz *= Math.exp(-0.45 * dt);
    const sp = Math.hypot(this.vx, this.vz); if (sp > this.spec.max) { this.vx *= this.spec.max / sp; this.vz *= this.spec.max / sp; }
    this.airMove(dt, 2.2);
    if (this.driver === 'player') this.fuel = Math.max(0, this.fuel - 0.00004 * dt * 60);
    if (this.blades) this.blades.rotation.y += this.rotor * 40 * dt;
    if (this.tailRotor) this.tailRotor.rotation.x += this.rotor * 50 * dt;
  }
  updatePlane(dt, c) {
    const sp = this.spec;
    if (this.wreck) { this.vy -= 15 * dt; this.y += this.vy * dt; this.x += this.vx * dt; this.z += this.vz * dt; const g = groundHeightAt(this.x, this.z, this.y + 2); if (this.y <= g) { this.y = g; this.vx *= 0.3; this.vz *= 0.3; this.vy = 0; if (!this.blown) { this.blown = true; this.burnT = 0.01; } } return; }
    this.thr = clamp(this.thr + (c.lift > 0.2 ? 0.5 : c.lift < -0.2 ? -0.7 : 0) * dt, 0, 1);
    if (this.fuel <= 0 && this.driver === 'player') this.thr = 0;
    const g0 = groundHeightAt(this.x, this.z, this.y + 1), onG = this.y <= g0 + 0.05;
    let spd = Math.hypot(this.vx, this.vz, this.vy);
    const drag = this.gearDown ? 0.55 : 0.42;   // retracting the gear cleans up the airframe
    const acc = this.thr * (sp.max * 0.32) - spd * spd * (0.32 / sp.max) * drag - (onG ? (c.brake > 0.3 ? 12 : 0.8) : 0);
    spd = Math.max(0, spd + (acc - Math.sin(this.pitch) * 9.8) * dt);
    if (onG) {
      this.roll += (0 - this.roll) * dt * 5;
      if (spd > sp.rot && c.pitch < -0.1) this.pitch += -c.pitch * 0.5 * dt; else this.pitch += (0 - this.pitch) * dt * 4;
      this.h -= c.roll * 0.6 * dt * clamp(spd / 10, 0, 1) + c.yaw * 0.4 * dt;
    } else {
      this.roll = clamp(this.roll + c.roll * 1.6 * dt, -1.2, 1.2); if (Math.abs(c.roll) < 0.1) this.roll *= Math.exp(-(this.driver === 'player' ? 1.6 : 1.0) * dt);
      this.pitch = clamp(this.pitch - c.pitch * 1.0 * dt, -0.9, 0.9);
      // arcade assist: hands-off flight trims toward a gentle climb instead of drifting into the ground
      if (this.driver === 'player' && Math.abs(c.pitch) < 0.1 && spd > sp.stall) this.pitch += (0.03 - this.pitch) * dt * 0.5;
      const stall = spd < sp.stall;
      if (stall) this.pitch += (-0.5 - this.pitch) * dt * 0.8;
      this.h -= (Math.tan(this.roll) * 9.8 / Math.max(spd, 20)) * dt + c.yaw * 0.3 * dt;
      this.pitch -= Math.abs(Math.sin(this.roll)) * 0.06 * dt;
    }
    const fx = Math.sin(this.h) * Math.cos(this.pitch), fz = Math.cos(this.h) * Math.cos(this.pitch), fy = Math.sin(this.pitch);
    this.vx = fx * spd; this.vz = fz * spd; this.vy = fy * spd;
    if (!onG && spd < sp.stall) this.vy -= (sp.stall - spd) * 0.3;
    if (onG && this.vy < 0) this.vy = 0;
    this.airMove(dt, sp.len * 0.15);
    if (this.prop) this.prop.rotation.z += (0.3 + this.thr) * 60 * dt;
    if (this.driver === 'player') this.fuel = Math.max(0, this.fuel - this.thr * 0.00005 * dt * 60);
  }
  airMove(dt, clear) {
    const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt, ny = this.y + this.vy * dt;
    const g = groundHeightAt(nx, nz, this.y + clear);
    if (g > this.y + 1.5) { // wall of a building or flyover ahead
      const sp = Math.hypot(this.vx, this.vz, this.vy);
      if (sp > 9) return this.crashAir(sp); this.vx *= -0.3; this.vz *= -0.3; return;
    }
    this.x = clamp(nx, BX0 - 400, BX1 + 1400); this.z = clamp(nz, BZ0 - 400, BZ1 + 400);
    if (ny <= g) {
      const vy = this.vy, sp = Math.hypot(this.vx, this.vz);
      if (this.kind === 'plane' && !this.gearDown && sp > 4) {   // belly landing: scrape, sparks, damage
        this.damage(sp * 6 * dt * 60 / 60 + 4); if (Math.random() < 0.5) Fx.spark(this.x, this.y + 0.3, this.z);
        this.vx *= Math.exp(-1.5 * dt); this.vz *= Math.exp(-1.5 * dt);
        if (this.driver === 'player' && !this._bellyWarned) { this._bellyWarned = true; toast('Gear up! Belly landing'); }
      }
      if (vy < -7 || (this.kind === 'plane' && (Math.abs(this.roll) > 0.5 || this.pitch < -0.25) && sp > 15) || (this.kind === 'heli' && sp > 20)) return this.crashAir(Math.max(-vy, sp));
      this.y = g; this.vy = Math.max(0, this.vy);
      if (inWater(this.x, this.z) && g <= 0.05) { this.sinkT = 0.001; if (this.driver === 'player') onPlayerVehicleSink(this); }
      if (this.kind === 'heli') { this.vx *= Math.exp(-4 * dt); this.vz *= Math.exp(-4 * dt); this.pitch *= 0.9; this.roll *= 0.9; }
    } else this.y = ny;
    if (this.y > 600) { this.y = 600; this.vy = Math.min(0, this.vy); }
  }
  crashAir(v) {
    this.damage(v * 120);
    if (this.health <= 0 || v > 14) { this.health = 0; this.setWreck(); this.burnT = -1; explodeVehicle(this); }
    else { this.vx *= -0.2; this.vz *= -0.2; this.vy = 0; Sound.crash(1); }
  }
  impact(v) {
    if (v > 2.2) {
      this.damage(v * v * 1.4);
      if (this.driver === 'player' || dist2(this.x, this.z, camera.position.x, camera.position.z) < 900) { if (performance.now() - this.lastImpact > 180) Sound.crash(clamp(v / 12, 0.15, 1)); if (this.driver === 'player') rumble(clamp(v / 15, 0.2, 1), 0.6, 160); }
      this.lastImpact = performance.now();
      if (v > 6) for (let i = 0; i < 4; i++) Fx.spark(this.x, this.y + 0.6, this.z);
    }
  }
  damage(d, byPlayer = false) {
    if (this.wreck) return;
    if (byPlayer) this.lastHitByPlayer = true;
    this.health -= d;
    if (this.health <= 0 && this.burnT < 0) { this.health = 0; this.burnT = this.kind === 'car' ? 5 : 0.05; }
  }
  sync(dt) {
    const g = this.group;
    g.position.set(this.x, this.y, this.z);
    if (this.kind === 'car') {
      g.rotation.set(0, this.h, 0);
      const vr = this.vx * -Math.cos(this.h) + this.vz * Math.sin(this.h);
      g.rotation.z = clamp(vr * 0.012, -0.08, 0.08);
      if (this.spec.bike) g.rotation.z = clamp(-this.steerVis * this.fwdSpeed * 0.06, -0.55, 0.55);
      for (const w of this.wheels) w.rotation.x = this.wheelRot;
      for (const f of this.front) f.rotation.y = this.steerVis;
    } else {
      g.rotation.set(0, 0, 0); g.rotation.order = 'YXZ'; g.rotation.y = this.h; g.rotation.x = -this.pitch; g.rotation.z = this.roll;
    }
    this.tailMat.color.setHex(this.braking ? 0xff2a2a : (uNight.value > 0.3 ? 0xaa1a1a : 0x5a0f0f));
    if (this.model) {
      if (this.model.gear) this.model.gear.visible = this.gearDown;
      const lit = this.lightsOn || (uNight.value > 0.3 && !!this.driver);
      for (const m of this.model.head) m.emissiveIntensity = lit ? 6 : 0.4;
      for (const m of this.model.tail) m.emissiveIntensity = this.braking ? 6 : lit ? 2 : 0.5;
    }
    if (this.lbR) {
      const on = this.siren && (Math.floor(performance.now() / 140) % 2 === 0);
      this.lbR.color.setHex(this.siren ? (on ? 0xff2020 : 0x441111) : 0x551111);
      this.lbB.color.setHex(this.siren ? (!on ? 0x2a50ff : 0x111144) : 0x111155);
    }
    if (this.driverMesh) this.driverMesh.visible = !!this.driver || (this.agent && !this.parked) || (this.kind !== 'car' && this.driver === 'ai');
    const frac = this.health / this.spec.hp;
    if (!this.wreck && frac < 0.35 && g.visible) this.smokeT += dt * (frac < 0.15 ? 3 : 1);
    while (this.smokeT > 0.12) {
      this.smokeT -= 0.12;
      const fx = Math.sin(this.h), fz = Math.cos(this.h), o = this.kind === 'car' ? this.spec.len * 0.38 : 0;
      Fx.smoke(this.x + fx * o, this.y + 1.0, this.z + fz * o, frac < 0.15 ? 0.25 : 0.55);
    }
    if (this.burnT > 0) {
      this.burnT -= dt;
      if (Math.random() < 0.7) Fx.fire(this.x + (Math.random() - 0.5) * Math.min(4, this.spec.wid), this.y + 0.9, this.z + (Math.random() - 0.5) * Math.min(6, this.spec.len) * 0.6);
      if (this.burnT <= 0) explodeVehicle(this);
    }
  }
  setWreck() {
    this.wreck = true; this.burnT = -1; this.health = 0; this.siren = false;
    this.body.material = WRECK_MAT; if (this.glassMesh) this.glassMesh.material = WRECK_MAT;
    if (this.model) this.model.root.traverse(o => { if (o.isMesh) o.material = WRECK_MAT; });
    if (this.kind === 'car') { this.vx *= 0.3; this.vz *= 0.3; }
    if (this.driverMesh) this.driverMesh.visible = false;
  }
  remove() {
    scene.remove(this.group);
    const i = vehicles.indexOf(this); if (i >= 0) vehicles.splice(i, 1);
    this.dead = true;
  }
}
const WRECK_MAT = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1 });
const NOCTRL = { throttle: 0, brake: 0, steer: 0, handbrake: false, pitch: 0, roll: 0, yaw: 0, lift: 0, active: false };
// ground (or roof / deck) height under a point for aircraft
function groundHeightAt(x, z, y) {
  let g = 0;
  const bi = insideBuilding(x, z); if (bi >= 0) g = bPolys[bi].h;
  const s = surfaceAt(x, z, y); if (s.y > g && s.y <= y + 0.5) g = s.y;
  for (const v of vehicles) if (v.type === 'cargo' && Math.abs(v.x - x) < 30 && Math.abs(v.z - z) < 90) {
    const fx = Math.sin(v.h), fz = Math.cos(v.h), lx = (x - v.x) * fz - (z - v.z) * fx, lz = (x - v.x) * fx + (z - v.z) * fz;
    if (Math.abs(lx) < v.spec.wid / 2 && Math.abs(lz) < v.spec.len * 0.45 && y > 6) g = Math.max(g, lz < -v.spec.len * 0.3 ? 20 : 6.5 + 2.6 * 2);
  }
  return g;
}

// ---------- vehicle-vehicle collisions ----------
function vehicleCollisions() {
  const n = vehicles.length;
  for (let i = 0; i < n; i++) {
    const A = vehicles[i]; if (A.sinkT > 0 || A.kind === 'plane' && A.y > 3 || A.kind === 'heli' && A.y > 3) continue;
    const afx = Math.sin(A.h), afz = Math.cos(A.h);
    for (let j = i + 1; j < n; j++) {
      const B = vehicles[j]; if (B.sinkT > 0 || Math.abs(A.y - B.y) > 3) continue;
      const dx0 = B.x - A.x, dz0 = B.z - A.z; const rr = (A.spec.len + B.spec.len) * 0.6; if (dx0 * dx0 + dz0 * dz0 > rr * rr) continue;
      const bfx = Math.sin(B.h), bfz = Math.cos(B.h);
      for (const [oa, ra] of A.spec.circles) for (const [ob, rb_] of B.spec.circles) {
        const ax = A.x + afx * oa, az = A.z + afz * oa, bx_ = B.x + bfx * ob, bz = B.z + bfz * ob;
        const dx = bx_ - ax, dz = bz - az, d2 = dx * dx + dz * dz, R2 = ra + rb_;
        if (d2 > 0 && d2 < R2 * R2) {
          const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, pen = R2 - d;
          const ma = A.spec.mass, mb = B.spec.mass, tot = ma + mb;
          A.x -= nx * pen * mb / tot; A.z -= nz * pen * mb / tot; B.x += nx * pen * ma / tot; B.z += nz * pen * ma / tot;
          const rv = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
          if (rv < 0) {
            const jimp = -(1.3) * rv / (1 / ma + 1 / mb);
            A.vx -= jimp * nx / ma; A.vz -= jimp * nz / ma; B.vx += jimp * nx / mb; B.vz += jimp * nz / mb;
            const imp = -rv;
            if (imp > 2) { A.damage(imp * imp * 1.1 * mb / tot * 1.6, B.driver === 'player'); B.damage(imp * imp * 1.1 * ma / tot * 1.6, A.driver === 'player'); onVehicleHit(A, B, imp); }
            if (imp > 3 && dist2(A.x, A.z, camera.position.x, camera.position.z) < 1600) Sound.crash(clamp(imp / 14, 0.2, 1));
            A.h += (Math.random() - 0.5) * imp * 0.01 * mb / tot; B.h += (Math.random() - 0.5) * imp * 0.01 * ma / tot;
          }
        }
      }
    }
  }
}

// ---------- particles ----------
const Fx = (() => {
  const N = 1400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1)); geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, vertexColors: true,
    vertexShader: `attribute float size; attribute float alpha; varying vec3 vC; varying float vA; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size * (300.0 / -mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord-0.5; float r = length(d); if(r>0.5) discard; gl_FragColor = vec4(vC, vA*smoothstep(0.5,0.1,r)); }`
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  const P = []; for (let i = 0; i < N; i++) P.push({ life: 0 });
  let next = 0;
  function emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, grav = 0) { const p = P[next]; next = (next + 1) % N; Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, s0, s1, r, g, b, a, grav }); }
  // tracers
  const TN = 64, tGeo = new THREE.BufferGeometry(), tPos = new Float32Array(TN * 6), tCol = new Float32Array(TN * 6);
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const tLines = new THREE.LineSegments(tGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); tLines.frustumCulled = false; scene.add(tLines);
  const T = []; for (let i = 0; i < TN; i++) T.push({ life: 0 }); let tn = 0;
  return {
    smoke(x, y, z, shade = 0.5) { emit(x, y, z, (Math.random() - 0.5) * 0.6, 1.2 + Math.random(), (Math.random() - 0.5) * 0.6, 2.2, 0.8, 3.5, shade, shade, shade, 0.5); },
    tire(x, y, z) { emit(x, y, z, (Math.random() - 0.5), 0.6, (Math.random() - 0.5), 1.4, 0.6, 2.8, 0.85, 0.85, 0.83, 0.35); },
    fire(x, y, z) { emit(x, y, z, (Math.random() - 0.5) * 0.8, 2 + Math.random() * 2, (Math.random() - 0.5) * 0.8, 0.6, 1.2, 0.3, 1, 0.45 + Math.random() * 0.3, 0.1, 0.9); },
    spark(x, y, z) { emit(x, y, z, (Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8, 0.5, 0.25, 0.1, 1, 0.85, 0.4, 1, 18); },
    dust(x, y, z) { emit(x, y, z, (Math.random() - 0.5) * 2, 0.5, (Math.random() - 0.5) * 2, 0.9, 0.5, 1.6, 0.75, 0.68, 0.55, 0.4); },
    blood(x, y, z) { for (let i = 0; i < 6; i++) emit(x, y, z, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, 0.6, 0.18, 0.1, 0.55, 0.05, 0.05, 1, 9); },
    muzzle(x, y, z) { emit(x, y, z, 0, 0, 0, 0.05, 0.9, 0.4, 1, 0.85, 0.5, 1); },
    spray(x, y, z) { emit(x, y, z, (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, 0.8, 0.5, 1.6, 0.9, 0.95, 1, 0.5, 6); },
    splash(x, y, z) { for (let i = 0; i < 20; i++) emit(x, y, z, (Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6, 1.0, 0.6, 0.3, 0.8, 0.9, 1, 0.8, 14); },
    explode(x, y, z, big = 1) {
      for (let i = 0; i < 70 * big; i++) emit(x, y + 0.5, z, (Math.random() - 0.5) * 14 * big, Math.random() * 12 * big, (Math.random() - 0.5) * 14 * big, 0.9 + Math.random() * 0.5, 3.5 * big, 1, 1, 0.5 + Math.random() * 0.4, 0.1, 1, 6);
      for (let i = 0; i < 40 * big; i++) emit(x, y + 1, z, (Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5, 3.5, 2 * big, 8 * big, 0.15, 0.13, 0.12, 0.7);
    },
    confetti(x, y, z) { for (let i = 0; i < 40; i++) emit(x, y, z, (Math.random() - 0.5) * 5, 4 + Math.random() * 4, (Math.random() - 0.5) * 5, 1.6, 0.35, 0.3, Math.random(), Math.random(), Math.random(), 1, 9); },
    tracer(ax, ay, az, bx_, by, bz, col = [1, 0.85, 0.5]) { const t = T[tn]; tn = (tn + 1) % TN; Object.assign(t, { ax, ay, az, bx: bx_, by, bz, life: 0.07, col }); },
    update(dt) {
      for (let i = 0; i < N; i++) {
        const p = P[i];
        if (p.life > 0) {
          p.life -= dt; p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.grav && p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
          const t = 1 - p.life / p.max;
          pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
          col[i * 3] = p.r; col[i * 3 + 1] = p.g; col[i * 3 + 2] = p.b;
          size[i] = p.s0 + (p.s1 - p.s0) * t; alpha[i] = p.a * (1 - t);
        } else { alpha[i] = 0; size[i] = 0; }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.attributes.size.needsUpdate = true; geo.attributes.alpha.needsUpdate = true;
      for (let i = 0; i < TN; i++) {
        const t = T[i]; const o = i * 6;
        if (t.life > 0) { t.life -= dt; tPos.set([t.ax, t.ay, t.az, t.bx, t.by, t.bz], o); tCol.set([...t.col, t.col[0] * 0.3, t.col[1] * 0.3, t.col[2] * 0.3], o); }
        else { tPos.fill(0, o, o + 6); }
      }
      tGeo.attributes.position.needsUpdate = true; tGeo.attributes.color.needsUpdate = true;
    }
  };
})();
const flash = new THREE.PointLight(0xffa040, 0, 60, 1.6); scene.add(flash);

// ===================== TRAINS =====================
const TRAIN_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.45 });
let coachGeoCache = null;
function coachGeo(front) {
  if (!coachGeoCache) coachGeoCache = {};
  if (coachGeoCache[front]) return coachGeoCache[front];
  const L = 19.5, W = 3.0, P = [], Gl = [];
  P.push(rb(W, 2.6, L, 0.25, 0, 2.3, 0, 0xe6e2d6), bx(W + 0.02, 0.5, L * 0.99, 0, 1.3, 0, 0x2a4f9a), bx(W + 0.02, 0.18, L * 0.99, 0, 3.0, 0, 0xd8a420));
  P.push(bx(W * 0.9, 0.5, L * 0.9, 0, 0.75, 0, 0x2a2a2a));
  for (const z of [-L / 2 + 3, L / 2 - 3]) for (const s of [-1, 1]) P.push(cy2(0.45, 0.45, 0.2, s * 1.0, 0.45, z - 0.9, 0x222222, 'x'), cy2(0.45, 0.45, 0.2, s * 1.0, 0.45, z + 0.9, 0x222222, 'x'));
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) Gl.push(bx(0.04, 0.8, 1.6, s * (W / 2 + 0.01), 2.5, -L / 2 + 1.6 + i * 2.3, 0));
  for (const s of [-1, 1]) for (const z of [-L / 4, L / 4]) P.push(bx(0.05, 2.0, 1.3, s * (W / 2 + 0.015), 2.0, z, 0x8a8a86));
  if (front) { P.push(rb(W, 2.6, 1.6, 0.6, 0, 2.3, L / 2 + 0.5, 0x2a4f9a)); Gl.push(bx(W * 0.8, 0.9, 0.06, 0, 2.9, L / 2 + 1.31, 0)); P.push(bx(0.4, 0.15, 0.06, 0.8, 1.6, L / 2 + 1.32, 0xfff8d0), bx(0.4, 0.15, 0.06, -0.8, 1.6, L / 2 + 1.32, 0xfff8d0)); }
  coachGeoCache[front] = { body: mergeGeometries(P), glass: mergeGeometries(Gl), len: L + (front ? 0.6 : 0.6) };
  return coachGeoCache[front];
}
const trains = [], railLines = [];
class Train {
  constructor(line, s, dir, ncoach = 6) {
    this.line = line; this.s = s; this.dir = dir; this.speed = 0; this.n = ncoach; this.coaches = []; this.stopT = 0; this.nextStop = null; this.passenger = false;
    this.doors = []; this.doorOpen = 0;
    for (let i = 0; i < ncoach; i++) {
      const front = i === 0 || i === ncoach - 1, grp = new THREE.Group(), mdl = Assets.coach(front);
      if (mdl) { grp.add(mdl.root); this.doors.push(...mdl.doors); }
      else { const g = coachGeo(front); const b = new THREE.Mesh(g.body, TRAIN_MAT); b.castShadow = true; grp.add(b); grp.add(new THREE.Mesh(g.glass, GLASS)); }
      if (i === ncoach - 1) grp.children.forEach(m => m.rotation.y = Math.PI);
      scene.add(grp); this.coaches.push(grp);
    }
    this.clen = 20.2; this.length = this.clen * ncoach; trains.push(this); this.hornT = 5 + Math.random() * 20;
    this.pickNextStop();
  }
  pickNextStop() {
    const st = this.line.stops; this.nextStop = null;
    let best = 1e9;
    for (const s of st) { const d = (s - this.s) * this.dir; if (d > 25 && d < best) { best = d; this.nextStop = s; } }
  }
  update(dt) {
    const L = this.line, maxV = this.fast ? 40 : 22;
    if (this.stopT > 0) { this.stopT -= dt; this.speed = 0; if (this.stopT <= 0) this.pickNextStop(); }
    else {
      let target = maxV;
      const endS = this.dir > 0 ? L.len - this.length / 2 - 5 : this.length / 2 + 5;
      const toEnd = (endS - this.s) * this.dir;
      const toStop = this.nextStop !== null ? (this.nextStop - this.s) * this.dir : 1e9;
      const stopD = Math.min(toEnd, toStop);
      target = Math.min(target, Math.sqrt(Math.max(0, 2 * 0.9 * stopD)));
      this.speed += clamp(target - this.speed, -1.6 * dt, 0.7 * dt);
      if (stopD < 1.5 && this.speed < 0.6) {
        this.speed = 0;
        if (toEnd < 2) { this.dir = -this.dir; this.stopT = this.dwell = this.fast ? 8 : 18; } else this.stopT = this.dwell = this.fast ? 7 : 14;
        EventBus.emit('train:arrive', { train: this, s: this.s });
      }
    }
    this.s += this.speed * this.dir * dt;
    // sliding doors: open after the train settles at a stop, close a few seconds before it departs
    const wantOpen = this.stopT > 3 && this.stopT < (this.dwell || 14) - 1.5 ? 1 : 0;
    const prevOpen = this.doorOpen; this.doorOpen = clamp(this.doorOpen + (wantOpen ? 1 : -1) * dt * 0.9, 0, 1);
    if (prevOpen !== this.doorOpen) {
      for (const d of this.doors) { const sgn = /\d$/.test(d.name) && d.name.endsWith('0') ? -1 : 1; d.position.z = d.userData.z0 + sgn * this.doorOpen * 0.68; }
      if (prevOpen === 0 && this.doorOpen > 0) EventBus.emit('train:doors', { train: this, open: true });
      if (prevOpen > 0 && this.doorOpen === 0) EventBus.emit('train:doors', { train: this, open: false });
    }
    this.hornT -= dt; if (this.hornT < 0) { this.hornT = 20 + Math.random() * 30; if (dist2(this.x || 0, this.z || 0, camera.position.x, camera.position.z) < 300 * 300) Sound.trainHorn(0.06); }
    // place coaches
    for (let i = 0; i < this.n; i++) {
      const cs = this.s - this.dir * (i - (this.n - 1) / 2) * this.clen;
      const a = railPoint(L, cs - this.clen * 0.4), b = railPoint(L, cs + this.clen * 0.4);
      const c = this.coaches[i];
      c.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      c.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z) + (this.dir < 0 ? Math.PI : 0), 0);
      c.visible = dist2(c.position.x, c.position.z, camera.position.x, camera.position.z) < 1200 * 1200;
      if (i === 0) { this.x = c.position.x; this.z = c.position.z; this.y = c.position.y; this.h = c.rotation.y; }
    }
    // smash things on the tracks
    if (this.speed > 2) for (const c of this.coaches) {
      const cx = c.position.x, cz = c.position.z, fx = Math.sin(c.rotation.y), fz = Math.cos(c.rotation.y);
      for (const v of vehicles) {
        if (v.kind !== 'car' || Math.abs(v.y - c.position.y) > 2.5) continue;
        const dx = v.x - cx, dz = v.z - cz; if (dx * dx + dz * dz > 150) continue;
        const lz = dx * fx + dz * fz, lx = dx * fz - dz * fx;
        if (Math.abs(lz) < 10.5 && Math.abs(lx) < 1.5 + v.spec.wid / 2) {
          const side = Math.sign(lx) || 1; v.x += fz * side * 0.5; v.z -= fx * side * 0.5;
          v.vx = fx * this.speed * this.dir + fz * side * 8; v.vz = fz * this.speed * this.dir - fx * side * 8;
          v.damage(this.speed * 80, false); if (v.driver === 'player') { Sound.crash(1); rumble(1, 1, 300); }
        }
      }
      for (const w of peds) { const dx = w.x - cx, dz = w.z - cz; if (dx * dx + dz * dz < 100 && Math.abs(dx * fx + dz * fz) < 10 && Math.abs(dx * fz - dz * fx) < 1.8) w.knock(fz * 8, -fx * 8, 30); }
      if (!player.veh && !player.dead && !player.onTrain) { const dx = player.x - cx, dz = player.z - cz; if (dx * dx + dz * dz < 100 && Math.abs(dx * fx + dz * fz) < 10 && Math.abs(dx * fz - dz * fx) < 1.8 && Math.abs(player.y - c.position.y) < 2) { hurtPlayer(80); player.vx = fz * 10; player.vz = -fx * 10; player.downT = 2; } }
    }
  }
}
Train.prototype.remove = function () { for (const c of this.coaches) scene.remove(c); const i = trains.indexOf(this); if (i >= 0) trains.splice(i, 1); this.dead = true; };
const _rp = { x: 0, y: 0, z: 0 };
function railPoint(L, s, out = { x: 0, y: 0, z: 0 }) {
  s = clamp(s, 0, L.len); const cum = L.cum; let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const t = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  out.x = L.xs[lo] + (L.xs[hi] - L.xs[lo]) * t; out.z = L.zs[lo] + (L.zs[hi] - L.zs[lo]) * t; out.y = L.ys[lo] + (L.ys[hi] - L.ys[lo]) * t + 0.15;
  return out;
}
