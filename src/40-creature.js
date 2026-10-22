// ================= the creature: a towering skinned body that folds itself into the corridors =================
// Everything is three times the size of a tall man. Standing, it is about nine metres; in a corridor it crawls with
// its spine following the path it took, knees jammed against the ceiling, hands braced on the walls.
const UP = new THREE.Vector3(0, 1, 0), YAXIS = new THREE.Vector3(0, 1, 0);
const crV = () => new THREE.Vector3();
const cA = crV(), cB = crV(), cC = crV(), cD = crV(), cE = crV(), cF = crV(), cG = crV(), cH = crV();
const cX = crV(), cY = crV(), cZ = crV(), cM = new THREE.Matrix4();

// A small solid limb used for props and cutscene bits (the finger in the lift hatch)
function limbGeo(len, r0, r1, bulge = 1.25, seg = 9) {
  return cachedGeo('limb' + [len, r0, r1, bulge, seg].join(','), () => {
    const pts = [];
    const N = 10;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let r = lerp(r0, r1, t);
      r *= 1 + (bulge - 1) * Math.sin(Math.PI * Math.min(1, t * 1.4)) * (t < 0.75 ? 1 : 0.5);
      r *= 1 + 0.18 * Math.exp(-Math.pow((t - 0.92) / 0.06, 2));
      if (i === 0 || i === N) r *= 0.75;
      pts.push(new THREE.Vector2(Math.max(0.004, r), t * len));
    }
    const g = new THREE.LatheGeometry(pts, seg);
    g.computeVertexNormals();
    return g;
  });
}

// piecewise profile: [[s, rx, rz], ...] -> radius at s, eased between keys
function profile(keys) {
  return (s) => {
    if (s <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) {
      if (s <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i], t = smooth01((s - a[0]) / (b[0] - a[0]));
        return [lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      }
    }
    const l = keys[keys.length - 1]; return [l[1], l[2]];
  };
}
const gauss = (x, w) => Math.exp(-(x * x) / (w * w));
const angDist = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ---------- a skinned body from tube chains: one SkinnedMesh, one bone per segment, smooth joints ----------
// chain: { lens, radius(s) -> [rx, rz], detail(theta, s) -> extra, seg, density, blend, texM, cap: 'round' | 'nail', nail }
function skinnedBody(chains, mats) {
  const pos = [], uv = [], si = [], sw = [], idx0 = [], idx1 = [], col = [];
  let tintFn = null;
  const pushC = (s, th) => { const c = tintFn ? tintFn(s, th) : null; if (c) col.push(c[0], c[1], c[2]); else col.push(1, 1, 1); };
  const bones = [], inv = [], chainBones = [];
  const pushW = (w) => {
    w.sort((a, b) => b[1] - a[1]);
    const t = w.reduce((s, x) => s + x[1], 0) || 1;
    for (let k = 0; k < 4; k++) { si.push(w[k] ? w[k][0] : 0); sw.push(w[k] ? w[k][1] / t : 0); }
  };
  for (const ch of chains) {
    tintFn = ch.tint || null;
    const myBones = [], starts = [];
    let Y = 0;
    for (const len of ch.lens) { starts.push(Y); const b = new THREE.Bone(); bones.push(b); myBones.push(bones.length - 1); inv.push(new THREE.Matrix4().makeTranslation(0, -Y, 0)); Y += len; }
    chainBones.push(myBones);
    const total = Y, seg = ch.seg, h = ch.blend;
    const S = new Set();
    const n = Math.max(2, Math.ceil(total * ch.density));
    for (let i = 0; i <= n; i++) S.add(+(total * i / n).toFixed(4));
    for (let k = 1; k < ch.lens.length; k++) for (const o of [-0.6, -0.3, 0, 0.3, 0.6]) { const s = starts[k] + o * h; if (s > 0 && s < total) S.add(+s.toFixed(4)); }
    const st = [...S].sort((a, b) => a - b);
    const weightsAt = (s) => {
      let k = 0; while (k < ch.lens.length - 1 && s >= starts[k + 1]) k++;
      const res = [[myBones[k], 1]];
      const ds = s - starts[k], de = starts[k] + ch.lens[k] - s;
      if (k > 0 && ds < h) { const w = 0.5 * (1 - ds / h); res[0][1] -= w; res.push([myBones[k - 1], w]); }
      if (k < ch.lens.length - 1 && de < h) { const w = 0.5 * (1 - de / h); res[0][1] -= w; res.push([myBones[k + 1], w]); }
      return res;
    };
    const base = pos.length / 3;
    st.forEach((s) => {
      const [rx, rz] = ch.radius(s);
      const w = weightsAt(s), circ = Math.PI * (rx + rz);
      for (let j = 0; j <= seg; j++) {
        const th = j / seg * Math.PI * 2, d = 1 + (ch.detail ? ch.detail(th, s) : 0);
        pos.push(Math.cos(th) * rx * d, s, Math.sin(th) * rz * d);
        uv.push(j / seg * circ / ch.texM, s / ch.texM);
        pushW(w.map((x) => x.slice())); pushC(s, th);
      }
    });
    for (let r = 0; r < st.length - 1; r++) for (let j = 0; j < seg; j++) {
      const a = base + r * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1;
      idx0.push(a, c, b, b, c, d);
    }
    // start cap
    const c0 = pos.length / 3; pos.push(0, -0.01, 0); uv.push(0, 0); pushW(weightsAt(0)); pushC(0, 0);
    for (let j = 0; j < seg; j++) idx0.push(c0, base + j, base + j + 1);
    // end: a rounded cap, or a curved nail (claw) on its own material
    const last = base + (st.length - 1) * (seg + 1), [erx, erz] = ch.radius(total);
    if (ch.cap === 'nail') {
      const nl = ch.nail || 0.15, rings = 5, nb = pos.length / 3, w = [[myBones[myBones.length - 1], 1]];
      for (let r = 0; r <= rings; r++) {
        const t = r / rings, rad = (1 - t * 0.92), yy = total + t * nl, bend = t * t * nl * 0.45;
        for (let j = 0; j <= seg; j++) { const th = j / seg * Math.PI * 2; pos.push(Math.cos(th) * erx * rad * 0.95, yy, Math.sin(th) * erz * rad * 0.7 + bend); uv.push(j / seg, t); pushW(w.map((x) => x.slice())); col.push(1, 1, 1); }
      }
      for (let j = 0; j < seg; j++) { idx0.push(last + j, nb + j, last + j + 1, last + j + 1, nb + j, nb + j + 1); }
      for (let r = 0; r < rings; r++) for (let j = 0; j < seg; j++) { const a = nb + r * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1; idx1.push(a, c, b, b, c, d); }
      const tip = pos.length / 3; pos.push(0, total + nl * 1.04, nl * 0.47); uv.push(0, 1); pushW(w); col.push(1, 1, 1);
      const lr = nb + rings * (seg + 1);
      for (let j = 0; j < seg; j++) idx1.push(tip, lr + j + 1, lr + j);
    } else {
      const rings = 3, nb = pos.length / 3, w = [[myBones[myBones.length - 1], 1]];
      for (let r = 1; r <= rings; r++) {
        const t = r / (rings + 1), k = Math.cos(t * Math.PI / 2), yy = total + Math.sin(t * Math.PI / 2) * Math.min(erx, erz) * 0.8;
        for (let j = 0; j <= seg; j++) { const th = j / seg * Math.PI * 2; pos.push(Math.cos(th) * erx * k, yy, Math.sin(th) * erz * k); uv.push(j / seg, total / ch.texM); pushW(w.map((x) => x.slice())); pushC(total, th); }
      }
      let prev = last;
      for (let r = 0; r < rings; r++) { const cur = nb + r * (seg + 1); for (let j = 0; j < seg; j++) idx0.push(prev + j, cur + j, prev + j + 1, prev + j + 1, cur + j, cur + j + 1); prev = cur; }
      const tip = pos.length / 3; pos.push(0, total + Math.min(erx, erz) * 0.85, 0); uv.push(0, 0); pushW(w); pushC(total, 0);
      for (let j = 0; j < seg; j++) idx0.push(tip, prev + j + 1, prev + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx0.concat(idx1));
  g.addGroup(0, idx0.length, 0);
  if (idx1.length) g.addGroup(idx0.length, idx1.length, 1);
  g.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(g, mats);
  mesh.bind(new THREE.Skeleton(bones, inv), new THREE.Matrix4());
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  return { mesh, bones, chainBones, lens: chains.map((c) => c.lens) };
}

// put a bone at a with its length along a->b; ref chooses the twist (its side axis). sx and sz squeeze
// the flesh across the bone - width and depth - for when the space it is in is smaller than it is.
function setBone(bone, a, b, ref, bindLen, sx = 1, sz = 1) {
  cY.subVectors(b, a);
  const len = cY.length();
  // a bone with no length - a fingertip folded right back onto its knuckle against a wall - collapses where
  // it is. Skipping it would leave it wherever it was last frame, which at a run is metres away.
  if (len < 1e-5) { bone.position.copy(a); bone.scale.set(sx, bindLen ? 1e-4 : 1, sz); return; }
  cY.multiplyScalar(1 / len);
  cX.copy(ref).addScaledVector(cY, -ref.dot(cY));
  if (cX.lengthSq() < 1e-4) { cX.set(1, 0, 0).addScaledVector(cY, -cY.x); if (cX.lengthSq() < 1e-4) cX.set(0, 0, 1).addScaledVector(cY, -cY.z); }
  cX.normalize(); cZ.crossVectors(cX, cY);
  cM.makeBasis(cX, cY, cZ);
  bone.quaternion.setFromRotationMatrix(cM);
  bone.position.copy(a);
  bone.scale.set(sx, bindLen ? len / bindLen : 1, sz);
}

// the skin: baked texture, plus a faint wet sheen and blood-under-skin when the light passes through thin parts
function creatureSkin(skinned, vcol) {
  const base = mat('skin');
  const m = base.clone();
  m.color = new THREE.Color(0xa89e90);
  m.vertexColors = !!vcol;
  m.roughness = 1; m.metalness = 1;
  m.normalScale = new THREE.Vector2(1.2, 1.2);
  m.skinning = !!skinned;
  // where the skin folds hard on itself - the inside of a bent waist, a knee jammed to the chest - the inner face
  // shows as skin, never as a hole through the body
  m.side = THREE.DoubleSide;
  m.userData.wAmt = new THREE.Vector3(0.5, 0, 0);
  m.onBeforeCompile = (sh) => {
    wsPatch(sh, m, (s) => {
      s.fragmentShader = s.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        // light bleeding through thin skin: a little red where the surface turns away from the viewer
        float thin = pow(max(0.0, 1.0 - abs(dot(normal, normalize(vViewPosition)))), 2.0);
        reflectedLight.directDiffuse += reflectedLight.directDiffuse * vec3(0.55, 0.12, 0.08) * thin;`);
    });
  };
  m.customProgramCacheKey = () => 'creature-skin-3';
  return m;
}

const Creature = {
  ready: false,
  pos: new THREE.Vector3(), yaw: 0, speed: 0, mode: 'hidden', jaw: 0, scream: 0, u: 0, ceilS: 3, gait: 0,
  look: new THREE.Vector3(), reach: new THREE.Vector3(), events: [], trail: [], headPos: new THREE.Vector3(), headFwd: new THREE.Vector3(0, 0, 1),
  twitch: { t: 0, x: 0, y: 0, z: 0, next: 1 }, jerk: 0, override: null,
  phase: 0, strideK: 1, vel: new THREE.Vector3(), velS: new THREE.Vector3(), gaitW: null,
};

// ---------- building it ----------
const SPINE_LENS = [0.75, 0.55, 0.55, 0.65, 0.6, 0.5, 0.5, 0.45];
const LEG_LENS = [2.4, 2.6, 1.0, 0.5];
const ARM_L = [2.2, 2.4, 0.55], ARM_R = [2.5, 2.7, 2.3, 0.65];
// The reaching hand is the part of it most people ever see, and they see it close. It gets fingers
// long enough to cross a bed, and joints that read as bone pushing out through the skin.
const FINGERS_L = [0.42, 0.34, 0.26], FINGERS_R = [0.74, 0.6, 0.47];

function buildCreature(scene) {
  const C = Creature;
  const skin = creatureSkin(true, true), skinHead = creatureSkin(false);
  const nail = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.25, metalness: 0, skinning: true, side: THREE.DoubleSide });
  const tooth = plainMat(0x8c7d5e, { roughness: 0.3, ws: false }), gum = plainMat(0x2a0907, { roughness: 0.22, ws: false });
  C.skin = skinHead;
  C.meshes = [];
  C.rig = new THREE.Group(); scene.add(C.rig);
  const addBody = (b) => { scene.add(b.mesh); b.bones.forEach((bn) => C.rig.add(bn)); C.meshes.push(b.mesh); return b; };

  // spine: pelvis, waist, ribcage, shoulders, neck
  const spineR = profile([[0, 0.18, 0.15], [0.12, 0.45, 0.36], [0.4, 0.7, 0.5], [0.7, 0.56, 0.44], [1.0, 0.38, 0.33], [1.5, 0.36, 0.32], [1.85, 0.55, 0.46], [2.2, 0.78, 0.6], [2.6, 0.86, 0.62], [2.92, 0.92, 0.5], [3.12, 0.44, 0.36], [3.3, 0.26, 0.26], [3.9, 0.22, 0.23], [4.4, 0.24, 0.25], [4.55, 0.16, 0.16]]);
  const BACK = Math.PI * 1.5, FRONT = Math.PI * 0.5;
  const spineDetail = (th, s) => {
    let d = 0;
    const sn = Math.sin(th), back = gauss(angDist(th, BACK), 0.24);
    if (s > 1.85 && s < 2.95) { // ribs wrap the sides and front; hollows between them
      const k = (s - 1.85) / 0.16, rib = Math.pow(0.5 + 0.5 * Math.cos(k * Math.PI * 2), 3) - 0.32;
      d += 0.07 * rib * smoothstep(-0.95, -0.55, sn) * smoothstep(1.85, 2.0, s) * (1 - smoothstep(2.8, 2.95, s));
      d += 0.05 * gauss(angDist(th, FRONT), 0.14) * (1 - smoothstep(2.75, 2.95, s));
    }
    if (s > 0.08 && s < 4.35) d += 0.11 * back * (0.55 + 0.45 * Math.pow(0.5 + 0.5 * Math.cos(s / 0.21 * Math.PI * 2), 2)) * (s > 3.1 ? 0.6 : 1);
    if (s > 0.22 && s < 0.68) d += 0.08 * Math.pow(Math.abs(Math.cos(th)), 6) * Math.sin((s - 0.22) / 0.46 * Math.PI);
    if (s > 2.55 && s < 3.02) d += 0.09 * (gauss(angDist(th, BACK - 0.75), 0.35) + gauss(angDist(th, BACK + 0.75), 0.35)) * Math.sin((s - 2.55) / 0.47 * Math.PI);
    if (s > 0.95 && s < 1.75) d -= 0.1 * gauss(angDist(th, FRONT), 0.6) * Math.sin((s - 0.95) / 0.8 * Math.PI);
    if (s > 3.2 && s < 4.3) d += 0.07 * (gauss(angDist(th, FRONT - 0.55), 0.2) + gauss(angDist(th, FRONT + 0.55), 0.2));
    if (s > 2.78 && s < 3.15) d += 0.12 * (gauss(angDist(th, FRONT - 0.9), 0.3) + gauss(angDist(th, FRONT + 0.9), 0.3)) * Math.sin((s - 2.78) / 0.37 * Math.PI); // collarbones
    if (s > 2.7 && s < 3.12) d += 0.16 * (gauss(angDist(th, 0), 0.4) + gauss(angDist(th, Math.PI), 0.4)) * Math.sin((s - 2.7) / 0.42 * Math.PI); // shoulder knobs
    return d;
  };
  const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const DIRT = [0.5, 0.42, 0.36], BLOOD = [0.42, 0.14, 0.11], BRUISE = [0.7, 0.6, 0.68];
  const spineTint = (s2, th) => {
    let c = [1, 1, 1];
    c = mixc(c, DIRT, 0.55 * smoothstep(0.9, 0.0, s2));
    c = mixc(c, BRUISE, 0.5 * gauss(angDist(th, FRONT), 0.7) * gauss(s2 - 1.3, 0.35));
    c = mixc(c, BLOOD, 0.55 * gauss(angDist(th, FRONT), 0.5) * smoothstep(3.6, 4.5, s2));
    return c;
  };
  C.spine = addBody(skinnedBody([{ lens: SPINE_LENS, radius: spineR, detail: spineDetail, seg: 30, density: 15, blend: 0.18, texM: 1.1, tint: spineTint }], [skin]));

  // legs: thigh, shin, foot, toes with a claw
  const legR = profile([[0, 0.42, 0.42], [0.3, 0.38, 0.4], [1.2, 0.29, 0.32], [2.1, 0.2, 0.22], [2.4, 0.27, 0.26], [2.65, 0.2, 0.21], [3.4, 0.19, 0.2], [4.7, 0.12, 0.125], [5.0, 0.16, 0.14], [5.2, 0.135, 0.11], [5.85, 0.12, 0.08], [6.0, 0.11, 0.07], [6.5, 0.055, 0.045]]);
  const legDetail = (th, s) => {
    let d = 0;
    if (s > 2.62 && s < 4.8) d += 0.18 * gauss(angDist(th, FRONT), 0.18) * Math.sin((s - 2.62) / 2.18 * Math.PI); // shin bone ridge
    if (s > 2.2 && s < 2.65) d += 0.32 * gauss(angDist(th, FRONT), 0.55) * Math.sin((s - 2.2) / 0.45 * Math.PI); // knee cap
    if (s > 0.3 && s < 2.1) d += 0.06 * gauss(angDist(th, 0.4), 0.3) - 0.05 * gauss(angDist(th, Math.PI), 0.5); // wasted thigh
    if (s > 4.6 && s < 5.6) d += 0.12 * gauss(angDist(th, BACK), 0.25); // achilles
    return d;
  };
  C.legs = [1, -1].map((side) => {
    const legTint = (s2, th) => mixc(mixc([1, 1, 1], DIRT, 0.75 * smoothstep(4.4, 5.6, s2)), BRUISE, 0.4 * gauss(s2 - 2.4, 0.2));
    const b = addBody(skinnedBody([{ lens: LEG_LENS, radius: legR, detail: legDetail, seg: 18, density: 8, blend: 0.16, texM: 1.1, cap: 'nail', nail: 0.28, tint: legTint }], [skin, nail]));
    return { side, body: b, plant: crV(), from: crV(), to: crV(), step: 1, mid: crV(), ank: crV(), ball: crV(), lastY: 0 };
  });

  // arms with hands and long fingers; the right arm has an extra joint
  const armR = (lens, scale) => {
    const L0 = lens.slice(0, -1).reduce((a, b) => a + b, 0), palm = lens[lens.length - 1];
    const keys = [[0, 0.21 * scale, 0.21 * scale], [0.4, 0.17 * scale, 0.16 * scale], [lens[0] * 0.8, 0.115 * scale, 0.115 * scale], [lens[0], 0.135 * scale, 0.125 * scale], [lens[0] + 0.25, 0.11 * scale, 0.1 * scale]];
    if (lens.length === 4) keys.push([lens[0] + lens[1] * 0.85, 0.09 * scale, 0.085 * scale], [lens[0] + lens[1], 0.115 * scale, 0.1 * scale], [lens[0] + lens[1] + 0.25, 0.09 * scale, 0.08 * scale]);
    keys.push([L0 - 0.15, 0.062 * scale, 0.05 * scale], [L0, 0.07 * scale, 0.045], [L0 + palm * 0.35, 0.12 * scale, 0.045], [L0 + palm, 0.13 * scale, 0.04]);
    return profile(keys);
  };
  const armDetail = (lens) => (th, s) => {
    let d = 0;
    let acc = 0;
    for (let k = 0; k < lens.length - 2; k++) { acc += lens[k]; if (Math.abs(s - acc) < 0.22) d += 0.24 * gauss(angDist(th, FRONT), 0.45) * gauss(s - acc, 0.11); }
    if (s > 0.3 && s < lens[0] - 0.2) d += 0.07 * gauss(angDist(th, BACK), 0.4);
    return d;
  };
  // gnarl: 0 is an ordinary long finger, 1 is the reaching hand - starved shafts between knuckles that
  // stand proud of them, a tendon running the length of the back, and a nail that has kept growing.
  const fingerChain = (lens, r, nailLen, gnarl = 0) => {
    const j1 = lens[0], j2 = lens[0] + lens[1], tot = j2 + lens[2];
    const thin = lerp(0.8, 0.52, gnarl), knuck = lerp(0.95, 1.22, gnarl), thin2 = lerp(0.68, 0.44, gnarl), knuck2 = lerp(0.8, 1.04, gnarl);
    return {
      lens, seg: 10, density: 26 + Math.round(gnarl * 10), blend: 0.05, texM: 0.6, cap: 'nail', nail: nailLen,
      tint: (s2) => mixc(mixc([1, 1, 1], DIRT, 0.75), BLOOD, 0.75 * smoothstep(tot * 0.55, tot, s2)),
      radius: profile([[0, r, r * 0.9], [j1 - 0.02, r * thin, r * (thin - 0.05)], [j1, r * knuck, r * (knuck - 0.1)],
        [j2 - 0.02, r * thin2, r * (thin2 - 0.04)], [j2, r * knuck2, r * (knuck2 - 0.08)], [tot, r * 0.55, r * 0.5]]),
      detail: (th, s) => {
        let d = (0.12 + gnarl * 0.3) * gauss(angDist(th, BACK), 0.6) * (gauss(s - j1, 0.03) + gauss(s - j2, 0.025));
        if (gnarl > 0) {
          // the tendon, standing up along the back of the finger the whole way
          d += gnarl * 0.07 * gauss(angDist(th, BACK), 0.26) * smoothstep(0, 0.12, s) * smoothstep(tot, tot - 0.3, s);
          // and the creases where it folds
          d -= gnarl * 0.09 * gauss(angDist(th, FRONT), 0.5) * (gauss(s - j1, 0.022) + gauss(s - j2, 0.02));
        }
        return d;
      },
    };
  };
  C.arms = [
    { side: 1, lens: ARM_L, flen: FINGERS_L, fr: 0.034 },
    { side: -1, lens: ARM_R, flen: FINGERS_R, fr: 0.04 },
  ].map((A) => {
    const L0 = A.lens.slice(0, -1).reduce((a, b) => a + b, 0);
    const armTint = (s2) => mixc(mixc([1, 1, 1], DIRT, 0.7 * smoothstep(L0 - 0.9, L0 + 0.2, s2)), BLOOD, 0.35 * smoothstep(L0, L0 + 0.5, s2));
    const chains = [{ lens: A.lens, radius: armR(A.lens, A.side < 0 ? 1.75 : 1.55), detail: armDetail(A.lens), seg: 20, density: 8, blend: 0.2, texM: 1.0, tint: armTint }];
    for (let f = 0; f < 5; f++) {
      const k = f === 0 ? 0.75 : f === 2 ? 1.08 : f === 4 ? 0.85 : 1;
      chains.push(fingerChain(A.flen.map((x) => x * k), A.fr * (f === 0 ? 1.15 : 1), A.side < 0 ? 0.34 : 0.16, A.side < 0 ? 1 : 0));
    }
    const body = addBody(skinnedBody(chains, [skin, nail]));
    const joints = A.lens.slice(0, -1).map(() => crV()); joints.push(crV());
    return Object.assign(A, { body, joints, plant: crV(), from: crV(), to: crV(), step: 1, onWall: false, wallN: crV(), surfN: crV(0, 1, 0), initd: false, palmEnd: crV(),
      nail: A.side < 0 ? 0.34 : 0.16 });
  });

  buildHead(scene, skinHead, tooth, gum, nail);
  // how thick every bone actually is, measured once off the finished meshes
  C.spineEx = boneExtents(C.spine.mesh);
  for (const leg of C.legs) leg.ex = boneExtents(leg.body.mesh);
  for (const arm of C.arms) arm.ex = boneExtents(arm.body.mesh);
  // and points on the head's real surface - the outermost vertex of every part of it in 26 directions -
  // so the skull, the jaw and the teeth are kept off the walls as they actually are, open or shut
  C.headPts = [];
  C.boneCrackT = new Float32Array(8);
  C.head.updateMatrixWorld(true);
  const dirs26 = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if (x || y || z) dirs26.push(new THREE.Vector3(x, y, z).normalize());
  const strings = new Set((C.strings || []).map((s) => s.m));
  C.head.traverse((o) => {
    if (!o.isMesh || strings.has(o) || !o.geometry || !o.geometry.attributes.position) return;
    o.geometry.computeBoundingSphere();
    if (o.geometry.boundingSphere.radius < 0.035) return;
    const P = o.geometry.attributes.position, v = new THREE.Vector3(), seen = new Set();
    for (const d of dirs26) {
      let best = -Infinity, bi = 0;
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const s = v.dot(d); if (s > best) { best = s; bi = i; } }
      if (!seen.has(bi)) { seen.add(bi); C.headPts.push({ m: o, p: new THREE.Vector3().fromBufferAttribute(P, bi) }); }
    }
  });
  C.ready = true;
  setCreatureVisible(false);
}

// ---------- the head: a long face, deep sockets, no nose, a jaw that drops to the chest ----------
function buildHead(scene, skin, tooth, gum, nail) {
  const C = Creature;
  C.head = new THREE.Group(); scene.add(C.head);
  const H = new THREE.Group(); H.position.set(0, 0.34, 0.3); C.head.add(H);
  const headSkin = creatureSkin(false, true);
  // [x, y, z, radius x, y, z, amount, darken]
  const feats = [
    [0, 0.13, 0.33, 0.2, 0.045, 0.09, 0.045, 0],          // brow ridge
    [0.115, 0.03, 0.31, 0.075, 0.08, 0.1, -0.13, 0.92], [-0.115, 0.03, 0.31, 0.075, 0.08, 0.1, -0.13, 0.92], // sockets
    [0.2, -0.07, 0.24, 0.09, 0.06, 0.09, 0.05, 0], [-0.2, -0.07, 0.24, 0.09, 0.06, 0.09, 0.05, 0],          // cheekbones
    [0.17, -0.2, 0.21, 0.08, 0.09, 0.1, -0.065, 0.25], [-0.17, -0.2, 0.21, 0.08, 0.09, 0.1, -0.065, 0.25],  // hollow cheeks
    [0, -0.03, 0.33, 0.035, 0.06, 0.05, 0.015, 0],          // what is left of a nose bridge
    [0.032, -0.12, 0.33, 0.016, 0.03, 0.05, -0.05, 0.85], [-0.032, -0.12, 0.33, 0.016, 0.03, 0.05, -0.05, 0.85], // slits
    [0.28, 0.02, -0.03, 0.1, 0.12, 0.12, -0.04, 0.1], [-0.28, 0.02, -0.03, 0.1, 0.12, 0.12, -0.04, 0.1],  // temples
    [0.0, 0.45, -0.12, 0.2, 0.15, 0.2, 0.04, 0], [0.16, 0.3, -0.32, 0.12, 0.12, 0.12, 0.035, 0], [-0.19, 0.34, -0.36, 0.12, 0.1, 0.12, 0.045, 0], // lumps
    [0.0, 0.2, -0.5, 0.06, 0.25, 0.08, 0.04, 0],            // a ridge down the back of the skull
  ];
  const skull = cachedGeo('skull3', () => {
    const g = new THREE.SphereGeometry(1, 84, 64);
    const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), r = mulberry32(42);
    for (let i = 0; i < n; i++) {
      let x = p.getX(i) * 0.31, y = p.getY(i) * 0.5, z = p.getZ(i) * 0.4;
      if (z < 0) { z *= 1.38; y += 0.1 * Math.min(1, -z / 0.5); }
      if (y < 0) x *= 1 - 0.22 * Math.min(1, -y / 0.5);
      if (z > 0.2) z = 0.2 + (z - 0.2) * 0.62;
      if (y < -0.31 && z > -0.12) y = -0.31 + (y + 0.31) * 0.18;
      const len = Math.hypot(x, y, z) || 1, nx = x / len, ny = y / len, nz = z / len;
      let d = 0, dark = 0;
      for (const [bx, by, bz, rx, ry, rz, amt, dk] of feats) {
        const w = Math.exp(-(((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2 + ((z - bz) / rz) ** 2));
        d += amt * w; dark = Math.max(dark, dk * w);
      }
      d += 0.004 * Math.sin(x * 70 + r()) * Math.cos(y * 50) + 0.003 * (r() - 0.5);
      // the roof of the mouth and the lip line are dark and wet
      if (y < -0.29 && z > 0) dark = Math.max(dark, 0.85 * Math.min(1, (-0.29 - y) / 0.02));
      dark = Math.max(dark, 0.45 * Math.exp(-(((y + 0.3) / 0.025) ** 2)) * smoothstep(0.05, 0.2, z));
      p.setXYZ(i, x + nx * d, y + ny * d, z + nz * d);
      const c = 1 - dark;
      col[i * 3] = c * (dark > 0.5 ? 0.75 : 1); col[i * 3 + 1] = c * (dark > 0.5 ? 0.45 : 1); col[i * 3 + 2] = c * (dark > 0.5 ? 0.42 : 1);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  });
  const sk = new THREE.Mesh(skull, headSkin); sk.castShadow = true; sk.receiveShadow = true; H.add(sk);
  // small wet eyes sunk to the bottom of each socket, throwing the flashlight back
  C.eyeMat = new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 0.04, metalness: 0.3, emissive: 0xd8ffcc, emissiveIntensity: 0 });
  const sp = skull.attributes.position;
  for (const s of [1, -1]) {
    let zmax = -1, ex = s * 0.115, ey = 0.03;
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i); if (z > 0 && Math.abs(x - ex) < 0.018 && Math.abs(y - ey) < 0.018 && z > zmax) zmax = z; }
    const eye = new THREE.Mesh(sphereGeo(0.019, 14, 12), C.eyeMat); eye.position.set(ex, ey, zmax - 0.01); H.add(eye);
  }
  // inside the mouth: a dark throat hidden behind the palate until the jaw drops
  const throat = new THREE.Mesh(sphereGeo(0.18, 20, 14), gum); throat.position.set(0, -0.36, 0.0); throat.scale.set(0.95, 0.5, 1.2); H.add(throat);
  const teethGeo = cachedGeo('ctooth', () => new THREE.ConeGeometry(0.013, 0.11, 6).translate(0, -0.055, 0));
  const incisor = cachedGeo('cincisor', () => cboxGeo(0.028, 0.06, 0.012, 0.004).clone().translate(0, -0.03, 0));
  const arc = (B, n, rx, rz, y, z0, row, down) => {
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 2.7;
      const front = Math.abs(a) < 0.32 && row === 0;
      const len = front ? 1 : 0.7 + ((i * 7919) % 13) / 13 * 0.95;
      B.add(tooth, front ? incisor : teethGeo, xform(Math.sin(a) * rx, y, z0 + Math.cos(a) * rz, a, down ? 0 : Math.PI, ((i * 31) % 7 - 3) * 0.05, 1, len * (row ? 0.65 : 1), 1));
    }
  };
  const upper = new Batch();
  arc(upper, 20, 0.2, 0.2, -0.305, 0.06, 0, true);
  arc(upper, 16, 0.16, 0.16, -0.3, 0.05, 1, true);
  upper.build(H, { cast: true, noChunk: true });
  // the jaw, hinged far back so it can drop to the chest
  C.jawPivot = new THREE.Group(); C.jawPivot.position.set(0, -0.3, -0.1); H.add(C.jawPivot);
  const jaw = new THREE.Mesh(cachedGeo('cjaw2', () => {
    const g = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) * 0.22, y = p.getY(i) * 0.13, z = p.getZ(i) * 0.3;
      if (z > 0.12) { y -= (z - 0.12) * 0.3; x *= 1 - (z - 0.12) * 0.9; }
      if (z > 0.22) y -= (z - 0.22) * 0.4; // a long pointed chin
      p.setXYZ(i, x, y, z + 0.17);
    }
    g.computeVertexNormals();
    return g;
  }), skin);
  jaw.castShadow = true; jaw.receiveShadow = true; C.jawPivot.add(jaw);
  const jawIn = new THREE.Mesh(cachedGeo('cjawin2', () => new THREE.CircleGeometry(1, 28).scale(0.2, 0.28, 1).rotateX(-Math.PI / 2).translate(0, -0.012, 0.18)), gum);
  C.jawPivot.add(jawIn);
  const lower = new Batch();
  arc(lower, 18, 0.185, 0.25, -0.006, 0.16, 0, false);
  lower.build(C.jawPivot, { cast: true, noChunk: true });
  C.tongue = new THREE.Mesh(cachedGeo('ctongue', () => tubeGeo([[0, 0, 0.0], [0, 0.02, 0.15], [0, 0.0, 0.3], [0, -0.06, 0.42]], 0.045, 16, 8)), plainMat(0x380c0a, { roughness: 0.32, ws: false }));
  C.tongue.position.set(0, -0.05, 0.06); C.tongue.scale.set(1.3, 0.7, 1); C.jawPivot.add(C.tongue);
  // strings of skin stretched between the jaws when it opens wide
  C.strings = [];
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) {
    const m = new THREE.Mesh(cylGeo(0.012 - k * 0.002, 0.012 - k * 0.002, 1, 6), skin);
    H.add(m); C.strings.push({ m, s, k });
  }
  C.headInner = H;
}

function setCreatureVisible(v) {
  const C = Creature;
  if (!C.ready || C.visible === v) return;
  C.visible = v;
  for (const m of C.meshes) m.visible = v;
  C.head.visible = v;
}

function solveTwoBone(root, target, a, b, pole, outMid, outEnd) {
  cA.subVectors(target, root);
  let len = cA.length();
  const dir = cA.multiplyScalar(1 / Math.max(len, 1e-5));
  len = clamp(len, Math.abs(a - b) + 0.01, a + b - 0.01);
  const cosA = clamp((a * a + len * len - b * b) / (2 * a * len), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  cB.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (cB.lengthSq() < 1e-6) cB.set(0, 1, 0);
  cB.normalize();
  outMid.copy(root).addScaledVector(dir, cosA * a).addScaledVector(cB, sinA * a);
  outEnd.copy(root).addScaledVector(dir, len);
}

function fabrik(joints, lengths, target, pole) {
  const n = lengths.length, root = cC.copy(joints[0]);
  const total = lengths.reduce((s, l) => s + l, 0);
  if (root.distanceTo(target) >= total - 0.005) {
    cD.subVectors(target, root).normalize();
    for (let i = 1; i <= n; i++) joints[i].copy(joints[i - 1]).addScaledVector(cD, lengths[i - 1]);
    for (let i = 1; i < n; i++) joints[i].addScaledVector(pole, 0.1);
    return;
  }
  for (let it = 0; it < 10; it++) {
    for (let i = 1; i < n; i++) joints[i].addScaledVector(pole, 0.12);
    joints[n].copy(target);
    for (let i = n - 1; i >= 0; i--) { cD.subVectors(joints[i], joints[i + 1]).normalize(); joints[i].copy(joints[i + 1]).addScaledVector(cD, lengths[i]); }
    joints[0].copy(root);
    for (let i = 1; i <= n; i++) { cD.subVectors(joints[i], joints[i - 1]).normalize(); joints[i].copy(joints[i - 1]).addScaledVector(cD, lengths[i - 1]); }
  }
}

function floorAt(L, x, z) { return cellFlag(L, L.water, x, z) ? -0.4 : 0; }
function ceilAt(L, x, z) {
  if (!L._cprep) prepCreatureGrid(L);
  const gx = Math.floor(x), gz = Math.floor(z);
  return inGrid(L, gx, gz) ? (L.cceil || L.ceil)[gz * L.W + gx] : 3;
}
// What the level grid does not say, but the walls built from it do: every doorway in a room taller than
// 2.6m has a lintel over it at 2.3m, and a steel frame whose jambs stand 7cm into the opening from each
// side. Both are solid. This mirrors the rule the world is built with exactly, so the creature's idea of a
// doorway is the doorway you can see - and anything wider than 86cm or taller than 2.3m has to fold to pass.
function prepCreatureGrid(L) {
  const areasBuilt = typeof World !== 'undefined' && World.areas && World.areas.length > 0;
  L.cceil = new Float32Array(L.ceil);
  L.cbox = new Map();
  const open = (x, z) => cellKind(L, x, z) === 'open';
  for (let gz = 0; gz < L.H; gz++) for (let gx = 0; gx < L.W; gx++) {
    const i = gz * L.W + gx, c = L.ch[i];
    if (!open(gx, gz)) continue;
    const ceil = L.ceil[i];
    const sW = !open(gx - 1, gz), sE = !open(gx + 1, gz), sN = !open(gx, gz - 1), sS = !open(gx, gz + 1);
    const lock = L.lockAt[i] >= 0;
    const diag = open(gx - 1, gz - 1) || open(gx - 1, gz + 1) || open(gx + 1, gz - 1) || open(gx + 1, gz + 1);
    const doorX = sW && sE && !sN && !sS && diag, doorZ = sN && sS && !sW && !sE && diag;
    const th = areasBuilt && World.areas[L.area[i]] ? World.areas[L.area[i]].theme : {};
    if ((doorX || doorZ || lock || c === 'S') && ceil > 2.6 && (!th.noLintel || lock || c === 'S') && c !== 'z') {
      L.cceil[i] = lintelTop(L, i);
      L.cbox.set(i, sW && sE
        ? [[gx - 0.01, gz + 0.37, gx + 0.07, gz + 0.63], [gx + 0.93, gz + 0.37, gx + 1.01, gz + 0.63]]
        : [[gx + 0.37, gz - 0.01, gx + 0.63, gz + 0.07], [gx + 0.37, gz + 0.93, gx + 0.63, gz + 1.01]]);
    }
  }
  L._cprep = areasBuilt;
}
// a ray against the door frames standing in one cell: distance to the first, and its face normal in _bxN
const _bxN = { x: 0, z: 0 };
function boxRay(L, gx, gz, x, z, dx, dz) {
  const list = L.cbox && L.cbox.get(gz * L.W + gx);
  if (!list) return Infinity;
  let best = Infinity;
  for (const b of list) {
    let t0 = -Infinity, t1 = Infinity, nx = 0, nz = 0;
    if (Math.abs(dx) < 1e-12) { if (x <= b[0] || x >= b[2]) continue; }
    else { let a = (b[0] - x) / dx, c = (b[2] - x) / dx, n = -1; if (a > c) { const s = a; a = c; c = s; n = 1; } if (a > t0) { t0 = a; nx = n; nz = 0; } t1 = Math.min(t1, c); }
    if (Math.abs(dz) < 1e-12) { if (z <= b[1] || z >= b[3]) continue; }
    else { let a = (b[1] - z) / dz, c = (b[3] - z) / dz, n = -1; if (a > c) { const s = a; a = c; c = s; n = 1; } if (a > t0) { t0 = a; nx = 0; nz = n; } t1 = Math.min(t1, c); }
    if (t0 < 0) t0 = 0;
    if (t0 <= t1 && t0 < best) { best = t0; _bxN.x = nx; _bxN.z = nz; }
  }
  return best;
}
function openAt(L, x, z) { const gx = Math.floor(x), gz = Math.floor(z); return inGrid(L, gx, gz) && cellKind(L, gx, gz) === 'open' && L.lockAt[gz * L.W + gx] < 0; }
// how far from a point to a wall in a direction (up to max)
function findWall(L, from, dirx, dirz, maxDist) {
  for (let d = 0.1; d <= maxDist; d += 0.1) if (!openAt(L, from.x + dirx * d, from.z + dirz * d)) return d;
  return -1;
}
// =============== walls are borders ===============
// Every wall is a solid box it cannot enter - not with its centre, not with its flesh, not with a
// fingertip - and the floor and ceiling count too. Every part, every frame:
//   1. a part inside a wall is only ever walked back toward a point known to be on the creature's own
//      side, so nothing pops out through the far face into the next room;
//   2. it is pushed off every wall it overlaps by exactly the overlap, using the body's real thickness
//      at that point (measured off the mesh itself when it is built, not guessed);
//   3. where a gap is narrower than the body, the body gets narrower. The bones give.
// Limbs are checked along their length as well as at their joints, so a straight arm or a trailing leg
// cannot cut a corner on its way between two points that are each fine on their own.
const cU = crV(), cU2 = crV(), _fx = crV(), _sg = crV(), _pf = crV(), _nt = crV(), _nm = crV(), _dn = crV(0, -1, 0);
let _bLocks = [];
// to its body, anywhere it could not walk is a wall: shelters, crawlspaces, and any door still shut
function wallBody(L, gx, gz) {
  if (!inGrid(L, gx, gz)) return true;
  const k = gz * L.W + gx, lock = L.lockAt[k];
  if (lock >= 0) return !_bLocks[lock];
  return !L.cwalk[k];
}
// the reaching arm may go into a shelter - that is the point of it - but through nothing solid
function wallArm(L, gx, gz) {
  if (!inGrid(L, gx, gz)) return true;
  const k = gz * L.W + gx, lock = L.lockAt[k];
  if (lock >= 0) return !_bLocks[lock];
  return cellKind(L, gx, gz) !== 'open';
}
function inWall(L, x, z, wall) {
  const gx = Math.floor(x), gz = Math.floor(z);
  if (wall(L, gx, gz)) return true;
  const list = L.cbox && L.cbox.get(gz * L.W + gx);
  if (list) for (const b of list) if (x > b[0] && x < b[2] && z > b[1] && z < b[3]) return true;
  return false;
}
// push p off one solid box by exactly the overlap of a circle of radius r; true if it moved
function pushBox(p, r, x0, z0, x1, z1) {
  const cx = Math.min(Math.max(p.x, x0), x1), cz = Math.min(Math.max(p.z, z0), z1);
  const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r || d2 < 1e-12) return false;
  const d = Math.sqrt(d2), k = (r - d) / d;
  p.x += dx * k; p.z += dz * k;
  return true;
}
// the furthest point from a toward b reachable in a straight line without entering a wall
function lineTo(L, a, b, wall, out) {
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  let bx = a.x, bz = a.z;
  if (len > 1e-5) {
    const n = Math.ceil(len / 0.05);
    for (let i = 1; i <= n; i++) {
      const s = i / n, x = a.x + dx * s, z = a.z + dz * s;
      if (inWall(L, x, z, wall)) break;
      bx = x; bz = z;
    }
  }
  out.x = bx; out.z = bz;
  return out;
}
// push a circle of radius r off every wall it overlaps, by exactly the overlap
function pushOff(L, p, r, wall) {
  for (let pass = 0; pass < 5; pass++) {
    let moved = false;
    const x0 = Math.floor(p.x - r), x1 = Math.floor(p.x + r), z0 = Math.floor(p.z - r), z1 = Math.floor(p.z + r);
    for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
      if (wall(L, gx, gz)) { if (pushBox(p, r, gx, gz, gx + 1, gz + 1)) moved = true; continue; }
      const list = L.cbox && L.cbox.get(gz * L.W + gx);
      if (list) for (const b of list) if (pushBox(p, r, b[0], b[1], b[2], b[3])) moved = true;
    }
    if (!moved) break;
  }
  return p;
}
// does a circle touch any wall?
function circleInWall(L, x, z, r, wall) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
  const hit = (bx0, bz0, bx1, bz1) => { const cx = Math.min(Math.max(x, bx0), bx1), cz = Math.min(Math.max(z, bz0), bz1); return (x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r; };
  for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
    if (wall(L, gx, gz)) { if (hit(gx, gz, gx + 1, gz + 1)) return true; continue; }
    const list = L.cbox && L.cbox.get(gz * L.W + gx);
    if (list) for (const b of list) if (hit(b[0], b[1], b[2], b[3])) return true;
  }
  return false;
}
// Exact distance along a ray to the face of the first wall it meets - walked cell to cell (grid DDA), so
// there is no stepping error at all. Everything that has to sit flush against a wall measures with this.
// outN, if given, gets the true normal of the face it hit (pointing back out of the wall), which is
// what a palm has to lie flat against - not the direction the arm happened to reach in.
function rayWall(L, x, z, dx, dz, max, wall, outN) {
  const l = Math.hypot(dx, dz);
  if (l < 1e-9) return max;
  dx /= l; dz /= l;
  let gx = Math.floor(x), gz = Math.floor(z);
  if (wall(L, gx, gz)) return 0;
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tx = dx !== 0 ? (sx > 0 ? gx + 1 - x : x - gx) * tdx : Infinity;
  let tz = dz !== 0 ? (sz > 0 ? gz + 1 - z : z - gz) * tdz : Infinity;
  // a door frame in the cell it is already in can be the first thing it meets
  let bt = boxRay(L, gx, gz, x, z, dx, dz);
  for (let i = 0; i < 96; i++) {
    let t, nx = 0, nz = 0;
    if (tx < tz) { t = tx; gx += sx; tx += tdx; nx = -sx; } else { t = tz; gz += sz; tz += tdz; nz = -sz; }
    if (bt <= t) { if (bt >= max) return max; if (outN) outN.set(_bxN.x, 0, _bxN.z); return bt; }
    if (t >= max) return max;
    if (wall(L, gx, gz)) { if (outN) outN.set(nx, 0, nz); return t; }
    bt = boxRay(L, gx, gz, x, z, dx, dz);
  }
  return max;
}
const _wn = crV(), _hpW = crV();
function gapTo(L, p, dx, dz, max, wall) { return rayWall(L, p.x, p.z, dx, dz, max, wall); }
// a bone whose near end is fixed to the body (a hip, a shoulder): if its middle cuts a wall, only the far
// end moves - the limb swings away from the wall about the joint it hangs from, and stays attached
function fitSegmentFrom(L, a, b, ra, rb, wall) {
  // the bone's own line first: the far end only as far as a straight line from the near end gets
  lineTo(L, a, b, wall, _fx); b.x = _fx.x; b.z = _fx.z;
  for (let it = 0; it < 6; it++) {
    const n = Math.max(3, Math.ceil(a.distanceTo(b) / 0.2));
    // the single largest correction any point along it needs - not the sum of them, which overshoots
    let bx = 0, bz = 0, bm = 0, up = 0, dn = 0, cut = 1;
    for (let q = 1; q <= n; q++) {
      const s = q / n, r = lerp(ra, rb, s);
      _sg.lerpVectors(a, b, s);
      const ox = _sg.x, oz = _sg.z;
      pushOff(L, _sg, r, wall);
      const dx = (_sg.x - ox) / s, dz = (_sg.z - oz) / s, m = Math.hypot(dx, dz);
      if (m > bm) { bm = m; bx = dx; bz = dz; }
      // under every ceiling it passes beneath along the way - a lintel between two joints included -
      // and above the floor
      const top = ceilOver(L, _sg.x, _sg.z, r) - r - 0.01, bot = floorAt(L, _sg.x, _sg.z) + r + 0.005;
      if (_sg.y > top) {
        // A ceiling far below it, met close to where it starts, is not something to duck under: it is
        // the wall over a doorway, met from a tall room. A limb up there is stopped by it, short of it.
        if (_sg.y - top > 0.25 && (_sg.y - top) / s > 0.9) cut = Math.min(cut, Math.max(0, s - 1 / n) * 0.95);
        else dn = Math.max(dn, (_sg.y - top) / s);
      } else if (_sg.y < bot) up = Math.max(up, (bot - _sg.y) / s);
    }
    if (bm < 1e-5 && !up && !dn && cut >= 1) break;
    if (cut < 1) { b.x = a.x + (b.x - a.x) * cut; b.y = a.y + (b.y - a.y) * cut; b.z = a.z + (b.z - a.z) * cut; continue; }
    if (bm > 0.5) { bx *= 0.5 / bm; bz *= 0.5 / bm; }
    b.x += bx; b.z += bz;
    b.y += Math.min(up, 0.6) - Math.min(dn, 0.6);
    // a correction can never carry it into, or through, some other wall
    lineTo(L, a, b, wall, _fx); b.x = _fx.x; b.z = _fx.z;
  }
}
// one part, made to fit: never past a wall from its anchor, then off the walls by its own thickness
function fitPart(L, p, r, anchor, wall) {
  lineTo(L, anchor, p, wall, _fx);
  p.x = _fx.x; p.z = _fx.z;
  pushOff(L, p, r, wall);
  // pushing off one wall in a tight corner can shove it into another; the straight line back from the
  // anchor settles that for good
  if (inWall(L, p.x, p.z, wall)) { lineTo(L, anchor, p, wall, _fx); p.x = _fx.x; p.z = _fx.z; }
  return p;
}
// A bone from a to b, thickness ra at a and rb at b: sampled along its length every 20cm or so, and if any
// stretch of it touches a wall both ends move off that wall - shared out by how near each end is, with no
// overshoot, so a correction never shoves the bone into the wall on the other side.
function fitSegment(L, a, b, ra, rb, wall) {
  for (let it = 0; it < 5; it++) {
    const n = Math.max(3, Math.ceil(a.distanceTo(b) / 0.2));
    // the worst point along it, sideways and up, each corrected once - never several summed together
    let best = 0, bdx = 0, bdz = 0, bs = 0.5, dy = 0, ds = 0.5;
    for (let q = 1; q < n; q++) {
      const s = q / n, r = lerp(ra, rb, s);
      _sg.lerpVectors(a, b, s);
      const ox = _sg.x, oz = _sg.z;
      pushOff(L, _sg, r, wall);
      const dx = _sg.x - ox, dz = _sg.z - oz, m = dx * dx + dz * dz;
      if (m > best) { best = m; bdx = dx; bdz = dz; bs = s; }
      const top = ceilOver(L, _sg.x, _sg.z, r) - r - 0.01;
      if (_sg.y > top && top - _sg.y < dy) { dy = top - _sg.y; ds = s; }
    }
    if (best < 1e-9 && !dy) break;
    // move the bone so that point clears: the share each end takes is its leverage on that point
    if (best >= 1e-9) { const wa = 1 - bs, wb = bs, k = 1 / (wa * wa + wb * wb); a.x += bdx * wa * k; a.z += bdz * wa * k; b.x += bdx * wb * k; b.z += bdz * wb * k; }
    if (dy) { const wa = 1 - ds, wb = ds, k = 1 / (wa * wa + wb * wb); a.y += dy * wa * k; b.y += dy * wb * k; }
  }
}
// does the straight line from a to b reach b without entering a wall?
function clearLine(L, a, b, wall) { lineTo(L, a, b, wall, _fx); return Math.abs(_fx.x - b.x) + Math.abs(_fx.z - b.z) < 1e-4; }
// The middle joint of a limb whose two ends are already where they have to be - a knee between a hip and
// a planted foot, an elbow between a shoulder and a hand on a wall. If either bone through it would cross
// a wall, it moves toward the straight line between the two ends (which is clear) by the least it takes -
// found by bisection, so a knee folds only as much as the doorway it is passing through requires.
function fitMiddle(L, a, m, b, r, wall) {
  const ok = () => clearLine(L, a, m, wall) && clearLine(L, b, m, wall);
  if (!ok()) {
    const ox = m.x, oz = m.z, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    let lo = 0, hi = 1;
    for (let it = 0; it < 14; it++) {
      const k = (lo + hi) / 2;
      m.x = ox + (mx - ox) * k; m.z = oz + (mz - oz) * k;
      if (ok()) hi = k; else lo = k;
    }
    m.x = ox + (mx - ox) * hi; m.z = oz + (mz - oz) * hi;
  }
  const px = m.x, pz = m.z;
  pushOff(L, m, r, wall);
  if (!ok()) { m.x = px; m.z = pz; }
}
// keep something of vertical half-thickness h between the floor and the ceiling; returns how much it had
// to be squashed to fit (1 = not at all)
// The lowest ceiling over everything within r of p - a body as wide as its shoulders is under every
// ceiling its shoulders are under, not just the one over its spine. Where a tall room opens into a low
// corridor, that is the difference between ducking and going through the roof.
function ceilOver(L, x, z, r) {
  let c = ceilAt(L, x, z);
  if (r <= 0) return c;
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
  for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
    const cx = Math.min(Math.max(x, gx), gx + 1), cz = Math.min(Math.max(z, gz), gz + 1);
    if ((x - cx) * (x - cx) + (z - cz) * (z - cz) >= r * r || !inGrid(L, gx, gz)) continue;
    // a wall has no ceiling over it - what the grid stores there is a placeholder - and the walls are kept
    // off sideways anyway; only the open space it is actually in has a ceiling that matters
    if (cellKind(L, gx, gz) !== 'open') continue;
    const v = (L.cceil || L.ceil)[gz * L.W + gx];
    if (v < c) c = v;
  }
  return c;
}
function fitHeight(L, p, h, floorY, r = 0) {
  const top = ceilOver(L, p.x, p.z, r) - 0.04, bot = floorY + 0.02;
  if (top - bot < 2 * h) { p.y = (top + bot) / 2; return Math.max(0.25, (top - bot) / (2 * h)); }
  if (p.y + h > top) p.y = top - h;
  if (p.y - h < bot) p.y = bot + h;
  return 1;
}
// The head, aimed: every surface point of it checked against the walls, the floor and the ceiling. If any
// would be inside something the whole head backs off by the worst overlap, and the neck bends to follow it.
const _hp = crV(), _hb = crV(), _hm = { mx: 0, mz: 0, my: 0, bad: false };
// how far the head, as it is now, has to come off the walls in each direction: walls on opposite sides
// cancel, so in a gap barely wider than its skull it settles in the middle instead of bouncing
function headPen(L, fy, J, wall) {
  const C = Creature;
  C.head.updateMatrixWorld(true);
  let px = 0, nx = 0, pz = 0, nz = 0, my = 0;
  for (const hp of C.headPts) {
    if (!hp.m.visible) continue;
    _hp.copy(hp.p).applyMatrix4(hp.m.matrixWorld);
    if (inWall(L, _hp.x, _hp.z, wall)) {
      // back toward the head's own centre, which is on the right side of the wall, and a touch further
      lineTo(L, J[8], _hp, wall, _hb);
      const dx = _hb.x - _hp.x, dz = _hb.z - _hp.z, d = Math.hypot(dx, dz) || 1;
      const ex = dx + (dx / d) * 0.025, ez = dz + (dz / d) * 0.025;
      if (ex > px) px = ex; if (ex < nx) nx = ex; if (ez > pz) pz = ez; if (ez < nz) nz = ez;
    }
    const top = ceilOver(L, _hp.x, _hp.z, 0.02) - 0.03;
    if (_hp.y > top) my = Math.min(my, top - _hp.y);
    else if (_hp.y < fy + 0.02) my = Math.max(my, fy + 0.02 - _hp.y);
  }
  _hm.mx = px + nx; _hm.mz = pz + nz; _hm.my = my; _hm.bad = !!(px || nx || pz || nz || my);
  return _hm;
}
function fitHead(L, fy, J, wall) {
  const C = Creature;
  if (!C.headPts) return;
  const ox = J[8].x, oz = J[8].z;
  const moveHead = (x, y, z) => {
    // the joint it hangs from never goes into a wall, and never goes round the far side of one
    _hb.set(x, y, z); lineTo(L, J[7], _hb, wall, _fx);
    const dx = _fx.x - J[8].x, dz = _fx.z - J[8].z, dy = y - J[8].y;
    J[8].x = _fx.x; J[8].z = _fx.z; J[8].y = y;
    J[7].x += dx * 0.55; J[7].z += dz * 0.55; J[7].y += dy * 0.55;
    J[6].x += dx * 0.2; J[6].z += dz * 0.2; J[6].y += dy * 0.2;
    C.head.position.copy(J[8]);
  };
  for (let it = 0; it < 8; it++) {
    const m = headPen(L, fy, J, wall);
    if (!m.bad) break;
    let x = J[8].x + m.mx, z = J[8].z + m.mz;
    // it never wanders more than 70cm off the end of its neck to find room
    const dx = x - ox, dz = z - oz, d = Math.hypot(dx, dz);
    if (d > 0.7) { x = ox + (dx * 0.7) / d; z = oz + (dz * 0.7) / d; }
    moveHead(x, J[8].y + m.my, z);
  }
  // Still touching: there is no room for its face here - it has walked its nose into a dead end - so it
  // does what an animal does and draws its head back in toward its chest until there is.
  for (let k = 0; k < 8 && headPen(L, fy, J, wall).bad; k++) {
    moveHead(lerp(J[8].x, J[5].x, 0.22), lerp(J[8].y, J[5].y, 0.22), lerp(J[8].z, J[5].z, 0.22));
  }
  // the neck it bent on the way must itself stay clear, centre and flesh
  for (const k of [6, 7]) {
    if (inWall(L, J[k].x, J[k].z, wall)) { lineTo(L, J[k - 1], J[k], wall, _fx); J[k].x = _fx.x; J[k].z = _fx.z; }
    pushOff(L, J[k], 0.26, wall);
  }
}
// how thick each bone of a skinned body really is, read off its own vertices (bind pose: bone along +y,
// its local x the width and z the depth) - so the walls are kept off the actual surface, ribs and knuckles
// and all, rather than off a guess
// Per bone: [widest, deepest, width near its start, width near its end] - the start and end so a wrist
// is kept off a wall by the thickness of a wrist, not of the elbow at the other end of the forearm.
function boneExtents(mesh) {
  const g = mesh.geometry, P = g.attributes.position.array, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array;
  const inv = mesh.skeleton.boneInverses, nb = inv.length, nv = P.length / 3;
  const lo = new Float32Array(nb).fill(1e9), hi = new Float32Array(nb).fill(-1e9);
  for (let v = 0; v < nv; v++) {
    const b = SI[v * 4], y = P[v * 3 + 1] + inv[b].elements[13];
    if (y < lo[b]) lo[b] = y;
    if (y > hi[b]) hi[b] = y;
  }
  // the ends are measured in both directions across the bone: a kneecap sticks out in depth, not width
  const ex = Array.from({ length: nb }, () => [0.02, 0.02, 0.02, 0.02]);
  for (let v = 0; v < nv; v++) {
    const x = Math.abs(P[v * 3]), z = Math.abs(P[v * 3 + 2]), xz = Math.max(x, z);
    for (let k = 0; k < 4; k++) {
      if (SW[v * 4 + k] < 0.12) continue;
      const b = SI[v * 4 + k], e = ex[b];
      if (x > e[0]) e[0] = x;
      if (z > e[1]) e[1] = z;
      const f = (P[v * 3 + 1] + inv[b].elements[13] - lo[b]) / Math.max(hi[b] - lo[b], 1e-3);
      if (f < 0.3 && xz > e[2]) e[2] = xz;
      if (f > 0.7 && xz > e[3]) e[3] = xz;
    }
  }
  return ex;
}

// ---------- the trail its body follows ----------
function trailAt(d, out) {
  const C = Creature, T = C.trail;
  let acc = 0, px = C.pos.x, pz = C.pos.z;
  for (let i = 0; i < T.length; i++) {
    const p = T[i], seg = Math.hypot(p.x - px, p.z - pz);
    if (seg > 1e-5 && acc + seg >= d) { const k = (d - acc) / seg; return out.set(px + (p.x - px) * k, 0, pz + (p.z - pz) * k); }
    acc += seg; px = p.x; pz = p.z;
  }
  let dx = -Math.sin(C.yaw), dz = -Math.cos(C.yaw);
  if (T.length >= 2) { const a = T[T.length - 2], b = T[T.length - 1]; const l = Math.hypot(b.x - a.x, b.z - a.z); if (l > 1e-4) { dx = (b.x - a.x) / l; dz = (b.z - a.z) / l; } }
  out.set(px + dx * (d - acc), 0, pz + dz * (d - acc));
  // Past the end of the path it has walked, the rest of it is guessed - and a guess never runs through a
  // wall. (A creature that has only just appeared in a tight spot has hardly any path; its back half
  // bunches up against the wall behind it rather than continuing straight on into the stone.)
  if (C.L && !inWall(C.L, px, pz, wallBody)) { _trA.set(px, 0, pz); lineTo(C.L, _trA, out, wallBody, _trB); out.x = _trB.x; out.z = _trB.z; }
  return out;
}
const _trA = new THREE.Vector3(), _trB = new THREE.Vector3();
function initTrail(L) {
  const C = Creature;
  C.trail = [];
  let bx = -Math.sin(C.yaw), bz = -Math.cos(C.yaw);
  const gx = Math.floor(C.pos.x), gz = Math.floor(C.pos.z);
  // coming out of a vent: the rest of the body is still inside the wall behind it. That is the one time
  // any of it is allowed to be - it is in the vent, and the vent is a hole.
  if (inGrid(L, gx, gz) && L.ch[gz * L.W + gx] === 'M') {
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (cellKind(L, gx + dx, gz + dz) === 'solid') { bx = dx; bz = dz; break; }
    for (let d = 0.2; d <= 9; d += 0.2) C.trail.push({ x: C.pos.x + bx * d, z: C.pos.z + bz * d });
    return;
  }
  // Anywhere else, the body it arrives with has to be lying in open floor. Lay it out behind it along the
  // corridor: straight back until a wall, then turned along the wall whichever way is open - and if it is
  // boxed in, folded up on itself rather than pushed into the stone.
  _bLocks = typeof Game !== 'undefined' && Game.g ? openLocksOf(Game.g) : [];
  let x = C.pos.x, z = C.pos.z;
  const ok = (px, pz) => !circleInWall(L, px, pz, CREATURE_R * 0.9, wallBody);
  for (let n = 0; n < 45; n++) {
    let moved = false;
    for (const turn of [0, 0.5, -0.5, 1.2, -1.2, Math.PI / 2, -Math.PI / 2]) {
      const c = Math.cos(turn), s = Math.sin(turn), dx = bx * c - bz * s, dz = bx * s + bz * c;
      if (ok(x + dx * 0.2, z + dz * 0.2)) { x += dx * 0.2; z += dz * 0.2; bx = dx; bz = dz; moved = true; break; }
    }
    C.trail.push({ x, z });
    if (!moved) { for (let k = n + 1; k < 45; k++) C.trail.push({ x, z }); break; }
  }
}

// ---------- every frame ----------
// net: { x, z, yaw, st, mode, lx, ly, lz }
// While it reaches into a shelter, only the arm may pass the doorway: find that shelter's door.
const _rhC = { x: 0, y: 0, z: 0, ph: 0, end: 0 };
function reachGap(sf) { return { x: sf.door.x + sf.dir.x * 0.1 + sf.dir.z * 0.32, z: sf.door.z + sf.dir.z * 0.1 - sf.dir.x * 0.32 }; }
// where the arm's sweep is measured from: just inside the room, past the door frame, so the hand can work the
// whole room and never cuts through the frame on the way
function reachPivot(sf) { const g = reachGap(sf); return { x: g.x + sf.dir.x * 0.45, z: g.z + sf.dir.z * 0.45 }; }
function reachDoor(L, pos) {
  let best = null, bd = 9;
  for (const sf of L.safes) { const d = Math.hypot(sf.outside.x - pos.x, sf.outside.z - pos.z); if (d < bd) { bd = d; best = sf; } }
  return bd < 3 ? best : null;
}
function updateCreature(dt, t, net, L, camPos) {
  const C = Creature;
  if (!C.ready) return;
  C.L = L;
  if (!net || net.mode === 'hidden') { setCreatureVisible(false); C.inited = false; return; }
  setCreatureVisible(true);
  // coming out of its lair, its body goes exactly where the shared choreography puts it, frame by frame
  const O = C.override, root = O && O.root;
  const rx = root ? root.x : net.x, rz = root ? root.z : net.z;
  if (!C.inited || Math.hypot(C.pos.x - rx, C.pos.z - rz) > 6) {
    C.pos.set(rx, 0, rz); C.yaw = root ? O.yaw : net.yaw; C.inited = true; C.ceilS = ceilAt(L, rx, rz);
    C.u = root ? 0 : clamp((C.ceilS - 3.3) / 5.5, 0, 1);
    initTrail(L); resetPlants(L);
  }
  const px = C.pos.x, pz = C.pos.z;
  if (root) { C.pos.x = rx; C.pos.z = rz; C.yaw = dampAngle(C.yaw, O.yaw, 8, dt); }
  else { C.pos.x = damp(C.pos.x, net.x, 8, dt); C.pos.z = damp(C.pos.z, net.z, 8, dt); C.yaw = dampAngle(C.yaw, net.yaw, 5, dt); }
  C.speed = damp(C.speed, Math.hypot(C.pos.x - px, C.pos.z - pz) / Math.max(dt, 1e-4), 5, dt);
  C.mode = net.mode;
  const head = C.trail[0];
  if (!head || Math.hypot(C.pos.x - head.x, C.pos.z - head.z) > 0.15) { C.trail.unshift({ x: C.pos.x, z: C.pos.z }); if (C.trail.length > 80) C.trail.pop(); }
  const mode = net.mode, run = mode === 'run';
  // the doorway its arm is through: reaching in, or dragging someone back out
  const rs = mode === 'reach' ? (net.rs && L.safes[net.rs - 1]) || reachDoor(L, C.pos)
    : C.override && C.override.door ? L.safes[C.override.door - 1] || null : null;
  const fwd = cE.set(Math.sin(C.yaw), 0, Math.cos(C.yaw)), side = cF.set(Math.cos(C.yaw), 0, -Math.sin(C.yaw));
  const F = fwd.clone(), S = side.clone();
  // how much room there is: ceiling and walls either side
  // The lowest ceiling over the whole of it and the next few metres of where it is going - so it is
  // already down on all fours by the time it reaches a doorway, not folding in half as it passes under.
  // It drops quickly and rises slowly, like something that has learned to expect low places.
  let ceil = ceilOver(L, C.pos.x, C.pos.z, 0.5);
  const look = 2.6 + Math.min(C.speed, 6) * 0.45;
  for (const d of [0.9, 1.7, look * 0.75, look, -1.4, -2.8]) ceil = Math.min(ceil, ceilOver(L, C.pos.x + F.x * d, C.pos.z + F.z * d, 0.5));
  C.ceilS = damp(C.ceilS, ceil, ceil < C.ceilS ? 6 : 1.4, dt);
  const wallL = findWall(L, C.pos, -S.x, -S.z, 3), wallR = findWall(L, C.pos, S.x, S.z, 3);
  const halfW = Math.min(wallL < 0 ? 3 : wallL, wallR < 0 ? 3 : wallR);
  // ----- forcing itself through a gap narrower than it is -----
  // Doorways are built for people. It gets through them by giving up on the shape it was holding:
  // the shoulders come in, the spine drops, and the joints go one after another to let it happen.
  const tight = clamp((1.3 - halfW) / 0.7, 0, 1);
  C.squeeze = damp(C.squeeze || 0, tight, 4, dt);
  if (C.squeeze > 0.42 && !C.cracked && C.speed > 0.35) {
    C.cracked = 1; C.crackT = 0.5; C.jerk = 0.2;
    Sound.play('crack', { x: C.pos.x, y: 1.3, z: C.pos.z });
  } else if (C.squeeze < 0.22) C.cracked = 0;
  C.crackT = Math.max(0, (C.crackT || 0) - dt);
  const room = clamp((C.ceilS - 3.3) / 5.5, 0, 1);
  // with someone in its hand it rises to lift them as high as the room lets it
  const eatU = C.override && C.override.stand !== undefined ? lerp(0.15, 1, C.override.stand) : 0.15;
  const uT = Math.min(O && O.uMax !== undefined ? O.uMax : 1, room * (run ? 0.3 : mode === 'eat' ? eatU : mode === 'reach' ? 0.3 : 1) * (1 - C.squeeze * 0.85));
  // it gets down fast - nothing about it is slow to fit itself into a smaller space - and rises slowly
  C.u = damp(C.u, uT, uT < C.u ? 5.5 : 1.6, dt);
  // how upright it is: it stands as soon as the room allows, and drops to all fours to run
  const u = smoothstep(0.08, 0.55, C.u);
  C.look.set(net.lx !== undefined ? net.lx : C.pos.x + F.x * 3, net.ly !== undefined ? net.ly : 1.5, net.lz !== undefined ? net.lz : C.pos.z + F.z * 3);
  if (C.override && C.override.look) C.look.copy(C.override.look);
  else if (rs) { const sw = Math.sin(t * 2.3) * 0.8; C.look.set(rs.door.x - rs.dir.x * 0.9 - rs.dir.z * sw, 1.0, rs.door.z - rs.dir.z * 0.9 + rs.dir.x * sw); } // face turned side to side outside the door, never peering in
  C.scream = Math.max(0, C.scream - dt);
  const screaming = C.scream > 0 || (C.override && C.override.scream);
  C.jaw = damp(C.jaw, screaming ? 1.35 : run ? 0.7 : mode === 'eat' ? 0.45 + 0.35 * Math.sin(t * 8) : mode === 'reach' ? 0.55 : mode === 'emerge' ? 0.42 + 0.12 * Math.sin(t * 2.1) : 0.1 + 0.06 * Math.sin(t * 1.3), screaming ? 14 : 6, dt);
  // twitches
  const tw = C.twitch;
  tw.next -= dt;
  if (tw.next <= 0) { tw.next = 0.5 + Math.random() * (mode === 'idle' ? 1.6 : 3.2); tw.t = 0.14; tw.x = (Math.random() - 0.5) * 0.8; tw.y = (Math.random() - 0.5) * 1.1; tw.z = (Math.random() - 0.5) * 1.6; if (Math.random() < 0.35) C.jerk = 0.14; }
  tw.t = Math.max(0, tw.t - dt); C.jerk = Math.max(0, C.jerk - dt);
  // ----- gait: one clock drives every limb, so footfalls land in rhythm with the body -----
  const upright = u > 0.5 && !run && mode !== 'eat' && mode !== 'reach';
  const Gt = run ? GAITS.run : upright ? GAITS.walk : GAITS.crawl;
  C.gaitW = C.gaitW || { bob: 0, sway: 0, lunge: 0, wave: 0 };
  for (const k in C.gaitW) C.gaitW[k] = damp(C.gaitW[k], Gt[k] * clamp(C.speed / 1.2, 0, 1), 3, dt);
  C.vel.set((C.pos.x - px) / Math.max(dt, 1e-4), 0, (C.pos.z - pz) / Math.max(dt, 1e-4));
  C.velS.lerp(C.vel, 1 - Math.exp(-dt * 6));
  const cadence = C.speed / (Gt.stride * C.strideK);
  C.phase += dt * (C.speed > 0.15 ? Math.max(cadence, 0.3) : 0);
  if (C.phase > 1e4) C.phase -= 1e4;
  const PH = C.phase * Math.PI * 2;
  C.gait = PH;
  const breathe = Math.sin(t * (run ? 7 : 1.7));
  const bob = Gt === GAITS.run ? Math.sin(PH - 0.6) : Math.cos(2 * (PH - 1.2));
  const fy = floorAt(L, C.pos.x, C.pos.z);

  // ----- spine: in a corridor it follows the trail; in a hall it rears up -----
  const hc0 = Math.min(1.45, C.ceilS - 0.8), hp0 = Math.min(1.3, C.ceilS - 0.95);
  const hc1 = Math.min(C.ceilS - 1.5, 6.2), hp1 = Math.min(C.ceilS - 3.0, 4.5);
  const gw = C.gaitW;
  const hc = lerp(hc0, Math.max(hc0, hc1), u) + bob * gw.bob - (C.jerk > 0 ? 0.12 : 0) + breathe * 0.02;
  const hp = lerp(hp0, Math.max(hp0, hp1), u) + bob * gw.bob * 0.8;
  const SD = [3.1, 2.35, 1.8, 1.25, 0.6, 0];
  const J = C.J || (C.J = Array.from({ length: 9 }, crV));
  // how much room the tightest part of it had last frame decides how freely it moves this one
  const tightest = C.room9 ? Math.min(...C.room9) : 3;
  C.loose = damp(C.loose === undefined ? 1 : C.loose, clamp((tightest - 0.55) / 0.9, 0, 1), 4, dt);
  // standing, it stoops: the chest hangs out over its feet and the neck has to crane up
  const pelvisU = crV().set(C.pos.x - F.x * 0.6, fy + hp, C.pos.z - F.z * 0.6);
  const chestU = crV().set(C.pos.x + F.x * 0.75, fy + hc, C.pos.z + F.z * 0.75);
  for (let i = 0; i < 6; i++) {
    const d = SD[i], k = 1 - d / 3.1;
    trailAt(d, cG);
    const arch = (1 - u) * 0.28 * Math.sin(Math.PI * k);
    const yc = Math.min(fy + lerp(hp, hc, k) * (1 - u) + arch, fy + C.ceilS - 0.5);
    cH.lerpVectors(pelvisU, chestU, k).addScaledVector(F, 0.3 * Math.sin(Math.PI * k));
    cG.y = yc;
    J[i].lerpVectors(cG, cH, u);
    // weight over the stance side, the chest driving forward as the arms reach, a wave down the spine when it crawls
    const k2 = i / 5;
    // and it straightens out in a tight place: no room to undulate in a corridor, none at all in a doorway
    J[i].addScaledVector(S, (gw.sway * Math.cos(PH - 4.33) + gw.wave * Math.sin(PH * (Gt === GAITS.run ? 1 : 2) - i * 0.9) * (1 - u * 0.7)) * C.loose);
    J[i].addScaledVector(F, gw.lunge * Math.sin(PH - 3.45) * k2 * k2);
  }
  const bodyOff = crV().copy(S).multiplyScalar(gw.sway * Math.cos(PH - 4.33)).addScaledVector(F, gw.lunge * Math.sin(PH - 3.45)).addScaledVector(UP, bob * gw.bob);
  // neck reaches toward what it is looking at, low and forward when crawling
  const lookDir = crV().subVectors(C.look, J[5]);
  if (lookDir.lengthSq() < 0.01) lookDir.copy(F);
  lookDir.normalize();
  const spineDir = crV().subVectors(J[5], J[4]).normalize();
  const neckGoal = crV().copy(spineDir).lerp(lookDir, 0.6).addScaledVector(UP, (1 - u) * -0.25 + u * 0.1).normalize();
  if (mode === 'eat') neckGoal.copy(F).addScaledVector(UP, -0.9).normalize();
  for (let i = 0; i < 3; i++) {
    const d = crV().copy(spineDir).lerp(neckGoal, (i + 1) / 3).normalize();
    J[6 + i].copy(J[5 + i]).addScaledVector(d, SPINE_LENS[5 + i]);
  }
  // a predator's head: it rides steadier than the body under it
  for (let i = 6; i < 9; i++) J[i].addScaledVector(bodyOff, -0.22 * (i - 5));
  // driving itself at something: the whole body surges, the neck shoots out further still
  if (O && (O.headPush || O.surge)) for (let i = 0; i < 9; i++) J[i].addScaledVector(F, (O.surge || 0) * (i / 8) + (i >= 6 ? (O.headPush || 0) * (i - 5) / 3 : 0));
  // its head put right in someone's face: the neck shoots out, as far as it takes, to get it there
  if (O && O.headAt) {
    J[8].copy(O.headAt);
    J[7].lerpVectors(J[6], J[8], 0.6).y += 0.06;
  }
  // behind the cover of its lair: nothing of it past the plane of the cover, by its own thickness
  const EP = O && O.plane;
  const holdBehind = () => {
    if (!EP) return;
    for (let i = 0; i < 9; i++) {
      const rad = i >= 6 ? 0.28 : Math.max(i > 0 ? C.spineEx[i - 1][0] : 0, i < 8 ? C.spineEx[i][0] : 0);
      const al = (J[i].x - EP.x) * EP.nx + (J[i].z - EP.z) * EP.nz, m = EP.m + rad;
      if (al > -m) { J[i].x -= EP.nx * (al + m); J[i].z -= EP.nz * (al + m); }
    }
  };
  holdBehind();
  // reaching in: the spine, neck and head are held behind the door plane every frame
  if (rs) for (let i = 0; i < 9; i++) {
    const m = i >= 6 ? 0.95 : 0.65, al = (J[i].x - rs.door.x) * rs.dir.x + (J[i].z - rs.door.z) * rs.dir.z;
    if (al > -m) { J[i].x -= rs.dir.x * (al + m); J[i].z -= rs.dir.z * (al + m); }
  }

  // ----- no hairpins in the spine -----
  // Skin blended across a joint bent too hard folds outward past either bone - the shoulders bulge out
  // into the wall beside a doorway it is turning into. No joint of the back bends more than ~38 degrees;
  // past that, it is eased toward the line of its neighbours.
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < 8; i++) {
    const ax = J[i].x - J[i - 1].x, az = J[i].z - J[i - 1].z, bx = J[i + 1].x - J[i].x, bz = J[i + 1].z - J[i].z;
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 0.05 || lb < 0.05) continue;
    const cos = (ax * bx + az * bz) / (la * lb);
    if (cos < 0.79) {
      const k = clamp((0.79 - cos) / 0.79, 0, 1) * 0.6;
      J[i].x = lerp(J[i].x, (J[i - 1].x + J[i + 1].x) / 2, k); J[i].z = lerp(J[i].z, (J[i - 1].z + J[i + 1].z) / 2, k);
    }
  }

  // ----- the body fits the space it is in (see "walls are borders") -----
  _bLocks = typeof Game !== 'undefined' && Game.g ? openLocksOf(Game.g) : [];
  const EX = C.spineEx;
  const SQ = C.sq || (C.sq = new Float32Array(8).fill(1)), SQZ = C.sqz || (C.sqz = new Float32Array(8).fill(1));
  const room9 = C.room9 || (C.room9 = new Float32Array(9)), vent = C.ventJ || (C.ventJ = new Uint8Array(9));
  const jW = (i) => Math.max(i > 0 ? EX[i - 1][0] : 0, i < 8 ? EX[i][0] : 0);
  // 1. centres: never through a wall and never round the far side of one. The body hangs off its own
  //    path; the neck hangs off the body, link by link.
  for (let i = 0; i < 9; i++) {
    const anchor = i <= 5 ? trailAt(SD[i], cU2) : J[i - 1];
    // fresh out of a vent, the back of it is still inside the wall. That is the vent, and the only exception.
    vent[i] = i <= 5 && inWall(L, anchor.x, anchor.z, wallBody) ? 1 : 0;
    if (vent[i]) continue;
    lineTo(L, anchor, J[i], wallBody, _fx); J[i].x = _fx.x; J[i].z = _fx.z;
  }
  // 2. across: in a gap narrower than it, it sits in the middle of the gap - then measures what is left
  for (let i = 0; i < 9; i++) {
    if (vent[i]) { room9[i] = 9; continue; }
    const a = J[Math.max(0, i - 1)], b = J[Math.min(8, i + 1)];
    let ax = b.z - a.z, az = -(b.x - a.x); const al = Math.hypot(ax, az);
    if (al < 1e-4) { ax = S.x; az = S.z; } else { ax /= al; az /= al; }
    const want = jW(i) + 0.03;
    const dl = gapTo(L, J[i], -ax, -az, 3, wallBody), dr = gapTo(L, J[i], ax, az, 3, wallBody);
    let shift = 0;
    if (dl < want && dr > dl) shift = Math.min(want - dl, (dr - dl) / 2);
    else if (dr < want && dl > dr) shift = -Math.min(want - dr, (dl - dr) / 2);
    J[i].x += ax * shift; J[i].z += az * shift;
    room9[i] = Math.min(dl + shift, dr - shift);
  }
  // 3. the bones give. Each one goes exactly as narrow as the room it is in - instantly, because nothing
  //    is allowed to show through a wall even for a frame - and opens back out slowly, unclenching.
  //    Every time a section of it folds hard, you hear that section go.
  for (let i = 0; i < 8; i++) {
    let have = Math.min(room9[i], room9[i + 1]);
    // and along the bone between them: a door frame is narrower than the doorway it stands in, and the
    // narrowest point is very often where neither joint is
    const ax = J[i + 1].z - J[i].z, az = -(J[i + 1].x - J[i].x), al = Math.hypot(ax, az);
    if (al > 1e-4 && !vent[i] && !vent[i + 1]) for (const s of [0.2, 0.4, 0.6, 0.8]) {
      _sg.lerpVectors(J[i], J[i + 1], s);
      const g = Math.min(gapTo(L, _sg, ax / al, az / al, 3, wallBody), gapTo(L, _sg, -ax / al, -az / al, 3, wallBody));
      if (g < have) have = g;
    }
    const want = clamp((have - 0.025) / EX[i][0], 0.3, 1);
    if (want < SQ[i] - 0.14 && C.speed > 0.2 && (C.boneCrackT[i] || 0) <= 0) {
      const p = _pf.lerpVectors(J[i], J[i + 1], 0.5);
      Sound.play('crack', { x: p.x, y: p.y, z: p.z }); C.boneCrackT[i] = 0.7; C.jerk = Math.max(C.jerk, 0.1);
    }
    C.boneCrackT[i] = Math.max(0, (C.boneCrackT[i] || 0) - dt);
    SQ[i] = want < SQ[i] ? want : damp(SQ[i], want, 2.2, dt);
  }
  // 4. corners and chords: every joint, and every bone along its length, pushed off whatever it still touches
  for (let pass = 0; pass < 2; pass++) {
    // (the squeeze above already made every part fit the gap it is in, so its full squeezed width is used)
    for (let i = 0; i < 9; i++) {
      if (vent[i]) continue;
      pushOff(L, J[i], jW(i) * Math.min(i > 0 ? SQ[i - 1] : 1, i < 8 ? SQ[i] : 1), wallBody);
    }
    for (let i = 0; i < 8; i++) if (!vent[i] && !vent[i + 1]) {
      const r = EX[i][0] * SQ[i];
      fitSegment(L, J[i], J[i + 1], r, r, wallBody);
    }
  }
  // 5. floor and ceiling. Lying along the floor, its depth is its height; stood up, its length is - and the
  //    top of its length is the head, which is dealt with on its own below.
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 8; i++) {
    const a = J[i], b = J[i + 1];
    const dh = Math.hypot(b.x - a.x, b.z - a.z), len = Math.hypot(dh, b.y - a.y) || 1;
    const h = EX[i][1] * (dh / len) + 0.02, wr = EX[i][0] * SQ[i];
    SQZ[i] = Math.min(fitHeight(L, a, h, fy, wr), fitHeight(L, b, h, fy, wr));
  }
  // and the guarantee: whatever the passes above did between them, no joint ends the frame in a wall
  for (let i = 0; i < 9; i++) {
    if (vent[i] || !inWall(L, J[i].x, J[i].z, wallBody)) continue;
    const anchor = i <= 5 ? trailAt(SD[i], cU2) : J[i - 1];
    lineTo(L, anchor, J[i], wallBody, _fx); J[i].x = _fx.x; J[i].z = _fx.z;
  }
  holdBehind();

  // ----- head -----
  C.head.position.copy(J[8]);
  C.head.up.copy(UP).lerp(spineDir, 0.3);
  C.head.lookAt(C.look);
  if (O && O.faceOn) {
    // full face on to whoever it has: tipped back just enough to show the inside of the mouth, shaking with it
    C.head.rotateX(-0.14 + Math.sin(t * 47) * 0.025);
    C.head.rotateZ(Math.sin(t * 55) * 0.05 + Math.sin(t * 3.1) * 0.12);
  } else {
    C.head.rotateX(-0.2 - C.jaw * 0.25 + (tw.t > 0 ? tw.x : 0));
    C.head.rotateY(tw.t > 0 ? tw.y : Math.sin(t * 0.6) * 0.1);
    // crawling, it turns its head sideways, sometimes almost upside down
    const roll = (1 - u) * (0.9 + 0.5 * Math.sin(t * 0.23)) * (mode === 'run' ? 0.5 : 1) + (tw.t > 0 ? tw.z : 0) + Math.sin(t * 0.5) * 0.15;
    C.head.rotateZ(roll);
    if (screaming) C.head.rotateZ(Math.sin(t * 55) * 0.05);
  }
  C.jawPivot.rotation.x = C.jaw;
  // The head is checked point by point against the actual skull, jaw and teeth - open jaw included - and
  // backed off anything it would touch. The neck bends to follow it rather than letting it through.
  fitHead(L, fy, J, wallBody);
  // and its face kept behind the cover - measured off the skull and the teeth themselves
  if (EP) {
    C.head.updateMatrixWorld(true);
    let worst = -Infinity;
    for (const hp of C.headPts) { _hpW.copy(hp.p).applyMatrix4(hp.m.matrixWorld); worst = Math.max(worst, (_hpW.x - EP.x) * EP.nx + (_hpW.z - EP.z) * EP.nz); }
    const over = worst + EP.m * 0.25 + 0.03;
    if (over > 0) { C.head.position.x -= EP.nx * over; C.head.position.z -= EP.nz * over; J[8].x -= EP.nx * over; J[8].z -= EP.nz * over; J[7].x -= EP.nx * over * 0.6; J[7].z -= EP.nz * over * 0.6; }
  }

  for (let i = 0; i < 8; i++) {
    cH.subVectors(J[i + 1], J[i]);
    const hl = Math.hypot(cH.x, cH.z);
    const ref = hl > 0.25 ? cG.set(cH.z / hl, 0, -cH.x / hl) : S;
    setBone(C.spine.bones[i], J[i], J[i + 1], ref, SPINE_LENS[i], vent[i] ? 1 : SQ[i], SQZ[i]);
  }
  C.tongue.position.z = 0.05 + Math.max(0, C.jaw - 0.6) * 0.25;
  C.tongue.rotation.x = -Math.max(0, C.jaw - 0.4) * 0.4 + Math.sin(t * 6) * 0.05;
  C.head.getWorldPosition(C.headPos);
  C.headFwd.set(0, 0, 1).applyQuaternion(C.head.quaternion);
  // skin strings between the jaws
  for (const st of C.strings) {
    const a = cA.set(st.s * (0.2 - st.k * 0.02), -0.3, 0.04 + st.k * 0.07);
    const b = cB.set(st.s * (0.18 - st.k * 0.02), -0.01, 0.2 + st.k * 0.08).applyEuler(C.jawPivot.rotation).add(C.jawPivot.position);
    const d = a.distanceTo(b);
    st.m.visible = C.jaw > 0.45 && d < 0.75;
    if (st.m.visible) { st.m.position.copy(a).add(b).multiplyScalar(0.5); st.m.quaternion.setFromUnitVectors(YAXIS, cC.subVectors(b, a).normalize()); st.m.scale.set(1 - C.jaw * 0.35, d, 1 - C.jaw * 0.35); }
  }
  // eyes catch the flashlight
  if (camPos && C.eyeMat) {
    const tc = cA.subVectors(camPos, C.headPos), dist = tc.length(); tc.multiplyScalar(1 / Math.max(dist, 0.01));
    const facing = clamp((C.headFwd.dot(tc) - 0.3) / 0.6, 0, 1);
    R.camera.getWorldDirection(cB);
    const inBeam = clamp((-cB.dot(tc) - 0.93) / 0.05, 0, 1);
    C.eyeMat.emissiveIntensity = damp(C.eyeMat.emissiveIntensity, R.flashPower * facing * inBeam * clamp(1.4 - dist / 25, 0, 1) * 1.6, 12, dt);
  }

  // ----- legs -----
  const pel = cG.subVectors(J[1], J[0]).normalize().clone();
  const pelHl = Math.hypot(pel.x, pel.z);
  const pelSide = pelHl > 0.25 ? crV().set(pel.z / pelHl, 0, -pel.x / pelHl) : S.clone();
  const hipBase = crV().lerpVectors(J[0], J[1], 0.55);
  const stepLen = lerp(run ? 2.2 : 1.5, run ? 2.8 : 2.0, u);
  C.legs.forEach((leg, i) => {
    const out = pelSide.clone().multiplyScalar(leg.side);
    // the room on this side of the hips: in a gap narrower than its hips they come in and the legs
    // themselves go thinner - nothing of it is allowed through a wall to make room
    const lx = leg.ex, sideRoom = gapTo(L, hipBase, out.x, out.z, 2.5, wallBody);
    const lsq = clamp((sideRoom - 0.03) / (0.46 + lx[0][2]), 0.3, 1);
    leg.sq = lsq < (leg.sq || 1) ? lsq : damp(leg.sq || 1, lsq, 2.2, dt);
    const hip = hipBase.clone().addScaledVector(out, 0.46 * leg.sq).addScaledVector(UP, -0.06);
    fitPart(L, hip, lx[0][2] * leg.sq, hipBase, wallBody);
    // crawl: feet planted well behind, splayed as far as the corridor allows; upright: under the hips
    const back = trailAt(3.1 + 4.0 + (i ? 0.5 : 0), crV());
    const bdir = crV().subVectors(trailAt(3.1 + 3.4, crV()), back);
    const bl = Math.hypot(bdir.x, bdir.z) || 1;
    const bside = crV().set(bdir.z / bl, 0, -bdir.x / bl).multiplyScalar(leg.side);
    const wl = findWall(L, back, bside.x, bside.z, 1.5);
    const splay = wl < 0 ? 1.1 : clamp(wl - 0.3, 0.2, 1.1);
    const homeC = back.clone().addScaledVector(bside, splay);
    const homeU = crV().set(hipBase.x, 0, hipBase.z).addScaledVector(out, 0.72);
    // galloping, the hind legs come up under the hips to drive; crawling, they trail far behind, splayed
    const homeR = crV().set(hipBase.x, 0, hipBase.z).addScaledVector(F, -0.8).addScaledVector(out, clamp(halfW - 0.4, 0.5, 0.95));
    const home = (run ? homeR : homeC).lerp(homeU, u);
    home.y = floorAt(L, home.x, home.z);
    gaitLimb(leg, home, Gt.legs[i], Gt, dt, C.legs[1 - i], Gt.legArc * (0.75 + u * 0.4), stepLen * 1.25, 1, 'foot');
    const toe = leg.plant;
    // a foot only ever lands where the leg could get to in a straight line: never round a corner
    fitPart(L, toe, lx[3][3] + 0.01, hip, wallBody);
    // standing on the floor, not in it: the toe sits exactly a toe's depth up - measured, so it touches
    toe.y = Math.max(toe.y, floorAt(L, toe.x, toe.z) + lx[3][1] + 0.004);
    const fdir = crV().subVectors(toe, hip).setY(0);
    if (fdir.lengthSq() < 1e-4) fdir.copy(F);
    fdir.normalize();
    // the foot points along the body; the heel stays up
    const footFwd = crV().copy(F).lerp(fdir.multiplyScalar(-1), 0.5 * (1 - u)).normalize();
    leg.ball.copy(toe).addScaledVector(footFwd, -LEG_LENS[3] * 0.92).addScaledVector(UP, 0.07);
    leg.ank.copy(leg.ball).addScaledVector(footFwd, -LEG_LENS[2] * 0.82).addScaledVector(UP, LEG_LENS[2] * 0.55);
    fitPart(L, leg.ball, lx[3][2], toe, wallBody);
    fitPart(L, leg.ank, lx[2][2], leg.ball, wallBody);
    leg.ball.y = Math.max(leg.ball.y, floorAt(L, leg.ball.x, leg.ball.z) + Math.max(lx[3][1], lx[2][1]) + 0.004);
    leg.ank.y = Math.max(leg.ank.y, floorAt(L, leg.ank.x, leg.ank.z) + lx[2][1] + 0.004);
    // the foot and the toes along their length, from the toe back
    fitSegmentFrom(L, toe, leg.ball, lx[3][3], lx[3][2], wallBody);
    fitSegmentFrom(L, leg.ball, leg.ank, lx[2][3], lx[2][2], wallBody);
    const roomOut = clamp((halfW - 0.9) / 1.5, 0.08, 0.6);
    // knees: up and out when it crawls in a tight space, forward and out when it gallops, forward when it walks
    const pole = run
      ? crV().copy(UP).multiplyScalar(lerp(0.5, 0.15, u)).addScaledVector(out, lerp(Math.max(roomOut, 0.45), 0.25, u)).addScaledVector(F, lerp(0.55, 0.9, u)).normalize()
      : crV().copy(UP).multiplyScalar(lerp(0.85, 0.15, u)).addScaledVector(out, lerp(roomOut, 0.25, u)).addScaledVector(F, lerp(-0.15, 0.9, u)).normalize();
    solveTwoBone(hip, leg.ank, LEG_LENS[0], LEG_LENS[1], pole, leg.mid, cD);
    if (leg.mid.y > fy + C.ceilS - 0.2) { // knee would go through the ceiling: splay it out instead
      pole.copy(out).multiplyScalar(roomOut + 0.3).addScaledVector(UP, 0.15).addScaledVector(F, -0.5).normalize();
      solveTwoBone(hip, leg.ank, LEG_LENS[0], LEG_LENS[1], pole, leg.mid, cD);
    }
    leg.ank.copy(cD);
    // The hip is fixed to the body and the foot is planted; the ankle has to be reachable from both - from
    // the ball of the foot, and in a straight line from the hip, or no knee could ever join them without
    // crossing a wall. Then the knee, the only joint left free, is solved between hip and ankle.
    for (let pass = 0; pass < 3; pass++) {
      if (!clearLine(L, leg.ball, leg.ank, wallBody)) { lineTo(L, leg.ball, leg.ank, wallBody, _fx); leg.ank.x = _fx.x; leg.ank.z = _fx.z; }
      if (!clearLine(L, hip, leg.ank, wallBody)) { lineTo(L, hip, leg.ank, wallBody, _fx); leg.ank.x = _fx.x; leg.ank.z = _fx.z; }
    }
    pushOff(L, leg.ank, lx[2][2], wallBody);
    leg.ank.y = Math.max(leg.ank.y, floorAt(L, leg.ank.x, leg.ank.z) + lx[2][1] + 0.004);
    const kneeR = Math.max(lx[0][3], lx[1][2]) * leg.sq;
    fitHeight(L, leg.mid, kneeR, fy, kneeR);
    fitMiddle(L, hip, leg.mid, leg.ank, kneeR, wallBody);
    // the flesh of the thigh and the shin along their length - moving only the knee - then the knee
    // solved once more, in case keeping the flesh off one wall put a bone across another
    for (let pass = 0; pass < 2; pass++) {
      fitSegmentFrom(L, hip, leg.mid, lx[0][2] * leg.sq, lx[0][3] * leg.sq, wallBody);
      fitSegmentFrom(L, leg.ank, leg.mid, lx[1][3] * leg.sq, lx[1][2] * leg.sq, wallBody);
      fitMiddle(L, hip, leg.mid, leg.ank, kneeR, wallBody);
    }
    fitHeight(L, leg.mid, kneeR, fy, kneeR);
    const kneeRef = (a, b) => { const d = crV().subVectors(b, a).normalize(); const r = crV().crossVectors(d, pole); return r.lengthSq() > 1e-4 ? r.normalize() : out; };
    // the bones stretch to whatever their joints ended up as, so the leg never comes apart at the knee
    setBone(leg.body.bones[0], hip, leg.mid, kneeRef(hip, leg.mid), LEG_LENS[0], leg.sq, leg.sq);
    setBone(leg.body.bones[1], leg.mid, leg.ank, kneeRef(leg.mid, leg.ank), LEG_LENS[1], leg.sq, leg.sq);
    const footRef = crV().crossVectors(footFwd, UP).normalize();
    setBone(leg.body.bones[2], leg.ank, leg.ball, footRef, LEG_LENS[2]);
    // The toe claw: never into a wall in front of it. If it would be, the toe draws back along the foot -
    // a copy of it, so the planted foot itself does not creep.
    const toeV = crV().copy(toe), tfl = floorAt(L, toe.x, toe.z);
    setBone(leg.body.bones[3], leg.ball, toeV, footRef, LEG_LENS[3]);
    for (let tries = 0; tries < 8; tries++) {
      clawPoints(leg.body.bones[3], LEG_LENS[3], 0.28, _nt, _nm);
      if (!clawBad(L, _nt, 0.008, tfl, wallBody, null, null) && !clawBad(L, _nm, lx[3][3] * 0.6 + 0.008, tfl, wallBody, null, null)) break;
      toeV.lerp(leg.ball, 0.18);
      setBone(leg.body.bones[3], leg.ball, toeV, footRef, LEG_LENS[3]);
    }
  });

  // ----- arms -----
  const chestDir = crV().subVectors(J[5], J[4]).normalize();
  const chHl = Math.hypot(chestDir.x, chestDir.z);
  const chSide = chHl > 0.25 ? crV().set(chestDir.z / chHl, 0, -chestDir.x / chHl) : S.clone();
  const chUp = crV().crossVectors(chestDir, chSide).multiplyScalar(-1);
  C.arms.forEach((arm, i) => {
    const out = chSide.clone().multiplyScalar(arm.side);
    const ax = arm.ex, pb = arm.lens.length - 1, chestC = crV().lerpVectors(J[4], J[5], 0.78);
    // the shoulders ride on the chest: as wide apart as the chest is allowed to be here, and no wider
    const sOff = Math.min(clamp(halfW - 0.3, lerp(0.5, 0.26, C.squeeze), 0.78), EX[4][0] * SQ[4] * 0.85);
    const armRoom = gapTo(L, chestC, out.x, out.z, 2.5, wallBody);
    const asq = clamp((armRoom - 0.03) / (sOff + ax[0][2]), 0.35, 1);
    arm.sq = asq < (arm.sq || 1) ? asq : damp(arm.sq || 1, asq, 2.2, dt);
    const shoulder = chestC.clone().addScaledVector(out, sOff).addScaledVector(chUp, 0.06);
    fitPart(L, shoulder, ax[0][2] * arm.sq, chestC, wallBody);
    const og = O && O.hands ? O.hands[i] : null;
    const reachArm = !og && arm.side < 0 && (mode === 'reach' || mode === 'grab' || (C.override && C.override.reach));
    let goal, hanging = false;
    arm.onWall = false; arm.surfN.set(0, 1, 0);
    const pd = arm.palmDir || (arm.palmDir = crV());
    if (og) {
      // a hand the choreography is placing: exactly there, flat on what it is on
      goal = og.p.clone();
      arm.surfN.copy(og.n); arm.onSurf = og.on > 0.5; arm.onWall = arm.onSurf;
      arm.plant.copy(goal); arm.step = 1;
      pd.copy(og.f).addScaledVector(arm.surfN, -og.f.dot(arm.surfN));
      if (pd.lengthSq() < 1e-4) pd.copy(F); else pd.normalize();
    } else if (EP) {
      // still behind the cover: braced on the floor of the shaft beside its chest, fingers splayed sideways
      goal = arm.plant.set(shoulder.x - F.x * 0.25 + out.x * 0.55, floorAt(L, shoulder.x, shoulder.z), shoulder.z - F.z * 0.25 + out.z * 0.55);
      const al = (goal.x - EP.x) * EP.nx + (goal.z - EP.z) * EP.nz;
      if (al > -1.1) { goal.x -= EP.nx * (al + 1.1); goal.z -= EP.nz * (al + 1.1); }
      arm.surfN.set(0, 1, 0); arm.onSurf = true; arm.step = 1;
      pd.copy(out).addScaledVector(F, -0.2).normalize();
    } else if (reachArm) {
      // The hand goes exactly where the host put it, with no wobble added on top: what you can see of
      // it is the thing that can catch you, so the two must not disagree by even a few centimetres.
      goal = cA.set(net.lx, net.ly, net.lz);
      // played back from the host's plan against this machine's copy of the host's clock: smooth here
      // whatever the network is doing, and in the same place the host is testing it
      if (mode === 'reach' && rs && Array.isArray(net.pr) && net.pr.length >= 17 && Game.gt !== undefined) {
        reachHandAt(L, reachPivot(rs), net.pr, Game.gt, _rhC); goal.set(_rhC.x, _rhC.y, _rhC.z);
      }
      if (C.override && C.override.reach) goal.copy(C.override.reach);
      goal = goal.clone();
      // never inside a wall: back along the way it came in, through the doorway, to the last open point
      const g2 = rs ? reachGap(rs) : null;
      const via = g2 ? crV().set(g2.x, goal.y, g2.z) : shoulder;
      if (inWall(L, goal.x, goal.z, wallArm)) { lineTo(L, via, goal, wallArm, _fx); goal.x = _fx.x; goal.z = _fx.z; }
      const gc = ceilAt(L, goal.x, goal.z);
      // the palm lands flat on whatever it just hit - ceiling, floor, or the face of the wall it ran into,
      // found exactly, so the hand that slams into a wall ends up pressed against it, not half inside it
      const aw = crV().subVectors(goal, via).setY(0);
      const awl = Math.hypot(aw.x, aw.z) || 1; aw.x /= awl; aw.z /= awl;
      const wd = rayWall(L, goal.x, goal.z, aw.x, aw.z, 0.6, wallArm, _wn);
      // in the last stretch before it lands, it is ON the surface; in between it is in the air, clutching
      const holding = !!(C.override && C.override.reach);
      arm.onSurf = false;
      if (holding) arm.surfN.copy(UP);
      else if (gc - goal.y < 0.3) { arm.surfN.set(0, -1, 0); goal.y = gc; arm.onSurf = true; }
      else if (goal.y < 0.38) { arm.surfN.set(0, 1, 0); goal.y = floorAt(L, goal.x, goal.z); arm.onSurf = true; }
      else if (wd < 0.25) { arm.surfN.copy(_wn); goal.x += aw.x * wd; goal.z += aw.z * wd; if (_wn.x !== 0) goal.x = Math.round(goal.x); else goal.z = Math.round(goal.z); arm.onSurf = true; }
      else arm.surfN.copy(UP);
      arm.onWall = arm.onSurf;
      arm.plant.copy(goal);
      pd.subVectors(goal, via).normalize();
      pd.addScaledVector(arm.surfN, -pd.dot(arm.surfN));
      if (pd.lengthSq() < 1e-4) pd.copy(F); else pd.normalize();
    } else if (u > 0.55 && mode !== 'eat' && !run) {
      // standing: the arms hang to its knees and sway
      const total = arm.lens.reduce((a, b) => a + b, 0);
      const swing = Math.sin(PH + (i ? 0 : Math.PI)) * 0.75 * Math.min(1, C.speed / 1.5);
      goal = shoulder.clone().addScaledVector(out, 0.55 + Math.sin(t * 0.7 + i) * 0.15).addScaledVector(F, swing).addScaledVector(UP, -total * (0.8 - 0.08 * Math.abs(swing)));
      goal.y = Math.max(goal.y, fy + 0.3);
      arm.plant.lerp(goal, 1 - Math.exp(-dt * 5));
      // a hand hanging beside it in a corridor hangs against the wall, not through it
      fitPart(L, arm.plant, ax[pb][0] * arm.sq + 0.02, shoulder, wallBody);
      goal = arm.plant;
      hanging = true;
      pd.set(0, -1, 0).addScaledVector(F, 0.25).normalize();
      arm.surfN.copy(out).multiplyScalar(-1);
    } else {
      // crawling: brace on the walls far ahead, reach along the floor, sometimes the ceiling
      let home = null;
      if (mode !== 'eat') {
        const ang = C.yaw + arm.side * 0.9;
        const dx = Math.sin(ang), dz = Math.cos(ang);
        const d = rayWall(L, shoulder.x, shoulder.z, dx, dz, 2.6, wallBody, _wn);
        if (d < 2.6 && (arm.side > 0 || C.ceilS > 3.4 || (i + Math.floor(C.gait / Math.PI)) % 3 !== 0)) {
          const ahead = arm.side < 0 ? 4.6 : 3.4;
          // where the ray met the wall, slid forward along the wall itself and laid exactly on its face
          const hx = shoulder.x + dx * d, hz = shoulder.z + dz * d;
          home = crV().set(hx + F.x * ahead, clamp(shoulder.y + 0.35, fy + 1.0, fy + C.ceilS - 0.35), hz + F.z * ahead);
          if (_wn.x !== 0) home.x = Math.round(hx) + _wn.x * 0.003; else home.z = Math.round(hz) + _wn.z * 0.003;
          // the wall has to really continue that far: solid just behind the hand, open in front of it, and
          // a straight run from the shoulder to it
          const solidBehind = inWall(L, home.x - _wn.x * 0.05, home.z - _wn.z * 0.05, wallBody);
          const openFront = !inWall(L, home.x + _wn.x * 0.3, home.z + _wn.z * 0.3, wallBody);
          lineTo(L, shoulder, cU.set(home.x + _wn.x * 0.12, 0, home.z + _wn.z * 0.12), wallBody, _fx);
          const reachable = Math.abs(_fx.x - home.x - _wn.x * 0.12) + Math.abs(_fx.z - home.z - _wn.z * 0.12) < 1e-3;
          if (!solidBehind || !openFront || !reachable) home = null;
          else { arm.onWall = true; arm.surfN.set(_wn.x, 0, _wn.z); }
        } else if (C.ceilS < 3.5 && arm.side < 0) {
          home = crV().copy(shoulder).addScaledVector(F, 4.4).addScaledVector(out, 0.2);
          home.y = ceilAt(L, home.x, home.z);
          // only the low ceiling it is actually crawling under - never a tall room's roof it cannot reach -
          // and only somewhere a straight arm can get to from here
          const reachable = !inWall(L, home.x, home.z, wallBody) && home.y <= C.ceilS + 0.25 && clearLine(L, shoulder, home, wallBody);
          if (reachable) { arm.onWall = true; arm.surfN.set(0, -1, 0); } else home = null;
        }
      }
      if (!home) {
        let ahead = mode === 'eat' ? 1.8 : (arm.side < 0 ? 4.8 : 3.4) + (run ? 0.5 : 0);
        home = crV();
        for (; ahead > 1.2; ahead -= 0.4) { home.set(C.pos.x, 0, C.pos.z).addScaledVector(F, ahead).addScaledVector(out, Math.min(halfW - 0.25, 0.9)); if (openAt(L, home.x, home.z)) break; }
        if (mode === 'eat') home.set(net.lx + out.x * 0.7, 0, net.lz + out.z * 0.7);
        home.y = floorAt(L, home.x, home.z);
      }
      // A hand going onto a wall lands exactly where it was aimed - leading it along the body's velocity
      // like a foot would push it off the face, or into it. Between holds it peels off the wall and comes
      // back down on it, rather than sliding along the surface.
      gaitLimb(arm, home, Gt.arms[i], Gt, dt, C.arms[1 - i], arm.onWall ? 0.3 : Gt.armArc, arm.onWall ? 1.4 : stepLen * 1.3, arm.onWall ? 0 : 0.45, arm.onWall ? 'slap' : 'hand');
      if (arm.onWall && arm.step < 1 && arm.surfN.y === 0) arm.plant.addScaledVector(arm.surfN, Math.sin(Math.PI * arm.step) * 0.35);
      // a hand moving across a ceiling drops away from it between holds - the step's arc is turned over
      if (arm.onWall && arm.step < 1 && arm.surfN.y < -0.5) arm.plant.y -= 2 * Math.pow(Math.sin(Math.PI * Math.pow(arm.step, 0.8)), 0.9) * 0.3 + 0.0;
      // wherever the step has got it to, the hand is never in a wall, the floor or the ceiling
      fitPart(L, arm.plant, 0.003, shoulder, wallBody);
      arm.plant.y = clamp(arm.plant.y, floorAt(L, arm.plant.x, arm.plant.z), ceilAt(L, arm.plant.x, arm.plant.z));
      goal = arm.plant;
      // fingers point ahead along the surface (up the wall a little)
      const n = arm.surfN;
      pd.copy(F).addScaledVector(n.y > 0.5 ? out : UP, n.y > 0.5 ? 0.45 : (Math.abs(n.y) > 0.5 ? 0 : 0.8));
      pd.addScaledVector(n, -pd.dot(n)).normalize();
    }
    const lengths = arm.lens.slice(0, -1), palmLen = arm.lens[pb];
    if (!arm.initd) { arm.joints.forEach((j, k) => j.copy(shoulder).addScaledVector(out, 0.5 * k).addScaledVector(UP, -0.6 * k)); arm.initd = true; }
    arm.joints[0].copy(shoulder);
    // how much the hand is ON something: a planted crawling hand settles onto the surface over the last
    // fifth of its step, so it lands and flattens rather than snapping flat in a frame
    const contact = og ? og.on : EP ? 1 : reachArm ? (arm.onSurf ? 1 : 0) : hanging ? 0 : smoothstep(0.8, 1, arm.step);
    if (!reachArm) arm.onSurf = contact > 0.5;
    const freeW = crV().copy(goal).addScaledVector(pd, -palmLen * 0.5);
    let wristGoal = freeW;
    if (contact > 0) {
      // Flat on the surface: knuckles and fingers down on it, the heel of the hand raised exactly as much as
      // a wrist thicker than a palm needs. Both measured off the mesh, so it touches and never sinks in.
      const n = arm.surfN, lift = ax[pb][1] + 0.012, wristR = ax[pb - 1][3] * arm.sq;
      const sinT = clamp((wristR + 0.012 - lift) / palmLen, 0, 0.6) * contact, cosT = Math.sqrt(1 - sinT * sinT);
      const knuck = crV().copy(goal).addScaledVector(n, lift).addScaledVector(pd, palmLen * 0.4);
      pd.multiplyScalar(cosT).addScaledVector(n, -sinT).normalize();
      wristGoal = freeW.lerp(knuck.addScaledVector(pd, -palmLen), contact);
    }
    const armOut = hanging || reachArm ? 0.75 : clamp((halfW - 0.9) / 1.5, 0.1, 0.7);
    const pole = crV().copy(out).multiplyScalar(armOut).addScaledVector(UP, reachArm ? 0.2 : hanging ? -0.2 : 0.8).addScaledVector(F, hanging ? -0.6 : -0.35).normalize();
    if (lengths.length === 2) {
      solveTwoBone(shoulder, wristGoal, lengths[0], lengths[1], pole, arm.joints[1], arm.joints[2]);
      // an elbow through the ceiling folds back like a mantis instead
      if (arm.joints[1].y > fy + C.ceilS - 0.15) { pole.copy(F).multiplyScalar(-0.85).addScaledVector(UP, 0.25).addScaledVector(out, armOut * 0.5).normalize(); solveTwoBone(shoulder, wristGoal, lengths[0], lengths[1], pole, arm.joints[1], arm.joints[2]); }
    } else {
      fabrik(arm.joints, lengths, wristGoal, pole);
      for (let k = 1; k < arm.joints.length - 1; k++) arm.joints[k].y = Math.min(arm.joints[k].y, fy + C.ceilS - 0.12);
    }
    // elbows included: an arm folds against a wall rather than going through it. The reaching arm is
    // exempt - that one is meant to be through a doorway, and the host already keeps its hand in the room.
    if (reachArm && rs) {
      // The arm runs shoulder -> doorway -> hand and it bends AT the doorway: one of its joints is put exactly
      // in the opening, so the bones either side are straight lines through open air and nothing cuts the
      // corner of the frame. Where a stretch of it has two bones and slack, it bends instead of shortening -
      // an elbow cocked up outside the door, a second one arched under the ceiling inside the room, which
      // is how a long arm actually fits through a small gap.
      const rg = reachGap(rs), gp = new THREE.Vector3(rg.x, clamp((shoulder.y + goal.y) / 2, 0.7, 2.0), rg.z);
      const d1 = shoulder.distanceTo(gp), d2 = gp.distanceTo(wristGoal), nb = lengths.length;
      const sum = (a, b) => lengths.slice(a, b).reduce((p, q) => p + q, 0);
      // how far a stretch of bones has to stretch or squash to span a distance (two bones can bend: free)
      const cost = (d, a, b) => { const l = sum(a, b); return b - a >= 2 ? (d > l ? Math.log(d / l) : 0) : Math.abs(Math.log(d / l)); };
      let s = 1, best = Infinity;
      for (let k = 1; k < nb; k++) { const e = Math.max(cost(d1, 0, k), cost(d2, k, nb)); if (e < best) { best = e; s = k; } }
      const lay = (from, to, a, b, poleV) => {
        if (b - a === 2) solveTwoBone(arm.joints[a], to, lengths[a], lengths[a + 1], poleV, arm.joints[a + 1], arm.joints[b]);
        else { const l = sum(a, b); let acc = 0; for (let k = a + 1; k <= b; k++) { acc += lengths[k - 1]; arm.joints[k].lerpVectors(from, to, acc / l); } }
        arm.joints[b].copy(to);
      };
      lay(shoulder, gp, 0, s, crV().copy(UP).addScaledVector(out, 0.4).normalize());
      lay(gp, wristGoal, s, nb, crV().copy(UP).addScaledVector(rs.dir.x !== undefined ? crV(rs.dir.x, 0, rs.dir.z) : F, -0.2).normalize());
    }
    // Every joint off the walls by its own thickness, link by link out from the shoulder - so no stretch of
    // the arm can pass a wall between two joints - then every bone checked along its length. A hand on a
    // surface stays exactly where it was put; it is the elbow that gives.
    const aw = reachArm ? wallArm : wallBody, nj = arm.joints.length;
    for (let k = 1; k < nj; k++) {
      const r = Math.max(ax[k - 1][3], k < pb ? ax[k][2] : 0) * arm.sq;
      if (k === nj - 1 && arm.onSurf) continue;
      fitPart(L, arm.joints[k], r, arm.joints[k - 1], aw);
      fitHeight(L, arm.joints[k], r, fy, r);
    }
    // a hand that is on something is fixed there, and so is the shoulder: the elbows between them are what
    // give - each solved so that neither bone through it crosses a wall
    if (arm.onSurf && nj >= 3 && !(reachArm && rs)) {
      const w = arm.joints[nj - 1];
      if (!clearLine(L, shoulder, w, aw)) { lineTo(L, shoulder, w, aw, _fx); w.x = _fx.x; w.z = _fx.z; }
      for (let k = nj - 2; k >= 1; k--) fitMiddle(L, arm.joints[k - 1], arm.joints[k], arm.joints[k + 1], Math.max(ax[k - 1][3], ax[k][2]) * arm.sq, aw);
    }
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < lengths.length; k++) {
      if (k === lengths.length - 1 && arm.onSurf) fitSegmentFrom(L, arm.joints[k + 1], arm.joints[k], ax[k][3] * arm.sq, ax[k][2] * arm.sq, aw);
      else fitSegmentFrom(L, arm.joints[k], arm.joints[k + 1], ax[k][2] * arm.sq, ax[k][3] * arm.sq, aw);
    }
    // then the hand itself, as a whole, before any bone is set - and the forearm to it, which on a hand
    // that is holding onto something means moving the elbow, never the hand
    fitHand(L, arm, aw);
    if (arm.onSurf) {
      fitSegmentFrom(L, arm.joints[nj - 1], arm.joints[nj - 2], ax[nj - 2][3] * arm.sq, ax[nj - 2][2] * arm.sq, aw);
      if (nj >= 3) fitSegmentFrom(L, arm.joints[nj - 3], arm.joints[nj - 2], ax[nj - 3][2] * arm.sq, ax[nj - 3][3] * arm.sq, aw);
    } else fitSegmentFrom(L, arm.joints[nj - 2], arm.joints[nj - 1], ax[nj - 2][2] * arm.sq, ax[nj - 2][3] * arm.sq, aw);
    // behind the cover, the elbows too
    if (EP) for (let k = 1; k < nj; k++) {
      const al = (arm.joints[k].x - EP.x) * EP.nx + (arm.joints[k].z - EP.z) * EP.nz, m = EP.m + 0.25;
      if (al > -m) { arm.joints[k].x -= EP.nx * (al + m); arm.joints[k].z -= EP.nz * (al + m); }
    }
    for (let k = 0; k < lengths.length; k++) {
      const d = crV().subVectors(arm.joints[k + 1], arm.joints[k]).normalize(), r = crV().crossVectors(d, pole);
      setBone(arm.body.bones[k], arm.joints[k], arm.joints[k + 1], r.lengthSq() > 1e-4 ? r.normalize() : out, lengths[k], arm.sq, arm.sq);
    }
    poseHand(arm, t, reachArm, mode, out, goal, L, aw, fy);
  });
}

// gaits: stride is metres per full cycle; offsets are where in the cycle each limb lifts; duty is the share of the cycle a limb is planted
const GAITS = {
  walk: { stride: 3.9, duty: 0.62, legs: [0.0, 0.5], arms: [0.5, 0.0], bob: 0.11, sway: 0.2, lunge: 0.0, wave: 0.0, legArc: 0.5, armArc: 0.5 },
  crawl: { stride: 2.7, duty: 0.7, legs: [0.0, 0.5], arms: [0.25, 0.75], bob: 0.05, sway: 0.08, lunge: 0.14, wave: 0.26, legArc: 0.3, armArc: 0.55 },
  run: { stride: 5.6, duty: 0.4, legs: [0.0, 0.12], arms: [0.52, 0.62], bob: 0.24, sway: 0.04, lunge: 0.45, wave: 0.1, legArc: 0.55, armArc: 0.85 },
};
// One limb on the gait clock. It lifts when its offset comes round (once per cycle), swings to where it should land
// (half a stance ahead of home, so it passes under the body mid-stance), and slams down. A limb left far behind
// (turning on the spot, stopping) takes a settling step on its own, never while its partner is in the air.
function gaitLimb(limb, home, off, G, dt, partner, arc, settle, leadK, sound) {
  const C = Creature;
  const ph = C.phase + off, cyc = Math.floor(ph), local = ph - cyc;
  const swingFrac = 1 - G.duty, cycleT = G.stride * C.strideK / Math.max(C.speed, 0.7);
  const lead = Math.min(C.speed, 7) * G.duty * cycleT * 0.5 * leadK;
  const vl = Math.hypot(C.velS.x, C.velS.z);
  const tgt = cA.copy(home);
  if (vl > 0.05) tgt.addScaledVector(C.velS, lead / vl);
  tgt.y = home.y;
  if (limb.step < 1) {
    limb.step = Math.min(1, limb.step + dt / limb.dur);
    // steer the landing while the limb is still rising
    if (limb.step < 0.55) limb.to.lerp(tgt, 1 - Math.exp(-dt * 10));
    const k = limb.step, e = k * k * (3 - 2 * k);
    limb.plant.lerpVectors(limb.from, limb.to, e);
    limb.plant.y += Math.pow(Math.sin(Math.PI * Math.pow(k, 0.8)), 0.9) * arc;
    if (limb.step >= 1) { limb.plant.copy(limb.to); C.events.push({ kind: sound, x: limb.to.x, y: limb.to.y, z: limb.to.z }); }
    return;
  }
  const due = C.speed > 0.15 && local < swingFrac && limb.cyc !== cyc;
  const far = limb.plant.distanceTo(home) > settle && (!partner || partner.step >= 1);
  if (due || far) {
    limb.cyc = cyc;
    limb.from.copy(limb.plant); limb.to.copy(tgt);
    limb.dur = due ? clamp(swingFrac * cycleT * (0.9 + Math.random() * 0.2), 0.16, 0.75) : 0.34 + Math.random() * 0.1;
    limb.step = 0;
  }
}

function resetPlants(L) {
  const C = Creature;
  _bLocks = typeof Game !== 'undefined' && Game.g ? openLocksOf(Game.g) : [];
  const fx = Math.sin(C.yaw), fz = Math.cos(C.yaw), sx = Math.cos(C.yaw), sz = -Math.sin(C.yaw);
  // Every hand and foot starts somewhere it could really be the moment it appears: wherever it would go,
  // brought back in a straight line from the body until it is clear of every wall. A spawn in a corridor
  // must not open with both hands inside the walls for a frame.
  const settle = (p, base) => {
    lineTo(L, base, p, wallBody, _fx); p.x = _fx.x; p.z = _fx.z;
    pushOff(L, p, 0.15, wallBody);
    if (inWall(L, p.x, p.z, wallBody)) { p.x = base.x; p.z = base.z; }
    p.y = floorAt(L, p.x, p.z);
  };
  C.legs.forEach((l) => {
    const base = trailAt(5.0, crV());
    l.plant.copy(base); l.plant.x += sx * l.side * 0.7; l.plant.z += sz * l.side * 0.7;
    settle(l.plant, base); l.step = 1; l.sq = 1;
  });
  C.arms.forEach((a) => {
    a.plant.set(C.pos.x + sx * a.side * 0.8 + fx * 2.0, 0, C.pos.z + sz * a.side * 0.8 + fz * 2.0);
    settle(a.plant, C.pos); a.step = 1; a.initd = false; a.sq = 1;
  });
  // and the body starts out as narrow as wherever it appeared needs it to be
  if (C.sq) C.sq.fill(0.3);
}

function stepLimb(limb, home, threshold, dur, dt, partner, arc, sound) {
  if (limb.step < 1) {
    limb.step = Math.min(1, limb.step + dt / dur);
    const e = smooth01(limb.step);
    limb.plant.lerpVectors(limb.from, limb.to, e);
    limb.plant.y += Math.sin(Math.PI * limb.step) * arc;
    if (limb.step >= 1) Creature.events.push({ kind: sound, x: limb.to.x, y: limb.to.y, z: limb.to.z });
    return;
  }
  if (limb.plant.distanceTo(home) > threshold && (!partner || partner.step >= 1 || partner.step > 0.6)) {
    limb.from.copy(limb.plant);
    limb.to.copy(home).addScaledVector(cA.copy(home).sub(limb.plant).setY(0).normalize(), threshold * 0.35);
    if (sound === 'foot' || sound === 'hand') limb.to.y = home.y;
    limb.step = 0;
  }
}

// The claw past the end of a fingertip or a toe: where its tip and its middle are for the bone as posed.
// (skinnedBody builds the nail on to the end of a chain's last bone, curving toward that bone's local +z.)
function clawPoints(bone, len, nail, tip, mid) {
  bone.updateMatrix();
  tip.set(0, len + nail * 1.04, nail * 0.47).applyMatrix4(bone.matrix);
  mid.set(0, len + nail * 0.55, nail * 0.16).applyMatrix4(bone.matrix);
}
// is a point of claw, r thick there, inside anything: the surface it is on, a wall, the floor or the ceiling?
function clawBad(L, c, r, floorY, wall, surfP, nrm) {
  if (surfP && (c.x - surfP.x) * nrm.x + (c.y - surfP.y) * nrm.y + (c.z - surfP.z) * nrm.z < r) return true;
  if (c.y < floorY + r || c.y > ceilOver(L, c.x, c.z, r) - r) return true;
  return circleInWall(L, c.x, c.z, r, wall);
}

// The hand as one rigid thing - wrist, the four corners of the palm, the thumb's root and the base of every
// finger. If any of those would be inside a wall, the whole hand comes back out toward the forearm it hangs
// from, by the worst overlap, before a single finger is posed. Moving the wrist moves the end of the arm, so
// this runs before the arm's bones are set.
const _hs = Array.from({ length: 11 }, () => new THREE.Vector3()), _hd = crV(), _hsd = crV();
function fitHand(L, arm, wall) {
  const n = arm.lens.length - 1, wrist = arm.joints[n], anchor = arm.joints[n - 1];
  const palmLen = arm.lens[n], sq = arm.sq || 1, hw = arm.ex[n][0] * sq + 0.015;
  const dir = _hd.copy(arm.palmDir).normalize();
  const side = _hsd.crossVectors(arm.surfN, dir);
  if (side.lengthSq() < 1e-4) side.set(dir.z, 0, -dir.x);
  side.normalize();
  for (let it = 0; it < 8; it++) {
    const pe = cU.copy(wrist).addScaledVector(dir, palmLen);
    _hs[0].copy(wrist); _hs[1].copy(pe);
    _hs[2].copy(wrist).addScaledVector(side, hw); _hs[3].copy(wrist).addScaledVector(side, -hw);
    _hs[4].copy(pe).addScaledVector(side, hw); _hs[5].copy(pe).addScaledVector(side, -hw);
    _hs[6].copy(wrist).addScaledVector(dir, palmLen * 0.4).addScaledVector(side, -0.11 - 0.05);
    for (let f = 1; f < 5; f++) _hs[6 + f].copy(pe).addScaledVector(side, (f - 2.5) * 0.058 * 1.25);
    let bx = 0, bz = 0, worst = 0, up = 0, down = 0;
    const depth = arm.ex[n][1] * sq + 0.012, fl = floorAt(L, wrist.x, wrist.z);
    for (const p of _hs) {
      // between the floor and the ceiling, by the palm's own thickness - over whatever ceiling it is under
      const top = ceilOver(L, p.x, p.z, depth) - depth;
      if (p.y > top) down = Math.max(down, p.y - top);
      if (p.y < fl + depth) up = Math.max(up, fl + depth - p.y);
      if (!inWall(L, p.x, p.z, wall)) continue;
      lineTo(L, anchor, p, wall, _fx);
      const dx = _fx.x - p.x, dz = _fx.z - p.z, d2 = dx * dx + dz * dz;
      if (d2 > worst) { worst = d2; bx = dx; bz = dz; }
    }
    if (!worst && !up && !down) return;
    if (worst) { const m = Math.sqrt(worst); wrist.x += bx + (bx / m) * 0.02; wrist.z += bz + (bz / m) * 0.02; }
    wrist.y += up - down;
  }
}

// palm and fingers: flat and splayed on a surface, curled when hanging, clutching when reaching
function poseHand(arm, t, grasping, mode, out, goal, L, wall, fy) {
  const n = arm.lens.length - 1;
  const wrist = arm.joints[n];
  const palmLen = arm.lens[n];
  const nrm = arm.surfN.clone().normalize();
  const dir = arm.palmDir.clone().normalize();
  const palmEnd = arm.palmEnd.copy(wrist).addScaledVector(dir, palmLen);
  let pside = crV().crossVectors(nrm, dir);
  if (pside.lengthSq() < 1e-4) pside.copy(out);
  pside.normalize();
  const sq = arm.sq || 1;
  // the palm is as wide as its widest knuckle: if either edge of it would be in a wall (a hand braced
  // into a corner), the whole hand slides along until it is not
  if (L) for (const e of [1, -1]) {
    const hw = arm.ex[n][0] * sq + 0.01;
    for (const p of [wrist, palmEnd]) {
      cU.copy(p).addScaledVector(pside, e * hw);
      if (inWall(L, cU.x, cU.z, wall)) {
        const back = rayWall(L, cU.x, cU.z, -pside.x * e, -pside.z * e, hw + 0.02, (L2, gx, gz) => !wall(L2, gx, gz));
        wrist.addScaledVector(pside, -e * (back + 0.01)); palmEnd.addScaledVector(pside, -e * (back + 0.01));
      }
    }
  }
  setBone(arm.body.bones[n], wrist, palmEnd, pside, palmLen, sq, 1);
  const planted = arm.onSurf !== undefined ? arm.onSurf : (arm.onWall || (!grasping && arm.plant.y < 0.4));
  // the surface it is on, as a plane its fingers rest on and never go through
  const surfP = planted ? crV().copy(goal) : null;
  const fr = arm.ex[n + 1] ? Math.max(arm.ex[n + 1][0], arm.ex[n + 1][1]) * sq + 0.006 : 0.05;
  const curl0 = planted ? 0.08 : grasping ? 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * (mode === 'grab' ? 10 : 3.2))) : 0.5;
  for (let f = 0; f < 5; f++) {
    const bones = arm.body.chainBones[f + 1].map((bi) => arm.body.bones[bi]);
    const lens = arm.body.lens[f + 1];
    const spread = f === 0 ? -1.05 : (f - 2.5) * (planted ? 0.24 : 0.16);
    let d = crV().copy(dir).multiplyScalar(Math.cos(spread)).addScaledVector(pside, Math.sin(spread)).normalize();
    let p = f === 0 ? crV().copy(wrist).addScaledVector(dir, palmLen * 0.4).addScaledVector(pside, -0.11) : crV().copy(palmEnd).addScaledVector(pside, (f - 2.5) * 0.058);
    if (f === 0) d.addScaledVector(nrm, -0.3).normalize();
    // the root of the finger is on the hand, which has been fitted already - but make certain
    if (L && inWall(L, p.x, p.z, wall)) { lineTo(L, wrist, p, wall, _fx); p.x = _fx.x; p.z = _fx.z; }
    for (let k = 0; k < 3; k++) {
      // planted fingers press into the surface at the tips; hanging ones curl
      const curl = curl0 * (0.6 + k * 0.4) + (planted ? (k === 0 ? -0.12 : 0.18) : 0) + Math.sin(t * 6.5 + f * 1.3 + k) * (grasping ? 0.07 : 0.02) + (f === 0 ? 0.15 : 0);
      d = d.multiplyScalar(Math.cos(curl)).addScaledVector(nrm, -Math.sin(curl)).normalize();
      const bx = arm.ex[arm.body.chainBones[f + 1][k]], frk = Math.max(bx[0], bx[1]) * sq + 0.004;
      const q = crV();
      // Where the next joint of the finger can go. Pressed down onto a surface it comes to rest ON it - lifted
      // back above the plane by the finger's own thickness, knuckle bulge and all, which lays a long finger
      // flat along a wall instead of through it - and off every wall around it, along its whole length,
      // under the ceiling and above the floor. Every time the joint moves, all of that is applied again.
      const place = (len) => {
        q.copy(p).addScaledVector(d, len);
        if (surfP) { const above = cU.subVectors(q, surfP).dot(nrm); if (above < frk) q.addScaledVector(nrm, frk - above); }
        if (L) {
          if (inWall(L, q.x, q.z, wall)) { lineTo(L, p, q, wall, _fx); q.x = _fx.x; q.z = _fx.z; }
          pushOff(L, q, frk, wall);
          // reaching out over a much lower ceiling - a lintel - from up high: it stops short, sideways
          for (let t = 0; t < 8 && ceilOver(L, q.x, q.z, frk) - frk < q.y - 0.12; t++) q.lerp(p, 0.3);
          fitSegmentFrom(L, p, q, frk, frk, wall);
          q.y = clamp(q.y, (fy || 0) + frk, ceilOver(L, q.x, q.z, frk) - frk);
          // a finger never stretches to more than half again its length, whatever else happened
          const ql = q.distanceTo(p);
          if (ql > lens[k] * 1.5) q.sub(p).multiplyScalar(lens[k] * 1.5 / ql).add(p);
        }
        d.subVectors(q, p).normalize();
        setBone(bones[k], p, q, pside, lens[k], sq, sq);
      };
      place(lens[k]);
      // The claw goes on past the fingertip, curling toward whatever the hand is on. Its real tip is worked
      // out from the bone as posed; while it would be in anything the finger lifts a little, until the claw
      // rests on the surface instead of sinking into it. If it still cannot clear - a hand jammed into a
      // corner - the last joint draws in, claw and all, which always can.
      if (k === 2 && L) {
        const nr = frk * 0.6 + 0.008, F0 = fy || 0;
        const bad = () => { clawPoints(bones[k], lens[k], arm.nail, _nt, _nm); return clawBad(L, _nt, 0.008, F0, wall, surfP, nrm) || clawBad(L, _nm, nr, F0, wall, surfP, nrm); };
        let tries = 0;
        while (bad() && tries++ < 12) {
          const c = clawBad(L, _nt, 0.008, F0, wall, surfP, nrm) ? _nt : _nm;
          let lift = surfP ? nrm : UP;
          if (c.y < F0 + 0.06) lift = UP; else if (c.y > ceilAt(L, c.x, c.z) - 0.06) lift = _dn;
          if (circleInWall(L, c.x, c.z, 0.012, wall)) {
            lineTo(L, q, c, wall, _fx); cU.set(_fx.x - c.x, 0, _fx.z - c.z);
            if (cU.lengthSq() > 1e-8) d.addScaledVector(cU.normalize(), 0.3);
          }
          d.addScaledVector(lift, 0.22).normalize();
          place(lens[k]);
        }
        for (let s = 0.82; s > 0.08 && bad(); s -= 0.12) place(lens[k] * s);
      }
      p = q;
    }
  }
}
