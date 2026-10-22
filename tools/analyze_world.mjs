// World-data audit: reports geometry problems (floating decks, rail grades, airport overlaps, road gaps).
// Usage: node tools/analyze_world.mjs [data-dir]
import fs from 'fs';
const dir = process.argv[2] || new URL('../data/', import.meta.url).pathname;
const WD = Object.assign({}, JSON.parse(fs.readFileSync(dir + '/world-a.json')), JSON.parse(fs.readFileSync(dir + '/world-b.json')));
const undelta = p => { const o = p.slice(); for (let i = 2; i < o.length; i++) o[i] += o[i - 2]; return o; };
const pts = p => { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i] / 10, p[i + 1] / 10]); return o; };
const pip = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; let t = L2 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const out = {};
// ---- roads ----
const nodes = WD.nodes.map(n => ({ x: n[0] / 10, z: n[1] / 10, y: n[2] / 10, e: [] }));
const edges = WD.edges.map((e, i) => { const P = pts(undelta(e.p)); const ys = e.h ? e.h.map(h => h / 10) : P.map(() => 0); nodes[e.a].e.push(i); nodes[e.b].e.push(i); return { i, P, ys, a: e.a, b: e.b, hw: e.w / 20, c: e.c, t: !!e.t, elev: !!e.h, br: !!e.br }; });
let floatEnds = 0, steep = 0, elevMismatch = 0;
for (const E of edges) if (E.elev) {
  for (const [ni, k] of [[E.a, 0], [E.b, E.P.length - 1]]) {
    const y = E.ys[k]; if (y < 0.5) continue;
    const others = nodes[ni].e.filter(j => j !== E.i).map(j => { const F = edges[j]; return F.a === ni ? F.ys[0] : F.ys[F.ys.length - 1]; });
    if (!others.length) floatEnds++; else if (!others.some(o => Math.abs(o - y) < 0.6)) elevMismatch++;
  }
  for (let k = 0; k < E.P.length - 1; k++) { const d = Math.hypot(E.P[k + 1][0] - E.P[k][0], E.P[k + 1][1] - E.P[k][1]); if (d > 0.5 && Math.abs(E.ys[k + 1] - E.ys[k]) / d > 0.12) steep++; }
}
const dead = nodes.filter(n => n.e.length === 1 && edges[n.e[0]].c <= 3);
const BX0 = WD.meta.bounds[0] / 10, BZ0 = WD.meta.bounds[1] / 10, BX1 = WD.meta.bounds[2] / 10, BZ1 = WD.meta.bounds[3] / 10;
const deadInner = dead.filter(n => n.x > BX0 + 40 && n.x < BX1 - 40 && n.z > BZ0 + 40 && n.z < BZ1 - 40);
// gap: dead-end within 8 m of another drivable edge it isn't connected to
const RC = 25, grid = new Map(); const k = (x, z) => Math.floor(x / RC) + ',' + Math.floor(z / RC);
edges.forEach(E => { if (E.c > 3) return; for (let s = 0; s < E.P.length - 1; s++) { const [ax, az] = E.P[s]; const kk = k(ax, az); (grid.get(kk) || grid.set(kk, []).get(kk)).push([E, s]); } });
let gaps = 0; for (const n of deadInner) { const own = n.e[0]; let best = 1e9; for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) for (const [E, s] of grid.get((Math.floor(n.x / RC) + ix) + ',' + (Math.floor(n.z / RC) + iz)) || []) { if (E.i === own || E.elev) continue; const d = segDist(n.x, n.z, ...E.P[s], ...E.P[s + 1]); if (d < best) best = d; } if (best > 0.5 && best < 8) gaps++; }
out.roads = { edges: edges.length, elevated: edges.filter(e => e.elev).length, bridges: edges.filter(e => e.br).length, elevatedFloatingEnds: floatEnds, elevatedHeightMismatchAtJoins: elevMismatch, elevatedSteepSegments: steep, deadEndsInner: deadInner.length, deadEndsWithin8mOfAnotherRoad: gaps };
// ---- rails ----
let railSteep = 0, railMaxGrade = 0, railAirEnds = 0, railJumps = 0;
for (const r of WD.rails) { const P = pts(r.p), ys = r.h.map(h => h / 10); for (let i = 0; i < P.length - 1; i++) { const d = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); const g = Math.abs(ys[i + 1] - ys[i]) / Math.max(d, 0.1); railMaxGrade = Math.max(railMaxGrade, g); if (g > 0.04) railSteep++; if (Math.abs(ys[i + 1] - ys[i]) > 3 && d < 20) railJumps++; } if (ys[0] > 1 || ys[ys.length - 1] > 1) railAirEnds++; }
out.rails = { lines: WD.rails.length, segmentsSteeperThan4pct: railSteep, maxGrade: +railMaxGrade.toFixed(3), heightJumpsOver3mIn20m: railJumps, linesEndingInMidAir: railAirEnds };
// ---- airport ----
const A = WD.air; const strips = [...A.runway.map(r => ({ P: pts(r.p), hw: r.w / 20 + 25, kind: 'runway' })), ...A.taxi.map(r => ({ P: pts(r.p), hw: r.w / 20 + 6, kind: 'taxi' }))];
const aprons = A.apron.map(a => pts(a.p));
let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (const s of strips) for (const [x, z] of s.P) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); }
let onRunway = 0, onTaxi = 0, onApron = 0, roadsOnRunway = 0;
for (const b of WD.buildings) { const P = pts(undelta(b.p)); let cx = 0, cz = 0; for (const [x, z] of P) { cx += x; cz += z; } cx /= P.length; cz /= P.length; if (cx < minx - 200 || cx > maxx + 200 || cz < minz - 200 || cz > maxz + 200) continue;
  const test = [[cx, cz], ...P]; let hitR = false, hitT = false;
  for (const s of strips) for (let i = 0; i < s.P.length - 1 && !(s.kind === 'runway' ? hitR : hitT); i++) for (const [x, z] of test) if (segDist(x, z, ...s.P[i], ...s.P[i + 1]) < s.hw) { if (s.kind === 'runway') hitR = true; else hitT = true; break; }
  if (hitR) onRunway++; else if (hitT) onTaxi++; else if (aprons.some(ap => pip(cx, cz, ap))) onApron++; }
for (const E of edges) for (const [x, z] of E.P) if (A.runway.some(r => { const P = pts(r.p); for (let i = 0; i < P.length - 1; i++) if (segDist(x, z, ...P[i], ...P[i + 1]) < r.w / 20) return true; return false; })) { roadsOnRunway++; break; }
out.airport = { runways: A.runway.length, taxiways: A.taxi.length, aprons: A.apron.length, buildingsOnRunwayStrip: onRunway, buildingsOnTaxiways: onTaxi, buildingsOnApron: onApron, roadEdgesCrossingRunway: roadsOnRunway, airportPois: WD.pois.filter(p => p.t === 'airport').map(p => [p.n, p.x / 10, p.z / 10, p.a]) };
out.transit = { stations: WD.pois.filter(p => p.t === 'station').length, metro: WD.pois.filter(p => p.t === 'metro').length };
console.log(JSON.stringify(out, null, 1));
