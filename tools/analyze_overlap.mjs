// Overlap audit: buildings sitting on rail corridors, runways/taxiways/aprons; platforms next to elevated track.
import fs from 'fs';
const dir = process.argv[2] || new URL('../data/', import.meta.url).pathname;
const WD = Object.assign({}, JSON.parse(fs.readFileSync(dir + '/world-a.json')), JSON.parse(fs.readFileSync(dir + '/world-b.json')));
const undelta = p => { const o = p.slice(); for (let i = 2; i < o.length; i++) o[i] += o[i - 2]; return o; };
const pts = p => { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i] / 10, p[i + 1] / 10]); return o; };
const pip = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const C = 20, grid = new Map(), B = [];
WD.buildings.forEach((b, i) => { const P = pts(undelta(b.p)); let a = 1e9, c = -1e9, d = 1e9, e = -1e9; for (const [x, z] of P) { a = Math.min(a, x); c = Math.max(c, x); d = Math.min(d, z); e = Math.max(e, z); } const r = { i, P, minx: a, maxx: c, minz: d, maxz: e, h: b.h / 10 }; B.push(r); for (let ix = Math.floor(a / C); ix <= Math.floor(c / C); ix++) for (let iz = Math.floor(d / C); iz <= Math.floor(e / C); iz++) { const k = ix + ',' + iz; (grid.get(k) || grid.set(k, []).get(k)).push(r); } });
const at = (x, z) => { const a = grid.get(Math.floor(x / C) + ',' + Math.floor(z / C)); if (!a) return null; for (const b of a) if (x >= b.minx && x <= b.maxx && z >= b.minz && z <= b.maxz && pip(x, z, b.P)) return b; return null; };
function sweep(P, ys, hw, step = 3) { const hits = new Set(); for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1]; const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / (L || 1), tz = (bz - az) / (L || 1); for (let s = 0; s <= L; s += step) { const y = ys ? ys[i] + (ys[i + 1] - ys[i]) * s / (L || 1) : 0; for (let o = -hw; o <= hw; o += Math.max(1, hw / 2)) { const b = at(ax + tx * s + tz * o, az + tz * s - tx * o); if (b && b.h > y + 0.5 && y < b.h) hits.add(b.i); } } } return hits; }
const res = {};
const rh = new Set(); for (const r of WD.rails) for (const i of sweep(pts(r.p), r.h.map(h => h / 10), 2.2)) rh.add(i); res.buildingsOnRailCorridor = rh.size;
const A = WD.air; const ah = { runway: new Set(), taxi: new Set() };
for (const r of A.runway) for (const i of sweep(pts(r.p), null, r.w / 20 + 10, 4)) ah.runway.add(i);
for (const r of A.taxi) for (const i of sweep(pts(r.p), null, r.w / 20 + 4, 3)) ah.taxi.add(i);
res.buildingsOnRunway = ah.runway.size; res.buildingsOnTaxiway = ah.taxi.size;
res.sampleRunwayHits = [...ah.runway].slice(0, 5).map(i => ({ i, h: B[i].h, c: B[i].P[0] }));
res.sampleTaxiHits = [...ah.taxi].slice(0, 5).map(i => ({ i, h: B[i].h, c: B[i].P[0], area: 0 }));
// platforms near elevated track
let platElev = 0; for (const d of WD.areas.platform) { const P = pts(d.p); let cx = 0, cz = 0; for (const [x, z] of P) { cx += x; cz += z; } cx /= P.length; cz /= P.length; let best = 1e9, by = 0; for (const r of WD.rails) { const Q = pts(r.p); for (let k = 0; k < Q.length; k++) { const dd = Math.hypot(Q[k][0] - cx, Q[k][1] - cz); if (dd < best) { best = dd; by = r.h[k] / 10; } } } if (best < 40 && by > 3) platElev++; }
res.platforms = WD.areas.platform.length; res.platformsBesideElevatedTrack = platElev;
console.log(JSON.stringify(res, null, 1));
