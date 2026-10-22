// ===================== WORLD FIX-UP PASS (runs on the raw map data before the city is built) =====================
// The raw OpenStreetMap tiles are not shipped, so geometry problems are corrected at load time:
//  * rail: junction heights unified, grades limited to 4 %, viaducts that ended in mid-air ramp down into tunnel portals
//  * roads: dead ends that stop a few metres short of another road are stitched with short connector edges
//  * airport: buildings / trees / lamp posts inside runway, taxiway and apron safety zones are removed; perimeter fence
//  * rail corridor: buildings standing on the tracks are removed
const WorldFix = {
  stats: {}, dropB: new Set(), portals: [], airZones: [], fence: [], dropoff: null,
  RAIL_GRADE: 0.04, PORTAL_DEPTH: -7.5,
  apply(WD) {
    const t0 = performance.now();
    this.bounds = WD.meta.bounds.map(v => v / 10);
    this.fixRails(WD); this.stitchRoads(WD); this.airport(WD); this.clearCorridors(WD);
    this.stats.ms = Math.round(performance.now() - t0);
    EventBus.emit('world:fixed', this.stats);
    if (window.__memlog) console.log('WorldFix', JSON.stringify(this.stats));
  },
  nearBoundary(x, z, m = 60) { const [a, b, c, d] = this.bounds; return x < a + m || x > c - m || z < b + m || z > d - m; },
  // ---------------- rail profile ----------------
  fixRails(WD) {
    const R = WD.rails; let unified = 0, portals = 0, limited = 0;
    const C = 10, grid = new Map(), key = (x, z) => Math.floor(x / C) + ',' + Math.floor(z / C);
    R.forEach((r, li) => { for (let k = 0; k < r.p.length / 2; k++) { const kk = key(r.p[k * 2] / 10, r.p[k * 2 + 1] / 10); (grid.get(kk) || grid.set(kk, []).get(kk)).push([li, k]); } });
    const neighbours = (li, x, z) => { const out = []; const ix = Math.floor(x / C), iz = Math.floor(z / C); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [lj, k] of grid.get((ix + a) + ',' + (iz + b)) || []) { if (lj === li) continue; const r = R[lj]; if (Math.hypot(r.p[k * 2] / 10 - x, r.p[k * 2 + 1] / 10 - z) < 4) out.push(r.h[k] / 10); } return out; };
    // twin tracks: a line whose heights were never recorded (all ~0) but runs right alongside an elevated line is lifted onto the deck
    const SC = 20, sgrid = new Map(); let twins = 0;
    R.forEach((r, li) => { for (let k = 0; k < r.p.length / 2 - 1; k++) { if (r.h[k] < 30 && r.h[k + 1] < 30) continue; const x = r.p[k * 2] / 10, z = r.p[k * 2 + 1] / 10, kk = Math.floor(x / SC) + ',' + Math.floor(z / SC); (sgrid.get(kk) || sgrid.set(kk, []).get(kk)).push([li, k]); } });
    const deckAt = (li, x, z) => { let best = null, bd = 9; const ix = Math.floor(x / SC), iz = Math.floor(z / SC);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [lj, k] of sgrid.get((ix + a) + ',' + (iz + b)) || []) { if (lj === li) continue; const o = R[lj], ax = o.p[k * 2] / 10, az = o.p[k * 2 + 1] / 10, bx = o.p[k * 2 + 2] / 10, bz = o.p[k * 2 + 3] / 10, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; let t = L2 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0; t = clamp(t, 0, 1); const d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < bd) { bd = d; best = (o.h[k] + (o.h[k + 1] - o.h[k]) * t) / 10; } }
      return best; };
    R.forEach((r, li) => {
      const n = r.p.length / 2; if (Math.max(...r.h) > 30) return;   // lines already above 3 m keep their own profile
      const lift = []; let hits = 0; for (let k = 0; k < n; k++) { const h = deckAt(li, r.p[k * 2] / 10, r.p[k * 2 + 1] / 10); lift.push(h); if (h !== null && h > 3) hits++; }
      const len = r.L || 1e9; if (hits < Math.max(2, n * (len < 400 ? 0.3 : 0.5))) return;   // short crossovers / sidings sit alongside the deck for part of their length
      for (let k = 0; k < n; k++) if (lift[k] !== null && lift[k] > 1) r.h[k] = Math.round(lift[k] * 10);
      twins++;
    });
    this.stats.railTwinTracksLifted = twins;
    for (let li = 0; li < R.length; li++) {
      const r = R[li], n = r.p.length / 2, P = [], H = [];
      for (let k = 0; k < n; k++) { P.push([r.p[k * 2] / 10, r.p[k * 2 + 1] / 10]); H.push(r.h[k] / 10); }
      const fixed = new Array(n).fill(false);
      for (const k of [0, n - 1]) {
        const [x, z] = P[k], nb = neighbours(li, x, z);
        if (nb.length) {
          // a junction: take the height of the connecting track that best continues this line (ignore lines it merely passes under/over)
          const adj = H[k === 0 ? Math.min(1, n - 1) : Math.max(0, n - 2)];
          const pickH = [H[k], ...nb].reduce((b, h) => Math.abs(h - adj) < Math.abs(b - adj) ? h : b, H[k]);
          if (Math.abs(pickH - H[k]) > 0.5) { H[k] = pickH; unified++; } fixed[k] = true;
        }
        else if (H[k] > 1 && !this.nearBoundary(x, z)) {
          const deck = deckAt(li, x, z);
          if (deck !== null && deck > 3) { H[k] = deck; fixed[k] = true; unified++; }        // ends beside a viaduct: stay on the deck
          else { H[k] = this.PORTAL_DEPTH; fixed[k] = true; portals++; this.portals.push({ li, k, x, z }); }
        }
      }
      // grade limit: only lower the high side, so portals and junction heights are kept
      const cum = [0]; for (let k = 1; k < n; k++) cum.push(cum[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
      for (let pass = 0; pass < 2; pass++) {
        for (let k = 1; k < n; k++) { const lim = H[k - 1] + this.RAIL_GRADE * (cum[k] - cum[k - 1]); if (H[k] > lim + 1e-3 && !(fixed[k] && H[k] > 0)) { H[k] = lim; limited++; } }
        for (let k = n - 2; k >= 0; k--) { const lim = H[k + 1] + this.RAIL_GRADE * (cum[k + 1] - cum[k]); if (H[k] > lim + 1e-3 && !(fixed[k] && H[k] > 0)) { H[k] = lim; limited++; } }
      }
      // raise pass: low track next to a fixed high point (junction with a viaduct) climbs to it at the same grade
      for (let k = 0; k < n; k++) if (fixed[k] && H[k] > 0) for (let j = 0; j < n; j++) { const up = H[k] - this.RAIL_GRADE * Math.abs(cum[j] - cum[k]); if (up > H[j] + 1e-3) { H[j] = up; limited++; } }
      // the stored polyline is coarse: densify long sloped segments so trains and decks follow the ramp smoothly
      const np = [], nh = [];
      for (let k = 0; k < n; k++) {
        np.push(r.p[k * 2], r.p[k * 2 + 1]); nh.push(Math.round(H[k] * 10));
        if (k < n - 1 && Math.abs(H[k + 1] - H[k]) > 0.8) { const seg = cum[k + 1] - cum[k], m = Math.min(24, Math.floor(seg / 12)); for (let j = 1; j < m; j++) { const t = j / m; np.push(Math.round(r.p[k * 2] + (r.p[k * 2 + 2] - r.p[k * 2]) * t), Math.round(r.p[k * 2 + 1] + (r.p[k * 2 + 3] - r.p[k * 2 + 1]) * t)); nh.push(Math.round((H[k] + (H[k + 1] - H[k]) * t) * 10)); } }
      }
      r.p = np; r.h = nh;
    }
    for (const p of this.portals) { const r = R[p.li], n = r.p.length / 2, k = p.k === 0 ? 0 : n - 1; p.x = r.p[k * 2] / 10; p.z = r.p[k * 2 + 1] / 10; p.end = p.k !== 0; }
    Object.assign(this.stats, { railJunctionsUnified: unified, railTunnelPortals: portals, railGradeFixes: limited });
  },
  // ---------------- road gaps ----------------
  stitchRoads(WD) {
    const enc = WD.meta.delta, und = p => { if (!enc) return p; const o = p.slice(); for (let i = 2; i < o.length; i++) o[i] += o[i - 2]; return o; };
    const enco = p => { if (!enc) return p; const o = p.slice(); for (let i = o.length - 1; i >= 2; i--) o[i] -= o[i - 2]; return o; };
    const E = WD.edges, N = WD.nodes, deg = new Uint16Array(N.length), dec = E.map(e => und(e.p));
    for (const e of E) { deg[e.a]++; deg[e.b]++; }
    const C = 20, grid = new Map(), key = (x, z) => Math.floor(x / C) + ',' + Math.floor(z / C);
    E.forEach((e, i) => { if (e.c > 3 || e.h) return; const p = dec[i]; for (let k = 0; k < p.length / 2; k++) { const kk = key(p[k * 2] / 10, p[k * 2 + 1] / 10); (grid.get(kk) || grid.set(kk, []).get(kk)).push([i, k]); } });
    const replaced = new Set(); let stitched = 0, split = 0;
    const nE = E.length;
    for (let ni = 0; ni < N.length; ni++) {
      if (deg[ni] !== 1) continue;
      const x = N[ni][0] / 10, z = N[ni][1] / 10; if (this.nearBoundary(x, z, 40)) continue;
      // own edge + its outward direction at this dead end
      let oi = -1; for (const kk of [key(x, z)]) for (const [i] of grid.get(kk) || []) { const e = E[i]; if (e.a === ni || e.b === ni) { oi = i; break; } }
      if (oi < 0 || replaced.has(oi)) continue;
      const oe = E[oi], op = dec[oi], m = op.length / 2, atA = oe.a === ni;
      const px = op[(atA ? 1 : m - 2) * 2] / 10, pz = op[(atA ? 1 : m - 2) * 2 + 1] / 10; let dx = x - px, dz = z - pz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      let best = null, bd = 8;
      const ix = Math.floor(x / C), iz = Math.floor(z / C);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [i, k] of grid.get((ix + a) + ',' + (iz + b)) || []) {
        if (i === oi || replaced.has(i)) continue; const e = E[i]; if (e.a === ni || e.b === ni || e.a === (atA ? oe.b : oe.a) || e.b === (atA ? oe.b : oe.a)) continue;
        const vx = dec[i][k * 2] / 10, vz = dec[i][k * 2 + 1] / 10, d = Math.hypot(vx - x, vz - z);
        if (d < 0.5 || d >= bd) continue; if (((vx - x) * dx + (vz - z) * dz) / d < 0.3) continue;   // must continue the road, not jump sideways
        bd = d; best = [i, k, vx, vz];
      }
      if (!best) continue;
      const [fi, k, vx, vz] = best, fe = E[fi], fp = dec[fi], fm = fp.length / 2;
      let target;
      if (k === 0) target = fe.a; else if (k === fm - 1) target = fe.b;
      else { // split the other edge at vertex k
        target = N.length; N.push([fp[k * 2], fp[k * 2 + 1], 0]); split++;
        const p1 = fp.slice(0, (k + 1) * 2), p2 = fp.slice(k * 2);
        const e2 = Object.assign({}, fe, { a: target, b: fe.b, p: enco(p2) }); delete e2.h;
        fe.b = target; fe.p = enco(p1); dec[fi] = p1; replaced.add(fi); E.push(e2); dec.push(p2);
      }
      E.push({ a: ni, b: target, p: enco([N[ni][0], N[ni][1], Math.round(vx * 10), Math.round(vz * 10)]), w: Math.min(oe.w, fe.w), c: Math.max(oe.c, fe.c), o: 0, n: oe.n, t: oe.t && fe.t ? 1 : 0, fx: 1 });
      dec.push(null); deg[ni]++; stitched++;
    }
    Object.assign(this.stats, { roadGapsStitched: stitched, roadEdgesSplit: split, roadEdgesBefore: nE, roadEdgesAfter: E.length });
  },
  // ---------------- airport ----------------
  airport(WD) {
    const A = WD.air; if (!A) return;
    const P = p => { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i] / 10, p[i + 1] / 10]); return o; };
    for (const r of A.runway) this.airZones.push({ kind: 'runway', P: P(r.p), hw: r.w / 20 + 30 });
    for (const r of A.taxi) this.airZones.push({ kind: 'taxi', P: P(r.p), hw: r.w / 20 + 6 });
    this.aprons = A.apron.map(a => { const pts = P(a.p); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { pts, x0, x1, z0, z1 }; });
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const zn of this.airZones) for (const [x, z] of zn.P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    this.airBox = [x0 - 80, z0 - 80, x1 + 80, z1 + 80];
    // perimeter fence: convex hull of the airside, pushed out 45 m
    const pts = []; for (const zn of this.airZones) for (const p of zn.P) pts.push(p); for (const a of this.aprons) for (const p of a.pts) pts.push(p);
    const hull = convexHull(pts); const [cx, cz] = centroid(hull);
    this.fence = hull.map(([x, z]) => { const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1; return [x + dx / l * 45, z + dz / l * 45]; });
    // nothing taller than grass inside the fence (obstacle-free infield); lamp posts only off the airside strips
    const inFence = (x, z) => x > this.airBox[0] && x < this.airBox[2] && z > this.airBox[1] && z < this.airBox[3] && pointInPoly(x, z, hull);
    const nt = WD.trees.length, nl = WD.lights.length;
    WD.trees = WD.trees.filter(t => !inFence(t[0] / 10, t[1] / 10)); WD.lights = WD.lights.filter(t => !this.inAirside(t[0] / 10, t[1] / 10));
    Object.assign(this.stats, { airportTreesRemoved: nt - WD.trees.length, airportLampsRemoved: nl - WD.lights.length });
  },
  inAirside(x, z, pad = 0) {
    const b = this.airBox; if (!b || x < b[0] || x > b[2] || z < b[1] || z > b[3]) return false;
    for (const zn of this.airZones) for (let i = 0; i < zn.P.length - 1; i++) if (segDist(x, z, zn.P[i][0], zn.P[i][1], zn.P[i + 1][0], zn.P[i + 1][1]) < zn.hw + pad) return true;
    for (const a of this.aprons) if (x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1 && pointInPoly(x, z, a.pts)) return true;
    return false;
  },
  // ---------------- buildings on the tracks / airside ----------------
  clearCorridors(WD) {
    const enc = WD.meta.delta, C = 20, grid = new Map(), recs = [];
    WD.buildings.forEach((b, i) => {
      const p = b.p, o = []; let ax = 0, az = 0;
      for (let k = 0; k < p.length; k += 2) { if (enc && k >= 2) { ax += p[k]; az += p[k + 1]; } else { ax = p[k]; az = p[k + 1]; } o.push([ax / 10, az / 10]); }
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of o) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const r = { i, o, x0, x1, z0, z1, h: b.h / 10 }; recs.push(r);
      for (let ix = Math.floor(x0 / C); ix <= Math.floor(x1 / C); ix++) for (let iz = Math.floor(z0 / C); iz <= Math.floor(z1 / C); iz++) { const k = ix + ',' + iz; (grid.get(k) || grid.set(k, []).get(k)).push(r); }
    });
    const at = (x, z) => { const a = grid.get(Math.floor(x / C) + ',' + Math.floor(z / C)); if (!a) return null; for (const r of a) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && pointInPoly(x, z, r.o)) return r; return null; };
    let rail = 0, air = 0;
    for (const L of WD.rails) {
      const n = L.p.length / 2;
      for (let k = 0; k < n - 1; k++) {
        const ax = L.p[k * 2] / 10, az = L.p[k * 2 + 1] / 10, bx = L.p[k * 2 + 2] / 10, bz = L.p[k * 2 + 3] / 10, len = Math.hypot(bx - ax, bz - az) || 1, tx = (bx - ax) / len, tz = (bz - az) / len;
        for (let s = 0; s <= len; s += 3) {
          const y = (L.h[k] + (L.h[k + 1] - L.h[k]) * s / len) / 10; if (y < -1) continue;
          for (const o of [-2.2, 0, 2.2]) { const r = at(ax + tx * s + tz * o, az + tz * s - tx * o); if (r && !this.dropB.has(r.i) && y < r.h + 0.5) { this.dropB.add(r.i); rail++; } }
        }
      }
    }
    for (const r of recs) {
      if (this.dropB.has(r.i)) continue; const b = this.airBox; if (!b || r.x1 < b[0] || r.x0 > b[2] || r.z1 < b[1] || r.z0 > b[3]) continue;
      const [cx, cz] = centroid(r.o); const area = Math.abs(signedArea(r.o));
      // terminals and hangars border the apron: only small structures that sit on the airside are removed
      if (area < 4000 && (this.inAirside(cx, cz) || r.o.some(([x, z]) => this.inAirside(x, z, -2)))) { this.dropB.add(r.i); air++; }
    }
    Object.assign(this.stats, { buildingsOnRailRemoved: rail, buildingsOnAirsideRemoved: air });
  },
};
function segDist(x, z, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; let t = L2 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(x - ax - dx * t, z - az - dz * t); }
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}
