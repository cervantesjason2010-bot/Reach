// ================= the end of Reach - B4: the doors, the drop, and what is waiting on B5 =================
// Everyone is in the freight car. The doors grind shut - and it gets a hand into the gap. The brakes let go and
// the car falls away under it. Then the long ride down past where the shaft is supposed to end, the booms
// coming up from below, the lights dying at the bottom. The doors open on B5: a hospital corridor in the
// dark, a light that sputters on halfway down it, and at the end of it, filling it, something enormous with
// its back to you. It turns. Black. SEIZE - B5. Then the results and the credits.
const END_T = {
  close: 0.35, arm: 1.7, drop: 4.85, back: 5.25, radio1: 6.0, boom1: 8.2, radio2: 9.3, boom2: 10.8, radio3: 11.7,
  slow: 12.2, stop: 12.9, cut: 13.4, torch: 14.0, open: 14.7, tube: 16.0, push: 16.4, grunt: 18.3, turn: 19.4, bang: 20.4,
  title: 20.95, soon: 21.9, screen: 25.8,
};

// ---------- the set on B5 ----------
// Built off to one side of the world, away from everything (x, z negative), with its own neutral shading: a
// stretch of the freight car, its doors, and the corridor they open on.
const TEASER = { ox: -160, oz: -160, group: null, doors: null, tube: null };
function buildTeaserSet() {
  if (TEASER.group) return TEASER;
  const grp = new THREE.Group(); grp.name = 'teaser';
  const B = new Batch(), O = TEASER;
  const F = (x, z, rot) => frame(O.ox + x, O.oz + z, rot);
  const W = (x, y, z) => [O.ox + x, y, O.oz + z];
  const dk = mat('steelDark');
  // ---- the car: a box 4 wide, 3.5 deep, the doors in its front wall at z = 0 ----
  const quad = (m, a, b, c, d, n, s = 2.4) => B.quad(m, a, b, c, d, n[0], n[1], n[2], [[a[0] / s, a[2] / s + a[1] / s], [b[0] / s, b[2] / s + b[1] / s], [c[0] / s, c[2] / s + c[1] / s], [d[0] / s, d[2] / s + d[1] / s]]);
  quad(mat('tread'), W(-2, 0, 0), W(2, 0, 0), W(2, 0, -3.5), W(-2, 0, -3.5), [0, 1, 0]);
  quad(mat('plateDark'), W(-2, 3.2, -3.5), W(2, 3.2, -3.5), W(2, 3.2, 0), W(-2, 3.2, 0), [0, -1, 0]);
  carWallSpan(B, F(0, -3.5, 0), -2, 2, { rails: true });
  carWallSpan(B, F(-2, -1.75, Math.PI / 2), -1.75, 1.75, { rails: true });
  carWallSpan(B, F(2, -1.75, -Math.PI / 2), -1.75, 1.75, { rails: true });
  const front = F(0, 0, Math.PI);
  carWallSpan(B, front, -2, -1.5, { rails: true }); carWallSpan(B, front, 1.5, 2, { rails: true });
  carWallSpan(B, front, -1.5, 1.5, { low: 2.95, top: 3.2, noRibs: true });
  for (const s of [-1, 1]) { front.cbox(B, dk, s * 1.56, 1.45, 0.0, 0.12, 2.9, 0.17, 0.012); front.geo(B, hazardMat(), planeGeo(0.1, 1.1), s * 1.56, 0.6, 0.0851, 0, 0, 0); }
  front.cbox(B, dk, 0, 2.96, 0.0, 3.24, 0.12, 0.17, 0.012);
  // the display over the doors, dead now except for the number it stopped on
  front.cbox(B, dk, 0, 3.12, 0.04, 0.62, 0.15, 0.06, 0.01);
  front.geo(B, labelMat('B5', { bg: '#0a0604', fg: '#ff8a28', w: 256, h: 96, size: 70, font: '"Martian Mono", monospace', weight: '700', glow: '#ff7a20', gi: 1.2 }), planeGeo(0.52, 0.12), 0, 3.12, 0.072);
  // ---- the corridor: old hospital tile to the waist, sick green paint above, a handrail, the ceiling grid ----
  const L0 = 0.05, L1 = 24, HW = 1.6, CH = 3.0;
  const tile = mat('tile', { color: 0xbcc6b8 }), paint = mat('paint', { color: 0x7e8c7c }), floorM = mat('tilefloor', { color: 0x8e8c80 }), ceilM = mat('panel', { color: 0x9a9a90 });
  quad(floorM, W(-HW, 0, L1), W(HW, 0, L1), W(HW, 0, L0), W(-HW, 0, L0), [0, 1, 0]);
  // the doors along it: [z, side] - openings into rooms nobody has lit in years
  const doorsAt = [[4.2, 1], [8.6, -1], [13.4, 1], [19.6, -1]];
  for (const side of [-1, 1]) {
    const x = side * HW, nx = -side;
    // wall faces, broken where the doorways are
    let z = L0;
    const spans = doorsAt.filter((d) => d[1] === side).map((d) => [d[0] - 0.65, d[0] + 0.65]).concat([[L1, L1]]);
    for (const [a, b] of spans) {
      if (a > z) {
        const za = side > 0 ? a : z, zb = side > 0 ? z : a;
        quad(tile, W(x, 0, za), W(x, 0, zb), W(x, 1.25, zb), W(x, 1.25, za), [nx, 0, 0]);
        quad(paint, W(x, 1.25, za), W(x, 1.25, zb), W(x, CH, zb), W(x, CH, za), [nx, 0, 0]);
        // handrail and its brackets, the bumper strip
        const mz = (a + z) / 2, len = a - z;
        B.add(mat('wood', { color: 0x5a4434 }), cboxGeo(0.06, 0.07, len - 0.1, 0.012), xform(O.ox + x + nx * 0.07, 0.92, O.oz + mz));
        for (let k = z + 0.4; k < a - 0.2; k += 1.4) B.add(dk, cboxGeo(0.07, 0.03, 0.03, 0.004), xform(O.ox + x + nx * 0.035, 0.9, O.oz + k));
        B.add(plainMat(0x2a2c2a, { roughness: 0.8 }), cboxGeo(0.02, 0.12, len, 0.004), xform(O.ox + x + nx * 0.01, 0.28, O.oz + mz));
      }
      if (b > a) {
        // the doorway: frame, lintel above, and the black room behind
        const dz = (a + b) / 2;
        quad(paint, W(x, 2.2, side > 0 ? b : a), W(x, 2.2, side > 0 ? a : b), W(x, CH, side > 0 ? a : b), W(x, CH, side > 0 ? b : a), [nx, 0, 0]);
        for (const s2 of [-1, 1]) B.add(mat('wood', { color: 0x6a5a48 }), cboxGeo(0.12, 2.2, 0.08, 0.01), xform(O.ox + x + nx * 0.02, 1.1, O.oz + dz + s2 * 0.66));
        B.add(mat('wood', { color: 0x6a5a48 }), cboxGeo(0.12, 0.1, 1.4, 0.01), xform(O.ox + x + nx * 0.02, 2.2, O.oz + dz));
        B.add(plainMat(0x030303, { roughness: 1, side: THREE.BackSide, ws: false }), boxGeo(3, 2.4, 1.3), xform(O.ox + x - nx * 1.5, 1.15, O.oz + dz));
        B.add(mat('tilefloor', { color: 0x5a5a52 }), cachedGeo('tzRoomFloor', () => new THREE.PlaneGeometry(1.3, 1.6).rotateX(-Math.PI / 2)), xform(O.ox + x - nx * 0.8, 0.003, O.oz + dz));
      }
      z = Math.max(z, b);
    }
  }
  // the end wall, lost in the dark
  quad(paint, W(HW, 0, L1), W(-HW, 0, L1), W(-HW, CH, L1), W(HW, CH, L1), [0, 0, -1]);
  // ceiling: the grid, with panels missing and wires hanging out of the holes
  const holes = new Set(['0,3', '1,7', '0,10', '1,15', '0,21']);
  for (let zi = 0; zi < Math.ceil((L1 - L0) / 1.2); zi++) for (let xi = 0; xi < 2; xi++) {
    const za = L0 + zi * 1.2, zb = Math.min(L1, za + 1.2), xa = -HW + xi * HW, xb = xa + HW;
    if (holes.has(xi + ',' + zi)) {
      B.add(plainMat(0x020202, { roughness: 1, side: THREE.BackSide, ws: false }), boxGeo(HW, 0.6, zb - za), xform(O.ox + (xa + xb) / 2, CH + 0.3, O.oz + (za + zb) / 2));
      B.add(plainMat(0x18181a, { roughness: 0.6 }), tubeGeo(cablePts([xa + 0.3, CH + 0.2, za + 0.4], [xa + 0.6, CH - 0.7, za + 0.7], 0.2, 6), 0.012, 10, 5), xform(O.ox, 0, O.oz));
      continue;
    }
    quad(ceilM, W(xa, CH, za), W(xb, CH, za), W(xb, CH, zb), W(xa, CH, zb), [0, -1, 0], 1.2);
  }
  for (let zz = L0; zz <= L1; zz += 1.2) B.add(plainMat(0x8a8a84, { roughness: 0.5, metalness: 0.4 }), boxGeo(HW * 2, 0.02, 0.03), xform(O.ox, CH - 0.01, O.oz + zz));
  // what was left in it: a gurney on its side, a wheelchair, an IV stand down across the floor, paper everywhere
  const gf = F(0.85, 5.6, 0.35), steelP = PM.chrome, mattress = mat('fabric', { color: 0x6a7a74 });
  gf.cbox(B, mattress, 0, 0.45, 0, 0.12, 0.62, 1.9, 0.04, 0, 1, 0, Math.PI / 2 - 0.1);
  gf.cbox(B, steelP, -0.2, 0.42, 0, 0.04, 0.7, 1.95, 0.01, 0, 1, 0, Math.PI / 2 - 0.1);
  for (const s of [-0.8, 0.8]) gf.cyl(B, steelP, 0.22, 0.42, s, 0.012, 0.012, 0.9, 8, 0, Math.PI / 2);
  const wf = F(-1.05, 9.9, 2.4);
  wf.cbox(B, mat('fabric', { color: 0x1c1d1e }), 0, 0.5, 0, 0.46, 0.05, 0.44, 0.01);
  wf.cbox(B, mat('fabric', { color: 0x1c1d1e }), 0, 0.78, -0.22, 0.46, 0.5, 0.04, 0.01, 0, 1, -0.15);
  for (const s of [-1, 1]) { wf.torus(B, PM.rubber, s * 0.27, 0.32, -0.05, 0.3, 0.018, 0); wf.geo(B, steelP, cylGeo(0.01, 0.01, 0.9, 6), s * 0.24, 0.6, -0.1, 0, 0.3, 0); }
  const iv = F(0.6, 11.2, 1.1); iv.cyl(B, steelP, 0, 0.03, 0, 0.012, 0.012, 1.9, 8, 0, Math.PI / 2); iv.cyl(B, steelP, 0.9, 0.03, 0, 0.18, 0.18, 0.02, 10);
  const flat = (k, w, d) => cachedGeo('tzDecal' + k + w + d, () => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2));
  const r = mulberry32(502);
  for (let i = 0; i < 9; i++) B.add(decalMat('paper'), flat('p', 0.8, 0.8), xform(O.ox + (r() - 0.5) * 2.6, 0.006 + i * 0.0004, O.oz + 1.5 + r() * 16, r() * 6));
  for (let i = 0; i < 6; i++) B.add(decalMat('grime'), flat('g', 1.8, 1.8), xform(O.ox + (r() - 0.5) * 2, 0.004, O.oz + 1 + i * 3.6, r() * 6));
  B.add(decalMat('drag'), flat('d', 0.9, 4.0), xform(O.ox + 0.3, 0.008, O.oz + 15.5, 0.08));
  B.add(decalMat('stain'), cachedGeo('tzWallStain', () => new THREE.PlaneGeometry(1.6, 1.6)), xform(O.ox - HW + 0.006, 1.6, O.oz + 6.5, Math.PI / 2));
  B.add(decalMat('cracks'), cachedGeo('tzCrack', () => new THREE.PlaneGeometry(1.0, 1.0).rotateX(-Math.PI / 2)), xform(O.ox - 0.4, 0.007, O.oz + 17.6, 1.2));
  // the ward sign, and the number stencilled on the wall
  const sf = F(-HW + 0.01, 2.6, Math.PI / 2);
  sf.geo(B, labelMat('SUBLEVEL B-5', { bg: '#1c2a24', fg: '#c8d4c0', w: 512, h: 96, size: 56 }), planeGeo(1.1, 0.21), 0, 2.15, 0.0);
  sf.geo(B, labelMat('WARD C  ·  ISOLATION', { bg: '#1c2a24', fg: '#c8d4c0', w: 512, h: 64, size: 34 }), planeGeo(1.1, 0.14), 0, 1.96, 0.0);
  const nf = F(HW - 0.01, 8.0, -Math.PI / 2);
  nf.geo(B, labelMat('B-5', { fg: '#3a1c18', w: 256, h: 128, size: 110 }), planeGeo(0.9, 0.45), 0, 1.75, 0.0);
  B.build(grp, {});
  // ---- moving parts: the car doors, the broken tube light ----
  const left = liftDoorLeaf(3.0, 1), right = liftDoorLeaf(3.0, -1);
  left.position.set(O.ox - 0.75, 0, O.oz + 0.06); right.position.set(O.ox + 0.75, 0, O.oz + 0.06);
  grp.add(left, right);
  const tubeG = new THREE.Group(); tubeG.position.set(O.ox + 0.2, CH - 0.02, O.oz + 10.8);
  const housing = new THREE.Mesh(cboxGeo(0.22, 0.07, 1.25, 0.01), plainMat(0xc8c8c0, { roughness: 0.5, metalness: 0.3 }));
  const tubeM = new THREE.MeshStandardMaterial({ color: 0x202020, emissive: 0xd8f4e4, emissiveIntensity: 0, roughness: 0.3 });
  const tube = new THREE.Mesh(cylGeo(0.016, 0.016, 1.15, 8), tubeM); tube.rotation.x = Math.PI / 2; tube.position.y = -0.05;
  const hang = new THREE.Group(); hang.position.z = 0.62; hang.rotation.x = 0.55; tubeG.add(hang);
  housing.position.z = -0.62; tube.position.z = -0.62; hang.add(housing, tube);
  const chain = new THREE.Mesh(cylGeo(0.005, 0.005, 0.5, 4), dk); chain.position.set(0, 0.25, 0); tubeG.add(chain);
  grp.add(tubeG);
  grp.visible = false;
  R.scene.add(grp);
  // a neutral map for the shading while the set is in view: nothing boxed in, a little damp, plenty of dirt
  const fd = new THREE.DataTexture(new Uint8Array([0, 40, 200, Math.round(3.0 / 16 * 255)]), 1, 1, THREE.RGBAFormat); fd.needsUpdate = true;
  Object.assign(TEASER, { group: grp, doors: { left, right }, tube: { g: tubeG, hang, mat: tubeM }, field: fd, fieldXf: new THREE.Vector4(0, 0, 1, 1) });
  return TEASER;
}
const teaserPt = (x, y, z) => new THREE.Vector3(TEASER.ox + x, y, TEASER.oz + z);
function setTeaserDoors(o) {
  const D = TEASER.doors; if (!D) return;
  const k = smooth01(o);
  D.left.position.x = TEASER.ox - 0.75 - k * 1.42; D.right.position.x = TEASER.ox + 0.75 + k * 1.42;
}
// while the set is on screen the world's shading map is swapped for its neutral one
function teaserShading(on) {
  if (on && !TEASER.saved) { TEASER.saved = { f: WS.field.value, xf: WS.fieldXf.value.clone() }; WS.field.value = TEASER.field; WS.fieldXf.value.copy(TEASER.fieldXf); }
  else if (!on && TEASER.saved) { WS.field.value = TEASER.saved.f; WS.fieldXf.value.copy(TEASER.saved.xf); TEASER.saved = null; }
  for (let i = 0; i < WS.occPt.value.length; i++) if (on) WS.occPt.value[i].w = -1;
}

// ---------- the ending itself ----------
function startEnding() {
  if (Game.levelKey === 'l2') { startSeizeEnding(); return; }
  Cinema.endKind = 'l1';
  Cinema.mode = 'ending';
  setMode('end');
  setLetterbox(true);
  $('end').hidden = true; setNextCard('Level 2', 'Seize', 'B5', Settings.early ? 'Early access' : 'Coming soon');
  const L = Game.L, a = L.areas[ENDCAR.ai];
  const lock = L.locks.find((l) => l.type === 'Z');
  Cinema.endDoor = lock;
  const me = Game.me;
  const inCar = me && !me.dead && areaAt(L, me.x, me.z) === ENDCAR.ai && me.x > a.offX + ENDCAR.x0 + 0.3;
  Cinema.endCam = inCar ? { x: me.x, z: me.z, yaw: me.yaw, pitch: me.pitch } : { x: a.offX + 35.4, z: a.offZ + 11.5, yaw: Math.PI / 2, pitch: 0 };
  Cinema.carMid = { x: a.offX + 36, z: a.offZ + 11.5 };
  Cinema.t = 0; Cinema.zOpen = 1; Cinema.teaser = false; Cinema.ca = ENDCAR.ai; Cinema.kick = 0; Cinema.kickV = 0;
  Cinema.lamp = 1; Cinema.tubeOn = 0; Cinema.chudSet = false; Cinema.fov = 72;
  Cinema.stats = endStats();
  Cinema.coop = Net.mode !== 'solo' && netPeers().length > 1;
  buildTeaserSet();
  Sound.setTheme('silent');
  const door = { x: lock.x, y: 1.5, z: lock.z }, car = { x: Cinema.carMid.x, y: 3.4, z: Cinema.carMid.z }, below = { x: Cinema.carMid.x, y: -24, z: Cinema.carMid.z };
  const T = END_T;
  setCues([
    [T.close, () => { Sound.play('door', door); Sound.play('scrape', door); }],
    [0.9, () => { Sound.scream({ x: lock.x - 9, y: 2.5, z: lock.z }); R.shake = Math.max(R.shake || 0, 0.6); }],
    [T.arm, () => { Sound.play('slam', door); Sound.play('ventHit', door); R.hit = 1.2; R.shake = 1.1; Cinema.kickV = -1.2; }],
    [2.4, () => Sound.play('creak', door)],
    [3.1, () => { Sound.play('ventHit', door); R.hit = 0.9; }],
    [3.9, () => { Sound.scream({ x: lock.x - 1.5, y: 2.4, z: lock.z }); R.shake = 1.2; }],
    [T.drop, () => {
      Sound.play('brakes', car); Sound.play('ventBurst', door); Sound.play('liftSlam', car); Sound.duck(0.9, 0.5, 1.8);
      R.shake = 1.8; R.hit = 1.6; Cinema.kickV = 3.4; Cinema.lamp = 0; Cinema.zOpen = 0;
      debrisShower(Cinema.carMid.x, Cinema.carMid.z, 40);
    }],
    [T.back, () => { Sound.setTheme('elevator', { drone: 0.6, machine: 0.95 }); Sound.play('flick', car); }],
    [T.radio1, () => { Sound.play('radio'); subtitle('Recovery team, your car is moving. You are below B-4.', 3200); }],
    [T.boom1, () => { Sound.chudStep(below, 0.7, 0.3); R.shake = Math.max(R.shake, 0.7); Cinema.flicker = 0.6; debrisShower(Cinema.carMid.x, Cinema.carMid.z, 18); }],
    [T.radio2, () => { Sound.play('radio'); subtitle('That shaft doesn\'t go any deeper. There is nothing below B-4.', 3300); }],
    [T.boom2, () => { Sound.chudStep({ x: below.x, y: -9, z: below.z }, 1.2, 0.8); R.shake = Math.max(R.shake, 1.2); R.hit = 0.8; Cinema.flicker = 1; debrisShower(Cinema.carMid.x, Cinema.carMid.z, 34); }],
    [T.radio3, () => { Sound.play('radio'); subtitle('Team, do you co-', 1100); }],
    [T.slow, () => Sound.play('brakes', car)],
    [T.stop, () => { Sound.play('liftSlam', car); Sound.setTheme('silent'); R.shake = 1.1; R.hit = 0.8; Cinema.kickV = 1.6; Cinema.lamp = 0; debrisShower(Cinema.carMid.x, Cinema.carMid.z, 24); }],
    [T.cut, () => endingCut()],
    [T.torch, () => Sound.play('click')],
    [T.open, () => { const p = teaserPt(0, 1.4, 0.2); Sound.play('door', p); Sound.play('scrape', p); }],
    [T.tube, () => { Sound.play('buzz', teaserPt(0.2, 2.9, 10.8)); Sound.play('spark', teaserPt(0.2, 2.9, 10.8)); }],
    [T.grunt, () => { chudGrunt(); Sound.chudGrunt(teaserPt(0, 2.3, 15.4), true); }],
    [T.turn, () => Sound.chudGrunt(teaserPt(0, 2.3, 15.4), false)],
    [T.bang, () => {
      const p = teaserPt(0.3, 0.05, 14.9);
      Sound.chudStep(p, 1.4, 1); Sound.play('liftSlam', p); Sound.play('spark', teaserPt(0.2, 2.9, 10.8)); Sound.duck(0.95, 0.4, 2.5);
      R.shake = 2.0; R.hit = 1.8; Cinema.kickV = 2.2; Cinema.tubeOn = -1;
      debrisBurst(p.x, 0.05, p.z, 'f', 1.4); debrisShower(R.camera.position.x, R.camera.position.z, 40);
    }],
    [T.title, () => { const c = $('next-card'); c.hidden = false; void c.offsetWidth; c.classList.add('show'); Sound.play('impact'); }],
    [T.soon, () => $('next-card').classList.add('soon')],
    [T.screen, () => showEndScreen()],
  ]);
  $('skip').hidden = false;
}
// The black moment at the bottom: everything in the world goes out of view and the set on B5 comes in.
function endingCut() {
  Cinema.teaser = true; Cinema.ca = -1;
  buildTeaserSet();
  if (!Chud.ready) buildChud(R.scene);
  TEASER.group.visible = true;
  teaserShading(true);
  Debris.free = true;
  setTeaserDoors(0);
  updateCreature(0, 0, { mode: 'hidden' }, Game.L, R.camera.position);
  for (const [, m] of Game.mates) m.h.root.visible = false;
  R.mates.forEach((l) => { l.light.intensity = 0; });
  // the Chud at the end of the corridor, its back to you
  Object.assign(Chud, { x: TEASER.ox + 0.0, z: TEASER.oz + 15.4, y: 0, yaw: 0, speed: 0, mode: 'idle', look: null, reach: 0, grip: undefined, ov: null, snap: true });
  Chud.root.visible = true;
  Cinema.chudSet = true;
  try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* compiled on first sight instead */ }
}
function endingLeave() {
  Debris.free = false;
  if (TEASER.group) TEASER.group.visible = false;
  teaserShading(false);
  if (Chud.root) Chud.root.visible = false;
  Sound.chudBreath({ x: 0, y: 0, z: 0 }, false);
  R.key.intensity = 0; R.backlight.intensity = 0;
  seizeEndingLeave();
  Cinema.teaser = false; Cinema.zOpen = undefined;
  if (R.camera.fov !== 72) { R.camera.fov = 72; R.camera.updateProjectionMatrix(); }
}
const _ecLook = new THREE.Vector3();
function updateEnding(dt, t) {
  if (Cinema.endKind === 'l2') { updateSeizeEnding(dt, t); return; }
  // the Chud gets built a slice at a time while the doors are still shutting
  if (!Chud.ready) chudBuildStep(5, R.scene);
  Cinema.t += dt; runCues();
  const T = Cinema.t, E = END_T, c = Cinema.endCam, lock = Cinema.endDoor;
  const kick = cineKick(dt);
  Cinema.flicker = Math.max(0, (Cinema.flicker || 0) - dt * 1.6);
  if (!Cinema.teaser) {
    // ---- in the car ----
    // the doors: shutting, stopped by its arm, shoved and shuddering, then slammed when the car drops
    if (T < E.close) Cinema.zOpen = 1;
    else if (T < E.arm) Cinema.zOpen = lerp(1, 0.13, smooth01((T - E.close) / (E.arm - E.close)));
    else if (T < E.drop) Cinema.zOpen = 0.13 + 0.035 * Math.sin(T * 23) * Math.sin(T * 3.1) + (T > 3.1 && T < 3.4 ? 0.06 : 0);
    else Cinema.zOpen = 0;
    // you, turning to the doors, then backing off from what comes through them
    const doorYaw = Math.atan2(-(lock.x - c.x), -(lock.z - c.z));
    const turn = smooth01(T / 0.9), flinch = T > E.arm && T < E.drop ? smooth01((T - E.arm) / 0.5) : T >= E.drop ? 1 : 0;
    const back = flinch * 0.45;
    const cx = c.x + Math.sin(doorYaw) * back, cz = c.z + Math.cos(doorYaw) * back;
    let yaw = lerpAngle(c.yaw, doorYaw, turn), pitch = lerp(c.pitch, 0.02, turn);
    // on the way down: up at the display, round at the car, back to the doors
    if (T > E.back) {
      const up = smooth01((T - 6.6) / 1.0) * (1 - smooth01((T - 8.0) / 0.6));
      const look = smooth01((T - 8.9) / 1.1) * (1 - smooth01((T - 10.6) / 0.8));
      pitch = lerp(pitch, 0.42, up);
      yaw += look * (Cinema.coop ? 2.2 : 1.3);
      pitch -= look * 0.12;
    }
    pitch += kick * 0.4 + Math.sin(t * 1.3) * 0.01;
    yaw += Math.sin(t * 0.8) * 0.012;
    R.camera.position.set(cx, EYE_H + kick * 0.6, cz);
    R.camera.rotation.set(pitch, yaw, 0);
    // the hand through the gap: it rushes the doors from the dark, then gropes through at head height
    let net = { mode: 'hidden' };
    if (T > 0.25 && T < E.arm - 0.05) {
      const k = smooth01((T - 0.25) / (E.arm - 0.3));
      net = { x: lerp(lock.x - 15, lock.x - 1.8, k), z: lock.z, yaw: Math.PI / 2, st: 0.1, mode: 'run', lx: lock.x, ly: 1.6, lz: lock.z };
    } else if (T >= E.arm - 0.05 && T < E.drop) {
      const k = smooth01((T - E.arm) / 1.4), grope = Math.sin(T * 5.3) * 0.18;
      net = { x: lock.x - 1.5, z: lock.z, yaw: Math.PI / 2, st: 0.2, mode: 'reach', lx: lerp(lock.x + 0.2, lock.x + 1.35, k) + Math.sin(T * 3.1) * 0.12, ly: 1.55 + grope * 0.4, lz: lock.z + grope };
    }
    updateCreature(dt, t, net, Game.L, R.camera.position);
    // the car's lamp: on; out when it drops; stuttering back on; flickering at every boom; dead at the bottom
    if (T >= E.drop && T < E.back) Cinema.lamp = 0;
    else if (T >= E.back && T < E.stop) Cinema.lamp = (T < E.back + 0.5 ? (Math.random() < 0.5 ? 1 : 0.05) : 1) * (Cinema.flicker > 0 && Math.random() < 0.5 ? 0.1 : 1);
    else if (T >= E.stop) Cinema.lamp = 0;
    const EC = World.endCar;
    if (EC) {
      EC.spot.mul = Cinema.lamp; EC.bulbM.emissiveIntensity = 3 * Cinema.lamp;
      // the display: the floor, then guessing, then the one it stops on
      if (T < E.drop) setEndIndicator('B4', '');
      else if (T < E.back) setEndIndicator('', '', 0.2);
      else if (T < 7.2) setEndIndicator('B4', '▼', Cinema.lamp > 0.5 ? 1 : 0.5);
      else if (T < E.slow) setEndIndicator(Math.floor(T * 6) % 3 === 0 ? 'B-' : Math.floor(T * 7) % 4 === 0 ? '--' : 'B4', '▼', 0.9);
      else setEndIndicator('B5', T < E.stop ? '▼' : '', T < E.stop ? 1 : 0.6);
    }
    // your torch: low while the lamp is on, up in the dark
    const darkCar = Cinema.lamp < 0.3;
    setFlash(T >= E.drop && T < E.back ? 0 : T >= E.stop ? (Math.random() < 0.3 ? 0.4 : 0.85) : darkCar ? 0.85 : 0.35);
    R.flashTarget.position.set(0.08, darkCar ? -0.25 : -1.5, -3);
    // the car shivers all the way down
    if (T > E.back && T < E.stop) R.shake = Math.max(R.shake || 0, 0.16 + Math.random() * 0.05);
    cineShake(dt, t);
    if (World.viewModel) World.viewModel.group.visible = true;
    updateMates(dt, t);
    updateLightPool(dt, R.camera, ENDCAR.ai);
    R.fear = T > E.arm && T < E.drop + 0.6 ? 0.85 : T > E.boom2 && T < E.stop ? 0.4 : damp(R.fear, 0.1, 1, dt);
    if (T >= E.stop) R.fade = damp(R.fade, 0.92, 4, dt); else R.fade = damp(R.fade, 0, 4, dt);
    return;
  }
  // ---- on B5 ----
  R.fade = damp(R.fade, T > E.torch ? 0 : 1, 6, dt);
  const doorK = clamp((T - E.open) / 1.6, 0, 1);
  setTeaserDoors(doorK);
  // you step out to the threshold, slowly, and the view narrows on it
  const push = smooth01((T - E.push) / 3.6);
  const p0 = teaserPt(0.15, EYE_H, -1.7), p1 = teaserPt(0.05, EYE_H - 0.05, 0.4);
  R.camera.position.lerpVectors(p0, p1, push);
  R.camera.position.y += kick * 0.6;
  _ecLook.copy(teaserPt(0.05, lerp(1.2, 1.75, push), 12));
  R.camera.lookAt(_ecLook);
  R.camera.rotation.x += Math.sin(t * 1.1) * 0.006 + kick * 0.3; R.camera.rotation.y += Math.sin(t * 0.7) * 0.008;
  const fov = lerp(72, 54, push);
  if (Math.abs(R.camera.fov - fov) > 0.05) { R.camera.fov = fov; R.camera.updateProjectionMatrix(); }
  cineShake(dt, t);
  // the torch: on with a click; out with the bang
  const lit = T > E.torch && T < E.bang;
  setFlash(lit ? (T < E.torch + 0.25 ? (Math.random() < 0.5 ? 0.9 : 0.2) : 0.95) : T > E.bang && T < E.bang + 0.35 ? (Math.random() < 0.4 ? 0.6 : 0) : 0);
  R.flashTarget.position.set(0.02, lerp(-0.25, 0.05, push), -3);
  // the tube halfway down: it catches, stutters, holds - and dies with the bang
  const tb = TEASER.tube;
  if (T > E.tube && Cinema.tubeOn >= 0) {
    // it catches with a stutter, holds with the odd drop - and stays steady while it turns round
    const k = T - E.tube;
    Cinema.tubeOn = k < 0.9 ? (Math.random() < 0.35 ? 1 : 0) : T > E.turn - 0.4 ? 1 : Math.random() < 0.05 ? 0.15 : 1;
  }
  const tubeL = Math.max(0, Cinema.tubeOn);
  tb.mat.emissiveIntensity = 2.6 * tubeL;
  tb.hang.rotation.x = 0.55 + Math.sin(t * 0.9) * 0.03;
  R.key.position.set(TEASER.ox + 0.2, 2.9, TEASER.oz + 10.6); R.key.target.position.set(TEASER.ox, 0, TEASER.oz + 13.2);
  R.key.color.setHex(0xd8f4e4); R.key.angle = 1.05; R.key.penumbra = 0.7; R.key.distance = 16; R.key.intensity = 34 * tubeL;
  // a red glow far behind it, enough to cut its shape out of the dark
  R.backlight.position.set(TEASER.ox, 2.5, TEASER.oz + 22.5); R.backlight.color.setHex(0x8a1a10); R.backlight.distance = 9; R.backlight.intensity = T > E.tube ? 5 : 0;
  // the Chud: breathing, its back to you; a grunt, its head coming round to the light; then it turns
  if (Cinema.chudSet) {
    const C = Chud;
    C.look = T > E.grunt - 0.3 ? R.camera.position : null;
    if (T > E.turn) { C.yaw = lerpAngle(0, Math.PI - 0.25, smooth01((T - E.turn) / 1.4)); C.speed = T < E.bang ? 0.35 : 0; }
    if (T > E.bang - 0.15 && T < E.bang + 0.4) { C.reach = 0.35; }
    chudPose(dt, t);
    C.events.length = 0;
    Sound.chudBreath({ x: C.x, y: 2.2, z: C.z }, T < E.bang + 0.3, 1);
  }
  R.fear = T > E.tube ? clamp((T - E.tube) / 3, 0, 0.9) : 0.1;
  if (T > E.bang) { R.fade = Math.min(1, R.fade + dt * (T > E.bang + 0.35 ? 6 : 0)); }
  R.scene.fog.color.setHex(0x000000); R.scene.background.setHex(0x000000);
}
// leaving the ending by any door: back to a normal world
function resetEnding() {
  if (Cinema.mode === 'ending' || Cinema.mode === 'credits') { endingLeave(); Cinema.mode = null; }
  Cinema.zOpen = undefined;
  const nc = $('next-card'); if (nc) { nc.classList.remove('show', 'soon'); nc.hidden = true; }
  $('end').hidden = true;
  Sound.titleMusic(false);
}
// what the run came to, from the host's state
function endStats() {
  const g = Game.g || {}, peers = Net.mode === 'solo' ? [{ id: 'me', me: true, s: { n: Settings.name, c: Settings.color } }] : netPeers();
  const myId = typeof netMyId === 'function' ? netMyId() : 'me';
  const team = peers.filter((p) => p.me || (p.s && p.s.rn === g.rn)).map((p) => ({
    name: String((p.me ? Settings.name : p.s.n) || 'Player').slice(0, 14), color: playerColor(p.me ? Settings.color : p.s.c),
    out: !(g.k && g.k[p.me ? myId : p.id]), me: !!p.me,
  }));
  const end = typeof g.te === 'number' ? g.te : g.t || 0, start = typeof g.ps === 'number' ? g.ps : Math.min(end, INTRO_SECONDS);
  return { time: Math.max(0, Math.floor(end - start)), taken: g.kc || 0, team, camp: g.mp === 'camp' };
}
// ---------- results and credits ----------
function showEndScreen() {
  if (Cinema.mode !== 'ending' && Cinema.mode !== 'credits') return;
  endingLeave();
  Cinema.mode = 'credits';
  setLetterbox(false);
  $('skip').hidden = true;
  R.whiteFlash = 0; R.fade = 1; R.fear = 0;
  const S = Cinema.stats || endStats();
  const nc = $('next-card'); nc.classList.remove('show', 'soon'); nc.hidden = true;
  const two = Game.levelKey === 'l2', nA = Game.L ? Game.L.areas.length : 10;
  setText($('end-kicker'), two ? 'Level 2 · Complete' : S.camp ? 'Campaign · Level 1 of 2 complete' : 'Level 1 · Complete');
  setText($('end-title'), two ? 'Seize - B5' : 'Reach - B4');
  const out = S.team.filter((m) => m.out).length, solo = S.team.length <= 1;
  const tail = two ? 'It went up.' : 'It didn\'t stop at the bottom.';
  setText($('end-sub'), (solo ? 'You made it into the lift. ' : out === S.team.length ? 'Your whole team made it into the lift. ' : 'Some of you made it into the lift. ') + tail);
  const next = two ? 'Breach - A1' : 'Seize - B5', open = two || Settings.early;
  setText($('end-next-name'), next); setText($('end-next-note'), open ? 'Early access' : 'Coming soon');
  setText($('cr-next'), next + ' · ' + (open ? 'Early access' : 'Coming soon'));
  const mm = Math.floor(S.time / 60), ss = String(S.time % 60).padStart(2, '0');
  const stats = [[mm + ':' + ss, 'Time'], [solo ? (out ? 'Yes' : 'No') : out + ' / ' + S.team.length, 'Made it out'], [String(S.taken), 'Times taken'], [nA + ' / ' + nA, 'Areas']];
  const box = $('end-stats'); box.textContent = '';
  for (const [v, l] of stats) { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = v; const sp = document.createElement('span'); sp.textContent = l; d.append(b, sp); box.appendChild(d); }
  const ul = $('end-team'); ul.textContent = ''; ul.hidden = solo;
  for (const m of S.team) {
    const li = document.createElement('li');
    const chip = document.createElement('i'); chip.style.background = m.color;
    const nm = document.createElement('span'); nm.textContent = m.name + (m.me ? ' (you)' : '');
    const st = document.createElement('em'); st.textContent = m.out ? 'Made it' : 'Taken'; st.className = m.out ? 'ok' : 'bad';
    li.append(chip, nm, st); ul.appendChild(li);
  }
  const canRestart = Net.mode === 'solo' || netIsHost();
  $('btn-again').hidden = !canRestart;
  setText($('end-note'), S.camp ? 'The campaign carries on in Seize - B5 when it opens. ' + (canRestart ? '' : 'Waiting for the host.') : canRestart ? '' : 'Waiting for the host to start another run.');
  const end = $('end'); end.hidden = false; end.classList.remove('in'); void end.offsetWidth; end.classList.add('in');
  const roll = $('credits-roll'); roll.classList.remove('roll'); void roll.offsetWidth; roll.classList.add('roll');
  Sound.setTheme('title'); Sound.titleMusic(true);
}

// ---------- the end of Seize - B5: the gates, and the long way up ----------
// The brass gates fold shut. Down the hall it comes, flat out, and hits them hard enough to bow them; it hangs
// on the lattice with its face in the bars, screaming into the car. The brakes let go - and for the first time
// a car goes up. It is under you in the shaft for a while, banging on the floor; then it falls, a long way.
// B4, B3, B2, B1 go by in the dark. The radio says there is nothing above B-1 but the old bunker. The car stops
// at A-1, in front of a blast door under a turning red lamp - and something on the other side knocks. Three
// times. BREACH - A1.
const SZ_T = {
  shut: 0.3, roar: 0.7, slam: 3.4, lurch: 5.7, black: 5.85, up: 6.3, radio1: 7.2, below: 8.4, bang: 9.6, radio2: 11.0,
  fall: 12.7, radio3: 14.3, crash: 15.6, arrive: 17.4, knock1: 19.5, knock2: 20.4, knock3: 21.3, title: 22.6, soon: 23.6, screen: 27.4,
};
const SZ_FLOOR = 4.5, SZ_RISE = SZ_FLOOR * 5, SZ_RUN = 4.2;
const SHAFT = { group: null, slits: [], beacon: null, dial: null, needle: null };

// the shaft beyond the gate, built once: a concrete wall with a landing every floor (closed doors, a line of
// light round them, the number painted beside them), rail brackets and conduit going by, and at the top the
// blast door at A-1. Local frame: origin at the gate, +z into the car, x along the gate, y up from B5's floor.
function buildShaftSet() {
  if (SHAFT.group) return SHAFT.group;
  const g = new THREE.Group(), add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
  const wallGeo = new THREE.PlaneGeometry(6, 36), uv = wallGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 18);
  add(wallGeo, mat('concrete', { color: 0x48484a }), 0, 12, -0.62);
  const steel = mat('metalDark'), rust = mat('rust');
  for (const x of [-2.15, 2.15]) {
    add(boxGeo(0.08, 36, 0.1), steel, x, 12, -0.52);
    for (let y = -5; y < 30; y += 1.5) add(boxGeo(0.22, 0.12, 0.14), rust, x, y, -0.55);
  }
  add(cylGeo(0.035, 0.035, 36, 8), rust, 1.6, 12, -0.56);
  for (let y = -5; y < 30; y += 2.1) add(boxGeo(0.12, 0.05, 0.08), steel, 1.6, y, -0.56);
  const names = ['B5', 'B4', 'B3', 'B2', 'B1', 'A1'];
  SHAFT.slits = [];
  for (let i = 1; i < 6; i++) {
    const y0 = i * SZ_FLOOR;
    // the sill each landing makes: a lip of concrete, the clearest thing going past
    add(cboxGeo(6, 0.45, 0.24, 0.02), mat('concrete'), 0, y0 - 0.22, -0.48);
    add(boxGeo(6, 0.06, 0.02), hazardMat(), 0, y0 - 0.02, -0.355);
    if (i < 5) {
      // a pair of closed landing doors with the corridor's light round their edges
      for (const s of [-1, 1]) add(cboxGeo(1.42, 2.7, 0.08, 0.01), mat('metal', { color: 0x5a5e58 }), s * 0.73, y0 + 1.35, -0.5);
      const glow = new THREE.MeshBasicMaterial({ color: i === 1 ? 0xff3020 : 0xffc890 });
      add(boxGeo(0.025, 2.6, 0.02), glow, 0, y0 + 1.33, -0.47);
      add(boxGeo(2.8, 0.025, 0.02), glow, 0, y0 + 0.02, -0.47);
      SHAFT.slits.push({ m: glow, base: i === 1 ? 0xff3020 : 0xffc890, i });
      add(planeGeo(0.7, 0.42), labelMat(names[i], { fg: '#d8d4c4', w: 256, h: 152, size: 120, font: '"Big Shoulders Stencil Display", Impact, sans-serif', weight: '900' }), 2.0, y0 + 2.2, -0.6);
    }
  }
  // A-1: the blast door. Hazard frame, a wheel, the number, a red lamp over it.
  const yA = 5 * SZ_FLOOR;
  add(cboxGeo(3.1, 2.95, 0.3, 0.03), mat('steel', { color: 0x6a6c64 }), 0, yA + 1.475, -0.52);
  for (const [w, h, x, y] of [[3.3, 0.14, 0, yA + 3.0], [0.14, 3.0, -1.62, yA + 1.5], [0.14, 3.0, 1.62, yA + 1.5]]) add(planeGeo(w, h), hazardMat(), x, y, -0.36);
  add(torusGeo(0.32, 0.035, 8, 28), mat('steelDark'), 0, yA + 1.35, -0.33);
  for (let k = 0; k < 3; k++) add(boxGeo(0.62, 0.03, 0.03), mat('steelDark'), 0, yA + 1.35, -0.33, 0, 0, k * Math.PI / 3);
  add(planeGeo(1.0, 0.5), labelMat('A-1', { fg: '#d8a535', w: 256, h: 128, size: 110, font: '"Big Shoulders Stencil Display", Impact, sans-serif', weight: '900' }), -0.85, yA + 2.35, -0.36);
  add(planeGeo(1.5, 0.12), labelMat('SURFACE ACCESS · SEALED', { bg: '#b8160e', fg: '#f2eee2', w: 512, h: 48, size: 30 }), 0.55, yA + 2.45, -0.36);
  add(cylGeo(0.09, 0.11, 0.12, 14), mat('steelDark'), 0, yA + 3.22, -0.42);
  SHAFT.beacon = add(new THREE.SphereGeometry(0.09, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x400806 }), 0, yA + 3.28, -0.42);
  g.visible = false;
  SHAFT.group = g;
  return g;
}
// the brass dial over the gate inside the car, and its needle
function buildCarDial() {
  if (SHAFT.dial) return SHAFT.dial;
  const d = new THREE.Group();
  const plate = new THREE.Mesh(cboxGeo(0.78, 0.26, 0.03, 0.01), WM.brass); d.add(plate);
  const face = new THREE.Mesh(planeGeo(0.7, 0.13), labelMat('B5  B4  B3  B2  B1  A1', { bg: '#d8ccaa', fg: '#2a1e0a', w: 512, h: 96, size: 40, font: 'serif', weight: '700' }));
  face.position.set(0, 0.06, 0.017); d.add(face);
  const pivot = new THREE.Group(); pivot.position.set(0, -0.11, 0.025); d.add(pivot);
  const nd = new THREE.Mesh(boxGeo(0.008, 0.16, 0.004), plainMat(0x1a0e08)); nd.position.y = 0.08; pivot.add(nd);
  const hub = new THREE.Mesh(cylGeo(0.02, 0.02, 0.01, 12), WM.brassDull); hub.rotation.x = Math.PI / 2; pivot.add(hub);
  SHAFT.dial = d; SHAFT.needle = pivot;
  return d;
}
// how far the car has climbed: away gently, a long steady pull, easing into A-1; and a drop when it's hit
function szRise(T) {
  const E = SZ_T, D = E.arrive - E.up, a = 1.8, v = SZ_RISE / (D - a);
  const t = clamp(T - E.up, 0, D);
  let y = t < a ? v * t * t / (2 * a) : t < D - a ? v * a / 2 + v * (t - a) : SZ_RISE - v * (D - t) * (D - t) / (2 * a);
  const h = T - E.bang; if (h > 0 && h < 1.3) y -= 0.32 * Math.sin(h / 1.3 * Math.PI) * (1 - h / 1.3);
  return y;
}
const _szP = new THREE.Vector3(), _szQ = new THREE.Vector3(), _szOv = {};
function startSeizeEnding() {
  Cinema.endKind = 'l2'; Cinema.mode = 'ending';
  setMode('end'); setLetterbox(true);
  $('end').hidden = true; setNextCard('Level 3', 'Breach', 'A1', 'Early access');
  const L = Game.L, lock = L.locks.find((l) => l.type === 'Z'), me = Game.me, last = L.areas.length - 1;
  Cinema.endDoor = lock;
  // where the car is: the middle of its floor; which way is out through the gate; which way the gate runs
  let cx = 0, cz = 0, n = 0;
  for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) { const i = z * L.W + x; if (L.ch[i] === 'z' && L.area[i] === last) { cx += x + 0.5; cz += z + 0.5; n++; } }
  if (n) { cx /= n; cz /= n; } else { cx = lock.x + 2.5; cz = lock.z; }
  const vertical = lock.cells.every((c) => c.x === lock.cells[0].x);
  const out = vertical ? { x: Math.sign(lock.x - cx) || -1, z: 0 } : { x: 0, z: Math.sign(lock.z - cz) || -1 };
  Cinema.szOut = out; Cinema.szAlong = { x: -out.z, z: out.x }; Cinema.szCar = { x: cx, z: cz };
  const inCar = me && !me.dead && L.ch[Math.floor(me.z) * L.W + Math.floor(me.x)] === 'z';
  Cinema.endCam = inCar ? { x: me.x, z: me.z, yaw: me.yaw, pitch: me.pitch } : { x: cx - out.x * 0.6, z: cz - out.z * 0.6, yaw: Math.atan2(out.x, out.z) + Math.PI, pitch: 0 };
  // how far down the hall it can be seen coming from
  let far = 1.5;
  while (far < 14) { const x = Math.floor(lock.x + out.x * (far + 0.5)), z = Math.floor(lock.z + out.z * (far + 0.5)); if (!inGrid(L, x, z) || !WALKABLE.has(L.ch[z * L.W + x])) break; far += 0.5; }
  Cinema.szFar = far;
  Cinema.t = 0; Cinema.zOpen = 1; Cinema.kick = 0; Cinema.kickV = 0; Cinema.ca = last; Cinema.lamp = 1; Cinema.flicker = 0; Cinema.szShaft = false; Cinema.fov = 72;
  Cinema.stats = endStats();
  Cinema.lockD = World.locks ? World.locks.find((D) => D.lock.type === 'Z') : null;
  // the shaft and the dial, placed on this gate
  const ry = Math.atan2(-out.x, -out.z);
  const S = buildShaftSet(); S.position.set(lock.x, 0, lock.z); S.rotation.set(0, ry, 0); S.visible = false;
  if (!S.parent) R.scene.add(S);
  const dial = buildCarDial(); dial.position.set(lock.x - out.x * 0.56, 3.02, lock.z - out.z * 0.56); dial.rotation.set(0, ry, 0); dial.visible = true;
  if (!dial.parent) R.scene.add(dial);
  Object.assign(Chud, { x: lock.x + out.x * far, z: lock.z + out.z * far, y: 0, yaw: Math.atan2(-out.x, -out.z), speed: 0, mode: 'hunt', look: null, reach: 0, grip: undefined, ov: null, snap: true });
  Sound.setTheme('oldwing', { drone: 0.4 });
  const gate = { x: lock.x, y: 1.6, z: lock.z }, car = { x: cx, y: 3, z: cz }, under = (d) => ({ x: cx, y: -szRise(Cinema.t) - d, z: cz });
  const T = SZ_T;
  setCues([
    [T.shut, () => { Sound.play('gate', gate); Sound.play('scrape', gate); }],
    [T.roar, () => { chudGrunt(); Sound.chudGrunt({ x: Chud.x, y: 2.4, z: Chud.z }, true); }],
    [T.slam - 0.9, () => { chudGrunt(); Sound.chudGrunt({ x: Chud.x, y: 2.4, z: Chud.z }, true); }],
    [T.slam, () => {
      Sound.play('liftSlam', gate); Sound.play('gate', gate); Sound.play('ventHit', gate); Sound.duck(0.85, 0.3, 1.6);
      R.shake = 2.0; R.hit = 1.8; Cinema.kickV = -2.6; debrisShower(Cinema.endCam.x, Cinema.endCam.z, 34);
    }],
    [T.slam + 0.25, () => { chudGrunt(); Sound.chudGrunt({ x: Chud.x, y: 2.4, z: Chud.z }, true); Sound.play('gurgle', gate); }],
    [T.slam + 1.0, () => { Sound.play('gate', gate); R.shake = Math.max(R.shake, 0.9); }],
    [T.slam + 1.55, () => { Sound.play('gate', gate); Sound.play('ventHit', gate); R.hit = 0.9; }],
    [T.slam + 2.0, () => { chudGrunt(); Sound.chudGrunt({ x: Chud.x, y: 2.4, z: Chud.z }, true); }],
    [T.lurch - 0.4, () => Sound.play('creak', car)],
    [T.lurch, () => { Sound.play('brakes', car); Sound.play('liftSlam', car); Sound.duck(0.9, 0.5, 1.8); R.shake = 1.8; R.hit = 1.4; Cinema.kickV = 3.0; Cinema.flicker = 1; }],
    [T.black, () => {
      Cinema.lamp = 0; Cinema.szShaft = true; S.visible = true; setChudVisible(false); Sound.chudBreath({ x: 0, y: 0, z: 0 }, false);
      Sound.play('flick', car); try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* compiled on first sight */ }
    }],
    [T.up, () => { Sound.setTheme('elevator', { drone: 0.6, machine: 0.95 }); Sound.play('flick', car); Sound.chudGrunt(under(1), true); }],
    [T.radio1, () => { Sound.play('radio'); subtitle('Recovery team, your car is moving. It\'s going up.', 3000); }],
    [T.below, () => { Sound.chudGrunt(under(3), true); Sound.play('scrape', under(2)); }],
    [T.bang, () => {
      Sound.play('liftSlam', under(0.2)); Sound.play('ventHit', under(0.2)); Sound.play('spark', car); Sound.duck(0.8, 0.3, 1.2);
      R.shake = 1.7; R.hit = 1.6; Cinema.kickV = -2.4; Cinema.flicker = 1.2; debrisShower(cx, cz, 30);
    }],
    [T.bang + 0.7, () => { Sound.play('scrape', under(0.5)); Sound.chudGrunt(under(1), true); }],
    [T.radio2, () => { Sound.play('radio'); subtitle('There\'s nothing above B-1 but the old bunker. A-1. It\'s been sealed since-', 3400); }],
    [T.fall, () => { Sound.play('liftSlam', under(0.3)); R.shake = 1.2; R.hit = 1.0; Cinema.flicker = 0.8; Sound.chudGrunt(under(2), true); }],
    [T.fall + 0.5, () => { Sound.play('scrape', under(6)); Sound.chudGrunt(under(12), true); }],
    [T.radio3, () => { Sound.play('radio'); subtitle('Whatever you hear up there, don\'t open the hatch.', 2800); }],
    [T.crash, () => { Sound.chudStep(under(40), 1.4, 0.45); R.shake = Math.max(R.shake, 0.6); }],
    [T.arrive - 1.4, () => Sound.play('brakes', car)],
    [T.arrive, () => { Sound.play('clunk', car); Sound.play('liftSlam', car); Sound.setTheme('silent', { wind: 0.55, drone: 0.25 }); R.shake = 0.9; Cinema.kickV = 1.4; }],
    [T.arrive + 0.7, () => Sound.play('bell', car)],
    [T.knock1, () => szKnock(1)],
    [T.knock2, () => szKnock(1.3)],
    [T.knock3, () => szKnock(1.7)],
    [T.title, () => { R.fade = 1; const c = $('next-card'); c.hidden = false; void c.offsetWidth; c.classList.add('show'); Sound.play('impact'); }],
    [T.soon, () => $('next-card').classList.add('soon')],
    [T.screen, () => showEndScreen()],
  ]);
  $('skip').hidden = false;
}
// something on the other side of the blast door
function szKnock(v) {
  const lock = Cinema.endDoor, out = Cinema.szOut, p = { x: lock.x + out.x * 0.9, y: 1.4, z: lock.z + out.z * 0.9 };
  Sound.play('knock', p); Sound.play('thud', p); Sound.play('bump', p);
  R.shake = Math.max(R.shake || 0, 0.35 * v); R.hit = Math.max(R.hit || 0, 0.3 * v); Cinema.kickV = -0.5 * v;
  debrisShower(R.camera.position.x, R.camera.position.z, Math.round(8 * v));
  Cinema.flicker = 0.5;
}
function updateSeizeEnding(dt, t) {
  Cinema.t += dt; runCues();
  const T = Cinema.t, E = SZ_T, c = Cinema.endCam, lock = Cinema.endDoor, out = Cinema.szOut, al = Cinema.szAlong, kick = cineKick(dt);
  Cinema.flicker = Math.max(0, (Cinema.flicker || 0) - dt * 1.4);
  const rise = szRise(T);
  // the gates: shut; bowed in by the hit, then dragged at, then hanging still
  Cinema.zOpen = T < E.shut ? 1 : lerp(1, 0, smooth01((T - E.shut) / 1.7));
  const D = Cinema.lockD, hold = T > E.slam && T < E.black;
  if (D) {
    const hitK = T > E.slam ? Math.exp(-(T - E.slam) * 5) : 0, drag = hold ? Math.max(0, Math.sin((T - E.slam) * 8.5)) * 0.06 * (T < E.lurch ? 1 : 0.4) : 0;
    const push = hitK * 0.16 + drag;
    D.group.position.set(lock.x - out.x * push, 0, lock.z - out.z * push);
    D.group.rotation.z = hold ? Math.sin(T * 31) * 0.004 : 0;
  }
  // ---- the Chud: down the hall flat out, into the gate, hanging on it ----
  if (T < E.black && Chud.ready) {
    const d = Math.max(0.95, 0.95 + (E.slam - T) * SZ_RUN), seen = d <= Cinema.szFar && T > E.roar - 0.4;
    setChudVisible(seen);
    const ov = _szOv; for (const k in ov) delete ov[k];
    Chud.x = lock.x + out.x * d; Chud.z = lock.z + out.z * d; Chud.yaw = Math.atan2(-out.x, -out.z);
    Chud.look = R.camera.position; Chud.reach = 0; Chud.grip = undefined;
    if (T < E.slam) { Chud.mode = 'hunt'; Chud.speed = SZ_RUN; Chud.ov = null; }
    else {
      Chud.mode = 'hunt'; Chud.speed = 0;
      const k = T - E.slam, shake = Math.sin(k * 8.5);
      // both hands through the lattice, pulling and shoving; its face in the bars
      for (const [s, key, y] of [[1, 'armL', 2.05], [-1, 'armR', 1.7]]) {
        const p = new THREE.Vector3(lock.x + out.x * (0.12 - shake * 0.03) + al.x * s * 0.62, y + Math.sin(k * 8.5 + s) * 0.04, lock.z + out.z * (0.12 - shake * 0.03) + al.z * s * 0.62);
        ov[key] = p;
      }
      ov.gripL = 1; ov.gripR = 1;
      ov.lunge = -0.08 + shake * 0.07; ov.lean = 0.12 + Math.max(0, shake) * 0.06;
      ov.jaw = k < 0.25 ? smooth01(k / 0.25) : 0.75 + 0.25 * Math.sin(k * 5.3);
      ov.headRoll = Math.sin(k * 3.1) * 0.12;
      if (T > E.lurch) { const s = smooth01((T - E.lurch) / 0.15); ov.drop = 0.25 * s; ov.jaw = 1; }
      Chud.ov = ov;
    }
    chudPose(dt, t);
    for (const ev of Chud.events) {
      const dd = dist2(ev.x, ev.z, R.camera.position.x, R.camera.position.z), felt = clamp(1 - dd / 16, 0, 1);
      Sound.chudStep({ x: ev.x, y: 0.2, z: ev.z }, ev.power * 1.2, felt);
      R.shake = Math.max(R.shake || 0, felt * 0.8); debrisBurst(ev.x, 0.05, ev.z, 'f', 0.4 * ev.power);
    }
    Chud.events.length = 0;
    Sound.chudBreath({ x: Chud.x, y: 2.2, z: Chud.z }, seen, 1.8);
  }
  // ---- the shaft going by ----
  const S = SHAFT.group;
  if (S && Cinema.szShaft) {
    S.position.y = -rise;
    for (const sl of SHAFT.slits) {
      const fl = sl.i === 1 ? (Math.random() < 0.15 ? 0.2 : 1) : 0.75 + 0.25 * Math.sin(t * 7 + sl.i * 3);
      sl.m.color.setHex(sl.base).multiplyScalar(fl * (Cinema.flicker > 0.3 && Math.random() < 0.5 ? 0.3 : 1));
    }
    // A-1's lamp, turning: a red sweep that catches the door and comes in through the gate
    const near = clamp(1 - (SZ_RISE - rise) / 4, 0, 1), sweep = Math.pow(0.5 + 0.5 * Math.sin(T * 4.2), 3);
    SHAFT.beacon.material.color.setRGB(0.25 + 0.75 * sweep, 0.03, 0.02);
    R.backlight.color.setHex(0xff2010); R.backlight.distance = 9;
    R.backlight.position.set(lock.x + out.x * 0.9 - al.x * 0.0, SZ_RISE - rise + 3.0, lock.z + out.z * 0.9);
    R.backlight.intensity = near * (2 + 22 * sweep) * (Cinema.flicker > 0.2 && Math.random() < 0.4 ? 0.2 : 1);
  }
  if (SHAFT.needle) {
    const u = -0.25 + 0.5 * clamp(rise / SZ_RISE, 0, 1) + (T > E.up && T < E.arrive ? Math.sin(t * 13) * 0.004 : 0);
    SHAFT.needle.rotation.z = -Math.atan(u / 0.17);
  }
  // ---- the car's lamp: on; flickering when it's hit; out when the brakes go; stuttering back ----
  if (T >= E.black && T < E.up) Cinema.lamp = 0;
  else if (T >= E.up && T < E.up + 0.6) Cinema.lamp = Math.random() < 0.45 ? 1 : 0.05;
  else Cinema.lamp = Cinema.flicker > 0.15 && Math.random() < 0.5 ? 0.12 : T > E.arrive + 0.5 ? 0.55 : 1;
  const car = Cinema.szCar;
  // (it hangs in the middle of the car, and throws its light out through the gate)
  R.key.color.setHex(0xffd49a); R.key.angle = 1.0; R.key.penumbra = 0.75; R.key.distance = 12;
  R.key.position.set(car.x, 3.05, car.z); R.key.target.position.set(lock.x + out.x * 0.8, 0.7, lock.z + out.z * 0.8);
  R.key.intensity = 60 * Cinema.lamp;
  // ---- you ----
  const gateYaw = Math.atan2(-(lock.x - c.x), -(lock.z - c.z));
  const turn = smooth01(T / 0.9), flinch = T > E.slam ? smooth01((T - E.slam) / 0.45) : 0;
  const push = T > E.arrive + 0.8 ? smooth01((T - E.arrive - 0.8) / 4.2) : 0;
  const dGate = Math.hypot(lock.x - c.x, lock.z - c.z);
  const back = flinch * Math.min(0.4, Math.max(0, 3.0 - dGate)) * (1 - push);
  const fwd = push * Math.max(0, dGate - 1.4) * 0.45;
  let px = c.x - out.x * back + (lock.x - c.x) / Math.max(dGate, 0.01) * fwd, pz = c.z - out.z * back + (lock.z - c.z) / Math.max(dGate, 0.01) * fwd;
  let yaw = lerpAngle(c.yaw, gateYaw, turn), pitch = lerp(c.pitch, 0.04, turn);
  if (T > E.up) {
    // up at the dial; down at the floor when it hits from below; back to the gate
    const up = smooth01((T - 7.6) / 0.9) * (1 - smooth01((T - 9.2) / 0.5));
    const dn = smooth01((T - E.bang - 0.1) / 0.35) * (1 - smooth01((T - E.bang - 1.4) / 0.8));
    pitch += up * 0.36 - dn * 0.55;
    yaw += Math.sin(T * 0.4) * 0.03 * (1 - push);
  }
  pitch += kick * 0.4 + Math.sin(t * 1.3) * 0.01;
  R.camera.position.set(px, EYE_H + kick * 0.6, pz);
  R.camera.rotation.set(pitch, yaw, 0);
  const fov = lerp(72, 58, push);
  if (Math.abs(R.camera.fov - fov) > 0.05) { R.camera.fov = fov; R.camera.updateProjectionMatrix(); }
  if (T > E.up && T < E.arrive) R.shake = Math.max(R.shake || 0, 0.14 + Math.random() * 0.05);
  cineShake(dt, t);
  if (World.viewModel) World.viewModel.group.visible = true;
  // your torch: on the gate; off in the blackout; jittering at the bottom of the ride
  // your torch: low, on the gate, while the car's lamp is lit; off in the blackout; jittering when it's hit
  setFlash(T >= E.black && T < E.up + 0.3 ? 0 : (Cinema.flicker > 0.4 && Math.random() < 0.4 ? 0.06 : 0.16) * (T > E.arrive + 0.5 ? 1.6 : 1));
  R.flashTarget.position.set(0.05, -0.75, -3);
  updateMates(dt, t);
  updateLightPool(dt, R.camera, Cinema.ca);
  R.fear = T > E.roar && T < E.black ? 0.85 : T > E.bang && T < E.fall + 1 ? 0.5 : T > E.knock1 ? 0.55 : damp(R.fear, 0.15, 1, dt);
  if (T >= E.black && T < E.up) R.fade = 1;
  else if (T < E.title) R.fade = damp(R.fade, 0, 5, dt);
  else R.fade = 1;
}
// the ending's set comes down with everything else when you leave it
function seizeEndingLeave() {
  if (SHAFT.group) SHAFT.group.visible = false;
  if (SHAFT.dial) SHAFT.dial.visible = false;
  const D = World.locks ? World.locks.find((d) => d.lock.type === 'Z') : null;
  if (D) { D.group.position.set(D.lock.x, 0, D.lock.z); D.group.rotation.z = 0; }
  if (Chud.ov === _szOv) Chud.ov = null;
}
// the black card between levels: kicker, the name, a line under it
function setNextCard(kick, a, b, note) {
  setText($('nc-kick'), kick);
  const h = $('nc-title'); h.textContent = '';
  const dash = document.createElement('span'); dash.className = 'nc-dash'; dash.textContent = ' - ';
  h.append(document.createTextNode(a), dash, document.createTextNode(b));
  setText($('nc-note'), note);
  $('next-card').hidden = true; $('next-card').className = 'fullscreen';
}
