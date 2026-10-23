// ================= audio: synthesized 3D sound, ambience, music, voices =================
const Sound = (() => {
  let ctx = null, master, sfx, music, amb, voiceBus, reverb, reverbSend, noise, comp;
  const S = { ready: false, chase: 0, beds: {}, breath: null, mic: null, micLevel: 0, voices: new Map(), musicNodes: null, nextBeat: 0, beat: 0, titleMusic: null };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = gain(0.9, comp);
    sfx = gain(1, master); music = gain(0.55, master); amb = gain(0.8, master); voiceBus = gain(1.2, master);
    noise = makeNoise(3);
    reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(2.8, 2.2);
    reverbSend = gain(0.35, reverb); reverb.connect(master);
    buildBeds();
    buildBreath();
    S.ready = true;
  }
  function gain(v, to) { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; }
  function makeNoise(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function makeImpulse(sec, decay) {
    const len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function panner(x, y, z, ref = 1.5, roll = 1.4) {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.maxDistance = 60; p.rolloffFactor = roll;
    setPos(p, x, y, z);
    return p;
  }
  function setPos(p, x, y, z) {
    // a position without a height (a point on the floor plan) sits at ear height
    x = Number.isFinite(x) ? x : 0; y = Number.isFinite(y) ? y : 1.5; z = Number.isFinite(z) ? z : 0;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
  }
  // route: a node into a 3D position (or straight to the bus), plus reverb
  function out(node, pos, bus = sfx, wet = 0.4) {
    let dest = bus;
    if (pos) { const p = panner(pos.x, pos.y, pos.z, pos.ref || 1.5, pos.roll || 1.4); p.connect(bus); dest = p; }
    node.connect(dest);
    if (wet > 0) { const w = gain(wet, reverbSend); node.connect(w); }
  }
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function noiseHit(t, dur, type, freq, q, vol, pos, wet = 0.3, bus) {
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = gain(0);
    env(g, t, 0.004, vol, 0, dur);
    src.connect(f); f.connect(g); out(g, pos, bus, wet);
    src.start(t, Math.random() * 2); src.stop(t + dur + 0.1);
  }
  function tone(t, freq, dur, type, vol, pos, slideTo, wet = 0.2, bus, attack = 0.008) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = gain(0); env(g, t, attack, vol, 0, dur);
    o.connect(g); out(g, pos, bus, wet);
    o.start(t); o.stop(t + attack + dur + 0.1);
  }
  const now = () => ctx.currentTime;

  // ---------- ambience beds ----------
  function buildBeds() {
    const bed = (fn) => { const g = gain(0, amb); fn(g); return g; };
    S.beds.drone = bed((g) => {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.connect(g);
      for (const f of [41.2, 43.7, 82.4]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const og = gain(0.05, lp); o.connect(og); o.start(); }
    });
    S.beds.hum = bed((g) => { for (const [f, v] of [[60, 0.05], [120, 0.03], [180, 0.012]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(gain(v, g)); o.start(); } });
    const loopNoise = (type, freq, q, vol, g) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f); f.connect(gain(vol, g)); s.start(); return f; };
    S.beds.air = bed((g) => loopNoise('bandpass', 420, 0.5, 0.06, g));
    S.beds.water = bed((g) => { loopNoise('lowpass', 500, 0.7, 0.16, g); loopNoise('bandpass', 1800, 2, 0.02, g); });
    S.beds.fans = bed((g) => { loopNoise('lowpass', 1400, 0.4, 0.09, g); const o = ctx.createOscillator(); o.frequency.value = 118; o.connect(gain(0.02, g)); o.start(); });
    S.beds.wind = bed((g) => { const f = loopNoise('bandpass', 380, 1.2, 0.08, g); S.windFilter = f; });
    S.beds.machine = bed((g) => { loopNoise('lowpass', 220, 1, 0.14, g); for (const f of [50, 100]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(gain(0.006, g)); o.start(); } });
  }
  const THEME_BEDS = {
    dock: { drone: 0.6, air: 0.5, machine: 0.15 }, office: { drone: 0.45, hum: 0.7, air: 0.3 }, lab: { drone: 0.4, hum: 0.5, air: 0.4, water: 0.08 },
    cold: { drone: 0.5, wind: 0.7, fans: 0.3 }, server: { drone: 0.35, fans: 0.9, hum: 0.4 }, tunnel: { drone: 0.6, air: 0.6, water: 0.25 },
    pump: { drone: 0.5, water: 0.9, machine: 0.5 }, contain: { drone: 0.7, hum: 0.3, air: 0.4 }, generator: { drone: 0.6, machine: 0.6, air: 0.3 },
    lift: { drone: 0.7, wind: 0.5, air: 0.3 }, title: { drone: 0.8, air: 0.6 }, elevator: { drone: 0.5, machine: 0.8 }, silent: {},
    landing: { drone: 0.55, air: 0.25, wind: 0.2 }, ward: { drone: 0.6, air: 0.3, water: 0.05 }, dayroom: { drone: 0.5, air: 0.35, wind: 0.25 }, oldwing: { drone: 0.7, wind: 0.35 },
    bunker: { drone: 0.55, hum: 0.35, air: 0.4 }, decon: { drone: 0.45, hum: 0.3, water: 0.2, air: 0.3 }, barracks: { drone: 0.5, hum: 0.25, air: 0.35 }, command: { drone: 0.45, hum: 0.5, fans: 0.3 },
    silo: { drone: 0.7, wind: 0.45, air: 0.4, machine: 0.15 }, surface: { wind: 1.0, drone: 0.25 },
  };
  function setTheme(name, extra = {}) {
    if (!ctx) return;
    const want = Object.assign({}, THEME_BEDS[name] || {}, extra);
    for (const k in S.beds) S.beds[k].gain.setTargetAtTime(want[k] || 0, now(), 1.2);
    S.theme = name;
  }

  // ---------- the creature ----------
  function buildBreath() {
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 1.2;
    const g = gain(0);
    const p = panner(0, 0, 0, 3.0, 1.2);
    src.connect(f); f.connect(g); g.connect(p); p.connect(sfx); g.connect(gain(0.3, reverbSend));
    src.start();
    const growl = ctx.createOscillator(); growl.type = 'sawtooth'; growl.frequency.value = 38;
    const gf = ctx.createBiquadFilter(); gf.type = 'bandpass'; gf.frequency.value = 260; gf.Q.value = 2.5;
    const gg = gain(0); growl.connect(gf); gf.connect(gg); gg.connect(p); growl.start();
    S.breath = { g, f, p, gg, growl, phase: 0, nextClick: 2 };
  }
  function updateCreature(dt, pos, mode, visible) {
    if (!ctx || !S.breath) return;
    const B = S.breath;
    setPos(B.p, pos.x, pos.y, pos.z);
    B.phase += dt * (mode === 'run' ? 1.8 : 0.3);
    const cyc = Math.sin(B.phase * Math.PI * 2);
    const v = visible ? (mode === 'run' ? 0.65 : 0.38) * (0.3 + 0.7 * Math.max(0, cyc)) : 0;
    B.g.gain.setTargetAtTime(v, now(), 0.08);
    B.f.frequency.setTargetAtTime(cyc > 0 ? 440 : 250, now(), 0.15);
    B.gg.gain.setTargetAtTime(visible && (mode === 'run' || mode === 'reach') ? 0.3 : visible ? 0.06 : 0, now(), 0.2);
    B.growl.frequency.setTargetAtTime(34 + Math.random() * 8, now(), 0.05);
    if (visible) {
      B.nextClick -= dt;
      if (B.nextClick <= 0) { B.nextClick = 1.2 + Math.random() * (mode === 'run' ? 1.5 : 5); clicks(pos); }
    }
  }
  function clicks(pos) {
    const t = now(), n = 3 + Math.floor(Math.random() * 5), base = 2200 + Math.random() * 1600;
    for (let i = 0; i < n; i++) noiseHit(t + i * (0.055 + Math.random() * 0.04), 0.018, 'bandpass', base * (1 + (Math.random() - 0.5) * 0.2), 9, 0.9, pos, 0.5);
  }
  function scream(pos) {
    if (!ctx) return;
    const t = now(), dur = 2.1;
    const g = gain(0); env(g, t, 0.06, 0.7, dur - 0.8, 0.7);
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 4); }
    shaper.curve = curve; shaper.connect(g);
    for (const [ff, q, v] of [[560, 6, 1.0], [980, 7, 0.75], [2300, 8, 0.45]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q;
      bp.frequency.setValueAtTime(ff * 0.7, t); bp.frequency.exponentialRampToValueAtTime(ff * 1.25, t + 0.5); bp.frequency.exponentialRampToValueAtTime(ff, t + dur);
      const bg = gain(v, shaper); bp.connect(bg);
      for (const det of [0, 7, -11]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(96 + det, t); o.frequency.exponentialRampToValueAtTime(250 + det * 2, t + 0.45); o.frequency.exponentialRampToValueAtTime(150 + det, t + dur);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 7 + Math.random() * 4; const lg = gain(28); lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.2);
        o.connect(bp); o.start(t); o.stop(t + dur + 0.2);
      }
    }
    out(g, pos, sfx, 0.7);
    noiseHit(t, 1.6, 'bandpass', 2400, 0.8, 0.35, pos, 0.6);
  }
  function creatureStep(kind, pos) {
    if (!ctx) return;
    const t = now();
    // something that weighs a tonne putting a limb down
    if (kind === 'foot' || kind === 'hand') {
      noiseHit(t, 0.38, 'lowpass', 120, 1, 1.3, pos, 0.5); tone(t, 44, 0.42, 'sine', 0.8, pos, 24, 0.4);
      noiseHit(t + 0.01, 0.08, 'bandpass', 380, 1.5, 0.5, pos, 0.4);
      if (Math.random() < 0.3) for (let i = 0; i < 5; i++) noiseHit(t + 0.08 + Math.random() * 0.3, 0.03, 'bandpass', 2000 + Math.random() * 2000, 3, 0.12, pos, 0.4);
    } else if (kind === 'slap') { noiseHit(t, 0.12, 'bandpass', 700, 1.1, 1.0, pos, 0.5); tone(t, 70, 0.2, 'sine', 0.35, pos, 40, 0.3); }
    if (Math.random() < 0.18) { const n = 4 + Math.floor(Math.random() * 6); for (let i = 0; i < n; i++) noiseHit(t + 0.05 + i * (0.02 + Math.random() * 0.03), 0.01, 'highpass', 2600, 1, 0.55, pos, 0.3); }
  }

  // ---------- the Chud ----------
  // Every step it takes is a bang: a body that size coming down on one foot. The floor booms, the flesh slaps,
  // and everything loose in the room rattles after it. It carries a long way.
  function chudStep(pos, power = 1, felt = 0) {
    if (!ctx) return;
    const t = now(), P = far(pos, 8, 0.85), v = clamp(power, 0.4, 1.4);
    duck(0.35 * v, 0.05, 0.5);
    noiseHit(t, 0.75, 'lowpass', 130, 1, 2.0 * v, P, 0.9); tone(t, rr(40, 46), 0.8, 'sine', 1.6 * v, P, 23, 0.6);
    noiseHit(t + 0.004, 0.14, 'bandpass', rr(420, 560), 1.4, 0.9 * v, P, 0.6);
    tone(t + 0.01, rr(95, 120), 0.3, 'triangle', 0.35 * v, P, 55, 0.5);
    for (let i = 0; i < 12; i++) noiseHit(t + 0.06 + Math.random() * 0.7, rr(0.012, 0.035), 'bandpass', rr(1800, 5200), 4, rr(0.05, 0.16) * v, P, 0.4);
    if (Math.random() < 0.5) { const f = rr(240, 700); tone(t + 0.03, f, 0.6, 'triangle', 0.05 * v, P, f * 0.97, 0.5); }
    if (felt > 0) { tone(t, 31, 0.7, 'sine', 1.1 * felt, null, 20, 0); noiseHit(t, 0.5, 'lowpass', 70, 1, 1.2 * felt, null, 0); }
  }
  // a grunt: short, wet, from deep in all that chest
  function chudGrunt(pos, big = false) {
    if (!ctx) return;
    const t = now(), P = far(pos, 5, 1.0), dur = big ? 1.1 : rr(0.35, 0.6);
    const g = gain(0); env(g, t, 0.04, big ? 0.9 : 0.55, dur * 0.5, dur * 0.5);
    const shaper = ctx.createWaveShaper(); const curve = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; curve[i] = Math.tanh(x * 3); } shaper.curve = curve; shaper.connect(g);
    const f0 = rr(62, 82) * (big ? 0.85 : 1);
    for (const [ff, q, vol] of [[rr(280, 360), 4, 1.0], [rr(620, 760), 6, 0.5], [rr(1500, 1900), 8, 0.18]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q; bp.connect(gain(vol, shaper));
      for (const det of [0, 4]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 + det, t); o.frequency.exponentialRampToValueAtTime((f0 + det) * (big ? 0.7 : 0.82), t + dur); o.connect(bp); o.start(t); o.stop(t + dur + 0.1); }
    }
    out(g, P, sfx, 0.55);
    noiseHit(t, dur * 0.8, 'bandpass', rr(500, 900), 1.2, big ? 0.35 : 0.2, P, 0.4);
  }
  // its breathing, always: a slow wheeze in through the mouth and a long rattling sigh out
  function chudBreath(pos, on, rate = 1) {
    if (!ctx) return;
    if (!S.chudB) {
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 1.4;
      const g = gain(0), p = panner(0, 0, 0, 3.5, 1.1);
      src.connect(f); f.connect(g); g.connect(p); p.connect(sfx); g.connect(gain(0.35, reverbSend)); src.start();
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 48; const of = ctx.createBiquadFilter(); of.type = 'bandpass'; of.frequency.value = 240; of.Q.value = 3;
      const og = gain(0); o.connect(of); of.connect(og); og.connect(p); o.start();
      S.chudB = { g, f, p, og, ph: 0 };
    }
    const B = S.chudB;
    setPos(B.p, pos.x, pos.y, pos.z);
    B.ph += 0.016 * 0.28 * rate;
    const c = Math.sin(B.ph * Math.PI * 2), inh = c > 0;
    B.g.gain.setTargetAtTime(on ? (inh ? 0.22 : 0.34) * Math.abs(c) : 0, now(), 0.1);
    B.f.frequency.setTargetAtTime(inh ? 950 : 420, now(), 0.2);
    B.og.gain.setTargetAtTime(on && !inh ? 0.12 * Math.abs(c) : 0, now(), 0.15);
  }

  // ---------- people and things ----------
  function step(surface, run, pos, vol = 1) {
    if (!ctx) return;
    const t = now(), v = (run ? 0.5 : 0.28) * vol;
    if (surface === 'water') { noiseHit(t, 0.28, 'bandpass', 900, 0.7, v * 1.3, pos, 0.3); noiseHit(t + 0.05, 0.2, 'lowpass', 300, 1, v * 0.8, pos, 0.2); }
    else if (surface === 'grate') { noiseHit(t, 0.07, 'bandpass', 1300, 3, v, pos, 0.3); tone(t, 880 + Math.random() * 300, 0.08, 'triangle', v * 0.15, pos, 0, 0.3); }
    else if (surface === 'carpet') noiseHit(t, 0.06, 'lowpass', 380, 0.8, v * 0.7, pos, 0.1);
    else noiseHit(t, 0.07, 'bandpass', 420 + Math.random() * 160, 1.1, v, pos, 0.25);
  }
  function play(name, pos) {
    if (!ctx) return;
    const t = now();
    switch (name) {
      case 'pickup': tone(t, 880, 0.1, 'triangle', 0.15, pos); tone(t + 0.07, 1320, 0.18, 'triangle', 0.1, pos); noiseHit(t, 0.05, 'highpass', 3000, 1, 0.1, pos); break;
      case 'beep': tone(t, 1200, 0.08, 'square', 0.06, pos, 0, 0.1); tone(t + 0.12, 1600, 0.12, 'square', 0.06, pos, 0, 0.1); break;
      case 'deny': tone(t, 220, 0.25, 'square', 0.07, pos, 0, 0.1); break;
      case 'door': noiseHit(t, 1.2, 'bandpass', 300, 0.8, 0.5, pos, 0.5); tone(t, 70, 1.0, 'sawtooth', 0.08, pos, 55, 0.3); noiseHit(t + 1.1, 0.3, 'lowpass', 200, 1, 0.8, pos, 0.5); break;
      case 'creak': for (let i = 0; i < 3; i++) tone(t + i * 0.18, 180 + Math.random() * 120, 0.16, 'sawtooth', 0.05, pos, 120, 0.4); break;
      case 'snap': noiseHit(t, 0.12, 'highpass', 1800, 1, 0.8, pos, 0.5); noiseHit(t, 0.4, 'lowpass', 400, 1, 0.5, pos, 0.5); break;
      case 'boardsFall': for (let i = 0; i < 3; i++) { noiseHit(t + i * 0.2, 0.25, 'lowpass', 500, 1, 0.6, pos, 0.5); tone(t + i * 0.2, 140, 0.2, 'triangle', 0.15, pos, 90); } break;
      case 'valve': { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(420, t); o.frequency.linearRampToValueAtTime(380 + Math.random() * 120, t + 0.6);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 12; const g = gain(0); env(g, t, 0.05, 0.12, 0.4, 0.2);
        o.connect(bp); bp.connect(g); out(g, pos, sfx, 0.4); o.start(t); o.stop(t + 0.8); break; }
      case 'hack': for (let i = 0; i < 6; i++) tone(t + i * 0.07, 600 + Math.random() * 1200, 0.05, 'square', 0.04, pos, 0, 0.1); break;
      case 'fuse': noiseHit(t, 0.05, 'highpass', 2000, 1, 0.3, pos); tone(t + 0.04, 150, 0.15, 'sine', 0.2, pos, 90); break;
      case 'power': tone(t, 40, 3.5, 'sawtooth', 0.18, pos, 120, 0.5, sfx, 0.6); noiseHit(t, 3.5, 'bandpass', 600, 0.6, 0.2, pos, 0.5); tone(t + 3.2, 880, 0.6, 'sine', 0.12, null); break;
      case 'alarm': for (let i = 0; i < 8; i++) tone(t + i * 0.5, i % 2 ? 620 : 820, 0.42, 'square', 0.05, pos, 0, 0.5); break;
      case 'liftArrive': tone(t, 60, 2.5, 'sawtooth', 0.2, pos, 45, 0.5); noiseHit(t + 2.4, 0.6, 'lowpass', 180, 1, 1, pos, 0.6); tone(t + 2.8, 1175, 0.8, 'sine', 0.15, pos); break;
      case 'heart': tone(t, 58, 0.16, 'sine', 0.35, null, 40, 0); tone(t + 0.2, 52, 0.2, 'sine', 0.28, null, 38, 0); break;
      case 'sting': for (const f of [740, 783, 1046]) tone(t, f, 1.4, 'sawtooth', 0.05, null, f * 1.06, 0.6, music, 0.01); noiseHit(t, 0.5, 'highpass', 4000, 1, 0.2, null, 0.5, music); break;
      case 'impact': tone(t, 90, 1.6, 'sine', 0.8, null, 30, 0.6, music); noiseHit(t, 1.2, 'lowpass', 300, 1, 0.9, null, 0.8, music); tone(t, 220, 2, 'triangle', 0.08, null, 207, 0.8, music); break;
      case 'grab': noiseHit(t, 0.9, 'bandpass', 900, 0.5, 1, null, 0.6); tone(t, 110, 1.0, 'sawtooth', 0.4, null, 40, 0.5); break;
      case 'thud': noiseHit(t, 0.5, 'lowpass', 150, 1, 1.2, pos, 0.6); tone(t, 55, 0.5, 'sine', 0.8, pos, 30, 0.5); break;
      case 'scrape': { const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
        f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1500, t + 2.2); const g = gain(0); env(g, t, 0.2, 0.5, 1.6, 0.6);
        src.connect(f); f.connect(g); out(g, pos, sfx, 0.6); src.start(t); src.stop(t + 2.8); break; }
      case 'clunk': noiseHit(t, 0.3, 'lowpass', 260, 1, 0.9, pos, 0.5); tone(t, 140, 0.25, 'triangle', 0.2, pos, 70, 0.4); break;
      case 'radio': for (let i = 0; i < 14; i++) noiseHit(t + i * 0.11 + Math.random() * 0.05, 0.09, 'bandpass', 900 + Math.random() * 1200, 2, 0.08 + Math.random() * 0.06, null, 0.1); tone(t, 1800, 0.06, 'sine', 0.05, null); break;
      case 'click': tone(t, 1400, 0.03, 'square', 0.03, null, 0, 0); break;
      case 'drip': tone(t, 1700 + Math.random() * 600, 0.08, 'sine', 0.06, pos, 800, 0.6); break;
      case 'spark': for (let i = 0; i < 8; i++) noiseHit(t + i * 0.03 + Math.random() * 0.03, 0.02 + Math.random() * 0.04, 'highpass', 2600 + Math.random() * 3400, 1, 0.08 + Math.random() * 0.1, pos, 0.3); tone(t, 118, 0.3, 'sawtooth', 0.035, pos, 116, 0.2); break;
      case 'groan': { const o = ctx.createOscillator(); o.type = 'sawtooth'; const f0 = 52 + Math.random() * 40;
        o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (0.75 + Math.random() * 0.55), t + 2.0);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7; bp.frequency.setValueAtTime(260 + Math.random() * 380, t); bp.frequency.linearRampToValueAtTime(150 + Math.random() * 80, t + 2.0);
        const g = gain(0); env(g, t, 0.5, 0.1, 1.1, 0.6); o.connect(bp); bp.connect(g); out(g, pos, sfx, 0.8); o.start(t); o.stop(t + 2.4); break; }
      case 'gate': for (let i = 0; i < 22; i++) noiseHit(t + i * 0.055 + Math.random() * 0.03, 0.03 + Math.random() * 0.05, 'bandpass', 1800 + Math.random() * 2600, 4, 0.1 + Math.random() * 0.12, pos, 0.4);
        noiseHit(t, 1.3, 'lowpass', 300, 1, 0.25, pos, 0.5); noiseHit(t + 1.25, 0.2, 'bandpass', 900, 3, 0.5, pos, 0.5); break;
      case 'knock': noiseHit(t, 0.4, 'bandpass', 180 + Math.random() * 120, 8, 0.25, pos, 0.7); break;
      // a body driven into concrete: the floor takes it, something in the body gives, the room answers
      case 'slam': noiseHit(t, 0.7, 'lowpass', 110, 1, 1.6, pos, 0.9); tone(t, 46, 0.7, 'sine', 1.0, pos, 26, 0.45);
        noiseHit(t + 0.01, 0.16, 'bandpass', 700 + Math.random() * 500, 3, 0.7, pos, 0.5);
        noiseHit(t + 0.015, 0.09, 'highpass', 2400, 1, 0.3, pos, 0.4);
        tone(t + 0.02, 150 + Math.random() * 60, 0.3, 'triangle', 0.3, pos, 60, 0.5); break;
      // hauled over a floor: grit and a loose, heavy weight that keeps catching
      case 'drag': { const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(420, t); f.frequency.linearRampToValueAtTime(260, t + 1.5);
        const g = gain(0); env(g, t, 0.08, 0.5, 1.1, 0.35); src.connect(f); f.connect(g); out(g, pos, sfx, 0.55); src.start(t); src.stop(t + 1.9); break; }
      case 'bump': noiseHit(t, 0.22, 'lowpass', 230, 1, 0.55, pos, 0.5); tone(t, 90 + Math.random() * 40, 0.16, 'triangle', 0.22, pos, 50, 0.4); break;
      // joints forced past where they should go, to fold through a gap too small for it
      case 'crack': for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
          const ct = t + i * (0.05 + Math.random() * 0.09);
          noiseHit(ct, 0.045, 'bandpass', 1500 + Math.random() * 2200, 9, 0.45, pos, 0.35);
          tone(ct, 220 + Math.random() * 180, 0.07, 'square', 0.1, pos, 90, 0.3);
        }
        noiseHit(t + 0.02, 0.5, 'lowpass', 190, 1, 0.4, pos, 0.5); break;
      // a two-note whistle through the teeth: up, and down - the kind that carries across a building
      case 'whistle': {
        const P = pos ? { x: pos.x, y: pos.y, z: pos.z, ref: 6, roll: 0.9 } : null;
        const notes = [[t, 1350, 1950, 0.2], [t + 0.27, 1950, 1250, 0.42]];
        for (const [nt, f0, f1, d] of notes) {
          const o = ctx.createOscillator(); o.type = 'sine';
          o.frequency.setValueAtTime(f0, nt); o.frequency.exponentialRampToValueAtTime(f1, nt + d * 0.8);
          const vib = ctx.createOscillator(); vib.frequency.value = 6.5; const vg = gain(f0 * 0.012); vib.connect(vg); vg.connect(o.frequency);
          const g = gain(0); env(g, nt, 0.025, 0.32, d * 0.55, d * 0.35);
          o.connect(g); out(g, P, sfx, 0.55); o.start(nt); o.stop(nt + d + 0.1); vib.start(nt); vib.stop(nt + d + 0.1);
          noiseHit(nt, d, 'bandpass', (f0 + f1) / 2, 4, 0.05, P, 0.4);
        }
        break; }
      // a heavy lever slammed home, and one springing back
      case 'leverDown': noiseHit(t, 0.25, 'lowpass', 300, 1, 1.1, pos, 0.6); tone(t, 95, 0.3, 'triangle', 0.4, pos, 55, 0.5); noiseHit(t + 0.01, 0.06, 'bandpass', 2400, 3, 0.5, pos, 0.4); break;
      case 'leverUp': noiseHit(t, 0.12, 'bandpass', 1800, 3, 0.6, pos, 0.4); tone(t, 140, 0.4, 'triangle', 0.3, pos, 260, 0.4); noiseHit(t + 0.12, 0.3, 'lowpass', 260, 1, 0.9, pos, 0.6); break;
      // a ratchet counting down: a hard tick that carries down the tunnels
      case 'ratchet': { const P = pos && { x: pos.x, y: pos.y, z: pos.z, ref: 5, roll: 0.9 };
        noiseHit(t, 0.03, 'bandpass', 2800, 5, 0.42, P, 0.6); tone(t, 620, 0.05, 'square', 0.05, P, 300, 0.4); noiseHit(t, 0.08, 'lowpass', 400, 1, 0.25, P, 0.5); break; }
      // ---- its lair ----
      // a nail on a steel louvre: thin, bright, patient
      case 'tick': { const P = pos && { x: pos.x, y: pos.y, z: pos.z, ref: 3, roll: 1.1 };
        noiseHit(t, 0.02, 'bandpass', 4200 + Math.random() * 1500, 6, 0.32, P, 0.4);
        const f = 1900 + Math.random() * 500; tone(t, f, 0.35, 'sine', 0.05, P, f * 0.99, 0.5); tone(t, f * 2.71, 0.18, 'sine', 0.02, P, 0, 0.5); break; }
      // a heavy steel cover struck from behind: the thump of it, every louvre in it ringing, the bolts complaining
      case 'ventHit': { const P = pos && { x: pos.x, y: pos.y, z: pos.z, ref: 7, roll: 1.0 };
        noiseHit(t, 0.5, 'lowpass', 160, 1, 1.6, P, 0.9); tone(t, 58, 0.6, 'sine', 1.2, P, 34, 0.6);
        noiseHit(t, 0.3, 'bandpass', 520 + Math.random() * 120, 2.5, 1.1, P, 0.8);
        for (const f of [311, 487, 733, 1149]) { const ff = f * (0.94 + Math.random() * 0.12); tone(t + 0.005, ff, 0.9 + Math.random() * 0.5, 'triangle', 0.09, P, ff * 0.985, 0.7); }
        for (let i = 0; i < 9; i++) noiseHit(t + 0.04 + i * (0.03 + Math.random() * 0.03), 0.03, 'bandpass', 2200 + Math.random() * 2400, 5, 0.18 * (1 - i / 10), P, 0.5);
        noiseHit(t + 0.08, 0.25, 'bandpass', 1300, 9, 0.22, P, 0.5); break; }
      // and torn off: bolts going like gunshots, the shriek of steel giving, the whole wall answering
      case 'ventBurst': { const P = pos && { x: pos.x, y: pos.y, z: pos.z, ref: 9, roll: 0.95 };
        for (let i = 0; i < 4; i++) { const bt = t + i * (0.025 + Math.random() * 0.035); noiseHit(bt, 0.06, 'highpass', 2600, 1, 0.9, P, 0.6); tone(bt, 1400 + Math.random() * 900, 0.08, 'square', 0.12, P, 500, 0.4); }
        noiseHit(t, 0.9, 'lowpass', 140, 1, 2.2, P, 1.0); tone(t, 44, 1.1, 'sine', 1.6, P, 24, 0.6);
        { const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 11;
          f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.18); f.frequency.exponentialRampToValueAtTime(700, t + 0.7);
          const g = gain(0); env(g, t, 0.01, 1.2, 0.15, 0.55); src.connect(f); f.connect(g); out(g, P, sfx, 0.8); src.start(t); src.stop(t + 0.9); }
        for (const f of [233, 389, 641, 977]) tone(t + 0.01, f, 1.6, 'triangle', 0.1, P, f * 0.97, 0.8);
        for (let i = 0; i < 18; i++) noiseHit(t + 0.1 + Math.random() * 1.1, 0.02 + Math.random() * 0.04, 'bandpass', 1800 + Math.random() * 3600, 4, 0.08 + Math.random() * 0.14, P, 0.4);
        duck(0.5, 0.1, 1.0); break; }
      // ---- the lift losing power ----
      // a lamp's ballast arcing: an angry mains buzz that comes and goes
      case 'buzz': { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.1;
        const g = gain(0); g.gain.setValueAtTime(0.0001, t);
        for (let k = 0; k < 14; k++) { const kt = t + k * 0.11 + Math.random() * 0.04; g.gain.setValueAtTime(Math.random() < 0.6 ? 0.07 + Math.random() * 0.06 : 0.004, kt); }
        g.gain.setValueAtTime(0.0001, t + 1.7);
        o.connect(bp); bp.connect(g); out(g, pos, sfx, 0.3); o.start(t); o.stop(t + 1.8);
        for (let i = 0; i < 6; i++) noiseHit(t + Math.random() * 1.5, 0.02, 'highpass', 3500, 1, 0.12, pos, 0.2);
        break; }
      // one stutter of it: the tick of the filament and a stab of buzz
      case 'flick': noiseHit(t, 0.015, 'highpass', 4200, 1, 0.22, pos, 0.2); tone(t, 100, 0.07, 'sawtooth', 0.05, pos, 96, 0.2); noiseHit(t + 0.01, 0.06, 'bandpass', 1600, 2, 0.06, pos, 0.2); break;
      // the motor dropping out: the contactor letting go, the hum winding down to nothing
      case 'powerDown': { noiseHit(t, 0.2, 'lowpass', 300, 1, 0.9, pos, 0.5); tone(t, 210, 0.12, 'triangle', 0.25, pos, 120, 0.4);
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(18, t + 1.5);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(90, t + 1.5);
        const g = gain(0); env(g, t, 0.01, 0.32, 0.25, 1.2); o.connect(lp); lp.connect(g); out(g, pos, sfx, 0.4); o.start(t); o.stop(t + 1.7);
        break; }
      // the car falling the last of the slack: the guides shrieking in their rails as the safeties start to grab
      case 'brakes': { const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 14;
        f.frequency.setValueAtTime(1900, t); f.frequency.exponentialRampToValueAtTime(3300, t + 0.45);
        const g = gain(0); env(g, t, 0.05, 0.75, 0.3, 0.12); src.connect(f); f.connect(g); out(g, pos, sfx, 0.5); src.start(t, Math.random()); src.stop(t + 0.6);
        tone(t, 1250, 0.45, 'sawtooth', 0.04, pos, 1700, 0.4); noiseHit(t, 0.45, 'bandpass', 600, 1, 0.3, pos, 0.4);
        break; }
      // the safety brakes biting: four tonnes of car stopped dead. The boom of it through the whole shaft, the steel
      // ringing, everything loose in the car jumping, and a thump you take in through your feet
      case 'liftSlam': {
        noiseHit(t, 1.3, 'lowpass', 120, 1, 2.4, pos, 1.0); tone(t, 40, 1.4, 'sine', 2.0, pos, 21, 0.7);
        noiseHit(t, 0.4, 'bandpass', 260, 1.4, 1.6, pos, 0.9); tone(t + 0.004, 96, 0.5, 'triangle', 0.7, pos, 48, 0.6);
        for (let i = 0; i < 3; i++) noiseHit(t + i * 0.03, 0.08, 'highpass', 2200, 1, 0.7 - i * 0.18, pos, 0.6);
        for (const f of [173, 287, 412, 619, 883, 1307]) { const ff = f * (0.96 + Math.random() * 0.08); tone(t + 0.01, ff, 1.4 + Math.random() * 1.2, 'triangle', 0.075, pos, ff * 0.985, 0.9); }
        for (let i = 0; i < 26; i++) noiseHit(t + 0.06 + Math.random() * 1.4, 0.02 + Math.random() * 0.05, 'bandpass', 900 + Math.random() * 4200, 4, 0.06 + Math.random() * 0.16, pos, 0.5);
        tone(t, 30, 1.0, 'sine', 1.2, null, 19, 0); noiseHit(t, 0.8, 'lowpass', 70, 1, 1.3, null, 0);
        break; }
      // ---- the Chud at work ----
      // the jaw coming open further than a jaw should: a wet tearing, gristle creaking, the breath behind it
      case 'jawOpen': { const P = far(pos, 4, 1.1);
        const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
        f.frequency.setValueAtTime(620, t); f.frequency.exponentialRampToValueAtTime(230, t + 0.85);
        const g = gain(0); env(g, t, 0.15, 0.42, 0.4, 0.35); src.connect(f); f.connect(g); out(g, P, sfx, 0.5); src.start(t, Math.random()); src.stop(t + 1.1);
        for (let i = 0; i < 7; i++) { const ct = t + 0.1 + i * rr(0.08, 0.13); noiseHit(ct, 0.03, 'bandpass', rr(900, 2400), 7, 0.25, P, 0.3); tone(ct, rr(120, 220), 0.06, 'square', 0.06, P, 70, 0.3); }
        tone(t, 70, 0.9, 'sawtooth', 0.12, P, 52, 0.5);
        break; }
      // breath bubbling in its throat
      case 'gurgle': { const P = far(pos, 4, 1.1);
        for (let i = 0; i < 16; i++) { const ct = t + i * rr(0.03, 0.06), fq = rr(180, 520); tone(ct, fq, 0.05, 'sine', 0.14, P, fq * rr(1.3, 1.8), 0.4); }
        noiseHit(t, 0.8, 'lowpass', 300, 1, 0.5, P, 0.5); break; }
      // teeth closing through something: bone going, and wet
      case 'bite': { const P = far(pos, 5, 1.0);
        noiseHit(t, 0.08, 'highpass', 2200, 1, 1.0, P, 0.5);
        for (let i = 0; i < 6; i++) { const ct = t + 0.01 + i * rr(0.018, 0.04); noiseHit(ct, 0.04, 'bandpass', rr(1400, 3200), 8, 0.7, P, 0.4); tone(ct, rr(200, 420), 0.05, 'square', 0.14, P, 80, 0.3); }
        noiseHit(t + 0.02, 0.5, 'lowpass', 400, 1, 1.1, P, 0.6); tone(t, 60, 0.4, 'sine', 0.9, P, 30, 0.4);
        squelch(t + 0.05, P, 1.0); duck(0.7, 0.1, 0.8);
        break; }
      // a weight coming down on a chest
      case 'crunch': { const P = far(pos, 6, 1.0);
        for (let i = 0; i < 9; i++) { const ct = t + i * rr(0.01, 0.03); noiseHit(ct, 0.05, 'bandpass', rr(900, 2600), 6, 0.6, P, 0.4); tone(ct, rr(150, 360), 0.05, 'square', 0.12, P, 60, 0.3); }
        squelch(t + 0.03, P, 0.9);
        break; }
      case 'squelch': squelch(t, far(pos, 4, 1.1), 0.8); break;
      // an old desk phone ringing somewhere down the hall, two bursts, nobody answering
      case 'phoneRing': { const P = far(pos, 5, 1.0);
        for (let b = 0; b < 2; b++) for (let i = 0; i < 20; i++) { const st = t + b * 0.6 + i * 0.022; tone(st, 1020, 0.02, 'square', 0.035, P, 0, 0.5, sfx, 0.002); tone(st + 0.011, 1260, 0.02, 'square', 0.03, P, 0, 0.5, sfx, 0.002); }
        break; }
      // a castor that hasn't been oiled since the war, pushed a little way and stopped
      case 'squeak': { const P = far(pos, 4, 1.1), f0 = rr(1300, 1900);
        for (let i = 0; i < 3; i++) tone(t + i * rr(0.16, 0.24), f0 * rr(0.94, 1.08), rr(0.07, 0.13), 'sawtooth', 0.02, P, f0 * rr(1.05, 1.2), 0.5);
        break; }
      // a single key on an out-of-tune upright, held down until it dies
      case 'piano': { const P = far(pos, 5, 0.9), notes = [196, 220, 233, 262, 294, 311], f = notes[Math.floor(Math.random() * notes.length)];
        for (const [m, v, d] of [[1, 0.09, 3.2], [2.003, 0.035, 2.2], [3.01, 0.018, 1.5], [1.006, 0.06, 3.0]]) tone(t, f * m, d, 'triangle', v, P, f * m * 0.998, 0.75, sfx, 0.004);
        noiseHit(t, 0.03, 'bandpass', 2600, 2, 0.05, P, 0.4);
        break; }
      // ---------- the Pale ----------
      // bare feet: a quick soft slap, the toes after it
      case 'paleStep': { const P = far(pos, 3, 1.2);
        noiseHit(t, 0.05, 'bandpass', rr(900, 1300), 1.4, 0.32, P, 0.3); noiseHit(t + rr(0.03, 0.05), 0.03, 'bandpass', rr(1800, 2600), 2, 0.12, P, 0.2);
        tone(t, rr(85, 110), 0.08, 'sine', 0.12, P, 60, 0.2);
        break; }
      // the clicking in its throat: a dry rattle of teeth, fast, then a slower one
      case 'paleClick': { const P = far(pos, 4, 1.0), n = 5 + Math.floor(Math.random() * 7), gap = rr(0.035, 0.06);
        for (let i = 0; i < n; i++) { const st = t + i * gap * (1 + i * 0.06); noiseHit(st, 0.012, 'bandpass', rr(2400, 3600), 6, 0.22, P, 0.35); tone(st, rr(700, 900), 0.02, 'square', 0.02, P, 0, 0.3, sfx, 0.001); }
        break; }
      // when it sees you: a shriek like metal on metal, a breath drawn in through all those teeth
      case 'paleShriek': { const P = far(pos, 8, 0.85);
        duck(0.5, 0.1, 0.6);
        const g = gain(0); env(g, t, 0.03, 0.75, 0.5, 0.6);
        const shaper = ctx.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 5); } shaper.curve = curve; shaper.connect(g);
        for (const [f0, det] of [[rr(1150, 1350), 0], [rr(1550, 1750), 7], [rr(620, 700), -4]]) {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * 0.8, t); o.frequency.linearRampToValueAtTime(f0 * 1.08, t + 0.15); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 1.1);
          o.detune.value = det * 10;
          const lfo = ctx.createOscillator(); lfo.frequency.value = rr(28, 40); const lg = gain(f0 * 0.04); lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 1.2);
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 * 1.4; bp.Q.value = 2; o.connect(bp); bp.connect(gain(0.35, shaper)); o.start(t); o.stop(t + 1.2);
        }
        out(g, P, sfx, 0.7);
        noiseHit(t, 1.0, 'highpass', 3500, 1, 0.2, P, 0.6);
        break; }
      // a neck going: a wet crack, and the grind after it
      case 'neckSnap': { const P = far(pos, 5, 1.0);
        noiseHit(t, 0.03, 'highpass', 2600, 1, 1.1, P, 0.4); noiseHit(t, 0.09, 'bandpass', 900, 2, 0.9, P, 0.4); tone(t, 140, 0.12, 'triangle', 0.4, P, 60, 0.3);
        for (let i = 0; i < 6; i++) noiseHit(t + 0.05 + i * rr(0.02, 0.04), 0.02, 'bandpass', rr(1500, 3000), 4, 0.25, P, 0.3);
        squelch(t + 0.06, P, 0.6);
        break; }
      // ---------- the hatch ----------
      // a bunker klaxon: two tones, rasping, going round
      case 'klaxon': { const P = far(pos, 14, 0.7);
        for (let i = 0; i < 3; i++) { const st = t + i * 0.7; tone(st, 440, 0.32, 'sawtooth', 0.11, P, 430, 0.6); tone(st + 0.35, 330, 0.32, 'sawtooth', 0.11, P, 325, 0.6); }
        break; }
      // one of the hatch's locking dogs drawing back: a deep clank, a hiss of air
      case 'hatchBolt': { const P = far(pos, 16, 0.6);
        noiseHit(t, 0.4, 'lowpass', 220, 1, 1.4, P, 0.9); tone(t, 62, 0.6, 'sine', 0.9, P, 40, 0.7);
        for (const f of [180, 290, 470]) tone(t, f * rr(0.97, 1.03), 1.2, 'triangle', 0.05, P, f * 0.98, 0.8);
        noiseHit(t + 0.15, 1.1, 'highpass', 2200, 0.7, 0.25, P, 0.6);
        break; }
      // the hatch cracking open: steel grinding on steel, a rush of outside air
      case 'hatchOpen': { const P = far(pos, 20, 0.5);
        duck(0.7, 0.4, 2.0);
        { const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 7; f.frequency.setValueAtTime(180, t); f.frequency.linearRampToValueAtTime(420, t + 3);
          const g = gain(0); env(g, t, 0.2, 0.9, 2.2, 1.2); src.connect(f); f.connect(g); out(g, P, sfx, 0.8); src.start(t); src.stop(t + 4); }
        tone(t, 38, 3.6, 'sawtooth', 0.35, P, 52, 0.8);
        noiseHit(t + 0.8, 3.5, 'bandpass', 600, 0.4, 0.5, P, 0.7);
        break; }
      // something the size of a building, a long way off: a boom you feel in your chest
      case 'colossus': { const P = far(pos, 60, 0.3);
        duck(0.8, 0.5, 3.0);
        tone(t, 24, 4.0, 'sine', 1.4, P, 18, 0.9); tone(t, 36, 3.0, 'triangle', 0.5, P, 28, 0.9);
        noiseHit(t, 3.5, 'lowpass', 90, 1, 1.6, P, 0.95);
        noiseHit(t + 0.4, 4.0, 'bandpass', 320, 0.5, 0.25, P, 0.95);
        break; }
      // thunder: the crack of it overhead, and the long roll of it going away over the city
      case 'thunder': { const P = far(pos, 150, 0.15);
        noiseHit(t, 0.3, 'highpass', 700, 0.7, 0.8, P, 0.6);
        noiseHit(t + 0.04, 0.9, 'bandpass', 380, 0.6, 0.9, P, 0.8);
        noiseHit(t + 0.1, 4.2, 'lowpass', 150, 1, 1.5, P, 0.95);
        noiseHit(t + 0.8, 4.8, 'lowpass', 85, 1, 1.1, P, 0.95);
        tone(t + 0.05, 44, 3.2, 'sine', 0.7, P, 30, 0.9);
        break; }
      // its voice, if it is a voice: a moan so low it is mostly the ground shaking
      case 'colossusCall': { const P = far(pos, 80, 0.25);
        const g = gain(0); env(g, t, 1.2, 0.9, 2.5, 3.0);
        for (const [f, v] of [[31, 1], [46.5, 0.55], [62, 0.3], [93, 0.12]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.86, t + 6.5); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; o.connect(lp); lp.connect(gain(v * 0.35, g)); o.start(t); o.stop(t + 7); }
        out(g, P, sfx, 0.95);
        break; }
      // bones going in a fist the size of a car
      case 'crush': { const P = far(pos, 12, 0.7);
        for (let i = 0; i < 14; i++) noiseHit(t + i * rr(0.025, 0.06), rr(0.02, 0.06), 'bandpass', rr(700, 2600), 3, rr(0.3, 0.6), P, 0.5);
        noiseHit(t, 0.6, 'lowpass', 200, 1, 1.2, P, 0.6); tone(t, 70, 0.6, 'sine', 0.7, P, 35, 0.5);
        squelch(t + 0.1, P, 1); squelch(t + 0.35, P, 0.8);
        break; }
      // an old lift's bell: one brass ding as the car settles at a floor
      case 'bell': { const P = far(pos, 4, 1.0);
        for (const [m, v, d] of [[1, 0.12, 2.6], [2.76, 0.04, 1.4], [5.4, 0.015, 0.6]]) tone(t, 1175 * m, d, 'sine', v, P, 1175 * m * 0.998, 0.6, sfx, 0.003);
        noiseHit(t, 0.02, 'highpass', 3000, 1, 0.08, P, 0.3);
        break; }
      // the grandfather clock: a quarter chime, a little flat
      case 'chime': { const P = far(pos, 6, 0.8);
        [659, 523, 587, 392].forEach((f, i) => { tone(t + i * 0.7, f, 2.2, 'sine', 0.08, P, f * 0.997, 0.8); tone(t + i * 0.7, f * 2.76, 0.9, 'sine', 0.02, P, 0, 0.8); });
        break; }
      // a slab of steel coming down on concrete, and skidding
      case 'clatter': { const P = pos && { x: pos.x, y: pos.y, z: pos.z, ref: 7, roll: 1.0 };
        noiseHit(t, 0.35, 'lowpass', 240, 1, 1.4, P, 0.8); tone(t, 74, 0.4, 'sine', 0.8, P, 40, 0.5);
        for (const f of [271, 433, 692, 1013, 1490]) { const ff = f * (0.95 + Math.random() * 0.1); tone(t, ff, 0.7 + Math.random() * 0.6, 'triangle', 0.08, P, ff * 0.98, 0.7); }
        for (let i = 0; i < 12; i++) noiseHit(t + 0.03 + i * 0.045 + Math.random() * 0.03, 0.035, 'bandpass', 1500 + Math.random() * 2500, 4, 0.16 * (1 - i / 13), P, 0.5);
        { const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(1500, t + 0.05); f.frequency.linearRampToValueAtTime(700, t + 0.8);
          const g = gain(0); env(g, t + 0.05, 0.02, 0.35, 0.3, 0.4); src.connect(f); f.connect(g); out(g, P, sfx, 0.5); src.start(t + 0.05); src.stop(t + 0.9); }
        break; }
    }
  }

  // wet: something soft giving way
  function squelch(t, P, v) {
    for (let i = 0; i < 4; i++) {
      const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 8; const st = t + i * rr(0.03, 0.08);
      f.frequency.setValueAtTime(rr(300, 600), st); f.frequency.exponentialRampToValueAtTime(rr(1200, 2400), st + 0.07); f.frequency.exponentialRampToValueAtTime(rr(200, 400), st + 0.2);
      const g = gain(0); env(g, st, 0.01, 0.5 * v, 0.05, 0.15); src.connect(f); f.connect(g); out(g, P, sfx, 0.4); src.start(st, Math.random() * 2); src.stop(st + 0.3);
    }
  }

  // ---------- the hand in the room ----------
  // Every strike is layered the way a real one would be: the slap of contact, the body of the blow (an open
  // hand the size of a door, on concrete, plaster or a ceiling panel), the building answering with a boom you
  // feel more than hear, then the room rattling after it. It is placed so it carries a long way, sent hard
  // into the reverb, and for an instant everything else in the mix drops out of its way.
  const rr = (a, b) => a + Math.random() * (b - a);
  function far(pos, ref, roll) { return pos ? { x: pos.x, y: pos.y, z: pos.z, ref, roll } : null; }
  function bang(kind, pos, felt = 0) {
    if (!ctx) return;
    const t = now(), P = far(pos, 6, 1.05);
    duck(0.6, 0.12, 0.7);
    // contact: skin and nails, sharp
    noiseHit(t, 0.045, 'highpass', 1900, 0.7, 0.85, P, 0.5);
    noiseHit(t, 0.11, 'bandpass', rr(950, 1350), 1.3, 1.0, P, 0.6);
    if (kind === 'w') {
      // a wall: a hard flat smack, a short deep boom behind it, plaster grit pattering down
      noiseHit(t, 0.34, 'bandpass', rr(230, 320), 1.1, 1.75, P, 0.95);
      tone(t, rr(60, 70), 0.55, 'sine', 1.5, P, 32, 0.6);
      tone(t + 0.004, rr(118, 150), 0.24, 'triangle', 0.55, P, 68, 0.5);
      noiseHit(t, 0.6, 'lowpass', 140, 1, 1.7, P, 0.95);
      for (let i = 0; i < 10; i++) noiseHit(t + 0.06 + Math.random() * 0.6, rr(0.015, 0.04), 'bandpass', rr(2500, 5600), 3, rr(0.07, 0.2), P, 0.4);
    } else if (kind === 'f') {
      // the floor, the deepest of them: a whole palm driven into the slab, and everything on it jumps
      noiseHit(t, 0.8, 'lowpass', 105, 1, 2.1, P, 0.95);
      tone(t, rr(46, 54), 0.85, 'sine', 1.8, P, 23, 0.5);
      noiseHit(t, 0.24, 'bandpass', rr(170, 240), 1.3, 1.35, P, 0.8);
      for (let i = 0; i < 7; i++) noiseHit(t + 0.05 + Math.random() * 0.3, 0.03, 'bandpass', rr(1300, 3300), 6, rr(0.1, 0.26), P, 0.4);
    } else {
      // the ceiling: hollow - a panel and the frame it hangs in. The grid chatters, a fitting rings on its
      // chain, and dust pours down after it
      noiseHit(t, 0.42, 'bandpass', rr(370, 480), 2.1, 1.55, P, 1.0);
      tone(t, rr(82, 96), 0.6, 'sine', 1.25, P, 40, 0.7);
      noiseHit(t, 0.65, 'lowpass', 170, 1, 1.45, P, 0.95);
      for (let i = 0; i < 15; i++) noiseHit(t + 0.03 + i * rr(0.024, 0.05), 0.025, 'bandpass', rr(1500, 2700), 7, rr(0.12, 0.3) * (1 - i / 17), P, 0.5);
      const ring = rr(520, 760); tone(t + 0.02, ring, 1.0, 'sine', 0.085, P, ring * 0.985, 0.6); tone(t + 0.02, ring * 2.76, 0.55, 'sine', 0.035, P, 0, 0.6);
      noiseHit(t + 0.12, 1.5, 'highpass', 3800, 0.6, 0.11, P, 0.4);
    }
    // something loose nearby buzzes in sympathy
    if (Math.random() < 0.65) { const f = rr(280, 880); tone(t + 0.03, f, 0.55, 'triangle', 0.055, P, f * 0.97, 0.5); }
    // the part you take in through your feet: only for the people in the room it is hitting
    if (felt > 0) { tone(t, 34, 0.75, 'sine', 0.95 * felt, null, 21, 0); noiseHit(t, 0.55, 'lowpass', 75, 1, 1.1 * felt, null, 0); }
  }
  // a strike that met nothing: the air moving out of its way
  function whoosh(pos) {
    if (!ctx) return;
    const t = now(), src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(280, t); f.frequency.exponentialRampToValueAtTime(1500, t + 0.12); f.frequency.exponentialRampToValueAtTime(360, t + 0.4);
    const g = gain(0); env(g, t, 0.07, 0.75, 0.04, 0.3);
    src.connect(f); f.connect(g); out(g, far(pos, 4, 1.2), sfx, 0.45); src.start(t, Math.random() * 2); src.stop(t + 0.6);
    noiseHit(t + 0.1, 0.06, 'bandpass', rr(2600, 4000), 8, 0.25, far(pos, 4, 1.2), 0.4);
  }
  // It has stopped, and it is listening. One long nail at a time, ticking on whatever it is resting on;
  // then drawn slowly across it.
  function nails(pos, dur) {
    if (!ctx) return;
    const t = now(), P = far(pos, 3.5, 1.15), n = Math.max(3, Math.round(dur / 0.3));
    for (let i = 0; i < n; i++) {
      const ct = t + 0.15 + i * (dur / n) + Math.random() * 0.05;
      noiseHit(ct, 0.012, 'bandpass', rr(3100, 4900), 10, 0.55, P, 0.5);
      noiseHit(ct + 0.007, 0.02, 'bandpass', rr(1300, 1800), 6, 0.2, P, 0.4);
    }
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 9; f.frequency.setValueAtTime(2500, t); f.frequency.linearRampToValueAtTime(3500, t + dur);
    const g = gain(0); env(g, t + 0.05, dur * 0.45, 0.08, dur * 0.25, dur * 0.3);
    src.connect(f); f.connect(g); out(g, P, sfx, 0.5); src.start(t, Math.random()); src.stop(t + dur + 0.5);
  }
  // It heard you. A sharp breath in through the doorway and a growl under it - and, for whoever it heard,
  // a stab of strings.
  function heard(pos, mine) {
    if (!ctx) return;
    const t = now(), P = far(pos, 5, 1.1), src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(1700, t); f.frequency.exponentialRampToValueAtTime(4300, t + 0.45);
    const g = gain(0); env(g, t, 0.16, 0.6, 0.1, 0.28);
    src.connect(f); f.connect(g); out(g, P, sfx, 0.5); src.start(t, Math.random()); src.stop(t + 0.7);
    tone(t + 0.12, 72, 0.7, 'sawtooth', 0.24, P, 46, 0.6);
    if (mine) {
      for (const [a, b] of [[1046, 1108], [1109, 1175], [523, 554]]) tone(t, a, 0.9, 'sawtooth', 0.032, null, b, 0.75, music, 0.004);
      noiseHit(t, 1.0, 'lowpass', 240, 1, 0.55, null, 0.7, music);
    }
  }
  // the arm drawn back out through the gap: nails dragging over the frame, the weight of it, and the joints
  // going back to where they belong
  function withdraw(pos) {
    if (!ctx) return;
    const t = now(), P = far(pos, 4, 1.1), src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 5; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(1100, t + 0.9);
    const g = gain(0); env(g, t, 0.06, 0.32, 0.55, 0.3);
    src.connect(f); f.connect(g); out(g, P, sfx, 0.6); src.start(t, Math.random()); src.stop(t + 1.1);
    noiseHit(t, 0.9, 'lowpass', 220, 1, 0.55, P, 0.6);
    for (let i = 0; i < 4; i++) { const ct = t + 0.45 + i * rr(0.06, 0.12); noiseHit(ct, 0.045, 'bandpass', rr(1500, 3600), 9, 0.4, P, 0.35); tone(ct, rr(200, 380), 0.07, 'square', 0.09, P, 90, 0.3); }
  }
  // a heartbeat you can hear over everything else: yours, while it is listening
  function heartHard() { if (!ctx) return; const t = now(); tone(t, 60, 0.18, 'sine', 0.75, null, 38, 0); tone(t + 0.19, 54, 0.22, 'sine', 0.6, null, 36, 0); noiseHit(t, 0.1, 'lowpass', 90, 1, 0.5, null, 0); }
  // ---------- power coming back ----------
  // The main switch slamming over, the generator's starter grinding, the engine catching and roaring up -
  // then settling into the rumble that runs for as long as it has fuel.
  function powerUp(pos) {
    if (!ctx) return;
    const t = now(), P = far(pos, 7, 0.9);
    duck(0.7, 0.3, 1.2);
    noiseHit(t, 0.5, 'lowpass', 180, 1, 1.6, P, 0.9); noiseHit(t, 0.12, 'bandpass', 950, 2, 0.9, P, 0.6); tone(t, 72, 0.5, 'sine', 1.0, P, 38, 0.5);
    // the starter: a strained whine and the engine turning over against compression, slowing, then catching
    const st = ctx.createOscillator(); st.type = 'sawtooth'; st.frequency.setValueAtTime(140, t + 0.3); st.frequency.linearRampToValueAtTime(260, t + 0.9); st.frequency.linearRampToValueAtTime(230, t + 1.9);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.4;
    const sg = gain(0); env(sg, t + 0.3, 0.08, 0.16, 1.4, 0.3); st.connect(bp); bp.connect(sg); out(sg, P, sfx, 0.4); st.start(t + 0.3); st.stop(t + 2.2);
    for (let i = 0; i < 9; i++) { const ct = t + 0.4 + i * (0.19 - i * 0.008); noiseHit(ct, 0.12, 'lowpass', 160, 1, 0.9, P, 0.5); tone(ct, 48, 0.12, 'sine', 0.5, P, 30, 0.3); }
    // it catches: a cough, then the roar coming up to speed
    const ct = t + 2.0;
    noiseHit(ct, 0.25, 'lowpass', 300, 1, 1.4, P, 0.8);
    const ro = ctx.createOscillator(); ro.type = 'sawtooth'; ro.frequency.setValueAtTime(18, ct); ro.frequency.exponentialRampToValueAtTime(38, ct + 1.6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(220, ct); lp.frequency.linearRampToValueAtTime(520, ct + 0.8); lp.frequency.linearRampToValueAtTime(320, ct + 2.6);
    const rg = gain(0); env(rg, ct, 0.25, 0.75, 1.6, 1.0); ro.connect(lp); lp.connect(rg); out(rg, P, sfx, 0.7); ro.start(ct); ro.stop(ct + 3.2);
    noiseHit(ct + 0.1, 2.6, 'bandpass', 420, 0.8, 0.35, P, 0.6);
  }
  // the generator running: a low engine note with a piston beat, and a rattle over it, from where it stands
  function engine(pos, on) {
    if (!ctx) return;
    if (on && !S.engine) {
      const g0 = gain(0), P = panner(pos.x, pos.y || 1, pos.z, 6, 1.0); g0.connect(P); P.connect(sfx);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; lp.connect(g0);
      const trem = gain(0.6); trem.connect(lp);
      for (const [f, ty, v] of [[37, 'sawtooth', 0.5], [74, 'square', 0.12], [111, 'sawtooth', 0.08]]) { const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.connect(gain(v, trem)); o.start(); }
      const lfo = ctx.createOscillator(); lfo.frequency.value = 9.2; const lg = gain(0.35); lfo.connect(lg); lg.connect(trem.gain); lfo.start();
      const nz = ctx.createBufferSource(); nz.buffer = noise; nz.loop = true; const nb = ctx.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 900; nb.Q.value = 2.5; nz.connect(nb); nb.connect(gain(0.05, g0)); nz.start();
      g0.gain.setTargetAtTime(0.42, now(), 1.2);
      S.engine = { g0, P };
    } else if (on && S.engine) setPos(S.engine.P, pos.x, pos.y || 1, pos.z);
    else if (!on && S.engine) { S.engine.g0.gain.setTargetAtTime(0, now(), 0.4); const e = S.engine; setTimeout(() => { try { e.P.disconnect(); } catch (x) { /* gone */ } }, 2500); S.engine = null; }
  }
  // a bank of lights coming back: a contactor slamming in somewhere overhead, the tubes ticking as they catch,
  // the ballasts humming up
  function bankOn(i) {
    if (!ctx) return;
    const t = now();
    noiseHit(t, 0.35, 'lowpass', 240, 1, 0.7 - i * 0.08, null, 0.8); tone(t, 95, 0.3, 'triangle', 0.25, null, 60, 0.6);
    for (let k = 0; k < 7; k++) noiseHit(t + 0.08 + Math.random() * 0.9, 0.02, 'bandpass', 3000 + Math.random() * 2500, 6, 0.08, null, 0.5);
    tone(t + 0.1, 118, 2.2, 'sine', 0.035, null, 121, 0.5, amb, 0.6);
  }
  // pull the ambience and music out of the way of something - and let them back in after
  function duck(amount, hold = 0, rel = 0.6) {
    if (!ctx) return;
    const t = now();
    for (const [node, base] of [[amb, 0.8], [music, 0.55]]) {
      node.gain.cancelScheduledValues(t);
      node.gain.setTargetAtTime(base * (1 - amount), t, 0.025);
      node.gain.setTargetAtTime(base, t + Math.max(0.05, hold), Math.max(0.05, rel / 3));
    }
  }

  // ---------- music ----------
  function updateMusic(dt, chase, mode) {
    if (!ctx) return;
    S.chase = damp(S.chase, chase, chase > S.chase ? 4 : 0.5, dt);
    const t = now();
    if (!S.musicNodes) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = gain(0, music); lp.connect(g);
      for (const f of [110, 116.5, 164.8]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(gain(0.05, lp)); o.start(); }
      S.musicNodes = { pad: g, lp };
    }
    S.musicNodes.pad.gain.setTargetAtTime(S.chase * 0.5, t, 0.3);
    S.musicNodes.lp.frequency.setTargetAtTime(400 + S.chase * 1400, t, 0.3);
    if (S.chase > 0.05) {
      if (S.nextBeat < t) S.nextBeat = t + 0.05;
      while (S.nextBeat < t + 0.2) {
        const bt = S.nextBeat, b = S.beat++;
        if (b % 2 === 0) { tone(bt, 110, 0.22, 'sine', 0.55 * S.chase, null, 38, 0, music); }
        noiseHit(bt, 0.03, 'highpass', 7000, 1, 0.12 * S.chase, null, 0, music);
        if (b % 4 === 3) tone(bt, 55, 0.18, 'sawtooth', 0.12 * S.chase, null, 52, 0, music);
        S.nextBeat += 60 / 150 / 2;
      }
    }
  }
  function titleMusic(on) {
    if (!ctx) return;
    if (on && !S.titleMusic) {
      S.titleMusic = setInterval(() => {
        if (!ctx) return;
        const notes = [220, 261.6, 246.9, 196, 220, 174.6, 207.6, 164.8];
        const t = now(), n = notes[Math.floor(Math.random() * notes.length)];
        tone(t, n, 3.2, 'sine', 0.06, null, 0, 0.9, music, 0.02);
        tone(t, n * 2.01, 2.2, 'sine', 0.018, null, 0, 0.9, music, 0.02);
      }, 2600);
    } else if (!on && S.titleMusic) { clearInterval(S.titleMusic); S.titleMusic = null; }
  }

  // ---------- listener ----------
  const _fw = new THREE.Vector3();
  function updateListener(camera) {
    if (!ctx) return;
    const l = ctx.listener, p = camera.getWorldPosition(_tmpV3); camera.getWorldDirection(_fw);
    if (l.positionX) {
      l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
      l.forwardX.value = _fw.x; l.forwardY.value = _fw.y; l.forwardZ.value = _fw.z; l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(_fw.x, _fw.y, _fw.z, 0, 1, 0); }
  }
  const _tmpV3 = new THREE.Vector3();

  // ---------- microphone and voices (standalone only) ----------
  async function enableMic() {
    init();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no mic api');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
    S.mic = { stream, an, buf: new Float32Array(512), muted: false, src };
    return stream;
  }
  function disableMic() {
    if (!S.mic) return;
    try { S.mic.src.disconnect(); } catch (e) { /* gone */ }
    for (const t of S.mic.stream.getTracks()) { try { t.stop(); } catch (e) { /* stopped */ } }
    S.mic = null;
  }
  function micLevel() {
    if (!S.mic || S.mic.muted) return 0;
    S.mic.an.getFloatTimeDomainData(S.mic.buf);
    let sum = 0; for (let i = 0; i < S.mic.buf.length; i++) sum += S.mic.buf[i] * S.mic.buf[i];
    const rms = Math.sqrt(sum / S.mic.buf.length);
    S.micLevel = Math.max(rms * 6, S.micLevel * 0.9);
    return clamp((S.micLevel - 0.04) / 0.5, 0, 1);
  }
  // Is it a voice, or a whisper? A whisper is breath with no buzz of the vocal cords in it - no pitch. Talking
  // and yelling are voiced: the waveform repeats every 2.5-14ms. Checked by autocorrelation on a slightly
  // longer window, a few times a second, and held for a moment so a word doesn't flicker on and off.
  function micVoiced() {
    if (!S.mic || S.mic.muted) return 0;
    const M = S.mic;
    if (!M.an2) {
      M.an2 = ctx.createAnalyser(); M.an2.fftSize = 2048;
      try { ctx.createMediaStreamSource(M.stream).connect(M.an2); } catch (e) { return 1; }
      M.b2 = new Float32Array(2048); M.d2 = new Float32Array(1024); M.voiced = 0; M.vT = 0;
    }
    const now2 = performance.now();
    if (now2 - M.vT < 45) return M.voiced;
    M.vT = now2;
    M.an2.getFloatTimeDomainData(M.b2);
    // halve the rate: plenty for a voice's fundamental, and four times cheaper
    const x = M.d2, n = x.length;
    let e0 = 0;
    for (let i = 0; i < n; i++) { const v = (M.b2[2 * i] + M.b2[2 * i + 1]) * 0.5; x[i] = v; e0 += v * v; }
    const sr = ctx.sampleRate / 2;
    let best = 0;
    if (e0 > 1e-5) {
      const lo = Math.floor(sr / 420), hi = Math.min(n - 64, Math.ceil(sr / 70));
      for (let lag = lo; lag <= hi; lag += lag < 80 ? 1 : 2) {
        let s = 0, ea = 0, eb = 0;
        for (let i = 0; i + lag < n; i += 2) { const a = x[i], b = x[i + lag]; s += a * b; ea += a * a; eb += b * b; }
        const r = s / Math.sqrt(ea * eb + 1e-12);
        if (r > best) best = r;
      }
    }
    const on = best > 0.55 ? 1 : 0;
    M.voiced = on ? 1 : Math.max(0, M.voiced - 0.12);
    return M.voiced;
  }
  function setMicMuted(m) { if (S.mic) { S.mic.muted = m; S.mic.stream.getAudioTracks().forEach((tr) => { tr.enabled = !m; }); } }
  function attachVoice(id, stream) {
    init();
    detachVoice(id);
    const el = new Audio(); el.srcObject = stream; el.muted = true; el.play().catch(() => {});
    const src = ctx.createMediaStreamSource(stream);
    const g = gain(1); const p = panner(0, 1.6, 0, 2.5, 1.1);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000;
    src.connect(g); g.connect(lp); lp.connect(p); p.connect(voiceBus);
    S.voices.set(id, { el, src, g, p, lp });
  }
  function detachVoice(id) { const v = S.voices.get(id); if (v) { try { v.src.disconnect(); v.p.disconnect(); } catch (e) { /* gone */ } v.el.srcObject = null; S.voices.delete(id); } }
  function placeVoice(id, x, y, z, occluded, audible) {
    const v = S.voices.get(id); if (!v) return;
    setPos(v.p, x, y, z);
    v.lp.frequency.setTargetAtTime(occluded ? 900 : 18000, now(), 0.15);
    v.g.gain.setTargetAtTime(audible ? 1 : 0, now(), 0.2);
  }

  return {
    init, get ready() { return S.ready; }, setTheme, updateCreature, scream, creatureStep, step, play, updateMusic, titleMusic, updateListener,
    bang, whoosh, nails, heard, withdraw, heartHard, duck, powerUp, engine, bankOn, chudStep, chudGrunt, chudBreath,
    enableMic, disableMic, micLevel, micVoiced, setMicMuted, attachVoice, detachVoice, placeVoice, get hasMic() { return !!S.mic; }, get ctx() { return ctx; },
    setMaster(v) { if (master) master.gain.setTargetAtTime(v, now(), 0.3); },
    // while someone is being killed everyone's voices come up: whoever it has is still screaming, and
    // the team should hear it over the noise of what is happening to them
    voiceBoost(on) { if (voiceBus) voiceBus.gain.setTargetAtTime(on ? 1.95 : 1.2, now(), on ? 0.12 : 0.9); },
  };
})();
