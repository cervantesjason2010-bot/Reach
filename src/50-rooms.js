// ================= rooms: public rooms, and the list of them =================
// A host can make their room public. Public rooms show in everyone's "Find a room" list with the room's name,
// its map, who is in it and whether the game has started; private ones are only for whoever has the code.
// Inside Claude the list is the lobby every open copy of the page shares: a public host's presence there
// carries its room. Everywhere else it goes through the matchmaking server (PeerJS's), which passes small
// messages between ids - it is how two players' browsers find each other before they connect. A public host
// holds one of a dozen well-known ids, a "slot", and answers "which room is this?"; the list asks every slot.
const ROOM_MAX = 4;               // players a room is for: a full one can't be joined from the list
const PUB_SLOTS = 12;             // how many public rooms the standalone list can hold at once
const PUB_SCAN_MS = 3500;         // how long the list waits for the slots to answer (a host answers in well under a second)
const PUB_RESCAN_MS = 6000;       // while the list is open, it asks again this often
const MAP_SHORT = { l1: 'Reach - B4', l2: 'Seize - B5', l3: 'Breach - A1', camp: 'Campaign' };
const Rooms = {
  // hosting: what this room says about itself, and (standalone) the slot it holds
  info: null, sent: 'null', bytes: 0, tickAt: 0, slotLine: null, slot: -1, claiming: false, claimAt: 0, full: false,
  // browsing
  open: false, list: [], scanning: false, looked: false, scanId: 0, scanAt: 0, scan: null, look: null, err: '', since: 0, unsub: null, drawn: '', msg: null,
};
const slotId = (i) => 'reach-jason-pub-' + i;
const randomToken = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);

// a room name: what someone typed, made safe to show anyone - no control or invisible characters, one line
function cleanTitle(v, fallback) {
  const s = typeof v === 'string' ? Array.from(v.replace(/\p{C}+/gu, '').replace(/\s+/g, ' ').trim()).slice(0, 24).join('').trim() : '';
  return s || fallback || '';
}
function defaultRoomTitle(name) { return cleanTitle(String(name || Settings.name || 'Player').slice(0, 14) + "'s room", 'A room'); }
function roomTitle() { return cleanTitle(Settings.roomName) || defaultRoomTitle(); }
function roomIsPublic() { return Net.mode !== 'solo' && Net.creator && !Net.lost && Settings.roomVis === 'public'; }
// what a public room tells the list
function myRoomInfo() {
  const peers = netPeers();
  return { c: Net.code, n: roomTitle(), m: MAP_SHORT[Settings.map] ? Settings.map : 'l1', p: Math.max(1, peers.length), s: Game.mode === 'lobby' ? 0 : 1,
    w: peers.slice(0, ROOM_MAX).map((p) => cleanTitle(String(p.s.n || '').slice(0, 14), 'Player')) };
}
// what someone else says their room is: anyone can say anything, so every field is checked
function readRoomInfo(r) {
  if (!r || typeof r !== 'object') return null;
  const c = typeof r.c === 'string' ? r.c.toUpperCase() : '';
  if (!/^[A-Z0-9]{5}$/.test(c)) return null;
  const w = Array.isArray(r.w) ? r.w.slice(0, ROOM_MAX).map((n) => cleanTitle(typeof n === 'string' ? n.slice(0, 14) : '', 'Player')) : [];
  return { c, n: cleanTitle(r.n, 'A room'), m: MAP_SHORT[r.m] ? r.m : 'l1', p: clamp(Math.round(+r.p) || 1, 1, 99), s: r.s ? 1 : 0, w };
}

// ---------- hosting: keep the room on the list while it is public ----------
// Every frame; does its work about once a second.
function roomsTick() {
  const now = performance.now();
  if (now - Rooms.tickAt < 1000) return;
  Rooms.tickAt = now;
  const want = roomIsPublic() ? myRoomInfo() : null;
  Rooms.info = want;
  if (IN_CLAUDE) {
    // inside Claude: a field of my presence in the lobby (where a shared lobby is the game's own room too,
    // the game leaves that field alone: see netPublish)
    if (!Net.lobby) return;
    const text = JSON.stringify(want);
    if (text === Rooms.sent) return;
    Rooms.sent = text; Rooms.bytes = want ? utf8Len(text) + 10 : 0;
    Net.lobby.presence({ pub: want }).catch(() => { Rooms.sent = ''; });
    return;
  }
  if (want && !Rooms.slotLine && !Rooms.claiming && now >= Rooms.claimAt) claimSlot();
  else if (!want && (Rooms.slotLine || Rooms.full)) dropSlot(0);
}
// the room has gone (left, or lost): off the list at once
function roomsLeft() {
  Rooms.info = null; Rooms.tickAt = 0;
  if (!IN_CLAUDE) dropSlot(0);
}

// standalone: a line to the matchmaking server under an id of our own, the way PeerJS itself talks to it.
// Resolves once the server has given us the id; rejects 'taken' if someone else holds it, 'server' if the
// server can't be reached. onMessage(msg, line) hears what others send to the id.
function serverLine(id, onMessage, onClose) {
  return new Promise((res, rej) => {
    const S = PEER_SERVER;
    const url = (S.secure ? 'wss://' : 'ws://') + S.host + ':' + S.port + S.path + 'peerjs?key=' + encodeURIComponent(S.key) + '&id=' + encodeURIComponent(id) + '&token=' + randomToken() + '&version=1.5.4';
    let ws = null, open = false, beat = 0;
    const line = {
      id, closed: false,
      send(m) { try { if (ws.readyState === 1) ws.send(JSON.stringify(m)); } catch (e) { /* closing */ } },
      close() { line.closed = true; clearInterval(beat); try { ws.close(); } catch (e) { /* closed */ } },
    };
    const fail = (code) => { if (open) return; clearTimeout(to); line.close(); rej(Object.assign(new Error(code), { code })); };
    const to = setTimeout(() => fail('server'), 10000);
    try { ws = new WebSocket(url); } catch (e) { fail('server'); return; }
    ws.onmessage = (e) => {
      let m = null;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      if (!m || typeof m !== 'object') return;
      if (!open) {
        if (m.type === 'OPEN') {
          open = true; clearTimeout(to);
          // the server drops an id it hasn't heard from in a while
          beat = setInterval(() => line.send({ type: 'HEARTBEAT' }), 5000);
          res(line);
        } else if (m.type === 'ID-TAKEN') fail('taken');
        else if (m.type === 'ERROR') fail('server');
        return;
      }
      onMessage(m, line);
    };
    ws.onerror = () => fail('server');
    ws.onclose = () => { clearInterval(beat); if (!open) { fail('server'); return; } if (!line.closed) { line.closed = true; if (onClose) onClose(line); } };
  });
}

// standalone: take the first free slot, starting from a random one so two hosts rarely want the same
async function claimSlot() {
  Rooms.claiming = true;
  try {
    const first = Math.floor(Math.random() * PUB_SLOTS);
    for (let k = 0; k < PUB_SLOTS; k++) {
      if (!Rooms.info) return;
      const i = (first + k) % PUB_SLOTS;
      let line;
      try { line = await serverLine(slotId(i), slotMessage, slotLost); }
      catch (e) {
        if (e && e.code === 'taken') continue;
        Rooms.claimAt = performance.now() + 20000;
        return;
      }
      if (!Rooms.info || Rooms.slotLine) { line.close(); return; }
      Rooms.slotLine = line; Rooms.slot = i; Rooms.full = false;
      return;
    }
    // every slot is someone's: still joinable with the code; try the list again in a while
    Rooms.full = true; Rooms.claimAt = performance.now() + 30000;
  } finally { Rooms.claiming = false; }
}
// someone looking at the list asks which room this is
function slotMessage(m, line) {
  if (m.type !== 'OFFER' || typeof m.src !== 'string' || !m.payload || m.payload.reach !== 'room?' || !Rooms.info) return;
  line.send({ type: 'ANSWER', dst: m.src, payload: { reach: 'room', q: String(m.payload.q || '').slice(0, 16), r: Rooms.info } });
}
// the server let go of the slot: take one again in a moment
function slotLost(line) {
  if (Rooms.slotLine !== line) return;
  Rooms.slotLine = null; Rooms.slot = -1; Rooms.claimAt = performance.now() + 3000;
}
function dropSlot(retryIn) {
  const line = Rooms.slotLine;
  Rooms.slotLine = null; Rooms.slot = -1; Rooms.full = false;
  Rooms.claimAt = performance.now() + retryIn;
  if (line) line.close();
}
// what the host sees about the list, under Private / Public
function roomListState() {
  if (Settings.roomVis !== 'public') return 'private';
  if (IN_CLAUDE) return Net.lobby ? 'listed' : 'off';
  return Rooms.slotLine ? 'listed' : Rooms.full ? 'full' : 'adding';
}

// ---------- browsing: the list ----------
function roomListOpen() {
  if (Rooms.open) return;
  Rooms.open = true; Rooms.err = ''; Rooms.looked = false; Rooms.since = performance.now(); Rooms.drawn = '';
  if (IN_CLAUDE) {
    if (!Net.lobby) return;
    Rooms.list = lobbyRooms();
    try { Rooms.unsub = Net.lobby.onPeers(() => { Rooms.list = lobbyRooms(); renderRoomList(); }, () => { Rooms.err = 'room'; renderRoomList(); }); }
    catch (e) { Rooms.err = 'room'; }
    // more of the lobby answers for a second or two: only then is an empty list really empty
    setTimeout(renderRoomList, 2600);
    return;
  }
  scanRooms();
}
function roomListClose() {
  if (!Rooms.open) return;
  Rooms.open = false; Rooms.scanId += 1; Rooms.scanning = false; Rooms.scan = null;
  if (Rooms.unsub) { try { Rooms.unsub(); } catch (e) { /* gone */ } Rooms.unsub = null; }
  const line = Rooms.look; Rooms.look = null;
  if (line) line.close();
}
function roomListRefresh() {
  if (!Rooms.open) return;
  Rooms.msg = null;
  if (IN_CLAUDE) { Rooms.list = lobbyRooms(); Rooms.since = performance.now(); setTimeout(renderRoomList, 1200); renderRoomList(); return; }
  scanRooms();
}
// inside Claude: the public rooms are whoever in the lobby says they host one
function lobbyRooms() {
  let list = [];
  try { list = Net.lobby.peers(); } catch (e) { return []; }
  const out = [], seen = new Set();
  for (const p of list) {
    if (p.kind === 'agent' || p.sameTab || !p.presence) continue;
    const r = readRoomInfo(p.presence.pub);
    if (r && !seen.has(r.c)) { seen.add(r.c); out.push(r); }
  }
  return out;
}
// standalone: one line to the server, kept while the list is open, asks every slot at once
async function lookLine() {
  if (Rooms.look && !Rooms.look.closed) return Rooms.look;
  const line = await serverLine('reach-jason-look-' + randomToken(), lookMessage, (l) => { if (Rooms.look === l) Rooms.look = null; });
  if (!Rooms.open) { line.close(); throw Object.assign(new Error('closed'), { code: 'closed' }); }
  Rooms.look = line;
  return line;
}
async function scanRooms() {
  if (Rooms.scanning || !Rooms.open) return;
  const id = ++Rooms.scanId;
  Rooms.scanning = true; renderRoomList();
  let line;
  try { line = await lookLine(); }
  catch (e) {
    if (id === Rooms.scanId) { Rooms.scanning = false; Rooms.looked = true; Rooms.err = 'server'; Rooms.scanAt = performance.now(); renderRoomList(); }
    return;
  }
  if (id !== Rooms.scanId) return;
  if (Rooms.err) { Rooms.err = ''; renderRoomList(); }
  const found = new Map(), q = randomToken().slice(0, 12);
  await new Promise((done) => {
    const waiting = new Set();
    let over = false;
    const finish = () => { if (over) return; over = true; clearTimeout(to); if (Rooms.scan && Rooms.scan.q === q) Rooms.scan = null; done(); };
    const to = setTimeout(finish, PUB_SCAN_MS);
    for (let i = 0; i < PUB_SLOTS; i++) waiting.add(i);
    Rooms.scan = { q, id, found, settle: (i) => { waiting.delete(i); if (!waiting.size) finish(); } };
    for (let i = 0; i < PUB_SLOTS; i++) line.send({ type: 'OFFER', dst: slotId(i), payload: { reach: 'room?', q } });
  });
  if (id !== Rooms.scanId) return;
  Rooms.list = [...found.values()];
  Rooms.scanning = false; Rooms.looked = true; Rooms.scanAt = performance.now();
  renderRoomList();
}
// a slot answers with its room (or the server says nobody holds it)
function lookMessage(m) {
  const sc = Rooms.scan;
  const src = typeof m.src === 'string' ? m.src : '';
  const i = /^reach-jason-pub-(\d{1,2})$/.test(src) ? +src.slice(16) : -1;
  if (!sc || i < 0 || i >= PUB_SLOTS) return;
  if (m.type === 'ANSWER' && m.payload && m.payload.reach === 'room' && m.payload.q === sc.q) {
    const r = readRoomInfo(m.payload.r);
    if (r && sc.id === Rooms.scanId) {
      sc.found.set(r.c, r);
      // straight onto the list, beside what the last look found
      Rooms.list = Rooms.list.filter((x) => x.c !== r.c).concat(r);
      renderRoomList();
    }
    sc.settle(i);
  } else if (m.type === 'EXPIRE' || m.type === 'LEAVE') sc.settle(i);
}
// while the list is open (standalone): ask again now and then, while anyone can see it
function roomListTick() {
  if (!Rooms.open || IN_CLAUDE || Rooms.scanning || document.hidden) return;
  if (performance.now() - Rooms.scanAt > PUB_RESCAN_MS) scanRooms();
}

function renderRoomList() {
  if (!Rooms.open) return;
  const now = performance.now();
  const rooms = Rooms.list.slice().sort((a, b) => ((a.p >= ROOM_MAX) - (b.p >= ROOM_MAX)) || (a.s - b.s) || (b.p - a.p) || a.n.localeCompare(b.n));
  const busy = !!Game.menuBusy;
  const key = JSON.stringify(rooms) + busy;
  if (key !== Rooms.drawn) {
    Rooms.drawn = key;
    const ul = $('rooms');
    ul.textContent = '';
    for (const r of rooms) {
      const full = r.p >= ROOM_MAX;
      const li = document.createElement('li');
      if (full) li.className = 'full';
      const nm = document.createElement('b'); nm.className = 'rn'; nm.textContent = r.n;
      const meta = document.createElement('span'); meta.className = 'rm';
      const st = document.createElement('i'); st.textContent = r.s ? 'Playing' : 'In the lobby'; if (r.s) st.className = 'on';
      meta.append(st, ' · ' + MAP_SHORT[r.m] + (r.w.length ? ' · ' + r.w.join(', ') : ''));
      const ct = document.createElement('span'); ct.className = 'rc'; ct.textContent = Math.min(r.p, 99) + '/' + ROOM_MAX;
      ct.setAttribute('aria-label', r.p + ' of ' + ROOM_MAX + ' players');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost'; b.dataset.code = r.c;
      b.textContent = full ? 'Full' : 'Join'; b.disabled = full || busy;
      b.setAttribute('aria-label', (full ? 'Full: ' : 'Join ') + r.n);
      li.append(nm, meta, ct, b);
      ul.appendChild(li);
    }
  }
  const n = rooms.length;
  let text, warn = false;
  if (Rooms.msg && now < Rooms.msg.until) { text = Rooms.msg.text; warn = Rooms.msg.warn; }
  else if (IN_CLAUDE && !Net.lobby) { text = joinFailReason('noroom'); warn = true; }
  else if (Rooms.err) {
    warn = true;
    text = Rooms.err === 'room' ? 'Lost the connection to the list. Reload the page to see rooms again.'
      : "Couldn't reach the game's server to look for rooms. Try again in a minute, or join with a code.";
  } else if (n) text = n + (n === 1 ? ' public room.' : ' public rooms.') + ' Pick one to join.';
  else if (IN_CLAUDE ? now - Rooms.since < 2500 : !Rooms.looked) text = 'Looking for rooms…';
  else text = 'No public rooms right now. Host one and make it public, or join a friend with their code.';
  const note = $('browse-note');
  if (note.textContent !== text) note.textContent = text;
  note.classList.toggle('warn', warn);
  $('btn-refresh').disabled = busy;
}
