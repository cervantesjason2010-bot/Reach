// ================= HUD: prompts, cards, team, inventory, notes, death =================
const $ = (id) => document.getElementById(id);
function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }

let toastTimer = 0;
function showToast(text, kind, ms) {
  const t = $('toast');
  t.textContent = text;
  t.className = 'show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = kind || ''; }, ms || 2200);
}

let cardTimer = 0;
function showAreaCard(ai) {
  const a = Game.L.areas[ai];
  setText($('card-num'), 'Area ' + String(ai + 1).padStart(2, '0') + ' / ' + String(Game.L.areas.length).padStart(2, '0'));
  setText($('card-name'), a.name);
  setText($('card-obj'), a.objective);
  const c = $('area-card');
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => c.classList.remove('show'), 5200);
  setText($('objective'), a.objective);
  setText($('hud-area'), String(ai + 1).padStart(2, '0') + ' · ' + a.name);
}

function openNote(note) {
  setText($('note-text'), note.text);
  setText($('note-area'), Game.L.areas[note.area].name + ' · recovered note');
  $('note').hidden = false;
  Sound.play('click');
  Game.reading = true;
}
function closeNote() { $('note').hidden = true; Game.reading = false; }

function jumpScare() {
  const sc = $('scare');
  sc.hidden = false;
  sc.classList.remove('go'); void sc.offsetWidth; sc.classList.add('go');
  R.whiteFlash = 0.6; R.shake = 1;
  setTimeout(() => { sc.hidden = true; }, 1400);
}
function showDeath(delay = 1300) {
  const solo = Net.mode === 'solo' || netPeers().length < 2;
  setText($('death-text'), solo ? 'It has you. You wake up in the last shelter you reached.' : 'Your team can bring you back. Get one of them to a shelter.');
  setTimeout(() => { if (Game.me && Game.me.dead) $('death').hidden = false; }, delay);
}
function hideDeath() { $('death').hidden = true; }

let teamT = 0;
function updateHud(dt) {
  const g = Game.g, me = Game.me;
  if (!g || !me) return;
  // interaction prompt
  const tg = me.target;
  const prompt = $('prompt');
  if (tg && !me.dead && Game.mode === 'play') {
    prompt.hidden = false;
    setText($('prompt-key'), tg.ok ? keyWord('E') : '');
    $('prompt-key').hidden = !tg.ok;
    setText($('prompt-text'), Touch.on ? tg.label.replace('Hold E ', 'Hold Use ') : tg.label);
    const p = tg.hold ? (tg.progress || 0) : 0;
    $('prompt-ring').style.setProperty('--p', String(Math.round(p * 100)));
    $('prompt-ring').hidden = !tg.hold;
  } else prompt.hidden = true;
  // stamina only when it matters
  const st = me.stamina / STAMINA_MAX;
  $('stamina').style.opacity = st < 0.98 && !me.dead ? '1' : '0';
  $('stamina-fill').style.width = (st * 100).toFixed(1) + '%';
  // noise meter - or, on B5, where sound means nothing to it, whether you are showing a light
  if (g.lv === 'l3') {
    // on A1 the only thing that matters is whether you are moving
    const th = paleThreat(), mv = clamp(me.speed / SPRINT_SPEED, 0, 1), moving = me.speed > 0.25;
    $('noise').style.setProperty('--n', (moving ? 0.25 + mv * 0.75 : 0.03).toFixed(3));
    setText($('noise-label'), !moving ? 'Still' : th > 0.2 ? 'Moving - it can see you' : me.speed > WALK_SPEED + 0.2 ? 'Running' : me.speed < CROUCH_SPEED + 0.1 ? 'Creeping' : 'Moving');
    $('noise').classList.toggle('loud', moving && th > 0.15);
  } else if (g.lv === 'l2') {
    const th = chudThreat();
    $('noise').style.setProperty('--n', (me.fl ? 0.75 + th * 0.25 : 0.05).toFixed(3));
    setText($('noise-label'), me.fl ? (th > 0.2 ? 'Light on - it can see it' : 'Light on') : 'Dark');
    $('noise').classList.toggle('loud', me.fl && th > 0.15);
  } else {
    const nz = clamp(me.noise / 16, 0, 1);
    $('noise').style.setProperty('--n', nz.toFixed(3));
    setText($('noise-label'), me.vl > 0.15 ? 'It can hear you talking' : me.whisper ? 'Whispering' : me.noise > 8 ? 'Loud' : me.noise > 2 ? 'Footsteps' : 'Quiet');
    $('noise').classList.toggle('loud', me.noise > 8 || me.vl > 0.4);
  }
  // the five slots
  renderHotbar();
  $('mic').hidden = !Sound.hasMic;
  $('mic').classList.toggle('muted', !!Settings.muted);
  $('mic-level').style.transform = 'scaleX(' + clamp(me.vl || (me.whisper ? 0.2 : 0), 0, 1).toFixed(2) + ')';
  teamT -= dt;
  if (teamT > 0) return;
  teamT = 0.25;
  const list = $('team');
  const peers = netPeers();
  list.hidden = peers.length < 2;
  while (list.children.length > peers.length) list.lastChild.remove();
  peers.forEach((p, i) => {
    let li = list.children[i];
    if (!li) { li = document.createElement('li'); li.innerHTML = '<span class="chip"></span><span class="nm"></span><span class="st"></span>'; list.appendChild(li); }
    const dead = !!g.k[p.id];
    li.className = dead ? 'dead' : (+p.s.vl > 0.12 ? 'talking' : '');
    li.querySelector('.chip').style.background = playerColor(p.s.c);
    setText(li.querySelector('.nm'), String(p.s.n || 'Player').slice(0, 14) + (p.me ? ' (you)' : ''));
    setText(li.querySelector('.st'), dead ? 'taken' : +p.s.vl > 0.12 ? 'talking' : safeAt(Game.L, p.s.x || 0, p.s.z || 0) ? 'sheltered' : '');
  });
}

const ITEM_ICONS = {
  crowbar: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 27 L22 10 Q24.5 7 27 9.5 L26 11" fill="none" stroke="#c8402f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 27 L5 25.5" stroke="#9aa0a4" stroke-width="3" stroke-linecap="round"/></svg>',
  keycard: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="9" width="20" height="14" rx="2" fill="#e9e4d8" fill-opacity="0.12" stroke="#e9e4d8" stroke-width="1.6"/><rect x="6" y="12" width="20" height="3" fill="#c8402f"/><rect x="9" y="17.5" width="7" height="3" rx="0.6" fill="#e8a33a"/></svg>',
  fuse: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="12" width="14" height="8" rx="2" fill="#e8a33a"/><rect x="5" y="13" width="4" height="6" fill="#9aa0a4"/><rect x="23" y="13" width="4" height="6" fill="#9aa0a4"/><path d="M12 16h8" stroke="#7a4a08" stroke-width="1.2"/></svg>',
  cell: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="8" y="7" width="16" height="20" rx="2" fill="#2a3036" stroke="#9aa0a4" stroke-width="1.4"/><rect x="12" y="4.5" width="8" height="3" fill="#9aa0a4"/><path d="M17 11l-4 6h4l-2 6 5-8h-4z" fill="#6fbf8a"/></svg>',
  thing: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="7" fill="none" stroke="#e9e4d8" stroke-width="1.6"/></svg>',
};
let _hotbarKey = '';
function renderHotbar() {
  const S = Game.slots || [], sel = Game.slot || 0;
  const key = S.join('|') + '#' + sel;
  if (key === _hotbarKey) return;
  _hotbarKey = key;
  const slots = document.querySelectorAll('#inv .slot');
  slots.forEach((el, i) => {
    const id = S[i], ty = itemType(id);
    el.classList.toggle('on', i === sel);
    el.classList.toggle('full', !!id);
    const ic = el.querySelector('i');
    const html = id ? ITEM_ICONS[ty] || ITEM_ICONS.thing : '';
    if (ic.innerHTML !== html) ic.innerHTML = html;
    let q = el.querySelector('.q');
    const tag = ty === 'keycard' ? String(+id.slice(3) + 1).padStart(2, '0') : '';
    if (tag && !q) { q = document.createElement('span'); q.className = 'q'; el.appendChild(q); }
    if (q) q.textContent = tag;
  });
  const held = S[sel];
  setText($('inv-name'), held ? ITEM_NAMES[itemType(held)] + (itemType(held) === 'keycard' ? ' · area ' + (+held.slice(3) + 1) : '') : '');
}

function setLetterbox(on) { document.body.classList.toggle('cinema', !!on); }
let subTimer = 0;
function subtitle(text, ms) {
  const el = $('subtitle');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(subTimer);
  subTimer = setTimeout(() => el.classList.remove('show'), ms || 3000);
}
