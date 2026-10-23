// ================= rooms: public rooms, and the list of them =================
// A host can make their room public. Public rooms show in everyone's "Find a room" list with the room's name,
// its map, who is in it and whether the game has started; private ones are only for whoever has the code.
// Inside Claude the list is the lobby every open copy of the page shares: a public host's presence there
// carries its room. Everywhere else a public host also holds one of a dozen well-known PeerJS ids, a "slot";
// the list connects to every slot, the same way players connect to a room, and each host says what its room is.
const ROOM_MAX = 4;               // players a room is for: a full one can't be joined from the list
const PUB_SLOTS = 12;             // how many public rooms the standalone list can hold at once
const PUB_SCAN_MS = 9000;         // how long the list waits for the slots to answer (connecting takes a few seconds)
const PUB_RESCAN_MS = 15000;      // while the list is open, it looks again this long after the last look
const MAP_SHORT = { l1: 'Reach - B4', l2: 'Seize - B5', l3: 'Breach - A1', camp: 'Campaign' };
const Rooms = {
  // hosting: what this room says about itself, and (standalone) the slot it holds
  info: null, sent: 'null', bytes: 0, tickAt: 0, slotLine: null, slot: -1, claiming: false, claimAt: 0, full: false,
  // browsing
  open: false, list: [], scanning: false, looked: false, scanId: 0, scanAt: 0, scan: null, look: null, err: '', since: 0, unsub: null, drawn: '', msg: null,
};
const slotId = (i) => 'reach-jason-pub-' + i;

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

// standalone: take the first free slot - a PeerJS peer under that id - starting from a random one so two
// hosts rarely want the same. Anyone looking at the list connects to it, the same way a player joins a room,
// and is told about the room.
async function claimSlot() {
  Rooms.claiming = true;
  try {
    await loadPeerJs();
    const extra = await openRelayServer();
    const first = Math.floor(Math.random() * PUB_SLOTS);
    for (let k = 0; k < PUB_SLOTS; k++) {
      if (!Rooms.info) return;
      const got = await openSlot((first + k) % PUB_SLOTS, extra);
      if (got === 'taken') continue;
      if (got === 'fail') { Rooms.claimAt = performance.now() + 20000; return; }
      if (!Rooms.info || Rooms.slotLine) { try { got.peer.destroy(); } catch (e) { /* gone */ } return; }
      Rooms.slotLine = got.peer; Rooms.slot = got.i; Rooms.full = false;
      return;
    }
    // every slot is someone's: still joinable with the code; try the list again in a while
    Rooms.full = true; Rooms.claimAt = performance.now() + 30000;
  } catch (e) { Rooms.claimAt = performance.now() + 20000; }
  finally { Rooms.claiming = false; }
}
// resolves { peer, i } once the slot is ours, 'taken' if someone else holds it, 'fail' if the server can't be reached
function openSlot(i, extra) {
  return new Promise((res) => {
    let peer = null, over = false;
    const end = (v) => { if (over) return; over = true; clearTimeout(to); if (typeof v === 'string' && peer) { try { peer.destroy(); } catch (e) { /* gone */ } } res(v); };
    const to = setTimeout(() => end('fail'), 15000);
    try { peer = new window.Peer(slotId(i), peerOptions(extra)); } catch (e) { end('fail'); return; }
    peer.on('open', () => end({ peer, i }));
    peer.on('error', (err) => {
      const type = err && err.type;
      if (!over) { end(type === 'unavailable-id' ? 'taken' : 'fail'); return; }
      // it was ours and the server has let go of it: take a slot again in a moment
      if (Rooms.slotLine === peer && ['unavailable-id', 'network', 'server-error', 'socket-error', 'socket-closed'].includes(type)) dropSlot(5000);
    });
    // someone looking at the list: tell them about the room, then hang up
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        if (Rooms.info) { try { conn.send({ t: 'room', r: Rooms.info }); } catch (e) { /* they went */ } }
        setTimeout(() => { try { conn.close(); } catch (e) { /* closed */ } }, Rooms.info ? 5000 : 0);
      });
      conn.on('error', () => { /* they went */ });
    });
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => { try { if (!peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { /* next time */ } }, 1500); });
  });
}
function dropSlot(retryIn) {
  const p = Rooms.slotLine;
  Rooms.slotLine = null; Rooms.slot = -1; Rooms.full = false;
  Rooms.claimAt = performance.now() + retryIn;
  if (p) { try { p.destroy(); } catch (e) { /* gone */ } }
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
  const p = Rooms.look; Rooms.look = null;
  if (p) { try { p.destroy(); } catch (e) { /* gone */ } }
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
// standalone: one peer, kept while the list is open, connects to every slot at once; the empty ones the
// server reports after a few seconds
async function lookPeer() {
  if (Rooms.look && !Rooms.look.destroyed && Rooms.look.open) return Rooms.look;
  if (Rooms.look) { try { Rooms.look.destroy(); } catch (e) { /* gone */ } Rooms.look = null; }
  await loadPeerJs();
  const extra = await openRelayServer();
  return new Promise((res, rej) => {
    let peer;
    const fail = (code) => rej(Object.assign(new Error(code), { code }));
    try { peer = new window.Peer(peerOptions(extra)); } catch (e) { fail('server'); return; }
    if (!Rooms.open) { try { peer.destroy(); } catch (e) { /* gone */ } fail('closed'); return; }
    Rooms.look = peer;
    const to = setTimeout(() => fail('server'), 15000);
    peer.on('open', () => { clearTimeout(to); res(peer); });
    peer.on('error', (err) => {
      if (err && err.type === 'peer-unavailable') { const m = /reach-jason-pub-(\d+)/.exec(String(err.message || '')); if (m && Rooms.scan) Rooms.scan.settle(+m[1]); return; }
      if (!peer.open) { clearTimeout(to); fail('server'); }
    });
  });
}
async function scanRooms() {
  if (Rooms.scanning || !Rooms.open) return;
  const id = ++Rooms.scanId;
  Rooms.scanning = true; renderRoomList();
  let peer;
  try { peer = await lookPeer(); }
  catch (e) {
    if (id === Rooms.scanId) { Rooms.scanning = false; Rooms.looked = true; Rooms.err = e && e.code === 'closed' ? '' : 'server'; Rooms.scanAt = performance.now(); renderRoomList(); }
    return;
  }
  if (id !== Rooms.scanId) return;
  if (Rooms.err) { Rooms.err = ''; renderRoomList(); }
  const found = new Map(), conns = [];
  await new Promise((done) => {
    const waiting = new Set();
    let over = false;
    const finish = () => { if (over) return; over = true; clearTimeout(to); if (Rooms.scan && Rooms.scan.id === id) Rooms.scan = null; done(); };
    const settle = (i) => { waiting.delete(i); if (!waiting.size) finish(); };
    const to = setTimeout(finish, PUB_SCAN_MS);
    for (let i = 0; i < PUB_SLOTS; i++) waiting.add(i);
    Rooms.scan = { id, settle };
    for (let i = 0; i < PUB_SLOTS; i++) {
      let conn = null;
      try { conn = peer.connect(slotId(i), { serialization: 'json', reliable: true }); } catch (e) { conn = null; }
      if (!conn) { settle(i); continue; }
      conns.push(conn);
      conn.on('data', (msg) => {
        const r = msg && msg.t === 'room' ? readRoomInfo(msg.r) : null;
        if (r && id === Rooms.scanId) {
          found.set(r.c, r);
          // straight onto the list, beside what the last look found
          Rooms.list = Rooms.list.filter((x) => x.c !== r.c).concat(r);
          renderRoomList();
        }
        settle(i);
        try { conn.close(); } catch (e) { /* closed */ }
      });
      conn.on('error', () => settle(i));
      conn.on('close', () => settle(i));
    }
  });
  for (const c of conns) { try { c.close(); } catch (e) { /* closed */ } }
  if (id !== Rooms.scanId) return;
  Rooms.list = [...found.values()];
  Rooms.scanning = false; Rooms.looked = true; Rooms.scanAt = performance.now();
  renderRoomList();
}
// while the list is open (standalone): look again now and then, while anyone can see it
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
  else text = 'No public rooms right now. Host one, or join a friend with their code.';
  const note = $('browse-note');
  if (note.textContent !== text) note.textContent = text;
  note.classList.toggle('warn', warn);
  $('btn-refresh').disabled = busy;
}
