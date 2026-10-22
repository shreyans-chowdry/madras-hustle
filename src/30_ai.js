// ===================== AI: traffic, pedestrians, police =====================
const CLASS_SPEED = [15, 13, 11, 8, 6, 5, 4];
function sidewalkY(x, z) {
  const r = roadQuery(x, z, 6, 0); if (!r.seg) return 0; const E = r.seg.e;
  if (E.elev || !(E.c <= 2 || (E.c === 3 && E.hw >= 3.4))) return 0;
  const sw = E.c <= 1 ? 3.2 : 2.4; return r.d > 0.02 && r.d < sw ? 0.24 : 0;
}
const EC = 120, edgeGrid = new Map();
function buildEdgeGrid() {
  G.edges.forEach((E, i) => {
    if (!E.t) return;
    const k = Math.floor(E.xs.length / 2);
    gridAdd(edgeGrid, EC, E.xs[k], E.zs[k], E.xs[k], E.zs[k], i);
  });
}
function edgesNear(x, z, rMin, rMax) {
  const out = []; const r = Math.ceil(rMax / EC); const cx = Math.floor(x / EC), cz = Math.floor(z / EC);
  for (let ix = cx - r; ix <= cx + r; ix++) for (let iz = cz - r; iz <= cz + r; iz++) {
    const a = edgeGrid.get(gkey(ix, iz)); if (!a) continue;
    const mx = (ix + 0.5) * EC, mz = (iz + 0.5) * EC, d = Math.hypot(mx - x, mz - z);
    if (d < rMin - EC * 0.7 || d > rMax + EC * 0.7) continue;
    for (const e of a) out.push(e);
  }
  return out;
}
const _P = {}, _P2 = {};
function laneFor(E, frac) {
  if (E.o === 0) return E.hw >= 6 ? E.hw * (0.3 + 0.45 * frac) : E.hw * 0.48;
  return (frac - 0.5) * E.hw * 1.1;
}
class Driver {
  constructor(v, e, dir, s) {
    this.v = v; this.e = e; this.dir = dir; this.s = s; this.laneFrac = Math.random(); this.next = null;
    this.mode = 'traffic'; this.stuckT = 0; this.revT = 0; this.honkT = 0; this.blockedT = 0; this.ctrl = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    this.poly = null; this.pi = 0; this.routeT = 0; this.panic = 0;
    this.chooseNext();
  }
  get E() { return G.edges[this.e]; }
  reattach() {
    const v = this.v, r = roadQuery(v.x, v.z, 60, v.y);
    if (!r.seg || !r.seg.e.t) return false;
    const E = r.seg.e; let k = 0; for (; k < E.xs.length - 1; k++) if (E.xs[k] === r.seg.ax && E.zs[k] === r.seg.az) break;
    const along = E.cum[k] + Math.hypot(r.px - E.xs[k], r.pz - E.zs[k]);
    const fx = Math.sin(v.h), fz = Math.cos(v.h), tx = r.seg.bx - r.seg.ax, tz = r.seg.bz - r.seg.az;
    let dir = fx * tx + fz * tz >= 0 ? 1 : -1;
    if (E.o === 1) dir = 1; if (E.o === -1) dir = -1;
    this.e = E.i; this.dir = dir; this.s = dir > 0 ? along : E.len - along; this.chooseNext(); return true;
  }
  chooseNext() {
    const E = this.E, node = this.dir > 0 ? E.b : E.a;
    const cands = G.nodes[node].out.filter(o => o.e !== this.e);
    if (!cands.length) { this.next = { e: this.e, dir: -this.dir }; return; }
    edgePoint(E, E.len - 0.5, this.dir, _P);
    const tx = _P.tx, tz = _P.tz;
    let tot = 0; const ws = cands.map(o => { const C = G.edges[o.e]; edgePoint(C, 0.5, o.dir, _P2); const d = tx * _P2.tx + tz * _P2.tz; const w = 0.2 + Math.max(0, d) ** 2 * 2.2 + (C.c <= 2 ? 0.35 : 0) + (C.c >= 4 ? -0.15 : 0); tot += Math.max(0.05, w); return Math.max(0.05, w); });
    let r = Math.random() * tot; for (let i = 0; i < cands.length; i++) { r -= ws[i]; if (r <= 0) { this.next = cands[i]; return; } }
    this.next = cands[cands.length - 1];
  }
  cursor(out) {
    const E = this.E; edgePoint(E, this.s, this.dir, out);
    const lane = laneFor(E, this.laneFrac);
    out.x += out.tz * lane; out.z -= out.tx * lane;
    return out;
  }
  advance(look) {
    const v = this.v; let g = 0;
    this.cursor(_P);
    while (dist2(v.x, v.z, _P.x, _P.z) < look * look && g++ < 60) {
      this.s += 1.5;
      if (this.s > this.E.len) { this.s -= this.E.len; this.e = this.next.e; this.dir = this.next.dir; this.chooseNext(); }
      this.cursor(_P);
    }
    return _P;
  }
  update(dt) {
    const v = this.v, c = this.ctrl;
    c.throttle = 0; c.brake = 0; c.handbrake = false; c.steer = 0;
    if (v.wreck || v.sinkT > 0) return c;
    const spd = v.fwdSpeed, fx = Math.sin(v.h), fz = Math.cos(v.h);
    let tx, tz, target;
    if (this.mode === 'chase' || this.mode === 'route') return this.pursuit(dt);
    const look = clamp(5 + Math.abs(spd) * 0.6, 6, 14);
    this.cursor(_P2); if (dist2(v.x, v.z, _P2.x, _P2.z) > 28 * 28) this.reattach();
    const P = this.advance(look); tx = P.x; tz = P.z;
    const E = this.E;
    target = Math.min(E.elev ? 16 : CLASS_SPEED[E.c] || 8, v.spec.max * 0.8) * (this.panic > 0 ? 1.4 : 1);
    // upcoming curvature
    const ang = Math.abs(wrapAngle(headingTo(tx - v.x, tz - v.z) - v.h));
    if (ang > 0.35) target = Math.min(target, 4 + (1.2 - Math.min(ang, 1.2)) * 9);
    // obstacles
    const ob = obstacleAhead(v, 4 + Math.abs(spd) * 1.3 + 3);
    if (ob < 1e8) { target = Math.min(target, Math.max(0, (ob - 4.5) * 0.9)); }
    if (ob < 9 && Math.abs(spd) < 1) { this.blockedT += dt; if (this.blockedT > 2 && this.honkT <= 0) { this.honkT = 3 + Math.random() * 3; v.hornT = 0.5; } }
    else this.blockedT = 0;
    this.honkT -= dt; this.panic -= dt;
    this.steerTo(tx, tz, target, dt);
    // stuck detection
    if (Math.abs(spd) < 0.4 && ob > 1e8) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt);
    if (this.stuckT > 3.5) { this.revT = 1.6; this.stuckT = 0; }
    if (this.revT > 0) { this.revT -= dt; c.throttle = 0; c.brake = 1; c.steer = -c.steer; }
    return c;
  }
  steerTo(tx, tz, target, dt) {
    const v = this.v, c = this.ctrl, spd = v.fwdSpeed;
    const want = headingTo(tx - v.x, tz - v.z), d = wrapAngle(want - v.h);
    c.steer = clamp(d * 2.6, -1, 1);
    const err = target - spd;
    if (err > 0.4) c.throttle = clamp(err * 0.35, 0.15, 1);
    else if (err < -0.8) c.brake = clamp(-err * 0.3, 0.15, 1);
  }
  pursuit(dt) {
    const v = this.v, c = this.ctrl;
    const pt = playerTarget();
    const d = Math.hypot(pt.x - v.x, pt.z - v.z);
    this.routeT -= dt;
    const los = d < 80 && rayWalls(v.x, v.z, pt.x, pt.z, 2) >= 1;
    if (los || d < 30) this.mode = 'chase';
    else if (this.mode === 'chase' && d > 110) this.mode = 'route';
    if (this.mode === 'route') {
      if (!this.poly || this.routeT <= 0) {
        this.routeT = 2.5;
        const a = nearestNode(v.x, v.z), b = nearestNode(pt.x, pt.z);
        const path = astar(a, b);
        this.poly = path && path.length ? [[G.nodes[a].x, G.nodes[a].z], ...pathPolyline(a, path)] : null; this.pi = 0;
        if (this.poly) { // start from the closest point ahead
          let bi = 0, bd = 1e18; const n = Math.min(this.poly.length, 60);
          for (let i = 0; i < n; i++) { const d = dist2(v.x, v.z, this.poly[i][0], this.poly[i][1]); if (d < bd) { bd = d; bi = i; } }
          this.pi = Math.min(bi + 1, this.poly.length - 1);
        }
      }
      if (this.poly) {
        let g = 0; const look = clamp(6 + Math.abs(v.fwdSpeed) * 0.5, 7, 16);
        while (this.pi < this.poly.length - 1 && dist2(v.x, v.z, this.poly[this.pi][0], this.poly[this.pi][1]) < look * look && g++ < 50) this.pi++;
        const p = this.poly[this.pi];
        const ang = Math.abs(wrapAngle(headingTo(p[0] - v.x, p[1] - v.z) - v.h));
        let target = ang > 0.5 ? 9 : v.spec.max * 0.85;
        const ob = obstacleAhead(v, 10 + Math.abs(v.fwdSpeed));
        if (ob < 1e8) target = Math.min(target, Math.max(3, ob * 0.8));
        this.steerTo(p[0], p[1], target, dt);
      } else this.steerTo(pt.x, pt.z, 14, dt);
    } else {
      const lead = clamp(d / 22, 0, 1.2);
      const tx = pt.x + pt.vx * lead, tz = pt.z + pt.vz * lead;
      const ang = Math.abs(wrapAngle(headingTo(tx - v.x, tz - v.z) - v.h));
      let target = d < 8 && pt.slow ? 2 : v.spec.max;
      if (ang > 1.1 && v.fwdSpeed > 12) target = 8;
      this.steerTo(tx, tz, target, dt);
      if (ang > 1.6 && d < 15) { this.ctrl.handbrake = v.fwdSpeed > 6; }
    }
    // unstick
    if (Math.abs(v.fwdSpeed) < 0.6 && d > 9) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt * 2);
    if (this.stuckT > 2.2) { this.revT = 1.3; this.stuckT = 0; }
    if (this.revT > 0) { this.revT -= dt; c.throttle = 0; c.brake = 1; c.steer = -c.steer; c.handbrake = false; }
    return c;
  }
}
function obstacleAhead(v, maxD) {
  const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -fz, rz = fx, hw = v.spec.wid / 2;
  let best = 1e9;
  for (const o of vehicles) {
    if (o === v || o.sinkT > 0) continue;
    const dx = o.x - v.x, dz = o.z - v.z; if (Math.abs(dx) > maxD + 6 || Math.abs(dz) > maxD + 6) continue;
    const ah = dx * fx + dz * fz - o.spec.len * 0.45; if (ah < -1 || ah > maxD) continue;
    const sd = Math.abs(dx * rx + dz * rz); if (sd < hw + o.spec.wid / 2 + 0.5 && Math.abs(o.y - v.y) < 2) best = Math.min(best, Math.max(ah, 0.1));
  }
  const pl = player;
  if (!pl.veh && !pl.dead) {
    const dx = pl.x - v.x, dz = pl.z - v.z, ah = dx * fx + dz * fz, sd = Math.abs(dx * rx + dz * rz);
    if (ah > -1 && ah < maxD && sd < hw + 0.9) best = Math.min(best, Math.max(ah, 0.1));
  }
  for (const p of peds) {
    if (p.state === 'down') continue;
    const dx = p.x - v.x, dz = p.z - v.z; if (Math.abs(dx) > maxD || Math.abs(dz) > maxD) continue;
    const ah = dx * fx + dz * fz, sd = Math.abs(dx * rx + dz * rz);
    if (ah > 0 && ah < maxD && sd < hw + 0.7) best = Math.min(best, ah);
  }
  return best;
}

// ---------- traffic manager ----------
const traffic = [];
const TYPE_W = [['auto', 22], ['hatch', 22], ['sedan', 16], ['taxi', 6], ['scooter', 12], ['motorbike', 4], ['suv', 9], ['pickup', 4], ['muscle', 2], ['sports', 2], ['super', 1], ['truck', 3], ['bus', 5], ['van', 1], ['ambulance', 1], ['police', 3]];
function randType(E) {
  let tot = 0; const list = TYPE_W.filter(([t]) => !((t === 'bus' || t === 'truck') && E.c > 2)); list.forEach(t => tot += t[1]);
  let r = Math.random() * tot; for (const [t, w] of list) { r -= w; if (r <= 0) return t; } return 'hatch';
}
let spawnT = 0;
const _camF = new THREE.Vector3();
function spawnTraffic(px, pz, count, rMin = 90, rMax = 230, force = false) {
  const cands = edgesNear(px, pz, rMin, rMax); if (!cands.length) return;
  camera.getWorldDirection(_camF);
  for (let tries = 0; tries < count * 4 && count > 0; tries++) {
    const ei = pick(cands), E = G.edges[ei];
    if (E.len < 12) continue;
    const dirs = []; if (E.o === 0 || E.o === 1) dirs.push(1); if (E.o === 0 || E.o === -1) dirs.push(-1);
    const dir = pick(dirs), s = 4 + Math.random() * (E.len - 8);
    edgePoint(E, s, dir, _P);
    const d = Math.hypot(_P.x - px, _P.z - pz); if (d < rMin || d > rMax) continue;
    const dx = _P.x - camera.position.x, dz = _P.z - camera.position.z;
    if (!force && d < 160 && (dx * _camF.x + dz * _camF.z) / Math.max(1, Math.hypot(dx, dz)) > 0.5) continue;
    if (vehicles.some(o => dist2(o.x, o.z, _P.x, _P.z) < 196)) continue;
    const type = randType(E);
    const v = new Vehicle(type, undefined, _P.x, _P.z, headingTo(_P.tx, _P.tz));
    const ag = new Driver(v, ei, dir, s); v.agent = ag; v.driver = 'ai';
    const lane = laneFor(E, ag.laneFrac); v.x += _P.tz * lane; v.z -= _P.tx * lane; v.y = _P.y;
    const sp0 = Math.min(CLASS_SPEED[E.c] || 8, v.spec.max * 0.8) * 0.7; v.vx = _P.tx * sp0; v.vz = _P.tz * sp0;
    traffic.push(v); count--;
  }
}
function spawnParked(px, pz, count) {
  const cands = edgesNear(px, pz, 70, 200);
  for (let tries = 0; tries < count * 5 && count > 0; tries++) {
    const ei = pick(cands), E = G.edges[ei]; if (!E || E.c < 3 || E.elev || E.len < 15) continue;
    const s = 5 + Math.random() * (E.len - 10); edgePoint(E, s, 1, _P);
    const side = Math.random() < 0.5 ? 1 : -1, off = (E.hw + 0.9) * side;
    const x = _P.x + _P.tz * off, z = _P.z - _P.tx * off;
    if (insideBuilding(x, z) >= 0 || collideCircle(x, z, 1.0).hit) continue;
    if (vehicles.some(o => dist2(o.x, o.z, x, z) < 64)) continue;
    const type = pick(['hatch', 'hatch', 'sedan', 'suv', 'auto', 'scooter', 'motorbike', 'pickup', 'muscle', 'sports', 'taxi', Math.random() < 0.15 ? 'super' : 'sedan']);
    const v = new Vehicle(type, undefined, x, z, headingTo(_P.tx, _P.tz) + (side > 0 ? 0 : Math.PI) * (Math.random() < 0.7 ? 0 : 1));
    v.parked = true; traffic.push(v); count--;
  }
}
function updateTraffic(dt, px, pz) {
  spawnT -= dt;
  let moving = 0, parked = 0; for (const v of traffic) { if (v.driver === 'ai' && v.kind === 'car') moving++; else if (v.parked) parked++; }
  if (spawnT <= 0 && !player.interior) {
    spawnT = 0.4;
    const flying = player.veh && (player.veh.kind === 'heli' || player.veh.kind === 'plane') && player.veh.y > 60;
    if (!flying && moving < Q.traffic) spawnTraffic(px, pz, Math.min(3, Q.traffic - moving));
    if (!flying && parked < Q.parked) spawnParked(px, pz, 2);
  }
  for (let i = traffic.length - 1; i >= 0; i--) {
    const v = traffic[i];
    if (v.dead) { traffic.splice(i, 1); continue; }
    if (v.driver === 'player' || v.persist) continue;
    const lim = v.kind === 'car' ? 340 : 900;
    if (dist2(v.x, v.z, px, pz) > lim * lim || (v.agent && v.agent.stuckT > 25) || (v.wreck && dist2(v.x, v.z, px, pz) > 120 * 120)) { v.remove(); traffic.splice(i, 1); continue; }
  }
}

// ---------- pedestrians ----------
const peds = [];
class Walker {
  constructor(look, x, z) {
    this.p = makePerson(look); this.x = x; this.z = z; this.y = 0; this.h = 0; this.vx = 0; this.vz = 0; this.vy = 0;
    this.state = 'walk'; this.t = 0; this.speed = 1.1 + Math.random() * 0.5; this.side = Math.random() < 0.5 ? 1 : -1;
    this.e = -1; this.dir = 1; this.s = 0; this.offset = 0; this.chk = Math.random(); this.health = 100; this.fireT = 1 + Math.random();
    this.weapon = null; this.gunMesh = null;
    scene.add(this.p.root); peds.push(this);
  }
  arm(kind) {
    this.weapon = kind; if (this.gunMesh) this.p.handR.remove(this.gunMesh);
    this.gunMesh = new THREE.Mesh(gunGeo(kind), GUN_MAT); this.p.handR.add(this.gunMesh);
  }
  placeOnEdge(ei, dir, s) { this.e = ei; this.dir = dir; this.s = s; this.offset = G.edges[ei].hw + 1.3; }
  snapToRoad() {
    const r = roadQuery(this.x, this.z, 40);
    if (!r.seg || !r.seg.e.t || r.seg.e.elev) { this.e = -1; return; }
    const E = r.seg.e; this.e = E.i; this.dir = Math.random() < 0.5 ? 1 : -1;
    let best = 0, bd = 1e9; for (let k = 0; k < E.xs.length; k++) { const d = dist2(E.xs[k], E.zs[k], this.x, this.z); if (d < bd) { bd = d; best = E.cum[k]; } }
    this.s = this.dir > 0 ? best : E.len - best; this.offset = E.hw + 1.3;
    edgePoint(E, this.s, this.dir, _P); const lx = _P.tz, lz = -_P.tx; this.side = ((this.x - _P.x) * lx + (this.z - _P.z) * lz) > 0 ? 1 : -1;
  }
  update(dt) {
    const p = this.p;
    const dcam = Math.hypot(this.x - camera.position.x, this.z - camera.position.z);
    setPersonLOD(p, dcam);
    if (this.state === 'dead') {
      this.t -= dt; this.vy -= 20 * dt; this.x += this.vx * dt; this.z += this.vz * dt; this.y = Math.max(0, this.y + this.vy * dt);
      this.vx *= Math.exp(-dt * 5); this.vz *= Math.exp(-dt * 5);
      p.inner.rotation.x = lerp(p.inner.rotation.x, -Math.PI / 2, Math.min(1, dt * 8)); p.inner.position.y = 0.12; p.far.rotation.x = -Math.PI / 2; p.far.position.y = 0.12;
      if (this.t <= 0 && !this.special) { this.remove(); return; }
    } else if (this.state === 'down') {
      this.t -= dt; this.vy -= 20 * dt; this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.vx *= Math.exp(-dt * 6); this.vz *= Math.exp(-dt * 6); }
      const r = collideCircle(this.x, this.z, 0.35); this.x = r.x; this.z = r.z;
      p.inner.rotation.x = lerp(p.inner.rotation.x, -Math.PI / 2, Math.min(1, dt * 8)); p.inner.position.y = 0.15;
      if (this.health <= 0) { this.die(0, 0); }
      else if (this.t <= 0) { p.inner.rotation.x = 0; p.inner.position.y = 0; this.state = this.cop || this.hostile ? 'cop' : 'flee'; this.t = 5; this.threatX = player.x; this.threatZ = player.z; }
    } else if (this.state === 'flee' || this.state === 'cop') {
      let tx, tz, sp;
      if (this.state === 'cop') {
        tx = player.x - this.x; tz = player.z - this.z; const d = Math.hypot(tx, tz);
        const armed = this.weapon && (this.hostile || Police.level >= 2 || player.armedThreat);
        sp = armed ? (d > 22 ? 5 : 0) : (d < 1.1 ? 0 : 5);
        p.aim = armed && d < 40 ? 1 : 0;
        if (armed && d < 45 && !player.dead) {
          this.fireT -= dt;
          if (this.fireT <= 0) { this.fireT = WEAPONS[this.weapon].rate * (this.hostile ? 3 : 4) + Math.random() * 0.6; npcShoot(this, this.weapon); }
        }
        if (sp === 0) { this.h = headingTo(tx, tz); tx = tz = 0; }
      } else { tx = this.x - this.threatX; tz = this.z - this.threatZ; sp = 4.2; this.t -= dt; if (this.t <= 0) { this.state = 'walk'; this.snapToRoad(); } }
      const l = Math.hypot(tx, tz) || 1; if (sp > 0) this.h = headingTo(tx, tz);
      this.x += tx / l * sp * dt; this.z += tz / l * sp * dt;
      const r = collideCircle(this.x, this.z, 0.35); this.x = r.x; this.z = r.z;
      animatePerson(p, sp, dt);
    } else if (this.state === 'wait' || this.state === 'idle') {
      animatePerson(p, 0, dt);
      if (this.state === 'wait' && !p.lod) { p.arms[1].rotation.x = -2.6 + Math.sin(performance.now() / 200) * 0.3; }
    } else if (this.state === 'board') {
      const tx = this.bx - this.x, tz = this.bz - this.z, l = Math.hypot(tx, tz);
      if (l < 0.8) { this.remove(); return; }
      this.h = headingTo(tx, tz); this.x += tx / l * 2.2 * dt; this.z += tz / l * 2.2 * dt; animatePerson(p, 2.2, dt);
    } else if (this.state === 'stand') {
      animatePerson(p, 0, dt);
    } else if (this.state === 'sit') {
      animatePerson(p, 0, dt, 'sit');
    } else {
      if (this.e < 0) { this.snapToRoad(); if (this.e < 0) { this.state = 'idle'; } }
      else {
        const E = G.edges[this.e];
        this.s += this.speed * dt;
        if (this.s > E.len) {
          const node = this.dir > 0 ? E.b : E.a;
          const opts = G.nodes[node].edges.filter(i => i !== this.e && G.edges[i].t && !G.edges[i].elev);
          if (opts.length) { const ni = pick(opts), N = G.edges[ni]; this.e = ni; this.dir = N.a === node ? 1 : -1; this.s = 0; this.offset = N.hw + 1.3; }
          else { this.dir = -this.dir; this.s = 0; this.side = -this.side; }
        }
        const E2 = G.edges[this.e];
        edgePoint(E2, this.s, this.dir, _P);
        const off = this.offset * this.side;
        const nx = _P.x + _P.tz * off, nz = _P.z - _P.tx * off;
        this.chk -= dt;
        if (this.chk <= 0) { this.chk = 0.6; if (insideBuilding(nx, nz) >= 0) this.offset = Math.max(E2.hw - 0.3, this.offset - 0.6); else if (this.offset < E2.hw + 1.3) this.offset += 0.2; }
        this.h = headingTo(nx - this.x, nz - this.z) || this.h;
        this.x += (nx - this.x) * Math.min(1, dt * 6); this.z += (nz - this.z) * Math.min(1, dt * 6);
        this.y = (E2.c <= 2 || (E2.c === 3 && E2.hw >= 3.4)) && this.offset > E2.hw + 0.2 ? 0.24 : 0;
        animatePerson(p, this.speed, dt);
      }
    }
    p.root.position.set(this.x, this.y, this.z); p.root.rotation.y = this.h;
  }
  knock(vx, vz, power) {
    if (this.state === 'dead') return;
    if (this.state !== 'down') { this.state = 'down'; this.t = 4 + Math.random() * 3; this.vy = Math.min(7, power * 0.35); }
    this.vx = vx; this.vz = vz;
    this.health -= power * 6;
    if (this.health <= 0) this.die(vx, vz);
  }
  shot(dmg, dx, dz, byPlayer) {
    if (this.state === 'dead') return;
    this.health -= dmg; Fx.blood(this.x, this.y + 1.2, this.z);
    if (byPlayer) { this.hitByPlayer = true; if (this.cop) crime('shootCop', this.x, this.z); }
    if (this.health <= 0) { this.die(dx * 2, dz * 2); if (byPlayer) { crime(this.cop ? 'killCop' : 'kill', this.x, this.z); onPedKilled(this); } }
    else if (!this.cop && !this.hostile) this.scare(this.x - dx, this.z - dz);
    for (const o of peds) if (o !== this && !o.cop && !o.hostile && dist2(o.x, o.z, this.x, this.z) < 900) o.scare(this.x, this.z);
  }
  die(vx, vz) {
    if (this.state === 'dead') return;
    this.state = 'dead'; this.t = 30; this.vx = vx; this.vz = vz; this.health = 0; this.p.aim = 0;
    if (this.gunMesh && this.weapon && Math.random() < 0.6) dropPickup('ammo', this.x + 0.5, this.z, this.weapon);
    if (Math.random() < 0.5) dropPickup('cash', this.x - 0.4, this.z + 0.3, 20 + Math.floor(Math.random() * 120));
  }
  scare(x, z) { if (this.state === 'walk' || this.state === 'idle' || this.state === 'stand') { this.state = 'flee'; this.t = 4 + Math.random() * 3; this.threatX = x; this.threatZ = z; } }
  remove() { scene.remove(this.p.root); const i = peds.indexOf(this); if (i >= 0) peds.splice(i, 1); this.dead = true; }
}
let pedSpawnT = 0;
function updatePeds(dt, px, pz) {
  pedSpawnT -= dt;
  let n = 0; for (const p of peds) if (!p.special) n++;
  const airborne = player.veh && player.veh.kind !== 'car' && player.veh.kind !== 'boat' && player.veh.y > 40;
  if (pedSpawnT <= 0 && n < Q.peds && !player.interior && !airborne) {
    pedSpawnT = 0.3;
    const cands = edgesNear(px, pz, 25, 140);
    for (let k = 0; k < 3 && cands.length; k++) {
      const ei = pick(cands), E = G.edges[ei]; if (E.elev || E.len < 8) continue;
      const dir = Math.random() < 0.5 ? 1 : -1, s = Math.random() * E.len;
      edgePoint(E, s, dir, _P);
      const side = Math.random() < 0.5 ? 1 : -1, off = (E.hw + 1.3) * side;
      const x = _P.x + _P.tz * off, z = _P.z - _P.tx * off;
      const d = Math.hypot(x - px, z - pz); if (d < 25 || d > 140) continue;
      if (insideBuilding(x, z) >= 0 || inWater(x, z)) continue;
      const w = new Walker(randomLook(), x, z); w.placeOnEdge(ei, dir, s); w.side = side;
      if (Math.random() < 0.12) { w.state = 'idle'; w.h = Math.random() * TAU; }
    }
  }
  for (let i = peds.length - 1; i >= 0; i--) {
    const w = peds[i];
    if (!w.special && dist2(w.x, w.z, px, pz) > 180 * 180) { w.remove(); continue; }
    w.update(dt);
  }
}
function pedVehicleHits() {
  for (const v of vehicles) {
    if (v.sinkT > 0 || v.kind === 'boat' || (v.kind !== 'car' && v.y > 3)) continue;
    const spd = v.speed; const fx = Math.sin(v.h), fz = Math.cos(v.h);
    for (const w of peds) {
      if (w.state === 'down' || w.state === 'board' || w.state === 'dead') continue;
      const dx = w.x - v.x, dz = w.z - v.z; if (dx * dx + dz * dz > 100) continue;
      for (const [o, r] of v.spec.circles) {
        const cx = v.x + fx * o, cz = v.z + fz * o; const ex = w.x - cx, ez = w.z - cz, d = Math.hypot(ex, ez), R = r + 0.35;
        if (d < R) {
          if (spd > 3.2) {
            w.knock(v.vx * 0.7 + ex / d * 2, v.vz * 0.7 + ez / d * 2, spd); v.vx *= 0.93; v.vz *= 0.93;
            if (v.driver === 'player') { Sound.crash(0.35); crime(w.cop ? 'hitCop' : 'hitPed', w.x, w.z); if (w.health <= 0) onPedKilled(w); }
          } else { w.x = cx + ex / d * R; w.z = cz + ez / d * R; if (spd > 1 && w.state === 'walk' && v.driver === 'player') w.scare(v.x, v.z); }
          break;
        }
      }
    }
  }
}
function npcShoot(w, kind) {
  const W = WEAPONS[kind]; const t = playerTarget();
  const sx = w.x + Math.sin(w.h) * 0.5, sy = w.y + 1.45, sz = w.z + Math.cos(w.h) * 0.5;
  const ty = (player.veh ? player.veh.y + 1 : player.y + 1.2);
  const d = Math.hypot(t.x - sx, t.z - sz);
  const blocked = rayWalls(sx, sz, t.x, t.z, sy, ty) < 1;
  const acc = blocked ? 0 : clamp(0.75 - d * 0.012 - Math.hypot(t.vx, t.vz) * 0.02, 0.08, 0.7) * (w.hostile ? 0.8 : 1);
  const hitIt = Math.random() < acc;
  const ex = hitIt ? t.x : t.x + (Math.random() - 0.5) * 4, ez = hitIt ? t.z : t.z + (Math.random() - 0.5) * 4;
  Fx.tracer(sx, sy, sz, ex, ty, ez); Fx.muzzle(sx, sy, sz);
  Sound.gun(kind, Math.hypot(sx - camera.position.x, sz - camera.position.z));
  if (hitIt) { if (player.veh) player.veh.damage(W.dmg * 1.2); else hurtPlayer(W.dmg * 0.55); }
}
// ---------- police ----------
const Police = {
  level: 0, heat: 0, hidden: 0, seen: false, units: [], spawnT: 0, lastX: 0, lastZ: 0, bustT: 0, flashing: false, copPeds: [], heli: null,
  set(level) {
    level = clamp(Math.round(level), 0, 5);
    if (level > this.level) { Sound.star(); this.hidden = 0; this.lastX = player.x; this.lastZ = player.z; }
    this.level = level; this.heat = 0;
    if (level === 0) this.calm();
  },
  calm() {
    for (const v of this.units) { if (v.agent) { v.agent.mode = 'traffic'; v.siren = false; v.agent.reattach(); } v.persist = false; v.copsOut = false; }
    this.units = [];
    for (const c of this.copPeds) { if (c.state === 'dead') continue; c.p.aim = 0; c.cop = false; c.state = 'walk'; c.special = false; c.snapToRoad(); }
    this.copPeds = [];
    if (this.heli) { this.heli.heliAI = 'leave'; this.heli = null; }
  },
  wantedUnits() { return [0, 1, 2, 4, 6, 8][this.level]; },
  update(dt) {
    if (this.level === 0) { this.flashing = false; return; }
    if (player.interior) { this.hidden += dt * 0.3; }
    const pt = playerTarget();
    this.units = this.units.filter(v => !v.dead && !v.wreck);
    this.spawnT -= dt;
    const inAir = player.veh && (player.veh.kind === 'heli' || player.veh.kind === 'plane') && player.veh.y > 15;
    const onSea = player.veh && player.veh.kind === 'boat';
    if (this.spawnT <= 0 && this.units.length < this.wantedUnits() && !inAir && !onSea && !player.interior) {
      this.spawnT = 2.2 - this.level * 0.25;
      const cands = edgesNear(pt.x, pt.z, 150, 260);
      for (let t = 0; t < 12; t++) {
        const ei = pick(cands); if (ei === undefined) break; const E = G.edges[ei]; if (E.len < 10) continue;
        edgePoint(E, E.len / 2, 1, _P);
        const d = Math.hypot(_P.x - pt.x, _P.z - pt.z); if (d < 140) continue;
        if (vehicles.some(o => dist2(o.x, o.z, _P.x, _P.z) < 100)) continue;
        const toward = (pt.x - _P.x) * _P.tx + (pt.z - _P.z) * _P.tz >= 0 ? 1 : -1;
        const type = this.level >= 4 && Math.random() < 0.5 ? 'swat' : 'police';
        const v = new Vehicle(type, undefined, _P.x, _P.z, headingTo(_P.tx * toward, _P.tz * toward)); v.y = _P.y;
        const ag = new Driver(v, ei, 1, E.len / 2); ag.mode = 'route'; v.agent = ag; v.driver = 'ai'; v.siren = true; v.persist = true;
        traffic.push(v); this.units.push(v); break;
      }
    }
    // police helicopter at 3+ stars
    if (this.level >= 3 && (!this.heli || this.heli.dead || this.heli.wreck)) {
      if (!this.heliT || (this.heliT -= dt) <= 0) {
        this.heliT = 20;
        const a = Math.random() * TAU, h = new Vehicle('policeheli', undefined, pt.x + Math.cos(a) * 350, pt.z + Math.sin(a) * 350, 0);
        h.y = 70; h.driver = 'ai'; h.rotor = 1; h.persist = true; h.heliAI = 'chase'; traffic.push(h); this.heli = h;
      }
    }
    for (const v of traffic) if (v.isPolice && v.kind === 'car' && v.agent && v.agent.mode === 'traffic' && !v.wreck && dist2(v.x, v.z, pt.x, pt.z) < 150 * 150) { v.agent.mode = 'route'; v.siren = true; v.persist = true; this.units.push(v); }
    let seen = false;
    for (const v of this.units) {
      const d = Math.hypot(v.x - pt.x, v.z - pt.z);
      if (d < 120 && (d < 25 || rayWalls(v.x, v.z, pt.x, pt.z, 2.5) >= 1)) { seen = true; break; }
    }
    if (this.heli && !this.heli.wreck && Math.hypot(this.heli.x - pt.x, this.heli.z - pt.z) < 140 && !player.interior) seen = true;
    for (const c of this.copPeds) if (c.state !== 'dead' && dist2(c.x, c.z, pt.x, pt.z) < 60 * 60) seen = true;
    if (player.interior) seen = false;
    if (seen) { this.hidden = 0; this.lastX = pt.x; this.lastZ = pt.z; }
    else {
      this.hidden += dt * (Math.hypot(pt.x - this.lastX, pt.z - this.lastZ) > 120 ? 1.6 : 1);
      if (this.hidden > 7 + this.level * 2.5) { this.hidden = 0; this.set(this.level - 1); if (this.level === 0) toast('Lost the cops'); }
    }
    this.flashing = !seen;
    if (!player.veh && !player.dead && !player.interior) {
      for (const v of this.units) {
        if (v.copsOut || v.wreck || v.kind !== 'car') continue;
        if (v.speed < 1.5 && dist2(v.x, v.z, player.x, player.z) < 30 * 30) {
          v.copsOut = true;
          for (let k = 0; k < (this.level >= 3 ? 2 : 1); k++) {
            const c = new Walker(v.type === 'swat' ? SWAT_LOOK : COP_LOOK, v.x + Math.cos(v.h) * (k ? -1.8 : 1.8), v.z - Math.sin(v.h) * (k ? -1.8 : 1.8));
            c.state = 'cop'; c.cop = true; c.special = true; c.health = v.type === 'swat' ? 200 : 100; c.arm(v.type === 'swat' ? 'rifle' : this.level >= 3 ? 'smg' : 'pistol'); this.copPeds.push(c);
          }
        }
      }
    }
    this.copPeds = this.copPeds.filter(c => !c.dead);
    let close = false;
    if (player.veh) {
      const pv = player.veh;
      if (pv.kind === 'car' && pv.speed < 1.8) for (const v of this.units) if (dist2(v.x, v.z, pv.x, pv.z) < 7.5 * 7.5 && v.speed < 4) close = true;
    } else if (!player.interior) {
      for (const c of this.copPeds) if (c.state === 'cop' && dist2(c.x, c.z, player.x, player.z) < 1.8 * 1.8 && !player.weapon) close = true;
    }
    if (this.level >= 3) close = close && player.veh != null;
    this.bustT = close ? this.bustT + dt : Math.max(0, this.bustT - dt * 2);
    if (this.bustT > (player.veh ? 3.2 : 1.4)) { this.bustT = 0; busted(); }
  },
  copNear(x, z, r = 70) {
    for (const v of vehicles) if (v.isPolice && !v.wreck && dist2(v.x, v.z, x, z) < r * r && rayWalls(v.x, v.z, x, z, 2) >= 1) return true;
    for (const c of this.copPeds) if (c.state !== 'dead' && dist2(c.x, c.z, x, z) < r * r) return true;
    return false;
  },
};
// police helicopter AI (and any heli with heliAI)
function updateHeliAI(h, dt) {
  const t = playerTarget();
  let tx = t.x, tz = t.z, ty = Math.max(45, groundHeightAt(t.x, t.z, 400) + 35);
  if (h.heliAI === 'leave') { tx = h.x + Math.sin(h.h) * 500; tz = h.z + Math.cos(h.h) * 500; ty = 120; if (dist2(h.x, h.z, player.x, player.z) > 900 * 900) { h.remove(); return; } }
  else if (h.heliAI === 'chase') { const a = performance.now() / 6000; tx += Math.cos(a) * 30; tz += Math.sin(a) * 30; }
  const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
  const want = headingTo(dx, dz), dh = wrapAngle(want - h.h);
  const c = { pitch: clamp(d / 60, 0, 1) * (Math.abs(dh) < 1 ? 1 : 0.2), yaw: clamp(-dh * 2, -1, 1), roll: 0, lift: clamp((ty - h.y) / 10, -1, 1), active: true };
  h.update(dt, c);
  if (h.spot) { h.spot.intensity = uNight.value > 0.3 ? 400 : 0; h.spot.target.position.set(0, -h.y + (player.veh ? player.veh.y : player.y), 2); h.spot.target.updateMatrixWorld(); }
  if (h.isPolice && Police.level >= 4 && h.heliAI === 'chase' && d < 120 && !player.interior) {
    h.fireT = (h.fireT || 2) - dt;
    if (h.fireT <= 0) { h.fireT = 0.35; const fake = { x: h.x, z: h.z, y: h.y - 1.5, h: headingTo(t.x - h.x, t.z - h.z), hostile: false }; npcShoot(fake, 'smg'); }
  }
}
function crime(type, x, z) {
  const P = Police, near = P.copNear(x, z);
  const bump = (min, add = 0) => { const nl = Math.max(min, P.level + add); if (nl > P.level) P.set(nl); };
  switch (type) {
    case 'hitPed': if (near) bump(1); else if (Math.random() < 0.3) setTimeout(() => { if (!player.dead) bump(1); }, 2500); P.heat += 1; break;
    case 'punch': if (near) bump(1); P.heat += 0.5; break;
    case 'jack': if (near) bump(1); else if (Math.random() < 0.12) setTimeout(() => bump(1), 4000); break;
    case 'gunfire': if (near) bump(1); else if (Math.random() < 0.05) bump(1); break;
    case 'kill': bump(near ? 2 : 1); P.heat += 1.5; break;
    case 'shootCop': bump(2); P.heat += 1; break;
    case 'hitCop': bump(2); P.heat += 2; break;
    case 'killCop': bump(3); P.heat += 2.5; break;
    case 'ramCop': if (P.level === 0) bump(1); P.heat += 1; break;
    case 'boomCop': bump(P.level + 1); break;
    case 'boom': if (near) bump(2); break;
    case 'rob': bump(2); break;
    case 'airport': bump(2); break;
  }
  if (P.level > 0 && P.heat >= 4 + P.level * 2) P.set(P.level + 1);
}
