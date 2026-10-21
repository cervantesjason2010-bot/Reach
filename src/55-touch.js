// ================= touch: playing on a phone or a tablet =================
// On a touch screen the controls go on the glass. A move stick appears under the left thumb wherever it lands;
// the rest of the screen is for looking round; the buttons sit in an arc under the right thumb, round a big Use.
// "Controls" in the menu picks Auto (touch on phones and tablets, keyboard and mouse everywhere else), Mobile or PC.
const TOUCH_DEVICE = (() => {
  try {
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) return true;
    // an iPad asking for the desktop site says it is a Mac - but no Mac has a touch screen
    return navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent || '');
  } catch (e) { return false; }
})();
const STICK_R = 54;              // how far the knob travels from the middle of the stick, in CSS pixels
const LOOK_RATE = 0.0052;        // radians of turn per pixel dragged, at sensitivity 1
const Touch = { on: false, stick: null, look: null, mx: 0, my: 0, run: false, stickRun: false, rotateOk: false, hinted: false, wake: null };

function touchMode() { return Settings.controls === 'mobile' || (Settings.controls !== 'pc' && TOUCH_DEVICE); }
// the word on screen for a key - or, on a touch screen, for the button that does its job
function keyWord(key) { return Touch.on ? ({ E: 'Use', Q: 'Drop', F: 'Light', C: 'Crouch', G: 'Whistle' }[key] || key) : key; }
function escHint(text) { return Touch.on ? text : text + ' · Esc'; }

function applyControls() {
  Touch.on = touchMode();
  document.body.classList.toggle('touch', Touch.on);
  if (!Touch.on) touchRelease();
  const note = $('ctl-note');
  if (note) setText(note, Settings.controls === 'auto'
    ? (TOUCH_DEVICE ? 'Auto picked Mobile: a move stick and buttons on the screen.' : 'Auto picked PC: keyboard and mouse.')
    : Settings.controls === 'mobile' ? 'A move stick and buttons on the screen. Hold your phone sideways.' : 'Keyboard and mouse.');
}

// let go of everything: the stick, the look finger, a held Use, the run lock
function touchRelease() {
  Touch.stick = null; Touch.look = null; Touch.mx = 0; Touch.my = 0; Touch.run = false; Touch.stickRun = false;
  Input.eHeld = false;
  const st = $('t-stick');
  if (st) { st.classList.remove('on', 'sprint'); st.style.left = ''; st.style.top = ''; $('t-knob').style.transform = ''; }
  document.querySelectorAll('#touch .tb.down').forEach((b) => b.classList.remove('down'));
}
// the analogue move the player code reads: x right, y back (screen down), magnitude 0..1
function touchMove() { return Touch.on && Touch.stick ? { x: Touch.mx, y: Touch.my } : null; }
function touchSprint() { return Touch.on && !!Touch.stick && (Touch.run || Touch.stickRun); }

// ---------- the stick ----------
function stickStart(e) {
  const w = window.innerWidth, h = window.innerHeight, m = 62 + 8;
  // it comes to the thumb, kept far enough in from the edges that the whole ring is on the screen
  const x = clamp(e.clientX, m, Math.max(m, w - m)), y = clamp(e.clientY, m, Math.max(m, h - m));
  Touch.stick = { id: e.pointerId, x0: x, y0: y };
  const st = $('t-stick');
  st.style.left = x + 'px'; st.style.top = y + 'px';
  st.classList.add('on');
  stickMoveTo(e.clientX, e.clientY);
}
function stickMoveTo(cx, cy) {
  const S = Touch.stick; if (!S) return;
  const dx = cx - S.x0, dy = cy - S.y0, d = Math.hypot(dx, dy);
  const k = d > STICK_R ? STICK_R / d : 1;
  $('t-knob').style.transform = 'translate(' + (dx * k).toFixed(1) + 'px,' + (dy * k).toFixed(1) + 'px)';
  // a small dead zone in the middle, and full speed a little before the edge
  const n = Math.min(1, d / STICK_R), mag = clamp((n - 0.12) / 0.74, 0, 1);
  Touch.mx = d > 0 ? dx / d * mag : 0; Touch.my = d > 0 ? dy / d * mag : 0;
  // pushed on up past the ring: run, for as long as the thumb stays out there
  Touch.stickRun = d > STICK_R * 1.35 && dy < -STICK_R * 0.9;
  $('t-stick').classList.toggle('sprint', touchSprint());
}
function stickEnd() {
  Touch.stick = null; Touch.mx = 0; Touch.my = 0; Touch.stickRun = false;
  // letting go of the stick ends a run
  Touch.run = false;
  const st = $('t-stick');
  st.classList.remove('on', 'sprint'); st.style.left = ''; st.style.top = '';
  $('t-knob').style.transform = '';
}

// ---------- looking ----------
function lookMoveTo(cx, cy) {
  const L = Touch.look; if (!L) return;
  const dx = cx - L.x, dy = cy - L.y;
  L.x = cx; L.y = cy;
  const me = Game.me;
  if (Game.mode !== 'play' || !me || me.dead || Game.reading || Game.keypad || Game.paused) return;
  const s = LOOK_RATE * Settings.sens;
  me.yaw -= dx * s;
  me.pitch = clamp(me.pitch - dy * s, -1.4, 1.4);
  // the torch lags the turn a little, the way it does with a mouse
  const vm = World.viewModel;
  if (vm) { vm.lagX = clamp((vm.lagX || 0) + dx * 0.00045, -0.05, 0.05); vm.lagY = clamp((vm.lagY || 0) + dy * 0.00045, -0.05, 0.05); }
}

// ---------- wiring ----------
function touchButton(id, down, up) {
  const b = $(id);
  let held = -1;
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (held >= 0) return;
    held = e.pointerId;
    try { b.setPointerCapture(e.pointerId); } catch (x) { /* fine without */ }
    b.classList.add('down');
    down(e);
  });
  const release = (e) => {
    if (held < 0 || (e && e.pointerId !== held)) return;
    held = -1;
    b.classList.remove('down');
    if (up) up(e);
  };
  b.addEventListener('pointerup', release);
  b.addEventListener('pointercancel', release);
  b.addEventListener('lostpointercapture', release);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
function wireTouch() {
  const layer = $('touch');
  layer.addEventListener('pointerdown', (e) => {
    if (e.target !== layer || !Touch.on) return;      // the buttons look after themselves
    e.preventDefault();
    const w = window.innerWidth, h = window.innerHeight;
    // the left of the screen (below the very top) moves; everywhere else looks
    if (e.clientX < w * 0.42 && e.clientY > h * 0.22 && !Touch.stick) stickStart(e);
    else if (!Touch.look) Touch.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    else return;
    try { layer.setPointerCapture(e.pointerId); } catch (x) { /* fine without */ }
  });
  layer.addEventListener('pointermove', (e) => {
    if (Touch.stick && e.pointerId === Touch.stick.id) { e.preventDefault(); stickMoveTo(e.clientX, e.clientY); }
    else if (Touch.look && e.pointerId === Touch.look.id) {
      e.preventDefault();
      // every sample the browser collected since the last event, not just the latest: smoother turns
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (list && list.length) for (const c of list) lookMoveTo(c.clientX, c.clientY); else lookMoveTo(e.clientX, e.clientY);
    }
  });
  const end = (e) => {
    if (Touch.stick && e.pointerId === Touch.stick.id) stickEnd();
    if (Touch.look && e.pointerId === Touch.look.id) Touch.look = null;
  };
  layer.addEventListener('pointerup', end);
  layer.addEventListener('pointercancel', end);
  layer.addEventListener('lostpointercapture', end);
  // nothing on the glass scrolls, zooms, selects or opens a menu while you play
  for (const ev of ['touchstart', 'touchmove']) layer.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  layer.addEventListener('contextmenu', (e) => e.preventDefault());
  touchButton('t-use', () => { Input.ePressed = true; Input.eHeld = true; }, () => { Input.eHeld = false; });
  touchButton('t-light', () => { Input.fPressed = true; });
  touchButton('t-crouch', () => { Input.cPressed = true; Touch.run = false; });
  touchButton('t-run', () => {
    Touch.run = !Touch.run;
    if (Touch.run && Game.me && Game.me.crouching) Game.me.crouching = false;
    $('t-stick').classList.toggle('sprint', touchSprint());
  });
  touchButton('t-drop', () => { Input.qPressed = true; });
  touchButton('t-whistle', () => { Input.gPressed = true; });
  touchButton('t-pause', () => { if (Game.mode === 'play') togglePause(true); });
  // the slots: tap one to take it in hand
  document.querySelectorAll('#inv .slot').forEach((el, i) => el.addEventListener('pointerdown', (e) => {
    if (!Touch.on || Game.mode !== 'play') return;
    e.preventDefault(); e.stopPropagation();
    Input.slotPick = i;
  }));
  $('mic').addEventListener('pointerdown', (e) => { if (!Touch.on) return; e.preventDefault(); e.stopPropagation(); toggleMute(); });
  $('btn-rotate-ok').addEventListener('click', () => { Touch.rotateOk = true; $('rotate').hidden = true; });
  $('btn-full').addEventListener('click', () => { goFullscreen(true); $('btn-full').hidden = true; });
  $('btn-reload').addEventListener('click', () => location.reload());
  window.addEventListener('blur', touchRelease);
  document.addEventListener('visibilitychange', () => { if (document.hidden) touchRelease(); else if (Touch.wake) keepAwake(true); });
}

// ---------- full screen, the right way up, and awake ----------
function fullscreenOn() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function fullscreenAvailable() { const el = document.documentElement; return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(el.requestFullscreen || el.webkitRequestFullscreen); }
// Asked from a tap (the browser only allows it then). On phones that can, it also holds the screen sideways.
function goFullscreen(sideways) {
  const lock = () => { if (sideways) lockSideways(); };
  if (!Touch.on) return;
  if (fullscreenOn()) { lock(); return; }
  if (!fullscreenAvailable()) return;
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && typeof p.then === 'function') p.then(lock, () => {}); else setTimeout(lock, 300);
  } catch (e) { /* not here: carry on in the page */ }
}
function lockSideways() {
  try { if (screen.orientation && screen.orientation.lock && fullscreenOn()) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* not supported */ }
}
function unlockSideways() {
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* not supported */ }
}
// the screen never dims in the middle of a game: there are long stretches of standing still and listening
async function keepAwake(on) {
  try {
    if (on && navigator.wakeLock && !document.hidden) { if (!Touch.wake || Touch.wake.released) Touch.wake = await navigator.wakeLock.request('screen'); }
    else if (!on && Touch.wake) { const w = Touch.wake; Touch.wake = null; await w.release(); }
  } catch (e) { /* not allowed here */ }
}
// a short buzz in the hand, on phones that can
function buzz(pattern) { try { if (Touch.on && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* no vibration */ } }

// ---------- every frame ----------
function updateTouch() {
  const layer = $('touch');
  if (!layer) return;
  const playing = Touch.on && Game.mode === 'play';
  // sideways is best; say so once, and let anyone who wants to play upright do it anyway
  const tall = window.innerHeight > window.innerWidth * 1.05;
  const showRotate = playing && tall && !Touch.rotateOk && $('pause').hidden;
  if ($('rotate').hidden === showRotate) $('rotate').hidden = !showRotate;
  if (!playing) { if (Touch.stick || Touch.look) touchRelease(); return; }
  const me = Game.me, dead = !me || me.dead;
  layer.classList.toggle('dead', dead);
  if (dead) { if (Touch.stick || Touch.look) touchRelease(); return; }
  const tg = me.target, ready = !!(tg && tg.ok && !Game.reading && !Game.keypad);
  const use = $('t-use');
  use.classList.toggle('ready', ready);
  const holding = ready && !!tg.hold && Input.eHeld;
  use.classList.toggle('hold', holding);
  if (holding) use.querySelector('.ring').style.setProperty('--p', String(Math.round((tg.progress || 0) * 100)));
  $('t-light').classList.toggle('on', !!me.fl);
  $('t-crouch').classList.toggle('on', !!me.crouching);
  $('t-run').classList.toggle('on', Touch.run || !!me.sprinting);
  $('t-drop').classList.toggle('off', !heldItem());
  $('t-whistle').classList.toggle('off', performance.now() - (Game.lastWhistle || 0) < 1600);
  // the first time: how it works, in one line
  if (!Touch.hinted) {
    Touch.hinted = true;
    let n = 0; try { n = +(localStorage.getItem('reach-touch-hint') || 0); localStorage.setItem('reach-touch-hint', String(n + 1)); } catch (e) { n = 0; }
    if (n < 3) setTimeout(() => { if (Game.mode === 'play') showToast('Left thumb moves · drag the right side to look', '', 4200); }, 1800);
  }
}
