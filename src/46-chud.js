// ================= The Chud: the thing on Seize - B5 =================
// Patient 9. Too big for the beds years ago and bigger every year since: a vast pallid body of fat on short
// legs, the head sunk down into its shoulders, arms that hang to its knees. It can't hear a thing; it sees
// light. A stitched scar down its belly and another across its scalp; a hospital band still on one wrist, the
// torn restraint cuff on the other, an iron shackle on one ankle. Built from soft shapes (45-beast.js).

const C_SKIN = [0.55, 0.52, 0.49], C_PALE = [0.62, 0.6, 0.56], C_FACE = [0.58, 0.48, 0.46], C_RED = [0.56, 0.36, 0.35];
const C_DUSK = [0.47, 0.41, 0.37], C_SOCKET = [0.16, 0.08, 0.08], C_MOUTH = [0.16, 0.035, 0.035], C_NOSTRIL = [0.14, 0.06, 0.05];
const C_AREOLA = [0.52, 0.37, 0.35], C_FOLD = [0.4, 0.31, 0.29];
// the fine parts: the face, both hands, both feet (boxes in model space, left side; mirrored for the right)
const CHUD_HEAD_BOX = [[-0.27, 2.27, -0.06], [0.27, 2.82, 0.45]];
const CHUD_HAND_BOX = [[1.22, 0.66, -0.05], [1.62, 1.115, 0.34]];
const CHUD_FOOT_BOX = [[0.19, -0.03, -0.2], [0.64, 0.22, 0.47]];
const inBox = (b, x, y, z, m = 0) => x > b[0][0] + m && x < b[1][0] - m && y > b[0][1] + m && y < b[1][1] - m && z > b[0][2] + m && z < b[1][2] - m;
const mirrorBox = (b) => [[-b[1][0], b[0][1], b[0][2]], [-b[0][0], b[1][1], b[1][2]]];
const growBox = (b, g) => [[b[0][0] - g, b[0][1] - g, b[0][2] - g], [b[1][0] + g, b[1][1] + g, b[1][2] + g]];
const CHUD_FINE = [CHUD_HEAD_BOX, CHUD_HAND_BOX, mirrorBox(CHUD_HAND_BOX), CHUD_FOOT_BOX, mirrorBox(CHUD_FOOT_BOX)];

// fingers: [z offset from the hand's middle, proximal length, distal length, thickness]
const CHUD_FINGERS = [[0.074, 0.095, 0.08, 1], [0.025, 0.102, 0.086, 1.04], [-0.024, 0.096, 0.08, 0.98], [-0.07, 0.08, 0.066, 0.86]];
// toes: [x, z reach, radius]
const CHUD_TOES = [[0.315, 0.395, 0.042], [0.37, 0.37, 0.032], [0.415, 0.355, 0.03], [0.46, 0.34, 0.028], [0.505, 0.318, 0.026]];

const CHUD_DEF = {
  name: 'chud', skin: C_SKIN, weightLam: 0.04,
  bones: [
    ['hips', null, [0, 1.04, -0.02]], ['spine', 'hips', [0, 1.38, -0.05]], ['chest', 'spine', [0, 1.8, -0.05]],
    ['neck', 'chest', [0, 2.14, 0.0]], ['head', 'neck', [0, 2.36, 0.06]], ['jaw', 'head', [0, 2.44, 0.12]],
    ['chin', 'neck', [0, 2.28, 0.17]], ['jowlL', 'head', [0.1, 2.43, 0.19]],
    ['belly', 'hips', [0, 1.12, 0.32]], ['apron', 'belly', [0, 0.88, 0.42]],
    ['breastL', 'chest', [0.32, 1.62, 0.26]], ['flankL', 'hips', [0.55, 1.18, -0.04]],
    ['clavL', 'chest', [0.42, 2.08, -0.05]], ['armL', 'clavL', [0.84, 2.02, -0.05]], ['flabL', 'armL', [0.97, 1.78, -0.08]],
    ['elbowL', 'armL', [1.1, 1.52, 0.0]], ['handL', 'elbowL', [1.32, 1.08, 0.08]],
    ['fingL', 'handL', [1.405, 0.905, 0.12]], ['tipL', 'fingL', [1.425, 0.807, 0.12]], ['thumbL', 'handL', [1.37, 0.99, 0.2]],
    ['thighL', 'hips', [0.38, 0.96, 0.0]], ['shinL', 'thighL', [0.41, 0.52, 0.05]], ['footL', 'shinL', [0.41, 0.12, 0.03]], ['toeL', 'footL', [0.41, 0.05, 0.27]],
  ],
  shapes: [
    // ---- the trunk: pelvis, a belly that hangs to the thighs and the apron of fat under it, love handles, a
    // chest broader still, the breasts, the back, a hump of fat across the shoulders the head sinks into ----
    { e: [0, 1.02, -0.06, 0.62, 0.36, 0.44], bone: 'hips', k: 0.12 },
    { e: [0, 1.34, 0.0, 0.74, 0.5, 0.55], bone: 'spine', k: 0.14 },
    { e: [0, 1.08, 0.34, 0.64, 0.54, 0.48], bone: 'belly', k: 0.12, tint: C_PALE },
    { e: [0, 0.77, 0.44, 0.5, 0.25, 0.26], bone: 'apron', k: 0.1, tint: C_PALE },
    { e: [0, 0.63, 0.41, 0.38, 0.14, 0.2], bone: 'apron', k: 0.08, tint: C_PALE },
    { e: [0.54, 1.14, -0.06, 0.3, 0.36, 0.38], bone: 'flankL', k: 0.12, sym: true },
    { e: [0, 1.84, -0.02, 0.82, 0.5, 0.48], bone: 'chest', k: 0.14 },
    { e: [0.34, 1.5, 0.3, 0.28, 0.29, 0.2], rot: [0.32, 0.22, 0], bone: 'breastL', k: 0.1, sym: true, tint: C_PALE },
    { e: [0.38, 1.38, 0.47, 0.045, 0.038, 0.024], bone: 'breastL', k: 0.02, sym: true, tint: C_AREOLA },
    { e: [0, 1.5, -0.24, 0.68, 0.62, 0.36], bone: 'spine', k: 0.12 },
    { e: [0, 2.12, -0.1, 0.86, 0.35, 0.45], bone: 'chest', k: 0.12 },
    { e: [0.44, 2.17, -0.05, 0.4, 0.23, 0.33], bone: 'chest', k: 0.1, sym: true },
    { c: [0, 2.06, 0.03, 0, 2.3, 0.1, 0.3, 0.24], bone: 'neck', k: 0.1 },
    { e: [0, 2.28, 0.19, 0.165, 0.085, 0.125], bone: 'chin', k: 0.07, tint: C_FACE },
    // it is not symmetrical: a lump high on one side of the back, the other flank sagging lower, a bulge to
    // one side of the belly, one shoulder heavier
    { e: [0.3, 1.94, -0.42, 0.28, 0.22, 0.18], bone: 'chest', k: 0.1 },
    { e: [-0.48, 0.96, 0.16, 0.3, 0.3, 0.3], bone: 'hips', k: 0.12, tint: C_PALE },
    { e: [0.22, 1.2, 0.58, 0.26, 0.2, 0.15], bone: 'belly', k: 0.1, tint: C_PALE },
    { e: [-0.62, 1.88, 0.12, 0.22, 0.2, 0.2], bone: 'chest', k: 0.1 },
    // rolls of fat down the back, a roll at the nape, and growths - cysts and lumps - on the shoulders and back
    { e: [0, 1.17, -0.47, 0.46, 0.12, 0.14], bone: 'spine', k: 0.08 },
    { e: [0.04, 1.44, -0.49, 0.42, 0.1, 0.12], bone: 'spine', k: 0.08 },
    { e: [0, 2.22, -0.2, 0.26, 0.07, 0.12], bone: 'neck', k: 0.04 },
    { e: [0.62, 1.3, -0.12, 0.12, 0.09, 0.22], bone: 'flankL', k: 0.07, sym: true },
    { e: [0.58, 2.24, -0.18, 0.1, 0.08, 0.09], bone: 'chest', k: 0.04, tint: C_FACE },
    { e: [-0.24, 1.98, -0.48, 0.09, 0.08, 0.07], bone: 'chest', k: 0.035, tint: C_FACE },
    { e: [-0.12, 1.66, -0.56, 0.06, 0.06, 0.05], bone: 'spine', k: 0.03, tint: C_FACE },
    { e: [-0.95, 1.86, 0.06, 0.07, 0.07, 0.06], bone: 'armR', k: 0.03, tint: C_FACE },
    // ---- the head: low and pushed forward; a heavy brow, small deep eyes, a broken flat nose, a wide lipless
    // mouth, jowls, and the chin running down into the chest ----
    { e: [0, 2.555, 0.08, 0.15, 0.165, 0.17], bone: 'head', k: 0.05, tint: C_FACE },
    { e: [0, 2.5, -0.01, 0.135, 0.14, 0.12], bone: 'head', k: 0.05 },
    { e: [0.07, 2.65, 0.02, 0.08, 0.05, 0.08], bone: 'head', k: 0.04, tint: C_FACE },
    { e: [0, 2.56, 0.215, 0.135, 0.032, 0.05], bone: 'head', k: 0.03, tint: C_FACE },
    { e: [0.062, 2.553, 0.237, 0.05, 0.022, 0.03], bone: 'head', k: 0.02, sym: true, tint: C_FACE },
    { e: [0.086, 2.47, 0.2, 0.072, 0.06, 0.07], bone: 'head', k: 0.04, sym: true, tint: C_FACE },
    { e: [0.112, 2.39, 0.168, 0.075, 0.082, 0.072], bone: 'jowlL', k: 0.05, sym: true, tint: C_FACE },
    { c: [0, 2.545, 0.255, 0.006, 2.47, 0.302, 0.02, 0.029], bone: 'head', k: 0.02, tint: C_RED },
    { e: [0.004, 2.462, 0.306, 0.037, 0.03, 0.03], bone: 'head', k: 0.02, tint: C_RED },
    { e: [0.031, 2.455, 0.29, 0.02, 0.022, 0.022], bone: 'head', k: 0.015, sym: true, tint: C_RED },
    { e: [0, 2.424, 0.274, 0.068, 0.017, 0.027], bone: 'head', k: 0.014, tint: C_RED },
    { e: [0, 2.381, 0.266, 0.064, 0.018, 0.027], bone: 'jaw', k: 0.014, tint: C_RED },
    { e: [0, 2.37, 0.18, 0.11, 0.062, 0.09], bone: 'jaw', k: 0.04, tint: C_FACE },
    { e: [0, 2.34, 0.235, 0.056, 0.045, 0.04], bone: 'jaw', k: 0.03, tint: C_FACE },
    { e: [0.148, 2.49, 0.07, 0.017, 0.046, 0.031], rot: [0, 0.3, 0], bone: 'head', k: 0.015, sym: true, tint: C_FACE },
    { e: [0.058, 2.494, 0.262, 0.031, 0.012, 0.015], bone: 'head', k: 0.012, sym: true, tint: C_RED },
    // ---- the arms: a shoulder like a boulder, fat hanging off the upper arm, a thick forearm ----
    { e: [0.82, 2.0, -0.04, 0.3, 0.28, 0.3], bone: 'armL', k: 0.08, sym: true },
    { c: [0.84, 2.02, -0.05, 1.1, 1.52, 0.0, 0.26, 0.19], bone: 'armL', k: 0.06, sym: true },
    { e: [0.98, 1.74, -0.1, 0.19, 0.26, 0.19], bone: 'flabL', k: 0.06, sym: true, tint: C_PALE },
    { e: [1.09, 1.55, -0.06, 0.15, 0.13, 0.13], bone: 'elbowL', k: 0.05, sym: true },
    { c: [1.1, 1.52, 0.0, 1.32, 1.08, 0.08, 0.19, 0.13], bone: 'elbowL', k: 0.05, sym: true },
    { e: [1.18, 1.38, 0.05, 0.15, 0.17, 0.14], bone: 'elbowL', k: 0.05, sym: true },
    // ---- the hands: a palm like a shovel, thick short fingers, swollen knuckles ----
    { e: [1.376, 0.985, 0.12, 0.062, 0.115, 0.105], bone: 'handL', k: 0.03, sym: true, tint: C_DUSK },
    { e: [1.36, 1.0, 0.18, 0.05, 0.07, 0.05], bone: 'handL', k: 0.025, sym: true, tint: C_DUSK },
    { e: [1.398, 0.99, 0.115, 0.05, 0.1, 0.09], bone: 'handL', k: 0.02, sym: true, tint: C_DUSK },
    { c: [1.37, 0.99, 0.2, 1.36, 0.915, 0.255, 0.034, 0.03], bone: 'thumbL', k: 0.015, sym: true, tint: C_DUSK },
    { c: [1.36, 0.915, 0.255, 1.352, 0.862, 0.276, 0.03, 0.025], bone: 'thumbL', k: 0.012, sym: true, tint: C_DUSK },
    ...CHUD_FINGERS.flatMap(([o, l1, l2, s]) => {
      const z = 0.12 + o, y1 = 0.905 - l1, y2 = y1 - l2;
      return [
        { e: [1.41, 0.905, z, 0.03 * s, 0.03 * s, 0.026 * s], bone: 'fingL', k: 0.012, sym: true, tint: C_DUSK },
        { c: [1.405, 0.905, z, 1.425, y1, z, 0.034 * s, 0.03 * s], bone: 'fingL', k: 0.015, sym: true, tint: C_DUSK },
        { c: [1.425, y1, z, 1.413, y2, z, 0.03 * s, 0.023 * s], bone: 'tipL', k: 0.012, sym: true, tint: C_DUSK },
      ];
    }),
    // ---- the legs: short, enormous, the knees buried in fat; flat broad feet with splayed toes ----
    { c: [0.38, 0.98, 0.0, 0.41, 0.54, 0.05, 0.34, 0.25], bone: 'thighL', k: 0.1, sym: true },
    { e: [0.28, 0.82, 0.02, 0.2, 0.26, 0.22], bone: 'thighL', k: 0.1, sym: true },
    { e: [0.42, 0.58, 0.15, 0.22, 0.13, 0.16], bone: 'thighL', k: 0.07, sym: true },
    { c: [0.41, 0.52, 0.05, 0.41, 0.17, 0.02, 0.23, 0.16], bone: 'shinL', k: 0.07, sym: true },
    { e: [0.42, 0.37, -0.07, 0.17, 0.17, 0.15], bone: 'shinL', k: 0.07, sym: true },
    { e: [0.41, 0.17, 0.03, 0.17, 0.09, 0.17], bone: 'shinL', k: 0.06, sym: true },
    { e: [0.41, 0.075, 0.12, 0.15, 0.075, 0.23], bone: 'footL', k: 0.04, sym: true, tint: C_DUSK },
    { e: [0.41, 0.07, -0.05, 0.12, 0.07, 0.09], bone: 'footL', k: 0.03, sym: true, tint: C_DUSK },
    { e: [0.41, 0.055, 0.28, 0.15, 0.055, 0.08], bone: 'toeL', k: 0.03, sym: true, tint: C_DUSK },
    ...CHUD_TOES.map(([x, zr, r]) => ({ c: [x, 0.04, 0.29, x + (x - 0.41) * 0.15, 0.035, zr, r, r * 0.85], bone: 'toeL', k: 0.012, sym: true, tint: C_DUSK })),
    // ---- cut back in: the folds, the sockets, the mouth ----
    { e: [0.055, 2.512, 0.262, 0.032, 0.025, 0.036], bone: 'head', k: 0.016, sym: true, sub: true, tint: C_SOCKET },
    { e: [0.018, 2.447, 0.312, 0.012, 0.009, 0.015], bone: 'head', k: 0.006, sym: true, sub: true, tint: C_NOSTRIL },
    { e: [0, 2.402, 0.29, 0.076, 0.011, 0.058], bone: 'head', k: 0.01, sub: true, tint: C_MOUTH, wet: 0.5 },
    { e: [0.162, 2.49, 0.075, 0.008, 0.03, 0.018], bone: 'head', k: 0.008, sym: true, sub: true, tint: C_FOLD },
    { e: [0, 0.5, 0.42, 0.5, 0.06, 0.3], bone: 'belly', k: 0.05, sub: true, tint: C_FOLD, wet: 0.3 },
    { e: [0, 1.02, 0.82, 0.034, 0.045, 0.06], bone: 'belly', k: 0.025, sub: true, tint: C_FOLD },
  ],
  parts: [
    { name: 'body', lo: [-1.78, -0.03, -0.84], hi: [1.78, 2.8, 1.02], h: 0.022, keep: (x, y, z) => !CHUD_FINE.some((b) => inBox(b, x, y, z, 0.022)) },
    { name: 'head', fine: true, ...((b) => ({ lo: b[0], hi: b[1] }))(growBox(CHUD_HEAD_BOX, 0.04)), h: 0.0085, keep: (x, y, z) => inBox(CHUD_HEAD_BOX, x, y, z) },
    { name: 'handL', fine: true, lo: growBox(CHUD_HAND_BOX, 0.04)[0], hi: growBox(CHUD_HAND_BOX, 0.04)[1], h: 0.011, keep: (x, y, z) => inBox(CHUD_HAND_BOX, x, y, z) },
    { name: 'handR', fine: true, lo: growBox(mirrorBox(CHUD_HAND_BOX), 0.04)[0], hi: growBox(mirrorBox(CHUD_HAND_BOX), 0.04)[1], h: 0.011, keep: (x, y, z) => inBox(mirrorBox(CHUD_HAND_BOX), x, y, z) },
    { name: 'footL', fine: true, lo: growBox(CHUD_FOOT_BOX, 0.04)[0], hi: growBox(CHUD_FOOT_BOX, 0.04)[1], h: 0.012, keep: (x, y, z) => inBox(CHUD_FOOT_BOX, x, y, z) },
    { name: 'footR', fine: true, lo: growBox(mirrorBox(CHUD_FOOT_BOX), 0.04)[0], hi: growBox(mirrorBox(CHUD_FOOT_BOX), 0.04)[1], h: 0.012, keep: (x, y, z) => inBox(mirrorBox(CHUD_FOOT_BOX), x, y, z) },
  ],
  // the lips part cleanly: above the line of the mouth is the head, below it the jaw
  weightFix(x, y, z, acc, bi) {
    if (z < 0.17 || Math.abs(x) > 0.13 || y < 2.3 || y > 2.5) return;
    const line = 2.401 + 0.35 * x * x, k = smoothstep(line - 0.004, line + 0.004, y) * (1 - smoothstep(0.08, 0.13, Math.abs(x)));
    const head = acc[bi.head], jaw = acc[bi.jaw], tot = head + jaw;
    if (tot <= 0) return;
    const keepK = smoothstep(0.08, 0.13, Math.abs(x));
    acc[bi.head] = lerp(tot * k, head, keepK); acc[bi.jaw] = lerp(tot * (1 - k), jaw, keepK);
  },
  jiggle: { belly: [70, 6, 0.09, 0.02], apron: [55, 5, 0.08, 0.025], breastL: [85, 7, 0.05, 0.012], breastR: [85, 7, 0.05, 0.012],
    flankL: [80, 7, 0.06, 0.015], flankR: [80, 7, 0.06, 0.015], flabL: [95, 8, 0.05, 0.012], flabR: [95, 8, 0.05, 0.012],
    chin: [110, 9, 0.03, 0.008], jowlL: [140, 10, 0.02, 0.005], jowlR: [140, 10, 0.02, 0.005] },
  gait: { step: [0.6, 0.8], stance: 0.62, lift: 0.13, footX: 0.41, toeOut: 0.18, knee: 0.4, sway: 0.08, roll: 0.55, dip: 0.055, bounce: 0.02, squat: 0.06,
    twist: 0.07, lean: [0.17, 0.2, 0.46], breath: 0.32, breathAmp: 0.012, armSwing: 0.22, armOut: 0.2, elbow: 0.25, curl: 0.35,
    huntArms: 0.75, huntArmIn: -0.15, huntElbow: 0.45, huntClav: 0.12, huntNeck: 0.25, huntJaw: 0.34, jaw: 0.1, gruntJaw: 0.55,
    neckDown: -0.04, headDown: 0.06, headTilt: 0.09, headRate: 2.4, turnStep: 0.5, runFrom: 1.2, runTo: 2.6, stepPower: 1.4, unhinge: 0.05 },
  skinMat: { rough: 0.6, coat: 0.3, coatRough: 0.42, sss: 0x7a3022, poreF: 150 },
  skinGLSL: `
    // mottled, blotched, bruised, veined; dirt up the legs and ground into the hands
    float mt = cF(vRest * 2.4);
    diffuseColor.rgb *= 0.8 + 0.36 * mt;
    float bl = smoothstep(0.56, 0.74, cF(vRest * 1.25 + vec3(5.0, 1.0, 3.0)));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.8, 0.6, 0.74), bl * 0.55);
    float yb = smoothstep(0.6, 0.8, cF(vRest * 1.9 + vec3(9.0, 2.0, 4.0)));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.0, 0.88, 0.64), yb * 0.45);
    float bFw = length(fwidth(vRest));
    float vn = cRidge(vRest * vec3(3.6, 6.4, 3.6) + vec3(3.0, 0.0, 7.0), 0.06) * smoothstep(0.45, 0.65, cN(vRest * 1.3 + 2.0)) * (1.0 - smoothstep(0.02, 0.06, bFw * 6.4));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.68, 0.92), vn * 0.4);
    bH += vn * 0.3;
    float sm = cRidge(vec3(vRest.x * 5.0 + vRest.y * 11.0, vRest.y * 2.0, vRest.z * 5.0), 0.08) * smoothstep(0.55, 0.7, cN(vRest * 3.1)) * step(0.55, vRest.y) * (1.0 - smoothstep(1.0, 1.5, vRest.y)) * (1.0 - smoothstep(0.03, 0.08, bFw * 11.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.16, 1.06, 1.08), sm * 0.6);
    float dirt = (1.0 - smoothstep(0.05, 0.62, vRest.y)) * (0.55 + 0.45 * cN(vRest * 7.0));
    float hd = smoothstep(1.24, 1.36, abs(vRest.x)) * (1.0 - smoothstep(0.92, 1.12, vRest.y)) * (0.6 + 0.4 * cN(vRest * 13.0));
    diffuseColor.rgb *= mix(vec3(1.0), vec3(0.48, 0.41, 0.34), max(dirt, hd * 0.8));
    bRough = mix(bRough, 0.82, max(dirt, hd));
    // the scars: down the belly, and across the scalp, stitched and stapled
    float sx = abs(vRest.x - 0.015 * sin(vRest.y * 11.0));
    float sIn = step(0.95, vRest.y) * step(vRest.y, 1.52) * step(0.5, vRest.z);
    float scar = (1.0 - smoothstep(0.004, 0.012, sx)) * sIn;
    float stitch = (1.0 - smoothstep(0.0006, 0.0018, abs(fract(vRest.y / 0.028) - 0.5) * 0.028)) * (1.0 - smoothstep(0.016, 0.022, sx)) * sIn;
    float hz = abs(vRest.z - 0.07 - 0.025 * sin(vRest.x * 22.0));
    float hIn = step(2.6, vRest.y) * step(abs(vRest.x), 0.15);
    float hscar = (1.0 - smoothstep(0.003, 0.009, hz)) * hIn;
    float staple = (1.0 - smoothstep(0.0008, 0.002, abs(fract(vRest.x / 0.03) - 0.5) * 0.03)) * (1.0 - smoothstep(0.012, 0.016, hz)) * hIn;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.15, 0.14), max(scar, hscar) * 0.85);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.05, 0.05), stitch * 0.9);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.42, 0.44), staple * 0.95);
    bH += (scar + hscar) * 0.7 - stitch * 0.3 + staple * 0.4;
    bRough = mix(bRough, 0.3, staple);
    // the forehead furrowed, close up
    float fw = smoothstep(2.565, 2.59, vRest.y) * (1.0 - smoothstep(2.62, 2.65, vRest.y)) * step(0.18, vRest.z) * (1.0 - smoothstep(0.1, 0.4, bFw * 160.0));
    bH += sin(vRest.y * 160.0 + cN(vRest * 30.0) * 2.0) * 0.18 * fw;
    // whatever it has done lately: dark blood round the mouth and down the chest, on the hands, under the feet
    float gm = 1.0 - smoothstep(0.03, 0.17, length((vRest - vec3(0.0, 2.37, 0.27)) * vec3(1.0, 0.8, 1.3)));
    float gd = (1.0 - smoothstep(0.012, 0.03, abs(vRest.x + 0.03 * sin(vRest.y * 20.0)))) * step(vRest.y, 2.34) * step(1.55, vRest.y) * step(0.25, vRest.z) * smoothstep(0.35, 0.6, cN(vec3(vRest.x * 30.0, vRest.y * 4.0, 1.0)));
    float gh = (1.0 - smoothstep(0.78, 1.0, vRest.y)) * smoothstep(1.26, 1.36, abs(vRest.x));
    float gf = 1.0 - smoothstep(0.06, 0.2, vRest.y);
    float gore = uGore * clamp(gm + gd + gh * 0.8 + gf * 0.85, 0.0, 1.0) * (0.55 + 0.45 * cN(vRest * 24.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.012, 0.008), gore * 0.92);
    bWet = max(bWet, gore * 0.9);`,
  extras: chudExtras,
};

// ---------- the parts that aren't skin: eyes, teeth, nails, what is left of the hospital ----------
function beastAttach(B, bone, obj, x, y, z) { const r = B.rest[bone]; obj.position.set(x - r.x, y - r.y, z - r.z); B.bones[bone].add(obj); return obj; }
let _eyeTex = null;
function beastEyeTex() {
  if (_eyeTex) return _eyeTex;
  // a yellowed, bloodshot eye, a milky grey iris, a pinprick of pupil: it looks out along +z (u = 0.25)
  _eyeTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#a8977a'; g.fillRect(0, 0, w, h);
    const r = mulberry32(919);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = 'rgba(' + (120 + r() * 60 | 0) + ',20,24,' + (0.25 + r() * 0.5) + ')'; g.lineWidth = 0.5 + r() * 1.3;
      let x = r() * w, y = r() < 0.5 ? 0 : h; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 22; y += (y < h / 2 ? 1 : -1) * (6 + r() * 10); g.lineTo(x, y); }
      g.stroke();
    }
    const cx = w * 0.25, cy = h / 2;
    const gr = g.createRadialGradient(cx, cy, 1, cx, cy, 20);
    gr.addColorStop(0, '#050404'); gr.addColorStop(0.24, '#050404'); gr.addColorStop(0.3, '#4a463a'); gr.addColorStop(0.72, '#6e6a58'); gr.addColorStop(0.88, '#22201c'); gr.addColorStop(1, 'rgba(34,32,28,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 40; i++) { const a = r() * 6.28; g.strokeStyle = 'rgba(220,222,210,' + r() * 0.3 + ')'; g.beginPath(); g.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4); g.lineTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17); g.stroke(); }
  });
  return _eyeTex;
}
function beastEye(B, bone, x, y, z, r, s, opts = {}) {
  const g = new THREE.Group();
  const eye = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), opts.mat || new THREE.MeshStandardMaterial({ map: beastEyeTex(), roughness: 0.12, metalness: 0 }));
  g.add(eye);
  const film = new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02 }));
  g.add(film);
  beastAttach(B, bone, g, x, y, z);
  const e = { g, s, wrong: opts.wrong || 0, lid: null, lidOpen: opts.lidOpen !== undefined ? opts.lidOpen : -0.55, lidShut: 1.25 };
  if (opts.lids !== false) {
    const lidM = opts.lidMat || plainMat(0x7a5e58, { roughness: 0.55 });
    const lid = new THREE.Mesh(new THREE.SphereGeometry(r * 1.14, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), lidM);
    const lp = new THREE.Group(); lp.position.copy(g.position); g.parent.add(lp); lp.add(lid);
    lid.rotation.x = 0; e.lid = lp;
    const low = new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 18, 6, 0, Math.PI * 2, Math.PI * 0.7, Math.PI * 0.3), lidM);
    const lw = new THREE.Group(); lw.position.copy(g.position); lw.rotation.x = -0.15; g.parent.add(lw); lw.add(low);
  }
  (B.eyes || (B.eyes = [])).push(e);
  return e;
}
// a row of teeth along an arc: [y of the gum, which way they point (-1 down, 1 up), arc centre z, radius]
function beastTeeth(B, bone, cy, dir, cz, rad, opts) {
  const T = new Batch(), r = mulberry32(opts.seed || 7), parent = new THREE.Group();
  const tooth = opts.toothMat || plainMat(0xb8a478, { roughness: 0.32 }), rot = plainMat(0x5a4426, { roughness: 0.5 }), gum = opts.gumMat || plainMat(0x6a2a26, { roughness: 0.3 });
  const n = opts.n || 12, a0 = opts.a0 || -1.15, a1 = opts.a1 || 1.15, rest = B.rest[bone];
  for (let i = 0; i < n; i++) {
    if (opts.gap && opts.gap.includes(i)) continue;
    const a = lerp(a0, a1, i / (n - 1)), front = Math.cos(a);
    const x = Math.sin(a) * rad, z = cz + Math.cos(a) * rad * 0.85;
    const len = (opts.len || 0.018) * (0.75 + r() * 0.6) * (Math.abs(i - (n - 1) / 2) < 1 ? 1.1 : 1) * (opts.fang && opts.fang.includes(i) ? 1.9 : 1);
    const wdt = (opts.w || 0.011) * (0.8 + front * 0.35);
    const m = r() < 0.18 ? rot : tooth;
    const tilt = (r() - 0.5) * 0.35, lean = (r() - 0.5) * 0.25 + dir * 0.08;
    const geo = cachedGeo('tooth' + (opts.fang && opts.fang.includes(i) ? 'f' : 'n'), () => { const gg = new THREE.CylinderGeometry(0.35, 0.5, 1, 6, 1); gg.translate(0, -0.5, 0); return gg; });
    T.add(m, geo, xform(x - rest.x, cy - rest.y, z - rest.z, a, dir > 0 ? Math.PI + lean : lean, tilt, wdt, len, wdt * 0.7));
  }
  // the gum the row grows out of
  T.add(gum, torusGeo(1, 0.16, 6, 20, a1 - a0 + 0.2), xform(-rest.x, cy - rest.y + dir * 0.002, cz - rest.z, a1 + 0.1 - Math.PI / 2, Math.PI / 2, 0, rad, rad * 0.85, opts.gumH || 0.06));
  T.build(parent);
  B.bones[bone].add(parent);
  return parent;
}
function chudExtras(B) {
  const skinDark = plainMat(0x3e2c28, { roughness: 0.62 });
  // small eyes, set deep, one of them looking a little wrong
  for (const s of [-1, 1]) beastEye(B, 'head', s * 0.055, 2.51, 0.244, 0.0162, s, { wrong: s > 0 ? 0.12 : 0, lidMat: skinDark });
  // the mouth: the back of the throat, the tongue, gums and teeth gone bad - two long ones in the bottom row
  const throat = new THREE.Mesh(sphereGeo(1, 14, 10), plainMat(0x1a0404, { roughness: 0.4 })); throat.scale.set(0.058, 0.04, 0.05);
  beastAttach(B, 'head', throat, 0, 2.39, 0.215);
  const tongue = new THREE.Mesh(sphereGeo(1, 16, 10), plainMat(0x7a3432, { roughness: 0.25 })); tongue.scale.set(0.042, 0.013, 0.055);
  beastAttach(B, 'jaw', tongue, 0, 2.384, 0.222);
  beastTeeth(B, 'head', 2.414, -1, 0.215, 0.054, { n: 13, seed: 11, gap: [3, 9], len: 0.017 });
  beastTeeth(B, 'jaw', 2.39, 1, 0.21, 0.05, { n: 12, seed: 23, gap: [5], fang: [2, 8], len: 0.014 });
  // nails: thick, yellow, cracked, packed with dirt
  const nail = plainMat(0x9a8a62, { roughness: 0.35 });
  for (const s of [1, -1]) {
    const S = s > 0 ? 'L' : 'R';
    for (const [o, l1, l2, k] of CHUD_FINGERS) {
      const n = new THREE.Mesh(cboxGeo(0.006, 0.034 * k, 0.03 * k, 0.002), nail); n.rotation.z = s * 0.12;
      beastAttach(B, 'tip' + S, n, s * (1.413 + 0.022 * k), 0.905 - l1 - l2 + 0.022, 0.12 + o);
    }
    const tn = new THREE.Mesh(cboxGeo(0.006, 0.03, 0.028, 0.002), nail); tn.rotation.y = -s * 0.75;
    beastAttach(B, 'thumb' + S, tn, s * 1.372, 0.878, 0.284);
    for (const [x, zr, r] of CHUD_TOES) { const t2 = new THREE.Mesh(cboxGeo(r * 1.05, 0.006, r * 1.05, 0.002), nail); t2.rotation.x = -0.12; beastAttach(B, 'toe' + S, t2, s * (x + (x - 0.41) * 0.15), 0.035 + r * 0.82, zr - r * 0.5); }
  }
  // the hospital band on its left wrist; the torn restraint cuff on its right; a shackle on its left ankle
  const band = new THREE.Mesh(torusGeo(0.124, 0.01, 8, 28), plainMat(0xd8d8cc, { roughness: 0.35 }));
  band.rotation.set(Math.PI / 2, 0, 0.45); beastAttach(B, 'elbowL', band, 1.302, 1.135, 0.075);
  const tag = new THREE.Mesh(cboxGeo(0.05, 0.03, 0.006, 0.002), plainMat(0xe8e6da, { roughness: 0.4 })); tag.rotation.set(0, Math.PI / 2, 0.45); beastAttach(B, 'elbowL', tag, 1.42, 1.15, 0.1);
  const leather = plainMat(0x2e1f16, { roughness: 0.6 }), iron = mat('rust');
  const cuff = new THREE.Mesh(cylGeo(0.134, 0.128, 0.075, 24, 1, true), leather); cuff.rotation.z = -0.45; cuff.material.side = THREE.DoubleSide;
  beastAttach(B, 'elbowR', cuff, -1.296, 1.14, 0.075);
  const buckle = new THREE.Mesh(cboxGeo(0.05, 0.05, 0.012, 0.004), plainMat(0x8a8478, { roughness: 0.3, metalness: 0.9 })); buckle.rotation.set(0, Math.PI / 2, -0.45); beastAttach(B, 'elbowR', buckle, -1.44, 1.2, 0.085);
  const strap = new THREE.Mesh(cboxGeo(0.045, 0.32, 0.008, 0.003), leather); strap.rotation.set(0.15, Math.PI / 2, -0.25); beastAttach(B, 'elbowR', strap, -1.43, 1.02, 0.12);
  const shackle = new THREE.Mesh(torusGeo(0.172, 0.018, 8, 28), iron); shackle.rotation.x = Math.PI / 2; beastAttach(B, 'shinL', shackle, 0.41, 0.21, 0.03);
  for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(torusGeo(0.032, 0.008, 6, 12), iron); l.rotation.set(k % 2 ? Math.PI / 2 : 0, 0.3, 0); beastAttach(B, 'shinL', l, 0.53 + k * 0.035, 0.16 - k * 0.045, 0.12 + k * 0.01); }
}

// ---------- the one in the level, and the old names for it ----------
const Chud = makeBeast(CHUD_DEF);
function buildChud(scene) { return buildBeast(Chud, scene); }
function chudBuildStep(budgetMs, scene) { return beastBuildStep(Chud, budgetMs, scene); }
function chudPose(dt, t) { bipedPose(Chud, dt, t); if (Chud.mats.length) for (const m of Chud.mats) m.userData.U.uGore.value = Chud.gore; }
function chudGrunt() { Chud.gruntT = 0.8; }
function setChudVisible(v) { setBeastVisible(Chud, v); }

// ================= when it catches someone =================
// It snatches you up in one fist and lifts you to its face, and looks at you. Then the jaw comes open - and keeps
// opening, wider than a jaw should go - and it bites. It shakes you like a dog with your head in its mouth,
// hurls you down at its feet, and stamps, and stamps again. Every beat of it is a function of the time since
// the grab, worked out the same on every machine from the same few numbers (g.kl), in the frame of where it
// stood when it took you: kl.x, kl.z facing kl.y, and where you were, kl.vx, kl.vz.
const CHUD_KILL = 6.6;
const CK_T = { snatch: 0.32, hoist: 1.1, open: 2.05, bite: 2.17, thrash: 2.3, raise: 3.45, hurl: 3.62, land: 3.76, over: 3.85, stomp1: 4.86, grind: 5.0, stomp2: 5.62, done: 5.9 };
// where its root is pushed, how far it leans, its jaw, how its head is pitched and rolled
const CK_LUNGE = [[0, 0], [0.26, 0.5], [0.6, 0.42], [1.1, 0.32], [2.05, 0.3], [2.17, 0.38], [3.45, 0.32], [3.7, 0.4], [4.0, 0.32], [4.45, 0.36], [4.86, 0.48], [5.62, 0.48], [6.1, 0.42], [6.6, 0.0]];
const CK_LEAN = [[0, 0], [0.26, 0.38], [1.1, 0.1], [2.05, 0.02], [2.17, 0.32], [2.3, 0.22], [3.45, 0.18], [3.62, -0.08], [3.76, 0.62], [4.2, 0.42], [4.6, 0.18], [4.86, 0.32], [5.3, 0.2], [5.62, 0.32], [6.1, 0.5], [6.6, 0.2]];
const CK_JAW = [[0, 0.1], [0.12, 0.42], [0.32, 0.3], [0.9, 0.12], [1.15, 0.14], [1.6, 0.62], [2.0, 1.08], [2.08, 1.12], [2.17, 0.16], [2.3, 0.2], [3.45, 0.24], [3.55, 0.55], [3.76, 0.6], [4.3, 0.25], [4.86, 0.5], [5.62, 0.6], [6.1, 0.85], [6.6, 0.2]];
const CK_HEAD = [[0, 0, 0], [0.32, 0.05, 0.05], [0.7, 0.1, 0.32], [1.1, 0.0, 0.22], [1.6, -0.12, 0.05], [2.05, -0.2, 0.0], [2.13, 0.32, 0.0], [2.3, 0.12, 0.0], [3.45, 0.1, 0.0], [3.76, 0.5, 0.0], [4.4, 0.42, -0.2], [4.86, 0.3, 0.0], [5.62, 0.35, 0.0], [6.1, 0.6, 0.35], [6.6, 0.2, 0.1]];
// your head, held up in front of its face: [t, how far in front, across, up] - drawn closer as the jaw opens
const CK_VHOLD = [[0.32, 0.72, -0.12, -0.12], [0.7, 0.58, -0.04, -0.06], [1.1, 0.47, 0, -0.06], [1.6, 0.33, 0, -0.08], [2.05, 0.19, 0, -0.1]];
const CK_RAISE = [[3.45, 0, 0, 0], [3.55, 0.05, 2.35, 0.62], [3.62, 0.1, 2.5, 0.66], [3.69, 0.2, 1.3, 0.92], [3.76, 0.62, 0.15, 1.08]];
// where you end up: on your back across its feet. The chest is where it stamps.
const CK_LIE = { hip: [0.05, 0.13, 1.05], head: [0.82, 0.15, 1.12], feet: [-0.84, 0.1, 0.98] };
// its left foot: up over you, down on your chest, a grind, up again, down again
const CK_FOOT = [[4.4, 0], [4.72, 1], [4.86, 2], [5.0, 2], [5.12, 3], [5.42, 1], [5.62, 2], [6.0, 2], [6.3, 4]];
const _ck = { a: [], b: [], c: [] };
const _ckF = { o: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3() };
const _ckV = new THREE.Vector3(), _ckW = new THREE.Vector3(), _ckM = new THREE.Vector3(), _ckH = new THREE.Vector3(), _ckL = new THREE.Vector3(), _ckP = new THREE.Vector3();
// a point in the kill's frame (x across, y up, z forward from where it stood) into the world
function ckWorld(kl, x, y, z, out) {
  const fx = Math.sin(kl.y), fz = Math.cos(kl.y);
  return out.set(kl.x + fz * x + fx * z, y, kl.z - fx * x + fz * z);
}
function ckLocal(kl, wx, wz) {
  const fx = Math.sin(kl.y), fz = Math.cos(kl.y), dx = wx - kl.x, dz = wz - kl.z;
  return { x: dx * fz - dz * fx, z: dx * fx + dz * fz };
}
// its face, and which way its head is pointing, as it is posed now
const _cfF = new THREE.Vector3(), _cfU = new THREE.Vector3(), _cfR = new THREE.Vector3();
function chudFace(out) {
  const h = Chud.bones.head; h.updateWorldMatrix(true, false);
  h.localToWorld(out.set(0, 2.47 - Chud.rest.head.y, 0.27 - Chud.rest.head.z));
  _cfF.set(0, 0, 1).transformDirection(h.matrixWorld); _cfU.set(0, 1, 0).transformDirection(h.matrixWorld); _cfR.set(1, 0, 0).transformDirection(h.matrixWorld);
  return out;
}
function ckHold(T, out) {
  trackAt(CK_VHOLD, T, _ck.c);
  chudFace(out);
  return out.addScaledVector(_cfF, _ck.c[0]).addScaledVector(_cfR, _ck.c[1]).addScaledVector(_cfU, _ck.c[2]);
}
// the mouth, in the world, from the jaw as it is posed now
function chudMouth(out) {
  const b = Chud.bones;
  b.head.localToWorld(out.set(0, 2.402 - Chud.rest.head.y, 0.3 - Chud.rest.head.z));
  return out;
}
// The thrash: its head and shoulders whip from side to side, building and then dying away.
function ckThrash(T) {
  const k = clamp((T - CK_T.thrash) / (CK_T.raise - CK_T.thrash), 0, 1);
  const amp = smooth01(k / 0.25) * (1 - smooth01((k - 0.75) / 0.25)) * 0.62;
  const ph = (T - CK_T.thrash) * Math.PI * 2 * 3.1;
  return { yaw: amp * Math.sin(ph), roll: amp * 0.35 * Math.sin(ph + 0.6), swing: amp * 1.7 * Math.sin(ph - 1.1), amp };
}
// everything about its own body this frame
function chudKillOverrides(kl, T) {
  const ov = Chud.ov || (Chud.ov = {});
  for (const k in ov) delete ov[k];
  ov.lunge = trackAt(CK_LUNGE, T, _ck.a)[0];
  ov.lean = trackAt(CK_LEAN, T, _ck.a)[0];
  ov.jaw = trackAt(CK_JAW, T, _ck.a)[0];
  trackAt(CK_HEAD, T, _ck.a); ov.headPitch = _ck.a[0]; ov.headRoll = _ck.a[1];
  ov.still = true;
  const th = ckThrash(T);
  if (th.amp > 0) { ov.chestYaw = th.yaw; ov.chestRoll = th.roll; ov.hipYaw = -th.yaw * 0.3; ov.headRoll += th.roll * 0.8; }
  // crouched over it the whole time, lower still once you are on the floor
  ov.drop = 0.12 * smooth01(T / 0.25) + (T > CK_T.hurl && T < 6.2 ? 0.08 * smooth01((T - CK_T.hurl) / 0.3) * (1 - smooth01((T - 5.9) / 0.3)) : 0);
  // two quick steps in as it snatches you, then its feet stay where they are
  const kr = smooth01(T / 0.24), kf = smooth01((T - 0.26) / 0.24);
  ov.footR = ckWorld(kl, -0.41, 0.12 + Math.sin(kr * Math.PI) * 0.16, lerp(0.03, 0.5, kr), _ckF.r2 || (_ckF.r2 = new THREE.Vector3()));
  ov.footL = ckWorld(kl, 0.41, 0.12 + Math.sin(kf * Math.PI) * 0.12, lerp(0.03, 0.25, kf), _ckF.l2 || (_ckF.l2 = new THREE.Vector3()));
  // and at the end it steps back off you
  const kb = smooth01((T - 6.05) / 0.25);
  if (kb > 0) ckWorld(kl, -0.41, 0.12 + Math.sin(kb * Math.PI) * 0.12, lerp(0.5, 0.03, kb), ov.footR);
  // the stomps: its left knee comes up over you and the foot comes down
  const fk = trackAt(CK_FOOT, T, _ck.a)[0];
  if (T > 4.4 && T < 6.6) {
    const up = ckWorld(kl, 0.34, 0.85, 0.82, _ckF.o), down = ckWorld(kl, 0.3, 0.3, 1.02, _ckF.f), back = ckWorld(kl, 0.41, 0.12, 0.25, _ckF.r);
    const p = _ckF.p || (_ckF.p = new THREE.Vector3());
    if (fk <= 1) p.lerpVectors(back, up, fk);
    else if (fk <= 2) p.lerpVectors(up, down, fk - 1);
    else if (fk <= 3) p.lerpVectors(down, up, (fk - 2) * 0.35).y += Math.sin((fk - 2) * Math.PI) * 0.02;
    else if (T < 6.3) p.lerpVectors(down, back, fk - 3);
    else { const kh = smooth01((T - 6.3) / 0.28); ckWorld(kl, 0.41, 0.12 + Math.sin(kh * Math.PI) * 0.1, lerp(0.25, 0.03, kh), p); }
    ov.footL = p; ov.footPitch = fk > 1.5 && fk < 3.2 ? 0.08 : -0.25 * Math.min(1, fk); ov.footYaw = fk > 2 && fk < 3 ? Math.sin((T - 5.0) * 18) * 0.12 : 0;
  }
  ov.lookFwd = T < CK_T.raise;
  ov.beforeArms = chudKillHands;
  return ov;
}
// Where you are, now that its head is where it is - then its hands go to you.
const CKV = { head: new THREE.Vector3(), hip: new THREE.Vector3(), feet: new THREE.Vector3(), face: new THREE.Vector3(0, 1, 0), axis: new THREE.Vector3(0, 1, 0), live: 1, phase: 2, t: -1, T: -1, held: false };
function chudKillVictim(kl, T) {
  const V = CKV, fx = Math.sin(kl.y), fz = Math.cos(kl.y), rt = { x: fz, z: -fx };
  V.t = kl.t; V.T = T;
  const kick = Math.sin(T * 9.3) * 0.08, live = T < CK_T.bite ? 1 : T < CK_T.stomp1 ? 0.55 : 0;
  V.live = live; V.held = T < CK_T.hurl + 0.05;
  if (T < CK_T.snatch) {
    // snatched up from where you stood
    const k = smooth01(T / CK_T.snatch), v = ckLocal(kl, kl.vx === undefined ? kl.x + fx * 1.5 : kl.vx, kl.vz === undefined ? kl.z + fz * 1.5 : kl.vz);
    ckHold(CK_T.snatch, _ckW); ckWorld(kl, v.x, 1.6, v.z, _ckV);
    V.head.set(lerp(_ckV.x, _ckW.x, k), lerp(_ckV.y, _ckW.y, k * k), lerp(_ckV.z, _ckW.z, k));
    V.hip.set(V.head.x, V.head.y - 0.65, V.head.z); V.feet.set(V.head.x + fx * 0.25 * k, Math.max(0.05, V.head.y - 1.55), V.head.z + fz * 0.25 * k);
    V.face.set(-fx, 0, -fz); V.phase = 2;
  } else if (T < CK_T.bite - 0.05) {
    // in its fist, held up to its face; drawn to the mouth as it opens
    ckHold(T, V.head);
    V.hip.set(V.head.x + Math.sin(T * 2.1) * 0.08, V.head.y - 0.66, V.head.z + fz * 0.05);
    V.feet.set(V.hip.x + kick * fz, V.hip.y - 0.88, V.hip.z - kick * fx);
    V.face.set(-fx, 0, -fz); V.phase = 2;
  } else if (T < CK_T.raise) {
    // its teeth in your head and shoulders: you hang from its mouth, and swing
    const k = smooth01((T - (CK_T.bite - 0.05)) / 0.1);
    ckHold(CK_T.open, _ckV);
    chudMouth(_ckM); _ckM.addScaledVector(_ckW.set(fx, 0, fz), 0.07); _ckM.y -= 0.04;
    V.head.lerpVectors(_ckV, _ckM, k);
    const th = ckThrash(T), sw = th.swing, out = Math.abs(sw) * 0.25;
    // the body hangs down and away from it, flung out to the sides as it shakes
    const sx = Math.sin(sw), cy = Math.cos(sw);
    V.hip.set(V.head.x + rt.x * sx * 0.66 + fx * (0.12 + out), V.head.y - cy * 0.66 + out * 0.3, V.head.z + rt.z * sx * 0.66 + fz * (0.12 + out));
    V.feet.set(V.hip.x + rt.x * sx * 0.85 + fx * (0.1 + out), Math.max(0.05, V.hip.y - cy * 0.85), V.hip.z + rt.z * sx * 0.85 + fz * (0.1 + out));
    V.face.set(-fx, 0.2, -fz).normalize(); V.phase = 2;
  } else if (T < CK_T.land) {
    // up, and hurled down at its feet
    trackAt(CK_RAISE, T, _ck.b);
    const k = smooth01((T - CK_T.raise) / (CK_T.land - CK_T.raise));
    ckWorld(kl, _ck.b[0], Math.max(0.15, _ck.b[1]), _ck.b[2], V.head);
    const lieHip = ckWorld(kl, ...CK_LIE.hip, _ckV), lieFeet = ckWorld(kl, ...CK_LIE.feet, _ckW);
    V.hip.lerpVectors(_ckP.set(V.head.x - rt.x * 0.65, V.head.y - 0.1, V.head.z - rt.z * 0.65), lieHip, k);
    V.feet.lerpVectors(_ckP.set(V.head.x - rt.x * 1.5, V.head.y - 0.2, V.head.z - rt.z * 1.5), lieFeet, k);
    V.face.set(0, 1, 0); V.phase = 4;
  } else {
    // on your back at its feet. Each stamp drives your chest into the floor.
    ckWorld(kl, ...CK_LIE.head, V.head); ckWorld(kl, ...CK_LIE.hip, V.hip); ckWorld(kl, ...CK_LIE.feet, V.feet);
    const bounce = T < CK_T.over ? Math.sin((T - CK_T.land) / (CK_T.over - CK_T.land) * Math.PI) * 0.09 : 0;
    V.hip.y += bounce; V.head.y += bounce * 0.7;
    if (T > CK_T.stomp1) { V.hip.y -= 0.04; V.head.y -= 0.02; }
    V.face.set(0, 1, 0); V.phase = 4;
  }
  V.axis.set(-fx, 0, -fz);
  return V;
}
function chudKillHands(B) {
  const kl = B._kl, T = B._kT; if (!kl) return;
  const V = chudKillVictim(kl, T), ov = B.ov;
  // a point on your chest, and either side of it
  _ckH.subVectors(V.hip, V.head).multiplyScalar(0.38).add(V.head);
  const fx = Math.sin(kl.y), fz = Math.cos(kl.y);
  if (T < CK_T.snatch) {
    ov.armR = _ckH.clone(); ov.gripR = clamp(T / CK_T.snatch * 1.6 - 0.2, 0, 1);
  } else if (V.held) {
    ov.armR = _ckH.clone().add(_ckL.set(-fz * 0.16, -0.02, fx * 0.16));
    const lk = smooth01((T - 0.5) / 0.4);
    if (lk > 0) ov.armL = new THREE.Vector3().lerpVectors(ckWorld(kl, 0.95, 1.2, 0.35, _ckP), _ckH.clone().add(_ckL.set(fz * 0.16, -0.02, -fx * 0.16)), lk);
    ov.gripR = 1; ov.gripL = 0.4 + lk * 0.6;
  } else if (T < CK_T.over + 0.6) {
    // hands thrown down after you, then hanging, fists clenching
    const k = smooth01((T - CK_T.hurl) / 0.6);
    ov.armR = ckWorld(kl, lerp(-0.25, -0.75, k), lerp(0.95, 1.1, k), lerp(0.95, 0.4, k), new THREE.Vector3());
    ov.armL = ckWorld(kl, lerp(0.25, 0.75, k), lerp(0.95, 1.1, k), lerp(0.95, 0.4, k), new THREE.Vector3());
    ov.gripR = ov.gripL = 0.6;
  } else { ov.gripR = ov.gripL = 0.75 + 0.2 * Math.sin(T * 7); }
  // once you are on the floor, it looks down at you
  ov.look = T > CK_T.hurl ? V.head : null;
}
// the gripping point, for anything that wants it (the old name)
function chudGripPoint(out) { return out.copy(CKV.head); }
function chudKillBody(kl, T) {
  if (CKV.t !== kl.t || Math.abs(CKV.T - T) > 0.2) chudKillVictim(kl, T);
  return CKV;
}
function chudDropPose(kl, out) {
  ckWorld(kl, ...CK_LIE.head, out.head); ckWorld(kl, ...CK_LIE.hip, out.hip); ckWorld(kl, ...CK_LIE.feet, out.feet);
  out.hip.y -= 0.04; out.face.set(0, 1, 0); out.axis.set(-Math.sin(kl.y), 0, -Math.cos(kl.y));
  return out;
}

// the beats of it, heard by everyone near enough, and the body left behind after
const CHUD_KILL_SOUNDS = [
  [0.03, (p) => { Sound.chudGrunt(p, true); }], [0.3, (p) => Sound.play('thud', p)], [0.95, (p) => Sound.chudBreath(p, true, 2)],
  [1.18, (p, me) => { Sound.play('jawOpen', p); if (me) R.fearKick = 1; }], [1.75, (p) => Sound.play('gurgle', p)],
  [CK_T.bite, (p, me) => { Sound.play('bite', p); Sound.play('crack', p); if (me) { R.hit = 2; R.bleed = 1; } Chud.gore = Math.min(1, Chud.gore + 0.55); }],
  [2.45, (p) => Sound.play('crack', p)], [2.75, (p) => Sound.whoosh(p)], [2.95, (p) => Sound.play('crack', p)], [3.15, (p) => Sound.whoosh(p)],
  [3.6, (p) => Sound.chudGrunt(p, true)],
  [CK_T.land, (p, me, d, lie) => { Sound.play('slam', lie); Sound.chudStep(lie, 1.3, me ? 1 : clamp(1 - d / 14, 0, 1)); debrisBurst(lie.x, 0.1, lie.z, 'f', 1.1); if (me) { R.shake = 2.4; R.hit = 2; R.whiteFlash = 0.15; } else R.shake = Math.max(R.shake || 0, clamp(1.3 - d * 0.1, 0, 1.3)); }],
  [4.3, (p) => Sound.chudBreath(p, true, 2)],
  [CK_T.stomp1, (p, me, d, lie) => { Sound.chudStep(lie, 1.4, me ? 1 : clamp(1 - d / 12, 0, 1)); Sound.play('crunch', lie); debrisBurst(lie.x, 0.1, lie.z, 'f', 0.9); if (me) { R.fade = 1; R.bleed = 1; } else R.shake = Math.max(R.shake || 0, clamp(1.4 - d * 0.1, 0, 1.4)); Chud.gore = Math.min(1, Chud.gore + 0.3); chudBloodPool(lie, 0.8); }],
  [5.1, (p, me, d, lie) => Sound.play('squelch', lie)],
  [CK_T.stomp2, (p, me, d, lie) => { Sound.chudStep(lie, 1.4, me ? 1 : clamp(1 - d / 12, 0, 1)); Sound.play('crunch', lie); if (me) R.fade = 1; else R.shake = Math.max(R.shake || 0, clamp(1.4 - d * 0.1, 0, 1.4)); chudBloodPool(lie, 1.25); }],
  [6.1, (p) => Sound.chudGrunt(p, false)],
];
function updateChudKill(dt) {
  const g = Game.g, kl = g && g.kl;
  if (!kl || kl.c !== 1 || Game.gt === undefined) return;
  const T = Game.gt - kl.t;
  if (Game.ckId !== kl.t) { Game.ckId = kl.t; Game.ckLast = -1; }
  if (T < 0) return;
  const mine = kl.id === netMyId(), pos = { x: kl.x, y: 2.2, z: kl.z };
  const d = Game.me ? dist2(Game.me.x, Game.me.z, kl.x, kl.z) : 99;
  const lie = ckWorld(kl, ...CK_LIE.hip, new THREE.Vector3()); lie.y = 0.2;
  for (const [at, fn] of CHUD_KILL_SOUNDS) if (Game.ckLast < at && T >= at && T < at + 1) fn(pos, mine, d, lie);
  Game.ckLast = T;
  if (T > CHUD_KILL && g.k[kl.id] && !Game.corpses.has(kl.id)) {
    const out = chudDropPose(kl, { head: new THREE.Vector3(), hip: new THREE.Vector3(), feet: new THREE.Vector3(), face: new THREE.Vector3(), axis: new THREE.Vector3() });
    Game.corpses.set(kl.id, Object.assign(out, { live: 0, phase: 4, t: kl.t }));
  }
}
// blood where it happened: a few pools that stay for the rest of the level
function chudBloodPool(p, s) {
  if (!World.group) return;
  const B = World.bloodPools || (World.bloodPools = []);
  const m = new THREE.Mesh(cachedGeo('bloodPool', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), decalMat('blood'));
  m.position.set(p.x + (Math.random() - 0.5) * 0.3, 0.013 + B.length * 0.0004, p.z + (Math.random() - 0.5) * 0.3); m.rotation.y = Math.random() * 6.28; m.scale.set(s * 1.6, 1, s * 1.6);
  m.renderOrder = 1;
  World.group.add(m); B.push(m);
  if (B.length > 10) { const o = B.shift(); if (o.parent) o.parent.remove(o); }
}

// What the one it has sees. Each beat looks at what matters: its face, its eyes, into the mouth; then the room
// whipping past through its teeth; the ceiling as you fall; its face looming over you, then its foot.
const _kc = { look: new THREE.Vector3(), eyes: new THREE.Vector3(), pos: new THREE.Vector3() };
function chudKillCam(T, dt, t) {
  const cam = R.camera, kl = Game.g.kl, V = chudKillBody(kl, T), b = Chud.bones;
  const fx = Math.sin(kl.y), fz = Math.cos(kl.y);
  b.head.localToWorld(_kc.eyes.set(0, 2.505 - Chud.rest.head.y, 0.26 - Chud.rest.head.z));
  chudMouth(_ckM);
  let fov = 66, roll = 0, jit = 0.025;
  if (T < CK_T.snatch) {
    // yanked off your feet toward it
    const k = smooth01(T / CK_T.snatch), sc = Game.scare;
    cam.position.lerpVectors(sc ? sc.from : V.head, V.head, k);
    cam.lookAt(_kc.look.lerpVectors(_ckP.copy(V.head).add(_ckL.set(fx, 0, fz).multiplyScalar(-2)), _kc.eyes, Math.min(1, k * 2.2)));
    fov = lerp(72, 84, k); roll = Math.sin(T * 30) * 0.08; jit = 0.06;
  } else if (T < CK_T.bite - 0.05) {
    // held up to its face; then the mouth opens and you are drawn in
    cam.position.copy(V.head);
    const k = smooth01((T - 1.2) / 0.8);
    cam.lookAt(_kc.look.lerpVectors(_kc.eyes, _ckM, k));
    fov = lerp(80, 56, smooth01((T - CK_T.snatch) / 1.7)); roll = Math.sin(T * 2.3) * 0.06 + (T < 1.1 ? 0.12 : 0);
    jit = 0.012 + k * 0.01;
    R.fade = Math.max(0, k * 0.25);
  } else if (T < CK_T.raise) {
    // in its mouth, looking out past its teeth at the room going round
    cam.position.copy(_ckM).addScaledVector(_ckL.set(fx, 0, fz), 0.06);
    const th = ckThrash(T), a = kl.y + th.yaw * 1.6;
    cam.lookAt(_kc.look.set(cam.position.x + Math.sin(a) * 3, cam.position.y - 0.9, cam.position.z + Math.cos(a) * 3));
    roll = Math.PI * 0.85 + th.roll * 2; fov = 92; jit = 0.08;
    R.fade = 0.45 + 0.3 * Math.abs(Math.sin(T * 9.7));
    R.bleed = Math.max(R.bleed || 0, 0.7);
    if (Math.floor(T * 6.2) !== Math.floor((T - dt) * 6.2)) R.hit = Math.max(R.hit || 0, 1.4);
  } else if (T < CK_T.land) {
    // falling: the ceiling, then the floor coming up
    cam.position.copy(V.head);
    cam.lookAt(_kc.look.copy(V.head).add(_ckL.set(fx * 0.3, 1, fz * 0.3)));
    fov = 80; roll = (T - CK_T.raise) * 6; jit = 0.05;
    R.fade = damp(R.fade, 0.2, 10, dt);
  } else {
    // on your back, looking up at it; then at its foot coming down
    cam.position.copy(V.head); cam.position.y = 0.2;
    const foot = b.footL; foot.getWorldPosition(_ckP);
    const fk = smooth01((T - 4.45) / 0.3);
    cam.lookAt(_kc.look.lerpVectors(_kc.eyes, _ckP, fk));
    fov = lerp(62, 74, fk); roll = 0.4; jit = 0.02;
    if (T < CK_T.stomp1) R.fade = damp(R.fade, 0.18, 4, dt);
    else if (T < CK_T.stomp2) R.fade = damp(R.fade, 0.7, 1.4, dt);
    else R.fade = 1;
  }
  cam.rotateZ(roll);
  cam.position.x += (Math.random() - 0.5) * jit; cam.position.y += (Math.random() - 0.5) * jit; cam.position.z += (Math.random() - 0.5) * jit;
  if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  R.fear = 1;
  setFlash(T < CK_T.snatch ? 1 : T < CK_T.bite ? (Math.random() < 0.2 ? 0.25 : 0.85) : T < CK_T.raise ? 0.3 : T < CK_T.stomp1 ? (Math.random() < 0.3 ? 0.1 : 0.7) : 0);
  R.flashThrow = 1.2; R.bounce.intensity = 0;
  if (World.viewModel) World.viewModel.group.visible = false;
}
