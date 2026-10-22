// ===================== CHEATS: central registry, type-anywhere codes, console (`) =====================
// Every cheat goes through the normal game APIs (addCash, Vehicle, Weather.set, Police.set) so the save stays consistent;
// saves are sanitised before they are written (see sanitizeSave).
const Cheats = {
  list: {}, buf: '', consoleOpen: false, used: 0,
  register(name, help, fn) { this.list[name.toUpperCase()] = { help, fn }; },
  run(line, src = 'console') {
    const [cmd, ...args] = String(line).trim().split(/\s+/); const C = this.list[(cmd || '').toUpperCase()];
    if (!C) return 'Unknown cheat: ' + cmd;
    if (gameState !== 'play' || player.dead) return 'Cheats work only while playing';
    let msg; try { msg = C.fn(args) || 'OK'; } catch (e) { console.error(e); return 'Cheat failed: ' + e.message; }
    this.used++; saveData.stats.cheats = (saveData.stats.cheats || 0) + 1;
    banner('CHEAT ACTIVATED', cmd.toUpperCase(), false, 1.8); Sound.star();
    EventBus.emit('cheat', { cmd: cmd.toUpperCase(), args, src }); saveGame(true);
    return msg;
  },
  // type a cheat name during play, GTA style (letters only, no arguments)
  key(e) {
    if (gameState !== 'play' || this.consoleOpen || UI.modalOpen() || Menu.open || paused) return;
    if (e.code === 'Backquote') { e.preventDefault(); this.openConsole(); return; }
    if (!/^Key[A-Z]$/.test(e.code)) return;
    this.buf = (this.buf + e.code.slice(3)).slice(-16);
    for (const name in this.list) if (this.buf.endsWith(name)) { this.buf = ''; this.run(name, 'keys'); break; }
  },
  openConsole() { this.consoleOpen = true; $('console').hidden = false; if (document.pointerLockElement) document.exitPointerLock(); keys.clear(); setTimeout(() => $('consoleIn').focus(), 0); },
  closeConsole() { this.consoleOpen = false; $('console').hidden = true; $('consoleIn').value = ''; $('consoleIn').blur(); canvas.focus(); if (gameState === 'play') lockPointer(); },
  log(s) { const el = $('consoleLog'); el.textContent += s + '\n'; el.scrollTop = 1e9; },
  listen() { },
};
addEventListener('keydown', e => Cheats.key(e));
$('consoleIn').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.code === 'Escape' || e.code === 'Backquote') { e.preventDefault(); Cheats.closeConsole(); return; }
  if (e.code === 'Enter') { const v = e.target.value; e.target.value = ''; if (!v.trim()) return; if (/^help$/i.test(v.trim())) { Cheats.log(Object.entries(Cheats.list).map(([k, c]) => `${k}  ${c.help}`).join('\n')); return; } Cheats.log('> ' + v + '\n' + Cheats.run(v)); }
});
Cheats.register('HEALME', 'full health and armor', () => { player.health = 100; player.armor = 100; if (player.veh) player.veh.health = player.veh.spec.hp; return 'Healed'; });
Cheats.register('GIVECASH', '[amount] add cash (default 10000)', a => { const n = clamp(Math.round(+a[0] || 10000), 1, 10000000); addCash(n); return '+' + money(n); });
Cheats.register('SPAWNCAR', '[type] spawn a vehicle next to you (default super)', a => {
  const t = (a[0] || 'super').toLowerCase(); if (!SPECS[t] || SPECS[t].kind !== 'car' && SPECS[t].kind !== 'heli' && SPECS[t].kind !== 'plane') return 'Unknown vehicle: ' + t + ' (try ' + Object.keys(SPECS).filter(k => SPECS[k].kind === 'car').join(', ') + ')';
  if (player.interior) return 'Go outside first';
  const s = roadSpot(player.x + Math.sin(player.h) * 6, player.z + Math.cos(player.h) * 6, 1, true);
  const v = new Vehicle(t, undefined, s.x, s.z, s.h); v.persist = true; v.owned = true; v.fuel = 1; traffic.push(v); return SPECS[t].name + ' delivered';
});
Cheats.register('SETWEATHER', '[clear|cloudy|rain|fog|storm] (no argument cycles)', a => { const k = (a[0] || '').toLowerCase(); const next = Weather.kinds.includes(k) ? k : Weather.kinds[(Weather.kinds.indexOf(Weather.target) + 1) % Weather.kinds.length]; Weather.set(next); saveData.weather = next; return 'Weather: ' + next; });
Cheats.register('CLEARWANTED', 'lose the cops', () => { Police.set(0); return 'Wanted level cleared'; });
Cheats.register('SKYFALL', 'drop in from 600 m in a jet', () => { if (player.interior) return 'Go outside first'; if (player.veh) exitVehicle(); const v = new Vehicle('jet', 0xf0f0f0, player.x, player.z, player.h); v.y = 600; v.thr = 0.8; v.gearDown = false; v.persist = true; v.owned = true; v.vx = Math.sin(v.h) * 90; v.vz = Math.cos(v.h) * 90; traffic.push(v); enterVehicle(v); return 'Jet at 600 m'; });

// ---------------- save integrity ----------------
function sanitizeSave(d) {
  const num = (v, lo, hi, def) => Number.isFinite(+v) ? clamp(+v, lo, hi) : def;
  d.cash = Math.round(num(d.cash, 0, 1e10, 0)); d.bank = Math.round(num(d.bank, 0, 1e11, 0)); d.hour = num(d.hour, 0, 24, 12.5);
  for (const k of ['done', 'packages', 'props', 'aircraft', 'boats']) d[k] = Array.isArray(d[k]) ? [...new Set(d[k])] : [];
  for (const k of ['garages', 'stash', 'locker', 'weapons', 'stats', 'rel']) if (!d[k] || typeof d[k] !== 'object' || Array.isArray(d[k])) d[k] = {};
  for (const k in d.stash) d.stash[k] = Math.round(num(d.stash[k], 0, 1e11, 0));
  for (const k in d.rel) d.rel[k] = num(d.rel[k], -100, 100, 0);
  for (const k in d.weapons) { const w = d.weapons[k]; if (!WEAPONS[k] || !w) { delete d.weapons[k]; continue; } w.clip = Math.round(num(w.clip, 0, 1e5, 0)); w.ammo = Math.round(num(w.ammo, 0, 1e6, 0)); }
  if (!d.props.length) d.props = ['chetpet']; if (!d.home || !d.props.includes(d.home)) d.home = d.props[0];
  if (d.weather && !Weather.kinds.includes(d.weather)) d.weather = 'clear';
  return d;
}
