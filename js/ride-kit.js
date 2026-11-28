/* ride-kit.js — shared helpers for the 3D bike ride (needs THREE, loaded only when a ride starts).
   Units are metres. y is up, x is east, z is south. Colours are used as written (no colour management).
   The look: soft low-poly, Lambert shading, one sun + sky light, no shadow maps (round "blob" shadows instead).

   Modelling vocabulary — build an object from painted primitives and merge them into ONE mesh:
     const { g, mesh } = DU.rideKit;
     const cone = mesh([ g(new THREE.ConeGeometry(.18, .5, 10), '#ff8a3d', 0, .25, 0), g(new THREE.BoxGeometry(.4, .04, .4), '#ff8a3d', 0, .02, 0) ]);
   Every such mesh shares the same vertex-coloured material, so it costs one draw call. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const T = window.THREE;
  const K = (DU.rideKit = {});

  /* ---------- palette (keep the whole ride in this family) ---------- */
  K.PAL = {
    skyTop: '#58b0ff', skyMid: '#a9dcff', horizon: '#e6f5ff', fog: '#d9eeff', sun: '#fff3d6',
    pavement: '#ece2d2', pavementDark: '#ddd1be', kerb: '#cfc5b6', asphalt: '#667080', asphaltDark: '#565f6e',
    paint: '#f7f3ea', bikeLane: '#8fd3a4', zebra: '#fbf8f0', plaza: '#e7d6bf',
    grass: '#a3dc7f', grassDark: '#86c96a', sand: '#f0dfb0', water: '#7fd0ee', waterDeep: '#58b6dd',
    leaf: ['#5cb86b', '#46a45e', '#7ccb6a', '#3f9a5b', '#93d472'], trunk: '#8f6d52', palm: '#6dbb63',
    wall: ['#fdf8ee', '#f7eeda', '#f1e6d0', '#fbf1e6', '#f6e2d6', '#f9ecc0', '#e9f0ea', '#f3ead9'],
    wallShade: '#e3d6bf', balcony: '#ffffff', roof: '#e8dfcf', roofDark: '#cfc4b0', shutter: ['#7fb7a5', '#8fa9c9', '#c9a27a', '#b9b9b9', '#e79a8a'],
    glass: '#a8d8ec', glassDark: '#7fb9d6', frame: '#f5f7f8', door: '#b0805a', window: '#8fc6e4', windowDark: '#5e8fb3',
    pink: '#ff8fc0', purple: '#b99cff', yellow: '#ffd54d', teal: '#7de3e0', red: '#ff6b6b', orange: '#ff9d4d', blue: '#5aa9ff', green: '#63c98a',
    white: '#ffffff', dark: '#3a3550', metal: '#b9c2cc', tyre: '#3c3f4a',
  };

  /* seeded random: const r = K.rng(7); r() → 0…1 */
  K.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- materials ---------- */
  const mats = {};
  /* the shared vertex-coloured material (use with g() / mesh()) */
  K.vmat = function (opts = {}) {
    const key = 'v' + (opts.transparent ? 't' : '') + (opts.side || '') + (opts.fog === false ? 'n' : '');
    if (!mats[key]) mats[key] = new T.MeshLambertMaterial(Object.assign({ vertexColors: true }, opts));
    return mats[key];
  };
  /* a cached plain-colour Lambert material */
  K.mat = function (color, opts) {
    const key = color + (opts ? JSON.stringify(opts) : '');
    if (!mats[key]) mats[key] = new T.MeshLambertMaterial(Object.assign({ color }, opts || {}));
    return mats[key];
  };

  /* ---------- geometry ---------- */
  const _c = new T.Color(), _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3();
  /* paint every vertex of a geometry with one colour (adds the `color` attribute) */
  K.paint = function (geom, color) {
    _c.set(color);
    const count = geom.attributes.position.count, arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
    geom.setAttribute('color', new T.BufferAttribute(arr, 3));
    return geom;
  };
  /* g(geometry, colour, x, y, z, rotX, rotY, rotZ, scaleX, scaleY, scaleZ) → a painted, placed, non-indexed copy.
     Pass flat = true (last argument) for faceted shading. The source geometry is not changed. */
  K.g = function (geom, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, flat = false) {
    let o = geom.index ? geom.toNonIndexed() : geom.clone();
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz));
    o.applyMatrix4(_m);
    if (flat) o.computeVertexNormals();
    if (!o.attributes.normal) o.computeVertexNormals();
    return K.paint(o, color);
  };
  /* merge geometries (the attributes they all share are kept) into one BufferGeometry */
  K.merge = function (geoms) {
    const list = geoms.filter(Boolean).map((x) => (x.index ? x.toNonIndexed() : x));
    const out = new T.BufferGeometry();
    if (!list.length) return out;
    const names = Object.keys(list[0].attributes).filter((nm) => list.every((x) => x.attributes[nm]));
    names.forEach((nm) => {
      const size = list[0].attributes[nm].itemSize;
      let total = 0;
      list.forEach((x) => (total += x.attributes[nm].count));
      const arr = new Float32Array(total * size);
      let o = 0;
      list.forEach((x) => { arr.set(x.attributes[nm].array, o); o += x.attributes[nm].count * size; });
      out.setAttribute(nm, new T.BufferAttribute(arr, size));
    });
    return out;
  };
  /* one mesh from painted parts */
  K.mesh = function (parts, material) {
    return new T.Mesh(K.merge(parts), material || K.vmat());
  };

  /* ---------- textures ---------- */
  K.canvasTex = function (w, h, draw, opts = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new T.CanvasTexture(c);
    if (opts.repeat) { tex.wrapS = tex.wrapT = T.RepeatWrapping; }
    tex.anisotropy = opts.anisotropy || 4;
    return tex;
  };
  /* wait for the game font so canvas text is drawn in it */
  K.fontsReady = function () {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([document.fonts.load('700 40px Fredoka', 'אב'), document.fonts.load('500 40px Fredoka', 'אב')]).catch(() => {});
  };
  K.FONT = "Fredoka, system-ui, -apple-system, 'Arial Hebrew', Arial, sans-serif";
  /* a flat sign with text. opts: { h (metres, text height of the plate), bg, fg, pad, weight, border, radius } → Mesh (plane facing +Z, centre origin) */
  K.sign = function (text, opts = {}) {
    const px = 96, pad = opts.pad === undefined ? 0.5 : opts.pad;
    const font = `${opts.weight || 700} ${px}px ${K.FONT}`;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font;
    const tw = Math.ceil(probe.measureText(text).width), W = tw + px * pad * 2, H = px * (1 + pad * 1.1);
    const tex = K.canvasTex(W, H, (ctx) => {
      const r = (opts.radius === undefined ? 0.28 : opts.radius) * H;
      ctx.beginPath();
      ctx.moveTo(r, 0); ctx.arcTo(W, 0, W, H, r); ctx.arcTo(W, H, 0, H, r); ctx.arcTo(0, H, 0, 0, r); ctx.arcTo(0, 0, W, 0, r); ctx.closePath();
      ctx.fillStyle = opts.bg || '#2f6fd6'; ctx.fill();
      if (opts.border) { ctx.lineWidth = px * 0.09; ctx.strokeStyle = opts.border; ctx.stroke(); }
      ctx.font = font; ctx.fillStyle = opts.fg || '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
      ctx.fillText(text, W / 2, H * 0.53);
    });
    const hM = opts.h || 0.5, wM = (hM * W) / H;
    const m = new T.Mesh(new T.PlaneGeometry(wM, hM), new T.MeshBasicMaterial({ map: tex, transparent: true, side: opts.double ? T.DoubleSide : T.FrontSide }));
    m.userData.w = wM; m.userData.h = hM;
    return m;
  };

  /* ---------- the route ----------
     K.path(data) → { length, at(s, out), near(x, z), count, alt } ; at() gives the point at s metres from the start:
     { x, z, tx, tz (unit direction of travel), nx, nz (unit vector to the RIGHT of travel), y, slope }.
     A thing at "s metres along, lat metres to the right" is at (x + nx * lat, z + nz * lat).
     Heights: data.alt (optional) holds one height in metres per route point. Then y is the height of the way at s
     and slope its rise per metre along it (+ = uphill), and path.alt is true. s stays the distance on the map.
     Without data.alt the way is flat: y = 0, slope = 0, path.alt = false. Beyond both ends it goes on level. */
  K.path = function (data) {
    const r = data.route, N = r.length / 2, cum = new Float32Array(N);
    for (let i = 1; i < N; i++) cum[i] = cum[i - 1] + Math.hypot(r[i * 2] - r[i * 2 - 2], r[i * 2 + 1] - r[i * 2 - 1]);
    const length = cum[N - 1];
    const alt = data.alt && data.alt.length >= N ? data.alt : null;
    /* the slope at a route point: from its two neighbours, so it changes smoothly along the way */
    const slopeAt = (i) => { const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1); return (alt[b] - alt[a]) / (cum[b] - cum[a] || 1); };
    const dirAt = (i) => {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
      const dx = r[b * 2] - r[a * 2], dz = r[b * 2 + 1] - r[a * 2 + 1], l = Math.hypot(dx, dz) || 1;
      return [dx / l, dz / l];
    };
    function at(s, out = {}) {
      const sc = Math.max(0, Math.min(length, s));
      let lo = 0, hi = N - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= sc) lo = mid; else hi = mid; }
      const seg = cum[hi] - cum[lo] || 1, k = (sc - cum[lo]) / seg;
      const d0 = dirAt(lo), d1 = dirAt(hi);
      let tx = d0[0] + (d1[0] - d0[0]) * k, tz = d0[1] + (d1[1] - d0[1]) * k;
      const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const over = s - sc; // beyond the ends: keep going straight
      out.x = r[lo * 2] + (r[hi * 2] - r[lo * 2]) * k + tx * over;
      out.z = r[lo * 2 + 1] + (r[hi * 2 + 1] - r[lo * 2 + 1]) * k + tz * over;
      out.tx = tx; out.tz = tz; out.nx = -tz; out.nz = tx;
      if (alt) {
        out.y = alt[lo] + (alt[hi] - alt[lo]) * k;
        if (over) out.slope = 0; else { const g0 = slopeAt(lo); out.slope = g0 + (slopeAt(hi) - g0) * k; }
      } else { out.y = 0; out.slope = 0; }
      return out;
    }
    /* nearest point of the route to (x, z) → { s, lat (signed, + = right), d } */
    function near(x, z) {
      let best = 1e9, bi = 0;
      for (let i = 0; i < N; i++) { const d = (r[i * 2] - x) ** 2 + (r[i * 2 + 1] - z) ** 2; if (d < best) { best = d; bi = i; } }
      const p = at(cum[bi]);
      const lat = (x - p.x) * p.nx + (z - p.z) * p.nz, along = (x - p.x) * p.tx + (z - p.z) * p.tz;
      return { s: cum[bi] + along, lat, d: Math.sqrt(best) };
    }
    return { length, at, near, count: N, alt: !!alt };
  };

  /* ---------- little things ---------- */
  let blobTex = null;
  /* a soft round shadow lying on the ground (put it at y ≈ 0.03 under things) */
  K.blob = function (radius = 0.6, opacity = 0.28) {
    if (!blobTex) blobTex = K.canvasTex(64, 64, (ctx) => {
      const gr = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(40,40,70,1)'); gr.addColorStop(0.6, 'rgba(40,40,70,.55)'); gr.addColorStop(1, 'rgba(40,40,70,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
    });
    const m = new T.Mesh(new T.PlaneGeometry(radius * 2, radius * 2), new T.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    m.renderOrder = 1;
    m.userData.shadow = true; // on a sloping way the game tilts these to lie on it
    return m;
  };
  /* free the GPU memory of everything under obj */
  K.dispose = function (obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    Object.keys(mats).forEach((k) => delete mats[k]);
    blobTex = null;
  };
})();
