/* ride-sky-city.js — Dinosaur City: the big floating island at the end of the sky road (called by ride-sky-scene.js).

   The road comes onto the island, passes under the gate with the name of the city (marks.gate, 34 m before the end)
   and ends in the round square. Round the square stand houses shaped like spotted eggs, behind them taller houses
   and towers on a rise, and straight ahead, up a wide stair, the palace with its egg dome. Strings of coloured
   lights hang over the square; the windows are lit, because she arrives at dusk.
   The middle of the square (5.6 m to each side of the road, from 20 m before its end to 6 m after) is left empty
   for the game: the finish arch stands there, and her friends. The dinosaurs who welcome her stand round it.

   Places are given as (f, r): f metres past the end of the road (minus = before it), r metres to its right. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const S = (DU.rideSky = DU.rideSky || {});
  const PI = Math.PI, TAU = PI * 2;

  S.dinoCity = function (kit, B) {
    const { T, K, L, M, C, altAt, soupAt, above, low } = kit;
    const { P, tint, tpl, stampAt, crowd, actor, sign, island, plant, waterfall, onLand, POST, STAR } = B;
    const mk = S.modelKit(), { gs, gcone, gcyl, sweep } = mk, RAINBOW = mk.RAINBOW;
    const SK = L - 10, E = P(L, 0, 0), top = altAt(L) - 0.1;
    /* (f, r) → world x, z */
    const X = (f, r) => E.x + E.tx * f + E.nx * r, Z = (f, r) => E.z + E.tz * f + E.nz * r;
    const W = (f, r) => ({ x: X(f, r), z: Z(f, r) });
    const lam = soupAt(SK, 'lam'), lit = soupAt(SK, 'lit');
    const put = (g, f, r, y, ry, sc) => { if (g[0]) lam.add(g[0], X(f, r), top + (y || 0), Z(f, r), ry || 0, sc === undefined ? 1 : sc); if (g[1]) lit.add(g[1], X(f, r), top + (y || 0), Z(f, r), ry || 0, sc === undefined ? 1 : sc); };
    const faceTo = (f, r, f2, r2) => Math.atan2(X(f2, r2) - X(f, r), Z(f2, r2) - Z(f, r));
    const SQ = { f: -6, r: 19 }; // the square: its middle and its radius
    /* a place on a ring round the middle of the square: angle 0 = straight ahead of her, π = the gate */
    const ring = (rad, deg) => [SQ.f + Math.cos((deg * PI) / 180) * rad, Math.sin((deg * PI) / 180) * rad];

    /* ---------- the island ---------- */
    const ctr = W(20, 0), isl = island(SK, ctr.x, top, ctr.z, 84, { seed: 99, wobble: 0.6, grass: '#aee9a6', grass2: '#98e09a', depth: 30 });
    isl.road = [L - 80, L + 2];
    onLand.push([L - 62, L + 10]);
    kit.info.square = { s0: L - 25, s1: L, x: X(SQ.f, 0), z: Z(SQ.f, 0), y: top, r: SQ.r, free: 5.6 };
    [[150, 5], [-120, 4], [40, 3.4]].forEach(([deg, w]) => { const a = (deg * PI) / 180 + Math.atan2(E.tz, E.tx), e = isl.at(a, 0.985); waterfall(SK, e[0], top, e[1], Math.cos(a), Math.sin(a), w); });

    /* ---------- the square: rings of pale tiles, and the lane in from the gate ---------- */
    (function square() {
      const cols = [C('#fff3dc'), C('#ffe2ec'), C('#fdf6ff'), C('#ffeccc')], N = 28, RS = [0, 5, 10, 14.5, SQ.r], y = top + 0.05;
      const pt = (i, k) => { const a = (i / N) * TAU; return [X(SQ.f + Math.cos(a) * RS[k], Math.sin(a) * RS[k]), y, Z(SQ.f + Math.cos(a) * RS[k], Math.sin(a) * RS[k])]; };
      for (let k = 0; k + 1 < RS.length; k++) for (let i = 0; i < N; i++) {
        const col = cols[(i + k * 2) % 2 + (k % 2) * 2], a = pt(i, k), b = pt(i + 1, k), c = pt(i + 1, k + 1), d = pt(i, k + 1);
        if (k === 0) lit.tri(a, c, d, col); else lit.quad(a, b, c, d, col);
      }
      // a rim of gold round it
      for (let i = 0; i < N; i++) { const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, q = (a, rad) => [X(SQ.f + Math.cos(a) * rad, Math.sin(a) * rad), y + 0.01, Z(SQ.f + Math.cos(a) * rad, Math.sin(a) * rad)]; lit.quad(q(a0, SQ.r), q(a1, SQ.r), q(a1, SQ.r + 0.7), q(a0, SQ.r + 0.7), C('#ffd35a')); }
    })();

    /* ---------- templates: [what the light falls on, what glows] ---------- */
    const WARM = '#fff0a8', FRAME = '#ffffff';
    /* a round window that glows, on a wall that faces +Z at (x, y, z), turned by ry */
    const win = (x, y, z, r, ry) => [K.g(new T.CircleGeometry(r, 10), WARM, x, y, z, 0, ry, 0), K.g(new T.RingGeometry(r, r * 1.3, 10), FRAME, x, y, z, 0, ry, 0)];
    const flag = (y, col) => [gcyl('#ffffff', 0, y + 1.1, 0, 0.05, 0.05, 2.2, 4), K.g(new T.BoxGeometry(1.1, 0.6, 0.04), col, 0.58, y + 1.85, 0), gs('#ffd35a', 0, y + 2.25, 0, 0.12)];
    /* a round spot painted on an egg-shaped wall (radii rx, ry about the height cy): a flat disc lying on the shell */
    function spot(col, rx, ry, cy, az, el, r) {
      const nx = (Math.sin(el) * Math.sin(az)) / rx, ny = Math.cos(el) / ry, nz = (Math.sin(el) * Math.cos(az)) / rx, l = Math.hypot(nx, ny, nz);
      const g = new T.CircleGeometry(r, 9);
      g.rotateX(-Math.asin(ny / l)); g.rotateY(Math.atan2(nx, nz));
      return K.g(g, col, rx * Math.sin(el) * Math.sin(az) + (nx / l) * 0.07, cy + ry * Math.cos(el) + (ny / l) * 0.07, rx * Math.sin(el) * Math.cos(az) + (nz / l) * 0.07);
    }
    /* a house like a big spotted egg: a round door, two lit windows, something on its head */
    function eggHouse(col, spotCol, style) {
      const RX = 3.0, RY = 3.9, CY = 2.9, lamP = [K.g(new T.SphereGeometry(1, 12, 8), col, 0, CY, 0, 0, 0, 0, RX, RY, RX)], litP = [];
      [[0.95, 0.75, 0.62], [2.4, 1.25, 0.72], [4.0, 0.85, 0.6], [5.3, 1.45, 0.7], [1.75, 1.8, 0.5], [3.3, 1.9, 0.58], [5.9, 0.6, 0.48], [3.0, 0.4, 0.4]].forEach(([az, el, r]) => lamP.push(spot(spotCol, RX, RY, CY, az, el, r)));
      // the door, wide enough for a dinosaur
      lamP.push(K.g(new T.CylinderGeometry(1.0, 1.0, 1.2, 12), '#b98a66', 0, 1.05, 2.6, PI / 2), K.g(new T.TorusGeometry(1.0, 0.17, 5, 12), '#fff6e6', 0, 1.05, 3.2, 0), gs('#ffd35a', 0.55, 1.05, 3.24, 0.11), K.g(new T.BoxGeometry(2.6, 0.2, 1.0), '#fff6e6', 0, 0.1, 3.6));
      [-1, 1].forEach((sd) => { const w = win(sd * 1.56, 3.55, 2.63, 0.5, sd * 0.55); litP.push(w[0]); lamP.push(w[1]); });
      if (style === 0) lamP.push(gcone(spotCol, 0, CY + RY + 0.55, 0, 1.7, 1.9, 9), gs('#ffd35a', 0, CY + RY + 1.6, 0, 0.26));
      else if (style === 1) lamP.push(...flag(CY + RY - 0.2, spotCol));
      else for (let i = 0; i < 5; i++) { const leaf = gs(i % 2 ? '#8fe0a0' : '#a9ecc0', 1.0, -0.2, 0, 1.2, 0.09, 0.36, 6, 3, 0, -0.35); leaf.rotateY((i / 5) * TAU); leaf.translate(0, CY + RY + 0.1, 0); lamP.push(leaf); }
      // a chimney, a little askew
      lamP.push(gcyl('#fff6e6', -1.6, CY + RY * 0.72, -0.9, 0.34, 0.4, 1.5, 6, 0, 0, 0.25), gcyl(spotCol, -1.78, CY + RY * 0.72 + 0.75, -0.9, 0.44, 0.44, 0.22, 6, 0, 0, 0.25));
      return [tpl(lamP), tpl(litP)];
    }
    /* a round tower with an egg for a dome, a ring of lit windows and a flag */
    function towerGeo(col, dome, spotCol, h, r, flagCol) {
      const lamP = [gcyl(col, 0, h / 2, 0, r * 0.9, r, h, 10), gcyl(tint(col, '#ffffff', 0.4), 0, h + 0.3, 0, r * 1.22, r * 1.05, 0.6, 10), K.g(new T.SphereGeometry(1, 10, 7), dome, 0, h + 0.5 + r * 0.95, 0, 0, 0, 0, r * 1.12, r * 1.75, r * 1.12)], litP = [];
      [[0.8, 0.8], [2.9, 1.1], [4.7, 0.7], [1.9, 1.5], [5.6, 1.4], [3.8, 1.75]].forEach(([az, el], i) => lamP.push(spot(spotCol, r * 1.12, r * 1.75, h + 0.5 + r * 0.95, az, el, r * (0.24 + (i % 2) * 0.07))));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3, y = h * (i % 2 ? 0.74 : 0.5), rw = r * (0.9 + 0.1 * (1 - y / h)) + 0.03, w = win(Math.sin(a) * rw, y, Math.cos(a) * rw, r * 0.24, a); litP.push(w[0]); lamP.push(w[1]); }
      lamP.push(...flag(h + 0.5 + r * 2.6, flagCol));
      return [tpl(lamP), tpl(litP)];
    }
    const HOUSES = [['#ffd9ec', '#ff9fcb', 0], ['#d9f2ff', '#8fc8ff', 1], ['#fff6c8', '#ffb85e', 2], ['#e6dcff', '#b79cff', 0], ['#d6f5e6', '#7fdcb0', 1], ['#ffe6d0', '#ff9a7a', 2]].map(([c, s, st]) => eggHouse(c, s, st));
    const TOWERS = [['#ffe9f2', '#ff9fcb', '#ffffff', 11, 2.1, '#ffd35a'], ['#eaf4ff', '#8fc8ff', '#ffffff', 14, 2.3, '#ff9fcb'], ['#f1eaff', '#b79cff', '#fff3b0', 12.5, 2.0, '#7fe3c4'], ['#fff6dc', '#ffc56e', '#ffffff', 16, 2.4, '#b79cff']].map((a) => towerGeo(...a));

    /* ---------- the gate ---------- */
    (function gate() {
      const f = M.gate - L, GW = 7.6; // the towers stand this far to each side
      [-1, 1].forEach((sd) => {
        put(TOWERS[sd > 0 ? 0 : 2], f, sd * GW, 0, faceTo(f, sd * GW, f - 30, 0), 1.05);
        // a wing of wall to each side, with eggs along its top
        const wl = sweep([[X(f, sd * (GW + 2)), top + 1.3, Z(f, sd * (GW + 2))], [X(f + 1.5, sd * (GW + 8)), top + 1.3, Z(f + 1.5, sd * (GW + 8))], [X(f + 5, sd * (GW + 14)), top + 1.3, Z(f + 5, sd * (GW + 14))]], [1.5, 1.5, 1.5], '#fff3dc', 6, 4);
        lam.add(tpl([wl]), 0, 0, 0, 0, 1);
        for (let i = 0; i < 5; i++) { const t = i / 4, ff = f + t * t * 5, r2 = sd * (GW + 2.6 + t * 11); lam.add(S.eggGeo(i + (sd > 0 ? 0 : 2)), X(ff, r2), top + 2.6, Z(ff, r2), i, 1.25); }
        put([TOWERS[sd > 0 ? 1 : 3][0], TOWERS[sd > 0 ? 1 : 3][1]], f + 5.5, sd * (GW + 15.5), 0, 0, 0.7);
      });
      // the arch between the towers: a pink beam with the name of the city, a baby looking down from the top
      const beam = [], N = 12;
      for (let i = 0; i <= N; i++) { const t = i / N, r2 = (t - 0.5) * 2 * (GW - 1.2); beam.push([X(f, r2), top + 8.0 + Math.sin(t * PI) * 1.9, Z(f, r2)]); }
      lam.add(tpl([sweep(beam, beam.map(() => 0.55), '#ff9fcb', 6, 1)]), 0, 0, 0, 0, 1);
      sign('עיר הדינוזאורים', { h: 1.5, bg: '#ffffff', fg: '#ff5fa2', border: '#ffd35a', pad: 0.5 }, above, X(f - 0.75, 0), top + 8.4, Z(f - 0.75, 0), E.ry + PI); // it reads from where she comes
      sign('ברוכה הבאה!', { h: 1.2, bg: '#ffffff', fg: '#8b6cf0', border: '#ffd35a', pad: 0.5 }, above, X(f + 0.75, 0), top + 8.4, Z(f + 0.75, 0), E.ry); // and from inside the square
      lam.add(S.still('baby', { seed: 1, size: 1.9 }), X(f, 0), top + 10.45, Z(f, 0), E.ry + PI, 1);
      [-2.6, 2.6].forEach((r2, i) => lit.add(STAR, X(f - 0.2, r2 * 1.9), top + 9.9 - Math.abs(r2) * 0.3, Z(f - 0.2, r2 * 1.9), E.ry, 1.5));
      kit.info.gateWidth = GW * 2 - 5; // free width between the towers
    })();

    /* ---------- the town ---------- */
    const solid = []; // [f, r, radius]: where something stands (nothing is planted there)
    /* the rises behind the square: flat-topped hills. [f, r, radius at the foot, radius of the top, height, how much wider than long] */
    const HILLS = [[42, 0, 27, 13, 6.5, 1.3], [12, -34, 15, 7, 3.4, 1], [12, 34, 15, 7, 3.4, 1], [-10, -40, 13, 6, 2.8, 1], [-10, 40, 13, 6, 2.8, 1]];
    const hillAt = (f, r) => HILLS.reduce((h, q) => Math.max(h, q[4] * Math.max(0, Math.min(1, (q[2] - Math.hypot(f - q[0], (r - q[1]) / q[5])) / (q[2] - q[3])))), 0);
    isl.height = (x, z) => hillAt((x - E.x) * E.tx + (z - E.z) * E.tz, (x - E.x) * E.nx + (z - E.z) * E.nz);
    (function town() {
      // the first ring: egg houses round the square, their doors turned to its middle
      [[-142, 0, 1.0], [-108, 1, 0.92], [-74, 2, 1.05], [-40, 3, 0.95], [40, 4, 1.0], [74, 5, 0.92], [108, 0, 1.05], [142, 1, 0.95]].forEach(([deg, v, sc]) => {
        const [f, r] = ring(SQ.r + 6.2, deg);
        put(HOUSES[v], f, r, 0, faceTo(f, r, SQ.f, 0), sc); solid.push([f, r, 4.6]);
      });
      HILLS.forEach(([f, r, rb, rt, h, kx]) => lam.add(tpl([K.g(new T.CylinderGeometry(rt, rb, h, 22, 1), '#a2e4a0', 0, h / 2, 0, 0, 0, 0, 1, 1, 1, true)]), X(f, r), top - 0.05, Z(f, r), E.ry, kx, 1, 1));
      // the second ring, on the rises: taller houses and towers
      [[-125, 't1'], [-96, 'h'], [-66, 't3'], [-34, 'h'], [34, 'h'], [66, 't0'], [96, 'h'], [125, 't2']].forEach(([deg, what], i) => {
        const [f, r] = ring(SQ.r + 18.5, deg), up = hillAt(f, r) - 0.4;
        if (what === 'h') put(HOUSES[(i * 5 + 2) % 6], f, r, up, faceTo(f, r, SQ.f, 0), 1.18); else put(TOWERS[+what[1]], f, r, up, faceTo(f, r, SQ.f, 0), 1.15);
        solid.push([f, r, 5]);
      });
      // the palace, straight ahead of her on the highest rise: a great egg dome, four small towers, a wide stair down to the square
      const pf = 42, py = hillAt(pf, 0);
      put(towerGeo('#fff6ea', '#ffffff', '#ffd35a', 15, 5.2, '#ff9fcb'), pf, 0, py - 0.3, faceTo(pf, 0, SQ.f, 0), 1);
      [[-7.5, -6.5, 1], [-7.5, 6.5, 3], [5, -8, 0], [5, 8, 2]].forEach(([df, r, v]) => put(TOWERS[v], pf + df, r, py - 0.3, 0, 0.85));
      const door = [K.g(new T.CylinderGeometry(2.1, 2.1, 0.5, 14), '#c99a72', 0, 2.1, 5.0, PI / 2), K.g(new T.TorusGeometry(2.1, 0.3, 5, 14), '#ffd35a', 0, 2.1, 5.2), K.g(S.heartGeo(0.8, 0.2), '#ff9fcb', 0, 7.2, 5.35)];
      put([tpl(door), null], pf, 0, py - 0.3, faceTo(pf, 0, SQ.f, 0), 1);
      const f0 = HILLS[0][0] - HILLS[0][2], f1 = HILLS[0][0] - HILLS[0][3], NS = 10; // the stair climbs the front of the rise
      for (let i = 0; i < NS; i++) { const ff = f0 + ((i + 0.5) / NS) * (f1 - f0), y = ((i + 1) / NS) * py; lam.add(tpl([K.g(new T.BoxGeometry(8 - i * 0.1, 1.2, (f1 - f0) / NS + 0.05), i % 2 ? '#fff3dc' : '#ffe2ec', 0, -0.6, 0)]), X(ff, 0), top + y, Z(ff, 0), E.ry, 1); }
      solid.push([pf, 0, 12], [(f0 + f1) / 2, 0, 8.5]);
      kit.info.palace = { x: X(pf, 0), z: Z(pf, 0), y: top + py + 27 };
    })();

    /* ---------- the fountain: a golden egg in a round pool, beyond the end of the road ---------- */
    (function fountain() {
      const f = 9.5;
      put([tpl([K.g(new T.TorusGeometry(3.0, 0.42, 6, 16), '#fff3dc', 0, 0.35, 0, PI / 2), gcyl('#ffe2ec', 0, 0.7, 0, 0.9, 1.2, 1.4, 8), K.g(new T.SphereGeometry(1, 10, 7), '#ffd35a', 0, 2.45, 0, 0, 0, 0, 1.0, 1.35, 1.0), gs('#ffffff', 0.5, 2.9, 0.75, 0.25, 0.25, 0.12, 6, 3), gs('#ffffff', -0.62, 2.3, 0.72, 0.2, 0.2, 0.1, 6, 3), gs('#ffffff', 0.1, 1.9, 0.98, 0.16, 0.16, 0.08, 6, 3)]),
        tpl([K.g(new T.CircleGeometry(2.95, 16), '#9fe4f6', 0, 0.5, 0, -PI / 2), ...[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * TAU; return sweep([[Math.cos(a) * 0.9, 1.4, Math.sin(a) * 0.9], [Math.cos(a) * 1.6, 1.75, Math.sin(a) * 1.6], [Math.cos(a) * 2.2, 0.6, Math.sin(a) * 2.2]], [0.09, 0.07, 0.05], '#d8f6ff', 4, 3); })])], f, 0, 0, 0, 1);
      solid.push([f, 0, 4.5]);
    })();

    /* ---------- strings of lights over the square ---------- */
    (function lights() {
      const bulb = tpl([K.g(new T.OctahedronGeometry(1), '#ffffff', 0, 0, 0, 0, 0, 0, 0.2, 0.26, 0.2, true)]), RBC = RAINBOW.map(C);
      const string = (a, b, sag) => {
        const len = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(6, Math.round(len / 1.3)), pts = [];
        for (let i = 0; i <= n; i++) { const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * PI) * sag, a[2] + (b[2] - a[2]) * t]; pts.push(p); if (i && i < n) lit.add(bulb, p[0], p[1] - 0.22, p[2], i, 1, 1, 1, () => RBC[i % 6]); }
        lam.add(tpl([sweep(pts.filter((_, i) => i % 2 === 0 || i === n), pts.filter((_, i) => i % 2 === 0 || i === n).map(() => 0.035), '#ffffff', 3, 1)]), 0, 0, 0, 0, 1);
      };
      // poles round the square with a star on each, and the strings from pole to pole
      const poles = [];
      for (let i = 0; i < 10; i++) { const deg = 18 + i * 36, [f, r] = ring(SQ.r + 1.6, deg); if (Math.abs(r) < 6.5) continue; lam.add(tpl([gcyl('#f3ecff', 0, 3.3, 0, 0.09, 0.13, 6.6, 5), gcyl('#ffd35a', 0, 0.15, 0, 0.2, 0.28, 0.3, 6)]), X(f, r), top, Z(f, r), 0, 1); lit.add(STAR, X(f, r), top + 6.9, Z(f, r), E.ry, 1.1); poles.push([X(f, r), top + 6.5, Z(f, r)]); solid.push([f, r, 1]); }
      for (let i = 0; i < poles.length; i++) string(poles[i], poles[(i + 1) % poles.length], 1.2);
      // and two long ones from the gate towers
      const g = M.gate - L; [-1, 1].forEach((sd) => { const [f, r] = ring(SQ.r + 1.6, sd * 126); string([X(g, sd * 7.6), top + 11.5, Z(g, sd * 7.6)], [X(f, r), top + 6.5, Z(f, r)], 1.6); });
    })();

    /* ---------- who waits for her ---------- */
    (function welcome() {
      const near = (s) => s > L - 46, look = [SQ.f - 8, 0];
      const stand = (kind, opts, f, r, o) => actor(kind, opts, X(f, r), top + ((o && o.up) || 0), Z(f, r), faceTo(f, r, look[0], look[1]), Object.assign({ s: L + f, range: 320, back: 200, still: true, liveAt: 80 }, o || {}));
      // the T-rex is the biggest of them and waves with both little arms
      stand('trex', { seed: 0, size: 1.5 }, -1, -11.5, { tick(obj, dt, t, sNow) { if (near(sNow)) obj.userData.wave(1); obj.userData.cheer(sNow > L - 12); } }); solid.push([-1, -11.5, 4]);
      stand('bronto', { seed: 3, size: 1.25, leaf: false }, 3, 14.5, {}); solid.push([3, 14.5, 6]);
      stand('trike', { seed: 1 }, -14, 10, { tick(obj, dt, t, sNow) { obj.userData.cheer(sNow > L - 20); } }); solid.push([-14, 10, 3.6]);
      stand('stego', { seed: 0 }, -15, -9.8, {}); solid.push([-15, -9.8, 3.8]);
      stand('trex', { seed: 2, size: 0.7 }, 4, -7.4, { tick(obj, dt, t, sNow) { if (near(sNow)) obj.userData.wave(1); } });
      [[-11, 6.4, 0], [-7, -6.6, 1], [-3, 6.9, 2], [1, -6.3, 3], [-18, -6.6, 4], [2.5, 6.4, 5]].forEach(([f, r, seed]) => stand('baby', { seed, size: 1.25 }, f, r, { liveAt: 48, tick(obj, dt, t, sNow) { obj.userData.cheer(near(sNow)); } }));
      stand('unicorn', { seed: 0, size: 1.25 }, -8.5, 9.6, {}); stand('unicorn', { seed: 2, size: 1.25, wings: true }, -6, -9.8, {});
      solid.push([-8.5, 9.6, 2], [-6, -9.8, 2]);
      // more of them look on from between the houses
      [['stego', 2, -124, 5], ['trike', 3, 57, 5], ['bronto', 0, 21, 13], ['unicorn', 1, 124, 5], ['trex', 3, -91, 5]].forEach(([kind, seed, deg, out]) => { const [f, r] = ring(SQ.r + out, deg); crowd(kind, { seed, size: kind === 'bronto' ? 1.2 : kind === 'trex' ? 0.8 : 1 }, SK, X(f, r), top + hillAt(f, r), Z(f, r), faceTo(f, r, look[0], look[1])); solid.push([f, r, 3.5]); });
      // pterodactyls circle the palace
      const pc = kit.info.palace;
      [0, 1].forEach((i) => actor('ptero', { seed: i + 1, size: 1.5, y: 0, flap: 0.35, shadow: false }, pc.x, pc.y, pc.z, 0, { s: L, range: 300, back: 200, watch: false,
        tick(obj, dt, t) { const a = t * 0.32 + i * PI, R = 17 + i * 5; obj.position.set(pc.x + Math.cos(a) * R, pc.y - 2 + i * 5 + Math.sin(a * 2) * 1.5, pc.z + Math.sin(a) * R); obj.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)); obj.rotation.z = -0.25; } }));
    })();

    /* ---------- trees and flowers, wherever nothing stands ---------- */
    const avoid = solid.map(([f, r, rad]) => [X(f, r), Z(f, r), rad + 1.2]).concat([[X(SQ.f, 0), Z(SQ.f, 0), SQ.r + 1]]);
    plant(isl, 46, ['tree', 'palm', 'tree', 'mushroom'], { avoid, clear: 10, k1: 0.94 });
    plant(isl, 30, ['bush', 'mushroom', 'rock', 'bush'], { avoid, clear: 8 });
    plant(isl, low ? 60 : 130, ['flower'], { avoid, clear: 6.2 });
    // lanterns along the lane from the edge of the island to the gate
    for (let s = L - 58, i = 0; s < M.gate - 6; s += 9, i++) [-1, 1].forEach((sd) => { const q = P(s, sd * 6.2, 0); stampAt(POST, SK, q.x, top, q.z, q.ry + (sd > 0 ? 0 : PI), 1); const st = P(s, sd * 5.2, 0); stampAt(STAR, SK, st.x, top + 3.05, st.z, q.ry, 1.15, 'lit'); });
    return { dispose() {} };
  };
})();
