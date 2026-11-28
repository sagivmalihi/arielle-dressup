/* ride-sky-models.js — who lives on the way to Dinosaur City: friendly dinosaurs, unicorns, and the small
   things that lie on the sky road. Needs THREE + ride-kit.js (loaded only when a ride starts).

     const rex = DU.rideSky.make('trex', { seed: 2, size: 'l' });   // a THREE.Group
     scene.add(rex); … every frame: rex.userData.update(dt, t);

   The same conventions as ride-models.js: origin on the ground at its centre, front = +Z, y up, metres.
   group.userData = { kind, r (collision radius), h (height), update(dt, t), …actions }; r and h are already
   multiplied by the size. Geometry is cached per kind + variant. Models never move their own group.
   Everyone is round, soft-coloured and smiling: big eyes with a sparkle, pink cheeks, no sharp teeth.
   See the table at the bottom for the kinds, their sizes and what they can do.

     DU.rideSky.still(kind, opts) → one BufferGeometry of the model standing still (for crowds merged into the scenery) */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const S = (DU.rideSky = DU.rideSky || {});
  const PI = Math.PI, TAU = PI * 2;
  let T, K, Va, Vb, Vc, UP;
  let GEO = {}, MAT = {}, auto = 0;
  const NOOP = function () {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  function ready() {
    if (K && T === window.THREE) return;
    T = window.THREE; K = DU.rideKit;
    Va = new T.Vector3(); Vb = new T.Vector3(); Vc = new T.Vector3(); UP = new T.Vector3(0, 1, 0);
  }
  S.resetModels = function () { GEO = {}; MAT = {}; };

  /* ---------- small helpers ---------- */
  const INK = '#3b3560', BLUSH = '#ffb1c9', CREAM = '#fff6dc', GOLD = '#ffd35a';
  const RAINBOW = ['#ff7b8a', '#ffab5e', '#ffe066', '#7fdc9a', '#6fb8ff', '#b79cff'];
  const geo = (key, build) => GEO[key] || (GEO[key] = build());
  /* an ellipsoid */
  const gs = (col, x, y, z, rx, ry, rz, ws = 8, hs = 6, rotX = 0, rotZ = 0) => K.g(new T.SphereGeometry(1, ws, hs), col, x, y, z, rotX, 0, rotZ, rx, ry === undefined ? rx : ry, rz === undefined ? rx : rz);
  const gcone = (col, x, y, z, r, h, seg, rx, ry, rz) => K.g(new T.ConeGeometry(r, h, seg || 6), col, x, y, z, rx || 0, ry || 0, rz || 0);
  const gcyl = (col, x, y, z, rt, rb, h, seg, rx, ry, rz) => K.g(new T.CylinderGeometry(rt, rb, h, seg || 7), col, x, y, z, rx || 0, ry || 0, rz || 0);
  /* a soft tapering tube through points (a neck, a tail, an arm). rads: one radius per point.
     col: a colour, or fn(u 0…1 along, a angle round: 0 = its right, π/2 = its top) → colour */
  function sweep(pts, rads, col, seg = 7, sub = 4) {
    const P = pts.map((p) => new T.Vector3(p[0], p[1], p[2]));
    const curve = new T.CatmullRomCurve3(P, false, 'centripetal');
    const n = (P.length - 1) * sub, rings = [], c = new T.Color();
    const radAt = (u) => { const f = u * (rads.length - 1), i = Math.min(rads.length - 2, Math.floor(f)); return rads[i] + (rads[i + 1] - rads[i]) * (f - i); };
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = curve.getPoint(u), tan = curve.getTangent(u).normalize();
      const ref = Math.abs(tan.x) > 0.9 ? Va.set(0, 1, 0) : Va.set(1, 0, 0);
      const B = new T.Vector3().crossVectors(tan, ref).normalize(), N = new T.Vector3().crossVectors(B, tan).normalize(); // N = its right, B = its top (for a tube lying along z)
      rings.push({ p, B, N, r: radAt(u), u, tan });
    }
    const pos = [], nor = [], colr = [];
    const put = (ring, j, tip) => {
      const a = (j / seg) * TAU, ca = Math.cos(a), sa = Math.sin(a), r = tip ? 0 : ring.r;
      const dx = ring.N.x * ca + ring.B.x * sa, dy = ring.N.y * ca + ring.B.y * sa, dz = ring.N.z * ca + ring.B.z * sa;
      const off = tip ? ring.r * 0.55 * tip : 0;
      pos.push(ring.p.x + dx * r + ring.tan.x * off, ring.p.y + dy * r + ring.tan.y * off, ring.p.z + dz * r + ring.tan.z * off);
      if (tip) nor.push(ring.tan.x * tip, ring.tan.y * tip, ring.tan.z * tip); else nor.push(dx, dy, dz);
      c.set(typeof col === 'function' ? col(ring.u, a) : col); colr.push(c.r, c.g, c.b);
    };
    for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) {
      const A = rings[i], Bn = rings[i + 1];
      put(A, j); put(Bn, j + 1); put(Bn, j); put(A, j); put(A, j + 1); put(Bn, j + 1);
    }
    for (let j = 0; j < seg; j++) { // rounded ends
      put(rings[0], j + 1); put(rings[0], j); put(rings[0], j, -1);
      put(rings[n], j); put(rings[n], j + 1); put(rings[n], j, 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(colr, 3));
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
  /* a big friendly eye looking along +Z (turned by yaw to the side): white, a large dark pupil, a sparkle */
  function eye(x, y, z, r, yaw = 0, col = INK) {
    const s = Math.sin(yaw), c = Math.cos(yaw), at = (f, up, side) => [x + s * f * r + c * side * r, y + up * r, z + c * f * r - s * side * r];
    const p = at(0.42, 0.02, 0), h = at(0.86, 0.3, -0.26 * Math.sign(x || 1)), h2 = at(0.9, -0.18, 0.2 * Math.sign(x || 1));
    return [
      gs('#ffffff', x, y, z, r, r * 1.08, r, 8, 6),
      gs(col, p[0], p[1], p[2], r * 0.72, r * 0.8, r * 0.72, 8, 6),
      gs('#ffffff', h[0], h[1], h[2], r * 0.24, r * 0.24, r * 0.2, 5, 4),
      gs('#ffffff', h2[0], h2[1], h2[2], r * 0.11, r * 0.11, r * 0.1, 4, 3),
    ];
  }
  const cheek = (x, y, z, r, yaw = 0) => K.g(new T.SphereGeometry(1, 6, 4), BLUSH, x, y, z, 0, yaw, 0, r, r * 0.72, r * 0.35);
  /* a smile: a thin dark curve through three points */
  const smile = (a, b, c, r = 0.022) => sweep([a, b, c], [r, r, r], INK, 4, 3);
  /* a smile drawn on a round muzzle: centre and radii of the ellipsoid, w = how wide (radians to each side),
     down = how far below its middle (radians), r = how thick the line is */
  function smileOn(cx, cy, cz, rx, ry, rz, w, down, r = 0.022) {
    const pts = [];
    for (let i = -2; i <= 2; i++) { const f = (i / 2) * w, th = down * (1 - 0.5 * (i / 2) * (i / 2)); pts.push([cx + rx * Math.sin(f) * Math.cos(th) * 1.02, cy - ry * Math.sin(th) * 1.02, cz + rz * Math.cos(f) * Math.cos(th) * 1.02]); }
    return sweep(pts, [r * 0.6, r, r, r, r * 0.6], INK, 4, 2);
  }
  function shadow(grp, rx, rz, op) {
    const b = K.blob(1, op === undefined ? 0.24 : op);
    b.scale.set(rx, rz === undefined ? rx : rz, 1);
    grp.add(b);
    return b;
  }
  const glowMat = (key, emissive, k) => MAT[key] || (MAT[key] = new T.MeshLambertMaterial({ vertexColors: true, emissive: new T.Color(emissive), emissiveIntensity: k }));
  const twoSided = () => MAT.two || (MAT.two = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
  /* a part of a body that can turn about a pivot: the geometry is drawn in body coordinates and stored moved by −pivot */
  function part(parent, key, build, pivot, mat) {
    const pv = pivot || [0, 0, 0];
    const g = geo(key, () => { const m = K.merge(build()); m.translate(-pv[0], -pv[1], -pv[2]); return m; });
    const m = new T.Mesh(g, mat || K.vmat());
    const pp = parent.userData.pivot || [0, 0, 0];
    m.position.set(pv[0] - pp[0], pv[1] - pp[1], pv[2] - pp[2]);
    m.userData.pivot = pv; m.userData.home = m.position.clone();
    parent.add(m);
    return m;
  }
  const SIZES = { s: 0.6, m: 1, l: 1.6, xl: 2.6 };
  const sizeOf = (o, def) => (typeof o.size === 'number' ? o.size : SIZES[o.size] || def || 1);

  /* what every creature does by itself: it breathes, blinks, sways its tail, and turns its head to look at something.
     P = { body, head, eyes, tail, arms: [l, r] or bothArms (one mesh), hop (what jumps when it cheers), headYaw (how far the head may turn) }.
     Adds u.look(x, y, z) (a place in the world to look at; nothing = straight ahead), u.wave(secs), u.cheer(on). */
  function alive(grp, u, P, seed, o) {
    const ph = seed * 1.7, lookAt = new T.Vector3();
    let looking = false, yaw = 0, pitch = 0, waveT = 0, waveK = 0, cheerOn = false, cheerK = 0;
    const maxYaw = P.headYaw === undefined ? 0.9 : P.headYaw, headRx = P.head ? P.head.rotation.x : 0, tailRy = P.tail ? P.tail.rotation.y : 0;
    u.look = function (x, y, z) { looking = x !== undefined; if (looking) lookAt.set(x, y, z); };
    u.wave = function (secs) { waveT = secs || 2.4; };
    u.cheer = function (on) { cheerOn = on !== false; };
    return function (dt, t) {
      waveT = Math.max(0, waveT - dt);
      waveK = damp(waveK, waveT > 0 ? 1 : 0, 8, dt); cheerK = damp(cheerK, cheerOn ? 1 : 0, 8, dt);
      if (P.body) { const b = 1 + Math.sin(t * 1.9 + ph) * 0.012; P.body.scale.set(1 / Math.sqrt(b), b, 1 / Math.sqrt(b)); }
      if (P.head) {
        let wy = Math.sin(t * 0.7 + ph) * 0.12, wp = Math.sin(t * 1.1 + ph * 2) * 0.05;
        if (looking) {
          grp.updateWorldMatrix(true, false);
          Va.copy(lookAt); grp.worldToLocal(Va);
          const hp = P.head.userData.pivot, sc = u.size || 1, dx = Va.x - hp[0] * sc, dy = Va.y - hp[1] * sc, dz = Va.z - hp[2] * sc;
          wy = clamp(Math.atan2(dx, dz), -maxYaw, maxYaw);
          wp = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.5, 0.5) * 0.7;
        }
        yaw = damp(yaw, wy, 4, dt); pitch = damp(pitch, wp, 4, dt);
        P.head.rotation.set(headRx + pitch + cheerK * -0.25, yaw, Math.sin(t * 0.9 + ph) * 0.05 + cheerK * Math.sin(t * 9) * 0.08);
      }
      if (P.eyes) { const b = (t * 0.31 + ph * 0.37) % 1; P.eyes.scale.y = b > 0.965 ? 0.12 : 1; }
      if (P.tail) P.tail.rotation.y = tailRy + Math.sin(t * 1.6 + ph) * (0.16 + cheerK * 0.25);
      if (P.arms) {
        const up = Math.max(waveK, cheerK);
        P.arms[0].rotation.set(-up * (1.5 + 0.35 * Math.sin(t * 11)), 0, up * 0.5 + Math.sin(t * 1.3 + ph) * 0.05);
        P.arms[1].rotation.set(-cheerK * (1.5 + 0.35 * Math.sin(t * 11 + 1.2)), 0, -cheerK * 0.5 - Math.sin(t * 1.3 + ph) * 0.05);
      }
      if (P.bothArms) P.bothArms.rotation.x = -Math.max(waveK, cheerK) * (1.5 + 0.35 * Math.sin(t * 11));
      if (P.hop) P.hop.position.y = cheerK * Math.abs(Math.sin(t * 6.5 + ph)) * (P.hopH || 0.3);
    };
  }

  const MAKERS = {};

  /* =====================================================================================
     the dinosaurs
     ===================================================================================== */
  const REX = [
    { c: '#8fe3b4', d: '#55c98f', b: '#eefbe2' }, { c: '#c3a9ff', d: '#9b7cf0', b: '#f3ecff' },
    { c: '#ffab9a', d: '#f47f7a', b: '#fff0e2' }, { c: '#8fd0ff', d: '#5aa9ee', b: '#eaf7ff' },
  ];
  /* the friendly T-rex: a big round head, a wide smile, tiny arms that wave. 3.3 m tall at size 1 */
  MAKERS.trex = function (grp, u, o, rnd, seed) {
    const v = seed % REX.length, c = REX[v], k = 'trex' + v, sc = sizeOf(o);
    const all = new T.Group();
    all.scale.setScalar(sc); grp.add(all);
    const body = part(all, k + 'B', () => [
      gs(c.c, 0, 1.45, -0.12, 0.78, 0.98, 0.92, 10, 8, 0.18),
      gs(c.b, 0, 1.3, 0.3, 0.56, 0.74, 0.56, 9, 7, 0.1),
      gs(c.c, 0.5, 0.85, -0.05, 0.36, 0.62, 0.48), gs(c.c, -0.5, 0.85, -0.05, 0.36, 0.62, 0.48),
      gs(c.c, 0.52, 0.15, 0.24, 0.3, 0.15, 0.5), gs(c.c, -0.52, 0.15, 0.24, 0.3, 0.15, 0.5),
      ...[-1, 1].flatMap((s) => [-0.16, 0, 0.16].map((dx) => gs(CREAM, s * 0.52 + dx, 0.1, 0.7, 0.075, 0.07, 0.09, 5, 4))),
      ...[[2.34, -0.42, -0.7], [2.06, -0.76, -1.0], [1.74, -0.98, -1.3], [1.42, -1.06, -1.5]].map(([y, z, rx]) => gcone(c.d, 0, y, z, 0.17, 0.34, 5, rx)),
    ], [0, 0, 0]);
    const tail = part(all, k + 'T', () => [
      sweep([[0, 1.25, -0.7], [0, 0.85, -1.5], [0, 0.6, -2.2], [0, 0.66, -2.75]], [0.62, 0.42, 0.22, 0.07], c.c, 8, 4),
      ...[0, 1, 2].map((i) => gcone(c.d, 0, 1.18 - i * 0.2, -1.5 - i * 0.42, 0.13 - i * 0.02, 0.24 - i * 0.03, 5, -1.25)),
    ], [0, 1.2, -0.7]);
    const head = part(all, k + 'H', () => [
      gs(c.c, 0, 2.62, 0.42, 0.64, 0.58, 0.72, 10, 8),
      gs(c.c, 0, 2.47, 0.98, 0.5, 0.4, 0.5, 10, 7),
      gs(c.b, 0, 2.3, 0.9, 0.42, 0.2, 0.46, 8, 5),
      smileOn(0, 2.47, 0.98, 0.5, 0.4, 0.5, 1.0, 0.6, 0.026),
      gs('#ffffff', 0.2, 2.23, 1.3, 0.05, 0.06, 0.05, 5, 4), gs('#ffffff', -0.2, 2.23, 1.3, 0.05, 0.06, 0.05, 5, 4),
      gs(c.d, 0.15, 2.66, 1.4, 0.04, 0.035, 0.03, 5, 3), gs(c.d, -0.15, 2.66, 1.4, 0.04, 0.035, 0.03, 5, 3),
      cheek(0.5, 2.46, 0.92, 0.14, 0.9), cheek(-0.5, 2.46, 0.92, 0.14, -0.9),
      gs(c.d, 0.3, 3.08, 0.3, 0.12, 0.08, 0.14, 5, 4), gs(c.d, -0.3, 3.08, 0.3, 0.12, 0.08, 0.14, 5, 4), gs(c.d, 0, 3.14, 0.12, 0.1, 0.07, 0.12, 5, 4),
    ], [0, 2.15, 0.15]);
    const eyes = part(head, k + 'E', () => [...eye(0.36, 2.86, 0.82, 0.19, 0.45), ...eye(-0.36, 2.86, 0.82, 0.19, -0.45)], [0, 2.86, 0.82]);
    const arm = (s) => part(all, k + 'A' + s, () => [
      sweep([[s * 0.6, 1.92, 0.42], [s * 0.7, 1.72, 0.72], [s * 0.62, 1.62, 0.96]], [0.13, 0.1, 0.085], c.c, 6, 3),
      gs(CREAM, s * 0.58, 1.58, 1.04, 0.045, 0.045, 0.06, 4, 3), gs(CREAM, s * 0.68, 1.6, 1.03, 0.045, 0.045, 0.06, 4, 3),
    ], [s * 0.6, 1.92, 0.42]);
    const arms = [arm(1), arm(-1)];
    shadow(grp, 1.1 * sc, 1.9 * sc).position.z = -0.6 * sc;
    u.r = 0.95 * sc; u.h = 3.3 * sc; u.size = sc;
    u.update = alive(grp, u, { body, head, eyes, tail, arms, hop: all, hopH: 0.25 * sc }, seed, o);
  };

  const LONG = [
    { c: '#9db8ff', d: '#7c98ee', b: '#eaf0ff' }, { c: '#ffc79e', d: '#f6a877', b: '#fff3e2' },
    { c: '#9fe6c8', d: '#6fd0a8', b: '#edfff4' }, { c: '#f5b0e0', d: '#e58fd0', b: '#fff0fa' },
  ];
  /* the long-neck: its head is 7.6 m up at size 1 (size 'xl' looks over the clouds). opts.leaf: it is chewing a branch */
  MAKERS.bronto = function (grp, u, o, rnd, seed) {
    const v = seed % LONG.length, c = LONG[v], k = 'bronto' + v, sc = sizeOf(o);
    const all = new T.Group();
    all.scale.setScalar(sc); grp.add(all);
    const body = part(all, k + 'B', () => [
      gs(c.c, 0, 2.3, 0, 1.25, 1.22, 2.05, 12, 8),
      gs(c.b, 0, 1.95, 0.15, 1.02, 0.95, 1.75, 10, 6),
      ...[[0.78, 1.1], [-0.78, 1.1], [0.78, -1.15], [-0.78, -1.15]].flatMap(([x, z]) => [gcyl(c.c, x, 0.95, z, 0.46, 0.38, 1.9, 8), gs(c.c, x, 0.12, z + 0.06, 0.42, 0.14, 0.46), ...[-0.2, 0, 0.2].map((dx) => gs(CREAM, x + dx, 0.09, z + 0.44, 0.09, 0.08, 0.08, 5, 3))]),
      ...[[0.5, 3.36, 0.3, 0.3], [-0.45, 3.4, -0.5, 0.26], [0.2, 3.46, -1.1, 0.22], [-0.6, 3.22, 0.9, 0.2], [0.72, 3.14, -0.9, 0.2]].map(([x, y, z, r]) => gs(c.d, x, y, z, r, r * 0.3, r, 6, 3)),
    ]);
    const tail = part(all, k + 'T', () => [sweep([[0, 2.4, -1.7], [0, 1.7, -3.1], [0, 1.0, -4.3], [0, 0.85, -5.3]], [0.8, 0.5, 0.24, 0.07], c.c, 8, 4)], [0, 2.4, -1.7]);
    const neck = part(all, k + 'N', () => [
      sweep([[0, 2.75, 1.25], [0, 4.2, 2.25], [0, 5.8, 2.62], [0, 7.05, 2.9]], [0.95, 0.66, 0.5, 0.42], (uu, a) => (Math.sin(a) < -0.35 ? c.b : c.c), 9, 5),
      ...[0, 1, 2, 3].map((i) => gs(c.d, 0, 4.0 + i * 0.85, 1.72 + i * 0.3 - i * i * 0.03, 0.16, 0.1, 0.2, 5, 3, -0.6)),
    ], [0, 2.75, 1.25]);
    const head = part(neck, k + 'H', () => {
      const parts = [
        gs(c.c, 0, 7.32, 3.25, 0.5, 0.44, 0.7, 10, 7),
        gs(c.c, 0, 7.66, 3.02, 0.3, 0.24, 0.34, 8, 5),
        gs(c.b, 0, 7.14, 3.52, 0.4, 0.22, 0.46, 8, 5),
        smileOn(0, 7.14, 3.52, 0.4, 0.22, 0.46, 0.85, 0.12, 0.022),
        gs(c.d, 0.12, 7.48, 3.9, 0.035, 0.03, 0.03, 4, 3), gs(c.d, -0.12, 7.48, 3.9, 0.035, 0.03, 0.03, 4, 3),
        cheek(0.42, 7.22, 3.5, 0.11, 1.1), cheek(-0.42, 7.22, 3.5, 0.11, -1.1),
      ];
      if (o.leaf) parts.push(sweep([[0, 7.12, 3.9], [0.25, 7.05, 4.2], [0.6, 7.12, 4.35]], [0.03, 0.03, 0.02], '#8a6a4a', 4, 2), gs('#6fcf7a', 0.5, 7.14, 4.34, 0.2, 0.05, 0.12, 6, 3, 0, 0.3), gs('#8ee08a', 0.22, 7.02, 4.2, 0.16, 0.05, 0.1, 6, 3, 0, -0.4), gs('#6fcf7a', -0.05, 7.04, 4.02, 0.14, 0.05, 0.1, 6, 3));
      return parts;
    }, [0, 7.05, 2.9]);
    const eyes = part(head, k + 'E', () => [...eye(0.38, 7.5, 3.42, 0.2, 0.7), ...eye(-0.38, 7.5, 3.42, 0.2, -0.7)], [0, 7.5, 3.42]);
    shadow(grp, 1.7 * sc, 3.3 * sc).position.z = -0.6 * sc;
    u.r = 1.5 * sc; u.h = 7.9 * sc; u.size = sc; u.headY = 7.3 * sc; u.headZ = 3.25 * sc;
    const live = alive(grp, u, { body, head, eyes, tail, headYaw: 1.1 }, seed, o), ph = seed * 2.1;
    u.update = function (dt, t) { live(dt, t); neck.rotation.set(Math.sin(t * 0.6 + ph) * 0.045, 0, Math.sin(t * 0.43 + ph) * 0.06); if (o.leaf) head.rotation.x += Math.sin(t * 7) * 0.035; };
  };

  const TRIKE = [
    { c: '#ffa3b5', d: '#f47f9a', b: '#fff0ee', f: '#ffd0da', dot: '#ffe066' }, { c: '#7fdcd4', d: '#52c4bd', b: '#ecfffb', f: '#b9f2ec', dot: '#ff9fcb' },
    { c: '#c6b0ff', d: '#a48cf2', b: '#f4eeff', f: '#e2d6ff', dot: '#7fe3c4' }, { c: '#ffc27a', d: '#f5a24e', b: '#fff4de', f: '#ffe0b0', dot: '#6fb8ff' },
  ];
  /* three horns and a frill with dots: 3.9 m long, 2.3 m tall at size 1 */
  MAKERS.trike = function (grp, u, o, rnd, seed) {
    const v = seed % TRIKE.length, c = TRIKE[v], k = 'trike' + v, sc = sizeOf(o);
    const all = new T.Group();
    all.scale.setScalar(sc); grp.add(all);
    const body = part(all, k + 'B', () => [
      gs(c.c, 0, 1.08, -0.25, 0.88, 0.84, 1.32, 10, 8),
      gs(c.b, 0, 0.84, -0.2, 0.72, 0.62, 1.12, 9, 6),
      ...[[0.56, 0.5], [-0.56, 0.5], [0.56, -0.95], [-0.56, -0.95]].flatMap(([x, z]) => [gcyl(c.c, x, 0.42, z, 0.32, 0.28, 0.84, 7), gs(c.c, x, 0.09, z + 0.05, 0.3, 0.1, 0.34), ...[-0.14, 0, 0.14].map((dx) => gs(CREAM, x + dx, 0.07, z + 0.32, 0.065, 0.06, 0.06, 5, 3))]),
      ...[0, 1, 2].map((i) => gs(c.d, (i - 1) * 0.3, 1.84 - Math.abs(i - 1) * 0.08, -0.5 - i * 0.2, 0.16, 0.06, 0.2, 6, 3)),
    ]);
    const tail = part(all, k + 'T', () => [sweep([[0, 1.15, -1.35], [0, 0.85, -2.0], [0, 0.62, -2.45]], [0.5, 0.26, 0.07], c.c, 7, 4)], [0, 1.15, -1.35]);
    const head = part(all, k + 'H', () => {
      const parts = [
        // the frill: a soft plate behind the head with a row of dots round its edge
        K.g(new T.SphereGeometry(1, 12, 6), c.f, 0, 1.78, 0.78, -0.42, 0, 0, 1.12, 1.0, 0.2),
        K.g(new T.SphereGeometry(1, 12, 6), c.d, 0, 1.72, 0.9, -0.42, 0, 0, 0.8, 0.72, 0.16),
        gs(c.c, 0, 1.3, 1.32, 0.62, 0.6, 0.76, 10, 8),
        gs(c.c, 0, 1.12, 1.9, 0.42, 0.38, 0.42, 9, 6),
        gs('#ffe9a8', 0, 1.02, 2.2, 0.26, 0.25, 0.22, 8, 5),
        smileOn(0, 1.12, 1.9, 0.42, 0.38, 0.42, 1.05, 0.5, 0.022),
        cheek(0.5, 1.12, 1.82, 0.12, 1.0), cheek(-0.5, 1.12, 1.82, 0.12, -1.0),
        // horns: short, round-tipped
        gcyl(CREAM, 0, 1.54, 2.1, 0.05, 0.11, 0.2, 7, 0.5), gs(CREAM, 0, 1.63, 2.15, 0.055),
        gcyl(CREAM, 0.34, 2.0, 1.5, 0.06, 0.13, 0.42, 7, 0.75, 0, -0.12), gs(CREAM, 0.36, 2.155, 1.645, 0.065),
        gcyl(CREAM, -0.34, 2.0, 1.5, 0.06, 0.13, 0.42, 7, 0.75, 0, 0.12), gs(CREAM, -0.36, 2.155, 1.645, 0.065),
      ];
      for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.5, r = 1.04; parts.push(gs(c.dot, Math.sin(a) * r, 1.9 + Math.cos(a) * r * 0.86, 0.7 - Math.cos(a) * 0.36, 0.11, 0.11, 0.09, 6, 4)); }
      return parts;
    }, [0, 1.25, 0.85]);
    const eyes = part(head, k + 'E', () => [...eye(0.46, 1.5, 1.72, 0.17, 0.75), ...eye(-0.46, 1.5, 1.72, 0.17, -0.75)], [0, 1.5, 1.72]);
    shadow(grp, 1.25 * sc, 2.3 * sc);
    u.r = 1.1 * sc; u.h = 2.85 * sc; u.size = sc;
    u.update = alive(grp, u, { body, head, eyes, tail, headYaw: 0.6, hop: all, hopH: 0.16 * sc }, seed, o);
  };

  const STEGO = [
    { c: '#a6e08a', d: '#7cc86a', b: '#f2ffe0', p: ['#ffe066', '#ffb85e', '#ff9a7a'] }, { c: '#8fc8ff', d: '#6aa8ee', b: '#ecf6ff', p: ['#ffc0e0', '#ff9fcb', '#f47fb5'] },
    { c: '#ffd98a', d: '#f5bd5a', b: '#fff8e2', p: ['#9fe6d8', '#6fd6c8', '#4fc4be'] }, { c: '#e0b0ff', d: '#c68cf2', b: '#f9efff', p: ['#fff0a0', '#ffd95e', '#ffb85e'] },
  ];
  /* plates along its back like a row of sweets: 4.4 m long, 2.5 m tall at size 1 */
  MAKERS.stego = function (grp, u, o, rnd, seed) {
    const v = seed % STEGO.length, c = STEGO[v], k = 'stego' + v, sc = sizeOf(o);
    const all = new T.Group();
    all.scale.setScalar(sc); grp.add(all);
    const body = part(all, k + 'B', () => {
      const parts = [
        gs(c.c, 0, 1.2, -0.15, 0.82, 0.9, 1.5, 10, 8),
        gs(c.b, 0, 0.92, -0.1, 0.66, 0.62, 1.28, 9, 6),
        ...[[0.52, 0.72, 0.62], [-0.52, 0.72, 0.62], [0.55, -1.0, 0.86], [-0.55, -1.0, 0.86]].flatMap(([x, z, h]) => [gcyl(c.c, x, h / 2, z, 0.3, 0.26, h, 7), gs(c.c, x, 0.09, z + 0.05, 0.29, 0.1, 0.33), ...[-0.13, 0, 0.13].map((dx) => gs(CREAM, x + dx, 0.07, z + 0.31, 0.06, 0.055, 0.06, 5, 3))]),
      ];
      // the plates: two rows, a little out of step, biggest over the hips
      for (let i = 0; i < 9; i++) {
        const t = i / 8, z = 1.0 - t * 2.5, y = 1.2 + Math.sqrt(Math.max(0, 1 - ((z + 0.15) / 1.5) ** 2)) * 0.84, sz = 0.24 + Math.sin(t * PI) * 0.26, s = i % 2 ? 1 : -1;
        parts.push(gs(c.p[i % 3], s * 0.15, y + sz * 0.55, z, sz * 0.16, sz * 0.95, sz * 0.7, 7, 6, 0, s * -0.22));
      }
      return parts;
    });
    const tail = part(all, k + 'T', () => [
      sweep([[0, 1.25, -1.45], [0, 0.95, -2.3], [0, 0.8, -3.0]], [0.55, 0.3, 0.1], c.c, 7, 4),
      ...[[1, -2.6], [-1, -2.6], [1, -2.88], [-1, -2.88]].flatMap(([s, z]) => [gcyl(CREAM, s * 0.2, 0.98, z, 0.035, 0.07, 0.3, 6, 0, 0, s * -0.95), gs(CREAM, s * 0.325, 1.068, z, 0.045)]),
    ], [0, 1.25, -1.45]);
    const head = part(all, k + 'H', () => [
      sweep([[0, 1.2, 1.1], [0, 0.98, 1.55], [0, 0.9, 1.85]], [0.5, 0.36, 0.32], c.c, 8, 3),
      gs(c.c, 0, 0.92, 2.02, 0.4, 0.36, 0.5, 9, 7),
      gs(c.b, 0, 0.8, 2.22, 0.3, 0.18, 0.32, 7, 4),
      smileOn(0, 0.8, 2.22, 0.3, 0.18, 0.32, 0.9, 0.15, 0.02),
      cheek(0.34, 0.84, 2.28, 0.09, 1.0), cheek(-0.34, 0.84, 2.28, 0.09, -1.0),
    ], [0, 1.15, 1.15]);
    const eyes = part(head, k + 'E', () => [...eye(0.3, 1.08, 2.2, 0.14, 0.7), ...eye(-0.3, 1.08, 2.2, 0.14, -0.7)], [0, 1.08, 2.2]);
    shadow(grp, 1.2 * sc, 2.6 * sc).position.z = -0.4 * sc;
    u.r = 1.05 * sc; u.h = 2.75 * sc; u.size = sc;
    u.update = alive(grp, u, { body, head, eyes, tail, headYaw: 0.7 }, seed, o);
  };

  const PTERO = [
    { c: '#ff9f7f', w: '#ffd2b0', b: '#fff0e0', k: '#ffd35a' }, { c: '#b9a0ff', w: '#e0d2ff', b: '#f6f0ff', k: '#ff9fcb' },
    { c: '#6fd6c8', w: '#c0f2e8', b: '#eefffa', k: '#ffb85e' },
  ];
  /* a pterodactyl gliding: wings 4.4 m across at size 1. Origin under it on the ground; opts.y = how high it flies (3).
     userData.flap (0…1): how hard it beats its wings (0.25 = a lazy glide) */
  MAKERS.ptero = function (grp, u, o, rnd, seed) {
    const v = seed % PTERO.length, c = PTERO[v], k = 'ptero' + v, sc = sizeOf(o), y0 = o.y === undefined ? 3 : o.y;
    const fly = new T.Group();
    fly.scale.setScalar(sc); fly.position.y = y0; grp.add(fly);
    const body = part(fly, k + 'B', () => [
      gs(c.c, 0, 0, -0.05, 0.3, 0.28, 0.62, 9, 7),
      gs(c.b, 0, -0.1, 0.02, 0.24, 0.2, 0.5, 8, 5),
      sweep([[0, 0, -0.55], [0, -0.02, -0.85], [0, 0.02, -1.05]], [0.14, 0.07, 0.03], c.c, 5, 2),
      gs(c.k, 0.1, -0.2, -0.5, 0.05, 0.05, 0.14, 5, 3), gs(c.k, -0.1, -0.2, -0.5, 0.05, 0.05, 0.14, 5, 3),
    ]);
    const head = part(fly, k + 'H', () => [
      sweep([[0, 0.05, 0.4], [0, 0.2, 0.62]], [0.2, 0.17], c.c, 6, 2),
      gs(c.c, 0, 0.26, 0.74, 0.25, 0.23, 0.3, 9, 7),
      gcone(c.k, 0, 0.2, 1.38, 0.13, 0.95, 7, PI / 2), gs(c.k, 0, 0.2, 1.84, 0.045),
      gcone(c.k, 0, 0.52, 0.34, 0.11, 0.7, 6, -PI / 2 - 0.5),
      cheek(0.2, 0.18, 0.9, 0.07, 1.1), cheek(-0.2, 0.18, 0.9, 0.07, -1.1),
    ], [0, 0.1, 0.45]);
    const eyes = part(head, k + 'E', () => [...eye(0.19, 0.34, 0.86, 0.105, 0.9), ...eye(-0.19, 0.34, 0.86, 0.105, -0.9)], [0, 0.34, 0.86]);
    const wing = (s) => part(fly, k + 'W' + s, () => {
      // a membrane of five triangles from the shoulder out to the tip, with the arm along its front edge
      const P = [[0.18, 0.04, 0.3], [1.05, 0.12, 0.52], [2.2, 0.02, -0.1], [1.5, 0.0, -0.42], [0.95, 0.0, -0.3], [0.5, 0.0, -0.62], [0.18, 0.0, -0.5]].map((p) => [p[0] * s, p[1], p[2]]);
      const tri = [[0, 1, 4], [1, 2, 3], [1, 3, 4], [0, 4, 6], [4, 5, 6]], pos = [];
      tri.forEach((q) => (s > 0 ? q : [q[0], q[2], q[1]]).forEach((i) => pos.push(P[i][0], P[i][1], P[i][2])));
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      return [K.paint(g, c.w), sweep([P[0], P[1], P[2]], [0.07, 0.055, 0.02], c.c, 5, 3)];
    }, [s * 0.18, 0.04, 0], twoSided());
    const wl = wing(1), wr = wing(-1);
    const sh = shadow(grp, 1.5 * sc, 0.8 * sc, 0.14);
    sh.visible = o.shadow !== false; // high in the air there is no ground under it
    u.r = 2.2 * sc; u.h = y0 + 0.6 * sc; u.size = sc; u.flap = o.flap === undefined ? 0.5 : o.flap;
    const ph = seed * 1.3;
    let wp = ph;
    u.look = NOOP;
    u.update = function (dt, t) {
      wp += dt * (3.2 + u.flap * 5);
      const f = Math.sin(wp), amp = 0.16 + u.flap * 0.55;
      wl.rotation.z = 0.12 + f * amp; wr.rotation.z = -0.12 - f * amp;
      fly.position.y = y0 - f * 0.12 * sc * (0.4 + u.flap) + Math.sin(t * 0.8 + ph) * 0.2 * sc;
      fly.rotation.z = Math.sin(t * 0.5 + ph) * 0.12; fly.rotation.x = Math.sin(t * 0.7 + ph) * 0.05;
      head.rotation.y = Math.sin(t * 0.6 + ph) * 0.25;
      eyes.scale.y = (t * 0.29 + ph * 0.37) % 1 > 0.965 ? 0.12 : 1;
      sh.scale.x = (1.5 - Math.abs(f) * 0.4) * sc;
    };
  };

  const BABY = [
    { c: '#9fe6b0', d: '#6fd08a', b: '#f0ffe6' }, { c: '#ffb3c8', d: '#f58fb0', b: '#fff0f2' }, { c: '#a8d0ff', d: '#7fb2f2', b: '#eef6ff' },
    { c: '#ffe08a', d: '#f5c25a', b: '#fffae2' }, { c: '#d0b6ff', d: '#b294f2', b: '#f6f0ff' },
  ];
  function babyHead(c, shell) {
    const parts = [
      gs(c.c, 0, 0.62, 0.08, 0.27, 0.26, 0.27, 10, 8),
      gs(c.c, 0, 0.55, 0.3, 0.18, 0.15, 0.17, 8, 6),
      smileOn(0, 0.55, 0.3, 0.18, 0.15, 0.17, 0.85, 0.5, 0.011),
      cheek(0.19, 0.55, 0.3, 0.055, 0.9), cheek(-0.19, 0.55, 0.3, 0.055, -0.9),
    ];
    if (shell) { // a piece of its egg still on its head, like a hat
      const cap = K.g(new T.SphereGeometry(0.29, 10, 4, 0, TAU, 0, PI * 0.36), '#fff8e8', 0, 0.66, 0.06, -0.12);
      parts.push(cap, gs('#ffc9de', 0.1, 0.93, 0.12, 0.05, 0.02, 0.05, 5, 3), gs('#bfe6ff', -0.12, 0.9, 0.0, 0.045, 0.02, 0.045, 5, 3));
    } else parts.push(...[[0.9, 0.02, -0.3], [0.83, -0.11, -0.8], [0.71, -0.19, -1.3]].map(([y, z, rx]) => gcone(c.d, 0, y, z, 0.05, 0.1, 4, rx))); // three soft spikes over the back of its head
    return parts;
  }
  const babyEyes = () => [...eye(0.14, 0.69, 0.27, 0.088, 0.4), ...eye(-0.14, 0.69, 0.27, 0.088, -0.4)];
  /* a baby dinosaur: 0.95 m tall at size 1, big head, some still wear a bit of eggshell. It walks: walk(dt, speed) */
  MAKERS.baby = function (grp, u, o, rnd, seed) {
    const v = seed % BABY.length, c = BABY[v], shell = o.shell === undefined ? seed % 3 === 0 : !!o.shell, k = 'baby' + v + (shell ? 's' : ''), sc = sizeOf(o);
    const all = new T.Group();
    all.scale.setScalar(sc); grp.add(all);
    const body = part(all, k + 'B', () => [
      gs(c.c, 0, 0.3, -0.02, 0.21, 0.23, 0.25, 9, 7),
      gs(c.b, 0, 0.27, 0.08, 0.16, 0.18, 0.17, 8, 5),
      ...[0, 1].map((i) => gcone(c.d, 0, 0.48 - i * 0.1, -0.2 - i * 0.07, 0.045, 0.09, 4, -1.0 - i * 0.3)),
      sweep([[0, 0.26, -0.2], [0, 0.18, -0.42], [0, 0.2, -0.58]], [0.13, 0.07, 0.025], c.c, 6, 3),
    ]);
    const head = part(all, k + 'H', () => babyHead(c, shell), [0, 0.42, 0.02]);
    const eyes = part(head, 'babyE', babyEyes, [0, 0.69, 0.27]);
    const leg = (s) => part(all, k + 'L' + s, () => [gs(c.c, s * 0.12, 0.13, 0, 0.085, 0.14, 0.1, 6, 5), gs(c.c, s * 0.12, 0.035, 0.07, 0.085, 0.04, 0.13, 6, 4)], [s * 0.12, 0.24, 0]);
    // (both arms are one mesh, and the tail is part of the body: a baby is small, it should cost few draws)
    const arms = part(all, k + 'A', () => [1, -1].map((s) => sweep([[s * 0.19, 0.36, 0.08], [s * 0.26, 0.28, 0.16]], [0.045, 0.035], c.c, 5, 2)), [0, 0.36, 0.08]);
    const legs = [leg(1), leg(-1)];
    shadow(grp, 0.3 * sc, 0.4 * sc, 0.22);
    u.r = 0.32 * sc; u.h = 0.95 * sc; u.size = sc;
    const live = alive(grp, u, { head, eyes, bothArms: arms, hop: all, hopH: 0.22 * sc, headYaw: 1.0 }, seed, o);
    let ph = seed * 1.3, amp = 0, walked = false;
    /* walk(dt, speed): step along; call it every frame while the game moves it */
    u.walk = function (dt, speed) { const s = Math.abs(speed || 0); ph += dt * s * 9; amp = damp(amp, Math.min(1, s / 0.8), 8, dt); walked = true; };
    u.bump = function () { u.cheer(true); u.bumped = true; setTimeout(() => u.cheer(false), 900); };
    u.update = function (dt, t) {
      live(dt, t);
      if (!walked) amp = damp(amp, 0, 8, dt);
      walked = false;
      const sw = Math.sin(ph) * amp;
      legs[0].rotation.x = -sw * 0.9; legs[1].rotation.x = sw * 0.9;
      body.rotation.z = sw * 0.12; head.rotation.z += sw * 0.1;
      all.position.y += Math.abs(Math.cos(ph)) * 0.035 * amp * sc;
    };
  };

  /* =====================================================================================
     unicorns
     ===================================================================================== */
  const UNI = [
    { c: '#ffffff', b: '#ffeef6', hoof: '#ffc4dd', mane: RAINBOW }, { c: '#ffd9ec', b: '#fff2f8', hoof: '#c9a6ff', mane: ['#c9a6ff', '#9fd8ff', '#ffffff', '#ff9fcb', '#c9a6ff', '#9fd8ff'] },
    { c: '#e6dcff', b: '#f6f2ff', hoof: '#ffd35a', mane: ['#ff9fcb', '#ffd35a', '#ff9fcb', '#ffffff', '#ffd35a', '#ff9fcb'] }, { c: '#d6f5ea', b: '#f2fffa', hoof: '#ff9fcb', mane: ['#6fd6c8', '#6fb8ff', '#b79cff', '#ff9fcb', '#6fb8ff', '#6fd6c8'] },
  ];
  /* a unicorn: 2.2 m to the tip of its horn at size 1. gallop(dt, speed) while the game moves it; opts.wings: it has wings */
  MAKERS.unicorn = function (grp, u, o, rnd, seed) {
    const v = seed % UNI.length, c = UNI[v], k = 'uni' + v, sc = sizeOf(o);
    const all = new T.Group(), bodyG = new T.Group();
    all.scale.setScalar(sc); grp.add(all); all.add(bodyG);
    bodyG.userData.pivot = [0, 0, 0];
    part(bodyG, k + 'B', () => [
      gs(c.c, 0, 1.02, -0.02, 0.46, 0.47, 0.76, 10, 8),
      gs(c.b, 0, 0.88, 0.0, 0.37, 0.34, 0.62, 8, 5),
      sweep([[0, 1.1, 0.5], [0, 1.42, 0.74], [0, 1.66, 0.86]], [0.38, 0.3, 0.25], c.c, 8, 3),
      // the mark on its hip: a little star
      ...[1, -1].map((s) => K.g(new T.CircleGeometry(0.11, 5), c.mane[1], s * 0.415, 1.14, -0.4, 0, s * 1.2, 0)),
      // the mane down the back of the neck
      ...[0, 1, 2, 3, 4].map((i) => gs(c.mane[i % c.mane.length], (i % 2 ? 0.07 : -0.07), 1.86 - i * 0.17, 0.66 - i * 0.1 - (i > 2 ? 0.08 : 0), 0.15, 0.17, 0.17, 7, 5)),
    ]);
    const head = part(bodyG, k + 'H', () => [
      gs(c.c, 0, 1.78, 0.98, 0.31, 0.31, 0.38, 10, 8),
      gs(c.b, 0, 1.66, 1.28, 0.21, 0.19, 0.21, 8, 6),
      smileOn(0, 1.66, 1.28, 0.21, 0.19, 0.21, 0.8, 0.5, 0.012),
      gs(INK, 0.07, 1.7, 1.47, 0.018, 0.022, 0.012, 4, 3), gs(INK, -0.07, 1.7, 1.47, 0.018, 0.022, 0.012, 4, 3),
      cheek(0.25, 1.66, 1.16, 0.07, 1.2), cheek(-0.25, 1.66, 1.16, 0.07, -1.2),
      gcone(c.c, 0.15, 2.08, 0.84, 0.07, 0.2, 5, -0.15, 0, -0.25), gcone(c.c, -0.15, 2.08, 0.84, 0.07, 0.2, 5, -0.15, 0, 0.25),
      gcone(BLUSH, 0.15, 2.07, 0.87, 0.035, 0.13, 4, -0.15, 0, -0.25), gcone(BLUSH, -0.15, 2.07, 0.87, 0.035, 0.13, 4, -0.15, 0, 0.25),
      // the horn: a golden twist
      ...[0, 1, 2, 3].map((i) => gcyl(i % 2 ? '#fff0b0' : GOLD, 0, 2.1 + i * 0.105, 1.08 + i * 0.04, 0.07 - (i + 1) * 0.015, 0.07 - i * 0.015, 0.11, 6, 0.36)),
      gs(c.mane[0], 0, 2.02, 1.02, 0.14, 0.12, 0.16, 7, 5), gs(c.mane[2], 0.06, 1.98, 0.84, 0.15, 0.14, 0.15, 7, 5),
    ], [0, 1.6, 0.82]);
    const eyes = part(head, k + 'E', () => [...eye(0.23, 1.85, 1.1, 0.115, 0.75), ...eye(-0.23, 1.85, 1.1, 0.115, -0.75)], [0, 1.85, 1.1]);
    const tail = part(bodyG, k + 'T', () => [sweep([[0, 1.15, -0.7], [0, 1.22, -1.05], [0, 0.85, -1.36], [0, 0.4, -1.4]], [0.1, 0.17, 0.15, 0.04], (uu) => c.mane[Math.min(5, Math.floor(uu * 6))], 7, 5)], [0, 1.15, -0.7]);
    // the two front legs are one mesh and so are the two hind legs: each pair swings about the line through its hips
    const pair = (z, key) => part(bodyG, k + 'L' + key, () => [0.23, -0.23].flatMap((x) => [gcyl(c.c, x, 0.5, z, 0.15, 0.115, 0.8, 7), gcyl(c.hoof, x, 0.08, z, 0.125, 0.14, 0.16, 7)]), [0, 0.86, z]);
    const legs = [pair(0.46, 'f'), pair(-0.5, 'h')];
    let wings = null;
    if (o.wings) {
      const wing = (s) => part(bodyG, k + 'W' + s, () => [0, 1, 2].map((i) => K.g(new T.SphereGeometry(1, 7, 4), i === 1 ? c.mane[4] : '#ffffff', s * (0.36 + i * 0.2), 1.42 + i * 0.03, -0.1 - i * 0.2, 0, s * -0.5, 0, 0.36 - i * 0.05, 0.035, 0.17)), [s * 0.16, 1.36, 0]);
      wings = [wing(1), wing(-1)];
    }
    const sh = shadow(grp, 0.5 * sc, 1.05 * sc);
    u.r = 0.6 * sc; u.h = 2.5 * sc; u.size = sc;
    const live = alive(grp, u, { head, eyes, tail, headYaw: 0.8 }, seed, o);
    let ph = seed * 1.9, amp = 0, ran = false;
    /* gallop(dt, speed): call every frame while the game moves it (speed in m/s; 2 = a trot, 8 = a gallop) */
    u.gallop = u.walk = function (dt, speed) { const s = Math.abs(speed || 0); ph += dt * (4 + Math.min(s, 14) * 0.75); amp = damp(amp, Math.min(1, s / 5), 6, dt); ran = true; };
    u.update = function (dt, t) {
      live(dt, t);
      if (!ran) amp = damp(amp, 0, 6, dt);
      ran = false;
      // the front and the hind pair swing against each other, and the body rocks with them
      const A = 0.25 + amp * 0.65;
      legs[0].rotation.x = Math.sin(ph) * A * amp; legs[1].rotation.x = Math.sin(ph + PI) * A * amp;
      const lift = Math.max(0, Math.sin(ph + 0.9)) * amp;
      bodyG.position.y = lift * 0.22; bodyG.rotation.x = Math.sin(ph + 0.4) * 0.09 * amp;
      tail.rotation.x = -amp * 0.7 + Math.sin(t * 5 + seed) * 0.1 * amp; tail.rotation.y += Math.sin(t * 2.2 + seed) * 0.15;
      if (wings) { const f = Math.sin(t * (5 + amp * 5) + seed); wings[0].rotation.z = 0.35 + f * 0.5; wings[1].rotation.z = -0.35 - f * 0.5; }
      sh.material.opacity = 0.24 - lift * 0.08;
    };
  };

  /* =====================================================================================
     things on the road
     ===================================================================================== */
  const EGGS = [
    { c: '#fff6e0', s: ['#ff9fcb', '#ffc4dd'] }, { c: '#e8f6ff', s: ['#6fb8ff', '#b79cff'] }, { c: '#f2ffe6', s: ['#7fdc9a', '#ffe066'] },
    { c: '#fff0f6', s: ['#b79cff', '#ff9fcb'] }, { c: '#fffbe0', s: ['#ffab5e', '#ff7b8a'] },
  ];
  function eggShell(c, part0, R = 0.34, H = 0.46) { // part0: 'bottom' | 'top'; the shell breaks 0.42 π down from the tip
    const CUT = PI * 0.42, th = part0 === 'top' ? [0, CUT] : [CUT, PI - CUT];
    const parts = [K.g(new T.SphereGeometry(1, 12, part0 === 'top' ? 4 : 6, 0, TAU, th[0], th[1]), c.c, 0, H, 0, 0, 0, 0, R, H, R)];
    // round spots: little balls sunk into the shell so that only a cap of each shows
    [[0.9, 0.62, 0.1], [2.6, 1.62, 0.12], [4.4, 0.75, 0.085], [5.6, 2.05, 0.11], [1.6, 2.25, 0.1], [3.5, 2.5, 0.08], [0.2, 1.7, 0.075], [4.9, 1.45, 0.07], [2.9, 0.45, 0.07]].forEach(([az, el, r], i) => {
      if ((el < CUT) !== (part0 === 'top') || Math.abs(el - CUT) < r / 0.4) return;
      const rr = r * 1.9, k = 1 - (0.86 * rr) / 0.4;
      parts.push(gs(c.s[i % 2], R * Math.sin(el) * Math.sin(az) * k, H + H * Math.cos(el) * k, R * Math.sin(el) * Math.cos(az) * k, rr, rr, rr, 7, 4));
    });
    return K.merge(parts);
  }
  /* a light egg for the scenery: one geometry of about 170 triangles, 0.9 m tall, standing on the origin; nest: in a nest */
  S.eggGeo = function (seed, nest) {
    ready();
    const v = Math.abs(seed | 0) % EGGS.length, c = EGGS[v], R = 0.34, H = 0.46;
    return geo('eggLite' + v + (nest ? 'n' : ''), () => {
      const parts = [K.g(new T.SphereGeometry(1, 9, 6), c.c, 0, H, 0, 0, 0, 0, R, H, R)];
      [[0.9, 0.7, 0.1], [2.6, 1.5, 0.12], [4.4, 0.8, 0.09], [5.6, 1.9, 0.11], [1.7, 2.1, 0.1], [3.6, 2.3, 0.09]].forEach(([az, el, r], i) => {
        const nx = (Math.sin(el) * Math.sin(az)) / R, ny = Math.cos(el) / H, nz = (Math.sin(el) * Math.cos(az)) / R, l = Math.hypot(nx, ny, nz), d = new T.CircleGeometry(r, 7);
        d.rotateX(-Math.asin(ny / l)); d.rotateY(Math.atan2(nx, nz));
        parts.push(K.g(d, c.s[i % 2], R * Math.sin(el) * Math.sin(az) + (nx / l) * 0.012, H + H * Math.cos(el) + (ny / l) * 0.012, R * Math.sin(el) * Math.cos(az) + (nz / l) * 0.012));
      });
      if (nest) parts.push(K.g(new T.TorusGeometry(0.4, 0.13, 4, 9), '#e6c58a', 0, 0.1, 0, PI / 2), K.g(new T.TorusGeometry(0.34, 0.1, 4, 8), '#d4ad6a', 0, 0.2, 0, PI / 2, 0, 0.5));
      return K.merge(parts);
    });
  };
  /* a dinosaur egg, 0.9 m tall. bump(side): it rocks. hatch(): the top pops off and a baby looks out (userData.hatched).
     opts.nest: it lies in a nest of straw */
  MAKERS.egg = function (grp, u, o, rnd, seed) {
    const v = seed % EGGS.length, c = EGGS[v], bc = BABY[(seed * 3 + 1) % BABY.length], sc = sizeOf(o);
    const all = new T.Group(), body = new T.Group();
    all.scale.setScalar(sc); grp.add(all); all.add(body);
    body.userData.pivot = [0, 0, 0];
    const bottom = part(body, 'eggB' + v, () => [eggShell(c, 'bottom')]);
    const top = part(body, 'eggT' + v, () => [eggShell(c, 'top')], [0, 0.56, 0]);
    const baby = new T.Group();
    baby.userData.pivot = [0, 0, 0];
    const bh = part(baby, 'eggBaby' + (seed * 3 + 1) % BABY.length, () => babyHead(bc, false));
    const be = part(bh, 'babyE', babyEyes, [0, 0.69, 0.27]);
    baby.position.y = -0.52; baby.visible = false; body.add(baby);
    if (o.nest) all.add(new T.Mesh(geo('nest', () => K.merge([
      K.g(new T.TorusGeometry(0.42, 0.13, 5, 12), '#e6c58a', 0, 0.1, 0, PI / 2), K.g(new T.TorusGeometry(0.36, 0.1, 5, 11), '#d4ad6a', 0, 0.2, 0, PI / 2, 0, 0.5),
      gs('#f3d9a4', 0, 0.06, 0, 0.4, 0.06, 0.4, 8, 3),
    ])), K.vmat()));
    shadow(grp, 0.44 * sc, 0.44 * sc, 0.22);
    u.r = 0.4 * sc; u.h = 0.92 * sc; u.size = sc; u.hatched = false;
    let wt = -1, dir = 1, ht = -1;
    const ph = seed * 2.3;
    u.bump = function (side) { wt = 0; dir = side < 0 ? -1 : 1; u.bumped = true; };
    u.hatch = function () { if (ht < 0 && !u.hatched) { ht = 0; baby.visible = true; } };
    u.reset = function () { ht = -1; wt = -1; u.hatched = false; u.bumped = false; baby.visible = false; baby.position.y = -0.52; top.position.copy(top.userData.home); top.rotation.set(0, 0, 0); top.visible = true; body.rotation.set(0, 0, 0); };
    u.update = function (dt, t) {
      if (wt >= 0) { // rocking after a bump
        wt += dt;
        const kk = Math.exp(-3.2 * wt);
        body.rotation.z = dir * 0.5 * kk * Math.sin(wt * 11); body.rotation.x = -0.2 * kk * Math.sin(wt * 9);
        if (kk < 0.012) { wt = -1; body.rotation.set(0, 0, 0); }
      } else if (ht < 0 && !u.hatched) body.rotation.z = Math.sin(t * 2.1 + ph) * 0.03 + ((t * 0.23 + ph) % 1 > 0.9 ? Math.sin(t * 30) * 0.05 : 0); // now and then it wiggles: somebody is in there
      if (ht >= 0) {
        ht += dt;
        const kk = Math.min(1, ht / 0.55), e = 1 - (1 - kk) * (1 - kk);
        top.position.set(top.userData.home.x - e * 0.3, top.userData.home.y + Math.sin(kk * PI) * 0.5 + e * 0.02 - e * 0.5, top.userData.home.z - e * 0.3);
        top.rotation.set(-e * 2.6, 0, e * 0.6);
        baby.position.y = -0.52 + e * 0.5;
        if (kk >= 1) { ht = -1; u.hatched = true; }
      }
      if (baby.visible) { bh.rotation.z = Math.sin(t * 3 + ph) * 0.12; be.scale.y = (t * 0.33 + ph) % 1 > 0.96 ? 0.12 : 1; }
    };
  };

  /* a small cloud that sleeps on the road, 0.8 m tall. bump(side): it squashes and bounces. pop(): it puffs away (userData.gone); reset() */
  MAKERS.puff = function (grp, u, o, rnd, seed) {
    const v = seed % 3, sc = sizeOf(o), tint = ['#ffffff', '#fff0f7', '#f0f6ff'][v];
    const body = new T.Group();
    body.scale.setScalar(sc); grp.add(body);
    body.add(new T.Mesh(geo('puff' + v, () => K.merge([
      gs(tint, 0, 0.36, 0, 0.5, 0.36, 0.42, 9, 7), gs(tint, 0.42, 0.28, 0.02, 0.34, 0.27, 0.32, 8, 6), gs(tint, -0.44, 0.27, -0.02, 0.33, 0.26, 0.31, 8, 6),
      gs(tint, 0.14, 0.58, -0.05, 0.3, 0.25, 0.28, 8, 6), gs(tint, -0.2, 0.52, 0.02, 0.26, 0.22, 0.26, 8, 6),
      // a sleepy face: closed eyes, a tiny smile, pink cheeks
      smile([0.1, 0.4, 0.4], [0.17, 0.37, 0.41], [0.24, 0.4, 0.39], 0.014), smile([-0.1, 0.4, 0.4], [-0.17, 0.37, 0.41], [-0.24, 0.4, 0.39], 0.014),
      smile([-0.05, 0.28, 0.42], [0, 0.26, 0.43], [0.05, 0.28, 0.42], 0.012),
      cheek(0.3, 0.3, 0.36, 0.06, 0.5), cheek(-0.3, 0.3, 0.36, 0.06, -0.5),
    ])), glowMat('cloud', '#8fa8d8', 0.22)));
    const sh = shadow(grp, 0.75 * sc, 0.5 * sc, 0.16);
    u.r = 0.62 * sc; u.h = 0.82 * sc; u.size = sc; u.gone = false; u.soft = true;
    const ph = seed * 1.4;
    let bt = -1, pt = -1;
    u.bump = function () { bt = 0; u.bumped = true; };
    u.pop = function () { if (pt < 0 && !u.gone) pt = 0; };
    u.reset = function () { bt = pt = -1; u.gone = false; u.bumped = false; grp.visible = true; body.scale.setScalar(sc); };
    u.update = function (dt, t) {
      if (u.gone) return;
      let sy = 1 + Math.sin(t * 1.6 + ph) * 0.04, s = 1;
      if (bt >= 0) { bt += dt; const kk = Math.exp(-4 * bt); sy *= 1 - 0.45 * kk * Math.cos(bt * 14); if (kk < 0.02) bt = -1; }
      if (pt >= 0) { pt += dt; const kk = pt / 0.35; s = kk < 0.4 ? 1 + kk * 0.9 : Math.max(0, 1.36 * (1 - (kk - 0.4) / 0.6)); if (kk >= 1) { u.gone = true; grp.visible = false; return; } }
      body.scale.set(sc * s / Math.sqrt(sy), sc * s * sy, sc * s / Math.sqrt(sy));
      body.position.y = 0.06 * sc + Math.sin(t * 1.6 + ph) * 0.03 * sc;
      sh.material.opacity = 0.16 * Math.min(1, s);
    };
  };

  /* a rainbow ring to ride through. At size 1 the hole is 2.7 m wide and its middle is 1.6 m above the road
     (userData.r = the radius of the hole, userData.cy = the height of its middle). pass(): it flashes and spins.
     It faces along the road (turn the group like anything else). opts.size: a number scales it (5 = a gate over the whole road) */
  MAKERS.ring = function (grp, u, o, rnd, seed) {
    const sc = typeof o.size === 'number' ? o.size : 1, R = 1.5, cy = o.cy === undefined ? R + 0.12 : o.cy;
    const spin = new T.Group();
    spin.scale.setScalar(sc); spin.position.y = cy * sc; grp.add(spin);
    spin.add(new T.Mesh(geo('ring', () => {
      // one hoop painted in six bands from its outer edge to its inner edge, so both faces show the whole rainbow
      const g = K.g(new T.TorusGeometry(R, 0.17, 12, 40), '#ffffff'), c = new T.Color(), p = g.attributes.position, col = g.attributes.color;
      for (let i = 0; i < p.count; i += 3) {
        const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        const round = Math.abs(Math.atan2(z, Math.hypot(x, y) - R)); // 0 on the outer edge … π on the inner edge
        c.set(RAINBOW[Math.min(5, Math.floor((round / PI) * 6))]); for (let j = 0; j < 3; j++) col.setXYZ(i + j, c.r, c.g, c.b);
      }
      const stars = [];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.26; stars.push(K.g(new T.OctahedronGeometry(0.11), i % 2 ? '#ffffff' : '#ffe680', Math.cos(a) * (R + 0.38), Math.sin(a) * (R + 0.38), 0, 0, 0, a + PI / 2, 1, 1.7, 1)); }
      return K.merge([g].concat(stars));
    }), glowMat('ring', '#ff9fcb', 0.14)));
    u.r = (R - 0.17) * sc; u.h = (cy + R + 0.3) * sc; u.cy = cy * sc; u.size = sc; u.gate = true; u.passed = false;
    const ph = seed * 0.9;
    let pt = -1;
    u.pass = function () { if (pt < 0) pt = 0; u.passed = true; };
    u.reset = function () { pt = -1; u.passed = false; spin.scale.setScalar(sc); };
    u.update = function (dt, t) {
      let s = 1 + Math.sin(t * 2.4 + ph) * 0.025, w = 0.5;
      if (pt >= 0) { pt += dt; const kk = pt / 0.6; s *= 1 + Math.sin(Math.min(1, kk) * PI) * 0.3; w = 0.5 + (1 - Math.min(1, kk)) * 14; if (kk >= 1) pt = -1; }
      spin.rotation.z += dt * w; spin.scale.setScalar(sc * s);
    };
  };

  function heartGeo(size, depth) {
    const s = new T.Shape(), k = size;
    s.moveTo(0, -0.7 * k); s.bezierCurveTo(-1.45 * k, 0.15 * k, -0.7 * k, 1.2 * k, 0, 0.42 * k); s.bezierCurveTo(0.7 * k, 1.2 * k, 1.45 * k, 0.15 * k, 0, -0.7 * k);
    const e = new T.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: true, bevelThickness: depth * 0.8, bevelSize: size * 0.1, bevelSegments: 3, curveSegments: 7 });
    e.translate(0, 0, -depth / 2);
    return e;
  }
  S.heartGeo = (size, depth) => { ready(); return heartGeo(size, depth); };
  /* a puffy heart, as the volcano blows them: 1 m across. It floats at opts.y (1.2) and turns. collect() / reset() like a star */
  MAKERS.heartpuff = function (grp, u, o, rnd, seed) {
    const sc = sizeOf(o), y0 = o.y === undefined ? 1.2 : o.y, col = ['#ff9fcb', '#ffb9d9', '#ff8fb8', '#ffc9e4'][seed % 4];
    const m = new T.Mesh(geo('heartpuff' + col, () => K.merge([K.g(heartGeo(0.42, 0.2), col)])), glowMat('heart', '#ff5fa2', 0.3));
    m.scale.setScalar(sc); m.position.y = y0; grp.add(m);
    shadow(grp, 0.4 * sc, 0.4 * sc, 0.14);
    u.r = 0.5 * sc; u.h = y0 + 0.5 * sc; u.size = sc; u.gone = false; u.value = 3;
    const ph = seed * 1.7;
    let ct = -1;
    u.collect = u.pop = function () { if (ct < 0 && !u.gone) ct = 0; };
    u.reset = function () { ct = -1; u.gone = false; grp.visible = true; };
    u.update = function (dt, t) {
      if (u.gone) return;
      let s = sc * (1 + Math.sin(t * 3 + ph) * 0.06);
      if (ct >= 0) { ct += dt; const kk = ct / 0.4; s *= 1 + kk * 0.9; m.position.y = y0 + kk * 0.8; if (kk >= 1) { u.gone = true; grp.visible = false; return; } }
      else m.position.y = y0 + Math.sin(t * 1.8 + ph) * 0.12;
      m.rotation.y = Math.sin(t * 1.2 + ph) * 0.7; m.scale.setScalar(Math.max(0.001, s));
    };
  };

  const BALLOON = [['#ff9fcb', '#ffffff'], ['#6fb8ff', '#ffe066'], ['#b79cff', '#7fe3c4'], ['#ffab5e', '#fff3b0']];
  /* a hot-air balloon, 9 m tall, with a baby dinosaur waving from the basket. Origin = the bottom of the basket */
  MAKERS.hotair = function (grp, u, o, rnd, seed) {
    const v = seed % BALLOON.length, c = BALLOON[v], sc = sizeOf(o);
    const sway = new T.Group();
    sway.scale.setScalar(sc); grp.add(sway);
    sway.add(new T.Mesh(geo('hotair' + v, () => {
      const env = K.g(new T.SphereGeometry(1, 12, 9), c[0], 0, 6.1, 0, 0, 0, 0, 2.7, 3.1, 2.7), p = env.attributes.position;
      paintWhere(env, (x, y, z) => (Math.floor(((Math.atan2(x, z) + PI) / TAU) * 12) % 2 ? c[1] : null));
      // the bottom of the envelope narrows to its mouth
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 5.6) { const kk = clamp((5.6 - y) / 2.6, 0, 1), f = 1 - kk * 0.45; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); p.setY(i, y - kk * 0.5); } }
      env.computeVertexNormals();
      const parts = [env, gcyl('#e6c58a', 0, 0.5, 0, 0.62, 0.5, 1.0, 8), K.g(new T.TorusGeometry(0.62, 0.07, 5, 10), '#c99a5a', 0, 1.0, 0, PI / 2), gcyl(c[0], 0, 2.62, 0, 1.0, 0.85, 0.3, 10)];
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + PI / 4; parts.push(sweep([[Math.cos(a) * 0.55, 1.0, Math.sin(a) * 0.55], [Math.cos(a) * 0.82, 2.5, Math.sin(a) * 0.82]], [0.022, 0.022], '#ffffff', 4, 1)); }
      return K.merge(parts);
    }), K.vmat()));
    const bc = BABY[(seed + 2) % BABY.length], pass = new T.Group();
    pass.userData.pivot = [0, 0, 0];
    const bh = part(pass, 'hotBaby' + (seed + 2) % BABY.length, () => babyHead(bc, false)), be = part(bh, 'babyE', babyEyes, [0, 0.69, 0.27]);
    pass.position.set(0, 0.62, 0.12); pass.scale.setScalar(1.25); sway.add(pass);
    u.r = 2.7 * sc; u.h = 9.2 * sc; u.size = sc;
    const ph = seed * 1.1;
    u.look = NOOP;
    u.update = function (dt, t) {
      sway.rotation.z = Math.sin(t * 0.5 + ph) * 0.05; sway.rotation.x = Math.cos(t * 0.37 + ph) * 0.04; sway.position.y = Math.sin(t * 0.6 + ph) * 0.5;
      bh.rotation.z = Math.sin(t * 2.4 + ph) * 0.15; bh.rotation.y = Math.sin(t * 0.8 + ph) * 0.5; be.scale.y = (t * 0.3 + ph) % 1 > 0.96 ? 0.12 : 1;
    };
  };

  /* =====================================================================================
     make(kind, opts) → THREE.Group      opts.seed picks the colours; opts.size: 's' (0.6) | 'm' (1) | 'l' (1.6) | 'xl' (2.6) | a number
     ---------------------------------------------------------------------------------
     trex · trike · stego        look(x, y, z) (its head follows a place in the world; look() = lets go), wave(secs) (trex), cheer(on)
     bronto                      the same; opts.leaf (it chews a branch); userData.headY / headZ = where its head is
     ptero                       opts.y (how high), opts.shadow: false (high in the air), userData.flap 0…1
     baby                        walk(dt, speed), cheer(on), bump(), look(); opts.shell
     unicorn                     gallop(dt, speed) (= walk), look(); opts.wings
     egg                         bump(side), hatch() → userData.hatched, reset(); opts.nest
     puff                        bump(), pop() → userData.gone, reset(); userData.soft
     ring                        pass(), reset(); userData.r = the hole's radius, userData.cy = its middle; opts.size (number), opts.cy
     heartpuff                   collect() (= pop()) → userData.gone, reset(); opts.y
     hotair                      a balloon with a passenger (scenery)
     ===================================================================================== */
  S.make = function (kind, opts) {
    ready();
    const grp = new T.Group(), u = grp.userData, o = opts || {}, f = MAKERS[kind];
    const seed = o.seed === undefined ? ++auto : Math.abs(o.seed | 0);
    u.kind = kind; u.r = 0.4; u.h = 1;
    grp.name = 'sky-' + kind;
    if (!f) { console.warn('rideSky: unknown kind', kind); u.update = NOOP; return grp; }
    f(grp, u, o, K.rng(seed * 7919 + 97), seed);
    if (!u.update) u.update = NOOP;
    if (!u.look) u.look = NOOP;
    return grp;
  };
  S.KINDS = Object.keys(MAKERS);
  /* the modelling helpers, for the scenery (ride-sky-scene.js) */
  S.modelKit = function () { ready(); return { gs, gcone, gcyl, sweep, paintWhere, eye, cheek, smileOn, heartGeo, glowMat, RAINBOW, INK, BLUSH, CREAM, GOLD }; };

  /* the model standing still, as one geometry in its own coordinates (the shadow and the glow are left out) */
  S.still = function (kind, opts) {
    const o = opts || {}, key = 'still|' + kind + '|' + (o.seed || 0) + '|' + (o.size || '') + '|' + (o.leaf ? 1 : 0) + (o.wings ? 'w' : '') + (o.nest ? 'n' : '') + (o.y || '');
    return geo(key, () => {
      const grp = S.make(kind, o), list = [];
      grp.userData.update(0, o.t || 0);
      grp.updateMatrixWorld(true);
      grp.traverse((m) => { if (!m.isMesh || !m.visible || !m.geometry.attributes.color || !m.geometry.attributes.normal || m.material.transparent) return; const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); list.push(g); });
      const out = K.merge(list);
      list.forEach((g) => g.dispose());
      return out;
    });
  };
})();
