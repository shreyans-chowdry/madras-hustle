// ===================== MISSIONS =====================
let mission = null;
const MISSIONS = [];
const nearestSvc = (type, x = player.x, z = player.z) => { let b = null, bd = 1e18; for (const s of services) if (s.type === type) { const d = dist2(s.x, s.z, x, z); if (d < bd) { bd = d; b = s; } } return b; };
const svcPos = s => s ? [s.x, s.z] : [player.x, player.z];
const vehOK = (need, M) => { const v = player.veh; if (!need) return true; if (!v) return false; if (need === 'any') return true; if (need === 'target') return v === M.target; if (need === 'car') return v.kind === 'car' && !v.spec.bike && v.type !== 'auto'; return v.kind === need || v.type === need; };
function tallestTower() { let b = -1; for (const i of tallTowers) if (b < 0 || bPolys[i].h > bPolys[b].h) b = i; return b >= 0 ? bPolys[b] : null; }
function mainRunway() { return AIR.runways.slice().sort((a, b) => b.len - a.len)[0]; }
function seaPointNear(x, z, minOff = 400) { for (let r = minOff; r < 3000; r += 100) for (let a = 0; a < TAU; a += 0.4) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (inWater(px, pz) && waterIsSea(px, pz)) return [px, pz]; } return [BX1 + 300, z]; }
function waterIsSea(x, z) { const a = waterGrid.get(gkey(Math.floor(x / WC), Math.floor(z / WC))); if (!a) return x > BX1 - 100; return a.some(i => waterPolys[i].sea && pointInPoly(x, z, waterPolys[i].pts)); }
function randomRoadPoint(cx, cz, rmin, rmax) { const c = edgesNear(cx, cz, rmin, rmax); for (let t = 0; t < 30; t++) { const E = G.edges[pick(c)]; if (!E || E.elev || E.len < 20) continue; const p = edgePoint(E, E.len / 2, 1, {}); return { x: p.x, z: p.z, h: headingTo(p.tx, p.tz), ei: E.i }; } return { x: cx, z: cz, h: 0 }; }

const STEP = {
  phone: { start(st) { phone(st.from, st.msg, st.dur || 9); return true; } },
  give: { start(st) { if (st.cash) addCash(st.cash); if (st.weapon) { giveWeapon(st.weapon, st.ammo || WEAPONS[st.weapon].mag * 3); equip(st.weapon); toast(WEAPONS[st.weapon].name + ' added'); } return true; } },
  wanted: { start(st) { Police.set(st.level); return true; } },
  spawn: {
    start(st, M) {
      const at = st.at(M); const v = new Vehicle(st.type, st.color, at.x, at.z, at.h || 0); v.persist = true; v.mission = true; v.y = at.y || 0;
      if (st.ai) { const r = roadQuery(at.x, at.z, 40); if (r.seg) { const ag = new Driver(v, r.seg.e.i, 1, 1); v.agent = ag; v.driver = 'ai'; ag.reattach(); } }
      if (st.ship) { v.shipDir = at.h; v.driver = 'ai'; ships.push(v); }
      traffic.push(v); M[st.as || 'target'] = v; return true;
    }
  },
  enter: { text: st => st.text, update(st, M) { return vehOK(st.need, M); }, target(st, M) { return st.need === 'target' && M.target ? [M.target.x, M.target.z] : null; } },
  goto: {
    text: (st, M) => !vehOK(st.need, M) ? (st.need === 'target' ? 'Get back in the <b>' + (M.target ? M.target.spec.name.toLowerCase() : 'vehicle') + '</b>' : 'Get a vehicle') : st.text,
    update(st, M) { const t = st._t || (st._t = st.to(M)); placeMarker(objMarker, t[0], t[1], st.r || 6, 24, t[2] || 0); if (!vehOK(st.need, M)) return false; const d = Math.hypot(player.x - t[0], player.z - t[1]); return d < (st.r || 6) && (!st.stop || !player.veh || player.veh.speed < 2.5); },
    target(st, M) { return st._t || (st._t = st.to(M)); },
  },
  land: {
    text: st => st.text,
    update(st, M) { const t = st._t || (st._t = st.to(M)); placeMarker(objMarker, t[0], t[1], st.r || 8, 30, t[2] || 0); const v = player.veh; if (!v || v.kind !== 'heli') return false; return Math.hypot(v.x - t[0], v.z - t[1]) < (st.r || 8) && v.speed < 3 && Math.abs(v.vy) < 1 && v.y > (t[2] || 0) - 3 && v.y <= groundHeightAt(v.x, v.z, v.y + 1) + 0.2; },
    target(st, M) { return st._t || (st._t = st.to(M)); },
  },
  buyGun: { text: st => st.text, update() { return Object.keys(player.weapons).length > 0; }, target(st) { return st._t || (st._t = svcPos(nearestSvc('gun'))); } },
  rob: {
    start(st, M) { st._robbed = false; st._svc = null; M.robbed = M.robbed || []; return false; },
    text: (st, M) => st._robbed ? 'Get out of the store' : (robbery && robbery.done && player.interior && M.robbed.includes(player.interior.svc)) ? 'You already hit this one. Find <b>another store</b>' : st.text,
    update(st, M) {
      if (robbery && robbery.done && player.interior && !M.robbed.includes(player.interior.svc)) { st._robbed = true; st._svc = player.interior.svc; }
      if (st._robbed && !player.interior) { M.robbed.push(st._svc); return true; }
      return false;
    },
    target(st, M) { if (player.interior) return null; let b = null, bd = 1e18; for (const q of services) if (q.type === st.svc && !(M.robbed || []).includes(q)) { const d = dist2(q.x, q.z, player.x, player.z); if (d < bd) { bd = d; b = q; } } return svcPos(b); },
  },
  lose: { text: () => 'Lose the cops', update() { return Police.level === 0; } },
  hold: {
    start(st, M) { st._left = st.secs; return false; },
    text: (st) => player.interior && player.interior.type === st.inside ? `Crack the vault · <b>${Math.ceil(st._left)}s</b> · hold your ground` : st.text,
    update(st, M, dt) {
      if (!player.interior || player.interior.type !== st.inside) return false;
      const I = INT[st.inside], sp = I.spots[st.spot]; const d = Math.hypot(player.x - (I.x + sp[0]), player.z - (I.z + sp[1]));
      if (!st._alarm) { st._alarm = true; Police.set(st.wanted || 3); toast('Alarm! Hold the vault while the drill runs.'); spawnRaiders(st); }
      if (d < 3) st._left -= dt; return st._left <= 0;
    },
    target(st) { return player.interior ? null : st._t || (st._t = svcPos(nearestSvc(st.inside))); },
  },
  destroy: {
    start(st, M) { M.targets = []; for (let i = 0; i < st.n; i++) { const p = randomRoadPoint(player.x, player.z, 300, 1600); const v = new Vehicle(st.type, undefined, p.x, p.z, p.h); v.persist = true; v.mission = true; const ag = new Driver(v, p.ei, 1, 1); v.agent = ag; v.driver = 'ai'; ag.reattach(); traffic.push(v); M.targets.push(v); } return false; },
    text: (st, M) => `Destroy the <b>${st.label}</b> · ${M.targets.filter(v => v.wreck || v.dead).length}/${st.n}`,
    update(st, M) { M.extraBlips = M.targets.filter(v => !v.wreck && !v.dead).map(v => ({ x: v.x, z: v.z, col: '#ff3030', r: 6, edge: true })); return M.targets.every(v => v.wreck || v.dead); },
  },
  rings: {
    start(st, M) { st._pts = st.pts(M); st._i = 0; return false; },
    text: (st, M) => vehOK('plane', M) || vehOK('heli', M) ? `${st.text} · ring ${st._i + 1}/${st._pts.length}` : 'Get back in the aircraft',
    update(st, M) {
      const p = st._pts[st._i]; ringMesh.visible = true; ringMesh.position.set(p[0], p[1], p[2]);
      const n = st._pts[st._i + 1] || st._pts[st._i]; ringMesh.lookAt(n[0], n[1], n[2]); if (st._i === st._pts.length - 1) ringMesh.rotation.y += 0;
      const v = player.veh; if (v && Math.hypot(v.x - p[0], v.y - p[1], v.z - p[2]) < 15) { st._i++; Sound.tone(980, 0.12, 'square', 0.08); if (M.timer !== null) M.timer += 6; }
      if (st._i >= st._pts.length) { ringMesh.visible = false; return true; } return false;
    },
    target(st) { const p = st._pts[st._i]; return p ? [p[0], p[2]] : null; },
  },
  stayNear: {
    start(st) { st._acc = 0; return false; },
    text: (st, M) => `${st.text} · <b>${Math.floor(st._acc)}/${st.secs}s</b>`,
    update(st, M, dt) { const T = st.get(M); if (!T) return false; M.extraBlips = [{ x: T.x, z: T.z, col: '#ff3030', r: 7, edge: true }]; if (Math.hypot(player.x - T.x, player.z - T.z) < st.dist && player.veh) st._acc += dt; return st._acc >= st.secs; },
    target(st, M) { const T = st.get(M); return T ? [T.x, T.z] : null; },
  },
  collect: {
    start(st, M) { st._pts = st.pts(M); st._m = st._pts.map(p => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.4), PICK_MAT.ammo); m.position.set(p[0], 0.4, p[1]); scene.add(m); return m; }); st._got = 0; return false; },
    text: (st, M) => !vehOK(st.need, M) ? 'Get back on the boat' : `${st.text} · ${st._got}/${st._pts.length}`,
    update(st, M) {
      M.extraBlips = st._pts.map((p, i) => st._m[i].visible ? { x: p[0], z: p[1], col: '#37d6ff', r: 6, edge: true } : null).filter(Boolean);
      st._m.forEach((m, i) => { if (!m.visible) return; m.rotation.y += 0.03; m.position.y = 0.4 + Math.sin(performance.now() / 300 + i) * 0.15; if (Math.hypot(player.x - m.position.x, player.z - m.position.z) < 7 && vehOK(st.need, M)) { m.visible = false; st._got++; Sound.pickup(); } });
      if (st._got >= st._pts.length) { st._m.forEach(m => scene.remove(m)); return true; } return false;
    },
    cleanup(st) { if (st._m) st._m.forEach(m => scene.remove(m)); },
  },
  keepSpeed: {
    start(st) { st._left = st.secs; st._armed = false; return false; },
    text: (st, M) => !st._armed ? `Get the <b>bus</b> above <b>${st.kmh} km/h</b> to arm the bomb` : `Keep it above <b>${st.kmh} km/h</b> · <b>${Math.ceil(st._left)}s</b> left`,
    update(st, M, dt) {
      const v = player.veh;
      if (v !== M.target) { if (st._armed) { explosion(M.target.x, M.target.y + 1, M.target.z, 2.5); failMission('You left the bus. Boom.'); } return false; }
      const kmh = v.speed * 3.6;
      if (!st._armed) { if (kmh > st.kmh) { st._armed = true; toast('Bomb armed! Do not slow down.'); rumble(0.6, 0.6, 300); } return false; }
      if (kmh < st.kmh) { st._slow = (st._slow || 0) + dt; if (st._slow > 1.2) { explosion(v.x, v.y + 1, v.z, 2.5); failMission('The bus slowed down. Boom.'); return false; } } else st._slow = 0;
      st._left -= dt; return st._left <= 0;
    },
  },
  runwayRace: {
    start(st, M) {
      const rw = mainRunway(); const a = edgePoint(rw.E, 60, 1, {}); const b = edgePoint(rw.E, rw.len - 80, 1, {});
      const v = new Vehicle('airliner', 0xc8251c, a.x - a.tz * 0, a.z, headingTo(a.tx, a.tz)); v.driver = 'ai'; v.persist = true; v.flight = { dep: true, rw, tx: a.tx, tz: a.tz, phase: 'roll', t: 0 }; traffic.push(v); flights.push(v); M.rival = v;
      st._end = [b.x, b.z]; return false;
    },
    text: () => 'Beat the plane to the <b>end of the runway</b>!',
    update(st, M) { placeMarker(objMarker, st._end[0], st._end[1], 18, 30); if (M.rival && (M.rival.y > 12 || M.rival.dead)) { failMission('The plane took off first.'); return false; } return player.veh && Math.hypot(player.x - st._end[0], player.z - st._end[1]) < 22; },
    target(st) { return st._end; },
  },
};
function spawnRaiders(st) {
  // SWAT burst into the bank
  const I = INT[st.inside];
  for (let k = 0; k < 3; k++) { setTimeout(() => { if (!player.interior) return; const w = new Walker(SWAT_LOOK, I.spawn[0] + (k - 1) * 2, I.spawn[1] - 1); w.state = 'cop'; w.cop = true; w.special = true; w.health = 150; w.arm('rifle'); Police.copPeds.push(w); }, 6000 + k * 4000); }
}
function defineMissions() {
  const home = homeProp(); const hd = home ? home.door : { x: 0, z: 0 };
  const near = (x, z, d) => { const s = roadSpot(x + d, z + d * 0.5, 1); return [s.x, s.z]; };
  const hangar = nearestSvc('hangar'), marina = nearestSvc('marina', ...ll(13.048, 80.284)), rw = mainRunway();
  const nungam = ll(13.0605, 80.2425);
  MISSIONS.push({
    id: 'm1', title: 'Welcome to Madras', who: 'Vik', at: near(hd.x, hd.z, 35), unlock: () => true, reward: 2000,
    steps: [
      { t: 'phone', from: 'Vik', msg: "Good, you made it. First rule of this city: never walk around unarmed. Here's some cash. Grab any car and get yourself a pistol at the Ammo Depot." },
      { t: 'give', cash: 1500 },
      { t: 'enter', need: 'car', text: 'Get a <b>car</b>. Any car. Press ' + 'F next to one to take it' },
      { t: 'buyGun', text: 'Drive to the <b>Ammo Depot</b> and buy a pistol' },
      { t: 'phone', from: 'Vik', msg: "Nice. Now go home and stash some of that cash in your safe. Money in your pocket is gone the moment you get wasted." },
      { t: 'goto', to: () => [homeProp().door.x, homeProp().door.z], r: 3, text: 'Go back to your <b>safehouse</b>' },
    ]
  });
  MISSIONS.push({
    id: 'm2', title: 'Smash & Grab', who: 'Vik', at: near(hd.x, hd.z, 35), unlock: d => d.includes('m1'), reward: 4000,
    steps: [
      { t: 'phone', from: 'Vik', msg: 'There is a jewellery store that owes me. Walk in, point your gun at the clerk and keep it there until the bag is full. Then lose the cops.' },
      { t: 'rob', svc: 'jewel', text: 'Rob the <b>jewellery store</b>' },
      { t: 'lose' },
    ]
  });
  MISSIONS.push({
    id: 'm3', title: 'Runway Rush', who: 'Dutch', at: hangar ? [hangar.x + 8, hangar.z] : near(hd.x, hd.z, 60), unlock: d => d.includes('m1'), reward: 9000,
    steps: [
      { t: 'phone', from: 'Dutch', msg: "I bet a pilot friend you could beat his jet down the runway. There's a supercar waiting for you. Don't make me lose money." },
      { t: 'spawn', type: 'super', color: 0xff6a00, at: () => { const s = roadSpot(player.x, player.z, 1, true); return { x: s.x, z: s.z, h: s.h }; } },
      { t: 'enter', need: 'target', text: 'Get in the <b>supercar</b>' },
      { t: 'goto', need: 'target', to: () => { const a = edgePoint(rw.E, 40, 1, {}); return [a.x + a.tz * 30, a.z - a.tx * 30]; }, r: 14, text: 'Drive onto the <b>runway</b>', timer: 240 },
      { t: 'runwayRace', keepTimer: false },
    ]
  });
  MISSIONS.push({
    id: 'm4', title: 'Chopper Drop', who: 'Dutch', at: hangar ? [hangar.x + 8, hangar.z + 6] : near(hd.x, hd.z, 60), unlock: d => d.includes('m3'), reward: 16000,
    steps: [
      { t: 'phone', from: 'Dutch', msg: 'A briefcase is waiting on top of the tallest tower in the city. Take my chopper, land on the roof, then drop the case on the cargo ship out at sea.' },
      { t: 'spawn', type: 'heli', color: 0x111111, at: () => { const s = nearestSvc('hangar'); return { x: s.apron[0], z: s.apron[1], h: 0 }; } },
      { t: 'enter', need: 'target', text: 'Get in the <b>helicopter</b>' },
      { t: 'land', to: () => { const b = tallestTower(); return [b.cx, b.cz, b.h]; }, r: 10, text: 'Land on the <b>tallest tower</b>' },
      { t: 'phone', from: 'Dutch', msg: 'Got the case. Now find the cargo ship. Land on the containers, gently.' },
      { t: 'spawn', type: 'cargo', as: 'ship', ship: true, at: () => { const [x, z] = seaPointNear(player.x, player.z, 900); return { x: Math.max(x, BX1 - 200), z, h: 0 }; } },
      { t: 'land', to: M => [M.ship.x, M.ship.z, 9], r: 25, text: 'Land on the <b>cargo ship</b>' },
    ]
  });
  MISSIONS.push({
    id: 'm5', title: 'Train Job', who: 'Maya', at: (() => { const s = roadSpot(nungam[0], nungam[1], 1); return [s.x, s.z]; })(), unlock: d => d.includes('m2'), reward: 22000,
    steps: [
      { t: 'phone', from: 'Maya', msg: "I need to clone a transponder on the express train. Get close and stay close while my laptop does its thing. Fifteen seconds. Easy, right?" },
      { t: 'enter', need: 'any', text: 'Get a <b>vehicle</b>. Something fast.' },
      { t: 'stayNear', get: () => { let b = null, bd = 1e18; for (const T of trains) { const d = dist2(T.x, T.z, player.x, player.z); if (d < bd) { bd = d; b = T; } } return b; }, dist: 25, secs: 15, text: 'Stay close to the <b>train</b>', timer: 300 },
      { t: 'wanted', level: 3 },
      { t: 'phone', from: 'Maya', msg: 'Got it! Railway police are onto you. Lose them.' },
      { t: 'lose' },
    ]
  });
  MISSIONS.push({
    id: 'm6', title: 'Harbour Run', who: 'Reyes', at: marina ? [marina.x, marina.z] : near(hd.x, hd.z, 80), unlock: d => d.includes('m5'), reward: 14000,
    steps: [
      { t: 'phone', from: 'Reyes', msg: 'Five crates fell off a boat. Funny how that happens. Take my speedboat, scoop them up, and bring them to the port before the coast guard does.' },
      { t: 'spawn', type: 'speedboat', color: 0xc8251c, at: () => { const s = nearestSvc('marina'); return { x: s.water[0], z: s.water[1], h: headingTo(s.water[0] - s.x, s.water[1] - s.z) }; } },
      { t: 'enter', need: 'target', text: 'Get in the <b>speedboat</b>' },
      { t: 'collect', need: 'boat', pts: () => { const out = []; for (let i = 0; i < 5; i++) out.push(seaPointNear(player.x + (Math.random() - 0.5) * 1600, player.z + (Math.random() - 0.5) * 2400, 250)); return out; }, text: 'Collect the <b>crates</b>', timer: 300 },
      { t: 'goto', need: 'boat', to: () => { const p = G.pois.find(q => q.t === 'port'); const [x, z] = p ? [p.x, p.z] : ll(13.095, 80.29); const w = findShoreWater(x, z); return w ? w.water : [x + 300, z]; }, r: 30, text: 'Bring the crates to the <b>port</b>', timer: 240 },
    ]
  });
  MISSIONS.push({
    id: 'm7', title: 'Demolition Day', who: 'Reyes', at: marina ? [marina.x + 6, marina.z] : near(hd.x, hd.z, 80), unlock: d => d.includes('m5'), reward: 26000,
    steps: [
      { t: 'phone', from: 'Reyes', msg: 'Five armored vans carry evidence against a friend of mine. Here is a rocket launcher. I want them gone in four minutes.' },
      { t: 'give', weapon: 'rpg', ammo: 12 },
      { t: 'destroy', type: 'van', n: 5, label: 'armored vans', timer: 240 },
      { t: 'lose' },
    ]
  });
  MISSIONS.push({
    id: 'm8', title: 'Flight School', who: 'Dutch', at: hangar ? [hangar.x + 14, hangar.z] : near(hd.x, hd.z, 60), unlock: d => d.includes('m4'), reward: 18000,
    steps: [
      { t: 'phone', from: 'Dutch', msg: "Ready for your pilot's licence? Take the prop plane, fly through every ring, then land it back on the runway. In one piece." },
      { t: 'spawn', type: 'plane', color: 0x1f4fa8, at: () => { const a = edgePoint(rw.E, rw.len * 0.1, 1, {}); return { x: a.x, z: a.z, h: headingTo(a.tx, a.tz) }; } },
      { t: 'enter', need: 'target', text: 'Get in the <b>plane</b>' },
      { t: 'rings', pts: () => { const pts = []; const m = ll(13.06, 80.27), a = ll(13.04, 80.24), b = ll(13.08, 80.25), c = ll(13.0, 80.265), e = edgePoint(rw.E, rw.len * 0.6, 1, {});
        const way = [[e.x + e.tx * 600, 80, e.z + e.tz * 600], [c[0], 140, c[1]], [m[0] + 400, 90, m[1]], [m[0] + 600, 60, m[1] - 800], [b[0], 160, b[1]], [a[0], 120, a[1]], [a[0] - 1500, 100, a[1] + 1500], [e.x - e.tx * 1500, 70, e.z - e.tz * 1500]]; return way; }, text: 'Fly through the <b>rings</b>', timer: 420 },
      { t: 'goto', need: 'plane', stop: true, to: () => { const a = edgePoint(rw.E, rw.len * 0.5, 1, {}); return [a.x, a.z]; }, r: rw.len * 0.45, text: 'Land on the <b>runway</b> and stop' },
    ]
  });
  MISSIONS.push({
    id: 'm9', title: 'The Big Score', who: 'Maya', at: (() => { const s = roadSpot(nungam[0] + 40, nungam[1], 1); return [s.x, s.z]; })(), unlock: d => ['m6', 'm7', 'm8'].every(k => d.includes(k)), reward: 150000,
    steps: [
      { t: 'phone', from: 'Maya', msg: "This is it. The bank's vault. You hold it while my drill does the work, then get out and lose every cop in Madras. Take this rifle." },
      { t: 'give', weapon: 'rifle', ammo: 240 },
      { t: 'hold', inside: 'bank', spot: 'vault', secs: 30, wanted: 4, text: 'Go to the <b>bank</b> and get into the vault' },
      { t: 'goto', to: () => svcPos(nearestSvc('bank')), r: 1e9, text: 'Get out of the bank', check: () => !player.interior },
      { t: 'phone', from: 'Maya', msg: "We're rich! Now disappear. A Pit Stop respray would help." },
      { t: 'lose' },
    ]
  });
  MISSIONS.push({
    id: 'm10', title: 'Speed Bump', who: 'Vik', at: near(hd.x, hd.z, -40), unlock: d => d.includes('m2'), reward: 12000,
    steps: [
      { t: 'phone', from: 'Vik', msg: "Someone wired a bomb to a city bus to send me a message. It arms above 50 and blows if it drops under. Drive it for two minutes until my guy can disarm it. Don't stop." },
      { t: 'spawn', type: 'bus', color: 0xd23b2a, at: () => { const s = roadSpot(player.x, player.z, 1, true); return { x: s.x, z: s.z, h: s.h }; } },
      { t: 'enter', need: 'target', text: 'Get in the <b>bus</b>' },
      { t: 'keepSpeed', kmh: 50, secs: 120 },
      { t: 'phone', from: 'Vik', msg: 'Disarmed. You can breathe now. Park it anywhere.' },
    ]
  });
  MISSIONS.push({
    id: 'm11', title: 'Jet Set', who: 'Dutch', at: hangar ? [hangar.x + 20, hangar.z] : near(hd.x, hd.z, 60), unlock: d => d.includes('m8'), reward: 60000,
    steps: [
      { t: 'phone', from: 'Dutch', msg: 'A billionaire left his private jet on the runway with the engines warm. Take it, get every cop in the city on your tail, then lose them over the sea at low altitude.' },
      { t: 'spawn', type: 'jet', color: 0xf0f0f0, at: () => { const a = edgePoint(rw.E, rw.len * 0.15, 1, {}); return { x: a.x, z: a.z, h: headingTo(a.tx, a.tz) }; } },
      { t: 'enter', need: 'target', text: 'Steal the <b>private jet</b>' },
      { t: 'wanted', level: 5 },
      { t: 'rings', pts: () => { const e = edgePoint(rw.E, rw.len * 0.9, 1, {}); const [sx, sz] = seaPointNear(e.x, e.z, 2500); return [[e.x + e.tx * 900, 120, e.z + e.tz * 900], [(e.x + sx) / 2, 90, (e.z + sz) / 2], [sx, 40, sz], [sx + 1500, 25, sz + 600]]; }, text: 'Fly low over the <b>sea</b>', timer: 240 },
      { t: 'lose' },
    ]
  });
  MISSIONS.push({
    id: 'm12', title: 'Gold Rush', who: 'Maya', at: (() => { const s = roadSpot(nungam[0] - 40, nungam[1], 1); return [s.x, s.z]; })(), unlock: d => d.includes('m5'), reward: 30000,
    steps: [
      { t: 'phone', from: 'Maya', msg: "Three jewellery stores, one afternoon. Hit them back to back. Don't bother losing the cops in between, there is no time." },
      { t: 'rob', svc: 'jewel', text: 'Rob the first <b>jewellery store</b>', timer: 360 },
      { t: 'rob', svc: 'jewel', far: true, text: 'Rob a second <b>jewellery store</b>', keepTimer: true },
      { t: 'rob', svc: 'jewel', far: true, text: 'Rob a third <b>jewellery store</b>', keepTimer: true },
      { t: 'lose' },
    ]
  });
  for (const m of MISSIONS) { m.marker = makeMarker(); m.label = labelSprite(m.title.toUpperCase(), m.who); m.label.visible = false; const f = freeSpot(m.at[0], m.at[1]); m.pos = f; }
}
function startMission(m) {
  mission = { def: m, si: -1, timer: null, target: null, targets: [], extraBlips: null };
  banner(m.title.toUpperCase(), 'Mission from ' + m.who, false, 2.6); Sound.pass();
  if (rideJob.active) endRideJob();
  nextStep();
}
function nextStep() {
  const M_ = mission; if (!M_) return;
  const prev = M_.def.steps[M_.si]; if (prev && STEP[prev.t] && STEP[prev.t].cleanup) STEP[prev.t].cleanup(prev);
  M_.si++; M_.extraBlips = null; objMarker.visible = false; ringMesh.visible = false;
  if (M_.si >= M_.def.steps.length) return passMission();
  const st = M_.def.steps[M_.si]; st._t = null;
  if (st.timer) M_.timer = st.timer; else if (!st.keepTimer && !['phone', 'give', 'wanted', 'spawn'].includes(st.t)) M_.timer = null;
  const h = STEP[st.t]; const done = h.start ? h.start(st, M_) : false;
  if (done) nextStep();
}
function stepTarget() { if (!mission) return null; const st = mission.def.steps[mission.si]; if (!st) return null; const h = STEP[st.t]; return h && h.target ? h.target(st, mission) : null; }
function updateMission(dt) {
  if (!mission) {
    objMarker.visible = false; nextMarker.visible = false;
    let near = null;
    for (const m of MISSIONS) {
      m.avail = m.unlock(saveData.done) && !saveData.done.includes(m.id);
      m.marker.visible = m.avail && !rideJob.active && !player.interior; m.label.visible = m.marker.visible && dist2(m.pos[0], m.pos[1], player.x, player.z) < 300 * 300;
      if (!m.marker.visible) continue;
      placeMarker(m.marker, m.pos[0], m.pos[1], 2.2, 30);
      m.label.position.set(m.pos[0], 7 + Math.sin(performance.now() / 500) * 0.3, m.pos[1]);
      if (Math.hypot(player.x - m.pos[0], player.z - m.pos[1]) < 3.5 && !player.dead && !player.veh) near = m;
    }
    if (near) { prompt(`${key('E', '→')} Start <b>${near.title}</b>`); if (In.act('interact')) startMission(near); }
    return;
  }
  MISSIONS.forEach(m => { m.marker.visible = false; m.label.visible = false; });
  const M_ = mission, st = M_.def.steps[M_.si]; if (!st) return;
  if (M_.timer !== null) { M_.timer -= dt; if (M_.timer <= 0) return failMission('Out of time.'); }
  if (M_.target && (M_.target.wreck || M_.target.dead) && !['destroy'].includes(st.t) && M_.si < M_.def.steps.length && ['enter', 'goto', 'land', 'runwayRace', 'collect', 'rings'].includes(st.t) && st.need !== 'any') return failMission('The ' + M_.target.spec.name.toLowerCase() + ' was destroyed.');
  const h = STEP[st.t];
  objMarker.visible = false;
  let done = h.update ? h.update(st, M_, dt) : true;
  if (st.check) done = st.check();
  if (mission !== M_) return;
  setObjective(h.text ? h.text(st, M_) : (st.text || ''));
  if (done) nextStep();
}
function passMission() {
  const m = mission.def;
  for (const v of [mission.target, mission.ship, mission.rival, ...(mission.targets || [])]) if (v && !v.dead) { v.mission = false; if (v !== player.veh) v.persist = false; }
  payBank(m.reward); Sound.pass(); rumble(0.4, 0.6, 400);
  banner('MISSION PASSED', '+' + money(m.reward) + ' to your bank', false, 4.5);
  if (!saveData.done.includes(m.id)) saveData.done.push(m.id);
  const unlocked = MISSIONS.filter(x => !saveData.done.includes(x.id) && x.unlock(saveData.done) && !x._announced);
  unlocked.forEach((x, i) => { x._announced = true; setTimeout(() => phone(x.who, `I have a job for you: "${x.title}". Find my marker on the map.`, 8), 5000 + i * 9000); });
  if (m.id === 'm9') setTimeout(() => banner('MADRAS IS YOURS', 'Keep exploring: buy property, collect packages, rob stores', false, 6), 5000);
  mission = null; objMarker.visible = false; nextMarker.visible = false; ringMesh.visible = false; setObjective(''); hud.timer.hidden = true;
  saveGame(true);
}
function failMission(reason, silent = false) {
  if (!mission) return;
  const st = mission.def.steps[mission.si]; if (st && STEP[st.t] && STEP[st.t].cleanup) STEP[st.t].cleanup(st);
  for (const v of [mission.target, mission.ship, mission.rival, ...(mission.targets || [])]) if (v && !v.dead) { v.mission = false; if (v !== player.veh) { v.persist = false; } }
  if (!silent) { banner('MISSION FAILED', reason, true, 3.5); Sound.fail(); }
  mission = null; objMarker.visible = false; nextMarker.visible = false; ringMesh.visible = false; setObjective(''); hud.timer.hidden = true;
}
function onVehicleDestroyed(v) { }
function onPedKilled(w) { saveData.stats.kills = (saveData.stats.kills || 0) + 1; }
