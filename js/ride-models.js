/* ride-models.js — the small moving things along the bike ride: stars to collect, things in the way,
   pigeons and cats, cars and buses, the townsfolk, the traffic light and the finish arch.
   Needs THREE + ride-kit.js (both loaded only when a ride starts).

     const star = DU.rideModels.make('star', { seed: 3 });   // a THREE.Group
     scene.add(star); … every frame: star.userData.update(dt, t);

   Every group: origin on the ground at its centre, front = +Z, y up, metres.
   group.userData = { kind, r (collision radius), h (height), update(dt, t), …actions }.
   Geometry is cached per kind + variant, so making many of the same thing is cheap. Models never move their
   own group, except: a fleeing pigeon and a rolling ball. See the table at the bottom for kinds and actions. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const M = (DU.rideModels = {});
  const PI = Math.PI, TAU = PI * 2;
  let T, K, P, UP, DOWN, Va, Vb, Vd, Qa, Ea;
  let GEO = {}, MAT = {}, TEX = {}, auto = 0;
  const NOOP = function () {};

  function ready() {
    if (K && T === window.THREE) return;
    T = window.THREE; K = DU.rideKit; P = K.PAL;
    UP = new T.Vector3(0, 1, 0); DOWN = new T.Vector3(0, -1, 0);
    Va = new T.Vector3(); Vb = new T.Vector3(); Vd = new T.Vector3(); Qa = new T.Quaternion(); Ea = new T.Euler();
  }
  /* forget every cached geometry / material (after the kit disposed a whole scene they are still usable, so this is optional) */
  M.reset = function () { GEO = {}; MAT = {}; TEX = {}; };

  /* ---------- small helpers ---------- */
  const geo = (key, build) => GEO[key] || (GEO[key] = build());
  const mk = (key, parts, mat) => new T.Mesh(geo(key, () => K.merge(parts())), mat || K.vmat());
  const pick = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];
  const gb = (w, h, d, col, x, y, z, rx, ry, rz) => K.g(new T.BoxGeometry(w, h, d), col, x, y, z, rx || 0, ry || 0, rz || 0);
  const gc = (rt, rb, h, seg, col, x, y, z, rx, ry, rz) => K.g(new T.CylinderGeometry(rt, rb, h, seg), col, x, y, z, rx || 0, ry || 0, rz || 0);
  const gs = (r, col, x, y, z, sx = 1, sy = 1, sz = 1, ws = 8, hs = 6, flat = false) => K.g(new T.SphereGeometry(r, ws, hs), col, x, y, z, 0, 0, 0, sx, sy, sz, flat);
  /* a wheel-like disc whose axis is X */
  const disc = (r, w, seg, col, x, y, z) => K.g(new T.CylinderGeometry(r, r, w, seg), col, x, y, z, 0, 0, PI / 2);
  /* a round lamp / plate facing +Z */
  const lamp = (r, d, seg, col, x, y, z) => K.g(new T.CylinderGeometry(r, r, d, seg), col, x, y, z, PI / 2, 0, 0);
  /* a rod from p1 to p2 (radius r at p1, r2 at p2) */
  function tube(p1, p2, r, col, seg, r2) {
    Va.set(p1[0], p1[1], p1[2]); Vb.set(p2[0], p2[1], p2[2]); Vd.subVectors(Vb, Va);
    const len = Vd.length(); Vd.normalize(); Qa.setFromUnitVectors(UP, Vd); Ea.setFromQuaternion(Qa);
    return K.g(new T.CylinderGeometry(r2 === undefined ? r : r2, r, len, seg || 5), col, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2, Ea.x, Ea.y, Ea.z);
  }
  /* rounded rectangle; r = one radius or [bottom-left, bottom-right, top-right, top-left] */
  function rrect(x0, y0, x1, y1, r) {
    const q = Array.isArray(r) ? r : [r, r, r, r], s = new T.Shape();
    s.moveTo(x0 + q[0], y0); s.lineTo(x1 - q[1], y0); s.quadraticCurveTo(x1, y0, x1, y0 + q[1]);
    s.lineTo(x1, y1 - q[2]); s.quadraticCurveTo(x1, y1, x1 - q[2], y1);
    s.lineTo(x0 + q[3], y1); s.quadraticCurveTo(x0, y1, x0, y1 - q[3]);
    s.lineTo(x0, y0 + q[0]); s.quadraticCurveTo(x0, y0, x0 + q[0], y0);
    return s;
  }
  /* extrude a shape (in x/y) along z, centred on z; the bevel rounds the edges and grows the outline by `bevel` */
  function ext(shape, depth, bevel, col, x, y, z, rx, ry, rz, bsegs, csegs) {
    const e = new T.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: bsegs || 1, curveSegments: csegs || 3 });
    e.translate(0, 0, -depth / 2);
    return K.g(e, col, x || 0, y || 0, z || 0, rx || 0, ry || 0, rz || 0);
  }
  /* give each triangle its own colour: fn(faceIndex) → colour */
  function paintFaces(g, fn) {
    const c = new T.Color(), a = g.attributes.color.array;
    for (let f = 0; f < a.length / 9; f++) { c.set(fn(f)); for (let k = 0; k < 3; k++) { a[f * 9 + k * 3] = c.r; a[f * 9 + k * 3 + 1] = c.g; a[f * 9 + k * 3 + 2] = c.b; } }
    return g;
  }
  /* recolour the triangles whose centre fn(x, y, z) gives a colour for (null = keep) */
  function paintWhere(g, fn) {
    const c = new T.Color(), a = g.attributes.color.array, p = g.attributes.position.array;
    for (let f = 0; f < p.length / 9; f++) {
      const i = f * 9, col = fn((p[i] + p[i + 3] + p[i + 6]) / 3, (p[i + 1] + p[i + 4] + p[i + 7]) / 3, (p[i + 2] + p[i + 5] + p[i + 8]) / 3);
      if (!col) continue;
      c.set(col);
      for (let k = 0; k < 3; k++) { a[i + k * 3] = c.r; a[i + k * 3 + 1] = c.g; a[i + k * 3 + 2] = c.b; }
    }
    return g;
  }
  /* the soft shadow under a thing: radii along x and z */
  function shadow(grp, rx, rz, op) {
    const b = K.blob(1, op === undefined ? 0.26 : op);
    b.scale.set(rx, rz === undefined ? rx : rz, 1);
    grp.add(b);
    return b;
  }
  /* materials of our own (the kit's shared one is K.vmat()) */
  const glowMat = (key, emissive, k) => MAT[key] || (MAT[key] = new T.MeshLambertMaterial({ vertexColors: true, emissive: new T.Color(emissive), emissiveIntensity: k }));
  const litMat = () => MAT.lit || (MAT.lit = new T.MeshBasicMaterial({ vertexColors: true }));
  const groundMat = () => MAT.ground || (MAT.ground = new T.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  const twoSided = () => MAT.two || (MAT.two = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  function halo(color, size, opacity) {
    const tex = TEX.halo || (TEX.halo = K.canvasTex(64, 64, (c) => {
      const gr = c.createRadialGradient(32, 32, 1, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    }));
    const key = 'halo' + color + opacity;
    const mat = MAT[key] || (MAT[key] = new T.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false }));
    const s = new T.Sprite(mat);
    s.scale.set(size, size, 1);
    return s;
  }
  /* a damped wobble of `body` about its base. → step(dt). Adds u.bump(side). */
  function wobbler(u, body, o = {}) {
    let wt = -1, dir = 1;
    const amp = o.amp || 0.5, freq = o.freq || 13, damp = o.damp || 4, hop = o.hop === undefined ? 0.1 : o.hop, rz0 = body.rotation.z;
    u.bump = function (side) { wt = 0; dir = side < 0 ? -1 : side > 0 ? 1 : Math.random() < 0.5 ? -1 : 1; u.bumped = true; if (o.onBump) o.onBump(); };
    return function (dt) {
      if (wt < 0) return;
      wt += dt;
      const k = Math.exp(-damp * wt);
      body.rotation.z = rz0 + dir * amp * k * Math.sin(wt * freq);
      body.rotation.x = -amp * 0.45 * k * Math.sin(wt * freq * 0.8 + 0.5);
      body.position.y = hop * k * Math.abs(Math.sin(wt * freq * 0.5));
      if (k < 0.012) { wt = -1; body.rotation.set(0, body.rotation.y, rz0); body.position.y = 0; }
    };
  }

  const MAKERS = {};

  /* =====================================================================================
     things to collect
     ===================================================================================== */
  function starGeo(R, r, depth, bevel) {
    const s = new T.Shape();
    for (let i = 0; i < 10; i++) { const a = (i * PI) / 5, rad = i % 2 ? r : R, x = Math.sin(a) * rad, y = Math.cos(a) * rad; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    s.closePath();
    const e = new T.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 });
    e.translate(0, 0, -depth / 2);
    return e;
  }
  /* shared behaviour: float, spin, glow; collect() pops and fades; reset() brings it back (for pooling) */
  function collectible(grp, u, o, mesh, haloCol, size, seed) {
    const y0 = o.y === undefined ? 0.95 : o.y, ph = seed * 1.7, hs = size * 2.6;
    const inner = new T.Group();
    inner.position.y = y0;
    let hl = null;
    if (o.halo !== false) { hl = halo(haloCol, hs, 0.5); inner.add(hl); }
    inner.add(mesh);
    const sh = o.shadow === false ? null : shadow(grp, size * 0.42, size * 0.42, 0.18);
    grp.add(inner);
    u.r = Math.round(size * 62) / 100; u.h = Math.round((y0 + size * 0.55) * 100) / 100; u.gone = false; u.value = o.value || 1;
    let ct = -1, own = false;
    const eachMat = (fn) => inner.traverse((c) => { if (c.material) fn(c); });
    u.collect = function () {
      if (ct >= 0 || u.gone) return;
      ct = 0;
      if (!own) { own = true; eachMat((c) => { c.material = c.material.clone(); c.material.transparent = true; }); }
    };
    u.reset = function () {
      ct = -1; u.gone = false; grp.visible = true; inner.scale.setScalar(1);
      if (own) eachMat((c) => { c.material.opacity = c.isSprite ? 0.5 : 1; });
      if (sh) sh.material.opacity = 0.18;
    };
    u.update = function (dt, t) {
      if (u.gone) return;
      if (u.tick) u.tick(dt, t);
      if (ct < 0) {
        mesh.rotation.y = t * 2.4 + ph;
        inner.position.y = y0 + Math.sin(t * 2.6 + ph) * 0.07;
        if (hl) hl.scale.setScalar(hs * (1 + 0.1 * Math.sin(t * 5 + ph)));
        return;
      }
      ct += dt;
      const k = Math.min(1, ct / 0.4), e = 1 - (1 - k) * (1 - k);
      mesh.rotation.y += dt * 24;
      inner.scale.setScalar(1 + 0.9 * e);
      inner.position.y = y0 + 0.8 * e;
      eachMat((c) => { c.material.opacity = (c.isSprite ? 0.5 : 1) * (1 - k * k); });
      if (sh) sh.material.opacity = 0.18 * (1 - k);
      if (k >= 1) { u.gone = true; grp.visible = false; }
    };
  }
  MAKERS.star = function (grp, u, o, rnd, seed) {
    const m = new T.Mesh(geo('star', () => K.merge([K.g(starGeo(0.235, 0.115, 0.07, 0.045), '#ffd23f')])), glowMat('gold', '#ff9a00', 0.42));
    collectible(grp, u, o, m, '#fff3b0', 0.56, seed);
  };
  MAKERS.bigstar = function (grp, u, o, rnd, seed) {
    const m = new T.Mesh(geo('star', () => K.merge([K.g(starGeo(0.235, 0.115, 0.07, 0.045), '#ffd23f')])), glowMat('gold', '#ff9a00', 0.42));
    m.scale.setScalar(1.75);
    const ring = new T.Mesh(geo('starRing', () => {
      const parts = [];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; parts.push(K.g(new T.OctahedronGeometry(0.05), i % 2 ? '#ffffff' : '#fff3b0', Math.sin(a) * 0.36, Math.cos(a) * 0.36, 0, 0, 0, 0, 1, 1.7, 1)); }
      return K.merge(parts);
    }), glowMat('spark', '#ffe9a0', 0.6));
    m.add(ring);
    if (o.y === undefined) o = Object.assign({ y: 1.15 }, o);
    collectible(grp, u, Object.assign({ value: 5 }, o), m, '#fff3b0', 0.98, seed);
    u.tick = function (dt, t) { ring.rotation.z = -t * 1.6; };
  };
  MAKERS.heart = function (grp, u, o, rnd, seed) {
    const m = new T.Mesh(geo('heart', () => {
      const s = new T.Shape();
      s.moveTo(0, -0.21); s.bezierCurveTo(-0.36, 0.03, -0.2, 0.3, 0, 0.12); s.bezierCurveTo(0.2, 0.3, 0.36, 0.03, 0, -0.21);
      return K.merge([ext(s, 0.07, 0.05, '#ff7fb6', 0, 0, 0, 0, 0, 0, 2, 7)]);
    }), glowMat('pink', '#ff3d8a', 0.36));
    collectible(grp, u, Object.assign({ value: 3 }, o), m, '#ffd0e4', 0.54, seed);
  };
  MAKERS.gem = function (grp, u, o, rnd, seed) {
    const v = seed % 2, cols = v ? ['#b99cff', '#d7c6ff', '#9a78f0'] : ['#7de3e0', '#c2f6f3', '#4fc9c9'];
    const m = new T.Mesh(geo('gem' + v, () => {
      const top = paintFaces(K.g(new T.CylinderGeometry(0.11, 0.21, 0.1, 6), cols[0], 0, 0.1, 0, 0, 0, 0, 1, 1, 1, true), (f) => cols[f % 3]);
      const bot = paintFaces(K.g(new T.ConeGeometry(0.21, 0.3, 6), cols[0], 0, -0.1, 0, PI, 0, 0, 1, 1, 1, true), (f) => cols[(f + 1) % 3]);
      return K.merge([top, bot]);
    }), glowMat(v ? 'gemP' : 'gemT', v ? '#7a4dff' : '#19b5b5', 0.3));
    collectible(grp, u, Object.assign({ value: 3 }, o), m, v ? '#e4d9ff' : '#d2fbf8', 0.46, seed);
  };

  /* =====================================================================================
     things in the way (a little oversized so they read from far)
     ===================================================================================== */
  MAKERS.cone = function (grp, u) {
    const body = new T.Group();
    body.add(mk('cone', () => [
      gb(0.56, 0.05, 0.56, '#ff7f32', 0, 0.025, 0),
      gc(0.035, 0.21, 0.72, 12, '#ff8a3d', 0, 0.41, 0),
      gc(0.108, 0.146, 0.15, 12, '#ffffff', 0, 0.42, 0),
      gc(0.066, 0.086, 0.08, 12, '#ffffff', 0, 0.62, 0),
      gs(0.04, '#ff8a3d', 0, 0.77, 0, 1, 0.6, 1, 8, 4),
    ]));
    grp.add(body); shadow(grp, 0.42);
    u.r = 0.32; u.h = 0.78;
    u.update = wobbler(u, body, { amp: 0.7, freq: 12, damp: 3.2 });
  };
  MAKERS.bollard = function (grp, u) {
    const body = new T.Group();
    body.add(mk('bollard', () => [
      gc(0.105, 0.12, 1.02, 10, '#ffd54d', 0, 0.51, 0),
      gs(0.105, '#ffd54d', 0, 1.02, 0, 1, 0.75, 1, 10, 5),
      gc(0.112, 0.114, 0.13, 10, '#3a3550', 0, 0.8, 0),
      gc(0.114, 0.116, 0.05, 10, '#ffffff', 0, 0.8, 0),
      gc(0.15, 0.17, 0.08, 10, '#b9c2cc', 0, 0.04, 0),
    ]));
    grp.add(body); shadow(grp, 0.3);
    u.r = 0.22; u.h = 1.1;
    u.update = wobbler(u, body, { amp: 0.22, freq: 20, damp: 6, hop: 0 });
  };
  MAKERS.bin = function (grp, u) {
    const body = new T.Group();
    body.add(mk('bin', () => [
      K.g(new T.CylinderGeometry(0.46, 0.37, 1.02, 4), '#55b56f', 0, 0.63, 0, 0, PI / 4, 0, 1, 1, 1.12),
      gb(0.74, 0.09, 0.84, '#3f9a5b', 0, 1.18, 0.0, -0.05),
      gb(0.5, 0.05, 0.08, '#3f9a5b', 0, 1.2, 0.43),
      gb(0.28, 0.22, 0.02, '#c8ecd0', 0, 0.8, 0.345, -0.085),
      tube([-0.3, 1.1, -0.44], [0.3, 1.1, -0.44], 0.025, '#2f7a47', 5),
      disc(0.12, 0.07, 10, P.tyre, -0.3, 0.12, -0.3), disc(0.12, 0.07, 10, P.tyre, 0.3, 0.12, -0.3),
      disc(0.05, 0.08, 6, '#b9c2cc', -0.3, 0.12, -0.3), disc(0.05, 0.08, 6, '#b9c2cc', 0.3, 0.12, -0.3),
    ]));
    grp.add(body); shadow(grp, 0.6, 0.66);
    u.r = 0.5; u.h = 1.25;
    u.update = wobbler(u, body, { amp: 0.26, freq: 11, damp: 3.6, hop: 0.06 });
  };
  MAKERS.box = function (grp, u, o, rnd, seed) {
    const body = new T.Group(), c1 = '#d9b27c', c2 = '#c99d63', tape = '#f3e3c3';
    body.add(mk('boxA', () => [
      gb(0.72, 0.52, 0.6, c1, 0, 0.26, 0), gb(0.1, 0.525, 0.61, tape, 0, 0.26, 0), gb(0.725, 0.02, 0.1, tape, 0, 0.515, 0),
      gb(0.4, 0.3, 0.36, c2, 0.52, 0.15, 0.2, 0, 0.5, 0), gb(0.07, 0.305, 0.37, tape, 0.52, 0.15, 0.2, 0, 0.5, 0),
    ]));
    const topB = mk('boxB', () => [gb(0.46, 0.38, 0.44, c2, 0, 0.19, 0), gb(0.08, 0.385, 0.45, tape, 0, 0.19, 0), gb(0.2, 0.14, 0.01, '#ff8fc0', 0.08, 0.2, 0.223)]);
    topB.position.set(-0.06, 0.52, 0.02); topB.rotation.y = 0.4 + (seed % 3) * 0.3;
    body.add(topB);
    grp.add(body); shadow(grp, 0.7, 0.56);
    u.r = 0.55; u.h = 0.92;
    const wob = wobbler(u, body, { amp: 0.12, freq: 14, damp: 5, hop: 0.05, onBump: () => { jt = 0; } });
    let jt = -1;
    u.update = function (dt) {
      wob(dt);
      if (jt >= 0) { jt += dt; const k = jt / 0.5; topB.position.y = 0.52 + Math.max(0, 4 * k * (1 - k)) * 0.28; topB.rotation.y += dt * 4 * Math.max(0, 1 - k); if (k >= 1) { jt = -1; topB.position.y = 0.52; } }
    };
  };
  MAKERS.barrier = function (grp, u) {
    const body = new T.Group();
    body.add(mk('barrier', () => {
      const parts = [];
      for (let i = 0; i < 6; i++) parts.push(gb(0.271, 0.2, 0.05, i % 2 ? '#ffffff' : '#ff5a5a', -0.675 + i * 0.27, 0.92, 0));
      for (let i = 0; i < 6; i++) parts.push(gb(0.271, 0.12, 0.04, i % 2 ? '#ff5a5a' : '#ffffff', -0.675 + i * 0.27, 0.52, 0));
      [-0.7, 0.7].forEach((x) => {
        parts.push(tube([x, 1.02, 0], [x, 0, 0.3], 0.03, '#f4f4f0', 5), tube([x, 1.02, 0], [x, 0, -0.3], 0.03, '#f4f4f0', 5), gb(0.09, 0.05, 0.75, '#f4f4f0', x, 0.025, 0));
      });
      parts.push(gc(0.05, 0.06, 0.08, 8, '#3a3550', 0.7, 1.08, 0));
      return parts;
    }));
    const lampOn = mk('barrierLamp', () => [gs(0.085, '#ffb020', 0.7, 1.19, 0, 1, 1, 1, 8, 6)], litMat());
    const lampOff = mk('barrierLampOff', () => [gs(0.08, '#c98a2a', 0.7, 1.19, 0, 1, 1, 1, 8, 6)]);
    body.add(lampOn, lampOff);
    grp.add(body); shadow(grp, 0.95, 0.42);
    u.r = 0.85; u.h = 1.28;
    const wob = wobbler(u, body, { amp: 0.2, freq: 12, damp: 4, hop: 0.05 });
    u.update = function (dt, t) { wob(dt); lampOn.visible = (t * 1.6) % 1 < 0.5; };
  };
  MAKERS.ball = function (grp, u, o, rnd, seed) {
    const R = 0.17, accent = ['#ff8fc0', '#7de3e0', '#ffd54d', '#b99cff'][seed % 4];
    const ball = new T.Mesh(geo('ball' + (seed % 4), () => K.merge([paintFaces(K.g(new T.IcosahedronGeometry(R, 1), '#ffffff', 0, 0, 0, 0, 0, 0, 1, 1, 1, true), (f) => (Math.floor(f / 4) % 3 === 0 ? accent : '#ffffff'))])), K.vmat());
    ball.position.y = R;
    grp.add(ball);
    const sh = shadow(grp, 0.2, 0.2, 0.24);
    u.r = 0.24; u.h = R * 2; u.vx = 0; u.vz = 0;
    let bt = -1;
    /* roll(vx, vz): the ball rolls with this velocity (metres / second) — it moves its own group */
    u.roll = function (vx, vz) { u.vx = vx || 0; u.vz = vz || 0; };
    u.bump = function () { bt = 0; u.bumped = true; };
    u.update = function (dt) {
      const sp = Math.hypot(u.vx, u.vz);
      if (sp > 0.001) {
        grp.position.x += u.vx * dt; grp.position.z += u.vz * dt;
        Vd.set(u.vz / sp, 0, -u.vx / sp); Qa.setFromAxisAngle(Vd, (sp * dt) / R);
        ball.quaternion.premultiply(Qa);
      }
      if (bt >= 0) { bt += dt; const k = bt / 0.7; ball.position.y = R + Math.abs(Math.sin(k * PI * 2)) * 0.45 * (1 - k); if (k >= 1) { bt = -1; ball.position.y = R; } sh.material.opacity = 0.24 - 0.12 * Math.min(1, (ball.position.y - R) * 3); }
    };
  };
  MAKERS.scooter = function (grp, u, o, rnd, seed) {
    const col = ['#63c98a', '#7de3e0', '#ff9d4d', '#b99cff'][seed % 4], dk = '#3a3f4c';
    const body = new T.Group();
    body.add(mk('scooter' + col, () => [
      gb(0.16, 0.05, 0.66, dk, 0, 0.14, -0.02), gb(0.135, 0.012, 0.5, col, 0, 0.171, -0.05),
      disc(0.11, 0.055, 12, P.tyre, 0, 0.11, 0.45), disc(0.11, 0.055, 12, P.tyre, 0, 0.11, -0.42),
      disc(0.05, 0.065, 8, '#e9edf2', 0, 0.11, 0.45), disc(0.05, 0.065, 8, '#e9edf2', 0, 0.11, -0.42),
      tube([0, 0.11, 0.45], [0, 0.34, 0.37], 0.03, dk, 5), tube([0, 0.3, 0.385], [0, 1.1, 0.27], 0.028, col, 6),
      tube([-0.25, 1.1, 0.27], [0.25, 1.1, 0.27], 0.02, dk, 5),
      tube([-0.3, 1.1, 0.27], [-0.19, 1.1, 0.27], 0.03, '#2a2640', 6), tube([0.19, 1.1, 0.27], [0.3, 1.1, 0.27], 0.03, '#2a2640', 6),
      gb(0.08, 0.05, 0.05, dk, 0, 1.13, 0.27), gb(0.05, 0.03, 0.01, '#9be36a', 0, 1.135, 0.296),
      gb(0.13, 0.02, 0.2, col, 0, 0.235, -0.42, 0.25), gs(0.03, '#fff6c8', 0, 0.95, 0.31),
      tube([0.04, 0.13, -0.1], [0.17, 0, -0.14], 0.012, '#b9c2cc', 4),
    ]));
    body.scale.setScalar(1.25);
    const lean = -0.13;
    body.rotation.z = lean;
    grp.add(body);
    const sh = shadow(grp, 0.3, 0.62);
    u.r = 0.42; u.h = 1.45; u.down = false;
    let ft = -1, dir = 1;
    /* bump: it tips over and stays down (u.down). stand() puts it back up. */
    u.bump = function (side) { if (u.down) return; ft = 0; dir = side < 0 ? 1 : -1; u.bumped = true; };
    u.stand = function () { ft = -1; u.down = false; body.rotation.set(0, 0, lean); body.position.y = 0; sh.scale.set(0.3, 0.62, 1); };
    u.update = function (dt) {
      if (ft < 0) return;
      ft += dt;
      const k = Math.min(1, ft / 0.55), fall = k * k, bounce = k >= 1 ? Math.exp(-(ft - 0.55) * 9) * Math.sin((ft - 0.55) * 22) * 0.12 : 0;
      body.rotation.z = lean + (dir * 1.46 - lean) * fall - dir * Math.abs(bounce);
      body.position.y = 0.05 * fall;
      sh.scale.set(0.3 + 0.55 * fall, 0.62, 1);
      if (ft > 1.3) { ft = -1; u.down = true; }
    };
  };
  MAKERS.puddle = function (grp, u, o, rnd, seed) {
    const v = seed % 3;
    const m = mk('puddle' + v, () => {
      const blob = (sc, ox, oz, ph) => {
        const pts = [];
        for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU, rad = 0.66 + 0.13 * Math.sin(a * 3 + v * 2 + ph) + 0.07 * Math.sin(a * 5 + 1 + v); pts.push(new T.Vector2(Math.cos(a) * rad * 1.22 * sc + ox, Math.sin(a) * rad * 0.9 * sc + oz)); }
        return new T.ShapeGeometry(new T.Shape(pts));
      };
      return [
        K.g(blob(1.06, 0, 0, 0), '#5ebfe3', 0, 0.062, 0, -PI / 2), K.g(blob(1, 0, 0, 0), '#86d6f2', 0, 0.07, 0, -PI / 2),
        K.g(blob(0.5, -0.16, 0.12, 1), '#c3eefb', 0, 0.078, 0, -PI / 2), K.g(blob(0.13, 0.3, -0.2, 2), '#ffffff', 0, 0.084, 0, -PI / 2),
      ];
    }, groundMat());
    grp.add(m);
    const drops = mk('drops', () => { const parts = []; for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; parts.push(gs(0.07, i % 2 ? '#c3eefb' : '#86d6f2', Math.cos(a), (i % 3) * 0.25, Math.sin(a), 1, 1.3, 1, 5, 3)); } return parts; });
    drops.visible = false;
    grp.add(drops);
    u.r = 0.75; u.h = 0.06; u.flat = true;
    let st = -1;
    u.splash = u.bump = function () { st = 0; drops.visible = true; u.bumped = true; };
    u.update = function (dt, t) {
      m.scale.x = 1 + 0.015 * Math.sin(t * 2.2 + seed); m.scale.z = 1 + 0.015 * Math.cos(t * 1.8 + seed);
      if (st < 0) return;
      st += dt;
      const k = st / 0.6;
      if (k >= 1) { st = -1; drops.visible = false; return; }
      drops.scale.setScalar(0.4 + 0.75 * k); drops.position.y = 0.1 + 4 * k * (1 - k) * 0.75; drops.rotation.y = k * 0.8;
    };
  };

  /* =====================================================================================
     animals
     ===================================================================================== */
  MAKERS.pigeon = function (grp, u, o, rnd, seed) {
    const v = seed % 3, base = ['#9aa5b8', '#b7bfcc', '#8b8fa3'][v], darkc = ['#6f7b93', '#8d98ab', '#5f6378'][v];
    const body = new T.Group();
    body.add(mk('pigeon' + v, () => [
      gs(1, base, 0, 0.19, -0.01, 0.105, 0.1, 0.17, 8, 5), gs(1, '#d6dbe4', 0, 0.165, 0.07, 0.085, 0.075, 0.09, 6, 4),
      gs(1, darkc, 0.085, 0.2, -0.03, 0.03, 0.07, 0.13, 6, 4), gs(1, darkc, -0.085, 0.2, -0.03, 0.03, 0.07, 0.13, 6, 4),
      gs(0.06, '#7fd0b0', 0, 0.275, 0.1, 1, 1.05, 1, 6, 4), gs(0.062, darkc, 0, 0.328, 0.125, 1, 1, 1, 7, 5),
      K.g(new T.ConeGeometry(0.02, 0.06, 5), '#f2a35c', 0, 0.32, 0.195, PI / 2), gs(0.014, '#ff8a3d', 0.046, 0.335, 0.15, 1, 1, 1, 4, 3), gs(0.014, '#ff8a3d', -0.046, 0.335, 0.15, 1, 1, 1, 4, 3),
      gb(0.1, 0.02, 0.14, darkc, 0, 0.19, -0.2, 0.25), gc(0.01, 0.01, 0.1, 4, '#f08a8a', 0.035, 0.05, 0), gc(0.01, 0.01, 0.1, 4, '#f08a8a', -0.035, 0.05, 0),
      gb(0.04, 0.01, 0.06, '#f08a8a', 0.035, 0.005, 0.02), gb(0.04, 0.01, 0.06, '#f08a8a', -0.035, 0.005, 0.02),
    ]));
    const wing = (s) => { const w = mk('pigeonWing' + v + s, () => [gs(1, base, s * 0.2, 0, -0.02, 0.2, 0.014, 0.1, 6, 4), gs(1, darkc, s * 0.33, 0.002, -0.03, 0.08, 0.014, 0.085, 5, 3)]); w.position.set(s * 0.07, 0.25, 0); w.visible = false; body.add(w); return w; };
    const wl = wing(1), wr = wing(-1);
    body.scale.setScalar(1.35);
    grp.add(body);
    const sh = shadow(grp, 0.2, 0.26, 0.22);
    u.r = 0.28; u.h = 0.48; u.gone = false; u.flying = false;
    const ph = seed * 2.3;
    let ft = -1, dx = 0, dz = 1;
    /* flee(dirX, dirZ): flap up and away in that direction (world x/z), then u.gone. It moves its own group. */
    u.flee = function (ax, az) {
      if (ft >= 0 || u.gone) return;
      if (ax === undefined || (!ax && !az)) { const a = Math.random() * TAU; ax = Math.sin(a); az = Math.cos(a); }
      const l = Math.hypot(ax, az) || 1; dx = ax / l; dz = az / l;
      ft = 0; u.flying = true; wl.visible = wr.visible = true;
      grp.rotation.y = Math.atan2(dx, dz); body.rotation.set(-0.45, 0, 0);
    };
    u.update = function (dt, t) {
      if (u.gone) return;
      if (ft < 0) {
        const p = (t * 0.8 + ph) % 2.6;
        body.rotation.x = p < 0.7 ? Math.abs(Math.sin((p / 0.7) * TAU)) * 0.8 : 0;
        body.rotation.y = Math.sin(t * 0.6 + ph) * 0.6;
        body.position.y = p > 1.6 && p < 1.8 ? Math.sin(((p - 1.6) / 0.2) * PI) * 0.05 : 0;
        return;
      }
      ft += dt;
      const sp = 2.2 + ft * 6;
      grp.position.x += dx * sp * dt; grp.position.z += dz * sp * dt; grp.position.y += (2.4 + ft * 2.5) * dt;
      const f = Math.sin(ft * 38);
      wl.rotation.z = 0.25 + f * 0.95; wr.rotation.z = -0.25 - f * 0.95;
      sh.visible = false;
      if (ft > 1.9) { u.gone = true; grp.visible = false; }
    };
  };
  const CATS = [
    { base: '#f5a85c', dark: '#dc8436', light: '#fff1dc', eye: '#3a3550', stripes: true },
    { base: '#b3a08c', dark: '#77685a', light: '#f5ede2', eye: '#3a3550', stripes: true },
    { base: '#3f3a58', dark: '#2a2640', light: '#ffffff', eye: '#d8f06a', stripes: false },
  ];
  const CAT_NAMES = ['ginger', 'tabby', 'tux'];
  MAKERS.cat = function (grp, u, o, rnd, seed) {
    const vi = CAT_NAMES.indexOf(o.variant), v = vi < 0 ? seed % 3 : vi, c = CATS[v];
    /* an egg-shaped body whose long axis is z, with stripes across the back and a light belly */
    const torso = (x, y, z, rx, ry, rz) => paintWhere(K.g(new T.SphereGeometry(1, 9, 9), c.base, x, y, z, PI / 2, 0, 0, rx, rz, ry), (fx, fy, fz) => {
      if (fy < y - ry * 0.55) return c.light;
      const k = Math.abs(fz - z) / rz, band = (k > 0.12 && k < 0.42) || (k > 0.62 && k < 0.82);
      return c.stripes && fy > y - ry * 0.1 && !band ? c.dark : null;
    });
    const head = (x, y, z) => [
      gs(0.135, c.base, x, y, z, 1.08, 0.92, 0.95, 9, 6),
      K.g(new T.ConeGeometry(0.055, 0.105, 4), c.base, x + 0.082, y + 0.125, z - 0.005, 0, 0.3, -0.22), K.g(new T.ConeGeometry(0.055, 0.105, 4), c.base, x - 0.082, y + 0.125, z - 0.005, 0, -0.3, 0.22),
      K.g(new T.ConeGeometry(0.028, 0.06, 4), '#ffb3c1', x + 0.082, y + 0.118, z + 0.012, 0, 0.3, -0.22), K.g(new T.ConeGeometry(0.028, 0.06, 4), '#ffb3c1', x - 0.082, y + 0.118, z + 0.012, 0, -0.3, 0.22),
      gs(0.062, c.light, x, y - 0.042, z + 0.095, 1.2, 0.72, 0.7, 6, 4), gs(0.017, '#ff8fa8', x, y - 0.018, z + 0.142, 1, 0.8, 1, 4, 3),
      gs(0.028, c.eye, x + 0.06, y + 0.026, z + 0.107, 1, 1.25, 0.6, 5, 4), gs(0.028, c.eye, x - 0.06, y + 0.026, z + 0.107, 1, 1.25, 0.6, 5, 4),
    ];
    const paw = (x, z, top) => [gc(0.04, 0.036, top - 0.02, 5, c.base, x, top / 2 + 0.01, z), gs(0.046, c.light, x, 0.026, z + 0.014, 1, 0.6, 1.25, 5, 3)];
    const tailCol = c.stripes ? c.dark : c.base, tipCol = c.stripes ? c.dark : c.light;
    // walking set: body, two diagonal pairs of legs, tail
    const body = mk('catW' + v, () => [torso(0, 0.31, -0.02, 0.125, 0.12, 0.23), gs(0.1, c.base, 0, 0.37, 0.18, 1, 1, 1, 6, 4)].concat(head(0, 0.45, 0.26)));
    const legsA = mk('catA' + v, () => paw(0.075, 0.12, 0.26).concat(paw(-0.075, -0.16, 0.26)));
    const legsB = mk('catB' + v, () => paw(-0.075, 0.12, 0.26).concat(paw(0.075, -0.16, 0.26)));
    const tail = mk('catT' + v, () => [tube([0, 0, 0], [0, 0.13, -0.11], 0.036, c.base, 5, 0.034), tube([0, 0.13, -0.11], [0, 0.29, -0.14], 0.034, c.base, 5, 0.03), tube([0, 0.29, -0.14], [0, 0.39, -0.08], 0.03, tailCol, 5, 0.026), gs(0.03, tipCol, 0, 0.395, -0.075, 1, 1, 1, 5, 3)]);
    tail.position.set(0, 0.34, -0.23);
    const walkSet = new T.Group();
    walkSet.add(body, legsA, legsB, tail);
    // sitting set: one body, and a tail that sweeps the ground
    const sit = mk('catS' + v, () => [torso(0, 0.15, -0.05, 0.155, 0.145, 0.165), gs(1, c.base, 0, 0.31, 0.02, 0.118, 0.19, 0.112, 8, 6), gs(1, c.light, 0, 0.29, 0.1, 0.07, 0.12, 0.04, 6, 4)]
      .concat(paw(0.055, 0.12, 0.26), paw(-0.055, 0.12, 0.26), head(0, 0.55, 0.085)));
    const sitTail = mk('catST' + v, () => [tube([0, 0, 0], [0.18, 0, -0.04], 0.036, c.base, 5, 0.034), tube([0.18, 0, -0.04], [0.3, 0, 0.08], 0.034, c.base, 5, 0.03), tube([0.3, 0, 0.08], [0.3, 0, 0.22], 0.03, tailCol, 5, 0.026), gs(0.028, tipCol, 0.3, 0, 0.23, 1, 1, 1, 5, 3)]);
    sitTail.position.set(0, 0.04, -0.19);
    const sitSet = new T.Group();
    sitSet.add(sit, sitTail);
    grp.add(walkSet, sitSet);
    const sh = shadow(grp, 0.22, 0.36, 0.24);
    u.r = 0.32; u.h = 0.72; u.speed = 0.8; u.variant = CAT_NAMES[v];
    let ph = seed, md = '';
    /* mode('sit' | 'walk'); while walking, set u.speed (m/s) to match how fast you move the group */
    u.mode = function (m) { md = m === 'walk' ? 'walk' : 'sit'; walkSet.visible = md === 'walk'; sitSet.visible = md === 'sit'; sh.scale.set(md === 'walk' ? 0.22 : 0.26, md === 'walk' ? 0.4 : 0.3, 1); };
    u.mode(o.mode || 'sit');
    u.update = function (dt, t) {
      if (md === 'walk') {
        ph += dt * 15 * (u.speed / 0.8);
        const a = Math.sin(ph), b = Math.cos(ph);
        legsA.position.set(0, Math.max(0, b) * 0.035, a * 0.06); legsB.position.set(0, Math.max(0, -b) * 0.035, -a * 0.06);
        body.position.y = Math.abs(a) * 0.01; body.rotation.z = a * 0.03;
        tail.rotation.z = Math.sin(t * 3 + seed) * 0.3; tail.rotation.x = Math.sin(t * 2.1 + seed) * 0.12;
      } else {
        sitTail.rotation.y = Math.sin(t * 1.7 + seed) * 0.3;
        sit.scale.y = 1 + Math.sin(t * 2.2 + seed) * 0.012;
      }
    };
  };
  MAKERS.butterfly = function (grp, u, o, rnd, seed) {
    const col = ['#ff8fc0', '#ffb347', '#7db8ff', '#ffe066', '#c9a6ff'][seed % 5];
    const wing = (s) => mk('bfly' + col + s, () => [
      K.g(new T.CircleGeometry(1, 8), col, s * 0.085, 0, 0.035, -PI / 2, 0, 0, 0.085, 0.075, 1), K.g(new T.CircleGeometry(1, 7), col, s * 0.065, 0, -0.06, -PI / 2, 0, 0, 0.062, 0.055, 1),
      K.g(new T.CircleGeometry(1, 6), '#ffffff', s * 0.095, 0.002, 0.04, -PI / 2, 0, 0, 0.03, 0.028, 1),
    ], twoSided());
    const fly = new T.Group(), wl = wing(1), wr = wing(-1);
    fly.add(wl, wr, mk('bflyBody', () => [gs(1, '#3a3550', 0, 0, 0, 0.013, 0.013, 0.075, 5, 4), gs(0.018, '#3a3550', 0, 0.004, 0.075, 1, 1, 1, 5, 4)]));
    fly.scale.setScalar(1.5);
    grp.add(fly);
    u.r = 0.2; u.h = 1.5;
    const ph = seed * 1.9, y0 = o.y === undefined ? 1.1 : o.y, rad = o.radius === undefined ? 0.7 : o.radius;
    let px = 0, pz = 0;
    u.update = function (dt, t) {
      const x = Math.sin(t * 1.1 + ph) * rad, z = Math.sin(t * 0.83 + ph * 1.7) * rad, y = y0 + Math.sin(t * 2.3 + ph) * 0.22 + Math.sin(t * 9 + ph) * 0.03;
      fly.rotation.y = Math.atan2(x - px, z - pz || 1e-6); px = x; pz = z;
      fly.position.set(x, y, z);
      const f = Math.abs(Math.sin(t * 13 + ph));
      wl.rotation.z = 0.15 + f * 1.1; wr.rotation.z = -0.15 - f * 1.1;
    };
  };

  /* =====================================================================================
     vehicles — drive(dt, speed) turns the wheels; the game moves the group
     ===================================================================================== */
  const CAR_COLS = ['#8fd8c4', '#9ec9ff', '#ffe08a', '#ffa9a0', '#c9b6ff'];
  function axleGeo(key, r, w, half, hub) {
    return geo(key, () => {
      const parts = [];
      [-1, 1].forEach((s) => parts.push(disc(r, w, 12, P.tyre, s * half, 0, 0), disc(r * 0.56, w + 0.03, 8, hub, s * half, 0, 0), gb(w + 0.045, r * 0.9, r * 0.2, '#aab3bf', s * half, 0, 0), gb(w + 0.045, r * 0.2, r * 0.9, '#aab3bf', s * half, 0, 0)));
      return K.merge(parts);
    });
  }
  function axles(grp, key, r, w, half, zs, hub) {
    const g = axleGeo(key, r, w, half, hub), list = zs.map((z) => { const m = new T.Mesh(g, K.vmat()); m.position.set(0, r, z); grp.add(m); return m; });
    return function (dt, speed) { const a = ((speed || 0) * dt) / r; for (let i = 0; i < list.length; i++) list[i].rotation.x += a; };
  }
  function carParts(col, taxi) {
    const glass = '#a9dbf0', trim = '#eef1f5';
    const cab = new T.Shape();
    cab.moveTo(-1.32, 0.96); cab.lineTo(1.02, 0.96); cab.lineTo(0.56, 1.4); cab.quadraticCurveTo(0.5, 1.47, 0.4, 1.47); cab.lineTo(-0.8, 1.47); cab.quadraticCurveTo(-0.93, 1.47, -0.98, 1.4); cab.closePath();
    const parts = [
      ext(rrect(-1.8, 0.32, 1.8, 0.9, [0.16, 0.16, 0.3, 0.24]), 1.5, 0.1, col, 0, 0, 0, 0, -PI / 2, 0, 2),
      ext(cab, 1.34, 0.04, glass, 0, 0, 0, 0, -PI / 2, 0, 1),
      gb(1.47, 0.075, 1.36, col, 0, 1.5, -0.2), gb(1.445, 0.52, 0.1, col, 0, 1.22, -0.16),
      gb(0.06, 0.6, 0.09, col, 0.69, 1.19, -1.15, 0.66), gb(0.06, 0.6, 0.09, col, -0.69, 1.19, -1.15, 0.66),
      gb(0.06, 0.66, 0.08, col, 0.69, 1.19, 0.79, -0.81), gb(0.06, 0.66, 0.08, col, -0.69, 1.19, 0.79, -0.81),
      disc(0.41, 1.715, 12, '#555c6b', 0, 0.37, 1.18), disc(0.41, 1.715, 12, '#555c6b', 0, 0.37, -1.18),
      gb(1.6, 0.15, 0.12, trim, 0, 0.36, 1.86), gb(1.6, 0.15, 0.12, trim, 0, 0.36, -1.86),
      gs(0.11, '#fff6c8', 0.56, 0.74, 1.84, 1, 1, 0.5, 8, 5), gs(0.11, '#fff6c8', -0.56, 0.74, 1.84, 1, 1, 0.5, 8, 5),
      gb(0.28, 0.1, 0.06, '#ff5a5a', 0.55, 0.8, -1.88), gb(0.28, 0.1, 0.06, '#ff5a5a', -0.55, 0.8, -1.88),
      gb(0.42, 0.11, 0.03, '#ffd54d', 0, 0.52, 1.93), gb(0.42, 0.11, 0.03, '#ffd54d', 0, 0.52, -1.93),
      gb(0.46, 0.045, 0.03, '#4a4f5c', 0, 0.7, 1.905), gb(0.11, 0.08, 0.07, col, 0.9, 1.02, 0.72), gb(0.11, 0.08, 0.07, col, -0.9, 1.02, 0.72),
    ];
    if (taxi) parts.push(gb(0.5, 0.15, 0.2, '#ffd54d', 0, 1.61, -0.1), gb(0.56, 0.03, 0.26, '#3a3550', 0, 1.545, -0.1), gb(1.712, 0.09, 2.3, '#ffd54d', 0, 0.74, 0));
    return parts;
  }
  MAKERS.car = function (grp, u, o, rnd, seed) {
    const col = o.color || CAR_COLS[seed % CAR_COLS.length];
    grp.add(mk('car' + col, () => carParts(col, false)));
    u.drive = axles(grp, 'carAxle', 0.34, 0.24, 0.76, [1.18, -1.18], '#eef1f5');
    shadow(grp, 1.25, 2.3, 0.3);
    u.r = 1.0; u.h = 1.54; u.len = 3.9; u.wid = 1.72; u.color = col;
  };
  MAKERS.taxi = function (grp, u) {
    grp.add(mk('taxi', () => carParts('#fbfbf6', true)));
    u.drive = axles(grp, 'carAxle', 0.34, 0.24, 0.76, [1.18, -1.18], '#eef1f5');
    shadow(grp, 1.25, 2.3, 0.3);
    u.r = 1.0; u.h = 1.7; u.len = 3.9; u.wid = 1.72;
  };
  MAKERS.bus = function (grp, u) {
    const green = '#5fc28a', white = '#fbfbf6', glass = '#8fcdea', dk = '#3f4654';
    grp.add(mk('bus', () => {
      const parts = [
        ext(rrect(-1.17, 0.45, 1.17, 3.0, [0.1, 0.1, 0.24, 0.24]), 11.2, 0.08, white, 0, 0, 0, 0, 0, 0, 1, 2),
        gb(0.03, 0.82, 11.0, green, 1.252, 0.9, 0), gb(0.03, 0.82, 11.0, green, -1.252, 0.9, 0),
        gb(2.3, 0.82, 0.03, green, 0, 0.9, 5.685), gb(2.3, 0.82, 0.03, green, 0, 0.9, -5.685),
        gb(0.035, 0.09, 11.0, '#ffd54d', 1.254, 1.38, 0), gb(0.035, 0.09, 11.0, '#ffd54d', -1.254, 1.38, 0),
        gb(2.12, 1.22, 0.035, glass, 0, 2.02, 5.69), gb(1.5, 0.3, 0.04, dk, 0, 2.84, 5.69), gb(1.0, 0.15, 0.05, '#ffb347', 0, 2.84, 5.7),
        gb(1.9, 0.8, 0.035, glass, 0, 2.25, -5.69), gb(2.4, 0.18, 0.14, dk, 0, 0.5, 5.66), gb(2.4, 0.18, 0.14, dk, 0, 0.5, -5.66),
        gs(0.13, '#fff6c8', 0.85, 0.82, 5.68, 1, 1, 0.45, 8, 5), gs(0.13, '#fff6c8', -0.85, 0.82, 5.68, 1, 1, 0.45, 8, 5),
        gb(0.3, 0.14, 0.05, '#ff5a5a', 0.85, 0.9, -5.7), gb(0.3, 0.14, 0.05, '#ff5a5a', -0.85, 0.9, -5.7),
        gb(1.6, 0.2, 2.4, '#e4e9ee', 0, 3.17, 1.6), gb(1.4, 0.16, 1.5, '#e4e9ee', 0, 3.15, -2.6),
        gb(0.1, 0.34, 0.12, dk, 1.42, 2.3, 5.5), gb(0.1, 0.34, 0.12, dk, -1.42, 2.3, 5.5), gb(0.2, 0.04, 0.04, dk, 1.32, 2.42, 5.5), gb(0.2, 0.04, 0.04, dk, -1.32, 2.42, 5.5),
        disc(0.62, 2.515, 12, '#555c6b', 0, 0.52, 3.7), disc(0.62, 2.515, 12, '#555c6b', 0, 0.52, -3.3),
      ];
      // windows: all along the left side (+X); on the right side (−X, the kerb side) two doors take the place of windows
      for (let i = 0; i < 7; i++) {
        const z = -4.55 + i * 1.47;
        parts.push(gb(0.03, 0.98, 1.3, glass, 1.256, 2.08, z));
        if (i !== 6 && i !== 3) parts.push(gb(0.03, 0.98, 1.3, glass, -1.256, 2.08, z));
      }
      [4.27, -0.14].forEach((z) => parts.push(gb(0.03, 2.12, 1.2, '#6fb3d6', -1.256, 1.6, z), gb(0.04, 2.12, 0.05, dk, -1.26, 1.6, z), gb(0.035, 0.06, 1.24, dk, -1.258, 2.68, z)));
      return parts;
    }));
    u.drive = axles(grp, 'busAxle', 0.5, 0.3, 1.06, [3.7, -3.3], '#eef1f5');
    shadow(grp, 1.8, 6.4, 0.32);
    u.r = 1.5; u.h = 3.28; u.len = 11.4; u.wid = 2.5;
  };
  function pegRider(parts, o) {   // a seated townsperson in a helmet: hips at o.hip, hands on o.grips
    const hip = o.hip, sh = o.sh, hd = [sh[0], sh[1] + 0.2, sh[2] + 0.06];
    parts.push(tube(hip, sh, 0.15, o.shirt, 8, 0.13), gs(0.15, o.pants, hip[0], hip[1], hip[2], 1, 0.8, 1, 7, 4), gs(0.135, o.shirt, sh[0], sh[1], sh[2], 1, 0.7, 1, 7, 4),
      gs(0.155, o.skin, hd[0], hd[1], hd[2], 1, 1, 1, 8, 6), gs(0.02, P.dark, 0.055, hd[1] + 0.005, hd[2] + 0.14, 1, 1.2, 0.6, 5, 3), gs(0.02, P.dark, -0.055, hd[1] + 0.005, hd[2] + 0.14, 1, 1.2, 0.6, 5, 3),
      K.g(new T.SphereGeometry(0.182, 10, 5, 0, TAU, 0, PI * 0.5), o.helmet, hd[0], hd[1] + 0.03, hd[2] - 0.01, -0.22, 0, 0), gb(0.2, 0.02, 0.09, o.helmet, 0, hd[1] + 0.085, hd[2] + 0.17, 0.2),
      gb(0.03, 0.02, 0.3, '#ffffff', 0, hd[1] + 0.2, hd[2] - 0.03, -0.22));
    if (o.hair) parts.push(gs(1, o.hair, 0, hd[1] - 0.12, hd[2] - 0.14, 0.06, 0.13, 0.06, 6, 4));
    [-1, 1].forEach((s) => parts.push(tube([s * 0.17, sh[1] - 0.03, sh[2]], [s * o.grip[0], o.grip[1], o.grip[2]], 0.047, o.sleeve || o.skin, 6, 0.04), gs(0.05, o.skin, s * o.grip[0], o.grip[1], o.grip[2], 1, 1, 1, 5, 3)));
  }
  const SKIN = ['#ffe0c8', '#f6cba3', '#e8ae7e', '#c98c5e', '#9b6642'];
  const HAIR = ['#2e2230', '#5a3a28', '#8a5a34', '#c98a3c', '#ecc874', '#b5482f', '#3a3550'];
  const SHIRT = ['#ff8fc0', '#7de3e0', '#ffd54d', '#b99cff', '#ff9d4d', '#5aa9ff', '#63c98a', '#ffffff', '#ff6b6b', '#9ee6a8'];
  const PANTS = ['#4d5f8f', '#3a3550', '#7a8aa8', '#c9b79a', '#5d8a6a', '#8fb7e0', '#e8a0b4'];
  const SHOE = ['#ffffff', '#3a3550', '#ff6b6b', '#ffd54d', '#7de3e0'];
  MAKERS.moped = function (grp, u, o, rnd, seed) {
    const col = ['#ff8fa0', '#8fd8c4', '#ffe08a', '#9ec9ff'][seed % 4], dk = '#3f4654', rider = !!o.rider, v = seed % 4;
    const body = new T.Group();
    body.add(mk('moped' + col + (rider ? 'r' + v : ''), () => {
      const parts = [
        gs(1, col, 0, 0.5, -0.42, 0.21, 0.24, 0.44, 9, 6), gb(0.34, 0.06, 0.56, dk, 0, 0.3, 0.1),
        ext(rrect(-0.19, -0.3, 0.19, 0.3, 0.12), 0.03, 0.03, col, 0, 0.62, 0.42, -0.26, 0, 0, 1, 3), gs(1, col, 0, 0.36, 0.64, 0.1, 0.13, 0.27, 7, 5),
        tube([0, 0.3, 0.62], [0, 1.06, 0.38], 0.036, '#c7cfd8', 6), tube([-0.3, 1.06, 0.37], [0.3, 1.06, 0.37], 0.024, dk, 5),
        tube([-0.34, 1.06, 0.37], [-0.24, 1.06, 0.37], 0.034, '#2a2640', 6), tube([0.24, 1.06, 0.37], [0.34, 1.06, 0.37], 0.034, '#2a2640', 6),
        gs(0.075, '#fff6c8', 0, 0.97, 0.49, 1, 1, 0.6, 7, 4), gs(1, col, 0, 0.98, 0.4, 0.13, 0.1, 0.12, 8, 5),
        tube([-0.24, 1.06, 0.37], [-0.3, 1.22, 0.33], 0.01, dk, 4), tube([0.24, 1.06, 0.37], [0.3, 1.22, 0.33], 0.01, dk, 4), gs(0.045, dk, -0.3, 1.24, 0.33, 1, 1, 0.4, 6, 4), gs(0.045, dk, 0.3, 1.24, 0.33, 1, 1, 0.4, 6, 4),
        gs(1, '#3a3550', 0, 0.79, -0.32, 0.15, 0.06, 0.34, 8, 5),
        gb(0.44, 0.4, 0.42, '#fbfbf6', 0, 1.0, -0.84), gb(0.46, 0.05, 0.44, '#ff6b6b', 0, 1.2, -0.84), gb(0.3, 0.03, 0.4, '#c7cfd8', 0, 0.79, -0.8),
        gb(0.16, 0.08, 0.03, '#ffd54d', 0, 0.5, -0.87), gb(0.1, 0.05, 0.03, '#ff5a5a', 0, 0.62, -0.86),
      ];
      if (!rider) parts.push(tube([0.05, 0.3, -0.1], [0.2, 0, -0.16], 0.014, '#c7cfd8', 4));
      else {
        pegRider(parts, { hip: [0, 0.92, -0.3], sh: [0, 1.4, -0.16], grip: [0.3, 1.08, 0.36], skin: SKIN[v], shirt: SHIRT[(v * 3 + 1) % SHIRT.length], pants: PANTS[v], helmet: ['#ffffff', '#ffd54d', '#ff6b6b', '#7de3e0'][v] });
        [-1, 1].forEach((s) => parts.push(tube([s * 0.1, 0.9, -0.28], [s * 0.15, 0.78, 0.1], 0.07, PANTS[v], 6, 0.06), tube([s * 0.15, 0.78, 0.1], [s * 0.14, 0.36, 0.16], 0.055, PANTS[v], 6, 0.05), gs(1, '#ffffff', s * 0.14, 0.355, 0.2, 0.06, 0.045, 0.11, 6, 4)));
      }
      return parts;
    }));
    const wheel = (z) => { const w = mk('mopedWheel', () => [disc(0.25, 0.12, 12, P.tyre, 0, 0, 0), disc(0.12, 0.14, 8, '#eef1f5', 0, 0, 0), gb(0.15, 0.2, 0.05, '#aab3bf', 0, 0, 0), gb(0.15, 0.05, 0.2, '#aab3bf', 0, 0, 0)]); w.position.set(0, 0.25, z); body.add(w); return w; };
    const wf = wheel(0.64), wr = wheel(-0.6);
    if (!rider && o.parked !== false) body.rotation.z = -0.14;
    grp.add(body); shadow(grp, 0.42, 0.95, 0.28);
    u.r = 0.5; u.h = rider ? 1.82 : 1.3; u.len = 1.9;
    u.drive = function (dt, speed) { const a = ((speed || 0) * dt) / 0.25; wf.rotation.x += a; wr.rotation.x += a; };
  };
  function bikeParts(col, opt) {
    const metal = '#c7cfd8', dk = '#3a3f4c', R = 0.33, parts = [];
    const A = [0, R, -0.5], F = [0, R, 0.52], BB = [0, 0.3, -0.04], ST = [0, 0.84, -0.2], HB = [0, 0.72, 0.36], HT = [0, 0.95, 0.31];
    [A, F].forEach((c) => {
      parts.push(K.g(new T.TorusGeometry(R - 0.028, 0.03, 4, 12), P.tyre, c[0], c[1], c[2], 0, PI / 2, 0), disc(0.035, 0.09, 6, metal, c[0], c[1], c[2]));
      for (let i = 0; i < 3; i++) parts.push(K.g(new T.BoxGeometry(0.012, (R - 0.03) * 2, 0.012), metal, c[0], c[1], c[2], (i * PI) / 3 + 0.3, 0, 0));
    });
    parts.push(
      tube(BB, ST, 0.024, col), tube([0, 0.74, -0.17], [0, 0.88, 0.33], 0.022, col), tube(BB, HB, 0.026, col), tube(A, BB, 0.017, col), tube(A, [0, 0.72, -0.165], 0.015, col),
      tube(HB, F, 0.02, col), tube(HB, HT, 0.028, col), tube(HT, [0, 1.03, 0.285], 0.016, metal), tube([-0.27, 1.03, 0.27], [0.27, 1.03, 0.27], 0.016, metal, 5),
      tube([-0.31, 1.03, 0.27], [-0.2, 1.03, 0.27], 0.026, dk, 6), tube([0.2, 1.03, 0.27], [0.31, 1.03, 0.27], 0.026, dk, 6),
      tube(ST, [0, 0.9, -0.22], 0.015, metal), gs(1, opt.saddle || '#8a5a3c', 0, 0.915, -0.23, 0.08, 0.035, 0.14, 7, 4),
      disc(0.075, 0.012, 10, metal, 0.05, 0.3, -0.04), gb(0.3, 0.02, 0.12, metal, 0, 0.7, -0.52), gs(0.028, '#ffd54d', 0.16, 1.06, 0.27, 1, 0.8, 1, 6, 4)
    );
    if (!opt.noCrank) parts.push(tube([-0.1, 0.3, -0.04], [0.1, 0.3, -0.04], 0.014, metal, 5), gb(0.014, 0.17, 0.028, metal, 0.1, 0.22, -0.04), gb(0.014, 0.17, 0.028, metal, -0.1, 0.38, -0.04), gb(0.1, 0.022, 0.07, dk, 0.15, 0.14, -0.04), gb(0.1, 0.022, 0.07, dk, -0.15, 0.46, -0.04));
    if (opt.basket) parts.push(gb(0.32, 0.2, 0.24, '#e0bb85', 0, 0.9, 0.5), gb(0.34, 0.035, 0.26, '#b98f58', 0, 1.0, 0.5), gb(0.325, 0.03, 0.245, '#c9a06a', 0, 0.87, 0.5));
    if (opt.stand) parts.push(tube([0.03, 0.3, -0.22], [0.2, 0, -0.3], 0.013, metal, 4));
    return parts;
  }
  const BIKE_COLS = ['#ff8fc0', '#7de3e0', '#ffd54d', '#b99cff', '#ff9d4d', '#5aa9ff'];
  MAKERS.bike = function (grp, u, o, rnd, seed) {
    const col = o.color || BIKE_COLS[seed % BIKE_COLS.length], basket = seed % 2 === 0;
    const body = new T.Group();
    body.add(mk('bike' + col + basket, () => bikeParts(col, { basket, stand: true })));
    body.rotation.z = -0.13;
    grp.add(body); shadow(grp, 0.3, 0.92, 0.24);
    u.r = 0.5; u.h = 1.08; u.len = 1.7; u.drive = NOOP;
    u.update = wobbler(u, body, { amp: 0.14, freq: 12, damp: 4.5, hop: 0.03 });
  };
  MAKERS.cyclist = function (grp, u, o, rnd, seed) {
    const v = ((seed % 6) + 6) % 6, r = K.rng(7000 + v * 31), col = pick(r, BIKE_COLS), skin = pick(r, SKIN), shirt = pick(r, SHIRT), pants = pick(r, PANTS), helmet = pick(r, ['#ffffff', '#ff6b6b', '#ffd54d', '#7de3e0', '#b99cff']), hair = r() < 0.6 ? pick(r, HAIR) : null, shoe = pick(r, SHOE);
    grp.add(mk('cyclist' + v, () => {
      const parts = bikeParts(col, { noCrank: true, basket: v % 2 === 0 });
      pegRider(parts, { hip: [0, 0.99, -0.24], sh: [0, 1.42, 0.02], grip: [0.26, 1.05, 0.27], skin, shirt, pants, helmet, hair });
      return parts;
    }));
    const legG = geo('cycLeg' + v, () => K.merge([gc(0.064, 0.05, 1, 6, pants, 0, -0.5, 0), gs(1, shoe, 0, -1, 0.045, 0.06, 0.085, 0.12, 6, 4)]));
    const legs = [-1, 1].map((s) => { const m = new T.Mesh(legG, K.vmat()); m.position.set(s * 0.1, 0.96, -0.22); grp.add(m); return m; });
    shadow(grp, 0.34, 0.95, 0.28);
    u.r = 0.5; u.h = 1.85; u.len = 1.7;
    let ph = seed * 1.3;
    const place = function () {
      for (let i = 0; i < 2; i++) {
        const a = ph + i * PI, m = legs[i];
        Vd.set(m.position.x * 1.2 - m.position.x, 0.3 + 0.16 * Math.sin(a) - m.position.y, -0.04 - 0.16 * Math.cos(a) - m.position.z);
        const len = Vd.length(); Vd.multiplyScalar(1 / len);
        m.quaternion.setFromUnitVectors(DOWN, Vd); m.scale.y = len;
      }
    };
    place();
    /* drive(dt, speed): the legs pedal as fast as the bike goes */
    u.drive = function (dt, speed) { ph += ((speed || 0) * dt) / 0.72; place(); };
  };

  /* =====================================================================================
     townsfolk — little peg people. Call update() every frame, and walk(dt, speed) too while they walk.
     ===================================================================================== */
  function figGeo(kind, v) {
    const r = K.rng(1000 + v * 37 + (kind === 'walker' ? 0 : 501)), small = kind !== 'walker';
    const leg = small ? 0.5 + r() * 0.05 : 0.76 + r() * 0.08, tor = small ? 0.37 : 0.5 + r() * 0.04, hr = small ? 0.178 : 0.168, tr = small ? 0.135 : 0.162;
    const skin = pick(r, SKIN), hair = pick(r, HAIR), shirt = pick(r, SHIRT), pants = pick(r, PANTS), shoe = pick(r, SHOE), bag = pick(r, ['#ff6b6b', '#5aa9ff', '#ffd54d', '#b99cff', '#63c98a', '#ff8fc0']);
    const dress = kind !== 'guard' && r() < 0.32, shorts = small || r() < 0.3;
    const styles = small ? [0, 1, 3, 5, 6, 6, 7] : [0, 0, 1, 2, 3, 4, 5, 7];
    const style = kind === 'guard' ? 7 : styles[Math.floor(r() * styles.length)], hat = kind === 'guard' ? '#ffe14d' : pick(r, ['#ff6b6b', '#5aa9ff', '#ffffff', '#ffd54d']);
    const hipY = leg, shY = leg + tor, hy = shY + hr * 0.92 + 0.03, body = [];
    if (dress) { const L = tor + leg * 0.36; body.push(gc(tr * 0.82, tr * 1.8, L, 9, shirt, 0, shY - L / 2, 0)); }
    else body.push(gc(tr * 0.9, tr, tor, 8, shirt, 0, hipY + tor / 2, 0), gs(tr, pants, 0, hipY, 0, 1, 0.5, 1, 8, 3));
    body.push(gs(tr * 0.93, shirt, 0, shY - 0.012, 0, 1, 0.5, 1, 8, 3), gc(0.05, 0.055, 0.07, 5, skin, 0, shY + 0.03, 0),
      gs(hr, skin, 0, hy, 0, 1, 1, 1, 9, 6),
      gs(0.024, P.dark, hr * 0.37, hy + hr * 0.04, hr * 0.9, 1, 1.25, 0.6, 5, 3), gs(0.024, P.dark, -hr * 0.37, hy + hr * 0.04, hr * 0.9, 1, 1.25, 0.6, 5, 3),
      gb(0.05, 0.013, 0.012, '#b0575f', 0, hy - hr * 0.34, hr * 0.92));
    if (small) body.push(gs(0.026, '#ffb3c1', hr * 0.6, hy - hr * 0.2, hr * 0.76, 1, 0.7, 0.5, 4, 2), gs(0.026, '#ffb3c1', -hr * 0.6, hy - hr * 0.2, hr * 0.76, 1, 0.7, 0.5, 4, 2));
    // hair
    const cap = (rad, col, tilt, flat) => K.g(new T.SphereGeometry(rad, 10, 5, 0, TAU, 0, PI * 0.52), col, 0, hy + 0.005, -hr * 0.04, tilt, 0, 0, 1, 1, 1, flat);
    if (style === 5) body.push(K.g(new T.SphereGeometry(hr * 1.3, 8, 5, 0, TAU, 0, PI * 0.52), hair, 0, hy + hr * 0.04, -hr * 0.1, -0.5, 0, 0, 1, 1, 1, true));
    else if (style === 7) body.push(cap(hr * 1.07, hat, -0.3), gb(hr * 1.4, 0.022, hr * 0.8, hat, 0, hy + hr * 0.4, hr * 0.98, 0.12), gs(hr * 0.98, hair, 0, hy - hr * 0.25, -hr * 0.2, 1.04, 0.75, 0.9, 8, 5));
    else body.push(cap(hr * 1.07, hair, -0.42));
    if (style === 1) body.push(gs(hr * 1.02, hair, 0, hy - hr * 0.35, -hr * 0.22, 1.1, 0.9, 0.92, 8, 6));
    if (style === 2) body.push(gc(hr * 0.8, hr * 0.62, hr * 1.7, 7, hair, 0, hy - hr * 0.95, -hr * 0.5), gs(hr * 1.0, hair, 0, hy - hr * 0.2, -hr * 0.25, 1.06, 0.9, 0.9, 8, 5));
    if (style === 3) body.push(gs(hr * 0.3, hair, 0, hy + hr * 0.25, -hr * 1.05, 1, 1, 1, 6, 4), gs(1, hair, 0, hy - hr * 0.4, -hr * 1.22, hr * 0.24, hr * 0.7, hr * 0.24, 6, 4));
    if (style === 4) body.push(gs(hr * 0.42, hair, 0, hy + hr * 1.05, -hr * 0.2, 1, 1, 1, 7, 5));
    if (style === 6) body.push(gs(hr * 0.4, hair, hr * 1.08, hy - hr * 0.1, -hr * 0.1, 1, 1.1, 1, 6, 4), gs(hr * 0.4, hair, -hr * 1.08, hy - hr * 0.1, -hr * 0.1, 1, 1.1, 1, 6, 4), gs(0.032, '#ff8fc0', hr * 0.86, hy + hr * 0.2, -hr * 0.1, 1, 1, 1, 4, 3), gs(0.032, '#ff8fc0', -hr * 0.86, hy + hr * 0.2, -hr * 0.1, 1, 1, 1, 4, 3));
    // what they carry / wear
    if (kind === 'kid') body.push(gb(0.27, 0.3, 0.15, bag, 0, hipY + tor * 0.56, -(tr + 0.06)), gb(0.17, 0.11, 0.03, '#ffffff', 0, hipY + tor * 0.42, -(tr + 0.14)), gb(0.04, tor * 0.82, tr * 2 + 0.03, bag, 0.075, hipY + tor * 0.6, -0.005), gb(0.04, tor * 0.82, tr * 2 + 0.03, bag, -0.075, hipY + tor * 0.6, -0.005));
    if (kind === 'guard') body.push(gc(tr * 0.99, tr * 1.09, tor * 0.82, 8, '#ffe14d', 0, hipY + tor * 0.56, 0), gc(tr * 1.05, tr * 1.1, 0.05, 8, '#ff8a3d', 0, hipY + tor * 0.42, 0), gc(tr * 1.01, tr * 1.05, 0.05, 8, '#ff8a3d', 0, hipY + tor * 0.72, 0));
    if (kind === 'walker' && r() < 0.4) body.push(gb(0.07, 0.24, 0.26, bag, tr + 0.07, hipY + 0.02, 0), gb(0.02, tor * 0.9, 0.03, bag, tr * 0.6, hipY + tor * 0.55, tr * 0.72, 0, 0, -0.35));
    // limbs (their origin is the joint)
    const L = tor * 0.95, sleeve = small || r() < 0.6 ? 0.34 : 1;
    const arm = [gs(0.058, shirt, 0, 0, 0, 1, 1, 1, 6, 3), gc(0.052, 0.049, L * sleeve, 5, shirt, 0, (-L * sleeve) / 2, 0), gs(0.054, skin, 0, -L - 0.01, 0, 1, 1, 1, 6, 3)];
    if (sleeve < 1) arm.push(gc(0.045, 0.041, L * (1 - sleeve), 5, skin, 0, -L * sleeve - (L * (1 - sleeve)) / 2, 0));
    const lg = leg - 0.05, up = dress || shorts ? 0.36 : 1, legCol = dress ? skin : pants;
    const legP = [gc(0.07, 0.064, lg * up, 5, legCol, 0, (-lg * up) / 2, 0), gs(1, shoe, 0, -leg + 0.045, 0.035, 0.066, 0.05, 0.12, 6, 3)];
    if (up < 1) legP.push(gc(0.058, 0.052, lg * (1 - up), 5, skin, 0, -lg * up - (lg * (1 - up)) / 2, 0));
    return { body: K.merge(body), arm: K.merge(arm), leg: K.merge(legP), d: { hipY, shY, hy, hr, tr, L, leg, ax: tr + 0.048, lx: tr * 0.5, wk: 2.9 / leg, H: hy + hr * 1.1 } };
  }
  function person(grp, u, kind, seed, o) {
    const NV = kind === 'walker' ? 12 : kind === 'kid' ? 10 : 3, v = ((seed % NV) + NV) % NV;
    const F = geo(kind + v, () => figGeo(kind, v)), d = F.d, fig = new T.Group();
    const limb = (g, x, y) => { const m = new T.Mesh(g, K.vmat()); m.position.set(x, y, 0); fig.add(m); return m; };
    fig.add(new T.Mesh(F.body, K.vmat()));
    const armL = limb(F.arm, d.ax, d.shY - 0.04), armR = limb(F.arm, -d.ax, d.shY - 0.04), legL = limb(F.leg, d.lx, d.hipY), legR = limb(F.leg, -d.lx, d.hipY);
    grp.add(fig); shadow(grp, d.tr * 2.0, d.tr * 1.7, 0.24);
    u.r = 0.3; u.h = d.H; u.variant = v;
    let ph = v * 1.3, amp = 0, target = 0, walked = false, waveT = 0, waveK = 0, cheerOn = false, cheerK = 0, time = 0;
    const st = { armL, armR, d, extra: null };
    const apply = function () {
      const sw = Math.sin(ph) * 0.62 * amp, t = time;
      legL.rotation.x = -sw; legR.rotation.x = sw;
      const down = 1 - cheerK;
      let lz = 0.1 + cheerK * (2.6 + 0.22 * Math.sin(t * 13)), rz = -0.1 - cheerK * (2.6 + 0.22 * Math.sin(t * 13 + 1.3)), rx = -sw * 0.8 * down;
      if (waveK > 0) { rz += -waveK * (2.4 + 0.38 * Math.sin(t * 11)) * down; rx *= 1 - waveK; }
      armL.rotation.set(sw * 0.8 * down, 0, lz); armR.rotation.set(rx, 0, rz);
      fig.position.y = Math.abs(Math.cos(ph)) * 0.03 * amp + cheerK * Math.abs(Math.sin(t * 7.5 + v)) * 0.24;
      if (st.extra) st.extra(t);
    };
    /* walk(dt, speed): step forward in the walk cycle; call it every frame while the figure moves */
    u.walk = function (dt, speed) { const s = Math.abs(speed || 0); ph += dt * s * d.wk; target = Math.min(1, s / 1.1); amp += (target - amp) * Math.min(1, dt * 8); walked = true; apply(); };
    u.wave = function (secs) { waveT = secs || 2.4; };
    u.cheer = function (on) { cheerOn = on !== false; };
    u.update = function (dt, t) {
      time = t;
      if (!walked) amp += (0 - amp) * Math.min(1, dt * 8);
      walked = false;
      waveT = Math.max(0, waveT - dt);
      waveK += ((waveT > 0 ? 1 : 0) - waveK) * Math.min(1, dt * 9);
      cheerK += ((cheerOn ? 1 : 0) - cheerK) * Math.min(1, dt * 9);
      if (st.tick) st.tick(dt, t);
      apply();
    };
    apply();
    return st;
  }
  MAKERS.walker = function (grp, u, o, rnd, seed) { person(grp, u, 'walker', seed, o); };
  MAKERS.kid = function (grp, u, o, rnd, seed) { person(grp, u, 'kid', seed, o); };
  MAKERS.guard = function (grp, u, o, rnd, seed) {
    const st = person(grp, u, 'guard', seed, o), s = o.hand === 'l' ? 1 : -1, arm = s > 0 ? st.armL : st.armR;
    // the round stop sign on a stick, held in one hand; it stays upright while the arm goes up
    const sign = mk('stopSign', () => {
      const parts = [gc(0.018, 0.018, 0.8, 5, '#f4f4f0', 0, 0.2, 0), lamp(0.235, 0.022, 18, '#ffffff', 0, 0.74, 0), lamp(0.2, 0.034, 18, '#ff4d4d', 0, 0.74, 0), gb(0.11, 0.1, 0.044, '#ffffff', 0.005, 0.7, 0), gb(0.03, 0.07, 0.044, '#ffffff', -0.07, 0.715, 0, 0, 0, 0.6)];
      for (let i = 0; i < 4; i++) parts.push(gb(0.022, 0.1 - Math.abs(i - 1.3) * 0.012, 0.044, '#ffffff', -0.037 + i * 0.028, 0.79, 0));
      return parts;
    });
    sign.position.set(0, -st.d.L, 0.04);
    arm.add(sign);
    let on = false, k = 0;
    /* stop(true): hold the sign out to the side; stop(false): bring it back down */
    u.stop = function (yes) { on = yes !== false; };
    u.stopping = () => on;
    st.tick = function (dt) { k += ((on ? 1 : 0) - k) * Math.min(1, dt * 7); };
    st.extra = function (t) {
      const z = s * (0.12 + k * (1.42 + 0.04 * Math.sin(t * 5)));
      arm.rotation.set(arm.rotation.x * (1 - k), 0, z);
      sign.rotation.set(-arm.rotation.x, 0, -z);
    };
    st.extra(0);
  };

  /* =====================================================================================
     the traffic light and the finish
     ===================================================================================== */
  MAKERS.light = function (grp, u, o) {
    const dk = '#2b2f3a', pole = '#7d8c99', HY = 3.35, DY = 0.43, PY = 1.95;
    const lampY = { red: HY + DY, amber: HY, green: HY - DY }, cols = { red: ['#ff3b30', '#ffb0a8'], amber: ['#ffc21a', '#fff0b0'], green: ['#2fe36a', '#c2ffd2'] }, dim = { red: '#6e2a2e', amber: '#6e5a22', green: '#1f5a36' };
    grp.add(mk('lightPole', () => {
      const parts = [
        gc(0.07, 0.085, HY - 0.3, 8, pole, 0, (HY - 0.3) / 2, 0), gc(0.15, 0.19, 0.28, 8, '#5d6b78', 0, 0.14, 0),
        gb(0.7, 1.6, 0.04, '#f6f6f2', 0, HY, 0.05), gb(0.6, 1.5, 0.05, dk, 0, HY, 0.06), gb(0.46, 1.38, 0.3, dk, 0, HY, 0.14),
        gb(0.36, 0.76, 0.24, dk, 0, PY, 0.14), gb(0.44, 0.84, 0.04, '#f6f6f2', 0, PY, 0.03),
      ];
      ['red', 'amber', 'green'].forEach((n) => parts.push(lamp(0.175, 0.04, 14, dim[n], 0, lampY[n], 0.28), gb(0.42, 0.035, 0.2, dk, 0, lampY[n] + 0.2, 0.36)));
      parts.push(lamp(0.125, 0.04, 12, dim.red, 0, PY + 0.18, 0.25), lamp(0.125, 0.04, 12, dim.green, 0, PY - 0.18, 0.25));
      return parts;
    }));
    const lit = {};
    ['red', 'amber', 'green'].forEach((n) => {
      lit[n] = mk('lightOn' + n, () => {
        const parts = [lamp(0.2, 0.05, 16, cols[n][0], 0, lampY[n], 0.295), lamp(0.11, 0.055, 12, cols[n][1], -0.03, lampY[n] + 0.03, 0.297)];
        if (n !== 'amber') { const y = PY + (n === 'red' ? 0.18 : -0.18); parts.push(lamp(0.135, 0.05, 14, cols[n][0], 0, y, 0.265), lamp(0.07, 0.055, 10, cols[n][1], -0.02, y + 0.02, 0.267)); }
        return parts;
      }, litMat());
      lit[n].visible = false;
      grp.add(lit[n]);
    });
    const glow = new T.Sprite(new T.SpriteMaterial({ map: halo('#ffffff', 1, 1).material.map, transparent: true, opacity: 0.7, depthWrite: false }));
    glow.visible = false;
    grp.add(glow);
    shadow(grp, 0.4, 0.4, 0.22);
    u.r = 0.25; u.h = HY + 0.8; u.state = 'off';
    /* set('red' | 'green' | 'amber' | 'off'). The lamps face +Z: turn the group so +Z looks at whoever must obey it. */
    u.set = function (state) {
      u.state = lit[state] ? state : 'off';
      Object.keys(lit).forEach((n) => (lit[n].visible = n === u.state));
      glow.visible = u.state !== 'off';
      if (glow.visible) { glow.material.color.set(cols[u.state][0]); glow.position.set(0, lampY[u.state], 0.42); }
    };
    u.update = function (dt, t) { if (glow.visible) glow.scale.setScalar(2.1 + 0.15 * Math.sin(t * 4)); };
    u.set(o.state || 'red');
  };
  const BALLOON = ['#ff8fc0', '#ffd54d', '#7de3e0', '#b99cff', '#ffffff', '#ff9d4d', '#8fd3ff'];
  MAKERS.arch = function (grp, u, o, rnd, seed) {
    const W = Math.max(8, o.width || 8.6), H = o.height || 4.6, A = W / 2 + 0.55, B = H + 0.5, N = 24;
    const sets = [[], [], []];
    const r = K.rng(4242);
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * PI, cx = -Math.cos(a) * A, cy = Math.sin(a) * B + 0.25, nx = -Math.cos(a), ny = Math.sin(a);
      for (let j = 0; j < 3; j++) {
        const ang = (j / 3) * TAU + i * 0.9, off = 0.27, rad = 0.33 + r() * 0.07, col = BALLOON[(i * 2 + j * 3) % BALLOON.length];
        sets[(i + j) % 3].push(gs(rad, col, cx + nx * Math.cos(ang) * off, cy + ny * Math.cos(ang) * off, Math.sin(ang) * off, 1, 1.1, 1, 7, 5));
      }
    }
    const meshes = sets.map((p, i) => { const m = new T.Mesh(K.merge(p), K.vmat()); grp.add(m); return m; });
    grp.add(new T.Mesh(K.merge([
      gc(0.34, 0.4, 0.45, 8, '#ff8fc0', -A, 0.225, 0), gc(0.34, 0.4, 0.45, 8, '#7de3e0', A, 0.225, 0),
      tube([-A * 0.62, B * 0.82, 0], [-A * 0.5, H - 0.55, 0], 0.012, '#ffffff', 4), tube([A * 0.62, B * 0.82, 0], [A * 0.5, H - 0.55, 0], 0.012, '#ffffff', 4),
    ]), K.vmat()));
    const text = o.text === undefined ? 'הגענו!' : o.text;
    let banner = null;
    if (text) {
      // two plates back to back, so the words read properly from both sides (opts.backText for the far side)
      const plate = (txt, back) => {
        const b = K.sign(txt, { h: 0.95, bg: '#ffffff', fg: '#ff5fa2', border: '#ffd54d', pad: 0.55 });
        const maxW = A * 1.25;
        if (b.userData.w > maxW) b.scale.setScalar(maxW / b.userData.w);
        if (back) b.rotation.y = PI;
        return b;
      };
      banner = new T.Group();
      banner.add(plate(text, false), plate(o.backText || text, true));
      banner.children[0].position.z = 0.012; banner.children[1].position.z = -0.012;
      banner.position.set(0, H - 0.95, 0);
      grp.add(banner);
    }
    shadow(grp, 0.75, 0.75, 0.22).position.x = -A;
    shadow(grp, 0.75, 0.75, 0.22).position.x = A;
    u.r = W / 2; u.h = B + 0.9; u.inner = W; u.clear = H - 1.5;
    /* the banner reads from the +Z side: turn the group so +Z looks at the arriving rider */
    u.update = function (dt, t) {
      for (let i = 0; i < 3; i++) { const m = meshes[i], p = t * 1.6 + i * 2.1; m.position.y = Math.sin(p) * 0.045; m.rotation.z = Math.sin(p * 0.7) * 0.006; m.position.z = Math.cos(p * 0.9) * 0.03; }
      if (banner) banner.rotation.x = Math.sin(t * 1.3) * 0.05;
    };
  };
  MAKERS.balloons = function (grp, u, o, rnd, seed) {
    const n = Math.max(1, Math.min(7, o.n || 3 + (seed % 3)));
    const sway = new T.Group();
    sway.add(new T.Mesh(geo('balloons' + n + '_' + (seed % 5), () => {
      const r = K.rng(900 + n * 13 + (seed % 5) * 7), parts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r() * 0.8, sp = n === 1 ? 0 : 0.2 + r() * 0.12, by = 1.1 + r() * 0.45, bx = Math.sin(a) * sp, bz = Math.cos(a) * sp, col = BALLOON[Math.floor(r() * 4 + i * 2) % BALLOON.length];
        parts.push(gs(0.18, col, bx, by, bz, 1, 1.18, 1, 9, 7), K.g(new T.ConeGeometry(0.03, 0.05, 5), col, bx, by - 0.225, bz), tube([0, 0, 0], [bx, by - 0.24, bz], 0.006, '#ffffff', 3));
      }
      return K.merge(parts);
    }), K.vmat()));
    grp.add(sway);
    u.r = 0.4; u.h = 1.8;
    const ph = seed * 1.1;
    /* origin = where the strings are tied. u.drag (−1…1) leans the bunch backwards, e.g. speed / 8 on the bike */
    u.drag = 0;
    u.update = function (dt, t) { sway.rotation.z = Math.sin(t * 1.7 + ph) * 0.09; sway.rotation.x = Math.cos(t * 1.3 + ph) * 0.07 - u.drag * 0.7; };
  };

  /* =====================================================================================
     make(kind, opts) → THREE.Group      opts.seed picks the variant (colour, face, hair…)
     ---------------------------------------------------------------------------------
     star · bigstar · heart · gem      collect(), reset(); userData.gone when the pop is over; value 1 / 5 / 3 / 3
     cone · bollard · bin · box · barrier     bump(side)
     ball                               roll(vx, vz) (moves itself), bump()
     scooter                            bump(side) → falls and stays down (userData.down), stand()
     puddle                             splash() (= bump())
     pigeon                             flee(dirX, dirZ) (moves itself, then userData.gone)
     cat                                mode('sit' | 'walk'), userData.speed; opts.variant 'ginger' | 'tabby' | 'tux'
     butterfly                          opts.y, opts.radius
     car · taxi · bus · moped · cyclist drive(dt, speed); opts.color (car); opts.rider, opts.parked (moped)
     bike                               a parked bicycle; bump(side); opts.color
     walker · kid                       walk(dt, speed), wave(seconds), cheer(true | false)
     guard                              the same + stop(true | false); opts.hand 'l' | 'r'
     light                              set('red' | 'green' | 'amber' | 'off'); lamps face +Z
     arch                               opts.text, opts.width (inner, ≥ 8), opts.height; banner reads from +Z
     balloons                           opts.n; origin = the knot; userData.drag
     ===================================================================================== */
  M.make = function (kind, opts) {
    ready();
    const grp = new T.Group(), u = grp.userData, o = opts || {}, f = MAKERS[kind];
    const seed = o.seed === undefined ? ++auto : Math.abs(o.seed | 0);
    u.kind = kind; u.r = 0.4; u.h = 1;
    grp.name = 'ride-' + kind;
    if (!f) { console.warn('rideModels: unknown kind', kind); u.update = NOOP; return grp; }
    f(grp, u, o, K.rng(seed * 7919 + 97), seed);
    if (!u.update) u.update = NOOP;
    return grp;
  };
  M.KINDS = Object.keys(MAKERS);
})();
