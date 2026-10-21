// ================= Seize - B5: what is under the facility =================
// A hospital level sealed off decades before anything above it was built. No power at all: your torch, and
// here and there a fitting that still sputters. Doors open with codes painted in coloured numbers around the
// rooms. And the Chud, which cannot hear a thing - and sees light from a long way off.
//
// Legend additions for these maps:
//   N  keypad door (a 4-digit code)      1 2 3 4  where each coloured number of the area's code is painted
//   &  where the Chud waits in this area

// ---------- materials and looks ----------
Object.assign(MAT_DEFS, {
  tileWard: { tex: 'tile', ns: 0.9, color: 0xb4c0b0, tile: 3 },
  paintWard: { tex: 'paint', ns: 0.7, color: 0x76866f },
  paintDay: { tex: 'paint', ns: 0.7, color: 0x8a8670 },
  floorWard: { tex: 'tilefloor', ns: 0.8, color: 0x8a887c, tile: 4 },
  woodPanel: { tex: 'wood', ns: 0.9, color: 0x5a4030 },
  paperRed: { tex: 'paint', ns: 0.8, color: 0x6a3430 },
  carpetRed: { tex: 'carpet', ns: 0.8, color: 0x5e2a26, tile: 4 },
  plaster: { tex: 'paint', ns: 0.9, color: 0x9a968a },
});
// 'broken': the fittings that are left are dead, or sputter on for a moment and die again
Object.assign(THEMES, {
  landing: { lo: 'tileWard', hi: 'paintWard', floor: 'floorWard', ceil: 'panel', ceilType: 'grid', rail: true, fog: [0x000000, 0.05], amb: [0x0c100e, 0x020202, 0.012], L: 0xd8f4e4, star: 0xffc890, bang: 0xff2a1a, power: { L: [0, 0.6], '*': [0, 0.7], '!': [0, 0] }, haze: 0.5, broken: true },
  ward: { lo: 'tileWard', hi: 'paintWard', floor: 'floorWard', ceil: 'panel', ceilType: 'grid', rail: true, fog: [0x000000, 0.05], amb: [0x0c100e, 0x020202, 0.01], L: 0xd8f4e4, star: 0xffc890, bang: 0xff2a1a, power: { L: [0, 0.4], '*': [0, 0.6], '!': [0, 0] }, haze: 0.5, broken: true },
  dayroom: { lo: 'paintDay', hi: 'paintDay', floor: 'floorWard', ceil: 'panel', ceilType: 'grid', fog: [0x000000, 0.045], amb: [0x0e0e0c, 0x020202, 0.01], L: 0xe8f0e0, star: 0xffc890, bang: 0xff2a1a, power: { L: [0, 0.45], '*': [0, 0.6], '!': [0, 0] }, haze: 0.6, broken: true },
  oldwing: { lo: 'woodPanel', hi: 'paperRed', floor: 'carpetRed', ceil: 'plaster', ceilType: 'slab', rail: true, fog: [0x000000, 0.05], amb: [0x100c0a, 0x020101, 0.012], L: 0xffd8a8, star: 0xffb870, bang: 0xff2a1a, power: { L: [0, 0.5], '*': [0, 0.7], '!': [0, 0] }, haze: 0.5, broken: true },
});
Object.assign(THEME_SOIL, { landing: [0.08, 0.85], ward: [0.1, 0.9], dayroom: [0.06, 0.85], oldwing: [0.04, 0.8] });
Object.assign(DRESS.kits, {
  landing: [['firstaid', 0.04], ['notice', 0.05], ['clock', 0.02], ['scratch', 0.05], ['hand', 0.05], ['ext', 0.02]],
  ward: [['firstaid', 0.03], ['notice', 0.04], ['ring', 0.03], ['scratch', 0.06], ['hand', 0.07], ['clock', 0.02], ['tally', 0.03]],
  dayroom: [['poster', 0.05], ['cork', 0.04], ['clock', 0.03], ['scratch', 0.05], ['hand', 0.05]],
  oldwing: [['poster', 0.03], ['clock', 0.02], ['scratch', 0.05], ['hand', 0.06], ['cork', 0.02]],
});

// ---------- the maps ----------
const SEIZE_META = [
  { name: 'Lift Landing', theme: 'landing', ceil: 3.2, objective: 'The door out is locked with a code. Find the four coloured numbers.',
    note: 'SUBLEVEL B-5 - WARD C. Sealed by order, 1979. Whatever is still down here cannot hear. It sees light. If you hear it coming, put your light out and do not move.' },
  { name: 'Ward C', theme: 'ward', ceil: 3.0, objective: 'Find the four numbers in the patient rooms. Keep your light off in the corridor.',
    note: 'Patient 9 has stopped answering to his name. He stands in the corridor all night. When the night nurse shines her torch at him he turns round. (Night report, 14 March)' },
  { name: 'Day Room', theme: 'dayroom', ceil: 3.6, objective: 'The numbers are on the pillars and walls. Cross the room without being seen.',
    note: 'He was too big for the beds, so we moved him to the day room. He sits in the dark and listens to nothing. He only gets up when someone turns a light on.' },
  { name: 'The Old Wing', theme: 'oldwing', ceil: 3.4, objective: 'Call the lift at the end of the hall, and stay out of its sight until it comes.',
    note: 'The old wing lift still goes down. Nobody remembers what to. It takes half a minute to come up. Half a minute is a long time.' },
];

function seizeArea1(rnd) { // Lift Landing: the reception the lift opens on
  const g = new MapGrid(32, 22);
  // the lift car you arrive in, set into the west wall (the same car as the first floor's)
  g.fill(0, 8, 5, 15, '#'); g.fill(1, 9, 4, 14, 'z'); g.put([[5, 11], [5, 12]], 'z');
  g.put([[2, 10], [3, 10], [2, 13], [3, 13]], '@');
  g.floor(6, 2, 30, 19);
  // columns holding up the low ceiling
  for (const [x, z] of [[12, 6], [12, 15], [20, 6], [20, 15]]) g.set(x, z, 'I');
  // the nurses' station: a horseshoe of counters, a chair still behind it
  g.put([[15, 9], [16, 9], [17, 9], [15, 10], [15, 11], [15, 12], [16, 12], [17, 12]], 't'); g.set(16, 10, 'h');
  // the waiting area: benches, chairs, a gurney left in the middle of the floor
  g.put([[8, 2], [9, 2], [10, 2], [24, 2], [25, 2], [26, 2]], 'b'); g.put([[9, 5], [25, 6], [23, 17]], 'h');
  g.put([[8, 18], [19, 18]], 'g');
  g.put([[11, 19], [12, 19], [13, 19]], 'd');
  // the nurses' office: the shelter
  g.fill(22, 13, 31, 21, '#'); g.fill(23, 14, 30, 20, 's'); g.set(26, 13, 'S');
  g.put([[30, 15], [30, 16]], 'l'); g.set(24, 20, 't'); g.set(25, 20, 'h'); g.set(27, 17, '*'); g.set(29, 20, 'n');
  // the way on: a door with a keypad, and its code painted round the room
  g.set(31, 6, 'N');
  g.set(6, 4, '1'); g.set(30, 9, '2'); g.set(18, 19, '3'); g.set(12, 7, '4');
  g.put([[10, 11], [24, 9]], 'L'); g.set(8, 15, '*');
  g.scatter(rnd, 6, 2, 30, 19, ':', 22); g.scatter(rnd, 6, 2, 30, 19, '%', 6);
  return g;
}

function seizeArea2(rnd) { // Ward C: one long corridor, patient rooms off both sides
  const g = new MapGrid(48, 26);
  const rooms = [[2, 8], [10, 16], [18, 24], [26, 32], [34, 40]];
  for (const [a, b] of rooms) { g.floor(a, 2, b, 9); g.floor(a, 15, b, 23); }
  // a day alcove at the far end, open to the corridor three wide: it can get in there
  g.floor(42, 2, 46, 9);
  g.floor(1, 11, 46, 13);
  g.set(0, 12, '<'); g.set(47, 12, 'N');
  // each room has one narrow door: too narrow for it
  for (const [a] of rooms) { g.set(a + 3, 10, '.'); g.set(a + 3, 14, '.'); }
  g.fill(42, 10, 44, 10, '.');
  // beds and chairs in the rooms, a trolley in the corridor
  for (const [a, b] of rooms) {
    g.put([[a, 3], [a, 6]], 'g'); g.set(b, 3, 'h');
    g.put([[a, 22], [a, 19]], 'g'); g.set(b, 22, 'h');
  }
  g.set(45, 3, 'b'); g.set(44, 6, 't');
  // shelter: the linen room
  g.fill(41, 14, 47, 25, '#'); g.fill(42, 15, 46, 24, 's'); g.set(44, 14, 'S');
  g.put([[46, 15], [46, 16]], '$'); g.set(43, 20, '*'); g.set(42, 24, 'n');
  // the code, spread through the rooms
  g.set(2, 8, '1'); g.set(24, 2, '2'); g.set(10, 23, '3'); g.set(32, 15, '4');
  for (const x of [6, 14, 22, 30, 38]) g.set(x, 12, 'L');
  g.set(26, 12, '&');
  g.put([[5, 5], [21, 19], [37, 6]], '*');
  g.scatter(rnd, 1, 11, 46, 13, ':', 18); g.scatter(rnd, 2, 2, 40, 23, '%', 8);
  return g;
}

function seizeArea3(rnd) { // Day Room: one big room, pillars, furniture pushed about
  const g = new MapGrid(40, 30);
  g.floor(1, 1, 38, 28);
  g.set(0, 6, '<'); g.set(39, 22, 'N');
  for (let x = 8; x <= 32; x += 8) for (const z of [8, 15, 22]) g.set(x, z, 'I');
  for (const [x, z] of [[4, 11], [13, 4], [24, 11], [13, 18], [27, 26], [5, 24], [33, 4]]) { g.set(x, z, 't'); g.set(x + 1, z, 't'); g.put([[x, z - 1], [x + 1, z + 1]], 'h'); }
  g.fill(18, 13, 19, 14, 'X'); g.put([[1, 15], [1, 16]], '$');
  // a nurse's booth in the corner: the shelter
  g.fill(31, 12, 39, 19, '#'); g.fill(32, 13, 38, 18, 's'); g.set(35, 12, 'S');
  g.set(37, 17, 't'); g.set(36, 17, 'h'); g.set(33, 14, '*'); g.set(38, 13, 'n');
  g.set(8, 9, '1'); g.set(32, 23, '2'); g.set(1, 27, '3'); g.set(24, 7, '4');
  g.set(20, 20, '&');
  g.put([[12, 8], [28, 18], [20, 26]], 'L'); g.set(4, 4, '*');
  g.scatter(rnd, 1, 1, 38, 28, ':', 30); g.scatter(rnd, 1, 1, 38, 28, '%', 8);
  return g;
}

function seizeArea4(rnd) { // The Old Wing: a panelled hall from long before the hospital, and a lift at the end of it
  const g = new MapGrid(44, 22);
  g.floor(1, 9, 30, 11);
  g.set(0, 10, '<');
  // off the hall: a library (narrow door), a chapel (a wide arch - it can follow you in), an office
  g.floor(3, 2, 12, 7); g.set(7, 8, '.');
  g.floor(16, 2, 27, 7); g.fill(20, 8, 22, 8, '.');
  g.floor(4, 13, 13, 19); g.set(9, 12, '.');
  g.floor(16, 13, 27, 19); g.set(21, 12, '.');
  g.put([[3, 3], [3, 4], [3, 5], [3, 6], [12, 3], [12, 4], [12, 5], [12, 6]], '$');
  for (const z of [4, 6]) for (let x = 18; x <= 25; x++) if (x !== 21) g.set(x, z, 'b');
  g.put([[6, 15], [7, 15]], 't'); g.set(6, 16, 'h'); g.put([[13, 14], [13, 15]], '$');
  // a shelter in the south rooms: the old porter's lodge
  g.fill(15, 12, 28, 20, '#'); g.fill(16, 13, 27, 19, 's'); g.set(21, 12, 'S');
  g.put([[27, 14], [27, 15]], 'l'); g.set(18, 18, '*'); g.set(25, 18, 'n');
  // the lift lobby and the lift itself
  g.floor(31, 4, 36, 16);
  g.fill(37, 5, 43, 15, '#'); g.fill(38, 6, 42, 14, 'z'); g.put([[37, 9], [37, 10], [37, 11]], 'Z');
  g.set(36, 7, 'u');
  g.set(14, 10, '&');
  for (const x of [5, 15, 25]) g.set(x, 10, 'L');
  g.put([[33, 6], [33, 14], [8, 4]], '*');
  g.scatter(rnd, 1, 9, 30, 11, ':', 10); g.scatter(rnd, 1, 2, 36, 19, '%', 6);
  return g;
}

const SEIZE_BUILDERS = [seizeArea1, seizeArea2, seizeArea3, seizeArea4];
const LEVELS = {
  l1: { key: 'l1', title: 'Reach - B4', builders: AREA_BUILDERS, meta: AREA_META, seed: 9100, monster: 'listener' },
  l2: { key: 'l2', title: 'Seize - B5', builders: SEIZE_BUILDERS, meta: SEIZE_META, seed: 50200, monster: 'chud' },
};

// ---------- the codes ----------
const CODE_COLORS = ['#c8352c', '#2f6fd8', '#3aa84a', '#e2b52a'];
const CODE_NAMES = ['red', 'blue', 'green', 'yellow'];
// every keypad door gets four random digits, and the order its coloured lamps say to enter them in
function seizeCodes(g) {
  g.codes = {}; g.ord = {};
  Game.L.locks.forEach((lock, i) => {
    if (lock.type !== 'N') return;
    let c = ''; for (let k = 0; k < 4; k++) c += Math.floor(Math.random() * 10);
    const o = [0, 1, 2, 3]; for (let k = 3; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [o[k], o[j]] = [o[j], o[k]]; }
    g.codes[i] = c; g.ord[i] = o.join('');
  });
}
function seizeNewRound(g) {
  const L = Game.L;
  seizeCodes(g);
  const first = L.chudSpots.findIndex((s) => !!s);
  const sp = L.chudSpots[first] || { x: 0, z: 0 };
  g.ch = { x: r2(sp.x), z: r2(sp.z), y: 0, s: 0, m: first >= 0 ? 'idle' : 'hidden', a: first, lx: 0, lz: 0, gr: 0 };
  Game.cs = { state: 'idle', timer: 4, path: null, pi: 0, sus: {}, target: null, last: null, area: first, moveT: 0, look: 0, relocate: -1, grab: null, stuck: 0, heard: 0 };
}
// what has to be typed: the digits of the code, read off in the order of the lamps
function codeFor(g, id) { const c = g.codes && g.codes[id], o = g.ord && g.ord[id]; return c && o ? [...o].map((k) => c[+k]).join('') : null; }

// ---------- where it can go ----------
// It is far too wide for a single door: it needs three clear metres. Rooms behind narrow doors are out of
// its reach; corridors and open halls are its.
function chudGrid(L) {
  if (L.chw) return L.chw;
  const W = L.W, H = L.H, c = new Uint8Array(W * H);
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    let ok = 1;
    for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1; dx++) { const k = (z + dz) * W + x + dx; if (!L.cwalk[k] || L.lockAt[k] >= 0) { ok = 0; break; } }
    c[z * W + x] = ok;
  }
  // which pieces of floor join up: the inside of a room it can't get into is no use to it
  const comp = new Int32Array(W * H).fill(-1);
  let n = 0;
  for (let k = 0; k < W * H; k++) {
    if (!c[k] || comp[k] >= 0) continue;
    const q = [k]; comp[k] = n;
    for (let i = 0; i < q.length; i++) {
      const cur = q[i], x = cur % W, z = (cur / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = (z + dz) * W + x + dx; if (c[nk] && comp[nk] < 0) { comp[nk] = n; q.push(nk); } }
    }
    n++;
  }
  L.chw = c; L.chwComp = comp;
  return c;
}
const chudOk = (L, x, z) => { const gx = Math.floor(x), gz = Math.floor(z); return inGrid(L, gx, gz) && !!chudGrid(L)[gz * L.W + gx]; };
function chudPath(L, sx, sz, tx, tz) { const grid = chudGrid(L); return navPath(L, (k) => !!grid[k], sx, sz, tx, tz); }
// a straight walk between two points, every step of it on cells ok(k) allows
function navLine(L, ok, ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.35);
  for (let i = 1; i <= n; i++) { const x = Math.floor(ax + (bx - ax) * i / n), z = Math.floor(az + (bz - az) * i / n); if (!inGrid(L, x, z) || !ok(z * L.W + x)) return false; }
  return true;
}
// A* over the cells ok(k) allows, smoothed into as few straight runs as it can
function navPath(L, ok, sx, sz, tx, tz) {
  const W = L.W, N = L.W * L.H, at = (k) => k >= 0 && k < N && ok(k);
  let s = Math.floor(sz) * W + Math.floor(sx), t = Math.floor(tz) * W + Math.floor(tx);
  if (!at(t)) {
    // aim for the nearest cell it can stand in
    let best = -1, bd = 1e9; const gx0 = Math.floor(tx), gz0 = Math.floor(tz);
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) { const x = gx0 + dx, z = gz0 + dz; if (!inGrid(L, x, z) || !at(z * W + x)) continue; const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = z * W + x; } }
    if (best < 0) return null;
    t = best; tx = (t % W) + 0.5; tz = ((t / W) | 0) + 0.5;
  }
  if (!at(s)) return [{ x: tx, z: tz }];
  const g = new Map([[s, 0]]), came = new Map(), heap = new MinHeap(), closed = new Set();
  const tgx = t % W, tgz = (t / W) | 0;
  heap.push(0, s);
  let n = 0;
  while (heap.size && n < 9000) {
    const cur = heap.pop();
    if (closed.has(cur)) continue;
    if (cur === t) break;
    closed.add(cur); n++;
    const cx = cur % W, cz = (cur / W) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz, nk = nz * W + nx;
      if (!at(nk) || (dx && dz && (!at(cz * W + nx) || !at(nz * W + cx)))) continue;
      const cost = g.get(cur) + (dx && dz ? 1.414 : 1);
      if (cost < (g.has(nk) ? g.get(nk) : 1e9)) { g.set(nk, cost); came.set(nk, cur); const ax = Math.abs(nx - tgx), az = Math.abs(nz - tgz); heap.push(cost + Math.max(ax, az) + 0.414 * Math.min(ax, az), nk); }
    }
  }
  if (!came.has(t)) return null;
  const cells = []; for (let k = t; k !== s; k = came.get(k)) cells.push(k);
  cells.reverse();
  const pts = cells.map((k) => ({ x: (k % W) + 0.5, z: ((k / W) | 0) + 0.5 }));
  pts[pts.length - 1] = { x: tx, z: tz };
  const out = []; let from = { x: sx, z: sz }, i = 0;
  while (i < pts.length) { let j = Math.min(pts.length - 1, i + 12); while (j > i && !navLine(L, at, from.x, from.z, pts[j].x, pts[j].z)) j--; out.push(pts[j]); from = pts[j]; i = j + 1; }
  return out;
}

// ---------- the host's Chud ----------
// it roams at a fast heavy walk now, and when it has seen you it comes at a lumbering run you can only just
// outpace - for as long as your legs hold out
const CHUD_WALK = 1.45, CHUD_HUNT = 2.95, CHUD_GRAB = 1.85, CHUD_EYE = 2.5;
// Can it see this player? Not by sound - it hears nothing. A torch is a beacon from across a hall; a torch in
// its face from further still. In the dark it has to all but walk into you.
function chudSees(g, p, L, open) {
  const ch = g.ch, dx = p.x - ch.x, dz = p.z - ch.z, d = Math.hypot(dx, dz);
  if (d < 1.3) return 3;
  if (d > 34) return 0;
  const fwdx = Math.sin(ch.y), fwdz = Math.cos(ch.y);
  const inCone = (dx * fwdx + dz * fwdz) / Math.max(d, 1e-3) > Math.cos(1.25);
  const pfx = -Math.sin(p.yaw), pfz = -Math.cos(p.yaw);
  const beamOnIt = p.fl && (-dx * pfx - dz * pfz) / Math.max(d, 1e-3) > Math.cos(0.42);
  if (!(inCone || beamOnIt)) return 0;
  if (!lineOfSight(L, ch.x, ch.z, p.x, p.z, open)) return 0;
  if (p.fl) return (beamOnIt ? 2.6 : 1.6) * clamp(1.25 - d / 30, 0.25, 1);
  // no light: only close, only in front - or standing under one of the lamps that still sputters
  if (inCone && d < 3.2) return 1.4;
  if (inCone && d < 14 && litAt(p.x, p.z)) return 1.0;
  return 0;
}
// is this spot lit right now by one of the fittings that still works, on and off?
function litAt(x, z) {
  for (const s of World.lightSpots) if (!s.dead && (s.level || 0) > 0.4 && Math.hypot(s.x - x, s.z - z) < 2.6) return true;
  return false;
}
function chudTick(g, living, players, dt, open) {
  const L = Game.L, cs = Game.cs, ch = g.ch;
  if (!cs || !ch) return;
  // a new area for the team: it goes ahead of them, somewhere in the dark, while nobody is looking at it
  if (g.ca > cs.area && L.chudSpots[g.ca] && cs.state !== 'grab') {
    if (cs.relocate < 0) cs.relocate = 10 + Math.random() * 8;
    cs.relocate -= dt;
    const watched = living.some((p) => chudSees(g, p, L, open) > 0);
    if (cs.relocate <= 0 && !watched) {
      const sp = L.chudSpots[g.ca];
      ch.x = r2(sp.x); ch.z = r2(sp.z); ch.a = g.ca; cs.area = g.ca; cs.state = 'idle'; cs.timer = 3; cs.path = null; cs.sus = {}; cs.target = null; cs.relocate = -1;
      ch.m = 'idle'; ch.s = 0;
      hostEvent(g, 'chudBang', { x: ch.x, z: ch.z });
    }
  }
  if (ch.m === 'hidden') return;
  // the lift's lights coming on down the end of the hall: it sees those, and it comes
  if (g.lift && g.lift.st === 1 && !cs.liftDrawn && cs.area === L.areas.length - 1) {
    cs.liftDrawn = true;
    const dev = L.devices.find((d) => d.type === 'u');
    if (dev) { cs.state = 'hunt'; cs.last = { x: dev.x, z: dev.z }; cs.path = null; hostEvent(g, 'chudBang', { x: r2(ch.x), z: r2(ch.z) }); }
  }
  // who can it see, and how sure is it
  let best = null, bestS = 0;
  for (const p of living) {
    const v = chudSees(g, p, L, open);
    cs.sus[p.id] = clamp((cs.sus[p.id] || 0) + (v > 0 ? v * dt : -dt * 0.4), 0, 1.5);
    if (v > 0 && cs.sus[p.id] >= 1 && (!best || cs.sus[p.id] > bestS)) { best = p; bestS = cs.sus[p.id]; }
  }
  for (const id in cs.sus) if (!living.some((p) => p.id === id)) delete cs.sus[id];
  // the grab: once it has someone, it holds them
  if (cs.state === 'grab') {
    cs.timer -= dt; ch.s = 0;
    if (cs.timer <= 0) { cs.state = 'search'; cs.timer = 4; ch.m = 'search'; }
    return;
  }
  if (best) {
    if (cs.state !== 'hunt' && cs.state !== 'notice') { cs.state = 'notice'; cs.timer = 0.75; hostEvent(g, 'chudSaw', { x: r2(ch.x), z: r2(ch.z), who: best.id }); }
    cs.target = best.id; cs.last = { x: best.x, z: best.z };
  }
  // within reach of someone it can see, or has walked right into: it takes them
  for (const p of living) {
    const d = dist2(p.x, p.z, ch.x, ch.z);
    if (d < CHUD_GRAB && ((cs.sus[p.id] || 0) >= 0.6 || d < 1.25) && !safeAt(L, p.x, p.z)) { chudTake(g, p); return; }
  }
  let goal = null, speed = 0;
  if (cs.state === 'notice') {
    // it stops dead, turns to the light, and grunts - then comes
    cs.timer -= dt;
    if (cs.last) ch.y = dampAngle(ch.y, Math.atan2(cs.last.x - ch.x, cs.last.z - ch.z), 3, dt);
    if (cs.timer <= 0) { cs.state = 'hunt'; cs.path = null; }
  } else if (cs.state === 'hunt') {
    goal = cs.last; speed = CHUD_HUNT * (cs.last && dist2(ch.x, ch.z, cs.last.x, cs.last.z) < 4 ? 1.12 : 1);
    if (!best && cs.last && dist2(ch.x, ch.z, cs.last.x, cs.last.z) < 1.2) { cs.state = 'search'; cs.timer = 5 + Math.random() * 3; cs.path = null; }
  } else if (cs.state === 'search') {
    cs.timer -= dt;
    ch.y += Math.sin(g.t * 0.8) * dt * 0.9;
    if (cs.timer <= 0) { cs.state = 'idle'; cs.timer = 2; cs.target = null; }
  } else if (cs.state === 'idle') {
    cs.timer -= dt;
    if (cs.timer <= 0) { cs.state = 'wander'; cs.goal = chudWanderPoint(g, living, cs.area); cs.path = null; }
  } else if (cs.state === 'wander') {
    goal = cs.goal; speed = CHUD_WALK;
    if (!goal || dist2(ch.x, ch.z, goal.x, goal.z) < 1.0) { cs.state = 'idle'; cs.timer = 1.2 + Math.random() * 2.6; }
  }
  ch.s = 0;
  if (goal && speed > 0) chudMove(g, cs, goal, speed, dt);
  ch.m = cs.state === 'hunt' || cs.state === 'notice' ? 'hunt' : cs.state === 'search' ? 'search' : ch.s > 0.05 ? 'walk' : 'idle';
  const tgt = cs.target && living.find((p) => p.id === cs.target);
  if (tgt && (cs.state === 'hunt' || cs.state === 'notice')) { ch.lx = r2(tgt.x); ch.lz = r2(tgt.z); } else { ch.lx = 0; ch.lz = 0; }
  ch.x = r2(ch.x); ch.z = r2(ch.z); ch.y = r2(wrapAngle(ch.y)); ch.s = r2(ch.s);
}
// somewhere in its area to drift to - toward where the team is, more often than not
function chudWanderPoint(g, living, area) {
  const L = Game.L, A = L.areas[area]; if (!A) return null;
  const grid = chudGrid(L), here = L.chwComp[Math.floor(g.ch.z) * L.W + Math.floor(g.ch.x)];
  const near = living.filter((p) => areaAt(L, p.x, p.z) === area);
  for (let k = 0; k < 40; k++) {
    let x, z;
    if (near.length && Math.random() < 0.7) { const p = near[Math.floor(Math.random() * near.length)]; x = p.x + (Math.random() - 0.5) * 12; z = p.z + (Math.random() - 0.5) * 12; }
    else { x = A.offX + 1 + Math.random() * (A.w - 2); z = A.offZ + 1 + Math.random() * (A.h - 2); }
    const gx = Math.floor(x), gz = Math.floor(z);
    if (inGrid(L, gx, gz) && grid[gz * L.W + gx] && L.area[gz * L.W + gx] === area && (here < 0 || L.chwComp[gz * L.W + gx] === here)) return { x: gx + 0.5, z: gz + 0.5 };
  }
  return null;
}
function chudMove(g, cs, goal, speed, dt) {
  const L = Game.L, ch = g.ch;
  cs.repath = (cs.repath || 0) - dt;
  if (!cs.path || cs.repath <= 0 || !cs.pgoal || dist2(cs.pgoal.x, cs.pgoal.z, goal.x, goal.z) > 1.5) {
    cs.path = chudPath(L, ch.x, ch.z, goal.x, goal.z); cs.pi = 0; cs.pgoal = { x: goal.x, z: goal.z }; cs.repath = 1.2;
    if (!cs.path) { cs.state = cs.state === 'hunt' ? 'search' : 'idle'; cs.timer = 3; return; }
  }
  const wp = cs.path[cs.pi]; if (!wp) return;
  const dx = wp.x - ch.x, dz = wp.z - ch.z, d = Math.hypot(dx, dz);
  if (d < 0.35) { cs.pi++; return; }
  // it turns slowly, and doesn't walk where it isn't facing
  const want = Math.atan2(dx, dz);
  ch.y = dampAngle(ch.y, want, speed > 2 ? 3.4 : 2.4, dt);
  const face = Math.cos(wrapAngle(want - ch.y));
  const v = speed * clamp(face, 0.15, 1);
  const nx = ch.x + Math.sin(ch.y) * v * dt, nz = ch.z + Math.cos(ch.y) * v * dt;
  if (chudOk(L, nx, nz)) { ch.x = nx; ch.z = nz; ch.s = v; cs.stuck = 0; }
  else { cs.stuck += dt; if (cs.stuck > 1.5) { cs.path = null; cs.stuck = 0; } }
}
function chudTake(g, p) {
  const cs = Game.cs, ch = g.ch;
  cs.state = 'grab'; cs.timer = CHUD_KILL + 1.2;
  ch.m = 'grab'; ch.s = 0; ch.y = r2(Math.atan2(p.x - ch.x, p.z - ch.z));
  g.k[p.id] = Math.max(0.01, r2(g.t)); g.kc = (g.kc || 0) + 1;
  dropItems(g, p);
  g.kl = { id: p.id, t: r2(g.t), c: 1, x: r2(ch.x), z: r2(ch.z), y: ch.y, vx: r2(p.x), vz: r2(p.z) };
  hostEvent(g, 'chudGrab', { who: p.id, x: r2(p.x), z: r2(p.z) });
}

// ---------- every machine: drawing it, hearing it, feeling it ----------
const CS = { x: 0, z: 0, y: 0, init: false, gruntT: 3, nearT: 0, lastM: '' };
function updateChudClient(dt, t) {
  const g = Game.g, ch = g && g.ch;
  if (!Chud.ready || !ch || ch.m === 'hidden' || g.lv !== 'l2') { setChudVisible(false); Sound.chudBreath({ x: 0, y: 0, z: 0 }, false); return; }
  if (!CS.init || dist2(CS.x, CS.z, ch.x, ch.z) > 6) { CS.x = ch.x; CS.z = ch.z; CS.y = ch.y; CS.init = true; Chud.snap = true; }
  CS.x = damp(CS.x, ch.x, 8, dt); CS.z = damp(CS.z, ch.z, 8, dt); CS.y = dampAngle(CS.y, ch.y, 8, dt);
  // while it has someone, it is exactly where it took them, facing them
  const kl = g.kl, kT = kl && kl.c === 1 && Game.gt !== undefined ? Game.gt - kl.t : -1, killing = kT >= 0 && kT < CHUD_KILL;
  if (killing) { CS.x = kl.x; CS.z = kl.z; CS.y = kl.y; }
  const cam = R.camera.position, dCam = dist2(cam.x, cam.z, CS.x, CS.z);
  setChudVisible(dCam < 42);
  Object.assign(Chud, { x: CS.x, z: CS.z, y: 0, yaw: CS.y, speed: killing ? 0 : ch.s, mode: ch.m });
  Chud.look = ch.lx || ch.lz ? { x: ch.lx, y: 1.5, z: ch.lz } : null;
  Chud.reach = 0; Chud.grip = undefined;
  if (killing) { Chud._kl = kl; Chud._kT = kT; chudKillOverrides(kl, kT); }
  else { Chud.ov = null; Chud._kl = null; }
  Chud.gore = Math.max(0, Chud.gore - dt / 150);
  chudPose(dt, t);
  // every step: a bang, the floor jumping, dust where the foot came down and grit out of the ceiling
  for (const ev of Chud.events) {
    const d = dist2(ev.x, ev.z, cam.x, cam.z);
    if (d > 55) continue;
    const felt = clamp(1 - d / 16, 0, 1);
    Sound.chudStep({ x: ev.x, y: 0.2, z: ev.z }, ev.power, felt);
    R.shake = Math.max(R.shake || 0, felt * 0.75 + (d < 28 ? 0.12 : 0));
    if (felt > 0.5) R.hit = Math.max(R.hit || 0, (felt - 0.5) * 0.9);
    debrisBurst(ev.x, 0.05, ev.z, 'f', 0.35 * ev.power);
    if (d < 11) debrisShower(cam.x, cam.z, Math.round(6 + felt * 18));
    R.flicker = Math.max(R.flicker || 0, felt * 0.6);
  }
  Chud.events.length = 0;
  // the grunting, all the time it is moving; a roar when it has seen you
  if (ch.m !== CS.lastM) { if (ch.m === 'hunt' && !killing) { chudGrunt(); Chud.gruntT = 1.2; Sound.chudGrunt({ x: CS.x, y: 2.2, z: CS.z }, true); CS.gruntT = 1.5; } CS.lastM = ch.m; }
  CS.gruntT -= dt;
  if (CS.gruntT <= 0 && !killing) {
    CS.gruntT = ch.m === 'hunt' ? 1.4 + Math.random() * 1.6 : ch.m === 'walk' ? 2.4 + Math.random() * 2.6 : 4.5 + Math.random() * 5;
    if (ch.m !== 'idle' || Math.random() < 0.5) { chudGrunt(); Sound.chudGrunt({ x: CS.x, y: 2.2, z: CS.z }, false); }
  }
  Sound.chudBreath({ x: CS.x, y: 2.2, z: CS.z }, dCam < 30, ch.m === 'hunt' || killing ? 1.7 : 1);
}
function mateOrMe(id) {
  if (Game.me && id === netMyId()) return Game.me;
  const m = Game.mates.get(id); return m || null;
}
// is the Chud close enough to frighten: for the heart, the screen, the torch
function chudThreat() {
  const g = Game.g, ch = g && g.ch;
  if (!ch || ch.m === 'hidden' || !Game.me) return 0;
  const d = dist2(Game.me.x, Game.me.z, CS.x, CS.z);
  return clamp(1 - d / (ch.m === 'hunt' ? 16 : 10), 0, 1) * (ch.m === 'hunt' ? 1 : 0.6);
}

// ---------- keypad doors ----------
// A steel door that slides into the wall, and beside it a keypad: twelve worn keys, a little dead screen, and
// over it four lamps in the order the code is read - red, blue, green, yellow, in whatever order this door wants.
function buildKeypadDoor(L, lock, g0, W) {
  const steel = mat('metal', { color: 0x6c7268 }), dark = mat('steelDark');
  const panel = new THREE.Group();
  const body = new THREE.Mesh(cboxGeo(W, 2.3, 0.1, 0.01, 1.2), steel); body.position.y = 1.15; body.castShadow = true; body.receiveShadow = true; panel.add(body);
  for (const y of [0.5, 1.15, 1.8]) for (const z of [-0.06, 0.06]) { const r = new THREE.Mesh(cboxGeo(W - 0.1, 0.06, 0.02, 0.005), dark); r.position.set(0, y, z); panel.add(r); }
  const win = new THREE.Mesh(boxGeo(0.28, 0.38, 0.11), plainMat(0x0a0c0c, { roughness: 0.1, metalness: 0.3 })); win.position.set(0, 1.6, 0); panel.add(win);
  g0.add(panel);
  const pad = new THREE.Group(); pad.position.set(W / 2 + 0.28, 1.3, 0.08);
  pad.add(new THREE.Mesh(cboxGeo(0.17, 0.26, 0.04, 0.006), plainMat(0x2a2c2a, { roughness: 0.5, metalness: 0.4 })));
  const keys = new THREE.Mesh(planeGeo(0.12, 0.15), labelMat('1 2 3   4 5 6   7 8 9   * 0 #', { bg: '#3a3c38', fg: '#b8b4a6', w: 128, h: 160, size: 18, font: 'monospace', weight: '700' }));
  keys.position.set(0, -0.04, 0.021); pad.add(keys);
  const lamps = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(sphereGeo(0.011, 10, 8), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x000000, emissiveIntensity: 1.6 })); l.position.set(-0.054 + i * 0.036, 0.095, 0.022); pad.add(l); lamps.push(l); }
  const ok = new THREE.Mesh(boxGeo(0.05, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0x3a0806 })); ok.position.set(0, 0.06, 0.022); pad.add(ok);
  g0.add(pad);
  return { panel, lamps, ok, W, ordKey: '' };
}
function updateKeypadDoor(D, state, g, i) {
  const p = D.parts;
  p.panel.position.x = D.open * (p.W + 0.02);
  const ord = g && g.ord && g.ord[i];
  if (ord && ord !== p.ordKey) { p.ordKey = ord; [...ord].forEach((k, j) => { const c = new THREE.Color(CODE_COLORS[+k]); p.lamps[j].material.color.copy(c).multiplyScalar(0.3); p.lamps[j].material.emissive.copy(c); }); }
  p.ok.material.color.setHex(state && state.o ? 0x3cff7a : 0x5a0a06);
}

// ---------- the numbers on the walls ----------
// Big numbers daubed in paint at about head height, each in its colour, on the nearest wall. In the dark you
// only find them with a light - which is the trouble.
const _digitTex = {};
function digitTex(d, slot) {
  const key = d + ':' + slot;
  if (_digitTex[key]) return _digitTex[key];
  const col = CODE_COLORS[slot];
  const t = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const r = mulberry32(slot * 31 + (+d) * 7 + 5);
    g.font = '900 210px "Big Shoulders Stencil Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = col; g.save(); g.translate(w / 2, h / 2 + 6); g.rotate((r() - 0.5) * 0.18); g.fillText(String(d), 0, 0); g.restore();
    // runs of paint from the bottom of the strokes
    for (let k = 0; k < 7; k++) { const x = 70 + r() * 116, y = 170 + r() * 30, l = 20 + r() * 60; g.fillStyle = col; g.fillRect(x, y, 3 + r() * 4, l); g.beginPath(); g.arc(x + 2.5, y + l, 3.5, 0, 6.28); g.fill(); }
    // and worn back to the wall in places
    g.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 900; k++) { g.fillStyle = 'rgba(0,0,0,' + r() * 0.7 + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 3); }
    g.globalCompositeOperation = 'source-over';
  });
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.userData.noShadow = true;
  _digitTex[key] = m;
  return m;
}
function buildDigits(L) {
  World.digits = [];
  for (const dg of L.digits) {
    const [wx, wz] = wallSide(L, dg.gx, dg.gz);
    const r = mulberry32(dg.gx * 131 + dg.gz * 17);
    const m = new THREE.Mesh(planeGeo(0.8, 0.8), digitTex(0, dg.slot));
    // on the wall face, facing back into the room
    m.position.set(dg.gx + 0.5 + wx * 0.495, 1.2 + r() * 0.5, dg.gz + 0.5 + wz * 0.495);
    m.rotation.y = Math.atan2(-wx, -wz);
    m.renderOrder = 2;
    World.areas[dg.area].group.add(m);
    World.digits.push({ mesh: m, dg, lock: L.locks.findIndex((l) => l.area === dg.area && l.type === 'N'), shown: -1 });
  }
}
function updateDigits(g) {
  if (!World.digits || !g || !g.codes) return;
  for (const D of World.digits) {
    const c = g.codes[D.lock]; if (!c) continue;
    const d = +c[D.dg.slot];
    if (D.shown !== d) { D.shown = d; D.mesh.material = digitTex(d, D.dg.slot); }
  }
}

// ---------- the keypad, up close ----------
function openKeypad(id) {
  const g = Game.g; if (!g || !g.ord || !g.ord[id]) return;
  Game.keypad = { id, entry: '' };
  const box = $('keypad'), slots = $('kp-slots');
  keypadTexts('Keypad', 'Type the four numbers in the order of the lamps', escHint('Step away'));
  slots.textContent = '';
  [...g.ord[id]].forEach((k) => { const s = document.createElement('span'); s.style.borderColor = CODE_COLORS[+k]; s.style.color = CODE_COLORS[+k]; s.title = CODE_NAMES[+k]; slots.appendChild(s); });
  box.hidden = false; box.classList.remove('wrong', 'right');
  renderKeypad();
  Sound.play('click');
}
function renderKeypad() {
  const K = Game.keypad; if (!K) return;
  [...$('kp-slots').children].forEach((s, i) => { s.textContent = K.entry[i] || ''; s.classList.toggle('on', i === K.entry.length); });
}
function keypadPress(k) {
  const K = Game.keypad; if (!K) return;
  if (k === 'C') K.entry = K.entry.slice(0, -1);
  else if (k === 'OK') {
    if (K.entry.length === 4 && K.access) { accessTry(K.entry); return; }
    if (K.entry.length === 4) { queueAction('code', K.id + ':' + K.entry); K.sent = performance.now(); }
  }
  else if (/^[0-9]$/.test(k) && K.entry.length < 4) { K.entry += k; $('keypad').classList.remove('wrong'); }
  Sound.play('beep');
  renderKeypad();
}
function keypadWrong() {
  const K = Game.keypad; if (!K) return;
  const box = $('keypad'); box.classList.remove('wrong'); void box.offsetWidth; box.classList.add('wrong');
  K.entry = ''; renderKeypad();
}
function closeKeypad() { Game.keypad = null; $('keypad').hidden = true; }
function keypadTexts(title, help, close) { setText($('kp-title'), title); setText($('kp-help'), help); setText($('kp-close'), close); }

// ---------- early access: the same keypad, in the menu, for the code that opens Seize - B5 early ----------
const EARLY_CODE = '6020';
function openAccessPad(want) {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  Game.keypad = { id: -1, access: true, entry: '', want };
  const box = $('keypad'), slots = $('kp-slots');
  keypadTexts('Early access', 'Enter your code to play Seize - B5 and Breach - A1 early', escHint('Cancel'));
  slots.textContent = '';
  for (let i = 0; i < 4; i++) { const s = document.createElement('span'); s.style.borderColor = '#e8a33a'; s.style.color = '#e8e4da'; slots.appendChild(s); }
  box.hidden = false; box.classList.remove('wrong', 'right');
  renderKeypad();
  Sound.play('click');
}
function accessTry(code) {
  if (code !== EARLY_CODE) { Sound.play('beep'); keypadWrong(); return; }
  $('keypad').classList.remove('wrong'); $('keypad').classList.add('right'); Sound.play('pickup');
  const want = Game.keypad && Game.keypad.want;
  Game.keypad = null;
  setTimeout(() => { $('keypad').hidden = true; unlockEarlyAccess(want); }, 650);
}
// the door opened (or you walked off, or died): put it away
function tickKeypad() {
  const K = Game.keypad; if (!K) return;
  const g = Game.g, me = Game.me, lock = Game.L.locks[K.id];
  if (!g || !me || me.dead || Game.mode !== 'play' || !lock) { closeKeypad(); return; }
  if (g.lk[K.id] && g.lk[K.id].o) { $('keypad').classList.remove('wrong'); $('keypad').classList.add('right'); setTimeout(closeKeypad, 450); Game.keypad = null; return; }
  if (dist2(me.x, me.z, lock.x, lock.z) > 3.2) closeKeypad();
}
function wireKeypad() {
  $('kp-keys').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) keypadPress(b.dataset.k); });
  $('kp-close').addEventListener('click', closeKeypad);
}
function keypadKey(e) {
  if (!Game.keypad) return false;
  if (/^Digit[0-9]$/.test(e.code) || /^Numpad[0-9]$/.test(e.code)) keypadPress(e.code.slice(-1));
  else if (e.code === 'Backspace' || e.code === 'Delete') keypadPress('C');
  else if (e.code === 'Enter' || e.code === 'NumpadEnter') keypadPress('OK');
  else if (e.code === 'Escape' || e.code === 'KeyE') closeKeypad();
  else return false;
  return true;
}

// ---------- the landing: the car you came down in ----------
SET_PIECES.landing = (L, B, a, ai, r) => { buildLiftCar(L, B); };

// ---------- the way down ----------
const INTRO_LINES = {
  l1: {
    coop: [['Command to recovery team. Power is out below level three.', 4], ['The freight lift is your only way in. And your only way out.', 4], ['Ten areas down to the lift shaft. Stay together.', 4], ['And if you hear it, do not make a sound.', 3.5]],
    solo: [['Command to recovery. You are the only one we could send.', 4], ['The freight lift is your only way in. And your only way out.', 4], ['Ten areas down to the lift shaft. Keep your light low.', 4], ['And if you hear it, do not make a sound.', 3.5]],
  },
  l2: {
    coop: [['Recovery team, you are past B-4. The car is still going down.', 4], ['B-5 was sealed in 1979. Nobody has been down there since.', 4], ['Something is still down there with you. It cannot hear you.', 4], ['Do not let it see your light.', 3.5]],
    solo: [['Recovery, you are past B-4. The car is still going down.', 4], ['B-5 was sealed in 1979. Nobody has been down there since.', 4], ['Something is still down there with you. It cannot hear you.', 4], ['Do not let it see your light.', 3.5]],
  },
  l3: {
    coop: [['Recovery team, your car is going up. Past B-1. Past where the shaft ends.', 4], ['Above you is A-1: the civil defence bunker. Sealed from the inside.', 4], ['The garrison went quiet decades ago. Something kept the hatch shut.', 4], ['If it looks at you, do not move.', 3.5]],
    solo: [['Recovery, your car is going up. Past B-1. Past where the shaft ends.', 4], ['Above you is A-1: the civil defence bunker. Sealed from the inside.', 4], ['The garrison went quiet decades ago. Something kept the hatch shut.', 4], ['If it looks at you, do not move.', 3.5]],
  },
};
// the floors the car passes on the way down, and what the dial reads
function liftFloorLabel(n) { return Game.levelKey === 'l3' ? ['A1', '', 'B5'][n] : Game.levelKey === 'l2' ? ['B5', '', 'B4'][n] : 'B' + (4 - n); }
function introFloorText(stopped, level) {
  if (Game.levelKey === 'l3') return stopped ? 'Stopped · A-1' : 'Ascending · ' + (level >= 4 ? 'A-1' : level >= 3 ? 'B-1' : 'B-5');
  return Game.levelKey === 'l2' ? (stopped ? 'Stopped · B-5' : 'Descending · ' + (level >= 4 ? 'B-5' : 'B-4')) : (stopped ? 'Stopped · ' : 'Descending · ') + 'B-' + level;
}
// the car goes down to B4 and B5, and up to A1
function liftGoesUp() { return Game.levelKey === 'l3'; }

// ---------- whichever of them this level has ----------
// B5 has the Chud; A1 has the Pale. Both are beasts (45-beast.js) with a kill of their own; this is how the
// rest of the game asks about whichever one is here without caring which.
function levelHasBeast(lv) { return lv === 'l2' || lv === 'l3'; }
function beastKillLen(kl) { return kl && kl.c === 2 ? PALE_KILL : CHUD_KILL; }
function beastKillBody(kl, T) { return kl && kl.c === 2 ? paleKillBody(kl, T) : chudKillBody(kl, T); }
function beastKillCam(kl, T, dt, t) { if (kl.c === 2) paleKillCam(T, dt, t); else chudKillCam(T, dt, t); }
function updateBeastClient(dt, t) { if (Game.g.lv === 'l3') updatePaleClient(dt, t); else updateChudClient(dt, t); }
function updateBeastKill(dt) { if (Game.g.lv === 'l3') updatePaleKill(dt); else updateChudKill(dt); }
function beastThreat() { return Game.g && Game.g.lv === 'l3' ? paleThreat() : chudThreat(); }

