// ================= the freight lift: the car you ride down in, its gate, the shaft sliding past, the landing doors =================
// Car interior (area 0 local): x 1..5, z 9..15, ceiling 3.2. The door passage through the hoistway wall is x 5..6, z 11..13.
const LIFT = { x0: 1, x1: 5, z0: 9, z1: 15, d0: 11, d1: 13, h: 3.2, dh: 2.6, hx: 5.08, gateX: 4.9, S: 4.4, hatch: [2.5, 11.5] };
const Lift = { ready: false, p: 0, doorOpen: 0, gateOpen: 0, segs: [], lamps: [], gateDirty: true };

function isCarCell(L, gx, gz) {
  if (!inGrid(L, gx, gz)) return false;
  const i = gz * L.W + gx;
  return L.area[i] === 0 && (L.ch[i] === 'z' || L.ch[i] === '@');
}
// the door passage is lower than the car: its soffit is the hoistway wall over the landing doors
function patchLiftCells(L) {
  const a = L.areas[0];
  for (let z = LIFT.d0; z < LIFT.d1; z++) for (let x = LIFT.x1; x < LIFT.x1 + 1; x++) {
    const gx = a.offX + x, gz = a.offZ + z;
    if (isCarCell(L, gx, gz)) L.ceil[gz * L.W + gx] = LIFT.dh;
  }
  // rooms built inside the tall halls get their own ceilings: the shelters, and the supervisor's office on the dock
  L.areas.forEach((A, ai) => {
    if (!['dock', 'pump', 'generator', 'lift', 'silo'].includes(A.theme)) return;
    const low = new Set();
    for (let z = A.offZ; z < A.offZ + A.h; z++) for (let x = A.offX; x < A.offX + A.w; x++) {
      const i = z * L.W + x;
      if (L.area[i] !== ai) continue;
      const c = L.ch[i], lx = x - A.offX, lz = z - A.offZ;
      const office = ai === 0 && lx >= 31 && lx <= 39 && lz >= 1 && (lz <= 7 || (lz === 8 && c !== '#' && c !== '~'));
      if (L.safe[i] || c === 'S' || office) low.add(i);
    }
    // furniture inside a shelter (lockers, tables) is not part of the walkable flood: pull it in too
    for (let pass = 0; pass < 3; pass++) for (let z = A.offZ; z < A.offZ + A.h; z++) for (let x = A.offX; x < A.offX + A.w; x++) {
      const i = z * L.W + x, c = L.ch[i];
      if (L.area[i] !== ai || low.has(i) || '#I~|'.includes(c) || L.walk[i]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => { const k = (z + dz) * L.W + x + dx; return low.has(k) && L.ch[k] !== 'S'; })) low.add(i);
    }
    for (const i of low) L.ceil[i] = 3.0;
  });
}
function liftPt(x, y, z) { const a = Game.L.areas[0]; return new THREE.Vector3(a.offX + x, y, a.offZ + z); }

// ---------- the car itself: static, merged into the dock's geometry ----------
function carWallSpan(B, f, u0, u1, opts = {}) {
  const w = u1 - u0, uc = (u0 + u1) / 2;
  const paint = mat('metal', { color: 0x58635d }), rib = mat('metal', { color: 0x4b5650 }), dk = mat('steelDark');
  const top = opts.top !== undefined ? opts.top : LIFT.h, low = opts.low !== undefined ? opts.low : 0;
  // painted sheet above, diamond plate below with a steel cap
  if (top > 1.24) f.cbox(B, paint, uc, (Math.max(1.24, low) + top) / 2, 0.006, w, top - Math.max(1.24, low), 0.012, 0.002, 0, 1.6);
  if (low < 1.22) {
    f.cbox(B, mat('tread'), uc, (low + 1.22) / 2, 0.008, w, 1.22 - low, 0.016, 0.003, 0, 2.4);
    f.cbox(B, dk, uc, 1.235, 0.022, w, 0.035, 0.044, 0.006);
  }
  if (top > 2.3 && low < 2.2) f.cbox(B, dk, uc, 2.2, 0.014, w, 0.022, 0.008, 0.002);
  // stiffeners with bolt heads
  for (let u = u0 + 0.4; u < u1 - 0.2 && !opts.noRibs; u += 0.8) {
    const y0 = Math.max(1.26, low), y1 = top;
    if (y1 - y0 < 0.3) continue;
    f.cbox(B, rib, u, (y0 + y1) / 2, 0.03, 0.075, y1 - y0, 0.036, 0.008);
    for (let y = y0 + 0.18; y < y1 - 0.1; y += 0.42) f.cyl(B, dk, u, y, 0.05, 0.011, 0.011, 0.012, 8, Math.PI / 2);
  }
  // timber bumper rails on standoffs
  if (opts.rails) {
    for (const y of [0.34, 0.94]) {
      f.cbox(B, mat('wood', { color: 0x6e4c34 }), uc, y, 0.062, w - 0.06, 0.14, 0.05, 0.012, 0, 1.2);
      for (let u = u0 + 0.3; u < u1 - 0.1; u += 0.9) {
        f.cbox(B, dk, u, y, 0.022, 0.05, 0.1, 0.032, 0.004);
        f.cyl(B, PM.chrome, u, y, 0.09, 0.012, 0.012, 0.008, 8, Math.PI / 2);
      }
    }
  }
  if (top >= LIFT.h - 0.01) f.cbox(B, dk, uc, LIFT.h - 0.025, 0.025, w, 0.05, 0.05, 0.006);
}
function buildLiftCar(L, B) {
  const a = L.areas[0], X = (x) => a.offX + x, Z = (z) => a.offZ + z;
  const { x0, x1, z0, z1, d0, d1, h, dh } = LIFT;
  const F = (x, z, rot) => frame(X(x), Z(z), rot);
  const dk = mat('steelDark');
  // floor: diamond plate, worn and greasy toward the door
  B.quad(mat('tread'), [X(x0), 0, Z(z1)], [X(x1), 0, Z(z1)], [X(x1), 0, Z(z0)], [X(x0), 0, Z(z0)], 0, 1, 0,
    [[X(x0) / 2.4, Z(z1) / 2.4], [X(x1) / 2.4, Z(z1) / 2.4], [X(x1) / 2.4, Z(z0) / 2.4], [X(x0) / 2.4, Z(z0) / 2.4]]);
  const flat = (k, w, d) => cachedGeo('liftDecal' + k + w + d, () => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2));
  B.add(decalMat('grime'), flat('g', 2.4, 2.0), xform(X(4.0), 0.006, Z(12), 0.3));
  B.add(decalMat('oil'), flat('o', 0.9, 0.9), xform(X(2.1), 0.007, Z(14.1), 1.1));
  B.add(decalMat('boots'), flat('b', 0.7, 1.6), xform(X(3.6), 0.008, Z(11.7), -1.35));
  // walls: back, the two sides, the front either side of the door and over it
  const back = F(x0, (z0 + z1) / 2, Math.PI / 2), sideN = F((x0 + x1) / 2, z0, 0), sideS = F((x0 + x1) / 2, z1, Math.PI), front = F(x1, (z0 + z1) / 2, -Math.PI / 2);
  carWallSpan(B, back, -3, 3, { rails: true });
  carWallSpan(B, sideN, -2, 2, { rails: true });
  carWallSpan(B, sideS, -2, 2, { rails: true });
  carWallSpan(B, front, -3, d0 - 12, { rails: true });
  carWallSpan(B, front, d1 - 12, 3, { rails: true });
  carWallSpan(B, front, -1, 1, { low: dh + 0.12, top: h, noRibs: true });
  // corner guards
  for (const [cx, cz] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]]) {
    const sx = cx === x0 ? 1 : -1, sz = cz === z0 ? 1 : -1;
    B.add(dk, cboxGeo(0.07, h, 0.008, 0.002), xform(X(cx + sx * 0.035), h / 2, Z(cz + sz * 0.004)));
    B.add(dk, cboxGeo(0.008, h, 0.07, 0.002), xform(X(cx + sx * 0.004), h / 2, Z(cz + sz * 0.035)));
  }
  // door frame, sill and the gate's tracks
  for (const s of [-1, 1]) {
    front.cbox(B, dk, s * 1.06, dh / 2, 0.0, 0.12, dh, 0.17, 0.012);
    front.geo(B, hazardMat(), planeGeo(0.1, 1.1), s * 1.06, 0.6, 0.0851, 0, 0, 0);
  }
  front.cbox(B, dk, 0, dh + 0.06, 0.0, 2.24, 0.12, 0.17, 0.012);
  const alu = plainMat(0xb4b8bc, { roughness: 0.36, metalness: 0.9 });
  front.cbox(B, alu, 0, 0.006, 0.02, 2.0, 0.012, 0.2, 0.002);
  for (let k = 0; k < 6; k++) front.box(B, plainMat(0x222426), 0, 0.0125, -0.06 + k * 0.03, 2.0, 0.002, 0.006);
  front.cbox(B, dk, 0.25, dh - 0.05, 0.1, 2.75, 0.06, 0.07, 0.008);
  front.cbox(B, dk, 0.25, 0.008, 0.1, 2.75, 0.016, 0.05, 0.003);
  // operating panel beside the door: brushed steel, floor buttons, alarm, stop, key switch
  const panelF = F(x1, 13.78, -Math.PI / 2);
  const brushed = plainMat(0x9ea3a8, { roughness: 0.3, metalness: 0.9 });
  panelF.cbox(B, brushed, 0, 1.35, 0.012, 0.3, 0.72, 0.024, 0.006);
  panelF.geo(B, labelMat('FREIGHT  ·  CAR 2', { fg: '#1b1e21', w: 256, h: 48, size: 30 }), planeGeo(0.24, 0.045), 0, 1.66, 0.0245);
  const btnRing = plainMat(0x1a1b1c, { roughness: 0.4, metalness: 0.5 }), btn = plainMat(0xd8d4c8, { roughness: 0.35 });
  for (let r2 = 0; r2 < 6; r2++) for (let c = 0; c < 2; c++) {
    const bx = -0.06 + c * 0.12, by = 1.56 - r2 * 0.07;
    panelF.cyl(B, btnRing, bx, by, 0.028, 0.022, 0.022, 0.01, 14, Math.PI / 2);
    panelF.cyl(B, btn, bx, by, 0.034, 0.016, 0.016, 0.008, 12, Math.PI / 2);
  }
  panelF.cyl(B, plainMat(0xb81c12, { roughness: 0.3 }), 0, 1.09, 0.04, 0.032, 0.03, 0.03, 16, Math.PI / 2);
  panelF.cyl(B, plainMat(0xd8a020, { roughness: 0.35 }), -0.08, 1.09, 0.03, 0.02, 0.02, 0.014, 12, Math.PI / 2);
  panelF.cyl(B, btnRing, 0.085, 1.09, 0.03, 0.018, 0.018, 0.014, 12, Math.PI / 2);
  panelF.cbox(B, PM.chrome, 0.085, 1.09, 0.04, 0.004, 0.022, 0.006, 0.001);
  // signs: capacity plate, inspection certificate, no-passengers stencil, emergency phone
  const plate = plainMat(0x2a2c2e, { roughness: 0.5, metalness: 0.6 });
  sideN.cbox(B, plate, 1.25, 2.02, 0.012, 0.62, 0.34, 0.012, 0.004);
  sideN.geo(B, labelMat('CAPACITY 4000 KG', { bg: '#d8c8a0', fg: '#141414', w: 512, h: 96, size: 58 }), planeGeo(0.56, 0.11), 1.25, 2.1, 0.0185);
  sideN.geo(B, labelMat('FREIGHT ONLY · NO PASSENGERS', { bg: '#d8c8a0', fg: '#8a1c14', w: 512, h: 64, size: 30 }), planeGeo(0.56, 0.07), 1.25, 1.94, 0.0185);
  sideN.cbox(B, mat('wood', { color: 0x4a3426 }), 0.25, 1.7, 0.016, 0.36, 0.46, 0.02, 0.004);
  sideN.geo(B, labelMat('INSPECTION  No. 4417', { bg: '#ece6d6', fg: '#2a2a2a', w: 256, h: 64, size: 22, font: 'serif', weight: '600' }), planeGeo(0.3, 0.075), 0.25, 1.86, 0.027);
  sideN.geo(B, decalMat('paper'), planeGeo(0.3, 0.3), 0.25, 1.64, 0.026);
  back.geo(B, labelMat('OPERATOR ONLY', { fg: '#d8a535', w: 1024, h: 160, size: 120 }), planeGeo(2.2, 0.34), 0, 2.55, 0.013);
  const phone = F(4.25, z1, Math.PI);
  phone.cbox(B, plainMat(0x9a1c14, { roughness: 0.45, metalness: 0.4 }), 0, 1.38, 0.06, 0.26, 0.34, 0.12, 0.01);
  phone.cbox(B, plainMat(0x111111, { roughness: 0.5 }), 0, 1.4, 0.125, 0.16, 0.2, 0.012, 0.004);
  phone.geo(B, labelMat('EMERGENCY', { bg: '#9a1c14', fg: '#f2eee2', w: 256, h: 48, size: 30 }), planeGeo(0.2, 0.04), 0, 1.6, 0.121);
  // ceiling: riveted plate with a hatch, channel beams, a dead batten light
  const cm = mat('plateDark'), cy = h;
  const ceilQuad = (xa, xb, za, zb) => B.quad(cm, [X(xa), cy, Z(za)], [X(xb), cy, Z(za)], [X(xb), cy, Z(zb)], [X(xa), cy, Z(zb)], 0, -1, 0,
    [[X(xa) / 2.4, Z(za) / 2.4], [X(xb) / 2.4, Z(za) / 2.4], [X(xb) / 2.4, Z(zb) / 2.4], [X(xa) / 2.4, Z(zb) / 2.4]]);
  const [hxC, hzC] = LIFT.hatch, hh = 0.45;
  ceilQuad(x0, x1, z0, hzC - hh); ceilQuad(x0, x1, hzC + hh, z1);
  ceilQuad(x0, hxC - hh, hzC - hh, hzC + hh); ceilQuad(hxC + hh, x1, hzC - hh, hzC + hh);
  for (const z of [10.15, 12.75, 14.1]) B.add(dk, cboxGeo(x1 - x0, 0.13, 0.09, 0.01), xform(X((x0 + x1) / 2), cy - 0.065, Z(z)));
  for (const s of [-1, 1]) {
    B.add(dk, cboxGeo(0.98, 0.04, 0.05, 0.006), xform(X(hxC), cy - 0.02, Z(hzC + s * (hh + 0.025))));
    B.add(dk, cboxGeo(0.05, 0.04, 0.98, 0.006), xform(X(hxC + s * (hh + 0.025)), cy - 0.02, Z(hzC)));
    B.add(dk, cylGeo(0.016, 0.016, 0.14, 10), xform(X(hxC + hh + 0.01), cy - 0.035, Z(hzC + s * 0.25), 0, Math.PI / 2));
  }
  const bat = F(4.25, 12.2, 0);
  bat.cbox(B, plainMat(0xc9c9c4, { roughness: 0.5, metalness: 0.2 }), 0, cy - 0.04, 0, 0.14, 0.07, 1.25, 0.012);
  bat.cyl(B, plainMat(0x8a8c88, { roughness: 0.2 }), 0, cy - 0.09, 0, 0.016, 0.016, 1.15, 8, Math.PI / 2);
  // the dark above the hatch: the car's crosshead and the hoist ropes
  const voidM = plainMat(0x040404, { roughness: 1, side: THREE.BackSide, ws: false });
  B.add(voidM, boxGeo(1.1, 1.1, 1.1), xform(X(hxC), cy + 0.55, Z(hzC)));
  B.add(mat('metal', { color: 0x2a2c2e }), cboxGeo(1.08, 0.22, 0.12, 0.01), xform(X(hxC), cy + 0.62, Z(hzC + 0.18)));
  for (const s of [-0.12, 0.0, 0.12]) B.add(plainMat(0x2a2a28, { roughness: 0.5, metalness: 0.7 }), cylGeo(0.012, 0.012, 0.5, 6), xform(X(hxC + s), cy + 0.95, Z(hzC + 0.18)));
  // a toolbox and a coil of cable left in the corners
  const tb = F(1.32, 14.55, 0.25);
  tb.cbox(B, plainMat(0xa8261c, { roughness: 0.4, metalness: 0.5 }), 0, 0.12, 0, 0.5, 0.22, 0.24, 0.012);
  tb.cbox(B, plainMat(0x8a1c14, { roughness: 0.4, metalness: 0.5 }), 0, 0.245, 0, 0.5, 0.03, 0.25, 0.008);
  tb.cbox(B, PM.black, 0, 0.29, 0, 0.3, 0.025, 0.03, 0.01);
  const coil = F(1.45, 9.5, 0);
  for (let k = 0; k < 4; k++) coil.torus(B, plainMat(0xd86a1c, { roughness: 0.55 }), (k % 2) * 0.02, 0.025 + k * 0.03, (k % 2) * 0.015, 0.2, 0.014, Math.PI / 2);
  // the landing outside: a steel portal on the dock face, hazard paint, the floor number and a call station
  const out = F(6, 12, Math.PI / 2);
  for (const s of [-1, 1]) {
    out.cbox(B, dk, s * 1.07, 1.37, 0.05, 0.14, 2.74, 0.1, 0.012);
    out.geo(B, hazardMat(), planeGeo(0.1, 2.6), s * 1.07, 1.3, 0.1005, 0, 0, 0);
  }
  out.cbox(B, dk, 0, 2.68, 0.05, 2.28, 0.16, 0.1, 0.012);
  out.geo(B, labelMat('FREIGHT ELEVATOR  ·  4000 KG', { bg: '#e2ad3b', fg: '#141414', w: 1024, h: 128, size: 72 }), planeGeo(1.7, 0.21), 0, 3.0, 0.004);
  out.geo(B, labelMat(liftFloorLabel(0), { fg: '#e2ad3b', w: 256, h: 192, size: 170 }), planeGeo(0.6, 0.45), -1.65, 1.85, 0.004);
  const call = F(6, 13.42, Math.PI / 2);
  call.cbox(B, brushed, 0, 1.22, 0.012, 0.11, 0.24, 0.024, 0.004);
  call.cyl(B, plainMat(0x1a1b1c), 0, 1.27, 0.03, 0.022, 0.022, 0.012, 12, Math.PI / 2);
  call.cyl(B, plainMat(0x1a1b1c), 0, 1.17, 0.03, 0.022, 0.022, 0.012, 12, Math.PI / 2);
  for (let k = 0; k < 4; k++) B.add(hazardMat(), cachedGeo('liftHz' + k, () => new THREE.PlaneGeometry(k % 2 ? 2.4 : 0.22, k % 2 ? 0.22 : 2.8).rotateX(-Math.PI / 2)),
    xform(X(k === 0 ? 6.12 : k === 2 ? 8.28 : 7.2), 0.006, Z(k === 1 ? 10.7 : k === 3 ? 13.3 : 12)));
}

// ---------- the car at the bottom of the building, where Reach - B4 ends ----------
// The freight lift area's car (area-local): x 33..39, z 8..15, its doors in the west wall at z 10..13.
const ENDCAR = { ai: 9, x0: 33, x1: 39, z0: 8, z1: 15, d0: 10, d1: 13, h: 3.2, top: 2.9 };
function buildEndCar(L, B, a) {
  const { x0, x1, z0, z1, d0, d1, h, top } = ENDCAR, X = (x) => a.offX + x, Z = (z) => a.offZ + z;
  const F = (x, z, rot) => frame(X(x), Z(z), rot);
  const zc = (z0 + z1) / 2, xc = (x0 + x1) / 2, dk = mat('steelDark');
  // walls: the same steel as the car you rode down in - diamond plate to the waist, painted sheet above,
  // stiffeners and timber bumpers. The front wall's u runs against z: u = zc - z.
  const front = F(x0, zc, Math.PI / 2), back = F(x1, zc, -Math.PI / 2), north = F(xc, z0, 0), south = F(xc, z1, Math.PI);
  carWallSpan(B, back, zc - z1, z1 - zc, { rails: true });
  carWallSpan(B, north, x0 - xc, x1 - xc, { rails: true });
  carWallSpan(B, south, x0 - xc, x1 - xc, { rails: true });
  carWallSpan(B, front, zc - z1, zc - d1, { rails: true });
  carWallSpan(B, front, zc - d0, zc - z0, { rails: true });
  carWallSpan(B, front, zc - d1, zc - d0, { low: top + 0.05, top: h, noRibs: true });
  // corner guards
  for (const [cx, cz] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]]) {
    const sx = cx === x0 ? 1 : -1, sz = cz === z0 ? 1 : -1;
    B.add(dk, cboxGeo(0.07, h, 0.008, 0.002), xform(X(cx + sx * 0.035), h / 2, Z(cz + sz * 0.004)));
    B.add(dk, cboxGeo(0.008, h, 0.07, 0.002), xform(X(cx + sx * 0.004), h / 2, Z(cz + sz * 0.035)));
  }
  // the door frame on the inside: posts with hazard paint, a header, a steel sill
  const hw = (d1 - d0) / 2;
  for (const s of [-1, 1]) {
    front.cbox(B, dk, s * (hw + 0.06), top / 2, 0.0, 0.12, top, 0.17, 0.012);
    front.geo(B, hazardMat(), planeGeo(0.1, 1.1), s * (hw + 0.06), 0.6, 0.0851, 0, 0, 0);
  }
  front.cbox(B, dk, 0, top + 0.06, 0.0, (d1 - d0) + 0.24, 0.12, 0.17, 0.012);
  front.cbox(B, plainMat(0xb4b8bc, { roughness: 0.36, metalness: 0.9 }), 0, 0.006, -0.05, d1 - d0, 0.012, 0.2, 0.002);
  // the floor: worn plate, grime toward the doors, boot prints, a dark patch nobody cleaned
  const flat = (k, w, d) => cachedGeo('endDecal' + k + w + d, () => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2));
  B.add(decalMat('grime'), flat('g', 2.6, 3.2), xform(X(34.4), 0.006, Z(11.5), 0.2));
  B.add(decalMat('boots'), flat('b', 0.8, 1.8), xform(X(35.2), 0.007, Z(12.4), -1.4));
  B.add(decalMat('oil'), flat('o', 1.0, 1.0), xform(X(37.8), 0.007, Z(14.0), 0.7));
  B.add(decalMat('blood'), flat('d', 0.9, 0.9), xform(X(38.3), 0.008, Z(9.0), 2.2));
  // the operating panel beside the doors: brushed steel, a short column of buttons, a key switch, an alarm
  const brushed = plainMat(0x9ea3a8, { roughness: 0.3, metalness: 0.9 });
  const pf = F(x0, d1 + 0.75, Math.PI / 2);
  pf.cbox(B, brushed, 0, 1.35, 0.012, 0.32, 0.8, 0.024, 0.006);
  pf.geo(B, labelMat('FREIGHT  ·  CAR 1', { fg: '#1b1e21', w: 256, h: 48, size: 30 }), planeGeo(0.26, 0.048), 0, 1.69, 0.0245);
  const ring = plainMat(0x1a1b1c, { roughness: 0.4, metalness: 0.5 }), btn = plainMat(0xd8d4c8, { roughness: 0.35 });
  const labels = ['G', 'B1', 'B2', 'B3', 'B4'];
  labels.forEach((lb, i) => {
    const by = 1.6 - i * 0.075;
    pf.cyl(B, ring, -0.05, by, 0.028, 0.022, 0.022, 0.01, 14, Math.PI / 2);
    pf.cyl(B, btn, -0.05, by, 0.034, 0.016, 0.016, 0.008, 12, Math.PI / 2);
    pf.geo(B, labelMat(lb, { fg: '#1b1e21', w: 64, h: 32, size: 24 }), planeGeo(0.06, 0.03), 0.05, by, 0.0245);
  });
  pf.cyl(B, plainMat(0xb81c12, { roughness: 0.3 }), 0, 1.08, 0.04, 0.034, 0.032, 0.03, 16, Math.PI / 2);
  pf.cyl(B, ring, 0.09, 1.08, 0.03, 0.018, 0.018, 0.014, 12, Math.PI / 2);
  // signs: capacity, no passengers, and a plate someone screwed on long after the rest
  const plate = plainMat(0x2a2c2e, { roughness: 0.5, metalness: 0.6 });
  north.cbox(B, plate, 1.6, 2.02, 0.012, 0.62, 0.34, 0.012, 0.004);
  north.geo(B, labelMat('CAPACITY 4000 KG', { bg: '#d8c8a0', fg: '#141414', w: 512, h: 96, size: 58 }), planeGeo(0.56, 0.11), 1.6, 2.1, 0.0185);
  north.geo(B, labelMat('FREIGHT ONLY · NO PASSENGERS', { bg: '#d8c8a0', fg: '#8a1c14', w: 512, h: 64, size: 30 }), planeGeo(0.56, 0.07), 1.6, 1.94, 0.0185);
  const sub = F(x0, d0 - 0.8, Math.PI / 2);
  sub.cbox(B, plate, 0, 1.85, 0.012, 0.5, 0.3, 0.012, 0.004);
  sub.geo(B, labelMat('SUBLEVEL ACCESS', { bg: '#141414', fg: '#d8a535', w: 512, h: 64, size: 40 }), planeGeo(0.44, 0.06), 0, 1.93, 0.0185);
  sub.geo(B, labelMat('B4 · B5', { bg: '#141414', fg: '#d8a535', w: 512, h: 96, size: 72 }), planeGeo(0.44, 0.09), 0, 1.81, 0.0185);
  back.geo(B, labelMat('CAR 1', { fg: '#d8a535', w: 512, h: 192, size: 170 }), planeGeo(1.4, 0.52), 0, 2.45, 0.013);
  // ceiling: channel beams across, the lamp housing in the middle
  for (const x of [34.6, 36.0, 37.4]) B.add(dk, cboxGeo(0.09, 0.13, z1 - z0, 0.01), xform(X(x), h - 0.065, Z(zc)));
  // a coil of chain and a crate left in the back corner
  const crate = F(38.2, 14.2, 0.2);
  crate.cbox(B, mat('wood', { color: 0x7a5a3a }), 0, 0.35, 0, 0.9, 0.7, 0.7, 0.02);
  for (const y of [0.12, 0.58]) crate.cbox(B, mat('wood', { color: 0x5a3e28 }), 0, y, 0, 0.92, 0.08, 0.72, 0.01);
}
// the car's lamp and the display over its doors, which show what is happening to it in the ending
function buildEndCarDynamic(L) {
  const a = L.areas[ENDCAR.ai]; if (!a || a.theme !== 'lift') return;
  const G = World.lightGroups[ENDCAR.ai], dk = mat('steelDark');
  const lx = a.offX + 36, lz = a.offZ + 11.5;
  const lamp = new THREE.Group(); lamp.position.set(lx, ENDCAR.h - 0.03, lz);
  lamp.add(new THREE.Mesh(cylGeo(0.12, 0.14, 0.05, 16), dk));
  const bulbM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffe8c8, emissiveIntensity: 0 });
  const bulb = new THREE.Mesh(sphereGeo(0.055, 12, 10), bulbM); bulb.position.y = -0.11; lamp.add(bulb);
  for (const y of [-0.08, -0.15]) { const r = new THREE.Mesh(torusGeo(0.09, 0.006, 4, 18), dk); r.rotation.x = Math.PI / 2; r.position.y = y; lamp.add(r); }
  for (let k = 0; k < 4; k++) { const bar = new THREE.Mesh(boxGeo(0.008, 0.14, 0.008), dk); bar.position.set(Math.cos(k * Math.PI / 2) * 0.09, -0.11, Math.sin(k * Math.PI / 2) * 0.09); lamp.add(bar); }
  World.areas[ENDCAR.ai].group.add(lamp);
  const spot = addLightSpot({ x: lx, y: 2.95, z: lz, color: 0xffe8c8, base: 11, range: 8, area: ENDCAR.ai, grp: G.manual, kind: 'endcar', halo: false });
  spot.mul = 0;
  // the display: amber segments behind smoked glass
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
  const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
  const disp = new THREE.Group();
  disp.position.set(a.offX + ENDCAR.x0 + 0.05, ENDCAR.top + 0.2, a.offZ + (ENDCAR.d0 + ENDCAR.d1) / 2); disp.rotation.y = Math.PI / 2;
  disp.add(new THREE.Mesh(cboxGeo(0.62, 0.2, 0.06, 0.01), dk));
  const face = new THREE.Mesh(planeGeo(0.52, 0.16), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.z = 0.032; disp.add(face);
  World.areas[ENDCAR.ai].group.add(disp);
  World.endCar = { spot, bulbM, canvas: cv, tex, text: null, lamp };
  setEndIndicator('B4', '');
}
// what the display shows: big segments, and an arrow while the car moves
function setEndIndicator(text, arrow, dim = 1) {
  const E = World.endCar; if (!E) return;
  const key = text + '|' + arrow + '|' + dim.toFixed(2);
  if (E.text === key) return;
  E.text = key;
  const g = E.canvas.getContext('2d'), w = E.canvas.width, h = E.canvas.height;
  g.fillStyle = '#0a0604'; g.fillRect(0, 0, w, h);
  g.font = '700 70px "Martian Mono", "Courier New", monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
  // the unlit segments behind
  g.fillStyle = 'rgba(255,140,40,0.07)'; g.fillText('888', w / 2 + 18, h / 2 + 4);
  g.fillStyle = 'rgba(255,' + Math.round(150 * dim) + ',40,' + (0.25 + 0.75 * dim) + ')';
  g.shadowColor = 'rgba(255,120,30,0.9)'; g.shadowBlur = 14 * dim;
  if (text) g.fillText(text, w / 2 + 18, h / 2 + 4);
  if (arrow) { g.font = '700 46px "Martian Mono", monospace'; g.fillText(arrow, 30, h / 2 + 2); }
  g.shadowBlur = 0;
  E.tex.needsUpdate = true;
}

// ---------- moving parts: the hoistway landings, the landing doors, the car gate, the lamp, the floor dial ----------
function makeLandingDoors(label) {
  const paint = mat('metal', { color: 0x5d6656 }), dk = mat('steelDark');
  const g = new THREE.Group();
  const leaf = (upper) => {
    const p = new THREE.Group();
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
    add(cboxGeo(0.045, 1.32, 2.12, 0.008, 1.2), paint, 0, 0.66, 0);
    for (const y of [0.24, 0.66, 1.08]) add(cboxGeo(0.03, 0.07, 2.02, 0.008), paint, -0.035, y, 0);
    if (upper) {
      add(boxGeo(0.07, 0.05, 2.12), PM.rubber, 0, 0.025, 0);
      add(planeGeo(0.62, 0.36), labelMat(label, { fg: '#e8e4d6', w: 256, h: 160, size: 140 }), -0.056, 0.85, 0.42, -Math.PI / 2);
      add(planeGeo(0.05, 0.42), plainMat(0x9a8a62, { roughness: 0.9, side: THREE.DoubleSide }), -0.06, -0.17, -0.55, -Math.PI / 2);
    } else {
      add(boxGeo(0.07, 0.06, 2.12), hazardMat(), 0, 1.29, 0);
    }
    for (const s of [-1, 1]) add(boxGeo(0.05, 1.3, 0.04), dk, 0.0, 0.66, s * 1.04);
    g.add(p);
    return p;
  };
  const lower = leaf(false), upper = leaf(true);
  upper.position.y = 1.3;
  return { g, upper, lower };
}
function buildHoistSegment(n) {
  // one floor of hoistway wall around a landing opening; local origin is the landing sill at the hoistway face, +x toward the landing
  const S = LIFT.S, grp = new THREE.Group(), B = new Batch();
  const conc = mat('concreteDark'), dk = mat('steelDark');
  const blk = (x0, x1, y0, y1, z0, z1, m = conc) => B.add(m, cboxGeo(x1 - x0, y1 - y0, z1 - z0, 0.01, 2.4), xform((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  blk(0, 0.92, 0, S, -2.4, -1.0);
  blk(0, 0.92, 0, S, 1.0, 2.4);
  blk(0, 0.92, LIFT.dh, S, -1.0, 1.0);
  // the opening: floor, cheeks and soffit, a steel sill and the toe guard hanging below it
  blk(0, 0.92, -0.25, 0, -1.0, 1.0, mat('floor'));
  B.add(plainMat(0xb4b8bc, { roughness: 0.36, metalness: 0.9 }), cboxGeo(0.16, 0.014, 2.0, 0.003), xform(0.02, 0.003, 0));
  B.add(mat('metal', { color: 0x3a3e40 }), cboxGeo(0.012, 0.75, 2.04, 0.002), xform(-0.03, -0.37, 0, 0, 0, -0.08));
  // floor slab edge, painted number, a stripe of hazard paint, a conduit, a junction box, a hoistway lamp
  blk(-0.06, 0.0, -0.5, -0.25, -2.4, 2.4, mat('concrete'));
  const f = frame(0, 0, -Math.PI / 2);
  f.geo(B, labelMat(liftFloorLabel(n), { fg: '#d8a535', w: 256, h: 192, size: 170 }), planeGeo(0.62, 0.46), 1.6, 1.75, 0.004);
  f.geo(B, labelMat(liftFloorLabel(n), { fg: '#d8a535', w: 256, h: 192, size: 170 }), planeGeo(0.62, 0.46), -1.6, 1.75, 0.004);
  f.geo(B, hazardMat(), planeGeo(4.6, 0.16), 0, -0.375, 0.061, 0, 0, 0);
  f.cyl(B, mat('steel', { color: 0x8a8e92 }), 2.15, S / 2, 0.04, 0.025, 0.025, S, 10);
  f.cbox(B, mat('metal', { color: 0x6a6e72 }), 2.15, 1.4, 0.06, 0.18, 0.24, 0.1, 0.01);
  f.cbox(B, dk, -1.75, 3.35, 0.05, 0.16, 0.08, 0.1, 0.01);
  for (let k = 0; k < 3; k++) f.geo(B, decalMat('grime'), planeGeo(0.9, 1.6), -1.8 + k * 1.9, 3.0 + k * 0.3, 0.003, 0, 0, 0);
  B.build(grp, {});
  const bulbM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc890, emissiveIntensity: 2.4 });
  const bulb = new THREE.Mesh(sphereGeo(0.045, 10, 8), bulbM); bulb.position.set(-0.11, 3.24, -1.75); grp.add(bulb);
  const cage = new THREE.Mesh(sphereGeo(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0x222426, wireframe: true, roughness: 0.6, metalness: 0.5 })); cage.position.copy(bulb.position); grp.add(cage);
  const doors = makeLandingDoors(liftFloorLabel(n));
  doors.g.position.set(0.085, 0, 0);
  grp.add(doors.g);
  return { grp, doors, bulbM, n };
}
const _gateM4 = new THREE.Matrix4(), _gateQ = new THREE.Quaternion(), _gateE = new THREE.Euler(), _gateP = new THREE.Vector3(), _gateS = new THREE.Vector3();
function buildGate() {
  const N = 19, TIERS = 8, m = plainMat(0x26282a, { roughness: 0.42, metalness: 0.7, ws: false });
  const bars = new THREE.InstancedMesh(boxGeo(0.008, 2.44, 0.016), m, N);
  const links = new THREE.InstancedMesh(boxGeo(0.006, 1, 0.012), m, (N - 1) * TIERS * 2);
  bars.castShadow = links.castShadow = true;
  bars.frustumCulled = links.frustumCulled = false;
  const g = new THREE.Group(); g.add(bars, links);
  const handle = new THREE.Mesh(cboxGeo(0.05, 0.16, 0.03, 0.008), plainMat(0x111111, { roughness: 0.5 })); g.add(handle);
  return { g, bars, links, handle, N, TIERS };
}
function poseGate(G, open) {
  // bars hang from the top track; the fixed end is past the door, the leading bar slides from one jamb to the other
  const fixedZ = 1.32, leadZ = lerp(-1.0, 1.0, open), N = G.N, s = (fixedZ - leadZ) / (N - 1);
  const xBar = 0.0, y0 = 0.12, th = 2.3 / G.TIERS;
  for (let k = 0; k < N; k++) {
    _gateP.set(xBar, 1.3, fixedZ - k * s); _gateQ.identity(); _gateS.set(1, 1, 1);
    G.bars.setMatrixAt(k, _gateM4.compose(_gateP, _gateQ, _gateS));
  }
  let li = 0;
  for (let k = 0; k < N - 1; k++) for (let j = 0; j < G.TIERS; j++) for (const dir of [1, -1]) {
    const za = fixedZ - k * s, zb = fixedZ - (k + 1) * s, ya = y0 + j * th + (dir > 0 ? 0 : th), yb = y0 + j * th + (dir > 0 ? th : 0);
    const len = Math.hypot(zb - za, yb - ya), ang = Math.atan2(zb - za, yb - ya);
    _gateP.set(dir > 0 ? -0.01 : 0.01, (ya + yb) / 2, (za + zb) / 2);
    _gateQ.setFromEuler(_gateE.set(ang, 0, 0));
    _gateS.set(1, len, 1);
    G.links.setMatrixAt(li++, _gateM4.compose(_gateP, _gateQ, _gateS));
  }
  G.bars.instanceMatrix.needsUpdate = true; G.links.instanceMatrix.needsUpdate = true;
  G.handle.position.set(-0.03, 1.15, leadZ);
}
function buildLiftDynamic(L) {
  const a = L.areas[0], G0 = World.lightGroups[0];
  // the caged lamp, off to the side of the roof hatch
  const fx = a.offX + 1.35, fz = a.offZ + 12.2;
  const lamp = new THREE.Group(); lamp.position.set(fx, LIFT.h - 0.03, fz);
  const dk = mat('steelDark');
  lamp.add(new THREE.Mesh(cylGeo(0.1, 0.12, 0.05, 16), dk));
  const bulbM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffe8c8, emissiveIntensity: 3.2 });
  const bulb = new THREE.Mesh(sphereGeo(0.05, 12, 10), bulbM); bulb.position.y = -0.1; lamp.add(bulb);
  for (const y of [-0.07, -0.14]) { const ring = new THREE.Mesh(torusGeo(0.08, 0.006, 4, 18), dk); ring.rotation.x = Math.PI / 2; ring.position.y = y; lamp.add(ring); }
  for (let k = 0; k < 4; k++) { const bar = new THREE.Mesh(boxGeo(0.008, 0.13, 0.008), dk); bar.position.set(Math.cos(k * Math.PI / 2) * 0.08, -0.1, Math.sin(k * Math.PI / 2) * 0.08); lamp.add(bar); }
  World.areas[0].group.add(lamp);
  World.liftBulb = bulbM;
  addLightSpot({ x: fx, y: 2.98, z: fz, color: 0xffe8c8, base: 12, range: 6, area: 0, grp: G0.manual, kind: 'lift', lift: true, halo: false });
  // the floor dial over the door, its needle swings as the floors go by
  const dialTex = canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#d8d0b8'; g.beginPath(); g.arc(128, 140, 120, Math.PI, 0); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 4; g.beginPath(); g.arc(128, 140, 120, Math.PI, 0); g.stroke();
    g.fillStyle = '#1a1a1a'; g.font = '700 22px "Big Shoulders Stencil Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k <= 10; k++) {
      const ang = Math.PI + (k / 10) * Math.PI, cx = 128 + Math.cos(ang) * 96, cy = 140 + Math.sin(ang) * 96;
      g.fillText(k === 0 ? 'G' : 'B' + k, cx, cy);
      g.lineWidth = 3; g.beginPath(); g.moveTo(128 + Math.cos(ang) * 112, 140 + Math.sin(ang) * 112); g.lineTo(128 + Math.cos(ang) * 120, 140 + Math.sin(ang) * 120); g.stroke();
    }
    const r = mulberry32(77);
    for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(90,70,40,' + r() * 0.12 + ')'; g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4); }
  });
  const dial = new THREE.Group();
  dial.position.set(a.offX + LIFT.x1 - 0.02, 2.84, a.offZ + 12); dial.rotation.y = -Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32, 0, Math.PI), new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.5 }));
  face.geometry = (() => { const g = new THREE.CircleGeometry(0.26, 32, 0, Math.PI); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) / 0.26) * 0.47 + 0.5, (p.getY(i) / 0.26) * 0.75 + 0.125); return g; })();
  dial.add(face);
  const rim = new THREE.Mesh(torusGeo(0.265, 0.012, 6, 32, Math.PI), plainMat(0x8a7a52, { roughness: 0.3, metalness: 0.9 })); dial.add(rim);
  const needle = new THREE.Group(); needle.position.z = 0.012; dial.add(needle);
  const nm = new THREE.Mesh(boxGeo(0.012, 0.2, 0.004), plainMat(0x9a1c14, { roughness: 0.4 })); nm.position.y = 0.1; needle.add(nm);
  const hub = new THREE.Mesh(cylGeo(0.02, 0.02, 0.012, 12), plainMat(0x1a1a1a, { roughness: 0.4, metalness: 0.6 })); hub.rotation.x = Math.PI / 2; needle.add(hub);
  World.areas[0].group.add(dial);
  // the gate
  const gate = buildGate();
  gate.g.position.set(a.offX + LIFT.gateX, 0, a.offZ + 12);
  World.areas[0].group.add(gate.g);
  // three floors of hoistway; B4 is the one you arrive at and stays
  Lift.segs = [0, 1, 2].map((n) => { const s = buildHoistSegment(n); s.grp.position.set(a.offX + LIFT.hx, 0, a.offZ + 12); World.areas[0].group.add(s.grp); return s; });
  Object.assign(Lift, { ready: true, gate, needle, dial, travel: 2 * LIFT.S, p: 2 * LIFT.S, doorOpen: 1, gateOpen: 1, intro: false, passed: new Set(), lastP: 2 * LIFT.S });
  poseGate(gate, 1);
  placeLift(Lift.travel);
  World.arrivalDoors = null;
}
// where the car is: p metres below B2; at p = travel it sits level with B4
function placeLift(p) {
  const S = LIFT.S, T = Lift.travel;
  for (const s of Lift.segs) {
    const y = (liftGoesUp() ? -1 : 1) * (s.n * S - (T - p));
    s.grp.position.y = y;
    s.grp.visible = y > -S - 0.5 && y < 3.6;
  }
  // the needle: B2 at p = 0, B4 at the end
  const level = liftGoesUp() ? 5 - 5 * p / T : 2 + p / S;
  Lift.needle.rotation.z = Math.PI / 2 - (level / 10) * Math.PI;
}
// the ride: steady all the way down; when the power dies the car drops the last few centimetres of free cable
// and the safety brakes bite, dead level with B4, with a short hard bounce
function liftTravelAt(T) {
  const total = 2 * LIFT.S, p0 = 0.35, drop = 0.42, out = RIDE.out, slam = RIDE.slam;
  const v = (total - drop - p0) / out;
  if (T < out) return p0 + v * T;
  if (T < slam) { const u = T - out, d = slam - out, a = 2 * (drop - v * d) / (d * d); return total - drop + v * u + 0.5 * a * u * u; }
  const u = T - slam;
  return total + 0.035 * Math.exp(-u * 7) * Math.sin(u * 38);
}
function setLiftDoors(open, dt) {
  Lift.doorOpen = dt ? damp(Lift.doorOpen, open ? 1 : 0, 2.2, dt) : (open ? 1 : 0);
  const d = Lift.segs[0].doors, k = smooth01(Lift.doorOpen);
  d.upper.position.y = 1.3 + k * 1.34; d.lower.position.y = -k * 1.32;
  for (const s of Lift.segs) if (s !== Lift.segs[0]) { s.doors.upper.position.y = 1.3; s.doors.lower.position.y = 0; }
}
function setLiftGate(open, dt) {
  const before = Lift.gateOpen;
  Lift.gateOpen = dt ? damp(Lift.gateOpen, open ? 1 : 0, 2.6, dt) : (open ? 1 : 0);
  if (Math.abs(Lift.gateOpen - before) > 1e-4 || Lift.gateDirty) { poseGate(Lift.gate, Lift.gateOpen); Lift.gateDirty = false; }
}
// called from the intro every frame
function updateLiftIntro(dt, T) {
  if (!Lift.ready) return;
  const p = liftTravelAt(T);
  placeLift(p);
  // a soft clack as each landing sill passes the car sill
  for (const n of [1, 2]) {
    const y = n * LIFT.S - (Lift.travel - p);
    if (!Lift.passed.has(n) && y > 0.02 && y < 0.6) { Lift.passed.add(n); Sound.play('clunk', liftPt(LIFT.hx, 0.2, 12)); R.shake = Math.max(R.shake || 0, 0.12); }
  }
  // the light of the hoistway lamps sweeps through the gate as they pass - on the same failing supply as the car
  const power = T < RIDE.flick ? 1 : T < RIDE.out ? (Cinema.flickOn ? 0.8 : 0.05) : 0;
  let best = null, bestK = 0;
  for (const s of Lift.segs) {
    const ly = s.grp.position.y + 3.24, k = Math.pow(clamp(1 - Math.abs(ly - 1.4) / 2.6, 0, 1), 1.6);
    s.bulbM.emissiveIntensity = 2.4 * power * (Math.random() < 0.015 ? 0.2 : 1);
    if (k > bestK) { bestK = k; best = s; }
  }
  if (best && power > 0) {
    const a = Game.L.areas[0];
    R.backlight.position.set(a.offX + LIFT.hx - 0.2, best.grp.position.y + 3.2, a.offZ + 12 - 1.75);
    R.backlight.color.setHex(0xffb070);
    R.backlight.distance = 7;
    R.backlight.intensity = 9 * bestK * power;
  } else R.backlight.intensity = 0;
  const atLanding = T >= RIDE.slam;
  setLiftDoors(atLanding && Cinema.doorsOpen, dt);
  setLiftGate(atLanding && T > RIDE.gate, dt);
  // the car hums and shivers while it moves, and judders while the motor fights the failing power
  const moving = Math.abs(p - Lift.lastP) / Math.max(dt, 1e-3);
  Lift.lastP = p;
  if (moving > 0.05) R.shake = Math.max(R.shake || 0, (T > RIDE.flick && T < RIDE.out ? 0.32 : 0.12) + Math.random() * 0.05);
}
function startLiftIntro() {
  if (!Lift.ready) return;
  Lift.passed = new Set(); Lift.lastP = liftTravelAt(0);
  setLiftDoors(false); setLiftGate(false); Lift.gateDirty = true; setLiftGate(false);
  for (const s of Lift.segs) s.grp.visible = true;
  placeLift(Lift.lastP);
}
// in play the car sits at B4, doors and gate open
function settleLift() {
  if (!Lift.ready) return;
  placeLift(Lift.travel);
  setLiftDoors(true); setLiftGate(true); Lift.gateDirty = true; setLiftGate(true);
  R.backlight.intensity = 0; R.backlight.distance = 16;
}
