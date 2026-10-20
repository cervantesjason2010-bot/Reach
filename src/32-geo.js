// ================= geometry: merged batches and primitives with world-scaled UVs =================
const _m4 = new THREE.Matrix4(), _m3 = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const CHUNK_M = 16;

// test hook: records where every merged piece of geometry ends up (only when a test page asks for it)
const GeoAudit = { on: typeof window !== 'undefined' && !!window.__geoAudit, list: [] };
const _gaBox = new THREE.Box3();
function geoAuditRecord(material, geometry, matrix) {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  _gaBox.copy(geometry.boundingBox).applyMatrix4(matrix);
  const st = (new Error().stack || '').split('\n').slice(2, 7).map((l) => (l.match(/at (?:Object\.)?([\w.$<>]+)/) || [])[1]).filter((n) => n && !/^(add|box|cbox|cyl|sphere|torus|geo|quad|Batch)/.test(n)).slice(0, 3).join('<');
  GeoAudit.list.push({ t: st, m: material.name || (material.map ? 'tex' : '#' + (material.color ? material.color.getHexString() : '')), b: [_gaBox.min.x, _gaBox.min.y, _gaBox.min.z, _gaBox.max.x, _gaBox.max.y, _gaBox.max.z] });
}
class Batch {
  constructor() { this.groups = new Map(); }
  bucket(material) {
    let b = this.groups.get(material.uuid);
    if (!b) { b = { material, pos: [], nrm: [], uv: [] }; this.groups.set(material.uuid, b); }
    return b;
  }
  add(material, geometry, matrix) {
    if (GeoAudit.on) geoAuditRecord(material, geometry, matrix);
    let g = geometry;
    if (g.index) { if (!g.userData.ni) g.userData.ni = g.toNonIndexed(); g = g.userData.ni; }
    const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    _m3.getNormalMatrix(matrix);
    const b = this.bucket(material);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      _n.fromBufferAttribute(nrm, i).applyMatrix3(_m3).normalize();
      b.pos.push(_v.x, _v.y, _v.z); b.nrm.push(_n.x, _n.y, _n.z);
      if (uv) b.uv.push(uv.getX(i), uv.getY(i)); else b.uv.push(0, 0);
    }
  }
  // a quad given 4 corners (counter-clockwise seen from the front) and its uvs
  quad(material, a, b2, c, d, nx, ny, nz, uvs) {
    const b = this.bucket(material);
    const P = [a, b2, c, a, c, d], U = [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]];
    for (let i = 0; i < 6; i++) { b.pos.push(P[i][0], P[i][1], P[i][2]); b.nrm.push(nx, ny, nz); b.uv.push(U[i][0], U[i][1]); }
  }
  build(parent, opts = {}) {
    const meshes = [];
    const make = (material, pos, nrm, uv) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, material);
      m.castShadow = opts.cast !== false && !material.transparent && !material.userData.noShadow && !(material.emissive && material.emissiveIntensity > 0.5 && material.emissive.getHex() !== 0);
      m.receiveShadow = opts.receive !== false;
      m.matrixAutoUpdate = false;
      parent.add(m);
      meshes.push(m);
    };
    for (const b of this.groups.values()) {
      if (!b.pos.length) continue;
      const nv = b.pos.length / 3;
      if (nv < 6000 || opts.noChunk) { make(b.material, b.pos, b.nrm, b.uv); continue; }
      // big buckets are split into chunks so the camera and the flashlight's shadow can skip what they can't see
      const chunks = new Map();
      for (let t = 0; t < nv; t += 3) {
        const cx = (b.pos[t * 3] + b.pos[t * 3 + 3] + b.pos[t * 3 + 6]) / 3, cz = (b.pos[t * 3 + 2] + b.pos[t * 3 + 5] + b.pos[t * 3 + 8]) / 3;
        const key = Math.floor(cx / CHUNK_M) + ',' + Math.floor(cz / CHUNK_M);
        let c = chunks.get(key);
        if (!c) { c = { pos: [], nrm: [], uv: [] }; chunks.set(key, c); }
        for (let k = 0; k < 9; k++) { c.pos.push(b.pos[t * 3 + k]); c.nrm.push(b.nrm[t * 3 + k]); }
        for (let k = 0; k < 6; k++) c.uv.push(b.uv[t * 2 + k]);
      }
      for (const c of chunks.values()) make(b.material, c.pos, c.nrm, c.uv);
    }
    this.groups.clear();
    return meshes;
  }
}

// ---------- primitive geometry (cached) with UVs scaled to real size ----------
const GeoCache = new Map();
function cachedGeo(key, make) { if (!GeoCache.has(key)) GeoCache.set(key, make()); return GeoCache.get(key); }
function boxGeo(w, h, d, texM = 1) {
  return cachedGeo('box' + [w, h, d, texM].join(','), () => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0] / texM, uv.getY(i) * dims[f][1] / texM);
    }
    return g;
  });
}
// A box with chamfered edges: the bevels catch the light the way real edges do.
function cboxGeo(w, h, d, bev = 0.015, texM = 1) {
  return cachedGeo('cbox' + [w, h, d, bev, texM].join(','), () => {
    const b = Math.max(0.0005, Math.min(bev, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
    const X = w / 2, Y = h / 2, Z = d / 2, S = [-1, 1];
    const pos = [], nrm = [], uv = [];
    const face = (pts, n) => {
      const l = Math.hypot(n[0], n[1], n[2]); n = [n[0] / l, n[1] / l, n[2] / l];
      const ax = pts[1].map((v, i) => v - pts[0][i]), bx = pts[2].map((v, i) => v - pts[0][i]);
      const cr = [ax[1] * bx[2] - ax[2] * bx[1], ax[2] * bx[0] - ax[0] * bx[2], ax[0] * bx[1] - ax[1] * bx[0]];
      if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) pts = pts.slice().reverse();
      const a = Math.abs(n[0]), c = Math.abs(n[1]), e = Math.abs(n[2]);
      const proj = a >= c && a >= e ? (p) => [p[2] * Math.sign(n[0]), p[1]] : c >= e ? (p) => [p[0], p[2] * Math.sign(n[1])] : (p) => [p[0] * Math.sign(n[2]), p[1]];
      for (let i = 1; i < pts.length - 1; i++) for (const p of [pts[0], pts[i], pts[i + 1]]) {
        pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]);
        const q = proj(p); uv.push(q[0] / texM, q[1] / texM);
      }
    };
    for (const s of S) {
      face([[s * X, -Y + b, -Z + b], [s * X, Y - b, -Z + b], [s * X, Y - b, Z - b], [s * X, -Y + b, Z - b]], [s, 0, 0]);
      face([[-X + b, s * Y, -Z + b], [X - b, s * Y, -Z + b], [X - b, s * Y, Z - b], [-X + b, s * Y, Z - b]], [0, s, 0]);
      face([[-X + b, -Y + b, s * Z], [X - b, -Y + b, s * Z], [X - b, Y - b, s * Z], [-X + b, Y - b, s * Z]], [0, 0, s]);
    }
    for (const s of S) for (const t of S) {
      face([[s * X, t * (Y - b), -Z + b], [s * (X - b), t * Y, -Z + b], [s * (X - b), t * Y, Z - b], [s * X, t * (Y - b), Z - b]], [s, t, 0]);
      face([[s * X, -Y + b, t * (Z - b)], [s * (X - b), -Y + b, t * Z], [s * (X - b), Y - b, t * Z], [s * X, Y - b, t * (Z - b)]], [s, 0, t]);
      face([[-X + b, s * Y, t * (Z - b)], [-X + b, s * (Y - b), t * Z], [X - b, s * (Y - b), t * Z], [X - b, s * Y, t * (Z - b)]], [0, s, t]);
    }
    for (const s of S) for (const t of S) for (const u of S) face([[s * X, t * (Y - b), u * (Z - b)], [s * (X - b), t * Y, u * (Z - b)], [s * (X - b), t * (Y - b), u * Z]], [s, t, u]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  });
}
function cylGeo(rt, rb, h, seg = 12, texM = 1, open = false) {
  return cachedGeo('cyl' + [rt, rb, h, seg, texM, open].join(','), () => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
    const uv = g.attributes.uv, circ = Math.PI * 2 * Math.max(rt, rb);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / texM, uv.getY(i) * h / texM);
    return g;
  });
}
function sphereGeo(r, ws = 12, hs = 8) { return cachedGeo('sph' + [r, ws, hs].join(','), () => new THREE.SphereGeometry(r, ws, hs)); }
function torusGeo(r, t, rs = 8, ts = 20, arc = Math.PI * 2) { return cachedGeo('tor' + [r, t, rs, ts, arc].join(','), () => new THREE.TorusGeometry(r, t, rs, ts, arc)); }
// a cable or hose through points (not cached: every one is different)
function tubeGeo(points, r, seg = 24, rs = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  return new THREE.TubeGeometry(curve, seg, r, rs, false);
}
// a sagging cable between two points
function cablePts(a, b, sag, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n; out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - sag * 4 * t * (1 - t), lerp(a[2], b[2], t)]); }
  return out;
}

function xform(x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  _p.set(x, y, z); _s.set(sx, sy, sz);
  return _m4.compose(_p, _q, _s);
}
// Helpers that place a primitive in a batch, in a local frame (origin ox,oz rotated by rot).
function frame(ox, oz, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return {
    ox, oz, rot,
    at(lx, lz) { return [ox + lx * c + lz * s, oz - lx * s + lz * c]; },
    box(B, material, lx, ly, lz, w, h, d, extraRot = 0, texM = 1) {
      const [x, z] = this.at(lx, lz);
      B.add(material, boxGeo(w, h, d, texM), xform(x, ly, z, rot + extraRot));
    },
    cbox(B, material, lx, ly, lz, w, h, d, bev = 0.015, extraRot = 0, texM = 1, rx = 0, rz = 0) {
      const [x, z] = this.at(lx, lz);
      B.add(material, cboxGeo(w, h, d, bev, texM), xform(x, ly, z, rot + extraRot, rx, rz));
    },
    cyl(B, material, lx, ly, lz, rt, rb, h, seg = 12, rx = 0, rz = 0, texM = 1) {
      const [x, z] = this.at(lx, lz);
      B.add(material, cylGeo(rt, rb, h, seg, texM), xform(x, ly, z, rot, rx, rz));
    },
    sphere(B, material, lx, ly, lz, r, sy = 1) {
      const [x, z] = this.at(lx, lz);
      B.add(material, sphereGeo(r), xform(x, ly, z, rot, 0, 0, 1, sy, 1));
    },
    torus(B, material, lx, ly, lz, r, t, rx = 0) {
      const [x, z] = this.at(lx, lz);
      B.add(material, torusGeo(r, t), xform(x, ly, z, rot, rx, 0));
    },
    geo(B, material, geo, lx, ly, lz, extraRot = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      const [x, z] = this.at(lx, lz);
      B.add(material, geo, xform(x, ly, z, rot + extraRot, rx, rz, sx, sy, sz));
    },
    // a point in this frame to world coordinates [x, y, z]
    w(lx, ly, lz) { const [x, z] = this.at(lx, lz); return [x, ly, z]; },
  };
}
