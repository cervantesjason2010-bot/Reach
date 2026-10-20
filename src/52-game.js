// ================= game state and the host's simulation =================
const REACH_MAX = 5.6;          // how far into a room the arm can get: most shelters no longer have a safe corner
const GRAB_DIST = 1.9;
const INTRO_SECONDS = 26;
const LIFT_WAIT = 30;
const Game = {
  mode: 'boot',            // boot | title | lobby | intro | play | end
  L: null, solo: true,
  g: null,                 // shared state (authoritative on the host)
  sim: null,               // host-only creature brain and timers
  me: null,                // local player
  names: {}, mates: new Map(),
  seenEv: 0, round: -1, areaSeen: new Set(),
  actSeq: 0, actQueue: [],
};

const openLocksOf = (g) => (g ? g.lk.map((l) => (l.o ? 1 : 0)) : []);

function newGameState(rn) {
  const L = Game.L;
  const g = {
    ph: 'intro', rn, t: 0, ca: 0, cp: 0, en: 0, ev: [], ack: {}, k: {},
    lk: L.locks.map(() => ({ o: 0, p: 0 })),
    it: {}, dv: {},
    cr: { x: 0, z: 0, yaw: 0, st: 0, mode: 'hidden', lx: 0, ly: 1.5, lz: 0 },
    lift: { st: 0, t: 0 }, tpk: 0,
  };
  for (const it of L.items) g.it[it.id] = { p: [r2(it.x), r2(it.z)] };
  for (const d of L.devices) g.dv[d.id] = { n: 0, p: 0, on: 0 };
  return g;
}

function hostEvent(g, type, data) {
  g.en += 1;
  g.ev.push(Object.assign({ n: g.en, type }, data));
  if (g.ev.length > 10) g.ev.shift();
}

function startNewRound() {
  const rn = (Game.g ? Game.g.rn : 0) + 1;
  Game.g = newGameState(rn);
  Game.g.mp = typeof Settings !== 'undefined' ? Settings.map : 'l1';
  Game.g.lv = Game.levelKey || 'l1';
  if (Game.g.lv === 'l2') seizeNewRound(Game.g);
  if (Game.g.lv === 'l3') { seizeCodes(Game.g); paleNewRound(Game.g); }
  Game.sim = { state: 'dormant', timer: INTRO_SECONDS + 75, path: null, pathT: 0, goal: null, lastSeen: null, lost: 0, seeT: {}, reachSafe: null, reachT: 0, ext: 0, cool: {}, area: 0,
    holds: {}, insideT: 0, x: 0, z: 0, yaw: 0, speed: 0, wanderT: 0, eatT: 0, victim: null, scream: 0, spawnFor: -1,
    born: false, travelT: 0, probe: null };
}

// ---------- host: one tick of the world ----------
function hostTick(dt) {
  const g = Game.g, L = Game.L, sim = Game.sim;
  if (!g || !sim) return;
  g.t += dt;
  const players = gatherPlayers(g);
  const living = players.filter((p) => !g.k[p.id]);
  if (g.ph === 'intro') {
    if (g.t > INTRO_SECONDS || g.skip) { g.ph = 'play'; g.ps = r2(g.t); hostEvent(g, 'start', {}); }
    return;
  }
  if (g.ph !== 'play') return;
  const open = openLocksOf(g);
  // where is the team?
  let ca = 0;
  for (const p of living) ca = Math.max(ca, Math.max(0, areaAt(L, p.x, p.z)));
  if (ca > g.ca) { g.ca = ca; hostEvent(g, 'area', { a: ca }); if (sim.state !== 'chase' && sim.state !== 'reach') { sim.spawnFor = ca; sim.timer = 14 + Math.random() * 10; } }
  // checkpoints and respawns
  for (const p of living) {
    const sf = safeAt(L, p.x, p.z);
    if (sf && sf !== g.cp) { g.cp = sf; hostEvent(g, 'checkpoint', { s: sf }); }
    if (sf) {
      const dead = players.filter((q) => g.k[q.id] && g.t - g.k[q.id] > KILL_TOTAL + 1.5).map((q) => q.id);
      if (dead.length) { for (const id of dead) delete g.k[id]; hostEvent(g, 'respawn', { s: sf, ids: dead }); }
    }
  }
  // total party kill: back to the last shelter
  if (!living.length && players.length) {
    g.tpk += dt;
    if (g.tpk > KILL_TOTAL + 0.6) {
      g.tpk = 0; g.k = {};
      hostEvent(g, 'respawn', { s: g.cp, ids: players.map((p) => p.id), all: 1 });
      relocateCreature(g, g.ca, 18);
    }
  } else g.tpk = 0;
  processActions(g, players);
  processHolds(g, players, dt);
  tickLevers(g);
  updateLift(g, living, dt);
  if (g.lv === 'l2') chudTick(g, living, players, dt, open);
  else if (g.lv === 'l3') paleTick(g, living, players, dt, open);
  else creatureTick(g, living, dt, open);
}

function gatherPlayers(g) {
  const out = [];
  for (const p of netPeers()) {
    const s = p.s;
    if (!s || typeof s.x !== 'number' || s.rn !== g.rn) continue;
    out.push({ id: p.id, me: p.me, x: s.x, z: s.z, yaw: +s.y || 0, pitch: +s.p || 0, run: s.run === 1, cro: s.cro === 1, fl: s.fl !== 0, vl: +s.vl || 0, a: s.a, h: s.h || '', mv: +s.mv || 0, name: s.n });
  }
  return out;
}

// ---------- actions (pick up, swipe, insert, call) ----------
function processActions(g, players) {
  const L = Game.L;
  for (const p of players) {
    if (!Array.isArray(p.a) || g.k[p.id]) continue;
    const [seq, kind, id] = p.a;
    if (!(seq > (g.ack[p.id] || 0))) continue;
    g.ack[p.id] = seq;
    if (kind === 'pick') {
      const st = g.it[id], it = L.items.find((x) => x.id === id);
      if (st && st.p && it && dist2(p.x, p.z, st.p[0], st.p[1]) < 2.2) {
        // five things, and no more
        const carried = Object.keys(g.it).filter((k) => g.it[k].o === p.id).length;
        if (carried >= INV_SLOTS) hostEvent(g, 'deny', { who: p.id, x: st.p[0], z: st.p[1], full: 1 });
        else { g.it[id] = { o: p.id }; hostEvent(g, 'pick', { who: p.id, item: id, x: st.p[0], z: st.p[1] }); }
      }
    } else if (kind === 'drop') {
      const st = g.it[id];
      if (st && st.o === p.id) {
        let x = p.x - Math.sin(p.yaw) * 0.55, z = p.z - Math.cos(p.yaw) * 0.55;
        if (!walkableCell(L, Math.floor(x), Math.floor(z)) || collides(L, x, z, 0.12, false, openLocksOf(g))) { x = p.x; z = p.z; }
        g.it[id] = { p: [r2(x), r2(z)] };
        hostEvent(g, 'drop', { who: p.id, item: id, x: r2(x), z: r2(z) });
      }
    } else if (kind === 'whistle') {
      // a whistle carries: everyone hears it, and so does it - which is the point, sometimes
      makeNoise(g, p.x, p.z, 26);
      hostEvent(g, 'whistle', { who: p.id, x: r2(p.x), z: r2(p.z) });
    } else if (kind === 'card') {
      const lock = L.locks[id];
      if (!lock || g.lk[id].o || dist2(p.x, p.z, lock.x, lock.z) > 2.6) continue;
      const card = Object.keys(g.it).find((k) => k === 'key' + lock.area && g.it[k].o === p.id);
      if (card) { g.it[card] = { u: 1 }; openLock(g, id, p); } else hostEvent(g, 'deny', { who: p.id, x: lock.x, z: lock.z });
    } else if (kind === 'fuse') {
      const dev = L.devices.find((d) => d.id === id), ds = g.dv[id];
      if (!dev || !ds || dist2(p.x, p.z, dev.x, dev.z) > 2.4) continue;
      const need = dev.type === 'G' ? 3 : 2;
      const fuse = Object.keys(g.it).find((k) => k.startsWith('fuse') && g.it[k].o === p.id);
      if (fuse && ds.n < need) {
        g.it[fuse] = { u: 1 }; ds.n += 1; hostEvent(g, 'fuse', { who: p.id, x: dev.x, z: dev.z });
        if (ds.n >= need) {
          ds.on = 1;
          const lockId = L.locks.findIndex((l) => l.area === dev.area && l.type === 'P');
          if (dev.type === 'G') { hostEvent(g, 'power', { x: dev.x, z: dev.z }); alertCreature(g, dev.x, dev.z, true); }
          if (lockId >= 0) openLock(g, lockId, p);
        }
      } else if (!fuse) hostEvent(g, 'deny', { who: p.id, x: dev.x, z: dev.z });
    } else if (kind === 'cell') {
      // the power cell goes into the lab's breaker: one heavy thing, one clunk, and the lights come back
      const dev = L.devices.find((d) => d.id === id), ds = g.dv[id];
      if (!dev || !ds || ds.on || dist2(p.x, p.z, dev.x, dev.z) > 2.4) continue;
      const cell = Object.keys(g.it).find((k) => k.startsWith('cell') && g.it[k].o === p.id);
      if (!cell) { hostEvent(g, 'deny', { who: p.id, x: dev.x, z: dev.z }); continue; }
      g.it[cell] = { u: 1 }; ds.n = 1; ds.on = 1;
      hostEvent(g, 'cellIn', { who: p.id, x: dev.x, z: dev.z });
      hostEvent(g, 'power', { x: dev.x, z: dev.z, c: 1 });
      alertCreature(g, dev.x, dev.z, true);
      const lockId = L.locks.findIndex((l) => l.area === dev.area && l.type === 'P');
      if (lockId >= 0) openLock(g, lockId, p);
    } else if (kind === 'code') {
      // a code typed at a keypad door: right, and it opens; wrong, and it buzzes
      const [sid, typed] = String(id).split(':'), lid = +sid, lock = L.locks[lid];
      if (!lock || lock.type !== 'N' || g.lk[lid].o || dist2(p.x, p.z, lock.x, lock.z) > 3) continue;
      if (typed && typed === codeFor(g, lid)) openLock(g, lid, p);
      else hostEvent(g, 'deny', { who: p.id, x: lock.x, z: lock.z, code: 1 });
    } else if (kind === 'call') {
      const dev = L.devices.find((d) => d.id === id);
      if (dev && g.lift.st === 0 && dist2(p.x, p.z, dev.x, dev.z) < 2.4) {
        g.lift.st = 1; g.lift.t = LIFT_WAIT; g.dv[id].on = 1;
        hostEvent(g, 'liftCalled', { x: dev.x, z: dev.z });
        alertCreature(g, dev.x, dev.z, true);
      }
    }
  }
}

function openLock(g, id, p) {
  if (g.lk[id].o) return;
  g.lk[id].o = 1; g.lk[id].p = 1;
  const lock = Game.L.locks[id];
  hostEvent(g, 'open', { lock: id, who: p ? p.id : '', x: lock.x, z: lock.z });
  makeNoise(g, lock.x, lock.z, lock.noise || 8);
}

// ---------- hold-to-use (pry, valves, hack) ----------
function processHolds(g, players, dt) {
  const L = Game.L, sim = Game.sim;
  const active = {};
  for (const p of players) {
    if (g.k[p.id] || !p.h) continue;
    const [kind, sid] = p.h.split(':');
    if (kind === 'lock') {
      const id = +sid, lock = L.locks[id];
      if (!lock || g.lk[id].o || lock.type !== 'B' || dist2(p.x, p.z, lock.x, lock.z) > 2.6) continue;
      if (!(g.it.crowbar && g.it.crowbar.o === p.id)) continue;
      active['lock:' + id] = { p, rate: 1 / lock.hold, x: lock.x, z: lock.z, noise: lock.noise };
    } else if (kind === 'dev') {
      const dev = L.devices.find((d) => d.id === sid);
      if (!dev || g.dv[sid].on || dist2(p.x, p.z, dev.x, dev.z) > 2.4) continue;
      if (dev.type === 'v') active['dev:' + sid] = { p, rate: 1 / 4, x: dev.x, z: dev.z, noise: 11 };
      if (dev.type === 'Q') active['dev:' + sid] = { p, rate: 1 / 6, x: dev.x, z: dev.z, noise: 9 };
      if (dev.type === 'W') active['dev:' + sid] = { p, rate: 1 / 1.5, x: dev.x, z: dev.z, noise: 6 };
      if (dev.type === 'J') active['dev:' + sid] = { p, rate: 1 / 0.7, x: dev.x, z: dev.z, noise: 7 };
    }
  }
  for (const key in active) {
    const a = active[key];
    const [kind, sid] = key.split(':');
    sim.holds[key] = (sim.holds[key] || 0) + dt;
    if (sim.holds[key] > 0.5) {
      sim.holds[key] = 0; makeNoise(g, a.x, a.z, a.noise);
      const dt2 = kind === 'lock' ? '' : Game.L.devices.find((d) => d.id === sid).type;
      hostEvent(g, kind === 'lock' ? 'pry' : dt2 === 'v' ? 'valve' : dt2 === 'W' || dt2 === 'J' ? 'strain' : 'hack', { x: a.x, z: a.z });
    }
    if (kind === 'lock') {
      const st = g.lk[+sid]; st.p = Math.min(1, st.p + a.rate * dt);
      if (st.p >= 1) openLock(g, +sid, a.p);
    } else {
      const st = g.dv[sid]; st.p = Math.min(1, st.p + a.rate * dt);
      if (st.p >= 1) {
        st.on = 1;
        const dev = L.devices.find((d) => d.id === sid);
        if (dev.type === 'Q') { const lockId = L.locks.findIndex((l) => l.area === dev.area && l.type === 'H'); if (lockId >= 0) openLock(g, lockId, a.p); }
        if (dev.type === 'W') {
          // the switch goes over: the generator turns, the lights come back bank by bank, the shutter goes up -
          // and every one of those noises carries
          hostEvent(g, 'power', { x: dev.x, z: dev.z, a: dev.area, w: 1 });
          alertCreature(g, dev.x, dev.z, true);
          const lockId = L.locks.findIndex((l) => l.area === dev.area && l.type === 'P');
          if (lockId >= 0) openLock(g, lockId, a.p);
        }
        if (dev.type === 'J') {
          // a release lever latched: it holds for LEVER_HOLD seconds, ratcheting, unless the other is down too
          st.t = r2(g.t);
          const levers = L.devices.filter((d) => d.area === dev.area && d.type === 'J');
          const left = levers.filter((v) => !g.dv[v.id].on).length;
          hostEvent(g, 'lever', { x: dev.x, z: dev.z, left, who: a.p.id });
          if (!left) { const lockId = L.locks.findIndex((l) => l.area === dev.area && l.type === 'A'); if (lockId >= 0) openLock(g, lockId, a.p); }
        }
        if (dev.type === 'v') {
          const valves = L.devices.filter((d) => d.area === dev.area && d.type === 'v');
          hostEvent(g, 'valveDone', { x: dev.x, z: dev.z, left: valves.filter((v) => !g.dv[v.id].on).length });
          if (valves.every((v) => g.dv[v.id].on)) { const lockId = L.locks.findIndex((l) => l.area === dev.area && l.type === 'V'); if (lockId >= 0) openLock(g, lockId, a.p); }
        }
      }
    }
  }
}

// a latched lever ratchets as it counts down - loud, and it carries - and springs back up if it was alone
const LEVER_HOLD = 25;
function tickLevers(g) {
  const L = Game.L;
  for (const d of L.devices) {
    if (d.type !== 'J') continue;
    const st = g.dv[d.id];
    if (!st || !st.on) continue;
    const lockId = L.locks.findIndex((l) => l.area === d.area && l.type === 'A');
    if (lockId >= 0 && g.lk[lockId].o) continue;
    if (Math.floor(g.t * 2) !== Math.floor((g.t - 0.05) * 2)) makeNoise(g, d.x, d.z, 9);
    if (g.t - (st.t || 0) > LEVER_HOLD) { st.on = 0; st.p = 0; hostEvent(g, 'leverBack', { x: d.x, z: d.z }); }
  }
}

// ---------- the freight lift ----------
function updateLift(g, living, dt) {
  const L = Game.L;
  if (g.lift.st === 1) {
    g.lift.t -= dt;
    if (g.lift.t <= 0) {
      g.lift.st = 2;
      const id = L.locks.findIndex((l) => l.type === 'Z');
      if (id >= 0) { g.lk[id].o = 1; g.lk[id].ready = 1; }
      hostEvent(g, 'liftArrived', {});
    }
  } else if (g.lift.st === 2) {
    const last = L.areas.length - 1;
    const inside = living.length && living.every((p) => { const gx = Math.floor(p.x), gz = Math.floor(p.z); return inGrid(L, gx, gz) && L.ch[gz * L.W + gx] === 'z' && L.area[gz * L.W + gx] === last; });
    Game.sim.insideT = inside ? Game.sim.insideT + dt : 0;
    if (Game.sim.insideT > 1.5) {
      g.lift.st = 3; g.ph = 'win'; g.te = r2(g.t);
      const id = L.locks.findIndex((l) => l.type === 'Z');
      if (id >= 0) g.lk[id].o = 0;
      hostEvent(g, 'escape', {});
    }
  }
}

// ---------- the creature's brain ----------
function makeNoise(g, x, z, radius) { (Game.sim.noises || (Game.sim.noises = [])).push({ x, z, r: radius, t: 0.6 }); }
function alertCreature(g, x, z, hard) {
  const sim = Game.sim, L = Game.L;
  if (sim.state === 'dormant' || sim.state === 'emerge') {
    // still in the walls: this is what brings it out - out of the vent nearest the noise - and where it goes
    // once it is out
    if (sim.state === 'dormant') {
      const lair = L.lairs[Math.max(0, areaAt(L, x, z))];
      if (lair) sim.pendingLair = lair;
      sim.timer = Math.min(sim.timer, 2);
    }
    sim.afterEmerge = { x, z };
    return;
  }
  if (sim.state !== 'chase' && sim.state !== 'reach') { sim.state = 'investigate'; sim.goal = { x, z }; sim.path = null; sim.timer = 30; if (hard) sim.hurry = 1; }
}
// Out of its lair: the host only decides when, and from which vent - everything about how is in the shared
// choreography (44-lair.js), so every machine sees the same thing at the same moment.
const _emH = { x: 0, z: 0, s: 0 };
function startEmerge(g, I, walker) {
  const sim = Game.sim;
  if (I.free === undefined) I.free = lairFree(Game.L, I);
  g.em = { t: r2(g.t), a: I.ai, te: walker ? 1 : 0, ob: lairBurst(g, I.ai) ? 1 : 0 };
  sim.state = 'emerge'; sim.born = true; sim.pendingLair = null; sim.spawnFor = -1;
  emergeRoot(I, emergeClock(g.em, 0), g.em.te, _emH); sim.x = _emH.x; sim.z = _emH.z; sim.yaw = Math.atan2(I.nx, I.nz);
  g.cr.mode = 'emerge';
  hostEvent(g, 'emerge', { x: r2(I.cx), z: r2(I.cz), tun: 1 });
}
function emergeTick(g, living, dt, open) {
  const sim = Game.sim, L = Game.L, cr = g.cr, em = g.em, I = L.lairInfo[em.a];
  const T = emergeClock(em, g.t - em.t);
  emergeRoot(I, T, em.te, _emH);
  sim.x = _emH.x; sim.z = _emH.z; sim.yaw = Math.atan2(I.nx, I.nz);
  cr.mode = 'emerge';
  // it looks at whoever is nearest that it can see from the hole - straight out of it if nobody
  let tgt = null, td = 1e9;
  for (const p of living) {
    const d = dist2(p.x, p.z, I.cx, I.cz);
    if (d < td && d < 18 && lineOfSight(L, p.x, p.z, I.cx + I.nx * 0.6, I.cz + I.nz * 0.6, open)) { td = d; tgt = p; }
  }
  if (tgt) { cr.lx = r2(tgt.x); cr.ly = 1.5; cr.lz = r2(tgt.z); }
  else { cr.lx = r2(I.cx + I.nx * 4 + Math.sin(g.t * 0.7) * 2 * I.tx); cr.ly = 1.2; cr.lz = r2(I.cz + I.nz * 4 + Math.sin(g.t * 0.7) * 2 * I.tz); }
  if (T >= emergeEnd(em.te)) {
    g.lb = (g.lb || 0) | (1 << em.a);
    sim.path = null; sim.goal = null; sim.menace = Math.max(sim.menace || 0, 0.7);
    if (tgt && td < 16) { sim.state = 'chase'; sim.target = tgt.id; sim.lastSeen = { x: tgt.x, z: tgt.z }; sim.lost = 0; sim.tv = { x: 0, z: 0 }; }
    else if (sim.afterEmerge) { sim.state = 'investigate'; sim.goal = sim.afterEmerge; sim.timer = 30; sim.hurry = 1; }
    else sim.state = 'wander';
    sim.afterEmerge = null;
  }
}
// It is never replaced with a fresh one further in. There is one of them, and when the team moves on it
// follows - on foot, through the doors they opened, taking as long as that takes. Only when it has been
// shut out for a long time, and nobody can see it, does it give up and take the vents instead.
function relocateCreature(g, area, delay) {
  const sim = Game.sim, L = Game.L;
  const lair = L.lairs[area] || L.lairs[Math.max(0, area - 1)];
  if (!lair) return;
  sim.pendingLair = lair;
  if (sim.born) {
    sim.state = 'travel'; sim.goal = { x: lair.x, z: lair.z }; sim.path = null; sim.travelT = 0; sim.spawnFor = -1;
    return;
  }
  // the first time only: it has to come from somewhere
  sim.state = 'dormant'; sim.timer = delay; sim.spawnFor = area;
  g.cr.mode = 'hidden';
}

function creatureTick(g, living, dt, open) {
  const sim = Game.sim, L = Game.L, cr = g.cr;
  for (const n of (sim.noises || [])) n.t -= dt;
  sim.noises = (sim.noises || []).filter((n) => n.t > 0);
  sim.scream = Math.max(0, sim.scream - dt);
  noteScent(g, living, dt);
  // How close it lets itself get. After it has fed - or been shut out - it backs right off and gives the team
  // room to breathe; then, as the quiet goes on, it drifts closer, and closer, until it is hunting them.
  if (sim.menace === undefined) sim.menace = 0.45;
  if (sim.state !== 'chase' && sim.state !== 'reach' && sim.state !== 'eat') sim.menace = Math.min(1, sim.menace + dt * 0.011);
  if (sim.state === 'dormant') {
    cr.mode = 'hidden';
    sim.timer -= dt;
    const area = sim.spawnFor >= 0 ? sim.spawnFor : g.ca;
    const lair = sim.pendingLair || L.lairs[area];
    const li = lair ? L.lairs.indexOf(lair) : -1, I = li >= 0 && L.lairInfo ? L.lairInfo[li] : null;
    // walked in on: anyone who comes up to the cover while it is in there brings it out - face first
    let walkedIn = null;
    if (I) for (const p of living) {
      const dx = p.x - I.cx, dz = p.z - I.cz, along = dx * I.nx + dz * I.nz;
      if (along > 0.3 && along < 7.5 && Math.abs(dx * I.tx + dz * I.tz) < 4.5 && lineOfSight(L, p.x, p.z, I.cx + I.nx * 0.6, I.cz + I.nz * 0.6, open)) { walkedIn = p; break; }
    }
    if ((sim.timer <= 0 || walkedIn) && living.length) {
      if (I) startEmerge(g, I, walkedIn);
      else if (lair) {
        sim.x = lair.x; sim.z = lair.z; sim.yaw = 0; sim.state = 'wander'; sim.path = null; sim.pendingLair = null; sim.spawnFor = -1;
        sim.born = true;
        hostEvent(g, 'emerge', { x: lair.x, z: lair.z });
      } else sim.timer = 5;
    }
    return;
  }
  if (sim.state === 'emerge') { emergeTick(g, living, dt, open); return; }
  // when the team has moved on, it comes through the vents
  if (sim.spawnFor >= 0 && sim.state !== 'chase' && sim.state !== 'reach' && sim.state !== 'eat') {
    sim.timer -= dt;
    if (sim.timer <= 0) {
      // once it exists it just starts walking after them; only a creature that has not appeared yet
      // needs everyone to be out of sight first
      const far = sim.born || living.every((p) => dist2(p.x, p.z, sim.x, sim.z) > 22);
      const area = sim.spawnFor; sim.spawnFor = -1;
      if (far) { relocateCreature(g, area, 1.5); return; }
    }
  }
  // perception
  let seen = null, seenD = Infinity;
  for (const p of living) {
    const d = dist2(p.x, p.z, sim.x, sim.z);
    const inSafe = safeAt(L, p.x, p.z);
    let range = p.fl ? 17 : 8;
    if (p.cro) range *= 0.55;
    if (d > range && d > 2.5) { sim.seeT[p.id] = 0; continue; }
    const ang = Math.abs(wrapAngle(Math.atan2(p.x - sim.x, p.z - sim.z) - sim.yaw));
    if (ang > 1.15 && d > 3) { sim.seeT[p.id] = 0; continue; }
    if (!lineOfSight(L, sim.x, sim.z, p.x, p.z, open)) { sim.seeT[p.id] = 0; continue; }
    if (sim.ignore && sim.ignore[p.id] > g.t && d > 3) { sim.seeT[p.id] = 0; continue; }
    sim.seeT[p.id] = (sim.seeT[p.id] || 0) + dt;
    const react = sim.state === 'chase' ? 0 : sim.state === 'investigate' ? 0.25 : 0.55;
    if (sim.seeT[p.id] >= react && d < seenD && (!inSafe || d < 4)) { seen = p; seenD = d; }
  }
  // it feels a flashlight held on it, even from behind
  let lit = null;
  for (const p of living) {
    if (!p.fl) continue;
    const d = dist2(p.x, p.z, sim.x, sim.z);
    if (d > 12) { sim.litT = 0; continue; }
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    const dot = ((sim.x - p.x) * fx + (sim.z - p.z) * fz) / Math.max(d, 0.01);
    if (dot > 0.9 && lineOfSight(L, p.x, p.z, sim.x, sim.z, open)) { lit = p; break; }
  }
  sim.litT = lit ? (sim.litT || 0) + dt : Math.max(0, (sim.litT || 0) - dt);
  // hearing: steps, voices, work
  let heard = null;
  if (sim.litT > 1.1 && lit) heard = { x: lit.x, z: lit.z, d: dist2(lit.x, lit.z, sim.x, sim.z), p: lit, loud: false, light: true };
  for (const p of living) {
    const wet = cellFlag(L, L.water, p.x, p.z);
    let r = p.mv > 0.3 ? (p.run ? 10 : p.cro ? 0.6 : 2.6) : 0;
    // the power cell hums, and it is heavy: whoever carries it is heard
    if (Object.keys(g.it).some((k) => k.startsWith('cell') && g.it[k].o === p.id)) r = Math.max(r, p.mv > 0.3 ? 4.5 : 2.2);
    if (wet && p.mv > 0.3) r *= p.cro ? 2.5 : 1.7;
    r = Math.max(r, p.vl * 16);
    if (r <= 0) continue;
    const d = dist2(p.x, p.z, sim.x, sim.z);
    const eff = lineOfSight(L, sim.x, sim.z, p.x, p.z, open) ? r : r * 0.55;
    if (d < eff && (!heard || d < heard.d)) heard = { x: p.x, z: p.z, d, p, loud: r > 6 };
  }
  for (const n of sim.noises) {
    const d = dist2(n.x, n.z, sim.x, sim.z);
    const eff = lineOfSight(L, sim.x, sim.z, n.x, n.z, open) ? n.r : n.r * 0.6;
    if (d < eff && (!heard || d < heard.d)) heard = { x: n.x, z: n.z, d, loud: true };
  }
  // decide
  if (sim.state === 'eat') {
    sim.eatT -= dt; cr.mode = 'eat';
    if (sim.eatT <= 0) { sim.state = 'wander'; sim.path = null; sim.goal = null; sim.menace = 0.12; }
  } else if (sim.state === 'reach') {
    reachTick(g, living, dt);
  } else if (seen) {
    if (sim.state !== 'chase') { sim.scream = 1.8; hostEvent(g, 'scream', { x: sim.x, z: sim.z }); sim.tv = { x: 0, z: 0 }; }
    trackTarget(sim, seen, dt);
    sim.state = 'chase'; sim.target = seen.id; sim.lastSeen = { x: seen.x, z: seen.z }; sim.lost = 0;
  } else if (sim.state === 'chase') {
    sim.lost += dt;
    const tp = living.find((p) => p.id === sim.target);
    if (tp && heard && heard.p === tp) { trackTarget(sim, tp, dt); sim.lastSeen = { x: tp.x, z: tp.z }; }
    if (sim.lost > 5 || !tp) {
      // lost them: it goes to where it last had them, then on the way they were going, and looks
      sim.state = 'investigate'; sim.path = null; sim.timer = 16; sim.hurry = 1;
      sim.goal = predictFrom(g, sim.lastSeen, sim.tv, open); sim.searchLeft = 2; sim.menace = Math.max(sim.menace, 0.6);
    }
  } else if (heard) {
    if (sim.state !== 'investigate' || dist2(heard.x, heard.z, sim.goal ? sim.goal.x : 0, sim.goal ? sim.goal.z : 0) > 2) { sim.state = 'investigate'; sim.goal = { x: heard.x, z: heard.z }; sim.path = null; sim.timer = 14; sim.hurry = heard.loud ? 1 : 0; }
    if (heard.d < 4.5 && heard.p) { sim.state = 'chase'; sim.target = heard.p.id; sim.lastSeen = { x: heard.x, z: heard.z }; sim.lost = 0; sim.scream = 1.8; hostEvent(g, 'scream', { x: sim.x, z: sim.z }); }
  }
  // act
  let speed = 0, goal = null, mode = 'walk';
  if (sim.state === 'chase') {
    const tp = living.find((p) => p.id === sim.target);
    if (tp) {
      const sf = safeAt(L, tp.x, tp.z);
      if (sf && !(sim.cool[sf] > g.t)) {
        const s = L.safes[sf - 1];
        goal = s.outside;
        if (dist2(sim.x, sim.z, s.outside.x, s.outside.z) < 0.7) { sim.state = 'reach'; sim.reachSafe = s; sim.reachT = 0; sim.ext = 0; sim.probe = null; }
      } else if (sf) { sim.state = 'investigate'; sim.goal = sim.lastSeen; sim.timer = 6; }
      else goal = { x: tp.x, z: tp.z };
      if (!sf && dist2(sim.x, sim.z, tp.x, tp.z) < GRAB_DIST) {
        g.k[tp.id] = Math.max(0.01, r2(g.t)); g.kc = (g.kc || 0) + 1; dropItems(g, tp); hostEvent(g, 'grab', { who: tp.id, x: r2(tp.x), z: r2(tp.z) });
        startKill(g, tp, null, null);
      } else if (sim.blocked && dist2(sim.x, sim.z, sim.blocked.x, sim.blocked.z) < 1.3) {
        // As close as it can get, and they are still out of reach. It stares in at them for a while - then
        // goes, to find another way round.
        sim.stareT = (sim.stareT || 0) + dt;
        if (sim.stareT > 3.5 + Math.random() * 2) {
          sim.stareT = 0; (sim.ignore || (sim.ignore = {}))[tp.id] = g.t + 9;
          sim.state = 'wander'; sim.goal = null; sim.path = null; sim.blocked = null; sim.menace = Math.min(sim.menace, 0.5);
        }
      } else sim.stareT = 0;
    }
    // it is fastest where it can stand; corridors and tunnels slow it down
    const roomy = clamp((cellFlag(L, L.ceil, sim.x, sim.z) - 3) / 4, 0, 1);
    speed = sim.scream > 0.8 ? 0.6 : lerp(4.55, 5.7, roomy); mode = 'run';
  } else if (sim.state === 'investigate') {
    goal = sim.goal; speed = sim.hurry ? 3.6 : 2.0; mode = sim.hurry ? 'run' : 'walk';
    sim.timer -= dt;
    if (goal && dist2(sim.x, sim.z, goal.x, goal.z) < 1.0) {
      if (sim.searchLeft > 0) {
        // nothing here: a few steps further the way they were heading, and look again
        sim.searchLeft--; sim.goal = searchNear(g, sim.x, sim.z, sim.tv, open); sim.path = null; sim.hurry = 0; sim.timer = Math.max(sim.timer, 7);
        sim.pause = 0.8 + Math.random() * 1.2;
      } else { speed = 0; mode = 'idle'; if (sim.timer > 3) sim.timer = 3; }
    }
    if (sim.pause > 0 && sim.state === 'investigate') { sim.pause -= dt; speed = 0; mode = 'idle'; }
    if (sim.timer <= 0) { sim.state = 'wander'; sim.path = null; sim.hurry = 0; sim.goal = null; }
  } else if (sim.state === 'wander') {
    sim.wanderT -= dt;
    const arrived = sim.goal && dist2(sim.x, sim.z, sim.goal.x, sim.goal.z) < 1.1;
    if (arrived && !sim.arrived) {
      // where it was going: it stops, and listens. At a shelter door, or on a lurk, it waits a long time.
      sim.arrived = true;
      sim.pause = sim.roam === 'lurk' ? 8 + Math.random() * 7 : sim.roam === 'shelter' ? 5 + Math.random() * 6 : Math.random() < 0.5 ? 1.2 + Math.random() * 3 : 0;
    }
    if (!sim.goal || sim.wanderT <= 0 || (arrived && sim.pause <= 0)) { sim.goal = pickRoamGoal(g, living, open); sim.wanderT = 30; sim.path = null; sim.arrived = false; }
    if (sim.pause > 0) { sim.pause -= dt; mode = 'idle'; }
    else { goal = sim.goal; speed = sim.roam === 'hunt' ? 1.9 : sim.roam === 'retreat' ? 1.7 : 1.35; }
  } else if (sim.state === 'travel') {
    // walking the length of the station to get to where you went
    goal = sim.goal; speed = 2.15; mode = 'walk';
    sim.travelT += dt;
    if (!goal || dist2(sim.x, sim.z, goal.x, goal.z) < 2.5) { sim.state = 'wander'; sim.goal = null; sim.path = null; }
    else if (sim.travelT > 55 && living.every((p) => dist2(p.x, p.z, sim.x, sim.z) > 24)) {
      // locked out: it finds its own way through rather than stay behind
      sim.state = 'dormant'; sim.timer = 1.5; sim.spawnFor = -1; cr.mode = 'hidden'; return;
    }
  } else if (sim.state === 'eat') { mode = 'eat'; }
  else if (sim.state === 'leave') {
    goal = sim.goal; speed = 2.4;
    if (!goal || dist2(sim.x, sim.z, goal.x, goal.z) < 1.2) { sim.state = 'wander'; sim.path = null; }
  }
  if (goal && speed > 0 && sim.state !== 'reach') moveCreatureToward(g, goal, speed, dt, open);
  noteVisit(g);
  // never stuck: if it has been trying to get somewhere and has not moved, it finds another way, or another goal
  sim.stuckT = (sim.stuckT || 0) + dt;
  if (sim.stuckT > 2.5) {
    const moved = Math.hypot(sim.x - (sim.stuckX || 0), sim.z - (sim.stuckZ || 0));
    const trying = goal && speed > 0 && dist2(sim.x, sim.z, goal.x, goal.z) > 1.5 && sim.state !== 'reach' && sim.state !== 'eat';
    if (trying && moved < 0.35) {
      sim.path = null; sim.stuck = (sim.stuck || 0) + 1;
      if (sim.stuck >= 2 && (sim.state === 'wander' || sim.state === 'investigate' || sim.state === 'leave')) { sim.state = 'wander'; sim.goal = pickRoamGoal(g, living, open); sim.arrived = false; sim.stuck = 0; }
    } else sim.stuck = 0;
    sim.stuckT = 0; sim.stuckX = sim.x; sim.stuckZ = sim.z;
  }
  if (sim.state !== 'reach') {
    cr.mode = sim.state === 'eat' ? 'eat' : mode === 'run' ? 'run' : speed > 0 ? 'walk' : 'idle';
    const look = sim.state === 'chase' && sim.lastSeen ? sim.lastSeen : sim.state === 'eat' && sim.victim ? sim.victim : null;
    if (look) { cr.lx = r2(look.x); cr.ly = sim.state === 'eat' ? 0.1 : 1.5; cr.lz = r2(look.z); }
    else if (mode === 'idle') {
      // standing still it is not resting: the head turns slowly one way, then the other, tilting to listen
      const a = sim.yaw + Math.sin(g.t * 0.55) * 1.25 + Math.sin(g.t * 1.7) * 0.15;
      cr.lx = r2(sim.x + Math.sin(a) * 3); cr.ly = r2(1.2 + Math.sin(g.t * 0.43) * 0.45); cr.lz = r2(sim.z + Math.cos(a) * 3);
    } else { cr.lx = r2(sim.x + Math.sin(sim.yaw) * 3); cr.ly = 1.3; cr.lz = r2(sim.z + Math.cos(sim.yaw) * 3); }
  }
  cr.x = r2(sim.x); cr.z = r2(sim.z); cr.yaw = r2(sim.yaw); cr.st = sim.state === 'chase' ? 1 : 0;
}

// ---------- roaming ----------
// It is never just wandering. It follows the trail the team leaves - close behind when it is hungry, a long way
// back when it has just fed - looks in on the shelters, works through the rooms it has not been in lately,
// and sometimes simply stops somewhere and waits.
const VISIT_CELL = 4;
function noteScent(g, living, dt) {
  const sim = Game.sim, sc = sim.scent || (sim.scent = []), last = sim.scentLast || (sim.scentLast = {});
  sim.scentT = (sim.scentT || 0) - dt;
  if (sim.scentT > 0) return;
  sim.scentT = 1;
  for (const p of living) {
    const l = last[p.id];
    if (l && Math.hypot(l.x - p.x, l.z - p.z) < 0.8) continue;
    last[p.id] = { x: p.x, z: p.z };
    sc.push({ x: p.x, z: p.z, t: g.t, safe: safeAt(Game.L, p.x, p.z) });
  }
  while (sc.length > 160) sc.shift();
}
function noteVisit(g) {
  const sim = Game.sim;
  (sim.visited || (sim.visited = {}))[Math.floor(sim.x / VISIT_CELL) + ',' + Math.floor(sim.z / VISIT_CELL)] = g.t;
}
function lastVisit(sim, x, z) { const v = sim.visited && sim.visited[Math.floor(x / VISIT_CELL) + ',' + Math.floor(z / VISIT_CELL)]; return v === undefined ? -1e9 : v; }
// the velocity of whatever it is chasing, smoothed - for guessing where they went
function trackTarget(sim, p, dt) {
  const tv = sim.tv || (sim.tv = { x: 0, z: 0 });
  if (sim.tp && sim.tp.id === p.id && dt > 0) {
    const k = 1 - Math.exp(-dt * 3);
    tv.x += ((p.x - sim.tp.x) / dt - tv.x) * k; tv.z += ((p.z - sim.tp.z) / dt - tv.z) * k;
  }
  sim.tp = { id: p.id, x: p.x, z: p.z };
}
function walkPoint(L, x, z, open) { return walkableCell(L, Math.floor(x), Math.floor(z), true, open) ? { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5 } : null; }
// where they probably are now: on from where it lost them, the way they were going, as far as the floor allows
function predictFrom(g, from, tv, open) {
  const L = Game.L, sp = Math.hypot(tv ? tv.x : 0, tv ? tv.z : 0);
  if (!from) return null;
  if (sp < 0.3) return from;
  const dx = tv.x / sp, dz = tv.z / sp;
  let best = from;
  for (let d = 0.5; d <= Math.min(7, sp * 2.5); d += 0.5) {
    const q = walkPoint(L, from.x + dx * d, from.z + dz * d, open);
    if (!q || !lineWalkable(L, from.x, from.z, q.x, q.z, open)) break;
    best = q;
  }
  return best;
}
function searchNear(g, x, z, tv, open) {
  const L = Game.L, sp = Math.hypot(tv ? tv.x : 0, tv ? tv.z : 0);
  const base = sp > 0.3 ? Math.atan2(tv.x, tv.z) : Math.random() * Math.PI * 2;
  for (let i = 0; i < 24; i++) {
    const a = base + (Math.random() - 0.5) * (i < 12 ? 2.4 : 6.2), d = 3 + Math.random() * 4;
    const q = walkPoint(L, x + Math.sin(a) * d, z + Math.cos(a) * d, open);
    if (q && lineWalkable(L, x, z, q.x, q.z, open)) return q;
  }
  return { x, z };
}
function pickRoamGoal(g, living, open) {
  const sim = Game.sim, L = Game.L, area = L.areas[Math.min(g.ca, L.areas.length - 1)], m = sim.menace;
  const rnd = () => walkPoint(L, area.offX + 1 + Math.random() * (area.w - 2), area.offZ + 1 + Math.random() * (area.h - 2), open);
  const nearest = (x, z) => { let d = 1e9; for (const p of living) d = Math.min(d, Math.hypot(p.x - x, p.z - z)); return d; };
  const inArea = (q) => q.x >= area.offX && q.x < area.offX + area.w && q.z >= area.offZ && q.z < area.offZ + area.h;
  const trail = (sim.scent || []).filter((q) => !q.safe && inArea(q));
  // just fed, or just shut out: somewhere well away from all of them
  if (m < 0.35 && living.length) {
    let best = null, bd = -1;
    for (let i = 0; i < 30; i++) { const q = rnd(); if (!q) continue; const d = nearest(q.x, q.z); if (d > bd) { bd = d; best = q; } }
    if (best) { sim.roam = 'retreat'; return best; }
  }
  // hungry: on the freshest trail, closing in
  if (m > 0.72 && trail.length) {
    for (let i = trail.length - 1; i >= 0; i--) {
      if (g.t - trail[i].t < 3) continue;
      const q = walkPoint(L, trail[i].x, trail[i].z, open);
      if (q) { sim.roam = 'hunt'; return q; }
    }
  }
  const r = Math.random();
  // the shelters: it knows that is where they hide
  if (r < 0.2) {
    const ss = L.safes.filter((q) => q.area === g.ca && !(sim.cool[q.id] > g.t));
    if (ss.length) { const s = ss[Math.floor(Math.random() * ss.length)]; const q = walkPoint(L, s.outside.x, s.outside.z, open); if (q) { sim.roam = 'shelter'; return q; } }
  }
  // their trail, from a little while ago
  if (r < 0.6 && trail.length) {
    const old = trail.filter((q) => g.t - q.t > 12 && g.t - q.t < 75);
    if (old.length) { const t2 = old[Math.floor(Math.random() * old.length)]; const q = walkPoint(L, t2.x, t2.z, open); if (q) { sim.roam = Math.random() < 0.25 ? 'lurk' : 'trail'; return q; } }
  }
  // somewhere it has not been for a while - not too close to them, not too far
  let best = null, bs = -1e9;
  for (let i = 0; i < 24; i++) {
    const q = rnd(); if (!q) continue;
    const since = Math.min(g.t - lastVisit(sim, q.x, q.z), 150), d = Math.hypot(q.x - sim.x, q.z - sim.z);
    const sc = since - d * 0.7 - (living.length ? Math.abs(nearest(q.x, q.z) - lerp(20, 9, m)) * 0.8 : 0);
    if (sc > bs) { bs = sc; best = q; }
  }
  sim.roam = Math.random() < 0.15 ? 'lurk' : 'explore';
  return best || { x: sim.x, z: sim.z };
}

function pickWanderPoint(g, living) {
  const L = Game.L;
  const area = L.areas[Math.min(g.ca, L.areas.length - 1)];
  const near = living.length ? living[Math.floor(Math.random() * living.length)] : null;
  for (let i = 0; i < 40; i++) {
    let x, z;
    if (near && Math.random() < 0.55) { x = near.x + (Math.random() - 0.5) * 16; z = near.z + (Math.random() - 0.5) * 16; }
    else { x = area.offX + 1 + Math.random() * (area.w - 2); z = area.offZ + 1 + Math.random() * (area.h - 2); }
    if (walkableCell(L, Math.floor(x), Math.floor(z), true, openLocksOf(g))) return { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5 };
  }
  return { x: Game.sim.x, z: Game.sim.z };
}

function moveCreatureToward(g, goal, speed, dt, open) {
  const sim = Game.sim, L = Game.L;
  // Somehow standing somewhere it should not be (a door shut on it, a doorway it cannot use): it gets itself
  // out to the nearest floor it can stand on before anything else, rather than freezing there.
  if (!walkableCell(L, Math.floor(sim.x), Math.floor(sim.z), true, open)) {
    const gx = Math.floor(sim.x), gz = Math.floor(sim.z);
    let best = null, bd = 1e9;
    for (let r = 1; r <= 3 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (!walkableCell(L, gx + dx, gz + dz, true, open)) continue;
      const cx = gx + dx + 0.5, cz = gz + dz + 0.5, d = Math.hypot(cx - sim.x, cz - sim.z);
      if (d < bd) { bd = d; best = { x: cx, z: cz }; }
    }
    if (best) { const k = Math.min(1, speed * dt / Math.max(bd, 1e-3)); sim.x += (best.x - sim.x) * k; sim.z += (best.z - sim.z) * k; sim.path = null; return; }
  }
  sim.pathT -= dt;
  if (!sim.path || sim.pathT <= 0 || (sim.pathGoal && dist2(sim.pathGoal.x, sim.pathGoal.z, goal.x, goal.z) > 1.5)) {
    sim.pathT = sim.state === 'chase' ? 0.3 : 1.2;
    sim.pathGoal = { x: goal.x, z: goal.z };
    sim.blocked = null;
    if (lineWalkable(L, sim.x, sim.z, goal.x, goal.z, open)) sim.path = [{ x: goal.x, z: goal.z }];
    else {
      sim.path = findPath(L, sim.x, sim.z, goal.x, goal.z, open, 4000);
      if (!sim.path) {
        // somewhere it cannot go - a crawlway, a gap too small for it: as close as it can get instead
        const gx = Math.floor(goal.x), gz = Math.floor(goal.z);
        let best = null, bd = 1e9;
        for (let r = 1; r <= 4 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !walkableCell(L, gx + dx, gz + dz, true, open)) continue;
          const d = Math.hypot(dx, dz);
          if (d < bd) { bd = d; best = { x: gx + dx + 0.5, z: gz + dz + 0.5 }; }
        }
        sim.path = best ? findPath(L, sim.x, sim.z, best.x, best.z, open, 2500) || [] : [];
        sim.blocked = best || { x: sim.x, z: sim.z };
      }
    }
  }
  let wp = sim.path[0];
  while (wp && dist2(sim.x, sim.z, wp.x, wp.z) < 0.35) { sim.path.shift(); wp = sim.path[0]; }
  if (!wp) return;
  const dx = wp.x - sim.x, dz = wp.z - sim.z, d = Math.hypot(dx, dz);
  const ceil = cellFlag(L, L.ceil, sim.x, sim.z);
  const sp = speed * (ceil < 2.8 ? 0.85 : 1);
  const step = Math.min(d, sp * dt);
  moveWithCollision(L, sim, (dx / d) * step, (dz / d) * step, CREATURE_R, true, open);
  sim.yaw = dampAngle(sim.yaw, Math.atan2(dx, dz), 8, dt);
}

// =============== the hand in the room ===============
// It cannot see in. It never aims at anyone it has not heard. But it listens - to footsteps, to someone
// running, to anyone talking - and every strike goes after the loudest thing in the room, as precisely as
// that thing was loud. Someone crouched, still and silent is found only by being where it happens to land.
// It remembers where it has already felt, and works the room rather than hitting the same place twice.
// When it lands close to someone without touching them it stops dead and listens; a sound in that
// silence is the most dangerous thing a player can make.

// the nearest two points on two segments - the hand with its fingers, and a person standing - so a hit is
// decided by the shapes you can actually see, not by a circle on the floor
function segSegDist(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
  const ux = bx - ax, uy = by - ay, uz = bz - az, vx = dx - cx, vy = dy - cy, vz = dz - cz, wx = ax - cx, wy = ay - cy, wz = az - cz;
  const a = ux * ux + uy * uy + uz * uz, b = ux * vx + uy * vy + uz * vz, c = vx * vx + vy * vy + vz * vz;
  const d = ux * wx + uy * wy + uz * wz, e = vx * wx + vy * wy + vz * wz, D = a * c - b * b;
  let sN, sD = D, tN, tD = D;
  if (D < 1e-9) { sN = 0; sD = 1; tN = e; tD = c; }
  else { sN = b * e - c * d; tN = a * e - b * d; if (sN < 0) { sN = 0; tN = e; tD = c; } else if (sN > sD) { sN = sD; tN = e + b; tD = c; } }
  if (tN < 0) { tN = 0; sN = -d > a ? sD : (-d < 0 ? 0 : -d); sD = -d > a || -d < 0 ? sD : a; }
  else if (tN > tD) { tN = tD; const q = -d + b; sN = q < 0 ? 0 : (q > a ? sD : q); sD = q < 0 || q > a ? sD : a; }
  const sc = Math.abs(sN) < 1e-9 ? 0 : sN / sD, tc = Math.abs(tN) < 1e-9 ? 0 : tN / tD;
  const px = wx + sc * ux - tc * vx, py = wy + sc * uy - tc * vy, pz = wz + sc * uz - tc * vz;
  return Math.sqrt(px * px + py * py + pz * pz);
}
const HAND_R = 0.24, FINGERS = 0.95, BODY_R = 0.3;
// does the hand - palm at (hx,hy,hz), fingers out along (fx,fz), swept from (ox,oy,oz) - touch p?
function handTouches(p, ox, oy, oz, hx, hy, hz, fx, fz) {
  const top = p.cro ? 1.15 : 1.75;
  const reach = HAND_R + BODY_R;
  if (segSegDist(ox, oy, oz, hx, hy, hz, p.x, BODY_R, p.z, p.x, top - BODY_R, p.z) < reach) return true;
  return segSegDist(hx, hy, hz, hx + fx * FINGERS, hy, hz + fz * FINGERS, p.x, BODY_R, p.z, p.x, top - BODY_R, p.z) < reach;
}
// ---- one strike ----
// A strike is a plan: lift away from wherever the hand is now, up and over (or, for the ceiling, down and
// under), then accelerate into the target and stay there, feeling, the fingers dragging a little across it.
// The plan is a handful of numbers in the shared state and every machine evaluates it for itself against its
// own clock - so the hand moves smoothly for everyone, not in jumps at the network rate, and it is exactly
// where the host is testing it for a catch.
// pr = [from xyz, apex xyz, target xyz, t0, lift, strike, hold, drag xyz, surface]
// surface: 0 the air, 1 a wall, 2 the floor, 3 the ceiling
const RS_AIR = 0, RS_WALL = 1, RS_FLOOR = 2, RS_CEIL = 3;
function reachHandAt(L, gap, pr, t, out) {
  const T = t - pr[9], dA = pr[10], dB = pr[11];
  let x, y, z;
  if (T < dA) {
    // the lift: straight up off whatever it was touching, then over at height - it does not drag itself
    // across the room at head height between blows
    const k = clamp(T / dA, 0, 1), ky = 1 - Math.pow(1 - k, 3), kx = smoothstep(0.22, 1, k);
    x = lerp(pr[0], pr[3], kx); y = lerp(pr[1], pr[4], ky); z = lerp(pr[2], pr[5], kx);
    out.ph = 0;
  } else if (T < dA + dB) {
    // the blow, accelerating all the way in. Into a wall it arrives sideways; into the floor or the ceiling
    // it arrives straight on - the part of the motion that meets the surface comes last and fastest
    const k = clamp((T - dA) / dB, 0, 1), s = pr[16];
    const kIn = Math.pow(k, 1.6), kEarly = 1 - Math.pow(1 - k, 2);
    const kx = s === RS_WALL ? kIn : s === RS_AIR ? Math.pow(k, 1.3) : kEarly;
    const ky = s === RS_WALL ? kEarly : s === RS_AIR ? Math.pow(k, 1.3) : kIn;
    x = lerp(pr[3], pr[6], kx); y = lerp(pr[4], pr[7], ky); z = lerp(pr[5], pr[8], kx);
    out.ph = 1;
  } else {
    // on the surface: pressed flat, feeling, the fingers dragging slowly across it
    const k = smooth01((T - dA - dB) / Math.max(pr[12], 0.01));
    x = pr[6] + pr[13] * k; y = pr[7] + pr[14] * k; z = pr[8] + pr[15] * k;
    out.ph = 2;
  }
  const c = clampToRoom(L, gap, x, z);
  out.x = c.x; out.y = Math.max(0.06, y); out.z = c.z;
  out.end = pr[9] + dA + dB + pr[12];
  return out;
}
// the hand held exactly where it is, for as long as it takes
function stillPlan(g, x, y, z, s) { return [x, y, z, x, y, z, x, y, z, r2(g.t), 0.01, 0.01, 99, 0, 0, 0, s]; }

// how loud someone is to a hand in the dark: their feet, and their voice
function loudness(p) {
  const feet = p.mv > 0.3 ? (p.run ? 1 : p.cro ? 0.06 : 0.42) : 0;
  return feet + (p.vl || 0) * 1.7;
}
// Where the hand goes next. It cannot see in. It never aims at anyone it has not heard - and when it has
// heard someone, it aims as precisely as they were loud. Someone crouched, still and silent is found only
// by being where it happens to land. It remembers where it has already felt, roughly, and works the room.
function pickProbe(g, s, gap, inside, fast) {
  const sim = Game.sim, L = Game.L, cr = g.cr, reach = REACH_MAX, base = Math.atan2(s.dir.x, s.dir.z), piv = reachPivot(s);
  const mem = sim.reachMem || (sim.reachMem = []);
  let tgt = null, heardY = null;
  if (sim.aimAt) {
    // it heard exactly where you are
    tgt = { x: sim.aimAt.x + (Math.random() - 0.5) * 0.5, z: sim.aimAt.z + (Math.random() - 0.5) * 0.5 };
    heardY = sim.aimAt.cro ? 0.5 : 0.75 + Math.random() * 0.5; sim.aimAt = null; fast = true;
  } else if (sim.frenzy > 0 && sim.frenzyAt) {
    // a flurry around wherever it felt something - not where anyone is: it does not know that
    tgt = { x: sim.frenzyAt.x + (Math.random() - 0.5) * 1.9, z: sim.frenzyAt.z + (Math.random() - 0.5) * 1.9 };
    sim.frenzy--; fast = true;
  } else {
    let who = null, lv = 0;
    for (const p of inside) { const v = loudness(p); if (v > lv) { lv = v; who = p; } }
    if (who && lv > 0.12 && Math.random() < clamp(0.3 + lv * 0.6, 0, 0.95)) {
      // the quieter the sound, the wider of the mark it lands
      const err = lerp(1.8, 0.25, clamp(lv, 0, 1));
      tgt = { x: who.x + (Math.random() - 0.5) * 2 * err, z: who.z + (Math.random() - 0.5) * 2 * err };
      heardY = who.cro ? 0.5 : 0.6 + Math.random() * 0.8;
      fast = fast || lv > 0.6;
    }
  }
  let ang, want;
  if (tgt) { ang = Math.atan2(tgt.x - piv.x, tgt.z - piv.z); want = Math.min(reach, Math.hypot(tgt.x - piv.x, tgt.z - piv.z) + 0.3); }
  else {
    // nothing to go on: somewhere in its reach it has not felt lately
    let best = -1;
    for (let k = 0; k < 7; k++) {
      const a = base + (Math.random() - 0.5) * 2.8, w = (0.3 + Math.random() * 0.7) * reach;
      const pt = rayFromGap(L, piv, a, w);
      // somewhere worth hitting: not the door frame it came in through
      let near = Math.min(9, pt.far * 2.2 - 1.2);
      for (const m of mem) near = Math.min(near, Math.hypot(m.x - pt.x, m.z - pt.z));
      if (near > best) { best = near; ang = a; want = w; }
    }
  }
  const pt = rayFromGap(L, piv, ang, want);
  mem.push({ x: pt.x, z: pt.z }); if (mem.length > 10) mem.shift();
  // in a room that opens out overhead the ceiling can be far out of reach; the arm is still an arm, coming
  // in through a doorway, so it works the height a person occupies and a little over
  const ceil = clamp(ceilAt(L, pt.x, pt.z), 2.2, 3.4);
  const pick = Math.random();
  let y, surf;
  if (heardY !== null) { y = heardY; surf = pt.wall ? RS_WALL : RS_AIR; }
  else if (pt.wall && pick < 0.45) { y = 0.55 + Math.random() * Math.max(0.5, ceil - 1.1); surf = RS_WALL; }
  else if (pick < (pt.wall ? 0.75 : 0.56)) { y = 0.1 + Math.random() * 0.22; surf = RS_FLOOR; }
  else { y = ceil - 0.08 - Math.random() * 0.1; surf = RS_CEIL; }
  y = Math.max(0.08, y);
  if (surf === RS_AIR && pt.wall) surf = RS_WALL;
  // from wherever the hand already is - the very first from the gap itself
  const fx = sim.probe ? cr.lx : gap.x, fy = sim.probe ? cr.ly : 1.0, fz = sim.probe ? cr.lz : gap.z;
  // the top (or bottom) of the swing: high between blows, so it comes down onto the floor and in at the
  // walls; low under the ceiling, so it comes up into it. A crouched body stays under the swing.
  const ceilMid = clamp(ceilAt(L, (fx + pt.x) / 2, (fz + pt.z) / 2), 2.2, 3.4);
  let ay = surf === RS_CEIL ? Math.max(2.0, Math.min(fy, y) - 0.75) : Math.min(ceilMid - 0.32, Math.max(2.05, y + 0.45));
  if (fast) ay = Math.max(Math.min(ay, 1.9), lerp(ay, (fy + y) / 2, 0.45));
  // most of the way over at that height, then down (or in, or up) onto the target
  const ov = fast ? 0.55 : 0.68, ax = lerp(fx, pt.x, ov), az = lerp(fz, pt.z, ov);
  const lift = fast ? 0.11 + Math.random() * 0.05 : 0.2 + Math.random() * 0.13;
  const strike = fast ? 0.12 + Math.random() * 0.03 : 0.17 + Math.random() * 0.05;
  const hold = fast ? 0.06 + Math.random() * 0.06 : 0.42 + Math.random() * 0.45;
  // what the fingers do once it is there: drag back toward it along the floor, slide down the wall, feel
  // across the ceiling
  let dx = 0, dy = 0, dz = 0;
  if (surf === RS_WALL) dy = -(0.12 + Math.random() * 0.3) * Math.min(1, y);
  else if (surf === RS_FLOOR || surf === RS_CEIL) { const back = Math.atan2(piv.x - pt.x, piv.z - pt.z) + (Math.random() - 0.5) * 1.6, m = 0.08 + Math.random() * 0.22; dx = Math.sin(back) * m; dz = Math.cos(back) * m; }
  const pr = [fx, fy, fz, ax, ay, az, pt.x, y, pt.z, g.t, lift, strike, hold, dx, dy, dz, surf].map(r2);
  sim.probe = { pr, wall: pt.wall, surf, done: false };
  cr.pr = pr;
}
// Its first moves at a door are always the same. It slams the frame - the whole doorway shakes - then the
// floor just inside, hard enough to bring the dust down, and then it waits, listening, its hand flat on the
// floor. Anyone who was talking has a second and a half to stop.
function planArrival(g, s, gap, step) {
  const sim = Game.sim, cr = g.cr, lx = s.dir.z, lz = -s.dir.x;
  let pr;
  if (step === 2) {
    const tx = s.door.x + lx * 0.47, tz = s.door.z + lz * 0.47, ty = 1.3 + Math.random() * 0.35;
    pr = [gap.x, 1.0, gap.z, gap.x - s.dir.x * 0.2 - lx * 0.1, 1.9, gap.z - s.dir.z * 0.2 - lz * 0.1, tx, ty, tz, g.t, 0.34, 0.15, 0.3, 0, -0.1, 0, RS_WALL];
    sim.probe = { pr: pr.map(r2), wall: true, surf: RS_WALL, done: false, noListen: true };
  } else {
    const piv = reachPivot(s), tx = piv.x + s.dir.x * 0.75 - lx * 0.15, tz = piv.z + s.dir.z * 0.75 - lz * 0.15;
    pr = [cr.lx, cr.ly, cr.lz, lerp(cr.lx, tx, 0.6), 2.0, lerp(cr.lz, tz, 0.6), tx, 0.12, tz, g.t, 0.3, 0.17, 0.2, 0, 0, 0, RS_FLOOR];
    sim.probe = { pr: pr.map(r2), wall: false, surf: RS_FLOOR, done: false, listenAfter: true };
  }
  cr.pr = sim.probe.pr;
}
function nextStrike(g, s, gap, inside) {
  const sim = Game.sim;
  if (sim.arrive > 0) { planArrival(g, s, gap, sim.arrive); sim.arrive--; }
  else pickProbe(g, s, gap, inside, false);
}
// The hitbox is the hand and its fingers, live the whole time it is in the room - mid-strike, resting,
// listening. A strike that visibly goes through someone has them; one that visibly misses has missed.
function reachCatch(g, s, gap, inside, ox, oy, oz) {
  const sim = Game.sim, cr = g.cr;
  let fx = cr.lx - gap.x, fz = cr.lz - gap.z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
  for (const p of inside) {
    if (!handTouches(p, ox, oy, oz, cr.lx, cr.ly, cr.lz, fx, fz)) continue;
    g.k[p.id] = Math.max(0.01, r2(g.t)); g.kc = (g.kc || 0) + 1; dropItems(g, p);
    hostEvent(g, 'grab', { who: p.id, x: r2(p.x), z: r2(p.z), reach: 1, s: s.id, hx: cr.lx, hy: cr.ly, hz: cr.lz });
    startKill(g, p, s, { x: cr.lx, z: cr.lz });
    sim.cool[s.id] = g.t + 25; sim.probe = null; cr.pr = null; sim.frenzy = 0; sim.listenT = 0; sim.aimAt = null;
    return true;
  }
  return false;
}
// a point in the room the arm can actually get to: along the ray from the gap, stopped by the first wall
function rayFromGap(L, gap, ang, want) {
  const dx = Math.sin(ang), dz = Math.cos(ang);
  let far = want, wall = false;
  for (let q = 0.05; q <= want; q += 0.08) {
    if (!openAt(L, gap.x + dx * q, gap.z + dz * q)) { far = Math.max(0.05, q - 0.2); wall = true; break; }
  }
  return { x: gap.x + dx * far, z: gap.z + dz * far, wall, far };
}
// The hand is on the end of an arm that pivots at the doorway, so it can only ever be somewhere on the
// ray from the gap - and only as far along it as the first wall. Clamping every frame, not just at the
// ends of a sweep, is what stops it cutting a corner through masonry on its way between two open spots.
function clampToRoom(L, gap, x, z) {
  let dx = x - gap.x, dz = z - gap.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return { x, z };
  dx /= len; dz /= len;
  let far = len;
  for (let q = 0.04; q <= len; q += 0.08) {
    if (!openAt(L, gap.x + dx * q, gap.z + dz * q)) { far = Math.max(0, q - 0.18); break; }
  }
  // the march above can skip a sliver at a corner, so the answer is checked rather than trusted: back
  // down the ray until the point really is in open floor - all the way to the gap itself, which is in the
  // doorway and always open. This has to hold every frame, not most frames.
  for (let i = 0; i < 60 && far > 0; i++) {
    if (openAt(L, gap.x + dx * far, gap.z + dz * far)) break;
    far = Math.max(0, far - 0.05);
  }
  return { x: gap.x + dx * far, z: gap.z + dz * far };
}
const _rh = { x: 0, y: 0, z: 0, ph: 0, end: 0 };
const REACH_SECONDS = 12;
function reachTick(g, living, dt) {
  const sim = Game.sim, L = Game.L, cr = g.cr, s = sim.reachSafe;
  sim.reachT += dt;
  cr.mode = 'reach'; cr.rs = s.id;
  const tx = s.outside.x + s.dir.z * 0.25, tz = s.outside.z - s.dir.x * 0.25; sim.x += (tx - sim.x) * Math.min(1, dt * 4); sim.z += (tz - sim.z) * Math.min(1, dt * 4);
  sim.yaw = dampAngle(sim.yaw, Math.atan2(s.door.x - sim.x, s.door.z - sim.z), 6, dt);
  const inside = living.filter((p) => safeAt(L, p.x, p.z) === s.id);
  sim.ext = Math.min(REACH_MAX, sim.ext + dt * 7);
  const gap = reachGap(s);
  if (sim.reachT < dt * 1.5) { sim.reachMem = []; sim.frenzy = 0; sim.listenT = 0; sim.aimAt = null; sim.probe = null; cr.pr = null; sim.reactT = 0; sim.arrive = 2; }
  // where the hand is this instant, from the plan - the same answer every machine is drawing
  const ox = cr.lx, oy = cr.ly, oz = cr.lz;
  if (!sim.probe) nextStrike(g, s, gap, inside);
  let pr = sim.probe;
  reachHandAt(L, reachPivot(s), pr.pr, g.t, _rh);
  cr.lx = r2(_rh.x); cr.ly = r2(_rh.y); cr.lz = r2(_rh.z);
  // the hitbox is live the whole way along, not just where it lands
  if (reachCatch(g, s, gap, inside, ox, oy, oz)) return;
  let who = null, lv = 0;
  for (const p of inside) { const v = loudness(p); if (v > lv) { lv = v; who = p; } }
  if (sim.listenT > 0) {
    // ---- frozen, listening ----
    // Anyone who makes a sound now is heard almost to the inch, and the next strike comes for them, fast.
    sim.listenT -= dt;
    if (who && lv > 0.1) {
      sim.listenT = 0; sim.frenzy = 1; sim.frenzyAt = { x: who.x, z: who.z }; sim.aimAt = { x: who.x, z: who.z, cro: who.cro }; sim.arrive = 0;
      hostEvent(g, 'heard', { x: r2(who.x), z: r2(who.z), s: s.id, who: who.id });
      pickProbe(g, s, gap, inside, true);
    } else if (sim.listenT <= 0) {
      // Nothing. It lets go of whatever it was touching and goes back to working the room - somewhere
      // else. Holding your breath is the one thing that is ever rewarded in here.
      nextStrike(g, s, gap, inside);
    }
  } else if (_rh.ph === 2 && !pr.done) {
    // ---- it has landed ----
    pr.done = true;
    const surf = pr.surf === RS_WALL ? 'w' : pr.surf === RS_FLOOR ? 'f' : pr.surf === RS_CEIL ? 'c' : 'a';
    hostEvent(g, 'probe', { x: cr.lx, y: cr.ly, z: cr.lz, w: pr.wall ? 1 : 0, f: surf, s: s.id });
    // landed close to someone without touching them: it felt something - the air move, a breath. Or it
    // just stops, sometimes, for no reason anyone can see. It stops dead, and listens.
    let near = false;
    for (const p of inside) if (Math.hypot(p.x - cr.lx, p.z - cr.lz) < 1.2) near = true;
    if (pr.listenAfter || (!pr.noListen && !sim.frenzy && (near || Math.random() < 0.1))) {
      sim.listenT = pr.listenAfter ? 1.2 + Math.random() * 0.5 : near ? 0.9 + Math.random() * 0.8 : 0.6 + Math.random() * 0.4;
      pr = sim.probe = { pr: stillPlan(g, cr.lx, cr.ly, cr.lz, pr.surf), wall: pr.wall, surf: pr.surf, done: true };
      cr.pr = pr.pr;
      hostEvent(g, 'listen', { x: cr.lx, y: cr.ly, z: cr.lz, s: s.id, d: r2(sim.listenT) });
    }
  } else if (_rh.ph === 2 && g.t >= _rh.end) {
    nextStrike(g, s, gap, inside);
  } else if (_rh.ph === 2 && who && lv > 0.55 && g.t > sim.reactT) {
    // a loud sound while it is resting on something: it does not finish feeling, it goes for it
    sim.reactT = g.t + 0.6; sim.arrive = 0;
    pickProbe(g, s, gap, inside, true);
  }
  if (sim.reachT > REACH_SECONDS || !inside.length) {
    sim.cool[s.id] = g.t + 22;
    sim.path = null; sim.probe = null; cr.pr = null; sim.listenT = 0; sim.frenzy = 0; sim.aimAt = null; sim.menace = 0.3;
    // Shut out. Sometimes it goes. Sometimes it only seems to: it waits round the corner, out of sight of
    // the door, for whoever comes out first.
    const open = openLocksOf(g), watch = { x: s.door.x + s.dir.x * 1.5, z: s.door.z + s.dir.z * 1.5 };
    let lurk = null;
    if (Math.random() < 0.5) for (let i = 0; i < 30 && !lurk; i++) {
      const a = Math.random() * Math.PI * 2, d = 3.5 + Math.random() * 4;
      const q = walkPoint(L, s.outside.x + Math.sin(a) * d, s.outside.z + Math.cos(a) * d, open);
      if (q && !lineOfSight(L, watch.x, watch.z, q.x, q.z, open) && findPath(L, sim.x, sim.z, q.x, q.z, open, 600)) lurk = q;
    }
    if (lurk) { sim.state = 'wander'; sim.goal = lurk; sim.roam = 'lurk'; sim.arrived = false; sim.wanderT = 30; }
    else { sim.state = 'leave'; sim.goal = pickWanderPoint(g, []); }
    hostEvent(g, 'withdraw', { x: r2(sim.x), z: r2(sim.z), s: s.id });
  }
}

// Once it has someone: where it will do it. It stays where it is and picks the way with the most room to swing
// a body - and, if it took them out of a shelter, a way the ones still inside can see. Then it decides how
// high this place lets it lift someone, and the way it will drag them: out of the room through the door,
// never through the wall beside it.
function startKill(g, p, s, hand) {
  const sim = Game.sim, L = Game.L, open = openLocksOf(g);
  const watch = s ? { x: s.door.x + s.dir.x * 1.8, z: s.door.z + s.dir.z * 1.8 } : null;
  let best = { dx: Math.sin(sim.yaw), dz: Math.cos(sim.yaw) }, bs = -1e9;
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
    let free = 0;
    for (; free < 3.3; free += 0.1) {
      const x = sim.x + dx * free, z = sim.z + dz * free;
      if (!openAt(L, x, z) || !openAt(L, x - dz * 0.32, z + dx * 0.32) || !openAt(L, x + dz * 0.32, z - dx * 0.32)) break;
    }
    const sx = sim.x + dx * 1.3, sz = sim.z + dz * 1.3;
    let sc = Math.min(free, 3.1) * 3 + clamp(ceilAt(L, sx, sz), 2, 4.6) * 0.6;
    if (s) {
      if (dx * s.dir.x + dz * s.dir.z > 0.35) sc -= 8;
      if (lineOfSight(L, watch.x, watch.z, sx, sz, open)) sc += 3;
    }
    if (sc > bs) { bs = sc; best = { dx, dz }; }
  }
  let c = 9;
  for (let q = 0.4; q <= 3.0; q += 0.25) c = Math.min(c, ceilAt(L, sim.x + best.dx * q, sim.z + best.dz * q));
  const h = clamp(c - 0.3, 0.9, 4.2);
  const path = [p.x, p.z], ga = { x: sim.x + best.dx * 1.3, z: sim.z + best.dz * 1.3 };
  // a straight stretch of floor with nothing in the way, for a body to be hauled along
  const floorClear = (ax, az, bx, bz) => { const d = Math.hypot(bx - ax, bz - az); for (let q = 0; q <= d; q += 0.1) if (!openAt(L, ax + (bx - ax) * q / d, az + (bz - az) * q / d)) return false; return true; };
  let lx = p.x, lz = p.z;
  if (s) {
    const piv = reachPivot(s), gp = reachGap(s);
    if (hand) path.push(hand.x, hand.z);
    path.push(piv.x, piv.z, gp.x, gp.z, s.door.x - s.dir.x * 0.6, s.door.z - s.dir.z * 0.6);
    lx = s.door.x - s.dir.x * 0.6; lz = s.door.z - s.dir.z * 0.6;
  }
  if (!floorClear(lx, lz, ga.x, ga.z)) {
    // round whatever is in the way: past its own feet if that is clear, otherwise the way it walks
    if (floorClear(lx, lz, sim.x, sim.z) && floorClear(sim.x, sim.z, ga.x, ga.z)) path.push(sim.x, sim.z);
    else { const fp = findPath(L, lx, lz, ga.x, ga.z, open, 1500); if (fp) for (const w of fp.slice(0, 12)) path.push(w.x, w.z); }
  }
  path.push(ga.x, ga.z);
  g.kl = { id: p.id, t: r2(g.t), cx: r2(sim.x), cz: r2(sim.z), dx: r2(best.dx), dz: r2(best.dz), h: r2(h), c: r2(c), p: path.map(r2), s: s ? s.id : 0 };
  sim.yaw = Math.atan2(best.dx, best.dz);
  sim.state = 'eat'; sim.eatT = KILL_SECONDS; sim.victim = { x: sim.x + best.dx * 1.3, z: sim.z + best.dz * 1.3, id: p.id };
}

function dropItems(g, p) {
  for (const id in g.it) if (g.it[id].o === p.id) g.it[id] = { p: [r2(p.x), r2(p.z)] };
}
