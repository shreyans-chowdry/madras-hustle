// ===================== TRANSIT & TRAFFIC IN THE AIR AND AT SEA =====================
function spawnTrains() {
  railLines.forEach((L, i) => {
    if (L.len < 2500 || !L.stops.length) return;
    const n = L.len > 12000 ? 3 : L.len > 6000 ? 2 : 1;
    for (let k = 0; k < n; k++) new Train(L, clamp(L.len * (k + 0.5) / n, 150, L.len - 150), k % 2 ? 1 : -1, L.len > 8000 ? 9 : 6);
  });
}
function trainMenu(s) {
  // fast travel between stations by train
  const here = s; const dests = services.filter(q => q.type === 'station' && q !== here).map(q => [q, Math.hypot(q.x - here.x, q.z - here.z)]).filter(([, d]) => d > 800).sort((a, b) => a[1] - b[1]).slice(0, 7);
  const items = dests.map(([q, d]) => { const fare = Math.round(10 + d * 0.004); return { label: `Ride to ${q.name || 'station'} · ${(d / 1000).toFixed(1)} km`, price: fare, action: () => { fastTravel(q.x, q.z, `Arrived at ${q.name}`); return 'close'; } }; });
  items.push({ label: 'Not now', action: () => 'close' });
  Menu.show(here.name || 'Railway Station', 'Suburban and metro trains', items);
}
function fastTravel(x, z, msg) {
  fadeFlash(); hour = (hour + 0.4) % 24;
  setTimeout(() => { if (player.veh) exitVehicle(); player.x = x; player.z = z; player.y = sidewalkY(x, z); camSmoothed = false; updateChunks(x, z, 1e9, true); toast(msg); }, 150);
}
// board a moving train when it is stopped next to you
function trainBoarding() {
  if (player.veh || player.interior || player.dead) return;
  if (Metro.ride && player.onTrain === Metro.ride.T) { Metro.rideUpdate(1 / 60); return; }
  if (player.onTrain) {
    const T = player.onTrain; const c = T.coaches[Math.floor(T.n / 2)];
    player.x = c.position.x; player.z = c.position.z; player.y = c.position.y + 1.1; player.h = c.rotation.y;
    prompt(T.speed < 0.5 ? '<kbd>F</kbd> Get off the train' : 'Riding the train');
    if (In.act('enter') && T.speed < 0.5) { player.onTrain = null; const fx = Math.sin(c.rotation.y), fz = Math.cos(c.rotation.y); player.x += fz * 3.2; player.z -= fx * 3.2; player.y = c.position.y; pMesh.root.visible = true; }
    return;
  }
  for (const T of trains) {
    if (T.speed > 0.3) continue;
    for (const c of T.coaches) if (dist2(c.position.x, c.position.z, player.x, player.z) < 7 * 7 && Math.abs(c.position.y - player.y) < 3) {
      prompt('<kbd>F</kbd> Board the train'); if (In.act('enter')) { player.onTrain = T; pMesh.root.visible = false; toast('All aboard'); }
      return;
    }
  }
}
// ---------- airliners ----------
const flights = [];
let flightT = 8;
function updateFlights(dt) {
  if (!AIR.runways.length) return;
  flightT -= dt;
  if (flightT <= 0 && flights.length < 3) {
    flightT = 50 + Math.random() * 50;
    const rw = AIR.runways.slice().sort((a, b) => b.len - a.len)[Math.random() < 0.7 ? 0 : Math.min(1, AIR.runways.length - 1)];
    const dep = Math.random() < 0.5, rev = Math.random() < 0.5;
    const a = edgePoint(rw.E, rev ? rw.len - 60 : 60, rev ? -1 : 1, {});
    const v = new Vehicle('airliner', pick([0x1f4fb3, 0xc8251c, 0x178a45, 0xf2a01f, 0x6a1fb3]), a.x, a.z, headingTo(a.tx, a.tz));
    v.driver = 'ai'; v.persist = true; v.flight = { dep, rw, tx: a.tx, tz: a.tz, phase: dep ? 'roll' : 'approach', t: 0 };
    if (!dep) { // start on final approach 6 km out
      v.x = a.x - a.tx * 6000; v.z = a.z - a.tz * 6000; v.y = 6000 * Math.tan(3 * Math.PI / 180) + 2; v.pitch = -0.05; v.thr = 0.4;
      const sp = 75; v.vx = a.tx * sp; v.vz = a.tz * sp; v.vy = -sp * Math.tan(3 * Math.PI / 180); v.tdx = a.x; v.tdz = a.z;
    }
    traffic.push(v); flights.push(v);
  }
  for (let i = flights.length - 1; i >= 0; i--) {
    const v = flights[i], F = v.flight;
    if (v.dead || v.wreck || v.driver === 'player') { flights.splice(i, 1); if (!v.dead && !v.wreck) { } continue; }
    F.t += dt;
    let sp = Math.hypot(v.vx, v.vz, v.vy);
    if (F.phase === 'roll') { sp = Math.min(sp + 3.2 * dt, 85); v.vx = F.tx * sp; v.vz = F.tz * sp; if (sp > 72) F.phase = 'climb'; }
    else if (F.phase === 'climb') { if (v.y > 40) v.gearDown = false; v.pitch += (0.17 - v.pitch) * dt; sp = Math.min(sp + 1.5 * dt, 110); v.vy = Math.sin(v.pitch) * sp; const hz = Math.cos(v.pitch) * sp; v.vx = F.tx * hz; v.vz = F.tz * hz; if (v.y > 900) { v.remove(); flights.splice(i, 1); continue; } }
    else if (F.phase === 'approach') { if (v.y < 300) v.gearDown = true; const dleft = Math.hypot(v.tdx - v.x, v.tdz - v.z); const want = Math.max(0, dleft * Math.tan(3 * Math.PI / 180)); v.vy = clamp((want - v.y) * 0.8, -6, 2); if (v.y < 3) { F.phase = 'rollout'; v.y = 0; v.pitch = 0; } }
    else if (F.phase === 'rollout') { sp = Math.max(0, sp - 3.5 * dt); v.vx = F.tx * sp; v.vz = F.tz * sp; v.vy = 0; if (sp === 0) { F.phase = 'parked'; F.t = 0; } }
    else if (F.phase === 'parked') { if (F.t > 60 && dist2(v.x, v.z, player.x, player.z) > 600 * 600) { v.remove(); flights.splice(i, 1); continue; } }
    v.x += v.vx * dt; v.z += v.vz * dt; v.y = Math.max(0, v.y + v.vy * dt);
    if (F.phase === 'approach') v.pitch += (0.06 - v.pitch) * dt;
  }
}
// ---------- ships at sea ----------
const ships = [];
function updateShips(dt) {
  if (ships.length < 3 && Math.random() < 0.01) {
    const z = BZ0 + Math.random() * (BZ1 - BZ0), x = BX1 + 300 + Math.random() * 700, dir = Math.random() < 0.5 ? 0 : Math.PI;
    if (inWater(x, z) || x > BX1) { const v = new Vehicle('cargo', 0x9b2a20, x, z, dir); v.driver = 'ai'; v.persist = true; v.shipDir = dir; traffic.push(v); ships.push(v); }
  }
  for (let i = ships.length - 1; i >= 0; i--) {
    const v = ships[i];
    if (v.dead) { ships.splice(i, 1); continue; }
    if (v.driver === 'player') { ships.splice(i, 1); continue; }
    v.update(dt, { throttle: 0.6, brake: 0, steer: 0 });
    if (v.z < BZ0 - 600 || v.z > BZ1 + 600) { v.remove(); ships.splice(i, 1); }
  }
}
// docked ships near the port and moored boats
function placeHarbour() {
  const port = G.pois.find(p => p.t === 'port');
  const [px, pz] = port ? [port.x, port.z] : ll(13.095, 80.293);
  for (let k = 0; k < 2; k++) {
    for (let t = 0; t < 40; t++) {
      const x = px + 150 + Math.random() * 500, z = pz - 400 + Math.random() * 800;
      if (inWater(x, z) && inWater(x, z + 70) && inWater(x, z - 70) && inWater(x + 12, z)) { const v = new Vehicle('cargo', 0x2a4f7a, x, z, 0); v.persist = true; v.moored = true; traffic.push(v); break; }
    }
  }
}
