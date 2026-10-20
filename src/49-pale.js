// ================= the Pale: what kept the hatch on A-1 shut =================
// The bunker's last garrison went into the dark with their tags still on. What came back up is three metres of
// skin over bone: arms to its knees, fingers like a hand of knives, a long skull with a mouth across all of
// it, and two black beads deep in the sockets. It does not hear, and light means nothing to it. It sees
// movement - only movement, but from a long way off - so the one thing that saves you is to stop. Stand still
// and it will walk right up to you, lean in close, and look, and look; and if you so much as twitch, it has you.

const P_SKIN = [0.58, 0.57, 0.55], P_BONE = [0.66, 0.64, 0.6], P_GREY = [0.46, 0.47, 0.49], P_SOCKET = [0.05, 0.04, 0.05];
const P_MOUTH = [0.12, 0.03, 0.04], P_SHADOW = [0.42, 0.4, 0.4];
const PALE_HEAD_BOX = [[-0.125, 2.5, -0.17], [0.125, 2.94, 0.19]];
const PALE_HAND_BOX = [[0.38, 0.8, -0.08], [0.53, 1.235, 0.12]];
const PALE_FOOT_BOX = [[0.05, -0.03, -0.1], [0.21, 0.13, 0.32]];
const PALE_FINE = [PALE_HEAD_BOX, PALE_HAND_BOX, mirrorBox(PALE_HAND_BOX), PALE_FOOT_BOX, mirrorBox(PALE_FOOT_BOX)];
// fingers: [z offset, first joint, second joint, thickness]
const PALE_FINGERS = [[0.032, 0.11, 0.09, 1], [0.011, 0.122, 0.1, 1.05], [-0.01, 0.116, 0.096, 1], [-0.03, 0.096, 0.08, 0.88]];
const PALE_TOES = [[0.103, 0.255], [0.118, 0.272], [0.133, 0.268], [0.148, 0.258], [0.161, 0.24]];
// its ribs: one pair of arcs a rung, back to front, the lower ones flaring out past a waist there is nothing in
const paleRibs = () => {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const y = 2.17 - i * 0.056, q = (y - 2.0) / 0.26, w = 0.15 * Math.sqrt(Math.max(0, 1 - q * q)) + 0.012 + i * 0.002;
    const bone = i < 5 ? 'chest' : 'spine';
    out.push({ c: [0.04, y - 0.075, 0.104, w, y - 0.02, 0.03, 0.013, 0.015], bone, k: 0.016, sym: true, tint: P_BONE });
    out.push({ c: [w, y - 0.02, 0.03, w * 0.72, y + 0.02, -0.1, 0.015, 0.013], bone, k: 0.016, sym: true });
  }
  return out;
};
const paleSpine = () => {
  const out = [];
  for (let i = 0; i < 13; i++) {
    const y = 2.32 - i * 0.075, z = y > 1.86 ? -0.128 : y > 1.55 ? -0.098 : -0.106;
    out.push({ e: [0, y, z, 0.017, 0.021, 0.019], bone: y > 1.86 ? 'chest' : y > 1.5 ? 'spine' : 'hips', k: 0.012, tint: P_BONE });
  }
  return out;
};

const PALE_DEF = {
  name: 'pale', skin: P_SKIN, weightLam: 0.03,
  bones: [
    ['hips', null, [0, 1.36, -0.02]], ['spine', 'hips', [0, 1.62, -0.04]], ['chest', 'spine', [0, 1.98, -0.06]],
    ['neck', 'chest', [0, 2.36, -0.04]], ['head', 'neck', [0, 2.58, 0.02]], ['jaw', 'head', [0, 2.635, 0.045]],
    ['clavL', 'chest', [0.06, 2.28, -0.04]], ['armL', 'clavL', [0.25, 2.27, -0.06]],
    ['elbowL', 'armL', [0.36, 1.72, -0.07]], ['handL', 'elbowL', [0.43, 1.2, -0.02]],
    ['fingL', 'handL', [0.455, 1.055, 0.0]], ['tipL', 'fingL', [0.462, 0.94, 0.0]], ['thumbL', 'handL', [0.43, 1.12, 0.04]],
    ['thighL', 'hips', [0.12, 1.32, 0.0]], ['shinL', 'thighL', [0.13, 0.72, 0.05]], ['footL', 'shinL', [0.13, 0.1, -0.01]], ['toeL', 'footL', [0.13, 0.03, 0.17]],
  ],
  shapes: [
    // ---- the trunk: a narrow pelvis with the hip bones standing out, nothing at the waist, a cage of ribs
    // under skin pulled tight, the spine a row of knuckles down the back, shoulder blades like wings ----
    { e: [0, 1.38, -0.02, 0.13, 0.09, 0.092], bone: 'hips', k: 0.05 },
    { e: [0.108, 1.455, 0.022, 0.038, 0.03, 0.05], bone: 'hips', k: 0.03, sym: true, tint: P_BONE },
    { e: [0, 1.42, -0.1, 0.05, 0.05, 0.03], bone: 'hips', k: 0.03 },
    { c: [0, 1.42, -0.025, 0, 1.8, -0.045, 0.082, 0.098], bone: 'spine', k: 0.05 },
    { e: [0.04, 1.62, -0.072, 0.036, 0.13, 0.036], bone: 'spine', k: 0.03, sym: true },
    { e: [0, 2.0, -0.035, 0.145, 0.22, 0.108], bone: 'chest', k: 0.05 },
    { e: [0.068, 2.13, 0.035, 0.07, 0.06, 0.04], bone: 'chest', k: 0.03, sym: true },
    { c: [0, 2.19, 0.098, 0, 1.92, 0.112, 0.018, 0.014], bone: 'chest', k: 0.02, tint: P_BONE },
    ...paleRibs(),
    ...paleSpine(),
    { e: [0.1, 2.15, -0.112, 0.064, 0.086, 0.026], rot: [0, 0.3, 0.15], bone: 'chest', k: 0.025, sym: true, tint: P_BONE },
    { c: [0.03, 2.38, -0.06, 0.2, 2.27, -0.05, 0.03, 0.02], bone: 'chest', k: 0.03, sym: true },
    { c: [0.03, 2.27, 0.05, 0.22, 2.29, -0.01, 0.014, 0.012], bone: 'clavL', k: 0.015, sym: true, tint: P_BONE },
    // under the ribs it caves right in
    { e: [0, 1.74, 0.105, 0.085, 0.075, 0.045], bone: 'spine', k: 0.045, sub: true, tint: P_SHADOW },
    // ---- the neck: long, corded, the tendons standing out ----
    { c: [0, 2.3, -0.05, 0, 2.6, 0.0, 0.044, 0.037], bone: 'neck', k: 0.03 },
    { c: [0.03, 2.28, 0.03, 0.034, 2.58, 0.048, 0.012, 0.01], bone: 'neck', k: 0.015, sym: true },
    // ---- the head: a long skull, high at the back; a heavy brow over deep sockets; no nose, two slits; the
    // cheekbones and the hinge of the jaw standing out of hollow cheeks; a mouth from one side to the other ----
    { e: [0, 2.75, -0.005, 0.092, 0.125, 0.116], bone: 'head', k: 0.04 },
    { e: [0, 2.78, -0.07, 0.082, 0.092, 0.07], bone: 'head', k: 0.04 },
    { e: [0, 2.775, 0.094, 0.084, 0.022, 0.03], bone: 'head', k: 0.02, tint: P_BONE },
    { e: [0.06, 2.705, 0.08, 0.03, 0.02, 0.04], bone: 'head', k: 0.015, sym: true, tint: P_BONE },
    { e: [0, 2.665, 0.085, 0.06, 0.055, 0.06], bone: 'head', k: 0.03 },
    { e: [0.07, 2.64, 0.03, 0.02, 0.025, 0.02], bone: 'head', k: 0.015, sym: true, tint: P_BONE },
    { e: [0, 2.643, 0.132, 0.056, 0.01, 0.02], bone: 'head', k: 0.01, tint: P_SHADOW },
    { e: [0, 2.602, 0.07, 0.064, 0.034, 0.07], bone: 'jaw', k: 0.025 },
    { e: [0, 2.586, 0.114, 0.025, 0.02, 0.02], bone: 'jaw', k: 0.015, tint: P_BONE },
    { e: [0, 2.624, 0.128, 0.05, 0.009, 0.02], bone: 'jaw', k: 0.01, tint: P_SHADOW },
    // ---- the arms: no muscle on them at all, knobs at the elbow and the wrist ----
    { e: [0.24, 2.26, -0.05, 0.058, 0.054, 0.058], bone: 'armL', k: 0.03, sym: true },
    { c: [0.25, 2.25, -0.06, 0.36, 1.74, -0.07, 0.04, 0.031], bone: 'armL', k: 0.025, sym: true },
    { e: [0.3, 2.05, -0.035, 0.024, 0.09, 0.024], bone: 'armL', k: 0.02, sym: true },
    { e: [0.364, 1.72, -0.098, 0.028, 0.034, 0.028], bone: 'elbowL', k: 0.015, sym: true, tint: P_BONE },
    { c: [0.36, 1.72, -0.07, 0.43, 1.22, -0.02, 0.033, 0.021], bone: 'elbowL', k: 0.02, sym: true },
    { e: [0.4, 1.5, -0.022, 0.019, 0.12, 0.019], bone: 'elbowL', k: 0.015, sym: true },
    { e: [0.44, 1.222, -0.034, 0.015, 0.015, 0.015], bone: 'elbowL', k: 0.01, sym: true, tint: P_BONE },
    // ---- the hands: narrow, and the fingers half as long again as they should be ----
    { e: [0.445, 1.13, 0.0, 0.016, 0.075, 0.041], bone: 'handL', k: 0.015, sym: true, tint: P_GREY },
    { c: [0.43, 1.12, 0.04, 0.44, 1.05, 0.075, 0.011, 0.009], bone: 'thumbL', k: 0.01, sym: true, tint: P_GREY },
    { c: [0.44, 1.05, 0.075, 0.445, 0.985, 0.09, 0.009, 0.007], bone: 'thumbL', k: 0.008, sym: true, tint: P_GREY },
    ...PALE_FINGERS.flatMap(([o, l1, l2, s]) => {
      const y1 = 1.055 - l1, y2 = y1 - l2;
      return [
        { e: [0.457, 1.055, o, 0.011 * s, 0.012 * s, 0.011 * s], bone: 'fingL', k: 0.008, sym: true, tint: P_GREY },
        { c: [0.455, 1.055, o, 0.462, y1, o, 0.0105 * s, 0.009 * s], bone: 'fingL', k: 0.008, sym: true, tint: P_GREY },
        { e: [0.462, y1, o, 0.0105 * s, 0.011 * s, 0.0105 * s], bone: 'tipL', k: 0.006, sym: true, tint: P_GREY },
        { c: [0.462, y1, o, 0.466, y2, o, 0.0088 * s, 0.0072 * s], bone: 'tipL', k: 0.007, sym: true, tint: P_GREY },
      ];
    }),
    // ---- the legs: long, thin, the knees like fists ----
    { c: [0.12, 1.33, 0.0, 0.13, 0.74, 0.05, 0.064, 0.044], bone: 'thighL', k: 0.03, sym: true },
    { e: [0.13, 1.08, 0.04, 0.044, 0.16, 0.044], bone: 'thighL', k: 0.025, sym: true },
    { e: [0.158, 1.28, 0.0, 0.03, 0.035, 0.03], bone: 'thighL', k: 0.02, sym: true, tint: P_BONE },
    { e: [0.13, 0.73, 0.05, 0.044, 0.05, 0.044], bone: 'shinL', k: 0.02, sym: true },
    { e: [0.13, 0.735, 0.098, 0.034, 0.038, 0.027], bone: 'shinL', k: 0.015, sym: true, tint: P_BONE },
    { c: [0.13, 0.72, 0.05, 0.13, 0.12, 0.0, 0.039, 0.025], bone: 'shinL', k: 0.02, sym: true },
    { e: [0.13, 0.55, 0.0, 0.034, 0.1, 0.034], bone: 'shinL', k: 0.02, sym: true },
    { c: [0.13, 0.68, 0.085, 0.13, 0.2, 0.04, 0.012, 0.01], bone: 'shinL', k: 0.012, sym: true, tint: P_BONE },
    { e: [0.155, 0.1, -0.01, 0.015, 0.018, 0.018], bone: 'shinL', k: 0.01, sym: true, tint: P_BONE },
    { e: [0.105, 0.11, -0.005, 0.014, 0.016, 0.016], bone: 'shinL', k: 0.01, sym: true, tint: P_BONE },
    // ---- the feet: long, narrow, toes like fingers ----
    { e: [0.13, 0.045, 0.06, 0.034, 0.03, 0.115], bone: 'footL', k: 0.02, sym: true, tint: P_GREY },
    { e: [0.13, 0.045, -0.05, 0.03, 0.035, 0.035], bone: 'footL', k: 0.02, sym: true, tint: P_GREY },
    ...PALE_TOES.map(([x, z]) => ({ c: [x, 0.03, 0.16, x + (x - 0.13) * 0.2, 0.016, z, 0.011, 0.008], bone: 'toeL', k: 0.008, sym: true, tint: P_GREY })),
    // ---- cut back in: the temples and cheeks hollow, the sockets, the slits, the ears, the mouth ----
    { e: [0.094, 2.74, 0.04, 0.02, 0.035, 0.03], bone: 'head', k: 0.02, sym: true, sub: true, tint: P_SHADOW },
    { e: [0.07, 2.652, 0.08, 0.02, 0.03, 0.035], bone: 'head', k: 0.02, sym: true, sub: true, tint: P_SHADOW },
    { e: [0.037, 2.735, 0.114, 0.026, 0.02, 0.025], bone: 'head', k: 0.012, sym: true, sub: true, tint: P_SOCKET },
    { e: [0.009, 2.69, 0.142, 0.006, 0.018, 0.014], bone: 'head', k: 0.006, sym: true, sub: true, tint: P_SOCKET },
    { e: [0.097, 2.7, 0.0, 0.008, 0.012, 0.01], bone: 'head', k: 0.006, sym: true, sub: true, tint: P_SOCKET },
    { e: [0, 2.633, 0.14, 0.058, 0.007, 0.05], bone: 'head', k: 0.008, sub: true, tint: P_MOUTH, wet: 0.6 },
  ],
  parts: [
    { name: 'body', lo: [-0.56, -0.05, -0.24], hi: [0.56, 3.0, 0.36], h: 0.014, keep: (x, y, z) => !PALE_FINE.some((b) => inBox(b, x, y, z, 0.014)) },
    { name: 'head', fine: true, lo: growBox(PALE_HEAD_BOX, 0.03)[0], hi: growBox(PALE_HEAD_BOX, 0.03)[1], h: 0.006, keep: (x, y, z) => inBox(PALE_HEAD_BOX, x, y, z) },
    { name: 'handL', fine: true, lo: growBox(PALE_HAND_BOX, 0.03)[0], hi: growBox(PALE_HAND_BOX, 0.03)[1], h: 0.0055, keep: (x, y, z) => inBox(PALE_HAND_BOX, x, y, z) },
    { name: 'handR', fine: true, lo: growBox(mirrorBox(PALE_HAND_BOX), 0.03)[0], hi: growBox(mirrorBox(PALE_HAND_BOX), 0.03)[1], h: 0.0055, keep: (x, y, z) => inBox(mirrorBox(PALE_HAND_BOX), x, y, z) },
    { name: 'footL', fine: true, lo: growBox(PALE_FOOT_BOX, 0.03)[0], hi: growBox(PALE_FOOT_BOX, 0.03)[1], h: 0.008, keep: (x, y, z) => inBox(PALE_FOOT_BOX, x, y, z) },
    { name: 'footR', fine: true, lo: growBox(mirrorBox(PALE_FOOT_BOX), 0.03)[0], hi: growBox(mirrorBox(PALE_FOOT_BOX), 0.03)[1], h: 0.008, keep: (x, y, z) => inBox(mirrorBox(PALE_FOOT_BOX), x, y, z) },
  ],
  // the lips part cleanly along the line of the mouth
  weightFix(x, y, z, acc, bi) {
    if (z < 0.09 || Math.abs(x) > 0.075 || y < 2.57 || y > 2.7) return;
    const line = 2.633 + 0.4 * x * x, k = smoothstep(line - 0.004, line + 0.004, y);
    const head = acc[bi.head], jaw = acc[bi.jaw], tot = head + jaw;
    if (tot <= 0) return;
    const keepK = smoothstep(0.06, 0.075, Math.abs(x));
    acc[bi.head] = lerp(tot * k, head, keepK); acc[bi.jaw] = lerp(tot * (1 - k), jaw, keepK);
  },
  jiggle: {},
  gait: { step: [0.78, 1.32], stance: 0.56, lift: 0.17, footX: 0.14, toeOut: 0.04, knee: 0.22, sway: 0.03, roll: 0.3, dip: 0.035, bounce: 0.035, squat: 0.14,
    twist: 0.1, lean: [0.3, 0.34, 0.62], breath: 0.22, breathAmp: 0.01, armSwing: 0.1, armOut: 0.1, elbow: 0.16, curl: 0.22,
    huntArms: 0.95, huntArmIn: -0.04, huntElbow: 0.3, huntClav: 0.1, huntNeck: 0.5, huntJaw: 0.45, jaw: 0.04, gruntJaw: 0.95,
    neckDown: -0.22, headDown: 0.12, headTilt: 0.22, headRate: 7, turnStep: 0.6, runFrom: 1.7, runTo: 4.0, stepPower: 2.4, unhinge: 0.14, twitch: 0.65 },
  skinMat: { rough: 0.5, coat: 0.45, coatRough: 0.34, sss: 0x5a3a46, poreF: 210 },
  skinGLSL: `
    // waxy and grey, faintly blotched, the veins showing through everywhere
    float mt = cF(vRest * 3.0);
    diffuseColor.rgb *= 0.86 + 0.24 * mt;
    float bFw = length(fwidth(vRest));
    float vn = cRidge(vRest * vec3(5.0, 8.0, 5.0) + vec3(1.0, 4.0, 2.0), 0.05) * smoothstep(0.4, 0.62, cN(vRest * 1.7 + 4.0)) * (1.0 - smoothstep(0.02, 0.06, bFw * 8.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.24, 0.33), vn * 0.55);
    bH += vn * 0.25;
    // the hands and feet gone grey-blue; the joints darker
    float ext = (1.0 - smoothstep(1.0, 1.3, vRest.y)) * smoothstep(0.33, 0.43, abs(vRest.x)) + (1.0 - smoothstep(0.05, 0.25, vRest.y));
    diffuseColor.rgb *= mix(vec3(1.0), vec3(0.7, 0.72, 0.8), clamp(ext, 0.0, 1.0));
    // soot and filth ground in from the floor up, and on the palms
    float dirt = (1.0 - smoothstep(0.0, 0.55, vRest.y)) * (0.5 + 0.5 * cN(vRest * 9.0));
    diffuseColor.rgb *= mix(vec3(1.0), vec3(0.42, 0.38, 0.34), dirt);
    bRough = mix(bRough, 0.85, dirt);
    // the skin over the bones stretched thin and shining
    bWet = max(bWet, smoothstep(0.55, 0.8, cN(vRest * 6.0)) * 0.25 * step(1.8, vRest.y) * step(vRest.y, 2.25));
    // the mouth and chin black with old blood; the hands and the front of it with fresh, after
    float gm = 1.0 - smoothstep(0.02, 0.1, length((vRest - vec3(0.0, 2.6, 0.13)) * vec3(1.0, 0.7, 1.4)));
    float gc = (1.0 - smoothstep(0.012, 0.03, abs(vRest.x + 0.02 * sin(vRest.y * 25.0)))) * step(2.0, vRest.y) * step(vRest.y, 2.58) * step(0.06, vRest.z) * smoothstep(0.35, 0.6, cN(vec3(vRest.x * 30.0, vRest.y * 4.0, 1.0)));
    float gh = (1.0 - smoothstep(0.95, 1.2, vRest.y)) * smoothstep(0.38, 0.42, abs(vRest.x));
    float gore = clamp(gm * (0.45 + uGore) + (gc + gh * 0.8) * uGore, 0.0, 1.0) * (0.55 + 0.45 * cN(vRest * 30.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.01, 0.01), gore * 0.92);
    bWet = max(bWet, gore * 0.9);`,
  extras: paleExtras,
};

// ---------- what isn't skin: the eyes, the teeth, the claws, and the tags it still wears ----------
function paleExtras(B) {
  const lidM = plainMat(0x5a5856, { roughness: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: 0x030304, roughness: 0.04, metalness: 0.3 });
  for (const s of [-1, 1]) beastEye(B, 'head', s * 0.037, 2.733, 0.108, 0.0125, s, { mat: black, lidMat: lidM, lidOpen: -0.35, wrong: s > 0 ? -0.06 : 0 });
  const throat = new THREE.Mesh(sphereGeo(1, 14, 10), plainMat(0x140304, { roughness: 0.4 })); throat.scale.set(0.05, 0.036, 0.05);
  beastAttach(B, 'head', throat, 0, 2.625, 0.075);
  const tongue = new THREE.Mesh(sphereGeo(1, 16, 10), plainMat(0x4a2026, { roughness: 0.25 })); tongue.scale.set(0.03, 0.009, 0.055);
  beastAttach(B, 'jaw', tongue, 0, 2.61, 0.085);
  // two rows of needles, far too many of them
  const gumMat = plainMat(0x2a1214, { roughness: 0.35 }), toothMat = plainMat(0xa89a7a, { roughness: 0.3 });
  beastTeeth(B, 'head', 2.639, -1, 0.108, 0.048, { n: 20, seed: 31, len: 0.021, w: 0.0062, gumH: 0.03, gumMat, toothMat });
  beastTeeth(B, 'jaw', 2.627, 1, 0.103, 0.044, { n: 19, seed: 37, len: 0.019, w: 0.0058, gumH: 0.03, fang: [3, 15], gumMat, toothMat });
  // black claws, long, on every finger and toe
  const claw = plainMat(0x0c0a0a, { roughness: 0.25 });
  const clawGeo = cachedGeo('paleClaw', () => { const g = new THREE.ConeGeometry(0.006, 0.05, 6); g.translate(0, -0.025, 0); return g; });
  for (const s of [1, -1]) {
    const S = s > 0 ? 'L' : 'R';
    for (const [o, l1, l2, k] of PALE_FINGERS) {
      const c = new THREE.Mesh(clawGeo, claw); c.scale.set(k, k, k * 0.7); c.rotation.x = 0.25;
      beastAttach(B, 'tip' + S, c, s * 0.466, 1.055 - l1 - l2 + 0.008, o + 0.004);
    }
    const tc = new THREE.Mesh(clawGeo, claw); tc.scale.set(0.8, 0.7, 0.6); tc.rotation.x = 0.9;
    beastAttach(B, 'thumb' + S, tc, s * 0.445, 0.988, 0.094);
    for (const [x, z] of PALE_TOES) { const c = new THREE.Mesh(clawGeo, claw); c.scale.set(0.8, 0.45, 0.6); c.rotation.x = Math.PI / 2 + 0.3; beastAttach(B, 'toe' + S, c, s * (x + (x - 0.13) * 0.2), 0.016, z + 0.008); }
  }
  // its tags, on their chain: A-1 GARRISON. And what is left of a belt.
  const steel = plainMat(0x9a9c98, { roughness: 0.3, metalness: 0.9 });
  const chain = new THREE.Mesh(torusGeo(0.062, 0.0018, 4, 32), steel); chain.rotation.set(Math.PI / 2 + 0.55, 0, 0);
  beastAttach(B, 'neck', chain, 0, 2.33, 0.0);
  for (const [x, rz] of [[-0.008, 0.12], [0.01, -0.08]]) {
    const tag = new THREE.Mesh(cboxGeo(0.026, 0.044, 0.0022, 0.004), steel); tag.rotation.set(-0.15, 0, rz);
    beastAttach(B, 'chest', tag, x, 2.205, 0.122);
  }
  const olive = mat('fabric', { color: 0x3a3a26 });
  const belt = new THREE.Mesh(torusGeo(1, 0.11, 6, 30), plainMat(0x2a2016, { roughness: 0.6 })); belt.scale.set(0.135, 0.1, 0.098); belt.rotation.x = Math.PI / 2;
  beastAttach(B, 'hips', belt, 0, 1.43, -0.02);
  const buckle = new THREE.Mesh(cboxGeo(0.04, 0.032, 0.008, 0.003), plainMat(0x6a6a5a, { roughness: 0.35, metalness: 0.9 })); beastAttach(B, 'hips', buckle, 0, 1.43, 0.078);
  const rag = new THREE.Mesh(cboxGeo(0.07, 0.34, 0.006, 0.003), olive); rag.rotation.set(0.05, 0.3, 0.06); beastAttach(B, 'thighL', rag, 0.16, 1.18, 0.05);
  const rag2 = new THREE.Mesh(cboxGeo(0.05, 0.2, 0.006, 0.003), olive); rag2.rotation.set(-0.05, -0.4, -0.1); beastAttach(B, 'hips', rag2, -0.12, 1.3, -0.06);
}

// ---------- the one in the level ----------
const Pale = makeBeast(PALE_DEF);
function buildPale(scene) { return buildBeast(Pale, scene); }
function paleBuildStep(budgetMs, scene) { return beastBuildStep(Pale, budgetMs, scene); }
function palePose(dt, t) { bipedPose(Pale, dt, t); if (Pale.mats.length) for (const m of Pale.mats) m.userData.U.uGore.value = Pale.gore; }
function paleClick() { Pale.gruntT = 0.5; }
function setPaleVisible(v) { setBeastVisible(Pale, v); }

// ================= the host's Pale =================
// It prowls at a long, light walk, and when something moves in front of it, it goes for it at a run you can
// only beat flat out. It turns fast. It loses you the moment you stop: then it goes to where you were, and
// looks. If it finds you there - right there, close enough to touch - it leans in, and waits for you to move.
const PALE_WALK = 1.55, PALE_HUNT = 4.3, PALE_GRAB = 1.5;
function paleNewRound(g) {
  const L = Game.L, first = L.chudSpots.findIndex((s) => !!s), sp = L.chudSpots[first] || { x: 0, z: 0 };
  g.pa = { x: r2(sp.x), z: r2(sp.z), y: 0, s: 0, m: first >= 0 ? 'idle' : 'hidden', a: first, lx: 0, lz: 0, sn: 0 };
  Game.ps = { state: 'idle', timer: 4, path: null, pi: 0, sus: {}, target: null, last: null, area: first, relocate: -1, stuck: 0, sniff: null };
}
// where it can go: anywhere a person can stand except the shelters, through any door that is open
function paleCellOk(L, k, open) { return !!L.cwalk[k] && (L.lockAt[k] < 0 || !!open[L.lockAt[k]]); }
const paleOk = (L, x, z, open) => { const gx = Math.floor(x), gz = Math.floor(z); return inGrid(L, gx, gz) && paleCellOk(L, gz * L.W + gx, open); };
// Can it see this player move? Nothing else registers: not light, not sound. Running is seen from right across
// a hall, walking from most of the way, creeping only up close. Working at something counts as moving.
function paleSees(g, p, L, open) {
  const pa = g.pa, dx = p.x - pa.x, dz = p.z - pa.z, d = Math.hypot(dx, dz);
  const mv = (p.mv || 0) + (p.h ? 0.9 : 0);
  if (mv < 0.25 || d > 30) return 0;
  const fx = Math.sin(pa.y), fz = Math.cos(pa.y);
  if (d > 0.9 && (dx * fx + dz * fz) / Math.max(d, 1e-3) < Math.cos(1.2)) return 0;
  if (!lineOfSight(L, pa.x, pa.z, p.x, p.z, open)) return 0;
  const m = clamp(mv / WALK_SPEED, 0, 2.1), reach = 6 + 11 * m;
  if (d > reach) return 0;
  return (0.8 + m * 1.4) * clamp(1.3 - d / reach, 0.2, 1);
}
function paleTick(g, living, players, dt, open) {
  const L = Game.L, ps = Game.ps, pa = g.pa;
  if (!ps || !pa) return;
  // a new area for the team: it is there ahead of them, somewhere, while nobody is looking at it
  if (g.ca > ps.area && L.chudSpots[g.ca] && ps.state !== 'grab') {
    if (ps.relocate < 0) ps.relocate = 8 + Math.random() * 8;
    ps.relocate -= dt;
    const watched = living.some((p) => { const dx = p.x - pa.x, dz = p.z - pa.z; return Math.hypot(dx, dz) < 24 && lineOfSight(L, p.x, p.z, pa.x, pa.z, open); });
    if (ps.relocate <= 0 && !watched) {
      const sp = L.chudSpots[g.ca];
      pa.x = r2(sp.x); pa.z = r2(sp.z); pa.a = g.ca; ps.area = g.ca; ps.state = 'idle'; ps.timer = 3; ps.path = null; ps.sus = {}; ps.target = null; ps.relocate = -1; ps.sniff = null;
      pa.m = 'idle'; pa.s = 0;
    }
  }
  if (pa.m === 'hidden') return;
  // the hatch cycling: the klaxon and the lamps draw it straight there
  if (g.lift && g.lift.st === 1 && !ps.drawn && ps.area === L.areas.length - 1) {
    ps.drawn = true;
    const dev = L.devices.find((d) => d.type === 'u');
    if (dev) { ps.state = 'hunt'; ps.last = { x: dev.x, z: dev.z }; ps.path = null; hostEvent(g, 'paleSaw', { x: r2(pa.x), z: r2(pa.z), who: '' }); }
  }
  // who is it watching move, and how sure is it
  let best = null, bestS = 0;
  for (const p of living) {
    const v = paleSees(g, p, L, open);
    ps.sus[p.id] = clamp((ps.sus[p.id] || 0) + (v > 0 ? v * dt * 1.6 : -dt * 0.9), 0, 1.5);
    if (v > 0 && ps.sus[p.id] >= 0.6 && (!best || ps.sus[p.id] > bestS)) { best = p; bestS = ps.sus[p.id]; }
  }
  for (const id in ps.sus) if (!living.some((p) => p.id === id)) delete ps.sus[id];
  if (ps.state === 'grab') { ps.timer -= dt; pa.s = 0; if (ps.timer <= 0) { ps.state = 'search'; ps.timer = 4; } return; }
  // close enough to touch someone it has just seen move: it takes them
  for (const p of living) {
    const d = dist2(p.x, p.z, pa.x, pa.z);
    if (d < PALE_GRAB && (ps.sus[p.id] || 0) >= 0.5 && !safeAt(L, p.x, p.z)) { paleTake(g, p); return; }
  }
  if (best) {
    if (ps.state !== 'hunt' && ps.state !== 'notice') { ps.state = 'notice'; ps.timer = 0.38; ps.sniff = null; hostEvent(g, 'paleSaw', { x: r2(pa.x), z: r2(pa.z), who: best.id }); }
    ps.target = best.id; ps.last = { x: best.x, z: best.z };
  }
  // someone standing dead still right in its way: it stops, and leans in, and looks
  if (!best && ps.state !== 'sniff' && ps.state !== 'notice') {
    const close = living.find((p) => dist2(p.x, p.z, pa.x, pa.z) < 1.7 && !safeAt(L, p.x, p.z));
    if (close) { ps.state = 'sniff'; ps.timer = 2.4 + Math.random() * 1.6; ps.sniff = close.id; ps.path = null; }
  }
  let goal = null, speed = 0;
  if (ps.state === 'notice') {
    // its head snaps round to it; a shriek; then it comes
    ps.timer -= dt;
    if (ps.last) pa.y = dampAngle(pa.y, Math.atan2(ps.last.x - pa.x, ps.last.z - pa.z), 9, dt);
    if (ps.timer <= 0) { ps.state = 'hunt'; ps.path = null; }
  } else if (ps.state === 'hunt') {
    goal = ps.last; speed = PALE_HUNT;
    // it has lost whoever it was after: it slows as it comes to where they were
    if (!best && ps.last) {
      const d = dist2(pa.x, pa.z, ps.last.x, ps.last.z);
      speed = d < 5 ? PALE_WALK * 1.4 : PALE_HUNT * 0.8;
      if (d < 1.9) { ps.state = 'search'; ps.timer = 5 + Math.random() * 3; ps.path = null; ps.goal = null; }
    }
  } else if (ps.state === 'sniff') {
    // leaning in, its face a hand's width from yours: if you move now, it has you
    ps.timer -= dt;
    const p = living.find((q) => q.id === ps.sniff);
    if (!p || dist2(p.x, p.z, pa.x, pa.z) > 2.6) { ps.state = 'idle'; ps.timer = 1; ps.sniff = null; }
    else {
      pa.y = dampAngle(pa.y, Math.atan2(p.x - pa.x, p.z - pa.z), 4, dt);
      if ((p.mv || 0) > 0.35 || p.h) { ps.sus[p.id] = 1.2; paleTake(g, p); return; }
      if (ps.timer <= 0) { ps.state = 'wander'; ps.goal = paleWanderPoint(g, living, ps.area, p); ps.path = null; ps.sniff = null; }
    }
  } else if (ps.state === 'search') {
    // it prowls round where it lost you, a step at a time, turning its head
    ps.timer -= dt;
    if (!ps.goal || dist2(pa.x, pa.z, ps.goal.x, ps.goal.z) < 0.6) {
      ps.pause = (ps.pause || 0) - dt;
      if (ps.pause <= 0 && ps.last) {
        for (let k = 0; k < 12; k++) {
          const a = Math.random() * Math.PI * 2, r = 1.8 + Math.random() * 2.6, x = ps.last.x + Math.sin(a) * r, z = ps.last.z + Math.cos(a) * r;
          if (paleOk(L, x, z, open) && !living.some((p) => dist2(p.x, p.z, x, z) < 1.4)) { ps.goal = { x, z }; break; }
        }
        ps.pause = 0.8 + Math.random() * 1.2;
      }
    } else { goal = ps.goal; speed = PALE_WALK * 0.8; }
    pa.y += Math.sin(g.t * 1.3) * dt * 1.2;
    if (ps.timer <= 0) { ps.state = 'idle'; ps.timer = 2; ps.target = null; ps.goal = null; }
  } else if (ps.state === 'idle') {
    ps.timer -= dt;
    if (ps.timer <= 0) { ps.state = 'wander'; ps.goal = paleWanderPoint(g, living, ps.area); ps.path = null; }
  } else if (ps.state === 'wander') {
    goal = ps.goal; speed = PALE_WALK;
    if (!goal || dist2(pa.x, pa.z, goal.x, goal.z) < 0.9) { ps.state = 'idle'; ps.timer = 1.5 + Math.random() * 3.5; }
  }
  pa.s = 0;
  if (goal && speed > 0) paleMove(g, ps, goal, speed, dt, open);
  pa.m = ps.state === 'hunt' || ps.state === 'notice' ? 'hunt' : ps.state === 'sniff' ? 'sniff' : ps.state === 'search' ? 'search' : pa.s > 0.05 ? 'walk' : 'idle';
  const tgt = ps.state === 'sniff' ? living.find((p) => p.id === ps.sniff) : ps.target && living.find((p) => p.id === ps.target);
  if (tgt && (ps.state === 'hunt' || ps.state === 'notice' || ps.state === 'sniff')) { pa.lx = r2(tgt.x); pa.lz = r2(tgt.z); } else { pa.lx = 0; pa.lz = 0; }
  pa.sn = ps.state === 'sniff' ? 1 : 0;
  pa.x = r2(pa.x); pa.z = r2(pa.z); pa.y = r2(wrapAngle(pa.y)); pa.s = r2(pa.s);
}
// somewhere in its area to go and stand - often near the team, never right on top of anyone
function paleWanderPoint(g, living, area, away) {
  const L = Game.L, A = L.areas[area]; if (!A) return null;
  const near = living.filter((p) => areaAt(L, p.x, p.z) === area);
  for (let k = 0; k < 50; k++) {
    let x, z;
    if (near.length && Math.random() < 0.55) { const p = near[Math.floor(Math.random() * near.length)]; x = p.x + (Math.random() - 0.5) * 16; z = p.z + (Math.random() - 0.5) * 16; }
    else { x = A.offX + 1 + Math.random() * (A.w - 2); z = A.offZ + 1 + Math.random() * (A.h - 2); }
    const gx = Math.floor(x), gz = Math.floor(z);
    if (!inGrid(L, gx, gz) || !L.cwalk[gz * L.W + gx] || L.area[gz * L.W + gx] !== area || L.lockAt[gz * L.W + gx] >= 0) continue;
    if (away && dist2(gx + 0.5, gz + 0.5, away.x, away.z) < 5) continue;
    if (living.some((p) => dist2(p.x, p.z, gx + 0.5, gz + 0.5) < 2)) continue;
    return { x: gx + 0.5, z: gz + 0.5 };
  }
  return null;
}
function paleMove(g, ps, goal, speed, dt, open) {
  const L = Game.L, pa = g.pa, ok = (k) => paleCellOk(L, k, open);
  ps.repath = (ps.repath || 0) - dt;
  if (!ps.path || ps.repath <= 0 || !ps.pgoal || dist2(ps.pgoal.x, ps.pgoal.z, goal.x, goal.z) > 1.2) {
    ps.path = navPath(L, ok, pa.x, pa.z, goal.x, goal.z); ps.pi = 0; ps.pgoal = { x: goal.x, z: goal.z }; ps.repath = 0.9;
    if (!ps.path) { ps.state = ps.state === 'hunt' ? 'search' : 'idle'; ps.timer = 3; return; }
  }
  const wp = ps.path[ps.pi]; if (!wp) return;
  const dx = wp.x - pa.x, dz = wp.z - pa.z, d = Math.hypot(dx, dz);
  if (d < 0.3) { ps.pi++; return; }
  // it turns fast - faster when it is after something - and goes where it is facing
  const want = Math.atan2(dx, dz);
  pa.y = dampAngle(pa.y, want, speed > 2.5 ? 8 : 4.5, dt);
  const face = Math.cos(wrapAngle(want - pa.y)), v = speed * clamp(face, 0.2, 1);
  const nx = pa.x + Math.sin(pa.y) * v * dt, nz = pa.z + Math.cos(pa.y) * v * dt;
  if (paleOk(L, nx, nz, open)) { pa.x = nx; pa.z = nz; pa.s = v; ps.stuck = 0; }
  else { ps.stuck += dt; if (ps.stuck > 1.2) { ps.path = null; ps.stuck = 0; } }
}
function paleTake(g, p) {
  const ps = Game.ps, pa = g.pa;
  ps.state = 'grab'; ps.timer = PALE_KILL + 1.2; ps.sniff = null;
  pa.m = 'grab'; pa.s = 0; pa.y = r2(Math.atan2(p.x - pa.x, p.z - pa.z));
  g.k[p.id] = Math.max(0.01, r2(g.t)); g.kc = (g.kc || 0) + 1;
  dropItems(g, p);
  g.kl = { id: p.id, t: r2(g.t), c: 2, x: r2(pa.x), z: r2(pa.z), y: pa.y, vx: r2(p.x), vz: r2(p.z) };
  hostEvent(g, 'paleGrab', { who: p.id, x: r2(p.x), z: r2(p.z) });
}

// ================= every machine: drawing it, hearing it =================
const PS = { x: 0, z: 0, y: 0, init: false, clickT: 2, lastM: '', duck: 0 };
const _paleOv = {};
// it has to stoop for doors: three metres of it, and a lintel at two and a bit
function paleDoorCells(L) {
  if (L.paleDoors) return L.paleDoors;
  const s = new Set();
  for (const d of World.doorways || []) s.add(d.gz * L.W + d.gx);
  for (const lk of L.locks) for (const c of lk.cells) s.add(c.z * L.W + c.x);
  L.paleDoors = s;
  return s;
}
function updatePaleClient(dt, t) {
  const g = Game.g, pa = g && g.pa, L = Game.L;
  if (!Pale.ready || !pa || pa.m === 'hidden' || g.lv !== 'l3') { setPaleVisible(false); return; }
  if (!PS.init || dist2(PS.x, PS.z, pa.x, pa.z) > 6) { PS.x = pa.x; PS.z = pa.z; PS.y = pa.y; PS.init = true; Pale.snap = true; }
  PS.x = damp(PS.x, pa.x, 10, dt); PS.z = damp(PS.z, pa.z, 10, dt); PS.y = dampAngle(PS.y, pa.y, 12, dt);
  const kl = g.kl, kT = kl && kl.c === 2 && Game.gt !== undefined ? Game.gt - kl.t : -1, killing = kT >= 0 && kT < PALE_KILL;
  if (killing) { PS.x = kl.x; PS.z = kl.z; PS.y = kl.y; }
  const cam = R.camera.position;
  setPaleVisible(dist2(cam.x, cam.z, PS.x, PS.z) < 40);
  Object.assign(Pale, { x: PS.x, z: PS.z, y: 0, yaw: PS.y, speed: killing ? 0 : pa.s, mode: pa.m === 'sniff' ? 'idle' : pa.m });
  Pale.look = pa.lx || pa.lz ? { x: pa.lx, y: pa.m === 'sniff' ? 1.55 : 1.5, z: pa.lz } : null;
  Pale.reach = 0; Pale.grip = undefined;
  if (killing) { Pale._kl = kl; Pale._kT = kT; paleKillOverrides(kl, kT); }
  else {
    Pale._kl = null;
    // stooping through doorways; leaning right down into your face when it has found you standing there
    const doors = paleDoorCells(L), fx = Math.sin(PS.y), fz = Math.cos(PS.y);
    const atDoor = [0, 0.5, 1.0].some((a) => { const gx = Math.floor(PS.x + fx * a), gz = Math.floor(PS.z + fz * a); return inGrid(L, gx, gz) && doors.has(gz * L.W + gx); });
    PS.duck = damp(PS.duck, atDoor ? 1 : 0, 6, dt);
    PS.sniff = damp(PS.sniff || 0, pa.sn ? 1 : 0, 3, dt);
    const ov = _paleOv; for (const k in ov) delete ov[k];
    ov.drop = PS.duck * 0.55 + PS.sniff * 0.42; ov.lean = PS.duck * 0.35 + PS.sniff * 0.55;
    ov.neckPitch = -PS.duck * 0.3 - PS.sniff * 0.25;
    if (PS.sniff > 0.05) { ov.headRoll = Math.sin(t * 0.7) * 0.45 * PS.sniff; ov.jaw = 0.12 + 0.08 * Math.sin(t * 3.1); }
    Pale.ov = ov;
  }
  Pale.gore = Math.max(0, Pale.gore - dt / 150);
  palePose(dt, t);
  // its feet: quick, light, wet slaps on concrete - you hear it coming only when it runs
  for (const ev of Pale.events) {
    const d = dist2(ev.x, ev.z, cam.x, cam.z);
    if (d > 30) continue;
    Sound.play('paleStep', { x: ev.x, y: 0.05, z: ev.z });
    if (pa.m === 'hunt' && d < 10) R.shake = Math.max(R.shake || 0, 0.12);
  }
  Pale.events.length = 0;
  // the clicking in its throat, all the time, faster when it is after something; a shriek when it sees you
  if (pa.m !== PS.lastM) { if (pa.m === 'hunt' && !killing) { paleClick(); Sound.play('paleShriek', { x: PS.x, y: 2.6, z: PS.z }); PS.clickT = 0.8; } PS.lastM = pa.m; }
  PS.clickT -= dt;
  if (PS.clickT <= 0 && !killing) {
    PS.clickT = pa.m === 'hunt' ? 0.5 + Math.random() * 0.8 : pa.m === 'sniff' ? 0.9 + Math.random() : 2.5 + Math.random() * 4;
    if (dist2(cam.x, cam.z, PS.x, PS.z) < 26) { paleClick(); Sound.play('paleClick', { x: PS.x, y: 2.6, z: PS.z }); }
  }
}
// how close and how dangerous, for the heart and the music
function paleThreat() {
  const g = Game.g, pa = g && g.pa;
  if (!pa || pa.m === 'hidden' || !Game.me) return 0;
  const d = dist2(Game.me.x, Game.me.z, PS.x, PS.z);
  return clamp(1 - d / (pa.m === 'hunt' ? 18 : pa.m === 'sniff' ? 6 : 10), 0, 1) * (pa.m === 'hunt' || pa.m === 'sniff' ? 1 : 0.55);
}

// ================= when it catches someone =================
// It has you by the head, one hand round the whole of it, and lifts you up to its face. It looks at you a long
// time, its head going over to one side and then the other, a finger tracing your face. The mouth opens - down
// past where a jaw should stop - and it bites into your neck and shoulder and holds on. Then both hands, and a
// twist. It lets you drop, and gets down over you. All of it from g.kl, the same on every machine.
const PALE_KILL = 5.6;
const PK_T = { snatch: 0.3, lift: 0.95, study: 1.0, open: 2.3, bite: 2.6, hands: 3.0, twist: 3.55, drop: 3.9, land: 4.15, crouch: 4.4 };
const PK_LUNGE = [[0, 0], [0.22, 0.42], [0.95, 0.12], [2.3, 0.05], [2.6, 0.18], [3.55, 0.12], [3.9, 0.08], [4.4, 0.35], [5.6, 0.2]];
const PK_LEAN = [[0, 0.1], [0.22, 0.42], [0.95, 0.12], [2.3, -0.05], [2.6, 0.22], [3.55, 0.15], [3.9, 0.3], [4.4, 0.95], [5.2, 0.9], [5.6, 0.6]];
const PK_DROP = [[0, 0], [0.22, 0.12], [0.95, 0], [3.9, 0], [4.4, 0.62], [5.3, 0.6], [5.6, 0.4]];
const PK_JAW = [[0, 0.1], [0.12, 0.7], [0.3, 0.25], [1.0, 0.08], [1.8, 0.14], [2.3, 0.65], [2.5, 1.45], [2.6, 0.28], [3.5, 0.32], [3.62, 0.55], [3.9, 0.2], [4.4, 0.45], [4.7, 0.2], [5.0, 0.5], [5.3, 0.2], [5.6, 0.1]];
// its head over you: [t, pitch, roll] - the long slow tilts while it looks at you
const PK_HEAD = [[0, 0, 0], [0.3, 0.05, 0], [0.95, 0.0, 0.0], [1.25, -0.05, 0.55], [1.6, 0.02, 0.6], [1.85, -0.04, -0.5], [2.2, 0.0, -0.45], [2.3, -0.22, 0.0], [2.5, -0.3, 0.0], [2.6, 0.25, 0.2], [3.5, 0.2, 0.25], [3.9, 0.35, 0.0], [4.4, 0.75, 0.1], [5.6, 0.5, 0.0]];
// your head, held in front of its face: [t, how far in front, across, up]
const PK_VHOLD = [[0.3, 0.6, 0.0, -0.22], [0.95, 0.4, 0.0, -0.1], [2.3, 0.3, 0.0, -0.06], [2.5, 0.34, 0.0, -0.08], [2.6, 0.13, -0.12, -0.13]];
// where you end up: crumpled on the floor in front of it, head away from it
const PK_LIE = { hip: [0.08, 0.13, 0.62], head: [-0.15, 0.15, 1.38], feet: [0.38, 0.1, -0.12] };
const _pk = { a: [], b: [], c: [] };
const _pkV = new THREE.Vector3(), _pkW = new THREE.Vector3(), _pkM = new THREE.Vector3(), _pkH = new THREE.Vector3(), _pkL = new THREE.Vector3(), _pkP = new THREE.Vector3();
const _pfF = new THREE.Vector3(), _pfU = new THREE.Vector3(), _pfR = new THREE.Vector3();
// its face and the way its head points, as it is posed now
function paleFace(out) {
  const h = Pale.bones.head; h.updateWorldMatrix(true, false);
  h.localToWorld(out.set(0, 2.68 - Pale.rest.head.y, 0.14 - Pale.rest.head.z));
  _pfF.set(0, 0, 1).transformDirection(h.matrixWorld); _pfU.set(0, 1, 0).transformDirection(h.matrixWorld); _pfR.set(1, 0, 0).transformDirection(h.matrixWorld);
  return out;
}
function paleEyes(out) { Pale.bones.head.localToWorld(out.set(0, 2.733 - Pale.rest.head.y, 0.12 - Pale.rest.head.z)); return out; }
function paleMouth(out) { Pale.bones.head.localToWorld(out.set(0, 2.62 - Pale.rest.head.y, 0.15 - Pale.rest.head.z)); return out; }
function pkHold(T, out) {
  trackAt(PK_VHOLD, T, _pk.c);
  paleFace(out);
  return out.addScaledVector(_pfF, _pk.c[0]).addScaledVector(_pfR, _pk.c[1]).addScaledVector(_pfU, _pk.c[2]);
}
function paleKillOverrides(kl, T) {
  const ov = _paleOv; for (const k in ov) delete ov[k];
  ov.lunge = trackAt(PK_LUNGE, T, _pk.a)[0];
  ov.lean = trackAt(PK_LEAN, T, _pk.a)[0];
  ov.drop = trackAt(PK_DROP, T, _pk.a)[0];
  ov.jaw = trackAt(PK_JAW, T, _pk.a)[0];
  trackAt(PK_HEAD, T, _pk.a); ov.headPitch = _pk.a[0]; ov.headRoll = _pk.a[1];
  // it worries at the bite; and when it eats, its whole back works
  if (T > PK_T.bite && T < PK_T.twist) { const k = T - PK_T.bite; ov.chestYaw = Math.sin(k * 17) * 0.12 * Math.exp(-k * 1.5); ov.headRoll += Math.sin(k * 23) * 0.08; }
  if (T > PK_T.crouch) { ov.chestYaw = Math.sin(T * 6.1) * 0.1; ov.headPitch += Math.sin(T * 8.3) * 0.08; }
  if (T > PK_T.twist - 0.05 && T < PK_T.twist + 0.15) ov.chestYaw = (ov.chestYaw || 0) + Math.sin(clamp((T - PK_T.twist + 0.05) / 0.2, 0, 1) * Math.PI) * 0.35;
  ov.still = true;
  ov.lookFwd = T < PK_T.drop;
  ov.beforeArms = paleKillHands;
  // feet: a step in as it grabs, then planted
  const kr = smooth01(T / 0.22), kf = smooth01((T - 0.18) / 0.22);
  ov.footR = ckWorld(kl, -0.14, 0.1 + Math.sin(kr * Math.PI) * 0.14, lerp(-0.05, 0.45, kr), _pkL.clone());
  ov.footL = ckWorld(kl, 0.14, 0.1 + Math.sin(kf * Math.PI) * 0.1, lerp(-0.05, 0.2, kf), _pkP.clone());
  Pale.ov = ov;
  return ov;
}
const PKV = { head: new THREE.Vector3(), hip: new THREE.Vector3(), feet: new THREE.Vector3(), face: new THREE.Vector3(0, 1, 0), axis: new THREE.Vector3(0, 1, 0), live: 1, phase: 2, t: -1, T: -1, held: false };
function paleKillVictim(kl, T) {
  const V = PKV, fx = Math.sin(kl.y), fz = Math.cos(kl.y), rt = { x: fz, z: -fx };
  V.t = kl.t; V.T = T;
  const kick = Math.sin(T * 10.3) * 0.1;
  V.live = T < PK_T.bite ? 1 : T < PK_T.twist ? 0.5 : 0; V.held = T < PK_T.drop;
  if (T < PK_T.snatch) {
    // yanked off your feet by the head
    const k = smooth01(T / PK_T.snatch), v = ckLocal(kl, kl.vx === undefined ? kl.x + fx * 1.2 : kl.vx, kl.vz === undefined ? kl.z + fz * 1.2 : kl.vz);
    pkHold(PK_T.snatch, _pkW); ckWorld(kl, v.x, 1.6, v.z, _pkV);
    V.head.set(lerp(_pkV.x, _pkW.x, k), lerp(_pkV.y, _pkW.y, k * k), lerp(_pkV.z, _pkW.z, k));
    V.hip.set(V.head.x, V.head.y - 0.66, V.head.z); V.feet.set(V.head.x + fx * 0.2 * k, Math.max(0.05, V.head.y - 1.55), V.head.z + fz * 0.2 * k);
    V.face.set(-fx, 0, -fz); V.phase = 2;
  } else if (T < PK_T.bite - 0.04) {
    // held up to its face by the head, legs kicking
    pkHold(T, V.head);
    V.hip.set(V.head.x + Math.sin(T * 2.3) * 0.06, V.head.y - 0.66, V.head.z + fz * 0.04);
    V.feet.set(V.hip.x + kick * fz, V.hip.y - 0.88, V.hip.z - kick * fx);
    V.face.set(-fx, 0, -fz); V.phase = 2;
  } else if (T < PK_T.drop) {
    // its teeth in your neck: you hang against it, and at the twist your head goes round
    const k = smooth01((T - (PK_T.bite - 0.04)) / 0.08);
    pkHold(PK_T.bite, V.head);
    V.hip.set(V.head.x + rt.x * 0.08 + fx * 0.02, V.head.y - 0.66, V.head.z + rt.z * 0.08 + fz * 0.02);
    const sw = T > PK_T.twist ? 0 : Math.sin(T * 7.1) * 0.05 * (1 - k * 0.5);
    V.feet.set(V.hip.x + sw * fz, V.hip.y - 0.88, V.hip.z - sw * fx);
    const tw = smooth01((T - PK_T.twist) / 0.1);
    V.face.set(-fx * Math.cos(tw * 2.4) + rt.x * Math.sin(tw * 2.4), 0, -fz * Math.cos(tw * 2.4) + rt.z * Math.sin(tw * 2.4)); V.phase = 2;
  } else if (T < PK_T.land) {
    // let go of
    const k = smooth01((T - PK_T.drop) / (PK_T.land - PK_T.drop));
    pkHold(PK_T.bite, _pkV);
    const lh = ckWorld(kl, ...PK_LIE.head, _pkW);
    V.head.set(lerp(_pkV.x, lh.x, k), lerp(_pkV.y, lh.y, k * k), lerp(_pkV.z, lh.z, k));
    const lhip = ckWorld(kl, ...PK_LIE.hip, _pkM), lfeet = ckWorld(kl, ...PK_LIE.feet, _pkH);
    V.hip.lerpVectors(_pkP.set(V.head.x, V.head.y - 0.66, V.head.z), lhip, k);
    V.feet.lerpVectors(_pkP.set(V.head.x, Math.max(0.05, V.head.y - 1.5), V.head.z), lfeet, k);
    V.face.set(rt.x, 0.3, rt.z).normalize(); V.phase = 4;
  } else {
    // on the floor, and it is over you
    ckWorld(kl, ...PK_LIE.head, V.head); ckWorld(kl, ...PK_LIE.hip, V.hip); ckWorld(kl, ...PK_LIE.feet, V.feet);
    const b = T < PK_T.land + 0.25 ? Math.sin((T - PK_T.land) / 0.25 * Math.PI) * 0.06 : 0;
    V.hip.y += b; V.head.y += b * 0.6;
    if (T > PK_T.crouch) { const j = Math.max(0, Math.sin(T * 6.1)) * 0.03; V.hip.y += j; }
    V.face.set(rt.x, 0.6, rt.z).normalize(); V.phase = 4;
  }
  V.axis.set(-fx, 0, -fz);
  return V;
}
function paleKillHands(B) {
  const kl = B._kl, T = B._kT; if (!kl) return;
  const V = paleKillVictim(kl, T), ov = B.ov, fx = Math.sin(kl.y), fz = Math.cos(kl.y);
  // the right hand round your head the whole time it holds you
  if (T < PK_T.drop) {
    ov.armR = _pkH.copy(V.head).add(_pkL.set(0, 0.06, 0)).clone();
    ov.gripR = T < PK_T.snatch ? clamp(T / PK_T.snatch * 1.6 - 0.2, 0, 1) : 0.95;
  }
  // the left: up to your face, one finger along it; then on your chin for the twist
  if (T > 0.9 && T < PK_T.bite) {
    const k = smooth01((T - 0.9) / 0.5), tr = Math.sin(T * 1.7) * 0.05;
    ov.armL = new THREE.Vector3().lerpVectors(ckWorld(kl, 0.3, 1.25, 0.25, _pkP), _pkM.copy(V.head).add(_pkL.set(-fx * 0.1 + fz * tr, -0.05, -fz * 0.1 - fx * tr)), k);
    ov.gripL = 0.3;
  } else if (T >= PK_T.hands && T < PK_T.drop) {
    const k = smooth01((T - PK_T.hands) / 0.3);
    ov.armL = new THREE.Vector3().lerpVectors(ckWorld(kl, 0.3, 1.4, 0.3, _pkP), _pkM.copy(V.head).add(_pkL.set(-fx * 0.08, -0.1, -fz * 0.08)), k);
    ov.gripL = 0.6 + k * 0.35;
  } else if (T >= PK_T.crouch) {
    // both hands down on you while it feeds
    ov.armL = _pkM.copy(V.hip).add(_pkL.set(fz * 0.12, 0.05, -fx * 0.12)).clone();
    ov.armR = _pkH.copy(V.hip).lerp(V.head, 0.5).add(_pkL.set(-fz * 0.1, 0.05, fx * 0.1)).clone();
    ov.gripL = ov.gripR = 0.7 + 0.2 * Math.sin(T * 6);
  }
  if (T > PK_T.drop) ov.look = V.hip;
}
function paleKillBody(kl, T) {
  if (PKV.t !== kl.t || Math.abs(PKV.T - T) > 0.2) paleKillVictim(kl, T);
  return PKV;
}
function paleDropPose(kl, out) {
  ckWorld(kl, ...PK_LIE.head, out.head); ckWorld(kl, ...PK_LIE.hip, out.hip); ckWorld(kl, ...PK_LIE.feet, out.feet);
  const fx = Math.sin(kl.y), fz = Math.cos(kl.y);
  out.face.set(fz, 0.6, -fx).normalize(); out.axis.set(-fx, 0, -fz);
  return out;
}
const PALE_KILL_SOUNDS = [
  [0.02, (p) => Sound.play('paleShriek', p)], [0.28, (p) => Sound.play('thud', p)],
  [0.7, (p) => Sound.play('paleClick', p)], [1.3, (p) => Sound.play('paleClick', p)], [1.9, (p) => Sound.play('paleClick', p)],
  [2.25, (p, me) => { Sound.play('jawOpen', p); if (me) R.fearKick = 1; }],
  [PK_T.bite, (p, me) => { Sound.play('bite', p); Sound.play('squelch', p); if (me) { R.hit = 2; R.bleed = 1; } Pale.gore = Math.min(1, Pale.gore + 0.6); }],
  [2.9, (p) => Sound.play('gurgle', p)], [3.2, (p) => Sound.play('squelch', p)],
  [PK_T.twist, (p, me) => { Sound.play('neckSnap', p); if (me) { R.hit = 2.4; R.whiteFlash = 0.25; } }],
  [PK_T.land, (p, me, d, lie) => { Sound.play('thud', lie); if (me) { R.shake = 1.4; } }],
  [4.6, (p, me, d, lie) => { Sound.play('squelch', lie); chudBloodPool(lie, 0.9); }], [5.0, (p, me, d, lie) => Sound.play('squelch', lie)], [5.35, (p) => Sound.play('paleClick', p)],
];
function updatePaleKill(dt) {
  const g = Game.g, kl = g && g.kl;
  if (!kl || kl.c !== 2 || Game.gt === undefined) return;
  const T = Game.gt - kl.t;
  if (Game.pkId !== kl.t) { Game.pkId = kl.t; Game.pkLast = -1; }
  if (T < 0) return;
  const mine = kl.id === netMyId(), pos = { x: kl.x, y: 2.5, z: kl.z };
  const d = Game.me ? dist2(Game.me.x, Game.me.z, kl.x, kl.z) : 99;
  const lie = ckWorld(kl, ...PK_LIE.hip, new THREE.Vector3()); lie.y = 0.2;
  for (const [at, fn] of PALE_KILL_SOUNDS) if (Game.pkLast < at && T >= at && T < at + 1) fn(pos, mine, d, lie);
  Game.pkLast = T;
  if (T > PALE_KILL && g.k[kl.id] && !Game.corpses.has(kl.id)) {
    const out = paleDropPose(kl, { head: new THREE.Vector3(), hip: new THREE.Vector3(), feet: new THREE.Vector3(), face: new THREE.Vector3(), axis: new THREE.Vector3() });
    Game.corpses.set(kl.id, Object.assign(out, { live: 0, phase: 4, t: kl.t }));
  }
}
// What the one it has sees: its face, close; its head going over to one side; the mouth opening on you; the
// room past its cheek; the twist, and the floor.
const _pc = { look: new THREE.Vector3(), eyes: new THREE.Vector3() };
function paleKillCam(T, dt, t) {
  const cam = R.camera, kl = Game.g.kl, V = paleKillBody(kl, T);
  const fx = Math.sin(kl.y), fz = Math.cos(kl.y);
  paleEyes(_pc.eyes); paleMouth(_pkM);
  let fov = 66, roll = 0, jit = 0.02;
  if (T < PK_T.snatch) {
    const k = smooth01(T / PK_T.snatch), sc = Game.scare;
    cam.position.lerpVectors(sc ? sc.from : V.head, V.head, k);
    cam.lookAt(_pc.look.lerpVectors(_pkP.copy(V.head).add(_pkL.set(fx, 0, fz).multiplyScalar(-2)), _pc.eyes, Math.min(1, k * 2.4)));
    fov = lerp(72, 86, k); roll = Math.sin(T * 34) * 0.1; jit = 0.07;
  } else if (T < PK_T.bite - 0.04) {
    // held up in front of it while it looks at you, its head going over one way, then the other
    cam.position.copy(V.head);
    const k = smooth01((T - 2.0) / 0.45);
    cam.lookAt(_pc.look.lerpVectors(_pc.eyes, _pkM, k));
    fov = lerp(80, 50, smooth01((T - PK_T.snatch) / 1.9)); roll = -(Pale.ov && Pale.ov.headRoll || 0) * 0.35 + Math.sin(T * 1.9) * 0.04;
    jit = 0.01 + k * 0.012;
    R.fade = Math.max(0, k * 0.2);
  } else if (T < PK_T.twist) {
    // past its cheek, at the room, while it holds on
    cam.position.copy(V.head);
    cam.lookAt(_pc.look.set(V.head.x - fx * 3 + fz * 1.2, V.head.y - 0.6, V.head.z - fz * 3 - fx * 1.2));
    roll = 0.5 + Math.sin(T * 13) * 0.05; fov = 84; jit = 0.05;
    R.fade = 0.35 + 0.25 * Math.abs(Math.sin(T * 7.3));
    R.bleed = Math.max(R.bleed || 0, 0.8);
  } else if (T < PK_T.land) {
    // the twist: the room goes round, all the way
    cam.position.copy(V.head);
    const k = smooth01((T - PK_T.twist) / 0.12);
    cam.lookAt(_pc.look.set(V.head.x - fx * 3 + fz * 1.2, V.head.y - 0.6, V.head.z - fz * 3 - fx * 1.2));
    roll = 0.5 + k * 2.5; fov = 90; jit = 0.03;
    R.fade = damp(R.fade, 0.65, 6, dt);
  } else {
    // on the floor, on your side, and it is down over you
    cam.position.copy(V.head); cam.position.y = 0.16;
    cam.lookAt(_pc.look.copy(_pc.eyes).lerp(V.hip, 0.3));
    roll = Math.PI * 0.5; fov = 70; jit = 0.008;
    R.fade = damp(R.fade, T > 5.0 ? 1 : 0.55, T > 5.0 ? 3 : 1.5, dt);
  }
  cam.rotateZ(roll);
  cam.position.x += (Math.random() - 0.5) * jit; cam.position.y += (Math.random() - 0.5) * jit; cam.position.z += (Math.random() - 0.5) * jit;
  if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  R.fear = 1;
  setFlash(T < PK_T.snatch ? 0.7 : T < PK_T.bite ? (Math.random() < 0.12 ? 0.15 : 0.42) : T < PK_T.twist ? 0.25 : T < PK_T.land ? (Math.random() < 0.5 ? 0.05 : 0.3) : 0.1);
  R.flashThrow = 1.2; R.bounce.intensity = 0;
  if (World.viewModel) World.viewModel.group.visible = false;
}
