// End-to-end scenario: plays every new loop through real input where practical and checks the outcome.
// Each check is independent; the run reports passed / failed lists and saves screenshots to tools/e2e/out/.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out'); fs.mkdirSync(OUT, { recursive: true });

export default async function (page) {
  const passed = [], failed = [], notes = {};
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wait = ms => page.waitForTimeout(ms);
  const until = (fn, ms = 20000, arg) => page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
  const tap = async (k, hold = 60) => { await page.keyboard.down(k); await wait(hold); await page.keyboard.up(k); await wait(80); };
  // full-page capture (DOM HUD + menus over a freshly rendered frame)
  const pshot = async name => { await ev(() => { window.__norender = false; }); await wait(700); await page.screenshot({ path: path.join(OUT, name + '.png') }); await ev(() => { window.__norender = true; }); };
  const shot = async name => { const url = await ev(() => window.__mh.snap()); fs.writeFileSync(path.join(OUT, name + '.jpg'), Buffer.from(url.split(',')[1], 'base64')); };
  async function check(name, fn) { try { const r = await fn(); passed.push(name); if (r !== undefined) notes[name] = r; } catch (e) { failed.push(name + ': ' + (e.message || e).split('\n')[0]); } }
  // walk the player to an interior spot (relative to the interior origin) and press a key
  const goSpot = (type, sx, sz) => ev(([t, x, z]) => { const M = window.__mh, I = M.INT[t]; M.player.x = I.x + x; M.player.z = I.z + z; }, [type, sx, sz]);
  const reset = () => ev(() => {
    const M = window.__mh; if (M.Dialogue.open) M.Dialogue.end(); if (M.UI.brief) M.UI.closeBriefing(false);
    if (M.Metro.ride) { M.Metro.ride = null; M.player.onTrain = null; } if (M.Airport.ride) { M.Airport.ride = null; M.player.passenger = null; }
    if (M.player.interior) M.exitInterior(); if (M.player.veh) M.exitVehicle(); M.player.dead = false; M.player.health = 100; M.Police.set(0);
    if (M.mission) M.failMission('test reset', true);
  });

  await ev(() => document.getElementById('startBtn').click());
  await until(() => !document.getElementById('hud').hidden);

  await check('boot: HUD + main menu replaced', () => ev(() => { if (document.getElementById('title').hidden !== true) throw new Error('title still visible'); return { stats: window.__mh.WorldFix.stats }; }));
  await check('world: assets loaded from Blender GLBs', () => ev(() => { const n = Object.keys(window.__mh.Assets.gltf).length; if (n < 8) throw new Error('only ' + n + ' models'); return n; }));

  // ---------------- cheats via the console UI (real keystrokes) ----------------
  await check('cheat console: GIVECASH via typed console', async () => {
    const c0 = await ev(() => window.__mh.player.cash);
    await tap('Backquote'); await until(() => !document.getElementById('console').hidden, 3000);
    await page.keyboard.type('GIVECASH 4321'); await page.keyboard.press('Enter'); await wait(200);
    await page.keyboard.press('Escape'); await wait(200);
    const c1 = await ev(() => window.__mh.player.cash); if (c1 - c0 !== 4321) throw new Error(`cash ${c0} -> ${c1}`); return c1;
  });
  await check('cheat: HEALME / SETWEATHER / SPAWNCAR / unknown', () => ev(() => {
    const M = window.__mh; M.player.health = 20; M.Cheats.run('HEALME'); if (M.player.health !== 100) throw new Error('heal');
    M.Cheats.run('SETWEATHER rain'); if (M.Weather.target !== 'rain') throw new Error('weather');
    const n = M.vehicles.length; M.Cheats.run('SPAWNCAR super'); if (M.vehicles.length !== n + 1) throw new Error('spawn');
    if (!/Unknown/.test(M.Cheats.run('NOPE'))) throw new Error('unknown accepted');
    M.Cheats.run('SETWEATHER clear'); return M.saveData.stats.cheats;
  }));
  await check('cheat: typed GTA-style code (CLEARWANTED)', async () => { await ev(() => window.__mh.Police.set(2)); await page.keyboard.type('CLEARWANTED', { delay: 20 }); await wait(300); const l = await ev(() => window.__mh.Police.level); if (l !== 0) throw new Error('level ' + l); });
  await check('save integrity: sanitised after cheats', () => ev(() => {
    const M = window.__mh; M.player.cash = NaN; M.saveData.rel = { amma: 9999 }; M.saveData.done = ['m1', 'm1'];
    document.getElementById('saveBtn').click(); const s = JSON.parse(localStorage.getItem('mh-save-v2'));
    if (!Number.isFinite(s.cash) || s.rel.amma !== 100 || s.done.length !== 1) throw new Error(JSON.stringify({ cash: s.cash, rel: s.rel, done: s.done }));
    M.player.cash = 5000; M.saveData.done = []; M.saveData.rel = {}; return 'ok';
  }));

  // ---------------- driving model: accelerate, gears, reverse, headlights, exit ----------------
  await check('vehicle: accelerate / gear / reverse / headlights / exit', async () => {
    await ev(() => { const M = window.__mh, b = M.bounds; M.drive('sedan', -2000, 3000, 0); });
    await page.keyboard.down('KeyW'); await wait(2500); await page.keyboard.up('KeyW');
    const fwd = await ev(() => ({ s: window.__mh.player.veh.speed, g: document.getElementById('gear').textContent }));
    if (fwd.s < 4 || !/[1-6]/.test(fwd.g)) throw new Error('forward ' + JSON.stringify(fwd));
    await page.keyboard.down('KeyS'); await wait(3500); await page.keyboard.up('KeyS');
    const rev = await ev(() => ({ f: window.__mh.player.veh.fwdSpeed, g: document.getElementById('gear').textContent }));
    if (rev.f > -0.5 || rev.g !== 'R') throw new Error('reverse ' + JSON.stringify(rev));
    await tap('KeyG'); const l1 = await ev(() => window.__mh.player.veh.lights); await tap('KeyG'); const l2 = await ev(() => window.__mh.player.veh.lights);
    if (l1 !== 'on' || l2 !== 'off') throw new Error('lights ' + l1 + l2);
    await page.keyboard.down('Space'); await wait(1500); await page.keyboard.up('Space');
    await tap('KeyF'); const out = await ev(() => window.__mh.player.veh); if (out) throw new Error('did not exit');
    return { fwd, rev };
  });

  // ---------------- airport: check-in, security, gate, pilot mode ----------------
  await check('airport: terminal check-in → security → gate → charter pilot', async () => {
    await reset();
    await ev(() => { const M = window.__mh, s = M.Airport.svc; M.player.x = s.x; M.player.z = s.z; });
    await ev(() => { const M = window.__mh; M.Airport.pass = null; M.Airport.cleared = false; M.giveWeapon('pistol', 30); });
    await ev(() => { const s = window.__mh.Airport.svc; window.__mh.enterInterior('terminal', s); });
    await shot('airport_terminal');
    const T = await ev(() => window.__mh.INT.terminal.spots);
    // security closed without a pass: walking north must be blocked
    await goSpot('terminal', 0, 1.0); await page.keyboard.down('KeyW'); await wait(900); await page.keyboard.up('KeyW');
    const blocked = await ev(() => window.__mh.player.z - window.__mh.INT.terminal.z); if (blocked < -0.2) throw new Error('walked through closed security ' + blocked);
    await goSpot('terminal', T.checkin[0], T.checkin[1]); await wait(250); await tap('KeyE');
    await until(() => !document.getElementById('menu').hidden, 3000);
    await tap('ArrowDown'); await tap('Enter'); await wait(200);
    const pass = await ev(() => window.__mh.Airport.pass); if (!pass || pass.mode !== 'charter') throw new Error('no charter pass');
    await goSpot('terminal', T.security[0], T.security[1]); await wait(250); await tap('KeyE');
    const sec = await ev(() => ({ c: window.__mh.Airport.cleared, held: !!window.__mh.Airport.held })); if (!sec.c || !sec.held) throw new Error('security ' + JSON.stringify(sec));
    await goSpot('terminal', 0, -3); await wait(150);
    await goSpot('terminal', T.gate[0], T.gate[1]); await wait(250); await tap('KeyE'); await wait(400);
    const pv = await ev(() => { const v = window.__mh.player.veh; return v && { type: v.type, model: !!v.model }; });
    if (!pv || pv.type !== 'plane') throw new Error('not in charter plane'); return pv;
  });
  await check('pilot mode: throttle, take-off, gear up, flight HUD', async () => {
    await page.keyboard.down('Space'); await wait(5500);
    await page.keyboard.down('KeyS'); await wait(3500); await page.keyboard.up('KeyS');
    await wait(2500); await page.keyboard.up('Space');
    const st = await ev(() => { const v = window.__mh.player.veh; return { y: v.y, kt: v.speed * 1.944, thr: v.thr, hud: !document.getElementById('flighthud').hidden }; });
    if (st.y < 15 || !st.hud) throw new Error('flight ' + JSON.stringify(st));
    await tap('KeyG'); const g = await ev(() => window.__mh.player.veh.gearDown); if (g !== false) throw new Error('gear still down');
    await pshot('hud_pilot_flight');
    return st;
  });

  // ---------------- airport: passenger scenic flight ----------------
  await check('passenger flight: board, skip ahead, land, deplane', async () => {
    await ev(() => { const M = window.__mh; if (M.player.veh) { const v = M.player.veh; M.exitVehicle(); v.remove(); } M.player.y = 0; M.enterInterior('terminal', M.Airport.svc); M.Airport.issue('scenic', 0); M.Airport.security(); M.Airport.board(); });
    const ok = await ev(() => !!window.__mh.player.passenger); if (!ok) throw new Error('not seated');
    await wait(1500); await shot('passenger_takeoff');
    await tap('KeyC'); await wait(400); await shot('passenger_cabin'); await tap('KeyC');
    await page.keyboard.down('KeyE'); await until(() => window.__mh.player.interior && window.__mh.player.interior.type === 'terminal' && !window.__mh.player.passenger, 150000); await page.keyboard.up('KeyE');
    return await ev(() => ({ weaponsBack: !!window.__mh.player.weapons.pistol }));
  });

  // ---------------- metro: entrance, token, turnstile, platform, ride, alight ----------------
  await check('metro: token → turnstile → platform → ride → alight', async () => {
    await reset();
    const info = await ev(() => { const M = window.__mh; const S = M.Metro.stations.find(s => s.svc && M.Metro.destinations(s).length); const d = M.Metro.destinations(S)[0]; M.player.x = S.svc.x; M.player.z = S.svc.z; M.Metro.gateOpen = false; M.Metro.token = null; M.enterInterior('metro', S.svc); return { from: S.name, to: d.D.name }; });
    const I = await ev(() => window.__mh.INT.metro.spots);
    await goSpot('metro', 0, 4.2); await page.keyboard.down('KeyW'); await wait(800); await page.keyboard.up('KeyW');
    const blocked = await ev(() => window.__mh.player.z - window.__mh.INT.metro.z); if (blocked < 2.4) throw new Error('turnstile let me through without a token');
    await goSpot('metro', I.machine[0], I.machine[1]); await wait(250); await tap('KeyE'); await until(() => !document.getElementById('menu').hidden, 3000); await tap('Enter'); await wait(200);
    const tk = await ev(() => window.__mh.Metro.token && window.__mh.Metro.token.D.name); if (!tk) throw new Error('no token');
    await goSpot('metro', I.gate[0], I.gate[1]); await wait(250); await tap('KeyE');
    if (!await ev(() => window.__mh.Metro.gateOpen)) throw new Error('gate closed');
    await goSpot('metro', 0, -8.5); await until(() => window.__mh.Metro.platform && window.__mh.Metro.platform.phase === 'doors', 30000);
    await ev(() => { const M = window.__mh; M.camera.position.set(M.INT.metro.x + 6, 2.2, M.INT.metro.z - 6); M.camera.lookAt(M.INT.metro.x, 1.5, M.INT.metro.z - 13); }); await shot('metro_platform');
    await wait(200); await tap('KeyF'); await wait(300);
    if (!await ev(() => !!window.__mh.Metro.ride)) throw new Error('did not board');
    await wait(1500); await shot('metro_ride'); await tap('KeyC'); await wait(300); await shot('metro_cabin'); await tap('KeyC');
    await page.keyboard.down('KeyE'); await until(() => !window.__mh.Metro.ride, 240000); await page.keyboard.up('KeyE');
    const where = await ev(() => ({ interior: window.__mh.player.interior && window.__mh.player.interior.type, station: window.__mh.player.interior && window.__mh.player.interior.svc.name }));
    if (where.interior !== 'metro') throw new Error('not in station ' + JSON.stringify(where));
    return Object.assign(info, { token: tk, alightedAt: where.station });
  });

  // ---------------- dialogue + relationships ----------------
  await check('dialogue: family home, Amma tree, relationship change', async () => {
    await reset();
    await ev(() => { const M = window.__mh, s = M.Living.family; M.player.x = s.x; M.player.z = s.z; M.enterInterior('family', s); });
    const A = await ev(() => window.__mh.INT.family.spots.amma);
    await goSpot('family', A[0], A[1] + 1.2); await wait(250); await tap('KeyE'); await until(() => window.__mh.Dialogue.open, 3000);
    await ev(() => { const M = window.__mh; M.camera.position.set(M.player.x + 1, 1.7, M.player.z + 2.5); M.camera.lookAt(M.player.x, 1.2, M.player.z - 1.5); });
    await pshot('dialogue_amma');
    const r0 = await ev(() => window.__mh.Dialogue.rel('amma'));
    await tap('Digit2'); await wait(150); await tap('Enter'); await wait(150);
    for (let i = 0; i < 5 && await ev(() => window.__mh.Dialogue.open); i++) { await tap('Enter'); await wait(120); }
    const r1 = await ev(() => window.__mh.Dialogue.rel('amma')); if (r1 <= r0) throw new Error(`rel ${r0} -> ${r1}`); return { r0, r1 };
  });

  // ---------------- UI panels ----------------
  await check('ui: settings + missions panels, sensitivity persists', async () => {
    await reset();
    await ev(() => { document.getElementById('titleSettingsBtn').click(); });
    await ev(() => { const r = document.getElementById('setSens'); r.value = 1.6; r.dispatchEvent(new Event('input')); document.getElementById('setInvert').click(); });
    await pshot('ui_settings');
    const st = await ev(() => JSON.parse(localStorage.getItem('mh-settings'))); if (st.sens !== 1.6 || st.invert !== true) throw new Error(JSON.stringify(st));
    await ev(() => { document.getElementById('setInvert').click(); document.getElementById('setClose').click(); document.getElementById('titleMissionsBtn').click(); });
    const n = await ev(() => document.querySelectorAll('#msList > div').length); await ev(() => document.getElementById('msClose').click());
    if (n < 15) throw new Error('missions listed ' + n); return n;
  });

  // ---------------- missions: briefing + 3 new missions end to end ----------------
  await check('mission m15 Family Favor (briefing → dialogue → timed delivery)', async () => {
    await reset();
    await ev(() => { const M = window.__mh, m = M.MISSIONS.find(x => x.id === 'm15'); M.player.x = m.pos[0]; M.player.z = m.pos[1]; M.startMission(m); });
    await until(() => !document.getElementById('briefing').hidden, 3000); await pshot('ui_briefing'); await tap('Enter');
    await until(() => window.__mh.mission && window.__mh.mission.def.id === 'm15', 3000);
    await ev(() => { const M = window.__mh; M.serviceInteract(M.Living.family); });
    const A = await ev(() => window.__mh.INT.family.spots.amma);
    await goSpot('family', A[0], A[1] + 1.2); await wait(300); await tap('KeyE'); await until(() => window.__mh.Dialogue.open, 3000);
    // pick the "any work" choice, then accept
    const idx = await ev(() => window.__mh.Dialogue.choices.findIndex(c => /work|need/i.test(c.text))); await tap('Digit' + (idx + 1)); await wait(150);
    await tap('Digit1'); await wait(150); while (await ev(() => window.__mh.Dialogue.open)) { await tap('Enter'); await wait(120); }
    await until(() => window.__mh.mission && window.__mh.mission.target, 5000);
    await ev(() => { const M = window.__mh; M.exitInterior(); const v = M.mission.target; M.player.x = v.x; M.player.z = v.z; M.enterVehicle(v); });
    await wait(400);
    await ev(() => { const M = window.__mh, st = M.missionObj.def.steps[M.missionObj.si]; const t = st._t || st.to(M.missionObj); const v = M.player.veh; v.x = t[0]; v.z = t[1]; v.vx = v.vz = 0; });
    await until(() => !window.__mh.mission, 8000);
    const d = await ev(() => window.__mh.saveData.done.includes('m15')); if (!d) throw new Error('not passed'); return await ev(() => window.__mh.saveData.rel);
  });
  await check('mission m14 Commuter Hustle (metro to elevated station, retrieve drop)', async () => {
    await reset();
    await ev(() => { const M = window.__mh, m = M.MISSIONS.find(x => x.id === 'm14'); M.player.x = m.pos[0]; M.player.z = m.pos[1]; M.startMission(m, true); });
    await until(() => window.__mh.mission && window.__mh.mission.def.steps[window.__mh.mission.si].name === 'metro:enter', 3000);
    // walk in through the real entrance service (raises metro:enter)
    const route = await ev(() => { const M = window.__mh, m = M.mission.def; const from = m.steps[1].text.replace(/<[^>]+>/g, ''), to = m.steps[2].text.replace(/<[^>]+>/g, ''); const S = M.Metro.stations.find(s => s.svc && from.includes(s.name + ' metro')); M.player.x = S.svc.x; M.player.z = S.svc.z; M.Metro.token = null; M.serviceInteract(S.svc); return { from, to, S: S.name }; });
    const I = await ev(() => window.__mh.INT.metro.spots);
    await goSpot('metro', I.machine[0], I.machine[1]); await wait(250); await tap('KeyE'); await until(() => !document.getElementById('menu').hidden, 3000);
    const want = await ev(() => { const M = window.__mh; const t = M.mission.def.steps[2].text.replace(/<[^>]+>/g, ''); const items = [...document.querySelectorAll('#menuList .mi span')].map(s => s.textContent); return items.findIndex(x => t.includes(x.split(' · ')[0].replace(' (elevated)', ''))); });
    if (want < 0) throw new Error('destination not offered'); for (let i = 0; i < want; i++) await tap('ArrowDown'); await tap('Enter'); await wait(200);
    await goSpot('metro', I.gate[0], I.gate[1]); await wait(250); await tap('KeyE');
    await goSpot('metro', 0, -8.5); await until(() => window.__mh.Metro.platform && window.__mh.Metro.platform.phase === 'doors', 30000); await tap('KeyF'); await wait(300);
    await page.keyboard.down('KeyE'); await until(() => !window.__mh.Metro.ride, 300000); await page.keyboard.up('KeyE');
    await until(() => window.__mh.mission && window.__mh.mission.def.steps[window.__mh.mission.si].t === 'pickupIn', 5000);
    await goSpot('metro', 14, -6.3); await wait(400);
    await ev(() => { const M = window.__mh, I = M.INT.metro; M.player.x = I.spawn[0]; M.player.z = I.spawn[1] - 0.8; }); await wait(250); await tap('KeyE'); await wait(400);
    await until(() => !window.__mh.mission, 8000);
    if (!await ev(() => window.__mh.saveData.done.includes('m14'))) throw new Error('not passed'); return route;
  });
  await check('mission m13 The Arrival (drive → check-in → security → board → fly → land at LZ)', async () => {
    await reset();
    await ev(() => { const M = window.__mh, m = M.MISSIONS.find(x => x.id === 'm13'); M.player.x = m.pos[0]; M.player.z = m.pos[1]; M.startMission(m, true); });
    await until(() => window.__mh.mission && window.__mh.mission.def.steps[window.__mh.mission.si].t === 'enter', 3000);
    await ev(() => { const M = window.__mh, d = M.WorldFix.dropoff; const v = M.drive('sedan', d.x - 60 * Math.sin(d.h), d.z - 60 * Math.cos(d.h), d.h); });
    await until(() => window.__mh.mission.def.steps[window.__mh.mission.si].t === 'goto', 3000);
    await ev(() => { const M = window.__mh, d = M.WorldFix.dropoff, v = M.player.veh; v.x = d.x; v.z = d.z; v.vx = v.vz = 0; });
    await until(() => window.__mh.mission.def.steps[window.__mh.mission.si].name === 'airport:enter', 5000);
    await ev(() => { const M = window.__mh; M.exitVehicle(); M.Airport.pass = null; M.Airport.cleared = false; M.enterInterior('terminal', M.Airport.svc); M.EventBus.emit('airport:enter', {}); });
    const T = await ev(() => window.__mh.INT.terminal.spots);
    await goSpot('terminal', T.checkin[0], T.checkin[1]); await wait(250); await tap('KeyE'); await until(() => !document.getElementById('menu').hidden, 3000); await tap('ArrowDown'); await tap('Enter'); await wait(200);
    await goSpot('terminal', T.security[0], T.security[1]); await wait(250); await tap('KeyE'); await wait(150);
    await goSpot('terminal', T.gate[0], T.gate[1]); await wait(250); await tap('KeyE'); await wait(400);
    await until(() => window.__mh.mission.def.steps[window.__mh.mission.si].t === 'landPlane', 5000);
    // real take-off, then a short hop to the LZ and a gentle touchdown
    await page.keyboard.down('Space'); await wait(5500); await page.keyboard.down('KeyS'); await wait(3000); await page.keyboard.up('KeyS'); await wait(1500); await page.keyboard.up('Space');
    const air = await ev(() => window.__mh.player.veh.y); if (air < 10) throw new Error('did not take off: y=' + air);
    await ev(() => { const M = window.__mh, st = M.missionObj.def.steps[M.missionObj.si], t = st._t, v = M.player.veh; v.x = t[0]; v.z = t[1]; v.y = 0; v.vx = v.vz = v.vy = 0; v.pitch = 0; v.roll = 0; v.thr = 0; v.gearDown = true; });
    await until(() => !window.__mh.mission, 8000);
    if (!await ev(() => window.__mh.saveData.done.includes('m13'))) throw new Error('not passed'); return { takeoffAlt: Math.round(air) };
  });
  await check('mission fail condition fires (m15 car wrecked)', async () => {
    await reset(); await ev(() => { const M = window.__mh; M.saveData.done = M.saveData.done.filter(x => x !== 'm15'); const m = M.MISSIONS.find(x => x.id === 'm15'); M.startMission(m, true, 'family:favor_accepted'); });
    await ev(() => { const M = window.__mh; M.enterInterior('family', M.Living.family); }); await until(() => window.__mh.mission && window.__mh.mission.target, 5000);
    await ev(() => { const M = window.__mh; window.__failed = null; M.EventBus.on('mission:failed', d => window.__failed = d.reason); M.mission.target.health = 10; });
    await until(() => window.__failed, 4000); return await ev(() => window.__failed);
  });

  // ---------------- failsafe + world fixes ----------------
  await check('failsafe: falling through the world is recovered', async () => {
    await reset(); await ev(() => { const M = window.__mh; M.player.y = -40; }); await wait(400);
    const y = await ev(() => window.__mh.player.y); if (y < -1) throw new Error('y ' + y); return y;
  });
  await check('collision layers: people step onto platforms (Curb), cars are blocked', () => ev(() => {
    // probe 0.3 m outside every platform edge: cars must hit the wall; people (step 1.0 m) must pass unless a building is also there
    const M = window.__mh; let car = 0, stepped = 0, edges = 0;
    for (const P of M.walkPolys) { let A = 0; for (let i = 0; i < P.pts.length; i++) { const p = P.pts[i], q = P.pts[(i + 1) % P.pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
      for (let i = 0; i < P.pts.length; i++) { const a = P.pts[i], b = P.pts[(i + 1) % P.pts.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 3) continue;
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = A > 0 ? dz : -dz, nz = A > 0 ? -dx : dx;   // same outward normal the wall builder uses
        const px = mx + nx * 0.3, pz = mz + nz * 0.3; edges++;
        if (M.collideCircle(px, pz, 0.4, 0, 0).hit) { car++; if (!M.collideCircle(px, pz, 0.4, 0, 1.0).hit) stepped++; } } }
    const res = { platformHeight: M.walkSurfaceAt(...M.centroidOf(M.walkPolys[0].pts)), edges, carBlocked: car, personStepsOver: stepped };
    if (res.platformHeight < 0.9 || car < edges * 0.9 || stepped < car * 0.7) throw new Error(JSON.stringify(res));
    return res;
  }));
  await check('metrics: frame budget (no render)', async () => {
    const f = await ev(async () => { const t0 = performance.now(); let n = 0; await new Promise(r => { const tick = () => { n++; if (performance.now() - t0 > 2000) r(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }); return n / 2; });
    return { rafPerSec: f };
  });
  // final stills with rendering
  await reset();
  await ev(() => { const M = window.__mh; M.Weather.set('storm'); M.setHour(19.2); M.drive('super', -10156, 9150, 0); });
  await wait(4000); await pshot('hud_storm_supercar_dusk');
  await ev(() => { const M = window.__mh; M.Weather.set('clear'); M.setHour(12.5); }); await page.keyboard.down('KeyW'); await wait(3000); await pshot('hud_driving_day'); await page.keyboard.up('KeyW');
  return { passed, failed, notes };
}
