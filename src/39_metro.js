// ===================== METRO: station entrances, concourse, ticket machine, turnstiles, platform, rides =====================
const Metro = {
  stations: [],        // { name, x, z, svc, stops: [{ line, i }] }  one entrance per station (parallel tracks merged)
  token: null,         // { from, to } bought at the machine
  gateOpen: false,     // turnstile unlocked by the token
  platform: null,      // interior platform train state
  ride: null,          // world ride state
  init() {
    // stations from the named stops on every line
    railLines.forEach((L, li) => (L.stopMeta || []).forEach((st, i) => {
      if (L.len < 1500) return;
      let S = this.stations.find(o => o.name === st.name && dist2(o.x, o.z, st.x, st.z) < 400 * 400) || this.stations.find(o => dist2(o.x, o.z, st.x, st.z) < 80 * 80);
      if (!S) { S = { name: st.name, x: st.x, z: st.z, y: st.y, elevated: !!st.elevated, stops: [] }; this.stations.push(S); }
      S.stops.push({ line: L, li, i, s: st.s });
    }));
    for (const S of this.stations) {
      const sp = streetSpot(S.x, S.z); if (!sp) continue;
      const x = sp.x + sp.tz * (sp.hw + 1.8), z = sp.z - sp.tx * (sp.hw + 1.8);
      S.svc = addService('metro', x, z, { h: sp.h, name: S.name, station: S, r: 2 });
    }
    SERVICE_STYLE.metro = { label: 'Metro Station', icon: 'M', col: '#2f8fe8' };
    SERVICE_HANDLERS.metro = s => { this.gateOpen = false; this.platform = null; enterInterior('metro', s); EventBus.emit('metro:enter', { station: s.name }); };
    this.buildInterior();
  },
  buildInterior() {
    const I = addInterior('metro', 46, 34, 7, (g, W, D, H, I) => {
      ibox(g, IMAT.tile, W - 0.2, 0.02, D - 0.2, 0, 0.01, 0);
      // ticket machines + map board on the concourse (south)
      for (let k = 0; k < 2; k++) { ibox(g, new THREE.MeshStandardMaterial({ color: 0x2f8fe8, roughness: 0.4 }), 1.2, 1.9, 0.7, -16 + k * 1.8, 0.95, 9); ibox(g, IMAT.dark, 0.8, 0.5, 0.05, -16 + k * 1.8, 1.45, 8.62); }
      ibox(g, new THREE.MeshStandardMaterial({ color: 0xf4f4f0, emissive: 0x303030 }), 8, 2.4, 0.1, 8, 2.4, D / 2 - 0.2);
      // turnstile line at z = 3: barrier with three gates in the middle
      ibox(g, IMAT.metal, 18, 1.1, 0.3, -12.5, 0.55, 3); ibox(g, IMAT.metal, 18, 1.1, 0.3, 12.5, 0.55, 3);
      for (const x of [-3, -1.5, 0, 1.5, 3]) ibox(g, IMAT.dark, 0.35, 1.1, 1.2, x, 0.55, 3);
      I.flaps = []; for (const x of [-2.25, -0.75, 0.75, 2.25]) { const f = ibox(g, new THREE.MeshStandardMaterial({ color: 0xd8401c, transparent: true, opacity: 0.8 }), 1.1, 0.6, 0.05, x, 0.8, 3); I.flaps.push(f); }
      I.walls.push([-W / 2, 3, -3.4, 3], [3.4, 3, W / 2, 3], Object.assign([-3.4, 3, 3.4, 3], { open: () => this.gateOpen }));
      // platform (north): yellow safety line, edge, track pit beyond z = -11
      ibox(g, new THREE.MeshStandardMaterial({ color: 0xf2c41f }), W - 1, 0.03, 0.4, 0, 0.03, -10.2);
      ibox(g, IMAT.concrete, W - 0.2, 1.2, 5.6, 0, -0.6, -D / 2 + 2.9);                        // pit floor (below platform level)
      ibox(g, IMAT.dark, W - 0.2, 0.15, 0.15, 0, -0.05, -12.9); ibox(g, IMAT.dark, W - 0.2, 0.15, 0.15, 0, -0.05, -14.3);   // rails
      I.walls.push([-W / 2, -11, W / 2, -11]);                                                 // can't step into the pit
      for (let k = -2; k <= 2; k++) { ibox(g, IMAT.wood, 2.4, 0.45, 0.6, k * 7, 0.22, -6); }     // benches
      I.board = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: this.boardTex(), transparent: true })); I.board.position.set(0, 4.2, -9.8); g.add(I.board);
      I.spots = { machine: [-15.1, 7.8], gate: [0, 4.6], platform: [0, -8.5], alight: [6, -9] };
    });
    I.onEnter = () => this.populate(I); I.onExit = () => this.depopulate();
    Triggers.add({ id: 'metro:machine', interior: 'metro', x: I.x + I.spots.machine[0], z: I.z + I.spots.machine[1], r: 2.2, prompt: () => this.token ? 'Token bought · tap in at the gates' : 'Buy a metro token', onUse: () => this.machineMenu() });
    Triggers.add({ id: 'metro:gate', interior: 'metro', x: I.x + I.spots.gate[0], z: I.z + I.spots.gate[1], r: 2.2, prompt: () => this.gateOpen ? null : this.token ? 'Tap your token' : 'Token required', onUse: () => this.tapIn() });
    Triggers.add({ id: 'metro:platform', interior: 'metro', x: I.x, z: I.z - 8.5, r: 22, hy: 3, prompt: () => this.platformPrompt(), key: 'enter', onUse: () => this.boardFromPlatform() });
    this.I = I;
  },
  boardTex(text = 'NEXT TRAIN  2 min') {
    const c = this._bc || (this._bc = document.createElement('canvas')); c.width = 512; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#0b0d10'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#ffb21c'; x.font = '700 50px "Barlow Condensed", monospace'; x.textBaseline = 'middle'; x.fillText(text, 20, 64);
    if (!this._bt) { this._bt = new THREE.CanvasTexture(c); this._bt.colorSpace = THREE.SRGBColorSpace; } else this._bt.needsUpdate = true; return this._bt;
  },
  populate(I) {
    this.npcs = [];
    for (let k = 0; k < 8; k++) { const w = new Walker(randomLook(), I.x - 18 + k * 5, I.z - 7 + (k % 3)); w.state = 'idle'; w.special = true; w.h = Math.PI; this.npcs.push(w); }
    for (let k = 0; k < 4; k++) { const w = new Walker(randomLook(), I.x - 8 + k * 6, I.z + 10); w.state = 'idle'; w.special = true; w.h = Math.random() * TAU; this.npcs.push(w); }
  },
  depopulate() { for (const w of this.npcs || []) w.remove(); this.npcs = []; if (this.platform && this.platform.group) this.I.g.remove(this.platform.group); this.platform = null; },
  here() { return player.interior && player.interior.svc && player.interior.svc.station; },
  destinations(S) {
    const out = [];
    for (const st of S.stops) for (const m of st.line.stopMeta) {
      if (Math.abs(m.s - st.s) < 300) continue;
      const D = this.stations.find(o => o.stops.some(q => q.line === st.line && Math.abs(q.s - m.s) < 60)); if (!D || D === S || out.some(o => o.D === D)) continue;
      out.push({ D, line: st.line, from: st.s, to: m.s, km: Math.abs(m.s - st.s) / 1000 });
    }
    return out.sort((a, b) => a.km - b.km);
  },
  machineMenu() {
    const S = this.here(); if (!S) return;
    const items = this.destinations(S).slice(0, 12).map(d => ({ label: `${d.D.name}${d.D.elevated ? ' (elevated)' : ''} · ${d.km.toFixed(1)} km`, price: Math.round(10 + d.km * 5), action: () => { this.token = { S, D: d.D, line: d.line, from: d.from, to: d.to }; toast('Token to ' + d.D.name); EventBus.emit('metro:token', { to: d.D.name }); return 'close'; } }));
    if (!items.length) items.push({ label: 'No connections from this station', disabled: true });
    items.push({ label: 'Cancel', action: () => 'close' });
    Menu.show(S.name + ' Metro', 'Single journey token', items);
  },
  tapIn() {
    if (!this.token || this.gateOpen) return;
    if (this.token.S !== this.here()) { toast('This token is for ' + this.token.S.name); return; }
    this.gateOpen = true; Sound.tone(1320, 0.1, 'square', 0.06); for (const f of this.I.flaps) f.rotation.y = Math.PI / 2;
    this.platform = { t: 7, phase: 'wait' }; EventBus.emit('metro:gate', {});
  },
  platformPrompt() {
    const P = this.platform; if (!P || player.z > this.I.z) return null;
    if (P.phase === 'wait') return null;
    if (P.phase === 'doors') return 'Board the train';
    return null;
  },
  update(dt) {
    if (!player.interior || player.interior.type !== 'metro') { for (const f of this.I ? this.I.flaps : []) f.rotation.y = 0; return; }
    const P = this.platform, I = this.I; if (!P) { this.boardTex(this.token ? 'TAP IN AT THE GATES' : 'BUY A TOKEN'); return; }
    if (P.phase === 'wait') {
      P.t -= dt; this.boardTex(`${this.token ? this.token.D.name.toUpperCase().slice(0, 18) : ''}  ${Math.max(0, Math.ceil(P.t))} s`);
      if (P.t <= 0) { P.phase = 'arrive'; P.x = -70; P.group = new THREE.Group(); P.doors = [];
        for (let k = 0; k < 3; k++) { const m = Assets.coach(k === 0) || { root: new THREE.Mesh(coachGeo(k === 0).body, TRAIN_MAT), doors: [] }; m.root.rotation.y = -Math.PI / 2; m.root.position.x = -k * 20.2; P.group.add(m.root); P.doors.push(...m.doors); }
        P.group.position.set(P.x, -1.2, -13.6); I.g.add(P.group); Sound.trainHorn(0.08); }
    } else if (P.phase === 'arrive') {
      P.x += Math.max(1.5, (20 - P.x) * 1.2) * dt; P.group.position.x = P.x; this.boardTex('TRAIN ARRIVING');
      if (P.x >= 20) { P.x = 20; P.phase = 'doors'; P.open = 0; EventBus.emit('metro:arrive', {}); }
    } else if (P.phase === 'doors') {
      P.open = Math.min(1, P.open + dt); for (const d of P.doors) d.position.z = d.userData.z0 + (d.name.endsWith('0') ? -1 : 1) * P.open * 0.68;
      this.boardTex('DOORS OPEN · BOARD NOW');
    }
  },
  boardFromPlatform() {
    const P = this.platform; if (!P || P.phase !== 'doors' || !this.token) return;
    const tk = this.token; this.token = null; this.gateOpen = false;
    exitInterior(); this.startRide(tk);
  },
  // ---------------- world ride on a real train along the real line ----------------
  startRide(tk) {
    const dir = tk.to > tk.from ? 1 : -1, L = tk.line;
    const T = new Train(L, clamp(tk.from, 120, L.len - 120), dir, 4);
    T.stopT = T.dwell = 6; T.fast = true; T.ride = true;
    // passengers on the benches, the player in the middle coach
    const mid = T.coaches[1]; this.seated = [];
    for (let i = 0; i < T.coaches.length; i++) for (let k = 0; k < 5; k++) { if (Math.random() < 0.35) continue; const m = seatedMesh(randomLook()); m.position.set((k % 2 ? 1 : -1) * 1.1, 1.15, -8 + k * 4); m.rotation.y = (k % 2 ? -1 : 1) * Math.PI / 2; T.coaches[i].add(m); }
    const me = seatedMesh(PLAYER_LOOK); me.position.set(-1.1, 1.15, 0); me.rotation.y = Math.PI / 2; mid.add(me);
    this.ride = { T, tk, cabin: false, dest: tk.to, t: 0 };
    player.onTrain = T; pMesh.root.visible = false; camMode = 1; camSmoothed = false;
    toast(`Metro to ${tk.D.name} · C cabin / outside · hold E to skip ahead · F to get off at a stop`);
    EventBus.emit('metro:board', { to: tk.D.name });
  },
  rideUpdate(dt) {
    const R = this.ride, T = R.T; R.t += dt;
    const c = T.coaches[1]; player.x = c.position.x; player.z = c.position.z; player.y = c.position.y + 1.1; player.h = c.rotation.y;
    if (In.act('camera')) R.cabin = !R.cabin;
    const toDest = (R.dest - T.s) * T.dir;
    // hold E: fast-forward to the next stop (fade cut), the train keeps its schedule from there
    if (In.held('interact') && T.stopT <= 0 && R.t > 1) { const next = T.nextStop !== null ? T.nextStop : R.dest; if (Math.abs(next - T.s) > 60) { T.s = next - T.dir * 1.0; T.speed = 0.3; fadeFlash(); R.t = 0; } }
    const atStop = T.stopT > 0;
    if (atStop && Math.abs(T.s - R.dest) < 40) { this.alight(true); return; }
    const nextName = (() => { const m = T.line.stopMeta.find(q => Math.abs(q.s - (T.nextStop ?? R.dest)) < 5); return m ? m.name : ''; })();
    prompt(atStop ? `${key('F', '△')} Get off here · next: ${nextName}` : `Metro to <b>${R.tk.D.name}</b> · ${(Math.max(0, toDest) / 1000).toFixed(1)} km · ${key('C', '←')} view · hold ${key('E', '→')} skip`);
    if (atStop && In.act('enter') && R.t > 0.5) this.alight(false);
  },
  alight(atDest) {
    const R = this.ride, T = R.T; this.ride = null; player.onTrain = null; pMesh.root.visible = true; camMode = 0;
    const st = T.line.stopMeta.reduce((b, m) => Math.abs(m.s - T.s) < Math.abs(b.s - T.s) ? m : b, T.line.stopMeta[0]);
    const S = this.stations.find(o => o.stops.some(q => q.line === T.line && Math.abs(q.s - st.s) < 60)) || R.tk.D;
    setTimeout(() => T.remove(), 8000);
    if (S && S.svc) { S.svc.at = this.I.spots.alight; S.svc.atH = 0; this.gateOpen = true; enterInterior('metro', S.svc); player.interior.ret = { x: S.svc.x, z: S.svc.z, h: S.svc.h }; }
    toast(`${S ? S.name : 'Station'}${S && S.elevated ? ' · elevated station' : ''}`);
    EventBus.emit('metro:alight', { station: S ? S.name : '', elevated: !!(S && S.elevated), atDest });
  },
  camera(dt) {
    const R = this.ride; if (!R) return false; const c = R.T.coaches[1];
    if (R.cabin) {   // seated, looking out of the window across the aisle
      const fx = Math.sin(c.rotation.y), fz = Math.cos(c.rotation.y), rx = -fz, rz = fx;
      camera.position.set(c.position.x - rx * 0.9, c.position.y + 2.3, c.position.z - rz * 0.9);
      camera.lookAt(c.position.x + rx * 30 + fx * 8, c.position.y + 1.6, c.position.z + rz * 30 + fz * 8);
    } else updateOrbit(dt, c.position.x, c.position.y + 3, c.position.z, 34);
    return true;
  },
};
Systems.register('metro', { init() { Metro.init(); }, update(dt) { Metro.update(dt); } }, 25);
