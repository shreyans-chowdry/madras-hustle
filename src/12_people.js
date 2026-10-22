// ===================== PEOPLE: articulated humans with clothing, faces, LOD =====================
const SKIN = [0x8d5a3b, 0x6e4329, 0xa86f4c, 0x5c3a24, 0xb98060, 0x7b4a2e, 0xc68e66, 0x4e3020];
const SHIRT = [0xd23a2a, 0x2a6fd2, 0xf2c41f, 0x2e8b57, 0xf4f4f0, 0xe96fa0, 0xff8c1a, 0x7a3fb0, 0x1fa3a3, 0xf0e6cc, 0x334455, 0x9b2335, 0x22252a, 0x6d8fbf, 0xb5a07a];
const LOWER = [0x2b2f3a, 0x3d3a33, 0x1c2a44, 0x5b4a3a, 0x222222, 0x4a5a6a, 0xc8b89a, 0x3a4a2a];
const HAIR = [0x141210, 0x1d1712, 0x2a1d14, 0x0e0e0e];
const SHOE = [0x1a1714, 0x3a2a1c, 0xe8e8e8, 0x2a2a2a, 0x7a2a1a];
function randomLook() {
  const r = Math.random(), female = r < 0.45;
  const kind = female ? pick(['saree', 'saree', 'salwar', 'dress', 'shirt']) : pick(['shirt', 'shirt', 'tee', 'tee', 'suit', 'veshti']);
  const shirt = pick(SHIRT);
  return {
    skin: pick(SKIN), shirt, lower: kind === 'veshti' ? 0xf4f1e6 : kind === 'suit' ? pick([0x1c2230, 0x2a2a2a, 0x3a3a44]) : kind === 'saree' || kind === 'dress' ? pick(SHIRT) : pick(LOWER),
    kind, female, hair: Math.random() < 0.88 ? pick(HAIR) : 0x8a8a8a, shoe: pick(SHOE), h: female ? 0.9 + Math.random() * 0.08 : 0.95 + Math.random() * 0.1,
    long: kind === 'tee' ? false : true, accent: pick(SHIRT), build: 0.92 + Math.random() * 0.2,
  };
}
const PLAYER_LOOK = { skin: 0x7b4a2e, shirt: 0x1b2433, lower: 0x2f3e55, kind: 'jacket', female: false, hair: 0x141210, shoe: 0x222222, h: 1.0, long: true, accent: 0xc9a24e, build: 1.05 };
const COP_LOOK = { skin: 0x6e4329, shirt: 0xc9b37a, lower: 0xc9b37a, kind: 'cop', female: false, hair: 0x141210, shoe: 0x1a1a1a, h: 1.02, long: false, accent: 0x8a6d3b, build: 1.05 };
const SWAT_LOOK = { skin: 0x5c3a24, shirt: 0x1d2128, lower: 0x1d2128, kind: 'swat', female: false, hair: 0x111111, shoe: 0x111111, h: 1.04, long: true, accent: 0x2b3038, build: 1.15 };

function capsule(r, len, x, y, z, hex, seg = 7) { const g = new THREE.CapsuleGeometry(r, len, 3, seg); g.translate(x, y, z); return colGeo(g, hex); }
function sphere(r, x, y, z, hex, sx = 1, sy = 1, sz = 1, ws = 10, hs = 8) { const g = new THREE.SphereGeometry(r, ws, hs); g.scale(sx, sy, sz); g.translate(x, y, z); return colGeo(g, hex); }
function cyl(rt, rb, h, x, y, z, hex, sz = 1, seg = 10) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.scale(1, 1, sz); g.translate(x, y, z); return colGeo(g, hex); }
function rbox(w, h, d, r, x, y, z, hex) { return rb(w, h, d, r, x, y, z, hex); }

const personCache = new Map();
// Builds part geometries in local frames:
//  torso: origin at hips joint (pelvis centre); head included
//  uarm: origin at shoulder, hangs down -y; farm: origin at elbow; thigh: origin at hip; shin: origin at knee
function personGeos(look) {
  const key = JSON.stringify(look);
  if (personCache.has(key)) return personCache.get(key);
  const k = look.kind, sk = look.skin, sh = look.shirt, lo = look.lower, b = look.build || 1;
  const skirt = k === 'saree' || k === 'dress' || k === 'veshti';
  const T = [];
  // pelvis + belly
  T.push(rbox(0.34 * b, 0.2, 0.21 * b, 0.07, 0, 0, 0, skirt ? lo : lo));
  // chest (tapered, flattened)
  const chestCol = k === 'cop' ? 0xc9b37a : sh;
  T.push(cyl(0.2 * b, 0.165 * b, 0.5, 0, 0.32, 0, chestCol, 0.62, 14));
  T.push(sphere(0.2 * b, 0, 0.56, 0, chestCol, 1, 0.42, 0.62, 14, 8));  // shoulders
  if (look.female) T.push(sphere(0.12, 0, 0.42, 0.06, chestCol, 1.45, 0.75, 0.75));
  if (k === 'jacket') { T.push(rbox(0.04, 0.42, 0.02, 0.01, 0, 0.32, 0.125, 0xe8e2d4)); T.push(rbox(0.43 * b, 0.06, 0.27, 0.02, 0, 0.08, 0, 0x1a1a1a)); }
  if (k === 'suit') { T.push(rbox(0.06, 0.4, 0.02, 0.01, 0, 0.34, 0.125, 0xf2f2f2)); T.push(rbox(0.025, 0.3, 0.02, 0.01, 0, 0.32, 0.135, look.accent)); }
  if (k === 'cop') { T.push(rbox(0.42 * b, 0.07, 0.27, 0.02, 0, 0.08, 0, 0x3a2a1a)); T.push(rbox(0.06, 0.05, 0.02, 0.01, -0.08, 0.45, 0.125, 0xd4a72c)); }
  if (k === 'swat') { T.push(rbox(0.44 * b, 0.42, 0.3, 0.06, 0, 0.32, 0, 0x2b3038)); }
  if (k === 'saree') { T.push(rbox(0.12, 0.62, 0.24, 0.04, 0.05, 0.36, 0.0, lo)); }  // pallu draped over shoulder
  // skirt / saree / veshti
  if (skirt) T.push(cyl(k === 'veshti' ? 0.2 : 0.19, k === 'veshti' ? 0.24 : 0.28, 0.86, 0, -0.45, 0, lo, 0.8, 14));
  if (k === 'saree') T.push(cyl(0.2, 0.2, 0.08, 0, -0.04, 0, look.accent, 0.8, 14));
  // neck + head
  T.push(cyl(0.055, 0.06, 0.12, 0, 0.68, 0, sk));
  const hy = 0.84;
  T.push(sphere(0.112, 0, hy, 0, sk, 0.92, 1.12, 1.0, 14, 12));
  T.push(sphere(0.022, 0.112 * 0.95, hy, -0.005, sk, 0.6, 1.2, 1)); T.push(sphere(0.022, -0.112 * 0.95, hy, -0.005, sk, 0.6, 1.2, 1)); // ears
  T.push(sphere(0.016, 0.042, hy + 0.02, 0.098, 0xf6f2ea)); T.push(sphere(0.016, -0.042, hy + 0.02, 0.098, 0xf6f2ea)); // eye whites
  T.push(sphere(0.009, 0.042, hy + 0.02, 0.112, 0x1a120c)); T.push(sphere(0.009, -0.042, hy + 0.02, 0.112, 0x1a120c)); // pupils
  T.push(rbox(0.035, 0.012, 0.01, 0.004, 0.042, hy + 0.05, 0.104, look.hair)); T.push(rbox(0.035, 0.012, 0.01, 0.004, -0.042, hy + 0.05, 0.104, look.hair)); // brows
  T.push(rbox(0.026, 0.045, 0.03, 0.012, 0, hy - 0.01, 0.112, new THREE.Color(sk).multiplyScalar(0.92).getHex())); // nose
  T.push(rbox(0.05, 0.01, 0.01, 0.004, 0, hy - 0.06, 0.103, 0x5a2a22)); // mouth
  if (k === 'cop') { T.push(cyl(0.125, 0.125, 0.07, 0, hy + 0.1, 0, 0xc9b37a, 1, 14)); T.push(rbox(0.2, 0.02, 0.1, 0.01, 0, hy + 0.07, 0.09, 0x2a2a1a)); }
  else if (k === 'swat') { T.push(sphere(0.135, 0, hy + 0.04, -0.005, 0x1d2128, 1, 0.95, 1.05, 14, 10)); T.push(rbox(0.2, 0.05, 0.03, 0.01, 0, hy + 0.02, 0.11, 0x0c0c10)); }
  else {
    const capT = new THREE.SphereGeometry(0.119, 14, 8, 0, TAU, 0, Math.PI * 0.4); capT.scale(0.94, 1.14, 1.03); capT.translate(0, hy + 0.004, -0.004); T.push(colGeo(capT, look.hair));
    const capB = new THREE.SphereGeometry(0.118, 14, 10, Math.PI, Math.PI, 0, Math.PI * (look.female ? 0.78 : 0.62)); capB.scale(0.95, 1.13, 1.03); capB.translate(0, hy, -0.006); T.push(colGeo(capB, look.hair));
    if (look.female) { T.push(rbox(0.2, 0.3, 0.06, 0.03, 0, hy - 0.12, -0.085, look.hair)); T.push(sphere(0.05, 0, hy - 0.01, -0.13, look.hair)); }
  }
  if (!look.female && Math.abs(look.hair - 0x8a8a8a) < 1) T.push(rbox(0.12, 0.05, 0.03, 0.02, 0, hy - 0.08, 0.09, 0x8a8a8a));
  const sleeve = k === 'tee' || k === 'cop' ? false : true;
  const armTop = k === 'saree' ? sk : chestCol, armLow = sleeve && !look.female ? chestCol : (k === 'salwar' ? chestCol : sk);
  const uarm = [capsule(0.054 * b, 0.22, 0, -0.15, 0, armTop)];
  const farm = [capsule(0.047, 0.2, 0, -0.13, 0, armLow), sphere(0.052, 0, -0.29, 0.005, sk, 0.8, 1.15, 0.65)];
  if (k === 'swat') uarm.push(capsule(0.065, 0.12, 0, -0.06, 0, 0x2b3038));
  const legC = skirt ? sk : lo;
  const thigh = [capsule(0.075 * b, 0.34, 0, -0.22, 0, skirt ? (k === 'veshti' ? sk : sk) : legC)];
  const shin = [capsule(0.062, 0.34, 0, -0.2, 0, skirt ? sk : (k === 'tee' && look.lower === 0xc8b89a ? sk : legC)), rbox(0.1, 0.07, 0.24, 0.03, 0, -0.43, 0.05, look.shoe)];
  const res = { torso: mergeGeometries(T), uarm: mergeGeometries(uarm), farm: mergeGeometries(farm), thigh: mergeGeometries(thigh), shin: mergeGeometries(shin), skirt };
  // low-detail full body for distance
  const pose = (g, x, y, z) => { const c = g.clone(); c.translate(x, y, z); return c; };
  res.full = mergeGeometries([pose(res.torso, 0, 0.95, 0), pose(res.uarm, 0.22, 1.51, 0), pose(res.uarm, -0.22, 1.51, 0), pose(res.farm, 0.22, 1.2, 0), pose(res.farm, -0.22, 1.2, 0),
  pose(res.thigh, 0.1, 0.92, 0), pose(res.thigh, -0.1, 0.92, 0), pose(res.shin, 0.1, 0.48, 0), pose(res.shin, -0.1, 0.48, 0)]);
  const th = res.thigh.clone(); th.rotateX(-1.45); const sn = res.shin.clone(); sn.rotateX(0.05);
  const ua = res.uarm.clone(); ua.rotateX(-0.9); const fa = res.farm.clone(); fa.rotateX(-1.3);
  res.seated = mergeGeometries([pose(res.torso, 0, 0.5, 0), pose(ua, 0.22, 1.06, 0), pose(ua, -0.22, 1.06, 0), pose(fa, 0.22, 0.86, 0.2), pose(fa, -0.22, 0.86, 0.2),
  pose(th, 0.1, 0.47, 0), pose(th, -0.1, 0.47, 0), pose(sn, 0.1, 0.47, 0.42), pose(sn, -0.1, 0.47, 0.42)]);
  personCache.set(key, res); return res;
}
function seatedMesh(look) { const m = new THREE.Mesh(personGeos(look).seated, PERSON_MAT); m.scale.setScalar(look.h || 1); return m; }
const PERSON_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
function makePerson(look) {
  const g = personGeos(look);
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const hips = new THREE.Group(); hips.position.y = 0.95; inner.add(hips);
  const torsoPivot = new THREE.Group(); hips.add(torsoPivot);
  const torso = new THREE.Mesh(g.torso, PERSON_MAT); torso.castShadow = true; torsoPivot.add(torso);
  const mk = (geo, parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); const m = new THREE.Mesh(geo, PERSON_MAT); m.castShadow = true; p.add(m); return p; };
  const arms = [], elbows = [], legs = [], knees = [];
  for (const s of [-1, 1]) {
    const sh = mk(g.uarm, torsoPivot, s * 0.22 * (look.build || 1), 0.56, 0); sh.rotation.z = s * 0.06; arms.push(sh);
    elbows.push(mk(g.farm, sh, 0, -0.31, 0));
    const hp = mk(g.thigh, hips, s * 0.1, -0.03, 0); legs.push(hp);
    knees.push(mk(g.shin, hp, 0, -0.44, 0));
  }
  const far = new THREE.Mesh(g.full, PERSON_MAT); far.visible = false; root.add(far);
  inner.scale.setScalar(look.h || 1); far.scale.setScalar(look.h || 1);
  const handR = new THREE.Group(); handR.position.set(0, -0.3, 0.03); elbows[1].add(handR);
  return { root, inner, hips, torso: torsoPivot, legs, knees, arms, elbows, far, handR, look, phase: Math.random() * TAU, skirt: g.skirt, lod: 0, aim: 0 };
}
function setPersonLOD(p, d) {
  const want = d > 55 ? 1 : 0; if (want === p.lod) return;
  p.lod = want; p.inner.visible = !want; p.far.visible = !!want;
}
// mode: 'move' | 'sit' | 'down' ; speed m/s
function animatePerson(p, speed, dt, mode = 'move') {
  if (p.lod) return;
  const L = p.legs, K = p.knees, A = p.arms, E = p.elbows;
  if (mode === 'sit') {
    for (let i = 0; i < 2; i++) { L[i].rotation.x = -1.45; K[i].rotation.x = 1.5; A[i].rotation.x = -1.0; E[i].rotation.x = -0.5; A[i].rotation.z = (i ? 1 : -1) * 0.12; }
    p.hips.position.y = 0.95; p.torso.rotation.x = 0; return;
  }
  const run = clamp((speed - 3) / 3, 0, 1), amp = Math.min(1, speed / 2.2) * lerp(0.55, 0.95, run);
  p.phase += dt * (speed > 0.1 ? 2.2 + speed * 1.9 : 1.4);
  const s = Math.sin(p.phase), c = Math.cos(p.phase);
  if (amp < 0.02) { // idle breathing
    const br = Math.sin(p.phase * 0.7) * 0.015;
    for (let i = 0; i < 2; i++) { L[i].rotation.x *= 0.8; K[i].rotation.x *= 0.8; A[i].rotation.x = br; E[i].rotation.x = -0.12; }
    p.torso.rotation.x = br * 0.5; p.hips.position.y = 0.95;
  } else {
    for (let i = 0; i < 2; i++) {
      const ph = i ? -s : s, pc = i ? -c : c;
      L[i].rotation.x = ph * amp * (p.skirt ? 0.55 : 1);
      K[i].rotation.x = Math.max(0, -pc) * amp * 1.4 + 0.05;
      A[i].rotation.x = -ph * amp * 0.85; E[i].rotation.x = -0.25 - run * 1.0 - Math.max(0, ph) * 0.3;
    }
    p.torso.rotation.x = run * 0.22; p.hips.position.y = 0.95 + Math.abs(c) * 0.045 * amp - run * 0.04;
  }
  // aiming overrides right arm
  if (p.aim > 0) { A[1].rotation.x = lerp(A[1].rotation.x, -1.5, p.aim); E[1].rotation.x = lerp(E[1].rotation.x, 0, p.aim); A[0].rotation.x = lerp(A[0].rotation.x, -1.25, p.aim * 0.8); E[0].rotation.x = lerp(E[0].rotation.x, -0.6, p.aim * 0.8); A[0].rotation.y = 0.5 * p.aim; }
  else A[0].rotation.y = 0;
}
function setSitting(p) { animatePerson(p, 0, 0, 'sit'); }

// ---------- weapon models ----------
const GUN_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.4 });
const gunGeoCache = {};
function gunGeo(kind) {
  if (gunGeoCache[kind]) return gunGeoCache[kind];
  const d = 0x202226, m = 0x3a3d42, w = 0x5a3a22, P = [];
  if (kind === 'pistol') P.push(bx(0.035, 0.05, 0.2, 0, 0.02, 0.09, d), bx(0.03, 0.1, 0.045, 0, -0.04, 0.02, m));
  else if (kind === 'smg') P.push(bx(0.045, 0.07, 0.36, 0, 0.02, 0.14, d), bx(0.035, 0.14, 0.05, 0, -0.06, 0.12, m), bx(0.03, 0.08, 0.05, 0, -0.03, 0.0, m));
  else if (kind === 'shotgun') P.push(cyl(0.022, 0.022, 0.7, 0, 0.03, 0.3, d), bx(0.05, 0.08, 0.3, 0, 0.0, -0.06, w), bx(0.045, 0.05, 0.25, 0, -0.02, 0.32, w));
  else if (kind === 'rifle' || kind === 'sniper') P.push(bx(0.05, 0.08, 0.7, 0, 0.02, 0.24, d), bx(0.04, 0.16, 0.05, 0, -0.08, 0.2, m), bx(0.05, 0.1, 0.22, 0, -0.01, -0.1, kind === 'sniper' ? w : d), cyl(0.03, 0.03, 0.22, 0, 0.09, 0.2, d));
  else if (kind === 'rpg') P.push(cyl(0.06, 0.06, 1.1, 0, 0.04, 0.2, 0x3a4a2a), cyl(0.09, 0.02, 0.22, 0, 0.04, 0.82, 0x2a2a2a), bx(0.03, 0.12, 0.05, 0, -0.06, 0.1, m));
  else if (kind === 'minigun') P.push(cyl(0.09, 0.09, 0.8, 0, 0.0, 0.3, d), bx(0.12, 0.14, 0.25, 0, 0, -0.05, m));
  const g = mergeGeometries(P.map(x => { x.rotateX(0); return x; }));
  // geometry built along +z then laid along the arm (arm points -y in local hand frame)
  g.rotateX(-Math.PI / 2);
  gunGeoCache[kind] = g; return g;
}
