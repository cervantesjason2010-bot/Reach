// ================= the end of Breach - A1: the surface =================
// The platform goes up the shaft into grey light with the hatch leaves standing open above it - and the Pale
// comes over the edge of it, onto the deck with you, as it rises. Through the hatch: white. Then the world
// above, after: a dead city as far as you can see, ash coming down, not a light anywhere, and nothing moving -
// except, far off in the haze, something that stands taller than the towers. The Pale gets up behind you. It
// comes for you. And a hand the size of a building comes down out of the cloud and closes round it, and takes
// it up, and the cloud closes behind it. You never see what the hand belongs to.

const BR_T = {
  leaves: 0.2, rise: 0.8, pale: 0.9, jump: 3.1, land: 3.65, stand: 4.4, creep: 5.1, white: 6.5, surface: 7.3, look: 8.4, radio: 10.4, boom: 11.8,
  shriek: 14.2, charge: 15.0, shadow: 15.9, stop: 16.3, hand: 16.4, grab: 18.6, lift: 19.3, gone: 21.9, call: 22.6, black: 25.8, card: 26.4, soon: 27.4, screen: 31.2,
};
const BR_RISE = 12.6;
const SURF = { ox: -700, oz: 700, group: null, ash: null, sky: null, legs: null, blood: null, built: false };

// ---------- what is up there ----------
// The colossus: only a hand and an arm, which is all of it anyone will ever see. Meshed like the others, at a
// coarse scale, and drawn three and a half times over.
const C_ASH = [0.3, 0.29, 0.28], C_ASHD = [0.22, 0.21, 0.2];
const COL_FINGERS = [['i', -0.42, -1.5, 0.95], ['m', -0.14, -1.56, 1.05], ['r', 0.14, -1.54, 1.0], ['p', 0.4, -1.46, 0.82]];
const colLen = (s) => [0.6 * s, 0.48 * s, 0.38 * s];
const COLOSSUS_DEF = {
  name: 'colossus', skin: C_ASH, weightLam: 0.08,
  bones: [
    ['wrist', null, [0, 0, 0]], ['palm', 'wrist', [0, -0.2, 0.0]],
    ...COL_FINGERS.flatMap(([n, x, yb, s]) => { const [a, b] = colLen(s); return [[n + '1', 'palm', [x, yb, 0.05]], [n + '2', n + '1', [x, yb - a, 0.05]], [n + '3', n + '2', [x, yb - a - b, 0.05]]]; }),
    ['t1', 'palm', [-0.5, -0.65, 0.12]], ['t2', 't1', [-0.72, -1.0, 0.3]], ['t3', 't2', [-0.82, -1.3, 0.44]],
  ],
  shapes: [
    { c: [0, 0.1, -0.02, 0, 3.6, -0.3, 0.44, 0.6], bone: 'wrist', k: 0.15 },
    { e: [0.12, 1.9, 0.12, 0.32, 0.9, 0.36], bone: 'wrist', k: 0.15 },
    { e: [-0.18, 2.4, 0.0, 0.3, 0.8, 0.34], bone: 'wrist', k: 0.15 },
    { e: [0.34, 0.0, -0.05, 0.12, 0.13, 0.12], bone: 'wrist', k: 0.08 },
    { e: [-0.34, 0.02, -0.05, 0.12, 0.12, 0.12], bone: 'wrist', k: 0.08 },
    { e: [0, -0.9, 0.02, 0.56, 0.72, 0.22], bone: 'palm', k: 0.12 },
    { e: [0.05, -0.38, 0.1, 0.42, 0.28, 0.2], bone: 'palm', k: 0.1 },
    { e: [-0.36, -0.75, 0.14, 0.22, 0.35, 0.2], bone: 'palm', k: 0.1 },
    { e: [0.38, -0.85, 0.1, 0.18, 0.4, 0.18], bone: 'palm', k: 0.1 },
    ...COL_FINGERS.flatMap(([n, x, yb, s]) => {
      const [a, b, c] = colLen(s);
      return [
        { c: [x * 0.55, -0.4, -0.15, x, yb + 0.05, -0.1, 0.05, 0.045], bone: 'palm', k: 0.05, tint: C_ASHD },
        { e: [x, yb + 0.02, -0.06, 0.13 * s, 0.12, 0.13], bone: 'palm', k: 0.06 },
        { c: [x, yb, 0.05, x, yb - a, 0.05, 0.13 * s, 0.115 * s], bone: n + '1', k: 0.05 },
        { e: [x, yb - a, 0.02, 0.12 * s, 0.11, 0.12 * s], bone: n + '2', k: 0.04, tint: C_ASHD },
        { c: [x, yb - a, 0.05, x, yb - a - b, 0.05, 0.115 * s, 0.1 * s], bone: n + '2', k: 0.045 },
        { e: [x, yb - a - b, 0.03, 0.105 * s, 0.1, 0.105 * s], bone: n + '3', k: 0.04, tint: C_ASHD },
        { c: [x, yb - a - b, 0.05, x, yb - a - b - c, 0.08, 0.1 * s, 0.075 * s], bone: n + '3', k: 0.04 },
      ];
    }),
    { c: [-0.5, -0.65, 0.12, -0.72, -1.0, 0.3, 0.17, 0.14], bone: 't1', k: 0.06 },
    { c: [-0.72, -1.0, 0.3, -0.82, -1.3, 0.44, 0.14, 0.12], bone: 't2', k: 0.05 },
    { c: [-0.82, -1.3, 0.44, -0.86, -1.58, 0.52, 0.12, 0.085], bone: 't3', k: 0.045 },
    // the palm's creases, cut in deep
    { e: [0, -0.8, 0.24, 0.45, 0.025, 0.05], rot: [0, 0, 0.25], bone: 'palm', k: 0.02, sub: true, tint: C_ASHD },
    { e: [0.1, -1.15, 0.22, 0.4, 0.025, 0.05], rot: [0, 0, -0.1], bone: 'palm', k: 0.02, sub: true, tint: C_ASHD },
  ],
  parts: [{ name: 'body', lo: [-1.25, -3.6, -0.75], hi: [1.0, 3.75, 0.95], h: 0.034, keep: () => true }],
  skinMat: { rough: 0.85, coat: 0.05, coatRough: 0.8, sss: 0x1a1210, poreF: 40 },
  skinGLSL: `
    // grey as ash, cracked all over like a dry riverbed, the cracks deep and black
    float cr = cRidge(vRest * 3.2 + vec3(2.0), 0.08), cr2 = cRidge(vRest * 7.5 + vec3(5.0, 1.0, 3.0), 0.06) * 0.6;
    float crack = max(cr, cr2);
    diffuseColor.rgb *= 0.75 + 0.3 * cF(vRest * 4.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.035, 0.035), crack * 0.85);
    bH += -crack * 0.6 + cF(vRest * 12.0) * 0.2;
    bRough = mix(bRough, 0.95, crack);
    float ash = smoothstep(0.55, 0.8, cN(vRest * 5.0 + vec3(0.0, 3.0, 0.0)));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.5, 0.47), ash * 0.4);
    // and, after, the Pale all over the inside of it
    float gore = uGore * smoothstep(0.1, 0.3, vRest.z) * (1.0 - smoothstep(-0.3, 0.2, vRest.y)) * (0.5 + 0.5 * cN(vRest * 9.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.01, 0.01), gore * 0.9);
    bWet = max(bWet, gore * 0.8);`,
  extras(B) {
    // nails like slabs of slate, broken
    const nail = plainMat(0x16130f, { roughness: 0.55 });
    for (const [n, x, yb, s] of COL_FINGERS) {
      const [a, b, c] = colLen(s);
      const m = new THREE.Mesh(cboxGeo(0.15 * s, 0.2 * s, 0.03, 0.02), nail); m.rotation.x = -0.15;
      beastAttach(B, n + '3', m, x, yb - a - b - c * 0.7, -0.03);
    }
    const tn = new THREE.Mesh(cboxGeo(0.15, 0.18, 0.03, 0.02), nail); tn.rotation.set(-0.5, 0.4, 0); beastAttach(B, 't3', tn, -0.88, -1.48, 0.47);
  },
};
const Colossus = makeBeast(COLOSSUS_DEF);
function colossusBuildStep(budgetMs, scene) { return beastBuildStep(Colossus, budgetMs, scene); }
// how far its fingers have closed (0 open, 1 a fist), the thumb, the wrist
function colossusPose(curl, thumb, wrist) {
  const b = Colossus.bones; if (!b) return;
  COL_FINGERS.forEach(([n], i) => { const spread = (1 - curl) * (i - 1.5) * 0.09; setLocalEuler(b[n + '1'], -curl * 1.15, 0, spread); setLocalEuler(b[n + '2'], -curl * 1.35, 0, 0); setLocalEuler(b[n + '3'], -curl * 1.05, 0, 0); });
  setLocalEuler(b.t1, -thumb * 0.5, 0, thumb * 0.75); setLocalEuler(b.t2, -thumb * 0.6, 0, 0); setLocalEuler(b.t3, -thumb * 0.5, 0, 0);
  setLocalEuler(b.palm, wrist, 0, 0);
  Colossus.root.updateMatrixWorld(true);
}

// ---------- the city ----------
function surfTex(kind, seed) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = mulberry32(seed * 101 + kind.length);
    if (kind === 'tower') {
      // a tower's face: concrete bands and windows, nearly all of them black, some blown out, soot up from the bottom
      const base = ['#5a5852', '#4a4c4c', '#6a645a', '#3e3c3a'][seed % 4];
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      const cols = 4 + (seed % 3), rows = 6 + (seed % 2) * 2, cw = w / cols, rh = h / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = r();
        g.fillStyle = k < 0.08 ? '#0a0908' : k < 0.12 ? 'rgba(40,38,34,1)' : seed % 2 ? '#141618' : '#1a1a1a';
        g.fillRect(i * cw + cw * 0.14, j * rh + rh * 0.2, cw * 0.72, rh * 0.6);
        if (k > 0.97) { g.fillStyle = 'rgba(120,60,20,0.6)'; g.fillRect(i * cw + cw * 0.2, j * rh + rh * 0.3, cw * 0.6, rh * 0.4); }
      }
      for (let i = 0; i < 12; i++) { const x = r() * w, gr = g.createLinearGradient(x, h, x, 0); gr.addColorStop(0, 'rgba(10,9,8,0.6)'); gr.addColorStop(1, 'rgba(10,9,8,0)'); g.fillStyle = gr; g.fillRect(x, h * (0.3 + r() * 0.5), 10 + r() * 30, h); }
    } else if (kind === 'ground') {
      g.fillStyle = '#5a5650'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { const v = 60 + r() * 60; g.fillStyle = 'rgba(' + v + ',' + (v - 3) + ',' + (v - 8) + ',' + (0.2 + r() * 0.4) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 4); }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(160,156,148,' + r() * 0.2 + ')'; g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 30, 0, 6.28); g.fill(); }
    } else if (kind === 'smoke') {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { const y = r() * h, x = w / 2 + (r() - 0.5) * w * 0.4 * (1 - y / h * 0.6), rad = 18 + (1 - y / h) * 50 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(40,38,36,' + (0.14 + 0.12 * (y / h)) + ')'); gr.addColorStop(1, 'rgba(40,38,36,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    } else if (kind === 'cloud') {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, rad = 10 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, rad); const v = 70 + r() * 30 | 0; gr.addColorStop(0, 'rgba(' + v + ',' + (v - 4) + ',' + (v - 8) + ',0.35)'); gr.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    }
  });
}
function buildSurfaceSet() {
  if (SURF.group) return SURF;
  const grp = new THREE.Group(), B = new Batch(), O = { x: SURF.ox, z: SURF.oz }, r = mulberry32(2026);
  const M = (c, o = {}) => plainMat(c, Object.assign({ roughness: 0.9, ws: false }, o));
  const conc = M(0x6a6660), concD = M(0x4a4844), rust = M(0x5a3a24, { roughness: 0.8, metalness: 0.3 }), soot = M(0x1e1c1a);
  // the ground: ash over everything, out to the horizon
  const gt = surfTex('ground', 1); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(320, 320);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2600, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gt, roughness: 1, color: 0xa8a49c }));
  ground.position.set(O.x, -0.02, O.z); ground.receiveShadow = true; grp.add(ground);
  // the compound round the hatch: a cracked pad, the housing, sandbags, a fence that fell, a tower that fell, a truck
  B.add(conc, boxGeo(44, 0.3, 44, 6), xform(O.x, -0.15, O.z));
  for (let i = 0; i < 26; i++) B.add(decalMat('cracks'), cachedGeo('surfCrack', () => new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2)), xform(O.x + (r() - 0.5) * 40, 0.01 + i * 0.0003, O.z + (r() - 0.5) * 40, r() * 6));
  for (const [x, z, w, d] of [[0, -6.2, 13, 1.2], [-6.2, 0, 1.2, 13], [6.2, 0, 1.2, 13]]) B.add(concD, cboxGeo(w, 1.1, d, 0.05, 4), xform(O.x + x, 0.55, O.z + z));
  for (let k = 0; k < 40; k++) { const a = Math.PI / 2 + 0.7 + r() * (Math.PI * 2 - 1.4), rad = 9 + r() * 4; B.add(M(0x7a6a50), cboxGeo(0.6, 0.25, 0.4, 0.1), xform(O.x + Math.cos(a) * rad, 0.12 + (k % 3) * 0.22, O.z + Math.sin(a) * rad, -a)); }
  for (let k = 0; k < 18; k++) { const x = -20 + k * 2.4, lean = k > 6 && k < 12 ? 1.2 : 0.1 * r(); B.add(rust, cylGeo(0.04, 0.04, 2.4, 6), xform(O.x + x, 1.1, O.z - 19 + Math.sin(k) * 0.3, 0, lean, 0)); }
  const tw = frame(O.x + 15, O.z + 12, 0.7);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tw.cyl(B, rust, x * 1.6 + 2.5, 0.6, z, 0.08, 0.08, 7.0, 6, 0, 1.38);
  tw.cbox(B, M(0x3a3632), 6.2, 0.6, 0, 2.6, 1.0, 2.6, 0.05, 0.3);
  const tk = frame(O.x - 14, O.z + 8, 2.4);
  tk.cbox(B, soot, 0, 1.3, 0, 6.5, 1.8, 2.4, 0.08); tk.cbox(B, soot, 3.6, 1.6, 0, 1.8, 2.4, 2.3, 0.08);
  for (const x of [-2.2, 0.6, 3.6]) for (const z of [-1.2, 1.2]) tk.cyl(B, M(0x111111), x, 0.5, z, 0.5, 0.5, 0.35, 12, Math.PI / 2);
  // dead trees
  for (let k = 0; k < 14; k++) {
    const a = r() * Math.PI * 2, rad = 24 + r() * 50, x = O.x + Math.cos(a) * rad, z = O.z + Math.sin(a) * rad, h = 4 + r() * 5, f = frame(x, z, r() * 6);
    f.cyl(B, soot, 0, h / 2, 0, 0.12, 0.25, h, 6, (r() - 0.5) * 0.15, (r() - 0.5) * 0.15);
    for (let j = 0; j < 4; j++) f.cyl(B, soot, (r() - 0.5) * 0.5, h * (0.5 + r() * 0.4), (r() - 0.5) * 0.5, 0.03, 0.07, 1.5 + r() * 1.5, 5, (r() - 0.5) * 2.2, (r() - 0.5) * 2.2);
  }
  // the road in to the city, the cars that never got out, an overpass that came down
  B.add(M(0x2e2c2a), boxGeo(9, 0.05, 420, 8), xform(O.x + 6, 0.02, O.z - 230));
  for (let k = 0; k < 34; k++) {
    const z = O.z - 30 - r() * 380, x = O.x + 6 + (r() - 0.5) * 7, f = frame(x, z, (r() - 0.5) * 0.8 + (r() < 0.5 ? Math.PI : 0)), c = [0x3a2e26, 0x2a2a2c, 0x4a3a2a, 0x1e1c1a][k % 4];
    f.cbox(B, M(c, { roughness: 0.7, metalness: 0.3 }), 0, 0.55, 0, 1.8, 0.7, 4.2, 0.15); f.cbox(B, M(c, { roughness: 0.7, metalness: 0.3 }), 0, 1.1, -0.2, 1.6, 0.5, 2.2, 0.15);
  }
  for (let k = 0; k < 9; k++) {
    const x = O.x - 120 + k * 40, fall = k === 4 || k === 5;
    B.add(concD, cboxGeo(40, 2.4, 14, 0.1, 6), xform(x, fall ? 6 : 14, O.z - 180, 0, 0, fall ? (k === 4 ? 0.32 : -0.35) : 0));
    if (!fall || k === 5) B.add(concD, cboxGeo(3, 14, 3, 0.1, 6), xform(x - 20, 7, O.z - 180));
  }
  // the towers: thousands of windows and not a light in one of them; broken off, leaning, burnt out
  const tmats = [0, 1, 2, 3].map((s) => { const t = surfTex('tower', s); t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0.05 }); });
  for (let k = 0; k < 190; k++) {
    const front = r() < 0.7, a = front ? -Math.PI / 2 + (r() - 0.5) * 2.4 : r() * Math.PI * 2, rad = front ? 170 + r() * 620 : 260 + r() * 700;
    const x = O.x + Math.cos(a) * rad, z = O.z + Math.sin(a) * rad;
    const down = Math.max(0, 1 - Math.hypot(x - O.x, z - (O.z - 480)) / 420);
    const w = 18 + r() * 30, d = 18 + r() * 30, h = 30 + r() * 70 + down * (90 + r() * 110);
    const m = tmats[k % 4], lean = r() < 0.14 ? (r() - 0.5) * 0.32 : 0, ry = r() * Math.PI;
    const broken = r() < 0.4, hh = broken ? h * (0.55 + r() * 0.3) : h;
    B.add(m, boxGeo(w, hh, d, 16), xform(x, hh / 2, z, ry, lean, lean * 0.6));
    if (broken) {
      // the top broken away: jagged stumps of floors and a slab hanging off
      for (let j = 0; j < 3; j++) { const sw = w * (0.3 + r() * 0.4), sh = 4 + r() * 14; B.add(m, boxGeo(sw, sh, d * (0.3 + r() * 0.5), 16), xform(x + (r() - 0.5) * w * 0.5, hh + sh / 2 - 2, z + (r() - 0.5) * d * 0.4, ry, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3)); }
      B.add(concD, boxGeo(w * 0.8, 1.2, d * 0.5, 8), xform(x, hh - 6, z + d * 0.55, ry, 0.9, 0.1));
    } else if (r() < 0.5) B.add(concD, boxGeo(w * 0.4, 6 + r() * 10, d * 0.4, 8), xform(x, hh + 4, z, ry));
    // rubble heaped at its foot
    if (r() < 0.5) B.add(M(0x3e3c38), cachedGeo('rubble', () => new THREE.ConeGeometry(1, 0.5, 7)), xform(x + w * 0.6, 3, z, r() * 6, 0, 0, w * 0.7, 10, d * 0.7));
  }
  B.build(grp, {});
  // the sky: a low ceiling of grey-brown cloud, a sun like a coin behind it
  const skyM = new THREE.ShaderMaterial({
    uniforms: { sun: { value: new THREE.Vector3(-0.35, 0.18, -0.92).normalize() }, dim: { value: 1 } },
    vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 sun; uniform float dim; varying vec3 vD;
      float h(vec3 p) { p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float n(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main() {
        float y = vD.y;
        vec3 hor = vec3(0.46, 0.4, 0.33), top = vec3(0.17, 0.16, 0.16);
        vec3 c = mix(hor, top, smoothstep(-0.02, 0.45, y));
        float cl = n(vD * 6.0) * 0.6 + n(vD * 15.0) * 0.4;
        c *= 0.82 + 0.3 * cl;
        float s = max(dot(vD, sun), 0.0);
        c += vec3(0.55, 0.42, 0.28) * pow(s, 60.0) * 0.6 + vec3(0.3, 0.22, 0.14) * pow(s, 6.0) * 0.35;
        c = mix(c, vec3(0.32, 0.3, 0.27), smoothstep(0.02, -0.08, y));
        gl_FragColor = vec4(c * dim, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2800, 32, 16), skyM); sky.position.set(O.x, 0, O.z); sky.renderOrder = -1; sky.frustumCulled = false; grp.add(sky);
  // the cloud deck the hand comes down through
  const ct = surfTex('cloud', 3); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(6, 6);
  const cloudM = new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, color: 0x9a948a });
  const cloud = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(Math.PI / 2), cloudM); cloud.position.set(O.x, 150, O.z); grp.add(cloud);
  // smoke going straight up out of the city, a long way off
  const st = surfTex('smoke', 5);
  for (let k = 0; k < 7; k++) { const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, color: 0x6a6460 })); const a = -Math.PI / 2 + (r() - 0.5) * 2, rad = 400 + r() * 500; sm.position.set(O.x + Math.cos(a) * rad, 130, O.z + Math.sin(a) * rad); sm.scale.set(90, 280, 1); grp.add(sm); }
  // far off in the haze: its legs. That is all.
  const legM = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1 });
  const legs = new THREE.Group(); legs.position.set(O.x + 520, 0, O.z - 900);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(9, 15, 230, 10), legM); l.position.set(s * 40, 115, 0); legs.add(l); }
  grp.add(legs);
  // ash, everywhere, all the time
  const N = 2600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 60; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = canvasTex(32, 32, (g, w, h) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const ash = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0xc8c4bc, map: dot, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }));
  ash.frustumCulled = false; grp.add(ash);
  // the black rain, after
  const bpos = new Float32Array(400 * 3);
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
  const blood = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0x1a0303, map: dot, size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false }));
  blood.frustumCulled = false; blood.visible = false; grp.add(blood);
  // the hatch on the surface: its leaves standing open, and the deck that comes up through it
  const hm = M(0x3e403c, { roughness: 0.7, metalness: 0.4 });
  const leafG = new THREE.CylinderGeometry(3.5, 3.5, 0.28, 32, 1, false, 0, Math.PI);
  for (const s of [-1, 1]) { const lf = new THREE.Mesh(leafG, hm); lf.position.set(O.x + s * 3.55, 0.1, O.z); lf.rotation.set(0, s > 0 ? 0 : Math.PI, s * 2.95); lf.castShadow = true; grp.add(lf); }
  const ringT = new THREE.Mesh(new THREE.RingGeometry(3.55, 5.2, 48).rotateX(-Math.PI / 2), M(0x4a4a46)); ringT.position.set(O.x, 0.02, O.z); grp.add(ringT);
  const deck = breachDeck(); deck.position.set(O.x, 0, O.z); grp.add(deck);
  grp.visible = false;
  R.scene.add(grp);
  const fd = new THREE.DataTexture(new Uint8Array([0, 20, 160, 255]), 1, 1, THREE.RGBAFormat); fd.needsUpdate = true;
  Object.assign(SURF, { group: grp, sky, skyM, cloud, cloudM, legs, ash, blood, deck, field: fd, fieldXf: new THREE.Vector4(0, 0, 1, 1) });
  return SURF;
}
// the platform's deck as a thing that moves: a grate floor, hazard edges, the rails
function breachDeck() {
  const g = new THREE.Group();
  const gr = mat('grate'), st = BM.steel;
  const floor = new THREE.Mesh(boxGeo(8.9, 0.2, 8.9, 2), gr); floor.position.y = -0.1; floor.receiveShadow = true; g.add(floor);
  for (const [x, z, w, d] of [[0, -4.33, 8.9, 0.24], [0, 4.33, 8.9, 0.24], [-4.33, 0, 0.24, 8.9], [4.33, 0, 0.24, 8.9]]) { const e = new THREE.Mesh(planeGeo(w, d), hazardMat()); e.rotation.x = -Math.PI / 2; e.position.set(x, 0.006, z); g.add(e); }
  for (const [x, z] of [[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3]]) { const p = new THREE.Mesh(cylGeo(0.05, 0.05, 1.1, 8), st); p.position.set(x, 0.55, z); g.add(p); }
  return g;
}

// ---------- the ending itself ----------
const _brV = new THREE.Vector3(), _brW = new THREE.Vector3(), _brOv = {};
function startBreachEnding() {
  Cinema.endKind = 'l3'; Cinema.mode = 'ending';
  setMode('end'); setLetterbox(true);
  $('end').hidden = true; setNextCard('Next', 'Level 4', null, 'Coming soon');
  const S = Breach.silo, me = Game.me, L = Game.L;
  Cinema.ca = S ? S.ai : L.areas.length - 1;
  Cinema.t = 0; Cinema.kick = 0; Cinema.kickV = 0; Cinema.surface = false; Cinema.fov = 72;
  Cinema.stats = endStats();
  // where you stand on the deck, and which way you face
  const onDeck = me && !me.dead && S && Math.abs(me.x - S.cx) < 4.4 && Math.abs(me.z - S.cz) < 4.4;
  Cinema.brOff = onDeck ? { x: me.x - S.cx, z: me.z - S.cz } : { x: -1.5, z: 1.5 };
  Cinema.endCam = { yaw: me ? me.yaw : 0, pitch: me ? me.pitch : 0 };
  // the deck that rises, standing in for the platform's floor
  const deck = Cinema.brDeck || (Cinema.brDeck = breachDeck());
  deck.position.set(S.cx, 0, S.cz); deck.visible = true; if (!deck.parent) R.scene.add(deck);
  // where the Pale comes from: wherever it was, at a run, to the edge of the deck away from you, and up
  const away = Math.atan2(-Cinema.brOff.x, -Cinema.brOff.z), ex = S.cx + Math.sin(away) * 6.5, ez = S.cz + Math.cos(away) * 6.5;
  Cinema.brPale = { x0: Pale.ready ? PS.x || ex + 6 : ex + 6, z0: Pale.ready ? PS.z || ez : ez, ex, ez, away };
  if (Pale.ready) { Pale.snap = true; setPaleVisible(true); }
  buildSurfaceSet();
  if (!Colossus.ready) colossusBuildStep(40, R.scene);
  Sound.setTheme('silo', { drone: 0.5, machine: 0.6 });
  const top = { x: S.cx, y: 13, z: S.cz }, deckP = () => ({ x: S.cx, y: brRise(Cinema.t), z: S.cz });
  const T = BR_T;
  setCues([
    [0.05, () => { Sound.play('clunk', deckP()); Sound.play('hatchOpen', top); R.shake = 0.9; Cinema.kickV = -1.2; }],
    [T.rise, () => { Sound.play('brakes', deckP()); Sound.setTheme('silo', { drone: 0.5, machine: 1.1, wind: 0.8 }); }],
    [T.pale, () => { Sound.play('paleShriek', { x: Cinema.brPale.x0, y: 2.6, z: Cinema.brPale.z0 }); }],
    [T.jump, () => { Sound.play('paleShriek', { x: Cinema.brPale.ex, y: 2.6, z: Cinema.brPale.ez }); }],
    [T.land, () => { Sound.play('thud', deckP()); Sound.play('ventHit', deckP()); R.shake = 1.4; R.hit = 1.2; Cinema.kickV = -2.2; }],
    [T.stand, () => { Sound.play('paleClick', deckP()); }],
    [T.creep, () => { Sound.play('paleClick', deckP()); }],
    [T.white - 0.3, () => { Sound.play('hatchOpen', top); Sound.duck(0.9, 0.6, 2.0); }],
    [T.white, () => { R.whiteFlash = 1; }],
    [T.surface, () => brToSurface()],
    [T.radio, () => { Sound.play('radio'); subtitle('...any station... this is... is anybody...', 3200); }],
    [T.boom, () => { Sound.play('colossus', brSurf(0, 0, -600)); R.shake = Math.max(R.shake, 0.7); }],
    [T.boom + 2.4, () => Sound.play('colossus', brSurf(300, 0, -800))],
    [T.shriek, () => { Sound.play('paleShriek', brSurf(Cinema.brPS.x, 2.6, Cinema.brPS.z)); R.fearKick = 1; }],
    [T.charge + 0.1, () => Sound.play('paleStep', brSurf(0, 0, 0))],
    [T.shadow, () => { Sound.play('colossus', brSurf(0, 60, 0)); Sound.play('colossusCall', brSurf(0, 120, -40)); R.shake = 1.6; R.hit = 0.8; }],
    [T.hand - 0.2, () => { Sound.setTheme('surface', { wind: 1.6, drone: 0.6 }); }],
    [T.grab, () => { Sound.play('crush', brSurf(Cinema.brPS.x, 2, Cinema.brPS.z)); Sound.play('paleShriek', brSurf(Cinema.brPS.x, 2, Cinema.brPS.z)); R.shake = 2.2; R.hit = 2; Cinema.kickV = -2.6; Colossus.gore = 0; }],
    [T.grab + 0.35, () => { Sound.play('crush', brSurf(Cinema.brPS.x, 3, Cinema.brPS.z)); Sound.play('neckSnap', brSurf(Cinema.brPS.x, 3, Cinema.brPS.z)); brBloodBurst(); }],
    [T.lift + 0.6, () => Sound.play('squelch', brSurf(Cinema.brPS.x, 10, Cinema.brPS.z))],
    [T.call, () => { Sound.play('colossusCall', brSurf(500, 100, -900)); Sound.setTheme('surface', { wind: 1.0, drone: 0.25 }); }],
    [T.black, () => { R.fade = 1; }],
    [T.card, () => { const c = $('next-card'); c.hidden = false; void c.offsetWidth; c.classList.add('show'); Sound.play('impact'); }],
    [T.soon, () => $('next-card').classList.add('soon')],
    [T.screen, () => showEndScreen()],
  ]);
  $('skip').hidden = false;
}
// the deck's height in the shaft
function brRise(T) { return BR_RISE * smoothstep(BR_T.rise, BR_T.white + 0.6, T); }
// a point on the surface, relative to the hatch
function brSurf(x, y, z) { return { x: SURF.ox + x, y, z: SURF.oz + z }; }
function brToSurface() {
  Cinema.surface = true; Cinema.ca = -1;
  SURF.group.visible = true;
  if (World.group) World.group.visible = false;
  if (Cinema.brDeck) Cinema.brDeck.visible = false;
  if (Breach.hatch) Breach.hatch.g.visible = false;
  if (!Colossus.ready) buildBeast(Colossus, R.scene);
  Colossus.root.scale.setScalar(3.4); Colossus.root.visible = false;
  Debris.free = true;
  // the shading for the set: open sky, dry, dusty
  if (!SURF.saved) { SURF.saved = { f: WS.field.value, xf: WS.fieldXf.value.clone() }; WS.field.value = SURF.field; WS.fieldXf.value.copy(SURF.fieldXf); }
  for (let i = 0; i < WS.occPt.value.length; i++) WS.occPt.value[i].w = -1;
  R.camera.far = 3200; R.camera.updateProjectionMatrix();
  // the Pale, crouched at the far side of the deck, behind you
  Cinema.brPS = { x: Cinema.brOff.x > 0 ? -1.6 : 1.6, z: 10.5 };
  Sound.setTheme('surface');
  try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* compiled as it comes into view */ }
}
function brBloodBurst() {
  const p = SURF.blood.geometry.attributes.position, hand = Colossus.root.position;
  SURF.bloodV = [];
  for (let i = 0; i < p.count; i++) { p.setXYZ(i, hand.x + (Math.random() - 0.5) * 3, hand.y - 2 + Math.random() * 3, hand.z + (Math.random() - 0.5) * 3); SURF.bloodV.push([(Math.random() - 0.5) * 6, -Math.random() * 2, (Math.random() - 0.5) * 6]); }
  p.needsUpdate = true; SURF.blood.visible = true;
}
function updateBreachEnding(dt, t) {
  Cinema.t += dt; runCues();
  const T = Cinema.t, E = BR_T, S = Breach.silo, off = Cinema.brOff, kick = cineKick(dt);
  const cam = R.camera;
  if (!Colossus.ready) colossusBuildStep(6, R.scene);
  if (!Cinema.surface) {
    // ---- up the shaft ----
    const rise = brRise(T), H = Breach.hatch;
    if (H) { H.leaves.forEach((hg, i) => { hg.rotation.z = (i === 0 ? 1 : -1) * lerp(0.14, 1.75, smooth01((T - E.leaves) / 3.2)); }); H.skyM.color.setScalar(lerp(0.65, 1.6, smooth01(T / 6))); H.shaftM.opacity = lerp(0.05, 0.16, smooth01(T / 5)); for (const b of H.beacons) b.refl.visible = false; }
    Cinema.brDeck.position.y = rise;
    // daylight down the shaft, brighter the higher you go
    R.key.color.setHex(0xd0d2d4); R.key.angle = 0.6; R.key.penumbra = 0.9; R.key.distance = 30;
    R.key.position.set(S.cx, S.top + 2, S.cz); R.key.target.position.set(S.cx, rise, S.cz);
    R.key.intensity = lerp(160, 900, smooth01(T / 6.5));
    R.backlight.intensity = 0;
    // you: on the deck, looking up at the open hatch, then round when it comes up over the edge
    const P = Cinema.brPale, toPale = Math.atan2(-(P.ex - (S.cx + off.x)), -(P.ez - (S.cz + off.z)));
    let yaw = lerpAngle(Cinema.endCam.yaw, Cinema.endCam.yaw + 0.3, smooth01(T / 3)), pitch = lerp(Cinema.endCam.pitch, 0.95, smooth01(T / 1.6));
    const look = smooth01((T - E.jump + 0.2) / 0.45);
    yaw = lerpAngle(yaw, toPale, look); pitch = lerp(pitch, 0.05, look);
    const up = smooth01((T - E.creep - 0.7) / 0.6); pitch = lerp(pitch, 1.1, up);
    pitch += kick * 0.4 + Math.sin(t * 1.3) * 0.01;
    cam.position.set(S.cx + off.x, rise + EYE_H + kick * 0.6, S.cz + off.z);
    cam.rotation.set(pitch, yaw, 0);
    if (R.camera.fov !== 72) { R.camera.fov = 72; R.camera.updateProjectionMatrix(); }
    if (T > E.rise && T < E.white) R.shake = Math.max(R.shake || 0, 0.18);
    cineShake(dt, t);
    if (World.viewModel) World.viewModel.group.visible = true;
    setFlash(0.25); R.flashTarget.position.set(0.05, -0.5, -3);
    // the Pale: across the floor flat out, a leap, onto the deck; up on its feet; coming at you
    if (Pale.ready) {
      const ov = _brOv; for (const k in ov) delete ov[k];
      let x, z, y = 0, sp = 0, yawP = Math.atan2(P.ex - P.x0, P.ez - P.z0), mode = 'hunt';
      if (T < E.jump) {
        const k = smooth01((T - E.pale) / (E.jump - E.pale));
        x = lerp(P.x0, P.ex, k); z = lerp(P.z0, P.ez, k); sp = Math.hypot(P.ex - P.x0, P.ez - P.z0) / (E.jump - E.pale);
      } else if (T < E.land) {
        const k = (T - E.jump) / (E.land - E.jump), lx = S.cx + Math.sin(P.away) * 3.9, lz = S.cz + Math.cos(P.away) * 3.9;
        x = lerp(P.ex, lx, k); z = lerp(P.ez, lz, k); y = lerp(0, brRise(E.land), k) + Math.sin(k * Math.PI) * 2.2;
        ov.drop = 0.3; ov.lean = 0.6; ov.still = true; sp = 0;
      } else {
        const lx = S.cx + Math.sin(P.away) * 3.9, lz = S.cz + Math.cos(P.away) * 3.9;
        const ck = smooth01((T - E.creep) / 1.4);
        x = lerp(lx, S.cx + Math.sin(P.away) * 2.4, ck); z = lerp(lz, S.cz + Math.cos(P.away) * 2.4, ck); y = rise;
        yawP = Math.atan2(cam.position.x - x, cam.position.z - z);
        const crouch = 1 - smooth01((T - E.stand) / 0.7);
        ov.drop = 0.65 * crouch + 0.15; ov.lean = 0.85 * crouch + 0.25; sp = T > E.creep ? 0.8 : 0; mode = T > E.creep ? 'walk' : 'hunt';
        ov.jaw = T > E.stand && T < E.stand + 0.8 ? 1.2 : 0.3; ov.headRoll = Math.sin(T * 1.1) * 0.4;
      }
      Object.assign(Pale, { x, z, y, yaw: yawP, speed: sp, mode, look: T > E.land ? cam.position : null, reach: 0, grip: undefined, ov });
      setPaleVisible(true);
      palePose(dt, t);
      for (const ev of Pale.events) Sound.play('paleStep', { x: ev.x, y: y + 0.05, z: ev.z });
      Pale.events.length = 0;
    }
    // everyone on the deck goes up with it
    updateMates(dt, t);
    for (const [, m] of Game.mates) if (m.h.root.visible && Math.abs(m.x - S.cx) < 4.6 && Math.abs(m.z - S.cz) < 4.6) m.h.root.position.y += rise;
    updateLightPool(dt, cam, Cinema.ca);
    R.fear = T > E.pale ? 0.8 : 0.3;
    R.whiteFlash = T > E.white - 0.8 ? clamp((T - (E.white - 0.8)) / 0.8, 0, 1) : 0;
    return;
  }
  // ---- the surface ----
  const sk = clamp((T - E.surface) / 1.8, 0, 1);
  R.whiteFlash = Math.max(0, 1 - sk * 1.1);
  const dk = smooth01((T - E.shadow) / 0.6) * (1 - smooth01((T - E.gone) / 2.5));
  // the light: overcast, flat, brown; dimmed when it is overhead
  R.hemi.color.setHex(0xb8b0a0); R.hemi.groundColor.setHex(0x4a4640); R.hemi.intensity = lerp(1.15, 0.45, dk);
  R.key.color.setHex(0xd8c8a8); R.key.angle = 1.2; R.key.penumbra = 1; R.key.distance = 0; R.key.position.set(SURF.ox - 400, 300, SURF.oz - 900); R.key.target.position.set(SURF.ox, 0, SURF.oz); R.key.intensity = lerp(2.5e6, 0.6e6, dk);
  R.backlight.intensity = 0;
  SURF.skyM.uniforms.dim.value = lerp(1, 0.55, dk);
  R.scene.fog.color.setRGB(0.36 * (1 - dk * 0.4), 0.33 * (1 - dk * 0.4), 0.29 * (1 - dk * 0.4)); R.scene.fog.density = 0.0026 + dk * 0.0015; R.scene.background.copy(R.scene.fog.color);
  SURF.cloudM.map.offset.x += dt * 0.004;
  // the deck coming up out of the ground, locking flush
  const dy = lerp(-3.2, 0, smooth01((T - E.surface) / 1.4));
  SURF.deck.position.y = dy;
  const eye = { x: SURF.ox + off.x, y: dy + EYE_H, z: SURF.oz + off.z };
  // when it comes down, you go over backwards, onto the deck, and look up at it from there
  const PS3 = Cinema.brPS, bx = SURF.ox + PS3.x, bz = SURF.oz + PS3.z;
  const fall = smooth01((T - E.stop - 0.05) / 0.7) * (1 - smooth01((T - E.gone - 0.4) / 2.2));
  { const dx = eye.x - bx, dz = eye.z - bz, dl = Math.hypot(dx, dz) || 1; eye.x += dx / dl * 1.4 * fall; eye.z += dz / dl * 1.4 * fall; eye.y -= 0.95 * fall; }
  // where to look: up at the sky; down to the city, slowly across it; round at the Pale; up at what comes down; after it into the cloud; back to the city
  const LK = (x, y, z) => [Math.atan2(-(x - eye.x), -(z - eye.z)), Math.atan2(y - eye.y, Math.max(0.3, Math.hypot(x - eye.x, z - eye.z)))];
  const city0 = LK(SURF.ox + 300, 60, SURF.oz - 600), city1 = LK(SURF.ox - 260, 50, SURF.oz - 620), skyL = [city0[0] + 0.2, 0.9];
  let A;
  if (T < E.look) A = skyL;
  else if (T < E.shriek) { const k = smooth01((T - E.look) / 1.4), p = smooth01((T - E.look - 1.2) / (E.shriek - E.look - 1.2)); A = [lerpAngle(lerpAngle(skyL[0], city0[0], k), city1[0], p), lerp(lerp(skyL[1], city0[1], k), city1[1], p)]; }
  else {
    const toP = LK(Pale.x, 2.0 + (Pale.y || 0), Pale.z), k = smooth01((T - E.shriek) / 0.5);
    A = [lerpAngle(city1[0], toP[0], k), lerp(city1[1], toP[1], k)];
    const hp = Colossus.root ? Colossus.root.position : null;
    if (T > E.stop && hp) {
      // frame the two of them: its head, and the palm coming down over it
      const palmY = hp.y - 3.2, up = smooth01((T - E.stop) / 0.8);
      const mid = LK(lerp(Pale.x, hp.x, 0.4), lerp(2.6 + (Pale.y || 0), Math.min(palmY, 40), 0.55), lerp(Pale.z, hp.z, 0.4));
      A = [lerpAngle(A[0], mid[0], up), lerp(A[1], Math.min(1.25, mid[1]), up)];
    }
    if (T > E.lift && hp) { const toH = LK(hp.x, hp.y - 4, hp.z), k3 = smooth01((T - E.lift) / 0.8); A = [lerpAngle(A[0], toH[0], k3), lerp(A[1], Math.min(1.3, toH[1]), k3)]; }
    if (T > E.gone - 0.6) { const k2 = smooth01((T - E.gone + 0.6) / 2.2); A = [lerpAngle(A[0], city0[0], k2), lerp(A[1], city0[1] + 0.02, k2)]; }
  }
  Cinema.brYaw = Cinema.brYaw === undefined ? A[0] : dampAngle(Cinema.brYaw, A[0], T > E.shriek && T < E.shriek + 0.6 ? 9 : 3, dt);
  Cinema.brPitch = Cinema.brPitch === undefined ? A[1] : damp(Cinema.brPitch, A[1], 3, dt);
  cam.position.set(eye.x, eye.y + kick * 0.6, eye.z);
  cam.rotation.set(Cinema.brPitch + kick * 0.4 + Math.sin(t * 1.1) * 0.006, Cinema.brYaw + Math.sin(t * 0.7) * 0.008, 0);
  const fov = T > E.hand && T < E.gone ? 84 : 66;
  Cinema.fov = damp(Cinema.fov || 72, fov, 2, dt);
  if (Math.abs(cam.fov - Cinema.fov) > 0.05) { cam.fov = Cinema.fov; cam.updateProjectionMatrix(); }
  cineShake(dt, t);
  if (World.viewModel) World.viewModel.group.visible = true;
  setFlash(0); R.flashThrow = 1;
  // the legs in the haze: one of them moves
  SURF.legs.children[0].position.z = Math.sin(T * 0.08) * 40; SURF.legs.position.x = SURF.ox + 520 - T * 2;
  // ash round you, drifting down and sideways on the wind; thicker when it comes down
  const ap = SURF.ash.geometry.attributes.position;
  SURF.ash.position.set(eye.x, 0, eye.z);
  for (let i = 0; i < ap.count; i++) {
    let x = ap.getX(i) + dt * (1.2 + dk * 6), y = ap.getY(i) - dt * (0.6 + dk * 1.5 + (i % 7) * 0.05), z = ap.getZ(i) + Math.sin(t + i) * dt * 0.3;
    if (y < 0) y += 30; if (x > 30) x -= 60;
    ap.setXYZ(i, x, y, z);
  }
  ap.needsUpdate = true;
  // ---- the Pale behind you, and what comes for it ----
  if (Pale.ready) brPaleAndHand(T, dt, t, eye);
  if (SURF.blood.visible) {
    const bp = SURF.blood.geometry.attributes.position;
    for (let i = 0; i < bp.count; i++) { const v = SURF.bloodV[i]; v[1] -= 9.8 * dt; bp.setXYZ(i, bp.getX(i) + v[0] * dt, Math.max(0.02, bp.getY(i) + v[1] * dt), bp.getZ(i) + v[2] * dt); }
    bp.needsUpdate = true;
  }
  R.fear = T > E.shriek && T < E.gone ? 0.85 : 0.2;
  if (T >= E.black) R.fade = 1; else R.fade = damp(R.fade, 0, 4, dt);
}
const _brHand = new THREE.Vector3(), _brFist = new THREE.Vector3();
function brPaleAndHand(T, dt, t, eye) {
  const E = BR_T, P = Cinema.brPS, ov = _brOv; for (const k in ov) delete ov[k];
  const base = brSurf(P.x, 0, P.z), toCam0 = Math.atan2(eye.x - base.x, eye.z - base.z);
  // the spot it charges to, and stops dead on: four metres short of where you stood
  const d0 = Math.hypot(eye.x - base.x, eye.z - base.z), dStop = Math.max(0, d0 - 4.2);
  let x = base.x, z = base.z, y = 0, sp = 0, mode = 'idle', yaw = toCam0;
  if (T < E.shriek) { ov.drop = 0.7; ov.lean = 1.05; ov.headRoll = 0.45; ov.still = true; }
  else if (T < E.charge) { const k = smooth01((T - E.shriek) / 0.6); ov.drop = lerp(0.7, 0, k); ov.lean = lerp(1.05, 0.35, k); ov.jaw = 1.3; ov.headRoll = Math.sin(T * 3) * 0.3; ov.still = true; mode = 'hunt'; }
  else if (T < E.stop) {
    const k = smooth01((T - E.charge) / (E.stop - E.charge)), d = lerp(0, dStop, k);
    x = base.x + Math.sin(toCam0) * d; z = base.z + Math.cos(toCam0) * d; sp = 4.6; mode = 'hunt'; ov.jaw = 0.9;
  } else {
    x = base.x + Math.sin(toCam0) * dStop; z = base.z + Math.cos(toCam0) * dStop; mode = 'hunt';
    // it stops dead, and looks up
    const lk = smooth01((T - E.stop) / 0.4);
    ov.neckPitch = -0.9 * lk; ov.headPitch = -0.6 * lk; ov.lookFwd = true; ov.still = true; ov.lean = -0.1 * lk; ov.jaw = 0.5 * lk;
  }
  // the hand: down out of the cloud behind it, open, slowing as it comes; shut round it; up, and gone
  const H = Colossus;
  if (H.ready && T > E.hand - 0.1) {
    H.root.visible = T < E.gone + 0.5;
    const back = 1.6, tx = x - Math.sin(toCam0) * back, tz = z - Math.cos(toCam0) * back, ty = 2.6 + 8.2;
    let hx = tx, hy = ty, hz = tz, curl = 0.04, thumb = 0.05, wrist = 0.35;
    if (T < E.grab) {
      const u = clamp((T - E.hand) / (E.grab - E.hand), 0, 1), k = 1 - Math.pow(1 - u, 3);
      hx = lerp(x - Math.sin(toCam0) * 7, tx, k); hz = lerp(z - Math.cos(toCam0) * 7, tz, k); hy = lerp(160, ty, k);
      wrist = lerp(0.6, 0.35, k);
    } else {
      const k = smooth01((T - E.grab) / 0.28), lk = smooth01((T - E.lift) / (E.gone - E.lift));
      hy = ty + lk * lk * 175; hx = tx - Math.sin(toCam0) * lk * 20; hz = tz - Math.cos(toCam0) * lk * 20;
      curl = lerp(0.04, 0.93, k); thumb = lerp(0.05, 1.0, k); wrist = lerp(0.35, 0.12, k);
      H.gore = Math.min(1, H.gore + dt * 2);
    }
    H.root.position.set(hx, hy, hz);
    H.root.rotation.set(0, toCam0 + Math.PI, 0);
    colossusPose(curl + (T > E.grab + 0.3 && T < E.lift + 0.4 ? Math.sin(T * 20) * 0.03 : 0), thumb, wrist);
    // the Pale, in its fist: lifted with it, thrashing, then still
    if (T > E.grab) {
      const pk = smooth01((T - E.grab) / 0.28);
      H.bones.palm.localToWorld(_brV.set(0, -1.15, 0.45));
      y = lerp(0, _brV.y - 2.0, pk); x = lerp(x, _brV.x, pk); z = lerp(z, _brV.z, pk);
      const alive = 1 - smooth01((T - E.grab - 0.4) / 0.35);
      ov.drop = 0; ov.lean = 0.2 * alive; ov.jaw = 1.4 * alive + 0.3; ov.still = true; ov.lookFwd = false;
      ov.armL = new THREE.Vector3(x + Math.sin(T * 13) * 0.6 * alive + 0.6, y + 2.4 + Math.cos(T * 11) * 0.4, z);
      ov.armR = new THREE.Vector3(x - 0.6 - Math.sin(T * 12) * 0.6 * alive, y + 2.3 + Math.sin(T * 9) * 0.5 * alive, z);
      ov.footL = new THREE.Vector3(x + 0.15, y + 0.05 - (1 - alive) * 0.1 + Math.sin(T * 14) * 0.2 * alive, z + 0.1);
      ov.footR = new THREE.Vector3(x - 0.15, y + 0.05 + Math.cos(T * 15) * 0.2 * alive, z - 0.1);
      ov.headRoll = (1 - alive) * 0.9;
    }
  }
  Object.assign(Pale, { x, z, y, yaw, speed: sp, mode, look: T > E.shriek && T < E.stop ? R.camera.position : null, ov });
  setPaleVisible(T < E.gone + 0.5);
  palePose(dt, t);
  for (const ev of Pale.events) if (T < E.grab) Sound.play('paleStep', { x: ev.x, y: 0.05, z: ev.z });
  Pale.events.length = 0;
}
// leaving the ending by any door: the world back as it was
function breachEndingLeave() {
  if (Cinema.endKind !== 'l3' && !Cinema.surface && !(SURF.group && SURF.group.visible)) return;
  Cinema.surface = false;
  if (SURF.group) SURF.group.visible = false;
  if (SURF.blood) SURF.blood.visible = false;
  if (Cinema.brDeck) Cinema.brDeck.visible = false;
  if (World.group) World.group.visible = true;
  if (Breach.hatch) Breach.hatch.g.visible = true;
  if (Colossus.root) Colossus.root.visible = false;
  setPaleVisible(false);
  if (SURF.saved) { WS.field.value = SURF.saved.f; WS.fieldXf.value.copy(SURF.saved.xf); SURF.saved = null; }
  Debris.free = false;
  Cinema.brYaw = undefined; Cinema.brPitch = undefined;
  applyRenderDistance();
}
