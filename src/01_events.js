// ===================== ARCHITECTURE: event bus, collision layers, system registry, trigger volumes =====================
// The web build mirrors a Unity-style component architecture (see docs/ARCHITECTURE.md):
//   EventBus  ~ C# events / ScriptableObject event channels (observer pattern, no hard references between systems)
//   Systems   ~ MonoBehaviour Update() loops, registered and ticked in priority order by the main loop
//   Layers    ~ Unity physics layers (Default, Road, Obstacle, Interactable)
//   Triggers  ~ trigger colliders (OnTriggerEnter/Exit) that raise events and show interaction prompts
const EventBus = {
  _h: new Map(), log: [],
  on(name, fn) { let a = this._h.get(name); if (!a) { a = []; this._h.set(name, a); } a.push(fn); return () => this.off(name, fn); },
  once(name, fn) { const off = this.on(name, (...a) => { off(); fn(...a); }); return off; },
  off(name, fn) { const a = this._h.get(name); if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
  emit(name, data = {}) {
    this.log.push([name, performance.now()]); if (this.log.length > 200) this.log.shift();
    const a = this._h.get(name); if (a) for (const fn of a.slice()) { try { fn(data, name); } catch (e) { console.error('EventBus handler for ' + name, e); } }
    const any = this._h.get('*'); if (any) for (const fn of any.slice()) { try { fn(data, name); } catch (e) { console.error(e); } }
  },
};
// physics layers: every collider in the world is tagged with one of these
const Layers = Object.freeze({ Default: 0, Road: 1, Obstacle: 2, Interactable: 3, Curb: 4, Water: 5 });
const LAYER_NAMES = Object.keys(Layers);
const Systems = {
  list: [],
  register(name, sys, priority = 50) { sys.name = name; sys.priority = priority; this.list.push(sys); this.list.sort((a, b) => a.priority - b.priority); return sys; },
  init() { for (const s of this.list) if (s.init && !s._inited) { s._inited = true; try { s.init(); } catch (e) { console.error('System init ' + s.name, e); } } },
  update(dt) { for (const s of this.list) if (s.update && s.enabled !== false) s.update(dt); },
  get(name) { return this.list.find(s => s.name === name); },
};
// trigger volumes (circles in the XZ plane, optionally restricted to an interior and a height band)
const Triggers = {
  list: [], inside: new Set(),
  add(t) { t.layer = Layers.Interactable; t.r = t.r || 2; this.list.push(t); return t; },
  remove(t) { const i = this.list.indexOf(t); if (i >= 0) this.list.splice(i, 1); this.inside.delete(t); },
  // world position test: interior triggers use the interior type, street triggers use null
  update(px, py, pz, interiorType) {
    let prompted = null;
    for (const t of this.list) {
      if (t.enabled === false || (t.interior || null) !== (interiorType || null)) { if (this.inside.has(t)) { this.inside.delete(t); if (t.onExit) t.onExit(); } continue; }
      const d = Math.hypot(px - t.x, pz - t.z), inY = t.y === undefined || Math.abs(py - t.y) < (t.hy || 3);
      const now = d < t.r && inY;
      if (now && !this.inside.has(t)) { this.inside.add(t); EventBus.emit('trigger:enter', { id: t.id }); if (t.onEnter) t.onEnter(); }
      else if (!now && this.inside.has(t)) { this.inside.delete(t); EventBus.emit('trigger:exit', { id: t.id }); if (t.onExit) t.onExit(); }
      if (now && t.prompt && !prompted) { const txt = typeof t.prompt === 'function' ? t.prompt() : t.prompt; if (txt) { prompted = t; promptAction(t.key || 'interact', txt); if (t.onUse && In.act(t.key || 'interact')) { t.onUse(); EventBus.emit('trigger:use', { id: t.id }); } } }
    }
    return prompted;
  },
};
// key labels for contextual prompts: "[F] Enter Vehicle", "[E] Interact"
const ACTION_KEYS = { interact: ['E', '→'], enter: ['F', '△'], gear: ['G', 'L3'], rides: ['T', 'D-pad ↓'] };
function promptAction(action, text) { const k = ACTION_KEYS[action] || ['E', '→']; prompt(`${key(k[0], k[1])} ${text}`); }
