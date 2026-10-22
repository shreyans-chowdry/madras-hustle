// ===================== WEAPONS, SHOOTING, PICKUPS =====================
const WEAPONS = {
  fists: { name: 'Fists', melee: true, dmg: 12, rate: 0.35, price: 0 },
  pistol: { name: 'Pistol', dmg: 26, rate: 0.28, mag: 12, spread: 0.012, range: 90, price: 900, ammoPrice: 60, ammoPack: 36 },
  smg: { name: 'SMG', dmg: 17, rate: 0.075, mag: 30, spread: 0.03, range: 75, auto: true, price: 3500, ammoPrice: 120, ammoPack: 90 },
  shotgun: { name: 'Shotgun', dmg: 14, pellets: 8, rate: 0.8, mag: 8, spread: 0.07, range: 40, price: 5200, ammoPrice: 140, ammoPack: 24 },
  rifle: { name: 'Assault Rifle', dmg: 30, rate: 0.11, mag: 30, spread: 0.015, range: 140, auto: true, price: 12000, ammoPrice: 200, ammoPack: 90 },
  sniper: { name: 'Sniper Rifle', dmg: 150, rate: 1.2, mag: 5, spread: 0.0, range: 400, scope: true, price: 25000, ammoPrice: 300, ammoPack: 15 },
  rpg: { name: 'Rocket Launcher', dmg: 400, rate: 1.4, mag: 1, spread: 0.0, range: 300, rocket: true, price: 60000, ammoPrice: 1500, ammoPack: 3 },
  minigun: { name: 'Minigun', dmg: 20, rate: 0.035, mag: 500, spread: 0.04, range: 120, auto: true, price: 150000, ammoPrice: 800, ammoPack: 500 },
};
const WEAPON_ORDER = ['fists', 'pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'rpg', 'minigun'];
const rockets = [];
const _ray = new THREE.Raycaster(), _v3 = new THREE.Vector3(), _v3b = new THREE.Vector3();
let crosshairOn = false;

// ray vs world: returns {t, type, obj, x,y,z}
function rayHit(ox, oy, oz, dx, dy, dz, maxD, ignoreVeh) {
  let best = { t: maxD, type: null, obj: null };
  // ground
  if (dy < -1e-4) { const t = -oy / dy; if (t > 0 && t < best.t) best = { t, type: 'ground' }; }
  // buildings (walls with heights)
  const ex = ox + dx * maxD, ez = oz + dz * maxD;
  const tw = rayWalls(ox, oz, ex, ez, oy, oy + dy * maxD);
  if (tw < 1 && tw * maxD < best.t) best = { t: tw * maxD, type: 'wall' };
  // vehicles (sphere-ish per circle)
  for (const v of vehicles) {
    if (v === ignoreVeh || v.sinkT > 0) continue;
    const fx = Math.sin(v.h), fz = Math.cos(v.h), vh = v.kind === 'car' ? 1.6 : v.kind === 'boat' ? 2 : 3;
    for (const [o, r] of v.spec.circles) {
      const cx = v.x + fx * o, cy = v.y + vh * 0.5, cz = v.z + fz * o;
      const lx = cx - ox, ly = cy - oy, lz = cz - oz, tc = lx * dx + ly * dy + lz * dz; if (tc < 0 || tc > best.t) continue;
      const d2 = lx * lx + ly * ly + lz * lz - tc * tc, rr = Math.max(r, vh * 0.5); if (d2 > rr * rr) continue;
      const th = tc - Math.sqrt(rr * rr - d2); if (th < best.t && th > 0) best = { t: th, type: 'veh', obj: v };
    }
  }
  // people (vertical capsule ~ cylinder)
  for (const w of peds) {
    if (w.state === 'dead' || w.dead) continue;
    const lx = w.x - ox, lz = w.z - oz, a = dx * dx + dz * dz; if (a < 1e-6) continue;
    const tc = (lx * dx + lz * dz) / a; if (tc < 0 || tc > best.t) continue;
    const px = ox + dx * tc - w.x, pz = oz + dz * tc - w.z, py = oy + dy * tc;
    if (px * px + pz * pz < 0.16 && py > w.y && py < w.y + 1.85) best = { t: tc, type: 'ped', obj: w, head: py > w.y + 1.55 };
  }
  best.x = ox + dx * best.t; best.y = oy + dy * best.t; best.z = oz + dz * best.t;
  return best;
}
function playerFire() {
  const wk = player.weapon; if (!wk) return;
  const W = WEAPONS[wk], inv = player.weapons[wk];
  if (player.fireT > 0) return;
  if (inv.clip <= 0) { if (inv.ammo > 0) reload(); else { Sound.click(); player.fireT = 0.3; } return; }
  player.fireT = W.rate; inv.clip--;
  // aim from camera centre
  camera.getWorldDirection(_v3); const cam = camera.position;
  const aimHit = rayHit(cam.x, cam.y, cam.z, _v3.x, _v3.y, _v3.z, W.range + 20, player.veh);
  const hand = new THREE.Vector3(); pMesh.handR.getWorldPosition(hand);
  if (player.veh) { hand.set(player.veh.x, player.veh.y + 1.4, player.veh.z); }
  const sx = hand.x, sy = hand.y, sz = hand.z;
  Fx.muzzle(sx + _v3.x * 0.5, sy + _v3.y * 0.5, sz + _v3.z * 0.5);
  Sound.gun(wk, 0); rumble(W.rocket ? 1 : 0.35, 0.3, W.rocket ? 250 : 60);
  shakeT = Math.max(shakeT, W.rocket ? 0.2 : W.dmg > 50 ? 0.12 : 0.03);
  crime('gunfire', player.x, player.z);
  for (const o of peds) if (!o.cop && !o.hostile && dist2(o.x, o.z, player.x, player.z) < 50 * 50) o.scare(player.x, player.z);
  if (W.rocket) {
    let dx = aimHit.x - sx, dy = aimHit.y - sy, dz = aimHit.z - sz; const l = Math.hypot(dx, dy, dz) || 1;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    m.position.set(sx, sy, sz); scene.add(m);
    rockets.push({ x: sx, y: sy, z: sz, vx: dx / l * 70, vy: dy / l * 70, vz: dz / l * 70, life: 5, m, byPlayer: true });
    return;
  }
  const n = W.pellets || 1;
  for (let i = 0; i < n; i++) {
    let dx = aimHit.x - sx, dy = aimHit.y - sy, dz = aimHit.z - sz; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    const sp = W.spread * (player.veh ? 2 : 1) * (player.aimT > 0.6 ? 0.6 : 1);
    dx += (Math.random() - 0.5) * sp * 2; dy += (Math.random() - 0.5) * sp * 2; dz += (Math.random() - 0.5) * sp * 2;
    const h = rayHit(sx, sy, sz, dx, dy, dz, W.range, player.veh);
    Fx.tracer(sx, sy, sz, h.x, h.y, h.z);
    if (h.type === 'ped') { h.obj.shot(W.dmg * (h.head ? 2.5 : 1), dx * 3, dz * 3, true); }
    else if (h.type === 'veh') { h.obj.damage(W.dmg * 1.4, true); Fx.spark(h.x, h.y, h.z); if (h.obj.isPolice) crime('shootCop', h.x, h.z); if (h.obj.agent && h.obj.kind === 'car') h.obj.agent.panic = 6; }
    else if (h.type) { Fx.dust(h.x, h.y, h.z); }
  }
}
function reload() {
  const wk = player.weapon; if (!wk) return; const W = WEAPONS[wk], inv = player.weapons[wk];
  if (inv.clip >= W.mag || inv.ammo <= 0 || player.reloadT > 0) return;
  player.reloadT = W.mag > 100 ? 2.5 : 1.3; Sound.tone(600, 0.05, 'square', 0.05); Sound.tone(400, 0.06, 'square', 0.05, 0.6);
}
function finishReload() { const wk = player.weapon; if (!wk) return; const W = WEAPONS[wk], inv = player.weapons[wk]; const need = W.mag - inv.clip, take = Math.min(need, inv.ammo); inv.clip += take; inv.ammo -= take; }
function explosion(x, y, z, power = 1, byPlayer = false) {
  Fx.explode(x, y, z, power); Sound.boom(); flash.position.set(x, y + 2, z); flash.intensity = 40 * power;
  const d0 = Math.hypot(camera.position.x - x, camera.position.z - z); shakeT = Math.max(shakeT, clamp(1 - d0 / 80, 0, 1) * 0.9); rumble(clamp(1 - d0 / 60, 0, 1), 1, 400);
  const R = 9 * power;
  for (const v of vehicles) { const d = Math.hypot(v.x - x, v.z - z, (v.y - y) * 0.5); if (d < R) { v.damage(900 * (1 - d / R) * power, byPlayer); const k = (1 - d / R) * 10 / (d + 0.5); v.vx += (v.x - x) * k; v.vz += (v.z - z) * k; if (v.kind === 'car') v.vy = Math.max(v.vy, 5 * (1 - d / R)); if (byPlayer && v.isPolice) crime('boomCop', v.x, v.z); } }
  for (const w of peds) { const d = Math.hypot(w.x - x, w.z - z); if (d < R) { w.knock((w.x - x) / (d + 0.1) * 9, (w.z - z) / (d + 0.1) * 9, 20); if (w.health <= 0 && byPlayer) onPedKilled(w); } }
  if (!player.veh && !player.interior) { const d = Math.hypot(player.x - x, player.z - z); if (d < R) { hurtPlayer(90 * (1 - d / R)); player.downT = 1.5; player.vx = (player.x - x) / (d + 0.1) * 6; player.vz = (player.z - z) / (d + 0.1) * 6; } }
  if (byPlayer) crime('boom', x, z);
}
function updateRockets(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i]; r.life -= dt;
    const st = Math.hypot(r.vx, r.vy, r.vz) * dt;
    const h = rayHit(r.x, r.y, r.z, r.vx / (st / dt), r.vy / (st / dt), r.vz / (st / dt), st, player.veh);
    r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
    r.m.position.set(r.x, r.y, r.z); r.m.lookAt(r.x + r.vx, r.y + r.vy, r.z + r.vz);
    Fx.smoke(r.x, r.y, r.z, 0.7);
    if (h.type || r.life <= 0 || r.y < 0) { explosion(h.type ? h.x : r.x, h.type ? h.y : r.y, h.type ? h.z : r.z, 1.2, r.byPlayer); scene.remove(r.m); rockets.splice(i, 1); }
  }
}
// ---------- pickups ----------
const pickups = [];
const PICK_GEO = { cash: new THREE.BoxGeometry(0.5, 0.15, 0.3), ammo: new THREE.BoxGeometry(0.4, 0.3, 0.3), health: new THREE.BoxGeometry(0.45, 0.45, 0.45), armor: new THREE.BoxGeometry(0.5, 0.6, 0.2) };
const PICK_MAT = { cash: new THREE.MeshStandardMaterial({ color: 0x5aa84a, emissive: 0x1a4a12 }), ammo: new THREE.MeshStandardMaterial({ color: 0x8a7a3a, emissive: 0x2a2208 }), health: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x662222 }), armor: new THREE.MeshStandardMaterial({ color: 0x3060c0, emissive: 0x102040 }) };
function dropPickup(type, x, z, val, permanent = false) {
  const m = new THREE.Mesh(PICK_GEO[type], PICK_MAT[type]); m.position.set(x, 0.5, z); scene.add(m);
  pickups.push({ type, x, z, val, m, life: permanent ? 1e9 : 60, permanent });
}
function updatePickups(dt) {
  const t = performance.now() / 1000;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.life -= dt; p.m.rotation.y = t * 2; p.m.position.y = 0.5 + Math.sin(t * 3 + i) * 0.12;
    if (p.life <= 0) { scene.remove(p.m); pickups.splice(i, 1); continue; }
    if (!player.dead && !player.interior && dist2(p.x, p.z, player.x, player.z) < (player.veh ? 9 : 2.5)) {
      if (p.type === 'cash') { addCash(p.val); toast('+' + money(p.val)); }
      if (p.type === 'ammo') { const k = typeof p.val === 'string' ? p.val : 'pistol'; if (!player.weapons[k]) giveWeapon(k, 0); player.weapons[k].ammo += WEAPONS[k].mag * 2; toast(WEAPONS[k].name + ' ammo'); Sound.pickup(); }
      if (p.type === 'health') { if (player.health >= 100) continue; player.health = 100; toast('Health'); Sound.pickup(); }
      if (p.type === 'armor') { if (player.armor >= 100) continue; player.armor = 100; toast('Body armor'); Sound.pickup(); }
      if (p.permanent) { p.respawn = 120; p.m.visible = false; p.life = 1e9; respawnPick(p); }
      scene.remove(p.m); pickups.splice(i, 1);
    }
  }
}
function respawnPick(p) { setTimeout(() => dropPickup(p.type, p.x, p.z, p.val, true), 120000); }
function giveWeapon(k, ammo) {
  if (!player.weapons[k]) player.weapons[k] = { clip: 0, ammo: 0 };
  const W = WEAPONS[k]; player.weapons[k].ammo += ammo;
  if (player.weapons[k].clip === 0 && W.mag) { const t = Math.min(W.mag, player.weapons[k].ammo); player.weapons[k].clip = t; player.weapons[k].ammo -= t; }
}
function equip(k) {
  player.weapon = k === 'fists' ? null : k;
  if (player.gunMesh) { pMesh.handR.remove(player.gunMesh); player.gunMesh = null; }
  if (player.weapon) { player.gunMesh = new THREE.Mesh(gunGeo(player.weapon), GUN_MAT); player.gunMesh.castShadow = true; pMesh.handR.add(player.gunMesh); }
  if (typeof toast === 'function') toast(player.weapon ? WEAPONS[player.weapon].name : 'Fists');
}
function cycleWeapon(dir) {
  const owned = WEAPON_ORDER.filter(k => k === 'fists' || player.weapons[k]);
  const cur = owned.indexOf(player.weapon || 'fists');
  equip(owned[(cur + dir + owned.length) % owned.length]);
}
