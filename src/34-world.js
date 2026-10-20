// ================= world: builds each area's static geometry from the grid =================
// power: chance a fixture of that kind is [on, flickering]; the rest are dead. 'circuit' = dead until the area's power is restored.
const THEMES = {
  // the dock has no power at all when you arrive: every light in it is on the circuit the generator feeds
  dock:      { lo: 'blockGrey', hi: 'block', floor: 'floor', ceil: 'plateDark', ceilType: 'deck', band: true, beams: true, fog: [0x020201, 0.05], amb: [0x2c2822, 0x070605, 0.5], L: 0xffe2b8, star: 0xffa04a, bang: 0xff2a1a, power: { L: 'circuit', '*': 'circuit', '!': 'circuit' }, blackout: true, haze: 0.7 },
  office:    { lo: 'paint', hi: 'paint', rail: true, floor: 'carpet', ceil: 'panel', ceilType: 'grid', fog: [0x030304, 0.06], amb: [0x262a32, 0x08080a, 0.42], L: 0xe4ecff, star: 0xffc080, bang: 0xff2a1a, power: { L: [0.0, 0.22], '!': [1, 0] }, haze: 0.35 },
  lab:       { lo: 'tile', hi: 'tile', floor: 'tilefloor', ceil: 'panel', ceilType: 'grid', fog: [0x030405, 0.055], amb: [0x24343a, 0x070909, 0.42], L: 0xd8f0ff, star: 0xffc080, bang: 0xff2a1a, power: { L: 'circuit', '!': [1, 0] }, haze: 0.35 },
  cold:      { lo: 'tileCold', hi: 'tileCold', floor: 'tilefloor', ceil: 'plate', ceilType: 'slab', fog: [0x060a0e, 0.085], amb: [0x2a4458, 0x05080b, 0.5], L: 0xa8d0ff, star: 0xb8d8ff, bang: 0xff3020, mist: true, power: { L: [0.2, 0.3], '!': [1, 0] }, haze: 1 },
  server:    { lo: 'blockGrey', hi: 'blockGrey', floor: 'grate', ceil: 'concreteDark', ceilType: 'slab', trays: true, fog: [0x020305, 0.06], amb: [0x16223a, 0x040508, 0.4], L: 0x9ab8ff, star: 0xffc080, bang: 0xff2a1a, power: { L: [0.1, 0.25], '!': [1, 0] }, haze: 0.4 },
  tunnel:    { lo: 'concreteDark', hi: 'concreteDark', floor: 'floorWet', ceil: 'concreteDark', ceilType: 'slab', pipes: true, noLintel: true, fog: [0x050403, 0.075], amb: [0x2a1e14, 0x050403, 0.36], L: 0xffd0a0, star: 0xffb060, bang: 0xff3020, power: { L: [0.3, 0.3], '*': [0.45, 0.35], '!': [0.85, 0] }, haze: 0.6 },
  pump:      { lo: 'algae', hi: 'concrete', floor: 'floorWet', ceil: 'concreteDark', ceilType: 'deck', beams: true, pipes: true, fog: [0x040607, 0.06], amb: [0x22322c, 0x040606, 0.45], L: 0xd8ffe8, star: 0xffc080, bang: 0xff3020, power: { L: [0.3, 0.3], '!': [1, 0] }, haze: 0.9 },
  contain:   { lo: 'plateDark', hi: 'concreteDark', floor: 'floor', ceil: 'concreteDark', ceilType: 'slab', fog: [0x060303, 0.06], amb: [0x3a1a18, 0x060303, 0.42], L: 0xfff4ee, star: 0xffc080, bang: 0xff1a10, power: { L: [0.12, 0.3], '!': [1, 0] }, haze: 0.5 },
  generator: { lo: 'concreteDark', hi: 'concrete', band: true, floor: 'floor', ceil: 'concreteDark', ceilType: 'deck', beams: true, fog: [0x050403, 0.04], amb: [0x3a3020, 0x070605, 0.5], L: 0xffe0b0, star: 0xffa850, bang: 0xff2a1a, power: { L: 'circuit', '!': [1, 0] }, haze: 0.7 },
  lift:      { lo: 'plateDark', hi: 'concrete', band: true, floor: 'floor', ceil: 'concreteDark', ceilType: 'deck', beams: true, fog: [0x060404, 0.05], amb: [0x3a2420, 0x070404, 0.45], L: 0xffe8c8, star: 0xffb060, bang: 0xff2010, power: { L: [0.15, 0.3], '!': [0.9, 0] }, haze: 0.6 },
};
const World = { group: null, areas: [], lightSpots: [], lightGroups: [], dyn: [], wallSigns: [], halos: [] };
const TEX_M = 2.4; // meters per texture tile on walls and floors

function cellKind(L, gx, gz) {
  if (!inGrid(L, gx, gz)) return 'solid';
  const c = L.ch[gz * L.W + gx];
  if (c === '#' || c === 'I') return 'solid';
  if (c === '~') return 'glass';
  if (c === '|') return 'bars';
  return 'open';
}

let _hazardMat = null;
function hazardMat() {
  if (_hazardMat) return _hazardMat;
  const t = canvasTex(512, 64, (g, w, h) => {
    g.fillStyle = '#d9a535'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#151413';
    for (let x = -64; x < w + 64; x += 64) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 32, h); g.lineTo(x + 64, 0); g.lineTo(x + 32, 0); g.fill(); }
    const r = mulberry32(5);
    for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(40,36,30,' + (r() * 0.5) + ')'; g.fillRect(r() * w, r() * h, 2 + r() * 8, 1 + r() * 3); }
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(120,118,112,' + (0.3 + r() * 0.5) + ')'; g.fillRect(r() * w, r() * h, 3 + r() * 14, 2 + r() * 5); }
  });
  t.wrapS = THREE.RepeatWrapping;
  _hazardMat = worldShader(new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, metalness: 0 }), { ao: 1, grime: 0.6, wet: 0 });
  return _hazardMat;
}

function signTexture(lines, opts = {}) {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = opts.bg || '#1b1e21'; g.fillRect(0, 0, w, h);
    g.strokeStyle = opts.fg || '#e8e2d2'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = opts.fg || '#e8e2d2'; g.textAlign = 'center';
    const sizes = opts.sizes || [96, 44];
    lines.forEach((line, i) => {
      g.font = (i === 0 ? '900 ' : '700 ') + sizes[Math.min(i, sizes.length - 1)] + 'px "Big Shoulders Stencil Display", Impact, sans-serif';
      g.fillText(line, w / 2, 115 + i * 74 - (lines.length - 1) * 20);
    });
    const r = mulberry32(lines[0].length * 31);
    for (let i = 0; i < 1400; i++) { g.fillStyle = 'rgba(0,0,0,' + r() * 0.35 + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 3); }
    for (let i = 0; i < 6; i++) { const x = r() * w; const gr = g.createLinearGradient(x, 0, x, h); gr.addColorStop(0, 'rgba(60,40,20,0.35)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(x, 0, 4 + r() * 10, h * (0.4 + r() * 0.6)); }
  });
}

// Decals: canvas-drawn stains, marks and litter laid over surfaces.
function decalMat(kind) {
  const key = 'decal_' + kind;
  if (Tex.mats[key]) return Tex.mats[key];
  const S = 256;
  const tex = canvasTex(S, S, (g, w, h) => {
    const r = mulberry32(kind.length * 131 + kind.charCodeAt(0) * 7);
    g.clearRect(0, 0, w, h);
    const blob = (x, y, rad, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, col + a + ')'); gr.addColorStop(1, col + '0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
    if (kind === 'blood') {
      for (let i = 0; i < 18; i++) blob(128 + (r() - 0.5) * 110, 128 + (r() - 0.5) * 110, 10 + r() * 40, 'rgba(58,7,5,', 0.85);
      for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 50 + r() * 70; g.fillStyle = 'rgba(52,6,4,' + (0.5 + r() * 0.5) + ')'; g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 1 + r() * 4, 0, 6.28); g.fill(); }
    } else if (kind === 'drag') {
      for (let i = 0; i < 40; i++) { const y = i * 6.4; blob(128 + Math.sin(i * 0.3) * 14 + (r() - 0.5) * 10, y, 22 + r() * 18, 'rgba(50,7,5,', 0.5 + r() * 0.3); }
      g.strokeStyle = 'rgba(40,5,3,0.5)'; g.lineWidth = 2;
      for (let k = 0; k < 7; k++) { g.beginPath(); const x0 = 100 + k * 9; g.moveTo(x0, 0); for (let y = 0; y <= 256; y += 16) g.lineTo(x0 + Math.sin(y * 0.03 + k) * 10, y); g.stroke(); }
    } else if (kind === 'scratch') {
      g.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const x0 = 40 + k * 40 + (r() - 0.5) * 10;
        for (const [lw, col] of [[9, 'rgba(12,9,8,0.9)'], [3, 'rgba(150,140,128,0.5)']]) {
          g.lineWidth = lw * (1 - k * 0.08); g.strokeStyle = col; g.beginPath();
          g.moveTo(x0, 6 + r() * 20); g.bezierCurveTo(x0 + 12, 80, x0 - 10, 170, x0 + 18, 240 - r() * 30); g.stroke();
        }
      }
    } else if (kind === 'hand') {
      // a long-fingered hand pressed flat in grime: mottled where skin touched, broken at the creases, smeared as it slid
      const dot = (x, y, rad, a) => { g.fillStyle = 'rgba(30,19,14,' + a + ')'; g.beginPath(); g.arc(x, y, rad, 0, 6.28); g.fill(); };
      const cx = 128, cy = 196;
      for (let i = 0; i < 900; i++) {
        const a = r() * 6.28, d = Math.sqrt(r());
        const x = cx + Math.cos(a) * d * 34, y = cy + Math.sin(a) * d * 40;
        const hollow = Math.hypot((x - cx) / 18, (y - cy + 4) / 20);
        if (hollow < 1 && r() < 0.75) continue;
        dot(x, y, 1 + r() * 2.6, 0.06 + r() * 0.2);
      }
      for (let f = 0; f < 5; f++) {
        const thumb = f === 0;
        const a0 = thumb ? -1.45 : -0.62 + (f - 1) * 0.36, len = thumb ? 70 : 124 + r() * 24 - Math.abs(f - 2.4) * 10;
        const bx = cx + Math.sin(a0) * 30, by = cy - Math.cos(a0) * 36, bend = (r() - 0.5) * 0.35;
        for (let k = 0; k < 140; k++) {
          const t = k / 140;
          if (Math.abs(t - 0.36) < 0.035 || Math.abs(t - 0.68) < 0.03) continue;   // knuckle creases
          const a = a0 * (1 + 0.12 * t) + bend * t * t;
          const x = bx + Math.sin(a) * len * t, y = by - Math.cos(a) * len * t;
          const wdt = (thumb ? 8 : 6.2) * (1 - 0.45 * t) + (t > 0.9 ? -2.5 * (t - 0.9) * 10 : 0);
          for (let j = 0; j < 3; j++) dot(x + (r() - 0.5) * wdt * 1.6, y + (r() - 0.5) * 3, 0.8 + r() * 2.2, 0.08 + r() * 0.22);
        }
        // the nail scraped a little past the tip
        g.strokeStyle = 'rgba(24,15,11,0.45)'; g.lineWidth = 1.4; g.lineCap = 'round';
        const ta = a0 * 1.12 + bend, tx = bx + Math.sin(ta) * len, ty = by - Math.cos(ta) * len;
        g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + Math.sin(ta) * 9, ty - Math.cos(ta) * 9); g.stroke();
      }
      // it dragged down the wall as the weight came off
      for (let k = 0; k < 9; k++) {
        const x0 = cx - 26 + k * 6.5 + (r() - 0.5) * 4, y0 = cy + 18 + r() * 14, l = 14 + r() * 46;
        const gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, 'rgba(30,19,14,0.3)'); gr.addColorStop(1, 'rgba(30,19,14,0)');
        g.fillStyle = gr; g.fillRect(x0, y0, 1.5 + r() * 2.5, l);
      }
    } else if (kind === 'paper') {
      for (let i = 0; i < 3; i++) {
        g.save(); g.translate(60 + r() * 136, 60 + r() * 136); g.rotate(r() * 6.28);
        g.fillStyle = 'rgba(' + (210 + r() * 25 | 0) + ',' + (205 + r() * 25 | 0) + ',' + (190 + r() * 20 | 0) + ',0.97)'; g.fillRect(-34, -44, 68, 88);
        g.fillStyle = 'rgba(40,40,40,0.55)'; for (let y = -34; y < 34; y += 6) g.fillRect(-26, y, 30 + r() * 22, 1.5);
        if (r() < 0.4) { g.fillStyle = 'rgba(120,80,40,0.25)'; g.beginPath(); g.arc(r() * 30 - 15, r() * 40 - 20, 14, 0, 6.28); g.fill(); }
        g.restore();
      }
    } else if (kind === 'grime') {
      for (let i = 0; i < 22; i++) blob(128 + (r() - 0.5) * 150, 128 + (r() - 0.5) * 150, 14 + r() * 50, 'rgba(10,9,7,', 0.42);
    } else if (kind === 'stain') {
      for (let i = 0; i < 3; i++) {
        const x = 128 + (r() - 0.5) * 60, y = 128 + (r() - 0.5) * 60, rad = 50 + r() * 50;
        blob(x, y, rad, 'rgba(92,66,30,', 0.3);
        g.strokeStyle = 'rgba(70,48,20,0.45)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, rad * 0.8, rad * 0.7, r(), 0, 6.28); g.stroke();
      }
    } else if (kind === 'oil') {
      for (let i = 0; i < 12; i++) blob(128 + (r() - 0.5) * 90, 128 + (r() - 0.5) * 90, 20 + r() * 45, 'rgba(8,7,6,', 0.7);
    } else if (kind === 'boots') {
      for (let i = 0; i < 6; i++) {
        g.save(); g.translate(80 + (i % 2) * 50, 20 + i * 42); g.rotate(0.1 * (r() - 0.5));
        g.fillStyle = 'rgba(25,20,16,0.5)'; g.beginPath(); g.ellipse(0, 0, 12, 20, 0, 0, 6.28); g.fill();
        g.fillStyle = 'rgba(0,0,0,0)'; g.restore();
      }
    } else if (kind === 'cracks') {
      g.strokeStyle = 'rgba(15,12,10,0.85)'; g.lineCap = 'round';
      const branch = (x, y, a, len, wdt, depth) => {
        if (depth > 5 || len < 6) return;
        g.lineWidth = wdt; g.beginPath(); g.moveTo(x, y);
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineTo(x2, y2); g.stroke();
        branch(x2, y2, a + (r() - 0.5) * 0.9, len * 0.8, wdt * 0.75, depth + 1);
        if (r() < 0.45) branch(x2, y2, a + (r() < 0.5 ? 0.8 : -0.8), len * 0.6, wdt * 0.6, depth + 1);
      };
      for (let k = 0; k < 6; k++) branch(128, 128, k * 1.05 + r() * 0.4, 26 + r() * 14, 5, 0);
      blob(128, 128, 24, 'rgba(10,8,6,', 0.8);
    }
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: kind === 'blood' || kind === 'drag' || kind === 'oil' ? 0.25 : 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.userData.noShadow = true;
  Tex.mats[key] = m;
  return m;
}

// ---------- light groups: fixtures that share a state flicker together ----------
function newLightGroups() {
  return {
    on: { kind: 'on', level: 1, mats: [] },
    f: [0, 1, 2].map((i) => ({ kind: 'flicker', level: 1, mats: [], burst: 0, out: 0, seed: i })),
    dead: { kind: 'dead', level: 0, mats: [] },
    circuit: { kind: 'circuit', level: 0, mats: [], powered: false, since: 0 },
    red: { kind: 'pulse', level: 1, mats: [] },
    manual: { kind: 'manual', level: 1, mats: [] },
    // in a blacked-out area the circuit comes back a bank at a time, nearest the generator first
    banks: [0, 1, 2, 3].map((i) => ({ kind: 'circuit', level: 0, mats: [], powered: false, since: 0, bank: i })),
  };
}
const LIGHT_GROUP_LIST = (G) => [G.on, G.f[0], G.f[1], G.f[2], G.circuit, G.red, G.manual, G.dead, ...G.banks];
// what keeps a little thing glowing - an exit sign, a shelter lamp - in this area. Somewhere blacked out it is
// the circuit like everything else, and it stays dark until the power is back.
function glowGroupAt(ai, x, z, keep) {
  const G = World.lightGroups[ai], th = World.areas[ai] && World.areas[ai].theme;
  // somewhere with no power at all, only the shelters keep their little lamps; everything else is dead
  if (th && th.broken) return keep ? G.on : G.dead;
  if (!G || !th || !th.blackout) return G ? G.on : null;
  return G.bankOf ? G.banks[G.bankOf(x, z)] : G.circuit;
}
function pickLightGroup(G, th, kind, rnd, pos) {
  const p = th.power[kind] || [0.5, 0.3];
  if (p === 'circuit') return th.blackout && pos && G.bankOf ? G.banks[G.bankOf(pos.x, pos.z)] : G.circuit;
  if (kind === '!') return G.red;
  const r = rnd();
  if (r < p[0]) return G.on;
  if (r < p[0] + p[1]) return G.f[Math.floor(rnd() * 3)];
  return G.dead;
}
// an emissive material tied to a group; dead groups get a plain unlit material
function groupMat(G, grp, color, intensity, key) {
  const k = '__lm_' + key + '_' + grp.kind + (grp.seed !== undefined ? grp.seed : '') + '_' + color + '_' + intensity + '_' + G.id;
  if (Tex.mats[k]) return Tex.mats[k];
  let m;
  if (grp.kind === 'dead') m = plainMat(0x8a8c8e, { roughness: 0.35, metalness: 0 });
  else {
    m = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, emissive: new THREE.Color(color), emissiveIntensity: intensity });
    grp.mats.push({ m, base: intensity });
  }
  Tex.mats[k] = m;
  return m;
}
function addLightSpot(spec) {
  const s = Object.assign({ level: 1, mul: 1, dead: false }, spec);
  World.lightSpots.push(s);
  if (s.halo !== false && s.grp && s.grp.kind !== 'dead') World.halos.push({ area: s.area, x: s.hx !== undefined ? s.hx : s.x, y: s.hy !== undefined ? s.hy : s.y + 0.25, z: s.hz !== undefined ? s.hz : s.z, size: s.haloSize || 1.2, color: s.color, grp: s.grp, mul: s.haloMul || 1, spot: s });
  return s;
}

function buildWorld(L) {
  if (World.group) { World.group.parent && World.group.parent.remove(World.group); }
  World.group = new THREE.Group();
  World.areas = []; World.lightSpots = []; World.lightGroups = []; World.dyn = []; World.wallSigns = []; World.halos = [];
  const W = L.W;
  const k = (x, z) => z * W + x;
  const batches = L.areas.map(() => new Batch());
  const clusterSeen = new Uint8Array(L.W * L.H);
  L.areas.forEach((a, ai) => {
    const grp = new THREE.Group(); grp.name = 'area' + ai;
    World.areas.push({ group: grp, theme: THEMES[a.theme], meta: a, box: { x0: a.offX - 1, x1: a.offX + a.w + CONNECTOR_LEN, z0: a.offZ - 1, z1: a.offZ + a.h + 1 } });
    const G = newLightGroups(); G.id = ai;
    // which bank a fixture is on: by how far it is from the area's main switch
    const sw = L.devices.find((d) => d.area === ai && d.type === 'W');
    if (sw) { const far = Math.hypot(a.w, a.h) * 0.8; G.bankOf = (x, z) => clamp(Math.floor(Math.hypot(x - sw.x, z - sw.z) / far * 4), 0, 3); }
    World.lightGroups.push(G);
    World.group.add(grp);
  });
  const rndFor = (gx, gz) => mulberry32(gx * 73856093 ^ gz * 19349663);
  const holes = dressCeilingHoles(L);

  for (let gz = 0; gz < L.H; gz++) for (let gx = 0; gx < L.W; gx++) {
    const i = k(gx, gz), c = L.ch[i], ai = L.area[i];
    if (ai < 0) continue;
    const kind = cellKind(L, gx, gz);
    const B = batches[ai], th = World.areas[ai].theme, ceil = L.ceil[i];
    const rnd = rndFor(gx, gz);
    if (isCarCell(L, gx, gz)) continue;
    const isLift = c === 'z' || c === 'Z' || (ai === 0 && c === '@');
    const wLo = mat(isLift ? 'plate' : th.lo), wHi = mat(isLift ? 'plate' : th.hi);
    if (kind === 'glass' || kind === 'bars') { buildPartition(B, L, gx, gz, kind, th, ceil); continue; }
    if (kind !== 'open') continue;
    const water = !!L.water[i];
    const fy = water ? -0.4 : 0;
    // floor
    const fm = water ? mat('floorWet') : isLift ? mat(World.areas[ai].meta.theme === 'lift' ? 'tread' : 'grate') : (th.floor === 'carpet' && isCorridorCell(L, gx, gz) ? mat('tilefloor') : mat(th.floor));
    B.quad(fm, [gx, fy, gz + 1], [gx + 1, fy, gz + 1], [gx + 1, fy, gz], [gx, fy, gz], 0, 1, 0,
      [[gx / TEX_M, (gz + 1) / TEX_M], [(gx + 1) / TEX_M, (gz + 1) / TEX_M], [(gx + 1) / TEX_M, gz / TEX_M], [gx / TEX_M, gz / TEX_M]]);
    // ceiling (a missing tile leaves a hole into the dark above)
    const cm = isLift ? mat('plateDark') : mat(th.ceil);
    const cs = th.ceil === 'panel' ? 1.2 : TEX_M;
    if (!holes.has(i)) {
      B.quad(cm, [gx, ceil, gz], [gx + 1, ceil, gz], [gx + 1, ceil, gz + 1], [gx, ceil, gz + 1], 0, -1, 0,
        [[gx / cs, gz / cs], [(gx + 1) / cs, gz / cs], [(gx + 1) / cs, (gz + 1) / cs], [gx / cs, (gz + 1) / cs]]);
    }
    // walls and steps toward each neighbour
    const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dz] of sides) {
      const nx = gx + dx, nz = gz + dz, nk = cellKind(L, nx, nz);
      // the face sits on the shared edge and faces into this cell
      let ax, az, bx, bz;
      if (dz === -1) { ax = gx; az = gz; bx = gx + 1; bz = gz; }
      else if (dz === 1) { ax = gx + 1; az = gz + 1; bx = gx; bz = gz + 1; }
      else if (dx === -1) { ax = gx; az = gz + 1; bx = gx; bz = gz; }
      else { ax = gx + 1; az = gz; bx = gx + 1; bz = gz + 1; }
      const along = dz !== 0 ? 'x' : 'z';
      const face = (y0, y1, m, tm = TEX_M) => {
        if (y1 - y0 < 0.01) return;
        const ua = (along === 'x' ? ax : az) / tm, ub = (along === 'x' ? bx : bz) / tm;
        B.quad(m, [ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], -dx, 0, -dz, [[ua, y0 / tm], [ub, y0 / tm], [ub, y1 / tm], [ua, y1 / tm]]);
      };
      const tun = nk === 'solid' && L.tunnel ? L.tunnel.get(k(nx, nz)) : null;
      if (tun) {
        // the lair: the wall is broken through here - only the wall above the hole is left
        face(L.lairInfo[tun.ai].top, ceil + (holes.has(i) ? 0.75 : 0), wHi);
      } else if (nk === 'solid') {
        const col = inGrid(L, nx, nz) && L.ch[k(nx, nz)] === 'I';
        const band = 1.05;
        const lo = col ? mat('concrete', { color: 0xb8b4aa }) : wLo, hi = col ? mat('concrete', { color: 0xb8b4aa }) : wHi;
        face(fy, Math.min(band, ceil), lo); face(Math.min(band, ceil), ceil + (holes.has(i) ? 0.75 : 0), hi);
        if (!water) {
          const mx = (ax + bx) / 2, mz = (az + bz) / 2;
          const off = 0.015;
          const bxw = along === 'x' ? 1 : 0.03, bzw = along === 'x' ? 0.03 : 1;
          const base = th.floor === 'carpet' || th.floor === 'tilefloor' ? plainMat(0x1d1e20, { roughness: 0.55 }) : mat('steelDark');
          if (!col) B.add(base, boxGeo(bxw, th.floor === 'carpet' ? 0.1 : 0.12, bzw), xform(mx - dx * off, 0.055, mz - dz * off));
          if (th.rail && ceil > 2 && !col) B.add(mat('wood', { color: 0x6a5240 }), cboxGeo(bxw, 0.07, bzw + (along === 'x' ? 0.01 : 0), 0.008), xform(mx - dx * off, 1.05, mz - dz * off));
          if ((th.band && !isLift && ceil > 2) || col) {
            const hm = hazardMat();
            const ua = (along === 'x' ? ax : az) * 0.5, ub = (along === 'x' ? bx : bz) * 0.5;
            const o = 0.012, y0 = col ? 0 : 0.86, y1 = col ? 1.2 : 1.04;
            B.quad(hm, [ax - dx * o, y0, az - dz * o], [bx - dx * o, y0, bz - dz * o], [bx - dx * o, y1, bz - dz * o], [ax - dx * o, y1, az - dz * o], -dx, 0, -dz, [[ua, 0], [ub, 0], [ub, col ? 3 : 1], [ua, col ? 3 : 1]]);
          }
        }
      } else if (nk === 'open') {
        const ni = k(nx, nz);
        const nc = L.ceil[ni] + (holes.has(ni) ? 0.75 : 0), myC = ceil + (holes.has(i) ? 0.75 : 0), nfy = L.water[ni] ? -0.4 : 0;
        if (nc < myC) face(nc, myC, holes.has(i) && !holes.has(ni) && L.ceil[ni] === ceil ? plainMat(0x161514, { roughness: 0.95 }) : wHi);
        if (nfy > fy) face(fy, nfy, mat('concreteDark'));
      }
    }
    // lintel over doorways and lock doors
    const solidW = cellKind(L, gx - 1, gz) !== 'open', solidE = cellKind(L, gx + 1, gz) !== 'open';
    const solidN = cellKind(L, gx, gz - 1) !== 'open', solidS = cellKind(L, gx, gz + 1) !== 'open';
    const lock = L.lockAt[i] >= 0;
    const doorX = solidW && solidE && !solidN && !solidS && (cellKind(L, gx - 1, gz - 1) === 'open' || cellKind(L, gx - 1, gz + 1) === 'open' || cellKind(L, gx + 1, gz - 1) === 'open' || cellKind(L, gx + 1, gz + 1) === 'open');
    const doorZ = solidN && solidS && !solidW && !solidE && (cellKind(L, gx - 1, gz - 1) === 'open' || cellKind(L, gx + 1, gz - 1) === 'open' || cellKind(L, gx - 1, gz + 1) === 'open' || cellKind(L, gx + 1, gz + 1) === 'open');
    if ((doorX || doorZ || lock || c === 'S') && ceil > 2.6 && (!th.noLintel || lock || c === 'S') && c !== 'z') {
      const top = lintelTop(L, i);
      B.add(wHi, boxGeo(1, ceil - top, 1, TEX_M), xform(gx + 0.5, (ceil + top) / 2, gz + 0.5));
      const wallsWE = solidW && solidE;
      const fmM = mat('steelDark');
      // jambs only where the opening meets the wall: a door two or three cells wide has none in the middle of it
      for (const s of [-1, 1]) {
        const nx = wallsWE ? gx + s : gx, nz = wallsWE ? gz : gz + s;
        if (lock && inGrid(L, nx, nz) && L.lockAt[nz * L.W + nx] === L.lockAt[i]) continue;
        if (wallsWE) B.add(fmM, cboxGeo(0.08, top, 0.26, 0.012), xform(gx + 0.5 + s * 0.47, top / 2, gz + 0.5));
        else B.add(fmM, cboxGeo(0.26, top, 0.08, 0.012), xform(gx + 0.5, top / 2, gz + 0.5 + s * 0.47));
      }
      if (wallsWE) B.add(fmM, cboxGeo(1, 0.08, 0.26, 0.012), xform(gx + 0.5, top + 0.04, gz + 0.5));
      else B.add(fmM, cboxGeo(0.26, 0.08, 1, 0.012), xform(gx + 0.5, top + 0.04, gz + 0.5));
      if ((doorX || doorZ) && !lock) World.doorways = (World.doorways || []).concat([{ gx, gz, ai, alongX: !wallsWE, top }]);
    }
    // props
    if (BLOCK_PROPS.has(c) || c === 'U') {
      const ctx = { theme: World.areas[ai].meta.theme, rnd, ceil, L, gx, gz };
      if ('emXT'.includes(c)) {
        if (!clusterSeen[i]) {
          const cells = [], q = [[gx, gz]]; clusterSeen[i] = 1;
          while (q.length) {
            const [x, z] = q.pop(); cells.push([x, z]);
            for (const [ddx, ddz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const xx = x + ddx, zz = z + ddz;
              if (inGrid(L, xx, zz) && !clusterSeen[k(xx, zz)] && L.ch[k(xx, zz)] === c) { clusterSeen[k(xx, zz)] = 1; q.push([xx, zz]); }
            }
          }
          buildMachineCluster(B, c, cells, ctx);
        }
      } else if (PROP_BUILDERS[c]) {
        PROP_BUILDERS[c](B, frame(gx + 0.5, gz + 0.5, propRot(L, gx, gz, c)), ctx);
      }
    }
    // decals
    if (c === '%') {
      B.add(decalMat(rnd() < 0.5 ? 'blood' : 'drag'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), xform(gx + 0.5, fy + 0.012, gz + 0.5, rnd() * 6.28));
      for (const [dx, dz] of sides) if (cellKind(L, gx + dx, gz + dz) === 'solid') {
        B.add(decalMat('scratch'), cachedGeo('decalWall', () => new THREE.PlaneGeometry(1.2, 1.6)), xform(gx + 0.5 + dx * 0.485, 1.7 + rnd() * 0.8, gz + 0.5 + dz * 0.485, Math.atan2(-dx, -dz)));
        break;
      }
    }
    if (c === ':') {
      B.add(decalMat('paper'), cachedGeo('decalPaper', () => new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2)), xform(gx + 0.5, fy + 0.01, gz + 0.5, rnd() * 6.28));
      if (rnd() < 0.6) B.add(decalMat('grime'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), xform(gx + 0.5, fy + 0.008, gz + 0.5, rnd() * 6.28));
    }
    // lights
    if (c === 'L' || c === '!' || c === '*') buildFixture(B, L, gx, gz, c, ai, th, ceil, rnd);
  }
  // connector stairwell lights
  for (const cn of L.connectors) {
    const B = batches[cn.from], G = World.lightGroups[cn.from];
    // a corridor out of a blacked-out area is as dead as the area until its power comes back
    const grp = World.areas[cn.from].theme.blackout ? G.banks[3] : G.red;
    const x = (cn.x0 + cn.x1 + 1) / 2, z = cn.z + 0.5;
    // under a high ceiling the beacon hangs on a drop rod, down where it can still light the floor
    const cc = cn.ceil || 3.0, by = Math.min(cc, 3.3) - 0.03;
    if (cc - by > 0.05) B.add(mat('steelDark'), cylGeo(0.02, 0.02, cc - by, 6), xform(x, (cc + by) / 2, z));
    B.add(mat('steelDark'), cylGeo(0.13, 0.15, 0.06, 14), xform(x, by, z));
    B.add(groupMat(G, grp, 0xff2a1a, 4.5, 'beacon'), cylGeo(0.08, 0.11, 0.16, 14), xform(x, by - 0.11, z));
    addLightSpot({ x, y: by - 0.37, z, color: 0xff2a1a, base: 1.3, range: 5, area: cn.from, grp, kind: '!', hy: by - 0.11, haloSize: 0.75 });
    // the high passage out of the dock carries the dock's steel: I-beams across it every few metres
    if (cn.north && cc > 3.5) {
      const rust = mat('metal', { color: 0x5a4a3a });
      for (let zz = cn.north.z1 - 1; zz > cn.north.z0; zz -= 3) {
        const bx = cn.north.x + 0.5, bz = zz + 0.5;
        B.add(rust, boxGeo(3, 0.42, 0.014), xform(bx, cc - 0.21, bz));
        for (const s of [-1, 1]) B.add(rust, boxGeo(3, 0.018, 0.22), xform(bx, cc - 0.21 + s * 0.2, bz));
      }
    }
  }
  dressWorld(L, batches, holes);
  buildSigns(L, batches);
  batches.forEach((B, ai) => B.build(World.areas[ai].group));
  buildHalos();
  buildShafts(L);
}

// how high the opening of a doorway or lock door is: a man door 2.3 m, the freight lift 2.9 m, and a lock
// that says otherwise (the dock's roller shutter) its own height
function lintelTop(L, i) {
  const lk = L.lockAt[i] >= 0 ? L.locks[L.lockAt[i]] : null;
  if (lk && lk.top) return lk.top;
  return L.ch[i] === 'Z' ? 2.9 : 2.3;
}

function isCorridorCell(L, gx, gz) {
  const ai = L.area[gz * L.W + gx];
  const a = L.areas[ai];
  return a && a.theme === 'office' && (gz - a.offZ === 11 || gz - a.offZ === 12);
}

function buildPartition(B, L, gx, gz, kind, th, ceil) {
  const alongX = cellKind(L, gx - 1, gz) !== 'open' || cellKind(L, gx + 1, gz) !== 'open';
  const ry = alongX ? 0 : Math.PI / 2;
  const f = frame(gx + 0.5, gz + 0.5, ry);
  if (kind === 'glass') {
    // 1 m thick wall below and above the window (matches the normal walls), thin pane set in the middle
    f.box(B, mat(th.lo), 0, 0.475, 0, 1, 0.95, 1, 0, TEX_M);
    f.box(B, mat(th.hi), 0, (ceil + 2.25) / 2, 0, 1, ceil - 2.25, 1, 0, TEX_M);
    f.cbox(B, mat('steelDark'), 0, 0.97, 0, 1, 0.05, 0.34, 0.01);
    f.cbox(B, mat('steelDark'), 0, 2.23, 0, 1, 0.05, 0.34, 0.01);
    f.cbox(B, mat('steelDark'), 0.48, 1.6, 0, 0.05, 1.26, 0.1, 0.01);
    // close the window slot where the run of glass stops (doorway or wall): a full-depth jamb on that end, so you never see into the open slot
    // (local +x is world +x when the wall runs along x, and world -z when it runs along z)
    for (const sgn of [-1, 1]) {
      const endKind = alongX ? cellKind(L, gx + sgn, gz) : cellKind(L, gx, gz - sgn);
      if (endKind !== 'glass') f.box(B, mat(th.hi), sgn * 0.45, 1.6, 0, 0.1, 1.3, 1, 0, TEX_M);
    }
    f.box(B, mat('steel', { transparent: true, opacity: 0.12, rough: 0.05, metal: 0.1, ws: { ao: 0, grime: 0, wet: 0 } }), 0, 1.6, 0, 0.96, 1.26, 0.02);
    // dirt and a crack on some panes
    const r = mulberry32(gx * 31 + gz * 17);
    if (r() < 0.25) f.geo(B, decalMat('cracks'), cachedGeo('glassCrack', () => new THREE.PlaneGeometry(0.9, 0.9)), (r() - 0.5) * 0.3, 1.5 + r() * 0.3, 0.013, r() < 0.5 ? 0 : Math.PI);
  } else {
    f.cbox(B, mat('steelDark'), 0, 0.06, 0, 1, 0.12, 0.16, 0.015);
    f.cbox(B, mat('steelDark'), 0, 2.32, 0, 1, 0.14, 0.16, 0.015);
    if (ceil > 2.4) f.box(B, mat(th.hi), 0, (ceil + 2.38) / 2, 0, 1, ceil - 2.38, 1, 0, TEX_M); // 1 m thick header like the normal walls
    const r = mulberry32(gx * 13 + gz * 7);
    for (let x = -0.44; x <= 0.45; x += 0.11) f.cyl(B, mat(r() < 0.3 ? 'rust' : 'steel'), x, 1.2, 0, 0.026, 0.026, 2.3, 10);
    f.cbox(B, mat('steelDark'), 0, 1.25, 0, 1, 0.06, 0.12, 0.01);
  }
}

function buildFixture(B, L, gx, gz, c, ai, th, ceil, rnd) {
  const x = gx + 0.5, z = gz + 0.5;
  const G = World.lightGroups[ai];
  // shelters keep their own battery-backed light, whatever state the rest of the area is in - except somewhere
  // the power is out entirely
  const grp = c === 'L' && L.safe[gz * L.W + gx] && !th.blackout ? G.on : pickLightGroup(G, th, c, rnd, { x: gx + 0.5, z: gz + 0.5 });
  const housing = plainMat(0xc9c9c4, { roughness: 0.5, metalness: 0.2 });
  if (c === 'L') {
    if (ceil > 4.2) {
      // industrial high-bay pendant
      const y = Math.min(ceil - 0.9, 6.2);
      B.add(mat('steelDark'), cylGeo(0.012, 0.012, ceil - y, 5), xform(x, (ceil + y) / 2, z));
      B.add(mat('steelDark'), cylGeo(0.07, 0.09, 0.22, 12), xform(x, y + 0.17, z));
      B.add(plainMat(0x3c4146, { roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide }), cylGeo(0.14, 0.46, 0.38, 22, 1, true), xform(x, y - 0.12, z));
      B.add(groupMat(G, grp, th.L, 6, 'hb'), cylGeo(0.36, 0.36, 0.02, 22), xform(x, y - 0.3, z));
      addLightSpot({ x, y: y - 0.45, z, color: th.L, base: 42, range: 20, area: ai, grp, kind: 'L', hy: y - 0.32, haloSize: 2.0 });
    } else {
      const alongX = cellKind(L, gx - 1, gz) === 'open' && cellKind(L, gx + 1, gz) === 'open';
      const ry = alongX ? 0 : Math.PI / 2;
      // recessed troffer: housing, louvre, two tubes behind a lens
      const f = frame(x, z, ry);
      const broken = grp.kind === 'dead' && rnd() < 0.3;
      f.cbox(B, housing, 0, ceil - 0.04, 0, 1.24, 0.08, 0.62, 0.01);
      f.box(B, plainMat(0x0b0b0c), 0, ceil - 0.082, 0, 1.16, 0.004, 0.54);
      for (const s of [-0.13, 0.13]) f.cyl(B, groupMat(G, grp, th.L, 9, 'tube'), 0, ceil - 0.06, s, 0.016, 0.016, 1.12, 8, 0, Math.PI / 2);
      const lens = plainMat(0xe8ecee, { transparent: true, opacity: 0.55, roughness: 0.25, ws: false });
      if (!broken) {
        f.box(B, lens, 0, ceil - 0.088, 0, 1.16, 0.006, 0.54);
        for (let k = -2; k <= 2; k++) f.box(B, housing, k * 0.23, ceil - 0.1, 0, 0.01, 0.03, 0.54);
      } else {
        // the lens hangs open from one edge
        f.geo(B, lens, boxGeo(1.16, 0.006, 0.54), 0, ceil - 0.09 - Math.sin(1.15) * 0.27, -0.27 + Math.cos(1.15) * 0.27, 0, 1.15);
      }
      addLightSpot({ x, y: ceil - 0.35, z, color: th.L, base: 11, range: 9, area: ai, grp, kind: 'L', hy: ceil - 0.1, haloSize: 1.3 });
    }
  } else if (c === '!') {
    // caged emergency beacon
    B.add(mat('steelDark'), cylGeo(0.13, 0.15, 0.06, 14), xform(x, ceil - 0.03, z));
    B.add(groupMat(G, grp, th.bang, 4.5, 'beacon'), cylGeo(0.08, 0.11, 0.16, 14), xform(x, ceil - 0.14, z));
    for (let a = 0; a < 4; a++) B.add(mat('steelDark'), boxGeo(0.012, 0.2, 0.012), xform(x + Math.cos(a * 1.57) * 0.12, ceil - 0.14, z + Math.sin(a * 1.57) * 0.12));
    B.add(mat('steelDark'), torusGeo(0.12, 0.008, 6, 16), xform(x, ceil - 0.23, z, 0, Math.PI / 2));
    addLightSpot({ x, y: ceil - 0.4, z, color: th.bang, base: 1.3, range: 5, area: ai, grp, kind: '!', hy: ceil - 0.14, haloSize: 0.75 });
  } else if (c === '*') {
    const y = Math.min(ceil - 0.7, 3.2);
    const bulbMat = grp.kind === 'dead' ? plainMat(0xb0aaa0, { roughness: 0.2 }) : new THREE.MeshStandardMaterial({ color: 0x222222, emissive: new THREE.Color(th.star), emissiveIntensity: 4 });
    if (grp.kind !== 'dead') grp.mats.push({ m: bulbMat, base: 4 });
    const pivot = new THREE.Group(); pivot.position.set(x, ceil, z);
    const cord = new THREE.Mesh(cylGeo(0.006, 0.006, ceil - y, 4), mat('steelDark'));
    cord.position.y = -(ceil - y) / 2;
    const bulb = new THREE.Mesh(sphereGeo(0.05, 12, 10), bulbMat); bulb.position.y = -(ceil - y);
    const shade = new THREE.Mesh(cylGeo(0.05, 0.22, 0.15, 16, 1, true), plainMat(0x2c3034, { roughness: 0.45, metalness: 0.6, side: THREE.DoubleSide })); shade.position.y = -(ceil - y) + 0.09;
    const cage = new THREE.Mesh(sphereGeo(0.085, 8, 6), new THREE.MeshStandardMaterial({ color: 0x222426, wireframe: true, roughness: 0.6, metalness: 0.5 })); cage.position.y = -(ceil - y) - 0.02;
    pivot.add(cord, bulb, shade, cage);
    World.areas[ai].group.add(pivot);
    World.dyn.push({ kind: 'bulb', pivot, phase: rnd() * 6.28, area: ai });
    // the bulb swings on its cord, so its glow comes from the bulb itself (bloom), not a fixed halo
    addLightSpot({ x, y: y - 0.1, z, color: th.star, base: 8, range: 9, area: ai, grp, kind: '*', bulb: pivot, halo: false });
  }
}

// one batch of soft halos per area, flickering with their groups
function buildHalos() {
  const tex = canvasTex(128, 128, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.08, '#9a9a9a'); gr.addColorStop(0.3, '#2a2a2a'); gr.addColorStop(0.65, '#090909'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }, false);
  World.areas.forEach((A, ai) => {
    const list = World.halos.filter((h) => h.area === ai);
    if (!list.length) return;
    const G = World.lightGroups[ai];
    const groups = LIGHT_GROUP_LIST(G);
    const n = list.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), gi = new Float32Array(n);
    const c = new THREE.Color();
    list.forEach((h, i) => {
      pos.set([h.x, h.y, h.z], i * 3); c.setHex(h.color); col.set([c.r * h.mul, c.g * h.mul, c.b * h.mul], i * 3); size[i] = h.size; gi[i] = Math.max(0, groups.indexOf(h.grp));
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('hcol', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('hsize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('hgrp', new THREE.BufferAttribute(gi, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { tex: { value: tex }, levels: { value: new Array(12).fill(1) }, scale: { value: 600 }, gain: { value: 0.32 } },
      vertexShader: `attribute vec3 hcol; attribute float hsize; attribute float hgrp; uniform float levels[12]; uniform float scale; uniform float gain; varying vec3 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); int gi = int(hgrp + 0.5); float lv = 0.0;
          for (int i = 0; i < 12; i++) if (i == gi) lv = levels[i];
          vC = hcol * lv * gain; gl_PointSize = clamp(hsize * scale / -mv.z, 1.0, 512.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D tex; varying vec3 vC; void main(){ gl_FragColor = vec4(vC * texture2D(tex, gl_PointCoord).r, 1.0); }`,
    });
    const pts = new THREE.Points(geo, m);
    pts.frustumCulled = false;
    A.group.add(pts);
    A.halo = { pts, groups };
  });
}

// ---------- light shafts: soft cones of lit haze under the high-bay lamps ----------
// how far the floor around a lamp runs before the nearest wall (or the lift car), so a cone never passes through one
function shaftClearance(L, x, z, maxR) {
  let best = maxR;
  const r = Math.ceil(maxR) + 1, gx0 = Math.floor(x), gz0 = Math.floor(z);
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const gx = gx0 + dx, gz = gz0 + dz;
    if (cellKind(L, gx, gz) === 'open' && !isCarCell(L, gx, gz)) continue;
    const ex = Math.max(gx - x, 0, x - (gx + 1)), ez = Math.max(gz - z, 0, z - (gz + 1));
    best = Math.min(best, Math.hypot(ex, ez));
  }
  return best;
}
function buildShafts(L) {
  World.areas.forEach((A, ai) => {
    const th = A.theme, haze = th.haze || 0;
    if (haze < 0.5) return;
    const spots = World.lightSpots.filter((s) => s.area === ai && s.kind === 'L' && s.y > 3.6 && s.grp && s.grp.kind !== 'dead')
      .map((s) => ({ s, room: shaftClearance(L, s.x, s.z, 4.6) - 0.25 })).filter((e) => e.room > 0.9);
    if (!spots.length) return;
    const G = World.lightGroups[ai];
    const groups = A.halo ? A.halo.groups : LIGHT_GROUP_LIST(G);
    const pos = [], nrm = [], vv = [], col = [], gi = [];
    const c = new THREE.Color();
    for (const { s, room } of spots) {
      const top = s.y + 0.14, h = top - 0.02, rTop = 0.4, rBot = Math.min(rTop + h * 0.62, room);
      const g = new THREE.CylinderGeometry(rTop, rBot, h, 28, 6, true).toNonIndexed();
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      c.setHex(s.color);
      const gidx = Math.max(0, groups.indexOf(s.grp));
      for (let i = 0; i < P.count; i++) {
        pos.push(P.getX(i) + s.x, P.getY(i) + top - h / 2, P.getZ(i) + s.z);
        nrm.push(N.getX(i), N.getY(i), N.getZ(i));
        vv.push(U.getY(i)); col.push(c.r, c.g, c.b); gi.push(gidx);
      }
      g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('sv', new THREE.Float32BufferAttribute(vv, 1));
    geo.setAttribute('hcol', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('hgrp', new THREE.Float32BufferAttribute(gi, 1));
    const levels = A.halo ? A.halo.pts.material.uniforms.levels : { value: new Array(12).fill(1) };
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { levels, gain: { value: 0.14 * haze }, fogD: { value: th.fog ? th.fog[1] : 0.06 } },
      vertexShader: `attribute float sv; attribute vec3 hcol; attribute float hgrp; uniform float levels[12]; uniform float gain;
        varying vec3 vC; varying vec3 vN; varying vec3 vP; varying float vV;
        void main(){ int gi = int(hgrp + 0.5); float lv = 0.0;
          for (int i = 0; i < 12; i++) if (i == gi) lv = levels[i];
          vC = hcol * lv * gain; vV = sv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float fogD; varying vec3 vC; varying vec3 vN; varying vec3 vP; varying float vV;
        void main(){
          float facing = abs(dot(normalize(vN), normalize(-vP)));
          float v = clamp(vV, 0.0, 1.0);
          float along = pow(v, 1.6) * smoothstep(1.0, 0.93, v) * smoothstep(0.0, 0.18, v);
          float near = smoothstep(0.6, 3.0, -vP.z);
          float far = exp(-length(vP) * fogD * 0.8);
          gl_FragColor = vec4(vC * facing * facing * along * near * far, 1.0); }`,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.frustumCulled = true; geo.computeBoundingSphere();
    mesh.renderOrder = 2;
    A.group.add(mesh);
    A.shafts = mesh;
  });
}

// ---------- lights over time: flicker, pulse, power coming back ----------
function circuitPowered(ai, g) {
  if (!g || !g.dv) return false;
  const L = Game.L;
  for (const d of L.devices) if (d.area === ai && (d.type === 'F' || d.type === 'G' || d.type === 'W' || d.type === 'E') && g.dv[d.id] && g.dv[d.id].on) return true;
  return false;
}
function updateLights(dt, t, g, ca) {
  World.lightGroups.forEach((G, ai) => {
    if (Math.abs(ai - ca) > 1) return;
    const th = World.areas[ai].theme;
    for (const f of G.f) {
      if (th.broken) {
        // a fitting that barely works: dark, then a stutter of light, then dark again
        if (f.burst > 0) { f.burst -= dt; f.level = Math.random() < 0.5 ? 0.85 + Math.random() * 0.2 : 0.03; }
        else { f.level = 0; if (Math.random() < dt * (0.12 + f.seed * 0.06)) f.burst = 0.12 + Math.random() * (f.seed === 2 ? 2.4 : 0.9); }
        continue;
      }
      if (f.out > 0) { f.out -= dt; f.level = Math.random() < 0.04 ? 0.6 : 0; }
      else if (f.burst > 0) { f.burst -= dt; f.level = Math.random() < 0.45 ? 0.08 + Math.random() * 0.2 : 0.9 + Math.random() * 0.15; }
      else {
        f.level = 0.97 + Math.sin(t * 9 + f.seed) * 0.02;
        const r = Math.random();
        if (r < dt * 0.35) f.burst = 0.08 + Math.random() * 0.6;
        else if (r < dt * 0.4) f.out = 0.8 + Math.random() * 3;
      }
    }
    const C = G.circuit, powered = circuitPowered(ai, g);
    if (powered && !C.powered) { C.powered = true; C.since = t; }
    if (!powered) C.powered = false;
    if (C.powered) {
      const k = t - C.since;
      if (k < 2.2) C.level = Math.random() < clamp(k / 2.2, 0.15, 1) ? 1 : 0.05;
      else if (th.blackout) {
        // back on, and never quite steady: a low shimmer, and now and then a bank dips and catches
        if (C.dip > 0) { C.dip -= dt; C.level = 0.35 + Math.random() * 0.4; }
        else { C.level = 0.95 + Math.sin(t * 13.3) * 0.015 + Math.sin(t * 31.7) * 0.012; if (Math.random() < dt * 0.25) C.dip = 0.05 + Math.random() * 0.18; }
      } else C.level = 1;
    } else C.level = 0;
    // the banks: each one comes back a beat after the last, with a contactor slamming in and a stutter of
    // tubes catching, then settles into the same low shimmer as the rest
    for (const b of G.banks) {
      const delay = 0.5 + b.bank * 0.75, on = C.powered && t - C.since > delay;
      if (on && !b.powered) { b.powered = true; b.since = t; if (Math.abs(ai - ca) <= 0) Sound.bankOn(b.bank); }
      if (!on) b.powered = false;
      if (!b.powered) { b.level = 0; continue; }
      const k = t - b.since;
      b.level = k < 1.3 ? (Math.random() < clamp(k / 1.3, 0.2, 1) ? 0.9 + Math.random() * 0.15 : 0.04) : C.level;
    }
    G.red.level = 0.7 + 0.3 * Math.sin(t * 3.2 + ai);
    for (const grp of [G.on, G.f[0], G.f[1], G.f[2], C, G.red, G.manual, ...G.banks]) for (const e of grp.mats) e.m.emissiveIntensity = e.base * grp.level;
    const A = World.areas[ai];
    if (A.halo) { const lv = A.halo.pts.material.uniforms.levels.value; A.halo.groups.forEach((grp, i) => { lv[i] = grp.kind === 'dead' ? 0 : grp.level; }); }
  });
  for (const s of World.lightSpots) {
    if (Math.abs(s.area - ca) > 1) continue;
    s.level = (s.grp ? s.grp.level : 1) * s.mul;
    s.dead = !s.grp ? false : s.grp.kind === 'dead' || (s.grp.kind === 'circuit' && !s.grp.powered);
  }
}

function buildSigns(L, batches) {
  L.areas.forEach((a, ai) => {
    const B = batches[ai];
    // area name next to the way in
    const ez = ai === 0 ? a.offZ + 9 : a.offZ + a.entryRow, ex = ai === 0 ? a.offX + 6 : a.offX + 1;
    const lines = ['AREA ' + String(ai + 1).padStart(2, '0'), a.name.toUpperCase()];
    placeWallSign(L, B, ex, ez, signTexture(lines, { bg: '#16191c', fg: '#e8e2d2' }), 1.4, 0.7, 2.1);
    // shelter signs, faintly lit
    for (const s of L.safes.filter((sf) => sf.area === ai)) {
      const tex = signTexture(['SHELTER', 'KEEP DOOR CLEAR'], { bg: '#0f3a22', fg: '#bff5cf', sizes: [110, 40] });
      const m = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x2a8a50, emissiveMap: tex, emissiveIntensity: 0.9 });
      const gg = glowGroupAt(ai, s.door.x, s.door.z, true);
      if (gg && gg !== World.lightGroups[ai].on) { gg.mats.push({ m, base: 0.9 }); m.emissiveIntensity = 0; }
      const ry = Math.atan2(-s.dir.x, -s.dir.z);
      const px = s.door.x - s.dir.x * 0.52, pz = s.door.z - s.dir.z * 0.52;
      B.add(m, cachedGeo('sign1', () => new THREE.PlaneGeometry(0.9, 0.45)), xform(px, 2.6, pz, ry));
    }
    // a couple of warnings
    const warn = { dock: ['DOCK B', 'FORKLIFT TRAFFIC'], office: ['NO RUNNING', 'IN THE HALLS'], lab: ['BIOHAZARD', 'LEVEL 3'], cold: ['COLD ROOM', 'KEEP SEALED'],
      server: ['HIGH VOLTAGE', 'AUTHORIZED ONLY'], tunnel: ['CAUTION', 'LOW CLEARANCE'], pump: ['DEEP WATER', 'NO ENTRY'], contain: ['SUBJECT R-7', 'DO NOT ENGAGE'],
      generator: ['DANGER', '11 KV'], lift: ['FREIGHT LIFT', 'CAPACITY 4000 KG'],
      landing: ['WARD C', 'VISITORS REPORT'], ward: ['ISOLATION', 'KEEP DOORS SHUT'], dayroom: ['DAY ROOM', 'LIGHTS OUT 9 PM'], oldwing: ['OLD WING', 'NO ADMITTANCE'] }[a.theme] || ['CAUTION', 'AUTHORIZED ONLY'];
    const r = mulberry32(ai * 991 + 3);
    for (let n = 0; n < 3; n++) {
      const gx = a.offX + 2 + Math.floor(r() * (a.w - 4)), gz = a.offZ + 2 + Math.floor(r() * (a.h - 4));
      placeWallSign(L, B, gx, gz, signTexture(warn, { bg: n % 2 ? '#e2ad3b' : '#1b1e21', fg: n % 2 ? '#141414' : '#e8e2d2' }), 0.9, 0.45, 1.75);
    }
  });
}
function placeWallSign(L, B, gx, gz, tex, w, h, y) {
  for (let rr = 0; rr < 3; rr++) for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) {
    const x = gx + dx, z = gz + dz;
    if (!inGrid(L, x, z) || cellKind(L, x, z) !== 'open' || !WALKABLE.has(L.ch[z * L.W + x])) continue;
    for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (cellKind(L, x + sx, z + sz) !== 'solid') continue;
      const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
      B.add(m, new THREE.PlaneGeometry(w, h), xform(x + 0.5 + sx * 0.485, y, z + 0.5 + sz * 0.485, Math.atan2(-sx, -sz)));
      return true;
    }
  }
  return false;
}
