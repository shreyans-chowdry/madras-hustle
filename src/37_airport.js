// ===================== AIRPORT: terminal interior, check-in, security, gate, passenger flights, pilot charter =====================
const Airport = {
  pass: null,          // boarding pass { mode: 'scenic' | 'charter', fare }
  cleared: false,      // passed security
  held: null,          // weapons held by security until the flight is over
  ride: null,          // passenger flight state
  svc: null,
  init() {
    const I = addInterior('terminal', 64, 44, 9, (g, W, D, H, I) => {
      ibox(g, IMAT.tile, W - 0.2, 0.02, D - 0.2, 0, 0.01, 0);
      // check-in island (south half, left)
      for (let k = 0; k < 4; k++) { ibox(g, IMAT.wood, 3.2, 1.1, 1.0, -22 + k * 4.2, 0.55, 8); ibox(g, IMAT.dark, 0.8, 0.5, 0.1, -22 + k * 4.2, 1.5, 7.6); }
      ibox(g, new THREE.MeshStandardMaterial({ color: 0x2f6fb5, emissive: 0x103060 }), 18, 1.4, 0.2, -15.7, 3.6, 9.6);   // "CHECK-IN" sign band
      // security line across the hall at z = 0 with one walk-through arch
      ibox(g, IMAT.glass, W / 2 - 2, 2.4, 0.15, -W / 4 - 1, 1.2, 0); ibox(g, IMAT.glass, W / 2 - 2, 2.4, 0.15, W / 4 + 1, 1.2, 0);
      ibox(g, IMAT.metal, 0.3, 2.6, 0.8, -1.1, 1.3, 0); ibox(g, IMAT.metal, 0.3, 2.6, 0.8, 1.1, 1.3, 0); ibox(g, IMAT.metal, 2.5, 0.3, 0.8, 0, 2.6, 0);
      ibox(g, IMAT.dark, 3, 0.9, 1.2, -4, 0.45, 1.6);   // x-ray belt
      I.walls.push([-W / 2, 0, -1.0, 0], [1.0, 0, W / 2, 0], Object.assign([-1.0, 0, 1.0, 0], { open: () => Airport.cleared }));
      // departure gate (north half): desk, seating rows, jet bridge doorway
      ibox(g, IMAT.wood, 4, 1.1, 1.2, 12, 0.55, -14); ibox(g, IMAT.dark, 3, 1.6, 0.1, 12, 2.6, -14.7);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) ibox(g, IMAT.fabric, 1.0, 0.5, 0.9, -20 + k * 1.2, 0.25, -8 - r * 2.4);
      ibox(g, IMAT.dark, 4, 3.2, 0.2, 18, 1.6, -D / 2 + 0.2);
      ibox(g, IMAT.glass, 40, 6, 0.1, -6, 4, -D / 2 + 0.1);                                 // window wall onto the apron
      I.spots = { checkin: [-15.7, 6.6], security: [0, 2.2], gate: [12, -12.6], jetbridge: [18, -D / 2 + 1.2] };
      I.seats = []; for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) I.seats.push([-20 + k * 1.2, -8 - r * 2.4]);
    });
    I.onEnter = () => this.populate(I);
    I.onExit = () => this.depopulate();
    // terminal door service on the street next to the main terminal / drop-off bay
    const d = WorldFix.dropoff; const term = d ? { x: d.tx, z: d.tz } : null;
    if (term) { const door = nearestWallDoor(term.x, term.z, 160) || { x: d.x, z: d.z, h: d.h }; this.svc = addService('terminal', door.x, door.z, { h: door.h, name: d.name, r: 2.2 }); }
    SERVICE_STYLE.terminal = { label: 'Airport Terminal', icon: '✈', col: '#ffffff' };
    SERVICE_HANDLERS.terminal = s => { enterInterior('terminal', s); EventBus.emit('airport:enter', {}); };
    // interior triggers
    const T = I.spots;
    Triggers.add({ id: 'airport:checkin', interior: 'terminal', x: I.x + T.checkin[0], z: I.z + T.checkin[1], r: 2.6, prompt: () => this.pass ? 'Boarding pass printed · go through security' : 'Check in & buy a ticket', onUse: () => this.checkinMenu() });
    Triggers.add({ id: 'airport:security', interior: 'terminal', x: I.x + T.security[0], z: I.z + T.security[1], r: 1.8, prompt: () => this.cleared ? null : this.pass ? 'Walk through security' : 'Boarding pass required', onUse: () => this.security() });
    Triggers.add({ id: 'airport:gate', interior: 'terminal', x: I.x + T.gate[0], z: I.z + T.gate[1], r: 2.4, prompt: () => this.cleared ? 'Board the flight' : null, onUse: () => this.board() });
  },
  populate(I) {
    this.npcs = [];
    for (let k = 0; k < 9; k++) { const s = I.seats[(k * 5) % I.seats.length]; const w = new Walker(randomLook(), I.x + s[0], I.z + s[1]); w.state = 'sit'; w.special = true; w.h = Math.PI; w.p.inner.position.y = -0.45; this.npcs.push(w); }
    for (let k = 0; k < 5; k++) { const w = new Walker(randomLook(), I.x - 10 + k * 3, I.z + 12 + (k % 2) * 2); w.state = 'idle'; w.special = true; w.h = Math.random() * TAU; this.npcs.push(w); }
    const staff = new Walker(Object.assign(randomLook(), { shirt: 0x2f6fb5 }), I.x + I.spots.checkin[0], I.z + I.spots.checkin[1] + 2.2); staff.state = 'stand'; staff.special = true; staff.h = 0; this.npcs.push(staff);
  },
  depopulate() { for (const w of this.npcs || []) w.remove(); this.npcs = []; },
  checkinMenu() {
    if (this.pass) { toast('You already have a boarding pass'); return; }
    Menu.show('Madras Air · Check-in', 'Domestic departures · Terminal 1', [
      { label: 'Scenic flight over the Marina (passenger)', price: 600, action: () => { this.issue('scenic', 600); return 'close'; } },
      { label: 'Charter a prop plane and fly it yourself', price: 2500, action: () => { this.issue('charter', 2500); return 'close'; } },
      { label: 'Not now', action: () => 'close' }]);
  },
  issue(mode, fare) { this.pass = { mode, fare }; this.cleared = false; toast('Boarding pass printed · Gate 4'); EventBus.emit('airport:ticket', { mode }); },
  security() {
    if (!this.pass || this.cleared) return;
    if (Object.keys(player.weapons).length) { this.held = player.weapons; player.weapons = {}; equip('fists'); phone('Security', 'Weapons are not allowed past this point. We will hold them until you return.', 6); }
    this.cleared = true; Sound.tone(880, 0.12, 'sine', 0.1); toast('Security cleared'); EventBus.emit('airport:security', {});
  },
  board() {
    if (!this.cleared || !this.pass) return;
    const mode = this.pass.mode; this.pass = null; this.cleared = false;
    EventBus.emit('airport:board', { mode });
    exitInterior(); fadeFlash();
    if (mode === 'charter') this.startCharter(); else this.startScenic();
  },
  returnWeapons() { if (this.held) { for (const k in this.held) player.weapons[k] = this.held[k]; this.held = null; toast('Security returned your weapons'); } },
  runway() { return AIR.runways.slice().sort((a, b) => b.len - a.len)[0]; },
  // ---------------- pilot mode: prop plane lined up on the runway ----------------
  startCharter() {
    const rw = this.runway(); if (!rw) return;
    const a = edgePoint(rw.E, rw.len * 0.06, 1, {});
    const v = new Vehicle('plane', 0x1f4fa8, a.x, a.z, headingTo(a.tx, a.tz)); v.persist = true; v.owned = true; v.fuel = 1; traffic.push(v);
    player.x = v.x; player.z = v.z; enterVehicle(v); camYaw = v.h; camSmoothed = false;
    phone('Tower', 'Madras Tower: cleared for take-off. Throttle up with Space, pull up gently with S past 120 knots, G for gear.', 9);
    EventBus.emit('airport:pilot', { v });
  },
  // ---------------- passenger mode: scripted airliner flight ----------------
  startScenic() {
    const rw = this.runway(); if (!rw) return;
    const a = edgePoint(rw.E, 60, 1, {}), b = edgePoint(rw.E, rw.len - 60, 1, {});
    const v = new Vehicle('airliner', pick([0x1f4fb3, 0xc8251c, 0x178a45]), a.x, a.z, headingTo(a.tx, a.tz)); v.persist = true; v.driver = 'ai'; v.scripted = true; traffic.push(v);
    const coast = ll(13.05, 80.285), north = ll(13.10, 80.30), south = ll(12.99, 80.265);
    const route = [[b.x + a.tx * 1500, 250, b.z + a.tz * 1500], [north[0], 420, north[1]], [coast[0] + 300, 360, coast[1]], [south[0] + 300, 400, south[1]], [a.x - a.tx * 9000, 420, a.z - a.tz * 9000], [a.x - a.tx * 4500, 240, a.z - a.tz * 4500]];
    this.ride = { v, phase: 'roll', route, wi: 0, a, tx: a.tx, tz: a.tz, cabin: false, t: 0, sp: 0 };
    player.passenger = v; pMesh.root.visible = false; camMode = 1;
    toast('Passenger · C cabin / outside view · hold E to skip ahead');
    EventBus.emit('airport:depart', { mode: 'scenic' });
  },
  rideUpdate(dt) {
    const R = this.ride; if (!R) return; const v = R.v; R.t += dt;
    if (v.dead || v.wreck) { this.endRide(true); return; }
    if (In.act('camera')) { R.cabin = !R.cabin; }
    const skip = In.held('interact');
    const turnTo = (tx, tz, rate) => { const want = headingTo(tx - v.x, tz - v.z), dh = wrapAngle(want - v.h); v.h += clamp(dh, -rate * dt, rate * dt); v.roll += (clamp(-dh * 1.2, -0.45, 0.45) - v.roll) * dt * 1.5; return Math.abs(dh); };
    if (R.phase === 'roll') { R.sp = Math.min(R.sp + 2.6 * dt * (skip ? 4 : 1), 80); v.h = headingTo(R.tx, R.tz); if (R.sp > 72) { R.phase = 'cruise'; EventBus.emit('airport:takeoff', {}); } }
    else if (R.phase === 'cruise') {
      const w = R.route[R.wi]; R.sp += (110 - R.sp) * dt * 0.3; turnTo(w[0], w[2], 0.22);
      v.y += clamp(w[1] - v.y, -8 * dt, 9 * dt); v.pitch += (clamp((w[1] - v.y) / 200, -0.12, 0.18) - v.pitch) * dt;
      if (v.y > 40) v.gearDown = false;
      if (Math.hypot(w[0] - v.x, w[2] - v.z) < 400 || (skip && R.wi < R.route.length - 1 && R.t > 2)) { R.wi++; R.t = 0; if (skip) { const n = R.route[Math.min(R.wi, R.route.length - 1)]; v.x = n[0] - (n[0] - v.x) * 0.2; v.z = n[2] - (n[2] - v.z) * 0.2; } }
      if (R.wi >= R.route.length) { R.phase = 'final'; v.gearDown = true; toast('Cabin crew, prepare for landing'); }
    } else if (R.phase === 'final') {
      const d = Math.hypot(R.a.x - v.x, R.a.z - v.z); R.sp += (75 - R.sp) * dt * 0.4; turnTo(R.a.x, R.a.z, 0.3);
      const want = Math.max(0, d * Math.tan(3 * Math.PI / 180)); v.y += clamp(want - v.y, -9 * dt, 3 * dt); v.pitch += (0.05 - v.pitch) * dt;
      if (d < 40 || v.y < 0.6) { R.phase = 'rollout'; v.y = 0; v.pitch = 0; v.roll = 0; v.h = headingTo(R.tx, R.tz); EventBus.emit('airport:landed', {}); }
    } else if (R.phase === 'rollout') { R.sp = Math.max(0, R.sp - 6 * dt); v.y = 0; if (R.sp <= 0.5) { this.endRide(false); return; } }
    v.roll *= Math.exp(-dt * (R.phase === 'roll' ? 6 : 0.4));
    const hz = Math.cos(v.pitch) * R.sp; v.vx = Math.sin(v.h) * hz; v.vz = Math.cos(v.h) * hz; v.vy = 0;
    v.x += v.vx * dt; v.z += v.vz * dt; if (R.phase === 'roll' || R.phase === 'rollout') v.y = 0;
    player.x = v.x; player.z = v.z; player.y = v.y;
    prompt(R.phase === 'rollout' ? 'Welcome to Chennai' : `Passenger · ${key('C', '←')} ${R.cabin ? 'outside view' : 'window seat'} · hold ${key('E', '→')} to skip ahead`);
  },
  endRide(crashed) {
    const R = this.ride; this.ride = null; player.passenger = null; pMesh.root.visible = true; camMode = 0;
    if (crashed) { player.y = 0; wasted(); return; }
    fadeFlash(); R.v.remove();
    this.returnWeapons();
    const s = this.svc; if (s) { s.at = [INT.terminal.spots.jetbridge[0], INT.terminal.spots.jetbridge[1] + 1.5]; s.atH = Math.PI; enterInterior('terminal', s); player.interior.ret = { x: s.x, z: s.z, h: s.h }; }
    banner('ARRIVED', 'Thank you for flying Madras Air', false, 3);
    EventBus.emit('airport:arrived', { mode: 'scenic' });
  },
  // camera for the passenger: chase cam outside, or a window seat looking out over the wing
  camera(dt) {
    const R = this.ride; if (!R) return false; const v = R.v;
    const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -fz, rz = fx;
    if (R.cabin) {
      camera.position.set(v.x + rx * 1.55 + fx * 2, v.y + 4.8, v.z + rz * 1.55 + fz * 2);
      camera.lookAt(v.x + rx * 40 + fx * 25, v.y + 1 - v.roll * 15, v.z + rz * 40 + fz * 25);
    } else {
      updateOrbit(dt, v.x, v.y + 5, v.z, 70);
    }
    return true;
  },
};
// mouse-orbit chase camera used by passenger modes
function updateOrbit(dt, tx, ty, tz, dist) {
  const lx = (mouse.dx * 0.0028 + In.lx * dt * 2.6) * Settings.sens, ly = (mouse.dy * 0.0022 + In.ly * dt * 1.8) * Settings.sens * (Settings.invert ? -1 : 1);
  camYaw -= lx; camPitch = clamp(camPitch + ly, -0.2, 1.2);
  const cp = Math.cos(camPitch); camPos.set(tx - Math.sin(camYaw) * cp * dist, ty + Math.sin(camPitch) * dist, tz - Math.cos(camYaw) * cp * dist);
  camPos.y = Math.max(camPos.y, groundHeightAt(camPos.x, camPos.z, camPos.y + 5) + 1.5);
  if (!camSmoothed) { camera.position.copy(camPos); camSmoothed = true; } else camera.position.lerp(camPos, 1 - Math.exp(-dt * 6));
  camera.lookAt(tx, ty, tz);
}
Systems.register('airport', { init() { Airport.init(); } }, 20);
