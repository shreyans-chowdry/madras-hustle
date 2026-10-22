// ===================== ECONOMY: money, shops, interiors, properties, garages, services =====================
const IX0 = -16000, IZ0 = -16000;            // interiors live far outside the city
const INT = {};                                // interior definitions by type
const services = [];                           // door / marker points in the city
const IMAT = {
  floor: (() => { const t = texPaving.clone(); t.needsUpdate = true; t.repeat.set(7, 7); return new THREE.MeshStandardMaterial({ color: 0x8f8778, map: t, roughness: 0.45, metalness: 0.05 }); })(),
  tile: new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.3, metalness: 0.05 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xc9c1b2, roughness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x7a5233, roughness: 0.6 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd4a72c, roughness: 0.3, metalness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfd8e6, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb8251c, roughness: 0.6 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x3a4a6a, roughness: 0.95 }),
  light: new THREE.MeshBasicMaterial({ color: 0xb8ad9a }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.9 }),
};
function ibox(g, mat, w, h, d, x, y, z, ry = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); return m; }
function room(g, W, D, H, floorMat = IMAT.floor, wallMat = IMAT.wall, doorZ = true) {
  ibox(g, floorMat, W, 0.2, D, 0, -0.1, 0); ibox(g, IMAT.wall, W, 0.2, D, 0, H + 0.1, 0);
  ibox(g, wallMat, W, H, 0.2, 0, H / 2, -D / 2); ibox(g, wallMat, 0.2, H, D, -W / 2, H / 2, 0); ibox(g, wallMat, 0.2, H, D, W / 2, H / 2, 0);
  ibox(g, wallMat, W / 2 - 1, H, 0.2, -W / 4 - 0.5, H / 2, D / 2); ibox(g, wallMat, W / 2 - 1, H, 0.2, W / 4 + 0.5, H / 2, D / 2); ibox(g, wallMat, 2, H - 2.6, 0.2, 0, H - (H - 2.6) / 2, D / 2);
  ibox(g, IMAT.dark, 2, 2.6, 0.1, 0, 1.3, D / 2 + 0.05);
  for (let x = -W / 2 + 2; x < W / 2; x += 4) for (let z = -D / 2 + 2; z < D / 2; z += 4) ibox(g, IMAT.light, 1.2, 0.05, 1.2, x, H - 0.03, z);
  const L = new THREE.PointLight(0xfff2dc, 60, 30, 1.5); L.position.set(0, H - 0.5, 0); g.add(L);
  const L2 = new THREE.PointLight(0xfff2dc, 30, 20, 1.5); L2.position.set(W / 4, H - 0.5, -D / 4); g.add(L2);
  // interior walls collide via a simple box test
  g.userData.box = { W, D };
}
function buildInteriors() {
  let i = 0;
  const mk = (type, W, D, H, build) => {
    const g = new THREE.Group(); g.position.set(IX0 + i * 120, 0, IZ0); i++;
    room(g, W, D, H); build(g, W, D, H); scene.add(g); g.visible = false;
    INT[type] = { g, W, D, H, x: g.position.x, z: g.position.z, spawn: [g.position.x, g.position.z + D / 2 - 1.5], spots: {} };
  };
  mk('store', 14, 11, 3.4, (g, W, D) => {
    for (let r = 0; r < 3; r++) { ibox(g, IMAT.metal, 7, 1.8, 0.8, 1.5, 0.9, -2.5 + r * 2.4); for (let k = 0; k < 14; k++) ibox(g, new THREE.MeshStandardMaterial({ color: pick([0xc8251c, 0x1f4fb3, 0xf2c41f, 0x178a45, 0xef7d16, 0xffffff]) }), 0.35, 0.3, 0.3, -1.6 + k * 0.45, 1.4 + (k % 2) * 0.35, -2.5 + r * 2.4 + 0.25); }
    ibox(g, IMAT.wood, 4, 1.1, 1, -4.5, 0.55, -1); ibox(g, IMAT.dark, 0.5, 0.4, 0.4, -4.5, 1.3, -1);
    ibox(g, IMAT.glass, 2, 2, 0.6, -6.2, 1, -4.6);
    INT.store_clerk = [-4.5, -2.0];
  });
  INT.store.spots.clerk = INT.store_clerk;
  mk('jewel', 14, 11, 3.6, (g) => {
    for (let k = 0; k < 6; k++) { const x = -5 + (k % 3) * 4, z = -2 + Math.floor(k / 3) * 3.5; ibox(g, IMAT.wood, 2.4, 0.9, 1, x, 0.45, z); ibox(g, IMAT.glass, 2.4, 0.4, 1, x, 1.1, z); for (let j = 0; j < 4; j++) ibox(g, IMAT.gold, 0.2, 0.08, 0.2, x - 0.8 + j * 0.5, 0.95, z); }
    ibox(g, IMAT.wood, 4, 1.1, 1, 0, 0.55, -4.2);
  });
  INT.jewel.spots.clerk = [0, -4.9];
  mk('gun', 16, 12, 3.6, (g) => {
    ibox(g, IMAT.wood, 10, 1.1, 1, 0, 0.55, -3.5); ibox(g, IMAT.dark, 15, 3, 0.2, 0, 1.8, -5.8);
    WEAPON_ORDER.slice(1).forEach((k, j) => { const m = new THREE.Mesh(gunGeo(k), GUN_MAT); m.rotation.set(0, Math.PI / 2, 0); m.scale.setScalar(1.6); m.position.set(-6 + j * 1.8, 2.0 + (j % 2) * 0.6, -5.6); g.add(m); });
    for (let k = 0; k < 3; k++) ibox(g, IMAT.concrete, 0.6, 1.6, 0.6, 4 + k * 1.5, 0.8, 2);
  });
  INT.gun.spots.clerk = [0, -4.3];
  mk('bank', 22, 16, 5, (g) => {
    ibox(g, IMAT.tile, 21.8, 0.02, 15.8, 0, 0.01, 0);
    ibox(g, IMAT.wood, 14, 1.2, 1, 0, 0.6, -3); ibox(g, IMAT.glass, 14, 1.2, 0.1, 0, 1.8, -3);
    ibox(g, IMAT.metal, 4, 3.6, 0.6, 0, 1.8, -7.6); const v = ibox(g, IMAT.metal, 1.8, 1.8, 0.4, 0, 1.6, -7.2); v.rotation.x = Math.PI / 2; INT.bank_vault = v;
    for (let k = 0; k < 4; k++) ibox(g, IMAT.dark, 0.8, 4.8, 0.8, -9 + k * 6, 2.4, 3);
    for (let k = 0; k < 6; k++) ibox(g, IMAT.gold, 0.5, 0.3, 0.3, -2 + k * 0.8, 0.15, -6.6);
  });
  INT.bank.spots.vault = [0, -6.2]; INT.bank.spots.teller = [0, -2.2];
  mk('apartment', 18, 14, 3.4, (g) => {
    ibox(g, IMAT.wood, 17.8, 0.02, 13.8, 0, 0.01, 0);
    ibox(g, IMAT.fabric, 3.2, 0.6, 2.2, -6, 0.3, -4.5); ibox(g, IMAT.wall, 3.2, 0.3, 0.6, -6, 0.75, -5.4); ibox(g, IMAT.wall, 3.4, 1.2, 0.2, -6, 0.9, -5.7);
    ibox(g, IMAT.fabric, 3.6, 0.5, 1, 3, 0.4, 1.5); ibox(g, IMAT.fabric, 3.6, 0.6, 0.3, 3, 0.8, 2);
    ibox(g, IMAT.dark, 3, 1.7, 0.1, 3, 1.6, -6.85); ibox(g, IMAT.wood, 1.2, 0.5, 0.6, 3, 0.25, -1);
    ibox(g, IMAT.metal, 0.9, 1.0, 0.8, 7.5, 0.5, -6.2); ibox(g, IMAT.gold, 0.15, 0.15, 0.05, 7.5, 0.7, -5.78);
    ibox(g, IMAT.glass, 0.1, 2.4, 10, 8.95, 1.6, 0); ibox(g, IMAT.dark, 2.5, 2.2, 0.6, -7.5, 1.1, 2);
  });
  INT.apartment.spots.bed = [-6, -3.2]; INT.apartment.spots.safe = [7.5, -5.4]; INT.apartment.spots.wardrobe = [-7.5, 1.4]; INT.apartment.spots.garage = [-7.6, 5.6];
  mk('garage', 24, 14, 4, (g) => {
    ibox(g, IMAT.concrete, 23.8, 0.02, 13.8, 0, 0.01, 0);
    for (let k = 0; k < 4; k++) { ibox(g, new THREE.MeshStandardMaterial({ color: 0xf2c41f }), 0.15, 0.03, 5, -9 + k * 6 - 1.6, 0.03, -2); ibox(g, new THREE.MeshStandardMaterial({ color: 0xf2c41f }), 0.15, 0.03, 5, -9 + k * 6 + 1.6, 0.03, -2); }
    ibox(g, IMAT.metal, 4, 2.4, 0.4, 0, 1.2, -6.6);
  });
  INT.garage.bays = [0, 1, 2, 3].map(k => [IX0 + 120 * (Object.keys(INT).length - 1) - 9 + k * 6, IZ0 - 2]);
  mk('dealer', 30, 20, 6, (g) => {
    ibox(g, IMAT.tile, 29.8, 0.02, 19.8, 0, 0.01, 0); ibox(g, IMAT.glass, 0.1, 5, 18, 14.9, 2.5, 0);
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.25, 32), IMAT.metal); p.position.set(-11 + k * 5.5, 0.12, -4); p.receiveShadow = true; g.add(p); }
    ibox(g, IMAT.wood, 4, 1.1, 1.2, 9, 0.55, 5);
  });
  INT.dealer.spots.desk = [9, 4];
  mk('lobby', 16, 12, 5, (g) => {
    ibox(g, IMAT.tile, 15.8, 0.02, 11.8, 0, 0.01, 0); ibox(g, IMAT.wood, 4, 1.1, 1, -4, 0.55, -2);
    for (let k = 0; k < 2; k++) { ibox(g, IMAT.metal, 1.8, 2.6, 0.2, 2.5 + k * 3, 1.3, -5.85); ibox(g, IMAT.dark, 0.25, 0.25, 0.05, 2.5 + k * 3 - 1.2, 1.4, -5.7); }
  });
  INT.lobby.spots.elevator = [4, -4.8];
  mk('hangar', 40, 30, 10, (g) => { ibox(g, IMAT.concrete, 39.8, 0.02, 29.8, 0, 0.01, 0); ibox(g, IMAT.wood, 4, 1.1, 1.2, 15, 0.55, 10); });
  INT.hangar.spots.desk = [15, 9];
  // interior decor lights stay off until entered
}
// ---------------- menus ----------------
const Menu = {
  open: false, items: [], idx: 0, onClose: null,
  show(title, sub, items, onClose) {
    this.open = true; this.items = items; this.idx = Math.max(0, items.findIndex(it => !it.disabled)); this.onClose = onClose;
    $('menuTitle').textContent = title; $('menuSub').textContent = sub || '';
    this.render(); $('menu').hidden = false; if (document.pointerLockElement) document.exitPointerLock();
  },
  render() {
    const ul = $('menuList'); ul.innerHTML = '';
    this.items.forEach((it, i) => {
      const li = document.createElement('button'); li.className = 'mi' + (i === this.idx ? ' sel' : '') + (it.disabled ? ' dis' : '');
      li.innerHTML = `<span>${it.label}</span><b>${it.right ?? (it.price != null ? (it.price ? money(it.price) : 'Free') : '')}</b>`;
      li.onmouseenter = () => { this.idx = i; this.render(); }; li.onclick = () => { this.idx = i; this.choose(); };
      ul.appendChild(li);
    });
    $('menuCash').textContent = 'Cash ' + money(player.cash) + ' · Bank ' + money(player.bank);
  },
  close() { this.open = false; $('menu').hidden = true; if (this.onClose) this.onClose(); Sound.click(); },
  choose() {
    const it = this.items[this.idx]; if (!it || it.disabled) { Sound.click(); return; }
    if (it.price && !spend(it.price)) { toast('Not enough money'); Sound.fail(); return; }
    Sound.cash(); const keep = it.action ? it.action() : false; if (keep === 'close') this.close(); else this.render();
  },
  update() {
    if (!this.open) return;
    const up = hit('ArrowUp') || hit('KeyW') || gpHit(BTN.UP), dn = hit('ArrowDown') || hit('KeyS') || gpHit(BTN.DOWN);
    if (up || dn) { let k = this.idx; for (let t = 0; t < this.items.length; t++) { k = (k + (dn ? 1 : -1) + this.items.length) % this.items.length; if (!this.items[k].disabled) break; } this.idx = k; this.render(); Sound.click(); }
    if (hit('Enter') || hit('Space') || gpHit(BTN.X) || hit('KeyE')) this.choose();
    else if (hit('Escape') || hit('Backspace') || gpHit(BTN.O) || hit('KeyF')) this.close();
  },
};
// ---------------- money ----------------
function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
function addCash(n) { player.cash += n; if (n > 0) { Sound.cash(); cashFlash(n); } }
function spend(n) { if (player.cash >= n) { player.cash -= n; cashFlash(-n); return true; } if (player.cash + player.bank >= n) { player.bank -= n - player.cash; player.cash = 0; cashFlash(-n); return true; } return false; }
function payBank(n) { player.bank += n; cashFlash(n); Sound.cash(); }
let cashFlashT = 0;
function cashFlash(n) { const el = $('cashDelta'); el.textContent = (n > 0 ? '+' : '−') + money(Math.abs(n)); el.className = n > 0 ? 'up' : 'down'; cashFlashT = 2.5; }

// ---------------- properties ----------------
const PROPERTIES = [
  { id: 'chetpet', name: 'Chetpet Studio', at: [13.0712, 80.2420], price: 0, garage: 2, starter: true },
  { id: 'tnagar', name: 'T Nagar Apartment', at: [13.0418, 80.2341], price: 85000, garage: 2 },
  { id: 'adyar', name: 'Adyar Riverside Flat', at: [13.0067, 80.2570], price: 240000, garage: 3 },
  { id: 'nungam', name: 'Nungambakkam Loft', at: [13.0605, 80.2425], price: 420000, garage: 4 },
  { id: 'besant', name: 'Besant Nagar Beach Villa', at: [12.9995, 80.2680], price: 1800000, garage: 4, beach: true },
  { id: 'penthouse', name: 'Sky Penthouse', tower: true, price: 3500000, garage: 4 },
];
const ll = (lat, lon) => [(lon - WD.meta.lon0) * WD.meta.kx, (WD.meta.lat0 - lat) * WD.meta.kz];

// ---------------- service points ----------------
function nearestWallDoor(x, z, maxR = 45) {
  // find closest building wall to (x,z), return point just outside it
  let best = null, bd = maxR * maxR;
  const ix0 = Math.floor((x - maxR) / BC), ix1 = Math.floor((x + maxR) / BC), iz0 = Math.floor((z - maxR) / BC), iz1 = Math.floor((z + maxR) / BC);
  for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
    const a = bWallGrid.get(gkey(ix, iz)); if (!a) continue;
    for (const wi of a) {
      const wo = wi * 7; if (walls[wo + 4] < 3) continue;
      const mx = (walls[wo + 0] + walls[wo + 2]) / 2, mz = (walls[wo + 1] + walls[wo + 3]) / 2, len = Math.hypot(walls[wo + 2] - walls[wo + 0], walls[wo + 3] - walls[wo + 1]); if (len < 3) continue;
      const dx = mx + walls[wo + 5] * 1.2, dz = mz + walls[wo + 6] * 1.2;
      if (insideBuilding(dx, dz) >= 0) continue;
      const r = roadQuery(dx, dz, 30); if (!r.seg) continue;
      const d = dist2(dx, dz, x, z) + r.d * r.d * 2; if (d < bd) { bd = d; best = { x: dx, z: dz, h: headingTo(-walls[wo + 5], -walls[wo + 6]), bi: insideBuilding(mx - walls[wo + 5] * 0.5, mz - walls[wo + 6] * 0.5) }; }
    }
  }
  return best;
}
function streetSpot(x, z) { const r = roadQuery(x, z, 80, 0); if (!r.seg) return null; const s = r.seg, dx = s.bx - s.ax, dz = s.bz - s.az, l = Math.hypot(dx, dz) || 1; return { x: r.px, z: r.pz, h: headingTo(dx / l, dz / l), hw: s.hw, tx: dx / l, tz: dz / l }; }
const SERVICE_STYLE = {
  gun: { label: 'Ammo Depot', icon: 'G', col: '#e04a3a' }, store: { label: '24/7 Store', icon: '$', col: '#5ac85a' }, jewel: { label: 'Jewellers', icon: 'J', col: '#f6c21c' },
  bank: { label: 'Bank', icon: 'B', col: '#37d6ff' }, atm: { label: 'ATM', icon: '₳', col: '#37d6ff' }, dealer: { label: 'Premium Motors', icon: 'C', col: '#ff8a1a' },
  fuel: { label: 'Fuel', icon: 'F', col: '#f0f0f0' }, spray: { label: 'Pit Stop Repairs', icon: 'R', col: '#d24cff' }, home: { label: 'Safehouse', icon: 'H', col: '#6ee07a' },
  forsale: { label: 'For Sale', icon: 'H', col: '#9aa0a6' }, garage: { label: 'Garage', icon: 'P', col: '#6ee07a' }, lobby: { label: 'Rooftop Elevator', icon: '↑', col: '#c9b37a' },
  hangar: { label: 'Aircraft Hangar', icon: '✈', col: '#ffffff' }, marina: { label: 'Marina', icon: '⚓', col: '#37d6ff' }, heli: { label: 'Helipad', icon: 'H', col: '#ffd24c' },
  station: { label: 'Railway Station', icon: 'T', col: '#c9b37a' }, hospital: { label: 'Hospital', icon: '+', col: '#e04040' },
};
function addService(type, x, z, extra = {}) { const s = Object.assign({ type, x, z, h: 0 }, extra); services.push(s); gridAdd(svcGrid, 200, x, z, x, z, s); return s; }
const svcGrid = new Map();
function spaced(list, minD) { const out = []; for (const p of list) if (!out.some(o => dist2(o.x, o.z, p.x, p.z) < minD * minD)) out.push(p); return out; }
function setupServices() {
  const sh = G.shops;
  const byT = t => sh.filter(s => s.t === t);
  const doorFor = (p, type, extra) => { const d = nearestWallDoor(p.x, p.z); if (d) addService(type, d.x, d.z, Object.assign({ h: d.h, name: p.n }, extra)); };
  // gun shops - pick electronics/hardware-ish spots spread out
  for (const p of spaced(byT('electronics').concat(byT('clothes')), 1700).slice(0, 9)) doorFor(p, 'gun');
  for (const p of spaced(byT('store'), 450)) doorFor(p, 'store');
  for (const p of spaced(byT('jewel'), 700)) doorFor(p, 'jewel');
  for (const p of spaced(byT('bank'), 650)) doorFor(p, 'bank');
  for (const p of spaced(byT('atm').concat(byT('bank')), 260)) { const s = streetSpot(p.x, p.z); if (s) addService('atm', s.x + s.tz * (s.hw + 1.6), s.z - s.tx * (s.hw + 1.6), { h: s.h }); }
  for (const p of spaced(byT('cars'), 2500).slice(0, 5)) doorFor(p, 'dealer');
  for (const p of spaced(byT('fuel').concat(G.pois.filter(q => q.t === 'fuel')), 500)) { const s = streetSpot(p.x, p.z); if (s && s.hw < 9) addService('fuel', s.x, s.z, { h: s.h, r: 6 }); }
  for (const p of spaced(byT('repair').concat(byT('cars')), 1800).slice(0, 10)) { const s = streetSpot(p.x, p.z); if (s) addService('spray', s.x, s.z, { h: s.h, r: 5 }); }
  for (const pi of spaced(tallTowers.map(i => ({ x: bPolys[i].cx, z: bPolys[i].cz, pi: i })), 350)) { const d = nearestWallDoor(pi.x, pi.z, Math.sqrt(bPolys[pi.pi].area)); if (d) addService('lobby', d.x, d.z, { h: d.h, pi: pi.pi }); }
  for (const p of spaced(G.pois.filter(q => q.t === 'station'), 600)) { const s = streetSpot(p.x, p.z); if (s) addService('station', s.x + s.tz * (s.hw + 1.6), s.z - s.tx * (s.hw + 1.6), { name: p.n }); }
  for (const p of spaced(G.pois.filter(q => q.t === 'hospital' && q.a > 15000), 800)) addService('hospital', p.x, p.z, { name: p.n, mapOnly: true });
  // properties
  for (const P of PROPERTIES) {
    let x, z, pi;
    if (P.tower) { const best = tallTowers.slice().sort((a, b) => bPolys[b].h - bPolys[a].h)[0]; if (best === undefined) continue; pi = best; x = bPolys[best].cx; z = bPolys[best].cz; }
    else [x, z] = ll(P.at[0], P.at[1]);
    const d = nearestWallDoor(x, z, 80); if (!d) continue;
    P.door = { x: d.x, z: d.z, h: d.h }; P.roof = P.tower ? { x, z, y: bPolys[pi].h } : null;
    const st = streetSpot(d.x + Math.sin(d.h + Math.PI) * 6, d.z + Math.cos(d.h + Math.PI) * 6);
    P.garageSpot = st ? { x: st.x + st.tz * (st.hw * 0.5), z: st.z - st.tx * (st.hw * 0.5), h: st.h } : { x: d.x, z: d.z, h: d.h };
    P.svc = addService(owns(P.id) ? 'home' : 'forsale', d.x, d.z, { h: d.h, prop: P });
    P.gsvc = addService('garage', P.garageSpot.x, P.garageSpot.z, { h: P.garageSpot.h, prop: P, r: 4.5, hidden: !owns(P.id) });
  }
  // airport hangar + helipads + marina
  const ap = G.pois.find(p => p.t === 'airport' && p.a > 100000) || G.pois.find(p => p.t === 'airport');
  if (AIR.runways.length) {
    const rw = AIR.runways.slice().sort((a, b) => b.len - a.len)[0]; const t = edgePoint(rw.E, rw.len * 0.5, 1, {});
    const off = rw.hw + 120; let hx = t.x + t.tz * off, hz = t.z - t.tx * off; if (insideBuilding(hx, hz) >= 0) { hx = t.x - t.tz * off; hz = t.z + t.tx * off; }
    addService('hangar', hx, hz, { h: headingTo(-t.tz, t.tx), apron: [hx + t.tx * 30, hz + t.tz * 30], rw });
  }
  for (const h of AIR.helipads.slice(0, 4)) addService('heli', h[0], h[1], { r: 5 });
  const [mx, mz] = ll(13.0480, 80.2840); const mw = findShoreWater(mx, mz); if (mw) addService('marina', mw.land[0], mw.land[1], { water: mw.water });
  const [bx2, bz2] = ll(13.0010, 80.2735); const bw = findShoreWater(bx2, bz2); if (bw) addService('marina', bw.land[0], bw.land[1], { water: bw.water });
}
function findShoreWater(x, z) {
  for (let r = 0; r < 600; r += 10) for (let a = 0; a < TAU; a += 0.3) {
    const wx = x + Math.cos(a) * r, wz = z + Math.sin(a) * r;
    if (inWater(wx, wz) && inWater(wx + 15, wz) && inWater(wx - 15, wz) && inWater(wx, wz + 15)) {
      for (let k = 1; k < 40; k++) { const lx = wx - Math.cos(a) * k * 2, lz = wz - Math.sin(a) * k * 2; if (!inWater(lx, lz)) return { water: [wx + Math.cos(a) * 25, wz + Math.sin(a) * 25], land: [lx - Math.cos(a) * 3, lz - Math.sin(a) * 3] }; }
    }
  }
  return null;
}
function servicesNear(x, z, r) { const out = []; const cx = Math.floor(x / 200), cz = Math.floor(z / 200), k = Math.ceil(r / 200); for (let ix = cx - k; ix <= cx + k; ix++) for (let iz = cz - k; iz <= cz + k; iz++) { const a = svcGrid.get(gkey(ix, iz)); if (a) for (const s of a) if (dist2(s.x, s.z, x, z) < r * r) out.push(s); } return out; }
// marker meshes (pooled)
const svcMarkers = [];
const svcLabelCache = {};
function svcLabel(type) {
  if (svcLabelCache[type]) return svcLabelCache[type];
  const st = SERVICE_STYLE[type]; const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.beginPath(); x.arc(128, 128, 110, 0, TAU); x.fillStyle = 'rgba(12,14,16,0.85)'; x.fill(); x.lineWidth = 14; x.strokeStyle = st.col; x.stroke();
  x.fillStyle = st.col; x.font = '700 120px Bungee, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(st.icon, 128, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; svcLabelCache[type] = new THREE.SpriteMaterial({ map: t, depthTest: true, fog: false }); return svcLabelCache[type];
}
let svcT = 0;
function updateServiceMarkers(dt) {
  svcT -= dt; if (svcT > 0) return; svcT = 0.4;
  const near = player.interior ? [] : servicesNear(player.x, player.z, 110).filter(s => !s.mapOnly && !s.hidden).sort((a, b) => dist2(a.x, a.z, player.x, player.z) - dist2(b.x, b.z, player.x, player.z)).slice(0, 14);
  while (svcMarkers.length < near.length) {
    const g = new THREE.Group(); const ring = new THREE.Mesh(ringG, markerMat.clone()); ring.rotation.x = 0; g.add(ring);
    const sp = new THREE.Sprite(svcLabel('store')); sp.scale.set(1.4, 1.4, 1); sp.position.y = 2.6; g.add(sp); scene.add(g); svcMarkers.push({ g, ring, sp });
  }
  svcMarkers.forEach((m, i) => {
    const s = near[i]; m.g.visible = !!s; if (!s) return;
    const st = SERVICE_STYLE[s.type]; m.g.position.set(s.x, (s.y || 0) + 0.15, s.z); const r = s.r || 1.3; m.ring.scale.set(r, 1, r);
    m.ring.material.color.set(st.col); m.sp.material = svcLabel(s.type); m.sp.position.y = s.r ? 3.5 : 2.6;
  });
}
// ---------------- interiors: enter / exit ----------------
let interiorNPC = null;
function enterInterior(type, svc) {
  const I = INT[type]; if (!I) return;
  player.interior = { type, svc, ret: { x: player.x, z: player.z, h: player.h } };
  for (const k in INT) if (INT[k] && INT[k].g) INT[k].g.visible = k === type;
  player.x = I.spawn[0]; player.z = I.spawn[1] - 2.2; player.y = 0; player.h = Math.PI; camYaw = Math.PI; camPitch = 0.22; camSmoothed = false; player.vx = player.vz = 0;
  fadeFlash();
  if (interiorNPC) { interiorNPC.remove(); interiorNPC = null; }
  const clerk = I.spots.clerk || I.spots.teller || I.spots.desk;
  if (clerk) { const w = new Walker(randomLook(), I.x + clerk[0], I.z + clerk[1]); w.state = 'stand'; w.special = true; w.h = 0; w.clerk = true; interiorNPC = w; }
  if (type === 'garage') showGarageCars(svc.prop);
  if (type === 'dealer') showDealerCars();
  if (type === 'hangar') showHangar();
  robbery = null;
}
function exitInterior() {
  const it = player.interior; if (!it) return;
  for (const k in INT) if (INT[k] && INT[k].g) INT[k].g.visible = false;
  clearDisplayCars();
  if (interiorNPC) { interiorNPC.remove(); interiorNPC = null; }
  player.interior = null; player.x = it.ret.x; player.z = it.ret.z; player.h = it.ret.h + Math.PI; camYaw = player.h; camSmoothed = false; player.y = sidewalkY(player.x, player.z);
  fadeFlash();
  if (robbery && robbery.done) { crime('rob', player.x, player.z); }
  robbery = null;
}
function fadeFlash() { const f = $('fade'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function interiorCollide() {
  const I = INT[player.interior.type]; const hw = I.W / 2 - 0.5, hd = I.D / 2 - 0.5;
  player.x = clamp(player.x, I.x - hw, I.x + hw); player.z = clamp(player.z, I.z - hd, I.z + hd);
}
// display cars in garages / dealer
const displayCars = [];
function clearDisplayCars() { for (const v of displayCars) v.remove(); displayCars.length = 0; }
function showGarageCars(P) {
  clearDisplayCars(); const I = INT.garage; const list = (saveData.garages[P.id] || []);
  list.forEach((c, k) => { const v = new Vehicle(c.type, c.color, I.x - 9 + k * 6, I.z - 2, Math.PI); v.display = { idx: k, prop: P }; v.persist = true; displayCars.push(v); });
}
const DEALER_STOCK = ['hatch', 'sedan', 'suv', 'pickup', 'muscle', 'sports', 'super', 'motorbike', 'truck', 'auto'];
function showDealerCars() {
  clearDisplayCars(); const I = INT.dealer;
  ['super', 'sports', 'muscle', 'suv', 'motorbike'].forEach((t, k) => { const v = new Vehicle(t, undefined, I.x - 11 + k * 5.5, I.z - 4, Math.PI * 0.85); v.y = 0.25; v.persist = true; v.displayOnly = true; displayCars.push(v); });
}
function showHangar() { clearDisplayCars(); const I = INT.hangar; [['heli', -8], ['plane', 8]].forEach(([t, x]) => { const v = new Vehicle(t, 0xd8d8d8, I.x + x, I.z - 3, Math.PI); v.persist = true; v.displayOnly = true; displayCars.push(v); }); }
// ---------------- robbery ----------------
let robbery = null;
function updateRobbery(dt) {
  if (!player.interior || !interiorNPC || !player.weapon) return;
  const type = player.interior.type; if (type !== 'store' && type !== 'jewel' && type !== 'bank') return;
  const w = interiorNPC; const d = Math.hypot(w.x - player.x, w.z - player.z);
  if (player.aiming && d < 9 && Math.abs(wrapAngle(headingTo(w.x - player.x, w.z - player.z) - camYaw)) < 0.4) {
    if (!robbery) { robbery = { amount: 0, max: type === 'store' ? 600 + Math.random() * 900 : type === 'jewel' ? 6000 + Math.random() * 6000 : 15000, done: false }; w.p.aim = 0; toast('Keep your gun on the clerk!'); }
    if (!robbery.done) {
      robbery.amount = Math.min(robbery.max, robbery.amount + robbery.max * dt / 7);
      w.p.arms[0].rotation.x = -2.8; w.p.arms[1].rotation.x = -2.8;
      setObjective(`Robbing… ${money(robbery.amount)}`);
      if (robbery.amount >= robbery.max) { robbery.done = true; addCash(Math.round(robbery.max)); toast('Cash grabbed! Get out before the cops arrive.'); Police.set(Math.max(Police.level, type === 'store' ? 2 : 3)); saveData.stats.robberies = (saveData.stats.robberies || 0) + 1; }
    }
  }
}
// ---------------- interactions per service ----------------
function serviceInteract(s) {
  const P = s.prop;
  switch (s.type) {
    case 'gun': case 'store': case 'jewel': case 'bank': case 'dealer': case 'hangar': enterInterior(s.type, s); return;
    case 'lobby': enterInterior('lobby', s); return;
    case 'home': enterInterior('apartment', s); return;
    case 'atm': atmMenu(); return;
    case 'forsale':
      Menu.show(P.name, P.price ? 'Property for sale' : 'Starter home', [
        { label: `Buy ${P.name}`, price: P.price, action: () => { buyProperty(P); return 'close'; } },
        { label: `Garage: ${P.garage} cars`, disabled: true, right: '' }, { label: 'Not now', action: () => 'close' }]);
      return;
    case 'garage': if (!player.veh) enterInterior('garage', s); return;
    case 'marina': marinaMenu(s); return;
    case 'station': trainMenu(s); return;
  }
}
function buyProperty(P) {
  if (!saveData.props.includes(P.id)) saveData.props.push(P.id);
  P.svc.type = 'home'; P.gsvc.hidden = false; if (!saveData.home) saveData.home = P.id;
  banner('PROPERTY PURCHASED', P.name, false, 3.5); saveGame(true);
}
function owns(id) { return saveData.props.includes(id); }
function atmMenu() {
  const amounts = [100, 1000, 10000];
  Menu.show('ATM', 'Money in the bank is safe when you die or get busted', [
    ...amounts.map(a => ({ label: `Deposit ${money(a)}`, disabled: player.cash < a, action: () => { player.cash -= a; player.bank += a; Sound.cash(); } })),
    { label: 'Deposit all cash', disabled: player.cash <= 0, action: () => { player.bank += player.cash; player.cash = 0; Sound.cash(); } },
    ...amounts.map(a => ({ label: `Withdraw ${money(a)}`, disabled: player.bank < a, action: () => { player.bank -= a; player.cash += a; Sound.cash(); } })),
    { label: 'Done', action: () => 'close' }]);
}
function gunMenu() {
  const items = [];
  for (const k of WEAPON_ORDER.slice(1)) {
    const W = WEAPONS[k], own = !!player.weapons[k];
    if (!own) items.push({ label: `${W.name}`, price: W.price, action: () => { giveWeapon(k, W.mag * 3); equip(k); toast(W.name + ' bought'); } });
    else items.push({ label: `${W.name} ammo ×${W.ammoPack}`, price: W.ammoPrice, action: () => { player.weapons[k].ammo += W.ammoPack; } });
  }
  items.push({ label: 'Body armor', price: 1500, disabled: player.armor >= 100, action: () => { player.armor = 100; } });
  items.push({ label: 'First aid', price: 300, disabled: player.health >= 100, action: () => { player.health = 100; } });
  items.push({ label: 'Leave', action: () => 'close' });
  Menu.show('Ammo Depot', 'Weapons, ammo and armor', items);
}
function dealerMenu() {
  const homes = PROPERTIES.filter(p => owns(p.id));
  const items = DEALER_STOCK.map(t => ({ label: SPECS[t].name, price: SPECS[t].price, action: () => { deliverVehicle(t); return 'close'; } }));
  items.push({ label: 'Leave', action: () => 'close' });
  Menu.show('Premium Motors', homes.length ? 'Delivered to your garage, or parked outside if it is full' : 'Parked outside the showroom', items);
}
function deliverVehicle(type, color) {
  const col = color ?? (SPECS[type].kind === 'car' ? pick(type === 'super' || type === 'motorbike' ? SUPER_COLS : CAR_COLS) : undefined);
  const home = PROPERTIES.find(p => owns(p.id) && (saveData.garages[p.id] || []).length < p.garage);
  if (home) { (saveData.garages[home.id] = saveData.garages[home.id] || []).push({ type, color: col }); toast(`${SPECS[type].name} delivered to ${home.name} garage`); saveGame(true); }
  else { const r = player.interior ? player.interior.ret : { x: player.x, z: player.z }; const s = streetSpot(r.x, r.z); if (s) { const v = new Vehicle(type, col, s.x + s.tz * s.hw * 0.5, s.z - s.tx * s.hw * 0.5, s.h); v.persist = true; v.owned = true; traffic.push(v); toast(`${SPECS[type].name} is parked outside`); } }
}
function hangarMenu(svc) {
  const items = [['heli', 'Helicopter'], ['plane', 'Prop Plane'], ['jet', 'Private Jet']].map(([t, n]) => ({ label: n, price: SPECS[t].price, right: saveData.aircraft.includes(t) ? 'Owned' : null, action: () => { if (!saveData.aircraft.includes(t)) saveData.aircraft.push(t); saveGame(true); return 'close'; } }));
  items.forEach((it, i) => { const t = ['heli', 'plane', 'jet'][i]; if (saveData.aircraft.includes(t)) { it.price = 0; it.label = 'Fly the ' + SPECS[t].name.toLowerCase(); it.action = () => { exitInterior(); spawnAircraftAtHangar(t, svc); return 'close'; }; } });
  items.push({ label: 'Leave', action: () => 'close' });
  Menu.show('Aircraft Hangar', 'Buy once, fly any time', items);
}
function spawnAircraftAtHangar(t, svc) {
  const s = svc || services.find(q => q.type === 'hangar'); if (!s) return;
  const rw = s.rw, tp = edgePoint(rw.E, rw.len * 0.12, 1, {});
  const v = t === 'heli' ? new Vehicle('heli', 0x1a1a1a, s.apron[0], s.apron[1], 0) : new Vehicle(t, 0x1f4fa8, tp.x, tp.z, headingTo(tp.tx, tp.tz));
  v.persist = true; v.owned = true; traffic.push(v); player.x = v.x + 4; player.z = v.z; enterVehicle(v);
}
function marinaMenu(s) {
  const items = [['jetski', 15000], ['speedboat', 60000], ['yacht', 1200000]].map(([t, p]) => ({ label: saveData.boats.includes(t) ? 'Launch ' + SPECS[t].name : SPECS[t].name, price: saveData.boats.includes(t) ? 0 : p, action: () => { if (!saveData.boats.includes(t)) saveData.boats.push(t); launchBoat(t, s); saveGame(true); return 'close'; } }));
  items.push({ label: 'Leave', action: () => 'close' });
  Menu.show('Marina', 'Buy a boat once and launch it from any marina', items);
}
function launchBoat(t, s) { const v = new Vehicle(t, pick([0xc8251c, 0x1f4fb3, 0xffffff, 0x111111]), s.water[0], s.water[1], headingTo(s.water[0] - s.x, s.water[1] - s.z)); v.persist = true; v.owned = true; traffic.push(v); player.x = v.x; player.z = v.z; enterVehicle(v); }
function apartmentMenu() {
  const P = player.interior.svc.prop;
  Menu.show(P.name, 'Your safehouse', [
    { label: 'Sleep 6 hours and save', action: () => { hour = (hour + 6) % 24; player.health = 100; saveGame(false); return 'close'; } },
    { label: `Stash cash in the safe (${money(saveData.stash[P.id] || 0)} inside)`, disabled: player.cash <= 0, action: () => { saveData.stash[P.id] = (saveData.stash[P.id] || 0) + player.cash; player.cash = 0; saveGame(true); } },
    { label: 'Take cash from the safe', disabled: !(saveData.stash[P.id] > 0), action: () => { player.cash += saveData.stash[P.id]; saveData.stash[P.id] = 0; saveGame(true); } },
    { label: 'Store my weapons in the locker', disabled: !Object.keys(player.weapons).length, action: () => { saveData.locker = Object.assign(saveData.locker || {}, player.weapons); player.weapons = {}; equip('fists'); saveGame(true); } },
    { label: 'Take weapons from the locker', disabled: !Object.keys(saveData.locker || {}).length, action: () => { for (const k in saveData.locker) { if (!player.weapons[k]) player.weapons[k] = { clip: 0, ammo: 0 }; player.weapons[k].ammo += saveData.locker[k].ammo + saveData.locker[k].clip; } saveData.locker = {}; cycleWeapon(1); saveGame(true); } },
    { label: 'Set as my spawn point', action: () => { saveData.home = P.id; saveGame(true); toast('Spawn point set'); } },
    { label: 'Close', action: () => 'close' }]);
}
function sprayShop(v) {
  const cost = 500 + Math.round((1 - v.health / v.spec.hp) * 1500);
  if (!spend(cost)) { toast(`Repairs cost ${money(cost)}. You can't afford it.`); return; }
  v.health = v.spec.hp; v.fuel = Math.max(v.fuel, 0.3);
  if (!Police.flashing || Police.level === 0) { if (Police.level > 0) { Police.set(0); toast('New paint job. The cops lost you.'); } }
  else toast('Repaired. The cops saw you drive in.');
  const c = pick(v.spec.kind === 'car' ? CAR_COLS.concat(SUPER_COLS) : [0xffffff]); v.color = c;
  if (v.kind === 'car') { const g = carBody(v.type, c); v.body.geometry = g.body; }
  fadeFlash(); Sound.cash();
}
