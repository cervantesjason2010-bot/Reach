# REACH

- Source is in `src/` (`01-head.html`, `02-body.html`, then the numbered `.js` files, concatenated in the order listed in `build.sh`).
- Build: `sh build.sh` → `dist/reach.html` (artifact page, no wrapper), `standalone/index.html` and root `index.html` (full page), `dist/check.js` (syntax check via `node --check`).
- Never edit the built HTML files directly; edit `src/` and rebuild.
- Three.js r128 from cdnjs. Online play: the artifact "room" capability inside Claude, PeerJS in the standalone build (`src/50-net.js`).
- Level 1 is "Reach - B4", Level 2 is "Seize - B5" (early access code 6020).
- The owner prefers short, simple answers.
