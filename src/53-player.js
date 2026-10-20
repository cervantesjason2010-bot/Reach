// ================= the local player, teammates, interactions and events =================
const Input = { keys: {}, mouseDown: false, ePressed: false, eHeld: false, fPressed: false, cPressed: false, qPressed: false, gPressed: false, slotPick: undefined };
const ITEM_NAMES = { crowbar: 'crowbar', keycard: 'keycard', fuse: 'fuse', cell: 'power cell', thing: 'thing' };

function newLocalPlayer(x, z, yaw) {
  return { x, z, yaw, pitch: -0.05, dead: false, crouch: 0, crouching: false, stamina: STAMINA_MAX, sprinting: false, fl: true,
    stepT: 0, bob: 0, speed: 0, noise: 0, vl: 0, target: null, holding: '', shake: 0, lastArea: -1, vx: 0, vz: 0, kick: 0, kickV: 0, lastHalf: 0 };
}

function spawnPoint(g, idx) {
  const L = Game.L;
  if (g && g.cp > 0) {
    const s = L.safes[g.cp - 1];
    const c = s.cells[(idx * 7) % s.cells.length];
    const deep = s.cells.reduce((b, cc) => (dist2(cc.x, cc.z, s.door.x, s.door.z) > dist2(b.x, b.z, s.door.x, s.door.z) ? cc : b), c);
    const pick = idx === 0 ? deep : c;
    return { x: pick.x + 0.5, z: pick.z + 0.5, yaw: Math.atan2(s.door.x - pick.x, s.door.z - pick.z) };
  }
  const sp = L.spawns[idx % L.spawns.length];
  return { x: sp.x, z: sp.z, yaw: -Math.PI / 2 };
}

function myInventory(g) {
  const id = netMyId(), inv = { crowbar: 0, keycard: [], fuse: 0, cell: 0, count: 0 };
  if (!g) return inv;
  for (const k in g.it) {
    if (g.it[k].o !== id) continue;
    inv.count++;
    if (k === 'crowbar') inv.crowbar = 1;
    else if (k.startsWith('key')) inv.keycard.push(+k.slice(3));
    else if (k.startsWith('fuse')) inv.fuse += 1;
    else if (k.startsWith('cell')) inv.cell = 1;
  }
  return inv;
}
function itemType(id) { return !id ? '' : id === 'crowbar' ? 'crowbar' : id.startsWith('key') ? 'keycard' : id.startsWith('fuse') ? 'fuse' : id.startsWith('cell') ? 'cell' : 'thing'; }

// ---------- the five slots ----------
// What you carry sits in five slots, in the order you picked it up. 1-5 (or the wheel) puts one in your
// hand; whatever you use is brought out by itself; Q puts the one in your hand down at your feet.
function syncSlots(g) {
  const S = Game.slots || (Game.slots = [null, null, null, null, null]);
  if (Game.slot === undefined) Game.slot = 0;
  const id = netMyId(), owned = [];
  if (g) for (const k in g.it) if (g.it[k].o === id) owned.push(k);
  for (let i = 0; i < INV_SLOTS; i++) if (S[i] && !owned.includes(S[i])) S[i] = null;
  for (const k of owned) {
    if (S.includes(k)) continue;
    const e = S.indexOf(null);
    if (e < 0) continue;
    S[e] = k;
    // anything you have just picked up comes straight to hand
    if (Game.slotsReady) selectSlot(e);
  }
  Game.slotsReady = true;
  return S;
}
function selectSlot(i) {
  i = ((i % INV_SLOTS) + INV_SLOTS) % INV_SLOTS;
  if (Game.slot === i) return;
  Game.slot = i;
  Game.swapT = 0.32;
  const it = Game.slots && Game.slots[i];
  if (it) Sound.play('click');
}
function selectItemOfType(type, pred) {
  const S = Game.slots || [];
  for (let i = 0; i < S.length; i++) if (S[i] && itemType(S[i]) === type && (!pred || pred(S[i]))) { selectSlot(i); return true; }
  return false;
}
function heldItem() { return Game.slots ? Game.slots[Game.slot || 0] : null; }
function dropHeld() {
  const id = heldItem();
  if (!id || !Game.me || Game.me.dead) return;
  queueAction('drop', id);
}
function whistle() {
  const me = Game.me;
  if (!me || me.dead || Game.mode !== 'play') return;
  const t = performance.now();
  if (t - (Game.lastWhistle || 0) < 1600) return;
  Game.lastWhistle = t;
  Sound.play('whistle', null);
  queueAction('whistle', 0);
}

function queueAction(kind, id) {
  Game.actSeq += 1;
  Game.actQueue.push([Game.actSeq, kind, id]);
}

function myStateObject() {
  const me = Game.me, g = Game.g;
  const s = { v: 1, n: Settings.name, c: Settings.color, cr: Net.creator || Net.mode === 'solo' ? 1 : 0, mic: Sound.hasMic ? 1 : 0, rn: g ? g.rn : 0 };
  if (me && g) {
    Object.assign(s, { x: r2(me.x), z: r2(me.z), y: r2(me.yaw), p: r2(me.pitch), run: me.sprinting ? 1 : 0, cro: me.crouching ? 1 : 0,
      fl: me.fl ? 1 : 0, vl: r2(me.vl), mv: r2(me.speed), h: me.holding, d: me.dead ? 1 : 0, a: Game.actQueue[0] || null });
  }
  if (netIsHost() && Game.g) s.g = Game.g;
  return s;
}

function surfaceAt(x, z) {
  const L = Game.L;
  if (cellFlag(L, L.water, x, z)) return 'water';
  const a = areaAt(L, x, z);
  const th = a >= 0 ? World.areas[a].meta.theme : 'dock';
  const gx = Math.floor(x), gz = Math.floor(z);
  if (inGrid(L, gx, gz) && (L.ch[gz * L.W + gx] === 'z' || L.ch[gz * L.W + gx] === '^')) return 'grate';
  if (th === 'server' || th === 'contain' || th === 'generator') return 'grate';
  if (th === 'office' && !isCorridorCell(L, gx, gz)) return 'carpet';
  return 'concrete';
}

function updateLocalPlayer(dt, t) {
  const me = Game.me, g = Game.g, L = Game.L;
  if (!me || !g) return;
  const myId = netMyId();
  if (!me.dead && g.k[myId]) { me.dead = true; me.holding = ''; onLocalDeath(); }
  // drop acknowledged actions
  while (Game.actQueue.length && (g.ack[myId] || 0) >= Game.actQueue[0][0]) Game.actQueue.shift();
  if (Game.mode !== 'play' || g.ph !== 'play' || me.dead) { me.speed = 0; me.vx = 0; me.vz = 0; me.holding = ''; return; }
  const k = Input.keys;
  const open = openLocksOf(g);
  // crouch: toggle with C, hold with Ctrl; forced in crawlspaces
  if (Input.cPressed) { me.crouching = !me.crouching; Input.cPressed = false; }
  const low = cellFlag(L, L.low, me.x, me.z) || cellFlag(L, L.low, me.x + Math.sin(me.yaw) * 0.4, me.z + Math.cos(me.yaw) * 0.4);
  const crouch = me.crouching || k.ControlLeft || k.ControlRight || low;
  me.crouch = damp(me.crouch, crouch ? 1 : 0, 10, dt);
  // movement
  // at a keypad you stand still and type
  const typing = !!Game.keypad;
  let fwd = typing ? 0 : ((k.KeyW || k.ArrowUp) ? 1 : 0) - ((k.KeyS || k.ArrowDown) ? 1 : 0);
  let str = typing ? 0 : ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
  const moving = fwd || str;
  // carrying the power cell: both arms full of it - slow, and no running
  const laden = myInventory(g).cell;
  const wantSprint = (k.ShiftLeft || k.ShiftRight) && moving && !crouch && fwd >= 0 && !laden;
  if (wantSprint && me.stamina > 0.05) { me.sprinting = true; me.stamina = Math.max(0, me.stamina - dt); }
  else { me.sprinting = false; me.stamina = Math.min(STAMINA_MAX, me.stamina + dt * (moving ? 0.6 : 1.1)); }
  const wet = cellFlag(L, L.water, me.x, me.z);
  let sp = crouch ? CROUCH_SPEED : me.sprinting ? SPRINT_SPEED : WALK_SPEED;
  if (wet) sp *= 0.78;
  if (laden) sp *= 0.68;
  const px = me.x, pz = me.z;
  // a body has weight: you get up to speed in a few steps and take a moment to stop
  let wx = 0, wz = 0;
  if (moving) {
    const len = Math.hypot(fwd, str); fwd /= len; str /= len;
    const s = Math.sin(me.yaw), c = Math.cos(me.yaw);
    // camera faces -z at yaw 0: forward (-sin, -cos), right (cos, -sin)
    wx = (-s * fwd + c * str) * sp; wz = (-c * fwd - s * str) * sp;
  }
  const acc = moving ? (me.sprinting ? 7 : 10) : 13;
  me.vx = damp(me.vx || 0, wx, acc, dt); me.vz = damp(me.vz || 0, wz, acc, dt);
  if (Math.hypot(me.vx, me.vz) > 0.01) moveWithCollision(L, me, me.vx * dt, me.vz * dt, PLAYER_R, false, open);
  me.speed = Math.hypot(me.x - px, me.z - pz) / Math.max(dt, 1e-4);
  // up a stair, the floor comes up with you
  me.fy = damp(me.fy || 0, floorY(L, me.x, me.z), 16, dt);
  if (dt > 0) { me.vx = (me.x - px) / dt; me.vz = (me.z - pz) / dt; }
  // the stride clock runs on distance; a footstep lands every half stride, in time with the head dipping
  const stride = me.sprinting ? 2.5 : crouch ? 1.0 : 1.5;
  me.bob += me.speed * dt / stride * Math.PI * 2;
  const half = Math.floor((me.bob + Math.PI / 2) / Math.PI);
  if (half !== me.lastHalf) {
    me.lastHalf = half;
    if (me.speed > 0.3) {
      Sound.step(surfaceAt(me.x, me.z), me.sprinting, null, crouch ? 0.35 : 1);
      me.kickV = (me.kickV || 0) - (me.sprinting ? 0.42 : crouch ? 0.12 : 0.24);
    }
  }
  // flashlight
  if (Input.fPressed) { me.fl = !me.fl; Input.fPressed = false; Sound.play('click'); }
  // voice: with the whisper-safe mic on, only a voiced sound counts - talking, shouting - never a whisper
  const lvl = Sound.hasMic ? Sound.micLevel() : 0;
  me.voiced = lvl > 0 && Settings.whisper ? Sound.micVoiced() : 1;
  me.whisper = lvl > 0.05 && me.voiced < 0.5;
  me.vl = lvl * (Settings.whisper ? me.voiced : 1);
  // noise you are making, for the meter
  let noise = me.speed > 0.3 ? (me.sprinting ? 10 : crouch ? 0.6 : 2.6) : 0;
  if (wet && me.speed > 0.3) noise *= crouch ? 2.5 : 1.7;
  me.noise = Math.max(noise, me.vl * 16, me.holding ? 10 : 0);
  // interactions
  syncSlots(g);
  if (Input.slotPick !== undefined) { selectSlot(Input.slotPick); Input.slotPick = undefined; }
  if (Input.qPressed) { Input.qPressed = false; dropHeld(); }
  if (Input.gPressed) { Input.gPressed = false; whistle(); }
  me.target = findInteractable(g);
  me.holding = '';
  if (me.target && me.target.hold && Input.eHeld && me.target.ok) {
    me.holding = me.target.hold;
    // the crowbar comes out to do the prying
    if (me.holding.startsWith('lock:')) selectItemOfType('crowbar');
  }
  if (Input.ePressed) {
    Input.ePressed = false;
    const tg = me.target;
    if (tg && tg.ok && tg.action) {
      if (tg.action === 'note') openNote(tg.note);
      else if (tg.action === 'keypad') openKeypad(tg.id);
      else {
        if (tg.action === 'fuse') selectItemOfType('fuse');
        if (tg.action === 'cell') selectItemOfType('cell');
        if (tg.action === 'card') { const lock = L.locks[tg.id]; selectItemOfType('keycard', (k) => k === 'key' + lock.area); }
        queueAction(tg.action, tg.id); if (tg.action === 'pick') Sound.play('pickup');
      }
    } else if (tg && !tg.ok && tg.why) showToast(tg.why, '', 2200);
  }
  // entering an area for the first time
  const a = areaAt(L, me.x, me.z);
  if (a >= 0 && a !== me.lastArea) {
    me.lastArea = a;
    if (!Game.areaSeen.has(a)) { Game.areaSeen.add(a); showAreaCard(a); Sound.setTheme(World.areas[a].meta.theme); }
    else Sound.setTheme(World.areas[a].meta.theme);
  }
}

function findInteractable(g) {
  const me = Game.me, L = Game.L, inv = myInventory(g);
  const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw);
  let best = null, bestScore = Infinity;
  const consider = (x, z, range, make) => {
    const dx = x - me.x, dz = z - me.z, d = Math.hypot(dx, dz);
    if (d > range) return;
    const dot = d < 0.01 ? 1 : (dx * fx + dz * fz) / d;
    if (dot < 0.25 && d > 0.9) return;
    const score = d * (1.6 - dot);
    if (score < bestScore) { const r = make(); if (r) { best = r; bestScore = score; } }
  };
  for (const it of L.items) {
    const st = g.it[it.id];
    if (!st || !st.p) continue;
    consider(st.p[0], st.p[1], 1.9, () => inv.count >= INV_SLOTS
      ? { ok: false, label: 'Hands full (' + INV_SLOTS + '/' + INV_SLOTS + ')', why: 'You can carry five things. Drop one with Q.' }
      : { action: 'pick', id: it.id, ok: true, label: 'Pick up the ' + ITEM_NAMES[it.type] });
  }
  for (const n of L.notes) consider(n.x, n.z, 1.7, () => ({ action: 'note', note: n, ok: true, label: 'Read the note' }));
  L.locks.forEach((lock, i) => {
    if (g.lk[i].o) return;
    consider(lock.x, lock.z, 2.3, () => {
      if (lock.type === 'B') return inv.crowbar ? { hold: 'lock:' + i, ok: true, label: 'Hold E to pry the boards off', progress: g.lk[i].p } : { ok: false, label: 'Boarded shut', why: 'You need something to pry these boards off.' };
      if (lock.type === 'K') return inv.keycard.includes(lock.area) ? { action: 'card', id: i, ok: true, label: 'Swipe the keycard' } : { ok: false, label: 'Keycard lock', why: 'Find the keycard for this door.' };
      if (lock.type === 'P') return { ok: false, label: 'No power', why: L.devices.some((d) => d.area === lock.area && d.type === 'W') ? 'The shutter is dead. Find the generator and get the power on.' : L.devices.some((d) => d.area === lock.area && d.type === 'E') ? 'No power. The breaker needs its power cell.' : lock.area === 8 ? 'The generator has to be running.' : 'The breaker needs fuses.' };
      if (lock.type === 'V') return { ok: false, label: 'Flood door', why: 'Drain the station first. Turn both valves.' };
      if (lock.type === 'A') return { ok: false, label: 'Bulkhead', why: 'Two release levers, one at the end of each service run. Both have to be down at once.' };
      if (lock.type === 'H') return { ok: false, label: 'Blast door', why: 'It opens from the control room console.' };
      if (lock.type === 'Z') return { ok: false, label: g.lift.st === 1 ? 'Lift arriving in ' + Math.ceil(g.lift.t) + 's' : 'Freight lift', why: g.lift.st === 0 ? 'Call it with the button.' : 'Hold on. It is coming.' };
      if (lock.type === 'N') return { action: 'keypad', id: i, ok: true, label: 'Use the keypad' };
      return null;
    });
  });
  for (const d of L.devices) {
    const st = g.dv[d.id];
    consider(d.x, d.z, 2.0, () => {
      if (d.type === 'F' || d.type === 'G') {
        const need = d.type === 'G' ? 3 : 2;
        if (st.on) return { ok: false, label: d.type === 'G' ? 'Generator running' : 'Breaker on' };
        return inv.fuse ? { action: 'fuse', id: d.id, ok: true, label: 'Insert a fuse (' + st.n + '/' + need + ')' } : { ok: false, label: (d.type === 'G' ? 'Generator' : 'Breaker') + ' (' + st.n + '/' + need + ' fuses)', why: 'You need a fuse.' };
      }
      if (d.type === 'J') {
        const lk = L.locks.find((l) => l.area === d.area && l.type === 'A'), open = lk && g.lk[lk.id].o;
        if (open) return { ok: false, label: 'Bulkhead open' };
        if (st.on) return { ok: false, label: 'Latched · ' + Math.max(0, Math.ceil(LEVER_HOLD - (g.t - (st.t || 0)))) + 's · the other lever!' };
        return { hold: 'dev:' + d.id, ok: true, label: 'Hold E to pull the release lever', progress: st.p };
      }
      if (d.type === 'E') return st.on ? { ok: false, label: 'Power restored' } : inv.cell ? { action: 'cell', id: d.id, ok: true, label: 'Slot the power cell in' } : { ok: false, label: 'Breaker · cell bay empty', why: 'It runs off a backup power cell. There is a charging bay somewhere in the labs.' };
      if (d.type === 'v') return st.on ? { ok: false, label: 'Valve open' } : { hold: 'dev:' + d.id, ok: true, label: 'Hold E to turn the valve', progress: st.p };
      if (d.type === 'Q') return st.on ? { ok: false, label: 'Override done' } : { hold: 'dev:' + d.id, ok: true, label: 'Hold E to override the blast door', progress: st.p };
      if (d.type === 'W') return st.on ? { ok: false, label: 'Power on' } : { hold: 'dev:' + d.id, ok: true, label: 'Hold E to throw the main switch', progress: st.p };
      if (d.type === 'u') return g.lift.st === 0 ? { action: 'call', id: d.id, ok: true, label: 'Call the freight lift' } : { ok: false, label: g.lift.st === 1 ? 'Lift arriving in ' + Math.ceil(g.lift.t) + 's' : 'Lift is here' };
      return null;
    });
  }
  return best;
}

// ---------- events from the host ----------
function processGameEvents() {
  const g = Game.g;
  if (!g) return;
  const myId = netMyId();
  for (const ev of g.ev) {
    if (ev.n <= Game.seenEv) continue;
    Game.seenEv = ev.n;
    const pos = ev.x !== undefined ? { x: ev.x, y: 1.2, z: ev.z } : null;
    const who = ev.who === myId ? 'You' : (Game.names[ev.who] || 'Someone');
    switch (ev.type) {
      case 'start': if (Game.mode === 'intro') endIntro(); break;
      case 'checkpoint': showToast('Shelter reached. Checkpoint saved.', 'good', 2400); break;
      case 'respawn': {
        if (ev.ids.includes(myId)) {
          const sp = spawnPoint(g, ev.ids.indexOf(myId));
          Object.assign(Game.me, { x: sp.x, z: sp.z, yaw: sp.yaw + Math.PI, dead: false, stamina: STAMINA_MAX });
          hideDeath();
          showToast(ev.all ? (g.cp > 0 ? 'You wake up in the last shelter.' : 'You wake up back in the lift.') : 'You wake up in the shelter. Your team found you.', 'good', 3200);
        } else if (!ev.all) showToast(ev.ids.map((id) => Game.names[id] || 'Someone').join(', ') + ' woke up in the shelter', 'good', 2600);
        break;
      }
      case 'pick': if (ev.who !== myId) Sound.play('pickup', pos); else showToast('Picked up the ' + ITEM_NAMES[itemType(ev.item)], '', 1800); break;
      case 'deny': if (ev.who === myId) { Sound.play('deny', pos); if (ev.full) showToast('Your hands are full. Drop something with Q.', '', 2200); if (ev.code) keypadWrong(); } break;
      // Seize - B5: it saw someone; it came up somewhere ahead; it took someone
      case 'chudSaw': if (ev.who === myId) { Sound.play('sting'); R.fearKick = 1; showToast('It saw your light', 'danger', 1800); } break;
      case 'chudBang': Sound.chudStep({ x: ev.x, y: 0.5, z: ev.z }, 1.3, 0); Sound.chudGrunt({ x: ev.x, y: 2.2, z: ev.z }, true); break;
      case 'chudGrab': Sound.play('grab', pos); Sound.chudGrunt(pos, true); if (ev.who !== myId) showToast(who + ' was taken', 'danger', 2600); break;
      case 'drop': Sound.play('clunk', pos); break;
      case 'whistle': if (ev.who !== myId) Sound.play('whistle', { x: ev.x, y: 1.6, z: ev.z }); break;
      case 'fuse': Sound.play('fuse', pos); break;
      case 'cellIn': Sound.play('clunk', pos); Sound.play('fuse', pos); break;
      case 'lever':
        Sound.play('leverDown', pos);
        if (ev.left) showToast(ev.who === myId ? 'Latched. ' + LEVER_HOLD + ' seconds - get the other lever down!' : 'A lever is down. ' + LEVER_HOLD + ' seconds to pull the other!', 'danger', 3600);
        break;
      case 'leverBack': Sound.play('leverUp', pos); showToast('The lever sprang back up.', '', 2400); break;
      case 'power':
        if (ev.c) { Sound.play('power', pos); showToast('The lab has power. The door is open - and the hum woke something.', 'danger', 4200); R.shake = 0.5; break; }
        if (ev.w) { Sound.powerUp(pos); showToast('The generator is running. The lights are coming back - and everything down here heard it.', 'danger', 4600); R.shake = 0.9; R.hit = Math.max(R.hit || 0, 0.8); setText($('objective'), 'The power is on and the shutter is open. Get out of the dock.'); }
        else { Sound.play('power', pos); Sound.play('alarm', pos); showToast('The generator is running. Everything down here heard that.', 'danger', 4200); R.shake = 0.6; }
        break;
      case 'strain': Sound.play('creak', pos); Sound.play('clunk', pos); break;
      case 'liftCalled': Sound.play('alarm', pos); showToast(g.lv === 'l2' ? 'Lift called. Thirty seconds. It has seen the lights come on.' : 'Lift called. Thirty seconds. Stay alive.', 'danger', 3600); break;
      case 'liftArrived': Sound.play('liftArrive', pos); showToast('The lift is here. Everyone in!', 'good', 3600); break;
      case 'open': {
        const lt = ev.type === 'open' ? (Game.L.locks[ev.lock] || {}).type : '';
        if (lt === 'B') { Sound.play('snap', pos); Sound.play('boardsFall', pos); } else if (lt === 'K') { Sound.play('beep', pos); Sound.play('door', pos); } else Sound.play('door', pos);
        if (lt !== 'Z') showToast('The way is open', 'good', 2400);
        break;
      }
      case 'pry': Sound.play('creak', pos); break;
      case 'valve': Sound.play('valve', pos); break;
      case 'hack': Sound.play('hack', pos); break;
      case 'valveDone': showToast(ev.left ? 'One valve left' : 'The station is draining', 'good', 2400); break;
      case 'scream': Sound.scream({ x: ev.x, y: 2.2, z: ev.z }); Creature.scream = 1.8; { const d = Game.me ? dist2(Game.me.x, Game.me.z, ev.x, ev.z) : 99; R.fearKick = clamp(1 - d / 20, 0.2, 1); R.shake = Math.max(R.shake || 0, clamp(1 - d / 14, 0, 0.5)); } break;
      case 'grab': if (ev.who !== myId) {
        Sound.play('grab', pos); Sound.play('drag', pos);
        showToast(who + (ev.reach ? ' was dragged out of the shelter' : ' was taken'), 'danger', 3200);
        // you hear what it does to them, wherever you are
        Sound.voiceBoost(true); setTimeout(() => Sound.voiceBoost(false), KILL_TOTAL * 1000);
      } break;
      case 'emerge': if (!ev.tun) { Sound.play('thud', pos); Sound.play('scrape', pos); } break;
      // The hand landing on something inside the room. Everyone hears exactly where it hit - loud, and
      // different for a wall, the floor and the ceiling. Anyone in that room feels it too: the view knocked
      // away from the blow, the light guttering, grit sifting out of the ceiling all around them.
      case 'probe': {
        const p3 = { x: ev.x, y: ev.y, z: ev.z }, f = ev.f || (ev.w ? 'w' : 'f');
        const me = Game.me, inThere = !!me && !me.dead && safeAt(Game.L, me.x, me.z) === ev.s;
        const d = me ? Math.hypot(me.x - ev.x, me.z - ev.z) : 99;
        if (f === 'a') { Sound.whoosh(p3); if (inThere && d < 2.5) R.hit = Math.max(R.hit || 0, 0.45); break; }
        Sound.bang(f, p3, inThere ? clamp(1.15 - d * 0.1, 0.5, 1) : 0);
        debrisBurst(ev.x, ev.y, ev.z, f, 1);
        if (inThere) {
          const k = clamp(1.25 - d * 0.15, 0.62, 1.25);
          R.hit = Math.max(R.hit || 0, 1.65 * k);
          R.shake = Math.max(R.shake || 0, 0.95 * k);
          joltFrom(ev.x, ev.z, 1.55 * k);
          R.flicker = Math.max(R.flicker || 0, 0.55 * k);
          R.fearKick = Math.max(R.fearKick || 0, 0.55);
          if (Math.random() < 0.75) debrisShower(me.x, me.z, 12 + Math.round(k * 12));
        } else R.shake = Math.max(R.shake || 0, clamp(1.35 - d * 0.13, 0, 1.35));
        break;
      }
      // It stopped dead on something, close to someone - and now it is listening. For everyone in that
      // room the world goes quiet except for one nail ticking, and their own heart.
      case 'listen': {
        const me = Game.me, inThere = !!me && !me.dead && safeAt(Game.L, me.x, me.z) === ev.s;
        const dur = ev.d || 1.1;
        Sound.nails({ x: ev.x, y: ev.y, z: ev.z }, dur);
        if (inThere) {
          Sound.duck(0.9, dur, 0.9);
          Game.holdBreath = Math.max(Game.holdBreath || 0, dur);
          R.fearKick = Math.max(R.fearKick || 0, 0.95);
          Game.listenHints = (Game.listenHints || 0) + 1;
          if (Game.listenHints <= 2) showToast('It’s listening. Don’t move. Don’t make a sound.', 'danger', Math.max(1700, dur * 1000));
        }
        break;
      }
      // someone made a sound in the silence, and it heard
      case 'heard': {
        const me = Game.me, inThere = !!me && !me.dead && safeAt(Game.L, me.x, me.z) === ev.s;
        const h = Creature.headPos, from = h && Creature.visible ? { x: h.x, y: h.y, z: h.z } : { x: ev.x, y: 1.6, z: ev.z };
        Sound.heard(from, ev.who === myId);
        Game.holdBreath = 0;
        if (inThere) { R.fearKick = 1; R.hit = Math.max(R.hit || 0, 0.7); }
        break;
      }
      case 'withdraw': Sound.withdraw({ x: ev.x, y: 1.4, z: ev.z }); Game.holdBreath = 0; Sound.duck(0, 0, 0.6); break;
      case 'escape': if (Game.mode === 'play') startEnding(); break;
    }
  }
}

function onLocalDeath() {
  Sound.play('grab');
  // no jump scare: whoever it catches lives through the whole drag and beating, mic open and a little louder
  Game.scare = { t: 0, n: 0, from: R.camera.position.clone(), x: Game.me.x, z: Game.me.z };
  Sound.voiceBoost(true);
  showDeath(Game.g && levelHasBeast(Game.g.lv) ? beastKillLen(Game.g.kl) * 1000 + 200 : Creature.visible ? KILL_TOTAL * 1000 + 100 : 1300);
}

// ---------- teammates ----------
const _tw = new THREE.Vector3(), _tq = new THREE.Quaternion(), _tdir = new THREE.Vector3();
function updateMates(dt, t) {
  const g = Game.g, L = Game.L;
  OCC.mateBudget = 1;
  const seen = new Set();
  let li = 0;
  for (const p of netPeers()) {
    if (p.me) continue;
    const s = p.s;
    Game.names[p.id] = String(s.n || 'Player').slice(0, 14);
    if (!g || typeof s.x !== 'number' || s.rn !== g.rn) continue;
    seen.add(p.id);
    let m = Game.mates.get(p.id);
    if (!m) {
      const h = makeHuman(playerColor(s.c), Game.names[p.id]);
      R.scene.add(h.root);
      m = { h, x: s.x, z: s.z, yaw: s.y || 0, pitch: s.p || 0, stepT: 0 };
      Game.mates.set(p.id, m);
    }
    const k = 1 - Math.exp(-dt * 12);
    const ox = m.x, oz = m.z;
    m.x = lerp(m.x, s.x, k); m.z = lerp(m.z, s.z, k);
    m.yaw = lerpAngle(m.yaw, +s.y || 0, k); m.pitch = lerp(m.pitch, +s.p || 0, k);
    const speed = Math.hypot(m.x - ox, m.z - oz) / Math.max(dt, 1e-4);
    m.dead = !!g.k[p.id];
    if (!m.dead) Game.corpses.delete(p.id);
    // Dead is not gone. While it has them, everyone sees what it is doing to them; afterwards, they lie where
    // it left them until the team brings them back.
    const kl = g.kl, beastKill = m.dead && kl && kl.c && kl.id === p.id && Game.gt !== undefined && Game.gt - kl.t < beastKillLen(kl);
    const killing = beastKill || (m.dead && kl && !kl.c && kl.id === p.id && KS.T <= KILL_TOTAL && Creature.override && Creature.override.kill);
    const corpse = m.dead && !killing ? Game.corpses.get(p.id) : null;
    m.h.root.visible = (Game.mode !== 'end' || (Cinema.mode === 'ending' && !Cinema.teaser)) && (!m.dead || !!killing || !!corpse);
    if (killing) poseBody(m.h, beastKill ? beastKillBody(kl, Game.gt - kl.t) : KS, t, p.id.length);
    else if (corpse) poseBody(m.h, corpse, t, p.id.length);
    else {
      m.h.root.position.set(m.x, (cellFlag(L, L.water, m.x, m.z) ? -0.3 : 0) + floorY(L, m.x, m.z), m.z);
      m.h.root.rotation.set(0, m.yaw + Math.PI, 0);
      m.h.tag.visible = true;
      animateHuman(m.h, dt, speed, m.pitch, s.cro === 1 ? 1 : 0, s.fl !== 0, t);
    }
    if (!m.dead && m.h.footfall) Sound.step(surfaceAt(m.x, m.z), s.run === 1, { x: m.x, y: 0.1, z: m.z }, s.cro === 1 ? 0.35 : 0.8);
    const L2 = R.mates[li++];
    if (L2) {
      m.h.torch.getWorldPosition(_tw); m.h.torch.getWorldQuaternion(_tq);
      _tdir.set(0, 0, 1).applyQuaternion(_tq);
      L2.light.position.copy(_tw);
      L2.target.position.copy(_tw).addScaledVector(_tdir, 3);
      L2.light.intensity = !m.dead && s.fl !== 0 && m.h.root.visible ? LUX.mate : 0;
      occMate(li - 1, L2.light, L2.light.intensity > 0);
    }
    // the dead are normally only heard by the dead - but for as long as it still has hold of someone,
    // the living hear every second of it
    const dying = m.dead && g && g.k[p.id] > 0 && g.t - g.k[p.id] < KILL_TOTAL;
    // their voice comes from wherever their head is - which, while it has them, is in its hand
    const kh = beastKill ? beastKillBody(kl, Game.gt - kl.t).head : KS.head;
    const vx = killing ? kh.x : m.x, vy = killing ? kh.y : 1.6, vz = killing ? kh.z : m.z;
    if (Game.me) Sound.placeVoice(p.id, vx, vy, vz, !lineOfSight(L, Game.me.x, Game.me.z, vx, vz, openLocksOf(g)), !m.dead || dying || (Game.me && Game.me.dead));
  }
  for (; li < R.mates.length; li++) { R.mates[li].light.intensity = 0; occMate(li, R.mates[li].light, false); }
  for (const [id, m] of Game.mates) if (!seen.has(id)) { R.scene.remove(m.h.root); Game.mates.delete(id); }
}

function spectateTarget() {
  let best = null;
  for (const [id, m] of Game.mates) if (!m.dead && (!best || id < best.id)) best = { id, m };
  return best;
}
