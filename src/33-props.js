// ================= props: furniture and machinery, merged into each area's batch =================
const Screens = {};
function screenMat(kind) {
  if (Screens[kind]) return Screens[kind];
  const tex = canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#020604'; g.fillRect(0, 0, w, h);
    const r = mulberry32(kind.length * 977);
    g.font = 'bold 12px monospace';
    if (kind === 'code') {
      for (let y = 10; y < h; y += 10) { g.fillStyle = r() < 0.15 ? '#ffb02e' : '#3fe08a'; g.fillRect(6 + r() * 20, y, 30 + r() * 150, 3); }
    } else if (kind === 'graph') {
      g.strokeStyle = '#1a3a52'; g.lineWidth = 1; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, h); g.stroke(); }
      g.strokeStyle = '#4fb6ff'; g.lineWidth = 2; g.beginPath();
      for (let x = 0; x < w; x += 4) g.lineTo(x, h * 0.62 + Math.sin(x * 0.07) * 18 + r() * 14);
      g.stroke(); g.fillStyle = '#4fb6ff'; g.fillText('R-7  VITALS', 8, 14);
      g.strokeStyle = '#ff5a4a'; g.beginPath(); for (let x = 0; x < w; x += 4) g.lineTo(x, h * 0.35 + (x % 60 < 6 ? -26 : 0) + r() * 3); g.stroke();
    } else if (kind === 'error') {
      g.fillStyle = '#ff3b2f'; g.fillRect(0, 0, w, 24); g.fillStyle = '#ffd2cc'; g.font = 'bold 16px monospace'; g.fillText('CONTAINMENT FAULT', 10, 18);
      g.fillStyle = '#ff3b2f'; g.font = 'bold 11px monospace';
      ['CELL 04 .... BREACH', 'DOOR 7 ..... OPEN', 'SUBJECT ..... ?', 'POWER ....... LOW'].forEach((t, i) => g.fillText(t, 10, 44 + i * 16));
    } else if (kind === 'hack') {
      g.fillStyle = '#ffb02e'; g.font = 'bold 18px monospace'; g.fillText('BLAST DOOR', 12, 30); g.fillText('LOCKED', 12, 54);
      g.fillRect(12, 70, 230, 2); g.font = 'bold 14px monospace'; g.fillText('> OVERRIDE_', 12, 96);
    } else if (kind === 'static') {
      for (let i = 0; i < 2600; i++) { const v = r() * 255 | 0; g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(r() * w, r() * h, 2, 2); }
      g.fillStyle = 'rgba(0,0,0,0.4)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
    } else if (kind === 'cam') {
      g.fillStyle = '#0c120e'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2a3a30'; g.fillRect(40, 40, 170, 100); g.fillStyle = '#060806'; g.fillRect(110, 60, 30, 80);
      g.fillStyle = '#c9d8cf'; g.fillText('CAM 04  CELL', 8, 14); g.fillText('REC', 210, 14);
      g.fillStyle = '#ff3b2f'; g.beginPath(); g.arc(202, 10, 4, 0, 6.28); g.fill();
      for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(200,220,210,' + r() * 0.15 + ')'; g.fillRect(r() * w, r() * h, 1, 1); }
    } else {
      g.fillStyle = '#060908'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  });
  const dark = kind === 'dark';
  const m = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: dark ? 0x000000 : 0xffffff, emissiveMap: dark ? null : tex, map: dark ? tex : null, emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.1 });
  Screens[kind] = m;
  return m;
}
let ledTexture = null;
function ledMat() {
  if (Tex.mats.__led) return Tex.mats.__led;
  ledTexture = canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const r = mulberry32(77);
    for (let y = 6; y < h; y += 12) {
      g.fillStyle = '#0d0f12'; g.fillRect(4, y - 4, w - 8, 10);
      for (let x = 10; x < w - 8; x += 12) if (r() < 0.4) { const c = r(); g.fillStyle = c < 0.6 ? '#3cff7a' : c < 0.85 ? '#4aa8ff' : c < 0.95 ? '#ffb02e' : '#ff3b2f'; g.fillRect(x, y, 4, 3); }
    }
  });
  ledTexture.wrapS = ledTexture.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.45, metalness: 0.6, emissive: 0xffffff, emissiveMap: ledTexture, emissiveIntensity: 2.2 });
  Tex.mats.__led = m;
  return m;
}
// small text labels and stencils
const Labels = {};
function labelMat(text, opts = {}) {
  const key = text + JSON.stringify(opts);
  if (Labels[key]) return Labels[key];
  const w = opts.w || 256, h = opts.h || 64;
  const tex = canvasTex(w, h, (g) => {
    if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
    g.fillStyle = opts.fg || '#e8e2d2'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = (opts.weight || '800') + ' ' + (opts.size || Math.floor(h * 0.62)) + 'px ' + (opts.font || '"Big Shoulders Stencil Display", Impact, sans-serif');
    g.fillText(text, w / 2, h / 2 + 2);
    const r = mulberry32(text.length * 17 + 3);
    for (let i = 0; i < w * h / 60; i++) { g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,' + r() * 0.6 + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    g.globalCompositeOperation = 'source-over';
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: !opts.bg, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, emissive: opts.glow ? new THREE.Color(opts.glow) : new THREE.Color(0), emissiveMap: opts.glow ? tex : null, emissiveIntensity: opts.glow ? (opts.gi || 1.5) : 0 });
  m.userData.noShadow = true;
  Labels[key] = m;
  return m;
}
const planeGeo = (w, h) => cachedGeo('plane' + w + ',' + h, () => new THREE.PlaneGeometry(w, h));

function propRot(L, gx, gz, ch) {
  const solid = (x, z) => !inGrid(L, x, z) || '#~|I'.includes(L.ch[z * L.W + x]);
  const same = (x, z) => inGrid(L, x, z) && L.ch[z * L.W + x] === ch;
  if ('R$bdqU'.includes(ch)) {
    if (same(gx - 1, gz) || same(gx + 1, gz) || (ch === 'U' && inGrid(L, gx - 1, gz) && '$U'.includes(L.ch[gz * L.W + gx - 1]))) {
      if ('dql$'.includes(ch)) { if (solid(gx, gz - 1)) return 0; if (solid(gx, gz + 1)) return Math.PI; }
      return 0;
    }
    if (same(gx, gz - 1) || same(gx, gz + 1)) {
      if ('dql$'.includes(ch)) { if (solid(gx - 1, gz)) return Math.PI / 2; if (solid(gx + 1, gz)) return -Math.PI / 2; }
      return Math.PI / 2;
    }
  }
  if (ch === 't') {
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (inGrid(L, gx + dx, gz + dz) && L.ch[(gz + dz) * L.W + gx + dx] === 'h') return Math.atan2(dx, dz);
  }
  for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (solid(gx + dx, gz + dz)) return Math.atan2(-dx, -dz);
  return 0;
}

// shared prop materials
const PM = {
  get laminate() { return mat('wood', { color: 0xc8baa4 }); },
  get steelFrame() { return mat('steelDark'); },
  get black() { return plainMat(0x121314, { roughness: 0.45, metalness: 0.2 }); },
  get plastic() { return plainMat(0x1d1f22, { roughness: 0.4 }); },
  get greyPlastic() { return plainMat(0x8e9092, { roughness: 0.45 }); },
  get rubber() { return plainMat(0x0c0c0d, { roughness: 0.92 }); },
  get paper() { return plainMat(0xe6e2d6, { roughness: 0.92 }); },
  get chrome() { return plainMat(0xb8bbbf, { roughness: 0.15, metalness: 1 }); },
  get glass() { return mat('steel', { color: 0xbfe0d8, transparent: true, opacity: 0.22, rough: 0.04, metal: 0.05, ws: false }); },
};

const PROP_BUILDERS = {
  t(B, f, c) { // desk: laminate top, steel frame, drawer pedestal, monitor and clutter
    const lab = c.theme === 'lab' || c.theme === 'server' || c.theme === 'contain';
    const top = lab ? mat('steel') : PM.laminate, frm = PM.steelFrame;
    f.cbox(B, top, 0, 0.735, 0, 1.0, 0.03, 0.66, 0.006);
    f.cbox(B, frm, 0, 0.71, 0, 0.94, 0.03, 0.6, 0.004);
    f.cbox(B, frm, -0.46, 0.36, -0.29, 0.04, 0.7, 0.04, 0.006); f.cbox(B, frm, -0.46, 0.36, 0.29, 0.04, 0.7, 0.04, 0.006);
    f.cbox(B, frm, -0.46, 0.03, 0, 0.05, 0.03, 0.62, 0.004);
    f.box(B, mat('metal', { color: 0x6c7074 }), 0, 0.42, -0.31, 0.88, 0.5, 0.012);
    // pedestal with three drawers, one pulled open
    const ped = mat('metal', { color: 0x7a7e82 });
    f.cbox(B, ped, 0.27, 0.36, 0.0, 0.4, 0.66, 0.56, 0.008);
    const open = c.rnd() < 0.35;
    for (let k = 0; k < 3; k++) {
      const y = 0.15 + k * 0.21, dz = open && k === 1 ? 0.22 : 0;
      f.cbox(B, ped, 0.27, y, 0.285 + dz, 0.38, 0.19, 0.02, 0.005);
      f.cbox(B, PM.chrome, 0.27, y + 0.05, 0.302 + dz, 0.12, 0.012, 0.012, 0.003);
      if (dz) { f.box(B, ped, 0.27, y - 0.05, 0.15 + dz * 0.5, 0.36, 0.1, 0.27); f.box(B, PM.paper, 0.27, y - 0.0, 0.15 + dz * 0.5, 0.3, 0.02, 0.22); }
    }
    if (c.rnd() < 0.85) {
      // monitor on a stand
      f.cbox(B, PM.plastic, 0, 0.758, -0.17, 0.22, 0.014, 0.16, 0.005);
      f.cbox(B, PM.plastic, 0, 0.87, -0.2, 0.05, 0.22, 0.03, 0.008);
      f.cbox(B, PM.black, 0, 1.06, -0.19, 0.56, 0.34, 0.035, 0.01);
      // somewhere with no power the screens are dead glass
      const kinds = THEMES[c.theme] && (THEMES[c.theme].blackout || THEMES[c.theme].broken) ? ['dark'] : c.theme === 'contain' ? ['error', 'cam', 'static'] : c.theme === 'lab' ? ['graph', 'code', 'dark'] : ['code', 'graph', 'dark', 'dark', 'static'];
      f.box(B, screenMat(kinds[Math.floor(c.rnd() * kinds.length)]), 0, 1.065, -0.171, 0.52, 0.3, 0.002);
      // keyboard and mouse
      f.cbox(B, PM.greyPlastic, -0.02, 0.76, 0.08, 0.44, 0.02, 0.15, 0.005, (c.rnd() - 0.5) * 0.15);
      f.cbox(B, PM.plastic, 0.3, 0.76, 0.1, 0.06, 0.025, 0.1, 0.01, c.rnd() - 0.5);
    }
    if (c.rnd() < 0.5) { f.cyl(B, plainMat(c.rnd() < 0.5 ? 0xd8d2c8 : 0x8a2a22, { roughness: 0.35 }), -0.38, 0.8, 0.12, 0.04, 0.036, 0.1, 14); f.torus(B, plainMat(0xd8d2c8, { roughness: 0.35 }), -0.33, 0.8, 0.12, 0.025, 0.007); }
    for (let k = 0; k < 1 + Math.floor(c.rnd() * 3); k++) f.box(B, PM.paper, -0.25 + c.rnd() * 0.1, 0.752 + k * 0.004, -0.02 + c.rnd() * 0.1, 0.21, 0.004, 0.3, c.rnd() - 0.5);
    if (c.rnd() < 0.4) { f.cbox(B, plainMat([0x2a4a7a, 0x7a2a22, 0x2a5a3a][Math.floor(c.rnd() * 3)], { roughness: 0.5 }), 0.4, 0.88, -0.25, 0.05, 0.26, 0.3, 0.006, 0.05); }
    if (c.rnd() < 0.35) { f.cbox(B, PM.plastic, -0.36, 0.78, -0.18, 0.18, 0.05, 0.2, 0.01, 0.3); f.cbox(B, PM.plastic, -0.36, 0.81, -0.14, 0.05, 0.02, 0.2, 0.008, 0.3); }
  },
  h(B, f, c) { // office chair, often knocked over
    const knocked = c.rnd() < 0.3;
    const fab = mat('fabric', { color: 0x23262b }), m = PM.steelFrame, pl = PM.plastic;
    const yaw = f.rot + Math.PI + (c.rnd() - 0.5) * 1.6;
    const ff = frame(f.ox + (c.rnd() - 0.5) * 0.2, f.oz + (c.rnd() - 0.5) * 0.2, yaw);
    if (c.L) addCollider(c.L, ff.ox, ff.oz, knocked ? 0.36 : 0.3);
    if (knocked) {
      // lying on its back: seat facing sideways
      ff.cbox(B, fab, 0, 0.24, 0, 0.48, 0.48, 0.08, 0.03, 0, 1, 0, 0);
      ff.cbox(B, fab, 0, 0.06, 0.32, 0.46, 0.08, 0.5, 0.03);
      ff.cyl(B, m, 0, 0.24, -0.22, 0.025, 0.025, 0.36, 10, Math.PI / 2);
      for (let k = 0; k < 5; k++) { const a = k * 1.2566; ff.cbox(B, pl, Math.sin(a) * 0.15, 0.24 + Math.cos(a) * 0.15, -0.42, 0.04, 0.03, 0.3, 0.006, 0, 1, 0, a); }
      return;
    }
    ff.cbox(B, fab, 0, 0.48, 0, 0.48, 0.08, 0.47, 0.03);
    ff.cbox(B, fab, 0, 0.82, 0.24, 0.46, 0.5, 0.07, 0.03, 0, 1, -0.1);
    ff.cbox(B, pl, 0, 0.6, 0.21, 0.06, 0.25, 0.04, 0.01, 0, 1, -0.15);
    for (const s of [-1, 1]) { ff.cbox(B, pl, s * 0.25, 0.64, 0.02, 0.05, 0.03, 0.26, 0.01); ff.cbox(B, pl, s * 0.25, 0.55, 0.08, 0.03, 0.18, 0.03, 0.006); }
    ff.cyl(B, m, 0, 0.29, 0, 0.022, 0.022, 0.36, 10);
    ff.cyl(B, pl, 0, 0.38, 0, 0.04, 0.04, 0.12, 12);
    for (let k = 0; k < 5; k++) {
      const a = k * 1.2566 + 0.3;
      ff.cbox(B, pl, Math.sin(a) * 0.15, 0.08, Math.cos(a) * 0.15, 0.04, 0.035, 0.3, 0.008, a);
      ff.cyl(B, PM.rubber, Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29, 0.025, 0.025, 0.02, 10, Math.PI / 2, 0);
    }
  },
  U(B, f, c) { // pallet racking with nothing on the bottom tier: a low gap you can crawl through
    palletRack(B, f, c, true);
    if (c.L) for (const [x, z] of [[-0.48, -0.45], [0.48, -0.45], [-0.48, 0.45], [0.48, 0.45]]) { const p = f.w(x, 0, z); addCollider(c.L, p[0], p[2], 0.07); }
  },
  $(B, f, c) { // shelving: dock pallet racking, elsewhere steel shelves of boxes and binders
    if (c.theme === 'dock') return palletRack(B, f, c);
    const post = PM.steelFrame, shelf = mat('metal', { color: 0x80868c });
    const H = 2.0;
    for (const [x, z] of [[-0.47, -0.27], [0.47, -0.27], [-0.47, 0.27], [0.47, 0.27]]) { f.cbox(B, post, x, H / 2, z, 0.035, H, 0.035, 0.004); }
    f.box(B, post, -0.47, H / 2, 0, 0.01, H - 0.2, 0.5);
    f.box(B, post, 0.47, H / 2, 0, 0.01, H - 0.2, 0.5);
    for (const y of [0.1, 0.62, 1.12, 1.6, 1.98]) {
      f.cbox(B, shelf, 0, y, 0, 0.98, 0.025, 0.58, 0.005);
      if (y > 1.9) continue;
      let x = -0.43;
      while (x < 0.41) {
        const r = c.rnd();
        if (r < 0.5) { // cardboard box
          const w = 0.2 + c.rnd() * 0.22, h = 0.18 + c.rnd() * 0.24, d = 0.3 + c.rnd() * 0.2;
          f.cbox(B, mat('card'), x + w / 2, y + 0.013 + h / 2, (c.rnd() - 0.5) * 0.08, w, h, d, 0.006, (c.rnd() - 0.5) * 0.15, 0.5);
          x += w + 0.02;
        } else if (r < 0.75) { // binders
          const n = 3 + Math.floor(c.rnd() * 5), col = [0x2a4a7a, 0x7a2a22, 0x2a5a3a, 0x1d1f22, 0xc8a83a][Math.floor(c.rnd() * 5)];
          for (let k = 0; k < n && x < 0.43; k++) { f.cbox(B, plainMat(col, { roughness: 0.55 }), x + 0.03, y + 0.16, -0.05, 0.05, 0.3, 0.26, 0.004, 0, 1, 0, k === n - 1 && c.rnd() < 0.5 ? 0.25 : 0); x += 0.055; }
          x += 0.03;
        } else if (r < 0.88) { // plastic bin
          const w = 0.3;
          f.cbox(B, plainMat(c.rnd() < 0.5 ? 0x2a5a8a : 0x5a5e62, { roughness: 0.45 }), x + w / 2, y + 0.11, 0, w, 0.2, 0.42, 0.015);
          x += w + 0.03;
        } else x += 0.12 + c.rnd() * 0.15;
      }
    }
  },
  l(B, f, c) { // a pair of lockers with louvres; sometimes one hangs open
    const body = mat('metal', { color: c.theme === 'contain' ? 0x5a6066 : c.rnd() < 0.5 ? 0x6f8090 : 0x7a8a6e });
    f.cbox(B, body, 0, 0.98, -0.18, 0.98, 1.96, 0.5, 0.01);
    f.cbox(B, PM.steelFrame, 0, 0.04, -0.15, 0.96, 0.08, 0.5, 0.005);
    const openOne = c.rnd() < 0.35 ? (c.rnd() < 0.5 ? 0 : 1) : -1;
    [-0.245, 0.245].forEach((x, i) => {
      if (i === openOne) {
        // inside: shelf, a coat, boots
        f.box(B, plainMat(0x18191b), x, 1.0, 0.0, 0.44, 1.78, 0.02);
        f.box(B, body, x, 1.62, -0.12, 0.44, 0.02, 0.4);
        f.cbox(B, mat('fabric', { color: [0x3a4250, 0x6a5a3a, 0x7a2a22][Math.floor(c.rnd() * 3)] }), x, 1.12, -0.14, 0.34, 0.8, 0.14, 0.05, 0, 1, 0.05);
        f.cbox(B, PM.rubber, x - 0.08, 0.16, -0.1, 0.11, 0.14, 0.26, 0.03); f.cbox(B, PM.rubber, x + 0.08, 0.16, -0.12, 0.11, 0.14, 0.26, 0.03, 0.2);
        const hf = frame(...f.at(x + 0.23, 0.07), f.rot - 1.9);
        hf.cbox(B, body, -0.22, 0.98, 0, 0.45, 1.84, 0.02, 0.004);
        return;
      }
      f.cbox(B, body, x, 0.98, 0.075, 0.46, 1.84, 0.02, 0.004);
      for (let k = 0; k < 6; k++) f.box(B, plainMat(0x0e0f10), x, 1.72 - k * 0.035, 0.087, 0.28, 0.012, 0.004);
      for (let k = 0; k < 6; k++) f.box(B, plainMat(0x0e0f10), x, 0.32 - k * 0.035, 0.087, 0.28, 0.012, 0.004);
      f.cbox(B, PM.chrome, x + 0.17, 1.0, 0.092, 0.025, 0.14, 0.02, 0.004);
      f.box(B, labelMat(String(10 + Math.floor(c.rnd() * 80)), { bg: '#d8d4c8', fg: '#222', w: 64, h: 32, font: 'monospace', weight: '700' }), x, 1.5, 0.087, 0.07, 0.035, 0.002);
    });
  },
  x(B, f, c) { // wooden crate with battens, stencils and steel corners
    const s = 0.78 + c.rnd() * 0.16, ff = frame(f.ox + (c.rnd() - 0.5) * 0.12, f.oz + (c.rnd() - 0.5) * 0.12, f.rot + (c.rnd() - 0.5) * 0.5);
    crate(B, ff, 0, 0, s, s * (0.85 + c.rnd() * 0.2), s, c.rnd);
    if (c.rnd() < 0.4) { const s2 = s * 0.6; crate(B, ff, (c.rnd() - 0.5) * 0.1, s * 0.95, s2, s2, s2, c.rnd, c.rnd() - 0.5); }
  },
  o(B, f, c) { // steel drum: rolling hoops, lid, bungs; some lie on their side in a spill
    const col = [0x2c4a7a, 0x8a2a1c, 0x3a5a3a, 0x6a6e72][Math.floor(c.rnd() * 4)];
    const m = c.rnd() < 0.4 ? mat('rust') : mat('metal', { color: col });
    const ff = frame(f.ox + (c.rnd() - 0.5) * 0.15, f.oz + (c.rnd() - 0.5) * 0.15, c.rnd() * 6.28);
    if (c.rnd() < 0.2) {
      ff.cyl(B, m, 0, 0.29, 0, 0.29, 0.29, 0.88, 24, Math.PI / 2);
      for (const z of [-0.44, -0.15, 0.15]) ff.cyl(B, mat('steelDark'), 0, 0.29, z, 0.3, 0.3, 0.025, 24, Math.PI / 2);
      ff.geo(B, decalMat('oil'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), 0.2, 0.006, 0.7);
      return;
    }
    ff.cyl(B, m, 0, 0.44, 0, 0.29, 0.29, 0.86, 24);
    for (const y of [0.29, 0.58]) ff.cyl(B, mat('steelDark'), 0, y, 0, 0.3, 0.3, 0.025, 24);
    ff.cyl(B, mat('steelDark'), 0, 0.875, 0, 0.295, 0.295, 0.02, 24);
    ff.cyl(B, mat('steelDark'), 0.15, 0.89, 0.05, 0.03, 0.03, 0.02, 10);
    ff.cyl(B, mat('steelDark'), -0.18, 0.89, -0.08, 0.02, 0.02, 0.02, 10);
    if (c.rnd() < 0.5) ff.geo(B, labelMat('☢', { bg: '#e2ad3b', fg: '#141414', w: 64, h: 64, font: 'sans-serif' }), planeGeo(0.18, 0.18), 0, 0.6, 0.292);
  },
  b(B, f, c) { // lab bench: cabinets, black epoxy top, reagent shelf, glassware
    const cab = plainMat(0xd8dcdc, { roughness: 0.55 });
    f.cbox(B, cab, 0, 0.45, 0, 0.98, 0.84, 0.66, 0.01);
    f.box(B, plainMat(0x1a1c1e), 0, 0.04, 0.29, 0.98, 0.08, 0.02);
    for (const x of [-0.245, 0.245]) {
      f.cbox(B, cab, x, 0.47, 0.335, 0.46, 0.7, 0.02, 0.004);
      f.cbox(B, PM.chrome, x + (x < 0 ? 0.18 : -0.18), 0.68, 0.35, 0.02, 0.12, 0.02, 0.004);
    }
    f.cbox(B, plainMat(0x16181a, { roughness: 0.18 }), 0, 0.89, 0, 1.0, 0.035, 0.72, 0.008);
    if (c.rnd() < 0.65) {
      const glass = PM.glass;
      for (let k = 0; k < 4; k++) {
        const x = -0.38 + k * 0.17 + c.rnd() * 0.05, z = (c.rnd() - 0.5) * 0.4;
        if (c.rnd() < 0.5) { f.cyl(B, glass, x, 0.97, z, 0.035, 0.045, 0.14, 14); f.cyl(B, plainMat([0x3a8a6a, 0x8a3a2a, 0xc8b83a][k % 3], { roughness: 0.2, transparent: true, opacity: 0.7, ws: false }), x, 0.94, z, 0.033, 0.043, 0.07, 14); }
        else { f.cyl(B, glass, x, 0.99, z, 0.012, 0.012, 0.15, 10); f.sphere(B, glass, x, 0.94, z, 0.05, 0.9); }
      }
      if (c.rnd() < 0.5) microscope(B, frame(...f.at(0.28, 0.05), f.rot + c.rnd()));
      else f.cbox(B, plainMat(0x30363a, { roughness: 0.4 }), 0.25, 0.97, 0.05, 0.3, 0.12, 0.25, 0.02);
    }
  },
  R(B, f, c) { // server rack: frame, perforated doors, blinking units, cable bundles behind
    const body = mat('metalDark', { color: 0x24272b });
    f.cbox(B, body, 0, 1.0, 0, 0.98, 2.0, 0.92, 0.01);
    for (const s of [1, -1]) {
      f.box(B, ledMat(), 0, 1.0, s * 0.462, 0.84, 1.8, 0.004, s < 0 ? Math.PI : 0);
      f.box(B, plainMat(0x0a0b0c, { roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.55, ws: false }), 0, 1.0, s * 0.472, 0.88, 1.86, 0.006);
      f.cbox(B, PM.chrome, 0.4, 1.05, s * 0.48, 0.02, 0.3, 0.02, 0.004);
    }
    f.cbox(B, plainMat(0x0d0e10), 0, 2.03, 0, 0.98, 0.06, 0.92, 0.008);
    for (let k = 0; k < 2; k++) f.cyl(B, plainMat(0x1a1b1d, { roughness: 0.5 }), -0.2 + k * 0.4, 2.06, 0, 0.09, 0.09, 0.02, 16);
  },
  g(B, f, c) { // gurney: wheels, rails, mattress, often a covered body
    const ff = frame(f.ox, f.oz, f.rot + (c.rnd() - 0.5) * 0.4);
    if (c.L) for (const x of [-0.7, 0, 0.7]) { const p = ff.w(x, 0, 0); addCollider(c.L, p[0], p[2], 0.33); }
    const m = mat('steel');
    for (const [x, z] of [[-0.82, -0.26], [0.82, -0.26], [-0.82, 0.26], [0.82, 0.26]]) {
      ff.cyl(B, m, x, 0.42, z, 0.016, 0.016, 0.64, 8);
      ff.cyl(B, PM.rubber, x, 0.06, z, 0.055, 0.055, 0.035, 14, Math.PI / 2);
    }
    ff.cbox(B, m, 0, 0.12, 0, 1.7, 0.03, 0.06, 0.006);
    ff.cbox(B, m, 0, 0.74, 0, 1.92, 0.04, 0.62, 0.008);
    ff.cbox(B, plainMat(0x7a8a92, { roughness: 0.7 }), 0, 0.8, 0, 1.86, 0.08, 0.58, 0.03);
    for (const s of [-1, 1]) ff.cyl(B, m, 0, 0.92, s * 0.3, 0.012, 0.012, 1.5, 8, 0, Math.PI / 2);
    if (c.rnd() < 0.7) {
      const sheet = mat('fabric', { color: 0xd8d6cc });
      ff.cbox(B, sheet, 0.12, 0.92, 0, 1.3, 0.2, 0.44, 0.09);
      ff.sphere(B, sheet, -0.7, 0.94, 0, 0.14, 0.85);
      ff.cbox(B, sheet, 0, 0.85, 0, 1.94, 0.04, 0.64, 0.015);
      for (let k = 0; k < 2; k++) ff.cbox(B, sheet, 0.3 + k * 0.3, 0.73, 0.33, 0.25, 0.2, 0.01, 0.004);
      if (c.rnd() < 0.5) ff.geo(B, decalMat('blood'), cachedGeo('decalSheet', () => new THREE.PlaneGeometry(0.6, 0.6).rotateX(-Math.PI / 2)), 0.2, 1.025, 0.05, c.rnd() * 6);
      if (c.rnd() < 0.4) { // a hand hangs out from under the sheet
        ff.cyl(B, mat('skin', { color: 0xb8a898 }), 0.25, 0.7, 0.33, 0.025, 0.03, 0.3, 8, 0.1);
        ff.cbox(B, mat('skin', { color: 0xb8a898 }), 0.25, 0.53, 0.34, 0.07, 0.1, 0.03, 0.012);
      }
    }
  },
  d(B, f, c) { // morgue drawer bank: stainless doors, latches, name cards
    const m = mat('steel');
    f.cbox(B, mat('steelDark'), 0, 1.05, -0.15, 1.0, 2.1, 0.7, 0.01);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) {
      const y = 0.4 + r * 0.66, x = -0.25 + k * 0.5;
      const pulled = c.rnd() < 0.06;
      if (pulled) {
        // an empty drawer pulled all the way out
        f.box(B, plainMat(0x060606), x, y, 0.2, 0.42, 0.56, 0.01);
        f.cbox(B, m, x, y - 0.22, 0.75, 0.44, 0.03, 1.1, 0.008);
        f.cbox(B, m, x, y + 0.05, 1.29, 0.46, 0.58, 0.03, 0.006);
        continue;
      }
      f.cbox(B, m, x, y, 0.21, 0.46, 0.6, 0.025, 0.006);
      f.cbox(B, PM.chrome, x, y + 0.18, 0.235, 0.2, 0.035, 0.035, 0.008);
      f.box(B, labelMat(['J. DOE', 'M. REYES', 'UNKNOWN', 'K. PARK', 'A. NOVAK', '—'][Math.floor(c.rnd() * 6)], { bg: '#e2ddd0', fg: '#222', w: 128, h: 48, font: 'monospace', weight: '700', size: 18 }), x - 0.11, y - 0.18, 0.225, 0.12, 0.045, 0.002);
    }
  },
  p(B, f, c) { // a run of vertical pipes with flanges, a valve and a gauge
    const m = c.rnd() < 0.5 ? mat('rust') : mat('metal', { color: [0x3a5a4a, 0x2c4a7a, 0x7a6a3a][Math.floor(c.rnd() * 3)] });
    const H = c.ceil;
    f.cyl(B, m, -0.18, H / 2, -0.12, 0.13, 0.13, H, 20, 0, 0, 1.2);
    f.cyl(B, m, 0.2, H / 2, 0.12, 0.08, 0.08, H, 16, 0, 0, 1.2);
    for (const y of [0.3, 1.5, Math.min(2.7, H - 0.4)]) { f.cyl(B, mat('steelDark'), -0.18, y, -0.12, 0.18, 0.18, 0.05, 20); f.cyl(B, mat('steelDark'), 0.2, y + 0.4, 0.12, 0.12, 0.12, 0.04, 16); }
    // valve wheel and gauge
    f.cyl(B, mat('steelDark'), -0.18, 1.2, 0.05, 0.03, 0.03, 0.2, 8, Math.PI / 2);
    f.torus(B, plainMat(0xa0281c, { roughness: 0.5, metalness: 0.4 }), -0.18, 1.2, 0.16, 0.13, 0.016, 0);
    f.cyl(B, plainMat(0xc8c8c0, { roughness: 0.3 }), 0.2, 1.7, 0.21, 0.06, 0.06, 0.03, 16, Math.PI / 2);
  },
  q(B, f, c) { // control console: sloped desk with screens, switches and a chair
    const m = mat('metalDark', { color: 0x3a3e44 });
    f.cbox(B, m, 0, 0.42, 0.06, 0.98, 0.84, 0.58, 0.01);
    f.cbox(B, plainMat(0x15171a, { roughness: 0.35 }), 0, 0.88, 0.1, 1.0, 0.05, 0.62, 0.008, 0, 1, -0.22);
    f.cbox(B, m, 0, 1.18, -0.2, 0.98, 0.56, 0.12, 0.01);
    const kinds = c.theme === 'contain' ? ['error', 'cam', 'static'] : ['code', 'graph', 'cam'];
    for (const x of [-0.24, 0.24]) {
      f.box(B, PM.black, x, 1.2, -0.135, 0.42, 0.34, 0.02);
      f.box(B, screenMat(kinds[Math.floor(c.rnd() * kinds.length)]), x, 1.2, -0.124, 0.38, 0.29, 0.002);
    }
    for (let k = 0; k < 10; k++) f.box(B, basicMat(['#3cff7a', '#ff3b2f', '#ffb02e', '#3a3a3a'][Math.floor(c.rnd() * 4)]), -0.4 + k * 0.09, 0.92, 0.25, 0.025, 0.012, 0.025);
    for (let k = 0; k < 6; k++) f.cyl(B, PM.chrome, -0.3 + k * 0.12, 0.93, 0.05, 0.015, 0.015, 0.03, 8);
  },
  Q(B, f, c) {
    PROP_BUILDERS.q(B, f, c);
    f.box(B, screenMat('hack'), 0.24, 1.2, -0.122, 0.38, 0.29, 0.003);
  },
};

// wooden crate in a frame: w/h/d sizes, origin at the bottom centre
function crate(B, f, lx, ly, w, h, d, rnd, rot = 0, lite = false) {
  const ff = frame(...f.at(lx, 0), f.rot + rot);
  const wood = mat('wood'), dark = mat('wood', { color: 0x8a7a66 });
  ff.cbox(B, wood, 0, ly + h / 2, 0, w, h, d, 0.01, 0, 0.8);
  // battens around each face edge (plain boxes on crates nobody gets close to, up in the racking)
  const t = 0.05, o = 0.012;
  const bat = lite ? (lx2, ly2, lz2, bw, bh, bd, rz = 0) => ff.geo(B, dark, boxGeo(bw, bh, bd), lx2, ly2, lz2, 0, 0, rz)
    : (lx2, ly2, lz2, bw, bh, bd, rz = 0) => ff.cbox(B, dark, lx2, ly2, lz2, bw, bh, bd, 0.008, 0, 1, 0, rz);
  for (const s of [-1, 1]) {
    bat(0, ly + 0.05, s * (d / 2 + o), w, 0.09, t);
    bat(0, ly + h - 0.05, s * (d / 2 + o), w, 0.09, t);
    bat(s * (w / 2 - 0.05), ly + h / 2, d / 2 + o, 0.09, h, t);
    bat(s * (w / 2 - 0.05), ly + h / 2, -d / 2 - o, 0.09, h, t);
    bat(s * (w / 2 + o), ly + h / 2, 0, t, h - 0.02, 0.09);
    bat(0, ly + h / 2, s * (d / 2 + o), w * 1.1, 0.07, t, s * Math.atan2(h, w));
  }
  if (rnd() < 0.6) ff.geo(B, labelMat(['FRAGILE', 'B-4  DOCK', 'THIS SIDE UP', 'LOT 0417', 'BIOHAZARD'][Math.floor(rnd() * 5)], { fg: '#1a1410', w: 256, h: 64 }), planeGeo(w * 0.7, w * 0.18), 0, ly + h * 0.55, d / 2 + 0.04);
}
function palletGeo() {
  return cachedGeo('pallet', () => {
    const g = new THREE.BufferGeometry();
    const parts = [];
    for (let i = 0; i < 7; i++) parts.push([1.2, 0.022, 0.1, 0, 0.133, -0.5 + i * (1 / 6)]);
    for (const z of [-0.45, 0, 0.45]) parts.push([1.2, 0.09, 0.1, 0, 0.077, z]);
    for (const x of [-0.55, 0, 0.55]) parts.push([0.1, 0.022, 1.0, x, 0.011, 0]);
    const merged = [];
    for (const [w, h, d, x, y, z] of parts) { const b = boxGeo(w, h, d, 0.8).clone(); b.translate(x, y, z); merged.push(b.index ? b.toNonIndexed() : b); }
    const pos = [], nrm = [], uv = [];
    for (const b of merged) { pos.push(...b.attributes.position.array); nrm.push(...b.attributes.normal.array); uv.push(...b.attributes.uv.array); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  });
}
// heavy pallet racking for the dock: orange beams, blue uprights, wrapped loads
function palletRack(B, f, c, crawl) {
  const up = mat('metal', { color: 0x2a4a8a }), beam = mat('metal', { color: 0xd8641c });
  // a crawl-through bay: the first beam is low enough that nothing standing fits under it, high enough that
  // someone crouched does, and the floor under it is bare
  const levels = crawl ? [1.25, 2.75, 4.25] : [0.0, 1.55, 3.1, 4.6];
  for (const [x, z] of [[-0.48, -0.45], [0.48, -0.45], [-0.48, 0.45], [0.48, 0.45]]) f.cbox(B, up, x, 2.6, z, 0.07, 5.2, 0.07, 0.006);
  // the side bracing stops above the gap, so the way through is clear
  for (const x of [-0.48, 0.48]) for (let y = crawl ? 1.5 : 0.4; y < 5; y += 0.6) f.box(B, up, x, y, 0, 0.03, 0.03, 0.9, 0, 1);
  for (const y of crawl ? levels : levels.slice(1)) for (const z of [-0.45, 0.45]) f.cbox(B, beam, 0, y, z, 1.0, 0.11, 0.05, 0.008);
  if (crawl) {
    // decking under the first pallet, a strip of hazard tape on the beam, dust and scuffs where people have
    // been through on their hands and knees
    f.cbox(B, mat('grate'), 0, 1.31, 0, 0.94, 0.03, 0.86, 0.004);
    f.box(B, hazardMat(), 0, 1.25, 0.477, 0.98, 0.07, 0.002);
    f.box(B, hazardMat(), 0, 1.25, -0.477, 0.98, 0.07, 0.002, Math.PI);
    if (c.rnd() < 0.5) f.geo(B, decalMat('drag'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), 0, 0.011, 0, c.rnd() * 6, 0, 0, 0.6, 1, 0.6);
  }
  for (const y of levels) {
    if (c.rnd() < 0.18) continue;
    const py = y + (y ? 0.06 : 0);
    f.geo(B, mat('wood', { color: 0xa89878 }), palletGeo(), 0, py, 0, Math.PI / 2, 0, 0, 0.82, 1, 0.85);
    const kind = c.rnd();
    if (kind < 0.45) { // shrink-wrapped boxes
      const h = 0.7 + c.rnd() * 0.55;
      f.cbox(B, mat('card'), 0, py + 0.15 + h / 2, 0, 0.92, h, 0.85, 0.03, 0, 0.6);
      f.cbox(B, plainMat(0xc8d0d4, { transparent: true, opacity: 0.09, roughness: 0.3, ws: false }), 0, py + 0.15 + h / 2, 0, 0.95, h + 0.02, 0.88, 0.05);
    } else if (kind < 0.75) { // drums
      // drums: a body with its own lid, three rolling hoops (open rings - their caps would never be seen), a bung
      for (const [dx, dz] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
        f.cyl(B, mat('metal', { color: c.rnd() < 0.5 ? 0x2c4a7a : 0x6a6e72 }), dx, py + 0.6, dz, 0.2, 0.2, 0.86, 14);
        for (const y of [0.46, 0.74]) f.geo(B, mat('steelDark'), cylGeo(0.207, 0.207, 0.024, 14, 1, true), dx, py + y, dz);
        f.cyl(B, mat('steelDark'), dx, py + 1.02, dz, 0.207, 0.207, 0.024, 14);
        f.cyl(B, mat('steelDark'), dx + 0.09, py + 1.04, dz + 0.04, 0.025, 0.025, 0.018, 6);
      }
    } else { // a crate
      crate(B, f, 0, py + 0.15, 0.9, 0.75 + c.rnd() * 0.4, 0.85, c.rnd, 0, y > 0);
    }
  }
}
function microscope(B, f) {
  const m = plainMat(0xe8e8e4, { roughness: 0.4 }), d = PM.black;
  f.cbox(B, m, 0, 0.93, 0, 0.16, 0.035, 0.22, 0.01);
  f.cbox(B, m, 0, 1.07, -0.07, 0.06, 0.26, 0.06, 0.015, 0, 1, 0.2);
  f.cbox(B, m, 0, 1.2, 0.0, 0.07, 0.07, 0.16, 0.02, 0, 1, 0.3);
  f.cyl(B, d, 0, 1.25, -0.05, 0.016, 0.016, 0.1, 10, -0.5);
  f.cyl(B, d, 0, 1.11, 0.05, 0.012, 0.012, 0.06, 10);
  f.cbox(B, d, 0, 1.02, 0.04, 0.12, 0.012, 0.1, 0.004);
}

// clusters of big machines are built once per block
function buildMachineCluster(B, ch, cells, c) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of cells) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x + 1); z1 = Math.max(z1, z + 1); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  const alongX = w >= d, len = (alongX ? w : d) - 0.3, wid = (alongX ? d : w) - 0.3;
  const f = frame(cx, cz, alongX ? Math.PI / 2 : 0);
  if (ch === 'e') generatorSet(B, f, len, wid, c);
  else if (ch === 'm') pumpUnit(B, f, len, wid, c);
  else if (ch === 'X') { // pallets of stacked crates and boxes
    const gx = Math.max(1, Math.round(len / 1.25)), gz = Math.max(1, Math.round(wid / 1.1));
    for (let i = 0; i < gx; i++) for (let k = 0; k < gz; k++) {
      const lx = (i - (gx - 1) / 2) * (len / gx), lz = (k - (gz - 1) / 2) * (wid / gz);
      const at = f.at(lz, lx);
      // an L-shaped cluster leaves its missing corner empty
      if (!cells.some(([x, z]) => x === Math.floor(at[0]) && z === Math.floor(at[1]))) continue;
      const ff = frame(...at, f.rot + (c.rnd() - 0.5) * 0.12);
      ff.geo(B, mat('wood', { color: 0xa89878 }), palletGeo(), 0, 0, 0, 0, 0, 0, 0.9, 1, 0.9);
      let y = 0.15;
      const tiers = 1 + Math.floor(c.rnd() * 3);
      for (let t = 0; t < tiers; t++) {
        if (c.rnd() < 0.5) { const s = 0.8 - t * 0.08; crate(B, ff, (c.rnd() - 0.5) * 0.1, y, s, s * 0.9, s, c.rnd, (c.rnd() - 0.5) * 0.3); y += s * 0.9 + 0.01; }
        else { const h = 0.45 + c.rnd() * 0.3; ff.cbox(B, mat('card'), (c.rnd() - 0.5) * 0.08, y + h / 2, 0, 0.95 - t * 0.1, h, 0.9 - t * 0.1, 0.02, (c.rnd() - 0.5) * 0.2, 0.6); y += h; }
      }
      if (c.rnd() < 0.4) ff.cbox(B, plainMat(0xc8d0d4, { transparent: true, opacity: 0.09, roughness: 0.3, ws: false }), 0, 0.15 + (y - 0.15) / 2, 0, 1.0, y - 0.13, 0.95, 0.05);
    }
  } else if (ch === 'T') { // specimen tanks; something floats inside
    for (const [x, z] of cells) {
      const tf = frame(x + 0.5, z + 0.5, c.rnd() * 6.28);
      const broken = c.rnd() < 0.2;
      tf.cyl(B, mat('steelDark'), 0, 0.16, 0, 0.44, 0.47, 0.32, 28);
      tf.cyl(B, mat('steel'), 0, 0.33, 0, 0.45, 0.45, 0.03, 28);
      tf.cyl(B, mat('steelDark'), 0, 2.16, 0, 0.44, 0.44, 0.24, 28);
      tf.cyl(B, mat('steel'), 0, 2.03, 0, 0.45, 0.45, 0.03, 28);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; tf.cyl(B, mat('steel'), Math.cos(a) * 0.43, 1.18, Math.sin(a) * 0.43, 0.018, 0.018, 1.7, 8); }
      if (!broken) {
        tf.cyl(B, plainMat(0x081410, { emissive: 0x2a8a5a, emissiveIntensity: 0.35, roughness: 0.15, transparent: true, opacity: 0.5, ws: false }), 0, 1.18, 0, 0.38, 0.38, 1.66, 24);
        // a curled figure: head, spine, limbs
        tf.sphere(B, plainMat(0x232820, { roughness: 0.6 }), 0.05, 1.5, 0.03, 0.13, 1.15);
        tf.cyl(B, plainMat(0x232820, { roughness: 0.6 }), 0, 1.14, 0.05, 0.1, 0.14, 0.6, 12, 0.4, 0.2);
        tf.cyl(B, plainMat(0x232820, { roughness: 0.6 }), 0.12, 0.8, 0.0, 0.05, 0.04, 0.7, 8, -0.6, 0.3);
        tf.cyl(B, plainMat(0x232820, { roughness: 0.6 }), -0.1, 1.2, 0.12, 0.03, 0.03, 0.8, 8, 0.9, -0.4);
        tf.cyl(B, PM.glass, 0, 1.18, 0, 0.4, 0.4, 1.7, 28);
      } else {
        // shattered: jagged glass stubs and fluid on the floor
        for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, h = 0.15 + c.rnd() * 0.5; tf.geo(B, PM.glass, cboxGeo(0.25, h, 0.01, 0.002), Math.cos(a) * 0.4, 0.35 + h / 2, Math.sin(a) * 0.4, -a + Math.PI / 2, (c.rnd() - 0.5) * 0.3); }
        for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28, h = 0.1 + c.rnd() * 0.35; tf.geo(B, PM.glass, cboxGeo(0.25, h, 0.01, 0.002), Math.cos(a) * 0.4, 2.04 - h / 2, Math.sin(a) * 0.4, -a + Math.PI / 2, (c.rnd() - 0.5) * 0.3); }
        tf.geo(B, decalMat('oil'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), 0.3, 0.007, 0.4);
        for (let k = 0; k < 14; k++) tf.geo(B, PM.glass, cboxGeo(0.06 + c.rnd() * 0.1, 0.008, 0.04 + c.rnd() * 0.08, 0.002), (c.rnd() - 0.5) * 1.6, 0.006, (c.rnd() - 0.5) * 1.6, c.rnd() * 6);
      }
      tf.cyl(B, mat('rust'), 0.25, 2.3 + Math.max(0.2, c.ceil - 2.3) / 2, 0.2, 0.05, 0.05, Math.max(0.2, c.ceil - 2.3), 10);
      tf.cyl(B, plainMat(0x1a1b1d, { roughness: 0.5 }), -0.2, 1.9, 0.0, 0.015, 0.015, 0.5, 6);
    }
  }
}

// a diesel generator set: skid, engine block, radiator, alternator, exhaust up to the roof
function generatorSet(B, f, len, wid, c) {
  const body = mat('metal', { color: 0x4a6a52 }), dark = mat('steelDark'), steel = mat('steel');
  const W = Math.min(wid, 2.6), Lh = len;
  f.cbox(B, dark, 0, 0.12, 0, W + 0.2, 0.24, Lh, 0.02);
  for (const s of [-1, 1]) f.cbox(B, mat('metal', { color: 0x2a2c2e }), s * (W / 2 + 0.05), 0.12, 0, 0.12, 0.26, Lh + 0.05, 0.01);
  // engine block with cylinder heads
  f.cbox(B, body, 0, 0.95, -Lh * 0.12, W * 0.62, 1.3, Lh * 0.5, 0.04);
  for (let k = 0; k < 6; k++) { const z = -Lh * 0.33 + k * Lh * 0.085; for (const s of [-1, 1]) f.cbox(B, mat('metal', { color: 0x3a3e42 }), s * W * 0.22, 1.72, z, W * 0.2, 0.28, Lh * 0.07, 0.02); }
  f.cyl(B, steel, 0, 1.95, -Lh * 0.12, 0.08, 0.08, Lh * 0.5, 12, Math.PI / 2);
  // radiator with a grille at the front
  f.cbox(B, body, 0, 1.15, -Lh / 2 + 0.25, W * 0.9, 1.9, 0.5, 0.03);
  f.box(B, mat('grate'), 0, 1.15, -Lh / 2 - 0.005, W * 0.8, 1.7, 0.01, 0, 0.6);
  f.cyl(B, dark, 0, 1.15, -Lh / 2 + 0.55, 0.7, 0.7, 0.08, 28, Math.PI / 2);
  // alternator drum and terminal box at the back
  f.cyl(B, mat('metal', { color: 0x6a6e72 }), 0, 1.05, Lh * 0.3, W * 0.38, W * 0.38, Lh * 0.32, 32, Math.PI / 2);
  for (let k = 0; k < 8; k++) f.cyl(B, dark, 0, 1.05, Lh * 0.17 + k * Lh * 0.04, W * 0.385, W * 0.385, 0.02, 32, Math.PI / 2);
  f.cbox(B, mat('metal', { color: 0x8a8e92 }), W * 0.36, 1.6, Lh * 0.3, 0.4, 0.6, 0.7, 0.02);
  f.geo(B, labelMat('GEN 2  ·  11 kV', { bg: '#e2ad3b', fg: '#141414', w: 256, h: 64 }), planeGeo(0.5, 0.13), W * 0.36 + 0.201, 1.65, Lh * 0.3, Math.PI / 2);
  // exhaust: silencer and stack to the roof
  f.cyl(B, mat('rust'), W * 0.25, 2.25, -Lh * 0.05, 0.22, 0.22, 1.1, 18, Math.PI / 2);
  f.cyl(B, mat('rust'), W * 0.25, (c.ceil + 2.25) / 2, Lh * 0.15, 0.17, 0.17, c.ceil - 2.25, 16, 0, 0, 1.5);
  for (let y = 3.5; y < c.ceil - 0.5; y += 2.5) f.cyl(B, dark, W * 0.25, y, Lh * 0.15, 0.21, 0.21, 0.06, 16);
  // fuel and cable connections
  f.cyl(B, plainMat(0x111214, { roughness: 0.5 }), -W * 0.45, 0.5, Lh * 0.2, 0.05, 0.05, Lh * 0.5, 8, Math.PI / 2);
  for (let k = 0; k < 3; k++) f.cyl(B, plainMat(0x111214, { roughness: 0.6 }), W * 0.5 + 0.1 + k * 0.08, 0.6, Lh * 0.3, 0.035, 0.035, 1.2, 8);
  f.geo(B, decalMat('oil'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), 0, 0.006, -Lh * 0.1, 0.4, 0, 0, 1.6, 1, 1.6);
}
// a centrifugal pump with its motor, volute and big pipes into the water
function pumpUnit(B, f, len, wid, c) {
  const dark = mat('steelDark'), body = mat('metal', { color: 0x355a40 }), rust = mat('rust');
  const R = Math.min(wid, 2.6) / 2 - 0.1;
  f.cbox(B, mat('concrete'), 0, 0.2, 0, Math.min(wid, 2.6), 0.4, len, 0.03, 0, 1.2);
  f.cyl(B, body, 0, 0.4 + R * 0.55, -len * 0.18, R * 0.55, R * 0.55, len * 0.42, 28, Math.PI / 2);
  for (let k = 0; k < 9; k++) f.cyl(B, dark, 0, 0.4 + R * 0.55, -len * 0.36 + k * len * 0.045, R * 0.57, R * 0.57, 0.02, 28, Math.PI / 2);
  f.cbox(B, mat('metal', { color: 0x6a6e72 }), R * 0.55, 0.4 + R * 0.9, -len * 0.18, 0.3, 0.3, 0.4, 0.02);
  f.cyl(B, dark, 0, 0.4 + R * 0.55, len * 0.06, 0.1, 0.1, len * 0.12, 12, Math.PI / 2);
  // volute casing
  f.cyl(B, rust, 0, 0.4 + R * 0.6, len * 0.25, R * 0.75, R * 0.75, len * 0.18, 28, Math.PI / 2);
  f.torus(B, rust, 0, 0.4 + R * 0.6, len * 0.25, R * 0.62, R * 0.2, 0);
  // suction and discharge pipes
  f.cyl(B, rust, 0, 0.4 + R * 0.6, len * 0.45, R * 0.32, R * 0.32, len * 0.2, 20, Math.PI / 2);
  f.cyl(B, rust, 0, (c.ceil + 0.4 + R * 1.3) / 2, len * 0.25, R * 0.3, R * 0.3, c.ceil - 0.4 - R * 1.3, 20, 0, 0, 1.5);
  for (let y = 2; y < c.ceil - 0.4; y += 2) f.cyl(B, dark, 0, y, len * 0.25, R * 0.38, R * 0.38, 0.08, 20);
  f.cyl(B, mat('steelDark'), R * 0.8, 1.3, len * 0.25, 0.03, 0.03, 0.35, 8, 0, Math.PI / 2);
  f.torus(B, plainMat(0xa0281c, { roughness: 0.5, metalness: 0.4 }), R * 1.0, 1.3, len * 0.25, 0.16, 0.018, 0);
  f.cyl(B, plainMat(0xd8d8d0, { roughness: 0.3 }), -R * 0.7, 0.4 + R * 1.2, len * 0.32, 0.07, 0.07, 0.03, 16, Math.PI / 2);
}
