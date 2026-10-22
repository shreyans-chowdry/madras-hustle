// ===================== CITY BUILDER =====================
const tick = () => new Promise(r => setTimeout(r, 0));
const WALL_PAL = {
  res: [0xf2e6c8, 0xeeeae2, 0xf3dc92, 0xedc0a8, 0xc4dbe4, 0xcde3c6, 0xdccfe4, 0xefd6aa, 0xdedad0, 0xf6eedc, 0xd6c4ac, 0xf7f4ee, 0xe8dcff, 0xc0e0d0, 0xf0c8c0],
  comm: [0xe2dfd8, 0xd2d6da, 0xeae6dc, 0xc8d0d6, 0xe0d8c8, 0xf0ece2, 0xd8d0be, 0xccd2c8],
  house: [0xf4d878, 0xedb29a, 0xc6e6d6, 0xf6eacc, 0xdfcaea, 0xecc894, 0xb4d8ec, 0xf6c0cc],
};
const STYLE_COL = { fort: 0xf0ebe0, saracenic: 0xffffff, saracenic_w: 0xffffff, modern: 0xd8dee2, tower: 0xe0dace, stadium: 0xdcd8ce };
const G = { nodes: [], edges: [], places: [], pois: [] };
let decor = new GeoBuf(true);
let billBuf = new GeoBuf(false, false, true);
const _col = new THREE.Color();
const greensExtra = [];

function boxTo(buf, cx, cy, cz, sx, sy, sz, rot, col) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
  const faces = [[4, 5, 6, 7, 0, 0, 1], [1, 0, 3, 2, 0, 0, -1], [5, 1, 2, 6, 1, 0, 0], [0, 4, 7, 3, -1, 0, 0], [7, 6, 2, 3, 0, 1, 0], [0, 1, 5, 4, 0, -1, 0]];
  for (const f of faces) {
    const nx = f[4], ny = f[5], nz = f[6]; const rx = nx * c + nz * s, rz = -nx * s + nz * c;
    buf.tri(v[f[0]], v[f[1]], v[f[2]], rx, ny, rz, col); buf.tri(v[f[0]], v[f[2]], v[f[3]], rx, ny, rz, col);
  }
}
function cylTo(buf, cx, cy, cz, rt, rb, h, seg, col, cap = true) {
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
    const b0 = [cx + Math.sin(a0) * rb, cy, cz + Math.cos(a0) * rb], b1 = [cx + Math.sin(a1) * rb, cy, cz + Math.cos(a1) * rb];
    const t0 = [cx + Math.sin(a0) * rt, cy + h, cz + Math.cos(a0) * rt], t1 = [cx + Math.sin(a1) * rt, cy + h, cz + Math.cos(a1) * rt];
    const am = (a0 + a1) / 2, nx = Math.sin(am), nz = Math.cos(am);
    buf.tri(b0, b1, t1, nx, 0.2, nz, col); buf.tri(b0, t1, t0, nx, 0.2, nz, col);
    if (cap && rt > 0.01) buf.tri([cx, cy + h, cz], t0, t1, 0, 1, 0, col);
  }
}
function domeTo(buf, cx, cy, cz, r, col, rings = 4, seg = 10) {
  for (let j = 0; j < rings; j++) {
    const p0 = j / rings * Math.PI / 2, p1 = (j + 1) / rings * Math.PI / 2;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      const P = (p, a) => [cx + Math.cos(p) * Math.sin(a) * r, cy + Math.sin(p) * r * 1.15, cz + Math.cos(p) * Math.cos(a) * r];
      const n = [Math.cos((p0 + p1) / 2) * Math.sin((a0 + a1) / 2), Math.sin((p0 + p1) / 2), Math.cos((p0 + p1) / 2) * Math.cos((a0 + a1) / 2)];
      buf.tri(P(p0, a0), P(p0, a1), P(p1, a1), n[0], n[1], n[2], col); buf.tri(P(p0, a0), P(p1, a1), P(p1, a0), n[0], n[1], n[2], col);
    }
  }
}
function ribbon(buf, xs, zs, ys, hwL, hwR, yoff, uv = 0) {
  const n = xs.length; if (n < 2) return null;
  const L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    let dx, dz, sc = 1;
    const pdx = i > 0 ? xs[i] - xs[i - 1] : 0, pdz = i > 0 ? zs[i] - zs[i - 1] : 0, pl = Math.hypot(pdx, pdz);
    const ndx = i < n - 1 ? xs[i + 1] - xs[i] : 0, ndz = i < n - 1 ? zs[i + 1] - zs[i] : 0, nl = Math.hypot(ndx, ndz);
    if (pl < 1e-4 && nl < 1e-4) { dx = 1; dz = 0; }
    else if (pl < 1e-4) { dx = ndx / nl; dz = ndz / nl; }
    else if (nl < 1e-4) { dx = pdx / pl; dz = pdz / pl; }
    else { const ax = pdx / pl + ndx / nl, az = pdz / pl + ndz / nl, al = Math.hypot(ax, az) || 1; dx = ax / al; dz = az / al; sc = 1 / Math.max(0.4, dx * pdx / pl + dz * pdz / pl); }
    const lx = dz * sc, lz = -dx * sc, y = (ys ? ys[i] : 0) + yoff;
    L.push([xs[i] + lx * hwL, y, zs[i] + lz * hwL]); Rr.push([xs[i] - lx * hwR, y, zs[i] - lz * hwR]);
  }
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(xs[i + 1] - xs[i]) + Math.abs(zs[i + 1] - zs[i]) < 1e-4) continue;
    buf.tri(L[i], Rr[i], Rr[i + 1], 0, 1, 0, _col, null, null, null, uv);
    buf.tri(L[i], Rr[i + 1], L[i + 1], 0, 1, 0, _col, null, null, null, uv);
  }
  return { L, R: Rr };
}
function vwall(buf, edgePts, h0, h1) {
  for (let i = 0; i < edgePts.length - 1; i++) {
    const a = edgePts[i], b = edgePts[i + 1];
    const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1;
    buf.tri([a[0], a[1] + h0, a[2]], [b[0], b[1] + h0, b[2]], [b[0], b[1] + h1, b[2]], dz / l, 0, -dx / l, _col);
    buf.tri([a[0], a[1] + h0, a[2]], [b[0], b[1] + h1, b[2]], [a[0], a[1] + h1, a[2]], dz / l, 0, -dx / l, _col);
  }
}
function disc(buf, cx, cz, y, r, seg = 16) {
  for (let k = 0; k < seg; k++) {
    const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU;
    buf.tri([cx, y, cz], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], 0, 1, 0, _col, null, null, null, 0.12);
  }
}
function shapeOf(d) {
  const pts = toPts(d.p); if (pts.length < 3) return null;
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
  if (d.hl) for (const h of d.hl) { const hp = toPts(h); if (hp.length >= 3) s.holes.push(new THREE.Path(hp.map(p => new THREE.Vector2(p[0], -p[1])))); }
  return s;
}
function areaMesh(list, mat, y, extra = []) {
  const shapes = list.map(shapeOf).filter(Boolean).concat(extra);
  if (!shapes.length) return null;
  const meshes = [];
  for (let i = 0; i < shapes.length; i += 120) {
    const g = new THREE.ShapeGeometry(shapes.slice(i, i + 120)); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); meshes.push(m);
  }
  return meshes;
}
// sub-polyline of an edge between distances s0..s1 (from node a)
function subPoly(E, s0, s1) {
  const xs = [], zs = [], tmp = {};
  edgePoint(E, s0, 1, tmp); xs.push(tmp.x); zs.push(tmp.z);
  for (let k = 1; k < E.xs.length - 1; k++) if (E.cum[k] > s0 && E.cum[k] < s1) { xs.push(E.xs[k]); zs.push(E.zs[k]); }
  edgePoint(E, s1, 1, tmp); xs.push(tmp.x); zs.push(tmp.z);
  return [xs, zs];
}
function pickStyle(b, kind, seed, h) {
  if (b.home) return 1;
  if (b.s === 'saracenic') return 12; if (b.s === 'saracenic_w' || b.s === 'fort') return 13; if (b.s === 'stadium') return 15;
  if (b.s === 'modern') return seed < 0.5 ? 7 : 4; if (b.s === 'tower') return 6;
  if (b.tm) return 14;
  if (kind === 2) return seed < 0.7 ? 3 : 0;
  if (kind === 1) return h > 14 ? [4, 5, 6, 7, 6][Math.floor(seed * 5)] : [0, 2, 5, 6][Math.floor(seed * 4)];
  if (h > 20) return [1, 1, 0, 2, 6][Math.floor(seed * 5)];
  return [0, 0, 1, 2, 3][Math.floor(seed * 5)];
}

// ---------- world data ----------
function undelta(p, enc) { if (!enc) return p; const o = p.slice(); for (let i = 2; i < o.length; i++) o[i] += o[i - 2]; return o; }
const BLD = [];          // processed buildings
const CH = 300, chunks = new Map();
const ckey = (ix, iz) => ix * 10000 + iz;
function chunkAt(x, z, make = true) {
  const ix = Math.floor(x / CH), iz = Math.floor(z / CH), k = ckey(ix, iz);
  let c = chunks.get(k);
  if (!c && make) { c = { ix, iz, cx: (ix + 0.5) * CH, cz: (iz + 0.5) * CH, edges: [], nodes: [], bld: [], trees: [], lights: [], walks: [], state: 0, far: [], near: [] }; chunks.set(k, c); }
  return c;
}
let nodeHW, nodeY, nodeMaxC, nodeDeg;
const tallTowers = [];   // rooftop-access buildings
const RY = 0.1, SY = 0.24;

// metres of drivable road centre-line that lie inside a building footprint (decks above the roof don't count)
function roadInside(pts, minx, minz, maxx, maxz, top) {
  let inside = 0; const seen = new Set();
  const ix0 = Math.floor(minx / RC), ix1 = Math.floor(maxx / RC), iz0 = Math.floor(minz / RC), iz1 = Math.floor(maxz / RC);
  for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
    const a = roadGrid.get(gkey(ix, iz)); if (!a) continue;
    for (const s of a) {
      if (seen.has(s)) continue; seen.add(s);
      if (s.elev && Math.min(s.ha, s.hb) >= top - 0.5) continue;
      if (Math.max(s.ax, s.bx) < minx || Math.min(s.ax, s.bx) > maxx || Math.max(s.az, s.bz) < minz || Math.min(s.az, s.bz) > maxz) continue;
      const L = Math.hypot(s.bx - s.ax, s.bz - s.az), n = Math.max(1, Math.ceil(L / 1.5));
      for (let j = 0; j < n; j++) { const t = (j + 0.5) / n, x = s.ax + (s.bx - s.ax) * t, z = s.az + (s.bz - s.az) * t; if (x < minx || x > maxx || z < minz || z > maxz) continue; if (pointInPoly(x, z, pts)) inside += L / n; }
    }
  }
  return inside;
}
async function initWorld(progress) {
  WorldFix.apply(WD);
  const enc = WD.meta.delta;
  // ---- graph ----
  for (const n of WD.nodes) G.nodes.push({ x: n[0] / 10, z: n[1] / 10, y: n[2] / 10, out: [], adj: [], edges: [] });
  WD.edges.forEach((e, i) => {
    const pp = undelta(e.p, enc);
    const n = pp.length / 2, xs = new Float32Array(n), zs = new Float32Array(n), ys = new Float32Array(n), cum = new Float32Array(n);
    for (let k = 0; k < n; k++) { xs[k] = pp[k * 2] / 10; zs[k] = pp[k * 2 + 1] / 10; ys[k] = e.h ? e.h[k] / 10 : 0; if (k) cum[k] = cum[k - 1] + Math.hypot(xs[k] - xs[k - 1], zs[k] - zs[k - 1]); }
    const E = { i, a: e.a, b: e.b, xs, zs, ys, cum, len: Math.max(cum[n - 1], 0.01), hw: e.w / 20, c: e.c, o: e.o, name: e.n >= 0 ? WD.names[e.n] : '', t: !!e.t, elev: !!e.h, br: !!e.br };
    G.edges.push(E);
    const A = G.nodes[e.a], B = G.nodes[e.b];
    A.edges.push(i); B.edges.push(i);
    if (E.t) {
      if (e.o === 0 || e.o === 1) A.out.push({ e: i, dir: 1 });
      if (e.o === 0 || e.o === -1) B.out.push({ e: i, dir: -1 });
      A.adj.push({ n: e.b, e: i, w: E.len }); B.adj.push({ n: e.a, e: i, w: E.len });
    }
    for (let k = 0; k < n - 1; k++) {
      const s = { ax: xs[k], az: zs[k], bx: xs[k + 1], bz: zs[k + 1], hw: E.hw, e: E, ha: ys[k], hb: ys[k + 1], elev: E.elev };
      gridAdd(roadGrid, RC, Math.min(s.ax, s.bx) - s.hw, Math.min(s.az, s.bz) - s.hw, Math.max(s.ax, s.bx) + s.hw, Math.max(s.az, s.bz) + s.hw, s);
      rsegs.push(s);
    }
    const mk = Math.floor(n / 2); chunkAt(xs[mk], zs[mk]).edges.push(i);
  });
  nodeHW = new Float32Array(G.nodes.length); nodeY = new Float32Array(G.nodes.length); nodeMaxC = new Uint8Array(G.nodes.length).fill(9); nodeDeg = new Uint8Array(G.nodes.length);
  for (const E of G.edges) for (const [ni, k] of [[E.a, 0], [E.b, E.xs.length - 1]]) { if (E.hw > nodeHW[ni]) nodeHW[ni] = E.hw; nodeY[ni] = E.ys[k]; nodeMaxC[ni] = Math.min(nodeMaxC[ni], E.c); nodeDeg[ni]++; }
  G.nodes.forEach((n, i) => { if (nodeHW[i] > 0) chunkAt(n.x, n.z).nodes.push(i); });
  G.places = WD.places.map(p => ({ n: p.n, x: p.x / 10, z: p.z / 10, s: p.s }));
  G.pois = WD.pois.map(p => ({ t: p.t, n: p.n, x: p.x / 10, z: p.z / 10, a: p.a }));
  G.shops = (WD.shops || []).map(p => ({ t: p.t, n: p.n, x: p.x / 10, z: p.z / 10 }));
  WD.walks.forEach((w, i) => { const p = undelta(w.p, enc); w.p = p; chunkAt(p[0] / 10, p[1] / 10).walks.push(i); });
  progress(0.12, 'Paving 60,000 streets…'); await tick();

  // ---- ground + sea ----
  const gw = BX1 - BX0 + 3000, gh = BZ1 - BZ0 + 3000;
  const gg = new THREE.PlaneGeometry(gw, gh, 1, 1); gg.rotateX(-Math.PI / 2);
  const uvA = gg.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * gw / 22, uvA.getY(i) * gh / 22);
  const ground = new THREE.Mesh(gg, M.ground); ground.position.set((BX0 + BX1) / 2, 0, (BZ0 + BZ1) / 2); ground.receiveShadow = true; scene.add(ground);
  const sg = new THREE.PlaneGeometry(4000, gh); sg.rotateX(-Math.PI / 2);
  const suv = sg.attributes.uv; for (let i = 0; i < suv.count; i++) suv.setXY(i, suv.getX(i) * 4000 * 0.035, suv.getY(i) * gh * 0.035);
  const seaEdge = new THREE.Mesh(sg, M.sea); seaEdge.position.set(BX1 + 2000, 0.035, (BZ0 + BZ1) / 2); scene.add(seaEdge);

  // ---- water / areas ----
  const regWater = (d, sea) => {
    const pts = toPts(d.p); if (pts.length < 3) return;
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (const p of pts) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
    const idx = waterPolys.length; waterPolys.push({ pts, holes: (d.hl || []).map(toPts), minx, maxx, minz, maxz, sea });
    gridAdd(waterGrid, WC, minx, minz, maxx, maxz, idx);
  };
  WD.areas.water.forEach(d => regWater(d, false)); WD.areas.sea.forEach(d => regWater(d, true));
  texWaterN.repeat.set(0.035, 0.035); texGrass.repeat.set(0.12, 0.12); texSand.repeat.set(0.1, 0.1);
  areaMesh(WD.areas.water, M.river, 0.03); areaMesh(WD.areas.sea, M.sea, 0.035); areaMesh(WD.areas.beach, M.sand, 0.05); areaMesh(WD.areas.pool, M.pool, 0.09);
  areaMesh(WD.areas.green, M.green, 0.045); areaMesh(WD.areas.pitch, M.pitch, 0.055);
  progress(0.2, 'Filling the Cooum and the Adyar…'); await tick();
  for (const d of WD.areas.platform) {
    const s = shapeOf(d); if (!s) continue;
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.95, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.25, uv.getY(i) * 0.25);
    const m = new THREE.Mesh(g, M.platform); m.receiveShadow = true; scene.add(m);
    addWallRing(toPts(d.p), 0.95, Layers.Curb); addWalkSurface(toPts(d.p), 0.95);
  }
  buildRails(); buildAirport(); buildPiers();
  progress(0.3, 'Surveying 130,000 buildings…'); await tick();

  // ---- buildings: metadata + collision for all ----
  const lmLargest = {};
  let bi = 0, droppedB = 0, openB = 0;
  for (const b of WD.buildings) {
    bi++;
    if (WorldFix.dropB.has(bi - 1)) { droppedB++; continue; }
    if (bi % 20000 === 0) { progress(0.3 + 0.35 * bi / WD.buildings.length, `Surveying buildings ${bi.toLocaleString()} / ${WD.buildings.length.toLocaleString()}…`); await tick(); }
    const pp = undelta(b.p, enc);
    let pts = toPts(pp); if (pts.length < 3) continue;
    const seed = hash2(bi, 77);
    { const [qx, qz] = centroid(pts), ins = hash2(bi, 99) * 0.08; pts = pts.map(p => { const dx = p[0] - qx, dz = p[1] - qz, l = Math.hypot(dx, dz) || 1; return [p[0] - dx / l * ins, p[1] - dz / l * ins]; }); }
    const h = b.h / 10, A = signedArea(pts), area = Math.abs(A);
    const [cx, cz] = centroid(pts);
    const isStadium = b.s === 'stadium' && area > 5000;
    const hh = isStadium ? Math.min(h, 24) : h;
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const p of pts) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
    // a road runs through this footprint (canopies, misaligned outlines, terminal forecourts): never let it block traffic
    const onRoad = roadInside(pts, minx, minz, maxx, maxz, hh);
    // big structures with a road through them (terminal forecourts, gateways) keep every wall except where the road passes
    if (onRoad >= 2.5) { if (area < 2500 || h < 9) { droppedB++; continue; } openB++; addWallRing(pts, hh, Layers.Obstacle, wallCrossedByRoad); }
    else addWallRing(pts, hh);
    const pi = bPolys.length; bPolys.push({ pts, minx, maxx, minz, maxz, h: hh, name: b.n || '', A, cx, cz, area });
    gridAdd(bPolyGrid, BC, minx, minz, maxx, maxz, pi);
    const rec = { pts, h, hh, A, area, cx, cz, seed, k: b.k, s: b.s, ln: b.ln, tm: b.tm, n: b.n, bi, pi, isStadium };
    BLD.push(rec); chunkAt(cx, cz).bld.push(BLD.length - 1);
    if (b.s && b.s.startsWith('saracenic') && area > 200) { const k = b.ln || b.s; if (!lmLargest[k] || lmLargest[k].area < area) lmLargest[k] = { area, cx, cz, h, pts, s: b.s, ln: b.ln }; }
    if (h > 55 && area > 350 && pointInPoly(cx, cz, pts)) tallTowers.push(pi);
  }
  WD.buildings = null; // raw data no longer needed
  if (window.__memlog) console.log('MEM roadBuildings dropped ' + droppedB + ' open ' + openB);
  decor = new GeoBuf(true);
  for (const k in lmLargest) { const L = lmLargest[k]; const key = (L.ln || '').toLowerCase(); if (/central|egmore|museum|high court|senate|presidency|university/.test(key)) clockTower(L, key); }
  if (!decor.empty) { const m = new THREE.Mesh(decor.geometry(), M.vcol); m.castShadow = true; scene.add(m); }
  progress(0.68, 'Planting 40,000 trees…'); await tick();
  for (const t of WD.trees) { const x = t[0] / 10, z = t[1] / 10; chunkAt(x, z).trees.push([x, z, 0.75 + hash2(t[1], t[0]) * 0.65, x > 2300 && z < 4000 ? hash2(t[0], t[1]) < 0.75 : hash2(t[0], t[1]) < 0.06]); }
  for (const l of WD.lights) { const x = l[0] / 10, z = l[1] / 10; chunkAt(x, z).lights.push([x, z, l[2] * Math.PI / 180]); }
  initTreeGeos(); initLightGeos();
  progress(0.72, 'Laying the city around you…'); await tick();
}

function wallCrossedByRoad(p, q) {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(2, Math.ceil(L / 2));
  for (let j = 0; j <= n; j++) { const t = j / n, r = roadQuery(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 10); if (r.seg && r.d < 1.5 && !(r.seg.elev && r.y > 3)) return true; }
  return false;
}
// ---------- chunk streaming ----------
const RNEAR = 520, RFAR = 1350;
let streamBudget = 0;
function chunkTargetState(c, px, pz) {
  const d = Math.max(0, Math.hypot(c.cx - px, c.cz - pz) - CH * 0.7);
  return d < RNEAR ? 2 : d < Q.fogFar + 150 ? 1 : 0;
}
function updateChunks(px, pz, budgetMs = 9, force = false) {
  const t0 = performance.now();
  const r = Math.ceil((Q.fogFar + 450) / CH);
  const cix = Math.floor(px / CH), ciz = Math.floor(pz / CH);
  // collect needed work sorted by distance
  const work = [];
  for (let ix = cix - r; ix <= cix + r; ix++) for (let iz = ciz - r; iz <= ciz + r; iz++) {
    const c = chunks.get(ckey(ix, iz)); if (!c) continue;
    const want = chunkTargetState(c, px, pz);
    if (want > c.state || (want === 1 && c.state === 2) ) work.push([Math.hypot(c.cx - px, c.cz - pz), c, want]);
  }
  work.sort((a, b) => a[0] - b[0]);
  for (const [, c, want] of work) {
    if (!force && performance.now() - t0 > budgetMs) break;
    if (want === 2) { if (!c.farBuilt) buildFar(c); buildNear(c); c.state = 2; }
    else if (want === 1) { if (c.state === 2) dropNear(c); if (!c.farBuilt) buildFar(c); c.state = 1; }
    for (const m of c.far) m.visible = c.state === 1 || m.userData.always;
  }
  // unload far-away chunks
  if (!force) for (const c of chunks.values()) {
    if (c.state === 0) continue;
    const d = Math.hypot(c.cx - px, c.cz - pz);
    if (d > Q.fogFar + 900) { dropNear(c); dropFar(c); c.state = 0; }
  }
}
function disposeList(list) { for (const m of list) { scene.remove(m); if (m.geometry && !m.userData.sharedGeo) m.geometry.dispose(); } list.length = 0; }
function dropNear(c) { disposeList(c.near); }
function dropFar(c) { disposeList(c.far); c.farBuilt = false; }
function addTo(list, m, always = false) { m.userData.always = always; scene.add(m); list.push(m); return m; }

function buildFar(c) {
  // simple buildings + road surfaces + trees (shared by both states; trees/roads stay visible when near)
  const bb = new GeoBuf(true, true);
  for (const i of c.bld) emitBuilding(bb, BLD[i], false);
  if (!bb.empty) { const m = new THREE.Mesh(bb.geometry(), M.bldg); m.castShadow = true; m.receiveShadow = true; addTo(c.far, m); }
  const rb_ = new GeoBuf(false, false, true), eb = new GeoBuf(false);
  for (const ei of c.edges) {
    const E = G.edges[ei];
    const rr = ribbon(rb_, E.xs, E.zs, E.ys, E.hw, E.hw, E.elev ? 0.14 : RY, 0.12);
    if (E.elev && rr) { _col.setHex(0xb7b0a3); vwall(eb, rr.L, -0.95, 0.85); vwall(eb, rr.R, -0.95, 0.85); ribbon(eb, E.xs, E.zs, E.ys, E.hw + 0.2, E.hw + 0.2, -0.85); }
  }
  for (const ni of c.nodes) { const n = G.nodes[ni]; disc(rb_, n.x, n.z, nodeY[ni] + (nodeY[ni] > 0.3 ? 0.14 : RY), nodeHW[ni] * 1.02); }
  if (!rb_.empty) { const m = new THREE.Mesh(rb_.geometry(), M.road); m.receiveShadow = true; addTo(c.far, m, true); }
  if (!eb.empty) { const m = new THREE.Mesh(eb.geometry(), M.concrete); m.castShadow = true; addTo(c.far, m, true); }
  buildTreesFor(c);
  c.farBuilt = true;
}
function buildNear(c) {
  dropNear(c);
  decor = new GeoBuf(true); billBuf = new GeoBuf(false, false, true);
  const bb = new GeoBuf(true, true); const tanks = [];
  for (const i of c.bld) emitBuilding(bb, BLD[i], true, tanks);
  if (!bb.empty) { const m = new THREE.Mesh(bb.geometry(), M.bldg); m.castShadow = true; m.receiveShadow = true; addTo(c.near, m); }
  // street furniture: walks, curbs, markings, pillars
  const wb = new GeoBuf(false, false, true), cb = new GeoBuf(false), mb = new GeoBuf(false);
  const otherHW = (ni, E) => { let m = 0; for (const ei of G.nodes[ni].edges) if (ei !== E.i) m = Math.max(m, G.edges[ei].hw); return m; };
  for (const ei of c.edges) {
    const E = G.edges[ei], hw = E.hw;
    const trimA = nodeDeg[E.a] > 1 ? otherHW(E.a, E) + 0.6 : 0, trimB = nodeDeg[E.b] > 1 ? otherHW(E.b, E) + 0.6 : 0;
    const walkSide = !E.elev && (E.c <= 2 || (E.c === 3 && hw >= 3.4)) && E.len - trimA - trimB > 4;
    if (walkSide) {
      const [xs, zs] = subPoly(E, trimA, E.len - trimB);
      const sw = E.c <= 1 ? 3.2 : 2.4;
      const l = ribbon(wb, xs, zs, null, hw + sw, -hw, SY, 0.25); if (l) vwall(cb, l.R, -SY + RY - 0.02, 0);
      const r = ribbon(wb, xs, zs, null, -hw, hw + sw, SY, 0.25); if (r) vwall(cb, r.L, -SY + RY - 0.02, 0);
      if (l) vwall(cb, l.L, -SY, 0); if (r) vwall(cb, r.R, -SY, 0);
      // median on wide two-way roads
      if (E.o === 0 && hw >= 7.5 && E.c <= 1) { const md = ribbon(cb, xs, zs, null, 0.6, 0.6, 0.32); }
    }
    if (E.elev) {
      let acc = 11;
      for (let k = 0; k < E.xs.length - 1; k++) {
        const segL = E.cum[k + 1] - E.cum[k];
        while (acc < E.cum[k + 1]) {
          const t = (acc - E.cum[k]) / segL; const y = E.ys[k] + (E.ys[k + 1] - E.ys[k]) * t;
          if (y > 2.6) boxTo(decor, E.xs[k] + (E.xs[k + 1] - E.xs[k]) * t, (y - 0.9) / 2, E.zs[k] + (E.zs[k + 1] - E.zs[k]) * t, 1.6, y - 0.9, 1.6, 0, _col.setHex(0xa9a395));
          acc += 24;
        }
      }
    }
    if (E.br && !E.elev) { const rr = ribbon(new GeoBuf(false), E.xs, E.zs, E.ys, hw, hw, 0); _col.setHex(0xcfc8ba); if (rr) { vwall(cb, rr.L, 0, 0.95); vwall(cb, rr.R, 0, 0.95); } }
    if (!E.elev && E.c <= 2 && hw >= 3.2 && E.len - trimA - trimB > 12) {
      const s0 = trimA + 3, s1 = E.len - trimB - 3;
      const lanes = E.o === 0 ? [0] : [];
      if (hw >= 6) lanes.push(-hw / 2, hw / 2); else if (E.o !== 0) lanes.push(0);
      for (const off of lanes) {
        const solid = off === 0 && E.o === 0 && E.c === 0 && hw >= 6;
        if (solid && hw >= 7.5) continue; // median instead
        if (solid) { const [xs, zs] = subPoly(E, s0, s1); ribbon(mb, xs, zs, null, off + 0.12, -off + 0.12, RY + 0.012); continue; }
        let s = s0; while (s < s1) { const e2 = Math.min(s + 3, s1); const [xs, zs] = subPoly(E, s, e2); ribbon(mb, xs, zs, null, off + 0.075, -off + 0.075, RY + 0.012); s += 9; }
      }
      if (E.c <= 1 && hw >= 4) { const [xs, zs] = subPoly(E, s0, s1); ribbon(mb, xs, zs, null, hw - 0.3, -(hw - 0.48), RY + 0.012); ribbon(mb, xs, zs, null, -(hw - 0.48), hw - 0.3, RY + 0.012); }
    }
    for (const [ni, atA] of [[E.a, true], [E.b, false]]) {
      if (E.elev || nodeDeg[ni] < 3 || nodeMaxC[ni] > 1 || E.c > 3 || hw < 3 || E.len < 18) continue;
      const trim = (atA ? trimA : trimB) + 1.8;
      const s = atA ? trim : E.len - trim; const tmp = edgePoint(E, s, 1, {});
      for (let o = -hw + 0.5; o <= hw - 0.5; o += 1.0) {
        const px = tmp.x + tmp.tz * o, pz = tmp.z - tmp.tx * o;
        ribbon(mb, [px - tmp.tx * 1.4, px + tmp.tx * 1.4], [pz - tmp.tz * 1.4, pz + tmp.tz * 1.4], null, 0.24, 0.24, RY + 0.013);
      }
      // traffic light pole at big junctions
      if (atA && hash2(ni, 5) < 0.6) { const lx = tmp.x + tmp.tz * (hw + 1.2), lz = tmp.z - tmp.tx * (hw + 1.2); boxTo(decor, lx, 2.6, lz, 0.14, 5.2, 0.14, 0, _col.setHex(0x2a2a2a)); boxTo(decor, lx - tmp.tz * 1.2, 5.0, lz + tmp.tx * 1.2, 0.3, 0.9, 0.3, 0, _col.setHex(0x1a1a1a)); }
    }
  }
  for (const w of c.walks) { const wd = WD.walks[w], n = wd.p.length / 2, xs = [], zs = []; for (let k = 0; k < n; k++) { xs.push(wd.p[k * 2] / 10); zs.push(wd.p[k * 2 + 1] / 10); } ribbon(wb, xs, zs, null, wd.w / 20, wd.w / 20, 0.07, 0.25); }
  if (!wb.empty) { const m = new THREE.Mesh(wb.geometry(), M.walk); m.receiveShadow = true; addTo(c.near, m); }
  if (!cb.empty) { const m = new THREE.Mesh(cb.geometry(), M.curb); m.receiveShadow = true; addTo(c.near, m); }
  if (!mb.empty) { const m = new THREE.Mesh(mb.geometry(), M.mark); m.receiveShadow = true; addTo(c.near, m); }
  if (tanks.length) {
    const im = new THREE.InstancedMesh(TANK_GEO, M.tank, tanks.length); const m4 = new THREE.Matrix4();
    tanks.forEach((t, i) => { m4.makeScale(t[3] / 0.75, t[3] / 0.75 * 1.1, t[3] / 0.75); m4.setPosition(t[0], t[1], t[2]); im.setMatrixAt(i, m4); });
    im.computeBoundingSphere(); im.castShadow = true; im.userData.sharedGeo = true; addTo(c.near, im);
  }
  if (!decor.empty) { const m = new THREE.Mesh(decor.geometry(), M.vcol); m.castShadow = true; m.receiveShadow = true; addTo(c.near, m); }
  if (!billBuf.empty) { const m = new THREE.Mesh(billBuf.geometry(), M.bill); m.castShadow = true; addTo(c.near, m); }
  buildLightsFor(c);
}
const TANK_GEO = (() => { const g = new THREE.CylinderGeometry(0.75, 0.75, 1.5, 12); g.translate(0, 0.75, 0); return g; })();
M.bill.side = THREE.DoubleSide; M.curb.side = THREE.DoubleSide;

function emitBuilding(buf, B, full, tanks) {
  const { pts, h, A, area, cx, cz, seed, bi } = B;
  const kind = B.k === 3 ? 5 : B.k;
  let hex;
  if (B.s) hex = STYLE_COL[B.s] || 0xd8d0c0;
  else if (B.tm) hex = 0xffffff;
  else { const pal = kind === 1 ? WALL_PAL.comm : kind === 2 ? WALL_PAL.house : WALL_PAL.res; hex = pal[Math.floor(seed * 997) % pal.length]; }
  const col = new THREE.Color(hex).multiplyScalar(0.9 + hash2(bi, 3) * 0.12);
  const roof = new THREE.Color(0xc9c4ba).multiplyScalar(0.85 + hash2(bi, 5) * 0.2);
  const pcol = col.clone().multiplyScalar(0.92);
  const style = pickStyle(B, kind, seed, h);
  const shop = !B.s && !B.tm && h >= 5.5 && h < 60 && (kind === 1 || (kind === 0 && seed > 0.4) || (kind === 2 && seed > 0.85)) ? 16 : 0;
  const hh = B.hh;
  let inner = null;
  if (B.isStadium) inner = pts.map(p => [cx + (p[0] - cx) * 0.6, cz + (p[1] - cz) * 0.6]);
  const BAY = 3.33;
  const doWalls = (P, flip, y0, y1, sty, c) => {
    let uacc = hash2(bi, 3) * 3 * BAY;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length];
      const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz); if (len < 0.05) continue;
      const outA = (A > 0) !== flip;
      // u must grow left-to-right when seen from outside, otherwise shop signs read mirrored
      const sg = outA ? -1 : 1, u0 = sg * uacc / BAY, u1 = sg * (uacc + len) / BAY; uacc += len;
      const v0 = y0 / 3.2, v1 = y1 / 3.2;
      const a0 = [p[0], y0, p[1]], b0 = [q[0], y0, q[1]], b1 = [q[0], y1, q[1]], a1 = [p[0], y1, p[1]];
      const w00 = [u0, v0, seed, sty], w10 = [u1, v0, seed, sty], w11 = [u1, v1, seed, sty], w01 = [u0, v1, seed, sty];
      if (outA) { const nx = dz / len, nz = -dx / len; buf.tri(a0, b1, b0, nx, 0, nz, c, w00, w11, w10); buf.tri(a0, a1, b1, nx, 0, nz, c, w00, w01, w11); }
      else { const nx = -dz / len, nz = dx / len; buf.tri(a0, b0, b1, nx, 0, nz, c, w00, w10, w11); buf.tri(a0, b1, a1, nx, 0, nz, c, w00, w11, w01); }
    }
  };
  // tall towers get a glassy crown band and setbacks
  doWalls(pts, false, 0, hh, style + shop, col);
  if (inner) doWalls(inner, true, 0, hh * 0.8, 15, col);
  const PW = [0, 0, 0, -1], RW = [0, 0, 0, -2];
  if (full && !B.isStadium && area > 25 && style !== 4 && style !== 7) {
    const ph = 0.95, ip = insetPoly(pts, 0.22, A);
    doWalls(pts, false, hh, hh + ph, 15, pcol);
    for (let i = 0; i < ip.length; i++) {
      const p = ip[i], q = ip[(i + 1) % ip.length], o0 = pts[i], o1 = pts[(i + 1) % pts.length];
      const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz) || 1;
      const nx = A > 0 ? -dz / len : dz / len, nz = A > 0 ? dx / len : -dx / len;
      const a0 = [p[0], hh, p[1]], b0 = [q[0], hh, q[1]], b1 = [q[0], hh + ph, q[1]], a1 = [p[0], hh + ph, p[1]];
      if (A > 0) { buf.tri(a0, b0, b1, nx, 0, nz, pcol, PW, PW, PW); buf.tri(a0, b1, a1, nx, 0, nz, pcol, PW, PW, PW); }
      else { buf.tri(a0, b1, b0, nx, 0, nz, pcol, PW, PW, PW); buf.tri(a0, a1, b1, nx, 0, nz, pcol, PW, PW, PW); }
      const t0 = [o0[0], hh + ph, o0[1]], t1 = [o1[0], hh + ph, o1[1]];
      const tri = (P1, P2, P3) => { const ux = P2[0] - P1[0], uz = P2[2] - P1[2], vx = P3[0] - P1[0], vz = P3[2] - P1[2]; if (uz * vx - ux * vz < 0) buf.tri(P1, P3, P2, 0, 1, 0, pcol, PW, PW, PW); else buf.tri(P1, P2, P3, 0, 1, 0, pcol, PW, PW, PW); };
      tri(t0, t1, b1); tri(t0, b1, a1);
    }
  }
  // roof
  if (!B.faces) {
    const contour = pts.map(p => new THREE.Vector2(p[0], p[1]));
    const holes = inner ? [inner.map(p => new THREE.Vector2(p[0], p[1]))] : [];
    try { B.faces = THREE.ShapeUtils.triangulateShape(contour, holes); } catch (e) { B.faces = []; }
  }
  const all = inner ? pts.concat(inner) : pts;
  for (const f of B.faces) {
    const a = all[f[0]], bb = all[f[1]], c = all[f[2]]; if (!a || !bb || !c) continue;
    const ya = inner && f[0] >= pts.length ? hh * 0.8 : hh, yb = inner && f[1] >= pts.length ? hh * 0.8 : hh, yc = inner && f[2] >= pts.length ? hh * 0.8 : hh;
    let A3 = [a[0], ya, a[1]], B3 = [bb[0], yb, bb[1]], C3 = [c[0], yc, c[1]];
    const ux = B3[0] - A3[0], uz = B3[2] - A3[2], vx = C3[0] - A3[0], vz = C3[2] - A3[2];
    if (uz * vx - ux * vz < 0) { const t = B3; B3 = C3; C3 = t; }
    buf.tri(A3, B3, C3, 0, 1, 0, roof, RW, RW, RW);
  }
  if (!full) return;
  const r1 = hash2(bi, 7), r2 = hash2(bi, 11);
  if (!B.s && kind !== 5 && area > 50 && area < 1200 && h < 45 && r1 < 0.6 && pointInPoly(cx, cz, pts)) {
    const ox = (r2 - 0.5) * Math.sqrt(area) * 0.3, oz = (hash2(bi, 13) - 0.5) * Math.sqrt(area) * 0.3;
    if (pointInPoly(cx + ox, cz + oz, pts)) tanks.push([cx + ox, h, cz + oz, 0.6 + r2 * 0.35]);
    if (r1 < 0.35 && area > 90) boxTo(decor, cx - ox * 0.6, h + 1.3, cz - oz * 0.6, 2.8, 2.6, 3.2, Math.atan2(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), col.clone().multiplyScalar(0.95));
  }
  if (h > 55 && area > 350 && pointInPoly(cx, cz, pts)) {   // helipad + crown on skyscrapers
    _col.setHex(0x3a3a3e); disc(decor, cx, cz, h + 0.06, Math.min(9, Math.sqrt(area) * 0.3), 24);
    _col.setHex(0xf2c41f); disc(decor, cx, cz, h + 0.08, Math.min(7, Math.sqrt(area) * 0.24) , 24);
    _col.setHex(0x3a3a3e); disc(decor, cx, cz, h + 0.1, Math.min(6.2, Math.sqrt(area) * 0.21), 24);
    boxTo(decor, cx - 1.2, h + 0.15, cz, 0.6, 0.1, 4, 0, _col.setHex(0xffffff)); boxTo(decor, cx + 1.2, h + 0.15, cz, 0.6, 0.1, 4, 0, _col.setHex(0xffffff)); boxTo(decor, cx, h + 0.15, cz, 1.8, 0.1, 0.6, 0, _col.setHex(0xffffff));
    boxTo(decor, cx, h + 3, cz + Math.min(12, Math.sqrt(area) * 0.38), 0.2, 6, 0.2, 0, _col.setHex(0x888888));
  }
  if (!B.s && !B.tm && h > 8 && h < 32 && area > 120 && area < 2000 && hash2(bi, 21) < 0.2) {
    const r = roadQuery(cx, cz, 45);
    if (r.seg && r.seg.e.c <= 1 && r.d < 30) {
      let nx = r.px - cx, nz = r.pz - cz; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
      const off = Math.min(Math.sqrt(area) * 0.35, 7); const bx_ = cx + nx * off, bz = cz + nz * off;
      if (pointInPoly(bx_, bz, pts)) billboard(bx_, h, bz, nx, nz, Math.floor(hash2(bi, 23) * 8));
    }
  }
  if (B.s && B.s.startsWith('saracenic') && area > 200) {
    const domeCol = new THREE.Color(B.s === 'saracenic' ? 0xf1e9da : 0xc6643f);
    const step = Math.max(1, Math.floor(pts.length / 4));
    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i]; const ix = p[0] + (cx - p[0]) * 0.12, iz = p[1] + (cz - p[1]) * 0.12;
      if (!pointInPoly(ix, iz, pts)) continue;
      cylTo(decor, ix, h, iz, 1.3, 1.3, 2.2, 8, domeCol); domeTo(decor, ix, h + 2.2, iz, 1.45, domeCol, 3, 8);
      cylTo(decor, ix, h + 3.8, iz, 0.05, 0.18, 1.1, 5, _col.setHex(0xd4a72c));
    }
  }
  if (B.tm && area > 80) gopuram(cx, cz, h, area, bi);
}

// ---------- trees & lights per chunk ----------
let TREE_G = null;
function initTreeGeos() {
  const trunkG = new THREE.CylinderGeometry(0.18, 0.32, 4.4, 6); trunkG.translate(0, 2.2, 0);
  const blobs = [[0, 4.9, 0, 2.6], [1.3, 4.3, 0.6, 1.9], [-1.2, 4.4, -0.7, 2.0]];
  const canG = mergeGeometries(blobs.map(([x, y, z, r]) => { const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, 0.82, 1); g.translate(x, y, z); return g; }));
  canG.computeVertexNormals();
  const pTrunkG = new THREE.CylinderGeometry(0.15, 0.26, 8.5, 6); pTrunkG.translate(0, 4.25, 0);
  const fronds = [];
  for (let i = 0; i < 8; i++) { const f = new THREE.PlaneGeometry(0.9, 4.4, 1, 3); const pa = f.attributes.position; for (let k = 0; k < pa.count; k++) { const yy = pa.getY(k) + 2.2; pa.setY(k, yy); pa.setZ(k, -yy * yy * 0.06); } f.rotateX(0.9); f.rotateY(i / 8 * TAU); f.translate(0, 8.4, 0); fronds.push(f); }
  const frondG = mergeGeometries(fronds); frondG.computeVertexNormals();
  // prefer the Blender-built neem / palm models
  const neem = Assets.mergedByMaterial('neem'), palm = Assets.mergedByMaterial('palm');
  const T_ = { trunkG, canG, pTrunkG, frondG };
  if (neem && neem.Trunk && neem.Leaf) { T_.trunkG = neem.Trunk; T_.canG = neem.Leaf; }
  if (palm && palm.Trunk && palm.Leaf) { T_.pTrunkG = palm.Trunk; T_.frondG = palm.Coconut ? mergeGeometries([palm.Leaf, palm.Coconut]) : palm.Leaf; }
  TREE_G = { trunkG: T_.trunkG, canG: T_.canG, pTrunkG: T_.pTrunkG, frondG: T_.frondG, greens: [0x4f7d33, 0x5d8c3a, 0x3f6b2c, 0x6c9a45, 0x7a8f3a, 0x4a7a3c, 0x58803a, 0x6a8e2e].map(h => new THREE.Color(h)) };
}
function buildTreesFor(c) {
  const trees = c.trees.filter(t => !t[3]), palms = c.trees.filter(t => t[3]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  if (trees.length) {
    const tr = new THREE.InstancedMesh(TREE_G.trunkG, M.trunk, trees.length), cn = new THREE.InstancedMesh(TREE_G.canG, M.leaf, trees.length);
    trees.forEach((t, i) => {
      q.setFromAxisAngle(up, t[0] * 0.37 + t[1]); s.set(t[2] * (0.9 + hash2(t[0] * 3, 1) * 0.4), t[2], t[2] * (0.9 + hash2(t[1] * 3, 2) * 0.4)); p.set(t[0], 0, t[1]);
      m4.compose(p, q, s); tr.setMatrixAt(i, m4); cn.setMatrixAt(i, m4); cn.setColorAt(i, TREE_G.greens[Math.floor(hash2(t[0] * 10, t[1] * 10) * TREE_G.greens.length)]);
    });
    for (const im of [tr, cn]) { im.computeBoundingSphere(); im.castShadow = true; im.userData.sharedGeo = true; addTo(c.far, im, true); }
  }
  if (palms.length) {
    const tr = new THREE.InstancedMesh(TREE_G.pTrunkG, M.trunk, palms.length), fr = new THREE.InstancedMesh(TREE_G.frondG, M.palmLeaf, palms.length);
    palms.forEach((t, i) => { q.setFromAxisAngle(up, t[0] + t[1]); s.setScalar(0.8 + t[2] * 0.3); p.set(t[0], 0, t[1]); m4.compose(p, q, s); tr.setMatrixAt(i, m4); fr.setMatrixAt(i, m4); });
    for (const im of [tr, fr]) { im.computeBoundingSphere(); im.castShadow = true; im.userData.sharedGeo = true; addTo(c.far, im, true); }
  }
}
let LIGHT_G = null;
function initLightGeos() {
  const pole = new THREE.CylinderGeometry(0.07, 0.11, 7.2, 6); pole.translate(0, 3.6, 0);
  const arm = new THREE.BoxGeometry(0.09, 0.09, 2.3); arm.translate(0, 7.1, 1.1);
  const headG = new THREE.BoxGeometry(0.34, 0.14, 0.75); headG.translate(0, 7.0, 2.2);
  const poolG = new THREE.PlaneGeometry(15, 15); poolG.rotateX(-Math.PI / 2); poolG.translate(0, 0.27, 3.2);
  LIGHT_G = { poleG: mergeGeometries([pole, arm]), headG, poolG };
}
function buildLightsFor(c) {
  const list = c.lights; if (!list.length) return;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const pm = new THREE.InstancedMesh(LIGHT_G.poleG, M.lamp, list.length), hm = new THREE.InstancedMesh(LIGHT_G.headG, M.lampHead, list.length), lp = new THREE.InstancedMesh(LIGHT_G.poolG, lightPoolMat, list.length);
  const gp = [];
  list.forEach((l, i) => {
    const a = l[2], yaw = Math.atan2(Math.sin(a), -Math.cos(a));
    q.setFromAxisAngle(up, yaw); p.set(l[0], 0, l[1]); m4.compose(p, q, s); pm.setMatrixAt(i, m4); hm.setMatrixAt(i, m4); lp.setMatrixAt(i, m4);
    gp.push(l[0] + Math.sin(yaw) * 2.2, 6.85, l[1] + Math.cos(yaw) * 2.2);
  });
  pm.castShadow = true; lp.renderOrder = 2;
  for (const im of [pm, hm, lp]) { im.computeBoundingSphere(); im.userData.sharedGeo = true; addTo(c.near, im); }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); gg.computeBoundingSphere();
  const pts = new THREE.Points(gg, lampGlowMat); pts.renderOrder = 3; addTo(c.near, pts);
}

// ---------- rails, airport, piers (global) ----------
function buildRails() {
  const railB = new GeoBuf(false, false, true), steel = new GeoBuf(false), via = new GeoBuf(false);
  for (const r of WD.rails) {
    const n = r.p.length / 2, xs = new Float32Array(n), zs = new Float32Array(n), ys = new Float32Array(n), cum = new Float32Array(n);
    for (let k = 0; k < n; k++) { xs[k] = r.p[k * 2] / 10; zs[k] = r.p[k * 2 + 1] / 10; ys[k] = (r.h ? r.h[k] : 0) / 10; if (k) cum[k] = cum[k - 1] + Math.hypot(xs[k] - xs[k - 1], zs[k] - zs[k - 1]); }
    railLines.push({ xs, zs, ys, cum, len: cum[n - 1], stops: [] });
    ribbon(railB, xs, zs, ys, 1.8, 1.8, 0.06, 0.2);
    ribbon(steel, xs, zs, ys, 0.78, -0.68, 0.19); ribbon(steel, xs, zs, ys, -0.68, 0.78, 0.19);
    let elevated = false; for (let k = 0; k < n; k++) if (ys[k] > 1) { elevated = true; break; }
    if (elevated) {
      _col.setHex(0xb2ab9e); const rr = ribbon(via, xs, zs, ys, 2.4, 2.4, -0.6);
      if (rr) { vwall(via, rr.L, -0.1, 0.9); vwall(via, rr.R, -0.1, 0.9); }
      let acc = 15;
      for (let k = 0; k < n - 1; k++) { const L2 = cum[k + 1] - cum[k]; while (acc < cum[k + 1]) { const t = (acc - cum[k]) / L2, y = ys[k] + (ys[k + 1] - ys[k]) * t; if (y > 2.5) boxTo(via, xs[k] + (xs[k + 1] - xs[k]) * t, (y - 0.6) / 2, zs[k] + (zs[k + 1] - zs[k]) * t, 1.8, y - 0.6, 1.8, 0, _col); acc += 28; } }
      // let cars and people stand on viaducts as surfaces
    }
  }
  if (!railB.empty) { const m = new THREE.Mesh(railB.geometry(), M.ballast); m.receiveShadow = true; scene.add(m); }
  if (!steel.empty) scene.add(new THREE.Mesh(steel.geometry(), M.rail));
  if (!via.empty) { const m = new THREE.Mesh(via.geometry(), M.concrete); m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  // stations along each line (names kept for the metro system)
  for (const L of railLines) {
    L.stopMeta = [];
    for (const p of G.pois) {
      if (p.t !== 'station' && p.t !== 'metro') continue;
      let best = 1e9, bs = 0;
      for (let k = 0; k < L.xs.length; k++) { const d = dist2(L.xs[k], L.zs[k], p.x, p.z); if (d < best) { best = d; bs = L.cum[k]; } }
      if (best < 90 * 90 && !L.stops.some(s => Math.abs(s - bs) < 300)) { L.stops.push(bs); const rp = railPoint(L, bs); L.stopMeta.push({ s: bs, name: p.n || 'Station', metro: p.t === 'metro', x: rp.x, y: rp.y - 0.15, z: rp.z, px: p.x, pz: p.z }); }
    }
    L.stops.sort((a, b) => a - b); L.stopMeta.sort((a, b) => a.s - b.s);
  }
  buildPortals(); buildElevatedStations();
}
// tunnel portal hoods where a line dips below ground (WorldFix ramps dangling viaducts into these)
function buildPortals() {
  const pb = new GeoBuf(true); const conc = new THREE.Color(0xa7a197), dark = new THREE.Color(0x07080a); let n = 0;
  for (const L of railLines) for (let k = 0; k < L.xs.length - 1; k++) {
    const y0 = L.ys[k], y1 = L.ys[k + 1]; if ((y0 >= 0) === (y1 >= 0)) continue;
    const t = y0 / (y0 - y1), x = L.xs[k] + (L.xs[k + 1] - L.xs[k]) * t, z = L.zs[k] + (L.zs[k + 1] - L.zs[k]) * t;
    let tx = L.xs[k + 1] - L.xs[k], tz = L.zs[k + 1] - L.zs[k]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl; if (y1 > y0) { tx = -tx; tz = -tz; }  // point into the tunnel
    const rot = Math.atan2(tx, tz), cx = x + tx * 16, cz = z + tz * 16;
    boxTo(pb, cx, 3.2, cz, 8.4, 6.4, 32, rot, conc);                                   // hood over the cutting
    boxTo(pb, x - tx * 0.08, 2.6, z - tz * 0.08, 5.6, 5.0, 0.12, rot, dark);            // dark tunnel mouth
    boxTo(pb, x - tx * 0.3, 6.6, z - tz * 0.3, 9.6, 0.8, 0.6, rot, conc);              // headwall lip
    for (const sd of [-1, 1]) boxTo(pb, x - tx * 6 + tz * sd * 4.6, 0.7, z - tz * 6 - tx * sd * 4.6, 0.6, 1.4, 12, rot, conc);  // wing walls
    const hx = 4.2, hz = 16, c = Math.cos(rot), s2 = Math.sin(rot), P = (lx, lz) => [cx + lx * c + lz * s2, cz - lx * s2 + lz * c];
    addWallRing([P(-hx, -hz), P(hx, -hz), P(hx, hz), P(-hx, hz)], 6.4, Layers.Obstacle, wallCrossedByRoad); n++;
  }
  if (!pb.empty) { const m = new THREE.Mesh(pb.geometry(), M.vcol); m.castShadow = m.receiveShadow = true; scene.add(m); }
  WorldFix.stats.portalHoodsBuilt = n;
}
// metro stations on viaducts: side platforms at deck level, canopy roof, columns and a stair tower
function buildElevatedStations() {
  const sb = new GeoBuf(true); const plat = new THREE.Color(0xc9c3b6), roof = new THREE.Color(0x2f6fb5), col = new THREE.Color(0xb2ab9e), glass = new THREE.Color(0x9fc4dc); let n = 0;
  const built = [];
  for (const L of railLines) for (const st of L.stopMeta) {
    if (st.y < 3.5) continue;
    const twin = built.find(b => dist2(b.x, b.z, st.x, st.z) < 70 * 70);   // parallel tracks share one station
    if (twin) { st.elevated = true; st.rot = twin.rot; continue; }
    built.push(st);
    const a = railPoint(L, st.s - 5), b = railPoint(L, st.s + 5); const rot = Math.atan2(b.x - a.x, b.z - a.z), tx = Math.sin(rot), tz = Math.cos(rot);
    st.elevated = true; st.rot = rot; n++; built[built.length - 1].rot = rot;
    for (const sd of [-1, 1]) {
      const ox = tz * sd * 3.9, oz = -tx * sd * 3.9;
      boxTo(sb, st.x + ox, st.y + 0.45, st.z + oz, 3.6, 1.0, 130, rot, plat);                      // platform slab
      boxTo(sb, st.x + ox * 1.48, st.y + 1.6, st.z + oz * 1.48, 0.15, 1.3, 130, rot, glass);        // glass parapet
      for (let k = -60; k <= 60; k += 15) boxTo(sb, st.x + ox * 1.42 + tx * k, st.y + 3.6, st.z + oz * 1.42 + tz * k, 0.3, 5.4, 0.3, 0, col);
    }
    boxTo(sb, st.x, st.y + 6.5, st.z, 14, 0.45, 136, rot, roof);                                   // canopy
    boxTo(sb, st.x, st.y + 6.95, st.z, 9, 0.5, 120, rot, new THREE.Color(0xe9ecef));
    for (let k = -50; k <= 50; k += 25) boxTo(sb, st.x + tx * k, (st.y - 0.6) / 2, st.z + tz * k, 2.2, st.y - 0.6, 2.2, rot, col);   // concourse piers
    boxTo(sb, st.x, st.y - 2.2, st.z, 18, 3.2, 60, rot, new THREE.Color(0xd8d2c4));                // concourse box under the deck
    const sx = st.x + Math.cos(rot) * 11, sz = st.z - Math.sin(rot) * 11;
    boxTo(sb, sx, st.y / 2, sz, 4.5, st.y, 9, rot, new THREE.Color(0xd8d2c4));                      // stair / lift tower
  }
  if (!sb.empty) { const m = new THREE.Mesh(sb.geometry(), M.vcol); m.castShadow = m.receiveShadow = true; scene.add(m); }
  WorldFix.stats.elevatedStationsBuilt = n;
}
const AIR = { runways: [], helipads: [] };
function buildAirport() {
  const A = WD.air; if (!A) return;
  const ab = new GeoBuf(false, false, true), mk = new GeoBuf(false), yb = new GeoBuf(false);
  areaMesh(A.apron, M.platform, 0.06);
  for (const r of A.runway) {
    const n = r.p.length / 2, xs = [], zs = []; for (let k = 0; k < n; k++) { xs.push(r.p[k * 2] / 10); zs.push(r.p[k * 2 + 1] / 10); }
    const hw = r.w / 20; ribbon(ab, xs, zs, null, hw, hw, 0.11, 0.08);
    const E = { xs, zs, cum: [0], len: 0 }; for (let k = 1; k < n; k++) E.cum.push(E.cum[k - 1] + Math.hypot(xs[k] - xs[k - 1], zs[k] - zs[k - 1])); E.len = E.cum[n - 1];
    for (let s = 40; s < E.len - 40; s += 50) { const [a, b] = subPoly(E, s, s + 30); ribbon(mk, a, b, null, 0.45, 0.45, 0.125); }
    for (const end of [0, 1]) { // threshold piano keys
      const s = end ? E.len - 15 : 15; const t = edgePoint(E, s, 1, {});
      for (let o = -hw + 2; o < hw - 1.5; o += 3.2) ribbon(mk, [t.x + t.tz * o - t.tx * 15, t.x + t.tz * o + t.tx * 15], [t.z - t.tx * o - t.tz * 15, t.z - t.tx * o + t.tz * 15], null, 0.8, 0.8, 0.126);
    }
    for (const s of [0.2, 0.8]) { const [a, b] = subPoly(E, E.len * s - 25, E.len * s + 25); ribbon(mk, a, b, null, hw * 0.55, -hw * 0.35, 0.124); ribbon(mk, a, b, null, -hw * 0.35, hw * 0.55, 0.124); }
    AIR.runways.push({ xs, zs, len: E.len, E, hw });
  }
  for (const r of A.taxi) {
    const n = r.p.length / 2, xs = [], zs = []; for (let k = 0; k < n; k++) { xs.push(r.p[k * 2] / 10); zs.push(r.p[k * 2 + 1] / 10); }
    ribbon(ab, xs, zs, null, r.w / 20, r.w / 20, 0.105, 0.08); ribbon(yb, xs, zs, null, 0.15, 0.15, 0.118);
  }
  for (const h of A.helipad) AIR.helipads.push([h[0] / 10, h[1] / 10]);
  // perimeter fence with gaps where public roads enter the airport
  const fence = WorldFix.fence, fb = new GeoBuf(true), steel = new THREE.Color(0x8d939a); let gaps = 0, segs = 0;
  for (let i = 0; i < fence.length; i++) {
    const p = fence[i], q = fence[(i + 1) % fence.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L / 6));
    const rot = Math.atan2(q[0] - p[0], q[1] - p[1]);
    for (let j = 0; j < n; j++) {
      const a = [p[0] + (q[0] - p[0]) * j / n, p[1] + (q[1] - p[1]) * j / n], b = [p[0] + (q[0] - p[0]) * (j + 1) / n, p[1] + (q[1] - p[1]) * (j + 1) / n];
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, r = roadQuery(mx, mz, 20);
      if ((r.seg && r.d < 4) || inWater(mx, mz) || insideBuilding(mx, mz) >= 0) { gaps++; continue; }
      boxTo(fb, a[0], 1.4, a[1], 0.12, 2.8, 0.12, 0, steel);
      boxTo(fb, mx, 1.35, mz, 0.04, 2.5, Math.hypot(b[0] - a[0], b[1] - a[1]), rot, new THREE.Color(0x6f7680));
      boxTo(fb, mx, 2.85, mz, 0.06, 0.06, Math.hypot(b[0] - a[0], b[1] - a[1]), rot, steel);
      addWallRing([a, b], 2.8); segs++;   // a two-point ring yields both faces
    }
  }
  if (!fb.empty) { const m = new THREE.Mesh(fb.geometry(), M.vcol); m.castShadow = true; scene.add(m); }
  // departures drop-off bay at the main terminal
  const term = G.pois.filter(p => p.t === 'airport' && /terminal/i.test(p.n) && !/cargo/i.test(p.n)).sort((a, b) => b.a - a.a)[0];
  if (term) {
    const r = roadQuery(term.x, term.z, 250, 0);
    if (r.seg) {
      const s_ = r.seg, tx = (s_.bx - s_.ax) / (Math.hypot(s_.bx - s_.ax, s_.bz - s_.az) || 1), tz = (s_.bz - s_.az) / (Math.hypot(s_.bx - s_.ax, s_.bz - s_.az) || 1);
      WorldFix.dropoff = { x: r.px, z: r.pz, h: Math.atan2(tx, tz), name: term.n, tx: term.x, tz: term.z };
      for (let o = -12; o <= 12; o += 3) ribbon(yb, [r.px + tx * o - tz * 2, r.px + tx * o + tz * 2], [r.pz + tz * o + tx * 2, r.pz + tz * o - tx * 2], null, 0.2, 0.2, RY + 0.02);
    }
  }
  WorldFix.stats.fenceSegments = segs; WorldFix.stats.fenceGaps = gaps;
  if (!ab.empty) { const m = new THREE.Mesh(ab.geometry(), M.road); m.receiveShadow = true; scene.add(m); }
  if (!mk.empty) scene.add(new THREE.Mesh(mk.geometry(), M.mark));
  if (!yb.empty) scene.add(new THREE.Mesh(yb.geometry(), M.markY));
}
function buildPiers() {
  const pb = new GeoBuf(false, false, true);
  for (const p of WD.piers || []) {
    if (p.a) continue;
    const n = p.p.length / 2, xs = [], zs = []; for (let k = 0; k < n; k++) { xs.push(p.p[k * 2] / 10); zs.push(p.p[k * 2 + 1] / 10); }
    ribbon(pb, xs, zs, null, p.w / 20, p.w / 20, 1.4, 0.2);
  }
  if (!pb.empty) { const m = new THREE.Mesh(pb.geometry(), M.concrete); m.receiveShadow = true; scene.add(m); }
}
function billboard(x, h, z, nx, nz, cell) {
  const tx = -nz, tz = nx, W = 4.6, H = 2.3, yc = h + 2.6 + H;
  const dark = new THREE.Color(0x2b2b2b);
  // legs + back frame
  for (const s of [-1, 1]) boxTo(decor, x + tx * s * 3, h + (yc - h) / 2, z + tz * s * 3, 0.25, yc - h, 0.25, 0, dark);
  boxTo(decor, x - nx * 0.2, yc, z - nz * 0.2, 9.4, 4.8, 0.3, Math.atan2(-tz, tx), dark);
  const u0 = (cell % 2) / 2, v0 = 1 - (Math.floor(cell / 2) + 1) / 4;
  const fx = x + nx * 0.05, fz = z + nz * 0.05;
  const BL = [fx + tx * W, yc - H, fz + tz * W], BR = [fx - tx * W, yc - H, fz - tz * W], TR = [fx - tx * W, yc + H, fz - tz * W], TL = [fx + tx * W, yc + H, fz + tz * W];
  billBuf.tri(BL, BR, TR, nx, 0, nz, _col, null, null, null, [u0, v0, u0 + 0.5, v0, u0 + 0.5, v0 + 0.25]);
  billBuf.tri(BL, TR, TL, nx, 0, nz, _col, null, null, null, [u0, v0, u0 + 0.5, v0 + 0.25, u0, v0 + 0.25]);
}
function gopuram(cx, cz, h, area, seed) {
  const big = area > 1500;
  const tiers = big ? 8 : 4 + Math.floor(hash2(seed, 3) * 3);
  let w = clamp(Math.sqrt(area) * (big ? 0.55 : 0.5), 5, big ? 16 : 9), d = w * 0.62, y = h;
  const pal = [0xe8c66a, 0xd98a5a, 0x6fb0c9, 0xe0a0b8, 0x9ccc7a, 0xf0e0b0, 0xc8a2e0];
  const c = new THREE.Color();
  boxTo(decor, cx, y + 1.6, cz, w * 1.08, 3.2, d * 1.1, 0, c.setHex(0xeadfc8)); y += 3.2;
  for (let i = 0; i < tiers; i++) {
    const th = big ? 2.6 : 2.1;
    boxTo(decor, cx, y + th / 2, cz, w, th, d, 0, c.setHex(pal[(i + seed) % pal.length]));
    for (let k = -2; k <= 2; k++) boxTo(decor, cx + k * w * 0.2, y + th * 0.55, cz + d / 2 + 0.15, w * 0.08, th * 0.6, 0.3, 0, c.setHex(pal[(i + k + 9) % pal.length]));
    boxTo(decor, cx, y + th + 0.15, cz, w * 1.05, 0.3, d * 1.05, 0, c.setHex(0xf5ead2));
    y += th + 0.3; w *= 0.84; d *= 0.86;
  }
  boxTo(decor, cx, y + 1.1, cz, w * 1.2, 2.2, d * 0.7, 0, c.setHex(0xe7a24c));
  for (let k = -2; k <= 2; k++) cylTo(decor, cx + k * w * 0.22, y + 2.2, cz, 0.05, 0.28, 1.4, 6, c.setHex(0xd8a420));
}
function clockTower(L, key) {
  const red = L.s === 'saracenic';
  const c = new THREE.Color(red ? 0xb8553c : 0xeee6d6), trim = new THREE.Color(red ? 0xf1e9da : 0xc6643f);
  const tall = /central/.test(key) ? 26 : /high court/.test(key) ? 30 : /egmore/.test(key) ? 14 : 10;
  const w = /central|high court/.test(key) ? 8 : 6;
  let y = L.h;
  boxTo(decor, L.cx, y + tall / 2, L.cz, w, tall, w, 0, c); y += tall;
  boxTo(decor, L.cx, y + 0.3, L.cz, w + 1, 0.6, w + 1, 0, trim);
  if (/central/.test(key)) { for (const [ox, oz, r] of [[0, w / 2 + 0.06, 0], [0, -w / 2 - 0.06, 0], [w / 2 + 0.06, 0, Math.PI / 2], [-w / 2 - 0.06, 0, Math.PI / 2]]) boxTo(decor, L.cx + ox, y - 4, L.cz + oz, 3.6, 3.6, 0.1, r, _col.setHex(0xf7f3e6)); }
  cylTo(decor, L.cx, y + 0.6, L.cz, w * 0.42, w * 0.42, 2.5, 10, trim);
  domeTo(decor, L.cx, y + 3.1, L.cz, w * 0.48, red ? trim : c, 4, 12);
  cylTo(decor, L.cx, y + 3.1 + w * 0.55, L.cz, 0.05, 0.3, 2.4, 6, _col.setHex(0xd4a72c));
}
function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const RADIAL = radialTex();
const lightPoolMat = new THREE.MeshBasicMaterial({ map: RADIAL, color: 0xffa64d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
const lampGlowMat = new THREE.PointsMaterial({ map: RADIAL, color: 0xffc27a, size: 4.5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
// ---------- edge geometry helpers ----------
function edgePoint(E, s, dir, out) {
  if (dir < 0) s = E.len - s;
  s = clamp(s, 0, E.len);
  const cum = E.cum; let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
  const segL = cum[hi] - cum[lo] || 1e-6, t = (s - cum[lo]) / segL;
  out.x = E.xs[lo] + (E.xs[hi] - E.xs[lo]) * t; out.z = E.zs[lo] + (E.zs[hi] - E.zs[lo]) * t; out.y = E.ys ? E.ys[lo] + (E.ys[hi] - E.ys[lo]) * t : 0;
  let tx = E.xs[hi] - E.xs[lo], tz = E.zs[hi] - E.zs[lo]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  if (dir < 0) { tx = -tx; tz = -tz; }
  out.tx = tx; out.tz = tz;
  return out;
}
const NC = 60, nodeGrid = new Map();
function buildNodeGrid() { G.nodes.forEach((n, i) => { if (n.adj.length) gridAdd(nodeGrid, NC, n.x, n.z, n.x, n.z, i); }); }
function nearestNode(x, z, maxR = 400) {
  let best = -1, bd = 1e18;
  for (let r = 0; r <= Math.ceil(maxR / NC); r++) {
    const cx = Math.floor(x / NC), cz = Math.floor(z / NC);
    for (let ix = cx - r; ix <= cx + r; ix++) for (let iz = cz - r; iz <= cz + r; iz++) {
      if (r > 0 && Math.abs(ix - cx) < r && Math.abs(iz - cz) < r) continue;
      const a = nodeGrid.get(gkey(ix, iz)); if (!a) continue;
      for (const i of a) { const n = G.nodes[i]; const d = dist2(x, z, n.x, n.z); if (d < bd) { bd = d; best = i; } }
    }
    if (best >= 0 && Math.sqrt(bd) < r * NC) break;
  }
  return best;
}
function astar(s, t) {
  if (s < 0 || t < 0) return null;
  const N = G.nodes.length; const gS = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), cameE = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = []; const T = G.nodes[t];
  const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (; ;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break;[heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  gS[s] = 0; push(s, 0); let iter = 0;
  while (heap.length && iter++ < 60000) {
    const [, u] = pop(); if (closed[u]) continue; closed[u] = 1; if (u === t) break;
    const U = G.nodes[u];
    for (const a of U.adj) {
      const ng = gS[u] + a.w; if (ng < gS[a.n]) { gS[a.n] = ng; came[a.n] = u; cameE[a.n] = a.e; const V = G.nodes[a.n]; push(a.n, ng + Math.hypot(V.x - T.x, V.z - T.z)); }
    }
  }
  if (came[t] < 0 && s !== t) return null;
  const path = []; let c = t; while (c !== s && c >= 0) { path.push({ n: c, e: cameE[c] }); c = came[c]; } path.reverse();
  return path;
}
function pathPolyline(s, path) {
  const out = []; let cur = s;
  for (const step of path) {
    const E = G.edges[step.e]; const dir = E.a === cur ? 1 : -1;
    const n = E.xs.length;
    for (let k = 0; k < n; k++) { const kk = dir > 0 ? k : n - 1 - k; out.push([E.xs[kk], E.zs[kk]]); }
    cur = step.n;
  }
  return out;
}
