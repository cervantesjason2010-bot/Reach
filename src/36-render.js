// ================= render: renderer, lights, post-processing, dust =================
const R = { scale: 1, fear: 0, whiteFlash: 0, fade: 0, shake: 0, exposure: 1.0, adapt: 1, flashPower: 0, flashThrow: 1, haze: 0, vmGlow: 0, fogColor: new THREE.Color(0x000000), fogDensity: 0.07 };
// light levels (physically based units: candela for spots and points)
const LUX = { flashHot: 48, flashSpill: 11, bounce: 2.2, mate: 40, mateSpill: 8, backlight: 70, hemi: 0.05 };

const POST_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
// a pixel that comes out NaN or infinite (a bad value from any shader on any GPU) shows as black instead of blooming into a glow
const POST_SAFE = `
#if __VERSION__ >= 300
bool badF(float x) { return (floatBitsToUint(x) & 0x7f800000u) == 0x7f800000u; }
#else
bool badF(float x) { return !(abs(x) < 6e4); }
#endif
vec3 safe3(vec3 c) { return (badF(c.r) || badF(c.g) || badF(c.b) || !(c.r + c.g + c.b < 6e4)) ? vec3(0.0) : clamp(c, 0.0, 256.0); }
`;
const AUTO_EXP = `
uniform sampler2D tAdapt; uniform float autoOn;
float autoExposure(){ return autoOn > 0.5 ? texture2D(tAdapt, vec2(0.5)).r : 1.0; }
`;
const BRIGHT_FRAG = AUTO_EXP + POST_SAFE + `
uniform sampler2D tInput; uniform float threshold; uniform float exposure; varying vec2 vUv;
void main(){ vec3 c = safe3(texture2D(tInput, vUv).rgb) * exposure * autoExposure(); float l = max(c.r, max(c.g, c.b));
  float k = clamp((l - threshold) / max(l, 1e-4), 0.0, 1.0); gl_FragColor = vec4(min(c * k, vec3(40.0)), 1.0); }`;
const BLUR_FRAG = `
uniform sampler2D tInput; uniform vec2 dir; varying vec2 vUv;
void main(){ vec3 s = texture2D(tInput, vUv).rgb * 0.227;
  s += texture2D(tInput, vUv + dir * 1.385).rgb * 0.316; s += texture2D(tInput, vUv - dir * 1.385).rgb * 0.316;
  s += texture2D(tInput, vUv + dir * 3.231).rgb * 0.070; s += texture2D(tInput, vUv - dir * 3.231).rgb * 0.070;
  gl_FragColor = vec4(s, 1.0); }`;
const LUM_FRAG = POST_SAFE + `
uniform sampler2D tInput; uniform vec2 texel; varying vec2 vUv;
float L(vec2 o){ return dot(safe3(texture2D(tInput, vUv + o).rgb), vec3(0.2126, 0.7152, 0.0722)); }
void main(){ float l = (L(vec2(-texel.x, -texel.y)) + L(vec2(texel.x, -texel.y)) + L(vec2(-texel.x, texel.y)) + L(texel)) * 0.25;
  gl_FragColor = vec4(log(l + 0.0004), min(l, 6.0), 0.0, 1.0); }`;
// metering: the log average keeps dark scenes dark, a centre-weighted plain average stops a lit wall in your face from burning white.
// The result is the exposure itself, eased in log space (fast when it gets brighter, slow when it gets darker)
const ADAPT_FRAG = POST_SAFE + `
uniform sampler2D tLum; uniform sampler2D tPrev; uniform float dt; uniform float rate; varying vec2 vUv;
void main(){ float s = 0.0, ws = 0.0, m = 0.0, wm = 0.0;
  for (int y = 0; y < 16; y++) for (int x = 0; x < 16; x++) {
    vec2 uv = (vec2(float(x), float(y)) + 0.5) / 16.0;
    float d = length(uv - 0.5);
    float w = 1.0 + 1.5 * (1.0 - smoothstep(0.1, 0.5, d));
    float wc = 0.15 + (1.0 - smoothstep(0.06, 0.4, d));
    vec4 lv = texture2D(tLum, uv);
    s += lv.r * w; ws += w;
    m += lv.g * wc; wm += wc;
  }
  float avgLog = exp(s / ws), avgLin = m / wm;
  if (badF(avgLog) || !(avgLog > 0.0 && avgLog < 1e4)) avgLog = 0.05;
  if (badF(avgLin) || !(avgLin >= 0.0 && avgLin < 1e4)) avgLin = 0.2;
  float target = clamp(min(0.06 / max(avgLog, 1e-4), 0.26 / max(avgLin, 1e-4)), 0.05, 1.6);
  float prev = texture2D(tPrev, vec2(0.5)).r;
  if (badF(prev) || !(prev > 0.0)) prev = target;
  float k = 1.0 - exp(-dt * rate * (target < prev ? 3.2 : 0.9));
  gl_FragColor = vec4(exp(mix(log(prev), log(target), k)), 0.0, 0.0, 1.0); }`;
const COMPOSITE_FRAG = AUTO_EXP + POST_SAFE + `
uniform sampler2D tScene; uniform sampler2D tBloom0; uniform sampler2D tBloom1; uniform sampler2D tBloom2;
uniform float time; uniform float exposure; uniform float bloomStrength;
uniform float fear; uniform float flash; uniform float fade; uniform float bleed; uniform float saturation; uniform vec3 tint; uniform vec2 res; uniform float grain;
uniform float haze; uniform vec2 hazePos; uniform vec3 hazeColor;
varying vec2 vUv;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 c = vUv - 0.5; float r2 = dot(c, c);
  vec2 uv = 0.5 + c * (1.0 - 0.03 * r2 - fear * 0.05 * r2);
  float ca = 0.0008 + 0.0035 * r2 + fear * 0.006;
  vec3 col;
  col.r = texture2D(tScene, uv + c * ca).r;
  col.g = texture2D(tScene, uv).g;
  col.b = texture2D(tScene, uv - c * ca).b;
  col = safe3(col);
  vec3 bl = safe3(texture2D(tBloom0, uv).rgb * 0.55 + texture2D(tBloom1, uv).rgb * 0.75 + texture2D(tBloom2, uv).rgb * 1.0);
  col += bl * bloomStrength;
  vec2 hp = (uv - hazePos) * vec2(res.x / res.y, 1.0);
  col += hazeColor * haze * exp(-dot(hp, hp) * 9.0);
  col = aces(col * exposure * autoExposure());
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, saturation - fear * 0.35);
  col *= tint;
  float v = 1.0 - smoothstep(0.2, 0.98, length(c) * (1.0 + fear * 0.5));
  col *= mix(0.3, 1.0, v);
  col = mix(col, col * vec3(1.25, 0.55, 0.5), fear * smoothstep(0.25, 0.75, length(c)) * 0.8);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  float n = hash(floor(vUv * res) + fract(time) * 97.0);
  col += (n - 0.5) * grain * (1.0 + fear) * (1.0 - l * 0.6);
  col = mix(col, vec3(1.0), flash);
  // blood in the eyes: the picture goes red and dark from the edges in
  col = mix(col, vec3(dot(col, vec3(0.6, 0.3, 0.1)) * 1.4, 0.0, 0.0) + vec3(0.16, 0.0, 0.0) * (1.0 - length(c)), bleed * (0.55 + 0.45 * smoothstep(0.1, 0.7, length(c))));
  col *= 1.0 - fade;
  gl_FragColor = vec4(col, 1.0);
}`;

function initRenderer(canvas) {
  // lamps are not points: soften the near field so a wall next to a light doesn't burn white
  THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin.replace(
    'float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );',
    'float distanceFalloff = 1.0 / ( pow( lightDistance, decayExponent ) + 0.65 );')
    // beams fade out gradually toward their edge instead of ending in a ring
    .replace('float spotEffect = smoothstep( spotLight.coneCos, spotLight.penumbraCos, angleCos );',
      'float spotEffect = smoothstep( spotLight.coneCos, spotLight.penumbraCos, angleCos ); spotEffect *= spotEffect;');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.physicallyCorrectLights = true;
  Tex.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const gl2 = renderer.capabilities.isWebGL2;
  // some phones can't draw into half-float targets: they get plain 8-bit ones (and no eye adaptation) instead
  const glc = renderer.getContext(), hf = gl2 && !!(glc.getExtension('EXT_color_buffer_float') || glc.getExtension('EXT_color_buffer_half_float'));
  // a phone that puts the game in the background can take the graphics away; everything baked on the GPU
  // goes with them, so the only way back is a reload - say so rather than leave a black screen
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); const box = document.getElementById('ctx-lost'); if (box) box.hidden = false; }, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.07);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.04, 160);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const hemi = new THREE.HemisphereLight(0x3a3226, 0x0a0908, LUX.hemi);
  scene.add(hemi);

  // the flashlight: a tight hot centre with a soft wide spill around it
  const flash = new THREE.SpotLight(0xfff3e4, 0, 45, 0.31, 0.78, 2);
  flash.castShadow = true;
  flash.shadow.mapSize.set(1024, 1024);
  flash.shadow.camera.near = 0.12; flash.shadow.camera.far = 45;
  flash.shadow.bias = -0.00035; flash.shadow.normalBias = 0.03;
  const flashTarget = new THREE.Object3D();
  camera.add(flash); camera.add(flashTarget);
  flash.position.set(0.14, -0.16, 0.05); flashTarget.position.set(0.03, -0.05, -3);
  flash.target = flashTarget;
  const flashSpill = new THREE.SpotLight(0xfff0dc, 0, 32, 0.85, 0.95, 2);
  camera.add(flashSpill);
  flashSpill.position.copy(flash.position); flashSpill.target = flashTarget;
  const bounce = new THREE.PointLight(0xfff1dc, 0, 7, 2);
  camera.add(bounce);

  const mates = [];
  for (let i = 0; i < 3; i++) {
    const l = new THREE.SpotLight(0xfff3e4, 0, 34, 0.32, 0.8, 2);
    const t = new THREE.Object3D(); scene.add(l); scene.add(t); l.target = t;
    mates.push({ light: l, target: t });
  }
  const backlight = new THREE.PointLight(0xffb070, 0, 16, 2);
  scene.add(backlight);
  // a spare key light for cutscenes
  const key = new THREE.SpotLight(0xffe2c0, 0, 22, 0.55, 0.85, 2);
  scene.add(key); scene.add(key.target);
  const pool = [];
  // the nearest lamps get real lights; a phone gets fewer of them, every one is paid for on every pixel
  for (let i = 0, n = TOUCH_DEVICE ? 6 : 8; i < n; i++) { const p = new THREE.PointLight(0xffffff, 0, 8, 2); scene.add(p); pool.push(p); }

  const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: hf ? THREE.HalfFloatType : THREE.UnsignedByteType };
  const rtScene = gl2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(4, 4, rtOpts) : new THREE.WebGLRenderTarget(4, 4, rtOpts);
  if (rtScene.samples !== undefined) rtScene.samples = 4;
  const bloomRT = [0, 1, 2].map(() => ({ a: new THREE.WebGLRenderTarget(4, 4, rtOpts), b: new THREE.WebGLRenderTarget(4, 4, rtOpts) }));
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quad.frustumCulled = false; quadScene.add(quad);
  // eye adaptation: average log luminance on a small target, eased over time into a 1x1 target
  const fOpts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.HalfFloatType, depthBuffer: false };
  const autoOn = hf;
  const lumRT = new THREE.WebGLRenderTarget(64, 64, Object.assign({}, fOpts, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
  const adaptRT = [new THREE.WebGLRenderTarget(1, 1, fOpts), new THREE.WebGLRenderTarget(1, 1, fOpts)];
  const lumMat = new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: LUM_FRAG, uniforms: { tInput: { value: null }, texel: { value: new THREE.Vector2(0.004, 0.004) } }, depthTest: false, depthWrite: false });
  const adaptMat = new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: ADAPT_FRAG, uniforms: { tLum: { value: lumRT.texture }, tPrev: { value: null }, dt: { value: 0.016 }, rate: { value: 1 } }, depthTest: false, depthWrite: false });
  const autoU = { tAdapt: { value: adaptRT[0].texture }, autoOn: { value: autoOn ? 1 : 0 } };
  const brightMat = new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: BRIGHT_FRAG, uniforms: Object.assign({ tInput: { value: null }, threshold: { value: 0.9 }, exposure: { value: 1 } }, autoU), depthTest: false, depthWrite: false });
  const blurMat = new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: BLUR_FRAG, uniforms: { tInput: { value: null }, dir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
  const compMat = new THREE.ShaderMaterial({
    vertexShader: POST_VERT, fragmentShader: COMPOSITE_FRAG, depthTest: false, depthWrite: false,
    uniforms: { tAdapt: autoU.tAdapt, autoOn: autoU.autoOn, tScene: { value: null }, tBloom0: { value: null }, tBloom1: { value: null }, tBloom2: { value: null }, time: { value: 0 }, exposure: { value: 1 }, bloomStrength: { value: 0.5 }, fear: { value: 0 },
      flash: { value: 0 }, fade: { value: 0 }, bleed: { value: 0 }, saturation: { value: 0.86 }, tint: { value: new THREE.Vector3(1, 1, 1) }, res: { value: new THREE.Vector2(1, 1) }, grain: { value: 0.04 },
      haze: { value: 0 }, hazePos: { value: new THREE.Vector2(0.52, 0.47) }, hazeColor: { value: new THREE.Vector3(1, 0.95, 0.88) } },
  });
  // first-person hands are drawn in their own pass so the flashlight never blows them out
  const vmScene = new THREE.Scene(), vmCam = new THREE.PerspectiveCamera(72, 1, 0.01, 4);
  const vmHemi = new THREE.HemisphereLight(0x9a9488, 0x1a1816, 0.25);
  const vmFront = new THREE.PointLight(0xfff0dc, 0, 3, 2); vmFront.position.set(0.05, 0.05, -0.75);
  const vmTop = new THREE.PointLight(0xffe8d0, 0, 3, 2); vmTop.position.set(0.25, 0.35, -0.15);
  vmScene.add(vmHemi, vmFront, vmTop);
  Object.assign(R, { vmScene, vmCam, vmHemi, vmFront, vmTop, lumRT, adaptRT, lumMat, adaptMat, autoU, autoOn, adaptI: 0 });
  Object.assign(R, { key });
  Object.assign(R, { renderer, scene, camera, hemi, flash, flashSpill, flashTarget, bounce, mates, pool, backlight, rtScene, bloomRT, quad, quadScene, quadCam, brightMat, blurMat, compMat, gl2 });
  buildDust();
  buildDebris();
  occInit();
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
}

// 0 = off, 1 = normal. Both cones follow it.
function setFlash(p) { R.flashPower = p; }

// ---------- graphics settings ----------
// Quality trades resolution, shadows, glow and anti-aliasing for speed; render distance is how far out the
// world is drawn at all (with the fog pulled in to meet it, so there is never a hard edge).
const GFX = {
  low: { scaleMax: 0.62, prMax: 1, shadow: 0, bloom: 0, msaa: 0 },
  med: { scaleMax: 0.85, prMax: 1, shadow: 512, bloom: 1, msaa: 0 },
  high: { scaleMax: 1.0, prMax: 1.5, shadow: 1024, bloom: 1, msaa: 4 },
  ultra: { scaleMax: 1.0, prMax: 2, shadow: 2048, bloom: 1, msaa: 4 },
};
function gfxPreset() { return GFX[typeof Settings !== 'undefined' && Settings.gfx] || GFX.high; }
// phones have small, dense screens: they draw a little sharper than a desktop does on the same setting
function pixelRatio() { const P = gfxPreset(); return Math.min(window.devicePixelRatio || 1, TOUCH_DEVICE ? Math.max(P.prMax, 1.5) : P.prMax); }
function renderDist() { return typeof Settings !== 'undefined' && Settings.rdist ? Settings.rdist : 80; }
function applyGraphics() {
  if (!R.renderer) return;
  const P = gfxPreset();
  R.scale = Math.min(R.scale, P.scaleMax);
  const wantShadow = P.shadow > 0;
  if (R.flash.castShadow !== wantShadow) { R.flash.castShadow = wantShadow; R.scene.traverse((o) => { if (o.material && o.material.needsUpdate !== undefined) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); } }); }
  if (wantShadow && R.flash.shadow.mapSize.x !== P.shadow) {
    R.flash.shadow.mapSize.set(P.shadow, P.shadow);
    if (R.flash.shadow.map) { R.flash.shadow.map.dispose(); R.flash.shadow.map = null; }
  }
  if (R.rtScene.samples !== undefined && R.rtScene.samples !== P.msaa) { R.rtScene.samples = P.msaa; R.rtScene.dispose(); }
  resizeRenderer();
}
function applyRenderDistance() {
  if (!R.camera) return;
  R.camera.far = Math.max(30, renderDist()) + 10; R.camera.updateProjectionMatrix();
}

function resizeRenderer() {
  if (!R.renderer) return;
  const w = window.innerWidth, h = window.innerHeight;
  const pr = pixelRatio();
  R.renderer.setPixelRatio(pr);
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  applyRenderScale();
}
function applyRenderScale() {
  const w = window.innerWidth, h = window.innerHeight, pr = pixelRatio();
  const sw = Math.max(2, Math.floor(w * pr * R.scale)), sh = Math.max(2, Math.floor(h * pr * R.scale));
  R.rtScene.setSize(sw, sh);
  R.bloomRT.forEach((lv, i) => { const d = 2 << i; lv.a.setSize(Math.max(2, Math.floor(sw / d)), Math.max(2, Math.floor(sh / d))); lv.b.setSize(Math.max(2, Math.floor(sw / d)), Math.max(2, Math.floor(sh / d))); });
  R.compMat.uniforms.res.value.set(w * pr, h * pr);
}

// ---------- dust that only shows inside the flashlight beam ----------
function buildDust() {
  const N = 2200, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = Math.random() * 16 - 8; pos[i * 3 + 1] = Math.random() * 5; pos[i * 3 + 2] = Math.random() * 16 - 8; seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { camPos: { value: new THREE.Vector3() }, flashPos: { value: new THREE.Vector3() }, flashDir: { value: new THREE.Vector3(0, 0, -1) }, flashOn: { value: 1 }, time: { value: 0 }, density: { value: 1 }, tint: { value: new THREE.Color(1, 0.95, 0.88) } },
    vertexShader: `
      attribute float seed; uniform vec3 camPos; uniform vec3 flashPos; uniform vec3 flashDir; uniform float flashOn; uniform float time; uniform float density;
      varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(time * 0.21 + seed * 40.0) * 0.4; p.y += sin(time * 0.13 + seed * 17.0) * 0.25; p.z += cos(time * 0.17 + seed * 23.0) * 0.4;
        vec3 w = camPos + mod(p - camPos + 8.0, 16.0) - 8.0; w.y = p.y;
        vec3 d = w - flashPos; float dist = length(d);
        float cone = smoothstep(0.8, 0.96, dot(d / max(dist, 0.001), flashDir));
        float a = cone * flashOn * (1.0 - smoothstep(1.0, 8.5, dist)) * smoothstep(0.25, 0.9, dist) * step(0.35, fract(seed * 7.31));
        vA = a * (0.35 + 0.65 * fract(seed * 13.7 + time * 0.05)) * density / (0.6 + dist * 0.25);
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        gl_PointSize = clamp(1.3 * 300.0 / -mv.z, 1.0, 3.5);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 tint; varying float vA;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard; gl_FragColor = vec4(tint * vA * (1.0 - d * 4.0) * 0.16, 1.0); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  R.scene.add(pts);
  R.dust = pts;
}

// ---------- debris: what every strike knocks loose ----------
// Chips of plaster and concrete that fly, fall, bounce off the walls and come to rest on the floor, and slow
// clouds of dust that bloom where a blow landed and hang there thinning out. A few hundred points simulated
// on the CPU and drawn in one call; lit by the flashlight like everything else, with a trace of ambient so a
// cloud is still a shape in the dark.
const DEB_N = 720;
const Debris = { i: 0, dirty: false };
function buildDebris() {
  const N = DEB_N, D = Debris;
  D.pos = new Float32Array(N * 3); D.vel = new Float32Array(N * 3); D.info = new Float32Array(N * 4);
  D.age = new Float32Array(N).fill(1e3); D.life = new Float32Array(N).fill(1); D.fy = new Float32Array(N);
  D.s0 = new Float32Array(N); D.s1 = new Float32Array(N); D.a0 = new Float32Array(N); D.kind = new Uint8Array(N);
  const g = new THREE.BufferGeometry();
  D.pAttr = new THREE.BufferAttribute(D.pos, 3); D.pAttr.setUsage(THREE.DynamicDrawUsage);
  D.iAttr = new THREE.BufferAttribute(D.info, 4); D.iAttr.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position', D.pAttr); g.setAttribute('info', D.iAttr);
  const du = R.dust.material.uniforms;
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { flashPos: du.flashPos, flashDir: du.flashDir, camPos: du.camPos, flashK: { value: 1 }, pxScale: { value: 700 } },
    vertexShader: `
      attribute vec4 info; uniform vec3 flashPos; uniform vec3 flashDir; uniform vec3 camPos; uniform float flashK; uniform float pxScale;
      varying float vA; varying float vK; varying float vL;
      void main(){
        vec3 d = position - flashPos; float dist = length(d);
        float cone = smoothstep(0.8, 0.95, dot(d / max(dist, 0.001), flashDir)) * (1.0 - smoothstep(3.0, 13.0, dist));
        vL = 0.03 + cone * flashK * 1.9 / (0.6 + dist * dist * 0.07);
        vA = info.y * (1.0 - smoothstep(9.0, 18.0, length(position - camPos)));
        vK = info.z;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float px = info.x * pxScale / max(-mv.z, 0.05);
        gl_PointSize = vK > 0.5 ? clamp(px, 2.0, 180.0) : clamp(px, 1.4, 7.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA; varying float vK; varying float vL;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0; if (d > 1.0) discard;
        float a = vK > 0.5 ? vA * (1.0 - d) * (1.0 - d) : vA;
        gl_FragColor = vec4((vK > 0.5 ? vec3(0.58, 0.56, 0.52) : vec3(0.46, 0.44, 0.4)) * vL, a); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false; pts.renderOrder = 4;
  R.scene.add(pts);
  R.debris = pts;
}
// kind 0 = a chip, 1 = a puff of dust. delay > 0 holds it back that many seconds before it appears.
function debrisSpawn(kind, x, y, z, vx, vy, vz, s0, s1, a0, life, fy, delay = 0) {
  const D = Debris, i = D.i; D.i = (D.i + 1) % DEB_N;
  const j = i * 3;
  D.pos[j] = x; D.pos[j + 1] = y; D.pos[j + 2] = z; D.vel[j] = vx; D.vel[j + 1] = vy; D.vel[j + 2] = vz;
  D.kind[i] = kind; D.s0[i] = s0; D.s1[i] = s1; D.a0[i] = a0; D.life[i] = life; D.age[i] = -delay; D.fy[i] = fy;
  D.info[i * 4] = s0; D.info[i * 4 + 1] = 0; D.info[i * 4 + 2] = kind; D.info[i * 4 + 3] = Math.random();
  D.dirty = true;
}
// A strike on a surface: f is 'w' wall, 'f' floor, 'c' ceiling ('a', the air, knocks nothing loose).
function debrisBurst(x, y, z, f, power = 1) {
  if (!R.debris || !Game.L || f === 'a') return;
  const L = Game.L, fy = floorAt(L, x, z), rnd = (a, b) => a + Math.random() * (b - a);
  let nx = 0, nz = 0;
  if (f === 'w') {
    // out of the wall: away from whichever side of the hit is solid
    let best = 9;
    for (const [dx, dz] of Debris.free ? [] : [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let s = 0.05; s <= 0.6; s += 0.05) {
        if (cellKind(L, Math.floor(x + dx * s), Math.floor(z + dz * s)) !== 'open') { if (s < best) { best = s; nx = -dx; nz = -dz; } break; }
      }
    }
    if (best === 9) f = 'f';
  }
  const tx = -nz, tz = nx;
  const chips = Math.round((f === 'c' ? 26 : f === 'w' ? 24 : 18) * power);
  for (let i = 0; i < chips; i++) {
    let vx, vy, vz;
    if (f === 'w') { const o = rnd(1.1, 3.6), t = rnd(-1.5, 1.5); vx = nx * o + tx * t; vz = nz * o + tz * t; vy = rnd(0.1, 2.3); }
    else if (f === 'f') { const a = Math.random() * Math.PI * 2, s = rnd(0.5, 2.2); vx = Math.cos(a) * s; vz = Math.sin(a) * s; vy = rnd(1.1, 3.4); }
    else { const a = Math.random() * Math.PI * 2, s = rnd(0, 1.3); vx = Math.cos(a) * s; vz = Math.sin(a) * s; vy = rnd(-1.2, 0.3); }
    debrisSpawn(0, x + nx * 0.04 + rnd(-0.12, 0.12), y + rnd(-0.1, 0.1), z + nz * 0.04 + rnd(-0.12, 0.12), vx, vy, vz, rnd(0.012, 0.036), 0, 1, rnd(2.6, 4.6), fy);
  }
  const puffs = Math.round((f === 'f' ? 12 : 9) * power);
  for (let i = 0; i < puffs; i++) {
    if (f === 'w') debrisSpawn(1, x + nx * 0.1, y + rnd(-0.15, 0.15), z + nz * 0.1, nx * rnd(0.4, 1.3) + rnd(-0.35, 0.35), rnd(-0.1, 0.3), nz * rnd(0.4, 1.3) + rnd(-0.35, 0.35), rnd(0.14, 0.3), rnd(0.9, 1.7), rnd(0.16, 0.3), rnd(1.6, 2.9), fy);
    else if (f === 'f') { const a = Math.random() * Math.PI * 2, s = rnd(0.6, 1.9); debrisSpawn(1, x, fy + 0.12, z, Math.cos(a) * s, rnd(0.05, 0.35), Math.sin(a) * s, rnd(0.15, 0.3), rnd(1.0, 1.9), rnd(0.16, 0.28), rnd(1.6, 2.8), fy); }
    else debrisSpawn(1, x + rnd(-0.2, 0.2), y - 0.12, z + rnd(-0.2, 0.2), rnd(-0.4, 0.4), rnd(-0.5, -0.1), rnd(-0.4, 0.4), rnd(0.15, 0.3), rnd(1.0, 1.8), rnd(0.15, 0.27), rnd(1.8, 3.0), fy);
  }
  // a ceiling keeps letting go for a moment after: a fine curtain of grit
  if (f === 'c') for (let i = 0; i < Math.round(30 * power); i++) debrisSpawn(0, x + rnd(-0.6, 0.6), y - 0.03, z + rnd(-0.6, 0.6), 0, rnd(-0.3, 0), 0, rnd(0.007, 0.018), 0, 0.85, rnd(2.4, 3.6), fy, rnd(0.05, 1.0));
}
// The whole room shaken: grit sifts down out of the ceiling all around you.
function debrisShower(cx, cz, n = 24) {
  if (!R.debris || !Game.L) return;
  const L = Game.L, rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
    const x = cx + rnd(-3.2, 3.2), z = cz + rnd(-3.2, 3.2);
    if (!Debris.free && cellKind(L, Math.floor(x), Math.floor(z)) !== 'open') continue;
    const top = Math.min(ceilAt(L, x, z), 6) - 0.04, fy = floorAt(L, x, z);
    debrisSpawn(0, x, top, z, rnd(-0.1, 0.1), rnd(-0.4, 0), rnd(-0.1, 0.1), rnd(0.006, 0.016), 0, 0.8, rnd(2.2, 3.2), fy, rnd(0, 0.8));
    if (i % 8 === 0) debrisSpawn(1, x, top - 0.1, z, 0, rnd(-0.35, -0.12), 0, rnd(0.12, 0.25), rnd(0.8, 1.4), rnd(0.07, 0.13), rnd(2, 3), fy, rnd(0, 0.5));
    i++;
  }
}
function updateDebris(dt) {
  const D = Debris, P = D.pos, V = D.vel, I = D.info, L = Game.L, h = Math.min(dt, 0.05);
  if (!D.dirty) return;
  let any = false;
  for (let i = 0; i < DEB_N; i++) {
    const life = D.life[i];
    if (D.age[i] >= life) continue;
    const age = (D.age[i] += h);
    const j = i * 3, q = i * 4;
    if (age >= life || age < 0) { I[q + 1] = 0; any = true; continue; }
    any = true;
    if (D.kind[i] === 0) {
      // a chip: falls, glances off walls, bounces once or twice and lies still
      V[j + 1] -= 9.8 * h;
      let x = P[j] + V[j] * h, y = P[j + 1] + V[j + 1] * h, z = P[j + 2] + V[j + 2] * h;
      if (L && !D.free && cellKind(L, Math.floor(x), Math.floor(P[j + 2])) !== 'open') { V[j] *= -0.3; x = P[j]; }
      if (L && !D.free && cellKind(L, Math.floor(x), Math.floor(z)) !== 'open') { V[j + 2] *= -0.3; z = P[j + 2]; }
      if (y < D.fy[i] + 0.006) {
        y = D.fy[i] + 0.006;
        if (V[j + 1] < -0.7) { V[j + 1] *= -0.28; V[j] *= 0.45; V[j + 2] *= 0.45; } else { V[j] = V[j + 1] = V[j + 2] = 0; }
      }
      P[j] = x; P[j + 1] = y; P[j + 2] = z;
      I[q] = D.s0[i];
      I[q + 1] = D.a0[i] * clamp((life - age) / 0.7, 0, 1);
    } else {
      // dust: carried on what is left of the blow, sinking, spreading and thinning out
      const drag = Math.exp(-h * 2.4);
      V[j] *= drag; V[j + 2] *= drag; V[j + 1] = V[j + 1] * drag - 0.1 * h;
      P[j] += V[j] * h; P[j + 1] = Math.max(D.fy[i] + 0.08, P[j + 1] + V[j + 1] * h); P[j + 2] += V[j + 2] * h;
      const k = age / life;
      I[q] = D.s0[i] + (D.s1[i] - D.s0[i]) * (1 - (1 - k) * (1 - k));
      I[q + 1] = D.a0[i] * Math.min(1, age / 0.07) * (1 - k) * (1 - k);
    }
  }
  D.pAttr.needsUpdate = true; D.iAttr.needsUpdate = true;
  D.dirty = any;
}

// ---------- per-frame lighting from the level's fixtures ----------
let poolTimer = 0;
function updateLightPool(dt, cam, ca) {
  poolTimer -= dt;
  if (poolTimer > 0 && R.poolPicked) { applyPool(); return; }
  poolTimer = 0.2;
  const cx = cam.position.x, cz = cam.position.z;
  const cands = [];
  for (const s of World.lightSpots) {
    if (Math.abs(s.area - ca) > 1 || s.dead) continue;
    const d = Math.hypot(s.x - cx, s.z - cz);
    if (d < s.range + 22) cands.push([d / Math.sqrt(s.base + 1) - (s.lit ? 0 : 0), s]);
  }
  cands.sort((a, b) => a[0] - b[0]);
  R.poolPicked = cands.slice(0, R.pool.length).map((c) => c[1]);
  occAssignPool();
  applyPool();
}
const _bw = new THREE.Vector3();
function applyPool() {
  let glow = 0;
  R.pool.forEach((p, i) => {
    const s = R.poolPicked[i];
    if (!s) { p.intensity = 0; return; }
    if (s.bulb) { s.bulb.children[1].getWorldPosition(_bw); p.position.copy(_bw); p.position.y -= 0.12; }
    else p.position.set(s.x, s.y, s.z);
    p.color.setHex(s.color);
    p.intensity = s.base * (s.level !== undefined ? s.level : 1);
    p.distance = s.range;
    const d2 = p.position.distanceToSquared(R.camera.position);
    glow += p.intensity / Math.max(1, d2);
  });
  R.vmGlow = damp(R.vmGlow, clamp(glow * 0.04, 0, 2.5), 6, 0.05);
}

// ---------- lamps don't shine through walls: a visibility tile per pooled light, traced on the level grid ----------
const OCC = { N: 64, data: null, tex: null, cache: new Map(), slot: [], mate: [], lockSig: '' };
function occInit() {
  const N = OCC.N, W = N * OCC_TILES;
  OCC.data = new Uint8Array(W * N * 4).fill(255);
  OCC.tex = new THREE.DataTexture(OCC.data, W, N, THREE.RGBAFormat);
  OCC.tex.magFilter = THREE.LinearFilter; OCC.tex.minFilter = THREE.LinearFilter;
  OCC.tex.wrapS = OCC.tex.wrapT = THREE.ClampToEdgeWrapping;
  OCC.tex.needsUpdate = true;
  WS.occTex.value = OCC.tex;
}
// can light leaving (x0, z0) reach (x1, z1)? Walls and shut doors stop it; the first wall it meets is lit only on its skin
function occSees(L, open, x0, z0, x1, z1) {
  let cx = Math.floor(x0), cz = Math.floor(z0);
  const tx = Math.floor(x1), tz = Math.floor(z1), dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  if (len < 1e-6) return 1;
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tmx = dx !== 0 ? (sx > 0 ? cx + 1 - x0 : x0 - cx) * tdx : Infinity, tmz = dz !== 0 ? (sz > 0 ? cz + 1 - z0 : z0 - cz) * tdz : Infinity;
  for (let k = 0; k < 256; k++) {
    if (cx === tx && cz === tz) return 1;
    let t;
    if (tmx < tmz) { t = tmx; tmx += tdx; cx += sx; } else { t = tmz; tmz += tdz; cz += sz; }
    if (t >= 1) return 1;
    if (!inGrid(L, cx, cz)) return 0;
    const i = cz * L.W + cx, c = L.ch[i], lk = L.lockAt[i];
    if (c === '#' || c === 'I' || (lk >= 0 && !open[lk])) return cx === tx && cz === tz && (1 - t) * len < 0.4 ? 1 : 0;
  }
  return 1;
}
function occTile(L, open, x, z, half) {
  const N = OCC.N, a = new Uint8Array(N * N), b = new Uint8Array(N * N), ts = (2 * half) / N;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) a[j * N + i] = occSees(L, open, x, z, x - half + (i + 0.5) * ts, z - half + (j + 0.5) * ts) ? 255 : 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let s = 0, c = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; s += a[jj * N + ii]; c++; }
    b[j * N + i] = s / c;
  }
  return b;
}
function occWrite(tile, data) {
  const N = OCC.N, W = N * OCC_TILES;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = data[j * N + i], o = (j * W + tile * N + i) * 4; OCC.data[o] = OCC.data[o + 1] = OCC.data[o + 2] = v; }
  OCC.tex.needsUpdate = true;
}
function occOpenLocks() {
  const open = typeof Game !== 'undefined' && Game.g ? openLocksOf(Game.g) : [];
  const sig = open.join('');
  if (sig !== OCC.lockSig) { OCC.lockSig = sig; OCC.cache.clear(); OCC.slot = []; OCC.mate = []; }
  return open;
}
// pool slot i is point light 2 + i (the bounce and the backlight come first)
function occAssignPool() {
  if (!OCC.tex || typeof Game === 'undefined' || !Game.L) return;
  const L = Game.L, open = occOpenLocks();
  R.pool.forEach((p, i) => {
    const s = R.poolPicked && R.poolPicked[i], u = WS.occPt.value[2 + i];
    if (!s) { u.w = -1; OCC.slot[i] = null; return; }
    const half = Math.max(2, Math.min(20, s.range));
    if (OCC.slot[i] !== s) {
      let t = OCC.cache.get(s);
      if (!t) { t = occTile(L, open, s.x, s.z, half); OCC.cache.set(s, t); }
      occWrite(i, t); OCC.slot[i] = s;
    }
    u.set(s.x, s.z, 1 / (2 * half), i);
  });
}
// teammates' torches (spot lights 2..4): retraced when they move
function occMate(k, light, on) {
  const u = WS.occSp.value[2 + k];
  if (!OCC.tex || !on || !Game.L) { u.w = -1; return; }
  const x = light.position.x, z = light.position.z, m = OCC.mate[k];
  if (!m || Math.hypot(m.x - x, m.z - z) > 0.6 || m.sig !== OCC.lockSig) {
    if (OCC.mateBudget <= 0 && m) { u.set(m.x, m.z, 1 / 40, 8 + k); return; }
    OCC.mateBudget--;
    occWrite(8 + k, occTile(Game.L, occOpenLocks(), x, z, 20));
    OCC.mate[k] = { x, z, sig: OCC.lockSig };
  }
  const mm = OCC.mate[k];
  u.set(mm.x, mm.z, 1 / 40, 8 + k);
}

// the current area, plus a neighbour only when you are close enough to it to see in - whichever side it is on
function setAreaVisibility(ca, cam) {
  const near = Math.min(16, renderDist());
  World.areas.forEach((A, i) => {
    let v = i === ca;
    if (!v && Math.abs(i - ca) === 1) {
      if (!cam) v = true;
      else {
        const m = A.meta, dx = Math.max(m.offX - 1 - cam.x, 0, cam.x - (m.offX + m.w + 1)), dz = Math.max(m.offZ - 1 - cam.z, 0, cam.z - (m.offZ + m.h + 1));
        v = Math.hypot(dx, dz) < near;
      }
    }
    A.group.visible = v;
  });
}

function updateAtmosphere(dt, ca) {
  const th = World.areas[ca] ? World.areas[ca].theme : THEMES.dock;
  _tmpC.setHex(th.fog[0]);
  R.fogColor.lerp(_tmpC, 1 - Math.exp(-dt * 1.5));
  R.fogDensity = damp(R.fogDensity, Math.max(th.fog[1], 2.3 / renderDist()), 1.5, dt);
  R.scene.fog.color.copy(R.fogColor); R.scene.fog.density = R.fogDensity;
  R.scene.background.copy(R.fogColor);
  // somewhere blacked out there is no ambient light at all until the power is back: your torch is all there is
  const G = World.lightGroups[ca], lit = th.blackout && G ? (G.circuit.powered ? 1 : 0) : 1;
  R.hemi.color.setHex(th.amb[0]); R.hemi.groundColor.setHex(th.amb[1]); R.hemi.intensity = damp(R.hemi.intensity, th.amb[2] * lit, lit ? 0.8 : 3, dt);
  R.dust.material.uniforms.density.value = th.mist ? 2.2 : 1;
  R.mist = damp(R.mist || 0, th.mist ? 1 : th.haze || 0.4, 1.5, dt);
}
const _tmpC = new THREE.Color();

let frameTimes = [], scaleTimer = 0;
function adaptResolution(dt) {
  if (R.fixedScale) return;
  frameTimes.push(dt);
  scaleTimer += dt;
  if (scaleTimer < 1.5) return;
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  frameTimes = []; scaleTimer = 0;
  const before = R.scale;
  const top = gfxPreset().scaleMax;
  if (avg > 0.026) R.scale = Math.max(Math.min(TOUCH_DEVICE ? 0.4 : 0.5, top), R.scale - 0.1);
  else if (avg < 0.0145) R.scale = Math.min(top, R.scale + 0.05);
  else if (R.scale > top) R.scale = top;
  if (R.scale !== before) applyRenderScale();
}

function blurInto(src, dst, tmp, sx, sy) {
  const r = R.renderer;
  R.quad.material = R.blurMat;
  R.blurMat.uniforms.tInput.value = src.texture; R.blurMat.uniforms.dir.value.set(sx, 0);
  r.setRenderTarget(tmp); r.render(R.quadScene, R.quadCam);
  R.blurMat.uniforms.tInput.value = tmp.texture; R.blurMat.uniforms.dir.value.set(0, sy);
  r.setRenderTarget(dst); r.render(R.quadScene, R.quadCam);
}

function renderFrame(t, dt = 0.016) {
  const r = R.renderer, u = R.compMat.uniforms;
  // flashlight cones and eyes that slowly get used to the dark
  const fp = R.flashPower;
  R.flash.intensity = LUX.flashHot * fp;
  R.flashSpill.intensity = LUX.flashSpill * fp;
  R.haze = damp(R.haze, fp * clamp(R.flashThrow / 9, 0, 1) * (0.006 + 0.02 * (R.mist || 0)), 6, dt);
  R.dust.material.uniforms.time.value = t;
  R.dust.material.uniforms.camPos.value.copy(R.camera.position);
  R.flash.getWorldPosition(R.dust.material.uniforms.flashPos.value);
  R.camera.getWorldDirection(R.dust.material.uniforms.flashDir.value);
  R.dust.material.uniforms.flashOn.value = fp > 0.3 ? 1 : 0;
  if (R.debris) {
    updateDebris(dt);
    const du = R.debris.material.uniforms;
    du.flashK.value = fp; du.pxScale.value = R.rtScene.height * 0.5 / Math.tan(R.camera.fov * Math.PI / 360);
  }
  r.setRenderTarget(R.rtScene);
  r.render(R.scene, R.camera);
  // hands on top, lit by what the beam bounces back and by the room's own glow
  R.vmCam.projectionMatrix.copy(R.camera.projectionMatrix); R.vmCam.projectionMatrixInverse.copy(R.camera.projectionMatrixInverse);
  const near = clamp(1 - (R.flashThrow - 0.4) / 6, 0, 1);
  R.vmFront.intensity = fp * (0.12 + 1.6 * near * near);
  R.vmTop.intensity = 0.1 + R.vmGlow * 0.5;
  R.vmHemi.intensity = R.hemi.intensity * 0.8;
  r.autoClear = false; r.clearDepth(); r.render(R.vmScene, R.vmCam); r.autoClear = true;
  if (R.autoOn) {
    R.quad.material = R.lumMat; R.lumMat.uniforms.tInput.value = R.rtScene.texture; R.lumMat.uniforms.texel.value.set(0.25 / 64, 0.25 / 64);
    r.setRenderTarget(R.lumRT); r.render(R.quadScene, R.quadCam);
    const prev = R.adaptRT[R.adaptI], next = R.adaptRT[1 - R.adaptI];
    R.quad.material = R.adaptMat; R.adaptMat.uniforms.tPrev.value = prev.texture; R.adaptMat.uniforms.dt.value = Math.min(dt, 0.1);
    r.setRenderTarget(next); r.render(R.quadScene, R.quadCam);
    R.adaptI = 1 - R.adaptI; R.autoU.tAdapt.value = next.texture;
  }
  // bloom: bright pass, then three blurred levels (skipped entirely on the lowest setting)
  const B = R.bloomRT, bloomOn = gfxPreset().bloom > 0;
  if (bloomOn || !R.bloomCleared) {
    R.quad.material = R.brightMat; R.brightMat.uniforms.tInput.value = R.rtScene.texture; R.brightMat.uniforms.exposure.value = R.exposure;
    r.setRenderTarget(B[0].a); r.render(R.quadScene, R.quadCam);
    blurInto(B[0].a, B[0].a, B[0].b, 1 / B[0].a.width, 1 / B[0].a.height);
    blurInto(B[0].a, B[1].a, B[1].b, 1 / B[0].a.width, 1 / B[1].a.height);
    blurInto(B[1].a, B[2].a, B[2].b, 1 / B[1].a.width, 1 / B[2].a.height);
    R.bloomCleared = bloomOn ? false : true;
  }
  u.bloomStrength.value = bloomOn ? 0.5 : 0;
  R.quad.material = R.compMat;
  u.tScene.value = R.rtScene.texture; u.tBloom0.value = B[0].a.texture; u.tBloom1.value = B[1].a.texture; u.tBloom2.value = B[2].a.texture;
  u.time.value = t; u.exposure.value = R.exposure; u.fear.value = R.fear; u.flash.value = R.whiteFlash; u.fade.value = R.fade;
  R.bleed = Math.max(0, (R.bleed || 0) - dt * 0.7); u.bleed.value = clamp(R.bleed, 0, 1);
  u.haze.value = R.haze;
  r.setRenderTarget(null); r.render(R.quadScene, R.quadCam);
}
