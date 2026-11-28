/* ride-sky-scene.js — what stands and lives along the sky road, stretch by stretch (called by ride-sky-world.js).
   Needs THREE, ride-kit.js, ride-sky-models.js; ride-sky-city.js adds Dinosaur City itself.

     ramp      a rainbow gate with the name of the place where the ramp leaves her street; balloons over the roofs
     clouds    a rainbow to ride under, unicorns that gallop beside her on banks of cloud, towers of cloud
     islands   floating islands with waterfalls, long-necks looking over the clouds, pterodactyls; the road
               crosses one big island (the meadow), where the slow corner is
     volcano   rainbow rings to ride through, then the road winds up round a sleepy volcano that puffs hearts
     city      star lanterns down to the gate (the city: ride-sky-city.js)

   Still things are stamped into the merged meshes of the world (kit.soupAt). Things that move are "movers":
   { s, r, obj, update(dt, t, sNow, camera, rider) } — the world only shows and moves the ones near her.
   Everything keeps ≥ 5.6 m from the middle of the road, so the game can put its own things on it. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const S = (DU.rideSky = DU.rideSky || {});
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const CLEAR = 5.6;

  S.scenery = function (kit) {
    const { T, K, DECK, L, M, PIERCE, low, C, mix, at, altAt, nearWay, soupAt, cloud, own, owned, under, above, movers } = kit;
    const mk = S.modelKit(), { gs, gcone, gcyl, sweep } = mk;
    const RAINBOW = mk.RAINBOW;
    const rnd = K.rng(8128);
    const rr = (a, b) => a + (b - a) * rnd();
    const pick = (list) => list[Math.floor(rnd() * list.length) % list.length];
    const P = (s, lat, up) => at(s, lat || 0, up || 0, {});
    const tint = (a, b, t) => '#' + new T.Color(a).lerp(new T.Color(b), t).getHexString();
    const temp = []; // template geometries: stamped many times, thrown away when the scenery is built
    const tpl = (parts) => { const g = K.merge(parts); parts.forEach((p) => p.dispose()); temp.push(g); return g; };
    const ico = (col, x, y, z, sx, sy, sz, d) => K.g(new T.IcosahedronGeometry(1, d || 0), col, x, y, z, 0, 0, 0, sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz, true);

    /* ---------- templates ---------- */
    const TREES = ['#ffb7d5', '#a9ecd0', '#cdbcff', '#ffd9a0', '#9fe08a', '#ff9fcb'].map((col) => tpl([
      K.g(new T.CylinderGeometry(0.2, 0.34, 3.0, 5, 1, true), '#cfa983', 0, 1.5, 0),
      ico(col, 0, 4.1, 0, 2.0, 1.75, 2.0, 1), ico(tint(col, '#ffffff', 0.3), 1.2, 3.3, 0.5, 1.15, 1.0, 1.15), ico(tint(col, '#7a5cc0', 0.12), -1.1, 3.2, -0.5, 1.2, 1.0, 1.2),
    ]));
    const PALMS = ['#8fe0a0', '#7fd6b8'].map((col) => {
      const parts = [sweep([[0, 0, 0], [0.35, 2.4, 0], [0.2, 4.8, 0.1]], [0.3, 0.24, 0.18], '#d9b48c', 5, 3)];
      for (let i = 0; i < 7; i++) { const leaf = gs(i % 2 ? col : tint(col, '#ffffff', 0.22), 1.25, -0.28, 0, 1.45, 0.1, 0.42, 6, 3, 0, -0.42); leaf.rotateY((i / 7) * TAU); leaf.translate(0.2, 4.95, 0.1); parts.push(leaf); }
      parts.push(gs('#ffd35a', 0.2, 4.7, 0.3, 0.2), gs('#ffd35a', 0.38, 4.66, 0.02, 0.2));
      return tpl(parts);
    });
    const MUSHROOMS = [['#ff8fb0', '#ffffff'], ['#b79cff', '#fff3b0'], ['#ffab5e', '#ffffff']].map(([cap, dot]) => {
      const parts = [gcyl('#fff6e6', 0, 0.5, 0, 0.2, 0.28, 1.0, 7), K.g(new T.SphereGeometry(1, 9, 4, 0, TAU, 0, PI * 0.5), cap, 0, 0.9, 0, 0, 0, 0, 0.85, 0.62, 0.85), gcyl('#ffe9d6', 0, 0.9, 0, 0.84, 0.84, 0.05, 9)];
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.4, e = 0.55 + (i % 2) * 0.4; parts.push(gs(dot, Math.cos(a) * Math.sin(e) * 0.8, 0.9 + Math.cos(e) * 0.58, Math.sin(a) * Math.sin(e) * 0.8, 0.13, 0.07, 0.13, 5, 3)); }
      return tpl(parts);
    });
    const BUSHES = ['#9fe08a', '#a9ecd0', '#ffc1dd'].map((col) => tpl([ico(col, 0, 0.5, 0, 0.9, 0.7, 0.9), ico(tint(col, '#ffffff', 0.25), 0.7, 0.35, 0.3, 0.6, 0.5, 0.6), ico(tint(col, '#3a8a5a', 0.12), -0.6, 0.35, -0.2, 0.62, 0.5, 0.62)]));
    const FLOWERS = ['#ff9fcb', '#ffe066', '#ffffff', '#b79cff', '#ff7b8a', '#6fb8ff'].map((col) => tpl([
      K.g(new T.ConeGeometry(0.035, 0.34, 3, 1, true), '#7fd08a', 0, 0.17, 0),
      K.g(new T.OctahedronGeometry(1), col, 0, 0.36, 0, 0, 0, 0, 0.17, 0.1, 0.17, true), K.g(new T.OctahedronGeometry(1), '#ffe066', 0, 0.43, 0, 0, 0, 0, 0.06, 0.05, 0.06, true),
    ]));
    const ROCKS = ['#cfc6f0', '#e6d2c0'].map((col) => tpl([ico(col, 0, 0.35, 0, 0.8, 0.5, 0.7), ico(tint(col, '#8f84c8', 0.25), 0.55, 0.22, 0.25, 0.45, 0.32, 0.45)]));
    const CRYSTAL = ['#9fe6ff', '#ffc1f0', '#d9c8ff'].map((col) => tpl([K.g(new T.OctahedronGeometry(1), col, 0, 0, 0, 0, 0, 0, 0.45, 1.3, 0.45, true), K.g(new T.OctahedronGeometry(1), tint(col, '#ffffff', 0.4), 0.45, -0.2, 0.2, 0, 0, 0.35, 0.28, 0.8, 0.28, true)]));
    /* a lantern on a bent post: its star glows (the star is a separate template, for the glowing mesh) */
    const POST = tpl([sweep([[0, 0, 0], [0, 2.6, 0], [0.5, 3.5, 0], [1.0, 3.3, 0]], [0.1, 0.08, 0.06, 0.05], '#f3ecff', 5, 3), gcyl('#ffd35a', 0, 0.12, 0, 0.16, 0.22, 0.24, 6)]);
    const STAR = (() => {
      const sh = new T.Shape();
      for (let i = 0; i < 10; i++) { const a = (i * PI) / 5, r = i % 2 ? 0.2 : 0.45; sh[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r); }
      sh.closePath();
      const e = new T.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1, curveSegments: 1 });
      e.translate(0, 0, -0.06);
      return tpl([K.g(e, '#ffe680')]);
    })();

    const dripGeo = tpl([gs('#ff9fcb', 0, 0, 0, 0.5, 1, 0.5, 7, 5)]); // a drop of icing
    /* a shelf of rock with grass on it: 1 m to each side (stretched when stamped), 3.5 m deep, its top at y = 0 */
    const ledgeGeo = tpl([K.g(new T.SphereGeometry(1, 10, 3, 0, TAU, PI / 2, PI / 2), '#cdbff2', 0, 0, 0, 0, 0, 0, 1, 3.5, 1, true), K.g(new T.CircleGeometry(1, 10), '#b4ea92', 0, 0, 0, -PI / 2)]);
    const heartCloud = tpl([K.g(S.heartGeo(1, 0.5), '#ffc4e0')]);
    const tplKeep = (g) => { owned.geoms.push(g); return g; };

    const stampAt = (geom, s, x, y, z, ry, sc, mat, layer) => soupAt(s, mat || 'lam', layer).add(geom, x, y, z, ry || 0, sc === undefined ? 1 : sc);
    /* someone standing still: stamped into the scenery */
    function crowd(kind, opts, s, x, y, z, ry, layer) { soupAt(s, 'lam', layer).add(S.still(kind, opts), x, y, z, ry || 0, 1); }
    /* someone alive: a model of its own, moved only while she is near. o: { s, range, back, under, watch, tick(m, dt, t, sNow, rider),
       still: true = from further than liveAt (70 m) it is shown as one still mesh, which costs a single draw } */
    function actor(kind, opts, x, y, z, ry, o) {
      const m = S.make(kind, opts), u = m.userData;
      m.position.set(x, y, z); m.rotation.y = ry || 0;
      (o.under ? under : above).add(m);
      let still = null;
      if (o.still) { still = new T.Mesh(S.still(kind, opts), K.vmat()); still.position.copy(m.position); still.rotation.y = m.rotation.y; still.visible = false; still.name = 'still-' + kind; (o.under ? under : above).add(still); }
      const mv = { s: o.s, r: o.range || 230, back: o.back || 50, under: !!o.under, obj: m, still, liveAt: o.liveAt,
        update(dt, t, sNow, cam, rider) { if (o.tick) o.tick(m, dt, t, sNow, rider, mv); if (o.watch !== false) u.look(rider.x, rider.y, rider.z); u.update(dt, t); } };
      m.visible = false;
      movers.push(mv);
      return m;
    }
    const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z); // the turn that makes +Z of something at `from` look at `to`
    /* a plate with words on it. If the game font was not there yet when the world was built, the plates are drawn again when it is */
    const fontThere = !document.fonts || !document.fonts.check || document.fonts.check('700 40px Fredoka', 'אב'), signs = [];
    function sign(text, opts, parent, x, y, z, ry) {
      let m = null;
      const draw = () => { if (m) { parent.remove(m); m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); } m = K.sign(text, opts); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); };
      draw(); signs.push(draw);
    }
    /* a place beside the road for something r metres wide: s metres along, lat to the side, up above the road there.
       The road winds and passes over itself, so the place is pushed further out until no part of the road is under or over it. */
    function spot(s, lat, up, r) {
      let q = P(s, lat, up);
      for (let i = 0; i < 6 && nearWay(q.x, q.z, PIERCE, L + 40).d < r + 9; i++) { lat += Math.sign(lat) * 14; q = P(s, lat, up); }
      return q;
    }

    /* ---------- a floating island ----------
       A flat grassy top at height `top`, a ragged rim, and rock hanging below it. → { cx, cz, top, r, rim(angle) } */
    function island(sKey, cx, top, cz, r, o) {
      o = o || {};
      const soup = soupAt(sKey, 'lam', o.layer), q = K.rng(o.seed || Math.abs(Math.round(cx * 7 + cz * 13)) + 3);
      const SEG = o.seg || (r > 40 ? 34 : r > 24 ? 26 : r > 12 ? 18 : 12), depth = o.depth || clamp(top - DECK - 3, r * 0.5, r * 1.05);
      const p1 = q() * TAU, p2 = q() * TAU, wob = o.wobble === undefined ? 1 : o.wobble;
      const rimA = (a) => r * (1 + wob * (0.09 * Math.sin(2 * a + p1) + 0.06 * Math.sin(3 * a + p2) + 0.03 * Math.sin(7 * a + p1 * 3)));
      const g1 = C(o.grass || '#b4ea92'), g2 = C(o.grass2 || '#9be088'), earth = C(o.earth || '#f0cfa6'), rock1 = C(o.rock || '#cdbff2'), rock2 = C(o.rock2 || '#a79adf');
      const top3 = (i, k) => { const a = (i / SEG) * TAU, d = rimA(a) * k; return [cx + Math.cos(a) * d, top, cz + Math.sin(a) * d]; };
      const KS = r > 24 ? [0, 0.4, 0.72, 0.9, 1] : [0, 0.62, 1];
      for (let i = 0; i < SEG; i++) for (let j = 0; j + 1 < KS.length; j++) {
        const a = top3(i, KS[j]), b = top3(i + 1, KS[j]), c = top3(i + 1, KS[j + 1]), d = top3(i, KS[j + 1]);
        const col = mix(g1, g2, ((j + (i & 1) * 0.6) / KS.length) * 0.9 + q() * 0.1);
        if (j === 0) soup.tri(a, c, d, col); else soup.quad(a, b, c, d, col);
      }
      // the rock under it: rings that narrow to a point, each corner pushed about a little
      const PROF = [[1, 0], [0.985, -0.045], [0.84, -0.3], [0.56, -0.6], [0.26, -0.86], [0, -1]];
      const ring = PROF.map((pr, j) => { const row = []; for (let i = 0; i < SEG; i++) { const a = (i / SEG) * TAU, d = rimA(a) * pr[0] * (j > 1 && j < 5 ? 0.86 + q() * 0.28 : 1); row.push([cx + Math.cos(a) * d, top + pr[1] * depth * (j > 1 ? 0.9 + q() * 0.2 : 1), cz + Math.sin(a) * d]); } return row; });
      for (let j = 0; j + 1 < PROF.length; j++) for (let i = 0; i < SEG; i++) {
        const A = ring[j][i], B = ring[j][(i + 1) % SEG], Cc = ring[j + 1][(i + 1) % SEG], D = ring[j + 1][i];
        const col = j === 0 ? mix(g2, C('#7fcf78'), 0.4) : j === 1 ? mix(earth, rock1, q() * 0.35) : mix(rock1, rock2, clamp((j - 2) / 2.5 + q() * 0.3, 0, 1));
        if (j === PROF.length - 2) soup.tri(A, B, Cc, col); else soup.quad(A, B, Cc, D, col);
      }
      // crystals hang from the bigger ones
      if (r > 9 && !o.plain) for (let i = 0; i < Math.round(r / 5); i++) { const a = q() * TAU, d = r * (0.25 + q() * 0.4); soupAt(sKey, 'lit', o.layer).add(CRYSTAL[i % 3], cx + Math.cos(a) * d, top - depth * (0.55 + q() * 0.2), cz + Math.sin(a) * d, q() * 6, 1.2 + q() * 1.6); }
      return { cx, cz, top, r, sKey, layer: o.layer, rim: rimA, at: (a, k) => [cx + Math.cos(a) * rimA(a) * k, cz + Math.sin(a) * rimA(a) * k] };
    }
    /* things growing on an island: n tries, each a random spot that is clear of the road */
    function plant(isl, n, kinds, o) {
      o = o || {};
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, k = Math.sqrt(rr(o.k0 || 0, (o.k1 || 0.9) ** 2)), [x, z] = isl.at(a, k);
        if (o.road !== false && isl.road) { const w = nearWay(x, z, isl.road[0], isl.road[1]); if (w.d < (o.clear || CLEAR + 1.4)) continue; }
        if (o.avoid && o.avoid.some((v) => Math.hypot(x - v[0], z - v[1]) < v[2])) continue;
        const kind = pick(kinds), sc = rr(0.8, 1.25) * (o.scale || 1);
        const list = { tree: TREES, palm: PALMS, mushroom: MUSHROOMS, bush: BUSHES, flower: FLOWERS, rock: ROCKS }[kind];
        stampAt(pick(list), isl.sKey, x, isl.top + (isl.height ? isl.height(x, z) : 0), z, rnd() * TAU, kind === 'flower' ? rr(0.9, 1.6) : kind === 'mushroom' ? rr(0.7, 1.7) * (o.scale || 1) : sc, 'lam', isl.layer);
        out.push([x, z]);
      }
      return out;
    }

    /* small islands beside the road, with what grows on them. list: [s, lat, up, radius, waterfall?] → where each one is */
    function isles(list, seed, look) {
      return list.map(([s, lat, up, r, fall], i) => {
        const q = spot(s, lat, up, r), il = island(s, q.x, q.y, q.z, r, Object.assign({ seed: seed + i }, look));
        plant(il, Math.round(r * 0.55), ['tree', 'palm', 'tree', 'mushroom'], { road: false, k1: 0.8 });
        plant(il, Math.round(r * 0.8), ['flower', 'bush', 'flower', 'rock'], { road: false });
        // its waterfall pours off the side that faces the road
        if (fall) { const a = Math.atan2(-q.nz * Math.sign(lat), -q.nx * Math.sign(lat)) + rr(-0.5, 0.5), e = il.at(a, 0.98); waterfall(s, e[0], q.y, e[1], Math.cos(a), Math.sin(a), r * 0.16 + 1); }
        return q;
      });
    }

    /* ---------- water ---------- */
    const waterTex = K.canvasTex(64, 128, (ctx) => {
      ctx.fillStyle = '#8fdcf4'; ctx.fillRect(0, 0, 64, 128);
      const q = K.rng(5);
      for (let i = 0; i < 26; i++) { const x = q() * 64, y = q() * 128, h = 22 + q() * 50; ctx.fillStyle = i % 3 ? 'rgba(255,255,255,.55)' : 'rgba(205,244,255,.9)'; for (let k = -1; k <= 1; k++) ctx.fillRect(x, y + k * 128, 2 + q() * 4, h); }
    }, { repeat: true });
    const waterMat = own(new T.MeshBasicMaterial({ map: waterTex, vertexColors: true, side: T.DoubleSide }));
    const water = { p: [], uv: [], c: [] };
    /* a waterfall from the lip at x, y, z, pouring out along dx, dz, w metres wide, down into the sea of clouds */
    function waterfall(sKey, x, y, z, dx, dz, w, layer) {
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const drop = y - (DECK - 1), out = 2.5 + drop * 0.1, N = 8, nx = -dz * w / 2, nz = dx * w / 2;
      const pt = (i) => { const t = i / N; return [x + dx * out * t, y - drop * t * t, z + dz * out * t, (drop * t * t + out * t) / 7]; };
      for (let i = 0; i < N; i++) {
        const a = pt(i), b = pt(i + 1), fa = i / N > 0.75 ? 1 : 0.9, fb = (i + 1) / N > 0.75 ? 1 : 0.9, wa = 1 + (i / N) * 0.35, wb = 1 + ((i + 1) / N) * 0.35;
        [[a, -wa, 0, fa], [a, wa, 1, fa], [b, wb, 1, fb], [a, -wa, 0, fa], [b, wb, 1, fb], [b, -wb, 0, fb]].forEach(([q, sd, u, f]) => { water.p.push(q[0] + nx * sd, q[1], q[2] + nz * sd); water.uv.push(u * Math.max(1, Math.round(w / 3)), q[3]); water.c.push(f, f, 1); });
      }
      // the stream on the island that feeds it, and the foam where it lands
      const pond = soupAt(sKey, 'lit', layer), wc = C('#9fe4f6'), bx = x - dx * 0.2, bz = z - dz * 0.2, ex = x - dx * w * 1.6, ez = z - dz * w * 1.6;
      pond.quad([bx + nx, y + 0.05, bz + nz], [bx - nx, y + 0.05, bz - nz], [ex - nx * 0.6, y + 0.05, ez - nz * 0.6], [ex + nx * 0.6, y + 0.05, ez + nz * 0.6], wc);
      for (let i = 0; i < 8; i++) { const a0 = (i / 8) * TAU, a1 = ((i + 1) / 8) * TAU, r = w * 0.62; pond.tri([ex, y + 0.05, ez], [ex + Math.cos(a1) * r, y + 0.05, ez + Math.sin(a1) * r], [ex + Math.cos(a0) * r, y + 0.05, ez + Math.sin(a0) * r], wc); } // the spring it comes from
      const f = pt(N);
      cloud(soupAt(sKey, 'lit', 'above'), f[0], DECK + 0.4, f[2], 8 + w * 1.6, rnd, 'half', sKey, 0.5);
    }
    /* a round pond on an island (with lily pads) */
    function pond(isl, x, z, r) {
      const soup = soupAt(isl.sKey, 'lit', isl.layer), c1 = C('#9fe4f6'), c2 = C('#c8f3fb'), N = 14, y = isl.top + 0.06;
      for (let i = 0; i < N; i++) { const a = (i / N) * TAU, b = ((i + 1) / N) * TAU, k = (i) => 1 + 0.12 * Math.sin(i * 2.4); soup.tri([x, y, z], [x + Math.cos(b) * r * k(i + 1), y, z + Math.sin(b) * r * k(i + 1)], [x + Math.cos(a) * r * k(i), y, z + Math.sin(a) * r * k(i)], c2, c1, c1); }
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.5, d = r * (0.3 + (i % 2) * 0.3); stampAt(tpl([gcyl('#8fe0a0', 0, 0, 0, 0.5, 0.5, 0.04, 7), gs('#ffb7d5', 0.1, 0.1, 0, 0.14, 0.1, 0.14, 5, 3)]), isl.sKey, x + Math.cos(a) * d, y + 0.03, z + Math.sin(a) * d, a, 1, 'lam', isl.layer); }
    }

    /* a rainbow: half a ring of six bands standing on (cx, cy, cz), radius R, its plane turned by ry */
    function rainbow(sKey, cx, cy, cz, R, ry, o) {
      o = o || {};
      const soup = soupAt(sKey, 'lit', o.layer), SEG = o.seg || 18, W = o.w || R * 0.045, ex = Math.cos(ry), ez = -Math.sin(ry), a0 = o.from || 0, a1 = o.to === undefined ? PI : o.to;
      for (let j = 0; j < 6; j++) {
        const ro = R + (3 - j) * W, ri = ro - W, col = C(RAINBOW[j]);
        for (let i = 0; i < SEG; i++) {
          const a = a0 + ((a1 - a0) * i) / SEG, b = a0 + ((a1 - a0) * (i + 1)) / SEG;
          const pt = (ang, r) => [cx + ex * Math.cos(ang) * r, cy + Math.sin(ang) * r, cz + ez * Math.cos(ang) * r];
          const p0 = pt(a, ri), p1 = pt(a, ro), p2 = pt(b, ro), p3 = pt(b, ri);
          soup.quad(p0, p1, p2, p3, col); soup.quad(p1, p0, p3, p2, col); // seen from both sides
        }
      }
    }
    /* a tower of cloud rising out of the sea */
    function tower(s, x, z, h, w) {
      const soup = soupAt(s, 'lit', 'above'), n = Math.max(2, Math.round(h / (w * 0.22)));
      for (let k = 0; k < n; k++) { const f = k / (n - 1); cloud(soup, x + rr(-1, 1) * w * 0.12, DECK + f * h, z + rr(-1, 1) * w * 0.12, w * (1 - 0.55 * f * f), rnd, 'full', s, 0.62); }
    }

    /* ---------- cushions of cloud under the road, all along the sky: it lies on them ---------- */
    const onLand = []; // [s0, s1]: where the road runs over an island (no cushions there)
    function cushions() {
      const soup = (s) => soupAt(s, 'lit', kit.layerOf(s));
      for (let s = PIERCE + 26; s < L - 70; s += 21 + rnd() * 6) {
        if (onLand.some((q) => s > q[0] - 6 && s < q[1] + 6)) continue;
        const p = P(s, rr(-1.5, 1.5), 0);
        const w = 14 + rnd() * 4;
        cloud(soup(s), p.x, p.y - 2.3, p.z, w, rnd, 'full', s, 1.25 / (w * 0.58), 2); // never thicker than 1.25 m: it stays under the road
        // and a tuft or two peeping over the rim
        const sd = rnd() < 0.5 ? -1 : 1, e = P(s + rr(3, 9), sd * rr(6.1, 7.4), 0);
        cloud(soup(s), e.x, e.y - 0.9, e.z, rr(3, 4.2), rnd, 'full', s, 0.5, 1);
      }
    }

    /* ============================ the ramp ============================ */
    (function ramp() {
      // the gate at the foot of the ramp: a rainbow standing on two clouds, the name of the place above it
      const g = P(M.lift - 2, 0, 0), ry = g.ry;
      rainbow(M.lift, g.x, 0.4, g.z, 5.5, ry, { layer: 'under', w: 0.24, seg: 16 });
      [-1, 1].forEach((sd) => { const q = P(M.lift - 2, sd * 5.5, 0); cloud(soupAt(M.lift, 'lit', 'under'), q.x, 0.55, q.z, 3.6, rnd, 'full', 0, 0.6); });
      sign('עיר הדינוזאורים', { h: 1.0, bg: '#ffffff', fg: '#ff5fa2', border: '#ffd35a', pad: 0.5, double: true }, under, g.x, 7.25, g.z, ry + PI); // it reads from where she comes
      stampAt(STAR, M.lift, g.x, 8.35, g.z, ry, 1.6, 'lit', 'under');
      // puffs of cloud along the first metres, so the rainbow seems to grow out of a cloud lying on her street
      for (let i = 0; i < 6; i++) { const sd = i % 2 ? 1 : -1, q = P(M.lift + 3 + i * 3.2, sd * rr(5.2, 5.8), 0); cloud(soupAt(M.lift, 'lit', 'under'), q.x, 0.25 + q.y * 0.6, q.z, rr(1.8, 2.8), rnd, 'full', 0, 0.6); }
      // balloons drifting over the roofs
      [[190, -24, 5, 1, 0], [292, 27, 9, 1.25, 1], [372, -30, 3, 1.1, 2]].forEach(([s, lat, up, size, seed]) => { const q = P(s, lat, up); actor('hotair', { seed, size }, q.x, q.y, q.z, rnd() * 6, { s, under: true, range: 320, back: 120, watch: false }); });
    })();

    /* ============================ the sea of clouds ============================ */
    (function clouds() {
      const Z0 = PIERCE + 70, Z1 = M.islands - 30;
      // a rainbow to ride under, as she comes out of the cloud
      const g = P(PIERCE + 96, 0, 0);
      rainbow(PIERCE + 96, g.x, g.y - 6, g.z, 15, g.ry, { w: 0.62, seg: 22 });
      [-1, 1].forEach((sd) => { const q = P(PIERCE + 96, sd * 15, 0); cloud(soupAt(PIERCE + 96, 'lit', 'above'), q.x, q.y - 5.5, q.z, 9, rnd, 'full', PIERCE + 96, 0.6); });
      // banks of cloud on both sides: the unicorns gallop on them
      for (let s = Z0 - 20; s < Z1 + 14; s += 7) [-1, 1].forEach((sd) => { const w = rr(6, 7.5), q = P(s, sd * rr(8.9, 9.8), 0); cloud(soupAt(s, 'lit', 'above'), q.x, q.y - 1.5, q.z, w, rnd, 'full', s, 1.15 / (w * 0.58), 2); });
      // four unicorns keep her company: each has its place beside her and drifts a little ahead and behind
      [[12, -1, 7.9, 0, false], [25, 1, 8.2, 1, false], [7, 1, 7.7, 3, true], [34, -1, 8.4, 2, false]].forEach(([off, sd, lat, seed, wings], i) => {
        const s0 = Z0 + off, s1 = Z1 - 26 + off * 0.5;
        let us = s0, prev = s0;
        const m = actor('unicorn', { seed, wings, size: 1.3 }, 0, 0, 0, 0, { s: s0, range: 300, back: 90, watch: false,
          tick(obj, dt, t, sNow, rider, mv) {
            const want = clamp(sNow + off + Math.sin(t * 0.45 + i * 1.9) * 5, s0, s1);
            us = damp(us, want, 3, dt);
            const v = (us - prev) / Math.max(dt, 1e-4); prev = us; mv.s = us;
            const q = at(us, sd * lat, 0.12, tmpP);
            obj.position.set(q.x, q.y, q.z); obj.rotation.set(-q.pitch, q.ry, 0);
            if (v > 0.4) { obj.userData.gallop(dt, v); obj.userData.look(); } else obj.userData.look(rider.x, rider.y, rider.z); // standing, it watches her
          } });
        m.rotation.order = 'YXZ';
      });
      // towers of cloud; two of them make a gate where the road dips
      [[590, -62, 46, 34], [640, 70, 60, 40], [700, -19, 20, 15], [712, 20, 24, 16], [760, -80, 52, 38], [820, 66, 40, 30], [850, -120, 70, 44], [560, 130, 58, 40]].forEach(([s, lat, h, w]) => { const q = spot(s, lat, 0, w * 0.4); tower(s, q.x, q.z, h, w); });
      // rainbows far over the sea
      [[600, 150, 80, 0.7], [720, -170, 100, -0.5], [830, 190, 70, 0.2]].forEach(([s, lat, R, turn]) => { const q = P(s, lat, 0); rainbow(s, q.x, DECK - 6, q.z, R, q.ry + turn, { seg: 24 }); });
      [[640, -30, 10, 1.3, 3], [800, 30, 14, 1.2, 5]].forEach(([s, lat, up, size, seed]) => { const q = P(s, lat, up); actor('hotair', { seed, size }, q.x, q.y, q.z, rnd() * 6, { s, range: 420, back: 90, watch: false }); });
    })();

    /* ============================ the islands ============================ */
    const tmpP = {};
    (function islands() {
      const SK = M.corner + 12;
      // the meadow: the road crosses it, and turns on it
      const c = P(M.corner + 12, 13, 0), top = altAt(M.corner + 12) - 0.1;
      const isl = island(SK, c.x, top, c.z, 43, { seed: 11, wobble: 0.7 });
      // where is the road on it?
      let in0 = 0, in1 = 0;
      for (let s = M.corner - 80; s < M.corner + 110; s += 2) { const q = P(s, 0, 0), a = Math.atan2(q.z - c.z, q.x - c.x), inside = Math.hypot(q.x - c.x, q.z - c.z) < isl.rim(a) - 1.5; if (inside && !in0) in0 = s; if (inside) in1 = s; }
      isl.road = [in0 - 10, in1 + 10]; onLand.push([in0, in1]);
      kit.info.meadow = { s0: in0, s1: in1 };
      // the pond inside the bend, a stream from it to the edge, and the waterfall
      const pd = P(M.corner + 12, 24, 0), ang = Math.atan2(pd.z - c.z, pd.x - c.x), edge = isl.at(ang, 0.985);
      pond(isl, pd.x, pd.z, 6.5);
      waterfall(SK, edge[0], top, edge[1], Math.cos(ang), Math.sin(ang), 4.2);
      const sx = Math.sin(ang), sz = -Math.cos(ang), yw = top + 0.05; // across the stream
      soupAt(SK, 'lit').quad([pd.x + sx * 1.6, yw, pd.z + sz * 1.6], [pd.x - sx * 1.6, yw, pd.z - sz * 1.6], [edge[0] - sx * 1.3, yw, edge[1] - sz * 1.3], [edge[0] + sx * 1.3, yw, edge[1] + sz * 1.3], C('#9fe4f6'));
      const avoid = [[pd.x, pd.z, 8.5]];
      // who lives here. The long-neck stands where the road points before the bend, so she rides straight at it.
      const lb = P(M.corner + 6, -17, 0), look = P(M.corner - 6, 0, 0);
      actor('bronto', { seed: 1, size: 1.75, leaf: true }, lb.x, top, lb.z, facing(lb, look), { s: M.corner, range: 420, back: 80, still: true, liveAt: 110 });
      avoid.push([lb.x, lb.z, 9]);
      const tk = P(in0 + 16, 10.5, 0); actor('trike', { seed: 0, size: 1.05 }, tk.x, top, tk.z, facing(tk, P(in0 + 4, 0, 0)), { s: in0 + 16, still: true }); avoid.push([tk.x, tk.z, 4.5]);
      [[in0 + 22, 8.2, 2], [in0 + 11, 7.4, 4], [in0 + 25, 12.6, 1]].forEach(([s, lat, seed]) => { const q = P(s, lat, 0); actor('baby', { seed, size: 1.15 }, q.x, top, q.z, facing(q, P(s - 8, 0, 0)), { s, still: true, liveAt: 55, tick(obj, dt, t, sNow) { obj.userData.cheer(Math.abs(sNow - s) < 16); } }); });
      const sg = P(in1 - 24, -9.5, 0); actor('stego', { seed: 2 }, sg.x, top, sg.z, facing(sg, P(in1 - 34, 0, 0)), { s: in1 - 24, still: true }); avoid.push([sg.x, sg.z, 5]);
      const rx = P(in1 - 12, 9.5, 0); actor('trex', { seed: 0, size: 0.8 }, rx.x, top, rx.z, facing(rx, P(in1 - 22, 0, 0)), { s: in1 - 12, still: true, tick(obj, dt, t, sNow) { if (Math.abs(sNow - (in1 - 24)) < 14) obj.userData.wave(1); } }); avoid.push([rx.x, rx.z, 3.5]);
      // nests beside the road
      [[in0 + 7, -7.4], [M.corner + 26, 7.6], [in1 - 7, -7.2]].forEach(([s, lat], i) => {
        const q = P(s, lat, 0);
        for (let k = 0; k < 3; k++) { const a = k * 2.1 + i, d = k ? 1 : 0; soupAt(SK, 'lam').add(S.eggGeo(i + k, k === 0), q.x + Math.cos(a) * d, top, q.z + Math.sin(a) * d, a, k === 0 ? 1.15 : 0.85); }
        avoid.push([q.x, q.z, 2.2]);
      });
      plant(isl, 26, ['tree', 'tree', 'palm'], { k0: 0.35, avoid, clear: 9 });
      plant(isl, 16, ['mushroom', 'bush', 'rock', 'bush'], { avoid });
      plant(isl, low ? 50 : 110, ['flower'], { avoid, clear: CLEAR });

      // small islands all around, some with waterfalls; on two of them somebody stands and looks at the road
      const list = [[888, -36, 5, 13, 1], [932, 44, -7, 17, 1], [968, -58, 9, 12], [1004, 36, 3, 9], [1128, -44, 7, 15, 1], [1158, 40, -4, 12, 1], [905, 110, 16, 24, 1], [1010, -130, 4, 28], [1090, 150, 12, 22, 1], [960, 190, -6, 30], [1150, -150, 18, 20]];
      const where = isles(list, 40);
      [[1, 'stego', 1], [4, 'trike', 2]].forEach(([i, kind, seed]) => { const q = where[i]; crowd(kind, { seed }, list[i][0], q.x, q.y, q.z, facing(q, P(list[i][0], 0, 0))); });
      // long-necks standing in the sea of clouds: only their necks and heads come up beside the road, and they watch her pass
      [[906, 1, 3.5, 0], [986, -1, 3.8, 2], [1146, 1, 3.4, 3]].forEach(([s, sd, sc, seed]) => {
        const hd = P(s, sd * 12.5, 0), feet = P(s, sd * (12.5 + 3.25 * sc), 0), y = hd.y + 1.6 - 7.3 * sc;
        actor('bronto', { seed, size: sc }, feet.x, y, feet.z, facing(feet, hd), { s, range: 520, back: 120, still: true, liveAt: 120 });
        cloud(soupAt(s, 'lit', 'above'), feet.x, DECK + 0.5, feet.z, 30, rnd, 'full', s, 0.3);
      });
      // pterodactyls gliding in wide circles over the road
      [[900, 14, 44, 11, 0, 1.5], [958, -20, 38, 15, 1, 1.3], [1020, 30, 50, 12, 2, 1.7], [1120, -10, 42, 13, 0, 1.4], [1160, 24, 36, 17, 1, 1.2]].forEach(([s, lat, R, up, seed, size], i) => {
        const c0 = P(s, lat, up), dir = i % 2 ? 1 : -1;
        actor('ptero', { seed, size, y: 0, flap: 0.3, shadow: false }, c0.x, c0.y, c0.z, 0, { s, range: 360, back: 90, watch: false,
          tick(obj, dt, t) { const a = dir * (t * (9 / R) + i * 1.7); obj.position.set(c0.x + Math.cos(a) * R, c0.y + Math.sin(a * 2 + i) * 2.2, c0.z + Math.sin(a) * R * 0.8); obj.rotation.y = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * 0.8 * dir); obj.rotation.z = -dir * 0.22; } });
      });
    })();

    /* ============================ the volcano ============================ */
    (function volcano() {
      // its middle is the middle of the turn of the road
      let cx = 0, cz = 0, n = 0;
      const R0 = 300 / ((330 * PI) / 180);
      for (let s = M.spiral + 30; s < M.city - 30; s += 6) { const q = P(s, -R0, 0); cx += q.x; cz += q.z; n++; }
      cx /= n; cz /= n;
      const y0 = DECK - 5, yTop = altAt(M.city) + 8, SK = M.spiral + 150;
      kit.info.volcano = { x: cx, z: cz, top: yTop };
      const soup = soupAt(SK, 'lam'), glow = soupAt(SK, 'lit'), q = K.rng(606);
      const PROF = [[0, 45.5], [0.14, 44.5], [0.3, 43], [0.46, 41.2], [0.62, 38.6], [0.78, 35], [0.92, 30], [1, 26.5]], SEG = 26, RIM = 26.5;
      const radAt = (f) => { let i = 0; while (i < PROF.length - 2 && f > PROF[i + 1][0]) i++; const A = PROF[i], B = PROF[i + 1]; return A[1] + (B[1] - A[1]) * clamp((f - A[0]) / (B[0] - A[0]), 0, 1); };
      const ring = PROF.map(([f, r], j) => { const row = []; for (let i = 0; i < SEG; i++) { const a = (i / SEG) * TAU, d = r * (j === 0 || j === PROF.length - 1 ? 1 : 0.95 + q() * 0.1); row.push([cx + Math.cos(a) * d, y0 + f * (yTop - y0), cz + Math.sin(a) * d]); } return row; });
      const body = [C('#b7a0ea'), C('#c9a8ec'), C('#e3b0e6'), C('#f6bfe0')];
      for (let j = 0; j + 1 < PROF.length; j++) for (let i = 0; i < SEG; i++) {
        const f = (j + q() * 0.9) / (PROF.length - 1) * 3, k = Math.min(2, Math.floor(f));
        soup.quad(ring[j][i], ring[j + 1][i], ring[j + 1][(i + 1) % SEG], ring[j][(i + 1) % SEG], mix(body[k], body[k + 1], f - k));
      }
      // the rim: pink icing that runs down its sides, and a warm glow inside
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * TAU, a1 = ((i + 1) / SEG) * TAU, top = ring[PROF.length - 1];
        glow.tri([cx, yTop - 3.5, cz], top[(i + 1) % SEG], top[i], C('#ffd0e8'), C('#ff9fcb'), C('#ff9fcb'));
        const am = (a0 + a1) / 2, len = 5 + q() * 9, w = 3.4 + q() * 1.6;
        for (let k = 0; k < 3; k++) { const f = 1 - ((k + 0.5) / 3) * (len / (yTop - y0)), r = radAt(f) + 0.15; soup.add(dripGeo, cx + Math.cos(am) * r, y0 + f * (yTop - y0), cz + Math.sin(am) * r, -am + PI / 2, w * (1 - k * 0.22), len / 3 * 0.75, 1.1); }
        soup.add(dripGeo, cx + Math.cos(am) * (RIM - 0.2), yTop + 0.1, cz + Math.sin(am) * (RIM - 0.2), -am + PI / 2, 7.2, 1.5, 3.2);
      }
      // its face: asleep and smiling, turned to where she comes from
      const from = P(M.rings + 30, 0, 0), fa = Math.atan2(from.z - cz, from.x - cx), INKV = '#7a56b8';
      const onFlank = (da, f, out) => { const a = fa + da, r = radAt(f) + (out || 0.5); return [cx + Math.cos(a) * r, y0 + f * (yTop - y0), cz + Math.sin(a) * r]; };
      const arc = (da0, da1, f0, dip, r) => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(onFlank(da0 + (da1 - da0) * t, f0 - dip * Math.sin(t * PI), 0.6)); } return sweep(pts, pts.map((_, i) => r * (i === 0 || i === 6 ? 0.55 : 1)), INKV, 5, 2); };
      const face = [arc(-0.27, -0.08, 0.64, 0.04, 0.5), arc(0.08, 0.27, 0.64, 0.04, 0.5), arc(-0.11, 0.11, 0.5, 0.04, 0.45)];
      [-0.35, 0.35].forEach((da) => { const p = onFlank(da, 0.52, 0.1), g = gs('#ff9fcb', p[0], p[1], p[2], 2.8, 2.1, 2.8, 8, 5); face.push(g); });
      soup.add(tpl(face), 0, 0, 0, 0, 1);
      // hearts rise out of it, grow, and melt away
      const HN = low ? 9 : 14, hearts = new T.InstancedMesh(tplKeep(K.g(S.heartGeo(1, 0.5), '#ff9fcb')), own(new T.MeshLambertMaterial({ color: '#ffffff', vertexColors: true, emissive: new T.Color('#ff5fa2'), emissiveIntensity: 0.45 })), HN);
      hearts.frustumCulled = false; hearts.visible = false; above.add(hearts);
      const dummy = new T.Object3D();
      movers.push({ s: M.spiral + 120, r: 520, back: 400, obj: hearts, update(dt, t, sNow, cam) {
        for (let i = 0; i < HN; i++) {
          const p = (t * 0.085 + i / HN) % 1, w = i * 2.4, rise = p * 52;
          dummy.position.set(cx + Math.sin(t * 0.5 + w) * (6 + p * 12) + p * 9, yTop - 2 + rise, cz + Math.cos(t * 0.4 + w * 1.3) * (6 + p * 12));
          dummy.scale.setScalar((1.2 + p * 4.2) * Math.min(1, p * 8) * Math.min(1, (1 - p) * 5));
          dummy.rotation.set(0, cam ? Math.atan2(cam.position.x - dummy.position.x, cam.position.z - dummy.position.z) + Math.sin(t + w) * 0.4 : 0, Math.sin(t * 0.9 + w) * 0.2);
          dummy.updateMatrix(); hearts.setMatrixAt(i, dummy.matrix);
        }
        hearts.instanceMatrix.needsUpdate = true;
      } });
      // ledges on its side, level with the road, where somebody sits and watches her go round: the higher, the more room
      [[62, 'baby', 0], [150, 'trike', 1], [232, 'stego', 3], [300, 'trex', 1]].forEach(([deg, who, seed], i) => {
        const s = M.spiral + (deg / 330) * 300, rd = P(s, 0, 0), a = Math.atan2(rd.z - cz, rd.x - cx), y = rd.y - 0.2, rIn = radAt((y - y0) / (yTop - y0)) - 2, rOut = R0 - CLEAR + 0.6;
        const wd = rOut - rIn, mid = (rIn + rOut) / 2;
        soup.add(ledgeGeo, cx + Math.cos(a) * mid, y, cz + Math.sin(a) * mid, -a, wd / 2 + 0.2, 1, 8.5);
        const pr = Math.max(rIn + 3.4, rOut - 3.6), px = cx + Math.cos(a) * pr, pz = cz + Math.sin(a) * pr, ahead = P(s - 9, 0, 0), ry = Math.atan2(ahead.x - px, ahead.z - pz);
        if (who === 'baby') [0, 1, 2].forEach((k) => {
          const bx = cx + Math.cos(a + (k - 1) * 0.045) * (rOut - 1.6), bz = cz + Math.sin(a + (k - 1) * 0.045) * (rOut - 1.6);
          actor('baby', { seed: seed + k * 2, size: 1.2 }, bx, y, bz, Math.atan2(ahead.x - bx, ahead.z - bz), { s, still: true, liveAt: 55, tick(obj, dt, t, sNow) { obj.userData.cheer(Math.abs(sNow - s) < 22); } });
        });
        else actor(who, { seed, size: who === 'trex' ? 0.95 : 0.9 }, px, y, pz, ry, { s, still: true, tick(obj, dt, t, sNow) { if (who === 'trex' && Math.abs(sNow - s + 8) < 14) obj.userData.wave(1); } });
        if (wd > 7) { stampAt(i % 2 ? PALMS[0] : TREES[i], SK, cx + Math.cos(a + 0.13) * (rIn + 2.6), y, cz + Math.sin(a + 0.13) * (rIn + 2.6), i, 1.1); stampAt(MUSHROOMS[i % 3], SK, cx + Math.cos(a - 0.13) * (rIn + 3), y, cz + Math.sin(a - 0.13) * (rIn + 3), 0, 1.5); }
        soupAt(SK, 'lam').add(S.eggGeo(i, true), cx + Math.cos(a - 0.12) * (rOut - 1.5), y, cz + Math.sin(a - 0.12) * (rOut - 1.5), 0, 1);
      });
      // rainbow rings over the straight before it: she rides through them
      for (let i = 0; i < 5; i++) {
        const s = M.rings + 24 + i * 20, g = P(s, 0, 0);
        const m = actor('ring', { size: 5, cy: 0.92, seed: i }, g.x, g.y, g.z, g.ry, { s, range: 420, back: 30, watch: false });
        m.rotation.order = 'YXZ'; m.rotation.x = -g.pitch;
        kit.gates.push({ s, obj: m });
      }
      // hearts of cloud float round about, and a few islands
      [[1230, -60, 14, 6], [1345, 75, 26, 7], [1440, 90, 22, 6], [1520, 85, 40, 8], [1600, -70, 16, 6]].forEach(([s, lat, up, size]) => { const g = spot(s, lat, up, size * 1.5); soupAt(s, 'lam').add(heartCloud, g.x, g.y, g.z, facing(g, P(s - 70, 0, 0)), size); });
      isles([[1215, 48, -8, 14], [1380, 60, -12, 18], [1470, 75, 6, 13]], 70, { grass: '#a6e6c0', grass2: '#8fdcb0' });
    })();

    /* ============================ down to the city ============================ */
    (function glide() {
      const end = L - 64;
      for (let s = M.city + 14, i = 0; s < end; s += 15, i++) {
        const sd = i % 2 ? 1 : -1, q = P(s, sd * 4.72, 0);
        stampAt(POST, s, q.x, q.y + 0.2, q.z, q.ry + (sd > 0 ? 0 : PI), 1); // it stands on the rim and bends over the road
        const st = P(s, sd * 3.72, 3.0); stampAt(STAR, s, st.x, st.y, st.z, q.ry, 1.15, 'lit');
      }
      // sparks of light drift round the last stretch and over the city, like fireflies at dusk: one cloud of points
      const pos = [], q0 = K.rng(404), N = low ? 110 : 220;
      for (let i = 0; i < N; i++) { const s = M.city + 20 + q0() * (L + 30 - M.city), far = s > L - 60, q = P(Math.min(s, L), (q0() < 0.5 ? -1 : 1) * (far ? 2 + q0() * 34 : 5.5 + q0() * 16), (far ? 2.5 : 0.8) + q0() * (far ? 14 : 7)); pos.push(q.x + (s > L ? q.tx * (s - L) : 0), q.y, q.z + (s > L ? q.tz * (s - L) : 0)); }
      const fg = new T.BufferGeometry();
      fg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      owned.geoms.push(fg);
      const fm = own(new T.PointsMaterial({ size: 0.55, sizeAttenuation: true, map: kit.discTex, color: '#fff3b0', transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }));
      const flies = new T.Points(fg, fm);
      flies.visible = false; above.add(flies);
      movers.push({ s: L - 40, r: 420, back: 200, obj: flies, update(dt, t) { flies.position.y = Math.sin(t * 0.7) * 0.5; flies.position.x = Math.sin(t * 0.31) * 0.8; fm.opacity = 0.7 + 0.3 * Math.sin(t * 3.1); fm.size = 0.5 + 0.12 * Math.sin(t * 1.7); } });
      isles([[1640, -55, -14, 16, 1], [1700, 60, -20, 20, 1], [1745, -70, -8, 12]], 90, { grass: '#a6e6c0', grass2: '#8fdcb0' });
    })();

    /* ---------- Dinosaur City (ride-sky-city.js) ---------- */
    const B = { P, rr, pick, rnd, tint, tpl, ico, stampAt, crowd, actor, facing, sign, island, plant, waterfall, pond, rainbow, cloud, onLand, TREES, PALMS, MUSHROOMS, BUSHES, FLOWERS, ROCKS, CRYSTAL, POST, STAR, CLEAR };
    let cityPart = null;
    if (S.dinoCity) { try { cityPart = S.dinoCity(kit, B); } catch (e) { console.error('dinosaur city failed', e); } }
    cushions();

    /* ---------- the water, in one mesh ---------- */
    if (water.p.length) {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(water.p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(water.uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(water.c, 3));
      owned.geoms.push(g);
      const m = new T.Mesh(g, waterMat);
      m.name = 'sky-water'; above.add(m);
      movers.push({ s: 0, r: 1e9, back: 1e9, update(dt) { waterTex.offset.y += dt * 0.55; } });
    }
    temp.forEach((g) => g.dispose());
    return { fonts() { if (!fontThere) signs.forEach((draw) => draw()); }, dispose() { if (cityPart && cityPart.dispose) cityPart.dispose(); } };
  };
})();
