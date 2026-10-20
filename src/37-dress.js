// ================= dressing: the clutter and infrastructure that make each area feel real =================
// Walls are dressed run by run (a straight stretch of wall facing one way), ceilings and floors cell by cell,
// then each area gets a few hand-placed set pieces.
const DRESS = {
  // which wall kit each theme uses, as [item, chance per metre]
  kits: {
    dock: [['ext', 0.05], ['panel', 0.05], ['pipeV', 0.05], ['vent', 0.04], ['bumper', 0.0], ['hand', 0.025], ['notice', 0.04], ['emerg', 0.03]],
    office: [['ext', 0.04], ['switch', 0.0], ['cork', 0.06], ['poster', 0.06], ['white', 0.03], ['vent', 0.04], ['clock', 0.02], ['phone', 0.02], ['hand', 0.03], ['emerg', 0.05], ['alarm', 0.03], ['scratch', 0.02]],
    lab: [['ext', 0.04], ['eyewash', 0.03], ['poster', 0.04], ['white', 0.03], ['vent', 0.04], ['firstaid', 0.03], ['hooks', 0.04], ['hand', 0.03], ['emerg', 0.05], ['alarm', 0.03]],
    cold: [['ext', 0.03], ['gauge', 0.04], ['vent', 0.05], ['notice', 0.03], ['hand', 0.03], ['emerg', 0.04], ['scratch', 0.03]],
    server: [['ext', 0.04], ['panel', 0.08], ['vent', 0.05], ['notice', 0.03], ['emerg', 0.05], ['hand', 0.02]],
    tunnel: [['pipeV', 0.08], ['gauge', 0.06], ['panel', 0.03], ['tally', 0.03], ['hand', 0.05], ['scratch', 0.04], ['ladder', 0.025]],
    pump: [['pipeV', 0.06], ['gauge', 0.05], ['panel', 0.04], ['ext', 0.03], ['hand', 0.03], ['emerg', 0.03]],
    contain: [['ext', 0.03], ['intercom', 0.04], ['ring', 0.06], ['scratch', 0.06], ['hand', 0.06], ['notice', 0.03], ['emerg', 0.04], ['alarm', 0.03]],
    generator: [['panel', 0.08], ['pipeV', 0.05], ['ext', 0.04], ['gauge', 0.04], ['vent', 0.03], ['emerg', 0.03], ['hand', 0.02]],
    lift: [['panel', 0.05], ['ext', 0.04], ['pipeV', 0.04], ['notice', 0.04], ['hand', 0.04], ['emerg', 0.03], ['scratch', 0.03]],
  },
  // pipe colours: rusty, water green, air blue, fire red, gas yellow
  pipeCols: [null, 0x3a5a4a, 0x2c4a7a, 0x8a2a1c, 0xb8902a],
};

function dressRnd(a, b) { return mulberry32((a * 92837111) ^ (b * 689287499) ^ 0x5bd1e995); }
function chAt(L, x, z) { return inGrid(L, x, z) ? L.ch[z * L.W + x] : '#'; }
function isOpenCell(L, x, z) { return cellKind(L, x, z) === 'open'; }
function isSolidCell(L, x, z) { return cellKind(L, x, z) === 'solid'; }
// floor you could stand a thing on: walkable, not a door or device spot
function freeFloor(L, x, z) {
  if (!inGrid(L, x, z)) return false;
  const i = z * L.W + x, c = L.ch[i];
  return L.walk[i] && L.lockAt[i] < 0 && !'SFGuvMcknfQz<@'.includes(c);
}

// ---------- ceiling holes: missing tiles in suspended ceilings ----------
function dressCeilingHoles(L) {
  const holes = new Set();
  for (let gz = 0; gz < L.H; gz++) for (let gx = 0; gx < L.W; gx++) {
    const i = gz * L.W + gx, ai = L.area[i];
    if (ai < 0 || !isOpenCell(L, gx, gz)) continue;
    const th = THEMES[L.areas[ai].theme];
    if (th.ceilType !== 'grid' || L.ceil[i] > 4) continue;
    const c = L.ch[i];
    if ('L!*SZz'.includes(c) || L.lockAt[i] >= 0 || L.safe[i]) continue;
    if (dressRnd(gx, gz)() < 0.075) holes.add(i);
  }
  return holes;
}

// ---------- wall runs ----------
function findWallRuns(L) {
  const runs = [], seen = new Set();
  // the broken-through wall of a lair is not a wall anything gets hung on
  const isSolidCell = (L, x, z) => cellKind(L, x, z) === 'solid' && !(L.tunnel && inGrid(L, x, z) && L.tunnel.has(z * L.W + x));
  const same = (x, z, ai, ceil, water) => inGrid(L, x, z) && isOpenCell(L, x, z) && !isCarCell(L, x, z) && L.area[z * L.W + x] === ai && L.ceil[z * L.W + x] === ceil && !!L.water[z * L.W + x] === water;
  for (let gz = 0; gz < L.H; gz++) for (let gx = 0; gx < L.W; gx++) {
    const i = gz * L.W + gx, ai = L.area[i];
    if (ai < 0 || !isOpenCell(L, gx, gz) || isCarCell(L, gx, gz)) continue;
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (!isSolidCell(L, gx + dx, gz + dz)) continue;
      const key = i * 4 + (dz === -1 ? 0 : dz === 1 ? 1 : dx === -1 ? 2 : 3);
      if (seen.has(key)) continue;
      const t = dz !== 0 ? [1, 0] : [0, 1], ceil = L.ceil[i], water = !!L.water[i];
      let sx = gx, sz = gz;
      while (same(sx - t[0], sz - t[1], ai, ceil, water) && isSolidCell(L, sx - t[0] + dx, sz - t[1] + dz)) { sx -= t[0]; sz -= t[1]; }
      const cells = [];
      let x = sx, z = sz;
      while (same(x, z, ai, ceil, water) && isSolidCell(L, x + dx, z + dz)) {
        cells.push([x, z]); seen.add((z * L.W + x) * 4 + (dz === -1 ? 0 : dz === 1 ? 1 : dx === -1 ? 2 : 3)); x += t[0]; z += t[1];
      }
      const n = [-dx, -dz];
      const p0 = t[0] ? [sx, sz + (dz > 0 ? 1 : 0)] : [sx + (dx > 0 ? 1 : 0), sz];
      // is there a doorway just past either end?
      const endA = [sx - t[0], sz - t[1]], endB = [x, z];
      const door = (p) => isOpenCell(L, p[0], p[1]) && isOpenCell(L, p[0] + dx, p[1] + dz);
      runs.push({ area: ai, dx, dz, t, n, p0, cells, len: cells.length, ceil, water, theme: L.areas[ai].theme, doorA: door(endA), doorB: door(endB), occ: { low: [], mid: [], top: [] } });
    }
  }
  return runs;
}
// a frame on the wall surface, s metres along the run; local +z points into the room
function runFrame(run, s, off = 0) {
  const x = run.p0[0] + run.t[0] * s + run.n[0] * off, z = run.p0[1] + run.t[1] * s + run.n[1] * off;
  return frame(x, z, Math.atan2(run.n[0], run.n[1]));
}
function runCellFree(L, run, s) {
  const k = Math.floor(clamp(s, 0, run.len - 0.001));
  const [x, z] = run.cells[k];
  return freeFloor(L, x, z) && !TALL_PROPS.has(chAt(L, x, z)) && !BLOCK_PROPS.has(chAt(L, x, z));
}
function reserve(run, band, a, b) {
  for (const [x, y] of run.occ[band]) if (a < y && b > x) return false;
  run.occ[band].push([a, b]);
  return true;
}

// ---------- canvas art for walls ----------
const ArtCache = {};
function artMat(kind, seed = 0) {
  const key = kind + seed;
  if (ArtCache[key]) return ArtCache[key];
  const r = mulberry32(seed * 7919 + kind.length * 31);
  const W = 512, H = kind === 'clock' ? 512 : kind === 'white' ? 384 : 680;
  const tex = canvasTex(W, H, (g, w, h) => {
    const font = (sz, wt = 800, fam = '"Big Shoulders Stencil Display", Impact, sans-serif') => { g.font = wt + ' ' + sz + 'px ' + fam; };
    const age = () => {
      for (let i = 0; i < 2600; i++) { g.fillStyle = 'rgba(60,45,20,' + r() * 0.08 + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
      for (let i = 0; i < 4; i++) { const x = r() * w, y = r() * h, rad = 30 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(110,80,30,0.16)'); gr.addColorStop(1, 'rgba(110,80,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    };
    if (kind === 'poster') {
      const v = seed % 4;
      g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, w, h);
      g.fillStyle = ['#c8402f', '#e2ad3b', '#2a5a8a', '#1b1e21'][v]; g.fillRect(0, 0, w, 150);
      g.fillStyle = v === 1 ? '#141414' : '#f2eee2'; font(76); g.textAlign = 'center';
      g.fillText(['WARNING', 'CAUTION', 'NOTICE', 'SECURITY'][v], w / 2, 108);
      g.fillStyle = '#1b1e21'; font(48, 800);
      const lines = [['REPORT ALL', 'SIGHTINGS TO', 'SECURITY'], ['HEARING', 'PROTECTION', 'REQUIRED'], ['DO NOT RUN', 'IN THE HALLS', 'WALK. STAY QUIET.'], ['LOCK DOWN', 'IN PROGRESS', 'SHELTER IN PLACE']][v];
      lines.forEach((l, i) => g.fillText(l, w / 2, 250 + i * 64));
      g.strokeStyle = '#1b1e21'; g.lineWidth = 8;
      g.beginPath(); g.arc(w / 2, 520, 70, 0, 6.28); g.stroke();
      if (v === 0) { g.beginPath(); g.moveTo(w / 2, 470); g.lineTo(w / 2, 530); g.stroke(); g.fillStyle = '#1b1e21'; g.fillRect(w / 2 - 5, 548, 10, 10); }
      else if (v === 1) { g.beginPath(); g.arc(w / 2, 520, 35, 3.6, 5.8); g.stroke(); g.beginPath(); g.arc(w / 2, 520, 52, 3.6, 5.8); g.stroke(); }
      else { g.beginPath(); g.moveTo(w / 2 - 50, 470); g.lineTo(w / 2 + 50, 570); g.stroke(); }
      font(20, 600, 'monospace'); g.fillStyle = '#4a4a4a'; g.fillText('FACILITY B-4  ·  FORM S-' + (10 + v), w / 2, 640);
      age();
    } else if (kind === 'evac') {
      g.fillStyle = '#eef0ea'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2a7a3a'; g.fillRect(0, 0, w, 90); g.fillStyle = '#fff'; font(54); g.textAlign = 'center'; g.fillText('EVACUATION ROUTE', w / 2, 66);
      g.strokeStyle = '#333'; g.lineWidth = 6; g.strokeRect(40, 130, w - 80, 420);
      g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.strokeRect(50 + r() * 300, 140 + r() * 300, 40 + r() * 120, 30 + r() * 100); }
      g.strokeStyle = '#2a9a4a'; g.lineWidth = 8; g.beginPath(); g.moveTo(90, 500); g.lineTo(90, 330); g.lineTo(380, 330); g.lineTo(380, 180); g.stroke();
      g.fillStyle = '#c8402f'; g.beginPath(); g.arc(90, 500, 14, 0, 6.28); g.fill(); font(26, 700, 'sans-serif'); g.fillText('YOU ARE HERE', 200, 590);
      age();
    } else if (kind === 'chart') {
      // R-7 growth chart: outlines of the subject, taller every week
      g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1b1e21'; font(44); g.textAlign = 'left'; g.fillText('R-7  HEIGHT LOG', 24, 56);
      g.strokeStyle = '#8a8a86'; g.lineWidth = 1;
      for (let y = 100; y < h - 20; y += 26) { g.beginPath(); g.moveTo(60, y); g.lineTo(w - 10, y); g.stroke(); }
      font(16, 600, 'monospace'); g.fillStyle = '#555'; for (let i = 0; i < 22; i++) g.fillText((11 - i * 0.5).toFixed(1) + 'm', 4, 106 + i * 26);
      const days = [12, 40, 77, 120, 168, 212];
      days.forEach((d, i) => {
        const x = 110 + i * 68, hgt = 90 + i * i * 14 + i * 40, base = h - 40;
        g.strokeStyle = i === days.length - 1 ? '#a01a12' : '#2a2a2a'; g.lineWidth = i === days.length - 1 ? 4 : 2;
        g.beginPath(); g.moveTo(x - 6, base); g.lineTo(x - 4, base - hgt * 0.45); g.lineTo(x - 12, base - hgt * 0.8); g.lineTo(x, base - hgt);
        g.lineTo(x + 10, base - hgt * 0.78); g.lineTo(x + 26, base - hgt * 0.2); g.moveTo(x + 4, base - hgt * 0.45); g.lineTo(x + 6, base); g.stroke();
        g.fillStyle = '#333'; font(14, 600, 'monospace'); g.fillText('D' + d, x - 12, base + 22);
      });
      g.fillStyle = '#a01a12'; font(30, 700, 'cursive'); g.save(); g.rotate(-0.08); g.fillText('still growing', 250, 160); g.restore();
      age();
    } else if (kind === 'white') {
      g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(80,80,90,' + r() * 0.06 + ')'; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 80, 10 + r() * 30, r(), 0, 6.28); g.fill(); }
      g.strokeStyle = '#1a3a7a'; g.lineWidth = 3; g.fillStyle = '#1a3a7a'; font(30, 600, 'cursive'); g.textAlign = 'left';
      const v = seed % 3;
      if (v === 0) {
        g.fillText('R-7 feeding:', 20, 50); ['MON  4kg', 'WED  6kg', 'FRI  9kg'].forEach((t, i) => g.fillText(t, 40, 95 + i * 40));
        g.strokeStyle = '#a01a12'; g.lineWidth = 4; g.beginPath(); g.moveTo(15, 190); g.lineTo(260, 60); g.stroke();
        g.fillStyle = '#a01a12'; g.fillText('NOT ENOUGH', 280, 120);
      } else if (v === 1) {
        g.fillText('Shift handover', 20, 50); g.strokeRect(20, 70, 200, 120); g.strokeRect(260, 70, 200, 120);
        g.beginPath(); g.moveTo(220, 130); g.lineTo(260, 130); g.stroke(); g.fillText('?', 330, 140); g.fillText('who has the key', 40, 250);
      } else {
        g.fillText('DON’T LET IT HEAR YOU', 20, 60);
        g.lineWidth = 3; g.beginPath(); g.moveTo(300, 330); g.lineTo(310, 220); g.lineTo(290, 140); g.lineTo(320, 90); g.lineTo(340, 140); g.lineTo(380, 300); g.moveTo(310, 160); g.lineTo(250, 260); g.lineTo(240, 330); g.stroke();
        g.fillStyle = '#a01a12'; g.fillText('3.4m?', 360, 110);
      }
    } else if (kind === 'clock') {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f0ede4'; g.beginPath(); g.arc(256, 256, 240, 0, 6.28); g.fill();
      g.fillStyle = '#1b1e21'; font(56, 700, 'sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 1; i <= 12; i++) { const a = i / 12 * 6.283; g.fillText(String(i), 256 + Math.sin(a) * 185, 256 - Math.cos(a) * 185); }
      g.strokeStyle = '#1b1e21'; g.lineCap = 'round';
      const hand = (a, len, wdt) => { g.lineWidth = wdt; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(a) * len, 256 - Math.cos(a) * len); g.stroke(); };
      hand((3 + 12 / 60) / 12 * 6.283, 120, 14); hand(12 / 60 * 6.283, 180, 9);
      g.strokeStyle = '#a01a12'; hand(41 / 60 * 6.283, 200, 3);
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(120, 80); g.lineTo(260, 270); g.lineTo(420, 330); g.moveTo(260, 270); g.lineTo(200, 440); g.stroke();
    } else if (kind === 'notice') {
      g.fillStyle = '#ecebe4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1b1e21'; font(40, 700, 'monospace'); g.textAlign = 'left';
      const v = seed % 4;
      g.fillText(['MEMO', 'NOTICE', 'MAINT. LOG', 'ATTENTION'][v], 30, 70);
      font(22, 500, 'monospace');
      const txt = [['All staff on B-4:', 'Do not open Dock B.', 'Crate 7 is NOT to', 'be moved without', 'containment present.'],
        ['Shelters are on', 'every level. If you', 'hear it, get inside', 'and stay back from', 'the door.'],
        ['Pump 2: failing', 'Pump 3: failing', 'Tunnel 6 lights out', 'Something in the', 'vents again.'],
        ['It learned the', 'keypad codes.', 'Codes changed at', '0600. Tell no one', 'out loud.']][v];
      txt.forEach((t, i) => g.fillText(t, 30, 130 + i * 40));
      g.fillStyle = 'rgba(160,26,18,0.8)'; font(26, 600, 'cursive'); if (r() < 0.6) g.fillText('it listens', 260, 560);
      age();
    } else if (kind === 'tally') {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(30,24,20,0.85)'; g.lineWidth = 6; g.lineCap = 'round';
      let x = 40, y = 120;
      for (let i = 0; i < 37; i++) {
        if (i % 5 === 4) { g.beginPath(); g.moveTo(x - 92, y + 70); g.lineTo(x + 6, y - 10); g.stroke(); x += 40; }
        else { g.beginPath(); g.moveTo(x + (r() - 0.5) * 6, y); g.lineTo(x + (r() - 0.5) * 6, y + 80); g.stroke(); x += 22; }
        if (x > w - 60) { x = 40; y += 130; }
      }
      g.fillStyle = 'rgba(30,24,20,0.9)'; font(70, 700, 'cursive'); g.fillText('IT HEARS', 60, 600);
    }
  });
  const transparent = kind === 'tally';
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: kind === 'white' || kind === 'clock' ? 0.25 : 0.85, transparent, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  m.userData.noShadow = true;
  ArtCache[key] = m;
  return m;
}

// ---------- wall items: each builder works in a wall frame (origin on the wall, +z into the room) ----------
const WALL_ITEMS = {
  ext(B, f, r) { // fire extinguisher on a bracket, with a sign above
    f.cbox(B, mat('steelDark'), 0, 1.0, 0.02, 0.1, 0.16, 0.04, 0.005);
    f.cyl(B, plainMat(0xa8160e, { roughness: 0.28, metalness: 0.2 }), 0, 0.82, 0.11, 0.075, 0.075, 0.5, 18);
    f.sphere(B, plainMat(0xa8160e, { roughness: 0.28, metalness: 0.2 }), 0, 1.07, 0.11, 0.075, 0.5);
    f.cyl(B, PM.black, 0, 1.13, 0.11, 0.02, 0.025, 0.08, 10);
    f.cbox(B, PM.black, 0.04, 1.17, 0.11, 0.12, 0.02, 0.03, 0.006, 0, 1, 0, -0.3);
    f.cyl(B, plainMat(0xe8e8e0, { roughness: 0.3 }), -0.03, 1.15, 0.15, 0.018, 0.018, 0.01, 10, Math.PI / 2);
    B.add(PM.black, tubeGeo([f.w(0.04, 1.14, 0.13), f.w(0.09, 1.0, 0.16), f.w(0.08, 0.72, 0.17), f.w(0.04, 0.62, 0.16)], 0.009, 12, 5), _m4.identity());
    f.geo(B, labelMat('FIRE EXTINGUISHER', { bg: '#b01a12', fg: '#f2eee2', w: 256, h: 96, size: 30 }), planeGeo(0.3, 0.11), 0, 1.6, 0.004);
  },
  alarm(B, f) {
    f.cbox(B, plainMat(0xb01a12, { roughness: 0.35 }), 0, 1.25, 0.03, 0.12, 0.16, 0.06, 0.01);
    f.cbox(B, plainMat(0xf2eee2, { roughness: 0.4 }), 0, 1.24, 0.065, 0.06, 0.04, 0.02, 0.004);
    f.geo(B, labelMat('FIRE', { fg: '#f2eee2', w: 128, h: 48 }), planeGeo(0.08, 0.03), 0, 1.3, 0.061);
    f.cyl(B, plainMat(0xb01a12, { roughness: 0.3, metalness: 0.4 }), 0, 2.3, 0.05, 0.1, 0.1, 0.06, 18, Math.PI / 2);
    f.cyl(B, PM.chrome, 0, 2.3, 0.09, 0.012, 0.012, 0.03, 8, Math.PI / 2);
  },
  panel(B, f, r, ctx) { // electrical panel with conduit to the ceiling
    const big = r() < 0.4, w = big ? 0.75 : 0.5, h = big ? 1.1 : 0.7, y = big ? 1.2 : 1.35;
    const body = mat('metal', { color: [0x8a8e92, 0x6a7a6e, 0x5a6670][Math.floor(r() * 3)] });
    f.cbox(B, body, 0, y, 0.08, w, h, 0.16, 0.012);
    f.cbox(B, body, 0, y, 0.165, w - 0.04, h - 0.04, 0.012, 0.004);
    f.cbox(B, PM.chrome, w / 2 - 0.08, y, 0.175, 0.025, 0.1, 0.02, 0.005);
    for (const s of [-1, 1]) f.cyl(B, PM.chrome, -w / 2 + 0.01, y + s * h * 0.35, 0.17, 0.008, 0.008, 0.05, 8);
    f.geo(B, labelMat(['PANEL 4B', 'DP-2', '480V  ·  LP-7', 'MCC-1'][Math.floor(r() * 4)], { bg: '#d8d4c8', fg: '#141414', w: 256, h: 64, size: 34 }), planeGeo(w * 0.5, w * 0.12), 0, y + h * 0.36, 0.172);
    f.geo(B, labelMat('DANGER  HIGH VOLTAGE', { bg: '#e2ad3b', fg: '#141414', w: 512, h: 64, size: 40 }), planeGeo(w * 0.7, w * 0.09), 0, y - h * 0.3, 0.172);
    const top = Math.min(ctx.ceil - 0.05, 4.5);
    for (let k = 0; k < (big ? 3 : 2); k++) f.cyl(B, mat('steel', { color: 0xa0a4a8 }), -w * 0.3 + k * 0.1, (top + y + h / 2) / 2, 0.05, 0.016, 0.016, top - y - h / 2, 8);
  },
  vent(B, f, r) { // louvred grille, high or low
    const low = r() < 0.35, y = low ? 0.3 : 2.25, w = 0.5, h = 0.32;
    f.cbox(B, plainMat(0xb8b8b2, { roughness: 0.5, metalness: 0.3 }), 0, y, 0.012, w, h, 0.024, 0.006);
    f.box(B, plainMat(0x050505), 0, y, 0.022, w - 0.06, h - 0.06, 0.004);
    for (let k = 0; k < 6; k++) f.cbox(B, plainMat(0xa8a8a2, { roughness: 0.5, metalness: 0.3 }), 0, y - h / 2 + 0.05 + k * 0.045, 0.03, w - 0.06, 0.008, 0.03, 0.002, 0, 1, -0.6);
    if (r() < 0.25) f.geo(B, decalMat('grime'), planeGeo(0.9, 0.9), 0, y + 0.35, 0.003);
  },
  cork(B, f, r) {
    f.cbox(B, mat('wood', { color: 0x8a6a4a }), 0, 1.5, 0.012, 1.0, 0.7, 0.024, 0.006);
    f.box(B, plainMat(0x9a7448, { roughness: 0.95 }), 0, 1.5, 0.026, 0.94, 0.64, 0.004);
    for (let k = 0; k < 6; k++) {
      const x = -0.35 + r() * 0.7, y = 1.32 + r() * 0.36;
      f.geo(B, r() < 0.5 ? artMat('notice', Math.floor(r() * 4)) : PM.paper, planeGeo(0.15, 0.2), x, y, 0.03 + k * 0.001, 0, 0, (r() - 0.5) * 0.25);
      f.sphere(B, plainMat([0xc8402f, 0x2a5a8a, 0xe2ad3b][k % 3], { roughness: 0.3 }), x, y + 0.08, 0.035, 0.008);
    }
  },
  poster(B, f, r) {
    const ev = r() < 0.3;
    f.cbox(B, PM.black, 0, 1.5, 0.008, 0.52, 0.7, 0.016, 0.004);
    f.geo(B, artMat(ev ? 'evac' : 'poster', Math.floor(r() * 8)), planeGeo(0.48, 0.66), 0, 1.5, 0.017, 0, 0, ev ? 0 : (r() - 0.5) * 0.03);
    f.box(B, plainMat(0xdfe8ea, { transparent: true, opacity: 0.12, roughness: 0.05, ws: false }), 0, 1.5, 0.019, 0.48, 0.66, 0.002);
  },
  white(B, f, r) {
    f.cbox(B, PM.chrome, 0, 1.45, 0.012, 1.24, 0.94, 0.024, 0.008);
    f.geo(B, artMat('white', Math.floor(r() * 3)), planeGeo(1.2, 0.9), 0, 1.45, 0.025);
    f.cbox(B, PM.chrome, 0, 0.97, 0.04, 1.0, 0.02, 0.06, 0.004);
    for (let k = 0; k < 3; k++) f.cyl(B, plainMat([0x1a3a7a, 0xa01a12, 0x111111][k], { roughness: 0.4 }), -0.3 + k * 0.08, 0.99, 0.05, 0.008, 0.008, 0.12, 8, 0, Math.PI / 2);
  },
  clock(B, f) {
    f.cyl(B, PM.black, 0, 2.2, 0.02, 0.17, 0.17, 0.04, 28, Math.PI / 2);
    f.geo(B, artMat('clock', 0), planeGeo(0.3, 0.3), 0, 2.2, 0.041);
  },
  phone(B, f, r) { // wall phone; the receiver hangs by its cord
    f.cbox(B, plainMat(0xc8c0a8, { roughness: 0.45 }), 0, 1.4, 0.04, 0.18, 0.26, 0.08, 0.02);
    f.cbox(B, PM.black, 0, 1.36, 0.081, 0.1, 0.12, 0.004, 0.002);
    B.add(PM.black, tubeGeo([f.w(-0.06, 1.3, 0.08), f.w(-0.05, 1.0, 0.1), f.w(-0.02, 0.75, 0.12), f.w(0.0, 0.55, 0.1)], 0.008, 14, 5), _m4.identity());
    f.cbox(B, plainMat(0xc8c0a8, { roughness: 0.45 }), 0.0, 0.48, 0.1, 0.05, 0.2, 0.06, 0.02, 0.3, 1, 0.2);
  },
  eyewash(B, f) {
    f.cyl(B, plainMat(0x9ac83a, { roughness: 0.4 }), 0, 1.0, 0.1, 0.14, 0.09, 0.12, 18);
    f.cyl(B, mat('steel'), 0, 0.6, 0.05, 0.025, 0.025, 0.8, 10);
    f.cbox(B, plainMat(0x2a8a3a, { roughness: 0.6 }), 0, 1.8, 0.005, 0.32, 0.32, 0.01, 0.003);
    f.geo(B, labelMat('EYE WASH', { bg: '#2a8a3a', fg: '#f2eee2', w: 256, h: 96, size: 44 }), planeGeo(0.3, 0.11), 0, 1.8, 0.011);
  },
  firstaid(B, f) {
    f.cbox(B, plainMat(0xe8e6e0, { roughness: 0.45 }), 0, 1.45, 0.06, 0.4, 0.32, 0.12, 0.015);
    f.box(B, plainMat(0x2a8a3a), 0, 1.45, 0.121, 0.12, 0.035, 0.002); f.box(B, plainMat(0x2a8a3a), 0, 1.45, 0.121, 0.035, 0.12, 0.002);
  },
  hooks(B, f, r) { // coat hooks with lab coats
    f.cbox(B, mat('steel'), 0, 1.75, 0.01, 0.9, 0.06, 0.02, 0.004);
    for (let k = 0; k < 3; k++) {
      const x = -0.3 + k * 0.3;
      f.cyl(B, PM.chrome, x, 1.75, 0.05, 0.008, 0.008, 0.08, 8, Math.PI / 2);
      if (r() < 0.7) { f.cbox(B, mat('fabric', { color: 0xe6e6e0 }), x, 1.25, 0.08, 0.34, 0.95, 0.08, 0.04, 0, 1, 0.04); f.cbox(B, mat('fabric', { color: 0xe6e6e0 }), x, 1.66, 0.07, 0.22, 0.16, 0.06, 0.03); }
    }
  },
  gauge(B, f, r) {
    // a riser clamped to the wall up to a tee, a short stub, the dial, and a little valve below it
    const y = 1.3 + r() * 0.5, m = mat('rust'), dk = mat('steelDark');
    f.cyl(B, m, 0, (y + 0.05) / 2, 0.055, 0.024, 0.024, y + 0.05, 10);
    f.sphere(B, m, 0, y + 0.03, 0.055, 0.033);
    f.cyl(B, m, 0, y + 0.03, 0.1, 0.018, 0.018, 0.09, 10, Math.PI / 2);
    for (const yy of [0.35, y - 0.3]) f.cbox(B, dk, 0, yy, 0.03, 0.09, 0.035, 0.055, 0.005);
    f.cyl(B, PM.chrome, 0, y + 0.03, 0.155, 0.075, 0.075, 0.04, 22, Math.PI / 2);
    f.geo(B, labelMat(['0  ·  PSI  ·  300', 'BAR'][Math.floor(r() * 2)], { bg: '#ecebe4', fg: '#141414', w: 128, h: 128, size: 18, font: 'monospace' }), cachedGeo('gaugeFace', () => new THREE.CircleGeometry(0.064, 20)), 0, y + 0.03, 0.176);
    f.cbox(B, PM.black, 0.014, y + 0.04, 0.178, 0.05, 0.006, 0.002, 0.001, 0, 1, 0, 0.7 + r() * 1.5);
    f.torus(B, plainMat(0x9a1c14, { roughness: 0.4 }), 0, y - 0.15, 0.11, 0.04, 0.008, Math.PI / 2);
    f.cyl(B, m, 0, y - 0.15, 0.08, 0.012, 0.012, 0.05, 8, Math.PI / 2);
  },
  pipeV(B, f, r, ctx) { // a vertical pipe drop with brackets
    const rad = 0.05 + r() * 0.06, m = r() < 0.5 ? mat('rust') : mat('metal', { color: DRESS.pipeCols[1 + Math.floor(r() * 4)] });
    const top = ctx.ceil;
    f.cyl(B, m, 0, top / 2, rad + 0.05, rad, rad, top, 14, 0, 0, 1.2);
    for (let y = 0.6; y < top - 0.2; y += 1.4) { f.cbox(B, mat('steelDark'), 0, y, 0.03, rad * 2 + 0.08, 0.05, 0.06, 0.006); f.cyl(B, mat('steelDark'), 0, y, rad + 0.05, rad + 0.012, rad + 0.012, 0.04, 14); }
    if (r() < 0.5) { f.cyl(B, mat('steelDark'), 0, 1.1, rad + 0.05, rad + 0.03, rad + 0.03, 0.12, 14); f.torus(B, plainMat(0xa0281c, { roughness: 0.5, metalness: 0.4 }), 0, 1.1, rad * 2 + 0.2, 0.12, 0.014, 0); f.cyl(B, mat('steelDark'), 0, 1.1, rad * 2 + 0.12, 0.015, 0.015, 0.16, 8, Math.PI / 2); }
  },
  hand(B, f, r) { // long-fingered handprints, high up where it braced itself
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) f.geo(B, decalMat('hand'), planeGeo(0.7, 0.85), (k - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.2, 1.9 + r() * 0.9, 0.006 + k * 0.001, 0, 0, (r() - 0.5) * 1.2);
  },
  scratch(B, f, r) { f.geo(B, decalMat('scratch'), planeGeo(1.1, 1.5), 0, 1.4 + r() * 1.0, 0.006, 0, 0, (r() - 0.5) * 0.6); },
  notice(B, f, r) { f.geo(B, artMat('notice', Math.floor(r() * 4)), planeGeo(0.21, 0.28), 0, 1.45 + r() * 0.2, 0.006, 0, 0, (r() - 0.5) * 0.12); },
  tally(B, f, r) { f.geo(B, artMat('tally', 1), planeGeo(1.0, 1.3), 0, 1.3, 0.006); },
  intercom(B, f) {
    f.cbox(B, mat('steel'), 0, 1.45, 0.02, 0.2, 0.3, 0.04, 0.008);
    for (let k = 0; k < 5; k++) f.box(B, PM.black, 0, 1.52 - k * 0.018, 0.041, 0.12, 0.008, 0.002);
    f.cyl(B, plainMat(0x9a1a12, { roughness: 0.4 }), 0, 1.36, 0.045, 0.025, 0.025, 0.012, 14, Math.PI / 2);
  },
  ring(B, f, r) { // restraint ring anchored to the wall, sometimes with a broken chain
    const y = 0.9 + r() * 1.2;
    f.cbox(B, mat('steelDark'), 0, y, 0.015, 0.14, 0.14, 0.03, 0.006);
    f.torus(B, mat('rust'), 0, y - 0.07, 0.05, 0.06, 0.012, 0);
    if (r() < 0.5) for (let k = 0; k < 5; k++) f.torus(B, mat('rust'), 0, y - 0.15 - k * 0.07, 0.06, 0.035, 0.008, k % 2 ? Math.PI / 2 : 0);
  },
  ladder(B, f, r, ctx) { // fixed ladder up to a sealed hatch
    const top = ctx.ceil;
    for (const s of [-0.22, 0.22]) f.cyl(B, mat('steel', { color: 0xb89a2a }), s, top / 2, 0.15, 0.02, 0.02, top, 8);
    for (let y = 0.3; y < top - 0.1; y += 0.3) f.cyl(B, mat('steel', { color: 0xb89a2a }), 0, y, 0.15, 0.016, 0.016, 0.44, 8, 0, Math.PI / 2);
    f.cbox(B, mat('steelDark'), 0, top - 0.04, 0.4, 0.7, 0.06, 0.7, 0.01);
  },
  emerg(B, f, r, ctx, run) { // battery emergency light: two lamp heads, some still burning
    const y = Math.min(ctx.ceil - 0.35, 2.5);
    f.cbox(B, plainMat(0xe8e6e0, { roughness: 0.45 }), 0, y, 0.05, 0.32, 0.14, 0.1, 0.02);
    const G = World.lightGroups[run.area];
    const grp = r() < 0.55 ? G.f[Math.floor(r() * 3)] : r() < 0.6 ? G.on : G.dead;
    for (const s of [-1, 1]) {
      f.cyl(B, PM.black, s * 0.1, y + 0.1, 0.1, 0.04, 0.045, 0.07, 12, -0.9);
      f.cyl(B, groupMat(G, grp, 0xfff0d0, 7, 'emerg'), s * 0.1, y + 0.08, 0.135, 0.032, 0.032, 0.006, 12, -0.9);
    }
    f.box(B, basicMat(grp.kind === 'dead' ? '#3a1010' : '#ff3b2f'), 0.12, y - 0.04, 0.101, 0.012, 0.012, 0.002);
    const p = f.w(0, y + 0.08, 0.3);
    addLightSpot({ x: p[0], y: p[1] - 0.1, z: p[2], color: 0xffe8c8, base: 3.2, range: 7, area: run.area, grp, kind: 'emerg', hy: y + 0.1, haloSize: 0.6 });
  },
  bumper(B, f) {},
};

// ---------- continuous runs along walls: conduit, pipes, cable trays ----------
function runConduit(B, run, y, rnd) {
  const n = run.len;
  const a = runFrame(run, 0.05), b = runFrame(run, n - 0.05);
  const m = mat('steel', { color: 0xa0a4a8 });
  const pa = a.w(0, y, 0.035), pb = b.w(0, y, 0.035);
  const len = n - 0.1;
  const mid = runFrame(run, n / 2);
  mid.cyl(B, m, 0, y, 0.035, 0.011, 0.011, len, 8, 0, Math.PI / 2);
  for (let s = 0.5; s < n; s += 1) { const f = runFrame(run, s); f.cbox(B, mat('steelDark'), 0, y, 0.02, 0.03, 0.035, 0.03, 0.004); }
  for (let s = 1.5 + rnd() * 2; s < n - 0.5; s += 3 + rnd() * 4) {
    const f = runFrame(run, s);
    f.cbox(B, plainMat(0x8a8e92, { roughness: 0.45, metalness: 0.5 }), 0, y, 0.045, 0.11, 0.11, 0.06, 0.008);
    if (rnd() < 0.35 && runCellFree(Game.L, run, s)) { // a drop down to a switch box
      f.cyl(B, m, 0, (y + 1.3) / 2, 0.035, 0.011, 0.011, y - 1.3, 8);
      f.cbox(B, plainMat(0x8a8e92, { roughness: 0.45, metalness: 0.5 }), 0, 1.25, 0.04, 0.09, 0.13, 0.05, 0.006);
    }
  }
}
function runPipes(B, run, rnd, count) {
  const n = run.len, mid = runFrame(run, n / 2);
  const yTop = Math.min(run.ceil - 0.35, 5.2);
  for (let p = 0; p < count; p++) {
    const rad = [0.05, 0.07, 0.1, 0.13][Math.floor(rnd() * 4)];
    const colIdx = Math.floor(rnd() * DRESS.pipeCols.length), col = DRESS.pipeCols[colIdx];
    const m = col === null ? mat('rust') : mat('metal', { color: col });
    const y = yTop - p * 0.32, off = 0.06 + rad;
    mid.cyl(B, m, 0, y, off, rad, rad, n, 16, 0, Math.PI / 2, 1.2);
    for (let s = 0.6; s < n; s += 1.2) { const f = runFrame(run, s); f.cbox(B, mat('steelDark'), 0, y - rad - 0.02, off / 2 + 0.01, 0.05, 0.03, off + 0.02, 0.004); }
    for (let s = 1.2 + rnd(); s < n - 0.3; s += 2.4) { const f = runFrame(run, s); f.cyl(B, mat('steelDark'), 0, y, off, rad + 0.018, rad + 0.018, 0.05, 16, 0, Math.PI / 2); }
    if (col !== null && n > 4) for (let s = 2; s < n - 1; s += 6) { const f = runFrame(run, s); f.geo(B, labelMat(['WATER  ▶', 'AIR  ▶', 'FIRE  ▶', 'GAS  ▶'][colIdx - 1] || 'WATER  ▶', { bg: '#e8e4d8', fg: '#141414', w: 256, h: 64, size: 34 }), planeGeo(0.32, 0.08), 0, y, off + rad + 0.003); }
  }
}
function runTray(B, run, y) {
  const n = run.len, mid = runFrame(run, n / 2);
  const m = mat('steel', { color: 0x9a9ea2 });
  for (const z of [0.06, 0.4]) mid.cbox(B, m, 0, y, z, n, 0.06, 0.012, 0.003);
  for (let s = 0.15; s < n; s += 0.3) { const f = runFrame(run, s); f.box(B, m, 0, y - 0.025, 0.23, 0.02, 0.012, 0.34); }
  for (let k = 0; k < 5; k++) mid.cyl(B, plainMat([0x111214, 0x1a2a4a, 0x7a6a1a, 0x111214, 0x3a1a1a][k], { roughness: 0.55 }), 0, y - 0.01, 0.12 + k * 0.055, 0.022, 0.022, n, 8, 0, Math.PI / 2);
  for (let s = 0.8; s < n; s += 1.6) { const f = runFrame(run, s); f.cbox(B, mat('steelDark'), 0, (y + run.ceil) / 2, 0.23, 0.02, run.ceil - y, 0.02, 0.003); }
}
// painted walkway lines on the floor along a wall
function runFloorLine(B, run, off) {
  const n = run.len;
  if (n < 3) return;
  const mid = runFrame(run, n / 2);
  mid.geo(B, lineMat(), cachedGeo('fline' + n, () => { const g = new THREE.PlaneGeometry(n - 0.6, 0.09).rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (n - 0.6) / 2); return g; }), 0, 0.004, off);
}
let _lineMat = null;
function lineMat() {
  if (_lineMat) return _lineMat;
  const t = canvasTex(512, 32, (g, w, h) => {
    g.fillStyle = '#d9a535'; g.fillRect(0, 0, w, h);
    const r = mulberry32(9);
    for (let i = 0; i < 500; i++) { g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,' + r() * 0.9 + ')'; g.fillRect(r() * w, r() * h, 2 + r() * 10, 1 + r() * 6); }
    g.globalCompositeOperation = 'source-over';
  });
  t.wrapS = THREE.RepeatWrapping;
  _lineMat = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
  _lineMat.userData.noShadow = true;
  return _lineMat;
}

// ---------- the vent the creature comes out of: a ragged breach in the wall ----------
let _breachMat = null;
function breachMat() {
  if (_breachMat) return _breachMat;
  const t = canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const r = mulberry32(31);
    const pts = [];
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; const rad = 190 + (r() - 0.5) * 90 + Math.sin(a * 5) * 20; pts.push([256 + Math.cos(a) * rad * 1.05, 300 + Math.sin(a) * rad * 0.85]); }
    g.fillStyle = 'rgba(40,34,28,0.9)'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * 1.08 - 20, y * 1.06 - 18) : g.moveTo(x * 1.08 - 20, y * 1.06 - 18))); g.fill();
    g.fillStyle = '#020101'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
    g.strokeStyle = 'rgba(15,10,8,0.9)'; g.lineWidth = 7; g.lineCap = 'round';
    for (let k = 0; k < 14; k++) { const a = r() * 6.28; const x = 256 + Math.cos(a) * 200, y = 300 + Math.sin(a) * 170; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (30 + r() * 60), y + Math.sin(a) * (30 + r() * 60)); g.stroke(); }
  });
  _breachMat = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false });
  _breachMat.userData.noShadow = true;
  return _breachMat;
}
function dressLair(L, B, lair, ai, rnd) {
  const gx = Math.floor(lair.x), gz = Math.floor(lair.z);
  let side = null;
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (isSolidCell(L, gx + dx, gz + dz)) { side = [dx, dz]; break; }
  if (!side) return;
  const f = frame(gx + 0.5 + side[0] * 0.5, gz + 0.5 + side[1] * 0.5, Math.atan2(-side[0], -side[1]));
  // how much wall there is either side of the vent, so the breach never hangs off the end of it
  const tx = side[1] !== 0 ? 1 : 0, tz = side[0] !== 0 ? 1 : 0;
  const wallRun = (dir) => { let n = 0; while (n < 3 && isSolidCell(L, gx + tx * dir * (n + 1) + side[0], gz + tz * dir * (n + 1) + side[1]) && isOpenCell(L, gx + tx * dir * (n + 1), gz + tz * dir * (n + 1))) n++; return n; };
  const bw = Math.min(2.6, 1 + 2 * Math.min(wallRun(1), wallRun(-1)) * 0.9 + 0.2);
  f.geo(B, breachMat(), planeGeo(bw, 2.6), 0, 1.15, 0.008);
  const edge = (x) => Math.sign(x) * Math.min(Math.abs(x), Math.max(0, bw / 2 - 0.25));
  // torn grille, bent sheet metal, rubble and claw marks
  f.cbox(B, plainMat(0xb8b8b2, { roughness: 0.5, metalness: 0.4 }), -0.4, 0.06, 0.6, 0.9, 0.02, 0.55, 0.004, 0.6, 1, 0.1, 0.15);
  for (let k = 0; k < 7; k++) f.cbox(B, plainMat(0xa8a8a2, { roughness: 0.5, metalness: 0.4 }), -0.4 + k * 0.1, 0.09, 0.6 + (k % 2) * 0.05, 0.02, 0.008, 0.5, 0.002, 0.6, 1, 0.1, 0.15);
  for (const s of [-1, 1]) { const sx = Math.sign(s) * Math.min(1.05, Math.max(0.3, bw / 2 - 0.2)); f.cbox(B, mat('metal', { color: 0x7a7e82 }), sx, 1.5, 0.15, 0.5, 0.9, 0.012, 0.004, s * 0.9, 1, 0.3, s * 0.4); const p = f.w(sx, 0, 0.35); addCollider(L, p[0], p[2], 0.26); }
  for (let k = 0; k < 26; k++) {
    const sz = 0.05 + rnd() * 0.18;
    f.cbox(B, mat('concrete'), (rnd() - 0.5) * 2.4, sz * 0.4, 0.15 + rnd() * 1.4, sz, sz * 0.7, sz * 0.9, sz * 0.15, rnd() * 3, 1, rnd(), rnd());
  }
  for (let k = 0; k < 3; k++) { const a = rnd() * 6.28; f.cyl(B, mat('rust'), (rnd() - 0.5) * 1.6, 0.4 + rnd() * 1.4, 0.05, 0.008, 0.008, 0.5 + rnd() * 0.4, 6, a, rnd()); }
  if (bw > 2.0) {
    f.geo(B, decalMat('scratch'), planeGeo(1.3, 1.7), edge(-1.5), 1.6, 0.007, 0, 0, 0.4);
    f.geo(B, decalMat('scratch'), planeGeo(1.3, 1.7), edge(1.6), 1.3, 0.007, 0, 0, -0.5);
  }
  f.geo(B, decalMat('hand'), planeGeo(0.8, 0.95), edge(1.1), 2.6, 0.007, 0, 0, -0.7);
  f.geo(B, decalMat('drag'), cachedGeo('dragFloor', () => new THREE.PlaneGeometry(1.2, 3.0).rotateX(-Math.PI / 2)), 0.2, 0.009, 1.6, 0.15);
}

// ---------- doorways: frames, open door leaves, exit signs ----------
let _exitMat = null;
function exitMat() {
  if (_exitMat) return _exitMat;
  const t = canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#0a2a14'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7dffb0'; g.font = '900 64px "Big Shoulders Stencil Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', w / 2 - 20, h / 2 + 3);
    g.beginPath(); g.moveTo(200, 30); g.lineTo(232, 48); g.lineTo(200, 66); g.fill();
  });
  _exitMat = new THREE.MeshStandardMaterial({ color: 0x050805, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 2.2, roughness: 0.3 });
  return _exitMat;
}
function dressDoorways(L, batches) {
  for (const d of World.doorways || []) {
    const { gx, gz, ai, alongX, top } = d;
    const B = batches[ai], th = World.areas[ai].theme, theme = L.areas[ai].theme;
    const rnd = dressRnd(gx * 3, gz * 5);
    // the wall runs along x when the opening faces z
    const wallAlongX = !alongX;
    // which side is the room (more open cells beside the door)
    const openN = (dz) => [-1, 1].filter((s) => wallAlongX ? isOpenCell(L, gx + s, gz + dz) : isOpenCell(L, gx + dz, gz + s)).length;
    const roomSide = openN(-1) >= openN(1) ? -1 : 1;
    const leafy = ['office', 'lab', 'cold', 'contain', 'server', 'ward', 'landing', 'dayroom', 'oldwing'].includes(theme);
    const isShelterDoor = L.ch[gz * L.W + gx] === 'S'; // shelters never get a door leaf
    if (leafy && !isShelterDoor && rnd() < 0.85) {
      // a door leaf swung open against the wall on the room side
      const col = { office: 0x8a6a4a, lab: 0xd8dcd8, cold: 0xb8c4cc, contain: 0x5a6066, server: 0x6a7076 }[theme];
      const leafM = theme === 'office' || theme === 'oldwing' ? mat('wood', { color: 0xb08a68 }) : theme === 'ward' || theme === 'landing' || theme === 'dayroom' ? mat('paint', { color: 0x9aa494 }) : mat('metal', { color: col });
      const hingeSide = rnd() < 0.5 ? -1 : 1;
      const ang = 1.5 + rnd() * 0.055;
      const fx = wallAlongX ? gx + 0.5 + hingeSide * 0.45 : gx + 0.5 + roomSide * 0.5;
      const fz = wallAlongX ? gz + 0.5 + roomSide * 0.5 : gz + 0.5 + hingeSide * 0.45;
      // leaf hinged at (fx,fz); closed it would span the opening, open it lies along the wall into the room
      const base = wallAlongX ? (hingeSide < 0 ? 0 : Math.PI) : (hingeSide < 0 ? -Math.PI / 2 : Math.PI / 2);
      const sgn = wallAlongX ? roomSide * hingeSide : -roomSide * hingeSide;
      const hf = frame(fx, fz, base + sgn * ang);
      hf.cbox(B, leafM, 0.45, 1.06, 0.0, 0.88, 2.1, 0.045, 0.006);
      for (const lx of [0.25, 0.5, 0.75]) { const p = hf.w(lx, 0, 0); addCollider(L, p[0], p[2], 0.09); }
      hf.cbox(B, PM.chrome, 0.8, 1.0, 0.04, 0.12, 0.02, 0.02, 0.004);
      hf.cbox(B, PM.chrome, 0.8, 1.0, -0.04, 0.12, 0.02, 0.02, 0.004);
      if (theme !== 'office') hf.cbox(B, plainMat(0x9a9ea2, { roughness: 0.35, metalness: 0.8 }), 0.45, 0.15, 0.025, 0.84, 0.25, 0.004, 0.002);
      if (theme === 'lab' || theme === 'contain') { hf.box(B, PM.black, 0.45, 1.55, 0, 0.22, 0.5, 0.05); hf.box(B, PM.glass, 0.45, 1.55, 0, 0.2, 0.46, 0.052); }
      if (rnd() < 0.4) hf.cbox(B, PM.chrome, 0.06, 2.0, 0.12, 0.3, 0.03, 0.04, 0.006);
    }
    // exit sign over some doorways, and a room plate beside office and lab doors
    if (rnd() < 0.3 && top + 0.35 < L.ceil[gz * L.W + gx]) {
      const f = wallAlongX ? frame(gx + 0.5, gz + 0.5, roomSide > 0 ? 0 : Math.PI) : frame(gx + 0.5, gz + 0.5, roomSide > 0 ? Math.PI / 2 : -Math.PI / 2);
      f.cbox(B, plainMat(0xe8e6e0, { roughness: 0.4 }), 0, top + 0.24, 0.53, 0.34, 0.16, 0.06, 0.01);
      const p = f.w(0, top + 0.1, 0.8);
      // in a blacked-out area even the exit signs are dead until the power comes back
      const gg = glowGroupAt(ai, p[0], p[2]);
      let em = exitMat();
      if (gg !== World.lightGroups[ai].on) { em = exitMat().clone(); em.emissiveIntensity = 0; gg.mats.push({ m: em, base: 2.2 }); }
      f.box(B, em, 0, top + 0.24, 0.561, 0.3, 0.12, 0.002);
      addLightSpot({ x: p[0], y: p[1], z: p[2], color: 0x5aff8a, base: 1.2, range: 3, area: ai, grp: gg, kind: 'exit', haloSize: 0.35, hy: top + 0.24 });
    }
    if ((theme === 'office' || theme === 'lab') && rnd() < 0.8) {
      const s = wallAlongX ? [gx + 0.5 + 0.75, gz + 0.5 - roomSide * 0.5] : [gx + 0.5 - roomSide * 0.5, gz + 0.5 + 0.75];
      const ry = wallAlongX ? (roomSide > 0 ? Math.PI : 0) : (roomSide > 0 ? -Math.PI / 2 : Math.PI / 2);
      const f = frame(s[0], s[1], ry);
      const txt = theme === 'lab' ? 'LAB ' + (3 + Math.floor(rnd() * 3)) + '-' + 'ABCD'[Math.floor(rnd() * 4)] : 'B4-' + (100 + Math.floor(rnd() * 60));
      f.cbox(B, plainMat(0x2a2c30, { roughness: 0.4 }), 0, 1.55, 0.006, 0.2, 0.1, 0.012, 0.003);
      f.geo(B, labelMat(txt, { fg: '#e8e2d2', w: 256, h: 96, size: 50 }), planeGeo(0.18, 0.07), 0, 1.55, 0.013);
    }
  }
}

// ---------- ceilings ----------
function dressCeilings(L, batches, holes, runs) {
  // plenum above missing tiles: darkness, a duct or pipes, dangling cable, the tile on the floor below
  for (const i of holes) {
    const gx = i % L.W, gz = Math.floor(i / L.W), ai = L.area[i], B = batches[ai], ceil = L.ceil[i];
    const r = dressRnd(gx, gz + 999);
    B.quad(plainMat(0x0a0a0a, { roughness: 1 }), [gx, ceil + 0.74, gz], [gx + 1, ceil + 0.74, gz], [gx + 1, ceil + 0.74, gz + 1], [gx, ceil + 0.74, gz + 1], 0, -1, 0, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (r() < 0.6) B.add(mat('steel', { color: 0x8a8e92 }), cboxGeo(r() < 0.5 ? 1.0 : 0.5, 0.35, r() < 0.5 ? 0.5 : 1.0, 0.01), xform(gx + 0.5, ceil + 0.45, gz + 0.5));
    if (r() < 0.5) B.add(mat('rust'), cylGeo(0.05, 0.05, 1.0, 10), xform(gx + 0.5, ceil + 0.2, gz + 0.3 + r() * 0.4, 0, 0, Math.PI / 2));
    if (r() < 0.6) B.add(PM.black, tubeGeo(cablePts([gx + 0.2, ceil + 0.3, gz + 0.3], [gx + 0.7, ceil - 0.6 - r() * 0.8, gz + 0.6], 0.1, 6), 0.012, 10, 5), _m4.identity());
    // the fallen tile and its crumbs
    const tf = frame(gx + 0.2 + r() * 0.6, gz + 0.2 + r() * 0.6, r() * 6.28);
    if (r() < 0.5) tf.cbox(B, mat('panel'), 0, 0.012, 0, 0.6, 0.016, 0.6, 0.002, 0, 1.2, 0.04, 0.03);
    else { // hanging from one edge of the grid instead
      const hf = frame(gx + 0.5, gz + 0.5, r() < 0.5 ? 0 : Math.PI / 2);
      hf.cbox(B, mat('panel'), 0, ceil - 0.27, 0.25, 0.6, 0.016, 0.6, 0.002, 0, 1.2, 1.05);
    }
    for (let k = 0; k < 6; k++) tf.cbox(B, mat('panel'), (r() - 0.5) * 0.9, 0.01, (r() - 0.5) * 0.9, 0.04 + r() * 0.1, 0.014, 0.04 + r() * 0.1, 0.003, r() * 3);
  }
  // per area: diffusers and sprinklers in grid ceilings, beams, ducts and pipe racks in halls, trays over racks
  L.areas.forEach((a, ai) => {
    const th = World.areas[ai].theme, B = batches[ai], r = dressRnd(ai, 77);
    for (let gz = a.offZ; gz < a.offZ + a.h; gz++) for (let gx = a.offX; gx < a.offX + a.w; gx++) {
      const i = gz * L.W + gx;
      if (!isOpenCell(L, gx, gz) || holes.has(i) || L.area[i] !== ai) continue;
      const c = L.ch[i], ceil = L.ceil[i], cr = dressRnd(gx + 7, gz + 13);
      if (th.ceilType === 'grid' && !'L!*'.includes(c)) {
        const v = cr();
        if (v < 0.07) { // square diffuser
          B.add(plainMat(0xd8d8d2, { roughness: 0.45, metalness: 0.3 }), cboxGeo(0.58, 0.03, 0.58, 0.01), xform(gx + 0.5, ceil - 0.012, gz + 0.5));
          for (let k = 1; k < 4; k++) B.add(plainMat(0x1a1a1a), boxGeo(0.56 - k * 0.12, 0.004, 0.56 - k * 0.12), xform(gx + 0.5, ceil - 0.03 - k * 0.002, gz + 0.5));
        } else if (v < 0.16) B.add(PM.chrome, cylGeo(0.025, 0.012, 0.04, 10), xform(gx + 0.5 + (cr() - 0.5) * 0.4, ceil - 0.02, gz + 0.5 + (cr() - 0.5) * 0.4));
        else if (v < 0.19) B.add(plainMat(0xe8e6e0, { roughness: 0.4 }), cylGeo(0.07, 0.075, 0.035, 18), xform(gx + 0.5, ceil - 0.018, gz + 0.5));
      }
    }
    if (th.beams) dressBeams(L, B, a, ai, r);
    if (th.trays || a.theme === 'server') for (let gz = a.offZ; gz < a.offZ + a.h; gz++) for (let gx = a.offX; gx < a.offX + a.w; gx++) {
      if (L.ch[gz * L.W + gx] !== 'R') continue;
      const ceil = L.ceil[gz * L.W + gx];
      B.add(mat('steel', { color: 0x9a9ea2 }), boxGeo(1, 0.05, 0.02), xform(gx + 0.5, 2.6, gz + 0.3));
      B.add(mat('steel', { color: 0x9a9ea2 }), boxGeo(1, 0.05, 0.02), xform(gx + 0.5, 2.6, gz + 0.7));
      for (let k = 0; k < 4; k++) B.add(plainMat([0x111214, 0x1a2a4a, 0xb89a2a, 0x111214][k], { roughness: 0.55 }), cylGeo(0.025, 0.025, 1.0, 8), xform(gx + 0.5, 2.6, gz + 0.38 + k * 0.08, 0, 0, Math.PI / 2));
      B.add(mat('steelDark'), boxGeo(0.02, ceil - 2.6, 0.02), xform(gx + 0.5, (ceil + 2.6) / 2, gz + 0.5));
    }
  });
}
// steel beams with purlins, a big duct and a pipe rack along the hall
function dressBeams(L, B, a, ai, r) {
  const k = (x, z) => z * L.W + x;
  const rust = mat('metal', { color: 0x5a4a3a }), steel = mat('steelDark');
  for (let x = a.offX + 2; x < a.offX + a.w - 1; x += 4) {
    let run = -1;
    for (let z = a.offZ; z <= a.offZ + a.h; z++) {
      const open = inGrid(L, x, z) && isOpenCell(L, x, z) && L.area[k(x, z)] === ai && L.ceil[k(x, z)] > 3.5;
      if (open && run < 0) run = z;
      if ((!open || z === a.offZ + a.h) && run >= 0) {
        const z1 = open ? z + 1 : z, len = z1 - run, ce = L.ceil[k(x, run)];
        if (len > 1) {
          B.add(rust, boxGeo(0.012, 0.5, len), xform(x + 0.5, ce - 0.25, run + len / 2));
          for (const s of [-1, 1]) B.add(rust, boxGeo(0.24, 0.018, len), xform(x + 0.5, ce - 0.25 + s * 0.24, run + len / 2));
        }
        run = -1;
      }
    }
  }
  // purlins across the beams
  for (let z = a.offZ + 1; z < a.offZ + a.h; z += 2) {
    let run = -1;
    for (let x = a.offX; x <= a.offX + a.w; x++) {
      const open = inGrid(L, x, z) && isOpenCell(L, x, z) && L.area[k(x, z)] === ai && L.ceil[k(x, z)] > 3.5;
      if (open && run < 0) run = x;
      if ((!open || x === a.offX + a.w) && run >= 0) {
        const x1 = open ? x + 1 : x, len = x1 - run, ce = L.ceil[k(run, z)];
        if (len > 1) B.add(steel, boxGeo(len, 0.14, 0.06), xform(run + len / 2, ce - 0.07, z + 0.5));
        run = -1;
      }
    }
  }
  // the longest open row gets a duct and a pipe rack
  let best = null;
  for (let z = a.offZ + 2; z < a.offZ + a.h - 2; z++) {
    let run = -1;
    for (let x = a.offX; x <= a.offX + a.w; x++) {
      const open = inGrid(L, x, z) && isOpenCell(L, x, z) && L.area[k(x, z)] === ai && L.ceil[k(x, z)] > 4;
      if (open && run < 0) run = x;
      if ((!open || x === a.offX + a.w) && run >= 0) { const len = (open ? x + 1 : x) - run; if (!best || len > best.len) best = { z, x0: run, len }; run = -1; }
    }
  }
  if (best && best.len > 6) {
    const ce = L.ceil[k(best.x0, best.z)], y = Math.min(ce - 1.1, 5.6), cx = best.x0 + best.len / 2, cz = best.z + 0.5;
    const duct = mat('steel', { color: 0x9ea2a6 });
    B.add(duct, cboxGeo(best.len - 0.4, 0.6, 0.8, 0.02, 1.2), xform(cx, y, cz));
    for (let x = best.x0 + 0.6; x < best.x0 + best.len - 0.4; x += 1.5) {
      B.add(steel, cboxGeo(0.06, 0.66, 0.86, 0.01), xform(x, y, cz));
      for (const s of [-1, 1]) B.add(steel, cylGeo(0.008, 0.008, ce - y - 0.3, 5), xform(x, (ce + y + 0.3) / 2, cz + s * 0.45));
    }
    for (let x = best.x0 + 2; x < best.x0 + best.len - 1; x += 5) { B.add(duct, cboxGeo(0.3, 0.5, 0.3, 0.01), xform(x, y - 0.5, cz)); B.add(plainMat(0x1a1a1a), boxGeo(0.34, 0.03, 0.34), xform(x, y - 0.75, cz)); }
    // the pipe rack and the sprinkler main run beside the duct: each only as far as its own rows stay open
    const span = (zA, zB) => {
      let bs = null, run = -1;
      for (let x = best.x0; x <= best.x0 + best.len; x++) {
        let open = x < best.x0 + best.len;
        for (let z = Math.floor(zA); z <= Math.floor(zB) && open; z++) open = inGrid(L, x, z) && isOpenCell(L, x, z) && L.area[k(x, z)] === ai && L.ceil[k(x, z)] > 4;
        if (open && run < 0) run = x;
        if (!open && run >= 0) { if (!bs || x - run > bs[1] - bs[0]) bs = [run, x]; run = -1; }
      }
      return bs && bs[1] - bs[0] > 3 ? bs : null;
    };
    const pz = cz + 1.6, ps = span(pz - 0.5, pz + 1.0);
    if (ps) {
      const pl = ps[1] - ps[0], pc = (ps[0] + ps[1]) / 2;
      for (let p = 0; p < 3; p++) {
        const rad = [0.08, 0.12, 0.06][p], col = DRESS.pipeCols[(p + ai) % 5];
        B.add(col === null ? mat('rust') : mat('metal', { color: col }), cylGeo(rad, rad, pl - 0.3, 16, 1.2), xform(pc, y + 0.5, pz + p * 0.3, 0, 0, Math.PI / 2));
      }
      for (let x = ps[0] + 1; x < ps[1] - 0.5; x += 2) {
        B.add(steel, boxGeo(0.05, 0.05, 1.0), xform(x, y + 0.38, pz + 0.3));
        for (const s of [-1, 1]) B.add(steel, cylGeo(0.008, 0.008, ce - y - 0.4, 5), xform(x, (ce + y + 0.4) / 2, pz + 0.3 + s * 0.48));
      }
    }
    // sprinkler main with heads
    const ss = span(cz - 1.9, cz - 1.7);
    if (ss) {
      B.add(plainMat(0x9a1a12, { roughness: 0.4, metalness: 0.4 }), cylGeo(0.035, 0.035, ss[1] - ss[0] - 0.3, 10), xform((ss[0] + ss[1]) / 2, ce - 0.45, cz - 1.8, 0, 0, Math.PI / 2));
      for (let x = ss[0] + 1.5; x < ss[1] - 0.5; x += 3) B.add(PM.chrome, cylGeo(0.02, 0.01, 0.08, 8), xform(x, ce - 0.52, cz - 1.8));
    }
  }
}

// ---------- floors: painted lines, drains, litter ----------
function dressFloors(L, batches, runs) {
  for (const run of runs) {
    if (['dock', 'generator', 'lift', 'pump'].includes(run.theme) && !run.water && run.len >= 4) {
      let freeCount = 0;
      for (let s = 0.5; s < run.len; s += 1) if (runCellFree(L, run, s)) freeCount++;
      if (freeCount / run.len > 0.7) runFloorLine(batches[run.area], run, 0.55);
    }
  }
  L.areas.forEach((a, ai) => {
    const B = batches[ai], th = World.areas[ai].theme;
    for (let gz = a.offZ; gz < a.offZ + a.h; gz++) for (let gx = a.offX; gx < a.offX + a.w; gx++) {
      const i = gz * L.W + gx;
      if (L.area[i] !== ai || !freeFloor(L, gx, gz) || L.water[i]) continue;
      const r = dressRnd(gx * 11, gz * 17), v = r();
      const wet = (THEME_SOIL[a.theme] || [0, 0])[0];
      if (v < 0.012 + wet * 0.03) { // floor drain
        B.add(mat('grate'), cboxGeo(0.34, 0.012, 0.34, 0.004, 0.4), xform(gx + 0.5, 0.004, gz + 0.5));
        B.add(plainMat(0x050505), boxGeo(0.3, 0.002, 0.3), xform(gx + 0.5, 0.001, gz + 0.5));
      } else if (v < 0.05) { // litter
        const f = frame(gx + r(), gz + r(), r() * 6.28), kind = r();
        if (kind < 0.25) { f.cyl(B, plainMat([0xb01a12, 0x2a5a8a, 0xd8d8d0][Math.floor(r() * 3)], { roughness: 0.3, metalness: 0.7 }), 0, 0.033, 0, 0.033, 0.033, 0.12, 12, Math.PI / 2); }
        else if (kind < 0.45) { f.cbox(B, mat('card'), 0, 0.03, 0, 0.3, 0.05, 0.22, 0.01, 0, 0.5, 0.1); }
        else if (kind < 0.65) { B.add(PM.black, tubeGeo([f.w(-0.6, 0.012, 0), f.w(-0.2, 0.012, 0.25), f.w(0.2, 0.012, -0.15), f.w(0.6, 0.012, 0.1)], 0.012, 16, 5), _m4.identity()); }
        else if (kind < 0.8 && a.theme !== 'office') { for (let k = 0; k < 8; k++) f.cbox(B, mat('concrete'), (r() - 0.5) * 0.7, 0.02, (r() - 0.5) * 0.7, 0.04 + r() * 0.08, 0.04, 0.04 + r() * 0.06, 0.01, r() * 3); }
        else f.geo(B, decalMat('paper'), cachedGeo('decalPaper', () => new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2)), 0, 0.009, 0);
      }
    }
  });
}

// ---------- main entry ----------
function dressWorld(L, batches, holes) {
  const runs = findWallRuns(L);
  World.runs = runs;
  for (const run of runs) {
    const B = batches[run.area], r = dressRnd(run.p0[0] * 13 + run.dx * 7, run.p0[1] * 29 + run.dz * 3);
    const th = THEMES[run.theme], ctx = { ceil: run.ceil, theme: run.theme };
    // continuous services along the wall
    if (!run.water && run.len >= 2) {
      if (th.pipes && r() < 0.8) runPipes(B, run, r, 1 + Math.floor(r() * 3));
      else if (['dock', 'generator', 'lift'].includes(run.theme) && run.len >= 4 && r() < 0.5) runPipes(B, run, r, 1 + Math.floor(r() * 2));
      else if (r() < 0.65) runConduit(B, run, Math.min(run.ceil - 0.2, run.ceil > 4 ? 3.6 : 2.75), r);
      if ((run.theme === 'server' || run.theme === 'generator') && run.len >= 3 && r() < 0.6) runTray(B, run, Math.min(run.ceil - 0.5, 3.0));
    }
    // things on the wall, spaced out, only where you can walk up to them
    const kit = DRESS.kits[run.theme] || [];
    for (let s = 0.5; s < run.len; s += 0.5) {
      if (!runCellFree(L, run, s)) continue;
      const [cx, cz] = run.cells[Math.floor(clamp(s, 0, run.len - 0.001))];
      const shelter = L.safe[cz * L.W + cx] > 0;
      for (const [item, p] of kit) {
        if (r() > p * 0.5) continue;
        // it has never been inside a shelter: no prints or claw marks in there
        if (shelter && (item === 'hand' || item === 'scratch')) continue;
        const band = item === 'hand' || item === 'scratch' ? 'top' : item === 'vent' ? 'low' : 'mid';
        if (!reserve(run, band, s - 0.55, s + 0.55)) continue;
        WALL_ITEMS[item](B, runFrame(run, s), r, ctx, run);
        break;
      }
    }
    // a light switch beside doorways in offices and labs
    if (['office', 'lab', 'contain'].includes(run.theme)) {
      if (run.doorA && reserve(run, 'mid', 0, 0.3)) { const f = runFrame(run, 0.18); f.cbox(B, plainMat(0xe8e6e0, { roughness: 0.4 }), 0, 1.2, 0.006, 0.08, 0.12, 0.012, 0.003); }
      if (run.doorB && reserve(run, 'mid', run.len - 0.3, run.len)) { const f = runFrame(run, run.len - 0.18); f.cbox(B, plainMat(0xe8e6e0, { roughness: 0.4 }), 0, 1.2, 0.006, 0.08, 0.12, 0.012, 0.003); }
    }
  }
  dressDoorways(L, batches);
  dressCeilings(L, batches, holes, runs);
  dressFloors(L, batches, runs);
  L.areas.forEach((a, ai) => {
    const lair = L.lairs[ai];
    if (!lair || L.area[Math.floor(lair.z) * L.W + Math.floor(lair.x)] !== ai) return;
    if (L.lairInfo && L.lairInfo[ai]) dressLairTunnel(L, batches[ai], L.lairInfo[ai], dressRnd(ai, 5));
    else dressLair(L, batches[ai], lair, ai, dressRnd(ai, 5));
  });
  L.areas.forEach((a, ai) => { const fn = SET_PIECES[a.theme]; if (fn) fn(L, batches[ai], a, ai, dressRnd(ai * 3, 41)); });
}

// ---------- set pieces: hand-placed scenes per area (coordinates are local to the area) ----------
function areaFrame(a, x, z, rot = 0) { return frame(a.offX + x, a.offZ + z, rot); }
const SET_PIECES = {
  dock(L, B, a, ai, r) {
    buildLiftCar(L, B);
    // the forklift, died mid-turn in the middle of the floor
    forklift(B, areaFrame(a, 46.5, 38.0, Math.PI / 2 + 0.35));
    // yellow bollards along the front of the office glass
    for (const [x, z] of [[8.6, 8.4], [11.6, 8.4], [15.6, 8.4], [18.6, 8.4]]) { const bf = areaFrame(a, x, z); addCollider(L, bf.ox, bf.oz, 0.13); bf.cyl(B, plainMat(0xd8a535, { roughness: 0.45 }), 0, 0.55, 0, 0.08, 0.08, 1.1, 14); bf.cyl(B, PM.black, 0, 0.9, 0, 0.082, 0.082, 0.06, 14); }
    // four loading bays in the south wall, one jammed a hand's width open on the night outside
    [[20.5, 0.0], [32.5, 0.06], [44.5, 0.0], [56.5, 0.0]].forEach(([x, open]) => {
      rollupDoor(B, areaFrame(a, x, 46.98, Math.PI), open);
      // the dock plate in front of each, hinged lip and hazard edging
      const df = areaFrame(a, x, 45.6, Math.PI);
      df.cbox(B, mat('tread'), 0, 0.02, 0, 2.2, 0.04, 1.6, 0.01);
      df.geo(B, hazardMat(), cachedGeo('dockLip', () => new THREE.PlaneGeometry(2.2, 0.16).rotateX(-Math.PI / 2)), 0, 0.045, -0.8);
    });
    palletJack(B, areaFrame(a, 38.5, 43.6, 0.9));
    // the generator bay: the set itself on its skid, its exhaust stack up into the dark, the fuel line, and
    // the signs on the cage
    genset(B, areaFrame(a, 75.5, 41.5, Math.PI / 2));
    World.genPos = { x: a.offX + 75.5, y: 1.2, z: a.offZ + 41.5 };
    for (const [x, z, rot] of [[64.03, 41.5, Math.PI / 2], [70.5, 33.03, Math.PI]]) {
      const sf = areaFrame(a, x, z, rot);
      sf.geo(B, labelMat('GENERATOR', { bg: '#e2ad3b', fg: '#141414', w: 512, h: 96 }), planeGeo(1.2, 0.24), 0, 1.6, 0.03);
      sf.geo(B, labelMat('AUTHORIZED PERSONNEL ONLY', { bg: '#141414', fg: '#e2ad3b', w: 512, h: 64, size: 34 }), planeGeo(1.2, 0.15), 0, 1.38, 0.03);
    }
    // where it came out of: the access panel off the maintenance corridor wall, prised open from inside
    const mf = areaFrame(a, 81.6, 22.5, -Math.PI / 2);
    mf.geo(B, decalMat('scratch'), planeGeo(1.3, 1.7), 0.6, 1.4, 0.1);
  },
  office(L, B, a, ai, r) {
    // a barricade of desks and chairs against the north office 5 door
    const f = areaFrame(a, 39.5, 10.6, 0.15);
    f.cbox(B, PM.laminate, 0, 0.5, 0, 1.4, 0.04, 0.7, 0.006, 0, 1, 1.3, 0);
    f.cbox(B, mat('metal', { color: 0x7a7e82 }), 0.7, 0.4, 0.2, 0.45, 0.8, 0.6, 0.01, 0.3, 1, 0, 0.2);
    f.cbox(B, mat('fabric', { color: 0x23262b }), -0.28, 0.3, 0.05, 0.5, 0.5, 0.1, 0.03, 1.2, 1, 0.8, 0.5);
    // water cooler and vending machine in the break room (shelter)
    const v = areaFrame(a, 33.5, 15.2, 0);
    v.cbox(B, mat('metal', { color: 0x2a3a5a }), 0, 0.95, 0, 0.9, 1.9, 0.75, 0.02);
    v.box(B, plainMat(0x0a0c10), 0.08, 1.15, 0.376, 0.6, 1.3, 0.004);
    const G = World.lightGroups[ai];
    v.box(B, groupMat(G, G.f[1], 0xdfe8ff, 0.9, 'vend'), 0.08, 1.15, 0.372, 0.58, 1.26, 0.002);
    for (let row = 0; row < 5; row++) for (let k = 0; k < 4; k++) v.cbox(B, plainMat([0xb01a12, 0x2a5a8a, 0xd8a535, 0x2a8a3a][(row + k) % 4], { roughness: 0.4 }), -0.13 + k * 0.14, 0.62 + row * 0.24, 0.3, 0.07, 0.14, 0.05, 0.01);
    v.box(B, PM.glass, 0.08, 1.15, 0.38, 0.62, 1.32, 0.01);
    const vp = v.w(0, 1.2, 0.9);
    addLightSpot({ x: vp[0], y: vp[1], z: vp[2], color: 0xdfe8ff, base: 2, range: 4.5, area: ai, grp: G.f[1], kind: 'vend', haloSize: 0.6, hy: 1.4, haloMul: 0.5 });
    const w = areaFrame(a, 28.5, 21.4, Math.PI);
    w.cbox(B, plainMat(0xe8e6e0, { roughness: 0.4 }), 0, 0.5, 0, 0.32, 1.0, 0.32, 0.02);
    w.cyl(B, plainMat(0x7ab0d8, { roughness: 0.1, transparent: true, opacity: 0.6, ws: false }), 0, 1.25, 0, 0.13, 0.13, 0.45, 18);
    // filing cabinets and a copier in the corridor ends
    for (const [x, z, rot] of [[36.5, 21.5, Math.PI], [37.5, 21.5, Math.PI], [1.5, 21.5, Math.PI]]) {
      const ff = areaFrame(a, x, z, rot); const m = mat('metal', { color: 0x8a8e86 });
      ff.cbox(B, m, 0, 0.66, 0, 0.46, 1.32, 0.62, 0.01);
      for (let k = 0; k < 4; k++) { ff.cbox(B, m, 0, 0.18 + k * 0.32, 0.315, 0.42, 0.29, 0.02, 0.005); ff.cbox(B, PM.chrome, 0, 0.26 + k * 0.32, 0.33, 0.14, 0.02, 0.02, 0.004); }
    }
    // dead plants
    for (const [x, z] of [[1.5, 14.5], [26.5, 14.5], [8.5, 1.5]]) { const pf = areaFrame(a, x, z); pf.cyl(B, plainMat(0x3a3430, { roughness: 0.8 }), 0, 0.22, 0, 0.17, 0.13, 0.44, 16); for (let k = 0; k < 7; k++) pf.cyl(B, plainMat(0x4a3a20, { roughness: 0.9 }), (r() - 0.5) * 0.15, 0.6, (r() - 0.5) * 0.15, 0.006, 0.004, 0.5 + r() * 0.3, 5, (r() - 0.5) * 0.9, (r() - 0.5) * 0.9); }
  },
  lab(L, B, a, ai, r) {
    // the charging bay for the backup power cell: a wall charger, its fat cable down to the floor, a status panel
    {
      const ch = areaFrame(a, 1.0, 2.5, Math.PI / 2);
      ch.cbox(B, mat('metal', { color: 0x9aa0a4 }), 0, 1.15, 0.09, 0.5, 0.62, 0.18, 0.02);
      ch.cbox(B, PM.black, 0, 1.2, 0.185, 0.36, 0.16, 0.01, 0.004);
      ch.geo(B, labelMat('CELL CHARGER  ·  48V', { bg: '#e2ad3b', fg: '#141414', w: 512, h: 64 }), planeGeo(0.4, 0.05), 0, 1.38, 0.182);
      ch.geo(B, labelMat('CHARGED', { bg: '#0a1a0e', fg: '#6fff9a', w: 256, h: 64 }), planeGeo(0.2, 0.05), 0, 1.2, 0.191);
      B.add(PM.black, tubeGeo(cablePts(ch.w(0.08, 0.86, 0.12), ch.w(0.08, 0.12, 0.48), 0.05, 8), 0.018, 14, 6), _m4.identity());
      for (const x of [-0.15, 0.15]) ch.cyl(B, mat('steelDark'), x, 1.9, 0.04, 0.02, 0.02, 1.2, 8);
    }
    // the growth chart in the north labs, a fume hood, an emergency shower
    const c = areaFrame(a, 26, 1.02, 0);
    c.cbox(B, PM.black, 0, 1.6, 0.01, 0.62, 0.82, 0.02, 0.004);
    c.geo(B, artMat('chart', 0), planeGeo(0.58, 0.78), 0, 1.6, 0.021);
    for (const [x, z] of [[4, 1.42], [36, 22.58]]) {
      const h = areaFrame(a, x, z, x > 30 ? Math.PI : 0);
      h.cbox(B, plainMat(0xd8dcdc, { roughness: 0.5 }), 0, 0.45, 0.05, 1.5, 0.9, 0.75, 0.01);
      h.cbox(B, plainMat(0x16181a, { roughness: 0.2 }), 0, 0.92, 0.07, 1.5, 0.04, 0.78, 0.006);
      h.cbox(B, plainMat(0xd8dcdc, { roughness: 0.5 }), 0, 1.75, -0.12, 1.5, 1.6, 0.35, 0.01);
      h.box(B, PM.glass, 0, 1.35, 0.25, 1.3, 0.75, 0.01);
      h.cbox(B, PM.chrome, 0, 1.0, 0.3, 1.2, 0.03, 0.03, 0.006);
    }
    const sh = areaFrame(a, 10.5, 12.5, Math.PI);
    sh.cyl(B, mat('steel', { color: 0x9ac83a }), 0, 1.25, 0.45, 0.03, 0.03, 2.5, 10);
    sh.cyl(B, plainMat(0x9ac83a, { roughness: 0.4 }), 0, 2.3, 0.25, 0.18, 0.12, 0.08, 18);
    // spilled specimen fluid in the tank room
    const sp = areaFrame(a, 16, 18.5, 0.3);
    sp.geo(B, decalMat('oil'), cachedGeo('decalBig', () => new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2)), 0, 0.011, 0);
  },
  cold(L, B, a, ai, r) {
    // refrigeration units on the morgue ceiling
    for (const x of [10, 22, 30]) {
      const f = areaFrame(a, x, 11.5, 0);
      f.cbox(B, mat('metal', { color: 0xc8ccd0 }), 0, 2.72, 0, 1.6, 0.5, 0.7, 0.02);
      f.box(B, mat('grate'), 0, 2.72, 0.36, 1.4, 0.4, 0.01, 0, 0.5);
      for (const s of [-0.4, 0.4]) f.cyl(B, PM.black, s, 2.72, 0.33, 0.17, 0.17, 0.03, 20, Math.PI / 2);
      f.geo(B, decalMat('grime'), planeGeo(1.6, 1.0), 0, 2.4, 0.38);
    }
    // carcass bags on hooks in the north freezers
    for (const x of [5, 13, 21, 29]) for (let k = 0; k < 3; k++) {
      const f = areaFrame(a, x + k * 1.2, 2.4, r() * 0.5);
      f.cyl(B, mat('steel'), 0, 2.85, 0, 0.01, 0.01, 0.3, 6);
      f.torus(B, mat('steel'), 0, 2.65, 0, 0.06, 0.008, 0);
      // a black body bag, tied at the neck to the hook, heavy at the bottom
      const bag = cachedGeo('bodyBag2', () => {
        // gathered at the hook, shoulders, a long body, the weight settled at the bottom
        const K = [[0, 0.03], [0.04, 0.07], [0.1, 0.16], [0.2, 0.22], [0.32, 0.21], [0.5, 0.19], [0.68, 0.18], [0.82, 0.17], [0.92, 0.13], [0.97, 0.08], [1, 0.02]];
        const pts = K.map(([t, rr]) => new THREE.Vector2(rr, -t * 1.5));
        const g = new THREE.LatheGeometry(pts.reverse(), 18); g.scale(1, 1, 0.62); g.computeVertexNormals(); return g;
      });
      f.geo(B, mat('fabric', { color: 0x1a1b1d }), bag, 0, 2.62, 0, 0, (r() - 0.5) * 0.04, (r() - 0.5) * 0.04);
      f.cbox(B, PM.chrome, 0, 1.85, 0.121, 0.012, 0.6, 0.006, 0.002);
      addCollider(L, f.ox, f.oz, 0.24);
    }
  },
  server(L, B, a, ai, r) {
    // air handlers along the west wall and a toppled rack with sparks
    for (const z of [4.0, 8.5, 16.5, 21.0]) {
      const f = areaFrame(a, 1.6, z, Math.PI / 2);
      f.cbox(B, mat('metal', { color: 0xc8ccd0 }), 0, 1.0, 0, 1.6, 2.0, 0.9, 0.02);
      f.box(B, mat('grate'), 0, 1.4, 0.455, 1.4, 0.9, 0.01, 0, 0.4);
      f.box(B, screenMat('code'), 0.55, 0.5, 0.455, 0.2, 0.12, 0.004);
    }
    const t = areaFrame(a, 22.5, 13, 0.1);
    t.cbox(B, mat('metalDark', { color: 0x24272b }), 0, 0.46, 0, 0.96, 0.9, 2.0, 0.01, 0, 1, 0, 0.12);
    t.box(B, ledMat(), 0, 0.92, 0, 0.84, 0.004, 1.8);
    for (let k = 0; k < 6; k++) B.add(plainMat([0x111214, 0x1a2a4a, 0xb89a2a][k % 3], { roughness: 0.55 }), tubeGeo([t.w(-0.3 + k * 0.1, 0.9, -0.9), t.w(-0.4 + k * 0.12, 1.6, -1.6), t.w(-0.2 + k * 0.08, 2.6, -1.9)], 0.015, 10, 5), _m4.identity());
    World.sparks = (World.sparks || []).concat([{ area: ai, p: t.w(0, 1.0, -0.9) }]);
    { const p = t.w(0, 0, -1.4); addCollider(L, p[0], p[2], 0.3); }
    // the racks are still running: their status lights wash the aisles a faint blue
    const G = World.lightGroups[ai];
    for (const z of [5, 8, 17, 20]) for (const x of [8, 17.5, 26.5]) {
      const green = dressRnd(x * 7, z * 3)() < 0.25;
      addLightSpot({ x: a.offX + x, y: 1.1, z: a.offZ + z, color: green ? 0x3cff96 : 0x4a86ff, base: 0.55, range: 3.2, area: ai, grp: G.on, kind: 'glow', halo: false });
    }
  },
  tunnel(L, B, a, ai, r) {
    // the last person through: a hard hat, a dead flashlight, a note of tally marks nearby
    const f = areaFrame(a, 18.5, 14.5, 0.8);
    f.sphere(B, plainMat(0xd8a535, { roughness: 0.4 }), 0, 0.1, 0, 0.15, 0.7);
    f.cbox(B, plainMat(0xd8a535, { roughness: 0.4 }), 0, 0.03, 0.12, 0.3, 0.02, 0.1, 0.01);
    f.cyl(B, PM.black, 0.5, 0.03, 0.2, 0.025, 0.03, 0.2, 10, Math.PI / 2, 0.4);
    f.geo(B, decalMat('drag'), cachedGeo('dragFloor', () => new THREE.PlaneGeometry(1.2, 3.0).rotateX(-Math.PI / 2)), 0.3, 0.01, -1.4, 0.3);
  },
  pump(L, B, a, ai, r) {
    // railings along the walkway edges where they meet the water
    for (let gz = a.offZ; gz < a.offZ + a.h; gz++) for (let gx = a.offX; gx < a.offX + a.w; gx++) {
      const i = gz * L.W + gx;
      if (L.area[i] !== ai || !isOpenCell(L, gx, gz) || L.water[i] || !L.walk[i]) continue;
      for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const ni = (gz + dz) * L.W + gx + dx;
        if (!inGrid(L, gx + dx, gz + dz) || !L.water[ni]) continue;
        if (dressRnd(gx, gz)() < 0.35) continue; // gaps where you can step down
        const f = frame(gx + 0.5 + dx * 0.45, gz + 0.5 + dz * 0.45, Math.atan2(dx, dz));
        const y = mat('metal', { color: 0xc8a032 });
        f.cyl(B, y, 0, 1.05, 0, 0.022, 0.022, 1.0, 10, 0, Math.PI / 2);
        f.cyl(B, y, 0, 0.55, 0, 0.018, 0.018, 1.0, 10, 0, Math.PI / 2);
        f.cyl(B, y, -0.5, 0.53, 0, 0.022, 0.022, 1.06, 10);
        f.box(B, mat('steelDark'), 0, 0.07, 0, 1.0, 0.12, 0.012);
      }
    }
    // crane rail along the hall
    const cr = areaFrame(a, 21, 12, 0);
    cr.cbox(B, mat('metal', { color: 0xc8a032 }), 0, 7.2, 0, 38, 0.4, 0.3, 0.02);
    const hk = areaFrame(a, 16, 12, 0);
    hk.cbox(B, mat('metal', { color: 0xc8a032 }), 0, 6.9, 0, 0.6, 0.4, 0.5, 0.02);
    for (let k = 0; k < 24; k++) hk.torus(B, mat('steelDark'), 0, 6.6 - k * 0.12, 0, 0.045, 0.012, k % 2 ? Math.PI / 2 : 0);
    hk.torus(B, mat('steel'), 0, 3.6, 0.05, 0.12, 0.03, Math.PI / 2);
  },
  contain(L, B, a, ai, r) {
    // cell four: bars bent outward, the observation feed, chains from the cell ceilings
    const b = areaFrame(a, 21, 10.5, 0);
    for (let k = 0; k < 7; k++) {
      const x = -0.36 + k * 0.12, bend = 1 - Math.abs(x) * 2.2;
      b.cyl(B, mat('steel'), x * (1 + bend * 0.8), 1.2, 0.35 * bend, 0.026, 0.026, 2.3, 10, -0.35 * bend, x * bend * 0.6);
      for (const yy of [-0.9, -0.3, 0.3]) { const th = -0.35 * bend, bp = b.w(x * (1 + bend * 0.8), 0, 0.35 * bend + yy * Math.sin(th)); addCollider(L, bp[0], bp[2], 0.05); }
    }
    for (let cell = 0; cell < 6; cell++) for (const z of [5.5, 17.5]) {
      const f = areaFrame(a, 3 + cell * 6, z, 0);
      for (let k = 0; k < 10; k++) f.torus(B, mat('rust'), 0, 3.0 - k * 0.1, 0, 0.04, 0.01, k % 2 ? Math.PI / 2 : 0);
      f.torus(B, mat('steelDark'), 0, 1.98, 0, 0.09, 0.02, Math.PI / 2);
    }
    const o = areaFrame(a, 41, 1.06, 0);
    o.cbox(B, PM.black, 0, 2.0, 0, 1.6, 0.9, 0.05, 0.01);
    o.box(B, screenMat('cam'), -0.4, 2.0, 0.03, 0.74, 0.8, 0.004);
    o.box(B, screenMat('static'), 0.4, 2.0, 0.03, 0.74, 0.8, 0.004);
    const sig = areaFrame(a, 38.5, 13.0, Math.PI);
    sig.geo(B, labelMat('R-7', { fg: '#a01a12', w: 256, h: 128, size: 120 }), planeGeo(1.4, 0.7), 0, 2.4, 0.01);
  },
  generator(L, B, a, ai, r) {
    // a catwalk along the north and west walls, with a stair that ends in mid-air
    const cw = mat('grate'), y = 4.6, rail = mat('metal', { color: 0xc8a032 });
    for (const [x0, z0, x1, z1] of [[1, 1, 36, 1], [1, 1, 1, 9]]) {
      const len = Math.hypot(x1 - x0, z1 - z0) + 1, cx = (x0 + x1 + 1) / 2, cz = (z0 + z1 + 1) / 2, along = x1 !== x0;
      B.add(cw, boxGeo(along ? len : 1.2, 0.05, along ? 1.2 : len, 1.2), xform(a.offX + cx, y, a.offZ + cz));
      B.add(mat('steelDark'), boxGeo(along ? len : 0.1, 0.2, along ? 0.1 : len), xform(a.offX + cx + (along ? 0 : 0.6), y - 0.12, a.offZ + cz + (along ? 0.6 : 0)));
      B.add(rail, cylGeo(0.022, 0.022, len, 8), xform(a.offX + cx + (along ? 0 : 0.6), y + 1.05, a.offZ + cz + (along ? 0.6 : 0), 0, along ? 0 : Math.PI / 2, along ? Math.PI / 2 : 0));
      for (let s = 0; s < len; s += 1.5) B.add(rail, cylGeo(0.02, 0.02, 1.05, 8), xform(a.offX + (along ? x0 + 0.5 + s : cx + 0.6), y + 0.52, a.offZ + (along ? cz + 0.6 : z0 + 0.5 + s)));
      for (let s = 2; s < len; s += 6) B.add(mat('steelDark'), cylGeo(0.012, 0.012, 12 - y, 5), xform(a.offX + (along ? x0 + 0.5 + s : cx), (12 + y) / 2, a.offZ + (along ? cz : z0 + 0.5 + s)));
    }
    // The stair: steel treads on two stringers, handrails both sides, a landing at the top - and a chain across
    // it, because the catwalk beyond is condemned. You can climb it and look out over the hall, and that is all.
    const st = areaFrame(a, 34.5, 8.6, 0);
    for (let k = 0; k < 14; k++) {
      st.cbox(B, cw, 0, 0.3 + k * 0.31, -0.2 - k * 0.45, 0.9, 0.04, 0.32, 0.004);
      st.cbox(B, mat('steelDark'), 0, 0.3 + k * 0.31 - 0.04, -0.2 - k * 0.45 + 0.15, 0.9, 0.05, 0.03, 0.004);
      st.cbox(B, hazardMat(), 0, 0.3 + k * 0.31 + 0.022, -0.2 - k * 0.45 + 0.145, 0.9, 0.003, 0.03, 0.001);
    }
    const sLen = Math.hypot(13 * 0.45, 13 * 0.31) + 0.9, sAng = Math.atan2(13 * 0.31, 13 * 0.45);
    for (const s2 of [-0.47, 0.47]) {
      st.cbox(B, mat('steelDark'), s2, 2.2, -3.1, 0.06, 0.3, sLen, 0.01, 0, 1, sAng);
      st.cbox(B, rail, s2, 3.25, -3.1, 0.045, 0.045, sLen, 0.006, 0, 1, sAng);
      for (let k = 0; k <= 13; k += 3) st.cbox(B, rail, s2, 0.3 + k * 0.31 + 0.5, -0.2 - k * 0.45, 0.035, 1.0, 0.035, 0.004);
    }
    // the landing, its rails, and the chain with its sign
    st.cbox(B, cw, 0, 4.35, -6.25, 0.94, 0.05, 0.6, 0.004);
    st.cbox(B, mat('steelDark'), 0, 4.27, -6.25, 0.94, 0.12, 0.6, 0.008);
    for (const s2 of [-0.47, 0.47]) { st.cbox(B, rail, s2, 4.85, -6.25, 0.045, 0.045, 0.62, 0.006); st.cbox(B, rail, s2, 4.85, -6.52, 0.035, 1.0, 0.035, 0.004); }
    for (let k = 0; k < 9; k++) st.torus(B, mat('steel'), -0.4 + k * 0.1, 5.15 - Math.sin(k / 8 * Math.PI) * 0.12, -6.52, 0.028, 0.006, k % 2 ? Math.PI / 2 : 0);
    st.geo(B, labelMat('CATWALK CLOSED', { bg: '#b8160e', fg: '#f5efe2', w: 512, h: 96 }), planeGeo(0.5, 0.1), 0, 5.0, -6.5);
    // it is a wall to anyone on it or beside it: stringers down both sides, the chain across the top
    for (let z = 2.05; z <= 8.8; z += 0.18) for (const x of [34.0, 35.0]) addCollider(L, a.offX + x, a.offZ + z, 0.05);
    for (let x = 34.0; x <= 35.0; x += 0.18) addCollider(L, a.offX + x, a.offZ + 2.05, 0.05);
    // fuel tanks along the south wall
    for (const x of [9, 14]) { const tf = areaFrame(a, x, 25.4, 0); tf.cyl(B, mat('metal', { color: 0x8a2a1c }), 0, 1.2, 0, 0.9, 0.9, 3.2, 28, 0, Math.PI / 2, 1.5); for (const s of [-1.2, 1.2]) tf.cbox(B, mat('steelDark'), s, 0.25, 0, 0.2, 0.5, 1.4, 0.01); tf.geo(B, labelMat('DIESEL', { fg: '#f2eee2', w: 256, h: 96 }), planeGeo(0.8, 0.3), 0, 1.4, 0.905); }
  },
  lift(L, B, a, ai, r) {
    buildEndCar(L, B, a);
    // the shaft: guide rails, the counterweight, a cage gate over the opening, hazard frame on the floor
    const f = areaFrame(a, 32.02, 11.5, -Math.PI / 2);
    for (const s of [-1.6, 1.6]) f.cbox(B, mat('metal', { color: 0xc8a032 }), s, 3.8, 0.0, 0.25, 7.5, 0.25, 0.02);
    f.cbox(B, mat('metal', { color: 0xc8a032 }), 0, 3.05, 0.0, 3.5, 0.25, 0.25, 0.02);
    f.geo(B, labelMat('FREIGHT  ·  4000 KG', { bg: '#e2ad3b', fg: '#141414', w: 512, h: 96, size: 60 }), planeGeo(2.0, 0.38), 0, 3.6, 0.14);
    for (let k = 0; k < 4; k++) B.add(hazardMat(), cachedGeo('hzFloor' + k, () => new THREE.PlaneGeometry(k % 2 ? 2.25 : 0.25, k % 2 ? 0.25 : 4.0).rotateX(-Math.PI / 2)), xform(a.offX + 30.6 + (k === 0 ? -1.0 : k === 2 ? 1.0 : 0), 0.005, a.offZ + 11.5 + (k === 1 ? -2.0 : k === 3 ? 2.0 : 0)));
    // pallet jack, handle up, abandoned by the lift
    palletJack(B, areaFrame(a, 24.5, 9.5, 0.7));
  },
};

// ---------- reusable set dressing ----------
function forklift(B, f) {
  // counterbalance truck, forks down, left where it died. Front is local -z.
  const paint = mat('metal', { color: 0xf0b232 }), dark = PM.black, steel = mat('steelDark'), rub = PM.rubber, seat = mat('fabric', { color: 0x19191b });
  const grey = mat('metal', { color: 0x3a3c40 });
  // chassis, the rounded cast counterweight at the back, step plates
  f.cbox(B, paint, 0, 0.5, 0.12, 1.12, 0.62, 1.62, 0.05);
  f.cbox(B, paint, 0, 0.6, 0.95, 1.14, 0.82, 0.4, 0.12);
  f.geo(B, paint, cylGeo(0.57, 0.57, 0.82, 32), 0, 0.6, 1.0, 0, 0, 0, 1, 1, 0.5);
  f.geo(B, grey, cylGeo(0.58, 0.58, 0.1, 32), 0, 0.24, 1.0, 0, 0, 0, 1, 1, 0.51);
  for (const s2 of [-1, 1]) {
    f.cbox(B, steel, s2 * 0.5, 0.36, -0.12, 0.16, 0.04, 0.42, 0.006);
    // wheel arches
    f.geo(B, paint, cylGeo(0.36, 0.36, 0.16, 24, 1, true), s2 * 0.5, 0.33, -0.45, 0, 0, Math.PI / 2);
  }
  // engine hood with louvres, seat, backrest, hip restraints
  f.cbox(B, paint, 0, 0.88, 0.5, 0.98, 0.14, 0.86, 0.05);
  for (let k = 0; k < 5; k++) f.box(B, dark, 0, 0.955, 0.66 + k * 0.05, 0.5, 0.008, 0.02);
  f.cbox(B, seat, 0, 1.03, 0.35, 0.52, 0.12, 0.48, 0.05);
  f.cbox(B, seat, 0, 1.36, 0.6, 0.5, 0.5, 0.1, 0.05, 0, 1, -0.22);
  for (const s2 of [-1, 1]) f.cbox(B, seat, s2 * 0.29, 1.16, 0.42, 0.07, 0.16, 0.3, 0.03);
  // front cowl, dash, steering column and wheel, levers
  f.cbox(B, paint, 0, 0.95, -0.45, 0.96, 0.32, 0.36, 0.06);
  f.cbox(B, dark, 0, 1.13, -0.36, 0.7, 0.05, 0.22, 0.02, 0, 1, 0.35);
  f.cyl(B, dark, 0, 1.3, -0.32, 0.035, 0.05, 0.42, 10, 0.55);
  f.geo(B, dark, torusGeo(0.17, 0.018, 6, 22), 0, 1.47, -0.22, 0, Math.PI / 2 - 0.55);
  f.cyl(B, dark, 0.0, 1.47, -0.22, 0.03, 0.03, 0.04, 8, Math.PI / 2 - 0.55);
  for (let k = 0; k < 3; k++) { f.cyl(B, dark, 0.22 + k * 0.06, 1.25, -0.4, 0.008, 0.008, 0.26, 6, 0.3); f.sphere(B, plainMat(0x8a1c14, { roughness: 0.4 }), 0.22 + k * 0.06, 1.38, -0.36, 0.022); }
  // wheels: big drive wheels in front, small steer wheels at the back
  for (const [x, z, r, w] of [[-0.5, -0.45, 0.31, 0.24], [0.5, -0.45, 0.31, 0.24], [-0.44, 0.98, 0.24, 0.2], [0.44, 0.98, 0.24, 0.2]]) {
    f.cyl(B, rub, x, r, z, r, r, w, 26, 0, Math.PI / 2);
    f.cyl(B, mat('metal', { color: 0xc8202a }), x + Math.sign(x) * (w / 2 + 0.002), r, z, r * 0.52, r * 0.52, 0.01, 18, 0, Math.PI / 2);
    f.cyl(B, steel, x + Math.sign(x) * (w / 2 + 0.01), r, z, r * 0.16, r * 0.16, 0.02, 10, 0, Math.PI / 2);
  }
  // overhead guard: raked front legs, straight rear legs, slatted roof
  for (const s2 of [-1, 1]) {
    f.cbox(B, dark, s2 * 0.5, 1.55, -0.38, 0.07, 1.25, 0.07, 0.01, 0, 1, -0.2);
    f.cbox(B, dark, s2 * 0.5, 1.5, 0.86, 0.07, 1.42, 0.07, 0.01);
    f.cbox(B, dark, s2 * 0.5, 2.2, 0.26, 0.08, 0.06, 1.34, 0.01);
    // work lamps on the front legs
    f.cbox(B, dark, s2 * 0.5, 2.05, -0.53, 0.12, 0.1, 0.08, 0.015);
    f.box(B, plainMat(0xd8d2c0, { roughness: 0.1, metalness: 0.3 }), s2 * 0.5, 2.05, -0.574, 0.09, 0.07, 0.004);
  }
  for (let k = 0; k < 7; k++) f.cbox(B, dark, 0, 2.22, -0.33 + k * 0.19, 1.04, 0.04, 0.06, 0.006);
  f.cyl(B, dark, 0, 2.27, 0.75, 0.05, 0.06, 0.06, 12);
  f.cyl(B, plainMat(0xffa21e, { roughness: 0.25, transparent: true, opacity: 0.85 }), 0, 2.35, 0.75, 0.055, 0.06, 0.12, 14);
  // propane cylinder strapped on the counterweight
  const tankM = mat('metal', { color: 0xd4d6d8 });
  f.cyl(B, tankM, 0, 1.24, 1.02, 0.16, 0.16, 0.7, 22, 0, Math.PI / 2);
  for (const s2 of [-1, 1]) { f.sphere(B, tankM, s2 * 0.35, 1.24, 1.02, 0.16); f.cbox(B, dark, s2 * 0.24, 1.24, 1.02, 0.03, 0.34, 0.34, 0.01); }
  f.cyl(B, PM.chrome, 0.38, 1.38, 1.02, 0.025, 0.025, 0.08, 8);
  f.geo(B, plainMat(0x111111, { roughness: 0.6 }), tubeGeo([[0.38, 1.41, 1.02], [0.42, 1.25, 0.9], [0.4, 0.95, 0.85]], 0.012, 10, 5), 0, 0, 0);
  // hazard chevrons on the counterweight, capacity plate on the cowl
  f.geo(B, hazardMat(), cachedGeo('fkHz', () => new THREE.CylinderGeometry(0.578, 0.578, 0.14, 24, 1, true, -1.15, 2.3)), 0, 0.86, 1.0, 0, 0, 0, 1, 1, 0.5);
  f.geo(B, labelMat('2500 KG  ·  LOAD CENTRE 500', { bg: '#1a1a1a', fg: '#e8e2d0', w: 512, h: 64, size: 34 }), planeGeo(0.5, 0.06), 0.565, 0.72, 0.1, Math.PI / 2);
  // mast: outer and inner channels, crossheads, chains, tilt rams
  for (const s2 of [-1, 1]) {
    f.cbox(B, steel, s2 * 0.4, 1.3, -0.84, 0.09, 2.4, 0.14, 0.01);
    f.cbox(B, steel, s2 * 0.3, 1.22, -0.86, 0.08, 2.2, 0.11, 0.01);
    f.cbox(B, plainMat(0x0d0d0e, { roughness: 0.5, metalness: 0.6 }), s2 * 0.18, 1.3, -0.84, 0.03, 2.0, 0.02, 0.004);
    f.cyl(B, PM.chrome, s2 * 0.42, 0.95, -0.66, 0.035, 0.035, 0.4, 10, Math.PI / 2 - 0.15);
    f.cyl(B, steel, s2 * 0.42, 0.95, -0.5, 0.05, 0.05, 0.2, 10, Math.PI / 2 - 0.15);
  }
  for (const y of [0.2, 1.2, 2.45]) f.cbox(B, steel, 0, y, -0.84, 0.9, 0.08, 0.1, 0.01);
  f.cyl(B, PM.chrome, 0, 1.1, -0.8, 0.04, 0.04, 1.8, 10);
  // carriage, load backrest, forks resting on the floor
  f.cbox(B, steel, 0, 0.32, -0.95, 1.0, 0.36, 0.05, 0.01);
  for (let k = 0; k < 6; k++) f.cbox(B, steel, -0.45 + k * 0.18, 0.95, -0.96, 0.03, 0.9, 0.025, 0.004);
  f.cbox(B, steel, 0, 1.4, -0.96, 1.0, 0.04, 0.03, 0.006);
  for (const s2 of [-1, 1]) {
    f.cbox(B, grey, s2 * 0.32, 0.3, -1.0, 0.12, 0.56, 0.05, 0.006);
    f.cbox(B, grey, s2 * 0.32, 0.03, -1.5, 0.12, 0.045, 1.02, 0.006);
    f.cbox(B, grey, s2 * 0.32, 0.07, -1.06, 0.12, 0.1, 0.12, 0.02);
  }
}
// A diesel generator set on a steel skid: engine block with its rocker covers and injectors, the alternator,
// a radiator with a fan guard at the front, a control panel on a stalk, and the exhaust going up and away.
// Front (radiator) is local -z.
function genset(B, f) {
  const paint = mat('metal', { color: 0x3a5a3e }), dark = mat('steelDark'), steel = mat('steel'), black = PM.black, rust = mat('rust');
  f.cbox(B, dark, 0, 0.12, 0, 1.5, 0.24, 4.6, 0.02);                        // the skid
  for (const s of [-0.62, 0.62]) f.cbox(B, mat('metal', { color: 0xc8a032 }), s, 0.26, 0, 0.12, 0.06, 4.4, 0.01);
  f.cbox(B, paint, 0, 0.92, 0.4, 1.2, 1.2, 2.2, 0.05);                       // engine block
  for (const s of [-0.38, 0.38]) { f.cbox(B, mat('metal', { color: 0x9a2a1e }), s, 1.62, 0.4, 0.32, 0.18, 1.9, 0.04); for (let k = 0; k < 6; k++) f.cyl(B, steel, s, 1.74, -0.4 + k * 0.32, 0.03, 0.03, 0.08, 8); }
  f.cyl(B, paint, 0, 0.95, 2.0, 0.58, 0.58, 0.95, 28, Math.PI / 2);          // alternator
  f.cyl(B, dark, 0, 0.95, 2.5, 0.6, 0.6, 0.06, 28, Math.PI / 2);
  for (let k = 0; k < 10; k++) f.box(B, black, 0, 0.95 - 0.45 + k * 0.1, 2.53, 0.9, 0.012, 0.01);
  f.cbox(B, paint, 0, 1.05, -1.4, 1.36, 1.7, 0.36, 0.03);                    // radiator
  f.box(B, black, 0, 1.05, -1.59, 1.2, 1.5, 0.01);
  for (let k = 0; k < 14; k++) f.box(B, dark, 0, 0.35 + k * 0.1, -1.6, 1.2, 0.012, 0.02);
  f.torus(B, dark, 0, 1.05, -1.62, 0.5, 0.02, Math.PI / 2);
  f.cyl(B, dark, 0.45, 1.3, 1.0, 0.09, 0.09, 0.5, 14, Math.PI / 2, 0.3);     // turbo and manifold
  f.cyl(B, rust, 0.55, 2.6, 1.15, 0.11, 0.11, 2.6, 14);                      // exhaust stack
  f.cyl(B, rust, 0.55, 6.6, 1.15, 0.13, 0.13, 5.4, 14);
  f.cyl(B, PM.black, 0.55, 3.95, 1.15, 0.2, 0.2, 0.7, 16);                   // silencer
  f.cbox(B, mat('metal', { color: 0x5a5e62 }), -0.95, 1.35, 0.9, 0.12, 0.7, 0.55, 0.02);   // control panel
  f.box(B, screenMat('dark'), -1.016, 1.42, 0.9, 0.004, 0.16, 0.26, Math.PI / 2);
  for (let k = 0; k < 4; k++) f.cyl(B, plainMat([0x9a1a12, 0x2a8a3a, 0xd8a535, 0x1a1a1a][k], { roughness: 0.4 }), -1.02, 1.2, 0.75 + k * 0.1, 0.022, 0.022, 0.03, 10, 0, Math.PI / 2);
  f.cyl(B, dark, -0.95, 0.65, 0.9, 0.03, 0.03, 0.6, 8);
  f.geo(B, labelMat('500 kVA  DIESEL', { fg: '#e8e2d2', w: 512, h: 96 }), planeGeo(0.9, 0.17), 0.611, 1.1, 0.4, Math.PI / 2);
  f.geo(B, labelMat('500 kVA  DIESEL', { fg: '#e8e2d2', w: 512, h: 96 }), planeGeo(0.9, 0.17), -0.611, 1.1, 0.4, -Math.PI / 2);
  f.geo(B, decalMat('oil'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), 0.3, 0.007, -0.2, 0, 0, 0, 1.6, 1, 2.2);
  // fuel day tank beside it, hose across the floor
  f.cbox(B, mat('metal', { color: 0x8a2a1c }), 1.35, 0.55, -0.9, 0.7, 1.1, 1.2, 0.04);
  f.cyl(B, PM.black, 1.0, 0.04, -0.2, 0.025, 0.025, 1.1, 8, Math.PI / 2, 0.5);
}
function palletJack(B, f) {
  const red = mat('metal', { color: 0xc93a2a }), dark = PM.black, steel = mat('steelDark'), rub = PM.rubber;
  // twin forks, tips toward local -z
  for (const s2 of [-1, 1]) {
    f.cbox(B, red, s2 * 0.2, 0.06, -0.5, 0.16, 0.06, 1.15, 0.01);
    f.box(B, red, s2 * 0.2, 0.035, -0.5, 0.15, 0.002, 1.1);
    f.cyl(B, PM.chrome, s2 * 0.2, 0.04, -1.0, 0.035, 0.035, 0.12, 12, 0, Math.PI / 2);
    f.cbox(B, steel, s2 * 0.2, 0.065, -0.45, 0.04, 0.03, 0.9, 0.004);
  }
  // the yoke and the hydraulic unit with its steer wheels
  f.cbox(B, red, 0, 0.12, 0.14, 0.56, 0.14, 0.22, 0.02);
  f.cyl(B, red, 0, 0.36, 0.2, 0.09, 0.1, 0.42, 16);
  f.cyl(B, PM.chrome, 0, 0.6, 0.2, 0.04, 0.04, 0.12, 10);
  for (const s2 of [-1, 1]) { f.cyl(B, rub, s2 * 0.07, 0.085, 0.3, 0.085, 0.085, 0.06, 18, 0, Math.PI / 2); f.cyl(B, steel, s2 * 0.11, 0.085, 0.3, 0.03, 0.03, 0.02, 8, 0, Math.PI / 2); }
  // tiller handle up and back, loop grip with the release trigger
  f.cbox(B, red, 0, 0.66, 0.24, 0.07, 0.12, 0.08, 0.01);
  f.cyl(B, red, 0, 0.98, 0.33, 0.022, 0.022, 0.72, 10, 0.28);
  f.geo(B, dark, torusGeo(0.13, 0.02, 6, 18), 0, 1.455, 0.466, 0, 0.28, 0);
  f.cbox(B, plainMat(0x8a1c14, { roughness: 0.4 }), 0, 1.36, 0.44, 0.05, 0.02, 0.06, 0.006, 0, 1, 0.28);
  f.geo(B, labelMat('2000 KG', { bg: '#c93a2a', fg: '#f2eee2', w: 256, h: 64, size: 40 }), planeGeo(0.16, 0.05), 0, 0.12, 0.256);
}
function rollupDoor(B, f, openFrac) {
  const H = 4.2, W = 3.4, slat = mat('metal', { color: 0x8a8e92 });
  const top = H * openFrac;
  for (let y = top + 0.1; y < H; y += 0.1) f.cbox(B, slat, 0, y, 0.04, W, 0.095, 0.03, 0.008);
  f.cbox(B, mat('steelDark'), 0, top + 0.06, 0.05, W, 0.12, 0.05, 0.01);
  if (openFrac > 0) f.box(B, plainMat(0x010101), 0, top / 2 + 0.05, 0.005, W, top, 0.004);
  for (const s of [-1, 1]) { f.cbox(B, mat('steelDark'), s * (W / 2 + 0.06), H / 2, 0.06, 0.12, H, 0.12, 0.01); f.cbox(B, plainMat(0x111111, { roughness: 0.9 }), s * (W / 2 + 0.2), 0.9, 0.18, 0.25, 0.4, 0.3, 0.03); }
  f.cbox(B, mat('metal', { color: 0x6a6e72 }), 0, H + 0.35, 0.25, W + 0.3, 0.6, 0.5, 0.03);
  f.geo(B, labelMat('DOCK  B' + Math.floor(f.oz % 7 + 1), { fg: '#f2eee2', w: 256, h: 96 }), planeGeo(0.9, 0.34), 0, H + 0.35, 0.505);
  for (let k = 0; k < 4; k++) B.add(hazardMat(), cachedGeo('rollHz' + k, () => new THREE.PlaneGeometry(k % 2 ? W + 0.6 : 0.2, k % 2 ? 0.2 : 1.6).rotateX(-Math.PI / 2)), xform(...(() => { const p = f.w(k === 0 ? -(W / 2 + 0.2) : k === 2 ? W / 2 + 0.2 : 0, 0.005, 0.9 + (k === 1 ? -0.8 : k === 3 ? 0.8 : 0)); return p; })(), f.rot));
}
