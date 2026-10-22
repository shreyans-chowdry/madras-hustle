// ===================== PROCEDURAL TEXTURES: facade atlas, roads, billboards =====================
// Facade atlas: 4x4 tiles of 512px. Façade tiles = 3 bays x 2 floors; shop tiles = 3 bays x 1 floor.
// RGB = colour (plaster is near-white so vertex colours tint it), A = glass / lit mask.
const ATLAS = 2048, TILE = 512;
const SHOP_NAMES = ['SRI MURUGAN STORES', 'KAVERI SILKS', 'MOBILE WORLD', 'BIRYANI CENTRE', 'APOLLO MEDICALS', 'TEA STALL', 'LAKSHMI TEXTILES', 'GOLD JEWELLERY', 'SWEETS & SNACKS', 'HARDWARE', 'BAKERY', 'TIFFIN CENTRE', 'XEROX', 'OPTICALS', 'FANCY STORE', 'AGENCIES', 'ELECTRICALS', 'PROVISION STORE', 'SAREES', 'FOOTWEAR', 'MESS', 'TRAVELS', 'PHARMACY', 'SPARE PARTS', 'COOL DRINKS', 'FILTER COFFEE'];
const SIGN_BG = ['#c8251c', '#f2c41f', '#1f4fb3', '#178a45', '#ef7d16', '#f4f1e8', '#8a1e74', '#0f6e8c', '#d8326b', '#1a1a1a'];
function makeFacadeAtlas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = ATLAS; const x = cv.getContext('2d');
  const mk = document.createElement('canvas'); mk.width = mk.height = ATLAS; const m = mk.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, ATLAS, ATLAS);
  const R = rng(4242);
  const rr = (a, b) => a + R() * (b - a);
  const BAY = TILE / 3, FL = TILE / 2;
  function plaster(ox, oy, w, h, base = 232, amp = 16) {
    x.fillStyle = `rgb(${base},${base - 3},${base - 8})`; x.fillRect(ox, oy, w, h);
    for (let i = 0; i < w * h / 90; i++) { const v = base + (R() - 0.5) * amp * 2; x.fillStyle = `rgba(${v},${v - 4},${v - 10},0.35)`; x.fillRect(ox + R() * w, oy + R() * h, 1 + R() * 3, 1 + R() * 3); }
    for (let i = 0; i < 6; i++) { // monsoon stains
      const sx = ox + R() * w, sw = 6 + R() * 30, sy = oy + R() * h * 0.6;
      const g = x.createLinearGradient(0, sy, 0, sy + 60 + R() * 140); g.addColorStop(0, 'rgba(70,60,45,0.16)'); g.addColorStop(1, 'rgba(70,60,45,0)');
      x.fillStyle = g; x.fillRect(sx, sy, sw, 200);
    }
  }
  function glass(ox, oy, w, h, tint = [40, 52, 62], lit = true) {
    const g = x.createLinearGradient(ox, oy, ox + w * 0.6, oy + h);
    g.addColorStop(0, `rgb(${tint[0] + 50},${tint[1] + 60},${tint[2] + 70})`); g.addColorStop(0.45, `rgb(${tint[0]},${tint[1]},${tint[2]})`); g.addColorStop(1, `rgb(${tint[0] + 18},${tint[1] + 22},${tint[2] + 26})`);
    x.fillStyle = g; x.fillRect(ox, oy, w, h);
    // curtains
    if (R() < 0.6) { x.fillStyle = pick(['rgba(220,200,160,0.45)', 'rgba(180,90,70,0.4)', 'rgba(120,140,170,0.4)', 'rgba(230,230,220,0.5)']); x.fillRect(ox + (R() < 0.5 ? 0 : w * 0.55), oy, w * 0.45, h); }
    if (lit) { m.fillStyle = '#fff'; m.fillRect(ox, oy, w, h); }
  }
  function frame(ox, oy, w, h, c = '#f4f1ea', t = 5) { x.fillStyle = c; x.fillRect(ox - t, oy - t, w + t * 2, t); x.fillRect(ox - t, oy + h, w + t * 2, t * 1.4); x.fillRect(ox - t, oy, t, h); x.fillRect(ox + w, oy, t, h); }
  function grill(ox, oy, w, h, c = 'rgba(25,25,25,0.85)') { x.fillStyle = c; for (let i = 1; i < 6; i++) x.fillRect(ox + w * i / 6 - 1, oy, 2.5, h); x.fillRect(ox, oy + h * 0.5 - 1, w, 2.5); }
  function sunshade(ox, oy, w) { x.fillStyle = '#d2cdc2'; x.fillRect(ox - 14, oy - 16, w + 28, 11); const g = x.createLinearGradient(0, oy - 5, 0, oy + 26); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(ox - 12, oy - 5, w + 24, 30); }
  function slab(ox, oy, w) { x.fillStyle = 'rgba(120,110,95,0.35)'; x.fillRect(ox, oy, w, 7); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(ox, oy + 7, w, 2); }
  const T = (c, r) => [c * TILE, r * TILE];
  // ---- 0: residential with sunshades ----
  { const [ox, oy] = T(0, 0); plaster(ox, oy, TILE, TILE);
    for (let f = 0; f < 2; f++) for (let b = 0; b < 3; b++) { const wx = ox + b * BAY + 38, wy = oy + f * FL + 66, ww = BAY - 76, wh = 120; frame(wx, wy, ww, wh); glass(wx, wy, ww, wh); grill(wx, wy, ww, wh); sunshade(wx, wy, ww); }
    for (let f = 0; f < 2; f++) slab(ox, oy + f * FL + FL - 8, TILE); }
  // ---- 1: residential with balconies ----
  { const [ox, oy] = T(1, 0); plaster(ox, oy, TILE, TILE, 236);
    for (let f = 0; f < 2; f++) {
      const by = oy + f * FL;
      for (let b = 0; b < 3; b++) {
        const bx = ox + b * BAY;
        if (b !== 1) { glass(bx + 24, by + 40, BAY - 48, 170); frame(bx + 24, by + 40, BAY - 48, 170, '#ddd8cc', 4); }
        else { glass(bx + 44, by + 70, BAY - 88, 100); frame(bx + 44, by + 70, BAY - 88, 100); grill(bx + 44, by + 70, BAY - 88, 100); }
      }
      // balcony slab + railing spanning bays 0 and 2
      for (const b of [0, 2]) {
        const bx = ox + b * BAY + 6, bw = BAY - 12;
        x.fillStyle = '#cfc9bd'; x.fillRect(bx, by + 168, bw, 14);
        x.fillStyle = 'rgba(30,30,30,0.9)'; x.fillRect(bx, by + 168 + 14 - 70, bw, 4); for (let i = 0; i <= 10; i++) x.fillRect(bx + i * bw / 10 - 1, by + 112, 3, 56);
        if (R() < 0.6) { x.fillStyle = pick(['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#e8e2d0']); x.fillRect(bx + rr(10, bw - 60), by + 120, 40, 30); } // drying clothes
        if (R() < 0.5) { x.fillStyle = '#3b7a2a'; x.beginPath(); x.arc(bx + bw - 20, by + 158, 12, 0, TAU); x.fill(); } // potted plant
      }
      slab(ox, by + FL - 8, TILE);
    } }
  // ---- 2: residential with AC units and vents ----
  { const [ox, oy] = T(2, 0); plaster(ox, oy, TILE, TILE, 228);
    for (let f = 0; f < 2; f++) for (let b = 0; b < 3; b++) {
      const wx = ox + b * BAY + 34, wy = oy + f * FL + 56, ww = BAY - 68, wh = 110;
      frame(wx, wy, ww, wh, '#e9e5dd'); glass(wx, wy, ww, wh, [46, 50, 52]); grill(wx, wy, ww, wh);
      if ((f + b) % 2 === 0) { x.fillStyle = '#e4e4e0'; x.fillRect(wx + ww * 0.1, wy + wh + 24, ww * 0.8, 48); x.strokeStyle = '#8a8a86'; x.lineWidth = 3; x.beginPath(); x.arc(wx + ww * 0.35, wy + wh + 48, 16, 0, TAU); x.stroke(); }
      else { x.fillStyle = 'rgba(60,55,50,0.6)'; for (let i = 0; i < 4; i++) x.fillRect(wx + 10, wy - 40 + i * 7, ww - 20, 3); }
    }
    for (let f = 0; f < 2; f++) slab(ox, oy + f * FL + FL - 8, TILE); }
  // ---- 3: old house with shutters ----
  { const [ox, oy] = T(3, 0); plaster(ox, oy, TILE, TILE, 238, 22);
    for (let f = 0; f < 2; f++) for (let b = 0; b < 3; b++) {
      const wx = ox + b * BAY + 52, wy = oy + f * FL + 70, ww = BAY - 104, wh = 116, sc = pick(['#2f6b4f', '#2a5c8a', '#7a4a2a', '#5a7a3a']);
      glass(wx, wy, ww, wh, [30, 34, 36]); frame(wx, wy, ww, wh, '#f7f3ea', 6);
      x.fillStyle = sc; x.fillRect(wx - 30, wy, 24, wh); x.fillRect(wx + ww + 6, wy, 24, wh);
      x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 9; i++) { x.fillRect(wx - 30, wy + i * 13, 24, 2); x.fillRect(wx + ww + 6, wy + i * 13, 24, 2); }
    }
    x.fillStyle = 'rgba(150,80,60,0.25)'; x.fillRect(ox, oy + TILE - 30, TILE, 30); }
  // ---- 4: glass curtain wall ----
  { const [ox, oy] = T(0, 1); glass(ox, oy, TILE, TILE, [34, 64, 84]);
    m.fillStyle = '#fff'; m.fillRect(ox, oy, TILE, TILE);
    x.fillStyle = '#b9c0c4'; m.fillStyle = '#000';
    for (let i = 0; i <= 6; i++) { x.fillRect(ox + i * TILE / 6 - 3, oy, 6, TILE); m.fillRect(ox + i * TILE / 6 - 3, oy, 6, TILE); }
    for (let f = 0; f <= 2; f++) { x.fillRect(ox, oy + f * FL - 8, TILE, 16); m.fillRect(ox, oy + f * FL - 8, TILE, 16); }
    for (let i = 0; i < 24; i++) { x.fillStyle = `rgba(255,255,255,${0.04 + R() * 0.06})`; x.fillRect(ox + R() * TILE, oy + R() * TILE, 40 + R() * 80, 20 + R() * 60); } }
  // ---- 5: office ribbon windows ----
  { const [ox, oy] = T(1, 1); plaster(ox, oy, TILE, TILE, 214, 8);
    for (let f = 0; f < 2; f++) { const wy = oy + f * FL + 76; glass(ox, wy, TILE, 120, [38, 56, 70]); x.fillStyle = '#9aa3a8'; for (let i = 0; i <= 9; i++) x.fillRect(ox + i * TILE / 9 - 2, wy, 4, 120); } }
  // ---- 6: office grid ----
  { const [ox, oy] = T(2, 1); plaster(ox, oy, TILE, TILE, 205, 10);
    for (let f = 0; f < 2; f++) for (let b = 0; b < 6; b++) { const wx = ox + b * TILE / 6 + 14, wy = oy + f * FL + 50, ww = TILE / 6 - 28, wh = 150; glass(wx, wy, ww, wh, [44, 58, 66]); }
    for (let f = 0; f < 2; f++) slab(ox, oy + f * FL + FL - 8, TILE); }
  // ---- 7: mall / showroom ----
  { const [ox, oy] = T(3, 1); x.fillStyle = '#cfd4d6'; x.fillRect(ox, oy, TILE, TILE);
    glass(ox + 20, oy + 30, TILE - 40, FL * 2 - 80, [30, 52, 70]); x.fillStyle = '#e8ecee'; for (let i = 0; i <= 4; i++) x.fillRect(ox + 20 + i * (TILE - 40) / 4 - 4, oy + 30, 8, FL * 2 - 80); x.fillRect(ox + 20, oy + FL - 4, TILE - 40, 10); }
  // ---- 8-11: shopfronts (1 floor) ----
  for (let k = 0; k < 4; k++) {
    const [ox, oy] = T(k, 2);
    plaster(ox, oy, TILE, TILE, 210, 14);
    let sx = ox;
    while (sx < ox + TILE - 20) {
      const w = Math.min(ox + TILE - sx, rr(150, 260));
      const bg = pick(SIGN_BG), dark = bg === '#f4f1e8' || bg === '#f2c41f';
      // sign board
      x.fillStyle = bg; x.fillRect(sx + 4, oy + 26, w - 8, 120); m.fillStyle = '#fff'; m.fillRect(sx + 4, oy + 26, w - 8, 120);
      x.fillStyle = dark ? '#1a1a1a' : '#fff8e8'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const name = pick(SHOP_NAMES); let fs = 44; x.font = `900 ${fs}px "Arial Black", Impact, sans-serif`;
      while (x.measureText(name).width > w - 26 && fs > 16) { fs -= 2; x.font = `900 ${fs}px "Arial Black", Impact, sans-serif`; }
      x.fillText(name, sx + w / 2, oy + 78);
      x.font = `700 18px Arial, sans-serif`; x.fillText(pick(['Since 1985', 'Wholesale & Retail', 'Ph: 2819 ' + Math.floor(1000 + R() * 8999), 'A/C', 'Open 9am – 10pm', 'All Varieties']), sx + w / 2, oy + 124);
      // shutter or open shop
      const open = R() < 0.55;
      if (open) {
        x.fillStyle = '#2a2018'; x.fillRect(sx + 8, oy + 160, w - 16, 330);
        for (let i = 0; i < 26; i++) { x.fillStyle = pick(['#e8c040', '#c84030', '#3a7ad0', '#40a060', '#f0f0e0', '#d07030']); x.fillRect(sx + 14 + R() * (w - 40), oy + 180 + R() * 240, 10 + R() * 18, 12 + R() * 20); }
        x.fillStyle = 'rgba(255,240,200,0.18)'; x.fillRect(sx + 8, oy + 160, w - 16, 330);
        m.fillStyle = '#fff'; m.fillRect(sx + 8, oy + 160, w - 16, 330);
      } else {
        x.fillStyle = '#7d8084'; x.fillRect(sx + 8, oy + 160, w - 16, 330);
        for (let i = 0; i < 40; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)'; x.fillRect(sx + 8, oy + 160 + i * 8.25, w - 16, 3); }
        x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(sx + w / 2 - 12, oy + 470, 24, 8);
      }
      x.fillStyle = '#d8d2c4'; x.fillRect(sx, oy + 150, 8, 362); // pillar
      sx += w;
    }
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(ox, oy + 146, TILE, 10);
  }
  // ---- 12: Indo-Saracenic red brick with arches ----
  { const [ox, oy] = T(0, 3); x.fillStyle = '#b4523a'; x.fillRect(ox, oy, TILE, TILE);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,220,200'},0.06)`; x.fillRect(ox + R() * TILE, oy + R() * TILE, 14, 5); }
    for (let f = 0; f < 2; f++) { x.fillStyle = '#efe6d4'; x.fillRect(ox, oy + f * FL + FL - 22, TILE, 18); x.fillRect(ox, oy + f * FL, TILE, 8);
      for (let b = 0; b < 3; b++) { const cx = ox + b * BAY + BAY / 2, wy = oy + f * FL + 70, ww = BAY - 70, wh = 140;
        x.fillStyle = '#efe6d4'; x.beginPath(); x.moveTo(cx - ww / 2 - 10, wy + wh); x.lineTo(cx - ww / 2 - 10, wy + 20); x.arc(cx, wy + 20, ww / 2 + 10, Math.PI, 0); x.lineTo(cx + ww / 2 + 10, wy + wh); x.fill();
        x.fillStyle = '#2a2a2c'; x.beginPath(); x.moveTo(cx - ww / 2, wy + wh); x.lineTo(cx - ww / 2, wy + 20); x.arc(cx, wy + 20, ww / 2, Math.PI, 0); x.lineTo(cx + ww / 2, wy + wh); x.fill();
        m.fillStyle = '#fff'; m.fillRect(cx - ww / 2, wy + 10, ww, wh - 10); } } }
  // ---- 13: white colonial ----
  { const [ox, oy] = T(1, 3); plaster(ox, oy, TILE, TILE, 240, 10);
    for (let f = 0; f < 2; f++) for (let b = 0; b < 3; b++) { const wx = ox + b * BAY + 46, wy = oy + f * FL + 50, ww = BAY - 92, wh = 170;
      x.fillStyle = '#3e5f4a'; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 14; i++) x.fillRect(wx, wy + i * 12, ww, 2);
      frame(wx, wy, ww, wh, '#ffffff', 8); x.fillStyle = '#e2dccf'; x.fillRect(wx - 20, wy - 26, ww + 40, 14); }
    for (let f = 0; f < 2; f++) slab(ox, oy + f * FL + FL - 8, TILE); }
  // ---- 14: temple wall (red and white stripes) ----
  { const [ox, oy] = T(2, 3); for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#f3efe6' : '#b8382a'; x.fillRect(ox + i * TILE / 12, oy, TILE / 12, TILE); }
    x.fillStyle = 'rgba(80,60,40,0.18)'; x.fillRect(ox, oy + TILE - 60, TILE, 60); }
  // ---- 15: plain plaster ----
  { const [ox, oy] = T(3, 3); plaster(ox, oy, TILE, TILE, 236, 14); }
  // combine colour + mask into an RGBA DataTexture (avoids premultiplied alpha loss)
  const c = x.getImageData(0, 0, ATLAS, ATLAS).data, k = m.getImageData(0, 0, ATLAS, ATLAS).data;
  for (let i = 3; i < c.length; i += 4) c[i] = k[i - 1];
  const tex = new THREE.DataTexture(new Uint8Array(c.buffer), ATLAS, ATLAS, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8; tex.flipY = false; tex.needsUpdate = true;
  return tex;
}
function canvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); draw(x, size);
  const t = new THREE.CanvasTexture(c); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function speckle(x, s, base, amp, n, sizeMax = 3) {
  for (let i = 0; i < n; i++) { const v = base + (Math.random() - 0.5) * amp * 2; x.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`; const z = 1 + Math.random() * sizeMax; x.fillRect(Math.random() * s, Math.random() * s, z, z); }
}
const asphaltTex = () => canvasTex(512, (x, s) => {
  x.fillStyle = '#d2d2d2'; x.fillRect(0, 0, s, s); speckle(x, s, 205, 50, 26000, 2);
  for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`; x.beginPath(); x.ellipse(Math.random() * s, Math.random() * s, 20 + Math.random() * 70, 10 + Math.random() * 40, Math.random() * 3, 0, TAU); x.fill(); }
  for (let i = 0; i < 5; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '20,20,20' : '240,240,240'},0.07)`; x.fillRect(Math.random() * s, Math.random() * s, 40 + Math.random() * 100, 30 + Math.random() * 60); } // patches
  x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { let px = Math.random() * s, py = Math.random() * s; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 8; j++) { px += (Math.random() - 0.5) * 30; py += (Math.random() - 0.5) * 30; x.lineTo(px, py); } x.stroke(); }
});
const pavingTex = () => canvasTex(256, (x, s) => {
  x.fillStyle = '#d8d4cc'; x.fillRect(0, 0, s, s); speckle(x, s, 210, 30, 5000, 2);
  x.strokeStyle = 'rgba(80,70,60,0.35)'; x.lineWidth = 2;
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * s / 8, 0); x.lineTo(i * s / 8, s); x.stroke(); x.beginPath(); x.moveTo(0, i * s / 8); x.lineTo(s, i * s / 8); x.stroke(); }
  for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(60,50,40,0.08)'; x.fillRect(Math.floor(Math.random() * 8) * s / 8, Math.floor(Math.random() * 8) * s / 8, s / 8, s / 8); }
});
const dirtTex = () => canvasTex(512, (x, s) => {
  x.fillStyle = '#e4ddcf'; x.fillRect(0, 0, s, s); speckle(x, s, 215, 45, 30000, 2);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${Math.random() < 0.6 ? '90,75,55' : '255,250,240'},${0.04 + Math.random() * 0.06})`; x.beginPath(); x.arc(Math.random() * s, Math.random() * s, 10 + Math.random() * 60, 0, TAU); x.fill(); }
  for (let i = 0; i < 25; i++) { x.fillStyle = `rgba(70,100,40,${0.08 + Math.random() * 0.1})`; x.beginPath(); x.arc(Math.random() * s, Math.random() * s, 3 + Math.random() * 14, 0, TAU); x.fill(); }
});
const grassTex = () => canvasTex(256, (x, s) => {
  x.fillStyle = '#c8d8b0'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 9000; i++) { const g = 150 + Math.random() * 90; x.fillStyle = `rgba(${g * 0.75},${g},${g * 0.55},0.5)`; x.fillRect(Math.random() * s, Math.random() * s, 1, 2 + Math.random() * 3); }
  for (let i = 0; i < 20; i++) { x.fillStyle = 'rgba(120,100,60,0.12)'; x.beginPath(); x.arc(Math.random() * s, Math.random() * s, 5 + Math.random() * 25, 0, TAU); x.fill(); }
});
const sandTex = () => canvasTex(256, (x, s) => { x.fillStyle = '#efe4c8'; x.fillRect(0, 0, s, s); speckle(x, s, 225, 30, 9000, 2); });
const roofTex = () => canvasTex(256, (x, s) => {
  x.fillStyle = '#e0dcd4'; x.fillRect(0, 0, s, s); speckle(x, s, 210, 40, 7000, 3);
  for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(40,40,35,${0.05 + Math.random() * 0.1})`; x.beginPath(); x.ellipse(Math.random() * s, Math.random() * s, 10 + Math.random() * 50, 8 + Math.random() * 30, Math.random() * 3, 0, TAU); x.fill(); }
});
// billboards: 2x4 atlas of ad posters
const AD_TEXT = [['KAVERI', 'SILKS', 'Wedding Collection'], ['AMMA', 'BIRYANI', 'Now open 24 hrs'], ['VEL', 'MOBILES', 'Biggest sale of the year'], ['MADRAS', 'COFFEE', 'Pure filter coffee'], ['SURYA', 'JEWELLERS', 'Gold rate today'], ['CHENNAI', 'SUPER KINGS', 'Whistle podu!'], ['MARINA', 'MALL', 'Opening soon'], ['SAKTHI', 'TVs', 'Diwali offers']];
function makeBillboardAtlas() {
  return canvasTex(1024, (x, s) => {
    const W = s / 2, H = s / 4;
    AD_TEXT.forEach((t, i) => {
      const ox = (i % 2) * W, oy = Math.floor(i / 2) * H;
      const bg = ['#c8251c', '#178a45', '#1f4fb3', '#3b2416', '#f2c41f', '#f2c41f', '#0f6e8c', '#8a1e74'][i];
      const g = x.createLinearGradient(ox, oy, ox + W, oy + H); g.addColorStop(0, bg); g.addColorStop(1, '#111'); x.fillStyle = g; x.fillRect(ox, oy, W, H);
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.arc(ox + W * 0.8, oy + H * 0.5, H * 0.45, 0, TAU); x.fill();
      const fg = bg === '#f2c41f' ? '#1a1a1a' : '#fff6d8';
      x.fillStyle = fg; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.font = `900 46px "Arial Black", Impact, sans-serif`; x.fillText(t[0], ox + 24, oy + 76);
      x.font = `900 58px "Arial Black", Impact, sans-serif`; x.fillText(t[1], ox + 24, oy + 140);
      x.font = `700 22px Arial, sans-serif`; x.fillText(t[2], ox + 26, oy + 184);
      x.strokeStyle = '#ddd'; x.lineWidth = 6; x.strokeRect(ox + 3, oy + 3, W - 6, H - 6);
    });
  }, false);
}
