// ================= beasts: bodies grown from soft shapes, meshed once and rigged =================
// The Chud on B5, the Pale on A1 and the hand that comes down out of the sky are all built the same way. A
// few dozen soft shapes (ellipsoids, some turned, and tapered capsules) are blended into each other as a
// signed distance field, with folds, sockets and the mouth cut back into it. That one smooth surface is
// meshed on a grid (surface nets) and rigged to a skeleton by which shapes each piece of skin came from.
// The face, the hands and the feet are meshed again on finer grids of their own - the parts you see up close
// keep their detail - and drawn just in front of the coarse body where the two overlap, so there is no seam.
// Built once, the first time it is needed, a slice at a time.

// ---------- the skeleton ----------
// bones: [name, parent, [x, y, z]] at rest in model space (metres, facing +z). Anything ending in L is mirrored
// onto an R twin on the other side.
function beastBones(list) {
  const out = list.slice();
  for (const [nm, par, p] of list) {
    if (!/L$/.test(nm)) continue;
    out.push([nm.slice(0, -1) + 'R', par && /L$/.test(par) ? par.slice(0, -1) + 'R' : par, [-p[0], p[1], p[2]]]);
  }
  return out;
}

// ---------- the shapes ----------
// e: ellipsoid [cx,cy,cz, rx,ry,rz] (rot: [x,y,z] euler turns it); c: tapered capsule [ax,ay,az, bx,by,bz, ra,rb].
// k: how softly it blends in. sub: cut away. sym: mirrored onto the right. tint: skin colour (sRGB) over it;
// on a cut, the colour of what the cut opens onto. wet: how glossy the skin is there.
function beastPrims(def) {
  const out = [], M = new THREE.Matrix4(), E = new THREE.Euler();
  for (const s of def.shapes) {
    const add = (mirror) => {
      const raw = (s.e || s.c).slice();
      if (mirror) { raw[0] = -raw[0]; if (s.c) raw[3] = -raw[3]; }
      const bone = mirror ? s.bone.replace(/L$/, 'R') : s.bone;
      const p = { kind: s.e ? 0 : 1, a: raw, bone, k: s.k, sub: !!s.sub, tint: s.tint || null, wet: s.wet || 0, m: null };
      if (s.e && s.rot) {
        // the inverse of its turn, to bring a point into the ellipsoid's own frame
        E.set(s.rot[0], mirror ? -s.rot[1] : s.rot[1], mirror ? -s.rot[2] : s.rot[2]); M.makeRotationFromEuler(E).transpose();
        const el = M.elements; p.m = [el[0], el[4], el[8], el[1], el[5], el[9], el[2], el[6], el[10]];
      }
      const pad = s.k + 0.02;
      if (p.kind === 0) {
        const [cx, cy, cz, rx, ry, rz] = raw, r = p.m ? Math.max(rx, ry, rz) : 0;
        const ex = (p.m ? r : rx) + pad, ey = (p.m ? r : ry) + pad, ez = (p.m ? r : rz) + pad;
        p.lo = [cx - ex, cy - ey, cz - ez]; p.hi = [cx + ex, cy + ey, cz + ez];
      } else {
        const [ax, ay, az, bx, by, bz, ra, rb] = raw, r = Math.max(ra, rb) + pad;
        p.lo = [Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.min(az, bz) - r]; p.hi = [Math.max(ax, bx) + r, Math.max(ay, by) + r, Math.max(az, bz) + r];
      }
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
    let px = x - a[0], py = y - a[1], pz = z - a[2];
    if (p.m) { const m = p.m, qx = m[0] * px + m[1] * py + m[2] * pz, qy = m[3] * px + m[4] * py + m[5] * pz, qz = m[6] * px + m[7] * py + m[8] * pz; px = qx; py = qy; pz = qz; }
    const X = px / a[3], Y = py / a[4], Z = pz / a[5];
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
function beastField(prims, list, x, y, z) {
  let d = 1e3;
  for (let i = 0; i < list.length; i++) { const p = prims[list[i]]; if (!p.sub) d = sminP(d, primDist(p, x, y, z), p.k); }
  for (let i = 0; i < list.length; i++) { const p = prims[list[i]]; if (p.sub) d = -sminP(-d, primDist(p, x, y, z), p.k); }
  return d;
}

// ---------- one creature ----------
function makeBeast(def) {
  const bones = beastBones(def.bones), rest = {};
  for (const [nm, , p] of bones) rest[nm] = new THREE.Vector3(p[0], p[1], p[2]);
  return {
    def, boneList: bones, rest, ready: false, job: null, root: null, meshes: [], bones: {}, mats: [], events: [],
    x: 0, z: 0, y: 0, yaw: 0, speed: 0, mode: 'idle', look: null, reach: 0, grip: undefined, ov: null,
    phase: 0, plantedL: true, plantedR: true, walkK: 0, bob: 0, breath: 0, gruntT: 0, jaw: 0, hy: 0, hp: 0,
    springs: {}, blinkT: 2, blink: 0, gore: 0,
  };
}
function buildBeast(B, scene) {
  if (B.ready) return B;
  const it = B.job || beastBuildJob(B, scene);
  while (!it.next().done) { /* all at once */ }
  B.job = null;
  return B;
}
function beastBuildStep(B, budgetMs, scene) {
  if (B.ready) return true;
  if (!B.job) B.job = beastBuildJob(B, scene);
  const end = performance.now() + budgetMs;
  while (performance.now() < end) if (B.job.next().done) { B.job = null; return true; }
  return false;
}

// One part of the body meshed on its own grid. keep(x, y, z) says which of its triangles it keeps.
function* beastMeshPart(prims, part) {
  const h = part.h, lo = part.lo, hi = part.hi;
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  // which shapes matter where: blocks of BS^3 samples, each with the list of shapes whose bounds reach it
  const BS = 6, bx = Math.ceil(nx / BS), by = Math.ceil(ny / BS), bz = Math.ceil(nz / BS);
  const blocks = new Array(bx * by * bz);
  for (let k = 0; k < bz; k++) for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    const l0 = [lo[0] + i * BS * h, lo[1] + j * BS * h, lo[2] + k * BS * h], h0 = [l0[0] + BS * h, l0[1] + BS * h, l0[2] + BS * h];
    const list = [];
    prims.forEach((p, pi) => { if (p.hi[0] >= l0[0] && p.lo[0] <= h0[0] && p.hi[1] >= l0[1] && p.lo[1] <= h0[1] && p.hi[2] >= l0[2] && p.lo[2] <= h0[2]) list.push(pi); });
    blocks[(k * by + j) * bx + i] = list;
  }
  const listAt = (x, y, z) => {
    const i = clamp(Math.floor((x - lo[0]) / (BS * h)), 0, bx - 1), j = clamp(Math.floor((y - lo[1]) / (BS * h)), 0, by - 1), k = clamp(Math.floor((z - lo[2]) / (BS * h)), 0, bz - 1);
    return blocks[(k * by + j) * bx + i];
  };
  const field = (x, y, z) => { const l = listAt(x, y, z); return l.length ? beastField(prims, l, x, y, z) : 1; };
  yield;
  // sample the field, finely only where the surface could be: a block whose middle is further from the skin
  // than its own size can't hold any of it, and takes that one value throughout
  const F = new Float32Array(nx * ny * nz), rad = Math.sqrt(3) * BS * h * 0.5 + 0.04;
  let work = 0;
  for (let bk = 0; bk < bz; bk++) for (let bj = 0; bj < by; bj++) for (let bi = 0; bi < bx; bi++) {
    const l = blocks[(bk * by + bj) * bx + bi];
    const i0 = bi * BS, j0 = bj * BS, k0 = bk * BS, i1 = Math.min(nx, i0 + BS), j1 = Math.min(ny, j0 + BS), k1 = Math.min(nz, k0 + BS);
    let fill = 1;
    if (l.length) {
      const dc = beastField(prims, l, lo[0] + (i0 + BS / 2) * h, lo[1] + (j0 + BS / 2) * h, lo[2] + (k0 + BS / 2) * h);
      fill = Math.abs(dc) > rad ? dc : NaN;
    }
    const fine = Number.isNaN(fill);
    for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      F[(k * ny + j) * nx + i] = fine ? beastField(prims, l, lo[0] + i * h, lo[1] + j * h, lo[2] + k * h) : fill;
    }
    if (fine && ++work % 5 === 0) yield;
  }
  yield;
  // surface nets: one vertex per cell the surface passes through, quads across every edge it crosses
  const cellV = new Int32Array(nx * ny * nz).fill(-1);
  const P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8), cp = [];
  for (let c = 0; c < 8; c++) cp.push([c & 1, (c >> 1) & 1, (c >> 2) & 1]);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (i === 0 && j === 0 && k % 6 === 5) yield;
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
    P.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  yield;
  const tri = [];
  const V = (i, j, k) => cellV[(k * ny + j) * nx + i];
  const quad = (a, b, c, d, in0) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (in0) tri.push(a, b, c, a, c, d); else tri.push(a, c, b, a, d, c); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    if (i === 1 && j === 1 && k % 6 === 5) yield;
    const in0 = F[(k * ny + j) * nx + i] < 0;
    if (in0 !== (F[(k * ny + j) * nx + i + 1] < 0)) quad(V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k), in0);
    if (in0 !== (F[(k * ny + j + 1) * nx + i] < 0)) quad(V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1), in0);
    if (in0 !== (F[((k + 1) * ny + j) * nx + i] < 0)) quad(V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k), in0);
  }
  // keep this part's triangles, and only the vertices they use
  const used = new Int32Array(P.length / 3).fill(-1), idx = [], keepP = [];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    const mx = (P[a * 3] + P[b * 3] + P[c * 3]) / 3, my = (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3, mz = (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
    if (part.keep && !part.keep(mx, my, mz)) continue;
    for (const v of [a, b, c]) { if (used[v] < 0) { used[v] = keepP.length / 3; keepP.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); } idx.push(used[v]); }
  }
  yield;
  // pull every vertex onto the true surface, and take its normal from the field
  const nv = keepP.length / 3, N = new Float32Array(nv * 3), e = Math.min(0.004, h * 0.4);
  for (let v = 0; v < nv; v++) {
    if (v % 500 === 499) yield;
    let x = keepP[v * 3], y = keepP[v * 3 + 1], z = keepP[v * 3 + 2], gx = 0, gy = 0, gz = 0;
    for (let it = 0; it < 3; it++) {
      // four samples on a tetrahedron give the slope, and their mean the distance
      const a = field(x + e, y - e, z - e), b = field(x - e, y - e, z + e), c = field(x - e, y + e, z - e), dd = field(x + e, y + e, z + e);
      gx = a - b - c + dd; gy = -a - b + c + dd; gz = -a + b - c + dd;
      const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      gx /= gl; gy /= gl; gz /= gl;
      const d = (a + b + c + dd) * 0.25;
      if (Math.abs(d) < h) { x -= d * gx; y -= d * gy; z -= d * gz; }
    }
    keepP[v * 3] = x; keepP[v * 3 + 1] = y; keepP[v * 3 + 2] = z;
    N[v * 3] = gx; N[v * 3 + 1] = gy; N[v * 3 + 2] = gz;
  }
  return { P: keepP, N, idx, listAt, field };
}

// skin weights by which shapes the skin came from; colour from their tints (a cut gives its own colour to the
// skin it opens onto); darkness in the folds; how wet it is
function* beastSkinPart(B, prims, mp) {
  const D = B.def, { P, N, listAt, field } = mp, nv = P.length / 3;
  const boneIndex = {}; B.boneList.forEach(([nm], i) => { boneIndex[nm] = i; });
  const SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4), COL = new Float32Array(nv * 3), AO = new Float32Array(nv), WET = new Float32Array(nv);
  const lam = D.weightLam || 0.04, acc = new Float32Array(B.boneList.length), skin = D.skin || [0.5, 0.5, 0.5];
  for (let v = 0; v < nv; v++) {
    if (v % 600 === 599) yield;
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const l = listAt(x, y, z);
    acc.fill(0);
    let cr = 0, cg = 0, cb = 0, ct = 0, wt = 0, wsum = 0;
    for (const pi of l) {
      const p = prims[pi], d = primDist(p, x, y, z);
      if (p.sub) {
        // skin on the wall of a cut takes the cut's colour
        if (p.tint) { const w = 4 * Math.exp(-Math.abs(d) / 0.008); cr += p.tint[0] * w; cg += p.tint[1] * w; cb += p.tint[2] * w; ct += w; wt += p.wet * w; wsum += w; }
        continue;
      }
      const w = Math.exp(-Math.max(0, d) / lam);
      acc[boneIndex[p.bone]] += w;
      const tn = p.tint || skin;
      cr += tn[0] * w; cg += tn[1] * w; cb += tn[2] * w; ct += w; wt += p.wet * w; wsum += w;
    }
    if (D.weightFix) D.weightFix(x, y, z, acc, boneIndex);
    const order = [...acc.keys()].sort((a, b) => acc[b] - acc[a]).slice(0, 4);
    let tot = 0; for (const o of order) tot += acc[o];
    order.forEach((o, q) => { SI[v * 4 + q] = o; SW[v * 4 + q] = tot > 0 ? acc[o] / tot : (q === 0 ? 1 : 0); });
    if (tot <= 0) SI[v * 4] = boneIndex[D.rootBone || 'hips'];
    // the folds: how shut in this bit of skin is by the rest of the body
    const nxv = N[v * 3], nyv = N[v * 3 + 1], nzv = N[v * 3 + 2];
    let occ = 0, sca = 1;
    for (let s = 1; s <= 4; s++) { const hh = 0.028 * s, d = field(x + nxv * hh, y + nyv * hh, z + nzv * hh); occ += (hh - d) * sca; sca *= 0.72; }
    const ao = clamp(1 - occ * 3.4, 0, 1);
    AO[v] = ao;
    WET[v] = clamp((wsum > 0 ? wt / wsum : 0) + (1 - ao) * 0.3, 0, 1);
    const k = ct > 0 ? 1 / ct : 0, shade = lerp(0.32, 1, ao);
    // linear colour: the tints are in sRGB
    COL[v * 3] = Math.pow((ct ? cr * k : skin[0]) * shade, 2.2); COL[v * 3 + 1] = Math.pow((ct ? cg * k : skin[1]) * shade, 2.2); COL[v * 3 + 2] = Math.pow((ct ? cb * k : skin[2]) * shade, 2.2);
  }
  return { SI, SW, COL, AO, WET };
}

function* beastBuildJob(B, scene) {
  const t0 = performance.now(), D = B.def;
  const prims = beastPrims(D);
  const parts = [];
  for (const part of D.parts) {
    const mp = yield* beastMeshPart(prims, part);
    const sk = yield* beastSkinPart(B, prims, mp);
    parts.push({ part, mp, sk });
    yield;
  }
  // the rig
  const root = new THREE.Group(); root.name = D.name;
  const bones = {}, list = [];
  for (const [nm, par] of B.boneList) {
    const b = new THREE.Bone(); b.name = nm; bones[nm] = b; list.push(b);
    const p = B.rest[nm], pp = par ? B.rest[par] : new THREE.Vector3();
    b.position.set(p.x - pp.x, p.y - pp.y, p.z - pp.z);
    if (par) bones[par].add(b); else root.add(b);
  }
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  const baseMat = beastSkinMat(D, false), fineMat = beastSkinMat(D, true);
  let verts = 0, tris = 0;
  for (const { part, mp, sk } of parts) {
    const geo = new THREE.BufferGeometry(), nv = mp.P.length / 3;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mp.P), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(mp.N, 3));
    geo.setAttribute('rest', new THREE.BufferAttribute(new Float32Array(mp.P), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(sk.COL, 3));
    geo.setAttribute('aAO', new THREE.BufferAttribute(sk.AO, 1));
    geo.setAttribute('aWet', new THREE.BufferAttribute(sk.WET, 1));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(sk.SI, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sk.SW, 4));
    geo.setIndex(nv > 65535 ? new THREE.BufferAttribute(new Uint32Array(mp.idx), 1) : new THREE.BufferAttribute(new Uint16Array(mp.idx), 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.SkinnedMesh(geo, part.fine ? fineMat : baseMat);
    mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.name = D.name + ':' + part.name;
    root.add(mesh);
    mesh.bind(skeleton, new THREE.Matrix4());
    B.meshes.push(mesh);
    verts += nv; tris += mp.idx.length / 3;
  }
  Object.assign(B, { root, bones, skeleton, prims, mats: [baseMat, fineMat], verts, tris });
  if (D.extras) D.extras(B);
  B.root.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = true; } });
  B.buildMs = performance.now() - t0;
  B.ready = true;
  root.visible = false;
  if (scene) scene.add(root);
}

// ---------- the skin ----------
// Vertex colour and fold shadow, plus whatever the creature's own skin code adds (mottling, veins, scars,
// dirt) worked in from where each bit of skin sits on the body at rest, so it all moves with the skin. Light
// wraps a little way round into the shadow side, reddened, the way it does through flesh; wet skin shines.
let _beastFlatN = null;
function beastSkinMat(D, fine) {
  if (!_beastFlatN) { _beastFlatN = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, THREE.RGBAFormat); _beastFlatN.needsUpdate = true; }
  const S = D.skinMat || {};
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: S.rough || 0.55, metalness: 0, skinning: true, normalMap: _beastFlatN,
    clearcoat: S.coat !== undefined ? S.coat : 0.35, clearcoatRoughness: S.coatRough || 0.42 });
  m.normalScale = new THREE.Vector2(0, 0);
  if (fine) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -3; }
  m.userData.wAmt = new THREE.Vector3(0, 0, 0);
  const U = { uSSS: { value: new THREE.Color(S.sss || 0x9a3a28) }, uGore: { value: 0 }, uTime: { value: 0 } };
  m.userData.U = U;
  m.onBeforeCompile = (sh) => {
    wsPatch(sh, m, (s) => {
      Object.assign(s.uniforms, U);
      s.vertexShader = 'attribute vec3 rest;\nattribute float aAO;\nattribute float aWet;\nvarying vec3 vRest;\nvarying float vAO;\nvarying float vWet;\n' +
        s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRest = rest; vAO = aAO; vWet = aWet;');
      const lightChunk = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
        'reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );',
        `float bNL = dot( geometry.normal, directLight.direction );
	vec3 bWrap = uSSS * max( 0.0, ( bNL + 0.5 ) / 1.5 - max( bNL, 0.0 ) ) * 1.6;
	reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * ( irradiance + bWrap * directLight.color ) * BRDF_Diffuse_Lambert( material.diffuseColor );`);
      s.fragmentShader = `uniform vec3 uSSS; uniform float uGore; uniform float uTime; varying vec3 vRest; varying float vAO; varying float vWet;
float cH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cH(i), cH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(cH(i + vec3(0.0, 1.0, 0.0)), cH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(cH(i + vec3(0.0, 0.0, 1.0)), cH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(cH(i + vec3(0.0, 1.0, 1.0)), cH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
float cF(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * cN(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s / 0.875; }
float cRidge(vec3 p, float w) { return 1.0 - smoothstep(0.0, w, abs(cN(p) - 0.5)); }
` + s.fragmentShader
        .replace('#include <lights_physical_pars_fragment>', lightChunk)
        .replace('#include <emissivemap_fragment>', `
  float bRough = ${(S.rough || 0.55).toFixed(3)};
  float bWet = vWet;
  float bH = 0.0;
  {
    ${D.skinGLSL || ''}
    // the surface itself: slow lumps, and pores close up (gone before they can shimmer)
    float bFar = smoothstep(3.0, 12.0, length(vViewPosition));
    float bPx = length(fwidth(vRest)) * ${(S.poreF || 160).toFixed(1)};
    float pore = (cN(vRest * ${(S.poreF || 160).toFixed(1)}) - 0.5) * (1.0 - smoothstep(0.25, 0.6, bPx));
    float hgt = bH + pore * 0.07 + (cN(vRest * vec3(5.0, 14.0, 5.0)) * 0.6 + cN(vRest * 31.0) * 0.4) * 0.22;
    vec2 dH = vec2(dFdx(hgt), dFdy(hgt)) * 0.022 * (1.0 - bFar * 0.75);
    vec3 sp = -vViewPosition, sxv = dFdx(sp), syv = dFdy(sp);
    vec3 r1 = cross(syv, normal), r2 = cross(normal, sxv);
    float det = dot(sxv, r1);
    normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));
    roughnessFactor = clamp(mix(bRough, 0.2, bWet) - (1.0 - vAO) * 0.18, 0.12, 0.92);
  }
#include <emissivemap_fragment>`)
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef CLEARCOAT\n  material.clearcoat *= clamp(0.25 + bWet * 1.2, 0.0, 1.0) * vAO;\n#endif')
        // light doesn't get into a mouth, or a nostril, or a fold: no highlight in there either
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n  reflectedLight.directSpecular *= mix(0.04, 1.0, smoothstep(0.25, 0.8, vAO));');
    });
  };
  m.customProgramCacheKey = () => 'beast-' + D.name + (fine ? '-f' : '');
  return m;
}

// ---------- posing helpers ----------
const _cq = new THREE.Quaternion(), _cq2 = new THREE.Quaternion(), _cm = new THREE.Matrix4(), _cm2 = new THREE.Matrix4();
const _cv1 = new THREE.Vector3(), _cv2 = new THREE.Vector3(), _cv3 = new THREE.Vector3(), _cv4 = new THREE.Vector3(), _cv5 = new THREE.Vector3(), _cv6 = new THREE.Vector3();
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
// the rest offset from one bone to another
function beastRestDir(B, a, b) { return new THREE.Vector3().subVectors(B.rest[b], B.rest[a]); }
// Two bones reaching for a point: a thigh and shin to where the ankle goes, an upper arm and forearm to where
// the wrist goes. The middle joint bends toward `pole`.
const _ikT = new THREE.Vector3(), _ikP = new THREE.Vector3(), _ikA = new THREE.Vector3(), _ikK = new THREE.Vector3();
function beastIK(B, upper, lower, end, target, pole) {
  const b = B.bones, A = b[upper], Lw = b[lower];
  const d1 = B._ikLens || (B._ikLens = {});
  const key = upper + lower;
  if (!d1[key]) d1[key] = [beastRestDir(B, upper, lower), beastRestDir(B, lower, end)];
  const [r1, r2] = d1[key], L1 = r1.length(), L2 = r2.length();
  A.parent.updateWorldMatrix(true, false);
  A.getWorldPosition(_ikA);
  _ikT.copy(target).sub(_ikA);
  let d = _ikT.length();
  d = clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  _ikT.normalize();
  const ang = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  _ikP.crossVectors(_ikT, pole); if (_ikP.lengthSq() < 1e-8) _ikP.set(1, 0, 0); _ikP.normalize();
  _ikK.copy(_ikT).applyAxisAngle(_ikP, ang);
  aimBone(A, r1, _beastFwd, _ikK, pole);
  A.updateMatrixWorld(true);
  Lw.getWorldPosition(_ikA);
  _ikK.copy(target).sub(_ikA).normalize();
  aimBone(Lw, r2, _beastFwd, _ikK, pole);
  Lw.updateMatrixWorld(true);
}
const _beastFwd = new THREE.Vector3(0, 0, 1);

// ---------- loose flesh on springs ----------
// A jiggle bone sits on a spring hung off its parent: when the parent is jolted (a footfall, a turn, a blow)
// the flesh lags behind it and swings back. spec: [stiffness, damping, how far it can go, how heavy].
const _jgW = new THREE.Vector3(), _jgA = new THREE.Vector3(), _jgQ = new THREE.Quaternion();
function beastJiggle(B, dt) {
  const D = B.def;
  if (!D.jiggle) return;
  const h = clamp(dt, 1 / 240, 1 / 30);
  for (const nm in D.jiggle) {
    const [K, C, lim, M] = D.jiggle[nm], b = B.bones[nm]; if (!b) continue;
    const s = B.springs[nm] || (B.springs[nm] = { x: new THREE.Vector3(), v: new THREE.Vector3(), p1: null, p2: null, rest: b.position.clone() });
    b.parent.updateWorldMatrix(true, false);
    b.parent.getWorldPosition(_jgW);
    if (!s.p1 || dt > 0.1 || B.snap) { s.p1 = _jgW.clone(); s.p2 = _jgW.clone(); s.x.set(0, 0, 0); s.v.set(0, 0, 0); }
    _jgA.copy(_jgW).sub(s.p1).sub(s.p1).add(s.p2).divideScalar(h * h);
    if (_jgA.length() > 60) _jgA.setLength(60);
    s.p2.copy(s.p1); s.p1.copy(_jgW);
    // two half steps keep a stiff spring steady at a low frame rate
    for (let k = 0; k < 2; k++) {
      const hh = h / 2;
      s.v.x += (-K * s.x.x - C * s.v.x - _jgA.x * M) * hh; s.v.y += (-K * s.x.y - C * s.v.y - _jgA.y * M) * hh; s.v.z += (-K * s.x.z - C * s.v.z - _jgA.z * M) * hh;
      s.x.addScaledVector(s.v, hh);
    }
    if (s.x.length() > lim) { s.x.setLength(lim); s.v.multiplyScalar(0.5); }
    // into the parent's frame
    b.parent.getWorldQuaternion(_jgQ).invert();
    _jgW.copy(s.x).applyQuaternion(_jgQ).divideScalar(B.root.scale.x || 1);
    b.position.copy(s.rest).add(_jgW);
  }
  B.snap = false;
}

// ---------- keyed tracks ----------
// [[t, a, b, c...], ...]: smooth (ease in and out) from each key to the next
function trackAt(keys, t, out) {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const k = b[0] > a[0] ? smooth01((t - a[0]) / (b[0] - a[0])) : 1;
  out.length = a.length - 1;
  for (let j = 1; j < a.length; j++) out[j - 1] = lerp(a[j], b[j], t <= a[0] ? 0 : k);
  return out;
}
function setBeastVisible(B, v) { if (B.root) B.root.visible = v; }

// ---------- walking on two legs ----------
// One cycle is two steps. A foot is planted for `stance` of the cycle and slides back under the body exactly as
// far as the body moves over it, so it never skates; then it swings forward, lifted, to plant again. The body
// drops onto each foot as it lands (that is the bang), sways over it, rolls the other way at the shoulders,
// and the loose flesh follows a moment later. Turning on the spot counts as walking: it shuffles round.
// Whatever drives it can take over any part through B.ov: a lunge, a lean, the jaw, the head, either hand
// (to a point in the world), either foot.
const _bpA = new THREE.Vector3(), _bpB = new THREE.Vector3(), _bpPole = new THREE.Vector3(), _bpQ = new THREE.Quaternion(), _bpE = new THREE.Euler();
const BEAST_NO_OV = {};
function bipedPose(B, dt, t) {
  if (!B.ready) return;
  const D = B.def, G = D.gait, b = B.bones, R = B.rest, h = Math.min(dt, 0.05), ov = B.ov || BEAST_NO_OV;
  const fxw = Math.sin(B.yaw), fzw = Math.cos(B.yaw), lunge = ov.lunge || 0, side = ov.side || 0;
  B.root.position.set(B.x + fxw * lunge + fzw * side, B.y || 0, B.z + fzw * lunge - fxw * side);
  B.root.rotation.set(0, B.yaw + (ov.yaw || 0), 0);
  // turning on the spot: it shuffles round
  const dyaw = B.prevYaw === undefined ? 0 : Math.abs(wrapAngle(B.yaw - B.prevYaw)) / Math.max(h, 1e-3);
  B.prevYaw = B.yaw;
  const loco = Math.max(B.speed, Math.min(dyaw * G.turnStep, 1.1)) * (ov.still ? 0 : 1);
  B.locoS = damp(B.locoS || 0, loco, 5, dt);
  const walking = B.locoS > 0.08;
  B.walkK = damp(B.walkK, walking ? 1 : 0, walking ? 3.2 : 2.4, dt);
  const wk = B.walkK;
  B.runK = damp(B.runK || 0, clamp((B.locoS - G.runFrom) / (G.runTo - G.runFrom), 0, 1), 3, dt);
  const rk = B.runK, hunt = B.mode === 'hunt' || B.mode === 'notice' ? 1 : 0;
  B.huntK = damp(B.huntK || 0, hunt, hunt ? 4 : 1.5, dt);
  const hk = B.huntK;
  const step = lerp(G.step[0], G.step[1], rk), st = G.stance, stroke = 2 * st * step;
  if (walking) B.phase = (B.phase + h * B.locoS / (2 * step)) % 1;
  else B.phase = damp(B.phase, B.phase < 0.25 ? 0 : B.phase < 0.75 ? 0.5 : 1, 2, dt) % 1;
  const ph = B.phase, ph2 = ph * Math.PI * 2;
  const footAt = (off) => {
    const p = (ph - off + 1) % 1;
    if (p < st) return { z: stroke / 2 - stroke * (p / st), y: 0, stance: true, p, q: 0 };
    const q = (p - st) / (1 - st), e = q * q * (3 - 2 * q);
    return { z: -stroke / 2 + stroke * e, y: Math.sin(q * Math.PI) * G.lift * (1 + rk * 0.7), stance: false, p, q };
  };
  const fL = footAt(0), fR = footAt(0.5);
  // plants: the body comes down on that foot
  for (const [sd, f, key] of [['L', fL, 'plantedL'], ['R', fR, 'plantedR']]) {
    if (f.stance && !B[key] && wk > 0.3) {
      const fx = sd === 'L' ? G.footX : -G.footX;
      const wx = B.root.position.x + Math.cos(B.yaw) * fx + fxw * f.z * wk, wz = B.root.position.z - Math.sin(B.yaw) * fx + fzw * f.z * wk;
      B.events.push({ kind: 'step', x: wx, y: 0.05, z: wz, side: sd, power: clamp(B.locoS / G.stepPower, 0.5, 1.4) });
      B.bob = -1;
    }
    B[key] = f.stance;
  }
  // body: drops onto the planted foot, sways over it, rolls the other way at the shoulders
  B.bob = damp(B.bob, 0, 5, dt);
  const sway = Math.sin(ph2) * G.sway * wk * (1 - rk * 0.35), dip = (B.bob * G.dip + (Math.cos(ph2 * 2) - 1) * 0.5 * G.bounce * (1 + rk)) * wk;
  B.breath += h * (G.breath + wk * 0.18 + hk * 0.22);
  const br = Math.sin(B.breath * Math.PI * 2);
  const lean = lerp(G.lean[0], G.lean[1], wk) + (G.lean[2] - G.lean[1]) * hk * Math.max(wk, 0.4) + (ov.lean || 0);
  const twist = Math.sin(ph2) * G.twist * wk;
  b.hips.position.set(R.hips.x + sway * 0.6, R.hips.y + dip - G.squat * wk - (ov.drop || 0), R.hips.z);
  setLocalEuler(b.hips, lean * 0.25, twist + (ov.hipYaw || 0), -sway * G.roll);
  const ch = ov.chestYaw || 0, chr = ov.chestRoll || 0;
  setLocalEuler(b.spine, lean * 0.4 + br * G.breathAmp, -twist * 1.3 + ch * 0.45, sway * G.roll * 0.9 + chr * 0.4);
  setLocalEuler(b.chest, lean * 0.35 - br * G.breathAmp * 1.5, -twist * 0.9 + ch * 0.55, sway * G.roll * 0.9 + chr * 0.6);
  b.chest.scale.set(1 + br * 0.012, 1 + br * 0.008, 1 + br * 0.02);
  B.root.updateMatrixWorld(true);
  // the head: lagging the body, turning to whatever it is looking at
  beastHead(B, dt, t, wk, br, hk);
  if (ov.beforeArms) { B.root.updateMatrixWorld(true); ov.beforeArms(B); }
  // arms: hung out from the body, swinging against the legs; held out in front when it hunts; or reaching
  const swing = Math.sin(ph2) * G.armSwing * wk * (1 + rk * 0.5), rch = B.reach || 0;
  B.root.updateMatrixWorld(true);
  for (const s of ['L', 'R']) {
    const m = s === 'L' ? 1 : -1, sw = s === 'L' ? -swing : swing, tgt = s === 'L' ? ov.armL : ov.armR;
    setLocalEuler(b['clav' + s], 0, -m * hk * G.huntClav * 0.4, m * (-0.04 + br * 0.015 + hk * G.huntClav));
    if (tgt) {
      // reaching for a point in the world: elbow out and down
      _bpPole.set(0, -0.6, -0.3).applyQuaternion(B.root.quaternion).addScaledVector(_bpA.set(m, 0, 0).applyQuaternion(B.root.quaternion), 0.8).normalize();
      beastIK(B, 'arm' + s, 'elbow' + s, 'hand' + s, tgt, _bpPole);
      setLocalEuler(b['hand' + s], -0.2, 0, m * 0.25);
    } else {
      const fwd = hk * G.huntArms + rch * 1.25, idle = Math.sin(t * 0.43 + m) * 0.04 * (1 - wk);
      setLocalEuler(b['arm' + s], -sw * 0.8 - fwd + idle, m * (rch * 0.25 + hk * G.huntArmIn), m * (-G.armOut + rch * 0.05 - hk * 0.12));
      setLocalEuler(b['elbow' + s], -G.elbow - Math.max(0, -sw) * 0.4 - rch * 0.35 - hk * G.huntElbow, 0, m * 0.08);
      setLocalEuler(b['hand' + s], -0.1 - rch * 0.3 - hk * 0.2, 0, m * 0.12);
    }
    const gp = s === 'L' ? ov.gripL : ov.gripR;
    const curl = gp !== undefined ? gp : B.grip !== undefined ? B.grip : G.curl + 0.08 * Math.sin(t * 0.7 + m) + hk * 0.25;
    if (b['fing' + s]) setLocalEuler(b['fing' + s], 0, 0, -m * curl * 1.1);
    if (b['tip' + s]) setLocalEuler(b['tip' + s], 0, 0, -m * curl * 1.3);
    if (b['thumb' + s]) setLocalEuler(b['thumb' + s], curl * 0.5, 0, -m * curl * 0.7);
  }
  // legs: two-bone IK to where the feet are, knees forward and out
  B.root.updateMatrixWorld(true);
  for (const [s, f] of [['L', fL], ['R', fR]]) {
    const m = s === 'L' ? 1 : -1, foot = b['foot' + s], ft = s === 'L' ? ov.footL : ov.footR;
    if (ft) _bpB.copy(ft);
    else { _bpB.set(m * G.footX, R['foot' + s].y + f.y * wk, R['foot' + s].z + f.z * wk); B.root.localToWorld(_bpB); }
    _bpPole.set(m * G.knee, 0, 1).applyQuaternion(B.root.quaternion).normalize();
    beastIK(B, 'thigh' + s, 'shin' + s, 'foot' + s, _bpB, _bpPole);
    // the foot flat on the floor, rolling off its toes as it lifts
    foot.parent.getWorldQuaternion(_cq2).invert();
    const roll = ft ? (ov.footPitch || 0) : f.stance ? 0 : -Math.sin(f.q * Math.PI) * 0.35 * wk;
    _bpE.set(roll, B.yaw + (ov.yaw || 0) + m * G.toeOut + (ft ? ov.footYaw || 0 : 0), 0, 'YXZ');
    _bpQ.setFromEuler(_bpE);
    foot.quaternion.copy(_cq2.multiply(_bpQ));
    if (b['toe' + s]) setLocalEuler(b['toe' + s], f.stance && f.p > st * 0.7 ? -0.35 * wk : 0, 0, 0);
  }
  B.root.updateMatrixWorld(true);
  beastJiggle(B, dt);
  if (D.after) D.after(B, dt, t);
}
// the head: looks at whatever it has been given to look at; otherwise it rolls about, slow. The eyes follow.
function beastHead(B, dt, t, wk, br, hk) {
  const b = B.bones, G = B.def.gait, ov = B.ov || BEAST_NO_OV;
  let yaw = 0, pitch = 0;
  const look = ov.lookFwd ? null : ov.look || B.look;
  if (ov.lookFwd) { yaw = 0; pitch = 0; }
  else if (look) {
    _cv6.set(look.x, look.y, look.z);
    b.chest.updateWorldMatrix(true, false);
    b.chest.worldToLocal(_cv6);
    _cv6.sub(B.rest.head).add(B.rest.chest);
    yaw = clamp(Math.atan2(_cv6.x, _cv6.z), -1.15, 1.15);
    pitch = clamp(-Math.atan2(_cv6.y, Math.hypot(_cv6.x, _cv6.z)), -0.7, 0.6);
  } else {
    yaw = Math.sin(t * 0.21) * 0.35 + Math.sin(t * 0.53) * 0.12; pitch = 0.08 + Math.sin(t * 0.31) * 0.06;
  }
  // now and then something jerks its head round
  if (G.twitch) {
    B.twT = (B.twT || 0) - dt;
    if (B.twT <= 0) { B.twT = 0.4 + Math.random() * (look ? 1.2 : 3); B.twY = (Math.random() - 0.5) * G.twitch; B.twR = (Math.random() - 0.5) * G.twitch * 1.4; }
    B.twK = damp(B.twK || 0, 0, 7, dt);
    if (B.twT < 0.08) B.twK = 1;
  }
  const tw = G.twitch ? (B.twK || 0) : 0;
  const rate = ov.lookFwd ? 12 : look ? G.headRate : 1.6;
  B.hy = dampAngle(B.hy || 0, yaw + (G.twitch ? (B.twY || 0) * tw : 0), rate, dt); B.hp = damp(B.hp || 0, pitch, rate, dt);
  const bob = -B.bob * 0.06 * wk;
  const roll = (ov.headRoll || 0) + G.headTilt + Math.sin(t * 0.37) * 0.05 + (G.twitch ? (B.twR || 0) * tw : 0);
  setLocalEuler(b.neck, B.hp * 0.4 + bob + G.neckDown + hk * G.huntNeck + (ov.neckPitch || 0), B.hy * 0.35, 0, 'YXZ');
  setLocalEuler(b.head, B.hp * 0.6 - br * 0.02 + G.headDown - hk * G.huntNeck * 0.6 + (ov.headPitch || 0), B.hy * 0.65, roll, 'YXZ');
  // the jaw hangs a little open; it gapes when it grunts, and when it hunts
  B.gruntT = Math.max(0, (B.gruntT || 0) - dt);
  const g = B.gruntT > 0 ? Math.sin(Math.min(1, (0.8 - B.gruntT) / 0.8) * Math.PI) : 0;
  const jawWant = ov.jaw !== undefined ? ov.jaw : G.jaw + br * 0.03 + g * G.gruntJaw + hk * G.huntJaw + wk * 0.04;
  B.jaw = ov.jaw !== undefined ? jawWant : damp(B.jaw, jawWant, 9, dt);
  setLocalEuler(b.jaw, B.jaw, 0, 0);
  if (G.unhinge) b.jaw.position.y = B.rest.jaw.y - B.rest.head.y - Math.max(0, B.jaw - 0.55) * G.unhinge;
  // blinking, and the eyes following what it looks at
  B.blinkT -= dt;
  if (B.blinkT <= 0) { B.blinkT = 1.5 + Math.random() * 5; B.blink = 0.14; }
  B.blink = Math.max(0, B.blink - dt);
  if (B.eyes) {
    B.root.updateMatrixWorld(true);
    for (const e of B.eyes) {
      if (look) {
        _cv6.set(look.x, look.y, look.z);
        e.g.parent.worldToLocal(_cv6); _cv6.sub(e.g.position);
        const ey = clamp(Math.atan2(_cv6.x, _cv6.z), -0.45, 0.45), ep = clamp(-Math.atan2(_cv6.y, Math.hypot(_cv6.x, _cv6.z)), -0.35, 0.35);
        e.g.rotation.set(damp(e.g.rotation.x, ep, 14, dt), damp(e.g.rotation.y, ey + e.wrong, 14, dt), 0);
      } else e.g.rotation.set(damp(e.g.rotation.x, Math.sin(t * 0.7 + e.s) * 0.1, 3, dt), damp(e.g.rotation.y, Math.sin(t * 0.4) * 0.3 + e.wrong, 3, dt), 0);
      if (e.lid) e.lid.rotation.x = lerp(e.lidOpen, e.lidShut, Math.max(B.blink > 0 ? Math.sin(B.blink / 0.14 * Math.PI) : 0, ov.lids || 0));
    }
  }
}
