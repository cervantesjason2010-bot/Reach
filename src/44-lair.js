// ================= the lair: where it lives, and how it comes out =================
// Every area's vent is an old intake shaft: a square hole in the wall behind a heavy louvred steel cover,
// and a tunnel of bare wet concrete running back into the dark. It lives in there. When it comes out of one -
// the first time, or when someone walks up to the cover while it is still inside - it comes out like this,
// the same on every machine, played off the host's clock:
//   (walked in on) its face pressed to the slats, watching whoever came close; a nail ticking on the steel
//   three blows from inside, each one buckling the cover further - dust off the frame, the floor jumping
//   the cover bursts off its bolts and goes cartwheeling across the floor
//   a hand comes out and slams flat on the floor; the other takes hold of the edge of the hole
//   the head, turned on its side, out into the light - it stops, and looks at you
//   and it pours itself out of the hole, shoulders cracking as they fold through, and gets up.

const EM = {
  TEASE: 2.8,                 // walked in on: this long with its face at the slats first
  TICKS: [0.7, 1.15, 1.5, 2.2], // a nail on the louvres, during the tease
  KNOCKS: [0.4, 1.1, 1.72],   // the blows, from the start of the knocking
  BURST: 2.3,
  HAND_R: [2.5, 2.92],        // out of the hole, and slammed down on the floor
  HAND_L: [3.0, 3.42],        // out, and onto the edge of the hole
  PULL: [3.6, 6.0],           // the body comes out
  CRACKS: [4.1, 4.45, 5.05],
  SCREAM: 6.15, END: 7.0,
};
function emergeLead(te) { return te ? EM.TEASE : 0; }
function emergeEnd(te) { return emergeLead(te) + EM.END; }
// the choreography's own clock: a vent it has come out of before has no cover left to hit, so the knocking
// is skipped and it comes straight out of the dark
function emergeClock(em, T) { const lead = emergeLead(em.te); return em.ob && T >= lead ? T + EM.BURST - 0.2 : T; }
const easeOut01 = (k) => { k = clamp(k, 0, 1); return 1 - (1 - k) * (1 - k); };

// how far out of the wall its middle is, Tk seconds into the knocking (negative while it is still teasing)
function emergeS(I, Tk) {
  const fin = Math.min(3.4, I.free - 1.1);
  if (Tk < EM.BURST - 0.1) return -1.85;
  if (Tk < EM.BURST + 0.25) return lerp(-1.85, -0.75, easeOut01((Tk - (EM.BURST - 0.1)) / 0.35));
  if (Tk < EM.PULL[0]) return -0.75;
  if (Tk < EM.PULL[1]) {
    // two heaves with a catch between them, where the shoulders fold to fit
    const k = (Tk - EM.PULL[0]) / (EM.PULL[1] - EM.PULL[0]);
    const e = k < 0.4 ? 0.42 * smooth01(k / 0.4) : k < 0.56 ? 0.42 + 0.03 * (k - 0.4) / 0.16 : 0.45 + 0.55 * smooth01((k - 0.56) / 0.44);
    return lerp(-0.75, fin - 0.6, e);
  }
  return lerp(fin - 0.6, fin, smooth01((Tk - EM.PULL[1]) / (EM.END - EM.PULL[1])));
}
function emergeRoot(I, T, te, out) {
  const s = emergeS(I, T - emergeLead(te));
  out.x = I.cx + I.nx * s; out.z = I.cz + I.nz * s; out.s = s;
  return out;
}
// the blows: drawn back, then driven into the cover (1 = its face against the steel)
function knockPush(Tk) {
  let best = null;
  for (const h of EM.KNOCKS) { const d = Tk - h; if (d > -0.5 && d < 0.7 && (best === null || Math.abs(d) < Math.abs(best))) best = d; }
  if (best === null) return 0;
  const d = best;
  if (d < -0.3) return -0.3 * smooth01((d + 0.5) / 0.2);
  if (d < 0) return lerp(-0.3, 1, Math.pow((d + 0.3) / 0.3, 2.2));
  return Math.exp(-d * 5.5);
}

// ---------- the level: free floor in front of each hole ----------
function lairFree(L, I) {
  let d = 0.2;
  const ok = (x, z) => { const gx = Math.floor(x), gz = Math.floor(z); return inGrid(L, gx, gz) && L.cwalk[gz * L.W + gx] && !L.tunnel.has(gz * L.W + gx); };
  for (; d < 8; d += 0.1) {
    const x = I.cx + I.nx * d, z = I.cz + I.nz * d;
    if (!ok(x, z) || !ok(x + I.tx * 0.9, z + I.tz * 0.9) || !ok(x - I.tx * 0.9, z - I.tz * 0.9)) break;
  }
  return d;
}

// ---------- building it: the tunnel, the frame, what it has dragged in there ----------
function tunPlane(w, h, tm = 2) {
  return cachedGeo('tunP' + [w, h, tm].join(','), () => {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tm, uv.getY(i) * h / tm);
    return g;
  });
}
function lairFrame(I) { return frame(I.cx, I.cz, Math.atan2(I.nx, I.nz)); }
function dressLairTunnel(L, B, I, rnd) {
  const f = lairFrame(I), W = I.w, D = I.D, top = I.top;
  const wallM = mat('concreteDark', { color: 0x5e5a54 }), floorM = mat('concreteDark', { color: 0x4a4640 }), ceilM = mat('concreteDark', { color: 0x3c3a36 });
  // the shaft: floor, roof, the two sides and the far end, all bare concrete gone black with wet
  f.geo(B, floorM, tunPlane(W, D), 0, 0.002, -D / 2, 0, -Math.PI / 2);
  f.geo(B, ceilM, tunPlane(W, D), 0, top, -D / 2, 0, Math.PI / 2);
  f.geo(B, wallM, tunPlane(D, top), -W / 2, top / 2, -D / 2, Math.PI / 2);
  f.geo(B, wallM, tunPlane(D, top), W / 2, top / 2, -D / 2, -Math.PI / 2);
  f.geo(B, wallM, tunPlane(W, top), 0, top / 2, -D);
  // the old duct's roof ribs, rotted through, and the stain of water running down the walls
  for (let z = -0.9; z > -D + 0.3; z -= 1.3) f.cbox(B, mat('rust'), 0, top - 0.04, z, W - 0.02, 0.08, 0.08, 0.01);
  for (const s of [-1, 1]) f.geo(B, decalMat('stain'), tunPlane(1.6, 1.6, 1.6), s * (W / 2 - 0.006), top * 0.55, -1.8 - (s + 1) * 0.6, s > 0 ? -Math.PI / 2 : Math.PI / 2);
  // the steel frame the cover was bolted into: angle iron round the opening, with the bolts
  const steel = mat('steelDark'), fr = 0.09;
  for (const s of [-1, 1]) f.cbox(B, steel, s * (W / 2 + fr / 2 - 0.02), top / 2, 0.0, fr, top, 0.16, 0.01);
  f.cbox(B, steel, 0, top + fr / 2 - 0.02, 0.0, W + fr * 2 - 0.04, fr, 0.16, 0.01);
  f.cbox(B, steel, 0, 0.02, 0.0, W + fr * 2 - 0.04, 0.04, 0.16, 0.008);
  for (const [x, y] of [[-1, 0.25], [-1, top / 2], [-1, top - 0.25], [1, 0.25], [1, top / 2], [1, top - 0.25]]) f.cyl(B, mat('steel'), x * (W / 2 + fr / 2 - 0.02), y, 0.085, 0.022, 0.022, 0.03, 8, Math.PI / 2);
  // stencil over it
  f.geo(B, labelMat('INTAKE  ' + (I.ai + 1) + '  -  NO ENTRY', { bg: '#e2ad3b', fg: '#141414', w: 512, h: 64 }), planeGeo(Math.min(2.2, W * 0.75), 0.16), 0, top + 0.32, 0.006);
  // It has been at the cover from inside for a long time: the frame and the wall round it are scored to the
  // concrete, and there is a print where a hand came round the edge
  f.geo(B, decalMat('scratch'), planeGeo(1.1, 1.5), -W / 2 - 0.55, 1.35, 0.007, 0, 0, 0.25);
  f.geo(B, decalMat('scratch'), planeGeo(1.0, 1.4), W / 2 + 0.6, 1.6, 0.007, 0, 0, -0.35);
  f.geo(B, decalMat('scratch'), planeGeo(1.4, 1.0), 0.3, top + 0.75, 0.007, 0, 0, 1.4);
  f.geo(B, decalMat('hand'), planeGeo(0.7, 0.85), W / 2 + 0.42, 1.1, 0.008, 0, 0, -1.2);
  f.geo(B, decalMat('blood'), planeGeo(0.9, 0.9), -W / 2 - 0.25, 0.55, 0.009, 0, 0, 0.6);
  // what it has dragged in: drag marks over the sill, and the nest further back
  f.geo(B, decalMat('drag'), cachedGeo('dragFloor', () => new THREE.PlaneGeometry(1.2, 3.0).rotateX(-Math.PI / 2)), -0.2, 0.009, 0.9, 0.1);
  f.geo(B, decalMat('drag'), cachedGeo('dragFloor', () => new THREE.PlaneGeometry(1.2, 3.0).rotateX(-Math.PI / 2)), 0.1, 0.009, -1.6, -0.15);
  for (let k = 0; k < 4; k++) f.geo(B, decalMat(k % 2 ? 'blood' : 'grime'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), (rnd() - 0.5) * (W - 0.8), 0.006 + k * 0.001, -1.2 - rnd() * (D - 1.8), rnd() * 6, 0, 0, 1.2, 1, 1.2);
  const bone = plainMat(0xb8ad94, { roughness: 0.75 }), boneD = plainMat(0x8a7e66, { roughness: 0.8 });
  const nestR = () => [(rnd() - 0.5) * (W - 0.7), -1.5 - rnd() * (D - 2.2)];
  for (let k = 0; k < 7; k++) { // long bones, knuckled at both ends
    const [x, z] = nestR(), a = rnd() * 6.28, len = 0.3 + rnd() * 0.18, bf = frame(...f.at(x, z), f.rot + a);
    bf.cyl(B, bone, 0, 0.022, 0, 0.016, 0.019, len, 8, Math.PI / 2);
    for (const s of [-1, 1]) bf.sphere(B, bone, 0, 0.03, s * len / 2, 0.032, 0.8);
  }
  for (let k = 0; k < 2; k++) { // ribs, a few still joined
    const [x, z] = nestR(), rf = frame(...f.at(x, z), f.rot + rnd() * 6.28);
    for (let r = 0; r < 5; r++) rf.geo(B, boneD, torusGeo(0.15 - r * 0.012, 0.012, 6, 12, Math.PI * 0.9), 0, 0.02, r * 0.07, 0, Math.PI / 2);
  }
  { // a skull, on its side
    const [x, z] = nestR(), sf = frame(...f.at(x, z), f.rot + rnd() * 6.28);
    sf.sphere(B, bone, 0, 0.1, 0, 0.1, 0.92);
    sf.cbox(B, boneD, 0, 0.04, 0.07, 0.11, 0.05, 0.09, 0.02);
    for (const s of [-1, 1]) sf.sphere(B, plainMat(0x0a0806), s * 0.035, 0.12, 0.085, 0.024);
  }
  { // a hard hat and a torn suit, a boot, a dead flashlight
    const [x, z] = nestR(), hf = frame(...f.at(x, z), f.rot + rnd() * 6.28);
    hf.geo(B, plainMat(0xd8a020, { roughness: 0.45 }), cachedGeo('hatDome', () => new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), 0, 0.0, 0, 0, 0.4, 0.2);
    hf.cbox(B, plainMat(0xd8a020, { roughness: 0.45 }), 0.03, 0.03, 0.17, 0.2, 0.012, 0.08, 0.005, 0, 1, 0.4, 0.2);
  }
  for (let k = 0; k < 3; k++) {
    const [x, z] = nestR(), cf = frame(...f.at(x, z), f.rot + rnd() * 6.28);
    cf.cbox(B, mat('fabric', { color: k ? 0xc8a428 : 0x3a4a5a }), 0, 0.02, 0, 0.5 + rnd() * 0.3, 0.03, 0.35 + rnd() * 0.3, 0.012, rnd(), 1, rnd() * 0.15, rnd() * 0.15);
  }
  { const [x, z] = nestR(), bf = frame(...f.at(x, z), f.rot + rnd() * 6.28); bf.cbox(B, plainMat(0x1a1714, { roughness: 0.8 }), 0, 0.07, 0, 0.11, 0.14, 0.26, 0.03); bf.cbox(B, plainMat(0x1a1714, { roughness: 0.8 }), 0, 0.2, -0.07, 0.1, 0.16, 0.1, 0.03); }
  { const [x, z] = nestR(), lf = frame(...f.at(x, z), f.rot + rnd() * 6.28); lf.cyl(B, plainMat(0x22262a, { roughness: 0.4, metalness: 0.6 }), 0, 0.03, 0, 0.026, 0.03, 0.22, 10, Math.PI / 2); }
  // rubble knocked off the sill, out on the floor in front
  for (let k = 0; k < 18; k++) {
    const sz = 0.04 + rnd() * 0.13;
    f.cbox(B, mat('concrete'), (rnd() - 0.5) * (W + 0.6), sz * 0.4, 0.15 + rnd() * 1.6, sz, sz * 0.7, sz * 0.9, sz * 0.15, rnd() * 3, 1, rnd(), rnd());
  }
}

// ---------- the cover: a louvred steel panel, and where it goes when it comes off ----------
// The flight is worked out once, here - a slab thrown out of the hole and tumbling end over end until it lies
// flat - so every machine shows it in the same place at the same moment.
function coverFlight(I) {
  const H = I.top - 0.06, th = 0.12, dt = 1 / 120;
  const maxS = I.free - 0.25;
  let s = 0.06, y = H / 2 + 0.03, vs = clamp((I.free - 1.2) * 1.6, 2.6, 4.6), vy = 2.3, a = 0, w = 3.0, rest = 0;
  const out = [];
  for (let i = 0; i < 400; i++) {
    out.push([s, y, a]);
    vy -= 9.81 * dt; s += vs * dt; y += vy * dt; a += w * dt;
    // the lowest corner of the slab
    const hs = Math.sin(a), hc = Math.cos(a), qs = Math.cos(a), qc = -Math.sin(a);
    let low = Infinity, lowS = 0;
    for (const u of [-1, 1]) for (const v of [-1, 1]) { const cy = y + u * H / 2 * hc + v * th / 2 * qc; if (cy < low) { low = cy; lowS = s + u * H / 2 * hs + v * th / 2 * qs; } }
    // and the far side of whatever it is flying across
    let far = -Infinity;
    for (const u of [-1, 1]) for (const v of [-1, 1]) far = Math.max(far, s + u * H / 2 * hs + v * th / 2 * qs);
    if (far > maxS) { s -= far - maxS; if (vs > 0) vs = -vs * 0.25; }
    if (low < 0) {
      y -= low;
      if (vy < 0) vy = -vy * (Math.abs(vy) > 1.5 ? 0.3 : 0);
      vs *= 0.62;
      // it rocks down onto its face, the way a dropped door does
      const flat = Math.round(a / Math.PI * 2) % 2 === 0 ? (a > 0 ? Math.PI / 2 : -Math.PI / 2) : Math.round(a / (Math.PI / 2)) * Math.PI / 2;
      w = w * 0.55 + (flat - a) * 26 * dt * 10;
      void lowS;
    }
    if (low < 0.02) { vs *= 1 - 3.2 * dt; w *= 1 - 5 * dt; }
    rest = Math.abs(vs) < 0.04 && Math.abs(vy) < 0.05 && Math.abs(w) < 0.05 && low < 0.02 ? rest + dt : 0;
    if (rest > 0.25) break;
  }
  // settle exactly flat
  const last = out[out.length - 1], flat = Math.round(last[2] / (Math.PI / 2)) * Math.PI / 2;
  out.push([last[0], th / 2 + 0.004, flat]);
  return out;
}
function buildLairCover(L, I) {
  const H = I.top - 0.06, Wd = I.w - 0.06;
  const grp = new THREE.Group(), B = new Batch();
  const f = frame(0, 0, 0), frameM = mat('steelDark'), blade = mat('metal', { color: 0x6a6e72 }), rusty = mat('rust');
  // the frame of the panel itself, and two stiffeners behind the louvres
  for (const s of [-1, 1]) f.cbox(B, frameM, s * (Wd / 2 - 0.035), 0, 0, 0.07, H, 0.1, 0.01);
  for (const s of [-1, 1]) f.cbox(B, frameM, 0, s * (H / 2 - 0.035), 0, Wd, 0.07, 0.1, 0.01);
  for (const x of [-Wd / 6, Wd / 6]) f.cbox(B, frameM, x, 0, -0.03, 0.05, H - 0.1, 0.04, 0.008);
  // the louvres, angled down and out, with gaps you can see through - and see something through
  const n = Math.floor((H - 0.14) / 0.21);
  for (let i = 0; i < n; i++) {
    const y = -H / 2 + 0.07 + (i + 0.5) * (H - 0.14) / n;
    f.cbox(B, i % 4 === 2 ? rusty : blade, 0, y, 0.005, Wd - 0.1, 0.095, 0.012, 0.004, 0, 1, -0.42, 0);
  }
  // bolts round the edge
  for (const [x, y] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) f.cyl(B, mat('steel'), x * (Wd / 2 - 0.035), y * (H / 2 - 0.035), 0.055, 0.02, 0.02, 0.02, 8, Math.PI / 2);
  f.geo(B, labelMat('DANGER  -  DO NOT OPEN', { bg: '#b8160e', fg: '#f5efe2', w: 512, h: 64 }), planeGeo(Math.min(1.4, Wd * 0.6), 0.14), 0, H * 0.18, 0.056);
  B.build(grp);
  grp.rotation.order = 'YXZ';
  World.areas[I.ai].group.add(grp);
  return { I, grp, H, path: coverFlight(I) };
}
function buildLairs(L) {
  World.lairCovers = [];
  for (const I of L.lairInfo || []) {
    if (!I) continue;
    I.free = lairFree(L, I);
    World.lairCovers[I.ai] = buildLairCover(L, I);
  }
}

// the cover, Tb seconds after it burst (or null: still in its frame), with how hard it was last hit
function poseLairCover(C, Tk, burst) {
  const I = C.I, g = C.grp, yaw = Math.atan2(I.nx, I.nz);
  let s = 0.02, y = C.H / 2 + 0.03, a = 0, twist = 0, roll = 0;
  if (burst) {
    const Tb = burst === true ? 99 : Math.max(0, Tk - EM.BURST);
    const fi = Math.min(C.path.length - 1, Math.floor(Tb * 120));
    [s, y, a] = C.path[fi];
    twist = 0.35 * (1 - Math.exp(-Tb * 2.5)) * (I.ai % 2 ? 1 : -1);
  } else if (Tk > 0) {
    // each blow buckles it a little more, and it never quite goes back
    let dmg = 0, kick = 0;
    EM.KNOCKS.forEach((h, i) => { if (Tk >= h) { dmg = i + 1; kick = Math.max(kick, Math.exp(-(Tk - h) * 9)); } });
    s += 0.012 * dmg + 0.07 * kick;
    a = 0.025 * dmg * dmg * 0.5 + 0.05 * kick;
    roll = (dmg >= 2 ? 0.02 : 0) * (I.ai % 2 ? 1 : -1);
  }
  g.position.set(I.cx + I.nx * s, y, I.cz + I.nz * s);
  g.rotation.set(a, yaw + twist, roll);
}

// ---------- every frame, on every machine ----------
const _emR = { x: 0, z: 0, s: 0 };
function lairBurst(g, ai) { return !!(g && g.lb && (g.lb >> ai) & 1); }
function updateLairs(dt) {
  const g = Game.g, C = Creature, L = Game.L;
  if (!World.lairCovers || !L) return;
  const em = g && g.em && g.rn === Game.round ? g.em : null;
  const T = em && Game.gt !== undefined ? emergeClock(em, Game.gt - em.t) : null;
  for (const cov of World.lairCovers) {
    if (!cov) continue;
    const ai = cov.I.ai;
    if (em && em.a === ai && !em.ob && T !== null && T >= 0 && T < emergeEnd(em.te) + 2) poseLairCover(cov, T - emergeLead(em.te), T - emergeLead(em.te) >= EM.BURST);
    else poseLairCover(cov, 0, lairBurst(g, ai) ? true : null);
  }
  if (!em || T === null || T < -0.3 || T > emergeEnd(em.te) + 0.5) {
    if (C.override && C.override.emerge) C.override = null;
    Game.emLast = -1;
    return;
  }
  const I = L.lairInfo[em.a];
  if (!I) return;
  if (I.free === undefined) I.free = lairFree(L, I);
  const lead = emergeLead(em.te), Tk = T - lead;
  if (T > emergeEnd(em.te)) { if (C.override && C.override.emerge) C.override = null; }
  else C.override = emergeOverride(I, T, em.te, C.override && C.override.emerge ? C.override : null);
  // what you hear, and feel, as it happens
  const last = Game.emLast === undefined || Game.emLast < 0 || Game.emLast > T ? Math.max(0, T - dt) : Game.emLast;
  Game.emLast = T;
  const crossed = (at) => last < at && T >= at;
  const hole = { x: I.cx, y: 1.3, z: I.cz };
  const me = Game.me, near = me ? clamp(1.25 - dist2(me.x, me.z, I.cx, I.cz) / 16, 0, 1) : 0;
  if (em.te) for (const t of EM.TICKS) if (crossed(t)) Sound.play('tick', hole);
  if (!em.ob) EM.KNOCKS.forEach((h, i) => {
    if (!crossed(lead + h)) return;
    Sound.play('ventHit', hole); Sound.bang('w', hole, near * 0.8);
    for (const s of [-1, 1]) debrisBurst(I.cx + I.tx * s * I.w / 2 + I.nx * 0.1, I.top * (0.4 + Math.random() * 0.5), I.cz + I.tz * s * I.w / 2 + I.nz * 0.1, 'w', 0.35 + i * 0.12);
    debrisBurst(I.cx + I.nx * 0.1, I.top, I.cz + I.nz * 0.1, 'c', 0.3 + i * 0.1);
    if (near > 0) { joltFrom(I.cx, I.cz, near * (0.7 + i * 0.2)); R.shake = Math.max(R.shake || 0, near * (0.9 + i * 0.35)); }
  });
  if (!em.ob && crossed(lead + EM.BURST)) {
    Sound.play('ventBurst', hole); Sound.whoosh(hole);
    debrisShower(I.cx + I.nx * 0.6, I.cz + I.nz * 0.6, 40);
    for (let k = 0; k < 4; k++) debrisBurst(I.cx + I.tx * (k / 1.5 - 1) * I.w / 2 + I.nx * 0.2, 0.3 + k * 0.5, I.cz + I.tz * (k / 1.5 - 1) * I.w / 2 + I.nz * 0.2, 'w', 0.9);
    if (near > 0) { joltFrom(I.cx, I.cz, near * 1.6); R.shake = Math.max(R.shake || 0, near * 2.2); R.hit = Math.max(R.hit || 0, near); }
  }
  // the cover coming down: a crash each time it hits the floor
  const cov = World.lairCovers[em.a];
  if (cov && !em.ob && Tk > EM.BURST) {
    const p = cov.path, i1 = Math.min(p.length - 1, Math.floor((Tk - EM.BURST) * 120)), i0 = Math.min(p.length - 1, Math.max(0, Math.floor((Tk - dt - EM.BURST) * 120)));
    for (let i = Math.max(1, i0 + 1); i <= i1; i++) {
      if (p[i][1] - p[i - 1][1] > 0.004 && p[i - 1][1] - (p[i - 2] || p[i - 1])[1] <= 0) {
        const at = { x: I.cx + I.nx * p[i][0], y: 0.2, z: I.cz + I.nz * p[i][0] };
        Sound.play('clatter', at); debrisBurst(at.x, 0.05, at.z, 'f', 0.4);
        if (near > 0) R.shake = Math.max(R.shake || 0, near * 0.8);
      }
    }
  }
  if (crossed(lead + EM.HAND_R[1])) { const h = C.override && C.override.hands && C.override.hands[1]; const p = h ? h.p : hole; Sound.bang('f', p, near * 0.6); debrisBurst(p.x, 0.05, p.z, 'f', 0.5); }
  if (crossed(lead + EM.HAND_L[1])) { const h = C.override && C.override.hands && C.override.hands[0]; Sound.creatureStep('slap', h ? h.p : hole); }
  for (const c of EM.CRACKS) if (crossed(lead + c)) Sound.play('crack', { x: I.cx + I.nx * 0.5, y: 1.2, z: I.cz + I.nz * 0.5 });
  if (crossed(lead + EM.SCREAM)) Sound.scream({ x: C.headPos.x, y: C.headPos.y, z: C.headPos.z });
}

// the creature's half of it: where its body is, what its hands are doing, how far out of the wall it may be
const _emV = Array.from({ length: 6 }, () => new THREE.Vector3());
function emergeOverride(I, T, te, prev) {
  const o = prev || { emerge: true, root: { x: 0, z: 0 }, hands: [null, null], plane: null, look: null };
  const lead = emergeLead(te), Tk = T - lead, f = lairFrame(I);
  emergeRoot(I, T, te, _emR);
  o.root.x = _emR.x; o.root.z = _emR.z; o.yaw = Math.atan2(I.nx, I.nz);
  // until it bursts out it is held behind the cover: well back while it watches, right up against it as it hits
  const push = Tk < 0 ? 0 : knockPush(Tk);
  o.plane = Tk < EM.BURST - 0.02 ? { x: I.cx, z: I.cz, nx: I.nx, nz: I.nz, m: Tk < 0 ? 0.3 : 0.07 } : null;
  o.headPush = Tk < EM.BURST ? 0.75 * push : 0;
  o.surge = Tk < EM.BURST ? 0.35 * push : 0;
  o.uMax = Tk < EM.PULL[1] ? 0.1 : 1;
  o.scream = Tk >= EM.SCREAM && Tk < EM.SCREAM + 1.1;
  const W = I.w;
  const at = (v, x, y, z) => { const [wx, wz] = f.at(x, z); return v.set(wx, y, wz); };
  const hand = (i, p, n, fd, on) => {
    const h = o.hands[i] || (o.hands[i] = { p: new THREE.Vector3(), n: new THREE.Vector3(), f: new THREE.Vector3(), on: 0 });
    h.p.copy(p); h.n.copy(n); h.f.copy(fd).normalize(); h.on = on; return h;
  };
  const up = _emV[3].set(0, 1, 0), outN = _emV[4].set(I.nx, 0, I.nz), along = _emV[5].set(I.tx, 0, I.tz);
  // the right hand - the long one - first: out of the dark and slammed flat on the floor
  if (Tk < EM.BURST || Tk > EM.PULL[1] - 0.5) o.hands[1] = null;
  else if (Tk < EM.HAND_R[0]) hand(1, at(_emV[0], -0.45, 0, -0.55), up, outN, 1);
  else {
    const k = clamp((Tk - EM.HAND_R[0]) / (EM.HAND_R[1] - EM.HAND_R[0]), 0, 1), e = Math.pow(k, 1.5);
    const a = at(_emV[0], -0.45, 0.05, -0.55), b = at(_emV[1], -0.5, 1.45, 0.7), c = at(_emV[2], -0.62, 0, 2.15);
    const p = a.multiplyScalar((1 - e) * (1 - e)).addScaledVector(b, 2 * e * (1 - e)).addScaledVector(c, e * e);
    hand(1, p, up, outN, k > 0.9 ? 1 : 0);
  }
  // the other takes hold of the edge of the hole, palm flat on the wall beside it, fingers spread away
  if (Tk < EM.BURST || Tk > EM.PULL[0] + 1.25) o.hands[0] = null;
  else if (Tk < EM.HAND_L[0]) hand(0, at(_emV[0], 0.45, 0, -0.6), up, outN, 1);
  else {
    const k = clamp((Tk - EM.HAND_L[0]) / (EM.HAND_L[1] - EM.HAND_L[0]), 0, 1), e = smooth01(k);
    const a = at(_emV[0], 0.45, 0.05, -0.6), b = at(_emV[1], W / 2 - 0.25, 1.55, 0.45), c = at(_emV[2], W / 2 + 0.34, 1.12, 0.035);
    const p = a.multiplyScalar((1 - e) * (1 - e)).addScaledVector(b, 2 * e * (1 - e)).addScaledVector(c, e * e);
    hand(0, p, k > 0.85 ? outN : up, k > 0.85 ? _emV[1].copy(along).addScaledVector(up, 0.35) : outN, k > 0.9 ? 1 : 0);
  }
  return o;
}
