// ================= textures: procedural PBR sets (color, normal, roughness) =================
const Tex = { sets: {}, mats: {}, aniso: 1 };

function getTexSet(name) {
  if (!Tex.sets[name]) Tex.sets[name] = bakeGpuSet(name);
  return Tex.sets[name];
}

// Materials keyed by name; colors are multiplied over the baked albedo. Roughness and metalness come from the textures.
const MAT_DEFS = {
  concrete: { tex: 'concrete', ns: 1.0, tile: 2 },
  concreteDark: { tex: 'concrete', ns: 1.0, color: 0x76767a, tile: 2 },
  algae: { tex: 'concrete', ns: 1.1, color: 0x7d8c78, tile: 2 },
  block: { tex: 'block', ns: 1.0 },
  blockGrey: { tex: 'block', ns: 1.0, color: 0x9a9da2 },
  blockGreen: { tex: 'block', ns: 1.0, color: 0x8fa596 },
  floor: { tex: 'floor', ns: 0.9, tile: 3, slab: true },
  floorWet: { tex: 'floor', ns: 0.9, rough: 0.6, tile: 3, slab: true },
  metal: { tex: 'metal', ns: 0.8 },
  metalDark: { tex: 'metal', ns: 0.8, color: 0x5a5e64 },
  plate: { tex: 'plate', ns: 1.0, tile: 1 },
  plateDark: { tex: 'plate', ns: 1.0, color: 0x6a6e72, tile: 1 },
  paint: { tex: 'paint', ns: 0.7 },
  carpet: { tex: 'carpet', ns: 0.8, tile: 4 },
  tile: { tex: 'tile', ns: 0.9, tile: 3 },
  tileCold: { tex: 'tile', ns: 0.9, color: 0xaebcc6, tile: 3 },
  tilefloor: { tex: 'tilefloor', ns: 0.8, tile: 4 },
  rust: { tex: 'rust', ns: 1.0 },
  wood: { tex: 'wood', ns: 0.9 },
  grate: { tex: 'grate', ns: 1.2 },
  panel: { tex: 'panel', ns: 0.7, tile: 3 },
  steel: { tex: 'steel', ns: 0.5 },
  steelDark: { tex: 'steel', ns: 0.5, color: 0x45494e },
  skin: { tex: 'skin', ns: 1.0 },
  fabric: { tex: 'fabric', ns: 0.6 },
  card: { tex: 'card', ns: 0.8 },
  tread: { tex: 'tread', ns: 1.0 },
};
function mat(name, opts) {
  const key = name + (opts ? JSON.stringify(opts) : '');
  if (Tex.mats[key]) return Tex.mats[key];
  const d = MAT_DEFS[name];
  let m;
  if (d) {
    const t = getTexSet(d.tex);
    m = new THREE.MeshStandardMaterial({
      map: t.map, normalMap: t.normalMap,
      roughness: d.rough !== undefined ? d.rough : 1, metalness: 1,
      color: new THREE.Color(d.color !== undefined ? d.color : 0xffffff),
    });
    m.normalScale = new THREE.Vector2(d.ns, d.ns);
  } else {
    m = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 });
  }
  m.name = key;
  if (opts) {
    if (opts.color !== undefined) m.color = new THREE.Color(opts.color);
    if (opts.emissive !== undefined) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.ei !== undefined ? opts.ei : 1; }
    if (opts.rough !== undefined) m.roughness = opts.rough;
    if (opts.metal !== undefined) m.metalness = opts.metal;
    if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity; m.depthWrite = false; }
    if (opts.side === 'double') m.side = THREE.DoubleSide;
  }
  if (d && d.tile) { m.userData.wTile = d.tile; m.userData.wSlab = !!d.slab; }
  worldShader(m, opts && opts.ws);
  Tex.mats[key] = m;
  return m;
}
function plainMat(color, opts = {}) {
  const key = 'plain' + color + JSON.stringify(opts);
  if (Tex.mats[key]) return Tex.mats[key];
  const o = Object.assign({}, opts); const ws = o.ws; delete o.ws;
  const m = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.7, metalness: 0 }, o));
  if (o.emissive !== undefined) m.emissive = new THREE.Color(o.emissive);
  worldShader(m, ws);
  Tex.mats[key] = m;
  return m;
}
function basicMat(color, opts = {}) {
  const key = 'basic' + color + JSON.stringify(opts);
  if (Tex.mats[key]) return Tex.mats[key];
  const m = new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(color) }, opts));
  Tex.mats[key] = m;
  return m;
}

// Canvas helpers for signs, screens and paper
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = Tex.aniso;
  return t;
}
