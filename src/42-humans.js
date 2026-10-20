// ================= people: teammates in coveralls and helmets, and your own hands =================
// A teammate is an invisible rig of groups (hips, torso, legs, arms, head) that the walk cycle turns, plus one skinned
// coverall mesh stretched over it, so hips, knees and elbows bend as cloth instead of as separate parts. Boots, gloves,
// the helmet, the pack and the torch ride rigidly on the rig.
const HUMAN_LEG = { thigh: 0.43, shin: 0.41, foot: 0.075 };
const H_FRONT_UP = Math.PI / 2, H_FRONT_DOWN = Math.PI * 1.5; // where "front" is around a chain that runs up / down the body
const hwin = (s, a, b, e = 0.012) => smoothstep(a - e, a + e, s) * (1 - smoothstep(b - e, b + e, s));
const hmx = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const hemiGeo = (r, seg = 18) => cachedGeo('hemi' + r + ',' + seg, () => new THREE.SphereGeometry(r, seg, Math.ceil(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2));

let _suitMat = null;
function suitMaterial() {
  if (_suitMat) return _suitMat;
  const m = mat('fabric', { color: 0x2b313d }).clone();
  m.skinning = true; m.vertexColors = true;
  worldShader(m, { ao: 0.4, grime: 0, wet: 0 });
  _suitMat = m;
  return m;
}

// the coverall: torso, two legs, two arms, tinted with belt, harness, reflective tape and the team colour
function buildSuit(color) {
  const tc = new THREE.Color(color), base = [0.17, 0.19, 0.24];
  const team = [tc.r / base[0], tc.g / base[1], tc.b / base[2]];
  const TAPE = [7.5, 6.8, 5.6], STRAP = [0.32, 0.3, 0.28], DIRT = [0.82, 0.8, 0.76];
  const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  // the coverall is your colour - a little dulled by wear - with the dark navy of the original in a chest band
  // and on the shoulders, so the colour reads as a choice and not a costume
  const SUIT = mixc(team, [1, 1, 1], 0.2), NAVY = [1, 1, 1];
  const FU = H_FRONT_UP, BU = H_FRONT_UP + Math.PI, FD = H_FRONT_DOWN;
  const torso = {
    lens: [0.3, 0.32, 0.12], seg: 18, density: 26, blend: 0.08, texM: 0.5,
    radius: profile([[0, 0.09, 0.075], [0.05, 0.15, 0.11], [0.1, 0.19, 0.125], [0.17, 0.19, 0.124], [0.25, 0.164, 0.113], [0.3, 0.155, 0.108], [0.39, 0.16, 0.114],
      [0.48, 0.171, 0.122], [0.56, 0.182, 0.128], [0.6, 0.184, 0.118], [0.63, 0.135, 0.092], [0.655, 0.075, 0.068], [0.69, 0.058, 0.056], [0.74, 0.056, 0.055]]),
    detail: (th, s) => {
      let d = 0;
      d -= 0.022 * gauss(angDist(th, FU), 0.05) * hwin(s, 0.33, 0.63);                                               // zip
      d += 0.05 * (gauss(angDist(th, FU + 0.62), 0.2) + gauss(angDist(th, FU - 0.62), 0.2)) * hwin(s, 0.46, 0.55);   // chest pockets
      d += 0.03 * hwin(s, 0.285, 0.32, 0.006);                                                                       // belt
      d += 0.02 * (gauss(angDist(th, FU + 0.42), 0.09) + gauss(angDist(th, FU - 0.42), 0.09) + gauss(angDist(th, BU + 0.38), 0.09) + gauss(angDist(th, BU - 0.38), 0.09)) * hwin(s, 0.32, 0.62); // harness
      d += 0.2 * hwin(s, 0.63, 0.67, 0.008) * (0.55 + 0.45 * gauss(angDist(th, BU), 1.3));                          // collar
      d += 0.016 * Math.sin(th * 7) * gauss(s - 0.35, 0.025);                                                       // folds at the waist
      return d;
    },
    tint: (s, th) => {
      let c = SUIT.slice();
      c = mixc(c, STRAP, hwin(s, 0.285, 0.32, 0.004));
      const harness = Math.max(gauss(angDist(th, FU + 0.42), 0.075), gauss(angDist(th, FU - 0.42), 0.075), gauss(angDist(th, BU + 0.38), 0.075), gauss(angDist(th, BU - 0.38), 0.075)) * hwin(s, 0.32, 0.62, 0.004);
      c = mixc(c, STRAP, harness);
      c = mixc(c, TAPE, hwin(s, 0.405, 0.43, 0.003) * (1 - harness));
      c = mixc(c, NAVY, hwin(s, 0.565, 0.6, 0.003) * (1 - harness));
      return c;
    },
  };
  const leg = (side) => {
    const out = side > 0 ? 0 : Math.PI;
    return {
      lens: [HUMAN_LEG.thigh, HUMAN_LEG.shin], seg: 16, density: 26, blend: 0.07, texM: 0.5,
      radius: profile([[0, 0.09, 0.095], [0.12, 0.094, 0.099], [0.3, 0.085, 0.088], [0.4, 0.075, 0.078], [0.45, 0.072, 0.076], [0.55, 0.073, 0.078],
        [0.68, 0.066, 0.07], [0.78, 0.068, 0.07], [0.84, 0.058, 0.06]]),
      detail: (th, s) => 0.075 * gauss(angDist(th, out), 0.45) * hwin(s, 0.17, 0.31, 0.04) - 0.01 * gauss(angDist(th, out), 0.06)
        + 0.022 * Math.sin(th * 5 + s * 40) * gauss(s - 0.44, 0.05) + 0.05 * Math.max(0, Math.sin(th * 4 + 1.3)) * gauss(s - 0.78, 0.03),
      tint: (s, th) => {
        let c = SUIT.slice();
        c = mixc(c, DIRT, 0.7 * gauss(angDist(th, FD), 0.9) * gauss(s - 0.45, 0.06) + 0.6 * smoothstep(0.62, 0.84, s));
        c = mixc(c, TAPE, hwin(s, 0.6, 0.625, 0.003));
        return c;
      },
    };
  };
  const arm = (side) => {
    const out = side > 0 ? 0 : Math.PI;
    return {
      lens: [0.29, 0.26], seg: 14, density: 30, blend: 0.06, texM: 0.5,
      radius: profile([[0, 0.07, 0.072], [0.07, 0.066, 0.07], [0.18, 0.058, 0.061], [0.27, 0.05, 0.053], [0.3, 0.049, 0.051], [0.38, 0.052, 0.049],
        [0.48, 0.045, 0.041], [0.51, 0.049, 0.047], [0.55, 0.04, 0.036]]),
      detail: (th, s) => 0.026 * Math.sin(th * 4 + s * 50) * gauss(s - 0.3, 0.04) + 0.03 * gauss(angDist(th, out), 0.5) * hwin(s, 0.06, 0.15, 0.01),
      tint: (s, th) => {
        let c = SUIT.slice();
        c = mixc(c, NAVY, gauss(angDist(th, out), 0.55) * hwin(s, 0.06, 0.15, 0.004));
        c = mixc(c, TAPE, hwin(s, 0.21, 0.232, 0.003));
        return c;
      },
    };
  };
  return skinnedBody([torso, leg(1), leg(-1), arm(1), arm(-1)], [suitMaterial()]);
}

// rigid gear, built once per kind
function bootGeo(part) {
  return cachedGeo('hboot-' + part, () => {
    const B = new Batch(), m = plainMat(0xffffff);
    if (part === 'upper') {
      B.add(m, cylGeo(0.057, 0.062, 0.12, 16), hmx(0, 0.012, -0.004));
      B.add(m, cboxGeo(0.1, 0.075, 0.2, 0.032), hmx(0, -0.034, 0.05));
      B.add(m, hemiGeo(0.05), hmx(0, -0.06, 0.128, 0, 0, 0, 1.02, 0.85, 1.3));
      B.add(m, cboxGeo(0.092, 0.06, 0.08, 0.025), hmx(0, -0.044, -0.036));
    } else if (part === 'sole') {
      B.add(m, cboxGeo(0.11, 0.022, 0.3, 0.008), hmx(0, -0.064, 0.05));
      B.add(m, cboxGeo(0.104, 0.012, 0.09, 0.004), hmx(0, -0.072, -0.045));
    } else {
      for (let k = 0; k < 3; k++) B.add(m, cboxGeo(0.062, 0.006, 0.009, 0.002), hmx(0, 0.007, 0.07 + k * 0.026, -0.1));
    }
    return mergeBatchGeo(B);
  });
}
// a hand hanging along -y, palm toward the body; side +1 = left
function gloveGeo(side, grip) {
  return cachedGeo('hglove' + side + grip, () => {
    const B = new Batch(), m = plainMat(0xffffff), s = side;
    B.add(m, cylGeo(0.044, 0.048, 0.06, 14), hmx(0, -0.262, 0));
    if (grip) {
      // a fist around the torch body
      B.add(m, cboxGeo(0.07, 0.085, 0.088, 0.03), hmx(0, -0.31, 0.0));
      for (let i = 0; i < 4; i++) B.add(m, sphereGeo(0.0145, 10, 8), hmx(s * 0.03, -0.29 - i * 0.019, 0.034));
      B.add(m, cylGeo(0.012, 0.0125, 0.055, 8), hmx(-s * 0.026, -0.305, 0.03, 0.2, 0, -s * 0.2));
    } else {
      B.add(m, cboxGeo(0.034, 0.095, 0.082, 0.015), hmx(0, -0.33, 0.003));
      [0.027, 0.009, -0.009, -0.027].forEach((z, i) => {
        const len = [0.046, 0.05, 0.048, 0.04][i];
        B.add(m, cylGeo(0.0098, 0.0102, len, 8), hmx(-s * 0.006, -0.378 - len / 2, z, 0, 0, s * 0.22));
        B.add(m, cylGeo(0.0088, 0.0094, 0.034, 8), hmx(-s * 0.019, -0.378 - len - 0.014, z, 0, 0, s * 0.75));
        B.add(m, sphereGeo(0.009, 8, 6), hmx(-s * 0.03, -0.378 - len - 0.027, z));
      });
      B.add(m, cylGeo(0.0115, 0.0125, 0.05, 8), hmx(-s * 0.022, -0.334, 0.046, 0.55, 0, s * 0.35));
      B.add(m, sphereGeo(0.0115, 8, 6), hmx(-s * 0.03, -0.355, 0.06));
    }
    return mergeBatchGeo(B);
  });
}
// one geometry out of a batch that used a single placeholder material
function mergeBatchGeo(B) {
  const g = new THREE.BufferGeometry(), b = [...B.groups.values()][0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
  B.groups.clear();
  return g;
}

function makeHuman(color, name) {
  const leather = plainMat(0x261d16, { roughness: 0.48 }), sole = plainMat(0x0b0b0b, { roughness: 0.9 });
  const glove = mat('fabric', { color: 0x1c1c1e }), hood = mat('fabric', { color: 0x17181a });
  const pack = mat('fabric', { color: 0x1d2229 }), dark = plainMat(0x121315, { roughness: 0.5, metalness: 0.3 });
  const strap = plainMat(0x1c1a17, { roughness: 0.65 }), pad = plainMat(0x15161a, { roughness: 0.45, metalness: 0.1 });
  const helmetM = plainMat(color, { roughness: 0.3, metalness: 0.05 }), visor = plainMat(0x07090c, { roughness: 0.04, metalness: 0.75 });
  const root = new THREE.Group();
  const M = (geo, m, parent, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };
  const G = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  // the rig
  const hips = G(root, 0, HUMAN_LEG.thigh + HUMAN_LEG.shin + HUMAN_LEG.foot + 0.01, 0);
  const torso = G(hips, 0, 0.06, 0);
  const headG = G(torso, 0, 0.5, 0);
  const mk = { crotch: G(hips, 0, -0.12, 0), waist: G(torso, 0, 0.12, 0), shoulders: G(torso, 0, 0.44, 0), headBase: G(headG, 0, 0.06, 0) };
  const legs = [], arms = [];
  for (const s2 of [1, -1]) {
    const lg = G(hips, s2 * 0.095, 0, 0), knee = G(lg, 0, -HUMAN_LEG.thigh, 0), ankle = G(knee, 0, -HUMAN_LEG.shin, 0);
    M(bootGeo('upper'), leather, ankle); M(bootGeo('sole'), sole, ankle); M(bootGeo('laces'), dark, ankle).position.set(0, -0.0, 0.0);
    M(cboxGeo(0.1, 0.115, 0.034, 0.015), pad, knee, 0, -0.025, 0.083);
    M(cboxGeo(0.11, 0.022, 0.01, 0.004), strap, knee, 0, -0.035, 0.07).scale.set(1.05, 1, 4);
    legs.push({ g: lg, knee, ankle, s: s2, boot: ankle.children[0] });
    const ag = G(torso, s2 * 0.18, 0.44, 0), elbow = G(ag, 0, -0.29, 0), wrist = G(elbow, 0, -0.26, 0);
    M(sphereGeo(0.066, 14, 10), mat('fabric', { color: 0x2b313d }), ag, 0, 0.004, 0).scale.set(1, 0.9, 1.04);
    M(gloveGeo(s2, s2 < 0), glove, elbow);
    arms.push({ g: ag, elbow, wrist, s: s2 });
  }
  // the suit over the rig
  const suit = buildSuit(color);
  root.add(suit.mesh); suit.bones.forEach((b) => root.add(b));
  // pack, radio, chest light and the LED that shows where a teammate is from behind
  M(cboxGeo(0.27, 0.32, 0.11, 0.03), pack, torso, 0, 0.3, -0.19);
  M(cboxGeo(0.22, 0.09, 0.09, 0.02), pack, torso, 0, 0.1, -0.17);
  M(cboxGeo(0.29, 0.035, 0.12, 0.008), strap, torso, 0, 0.42, -0.19);
  M(cylGeo(0.004, 0.006, 0.3, 6), dark, torso, 0.1, 0.6, -0.2);
  M(boxGeo(0.02, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xff2a1a }), torso, 0.08, 0.36, -0.248);
  M(cboxGeo(0.06, 0.08, 0.035, 0.01), dark, torso, -0.09, 0.4, 0.128);
  M(cboxGeo(0.05, 0.05, 0.03, 0.01), dark, torso, 0.1, 0.33, 0.13);
  // head: hood, face shield, hard hat with a ridge and a lamp, ear defenders
  M(cylGeo(0.05, 0.056, 0.1, 12), hood, headG, 0, 0.06, -0.01);
  M(sphereGeo(0.095, 20, 16), hood, headG, 0, 0.155, 0).scale.set(0.95, 1.12, 1.05);
  M(cachedGeo('hshield', () => new THREE.SphereGeometry(0.118, 26, 12, Math.PI / 2 - 1.05, 2.1, 0.98, 1.08)), visor, headG, 0, 0.16, 0.012).scale.set(1, 1, 1.06);
  M(hemiGeo(0.128, 28), helmetM, headG, 0, 0.2, -0.005).scale.set(1, 0.95, 1.12);
  M(cylGeo(0.142, 0.147, 0.012, 28), helmetM, headG, 0, 0.2, 0.004).scale.set(1, 1, 1.14);
  M(cboxGeo(0.17, 0.01, 0.065, 0.004), helmetM, headG, 0, 0.197, 0.155).rotation.x = 0.14;
  const ridge = M(torusGeo(0.128, 0.0085, 6, 28, Math.PI), helmetM, headG, 0, 0.2, -0.005); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1.12, 0.95, 1);
  M(cboxGeo(0.062, 0.036, 0.03, 0.009), dark, headG, 0, 0.268, 0.138).rotation.x = -0.32;
  const lamp = M(cylGeo(0.017, 0.017, 0.006, 14), new THREE.MeshBasicMaterial({ color: 0xfff4d8 }), headG, 0, 0.271, 0.155); lamp.rotation.x = Math.PI / 2 - 0.32;
  for (const s2 of [1, -1]) { M(cylGeo(0.046, 0.046, 0.034, 16), dark, headG, s2 * 0.108, 0.165, -0.004).rotation.z = Math.PI / 2; M(cylGeo(0.03, 0.03, 0.012, 14), helmetM, headG, s2 * 0.127, 0.165, -0.004).rotation.z = Math.PI / 2; }
  // the torch in the right fist, with a faint beam you can see in the dust
  const torch = new THREE.Group(); torch.position.set(0, -0.31, 0.0); arms[1].elbow.add(torch);
  M(cylGeo(0.022, 0.028, 0.22, 12), dark, torch, 0, 0, 0.06).rotation.x = Math.PI / 2;
  const beam = new THREE.Mesh(cachedGeo('beamCone2', () => { const g = new THREE.ConeGeometry(1.6, 8, 20, 1, true); g.translate(0, -4, 0); g.rotateX(Math.PI / 2); g.rotateX(Math.PI); return g; }), beamMaterial());
  beam.position.set(0, 0, 0.17); beam.renderOrder = 2; torch.add(beam);
  // name tag
  const tagTex = canvasTex(256, 64, (g, w, h) => { g.font = '700 34px "Martian Mono", monospace'; g.textAlign = 'center'; g.fillStyle = color; g.fillText(String(name).slice(0, 14), w / 2, 42); });
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, transparent: true, depthWrite: false, opacity: 0.85 }));
  tag.scale.set(0.8, 0.2, 1); tag.position.y = 2.0; root.add(tag);
  const h = { root, hips, torso, headG, legs, arms, torch, beam, tag, phase: 0, crouch: 0, color, name, lamp, suit, mk };
  poseSuit(h);
  return h;
}

// lay the suit's bones along the rig: each bone runs joint to joint, twisted to the body part's own side axis
const _hInv = new THREE.Matrix4(), _hA = new THREE.Vector3(), _hB = new THREE.Vector3(), _hX = new THREE.Vector3(), _hT = new THREE.Vector3();
function poseSuit(h) {
  const S = h.suit; if (!S) return;
  h.root.updateMatrixWorld(true);
  _hInv.copy(h.root.matrixWorld).invert();
  const at = (o, v) => v.setFromMatrixPosition(o.matrixWorld).applyMatrix4(_hInv);
  const side = (o, v) => v.setFromMatrixColumn(o.matrixWorld, 0).transformDirection(_hInv);
  const bone = (chain, k, a, b, ref) => { const B = S.bones[S.chainBones[chain][k]]; setBone(B, at(a, _hA), at(b, _hB), ref, S.lens[chain][k]); };
  side(h.hips, _hX); side(h.torso, _hT);
  bone(0, 0, h.mk.crotch, h.mk.waist, _hX);
  bone(0, 1, h.mk.waist, h.mk.shoulders, _hT);
  bone(0, 2, h.mk.shoulders, h.mk.headBase, _hT);
  h.legs.forEach((l, i) => { bone(1 + i, 0, l.g, l.knee, _hX); bone(1 + i, 1, l.knee, l.ankle, _hX); });
  h.arms.forEach((a, i) => { bone(3 + i, 0, a.g, a.elbow, _hT); bone(3 + i, 1, a.elbow, a.wrist, _hT); });
}

let _beamMat = null;
function beamMaterial() {
  if (_beamMat) return _beamMat;
  _beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { strength: { value: 0.05 } },
    vertexShader: 'varying float vL; varying vec3 vN; varying vec3 vV; void main(){ vL = clamp(position.z / 8.0, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float strength; varying float vL; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = strength * edge * (1.0 - vL) * (1.0 - vL) * smoothstep(0.0, 0.05, vL); gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a, 1.0); }',
  });
  return _beamMat;
}

// speed in m/s, pitch in radians, crouch 0..1
// The walk cycle advances with distance covered, so the planted foot doesn't skate; the hips sit exactly as high as the
// lower foot allows, rolling and twisting over the stance leg while the shoulders counter-rotate and the free arm swings.
function animateHuman(h, dt, speed, pitch, crouch, flashOn, t) {
  h.crouch = damp(h.crouch, crouch, 8, dt);
  const moving = clamp(speed / 0.7, 0, 1), sprint = clamp((speed - 2.8) / 2.2, 0, 1), cr = h.crouch;
  h.mv = damp(h.mv || 0, moving, 6, dt);
  const mv = h.mv;
  const stride = lerp(1.3, 2.7, sprint) * (1 - cr * 0.4);
  h.phase += dt * Math.min(speed, 7) / stride * Math.PI * 2;
  // a heel strike every half cycle: the caller plays the footstep
  const half = Math.floor((h.phase + Math.PI / 2) / Math.PI);
  h.footfall = speed > 0.3 && half !== h.lastHalf; h.lastHalf = half;
  const hipAmp = lerp(0.42, 0.78, sprint) * mv * (1 - cr * 0.35);
  const kAmp = lerp(1.0, 1.95, sprint), k0 = lerp(0.1, 0.32, sprint);
  let dropMax = 0;
  const poses = h.legs.map((l) => {
    const q = h.phase + (l.s > 0 ? 0 : Math.PI);
    const swingFwd = Math.cos(q) > 0 ? 1 : 0;
    const a = hipAmp * Math.sin(q) + cr * 0.95;                                   // thigh, forward from vertical
    const k = mv * (k0 + kAmp * Math.pow(Math.max(0, Math.cos(q + 0.35)), 1.4)) * (1 - cr * 0.3) + cr * 1.55; // knee bend
    const b = a - k;                                                              // shin, from vertical
    const drop = HUMAN_LEG.thigh * Math.cos(a) + HUMAN_LEG.shin * Math.cos(b) + HUMAN_LEG.foot;
    dropMax = Math.max(dropMax, drop);
    return { l, q, a, k, b, swingFwd };
  });
  // the lower foot is on the floor; sprinting adds a little flight between strides
  const flight = sprint * 0.05 * Math.max(0, Math.sin(2 * h.phase));
  h.hips.position.y = dropMax + flight + 0.01;
  const qL = h.phase;
  h.hips.rotation.set(0, -0.1 * Math.sin(qL) * mv, 0.045 * Math.cos(qL) * mv + (speed < 0.1 ? Math.sin(t * 0.55) * 0.02 : 0));
  poses.forEach(({ l, q, a, k, b }) => {
    l.g.rotation.set(-a, 0, -h.hips.rotation.z);
    l.knee.rotation.x = k;
    // flat on the ground in stance; toes hang in early swing, come up before the heel lands
    const toe = mv * (0.35 * Math.max(0, Math.sin(q + 1.9)) - 0.15 * Math.max(0, Math.sin(q - 0.3)));
    l.ankle.rotation.x = b + toe - cr * 0.15;
  });
  const lean = 0.05 + sprint * 0.3 + cr * 0.32 + mv * 0.04;
  const breathe = Math.sin(t * (1.5 + sprint * 2.5)) * (0.012 + sprint * 0.02);
  h.torso.rotation.set(lean + breathe, 0.13 * Math.sin(qL) * mv, -h.hips.rotation.z * 0.6);
  // the head stays level and looks where the player looks
  h.headG.rotation.set(clamp(-pitch - lean, -0.9, 0.9) - breathe, -h.torso.rotation.y - h.hips.rotation.y + (speed < 0.1 ? Math.sin(t * 0.37) * 0.15 : 0), 0);
  // free arm swings against its leg and pumps when sprinting
  const armSwing = lerp(0.38, 0.85, sprint) * mv;
  h.arms[0].g.rotation.set(armSwing * Math.sin(qL) + breathe, 0, 0.08 + sprint * 0.1);
  h.arms[0].elbow.rotation.x = -(0.22 + 0.25 * mv + sprint * 1.05 + Math.max(0, -Math.sin(qL)) * 0.35 * mv);
  // the torch arm aims where the player looks, riding the steps a little
  h.arms[1].g.rotation.set(-1.45 - pitch - lean + Math.sin(2 * qL) * 0.03 * mv + breathe, 0, -0.06);
  h.arms[1].elbow.rotation.x = -0.1 - sprint * 0.25;
  h.torch.rotation.x = Math.PI / 2;
  h.beam.visible = !!flashOn;
  h.lamp.material.color.setHex(flashOn ? 0xfff4d8 : 0x222222);
  poseSuit(h);
}

// ---------- first-person hands ----------
// A cylinder (or tapered limb) between two points, as a mesh.
function segMesh(a, b, r0, r1, m, seg = 10) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const mesh = new THREE.Mesh(cylGeo(r1, r0, len, seg), m);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}
function buildViewModel() {
  const g = new THREE.Group();
  g.position.set(0.2, -0.24, -0.36);
  const anod = plainMat(0x141518, { roughness: 0.34, metalness: 0.7, ws: false });
  const anodD = plainMat(0x0d0e10, { roughness: 0.55, metalness: 0.5, ws: false });
  const steel = plainMat(0x9a9da2, { roughness: 0.22, metalness: 1, ws: false });
  const rubber = plainMat(0x0a0a0b, { roughness: 0.92, ws: false });
  const glove = mat('fabric', { color: 0x2a2c30, ws: false });
  const leather = plainMat(0x1e1d1c, { roughness: 0.6, ws: false });
  const sleeve = mat('fabric', { color: 0x3a4250, ws: false }).clone();
  // the flashlight: tail cap, knurled body, flared head, bezel and lens
  const torch = new THREE.Group(); torch.position.set(0, 0.02, 0.06); g.add(torch);
  const prof = [[0.0, -0.002], [0.011, -0.002], [0.0165, 0.004], [0.0175, 0.02], [0.0158, 0.024], [0.0158, 0.118], [0.0172, 0.124], [0.0238, 0.156], [0.0258, 0.17], [0.0262, 0.198], [0.0252, 0.203], [0.0212, 0.203], [0.0205, 0.2], [0.009, 0.19], [0.0, 0.189]];
  const lat = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
  lat.rotateX(-Math.PI / 2); lat.computeVertexNormals();
  torch.add(new THREE.Mesh(lat, anod));
  for (let i = 0; i < 9; i++) { const k = new THREE.Mesh(torusGeo(0.0159, 0.0012, 4, 24), anodD); k.position.z = -0.04 - i * 0.008; torch.add(k); }
  const bez = new THREE.Mesh(torusGeo(0.0244, 0.0022, 6, 28), steel); bez.position.z = -0.2025; torch.add(bez);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const c = new THREE.Mesh(cboxGeo(0.008, 0.005, 0.006, 0.0015), steel); c.position.set(Math.cos(a) * 0.0245, Math.sin(a) * 0.0245, -0.206); c.rotation.z = a; torch.add(c); }
  const reflector = new THREE.Mesh(cylGeo(0.0205, 0.006, 0.012, 24, 1, true), plainMat(0xd8d8d8, { roughness: 0.08, metalness: 1, side: THREE.DoubleSide, ws: false }));
  reflector.rotation.x = -Math.PI / 2; reflector.position.z = -0.194; torch.add(reflector);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff3e0, emissiveIntensity: 6, roughness: 0.1 });
  const lens = new THREE.Mesh(cylGeo(0.0205, 0.0205, 0.002, 24), lensMat); lens.rotation.x = Math.PI / 2; lens.position.z = -0.2; torch.add(lens);
  const tail = new THREE.Mesh(cylGeo(0.008, 0.009, 0.006, 16), rubber); tail.rotation.x = Math.PI / 2; tail.position.z = 0.004; torch.add(tail);
  const clip = new THREE.Mesh(cboxGeo(0.006, 0.0025, 0.07, 0.001), steel); clip.position.set(-0.016, 0.004, -0.03); clip.rotation.z = 0.3; torch.add(clip);
  // the hand wrapped around it
  const hand = new THREE.Group(); hand.position.set(0, 0.02, 0.06); g.add(hand);
  for (let i = 0; i < 4; i++) {
    const r = 0.0255 - i * 0.0006, tube = 0.0098 - i * 0.0007;
    const f = new THREE.Mesh(torusGeo(r, tube, 8, 20, 3.9), glove);
    f.position.z = -0.012 - i * 0.0215; f.rotation.z = 2.1 + i * 0.05; hand.add(f);
    const tip = new THREE.Mesh(sphereGeo(tube * 1.02, 10, 8), glove);
    const a = 2.1 + i * 0.05 + 3.9; tip.position.set(Math.cos(a) * r, Math.sin(a) * r, f.position.z); hand.add(tip);
    const knuck = new THREE.Mesh(sphereGeo(tube * 1.15, 10, 8), glove);
    knuck.position.set(Math.cos(2.1 + i * 0.05) * r, Math.sin(2.1 + i * 0.05) * r, f.position.z); hand.add(knuck);
  }
  const palm = new THREE.Mesh(cboxGeo(0.034, 0.08, 0.095, 0.012), glove); palm.position.set(0.03, -0.012, -0.045); palm.rotation.set(0, 0.08, 0.35); hand.add(palm);
  const back = new THREE.Mesh(cboxGeo(0.06, 0.03, 0.09, 0.012), glove); back.position.set(0.018, 0.03, -0.045); back.rotation.set(0.05, 0.05, -0.55); hand.add(back);
  hand.add(segMesh(new THREE.Vector3(0.028, 0.024, 0.0), new THREE.Vector3(0.006, 0.03, -0.045), 0.011, 0.0095, glove));
  hand.add(segMesh(new THREE.Vector3(0.006, 0.03, -0.045), new THREE.Vector3(-0.004, 0.027, -0.07), 0.0095, 0.0085, glove));
  const thumbTip = new THREE.Mesh(sphereGeo(0.0088, 10, 8), glove); thumbTip.position.set(-0.004, 0.027, -0.07); hand.add(thumbTip);
  const strap = new THREE.Mesh(cboxGeo(0.064, 0.012, 0.03, 0.004), leather); strap.position.set(0.035, 0.0, 0.0); strap.rotation.z = 0.2; hand.add(strap);
  // wrist and sleeve run off the bottom of the screen
  g.add(segMesh(new THREE.Vector3(0.04, 0.0, 0.07), new THREE.Vector3(0.075, -0.05, 0.2), 0.03, 0.034, glove, 14));
  const cuff = new THREE.Mesh(torusGeo(0.038, 0.012, 8, 20), sleeve); cuff.position.set(0.075, -0.05, 0.2); cuff.lookAt(0.11, -0.1, 0.32); g.add(cuff);
  g.add(segMesh(new THREE.Vector3(0.075, -0.05, 0.2), new THREE.Vector3(0.13, -0.13, 0.48), 0.04, 0.05, sleeve, 14));
  // the other hand: whatever is in the slot you have picked, held the way you would hold it. Each one is placed
  // by the direction it should point in the view, then a gloved fist is closed round it.
  const left = new THREE.Group(); left.position.set(-0.42, -0.02, -0.02); g.add(left);
  const items = {};
  const aim = (obj, up, toward) => {
    const Y = new THREE.Vector3(...up).normalize(), f = new THREE.Vector3(...toward);
    const Z = f.addScaledVector(Y, -f.dot(Y)).normalize(), X = new THREE.Vector3().crossVectors(Y, Z).normalize();
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  };
  const arm = (it, from, to) => it.add(segMesh(new THREE.Vector3(...from), new THREE.Vector3(...to), 0.031, 0.044, sleeve, 14));
  // crowbar: gripped low on the shaft, rising up and away to the left of centre, the claw turned forward
  {
    const it = new THREE.Group(), bar = crowbarModel();
    bar.position.set(0, 0.12, 0);
    const hand = gripHand(glove, 0.0135); hand.rotation.set(Math.PI / 2, 0, -0.4);
    const holder = new THREE.Group(); holder.add(bar, hand);
    aim(holder, [0.25, 0.75, -0.6], [0, 0, -1]);
    it.add(holder);
    arm(it, [0.0, -0.02, 0.03], [-0.06, -0.2, 0.28]);
    it.position.set(-0.07, -0.02, -0.08);
    items.crowbar = it;
  }
  // keycard: pinched at its lower edge, face toward you, tipped a little
  {
    const it = new THREE.Group(), card = keycardModel(0);
    const cardG = new THREE.Group(); card.rotation.set(Math.PI / 2, 0, 0); cardG.add(card); cardG.rotation.set(-0.25, 0.35, 0.28); cardG.position.set(0.0, 0.05, 0.0);
    it.add(cardG); it.userData.card = card;
    const fist = gripHand(glove, 0.008); fist.rotation.set(0.2, 1.2, 0.5); fist.position.set(-0.01, -0.005, 0.01); it.add(fist);
    arm(it, [-0.01, -0.03, 0.03], [-0.07, -0.2, 0.28]);
    it.position.set(0.02, 0.045, -0.03);
    items.keycard = it;
  }
  // fuse: held up between the fingers
  {
    const it = new THREE.Group(), fz = fuseModel();
    fz.scale.setScalar(0.55); fz.rotation.set(0.3, 0.5, 0.35); fz.position.set(0.0, 0.035, 0.0); it.add(fz);
    const fist = gripHand(glove, 0.02); fist.rotation.set(Math.PI / 2 - 0.2, 0, 0.6); it.add(fist);
    arm(it, [0.0, -0.03, 0.03], [-0.06, -0.2, 0.28]);
    it.position.set(0.02, 0.03, -0.03);
    items.fuse = it;
  }
  // a power cell: heavy, carried by the handle, hanging at the bottom of the view
  {
    const it = new THREE.Group(), cell = cellModel();
    cell.position.set(0, -0.2, 0); cell.rotation.set(0.1, 0.5, 0.05); it.add(cell);
    const fist = gripHand(glove, 0.014); fist.rotation.set(0, Math.PI / 2 + 0.5, 0); it.add(fist);
    arm(it, [0.0, 0.0, 0.03], [-0.03, 0.06, 0.3]);
    it.position.set(0.04, 0.08, -0.1);
    items.cell = it;
  }
  for (const k in items) { items[k].visible = false; left.add(items[k]); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  R.vmScene.add(g);
  return { group: g, lens, lensMat, left, items, bob: 0, sleeve, held: '' };
}

// a gloved hand closed round a bar of radius r running along its local z
function gripHand(glove, r) {
  const hand = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const rr = r + 0.0095 - i * 0.0004, tube = 0.0098 - i * 0.0007;
    const f = new THREE.Mesh(torusGeo(rr, tube, 8, 18, 3.7), glove);
    f.position.z = 0.03 - i * 0.0205; f.rotation.z = 2.2 + i * 0.05; hand.add(f);
    const a = 2.2 + i * 0.05 + 3.7, tip = new THREE.Mesh(sphereGeo(tube * 1.02, 10, 8), glove); tip.position.set(Math.cos(a) * rr, Math.sin(a) * rr, f.position.z); hand.add(tip);
    const k = new THREE.Mesh(sphereGeo(tube * 1.15, 10, 8), glove); k.position.set(Math.cos(2.2 + i * 0.05) * rr, Math.sin(2.2 + i * 0.05) * rr, f.position.z); hand.add(k);
  }
  const palm = new THREE.Mesh(cboxGeo(0.034, 0.075, 0.09, 0.012), glove); palm.position.set(r + 0.016, -0.004, 0.0); palm.rotation.set(0, 0, 0.3); hand.add(palm);
  const back = new THREE.Mesh(cboxGeo(0.05, 0.028, 0.088, 0.012), glove); back.position.set(-0.004, r + 0.012, 0.0); back.rotation.set(0, 0, -0.35); hand.add(back);
  hand.add(segMesh(new THREE.Vector3(r + 0.012, r * 0.6 + 0.012, 0.04), new THREE.Vector3(-r * 0.3, r + 0.014, 0.06), 0.011, 0.0095, glove));
  const tt = new THREE.Mesh(sphereGeo(0.009, 10, 8), glove); tt.position.set(-r * 0.3, r + 0.014, 0.06); hand.add(tt);
  return hand;
}

// ---------- the things you carry: one model each, for the floor and for your hand ----------
// A real wrecking bar: a hexagonal steel shaft in chipped red enamel, a gooseneck at one end with a split claw,
// a flattened chisel at the other, bare steel where the paint has worn through.
function crowbarModel() {
  const g = new THREE.Group();
  const red = plainMat(0x8e1a12, { roughness: 0.38, metalness: 0.45, ws: false });
  const bare = plainMat(0x8a8d92, { roughness: 0.28, metalness: 1, ws: false });
  const pts = [[0, -0.3, 0], [0, -0.1, 0], [0, 0.1, 0], [0, 0.27, 0]];
  for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 0.97; pts.push([0, 0.27 + Math.sin(a) * 0.058, 0.058 - Math.cos(a) * 0.058]); }
  pts.push([0, 0.245, 0.118]);
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
  g.add(new THREE.Mesh(cachedGeo('crowbarTube', () => new THREE.TubeGeometry(curve, 64, 0.0125, 6, false)), red));
  // worn bands where hands and the work have taken the paint off
  for (const y of [-0.285, -0.255, 0.255]) { const b = new THREE.Mesh(cylGeo(0.0129, 0.0129, y > 0 ? 0.03 : 0.022, 6), bare); b.position.y = y; g.add(b); }
  // chisel: bent a few degrees and hammered flat to an edge
  const ch = new THREE.Mesh(cboxGeo(0.026, 0.075, 0.008, 0.003), bare); ch.position.set(0, -0.33, 0.007); ch.rotation.x = 0.22; g.add(ch);
  const edge = new THREE.Mesh(cboxGeo(0.028, 0.012, 0.004, 0.0015), bare); edge.position.set(0, -0.368, 0.016); edge.rotation.x = 0.22; g.add(edge);
  // the claw: two flattened prongs with a V between them
  for (const s of [-1, 1]) { const p = new THREE.Mesh(cboxGeo(0.011, 0.055, 0.007, 0.002), bare); p.position.set(s * 0.0075, 0.225, 0.121); p.rotation.set(0.28, 0, s * 0.09); g.add(p); }
  return g;
}
function keycardModel(area) {
  const g = new THREE.Group();
  const tex = canvasTex(256, 162, (c, w, h) => {
    c.fillStyle = '#e8e4da'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8402f'; c.fillRect(0, 0, w, 34);
    c.fillStyle = '#f4efe4'; c.font = '700 20px monospace'; c.fillText('SECTOR ACCESS', 12, 24);
    c.fillStyle = '#5a5e64'; c.fillRect(14, 48, 62, 76);
    c.fillStyle = '#8a8e94'; c.beginPath(); c.arc(45, 74, 16, 0, 6.28); c.fill(); c.fillRect(25, 96, 40, 28);
    c.fillStyle = '#1a1a1a'; c.font = '900 42px sans-serif'; c.fillText('B-' + String(area + 1).padStart(2, '0'), 92, 92);
    c.font = '400 13px monospace'; c.fillText('MAINTENANCE / LEVEL 4', 92, 116);
    for (let i = 0; i < 40; i++) c.fillRect(92 + i * 4, 128, (i * 7) % 3 + 1, 22);
    c.fillStyle = '#c9c4b8'; c.beginPath(); c.arc(w - 18, 18, 7, 0, 6.28); c.fill();
  });
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32 });
  const body = new THREE.Mesh(boxGeo(0.086, 0.0012, 0.054), plainMat(0xe8e4da, { roughness: 0.4, ws: false })); g.add(body);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.086, 0.054), face); top.rotation.x = -Math.PI / 2; top.position.y = 0.00065; g.add(top);
  return g;
}
function fuseModel() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(cylGeo(0.03, 0.03, 0.115, 16), plainMat(0xe8a33a, { emissive: 0x8a5a0a, roughness: 0.15, ws: false })); glass.rotation.z = Math.PI / 2; g.add(glass);
  const wire = new THREE.Mesh(cylGeo(0.003, 0.003, 0.11, 6), plainMat(0xfff0c0, { emissive: 0xffb040, ws: false })); wire.rotation.z = Math.PI / 2; g.add(wire);
  const brass = plainMat(0xb08a3a, { roughness: 0.3, metalness: 1, ws: false });
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(cylGeo(0.034, 0.034, 0.026, 16), brass); cap.rotation.z = Math.PI / 2; cap.position.x = s * 0.07; g.add(cap);
    for (let k = 0; k < 3; k++) { const ring = new THREE.Mesh(torusGeo(0.034, 0.0018, 4, 16), brass); ring.rotation.y = Math.PI / 2; ring.position.x = s * (0.061 + k * 0.008); g.add(ring); }
    const tag = new THREE.Mesh(cboxGeo(0.03, 0.004, 0.024, 0.001), brass); tag.position.x = s * 0.094; g.add(tag);
  }
  return g;
}
function cellModel() {
  const g = new THREE.Group();
  const shell = plainMat(0x2a3036, { roughness: 0.45, metalness: 0.6, ws: false }), edge = plainMat(0x9aa0a4, { roughness: 0.3, metalness: 1, ws: false });
  g.add(new THREE.Mesh(cboxGeo(0.22, 0.3, 0.16, 0.02), shell));
  for (const s of [-1, 1]) { const r = new THREE.Mesh(cboxGeo(0.226, 0.025, 0.166, 0.006), edge); r.position.y = s * 0.11; g.add(r); }
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshStandardMaterial({ map: signTexture(['POWER CELL', '48V  DC'], { bg: '#e2ad3b', fg: '#141414', sizes: [44, 36] }), roughness: 0.6 }));
  label.position.set(0, 0.0, 0.0805); g.add(label);
  const lamp = new THREE.Mesh(boxGeo(0.03, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0x3cff7a })); lamp.position.set(0.07, 0.12, 0.081); g.add(lamp);
  // the carrying handle
  for (const s of [-1, 1]) { const post = new THREE.Mesh(cylGeo(0.008, 0.008, 0.05, 8), edge); post.position.set(s * 0.06, 0.175, 0); g.add(post); }
  const bar = new THREE.Mesh(cylGeo(0.013, 0.013, 0.14, 10), plainMat(0x111214, { roughness: 0.8, ws: false })); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.2, 0); g.add(bar);
  for (const s of [-1, 1]) { const t = new THREE.Mesh(cylGeo(0.012, 0.012, 0.012, 10), edge); t.position.set(s * 0.05, 0.155, 0); g.add(t); }
  return g;
}
