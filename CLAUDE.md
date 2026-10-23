# REACH

- Source is in `src/` (`01-head.html`, `02-body.html`, then the numbered `.js` files, concatenated in the order listed in `build.sh`).
- Build: `sh build.sh` → `dist/reach.html` (artifact page, no wrapper), `standalone/index.html` and root `index.html` (full page), `dist/check.js` (syntax check via `node --check`).
- Never edit the built HTML files directly; edit `src/` and rebuild.
- Three.js r128 from cdnjs. Online play: the artifact "room" capability inside Claude, PeerJS in the standalone build (`src/50-net.js`). Public rooms and the "Find a room" list are `src/50-rooms.js` (lobby presence in Claude, PeerJS "slot" ids `reach-jason-pub-N` standalone).
- Menus: lobby markup in `02-body.html`, wired in `60-main.js`; settings are a pop-up card (`#settings`) opened from the corner gear in the lobby or Settings on the pause card.
- Level 1 is "Reach - B4", Level 2 is "Seize - B5", Level 3 is "Breach - A1". Levels 2 and 3 are early access (code 6020). Level 3's ending leads to Level 4 (not made yet).
- Monsters on levels 2 and 3 are "beasts" (`src/45-beast.js`): SDF models meshed in the browser. The Chud is `46-chud.js` (+ AI in `47-seize.js`), the Pale is `49-pale.js`, the giant hand in the Level 3 ending is in `59-surface.js`.
- Level 2 rooms are dressed in `48-wards.js`; Level 3 maps, rooms and the hatch are `51-breach.js`; level endings are `57-ending.js` (L1, L2) and `59-surface.js` (L3).
- The owner prefers short, simple answers.
