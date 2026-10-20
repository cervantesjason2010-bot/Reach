// ================= dynamic world: doors, devices, items, notes, water, flicker =================
let _glowTex = null;
function glowSprite(color, size) {
  if (!_glowTex) _glowTex = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glowTex, color: new THREE.Color(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.set(size, size, 1);
  return s;
}

function wallSide(L, gx, gz) {
  for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (cellKind(L, gx + dx, gz + dz) === 'solid') return [dx, dz];
  return [0, -1];
}
// which way a lock door faces: into its own room. The corridor beyond an exit belongs to the same area, so a
// neighbour inside the room's own map wins over one out in the corridor (the dock's shutter faces the dock).
function interiorDir(L, lock) {
  const c = lock.cells[0], a = L.areas[lock.area];
  const inRoom = (x, z) => !a || (x >= a.offX && x < a.offX + a.w && z >= a.offZ && z < a.offZ + a.h);
  let corridor = null;
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const x = c.x + dx, z = c.z + dz;
    if (inGrid(L, x, z) && L.area[z * L.W + x] === lock.area && cellKind(L, x, z) === 'open' && L.lockAt[z * L.W + x] < 0) {
      if (inRoom(x, z)) return [dx, dz];
      if (!corridor) corridor = [dx, dz];
    }
  }
  return corridor || [-1, 0];
}

// one of the freight lift's doors: a heavy painted steel leaf, ribbed both sides, hazard paint and a rubber
// safety edge down the edge that meets the other leaf (s = which way that edge is: +1 = +x)
function liftDoorLeaf(W, s) {
  const paint = mat('metal', { color: 0x5d6656 }), rib = mat('metal', { color: 0x4b5446 });
  const p = new THREE.Group();
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
  add(cboxGeo(W / 2, 2.85, 0.06, 0.008, 1.2), paint, 0, 1.425, 0);
  for (const y of [0.45, 1.2, 1.95, 2.55]) for (const z of [-0.04, 0.04]) add(cboxGeo(W / 2 - 0.08, 0.07, 0.025, 0.006), rib, 0, y, z);
  for (const z of [-0.0315, 0.0315]) { const hz = add(planeGeo(0.12, 2.8), hazardMat(), s * (W / 4 - 0.07), 1.42, z); hz.rotation.y = z < 0 ? Math.PI : 0; }
  add(boxGeo(0.03, 2.8, 0.07), PM.rubber, s * (W / 4 - 0.005), 1.42, 0);
  add(planeGeo(0.9, 0.26), labelMat('FREIGHT', { fg: '#d8a535', w: 256, h: 72 }), -s * 0.15, 1.6, 0.032);
  return p;
}
function buildLockDoor(L, lock) {
  const n = lock.cells.length;
  const [ix, iz] = interiorDir(L, lock);
  const ry = Math.atan2(ix, iz); // local +z faces the area interior
  const g = new THREE.Group();
  g.position.set(lock.x, 0, lock.z); g.rotation.y = ry;
  const W = n * 1.0 - 0.04;
  const D = { lock, group: g, open: 0, parts: {} };
  const steel = mat('steel'), dark = mat('steelDark');
  if (lock.type === 'B') {
    const hinge = new THREE.Group(); hinge.position.set(-W / 2, 0, 0);
    const door = new THREE.Mesh(boxGeo(W, 2.25, 0.08), mat('metal', { color: 0x5d6a62 }));
    door.position.set(W / 2, 1.125, 0); door.castShadow = true; door.receiveShadow = true;
    hinge.add(door); g.add(hinge);
    const boards = [];
    [[1.55, 0.3], [1.0, -0.24], [0.45, 0.18]].forEach(([y, rz], i) => {
      const b = new THREE.Mesh(boxGeo(1.25, 0.16, 0.045, 0.8), mat('wood'));
      b.position.set(0, y, 0.09 + i * 0.012); b.rotation.z = rz; b.castShadow = true;
      g.add(b); boards.push({ mesh: b, y, rz, vx: (i - 1) * 0.6 });
    });
    D.parts = { hinge, boards };
  } else if (lock.type === 'K' || lock.type === 'V' || lock.type === 'H' || lock.type === 'P' || lock.type === 'A') {
    const thick = lock.type === 'H' || lock.type === 'A' ? 0.3 : 0.1;
    const col = { K: 0x6a7480, V: 0x4a6a5a, H: 0x4a4e54, P: 0x7a6a40, A: 0x5a5244 }[lock.type];
    const PH = lock.top || 2.3; // the panel fills the opening, however tall it is
    const panel = new THREE.Group();
    const body = new THREE.Mesh(boxGeo(W, PH, thick), mat('metal', { color: col }));
    body.position.y = PH / 2; body.castShadow = true; body.receiveShadow = true;
    panel.add(body);
    if (lock.top) {
      // a tall roller shutter: the slats show as ribs across both faces, and a bottom bar
      const ribM = mat('metal', { color: 0x5e5232 });
      for (let y = 0.5; y < PH - 0.1; y += 0.24) for (const s of [-1, 1]) {
        const rib = new THREE.Mesh(boxGeo(W, 0.03, 0.02), ribM); rib.position.set(0, y, s * (thick / 2 + 0.008)); panel.add(rib);
      }
      const bar = new THREE.Mesh(boxGeo(W, 0.08, thick + 0.05), mat('steelDark')); bar.position.y = 0.04; bar.castShadow = true; panel.add(bar);
    }
    if (lock.type !== 'K') {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.25), hazardMat());
      stripe.position.set(0, 0.2, thick / 2 + 0.003); panel.add(stripe);
      const s2 = stripe.clone(); s2.position.z = -thick / 2 - 0.003; s2.rotation.y = Math.PI; panel.add(s2);
    }
    const label = { K: ['SECURITY', 'KEYCARD'], V: ['FLOOD DOOR', 'DRAIN FIRST'], H: ['BLAST DOOR', 'CONTROL ROOM'], P: ['NO POWER', 'BREAKER'], A: ['BULKHEAD 6', 'BOTH LEVERS'] }[lock.type];
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshStandardMaterial({ map: signTexture(label, { bg: '#1b1e21', fg: '#e2ad3b', sizes: [84, 40] }), roughness: 0.7 }));
    // on a shutter it sits proud of the ribs, between the bars that stand in front of it
    sign.position.set(lock.top && n % 2 === 1 ? -0.5 : 0, 1.55, thick / 2 + (lock.top ? 0.02 : 0.004)); panel.add(sign);
    g.add(panel);
    D.parts = { panel, rise: PH + 0.05 };
    if (lock.type === 'K') {
      const reader = new THREE.Group();
      reader.add(new THREE.Mesh(boxGeo(0.12, 0.18, 0.04), dark));
      const led = new THREE.Mesh(boxGeo(0.06, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
      led.position.set(0, 0.06, 0.025); reader.add(led);
      reader.position.set(W / 2 + 0.25, 1.25, 0.52);
      g.add(reader);
      D.parts.led = led;
    }
  } else if (lock.type === 'N') {
    D.parts = buildKeypadDoor(L, lock, g, W);
  } else if (lock.type === 'Z') {
    const left = liftDoorLeaf(W, 1), right = liftDoorLeaf(W, -1);
    left.position.set(-W / 4, 0, 0.05); right.position.set(W / 4, 0, 0.05);
    g.add(left, right);
    const lamp = new THREE.Mesh(boxGeo(0.4, 0.1, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
    lamp.position.set(0, 3.05, 0.55); g.add(lamp);
    D.parts = { left, right, lamp, W };
  }
  World.areas[lock.area].group.add(g);
  return D;
}

function updateLockDoor(D, state, dt, g, i) {
  const target = state && state.o ? 1 : 0;
  D.open = damp(D.open, target, D.lock.type === 'H' || D.lock.type === 'A' ? 0.9 : 2.2, dt);
  // the ending drives the lift doors itself
  if (D.lock.type === 'Z' && typeof Cinema !== 'undefined' && Cinema.mode === 'ending' && typeof Cinema.zOpen === 'number') D.open = Cinema.zOpen;
  const o = D.open, p = D.parts;
  if (D.lock.type === 'B') {
    p.hinge.rotation.y = -o * 1.75;
    p.boards.forEach((b) => {
      const fall = clamp(o * 1.6, 0, 1);
      b.mesh.position.y = lerp(b.y, 0.04, fall);
      b.mesh.position.z = 0.09 + fall * 0.5;
      b.mesh.position.x = b.vx * fall;
      b.mesh.rotation.z = lerp(b.rz, 0, fall);
      b.mesh.rotation.x = -fall * Math.PI / 2;
    });
  } else if (D.lock.type === 'N') {
    updateKeypadDoor(D, state, g, i);
  } else if (D.lock.type === 'K') {
    p.panel.position.x = o * 1.02;
    if (p.led) p.led.material.color.setHex(target ? 0x3cff7a : 0xff2a1a);
  } else if (D.lock.type === 'Z') {
    p.left.position.x = -p.W / 4 - o * p.W * 0.48;
    p.right.position.x = p.W / 4 + o * p.W * 0.48;
    p.lamp.material.color.setHex(state && state.ready ? 0x3cff7a : 0xff2a1a);
  } else {
    p.panel.position.y = o * (p.rise || 2.35);
  }
}

function buildDevice(L, d) {
  const [wx, wz] = wallSide(L, d.gx, d.gz);
  const ry = Math.atan2(-wx, -wz);
  const g = new THREE.Group();
  g.position.set(d.x + wx * 0.47, 0, d.z + wz * 0.47); g.rotation.y = ry;
  const D = { device: d, group: g, slots: [], progress: 0 };
  const dark = mat('steelDark');
  if (d.type === 'F' || d.type === 'G') {
    const big = d.type === 'G';
    const bw = big ? 1.4 : 0.6, bh = big ? 1.5 : 0.8;
    const box = new THREE.Mesh(boxGeo(bw, bh, 0.2), mat('metal', { color: big ? 0x5a5040 : 0x6a7078 }));
    box.position.set(0, 1.35, 0.1); g.add(box);
    const n = big ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (big ? 0.38 : 0.2);
      const slot = new THREE.Mesh(boxGeo(0.1, 0.22, 0.04), dark); slot.position.set(x, 1.4, 0.21); g.add(slot);
      const led = new THREE.Mesh(boxGeo(0.05, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); led.position.set(x, 1.6, 0.21); g.add(led);
      const fuse = new THREE.Mesh(cylGeo(0.035, 0.035, 0.16, 10), plainMat(0xe8a33a, { emissive: 0x7a4a08, roughness: 0.3 }));
      fuse.position.set(x, 1.4, 0.24); fuse.visible = false; g.add(fuse);
      D.slots.push({ led, fuse });
    }
    const lever = new THREE.Group(); lever.position.set(bw / 2 - 0.12, 1.05, 0.22);
    const arm = new THREE.Mesh(boxGeo(0.04, 0.32, 0.04), dark); arm.position.y = 0.16; lever.add(arm);
    const knob = new THREE.Mesh(sphereGeo(0.045), plainMat(0x9a1a12, { roughness: 0.4 })); knob.position.y = 0.32; lever.add(knob);
    g.add(lever); D.lever = lever;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.8, bw * 0.2), new THREE.MeshStandardMaterial({ map: signTexture(big ? ['GENERATOR', 'START'] : ['BREAKER', 'B-4'], { bg: '#e2ad3b', fg: '#141414', sizes: [96, 44] }) }));
    label.position.set(0, 1.35 + bh / 2 - bw * 0.12, 0.205); g.add(label);
  } else if (d.type === 'W') {
    // The main power switch for the whole dock: a heavy disconnect in a grey steel enclosure with a long red
    // throw-lever down its side, and beside it the distribution board it feeds - breakers in rows, lamps
    // over each bank that go from dead to green when the power comes back. Conduit runs up into the dark.
    const grey = mat('metal', { color: 0x6c7076 }), greyD = mat('metal', { color: 0x4a4e54 }), steelD = mat('steelDark');
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    // backboard: a sheet of plywood bolted to the wall, painted, scuffed
    add(cboxGeo(2.0, 1.78, 0.03, 0.006), mat('wood', { color: 0x3a3a34 }), 0.06, 1.45, 0.015);
    // the disconnect: enclosure, door seam, hinges, a viewing window onto the blades
    add(cboxGeo(0.66, 1.0, 0.32, 0.02), grey, -0.42, 1.42, 0.19);
    add(boxGeo(0.005, 0.94, 0.005), steelD, -0.42, 1.42, 0.353);
    for (const y of [1.08, 1.76]) add(cylGeo(0.02, 0.02, 0.09, 10), steelD, -0.76, y, 0.26);
    const win = add(boxGeo(0.24, 0.13, 0.004), new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.1, metalness: 0.4, emissive: 0x2a1a08, emissiveIntensity: 0 }), -0.47, 1.7, 0.353);
    add(new THREE.PlaneGeometry(0.5, 0.15), new THREE.MeshStandardMaterial({ map: signTexture(['MAIN POWER', 'DOCK B'], { bg: '#e2ad3b', fg: '#141414', sizes: [56, 40] }), roughness: 0.7 }), -0.42, 1.4, 0.354);
    add(new THREE.PlaneGeometry(0.4, 0.22), new THREE.MeshStandardMaterial({ map: signTexture(['DANGER', '480 V'], { bg: '#b8160e', fg: '#f5efe2', sizes: [62, 46] }), roughness: 0.7 }), -0.42, 1.12, 0.354);
    // ON / OFF stencils either end of the lever's swing
    add(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshStandardMaterial({ map: signTexture(['OFF'], { bg: '#1a1c1e', fg: '#e8e4da', sizes: [60] }), roughness: 0.7 }), -0.17, 1.84, 0.356);
    add(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshStandardMaterial({ map: signTexture(['ON'], { bg: '#1a1c1e', fg: '#6fff9a', sizes: [60] }), roughness: 0.7 }), -0.17, 1.0, 0.356);
    // the throw lever, big enough to see from across the bay: up is off, hauled all the way down is on
    const lever = new THREE.Group(); lever.position.set(-0.06, 1.42, 0.24);
    add(cylGeo(0.065, 0.065, 0.09, 18), steelD, -0.06 + 0.04, 1.42, 0.24, 0, 0, Math.PI / 2);
    const arm = new THREE.Mesh(cboxGeo(0.06, 0.74, 0.06, 0.012), mat('metal', { color: 0xa8acb0 })); arm.position.set(0.075, 0.35, 0); arm.castShadow = true; lever.add(arm);
    const grip = new THREE.Mesh(cylGeo(0.05, 0.05, 0.26, 16), plainMat(0xc01a10, { roughness: 0.4 })); grip.rotation.z = Math.PI / 2; grip.position.set(0.18, 0.72, 0); grip.castShadow = true; lever.add(grip);
    for (const x of [0.05, 0.31]) { const cap = new THREE.Mesh(cylGeo(0.054, 0.054, 0.02, 16), mat('steelDark')); cap.rotation.z = Math.PI / 2; cap.position.set(x, 0.72, 0); lever.add(cap); }
    const pin = new THREE.Mesh(cylGeo(0.024, 0.024, 0.2, 10), steelD); pin.rotation.z = Math.PI / 2; pin.position.set(0.05, 0, 0); lever.add(pin);
    g.add(lever); D.throwLever = lever;
    // the distribution board: open steel cabinet, three banks of breakers, a lamp over each bank
    const bx = 0.56;
    add(cboxGeo(0.74, 1.12, 0.17, 0.015), greyD, bx, 1.48, 0.1);
    add(boxGeo(0.66, 1.02, 0.01), plainMat(0x1a1c1e, { roughness: 0.7 }), bx, 1.48, 0.185);
    const door = new THREE.Mesh(cboxGeo(0.72, 1.1, 0.02, 0.008), greyD); door.position.set(bx + 0.37 + 0.36 * Math.cos(1.9), 1.48, 0.19 + 0.36 * Math.sin(1.9)); door.rotation.y = -1.9; door.castShadow = true; g.add(door);
    D.lamps = [];
    for (let row = 0; row < 3; row++) {
      const y = 1.78 - row * 0.3;
      for (let k = 0; k < 7; k++) {
        const b = add(boxGeo(0.06, 0.12, 0.05), plainMat(0x101112, { roughness: 0.5 }), bx - 0.23 + k * 0.077, y - 0.04, 0.2);
        const t = add(boxGeo(0.02, 0.05, 0.03), plainMat(row === 1 && k === 3 ? 0xc8402f : 0xe8e4da, { roughness: 0.4 }), bx - 0.23 + k * 0.077, y - 0.04 + ((row + k) % 3 === 0 ? -0.02 : 0.02), 0.235);
        b.castShadow = t.castShadow = false;
      }
      const lamp = add(cylGeo(0.022, 0.022, 0.02, 12), new THREE.MeshBasicMaterial({ color: 0x3a0806 }), bx - 0.34, y + 0.06, 0.2, Math.PI / 2);
      D.lamps.push(lamp);
    }
    add(new THREE.PlaneGeometry(0.5, 0.08), new THREE.MeshStandardMaterial({ map: signTexture(['DISTRIBUTION  B-1'], { bg: '#e8e4da', fg: '#1a1a1a', sizes: [44] }), roughness: 0.7 }), bx, 2.0, 0.186);
    // a hazard frame painted round the whole installation
    for (const [x, y, w2, h2] of [[0.06, 2.37, 2.0, 0.08], [0.06, 0.52, 2.0, 0.08], [-0.97, 1.45, 0.08, 1.93], [1.09, 1.45, 0.08, 1.93]]) add(new THREE.PlaneGeometry(w2, h2), hazardMat(), x, y, 0.004);
    // conduit up the wall and away into the dark, and a cable loop down to the generator
    for (const x of [-0.62, -0.3, 0.38, 0.72]) add(cylGeo(0.028, 0.028, 2.6, 10), mat('metal', { color: 0x8a8e92 }), x, 1.92 + 1.3, 0.05);
    add(new THREE.TorusGeometry(0.32, 0.035, 8, 20, Math.PI), plainMat(0x111213, { roughness: 0.8 }), -0.85, 0.75, 0.12, 0, 0, Math.PI / 2);
    D.window = win;
  } else if (d.type === 'J') {
    // a bulkhead release: a long lever in a yellow guard, a ratchet quadrant, and a dial that counts the hold
    const yel = mat('metal', { color: 0xc8a032 }), dk = mat('steelDark');
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    add(cboxGeo(0.5, 0.9, 0.06, 0.012), dk, 0, 1.35, 0.03);
    for (const s2 of [-1, 1]) add(cboxGeo(0.06, 0.8, 0.22, 0.01), yel, s2 * 0.2, 1.35, 0.13);
    add(new THREE.TorusGeometry(0.2, 0.025, 6, 16, Math.PI * 0.75), dk, 0, 1.35, 0.13, 0, Math.PI / 2, Math.PI * 0.125);
    const lever = new THREE.Group(); lever.position.set(0, 1.35, 0.14);
    const arm = new THREE.Mesh(cboxGeo(0.05, 0.62, 0.05, 0.01), mat('metal', { color: 0x9a9ea2 })); arm.position.y = 0.3; arm.castShadow = true; lever.add(arm);
    const grip = new THREE.Mesh(cylGeo(0.045, 0.045, 0.24, 14), plainMat(0xa81810, { roughness: 0.45 })); grip.rotation.z = Math.PI / 2; grip.position.y = 0.6; grip.castShadow = true; lever.add(grip);
    g.add(lever); D.lever2 = lever;
    add(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshStandardMaterial({ map: signTexture(['RELEASE  ·  HOLD 25 S'], { bg: '#e2ad3b', fg: '#141414', sizes: [36] }), roughness: 0.7 }), 0, 1.87, 0.062);
    const dial = add(cylGeo(0.08, 0.08, 0.02, 20), plainMat(0xe8e4da, { roughness: 0.5 }), 0, 0.82, 0.07, Math.PI / 2);
    const needle = add(boxGeo(0.008, 0.07, 0.006), plainMat(0xb8160e), 0, 0.82, 0.085); D.needle = needle; void dial;
    D.lamp = add(cylGeo(0.025, 0.025, 0.02, 12), new THREE.MeshBasicMaterial({ color: 0x3a0806 }), 0.15, 0.82, 0.07, Math.PI / 2);
  } else if (d.type === 'E') {
    // the lab's emergency breaker: a steel cabinet with an empty bay where the power cell goes, a heavy latch,
    // and three dead lamps over the bay that light green one after another when it takes
    const grey = mat('metal', { color: 0x8a9096 }), dk = mat('steelDark');
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    add(cboxGeo(0.7, 1.3, 0.34, 0.02), grey, 0, 1.15, 0.17);
    add(boxGeo(0.3, 0.38, 0.2), plainMat(0x0b0c0d, { roughness: 0.9 }), 0, 0.98, 0.25);            // the bay
    for (const s2 of [-1, 1]) add(cboxGeo(0.03, 0.42, 0.04, 0.008), dk, s2 * 0.17, 0.98, 0.34);
    add(cboxGeo(0.36, 0.03, 0.04, 0.008), dk, 0, 1.19, 0.34); add(cboxGeo(0.36, 0.03, 0.04, 0.008), dk, 0, 0.77, 0.34);
    add(new THREE.PlaneGeometry(0.46, 0.12), new THREE.MeshStandardMaterial({ map: signTexture(['EMERGENCY POWER', 'CELL BAY  -  48V'], { bg: '#e2ad3b', fg: '#141414', sizes: [40, 30] }), roughness: 0.7 }), 0, 1.6, 0.342);
    D.lamps = [];
    for (let k = 0; k < 3; k++) { const l = add(cylGeo(0.022, 0.022, 0.02, 12), new THREE.MeshBasicMaterial({ color: 0x3a0806 }), -0.1 + k * 0.1, 1.38, 0.345, Math.PI / 2); D.lamps.push(l); }
    // the cell itself, sitting in the bay once it is in
    const cell = cellModel(); cell.scale.setScalar(0.92); cell.position.set(0, 0.93, 0.27); cell.visible = false; g.add(cell); D.cell = cell;
    for (const x of [-0.25, 0.25]) add(cylGeo(0.026, 0.026, 1.4, 10), mat('metal', { color: 0x8a8e92 }), x, 2.5, 0.05);
    D.window = null;
  } else if (d.type === 'v') {
    const pipe = new THREE.Mesh(cylGeo(0.09, 0.09, 0.5, 12), mat('rust')); pipe.rotation.x = Math.PI / 2; pipe.position.set(0, 1.2, 0.25); g.add(pipe);
    const wheel = new THREE.Group(); wheel.position.set(0, 1.2, 0.52);
    const rim = new THREE.Mesh(torusGeo(0.24, 0.03, 8, 24), plainMat(0xa0281c, { roughness: 0.5, metalness: 0.4 }));
    wheel.add(rim);
    for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(boxGeo(0.48, 0.03, 0.03), plainMat(0xa0281c, { roughness: 0.5, metalness: 0.4 })); sp.rotation.z = k * Math.PI / 3; wheel.add(sp); }
    g.add(wheel); D.wheel = wheel;
  } else if (d.type === 'u') {
    const box = new THREE.Mesh(boxGeo(0.3, 0.5, 0.08), mat('steel')); box.position.set(0, 1.3, 0.04); g.add(box);
    const btn = new THREE.Mesh(cylGeo(0.07, 0.07, 0.04, 16), new THREE.MeshBasicMaterial({ color: 0xffb02e }));
    btn.rotation.x = Math.PI / 2; btn.position.set(0, 1.32, 0.1); g.add(btn); D.button = btn;
  } else if (d.type === 'Q') {
    g.position.set(d.x, 0, d.z); g.rotation.y = 0;
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.05), new THREE.MeshBasicMaterial({ color: 0x3cff7a }));
    const rot = propRot(L, d.gx, d.gz, 'Q');
    g.rotation.y = rot;
    bar.position.set(0, 1.1, -0.148); bar.scale.x = 0.001; g.add(bar); D.bar = bar;
  }
  World.areas[d.area].group.add(g);
  return D;
}

function buildItem(item) {
  const g = new THREE.Group();
  if (item.type === 'crowbar') {
    // lying on the floor: the shaft along the ground, the hook curled flat beside it
    const bar = crowbarModel(); bar.rotation.set(0, 0, Math.PI / 2); bar.position.y = -0.017; g.add(bar);
  } else if (item.type === 'keycard') {
    const card = keycardModel(item.area); card.position.y = -0.028; g.add(card);
  } else if (item.type === 'fuse') {
    const fz = fuseModel(); fz.position.y = 0.004; g.add(fz);
  } else if (item.type === 'cell') {
    const c = cellModel(); c.position.y = 0.12; g.add(c);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const glow = glowSprite(item.type === 'keycard' ? 0x9ad0ff : item.type === 'cell' ? 0x7affa8 : 0xffb24a, 0.45);
  glow.position.y = 0.12; g.add(glow);
  g.position.set(item.x, 0.03, item.z);
  g.rotation.y = (item.x * 7.3) % 6.28;
  World.areas[item.area].group.add(g);
  return { item, group: g, glow, base: { x: item.x, z: item.z } };
}

function buildNote(note) {
  const tex = canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2a2a'; for (let y = 22; y < h - 10; y += 10) g.fillRect(12, y, 70 + ((y * 37) % 34), 2);
    g.fillStyle = '#8a1a12'; g.fillRect(12, 8, 50, 5);
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.08, roughness: 0.9 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.3).rotateX(-Math.PI / 2), m);
  p.position.set(note.x, 0.012, note.z); p.rotation.y = (note.z * 3.1) % 6.28;
  World.areas[note.area].group.add(p);
  const glow = glowSprite(0xfff2d0, 0.35); glow.position.set(note.x, 0.08, note.z);
  World.areas[note.area].group.add(glow);
  return { note, mesh: p, glow };
}

function buildSafeDoor(L, s) {
  const ry = Math.atan2(s.dir.x, s.dir.z);
  const g = new THREE.Group(); g.position.set(s.door.x, 0, s.door.z); g.rotation.y = ry;
  // no door leaf any more: the shelter doorway stays open (frame, lintel and green lamp remain)
  // the green lamp over the door: on its own battery - except somewhere blacked out, where it is as dead as
  // everything else until the power comes back
  const gg = glowGroupAt(s.area, s.door.x, s.door.z, true);
  const lampMat = gg !== World.lightGroups[s.area].on ? new THREE.MeshStandardMaterial({ color: 0x050805, emissive: 0x3cff7a, emissiveIntensity: 0 }) : new THREE.MeshBasicMaterial({ color: 0x3cff7a });
  if (gg !== World.lightGroups[s.area].on) gg.mats.push({ m: lampMat, base: 2.4 });
  const lamp = new THREE.Mesh(boxGeo(0.25, 0.08, 0.06), lampMat);
  lamp.position.set(0, 2.38, -0.52); g.add(lamp);
  World.areas[s.area].group.add(g);
  addLightSpot({ x: s.door.x + s.dir.x * 1.6, y: 2.2, z: s.door.z + s.dir.z * 1.6, color: 0x7affa8, base: 2.6, range: 4.5, area: s.area, grp: gg, kind: 'safe', hx: s.door.x - s.dir.x * 0.52, hy: 2.38, hz: s.door.z - s.dir.z * 0.52, haloSize: 0.7 });
  return { safe: s, group: g };
}

let _waterMat = null;
function buildWater(L) {
  if (!_waterMat) {
    const t = getTexSet('ripple');
    _waterMat = new THREE.MeshStandardMaterial({ color: 0x08110f, roughness: 0.035, metalness: 0, transparent: true, opacity: 0.84, normalMap: t.normalMap });
    _waterMat.normalScale = new THREE.Vector2(0.45, 0.45);
  }
  const B = new Batch();
  for (let gz = 0; gz < L.H; gz++) for (let gx = 0; gx < L.W; gx++) {
    if (!L.water[gz * L.W + gx]) continue;
    B.quad(_waterMat, [gx, -0.1, gz + 1], [gx + 1, -0.1, gz + 1], [gx + 1, -0.1, gz], [gx, -0.1, gz], 0, 1, 0,
      [[gx / 3, (gz + 1) / 3], [(gx + 1) / 3, (gz + 1) / 3], [(gx + 1) / 3, gz / 3], [gx / 3, gz / 3]]);
  }
  const wa = L.areas.findIndex((a) => a.theme === 'pump');
  if (wa >= 0) B.build(World.areas[wa].group, { cast: false });
}

// ---------- plastic strip curtains: strips hang from a rail and swing aside around whoever pushes through ----------
let _stripMat = null;
function stripMaterial() {
  if (_stripMat) return _stripMat;
  const t = canvasTex(64, 256, (g, w, h) => {
    // clear PVC with a cold tint, scuffed and greyer toward the bottom where hands and carts rub it
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(196,216,216,0.26)'); gr.addColorStop(0.5, 'rgba(184,206,204,0.32)'); gr.addColorStop(1, 'rgba(118,124,114,0.62)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      g.strokeStyle = `rgba(236,244,244,${0.04 + Math.random() * 0.12})`; g.lineWidth = 0.5 + Math.random();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 8, y + 8 + Math.random() * 70); g.stroke();
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(58,56,48,${0.05 + Math.random() * 0.14})`;
      g.beginPath(); g.ellipse(Math.random() * w, h * (0.5 + Math.random() * 0.5), 2 + Math.random() * 9, 3 + Math.random() * 16, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(214,232,232,0.3)'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
  });
  _stripMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, transparent: true, roughness: 0.16, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  return _stripMat;
}
function buildCurtains(L) {
  World.curtains = [];
  const rail = mat('steelDark');
  for (let gz = 0; gz < L.H; gz++) for (let gx = 0; gx < L.W; gx++) {
    const i = gz * L.W + gx;
    if (L.ch[i] !== ';') continue;
    const ai = L.area[i];
    const spanX = !(cellKind(L, gx - 1, gz) === 'open' && cellKind(L, gx + 1, gz) === 'open') || cellKind(L, gx, gz - 1) === 'open';
    const top = L.ceil[i] > 2.6 ? 2.28 : L.ceil[i] - 0.06, H = top - 0.03;
    const g = new THREE.Group(); g.position.set(gx + 0.5, top, gz + 0.5); g.rotation.y = spanX ? 0 : Math.PI / 2;
    const bar = new THREE.Mesh(boxGeo(0.98, 0.06, 0.05), rail); bar.position.y = -0.01; g.add(bar);
    for (const s of [-0.45, 0.45]) { const br = new THREE.Mesh(boxGeo(0.04, 0.05, 0.12), rail); br.position.set(s, 0.0, -0.05); g.add(br); }
    const geo = cachedGeo('strip' + H.toFixed(2), () => new THREE.PlaneGeometry(0.2, H, 1, 4).translate(0, -H / 2, 0));
    const strips = [];
    for (let k = 0; k < 7; k++) {
      const pivot = new THREE.Group();
      const x = -0.405 + k * 0.135;
      pivot.position.set(x, -0.03, (k % 2 ? 0.008 : -0.008));
      const m = new THREE.Mesh(geo, stripMaterial()); m.renderOrder = 3; m.castShadow = false; m.receiveShadow = false;
      pivot.add(m); g.add(pivot);
      strips.push({ pivot, x, ax: 0, vx: 0, az: 0, vz: 0, ph: Math.random() * 6.28 });
    }
    World.areas[ai].group.add(g);
    World.curtains.push({ group: g, strips, x: gx + 0.5, z: gz + 0.5, cs: Math.cos(g.rotation.y), sn: Math.sin(g.rotation.y), ai });
  }
}
const _pushers = [];
function updateCurtains(dt, t) {
  if (!World.curtains || !World.curtains.length) return;
  const P = _pushers; P.length = 0;
  if (typeof Game !== 'undefined') {
    if (Game.me && !Game.me.dead) P.push(Game.me.x, Game.me.z, 0.3);
    if (Game.mates) for (const m of Game.mates.values()) if (!m.dead) P.push(m.x, m.z, 0.3);
  }
  if (Creature.ready && Creature.visible) { P.push(Creature.pos.x, Creature.pos.z, 0.8); P.push(Creature.headPos.x, Creature.headPos.z, 0.5); }
  const h = Math.min(dt, 0.05);
  for (const c of World.curtains) {
    if (!World.areas[c.ai].group.visible) continue;
    for (const st of c.strips) {
      let tx = 0, tz = 0;
      for (let p = 0; p < P.length; p += 3) {
        const dx = P[p] - c.x, dz = P[p + 1] - c.z, r = P[p + 2];
        // into the curtain's frame: lx across the opening, lz through it
        const lx = dx * c.cs - dz * c.sn, lz = dx * c.sn + dz * c.cs;
        const across = 1 - Math.abs(lx - st.x) / (r + 0.16), through = 1 - Math.abs(lz) / (r + 0.34);
        if (across <= 0 || through <= 0) continue;
        const push = Math.min(1, across * 1.6) * Math.min(1, through * 1.8);
        // swing away from the side the body is on; right at the rail they part sideways around it
        tx += (lz < 0 ? -1 : 1) * push * 1.05;
        tz += (st.x >= lx ? 1 : -1) * push * 0.55 * Math.min(1, (1 - Math.abs(lz) / (r + 0.34)) * 1.5);
      }
      tx = clamp(tx, -1.2, 1.2); tz = clamp(tz, -0.7, 0.7);
      // a cold draught keeps them breathing a little
      tx += Math.sin(t * 1.3 + st.ph) * 0.012;
      st.vx += ((tx - st.ax) * 46 - st.vx * 5.5) * h; st.ax += st.vx * h;
      st.vz += ((tz - st.az) * 40 - st.vz * 6.0) * h; st.az += st.vz * h;
      st.pivot.rotation.set(st.ax, 0, st.az);
    }
  }
}

// ---------- sparks from torn cables: bursts of hot streaks, a blue-white flash, a crackle ----------
function buildSparks() {
  World.sparkFx = [];
  for (const sp of World.sparks || []) {
    const N = 40, pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    lines.frustumCulled = false;
    World.areas[sp.area].group.add(lines);
    const light = addLightSpot({ x: sp.p[0], y: sp.p[1] + 0.25, z: sp.p[2], color: 0xbcd4ff, base: 7, range: 5, area: sp.area, grp: World.lightGroups[sp.area].on, kind: 'spark', halo: false, mul: 0 });
    const parts = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1 }));
    World.sparkFx.push({ sp, lines, pos, col, parts, light, next: 1 + Math.random() * 2, flash: 0 });
  }
}
function updateSparks(dt) {
  if (!World.sparkFx) return;
  const h = Math.min(dt, 0.05);
  for (const S of World.sparkFx) {
    if (!World.areas[S.sp.area].group.visible) { S.light.mul = 0; continue; }
    S.next -= h;
    if (S.next <= 0) {
      S.next = 0.5 + Math.random() * 3.5;
      let n = 12 + Math.floor(Math.random() * 26);
      for (const p of S.parts) {
        if (p.life > 0) continue;
        if (n-- <= 0) break;
        const a = Math.random() * 6.28, v = 0.8 + Math.random() * 3.4;
        p.x = S.sp.p[0]; p.y = S.sp.p[1]; p.z = S.sp.p[2];
        p.vx = Math.cos(a) * v; p.vz = Math.sin(a) * v; p.vy = Math.random() * 2.8 - 0.6;
        p.max = p.life = 0.3 + Math.random() * 0.9;
      }
      S.flash = 1;
      Sound.play('spark', { x: S.sp.p[0], y: S.sp.p[1], z: S.sp.p[2] });
    }
    S.flash = Math.max(0, S.flash - h * 6);
    S.light.mul = S.flash * (0.4 + Math.random() * 0.6);
    const P = S.pos, C = S.col;
    for (let i = 0; i < S.parts.length; i++) {
      const p = S.parts[i], o = i * 6;
      if (p.life <= 0) { C.fill(0, o, o + 6); continue; }
      p.life -= h; p.vy -= 9.8 * h;
      p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
      if (p.y < 0.01) { p.y = 0.01; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; }
      const k = Math.max(0, p.life / p.max), hot = k * k, st = 0.05;
      P[o] = p.x; P[o + 1] = p.y; P[o + 2] = p.z;
      P[o + 3] = p.x - p.vx * st; P[o + 4] = p.y - p.vy * st; P[o + 5] = p.z - p.vz * st;
      C[o] = 9 * hot + 1.6 * k; C[o + 1] = 5.5 * hot + 0.45 * k; C[o + 2] = 2.6 * hot;
      C[o + 3] = C[o] * 0.25; C[o + 4] = C[o + 1] * 0.25; C[o + 5] = C[o + 2] * 0.25;
    }
    S.lines.geometry.attributes.position.needsUpdate = true;
    S.lines.geometry.attributes.color.needsUpdate = true;
  }
}

// ---------- the building settles around you: drips, groans and knocks from somewhere close ----------
const AMBIENT_EVENTS = {
  dock: [['groan', 9, 26], ['clunk', 16, 42]], office: [['knock', 16, 44], ['creak', 20, 50]], lab: [['drip', 7, 20], ['knock', 20, 50]],
  cold: [['groan', 12, 28], ['drip', 9, 22]], server: [['clunk', 18, 44]], tunnel: [['drip', 1.2, 4.5], ['groan', 12, 32]],
  pump: [['drip', 0.9, 3.2], ['clunk', 14, 34]], contain: [['knock', 9, 26], ['creak', 14, 34], ['drip', 7, 18]],
  generator: [['groan', 10, 26], ['clunk', 14, 32]], lift: [['groan', 7, 20], ['clunk', 12, 30]],
};
const _ambT = {};
function updateAmbientEvents(dt, ca) {
  if (typeof Game === 'undefined' || Game.mode !== 'play' || !Game.me || !Game.L) return;
  const A = Game.L.areas[ca], list = A && AMBIENT_EVENTS[A.theme];
  if (!list) return;
  for (const [name, lo, hi] of list) {
    const key = A.theme + name;
    if (_ambT[key] === undefined) _ambT[key] = lo + Math.random() * (hi - lo);
    if ((_ambT[key] -= dt) > 0) continue;
    _ambT[key] = lo + Math.random() * (hi - lo);
    const a = Math.random() * 6.28, d = name === 'drip' ? 2 + Math.random() * 7 : 6 + Math.random() * 14;
    Sound.play(name, { x: Game.me.x + Math.cos(a) * d, y: name === 'drip' ? 0.2 : 2 + Math.random() * 3, z: Game.me.z + Math.sin(a) * d });
  }
}

function buildDynamic(L) {
  World.locks = L.locks.map((lock) => buildLockDoor(L, lock));
  World.items = {};
  for (const it of L.items) World.items[it.id] = buildItem(it);
  World.devices = {};
  for (const d of L.devices) World.devices[d.id] = buildDevice(L, d);
  World.notes = L.notes.map(buildNote);
  World.safeDoors = L.safes.map((s) => buildSafeDoor(L, s));
  buildWater(L);
  buildLiftDynamic(L);
  buildEndCarDynamic(L);
  if (L.digits && L.digits.length) buildDigits(L);
  buildCurtains(L);
  buildSparks();
  buildLairs(L);
}

// per-frame updates driven by the shared game state
function updateWorld(dt, t, g, ca = 0) {
  updateLights(dt, t, g, ca);
  for (const d of World.dyn) {
    if (d.kind === 'bulb') {
      d.pivot.rotation.x = Math.sin(t * 0.9 + d.phase) * 0.05;
      d.pivot.rotation.z = Math.cos(t * 0.7 + d.phase) * 0.05;
    }
  }
  if (ledTexture) ledTexture.offset.y = Math.floor(t * 3) * 0.031;
  if (_waterMat && _waterMat.normalMap) { _waterMat.normalMap.offset.x = t * 0.02; _waterMat.normalMap.offset.y = t * 0.013; }
  updateCurtains(dt, t);
  updateSparks(dt);
  updateAmbientEvents(dt, ca);
  if (!g) return;
  if (World.locks) World.locks.forEach((D, i) => updateLockDoor(D, g.lk && g.lk[i], dt, g, i));
  if (World.digits) updateDigits(g);
  if (World.items) {
    for (const id in World.items) {
      const it = World.items[id], s = g.it && g.it[id];
      const held = s && s.o, used = s && s.u;
      it.group.visible = !held && !used;
      if (s && s.p) { it.group.position.x = s.p[0]; it.group.position.z = s.p[1]; }
      it.glow.material.opacity = 0.55 + Math.sin(t * 3 + it.base.x) * 0.35;
    }
  }
  if (World.devices) {
    for (const id in World.devices) {
      const D = World.devices[id], s = (g.dv && g.dv[id]) || {};
      if (D.slots.length) D.slots.forEach((sl, i) => { const on = (s.n || 0) > i; sl.fuse.visible = on; sl.led.material.color.setHex(on ? 0x3cff7a : 0xff2a1a); });
      if (D.lever) D.lever.rotation.x = damp(D.lever.rotation.x, s.on ? -1.2 : 0.6, 4, dt);
      if (D.throwLever) {
        // follows the hand pulling it - hard to start, then it drops the last of the way with a slam
        const want = s.on ? 2.45 : 2.45 * Math.pow(s.p || 0, 1.6) * 0.82;
        D.throwLever.rotation.x = damp(D.throwLever.rotation.x, want, s.on ? 18 : 8, dt);
        const lit = s.on ? (t % 1 < 0.95 ? 1 : 0.6) : 0;
        D.lamps.forEach((l, i) => l.material.color.setHex(s.on && (t - (D.onAt || (D.onAt = t))) > 0.35 * (i + 1) ? 0x3cff7a : (s.p > 0.02 && Math.sin(t * 20 + i) > 0.7 ? 0xff5a2a : 0x3a0806)));
        D.window.material.emissiveIntensity = lit * (0.6 + Math.random() * 0.3);
        if (!s.on) D.onAt = 0;
      }
      if (D.lever2) {
        // up is released; it comes down as you pull, and stays down while it holds
        D.lever2.rotation.x = damp(D.lever2.rotation.x, s.on ? 2.2 : 2.2 * Math.pow(s.p || 0, 1.4) * 0.7, s.on ? 16 : 8, dt);
        const g2 = Game.g, left = s.on ? clamp(1 - (g2.t - (s.t || 0)) / LEVER_HOLD, 0, 1) : 0;
        D.needle.rotation.z = -left * Math.PI * 1.6;
        D.lamp.material.color.setHex(s.on ? (left < 0.3 && Math.sin(t * 14) > 0 ? 0xff3a1a : 0x3cff7a) : 0x3a0806);
        // and while it holds you hear it count, from wherever you are
        if (s.on && left > 0) { const k = Math.floor(t * 2); if (k !== D.tickK) { D.tickK = k; Sound.play('ratchet', { x: D.device.x, y: 1.3, z: D.device.z }); } }
      }
      if (D.cell) {
        D.cell.visible = !!s.on;
        D.lamps.forEach((l, i) => l.material.color.setHex(s.on && (t - (D.onAt || (D.onAt = t))) > 0.4 * (i + 1) ? 0x3cff7a : 0x3a0806));
        if (!s.on) D.onAt = 0;
      }
      if (D.wheel) D.wheel.rotation.z = (s.p || 0) * Math.PI * 4;
      if (D.button) D.button.material.color.setHex(s.on ? 0x3cff7a : (Math.sin(t * 4) > 0 ? 0xffb02e : 0x5a3a08));
      if (D.bar) { D.bar.scale.x = Math.max(0.001, s.on ? 1 : (s.p || 0)); D.bar.position.x = -0.25 + 0.25 * D.bar.scale.x; }
    }
  }
  if (Lift.ready && Game.mode !== 'intro' && (Lift.doorOpen < 0.999 || Lift.gateOpen < 0.999)) settleLift();
  // a generator that is running keeps running, for anyone, whenever they arrived
  if (World.devices) for (const id in World.devices) {
    const D = World.devices[id];
    if (D.device.type !== 'W') continue;
    const on = !!(g.dv && g.dv[id] && g.dv[id].on) && Game.mode === 'play';
    Sound.engine(World.genPos || { x: D.device.x, y: 1, z: D.device.z }, on);
  }
}
