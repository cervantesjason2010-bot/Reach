#!/bin/sh
# Builds two files: the artifact page (no document wrapper) and a standalone index.html.
set -e
cd "$(dirname "$0")"
JS="src/10-core.js src/12-maps.js src/14-level.js src/20-audio.js src/30-textures.js src/31-gputex.js src/32-geo.js src/33-props.js src/34-world.js src/35-dynamic.js src/36-render.js src/37-dress.js src/38-shading.js src/39-lift.js src/40-creature.js src/42-humans.js src/44-lair.js src/45-beast.js src/46-chud.js src/47-seize.js src/48-wards.js src/50-net.js src/52-game.js src/53-player.js src/54-hud.js src/56-cinema.js src/57-ending.js src/58-kill.js src/60-main.js"
mkdir -p dist standalone
body() {
  cat src/01-head.html
  cat src/02-body.html
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
  echo '<script>'
  echo '(() => {'
  echo "'use strict';"
  cat $JS
  echo '})();'
  echo '</script>'
}
body > dist/reach.html
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
  body
  echo '</body></html>'
} > standalone/index.html
{ echo '(() => {'; echo "'use strict';"; cat $JS; echo '})();'; } > dist/check.js
node --check dist/check.js && echo "syntax ok"
wc -c dist/reach.html standalone/index.html | tail -1
cp standalone/index.html index.html
