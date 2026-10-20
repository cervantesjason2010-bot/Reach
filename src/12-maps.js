// ================= maps: ten areas of Facility B-4, drawn as 1 m grids =================
// Legend
//  walls:   #  wall   ~ glass   | bars
//  locks:   B boards (crowbar)  K keycard door  P power door  V valve door  H hack door  Z lift doors
//  floor:   .  floor  s safe room  S safe room doorway (open, no door)  z lift floor  < entry  = crawlspace
//           w  water  ; plastic curtain  : debris  % scratches/stains  @ spawn  M creature vent
//           U  pallet rack with an empty bottom tier: crawl under it, crouched
//  items:   c crowbar  k keycard  f fuse  n note
//  devices: F breaker  G generator panel  W main power switch  u lift call  v valve  (stand on the cell, device on the wall)
//  lights:  L fluorescent  ! red emergency  * bare bulb
//  props:   t desk  h chair  $ shelf  l lockers  x crate  X crate stack  o barrel  b bench  T tank
//           R server rack  g gurney  d drawer bank  p pipes  m pump  e turbine  q console  Q hack console
class MapGrid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.c = Array.from({ length: h }, () => Array(w).fill('#'));
  }
  inside(x, z) { return x >= 0 && z >= 0 && x < this.w && z < this.h; }
  get(x, z) { return this.inside(x, z) ? this.c[z][x] : '#'; }
  set(x, z, ch) { if (this.inside(x, z)) this.c[z][x] = ch; }
  fill(x0, z0, x1, z1, ch) { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, z, ch); }
  floor(x0, z0, x1, z1) { this.fill(x0, z0, x1, z1, '.'); }
  room(x0, z0, x1, z1, fl = '.') { this.fill(x0, z0, x1, z1, '#'); this.fill(x0 + 1, z0 + 1, x1 - 1, z1 - 1, fl); }
  put(list, ch) { for (const [x, z] of list) this.set(x, z, ch); }
  hline(x0, x1, z, ch) { for (let x = x0; x <= x1; x++) this.set(x, z, ch); }
  vline(x, z0, z1, ch) { for (let z = z0; z <= z1; z++) this.set(x, z, ch); }
  scatter(rnd, x0, z0, x1, z1, ch, n, onlyOn = '.') {
    for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
      const x = x0 + Math.floor(rnd() * (x1 - x0 + 1)), z = z0 + Math.floor(rnd() * (z1 - z0 + 1));
      if (this.get(x, z) === onlyOn) { this.set(x, z, ch); i++; }
    }
  }
  rows() { return this.c.map((r) => r.join('')); }
}

const AREA_META = [
  { name: 'Receiving Dock', theme: 'dock', ceil: 7.2, objective: 'There is no power down here. Find the generator.',
    note: 'SHIPPING NOTICE: Crate 7 (live specimen) arrived early. It was not sedated. By morning the crate was empty and the main breaker had been pulled. Dock B is closed until further notice.' },
  { name: 'Administration', theme: 'office', ceil: 3.0, objective: 'Find a security keycard.',
    note: 'To all staff: do not run in the halls. It hears footsteps through the floor. Walk, or stay put. (Security)' },
  { name: 'Research Lab', theme: 'lab', ceil: 3.4, objective: 'The breaker is dead. Carry the backup power cell to it.',
    note: 'R-7 growth log, day 212: 3.4 m. The right arm is still lengthening. It learned to open the tank seals by watching us do it.' },
  { name: 'Cold Storage', theme: 'cold', ceil: 3.0, objective: 'The way on is boarded up. Pry it open.',
    note: 'We moved the bodies to cold storage. Two drawers were empty in the morning. The doors were still locked from the outside.' },
  { name: 'Server Hall', theme: 'server', ceil: 3.6, objective: 'Hack the control console to open the blast door.',
    note: 'If the lights go out, stop moving and stop talking. It can hear a whisper from across this hall.' },
  { name: 'Maintenance Tunnels', theme: 'tunnel', ceil: 2.6, objective: 'Pull both release levers to open the bulkhead.',
    note: 'BULKHEAD 6: two-man release. One at the end of each service run. A pulled lever holds for twenty-five seconds, and you will hear every one of them. (It hears them too.)' },
  { name: 'Pump Station', theme: 'pump', ceil: 8.5, objective: 'Turn both valves to drain the station.',
    note: 'Pumps 2 and 3 are failing. Be careful in the water. Every step carries farther than you think.' },
  { name: 'Containment', theme: 'contain', ceil: 3.2, objective: 'Find the observation keycard.',
    note: 'Cell 4 was never meant to hold it. The bars bent like they were warm. It was gone before the alarm finished.' },
  { name: 'Generator Hall', theme: 'generator', ceil: 12, objective: 'Find 3 fuses and start the generator.',
    note: 'Starting the generator will be loud. Whoever pulls the lever should already be running.' ,
    stairs: [{ x: 34, zBottom: 8.85, zTop: 2.55, zEnd: 2.1, h: 4.35 }] },
  { name: 'Freight Lift', theme: 'lift', ceil: 7.5, objective: 'Call the freight lift and survive until it arrives.',
    note: 'The freight lift is the only way up. It takes thirty seconds to come down. Make them count.' },
];

function buildArea1(rnd) { // Receiving Dock: a warehouse four times the size it was, and no power at all
  const g = new MapGrid(84, 48);
  g.floor(1, 1, 82, 46);
  // the freight lift you arrive in, set into the west wall
  g.fill(0, 8, 5, 15, '#'); g.fill(1, 9, 4, 14, 'z'); g.put([[5, 11], [5, 12]], 'z');
  g.put([[2, 10], [3, 10], [2, 13], [3, 13]], '@');
  // supervisor's office across the north-west corner, glass looking out over the floor
  g.vline(20, 1, 7, '#'); g.hline(0, 20, 7, '#');
  g.hline(8, 17, 7, '~'); g.set(13, 7, '.');
  g.put([[8, 2], [9, 2], [15, 2], [16, 2]], 't'); g.put([[8, 3], [15, 3]], 'h'); g.put([[19, 2], [19, 3], [19, 4]], '$');
  g.set(12, 4, 'n'); g.set(10, 4, 'L'); g.set(17, 5, 'L'); g.set(4, 4, 'L'); g.put([[1, 2], [1, 3], [1, 4]], 'l'); g.put([[3, 6], [4, 6]], 'x');
  // High-bay racking: rows of pallet racks with cross aisles, some of them with an empty bottom tier you can
  // crawl under (U). Back-to-back double rows make a long low tunnel; nothing that size can follow you in.
  const rackRow = (z, x0, x1, crawl) => { for (let x = x0; x <= x1; x++) g.set(x, z, crawl(x) ? 'U' : '$'); };
  for (const [z, c] of [[3, (x) => x >= 29 && x <= 32], [4, (x) => x >= 29 && x <= 32], [9, (x) => (x >= 41 && x <= 44) || (x >= 56 && x <= 58)], [10, (x) => (x >= 41 && x <= 44) || (x >= 56 && x <= 58)],
    [15, (x) => x >= 25 && x <= 27], [16, (x) => x >= 25 && x <= 27], [21, (x) => x >= 47 && x <= 50]]) {
    rackRow(z, 24, 34, c); rackRow(z, 38, 50, c); rackRow(z, 54, 64, c);
  }
  // the floor: forklift lanes, crate stacks, pallets, drums
  for (const [x, z] of [[27, 26], [33, 29], [44, 25], [52, 30], [60, 26], [38, 33], [19, 30], [12, 25]]) g.fill(x, z, x + 1, z + 1, 'X');
  for (const [x, z] of [[23, 24], [30, 31], [41, 28], [49, 33], [57, 24], [64, 31], [15, 33], [9, 22], [70, 27], [67, 22]]) g.set(x, z, 'x');
  g.put([[36, 24], [36, 25], [62, 34], [26, 35], [73, 20], [74, 20]], 'o');
  g.fill(45, 37, 47, 38, 'Y');                 // the forklift, died mid-turn
  // loading bays: four roll-up doors in the south wall, dock plates in front, a pallet jack left out
  for (const x of [20, 32, 44, 56]) { g.put([[x - 1, 45], [x + 2, 45]], 'x'); }
  g.put([[24, 44], [25, 44], [36, 43], [50, 44], [51, 44]], 'x'); g.put([[29, 42], [52, 41]], 'o');
  // break room in the south-west: the first shelter
  g.fill(0, 37, 11, 47, '#'); g.fill(1, 38, 10, 46, 's'); g.set(11, 41, 'S');
  g.put([[1, 38], [1, 39], [1, 40]], 'l'); g.put([[5, 46], [6, 46]], 't'); g.set(5, 45, 'h'); g.set(4, 42, 'L');
  // first-aid room in the north-east, by the way out: the second
  g.fill(74, 0, 83, 9, '#'); g.fill(75, 1, 82, 8, 's'); g.set(74, 5, 'S');
  g.put([[82, 1], [82, 2]], 'l'); g.set(79, 8, 'b'); g.set(78, 4, 'L');
  // the way on: a powered roller shutter in the north wall. Nothing moves it until the power is back.
  g.put([[69, 0], [70, 0], [71, 0]], 'P');
  // the maintenance corridor down the east side, where it lives
  g.vline(77, 11, 31, '#'); g.set(77, 15, '.'); g.set(77, 27, '.');
  g.fill(78, 11, 82, 31, '.'); g.hline(77, 82, 10, '#'); g.hline(77, 82, 32, '#');
  g.put([[81, 13], [81, 14], [79, 30]], 'p'); g.set(82, 22, 'M'); g.put([[80, 18], [80, 26]], '*');
  // The generator bay, fenced off in the south-east corner: the generator, its switch and the breaker box.
  g.hline(64, 82, 33, '|'); g.vline(64, 33, 46, '|'); g.set(64, 39, '.'); g.set(72, 33, '.');
  g.fill(73, 40, 77, 42, 'Y');                 // the generator set itself
  g.set(82, 41, 'W');                          // the main switch, on the east wall beside its breaker box
  g.put([[66, 45], [67, 45], [68, 45], [81, 45]], 'o'); g.put([[66, 35], [67, 35]], 'x');
  g.set(69, 36, 'c');                          // a crowbar on the bench: you will need it further in
  // lights everywhere - every one of them dead until the generator runs
  for (let x = 12; x <= 72; x += 10) for (const z of [6, 12, 18, 25, 32, 40]) if (g.get(x, z) === '.') g.set(x, z, 'L');
  for (const [x, z] of [[9, 18], [9, 28], [79, 21], [70, 38], [76, 45], [70, 44]]) if (g.get(x, z) === '.') g.set(x, z, '*');
  for (const [x, z] of [[68, 2], [72, 2], [12, 36], [36, 46], [60, 46]]) if (g.get(x, z) === '.') g.set(x, z, '!');
  g.scatter(rnd, 7, 1, 72, 46, ':', 60); g.scatter(rnd, 7, 1, 72, 46, '%', 10);
  return g;
}

function buildArea2(rnd) { // Administration
  const g = new MapGrid(44, 24);
  g.floor(1, 11, 42, 12);
  g.set(0, 11, '<'); g.set(43, 12, 'K');
  // north offices
  const north = [[1, 8], [10, 17], [19, 26], [28, 34], [36, 42]];
  for (const [a, b] of north) g.floor(a, 1, b, 9);
  for (const x of [9, 18, 27, 35]) g.vline(x, 1, 9, '#');
  g.hline(1, 42, 10, '#');
  for (const x of [4, 13, 22, 31, 39]) g.set(x, 10, '.');
  g.put([[2, 3], [3, 3], [4, 3], [5, 3]], 't'); g.put([[3, 4], [5, 4]], 'h'); g.set(7, 2, '$'); g.set(7, 5, 'L');
  g.put([[11, 2], [12, 2], [15, 2], [16, 2], [11, 6], [12, 6]], 't'); g.put([[11, 3], [15, 3], [11, 7]], 'h'); g.set(14, 5, 'L');
  for (let x = 20; x <= 25; x++) g.set(x, 5, 't');
  for (const x of [20, 22, 24]) { g.set(x, 4, 'h'); g.set(x + 1, 6, 'h'); }
  g.set(23, 2, 'n'); g.set(22, 8, 'L');
  g.put([[29, 2], [30, 2]], 'q'); g.set(29, 3, 'h'); g.put([[34, 2], [34, 3], [34, 4]], 'l'); g.set(32, 7, 'k'); g.set(31, 5, 'L');
  g.put([[37, 2], [38, 2], [39, 2], [40, 2], [41, 2]], '$'); g.put([[41, 6], [41, 7], [40, 7]], 'x'); g.set(38, 5, 'L');
  // south: open-plan cubicles, safe break room, storage
  g.floor(1, 14, 26, 22); g.hline(1, 42, 13, '#'); g.vline(27, 13, 23, '#');
  g.set(6, 13, '.'); g.set(20, 13, '.');
  for (const x of [3, 8, 13, 18, 23]) {
    g.put([[x, 15], [x + 1, 15], [x, 19], [x + 1, 19]], 't');
    g.put([[x, 16], [x + 1, 18]], 'h');
  }
  g.put([[6, 21], [16, 21]], 'L'); g.set(11, 17, 'L'); g.set(21, 17, 'L');
  g.fill(27, 13, 35, 23, '#'); g.fill(28, 14, 34, 22, 's'); g.set(31, 13, 'S');
  g.put([[28, 14], [29, 14]], 'l'); g.set(33, 21, 't'); g.set(32, 21, 'h'); g.set(31, 17, 'L');
  g.floor(36, 14, 42, 22); g.vline(35, 13, 23, '#'); g.set(39, 13, '.');
  g.put([[36, 22], [37, 22], [42, 18], [42, 19]], 'x'); g.put([[38, 16], [39, 16], [40, 16]], '$'); g.set(42, 22, 'M');
  for (const x of [3, 9, 15, 21, 27, 33, 39]) g.set(x, 11, 'L');
  g.put([[42, 9], [33, 15], [28, 21], [1, 21], [36, 21], [37, 21], [1, 14], [26, 14], [8, 1]], 'Y');
  g.scatter(rnd, 1, 11, 42, 12, ':', 8); g.scatter(rnd, 1, 14, 26, 22, ':', 10); g.scatter(rnd, 1, 11, 42, 12, '%', 2);
  return g;
}

function buildArea3(rnd) { // Research Lab
  const g = new MapGrid(44, 24);
  g.floor(1, 11, 42, 12);
  g.set(0, 12, '<'); g.set(43, 11, 'P');
  const cols = [[1, 10], [12, 21], [23, 32], [34, 42]];
  for (const [a, b] of cols) { g.floor(a, 1, b, 9); g.floor(a, 14, b, 22); }
  for (const x of [11, 22, 33]) { g.vline(x, 1, 9, '#'); g.vline(x, 14, 22, '#'); }
  g.hline(1, 42, 10, '#'); g.hline(1, 42, 13, '#');
  // glass fronts so you can see into the labs
  for (const [a, b] of cols) { g.hline(a + 1, b - 1, 10, '~'); g.hline(a + 1, b - 1, 13, '~'); }
  for (const x of [5, 17, 28, 38]) { g.set(x, 10, '.'); }
  for (const x of [17, 28, 38]) { g.set(x, 13, '.'); }
  // N1: benches, and the charging bay with the lab's backup power cell in it
  g.hline(3, 8, 4, 'b'); g.hline(3, 8, 7, 'b'); g.set(1, 2, 'C'); g.set(6, 2, 'L');
  // N2: specimen tanks
  for (const x of [13, 16, 19]) { g.set(x, 3, 'T'); g.set(x, 7, 'T'); } g.set(17, 5, 'L');
  // N3: benches and the log
  g.hline(24, 30, 3, 'b'); g.hline(24, 27, 7, 'b'); g.set(31, 7, 'n'); g.set(28, 5, 'L'); g.set(30, 8, 'g');
  // N4: control room
  g.put([[36, 2], [37, 2], [38, 2], [39, 2]], 'q'); g.put([[36, 3], [38, 3]], 'h'); g.vline(42, 2, 6, '$'); g.set(38, 6, 'L');
  // S1: decontamination = safe room
  g.fill(0, 13, 11, 23, '#'); g.fill(1, 14, 10, 22, 's'); g.set(5, 13, 'S');
  g.put([[1, 14], [1, 15], [1, 16]], 'l'); g.set(6, 18, 'L'); g.put([[9, 22], [10, 22]], 'b');
  // S2: big tank row
  for (const x of [13, 15, 17, 19]) g.set(x, 20, 'T'); g.put([[14, 16], [18, 16]], 'g'); g.set(16, 18, 'L');
  // S3: benches
  g.hline(25, 30, 17, 'b'); g.set(27, 20, 'L');
  // S4: storage and the vent
  g.hline(35, 41, 16, '$'); g.hline(35, 41, 19, '$'); g.set(42, 22, 'M'); g.set(38, 21, 'L');
  g.set(42, 11, 'E');   // the breaker, on the wall beside the exit: it takes the power cell
  for (const x of [3, 9, 15, 21, 27, 33, 39]) g.set(x, 11, 'L');
  g.put([[4, 1], [35, 22], [36, 22]], 'Y');
  g.put([[7, 11], [25, 12], [36, 11]], '!');
  g.scatter(rnd, 1, 11, 40, 12, '%', 3); g.scatter(rnd, 12, 14, 42, 22, ':', 8);
  return g;
}

function buildArea4(rnd) { // Cold Storage
  const g = new MapGrid(40, 24);
  g.floor(1, 5, 38, 6); g.floor(1, 17, 38, 18);
  g.set(0, 5, '<'); g.set(39, 18, 'B');
  g.floor(1, 7, 2, 16); g.floor(37, 7, 38, 16); // side halls make a loop
  // freezers north of the top hall, entered through plastic curtains
  for (const [a, b] of [[3, 9], [11, 17], [19, 25], [27, 33]]) {
    g.floor(a, 1, b, 3); g.set(Math.floor((a + b) / 2), 4, ';');
    g.hline(a, b, 1, 'x'); g.set(a + 1, 3, 'o'); g.set(Math.floor((a + b) / 2), 2, 'L');
  }
  g.hline(1, 38, 4, '#'); for (const x of [6, 14, 22, 30]) g.set(x, 4, ';');
  // morgue in the middle
  g.floor(4, 8, 34, 15); g.hline(3, 35, 7, '#'); g.hline(3, 35, 16, '#'); g.vline(3, 7, 16, '#'); g.vline(35, 7, 16, '#');
  g.set(12, 7, ';'); g.set(26, 16, ';'); g.set(35, 11, '.');
  g.hline(5, 10, 8, 'd'); g.hline(14, 33, 8, 'd'); g.hline(5, 20, 15, 'd');
  for (const x of [8, 13, 18, 23, 28]) g.set(x, 11, 'g');
  g.set(30, 13, 'n'); for (const x of [8, 18, 28]) g.set(x, 12, 'L');
  // south: office that became the safe room, more freezers
  g.fill(0, 18, 9, 23, '#'); g.fill(1, 19, 8, 22, 's'); g.set(5, 18, 'S'); g.set(4, 20, 'L'); g.put([[1, 22], [2, 22]], 't');
  for (const [a, b] of [[11, 17], [19, 25], [27, 33]]) {
    g.floor(a, 20, b, 22); g.set(Math.floor((a + b) / 2), 19, ';'); g.hline(a, b, 22, 'x'); g.set(Math.floor((a + b) / 2), 21, 'L');
  }
  g.hline(10, 38, 19, '#'); for (const x of [14, 22, 30]) g.set(x, 19, ';');
  g.floor(35, 20, 38, 22); g.set(36, 19, '.'); g.set(36, 22, 'M');
  for (const x of [4, 12, 20, 28, 36]) { g.set(x, 6, 'L'); g.set(x, 17, 'L'); }
  g.scatter(rnd, 1, 5, 38, 18, ':', 10); g.scatter(rnd, 4, 9, 34, 14, '%', 3);
  return g;
}

function buildArea5(rnd) { // Server Hall
  const g = new MapGrid(46, 26);
  g.floor(1, 1, 33, 24);
  g.set(0, 12, '<'); g.set(45, 18, 'H');
  for (const z of [3, 6, 9, 15, 18, 21]) for (let x = 4; x <= 30; x++) if (x !== 12 && x !== 13 && x !== 22) g.set(x, z, 'R');
  // control room with a glass wall onto the hall
  g.vline(34, 0, 25, '#'); g.floor(35, 1, 44, 9); g.hline(34, 45, 10, '#');
  g.vline(34, 2, 8, '~'); g.set(34, 5, '.');
  g.put([[36, 2], [37, 2], [39, 2], [40, 2], [42, 2]], 'q'); g.set(41, 2, 'Q'); g.put([[37, 3], [41, 3]], 'h');
  g.set(38, 7, 'n'); g.set(39, 5, 'L');
  // east corridor to the blast door, UPS room as the safe room
  g.floor(35, 11, 44, 18); g.set(34, 13, '.');
  g.fill(34, 19, 45, 25, '#'); g.fill(36, 20, 44, 24, 's'); g.set(40, 19, 'S');
  g.put([[44, 20], [44, 21], [44, 22]], 'R'); g.set(39, 22, 'L');
  g.put([[36, 11], [37, 11], [44, 11]], 'x');
  g.set(2, 24, 'M');
  for (const [x, z] of [[8, 1], [18, 1], [27, 1], [8, 12], [18, 12], [27, 12], [8, 24], [18, 24], [27, 24], [40, 14]]) g.set(x, z, 'L');
  for (const z of [3, 4, 7, 8, 9, 15, 16, 17, 20, 21]) { g.set(1, z, 'Y'); g.set(2, z, 'Y'); }
  g.put([[22, 12], [22, 13]], 'Y');
  g.scatter(rnd, 1, 1, 33, 24, ':', 12);
  return g;
}

function buildArea6(rnd) { // Maintenance Tunnels
  // Utility tunnels under the facility, laid out like the real thing: a main spine from the stairwell, a north
  // and a south service run, a pump junction at the east end - and the way out is a bulkhead with two release
  // levers, one at the far end of each service run. Both have to be down at once, and a pulled lever only
  // holds for so long. Crawl ducts cut the corners for anyone who can get down into them; it can't, quickly.
  const g = new MapGrid(44, 26);
  g.floor(1, 11, 29, 13);                    // the spine
  g.set(0, 12, '<');
  g.floor(11, 4, 12, 10);                    // up to the north run
  g.floor(11, 2, 38, 4);                     // north service run
  g.floor(17, 14, 18, 19);                   // down to the south run
  g.floor(3, 20, 38, 22);                    // south service run
  g.fill(24, 20, 31, 22, 'w');               // flooded: every step is heard
  g.floor(30, 8, 37, 16);                    // the pump junction
  g.floor(36, 17, 37, 19);                   // its stair down to the south run
  g.floor(38, 11, 42, 13);                   // the bulkhead passage
  g.set(43, 12, 'A');                        // the bulkhead
  // crawl ducts: low, tight, quick for a person on their knees
  g.fill(22, 5, 22, 10, '=');
  g.fill(9, 14, 9, 19, '=');
  // the release levers, one at the far end of each run
  g.set(38, 3, 'J'); g.set(3, 21, 'J');
  // shelter: an old tool store off the spine
  g.fill(2, 5, 8, 10, '#'); g.fill(3, 6, 7, 9, 's'); g.set(5, 10, 'S'); g.set(5, 7, '*'); g.set(7, 9, 'l');
  // the vent it lives behind, in the north wall of the spine
  g.set(15, 11, 'M');
  // pump machinery, the note, pipe stacks crowding the runs
  g.fill(32, 10, 33, 11, 'm'); g.fill(35, 13, 36, 14, 'm');
  g.set(31, 15, 'n');
  g.put([[6, 13], [20, 11], [26, 13], [16, 2], [28, 4], [13, 22], [34, 20], [30, 8], [37, 16]], 'p');
  // light: bare bulbs on the runs, red emergency lamps at the turns
  g.put([[4, 11], [10, 13], [16, 13], [24, 11], [14, 3], [20, 3], [26, 3], [32, 3], [8, 21], [15, 21], [21, 21], [34, 22], [33, 12]], '*');
  g.put([[11, 10], [18, 14], [37, 3], [4, 22], [38, 12], [30, 13]], '!');
  g.scatter(rnd, 1, 11, 29, 13, ':', 5); g.scatter(rnd, 11, 2, 38, 4, ':', 4); g.scatter(rnd, 3, 20, 23, 22, ':', 3); g.scatter(rnd, 1, 2, 42, 22, '%', 3);
  return g;
}

function buildArea7(rnd) { // Pump Station
  const g = new MapGrid(44, 26);
  g.fill(1, 1, 42, 24, 'w');
  g.floor(1, 1, 42, 2); g.floor(1, 23, 42, 24); g.floor(30, 11, 42, 13); g.floor(1, 17, 4, 22);
  g.set(0, 18, '<'); g.set(43, 12, 'V');
  for (const [x, z] of [[8, 6], [16, 15], [24, 6], [16, 7], [8, 15]]) g.fill(x, z, x + 2, z + 1, 'm');
  for (const [x, z] of [[12, 10], [12, 11], [20, 13], [20, 14], [28, 18], [28, 19], [34, 6], [34, 7]]) g.set(x, z, 'p');
  g.set(10, 1, 'v'); g.set(34, 24, 'v');
  // control booth = safe room
  g.fill(0, 3, 8, 9, '#'); g.fill(1, 4, 7, 8, 's'); g.set(5, 3, 'S'); g.put([[1, 4], [2, 4]], 'q'); g.set(4, 6, 'L'); g.set(7, 8, 'n');
  g.set(20, 24, 'M');
  for (const [x, z] of [[6, 1], [18, 1], [30, 1], [40, 1], [6, 24], [18, 24], [30, 24], [36, 12], [2, 20]]) g.set(x, z, 'L');
  g.put([[14, 1], [26, 1], [38, 24], [12, 24]], '!');
  g.scatter(rnd, 1, 1, 42, 2, ':', 5); g.scatter(rnd, 1, 23, 42, 24, ':', 5);
  return g;
}

function buildArea8(rnd) { // Containment
  const g = new MapGrid(46, 24);
  g.floor(1, 11, 44, 12);
  g.set(0, 11, '<'); g.set(45, 12, 'K');
  g.hline(1, 44, 10, '#'); g.hline(1, 44, 13, '#');
  const cells = [[1, 5], [7, 11], [13, 17], [19, 23], [25, 29], [31, 35]];
  cells.forEach(([a, b], i) => {
    g.floor(a, 2, b, 9); g.floor(a, 14, b, 21);
    g.hline(a, b, 10, '|'); g.hline(a, b, 13, '|');
    g.set(a + 2, 10, i % 2 ? '|' : '.'); g.set(a + 2, 13, i % 3 === 1 ? '.' : '|');
    g.set(a + 1, 3, 'b'); g.set(a + 1, 20, 'b'); g.set(b - 1, 6, '%'); g.set(b - 1, 17, '%');
    if (b + 1 < 37) { g.vline(b + 1, 1, 9, '#'); g.vline(b + 1, 14, 22, '#'); }
  });
  g.set(21, 1, '='); g.set(21, 0, '#'); g.fill(20, 2, 22, 3, '.'); g.set(21, 2, 'M'); g.put([[20, 4], [22, 5], [19, 7]], '%'); g.set(21, 10, '.');
  // observation room with the keycard
  g.floor(37, 1, 44, 9); g.vline(36, 1, 9, '~'); g.set(36, 9, '#'); g.set(40, 10, '.');
  g.put([[38, 2], [39, 2], [40, 2], [41, 2]], 'q'); g.set(39, 3, 'h'); g.set(43, 7, 'k'); g.set(42, 4, 'n'); g.set(40, 6, 'L');
  // guard room = safe room
  g.fill(36, 13, 45, 23, '#'); g.fill(37, 14, 44, 22, 's'); g.set(40, 13, 'S'); g.put([[44, 14], [44, 15]], 'l'); g.set(40, 18, 'L');
  for (const x of [4, 10, 16, 22, 28, 34, 40]) g.set(x, 11, '!');
  for (const [a] of cells) { g.set(a + 3, 5, 'L'); g.set(a + 3, 18, '!'); }
  g.scatter(rnd, 1, 11, 44, 12, '%', 5);
  return g;
}

function buildArea9(rnd) { // Generator Hall
  const g = new MapGrid(48, 28);
  g.floor(1, 1, 36, 26);
  g.set(0, 4, '<'); g.set(47, 13, 'P');
  for (const [x, z] of [[7, 4], [7, 18], [21, 11], [21, 22]]) g.fill(x, z, x + 4, z + 2, 'e');
  for (const [x, z] of [[15, 2], [15, 3], [29, 7], [29, 8], [15, 24], [29, 19]]) g.set(x, z, 'p');
  g.set(36, 13, 'G'); g.set(14, 12, 'f');
  // side rooms
  g.vline(37, 0, 27, '#');
  g.room(37, 0, 47, 9); g.set(37, 5, '.'); g.set(45, 2, 'f'); g.put([[39, 2], [40, 2]], 'q'); g.set(42, 5, 'L'); g.set(39, 7, 'x');
  g.room(37, 18, 47, 27); g.set(37, 22, '.'); g.set(45, 25, 'f'); g.put([[44, 19], [45, 19], [46, 19]], '$'); g.set(42, 22, 'L');
  g.room(37, 9, 47, 18); g.set(37, 15, '.'); g.set(47, 13, 'P'); g.set(42, 13, 'L'); g.put([[39, 10], [40, 10]], 'q');
  // control booth = safe room
  g.fill(0, 10, 6, 17, '#'); g.fill(1, 11, 5, 16, 's'); g.set(6, 13, 'S'); g.set(3, 13, 'L'); g.put([[1, 11], [2, 11]], 'q'); g.set(1, 16, 'n');
  g.set(30, 26, 'M');
  for (const [x, z] of [[5, 2], [18, 2], [32, 2], [5, 25], [18, 25], [32, 25], [18, 14], [32, 14], [12, 9], [26, 18]]) g.set(x, z, 'L');
  for (let z = 2; z <= 8; z++) g.set(34, z, '^');   // the stair up to the catwalk: you can climb it now
  g.fill(7, 24, 10, 26, 'Y'); g.fill(12, 24, 15, 26, 'Y');
  g.put([[36, 11], [36, 15], [2, 9], [20, 26]], '!');
  g.scatter(rnd, 1, 1, 36, 26, ':', 14); g.scatter(rnd, 1, 1, 36, 26, '%', 3);
  return g;
}

function buildArea10(rnd) { // Freight Lift
  const g = new MapGrid(40, 22);
  g.floor(1, 1, 31, 20);
  g.set(0, 11, '<');
  g.fill(32, 6, 39, 16, '#'); g.fill(33, 8, 38, 14, 'z'); g.put([[32, 10], [32, 11], [32, 12]], 'Z');
  g.set(31, 8, 'u');
  for (const [x, z] of [[8, 3], [9, 3], [8, 4], [22, 3], [23, 3], [14, 8], [15, 8], [22, 15], [23, 15], [24, 15], [12, 17]]) g.set(x, z, 'X');
  g.put([[27, 4], [28, 4], [27, 17], [5, 7]], 'o'); g.put([[18, 12], [19, 12]], 'x');
  // safe room
  g.fill(0, 15, 9, 21, '#'); g.fill(1, 16, 8, 20, 's'); g.set(5, 15, 'S'); g.set(4, 18, 'L'); g.set(8, 20, 'n'); g.put([[1, 16], [1, 17]], 'l');
  g.set(20, 1, 'M');
  for (const [x, z] of [[6, 11], [14, 4], [14, 16], [22, 9], [28, 12], [30, 18], [30, 4]]) g.set(x, z, '!');
  for (const [x, z] of [[11, 11], [20, 6], [26, 11]]) g.set(x, z, 'L');
  g.set(24, 9, 'Y');
  g.scatter(rnd, 1, 1, 31, 20, ':', 14); g.scatter(rnd, 1, 1, 31, 20, '%', 4);
  return g;
}

const AREA_BUILDERS = [buildArea1, buildArea2, buildArea3, buildArea4, buildArea5, buildArea6, buildArea7, buildArea8, buildArea9, buildArea10];
// Fixed seeds keep every map identical for every player; a seed is skipped if its map fails the checks.
// Each level is its own set of maps: Reach - B4 is the facility, Seize - B5 what is under it.
function levelDef(lv) { return (typeof LEVELS !== 'undefined' && LEVELS[lv]) || { builders: AREA_BUILDERS, meta: AREA_META, seed: 9100 }; }
function buildAllMaps(lv = 'l1') {
  const D = levelDef(lv), n = D.builders.length;
  return D.builders.map((fn, i) => {
    let rows = null, w = 0, h = 0;
    for (let attempt = 0; attempt < 40; attempt++) {
      const g = fn(mulberry32(D.seed + i * 77 + attempt * 1013));
      const problems = checkAreaRows(g.rows(), i, n);
      if (!problems.length || attempt === 39) { rows = g.rows(); w = g.w; h = g.h; break; }
    }
    return Object.assign({ index: i, rows, w, h }, D.meta[i]);
  });
}
