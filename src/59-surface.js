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

// ---------- the storm, and what stands in it ----------
// Lightning inside the cloud, and the shape of the thing the hand belongs to: never seen except as a shadow
// against the lightning behind it - the head and the shoulders of something standing over the city, two
// points of light where its eyes would be. Shared by the sky and the cloud deck, so the shadow falls across both.
const GIANT_GLSL = `
  uniform float flash, giant, eyes;
  uniform vec3 flashDir, giantDir;
  float gH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float gN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gH(i), gH(i + vec2(1.0, 0.0)), f.x), mix(gH(i + vec2(0.0, 1.0)), gH(i + vec2(1.0, 1.0)), f.x), f.y); }
  float gEll(vec2 p, vec2 c, vec2 r) { return length((p - c) / r) - 1.0; }
  float gCap(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return (length(pa - ba * h) - r) / r; }
  vec3 stormLight(vec3 d, vec3 c, float cl) {
    float fl = max(dot(d, flashDir), 0.0);
    c += vec3(0.72, 0.78, 1.0) * flash * (pow(fl, 14.0) * (0.5 + 1.4 * cl) + pow(fl, 3.0) * 0.2 + 0.05);
    if (giant > 0.001) {
      vec3 gz = normalize(giantDir), gx = normalize(cross(vec3(0.0, 1.0, 0.0), gz)), gy = cross(gz, gx);
      float fw = dot(d, gz);
      if (fw > 0.2) {
        vec2 uv = vec2(dot(d, gx), dot(d, gy)) / fw;
        // the edge of it is never clean: torn by the cloud in front of it
        vec2 w = uv + (vec2(gN(uv * 18.0), gN(uv * 18.0 + 7.3)) - 0.5) * 0.035;
        // a long skull, hung forward; a jaw; a neck like a cable; shoulders hunched up round it; arms hanging
        float body = gEll(w, vec2(0.0, 0.26), vec2(0.085, 0.15));
        body = min(body, gEll(w, vec2(0.012, 0.15), vec2(0.06, 0.08)));
        body = min(body, gCap(w, vec2(0.0, 0.16), vec2(0.0, 0.02), 0.04));
        body = min(body, gEll(w, vec2(-0.2, 0.02), vec2(0.24, 0.11)));
        body = min(body, gEll(w, vec2(0.21, 0.04), vec2(0.23, 0.12)));
        body = min(body, gEll(w, vec2(0.0, -0.1), vec2(0.36, 0.16)));
        body = min(body, gCap(w, vec2(-0.4, -0.02), vec2(-0.5, -0.7), 0.055));
        body = min(body, gCap(w, vec2(0.41, 0.0), vec2(0.3, -0.75), 0.06));
        for (int k = 0; k < 4; k++) { float fk = float(k); body = min(body, gCap(w, vec2(-0.16 + fk * 0.1, 0.1 + 0.02 * fk), vec2(-0.2 + fk * 0.12, 0.2 + 0.04 * mod(fk, 2.0)), 0.012)); }
        float inside = (1.0 - smoothstep(-0.15, 0.15, body)) * (0.55 + 0.45 * cl) * smoothstep(-0.75, -0.2, uv.y);
        float lit = clamp(0.12 + 1.9 * flash, 0.0, 1.0);
        c = mix(c, vec3(0.01, 0.008, 0.008), inside * giant * lit);
        c += vec3(0.7, 0.75, 0.92) * (1.0 - smoothstep(0.0, 0.18, abs(body))) * smoothstep(0.35, 0.9, flash) * giant * 0.35 * cl;
        // its eyes: two slits of dull light, and nothing else in the face
        vec2 e1 = (w - vec2(-0.032, 0.235)) * vec2(1.0, 3.0), e2 = (w - vec2(0.032, 0.235)) * vec2(1.0, 3.0);
        float ey = exp(-dot(e1, e1) / 0.00012) + exp(-dot(e2, e2) / 0.00012);
        c += vec3(1.0, 0.85, 0.55) * ey * eyes * giant * 3.0;
      }
    }
    return c;
  }`;
const STORM_UNIFORMS = () => ({ flash: { value: 0 }, flashDir: { value: new THREE.Vector3(0, 1, 0) }, giant: { value: 0 }, giantDir: { value: new THREE.Vector3(0.5, 0.3, -0.85) }, eyes: { value: 0 } });

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
    } else if (kind === 'puff') {
      // a round, soft billow of cloud or dust: lumpy inside, fading to nothing at its edge
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const a = r() * 6.28, rr = r() * w * 0.28, x = w / 2 + Math.cos(a) * rr, y = h / 2 + Math.sin(a) * rr * 0.8, rad = 14 + r() * 34, v = 70 + r() * 50 | 0;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(' + v + ',' + (v - 5) + ',' + (v - 9) + ',0.42)'); gr.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)');
        g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      g.globalCompositeOperation = 'destination-in';
      const m = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.6, 'rgba(0,0,0,0.85)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
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
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2600, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gt, roughness: 1, color: 0x8a847c }));
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
  // the sky: a ceiling of storm cloud, black overhead, brown with smoke lower down, and under it all the horizon
  // burning - the glow of a city on fire, strongest where the city is
  const storm = STORM_UNIFORMS();
  const skyM = new THREE.ShaderMaterial({
    uniforms: Object.assign({ sun: { value: new THREE.Vector3(-0.35, 0.18, -0.92).normalize() }, dim: { value: 1 }, time: { value: 0 } }, storm),
    vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 sun; uniform float dim, time; varying vec3 vD;
      float h(vec3 p) { p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float n(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
      ${GIANT_GLSL}
      void main() {
        vec3 d = normalize(vD); float y = d.y;
        vec3 q = d * 3.2 + vec3(time * 0.012, 0.0, time * 0.007);
        float cl = fbm(q + vec3(fbm(q * 1.6 + time * 0.01)) * 0.9);
        float city = smoothstep(-0.1, -0.85, d.z);
        vec3 c = mix(vec3(0.58, 0.31, 0.16), vec3(0.22, 0.17, 0.14), smoothstep(0.0, 0.14, y));
        c = mix(c, vec3(0.055, 0.055, 0.065), smoothstep(0.1, 0.5, y));
        c *= 0.62 + 0.62 * cl;
        float billow = smoothstep(0.42, 0.78, cl);
        c += vec3(0.32, 0.12, 0.04) * billow * (1.0 - smoothstep(0.02, 0.35, y)) * (0.35 + 0.65 * city);
        c += vec3(0.55, 0.2, 0.06) * (1.0 - smoothstep(0.0, 0.07, abs(y))) * (0.3 + 0.7 * city) * (0.7 + 0.5 * n(d * 30.0 + time * 0.4));
        float s = max(dot(d, sun), 0.0);
        c += vec3(0.5, 0.34, 0.2) * pow(s, 90.0) * 0.45 * (1.0 - billow * 0.8);
        c = stormLight(d, c, cl);
        c = mix(c, vec3(0.3, 0.22, 0.16), smoothstep(0.02, -0.08, y));
        gl_FragColor = vec4(c * dim, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2800, 32, 16), skyM); sky.position.set(O.x, 0, O.z); sky.renderOrder = -1; sky.frustumCulled = false; grp.add(sky);
  // the cloud deck the hand comes down through: lit from under by the fires, from inside by the lightning, with
  // a hole torn in it where the arm comes through
  const cloudM = new THREE.ShaderMaterial({
    uniforms: Object.assign({ time: { value: 0 }, opacity: { value: 0.96 }, dim: { value: 1 }, hole: { value: new THREE.Vector3(0, 0, 0) } }, storm),
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float time, opacity, dim; uniform vec3 hole; varying vec3 vW;
      float cH(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
      float cN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(cH(i), cH(i + vec2(1.0, 0.0)), f.x), mix(cH(i + vec2(0.0, 1.0)), cH(i + vec2(1.0, 1.0)), f.x), f.y); }
      float cF(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * cN(p); p = p * 2.07 + vec2(3.1, 1.7); a *= 0.5; } return s; }
      ${GIANT_GLSL}
      void main() {
        vec2 p = vW.xz * 0.0045 + vec2(time * 0.008, time * 0.003);
        float cl = cF(p + vec2(cF(p * 1.6 + 2.3), cF(p * 1.6 - 1.7)) * 1.3);
        vec3 d = normalize(vW - cameraPosition);
        float far = clamp(length(vW.xz - cameraPosition.xz) / 1000.0, 0.0, 1.0), city = smoothstep(-0.1, -0.8, d.z);
        // the belly of a storm: near black where it is thick, brown where it thins, and the fires of the city
        // glowing on the underside of it out toward the horizon
        vec3 c = mix(vec3(0.07, 0.065, 0.07), vec3(0.3, 0.26, 0.23), smoothstep(0.25, 0.75, cl));
        c += vec3(0.5, 0.18, 0.05) * pow(far, 1.4) * (0.35 + 0.65 * city) * (0.5 + 0.8 * cl);
        c = stormLight(d, c, cl);
        float a = opacity;
        if (hole.z > 0.0) { float r = length(vW.xz - hole.xy); a *= smoothstep(hole.z * 0.5, hole.z * 1.3, r + (cl - 0.5) * hole.z * 0.8); c *= 1.0 - 0.5 * (1.0 - smoothstep(hole.z, hole.z * 2.6, r)); }
        gl_FragColor = vec4(c * dim, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const cloud = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(Math.PI / 2), cloudM); cloud.position.set(O.x, 150, O.z); grp.add(cloud);
  // smoke going straight up out of the city, a long way off
  const st = surfTex('smoke', 5);
  const glowT = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,160,1)'); gr.addColorStop(0.25, 'rgba(255,140,50,0.7)'); gr.addColorStop(1, 'rgba(255,80,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const fires = [];
  for (let k = 0; k < 9; k++) {
    const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, color: 0x5a5450 })); const a = -Math.PI / 2 + (r() - 0.5) * 2, rad = 380 + r() * 520;
    sm.position.set(O.x + Math.cos(a) * rad, 130, O.z + Math.sin(a) * rad); sm.scale.set(90, 280, 1); grp.add(sm);
    // the fire under it, lighting the column of smoke from below
    const fg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff7a2a, fog: false }));
    fg.position.set(sm.position.x, 22, sm.position.z); fg.scale.set(110, 70, 1); grp.add(fg); fires.push({ s: fg, base: 1, ph: r() * 6, sc: [110, 70] });
  }
  // a city burning: fires at the foot of towers, tall and ragged, and windows burning high up; all of it
  // flickering, and the glow of it on the smoke
  const flameT = canvasTex(64, 128, (g, w, h) => {
    const gr = g.createRadialGradient(32, 104, 2, 32, 92, 70); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.18, 'rgba(255,170,60,0.95)'); gr.addColorStop(0.5, 'rgba(230,80,20,0.55)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(52, 50, 64, 80, 60, 104); g.quadraticCurveTo(32, 132, 4, 104); g.bezierCurveTo(0, 80, 12, 50, 32, 2); g.fill();
  });
  for (let k = 0; k < 74; k++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.3, rad = 160 + r() * 700, big = k < 30;
    const sz = big ? 16 + r() * 34 : 5 + r() * 10;
    const fg = new THREE.Sprite(new THREE.SpriteMaterial({ map: big ? flameT : glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: big ? 0xff8a3a : 0xffa040, fog: false }));
    const sy = big ? sz * 2.1 : sz;
    fg.position.set(O.x + Math.cos(a) * rad, big ? sy * 0.48 : 12 + r() * 90, O.z + Math.sin(a) * rad); fg.scale.set(sz, sy, 1);
    grp.add(fg); fires.push({ s: fg, base: big ? 0.95 : 0.6 + r() * 0.4, ph: r() * 6, sc: [sz, sy] });
    // and the glow it throws round itself
    if (big) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xc84a12, fog: false, opacity: 0.6 })); gl.position.set(fg.position.x, sz * 0.4, fg.position.z); gl.scale.set(sz * 3.2, sz * 1.6, 1); grp.add(gl); fires.push({ s: gl, base: 0.5, ph: r() * 6, sc: [sz * 3.2, sz * 1.6] }); }
  }
  // the rest of its arm, from the hand up into the cloud: grey as ash, cracked like a riverbed
  const armT = canvasTex(256, 512, (g, w, h) => {
    const rr = mulberry32(77); g.fillStyle = '#4c4946'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 50 + rr() * 50; g.fillStyle = 'rgba(' + v + ',' + (v - 3) + ',' + (v - 6) + ',' + (0.25 + rr() * 0.4) + ')'; g.fillRect(rr() * w, rr() * h, 2 + rr() * 8, 2 + rr() * 8); }
    g.strokeStyle = 'rgba(8,7,7,0.9)';
    for (let i = 0; i < 90; i++) { g.lineWidth = 1 + rr() * 3; g.beginPath(); let x = rr() * w, y = rr() * h; g.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (rr() - 0.5) * 50; y += (rr() - 0.3) * 50; g.lineTo(x, y); } g.stroke(); }
  });
  armT.wrapS = armT.wrapT = THREE.RepeatWrapping; armT.repeat.set(2, 9);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1, 1, 24, 1, true), new THREE.MeshStandardMaterial({ map: armT, color: 0x8a8580, roughness: 0.95, side: THREE.DoubleSide }));
  arm.visible = false; arm.frustumCulled = false; grp.add(arm);
  // where it comes down through the cloud: the cloud turning round the hole, dragged down after it
  const ctv = surfTex('puff', 9), vortex = new THREE.Group();
  for (let k = 0; k < 14; k++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctv, transparent: true, depthWrite: false, color: 0x6e6862, opacity: 0.85 }));
    sp.userData = { a: k / 14 * Math.PI * 2, r: 0.75 + (k % 3) * 0.2, y: -(k % 4) * 0.12, s: 0.9 + (k % 5) * 0.15 };
    vortex.add(sp);
  }
  vortex.visible = false; grp.add(vortex);
  // the wind of it coming down: a ring of dust running out across the ground
  const shockT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 30, 64, 64, 64); gr.addColorStop(0, 'rgba(120,112,100,0)'); gr.addColorStop(0.7, 'rgba(120,112,100,0.55)'); gr.addColorStop(1, 'rgba(120,112,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const shock = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shockT, transparent: true, depthWrite: false, opacity: 0 }));
  shock.visible = false; grp.add(shock);
  const dustT = surfTex('puff', 11), dust = [];
  for (let k = 0; k < 18; k++) { const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustT, transparent: true, depthWrite: false, color: 0x8a8278, opacity: 0 })); d.visible = false; grp.add(d); dust.push({ s: d, a: k / 18 * Math.PI * 2 + r() * 0.3, v: 9 + r() * 7 }); }
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
  Object.assign(SURF, { group: grp, sky, skyM, cloud, cloudM, legs, ash, blood, deck, field: fd, fieldXf: new THREE.Vector4(0, 0, 1, 1), storm, fires, arm, vortex, shock, dust, flash: 0, flashes: [] });
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
    [T.look + 1.1, () => brLightning(brSky(-0.6, 0.35, -1), 0.7, 2.4)],
    [T.boom + 0.7, () => { brLightning(brGiantDir(), 0.85, 1.6); SURF.giantShow = 0.45; }],
    [T.shadow - 0.15, () => brLightning(brSky(0.1, 1, 0.2), 1, 0.3)],
    [T.hand + 0.9, () => brLightning(brSky(-0.3, 0.9, 0.4), 0.6, 0.9)],
    [T.grab - 0.05, () => brLightning(brSky(0.2, 1, -0.1), 1.1, 0.25)],
    [T.gone - 0.4, () => { brLightning(brGiantDir(), 1.0, 0.8); SURF.giantShow = 1; }],
    [T.call - 0.1, () => { SURF.eyesOn = true; }],
    [T.call + 0.5, () => brLightning(brGiantDir(), 1.2, 0.6)],
    [T.call + 1.7, () => brLightning(brGiantDir(), 0.8, 0.9)],
    [T.call + 2.7, () => brLightning(brGiantDir(), 1.15, 0.5)],
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
// The one whose hand it is stands right over the hatch, up in the cloud - head, and the shoulder its arm comes
// down from, relative to the hatch. (The legs out in the haze are another one.)
const BR_GIANT = { head: [-70, 440, -280], shoulder: [-10, 330, -200] };
const _brG = new THREE.Vector3(), _brG2 = new THREE.Vector3(), _brA = new THREE.Vector3(), _brB = new THREE.Vector3(), _brQ = new THREE.Quaternion(), _brQ2 = new THREE.Quaternion();
function brSky(x, y, z) { return _brG.set(x, y, z).normalize(); }
function brGiantDir() { return _brG.set(SURF.ox + BR_GIANT.head[0], BR_GIANT.head[1], SURF.oz + BR_GIANT.head[2]).sub(R.camera.position).normalize(); }
function brShoulder(out) { return out.set(SURF.ox + BR_GIANT.shoulder[0], BR_GIANT.shoulder[1], SURF.oz + BR_GIANT.shoulder[2]); }
// a strike: two or three flickers and an afterglow, lighting the cloud from inside; the thunder after it
function brLightning(dir, power, thunder) {
  SURF.storm.flashDir.value.copy(dir);
  SURF.flashes.push({ t0: Cinema.t, p: power });
  (SURF.thunders || (SURF.thunders = [])).push({ at: Cinema.t + thunder, p: power, dir: dir.clone() });
}
function brStorm(dt, t, T, dk) {
  let f = 0;
  for (const L of SURF.flashes) {
    const a = T - L.t0; if (a < 0 || a > 1.4) continue;
    f = Math.max(f, L.p * (Math.exp(-a * 10) + (a > 0.09 ? 0.8 * Math.exp(-(a - 0.09) * 12) : 0) + (a > 0.24 ? 0.55 * Math.exp(-(a - 0.24) * 6) : 0)));
  }
  SURF.flashes = SURF.flashes.filter((L) => T - L.t0 < 1.4);
  SURF.flash = f; SURF.storm.flash.value = Math.min(1.7, f);
  for (const th of SURF.thunders || []) if (!th.done && T >= th.at) {
    th.done = true;
    Sound.play('thunder', { x: R.camera.position.x + th.dir.x * 300, y: R.camera.position.y + th.dir.y * 300, z: R.camera.position.z + th.dir.z * 300 });
    R.shake = Math.max(R.shake || 0, 0.25 + th.p * 0.45);
  }
  // the light of it, down here
  R.hemi.intensity += f * 1.4; R.key.intensity += f * 1.8e6; R.whiteFlash = Math.max(R.whiteFlash, f * 0.06);
  // what stands over the city, and its eyes
  SURF.storm.giant.value = damp(SURF.storm.giant.value, SURF.giantShow || 0, 2.5, dt);
  SURF.storm.eyes.value = damp(SURF.storm.eyes.value, SURF.eyesOn ? 1 : 0, 1.4, dt);
  SURF.storm.giantDir.value.copy(brGiantDir());
  SURF.skyM.uniforms.time.value = t; SURF.cloudM.uniforms.time.value = t; SURF.cloudM.uniforms.dim.value = lerp(1, 0.6, dk);
  // the city burning
  for (const F of SURF.fires) { const k = F.base * (0.72 + 0.28 * Math.sin(t * 6.3 + F.ph) * Math.sin(t * 2.7 + F.ph * 2.1)); F.s.material.opacity = k; F.s.scale.set(F.sc[0] * (0.92 + 0.1 * k), F.sc[1] * (0.88 + 0.16 * k), 1); }
}
// a point on the surface, relative to the hatch
function brSurf(x, y, z) { return { x: SURF.ox + x, y, z: SURF.oz + z }; }
function brToSurface() {
  Cinema.surface = true; Cinema.ca = -1;
  SURF.flashes = []; SURF.thunders = []; SURF.flash = 0; SURF.giantShow = 0; SURF.eyesOn = false;
  SURF.storm.flash.value = 0; SURF.storm.giant.value = 0; SURF.storm.eyes.value = 0; SURF.cloudM.uniforms.hole.value.set(0, 0, 0);
  SURF.arm.visible = false; SURF.vortex.visible = false; SURF.shock.visible = false; for (const d of SURF.dust) d.s.visible = false;
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
  // the moment its hand closes, everything slows almost to nothing - and then comes back all at once
  const slow = Cinema.surface ? 1 - 0.74 * smoothstep(BR_T.grab - 0.4, BR_T.grab - 0.08, Cinema.t) * (1 - smoothstep(BR_T.grab + 0.5, BR_T.grab + 1.0, Cinema.t)) : 1;
  dt *= slow;
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
  R.hemi.color.setHex(0xa89880); R.hemi.groundColor.setHex(0x40302a); R.hemi.intensity = lerp(0.85, 0.35, dk);
  R.key.color.setHex(0xe0a878); R.key.angle = 1.2; R.key.penumbra = 1; R.key.distance = 0; R.key.position.set(SURF.ox - 400, 300, SURF.oz - 900); R.key.target.position.set(SURF.ox, 0, SURF.oz); R.key.intensity = lerp(1.7e6, 0.45e6, dk);
  R.backlight.intensity = 0;
  SURF.skyM.uniforms.dim.value = lerp(1, 0.55, dk);
  R.scene.fog.color.setRGB(0.3 * (1 - dk * 0.4), 0.23 * (1 - dk * 0.4), 0.18 * (1 - dk * 0.4)); R.scene.fog.density = 0.0021 + dk * 0.0014; R.scene.background.copy(R.scene.fog.color);
  brStorm(dt, t, T, dk);
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
    // after it: up, slowly, at the shape the lightning shows standing over the city
    if (T > E.gone - 0.6) { const gd = brGiantDir(), gL = LK(eye.x + gd.x * 100, eye.y + gd.y * 100, eye.z + gd.z * 100), k2 = smooth01((T - E.gone + 0.6) / 2.6); A = [lerpAngle(A[0], gL[0], k2), lerp(A[1], gL[1] - 0.05, k2)]; }
  }
  Cinema.brYaw = Cinema.brYaw === undefined ? A[0] : dampAngle(Cinema.brYaw, A[0], T > E.shriek && T < E.shriek + 0.6 ? 9 : 3, dt);
  Cinema.brPitch = Cinema.brPitch === undefined ? A[1] : damp(Cinema.brPitch, A[1], 3, dt);
  cam.position.set(eye.x, eye.y + kick * 0.6, eye.z);
  cam.rotation.set(Cinema.brPitch + kick * 0.4 + Math.sin(t * 1.1) * 0.006, Cinema.brYaw + Math.sin(t * 0.7) * 0.008, 0);
  const fov = T > E.hand && T < E.gone ? 86 : T > E.call ? 50 : 66;
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
const _brHand = new THREE.Vector3(), _brFist = new THREE.Vector3(), _brE = new THREE.Euler();
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
  // The hand: down out of the cloud on the end of its arm, open, slowing as it comes; shut round it; back up the
  // way it came, and gone. The arm runs from it all the way up into the storm, through a hole the cloud turns
  // round; when it closes, the air it pushes down runs out across the ground in a ring of dust.
  const H = Colossus;
  const showArm = H.ready && T > E.hand - 0.1 && T < E.gone + 0.5;
  if (H.ready && T > E.hand - 0.1) {
    H.root.visible = T < E.gone + 0.5;
    const back = 1.6, tx = x - Math.sin(toCam0) * back, tz = z - Math.cos(toCam0) * back, ty = 2.6 + 8.2;
    // the line of its arm, from where the hand closes up to its shoulder
    const up = _brA.copy(brShoulder(_brB)).sub(_brG2.set(tx, ty, tz)).normalize();
    let along = 0, curl = 0.04, thumb = 0.05, wrist = 0.35;
    if (T < E.grab) {
      const u = clamp((T - E.hand) / (E.grab - E.hand), 0, 1), k = 1 - Math.pow(1 - u, 3);
      along = lerp((165 - ty) / Math.max(up.y, 0.2), 0, k); wrist = lerp(0.6, 0.35, k);
    } else {
      const k = smooth01((T - E.grab) / 0.28), lk = smooth01((T - E.lift) / (E.gone - E.lift));
      along = lk * lk * 230;
      curl = lerp(0.04, 0.93, k); thumb = lerp(0.05, 1.0, k); wrist = lerp(0.35, 0.12, k);
      H.gore = Math.min(1, H.gore + dt * 2);
    }
    H.root.position.set(tx + up.x * along, ty + up.y * along, tz + up.z * along);
    // turned to face round over it, and tipped back along the line of the arm
    _brQ.setFromEuler(_brE.set(0, toCam0 + Math.PI, 0)); _brQ2.setFromUnitVectors(_brB.set(0, 1, 0), up);
    H.root.quaternion.copy(_brQ2).multiply(_brQ);
    colossusPose(curl + (T > E.grab + 0.3 && T < E.lift + 0.4 ? Math.sin(T * 20) * 0.03 : 0), thumb, wrist);
    if (showArm) {
      // the rest of the arm, from the top of the forearm up to the shoulder
      const s0 = H.root.localToWorld(_brG2.set(0, 3.4, -0.3)), s1 = brShoulder(_brB), len = s0.distanceTo(s1);
      SURF.arm.visible = true;
      SURF.arm.position.copy(s0).add(s1).multiplyScalar(0.5);
      SURF.arm.scale.set(2.0 * 3.4 * 0.32, len, 2.0 * 3.4 * 0.32);
      SURF.arm.quaternion.setFromUnitVectors(_brG.set(0, 1, 0), _brHand.copy(s1).sub(s0).normalize());
      // where it comes through the cloud
      const kk = (150 - s0.y) / Math.max(0.05, s1.y - s0.y), cx = lerp(s0.x, s1.x, clamp(kk, 0, 1)), cz = lerp(s0.z, s1.z, clamp(kk, 0, 1));
      const open = smooth01((T - E.shadow + 0.3) / 1.2) * (1 - smooth01((T - E.gone + 0.3) / 0.9));
      SURF.cloudM.uniforms.hole.value.set(cx, cz, 34 * open);
      SURF.vortex.visible = open > 0.02;
      SURF.vortex.children.forEach((sp) => {
        const u = sp.userData, a = u.a + T * (0.35 + 0.15 * u.r), rr = (26 + 30 * u.r) * (0.6 + 0.4 * open);
        sp.position.set(cx + Math.cos(a) * rr, 150 + u.y * 60 - (1 - u.r) * 25 * open, cz + Math.sin(a) * rr);
        sp.scale.set(90 * u.s, 60 * u.s, 1); sp.material.opacity = 0.85 * open; sp.material.rotation = a;
      });
    }
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
  if (!showArm) { SURF.arm.visible = false; if (T > E.gone + 0.5) { SURF.vortex.visible = false; SURF.cloudM.uniforms.hole.value.set(0, 0, 0); } }
  // the blast of air as it closes: a ring of dust out across the ground, and the dust thrown up with it
  const bk = (T - E.grab + 0.05) / 1.9;
  SURF.shock.visible = bk > 0 && bk < 1;
  if (SURF.shock.visible) {
    const rr = lerp(3, 60, 1 - Math.pow(1 - bk, 2.2));
    SURF.shock.position.set(base.x, 0.15, base.z); SURF.shock.scale.set(rr * 2, 1, rr * 2); SURF.shock.material.opacity = 0.75 * (1 - bk);
  }
  for (const D of SURF.dust) {
    const on = bk > 0 && bk < 1.4; D.s.visible = on;
    if (!on) continue;
    const dd = D.v * Math.pow(bk, 0.6) * 2.4;
    D.s.position.set(base.x + Math.cos(D.a) * (2 + dd), 1.5 + bk * 4, base.z + Math.sin(D.a) * (2 + dd));
    const sc = 6 + bk * 18; D.s.scale.set(sc, sc * 0.7, 1); D.s.material.opacity = 0.6 * Math.min(1, bk * 6) * (1 - bk / 1.4);
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
  if (SURF.arm) { SURF.arm.visible = false; SURF.vortex.visible = false; SURF.shock.visible = false; for (const d of SURF.dust) d.s.visible = false; }
  setPaleVisible(false);
  if (SURF.saved) { WS.field.value = SURF.saved.f; WS.fieldXf.value.copy(SURF.saved.xf); SURF.saved = null; }
  Debris.free = false;
  Cinema.brYaw = undefined; Cinema.brPitch = undefined;
  applyRenderDistance();
}
