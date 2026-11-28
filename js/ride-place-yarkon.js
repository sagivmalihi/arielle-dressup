/* ride-place-yarkon.js — what waits at the end of the ride to Yarkon Park: pedal boats and ducks on the river, reeds
   on the bank, picnics on the lawn, kites, eucalyptus trees, the park's tethered balloon, a wooden bridge.
   Needs THREE + ride-kit.js (both loaded only when a ride starts).

     const boat = DU.rideScene.yarkon.make('boat', { seed: 2 });   // a THREE.Group
     scene.add(boat); … every frame: boat.userData.update(dt, t);

   Every group: origin on the ground (or on the water) at its centre, front = +Z, y up, metres (as in ride-models.js).
   group.userData = { kind, r (the radius it takes), h (height), update(dt, t) }.
   A piece rocks, turns and flutters by itself, but it never moves its own group: sailing a boat down the river or
   leading the ducks along the bank is for whoever placed them. The river, its banks and the lawns themselves are
   drawn by the world from the map (ride-world.js). See the table further down for kinds and options.

   The end of the file is the place itself, DU.RIDE_PLACE.yarkon (the contract: places.js): its texts, icon and
   arrival sound, a level made for this long way, the welcome scene built from the pieces, and what moves in it. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const Y = ((DU.rideScene = DU.rideScene || {}).yarkon = {});
  const PI = Math.PI, TAU = PI * 2;
  let T, K, P, MAT = {};
  const NOOP = function () {};
  function ready() { if (K && T === window.THREE) return; T = window.THREE; K = DU.rideKit; P = K.PAL; MAT = {}; }

  /* ---------- colours of the place ---------- */
  const WHITE = '#ffffff', WOOD = '#c9976b', WOOD_D = '#a97b52', WOOD_L = '#ddb48a';
  const BOAT = ['#ff8fc0', '#ffd54d', '#7de3e0', '#ff9d4d', '#b99cff'], SKIN = ['#f3c9a8', '#e0a878', '#b9825a', '#f7d9bf'], HAIR = ['#5a3c2a', '#2f2a35', '#d9a23f', '#a8522c'];
  const SHIRT = ['#ff6b6b', '#5aa9ff', '#63c98a', '#ffd54d', '#b99cff', '#ff9d4d'];
  const BARK = '#ece4d2', BARK_D = '#cdbfa3', GUM = ['#7fae7b', '#93bd8a', '#6b9b72', '#a4c797'];
  const KITE = [['#ff6b6b', '#ffd54d'], ['#5aa9ff', '#ffffff'], ['#b99cff', '#ff8fc0'], ['#63c98a', '#ffd54d'], ['#ff9d4d', '#7de3e0']];
  const GORE = ['#ffffff', '#ffd54d', '#ffffff', '#ff8fc0', '#ffffff', '#7de3e0', '#ffffff', '#ff9d4d'];
  const FLOWER = ['#ff8fc0', '#ffd54d', '#c79bff', '#ff9d4d', '#ffffff'];

  /* ---------- small helpers ---------- */
  const gb = (w, h, d, col, x, y, z, rx, ry, rz) => K.g(new T.BoxGeometry(w, h, d), col, x, y, z, rx || 0, ry || 0, rz || 0);
  const gc = (rt, rb, h, seg, col, x, y, z, rx, ry, rz) => K.g(new T.CylinderGeometry(rt, rb, h, seg), col, x, y, z, rx || 0, ry || 0, rz || 0);
  /* a faceted blob */
  const gi = (r, col, x, y, z, sx = 1, sy = 1, sz = 1, det = 0) => K.g(new T.IcosahedronGeometry(r, det), col, x, y, z, 0, 0, 0, sx, sy, sz, true);
  /* a smooth ball (lo: with fewer faces, for the small and the far) */
  const gs = (r, col, x, y, z, sx = 1, sy = 1, sz = 1, lo = false) => K.g(new T.SphereGeometry(r, lo ? 6 : 8, lo ? 4 : 6), col, x, y, z, 0, 0, 0, sx, sy, sz);
  /* flat faces from corner points: 3 points = a triangle, 4 = a quad */
  function face(col, ...p) {
    const v = p.length === 4 ? [p[0], p[1], p[2], p[0], p[2], p[3]] : p, geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute([].concat(...v), 3));
    geo.computeVertexNormals();
    return K.paint(geo, col);
  }
  /* a rod from p1 to p2 (radius r at p1, r2 at p2) */
  function tube(p1, p2, r, col, seg, r2) {
    const a = new T.Vector3(...p1), b = new T.Vector3(...p2), d = b.clone().sub(a), len = d.length();
    const e = new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()));
    return K.g(new T.CylinderGeometry(r2 === undefined ? r : r2, r, len, seg || 5), col, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2, e.x, e.y, e.z);
  }
  /* things painted on the ground must win over the layers of the world under them */
  const groundMat = () => MAT.ground || (MAT.ground = new T.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -8 }));
  const twoSided = () => MAT.two || (MAT.two = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
  const add = (grp, parts, mat) => { const m = new T.Mesh(K.merge(parts), mat || K.vmat()); grp.add(m); return m; };
  function shadow(grp, rx, rz, x, z, op) { const b = K.blob(1, op === undefined ? 0.2 : op); b.scale.set(rx, rz, 1); b.position.x = x || 0; b.position.z = z || 0; grp.add(b); return b; }
  /* a child sitting (in a boat, on a blanket): seen from the waist up, an arm in the air */
  function sitter(x, y, z, i, wave) {
    const sk = SKIN[i % SKIN.length], parts = [gb(0.28, 0.34, 0.2, SHIRT[i % SHIRT.length], x, y + 0.17, z), gs(0.14, sk, x, y + 0.5, z), K.g(new T.SphereGeometry(0.15, 8, 5, 0, TAU, 0, PI * 0.55), HAIR[i % HAIR.length], x, y + 0.52, z - 0.01)];
    parts.push(tube([x - 0.16, y + 0.3, z], [x - 0.22, y + 0.12, z + 0.14], 0.045, sk, 5));
    parts.push(wave ? tube([x + 0.16, y + 0.3, z], [x + 0.32, y + 0.62, z + 0.02], 0.045, sk, 5) : tube([x + 0.16, y + 0.3, z], [x + 0.22, y + 0.12, z + 0.14], 0.045, sk, 5));
    return parts;
  }

  const MAKERS = {};

  /* =====================================================================================
     a pedal boat (every fourth one is a swan). The origin is on the water under the middle of it.
     ===================================================================================== */
  MAKERS.boat = function (grp, u, o, rnd, seed) {
    const swan = o.swan === undefined ? seed % 4 === 0 : o.swan, col = swan ? WHITE : (o.color || BOAT[seed % BOAT.length]);
    const dark = new T.Color(col).multiplyScalar(0.82).getStyle(), riders = o.riders === undefined ? 2 : o.riders;
    const rock = new T.Group();
    grp.add(rock);
    const parts = [];
    // the hull: a tub that is wider at the top, a white rim around the deck, a hollow for the seats
    parts.push(gc(1, 0.8, 0.52, 10, col, 0, 0.16, 0).scale(0.86, 1, 1.4), gc(1.04, 1.04, 0.1, 10, WHITE, 0, 0.44, 0).scale(0.86, 1, 1.4), gc(1, 1, 0.12, 10, dark, 0, 0.45, -0.1).scale(0.62, 1, 0.8));
    // two seats with backs
    [-1, 1].forEach((sg) => parts.push(gb(0.44, 0.1, 0.42, WHITE, sg * 0.3, 0.54, -0.25), gb(0.44, 0.46, 0.09, WHITE, sg * 0.3, 0.76, -0.5, -0.18, 0, 0)));
    parts.push(gb(0.05, 0.36, 0.05, '#9aa7b2', 0, 0.68, 0.3, 0.3, 0, 0), gi(0.06, P.dark, 0, 0.86, 0.36, 1, 1, 1, 1)); // the tiller
    if (swan) { // a long neck that bends, a head with an orange beak, two wings
      const neck = [[0, 0.5, 1.0], [0, 1.0, 1.38], [0, 1.5, 1.42], [0, 1.9, 1.2], [0, 2.02, 1.34]];
      for (let i = 0; i < 4; i++) { parts.push(tube(neck[i], neck[i + 1], 0.2 - i * 0.02, WHITE, 7, 0.18 - i * 0.02)); if (i) parts.push(gs(0.19 - i * 0.02, WHITE, ...neck[i])); }
      parts.push(gs(0.2, WHITE, 0, 2.0, 1.42, 1, 0.9, 1.25), K.g(new T.ConeGeometry(0.1, 0.34, 6), P.orange, 0, 1.94, 1.76, PI / 2 + 0.25, 0, 0), gs(0.07, P.dark, 0, 1.99, 1.6, 1.3, 0.7, 0.8), gs(0.035, P.dark, -0.13, 2.06, 1.5), gs(0.035, P.dark, 0.13, 2.06, 1.5));
      [-1, 1].forEach((sg) => { // wings: three feathers that rise towards the back
        for (let i = 0; i < 3; i++) parts.push(gs(0.5, i === 1 ? '#f1f6fa' : WHITE, sg * (0.84 + i * 0.03), 0.72 + i * 0.16, -0.15 - i * 0.36, 0.2, 0.55 - i * 0.06, 1.35 - i * 0.15));
      });
      parts.push(K.g(new T.ConeGeometry(0.26, 0.6, 5), WHITE, 0, 0.72, -1.42, -1.0, 0, 0));
    } else { // a striped roof on four thin posts, and a number-less round bow lamp
      [[-0.62, 0.55], [0.62, 0.55], [-0.62, -0.75], [0.62, -0.75]].forEach(([x, z]) => parts.push(gc(0.025, 0.025, 1.25, 5, WHITE, x, 1.1, z)));
      for (let i = 0; i < 6; i++) parts.push(gb(1.5 / 6, 0.06, 1.6, i % 2 ? WHITE : col, -0.75 + (i + 0.5) * (1.5 / 6), 1.74, -0.1));
      parts.push(gb(1.56, 0.1, 0.05, dark, 0, 1.7, 0.7), gb(1.56, 0.1, 0.05, dark, 0, 1.7, -0.9), gi(0.1, P.yellow, 0, 0.54, 1.2, 1, 1, 1, 1));
    }
    for (let i = 0; i < riders; i++) parts.push(...sitter((i ? 1 : -1) * 0.3, 0.58, -0.28, seed + i * 3, i === (seed % 2)));
    add(rock, parts);
    // the paddle wheel turns behind the seats; ripples stay flat on the water
    const wheel = new T.Mesh(K.merge([gc(0.26, 0.26, 0.5, 8, WHITE, 0, 0, 0, 0, 0, PI / 2), ...[0, 1, 2, 3].map((i) => gb(0.52, 0.5, 0.04, dark, 0, 0, 0, (i / 4) * PI, 0, 0))]), K.vmat());
    wheel.position.set(0, 0.36, -1.12);
    if (!swan) rock.add(wheel);
    const ring = new T.Mesh(new T.RingGeometry(1.52, 1.6, 20), MAT.ring || (MAT.ring = new T.MeshBasicMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.4, depthWrite: false })));
    ring.rotation.x = -PI / 2; ring.position.y = 0.05; ring.renderOrder = 1;
    grp.add(ring);
    u.r = 1.5; u.h = swan ? 2.2 : 1.85; u.swan = swan;
    const ph = seed * 1.7;
    u.speed = 1; // how fast it is being pedalled (0 = it lies still)
    u.update = function (dt, t) {
      rock.rotation.z = Math.sin(t * 1.3 + ph) * 0.045; rock.rotation.x = Math.cos(t * 1.1 + ph) * 0.03; rock.position.y = Math.sin(t * 1.6 + ph) * 0.03 - 0.06;
      wheel.rotation.x -= dt * 5 * u.speed;
      const k = (t * 0.45 + ph) % 1; ring.scale.setScalar(0.8 + k * 0.9); ring.visible = k < 0.9; // a ripple that widens and is gone
    };
  };

  /* =====================================================================================
     a duck with her ducklings in a row behind her (opts.n of them). She looks along +Z.
     ===================================================================================== */
  function duckParts(s, body, head, x, z, lo) {
    const parts = [
      gs(0.2 * s, body, x, 0.12 * s, z, 0.8, 0.62, 1.25, lo), K.g(new T.ConeGeometry(0.1 * s, 0.22 * s, 5), body, x, 0.2 * s, z - 0.26 * s, -0.9, 0, 0),
      gs(0.12 * s, head, x, 0.34 * s, z + 0.17 * s, 1, 1, 1, lo), K.g(new T.ConeGeometry(0.05 * s, 0.14 * s, 5), P.orange, x, 0.32 * s, z + 0.31 * s, PI / 2, 0, 0, 1.3, 1, 0.6),
      gi(0.024 * s, P.dark, x - 0.07 * s, 0.38 * s, z + 0.23 * s), gi(0.024 * s, P.dark, x + 0.07 * s, 0.38 * s, z + 0.23 * s),
    ];
    if (!lo) parts.push(gc(0.06 * s, 0.075 * s, 0.14 * s, 6, head, x, 0.24 * s, z + 0.15 * s), gs(0.13 * s, body, x - 0.14 * s, 0.15 * s, z - 0.02 * s, 0.35, 0.6, 1.2, true), gs(0.13 * s, body, x + 0.14 * s, 0.15 * s, z - 0.02 * s, 0.35, 0.6, 1.2, true)); // a neck and wings
    return parts;
  }
  MAKERS.ducks = function (grp, u, o, rnd, seed) {
    const n = o.n === undefined ? 3 : o.n, mallard = seed % 3 === 1;
    const mum = new T.Group();
    add(mum, duckParts(1, mallard ? '#a98058' : WHITE, mallard ? '#3f8f63' : WHITE, 0, 0));
    grp.add(mum);
    let kids = null;
    if (n) { const parts = []; for (let i = 0; i < n; i++) parts.push(...duckParts(0.55, '#ffe07a', '#ffd54d', Math.sin(i * 1.9 + seed) * 0.14, -0.55 - i * 0.42, true)); kids = add(grp, parts); }
    // a wake behind them, lying on the water
    const wake = new T.Mesh(new T.RingGeometry(0.34, 0.42, 14, 1, PI * 1.15, PI * 0.7), MAT.wake || (MAT.wake = new T.MeshBasicMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.55, depthWrite: false })));
    wake.rotation.x = -PI / 2; wake.position.set(0, 0.04, 0.1); wake.renderOrder = 1; wake.scale.set(1.2, 1.6, 1);
    grp.add(wake);
    u.r = 0.5 + n * 0.25; u.h = 0.5;
    const ph = seed * 2.1;
    u.update = function (dt, t) {
      mum.position.y = Math.sin(t * 2.2 + ph) * 0.018; mum.rotation.z = Math.sin(t * 1.7 + ph) * 0.06;
      // now and then she tips forward to look under the water, tail up
      const k = (t * 0.13 + ph * 0.3) % 1, dip = k < 0.16 ? Math.sin((k / 0.16) * PI) : 0;
      mum.rotation.x = dip * 1.15; mum.position.z = dip * 0.08;
      if (kids) { kids.position.y = Math.sin(t * 2.6 + ph + 1) * 0.02; kids.rotation.y = Math.sin(t * 1.2 + ph) * 0.07; kids.position.x = Math.sin(t * 0.9 + ph) * 0.05; }
    };
  };

  /* =====================================================================================
     reeds and bulrushes at the edge of the water, a few lily leaves, a dragonfly going round
     ===================================================================================== */
  MAKERS.reeds = function (grp, u, o, rnd, seed) {
    const n = o.n || 16, spread = o.spread || 1.6, parts = [];
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * spread * 2, z = (rnd() - 0.5) * spread * 0.9, h = 1.1 + rnd() * 1.1, lx = (rnd() - 0.5) * 0.3, lz = (rnd() - 0.5) * 0.3;
      parts.push(K.g(new T.ConeGeometry(0.04, h, 4), i % 3 ? '#6fbf63' : '#58a85e', x, h / 2, z, lz, 0, -lx));
      if (i % 3 === 0) parts.push(gc(0.05, 0.05, 0.3, 5, '#8a5a3a', x + lx * h * 0.45, h * 0.95, z + lz * h * 0.45, lz, 0, -lx));
    }
    for (let i = 0; i < 3; i++) { const geo = new T.CircleGeometry(0.26 + rnd() * 0.12, 8, rnd() * TAU, TAU * 0.9); geo.rotateX(-PI / 2); parts.push(K.g(geo, i % 2 ? '#5bb86b' : '#7ccb6a', (rnd() - 0.5) * spread * 2, 0.05, -spread * 0.55 - rnd() * 0.5)); }
    for (let i = 0; i < 3; i++) parts.push(gi(0.2 + rnd() * 0.14, '#e6dcc8', (rnd() - 0.5) * spread * 2, 0.06, spread * 0.5 + rnd() * 0.3, 1.2, 0.5, 1));
    add(grp, parts, twoSided());
    const fly = new T.Mesh(K.merge([tube([0, 0, -0.14], [0, 0, 0.1], 0.016, '#5aa9ff', 4), gi(0.03, '#3f86d9', 0, 0, 0.12, 1, 1, 1, 1), face('#dff6ff', [-0.2, 0, 0.06], [0, 0, 0.02], [0, 0, 0.09]), face('#dff6ff', [0.2, 0, 0.06], [0, 0, 0.09], [0, 0, 0.02]), face('#dff6ff', [-0.17, 0, -0.03], [0, 0, -0.04], [0, 0, 0.02]), face('#dff6ff', [0.17, 0, -0.03], [0, 0, 0.02], [0, 0, -0.04])]), twoSided());
    grp.add(fly);
    u.r = spread; u.h = 2.2;
    const ph = seed * 1.3;
    u.update = function (dt, t) { const a = t * 1.1 + ph, r = spread * 0.8; fly.position.set(Math.cos(a) * r, 1.25 + Math.sin(t * 2.3 + ph) * 0.25, Math.sin(a * 2) * r * 0.4); fly.rotation.y = -a + PI; fly.rotation.z = Math.sin(t * 30) * 0.12; };
  };

  /* =====================================================================================
     a picnic: a checked blanket, a basket, a watermelon, things to eat and to play with
     ===================================================================================== */
  MAKERS.picnic = function (grp, u, o, rnd, seed) {
    const col = [P.red, P.blue, P.pink, P.orange][seed % 4], W = 2.6, D = 2.1, N = 6, flat = [], parts = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const g = new T.PlaneGeometry(W / N, D / N); g.rotateX(-PI / 2); flat.push(K.g(g, (i + j) % 2 ? WHITE : col, -W / 2 + (i + 0.5) * (W / N), 0.05, -D / 2 + (j + 0.5) * (D / N))); }
    for (let i = 0; i < 9; i++) { const g = new T.PlaneGeometry(0.08, 0.16); g.rotateX(-PI / 2); flat.push(K.g(g, WHITE, -W / 2 + 0.16 + i * ((W - 0.32) / 8), 0.05, D / 2 + 0.07), K.g(g, WHITE, -W / 2 + 0.16 + i * ((W - 0.32) / 8), 0.05, -D / 2 - 0.07)); } // the fringe
    add(grp, flat, groundMat());
    // the basket with its handle and a cloth, bread sticking out
    parts.push(gb(0.62, 0.34, 0.44, '#d9a86a', -0.75, 0.24, -0.5), gb(0.66, 0.05, 0.48, WOOD_D, -0.75, 0.42, -0.5), K.g(new T.TorusGeometry(0.3, 0.03, 5, 10, PI), WOOD_D, -0.75, 0.42, -0.5), gb(0.36, 0.06, 0.5, WHITE, -0.62, 0.45, -0.5, 0, 0, 0.12), tube([-0.95, 0.4, -0.45], [-1.05, 0.72, -0.4], 0.05, '#e9b872', 6));
    for (let i = 0; i < 3; i++) parts.push(gb(0.62, 0.02, 0.02, WOOD_D, -0.75, 0.14 + i * 0.1, -0.28));
    // half a watermelon and two slices
    parts.push(K.g(new T.SphereGeometry(0.3, 10, 6, 0, TAU, 0, PI / 2), '#4fae6a', 0.55, 0.07, -0.45, PI, 0, 0, 1, 0.8, 1), gc(0.28, 0.28, 0.02, 10, '#ff5d6c', 0.55, 0.075, -0.45), gc(0.3, 0.3, 0.012, 10, '#eafbe6', 0.55, 0.07, -0.45));
    for (let i = 0; i < 5; i++) parts.push(gi(0.02, P.dark, 0.55 + Math.cos(i * 1.3) * 0.15, 0.09, -0.45 + Math.sin(i * 1.3) * 0.15));
    [[0.95, 0.1, 0.4], [1.05, 0.38, -0.3]].forEach(([x, z, ry]) => parts.push(K.g(new T.CylinderGeometry(0.26, 0.26, 0.05, 8, 1, false, 0, PI), '#ff5d6c', x, 0.085, z, 0, ry, 0), K.g(new T.CylinderGeometry(0.29, 0.29, 0.045, 8, 1, false, 0, PI), '#4fae6a', x, 0.08, z, 0, ry, 0)));
    // a plate of sandwiches, a bottle of juice and cups, a ball, a kite waiting for its turn (or a teddy bear)
    parts.push(gc(0.24, 0.24, 0.025, 10, WHITE, 0, 0.07, 0.4));
    for (let i = 0; i < 3; i++) parts.push(K.g(new T.CylinderGeometry(0.13, 0.13, 0.07, 3), '#f5deb3', Math.cos(i * 2.1) * 0.1, 0.12, 0.4 + Math.sin(i * 2.1) * 0.1, 0, i, 0), K.g(new T.CylinderGeometry(0.132, 0.132, 0.02, 3), '#8fd16c', Math.cos(i * 2.1) * 0.1, 0.12, 0.4 + Math.sin(i * 2.1) * 0.1, 0, i, 0));
    parts.push(gc(0.07, 0.08, 0.3, 8, P.orange, -0.35, 0.21, 0.1), gc(0.035, 0.05, 0.1, 6, P.orange, -0.35, 0.41, 0.1), gc(0.04, 0.04, 0.03, 6, WHITE, -0.35, 0.47, 0.1));
    [[-0.1, 0.02, P.teal], [-0.5, 0.42, P.yellow]].forEach(([x, z, c]) => parts.push(gc(0.055, 0.042, 0.11, 7, c, x, 0.11, z)));
    parts.push(K.g(new T.SphereGeometry(0.19, 10, 7), P.yellow, 1.55, 0.2, 0.75), K.g(new T.SphereGeometry(0.193, 10, 3, 0, TAU, PI * 0.38, PI * 0.24), P.red, 1.55, 0.2, 0.75));
    if (seed % 2) { // the teddy
      const tx = -1.0, tz = 0.55, br = '#c9976b';
      parts.push(gs(0.17, br, tx, 0.22, tz, 1, 1.1, 0.9), gs(0.13, br, tx, 0.47, tz), gi(0.05, br, tx - 0.1, 0.58, tz), gi(0.05, br, tx + 0.1, 0.58, tz), gi(0.055, '#ead2b0', tx, 0.44, tz + 0.11), gi(0.02, P.dark, tx - 0.045, 0.5, tz + 0.115), gi(0.02, P.dark, tx + 0.045, 0.5, tz + 0.115), gi(0.07, br, tx - 0.17, 0.26, tz + 0.05), gi(0.07, br, tx + 0.17, 0.26, tz + 0.05), gi(0.075, br, tx - 0.1, 0.1, tz + 0.15), gi(0.075, br, tx + 0.1, 0.1, tz + 0.15));
    } else { // two cushions
      parts.push(gb(0.5, 0.14, 0.5, P.purple, -0.95, 0.12, 0.55, 0, 0.3, 0), gb(0.46, 0.14, 0.46, P.teal, -0.5, 0.12, 0.72, 0, -0.2, 0));
    }
    // a few daisies in the grass around
    for (let i = 0; i < 7; i++) { const a = rnd() * TAU, r = 1.9 + rnd() * 0.8; parts.push(gi(0.07, FLOWER[i % FLOWER.length], Math.cos(a) * r, 0.1, Math.sin(a) * r * 0.85, 1, 0.6, 1), gi(0.03, P.yellow, Math.cos(a) * r, 0.14, Math.sin(a) * r * 0.85)); }
    add(grp, parts, twoSided());
    u.r = 1.8; u.h = 0.8;
  };

  /* =====================================================================================
     a kite on its string. The origin is where the string is held; the kite flies about opts.h above it and
     wanders in a slow figure of eight (this is inside the group: the group itself stays put).
     ===================================================================================== */
  MAKERS.kite = function (grp, u, o, rnd, seed) {
    const h = o.h || 9, c = KITE[seed % KITE.length], delta = o.shape ? o.shape === 'delta' : seed % 3 === 2, back = o.back === undefined ? h * 0.55 : o.back;
    const kite = new T.Group(), parts = [];
    if (delta) { // a wide triangle with a keel
      parts.push(face(c[0], [0, 0.55, 0], [-1.0, -0.45, 0], [0, -0.2, 0]), face(c[1], [0, 0.55, 0], [0, -0.2, 0], [1.0, -0.45, 0]), face(c[1], [0, 0.3, 0], [0, -0.2, 0], [0, -0.1, 0.35]));
    } else { // a diamond in four quarters
      parts.push(face(c[0], [0, 0.62, 0], [-0.46, 0.12, 0], [0, 0.12, 0]), face(c[1], [0, 0.62, 0], [0, 0.12, 0], [0.46, 0.12, 0]), face(c[1], [-0.46, 0.12, 0], [0, -0.62, 0], [0, 0.12, 0]), face(c[0], [0.46, 0.12, 0], [0, 0.12, 0], [0, -0.62, 0]));
      parts.push(tube([0, -0.62, 0.01], [0, 0.62, 0.01], 0.012, WOOD_D, 3), tube([-0.46, 0.12, 0.01], [0.46, 0.12, 0.01], 0.012, WOOD_D, 3));
    }
    add(kite, parts, twoSided());
    // the tail: a ribbon with bows, in two pieces so it can snake
    const tails = [0, 1].map((j) => {
      const tp = [tube([0, 0, 0], [0, -0.9, 0], 0.01, WHITE, 3)];
      for (let i = 0; i < 2; i++) { const y = -0.3 - i * 0.45, col = FLOWER[(seed + i + j * 2) % FLOWER.length]; tp.push(face(col, [0, y, 0], [-0.16, y + 0.09, 0], [-0.16, y - 0.09, 0]), face(col, [0, y, 0], [0.16, y - 0.09, 0], [0.16, y + 0.09, 0])); }
      const m = new T.Mesh(K.merge(tp), twoSided());
      return m;
    });
    tails[0].position.y = delta ? -0.3 : -0.62; kite.add(tails[0]);
    tails[1].position.y = -0.9; tails[0].add(tails[1]);
    grp.add(kite);
    // the string: one line from the hand to the kite, redrawn as the kite moves
    const lg = new T.BufferGeometry();
    lg.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
    const line = new T.Line(lg, MAT.line || (MAT.line = new T.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 })));
    line.frustumCulled = false;
    grp.add(line);
    add(grp, [gc(0.035, 0.035, 0.16, 6, c[0], 0, 0, 0, 0, 0, PI / 2)]); // the reel in the hand
    u.r = 0.3; u.h = h + 1; u.fly = kite;
    const ph = seed * 1.9, amp = Math.min(2.2, h * 0.22);
    u.update = function (dt, t) {
      const a = t * 0.55 + ph, x = Math.sin(a) * amp, y = h + Math.sin(a * 2) * amp * 0.35, z = -back + Math.cos(a * 0.7) * amp * 0.4;
      kite.position.set(x, y, z);
      kite.rotation.set(-0.5 + Math.sin(a * 2) * 0.1, Math.sin(a) * 0.25, -Math.cos(a) * 0.3);
      tails[0].rotation.z = Math.sin(t * 3 + ph) * 0.35 + Math.cos(a) * 0.3; tails[0].rotation.x = 0.4;
      tails[1].rotation.z = Math.sin(t * 3 + ph - 1.1) * 0.5;
      const p = lg.attributes.position.array; p[3] = x; p[4] = y - 0.1; p[5] = z; lg.attributes.position.needsUpdate = true;
    };
    u.update(0, 0);
  };

  /* =====================================================================================
     a eucalyptus: a tall pale trunk that sheds its bark, a few big limbs, loose hanging crowns of grey-green
     ===================================================================================== */
  MAKERS.eucalyptus = function (grp, u, o, rnd, seed) {
    const h = o.h || 12 + rnd() * 4, parts = [], lean = (rnd() - 0.5) * 0.12;
    const fork = h * (0.42 + rnd() * 0.1), top = [lean * fork, fork, (rnd() - 0.5) * 0.4];
    parts.push(tube([0, 0, 0], top, 0.46, BARK, 7, 0.3), gc(0.5, 0.62, 0.5, 7, BARK_D, 0, 0.25, 0));
    for (let i = 0; i < 5; i++) { const k = 0.12 + i * 0.17 + rnd() * 0.05, a = rnd() * TAU, r = 0.47 - 0.16 * k; parts.push(gb(0.22, 0.5 + rnd() * 0.5, 0.05, i % 2 ? BARK_D : '#d9cdb4', top[0] * k + Math.cos(a) * r, fork * k, top[2] * k + Math.sin(a) * r, 0, -a + PI / 2, 0)); } // patches where the bark peeled
    const limbs = 3 + (seed % 2), col = () => GUM[Math.floor(rnd() * GUM.length)];
    for (let i = 0; i < limbs; i++) {
      const a = (i / limbs) * TAU + rnd() * 0.7, out = 1.6 + rnd() * 1.8, ly = fork + (h - fork) * (0.45 + rnd() * 0.4), end = [top[0] + Math.cos(a) * out, ly, top[2] + Math.sin(a) * out];
      parts.push(tube(top, end, 0.22, BARK, 5, 0.1));
      // a crown at the end of the limb: a broad tuft and two or three that hang under it
      const s = 1.5 + rnd() * 0.7;
      parts.push(gi(s, col(), end[0], end[1] + s * 0.45, end[2], 1.15, 0.8, 1.15, 1));
      const hang = 2 + (i % 2);
      for (let j = 0; j < hang; j++) { const b = a + (j - (hang - 1) / 2) * 1.1 + rnd() * 0.4, d = s * (0.5 + rnd() * 0.35); parts.push(gi(s * (0.42 + rnd() * 0.15), col(), end[0] + Math.cos(b) * d, end[1] - s * (0.25 + rnd() * 0.3), end[2] + Math.sin(b) * d, 0.75, 1.5, 0.75)); }
    }
    parts.push(gi(1.7, col(), top[0] + lean, h - 1.2, top[2], 1.1, 0.9, 1.1, 1), tube(top, [top[0] + lean, h - 1.6, top[2]], 0.2, BARK, 5, 0.08));
    for (let i = 0; i < 4; i++) parts.push(gb(0.5 + rnd() * 0.5, 0.02, 0.12, '#d9cdb4', (rnd() - 0.5) * 2.2, 0.03, (rnd() - 0.5) * 2.2, 0, rnd() * 3, 0)); // strips of bark on the ground
    add(grp, parts);
    shadow(grp, 3.6, 3.6, -1.2, -1, 0.2);
    u.r = 0.65; u.h = h + 0.6; u.crown = 4.2; u.under = fork * 0.8; // how wide the crown is, and how high the lowest leaves hang
  };

  /* =====================================================================================
     the tethered balloon of the park: it stands in the sky on its cable, a ring-shaped basket under it.
     The origin is the winch on the ground; opts.h = how high the middle of the balloon is, opts.r its radius.
     ===================================================================================== */
  MAKERS.balloon = function (grp, u, o, rnd, seed) {
    const r = o.r || 8, h = o.h || 34, sway = new T.Group(), up = new T.Group();
    grp.add(sway); sway.add(up);
    // the envelope: gores in white and happy colours, a little longer than wide, a cap on top
    const env = K.g(new T.SphereGeometry(r, 16, 10), WHITE, 0, 0, 0, 0, 0, 0, 1, 1.08, 1, true);
    const pos = env.attributes.position.array, colA = env.attributes.color.array, c = new T.Color();
    for (let f = 0; f < pos.length / 9; f++) {
      const i = f * 9, cx = (pos[i] + pos[i + 3] + pos[i + 6]) / 3, cy = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3, cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
      const g = Math.floor(((Math.atan2(cz, cx) + PI) / TAU) * 16 + 0.001) % 16;
      c.set(cy > r * 0.93 ? P.yellow : GORE[(g + seed) % GORE.length]).multiplyScalar(0.9 + 0.1 * Math.max(0, cy / r)); // a soft shade towards the belly
      for (let k = 0; k < 3; k++) { colA[i + k * 3] = c.r; colA[i + k * 3 + 1] = c.g; colA[i + k * 3 + 2] = c.b; }
    }
    const parts = [env, K.g(new T.ConeGeometry(r * 0.42, r * 0.55, 16, 1, true), P.yellow, 0, -r * 1.2, 0, PI, 0, 0, 1, 1, 1, true), gc(r * 0.16, r * 0.16, 0.3, 10, WHITE, 0, -r * 1.45, 0)];
    // the ropes down to the ring-shaped basket (people stand all around it, the cable goes through the middle)
    const gy = -r * 1.95, gr = r * 0.34;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; parts.push(tube([Math.cos(a) * r * 0.72, -r * 0.78, Math.sin(a) * r * 0.72], [Math.cos(a) * gr, gy + 0.5, Math.sin(a) * gr], 0.03, WHITE, 3)); }
    parts.push(K.g(new T.TorusGeometry(gr, r * 0.075, 6, 14), P.blue, 0, gy, 0, PI / 2, 0, 0, 1, 1, 2.2), K.g(new T.TorusGeometry(gr, r * 0.03, 5, 14), WHITE, 0, gy + r * 0.17, 0, PI / 2, 0, 0));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; parts.push(gs(r * 0.04, SKIN[i % SKIN.length], Math.cos(a) * gr, gy + r * 0.25, Math.sin(a) * gr), gb(r * 0.07, r * 0.1, r * 0.05, SHIRT[i % SHIRT.length], Math.cos(a) * gr, gy + r * 0.14, Math.sin(a) * gr, 0, -a, 0)); }
    add(up, parts);
    up.position.y = h;
    // the cable is one thin rod that is stretched to wherever the basket is
    const cable = new T.Mesh(K.merge([gc(0.05, 0.05, 1, 4, '#dfe5ea', 0, 0.5, 0)]), K.vmat());
    sway.add(cable);
    // the winch on its round platform, a low fence, a flag
    const base = [gc(3.2, 3.4, 0.25, 12, '#e6dccb', 0, 0.125, 0), gc(0.7, 0.8, 0.9, 8, P.blue, 0, 0.7, 0), gc(0.9, 0.9, 0.5, 10, '#9aa7b2', 0, 1.3, 0, 0, 0, PI / 2), gc(0.12, 0.12, 2.2, 6, WHITE, 0, 1.3, 0, 0, 0, PI / 2)];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; base.push(gc(0.05, 0.05, 0.9, 5, WHITE, Math.cos(a) * 3, 0.7, Math.sin(a) * 3), tube([Math.cos(a) * 3, 1.05, Math.sin(a) * 3], [Math.cos(a + TAU / 12) * 3, 1.05, Math.sin(a + TAU / 12) * 3], 0.03, i % 2 ? P.yellow : P.pink, 4)); }
    add(grp, base);
    shadow(grp, r * 0.9, r * 0.9, -h * 0.25, -h * 0.2, 0.14);
    u.r = 3.5; u.h = h + r * 1.1; u.top = up;
    u.rise = 1; // 0 = the basket waits just above the winch, 1 = up at its full height
    const ph = seed * 1.3, low = 2.6 - gy;
    u.update = function (dt, t) {
      sway.rotation.z = Math.sin(t * 0.31 + ph) * 0.035; sway.rotation.x = Math.cos(t * 0.23 + ph) * 0.025;
      up.position.y = low + (h - low) * Math.max(0, Math.min(1, u.rise)) + Math.sin(t * 0.4 + ph) * r * 0.12; up.rotation.y = t * 0.05 + ph;
      cable.scale.y = up.position.y + gy;
    };
    u.update(0, 0);
  };

  /* =====================================================================================
     a wooden bridge over the river: it spans along z, a little higher in the middle, on pairs of piles.
     Walk on it from z = -span/2 to z = span/2; userData.deckY(z) = how high the planks are there.
     ===================================================================================== */
  MAKERS.bridge = function (grp, u, o) {
    const span = o.span || 44, w = o.w || 3, rise = o.rise === undefined ? 1.2 : o.rise, base = o.y === undefined ? 0.5 : o.y, parts = [];
    const yAt = (z) => base + rise * (1 - (2 * z / span) * (2 * z / span));
    const N = Math.max(6, Math.round(span / 2.6)), L = span / N;
    const beam = (x, ya, yb, z, bw, bh, col) => { const a = Math.atan2(yb - ya, L); return gb(bw, bh, Math.hypot(L, yb - ya), col, x, (ya + yb) / 2, z + L / 2, -a, 0, 0); }; // a lath from one post to the next
    for (let i = 0; i < N; i++) { // the deck, bay by bay: planks, two beams under them
      const z0 = -span / 2 + i * L, z1 = z0 + L, y0 = yAt(z0), y1 = yAt(z1), a = Math.atan2(y1 - y0, L), len = Math.hypot(L, y1 - y0), ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
      for (let j = 0; j < 3; j++) parts.push(gb(w, 0.08, len / 3 - 0.05, (i * 3 + j) % 2 ? WOOD : WOOD_L, 0, ym + (j - 1) * (y1 - y0) / 3, zm + (j - 1) * L / 3, -a, 0, 0));
      [-1, 1].forEach((sg) => parts.push(gb(0.16, 0.3, len + 0.02, WOOD_D, sg * (w / 2 - 0.12), ym - 0.19, zm, -a, 0, 0)));
    }
    for (let i = 0; i <= N; i++) { // posts and rails on both sides, a cross of two laths in every bay
      const z = -span / 2 + i * L, y = yAt(z);
      [-1, 1].forEach((sg) => {
        const x = sg * (w / 2 - 0.06);
        parts.push(gb(0.14, 1.3, 0.14, WOOD, x, y + 0.6, z));
        if (i === N) return;
        const y2 = yAt(z + L);
        parts.push(beam(x, y + 1.1, y2 + 1.1, z, 0.1, 0.1, WOOD_D), beam(x, y + 0.2, y2 + 0.2, z, 0.06, 0.07, WOOD_D));
        parts.push(beam(x, y + 0.2, y2 + 1.1, z, 0.04, 0.06, WOOD_L), beam(x, y + 1.1, y2 + 0.2, z, 0.04, 0.06, WOOD_L));
      });
    }
    const piers = Math.max(1, Math.round(span / 7.5) - 1); // pairs of piles that stand in the water, a beam across each pair
    for (let i = 1; i <= piers; i++) {
      const z = -span / 2 + (i * span) / (piers + 1), y = yAt(z);
      [-1, 1].forEach((sg) => parts.push(gc(0.16, 0.19, y + 1.0, 6, WOOD_D, sg * (w / 2 - 0.25), (y - 1.0) / 2 - 0.2, z), gc(0.26, 0.26, 0.06, 8, '#e8f8ff', sg * (w / 2 - 0.25), 0.045, z)));
      parts.push(gb(w + 0.3, 0.2, 0.22, WOOD_D, 0, y - 0.42, z));
    }
    [-1, 1].forEach((sg) => parts.push(gb(w + 0.5, 0.3, 1.6, '#e6dccb', 0, base * 0.5 - 0.02, sg * (span / 2 + 0.6), sg * -0.28, 0, 0))); // a stone ramp at each end
    add(grp, parts);
    u.r = span / 2; u.h = base + rise + 1.3; u.span = span; u.w = w; u.deckY = (z) => yAt(Math.max(-span / 2, Math.min(span / 2, z))) + 0.05;
  };

  /* =====================================================================================
     make(kind, opts) → THREE.Group      opts.seed picks the variant (colours, shapes, who sits in the boat)
     ---------------------------------------------------------------------------------
     boat         a pedal boat for two; opts.swan true | false (every fourth seed is a swan), opts.color,
                  opts.riders 0…2; userData.speed = how fast the paddle wheel turns
     ducks        a duck and opts.n ducklings in a row (3); she swims along +Z and tips over now and then
     reeds        opts.n stalks, opts.spread; +Z is the land side
     picnic       a blanket of 2.6 × 2.1 m with a basket and a watermelon
     kite         opts.h (how high above the hand), opts.back (how far behind, -Z), opts.shape 'diamond' | 'delta';
                  userData.fly = the kite itself (its position is inside the group)
     eucalyptus   opts.h; userData.crown = the radius of its leaves, userData.under = how high the lowest hang
     balloon      opts.h (height of its middle), opts.r; userData.top = the part in the sky, userData.rise (0…1) = how
                  far up its cable it is
     bridge       opts.span (along z), opts.w, opts.rise, opts.y (height of the ends); userData.deckY(z)
     ===================================================================================== */
  Y.make = function (kind, opts) {
    ready();
    const grp = new T.Group(), u = grp.userData, o = opts || {}, f = MAKERS[kind];
    const seed = o.seed === undefined ? 1 : Math.abs(o.seed | 0);
    u.kind = kind; u.r = 1; u.h = 1;
    grp.name = 'yarkon-' + kind;
    if (!f) { console.warn('rideScene.yarkon: unknown kind', kind); u.update = NOOP; return grp; }
    f(grp, u, o, K.rng(seed * 7919 + 211), seed);
    if (!u.update) u.update = NOOP;
    return grp;
  };
  Y.KINDS = Object.keys(MAKERS);

  /* =====================================================================================
     the place: DU.RIDE_PLACE.yarkon (the contract is written at the top of places.js)
     ===================================================================================== */
  const LIVE = new WeakMap(); // the api of a ride → what this ride put up
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const inPoly = (x, z, q) => { let c = false; for (let j = 0, k = q.length - 2; j < q.length; k = j, j += 2) if ((q[j + 1] > z) !== (q[k + 1] > z) && x < ((q[k] - q[j]) * (z - q[j + 1])) / (q[k + 1] - q[j + 1]) + q[j]) c = !c; return c; };
  /* the stretches of the way where things may lie: not in a sharp corner (she cannot see behind it) nor right after
     one, and not around a big crossing. → [[from, to], …], and .corners = the corners themselves (only stars go there) */
  function stretches(api) {
    const P = api.P, L = api.L, t = {}, corners = [], cr = api.data.cross || [];
    const ang = (s) => { P.at(s, t); return Math.atan2(t.tx, t.tz); };
    for (let s = 6; s < L - 6; s += 2) {
      let d = Math.abs(ang(s + 4) - ang(s - 4));
      if (d > PI) d = TAU - d;
      if (d <= 0.55) continue;
      const last = corners[corners.length - 1];
      if (last && s - 14 <= last[1]) last[1] = s + 9; else corners.push([s - 14, s + 9]);
    }
    const cut = corners.concat(cr.map((c) => [c.s0 - 38, c.s1 + 12])).sort((a, b) => a[0] - b[0]);
    const out = [];
    let s = 64;
    cut.forEach(([a, b]) => { if (a - s >= 26) out.push([s, a]); s = Math.max(s, b); });
    if (L - 50 - s >= 26) out.push([s, L - 50]);
    out.corners = corners.filter(([a, b]) => a > 40 && b < L - 50 && !cr.some((c) => b > c.s0 - 10 && a < c.s1 + 2));
    return out;
  }
  const shuffled = (list, rnd) => { const a = list.slice(); for (let k = a.length - 1; k > 0; k--) { const j = (rnd() * (k + 1)) | 0; [a[k], a[j]] = [a[j], a[k]]; } return a; };
  /* where the water of the river is beside the last metres of the way: bank(s) → [near, far], metres to her right
     (null when the data has no river there). Measured once, every 4 m, and read off in between. */
  function riverBanks(api, from, to) {
    const river = api.data.areas.find((a) => a.k === 'river');
    if (!river) return null;
    const P = api.P, t = {}, STEP = 4, n = Math.ceil((to - from) / STEP) + 1, near = [], far = [];
    for (let i = 0; i < n; i++) {
      P.at(from + i * STEP, t);
      let a = null, b = null;
      for (let lat = 4; lat < 150 && b === null; lat += 1) {
        const w = inPoly(t.x + t.nx * lat, t.z + t.nz * lat, river.p);
        if (w && a === null) a = lat; else if (!w && a !== null) b = lat;
      }
      near.push(a); far.push(b === null ? (a === null ? null : 150) : b);
    }
    if (near.some((v) => v === null)) return null;
    return function (s) {
      const k = clamp((s - from) / STEP, 0, n - 1.001), i = Math.floor(k), f = k - i;
      return [near[i] + (near[i + 1] - near[i]) * f, far[i] + (far[i + 1] - far[i]) * f];
    };
  }

  (DU.RIDE_PLACE = DU.RIDE_PLACE || {}).yarkon = {
    texts: { start: 'רוכבים לפארק הירקון!', arrive: 'הגעת לפארק הירקון!', row: 'הגעת לפארק הירקון', arch: 'איזה כיף בפארק!', archBack: 'כל הכבוד!' },
    /* a tree by the water */
    icon: '<svg class="du-ico" viewBox="0 0 48 48" aria-hidden="true"><g stroke="#4b3564" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M24 35V22" fill="none" stroke-width="3.6"/><circle cx="24" cy="15" r="11" fill="#7fcf88"/><path d="M3 37Q10 31 17 37T31 37T45 37V44H3Z" fill="#7fd0ee"/></g></svg>',
    /* arriving: two ducks say hello, then a few drops of water */
    sound(api) {
      [0, 0.17, 0.62, 0.79].forEach((at, i) => api.tone(i % 2 ? 470 : 560, { at, dur: 0.11, type: 'square', vol: 0.03, slide: i % 2 ? 330 : 400 }));
      [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => api.tone(f, { at: 0.22 + i * 0.12, dur: 0.3, type: 'sine', vol: 0.08 }));
    },

    /* the way to the park: quiet streets near home, then a long bike path north with four big crossings, and the
       last metres on the bank of the river. It is twice as long as the way to school, so it has long easy runs of
       stars for going fast, and the sharp corners stay empty. */
    level(api) {
      const kit = api.kit(), L = api.L, D = api.data, rnd = api.rnd, cr = D.cross || [];
      const dest = D.streets.length ? D.streets[D.streets.length - 1][0] : L - 150; // where the park begins
      const kindAt = (s) => (s < D.roadEnd ? 'street' : s >= dest - 6 ? 'park' : 'path');
      const lists = {
        street: ['line', 'zig', 'cones', 'jumpstars', 'puddle'].concat(shuffled(['bins', 'scooter', 'cat', 'barrier', 'ball', 'bigstar', 'heart', 'pigeons'], rnd)), // first what teaches her the tricks
        path: shuffled(['cyclist', 'jumpstars', 'scooter', 'gem', 'puddle', 'zig', 'cones', 'bigstar', 'pigeons', 'heart'], rnd),
        park: ['zig', 'heart', 'jumpstars', 'bigstar', 'line'],
      };
      const used = { street: 0, path: 0, park: 0 };
      kit.line(14, 5, 0); // a quiet start
      const free = stretches(api);
      free.forEach(([a, b]) => {
        const ci = cr.findIndex((c) => a >= c.s1 && a - c.s1 < 80); // the avenue this stretch is the first one after, if any
        let s = a, first = true;
        while (s + 26 <= b) {
          const k = kindAt(s + 12), list = lists[k];
          let name = list[used[k]++ % list.length], len = 26;
          if (first && ci >= 0 && ci % 2 === 0 && k === 'path' && b - s > 60) { name = 'walkers'; used[k]--; len = 34; } // people on foot after a crossing
          else if (k === 'path' && b - s > 150 && (first || rnd() < 0.2)) { // a long straight: stars down the middle, made for speed
            used[k]--; name = '';
            kit.line(s + 2, 14, 0, 3.4); kit.star(s + 52, 0, 0, 'gem'); len = 60;
          }
          if (name === 'cyclist' && s + 44 > b) name = 'line'; // a cyclist comes from far ahead: only on a long stretch
          if (name) kit.beat(name, s);
          first = false;
          s += len + rnd() * 5;
        }
      });
      free.corners.forEach(([a, b]) => kit.line(a + 6, Math.max(2, Math.floor((b - a - 9) / 3.5)), 0, 3.5)); // a thread of stars through each corner
      cr.forEach((c) => kit.line(c.s0 + 3, Math.max(3, Math.floor((c.s1 - c.s0 - 4) / 3.4) + 1), 0, 3.4)); // stars across each avenue
      kit.line(L - 44, 10, 0, 3.2); // and a runway of stars along the river
      return kit.items;
    },

    /* what waits there: the balloon arch, a wooden bridge over the river ahead, pedal boats and ducks on the water,
       reeds on the bank, picnics and children with kites on the lawn, eucalyptus trees, the balloon of the park
       across the river; her friends */
    scenery(api) {
      const T = api.T, L = api.L, root = new T.Group(), moving = [], sail = [];
      root.name = 'yarkon-welcome'; root.visible = false;
      const keep = (o) => { root.add(o); if (o.userData.update && o.userData.update !== NOOP) moving.push(o); return o; };
      /* yaw: 0 = its +Z looks the way she rides, PI = at her, PI / 2 = to her left (the lawn), -PI / 2 = at the river */
      const put = (kind, s, lat, opts, yaw, y) => { const o = Y.make(kind, opts); api.place(o, s, lat, y || 0, false, yaw || 0); return keep(o); };
      const bank = riverBanks(api, L - 96, L + 132);
      let bal = null;
      if (bank) {
        const [b0, b1] = bank(L + 36);
        put('bridge', L + 36, (b0 + b1) / 2, { seed: 1, span: b1 - b0 + 5 }, PI / 2);
        // boats go round and round on long loops: [middle of the loop, half its length, metres off the near bank, half its width, seed, turns per second]
        // (the swan turns its small rounds where the picture of her arrival looks: behind her on the river, to the side
        // of the post of the arch)
        [[L - 31, 6, 8, 2, 4, 0.12], [L + 9, 13, 20, 5, 1, -0.07], [L - 76, 14, 24, 4, 2, 0.058], [L + 62, 14, 13, 4.5, 3, -0.066]].forEach(([s0, A, off, B, seed, w]) => sail.push({ obj: put('boat', s0, bank(s0)[0] + off, { seed }), s0, A, off, B, w, ph: seed * 1.7 }));
        // ducks paddle up and down along the bank
        [[L - 22, 4, 2.4, 0.6, 1, 3, 0.11], [L + 5, 6, 5.5, 1, 2, 5, -0.08], [L - 64, 5, 6, 0.8, 3, 2, 0.085]].forEach(([s0, A, off, B, seed, n, w]) => sail.push({ obj: put('ducks', s0, bank(s0)[0] + off, { seed, n }), s0, A, off, B, w, ph: seed * 2.3 }));
        [L - 54, L - 30, L - 8, L + 13, L + 27].forEach((s, i) => put('reeds', s, bank(s)[0] - 0.2, { seed: i + 1 }, PI / 2));
        bal = put('balloon', L + 88, bank(L + 88)[1] + 12, { seed: 1, h: 27, r: 7 });
      }
      // the lawn: blankets, children who fly kites over the path, tall trees behind them
      put('picnic', L - 22, -9.6, { seed: 1 }, 2.4); put('picnic', L - 4, -13, { seed: 2 }, 0.7); put('picnic', L + 16, -10.5, { seed: 3 }, -2.0);
      [[L - 31, -14.5, 1, 9], [L + 6, -17.5, 2, 12], [L + 24, -15, 3, 8]].forEach(([s, lat, seed, h]) => {
        const kid = api.make('kid', { seed: 20 + seed });
        api.place(kid, s, lat, 0, false, -PI / 2 + (seed - 2) * 0.25); keep(kid); // she looks at the river, the string in her raised hand
        if (kid.userData.wave) kid.userData.wave(1e7);
        kid.updateMatrixWorld(true);
        const hand = kid.localToWorld(new T.Vector3(-0.36, 1.12, 0)), kite = keep(Y.make('kite', { seed, h }));
        kite.position.copy(hand); kite.rotation.y = kid.rotation.y + PI; // the kite flies out in front of her
      });
      [[L - 40, -20, 1], [L - 24, -27, 2], [L + 33, -21, 3], [L + 43, -13.5, 4], [L - 56, -12, 5]].forEach(([s, lat, seed]) => put('eucalyptus', s, lat, { seed }, seed));
      api.scene.add(root);
      LIVE.set(api, { root, moving, sail, bank, bal });
      api.std.arch(api);
      api.std.friends(api);
    },

    /* the welcome scene is far from most of the ride: it is shown, and moves, only when she is near.
       The boats and the ducks go round on their loops, and the balloon climbs its cable as she comes. */
    update(dt, api) {
      const me = LIVE.get(api);
      if (!me) return;
      const g = api.g, L = api.L, near = g.s > L - 430;
      if (me.root.visible !== near) me.root.visible = near;
      if (!near) return;
      const t = g.t, p = me.p || (me.p = {});
      for (let i = 0; i < me.sail.length; i++) {
        const b = me.sail[i], th = b.ph + t * b.w, s = b.s0 + Math.cos(th) * b.A, bk = me.bank(s);
        const lat = clamp(bk[0] + b.off + Math.sin(th) * b.B, bk[0] + 2, bk[1] - 2.5);
        api.P.at(s, p);
        const ds = -Math.sin(th) * b.A * b.w, dl = Math.cos(th) * b.B * b.w; // where it is heading: along the way and across it
        b.obj.position.set(p.x + p.nx * lat, 0, p.z + p.nz * lat);
        b.obj.rotation.y = Math.atan2(p.tx * ds + p.nx * dl, p.tz * ds + p.nz * dl);
      }
      if (me.bal) me.bal.userData.rise = clamp((g.s - (L - 330)) / 250, 0, 1);
      for (let i = 0; i < me.moving.length; i++) me.moving[i].userData.update(dt, t);
    },
  };
})();
