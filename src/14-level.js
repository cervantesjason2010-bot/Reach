// ================= level: parse maps, stitch areas, collision, sight, paths =================
const WALKABLE = new Set(['.', 's', 'S', 'z', '<', 'w', '=', ';', ':', '%', '@', 'M', 'c', 'k', 'f', 'n', 'h', 'L', '!', '*', 'F', 'G', 'u', 'v', 'U', 'W', '^', 'C', 'E', 'J', '1', '2', '3', '4', '&']);
const LOCK_CHARS = new Set(['B', 'K', 'P', 'V', 'H', 'Z', 'A', 'N']);
const BLOCK_PROPS = new Set(['t', '$', 'l', 'x', 'X', 'o', 'b', 'T', 'R', 'g', 'd', 'p', 'm', 'e', 'q', 'Q', 'Y']);
const TALL_PROPS = new Set(['$', 'l', 'X', 'R', 'd', 'm', 'e', 'p']);
const LOCK_NEEDS = {
  B: { kind: 'pry', item: 'crowbar', hold: 3.2, noise: 18, verb: 'Pry the boards' },
  K: { kind: 'card', item: 'keycard', hold: 0, noise: 5, verb: 'Swipe the keycard' },
  P: { kind: 'power', hold: 0, noise: 22, verb: 'Power door' },
  V: { kind: 'valves', hold: 0, noise: 10, verb: 'Valve door' },
  H: { kind: 'hack', hold: 0, noise: 12, verb: 'Blast door' },
  Z: { kind: 'lift', hold: 0, noise: 0, verb: 'Freight lift' },
  A: { kind: 'levers', hold: 0, noise: 16, verb: 'Bulkhead' },
  N: { kind: 'code', hold: 0, noise: 4, verb: 'Keypad' },
};

// Checks one map on its own: everything important must be reachable from where players enter.
function checkAreaRows(rows, index, count = 10) {
  const h = rows.length, w = rows[0].length, problems = [];
  if (rows.some((r) => r.length !== w)) return ['ragged rows'];
  const at = (x, z) => (x < 0 || z < 0 || x >= w || z >= h ? '#' : rows[z][x]);
  let start = null;
  for (let z = 0; z < h && !start; z++) for (let x = 0; x < w; x++) {
    if ((index === 0 && at(x, z) === '@') || (index > 0 && x === 0 && at(x, z) === '<')) { start = [x, z]; break; }
  }
  if (!start) return ['no entry'];
  const seen = new Uint8Array(w * h);
  const q = [start]; seen[start[1] * w + start[0]] = 1;
  const pass = (ch) => WALKABLE.has(ch) || LOCK_CHARS.has(ch);
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= w || nz >= h || seen[nz * w + nx] || !pass(at(nx, nz))) continue;
      seen[nz * w + nx] = 1; q.push([nx, nz]);
    }
  }
  const need = 'cfknFGuvMSQWCEJ1234&';
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const ch = at(x, z);
    const reachableNeighbour = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen[(z + dz) * w + (x + dx)] && z + dz >= 0 && z + dz < h && x + dx >= 0 && x + dx < w);
    if (need.includes(ch) && !seen[z * w + x] && !(ch === 'Q' && reachableNeighbour)) problems.push(ch + ' unreachable at ' + x + ',' + z);
    if (LOCK_CHARS.has(ch) && ch !== 'Z' && x === w - 1 && !seen[z * w + x]) problems.push('exit unreachable');
  }
  if (index < count - 1 && !rows.some((r) => LOCK_CHARS.has(r[w - 1])) && ![...rows[0]].some((c) => LOCK_CHARS.has(c))) problems.push('no exit');
  return problems;
}

function findInColumn(rows, x, test) {
  for (let z = 0; z < rows.length; z++) if (test(rows[z][x])) return z;
  return -1;
}

// Stitches the ten maps into one grid, joined by short stairwell corridors.
function assembleLevel(maps) {
  const placed = [];
  maps.forEach((m, i) => {
    const entryRow = i === 0 ? -1 : findInColumn(m.rows, 0, (c) => c === '<');
    const exitRow = i === maps.length - 1 ? -1 : findInColumn(m.rows, m.w - 1, (c) => LOCK_CHARS.has(c));
    // an area can also leave through its north wall: the way on then runs north and turns east
    const exitCol = i < maps.length - 1 && exitRow < 0 ? [...m.rows[0]].findIndex((c) => LOCK_CHARS.has(c)) : -1;
    let offX = 0, offZ = 0;
    if (i > 0) {
      const p = placed[i - 1];
      if (p.exitCol >= 0) {
        // the next area sits wholly north of this one, its west door facing the top of the corridor
        offX = p.offX + p.exitCol + 1 + 2 + NORTH_EXIT_EAST;
        offZ = p.offZ - m.h - 2;
      } else {
        offX = p.offX + p.w + CONNECTOR_LEN;
        offZ = p.offZ + p.exitRow - entryRow;
      }
    }
    placed.push(Object.assign({}, m, { entryRow, exitRow, exitCol, offX, offZ }));
  });
  const minZ = Math.min(...placed.map((p) => p.offZ)) - 2;
  const maxZ = Math.max(...placed.map((p) => p.offZ + p.h)) + 2;
  placed.forEach((p) => { p.offZ -= minZ; });
  const W = Math.max(...placed.map((p) => p.offX + p.w)) + 1;
  const H = maxZ - minZ;
  const N = W * H;
  const L = {
    W, H, areas: placed,
    ch: new Array(N).fill('#'),
    walk: new Uint8Array(N), cwalk: new Uint8Array(N), opaque: new Uint8Array(N).fill(1),
    area: new Int8Array(N).fill(-1), ceil: new Float32Array(N).fill(3), safe: new Int16Array(N),
    water: new Uint8Array(N), low: new Uint8Array(N), lockAt: new Int16Array(N).fill(-1),
    items: [], locks: [], devices: [], safes: [], lairs: [], spawns: [], lights: [], notes: [], props: [], connectors: [], stairs: [], digits: [], chudSpots: [],
  };
  const idx = (x, z) => z * W + x;
  L.idx = idx;
  placed.forEach((p, ai) => {
    for (const st of p.stairs || []) L.stairs.push({ area: ai, x0: p.offX + st.x, x1: p.offX + st.x + 1, zb: p.offZ + st.zBottom, zt: p.offZ + st.zTop, ze: p.offZ + st.zEnd, h: st.h });
    for (let z = 0; z < p.h; z++) for (let x = 0; x < p.w; x++) {
      const gx = p.offX + x, gz = p.offZ + z, i = idx(gx, gz), c = p.rows[z][x];
      L.ch[i] = c; L.area[i] = ai; L.ceil[i] = p.ceil;
      const walk = WALKABLE.has(c);
      L.walk[i] = walk ? 1 : 0;
      L.cwalk[i] = walk && c !== 's' && c !== 'S' && c !== '=' && c !== 'U' && c !== '^' ? 1 : 0; // too big for the crawlspaces now, and stairs are for people
      L.opaque[i] = c === '#' || LOCK_CHARS.has(c) || TALL_PROPS.has(c) || c === 'U' ? 1 : 0;
      if (c === 'w') L.water[i] = 1;
      if (c === '=') { L.low[i] = 1; L.ceil[i] = 1.45; }
      if (c === 'U') L.low[i] = 1;                     // under a rack: only crouched
      if (c === 'z' || c === 'Z' || (ai === 0 && c === '@')) L.ceil[i] = 3.2;
      const wx = gx + 0.5, wz = gz + 0.5;
      if (c === 'c') L.items.push({ id: 'crowbar', type: 'crowbar', area: ai, x: wx, z: wz });
      if (c === 'k') L.items.push({ id: 'key' + ai, type: 'keycard', area: ai, x: wx, z: wz });
      if (c === 'f') L.items.push({ id: 'fuse' + ai + '_' + L.items.filter((t) => t.type === 'fuse' && t.area === ai).length, type: 'fuse', area: ai, x: wx, z: wz });
      if (c === 'C') L.items.push({ id: 'cell' + ai, type: 'cell', area: ai, x: wx, z: wz });
      if (c === 'n') L.notes.push({ id: 'note' + ai, area: ai, x: wx, z: wz, text: p.note });
      if ('FGuvQWEJ'.includes(c)) L.devices.push({ id: c + ai + '_' + L.devices.filter((d) => d.area === ai && d.type === c).length, type: c, area: ai, x: wx, z: wz, gx, gz });
      if (c === 'M') L.lairs[ai] = { x: wx, z: wz };
      if (c >= '1' && c <= '4') L.digits.push({ area: ai, slot: +c - 1, x: wx, z: wz, gx, gz });
      if (c === '&') L.chudSpots[ai] = { x: wx, z: wz };
      if (c === '@') L.spawns.push({ x: wx, z: wz });
      if (c === 'L' || c === '!' || c === '*') L.lights.push({ x: wx, z: wz, type: c, area: ai, ceil: p.ceil });
      if (BLOCK_PROPS.has(c) || c === 'U') L.props.push({ c, area: ai, gx, gz });
    }
    // lock doors
    const lockCells = [];
    for (let z = 0; z < p.h; z++) for (let x = 0; x < p.w; x++) if (LOCK_CHARS.has(p.rows[z][x])) lockCells.push([p.offX + x, p.offZ + z, p.rows[z][x]]);
    if (lockCells.length) {
      const type = lockCells[0][2];
      const lock = Object.assign({ id: L.locks.length, area: ai, type, cells: lockCells.map(([x, z]) => ({ x, z })) }, LOCK_NEEDS[type]);
      lock.x = lockCells.reduce((s, c) => s + c[0] + 0.5, 0) / lockCells.length;
      lock.z = lockCells.reduce((s, c) => s + c[1] + 0.5, 0) / lockCells.length;
      for (const c of lock.cells) L.lockAt[idx(c.x, c.z)] = lock.id;
      L.locks.push(lock);
    }
  });
  // connectors: short three-wide stairwells between areas
  const corridor = (x, z, i, h = 3.0) => { const k = idx(x, z); L.ch[k] = '.'; L.walk[k] = 1; L.cwalk[k] = 1; L.opaque[k] = 0; L.area[k] = i; L.ceil[k] = h; };
  for (let i = 0; i < placed.length - 1; i++) {
    const p = placed[i], n = placed[i + 1];
    if (p.exitCol >= 0) {
      // north out of the shutter, then east to the next area's door. Out of a high hall the passage stays
      // high all the way to the next door, and the shutter itself is a tall roller door, not a man door.
      const cx = p.offX + p.exitCol + 1, zt = n.offZ + n.entryRow;
      const high = p.ceil >= 6, cc = high ? HIGH_PASSAGE_CEIL : 3.0;
      for (let z = zt - 1; z <= p.offZ - 1; z++) for (let x = cx - 1; x <= cx + 1; x++) corridor(x, z, i, cc);
      for (let x = cx + 2; x <= n.offX - 1; x++) for (let dz = -1; dz <= 1; dz++) corridor(x, zt + dz, i, cc);
      L.lights.push({ x: cx + 0.5, z: Math.floor((zt + p.offZ) / 2) + 0.5, type: '!', area: i, ceil: cc });
      L.connectors.push({ from: i, x0: cx - 1, x1: n.offX - 1, z: zt, north: { x: cx, z0: zt, z1: p.offZ - 1 }, ceil: cc });
      const shutter = L.locks.find((lk) => lk.area === i && lk.cells.every((c) => c.z === p.offZ));
      if (shutter && high) shutter.top = HIGH_SHUTTER_TOP;
      continue;
    }
    const z = p.offZ + p.exitRow;
    const x0 = p.offX + p.w, x1 = n.offX - 1;
    for (let x = x0; x <= x1; x++) for (let dz = -1; dz <= 1; dz++) corridor(x, z + dz, i);
    const mid = Math.floor((x0 + x1) / 2);
    L.lights.push({ x: mid + 0.5, z: z + 0.5, type: '!', area: i, ceil: 3.0 });
    L.connectors.push({ from: i, x0, x1, z, ceil: 3.0 });
  }
  // safe rooms: flood inward from each jammed door
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (L.ch[idx(x, z)] !== 'S') continue;
    let inside = null, outside = null;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = L.ch[idx(x + dx, z + dz)];
      if (c === 's') inside = [x + dx, z + dz];
    }
    if (!inside) continue;
    outside = [2 * x - inside[0], 2 * z - inside[1]];
    const id = L.safes.length + 1;
    const cells = [];
    const q = [inside]; L.safe[idx(inside[0], inside[1])] = id;
    for (let i = 0; i < q.length; i++) {
      const [cx, cz] = q[i]; cells.push({ x: cx, z: cz });
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz, k = idx(nx, nz);
        if (L.safe[k] || !L.walk[k] || L.ch[k] === 'S') continue;
        L.safe[k] = id; L.cwalk[k] = 0; q.push([nx, nz]);
      }
    }
    const cx = cells.reduce((s, c) => s + c.x + 0.5, 0) / cells.length;
    const cz = cells.reduce((s, c) => s + c.z + 0.5, 0) / cells.length;
    L.safes.push({ id, area: L.area[idx(x, z)], door: { x: x + 0.5, z: z + 0.5 }, dir: { x: inside[0] - x, z: inside[1] - z },
      outside: { x: outside[0] + 0.5, z: outside[1] + 0.5 }, cells, center: { x: cx, z: cz } });
  }
  prepLairs(L);
  return L;
}

// ---------- lairs: a real hole in the wall, and the tunnel behind it ----------
// Where the creature comes out, the wall is broken through into a short tunnel running back into the rock:
// up to three cells wide, two to five deep, every cell of it solid stone on the map and sealed on every side
// but the hole - so nothing of it can be seen, or reached, from anywhere else. The tunnel is open to the
// creature (it lives in there) and to nothing else.
function prepLairs(L) {
  L.lairInfo = []; L.tunnel = new Map();
  const solid = (x, z) => !inGrid(L, x, z) || ((L.ch[z * L.W + x] === '#' || L.ch[z * L.W + x] === 'I') && !L.tunnel.has(z * L.W + x));
  L.lairs.forEach((lair, ai) => {
    if (!lair) return;
    const gx = Math.floor(lair.x), gz = Math.floor(lair.z);
    let best = null;
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!solid(gx + sx, gz + sz)) continue;
      const tx = sz !== 0 ? 1 : 0, tz = sx !== 0 ? 1 : 0;
      const holeOK = (o) => { const rx = gx + tx * o, rz = gz + tz * o; return inGrid(L, rx, rz) && L.walk[rz * L.W + rx] && L.lockAt[rz * L.W + rx] < 0 && !L.safe[rz * L.W + rx] && solid(rx + sx, rz + sz); };
      if (!holeOK(0)) continue;
      const o0 = holeOK(-1) ? -1 : 0, o1 = holeOK(1) ? 1 : 0;
      // as deep as it stays sealed: every cell solid, solid either side of it, and solid behind the end
      const rowSolid = (d, a, b) => { for (let o = a; o <= b; o++) if (!solid(gx + tx * o + sx * d, gz + tz * o + sz * d)) return false; return true; };
      let D = 0;
      const inside = (d) => { for (let o = o0; o <= o1; o++) if (!inGrid(L, gx + tx * o + sx * d, gz + tz * o + sz * d)) return false; return true; };
      for (let d = 1; d <= 5; d++) {
        if (!inside(d) || !rowSolid(d, o0 - 1, o1 + 1) || !rowSolid(d + 1, o0 - 1, o1 + 1)) break;
        D = d;
      }
      if (D >= 2 && (!best || D * (o1 - o0 + 1) > best.D * (best.o1 - best.o0 + 1))) best = { sx, sz, tx, tz, o0, o1, D };
    }
    if (!best) return;
    const { sx, sz, tx, tz, o0, o1, D } = best;
    const ceil = L.ceil[gz * L.W + gx];
    const top = Math.min(2.45, ceil - 0.35);
    // the plane of the wall face, the middle of the hole on it, and which way is out
    const mid = (o0 + o1) / 2;
    const info = { ai, gx, gz, sx, sz, tx, tz, o0, o1, D, top, nx: -sx, nz: -sz,
      cx: gx + 0.5 + sx * 0.5 + tx * mid, cz: gz + 0.5 + sz * 0.5 + tz * mid, w: o1 - o0 + 1, cells: [] };
    for (let d = 1; d <= D; d++) for (let o = o0; o <= o1; o++) {
      const x = gx + tx * o + sx * d, z = gz + tz * o + sz * d, k = z * L.W + x;
      L.tunnel.set(k, { ai, d, o });
      L.cwalk[k] = 1; L.ceil[k] = top; L.area[k] = ai;
      info.cells.push({ x, z, d, o });
    }
    L.lairInfo[ai] = info;
  });
}

// ---------- queries ----------
function cellOf(L, x, z) { return { x: Math.floor(x), z: Math.floor(z) }; }
function inGrid(L, gx, gz) { return gx >= 0 && gz >= 0 && gx < L.W && gz < L.H; }
function walkableCell(L, gx, gz, forCreature, openLocks) {
  if (!inGrid(L, gx, gz)) return false;
  const k = gz * L.W + gx;
  const lock = L.lockAt[k];
  if (lock >= 0) return !!(openLocks && openLocks[lock]);
  return forCreature ? !!L.cwalk[k] : !!L.walk[k];
}
// How high the floor is here: zero everywhere but on a stair, which climbs from its foot to its landing.
function floorY(L, x, z) {
  for (const s of L.stairs || []) if (x >= s.x0 && x <= s.x1 && z <= s.zb && z >= s.ze - 0.4) return s.h * clamp((s.zb - z) / (s.zb - s.zt), 0, 1);
  return 0;
}
function areaAt(L, x, z) {
  const gx = Math.floor(x), gz = Math.floor(z);
  return inGrid(L, gx, gz) ? L.area[gz * L.W + gx] : -1;
}
function safeAt(L, x, z) {
  const gx = Math.floor(x), gz = Math.floor(z);
  return inGrid(L, gx, gz) ? L.safe[gz * L.W + gx] : 0;
}
function cellFlag(L, arr, x, z) {
  const gx = Math.floor(x), gz = Math.floor(z);
  return inGrid(L, gx, gz) ? arr[gz * L.W + gx] : 0;
}

// small things standing in walkable cells (chairs, bollards, hanging bags): round colliders that stop people, not the creature
function addCollider(L, x, z, r) {
  if (!L.cols) L.cols = new Map();
  const c = { x, z, r };
  for (let gz = Math.floor(z - r); gz <= Math.floor(z + r); gz++) for (let gx = Math.floor(x - r); gx <= Math.floor(x + r); gx++) {
    const k = gz * L.W + gx;
    if (!L.cols.has(k)) L.cols.set(k, []);
    L.cols.get(k).push(c);
  }
}
function collides(L, x, z, r, forCreature, openLocks) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
  for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
    if (!forCreature && L.cols) {
      const list = L.cols.get(gz * L.W + gx);
      if (list) for (const c of list) { const dx = x - c.x, dz = z - c.z, rr = r + c.r; if (dx * dx + dz * dz < rr * rr) return true; }
    }
    if (walkableCell(L, gx, gz, forCreature, openLocks)) continue;
    const cx = clamp(x, gx, gx + 1), cz = clamp(z, gz, gz + 1);
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}
function moveWithCollision(L, pos, dx, dz, r, forCreature, openLocks) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (r * 0.7)));
  for (let i = 0; i < n; i++) {
    if (!collides(L, pos.x + dx / n, pos.z, r, forCreature, openLocks)) pos.x += dx / n;
    if (!collides(L, pos.x, pos.z + dz / n, r, forCreature, openLocks)) pos.z += dz / n;
  }
}

// Sight: walls, closed doors and tall props block it; glass and bars do not.
function lineOfSight(L, ax, az, bx, bz, openLocks) {
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
  const steps = Math.ceil(d / 0.25);
  for (let i = 1; i < steps; i++) {
    const t = i / steps, gx = Math.floor(ax + dx * t), gz = Math.floor(az + dz * t);
    if (!inGrid(L, gx, gz)) return false;
    const k = gz * L.W + gx;
    const lock = L.lockAt[k];
    if (lock >= 0) { if (!(openLocks && openLocks[lock])) return false; continue; }
    if (L.opaque[k]) return false;
  }
  return true;
}
function lineWalkable(L, ax, az, bx, bz, openLocks) {
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
  const steps = Math.ceil(d / 0.3);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, x = ax + dx * t, z = az + dz * t;
    if (collides(L, x, z, CREATURE_R * 0.9, true, openLocks)) return false;
  }
  return true;
}


class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop(), n = k.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

// A* over the grid for the creature, with corner-cutting blocked. Returns world waypoints.
function findPath(L, sx, sz, tx, tz, openLocks, maxNodes = 6000) {
  const W = L.W;
  const s = Math.floor(sz) * W + Math.floor(sx), t = Math.floor(tz) * W + Math.floor(tx);
  if (s === t) return [{ x: tx, z: tz }];
  const ok = (gx, gz) => walkableCell(L, gx, gz, true, openLocks);
  if (!ok(Math.floor(tx), Math.floor(tz))) return null;
  const g = new Map(), came = new Map();
  const heap = new MinHeap();
  heap.push(0, s);
  g.set(s, 0);
  const tgx = t % W, tgz = (t / W) | 0;
  const hfn = (k) => { const x = k % W, z = (k / W) | 0; const ax = Math.abs(x - tgx), az = Math.abs(z - tgz); return Math.max(ax, az) + 0.414 * Math.min(ax, az); };
  const closed = new Set();
  let expanded = 0;
  while (heap.size && expanded < maxNodes) {
    const cur = heap.pop();
    if (closed.has(cur)) continue;
    if (cur === t) break;
    closed.add(cur); expanded++;
    const cx = cur % W, cz = (cur / W) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz;
      if (!ok(nx, nz)) continue;
      if (dx && dz && (!ok(cx + dx, cz) || !ok(cx, cz + dz))) continue;
      const nk = nz * W + nx;
      const cost = g.get(cur) + (dx && dz ? 1.414 : 1);
      if (cost < (g.has(nk) ? g.get(nk) : Infinity)) {
        g.set(nk, cost); came.set(nk, cur);
        heap.push(cost + hfn(nk), nk);
      }
    }
  }
  if (!came.has(t)) return null;
  const cells = [];
  for (let k = t; k !== s; k = came.get(k)) cells.push(k);
  cells.reverse();
  const pts = cells.map((k) => ({ x: (k % W) + 0.5, z: ((k / W) | 0) + 0.5 }));
  pts[pts.length - 1] = { x: tx, z: tz };
  // string-pull so it moves in straight lines where it can
  const out = [];
  let from = { x: sx, z: sz }, i = 0;
  while (i < pts.length) {
    let j = Math.min(pts.length - 1, i + 14);
    while (j > i && !lineWalkable(L, from.x, from.z, pts[j].x, pts[j].z, openLocks)) j--;
    out.push(pts[j]); from = pts[j]; i = j + 1;
  }
  return out;
}
