// ================= core: constants and small helpers =================
const EYE_H = 1.62;
const CROUCH_EYE = 1.02;
const PLAYER_R = 0.27;
const WALK_SPEED = 2.5;
const CROUCH_SPEED = 1.2;
const SPRINT_SPEED = 5.1;
const STAMINA_MAX = 6.5;
const CREATURE_R = 0.4;
const CONNECTOR_LEN = 6;
const NORTH_EXIT_EAST = 3;      // how far east a north-leaving corridor runs before the next area's door
const HIGH_PASSAGE_CEIL = 5.0;  // the passage out of a high hall (the dock) keeps a high ceiling to the next door
const HIGH_SHUTTER_TOP = 3.8;   // ...and leaves it through a tall roller shutter
const COLORS = ['#e8a33a', '#4fc3c0', '#e46b88', '#a68be8', '#d8d8d0', '#7fbf5a', '#d9533b', '#4a7fd8'];
// a suit colour: one of the swatches, or any colour someone picked for themselves
function playerColor(c) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : COLORS[(c | 0) % COLORS.length]; }
const INV_SLOTS = 5;
const GAME_TITLE = 'REACH';
const CREDIT_LINE = 'A Jason Production';
const CREDIT_ROLE = 'Lead Developer: Jason';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
const smooth01 = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const smoothstep = (a, b, x) => smooth01((x - a) / (b - a));
function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
const lerpAngle = (a, b, t) => a + wrapAngle(b - a) * t;
const dampAngle = (a, b, rate, dt) => lerpAngle(a, b, 1 - Math.exp(-rate * dt));
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randomCode(n = 5) {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}
const r2 = (v) => Math.round(v * 100) / 100;
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
