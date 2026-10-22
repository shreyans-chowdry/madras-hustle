// ===================== GAME: player, camera, HUD, map, loop =====================
const player = { x: 0, z: 0, y: 0, h: 0, vx: 0, vz: 0, vy: 0, veh: null, health: 100, armor: 0, cash: 0, bank: 0, dead: false, downT: 0, punchT: 0, swim: false, regenT: 0, hurtT: 0,
  weapons: {}, weapon: null, fireT: 0, reloadT: 0, aiming: false, aimT: 0, interior: null, onTrain: null, gunMesh: null, armedThreat: false };
let timeMode = store.get('mh-time') || 'day';
let gameState = 'title', paused = false, hour = 12.5, camYaw = 0, camPitch = 0.3, camMode = 0, shakeT = 0;
const SAVE_KEY = 'mh-save-v2';
function freshSave() { return { cash: 2500, bank: 0, done: [], packages: [], rides: 0, hour: 12.5, props: ['chetpet'], home: 'chetpet', garages: { chetpet: [{ type: 'sedan', color: 0x1f4fa8 }] }, aircraft: [], boats: [], stash: {}, locker: {}, weapons: {}, stats: {} }; }
let saveData = Object.assign(freshSave(), store.get(SAVE_KEY) || {});
player.cash = saveData.cash; player.bank = saveData.bank; hour = timeMode === 'day' ? 12.5 : (saveData.hour || 12.5);
for (const k in saveData.weapons) player.weapons[k] = Object.assign({}, saveData.weapons[k]);
const playerVeh = () => player.veh;
function playerTarget() {
  const v = player.veh;
  if (v) return { x: v.x, z: v.z, vx: v.vx, vz: v.vz, slow: v.speed < 3 };
  if (player.onTrain) return { x: player.onTrain.x, z: player.onTrain.z, vx: 0, vz: 0, slow: false };
  return { x: player.x, z: player.z, vx: player.vx, vz: player.vz, slow: true };
}
function saveGame(silent) {
  saveData.cash = Math.round(player.cash); saveData.bank = Math.round(player.bank); saveData.hour = hour;
  saveData.weapons = JSON.parse(JSON.stringify(player.weapons));
  const ok = store.set(SAVE_KEY, saveData);
  if (!silent) toast(ok ? 'Game saved' : 'Saving is blocked in this browser');
}
// ---------- HUD helpers ----------
const hud = { obj: $('objective'), prompt: $('prompt'), timer: $('timer'), cash: $('cash'), stars: $('stars'), street: $('street'), area: $('area'), clock: $('clock'), kmh: $('kmh'), speedo: $('speedo'), vehname: $('vehname'), hbar: $('hbar').firstElementChild, abar: $('abar').firstElementChild, vbar: $('vbar'), vbarI: $('vbar').firstElementChild, fbar: $('fbar'), fbarI: $('fbar').firstElementChild, weapon: $('weapon'), alt: $('alt') };
let promptText = '', promptCur = null, bannerT = 0, toastT = 0, phoneT = 0;
function setObjective(html) { if (hud.obj._h !== html) { hud.obj.innerHTML = html || ''; hud.obj._h = html; } }
function prompt(html) { promptText = html; }
function key(k, pad) { return GP.connected && performance.now() - GP.lastUse < 20000 && pad ? `<kbd class="pad">${pad}</kbd>` : `<kbd>${k}</kbd>`; }
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); toastT = 2.8; }
function banner(big, sub = '', bad = false, dur = 3.2) { $('bannerBig').textContent = big; $('bannerSub').textContent = sub; const b = $('banner'); b.classList.toggle('bad', bad); b.classList.add('show'); bannerT = dur; }
function phone(from, msg, dur = 9) { $('phoneFrom').textContent = from; $('phoneMsg').textContent = msg; $('phone').classList.add('show'); phoneT = dur; Sound.tone(1200, 0.08, 'sine', 0.12); Sound.tone(1500, 0.1, 'sine', 0.12, 0.1); }
function roadSpot(x, z, side = 1, onRoad = false) {
  const r = roadQuery(x, z, 150, 0);
  if (!r.seg) return { x, z, h: 0 };
  const s = r.seg; const dx = s.bx - s.ax, dz = s.bz - s.az, l = Math.hypot(dx, dz) || 1;
  const tx = dx / l, tz = dz / l, off = onRoad ? 0 : (s.hw + 1.4) * side;
  const sx = x - r.px, sz = z - r.pz, sd = sx * tz - sz * tx >= 0 ? 1 : -1;
  return { x: r.px + tz * off * sd, z: r.pz - tx * off * sd, h: headingTo(tx, tz), rx: r.px, rz: r.pz, tx, tz, hw: s.hw };
}
// ---------- 3D markers ----------
const markerMat = new THREE.MeshBasicMaterial({ color: 0xf6c21c, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
const markerMatB = markerMat.clone(); markerMatB.color.setHex(0x37d6ff);
const beamG = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true); beamG.translate(0, 0.5, 0);
const ringG = new THREE.RingGeometry(0.86, 1, 32); ringG.rotateX(-Math.PI / 2);
function makeMarker(mat = markerMat) { const g = new THREE.Group(); const b = new THREE.Mesh(beamG, mat); const r = new THREE.Mesh(ringG, mat); r.position.y = 0.2; g.add(b, r); g.visible = false; scene.add(g); return g; }
function placeMarker(m, x, z, r = 4, h = 26, y = 0) { m.visible = true; m.position.set(x, y, z); m.scale.set(r, h, r); m.children[1].scale.set(1, 1 / h, 1); }
function labelSprite(text, sub = '', col = '#f6c21c') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
  x.fillStyle = 'rgba(15,12,8,0.82)'; x.fillRect(0, 20, 512, 120); x.fillStyle = col; x.fillRect(0, 20, 10, 120);
  x.font = '400 54px Bungee, Impact, sans-serif'; x.fillStyle = col; x.textBaseline = 'middle'; x.fillText(text, 30, sub ? 64 : 80);
  if (sub) { x.font = '700 32px "Barlow Condensed", sans-serif'; x.fillStyle = '#fbf3dc'; x.fillText(sub, 32, 112); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, fog: false })); s.scale.set(16, 5, 1); scene.add(s); return s;
}
const objMarker = makeMarker(), nextMarker = makeMarker(markerMat.clone()), rideMarker = makeMarker(markerMatB);
nextMarker.children.forEach(c => c.material.opacity = 0.12);
const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(14, 0.9, 8, 40), new THREE.MeshBasicMaterial({ color: 0xf6c21c, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); ringMesh.visible = false; scene.add(ringMesh);

// ---------- player ----------
const pMesh = makePerson(PLAYER_LOOK); scene.add(pMesh.root);
const headL = new THREE.SpotLight(0xfff0d0, 0, 80, 0.55, 0.45, 1.0); scene.add(headL, headL.target);
function freeSpot(x, z, rad = 0.6) {
  for (let r = 0; r < 40; r += 1.5) for (let k = 0; k < (r ? 12 : 1); k++) {
    const a = k / 12 * TAU, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (insideBuilding(px, pz) < 0 && !inWater(px, pz) && !collideCircle(px, pz, rad).hit) return [px, pz];
  }
  return [x, z];
}
function homeProp() { return PROPERTIES.find(p => p.id === saveData.home && p.door) || PROPERTIES.find(p => p.door); }
function spawnAtHome() {
  const P = homeProp(); const d = P ? P.door : { x: 0, z: 0, h: 0 };
  const [x, z] = freeSpot(d.x, d.z); player.x = x; player.z = z; player.y = sidewalkY(x, z); player.vx = player.vz = 0; player.h = d.h + Math.PI; camYaw = player.h;
}
function enterVehicle(v) {
  if (v.displayOnly) return;
  if ((v.driver === 'ai' || (v.agent && !v.parked)) && v.kind === 'car') {
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    const w = new Walker(randomLook(), v.x - fz * (v.spec.wid / 2 + 0.8), v.z + fx * (v.spec.wid / 2 + 0.8));
    w.scare(player.x, player.z);
    if (v.isPolice) { crime('hitCop', v.x, v.z); w.cop = true; w.state = 'cop'; w.special = true; w.arm('pistol'); Police.copPeds.push(w); } else crime('jack', v.x, v.z);
    if (v.isPolice) { const i = Police.units.indexOf(v); if (i >= 0) Police.units.splice(i, 1); v.siren = false; }
  }
  if (v.flight) { v.flight = null; crime('airport', v.x, v.z); }
  if (v.moored || v.shipDir !== undefined) { v.moored = false; }
  v.driver = 'player'; v.agent = null; v.parked = false; v.persist = true; v.heliAI = null;
  if (v.driverMesh && !v._playerSeat) { const pos = v.driverMesh.position.clone(), rot = v.driverMesh.rotation.clone(); v.group.remove(v.driverMesh); v.driverMesh = seatedMesh(PLAYER_LOOK); v.driverMesh.position.copy(pos); v.driverMesh.rotation.copy(rot); v.group.add(v.driverMesh); v._playerSeat = true; }
  player.veh = v; pMesh.root.visible = false;
  for (const o of traffic) if (o !== v && o.persist && !o.mission && !o.isPolice && o.driver !== 'player' && !o.owned && !o.flight && !o.moored && o.kind === 'car') o.persist = false;
  hud.vehname.textContent = v.spec.name;
  if (v.kind === 'heli' || v.kind === 'plane') { toast(v.kind === 'heli' ? 'Space / R2: climb · Shift / L2: descend · W S A D: fly' : 'Space / R2: throttle up · Shift / L2: down · W S: pitch · A D: roll'); camMode = 1; }
}
function exitVehicle(force = false) {
  const v = player.veh; if (!v) return;
  const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -fz, rz = fx;
  let px = v.x + rx * (v.spec.wid / 2 + 0.9), pz = v.z + rz * (v.spec.wid / 2 + 0.9), py = v.y;
  if (v.kind === 'car') {
    for (const [dx, dz] of [[rx, rz], [-rx, -rz], [fx, fz], [-fx, -fz]]) {
      const d = (Math.abs(dx * fx + dz * fz) > 0.5 ? v.spec.len / 2 : v.spec.wid / 2) + 0.9, x = v.x + dx * d, z = v.z + dz * d;
      if (insideBuilding(x, z) < 0 && !collideCircle(x, z, 0.4, v.y).hit) { px = x; pz = z; break; }
    }
  } else if (v.kind === 'heli' || v.kind === 'plane') { py = v.y + 0.2; }
  player.x = px; player.z = pz; player.y = py; player.h = v.h; player.vx = v.vx * 0.5; player.vz = v.vz * 0.5; player.vy = 0;
  v.driver = null; if (v.driverMesh) v.driverMesh.visible = false;
  player.veh = null; pMesh.root.visible = true;
  if ((v.speed > 7 && v.kind === 'car') || force) { player.downT = 1.2; player.health -= 6; }
  if (rideJob.active && rideJob.stage === 'carry') endRideJob('Your passenger got out.');
  camMode = 0;
}
function hurtPlayer(d) {
  if (player.dead) return;
  if (player.armor > 0) { const a = Math.min(player.armor, d * 0.7); player.armor -= a; d -= a; }
  player.health -= d; player.hurtT = 0.4; player.regenT = 6; $('hurt').style.opacity = clamp(d / 30, 0.25, 0.8); rumble(0.6, 0.3, 120);
  if (player.health <= 0) wasted();
}
const pctrl = { throttle: 0, brake: 0, steer: 0, handbrake: false, pitch: 0, roll: 0, yaw: 0, lift: 0, active: true };
function nearbyEnterable() {
  let best = null, bd = 1e9;
  for (const v of vehicles) {
    if (v.wreck || v.sinkT > 0 || v.displayOnly && !(player.interior && player.interior.type === 'garage' && v.display)) continue;
    if (v.flight && v.flight.phase !== 'parked' && v.flight.phase !== 'roll') continue;
    const reach = v.kind === 'car' ? v.spec.len / 2 + 2.2 : v.type === 'cargo' ? 70 : v.kind === 'boat' ? v.spec.len / 2 + 3 : v.spec.len / 2 + 2.5;
    const d = Math.hypot(v.x - player.x, v.z - player.z) - reach;
    if (d < 0 && d < bd && Math.abs(v.y - player.y) < (v.type === 'cargo' ? 15 : 2.5)) { bd = d; best = v; }
  }
  return best;
}
function updatePlayerFoot(dt) {
  const p = player;
  if (p.downT > 0) {
    p.downT -= dt; p.vx *= Math.exp(-dt * 4); p.vz *= Math.exp(-dt * 4);
    p.x += p.vx * dt; p.z += p.vz * dt; const r = collideCircle(p.x, p.z, 0.4, p.y); p.x = r.x; p.z = r.z;
    pMesh.inner.rotation.x = -Math.PI / 2 * Math.min(1, p.downT * 2); pMesh.inner.position.y = 0.15; return;
  }
  pMesh.inner.rotation.x = 0; pMesh.inner.position.y = 0;
  // aiming
  p.aiming = In.held('aim') && !!p.weapon;
  p.aimT = p.aiming ? Math.min(1, p.aimT + dt * 4) : Math.max(0, p.aimT - dt * 5);
  pMesh.aim = p.aimT;
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = -fz, rz = fx;
  let dx = fx * In.my + rx * In.mx, dz = fz * In.my + rz * In.mx; const ml = Math.min(1, Math.hypot(dx, dz));
  const sprint = In.held('sprint') && !p.aiming;
  const sp = (p.swim ? 1.8 : sprint ? 7.0 : p.aiming ? 2.6 : 3.6) * ml;
  let tvx = 0, tvz = 0;
  if (ml > 0.05) { const l = Math.hypot(dx, dz); dx /= l; dz /= l; tvx = dx * sp; tvz = dz * sp; if (!p.aiming) p.h += wrapAngle(headingTo(dx, dz) - p.h) * Math.min(1, dt * 12); }
  if (p.aiming) p.h += wrapAngle(camYaw - p.h) * Math.min(1, dt * 18);
  p.vx += (tvx - p.vx) * Math.min(1, dt * 10); p.vz += (tvz - p.vz) * Math.min(1, dt * 10);
  p.x += p.vx * dt; p.z += p.vz * dt;
  if (p.interior) { interiorCollide(); p.y = 0; }
  else {
    p.x = clamp(p.x, BX0 + 3, BX1 - 3); p.z = clamp(p.z, BZ0 + 3, BZ1 - 3);
    const s = surfaceAt(p.x, p.z, p.y);
    let ground = s.elev ? s.y : sidewalkY(p.x, p.z);
    const bi = insideBuilding(p.x, p.z); if (bi >= 0 && p.y >= bPolys[bi].h - 1.5) ground = bPolys[bi].h;   // on a rooftop
    const deck = shipDeckAt(p.x, p.z, p.y); if (deck !== null) ground = deck;
    if (In.act('jump') && p.y <= ground + 0.05 && !p.swim) p.vy = 5.2;
    p.vy -= 18 * dt; p.y += p.vy * dt;
    if (p.y <= ground) { if (p.vy < -16) hurtPlayer((-p.vy - 14) * 8); p.y = ground; p.vy = 0; }
    if (s.elev && p.y > 0.8 && s.ex > -0.4) { const ex = p.x - s.px, ez = p.z - s.pz, l = Math.hypot(ex, ez) || 1, push = s.ex + 0.4; p.x -= ex / l * push; p.z -= ez / l * push; }
    const r = collideCircle(p.x, p.z, 0.4, p.y); p.x = r.x; p.z = r.z;
    p.swim = p.y < 0.4 && inWater(p.x, p.z) && !(roadQuery(p.x, p.z, 3).d < 0);
    if (p.swim) p.y = -0.9 + Math.sin(performance.now() / 400) * 0.05;
    for (const v of vehicles) {
      const ddx = p.x - v.x, ddz = p.z - v.z; if (ddx * ddx + ddz * ddz > 64 || Math.abs(v.y - p.y) > 1.6 || v.kind !== 'car') continue;
      const vfx = Math.sin(v.h), vfz = Math.cos(v.h);
      for (const [o, rr] of v.spec.circles) {
        const cx = v.x + vfx * o, cz = v.z + vfz * o, ex = p.x - cx, ez = p.z - cz, d = Math.hypot(ex, ez), R = rr + 0.4;
        if (d < R && d > 0) {
          if (v.speed > 4.5 && v.driver) { p.vx = v.vx * 0.8 + ex / d * 3; p.vz = v.vz * 0.8 + ez / d * 3; p.downT = 1.6; hurtPlayer(v.speed * 2.4); Sound.crash(0.4); }
          else { p.x = cx + ex / d * R; p.z = cz + ez / d * R; }
          break;
        }
      }
    }
  }
  // weapons
  if (In.act('nextWeapon')) cycleWeapon(1); if (In.act('prevWeapon')) cycleWeapon(-1);
  for (let k = 1; k <= 8; k++) if (hit('Digit' + k)) { const w = WEAPON_ORDER[k - 1]; if (w === 'fists' || p.weapons[w]) equip(w); }
  if (p.fireT > 0) p.fireT -= dt;
  if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) finishReload(); }
  if (In.act('reload')) reload();
  if (p.weapon) {
    const W = WEAPONS[p.weapon];
    const firing = W.auto ? In.held('fire') : (In.act('punch') || (mouse.clicked && pointerLocked));
    if (firing && p.reloadT <= 0 && (p.aiming || !p.interior)) { if (!p.aiming) p.h = camYaw; playerFire(); }
  } else if (p.punchT > 0) { p.punchT -= dt; pMesh.arms[1].rotation.x = -1.5 * Math.sin((0.3 - p.punchT) / 0.3 * Math.PI); }
  else if (In.act('punch')) {
    p.punchT = 0.3; Sound.tone(220, 0.06, 'triangle', 0.05);
    const fx2 = Math.sin(p.h), fz2 = Math.cos(p.h);
    for (const w of peds) {
      if (w.state === 'down' || w.state === 'board' || w.state === 'dead') continue;
      const ex = w.x - p.x, ez = w.z - p.z, d = Math.hypot(ex, ez);
      if (d < 1.7 && (ex * fx2 + ez * fz2) / (d || 1) > 0.3) { w.knock(fx2 * 4, fz2 * 4, 9); Sound.punch(); rumble(0.4, 0.2, 80); crime(w.cop ? 'hitCop' : 'punch', w.x, w.z); for (const o of peds) if (o !== w && dist2(o.x, o.z, p.x, p.z) < 400) o.scare(p.x, p.z); break; }
    }
  }
  player.armedThreat = !!p.weapon && p.aiming;
  const spd = Math.hypot(p.vx, p.vz);
  if (p.punchT <= 0) animatePerson(pMesh, p.swim ? 1 : spd, dt);
  // enter vehicles
  if (!p.interior || p.interior.type === 'garage') {
    const best = nearbyEnterable();
    if (best) {
      const verb = best.display ? 'take the ' + best.spec.name.toLowerCase() + ' out' : best.driver === 'ai' && best.kind === 'car' ? (best.isPolice ? 'steal the police car' : 'steal the ' + best.spec.name.toLowerCase()) : best.owned ? 'get in your ' + best.spec.name.toLowerCase() : 'get in the ' + best.spec.name.toLowerCase();
      prompt(`${key('F', '△')} ${verb}`);
      if (In.act('enter')) {
        if (best.display) { takeCarFromGarage(best); }
        else { if (best.type === 'cargo' && best.y < 3) { best.x = best.x; } enterVehicle(best); }
      }
    }
  }
}
function takeCarFromGarage(v) {
  const P = v.display.prop; const list = saveData.garages[P.id]; const c = list.splice(v.display.idx, 1)[0]; saveGame(true);
  exitInterior(); const s = P.garageSpot; const nv = new Vehicle(c.type, c.color, s.x, s.z, s.h); nv.persist = true; nv.owned = true; nv.fromGarage = P.id; traffic.push(nv); player.x = nv.x; player.z = nv.z; enterVehicle(nv);
}
function storeCarInGarage(P) {
  const v = player.veh; const list = saveData.garages[P.id] = saveData.garages[P.id] || [];
  if (list.length >= P.garage) { toast('Garage full'); return; }
  if (v.kind !== 'car' || ['bus', 'truck', 'police', 'swat', 'ambulance', 'van'].includes(v.type)) { toast('That vehicle won\'t fit in your garage'); return; }
  list.push({ type: v.type, color: v.color }); exitVehicle(); v.remove(); saveGame(true); toast(`Stored in ${P.name} garage (${list.length}/${P.garage})`); fadeFlash();
}
function shipDeckAt(x, z, y) {
  for (const v of vehicles) if (v.type === 'cargo' && Math.abs(v.x - x) < 25 && Math.abs(v.z - z) < 80) {
    const fx = Math.sin(v.h), fz = Math.cos(v.h), lx = (x - v.x) * fz - (z - v.z) * fx, lz = (x - v.x) * fx + (z - v.z) * fz;
    if (Math.abs(lx) < v.spec.wid / 2 && Math.abs(lz) < v.spec.len * 0.45 && y > 3) return 6.4 + v.y;
  }
  return null;
}
function updatePlayerVehicle(dt) {
  const v = player.veh;
  pctrl.throttle = In.throttle; pctrl.brake = In.brake; pctrl.steer = -In.mx; pctrl.handbrake = In.held('handbrake');
  if (v.kind === 'heli') { pctrl.pitch = In.my; pctrl.yaw = In.mx; pctrl.roll = (In.held('yawR') ? 1 : 0) - (In.held('yawL') ? 1 : 0); pctrl.lift = (In.held('up') ? 1 : 0) - (In.held('down') ? 1 : 0); pctrl.active = v.fuel > 0; }
  if (v.kind === 'plane') { pctrl.pitch = In.my; pctrl.roll = In.mx; pctrl.yaw = (In.held('yawR') ? 1 : 0) - (In.held('yawL') ? 1 : 0); pctrl.lift = (In.held('up') ? 1 : 0) - (In.held('down') ? 1 : 0); }
  if (v.kind === 'car' || v.kind === 'boat') { if (GP.connected && GP.b[BTN.R2] > 0.05) pctrl.throttle = GP.b[BTN.R2]; }
  v.update(dt, pctrl);
  if (v.kind === 'car' && v.smokeT > 0 && pctrl.handbrake) { const fx = Math.sin(v.h), fz = Math.cos(v.h); Fx.tire(v.x - fx * v.spec.len * 0.4, v.y + 0.3, v.z - fz * v.spec.len * 0.4); v.smokeT = 0; }
  // drive-by shooting
  player.aiming = In.held('aim') && !!player.weapon && v.kind === 'car';
  if (player.fireT > 0) player.fireT -= dt; if (player.reloadT > 0) { player.reloadT -= dt; if (player.reloadT <= 0) finishReload(); }
  if (player.aiming && player.weapon && WEAPONS[player.weapon].mag < 40 && In.held('fire') && player.reloadT <= 0) playerFire();
  if (In.act('enter') && (v.kind !== 'heli' && v.kind !== 'plane' || v.y < groundHeightAt(v.x, v.z, v.y + 2) + 1.5 || v.speed < 3)) { exitVehicle(); return; }
  if (In.act('enter') && (v.kind === 'heli' || v.kind === 'plane')) { exitVehicle(); player.vy = 0; toast('Bailed out!'); return; }
  if (In.act('flip') && v.kind === 'car' && v.speed < 3) { const r = roadQuery(v.x, v.z, 30); if (r.seg) { v.x = r.px; v.z = r.pz; v.y = r.y; v.h = headingTo(r.seg.bx - r.seg.ax, r.seg.bz - r.seg.az); v.vx = v.vz = 0; toast('Back on the road'); } }
  if (In.held('horn')) for (const w of peds) { if (dist2(w.x, w.z, v.x, v.z) < 324 && Math.random() < dt * 2) w.scare(v.x, v.z); }
  player.x = v.x; player.z = v.z; player.y = v.y;
  if (v.fuel <= 0 && v.kind !== 'cargo' && !v._fuelWarned) { v._fuelWarned = true; toast('Out of fuel! Find a fuel station.'); }
  if (v.fuel > 0.05) v._fuelWarned = false;
}
function onPlayerVehicleSink(v) {
  Fx.splash(v.x, 0.2, v.z); Sound.crash(0.4); toast('Splash!');
  setTimeout(() => { if (player.veh === v) { exitVehicle(); player.y = 0; hurtPlayer(10); } setTimeout(() => v.remove(), 4000); }, 1300);
}
function onVehicleHit(A, B, imp) {
  const pv = player.veh;
  if (A === pv || B === pv) {
    const o = A === pv ? B : A;
    shakeT = Math.min(0.5, imp * 0.04);
    if (o.isPolice && imp > 3) crime('ramCop', o.x, o.z);
    if (o.agent) { o.agent.panic = 4; o.hornT = 0.6; }
    if (rideJob.active && rideJob.stage === 'carry' && imp > 5) { rideJob.fare = Math.max(10, rideJob.fare - 15); if (Math.random() < 0.5) phone('Passenger', pick(['Careful! I want to arrive in one piece.', 'Is this a race?', 'Watch the road!', 'My tip is shrinking with every bump.']), 4); }
  }
}
function explodeVehicle(v) {
  const wasPlayer = player.veh === v;
  v.setWreck(); explosion(v.x, v.y, v.z, v.kind === 'plane' && v.type === 'airliner' ? 3 : v.kind === 'heli' || v.kind === 'plane' ? 1.8 : 1, v.lastHitByPlayer);
  if (wasPlayer) { exitVehicle(true); hurtPlayer(70); player.downT = 2; }
  if (v.isPolice && v.lastHitByPlayer) crime('boomCop', v.x, v.z);
  onVehicleDestroyed(v);
}
// ---------- camera ----------
const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
let camSmoothed = false;
function updateCamera(dt) {
  const v = player.veh;
  let lx = mouse.dx * 0.0028 + In.lx * dt * 2.6, ly = mouse.dy * 0.0022 + In.ly * dt * 1.8;
  const sens = player.aiming ? 0.55 : 1;
  if (lx || ly) { camYaw -= lx * sens; camPitch = clamp(camPitch + ly * sens, -0.5, 1.2); mouse.lastMove = performance.now(); }
  if (In.act('camera')) { camMode = (camMode + 1) % 3; toast(['Close camera', 'Far camera', 'High camera'][camMode]); }
  let tx, ty, tz, dist, pitch = camPitch, side = 0;
  if (player.onTrain) { const T = player.onTrain; tx = T.x; ty = T.y + 4; tz = T.z; dist = 30; pitch = Math.max(pitch, 0.35); }
  else if (v) {
    const big = v.kind === 'heli' || v.kind === 'plane' || v.kind === 'boat';
    tx = v.x; ty = v.y + 1.1 + Math.min(v.spec.len, 40) * (big ? 0.12 : 0.07); tz = v.z;
    const L = Math.min(v.spec.len, v.type === 'cargo' ? 160 : 60);
    dist = [L * 1.15 + 4.2, L * 1.6 + 9, L * 2.2 + 18][camMode];
    if (player.aiming) { dist = L * 0.8 + 3; side = 1.0; }
    const idle = performance.now() - mouse.lastMove > 1100;
    if (idle && v.speed > 2) {
      const want = v.fwdSpeed < -3 && v.kind === 'car' ? v.h + Math.PI : v.h;
      camYaw += wrapAngle(want - camYaw) * Math.min(1, dt * (v.kind === 'plane' ? 4 : 2.6));
      const wp = v.kind === 'plane' ? 0.22 - v.pitch * 0.8 : v.kind === 'heli' ? 0.32 : 0.2;
      camPitch += (wp - camPitch) * Math.min(1, dt * 1.5);
    }
    if (In.held('lookBack')) { pitch = 0.2; }
  } else {
    tx = player.x; ty = player.y + 1.5; tz = player.z;
    dist = camMode === 1 ? 8.5 : camMode === 2 ? 16 : 5.4;
    if (player.aimT > 0) { const W = WEAPONS[player.weapon || 'pistol']; dist = lerp(dist, W && W.scope ? 1.4 : 2.6, player.aimT); side = 0.75 * player.aimT; ty += 0.15 * player.aimT; }
    if (player.interior) dist = Math.min(dist, 4.5);
  }
  const yaw = camYaw + (In.held('lookBack') && v ? Math.PI : 0);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const sx = -Math.cos(yaw) * side, sz = Math.sin(yaw) * side;
  tx += sx; tz += sz;
  let cx = tx - Math.sin(yaw) * cp * dist, cz = tz - Math.cos(yaw) * cp * dist, cy = ty + sp * dist;
  if (!player.interior) {
    const t = rayWalls(tx, tz, cx, cz, ty, cy);
    if (t < 1) { const d2 = Math.max(1.0, t * dist - 0.4); cx = tx - Math.sin(yaw) * cp * d2; cz = tz - Math.cos(yaw) * cp * d2; cy = ty + sp * d2; }
    cy = Math.max(cy, (player.swim ? -0.4 : 0.5));
  } else {
    // indoors: pull the camera in along its own line so it never ends up on top of the player
    const I = INT[player.interior.type]; const x0 = I.x - I.W / 2 + 0.4, x1 = I.x + I.W / 2 - 0.4, z0 = I.z - I.D / 2 + 0.4, z1 = I.z + I.D / 2 - 0.4;
    let k = 1; const ddx = cx - tx, ddz = cz - tz, ddy = cy - ty;
    if (cx < x0) k = Math.min(k, (x0 - tx) / ddx); if (cx > x1) k = Math.min(k, (x1 - tx) / ddx);
    if (cz < z0) k = Math.min(k, (z0 - tz) / ddz); if (cz > z1) k = Math.min(k, (z1 - tz) / ddz);
    if (cy > I.H - 0.4) k = Math.min(k, (I.H - 0.4 - ty) / ddy);
    k = clamp(k, 0.18, 1); cx = tx + ddx * k; cz = tz + ddz * k; cy = clamp(ty + ddy * k, 0.5, I.H - 0.3);
  }
  camPos.set(cx, cy, cz);
  if (!camSmoothed) { camera.position.copy(camPos); camSmoothed = true; }
  else camera.position.lerp(camPos, 1 - Math.exp(-dt * (player.aimT > 0.5 ? 30 : v ? 10 : 14)));
  camTarget.set(tx, ty, tz);
  if (shakeT > 0) { shakeT -= dt; camera.position.x += (Math.random() - 0.5) * shakeT * 1.2; camera.position.y += (Math.random() - 0.5) * shakeT * 1.2; }
  camera.lookAt(camTarget);
  const W = player.weapon && WEAPONS[player.weapon];
  const fov = (W && W.scope && player.aimT > 0.8 ? 22 : 62) + (v ? clamp(v.speed - 12, 0, 50) * 0.3 : 0);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
  const far = v && (v.kind === 'heli' || v.kind === 'plane') ? Math.max(Q.far, 2400) : Q.far;
  if (camera.far !== far) { camera.far = far; camera.updateProjectionMatrix(); scene.fog.far = v && v.y > 80 ? Q.fogFar * 1.8 : Q.fogFar; }
  $('crosshair').hidden = !(player.aimT > 0.5 || (player.aiming && player.veh));
  $('scope').hidden = !(W && W.scope && player.aimT > 0.8);
}
// ---------- wasted / busted ----------
let respawnT = 0, respawnAt = null;
function nearestOf(type, x, z) { let b = null, bd = 1e18; for (const p of G.pois) if (p.t === type && (type !== 'hospital' || p.a > 5000)) { const d = dist2(p.x, p.z, x, z); if (d < bd) { bd = d; b = p; } } return b; }
function wasted() {
  if (player.dead) return; player.dead = true; player.health = 0;
  if (player.veh) exitVehicle(true);
  if (player.onTrain) { player.onTrain = null; }
  banner('WASTED', 'Waking up at the hospital…', true, 3.5); Sound.fail(); rumble(1, 1, 600);
  respawnAt = { p: nearestOf('hospital', player.x, player.z), kind: 'hospital' }; respawnT = 3.5;
  if (mission) failMission('', true);
}
function busted() {
  if (player.dead) return; player.dead = true;
  if (player.veh) exitVehicle();
  banner('BUSTED', 'You lose your cash and weapons', true, 3.5); Sound.fail();
  respawnAt = { p: nearestOf('police', player.x, player.z), kind: 'police' }; respawnT = 3.5;
  if (mission) failMission('', true);
}
function doRespawn() {
  if (player.interior) exitInterior();
  const p = respawnAt.p; const s = p ? roadSpot(p.x, p.z, 1) : roadSpot(player.x, player.z, 1);
  for (const w of [...peds]) if (w.cop) w.remove();
  Police.set(0); Police.copPeds = [];
  for (const v of [...traffic]) if (v.isPolice && !v.wreck) v.remove();
  const [fx, fz] = freeSpot(s.x, s.z); player.x = fx; player.z = fz; player.y = sidewalkY(fx, fz); player.vx = player.vz = 0; player.downT = 0; player.dead = false; player.health = 100;
  pMesh.root.visible = true; pMesh.inner.rotation.x = 0;
  let msg;
  if (respawnAt.kind === 'hospital') { const fee = Math.min(player.cash + player.bank, 1000); spend(fee); msg = 'Hospital bill ' + money(fee); }
  else { const lost = player.cash; player.cash = 0; player.weapons = {}; equip('fists'); msg = 'Busted: lost ' + money(lost) + ' cash and your weapons'; }
  toast(msg + (p ? ' · ' + p.n : '')); respawnAt = null; camSmoothed = false; saveGame(true);
}
// ---------- taxi / auto rides ----------
const rideJob = { active: false, stage: '', ped: null, dest: null, timer: 0, fare: 0 };
const RIDE_TYPES = new Set(['station', 'mall', 'cinema', 'hospital', 'sight', 'college', 'market', 'hotel', 'stadium', 'airport']);
function endRideJob(msg) {
  if (rideJob.ped && !rideJob.ped.dead) { rideJob.ped.special = false; rideJob.ped.state = 'walk'; rideJob.ped.snapToRoad(); }
  rideJob.active = false; rideJob.ped = null; rideMarker.visible = false; setObjective(''); if (msg) toast(msg);
}
function spawnRidePassenger() {
  const cands = edgesNear(player.x, player.z, 120, 380);
  for (let t = 0; t < 30; t++) {
    const ei = pick(cands); const E = G.edges[ei]; if (!E || E.elev || E.len < 10) continue;
    edgePoint(E, E.len / 2, 1, _P); const side = Math.random() < 0.5 ? 1 : -1, off = (E.hw + 1.3) * side;
    const x = _P.x + _P.tz * off, z = _P.z - _P.tx * off;
    if (insideBuilding(x, z) >= 0 || inWater(x, z)) continue;
    const w = new Walker(randomLook(), x, z); w.state = 'wait'; w.special = true; w.h = headingTo(-_P.tz * side, _P.tx * side); rideJob.ped = w; return;
  }
}
function updateRideJob(dt) {
  const pv = player.veh;
  if (!rideJob.active) { if (pv && (pv.type === 'auto' || pv.type === 'taxi') && !mission) { prompt(`${key('T', 'D-pad ↓')} Start ${pv.type === 'taxi' ? 'taxi' : 'auto'} rides`); if (In.act('rides')) { rideJob.active = true; rideJob.stage = 'find'; spawnRidePassenger(); toast('Rides started'); } } return; }
  if (In.act('rides') || mission) return endRideJob('Rides stopped');
  if (!pv || (pv.type !== 'auto' && pv.type !== 'taxi')) { if (rideJob.stage === 'find') return endRideJob('You left your ride. Rides stopped.'); }
  rideMarker.visible = false;
  if (rideJob.stage === 'find') {
    const w = rideJob.ped; if (!w || (w.dead && !rideJob.boarding) || w.state === 'down' || w.state === 'dead') { rideJob.ped = null; rideJob.boarding = false; spawnRidePassenger(); return; }
    setObjective('Pick up the <b>passenger</b> waving for a ride');
    placeMarker(rideMarker, w.x, w.z, 2.5, 8);
    if (w.state === 'wait' && pv && Math.hypot(pv.x - w.x, pv.z - w.z) < 8 && pv.speed < 2) { w.state = 'board'; w.bx = pv.x; w.bz = pv.z; rideJob.boarding = true; }
    if (w.state === 'board' && pv) { w.bx = pv.x; w.bz = pv.z; }
    if (w.dead) {
      const opts = G.pois.filter(p => RIDE_TYPES.has(p.t) && p.n.length < 34).map(p => [p, Math.hypot(p.x - pv.x, p.z - pv.z)]).filter(([, d]) => d > 500 && d < 2600);
      const [dest, d] = pick(opts.length ? opts : [[G.pois[0], 800]]); const s = roadSpot(dest.x, dest.z, 1, true);
      rideJob.dest = { n: dest.n, x: s.x, z: s.z }; rideJob.timer = Math.round(d / 7.5 + 25); rideJob.fare = Math.round(40 + d * 0.08); rideJob.stage = 'carry'; rideJob.ped = null; rideJob.boarding = false;
      phone('Passenger', pick([`${dest.n}, please.`, `Take me to ${dest.n}. Do you know a shortcut?`, `${dest.n}. And no detours!`, `${dest.n}, quickly! I'm already late.`]), 6);
    }
  } else if (rideJob.stage === 'carry') {
    rideJob.timer -= dt; setObjective(`Take your passenger to <b>${rideJob.dest.n}</b> · fare ${money(rideJob.fare)}`);
    placeMarker(rideMarker, rideJob.dest.x, rideJob.dest.z, 6, 20);
    if (rideJob.timer <= 0) { rideJob.stage = 'find'; spawnRidePassenger(); toast('Too slow! The passenger left without paying.'); return; }
    if (pv && Math.hypot(pv.x - rideJob.dest.x, pv.z - rideJob.dest.z) < 9) {
      if (pv.speed < 2.5) {
        const bonus = Math.round(rideJob.timer * 1.5); addCash(rideJob.fare + bonus); saveData.rides = (saveData.rides || 0) + 1; toast(`Fare ${money(rideJob.fare)} + tip ${money(bonus)}`);
        const w = new Walker(randomLook(), pv.x - Math.cos(pv.h) * 1.6, pv.z + Math.sin(pv.h) * 1.6); w.snapToRoad();
        rideJob.stage = 'find'; spawnRidePassenger();
      } else setObjective('Stop to drop your passenger');
    }
  }
}
// ---------- hidden packages ----------
const packages = [];
function buildPackages() {
  const r = rng(808); const cands = G.pois.filter(p => ['sight', 'station', 'market', 'worship', 'college', 'stadium', 'cinema'].includes(p.t)); const used = [];
  const m = new THREE.MeshStandardMaterial({ color: 0xc9a24e, metalness: 0.7, roughness: 0.3, emissive: 0x3a2a08 });
  const g = new THREE.BoxGeometry(0.7, 0.5, 0.5);
  let guard = 0;
  while (packages.length < 40 && guard++ < 1200) {
    const p = cands[Math.floor(r() * cands.length)]; if (!p) break;
    if (used.some(u => dist2(u[0], u[1], p.x, p.z) < 500 * 500)) continue;
    const s = roadSpot(p.x, p.z, 1); if (insideBuilding(s.x, s.z) >= 0) continue; used.push([p.x, p.z]);
    const mesh = new THREE.Mesh(g, m); mesh.position.set(s.x, 0.6, s.z); scene.add(mesh); const i = packages.length;
    packages.push({ x: s.x, z: s.z, m: mesh, i, got: saveData.packages.includes(i) }); if (packages[i].got) mesh.visible = false;
  }
}
function updatePackages(dt) {
  const t = performance.now() / 1000;
  for (const c of packages) {
    if (c.got) continue; const d2 = dist2(c.x, c.z, player.x, player.z); c.m.visible = d2 < 250 * 250 && !player.interior; if (!c.m.visible) continue;
    c.m.rotation.y = t * 2; c.m.position.y = 0.6 + Math.sin(t * 3 + c.i) * 0.15;
    if (d2 < (player.veh ? 16 : 6) && Math.abs(player.y) < 3) {
      c.got = true; c.m.visible = false; saveData.packages.push(c.i); const n = saveData.packages.length; addCash(1000); Fx.confetti(c.x, 1, c.z);
      toast(`Hidden package ${n}/${packages.length} · +$1,000`); if (n === packages.length) { payBank(250000); banner('ALL PACKAGES FOUND', '+$250,000 and a minigun in every safehouse', false, 5); giveWeapon('minigun', 500); }
      saveGame(true);
    }
  }
}
// ---------- GPS ----------
const gps = { target: null, kind: '', line: null, T: 0, from: null };
let waypoint = null;
function updateGPS(dt) {
  let t = null, kind = '';
  const st = stepTarget();
  if (st) { t = st; kind = 'mission'; }
  else if (rideJob.active && rideJob.stage === 'carry') { t = [rideJob.dest.x, rideJob.dest.z]; kind = 'ride'; }
  else if (rideJob.active && rideJob.ped) { t = [rideJob.ped.x, rideJob.ped.z]; kind = 'ride'; }
  else if (waypoint) { t = waypoint; kind = 'way'; if (Math.hypot(player.x - t[0], player.z - t[1]) < 15) { waypoint = null; toast('You have arrived'); } }
  gps.T -= dt;
  if (!t || player.interior) { gps.line = null; gps.target = null; return; }
  const air = player.veh && (player.veh.kind !== 'car');
  const moved = gps.from ? Math.hypot(player.x - gps.from[0], player.z - gps.from[1]) : 1e9;
  const changed = !gps.target || Math.hypot(gps.target[0] - t[0], gps.target[1] - t[1]) > 20;
  if (changed || (gps.T <= 0 && moved > 35)) {
    gps.T = 1.5; gps.target = t; gps.kind = kind; gps.from = [player.x, player.z];
    if (air) { gps.line = [[player.x, player.z], t]; return; }
    const a = nearestNode(player.x, player.z), b = nearestNode(t[0], t[1]);
    const path = astar(a, b);
    gps.line = path ? [[player.x, player.z], [G.nodes[a].x, G.nodes[a].z], ...pathPolyline(a, path), t] : [[player.x, player.z], t];
  }
  gps.kind = kind;
}
// ---------- minimap ----------
const MS = 0.25; let mapCanvas = null, mapImg = null;
function buildMapCanvas() {
  const W = Math.ceil((BX1 - BX0) * MS), H = Math.ceil((BZ1 - BZ0) * MS);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const T = (px, pz) => [(px - BX0) * MS, (pz - BZ0) * MS];
  const poly = (pts, fill) => { x.beginPath(); pts.forEach((p, i) => { const [a, b] = T(p[0], p[1]); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); x.fillStyle = fill; x.fill(); };
  const polyD = (p, fill) => poly(toPts(p), fill);
  x.fillStyle = '#3a3f44'; x.fillRect(0, 0, W, H);
  WD.areas.sea.forEach(d => polyD(d.p, '#2f6f97')); WD.areas.beach.forEach(d => polyD(d.p, '#8f8060'));
  WD.areas.water.forEach(d => { polyD(d.p, '#2f6f97'); (d.hl || []).forEach(h => polyD(h, '#3a3f44')); });
  WD.areas.green.forEach(d => polyD(d.p, '#45603c')); WD.areas.pitch.forEach(d => polyD(d.p, '#4f6e42'));
  (WD.air ? WD.air.apron : []).forEach(d => polyD(d.p, '#5a5e62'));
  for (const b of bPolys) poly(b.pts, b.h > 55 ? '#5d646b' : '#4b5157');
  x.strokeStyle = '#6d5f52'; x.lineWidth = 1; x.setLineDash([3, 3]);
  railLines.forEach(L => { x.beginPath(); for (let k = 0; k < L.xs.length; k++) { const [a, b] = T(L.xs[k], L.zs[k]); k ? x.lineTo(a, b) : x.moveTo(a, b); } x.stroke(); });
  x.setLineDash([]); x.lineCap = 'round'; x.lineJoin = 'round';
  const draw = (xs, zs, w, col) => { x.strokeStyle = col; x.lineWidth = Math.max(1, w * MS); x.beginPath(); for (let k = 0; k < xs.length; k++) { const [a, b] = T(xs[k], zs[k]); k ? x.lineTo(a, b) : x.moveTo(a, b); } x.stroke(); };
  for (const R of AIR.runways) draw(R.xs, R.zs, R.hw * 2, '#8a8e92');
  for (const E of G.edges) if (E.c >= 3) draw(E.xs, E.zs, E.hw * 2, '#b9b4a8');
  for (const E of G.edges) if (E.c < 3 && !E.elev) draw(E.xs, E.zs, E.hw * 2 + 2, '#e9e3d3');
  for (const E of G.edges) if (E.elev) draw(E.xs, E.zs, E.hw * 2 + 2, '#f0c34e');
  mapCanvas = c; mapImg = c;
  if (window.createImageBitmap) createImageBitmap(c).then(b => { mapImg = b; }).catch(() => { });
}
const mm = $('minimap'), mctx = mm.getContext('2d');
function drawBlip(ctx, x, y, col, r = 6, label = '') {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke();
  if (label) { ctx.fillStyle = '#111'; ctx.font = `700 ${r * 1.4}px "Barlow Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x, y + 0.5); }
}
function blipList(big = false) {
  const b = [];
  for (const P of PROPERTIES) if (P.door && owns(P.id)) b.push({ x: P.door.x, z: P.door.z, col: '#6ee07a', label: 'H', edge: P.id === saveData.home });
  if (!mission) for (const m of MISSIONS) if (m.avail) b.push({ x: m.pos[0], z: m.pos[1], col: '#f6c21c', label: m.who[0], edge: true });
  const t = stepTarget(); if (t) b.push({ x: t[0], z: t[1], col: '#f6c21c', r: 7, edge: true });
  if (mission && mission.extraBlips) for (const e of mission.extraBlips) b.push(e);
  if (rideJob.active) { if (rideJob.stage === 'find' && rideJob.ped) b.push({ x: rideJob.ped.x, z: rideJob.ped.z, col: '#37d6ff', edge: true }); if (rideJob.stage === 'carry') b.push({ x: rideJob.dest.x, z: rideJob.dest.z, col: '#37d6ff', r: 7, edge: true }); }
  if (waypoint) b.push({ x: waypoint[0], z: waypoint[1], col: '#d24cff', r: 6, edge: true });
  const R = big ? 1e9 : 500;
  for (const s of servicesNear(player.x, player.z, big ? 20000 : R)) {
    if (s.hidden || s.type === 'home' || s.type === 'garage') continue;
    if (big && ['store', 'atm', 'fuel', 'lobby'].includes(s.type) && bm.scale < 0.35) continue;
    const st = SERVICE_STYLE[s.type]; b.push({ x: s.x, z: s.z, col: st.col, label: st.icon, r: 5 });
  }
  const fl = Math.floor(performance.now() / 250) % 2;
  for (const v of vehicles) if (v.isPolice && (v.siren || Police.level > 0) && !v.wreck) b.push({ x: v.x, z: v.z, col: fl ? '#ff3030' : '#3060ff', r: 4 });
  for (const c of Police.copPeds) b.push({ x: c.x, z: c.z, col: fl ? '#ff3030' : '#3060ff', r: 3 });
  for (const v of vehicles) if (v.owned && v.driver !== 'player' && !v.wreck) b.push({ x: v.x, z: v.z, col: '#5aa0ff', r: 4 });
  for (const T of trains) if (T.x !== undefined && dist2(T.x, T.z, player.x, player.z) < (big ? 1e12 : 600 * 600)) b.push({ x: T.x, z: T.z, col: '#c9b37a', r: 3 });
  return b;
}
function drawMinimap() {
  const W = mm.width, R = W / 2, ctx = mctx;
  const v = player.veh, air = v && (v.kind === 'heli' || v.kind === 'plane');
  const zoom = air ? clamp(0.9 - v.y / 400, 0.25, 0.9) : v ? clamp(1.25 - v.speed * 0.017, 0.55, 1.25) : 1.45;
  const rot = camYaw + Math.PI;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
  ctx.save(); ctx.beginPath(); ctx.arc(R, R, R, 0, TAU); ctx.clip();
  ctx.fillStyle = '#2b3034'; ctx.fillRect(0, 0, W, W);
  if (player.interior) { ctx.fillStyle = '#1d2024'; ctx.fillRect(0, 0, W, W); ctx.fillStyle = '#9aa0a6'; ctx.font = '700 28px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('INDOORS', R, R); ctx.restore(); return; }
  ctx.translate(R, R); ctx.rotate(rot); ctx.scale(zoom / MS, zoom / MS);
  { const Rw = R / zoom * 1.45, cx0 = (player.x - BX0) * MS, cz0 = (player.z - BZ0) * MS;
    const sx = Math.max(0, Math.floor(cx0 - Rw * MS)), sy = Math.max(0, Math.floor(cz0 - Rw * MS));
    const ex = Math.min(mapCanvas.width, Math.ceil(cx0 + Rw * MS)), ey = Math.min(mapCanvas.height, Math.ceil(cz0 + Rw * MS));
    if (ex > sx && ey > sy) ctx.drawImage(mapImg, sx, sy, ex - sx, ey - sy, sx - cx0, sy - cz0, ex - sx, ey - sy); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const toS = (x, z) => { const dx = (x - player.x) * zoom, dz = (z - player.z) * zoom, c = Math.cos(rot), s = Math.sin(rot); return [R + dx * c - dz * s, R + dx * s + dz * c]; };
  if (gps.line) {
    ctx.strokeStyle = gps.kind === 'way' ? '#d24cff' : gps.kind === 'ride' ? '#37d6ff' : '#f6c21c'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.9;
    ctx.beginPath(); gps.line.forEach((p, i) => { const [a, b] = toS(p[0], p[1]); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (Police.level > 0 && Police.flashing) { const [a, b] = toS(Police.lastX, Police.lastZ); ctx.beginPath(); ctx.arc(a, b, 120 * zoom, 0, TAU); ctx.fillStyle = 'rgba(255,60,60,0.12)'; ctx.fill(); }
  for (const bl of blipList()) {
    let [a, b] = toS(bl.x, bl.z); const dx = a - R, dz = b - R, d = Math.hypot(dx, dz);
    if (d > R - 12) { if (!bl.edge) continue; a = R + dx / d * (R - 12); b = R + dz / d * (R - 12); }
    drawBlip(ctx, a, b, bl.col, (bl.r || 6) * 2, bl.label || '');
  }
  const ph = v ? v.h : player.h; const ang = rot + Math.atan2(Math.cos(ph), Math.sin(ph));
  ctx.save(); ctx.translate(R, R); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0); ctx.lineTo(-10, -10); ctx.closePath(); ctx.fillStyle = '#fbf3dc'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();
  ctx.restore(); ctx.restore();
  const c = Math.cos(rot), s = Math.sin(rot); const nx = R + (s) * (R - 16), ny = R + (-c) * (R - 16);
  ctx.font = '700 26px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText('N', nx, ny); ctx.fillStyle = '#f6c21c'; ctx.fillText('N', nx, ny);
}
// ---------- big map ----------
const bm = { open: false, scale: 0, ox: 0, oy: 0, drag: null };
const bmc = $('bigmapCanvas'), bctx = bmc.getContext('2d');
function openMap(v) {
  bm.open = v; $('bigmap').hidden = !v;
  if (v) {
    if (document.pointerLockElement) document.exitPointerLock();
    const W = innerWidth, H = innerHeight; bmc.width = W * devicePixelRatio; bmc.height = H * devicePixelRatio;
    if (!bm.scale) bm.scale = Math.min(W / (BX1 - BX0), H / (BZ1 - BZ0)) * 2.2;
    bm.ox = W / 2 - (player.x - BX0) * bm.scale; bm.oy = H / 2 - (player.z - BZ0) * bm.scale;
    drawBigMap();
  }
}
function drawBigMap() {
  const ctx = bctx, dpr = devicePixelRatio, W = innerWidth, H = innerHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#16191c'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(bm.ox, bm.oy); ctx.scale(bm.scale / MS, bm.scale / MS); ctx.drawImage(mapImg, 0, 0); ctx.restore();
  const S = (x, z) => [bm.ox + (x - BX0) * bm.scale, bm.oy + (z - BZ0) * bm.scale];
  if (gps.line) { ctx.strokeStyle = gps.kind === 'way' ? '#d24cff' : '#f6c21c'; ctx.lineWidth = 4; ctx.beginPath(); gps.line.forEach((p, i) => { const [a, b] = S(p[0], p[1]); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of G.places) {
    if (!p.s && bm.scale < 0.45) continue; if (p.s && bm.scale < 0.12) continue;
    const [a, b] = S(p.x, p.z); ctx.font = `${p.s ? 700 : 600} ${p.s ? 16 : 12}px "Barlow Condensed", sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; const t = p.s ? p.n.toUpperCase() : p.n; ctx.strokeText(t, a, b); ctx.fillStyle = p.s ? '#f3e8c8' : '#bdb6a2'; ctx.fillText(t, a, b);
  }
  for (const bl of blipList(true)) { const [a, b] = S(bl.x, bl.z); if (a < -20 || b < -20 || a > W + 20 || b > H + 20) continue; drawBlip(ctx, a, b, bl.col, (bl.r || 6) * 1.4, bl.label || ''); }
  const [px, pz] = S(player.x, player.z); const ph = player.veh ? player.veh.h : player.h;
  ctx.save(); ctx.translate(px, pz); ctx.rotate(Math.atan2(Math.cos(ph), Math.sin(ph))); ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, 8); ctx.lineTo(-4, 0); ctx.lineTo(-8, -8); ctx.closePath(); ctx.fillStyle = '#fbf3dc'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  ctx.font = '400 22px Bungee, Impact, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#f6c21c'; ctx.fillText('CHENNAI', W - 24, H - 40);
  // legend
  ctx.textAlign = 'left'; ctx.font = '600 14px "Barlow Condensed", sans-serif'; let ly = H - 210;
  for (const k of ['gun', 'store', 'jewel', 'bank', 'dealer', 'fuel', 'spray', 'hangar', 'marina', 'station', 'forsale']) { const st = SERVICE_STYLE[k]; drawBlip(ctx, 34, ly, st.col, 8, st.icon); ctx.fillStyle = '#ddd'; ctx.fillText(st.label, 50, ly + 1); ly += 19; }
}
bmc.addEventListener('wheel', e => { e.preventDefault(); const k = Math.exp(-e.deltaY * 0.0015); const ns = clamp(bm.scale * k, 0.05, 3); const mx = e.clientX, my = e.clientY; bm.ox = mx - (mx - bm.ox) * ns / bm.scale; bm.oy = my - (my - bm.oy) * ns / bm.scale; bm.scale = ns; drawBigMap(); }, { passive: false });
bmc.addEventListener('mousedown', e => { bm.drag = { x: e.clientX, y: e.clientY, ox: bm.ox, oy: bm.oy, moved: false }; });
addEventListener('mousemove', e => { if (bm.drag && bm.open) { const dx = e.clientX - bm.drag.x, dy = e.clientY - bm.drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) bm.drag.moved = true; bm.ox = bm.drag.ox + dx; bm.oy = bm.drag.oy + dy; drawBigMap(); } });
addEventListener('mouseup', e => {
  if (bm.drag && bm.open && !bm.drag.moved) {
    const x = (e.clientX - bm.ox) / bm.scale + BX0, z = (e.clientY - bm.oy) / bm.scale + BZ0;
    setWaypoint(x, z);
  }
  bm.drag = null;
});
function setWaypoint(x, z) {
  if (waypoint && Math.hypot(waypoint[0] - x, waypoint[1] - z) < 30 / bm.scale) { waypoint = null; toast('Route cleared'); }
  else { const s = roadSpot(x, z, 1, true); waypoint = [s.x, s.z]; const r = roadQuery(s.x, s.z, 10); toast('Route set' + (r.seg && r.seg.e.name ? ' to ' + r.seg.e.name : '')); }
  gps.T = 0; updateGPS(0); drawBigMap();
}
function updateBigMapPad(dt) {
  if (!bm.open) return;
  const W = innerWidth, H = innerHeight;
  if (GP.ax[0] || GP.ax[1]) { bm.ox -= GP.ax[0] * dt * 600; bm.oy -= GP.ax[1] * dt * 600; }
  const zin = GP.b[BTN.R2] - GP.b[BTN.L2]; if (Math.abs(zin) > 0.1) { const ns = clamp(bm.scale * Math.exp(zin * dt * 1.5), 0.05, 3); bm.ox = W / 2 - (W / 2 - bm.ox) * ns / bm.scale; bm.oy = H / 2 - (H / 2 - bm.oy) * ns / bm.scale; bm.scale = ns; }
  if (gpHit(BTN.X)) setWaypoint((W / 2 - bm.ox) / bm.scale + BX0, (H / 2 - bm.oy) / bm.scale + BZ0);
  if (gpHit(BTN.O) || gpHit(BTN.PAD)) openMap(false);
  if (GP.ax[0] || GP.ax[1] || Math.abs(zin) > 0.1 || gpHit(BTN.X)) drawBigMap();
  $('bigmapCross').hidden = !GP.connected;
}
// ---------- HUD ----------
let hudT = 0, locT = 0, lastStreet = '', lastArea = '';
function updateHUD(dt) {
  if (promptText !== promptCur) { hud.prompt.hidden = !promptText; hud.prompt.innerHTML = promptText; promptCur = promptText; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  if (phoneT > 0) { phoneT -= dt; if (phoneT <= 0) $('phone').classList.remove('show'); }
  if (cashFlashT > 0) { cashFlashT -= dt; if (cashFlashT <= 0) $('cashDelta').className = ''; }
  const hurt = $('hurt'); if (+hurt.style.opacity > 0) hurt.style.opacity = Math.max(0, +hurt.style.opacity - dt * 1.2);
  hudT -= dt; if (hudT > 0) return; hudT = 0.1;
  const hh = Math.floor(hour), mn = Math.floor((hour - hh) * 60);
  hud.clock.textContent = String(hh).padStart(2, '0') + ':' + String(mn).padStart(2, '0');
  hud.cash.textContent = money(player.cash);
  const stars = hud.stars.children; for (let i = 0; i < 5; i++) stars[i].classList.toggle('on', i < Police.level);
  hud.stars.classList.toggle('flash', Police.flashing && Police.level > 0);
  hud.hbar.style.width = clamp(player.health, 0, 100) + '%'; hud.hbar.style.background = player.health < 30 ? '#d9402a' : '#66c35a';
  hud.abar.style.width = clamp(player.armor, 0, 100) + '%'; $('abar').hidden = player.armor <= 0;
  const v = player.veh;
  hud.speedo.hidden = !v; hud.vbar.hidden = !v; hud.fbar.hidden = !v || v.type === 'cargo';
  if (v) {
    hud.kmh.textContent = Math.round(v.speed * 3.6); hud.vbarI.style.width = clamp(v.health / v.spec.hp * 100, 0, 100) + '%';
    hud.fbarI.style.width = clamp(v.fuel * 100, 0, 100) + '%'; hud.fbarI.style.background = v.fuel < 0.15 ? '#d9402a' : '#e8e2d0';
    const air = v.kind === 'heli' || v.kind === 'plane'; hud.alt.hidden = !air; if (air) hud.alt.textContent = `ALT ${Math.round(v.y)} m${v.kind === 'plane' ? ' · THR ' + Math.round(v.thr * 100) + '%' : ''}`;
  } else hud.alt.hidden = true;
  const wk = player.weapon;
  hud.weapon.hidden = !wk; if (wk) { const inv = player.weapons[wk]; hud.weapon.innerHTML = `<b>${WEAPONS[wk].name}</b> <span>${player.reloadT > 0 ? 'RELOADING' : inv.clip + ' / ' + inv.ammo}</span>`; }
  const tmr = mission && mission.timer !== null ? mission.timer : rideJob.active && rideJob.stage === 'carry' ? rideJob.timer : null;
  hud.timer.hidden = tmr === null;
  if (tmr !== null) { const t = Math.max(0, tmr); hud.timer.textContent = Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); hud.timer.classList.toggle('low', t < 15); }
  locT -= 0.1;
  if (locT <= 0) {
    locT = 0.5;
    if (player.interior) { hud.street.textContent = SERVICE_STYLE[player.interior.svc.type] ? (player.interior.svc.name || SERVICE_STYLE[player.interior.svc.type].label) : ''; hud.area.textContent = 'Inside'; lastStreet = lastArea = ''; }
    else {
      const r = roadQuery(player.x, player.z, 25, player.y);
      const street = r.seg && r.d < 6 ? r.seg.e.name : '';
      let best = null, bd = 1e18; for (const p of G.places) { const d = dist2(p.x, p.z, player.x, player.z) * (p.s ? 0.55 : 1); if (d < bd) { bd = d; best = p; } }
      const area = best ? best.n : '';
      if (street !== lastStreet) { hud.street.textContent = street; lastStreet = street; }
      if (area !== lastArea) { hud.area.textContent = area; lastArea = area; }
    }
  }
}
function updateUpdateHelp() { $('padHint').hidden = !(GP.connected && performance.now() - GP.lastUse < 20000); }
// ---------- service interactions (outdoors and indoors) ----------
function updateInteractions(dt) {
  if (player.dead) return;
  const pv = player.veh;
  if (player.interior) {
    const I = INT[player.interior.type]; const it = player.interior;
    const near = (spot, r = 2) => spot && Math.hypot(player.x - (I.x + spot[0]), player.z - (I.z + spot[1])) < r;
    if (Math.hypot(player.x - I.spawn[0], player.z - (I.spawn[1] + 0.8)) < 1.6) { prompt(`${key('E', '→')} Leave`); if (In.act('interact')) { exitInterior(); return; } }
    else if (it.type === 'gun' && near(I.spots.clerk, 3.5)) { prompt(`${key('E', '→')} Browse weapons`); if (In.act('interact')) gunMenu(); }
    else if (it.type === 'dealer' && near(I.spots.desk, 3)) { prompt(`${key('E', '→')} Buy a vehicle`); if (In.act('interact')) dealerMenu(); }
    else if (it.type === 'hangar' && near(I.spots.desk, 3)) { prompt(`${key('E', '→')} Aircraft`); if (In.act('interact')) hangarMenu(it.svc); }
    else if (it.type === 'bank' && near(I.spots.teller, 3) && !player.aiming) { prompt(`${key('E', '→')} Banking`); if (In.act('interact')) atmMenu(); }
    else if (it.type === 'apartment' && (near(I.spots.bed, 2.5) || near(I.spots.safe, 2))) { prompt(`${key('E', '→')} Safehouse options`); if (In.act('interact')) apartmentMenu(); }
    else if (it.type === 'apartment' && near(I.spots.garage, 2)) { prompt(`${key('E', '→')} Go to the garage`); if (In.act('interact')) { const s = it.svc; exitInterior(); enterInterior('garage', s.prop.gsvc); } }
    else if (it.type === 'lobby' && near(I.spots.elevator, 2.5)) { prompt(`${key('E', '→')} Take the elevator to the roof`); if (In.act('interact')) { const b = bPolys[it.svc.pi]; exitInterior(); const [x, z] = [b.cx, b.cz]; player.x = x; player.z = z; player.y = b.h + 0.1; camSmoothed = false; fadeFlash(); toast(`Rooftop · ${Math.round(b.h)} m up`); } }
    else if ((it.type === 'store' || it.type === 'jewel') && player.weapon && interiorNPC && !robbery) prompt(`Aim your gun at the clerk to rob the place`);
    return;
  }
  if (player.onTrain) return;
  for (const s of servicesNear(player.x, player.z, 12)) {
    if (s.hidden || s.mapOnly) continue;
    const d = Math.hypot(player.x - s.x, player.z - s.z), r = s.r || 1.6;
    if (d > r + (pv ? 2 : 0.4)) continue;
    const st = SERVICE_STYLE[s.type];
    if (pv) {
      if (s.type === 'fuel' && v_needsFuel(pv)) { const cost = Math.ceil((1 - pv.fuel) * pv.spec.fuel * 1.6); prompt(`${key('E', '→')} Fill up · ${money(cost)}`); if (In.act('interact') && pv.speed < 1) { if (spend(cost)) { pv.fuel = 1; toast('Tank full'); Sound.cash(); } else toast('Not enough money'); } }
      else if (s.type === 'spray' && pv.kind === 'car') { prompt(`${key('E', '→')} Repair & respray · clears wanted if unseen`); if (In.act('interact') && pv.speed < 1.5) sprayShop(pv); }
      else if (s.type === 'garage' && pv.kind === 'car' && owns(s.prop.id)) { prompt(`${key('E', '→')} Store this car in your garage`); if (In.act('interact') && pv.speed < 1.5) storeCarInGarage(s.prop); }
      continue;
    }
    if (['fuel', 'spray', 'heli'].includes(s.type)) continue;
    if (s.type === 'garage' && !owns(s.prop.id)) continue;
    prompt(`${key('E', '→')} ${s.type === 'forsale' ? 'View ' + s.prop.name : s.type === 'home' ? 'Enter ' + s.prop.name : s.type === 'garage' ? 'Open garage' : 'Enter ' + (s.name && s.type !== 'store' ? s.name : st.label)}`);
    if (In.act('interact')) serviceInteract(s);
    return;
  }
}
function v_needsFuel(v) { return v.fuel < 0.98 && v.kind !== 'heli' && v.kind !== 'plane'; }
// ---------- pause ----------
function setPaused(v) {
  if (gameState !== 'play') return;
  paused = v; $('pause').hidden = !v; keys.clear();
  if (v) {
    if (document.pointerLockElement) document.exitPointerLock();
    const done = saveData.done.length;
    $('progress').innerHTML = `Missions <b>${done}/${MISSIONS.length}</b><br>Hidden packages <b>${saveData.packages.length}/${packages.length}</b><br>Properties <b>${saveData.props.length}/${PROPERTIES.length}</b><br>Rides <b>${saveData.rides || 0}</b> · Robberies <b>${saveData.stats.robberies || 0}</b><br>Cash <b class="g">${money(player.cash)}</b> · Bank <b class="g">${money(player.bank)}</b>`;
    $('resetConfirm').hidden = true;
  } else canvas.focus();
}
$('resumeBtn').onclick = () => setPaused(false);
const QORDER = ['low', 'high', 'ultra'];
$('qualityBtn').onclick = () => { qName = QORDER[(QORDER.indexOf(qName) + 1) % 3]; applyQuality(); autoQ.done = true; store.set('mh-quality-set', 1); $('qualityBtn').textContent = 'Graphics: ' + Q.label; };
$('qualityBtn').textContent = 'Graphics: ' + Q.label;
const TIME_LABEL = { day: 'Always day', live: 'Day/night cycle', night: 'Always night' };
function cycleTime() { const o = ['day', 'live', 'night']; timeMode = o[(o.indexOf(timeMode) + 1) % 3]; store.set('mh-time', timeMode); $('timeBtn').textContent = 'Time: ' + TIME_LABEL[timeMode]; toast(TIME_LABEL[timeMode]); }
$('timeBtn').onclick = cycleTime; $('timeBtn').textContent = 'Time: ' + TIME_LABEL[timeMode];
$('soundBtn').onclick = () => { Sound.setOn(!Sound.on); $('soundBtn').textContent = 'Sound: ' + (Sound.on ? 'On' : 'Off'); };
$('saveBtn').onclick = () => saveGame(false);
$('resetBtn').onclick = () => { $('resetConfirm').hidden = false; };
$('resetNo').onclick = () => { $('resetConfirm').hidden = true; };
$('resetYes').onclick = () => { store.del(SAVE_KEY); location.reload(); };
$('controlsBtn').onclick = () => { $('title').hidden = true; $('pause').hidden = false; $('resumeBtn').textContent = 'Back'; $('resumeBtn').onclick = () => { $('pause').hidden = true; $('title').hidden = false; $('resumeBtn').textContent = 'Resume'; $('resumeBtn').onclick = () => setPaused(false); }; };
addEventListener('keydown', e => {
  if (gameState !== 'play' || Menu.open) return;
  if (e.code === 'Escape' && bm.open) openMap(false);
  else if (e.code === 'KeyP' || (e.code === 'Escape' && !pointerLocked && !bm.open)) setPaused(!paused);
});
const autoQ = { t: 0, frames: 0, done: !!store.get('mh-quality-set') };
function autoQuality(dt) {
  if (autoQ.done || gameState !== 'play') return;
  autoQ.t += dt; autoQ.frames++;
  if (autoQ.t < 3) { autoQ.frames = 0; return; }
  if (autoQ.t > 8) {
    const fps = autoQ.frames / (autoQ.t - 3); autoQ.done = true; store.set('mh-quality-set', 1);
    if (fps > 56 && qName === 'high') { qName = 'ultra'; applyQuality(); toast('Graphics set to Ultra (P to change)'); }
    else if (fps < 30 && qName !== 'low') { qName = qName === 'ultra' ? 'high' : 'low'; applyQuality(); toast('Graphics lowered to ' + Q.label + ' for smoother play'); }
    $('qualityBtn').textContent = 'Graphics: ' + Q.label;
  }
}
// ---------- main loop ----------
let last = performance.now(), titleAng = 0, chunkT = 0, envT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  uTime.value += dt; sky.position.copy(camera.position);
  texWaterN.offset.x += dt * 0.012; texWaterN.offset.y += dt * 0.007;
  if (gameState === 'loading') return;
  if (gameState === 'title') {
    titleAng += dt * 0.04;
    const P = homeProp(), cx = P ? P.door.x : 0, cz = P ? P.door.z : 0;
    camera.position.set(cx + Math.sin(titleAng) * 380, 190, cz + Math.cos(titleAng) * 380); camera.lookAt(cx, 20, cz);
    applyTimeOfDay(hour, cx, cz); updateChunks(cx, cz, 6); Fx.update(dt);
    for (const T of trains) T.update(dt);
    sky.position.copy(camera.position); if (!window.__norender) renderFrame(); return;
  }
  In.update(!!player.veh);
  if (Menu.open) { Menu.update(); In.endFrame(); if (!window.__norender) renderFrame(); return; }
  if (In.act('pause')) setPaused(!paused);
  if (paused) { if (gpHit(BTN.O) || gpHit(BTN.OPTIONS)) setPaused(false); In.endFrame(); return; }
  if (In.act('map')) openMap(!bm.open);
  if (bm.open) { updateBigMapPad(dt); In.endFrame(); return; }
  if (In.act('daylight')) cycleTime();
  if (timeMode === 'day') hour += (12.5 - hour) * Math.min(1, dt * 0.8);
  else if (timeMode === 'night') hour += (21.5 - hour) * Math.min(1, dt * 0.8);
  else hour = (hour + dt * 24 / (24 * 60)) % 24;
  prompt('');
  if (respawnT > 0) { respawnT -= dt; if (respawnT <= 0) doRespawn(); }
  else if (!player.dead) {
    if (player.onTrain) trainBoarding();
    else if (player.veh) updatePlayerVehicle(dt); else { updatePlayerFoot(dt); trainBoarding(); }
    if (player.regenT > 0) player.regenT -= dt; else if (player.health < 50) player.health += dt * 2;
  }
  if (!player.interior) {
    for (const v of traffic) {
      if (v.dead || v === player.veh || v.flight || v.shipDir !== undefined || v.moored || v.displayOnly) continue;
      if (v.heliAI) { updateHeliAI(v, dt); continue; }
      if (v.driver === 'ai' && v.agent) v.update(dt, v.agent.update(dt));
      else if (v.kind === 'heli' || v.kind === 'plane') { if (v.y > 0.2 || v.wreck || v.speed > 0.1) v.update(dt, NOCTRL); }
      else if (v.speed > 0.05 || v.y > 0.05 || v.burnT > 0) v.update(dt, NOCTRL);
      if (v.hornT > 0) { v.hornT = 0; if (dist2(v.x, v.z, player.x, player.z) < 2500) Sound.tone(v.type === 'auto' || v.type === 'scooter' ? 620 : 430, 0.25, 'square', 0.035); }
    }
    vehicleCollisions(); pedVehicleHits();
    for (const T of trains) T.update(dt);
    updateFlights(dt); updateShips(dt);
  }
  Police.update(dt);
  updatePeds(dt, player.x, player.z);
  if (!player.interior) updateTraffic(dt, player.x, player.z);
  updateRockets(dt); updatePickups(dt);
  updateMission(dt); updateRideJob(dt); updatePackages(dt); updateGPS(dt); updateRobbery(dt);
  updateInteractions(dt); updateServiceMarkers(dt);
  for (const v of vehicles) v.sync(dt);
  if (player.veh) { const pv = player.veh; if (pv.driverMesh) pv.driverMesh.visible = true; }
  pMesh.root.position.set(player.x, player.y, player.z); pMesh.root.rotation.y = player.h;
  if (flash.intensity > 0) flash.intensity = Math.max(0, flash.intensity - dt * 60);
  Fx.update(dt);
  updateCamera(dt);
  const focus = player.interior ? player.interior.ret : player;
  chunkT -= dt; if (chunkT <= 0) { chunkT = 0.1; updateChunks(focus.x, focus.z); }
  if (player.interior) { applyTimeOfDay(12, focus.x, focus.z); sun.intensity = 0; hemi.intensity = 0.6; scene.fog.near = 400; scene.fog.far = 2000; scene.environmentIntensity = 0.6; if (bloomPass) bloomPass.strength = 0.08; }
  else { applyTimeOfDay(hour, player.x, player.z); scene.fog.near = Q.fogNear; }
  M2.head.color.setHex(uNight.value > 0.35 ? 0xfff3c8 : 0xd8d2bd);
  const pv = player.veh;
  if (pv && pv.kind === 'car' && uNight.value > 0.25) { const fx = Math.sin(pv.h), fz = Math.cos(pv.h); headL.intensity = 120 * uNight.value; headL.position.set(pv.x + fx * pv.spec.len * 0.5, pv.y + 0.9, pv.z + fz * pv.spec.len * 0.5); headL.target.position.set(pv.x + fx * 25, pv.y, pv.z + fz * 25); } else headL.intensity = 0;
  sky.position.copy(camera.position);
  updateHUD(dt); drawMinimap(); updateUpdateHelp();
  let sirenD = 1e9, rotorD = 1e9, jetD = 1e9; for (const v of vehicles) { const d = Math.hypot(v.x - player.x, v.z - player.z, v.y - player.y); if (v.siren) sirenD = Math.min(sirenD, d); if (v.kind === 'heli' && v.driver !== 'player' && v.rotor > 0.5) rotorD = Math.min(rotorD, d); if (v.type === 'airliner' || v.type === 'jet') jetD = Math.min(jetD, d); }
  Sound.update(dt, { kind: pv ? pv.kind : null, speedRatio: pv ? clamp(Math.abs(pv.fwdSpeed) / pv.spec.max, 0, 1) : 0, throttle: pv ? (pv.kind === 'plane' ? pv.thr : pv.kind === 'heli' ? (pctrl.lift + 1) / 2 : pctrl.throttle) : 0, small: pv && (pv.type === 'auto' || pv.type === 'scooter' || pv.type === 'jetski'), big: pv && (pv.type === 'bus' || pv.type === 'truck' || pv.ship), horn: pv && In.held('horn'), siren: clamp(1 - sirenD / 160, 0, 1), rotorNear: clamp(1 - rotorD / 250, 0, 1), jetNear: clamp(1 - jetD / 900, 0, 1), inside: !!player.interior });
  if (!window.__norender) renderFrame();
  autoQuality(dt);
  In.endFrame();
}
// ---------- boot ----------
async function loadWorldData(onProgress) {
  const files = ['world-a.json', 'world-b.json'];
  let done = 0; const parts = [];
  for (const f of files) {
    const r = await fetch(f); if (!r.ok) throw new Error('Could not load ' + f + ' (' + r.status + ')');
    parts.push(await r.json()); done++; onProgress(done / files.length);
  }
  return Object.assign({}, ...parts);
}
async function boot() {
  const fill = $('loadfill'), txt = $('loadtext');
  const coarse = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  $('touchnote').hidden = !coarse;
  gameState = 'loading';
  requestAnimationFrame(frame);
  try {
    txt.textContent = 'Downloading the city map…';
    const ML = m => { if (window.__memlog && performance.memory) console.log('MEM ' + m + ' ' + (window.gc && gc(), Math.round(performance.memory.usedJSHeapSize / 1e6))); };
    WD = await loadWorldData(p => { fill.style.width = Math.round(p * 10) + '%'; });
    [BX0, BZ0, BX1, BZ1] = WD.meta.bounds.map(v => v / 10);
    ML('json');
    await initWorld((p, msg) => { ML(msg); fill.style.width = Math.round(10 + p * 80) + '%'; txt.textContent = msg; });
    ML('initWorld'); buildNodeGrid(); buildEdgeGrid();
    txt.textContent = 'Opening shops and banks…'; await tick();
    buildInteriors(); setupServices();
    txt.textContent = 'Drawing the map…'; await tick();
    ML('services'); buildMapCanvas();
    defineMissions(); buildPackages(); spawnTrains(); placeHarbour();
    ML('missions'); spawnAtHome();
    txt.textContent = 'Building the streets around you…'; await tick();
    updateChunks(player.x, player.z, 1e9, true);
    buildComposer();
    spawnTraffic(player.x, player.z, 14, 30, 260, true);
    applyTimeOfDay(hour, player.x, player.z); ML('chunks');
  } catch (err) { console.error(err); txt.textContent = 'Something went wrong while building the city: ' + err.message; return; }
  fill.style.width = '100%'; txt.textContent = `Ready · ${G.edges.length.toLocaleString()} streets · ${BLD.length.toLocaleString()} buildings`;
  gameState = 'title';
  const sb = $('startBtn'); sb.disabled = false; sb.focus();
  const start = () => {
    if (gameState !== 'title') return;
    Sound.init(); Sound.resume();
    $('title').hidden = true; $('hud').hidden = false; inputEnabled = true; gameState = 'play'; camSmoothed = false;
    lockPointer(); canvas.focus();
    for (const k of Object.keys(player.weapons)) { equip(k); break; }
    if (!saveData.done.length) {
      setTimeout(() => phone('Vik', 'Welcome to Madras. I left you a car in your garage and some cash. Come find me, I have work. Look for the V on your map.', 10), 1200);
      setObjective(`Walk to the <b>yellow marker</b> and press ${key('E', '→')} · ${key('M', 'Touchpad')} opens the map`);
      setTimeout(() => { if (!mission) setObjective(''); }, 16000);
    } else toast('Welcome back · ' + money(player.cash + player.bank));
  };
  sb.onclick = start;
  const padStart = () => { if (gameState !== 'title') return; pollGamepad(); if (gpHit(BTN.X) || gpHit(BTN.OPTIONS)) { inputEnabled = true; start(); } else requestAnimationFrame(padStart); };
  requestAnimationFrame(padStart);
  window.__mh = {
    setHour: h => { hour = h; }, tp: (x, z, yaw, pitch = 0.32, mode = 0) => { if (player.veh) exitVehicle(); const r = roadQuery(x, z, 60, 0); if (r.seg) { x = r.px; z = r.pz; } player.x = x; player.z = z; player.y = 0; camYaw = yaw; camPitch = pitch; camMode = mode; camSmoothed = false; player.h = yaw; updateChunks(x, z, 1e9, true); },
    drive: (type, x, z, h) => { const r = roadQuery(x, z, 60, 0); if (r.seg) { x = r.px; z = r.pz; h = headingTo(r.seg.bx - r.seg.ax, r.seg.bz - r.seg.az); } const v = new Vehicle(type, undefined, x, z, h); traffic.push(v); enterVehicle(v); camYaw = h; camSmoothed = false; updateChunks(x, z, 1e9, true); return v; },
    player, vehicles, peds, traffic, Police, G, services, PROPERTIES, trains, flights, get mission() { return mission; }, startMission, MISSIONS, enterVehicle, exitVehicle, renderer, camera, scene, saveData, giveWeapon, equip, enterInterior, exitInterior, INT, get rideJob() { return rideJob; }, press: c => pressed.add(c), chunks, BLD, get robbery() { return robbery; }, set robbery(r) { robbery = r; }, Police, passMission, get missionObj() { return mission; }, AIR, edgePoint, Vehicle, surfaceAt, get bounds() { return [BX0, BZ0, BX1, BZ1]; }, collideCircle, sidewalkY, get traffic2() { return traffic; }, snap: () => { { const nr = window.__norender; window.__norender = false; if (!envRT) refreshEnv(hour); renderFrame(); window.__norender = nr; } return renderer.domElement.toDataURL('image/jpeg', 0.85); },
  };
}
boot();
