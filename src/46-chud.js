// ================= The Chud: the thing on Seize - B5 =================
// A vast grey body of fat on short legs, a tiny head sunk into its shoulders. It can't hear a thing; it sees
// light. The body is one smooth surface: a few dozen soft shapes (ellipsoids and tapered capsules) blended into
// each other as a signed distance field, with the folds of fat cut back into it, meshed on a grid (surface
// nets), then rigged to a skeleton by which shape each piece of skin came from. Built once, the first time it
// is needed.

// ---------- the skeleton, at rest (model space, metres; it faces +z) ----------
const CHUD_BONES = [
  ['hips', null, [0, 1.0, 0]],
  ['spine', 'hips', [0, 1.34, -0.03]],
  ['chest', 'spine', [0, 1.76, -0.02]],
  ['neck', 'chest', [0, 2.1, 0.04]],
  ['head', 'neck', [0, 2.27, 0.13]],
  ['jaw', 'head', [0, 2.31, 0.19]],
  ['belly', 'hips', [0, 1.06, 0.36]],
  ['clavL', 'chest', [0.46, 2.04, -0.02]],
  ['armL', 'clavL', [0.84, 2.0, -0.02]],
  ['elbowL', 'armL', [1.15, 1.5, 0.02]],
  ['handL', 'elbowL', [1.4, 1.07, 0.09]],
  ['fingL', 'handL', [1.49, 0.92, 0.12]],
  ['thighL', 'hips', [0.38, 0.93, 0.0]],
  ['shinL', 'thighL', [0.4, 0.5, 0.04]],
  ['footL', 'shinL', [0.4, 0.11, 0.02]],
];
(() => {
  const n = CHUD_BONES.length;
  for (let i = 0; i < n; i++) {
    const [nm, par, p] = CHUD_BONES[i];
    if (!/L$/.test(nm)) continue;
    CHUD_BONES.push([nm.slice(0, -1) + 'R', par && /L$/.test(par) ? par.slice(0, -1) + 'R' : par, [-p[0], p[1], p[2]]]);
  }
})();
const CHUD_REST = {};
for (const [nm, , p] of CHUD_BONES) CHUD_REST[nm] = new THREE.Vector3(p[0], p[1], p[2]);

// ---------- the shapes ----------
// e: ellipsoid [cx,cy,cz, rx,ry,rz]; c: tapered capsule [ax,ay,az, bx,by,bz, ra,rb]. k: how softly it blends in.
// sub: cut away (a fold, a socket, the mouth). sym: mirrored onto the right side. tint: skin colour over it.
const SKIN = [0.5, 0.5, 0.48], PINK = [0.55, 0.48, 0.46], DUSK = [0.42, 0.42, 0.41], PALE = [0.55, 0.54, 0.52];
const CHUD_SHAPES = [
  // the trunk: pelvis, a belly that hangs, the apron of fat under it, love handles, a chest broader still, the back
  { e: [0, 1.0, -0.04, 0.64, 0.38, 0.46], bone: 'hips', k: 0.12 },
  { e: [0, 1.22, 0.06, 0.76, 0.58, 0.56], bone: 'spine', k: 0.14 },
  { e: [0, 1.0, 0.36, 0.66, 0.55, 0.48], bone: 'belly', k: 0.12, tint: PALE },
  { e: [0, 0.73, 0.43, 0.5, 0.24, 0.28], bone: 'belly', k: 0.1, tint: PALE },
  { e: [0.53, 1.12, -0.06, 0.32, 0.38, 0.4], bone: 'hips', k: 0.12, sym: true },
  { e: [0, 1.8, 0.0, 0.84, 0.53, 0.5], bone: 'chest', k: 0.14 },
  { e: [0.36, 1.5, 0.31, 0.29, 0.28, 0.18], bone: 'chest', k: 0.1, sym: true, tint: PALE },
  { e: [0, 1.5, -0.22, 0.68, 0.62, 0.38], bone: 'spine', k: 0.12 },
  // the hump of muscle across the shoulders, high and wide: the head sits down in it
  { e: [0, 2.12, -0.1, 0.88, 0.35, 0.45], bone: 'chest', k: 0.12 },
  { e: [0.44, 2.16, -0.05, 0.4, 0.23, 0.33], bone: 'chest', k: 0.1, sym: true },
  { c: [0, 2.06, 0.04, 0, 2.24, 0.12, 0.3, 0.22], bone: 'neck', k: 0.1 },
  // the head: small, low, pushed forward; a slab of brow, a flat nose, jowls and a chin that runs into the chest
  { e: [0, 2.38, 0.14, 0.16, 0.19, 0.18], bone: 'head', k: 0.06, tint: PINK },
  { e: [0, 2.34, 0.22, 0.14, 0.15, 0.12], bone: 'head', k: 0.05, tint: PINK },
  { e: [0, 2.415, 0.29, 0.145, 0.037, 0.056], bone: 'head', k: 0.03, tint: PINK },
  { e: [0, 2.345, 0.338, 0.037, 0.047, 0.037], bone: 'head', k: 0.025, tint: PINK },
  { e: [0.156, 2.36, 0.14, 0.022, 0.05, 0.036], bone: 'head', k: 0.02, sym: true, tint: PINK },
  { e: [0.1, 2.275, 0.23, 0.1, 0.1, 0.1], bone: 'jaw', k: 0.05, sym: true, tint: PINK },
  { e: [0, 2.24, 0.25, 0.12, 0.08, 0.11], bone: 'jaw', k: 0.05, tint: PINK },
  { e: [0, 2.2, 0.2, 0.23, 0.1, 0.17], bone: 'neck', k: 0.06 },
  // legs: short, enormous, the knees buried in fat; flat broad feet
  { c: [0.38, 0.97, 0.0, 0.4, 0.5, 0.04, 0.33, 0.24], bone: 'thighL', k: 0.1, sym: true },
  { e: [0.41, 0.52, 0.1, 0.22, 0.17, 0.19], bone: 'shinL', k: 0.07, sym: true },
  { c: [0.4, 0.5, 0.04, 0.4, 0.15, 0.02, 0.24, 0.17], bone: 'shinL', k: 0.07, sym: true },
  { e: [0.41, 0.36, -0.07, 0.19, 0.2, 0.17], bone: 'shinL', k: 0.06, sym: true },
  { e: [0.41, 0.08, 0.1, 0.17, 0.09, 0.24], bone: 'footL', k: 0.05, sym: true, tint: DUSK },
  { e: [0.41, 0.055, 0.29, 0.15, 0.055, 0.08], bone: 'footL', k: 0.03, sym: true, tint: DUSK },
  // arms: a shoulder like a boulder, fat hanging off the upper arm, a thick forearm, a mitt of a hand
  { e: [0.82, 1.98, -0.02, 0.31, 0.29, 0.31], bone: 'armL', k: 0.08, sym: true },
  { c: [0.84, 2.0, -0.02, 1.15, 1.5, 0.02, 0.27, 0.19], bone: 'armL', k: 0.06, sym: true },
  { e: [0.99, 1.7, -0.01, 0.23, 0.27, 0.23], bone: 'armL', k: 0.06, sym: true },
  { c: [1.15, 1.5, 0.02, 1.4, 1.07, 0.09, 0.19, 0.14], bone: 'elbowL', k: 0.05, sym: true },
  { c: [1.4, 1.07, 0.09, 1.48, 0.93, 0.12, 0.125, 0.11], bone: 'handL', k: 0.04, sym: true, tint: DUSK },
  { c: [1.42, 1.02, 0.19, 1.45, 0.92, 0.27, 0.05, 0.042], bone: 'handL', k: 0.025, sym: true, tint: DUSK },
  // four fingers, fat and short
  ...[-1.5, -0.5, 0.5, 1.5].map((o) => ({ c: [1.49, 0.92, 0.12 + o * 0.056, 1.555 - Math.abs(o) * 0.008, 0.77 + Math.abs(o) * 0.022, 0.13 + o * 0.062, 0.046, 0.038], bone: 'fingL', k: 0.018, sym: true, tint: DUSK })),
  // it is not symmetrical: a lump of fat high on one side of the back, the other flank sagging lower, a bulge
  // to one side of the belly
  { e: [0.3, 1.92, -0.4, 0.28, 0.22, 0.18], bone: 'chest', k: 0.1 },
  { e: [-0.46, 0.98, 0.18, 0.3, 0.3, 0.3], bone: 'hips', k: 0.12, tint: PALE },
  { e: [0.22, 1.2, 0.56, 0.26, 0.2, 0.15], bone: 'belly', k: 0.1, tint: PALE },
  { e: [-0.62, 1.86, 0.12, 0.22, 0.2, 0.2], bone: 'chest', k: 0.1 },
  // ---- cut back in ----
  { e: [0.062, 2.388, 0.322, 0.043, 0.031, 0.04], bone: 'head', k: 0.02, sym: true, sub: true },
  { e: [0, 2.276, 0.34, 0.074, 0.013, 0.06], bone: 'jaw', k: 0.014, sub: true },
  { e: [0, 0.52, 0.42, 0.5, 0.035, 0.3], bone: 'belly', k: 0.04, sub: true },
  { e: [0, 1.0, 0.84, 0.028, 0.04, 0.035], bone: 'belly', k: 0.02, sub: true },
  { e: [0.74, 1.32, -0.06, 0.08, 0.02, 0.34], bone: 'hips', k: 0.03, sub: true, sym: true },
  { e: [0.41, 0.47, 0.17, 0.2, 0.016, 0.1], bone: 'shinL', k: 0.025, sub: true, sym: true },
  { e: [1.4, 1.08, 0.09, 0.14, 0.015, 0.14], bone: 'handL', k: 0.02, sub: true, sym: true },
  { e: [0, 1.3, -0.6, 0.4, 0.035, 0.16], bone: 'spine', k: 0.06, sub: true },
  { e: [0, 2.24, -0.25, 0.34, 0.02, 0.13], bone: 'neck', k: 0.025, sub: true },
  { e: [0.54, 1.03, 0.22, 0.2, 0.018, 0.16], bone: 'hips', k: 0.03, sub: true, sym: true },
];

// ---------- distance field ----------
function chudPrims() {
  const out = [];
  for (const s of CHUD_SHAPES) {
    const add = (mirror) => {
      const m = (v, i) => (mirror && i % 3 === 0 && (s.e ? i < 3 : i < 6) ? -v : v);
      const bone = mirror ? s.bone.replace(/L$/, 'R') : s.bone;
      const p = { kind: s.e ? 0 : 1, a: (s.e || s.c).map(m), bone, k: s.k, sub: !!s.sub, tint: s.tint || SKIN };
      // bounds, padded by the blend
      const pad = s.k + 0.02;
      if (p.kind === 0) { const [cx, cy, cz, rx, ry, rz] = p.a; p.lo = [cx - rx - pad, cy - ry - pad, cz - rz - pad]; p.hi = [cx + rx + pad, cy + ry + pad, cz + rz + pad]; }
      else { const [ax, ay, az, bx, by, bz, ra, rb] = p.a, r = Math.max(ra, rb) + pad; p.lo = [Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.min(az, bz) - r]; p.hi = [Math.max(ax, bx) + r, Math.max(ay, by) + r, Math.max(az, bz) + r]; }
      out.push(p);
    };
    add(false);
    if (s.sym) add(true);
  }
  return out;
}
function primDist(p, x, y, z) {
  const a = p.a;
  if (p.kind === 0) {
    const X = (x - a[0]) / a[3], Y = (y - a[1]) / a[4], Z = (z - a[2]) / a[5];
    const k0 = Math.sqrt(X * X + Y * Y + Z * Z);
    const X2 = X / a[3], Y2 = Y / a[4], Z2 = Z / a[5];
    const k1 = Math.sqrt(X2 * X2 + Y2 * Y2 + Z2 * Z2);
    return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(a[3], a[4], a[5]);
  }
  const pax = x - a[0], pay = y - a[1], paz = z - a[2], bax = a[3] - a[0], bay = a[4] - a[1], baz = a[5] - a[2];
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (a[6] + (a[7] - a[6]) * h);
}
const sminP = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function chudField(prims, list, x, y, z) {
  let d = 1e3;
  for (let i = 0; i < list.length; i++) { const p = prims[list[i]]; if (!p.sub) d = sminP(d, primDist(p, x, y, z), p.k); }
  for (let i = 0; i < list.length; i++) { const p = prims[list[i]]; if (p.sub) d = -sminP(-d, primDist(p, x, y, z), p.k); }
  return d;
}

// ---------- building it ----------
const CHUD_GRID = { lo: [-1.7, -0.03, -0.78], hi: [1.7, 2.72, 0.98], h: 0.03, B: 6 };
const Chud = {
  ready: false, root: null, mesh: null, bones: {}, mats: null, events: [],
  // where it is and what it is doing (set every frame by whoever drives it)
  x: 0, z: 0, y: 0, yaw: 0, speed: 0, mode: 'idle', look: null,
  phase: 0, plantedL: true, plantedR: true, belly: 0, bellyV: 0, bob: 0, jaw: 0, gruntT: 0, breath: 0, reach: 0, turnHead: 0,
  feet: { L: new THREE.Vector3(), R: new THREE.Vector3() },
};
// Building it takes most of a second, so it can be spread over frames: chudBuildStep(ms) does a slice at a time.
function buildChud(scene) {
  if (Chud.ready) return Chud;
  const it = Chud.job || chudBuildJob(scene);
  while (!it.next().done) { /* all at once */ }
  Chud.job = null;
  return Chud;
}
function chudBuildStep(budgetMs, scene) {
  if (Chud.ready) return true;
  if (!Chud.job) Chud.job = chudBuildJob(scene);
  const end = performance.now() + budgetMs;
  while (performance.now() < end) if (Chud.job.next().done) { Chud.job = null; return true; }
  return false;
}
function* chudBuildJob(scene) {
  const t0 = performance.now();
  let work = 0;
  const prims = chudPrims();
  const G = CHUD_GRID, h = G.h;
  const nx = Math.ceil((G.hi[0] - G.lo[0]) / h) + 1, ny = Math.ceil((G.hi[1] - G.lo[1]) / h) + 1, nz = Math.ceil((G.hi[2] - G.lo[2]) / h) + 1;
  // which shapes matter where: blocks of B^3 samples, each with the list of shapes whose bounds reach it
  const B = G.B, bx = Math.ceil(nx / B), by = Math.ceil(ny / B), bz = Math.ceil(nz / B);
  const blocks = new Array(bx * by * bz);
  for (let k = 0; k < bz; k++) for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    const lo = [G.lo[0] + i * B * h, G.lo[1] + j * B * h, G.lo[2] + k * B * h], hi = [lo[0] + B * h, lo[1] + B * h, lo[2] + B * h];
    const list = [];
    prims.forEach((p, pi) => { if (p.hi[0] >= lo[0] && p.lo[0] <= hi[0] && p.hi[1] >= lo[1] && p.lo[1] <= hi[1] && p.hi[2] >= lo[2] && p.lo[2] <= hi[2]) list.push(pi); });
    blocks[(k * by + j) * bx + i] = list;
  }
  const listAt = (x, y, z) => {
    const i = clamp(Math.floor((x - G.lo[0]) / (B * h)), 0, bx - 1), j = clamp(Math.floor((y - G.lo[1]) / (B * h)), 0, by - 1), k = clamp(Math.floor((z - G.lo[2]) / (B * h)), 0, bz - 1);
    return blocks[(k * by + j) * bx + i];
  };
  const field = (x, y, z) => { const l = listAt(x, y, z); return l.length ? chudField(prims, l, x, y, z) : 1; };
  yield;
  // sample the field: block by block, and only finely where the surface could be - a block whose middle is
  // further from the skin than its own size can't hold any of it, and takes that one value throughout
  const F = new Float32Array(nx * ny * nz), rad = Math.sqrt(3) * B * h * 0.5 + 0.07;
  for (let bk = 0; bk < bz; bk++) for (let bj = 0; bj < by; bj++) for (let bi = 0; bi < bx; bi++) {
    const l = blocks[(bk * by + bj) * bx + bi];
    const i0 = bi * B, j0 = bj * B, k0 = bk * B, i1 = Math.min(nx, i0 + B), j1 = Math.min(ny, j0 + B), k1 = Math.min(nz, k0 + B);
    let fill = 1;
    if (l.length) {
      const dc = chudField(prims, l, G.lo[0] + (i0 + B / 2) * h, G.lo[1] + (j0 + B / 2) * h, G.lo[2] + (k0 + B / 2) * h);
      fill = Math.abs(dc) > rad ? dc : NaN;
    }
    for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      F[(k * ny + j) * nx + i] = Number.isNaN(fill) ? chudField(prims, l, G.lo[0] + i * h, G.lo[1] + j * h, G.lo[2] + k * h) : fill;
    }
    if (Number.isNaN(fill) && ++work % 6 === 0) yield;
  }
  yield;
  // surface nets: one vertex per cell the surface passes through, quads across every edge it crosses
  const cellV = new Int32Array(nx * ny * nz).fill(-1);
  const P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8), cp = [];
  for (let c = 0; c < 8; c++) cp.push([c & 1, (c >> 1) & 1, (c >> 2) & 1]);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (i === 0 && j === 0 && k % 8 === 7) yield;
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = F[((k + cp[c][2]) * ny + j + cp[c][1]) * nx + i + cp[c][0]]; cv[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += cp[a][0] + (cp[b][0] - cp[a][0]) * t; sy += cp[a][1] + (cp[b][1] - cp[a][1]) * t; sz += cp[a][2] + (cp[b][2] - cp[a][2]) * t; n++;
    }
    cellV[(k * ny + j) * nx + i] = P.length / 3;
    P.push(G.lo[0] + (i + sx / n) * h, G.lo[1] + (j + sy / n) * h, G.lo[2] + (k + sz / n) * h);
  }
  yield;
  const idx = [];
  const V = (i, j, k) => cellV[(k * ny + j) * nx + i];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    if (i === 1 && j === 1 && k % 8 === 7) yield;
    const v0 = F[(k * ny + j) * nx + i], in0 = v0 < 0;
    // edge along x to (i+1, j, k): the four cells around it share it
    if (i < nx - 1 && in0 !== (F[(k * ny + j) * nx + i + 1] < 0)) {
      const a = V(i, j - 1, k - 1), b = V(i, j, k - 1), c = V(i, j, k), d = V(i, j - 1, k);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (in0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c); }
    }
    if (j < ny - 1 && in0 !== (F[(k * ny + j + 1) * nx + i] < 0)) {
      const a = V(i - 1, j, k - 1), b = V(i - 1, j, k), c = V(i, j, k), d = V(i, j, k - 1);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (in0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c); }
    }
    if (k < nz - 1 && in0 !== (F[((k + 1) * ny + j) * nx + i] < 0)) {
      const a = V(i - 1, j - 1, k), b = V(i, j - 1, k), c = V(i, j, k), d = V(i - 1, j, k);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (in0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c); }
    }
  }
  // pull every vertex onto the true surface, and take its normal from the field
  const nv = P.length / 3, N = new Float32Array(nv * 3), e = 0.004;
  yield;
  for (let v = 0; v < nv; v++) {
    if (v % 600 === 599) yield;
    let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    let gx = 0, gy = 0, gz = 0;
    for (let it = 0; it < 2; it++) {
      // four samples on a tetrahedron give the slope, and their mean the distance
      const a = field(x + e, y - e, z - e), b = field(x - e, y - e, z + e), c = field(x - e, y + e, z - e), dd = field(x + e, y + e, z + e);
      gx = a - b - c + dd; gy = -a - b + c + dd; gz = -a + b - c + dd;
      const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      gx /= gl; gy /= gl; gz /= gl;
      const d = (a + b + c + dd) * 0.25;
      if (Math.abs(d) < h) { x -= d * gx; y -= d * gy; z -= d * gz; }
    }
    P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z;
    N[v * 3] = gx; N[v * 3 + 1] = gy; N[v * 3 + 2] = gz;
  }
  // skin weights by which shapes the skin came from; colour from their tints; darkness in the folds
  const boneIndex = {}; CHUD_BONES.forEach(([nm], i) => { boneIndex[nm] = i; });
  const SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4), COL = new Float32Array(nv * 3), AO = new Float32Array(nv);
  const lam = 0.045, acc = new Float32Array(CHUD_BONES.length);
  for (let v = 0; v < nv; v++) {
    if (v % 700 === 699) yield;
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const l = listAt(x, y, z);
    acc.fill(0);
    let cr = 0, cg = 0, cb = 0, ct = 0;
    for (const pi of l) {
      const p = prims[pi]; if (p.sub) continue;
      const w = Math.exp(-Math.max(0, primDist(p, x, y, z)) / lam);
      acc[boneIndex[p.bone]] += w;
      cr += p.tint[0] * w; cg += p.tint[1] * w; cb += p.tint[2] * w; ct += w;
    }
    const order = [...acc.keys()].sort((a, b) => acc[b] - acc[a]).slice(0, 4);
    let tot = 0; for (const o of order) tot += acc[o];
    order.forEach((o, q) => { SI[v * 4 + q] = o; SW[v * 4 + q] = tot > 0 ? acc[o] / tot : (q === 0 ? 1 : 0); });
    if (tot <= 0) SI[v * 4] = boneIndex.spine;
    // the folds: how shut in this bit of skin is by the rest of the body
    const nxv = N[v * 3], nyv = N[v * 3 + 1], nzv = N[v * 3 + 2];
    let occ = 0, sca = 1;
    for (let s = 1; s <= 4; s++) { const hh = 0.032 * s, d = field(x + nxv * hh, y + nyv * hh, z + nzv * hh); occ += (hh - d) * sca; sca *= 0.72; }
    const ao = clamp(1 - occ * 3.2, 0, 1);
    AO[v] = ao;
    const k = ct > 0 ? 1 / ct : 0, shade = lerp(0.3, 1, ao);
    // linear colour: the tints are in sRGB
    COL[v * 3] = Math.pow((ct ? cr * k : SKIN[0]) * shade, 2.2); COL[v * 3 + 1] = Math.pow((ct ? cg * k : SKIN[1]) * shade, 2.2); COL[v * 3 + 2] = Math.pow((ct ? cb * k : SKIN[2]) * shade * 1.02, 2.2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('rest', new THREE.BufferAttribute(new Float32Array(P), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(COL, 3));
  geo.setAttribute('aAO', new THREE.BufferAttribute(AO, 1));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  geo.setIndex(nv > 65535 ? new THREE.BufferAttribute(new Uint32Array(idx), 1) : new THREE.BufferAttribute(new Uint16Array(idx), 1));
  geo.computeBoundingSphere();
  // the rig
  const root = new THREE.Group(); root.name = 'chud';
  const bones = {}, list = [];
  for (const [nm, par] of CHUD_BONES) {
    const b = new THREE.Bone(); b.name = nm; bones[nm] = b; list.push(b);
    const p = CHUD_REST[nm], pp = par ? CHUD_REST[par] : new THREE.Vector3();
    b.position.set(p.x - pp.x, p.y - pp.y, p.z - pp.z);
    if (par) bones[par].add(b); else root.add(b);
  }
  const skinMat = chudSkinMat();
  const mesh = new THREE.SkinnedMesh(geo, skinMat);
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(list), new THREE.Matrix4());
  // eyes: small, wet, the colour of milk gone off; and a few teeth
  // small eyes, set deep: the colour of milk gone off, wet, a pinprick of pupil, one of them looking a little wrong
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x4a4842, roughness: 0.08, metalness: 0 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 10), eyeM);
    const rp = new THREE.Vector3(s * 0.062, 2.386, 0.296).sub(CHUD_REST.head);
    eye.position.copy(rp); bones.head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.2 }));
    pupil.position.set(rp.x + (s > 0 ? 0.006 : -0.001), rp.y - 0.002, rp.z + 0.015); bones.head.add(pupil);
  }
  const toothM = new THREE.MeshStandardMaterial({ color: 0x8a7a58, roughness: 0.4 });
  const gumM = new THREE.MeshStandardMaterial({ color: 0x3a1a18, roughness: 0.3 });
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), gumM); mouth.scale.set(0.066, 0.011, 0.05);
  mouth.position.copy(new THREE.Vector3(0, 2.276, 0.33).sub(CHUD_REST.jaw)); bones.jaw.add(mouth);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.016, up = i % 2 === 0;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.02 + (i % 3) * 0.004, 0.008), toothM);
    tooth.position.copy(new THREE.Vector3(x, 2.283, 0.372 - Math.abs(x) * 0.5).sub(up ? CHUD_REST.head : CHUD_REST.jaw));
    tooth.rotation.z = (i - 3) * 0.08;
    (up ? bones.head : bones.jaw).add(tooth);
  }
  Object.assign(Chud, { ready: true, root, mesh, bones, prims, verts: nv, tris: idx.length / 3, buildMs: performance.now() - t0 });
  root.visible = false;
  if (scene) scene.add(root);
}

// the skin: vertex colour and fold shadow, plus mottling, faint veins, and creases and pores worked into it in
// the shader from where each bit of skin sits on the body at rest - so it all moves with the skin
let _chudFlatN = null;
function chudSkinMat() {
  if (!_chudFlatN) { _chudFlatN = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, THREE.RGBAFormat); _chudFlatN.needsUpdate = true; }
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.6, metalness: 0, skinning: true, normalMap: _chudFlatN });
  m.normalScale = new THREE.Vector2(0, 0);
  m.userData.wAmt = new THREE.Vector3(0, 0, 0);
  m.onBeforeCompile = (sh) => {
    wsPatch(sh, m, (s) => {
      s.vertexShader = 'attribute vec3 rest;\nattribute float aAO;\nvarying vec3 vRest;\nvarying float vAO;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRest = rest; vAO = aAO;');
      s.fragmentShader = `varying vec3 vRest; varying float vAO;
float cH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cH(i), cH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(cH(i + vec3(0.0, 1.0, 0.0)), cH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(cH(i + vec3(0.0, 0.0, 1.0)), cH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(cH(i + vec3(0.0, 1.0, 1.0)), cH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
float cF(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * cN(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s / 0.875; }
float cF2(vec3 p) { return (cN(p) * 0.65 + cN(p * 2.07 + vec3(4.1, 1.3, 7.7)) * 0.35); }
` + s.fragmentShader.replace('#include <emissivemap_fragment>', `
  {
    // mottled grey, blotches gone yellow-grey, veins just under the surface
    float mt = cF(vRest * 2.6);
    diffuseColor.rgb *= 0.7 + 0.55 * mt;
    float bl = smoothstep(0.55, 0.72, cF(vRest * 1.4 + vec3(5.0, 1.0, 3.0)));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.95, 0.84, 0.68), bl * 0.75);
    float vn = 1.0 - smoothstep(0.0, 0.03, abs(cN(vRest * vec3(3.2, 6.5, 3.2) + vec3(3.0, 0.0, 7.0)) - 0.5));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.7, 0.76, 0.92), vn * 0.4);
    // creases that run round the body, and pores
    // folds running round the body and a slow lumpiness - nothing finer than the screen can carry
    float hgt = cF2(vRest * vec3(5.0, 15.0, 5.0)) * 0.6 + (1.0 - abs(cN(vRest * vec3(3.0, 7.0, 3.0)) * 2.0 - 1.0)) * 0.4;
    float far = smoothstep(4.0, 14.0, length(vViewPosition));
    vec2 dH = vec2(dFdx(hgt), dFdy(hgt)) * 0.03 * (1.0 - far * 0.7);
    vec3 sp = -vViewPosition, sxv = dFdx(sp), syv = dFdy(sp);
    vec3 r1 = cross(syv, normal), r2 = cross(normal, sxv);
    float det = dot(sxv, r1);
    normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));
    // greasy where it folds, dull where it stretches
    roughnessFactor = clamp(mix(0.34, 0.72, mt) - (1.0 - vAO) * 0.25, 0.18, 0.9);
  }
#include <emissivemap_fragment>`);
    });
  };
  m.customProgramCacheKey = () => 'chud-skin-1';
  return m;
}

// ---------- posing ----------
const _cq = new THREE.Quaternion(), _cq2 = new THREE.Quaternion(), _cm = new THREE.Matrix4(), _cm2 = new THREE.Matrix4();
const _cv1 = new THREE.Vector3(), _cv2 = new THREE.Vector3(), _cv3 = new THREE.Vector3(), _cv4 = new THREE.Vector3(), _cv5 = new THREE.Vector3();
const _ce = new THREE.Euler();
function setLocalEuler(b, x, y, z, order = 'XYZ') { _ce.set(x, y, z, order); b.quaternion.setFromEuler(_ce); }
// turn a bone (rest orientation = its parent's) so the rest direction `axis` points along world `dir`, with its
// rest `side` axis turned as near to world `pole` as it can be
function aimBone(b, axis, side, dir, pole) {
  _cv1.copy(axis).normalize(); _cv2.copy(side).addScaledVector(_cv1, -side.dot(_cv1)).normalize(); _cv3.crossVectors(_cv1, _cv2);
  _cm.makeBasis(_cv1, _cv2, _cv3);
  _cv1.copy(dir).normalize(); _cv2.copy(pole).addScaledVector(_cv1, -pole.dot(_cv1));
  if (_cv2.lengthSq() < 1e-8) _cv2.set(1, 0, 0).addScaledVector(_cv1, -_cv1.x);
  _cv2.normalize(); _cv3.crossVectors(_cv1, _cv2);
  _cm2.makeBasis(_cv1, _cv2, _cv3);
  _cm2.multiply(_cm.transpose());
  _cq.setFromRotationMatrix(_cm2);                       // the world rotation we want
  b.parent.getWorldQuaternion(_cq2).invert();
  b.quaternion.copy(_cq2.multiply(_cq));
}
// the rest offset from a bone to its child, in that bone's own (rest) frame
const restDir = (a, b) => new THREE.Vector3().subVectors(CHUD_REST[b], CHUD_REST[a]);
const CHUD_LEG = { L: { thigh: restDir('thighL', 'shinL'), shin: restDir('shinL', 'footL') }, R: { thigh: restDir('thighR', 'shinR'), shin: restDir('shinR', 'footR') } };
const _side = new THREE.Vector3(1, 0, 0), _fwd = new THREE.Vector3(0, 0, 1);

// Walk: short heavy steps, a lot of body moving over each one. A foot is planted 60% of the stride; the body
// drops onto it as it lands (that is the bang), rolls over it, and the fat follows a moment later.
const CHUD_STEP = 0.56;            // metres per step
function chudPose(dt, t) {
  const C = Chud; if (!C.ready) return;
  const b = C.bones, h = Math.min(dt, 0.05);
  C.root.position.set(C.x, C.y || 0, C.z);
  C.root.rotation.set(0, C.yaw, 0);
  const sp = C.speed, walking = sp > 0.08;
  // stride phase: one cycle is two steps
  C.walkK = damp(C.walkK || 0, walking ? 1 : 0, walking ? 3 : 2.2, dt);
  const wk = C.walkK;
  if (walking) C.phase = (C.phase + h * sp / (2 * CHUD_STEP)) % 1;
  else C.phase = damp(C.phase, C.phase < 0.25 ? 0 : C.phase < 0.75 ? 0.5 : 1, 2, dt) % 1;
  const ph = C.phase;
  // each foot: stance from its plant (0 for the left, 0.5 for the right) for 0.6 of the cycle, then the swing
  const footAt = (off) => {
    const p = (ph - off + 1) % 1, S = CHUD_STEP;
    if (p < 0.6) return { z: S * 0.5 - S * (p / 0.6), y: 0, stance: true, p };
    const q = (p - 0.6) / 0.4, e = q * q * (3 - 2 * q);
    return { z: -S * 0.5 + S * e, y: Math.sin(q * Math.PI) * 0.13, stance: false, p };
  };
  const fL = footAt(0), fR = footAt(0.5);
  // plants: the body comes down on that foot
  for (const [side, f, key] of [['L', fL, 'plantedL'], ['R', fR, 'plantedR']]) {
    if (f.stance && !C[key] && wk > 0.3) {
      const fx = side === 'L' ? 0.41 : -0.41;
      const wx = C.x + Math.cos(C.yaw) * fx + Math.sin(C.yaw) * f.z * wk, wz = C.z - Math.sin(C.yaw) * fx + Math.cos(C.yaw) * f.z * wk;
      C.events.push({ kind: 'step', x: wx, y: 0.05, z: wz, side, power: clamp(sp / 1.4, 0.6, 1.3) });
      C.bellyV -= 1.6 * wk; C.bob = -1;
    }
    C[key] = f.stance;
  }
  // body: drops onto the planted foot, sways over it, rolls the other way at the shoulders
  C.bob = damp(C.bob, 0, 5, dt);
  const sway = Math.sin(ph * Math.PI * 2) * 0.075 * wk, dip = (C.bob * 0.05 + (Math.cos(ph * Math.PI * 4) - 1) * 0.012) * wk;
  // breathing: slow, deep, through the mouth; heavier after walking
  C.breath += h * (0.32 + wk * 0.2 + (C.mode === 'hunt' ? 0.15 : 0));
  const br = Math.sin(C.breath * Math.PI * 2);
  // the belly on a spring
  C.bellyV += (-C.belly * 70 - C.bellyV * 5.5) * h; C.belly += C.bellyV * h;
  b.hips.position.set(sway * 0.6, CHUD_REST.hips.y + dip - 0.065 * wk, 0);
  setLocalEuler(b.hips, 0.04 * wk, Math.sin(ph * Math.PI * 2) * 0.07 * wk, -sway * 0.55);
  setLocalEuler(b.spine, 0.11 + 0.04 * wk + br * 0.012, -Math.sin(ph * Math.PI * 2) * 0.05 * wk, sway * 0.5);
  setLocalEuler(b.chest, 0.1 - br * 0.02, -Math.sin(ph * Math.PI * 2) * 0.05 * wk, sway * 0.5);
  b.chest.scale.set(1 + br * 0.012, 1 + br * 0.008, 1 + br * 0.018);
  b.belly.position.set(0, CHUD_REST.belly.y - CHUD_REST.hips.y + C.belly * 0.045, CHUD_REST.belly.z - CHUD_REST.hips.z + C.belly * 0.01 + br * 0.008);
  b.belly.scale.set(1 + br * 0.01, 1 - C.belly * 0.05, 1 + br * 0.02);
  // the head: sunk in, lagging the body, turning to whatever it is looking at
  chudHead(C, dt, t, wk, br);
  // arms: hung out over the belly, swinging a little against the legs; or reaching
  const swing = Math.sin(ph * Math.PI * 2) * 0.22 * wk, rk = C.reach || 0;
  for (const s of ['L', 'R']) {
    const m = s === 'L' ? 1 : -1, sw = s === 'L' ? -swing : swing;
    setLocalEuler(b['clav' + s], 0, 0, m * (-0.04 + br * 0.015));
    setLocalEuler(b['arm' + s], -sw * 0.8 - rk * 1.25, m * rk * 0.25, m * (-0.2 + rk * 0.05), 'XYZ');
    setLocalEuler(b['elbow' + s], -0.25 - Math.max(0, -sw) * 0.4 - rk * 0.35, 0, m * 0.08);
    setLocalEuler(b['hand' + s], -0.1 - rk * 0.3, 0, m * 0.12);
    const curl = C.grip !== undefined ? C.grip : 0.35 + 0.1 * Math.sin(t * 0.7 + m);
    setLocalEuler(b['fing' + s], 0, 0, -m * curl * 1.2);
  }
  // legs: two-bone IK to where the feet are, knees out and forward
  C.root.updateMatrixWorld(true);
  for (const [s, f] of [['L', fL], ['R', fR]]) {
    const m = s === 'L' ? 1 : -1;
    const thigh = b['thigh' + s], shin = b['shin' + s], foot = b['foot' + s];
    // where the ankle goes, in model space, then the world
    _cv4.set(m * 0.41, CHUD_REST.footL.y + f.y * wk, CHUD_REST.footL.z + f.z * wk);
    C.root.localToWorld(_cv4);
    thigh.getWorldPosition(_cv5);
    const L1 = CHUD_LEG[s].thigh.length(), L2 = CHUD_LEG[s].shin.length();
    const dir = _cv4.clone().sub(_cv5); let d = dir.length();
    d = clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3); dir.normalize();
    // the knee bends forward and a little out
    const pole = new THREE.Vector3(Math.sin(C.yaw) + Math.cos(C.yaw) * m * 0.35, 0, Math.cos(C.yaw) - Math.sin(C.yaw) * m * 0.35);
    const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const bendAxis = new THREE.Vector3().crossVectors(dir, pole).normalize();
    const kneeDir = dir.clone().applyAxisAngle(bendAxis, a);
    aimBone(thigh, CHUD_LEG[s].thigh, _fwd, kneeDir, pole);
    thigh.updateMatrixWorld(true);
    shin.getWorldPosition(_cv5);
    const shinDir = _cv4.clone().sub(_cv5).normalize();
    aimBone(shin, CHUD_LEG[s].shin, _fwd, shinDir, pole);
    shin.updateMatrixWorld(true);
    // the foot flat on the floor, rolling off its toes as it lifts
    shin.getWorldQuaternion(_cq2).invert();
    _ce.set(f.stance ? 0 : -Math.sin(((f.p - 0.6) / 0.4) * Math.PI) * 0.35 * wk, C.yaw, 0, 'YXZ');
    _cq.setFromEuler(_ce);
    foot.quaternion.copy(_cq2.multiply(_cq));
  }
}
function chudHead(C, dt, t, wk, br) {
  const b = C.bones;
  let yaw = 0, pitch = 0;
  if (C.look) {
    b.neck.parent.updateWorldMatrix(true, false);
    _cv1.set(C.look.x, C.look.y, C.look.z);
    b.chest.worldToLocal(_cv1);
    _cv1.sub(CHUD_REST.head).add(CHUD_REST.chest);
    yaw = clamp(Math.atan2(_cv1.x, _cv1.z), -1.1, 1.1);
    pitch = clamp(-Math.atan2(_cv1.y, Math.hypot(_cv1.x, _cv1.z)), -0.5, 0.45);
  } else {
    // nothing to look at: it rolls its head about, slow, as if listening (it can't)
    yaw = Math.sin(t * 0.21) * 0.35 + Math.sin(t * 0.53) * 0.12; pitch = 0.08 + Math.sin(t * 0.31) * 0.06;
  }
  C.hy = dampAngle(C.hy || 0, yaw, 2.2, dt); C.hp = damp(C.hp || 0, pitch, 2.2, dt);
  const bob = -C.bob * 0.06 * wk;
  setLocalEuler(b.neck, C.hp * 0.4 + bob - 0.12, C.hy * 0.35, 0, 'YXZ');
  setLocalEuler(b.head, C.hp * 0.6 - br * 0.02 - 0.1, C.hy * 0.65, 0.09 + Math.sin(t * 0.37) * 0.05, 'YXZ');
  // the jaw hangs a little open; it gapes when it grunts
  C.gruntT = Math.max(0, (C.gruntT || 0) - dt);
  const g = C.gruntT > 0 ? Math.sin(Math.min(1, (0.8 - C.gruntT) / 0.8) * Math.PI) : 0;
  C.jaw = damp(C.jaw, 0.08 + br * 0.03 + g * 0.38, 9, dt);
  setLocalEuler(b.jaw, C.jaw, 0, 0);
}
function chudGrunt() { Chud.gruntT = 0.8; }
function setChudVisible(v) { if (Chud.root) Chud.root.visible = v; }
