// ===================== UI: main menu, settings, missions list, briefing, objective tracker, flight HUD =====================
const Settings = Object.assign({ sens: 1, invert: false, blur: true }, store.get('mh-settings') || {});
function saveSettings() { store.set('mh-settings', Settings); }
const UI = {
  brief: null, panel: null,
  modalOpen() { return !!(this.brief || this.panel || Dialogue.open || Cheats.consoleOpen); },
  // ---------- briefing ----------
  showBriefing(def, onAccept, onDecline) {
    this.brief = { def, onAccept, onDecline };
    $('brWho').textContent = 'Mission from ' + def.who; $('brTitle').textContent = def.title;
    $('brText').textContent = def.brief || '';
    $('brObj').innerHTML = MissionFW.checkpoints(def).map(c => `<li>${c}</li>`).join('');
    $('brReward').textContent = 'Reward ' + money(def.reward) + (def.rel ? ` · ${(Dialogue.data.contacts[def.rel[0]] || { name: def.rel[0] }).name} will remember this` : '');
    $('briefing').hidden = false; if (document.pointerLockElement) document.exitPointerLock();
    Sound.tone(660, 0.1, 'triangle', 0.1); EventBus.emit('ui:briefing', { id: def.id });
  },
  closeBriefing(accept) {
    const b = this.brief; if (!b) return; this.brief = null; $('briefing').hidden = true; canvas.focus();
    if (accept) b.onAccept && b.onAccept(); else b.onDecline && b.onDecline();
    if (gameState === 'play') lockPointer();
  },
  update() {
    if (this.brief) { if (hit('Enter') || gpHit(BTN.X)) this.closeBriefing(true); else if (hit('Escape') || hit('Backspace') || gpHit(BTN.O)) this.closeBriefing(false); }
    else if (this.panel) { if (hit('Escape') || gpHit(BTN.O)) this.closePanel(); }
    else if (Dialogue.open) Dialogue.update();
  },
  // ---------- panels (settings / missions) ----------
  openPanel(id) {
    this.closePanel(); this.panel = id; $(id).hidden = false; if (document.pointerLockElement) document.exitPointerLock();
    if (id === 'settings') this.renderSettings(); if (id === 'missions') this.renderMissions();
  },
  closePanel() { if (!this.panel) return; $(this.panel).hidden = true; this.panel = null; },
  renderSettings() {
    $('setQuality').textContent = Q.label; $('setTime').textContent = TIME_LABEL[timeMode]; $('setWeather').textContent = Weather.target[0].toUpperCase() + Weather.target.slice(1);
    $('setSound').textContent = Sound.on ? 'On' : 'Off'; $('setSens').value = Settings.sens; $('setInvert').textContent = Settings.invert ? 'On' : 'Off'; $('setBlur').textContent = Settings.blur ? 'On' : 'Off';
  },
  renderMissions() {
    const done = saveData.done;
    $('msSummary').textContent = `${done.length} / ${MISSIONS.length} complete`;
    $('msList').innerHTML = '';
    for (const m of MISSIONS) {
      const st = done.includes(m.id) ? 'dn' : m.unlock(done) ? 'av' : 'lk';
      const d = document.createElement('div'); d.className = st;
      d.innerHTML = `<span>${m.title}</span><b class="g">${money(m.reward)}</b><small>${m.who} · ${st === 'dn' ? 'Complete' : st === 'av' ? 'Available' : 'Locked'}${m.brief ? ' — ' + m.brief.slice(0, 90) + (m.brief.length > 90 ? '…' : '') : ''}</small>`;
      if (st === 'av' && gameState === 'play' && m.pos) { const b = document.createElement('button'); b.className = 'ghost'; b.textContent = 'Set GPS'; b.style.cssText = 'grid-column:1/-1;justify-self:start;padding:6px 10px;font-size:14px'; b.onclick = () => { waypoint = [m.pos[0], m.pos[1]]; gps.T = 0; toast('GPS set to ' + m.title); this.closePanel(); if (paused) setPaused(false); }; d.appendChild(b); }
      $('msList').appendChild(d);
    }
  },
  // ---------- objective tracker ----------
  tracker() {
    const el = $('tracker');
    if (!mission) { if (!el.hidden) el.hidden = true; return; }
    const def = mission.def, cps = MissionFW.checkpoints(def, true), cur = MissionFW.checkpointIndex(mission);
    const key_ = def.id + ':' + cur;
    if (el._k !== key_) {
      el._k = key_; $('trkTitle').textContent = def.title;
      $('trkList').innerHTML = cps.map((c, i) => `<li class="${i < cur ? 'done' : i === cur ? 'cur' : ''}">${c}</li>`).join('');
    }
    el.hidden = false;
  },
  // ---------- flight HUD: attitude, heading tape, speed / altitude, gear, stall ----------
  flightHud(v) {
    const cv = $('flighthud'); const show = v && (v.kind === 'plane' || v.kind === 'heli');
    cv.hidden = !show; if (show) hud.alt.hidden = true; if (!show) return;
    const c = cv.getContext('2d'), W = cv.width, H = cv.height; c.clearRect(0, 0, W, H);
    const cx = W / 2, cy = 150, R = 110;
    // attitude ball
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
    c.translate(cx, cy); c.rotate(-v.roll); const py = v.pitch * 160;
    c.fillStyle = '#2f6fb0'; c.fillRect(-R * 2, -R * 2 + py, R * 4, R * 2); c.fillStyle = '#7a5a30'; c.fillRect(-R * 2, py, R * 4, R * 2);
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * 2, py); c.lineTo(R * 2, py); c.stroke();
    c.font = '600 14px "Barlow Condensed", sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center';
    for (let d = -30; d <= 30; d += 10) { if (!d) continue; const y = py - d * Math.PI / 180 * 160; c.beginPath(); c.moveTo(-26, y); c.lineTo(26, y); c.stroke(); c.fillText(d, 40, y + 5); }
    c.restore();
    c.strokeStyle = '#f6c21c'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx - 60, cy); c.lineTo(cx - 18, cy); c.lineTo(cx - 8, cy + 10); c.moveTo(cx + 60, cy); c.lineTo(cx + 18, cy); c.lineTo(cx + 8, cy + 10); c.stroke();
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)'; c.stroke();
    // heading tape
    const hdg = ((180 - v.h * 180 / Math.PI) % 360 + 360) % 360;   // world -z is north, +x east
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(cx - 130, 4, 260, 26); c.fillStyle = '#fff'; c.font = '700 15px "Barlow Condensed", sans-serif';
    for (let d = -40; d <= 40; d += 10) { const a = Math.round((hdg + d) / 10) * 10, x = cx + (a - hdg) * 3; if (x < cx - 125 || x > cx + 125) continue; const lab = ((a % 360) + 360) % 360; c.fillText(lab === 0 ? 'N' : lab === 90 ? 'E' : lab === 180 ? 'S' : lab === 270 ? 'W' : lab, x, 22); }
    c.fillStyle = '#f6c21c'; c.fillRect(cx - 1, 2, 2, 30);
    // side readouts
    const kt = Math.hypot(v.vx, v.vz, v.vy) * 1.944, vs = v.vy;
    const box = (x, label, val, col = '#fff') => { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x, 70, 150, 130); c.fillStyle = '#9fb0c0'; c.font = '700 14px "Barlow Condensed", sans-serif'; c.textAlign = 'left'; c.fillText(label, x + 10, 90); c.fillStyle = col; c.font = '400 34px Bungee, Impact, sans-serif'; c.fillText(val, x + 10, 130); };
    box(10, 'AIRSPEED KT', Math.round(kt), kt * 0.514 < (v.spec.stall || 0) && v.kind === 'plane' ? '#ff5a4a' : '#fff');
    box(W - 160, 'ALTITUDE M', Math.round(v.y));
    c.font = '700 16px "Barlow Condensed", sans-serif'; c.fillStyle = vs < -6 ? '#ff5a4a' : '#cfe';
    c.fillText(`V/S ${vs >= 0 ? '+' : ''}${vs.toFixed(1)} m/s`, W - 150, 160);
    c.fillStyle = '#cfe'; c.fillText(v.kind === 'plane' ? `THR ${Math.round(v.thr * 100)}%` : `ROTOR ${Math.round(v.rotor * 100)}%`, 20, 160);
    if (v.kind === 'plane') {
      c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(20, 172, 120, 10); c.fillStyle = '#f6c21c'; c.fillRect(20, 172, 120 * v.thr, 10);
      c.font = '700 18px "Barlow Condensed", sans-serif'; c.fillStyle = v.gearDown ? '#8ee07a' : '#f6c21c'; c.fillText(v.gearDown ? '▼ GEAR DOWN' : '▲ GEAR UP', W - 150, 190);
      const stall = !groundedPlane(v) && Math.hypot(v.vx, v.vz, v.vy) < v.spec.stall;
      if (stall && Math.floor(performance.now() / 300) % 2) { c.textAlign = 'center'; c.fillStyle = '#ff3a2a'; c.font = '400 30px Bungee, Impact, sans-serif'; c.fillText('STALL', cx, 290); }
      const g = groundHeightAt(v.x, v.z, v.y + 2); if (!stall && v.y - g < 60 && v.vy < -5 && !groundedPlane(v)) { c.textAlign = 'center'; c.fillStyle = '#ff9a2a'; c.font = '400 26px Bungee, Impact, sans-serif'; c.fillText('PULL UP', cx, 290); }
    }
  },
  gearText(v) {
    if (!v || v.kind !== 'car') return '';
    const vf = v.fwdSpeed; if (vf < -0.5) return 'R'; if (Math.abs(vf) < 0.5) return 'N';
    return String(clamp(1 + Math.floor(vf / v.spec.max * 6.2), 1, 6));
  },
  // ---------- minimap blips for transport hubs, family home, cafes ----------
  hubBlips(big) {
    const out = [];
    for (const s of services) {
      if (s.type === 'terminal') out.push({ x: s.x, z: s.z, col: '#ffffff', label: '✈', r: 6, edge: big });
      else if (s.type === 'metro') out.push({ x: s.x, z: s.z, col: '#2f8fe8', label: 'M', r: 5 });
      else if (s.type === 'family') out.push({ x: s.x, z: s.z, col: '#ff8ab4', label: 'F', r: 6, edge: true });
      else if (s.type === 'cafe') out.push({ x: s.x, z: s.z, col: '#c98a4a', label: 'C', r: 4 });
    }
    return out;
  },
};
function groundedPlane(v) { return v.y <= groundHeightAt(v.x, v.z, v.y + 1) + 0.1; }
// ---------- wiring ----------
$('titleSettingsBtn').onclick = () => UI.openPanel('settings');
$('titleMissionsBtn').onclick = () => UI.openPanel('missions');
$('pauseSettingsBtn').onclick = () => UI.openPanel('settings');
$('pauseMissionsBtn').onclick = () => UI.openPanel('missions');
$('setClose').onclick = () => UI.closePanel(); $('msClose').onclick = () => UI.closePanel();
$('setQuality').onclick = () => { qName = QORDER[(QORDER.indexOf(qName) + 1) % 3]; applyQuality(); autoQ.done = true; store.set('mh-quality-set', 1); $('qualityBtn').textContent = 'Graphics: ' + Q.label; UI.renderSettings(); };
$('setTime').onclick = () => { cycleTime(); UI.renderSettings(); };
$('setWeather').onclick = () => { const k = Weather.kinds; Weather.set(k[(k.indexOf(Weather.target) + 1) % k.length]); saveData.weather = Weather.target; UI.renderSettings(); };
$('setSound').onclick = () => { Sound.setOn(!Sound.on); $('soundBtn').textContent = 'Sound: ' + (Sound.on ? 'On' : 'Off'); UI.renderSettings(); };
$('setSens').oninput = e => { Settings.sens = +e.target.value; saveSettings(); };
$('setInvert').onclick = () => { Settings.invert = !Settings.invert; saveSettings(); UI.renderSettings(); };
$('setBlur').onclick = () => { Settings.blur = !Settings.blur; saveSettings(); UI.renderSettings(); };
$('brAccept').onclick = () => UI.closeBriefing(true); $('brDecline').onclick = () => UI.closeBriefing(false);
$('exitBtn').onclick = () => { saveGame(true); $('title').hidden = true; $('bye').hidden = false; try { window.close(); } catch (e) { } };
$('byeBack').onclick = () => { $('bye').hidden = true; $('title').hidden = false; };
$('quitBtn').onclick = () => { saveGame(true); location.reload(); };
