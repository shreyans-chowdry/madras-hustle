// ===================== LIVING WORLD: data-driven dialogue, relationships, family residence, cafes =====================
// Dialogue trees are authored in data/dialogue.json and inlined by build.py as DIALOGUE_DATA.
const Dialogue = {
  open: false, tree: null, node: null, sel: 0, choices: [], id: '',
  data: typeof DIALOGUE_DATA !== 'undefined' ? DIALOGUE_DATA : { contacts: {}, trees: {} },
  rel(who) { return (saveData.rel && saveData.rel[who]) || 0; },
  addRel(who, d) { saveData.rel = saveData.rel || {}; saveData.rel[who] = clamp(this.rel(who) + d, -100, 100); EventBus.emit('relationship:change', { who, value: saveData.rel[who], delta: d }); },
  cond(c) {
    if (!c) return true; const neg = c[0] === '!', s = neg ? c.slice(1) : c; let v = false;
    if (s.startsWith('done:')) v = saveData.done.includes(s.slice(5));
    else if (s.startsWith('mission:')) v = !!(mission && mission.def.id === s.slice(8));
    else if (s.startsWith('rel:')) { const [w, n] = s.slice(4).split('>='); v = this.rel(w) >= +n; }
    return neg ? !v : v;
  },
  // conversation camera: side-on two-shot of the player and whoever they are talking to
  camera(dt) {
    const f = this.focus; if (!f) return;
    const mx = (player.x + f.x) / 2, mz = (player.z + f.z) / 2; let dx = f.x - player.x, dz = f.z - player.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const I = player.interior && INT[player.interior.type];
    let cx = mx - dz * 2.8 - dx * 0.6, cz = mz + dx * 2.8 - dz * 0.6;
    if (I) { cx = clamp(cx, I.x - I.W / 2 + 0.5, I.x + I.W / 2 - 0.5); cz = clamp(cz, I.z - I.D / 2 + 0.5, I.z + I.D / 2 - 0.5); }
    camera.position.lerp(_dlgCam.set(cx, 1.65, cz), 1 - Math.exp(-dt * 6)); camera.lookAt(mx, 1.35, mz);
    player.h = headingTo(dx, dz); pMesh.root.rotation.y = player.h;
  },
  start(id, focus = null) {
    const T = this.data.trees[id]; if (!T) return false;
    this.focus = focus;
    this.id = id; this.tree = T; this.open = true; $('dialogue').hidden = false; if (document.pointerLockElement) document.exitPointerLock();
    EventBus.emit('dialogue:start', { id }); this.go(T.start); return true;
  },
  go(nid) {
    const n = this.tree.nodes[nid]; if (!n) return this.end();
    this.node = nid; const C = this.data.contacts[n.who] || { name: n.who };
    if (n.give) this.give(n.give);
    if (n.event) EventBus.emit(n.event, { node: nid });
    $('dlgWho').textContent = C.name + (C.role ? ' · ' + C.role : ''); $('dlgWho').style.color = C.color || '';
    $('dlgText').textContent = n.text;
    this.choices = (n.choices || []).filter(ch => this.cond(ch.cond));
    if (!this.choices.length) this.choices = [{ text: n.end || !n.next ? 'Bye.' : 'Continue', next: n.next, end: n.end || !n.next }];
    this.sel = 0; this.render(); $('relBar').textContent = `${C.name} ♥ ${this.rel(n.who)}`;
  },
  render() {
    const box = $('dlgChoices'); box.innerHTML = '';
    this.choices.forEach((ch, i) => { const b = document.createElement('button'); b.className = i === this.sel ? 'sel' : ''; b.textContent = `${i + 1}. ${ch.text}`; b.onclick = () => { this.sel = i; this.choose(); }; b.onmouseenter = () => { this.sel = i; this.render(); }; box.appendChild(b); });
  },
  choose() {
    const ch = this.choices[this.sel]; if (!ch) return;
    if (ch.rel) for (const w in ch.rel) this.addRel(w, ch.rel[w]);
    if (ch.give) this.give(ch.give);
    if (ch.event) EventBus.emit(ch.event, { choice: ch.text });
    Sound.click();
    if (ch.end || !ch.next) this.end(); else this.go(ch.next);
  },
  give(g) {
    if (g.cash > 0) addCash(g.cash); else if (g.cash < 0 && !spend(-g.cash)) toast('Not enough cash');
    if (g.health) player.health = Math.min(100, player.health + g.health);
  },
  update() {
    const up = hit('ArrowUp') || hit('KeyW') || gpHit(BTN.UP), dn = hit('ArrowDown') || hit('KeyS') || gpHit(BTN.DOWN);
    if (up || dn) { this.sel = (this.sel + (dn ? 1 : -1) + this.choices.length) % this.choices.length; this.render(); Sound.click(); }
    for (let k = 1; k <= 9; k++) if (hit('Digit' + k) && this.choices[k - 1]) { this.sel = k - 1; this.choose(); return; }
    if (hit('Enter') || hit('KeyE') || hit('Space') || gpHit(BTN.X)) this.choose();
    else if (hit('Escape') || gpHit(BTN.O)) this.end();
  },
  end() {
    if (!this.open) return; const id = this.id, node = this.node; this.open = false; camSmoothed = false; $('dialogue').hidden = true; this.tree = null;
    saveGame(true); EventBus.emit('dialogue:end', { id, node }); if (gameState === 'play') lockPointer();
  },
};
const _dlgCam = new THREE.Vector3();
// ---------------- family residence + cafes ----------------
const Living = {
  family: null, cafes: [],
  init() {
    const AMMA_LOOK = { skin: 0x7b4a2e, shirt: 0x9b2335, lower: 0xd8a420, kind: 'saree', female: true, hair: 0x2a2a2a, shoe: 0x3a2a1c, h: 0.92, long: true, accent: 0xd4a72c, build: 1.05 };
    const KARTHIK_LOOK = { skin: 0x6e4329, shirt: 0x2a6fd2, lower: 0x2b2f3a, kind: 'tee', female: false, hair: 0x141210, shoe: 0xe8e8e8, h: 1.0, long: false, accent: 0xffffff, build: 0.95 };
    // family home: an old Mylapore house
    const F = addInterior('family', 18, 14, 3.4, (g, W, D, H, I) => {
      ibox(g, new THREE.MeshStandardMaterial({ color: 0xb8553c, roughness: 0.8 }), W - 0.2, 0.02, D - 0.2, 0, 0.01, 0);   // red-oxide floor
      ibox(g, IMAT.fabric, 3.6, 0.5, 1, -5, 0.4, -4.6); ibox(g, IMAT.fabric, 3.6, 0.7, 0.3, -5, 0.8, -5.2);        // sofa
      ibox(g, IMAT.wood, 2.4, 0.75, 1.2, 4, 0.37, -2); for (const x of [3, 5]) for (const z of [-3.1, -0.9]) ibox(g, IMAT.wood, 0.5, 0.45, 0.5, x, 0.22, z);  // dining
      ibox(g, IMAT.wood, 1.6, 2.2, 0.5, 7.5, 1.1, -5.5); ibox(g, IMAT.gold, 0.6, 0.6, 0.05, 7.5, 1.6, -5.2);          // pooja shelf
      ibox(g, new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff7a10, emissiveIntensity: 2 }), 0.08, 0.15, 0.08, 7.5, 1.35, -5.15);
      ibox(g, IMAT.dark, 2.4, 1.4, 0.1, -5, 1.6, -6.85);   // TV
      I.spots = { amma: [-5, -3.6], karthik: [4, -0.6] };
    }, IMAT.floor, new THREE.MeshStandardMaterial({ color: 0xe8d9a8, roughness: 0.9 }));
    F.onEnter = () => {
      this.npcs = [];
      const a = new Walker(AMMA_LOOK, F.x + F.spots.amma[0], F.z + F.spots.amma[1]); a.state = 'stand'; a.special = true; a.h = 0; this.npcs.push(a);
      const k = new Walker(KARTHIK_LOOK, F.x + F.spots.karthik[0], F.z + F.spots.karthik[1]); k.state = 'sit'; k.special = true; k.h = Math.PI; k.p.inner.position.y = -0.5; this.npcs.push(k);
      EventBus.emit('family:enter', {});
    };
    F.onExit = () => { for (const w of this.npcs || []) w.remove(); this.npcs = []; };
    Triggers.add({ id: 'talk:amma', interior: 'family', x: F.x + F.spots.amma[0], z: F.z + F.spots.amma[1] + 1, r: 2.2, prompt: 'Talk to Amma', onUse: () => Dialogue.start('amma', this.npcs && this.npcs[0]) });
    Triggers.add({ id: 'talk:karthik', interior: 'family', x: F.x + F.spots.karthik[0], z: F.z + F.spots.karthik[1] - 1.5, r: 2, prompt: 'Talk to Karthik', onUse: () => Dialogue.start('karthik', this.npcs && this.npcs[1]) });
    const [hx, hz] = ll(13.0339, 80.2676); const door = nearestWallDoor(hx, hz, 120);
    if (door) { this.family = addService('family', door.x, door.z, { h: door.h, name: 'Family home, Mylapore', r: 2 }); const st = streetSpot(door.x, door.z); this.familyCar = st ? { x: st.x + st.tz * st.hw * 0.5, z: st.z - st.tx * st.hw * 0.5, h: st.h } : { x: door.x, z: door.z, h: 0 }; }
    SERVICE_STYLE.family = { label: 'Family home', icon: 'F', col: '#ff8ab4' };
    SERVICE_HANDLERS.family = s => enterInterior('family', s);
    // cafes: a few filter-coffee places on food shops near busy areas
    const C = addInterior('cafe', 14, 11, 3.4, (g, W, D, H, I) => {
      ibox(g, IMAT.tile, W - 0.2, 0.02, D - 0.2, 0, 0.01, 0);
      ibox(g, IMAT.wood, 5, 1.1, 1, -3, 0.55, -3.6); ibox(g, IMAT.metal, 0.6, 0.6, 0.5, -4.5, 1.4, -3.6);
      I.tables = [[2, 0], [5, 0], [2, 3], [5, 3], [-3, 2]];
      for (const [x, z] of I.tables) { ibox(g, IMAT.wood, 1.1, 0.75, 1.1, x, 0.37, z); }
      I.spots = { clerk: [-3, -4.4], counter: [-3, -2.4] };
    });
    C.onEnter = () => {
      this.cafeNpcs = [];
      for (const [x, z] of C.tables.slice(0, 4)) { const w = new Walker(randomLook(), C.x + x + 0.8, C.z + z); w.state = 'sit'; w.special = true; w.h = -Math.PI / 2; w.p.inner.position.y = -0.5; this.cafeNpcs.push(w); }
    };
    C.onExit = () => { for (const w of this.cafeNpcs || []) w.remove(); this.cafeNpcs = []; };
    Triggers.add({ id: 'talk:selvi', interior: 'cafe', x: C.x + C.spots.counter[0], z: C.z + C.spots.counter[1], r: 2, prompt: 'Order at the counter', onUse: () => Dialogue.start('selvi', interiorNPC) });
    const foods = spaced(G.shops.filter(s => s.t === 'food'), 2200).slice(0, 10);
    for (const p of foods) { const d = nearestWallDoor(p.x, p.z); if (d) this.cafes.push(addService('cafe', d.x, d.z, { h: d.h, name: p.n })); }
    SERVICE_STYLE.cafe = { label: 'Cafe', icon: 'C', col: '#c98a4a' };
    SERVICE_HANDLERS.cafe = s => enterInterior('cafe', s);
  },
};
Systems.register('living', { init() { Living.init(); } }, 30);
