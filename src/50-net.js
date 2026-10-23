// ================= net: Claude's live room inside Claude, peer-to-peer everywhere else =================
const IN_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');
// PeerJS, from whichever of these this network lets through
const PEERJS_URLS = [
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js',
];
// the matchmaking server: PeerJS's own (these are its defaults, written out for the room list, which talks to it directly)
const PEER_SERVER = { host: '0.peerjs.com', port: 443, path: '/', key: 'peerjs', secure: true };
const NET_HOST_GONE_MS = 20000;   // nothing from the host for this long: it has gone
const NET_PEER_GONE_MS = 15000;   // nothing from a player for this long: take them off the roster until they're back
const PRESENCE_MAX = 4000;        // a room presence is capped at 4 KiB of JSON (UTF-8); keep a margin
const Net = {
  mode: 'solo', code: '', creator: false, lost: false, lostReason: '',
  lobby: null, r: null, scoped: false, unsub: [], connected: true, roomName: '',
  peer: null, conns: new Map(), hostConn: null, states: new Map(), heard: new Map(), snap: null, snapAt: 0, myPeerId: '', calls: new Map(),
  lastSent: 0, lastPayload: '', myState: {}, sentKeys: [], rejects: 0, lastError: '', hostSeenAt: 0, rejoining: false,
};

async function initNet() {
  if (IN_CLAUDE) {
    try { Net.lobby = await window.claude.use('room'); } catch (e) { Net.lobby = null; }
    return { online: !!Net.lobby, voice: false };
  }
  return { online: true, voice: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) };
}

function loadPeerJs() {
  if (window.Peer) return Promise.resolve();
  const tryOne = (i) => new Promise((res, rej) => {
    if (i >= PEERJS_URLS.length) { rej(Object.assign(new Error('peerjs'), { code: 'lib' })); return; }
    const s = document.createElement('script'); s.src = PEERJS_URLS[i]; s.async = true;
    let over = false;
    const next = () => { if (over) return; over = true; clearTimeout(to); s.onload = s.onerror = null; if (window.Peer) res(); else { s.remove(); tryOne(i + 1).then(res, rej); } };
    const to = setTimeout(next, 12000);
    s.onload = next; s.onerror = next;
    document.head.appendChild(s);
  });
  return tryOne(0);
}

// ---------- join / host ----------
async function netJoin(code, creator) {
  await netLeave();
  Net.code = code; Net.creator = creator; Net.lost = false; Net.lostReason = ''; Net.connected = true;
  Net.hostSeenAt = 0; Net.rejects = 0; Net.lastError = ''; Net.sentKeys = []; Net.lastPayload = '';
  if (IN_CLAUDE) {
    if (!Net.lobby) throw Object.assign(new Error('room'), { code: 'noroom' });
    Net.mode = 'claude';
    Net.roomName = 'reach-' + code.toLowerCase();
    try { await joinRoom(); }
    catch (e) { Net.mode = 'solo'; throw e; }
    return;
  }
  Net.mode = 'peer';
  try { await connectPeers(code, creator); }
  catch (e) { await netLeave(); throw e; }
}

// Claude: each game is its own named room. Where named rooms aren't offered, everyone shares the page's own
// room and tells games apart by the code in their presence.
async function joinRoom() {
  for (const u of Net.unsub) { try { u(); } catch (e) { /* gone */ } }
  Net.unsub = [];
  try { Net.r = await Net.lobby.join(Net.roomName); Net.scoped = false; }
  catch (e) {
    if (e && (e.code === 'not_permitted' || e.code === 'limit_reached')) { Net.r = Net.lobby; Net.scoped = true; }
    else throw e;
  }
  Net.sentKeys = []; Net.lastPayload = '';
  const onErr = (err) => roomFailed(err);
  Net.unsub.push(Net.r.onPeers(() => {}, onErr));
  if (typeof Net.r.onConnection === 'function') Net.unsub.push(Net.r.onConnection((c) => { Net.connected = !!c; }, onErr));
}
// A room's listeners hear one error when it ends. A named room that ends on a reconnect can be joined again;
// anything else is the end of this connection.
function roomFailed(err) {
  const code = err && err.code;
  if (Net.mode !== 'claude' || Net.lost || Net.rejoining) return;   // every listener hears it: act once
  if (!Net.scoped && (code === 'upstream_error' || code === 'limit_reached')) {
    Net.connected = false; Net.rejoining = true;
    let tries = 0;
    const again = () => {
      if (Net.mode !== 'claude' || Net.lost) { Net.rejoining = false; return; }
      joinRoom().then(() => { Net.connected = true; Net.rejoining = false; }, () => {
        if (++tries < 4) setTimeout(again, 2500);
        else { Net.rejoining = false; Net.lost = true; Net.lostReason = 'Lost the connection to the room.'; }
      });
    };
    setTimeout(again, 1500);
    return;
  }
  if (code) { Net.lost = true; Net.lostReason = 'Lost the connection to the room.'; }
}

// How peers find each other: STUN servers to punch through home routers, and TURN relays for when they can't.
// "Relay" in the settings sends everything through the relays - slower, but it gets through networks (school,
// college, work, some phone hotspots) that block direct connections. PeerJS's relays sit on port 3478, which
// strict networks block too, so there is a second relay on ports 80 and 443 - plain TCP, and TLS, which looks
// like any other secure web traffic.
const OPEN_RELAY = { host: 'staticauth.openrelay.metered.ca', secret: 'openrelayprojectsecret' };
let _relayCreds = null;
// its credentials are made from its public shared secret (the standard time-limited TURN scheme):
// username "<expiry>:<name>", password base64(HMAC-SHA1(secret, username))
async function openRelayServer() {
  try {
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (!_relayCreds || _relayCreds.exp - now < 3600) {
      const exp = now + 24 * 3600, username = exp + ':reach', enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(OPEN_RELAY.secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
      const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(username)));
      _relayCreds = { exp, username, credential: btoa(String.fromCharCode(...sig)) };
    }
    const h = OPEN_RELAY.host;
    return { urls: ['turn:' + h + ':80', 'turn:' + h + ':80?transport=tcp', 'turn:' + h + ':443', 'turns:' + h + ':443?transport=tcp'], username: _relayCreds.username, credential: _relayCreds.credential };
  } catch (e) { return null; }
}
function peerOptions(extra) {
  const relay = typeof Settings !== 'undefined' && Settings.net === 'relay';
  const iceServers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
    { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
  ];
  if (extra) iceServers.push(extra);
  return { host: PEER_SERVER.host, port: PEER_SERVER.port, path: PEER_SERVER.path, key: PEER_SERVER.key, secure: PEER_SERVER.secure, debug: 0,
    config: { iceServers, iceTransportPolicy: relay ? 'relay' : 'all', sdpSemantics: 'unified-plan' } };
}
// a player's connection closed: off the roster (unless they have already come back on a new one)
function dropPeer(id, conn) {
  if (conn && Net.conns.get(id) !== conn) return;
  Net.conns.delete(id); Net.states.delete(id); Net.heard.delete(id);
  Sound.detachVoice(id);
}
async function connectPeers(code, creator) {
  await loadPeerJs();
  const hostId = 'reach-jason-' + code.toLowerCase();
  const extra = await openRelayServer();
  await new Promise((resolve, reject) => {
    const peer = creator ? new window.Peer(hostId, peerOptions(extra)) : new window.Peer(peerOptions(extra));
    Net.peer = peer;
    let settled = false;
    const timers = [];
    const done = (err) => { if (settled) return; settled = true; timers.forEach(clearTimeout); err ? reject(err) : resolve(); };
    const fail = (code) => done(Object.assign(new Error(code), { code }));
    // the matchmaking server (PeerJS's) has to answer first - and now and then it is slow or down
    timers.push(setTimeout(() => { if (!Net.myPeerId) fail('server'); }, 15000));
    peer.on('open', (id) => {
      Net.myPeerId = id;
      if (Net.mode !== 'peer' || Net.peer !== peer) return;
      if (creator) { done(); return; }
      if (Net.hostConn) return;     // opened again after a reconnect to the server: the game connection is still there
      const conn = peer.connect(hostId, { serialization: 'json', reliable: true });
      Net.hostConn = conn;
      conn.on('open', () => { Net.snapAt = performance.now(); done(); });
      conn.on('data', (msg) => { if (msg && msg.t === 'snap' && msg.p && typeof msg.p === 'object') { Net.snap = msg.p; Net.snapAt = performance.now(); } });
      conn.on('close', () => { if (settled && Net.hostConn === conn) { Net.lost = true; Net.lostReason = 'The host left the game.'; } });
      conn.on('error', () => { if (!conn.open) fail('timeout'); });   // no way through to the host
      // finding a way through both networks can take a while - and through a relay a little longer
      timers.push(setTimeout(() => fail('timeout'), 20000));
    });
    peer.on('connection', (conn) => {
      if (!creator) { try { conn.close(); } catch (e) { /* not ours */ } return; }
      conn.on('data', (msg) => { if (msg && msg.t === 's' && msg.s && typeof msg.s === 'object') { Net.states.set(conn.peer, msg.s); Net.heard.set(conn.peer, performance.now()); } });
      conn.on('close', () => dropPeer(conn.peer, conn));
      conn.on('error', () => { /* followed by close */ });
      conn.on('open', () => {
        const old = Net.conns.get(conn.peer);
        if (old && old !== conn) { try { old.close(); } catch (e) { /* already gone */ } }
        Net.conns.set(conn.peer, conn); Net.heard.set(conn.peer, performance.now());
      });
    });
    peer.on('call', (call) => {
      call.answer(Sound.hasMic && Net.micStream ? Net.micStream : undefined);
      call.on('stream', (st) => Sound.attachVoice(call.peer, st));
      Net.calls.set(call.peer, call);
    });
    // losing the matchmaking server doesn't end a game that is already connected - just quietly reconnect
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => { try { if (!peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { /* try again next time */ } }, 1500); });
    peer.on('error', (err) => {
      const type = err && err.type;
      if (!settled) {
        if (type === 'unavailable-id') fail('taken');
        else if (type === 'peer-unavailable') fail('missing');
        else if (type === 'browser-incompatible') fail('browser');
        else if (type === 'webrtc') fail('timeout');
        else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') fail('server');
        else done(err || new Error('peer'));
        return;
      }
      // a voice call to someone who has gone is not a lost game
      if (type === 'peer-unavailable') return;
      if ((type === 'network' || type === 'server-error' || type === 'socket-error') && !Net.conns.size && !(Net.hostConn && Net.hostConn.open)) { Net.lost = true; Net.lostReason = 'Lost the connection.'; }
    });
  });
}

async function netLeave() {
  for (const u of Net.unsub) { try { u(); } catch (e) { /* gone */ } }
  Net.unsub = [];
  roomsLeft();
  const mode = Net.mode, r = Net.r, scoped = Net.scoped, peer = Net.peer;
  Net.mode = 'solo';
  if (mode === 'claude' && r) {
    try { if (scoped) await r.presence({ v: null, rm: null, g: null }); else await r.leave(); } catch (e) { /* leaving anyway */ }
  }
  if (mode === 'peer' && peer) {
    for (const [id] of Net.calls) Sound.detachVoice(id);
    try { peer.destroy(); } catch (e) { /* gone */ }
  }
  Object.assign(Net, { mode: 'solo', r: null, scoped: false, peer: null, hostConn: null, code: '', creator: false, snap: null, snapAt: 0, myPeerId: '', lastPayload: '', sentKeys: [], roomName: '', hostSeenAt: 0, connected: true, rejoining: false });
  Net.conns = new Map(); Net.states = new Map(); Net.heard = new Map(); Net.calls = new Map();
}

// ---------- what goes into a room presence ----------
// The room takes plain identifiers as keys ([A-Za-z_][A-Za-z0-9_-]*), but the game keys some of its records by
// player (an opaque id that can start with a digit) and by lock number. On the way out every key that isn't
// an identifier is wrapped, and on the way in unwrapped: "_" in front of one that only needs a letter first,
// "__" and hex for anything else. None of the game's own keys start with "_".
const KEY_OK = /^[A-Za-z][A-Za-z0-9_-]{0,62}$/;
const KEY_RESERVED = new Set(Object.getOwnPropertyNames(Object.prototype).concat(['prototype']));
function encKey(k) {
  if (KEY_OK.test(k) && !KEY_RESERVED.has(k)) return k;
  if (/^[A-Za-z0-9-][A-Za-z0-9_-]{0,61}$/.test(k)) return '_' + k;
  let h = '__';
  for (const b of new TextEncoder().encode(k)) h += b.toString(16).padStart(2, '0');
  return h;
}
function decKey(k) {
  if (k.charCodeAt(0) !== 95) return k;
  if (k.charCodeAt(1) !== 95) return k.slice(1);
  const hex = k.slice(2), bytes = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return new TextDecoder().decode(bytes);
}
function encodeKeys(v) {
  if (Array.isArray(v)) return v.map(encodeKeys);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) if (v[k] !== undefined) o[encKey(k)] = encodeKeys(v[k]); return o; }
  return v;
}
function decodeKeys(v) {
  if (Array.isArray(v)) return v.map(decodeKeys);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[decKey(k)] = decodeKeys(v[k]); return o; }
  return v;
}
// Presence objects arrive frozen, and the same object until it changes: unwrap each one once, into an object
// of our own the game can use (and change) freely.
const _roomStates = new WeakMap();
function roomState(pres) {
  if (!pres || typeof pres !== 'object') return {};
  let s = _roomStates.get(pres);
  if (!s) { s = decodeKeys(pres); _roomStates.set(pres, s); }
  return s;
}
const _utf8 = new TextEncoder();
const utf8Len = (s) => _utf8.encode(s).length;

// ---------- the shared view of who is here ----------
// returns [{ id, me, s }] for everyone in this game, sorted by id
function netPeers() {
  if (Net.mode === 'solo') return [{ id: 'me', me: true, s: Net.myState }];
  if (Net.mode === 'claude') {
    if (!Net.r) return [];
    let list = [];
    try { list = Net.r.peers(); } catch (e) { return []; }
    const out = [];
    for (const p of list) {
      if (p.kind === 'agent' || !p.presence) continue;
      if (p.sameTab) { out.push({ id: p.peer, me: true, s: Net.myState }); continue; }
      if (p.presence.v !== 1 || (Net.scoped && p.presence.rm !== Net.code)) continue;
      out.push({ id: p.peer, me: false, s: roomState(p.presence) });
    }
    return out.sort((a, b) => (a.id < b.id ? -1 : 1));
  }
  // peer mode
  const out = [];
  if (Net.creator) {
    out.push({ id: Net.myPeerId, me: true, s: Net.myState });
    for (const [id, s] of Net.states) out.push({ id, me: false, s });
  } else if (Net.snap) {
    for (const id in Net.snap) out.push({ id, me: id === Net.myPeerId, s: id === Net.myPeerId ? Net.myState : Net.snap[id] });
    if (!Net.snap[Net.myPeerId]) out.push({ id: Net.myPeerId, me: true, s: Net.myState });
  } else out.push({ id: Net.myPeerId || 'me', me: true, s: Net.myState });
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}
function netMyId() {
  if (Net.mode === 'solo') return 'me';
  if (Net.mode === 'peer') return Net.myPeerId || 'me';
  const mine = netPeers().find((p) => p.me);
  return mine ? mine.id : 'me';
}
// The host is whoever made the room, and only them. If they go, nobody takes over a copy of a game they can't
// run: everyone else is told the host has left.
function netHostId() {
  if (Net.mode === 'solo') return 'me';
  if (Net.mode === 'peer') return Net.creator ? Net.myPeerId : 'reach-jason-' + Net.code.toLowerCase();
  if (Net.creator) return netMyId();
  const made = netPeers().filter((p) => !p.me && p.s && p.s.cr === 1);
  return made.length ? made[0].id : '';
}
function netIsHost() {
  if (Net.mode === 'solo') return true;
  return Net.creator;
}
function netHostState() {
  if (netIsHost()) return null;
  const id = netHostId();
  if (!id) return null;
  const p = netPeers().find((x) => x.id === id);
  return p && p.s && p.s.g ? p.s.g : null;
}

// Is everyone still here? Called every frame. A player who goes quiet comes off the host's roster (and back on
// when they're heard again); a host who goes quiet - or leaves the room - means the game is over for everyone.
function netWatch() {
  if (Net.mode === 'solo' || Net.lost) return;
  const now = performance.now();
  if (Net.mode === 'peer') {
    if (Net.creator) { for (const [id, t] of Net.heard) if (now - t > NET_PEER_GONE_MS) { Net.states.delete(id); Net.heard.delete(id); } }
    else if (Net.snapAt && now - Net.snapAt > NET_HOST_GONE_MS) { Net.lost = true; Net.lostReason = 'Lost the connection to the host.'; }
    return;
  }
  if (Net.mode === 'claude' && !Net.creator) {
    if (netHostId()) Net.hostSeenAt = now;
    else if (!Net.connected) { if (Net.hostSeenAt) Net.hostSeenAt = now; }   // reconnecting: nobody can be seen yet
    else if (Net.hostSeenAt && now - Net.hostSeenAt > 10000) { Net.lost = true; Net.lostReason = 'The host left the game.'; }
  }
}

// publish my state (and, on the host, the game)
function netPublish(state, force) {
  Net.myState = state;
  if (Net.mode === 'solo') return;
  netWatch();
  const t = performance.now();
  if (!force && t - Net.lastSent < 66) return;
  Net.lastSent = t;
  if (Net.mode === 'claude') {
    if (!Net.r) return;
    let out = encodeKeys(Net.scoped ? Object.assign({}, state, { rm: Net.code }) : state);
    let text = JSON.stringify(out);
    // in a shared lobby the presence also carries the room's entry in the public list (see roomsTick)
    const max = PRESENCE_MAX - (Net.scoped ? Rooms.bytes : 0);
    // over the room's size limit: the oldest events go first (they've been seen), then the kill's drag path
    if (utf8Len(text) > max && out.g) {
      out = Object.assign({}, out, { g: Object.assign({}, out.g, { ev: (out.g.ev || []).slice(-3) }) });
      text = JSON.stringify(out);
      if (utf8Len(text) > max && out.g.kl) { out.g.kl = Object.assign({}, out.g.kl, { p: [] }); text = JSON.stringify(out); }
    }
    if (utf8Len(text) > max) { Net.lastError = 'too_big'; return; }
    if (text === Net.lastPayload) return;     // unchanged: the room keeps it alive by itself
    // the room merges each update into what it has: anything not sent this time has to be cleared by name
    const patch = Object.assign({}, out);
    for (const k of Net.sentKeys) if (!(k in patch)) patch[k] = null;
    Net.sentKeys = Object.keys(out);
    Net.lastPayload = text;
    const r = Net.r;
    r.presence(patch).then(() => { Net.rejects = 0; }, (e) => {
      if (Net.r !== r) return;
      Net.rejects += 1; Net.lastError = (e && e.code) || 'error'; Net.lastPayload = '';
      if (Net.rejects === 1) console.warn('room presence refused:', e && e.code, e && e.message);
    });
  } else if (Net.mode === 'peer') {
    if (Net.creator) {
      const snap = {};
      snap[Net.myPeerId] = state;
      for (const [id, s] of Net.states) snap[id] = s;
      const msg = { t: 'snap', p: snap };
      for (const [, c] of Net.conns) { try { if (c.open) c.send(msg); } catch (e) { /* dropped */ } }
    } else if (Net.hostConn && Net.hostConn.open) {
      try { Net.hostConn.send({ t: 's', s: state }); } catch (e) { /* dropped */ }
    }
  }
}

// voice: the lower id calls the higher one; whoever has a mic can start the call
function netUpdateVoice() {
  if (Net.mode !== 'peer' || !Net.peer || !Net.micStream) return;
  for (const p of netPeers()) {
    if (p.me || Net.calls.has(p.id)) continue;
    const iStart = Net.myPeerId < p.id || !p.s.mic;
    if (!iStart) continue;
    try {
      const call = Net.peer.call(p.id, Net.micStream);
      if (!call) continue;
      Net.calls.set(p.id, call);
      call.on('stream', (st) => Sound.attachVoice(p.id, st));
      call.on('close', () => { Net.calls.delete(p.id); Sound.detachVoice(p.id); });
      call.on('error', () => { Net.calls.delete(p.id); });
    } catch (e) { /* retry later */ }
  }
}

// ---------- "Check my connection" (standalone) ----------
// What this network lets through, the three things online play needs: the matchmaking server; a direct route
// (STUN: the router can be punched through); a relay (TURN: the fallback when it can't). Resolves
// { server, direct, relay } as true/false.
async function netSelfTest() {
  const out = { server: false, direct: false, relay: false };
  const extra = await openRelayServer();
  // the relay and the direct route: gather candidates for a throwaway connection and see what kinds come back
  const ice = (async () => {
    if (!window.RTCPeerConnection) return;
    const opts = peerOptions(extra).config;
    const pc = new RTCPeerConnection({ iceServers: opts.iceServers, iceTransportPolicy: 'all' });
    try {
      pc.createDataChannel('check');
      pc.onicecandidate = (e) => {
        const m = e.candidate && / typ (srflx|relay|host|prflx)/.exec(e.candidate.candidate || '');
        if (m && m[1] === 'srflx') out.direct = true;
        if (m && m[1] === 'relay') out.relay = true;
      };
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise((r) => {
        const to = setTimeout(r, 9000);
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(to); r(); } };
      });
    } catch (e) { /* counts as blocked */ }
    try { pc.close(); } catch (e) { /* closed */ }
  })();
  // the matchmaking server: open a throwaway peer on it
  const server = (async () => {
    try { await loadPeerJs(); } catch (e) { return; }
    await new Promise((r) => {
      let peer = null;
      const end = (ok) => { out.server = out.server || ok; clearTimeout(to); try { if (peer) peer.destroy(); } catch (e) { /* gone */ } r(); };
      const to = setTimeout(() => end(false), 9000);
      try { peer = new window.Peer(peerOptions(extra)); peer.on('open', () => end(true)); peer.on('error', () => end(false)); } catch (e) { end(false); }
    });
  })();
  await Promise.all([ice, server]);
  return out;
}

function inviteLinkFor(code) {
  if (IN_CLAUDE) return typeof ARTIFACT_URL !== 'undefined' && ARTIFACT_URL ? ARTIFACT_URL + '#' + code : '';
  const base = location.href.split('#')[0];
  // inside an itch.io frame the page address isn't the one people should open
  if (/itch\.zone$|hwcdn\.net$/.test(location.hostname)) return '';
  return location.protocol.startsWith('http') ? base + '#' + code : '';
}
