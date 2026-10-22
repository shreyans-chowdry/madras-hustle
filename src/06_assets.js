// ===================== ASSETS: Blender-built GLB models (tools/blender/build_assets.py) =====================
// Every model is optional: if a file fails to load the game keeps its procedural geometry for that object.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const Assets = {
  files: ['airliner', 'plane', 'heli', 'metro_front', 'metro_coach', 'car_super', 'palm', 'neem'],
  gltf: {}, paintCache: new Map(), loaded: false,
  // vehicle type -> model name
  VEHICLE: { airliner: 'airliner', plane: 'plane', heli: 'heli', policeheli: 'heli', super: 'car_super' },
  async load(onProgress) {
    const loader = new GLTFLoader(); let n = 0;
    await Promise.all(this.files.map(name => new Promise(res => {
      loader.load('assets/' + name + '.glb', g => {
        g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 1.2; } });
        this.gltf[name] = g.scene; n++; if (onProgress) onProgress(n / this.files.length); res();
      }, undefined, err => { console.warn('asset ' + name + ' not loaded, using procedural fallback', err && err.message); n++; res(); });
    })));
    this.loaded = true;
    EventBus.emit('assets:loaded', { count: Object.keys(this.gltf).length });
  },
  has(name) { return !!this.gltf[name]; },
  // per-vehicle clone with its own paint colour; returns handles the game animates
  vehicleModel(type, hex) {
    const name = this.VEHICLE[type]; if (!name || !this.gltf[name]) return null;
    const root = this.gltf[name].clone(true);
    const out = { root, gear: null, prop: null, rotor: null, doors: [], head: [], tail: [] };
    root.traverse(o => {
      if (o.name === 'Gear') out.gear = o; else if (o.name === 'Prop') out.prop = o; else if (o.name === 'Rotor') out.rotor = o;
      else if (/^Door[LR]\d$/.test(o.name)) out.doors.push(o);
      if (!o.isMesh) return;
      const mn = o.material && o.material.name;
      if (mn === 'Paint' && hex !== undefined) o.material = this.paint(hex, o.material);
      else if (mn === 'Headlights') { o.material = o.material.clone(); out.head.push(o.material); }
      else if (mn === 'Taillights') { o.material = o.material.clone(); out.tail.push(o.material); }
    });
    return out;
  },
  paint(hex, base) {
    let m = this.paintCache.get(hex);
    if (!m) { m = base.clone(); m.color.setHex(hex); this.paintCache.set(hex, m); }
    return m;
  },
  // metro coach clone with sliding-door handles (base positions remembered)
  coach(front) {
    const g = this.gltf[front ? 'metro_front' : 'metro_coach']; if (!g) return null;
    const root = g.clone(true); const doors = [];
    root.traverse(o => { if (/^Door[LR]\d$/.test(o.name)) { o.userData.z0 = o.position.z; doors.push(o); } });
    return { root, doors };
  },
  // one merged, vertex-free geometry per material name (for instancing trees)
  mergedByMaterial(name) {
    const g = this.gltf[name]; if (!g) return null;
    g.updateMatrixWorld(true);
    const parts = {};
    g.traverse(o => {
      if (!o.isMesh) return;
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      for (const a of Object.keys(geo.attributes)) if (a !== 'position' && a !== 'normal') geo.deleteAttribute(a);
      (parts[o.material.name] = parts[o.material.name] || []).push(geo);
    });
    const out = {}; for (const k in parts) out[k] = mergeGeometries(parts[k]);
    return out;
  },
};
