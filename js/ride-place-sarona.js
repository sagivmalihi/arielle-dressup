/* ride-place-sarona.js — what waits at the end of the ride to Sarona: the old Templer houses (cream stone, red tiled
   roofs, green wooden shutters), a lawn, the lily pond with its little bridge, bunting, a welcome arch.
   Needs THREE + ride-kit.js (both loaded only when a ride starts).

     const pond = DU.rideScene.sarona.make('pond', { w: 11, d: 6.5 });   // a THREE.Group
     scene.add(pond); … every frame: pond.userData.update(dt, t);

   Every group: origin on the ground at its centre, front = +Z, y up, metres (the same as ride-models.js).
   group.userData = { kind, r (the radius it takes on the ground), h (height), update(dt, t) }.
   What stands still in a piece is one merged vertex-coloured mesh (one draw call); only what moves is separate.
   The world already draws the real footprints of the houses, the ponds and the lawns (ride-world.js): these pieces
   are the close-up life on top. See the table further down for kinds and options.

   The end of the file is the place itself, DU.RIDE_PLACE.sarona (the contract: places.js): its texts, icon and
   arrival sound, a level made for this way, the welcome scene built from the pieces, and what moves in it. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const S = ((DU.rideScene = DU.rideScene || {}).sarona = {});
  const PI = Math.PI, TAU = PI * 2;
  let T, K, P, MAT = {};
  const NOOP = function () {};
  function ready() { if (K && T === window.THREE) return; T = window.THREE; K = DU.rideKit; P = K.PAL; MAT = {}; }

  /* ---------- colours of the place ---------- */
  const STONE = ['#f6ead0', '#f2e3c2', '#f9f0da'], STONE_D = '#e3d2ab', STONE_L = '#fff8e8';
  const TILE = ['#d9634a', '#cf5a42', '#e0705a'], TILE_D = '#b94d38';
  const SHUTTER = '#5fa56b', SHUTTER_D = '#3f8a52', WOOD = '#c9976b', WOOD_D = '#a97b52';
  const GLASS = '#8fc6e4', WHITE = '#ffffff', GRASS = '#a8e083', GRASS_D = '#97d674';
  const FLOWER = ['#ff8fc0', '#ffd54d', '#c79bff', '#ff9d4d', '#ffffff', '#ff6b8f'];
  const FLAGS = ['#ff8fc0', '#ffd54d', '#7de3e0', '#b99cff', '#ff9d4d', '#63c98a'];

  /* ---------- small helpers ---------- */
  const gb = (w, h, d, col, x, y, z, rx, ry, rz) => K.g(new T.BoxGeometry(w, h, d), col, x, y, z, rx || 0, ry || 0, rz || 0);
  const gc = (rt, rb, h, seg, col, x, y, z, rx, ry, rz) => K.g(new T.CylinderGeometry(rt, rb, h, seg), col, x, y, z, rx || 0, ry || 0, rz || 0);
  /* a faceted blob (leaves, flowers, stones) */
  const gi = (r, col, x, y, z, sx = 1, sy = 1, sz = 1, det = 0) => K.g(new T.IcosahedronGeometry(r, det), col, x, y, z, 0, 0, 0, sx, sy, sz, true);
  /* flat faces from corner points, counter-clockwise seen from outside: 3 points = a triangle, 4 = a quad */
  function face(col, ...p) {
    const v = p.length === 4 ? [p[0], p[1], p[2], p[0], p[2], p[3]] : p, geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute([].concat(...v), 3));
    geo.computeVertexNormals();
    return K.paint(geo, col);
  }
  /* a rod from p1 to p2 */
  function tube(p1, p2, r, col, seg) {
    const a = new T.Vector3(...p1), b = new T.Vector3(...p2), d = b.clone().sub(a), len = d.length();
    const e = new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()));
    return K.g(new T.CylinderGeometry(r, r, len, seg || 5), col, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2, e.x, e.y, e.z);
  }
  /* a flat shape lying on the ground at height y (the shape's y becomes -z) */
  const lying = (shape, col, y, x, z, ry) => { const geo = new T.ShapeGeometry(shape, 5); geo.rotateX(-PI / 2); return K.g(geo, col, x || 0, y, z || 0, 0, ry || 0, 0); };
  const oval = (rx, rz, n, k) => { const s = new T.Shape(); for (let i = 0; i < n; i++) { const a = (i / n) * TAU, w = 1 + (k || 0) * Math.cos(a * 2); s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rx * w, Math.sin(a) * rz * w); } s.closePath(); return s; };
  /* things painted on the ground must win over the layers of the world under them */
  const groundMat = () => MAT.ground || (MAT.ground = new T.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -8 }));
  const twoSided = () => MAT.two || (MAT.two = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
  const add = (grp, parts, mat) => { const m = new T.Mesh(K.merge(parts), mat || K.vmat()); grp.add(m); return m; };
  function shadow(grp, rx, rz, x, z, op) { const b = K.blob(1, op === undefined ? 0.2 : op); b.scale.set(rx, rz, 1); b.position.x = x || 0; b.position.z = z || 0; grp.add(b); return b; }

  /* ---------- parts shared by the pieces ---------- */
  /* a tiled roof whose ridge runs along x: gables (hip = 0) or four slopes; the eaves hang over by `ov`.
     Rows of tiles are hinted by bands in two reds. → parts */
  function roof(w, d, y, rh, hip, ov, col, wall) {
    const hw = w / 2 + ov, hd = d / 2 + ov, parts = [], N = 5, dark = new T.Color(col).multiplyScalar(0.9).getStyle();
    const E = [[-hw, y, hd], [hw, y, hd], [hw, y, -hd], [-hw, y, -hd]], R = [[-hw + hip, y + rh, 0], [hw - hip, y + rh, 0]];
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const slope = (a, b, rb, ra) => { for (let i = 0; i < N; i++) parts.push(face(i % 2 ? dark : col, mix(a, ra, i / N), mix(b, rb, i / N), mix(b, rb, (i + 1) / N), mix(a, ra, (i + 1) / N))); };
    slope(E[0], E[1], R[1], R[0]); slope(E[2], E[3], R[0], R[1]);
    if (hip) { parts.push(face(dark, E[1], E[2], R[1]), face(dark, E[3], E[0], R[0])); }
    else { // gables in the stone of the wall, a round window under the ridge, white boards along the edges
      parts.push(face(wall, E[1], E[2], R[1]), face(wall, E[3], E[0], R[0]));
      [-1, 1].forEach((sg) => {
        parts.push(gc(0.3, 0.3, 0.06, 10, WHITE, sg * (hw + 0.01), y + rh * 0.4, 0, 0, 0, PI / 2), gc(0.21, 0.21, 0.08, 10, GLASS, sg * (hw + 0.012), y + rh * 0.4, 0, 0, 0, PI / 2));
        [-1, 1].forEach((sd) => parts.push(tube([sg * (hw + 0.02), y, sd * hd], [sg * (hw + 0.02), y + rh, 0], 0.05, WHITE, 4)));
      });
    }
    parts.push(gb((hw - hip) * 2 + 0.16, 0.12, 0.26, TILE_D, 0, y + rh + 0.03, 0)); // the ridge
    parts.push(gb(hw * 2, 0.12, hd * 2, STONE_L, 0, y - 0.06, 0)); // the board under the eaves
    return parts;
  }
  /* a window in a wall that looks along +Z, turned by ry around x,z: frame, glass, a cross, a sill, a stone lintel,
     and two open shutters flat on the wall */
  function windowParts(x, y, z, ry, w, h, shutters) {
    const c = Math.cos(ry), s = Math.sin(ry), parts = [];
    const at = (lx, ly, lz, bw, bh, bd, col) => parts.push(gb(bw, bh, bd, col, x + lx * c + lz * s, y + ly, z - lx * s + lz * c, 0, ry, 0));
    at(0, 0, 0.03, w + 0.16, h + 0.16, 0.06, WHITE);
    at(0, 0, 0.05, w, h, 0.06, GLASS);
    at(0, 0, 0.085, 0.05, h, 0.02, WHITE); at(0, h * 0.14, 0.085, w, 0.05, 0.02, WHITE);
    at(0, -h / 2 - 0.12, 0.08, w + 0.36, 0.09, 0.2, STONE_D);
    at(0, h / 2 + 0.17, 0.04, w + 0.3, 0.16, 0.08, STONE_D);
    if (shutters !== false) [-1, 1].forEach((sg) => {
      const sx = sg * (w / 2 + 0.08 + w * 0.26);
      at(sx, 0, 0.035, w * 0.5, h + 0.1, 0.05, SHUTTER);
      for (let i = -2; i <= 2; i++) at(sx, i * h * 0.19, 0.065, w * 0.4, 0.035, 0.02, SHUTTER_D); // the slats
    });
    return parts;
  }

  const MAKERS = {};

  /* =====================================================================================
     a Templer house
     ===================================================================================== */
  MAKERS.house = function (grp, u, o, rnd, seed) {
    const variant = o.variant === undefined ? seed % 3 : o.variant; // 0 two floors with a porch · 1 low, hipped, a dormer · 2 long, with a wooden balcony
    const w = o.w || [8.4, 9.6, 11.4][variant], d = o.d || [7, 7.6, 6.6][variant], floors = o.floors || (variant === 1 ? 1 : 2);
    const FH = 3.1, H = floors * FH + 0.5, wall = STONE[seed % STONE.length], tile = TILE[(seed + variant) % TILE.length];
    const hip = variant === 1 ? Math.min(d / 2 + 0.2, w * 0.3) : 0, rh = variant === 1 ? 3.3 : Math.min(3.4, d * 0.42);
    const parts = [gb(w, H, d, wall, 0, H / 2, 0), gb(w + 0.24, 0.55, d + 0.24, STONE_D, 0, 0.275, 0)];
    for (let f = 1; f < floors; f++) parts.push(gb(w + 0.1, 0.12, d + 0.1, STONE_D, 0, 0.5 + f * FH - 0.3, 0)); // a band between the floors
    // corner stones on the two front corners
    [-1, 1].forEach((sg) => { for (let y = 0.75, i = 0; y < H - 0.3; y += 0.52, i++) { const l = i % 2 ? 0.5 : 0.3; parts.push(gb(l, 0.32, 0.05, STONE_D, sg * (w / 2 - l / 2 + 0.02), y, d / 2 + 0.02), gb(0.05, 0.32, i % 2 ? 0.3 : 0.5, STONE_D, sg * (w / 2 + 0.02), y, d / 2 - (i % 2 ? 0.15 : 0.25))); } });
    // windows: a row on every floor, all around; the door takes the middle of the front
    const nF = Math.max(3, Math.round(w / 2.9) | 1), nS = Math.max(2, Math.round(d / 3.2));
    for (let f = 0; f < floors; f++) {
      const y = 0.5 + f * FH + 1.65;
      for (let i = 0; i < nF; i++) {
        const x = ((i + 0.5) / nF - 0.5) * w;
        if (!(f === 0 && i === (nF - 1) / 2)) parts.push(...windowParts(x, y, d / 2, 0, 0.92, 1.46));
        parts.push(...windowParts(-x, y, -d / 2, PI, 0.92, 1.46, i % 2 === 0));
      }
      for (let i = 0; i < nS; i++) { const z = ((i + 0.5) / nS - 0.5) * d; parts.push(...windowParts(w / 2, y, -z, PI / 2, 0.92, 1.46), ...windowParts(-w / 2, y, z, -PI / 2, 0.92, 1.46)); }
    }
    // the door: green wood under a round fanlight, three stone steps
    const dz = d / 2;
    parts.push(gb(1.5, 2.35, 0.08, WHITE, 0, 0.5 + 1.17, dz + 0.03), gb(0.62, 2.1, 0.07, SHUTTER, -0.33, 0.5 + 1.08, dz + 0.07), gb(0.62, 2.1, 0.07, SHUTTER, 0.33, 0.5 + 1.08, dz + 0.07));
    parts.push(gb(0.5, 0.7, 0.03, SHUTTER_D, -0.33, 0.5 + 0.55, dz + 0.11), gb(0.5, 0.7, 0.03, SHUTTER_D, 0.33, 0.5 + 0.55, dz + 0.11), gb(0.5, 0.75, 0.03, SHUTTER_D, -0.33, 0.5 + 1.5, dz + 0.11), gb(0.5, 0.75, 0.03, SHUTTER_D, 0.33, 0.5 + 1.5, dz + 0.11));
    parts.push(K.g(new T.CylinderGeometry(0.75, 0.75, 0.08, 12, 1, false, 0, PI), WHITE, 0, 0.5 + 2.35, dz + 0.03, PI / 2, PI / 2, 0), K.g(new T.CylinderGeometry(0.6, 0.6, 0.1, 12, 1, false, 0, PI), GLASS, 0, 0.5 + 2.35, dz + 0.035, PI / 2, PI / 2, 0));
    parts.push(gi(0.06, P.yellow, 0.1, 0.5 + 1.05, dz + 0.14, 1, 1, 1, 1));
    for (let i = 0; i < 3; i++) parts.push(gb(2.3 + i * 0.5, 0.17, 0.42 + i * 0.36, STONE_D, 0, 0.5 - 0.085 - i * 0.17, dz + 0.21 + i * 0.18));
    // the roof and a chimney
    parts.push(...roof(w, d, H, rh, hip, 0.55, tile, wall));
    const cx = (w / 2 - hip) * 0.5;
    parts.push(gb(0.62, 1.5, 0.62, wall, cx, H + rh * 0.72 + 0.4, -d * 0.16), gb(0.78, 0.14, 0.78, TILE_D, cx, H + rh * 0.72 + 1.2, -d * 0.16));
    if (variant === 0) { // a little porch on two wooden posts, with its own tiled gable
      [-1, 1].forEach((sg) => parts.push(gb(0.14, 2.45, 0.14, WHITE, sg * 1.25, 0.5 + 1.22, dz + 1.45)));
      const pr = roof(1.7, 2.9, 0.5 + 2.5, 0.7, 0, 0.12, tile, STONE_L).map((g) => { g.rotateY(PI / 2); g.translate(0, 0, dz + 0.85); return g; }); // its ridge points at the street
      parts.push(...pr);
    }
    if (variant === 1) { // a dormer in the front slope
      const y0 = H + rh * 0.22, z0 = d / 2 - 1.0;
      parts.push(gb(1.5, 1.25, 1.5, wall, 0, y0 + 0.6, z0), ...windowParts(0, y0 + 0.62, z0 + 0.75, 0, 0.8, 0.86));
      parts.push(...roof(1.5, 1.5, y0 + 1.22, 0.6, 0, 0.14, tile, wall).map((g) => { g.rotateY(PI / 2); g.translate(0, 0, z0); return g; }));
    }
    if (variant === 2 && floors > 1) { // a wooden balcony over the door, with flower boxes
      const by = 0.5 + FH - 0.05, bw = 3.4, bd = 1.3;
      parts.push(gb(bw, 0.12, bd, WOOD, 0, by, dz + bd / 2), gb(0.14, by - 0.5, 0.14, WOOD_D, -bw / 2 + 0.1, 0.5 + (by - 0.5) / 2, dz + bd - 0.1), gb(0.14, by - 0.5, 0.14, WOOD_D, bw / 2 - 0.1, 0.5 + (by - 0.5) / 2, dz + bd - 0.1));
      for (let i = 0; i <= 12; i++) parts.push(gb(0.06, 0.85, 0.06, SHUTTER, -bw / 2 + 0.06 + (i * (bw - 0.12)) / 12, by + 0.48, dz + bd - 0.05));
      parts.push(gb(bw, 0.07, 0.09, SHUTTER_D, 0, by + 0.93, dz + bd - 0.05));
      [-1, 1].forEach((sg) => { parts.push(gb(0.06, 0.85, 0.06, SHUTTER, sg * (bw / 2 - 0.05), by + 0.48, dz + bd / 2), gb(0.09, 0.07, bd, SHUTTER_D, sg * (bw / 2 - 0.05), by + 0.93, dz + bd / 2)); });
      for (let i = -3; i <= 3; i++) parts.push(gi(0.2, i % 2 ? '#6fc46a' : FLOWER[(i + 9 + seed) % FLOWER.length], i * 0.45, by + 1.0, dz + bd + 0.02, 1, 0.8, 1));
    }
    // flower boxes under the ground-floor windows of the front, and a bougainvillea up one corner
    for (let i = 0; i < nF; i++) {
      if (i === (nF - 1) / 2) continue;
      const x = ((i + 0.5) / nF - 0.5) * w;
      parts.push(gb(1.2, 0.2, 0.26, WOOD_D, x, 0.5 + 0.72, dz + 0.24));
      for (let k = -1; k <= 1; k++) parts.push(gi(0.17, k ? FLOWER[(i + k + 6 + seed) % FLOWER.length] : '#6fc46a', x + k * 0.36, 0.5 + 0.93, dz + 0.26, 1, 0.85, 1));
    }
    const bs = seed % 2 ? 1 : -1;
    for (let i = 0; i < 9; i++) parts.push(gi(0.42 + rnd() * 0.25, i % 3 ? (seed % 2 ? '#f062a8' : '#c56be0') : '#5cb86b', bs * (w / 2 + 0.05 - rnd() * 0.5), 0.5 + i * (H - 1) / 9 + rnd() * 0.3, d / 2 + 0.1 - rnd() * 0.5, 1, 0.9, 0.8));
    add(grp, parts);
    shadow(grp, w * 0.62, d * 0.75, 0.6, -0.4, 0.2);
    u.r = Math.hypot(w, d) / 2 + 0.8; u.h = H + rh + 1.3; u.w = w; u.d = d;
  };

  /* =====================================================================================
     the lawn: mown stripes, flowers along the long sides, deck chairs under a parasol
     ===================================================================================== */
  MAKERS.lawn = function (grp, u, o, rnd, seed) {
    const w = o.w || 16, d = o.d || 10, flat = [], parts = [];
    const rr = (x0, z0, x1, z1, r) => { const s = new T.Shape(); s.moveTo(x0 + r, z0); s.lineTo(x1 - r, z0); s.quadraticCurveTo(x1, z0, x1, z0 + r); s.lineTo(x1, z1 - r); s.quadraticCurveTo(x1, z1, x1 - r, z1); s.lineTo(x0 + r, z1); s.quadraticCurveTo(x0, z1, x0, z1 - r); s.lineTo(x0, z0 + r); s.quadraticCurveTo(x0, z0, x0 + r, z0); return s; };
    flat.push(lying(rr(-w / 2 - 0.3, -d / 2 - 0.3, w / 2 + 0.3, d / 2 + 0.3, 1.6), STONE_D, 0.05), lying(rr(-w / 2, -d / 2, w / 2, d / 2, 1.4), GRASS, 0.07));
    const n = Math.round(w / 1.6);
    for (let i = 1; i < n; i += 2) { const x0 = -w / 2 + (i * w) / n, x1 = x0 + w / n; flat.push(lying(rr(x0, -d / 2 + 0.5, x1, d / 2 - 0.5, 0.3), GRASS_D, 0.085)); }
    add(grp, flat, groundMat());
    // flowers along the two long sides
    [-1, 1].forEach((sg) => { for (let x = -w / 2 + 1.4, i = 0; x < w / 2 - 1.2; x += 0.62, i++) parts.push(gi(0.2 + rnd() * 0.1, i % 3 === 1 ? '#6fc46a' : FLOWER[(i + (sg > 0 ? 2 : 0) + seed) % FLOWER.length], x, 0.2, sg * (d / 2 - 0.35 - rnd() * 0.2), 1, 0.8, 1)); });
    // deck chairs with striped cloth, a round table, a parasol
    const chair = (x, z, ry, col) => {
      const at = (g) => { g.rotateY(ry); g.translate(x, 0, z); return g; };
      parts.push(at(gb(0.62, 0.05, 1.05, col, 0, 0.42, 0.1, -0.5, 0, 0)), at(gb(0.62, 0.05, 0.75, col, 0, 0.3, 0.75, 0.25, 0, 0)));
      for (let i = -1; i <= 1; i += 2) parts.push(at(gb(0.2, 0.052, 1.05, WHITE, i * 0.16, 0.423, 0.1, -0.5, 0, 0)), at(gb(0.05, 0.05, 1.5, WOOD, i * 0.33, 0.33, 0.3, -0.38, 0, 0)), at(gb(0.05, 0.05, 1.2, WOOD, i * 0.33, 0.3, 0.45, 0.55, 0, 0)));
    };
    const px = o.px === undefined ? w * 0.2 : o.px, pz = o.pz === undefined ? -d * 0.08 : o.pz;
    chair(px - 1.25, pz + 0.2, 0.5, P.pink); chair(px + 1.25, pz + 0.1, -0.45, P.teal); chair(px + 0.1, pz - 1.5, 0.05, P.yellow);
    parts.push(gc(0.42, 0.42, 0.05, 10, WHITE, px, 0.56, pz + 0.9), gc(0.04, 0.05, 0.56, 5, '#9aa7b2', px, 0.28, pz + 0.9));
    parts.push(gc(0.1, 0.1, 0.16, 8, P.orange, px + 0.12, 0.66, pz + 0.85), gc(0.1, 0.1, 0.16, 8, P.pink, px - 0.14, 0.66, pz + 1.0));
    parts.push(gc(0.035, 0.035, 2.5, 5, '#f7f3e6', px, 1.25, pz - 0.2));
    for (let i = 0; i < 8; i++) parts.push(K.g(new T.ConeGeometry(1.55, 0.6, 8, 1, true, (i / 8) * TAU, TAU / 8), i % 2 ? WHITE : P.red, px, 2.55, pz - 0.2, 0, 0, 0, 1, 1, 1, true));
    parts.push(gi(0.09, P.yellow, px, 2.9, pz - 0.2, 1, 1, 1, 1));
    // a ball someone left
    parts.push(gi(0.2, P.blue, -w * 0.25, 0.27, d * 0.18, 1, 1, 1, 1), gi(0.205, WHITE, -w * 0.25, 0.27, d * 0.18, 1, 0.35, 1, 1));
    add(grp, parts, twoSided());
    shadow(grp, 1.7, 1.7, px, pz - 0.2, 0.2);
    u.r = Math.hypot(w, d) / 2; u.h = 3;
  };

  /* =====================================================================================
     a small arched wooden bridge. It spans along z; walk on it from z = -span/2 to span/2.
     ===================================================================================== */
  function bridgeParts(span, w, rise) {
    const parts = [], N = 12, yAt = (k) => 0.12 + rise * (1 - (2 * k - 1) * (2 * k - 1));
    for (let i = 0; i < N; i++) {
      const k0 = i / N, k1 = (i + 1) / N, z0 = (k0 - 0.5) * span, z1 = (k1 - 0.5) * span, y0 = yAt(k0), y1 = yAt(k1), a = Math.atan2(y1 - y0, z1 - z0), L = Math.hypot(z1 - z0, y1 - y0);
      parts.push(gb(w, 0.07, L * 0.92, i % 2 ? WOOD : WOOD_D, 0, (y0 + y1) / 2, (z0 + z1) / 2, -a, 0, 0));
      [-1, 1].forEach((sg) => parts.push(gb(0.1, 0.2, L * 1.02, WOOD_D, sg * (w / 2 - 0.02), (y0 + y1) / 2 - 0.12, (z0 + z1) / 2, -a, 0, 0)));
    }
    const posts = 5;
    [-1, 1].forEach((sg) => {
      let prev = null;
      for (let i = 0; i < posts; i++) {
        const k = i / (posts - 1), z = (k - 0.5) * (span - 0.3), y = yAt(0.5 + (z / span)), x = sg * (w / 2 - 0.02);
        parts.push(gb(0.1, 0.95, 0.1, WOOD, x, y + 0.45, z), gi(0.085, STONE_L, x, y + 0.97, z, 1, 1, 1, 1));
        if (prev) parts.push(tube([x, prev[0] + 0.82, prev[1]], [x, y + 0.82, z], 0.04, WOOD_D, 5), tube([x, prev[0] + 0.45, prev[1]], [x, y + 0.45, z], 0.028, WOOD, 4));
        prev = [y, z];
      }
    });
    return parts;
  }
  MAKERS.bridge = function (grp, u, o) {
    const span = o.span || 4.6, w = o.w || 1.5, rise = o.rise === undefined ? 0.5 : o.rise;
    add(grp, bridgeParts(span, w, rise));
    shadow(grp, w * 0.7, span * 0.55, 0, 0, 0.16);
    u.r = span / 2; u.h = rise + 1.1; u.span = span; u.w = w;
  };

  /* =====================================================================================
     the lily pond: a rim of pale stones, lily pads and flowers, reeds, goldfish, a frog; the bridge across its waist
     ===================================================================================== */
  MAKERS.pond = function (grp, u, o, rnd, seed) {
    const w = o.w || 11, d = o.d || 6.5, rx = w / 2, rz = d / 2, WAIST = -0.16; // the pond narrows in the middle, where the bridge is
    const edge = (a) => 1 + WAIST * Math.cos(a * 2 + PI);
    const flat = [lying(oval(rx + 0.45, rz + 0.45, 30, WAIST * -1), '#efe6d2', 0.06), lying(oval(rx, rz, 30, WAIST * -1), P.water, 0.085), lying(oval(rx * 0.62, rz * 0.5, 20, WAIST * -1), P.waterDeep, 0.1)];
    add(grp, flat, groundMat());
    const parts = [];
    for (let i = 0, n = 26; i < n; i++) { // the stones of the rim
      const a = (i / n) * TAU + rnd() * 0.08, k = edge(a) + 0.03, s = 0.3 + rnd() * 0.16;
      parts.push(gi(s, i % 3 ? '#f4efe2' : '#e6dcc8', Math.cos(a) * (rx + 0.12) * k, 0.1, Math.sin(a) * (rz + 0.12) * k, 1.2, 0.45, 1));
    }
    // lily pads (a round leaf with a notch) and the lilies on some of them
    const pad = (x, z, r, flower) => {
      const geo = new T.CircleGeometry(r, 9, rnd() * TAU, TAU * 0.9); geo.rotateX(-PI / 2);
      parts.push(K.g(geo, rnd() < 0.5 ? '#5bb86b' : '#7ccb6a', x, 0.125, z));
      if (!flower) return;
      const col = flower === 1 ? '#ff8fc0' : WHITE;
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + ring * 0.5, tilt = ring ? 0.45 : 1.0, rr = r * (ring ? 0.2 : 0.38); parts.push(K.g(new T.ConeGeometry(r * 0.17, r * 0.62, 4), ring ? col : new T.Color(col).lerp(new T.Color('#ffd0e4'), 0.4).getStyle(), x + Math.cos(a) * rr, 0.2 + ring * 0.05, z + Math.sin(a) * rr, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt)); }
      parts.push(gi(r * 0.13, P.yellow, x, 0.25, z, 1, 1, 1, 1));
    };
    const spots = [];
    for (let t = 0; t < 400 && spots.length < (o.pads || 15); t++) {
      const a = rnd() * TAU, k = Math.sqrt(0.08 + rnd() * 0.7), x = Math.cos(a) * rx * k * edge(a), z = Math.sin(a) * rz * k * edge(a), r = 0.28 + rnd() * 0.2;
      if (o.bridge !== false && Math.abs(x) < 1.35) continue; // not under the bridge
      if (spots.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2] + r + 0.08)) continue;
      spots.push([x, z, r]); pad(x, z, r, spots.length % 3 === 0 ? 1 : spots.length % 5 === 0 ? 2 : 0);
    }
    // reeds with brown heads at two places of the bank
    [[-0.75, -0.72], [0.8, 0.66], [-0.86, 0.5]].forEach(([ax, az], j) => { for (let i = 0; i < 7; i++) { const x = ax * rx + (rnd() - 0.5) * 0.9, z = az * rz + (rnd() - 0.5) * 0.7, h = 0.9 + rnd() * 0.8, lean = (rnd() - 0.5) * 0.25; parts.push(K.g(new T.ConeGeometry(0.035, h, 4), j % 2 ? '#6fbf63' : '#58a85e', x, h / 2 + 0.08, z, lean, 0, lean)); if (i % 2) parts.push(gc(0.045, 0.045, 0.24, 5, '#8a5a3a', x + lean * 0.2, h + 0.02, z - lean * 0.2, lean, 0, lean)); } });
    if (o.bridge !== false) { // across the waist, with a stone step at each end
      const span = d * (1 + WAIST) + 1.5;
      parts.push(...bridgeParts(span, 1.5, 0.52), gb(1.9, 0.12, 0.7, STONE_D, 0, 0.06, span / 2 + 0.2), gb(1.9, 0.12, 0.7, STONE_D, 0, 0.06, -span / 2 - 0.2));
      u.bridge = { span, w: 1.5 };
    }
    add(grp, parts, twoSided());
    // what moves: two goldfish that go round, a frog that hops on its leaf now and then
    const fishGeo = K.merge([gi(0.16, '#ff9d4d', 0, 0, 0, 0.55, 0.4, 1.3, 1), K.g(new T.ConeGeometry(0.11, 0.2, 4), '#ffb46b', 0, 0, -0.26, PI / 2, 0, 0, 1, 0.3, 1)]);
    const fish = [0, 1].map((i) => { const m = new T.Mesh(fishGeo, K.vmat()); grp.add(m); return { m, ph: i * 2.6, sp: 0.42 + i * 0.13, k: i ? -1 : 1, cx: (i ? -1 : 1) * rx * 0.44, r: Math.min(rx * 0.3, rz * 0.5) }; });
    const fp = spots.find((q) => q[2] > 0.36) || spots[0] || [rx * 0.4, 0, 0.4];
    const frog = new T.Mesh(K.merge([gi(0.13, '#63c98a', 0, 0.09, 0, 1.1, 0.75, 1.25, 1), gi(0.045, WHITE, -0.06, 0.18, 0.1, 1, 1, 1, 1), gi(0.045, WHITE, 0.06, 0.18, 0.1, 1, 1, 1, 1), gi(0.022, P.dark, -0.06, 0.185, 0.135, 1, 1, 1, 1), gi(0.022, P.dark, 0.06, 0.185, 0.135, 1, 1, 1, 1)]), K.vmat());
    frog.position.set(fp[0], 0.13, fp[1]); frog.rotation.y = seed; grp.add(frog);
    u.r = Math.max(rx, rz) + 0.8; u.h = 1.6; u.rx = rx; u.rz = rz;
    u.update = function (dt, t) {
      for (const f of fish) { const a = t * f.sp * f.k + f.ph; f.m.position.set(f.cx + Math.cos(a) * f.r, 0.115, Math.sin(a) * f.r * 0.8); f.m.rotation.y = -a + (f.k > 0 ? 0 : PI) + Math.sin(t * 6 + f.ph) * 0.25; }
      const hop = (t * 0.35 + seed * 0.37) % 1; // one hop in every three seconds or so
      frog.position.y = 0.13 + (hop < 0.12 ? Math.sin((hop / 0.12) * PI) * 0.22 : 0);
    };
  };

  /* =====================================================================================
     bunting: a string of little flags between two poles (or between two houses: poles: false)
     ===================================================================================== */
  MAKERS.bunting = function (grp, u, o, rnd, seed) {
    const len = o.len || 9, h = o.h || 3.7, sag = o.sag === undefined ? 0.55 : o.sag, n = Math.max(5, Math.round(len / 0.46));
    const parts = [], yAt = (k) => h - sag * Math.sin(k * PI);
    if (o.poles !== false) [-1, 1].forEach((sg) => parts.push(gc(0.045, 0.06, h, 6, WHITE, sg * len / 2, h / 2, 0), gi(0.11, P.yellow, sg * len / 2, h + 0.08, 0, 1, 1, 1, 1), gc(0.16, 0.2, 0.14, 8, STONE_D, sg * len / 2, 0.07, 0)));
    for (let i = 0; i < n; i++) parts.push(tube([(i / n - 0.5) * len, yAt(i / n), 0], [((i + 1) / n - 0.5) * len, yAt((i + 1) / n), 0], 0.012, WHITE, 3));
    if (parts.length) add(grp, parts);
    // the flags are one small mesh; their tips swing in the wind
    const pos = new Float32Array(n * 9), col = new Float32Array(n * 9), c = new T.Color(), tips = [];
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, x = (k - 0.5) * len, y = yAt(k) - 0.01, hw = (len / n) * 0.42;
      pos.set([x - hw, y, 0, x + hw, y, 0, x, y - 0.44, 0], i * 9);
      c.set(FLAGS[(i + seed) % FLAGS.length]);
      for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], i * 9 + v * 3);
      tips.push(x);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const flags = new T.Mesh(geo, twoSided());
    grp.add(flags);
    u.r = len / 2; u.h = h + 0.2; u.len = len;
    u.update = function (dt, t) {
      for (let i = 0; i < n; i++) { const a = t * 4.2 + i * 0.9 + seed; pos[i * 9 + 6] = tips[i] + Math.sin(a * 0.7) * 0.04; pos[i * 9 + 8] = Math.sin(a) * 0.13; }
      geo.attributes.position.needsUpdate = true;
    };
  };

  /* =====================================================================================
     the welcome arch: two stone gate posts with tiled caps, an arch grown over with leaves and bougainvillea,
     a name board under it. The words read from the +Z side (opts.backText for the far side), like the balloon arch.
     ===================================================================================== */
  MAKERS.arch = function (grp, u, o, rnd, seed) {
    const W = Math.max(8, o.width || 8.6), H = o.height || 4.7, A = W / 2 + 0.5, PH = 3.0, parts = [];
    [-1, 1].forEach((sg) => {
      parts.push(gb(0.95, 0.4, 0.95, STONE_D, sg * A, 0.2, 0), gb(0.74, PH, 0.74, STONE[0], sg * A, PH / 2, 0), gb(0.92, 0.14, 0.92, STONE_D, sg * A, PH + 0.07, 0));
      parts.push(K.g(new T.ConeGeometry(0.72, 0.6, 4), TILE[0], sg * A, PH + 0.44, 0, 0, PI / 4, 0, 1, 1, 1, true), gi(0.11, P.yellow, sg * A, PH + 0.8, 0, 1, 1, 1, 1));
      for (let y = 0.55, i = 0; y < PH - 0.2; y += 0.5, i++) parts.push(gb(i % 2 ? 0.78 : 0.4, 0.04, 0.78, STONE_D, sg * A, y, 0));
      // a lantern on the inner side
      parts.push(gb(0.32, 0.05, 0.05, P.dark, sg * (A - 0.5), 2.45, 0), gb(0.2, 0.3, 0.2, '#fff3c4', sg * (A - 0.66), 2.26, 0), K.g(new T.ConeGeometry(0.19, 0.14, 4), P.dark, sg * (A - 0.66), 2.48, 0, 0, PI / 4, 0));
      // flowers at the foot
      for (let i = 0; i < 5; i++) parts.push(gi(0.2 + rnd() * 0.1, i % 2 ? '#6fc46a' : FLOWER[(i + seed) % FLOWER.length], sg * (A + (rnd() - 0.5) * 1.2), 0.2, 0.55 + rnd() * 0.3, 1, 0.8, 1), gi(0.2, i % 2 ? FLOWER[(i + 2 + seed) % FLOWER.length] : '#6fc46a', sg * (A + (rnd() - 0.5) * 1.2), 0.2, -0.55 - rnd() * 0.3, 1, 0.8, 1));
    });
    // the arch: an iron hoop from cap to cap, thick with leaves; every third tuft is in flower
    const N = 22, pt = (k) => { const a = k * PI; return [-Math.cos(a) * A, PH + 0.1 + Math.sin(a) * (H + 0.45 - PH), 0]; };
    for (let i = 0; i < N; i++) parts.push(tube(pt(i / N), pt((i + 1) / N), 0.05, '#6b8a72', 5));
    const leaves = [[], []];
    for (let i = 0; i <= N * 2; i++) {
      const p = pt(i / (N * 2)), r = 0.3 + rnd() * 0.14, fl = i % 3 === 1;
      leaves[i % 2].push(gi(r, fl ? (i % 2 ? '#f062a8' : '#c56be0') : K.PAL.leaf[i % K.PAL.leaf.length], p[0] + (rnd() - 0.5) * 0.2, p[1] + (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.36, 1, 0.85, 1));
    }
    add(grp, parts);
    const tufts = leaves.map((l) => add(grp, l));
    // the board: two plates back to back, so the words read properly from both sides
    const text = o.text === undefined ? 'ברוכים הבאים לשרונה' : o.text;
    let board = null;
    if (text) {
      const plate = (txt, back) => { const b = K.sign(txt, { h: 0.95, bg: '#fff8e8', fg: '#3f8a52', border: '#d9634a', pad: 0.55 }); const maxW = A * 1.3; if (b.userData.w > maxW) b.scale.setScalar(maxW / b.userData.w); if (back) b.rotation.y = PI; return b; };
      board = new T.Group();
      board.add(plate(text, false), plate(o.backText || text, true));
      board.children[0].position.z = 0.012; board.children[1].position.z = -0.012;
      board.position.set(0, H - 0.9, 0);
      grp.add(board);
      const top = pt(0.5)[1];
      add(grp, [tube([-1.2, top - 0.2, 0], [-1.2, H - 0.45, 0], 0.012, WHITE, 3), tube([1.2, top - 0.2, 0], [1.2, H - 0.45, 0], 0.012, WHITE, 3)]);
    }
    shadow(grp, 0.8, 0.8, -A, 0, 0.22); shadow(grp, 0.8, 0.8, A, 0, 0.22);
    u.r = W / 2; u.h = H + 1; u.inner = W; u.clear = H - 1.5;
    u.update = function (dt, t) {
      tufts.forEach((m, i) => { const p = t * 1.4 + i * 2.3; m.position.y = Math.sin(p) * 0.03; m.rotation.z = Math.sin(p * 0.7) * 0.004; });
      if (board) board.rotation.x = Math.sin(t * 1.3) * 0.05;
    };
  };

  /* =====================================================================================
     make(kind, opts) → THREE.Group      opts.seed picks the variant (the stone, the tiles, the colours)
     ---------------------------------------------------------------------------------
     house      opts.variant 0 two floors and a porch · 1 low with a hipped roof and a dormer · 2 long with a wooden
                balcony; opts.w, opts.d, opts.floors. The door looks along +Z. userData.w / .d = the footprint
     lawn       opts.w, opts.d; opts.px, opts.pz = where the deck chairs stand
     pond       opts.w, opts.d, opts.pads (how many leaves), opts.bridge: false for none; userData.rx / .rz, .bridge
     bridge     opts.span (along z), opts.w, opts.rise
     bunting    opts.len (along x), opts.h, opts.sag, opts.poles: false to hang it between two walls
     arch       opts.text, opts.backText, opts.width (inner, ≥ 8), opts.height; userData.inner, .clear
     ===================================================================================== */
  S.make = function (kind, opts) {
    ready();
    const grp = new T.Group(), u = grp.userData, o = opts || {}, f = MAKERS[kind];
    const seed = o.seed === undefined ? 1 : Math.abs(o.seed | 0);
    u.kind = kind; u.r = 1; u.h = 1;
    grp.name = 'sarona-' + kind;
    if (!f) { console.warn('rideScene.sarona: unknown kind', kind); u.update = NOOP; return grp; }
    f(grp, u, o, K.rng(seed * 7919 + 131), seed);
    if (!u.update) u.update = NOOP;
    return grp;
  };
  S.KINDS = Object.keys(MAKERS);

  /* =====================================================================================
     the place: DU.RIDE_PLACE.sarona (the contract is written at the top of places.js)
     ===================================================================================== */
  const LIVE = new WeakMap(); // the api of a ride → what this ride put up
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

  (DU.RIDE_PLACE = DU.RIDE_PLACE || {}).sarona = {
    texts: { start: 'רוכבים לשרונה!', arrive: 'הגעת לשרונה!', row: 'הגעת לשרונה', arch: 'ברוכים הבאים לשרונה', archBack: 'כל הכבוד!' },
    /* a Templer house: cream wall, red roof, a green door */
    icon: '<svg class="du-ico" viewBox="0 0 48 48" aria-hidden="true"><g stroke="#4b3564" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M9 43V23H39V43Z" fill="#fff3dc"/><path d="M4 24L24 7L44 24Z" fill="#ee6f57"/><path d="M20 43V32H28V43" fill="#5fa56b"/><rect x="12.500" y="28" width="5" height="6" rx="1" fill="#9fd0ea" stroke-width="2"/><rect x="30.500" y="28" width="5" height="6" rx="1" fill="#9fd0ea" stroke-width="2"/><circle cx="24" cy="17.500" r="2.400" fill="#fff" stroke-width="2"/></g></svg>',
    /* arriving: a little music box */
    sound(api) {
      [1319, 1568, 2093, 1760, 1568, 2093, 2637].forEach((f, i) => api.tone(f, { at: i * 0.14, dur: 0.34, type: 'sine', vol: 0.085 }));
      [523, 659].forEach((f, i) => api.tone(f, { at: i * 0.56, dur: 0.6, type: 'triangle', vol: 0.045 }));
    },

    /* the way to Sarona: quiet streets with parked cars, the path through the Dubnov garden, bike paths with two
       big crossings, and the car-free street between the old houses. Each kind of stretch has its own things,
       and the sharp corners stay empty. */
    level(api) {
      const kit = api.kit(), L = api.L, D = api.data, rnd = api.rnd, cr = D.cross || [];
      const gardens = D.areas.filter((a) => a.k === 'park'), t = {};
      const dest = D.streets.length ? D.streets[D.streets.length - 1][0] : L - 120; // where the garden of Sarona begins
      const kindAt = (s) => { if (s < D.roadEnd) return 'street'; if (s >= dest - 6) return 'home'; api.P.at(s, t); return gardens.some((a) => inPoly(t.x, t.z, a.p)) ? 'garden' : 'path'; };
      const lists = {
        street: ['line', 'zig', 'cones', 'jumpstars', 'puddle'].concat(shuffled(['bins', 'scooter', 'cat', 'barrier', 'ball', 'bigstar', 'heart', 'cones', 'gem'], rnd)), // first what teaches her the tricks
        garden: shuffled(['pigeons', 'ball', 'cat', 'bigstar', 'zig'], rnd),
        path: shuffled(['cyclist', 'jumpstars', 'scooter', 'gem', 'puddle', 'zig', 'cones', 'bigstar'], rnd),
        home: ['zig', 'heart', 'jumpstars', 'line'],
      };
      const used = { street: 0, garden: 0, path: 0, home: 0 };
      kit.line(14, 5, 0); kit.line(36, 4, kit.lane()); // a quiet start
      const free = stretches(api);
      free.forEach(([a, b]) => {
        const afterCross = cr.some((c) => a >= c.s1 && a - c.s1 < 80); // the first free stretch after an avenue
        let s = a, first = true;
        while (s + 26 <= b) {
          const k = kindAt(s + 12), list = lists[k];
          let name = list[used[k]++ % list.length];
          if (first && afterCross && k === 'path' && b - s > 60) { name = 'walkers'; used[k]--; } // people on foot after a crossing
          if (name === 'cyclist' && s + 44 > b) name = 'line'; // a cyclist comes from far ahead: only on a long stretch
          kit.beat(name, s); first = false;
          s += (name === 'walkers' ? 34 : 26) + rnd() * 5;
        }
      });
      free.corners.forEach(([a, b]) => kit.line(a + 6, Math.max(2, Math.floor((b - a - 9) / 3.5)), 0, 3.5)); // a thread of stars through each corner
      cr.forEach((c) => kit.line(c.s0 + 3, Math.max(3, Math.floor((c.s1 - c.s0 - 4) / 3.4) + 1), 0, 3.4)); // stars across each avenue
      kit.line(L - 44, 10, 0, 3.2); // and a runway of stars under the bunting
      return kit.items;
    },

    /* what waits there: bunting over the last metres, the welcome arch, a Templer house at the end of the way,
       the lily pond and the lawn beside it, a cat on the path, butterflies; her friends */
    scenery(api) {
      const T = api.T, L = api.L, root = new T.Group(), moving = [];
      root.name = 'sarona-welcome'; root.visible = false;
      const keep = (o) => { root.add(o); if (o.userData.update && o.userData.update !== NOOP) moving.push(o); return o; };
      const put = (kind, s, lat, opts, turn) => { const o = S.make(kind, opts); api.place(o, s, lat, 0, true, turn || 0); return keep(o); }; // its +Z looks at her as she comes
      put('arch', L - 9, 0, { seed: 1, text: api.texts.arch, backText: api.texts.archBack });
      put('bunting', L - 27, 0, { seed: 2, len: 11.2, h: 4.8 });
      put('bunting', L - 41, 0, { seed: 3, len: 11.2, h: 4.8 });
      put('house', L + 34, -3, { seed: 2, variant: 0 });
      put('pond', L + 9, -15, { seed: 2 });
      put('lawn', L + 20.5, -15, { seed: 1, w: 12, d: 9 });
      put('bunting', L + 15, -15, { seed: 5, len: 8, h: 3.3 }, PI / 2);
      // things from the common shelf: balloons on the first poles, a cat that sits and watches, butterflies over the flowers
      [-1, 1].forEach((sg, i) => { const b = api.make('balloons', { seed: 3 + i, n: 4 }); api.place(b, L - 41, sg * 5.6, 4.85, true); keep(b); });
      const cat = api.make('cat', { seed: 1, mode: 'sit' }); api.place(cat, L - 5.2, -4.5, 0, true, 0.5); keep(cat);
      [[L - 9, -5.4, 0.7], [L - 9, 5.4, 0.8], [L + 5, -10.5, 1.0], [L + 16, -9.6, 0.9]].forEach(([s, lat, y], i) => { const b = api.make('butterfly', { seed: i + 1, y, radius: 0.9 }); api.place(b, s, lat, 0, true); keep(b); });
      api.scene.add(root);
      LIVE.set(api, { root, moving });
      api.std.friends(api);
    },

    /* the welcome scene is far from most of the ride: it is shown, and moves, only when she is near */
    update(dt, api) {
      const me = LIVE.get(api);
      if (!me) return;
      const near = api.g.s > api.L - 420;
      if (me.root.visible !== near) me.root.visible = near;
      if (near) for (let i = 0; i < me.moving.length; i++) me.moving[i].userData.update(dt, api.g.t);
    },
  };
})();
