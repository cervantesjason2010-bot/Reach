// ================= Breach - A1: the bunker under the surface =================
// Above B5, above everything the facility ever was, there is one more floor: a civil defence bunker, sealed
// from the inside the day it was finished. Painted concrete, blast doors, a decontamination line, the barracks
// where the garrison slept, the operations room where they watched the maps - and at the top of it all the
// hatch, and whatever is on the other side of it. The emergency batteries are still going: there is light.
// It doesn't help. The Pale doesn't see light. It sees you move.
//
// Legend additions for these maps (on top of the first floor's and B5's):
//   z under the hatch: the platform that goes up      u the hatch control

// ---------- materials and looks ----------
Object.assign(MAT_DEFS, {
  paintBunker: { tex: 'paint', ns: 0.8, color: 0x56665a },
  paintCream: { tex: 'paint', ns: 0.8, color: 0xa8a28a },
  tileDecon: { tex: 'tile', ns: 0.9, color: 0xb8c4bc, tile: 3 },
  floorDecon: { tex: 'tilefloor', ns: 0.8, color: 0x8a948c, tile: 4 },
  floorLino: { tex: 'tilefloor', ns: 0.8, color: 0x6a5c4a, tile: 4 },
  panelOak: { tex: 'wood', ns: 0.9, color: 0x4a3626 },
  carpetBlue: { tex: 'carpet', ns: 0.8, color: 0x2e3844, tile: 4 },
  olive: { tex: 'paint', ns: 0.8, color: 0x4a5034 },
});
Object.assign(THEMES, {
  bunker: { lo: 'paintBunker', hi: 'paintCream', floor: 'floor', ceil: 'concreteDark', ceilType: 'slab', pipes: true, fog: [0x010201, 0.045], amb: [0x1a201c, 0x040505, 0.16], L: 0xe8f0e4, star: 0xffc080, bang: 0xff2a1a, power: { L: [0.4, 0.35], '*': [0.5, 0.25], '!': [1, 0] }, haze: 0.5 },
  decon: { lo: 'tileDecon', hi: 'tileDecon', floor: 'floorDecon', ceil: 'panel', ceilType: 'grid', fog: [0x010202, 0.045], amb: [0x1c2422, 0x040505, 0.18], L: 0xe0f4ec, star: 0xffc890, bang: 0xff2a1a, power: { L: [0.45, 0.35], '*': [0.4, 0.3], '!': [1, 0] }, haze: 0.4 },
  barracks: { lo: 'paintBunker', hi: 'paintCream', floor: 'floorLino', ceil: 'concreteDark', ceilType: 'slab', pipes: true, fog: [0x010201, 0.045], amb: [0x1e1e18, 0x050404, 0.15], L: 0xf0eadc, star: 0xffb870, bang: 0xff2a1a, power: { L: [0.35, 0.35], '*': [0.5, 0.25], '!': [1, 0] }, haze: 0.5 },
  command: { lo: 'panelOak', hi: 'paintCream', floor: 'carpetBlue', ceil: 'panel', ceilType: 'grid', rail: true, fog: [0x010102, 0.04], amb: [0x1a1e26, 0x040506, 0.16], L: 0xe4ecff, star: 0xffc080, bang: 0xff2a1a, power: { L: [0.4, 0.35], '*': [0.5, 0.3], '!': [1, 0] }, haze: 0.4 },
  silo: { lo: 'concreteDark', hi: 'concrete', floor: 'floor', ceil: 'concreteDark', ceilType: 'deck', beams: true, pipes: true, fog: [0x020203, 0.032], amb: [0x1c1e22, 0x040405, 0.15], L: 0xe8ecf0, star: 0xffb870, bang: 0xff2010, power: { L: [0.35, 0.4], '*': [0.4, 0.3], '!': [1, 0] }, haze: 0.85,
    liftWall: 'concrete', liftFloor: 'plate', liftCeil: 'plateDark' },
});
Object.assign(THEME_SOIL, { bunker: [0.06, 0.8], decon: [0.3, 0.5], barracks: [0.04, 0.75], command: [0.02, 0.55], silo: [0.12, 0.9] });
const BUNKER = new Set(['bunker', 'decon', 'barracks', 'command', 'silo']);
const BM = {
  get olive() { return mat('olive'); },
  get drab() { return mat('fabric', { color: 0x4a4c34 }); },
  get blanket() { return mat('fabric', { color: 0x5a5a48 }); },
  get steel() { return mat('metal', { color: 0x7a7e78 }); },
  get gunmetal() { return plainMat(0x3a3e3e, { roughness: 0.45, metalness: 0.8 }); },
  get sandbag() { return mat('fabric', { color: 0x8a7a5a }); },
  get rubber() { return plainMat(0x161616, { roughness: 0.7 }); },
  get hazmat() { return plainMat(0xc8762a, { roughness: 0.55 }); },
  get redPaint() { return plainMat(0x8a1a12, { roughness: 0.5 }); },
};

// ---------- what's on the walls: civil defence, painted by the people who were going to live here ----------
const BreachArt = {};
function breachArt(kind, seed = 0) {
  const key = kind + seed;
  if (BreachArt[key]) return BreachArt[key];
  const r = mulberry32(seed * 613 + kind.length * 41);
  const sizes = { poster: [512, 720], shelter: [512, 512], wallmap: [1024, 640], roster: [512, 680], stencil: [512, 256], decon: [720, 512], graffiti: [1024, 512], clocks: [1024, 256], plot: [1024, 1024] };
  const [W, H] = sizes[kind] || [512, 512];
  const tex = canvasTex(W, H, (g, w, h) => {
    const stencil = (sz, wt = 800) => { g.font = wt + ' ' + sz + 'px "Big Shoulders Stencil Display", Impact, sans-serif'; };
    const type = (sz, wt = 500) => { g.font = wt + ' ' + sz + 'px "Courier New", monospace'; };
    const age = (n = 2500, a = 0.09) => { for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(60,44,20,' + r() * a + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } };
    const stains = (n = 6) => { for (let i = 0; i < n; i++) { const x = r() * w, gr = g.createLinearGradient(x, 0, x, h); gr.addColorStop(0, 'rgba(70,52,26,0.35)'); gr.addColorStop(1, 'rgba(70,52,26,0)'); g.fillStyle = gr; g.fillRect(x, 0, 6 + r() * 26, h * (0.2 + r() * 0.6)); } };
    if (kind === 'poster') {
      // IN THE EVENT OF ATTACK: a family under a table, a list of what to do, all of it wrong now
      const v = seed % 3;
      g.fillStyle = ['#d8cfae', '#c8b88a', '#d0c8b0'][v]; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8a1a12'; g.fillRect(0, 0, w, 120);
      g.fillStyle = '#f0e8d0'; stencil(56); g.textAlign = 'center';
      g.fillText(['IN THE EVENT OF ATTACK', 'STAY BELOW', 'DUCK AND COVER'][v], w / 2, 82);
      g.fillStyle = '#1a1a14';
      if (v === 0) {
        g.fillRect(120, 300, 280, 14); g.fillRect(130, 314, 12, 120); g.fillRect(378, 314, 12, 120);
        for (const [x, s] of [[190, 1], [250, 0.8], [310, 0.6]]) { g.beginPath(); g.arc(x, 400 - 40 * s, 18 * s, 0, 6.28); g.fill(); g.fillRect(x - 22 * s, 400 - 20 * s, 44 * s, 34 * s); }
      } else if (v === 1) {
        g.beginPath(); g.moveTo(w / 2, 160); g.lineTo(w / 2 + 150, 300); g.lineTo(w / 2 - 150, 300); g.fill();
        g.fillRect(w / 2 - 110, 300, 220, 150); g.fillStyle = '#d8cfae'; g.fillRect(w / 2 - 30, 360, 60, 90);
      } else {
        g.beginPath(); g.arc(w / 2, 300, 120, 0, 6.28); g.fill(); g.fillStyle = '#c8b88a'; g.beginPath(); g.arc(w / 2, 300, 80, 0, 6.28); g.fill();
        g.fillStyle = '#1a1a14'; for (let k = 0; k < 3; k++) { const a = k * 2.094 - 1.57; g.beginPath(); g.moveTo(w / 2, 300); g.arc(w / 2, 300, 120, a - 0.5, a + 0.5); g.fill(); }
      }
      g.fillStyle = '#1a1a14'; type(24, 700); g.textAlign = 'left';
      const lines = [['1. GO TO YOUR SHELTER AT ONCE', '2. CLOSE THE DOOR BEHIND YOU', '3. DO NOT OPEN IT FOR ANYONE', '4. WAIT FOR THE ALL CLEAR'], ['THE SURFACE IS NOT SAFE', 'THE HATCH STAYS SHUT', 'RATIONS FOR 2 YEARS', 'KEEP CALM. KEEP BELOW.'], ['AT THE FLASH: DROP', 'COVER YOUR HEAD', 'DO NOT LOOK UP', 'COUNT TO SIXTY']][v];
      lines.forEach((t, i) => g.fillText(t, 40, 520 + i * 40));
      g.fillStyle = '#4a3a1a'; type(16); g.fillText('CIVIL DEFENCE CORPS · FORM CD/' + (17 + seed), 40, h - 24);
      stains(); age();
    } else if (kind === 'shelter') {
      g.fillStyle = '#e2b52a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#141210'; g.beginPath(); g.arc(256, 210, 150, 0, 6.28); g.fill();
      g.fillStyle = '#e2b52a';
      for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * 2.094; g.beginPath(); g.moveTo(256, 210); g.lineTo(256 + Math.cos(a - 0.45) * 130, 210 + Math.sin(a - 0.45) * 130); g.lineTo(256 + Math.cos(a + 0.45) * 130, 210 + Math.sin(a + 0.45) * 130); g.fill(); }
      g.fillStyle = '#141210'; stencil(66); g.textAlign = 'center'; g.fillText('FALLOUT SHELTER', 256, 430);
      g.font = '700 30px monospace'; g.fillText('CAPACITY 240', 256, 478);
      age(1500, 0.12);
    } else if (kind === 'wallmap') {
      // the city above, gridded, and the rings drawn on it in red
      g.fillStyle = '#d8d0b4'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(60,90,120,0.6)'; g.lineWidth = 14; g.beginPath(); g.moveTo(0, 420); g.bezierCurveTo(300, 380, 520, 520, 1024, 460); g.stroke();
      g.strokeStyle = 'rgba(40,40,30,0.5)'; g.lineWidth = 2;
      for (let i = 0; i < 70; i++) { g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 300, y + (r() - 0.5) * 300); g.stroke(); }
      g.fillStyle = 'rgba(40,40,30,0.35)'; for (let i = 0; i < 260; i++) g.fillRect(380 + (r() - 0.5) * 520, 300 + (r() - 0.5) * 380, 6 + r() * 14, 6 + r() * 14);
      g.strokeStyle = 'rgba(30,30,20,0.35)'; g.lineWidth = 1; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = '#a81a12'; for (const [rad, wd] of [[60, 5], [140, 4], [230, 3], [330, 2]]) { g.lineWidth = wd; g.setLineDash(rad > 200 ? [16, 10] : []); g.beginPath(); g.arc(410, 300, rad, 0, 6.28); g.stroke(); }
      g.setLineDash([]); g.fillStyle = '#a81a12'; g.beginPath(); g.arc(410, 300, 12, 0, 6.28); g.fill();
      stencil(28); g.fillText('GROUND ZERO', 430, 290);
      g.fillStyle = '#1a3a6a'; g.beginPath(); g.arc(760, 520, 10, 0, 6.28); g.fill(); g.font = '700 22px monospace'; g.fillText('A-1', 776, 528);
      g.fillStyle = '#1a1a14'; stencil(34); g.fillText('METROPOLITAN DISTRICT · SHEET 4', 30, 46);
      // someone has written across it later, in grease pencil
      g.strokeStyle = 'rgba(20,20,20,0.85)'; g.lineWidth = 6; g.font = '700 46px cursive'; g.fillStyle = 'rgba(20,20,20,0.85)'; g.fillText('THERE IS NOTHING LEFT', 300, 600);
      age(4000, 0.1); stains(8);
    } else if (kind === 'roster') {
      g.fillStyle = '#e0dac4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1a1a14'; type(26, 700); g.fillText('DUTY ROSTER - A-1 GARRISON', 30, 56);
      type(20);
      const names = ['CPL HALE', 'PTE OKAFOR', 'PTE LINDQVIST', 'SGT MORROW', 'PTE DAVIES', 'PTE REYES', 'LCPL ABARA', 'PTE KOVAC', 'PTE SATO', 'CPL BRENNAN', 'PTE NOLAN', 'PTE VASQUEZ'];
      names.forEach((n, i) => {
        const y = 110 + i * 42; g.fillStyle = '#1a1a14'; g.fillText(n, 40, y); g.fillText(['HATCH', 'DECON', 'RADIO', 'STORES'][i % 4], 300, y);
        if (i < 9 + (seed % 3)) { g.strokeStyle = 'rgba(140,20,14,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(34, y - 7); g.lineTo(440, y - 9); g.stroke(); }
      });
      g.fillStyle = 'rgba(140,20,14,0.9)'; g.font = '700 26px cursive'; g.fillText('nobody goes up', 220, h - 50);
      age(); stains(4);
    } else if (kind === 'stencil') {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(232,226,206,0.88)'; stencil(180, 900); g.textAlign = 'center'; g.fillText(['A-1', 'SECTOR 2', 'SECTOR 3', 'OPS', 'HATCH'][seed % 5], w / 2, 190);
      g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(0,0,0,' + r() * 0.5 + ')'; g.fillRect(r() * w, r() * h, 2 + r() * 8, 2 + r() * 8); } g.globalCompositeOperation = 'source-over';
    } else if (kind === 'decon') {
      g.fillStyle = '#e8e6dc'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1a5a3a'; g.fillRect(0, 0, w, 80); g.fillStyle = '#f0f0e8'; stencil(46); g.fillText('DECONTAMINATION PROCEDURE', 24, 58);
      g.fillStyle = '#1a1a14';
      for (let k = 0; k < 4; k++) {
        const x = 30 + k * 172; g.strokeStyle = '#1a1a14'; g.lineWidth = 4; g.strokeRect(x, 110, 150, 230);
        g.beginPath(); g.arc(x + 75, 170, 18, 0, 6.28); g.fill(); g.fillRect(x + 62, 190, 26, 80); g.fillRect(x + 60, 270, 10, 50); g.fillRect(x + 80, 270, 10, 50);
        if (k === 1) for (let j = 0; j < 12; j++) g.fillRect(x + 20 + j * 10, 120 + (j % 3) * 8, 3, 30);
        if (k === 2) { g.fillStyle = '#2a6aaa'; g.fillRect(x + 10, 300, 130, 30); g.fillStyle = '#1a1a14'; }
        type(20, 700); g.fillText(['1. STRIP', '2. SHOWER', '3. SCRUB', '4. DRESS'][k], x + 10, 370);
      }
      type(18); g.fillText('ALL CLOTHING TO THE INCINERATOR. NO EXCEPTIONS.', 30, 430); g.fillText('DO NOT RE-ENTER WITHOUT A FULL CYCLE.', 30, 458);
      age(1800, 0.08);
    } else if (kind === 'graffiti') {
      // scrawled by someone who was still alive when they wrote it
      g.clearRect(0, 0, w, h);
      const msgs = ['IT SEES YOU MOVE', 'DONT MOVE', 'IT ONLY SEES MOVING', 'STAND STILL', 'DONT OPEN THE HATCH', 'WE OPENED IT'];
      g.fillStyle = seed % 2 ? 'rgba(120,16,10,0.9)' : 'rgba(18,16,14,0.9)'; g.font = '700 ' + (78 + (seed % 3) * 10) + 'px cursive'; g.textAlign = 'center';
      g.save(); g.translate(w / 2, h / 2 + 30); g.rotate((r() - 0.5) * 0.12); g.fillText(msgs[seed % msgs.length], 0, 0); g.restore();
      for (let i = 0; i < 30; i++) { g.fillRect(w / 2 - 300 + r() * 600, h / 2 + 50 + r() * 10, 3, 20 + r() * 80); }
    } else if (kind === 'clocks') {
      g.fillStyle = '#20221e'; g.fillRect(0, 0, w, h);
      const cities = ['WASHINGTON', 'LONDON', 'MOSCOW', 'PEKING'];
      cities.forEach((c, i) => {
        const cx = 128 + i * 256, cy = 110;
        g.fillStyle = '#e8e4d4'; g.beginPath(); g.arc(cx, cy, 80, 0, 6.28); g.fill();
        g.strokeStyle = '#1a1a14'; g.lineWidth = 3; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; g.beginPath(); g.moveTo(cx + Math.cos(a) * 68, cy + Math.sin(a) * 68); g.lineTo(cx + Math.cos(a) * 78, cy + Math.sin(a) * 78); g.stroke(); }
        // every one stopped at the same moment
        const hh = (4 + i * 5) % 12, mm = 17;
        g.lineWidth = 7; g.beginPath(); g.moveTo(cx, cy); const ah = (hh + mm / 60) / 12 * 6.28 - 1.57; g.lineTo(cx + Math.cos(ah) * 40, cy + Math.sin(ah) * 40); g.stroke();
        g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); const am = mm / 60 * 6.28 - 1.57; g.lineTo(cx + Math.cos(am) * 62, cy + Math.sin(am) * 62); g.stroke();
        g.fillStyle = '#e8e4d4'; g.font = '700 26px monospace'; g.textAlign = 'center'; g.fillText(c, cx, 228);
      });
    } else if (kind === 'plot') {
      // the plotting table: the hemisphere in blue and white, and on it the markers where it all came down
      g.fillStyle = '#1a2a3e'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(160,190,210,0.35)'; g.lineWidth = 2;
      for (let k = 1; k < 8; k++) { g.beginPath(); g.arc(512, 512, k * 64, 0, 6.28); g.stroke(); }
      for (let k = 0; k < 24; k++) { const a = k / 24 * 6.28; g.beginPath(); g.moveTo(512, 512); g.lineTo(512 + Math.cos(a) * 500, 512 + Math.sin(a) * 500); g.stroke(); }
      g.fillStyle = 'rgba(200,210,190,0.55)';
      for (let i = 0; i < 9; i++) { g.beginPath(); const cx = 512 + (r() - 0.5) * 700, cy = 512 + (r() - 0.5) * 700; g.moveTo(cx, cy); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, rr = 40 + r() * 90; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8); } g.fill(); }
      g.fillStyle = '#c8241a'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(512 + (r() - 0.5) * 760, 512 + (r() - 0.5) * 760, 6 + r() * 6, 0, 6.28); g.fill(); }
      age(1500, 0.12);
    }
  });
  const transparent = kind === 'stencil' || kind === 'graffiti';
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: kind === 'plot' ? 0.35 : 0.85, transparent, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  m.userData.noShadow = true;
  BreachArt[key] = m;
  return m;
}

// ---------- the furniture of a bunker ----------
// bunks: two tiers of steel frame, a thin mattress, a blanket folded or kicked off, a pillow
function bunkBed(B, f, c) {
  const ff = frame(f.ox, f.oz, f.rot + (c.rnd() - 0.5) * 0.06), st = BM.steel, rnd = c.rnd;
  if (c.L) for (const x of [-0.7, 0, 0.7]) { const p = ff.w(x, 0, 0); addCollider(c.L, p[0], p[2], 0.42); }
  for (const x of [-0.95, 0.95]) for (const z of [-0.42, 0.42]) ff.cbox(B, st, x, 0.85, z, 0.05, 1.7, 0.05, 0.008);
  for (const y of [0.42, 1.38]) {
    for (const z of [-0.42, 0.42]) ff.cbox(B, st, 0, y, z, 1.9, 0.05, 0.04, 0.006);
    for (const x of [-0.95, 0.95]) ff.cbox(B, st, x, y, 0, 0.04, 0.05, 0.84, 0.006);
    if (rnd() < 0.88) {
      ff.cbox(B, WM.mattress, 0, y + 0.08, 0, 1.84, 0.1, 0.8, 0.04);
      if (rnd() < 0.7) ff.cbox(B, BM.blanket, 0.3 + (rnd() - 0.5) * 0.3, y + 0.15, 0, 1.0 + rnd() * 0.4, 0.05, 0.84, 0.03, (rnd() - 0.5) * 0.3);
      else ff.cbox(B, BM.blanket, 0.75, y + 0.18, 0.1, 0.32, 0.12, 0.5, 0.04, 0.2);
      if (rnd() < 0.8) ff.cbox(B, WM.sheet, -0.75, y + 0.18, 0, 0.3, 0.1, 0.5, 0.05, (rnd() - 0.5) * 0.4);
    }
  }
  ff.cbox(B, st, 0.95, 1.0, 0.44, 0.04, 0.9, 0.03, 0.005);
  for (let k = 0; k < 4; k++) ff.cbox(B, st, 0.95, 0.62 + k * 0.22, 0.46, 0.03, 0.03, 0.12, 0.005);
  // a name tag on the foot rail, and sometimes a body under the top blanket
  ff.geo(B, labelMat(['HALE', 'OKAFOR', 'MORROW', 'DAVIES', 'REYES', 'KOVAC', 'SATO', 'NOLAN'][Math.floor(rnd() * 8)], { bg: '#d8d4c0', fg: '#1a1a14', w: 256, h: 64, size: 40 }), planeGeo(0.18, 0.045), 0.975, 0.5, 0, Math.PI / 2);
  if (rnd() < 0.08) { ff.cbox(B, BM.blanket, 0, 1.6, 0, 1.6, 0.18, 0.5, 0.08); ff.sphere(B, BM.blanket, -0.7, 1.62, 0, 0.13, 0.8); }
}
// a footlocker at the end of every bunk
function footlocker(B, f, c) {
  const ff = frame(f.ox, f.oz, f.rot + (c.rnd() - 0.5) * 0.2), o = BM.olive;
  ff.cbox(B, o, 0, 0.21, 0, 0.8, 0.42, 0.44, 0.015);
  ff.cbox(B, o, 0, 0.44, c.rnd() < 0.2 ? -0.1 : 0, 0.82, 0.04, 0.46, 0.01, 0, 1, c.rnd() < 0.2 ? -0.9 : 0);
  for (const x of [-0.3, 0.3]) ff.cbox(B, BM.gunmetal, x, 0.36, 0.225, 0.06, 0.05, 0.02, 0.004);
  ff.cbox(B, BM.gunmetal, 0, 0.21, 0.225, 0.1, 0.03, 0.02, 0.004);
  if (c.L) { const p = ff.w(0, 0, 0); addCollider(c.L, p[0], p[2], 0.4); }
}
// sandbags: a low wall of them, sagging, some split
function sandbags(B, f, c) {
  const rnd = c.rnd;
  for (let row = 0; row < 4; row++) for (let k = 0; k < 2; k++) {
    const x = (k - 0.5) * 0.5 + (row % 2) * 0.12, y = 0.11 + row * 0.2;
    f.cbox(B, BM.sandbag, x, y, (rnd() - 0.5) * 0.06, 0.5, 0.2, 0.32, 0.08, (rnd() - 0.5) * 0.2);
  }
  if (rnd() < 0.3) f.geo(B, decalMat('grime'), cachedGeo('sandSpill', () => new THREE.PlaneGeometry(0.8, 0.8).rotateX(-Math.PI / 2)), (rnd() - 0.5) * 0.4, 0.008, 0.4, rnd() * 6);
  if (c.L) { const p = f.w(0, 0, 0); addCollider(c.L, p[0], p[2], 0.48); }
}
// the mess tables: steel tops on welded legs, trays still on some of them
function messTable(B, f, c) {
  const st = BM.steel;
  f.cbox(B, st, 0, 0.74, 0, 1.0, 0.04, 0.9, 0.006);
  for (const z of [-0.38, 0.38]) f.cbox(B, st, 0, 0.36, z, 0.05, 0.72, 0.05, 0.006);
  f.cbox(B, st, 0, 0.12, 0, 0.05, 0.05, 0.8, 0.006);
  const r = c.rnd();
  if (r < 0.45) { const tx = (c.rnd() - 0.5) * 0.4, tz = (c.rnd() - 0.5) * 0.4; f.cbox(B, plainMat(0x8a8c88, { roughness: 0.35, metalness: 0.7 }), tx, 0.77, tz, 0.4, 0.02, 0.3, 0.005, c.rnd() * 0.4); f.cyl(B, plainMat(0xd8d4c8, { roughness: 0.35 }), tx + 0.08, 0.81, tz, 0.04, 0.035, 0.07, 10); }
  else if (r < 0.6) f.cyl(B, plainMat(0x4a5a3a, { roughness: 0.4, metalness: 0.6 }), (c.rnd() - 0.5) * 0.5, 0.82, (c.rnd() - 0.5) * 0.4, 0.04, 0.04, 0.11, 12);
  if (c.L) { const p = f.w(0, 0, 0); addCollider(c.L, p[0], p[2], 0.55); }
}
// a gun rack with nothing left in it but one bayonet; or a shelf of tins
function gunRack(B, f, c) {
  const wd = mat('wood', { color: 0x5a4430 });
  f.cbox(B, wd, 0, 0.9, 0.18, 0.96, 1.8, 0.06, 0.01);
  f.cbox(B, wd, 0, 0.35, 0.36, 0.96, 0.05, 0.36, 0.01);
  for (let k = 0; k < 6; k++) { const x = -0.4 + k * 0.16; f.cbox(B, wd, x, 1.32, 0.3, 0.02, 0.1, 0.2, 0.004); }
  if (c.rnd() < 0.5) f.cbox(B, BM.gunmetal, -0.1, 0.9, 0.32, 0.02, 0.5, 0.02, 0.003, 0, 1, 0.1);
  f.geo(B, labelMat('SIGN OUT EVERY WEAPON', { bg: '#d8d4c0', fg: '#1a1a14', w: 512, h: 64, size: 34 }), planeGeo(0.6, 0.075), 0, 1.72, 0.215);
}
function tinShelf(B, f, c) {
  const st = BM.steel, rnd = c.rnd;
  for (const x of [-0.46, 0.46]) for (const z of [0.05, 0.5]) f.cbox(B, st, x, 0.95, z, 0.04, 1.9, 0.04, 0.005);
  for (const y of [0.2, 0.7, 1.2, 1.7]) {
    f.cbox(B, st, 0, y, 0.28, 0.96, 0.03, 0.5, 0.005);
    const n = Math.floor(rnd() * 8);
    for (let k = 0; k < n; k++) f.cyl(B, plainMat([0x5a6a3a, 0x8a7a4a, 0x6a4a2a][k % 3], { roughness: 0.4, metalness: 0.6 }), -0.4 + rnd() * 0.8, y + 0.07, 0.12 + rnd() * 0.3, 0.04, 0.04, 0.11, 10);
  }
  if (c.L) { const p = f.w(0, 0, 0.28); addCollider(c.L, p[0], p[2], 0.48); }
}
const _breachProps = Object.assign({}, PROP_BUILDERS);
PROP_BUILDERS.g = (B, f, c) => (c.theme === 'barracks' ? bunkBed(B, f, c) : _breachProps.g(B, f, c));
PROP_BUILDERS.x = (B, f, c) => (c.theme === 'barracks' ? footlocker(B, f, c) : c.theme === 'bunker' || c.theme === 'silo' ? sandbags(B, f, c) : _breachProps.x(B, f, c));
PROP_BUILDERS.t = (B, f, c) => (c.theme === 'barracks' ? messTable(B, f, c) : _breachProps.t(B, f, c));
PROP_BUILDERS.$ = (B, f, c) => (c.theme === 'bunker' ? gunRack(B, f, c) : c.theme === 'barracks' || c.theme === 'silo' ? tinShelf(B, f, c) : _breachProps.$(B, f, c));
// tanks: pressure bottles and water tanks in a bunker, not specimen tanks. In the operations room the cells
// are the plotting table's, which is drawn whole as a set piece.
function bunkerTanks(B, cells, c) {
  if (c.theme === 'command') return;
  const cols = c.theme === 'decon' ? [0xb8bcb4, 0x8a9a8a] : c.theme === 'barracks' ? [0x8a8c88] : [0x4a5a3a, 0x8a2a1c, 0x5a6a7a];
  const labels = c.theme === 'decon' ? ['STEAM', 'HOT WATER'] : c.theme === 'barracks' ? ['STOCK POT'] : ['O2', 'WATER', 'FUEL'];
  for (const [x, z] of cells) {
    const f = frame(x + 0.5, z + 0.5, c.rnd() * 6), k = Math.floor(c.rnd() * cols.length), m = mat('metal', { color: cols[k] });
    if (c.theme === 'barracks') { f.cyl(B, m, 0, 0.45, 0, 0.42, 0.42, 0.9, 20); f.cyl(B, mat('steelDark'), 0, 0.92, 0, 0.44, 0.44, 0.04, 20); continue; }
    f.cyl(B, m, 0, 0.98, 0, 0.36, 0.36, 1.7, 20); f.sphere(B, m, 0, 1.83, 0, 0.36, 0.5); f.sphere(B, m, 0, 0.13, 0, 0.36, 0.35);
    f.cyl(B, mat('steelDark'), 0, 2.08, 0, 0.05, 0.05, 0.2, 10); f.cyl(B, plainMat(0xa0281c, { roughness: 0.5, metalness: 0.4 }), 0, 2.2, 0, 0.1, 0.1, 0.03, 12);
    for (let j = 0; j < 3; j++) { const a = j / 3 * 6.28; f.cbox(B, mat('steelDark'), Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3, 0.06, 0.2, 0.06, 0.01); }
    f.cyl(B, plainMat(0xd8d0b0, { roughness: 0.4 }), 0, 1.5, 0.37, 0.06, 0.06, 0.02, 14, Math.PI / 2);
    f.geo(B, labelMat(labels[k % labels.length], { fg: '#e8e4d6', w: 256, h: 96, size: 64 }), planeGeo(0.4, 0.15), 0, 1.15, 0.365);
  }
}
const _breachCluster = buildMachineCluster;
buildMachineCluster = function (B, ch, cells, c) { if (ch === 'T' && BUNKER.has(c.theme)) return bunkerTanks(B, cells, c); return _breachCluster(B, ch, cells, c); };

Object.assign(WALL_ITEMS, {
  cdPoster(B, f, r) { f.geo(B, breachArt('poster', Math.floor(r() * 3)), planeGeo(0.5, 0.7), 0, 1.6, 0.006, 0, 0, (r() - 0.5) * 0.06); },
  shelterSign(B, f, r) { f.cbox(B, BM.steel, 0, 2.2, 0.01, 0.5, 0.5, 0.012, 0.004); f.geo(B, breachArt('shelter', 0), planeGeo(0.48, 0.48), 0, 2.2, 0.018); },
  gasmasks(B, f, r) {
    const rub = BM.rubber, gl = plainMat(0x2a3a3a, { roughness: 0.1, metalness: 0.3 });
    for (let k = 0; k < 3; k++) {
      if (r() < 0.3) continue;
      const x = (k - 1) * 0.3; f.cyl(B, BM.steel, x, 1.7, 0.03, 0.006, 0.006, 0.06, 6, Math.PI / 2);
      f.sphere(B, rub, x, 1.55, 0.07, 0.09, 1.2); for (const s of [-1, 1]) f.cyl(B, gl, x + s * 0.035, 1.6, 0.14, 0.025, 0.025, 0.01, 10, Math.PI / 2);
      f.cyl(B, plainMat(0x4a4c40, { roughness: 0.5, metalness: 0.4 }), x, 1.45, 0.15, 0.035, 0.035, 0.07, 10, Math.PI / 2);
    }
  },
  highScratch(B, f, r) { for (let k = 0; k < 2; k++) f.geo(B, decalMat('scratch'), planeGeo(0.9, 1.3), (k - 0.5) * 0.8, 2.25 + r() * 0.3, 0.007, 0, 0, (r() - 0.5) * 0.4); },
  graffiti(B, f, r) { f.geo(B, breachArt('graffiti', Math.floor(r() * 6)), planeGeo(1.6, 0.8), 0, 1.5 + r() * 0.3, 0.007); },
  roster(B, f, r) { f.cbox(B, mat('wood', { color: 0x6a5240 }), 0, 1.5, 0.008, 0.46, 0.6, 0.015, 0.004); f.geo(B, breachArt('roster', Math.floor(r() * 3)), planeGeo(0.4, 0.53), 0, 1.5, 0.018); },
  fieldPhone(B, f, r) {
    f.cbox(B, BM.olive, 0, 1.35, 0.06, 0.24, 0.2, 0.12, 0.02); f.cbox(B, PM.black, 0, 1.47, 0.12, 0.26, 0.05, 0.06, 0.02);
    f.cyl(B, BM.gunmetal, 0.08, 1.3, 0.13, 0.03, 0.03, 0.02, 10, Math.PI / 2);
    B.add(PM.black, tubeGeo([f.w(-0.1, 1.42, 0.13), f.w(-0.15, 1.1, 0.16), f.w(-0.06, 0.95, 0.12)], 0.006, 10, 4), _m4.identity());
  },
});
Object.assign(DRESS.kits, {
  bunker: [['cdPoster', 0.04], ['ext', 0.03], ['vent', 0.03], ['panel', 0.03], ['fieldPhone', 0.015], ['gasmasks', 0.03], ['emerg', 0.04], ['highScratch', 0.03], ['graffiti', 0.012], ['alarm', 0.02]],
  decon: [['eyewash', 0.04], ['hooks', 0.05], ['vent', 0.04], ['gasmasks', 0.04], ['emerg', 0.04], ['highScratch', 0.03], ['graffiti', 0.01], ['notice', 0.03]],
  barracks: [['cdPoster', 0.05], ['roster', 0.03], ['hooks', 0.04], ['vent', 0.03], ['emerg', 0.03], ['highScratch', 0.03], ['graffiti', 0.015], ['clock', 0.015]],
  command: [['cork', 0.04], ['roster', 0.03], ['phone', 0.03], ['fieldPhone', 0.02], ['clock', 0.02], ['emerg', 0.04], ['highScratch', 0.02], ['alarm', 0.02], ['cdPoster', 0.02]],
  silo: [['panel', 0.06], ['pipeV', 0.06], ['gauge', 0.05], ['ext', 0.03], ['emerg', 0.04], ['shelterSign', 0.01], ['highScratch', 0.03], ['ladder', 0.02], ['graffiti', 0.008]],
});
Object.assign(AMBIENT_EVENTS, {
  bunker: [['groan', 12, 30], ['clunk', 16, 40], ['drip', 8, 20]],
  decon: [['drip', 2, 7], ['clunk', 18, 40], ['valve', 25, 60]],
  barracks: [['creak', 12, 30], ['knock', 18, 45], ['radio', 30, 70]],
  command: [['radio', 14, 34], ['click', 9, 22], ['beep', 26, 60]],
  silo: [['groan', 8, 20], ['clunk', 12, 28], ['drip', 5, 14]],
});

// ---------- the maps ----------
const BREACH_META = [
  { name: 'Lift Head', theme: 'bunker', ceil: 3.2, objective: 'The way on is a keycard door. The duty officer kept the card.',
    note: 'GUARD POST LOG. Day 1: hatch sealed at 1600. Day 9: Pte Kovac went up the ladder to check the seals. He came back down in the night. He was not Kovac. It only came for the ones who were moving. Sgt Morrow says stand still. Stand still.' },
  { name: 'Decontamination', theme: 'decon', ceil: 3.0, objective: 'Purge the decon line: turn both valves. Stand still if it turns your way.',
    note: 'DECON LOG: full cycle for every return from the surface - strip, shower, scrub, dress. The last team back did the full cycle. Twice. It was already inside one of them.' },
  { name: 'Barracks', theme: 'barracks', ceil: 3.0, objective: 'The armoury door has a code. The garrison chalked it round the barracks.',
    note: 'To whoever is still down here: it sees you when you move. Not the light. Not the noise. When it looks at you, freeze. It will come right up to your face. Do not breathe. It goes away. (They found Brennan standing in the mess for nine hours.)' },
  { name: 'Operations', theme: 'command', ceil: 3.6, objective: 'Override the blast door from the cipher room console.',
    note: 'OPERATIONS LOG, 17:04. All stations report contact lost. Surface monitors show nothing moving. Nothing at all. Commander orders the hatch kept shut indefinitely. Something on the monitors at 17:06. Something very large.' },
  { name: 'The Hatch', theme: 'silo', ceil: 9.0, liftH: 14, objective: 'Cycle the hatch, then get everyone onto the platform.',
    note: 'HATCH CYCLE: thirty seconds. Klaxon and beacons run the whole time. The platform rises when the hatch is open and everyone is aboard. Whatever you hear through the hatch while it opens: do not stop.' },
];

function breachArea1(rnd) { // Lift Head: the guard post where the lift comes up into the bunker
  const g = new MapGrid(34, 22);
  // the car you came up in, set into the west wall
  g.fill(0, 8, 5, 15, '#'); g.fill(1, 9, 4, 14, 'z'); g.put([[5, 11], [5, 12]], 'z');
  g.put([[2, 10], [3, 10], [2, 13], [3, 13]], '@');
  g.floor(6, 2, 32, 19);
  for (const [x, z] of [[14, 7], [14, 15], [22, 7], [22, 15]]) g.set(x, z, 'I');
  // the guard post: a booth with a window onto the hall
  g.vline(13, 2, 5, '#'); g.hline(6, 13, 5, '#'); g.put([[7, 5], [8, 5], [12, 5]], '~'); g.set(10, 5, '.');
  g.put([[8, 2], [9, 2]], 't'); g.set(9, 3, 'h'); g.put([[12, 2], [12, 3]], 'l'); g.set(7, 4, 'k');
  // sandbags in front of the lift, a rack of nothing, rations, water
  g.put([[8, 8], [8, 9], [8, 14], [8, 15]], 'x');
  g.put([[16, 2], [17, 2], [18, 2]], '$');
  g.put([[30, 2], [31, 2], [31, 3]], 'X'); g.put([[24, 19], [25, 19]], 'o');
  g.put([[16, 19], [17, 19]], 'b');
  // the first-aid post: the shelter
  g.fill(23, 12, 33, 21, '#'); g.fill(24, 13, 32, 20, 's'); g.set(27, 12, 'S');
  g.put([[32, 14], [32, 15]], 'l'); g.set(25, 20, 't'); g.set(26, 19, 'h'); g.set(29, 16, '*'); g.set(31, 20, 'n');
  g.put([[33, 6], [33, 7]], 'K');
  g.put([[11, 11], [18, 10], [27, 8], [18, 17]], 'L'); g.set(7, 12, '!'); g.set(10, 3, '*');
  g.scatter(rnd, 6, 6, 32, 19, ':', 18); g.scatter(rnd, 6, 6, 32, 19, '%', 6);
  return g;
}

function breachArea2(rnd) { // Decontamination: three chambers in a line, curtained, with rooms off them
  const g = new MapGrid(44, 20);
  g.floor(1, 7, 42, 12);
  g.set(0, 9, '<');
  for (const x of [13, 27]) { g.vline(x, 7, 12, '#'); g.fill(x, 9, x, 10, ';'); }
  // north: the pump room (a valve), the suit store, the boiler room
  g.floor(3, 1, 11, 5); g.set(7, 6, '.');
  g.floor(15, 1, 24, 5); g.set(19, 6, '.');
  g.floor(29, 1, 40, 5); g.fill(33, 6, 34, 6, '.');
  // south: the showers (the other valve), the laundry
  g.floor(3, 14, 12, 18); g.set(8, 13, '.');
  g.floor(16, 14, 25, 18); g.set(20, 13, '.');
  // the medical bay: the shelter
  g.fill(28, 13, 43, 19, '#'); g.fill(29, 14, 42, 18, 's'); g.set(34, 13, 'S');
  g.put([[42, 15], [42, 16]], 'l'); g.set(30, 18, 'g'); g.set(38, 14, 't'); g.set(37, 15, 'h'); g.set(35, 16, '*'); g.set(41, 18, 'n');
  g.put([[43, 9], [43, 10]], 'V');
  g.set(4, 1, 'v'); g.set(12, 18, 'v');
  // pumps and tanks, lockers of suits, the boilers; benches along the line
  g.put([[6, 2], [9, 2]], 'm'); g.set(3, 5, 'T');
  for (let x = 16; x <= 23; x++) g.set(x, 1, 'l');
  g.put([[31, 2], [32, 2], [37, 2], [38, 2]], 'T'); g.put([[40, 4], [40, 5]], 'o');
  g.put([[4, 7], [5, 7], [17, 12], [18, 12], [31, 7], [32, 7]], 'b');
  g.put([[17, 17], [18, 17], [23, 15], [24, 15]], 'x'); g.put([[22, 18], [23, 18]], '$');
  for (const [x, z] of [[5, 15], [6, 17], [9, 16], [10, 14], [4, 17]]) g.set(x, z, 'w');
  g.set(20, 10, '&');
  g.put([[6, 9], [20, 9], [35, 10]], 'L'); g.put([[7, 3], [20, 3], [34, 3], [7, 16], [20, 16]], '*'); g.set(41, 8, '!');
  g.scatter(rnd, 1, 7, 42, 12, ':', 14); g.scatter(rnd, 1, 1, 42, 18, '%', 8);
  return g;
}

function breachArea3(rnd) { // Barracks: the dormitory, the mess and the kitchen off one long corridor
  const g = new MapGrid(46, 26);
  g.set(0, 12, '<');
  g.floor(1, 12, 44, 13);
  // the dormitory: bunks along both walls and back to back down the middle, a footlocker at each
  g.floor(1, 1, 30, 10); g.put([[8, 11], [22, 11]], '.');
  for (const x of [3, 7, 11, 15, 19, 23, 27]) { g.set(x, 1, 'g'); g.set(x, 5, 'g'); g.set(x, 6, 'g'); g.set(x, 10, 'g'); g.set(x, 2, 'x'); g.set(x, 9, 'x'); }
  // the mess: long tables and benches
  g.floor(1, 15, 30, 24); g.fill(14, 14, 17, 14, '.');
  for (const tz of [17, 21]) for (const [x0, x1] of [[4, 11], [19, 26]]) for (let x = x0; x <= x1; x++) { g.set(x, tz, 't'); if (x % 2 === 0) { g.set(x, tz - 1, 'b'); g.set(x, tz + 1, 'b'); } }
  // the kitchen
  g.floor(33, 15, 44, 24); g.set(38, 14, '.');
  for (let x = 36; x <= 41; x++) g.set(x, 18, 't');
  g.put([[44, 17], [44, 18], [44, 19]], '$'); g.put([[34, 23], [35, 23]], 'T'); g.put([[42, 23], [43, 23], [43, 22]], 'X');
  // the officers' quarters: the shelter
  g.fill(32, 0, 45, 11, '#'); g.fill(33, 1, 44, 10, 's'); g.set(38, 11, 'S');
  g.set(34, 2, 'g'); g.set(42, 3, 't'); g.set(42, 4, 'h'); g.put([[44, 6], [44, 7]], 'l'); g.set(38, 6, '*'); g.set(43, 10, 'n');
  g.put([[45, 12], [45, 13]], 'N');
  g.set(30, 4, '1'); g.set(1, 20, '2'); g.set(44, 24, '3'); g.set(17, 1, '4');
  g.set(15, 19, '&');
  g.put([[8, 3], [16, 8], [24, 3], [8, 19], [22, 19], [36, 12]], 'L'); g.set(38, 20, '*'); g.set(43, 13, '!');
  g.scatter(rnd, 1, 12, 44, 13, ':', 10); g.scatter(rnd, 1, 1, 44, 24, '%', 10);
  return g;
}

function breachArea4(rnd) { // Operations: the plotting table, the stations round it, radio and cipher rooms
  const g = new MapGrid(44, 26);
  g.set(0, 12, '<');
  g.floor(1, 11, 6, 13);
  g.floor(7, 6, 32, 20);
  // the plotting table in the middle of the floor
  g.fill(16, 11, 23, 14, 'T');
  // stations round the walls
  for (let x = 9; x <= 30; x += 3) { g.set(x, 6, 'q'); g.set(x, 7, 'h'); }
  for (const x of [9, 12, 27, 30]) { g.set(x, 20, 'q'); g.set(x, 19, 'h'); }
  // the radio room and the cipher room off the north wall; the map store and the commander off the south
  g.floor(8, 1, 19, 4); g.set(13, 5, '.');
  g.floor(22, 1, 31, 4); g.set(26, 5, '.');
  g.put([[9, 1], [10, 1], [11, 1]], 'q'); g.set(10, 2, 'h'); g.put([[17, 1], [18, 1]], 'R');
  g.set(31, 1, 'Q'); g.put([[22, 1], [23, 1]], 'd'); g.set(28, 3, 't'); g.set(28, 2, 'h');
  g.floor(8, 22, 18, 24); g.set(13, 21, '.');
  g.put([[8, 22], [9, 22], [10, 22], [17, 24], [18, 24]], 'd'); g.put([[12, 24], [13, 24], [14, 24]], '$');
  g.fill(21, 21, 33, 25, '#'); g.fill(22, 22, 32, 24, 's'); g.set(25, 21, 'S');
  g.set(30, 23, 't'); g.set(30, 22, 'h'); g.put([[32, 22], [32, 23]], 'l'); g.set(24, 23, '*'); g.set(22, 24, 'n');
  // the way out: a corridor to the blast door
  g.floor(33, 11, 42, 15);
  g.put([[43, 12], [43, 13], [43, 14]], 'H');
  g.set(12, 16, '&');
  g.put([[12, 9], [27, 9], [12, 17], [27, 17], [37, 13]], 'L'); g.put([[13, 2], [27, 2], [13, 23]], '*'); g.set(41, 11, '!');
  g.scatter(rnd, 7, 6, 32, 20, ':', 12); g.scatter(rnd, 1, 1, 42, 24, '%', 8);
  return g;
}

function breachArea5(rnd) { // The Hatch: a concrete well, a platform in the middle of it, and the hatch overhead
  const g = new MapGrid(40, 30);
  g.set(0, 14, '<');
  g.floor(1, 13, 8, 15);
  g.floor(9, 2, 38, 27);
  // the platform, under the shaft, railed round with a way on at each side
  g.fill(19, 10, 27, 18, 'z');
  for (let x = 18; x <= 28; x++) { g.set(x, 9, 'Y'); g.set(x, 19, 'Y'); }
  for (let z = 10; z <= 18; z++) if (z < 13 || z > 15) { g.set(18, z, 'Y'); g.set(28, z, 'Y'); }
  // the control booth on the north wall
  g.set(23, 2, 'u'); g.put([[21, 2], [22, 2], [24, 2], [25, 2]], 'q');
  // gas bottles, drums, crates, a ring of sandbags round where the garrison made its last stand
  g.put([[10, 2], [11, 2], [12, 2]], 'T'); g.put([[36, 2], [37, 2], [37, 3]], 'X'); g.put([[34, 26], [35, 26], [36, 26]], 'o');
  for (const [x, z] of [[14, 9], [15, 8], [16, 7], [30, 7], [31, 8], [32, 9], [14, 20], [15, 21], [31, 21], [32, 20]]) g.set(x, z, 'x');
  g.put([[38, 10], [38, 11], [38, 12]], '$');
  // the blast lock by the way in: the shelter
  g.fill(8, 21, 17, 29, '#'); g.fill(9, 22, 16, 28, 's'); g.set(13, 21, 'S');
  g.put([[16, 23], [16, 24]], 'l'); g.set(10, 28, 't'); g.set(11, 27, 'h'); g.set(12, 25, '*'); g.set(15, 28, 'n');
  g.set(33, 22, '&');
  g.put([[13, 6], [33, 6], [13, 24], [33, 16]], 'L'); g.put([[17, 8], [29, 8], [17, 20], [29, 20]], '!'); g.set(23, 4, '*');
  g.scatter(rnd, 9, 2, 38, 27, ':', 24); g.scatter(rnd, 9, 2, 38, 27, '%', 8);
  return g;
}

const BREACH_BUILDERS = [breachArea1, breachArea2, breachArea3, breachArea4, breachArea5];
LEVELS.l3 = { key: 'l3', title: 'Breach - A1', builders: BREACH_BUILDERS, meta: BREACH_META, seed: 70310, monster: 'pale' };

// ---------- the rooms ----------
// a ceiling-mounted rotating beacon: a base, a red dome, the reflector inside it that turns
function beacon(B, f, y, down = true) {
  f.cyl(B, BM.gunmetal, 0, y, 0, 0.09, 0.11, 0.08, 14);
  f.sphere(B, plainMat(0x5a0a06, { roughness: 0.2, transparent: true, opacity: 0.85, ws: false }), 0, y + (down ? -0.06 : 0.06), 0, 0.085, down ? -0.9 : 0.9);
}
function showerHead(B, f, ceil) {
  f.cyl(B, PM.chrome, 0, (ceil + 2.15) / 2, 0.04, 0.012, 0.012, ceil - 2.15, 8);
  f.cyl(B, PM.chrome, 0, 2.15, 0.12, 0.012, 0.012, 0.18, 8, Math.PI / 2);
  f.cyl(B, PM.chrome, 0, 2.12, 0.22, 0.05, 0.03, 0.04, 12, 0.4);
  f.cyl(B, PM.chrome, 0.15, 1.15, 0.05, 0.03, 0.03, 0.03, 10, Math.PI / 2);
}
function hazmatSuit(B, f, x, rnd) {
  const o = BM.hazmat, vis = plainMat(0x1a2224, { roughness: 0.08, metalness: 0.3 }), sway = (rnd() - 0.5) * 0.12;
  f.cbox(B, PM.chrome, x, 2.02, 0, 0.36, 0.02, 0.02, 0.004);
  f.cyl(B, o, x, 1.62, 0, 0.17, 0.15, 0.62, 12, sway);
  f.sphere(B, o, x, 2.0, 0, 0.15, 1.2);
  f.geo(B, vis, cachedGeo('suitVisor', () => new THREE.CircleGeometry(0.1, 16)), x, 2.0, 0.15, 0, -0.1);
  for (const s of [-1, 1]) {
    f.cyl(B, o, x + s * 0.2, 1.55, 0, 0.055, 0.05, 0.6, 8, sway, s * 0.12);
    f.cyl(B, o, x + s * 0.08, 0.97, 0, 0.07, 0.065, 0.62, 8, sway * 0.5);
    f.cyl(B, BM.rubber, x + s * 0.08, 0.62, 0.03, 0.065, 0.07, 0.12, 8);
  }
}
function remains(B, f, rnd) {
  // what is left of one of them: the uniform, a helmet, the boots - and very little else
  const bone = plainMat(0xc8c0a8, { roughness: 0.6 });
  f.cbox(B, BM.drab, 0, 0.12, 0.2, 0.5, 0.18, 0.4, 0.08, 0.2);
  f.cbox(B, BM.drab, 0.4, 0.06, 0.45, 0.7, 0.1, 0.22, 0.05, 0.6);
  f.sphere(B, plainMat(0x3a3e2a, { roughness: 0.5, metalness: 0.2 }), -0.35, 0.09, 0.55, 0.16, 0.55);
  for (const [x, z, r] of [[0.75, 0.75, 0.3], [0.85, 0.5, -0.4]]) f.cbox(B, BM.rubber, x, 0.07, z, 0.12, 0.14, 0.28, 0.04, r);
  for (let k = 0; k < 7; k++) f.cyl(B, bone, (rnd() - 0.5) * 1.2, 0.02, 0.3 + rnd() * 0.8, 0.012, 0.014, 0.18 + rnd() * 0.2, 6, Math.PI / 2, rnd() * 3);
  f.sphere(B, bone, 0.2, 0.06, 0.95, 0.07, 1.1);
  f.geo(B, decalMat('blood'), cachedGeo('remBlood', () => new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2)), 0.1, 0.009, 0.5, rnd() * 6);
  f.geo(B, decalMat('drag'), cachedGeo('remDrag', () => new THREE.PlaneGeometry(0.9, 3.0).rotateX(-Math.PI / 2)), 0.3, 0.008, 2.1, 0.3);
}
function floorLine(B, a, pts, col = 0xc8a02a) {
  const m = plainMat(col, { roughness: 0.6, transparent: true, opacity: 0.75, ws: { ao: 1, grime: 1, wet: 0 } });
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0);
    B.add(m, cachedGeo('fl' + len.toFixed(2), () => new THREE.PlaneGeometry(0.12, len).rotateX(-Math.PI / 2)), xform(a.offX + (x0 + x1) / 2, 0.007, a.offZ + (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0)));
  }
}
function bunkerSign(B, f, text, y, w = 1.4, opts = {}) {
  const h = w / 6.4;
  f.cbox(B, opts.plate || plainMat(0x1c2420, { roughness: 0.5 }), 0, y, 0.012, w + 0.04, h + 0.04, 0.02, 0.004);
  f.geo(B, labelMat(text, { bg: opts.bg || '#1c2420', fg: opts.fg || '#d8d4c0', w: 1024, h: 160, size: 92 }), planeGeo(w, h), 0, y, 0.024);
}
Object.assign(SET_PIECES, {
  bunker(L, B, a, ai, r) {
    buildLiftCar(L, B);
    const ceil = a.ceil;
    // A-1, stencilled across the end wall in letters a metre high; the way on signed over the door
    areaFrame(a, 32.98, 10.0, -Math.PI / 2).geo(B, breachArt('stencil', 0), planeGeo(2.6, 1.3), 0, 1.95, 0);
    bunkerSign(B, areaFrame(a, 32.98, 7.0, -Math.PI / 2), 'SECTOR 1  ·  DECONTAMINATION  →', 2.72, 1.9);
    bunkerSign(B, areaFrame(a, 14.02, 3.6, Math.PI / 2), 'GUARD POST', 2.55, 1.0);
    WALL_ITEMS.roster(B, areaFrame(a, 14.02, 3.6, Math.PI / 2), r);
    WALL_ITEMS.shelterSign(B, areaFrame(a, 29.5, 11.98, Math.PI), r);
    // the field telephone on the guard's desk, a helmet beside it
    WALL_ITEMS.fieldPhone(B, areaFrame(a, 6.02, 3.2, Math.PI / 2), r);
    const dk = areaFrame(a, 8.9, 2.4, 0);
    dk.sphere(B, plainMat(0x3a3e2a, { roughness: 0.5, metalness: 0.2 }), 0.3, 0.84, 0.1, 0.14, 0.55);
    dk.cbox(B, PM.paper, -0.25, 0.79, 0.05, 0.3, 0.01, 0.22, 0.002, 0.2);
    // beacons either side of the lift; the painted line from the lift to the way on
    for (const z of [10.3, 13.7]) beacon(B, areaFrame(a, 6.15, z, Math.PI / 2), 2.95);
    floorLine(B, a, [[6.3, 11.5], [10.5, 11.5], [10.5, 9.5], [30.5, 9.5], [30.5, 7.0], [32.6, 7.0]]);
    // one of them, by the south wall, and the marks above where it happened
    remains(B, areaFrame(a, 11.5, 18.4, Math.PI), r);
    WALL_ITEMS.highScratch(B, areaFrame(a, 11.5, 19.98, Math.PI), r);
    WALL_ITEMS.graffiti(B, areaFrame(a, 22.98, 16.5, -Math.PI / 2), () => 0.05);
    WALL_ITEMS.cdPoster(B, areaFrame(a, 19.5, 2.02, 0), () => 0.1);
    WALL_ITEMS.cdPoster(B, areaFrame(a, 25.5, 2.02, 0), () => 0.5);
  },
  decon(L, B, a, ai, r) {
    const ceil = a.ceil;
    // the showers down both walls of the second and third chambers
    for (const x of [15.5, 17.5, 22.5, 24.5, 29.5, 31.5, 37.5, 39.5]) {
      showerHead(B, areaFrame(a, x, 7.02, 0), ceil);
      if (x !== 33.5 && x !== 34.5) showerHead(B, areaFrame(a, x, 12.98, Math.PI), ceil);
    }
    for (const x of [20.0, 35.0]) for (const z of [8.6, 11.4]) B.add(plainMat(0x101210, { roughness: 0.4, metalness: 0.5 }), cachedGeo('drain', () => new THREE.CircleGeometry(0.16, 16).rotateX(-Math.PI / 2)), xform(a.offX + x, 0.006, a.offZ + z, 0));
    for (const x of [12.75, 14.25, 26.75, 28.25]) B.add(hazardMat(), cachedGeo('deconStripe', () => { const g = new THREE.PlaneGeometry(0.25, 5.8).rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * 6, uv.getX(i)); return g; }), xform(a.offX + x, 0.006, a.offZ + 10, 0));
    // the procedure, posted where you come in; the chamber numbers over the curtains
    areaFrame(a, 6.5, 7.02, 0).geo(B, breachArt('decon', 0), planeGeo(1.4, 1.0), 0, 1.65, 0.004);
    bunkerSign(B, areaFrame(a, 12.98, 8.0, -Math.PI / 2), 'DECON 2', 2.6, 0.9);
    bunkerSign(B, areaFrame(a, 26.98, 8.0, -Math.PI / 2), 'DECON 3', 2.6, 0.9);
    bunkerSign(B, areaFrame(a, 42.98, 9.5, -Math.PI / 2), 'SECTOR 2  ·  BARRACKS  →', 2.65, 1.6);
    // the suits, still on their rail
    const sr = areaFrame(a, 20.0, 5.98, Math.PI);
    for (const x of [-4.2, -3.2, -2.2, 1.2, 2.2, 3.2, 4.2]) hazmatSuit(B, frame(...sr.at(x, 0.3), sr.rot), 0, r);
    // the pump room's mains, the boilers' flue
    const pm = areaFrame(a, 7.0, 1.02, 0);
    for (const [y, rad] of [[2.5, 0.14], [2.15, 0.1]]) pm.cyl(B, mat('rust'), 0, y, 0.25, rad, rad, 8.0, 14, 0, Math.PI / 2);
    const bl = areaFrame(a, 34.5, 1.02, 0);
    bl.cyl(B, mat('metal', { color: 0x5a5e5a }), 0, 2.3, 0.3, 0.2, 0.2, 11.0, 16, 0, Math.PI / 2);
    // shower stalls along the south wall of the showers; the washers in the laundry
    const st = areaFrame(a, 7.5, 18.98, Math.PI);
    for (let k = -3; k <= 3; k++) { st.cbox(B, plainMat(0xc8ccc4, { roughness: 0.35 }), k * 1.2 + 0.6, 1.0, 0.55, 0.04, 2.0, 1.1, 0.01); if (k < 3) showerHead(B, frame(...st.at(k * 1.2 + 1.2, 0), st.rot), ceil); }
    for (const z of [14.6, 16.0]) {
      const wf = areaFrame(a, 25.98, z, -Math.PI / 2);
      wf.cbox(B, plainMat(0xb8bcb4, { roughness: 0.4, metalness: 0.3 }), 0, 0.6, 0.38, 0.75, 1.2, 0.7, 0.03);
      wf.cyl(B, plainMat(0x1a2024, { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8, ws: false }), 0, 0.65, 0.74, 0.22, 0.22, 0.02, 20, Math.PI / 2);
      wf.cyl(B, PM.chrome, 0, 0.65, 0.73, 0.25, 0.25, 0.02, 20, Math.PI / 2);
      addCollider(L, a.offX + 25.6, a.offZ + z, 0.4);
    }
    // the medical bay: a red cross, the cabinet, a drip stand
    WALL_ITEMS.firstaid(B, areaFrame(a, 36.0, 14.02, 0), r);
    ivStand(B, areaFrame(a, 31.0, 17.2, 0.3)); addCollider(L, a.offX + 31.0, a.offZ + 17.2, 0.18);
    WALL_ITEMS.graffiti(B, areaFrame(a, 20.5, 12.98, Math.PI), () => 0.3);
  },
  barracks(L, B, a, ai, r) {
    // helmets and kit on the bunks, photographs over them
    for (const x of [3, 7, 11, 15, 19, 23, 27]) {
      if (r() < 0.6) areaFrame(a, x + 0.5 + (r() - 0.5), 2.02, 0).geo(B, wardArt('drawing', Math.floor(r() * 4)), planeGeo(0.18, 0.13), 0, 1.75, 0.004, 0, 0, (r() - 0.5) * 0.3);
      if (r() < 0.35) areaFrame(a, x + 0.5, 5.5, 0).sphere(B, plainMat(0x3a3e2a, { roughness: 0.5, metalness: 0.2 }), (r() - 0.5) * 1.2, 1.62, 0, 0.14, 0.55);
    }
    // the mess: the board with the menu nobody changed, and the days counted under it
    const mb = areaFrame(a, 15.5, 24.98, Math.PI);
    mb.cbox(B, mat('wood', { color: 0x5a4430 }), 0, 1.6, 0.02, 2.2, 1.2, 0.04, 0.01);
    mb.geo(B, labelMat('MENU · DAY 4,018 · BEANS', { bg: '#1e2420', fg: '#d8d8cc', w: 1024, h: 128, size: 64, font: 'cursive' }), planeGeo(2.0, 0.25), 0, 1.95, 0.045);
    mb.geo(B, artMat('tally', 1), planeGeo(1.8, 0.8), 0, 1.4, 0.045);
    bunkerSign(B, areaFrame(a, 44.98, 12.5, -Math.PI / 2), 'SECTOR 3  ·  ARMOURY', 2.65, 1.4);
    bunkerSign(B, areaFrame(a, 8.5, 11.02, 0), 'DORMITORY', 2.55, 1.0);
    bunkerSign(B, areaFrame(a, 15.5, 13.98, Math.PI), 'MESS', 2.55, 0.8);
    // the kitchen: pots on the range, the sacks, the tins
    const kt = areaFrame(a, 38.5, 18.5, 0);
    for (const x of [-2, -0.6, 0.9, 2.2]) { kt.cyl(B, plainMat(0x8a8c88, { roughness: 0.3, metalness: 0.8 }), x, 0.92, 0, 0.2, 0.18, 0.3, 16); if (r() < 0.5) kt.cyl(B, plainMat(0x8a8c88, { roughness: 0.3, metalness: 0.8 }), x, 1.08, 0, 0.21, 0.21, 0.02, 16); }
    for (let k = 0; k < 5; k++) areaFrame(a, 34.2 + k * 0.5, 15.4, r()).cbox(B, BM.sandbag, 0, 0.25, 0, 0.42, 0.5, 0.3, 0.12);
    // the officers' quarters: the commander's portrait, a flag, the radio on the desk
    WALL_ITEMS.portrait(B, areaFrame(a, 42.0, 1.02, 0), () => 0.4);
    const fl = areaFrame(a, 36.0, 1.02, 0);
    fl.cbox(B, plainMat(0x2a3a5a, { roughness: 0.8 }), 0, 1.9, 0.02, 1.0, 0.6, 0.01, 0.003);
    fl.cbox(B, plainMat(0xb8b0a0, { roughness: 0.8 }), 0, 1.9, 0.026, 1.0, 0.12, 0.006, 0.002);
    const rd = areaFrame(a, 42.0, 3.0, 0); rd.cbox(B, plainMat(0x3a2e22, { roughness: 0.5 }), 0, 0.88, 0, 0.36, 0.2, 0.2, 0.02); rd.cyl(B, plainMat(0xc8b890, { roughness: 0.4 }), -0.08, 0.9, 0.105, 0.05, 0.05, 0.01, 14, Math.PI / 2);
    WALL_ITEMS.graffiti(B, areaFrame(a, 30.98, 8.0, -Math.PI / 2), () => 0.18);
  },
  command(L, B, a, ai, r) {
    const ceil = a.ceil;
    // the plotting table: the hemisphere under glass, the markers where it fell, a rail to lean on
    const pt = areaFrame(a, 20.0, 13.0, 0), dk = plainMat(0x2a2620, { roughness: 0.5 });
    pt.cbox(B, dk, 0, 0.45, 0, 7.8, 0.9, 3.8, 0.04);
    pt.geo(B, breachArt('plot', 0), cachedGeo('plotTop', () => new THREE.PlaneGeometry(7.6, 3.6).rotateX(-Math.PI / 2)), 0, 0.905, 0);
    pt.geo(B, plainMat(0xa8c8d8, { roughness: 0.05, transparent: true, opacity: 0.12, ws: false }), cachedGeo('plotGlass', () => new THREE.PlaneGeometry(7.6, 3.6).rotateX(-Math.PI / 2)), 0, 0.93, 0);
    for (const z of [-1.95, 1.95]) pt.cbox(B, PM.chrome, 0, 0.98, z, 7.9, 0.04, 0.04, 0.01);
    for (const x of [-3.95, 3.95]) pt.cbox(B, PM.chrome, x, 0.98, 0, 0.04, 0.04, 3.9, 0.01);
    for (let k = 0; k < 18; k++) { const mx = (r() - 0.5) * 7, mz = (r() - 0.5) * 3.2; pt.cyl(B, plainMat(k % 3 ? 0xa81a12 : 0x1a3a7a, { roughness: 0.4 }), mx, 0.96, mz, 0.0, 0.05, 0.12, 6); }
    for (let k = 0; k < 2; k++) pt.cbox(B, mat('wood', { color: 0x6a5240 }), -1 + k * 2.5, 0.97, 0.4, 1.2, 0.02, 0.05, 0.004, 0.3 + k);
    // the clocks of four capitals, all stopped at once; the city map on the far wall
    areaFrame(a, 19.5, 6.02, 0).geo(B, breachArt('clocks', 0), planeGeo(4.0, 1.0), 0, ceil - 0.65, 0.004);
    const wm = areaFrame(a, 19.5, 20.98, Math.PI);
    wm.cbox(B, mat('wood', { color: 0x4a3626 }), 0, 2.0, 0.02, 6.3, 2.5, 0.04, 0.01);
    wm.geo(B, breachArt('wallmap', 0), planeGeo(6.0, 2.3), 0, 2.0, 0.045);
    bunkerSign(B, areaFrame(a, 42.98, 13.0, -Math.PI / 2), 'SECTOR 5  ·  HATCH', 2.75, 1.4, { bg: '#5a1410', fg: '#f0e8d8', plate: plainMat(0x5a1410, { roughness: 0.5 }) });
    bunkerSign(B, areaFrame(a, 13.5, 5.98, Math.PI), 'SIGNALS', 2.6, 0.9);
    bunkerSign(B, areaFrame(a, 26.5, 5.98, Math.PI), 'CIPHER', 2.6, 0.9);
    // the radio room: the big set, the headphones on the desk, the teletype and its paper all over the floor
    const rr = areaFrame(a, 10.0, 1.02, 0);
    rr.cbox(B, plainMat(0x3a3e36, { roughness: 0.45, metalness: 0.5 }), 0, 1.75, 0.25, 2.6, 0.9, 0.5, 0.02);
    for (let k = 0; k < 10; k++) rr.cyl(B, plainMat(0x1a1a18, { roughness: 0.3 }), -1.1 + k * 0.24, 1.85, 0.51, 0.04, 0.04, 0.03, 12, Math.PI / 2);
    for (let k = 0; k < 4; k++) rr.cyl(B, plainMat(0xd8d0b0, { roughness: 0.3 }), -0.9 + k * 0.6, 1.55, 0.51, 0.07, 0.07, 0.01, 16, Math.PI / 2);
    const tt = areaFrame(a, 15.0, 2.0, 0.2); tt.cbox(B, plainMat(0x5a5a50, { roughness: 0.4, metalness: 0.4 }), 0, 0.5, 0, 0.6, 1.0, 0.5, 0.03);
    for (let k = 0; k < 9; k++) B.add(decalMat('paper'), cachedGeo('decalPaper', () => new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2)), xform(a.offX + 13.5 + r() * 4, 0.011 + k * 0.0003, a.offZ + 2 + r() * 2.5, r() * 6));
    // the commander's desk: the red telephone
    rotaryPhone(B, areaFrame(a, 30.0, 23.0, 0), 0.1, 0.78, 0.1, 0.4);
    WALL_ITEMS.graffiti(B, areaFrame(a, 32.98, 17.5, -Math.PI / 2), () => 0.6);
  },
  silo(L, B, a, ai, r) {
    const ceil = a.ceil, top = a.liftH || 14;
    // the platform: hazard edge, railings round it with a way on each side
    const px0 = 19, px1 = 28, pz0 = 10, pz1 = 19, cx = (px0 + px1) / 2, cz = (pz0 + pz1) / 2;
    for (const [x, z, w, d] of [[cx, pz0 + 0.12, 9, 0.24], [cx, pz1 - 0.12, 9, 0.24], [px0 + 0.12, cz, 0.24, 9], [px1 - 0.12, cz, 0.24, 9]]) B.add(hazardMat(), cachedGeo('platEdge' + w, () => { const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) * 2, uv.getY(i)); return g; }), xform(a.offX + x, 0.012, a.offZ + z, 0));
    const rail = BM.steel;
    const runRail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), f = frame(a.offX + (x0 + x1) / 2, a.offZ + (z0 + z1) / 2, Math.atan2(z1 - z0, x1 - x0) * -1);
      for (const y of [0.55, 1.1]) f.cyl(B, hazardMat(), 0, y, 0, 0.025, 0.025, len, 10, 0, Math.PI / 2);
      for (let k = 0; k <= Math.round(len / 1.5); k++) f.cyl(B, rail, -len / 2 + k * len / Math.round(len / 1.5), 0.56, 0, 0.03, 0.03, 1.12, 10);
    };
    runRail(18.5, 9.5, 28.5, 9.5); runRail(18.5, 19.5, 28.5, 19.5);
    runRail(18.5, 9.5, 18.5, 12.9); runRail(18.5, 16.1, 18.5, 19.5); runRail(28.5, 9.5, 28.5, 12.9); runRail(28.5, 16.1, 28.5, 19.5);
    // the control booth: the screens and switches either side of the hatch control
    bunkerSign(B, areaFrame(a, 23.5, 2.02, 0), 'SURFACE HATCH  ·  CYCLE 30 S', 2.7, 2.2, { bg: '#5a1410', fg: '#f0e8d8', plate: plainMat(0x5a1410, { roughness: 0.5 }) });
    // a gantry round the shaft lip, high up, with a ladder down to the floor
    const gm = BM.gunmetal;
    for (const [x0, z0, x1, z1] of [[9.2, 3.0, 38.0, 3.0], [37.8, 3.0, 37.8, 26.8]]) {
      const len = Math.hypot(x1 - x0, z1 - z0), f = frame(a.offX + (x0 + x1) / 2, a.offZ + (z0 + z1) / 2, x0 === x1 ? -Math.PI / 2 : 0);
      f.cbox(B, mat('grate'), 0, 5.0, 0, len, 0.06, 1.6, 0.01);
      f.cbox(B, gm, 0, 6.05, 0.78, len, 0.05, 0.05, 0.01); f.cbox(B, gm, 0, 5.5, 0.78, len, 0.04, 0.04, 0.01);
      for (let k = 0; k <= Math.floor(len / 3); k++) { f.cbox(B, gm, -len / 2 + k * 3, 5.55, 0.78, 0.05, 1.1, 0.05, 0.01); f.cbox(B, gm, -len / 2 + k * 3, 4.8, -0.7, 0.08, 0.4, 0.08, 0.01, 0, 1, 0.8); }
    }
    const ld = areaFrame(a, 38.98, 6.0, -Math.PI / 2);
    for (const s of [-0.25, 0.25]) ld.cbox(B, gm, s, 2.5, 0.2, 0.05, 5.0, 0.05, 0.01);
    for (let y = 0.3; y < 5; y += 0.3) ld.cbox(B, gm, 0, y, 0.2, 0.5, 0.03, 0.03, 0.005);
    // big stencils, the arrows in to the platform, sandbag rings, and what the garrison left at the end
    areaFrame(a, 38.98, 18.0, -Math.PI / 2).geo(B, breachArt('stencil', 4), planeGeo(3.2, 1.6), 0, 2.4, 0);
    floorLine(B, a, [[1.0, 14.5], [18.0, 14.5]]);
    floorLine(B, a, [[23.5, 3.0], [23.5, 8.8]]);
    remains(B, areaFrame(a, 30.5, 23.5, 0.5), r);
    WALL_ITEMS.highScratch(B, areaFrame(a, 38.98, 23.0, -Math.PI / 2), r);
    WALL_ITEMS.graffiti(B, areaFrame(a, 9.02, 9.0, Math.PI / 2), () => 0.75);
    WALL_ITEMS.graffiti(B, areaFrame(a, 9.02, 18.5, Math.PI / 2), () => 0.9);
    // the shaft above the platform, up to the hatch: its lip, rungs up the wall, lamps
    for (const [x0, z0, x1, z1, rot] of [[px0 + 0.5, pz0 + 0.5, px1 - 0.5, pz0 + 0.5, 0], [px0 + 0.5, pz1 - 0.5, px1 - 0.5, pz1 - 0.5, Math.PI]]) {
      const f = frame(a.offX + (x0 + x1) / 2, a.offZ + (z0 + z1) / 2, rot);
      f.cbox(B, hazardMat(), 0, ceil + 0.06, -0.48, x1 - x0 + 1, 0.12, 0.04, 0.005);
    }
    for (let y = ceil + 0.4; y < top - 0.5; y += 0.4) areaFrame(a, px1 - 0.98, cz, -Math.PI / 2).cbox(B, gm, 0, y, 0.12, 0.45, 0.03, 0.03, 0.005);
    Breach.silo = { a, ai, cx: a.offX + cx, cz: a.offZ + cz, top };
  },
});

// ---------- the hatch: the moving parts, and the platform's control ----------
// Overhead, at the top of the shaft: a ring of concrete with a round steel door in it, two leaves on hinges at
// the sides, eight locking dogs round the rim. While it cycles the beacons turn, the klaxon goes, the dogs draw
// back one by one; then the leaves crack open and grey light comes down the shaft onto the platform.
const Breach = { hatch: null, silo: null };
function buildHatch() {
  const S = Breach.silo; if (!S) return null;
  const g = new THREE.Group(), y0 = S.top - 1.0, R0 = 3.55;
  g.position.set(S.cx, 0, S.cz);
  const conc = mat('concreteDark'), steel = mat('steel', { color: 0x6a6c66 }), dk = mat('steelDark');
  const ring = new THREE.Mesh(new THREE.RingGeometry(R0, 6.5, 56, 1).rotateX(Math.PI / 2), conc); ring.position.y = y0 - 0.25; g.add(ring);
  const ringTop = new THREE.Mesh(new THREE.RingGeometry(R0, 6.5, 56, 1).rotateX(-Math.PI / 2), conc); ringTop.position.y = y0 + 0.45; g.add(ringTop);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, 0.7, 56, 1, true), plainMat(0x4a4c48, { roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide })); rim.position.y = y0 + 0.1; g.add(rim);
  const band = new THREE.Mesh(new THREE.RingGeometry(R0, R0 + 0.35, 56, 1).rotateX(Math.PI / 2), hazardMat()); band.position.y = y0 - 0.26; g.add(band);
  // the sky, for when it opens: a grey disc above the leaves, glowing
  const skyM = new THREE.MeshBasicMaterial({ color: 0x8a8a84 });
  const sky = new THREE.Mesh(new THREE.CircleGeometry(R0 + 0.1, 48).rotateX(Math.PI / 2), skyM); sky.position.y = y0 + 0.62; g.add(sky);
  const leaves = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(s * R0, y0, 0); g.add(hinge);
    const leaf = new THREE.Group(); leaf.position.x = -s * R0; hinge.add(leaf);
    const geo = new THREE.CylinderGeometry(R0 - 0.04, R0 - 0.04, 0.28, 40, 1, false, s > 0 ? 0 : Math.PI, Math.PI);
    const plate = new THREE.Mesh(geo, steel); leaf.add(plate);
    const under = new THREE.Mesh(new THREE.CircleGeometry(R0 - 0.3, 40, s > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI).rotateX(Math.PI / 2), hazardMat()); under.position.y = -0.145; leaf.add(under);
    for (let k = -2; k <= 2; k++) { const rib = new THREE.Mesh(boxGeo(0.12, 0.16, Math.sqrt(Math.max(0.1, R0 * R0 - (k * 0.9) ** 2)) * 1.9), dk); rib.position.set(s * (0.6 + Math.abs(k) * 0.55), -0.22, 0); rib.position.x = s * (0.4 + (k + 2) * 0.65); rib.scale.z = Math.sqrt(Math.max(0.05, 1 - ((k + 2) * 0.65 + 0.4) ** 2 / (R0 * R0))); leaf.add(rib); }
    if (s > 0) { const wheel = new THREE.Mesh(torusGeo(0.5, 0.06, 8, 28), dk); wheel.rotation.x = Math.PI / 2; wheel.position.set(0.7, -0.4, 0); leaf.add(wheel); for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(boxGeo(1.0, 0.05, 0.05), dk); sp.rotation.y = k * Math.PI / 3; sp.position.set(0.7, -0.4, 0); leaf.add(sp); } }
    leaves.push(hinge);
  }
  const dogs = [];
  for (let k = 0; k < 8; k++) {
    const a = (k + 0.5) / 8 * Math.PI * 2, d = new THREE.Mesh(cboxGeo(0.7, 0.3, 0.32, 0.03), dk);
    d.position.set(Math.cos(a) * (R0 - 0.1), y0 - 0.05, Math.sin(a) * (R0 - 0.1)); d.rotation.y = -a; g.add(d);
    dogs.push({ m: d, a, out: 0 });
  }
  // the beacons at the four corners of the shaft lip
  const beacons = [];
  for (const [x, z] of [[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3]]) {
    const b = new THREE.Group(); b.position.set(x, S.a.ceil + 0.25, z);
    b.add(new THREE.Mesh(cylGeo(0.12, 0.14, 0.1, 14), dk));
    const domeM = new THREE.MeshBasicMaterial({ color: 0x3a0604, transparent: true, opacity: 0.9 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeM); dome.position.y = 0.05; b.add(dome);
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.14), new THREE.MeshBasicMaterial({ color: 0xff4020, side: THREE.DoubleSide })); refl.position.y = 0.1; b.add(refl);
    g.add(b); beacons.push({ b, domeM, refl });
  }
  // a shaft of light, for when it opens
  const shaftM = new THREE.MeshBasicMaterial({ color: 0x9a9a92, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.4, S.top - 1, 24, 1, true), shaftM); shaft.position.y = (S.top - 1) / 2; g.add(shaft);
  World.areas[S.ai].group.add(g);
  Breach.hatch = { g, leaves, dogs, beacons, sky, skyM, shaft, shaftM, open: 0, klaxT: 0, dogT: 0, y0 };
  return Breach.hatch;
}
// every frame on A1: the hatch follows the cycle the host is running
function updateBreachWorld(dt, t) {
  const g = Game.g; if (!g || g.lv !== 'l3' || !Breach.silo) return;
  const H = Breach.hatch || buildHatch(); if (!H) return;
  const st = g.lift ? g.lift.st : 0, left = g.lift ? g.lift.t : 0, S = Breach.silo;
  const cycling = st === 1, open = st >= 2;
  // the dogs draw back, one every few seconds, as the clock runs down
  const drawn = open ? 8 : cycling ? Math.floor(clamp((LIFT_WAIT - left) / LIFT_WAIT, 0, 1) * 8.99) : 0;
  H.dogs.forEach((d, i) => {
    const want = i < drawn ? 1 : 0;
    if (want && !d.out && Game.mode === 'play') Sound.play('hatchBolt', { x: S.cx, y: H.y0, z: S.cz });
    d.out = want; const k = damp(d.k || 0, want, 3, dt); d.k = k;
    d.m.position.set(Math.cos(d.a) * (3.45 + k * 0.55), H.y0 - 0.05, Math.sin(d.a) * (3.45 + k * 0.55));
  });
  // the leaves: shut; a shudder as the last dog goes; cracked open, light coming down
  H.open = damp(H.open, open ? 1 : 0, 0.8, dt);
  const shud = cycling && left < 1.5 ? Math.sin(t * 40) * 0.004 : 0;
  H.leaves.forEach((hg, i) => { hg.rotation.z = (i === 0 ? 1 : -1) * (H.open * 0.14 + shud); });
  H.skyM.color.setScalar(0.25 + 0.4 * H.open);
  H.shaftM.opacity = 0.05 * H.open;
  // the beacons and the klaxon while it cycles
  for (const b of H.beacons) { b.refl.rotation.y = t * 6; b.domeM.color.setHex(cycling ? (Math.sin(t * 6) > 0 ? 0xff3018 : 0x8a1008) : 0x2a0604); b.refl.visible = cycling; }
  if (cycling) {
    H.klaxT -= dt;
    if (H.klaxT <= 0) { H.klaxT = 2.6; Sound.play('klaxon', { x: S.cx, y: 6, z: S.cz }); }
    R.backlight.color.setHex(0xff2010); R.backlight.distance = 22;
    R.backlight.position.set(S.cx + Math.cos(t * 3) * 3, S.a.ceil - 0.5, S.cz + Math.sin(t * 3) * 3);
    R.backlight.intensity = 30 * Math.pow(0.5 + 0.5 * Math.sin(t * 6), 2);
  } else if (Game.mode === 'play' && Cinema.mode !== 'ending') R.backlight.intensity = 0;
  // a work lamp on the shaft lip throws its light up onto the underside of the hatch while it is shut
  const here = Game.me && areaAt(Game.L, Game.me.x, Game.me.z) === S.ai;
  if (!open && here && Game.mode === 'play' && Cinema.mode !== 'ending') {
    R.key.color.setHex(0xffd8a8); R.key.angle = 0.9; R.key.penumbra = 0.7; R.key.distance = 12;
    R.key.position.set(S.cx + 4.0, S.a.ceil + 0.3, S.cz + 4.0); R.key.target.position.set(S.cx, S.top, S.cz);
    R.key.intensity = 70;
  }
  // the daylight, down the shaft, once it is open
  if (open && Game.mode === 'play' && Cinema.mode !== 'ending') {
    R.key.color.setHex(0xc8ccd0); R.key.angle = 0.5; R.key.penumbra = 0.9; R.key.distance = 26;
    R.key.position.set(S.cx, S.top - 0.8, S.cz); R.key.target.position.set(S.cx, 0, S.cz);
    R.key.intensity = 160 * H.open;
  }
}
// the platform's control: a console with a guarded red button and the key still in it
THEMES.silo.callButton = (g, D) => {
  const body = new THREE.Mesh(cboxGeo(0.9, 1.1, 0.5, 0.03), mat('metal', { color: 0x5a5e58 })); body.position.set(0, 0.55, 0.25); g.add(body);
  const top = new THREE.Mesh(cboxGeo(0.9, 0.06, 0.55, 0.02), mat('steelDark')); top.position.set(0, 1.12, 0.27); top.rotation.x = 0.3; g.add(top);
  const btn = new THREE.Mesh(cylGeo(0.07, 0.08, 0.06, 18), new THREE.MeshBasicMaterial({ color: 0xffb02e })); btn.position.set(0, 1.19, 0.3); btn.rotation.x = 0.3; g.add(btn); D.button = btn;
  const guard = new THREE.Mesh(cboxGeo(0.2, 0.02, 0.2, 0.004), plainMat(0xa8c0c8, { roughness: 0.1, transparent: true, opacity: 0.45, ws: false })); guard.position.set(0, 1.28, 0.2); guard.rotation.x = -0.9; g.add(guard);
  const key = new THREE.Mesh(cboxGeo(0.02, 0.06, 0.02, 0.004), plainMat(0xb8a878, { roughness: 0.3, metalness: 0.9 })); key.position.set(0.28, 1.2, 0.33); key.rotation.x = 0.3; g.add(key);
  for (let k = 0; k < 3; k++) { const gg = new THREE.Mesh(cylGeo(0.05, 0.05, 0.02, 14), plainMat(0xd8d0b0, { roughness: 0.4 })); gg.rotation.x = Math.PI / 2 + 0.3; gg.position.set(-0.3 + k * 0.12, 1.17, 0.36); g.add(gg); }
  const lbl = new THREE.Mesh(planeGeo(0.5, 0.08), labelMat('HATCH CYCLE', { bg: '#5a1410', fg: '#f0e8d8', w: 256, h: 48, size: 30 })); lbl.position.set(0, 0.9, 0.505); g.add(lbl);
};
