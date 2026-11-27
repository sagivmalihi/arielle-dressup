/* ride-bike.js — her bike in 3D, built from a bike spec (bike.js). Needs THREE, ride-kit.js and bike.js.
   Everything is in metres, +Z is forward, the origin is on the ground under the middle of the bike.
   Whatever the bike looks like, the saddle, the grips and the pedals stay where they are, so the paper
   doll of ride-rider.js sits on every bike.

     DU.rideBike.DIM                               the fixed measures
     DU.rideBike.fit(body) → { saddleY, gripY }    how high the saddle and the grips are for her body
     DU.rideBike.build(spec, fit, opts) → bike     opts.cargo: 'bag' (default) | 'ball' | false — what lies in the crate
       bike = { tilt (Group with everything in it), steer, crate: { y, z }, phase, lean, go,
                update(dt, { speed, steer, braking }), bell(), dispose() }
     DU.rideBike.piece(kind, spec, fit) → { obj, dispose() }   one part by itself, for the small pictures of the workshop
     DU.rideBike.trail(kind, opts) → { obj, update(dt, x, y, z, speed), clear(), dispose() } | null
       what she leaves behind her when she rides; obj lives in the world, not in the bike */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const RB = (DU.rideBike = {});
  const T = window.THREE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const WR = 0.235, TYRE = 0.03, REAR_Z = -0.44, FRONT_Z = 0.47;
  const BB = { y: 0.205, z: -0.04 }, CRANK = 0.075, PEDX = 0.088;
  const FOOT_Y = BB.y - CRANK + 0.012; // where her soles are when a pedal is at the bottom
  const GRIP = { x: 0.215, z: 0.09 };
  const SZ = 0.31; // the steering turns around this z
  const UNIT = 1.3 / 696; // metres per body unit (the same as in ride-rider.js)
  RB.DIM = { WR, TYRE, REAR_Z, FRONT_Z, BB, CRANK, PEDX, FOOT_Y, GRIP, UNIT };
  RB.fit = function (body) {
    const R = DU.rig(body || { h: 0, m: 0 }), Y = (y) => FOOT_Y + (950 - y) * UNIT;
    return { saddleY: Y(R.crotchY) - 0.006, gripY: clamp(Y(R.sY + 14) - 0.2, 0.74, 0.97) };
  };

  const WHITE = '#ffffff', SILVER = '#e3e8ee', STRAW = '#f6dca6', STRAW_D = '#dcb878';
  const RAINBOW = ['#ff6b6b', '#ff9d4d', '#ffd54d', '#63c98a', '#5aa9ff', '#b99cff'];
  const BEADS = ['#ff8fc0', '#ffd54d', '#7de3e0', '#b99cff', '#ffffff', '#ff9d4d'];

  /* ---------- paint ---------- */
  /* a colour → itself; a special paint → a function that colours a geometry by where each bit of it is
     (zShift: the geometry will be moved that far along z after painting, as the parts of the steering are) */
  function painter(paint) {
    const def = DU.bike.paintDef(paint);
    if (!def) return paint;
    const cols = def.stops.map((c) => new T.Color(c)), tmp = new T.Color();
    const at = (y, z) => {
      if (def.axis === 'd') { const i = Math.floor((z + y * 0.8) / 0.055); return cols[((i % cols.length) + cols.length) % cols.length]; }
      const t = clamp(def.axis === 'y' ? (y - 0.2) / 0.58 : (z + 0.46) / 0.94, 0, 1) * (cols.length - 1);
      const i = Math.min(cols.length - 2, Math.floor(t));
      return tmp.copy(cols[i]).lerp(cols[i + 1], t - i);
    };
    return (geo, zShift = 0) => {
      const pos = geo.attributes.position, n = pos.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i += def.hard ? 3 : 1) {
        if (def.hard) { // one colour for the whole face: crisp stripes
          const c = at((pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3 + zShift);
          for (let j = 0; j < 3; j++) { arr[(i + j) * 3] = c.r; arr[(i + j) * 3 + 1] = c.g; arr[(i + j) * 3 + 2] = c.b; }
        } else { const c = at(pos.getY(i), pos.getZ(i) + zShift); arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      }
      geo.setAttribute('color', new T.BufferAttribute(arr, 3));
      return geo;
    };
  }
  const tint = (geo, color, zShift) => (typeof color === 'function' ? color(geo, zShift) : DU.rideKit.paint(geo, color));
  /* a tube from a to b. color: a colour or a painter (then it is cut into short rings so the colours can run along it) */
  function tube(a, b, r, color, seg = 6, zShift = 0) {
    const d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
    const rings = typeof color === 'function' ? Math.max(1, Math.round(len / 0.028)) : 1;
    const geo = new T.CylinderGeometry(r, r, len, seg, rings).toNonIndexed();
    geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()));
    geo.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    return tint(geo, color, zShift);
  }
  /* a bent tube through points (in the middle plane of the bike), with a little ball at every joint */
  function pipe(pts, r, color) {
    const K = DU.rideKit, out = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      out.push(tube(pts[i], pts[i + 1], r, color, 6));
      if (i) out.push(tint(K.g(new T.SphereGeometry(r, 6, 4), WHITE, pts[i][0], pts[i][1], pts[i][2]), color));
    }
    return out;
  }
  const bez = (a, c, b, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, u * u * a[1] + 2 * u * t * c[1] + t * t * b[1], u * u * a[2] + 2 * u * t * c[2] + t * t * b[2]]; });

  /* ---------- flat shapes ---------- */
  function starShape(R, r, n = 5) {
    const sh = new T.Shape();
    for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n + Math.PI / 2, q = i % 2 ? r : R; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); }
    sh.closePath();
    return sh;
  }
  function heartShape(s) { // the point is down, (0,0) is the middle
    const sh = new T.Shape();
    sh.moveTo(0, -s);
    sh.bezierCurveTo(-s * 1.55, -s * 0.05, -s * 0.95, s * 1.05, 0, s * 0.4);
    sh.bezierCurveTo(s * 0.95, s * 1.05, s * 1.55, -s * 0.05, 0, -s);
    return sh;
  }
  const slab = (shape, depth) => new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -depth / 2);
  /* a disc of coloured slices, seen from both sides, in the plane of a wheel */
  function sliceDisc(R, colors, slices) {
    const pos = [], nor = [], col = [], c = new T.Color(), STEPS = 3;
    for (let i = 0; i < slices; i++) {
      c.set(colors[i % colors.length]);
      for (let j = 0; j < STEPS; j++) {
        const a0 = ((i + j / STEPS) / slices) * Math.PI * 2, a1 = ((i + (j + 1) / STEPS) / slices) * Math.PI * 2;
        [1, -1].forEach((sd) => {
          const p = [[0, 0], [Math.cos(sd > 0 ? a0 : a1) * R, Math.sin(sd > 0 ? a0 : a1) * R], [Math.cos(sd > 0 ? a1 : a0) * R, Math.sin(sd > 0 ? a1 : a0) * R]];
          p.forEach(([y, z]) => { pos.push(sd * 0.007, y, z); nor.push(sd, 0, 0); col.push(c.r, c.g, c.b); });
        });
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  }

  /* ---------- wheels ---------- */
  function wheelParts(style, rim) {
    const K = DU.rideKit, H = Math.PI / 2, parts = [], IN = WR - TYRE * 2;
    parts.push(K.g(new T.TorusGeometry(WR - TYRE, TYRE, 8, 22), '#fff6e6', 0, 0, 0, 0, H, 0));
    parts.push(K.g(new T.TorusGeometry(IN + 0.006, 0.011, 6, 22), rim, 0, 0, 0, 0, H, 0));
    parts.push(K.g(new T.CylinderGeometry(0.024, 0.024, 0.075, 8), '#eef1f5', 0, 0, 0, 0, 0, H));
    const spokes = (n) => { for (let i = 0; i < n; i++) parts.push(K.g(new T.BoxGeometry(0.006, IN * 2, 0.006), '#dfe5ec', 0, 0, 0, (i * Math.PI) / n, 0, 0)); };
    const cap = (c, r = 0.034) => [-1, 1].forEach((s) => parts.push(K.g(new T.SphereGeometry(r, 8, 6), c, s * 0.012, 0, 0, 0, 0, 0, 0.45, 1, 1)));
    if (style === 'star') {
      parts.push(K.g(slab(starShape(IN - 0.002, IN * 0.44), 0.016), rim, 0, 0, 0, 0, H, 0));
      cap('#ffd54d');
    } else if (style === 'flower') {
      const petal = new T.SphereGeometry(1, 8, 6), lightC = DU.mix(rim, '#ffffff', 0.55);
      for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; parts.push(K.g(petal, i % 2 ? lightC : rim, 0, Math.cos(a) * 0.092, Math.sin(a) * 0.092, a, 0, 0, 0.013, 0.08, 0.05)); }
      cap('#ffd54d', 0.042);
    } else if (style === 'pinwheel') {
      parts.push(sliceDisc(IN, [rim, DU.lum(rim) > 0.86 ? '#ff8fc0' : '#ffffff'], 8));
      cap('#ffd54d');
    } else if (style === 'rainbow') {
      parts.push(sliceDisc(IN, RAINBOW, 12));
      cap('#ffffff');
    } else if (style === 'hearts') {
      spokes(5);
      const hg = slab(heartShape(0.04), 0.014);
      for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5; parts.push(K.g(hg, i % 2 ? '#ff8fc0' : '#ff5fa2', 0, Math.cos(a) * 0.105, Math.sin(a) * 0.105, a, H, 0)); }
      cap(rim, 0.03);
    } else { // beads on the spokes
      spokes(4);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.2, r = 0.085 + (i % 3) * 0.022;
        parts.push(K.g(new T.SphereGeometry(0.017, 6, 5), BEADS[i % BEADS.length], i % 2 ? 0.012 : -0.012, Math.cos(a) * r, Math.sin(a) * r));
      }
    }
    return parts;
  }
  const mudguard = (z, start, arc, color) => DU.rideKit.g(new T.TorusGeometry(WR + 0.022, 0.011, 4, 12, arc), color, 0, WR, z, start, Math.PI / 2, 0, 1, 1, 3.2);

  /* ---------- the frame ---------- */
  function frameParts(style, fit, PAINT) {
    const K = DU.rideKit, fr = [];
    const { saddleY, gripY } = fit;
    const BBp = [0, BB.y, BB.z], HB = [0, 0.46, 0.32], HT = [0, gripY - 0.05, 0.255], seatTop = [0, saddleY - 0.04, -0.13];
    const onSeat = (y) => { const k = (y - BB.y) / (seatTop[1] - BB.y); return [0, y, BB.z + (seatTop[2] - BB.z) * k]; }; // a point of the seat tube
    const onHead = (y) => { const k = (y - HB[1]) / (HT[1] - HB[1]); return [0, y, HB[2] + (HT[2] - HB[2]) * k]; };
    const stays = (top) => [-1, 1].forEach((s) => {
      fr.push(tube([s * 0.03, BB.y, BB.z], [s * 0.045, WR, REAR_Z], 0.013, PAINT));
      fr.push(tube([s * 0.045, WR, REAR_Z], [s * 0.012, top[1], top[2]], 0.012, PAINT));
    });
    fr.push(tube(HB, HT, 0.024, PAINT)); // the head tube
    if (style === 'sport') { // a diamond: a straight top tube
      const a = onSeat(clamp(saddleY - 0.13, 0.46, 0.62)), b = onHead(0.6);
      fr.push(tube(BBp, seatTop, 0.022, PAINT), tube(BBp, HB, 0.028, PAINT), tube(a, b, 0.022, PAINT));
      stays(a);
    } else if (style === 'cruiser') { // two long bows, like an old beach bike
      const a = onSeat(clamp(saddleY - 0.12, 0.47, 0.64)), b = onHead(0.63), a2 = onSeat(a[1] - 0.1), b2 = onHead(0.53);
      fr.push(tube(BBp, seatTop, 0.022, PAINT), tube(BBp, HB, 0.026, PAINT));
      fr.push(...pipe(bez(a, [0, a[1] - 0.1, 0.1], b, 10), 0.02, PAINT));
      fr.push(...pipe(bez(a2, [0, a2[1] - 0.1, 0.1], b2, 10), 0.02, PAINT));
      stays(a);
    } else if (style === 'heart') { // a big heart between the saddle and the bar
      const k = 0.0135, cz = BB.z + 0.02, cy = BB.y + 17 * k, pts = [];
      const P = (t) => [0, cy + (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k, cz + 16 * Math.pow(Math.sin(t), 3) * k];
      for (let i = 0; i <= 44; i++) pts.push(P(Math.PI + (i / 44) * Math.PI * 2));
      fr.push(...pipe(pts, 0.02, PAINT));
      const lobeL = P(-0.62), lobeR = P(0.62), sideR = P(1.35), sideL = P(-1.45);
      fr.push(tube([0, lobeL[1] - 0.03, lobeL[2] - 0.004], seatTop, 0.021, PAINT)); // the seat post grows out of one bump of the heart
      fr.push(tube(sideR, onHead(0.5), 0.02, PAINT), tube([0, lobeR[1] - 0.012, lobeR[2] + 0.02], onHead(0.6), 0.017, PAINT));
      stays(sideL);
    } else { // classic: low in the middle, easy to step through
      fr.push(tube(BBp, seatTop, 0.021, PAINT), tube(BBp, HB, 0.024, PAINT));
      fr.push(tube([0, BB.y + 0.16, BB.z - 0.045], [0, HB[1] + 0.05, HB[2] - 0.012], 0.019, PAINT));
      stays([0, BB.y + 0.3, BB.z - 0.085]);
    }
    fr.push(K.g(new T.CylinderGeometry(0.03, 0.03, 0.07, 8), SILVER, 0, BB.y, BB.z, 0, 0, Math.PI / 2));
    return fr;
  }

  /* ---------- what lies in the crate ---------- */
  function backpackParts() {
    const K = DU.rideKit, P = K.PAL, parts = [];
    parts.push(K.g(new T.BoxGeometry(0.2, 0.22, 0.11), P.purple, 0, 0.11, 0));
    parts.push(K.g(new T.CylinderGeometry(0.1, 0.1, 0.11, 10, 1, false, 0, Math.PI), P.purple, 0, 0.22, 0, 0, Math.PI / 2, Math.PI / 2));
    parts.push(K.g(new T.BoxGeometry(0.15, 0.1, 0.03), P.pink, 0, 0.08, -0.065));
    parts.push(K.g(new T.BoxGeometry(0.17, 0.02, 0.02), P.yellow, 0, 0.19, -0.06));
    parts.push(K.g(new T.SphereGeometry(0.022, 8, 6), P.yellow, 0, 0.1, -0.085));
    parts.push(K.g(new T.TorusGeometry(0.035, 0.008, 5, 10, Math.PI), P.pink, 0, 0.31, 0));
    return parts;
  }
  function ballParts() {
    const K = DU.rideKit, P = K.PAL, parts = [], r = 0.115, cols = [P.red, P.white, P.blue, P.yellow, P.green, P.white];
    for (let i = 0; i < 6; i++) parts.push(K.g(new T.SphereGeometry(r, 5, 10, (i * Math.PI) / 3, Math.PI / 3), cols[i], 0, r + 0.03, 0, 0.5, 0, 0.3));
    return parts;
  }

  /* ---------- on the handlebar: the basket (or a lamp) ---------- */
  /* → { parts (painted geometries, in the coordinates of the steering), glow (a mesh that shines, or null) } */
  function basketParts(style, gripY) {
    const K = DU.rideKit, P = K.PAL, st = [];
    const bkY = gripY - 0.15, bkZ = 0.44 - SZ;
    let glow = null;
    if (style === 'none') return { parts: st, glow };
    if (style === 'lamp') {
      const y = gripY - 0.11, z = 0.345 - SZ;
      st.push(tube([0, gripY - 0.05, 0.262 - SZ], [0, y, z - 0.03], 0.011, SILVER, 5));
      st.push(K.g(new T.CylinderGeometry(0.062, 0.04, 0.085, 12), '#c9ced6', 0, y, z + 0.015, Math.PI / 2, 0, 0));
      st.push(K.g(new T.TorusGeometry(0.06, 0.011, 6, 14), '#eef1f5', 0, y, z + 0.058));
      glow = new T.Mesh(new T.CircleGeometry(0.056, 16), new T.MeshBasicMaterial({ color: '#fff3b0', fog: false }));
      glow.position.set(0, y, z + 0.06);
      return { parts: st, glow };
    }
    st.push(K.g(new T.CylinderGeometry(0.135, 0.105, 0.15, 10), STRAW, 0, bkY, bkZ, 0, 0, 0, 1, 1, 0.72));
    st.push(K.g(new T.CylinderGeometry(0.139, 0.139, 0.022, 10), STRAW_D, 0, bkY + 0.07, bkZ, 0, 0, 0, 1, 1, 0.72));
    st.push(K.g(new T.CylinderGeometry(0.122, 0.122, 0.024, 10), '#b98f55', 0, bkY + 0.071, bkZ, 0, 0, 0, 1, 1, 0.72));
    st.push(tube([0, gripY - 0.05, 0.27 - SZ], [0, bkY + 0.02, bkZ - 0.08], 0.01, SILVER, 5));
    const petal = new T.SphereGeometry(0.017, 6, 4), heart = new T.SphereGeometry(0.012, 6, 4);
    const flower = (x, y, z, c, tiltX, r = 0.021) => {
      const f = [K.g(heart, c === P.yellow ? P.orange : P.yellow, 0, 0.006, 0)];
      for (let i = 0; i < 5; i++) f.push(K.g(petal, c, Math.cos(i * 1.2566) * r, 0, Math.sin(i * 1.2566) * r, 0, 0, 0, 1, 0.55, 1));
      const m = new T.Matrix4().makeRotationX(tiltX).setPosition(x, y, z);
      f.forEach((g) => st.push(g.applyMatrix4(m)));
    };
    if (style === 'teddy') { // a teddy bear looks out of the basket
      const fur = '#d9ab7a', furD = '#c99a6b', cream = '#f6e3c8', y0 = bkY + 0.1;
      const ball = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => st.push(K.g(new T.SphereGeometry(r, 10, 8), c, x, y, z, 0, 0, 0, sx, sy, sz));
      ball(0.075, fur, 0, y0 - 0.02, bkZ, 1, 0.9, 0.85); // tummy
      ball(0.068, fur, 0, y0 + 0.085, bkZ + 0.01); // head
      [-1, 1].forEach((s) => { ball(0.026, furD, s * 0.052, y0 + 0.14, bkZ + 0.005); ball(0.014, '#f3c9c0', s * 0.052, y0 + 0.14, bkZ + 0.022); ball(0.009, '#3a2c2c', s * 0.026, y0 + 0.1, bkZ + 0.07); ball(0.024, fur, s * 0.07, y0 + 0.02, bkZ + 0.07, 1, 0.8, 1); });
      ball(0.03, cream, 0, y0 + 0.07, bkZ + 0.062, 1, 0.8, 0.7);
      ball(0.009, '#3a2c2c', 0, y0 + 0.08, bkZ + 0.084);
      st.push(K.g(new T.TorusGeometry(0.05, 0.012, 5, 12), P.pink, 0, y0 + 0.032, bkZ + 0.012, Math.PI / 2 - 0.25, 0, 0)); // a ribbon round its neck
      flower(-0.085, bkY + 0.012, bkZ + 0.085, P.pink, Math.PI / 2, 0.018);
      flower(0.085, bkY + 0.012, bkZ + 0.085, WHITE, Math.PI / 2, 0.018);
      return { parts: st, glow };
    }
    const fl = [[-0.07, 0.03, P.pink], [0.06, 0.02, P.yellow], [0, 0.045, WHITE], [0.09, -0.03, P.purple], [-0.1, -0.02, P.orange]];
    fl.forEach(([x, z, c], i) => {
      st.push(tube([x * 0.6, bkY + 0.06, bkZ + z * 0.6], [x, bkY + 0.115 + (i % 2) * 0.02, bkZ + z], 0.004, P.green, 4));
      flower(x, bkY + 0.118 + (i % 2) * 0.02, bkZ + z, c, 0.25 - z * 4);
    });
    [[-0.055, P.pink], [0.055, WHITE], [0, P.yellow]].forEach(([x, c]) => flower(x, bkY + 0.012, bkZ + 0.1 - Math.abs(x) * 0.12, c, Math.PI / 2, 0.018));
    return { parts: st, glow };
  }

  /* ---------- on the grips: streamers ---------- */
  /* → [pivot, …] one for each grip; pivot.userData.kind says how it moves */
  function streamerPivots(style, gripY, own) {
    const K = DU.rideKit, P = K.PAL, out = [];
    if (style === 'none') return out;
    [-1, 1].forEach((s) => {
      const piv = new T.Group();
      piv.position.set(s * GRIP.x, gripY - 0.004, 0.03 - SZ);
      let geo;
      if (style === 'pompom') {
        const bits = [], cols = [P.pink, WHITE, '#ffb3d3', P.yellow];
        const r2 = K.rng(s > 0 ? 5 : 9);
        bits.push(tube([0, 0, 0], [0, -0.05, -0.01], 0.004, WHITE, 4));
        for (let i = 0; i < 16; i++) {
          const a = r2() * Math.PI * 2, b = Math.acos(r2() * 2 - 1), rr = 0.034;
          bits.push(K.g(new T.SphereGeometry(0.026, 5, 4), cols[i % cols.length], Math.sin(b) * Math.cos(a) * rr, -0.085 + Math.cos(b) * rr, -0.012 + Math.sin(b) * Math.sin(a) * rr));
        }
        geo = K.merge(bits);
      } else {
        const cols = style === 'rainbow' ? RAINBOW.concat(['#ff8fc0']) : [P.pink, P.yellow, P.teal, WHITE, P.purple];
        const long = style === 'rainbow' ? 0.11 : 0;
        geo = K.merge(cols.map((c, i) => {
          const len = 0.15 + long + (i % 3) * 0.025;
          const g = new T.PlaneGeometry(0.014, len).toNonIndexed();
          g.translate(0, -len / 2, 0);
          g.rotateY(i * 1.3);
          g.rotateX((i - (cols.length - 1) / 2) * (0.8 / cols.length));
          g.rotateZ(((i % 2 ? 1 : -1) * 0.12) + s * 0.1);
          return K.paint(g, c);
        }));
      }
      const m = new T.Mesh(geo, K.vmat({ side: T.DoubleSide }));
      piv.add(m);
      piv.userData.kind = style;
      own.push(geo);
      out.push(piv);
    });
    return out;
  }

  /* ---------- behind her: the flag ---------- */
  /* → { group, update(dt, m) } m = { go, lean, steer, time, speed }; null for 'none' */
  function flagOf(style, color, at, own) {
    const K = DU.rideKit, P = K.PAL;
    if (style === 'none') return null;
    const group = new T.Group();
    group.position.set(at[0], at[1], at[2]);
    const FLAG_TILT = -0.13; // the pole leans out so it does not cross her head
    let a = 0, v = 0, last = 0, spin = 0;
    const spring = (dt, m) => {
      const push = (m.steer - last) / Math.max(dt, 0.001);
      last = m.steer;
      v += (-a * 60 - v * 5 + push * 0.5 - m.lean * 20) * dt;
      a = clamp(a + v * dt, -0.5, 0.5);
      group.rotation.z = FLAG_TILT + a;
    };
    if (style === 'balloons') {
      const strings = [[0.0, 0.52, P.pink], [0.1, 0.66, P.yellow], [0.2, 0.5, P.teal]];
      const pivs = strings.map(([x, h, c], i) => {
        const piv = new T.Group();
        const geo = K.merge([
          tube([0, 0, 0], [x, h, 0], 0.0035, WHITE, 4),
          K.g(new T.SphereGeometry(0.085, 12, 10), c, x, h + 0.09, 0, 0, 0, 0, 1, 1.18, 1),
          K.g(new T.ConeGeometry(0.018, 0.026, 6), c, x, h + 0.002, 0),
          K.g(new T.SphereGeometry(0.02, 6, 5), DU.mix(c, '#ffffff', 0.7), x - 0.035, h + 0.13, 0.055),
        ]);
        piv.add(new T.Mesh(geo, K.vmat()));
        piv.userData.ph = i * 2.1;
        own.push(geo);
        group.add(piv);
        return piv;
      });
      return {
        group,
        update(dt, m) {
          spring(dt, m);
          group.rotation.z -= 0.16; // they float out to her side, not in front of her
          pivs.forEach((p, i) => {
            p.rotation.x = -m.go * (0.5 + i * 0.07) + Math.sin(m.time * (2.2 + i * 0.4) + p.userData.ph) * 0.05 * (1 + m.go);
            p.rotation.z = Math.sin(m.time * (1.7 + i * 0.3) + p.userData.ph) * 0.06 - a * 0.6;
          });
        },
      };
    }
    const poleH = 0.98;
    const pole = K.mesh([tube([0, 0, 0], [0, poleH, 0], 0.007, WHITE, 5), K.g(new T.SphereGeometry(0.016, 6, 5), P.yellow, 0, poleH + 0.01, 0)]);
    own.push(pole.geometry);
    group.add(pole);
    let cloth;
    if (style === 'pinwheel') { // it turns in the wind of the ride
      const cols = [color, DU.mix(color, '#ffffff', 0.6), DU.lum(color) > 0.8 ? '#ff8fc0' : '#ffd54d', WHITE];
      const blades = [];
      for (let i = 0; i < 4; i++) {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0, 0, 0.125, 0, 0, 0.07, 0.085, 0.012]), 3));
        g.computeVertexNormals();
        g.rotateZ((i * Math.PI) / 2);
        blades.push(K.paint(g, cols[i]));
      }
      blades.push(K.g(new T.SphereGeometry(0.02, 8, 6), P.yellow, 0, 0, 0.012));
      const geo = K.merge(blades);
      cloth = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
      cloth.position.set(0, poleH - 0.1, -0.03);
      own.push(geo, cloth.material);
      group.add(cloth);
      return {
        group,
        update(dt, m) {
          spring(dt, m);
          group.rotation.x = -m.go * 0.16 + Math.sin(m.time * 9) * 0.02 * m.go;
          spin += (1.2 + Math.min(m.speed, 14) * 2.2) * dt;
          cloth.rotation.z = spin;
        },
      };
    }
    let geo;
    if (style === 'heart' || style === 'star') {
      geo = new T.ShapeGeometry(style === 'heart' ? heartShape(0.085) : starShape(0.115, 0.052), 8);
      geo.rotateY(Math.PI / 2); // into the plane of the bike
      geo.translate(0, 0, -0.135);
    } else {
      geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0.07, 0, 0, -0.07, 0, 0, 0, -0.23]), 3));
      geo.computeVertexNormals();
    }
    cloth = new T.Mesh(geo, new T.MeshBasicMaterial({ color, side: T.DoubleSide }));
    cloth.position.y = poleH - 0.09;
    own.push(geo, cloth.material);
    group.add(cloth);
    return {
      group,
      update(dt, m) {
        spring(dt, m);
        group.rotation.x = -m.go * 0.16 + Math.sin(m.time * 9) * 0.02 * m.go;
        cloth.rotation.y = Math.sin(m.time * 14) * 0.5 * (0.15 + m.go);
        cloth.rotation.z = -m.go * 0.1;
      },
    };
  }

  /* ---------- the whole bike ---------- */
  RB.build = function (spec, fit, opts = {}) {
    const K = DU.rideKit, P = K.PAL;
    spec = DU.bike.norm(spec);
    fit = fit || RB.fit();
    const { saddleY, gripY } = fit;
    const PAINT = painter(spec.paint), rimC = spec.wheel, own = [];
    const tilt = new T.Group();

    /* --- frame, saddle, rack and crate (do not move) --- */
    const fr = frameParts(spec.frame, fit, PAINT);
    [-1, 1].forEach((s) => fr.push(tube([s * 0.05, WR, REAR_Z], [s * 0.07, 0.505, REAR_Z - 0.06], 0.007, SILVER, 5))); // rack stays
    fr.push(K.g(new T.SphereGeometry(0.07, 10, 6), spec.seat, 0, saddleY - 0.022, -0.15, 0, 0, 0, 0.95, 0.34, 1.2));
    fr.push(K.g(new T.SphereGeometry(0.05, 8, 6), spec.seat, 0, saddleY - 0.022, -0.07, 0, 0, 0, 0.75, 0.34, 1.1));
    fr.push(mudguard(REAR_Z, -0.55, 2.55, WHITE));
    const rackY = 0.508, cz = -0.525, cw = 0.25, cl = 0.2, chh = 0.105;
    fr.push(K.g(new T.BoxGeometry(0.13, 0.012, 0.3), SILVER, 0, rackY, cz + 0.05));
    fr.push(K.g(new T.BoxGeometry(cw, 0.012, cl), STRAW, 0, rackY + 0.012, cz));
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 2; i++) {
        fr.push(K.g(new T.BoxGeometry(0.012, 0.038, cl), i ? STRAW : STRAW_D, (s * cw) / 2, rackY + 0.037 + i * 0.048, cz));
        fr.push(K.g(new T.BoxGeometry(cw, 0.038, 0.012), i ? STRAW : STRAW_D, 0, rackY + 0.037 + i * 0.048, cz + (s * cl) / 2));
      }
      [-1, 1].forEach((e) => fr.push(K.g(new T.BoxGeometry(0.018, chh, 0.018), STRAW_D, (s * cw) / 2, rackY + 0.012 + chh / 2, cz + (e * cl) / 2)));
    });
    fr.push(K.g(new T.SphereGeometry(0.022, 8, 6), '#ff5d73', 0, rackY - 0.03, cz - cl / 2 - 0.035, 0, 0, 0, 1.5, 1, 0.5)); // rear reflector
    const frame = K.mesh(fr);
    tilt.add(frame);
    own.push(frame.geometry);

    /* --- wheels --- */
    const wheelGeo = K.merge(wheelParts(spec.wheels, rimC));
    own.push(wheelGeo);
    const rear = new T.Mesh(wheelGeo, K.vmat());
    rear.position.set(0, WR, REAR_Z);
    tilt.add(rear);

    /* --- steering: fork, bar, basket, front wheel --- */
    const HB = [0, 0.46, 0.32], HT = [0, gripY - 0.05, 0.255];
    const steer = new T.Group();
    steer.position.set(0, 0, SZ);
    tilt.add(steer);
    const st = [];
    [-1, 1].forEach((s) => {
      st.push(tube([s * 0.012, HB[1], HB[2] - SZ], [s * 0.045, WR, FRONT_Z - SZ], 0.013, PAINT, 6, SZ));
      st.push(tube([0, gripY, 0.25 - SZ], [s * 0.12, gripY + 0.022, 0.235 - SZ], 0.014, SILVER));
      st.push(tube([s * 0.12, gripY + 0.022, 0.235 - SZ], [s * GRIP.x, gripY, 0.145 - SZ], 0.014, SILVER));
      st.push(tube([s * GRIP.x, gripY, 0.15 - SZ], [s * GRIP.x, gripY - 0.004, 0.035 - SZ], 0.021, rimC, 8));
      st.push(K.g(new T.SphereGeometry(0.024, 8, 6), P.yellow, s * GRIP.x, gripY - 0.004, 0.032 - SZ));
    });
    st.push(tube(HT, [0, gripY, 0.25], 0.016, SILVER).translate(0, 0, -SZ));
    const basket = basketParts(spec.basket, gripY);
    basket.parts.forEach((g) => st.push(g));
    st.push(mudguard(FRONT_Z - SZ, 0.75, 2.0, WHITE));
    const steerMesh = K.mesh(st);
    steer.add(steerMesh);
    own.push(steerMesh.geometry);
    if (basket.glow) { steer.add(basket.glow); own.push(basket.glow.geometry, basket.glow.material); }
    const front = new T.Mesh(wheelGeo, K.vmat());
    front.position.set(0, WR, FRONT_Z - SZ);
    steer.add(front);
    // bell
    const bellM = K.mesh([K.g(new T.SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#f4f6f9', 0, 0, 0), K.g(new T.SphereGeometry(0.008, 6, 4), P.pink, 0, 0.031, 0)]);
    bellM.position.set(-0.115, gripY + 0.034, 0.238 - SZ);
    steer.add(bellM);
    own.push(bellM.geometry);
    const ringMat = new T.MeshBasicMaterial({ color: '#fff6c4', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, fog: false });
    const ringGeo = new T.TorusGeometry(0.07, 0.008, 5, 18);
    const rings = [0, 1].map(() => { const m = new T.Mesh(ringGeo, ringMat.clone()); m.visible = false; bellM.add(m); own.push(m.material); return m; });
    own.push(ringMat, ringGeo);
    const streamers = streamerPivots(spec.streamers, gripY, own);
    streamers.forEach((p) => steer.add(p));

    /* --- cranks and pedals --- */
    const crank = K.mesh([
      K.g(new T.CylinderGeometry(0.058, 0.058, 0.008, 12), P.yellow, 0.04, 0, 0, 0, 0, Math.PI / 2),
      tube([0.05, 0, 0], [0.05, 0, -CRANK], 0.009, SILVER, 5), tube([-0.05, 0, 0], [-0.05, 0, CRANK], 0.009, SILVER, 5),
    ]);
    crank.position.set(0, BB.y, BB.z);
    tilt.add(crank);
    own.push(crank.geometry);
    const pedalGeo = K.merge([K.g(new T.BoxGeometry(0.075, 0.018, 0.06), WHITE, 0, 0, 0), K.g(new T.BoxGeometry(0.078, 0.008, 0.02), P.yellow, 0, 0, 0)]);
    own.push(pedalGeo);
    const pedals = [-1, 1].map((s) => { const m = new T.Mesh(pedalGeo, K.vmat()); m.userData.s = s; tilt.add(m); return m; });

    /* --- in the crate --- */
    if (opts.cargo !== false) {
      const bag = K.mesh(opts.cargo === 'ball' ? ballParts() : backpackParts());
      bag.scale.setScalar(0.8);
      bag.position.set(0, rackY + 0.02, cz);
      tilt.add(bag);
      own.push(bag.geometry);
    }

    /* --- the flag (or balloons…) on the corner of the crate --- */
    const flag = flagOf(spec.flag, spec.flagC, [cw / 2, rackY, cz - cl / 2], own);
    if (flag) tilt.add(flag.group);

    /* --- motion --- */
    let lean = 0, bar = 0, wheelA = 0, time = 0, bellT = 0, sp = 0;
    const bike = {
      tilt, steer, spec, fit, crate: { y: rackY, z: cz }, phase: 0.6, lean: 0, go: 0, time: 0,
      update(dt, s = {}) {
        const speed = Math.max(0, s.speed || 0), steerIn = clamp(s.steer || 0, -1, 1);
        time += dt;
        sp += (speed - sp) * Math.min(1, dt * 6);
        const go = clamp(sp / 5, 0, 1);
        // going fast she is in a high gear: the legs and the wheels do not turn into a blur
        if (!s.braking) bike.phase += Math.min(speed * 1.25, 11 + speed * 0.2) * dt;
        wheelA += Math.min(speed / WR, 20 + speed * 0.25) * dt;
        rear.rotation.x = wheelA;
        front.rotation.x = wheelA;
        crank.rotation.x = bike.phase;
        pedals.forEach((p) => {
          const a = bike.phase + (p.userData.s > 0 ? 0 : Math.PI);
          p.position.set(p.userData.s * PEDX, BB.y + CRANK * Math.sin(a), BB.z - CRANK * Math.cos(a));
        });
        // lean into the turn, turn the bar
        lean += (steerIn * 0.2 * (0.35 + 0.65 * go) - lean) * Math.min(1, dt * 7);
        bar += (-steerIn * 0.24 - bar) * Math.min(1, dt * 9);
        tilt.rotation.z = lean;
        steer.rotation.y = bar;
        tilt.position.y = Math.sin(bike.phase * 2) * 0.004 * go;
        // what hangs from the grips trails behind with speed and flutters
        streamers.forEach((piv, i) => {
          if (piv.userData.kind === 'pompom') {
            piv.rotation.x = go * 0.75 + Math.sin(time * 12 + i * 2) * 0.1 * (0.2 + go);
            piv.rotation.z = Math.sin(time * 8 + i) * 0.12 * (0.2 + go) + lean * 0.5;
          } else {
            piv.rotation.x = 0.15 + go * 1.05 + Math.sin(time * 17 + i * 2) * 0.12 * (0.2 + go);
            piv.rotation.z = Math.sin(time * 11 + i) * 0.1 * (0.2 + go) + lean * 0.5;
          }
        });
        if (flag) flag.update(dt, { go, lean, steer: steerIn, time, speed: sp });
        // the bell
        if (bellT > 0) {
          bellT = Math.max(0, bellT - dt);
          const k = 1 - bellT / 0.55;
          bellM.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.45);
          bellM.rotation.z = Math.sin(k * 40) * 0.25 * (1 - k);
          rings.forEach((r, i) => {
            const kk = clamp(k * 1.3 - i * 0.25, 0, 1);
            r.visible = kk > 0 && kk < 1;
            r.scale.setScalar(0.4 + kk * 1.3);
            r.position.y = 0.05 + kk * 0.13;
            r.rotation.x = -0.35;
            r.material.opacity = (1 - kk) * 0.95;
          });
        } else if (rings[0].visible) rings.forEach((r) => (r.visible = false));
        bike.lean = lean; bike.go = go; bike.time = time;
      },
      bell() { bellT = 0.55; },
      dispose() {
        if (tilt.parent) tilt.parent.remove(tilt);
        own.forEach((o) => o && o.dispose && o.dispose());
      },
    };
    bike.update(0.0001, {});
    return bike;
  };

  /* ---------- one part by itself (for the small pictures of the workshop) ---------- */
  RB.piece = function (kind, spec, fit) {
    const K = DU.rideKit, own = [];
    spec = DU.bike.norm(spec);
    fit = fit || RB.fit();
    const obj = new T.Group();
    if (kind === 'wheels') {
      const m = K.mesh(wheelParts(spec.wheels, spec.wheel));
      own.push(m.geometry); obj.add(m);
    } else if (kind === 'basket') {
      const b = basketParts(spec.basket, fit.gripY);
      const m = K.mesh(b.parts.length ? b.parts : [K.g(new T.SphereGeometry(0.001, 4, 3), '#ffffff')]);
      own.push(m.geometry); obj.add(m);
      if (b.glow) { obj.add(b.glow); own.push(b.glow.geometry, b.glow.material); }
      obj.position.set(0, -(fit.gripY - 0.1), -(0.44 - SZ));
    } else if (kind === 'streamers') {
      const g = K.mesh([tube([GRIP.x, fit.gripY, 0.15 - SZ], [GRIP.x, fit.gripY - 0.004, 0.035 - SZ], 0.021, spec.wheel, 8), K.g(new T.SphereGeometry(0.024, 8, 6), K.PAL.yellow, GRIP.x, fit.gripY - 0.004, 0.032 - SZ)]);
      own.push(g.geometry); obj.add(g);
      const piv = streamerPivots(spec.streamers, fit.gripY, own)[1];
      if (piv) { piv.rotation.x = 0.5; obj.add(piv); }
      obj.position.set(-GRIP.x, -(fit.gripY - 0.1), -(0.03 - SZ) + 0.05);
    } else if (kind === 'flag') {
      const f = flagOf(spec.flag, spec.flagC, [0, 0, 0], own);
      if (f) { f.update(0.016, { go: 0.5, lean: 0, steer: 0, time: 0.4, speed: 4 }); f.group.rotation.set(0, 0, 0); obj.add(f.group); }
    } else {
      const b = RB.build(spec, fit, { cargo: kind === 'bike' ? 'bag' : false });
      obj.add(b.tilt);
      return { obj, dispose: () => b.dispose() };
    }
    return { obj, dispose: () => own.forEach((o) => o && o.dispose && o.dispose()) };
  };

  /* ---------- what she leaves behind her ---------- */
  const DRAW = {
    sparkle(c) { c.translate(32, 32); c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? 6 : 29; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.shadowColor = '#fff'; c.shadowBlur = 5; c.fillStyle = '#fff'; c.fill(); },
    stars(c) { c.translate(32, 33); c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 ? 12.5 : 27; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.lineJoin = 'round'; c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke(); },
    hearts(c) { c.translate(32, 34); c.beginPath(); c.moveTo(0, 22); c.bezierCurveTo(-36, -2, -22, -30, 0, -12); c.bezierCurveTo(22, -30, 36, -2, 0, 22); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(-11, -9, 4, 0, 7); c.fillStyle = 'rgba(255,255,255,.9)'; c.fill(); },
    bubbles(c) { const g = c.createRadialGradient(32, 32, 14, 32, 32, 29); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(0.8, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,.95)'); c.beginPath(); c.arc(32, 32, 28, 0, 7); c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke(); c.beginPath(); c.ellipse(22, 20, 7, 4, -0.7, 0, 7); c.fillStyle = '#fff'; c.fill(); },
    fire(c) { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); },
  };
  const LOOK = {
    sparkle: { cols: ['#ffffff', '#fff6c2', '#ffe08a'], size: [0.16, 0.3], life: [0.55, 0.95], rise: 0.25, spread: 0.3, spin: 2 },
    stars: { cols: ['#ffd54d', '#ff8fc0', '#7de3e0', '#b99cff', '#ffffff'], size: [0.2, 0.32], life: [0.7, 1.1], rise: 0.5, spread: 0.3, spin: 4 },
    hearts: { cols: ['#ff5fa2', '#ff8fc0', '#ffb3d3', '#ff6b6b'], size: [0.2, 0.32], life: [0.8, 1.2], rise: 0.7, spread: 0.26, spin: 0.6 },
    bubbles: { cols: ['#ffffff', '#d6f0ff', '#e9dcff', '#ffe3f0'], size: [0.14, 0.34], life: [0.9, 1.5], rise: 0.9, spread: 0.34, spin: 0 },
    fire: { cols: ['#fff3b0'], size: [0.34, 0.5], life: [0.32, 0.5], rise: 0.15, spread: 0.08, spin: 0, fire: true },
  };
  RB.trail = function (kind, opts = {}) {
    const K = DU.rideKit;
    if (!kind || kind === 'none') return null;
    if (kind === 'rainbow') return ribbon(opts);
    const L = LOOK[kind];
    if (!L) return null;
    const tex = K.canvasTex(64, 64, DRAW[kind]);
    const obj = new T.Group(), N = opts.count || 44, list = [];
    const hot = [new T.Color('#fff3b0'), new T.Color('#ffb03a'), new T.Color('#ff5d3a')];
    for (let i = 0; i < N; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
      sp.visible = false;
      obj.add(sp);
      list.push({ sp, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 0.2, spin: 0 });
    }
    let next = 0, acc = 0, px = null, py = 0, pz = 0;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const spawn = (x, y, z) => {
      const p = list[next]; next = (next + 1) % N;
      p.max = p.life = rnd(L.life[0], L.life[1]);
      p.size = rnd(L.size[0], L.size[1]);
      p.vx = rnd(-1, 1) * L.spread; p.vz = rnd(-1, 1) * L.spread; p.vy = L.rise * rnd(0.6, 1.3);
      p.spin = rnd(-1, 1) * L.spin;
      p.sp.position.set(x + rnd(-1, 1) * (L.fire ? 0.05 : 0.16), y + (L.fire ? 0.22 : rnd(0.12, 0.5)), z + rnd(-1, 1) * (L.fire ? 0.05 : 0.16));
      p.sp.material.color.set(L.cols[Math.floor(Math.random() * L.cols.length)]);
      p.sp.material.rotation = rnd(0, 6.28);
      p.sp.visible = true;
    };
    return {
      obj,
      update(dt, x, y, z, speed) {
        if (px === null) { px = x; py = y; pz = z; }
        if (speed > 1.5) {
          acc += Math.hypot(x - px, z - pz);
          const gap = (L.fire ? 0.3 : 0.5) + speed * 0.012;
          let n = 0;
          while (acc >= gap && n < 4) { acc -= gap; n++; const k = Math.random(); spawn(px + (x - px) * k, py + (y - py) * k, pz + (z - pz) * k); }
          if (acc > gap) acc = 0;
        }
        px = x; py = y; pz = z;
        for (let i = 0; i < N; i++) {
          const p = list[i];
          if (p.life <= 0) continue;
          p.life -= dt;
          if (p.life <= 0) { p.sp.visible = false; continue; }
          const k = 1 - p.life / p.max, m = p.sp.material;
          p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt;
          m.rotation += p.spin * dt;
          if (L.fire) { m.color.copy(hot[k < 0.5 ? 0 : 1]).lerp(hot[k < 0.5 ? 1 : 2], k < 0.5 ? k * 2 : k * 2 - 1); m.opacity = (1 - k) * 0.95; p.sp.scale.setScalar(p.size * (1 - k * 0.6)); }
          else { m.opacity = k < 0.15 ? k / 0.15 : Math.min(1, (1 - k) * 2.2); p.sp.scale.setScalar(p.size * (0.5 + Math.min(1, k * 4) * 0.5) * (kind === 'bubbles' ? 1 + k * 0.4 : 1)); }
        }
      },
      clear() { list.forEach((p) => { p.life = 0; p.sp.visible = false; }); px = null; acc = 0; },
      dispose() { if (obj.parent) obj.parent.remove(obj); tex.dispose(); list.forEach((p) => p.sp.material.dispose()); },
    };
  };
  /* a rainbow painted on the road behind her */
  function ribbon(opts) {
    const K = DU.rideKit, N = opts.rows || 34, STEP = opts.step || 0.5, W = opts.width || 0.3;
    const tex = K.canvasTex(96, 4, (c) => RAINBOW.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 16, 0, 16, 4); }));
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(N * 6), uv = new Float32Array(N * 4), col = new Float32Array(N * 8), idx = [];
    for (let i = 0; i < N; i++) { uv[i * 4] = 0; uv[i * 4 + 2] = 1; uv[i * 4 + 1] = uv[i * 4 + 3] = 0.5; if (i < N - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setAttribute('color', new T.BufferAttribute(col, 4));
    geo.setIndex(idx);
    const mat = new T.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, side: T.DoubleSide });
    const obj = new T.Mesh(geo, mat);
    obj.frustumCulled = false; obj.renderOrder = 2; obj.visible = false;
    const rows = []; // newest first: { x, y, z, nx, nz }
    let show = 0;
    return {
      obj,
      update(dt, x, y, z, speed) {
        const head = rows[0];
        if (!head) { rows.unshift({ x, y, z, nx: 1, nz: 0 }, { x, y, z, nx: 1, nz: 0 }); return; }
        const prev = rows[1], dx = x - prev.x, dz = z - prev.z, d = Math.hypot(dx, dz);
        head.x = x; head.y = y; head.z = z;
        if (d > 0.02) { head.nx = dz / d; head.nz = -dx / d; }
        if (d >= STEP) { rows.unshift({ x, y, z, nx: head.nx, nz: head.nz }); if (rows.length > N) rows.pop(); }
        show += ((speed > 1.5 ? 1 : 0) - show) * Math.min(1, dt * 3);
        obj.visible = show > 0.02 && rows.length > 2;
        const n = rows.length;
        for (let i = 0; i < N; i++) {
          const r = rows[Math.min(i, n - 1)], k = i / (N - 1);
          pos[i * 6] = r.x - r.nx * W; pos[i * 6 + 1] = r.y; pos[i * 6 + 2] = r.z - r.nz * W;
          pos[i * 6 + 3] = r.x + r.nx * W; pos[i * 6 + 4] = r.y; pos[i * 6 + 5] = r.z + r.nz * W;
          const a = (i >= n ? 0 : Math.min(1, i / 1.5) * Math.pow(1 - k, 1.3)) * show * 0.92;
          for (let j = 0; j < 2; j++) { col[i * 8 + j * 4] = 1; col[i * 8 + j * 4 + 1] = 1; col[i * 8 + j * 4 + 2] = 1; col[i * 8 + j * 4 + 3] = a; }
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      },
      clear() { rows.length = 0; obj.visible = false; show = 0; },
      dispose() { if (obj.parent) obj.parent.remove(obj); tex.dispose(); geo.dispose(); mat.dispose(); },
    };
  }
})();
