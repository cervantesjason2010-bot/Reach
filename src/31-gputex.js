// ================= GPU texture baking: tileable PBR sets painted by shaders =================
// Each recipe paints one tile: albedo (sRGB) with roughness in alpha, and a normal map with metalness in alpha.
const GTEX_LIB = `
#define TAU 6.28318530718
varying vec2 vUv;
uniform vec2 uRes;
float sat(float x) { return clamp(x, 0.0, 1.0); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
// periodic gradient noise in [0,1]; per = lattice period (whole numbers)
float gnoise(vec2 p, vec2 per, float s) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 so = vec2(s * 13.17, s * 7.71);
  float a = hash12(mod(i, per) + so) * TAU, b = hash12(mod(i + vec2(1.0, 0.0), per) + so) * TAU;
  float c = hash12(mod(i + vec2(0.0, 1.0), per) + so) * TAU, d = hash12(mod(i + vec2(1.0, 1.0), per) + so) * TAU;
  float va = dot(vec2(cos(a), sin(a)), f), vb = dot(vec2(cos(b), sin(b)), f - vec2(1.0, 0.0));
  float vc = dot(vec2(cos(c), sin(c)), f - vec2(0.0, 1.0)), vd = dot(vec2(cos(d), sin(d)), f - vec2(1.0, 1.0));
  return 0.5 + 0.72 * mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y);
}
float fbmA(vec2 uv, vec2 f, float s, int oct) {
  float n = 0.0, a = 0.5, t = 0.0;
  for (int i = 0; i < 7; i++) { if (i >= oct) break; n += a * gnoise(uv * f, f, s + float(i) * 11.0); t += a; a *= 0.5; f *= 2.0; }
  return n / t;
}
float fbm(vec2 uv, float f, float s, int oct) { return fbmA(uv, vec2(f), s, oct); }
// periodic cellular noise: x = distance to the nearest point, y = distance gap to the second (edges), z = cell id
vec3 vor(vec2 uv, vec2 f, float s) {
  vec2 p = uv * f; vec2 i = floor(p), fr = fract(p);
  float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 c = mod(i + g, f);
    vec2 r = g + hash22(c + vec2(s * 7.31, s * 3.17)) - fr;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(c + vec2(s * 1.7, s * 9.2) + 0.37); } else if (d < d2) { d2 = d; }
  }
  return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
}
float ridgef(float n) { return max(0.0, 1.0 - abs(2.0 * n - 1.0)); }
// distance (in tile units of size w) to the nearest grid line at multiples of w
float gridDist(float x, float w) { return abs(fract(x / w + 0.5) - 0.5) * w; }
float px() { return hash12(floor(vUv * uRes) + 0.5); }
vec2 warp(vec2 uv, float f, float amt, float s) { return uv + amt * (vec2(fbm(uv, f, s, 3), fbm(uv, f, s + 5.0, 3)) - 0.5); }
`;

const GTEX_RECIPES = {
  // cast concrete wall: form seams, tie holes, pores, cracks, damp
  concrete: { size: 1024, nrm: 2.2, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 2.4;
  float big = fbm(uv, 2.0, 1.0, 5), mid = fbm(uv, 9.0, 2.0, 4), fine = fbm(uv, 64.0, 3.0, 3), p = px();
  vec3 pv = vor(uv, vec2(150.0), 4.0);
  float pore = (1.0 - smoothstep(0.08, 0.22, pv.x)) * step(0.84, pv.z);
  vec3 pv2 = vor(uv, vec2(40.0), 5.0);
  float bug = (1.0 - smoothstep(0.08, 0.2, pv2.x)) * step(0.92, pv2.z);
  float sy = min(gridDist(m.y, 1.2), gridDist(m.x, 2.4));
  float seam = 1.0 - smoothstep(0.003, 0.008, sy);
  float lip = (1.0 - smoothstep(0.008, 0.03, sy)) * 0.5;
  float td = length(vec2(gridDist(m.x + 0.3, 0.6), gridDist(m.y + 0.3, 0.6)));
  float tie = 1.0 - smoothstep(0.011, 0.016, td);
  float ring = (1.0 - smoothstep(0.016, 0.03, td)) - tie;
  vec3 cr = vor(warp(uv, 4.0, 0.07, 6.0), vec2(5.0), 8.0);
  float crackMask = smoothstep(0.56, 0.7, fbm(uv, 3.0, 9.0, 3));
  float crack = (1.0 - smoothstep(0.0, 0.012, cr.y)) * crackMask;
  float efflo = smoothstep(0.62, 0.86, fbm(uv, 6.0, 10.0, 4)) * (0.4 + crackMask);
  float dmp = smoothstep(0.55, 0.82, fbm(uv, 3.0, 11.0, 4));
  float tone = 0.53 + 0.13 * (big - 0.5) + 0.06 * (mid - 0.5) + 0.05 * (fine - 0.5) + 0.03 * (p - 0.5);
  vec3 c = vec3(tone) * mix(vec3(1.0, 0.985, 0.955), vec3(0.95, 0.975, 1.0), sat(mid * 1.4 - 0.2));
  c *= 1.0 - 0.2 * dmp;
  c = mix(c, vec3(0.8, 0.79, 0.76), efflo * 0.3);
  c *= 1.0 - 0.55 * pore - 0.45 * bug;
  c *= 1.0 - 0.35 * seam;
  c *= 1.0 - 0.55 * tie; c += vec3(0.025) * ring;
  c *= 1.0 - 0.6 * crack;
  col = c;
  ro = 0.9 + 0.06 * (fine - 0.5) - 0.22 * dmp;
  h = 0.55 + 0.18 * (big - 0.5) + 0.12 * (mid - 0.5) + 0.08 * (fine - 0.5) - 0.25 * pore - 0.3 * bug - 0.2 * seam + 0.04 * lip - 0.35 * tie + 0.05 * ring - 0.4 * crack;
  me = 0.0;
}` },
  // painted concrete block (basement walls)
  block: { size: 1024, nrm: 2.0, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 2.4;
  float row = floor(m.y / 0.2);
  float off = mod(row, 2.0) * 0.2;
  float bx = (m.x + off) / 0.4;
  vec2 cell = vec2(floor(bx), row);
  vec2 f = vec2(fract(bx) * 0.4, fract(m.y / 0.2) * 0.2);
  float e = min(min(f.x, 0.4 - f.x), min(f.y, 0.2 - f.y));
  float mortar = 1.0 - smoothstep(0.004, 0.0075, e);
  float concave = smoothstep(0.0, 0.0075, e);
  float bev = smoothstep(0.0045, 0.014, e);
  float id = hash12(mod(cell, vec2(6.0, 12.0)) + 41.0);
  vec3 pv = vor(uv, vec2(170.0), 42.0);
  float pit = (1.0 - smoothstep(0.1, 0.26, pv.x)) * step(0.66, pv.z);
  float fine = fbm(uv, 90.0, 43.0, 3), big = fbm(uv, 3.0, 44.0, 4);
  float chipN = fbm(warp(uv, 12.0, 0.02, 46.0), 10.0, 45.0, 4);
  float chip = smoothstep(0.71, 0.73, chipN) * (1.0 - mortar);
  float chipEdge = smoothstep(0.68, 0.71, chipN) - smoothstep(0.71, 0.73, chipN);
  vec3 paint = vec3(0.72, 0.71, 0.67);
  vec3 c = paint * (0.96 + 0.05 * (id - 0.5) + 0.05 * (big - 0.5) + 0.03 * (fine - 0.5));
  c *= 1.0 - 0.2 * pit;
  c *= 1.0 - 0.1 * chipEdge;
  c = mix(c, vec3(0.44, 0.44, 0.42) * (0.85 + 0.3 * fine), chip);
  c *= 1.0 - 0.22 * mortar;
  col = c;
  ro = mix(0.68 + 0.08 * fine, 0.95, chip) + 0.12 * mortar;
  h = 0.62 + 0.04 * (fine - 0.5) - 0.07 * pit - 0.4 * (1.0 - concave) + 0.05 * bev - 0.1 * chip;
  me = 0.0;
}` },
  // sealed industrial floor slab: saw joints, aggregate, trowel swirl, tyre marks, oil
  floor: { size: 1024, nrm: 1.8, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float big = fbm(uv, 2.0, 21.0, 5), mid = fbm(uv, 8.0, 22.0, 4), fine = fbm(uv, 80.0, 23.0, 3), p = px();
  vec3 ag = vor(uv, vec2(120.0), 24.0);
  float fleck = (1.0 - smoothstep(0.12, 0.3, ag.x)) * step(0.7, ag.z);
  float fleckTone = ag.z > 0.86 ? 0.08 : -0.06;
  vec2 jd = vec2(gridDist(uv.x, 1.0), gridDist(uv.y, 1.0)) * 2.4;
  float jm = min(jd.x, jd.y);
  float joint = 1.0 - smoothstep(0.003, 0.007, jm);
  float jointEdge = 1.0 - smoothstep(0.007, 0.025, jm);
  float sw = fbm(warp(uv, 3.0, 0.3, 25.0), 6.0, 27.0, 3);
  float swirl = smoothstep(0.42, 0.58, sw);
  // rubber laid down by wheels: wide, soft, faint lanes
  float lane = fbmA(warp(uv, 2.0, 0.06, 28.0), vec2(1.0, 6.0), 29.0, 3);
  float tire = smoothstep(0.55, 0.75, lane) * smoothstep(0.45, 0.72, fbm(uv, 2.0, 30.0, 3));
  // oil: a few big soft stains with a darker heart and a faint tide line, only in some slabs
  float oilN = fbm(warp(uv, 4.0, 0.05, 34.0), 3.0, 31.0, 4);
  float oilM = smoothstep(0.5, 0.66, fbm(uv, 2.0, 37.0, 2));
  float oil = smoothstep(0.6, 0.76, oilN) * oilM;
  float halo = (smoothstep(0.53, 0.6, oilN) - smoothstep(0.6, 0.68, oilN)) * oilM;
  vec3 dv = vor(uv, vec2(20.0), 38.0);
  float drip = (1.0 - smoothstep(0.04, 0.14, dv.x)) * step(0.93, dv.z) * (0.25 + 0.75 * oilM);
  float wear = smoothstep(0.5, 0.78, fbm(uv, 3.0, 32.0, 4));
  vec3 cr = vor(warp(uv, 5.0, 0.06, 33.0), vec2(4.0), 35.0);
  float crack = (1.0 - smoothstep(0.0, 0.009, cr.y)) * smoothstep(0.62, 0.74, fbm(uv, 2.0, 36.0, 3));
  float tone = 0.44 + 0.08 * (big - 0.5) + 0.05 * (mid - 0.5) + 0.05 * (fine - 0.5) + 0.02 * (p - 0.5) + fleck * fleckTone;
  vec3 c = vec3(tone) * vec3(1.0, 0.99, 0.965);
  c *= 0.95 + 0.05 * swirl;
  c *= 1.0 + 0.1 * wear;
  c *= 1.0 - 0.15 * tire;
  c *= 1.0 - 0.42 * oil - 0.1 * halo - 0.3 * drip;
  c *= 1.0 - 0.6 * joint - 0.08 * jointEdge;
  c *= 1.0 - 0.6 * crack;
  col = c;
  ro = 0.6 + 0.12 * (fine - 0.5) - 0.2 * wear + 0.14 * (1.0 - swirl) - 0.4 * oil - 0.2 * drip + 0.08 * tire + 0.2 * joint;
  h = 0.5 + 0.12 * (big - 0.5) + 0.08 * (mid - 0.5) + 0.07 * (fine - 0.5) + 0.03 * fleck - 0.4 * joint - 0.05 * jointEdge - 0.35 * crack;
  me = 0.0;
}` },
  // painted drywall: orange peel, taped seams, screw pops, scuffs
  paint: { size: 1024, nrm: 1.2, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 2.4;
  float big = fbm(uv, 2.0, 51.0, 4), fine = fbm(uv, 120.0, 52.0, 2);
  float orange = gnoise(uv * 320.0, vec2(320.0), 54.0);
  float seam = 1.0 - smoothstep(0.0, 0.06, gridDist(m.x, 1.2));
  float sc = length(vec2(gridDist(m.x, 0.6), gridDist(m.y + 0.2, 0.4)));
  float screw = (1.0 - smoothstep(0.004, 0.008, sc)) * step(0.6, hash12(mod(floor(vec2((m.x + 0.3) / 0.6, (m.y + 0.4) / 0.4)), vec2(4.0, 6.0)) + 55.0));
  float scuff = smoothstep(0.74, 0.8, fbmA(uv, vec2(24.0, 6.0), 56.0, 4)) * smoothstep(0.5, 0.75, fbm(uv, 3.0, 58.0, 3));
  float stain = smoothstep(0.6, 0.86, fbm(uv, 4.0, 57.0, 5));
  vec3 c = vec3(0.75, 0.73, 0.67) * (0.97 + 0.05 * (big - 0.5) + 0.015 * (orange - 0.5));
  c *= 1.0 - 0.14 * stain;
  c = mix(c, c * vec3(0.72, 0.7, 0.66), scuff * 0.7);
  c *= 1.0 - 0.16 * screw;
  col = c;
  ro = 0.8 + 0.06 * (fine - 0.5) - 0.14 * seam - 0.12 * scuff;
  h = 0.5 + 0.06 * (orange - 0.5) + 0.05 * (big - 0.5) + 0.05 * seam - 0.1 * screw;
  me = 0.0;
}` },
  // painted steel: chipped paint, bare metal, rust in the chips, scratches
  metal: { size: 1024, nrm: 1.6, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float big = fbm(uv, 2.0, 61.0, 4), mid = fbm(uv, 8.0, 62.0, 4), fine = fbm(uv, 64.0, 63.0, 3);
  float brush = fbmA(uv, vec2(2.0, 128.0), 64.0, 2);
  float chipN = fbm(warp(uv, 16.0, 0.03, 65.0), 6.0, 67.0, 5);
  float chip = smoothstep(0.685, 0.7, chipN);
  float chipEdge = smoothstep(0.64, 0.685, chipN) - chip;
  float rustIn = chip * smoothstep(0.4, 0.7, fbm(uv, 20.0, 68.0, 3));
  float s1 = smoothstep(0.86, 0.9, fbmA(uv + vec2(0.0, 0.02 * mid), vec2(3.0, 90.0), 69.0, 2));
  float s2 = smoothstep(0.87, 0.91, fbmA(uv + vec2(0.02 * mid, 0.0), vec2(70.0, 2.0), 70.0, 2));
  float scratch = max(s1, s2) * (1.0 - chip);
  float grime = smoothstep(0.45, 0.85, fbm(uv, 4.0, 71.0, 5));
  vec3 paintC = vec3(0.62, 0.63, 0.62) * (0.96 + 0.06 * (big - 0.5) + 0.03 * (fine - 0.5));
  vec3 bare = vec3(0.4, 0.4, 0.41) * (0.9 + 0.2 * brush);
  vec3 rustC = vec3(0.38, 0.21, 0.11) * (0.8 + 0.4 * fine);
  vec3 c = mix(paintC, paintC * 0.78, chipEdge);
  c = mix(c, mix(bare, rustC, rustIn), chip);
  c = mix(c, c * 1.12 + 0.04, scratch);
  c *= 1.0 - 0.22 * grime;
  col = c;
  ro = mix(0.48 + 0.1 * (fine - 0.5) + 0.18 * grime, mix(0.36 + 0.1 * brush, 0.88, rustIn), chip);
  h = 0.6 + 0.03 * (fine - 0.5) - 0.12 * chip + 0.03 * chipEdge - 0.05 * scratch + 0.06 * rustIn * fine;
  me = chip * (1.0 - rustIn) * 0.95 + scratch * 0.6;
}` },
  // riveted steel wall plates
  plate: { size: 1024, nrm: 2.0, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 2.4;
  vec2 q = vec2(gridDist(m.x, 1.2), gridDist(m.y, 0.8));
  float e = min(q.x, q.y);
  float seam = 1.0 - smoothstep(0.002, 0.005, e);
  float lap = 1.0 - smoothstep(0.005, 0.03, q.y);
  vec2 rv = vec2(gridDist(m.x, 0.15), gridDist(m.y, 0.8) - 0.03);
  float rd = length(vec2(rv.x, rv.y));
  float rivet = 1.0 - smoothstep(0.006, 0.01, rd);
  float big = fbm(uv, 2.0, 72.0, 4), fine = fbm(uv, 64.0, 73.0, 3);
  float chipN = fbm(warp(uv, 16.0, 0.03, 74.0), 6.0, 75.0, 5);
  float chip = smoothstep(0.7, 0.715, chipN) + 0.6 * lap * smoothstep(0.55, 0.7, fbm(uv, 20.0, 76.0, 3));
  chip = sat(chip);
  float rust = sat(chip * smoothstep(0.35, 0.65, fbm(uv, 14.0, 77.0, 3)) + lap * 0.3 * smoothstep(0.5, 0.8, fbmA(uv, vec2(40.0, 4.0), 78.0, 3)));
  float grime = smoothstep(0.45, 0.85, fbm(uv, 4.0, 79.0, 5));
  vec3 paintC = vec3(0.6, 0.61, 0.6) * (0.95 + 0.08 * (big - 0.5) + 0.03 * (fine - 0.5));
  vec3 c = mix(paintC, vec3(0.38, 0.38, 0.39), chip);
  c = mix(c, vec3(0.4, 0.22, 0.11) * (0.8 + 0.4 * fine), rust * 0.8);
  c *= 1.0 - 0.45 * seam;
  c *= 1.0 - 0.2 * grime;
  c *= 1.0 + 0.12 * rivet;
  col = c;
  ro = mix(0.5 + 0.18 * grime, 0.82, rust) - 0.1 * rivet;
  h = 0.55 + 0.03 * (fine - 0.5) - 0.35 * seam + 0.35 * rivet - 0.06 * chip + 0.04 * rust * fine;
  me = chip * (1.0 - rust) * 0.9;
}` },
  // brushed and galvanised steel
  steel: { size: 512, nrm: 1.0, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float brush = fbmA(uv, vec2(1.0, 160.0), 141.0, 3);
  float big = fbm(uv, 3.0, 142.0, 4), mid = fbm(uv, 10.0, 143.0, 3);
  float spangle = vor(uv, vec2(18.0), 144.0).z;
  float s1 = smoothstep(0.88, 0.92, fbmA(uv + vec2(0.0, 0.03 * mid), vec2(4.0, 70.0), 145.0, 2));
  float s2 = smoothstep(0.89, 0.93, fbmA(uv + vec2(0.03 * mid, 0.0), vec2(60.0, 3.0), 146.0, 2));
  float smudge = smoothstep(0.55, 0.8, fbm(uv, 5.0, 147.0, 4));
  float dirt = smoothstep(0.5, 0.85, fbm(uv, 3.0, 148.0, 5));
  vec3 c = vec3(0.56, 0.57, 0.585) * (0.92 + 0.1 * brush + 0.05 * (spangle - 0.5) + 0.05 * (big - 0.5));
  c *= 1.0 - 0.25 * dirt;
  c += vec3(0.05) * max(s1, s2);
  col = c;
  ro = 0.32 + 0.12 * brush + 0.25 * smudge + 0.3 * dirt - 0.1 * max(s1, s2);
  h = 0.5 + 0.04 * brush - 0.05 * max(s1, s2);
  me = 1.0 - 0.6 * dirt;
}` },
  rust: { size: 512, nrm: 2.4, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float n = fbm(uv, 4.0, 81.0, 5), patchN = fbm(warp(uv, 6.0, 0.05, 82.0), 3.0, 83.0, 5), fine = fbm(uv, 64.0, 84.0, 3);
  vec3 pv = vor(uv, vec2(60.0), 85.0);
  float pit = (1.0 - smoothstep(0.1, 0.35, pv.x)) * step(0.6, pv.z);
  float r = smoothstep(0.38, 0.62, patchN);
  float flake = smoothstep(0.6, 0.62, fbm(uv, 12.0, 86.0, 4)) * (1.0 - r);
  vec3 paintC = vec3(0.3, 0.36, 0.33) * (0.9 + 0.2 * n);
  vec3 rustA = vec3(0.45, 0.24, 0.11), rustB = vec3(0.26, 0.14, 0.08);
  vec3 rc = mix(rustB, rustA, smoothstep(0.3, 0.7, fine + 0.3 * (n - 0.5)));
  vec3 c = mix(paintC, rc, max(r, 0.25));
  c = mix(c, paintC * 1.1, flake * 0.8);
  c *= 1.0 - 0.4 * pit;
  col = c;
  ro = mix(0.55, 0.92, r) - 0.05 * fine;
  h = 0.5 + 0.2 * r * fine + 0.1 * n - 0.25 * pit + 0.06 * flake;
  me = 0.15 * (1.0 - r);
}` },
  // ceramic wall tiles, 15 cm, with grout, crazing and a few missing
  tile: { size: 1024, nrm: 2.0, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 2.4; float ts = 0.15;
  vec2 tc = floor(m / ts); vec2 tf = fract(m / ts) * ts;
  float e = min(min(tf.x, ts - tf.x), min(tf.y, ts - tf.y));
  float grout = 1.0 - smoothstep(0.0021, 0.0035, e);
  float bevel = smoothstep(0.0024, 0.008, e);
  float id = hash12(mod(tc, vec2(16.0)) + 81.0), id2 = hash12(mod(tc, vec2(16.0)) + 82.0);
  float missing = step(0.8, id2) * step(0.74, fbm(uv, 2.0, 86.0, 3));
  float glaze = fbm(uv, 32.0, 83.0, 3);
  vec3 cz = vor(uv, vec2(64.0), 84.0);
  float craze = (1.0 - smoothstep(0.0, 0.012, cz.y)) * step(0.94, id);
  float grime = smoothstep(0.4, 0.9, fbm(uv, 6.0, 85.0, 4));
  vec3 tileC = vec3(0.86, 0.87, 0.84) * (0.97 + 0.04 * (id - 0.5) + 0.02 * (glaze - 0.5));
  vec3 groutC = vec3(0.38, 0.37, 0.34) * (1.0 - 0.5 * grime);
  vec3 c = mix(tileC * (1.0 - 0.1 * grime), groutC, grout);
  c *= 1.0 - 0.18 * craze;
  float comb = 0.5 + 0.5 * sin(uv.x * TAU * 600.0);
  c = mix(c, vec3(0.46, 0.46, 0.44) * (0.85 + 0.15 * comb), missing * (1.0 - grout));
  col = c;
  ro = mix(mix(0.12 + 0.05 * glaze + 0.15 * grime, 0.9, grout), 0.95, missing);
  h = mix(0.56 + 0.05 * bevel + 0.02 * (glaze - 0.5) - 0.02 * craze, 0.42, grout);
  h = mix(h, 0.3 + 0.03 * comb, missing * (1.0 - grout));
  me = 0.0;
}` },
  // vinyl composition floor tile, 30 cm
  tilefloor: { size: 1024, nrm: 1.4, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 2.4; float ts = 0.3;
  vec2 cell = floor(m / ts); vec2 f = fract(m / ts) * ts;
  float e = min(min(f.x, ts - f.x), min(f.y, ts - f.y));
  float joint = 1.0 - smoothstep(0.0008, 0.002, e);
  float id = hash12(mod(cell, vec2(8.0)) + 91.0);
  float checker = mod(cell.x + cell.y, 2.0);
  vec3 ch = vor(uv, vec2(240.0), 92.0);
  float chip = 1.0 - smoothstep(0.18, 0.34, ch.x);
  float chipTone = (ch.z - 0.5) * 0.12;
  float scuff = smoothstep(0.8, 0.86, fbmA(warp(uv, 4.0, 0.05, 93.0), vec2(30.0, 6.0), 94.0, 3)) * smoothstep(0.4, 0.7, fbm(uv, 3.0, 95.0, 3));
  float wax = (1.0 - smoothstep(0.0, 0.025, e)) * 0.5;
  float grime = smoothstep(0.45, 0.9, fbm(uv, 5.0, 96.0, 4));
  vec3 base = mix(vec3(0.72, 0.71, 0.67), vec3(0.58, 0.6, 0.58), checker);
  base *= 0.97 + 0.05 * (id - 0.5);
  vec3 c = base + chipTone * chip;
  c *= 1.0 - 0.25 * grime - 0.2 * wax;
  c = mix(c, vec3(0.08), scuff * 0.7);
  c *= 1.0 - 0.5 * joint;
  col = c;
  ro = 0.3 + 0.14 * grime + 0.1 * (id - 0.5) + 0.25 * scuff + 0.3 * joint;
  h = 0.55 + 0.01 * chip - 0.3 * joint - 0.02 * scuff;
  me = 0.0;
}` },
  // office carpet tiles, quarter-turned
  carpet: { size: 512, nrm: 2.2, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 2.4; float ts = 0.6; vec2 cell = floor(m / ts); vec2 f = fract(m / ts);
  float rot = mod(cell.x + cell.y, 2.0);
  vec2 q = rot > 0.5 ? f.yx : f;
  float fib = fbmA(q, vec2(6.0, 110.0), 101.0 + rot, 2);
  float lp = gnoise(uv * 300.0, vec2(300.0), 102.0);
  float seam = 1.0 - smoothstep(0.0, 0.008, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  float stain = smoothstep(0.62, 0.72, fbm(uv, 3.0, 103.0, 5));
  float wear = smoothstep(0.5, 0.8, fbm(uv, 2.0, 104.0, 4));
  vec3 c = vec3(0.27, 0.29, 0.33) * (0.86 + 0.2 * fib + 0.14 * (lp - 0.5));
  c *= 0.95 + 0.07 * rot;
  c *= 1.0 - 0.32 * stain;
  c = mix(c, c * 1.25, wear * 0.4);
  c *= 1.0 - 0.35 * seam;
  col = c;
  ro = 0.98;
  h = 0.5 + 0.25 * (fib - 0.5) + 0.2 * (lp - 0.5) - 0.2 * seam;
  me = 0.0;
}` },
  // acoustic ceiling tiles with the T-bar grid
  panel: { size: 512, nrm: 1.6, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 1.2; float ts = 0.6; vec2 cell = floor(m / ts); vec2 f = fract(m / ts) * ts;
  float e = min(min(f.x, ts - f.x), min(f.y, ts - f.y));
  float tbar = 1.0 - smoothstep(0.011, 0.013, e);
  float tEdge = (1.0 - smoothstep(0.013, 0.022, e)) - tbar;
  float id = hash12(mod(cell, vec2(2.0)) + 111.0);
  float fis = ridgef(fbm(uv, 24.0, 112.0 + floor(id * 4.0), 3));
  float fissure = smoothstep(0.86, 0.95, fis);
  float pin = step(0.94, hash12(floor(uv * uRes * 0.5) + 113.0));
  float sn = fbm(uv, 3.0, 114.0 + floor(id * 3.0), 5);
  float stain = smoothstep(0.62, 0.66, sn);
  float ringS = smoothstep(0.6, 0.62, sn) - smoothstep(0.63, 0.66, sn);
  vec3 c = vec3(0.78, 0.77, 0.73) * (0.98 + 0.03 * (id - 0.5));
  c *= 1.0 - 0.25 * fissure - 0.15 * pin;
  c = mix(c, vec3(0.56, 0.46, 0.31), stain * 0.45);
  c = mix(c, vec3(0.42, 0.32, 0.2), ringS * 0.6);
  c = mix(c, vec3(0.8, 0.8, 0.78), tbar);
  c *= 1.0 - 0.35 * tEdge;
  col = c;
  ro = mix(0.96, 0.5, tbar);
  h = mix(0.45 - 0.15 * fissure - 0.1 * pin, 0.75, tbar) - 0.1 * tEdge;
  me = tbar * 0.3;
}` },
  wood: { size: 512, nrm: 1.8, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float n = 6.0; float py = uv.y * n; float plank = floor(py); float pf = fract(py);
  float gap = 1.0 - smoothstep(0.0, 0.035, min(pf, 1.0 - pf));
  float id = hash12(vec2(mod(plank, n), 121.0));
  float wob = fbmA(uv + vec2(id * 3.0, 0.0), vec2(3.0, 6.0), 123.0, 3);
  float rings = sin((pf * 5.0 + wob * 4.0 + id * 5.0) * TAU) * 0.5 + 0.5;
  float fine = fbmA(uv, vec2(3.0, 96.0), 124.0, 3);
  vec3 kv = vor(uv, vec2(3.0, 6.0), 125.0);
  float knot = (1.0 - smoothstep(0.04, 0.12, kv.x)) * step(0.78, kv.z);
  float nd = length(vec2(gridDist(uv.x + 0.04, 0.5) * 4.0, (pf - 0.5) / n));
  float nail = (1.0 - smoothstep(0.006, 0.012, nd));
  float weather = smoothstep(0.4, 0.8, fbm(uv, 3.0, 126.0, 4));
  vec3 base = mix(vec3(0.58, 0.44, 0.29), vec3(0.47, 0.35, 0.22), id);
  vec3 c = base * (0.8 + 0.2 * rings + 0.12 * (fine - 0.5));
  c = mix(c, vec3(0.24, 0.15, 0.08), knot * 0.7);
  c = mix(c, vec3(dot(c, vec3(0.33))) * 1.05, weather * 0.35);
  c *= 1.0 - 0.7 * gap - 0.6 * nail;
  col = c;
  ro = 0.72 + 0.1 * (fine - 0.5) + 0.2 * gap;
  h = 0.55 + 0.07 * rings + 0.06 * fine - 0.45 * gap - 0.1 * knot - 0.3 * nail;
  me = 0.6 * nail;
}` },
  // bar grating: 30 mm bearing bars, cross rods every 100 mm
  grate: { size: 1024, nrm: 2.8, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 m = uv * 2.4;
  float bear = 1.0 - smoothstep(0.0028, 0.0042, gridDist(m.x, 0.03));
  float crossR = 1.0 - smoothstep(0.0032, 0.0046, gridDist(m.y, 0.1));
  float metalA = max(bear, crossR);
  float dirt = smoothstep(0.42, 0.86, fbm(uv, 4.0, 131.0, 5));
  float rustN = smoothstep(0.56, 0.82, fbm(uv, 8.0, 132.0, 4));
  vec3 galv = vec3(0.5, 0.52, 0.53) * (0.9 + 0.2 * fbm(uv, 30.0, 133.0, 2));
  vec3 c = mix(galv, vec3(0.36, 0.22, 0.13), rustN * 0.6);
  c *= 1.0 - 0.4 * dirt;
  col = mix(vec3(0.02, 0.019, 0.018), c, metalA);
  ro = mix(1.0, 0.42 + 0.36 * dirt + 0.2 * rustN, metalA);
  h = mix(0.0, mix(0.92, 0.84, crossR * (1.0 - bear)), metalA);
  me = metalA * (1.0 - rustN * 0.7) * (1.0 - dirt * 0.5);
}` },
  fabric: { size: 512, nrm: 1.2, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float w1 = sin((uv.x + uv.y) * 220.0 * TAU) * 0.5 + 0.5;
  float w2 = sin((uv.x - uv.y) * 110.0 * TAU) * 0.5 + 0.5;
  float weave = mix(w1, w2, 0.35);
  float n = fbm(uv, 6.0, 135.0, 4);
  float dirt = smoothstep(0.45, 0.85, fbm(uv, 4.0, 136.0, 5));
  float wear = smoothstep(0.6, 0.85, fbm(uv, 10.0, 137.0, 3));
  col = vec3(0.6) * (0.85 + 0.15 * weave + 0.06 * (n - 0.5)) * (1.0 - 0.32 * dirt) * (1.0 + 0.12 * wear);
  ro = 0.95;
  h = 0.5 + 0.22 * weave;
  me = 0.0;
}` },
  // the creature: pale stretched skin, veins, bruising, wrinkles, raw patches
  skin: { size: 1024, nrm: 2.6, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float mott = fbm(uv, 3.0, 151.0, 5), mott2 = fbm(uv, 12.0, 152.0, 4);
  float v1 = pow(ridgef(fbm(warp(uv, 6.0, 0.06, 153.0), 5.0, 155.0, 4)), 14.0);
  float v2 = pow(ridgef(fbm(uv, 11.0, 156.0, 4)), 22.0) * 0.7;
  float vein = max(v1, v2) * smoothstep(0.3, 0.62, fbm(uv, 2.0, 157.0, 3) + 0.2);
  float wr = pow(ridgef(fbmA(uv, vec2(18.0, 3.0), 158.0, 4)), 6.0);
  float pore = smoothstep(0.75, 0.92, hash12(floor(uv * uRes * 0.5) + 159.0)) * 0.6;
  float bruise = smoothstep(0.58, 0.8, fbm(uv, 2.0, 160.0, 5));
  float sore = smoothstep(0.79, 0.83, fbm(uv, 5.0, 161.0, 5));
  vec3 base = vec3(0.78, 0.75, 0.7);
  base = mix(base, vec3(0.84, 0.73, 0.68), smoothstep(0.4, 0.7, mott2) * 0.5);
  base = mix(base, vec3(0.69, 0.71, 0.65), smoothstep(0.5, 0.8, mott) * 0.5);
  vec3 c = mix(base, vec3(0.45, 0.36, 0.45), bruise * 0.55);
  c = mix(c, vec3(0.3, 0.32, 0.48), vein * 0.75);
  c = mix(c, vec3(0.5, 0.16, 0.13), sore * 0.65);
  c *= 1.0 - 0.18 * wr - 0.1 * pore;
  col = c;
  ro = 0.4 + 0.26 * mott - 0.22 * sore + 0.15 * wr;
  h = 0.5 + 0.18 * vein - 0.28 * wr - 0.08 * pore + 0.1 * (mott2 - 0.5) + 0.08 * sore;
  me = 0.0;
}` },
  // corrugated cardboard with tape and a stain or two
  card: { size: 512, nrm: 1.2, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float flute = sin(uv.y * TAU * 120.0) * 0.5 + 0.5;
  float n = fbm(uv, 4.0, 191.0, 4), fine = fbm(uv, 60.0, 192.0, 3);
  float stain = smoothstep(0.62, 0.86, fbm(uv, 3.0, 193.0, 5));
  float tape = 1.0 - smoothstep(0.045, 0.05, gridDist(uv.x, 0.5));
  float print = step(0.55, fbmA(uv, vec2(3.0, 9.0), 194.0, 2)) * step(gridDist(uv.y + 0.25, 0.5), 0.06) * (1.0 - tape);
  vec3 c = vec3(0.6, 0.45, 0.29) * (0.92 + 0.16 * (n - 0.5) + 0.06 * (fine - 0.5));
  c *= 1.0 - 0.28 * stain;
  c = mix(c, vec3(0.12, 0.1, 0.09), print * 0.7);
  c = mix(c, vec3(0.74, 0.64, 0.48), tape * 0.7);
  col = c; ro = mix(0.92, 0.42, tape); h = 0.5 + 0.03 * flute * (1.0 - tape) + 0.02 * tape; me = 0.0;
}` },
  // gentle ripples for standing water
  ripple: { size: 512, nrm: 3.0, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float a = fbm(uv, 6.0, 181.0, 4), b = fbm(uv + vec2(0.5, 0.25), 14.0, 182.0, 3);
  col = vec3(0.5); ro = 0.05; h = 0.5 + 0.35 * (a - 0.5) + 0.15 * (b - 0.5); me = 0.0;
}` },
  // diamond tread plate: raised lozenges in a herringbone, worn bright where boots go, grime in the flats
  tread: { size: 1024, nrm: 2.4, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  vec2 g = uv * 64.0;
  vec2 c = floor(g), f = fract(g) - 0.5;
  vec2 q = mod(c.x + c.y, 2.0) > 0.5 ? vec2(-f.x, f.y) : f;
  vec2 r = vec2(q.x + q.y, q.x - q.y) * 0.70710678;
  float d = length(vec2(r.x / 0.33, r.y / 0.085));
  float boss = 1.0 - smoothstep(0.8, 1.0, d);
  float dome = boss * sqrt(max(0.0, 1.0 - min(d, 1.0) * min(d, 1.0)));
  float big = fbm(uv, 2.0, 191.0, 4), mid = fbm(uv, 8.0, 192.0, 4), fine = fbm(uv, 90.0, 193.0, 3);
  float wear = smoothstep(0.35, 0.8, fbm(uv, 3.0, 194.0, 4));
  float grime = smoothstep(0.42, 0.86, fbm(uv, 5.0, 195.0, 5)) * (1.0 - boss * 0.7);
  float rust = smoothstep(0.68, 0.88, fbm(warp(uv, 6.0, 0.05, 196.0), 7.0, 197.0, 5)) * (1.0 - boss * 0.5);
  float s1 = smoothstep(0.86, 0.9, fbmA(uv + vec2(0.02 * mid, 0.0), vec2(80.0, 3.0), 198.0, 2));
  vec3 steel = vec3(0.44, 0.45, 0.46) * (0.92 + 0.12 * (big - 0.5) + 0.06 * (fine - 0.5));
  vec3 c3 = mix(steel, vec3(0.63, 0.64, 0.65), boss * (0.3 + 0.7 * wear));
  c3 = mix(c3, c3 * 0.5, grime * 0.85);
  c3 = mix(c3, vec3(0.31, 0.17, 0.09) * (0.8 + 0.4 * fine), rust * 0.85);
  c3 = mix(c3, c3 * 1.15 + 0.03, s1 * (1.0 - rust));
  col = c3;
  ro = mix(mix(0.52, 0.24, boss * wear), 0.86, max(grime * 0.6, rust));
  h = 0.35 + 0.5 * dome + 0.03 * (fine - 0.5) - 0.04 * rust * fine;
  me = mix(0.88, 0.2, max(grime * 0.7, rust));
}` },
  // world overlay data (linear): r blotches, g streaks, b puddle field, a fine
  grunge: { size: 512, nrm: 0, data: true, src: `
void surface(vec2 uv, out vec3 col, out float ro, out float h, out float me) {
  float blot = fbm(uv, 6.0, 171.0, 5);
  float streak = smoothstep(0.55, 0.85, fbmA(uv, vec2(48.0, 3.0), 172.0, 3)) * fbmA(uv, vec2(24.0, 8.0), 173.0, 3);
  float pud = fbm(uv, 5.0, 174.0, 4);
  col = vec3(blot, streak, pud);
  ro = fbm(uv, 40.0, 175.0, 3);
  h = 0.5; me = 0.0;
}` },
};

const GTex = { quad: null, scene: null, cam: null, mats: {}, lowRes: false };
const GTEX_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function gtexSetup(renderer) {
  if (GTex.scene) return;
  GTex.scene = new THREE.Scene();
  GTex.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  GTex.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  GTex.quad.frustumCulled = false;
  GTex.scene.add(GTex.quad);
  GTex.normalMat = new THREE.ShaderMaterial({
    vertexShader: GTEX_VERT, depthTest: false, depthWrite: false,
    uniforms: { tH: { value: null }, uTexel: { value: new THREE.Vector2() }, uStrength: { value: 1 } },
    fragmentShader: `varying vec2 vUv; uniform sampler2D tH; uniform vec2 uTexel; uniform float uStrength;
      float H(vec2 uv){ vec4 t = texture2D(tH, uv); return t.r + t.g / 255.0; }
      void main(){
        float l = H(vUv - vec2(uTexel.x, 0.0)), r = H(vUv + vec2(uTexel.x, 0.0)), d = H(vUv - vec2(0.0, uTexel.y)), u = H(vUv + vec2(0.0, uTexel.y));
        vec3 n = normalize(vec3((l - r) * uStrength, (d - u) * uStrength, 1.0));
        gl_FragColor = vec4(n * 0.5 + 0.5, texture2D(tH, vUv).b);
      }`,
  });
  // software renderers, and phones and tablets, get smaller textures
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    GTex.lowRes = TOUCH_DEVICE || /swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch (e) { GTex.lowRes = TOUCH_DEVICE; }
}
function gtexMaterial(name) {
  if (GTex.mats[name]) return GTex.mats[name];
  const r = GTEX_RECIPES[name];
  const m = new THREE.ShaderMaterial({
    vertexShader: GTEX_VERT, depthTest: false, depthWrite: false,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uMode: { value: 0 } },
    fragmentShader: GTEX_LIB + 'uniform float uMode;\n' + r.src + `
      void main(){
        vec3 col; float ro, h, me;
        surface(vUv, col, ro, h, me);
        if (uMode < 0.5) gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(ro, 0.02, 1.0));
        else { h = clamp(h, 0.0, 0.999); float hi = floor(h * 255.0) / 255.0; gl_FragColor = vec4(hi, fract(h * 255.0), clamp(me, 0.0, 1.0), 1.0); }
      }`,
  });
  GTex.mats[name] = m;
  return m;
}
function gtexTarget(size, opts) {
  const rt = new THREE.WebGLRenderTarget(size, size, Object.assign({
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: false, stencilBuffer: false,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true,
  }, opts || {}));
  rt.texture.anisotropy = Tex.aniso;
  return rt;
}
function gtexDraw(renderer, material, target) {
  GTex.quad.material = material;
  renderer.setRenderTarget(target);
  renderer.render(GTex.scene, GTex.cam);
  renderer.setRenderTarget(null);
}
// Bakes one set and returns { map, normalMap } (render-target textures)
function bakeGpuSet(name) {
  const renderer = R.renderer;
  gtexSetup(renderer);
  const r = GTEX_RECIPES[name];
  const size = GTex.lowRes ? Math.min(512, r.size) : r.size;
  const m = gtexMaterial(name);
  m.uniforms.uRes.value.set(size, size);
  const albedo = gtexTarget(size);
  if (!r.data) albedo.texture.encoding = THREE.sRGBEncoding;
  m.uniforms.uMode.value = 0;
  gtexDraw(renderer, m, albedo);
  if (r.data) return { map: albedo.texture };
  const hRT = gtexTarget(size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
  hRT.texture.anisotropy = 1;
  m.uniforms.uMode.value = 1;
  gtexDraw(renderer, m, hRT);
  const nRT = gtexTarget(size);
  GTex.normalMat.uniforms.tH.value = hRT.texture;
  GTex.normalMat.uniforms.uTexel.value.set(1 / size, 1 / size);
  GTex.normalMat.uniforms.uStrength.value = r.nrm * size / 512;
  gtexDraw(renderer, GTex.normalMat, nRT);
  hRT.dispose();
  return { map: albedo.texture, normalMap: nRT.texture };
}
