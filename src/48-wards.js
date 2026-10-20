// ================= B5 dressed: a hospital ward sealed in 1979 =================
// Nothing down here is factory stock. The benches are waiting-room benches and chapel pews, the beds are iron
// ward beds with the straps still on them, the desks have typewriters, and every room has its own story: the
// one with the tally marks, the one with the drawings, the padded cell, the theatre, the flooded room, the
// barricade that didn't hold. The day room has its circle of chairs and its piano and, in the middle of it,
// where he sits, a nest. The old wing is older still: panelled, carpeted, a chapel, a library, and a lift
// with a brass gate.

Object.assign(MAT_DEFS, {
  parquet: { tex: 'wood', ns: 0.9, color: 0x6a4a32, tile: 2 },
  darkWood: { tex: 'wood', ns: 0.9, color: 0x3c2618 },
});
const WM = {
  get brass() { return plainMat(0xa8843a, { roughness: 0.32, metalness: 0.95 }); },
  get brassDull() { return plainMat(0x7a6232, { roughness: 0.5, metalness: 0.85 }); },
  get enamel() { return mat('metal', { color: 0xc4c4b8 }); },
  get chipped() { return mat('metal', { color: 0xa8aca0 }); },
  get vinylG() { return mat('fabric', { color: 0x4a6a5a }); },
  get vinylR() { return mat('fabric', { color: 0x6a3428 }); },
  get mattress() { return mat('fabric', { color: 0x8c8a78 }); },
  get sheet() { return mat('fabric', { color: 0xc8c6b8 }); },
  get leather() { return plainMat(0x2e1f16, { roughness: 0.6 }); },
  get velvet() { return mat('fabric', { color: 0x4a1216 }); },
  get padded() { return mat('fabric', { color: 0xbab6a4 }); },
  get plastic() { return plainMat(0x3a6a6a, { roughness: 0.45 }); },
  get orange() { return plainMat(0xa8542a, { roughness: 0.45 }); },
};
const HOSPITAL = new Set(['landing', 'ward', 'dayroom', 'oldwing']);
Object.assign(THEMES.landing, { colLo: 'tileWard', colHi: 'paintWard' });
Object.assign(THEMES.dayroom, { colLo: 'paintDay', colHi: 'paintDay' });
Object.assign(THEMES.oldwing, { liftWall: 'darkWood', liftFloor: 'parquet', liftCeil: 'plaster' });

// ---------- pictures: canvas art for the ward ----------
const WardArt = {};
function wardArt(kind, seed = 0, opts = {}) {
  const key = kind + seed;
  if (WardArt[key]) return WardArt[key];
  const r = mulberry32(seed * 977 + kind.length * 13);
  const sizes = { drawing: [512, 384], portrait: [384, 512], mural: [1024, 512], rose: [512, 512], height: [128, 1024], banner: [1024, 128], book: [512, 256], rug: [256, 1024], cheer: [512, 680], calendar: [384, 512], file: [512, 384], notice9: [512, 680], tvdead: [256, 192] };
  const [W, H] = sizes[kind] || [512, 512];
  const tex = canvasTex(W, H, (g, w, h) => {
    const stencil = (sz, wt = 800, fam = '"Big Shoulders Stencil Display", Impact, sans-serif') => { g.font = wt + ' ' + sz + 'px ' + fam; };
    const age = (n = 2000, a = 0.08) => { for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(70,52,24,' + r() * a + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } };
    if (kind === 'drawing') {
      // crayon on cheap paper: a house, a family - and him, bigger than the house
      g.fillStyle = '#e6dcc4'; g.fillRect(0, 0, w, h);
      const v = seed % 4;
      g.lineCap = 'round'; g.lineJoin = 'round';
      const crayon = (col, wdt) => { g.strokeStyle = col; g.lineWidth = wdt; g.globalAlpha = 0.85; };
      crayon('#2a8a3a', 10); g.beginPath(); g.moveTo(0, 330); for (let x = 0; x <= w; x += 30) g.lineTo(x, 330 + (r() - 0.5) * 14); g.stroke();
      crayon('#e2b52a', 8); g.beginPath(); g.arc(440, 60, 34, 0, 6.28); g.stroke(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28; g.beginPath(); g.moveTo(440 + Math.cos(a) * 44, 60 + Math.sin(a) * 44); g.lineTo(440 + Math.cos(a) * 64, 60 + Math.sin(a) * 64); g.stroke(); }
      const person = (x, y, s, col) => { crayon(col, 5); g.beginPath(); g.arc(x, y - 58 * s, 13 * s, 0, 6.28); g.stroke(); g.beginPath(); g.moveTo(x, y - 45 * s); g.lineTo(x, y - 15 * s); g.lineTo(x - 12 * s, y); g.moveTo(x, y - 15 * s); g.lineTo(x + 12 * s, y); g.moveTo(x - 18 * s, y - 36 * s); g.lineTo(x + 18 * s, y - 36 * s); g.stroke(); };
      if (v !== 2) { person(80, 330, 1.2, '#2a4a9a'); person(130, 330, 1.0, '#9a2a4a'); person(170, 330, 0.7, '#4a2a8a'); }
      // him: a great grey shape, a tiny head, long arms, scribbled over and over
      crayon('#5a5a5a', 6); g.globalAlpha = 0.7;
      const bx = v === 1 ? 300 : 340, by = 330;
      // coloured in hard, back and forth, the way children fill a shape - a solid grey bulk, not an outline
      for (let pass = 0; pass < 2; pass++) {
        g.beginPath();
        for (let k = 0; k <= 64; k++) {
          const yy = by - 228 + k * 3.5, q = (yy - (by - 120)) / 112, half = (64 + r() * 8) * Math.sqrt(Math.max(0, 1 - q * q)) * (1 + 0.25 * (yy > by - 120 ? 1 : 0));
          g.lineTo(bx + (k % 2 ? half : -half) + (r() - 0.5) * 8, yy + pass * 1.7);
        }
        g.stroke();
      }
      g.lineWidth = 9; g.beginPath(); g.moveTo(bx - 8, by - 238); g.lineTo(bx + 8, by - 246); g.moveTo(bx - 8, by - 246); g.lineTo(bx + 8, by - 238); g.stroke();
      crayon('#1a1a1a', 7); g.beginPath(); g.moveTo(bx - 70, by - 170); g.lineTo(bx - 110, by - 30); g.moveTo(bx + 70, by - 170); g.lineTo(bx + 110, by - 30); g.stroke();
      crayon('#c8221a', 6); g.beginPath(); g.arc(bx - 6, by - 242, 3, 0, 6.28); g.arc(bx + 6, by - 242, 3, 0, 6.28); g.stroke();
      g.globalAlpha = 1; g.fillStyle = '#1a1a1a'; g.font = '700 40px "Comic Sans MS", cursive';
      g.fillText(['MY FAMLY', 'HE IS HUNGRY', 'LIGHTS OUT', 'BIG MAN'][v], 40, 60);
      age(1200, 0.06);
    } else if (kind === 'portrait') {
      // an oil portrait gone dark: a man in a collar, and where his face was, the paint scraped back to the board
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a140c'); gr.addColorStop(1, '#2a2012');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16100a'; g.beginPath(); g.ellipse(w / 2, h * 0.95, 160, 220, 0, 0, 6.28); g.fill();
      g.fillStyle = '#d8cdb0'; g.beginPath(); g.moveTo(w / 2 - 40, h * 0.62); g.lineTo(w / 2, h * 0.72); g.lineTo(w / 2 + 40, h * 0.62); g.fill();
      g.fillStyle = '#8a6a4a'; g.beginPath(); g.ellipse(w / 2, h * 0.42, 72, 96, 0, 0, 6.28); g.fill();
      if (seed % 3 !== 2) { g.fillStyle = '#c8b898'; for (let k = 0; k < 260; k++) g.fillRect(w / 2 - 60 + r() * 120, h * 0.3 + r() * 130, 2 + r() * 12, 1 + r() * 3); }
      else { g.fillStyle = '#2a1a10'; g.fillRect(w / 2 - 36, h * 0.38, 22, 10); g.fillRect(w / 2 + 14, h * 0.38, 22, 10); }
      g.fillStyle = '#c8a860'; stencil(22, 600, 'serif'); g.textAlign = 'center';
      g.fillText(['DR. E. HALLORAN · 1931', 'THE FOUNDER', 'MATRON · 1947', 'DR. A. VOSS'][seed % 4], w / 2, h - 18);
      for (let i = 0; i < 3000; i++) { g.fillStyle = 'rgba(0,0,0,' + r() * 0.25 + ')'; g.fillRect(r() * w, r() * h, 1, 1 + r() * 2); }
      g.strokeStyle = 'rgba(200,180,140,0.12)'; for (let i = 0; i < 40; i++) { g.beginPath(); const x = r() * w; g.moveTo(x, r() * h); g.lineTo(x + (r() - 0.5) * 60, r() * h); g.stroke(); }
    } else if (kind === 'mural') {
      // a window painted where there is no window: a summer meadow, faded to grey, the sun's face scratched out
      const sky = g.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, '#6a8aa2'); sky.addColorStop(1, '#b8c8c0');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6a8a4a'; g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += 32) g.lineTo(x, h * 0.6 + Math.sin(x * 0.006 + seed) * 40); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      g.fillStyle = '#4a6a3a'; g.beginPath(); g.moveTo(0, h * 0.78); for (let x = 0; x <= w; x += 32) g.lineTo(x, h * 0.76 + Math.sin(x * 0.011 + 2) * 30); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(240,240,232,0.8)'; const cx = r() * w, cy = 40 + r() * 120; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(cx + j * 26, cy + Math.sin(j) * 8, 24, 0, 6.28); g.fill(); } }
      g.fillStyle = '#e8c860'; g.beginPath(); g.arc(w * 0.8, h * 0.2, 52, 0, 6.28); g.fill();
      g.strokeStyle = '#2a1a10'; g.lineWidth = 3; for (let k = 0; k < 30; k++) { g.beginPath(); g.moveTo(w * 0.8 - 40 + r() * 80, h * 0.2 - 40 + r() * 80); g.lineTo(w * 0.8 - 40 + r() * 80, h * 0.2 - 40 + r() * 80); g.stroke(); }
      for (let k = 0; k < 30; k++) { g.fillStyle = ['#c84a3a', '#e8d84a', '#e8e8e0'][k % 3]; g.beginPath(); g.arc(r() * w, h * 0.7 + r() * h * 0.25, 4 + r() * 4, 0, 6.28); g.fill(); }
      // the frame and the cross-bars of a window that was never there
      g.fillStyle = '#d8d4c4'; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 18, w, 18); g.fillRect(0, 0, 18, h); g.fillRect(w - 18, 0, 18, h); g.fillRect(w / 2 - 9, 0, 18, h); g.fillRect(0, h / 2 - 9, w, 18);
      // and years of damp and fading on top
      g.fillStyle = 'rgba(180,176,160,0.45)'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) { const x = r() * w, gr2 = g.createLinearGradient(x, 0, x, h); gr2.addColorStop(0, 'rgba(60,50,30,0.4)'); gr2.addColorStop(1, 'rgba(60,50,30,0)'); g.fillStyle = gr2; g.fillRect(x, 0, 8 + r() * 30, h * (0.3 + r() * 0.6)); }
      age(4000, 0.1);
    } else if (kind === 'rose') {
      // a rose window, black glass and leading - there is no light behind it, only wall
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      const cols = ['#6a1418', '#14246a', '#1a5a2a', '#8a6a14', '#4a1a5a'];
      for (let ring = 0; ring < 4; ring++) {
        const n = 6 + ring * 6, r0 = 30 + ring * 55, r1 = r0 + 52;
        for (let k = 0; k < n; k++) {
          const a0 = k / n * 6.283, a1 = (k + 1) / n * 6.283;
          g.fillStyle = cols[(k + ring) % cols.length]; g.beginPath(); g.arc(256, 256, r1, a0, a1); g.arc(256, 256, r0, a1, a0, true); g.fill();
        }
      }
      g.strokeStyle = '#141210'; g.lineWidth = 7;
      for (let ring = 0; ring <= 4; ring++) { g.beginPath(); g.arc(256, 256, 30 + ring * 55, 0, 6.28); g.stroke(); }
      for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; g.beginPath(); g.moveTo(256 + Math.cos(a) * 30, 256 + Math.sin(a) * 30); g.lineTo(256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250); g.stroke(); }
      for (let i = 0; i < 25; i++) { g.strokeStyle = 'rgba(200,200,200,0.25)'; g.lineWidth = 1; g.beginPath(); const a = r() * 6.28, d = r() * 240; g.moveTo(256 + Math.cos(a) * d, 256 + Math.sin(a) * d); g.lineTo(256 + Math.cos(a + 0.2) * (d + 40), 256 + Math.sin(a + 0.2) * (d + 40)); g.stroke(); }
    } else if (kind === 'height') {
      // a height chart painted up a pillar, for the children - and a pencil mark far above all of theirs
      g.fillStyle = '#d8d0b0'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c84a3a'; g.fillRect(0, 0, 18, h);
      g.fillStyle = '#2a2a2a'; stencil(18, 700, 'monospace');
      for (let m = 0; m <= 30; m++) { const y = h - m / 30 * h; g.fillRect(18, y - 1, m % 5 === 0 ? 50 : 26, 2); if (m % 5 === 0) g.fillText((m / 10).toFixed(1) + 'm', 74, y + 6); }
      for (const [y, nm] of [[0.38, 'ANNA'], [0.42, 'TOM'], [0.47, 'DEV'], [0.36, 'MO']]) { g.fillStyle = '#2a4a8a'; g.fillRect(22, h - y * h, 40, 3); g.fillText(nm, 66, h - y * h - 4); }
      g.fillStyle = '#8a1a12'; g.fillRect(16, h - 0.9 * h, 90, 4); g.font = '700 22px cursive'; g.fillText('No. 9', 30, h - 0.9 * h - 8);
      age(1500, 0.08);
    } else if (kind === 'banner') {
      g.clearRect(0, 0, w, h);
      const word = 'HAPPY BIRTHDAY', cols = ['#c84a3a', '#2a6aaa', '#e2b52a', '#3a8a4a'];
      for (let i = 0; i < word.length; i++) {
        const x = 40 + i * 68, y = 18 + Math.sin(i / (word.length - 1) * Math.PI) * 30;
        if (word[i] === ' ') continue;
        g.fillStyle = cols[i % 4]; g.globalAlpha = 0.75; g.beginPath(); g.moveTo(x - 30, y); g.lineTo(x + 30, y); g.lineTo(x, y + 80); g.fill();
        g.globalAlpha = 0.9; g.fillStyle = '#f0ece0'; stencil(34); g.textAlign = 'center'; g.fillText(word[i], x, y + 40);
      }
      g.globalAlpha = 1;
    } else if (kind === 'book') {
      // spines: cloth and leather gone dark, gilt titles worn away
      g.fillStyle = '#120c08'; g.fillRect(0, 0, w, h);
      let x = 0;
      while (x < w) {
        const bw = 10 + r() * 22, bh = h * (0.7 + r() * 0.3), col = ['#4a1a14', '#1a2a3a', '#2a3a1a', '#3a2a14', '#5a4a2a', '#2a1a2a'][Math.floor(r() * 6)];
        g.fillStyle = col; g.fillRect(x, h - bh, bw - 1.5, bh);
        g.fillStyle = 'rgba(200,170,90,0.4)'; g.fillRect(x + 2, h - bh + 10, bw - 6, 2); g.fillRect(x + 2, h - bh + 18 + r() * 30, bw - 6, 4); g.fillRect(x + 2, h - 14, bw - 6, 2);
        x += bw;
      }
      age(1500, 0.15);
    } else if (kind === 'rug') {
      g.fillStyle = '#4a1414'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#8a6a2a'; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24); g.lineWidth = 2; g.strokeRect(26, 26, w - 52, h - 52);
      for (let y = 80; y < h - 60; y += 110) { g.strokeStyle = '#1a2a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, y - 40); g.lineTo(w / 2 + 50, y); g.lineTo(w / 2, y + 40); g.lineTo(w / 2 - 50, y); g.closePath(); g.stroke(); g.fillStyle = '#7a5a24'; g.beginPath(); g.arc(w / 2, y, 10, 0, 6.28); g.fill(); }
      for (let i = 0; i < 4000; i++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '0,0,0' : '120,100,60') + ',' + r() * 0.18 + ')'; g.fillRect(r() * w, r() * h, 2, 2); }
    } else if (kind === 'cheer') {
      // the posters they put up for the patients
      const v = seed % 3;
      g.fillStyle = ['#e8d8a8', '#c8e0d8', '#e8c8c0'][v]; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e2b52a'; g.beginPath(); g.arc(w / 2, 230, 120, 0, 6.28); g.fill();
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(w / 2 - 40, 200, 12, 0, 6.28); g.arc(w / 2 + 40, 200, 12, 0, 6.28); g.fill();
      g.lineWidth = 9; g.strokeStyle = '#1a1a1a'; g.beginPath(); g.arc(w / 2, 240, 60, 0.3, Math.PI - 0.3); g.stroke();
      if (seed % 2) { g.strokeStyle = '#8a1a12'; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2 - 70, 160); g.lineTo(w / 2 + 70, 320); g.moveTo(w / 2 + 70, 160); g.lineTo(w / 2 - 70, 320); g.stroke(); }
      g.fillStyle = '#2a2a2a'; stencil(56); g.textAlign = 'center';
      g.fillText(['A NEW DAY!', 'SMILE!', 'LIGHTS OUT 9PM'][v], w / 2, 450);
      stencil(30, 600, 'sans-serif'); g.fillText(['EVERY DAY IS A GIFT', 'YOUR NURSES CARE', 'SLEEP WELL'][v], w / 2, 510);
      age(2500, 0.1);
    } else if (kind === 'calendar') {
      g.fillStyle = '#ece6d6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7a8a5a'; g.fillRect(16, 16, w - 32, 190);
      g.fillStyle = '#2a2a2a'; stencil(44); g.textAlign = 'center'; g.fillText('MARCH  1979', w / 2, 250);
      g.font = '600 20px monospace';
      for (let d = 0; d < 31; d++) { const x = 40 + (d % 7) * 46, y = 300 + Math.floor(d / 7) * 40; g.fillStyle = '#2a2a2a'; g.fillText(String(d + 1), x, y); if (d < 14) { g.strokeStyle = '#8a1a12'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 14, y - 16); g.lineTo(x + 14, y + 6); g.stroke(); } }
      g.strokeStyle = '#8a1a12'; g.lineWidth = 4; g.beginPath(); g.arc(40 + 6 * 46, 300 + 40, 22, 0, 6.28); g.stroke();
      age(1500, 0.08);
    } else if (kind === 'file' || kind === 'notice9') {
      g.fillStyle = '#e6e0cc'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1a1a1a'; g.font = '700 30px monospace'; g.textAlign = 'left';
      const lines = kind === 'file' ? ['PATIENT: No. 9', 'WARD C  ·  ISOLATION', 'HEIGHT: 2.4m  (+0.1)', 'WEIGHT: --', 'DIET: increase', 'RESTRAINT: as needed'] : ['NOTICE TO STAFF', '', 'No. 9 is not to', 'be in the day room', 'after lights out.', '', 'If the lights fail,', 'do not use torches.', 'Stand still.', '', '   - Matron'];
      lines.forEach((t, i) => g.fillText(t, 30, 60 + i * (kind === 'file' ? 50 : 52)));
      g.fillStyle = 'rgba(160,30,20,0.8)'; g.font = '700 46px cursive'; g.save(); g.translate(w * 0.55, h * 0.78); g.rotate(-0.2); g.fillText(kind === 'file' ? 'DO NOT FEED' : '', 0, 0); g.restore();
      age(1800, 0.1);
    } else if (kind === 'tvdead') {
      const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); gr.addColorStop(0, '#2a3030'); gr.addColorStop(1, '#050606');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(200,220,220,0.15)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); }
    }
  });
  if (kind === 'rug') tex.wrapT = THREE.RepeatWrapping;
  const transparent = kind === 'banner';
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: kind === 'portrait' ? 0.45 : kind === 'rose' || kind === 'tvdead' ? 0.1 : 0.85, transparent, side: kind === 'banner' ? THREE.DoubleSide : THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  m.userData.noShadow = true;
  worldShader(m, { ao: 1, grime: 0.4, wet: 0 });
  WardArt[key] = m;
  return m;
}

// ---------- furniture ----------
// an iron ward bed: enamelled frame, the mattress gone grey, a sheet, and the leather restraints
function wardBed(B, f, c, opts = {}) {
  const ff = frame(f.ox, f.oz, f.rot + (c.rnd() - 0.5) * 0.12), iron = WM.enamel, rnd = c.rnd;
  if (c.L) for (const x of [-0.7, 0, 0.7]) { const p = ff.w(x, 0, 0); addCollider(c.L, p[0], p[2], 0.42); }
  for (const [x, z] of [[-0.93, -0.43], [0.93, -0.43], [-0.93, 0.43], [0.93, 0.43]]) { ff.cyl(B, iron, x, 0.3, z, 0.02, 0.02, 0.6, 8); ff.cyl(B, PM.rubber, x, 0.035, z, 0.04, 0.04, 0.03, 10, Math.PI / 2); }
  for (const z of [-0.44, 0.44]) ff.cbox(B, iron, 0, 0.44, z, 1.9, 0.05, 0.03, 0.006);
  for (const [x, top] of [[0.95, 1.18], [-0.95, 0.9]]) {
    for (const z of [-0.44, 0.44]) ff.cyl(B, iron, x, top / 2, z, 0.024, 0.024, top, 10);
    ff.cyl(B, iron, x, top, 0, 0.022, 0.022, 0.9, 10, Math.PI / 2);
    ff.cyl(B, iron, x, top - 0.36, 0, 0.016, 0.016, 0.9, 8, Math.PI / 2);
    for (let k = -2; k <= 2; k++) ff.cyl(B, iron, x, top - 0.18, k * 0.16, 0.01, 0.01, 0.36, 6);
  }
  ff.cbox(B, WM.mattress, 0, 0.53, 0, 1.86, 0.15, 0.84, 0.05);
  ff.geo(B, decalMat(rnd() < 0.5 ? 'stain' : 'blood'), cachedGeo('bedStain', () => new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2)), (rnd() - 0.5) * 0.6, 0.607, (rnd() - 0.5) * 0.2, rnd() * 6);
  if (!opts.bare) {
    ff.cbox(B, WM.sheet, 0.72, 0.65, 0, 0.3, 0.1, 0.56, 0.04, 0.08);
    ff.cbox(B, WM.sheet, -0.25 + rnd() * 0.2, 0.63, (rnd() - 0.5) * 0.1, 1.15, 0.07, 0.92, 0.035, (rnd() - 0.5) * 0.3, 1, 0.04, 0.02);
  }
  // the straps: across the chest and the ankles, buckled, one torn and hanging
  if (opts.straps || rnd() < 0.55) {
    for (const x of [0.38, -0.62]) {
      ff.cbox(B, WM.leather, x, 0.62, 0, 0.08, 0.025, 0.96, 0.006);
      ff.cbox(B, WM.brassDull, x, 0.635, 0.3, 0.06, 0.012, 0.05, 0.004);
      ff.cbox(B, WM.leather, x, 0.4, 0.48, 0.07, 0.4, 0.012, 0.004, 0, 1, 0.12);
    }
    if (rnd() < 0.6) ff.cbox(B, WM.leather, 0.05, 0.3, -0.5, 0.06, 0.5, 0.012, 0.004, 0.3, 1, -0.2);
  }
}
// a chapel pew: one bay per cell, end panels only where the row ends
function pew(B, f, c) {
  const wd = mat('darkWood'), same = (dx) => c.L && inGrid(c.L, c.gx + dx, c.gz) && c.L.ch[c.gz * c.L.W + c.gx + dx] === 'b';
  f.cbox(B, wd, 0, 0.45, -0.04, 1.0, 0.06, 0.44, 0.008, 0, 1.2);
  f.cbox(B, wd, 0, 0.76, 0.2, 1.0, 0.52, 0.05, 0.008, 0, 1.2, -0.12);
  f.cbox(B, wd, 0, 1.02, 0.25, 1.0, 0.04, 0.12, 0.006, 0, 1.2);
  f.cbox(B, wd, 0, 0.22, -0.04, 0.06, 0.42, 0.34, 0.006);
  f.cbox(B, mat('fabric', { color: 0x3a1418 }), 0, 0.485, -0.04, 0.96, 0.02, 0.4, 0.01);
  for (const s of [-1, 1]) if (!same(s)) {
    f.cbox(B, wd, s * 0.49, 0.5, 0.04, 0.07, 1.0, 0.6, 0.01, 0, 1.2);
    f.cyl(B, wd, s * 0.49, 1.03, 0.2, 0.06, 0.06, 0.07, 14, 0, Math.PI / 2);
  }
  if (c.L) { const p = f.w(0, 0, 0); addCollider(c.L, p[0], p[2], 0.36); }
  if (c.rnd() < 0.3) f.cbox(B, mat('card', { color: 0x5a2a1a }), (c.rnd() - 0.5) * 0.6, 0.495, -0.05, 0.14, 0.03, 0.2, 0.004, c.rnd());
}
// a waiting-room bench: a chrome beam and moulded seats gone pale
function waitBench(B, f, c) {
  const seat = c.rnd() < 0.5 ? WM.orange : WM.plastic;
  f.cbox(B, PM.chrome, 0, 0.36, 0, 1.0, 0.05, 0.08, 0.008);
  for (const x of [-0.24, 0.24]) {
    if (c.rnd() < 0.12) continue;
    f.cbox(B, seat, x, 0.44, 0.0, 0.44, 0.05, 0.42, 0.02);
    f.cbox(B, seat, x, 0.72, 0.2, 0.42, 0.42, 0.04, 0.02, 0, 1, -0.18);
  }
  for (const x of [-0.44, 0.44]) { f.cbox(B, PM.chrome, x, 0.18, -0.15, 0.04, 0.36, 0.04, 0.006); f.cbox(B, PM.chrome, x, 0.18, 0.15, 0.04, 0.36, 0.04, 0.006); }
  if (c.L) { const p = f.w(0, 0, 0); addCollider(c.L, p[0], p[2], 0.34); }
}
function wheelchair(B, f, c, folded = false) {
  const steel = PM.chrome, rub = PM.rubber, sling = mat('fabric', { color: 0x1c1e22 });
  if (c && c.L) addCollider(c.L, f.ox, f.oz, 0.36);
  for (const s of [-1, 1]) {
    const x = s * (folded ? 0.16 : 0.31);
    f.torus(B, rub, x, 0.31, 0.05, 0.3, 0.025, 0, 0); f.geo(B, rub, torusGeo(0.3, 0.025), x, 0.31, 0.05, Math.PI / 2);
    f.geo(B, steel, torusGeo(0.27, 0.008), x + s * 0.02, 0.31, 0.05, Math.PI / 2);
    for (let k = 0; k < 6; k++) f.cbox(B, steel, x, 0.31, 0.05, 0.004, 0.54, 0.004, 0.001, Math.PI / 2, 1, k * Math.PI / 6);
    f.cyl(B, steel, x, 0.66, -0.12, 0.012, 0.012, 0.75, 8, -0.12);
    f.cyl(B, steel, x * 0.95, 0.47, 0.3, 0.012, 0.012, 0.42, 8, 0.2);
    f.cyl(B, rub, x * 0.9, 0.07, 0.48, 0.065, 0.065, 0.03, 12, 0, Math.PI / 2);
    f.cyl(B, steel, x * 0.9, 0.2, 0.5, 0.01, 0.01, 0.24, 6);
    f.cbox(B, PM.black, x, 1.02, -0.18, 0.04, 0.03, 0.12, 0.01);
  }
  f.cbox(B, sling, 0, 0.5, 0.08, folded ? 0.3 : 0.56, 0.02, 0.44, 0.01);
  f.cbox(B, sling, 0, 0.78, -0.13, folded ? 0.3 : 0.56, 0.4, 0.02, 0.01, 0, 1, -0.1);
  f.cbox(B, PM.black, 0, 0.1, 0.55, 0.4, 0.015, 0.12, 0.004);
}
function hospChair(B, f, c) {
  const rnd = c.rnd, ff = frame(f.ox + (rnd() - 0.5) * 0.2, f.oz + (rnd() - 0.5) * 0.2, f.rot + Math.PI + (rnd() - 0.5) * 1.4);
  if (c.theme === 'ward' && rnd() < 0.45) return wheelchair(B, ff, c);
  if (c.L) addCollider(c.L, ff.ox, ff.oz, 0.27);
  if (c.theme === 'oldwing') {
    // a bentwood chair
    const wd = mat('darkWood');
    ff.cbox(B, wd, 0, 0.46, 0, 0.42, 0.04, 0.42, 0.01);
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) ff.cyl(B, wd, x, 0.23, z, 0.016, 0.02, 0.46, 8);
    for (const x of [-0.18, 0.18]) ff.cyl(B, wd, x, 0.75, 0.19, 0.016, 0.016, 0.6, 8, -0.1);
    ff.geo(B, wd, torusGeo(0.18, 0.016, 6, 16, Math.PI), 0, 0.92, 0.2, 0, Math.PI / 2 - 0.1);
    return;
  }
  if (c.theme === 'dayroom' && rnd() < 0.5) {
    // a high-backed vinyl armchair, split, the foam showing
    const v = rnd() < 0.5 ? WM.vinylG : WM.vinylR;
    ff.cbox(B, v, 0, 0.38, 0, 0.64, 0.22, 0.6, 0.05);
    ff.cbox(B, v, 0, 0.82, 0.27, 0.64, 0.75, 0.14, 0.05, 0, 1, -0.08);
    for (const x of [-0.32, 0.32]) ff.cbox(B, mat('wood', { color: 0x6a4a32 }), x, 0.6, 0, 0.08, 0.06, 0.6, 0.02);
    for (const [x, z] of [[-0.27, -0.24], [0.27, -0.24], [-0.27, 0.24], [0.27, 0.24]]) ff.cyl(B, mat('wood', { color: 0x6a4a32 }), x, 0.14, z, 0.025, 0.02, 0.28, 8);
    if (rnd() < 0.6) ff.cbox(B, plainMat(0xc8b878, { roughness: 0.9 }), 0.05, 0.495, -0.05, 0.22, 0.02, 0.18, 0.02, rnd());
    return;
  }
  // a moulded plastic chair on steel legs, as often as not knocked over
  const shell = rnd() < 0.5 ? WM.orange : WM.plastic;
  if (rnd() < 0.3) {
    ff.cbox(B, shell, 0, 0.24, 0, 0.44, 0.46, 0.05, 0.02, 0, 1, 0, 0); ff.cbox(B, shell, 0, 0.05, 0.25, 0.44, 0.05, 0.44, 0.02);
    for (const x of [-0.19, 0.19]) ff.cyl(B, PM.chrome, x, 0.25, 0.48, 0.01, 0.01, 0.45, 6, Math.PI / 2);
    return;
  }
  ff.cbox(B, shell, 0, 0.45, 0, 0.44, 0.04, 0.42, 0.02);
  ff.cbox(B, shell, 0, 0.72, 0.2, 0.42, 0.4, 0.04, 0.02, 0, 1, -0.15);
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) ff.cyl(B, PM.chrome, x, 0.22, z, 0.01, 0.01, 0.44, 6);
}
function typewriter(B, f, x, y, z, rot = 0) {
  const ff = frame(...f.at(x, z), f.rot + rot), dk = plainMat(0x1c1e1c, { roughness: 0.4, metalness: 0.4 });
  ff.cbox(B, dk, 0, y + 0.05, 0, 0.42, 0.1, 0.34, 0.03);
  ff.cbox(B, dk, 0, y + 0.13, -0.08, 0.44, 0.08, 0.14, 0.03, 0, 1, 0.2);
  ff.cyl(B, PM.black, 0, y + 0.18, -0.1, 0.03, 0.03, 0.5, 12, 0, Math.PI / 2);
  ff.cbox(B, PM.paper, 0, y + 0.27, -0.13, 0.22, 0.2, 0.004, 0.001, 0, 1, -0.25);
  for (let k = 0; k < 4; k++) for (let j = 0; j < 9; j++) ff.cyl(B, plainMat(0xd8d4c8, { roughness: 0.4 }), -0.16 + j * 0.04, y + 0.11 - k * 0.015, 0.05 + k * 0.035, 0.012, 0.012, 0.01, 8);
}
function rotaryPhone(B, f, x, y, z, rot = 0) {
  const ff = frame(...f.at(x, z), f.rot + rot), bk = plainMat(0x101010, { roughness: 0.25 });
  ff.cbox(B, bk, 0, y + 0.05, 0, 0.2, 0.1, 0.22, 0.04, 0, 1, 0.15);
  ff.cyl(B, plainMat(0xe8e4d8, { roughness: 0.3 }), 0, y + 0.1, 0.04, 0.06, 0.06, 0.01, 18, 0.5);
  ff.cbox(B, bk, 0, y + 0.13, -0.03, 0.24, 0.05, 0.06, 0.025);
}
// the desk at the nurses' station: counter all round, the call board and the charts
function counter(B, f, c) {
  const top = mat('wood', { color: 0x8a7a62 }), body = mat('paint', { color: 0x8c9a8a });
  f.cbox(B, body, 0, 0.53, 0, 1.0, 1.06, 0.96, 0.01);
  f.cbox(B, top, 0, 1.08, 0, 1.06, 0.04, 1.02, 0.008);
  f.cbox(B, PM.steelFrame, 0, 0.05, 0, 1.0, 0.1, 0.96, 0.006);
  const r = c.rnd();
  if (r < 0.25) rotaryPhone(B, f, (c.rnd() - 0.5) * 0.4, 1.1, (c.rnd() - 0.5) * 0.3, c.rnd());
  else if (r < 0.5) { for (let k = 0; k < 3; k++) f.cbox(B, mat('card', { color: [0x6a8a5a, 0x8a6a4a, 0x4a5a7a][k] }), (c.rnd() - 0.5) * 0.5, 1.11 + k * 0.025, (c.rnd() - 0.5) * 0.4, 0.24, 0.02, 0.32, 0.004, c.rnd() - 0.5); }
  else if (r < 0.65) { f.cyl(B, WM.brass, 0, 1.13, 0, 0.05, 0.06, 0.05, 16); f.sphere(B, WM.brass, 0, 1.16, 0, 0.012); }
  else if (r < 0.8) { f.cbox(B, PM.black, 0.1, 1.2, 0, 0.32, 0.18, 0.06, 0.01, 0.5); for (let k = 0; k < 6; k++) f.cbox(B, PM.paper, 0.1, 1.15 + k * 0.006, 0.0, 0.28, 0.004, 0.2, 0.001, 0.5); }
  if (c.L) { const p = f.w(0, 0, 0); addCollider(c.L, p[0], p[2], 0.5); }
}
function dayTable(B, f, c) {
  const wd = mat('wood', { color: 0x8a6a48 });
  f.cbox(B, wd, 0, 0.74, 0, 1.0, 0.04, 0.86, 0.01);
  for (const [x, z] of [[-0.44, -0.38], [0.44, -0.38], [-0.44, 0.38], [0.44, 0.38]]) f.cyl(B, PM.chrome, x, 0.37, z, 0.018, 0.018, 0.72, 8);
  const r = c.rnd();
  if (r < 0.3) {
    // a game abandoned halfway through
    f.geo(B, labelMat('', { bg: '#d8d0b8' }), planeGeo(0.36, 0.36), 0, 0.762, 0, 0, -Math.PI / 2);
    for (let k = 0; k < 8; k++) f.cyl(B, plainMat(k % 2 ? 0x1a1a1a : 0xd8d0b8, { roughness: 0.3 }), (c.rnd() - 0.5) * 0.4, 0.775, (c.rnd() - 0.5) * 0.4, 0.016, 0.018, 0.025, 10);
  } else if (r < 0.55) { for (let k = 0; k < 2; k++) { f.cyl(B, plainMat(0xd8d2c8, { roughness: 0.35 }), (c.rnd() - 0.5) * 0.6, 0.8, (c.rnd() - 0.5) * 0.4, 0.04, 0.035, 0.1, 14); } }
  else if (r < 0.75) { for (let k = 0; k < 12; k++) f.cbox(B, mat('card', { color: 0xc8b890 }), (c.rnd() - 0.5) * 0.6, 0.762, (c.rnd() - 0.5) * 0.5, 0.05, 0.004, 0.05, 0.001, c.rnd() * 3); }
  if (c.L) { const p = f.w(0, 0, 0); addCollider(c.L, p[0], p[2], 0.44); }
}
function antiqueDesk(B, f, c) {
  const wd = mat('darkWood');
  f.cbox(B, wd, 0, 0.76, 0, 1.0, 0.05, 0.75, 0.01);
  f.cbox(B, mat('fabric', { color: 0x1a3a22 }), 0, 0.787, 0, 0.8, 0.004, 0.55, 0.001);
  f.cbox(B, wd, 0, 0.4, 0.05, 0.98, 0.68, 0.62, 0.01);
  for (let k = 0; k < 3; k++) { f.cbox(B, wd, 0.3, 0.2 + k * 0.2, 0.37, 0.34, 0.17, 0.02, 0.006); f.cyl(B, WM.brass, 0.3, 0.22 + k * 0.2, 0.39, 0.012, 0.012, 0.02, 8, Math.PI / 2); }
  if (c.rnd() < 0.5) typewriter(B, f, -0.1, 0.79, -0.05, 0.1);
  else {
    f.cyl(B, WM.brass, -0.3, 0.8, -0.15, 0.06, 0.07, 0.03, 14); f.cyl(B, WM.brass, -0.3, 0.98, -0.15, 0.01, 0.01, 0.36, 6);
    f.cbox(B, plainMat(0x1a4a2a, { roughness: 0.2 }), -0.25, 1.15, -0.15, 0.3, 0.08, 0.12, 0.03);
    for (let k = 0; k < 5; k++) f.cbox(B, PM.paper, 0.1 + (c.rnd() - 0.5) * 0.2, 0.795 + k * 0.003, (c.rnd() - 0.5) * 0.2, 0.21, 0.002, 0.29, 0.001, c.rnd() - 0.5);
    f.cyl(B, plainMat(0x0a0a10, { roughness: 0.15 }), 0.35, 0.81, -0.2, 0.025, 0.03, 0.05, 10);
  }
  if (c.L) { const p = f.w(0, 0, 0); addCollider(c.L, p[0], p[2], 0.48); }
}
function bookcase(B, f, c) {
  const wd = mat('darkWood'), books = wardArt('book', Math.floor(c.rnd() * 4));
  f.cbox(B, wd, 0, 1.15, -0.06, 1.0, 2.3, 0.44, 0.01, 0, 1.2);
  f.cbox(B, wd, 0, 2.36, -0.03, 1.06, 0.1, 0.5, 0.01);
  for (let k = 0; k < 5; k++) {
    const y = 0.12 + k * 0.44;
    f.cbox(B, wd, 0, y, 0.12, 0.94, 0.03, 0.08, 0.004);
    if (c.rnd() < 0.15) continue;
    f.geo(B, books, planeGeo(0.9, 0.38), 0, y + 0.21, 0.155);
    if (c.rnd() < 0.4) f.cbox(B, mat('card', { color: [0x4a1a14, 0x1a2a3a, 0x3a2a14][k % 3] }), (c.rnd() - 0.5) * 0.6, y + 0.12, 0.12, 0.04, 0.22, 0.16, 0.004, 0, 1, 0, 0.5);
  }
  if (c.rnd() < 0.4) for (let k = 0; k < 4; k++) f.cbox(B, mat('card', { color: [0x4a1a14, 0x1a2a3a, 0x3a2a14, 0x2a3a1a][k] }), (c.rnd() - 0.5) * 0.8, 0.02, 0.45 + c.rnd() * 0.3, 0.2, 0.04, 0.26, 0.004, c.rnd() * 3);
}
function linenShelf(B, f, c) {
  const post = PM.steelFrame, shelf = mat('metal', { color: 0x9a9e98 });
  for (const [x, z] of [[-0.47, -0.27], [0.47, -0.27], [-0.47, 0.27], [0.47, 0.27]]) f.cbox(B, post, x, 1.0, z, 0.035, 2.0, 0.035, 0.004);
  for (const y of [0.1, 0.6, 1.1, 1.6, 1.98]) {
    f.cbox(B, shelf, 0, y, 0, 0.98, 0.025, 0.58, 0.005);
    if (y > 1.9) continue;
    for (let k = 0; k < 3; k++) if (c.rnd() < 0.8) {
      const h = 0.1 + c.rnd() * 0.25, col = [0xd8d6cc, 0xa8b8c0, 0xc8d0c0][Math.floor(c.rnd() * 3)];
      f.cbox(B, mat('fabric', { color: col }), -0.3 + k * 0.3, y + 0.013 + h / 2, (c.rnd() - 0.5) * 0.08, 0.26, h, 0.4, 0.03, (c.rnd() - 0.5) * 0.1);
    }
  }
}
function gameShelf(B, f, c) {
  linenShelf(B, f, { rnd: () => 2 });
  for (const y of [0.1, 0.6, 1.1, 1.6]) for (let k = 0; k < 4; k++) {
    const w = 0.18 + c.rnd() * 0.06;
    f.cbox(B, mat('card', { color: [0xc84a3a, 0x2a6aaa, 0xe2b52a, 0x3a8a4a, 0xd8d0b8][Math.floor(c.rnd() * 5)] }), -0.33 + k * 0.22, y + 0.03 + k * 0.006, 0, w, 0.04 + c.rnd() * 0.06, 0.32, 0.004, (c.rnd() - 0.5) * 0.2);
  }
}
function filingCabinet(B, f, c) {
  const m = mat('metal', { color: 0x6a7a6a });
  f.cbox(B, m, 0, 0.7, -0.05, 0.92, 1.4, 0.62, 0.01);
  for (const x of [-0.23, 0.23]) for (let k = 0; k < 4; k++) {
    const open = c.rnd() < 0.08 ? 0.3 : 0;
    f.cbox(B, m, x, 0.2 + k * 0.33, 0.27 + open, 0.42, 0.3, 0.02, 0.005);
    f.cbox(B, PM.chrome, x, 0.27 + k * 0.33, 0.29 + open, 0.12, 0.02, 0.02, 0.004);
    f.geo(B, labelMat(['A-F', 'G-L', 'M-R', 'S-Z', '1979', 'C-9'][Math.floor(c.rnd() * 6)], { bg: '#e2ddd0', fg: '#222', w: 128, h: 48, font: 'monospace', weight: '700', size: 22 }), planeGeo(0.09, 0.035), x, 0.33 + k * 0.33, 0.281 + open);
    if (open) { f.box(B, m, x, 0.15 + k * 0.33, 0.12, 0.4, 0.22, 0.32); for (let j = 0; j < 8; j++) f.cbox(B, mat('card', { color: 0xc8b070 }), x, 0.2 + k * 0.33 + j * 0.003, 0.05 + j * 0.035, 0.36, 0.22, 0.004, 0.001, 0, 1, -0.2); }
  }
}
function wardrobe(B, f, c) {
  const wd = mat('darkWood');
  f.cbox(B, wd, 0, 1.05, -0.12, 0.98, 2.1, 0.54, 0.012, 0, 1.2);
  f.cbox(B, wd, 0, 2.15, -0.1, 1.04, 0.1, 0.6, 0.01);
  const ajar = c.rnd() < 0.5;
  f.cbox(B, wd, -0.24, 1.08, 0.16, 0.46, 1.9, 0.03, 0.006);
  if (ajar) { const hf = frame(...f.at(0.47, 0.16), f.rot - 1.2); hf.cbox(B, wd, -0.23, 1.08, 0, 0.46, 1.9, 0.03, 0.006); f.box(B, plainMat(0x080606), 0.24, 1.08, 0.13, 0.44, 1.86, 0.01); f.cbox(B, mat('fabric', { color: 0x2a2a30 }), 0.22, 1.2, 0.0, 0.3, 0.9, 0.12, 0.04); }
  else f.cbox(B, wd, 0.24, 1.08, 0.16, 0.46, 1.9, 0.03, 0.006);
  for (const x of [-0.04, 0.04]) f.cyl(B, WM.brass, x, 1.1, 0.19, 0.012, 0.012, 0.03, 8, Math.PI / 2);
}
// the heap in the day room: everything that was in the way, dragged into a pile
function furnitureHeap(B, cells, c) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of cells) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x + 1); z1 = Math.max(z1, z + 1); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, r = c.rnd;
  const f = frame(cx, cz, r() * 6);
  f.cbox(B, WM.mattress, 0, 0.12, 0, 1.9, 0.18, 0.9, 0.06, 0.3, 1, 0.1, 0.05);
  f.cbox(B, WM.mattress, 0.2, 0.42, 0.1, 1.85, 0.16, 0.85, 0.06, -0.5, 1, -0.25, 0.3);
  dayTable(B, frame(...f.at(-0.3, 0.2), f.rot + 0.7), { rnd: r, theme: 'dayroom' });
  for (let k = 0; k < 5; k++) hospChair(B, frame(...f.at((r() - 0.5) * 1.4, (r() - 0.5) * 1.4), r() * 6), { rnd: r, theme: 'ward' });
  wardBed(B, frame(...f.at(0.4, -0.5), f.rot + 1.2), { rnd: r, theme: 'ward' }, { bare: true });
}

// the theme picks the furniture; everywhere else is left exactly as it was
const _baseProps = Object.assign({}, PROP_BUILDERS);
PROP_BUILDERS.g = (B, f, c) => (c.theme === 'ward' ? wardBed(B, f, c) : _baseProps.g(B, f, c));
PROP_BUILDERS.b = (B, f, c) => (c.theme === 'oldwing' ? pew(B, f, c) : HOSPITAL.has(c.theme) ? waitBench(B, f, c) : _baseProps.b(B, f, c));
PROP_BUILDERS.h = (B, f, c) => (HOSPITAL.has(c.theme) ? hospChair(B, f, c) : _baseProps.h(B, f, c));
PROP_BUILDERS.t = (B, f, c) => (c.theme === 'landing' && c.ceil > 3 ? counter(B, f, c) : c.theme === 'dayroom' ? dayTable(B, f, c) : c.theme === 'oldwing' ? antiqueDesk(B, f, c) : _baseProps.t(B, f, c));
PROP_BUILDERS.$ = (B, f, c) => (c.theme === 'oldwing' ? bookcase(B, f, c) : c.theme === 'ward' || c.theme === 'landing' ? linenShelf(B, f, c) : c.theme === 'dayroom' ? gameShelf(B, f, c) : _baseProps.$(B, f, c));
PROP_BUILDERS.d = (B, f, c) => (HOSPITAL.has(c.theme) ? filingCabinet(B, f, c) : _baseProps.d(B, f, c));
PROP_BUILDERS.l = (B, f, c) => (c.theme === 'oldwing' ? wardrobe(B, f, c) : _baseProps.l(B, f, c));
const _baseCluster = buildMachineCluster;
// (the day room's heap of furniture takes the place of a stack of crates)
buildMachineCluster = function (B, ch, cells, c) { if (ch === 'X' && c.theme === 'dayroom') return furnitureHeap(B, cells, c); return _baseCluster(B, ch, cells, c); };

// ---------- on the walls ----------
Object.assign(WALL_ITEMS, {
  portrait(B, f, r) {
    const w = 0.62 + r() * 0.2, h = w * 1.3, y = 1.7;
    f.cbox(B, WM.brassDull, 0, y, 0.025, w + 0.12, h + 0.12, 0.05, 0.02);
    f.geo(B, wardArt('portrait', Math.floor(r() * 4)), planeGeo(w, h), 0, y, 0.052);
    if (r() < 0.3) f.cbox(B, WM.brassDull, 0, y - h / 2 - 0.12, 0.04, 0.2, 0.05, 0.02, 0.005);
  },
  sconce(B, f) {
    f.cbox(B, WM.brass, 0, 1.9, 0.02, 0.1, 0.2, 0.04, 0.01);
    f.cyl(B, WM.brass, 0, 1.9, 0.1, 0.012, 0.012, 0.16, 8, Math.PI / 2);
    f.cyl(B, plainMat(0xd8c8a0, { roughness: 0.4, transparent: true, opacity: 0.75, ws: false }), 0, 1.99, 0.18, 0.07, 0.04, 0.12, 14);
  },
  drawing(B, f, r) {
    for (let k = 0; k < 1 + Math.floor(r() * 2); k++) {
      const x = (k - 0.5) * 0.5 + (r() - 0.5) * 0.1, y = 1.2 + r() * 0.4;
      f.geo(B, wardArt('drawing', Math.floor(r() * 4)), planeGeo(0.42, 0.32), x, y, 0.006 + k * 0.001, 0, 0, (r() - 0.5) * 0.15);
      f.cbox(B, plainMat(0xc8c0a0, { roughness: 0.6, transparent: true, opacity: 0.6, ws: false }), x, y + 0.15, 0.008, 0.08, 0.02, 0.002, 0.001);
    }
  },
  oxygen(B, f) {
    // the gas panel over a bed: oxygen, suction, the nurse-call button on its cord
    f.cbox(B, plainMat(0xd8d8cc, { roughness: 0.5 }), 0, 1.45, 0.02, 0.5, 0.18, 0.04, 0.008);
    for (const [x, col] of [[-0.15, 0x2a8a3a], [0, 0xd8d8d0], [0.15, 0xd8b82a]]) { f.cyl(B, plainMat(col, { roughness: 0.4 }), x, 1.45, 0.05, 0.025, 0.025, 0.03, 12, Math.PI / 2); }
    B.add(PM.black, tubeGeo([f.w(0.2, 1.4, 0.04), f.w(0.25, 1.0, 0.1), f.w(0.18, 0.75, 0.15)], 0.007, 10, 5), _m4.identity());
    f.cbox(B, plainMat(0xd8d4c8, { roughness: 0.4 }), 0.18, 0.72, 0.15, 0.05, 0.1, 0.03, 0.01);
    f.cyl(B, plainMat(0xb81c12, { roughness: 0.3 }), 0.18, 0.74, 0.168, 0.012, 0.012, 0.008, 10, Math.PI / 2);
  },
  calendar(B, f, r) { f.geo(B, wardArt('calendar', 0), planeGeo(0.3, 0.4), 0, 1.5 + r() * 0.1, 0.006, 0, 0, (r() - 0.5) * 0.06); },
  cheer(B, f, r) { f.cbox(B, PM.black, 0, 1.5, 0.006, 0.52, 0.7, 0.012, 0.003); f.geo(B, wardArt('cheer', Math.floor(r() * 3)), planeGeo(0.48, 0.66), 0, 1.5, 0.013); },
  mirror(B, f, r) {
    f.cbox(B, PM.chrome, 0, 1.55, 0.01, 0.42, 0.56, 0.02, 0.006);
    f.box(B, plainMat(0x9aa4a8, { roughness: 0.04, metalness: 1 }), 0, 1.55, 0.022, 0.38, 0.52, 0.004);
    f.geo(B, decalMat('cracks'), planeGeo(0.4, 0.4), (r() - 0.5) * 0.1, 1.55, 0.026);
  },
  plaque(B, f, r) {
    f.cbox(B, WM.brassDull, 0, 1.6, 0.01, 0.4, 0.26, 0.02, 0.004);
    f.geo(B, labelMat(['IN MEMORY OF THE STAFF', 'ST. AUDRA’S  1931', 'WARD C  ·  EST. 1958'][Math.floor(r() * 3)], { fg: '#2a1e0a', w: 512, h: 96, size: 30, font: 'serif', weight: '700' }), planeGeo(0.36, 0.07), 0, 1.62, 0.021);
  },
});
Object.assign(DRESS.kits, {
  landing: [['firstaid', 0.04], ['notice', 0.04], ['calendar', 0.02], ['plaque', 0.02], ['clock', 0.02], ['scratch', 0.05], ['hand', 0.05], ['ext', 0.02], ['cheer', 0.02]],
  ward: [['oxygen', 0.05], ['notice', 0.03], ['drawing', 0.03], ['ring', 0.03], ['scratch', 0.06], ['hand', 0.07], ['clock', 0.02], ['tally', 0.03], ['mirror', 0.02]],
  dayroom: [['cheer', 0.05], ['cork', 0.03], ['clock', 0.03], ['calendar', 0.02], ['drawing', 0.04], ['scratch', 0.05], ['hand', 0.05], ['mirror', 0.02]],
  oldwing: [['portrait', 0.06], ['sconce', 0.07], ['clock', 0.01], ['scratch', 0.04], ['hand', 0.05], ['plaque', 0.02]],
});
Object.assign(AMBIENT_EVENTS, {
  landing: [['drip', 6, 18], ['phoneRing', 70, 140], ['creak', 18, 40]],
  ward: [['drip', 5, 14], ['squeak', 22, 50], ['knock', 16, 40]],
  dayroom: [['piano', 28, 70], ['creak', 14, 34], ['drip', 9, 24]],
  oldwing: [['chime', 45, 90], ['creak', 10, 26], ['knock', 20, 50]],
});

// ---------- the rooms ----------
// a curtain on a ceiling track: hospital green, hanging in folds, torn short at the bottom
function curtain(B, f, len, h, ceil, rnd) {
  f.cbox(B, PM.chrome, 0, ceil - 0.06, 0, len, 0.03, 0.04, 0.006);
  const cm = mat('fabric', { color: 0x6a8a7a });
  const n = Math.max(3, Math.round(len / 0.12));
  for (let k = 0; k < n; k++) {
    const x = -len / 2 + (k + 0.5) * len / n, hh = h * (0.75 + rnd() * 0.25);
    f.cbox(B, cm, x, ceil - 0.08 - hh / 2, Math.sin(k * 1.7) * 0.05, len / n + 0.02, hh, 0.012, 0.004, (k % 2 ? 0.35 : -0.35));
  }
}
function ivStand(B, f) {
  f.cyl(B, PM.chrome, 0, 0.95, 0, 0.012, 0.012, 1.8, 8);
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; f.cbox(B, PM.chrome, Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14, 0.3, 0.02, 0.02, 0.004, -a); f.cyl(B, PM.rubber, Math.cos(a) * 0.28, 0.025, Math.sin(a) * 0.28, 0.025, 0.025, 0.02, 8, Math.PI / 2); }
  f.cbox(B, PM.chrome, 0, 1.85, 0, 0.3, 0.012, 0.012, 0.003);
  f.cbox(B, plainMat(0xd8e0d8, { transparent: true, opacity: 0.55, roughness: 0.2, ws: false }), 0.13, 1.68, 0, 0.1, 0.22, 0.04, 0.03);
  B.add(plainMat(0xd8e0d8, { transparent: true, opacity: 0.5, roughness: 0.2, ws: false }), tubeGeo([f.w(0.13, 1.56, 0), f.w(0.2, 1.1, 0.1), f.w(0.1, 0.5, 0.2), f.w(0.3, 0.02, 0.4)], 0.004, 12, 4), _m4.identity());
}
function medCart(B, f) {
  const m = mat('metal', { color: 0xc8ccc4 });
  f.cbox(B, m, 0, 0.5, 0, 0.6, 0.8, 0.45, 0.02);
  for (let k = 0; k < 4; k++) { f.cbox(B, m, 0, 0.22 + k * 0.18, 0.23, 0.56, 0.15, 0.02, 0.005); f.cbox(B, PM.chrome, 0, 0.26 + k * 0.18, 0.245, 0.2, 0.02, 0.02, 0.004); }
  for (const [x, z] of [[-0.25, -0.18], [0.25, -0.18], [-0.25, 0.18], [0.25, 0.18]]) f.cyl(B, PM.rubber, x, 0.05, z, 0.05, 0.05, 0.03, 12, Math.PI / 2);
  for (let k = 0; k < 6; k++) f.cyl(B, plainMat([0x6a3a1a, 0xd8d8d0, 0x3a5a7a][k % 3], { roughness: 0.25, transparent: true, opacity: 0.8, ws: false }), -0.22 + k * 0.08, 0.96, (k % 2) * 0.08, 0.022, 0.022, 0.1, 10);
  f.cbox(B, PM.paper, 0.1, 0.915, -0.1, 0.2, 0.004, 0.28, 0.001, 0.3);
}
function bathtub(B, f) {
  const enamel = plainMat(0xd8d6cc, { roughness: 0.25 });
  f.cbox(B, enamel, 0, 0.42, 0, 1.7, 0.5, 0.78, 0.18);
  f.box(B, plainMat(0x0c0d0a, { roughness: 0.04, metalness: 0.2 }), 0, 0.6, 0, 1.5, 0.004, 0.6);
  for (const [x, z] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) f.sphere(B, WM.brassDull, x, 0.08, z, 0.08, 1.2);
  f.cyl(B, PM.chrome, 0.85, 0.85, 0, 0.02, 0.02, 0.3, 8);
  f.cyl(B, PM.chrome, 0.78, 0.98, 0, 0.018, 0.018, 0.16, 8, 0, Math.PI / 2);
  f.geo(B, decalMat('grime'), cachedGeo('tubRing', () => new THREE.PlaneGeometry(1.6, 0.7)), 0, 0.64, 0.38);
  B.add(PM.black, tubeGeo([f.w(-0.9, 0.62, 0.2), f.w(-1.05, 0.3, 0.3), f.w(-1.1, 0.01, 0.5)], 0.01, 8, 4), _m4.identity());
}
function opTable(B, f) {
  const steel = mat('steel');
  f.cbox(B, steel, 0, 0.92, 0, 1.9, 0.08, 0.6, 0.02);
  f.cbox(B, mat('fabric', { color: 0x2a3a34 }), 0, 0.98, 0, 1.85, 0.05, 0.56, 0.02);
  f.cyl(B, steel, 0, 0.45, 0, 0.12, 0.16, 0.9, 16);
  f.cbox(B, steel, 0, 0.04, 0, 0.9, 0.08, 0.5, 0.02);
  for (const x of [0.75, -0.75]) for (const z of [-0.32, 0.32]) { f.cbox(B, WM.leather, x, 1.0, z, 0.06, 0.02, 0.2, 0.004); }
  f.geo(B, decalMat('blood'), cachedGeo('opBlood', () => new THREE.PlaneGeometry(1.0, 1.0).rotateX(-Math.PI / 2)), 0.2, 1.007, 0, 0.6);
  f.geo(B, decalMat('blood'), cachedGeo('decalFloor', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), 0.5, 0.012, 0.6, 2.1);
}
function surgLamp(B, f, ceil) {
  const m = plainMat(0xd8d8d0, { roughness: 0.4, metalness: 0.5 });
  f.cyl(B, m, 0, ceil - 0.2, 0, 0.03, 0.03, 0.4, 8);
  f.cyl(B, m, 0.3, ceil - 0.4, 0, 0.025, 0.025, 0.65, 8, 0, Math.PI / 2 - 0.3);
  f.cyl(B, m, 0.6, ceil - 0.62, 0, 0.42, 0.34, 0.16, 28);
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; f.sphere(B, plainMat(0xb8c0c0, { roughness: 0.1, metalness: 0.2 }), 0.6 + Math.cos(a) * 0.22, ceil - 0.71, Math.sin(a) * 0.22, 0.07, 0.4); }
  f.sphere(B, plainMat(0xb8c0c0, { roughness: 0.1 }), 0.6, ceil - 0.71, 0, 0.08, 0.4);
}
function instrumentTray(B, f) {
  f.cyl(B, PM.chrome, 0, 0.45, 0, 0.015, 0.015, 0.9, 8);
  f.cbox(B, mat('steel'), 0, 0.92, 0, 0.5, 0.03, 0.35, 0.01);
  for (let k = 0; k < 6; k++) f.cbox(B, PM.chrome, -0.18 + k * 0.07, 0.94, (k % 2) * 0.05, 0.012, 0.006, 0.18, 0.002, (k - 3) * 0.08);
}
function piano(B, f) {
  const wd = plainMat(0x1a0e08, { roughness: 0.3 }), ivory = plainMat(0xd8d0b4, { roughness: 0.35 });
  f.cbox(B, wd, 0, 0.66, 0, 1.5, 1.32, 0.6, 0.02);
  f.cbox(B, wd, 0, 0.74, 0.32, 1.46, 0.06, 0.32, 0.01);
  for (let k = 0; k < 36; k++) { if (k % 7 === 3) continue; f.cbox(B, k % 9 === 4 ? plainMat(0x2a2620) : ivory, -0.63 + k * 0.036, 0.785 - (k % 11 === 6 ? 0.015 : 0), 0.4, 0.032, 0.02, 0.14, 0.003); }
  for (let k = 0; k < 25; k++) f.cbox(B, plainMat(0x0a0806), -0.6 + k * 0.05 + (k % 5 > 2 ? 0.02 : 0), 0.81, 0.36, 0.022, 0.03, 0.08, 0.002);
  f.cbox(B, wd, 0, 1.36, -0.1, 1.5, 0.05, 0.42, 0.01, 0, 1, 0.4);
  f.cbox(B, wd, -0.5, 0.45, 0.6, 0.6, 0.05, 0.32, 0.01);
  for (const x of [-0.75, -0.25]) for (const z of [0.47, 0.73]) f.cyl(B, wd, x, 0.22, z, 0.02, 0.02, 0.44, 8);
  for (let k = 0; k < 6; k++) f.cbox(B, PM.paper, (Math.random() - 0.5) * 1.2, 0.01, 0.9 + Math.random() * 0.6, 0.21, 0.002, 0.29, 0.001, Math.random() * 3);
}
function fishTank(B, f) {
  const wd = mat('wood', { color: 0x4a3424 });
  f.cbox(B, wd, 0, 0.42, 0, 1.3, 0.84, 0.55, 0.01);
  f.box(B, PM.glass, 0, 1.15, 0, 1.24, 0.6, 0.5);
  f.box(B, plainMat(0x1a2a12, { roughness: 0.1, transparent: true, opacity: 0.55, ws: false }), 0, 1.0, 0, 1.2, 0.28, 0.46);
  f.cbox(B, plainMat(0x2a2a20, { roughness: 0.4 }), 0, 1.47, 0, 1.28, 0.05, 0.54, 0.01);
  f.geo(B, decalMat('cracks'), planeGeo(0.6, 0.6), 0.3, 1.15, 0.255);
  f.geo(B, decalMat('grime'), planeGeo(1.2, 0.5), 0, 1.2, 0.256);
}
function tvOnStand(B, f) {
  const m = mat('metal', { color: 0x5a5a56 }), wd = plainMat(0x4a3424, { roughness: 0.5 });
  f.cyl(B, m, 0, 0.6, 0, 0.025, 0.025, 1.2, 8);
  for (let k = 0; k < 4; k++) { const a = k / 4 * 6.28 + 0.4; f.cbox(B, m, Math.cos(a) * 0.2, 0.04, Math.sin(a) * 0.2, 0.4, 0.02, 0.03, 0.004, -a); }
  f.cbox(B, wd, 0, 1.45, -0.05, 0.62, 0.5, 0.48, 0.03);
  f.box(B, wardArt('tvdead', 0), 0, 1.47, 0.195, 0.46, 0.36, 0.002);
  for (const s of [-1, 1]) f.cyl(B, PM.chrome, s * 0.08, 1.85, -0.05, 0.004, 0.004, 0.4, 4, 0, s * 0.5);
}
function chandelier(B, f, ceil) {
  f.cyl(B, WM.brassDull, 0, ceil - 0.4, 0, 0.008, 0.008, 0.8, 4);
  f.cyl(B, WM.brassDull, 0, ceil - 0.86, 0, 0.06, 0.03, 0.14, 12);
  f.geo(B, WM.brassDull, torusGeo(0.42, 0.012, 6, 32), 0, ceil - 0.95, 0, 0, Math.PI / 2);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * 6.28, x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42;
    f.cyl(B, WM.brassDull, x, ceil - 0.9, z, 0.02, 0.025, 0.1, 8);
    f.cyl(B, plainMat(0xd8d0c0, { roughness: 0.5 }), x, ceil - 0.82, z, 0.012, 0.012, 0.08, 6);
    if (k % 3 !== 1) for (let j = 0; j < 3; j++) f.cbox(B, PM.glass, x + Math.cos(a) * 0.05, ceil - 1.0 - j * 0.04, z + Math.sin(a) * 0.05, 0.02, 0.05, 0.004, 0.002, a);
  }
  f.geo(B, plainMat(0x0a0a0a, { roughness: 0.9 }), cachedGeo('cobweb', () => new THREE.PlaneGeometry(0.6, 0.5)), 0.2, ceil - 0.7, 0.1, 0.5, 0, 0.3);
}
function grandfatherClock(B, f) {
  const wd = mat('darkWood');
  f.cbox(B, wd, 0, 0.35, 0, 0.5, 0.7, 0.32, 0.01);
  f.cbox(B, wd, 0, 1.2, 0, 0.4, 1.0, 0.26, 0.01);
  f.box(B, PM.glass, 0, 1.2, 0.135, 0.28, 0.8, 0.004);
  f.cyl(B, WM.brass, 0, 1.0, 0.1, 0.07, 0.07, 0.01, 16, Math.PI / 2);
  f.cyl(B, WM.brass, 0, 1.35, 0.1, 0.004, 0.004, 0.6, 4);
  f.cbox(B, wd, 0, 1.98, 0, 0.52, 0.56, 0.32, 0.02);
  f.geo(B, artMat('clock', 0), planeGeo(0.36, 0.36), 0, 1.98, 0.161);
  f.cbox(B, wd, 0, 2.32, 0, 0.56, 0.1, 0.36, 0.02);
}
function rug(B, x, z, w, l, rot) {
  const m = wardArt('rug', 0);
  B.add(m, cachedGeo('rug' + w + ',' + l, () => { const g = new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * l / 4); return g; }), xform(x, 0.006, z, rot));
}

Object.assign(SET_PIECES, {
  landing(L, B, a, ai, r) {
    buildLiftCar(L, B);
    // where you come in: the hospital's own sign, the way to the wards, a directory hung from the ceiling
    const sg = areaFrame(a, 16, 2.02, 0);
    sg.cbox(B, WM.brassDull, 0, 2.35, 0.02, 2.6, 0.5, 0.04, 0.01);
    sg.geo(B, labelMat('ST. AUDRA’S HOSPITAL', { bg: '#1c2a24', fg: '#c8b878', w: 1024, h: 128, size: 78, font: 'serif', weight: '700' }), planeGeo(2.4, 0.3), 0, 2.42, 0.045);
    sg.geo(B, labelMat('SUBLEVEL  B-5  ·  ISOLATION WARDS', { bg: '#1c2a24', fg: '#c8d4c0', w: 1024, h: 64, size: 40 }), planeGeo(2.4, 0.15), 0, 2.19, 0.045);
    const dir = areaFrame(a, 10.5, 11.5, Math.PI / 2);
    for (const s of [-0.35, 0.35]) dir.cyl(B, PM.chrome, s, 2.95, 0, 0.006, 0.006, 0.5, 4);
    dir.cbox(B, plainMat(0x1c2a24, { roughness: 0.6 }), 0, 2.55, 0, 1.2, 0.36, 0.04, 0.01);
    dir.geo(B, labelMat('WARD C  →   DAY ROOM   OLD WING', { bg: '#1c2a24', fg: '#d8dcc8', w: 1024, h: 128, size: 52 }), planeGeo(1.15, 0.3), 0, 2.55, 0.022);
    dir.geo(B, labelMat('←  LIFT  ·  GROUND FLOOR CLOSED', { bg: '#1c2a24', fg: '#d8dcc8', w: 1024, h: 128, size: 52 }), planeGeo(1.15, 0.3), 0, 2.55, -0.022, Math.PI);
    // the waiting area: a television high on the wall, a fish tank, a payphone, wheelchairs lined up
    const tv = areaFrame(a, 12.5, 2.02, 0);
    tv.cbox(B, PM.steelFrame, 0, 2.5, 0.12, 0.08, 0.06, 0.24, 0.006); tv.cbox(B, plainMat(0x3a3430, { roughness: 0.5 }), 0, 2.32, 0.3, 0.62, 0.48, 0.42, 0.03, 0, 1, 0.15); tv.geo(B, wardArt('tvdead', 0), planeGeo(0.48, 0.36), 0, 2.29, 0.515, 0, -0.15);
    fishTank(B, areaFrame(a, 21.5, 2.32, 0)); addCollider(L, a.offX + 21.1, a.offZ + 2.32, 0.34); addCollider(L, a.offX + 21.9, a.offZ + 2.32, 0.34);
    const ph = areaFrame(a, 6.02, 6.5, Math.PI / 2);
    ph.cbox(B, plainMat(0x7a7e78, { roughness: 0.4, metalness: 0.6 }), 0, 1.45, 0.08, 0.28, 0.5, 0.16, 0.02);
    ph.cbox(B, PM.black, 0.06, 1.42, 0.17, 0.08, 0.22, 0.05, 0.02); B.add(PM.black, tubeGeo([ph.w(0.06, 1.3, 0.17), ph.w(0.05, 0.9, 0.2), ph.w(0.0, 0.5, 0.12)], 0.006, 10, 4), _m4.identity());
    ph.geo(B, labelMat('TELEPHONE', { bg: '#1a3a6a', fg: '#e8e8e0', w: 256, h: 48, size: 30 }), planeGeo(0.26, 0.05), 0, 1.78, 0.161);
    for (let k = 0; k < 3; k++) wheelchair(B, areaFrame(a, 27.4 + k * 0.42, 3.4, -0.1), { L, rnd: r }, true);
    // the nurses' station: the call board on the pillar beside it, every light on it dead
    const cb = areaFrame(a, 12.5, 6.0, Math.PI);
    cb.cbox(B, plainMat(0x2a2c28, { roughness: 0.5 }), 0, 1.6, 0.52, 0.5, 0.7, 0.04, 0.01);
    for (let k = 0; k < 12; k++) cb.cyl(B, plainMat(k === 9 ? 0x5a1a12 : 0x3a3a32, { roughness: 0.3 }), -0.16 + (k % 3) * 0.16, 1.85 - Math.floor(k / 3) * 0.14, 0.545, 0.022, 0.022, 0.012, 10, Math.PI / 2);
    cb.geo(B, labelMat('PATIENT CALL', { fg: '#c8c4b4', w: 256, h: 48, size: 30 }), planeGeo(0.36, 0.06), 0, 2.0, 0.542);
    // the notice no one could miss
    const nt = areaFrame(a, 21.98, 13.7, -Math.PI / 2);
    nt.geo(B, wardArt('notice9', 0), planeGeo(0.42, 0.56), 0, 1.55, -0.005);
  },
  ward(L, B, a, ai, r) {
    // the corridor: curtains on their tracks, a drug trolley, a drip stand, the room plates
    const ceil = a.ceil;
    curtain(B, areaFrame(a, 20.5, 13.3, 0), 1.8, 1.7, ceil, r);
    curtain(B, areaFrame(a, 40.5, 11.2, 0), 1.6, 1.8, ceil, r);
    medCart(B, areaFrame(a, 11.4, 13.3, Math.PI)); addCollider(L, a.offX + 11.4, a.offZ + 13.3, 0.36);
    ivStand(B, areaFrame(a, 35.5, 11.3, 0.4)); addCollider(L, a.offX + 35.5, a.offZ + 11.3, 0.18);
    [2, 10, 18, 26, 34].forEach((x0, i) => {
      for (const [z, n, rot] of [[11.02, i * 2 + 1, 0], [13.98, i * 2 + 2, Math.PI]]) {
        const pf = areaFrame(a, x0 + 4.6, z, rot);
        pf.cbox(B, plainMat(0x1c2a24, { roughness: 0.5 }), 0, 1.75, 0.012, 0.3, 0.14, 0.012, 0.003);
        pf.geo(B, labelMat('C-' + String(n).padStart(2, '0'), { bg: '#1c2a24', fg: '#d8dcc8', w: 256, h: 96, size: 60 }), planeGeo(0.27, 0.1), 0, 1.75, 0.019);
      }
    });
    // C-01: every wall covered in tally marks, the mattress dragged off the bed and torn open
    const t1 = areaFrame(a, 5, 2.02, 0);
    for (const x of [-2.2, -0.9, 0.5, 1.9]) t1.geo(B, artMat('tally', 1), planeGeo(1.1, 1.4), x, 1.3 + (x % 2) * 0.2, 0.004);
    const t1e = areaFrame(a, 8.98, 5.5, -Math.PI / 2);
    for (const x of [-2.5, -1.2, 0.2, 1.6, 2.8]) t1e.geo(B, artMat('tally', 1), planeGeo(1.0, 1.3), x, 1.4, 0.004);
    const mt = areaFrame(a, 5.5, 5.5, 0.6);
    mt.cbox(B, WM.mattress, 0, 0.08, 0, 1.8, 0.14, 0.82, 0.05, 0.1); for (let k = 0; k < 9; k++) mt.cbox(B, plainMat(0xc8b878, { roughness: 0.9 }), (r() - 0.5) * 1.4, 0.17, (r() - 0.5) * 0.6, 0.15, 0.06, 0.12, 0.03, r() * 3);
    // C-03: restraints on everything, and the jacket on the floor
    const sj = areaFrame(a, 13.5, 7.5, 0.9);
    sj.cbox(B, plainMat(0xc8c4b0, { roughness: 0.85 }), 0, 0.06, 0, 0.6, 0.1, 0.45, 0.06); for (const s of [-1, 1]) sj.cbox(B, plainMat(0xc8c4b0, { roughness: 0.85 }), s * 0.55, 0.05, 0.1, 0.55, 0.07, 0.14, 0.04, s * 0.3);
    for (let k = 0; k < 4; k++) sj.cbox(B, WM.leather, -0.2 + k * 0.13, 0.115, 0, 0.04, 0.01, 0.48, 0.003);
    const sgn = areaFrame(a, 16.98, 4.5, -Math.PI / 2); sgn.geo(B, labelMat('DO NOT UNSTRAP', { bg: '#b8160e', fg: '#f2eee2', w: 512, h: 96, size: 56 }), planeGeo(0.6, 0.11), 0, 1.7, 0.005);
    // C-05: the children's drawings, a bear on the bed, a little chair
    const dw = areaFrame(a, 21, 2.02, 0);
    for (const x of [-1.8, -0.6, 0.6, 1.8]) { dw.geo(B, wardArt('drawing', Math.floor(r() * 4)), planeGeo(0.42, 0.32), x, 1.2 + r() * 0.5, 0.005, 0, 0, (r() - 0.5) * 0.2); }
    const dw2 = areaFrame(a, 24.98, 5.5, -Math.PI / 2);
    for (const x of [-1.6, 0.2, 1.8]) dw2.geo(B, wardArt('drawing', Math.floor(r() * 4)), planeGeo(0.42, 0.32), x, 1.3 + r() * 0.3, 0.005, 0, 0, (r() - 0.5) * 0.2);
    const bear = areaFrame(a, 18.45, 3.5, 0.5), fur = mat('fabric', { color: 0x7a5a3a });
    bear.sphere(B, fur, 0, 0.72, 0, 0.11, 1.1); bear.sphere(B, fur, 0, 0.9, 0.02, 0.08); for (const s of [-1, 1]) { bear.sphere(B, fur, s * 0.06, 0.97, 0, 0.03); bear.sphere(B, fur, s * 0.11, 0.7, 0.05, 0.04, 1.4); }
    bear.sphere(B, plainMat(0x0a0a0a, { roughness: 0.2 }), -0.025, 0.91, 0.075, 0.01);
    // C-07: the pipe burst; the floor is under water and the walls are black with mould
    const fl = areaFrame(a, 29, 5.5, 0);
    fl.geo(B, plainMat(0x0a0e0a, { roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.85, ws: false }), cachedGeo('wardPuddle', () => new THREE.CircleGeometry(1.6, 24).rotateX(-Math.PI / 2)), 0.6, 0.01, 0.4, 0, 0, 0, 1.4, 1, 1.1);
    fl.cyl(B, mat('rust'), 2.7, ceil - 0.25, -3.2, 0.05, 0.05, 6.6, 10, Math.PI / 2);
    fl.cyl(B, mat('rust'), 2.7, ceil - 0.25, -0.2, 0.065, 0.065, 0.2, 10, Math.PI / 2);
    for (let k = 0; k < 6; k++) fl.geo(B, decalMat('stain'), planeGeo(1.4, 1.4), -3 + k * 1.1, 1.5 + (k % 2) * 0.6, -3.47, 0, 0, r());
    // C-09: they barricaded themselves in, and it didn't hold
    const bc = areaFrame(a, 37, 8.6, 0.2);
    wardBed(B, frame(...bc.at(-1.4, -0.2), bc.rot + 1.35), { rnd: r, theme: 'ward', L }, { bare: true });
    bc.cbox(B, WM.mattress, 1.2, 0.5, 0.0, 1.8, 0.15, 0.85, 0.05, 1.3, 1, 1.2, 0);
    for (const x of [36.1, 37.9]) areaFrame(a, x, 9.98, Math.PI).geo(B, decalMat('scratch'), planeGeo(1.1, 1.5), 0, 1.4, 0);
    // C-02: the padded cell
    const pc = [[5, 15.02, 0], [5, 23.98, Math.PI], [2.02, 19.5, Math.PI / 2], [8.98, 19.5, -Math.PI / 2]];
    for (const [x, z, rot] of pc) {
      const pf = areaFrame(a, x, z, rot), len = rot === 0 || rot === Math.PI ? 6.8 : 8.8;
      for (let u = -len / 2 + 0.35; u < len / 2; u += 0.62) for (let y = 0.35; y < ceil - 0.3; y += 0.62) {
        if (rot === 0 && u > -0.4 && u < 1.4 && y < 2.4) continue;
        pf.cbox(B, WM.padded, u, y, 0.05, 0.58, 0.58, 0.1, 0.05);
      }
    }
    // C-04: the theatre
    opTable(B, areaFrame(a, 13.5, 19.0, Math.PI / 2)); addCollider(L, a.offX + 13.5, a.offZ + 18.4, 0.45); addCollider(L, a.offX + 13.5, a.offZ + 19.6, 0.45);
    surgLamp(B, areaFrame(a, 12.9, 19.0, 0), ceil);
    instrumentTray(B, areaFrame(a, 14.7, 18.0, 0.3)); addCollider(L, a.offX + 14.7, a.offZ + 18.0, 0.25);
    const gas = areaFrame(a, 15.6, 22.6, 0); gas.cyl(B, mat('metal', { color: 0x2a4a8a }), 0, 0.65, 0, 0.11, 0.11, 1.3, 14); gas.sphere(B, mat('metal', { color: 0x2a4a8a }), 0, 1.3, 0, 0.11);
    // C-06: the bathroom: a tub of black water
    bathtub(B, areaFrame(a, 22.2, 17.0, 0)); addCollider(L, a.offX + 21.6, a.offZ + 17.0, 0.42); addCollider(L, a.offX + 22.8, a.offZ + 17.0, 0.42);
    const sink = areaFrame(a, 24.98, 20.5, -Math.PI / 2); sink.cbox(B, plainMat(0xd8d6cc, { roughness: 0.25 }), 0, 0.82, 0.25, 0.55, 0.16, 0.42, 0.06); sink.cyl(B, PM.chrome, 0, 0.98, 0.1, 0.012, 0.012, 0.16, 8);
    WALL_ITEMS.mirror(B, sink, r);
    // C-08: records, everywhere
    for (const x of [27.5, 28.5]) filingCabinet(B, areaFrame(a, x, 15.4, 0), { rnd: r });
    for (let k = 0; k < 26; k++) B.add(decalMat('paper'), cachedGeo('decalPaper', () => new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2)), xform(a.offX + 26.5 + r() * 6, 0.011 + k * 0.0003, a.offZ + 16 + r() * 7, r() * 6));
    // C-10: the night nurse's room
    const nn = areaFrame(a, 37.5, 22.5, Math.PI);
    antiqueDesk(B, nn, { rnd: r, L }); hospChair(B, areaFrame(a, 37.5, 21.6, 0), { rnd: r, theme: 'oldwing', L });
    nn.cyl(B, plainMat(0x2a4a3a, { roughness: 0.3 }), 0.35, 0.95, 0.1, 0.12, 0.05, 0.12, 14); nn.cyl(B, WM.brassDull, 0.35, 0.85, 0.1, 0.012, 0.012, 0.18, 6);
    nn.geo(B, wardArt('file', 0), planeGeo(0.21, 0.16), -0.15, 0.792, 0.05, 0, -Math.PI / 2);
    // the day alcove: two armchairs and a set facing them
    tvOnStand(B, areaFrame(a, 44.0, 2.6, 0)); addCollider(L, a.offX + 44.0, a.offZ + 2.6, 0.3);
    for (const [x, z, rot] of [[43.0, 5.0, 2.8], [45.2, 5.1, -2.9]]) hospChair(B, areaFrame(a, x, z, rot), { rnd: () => 0.2, theme: 'dayroom', L });
    // the linen room: carts of sheets nobody ever came back for
    for (const [x, z] of [[43.3, 17.0], [43.0, 21.5]]) {
      const lc = areaFrame(a, x, z, r());
      lc.cbox(B, mat('fabric', { color: 0x9aa4a8 }), 0, 0.55, 0, 0.9, 0.7, 0.6, 0.06); lc.cbox(B, WM.sheet, 0, 0.92, 0, 0.8, 0.12, 0.5, 0.06, 0.2);
      for (const [px, pz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) lc.cyl(B, PM.rubber, px, 0.06, pz, 0.06, 0.06, 0.03, 10, Math.PI / 2);
      addCollider(L, a.offX + x, a.offZ + z, 0.45);
    }
  },
  dayroom(L, B, a, ai, r) {
    const ceil = a.ceil;
    // the windows they painted where there are no windows
    for (const [x, z, rot] of [[38.98, 4.5, -Math.PI / 2], [38.98, 9.5, -Math.PI / 2], [12, 28.98, Math.PI], [26, 28.98, Math.PI]]) {
      const mf = areaFrame(a, x, z, rot);
      mf.cbox(B, plainMat(0xd8d4c4, { roughness: 0.6 }), 0, 1.75, 0.02, 2.5, 1.4, 0.04, 0.01);
      mf.geo(B, wardArt('mural', Math.floor(r() * 3)), planeGeo(2.4, 1.3), 0, 1.75, 0.042);
      mf.cbox(B, plainMat(0xd8d4c4, { roughness: 0.6 }), 0, 1.0, 0.08, 2.6, 0.06, 0.16, 0.01);
    }
    // the circle of chairs: for talking. One is on its side.
    const cx = 11.5, cz = 21.0;
    for (let k = 0; k < 8; k++) {
      const ang = k / 8 * Math.PI * 2, x = cx + Math.sin(ang) * 1.9, z = cz + Math.cos(ang) * 1.9;
      hospChair(B, areaFrame(a, x, z, ang + (k === 5 ? 1.2 : 0)), { rnd: () => (k === 5 ? 0.1 : 0.9), theme: 'ward', L });
    }
    // the piano against the north wall, keys missing
    piano(B, areaFrame(a, 20.5, 1.4, 0)); for (const x of [19.9, 21.1]) addCollider(L, a.offX + x, a.offZ + 1.4, 0.42);
    // the television on its trolley, and a fish tank with nothing alive in it
    tvOnStand(B, areaFrame(a, 30.4, 16.0, -Math.PI / 2)); addCollider(L, a.offX + 30.4, a.offZ + 16.0, 0.3);
    fishTank(B, areaFrame(a, 1.32, 3.0, Math.PI / 2)); addCollider(L, a.offX + 1.35, a.offZ + 2.6, 0.34); addCollider(L, a.offX + 1.35, a.offZ + 3.4, 0.34);
    // a birthday banner from pillar to pillar, the balloons long since gone soft
    for (const [x0, x1, z] of [[8.5, 16.5, 8.5], [16.5, 24.5, 15.5]]) {
      const bf = areaFrame(a, (x0 + x1) / 2, z, 0);
      B.add(PM.black, tubeGeo(cablePts(bf.w(-(x1 - x0) / 2, ceil - 0.5, 0), bf.w((x1 - x0) / 2, ceil - 0.5, 0), 0.4, 10), 0.004, 20, 4), _m4.identity());
      bf.geo(B, wardArt('banner', 0), planeGeo(x1 - x0 - 1.2, (x1 - x0 - 1.2) / 8), 0, ceil - 0.95, 0);
    }
    for (let k = 0; k < 9; k++) { const bl = areaFrame(a, 12 + r() * 12, 10 + r() * 8, r() * 6); bl.sphere(B, plainMat([0xa83a2a, 0x2a5a9a, 0xc8a02a][k % 3], { roughness: 0.3 }), 0, 0.07, 0, 0.13, 0.45); }
    // the height chart up one pillar
    const hc = areaFrame(a, 16.5, 21.98, Math.PI);
    hc.geo(B, wardArt('height', 0), planeGeo(0.3, ceil - 0.1), 0, (ceil - 0.1) / 2, 0.005);
    // his nest, in the middle of the floor: mattresses dragged into a ring, sheets, and shoes - a lot of shoes
    const nx = 20.5, nz = 20.5;
    for (let k = 0; k < 7; k++) {
      const ang = k / 7 * Math.PI * 2 + r() * 0.3, x = nx + Math.sin(ang) * 2.0, z = nz + Math.cos(ang) * 2.0;
      const mf = areaFrame(a, x, z, ang + Math.PI / 2 + (r() - 0.5) * 0.4);
      mf.cbox(B, WM.mattress, 0, 0.1 + r() * 0.15, 0, 1.8, 0.16, 0.8, 0.06, 0, 1, (r() - 0.5) * 0.5, 0.25 + r() * 0.3);
    }
    for (let k = 0; k < 6; k++) { const sf = areaFrame(a, nx + (r() - 0.5) * 2.5, nz + (r() - 0.5) * 2.5, r() * 6); sf.cbox(B, WM.sheet, 0, 0.05, 0, 0.9 + r() * 0.6, 0.05, 0.6 + r() * 0.4, 0.04, 0, 1, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4); }
    for (let k = 0; k < 22; k++) {
      const ang = r() * Math.PI * 2, d = 0.6 + r() * 1.2, sh = areaFrame(a, nx + Math.sin(ang) * d, nz + Math.cos(ang) * d, r() * 6);
      const col = [0x2a1a10, 0x1a1a1a, 0x5a3a24, 0x8a8478, 0x3a2a3a][Math.floor(r() * 5)];
      sh.cbox(B, plainMat(col, { roughness: 0.6 }), 0, 0.05 + (k % 4) * 0.04, 0, 0.11, 0.08, 0.27, 0.03, 0, 1, r() < 0.4 ? Math.PI / 2 : 0);
    }
    B.add(decalMat('drag'), cachedGeo('nestDrag', () => new THREE.PlaneGeometry(1.4, 4.0).rotateX(-Math.PI / 2)), xform(a.offX + nx + 1.5, 0.009, a.offZ + nz - 3.5, 0.6));
    // the ping-pong table nobody plays on
    const pp = areaFrame(a, 29.0, 24.0, 0);
    pp.cbox(B, plainMat(0x1a4a2a, { roughness: 0.5 }), 0, 0.76, 0, 2.74, 0.04, 1.52, 0.01);
    pp.geo(B, lineMat(), cachedGeo('ppLine', () => new THREE.PlaneGeometry(2.7, 0.02).rotateX(-Math.PI / 2)), 0, 0.782, 0);
    pp.cbox(B, plainMat(0xe8e4d8, { roughness: 0.6, transparent: true, opacity: 0.6, ws: false }), 0, 0.85, 0, 0.01, 0.15, 1.6, 0.001);
    for (const x of [-1.1, 1.1]) for (const z of [-0.6, 0.6]) pp.cyl(B, PM.steelFrame, x, 0.37, z, 0.025, 0.025, 0.74, 8);
    for (const x of [-0.8, 0, 0.8]) addCollider(L, a.offX + 29 + x, a.offZ + 24, 0.62);
  },
  oldwing(L, B, a, ai, r) {
    const ceil = a.ceil;
    // the hall: a runner down its length, portraits between sconces, a chandelier, a clock that stopped
    rug(B, a.offX + 15.5, a.offZ + 10.5, 1.6, 28, Math.PI / 2);
    chandelier(B, areaFrame(a, 14.5, 10.5, 0), ceil);
    chandelier(B, areaFrame(a, 26.5, 10.5, 0.4), ceil);
    grandfatherClock(B, areaFrame(a, 28.5, 9.18, 0)); addCollider(L, a.offX + 28.5, a.offZ + 9.25, 0.3);
    const bust = areaFrame(a, 1.6, 9.3, Math.PI / 2);
    bust.cyl(B, plainMat(0x2a2a28, { roughness: 0.3 }), 0, 0.55, 0, 0.18, 0.2, 1.1, 16); bust.sphere(B, plainMat(0xb8b4a8, { roughness: 0.6 }), 0, 1.25, 0, 0.16, 0.9); bust.sphere(B, plainMat(0xb8b4a8, { roughness: 0.6 }), 0, 1.48, 0.02, 0.1, 1.15);
    addCollider(L, a.offX + 1.6, a.offZ + 9.3, 0.25);
    // the library: a reading table, a lamp, a book left open, more on the floor
    const rt = areaFrame(a, 7.5, 4.5, 0);
    antiqueDesk(B, frame(...rt.at(-0.5, 0), rt.rot), { rnd: () => 0.9, L }); antiqueDesk(B, frame(...rt.at(0.5, 0), rt.rot), { rnd: () => 0.2, L });
    rt.cbox(B, PM.paper, 0.1, 0.8, 0.0, 0.42, 0.02, 0.3, 0.004, 0.2); rt.cbox(B, mat('card', { color: 0x4a1a14 }), 0.1, 0.79, 0.0, 0.44, 0.012, 0.31, 0.003, 0.2);
    for (let k = 0; k < 14; k++) { const bf = areaFrame(a, 4 + r() * 7.5, 2.6 + r() * 4, r() * 6); bf.cbox(B, mat('card', { color: [0x4a1a14, 0x1a2a3a, 0x3a2a14, 0x2a3a1a][k % 4] }), 0, 0.02 + (k % 3) * 0.035, 0, 0.18, 0.035, 0.25, 0.004, 0, 1, r() < 0.3 ? 0.4 : 0); }
    const lad = areaFrame(a, 11.4, 3.5, -Math.PI / 2);
    for (const s of [-0.2, 0.2]) lad.cbox(B, mat('darkWood'), s, 1.2, 0.35, 0.05, 2.5, 0.05, 0.006, 0, 1, -0.22);
    for (let y = 0.3; y < 2.3; y += 0.32) lad.cbox(B, mat('darkWood'), 0, y, 0.35 - (y - 1.2) * 0.22, 0.4, 0.03, 0.05, 0.004);
    // the chapel: an altar, its candles long out, a lectern, a rose window with no light behind it, organ pipes
    const al = areaFrame(a, 21.5, 2.4, 0);
    al.cbox(B, mat('darkWood'), 0, 0.5, 0, 2.0, 1.0, 0.7, 0.02); al.cbox(B, mat('fabric', { color: 0xc8c0a8 }), 0, 1.01, 0, 2.1, 0.02, 0.76, 0.01); al.cbox(B, WM.velvet, 0, 0.7, 0.36, 1.6, 0.6, 0.012, 0.004);
    for (const x of [-0.75, 0.75]) { al.cyl(B, WM.brass, x, 1.25, 0, 0.03, 0.06, 0.45, 12); al.cyl(B, plainMat(0xe0d8c0, { roughness: 0.5 }), x, 1.55, 0, 0.022, 0.022, 0.18, 10); }
    for (let k = 0; k < 9; k++) al.cyl(B, plainMat(0xd8d0b8, { roughness: 0.5 }), -0.4 + (k % 5) * 0.2, 1.06 + (k % 3) * 0.02, -0.1 + Math.floor(k / 5) * 0.15, 0.018, 0.02, 0.06 + (k % 4) * 0.04, 8);
    for (let k = 0; k < 5; k++) al.geo(B, decalMat('stain'), planeGeo(0.3, 0.3), -0.4 + k * 0.2, 1.025, 0.1, 0, -Math.PI / 2, r());
    addCollider(L, a.offX + 20.9, a.offZ + 2.4, 0.4); addCollider(L, a.offX + 22.1, a.offZ + 2.4, 0.4);
    const rw = areaFrame(a, 21.5, 2.02, 0);
    rw.cyl(B, mat('darkWood'), 0, 2.35, 0.02, 0.62, 0.62, 0.05, 32, Math.PI / 2);
    rw.geo(B, wardArt('rose', 0), cachedGeo('roseDisc', () => new THREE.CircleGeometry(0.58, 40)), 0, 2.35, 0.048);
    const lec = areaFrame(a, 19.6, 3.2, 0.25);
    lec.cyl(B, mat('darkWood'), 0, 0.55, 0, 0.05, 0.08, 1.1, 10); lec.cbox(B, mat('darkWood'), 0, 1.15, 0, 0.5, 0.05, 0.38, 0.01, 0, 1, 0.5);
    lec.cbox(B, PM.paper, 0, 1.2, 0, 0.42, 0.02, 0.3, 0.004, 0, 1, 0.5); addCollider(L, a.offX + 19.6, a.offZ + 3.2, 0.2);
    const org = areaFrame(a, 27.98, 4.5, -Math.PI / 2);
    for (let k = 0; k < 15; k++) { const x = -1.6 + k * 0.23, hh = 1.2 + Math.sin(k / 14 * Math.PI) * 1.1; org.cyl(B, WM.brassDull, x, 0.9 + hh / 2, 0.12, 0.07, 0.07, hh, 12); org.cbox(B, plainMat(0x0a0806), x, 1.0, 0.19, 0.04, 0.05, 0.01, 0.002); }
    org.cbox(B, mat('darkWood'), 0, 0.45, 0.18, 3.8, 0.9, 0.36, 0.02);
    // the office: the founder watching the desk, the safe in the corner, a coat on the stand
    const of = areaFrame(a, 8.5, 13.02, 0);
    WALL_ITEMS.portrait(B, of, () => 0.0);
    const sf = areaFrame(a, 4.55, 18.5, Math.PI / 2);
    sf.cbox(B, plainMat(0x2a2e2a, { roughness: 0.4, metalness: 0.7 }), 0, 0.45, 0, 0.7, 0.9, 0.62, 0.02); sf.cyl(B, WM.brass, 0, 0.55, 0.32, 0.08, 0.08, 0.03, 18, Math.PI / 2); sf.cbox(B, WM.brass, 0.22, 0.45, 0.32, 0.03, 0.2, 0.03, 0.006);
    addCollider(L, a.offX + 4.55, a.offZ + 18.5, 0.4);
    const cs = areaFrame(a, 12.5, 18.4, 0);
    cs.cyl(B, mat('darkWood'), 0, 0.9, 0, 0.025, 0.03, 1.8, 8); for (let k = 0; k < 4; k++) cs.cyl(B, mat('darkWood'), Math.cos(k * 1.57) * 0.12, 1.72, Math.sin(k * 1.57) * 0.12, 0.012, 0.012, 0.2, 6, Math.sin(k * 1.57) * 0.8, -Math.cos(k * 1.57) * 0.8);
    cs.cbox(B, mat('fabric', { color: 0x2a2620 }), 0.08, 1.25, 0.02, 0.4, 0.9, 0.14, 0.06, 0.4); addCollider(L, a.offX + 12.5, a.offZ + 18.4, 0.22);
    // the porter's lodge: a narrow bed, a stove, the board of keys, a radio
    wardBed(B, areaFrame(a, 16.6, 16.0, Math.PI / 2), { rnd: () => 0.9, theme: 'ward', L });
    const st = areaFrame(a, 26.4, 18.5, Math.PI);
    st.cyl(B, plainMat(0x1a1a18, { roughness: 0.5, metalness: 0.6 }), 0, 0.45, 0, 0.26, 0.3, 0.9, 16); st.cyl(B, plainMat(0x1a1a18, { roughness: 0.5, metalness: 0.6 }), 0, 1.6, -0.1, 0.06, 0.06, 1.4, 10);
    addCollider(L, a.offX + 26.4, a.offZ + 18.5, 0.32);
    const kb = areaFrame(a, 22.0, 19.98, Math.PI);
    kb.cbox(B, mat('darkWood'), 0, 1.6, 0.02, 0.8, 0.5, 0.03, 0.006);
    for (let k = 0; k < 15; k++) { const x = -0.32 + (k % 5) * 0.16, y = 1.75 - Math.floor(k / 5) * 0.15; kb.cyl(B, WM.brass, x, y, 0.05, 0.004, 0.004, 0.05, 4, Math.PI / 2); if (k % 4 !== 2) kb.cbox(B, WM.brassDull, x, y - 0.05, 0.06, 0.02, 0.06, 0.004, 0.002); }
    // the lift: brass rails round the car, a mirror gone black, a bench, a lamp in a glass bowl, and the
    // dial over the gate that shows where it is
    const ex = a.offX, ez = a.offZ, brass = WM.brass;
    for (const [x0, z0, x1, z1] of [[38.1, 6.1, 38.1, 14.9], [38.1, 6.1, 42.9, 6.1], [38.1, 14.9, 42.9, 14.9], [42.9, 6.1, 42.9, 14.9]]) {
      if (x0 === x1 && x0 < 39) {
        for (const [za, zb] of [[6.1, 8.9], [12.1, 14.9]]) B.add(brass, cylGeo(0.02, 0.02, zb - za, 10), xform(ex + x0 + 0.03, 0.95, ez + (za + zb) / 2, 0, Math.PI / 2));
        continue;
      }
      const len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      B.add(brass, cylGeo(0.02, 0.02, len, 10), xform(ex + mx + (x0 === x1 ? -0.07 : 0), 0.95, ez + mz + (z0 === z1 ? (z0 < 10 ? 0.07 : -0.07) : 0), x0 === x1 ? 0 : Math.PI / 2, x0 === x1 ? Math.PI / 2 : 0, x0 === x1 ? 0 : Math.PI / 2));
    }
    const mir = areaFrame(a, 42.98, 10.5, -Math.PI / 2);
    mir.cbox(B, brass, 0, 1.6, 0.02, 1.4, 1.6, 0.04, 0.01); mir.box(B, plainMat(0x1a1e20, { roughness: 0.05, metalness: 1 }), 0, 1.6, 0.045, 1.3, 1.5, 0.004);
    mir.geo(B, decalMat('cracks'), planeGeo(1.2, 1.2), 0.2, 1.7, 0.05);
    const bn = areaFrame(a, 42.6, 7.4, -Math.PI / 2); bn.cbox(B, WM.velvet, 0, 0.45, 0.1, 1.4, 0.1, 0.4, 0.04); bn.cbox(B, mat('darkWood'), 0, 0.22, 0.1, 1.4, 0.44, 0.36, 0.01);
    addCollider(L, ex + 42.6, ez + 7.0, 0.3); addCollider(L, ex + 42.6, ez + 7.8, 0.3);
    const lp = areaFrame(a, 40.5, 10.5, 0);
    lp.cyl(B, brass, 0, ceil - 0.1, 0, 0.012, 0.012, 0.2, 6); lp.sphere(B, plainMat(0xd8d0b8, { roughness: 0.2, transparent: true, opacity: 0.7, ws: false }), 0, ceil - 0.28, 0, 0.18, 0.6);
    const dl = areaFrame(a, 36.95, 10.5, -Math.PI / 2);
    dl.cbox(B, brass, 0, 3.14, 0.03, 0.62, 0.32, 0.05, 0.02);
    dl.geo(B, labelMat('B5   B4   B3   B2   B1   A1', { bg: '#d8ccaa', fg: '#2a1e0a', w: 512, h: 128, size: 40, font: 'serif', weight: '700' }), planeGeo(0.54, 0.12), 0, 3.19, 0.056);
    dl.cbox(B, plainMat(0x1a0e08), -0.21, 3.07, 0.06, 0.012, 0.16, 0.006, 0.002, 0, 1, 0, 0.9);
    rug(B, ex + 40.5, ez + 10.5, 2.4, 6.5, 0);
  },
});

// ---------- the old wing's lift: a brass lattice gate, and a call button like a door bell ----------
THEMES.oldwing.liftDoors = (g, W) => {
  const brass = WM.brass, leafW = W / 2;
  const mk = (s) => {
    const p = new THREE.Group();
    const add = (geo, x, y, z, rz = 0) => { const o = new THREE.Mesh(geo, brass); o.position.set(x, y, z); o.rotation.z = rz; o.castShadow = true; p.add(o); };
    add(boxGeo(leafW, 0.05, 0.03), 0, 2.85, 0); add(boxGeo(leafW, 0.05, 0.03), 0, 0.05, 0);
    for (let k = 0; k <= 6; k++) add(boxGeo(0.025, 2.8, 0.025), -leafW / 2 + k * leafW / 6, 1.45, 0);
    const d = Math.hypot(leafW / 6, 0.4), a = Math.atan2(0.4, leafW / 6);
    for (let k = 0; k < 6; k++) for (let j = 0; j < 7; j++) { add(boxGeo(d, 0.012, 0.01), -leafW / 2 + (k + 0.5) * leafW / 6, 0.25 + j * 0.4, 0.015, a); add(boxGeo(d, 0.012, 0.01), -leafW / 2 + (k + 0.5) * leafW / 6, 0.25 + j * 0.4, -0.015, -a); }
    add(cylGeo(0.02, 0.02, 0.3, 8), s * (leafW / 2 - 0.05), 1.2, 0.05);
    g.add(p);
    return p;
  };
  const left = mk(1), right = mk(-1);
  left.position.set(-W / 4, 0, 0.05); right.position.set(W / 4, 0, 0.05);
  return { left, right, W };
};
THEMES.oldwing.callButton = (g, D) => {
  const plate = new THREE.Mesh(cboxGeo(0.16, 0.26, 0.02, 0.006), WM.brass); plate.position.set(0, 1.3, 0.01); g.add(plate);
  const btn = new THREE.Mesh(cylGeo(0.035, 0.035, 0.03, 18), new THREE.MeshBasicMaterial({ color: 0xffb02e })); btn.rotation.x = Math.PI / 2; btn.position.set(0, 1.3, 0.03); g.add(btn); D.button = btn;
  const lbl = new THREE.Mesh(planeGeo(0.12, 0.04), labelMat('CALL', { fg: '#2a1e0a', w: 128, h: 48, size: 34, font: 'serif', weight: '700' })); lbl.position.set(0, 1.41, 0.022); g.add(lbl);
};
