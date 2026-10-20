// ================= cinema: cold open, lobby lineup, elevator ride, the escape =================
const Cinema = { mode: null, t: 0, cues: [], lineup: [], selfModel: null };
function setCues(list) { Cinema.cues = list.map(([at, fn]) => ({ at, fn, done: false })); Cinema.t = 0; }
function runCues() { for (const c of Cinema.cues) if (!c.done && Cinema.t >= c.at) { c.done = true; c.fn(); } }
function areaPt(ai, x, z) { const a = Game.L.areas[ai]; return { x: a.offX + x, z: a.offZ + z }; }
const _look = new THREE.Vector3();
function camAt(x, y, z, lx, ly, lz) { R.camera.position.set(x, y, z); _look.set(lx, ly, lz); R.camera.lookAt(_look); }

// ---------- cold open ----------
function startColdOpen() {
  Cinema.mode = 'coldopen';
  setLetterbox(true);
  R.fade = 1;
  const c0 = areaPt(7, 6.5, 12.0), cell = areaPt(7, 21.5, 6.6);
  Cinema.coldCam = { x0: c0.x, x1: c0.x + 9.5, z: c0.z };
  Cinema.cell = cell;
  Cinema.crNet = { x: cell.x, z: cell.z, yaw: 0, st: 0.2, mode: 'reach', lx: cell.x, ly: 1.2, lz: cell.z + 3.0 };
  setAreaVisibility(7);
  $('credit').hidden = false; $('credit').classList.remove('show');
  Sound.setTheme('contain');
  setCues([
    [0.3, () => $('credit').classList.add('show')],
    [0.4, () => Sound.play('heart')],
    [3.2, () => $('credit').classList.remove('show')],
    [4.0, () => { $('credit').hidden = true; }],
    [7.6, () => { Sound.play('knock', { x: cell.x, y: 1, z: cell.z }); }],
    [9.4, () => { Cinema.dark = true; Sound.play('scrape', { x: cell.x, y: 1, z: cell.z + 2 }); }],
    [10.6, () => { Sound.scream({ x: cell.x, y: 2, z: cell.z + 2 }); R.shake = 0.8; }],
    [11.4, () => { R.fade = 1; $('title-card').hidden = false; $('title-card').classList.add('show'); Sound.play('impact'); }],
    [16.5, () => finishColdOpen()],
  ]);
}
function updateColdOpen(dt, t) {
  for (let k = 0; k < 3; k++) WS.occSp.value[2 + k].w = -1;
  Cinema.t += dt; runCues();
  const c = Cinema.coldCam, k = smooth01((Cinema.t - 3.4) / 8);
  if (Cinema.t > 3.4 && Cinema.t < 11.4) R.fade = Math.max(0, 1 - (Cinema.t - 3.4) / 1.2);
  const x = lerp(c.x0, c.x1, k);
  // the light finds the bars of cell four, then what is reaching through them
  const look = smooth01((Cinema.t - 5.5) / 3);
  camAt(x, 1.55 + Math.sin(t * 1.3) * 0.02, c.z, x + 4, lerp(1.4, 1.25, look), lerp(c.z - 0.4, c.z - 1.6, look) + Math.sin(t * 0.4) * 0.2);
  setFlash(Cinema.dark ? (Math.random() < 0.1 ? 0.45 : 0) : 0.9);
  const rk = smooth01((Cinema.t - 6.5) / 2.6);
  Cinema.crNet.lz = Cinema.cell.z + lerp(2.4, 5.7, rk);
  Cinema.crNet.lx = Cinema.cell.x - lerp(0, 2.4, rk) + Math.sin(t * 2) * 0.1;
  Cinema.crNet.ly = lerp(1.1, 1.45, rk);
  updateCreature(dt, t, Cinema.t > 6 && Cinema.t < 11.4 ? Cinema.crNet : { mode: 'hidden' }, Game.L, R.camera.position);
  updateLightPool(dt, R.camera, 7);
  R.fear = Cinema.t > 7 && Cinema.t < 11.4 ? 0.6 : 0;
}
function finishColdOpen() {
  if (Cinema.mode !== 'coldopen') return;
  $('credit').hidden = true;
  $('title-card').classList.remove('show');
  setTimeout(() => { $('title-card').hidden = true; }, 600);
  updateCreature(0, 0, { mode: 'hidden' }, Game.L, R.camera.position);
  Cinema.dark = false;
  enterLobbyScene();
}

// ---------- the lobby: your team lined up in the dark ----------
function enterLobbyScene() {
  Cinema.mode = 'lobby';
  setLetterbox(false);
  R.fade = 1;
  setAreaVisibility(0);
  Sound.setTheme('title');
  Sound.titleMusic(true);
  Cinema.t = 0;
  Cinema.passT = 6 + Math.random() * 4;
  setMode('lobby');
}
const LINEUP = [[23.4, 5.95], [23.4, 7.05], [24.6, 5.75], [24.6, 7.25]];
// where the mouse is on the menu, -1..1 each way, and where the camera has drifted to follow it
const MenuMouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('mousemove', (e) => { MenuMouse.x = clamp(e.clientX / Math.max(1, window.innerWidth) * 2 - 1, -1, 1); MenuMouse.y = clamp(e.clientY / Math.max(1, window.innerHeight) * 2 - 1, -1, 1); });
function updateLobbyScene(dt, t) {
  for (let k = 0; k < 3; k++) WS.occSp.value[2 + k].w = -1;
  Cinema.t += dt;
  R.fade = damp(R.fade, 0, 1.2, dt);
  const peers = Net.mode === 'solo' ? [{ id: 'me', me: true, s: { n: Settings.name, c: Settings.color } }] : netPeers();
  // keep one model per person, in join order
  const want = peers.slice(0, 4);
  while (Cinema.lineup.length > want.length) { const m = Cinema.lineup.pop(); R.scene.remove(m.h.root); }
  want.forEach((p, i) => {
    let m = Cinema.lineup[i];
    const name = String(p.s.n || 'Player').slice(0, 14), col = playerColor(p.s.c);
    if (!m || m.key !== p.id + name + col) {
      if (m) R.scene.remove(m.h.root);
      m = { key: p.id + name + col, h: makeHuman(col, name), born: t };
      R.scene.add(m.h.root);
      Cinema.lineup[i] = m;
    }
    const pos = areaPt(0, LINEUP[i][0], LINEUP[i][1]);
    m.h.root.position.set(pos.x, 0, pos.z);
    m.h.root.rotation.y = -Math.PI / 2 + Math.sin(t * 0.3 + i) * 0.15;
    animateHuman(m.h, dt, 0, -0.35 + Math.sin(t * 0.5 + i * 2) * 0.12, 0, true, t + i);
    m.h.headG.rotation.y = Math.sin(t * 0.4 + i * 1.7) * 0.5;
  });
  // flashlights from the lineup
  R.mates.forEach((l, i) => {
    const m = Cinema.lineup[i];
    if (!m) { l.light.intensity = 0; return; }
    m.h.torch.getWorldPosition(_tw); m.h.torch.getWorldQuaternion(_tq);
    _tdir.set(0, 0, 1).applyQuaternion(_tq);
    l.light.position.copy(_tw); l.target.position.copy(_tw).addScaledVector(_tdir, 3); l.light.intensity = LUX.mate;
  });
  const kc = areaPt(0, 22.4, 5.4), kt = areaPt(0, 24, 6.5);
  R.key.position.set(kc.x, 5.6, kc.z); R.key.target.position.set(kt.x, 1.0, kt.z); R.key.intensity = 55 * (Math.random() < 0.02 ? 0.3 : 1);
  // The camera drifts in front of them, looking past them down the aisle - and leans after the mouse, as if
  // you were the one standing there turning your head a little to see.
  MenuMouse.sx = damp(MenuMouse.sx, MenuMouse.x, 2.4, dt); MenuMouse.sy = damp(MenuMouse.sy, MenuMouse.y, 2.4, dt);
  const mx = MenuMouse.sx, my = MenuMouse.sy;
  const c = areaPt(0, 20.6, 6.5);
  camAt(c.x + Math.sin(t * 0.17) * 0.2, 1.45 + Math.sin(t * 0.23) * 0.06 - my * 0.18, c.z + Math.sin(t * 0.11) * 0.3 + mx * 0.45,
    c.x + 6, 1.25 - my * 0.55, c.z + Math.sin(t * 0.13) * 0.3 + mx * 1.6);
  setFlash(0);
  // now and then, something crosses the far end of the aisle
  Cinema.passT -= dt;
  let net = { mode: 'hidden' };
  if (Cinema.passT < 0) {
    const k = -Cinema.passT / 7;
    const a = areaPt(0, 36.4, 1.5), b = areaPt(0, 36.4, 14);
    if (k < 1) net = { x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k), yaw: 0, st: 0.1, mode: 'walk', lx: a.x - 6, ly: 1.4, lz: lerp(a.z, b.z, k) };
    else Cinema.passT = 14 + Math.random() * 10;
  }
  updateCreature(dt, t, net, Game.L, R.camera.position);
  const bl = areaPt(0, 32.5, 6.5);
  R.backlight.position.set(bl.x, 3.2, bl.z);
  R.backlight.intensity = LUX.backlight * (Math.random() < 0.03 ? 0.2 : 1);
  updateLightPool(dt, R.camera, 0);
}
function clearLineup() { for (const m of Cinema.lineup) R.scene.remove(m.h.root); Cinema.lineup = []; R.mates.forEach((l) => { l.light.intensity = 0; }); R.backlight.intensity = 0; R.key.intensity = 0; }

// ---------- the ride down ----------
// The car goes down with the radio talking you through it. Near the bottom the power starts to go: the lamp
// stutters and buzzes, the motor labours. Then everything dies at once, the car drops, and the safety brakes
// bite with a bang you feel through your whole body. Then nothing at all - until the emergency lamp comes on
// and the doors grind open.
const RIDE = { flick: 16.3, out: 18.9, slam: 19.45, red: 20.35, open: 21.7, gate: 22.3, go: 23.7 };
// the hatch in the car roof stays shut; the slam just shakes it in its frame
function ensureHatch() {
  if (!Cinema.hatch) {
    const h = new THREE.Group();
    const plate = new THREE.Mesh(cboxGeo(0.9, 0.05, 0.9, 0.008, 2.4), mat('tread'));
    h.add(plate);
    R.scene.add(h);
    Cinema.hatch = h; Cinema.plate = plate;
  }
  const hc = areaPt(0, LIFT.hatch[0], LIFT.hatch[1]);
  Cinema.hatch.position.set(hc.x, 3.17, hc.z); Cinema.hatch.visible = true; Cinema.plate.rotation.set(0, 0, 0); Cinema.plate.position.set(0, 0, 0);
}
// shake for the cutscenes: the same smooth noise the play camera uses, a slow rumble plus sharp hits
function cineShake(dt, t) {
  R.shake = Math.max(0, (R.shake || 0) - dt * 1.4);
  R.hit = Math.max(0, (R.hit || 0) - dt * 3.4);
  const sh = R.shake * R.shake * 0.09, hs = R.hit * R.hit * 0.075, ht = t * 1.7, cam = R.camera;
  cam.position.x += shakeN(t, 1.3) * sh * 0.55 + shakeN(ht, 2.2) * hs * 0.55;
  cam.position.y += shakeN(t, 7.1) * sh * 0.45 + shakeN(ht, 8.3) * hs * 0.4;
  cam.position.z += shakeN(t, 3.9) * sh * 0.55 + shakeN(ht, 4.7) * hs * 0.55;
  cam.rotation.x += shakeN(t, 5.2) * sh * 0.22 + shakeN(ht, 6.1) * hs * 0.2;
  cam.rotation.z += shakeN(t, 9.4) * sh * 0.32 + shakeN(ht, 1.9) * hs * 0.3;
}
// a heavy jolt in the knees: the eye drops and springs back
function cineKick(dt) {
  const h = Math.min(dt, 0.05);
  Cinema.kickV = (Cinema.kickV || 0) + (-(Cinema.kick || 0) * 120 - (Cinema.kickV || 0) * 11) * h;
  Cinema.kick = (Cinema.kick || 0) + Cinema.kickV * h;
  return Cinema.kick;
}
function startIntro() {
  Cinema.mode = 'intro';
  clearLineup();
  Sound.titleMusic(false);
  Sound.setTheme('elevator');
  setLetterbox(true);
  setAreaVisibility(0);
  R.fade = 1;
  ensureHatch();
  startLiftIntro();
  const hc = areaPt(0, LIFT.hatch[0], LIFT.hatch[1]), lamp = areaPt(0, 1.35, 12.2), mid = areaPt(0, 3, 12);
  const coop = Net.mode !== 'solo' && netPeers().length > 1;
  Cinema.coop = coop;
  const LS = INTRO_LINES[Game.levelKey] || INTRO_LINES.l1, lines = coop ? LS.coop : LS.solo;
  const lampP = { x: lamp.x, y: 3.0, z: lamp.z }, roof = { x: mid.x, y: 3.6, z: mid.z };
  setCues([
    [0.2, () => { $('floor-ind').hidden = false; }],
    [1.5, () => { Sound.play('radio'); subtitle(lines[0][0], lines[0][1] * 1000); }],
    [5.8, () => { Sound.play('radio'); subtitle(lines[1][0], lines[1][1] * 1000); }],
    [10.0, () => { Sound.play('radio'); subtitle(lines[2][0], lines[2][1] * 1000); }],
    [14.2, () => { Sound.play('radio'); subtitle(lines[3][0], lines[3][1] * 1000); }],
    // the power starts to go
    [RIDE.flick, () => { Sound.play('buzz', lampP); Sound.setTheme('elevator', { drone: 0.55, machine: 1.25 }); }],
    [RIDE.flick + 0.6, () => Sound.play('groan', roof)],
    [17.7, () => Sound.play('radio')],
    // and goes: the motor winds down, the car drops
    [RIDE.out, () => { Sound.play('powerDown', roof); Sound.setTheme('silent'); Cinema.dead = true; R.shake = Math.max(R.shake || 0, 0.5); }],
    [RIDE.out + 0.08, () => Sound.play('brakes', roof)],
    // the brakes bite
    [RIDE.slam, () => {
      Sound.play('liftSlam', roof); Sound.duck(0.85, 0.6, 2.2);
      R.shake = 1.7; R.hit = 1.5; Cinema.kickV = -3.2;
      Cinema.plateV = 2.6;
      debrisShower(mid.x, mid.z, 54);
      debrisBurst(hc.x, 3.12, hc.z, 'c', 0.9);
    }],
    [RIDE.slam + 0.55, () => Sound.play('creak', roof)],
    [RIDE.slam + 1.3, () => { Sound.play('knock', { x: hc.x, y: 3.6, z: hc.z }); debrisShower(mid.x, mid.z, 14); }],
    // the emergency lamp
    [RIDE.red, () => { Cinema.red = true; Sound.play('clunk', lampP); }],
    [RIDE.red + 0.5, () => Sound.play('groan', roof)],
    [RIDE.open, () => { Cinema.doorsOpen = true; Sound.play('door', { x: hc.x + 3, y: 1, z: hc.z }); Sound.setTheme(Game.L.areas[0].theme); }],
    [RIDE.gate, () => { Sound.play('gate', { x: hc.x + 2.4, y: 1.3, z: hc.z + 0.5 }); }],
    [RIDE.go, () => { $('floor-ind').hidden = true; subtitle('Go.', 1500); }],
  ]);
  Cinema.red = false; Cinema.doorsOpen = false; Cinema.dead = false; Cinema.kick = 0; Cinema.kickV = 0;
  Cinema.flickOn = true; Cinema.flickT = 0; Cinema.plateA = 0; Cinema.plateV = 0;
  $('floor-ind').style.opacity = '';
}
// where you look while the car goes down (area-local points): the gate and the shaft going by, the floor dial,
// a landing passing, the sign on the wall; then up at the lamp when it starts to stutter, down when the power
// dies, up at the roof as the grit comes down after the slam, and round to the doors
const INTRO_LOOK = [
  [0.0, [5.0, 1.45, 12.0]], [4.4, [5.0, 1.5, 12.25]], [6.0, [4.98, 2.95, 12.0]], [7.4, [4.98, 2.9, 12.05]],
  [9.0, [5.0, 1.15, 12.4]], [11.4, [5.0, 1.3, 12.0]], [12.9, [3.1, 2.05, 9.1]], [14.1, [3.4, 1.95, 9.2]], [15.4, [5.0, 1.5, 12.0]],
  [16.55, [5.0, 1.5, 12.05]], [17.15, [1.4, 2.95, 12.2]], [18.15, [1.45, 2.9, 12.25]], [18.75, [5.0, 1.35, 12.1]],
  [19.4, [5.0, 1.05, 12.0]], [20.25, [2.7, 3.15, 11.7]], [21.1, [2.75, 3.0, 11.75]], [21.95, [5.6, 1.5, 12.0]], [30, [5.6, 1.5, 12.0]],
];
function updateIntro(dt, t) {
  const g = Game.g;
  Cinema.t = g ? Math.max(Cinema.t + dt * 0.5, Math.min(Cinema.t + dt * 1.5, g.t)) : Cinema.t + dt;
  runCues();
  const T = Cinema.t;
  R.fade = damp(R.fade, T > 0.3 ? 0 : 1, 2, dt);
  updateLiftIntro(dt, T);
  // the dial: dead with the power, back on the emergency supply
  const level = Math.min(4, 2 + Math.floor(liftTravelAt(T) / LIFT.S + 0.5));
  const fi = $('floor-ind');
  setText(fi, introFloorText(T >= RIDE.slam, level));
  fi.style.opacity = T >= RIDE.out && T < RIDE.red ? '0' : T >= RIDE.flick && T < RIDE.out && !Cinema.flickOn ? '0.15' : '';
  // first person: where am I standing
  const me = Game.me;
  const coopShot = Cinema.coop && T < 14.5;
  const kick = cineKick(dt);
  if (coopShot) {
    // from the back of the car: the crew, the gate, the shaft sliding past behind them
    camAt(areaPt(0, 1.45 + 0.12 * Math.sin(T * 0.2), 0, 0).x, 1.86 + 0.03 * Math.sin(T * 0.5), areaPt(0, 0, 12 + 1.1 * Math.sin(T * 0.12 + 0.5)).z,
      areaPt(0, 4.7, 0).x, 1.3, areaPt(0, 0, 12 + 0.35 * Math.sin(T * 0.1)).z);
  } else if (me) {
    const look = (p) => { const q = areaPt(0, p[0], p[2]), dx = q.x - me.x, dz = q.z - me.z; return [Math.atan2(-dx, -dz), Math.atan2(p[1] - EYE_H, Math.max(0.3, Math.hypot(dx, dz)))]; };
    const K = INTRO_LOOK;
    let i = 0; while (i < K.length - 2 && T >= K[i + 1][0]) i++;
    const k = smooth01(clamp((T - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1));
    const A = look(K[i][1]), Bq = look(K[i + 1][1]);
    let yaw = lerpAngle(A[0], Bq[0], k), pitch = lerp(A[1], Bq[1], k);
    // breathing and the sway of the car; it gets jittery as the power goes
    const nerves = T > RIDE.flick && T < RIDE.open ? 1 : 0;
    yaw += Math.sin(T * 0.9) * 0.02 + Math.sin(T * 2.3) * 0.008 + nerves * Math.sin(T * 5.1) * 0.006;
    pitch += Math.sin(T * 1.1) * 0.012 + kick * 0.35;
    R.camera.position.set(me.x, EYE_H + kick, me.z);
    R.camera.rotation.set(pitch, yaw, 0);
  }
  cineShake(dt, t);
  if (World.viewModel) World.viewModel.group.visible = !coopShot;
  // the car lamp: steady, then stuttering and buzzing, worse and worse; dead; then the red emergency lamp
  const lp = World.lightSpots.find((s) => s.lift);
  let mul = 1;
  if (T >= RIDE.flick && T < RIDE.out) {
    const k = (T - RIDE.flick) / (RIDE.out - RIDE.flick);
    Cinema.flickT -= dt;
    if (Cinema.flickT <= 0) {
      Cinema.flickOn = !Cinema.flickOn;
      Cinema.flickT = Cinema.flickOn ? lerp(0.55, 0.06, k) * (0.3 + Math.random()) : lerp(0.04, 0.2, k) * (0.4 + Math.random());
      if (!Cinema.flickOn) Sound.play('flick', areaPt(0, 1.35, 12.2));
    }
    mul = Cinema.flickOn ? lerp(1, 0.55, k) * (0.8 + Math.random() * 0.2) : Math.random() * 0.05;
  } else if (T >= RIDE.out && T < RIDE.red) mul = 0;
  else if (T >= RIDE.red) mul = Math.min(1, (T - RIDE.red) * 6) * (0.85 + 0.15 * Math.sin(T * 2.2));
  if (lp) { lp.color = Cinema.red ? 0xff2a1a : 0xffe8c8; lp.base = Cinema.red ? 7 : 12; lp.mul = mul; }
  if (World.liftBulb && lp) { World.liftBulb.emissive.setHex(lp.color); World.liftBulb.emissiveIntensity = 3.2 * mul; }
  // your torch hangs low while the car is lit; in the dark it comes up, shaking
  const dark = T >= RIDE.out && T < RIDE.red + 0.6;
  setFlash(coopShot ? 0 : dark ? 0.85 : 0.28);
  if (dark) R.flashTarget.position.set(0.05 + Math.sin(T * 5.3) * 0.08, -0.2 + Math.sin(T * 4.1) * 0.07 + kick * 2, -3);
  else R.flashTarget.position.set(0.12, -1.65, -3);
  // the hatch plate jumps in its frame and rattles back down
  if (Cinema.plate) {
    Cinema.plateV += (-Cinema.plateA * 260 - Cinema.plateV * 9) * Math.min(dt, 0.05);
    Cinema.plateA += Cinema.plateV * Math.min(dt, 0.05);
    Cinema.plate.rotation.x = Cinema.plateA * 0.06; Cinema.plate.position.y = Math.max(0, Cinema.plateA) * 0.02;
  }
  // teammates in the car
  updateMates(dt, t);
  updateCreature(dt, t, { mode: 'hidden' }, Game.L, R.camera.position);
  updateLightPool(dt, R.camera, 0);
  R.fear = T > RIDE.out && T < RIDE.open ? 0.45 : T > RIDE.flick && T < RIDE.out ? 0.2 : 0;
}
function endIntro() {
  if (Cinema.mode !== 'intro') return;
  Cinema.mode = null;
  setLetterbox(false);
  $('floor-ind').hidden = true; $('floor-ind').style.opacity = '';
  if (Cinema.plate) { Cinema.plate.rotation.set(0, 0, 0); Cinema.plate.position.set(0, 0, 0); }
  settleLift();
  R.flashTarget.position.set(0.03, -0.05, -3);
  const lp = World.lightSpots.find((s) => s.lift);
  if (lp) { lp.color = 0xff2a1a; lp.base = 6; lp.mul = 1; }
  if (World.liftBulb) { World.liftBulb.emissive.setHex(0xff2a1a); World.liftBulb.emissiveIntensity = 3.2; }
  setMode('play');
}
