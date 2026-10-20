// ================= main: settings, input, menus, the loop =================
const ARTIFACT_URL = 'https://claude.ai/artifact/8XJgwwX12eTSejCRbKjViN';
const Settings = { name: '', color: 0, sens: 1, vol: 0.9, bright: 1.15, muted: false, gfx: 'high', rdist: 80, net: 'auto', whisper: true, map: 'l1', ui: 0.85, early: false };
const MAP_NAMES = { l1: 'Reach - B4', l2: 'Seize - B5 · Early access', l3: 'Breach - A1 · Early access', camp: 'Campaign · All the Way Down' };
// levels still in early access: playable once the code has been entered
const EARLY_MAPS = ['l2', 'l3'];

function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('reach-settings') || '{}') || {}; } catch (e) { saved = {}; }
  Settings.name = typeof saved.name === 'string' && saved.name ? saved.name : 'Player ' + (10 + Math.floor(Math.random() * 90));
  const okColor = (Number.isInteger(saved.color) && saved.color >= 0 && saved.color < COLORS.length) || (typeof saved.color === 'string' && /^#[0-9a-f]{6}$/i.test(saved.color));
  Settings.color = okColor ? saved.color : Math.floor(Math.random() * 4);
  Settings.sens = typeof saved.sens === 'number' ? clamp(saved.sens, 0.4, 2.4) : 1;
  Settings.vol = typeof saved.vol === 'number' ? clamp(saved.vol, 0, 1) : 0.9;
  Settings.bright = typeof saved.bright === 'number' ? clamp(saved.bright, 0.7, 1.9) : 1.15;
  Settings.gfx = ['low', 'med', 'high', 'ultra'].includes(saved.gfx) ? saved.gfx : 'high';
  Settings.rdist = [30, 50, 80, 140].includes(saved.rdist) ? saved.rdist : 80;
  Settings.net = saved.net === 'relay' ? 'relay' : 'auto';
  Settings.whisper = saved.whisper !== false;
  Settings.early = saved.early === true;   // Seize - B5 and Breach - A1 unlocked with the early access code
  Settings.map = saved.map === 'camp' ? 'camp' : EARLY_MAPS.includes(saved.map) && Settings.early ? saved.map : 'l1';
  Settings.ui = [0.7, 0.85, 1].includes(saved.ui) ? saved.ui : 0.85;
  applyUiSize();
  $('name-input').value = Settings.name; $('sens').value = String(Settings.sens); $('vol').value = String(Settings.vol); $('bright').value = String(Settings.bright);
  $('whisper').checked = Settings.whisper;
}
function saveSettings() {
  const v = $('name-input').value.trim().replace(/\s+/g, ' ').slice(0, 14);
  if (v) Settings.name = v;
  try {
    localStorage.setItem('reach-settings', JSON.stringify({ name: Settings.name, color: Settings.color, sens: Settings.sens, vol: Settings.vol, bright: Settings.bright,
      gfx: Settings.gfx, rdist: Settings.rdist, net: Settings.net, whisper: Settings.whisper, map: Settings.map, ui: Settings.ui, early: Settings.early }));
  } catch (e) { /* storage blocked */ }
}

// ---------- the menu's pickers: suit colour, map, and the segmented settings ----------
function renderSwatches() {
  const box = $('swatches');
  if (!box.children.length) {
    COLORS.forEach((c, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.style.background = c;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Suit colour ' + (i + 1));
      b.addEventListener('click', () => { Settings.color = i; saveSettings(); renderSwatches(); });
      box.appendChild(b);
    });
    const cu = document.createElement('label'); cu.className = 'custom'; cu.title = 'Pick any colour';
    const inp = document.createElement('input'); inp.type = 'color'; inp.setAttribute('aria-label', 'Custom suit colour');
    inp.addEventListener('input', () => { Settings.color = inp.value; saveSettings(); renderSwatches(); });
    cu.appendChild(inp); box.appendChild(cu);
  }
  const custom = typeof Settings.color === 'string';
  [...box.querySelectorAll('button')].forEach((b, i) => { const on = !custom && Settings.color === i; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
  const cu = box.querySelector('.custom');
  cu.classList.toggle('on', custom);
  cu.style.background = custom ? Settings.color : '';
  cu.querySelector('input').value = custom ? Settings.color : '#e8a33a';
}
function applyUiSize() { $('hud').style.setProperty('--ui', String(Settings.ui)); }
function renderMaps() {
  document.querySelectorAll('#maps .map').forEach((b) => {
    const ea = EARLY_MAPS.indexOf(b.dataset.map);
    if (ea >= 0) {
      // still coming soon - unless this player has entered the early access code
      const open = !!Settings.early;
      b.classList.toggle('locked', !open);
      setText(b.querySelector('.mn'), 'Level ' + (ea + 2) + ' · ' + (open ? 'Early access' : 'Coming soon'));
    }
    const on = b.dataset.map === Settings.map; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on));
  });
}
// the early access code was right: open Seize - B5 and pick it
function unlockEarlyAccess(want) {
  Settings.early = true; Settings.map = EARLY_MAPS.includes(want) ? want : 'l2'; saveSettings(); renderMaps();
  netNote('Early access unlocked: Seize - B5 and Breach - A1. ' + MAP_NAMES[Settings.map].split(' · ')[0] + ' is selected.');
}
function wireSegs(id, key, apply, parse = (v) => v) {
  const box = $(id);
  const render = () => box.querySelectorAll('button').forEach((b) => { const on = String(Settings[key]) === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(on)); });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    Settings[key] = parse(b.dataset.v); saveSettings(); render();
    if (apply) apply();
  });
  render();
}

// ---------- modes ----------
function setMode(m) {
  Game.mode = m;
  $('lobby').hidden = m !== 'lobby';
  $('hud').hidden = m !== 'play';
  $('pause').hidden = true;
  if (m !== 'end') $('end').hidden = true;
  $('skip').hidden = !(m === 'coldopen' || (m === 'intro' && netIsHost()));
  if (m !== 'play' && document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* fine */ } }
  if (World.viewModel) World.viewModel.group.visible = m === 'play' || m === 'intro';
  if (m === 'lobby') renderLobbyUI();
  if (m === 'play' && !document.pointerLockElement && !Look.dragLook) { $('pause').hidden = false; setText($('pause-note'), 'Click to take control.'); setText($('btn-resume'), 'Play'); }
}

// ---------- levels ----------
// Only one level's world exists at a time: switching tears the old one down and builds the next. Reach - B4
// is the one standing behind the menu (the opening and the lobby are set in it).
const _waitFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
function levelForMap(map) { return map === 'camp' ? Game.campLv || 'l1' : LEVELS[map] ? map : 'l1'; }
function disposeTree(o) {
  const shared = new Set(GeoCache.values());
  o.traverse((n) => { if (n.geometry && !shared.has(n.geometry) && !(n.geometry.userData && n.geometry.userData.ni)) n.geometry.dispose(); });
}
function resetLevelState() {
  World.doorways = []; World.sparks = []; World.sparkFx = []; World.curtains = []; World.endCar = null; World.liftBulb = null; World.lairCovers = []; World.runs = null; World.genPos = null; World.digits = null; World.keypads = null; World.bloodPools = [];
  Lift.ready = false; Lift.segs = [];
  OCC.cache.clear(); OCC.slot = []; OCC.mate = []; R.poolPicked = null;
  for (const u of WS.occPt.value) u.w = -1;
  Creature.inited = false; Creature.override = null;
  setChudVisible(false); setPaleVisible(false); PS.init = false; CS.init = false;
  Breach.hatch = null; Breach.silo = null;
  if (R.key) { R.key.intensity = 0; R.backlight.intensity = 0; }
}
async function loadLevel(lv, say = () => {}) {
  if (Game.levelKey === lv && Game.L) return;
  Game.loading = true;
  try {
    if (World.group) { if (World.group.parent) World.group.parent.remove(World.group); disposeTree(World.group); }
    resetLevelState();
    Game.levelKey = lv;
    say('Drawing the plans…'); await _waitFrame();
    Game.L = assembleLevel(buildAllMaps(lv));
    patchLiftCells(Game.L);
    buildLevelField(Game.L);
    say('Building ' + LEVELS[lv].title + '…'); await _waitFrame();
    buildWorld(Game.L);
    buildDynamic(Game.L);
    R.scene.add(World.group);
    if (LEVELS[lv].monster === 'chud' && !Chud.ready) { say('Something heavy is moving…'); await _waitFrame(); buildChud(R.scene); }
    if (LEVELS[lv].monster === 'pale' && !Pale.ready) { say('Something is standing very still…'); await _waitFrame(); buildPale(R.scene); }
    if (lv === 'l3' && !SURF.group) { say('Sealing the bunker…'); await _waitFrame(); buildSurfaceSet(); }
    say('Warming up…'); await _waitFrame();
    World.areas.forEach((a) => { a.group.visible = true; });
    try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* compiled lazily instead */ }
    setAreaVisibility(0);
  } finally { Game.loading = false; }
}
// the loading card between levels
async function showLevelLoading(lv) {
  const box = $('level-load');
  setText($('ll-title'), LEVELS[lv].title);
  setText(document.querySelector('#level-load .nc-kick'), lv === 'l3' ? 'Going up' : lv === 'l1' ? 'Back to the start' : 'Going down');
  setText($('ll-note'), '');
  box.hidden = false;
  try { await loadLevel(lv, (t) => setText($('ll-note'), t)); } catch (e) { console.error(e); }
  box.hidden = true;
}
function enterRound(g) {
  // a round on another level: build that level first, then come back here
  const lv = g.lv || 'l1';
  if (lv !== Game.levelKey) { if (!Game.loading) showLevelLoading(lv); return; }
  Game.round = g.rn; Game.seenEv = g.en; Game.areaSeen = new Set(); Game.actQueue = []; Game.actSeq = 0;
  const ids = netPeers().map((p) => p.id);
  const idx = Math.max(0, ids.indexOf(netMyId()));
  const sp = spawnPoint(g, idx);
  Game.me = newLocalPlayer(sp.x, sp.z, sp.yaw);
  closeNote(); hideDeath();
  resetEnding();
  Creature.inited = false; Creature.override = null; Game.scare = null; Game.corpses.clear(); Game.killLast = -1;
  for (const m of World.bloodPools || []) if (m.parent) m.parent.remove(m);
  World.bloodPools = [];
  if (R.camera.fov !== 72) { R.camera.fov = 72; R.camera.updateProjectionMatrix(); }
  if (g.ph === 'intro') { setMode('intro'); startIntro(); }
  else { Cinema.mode = null; setLetterbox(false); setMode('play'); }
}

async function startGame() {
  saveSettings();
  if (Game.loading) return;
  const lv = levelForMap(Settings.map);
  if (Game.levelKey !== lv) await showLevelLoading(lv);
  startNewRound();
  enterRound(Game.g);
}

async function goOnline(code, creator) {
  saveSettings();
  setMenuBusy(true);
  netNote(creator ? 'Opening a room…' : 'Joining ' + code + '…');
  try {
    await netJoin(code, creator);
  } catch (e) {
    setMenuBusy(false);
    renderLobbyUI();
    netNote(joinFailReason(e && e.code), true);
    return;
  }
  setMenuBusy(false);
  Game.g = null; Game.round = -1; Game.lostShown = false;
  Game.joinedAt = performance.now();
  renderLobbyUI();
  if (!IN_CLAUDE && Sound.hasMic) Net.micStream = Sound.hasMic ? Net.micStream : null;
}

// what to tell someone whose host or join didn't work, by what went wrong
function joinFailReason(code) {
  if (IN_CLAUDE) {
    if (code === 'noroom') return "Co-op can't connect in this view. Open the game from its claude.ai link while signed in (links shared publicly can't use co-op), or use the standalone version.";
    return "Couldn't connect. Everyone needs to be signed in to Claude, with the page shared to them directly (Share button). Or use the standalone version.";
  }
  const relay = Settings.net === 'relay';
  switch (code) {
    case 'missing': return 'No game with that code. Check it with your host - and that they are still in the room.';
    case 'taken': return 'That room code is busy. Try hosting again.';
    case 'server': return "Couldn't reach the game's matchmaking server. Wait a minute and try again, or try another network (a phone hotspot works).";
    case 'lib': return "Couldn't load the online part of the game. Check your internet connection - some school networks block it.";
    case 'browser': return "This browser can't do online play. Try a recent Chrome, Edge or Firefox.";
    case 'timeout': return relay ? "Couldn't reach the host, even through the relay. Check the code, and that the host is still in the room - or try a phone hotspot."
      : "Couldn't reach the host. Both of you set Settings > Connection to Relay, then try again (school and college Wi-Fi need this).";
    default: return "Couldn't connect. Check your internet connection and try again.";
  }
}

// what the menu says about co-op when nothing is going on
function readyNote() {
  if (!NetCaps.online) return IN_CLAUDE ? joinFailReason('noroom') : "Co-op isn't available here. Solo works.";
  return IN_CLAUDE ? 'Co-op is ready. Voice chat works in the standalone version.' : 'Co-op is ready. Host a room or join with a code.';
}

async function leaveOnline() {
  await netLeave();
  Game.g = null; Game.round = -1; Game.me = null;
  renderLobbyUI();
  netNote(readyNote(), !NetCaps.online);
}
// The game was going and the connection went: say so, and take everyone who's left back to the lobby.
async function connectionLost() {
  const why = Net.lostReason || 'Lost the connection.';
  showToast(why + ' Back to the lobby…', 'danger', 4000);
  await new Promise((r) => setTimeout(r, 3200));
  if (Game.mode === 'intro' || Game.mode === 'play' || Game.mode === 'end') await backToLobby();
  netNote(why + ' Host a new room, or join another.', true);
}

function netNote(text, warn) { const n = $('net-note'); n.textContent = text; n.classList.toggle('warn', !!warn); }
function setMenuBusy(busy) {
  $('btn-host').disabled = busy || !NetCaps.online;
  $('btn-join').disabled = busy || !NetCaps.online;
  $('btn-solo').disabled = busy;
}

let NetCaps = { online: false, voice: false };
function renderLobbyUI() {
  const online = Net.mode !== 'solo';
  $('menu-main').hidden = online;
  $('menu-room').hidden = !online;
  $('mic-row').hidden = !NetCaps.voice;
  // these only mean something in the standalone version: voice chat and the peer-to-peer connection
  $('whisper').closest('label').hidden = !NetCaps.voice;
  $('netmode').closest('.field').hidden = IN_CLAUDE;
  if (!online) return;
  setText($('room-code'), Net.code);
  const link = inviteLinkFor(Net.code);
  setText($('invite-link'), link || 'Code: ' + Net.code);
  setText($('btn-copy'), link ? 'Copy link' : 'Copy code');
  setText($('invite-note'), IN_CLAUDE ? 'Share this page with each friend first (Share button: invite them - a public link can\'t join co-op). They sign in to Claude, open it and type the code. Voice chat needs the standalone version.' : 'Send your friends the link, or have them open the game and type the code. On school or college Wi-Fi, everyone set Settings > Connection to Relay first.');
  const peers = netPeers(), host = netHostId();
  const ul = $('roster'); ul.textContent = '';
  for (const p of peers) {
    const li = document.createElement('li');
    const chip = document.createElement('span'); chip.className = 'chip'; chip.style.background = playerColor(p.s.c);
    const nm = document.createElement('span'); nm.textContent = String(p.s.n || 'Player').slice(0, 14);
    const tg = document.createElement('span'); tg.className = 'tg'; tg.textContent = [p.id === host ? 'Host' : '', p.me ? 'You' : '', p.s.mic ? 'Mic' : ''].filter(Boolean).join(' · ');
    li.append(chip, nm, tg); ul.appendChild(li);
  }
  const iHost = netIsHost();
  $('btn-start').hidden = !iHost;
  const hostP = peers.find((p) => p.id === host);
  setText($('room-map'), 'Map · ' + (MAP_NAMES[iHost ? Settings.map : hostP && hostP.s.mp] || MAP_NAMES.l1));
  let status;
  if (Net.lost) status = (Net.lostReason || 'Lost the connection.') + ' Leave, then host or join again.';
  else if (!Net.connected) status = 'Reconnecting…';
  else if (iHost) status = peers.length > 1 ? peers.length + ' in the room. Start when everyone is here.' : 'Waiting for friends. You can also start alone.';
  else if (!host && performance.now() - (Game.joinedAt || 0) > 5000) status = peers.length < 2 ? 'Nobody else is here yet. Check the code, or wait for the host.' : 'The host isn\'t in this room. Check the code with them.';
  else status = 'Waiting for the host to start.';
  setText($('room-status'), status);
}

// ---------- input ----------
const Look = { dragLook: false };
// Pointer lock needs a click; if a click-driven request fails, fall back to drag-to-look.
function lockPointer(fromClick) {
  if (Look.dragLook) { $('pause').hidden = true; Game.paused = false; return; }
  const c = $('view');
  const fail = () => { if (fromClick) { Look.dragLook = true; $('pause').hidden = true; Game.paused = false; showToast('Hold the mouse button and drag to look', '', 3000); } };
  try {
    const r = c.requestPointerLock ? c.requestPointerLock() : null;
    if (!c.requestPointerLock) fail();
    else if (r && typeof r.catch === 'function') r.catch(fail);
  } catch (e) { fail(); }
}
function wireInput() {
  const c = $('view');
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (Game.keypad && !e.repeat && keypadKey(e)) { e.preventDefault(); return; }
    if (Game.reading && (e.code === 'KeyE' || e.code === 'Escape')) { closeNote(); e.preventDefault(); return; }
    Input.keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === 'KeyE') { Input.ePressed = true; Input.eHeld = true; }
    if (e.code === 'KeyF') Input.fPressed = true;
    if (e.code === 'KeyC') Input.cPressed = true;
    if (e.code === 'KeyQ') Input.qPressed = true;
    if (e.code === 'KeyG') Input.gPressed = true;
    if (/^Digit[1-5]$/.test(e.code)) Input.slotPick = +e.code.slice(5) - 1;
    if (e.code === 'KeyM') { Settings.muted = !Settings.muted; Sound.setMicMuted(Settings.muted); showToast(Settings.muted ? 'Mic muted' : 'Mic on', '', 1200); }
    if ((e.code === 'Space' || e.code === 'Escape') && (Game.mode === 'coldopen' || Game.mode === 'intro' || (Game.mode === 'end' && Cinema.mode === 'ending'))) skipCinema();
    if (e.code === 'Escape' && Game.mode === 'play' && !document.pointerLockElement) togglePause(true);
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; if (e.code === 'KeyE') Input.eHeld = false; });
  window.addEventListener('blur', () => { Input.keys = {}; Input.eHeld = false; });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === c;
    if (locked) { $('pause').hidden = true; Game.paused = false; }
    else if (Game.mode === 'play' && !Look.dragLook && !Game.reading) togglePause(true);
  });
  c.addEventListener('mousedown', () => { Input.mouseDown = true; if (Game.mode === 'play' && !document.pointerLockElement) lockPointer(true); });
  window.addEventListener('mouseup', () => { Input.mouseDown = false; });
  window.addEventListener('mousemove', (e) => {
    const me = Game.me;
    if (Game.mode !== 'play' || !me || me.dead || Game.reading) return;
    if (!(document.pointerLockElement === c || (Look.dragLook && Input.mouseDown))) return;
    const s = 0.0021 * Settings.sens;
    me.yaw -= (e.movementX || 0) * s;
    me.pitch = clamp(me.pitch - (e.movementY || 0) * s, -1.4, 1.4);
    if (World.viewModel) { World.viewModel.lagX = clamp((World.viewModel.lagX || 0) + (e.movementX || 0) * 0.0004, -0.05, 0.05); World.viewModel.lagY = clamp((World.viewModel.lagY || 0) + (e.movementY || 0) * 0.0004, -0.05, 0.05); }
  });
  $('note').addEventListener('click', closeNote);
  // the wheel runs through the slots
  window.addEventListener('wheel', (e) => {
    if (Game.mode !== 'play' || !(document.pointerLockElement === c || Look.dragLook)) return;
    const now = performance.now();
    if (now - (Look.wheelT || 0) < 90) return;
    Look.wheelT = now;
    Input.slotPick = (Game.slot || 0) + (e.deltaY > 0 ? 1 : -1);
  }, { passive: true });
}
function togglePause(on) {
  if (Game.mode !== 'play') return;
  $('pause').hidden = !on;
  setText($('pause-note'), Net.mode === 'solo' ? 'The facility waits for you. For now.' : 'The game keeps running for your team.');
  setText($('btn-resume'), 'Resume');
  Game.paused = on && Net.mode === 'solo';
  if (!on) lockPointer(true);
}
function skipCinema() {
  if (Game.mode === 'end' && Cinema.mode === 'ending') { if (Cinema.t > 1) showEndScreen(); return; }
  if (Game.mode === 'coldopen') finishColdOpen();
  else if (Game.mode === 'intro' && netIsHost() && Game.g) Game.g.skip = true;
}

function wireMenus() {
  $('gate-go').addEventListener('click', boot2);
  $('gate').addEventListener('click', boot2);
  $('skip').addEventListener('click', skipCinema);
  $('btn-solo').addEventListener('click', () => { Net.mode = 'solo'; startGame(); });
  renderSwatches(); renderMaps(); wireKeypad();
  $('maps').addEventListener('click', (e) => {
    const b = e.target.closest('.map'); if (!b) return;
    if (b.classList.contains('locked')) { openAccessPad(b.dataset.map); return; }
    Settings.map = b.dataset.map; saveSettings(); renderMaps();
  });
  wireSegs('uisize', 'ui', applyUiSize, Number);
  wireSegs('gfx', 'gfx', () => applyGraphics());
  wireSegs('rdist', 'rdist', () => applyRenderDistance(), Number);
  wireSegs('netmode', 'net', null);
  $('btn-nettest').addEventListener('click', async () => {
    const b = $('btn-nettest'), o = $('nettest-out');
    if (b.disabled) return;
    b.disabled = true; o.hidden = false; o.classList.remove('warn');
    setText(o, 'Checking…');
    const r = await netSelfTest();
    b.disabled = false;
    const yes = (v) => (v ? 'OK' : 'blocked');
    const verdict = !r.server ? "The game's matchmaking server can't be reached from here. Try again in a minute, or another network (a phone hotspot)."
      : r.relay ? 'Online play should work here. If a friend still can\'t connect, both of you choose Relay.'
      : r.direct ? 'Direct connections work, but the relay is blocked: friends on strict networks (school, college) may not get through to you.'
      : 'This network blocks the connections online play needs. Try a phone hotspot.';
    setText(o, 'Matchmaking: ' + yes(r.server) + ' · Direct: ' + yes(r.direct) + ' · Relay: ' + yes(r.relay) + '. ' + verdict);
    o.classList.toggle('warn', !(r.server && (r.relay || r.direct)));
  });
  $('whisper').addEventListener('change', (e) => { Settings.whisper = e.target.checked; saveSettings(); });
  $('btn-host').addEventListener('click', () => goOnline(randomCode(5), true));
  const join = () => {
    const code = $('join-code').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) { netNote('Room codes are 5 letters or numbers.', true); return; }
    goOnline(code, false);
  };
  $('btn-join').addEventListener('click', join);
  $('join-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); });
  $('join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
  $('name-input').addEventListener('change', saveSettings);
  $('sens').addEventListener('input', (e) => { Settings.sens = +e.target.value; saveSettings(); });
  $('vol').addEventListener('input', (e) => { Settings.vol = +e.target.value; Sound.setMaster(Settings.vol); saveSettings(); });
  $('bright').addEventListener('input', (e) => { Settings.bright = +e.target.value; if (R) R.exposure = Settings.bright; saveSettings(); });
  $('btn-start').addEventListener('click', () => { if (netIsHost()) startGame(); });
  $('btn-leave').addEventListener('click', leaveOnline);
  $('btn-copy').addEventListener('click', () => {
    const link = inviteLinkFor(Net.code), text = link ? (IN_CLAUDE ? link + ' (room code ' + Net.code + ')' : link) : Net.code;
    const done = () => { setText($('btn-copy'), 'Copied'); setTimeout(renderLobbyUI, 1400); };
    try { navigator.clipboard.writeText(text).then(done, () => {}); } catch (e) { /* select it instead */ }
  });
  $('btn-mic').addEventListener('click', async () => {
    try {
      Net.micStream = await Sound.enableMic();
      setText($('btn-mic'), 'Voice chat on');
      $('btn-mic').disabled = true;
    } catch (e) { setText($('btn-mic'), 'Mic blocked. Allow it in the browser.'); }
  });
  $('btn-resume').addEventListener('click', () => { $('pause').hidden = true; Game.paused = false; lockPointer(true); });
  $('btn-quit').addEventListener('click', async () => { $('pause').hidden = true; await backToLobby(); });
  $('btn-again').addEventListener('click', () => {
    if (!(Net.mode === 'solo' || netIsHost())) return;
    // the campaign goes on to the next level, or back to the start
    if (Settings.map === 'camp') Game.campLv = Game.endNext || 'l1';
    startGame();
  });
  $('btn-menu').addEventListener('click', backToLobby);
}
async function backToLobby() {
  resetEnding();
  Game.campLv = 'l1'; Game.endNext = null;
  if (Net.mode !== 'solo') { await netLeave(); netNote(readyNote(), !NetCaps.online); }
  Game.g = null; Game.round = -1; Game.me = null;
  for (const [, m] of Game.mates) R.scene.remove(m.h.root);
  Game.mates.clear();
  updateCreature(0, 0, { mode: 'hidden' }, Game.L, R.camera.position);
  setChudVisible(false); setPaleVisible(false);
  if (Game.levelKey !== 'l1') await showLevelLoading('l1');
  enterLobbyScene();
}

// smooth, irregular, roughly -1..1: three sines at frequencies that never line up
function shakeN(t, s) { return Math.sin(t * 23.1 + s) * 0.5 + Math.sin(t * 37.7 + s * 2.3) * 0.3 + Math.sin(t * 61.3 + s * 4.1) * 0.2; }
// a hit from a direction: the view is knocked away from it and springs back
function joltFrom(x, z, strength) {
  const me = Game.me; if (!me) return;
  const j = R.jolt || (R.jolt = { x: 0, z: 0, p: 0, v: 0 });
  let dx = me.x - x, dz = me.z - z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  j.x = dx; j.z = dz; j.v += strength;
}

// ---------- the play camera ----------
function rayWallDistance(x, z, yaw, max) {
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
  for (let d = 0.2; d < max; d += 0.15) if (cellKind(Game.L, Math.floor(x + dx * d), Math.floor(z + dz * d)) !== 'open') return d;
  return max;
}
const _scFace = new THREE.Vector3(), _scJit = new THREE.Vector3(), _scLook = new THREE.Vector3(), _scGrip = new THREE.Vector3();
function updatePlayCamera(dt, t) {
  const me = Game.me, cam = R.camera, L = Game.L, g = Game.g;
  R.shake = Math.max(0, (R.shake || 0) - dt * 1.4);
  const sh = R.shake * R.shake * 0.09;
  const crd = g && g.cr.mode !== 'hidden' ? dist2(me.x, me.z, Creature.pos.x, Creature.pos.z) : 99;
  if (me.dead) {
    // Taken. Everything here is played from the shared kill record - the same thing, at the same moment, that
    // everyone else is watching happen to you.
    const sc = Game.scare, kl = g && g.kl;
    let T = kl && kl.id === netMyId() && Game.gt !== undefined ? Game.gt - kl.t : -1;
    if (T > -0.6 && T < 0) T = 0;          // this machine's copy of the clock can trail the host's by a frame or two
    if (sc) sc.t += dt;
    if (kl && kl.c && T >= 0 && T < beastKillLen(kl)) { beastKillCam(kl, T, dt, t); return crd; }
    if (kl && kl.c && sc && T >= beastKillLen(kl)) { Game.scare = null; R.camera.fov = 72; R.camera.updateProjectionMatrix(); Sound.voiceBoost(false); }
    if (sc && T >= 0 && T < KILL_TOTAL && Creature.visible) {
      const head = Creature.headPos;
      cam.position.copy(KS.head);
      let jit = 0.05;
      if (KS.phase === 0) {
        // ---- dragged ----
        // hauled along the floor feet first; you see the room you thought was safe sliding away behind you,
        // and only as it hauls you up do you see it
        const turn = smooth01((T - (KILL_DRAG - 0.45)) / 0.45);
        pathPoint(killPathOf(kl), 0, _scLook);
        _scLook.set(lerp(_scLook.x, head.x, turn), lerp(1.0, head.y - 0.15, turn), lerp(_scLook.z, head.z, turn));
        cam.position.y += Math.abs(Math.sin(T * 17)) * 0.07;
        cam.lookAt(_scLook);
        cam.rotateZ(Math.sin(T * 9) * 0.1 + KS.roll);
        cam.fov = 78; jit = 0.055;
        if (Math.floor(T * 5) !== Math.floor((T - dt) * 5)) { Sound.play('bump', { x: cam.position.x, y: 0.3, z: cam.position.z }); R.shake = Math.max(R.shake, 0.5); }
      } else {
        // ---- swept up, thrown, slammed ----
        cam.lookAt(head.x, head.y - 0.12, head.z);
        cam.rotateZ(KS.roll);
        cam.fov = lerp(78, 58, clamp((T - KILL_DRAG) / 1.8, 0, 1));
        jit = 0.04 + R.shake * 0.05;
      }
      cam.position.add(_scJit.set((Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit));
      cam.updateProjectionMatrix();
      R.fear = 1;
      const fadeAt = KILL_TOTAL - 0.6;
      if (T > fadeAt) R.fade = Math.min(1, (T - fadeAt) / 0.5);
      setFlash(T < 0.35 ? 1 : (Math.random() < 0.5 ? 0.7 : 0.05));
      R.flashThrow = 1.2; R.bounce.intensity = 0;
      if (World.viewModel) World.viewModel.group.visible = false;
      return crd;
    }
    if (sc && (T >= KILL_TOTAL || sc.t > 1.2)) { Game.scare = null; cam.fov = 72; cam.updateProjectionMatrix(); Sound.voiceBoost(false); }
    const s = spectateTarget();
    if (s) { cam.position.set(s.m.x, 1.7, s.m.z); cam.rotation.set(s.m.pitch, s.m.yaw, 0); Game.watching = Game.names[s.id]; }
    else { cam.position.set(me.x, 2.4, me.z); cam.rotation.set(-1.25, me.yaw, 0); }
    setFlash(0); R.bounce.intensity = 0;
    if (World.viewModel) World.viewModel.group.visible = false;
    return crd;
  }
  const wet = cellFlag(L, L.water, me.x, me.z) ? -0.22 : 0;
  const mv = clamp(me.speed / 1.6, 0, 1), spr = me.sprinting ? 1 : 0;
  me.sprintK = damp(me.sprintK || 0, spr, 4, dt);
  const sk = me.sprintK, ck = me.crouch;
  // head motion from the stride: lowest as each heel lands, swaying over the standing leg, a slight roll
  const ampY = lerp(lerp(0.032, 0.058, sk), 0.016, ck) * mv, ampX = lerp(lerp(0.018, 0.03, sk), 0.01, ck) * mv;
  const bobY = ampY * (Math.cos(2 * me.bob) - 1) * 0.5, bobX = Math.sin(me.bob) * ampX;
  // each footfall kicks a small spring: the camera dips and recovers
  if (!Number.isFinite(me.kick)) me.kick = 0;
  if (!Number.isFinite(me.kickV)) me.kickV = 0;
  me.kickV += (-me.kick * 140 - me.kickV * 15) * Math.min(dt, 0.05);
  me.kick += me.kickV * Math.min(dt, 0.05);
  // idle: you breathe
  const idle = 1 - mv, br = Math.sin(t * 1.35);
  const eye = lerp(EYE_H, CROUCH_EYE, ck) + wet + bobY + me.kick * 0.12 + br * 0.006 * idle + (me.fy || 0);
  const rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
  // Shake, done properly: smooth noise rather than a fresh random number every frame (which reads as the
  // screen buzzing), in position, pitch and roll, scaled by the square of how hard it was hit - so a knock
  // barely registers and a slam throws the whole view. Plus the jolt: the view snaps away from whatever just
  // hit, and springs back.
  const jo = R.jolt || (R.jolt = { x: 0, z: 0, p: 0, v: 0 });
  jo.v += (-jo.p * 210 - jo.v * 17) * Math.min(dt, 0.05); jo.p += jo.v * Math.min(dt, 0.05);
  // two channels: the slow rumble (R.shake) and the hit itself (R.hit) - violent for an instant, gone in
  // half a second, faster and sharper - so a room being pounded reads as blows, not as a constant wobble
  R.hit = Math.max(0, (R.hit || 0) - dt * 3.4);
  const hs = R.hit * R.hit * 0.075, ht = t * 1.7;
  const sx = shakeN(t, 1.3) * sh * 0.55 + shakeN(ht, 2.2) * hs * 0.55, sy = shakeN(t, 7.1) * sh * 0.45 + shakeN(ht, 8.3) * hs * 0.4;
  const sz = shakeN(t, 3.9) * sh * 0.55 + shakeN(ht, 4.7) * hs * 0.55;
  cam.position.set(me.x + rx * bobX + sx + jo.x * jo.p, eye + sy - Math.abs(jo.p) * 0.4, me.z + rz * bobX + sz + jo.z * jo.p);
  cam.rotation.set(me.pitch + me.kick * 0.05 + br * 0.003 * idle + shakeN(t, 5.2) * sh * 0.22 + shakeN(ht, 6.1) * hs * 0.2 - jo.p * 0.5, me.yaw,
    -Math.sin(me.bob) * lerp(0.005, 0.011, sk) * mv + shakeN(t, 9.4) * sh * 0.32 + shakeN(ht, 1.9) * hs * 0.3);
  const fov = 72 + sk * 4 * mv;
  if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = damp(cam.fov, fov, 5, dt); cam.updateProjectionMatrix(); }
  // the flashlight stutters when the creature is close, and gutters hard every time the room is hit
  R.flicker = Math.max(0, (R.flicker || 0) - dt * 1.8);
  const stutter = (crd < 7 && Math.random() < 0.07 ? 0.25 : 1) * (R.flicker > 0 && Math.random() < 0.18 + R.flicker * 0.5 ? 0.08 + Math.random() * 0.3 : 1);
  setFlash(me.fl ? stutter : 0);
  if (me.fl) {
    const d = rayWallDistance(me.x, me.z, me.yaw, 14);
    R.flashThrow = d;
    R.bounce.position.set(0, 0, -Math.max(0.4, d * 0.75));
    R.bounce.intensity = LUX.bounce * clamp(1 - d / 9, 0, 1) * stutter;
  } else R.bounce.intensity = 0;
  const vm = World.viewModel;
  if (vm) {
    vm.group.visible = true;
    vm.lagX = damp(vm.lagX || 0, 0, 8, dt); vm.lagY = damp(vm.lagY || 0, 0, 8, dt);
    // the light swings in a loose figure-eight with your steps, drops and pumps when you run, and settles when you stop
    const fx = Math.sin(me.bob) * lerp(0.012, 0.024, sk) * mv, fy = (Math.cos(2 * me.bob) - 1) * 0.5 * lerp(0.01, 0.02, sk) * mv;
    vm.group.position.set(0.2 - vm.lagX + fx, -0.24 + vm.lagY + fy - ck * 0.02 - sk * 0.035 * mv + me.kick * 0.06 + br * 0.003 * idle, -0.36 + sk * 0.03 * Math.sin(me.bob) * mv);
    vm.group.rotation.set(vm.lagY * 2 - sk * 0.12 * mv + me.kick * 0.25, -vm.lagX * 2 + fx * 2, -fx * 3);
    // the beam follows the hand, not the eye: it lags turns and rides the steps
    R.flashTarget.position.set(0.03 - vm.lagX * 9 + fx * 6, -0.05 + vm.lagY * 9 + fy * 6 - sk * 0.12 * mv, -3);
    vm.lensMat.emissiveIntensity = me.fl ? 6 * stutter : 0;
    // the other hand: whatever is in the slot you have picked. Changing slots, it drops out of view and comes
    // back up with the new thing in it.
    const held = heldItem(), ht = held ? itemType(held) : '';
    Game.swapT = Math.max(0, (Game.swapT || 0) - dt);
    if (ht !== vm.held && Game.swapT < 0.16) { vm.held = ht; for (const k in vm.items) vm.items[k].visible = k === ht; }
    if (ht === 'keycard' && vm.cardArea !== +held.slice(3)) {
      vm.cardArea = +held.slice(3);
      const it = vm.items.keycard, old = it.userData.card, par = old.parent, card = keycardModel(vm.cardArea);
      card.position.copy(old.position); card.rotation.copy(old.rotation); par.remove(old); par.add(card); it.userData.card = card;
      card.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    }
    const dip = Game.swapT > 0 ? Math.sin(Game.swapT / 0.32 * Math.PI) : 0;
    const pry = me.holding && me.holding.startsWith('lock:') ? Math.sin(t * 9) * 0.5 + 0.5 : 0;
    vm.left.position.set(-0.42 + fx * 0.4, -0.02 - dip * 0.28 + fy * 0.8 - pry * 0.03, -0.02 + pry * 0.04);
    vm.left.rotation.set(dip * 0.5 - pry * 0.35, 0, pry * 0.1);
    const sc = playerColor(Settings.color);
    if (vm.sleeveC !== sc) { vm.sleeveC = sc; vm.sleeve.color.set(sc).multiplyScalar(0.62); }
  }
  return crd;
}

// ---------- the loop ----------
let lastT = performance.now();
function tickFrame(now) {
  requestAnimationFrame(tickFrame);
  const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
  lastT = now;
  const t = now / 1000;
  if (!Game.L || !R.renderer || Game.loading) return;
  // the shared game
  if (Net.mode !== 'solo' && !netIsHost()) {
    const hg = netHostState();
    if (hg && Array.isArray(hg.lk) && hg.cr && typeof hg.rn === 'number') Game.g = hg;
  }
  // the host went, or the connection did: the game can't go on without it
  if (Net.mode !== 'solo' && Net.lost && !Game.lostShown && (Game.mode === 'intro' || Game.mode === 'play' || Game.mode === 'end')) { Game.lostShown = true; connectionLost(); }
  // nothing to play without a game (it can be cleared while leaving)
  if (!Game.g && (Game.mode === 'intro' || Game.mode === 'play')) { if (!Game.leaving) { Game.leaving = true; backToLobby().finally(() => { Game.leaving = false; }); } return; }
  const g = Game.g;
  if (g && g.rn !== Game.round && (Game.mode === 'lobby' || Game.mode === 'end' || Game.mode === 'play' || Game.mode === 'intro')) enterRound(g);
  if (Game.g && netIsHost() && !Game.paused && (Game.mode === 'intro' || Game.mode === 'play' || Game.mode === 'end')) hostTick(dt);
  // the host's clock, as best this machine can tell: runs smoothly between snapshots and is pulled gently
  // toward each new one, so anything planned against it (the hand, the kill) plays back without jumps
  if (Game.g) {
    if (netIsHost() || Game.gt === undefined || Math.abs(Game.gt - Game.g.t) > 0.6) Game.gt = Game.g.t;
    else { Game.gt += dt; Game.gt += (Game.g.t - Game.gt) * Math.min(1, dt * 2.5); }
  }
  let ca = 0, crd = 99;
  switch (Game.mode) {
    case 'coldopen': updateColdOpen(dt, t); ca = 7; break;
    case 'lobby': updateLobbyScene(dt, t); ca = 0; if ((Game.lobbyT = (Game.lobbyT || 0) - dt) <= 0) { Game.lobbyT = 0.4; renderLobbyUI(); } break;
    case 'intro': updateIntro(dt, t); processGameEvents(); ca = 0; break;
    case 'play': {
      if (!Game.paused) updateLocalPlayer(dt, t);
      R.fade = damp(R.fade, 0, 2.5, dt);
      // what is waiting at the bottom gets built a little at a time while the team is on the last floors
      if (!Chud.ready && Game.g.lv === 'l1' && Game.g.ca >= 8) chudBuildStep(3, R.scene);
      if (!Colossus.ready && Game.g.lv === 'l3' && Game.g.ca >= 3) colossusBuildStep(3, R.scene);
      processGameEvents();
      tickKeypad();
      // the level's monster is posed before anyone it is holding, and before the camera of whoever that is
      if (levelHasBeast(Game.g.lv)) { updateCreature(dt, t, { mode: 'hidden' }, Game.L, R.camera.position); updateBeastClient(dt, t); updateBeastKill(dt); }
      else { updateKill(dt); updateLairs(dt); }
      if (Game.g.lv === 'l3') updateBreachWorld(dt, t);
      updateMates(dt, t);
      crd = updatePlayCamera(dt, t);
      if (!levelHasBeast(Game.g.lv)) updateCreature(dt, t, Game.g.cr, Game.L, R.camera.position);
      updateHud(dt);
      ca = Math.max(0, areaAt(Game.L, R.camera.position.x, R.camera.position.z));
      break;
    }
    case 'end': if (Cinema.mode === 'ending') updateEnding(dt, t); else { R.fade = damp(R.fade, 1, 1, dt); } ca = Cinema.mode === 'ending' ? Cinema.ca : 9; break;
    case 'debug': ca = Game.debugArea || 0; if (Game.debugTick) Game.debugTick(dt, t); updateLightPool(dt, R.camera, ca); break;
  }
  // the lobby's off-centre framing is only for the lobby
  if (Game.mode !== 'lobby' && R.camera.view && R.camera.view.enabled) R.camera.clearViewOffset();
  if (Game.me && Game.g && (Game.mode === 'intro' || Game.mode === 'play' || Game.mode === 'end')) {
    const st = myStateObject();
    if (Net.mode === 'solo') Net.myState = st; else netPublish(st);
  } else if (Net.mode !== 'solo') netPublish({ v: 1, n: Settings.name, c: Settings.color, cr: Net.creator ? 1 : 0, mic: Sound.hasMic ? 1 : 0, mp: Settings.map });
  netUpdateVoice();
  if (Game.mode !== 'play') updateLairs(0);
  updateWorld(dt, t, Game.g, ca);
  // sound of the creature and the chase
  const cr = Game.g && Game.mode === 'play' ? Game.g.cr : null;
  const crVisible = !!cr && cr.mode !== 'hidden';
  Sound.updateCreature(dt, { x: Creature.pos.x, y: 1.8, z: Creature.pos.z }, cr ? cr.mode : 'hidden', crVisible);
  for (const ev of Creature.events) {
    if (!crVisible) continue;
    const d = dist2(ev.x, ev.z, R.camera.position.x, R.camera.position.z);
    if (d < 45) Sound.creatureStep(ev.kind, ev);
    // you feel it walk
    if (ev.kind === 'foot' && d < 14) R.shake = Math.max(R.shake || 0, (1 - d / 14) * 0.42);
    else if (d < 8) R.shake = Math.max(R.shake || 0, (1 - d / 8) * 0.2);
  }
  Creature.events.length = 0;
  // on B5 the threat is the Chud: how near, and whether it is coming
  const beast = Game.mode === 'play' && Game.g && levelHasBeast(Game.g.lv), threat = beast ? beastThreat() : 0;
  Sound.updateMusic(dt, (crVisible && cr.mode === 'run' && crd < 30) || (beast && Game.g.ch && Game.g.ch.m === 'hunt' && threat > 0.15) ? 1 : 0);
  // your heart: faster the closer it is - and pounding, over everything, while it is listening for you
  if (Game.holdBreath > 0) Game.holdBreath -= dt;
  if (Game.mode === 'play' && Game.me && !Game.me.dead && (Game.holdBreath > 0 || (crVisible && crd < 11) || threat > 0.2)) {
    Game.heartT = (Game.heartT || 0) - dt;
    if (Game.heartT <= 0) {
      if (Game.holdBreath > 0) { Game.heartT = 0.38; Sound.heartHard(); }
      else { Game.heartT = threat > 0 ? lerp(1.1, 0.4, threat) : lerp(0.42, 1.1, crd / 11); Sound.play('heart'); }
    }
  }
  Sound.updateListener(R.camera);
  // fear on screen
  R.fearKick = Math.max(0, (R.fearKick || 0) - dt * 0.6);
  if (Game.mode === 'play') R.fear = damp(R.fear, Math.max(crVisible ? clamp(1 - crd / 14, 0, 1) * (cr.mode === 'run' ? 1 : 0.55) : 0, threat * 0.85, R.fearKick), 3, dt);
  R.whiteFlash = Game.mode === 'end' ? R.whiteFlash : Math.max(0, R.whiteFlash - dt * 1.5);
  setAreaVisibility(ca, R.camera.position);
  if (Game.mode === 'end' && Cinema.surface) { /* the surface sets its own sky and light */ }
  else if (Game.mode === 'end' && Cinema.teaser) { R.hemi.intensity = 0.02; R.scene.fog.density = 0.035; } else updateAtmosphere(dt, ca);
  if (Game.mode === 'play') updateLightPool(dt, R.camera, ca);
  adaptResolution(dt);
  renderFrame(t, dt);
}

// ---------- boot ----------
let booted = false;
function boot1() {
  loadSettings();
  wireMenus();
  wireInput();
  setText($('loading'), '');
}
async function boot2() {
  if (booted) return;
  booted = true;
  Sound.init(); Sound.setMaster(Settings.vol); Sound.setTheme('title');
  $('gate-go').disabled = true; $('gate-go').hidden = true; $('gate-load').hidden = false;
  const bar = $('gate-bar'), prog = (f) => { bar.style.width = (clamp(f, 0, 1) * 100).toFixed(1) + '%'; };
  const say = (s, f) => { setText($('loading'), s); if (f !== undefined) prog(f); };
  const wait = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  try {
    say('Waking the generators…', 0.04); await wait();
    initRenderer($('view'));
    R.exposure = Settings.bright;
    applyGraphics(); applyRenderDistance();
    const names = Object.keys(GTEX_RECIPES);
    for (let i = 0; i < names.length; i++) { say('Pouring concrete · ' + (i + 1) + '/' + names.length, 0.06 + 0.5 * i / names.length); await wait(); getTexSet(names[i]); }
    say('Drawing ten floors of plans…', 0.58); await wait();
    Game.levelKey = 'l1';
    Game.L = assembleLevel(buildAllMaps('l1'));
    patchLiftCells(Game.L);
    buildLevelField(Game.L);
    say('Building the facility…', 0.66); await wait();
    buildWorld(Game.L);
    buildDynamic(Game.L);
    R.scene.add(World.group);
    say('Something is waking up…', 0.8); await wait();
    buildCreature(R.scene);
    World.viewModel = buildViewModel();
    drawScareFace();
    say('Warming up the lights…', 0.9); await wait();
    World.areas.forEach((a) => { a.group.visible = true; });
    setCreatureVisible(true);
    try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* compiled lazily instead */ }
    setCreatureVisible(false);
    setAreaVisibility(7);
  } catch (e) {
    say("This browser couldn't start the 3D renderer. Try a recent Chrome, Edge or Firefox.");
    console.error(e);
    return;
  }
  NetCaps = await initNet();
  // A hidden tab gets no animation frames, so the loop that sends your state stops. Keep a slow heartbeat going
  // meanwhile, so your team doesn't take you for gone while you're looking at another tab.
  setInterval(() => { if (document.hidden && Net.mode !== 'solo') netPublish(Net.myState, true); }, 1000);
  netNote(readyNote(), !NetCaps.online);
  setMenuBusy(false);
  const m = /^#([A-Za-z0-9]{5})$/.exec(location.hash || '');
  if (m) { $('join-code').value = m[1].toUpperCase(); netNote('You were invited to room ' + m[1].toUpperCase() + '. Press Join.'); }
  prog(1); await wait();
  $('gate').hidden = true;
  Game.mode = 'coldopen';
  startColdOpen();
  $('skip').hidden = false;
  requestAnimationFrame(tickFrame);
}

function drawScareFace() {
  const c = $('scare-canvas'), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 300, 300);
  const grd = g.createRadialGradient(150, 130, 10, 150, 150, 150);
  grd.addColorStop(0, '#d8d2c2'); grd.addColorStop(0.6, '#8f8a7c'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.beginPath(); g.ellipse(150, 140, 95, 140, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#050403';
  g.beginPath(); g.ellipse(112, 108, 22, 30, -0.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(190, 112, 20, 27, 0.25, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(150, 205, 62, 46, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d9d0b6';
  for (let i = 0; i < 13; i++) { const x = 98 + i * 8.5; g.beginPath(); g.moveTo(x, 168); g.lineTo(x + 4, 196 + (i % 3) * 6); g.lineTo(x + 8, 168); g.fill(); g.beginPath(); g.moveTo(x + 2, 244); g.lineTo(x + 6, 216 - (i % 2) * 8); g.lineTo(x + 10, 244); g.fill(); }
  g.strokeStyle = 'rgba(70,40,60,0.6)'; g.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(150 + (i - 4) * 18, 30 + i * 3); g.bezierCurveTo(140 + i * 6, 80, 160 - i * 5, 120, 150 + (i - 4) * 10, 160); g.stroke(); }
}

boot1();
