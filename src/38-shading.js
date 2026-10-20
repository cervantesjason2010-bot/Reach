// ================= world shading: contact shadows, grime, damp and puddles from a map of the level =================
const WS = { field: { value: null }, fieldXf: { value: new THREE.Vector4(0, 0, 1, 1) }, grunge: { value: null },
  // light occlusion: an atlas of visibility tiles, and per point/spot light the tile it uses (x, z, 1/size, tile; tile < 0 = none)
  occTex: { value: null }, occPt: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, 0, -1)) }, occSp: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, -1)) } };
const OCC_TILES = 12;

const WS_FRAG_HEAD = `
uniform sampler2D wField; uniform vec4 wFieldXf; uniform sampler2D wGrunge; uniform vec3 wAmt;
uniform sampler2D wOccTex; uniform vec4 wOccPt[16]; uniform vec4 wOccSp[8];
varying vec3 vWPos; varying vec3 vWNrm;
float wLightVis(vec4 r) {
  if (r.w < 0.0) return 1.0;
  vec2 t = (vWPos.xz - r.xy) * r.z + 0.5;
  if (t.x <= 0.0 || t.y <= 0.0 || t.x >= 1.0 || t.y >= 1.0) return 1.0;
  t = clamp(t, 0.6 / 64.0, 1.0 - 0.6 / 64.0);
  return texture2D(wOccTex, vec2((r.w + t.x) / ${OCC_TILES}.0, t.y)).r;
}
float wHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// no visible repeats: every texture tile is turned or mirrored its own way. The tile edges sit on joints and seams,
// so the change hides in the joint. 1 mirror x, 2 mirror x and y, 3 any quarter turn or mirror, 4 turns that keep a checkerboard
#if defined(WS_TILE) && __VERSION__ >= 300
#define WS_TILED
vec2 wUv; vec2 wDx; vec2 wDy; mat2 wTM; float wSlab;
void wTileSetup(vec2 uv) {
  vec2 cell = floor(uv), f = fract(uv) - 0.5;
  float h = wHash(cell + vec2(17.0, 3.0));
  wSlab = wHash(cell + vec2(71.0, 29.0));
#if WS_TILE == 1
  wTM = mat2(vec2(h < 0.5 ? 1.0 : -1.0, 0.0), vec2(0.0, 1.0));
#elif WS_TILE == 2
  wTM = mat2(vec2(h < 0.5 ? 1.0 : -1.0, 0.0), vec2(0.0, fract(h * 7.31) < 0.5 ? 1.0 : -1.0));
#elif WS_TILE == 3
  float r = floor(h * 4.0);
  vec2 c0 = r < 0.5 ? vec2(1.0, 0.0) : r < 1.5 ? vec2(0.0, 1.0) : r < 2.5 ? vec2(-1.0, 0.0) : vec2(0.0, -1.0);
  wTM = mat2(c0 * (fract(h * 7.31) < 0.5 ? 1.0 : -1.0), vec2(-c0.y, c0.x));
#else
  float r = floor(h * 4.0);
  vec2 a = r < 0.5 ? vec2(1.0, 0.0) : r < 1.5 ? vec2(-1.0, 0.0) : r < 2.5 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
  wTM = mat2(a, vec2(a.y, a.x));
#endif
  wUv = cell + 0.5 + wTM * f;
  wDx = wTM * dFdx(uv); wDy = wTM * dFdy(uv);
}
vec4 wTex(sampler2D t, vec2 uv) { return textureGrad(t, uv, wDx, wDy); }
#endif
`;
const WS_MAP = `
float wTexR = 1.0;
#ifdef WS_TILED
  wTileSetup(vUv);
#endif
#ifdef USE_MAP
#ifdef WS_TILED
  vec4 texelColor = wTex( map, wUv );
#else
  vec4 texelColor = texture2D( map, vUv );
#endif
  wTexR = texelColor.a;
  texelColor = mapTexelToLinear( texelColor );
  diffuseColor.rgb *= texelColor.rgb;
#endif
vec3 wN = vWNrm / max(length(vWNrm), 1e-6);
vec4 wF = texture2D(wField, (vWPos.xz - wFieldXf.xy) * wFieldXf.zw);
float wCeil = wF.a * 16.0;
float wUp = wN.y;
float wWall = 1.0 - abs(wUp);
vec2 wGuv = abs(wUp) > 0.6 ? vWPos.xz * 0.2083 : vec2(vWPos.x + vWPos.z, vWPos.y) * 0.2083;
vec4 wG = texture2D(wGrunge, wGuv);
// a second, larger and turned reading of the same grime breaks its repeat into one that never lines up
vec4 wG2 = texture2D(wGrunge, mat2(0.866, 0.5, -0.5, 0.866) * wGuv * 0.43 + vec2(0.37, 0.61));
float wMacro = smoothstep(0.3, 0.7, wG2.b);
float wNear = clamp(wF.r * 2.0, 0.0, 1.0);
float wCorner = clamp(wF.r * 2.0 - 1.0, 0.0, 1.0);
float wY = vWPos.y;
float wFloorJ = exp(-max(wY + 0.02, 0.0) * 5.0);
float wCeilJ = exp(-max(wCeil - wY, 0.0) * 4.0);
float wOcc = mix(wNear * wNear * (wUp > 0.0 ? 0.62 : 0.5), min(0.85, wCorner * 0.6 + wFloorJ * 0.55 + wCeilJ * 0.42), wWall);
float wDirt = wF.b * wAmt.y;
float wBand = smoothstep(0.85, 0.0, wY) * (0.35 + 0.65 * wG.r) * wWall;
float wStreak = wG.g * smoothstep(wCeil - (0.4 + 2.8 * wG.a), wCeil - 0.05, wY) * wWall * smoothstep(0.3, 0.6, wG2.r);
float wBlot = smoothstep(0.45, 0.85, wG.r) * smoothstep(0.32, 0.62, wG2.r);
diffuseColor.rgb *= (1.0 - wAmt.x * wOcc) * (1.0 - wDirt * (wBand * 0.5 + wStreak * 0.45 + wBlot * 0.3));
diffuseColor.rgb *= 1.0 + (wMacro - 0.5) * 0.13 * wAmt.y;
#if defined(WS_TILED) && defined(WS_SLAB)
  diffuseColor.rgb *= 0.92 + 0.15 * wSlab;
#endif
float wWet = wF.g * wAmt.z * smoothstep(0.6, 0.9, wUp);
float wPT = 0.8 - wWet * 0.38;
float wPud = smoothstep(wPT, wPT + 0.035, wG.b + (wG2.r - 0.5) * 0.22) * step(0.04, wWet);
diffuseColor.rgb *= 1.0 - 0.42 * max(wPud, wWet * 0.45);
`;
const WS_ROUGH = `
roughnessFactor *= wTexR;
#if defined(WS_TILED) && defined(WS_SLAB)
  roughnessFactor *= 0.88 + 0.24 * fract(wSlab * 13.7);
#endif
roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.5, wWet);
roughnessFactor = mix(roughnessFactor, 0.045, wPud);
roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.62, wStreak * wDirt);
`;
const WS_METAL = `
#ifdef USE_NORMALMAP
#ifdef WS_TILED
  metalnessFactor *= wTex( normalMap, wUv ).a;
#else
  metalnessFactor *= texture2D( normalMap, vUv ).a;
#endif
#endif
`;
// the normal map is read through the same turn, and its slopes are turned back into the surface's own frame
const WS_NORMAL_MAPS = THREE.ShaderChunk.normal_fragment_maps.replace('vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;',
  '#ifdef WS_TILED\n\tvec3 mapN = wTex( normalMap, wUv ).xyz * 2.0 - 1.0;\n\tmapN.xy = mapN.xy * wTM;\n#else\n\tvec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;\n#endif');
const WS_NORMAL = `
normal = normalize(mix(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), wPud * 0.92));
`;

// lamps only light what they can see: each point and spot light is scaled by its visibility tile
const WS_LIGHTS = THREE.ShaderChunk.lights_fragment_begin
  .replace('getPointDirectLightIrradiance( pointLight, geometry, directLight );', 'getPointDirectLightIrradiance( pointLight, geometry, directLight );\n\t\tdirectLight.color *= wLightVis( wOccPt[ i ] );')
  .replace('getSpotDirectLightIrradiance( spotLight, geometry, directLight );', 'getSpotDirectLightIrradiance( spotLight, geometry, directLight );\n\t\tdirectLight.color *= wLightVis( wOccSp[ i ] );');
function wsPatch(sh, m, extra) {
  sh.uniforms.wField = WS.field; sh.uniforms.wFieldXf = WS.fieldXf; sh.uniforms.wGrunge = WS.grunge;
  sh.uniforms.wOccTex = WS.occTex; sh.uniforms.wOccPt = WS.occPt; sh.uniforms.wOccSp = WS.occSp;
  sh.uniforms.wAmt = { value: m.userData.wAmt };
  sh.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWNrm;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vWNrm = mat3(modelMatrix) * objectNormal;`);
  const tile = m.userData.wTile ? '#define WS_TILE ' + m.userData.wTile + '\n' + (m.userData.wSlab ? '#define WS_SLAB\n' : '') : '';
  sh.fragmentShader = tile + WS_FRAG_HEAD + sh.fragmentShader
    .replace('#include <map_fragment>', WS_MAP)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + WS_ROUGH)
    .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + WS_METAL)
    .replace('#include <normal_fragment_maps>', WS_NORMAL_MAPS + '\n' + WS_NORMAL)
    .replace('#include <lights_fragment_begin>', WS_LIGHTS);
  if (extra) extra(sh);
}
// opts: false to skip, or { ao, grime, wet } amounts (default 1)
function worldShader(m, o) {
  if (o === false) return m;
  o = o || {};
  m.userData.wAmt = new THREE.Vector3(o.ao !== undefined ? o.ao : 1, o.grime !== undefined ? o.grime : 1, o.wet !== undefined ? o.wet : 1);
  m.onBeforeCompile = (sh) => wsPatch(sh, m, null);
  m.customProgramCacheKey = () => 'ws5' + (m.userData.wTile || 0) + (m.userData.wSlab ? 's' : '');
  return m;
}

// The level map the shader reads: r = how boxed-in a spot is, g = damp, b = dirt, a = ceiling height / 16
const THEME_SOIL = {
  dock: [0.12, 0.85], office: [0.0, 0.5], lab: [0.04, 0.45], cold: [0.22, 0.55], server: [0.0, 0.4],
  tunnel: [0.5, 1.0], pump: [0.65, 0.95], contain: [0.14, 0.85], generator: [0.1, 0.8], lift: [0.16, 0.9],
};
function buildLevelField(L) {
  const S = 4, W = L.W * S, H = L.H * S, N = W * H;
  const occ = new Float32Array(N), wet = new Float32Array(N), dirt = new Float32Array(N), ceil = new Float32Array(N);
  const shortProps = new Set(['t', 'x', 'o', 'b', 'g', 'q', 'Q', 'h', 'Y']);
  for (let gz = 0; gz < L.H; gz++) for (let gx = 0; gx < L.W; gx++) {
    const i = gz * L.W + gx, c = L.ch[i], ai = L.area[i];
    const kind = cellKind(L, gx, gz);
    let o = kind === 'solid' ? 1 : kind === 'glass' || kind === 'bars' ? 0.55 : TALL_PROPS.has(c) ? 0.72 : shortProps.has(c) ? 0.3 : 0;
    if (c === 'T') o = 0.5;
    const th = ai >= 0 ? L.areas[ai].theme : 'dock';
    const soil = THEME_SOIL[th] || [0.1, 0.7];
    for (let sz = 0; sz < S; sz++) for (let sx = 0; sx < S; sx++) {
      const k = (gz * S + sz) * W + gx * S + sx;
      occ[k] = o; wet[k] = L.water[i] ? 1 : soil[0]; dirt[k] = soil[1]; ceil[k] = L.ceil[i];
    }
  }
  const blur = (a, r, passes) => {
    const tmp = new Float32Array(N);
    for (let p = 0; p < passes; p++) {
      for (let z = 0; z < H; z++) { let s = 0; const row = z * W;
        for (let x = -r; x <= r; x++) s += a[row + clamp(x, 0, W - 1)];
        for (let x = 0; x < W; x++) { tmp[row + x] = s / (2 * r + 1); s += a[row + Math.min(W - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
      for (let x = 0; x < W; x++) { let s = 0;
        for (let z = -r; z <= r; z++) s += tmp[clamp(z, 0, H - 1) * W + x];
        for (let z = 0; z < H; z++) { a[z * W + x] = s / (2 * r + 1); s += tmp[Math.min(H - 1, z + r + 1) * W + x] - tmp[Math.max(0, z - r) * W + x]; } }
    }
  };
  blur(occ, 2, 2);
  blur(wet, 3, 2);
  const data = new Uint8Array(N * 4);
  for (let k = 0; k < N; k++) {
    data[k * 4] = clamp(occ[k], 0, 1) * 255; data[k * 4 + 1] = clamp(wet[k], 0, 1) * 255;
    data[k * 4 + 2] = clamp(dirt[k], 0, 1) * 255; data[k * 4 + 3] = clamp(ceil[k] / 16, 0, 1) * 255;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  WS.field.value = tex;
  WS.fieldXf.value.set(0, 0, 1 / L.W, 1 / L.H);
  WS.grunge.value = getTexSet('grunge').map;
}
