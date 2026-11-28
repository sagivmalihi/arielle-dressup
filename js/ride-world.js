/* ride-world.js — the static 3D Tel Aviv for the bike ride (needs THREE + ride-kit.js + the baked data of a place).
   DU.rideWorld.build(scene, data, { quality: 'high' | 'low' }) → world
   data = DU.RIDE_DATA (the school) or any data of that shape that ends at data.end = { x, z, a } instead of
   data.school. What belongs to the school (yard, fence and gate, name signs, the rainbow carpet) and to our house
   is built only when the data has data.school / data.house; info.gate is there for both kinds.
     world.update(dt, t, camera)   sky follows the camera, clouds drift, flags and fountains move
     world.dispose()
     world.sunDir                  unit Vector3 from the ground toward the sun
     world.ready                   Promise: resolves when the sign texts are redrawn in the game font
     world.info                    { meshes, tris, buildMs, roadEnd, parkLat, kerbLat, gate: { s, x, z }, parts }
     world.parkOk(s, side)         may the game park a car at s metres along, side -1 (left) / 1 (right)? false at side
                                   streets, driveways and crossings
     world.group                   the Group that holds everything (already added to the scene)
   Along the route on the roads (s < info.roadEnd = 545) the band 3.8…6.1 m either side of the centre line is a flat
   parking strip (cars are parked there by the game, centre about info.parkLat = 5 m); the kerb is at 6.2 m and trees,
   lamps and furniture start at 6.6 m. On the bike-path stretches everything solid stays ≥ 4.2 m from the centre line,
   and ≥ 5.2 m around the school gate (no tree within 9 m there, so a finish arch fits). Tree crowns start above 4.3 m.
   Everything is generated in code: flat ground layers, extruded footprints with procedural facade tiles,
   instanced trees. No shadow maps: soft "leafy shade" decals instead.
   What the data of another ride may add (ride-data-sarona.js, ride-data-yarkon.js): roadEnd (metres along: where the
   car streets end; 545 on the ride to school), humps (where the raised crossings of the road stretch are),
   keep ([x, z, radius]…: clearings where no tree may stand), buildings of kind 't' (a Templer house: h is the height
   of the eaves, a red tiled roof goes on top; rf: 'hipped'), areas of kind 'river' (soft banks, no fountain) and 'lawn'
   (open grass without trees). A ride longer than the one to school is dressed less deep to its sides (`thin`). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});

  function build(scene, data, opts) {
    opts = opts || {};
    const T = window.THREE, K = DU.rideKit, PAL = K.PAL;
    const low = opts.quality === 'low';
    const t0 = performance.now();
    const root = new T.Group();
    root.name = 'rideWorld';
    scene.add(root);
    const rnd = K.rng(20261126);
    const rr = (a, b) => a + (b - a) * rnd();
    const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
    const hash = (i, m) => { let h = (i + 1) * 2654435761; h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16; return (h >>> 0) % m; };
    const owned = { geoms: [], mats: [], texs: [] };
    const own = (m) => { owned.mats.push(m); if (m.map) owned.texs.push(m.map); return m; };

    /* ---------- colours ---------- */
    const cc = {};
    const C = (hex) => cc[hex] || (cc[hex] = (() => { const c = new T.Color(hex); return [c.r, c.g, c.b]; })());
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const mul = (a, f) => [a[0] * f, a[1] * f, a[2] * f];
    const WHITE = [1, 1, 1];

    /* ---------- a growing triangle soup ---------- */
    function Buf(uv) { this.p = []; this.n = []; this.c = []; this.u = uv ? [] : null; }
    const BP = Buf.prototype;
    BP.tri = function (ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, col, uv) {
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const flip = (uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz < 0;
      if (flip) this.p.push(ax, ay, az, cx, cy, cz, bx, by, bz); else this.p.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
      this.c.push(col[0], col[1], col[2], col[0], col[1], col[2], col[0], col[1], col[2]);
      if (this.u) { if (flip) this.u.push(uv[0], uv[1], uv[4], uv[5], uv[2], uv[3]); else this.u.push(uv[0], uv[1], uv[2], uv[3], uv[4], uv[5]); }
    };
    /* a, b, c, d: [x,y,z] going round; n: the normal it should face; uv: [ua,va, ub,vb, uc,vc, ud,vd] */
    BP.quad = function (a, b, c, d, n, col, uv) {
      this.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], n[0], n[1], n[2], col, uv && [uv[0], uv[1], uv[2], uv[3], uv[4], uv[5]]);
      this.tri(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], n[0], n[1], n[2], col, uv && [uv[0], uv[1], uv[4], uv[5], uv[6], uv[7]]);
    };
    /* flat (lying on the ground, facing up) */
    BP.ftri = function (ax, az, bx, bz, cx, cz, y, col) { this.tri(ax, y, az, bx, y, bz, cx, y, cz, 0, 1, 0, col, this.u && [0, 0, 0, 0, 0, 0]); };
    BP.fquad = function (ax, az, bx, bz, cx, cz, dx, dz, y, col) { this.ftri(ax, az, bx, bz, cx, cz, y, col); this.ftri(ax, az, cx, cz, dx, dz, y, col); };
    /* a flat rectangle centred on x,z; (dx,dz) is the unit direction of its length */
    BP.frect = function (x, z, dx, dz, len, wid, y, col) {
      const hx = (dx * len) / 2, hz = (dz * len) / 2, wx = (-dz * wid) / 2, wz = (dx * wid) / 2;
      this.fquad(x - hx - wx, z - hz - wz, x + hx - wx, z + hz - wz, x + hx + wx, z + hz + wz, x - hx + wx, z - hz + wz, y, col);
    };
    BP.fdisc = function (x, z, r, y, col, seg) {
      seg = seg || 10;
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2, b = ((i + 1) / seg) * Math.PI * 2;
        this.ftri(x, z, x + Math.cos(a) * r, z + Math.sin(a) * r, x + Math.cos(b) * r, z + Math.sin(b) * r, y, col);
      }
    };
    BP.ribbon = function (pts, w, y, col, seg) {
      const h = w / 2;
      for (let i = 0; i + 3 < pts.length; i += 2) {
        const ax = pts[i], az = pts[i + 1], bx = pts[i + 2], bz = pts[i + 3];
        const l = Math.hypot(bx - ax, bz - az);
        if (l < 0.01) continue;
        const nx = (-(bz - az) / l) * h, nz = ((bx - ax) / l) * h;
        this.fquad(ax - nx, az - nz, bx - nx, bz - nz, bx + nx, bz + nz, ax + nx, az + nz, y, col);
      }
      if (seg !== 0) for (let i = 0; i < pts.length; i += 2) this.fdisc(pts[i], pts[i + 1], h, y, col, seg || 8);
    };
    BP.poly = function (pts, y, col) {
      const contour = [];
      for (let i = 0; i < pts.length; i += 2) contour.push(new T.Vector2(pts[i], pts[i + 1]));
      if (contour.length < 3) return;
      const faces = T.ShapeUtils.triangulateShape(contour, []);
      for (let i = 0; i < faces.length; i++) {
        const f = faces[i];
        this.ftri(contour[f[0]].x, contour[f[0]].y, contour[f[1]].x, contour[f[1]].y, contour[f[2]].x, contour[f[2]].y, y, col);
      }
    };
    /* a very big flat polygon, cut into squares of `cell` metres. A triangle that is hundreds of metres long gets an
       imprecise depth on some graphics chips, and then the wrong layer of the ground shows near the camera */
    BP.polyCut = function (pts, y, col, cell) {
      const clip = (poly, ax, v, sg) => { // keep the side where (p[ax] - v) * sg >= 0
        const out = [];
        for (let i = 0; i < poly.length; i++) {
          const a = poly[(i + poly.length - 1) % poly.length], b = poly[i], ia = (a[ax] - v) * sg >= 0, ib = (b[ax] - v) * sg >= 0;
          if (ia !== ib) { const t = (v - a[ax]) / (b[ax] - a[ax]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
          if (ib) out.push(b);
        }
        return out;
      };
      const all = [], bb = [1e9, 1e9, -1e9, -1e9];
      for (let i = 0; i < pts.length; i += 2) { all.push([pts[i], pts[i + 1]]); bb[0] = Math.min(bb[0], pts[i]); bb[1] = Math.min(bb[1], pts[i + 1]); bb[2] = Math.max(bb[2], pts[i]); bb[3] = Math.max(bb[3], pts[i + 1]); }
      for (let x = Math.floor(bb[0] / cell) * cell; x < bb[2]; x += cell) {
        const strip = clip(clip(all, 0, x, 1), 0, x + cell, -1);
        if (strip.length < 3) continue;
        for (let z = Math.floor(bb[1] / cell) * cell; z < bb[3]; z += cell) {
          const piece = clip(clip(strip, 1, z, 1), 1, z + cell, -1);
          if (piece.length >= 3) this.poly([].concat(...piece), y, col);
        }
      }
    };
    /* a box turned by ry around the vertical; colTop optional */
    BP.box = function (cx, cy, cz, sx, sy, sz, col, ry, colTop) {
      const c = Math.cos(ry || 0), s = Math.sin(ry || 0), hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const P = (lx, ly, lz) => [cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c];
      const N = (lx, lz) => [lx * c + lz * s, 0, -lx * s + lz * c];
      const a = P(-hx, -hy, -hz), b = P(hx, -hy, -hz), d = P(-hx, -hy, hz), e = P(hx, -hy, hz);
      const a2 = P(-hx, hy, -hz), b2 = P(hx, hy, -hz), d2 = P(-hx, hy, hz), e2 = P(hx, hy, hz);
      const uv = this.u && [0, 0, 0, 0, 0, 0, 0, 0];
      this.quad(a, b, b2, a2, N(0, -1), col, uv);
      this.quad(d, e, e2, d2, N(0, 1), col, uv);
      this.quad(a, d, d2, a2, N(-1, 0), col, uv);
      this.quad(b, e, e2, b2, N(1, 0), col, uv);
      this.quad(a2, b2, e2, d2, [0, 1, 0], colTop || col, uv);
      if (cy - hy > 0.05) this.quad(a, b, e, d, [0, -1, 0], mul(col, 0.8), uv);
    };
    /* an upright cylinder / cone, faceted */
    BP.cyl = function (x, y0, z, r0, r1, h, seg, col, cap) {
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2, b = ((i + 1) / seg) * Math.PI * 2, m = (a + b) / 2;
        const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
        this.quad([x + ca * r0, y0, z + sa * r0], [x + cb * r0, y0, z + sb * r0], [x + cb * r1, y0 + h, z + sb * r1], [x + ca * r1, y0 + h, z + sa * r1], [Math.cos(m), 0, Math.sin(m)], col, this.u && [0, 0, 0, 0, 0, 0, 0, 0]);
        if (cap !== false && r1 > 0.01) this.tri(x, y0 + h, z, x + ca * r1, y0 + h, z + sa * r1, x + cb * r1, y0 + h, z + sb * r1, 0, 1, 0, cap || col, this.u && [0, 0, 0, 0, 0, 0]);
      }
    };
    /* append a painted BufferGeometry (from K.g / K.merge), turned by ry, scaled by s, moved to x,y,z */
    BP.addAt = function (geom, x, y, z, ry, s) {
      const pos = geom.attributes.position.array, nor = geom.attributes.normal.array, col = geom.attributes.color.array;
      const c = Math.cos(ry || 0), sn = Math.sin(ry || 0);
      s = s || 1;
      for (let i = 0; i < pos.length; i += 3) {
        const px = pos[i] * s, py = pos[i + 1] * s, pz = pos[i + 2] * s;
        this.p.push(x + px * c + pz * sn, y + py, z - px * sn + pz * c);
        this.n.push(nor[i] * c + nor[i + 2] * sn, nor[i + 1], -nor[i] * sn + nor[i + 2] * c);
        this.c.push(col[i], col[i + 1], col[i + 2]);
        if (this.u) this.u.push(0, 0);
      }
    };
    BP.geometry = function () {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(this.p), 3));
      geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(this.n), 3));
      geo.setAttribute('color', new T.BufferAttribute(new Float32Array(this.c), 3));
      if (this.u) geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(this.u), 2));
      owned.geoms.push(geo);
      return geo;
    };
    BP.mesh = function (mat, name) {
      if (!this.p.length) return null;
      const m = new T.Mesh(this.geometry(), mat);
      m.name = name || '';
      m.matrixAutoUpdate = false;
      root.add(m);
      this.p = this.n = this.c = this.u = null;
      return m;
    };
    const lam = (o) => own(new T.MeshLambertMaterial(Object.assign({ vertexColors: true }, o || {})));
    const flatMat = (layer) => lam({ polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 2 });
    /* a little model in its own coordinates → geometry for addAt */
    const model = (parts) => K.merge(parts);
    const g = K.g;

    /* ---------- the route ---------- */
    const path = K.path(data);
    const LEN = path.length;
    const NS = Math.floor(LEN) + 1;
    const RX = new Float32Array(NS), RZ = new Float32Array(NS), TX = new Float32Array(NS), TZ = new Float32Array(NS), NX = new Float32Array(NS), NZ = new Float32Array(NS);
    const tmp = {};
    for (let i = 0; i < NS; i++) { path.at(i, tmp); RX[i] = tmp.x; RZ[i] = tmp.z; TX[i] = tmp.tx; TZ[i] = tmp.tz; NX[i] = tmp.nx; NZ[i] = tmp.nz; }
    let rb = [1e9, 1e9, -1e9, -1e9];
    for (let i = 0; i < NS; i++) { rb[0] = Math.min(rb[0], RX[i]); rb[1] = Math.min(rb[1], RZ[i]); rb[2] = Math.max(rb[2], RX[i]); rb[3] = Math.max(rb[3], RZ[i]); }
    /* nearest route sample → { d, s, lat (+ = right of travel) } */
    function routeNear(x, z) {
      if (x < rb[0] - 320 || x > rb[2] + 320 || z < rb[1] - 320 || z > rb[3] + 320) return { d: 999, s: 0, lat: 999 };
      let best = 1e12, bi = 0;
      for (let i = 0; i < NS; i++) { const dx = RX[i] - x, dz = RZ[i] - z, d = dx * dx + dz * dz; if (d < best) { best = d; bi = i; } }
      return { d: Math.sqrt(best), s: bi, lat: (x - RX[bi]) * NX[bi] + (z - RZ[bi]) * NZ[bi] };
    }
    const at = (s, lat, out) => { path.at(s, out); out.x += out.nx * lat; out.z += out.nz * lat; return out; };
    const ROAD_END = data.roadEnd || 545; // up to here the ride is on real roads with a parking strip (to school: boulevard + Dubnov)
    /* a longer ride is dressed less deep to its sides, so every ride costs about the same to draw (1 on the ride to school) */
    const thin = Math.max(1, LEN / 1050);
    const cross = data.cross || [];
    const PATH_START = cross.length ? cross[0].s1 + 1.5 : ROAD_END + 25;
    const inCross = (s) => cross.some((c) => s >= c.s0 - 0.5 && s <= c.s1 + 0.5);
    const GATE_S = LEN - 22;
    const clearAt = (s) => (s > GATE_S - 16 ? 5.2 : s < ROAD_END + 3 ? 6.6 : 4.2);

    /* ---------- spatial indexes ---------- */
    const CELL = 32;
    function Grid() { this.m = new Map(); }
    Grid.prototype.add = function (x0, z0, x1, z1, item) {
      for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++) for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
        const k = ix * 4096 + iz;
        let a = this.m.get(k);
        if (!a) this.m.set(k, (a = []));
        a.push(item);
      }
    };
    Grid.prototype.at = function (x, z) { return this.m.get(Math.floor(x / CELL) * 4096 + Math.floor(z / CELL)) || []; };
    const inPoly = (x, z, q) => {
      let c = false;
      for (let j = 0, k = q.length - 2; j < q.length; k = j, j += 2) if ((q[j + 1] > z) !== (q[k + 1] > z) && x < ((q[k] - q[j]) * (z - q[j + 1])) / (q[k + 1] - q[j + 1]) + q[j]) c = !c;
      return c;
    };
    const dseg = (px, pz, ax, az, bx, bz) => {
      const vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz || 1e-9;
      const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / L));
      return Math.hypot(px - ax - vx * t, pz - az - vz * t);
    };
    const bboxOf = (q) => { const b = [1e9, 1e9, -1e9, -1e9]; for (let j = 0; j < q.length; j += 2) { b[0] = Math.min(b[0], q[j]); b[1] = Math.min(b[1], q[j + 1]); b[2] = Math.max(b[2], q[j]); b[3] = Math.max(b[3], q[j + 1]); } return b; };
    const centroid = (q) => { let x = 0, z = 0; for (let j = 0; j < q.length; j += 2) { x += q[j]; z += q[j + 1]; } return [x / (q.length / 2), z / (q.length / 2)]; };
    const areaOf = (q) => { let a = 0; for (let j = 0, k = q.length - 2; j < q.length; k = j, j += 2) a += q[k] * q[j + 1] - q[j] * q[k + 1]; return a / 2; };

    /* roads */
    const DRIVE = { A: 1, T: 1, R: 1, S: 1 };
    const rGrid = new Grid();
    data.roads.forEach((rd, ri) => {
      const q = rd.p;
      for (let j = 0; j + 3 < q.length; j += 2) {
        const hw = rd.w / 2, pad = hw + 4;
        rGrid.add(Math.min(q[j], q[j + 2]) - pad, Math.min(q[j + 1], q[j + 3]) - pad, Math.max(q[j], q[j + 2]) + pad, Math.max(q[j + 1], q[j + 3]) + pad, [q[j], q[j + 1], q[j + 2], q[j + 3], hw, rd.k, ri]);
      }
    });
    /* distance to the edge of the nearest road ribbon (negative = on it); drive = only roads for cars */
    function roadEdge(x, z, drive) {
      const list = rGrid.at(x, z);
      let best = 99;
      for (let i = 0; i < list.length; i++) {
        const sg = list[i];
        if (drive && !DRIVE[sg[5]]) continue;
        const d = dseg(x, z, sg[0], sg[1], sg[2], sg[3]) - sg[4];
        if (d < best) best = d;
      }
      return best;
    }

    /* buildings: keep the corridor free (move the few that sit too close), then index */
    const school = data.school ? data.areas[data.school.a] : null; // only the school's own data has one (other places end at data.end)
    const B = [];
    let dropped = 0, moved = 0;
    data.buildings.forEach((b, bi) => {
      const o = { i: bi, k: b.k, h: b.h, base: b.b || 0, far: !!b.far, n: b.n, p: b.p.slice(), house: !!data.house && bi === data.house.b };
      if (!o.far) {
        // closest approach to the route
        let best = { d: 999 }, q = o.p;
        for (let j = 0; j < q.length; j += 2) {
          const k = (j + 2) % q.length, L = Math.hypot(q[k] - q[j], q[k + 1] - q[j + 1]), steps = Math.max(1, Math.ceil(L / 1.5));
          for (let t = 0; t < steps; t++) { const r = routeNear(q[j] + ((q[k] - q[j]) * t) / steps, q[j + 1] + ((q[k + 1] - q[j + 1]) * t) / steps); if (r.d < best.d) best = r; }
        }
        o.rd = best.d; o.rs = best.s; o.rlat = best.lat;
        const need = best.s < ROAD_END + 3 ? 7.7 : best.s > GATE_S - 16 ? 5.6 : 5.0;
        if (best.d < need && best.s > 0 && best.s < NS - 1) {
          const sh = need - best.d + 0.1, sg = best.lat < 0 ? -1 : 1;
          if (sh > 6.5 || b.k === 'r' || b.k === 's') { dropped++; return; }
          for (let j = 0; j < q.length; j += 2) { q[j] += NX[best.s] * sg * sh; q[j + 1] += NZ[best.s] * sg * sh; }
          o.rd = need; moved++;
        }
        o.inSchool = school && inPoly(centroid(q)[0], centroid(q)[1], school.p);
      }
      o.bb = bboxOf(o.p);
      B.push(o);
    });
    const bGrid = new Grid();
    B.forEach((o) => { if (!o.far) bGrid.add(o.bb[0] - 2, o.bb[1] - 2, o.bb[2] + 2, o.bb[3] + 2, o); });
    function inBuilding(x, z, margin) {
      const list = bGrid.at(x, z);
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (x < o.bb[0] - margin || x > o.bb[2] + margin || z < o.bb[1] - margin || z > o.bb[3] + margin) continue;
        if (inPoly(x, z, o.p)) return true;
        if (margin) for (let j = 0, q = o.p; j < q.length; j += 2) { const k = (j + 2) % q.length; if (dseg(x, z, q[j], q[j + 1], q[k], q[k + 1]) < margin) return true; }
      }
      return false;
    }
    const waters = data.areas.filter((a) => a.k === 'water');
    const rivers = data.areas.filter((a) => a.k === 'river'); // wide water with soft banks and no fountain
    const inWater = (x, z) => waters.some((a) => inPoly(x, z, a.p)) || rivers.some((a) => inPoly(x, z, a.p));
    /* may something tall stand here? */
    function free(x, z, margin, roadGap) {
      const r = routeNear(x, z);
      if (r.d < clearAt(r.s)) return false;
      if (inBuilding(x, z, margin === undefined ? 0.9 : margin)) return false;
      if (roadGap !== false && roadEdge(x, z, true) < (roadGap === undefined ? 0.7 : roadGap)) return false;
      return true;
    }

    /* ---------- light, fog, sky ---------- */
    const sunDir = new T.Vector3(0.52, 0.74, 0.43).normalize();
    const hemi = new T.HemisphereLight('#ffffff', '#f6eee2', 0.78);
    const sun = new T.DirectionalLight(PAL.sun, 0.36);
    sun.position.copy(sunDir).multiplyScalar(200);
    root.add(hemi, sun, sun.target);
    const prevFog = scene.fog, prevBg = scene.background;
    scene.fog = new T.Fog(PAL.fog, 85, 430);
    scene.background = new T.Color(PAL.fog);

    const skyGroup = new T.Group();
    root.add(skyGroup);
    (function sky() {
      const geo = new T.SphereGeometry(1900, 28, 14);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
      const fogC = C(PAL.fog), hor = C(PAL.horizon), mid = C(PAL.skyMid), top = C(PAL.skyTop);
      for (let i = 0; i < pos.count; i++) {
        const e = Math.asin(Math.max(-1, Math.min(1, pos.getY(i) / 1900))) / (Math.PI / 2); // -1 … 1
        let c;
        if (e <= 0.02) c = fogC;
        else if (e < 0.1) c = mix(fogC, hor, (e - 0.02) / 0.08);
        else if (e < 0.32) c = mix(hor, mid, (e - 0.1) / 0.22);
        else c = mix(mid, top, Math.min(1, (e - 0.32) / 0.45));
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
      geo.setAttribute('color', new T.BufferAttribute(col, 3));
      owned.geoms.push(geo);
      const m = new T.Mesh(geo, own(new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })));
      m.renderOrder = -10; m.frustumCulled = false;
      skyGroup.add(m);
      // the sun: a warm soft disc
      const tex = K.canvasTex(128, 128, (ctx) => {
        const gr = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
        gr.addColorStop(0, 'rgba(255,253,240,1)'); gr.addColorStop(0.22, 'rgba(255,248,214,.95)'); gr.addColorStop(0.3, 'rgba(255,240,190,.45)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
      });
      const sp = new T.Sprite(own(new T.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true })));
      sp.scale.set(520, 520, 1);
      sp.position.copy(sunDir).multiplyScalar(1700);
      sp.renderOrder = -9;
      skyGroup.add(sp);
    })();
    /* clouds: a ring of soft puffs, one mesh, slowly turning */
    const cloudRing = new T.Group();
    skyGroup.add(cloudRing);
    (function clouds() {
      const buf = new Buf();
      const ico = new T.IcosahedronGeometry(1, 1);
      const n = low ? 7 : 11;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rr(-0.2, 0.2), dist = rr(700, 1250), y = rr(260, 420), sc = rr(45, 80);
        const cx = Math.cos(a) * dist, cz = Math.sin(a) * dist, puffs = 4 + Math.floor(rnd() * 3), ry = rnd() * 6;
        for (let j = 0; j < puffs; j++) {
          const off = (j - (puffs - 1) / 2) * sc * 0.8, r = sc * rr(0.6, 1) * (1 - Math.abs(j - (puffs - 1) / 2) / puffs);
          const geo = g(ico, '#ffffff', 0, 0, 0, 0, 0, 0, r * 1.25, r * 0.62, r);
          // light top, soft blue-grey belly
          const p = geo.attributes.position, c = geo.attributes.color;
          for (let v = 0; v < p.count; v++) { const k = Math.max(0, Math.min(1, (p.getY(v) / (r * 0.62) + 1) / 2)); const cl = mix(C('#cfe3f6'), WHITE, 0.35 + 0.65 * k); c.setXYZ(v, cl[0], cl[1], cl[2]); }
          buf.addAt(geo, cx + Math.cos(ry) * off, y + rr(-6, 6), cz + Math.sin(ry) * off, 0, 1);
        }
      }
      const m = new T.Mesh(buf.geometry(), own(new T.MeshBasicMaterial({ vertexColors: true, fog: false })));
      m.frustumCulled = false; m.renderOrder = -8;
      cloudRing.add(m);
    })();

    /* ---------- ground layers ---------- */
    // in squares of 125 m, not two triangles of 6 km: see polyCut
    const ground = new T.Mesh(new T.PlaneGeometry(6000, 6000, 48, 48), own(new T.MeshLambertMaterial({ color: PAL.pavement })));
    owned.geoms.push(ground.geometry);
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);

    const L_area = new Buf(), L_road = new Buf(), L_lane = new Buf(), L_paint = new Buf();
    const solid = new Buf(); // everything untextured that stands up
    const near = (q, lim) => { for (let j = 0; j < q.length; j += 2) if (routeNear(q[j], q[j + 1]).d < lim) return true; return false; };

    /* gardens around the homes near the route */
    B.forEach((o) => {
      if (o.far || o.k !== 'h' || o.rd > 150 || o.inSchool) return;
      const c = centroid(o.p);
      let rad = 0;
      for (let j = 0; j < o.p.length; j += 2) rad += Math.hypot(o.p[j] - c[0], o.p[j + 1] - c[1]);
      rad /= o.p.length / 2;
      const f = 1 + 3.2 / Math.max(4, rad), q = [];
      for (let j = 0; j < o.p.length; j += 2) q.push(c[0] + (o.p[j] - c[0]) * f, c[1] + (o.p[j + 1] - c[1]) * f);
      L_area.poly(q, 0.012, C(hash(o.i, 3) ? PAL.grass : PAL.grassDark));
    });
    /* a river: soft green banks, and pale and deep streaks that follow the stream */
    function riverLook(a) {
      const q = a.p, n = q.length / 2, bank = C('#b9dd95'), pale = C('#c4ebfa'), deep = C(PAL.waterDeep);
      for (let j = 0; j < n; j++) { const k = (j + 1) % n; L_area.ribbon([q[j * 2], q[j * 2 + 1], q[k * 2], q[k * 2 + 1]], 2.4, 0.034, bank, 6); }
      const bb = bboxOf(q), r2 = K.rng(909);
      for (let t = 0; t < 520; t++) {
        const x = bb[0] + (bb[2] - bb[0]) * r2(), z = bb[1] + (bb[3] - bb[1]) * r2();
        if (!inPoly(x, z, q) || routeNear(x, z).d > 330) continue;
        let best = 1e9, dx = 1, dz = 0; // the nearest bank gives the direction of the stream
        for (let j = 0; j < n; j++) {
          const k = (j + 1) % n, d = dseg(x, z, q[j * 2], q[j * 2 + 1], q[k * 2], q[k * 2 + 1]);
          if (d < best) { best = d; const l = Math.hypot(q[k * 2] - q[j * 2], q[k * 2 + 1] - q[j * 2 + 1]) || 1; dx = (q[k * 2] - q[j * 2]) / l; dz = (q[k * 2 + 1] - q[j * 2 + 1]) / l; }
        }
        if (best < 2.5) continue;
        const mid = best > 11;
        L_paint.frect(x, z, dx, dz, mid ? 6 + r2() * 9 : 2 + r2() * 3.5, mid ? 0.5 + r2() * 0.5 : 0.22, 0.04, mid && r2() < 0.6 ? deep : pale);
      }
    }
    const AREA = {
      park: [PAL.grass, 0.02], grass: [PAL.grassDark, 0.018], play: [PAL.sand, 0.026], pitch: ['#7fc98a', 0.028], parking: [PAL.asphaltDark, 0.024],
      water: [PAL.water, 0.032], plaza: [PAL.plaza, 0.021], yard: ['#f3e3bd', 0.022], school: ['#fbe7a8', 0.025],
      river: [PAL.water, 0.03], lawn: ['#b4e68c', 0.019],
    };
    data.areas.forEach((a, ai) => {
      const st = AREA[a.k];
      if (!st) return;
      if (a.k === 'river' || Math.abs(areaOf(a.p)) > 20000) L_area.polyCut(a.p, st[1], C(st[0]), 48); // a wide lawn, a river
      else L_area.poly(a.p, st[1], C(st[0]));
      if (a.k === 'water') { // a pale rim
        const q = a.p;
        for (let j = 0; j < q.length; j += 2) { const k = (j + 2) % q.length; L_area.ribbon([q[j], q[j + 1], q[k], q[k + 1]], 0.7, 0.036, C('#f4efe2'), 6); }
      }
      if (a.k === 'river') riverLook(a);
      if (a.k === 'pitch') { const c = centroid(a.p); L_paint.fdisc(c[0], c[1], 2.2, 0.03, C('#a9dfb0'), 14); }
      if (a.k === 'parking' && near(a.p, 140)) { // a few bay lines
        const bb = bboxOf(a.p);
        for (let x = bb[0] + 3; x < bb[2] - 2; x += 2.6) for (let z = bb[1] + 3; z < bb[3] - 2; z += 11) if (inPoly(x, z, a.p) && inPoly(x, z + 4.4, a.p)) L_paint.frect(x, z + 2.2, 0, 1, 4.4, 0.12, 0.03, C('#c9d0da'));
      }
    });

    /* sidewalks under the car roads, then the roads themselves */
    const ROADY = { F: 0.04, P: 0.044, S: 0.05, R: 0.058, T: 0.066, A: 0.074 };
    const ROADC = { F: '#e2d6c0', P: PAL.plaza, S: '#737d8c', R: PAL.asphalt, T: PAL.asphalt, A: PAL.asphaltDark };
    data.roads.forEach((rd) => {
      if (rd.k === 'C') { L_lane.ribbon(rd.p, rd.w + 0.6, 0.082, C(PAL.bikeLane), 6); return; }
      if (rd.sw) return;
      if (DRIVE[rd.k] && rd.k !== 'S') L_area.ribbon(rd.p, rd.w + 5.6, 0.034, C(PAL.pavementDark), 8);
      L_road.ribbon(rd.p, rd.w, ROADY[rd.k], C(ROADC[rd.k]), rd.k === 'F' ? 6 : 10);
    });
    /* paint on the roads: centre dashes on two-way streets, zebra stripes on marked crossings */
    data.roads.forEach((rd) => {
      const q = rd.p;
      if ((rd.k === 'T' || rd.k === 'A') && !rd.o && near(q, 260)) {
        let carry = 0;
        for (let j = 0; j + 3 < q.length; j += 2) {
          const L = Math.hypot(q[j + 2] - q[j], q[j + 3] - q[j + 1]), dx = (q[j + 2] - q[j]) / L, dz = (q[j + 3] - q[j + 1]) / L;
          for (let d = carry; d + 3 < L; d += 8) L_paint.frect(q[j] + dx * (d + 1.5), q[j + 1] + dz * (d + 1.5), dx, dz, 3, 0.16, 0.1, C(PAL.paint));
          carry = (8 - ((L - carry) % 8)) % 8;
        }
      }
      if (rd.x && near(q, 110)) {
        for (let j = 0; j + 3 < q.length; j += 2) {
          const L = Math.hypot(q[j + 2] - q[j], q[j + 3] - q[j + 1]);
          if (L < 0.5) continue;
          const dx = (q[j + 2] - q[j]) / L, dz = (q[j + 3] - q[j + 1]) / L;
          for (let d = 0.5; d < L; d += 1.15) L_paint.frect(q[j] + dx * d, q[j + 1] + dz * d, dx, dz, 0.55, 3.4, 0.1, C(PAL.zebra));
        }
      }
    });

    /* ---------- the ride corridor ---------- */
    const P1 = {}, P2 = {};
    const stripe = (s0, s1, l0, l1, y, col, buf) => { // a band along the route between two lateral offsets
      for (let s = s0; s < s1 - 0.01; s += 1) {
        const e = Math.min(s1, s + 1);
        path.at(s, P1); path.at(e, P2);
        (buf || L_lane).fquad(P1.x + P1.nx * l0, P1.z + P1.nz * l0, P2.x + P2.nx * l0, P2.z + P2.nz * l0, P2.x + P2.nx * l1, P2.z + P2.nz * l1, P1.x + P1.nx * l1, P1.z + P1.nz * l1, y, col);
      }
    };
    const KERB = 6.2;
    // gaps in the kerb where a side street or a driveway comes in
    const gap = [new Uint8Array(NS + 40), new Uint8Array(NS + 40)];
    for (let s = -12; s < ROAD_END; s++) for (let side = 0; side < 2; side++) {
      at(s, (side ? 1 : -1) * (KERB + 0.35), P1);
      if (roadEdge(P1.x, P1.z, true) < 0.4 || inCross(s)) gap[side][s + 12] = 1;
    }
    const isGap = (side, s) => gap[side][Math.max(0, Math.min(NS + 39, Math.round(s) + 12))];
    const nearGap = (side, s, r) => { for (let d = -r; d <= r; d++) if (isGap(side, s + d)) return true; return false; };
    // road stretch: asphalt, darker parking strip with bay ticks, a painted kerb, a paved sidewalk band
    stripe(-12, ROAD_END + 1, -3.8, 3.8, 0.09, C(PAL.asphalt));
    const blueC = C('#3f86d9'), redC = C('#e8564f'), whiteC = C('#fbfaf5'), kerbC = C(PAL.kerb);
    for (let side = 0; side < 2; side++) {
      const sg = side ? 1 : -1;
      for (let s = -12; s < ROAD_END; s++) {
        const gp = isGap(side, s);
        stripe(s, s + 1, sg * 3.8, sg * (gp ? 7.2 : KERB), 0.09, C(gp ? PAL.asphalt : '#5e6777'));
        if (gp) continue;
        if (s % 2 === 0) stripe(s, s + 1.1, sg * 3.72, sg * 3.86, 0.105, C(PAL.paint), L_paint); // dashed edge of the lane
        if (((s % 6) + 6) % 6 === 0 && !nearGap(side, s, 1)) stripe(s - 0.07, s + 0.07, sg * 3.9, sg * (KERB - 0.05), 0.105, C('#aeb7c4'), L_paint); // bay ticks
        stripe(s, s + 1, sg * (KERB + 0.3), sg * 8.7, 0.045, C('#e6dccb'), L_road); // the sidewalk
        // the kerb stone
        const red = nearGap(side, s, 7), zone = hash(Math.floor((s + 400) / 34) * 2 + side, 5);
        const col = red ? (s % 2 ? redC : whiteC) : zone < 3 ? (s % 2 ? blueC : whiteC) : kerbC;
        at(s + 0.5, sg * (KERB + 0.15), P1);
        solid.box(P1.x, 0.08, P1.z, 0.3, 0.16, 1.0, col, Math.atan2(P1.tx, P1.tz));
      }
    }
    // the crossings: dark asphalt, a stop line, zebra bars
    cross.forEach((c) => {
      stripe(c.s0 - 6, c.s1 + 2, -3.8, 3.8, 0.092, C(PAL.asphaltDark));
      stripe(c.s0 - 3.3, c.s0 - 2.7, -3.7, 3.7, 0.105, C(PAL.paint), L_paint);
      for (let s = c.s0; s < c.s1 - 0.4; s += 1.2) stripe(s, s + 0.62, -3.5, 3.5, 0.105, C(PAL.zebra), L_paint);
      stripe(c.s0, c.s1, -3.8, -3.55, 0.105, C(PAL.bikeLane), L_paint);
      stripe(c.s0, c.s1, 3.55, 3.8, 0.105, C(PAL.bikeLane), L_paint);
    });
    // the bike-path stretches: a wide green way with white edges, a dashed middle and bicycle marks
    const RAINBOW = ['#ff8fa8', '#ffb46b', '#ffe07a', '#9be08f', '#8fd3ff', '#c3a6ff'];
    const pathBits = [];
    let ps = cross.length ? ROAD_END + 1 : PATH_START;
    cross.forEach((c) => { // a crossing cuts the path; one that lies on the road stretch does not
      if (c.s1 < ROAD_END) return;
      if (c.s0 - 6 > ps) pathBits.push([ps, c.s0 - 6]);
      ps = c.s1 + (c.s0 < ROAD_END + 6 ? 1.5 : 2);
    });
    pathBits.push([ps, school ? GATE_S : LEN + 3]);
    pathBits.forEach(([a, b]) => {
      stripe(a, b, -3.8, 3.8, 0.095, C(PAL.bikeLane));
      stripe(a, b, -3.8, -3.6, 0.105, C(PAL.paint), L_paint);
      stripe(a, b, 3.6, 3.8, 0.105, C(PAL.paint), L_paint);
      for (let s = a + 2; s < b - 2; s += 4) stripe(s, s + 1.6, -0.08, 0.08, 0.105, C(PAL.paint), L_paint);
    });
    // into the school: a rainbow carpet
    if (school) {
      for (let s = GATE_S, i = 0; s < LEN + 3; s += 1.5, i++) stripe(s, Math.min(LEN + 3, s + 1.5), -3.8, 3.8, 0.096, C(RAINBOW[i % RAINBOW.length]));
      stripe(GATE_S, LEN + 3, -3.8, -3.6, 0.105, whiteC, L_paint);
      stripe(GATE_S, LEN + 3, 3.6, 3.8, 0.105, whiteC, L_paint);
    }
    /* a painted bicycle + arrow, lying on the path, pointing along the ride */
    function bikeMark(s, lat) {
      at(s, lat, P1);
      const dx = P1.tx, dz = P1.tz, wx = P1.nx, wz = P1.nz, y = 0.106, col = whiteC;
      const bar = (o0, w0, o1, w1) => { // a line between two points given as (along, across)
        const ax = P1.x + dx * o0 + wx * w0, az = P1.z + dz * o0 + wz * w0, bx = P1.x + dx * o1 + wx * w1, bz = P1.z + dz * o1 + wz * w1;
        const L = Math.hypot(bx - ax, bz - az);
        L_paint.frect((ax + bx) / 2, (az + bz) / 2, (bx - ax) / L, (bz - az) / L, L, 0.07, y, col);
      };
      // side view of a bike drawn across the path (wheels left and right), arrow ahead of it
      const wheel = (wc) => { for (let i = 0; i < 12; i++) { const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2; const pt = (a, rad) => [P1.x + dx * (Math.sin(a) * rad) + wx * (wc + Math.cos(a) * rad), P1.z + dz * (Math.sin(a) * rad) + wz * (wc + Math.cos(a) * rad)]; const A = pt(a0, 0.36), Bq = pt(a1, 0.36), Cq = pt(a1, 0.28), Dq = pt(a0, 0.28); L_paint.fquad(A[0], A[1], Bq[0], Bq[1], Cq[0], Cq[1], Dq[0], Dq[1], y, col); } };
      wheel(-0.55); wheel(0.55);
      bar(0, -0.55, 0.42, -0.15); bar(0.42, -0.15, 0, 0.12); bar(0, 0.12, 0, -0.55); bar(0.42, -0.15, 0.5, 0.42); bar(0.5, 0.42, 0, 0.55); bar(0, 0.12, 0.5, 0.42);
      bar(0.42, -0.15, 0.56, -0.22); bar(0.5, 0.42, 0.62, 0.36);
      // arrow
      bar(1.1, 0, 2.3, 0); bar(2.3, 0, 1.85, -0.36); bar(2.3, 0, 1.85, 0.36);
    }
    pathBits.forEach(([a, b]) => { for (let s = a + 14; s < b - 10; s += 46) { bikeMark(s, -1.9); bikeMark(s + 23, 1.9); } });
    for (let s = 74; s < ROAD_END - 40; s += 78) bikeMark(s, 0);
    (data.humps || [198, 404]).forEach((s0) => { // raised crossings on the road stretch
      stripe(s0, s0 + 3.2, -3.8, 3.8, 0.093, C(PAL.asphaltDark));
      for (let i = 0; i < 7; i++) {
        const l = -3.3 + i * 1.1;
        at(s0 + 0.15, l - 0.38, P1); at(s0 + 0.15, l + 0.38, P2); const b1 = [P1.x, P1.z], b2 = [P2.x, P2.z];
        at(s0 + 1.05, l, P1); L_paint.ftri(b1[0], b1[1], b2[0], b2[1], P1.x, P1.z, 0.106, C(PAL.paint));
        at(s0 + 3.05, l - 0.38, P1); at(s0 + 3.05, l + 0.38, P2); const c1 = [P1.x, P1.z], c2 = [P2.x, P2.z];
        at(s0 + 2.15, l, P1); L_paint.ftri(c1[0], c1[1], c2[0], c2[1], P1.x, P1.z, 0.106, C(PAL.paint));
      }
    });

    /* ---------- facade tiles (one bay wide × one floor high, tiling) ---------- */
    const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    const glass = (ctx, x, y, w, h, a, b) => {
      const gr = ctx.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, a || '#9ccfea'); gr.addColorStop(1, b || '#6fa9cf');
      ctx.fillStyle = gr; rrect(ctx, x, y, w, h, 5); ctx.fill();
      ctx.save(); rrect(ctx, x, y, w, h, 5); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.beginPath(); ctx.moveTo(x + w * 0.1, y + h); ctx.lineTo(x + w * 0.5, y); ctx.lineTo(x + w * 0.72, y); ctx.lineTo(x + w * 0.32, y + h); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    const slats = (ctx, x, y, w, h, col, dark) => {
      ctx.fillStyle = col; rrect(ctx, x, y, w, h, 4); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 2;
      for (let yy = y + 7; yy < y + h - 2; yy += 9) { ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + w - 3, yy); ctx.stroke(); }
    };
    const wallBase = (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(150,135,110,.13)'; ctx.fillRect(0, 0, w, 6); // the floor slab, a soft line
      ctx.fillStyle = 'rgba(150,135,110,.05)'; ctx.fillRect(0, 6, w, 5);
    };
    const frame = (ctx, x, y, w, h) => { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; rrect(ctx, x, y, w, h, 6); ctx.stroke(); ctx.strokeStyle = 'rgba(120,110,95,.25)'; ctx.lineWidth = 1.5; rrect(ctx, x - 3, y - 3, w + 6, h + 6, 8); ctx.stroke(); };
    const sill = (ctx, x, y, w) => { ctx.fillStyle = 'rgba(120,105,85,.22)'; ctx.fillRect(x - 6, y, w + 12, 7); };
    const SH = PAL.shutter;
    const TILES = {
      h1: (ctx) => { wallBase(ctx, 256, 256); glass(ctx, 46, 74, 164, 112); frame(ctx, 46, 74, 164, 112); slats(ctx, 46, 74, 70, 112, SH[0], '#62998a'); sill(ctx, 46, 190, 164); },
      h2: (ctx) => { wallBase(ctx, 256, 256); glass(ctx, 40, 60, 72, 178, '#8cc0de', '#5f97bd'); frame(ctx, 40, 60, 72, 178); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(76, 60); ctx.lineTo(76, 238); ctx.stroke();
        glass(ctx, 150, 84, 66, 92); frame(ctx, 150, 84, 66, 92); slats(ctx, 150, 84, 66, 46, '#d6cdbd', '#b5ab99'); sill(ctx, 150, 180, 66); },
      h3: (ctx) => { wallBase(ctx, 256, 256); [34, 142].forEach((x, i) => { glass(ctx, x, 78, 80, 104); frame(ctx, x, 78, 80, 104); slats(ctx, x + (i ? 44 : 0), 78, 36, 104, SH[1], '#6f8aaa'); sill(ctx, x, 186, 80); }); },
      h4: (ctx) => { wallBase(ctx, 256, 256); glass(ctx, 34, 50, 188, 186, '#a5d6ee', '#74aed2'); ctx.strokeStyle = '#5b6b7c'; ctx.lineWidth = 4; rrect(ctx, 34, 50, 188, 186, 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(97, 50); ctx.lineTo(97, 236); ctx.moveTo(160, 50); ctx.lineTo(160, 236); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(34, 170, 188, 66); },
      h5: (ctx) => { wallBase(ctx, 256, 256); glass(ctx, 60, 70, 136, 118); frame(ctx, 60, 70, 136, 118); slats(ctx, 60, 70, 136, 40, SH[4], '#c97f70'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(128, 110); ctx.lineTo(128, 188); ctx.stroke(); sill(ctx, 60, 192, 136); },
      // ground floors
      g1: (ctx) => { // pilotis: a shady open floor between white columns
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
        const gr = ctx.createLinearGradient(0, 40, 0, 256); gr.addColorStop(0, '#6f7c90'); gr.addColorStop(1, '#93a0b2');
        ctx.fillStyle = gr; ctx.fillRect(24, 44, 208, 212);
        ctx.fillStyle = 'rgba(190,220,240,.55)'; rrect(ctx, 96, 96, 64, 160, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; rrect(ctx, 96, 96, 64, 160, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(128, 96); ctx.lineTo(128, 256); ctx.stroke();
        ctx.fillStyle = 'rgba(120,105,85,.18)'; ctx.fillRect(0, 36, 256, 8);
      },
      g2: (ctx) => { // a closed ground floor with a hedge
        wallBase(ctx, 256, 256); glass(ctx, 70, 60, 116, 96); frame(ctx, 70, 60, 116, 96);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let x = 93; x < 186; x += 23) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 156); ctx.stroke(); }
        ctx.fillStyle = '#7cc473'; rrect(ctx, -10, 190, 276, 80, 26); ctx.fill();
        ctx.fillStyle = '#93d488'; for (let x = 10; x < 256; x += 44) { ctx.beginPath(); ctx.arc(x, 196, 20, 0, 7); ctx.fill(); }
      },
      // offices
      o1: (ctx) => {
        const gr = ctx.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#b4def1'); gr.addColorStop(1, '#84bedc');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(120, 0); ctx.lineTo(190, 0); ctx.lineTo(70, 256); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#eef5f8'; ctx.fillRect(0, 0, 256, 34); ctx.fillStyle = '#f7fbfc'; ctx.fillRect(0, 0, 8, 256); ctx.fillRect(124, 34, 6, 222);
      },
      o2: (ctx) => {
        ctx.fillStyle = '#f6f2ea'; ctx.fillRect(0, 0, 256, 256);
        const gr = ctx.createLinearGradient(0, 96, 0, 226); gr.addColorStop(0, '#86b6d2'); gr.addColorStop(1, '#5f93b6');
        ctx.fillStyle = gr; ctx.fillRect(0, 96, 256, 130);
        ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.moveTo(30, 226); ctx.lineTo(110, 96); ctx.lineTo(160, 96); ctx.lineTo(80, 226); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f6f2ea'; for (let x = 0; x < 256; x += 64) ctx.fillRect(x - 2, 96, 5, 130);
        ctx.fillStyle = 'rgba(120,105,85,.16)'; ctx.fillRect(0, 226, 256, 6);
      },
      o3: (ctx) => { // tall towers: white grid, blue windows
        ctx.fillStyle = '#f4f7f9'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 3; i++) { const gr = ctx.createLinearGradient(0, 40, 0, 236); gr.addColorStop(0, '#9fd0ea'); gr.addColorStop(1, '#73add0'); ctx.fillStyle = gr; rrect(ctx, 14 + i * 82, 44, 64, 190, 6); ctx.fill(); }
      },
      og: (ctx) => { // a glassy lobby
        ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, 256, 256);
        glass(ctx, 14, 52, 228, 204, '#b6e0f2', '#8cc4df'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(128, 52); ctx.lineTo(128, 256); ctx.stroke();
        ctx.fillStyle = '#e9e2d4'; ctx.fillRect(0, 34, 256, 14);
      },
      // public buildings: pale stone, tall windows
      p1: (ctx) => { wallBase(ctx, 256, 256); ctx.fillStyle = 'rgba(150,135,110,.06)'; ctx.fillRect(0, 126, 256, 3); glass(ctx, 96, 44, 64, 176, '#93c4e0', '#6a9fc4'); frame(ctx, 96, 44, 64, 176); },
      // the old Templer houses of Sarona: stone courses, a tall window between green wooden shutters
      t1: (ctx) => {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(150,125,90,.16)'; ctx.lineWidth = 2;
        for (let y = 0, r = 0; y < 256; y += 32, r++) { ctx.beginPath(); ctx.moveTo(0, y + 1); ctx.lineTo(256, y + 1); for (let x = r % 2 ? 32 : 0; x < 256; x += 64) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + 32); } ctx.stroke(); }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(52, 40, 152, 176);
        ctx.fillStyle = 'rgba(160,135,95,.3)'; ctx.fillRect(84, 46, 88, 12);
        glass(ctx, 96, 62, 64, 132, '#8fbfdc', '#5f93b8'); frame(ctx, 96, 62, 64, 132);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(128, 62); ctx.lineTo(128, 194); ctx.moveTo(96, 106); ctx.lineTo(160, 106); ctx.stroke();
        slats(ctx, 58, 60, 34, 136, '#63ad6f', '#3f8a52'); slats(ctx, 164, 60, 34, 136, '#63ad6f', '#3f8a52');
        sill(ctx, 92, 198, 72);
      },
    };
    const SCHOOL_TILE = (ctx) => { // two bays, happy frames
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 256);
      [['#ff8fc0', 38], ['#7de3e0', 294]].forEach(([c, x], i) => {
        glass(ctx, x, 62, 180, 120); ctx.strokeStyle = c; ctx.lineWidth = 12; rrect(ctx, x, 62, 180, 120, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 90, 62); ctx.lineTo(x + 90, 182); ctx.stroke();
        ctx.fillStyle = i ? '#ffd54d' : '#b99cff'; ctx.fillRect(x - 10, 196, 200, 12);
      });
      ctx.fillStyle = '#ffd54d'; ctx.fillRect(0, 236, 512, 20);
    };
    const facade = {};
    Object.keys(TILES).forEach((k) => {
      const tex = K.canvasTex(256, 256, TILES[k], { repeat: true, anisotropy: 8 });
      facade[k] = { buf: new Buf(true), mat: own(new T.MeshLambertMaterial({ map: tex, vertexColors: true })) };
    });
    facade.sc = { buf: new Buf(true), mat: own(new T.MeshLambertMaterial({ map: K.canvasTex(512, 256, SCHOOL_TILE, { repeat: true, anisotropy: 8 }), vertexColors: true })) };

    /* ---------- buildings ---------- */
    const farBuf = new Buf();
    const heaters = []; // solar water heaters on the roofs
    const FLOOR = 3.2;
    const fogC = C(PAL.fog);
    /* a balcony: a slab with a solid parapet and two rounded outer corners */
    function balcony(ax, az, dx, dz, nx, nz, len, dep, y0, y1, col) {
      const r = Math.min(dep * 0.85, len * 0.3), pts = [[0, 0], [0, dep - r]];
      for (let i = 1; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); pts.push([r - Math.cos(a) * r, dep - r + Math.sin(a) * r]); }
      for (let i = 1; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); pts.push([len - r + Math.sin(a) * r, dep - r + Math.cos(a) * r]); }
      pts.push([len, 0]);
      const W = (p) => [ax + dx * p[0] + nx * p[1], az + dz * p[0] + nz * p[1]];
      const top = mul(col, 1.0), under = mul(col, 0.72);
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = W(pts[i]), b = W(pts[i + 1]);
        const ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1;
        let fx = ez / l, fz = -ex / l;
        const mx = (pts[i][0] + pts[i + 1][0]) / 2 - len / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        const ox = dx * mx + nx * my, oz = dz * mx + nz * my; // roughly outward
        if (fx * ox + fz * oz < 0) { fx = -fx; fz = -fz; }
        solid.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [fx, 0, fz], col);
      }
      const o = W(pts[0]);
      for (let i = 1; i + 1 < pts.length; i++) {
        const a = W(pts[i]), b = W(pts[i + 1]);
        solid.tri(o[0], y1, o[1], a[0], y1, a[1], b[0], y1, b[1], 0, 1, 0, top);
        solid.tri(o[0], y0, o[1], a[0], y0, a[1], b[0], y0, b[1], 0, -1, 0, under);
      }
    }
    const RES = ['h1', 'h2', 'h3', 'h5', 'h1', 'h2', 'h4'];
    const TEMPLER = ['#f7ecd0', '#f3e4c2', '#f9f0da'], ROOFTILE = ['#d9634a', '#cf5a42', '#e0705a'];
    /* a red tiled roof for a Templer house: the upright box that fits the footprint best, eaves that hang over it,
       two slopes with gables (or four slopes when o.rf is 'hipped'), a chimney */
    function tileRoof(o, wall) {
      const q = o.p, n = q.length / 2;
      let bl = 0, ax = 1, az = 0; // along the longest wall
      for (let j = 0; j < n; j++) { const k = (j + 1) % n, dx = q[k * 2] - q[j * 2], dz = q[k * 2 + 1] - q[j * 2 + 1], l = Math.hypot(dx, dz); if (l > bl) { bl = l; ax = dx / l; az = dz / l; } }
      const span = () => { const b = [1e9, 1e9, -1e9, -1e9]; for (let j = 0; j < n; j++) { const u = q[j * 2] * ax + q[j * 2 + 1] * az, v = -q[j * 2] * az + q[j * 2 + 1] * ax; b[0] = Math.min(b[0], u); b[1] = Math.min(b[1], v); b[2] = Math.max(b[2], u); b[3] = Math.max(b[3], v); } return b; };
      let b = span();
      if (b[3] - b[1] > b[2] - b[0]) { const t = ax; ax = -az; az = t; b = span(); } // the ridge runs along the long side
      const OV = 0.55, hl = (b[2] - b[0]) / 2 + OV, hw = (b[3] - b[1]) / 2 + OV, cu = (b[0] + b[2]) / 2, cv = (b[1] + b[3]) / 2;
      const ye = o.h + 0.14, rh = Math.min(3.4, hw * 0.66), hip = o.rf === 'hipped' ? Math.min(hl * 0.75, hw) : 0;
      const W = (u, v, y) => [(cu + u) * ax - (cv + v) * az, y, (cu + u) * az + (cv + v) * ax];
      const unit = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
      const col = C(ROOFTILE[hash(o.i, ROOFTILE.length)]), ry = Math.atan2(-az, ax);
      const A = W(-hl, -hw, ye), Bq = W(hl, -hw, ye), Cq = W(hl, hw, ye), D = W(-hl, hw, ye), R0 = W(-hl + hip, 0, ye + rh), R1 = W(hl - hip, 0, ye + rh);
      const c0 = W(0, 0, o.h + 0.07);
      solid.box(c0[0], c0[1], c0[2], hl * 2, 0.14, hw * 2, mix(wall, WHITE, 0.5), ry); // the board under the eaves
      solid.quad(A, Bq, R1, R0, unit(az * rh, hw, -ax * rh), col);
      solid.quad(D, Cq, R1, R0, unit(-az * rh, hw, ax * rh), mul(col, 0.94));
      if (hip) {
        solid.tri(A[0], A[1], A[2], D[0], D[1], D[2], R0[0], R0[1], R0[2], ...unit(-ax * rh, hip, -az * rh), mul(col, 0.9));
        solid.tri(Bq[0], Bq[1], Bq[2], Cq[0], Cq[1], Cq[2], R1[0], R1[1], R1[2], ...unit(ax * rh, hip, az * rh), mul(col, 0.9));
      } else { // gables in the stone of the walls, a little green shutter under the ridge
        [[-1, A, D, R0], [1, Bq, Cq, R1]].forEach(([sg, p1, p2, top]) => {
          solid.tri(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], top[0], top[1], top[2], ax * sg, 0, az * sg, wall);
          const w = W(sg * (hl + 0.02), 0, ye + rh * 0.36);
          solid.box(w[0], w[1], w[2], 0.08, Math.min(0.9, rh * 0.36), 0.6, C('#63ad6f'), ry);
        });
      }
      const rc = W(0, 0, ye + rh + 0.04);
      solid.box(rc[0], rc[1], rc[2], (hl - hip) * 2 + 0.2, 0.14, 0.3, mul(col, 0.82), ry); // the ridge
      const ch = W((hl - hip) * 0.45, hw * 0.3, ye + rh * 0.7 + 0.45);
      solid.box(ch[0], ch[1], ch[2], 0.6, 1.3, 0.6, wall, ry, mul(col, 0.82));
    }
    const balconyPlants = [];
    const SCHOOLC = ['#fff3c4', '#ffd9e6', '#d9f3ff', '#e2f7d5'];
    B.forEach((o) => {
      const q = o.p, n = q.length / 2;
      const ccw = areaOf(q) > 0;
      if (o.far) { // skyline: plain hazy boxes that rise out of the mist
        const d = Math.hypot(centroid(q)[0], centroid(q)[1]);
        const haze = 0.28 + 0.26 * Math.max(0, Math.min(1, (d - 250) / 900));
        const baseC = mix(C(hash(o.i, 2) ? '#9ccbe6' : '#b9d6e6'), fogC, haze);
        for (let j = 0; j < n; j++) {
          const k = (j + 1) % n, ax = q[j * 2], az = q[j * 2 + 1], bx = q[k * 2], bz = q[k * 2 + 1];
          const L = Math.hypot(bx - ax, bz - az) || 1;
          let nx = (bz - az) / L, nz = -(bx - ax) / L;
          if (!ccw) { nx = -nx; nz = -nz; }
          const lit = 0.9 + 0.13 * (nx * sunDir.x + nz * sunDir.z);
          const cT = mul(baseC, lit), cB = mix(cT, fogC, 0.75);
          // two bands so the foot fades into the haze
          const ym = o.base + (o.h - o.base) * 0.45;
          farBuf.quad([ax, o.base, az], [bx, o.base, bz], [bx, ym, bz], [ax, ym, az], [nx, 0, nz], mix(cB, cT, 0.5));
          farBuf.quad([ax, ym, az], [bx, ym, bz], [bx, o.h, bz], [ax, o.h, az], [nx, 0, nz], cT);
          // white floor bands
          if (o.h > 90 && haze < 0.45) for (let y = ym; y < o.h - 6; y += 16) farBuf.quad([ax + nx * 0.4, y, az + nz * 0.4], [bx + nx * 0.4, y, bz + nz * 0.4], [bx + nx * 0.4, y + 3, bz + nz * 0.4], [ax + nx * 0.4, y + 3, az + nz * 0.4], [nx, 0, nz], mix(cT, WHITE, 0.3));
        }
        farBuf.poly(q, o.h, mix(baseC, WHITE, 0.3));
        return;
      }
      if (o.k === 'r') { // a canopy on thin posts
        solid.poly(q, o.h, C('#f3ede2'));
        for (let j = 0; j < n; j++) solid.cyl(q[j * 2], 0, q[j * 2 + 1], 0.09, 0.09, o.h, 5, C('#c9d0d6'), false);
        return;
      }
      const tall = o.h > 34;
      let up, gr, tint, gh, bay;
      if (o.inSchool) { up = 'sc'; gr = 'sc'; tint = C(SCHOOLC[hash(o.i, 4)]); gh = FLOOR; bay = 7.2; }
      else if (o.house) { up = 'h1'; gr = 'g2'; tint = C('#fff6ea'); gh = 3.4; bay = 3.5; }
      else if (o.k === 'o') { up = tall ? (hash(o.i, 3) ? 'o1' : 'o3') : hash(o.i, 2) ? 'o2' : 'o1'; gr = 'og'; tint = tall ? C(['#ffffff', '#eaf6fb', '#f3f1ea'][hash(o.i + 5, 3)]) : C(PAL.wall[hash(o.i, PAL.wall.length)]); gh = 4.4; bay = 3.1; }
      else if (o.k === 'p') { up = 'p1'; gr = 'p1'; tint = C(['#fbf7ee', '#f3efe6', '#fdfaf4'][hash(o.i, 3)]); gh = 4.2; bay = 3.6; }
      else if (o.k === 's') { up = 'g2'; gr = 'g2'; tint = C(PAL.wall[hash(o.i, PAL.wall.length)]); gh = o.h; bay = 3.4; }
      else if (o.k === 't') { up = 't1'; gr = 't1'; tint = C(TEMPLER[hash(o.i, TEMPLER.length)]); gh = o.h / Math.max(1, Math.round(o.h / FLOOR)); bay = 3.6; } // h = up to the eaves
      else { up = RES[hash(o.i, RES.length)]; gr = hash(o.i + 3, 5) < 3 ? 'g1' : 'g2'; tint = mix(C(PAL.wall[hash(o.i + 1, PAL.wall.length)]), WHITE, 0.45); gh = 3.3; bay = 3.5; }
      const top = o.h, base = o.base;
      gh = Math.min(gh, top - base);
      if (base > 0.5) gh = 0; // parts that start high have no ground floor
      const nf = Math.max(0, Math.round((top - base - gh) / FLOOR));
      const closeUp = !low ? o.rd < 60 / thin : o.rd < 32;
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n, ax = q[j * 2], az = q[j * 2 + 1], bx = q[k * 2], bz = q[k * 2 + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 0.05) continue;
        const dx = (bx - ax) / L, dz = (bz - az) / L;
        let nx = dz, nz = -dx;
        if (!ccw) { nx = -nx; nz = -nz; }
        const nb = Math.max(1, Math.round(L / bay)) * (up === 'sc' ? 1 : 1);
        const blank = L < 2.3;
        const u0 = blank ? 0.01 : 0, u1 = blank ? 0.05 : up === 'sc' ? Math.max(0.5, Math.round(L / 3.6) / 2) : nb;
        if (gh > 0) facade[gr].buf.quad([ax, base, az], [bx, base, bz], [bx, base + gh, bz], [ax, base + gh, az], [nx, 0, nz], tint, [u0, 0, u1, 0, u1, 1, u0, 1]);
        if (nf > 0) facade[up].buf.quad([ax, base + gh, az], [bx, base + gh, bz], [bx, top, bz], [ax, top, az], [nx, 0, nz], tint, [u0, 0, u1, 0, u1, nf, u0, nf]);
        // balconies on the walls that look at the route
        if (o.k === 'h' && !o.inSchool && closeUp && L > 6.5 && nf > 0) {
          const mx = (ax + bx) / 2, mz = (az + bz) / 2, r = routeNear(mx, mz);
          const tx = RX[r.s] - mx, tz = RZ[r.s] - mz, tl = Math.hypot(tx, tz) || 1;
          if ((nx * tx + nz * tz) / tl > 0.3) {
            const style = hash(o.i * 7 + j, 4), len = Math.min(L * (style ? 0.62 : 0.84), 10), off = style === 2 ? L - len - 0.6 : style === 3 ? 0.6 : (L - len) / 2;
            const fh = (top - base - gh) / nf, bc = mix(tint, WHITE, 0.55);
            for (let f = 0; f < nf; f++) {
              if (o.house && f === 0) continue;
              const y = base + gh + f * fh;
              balcony(ax + dx * off, az + dz * off, dx, dz, nx, nz, len, 1.25, y - 0.12, y + 1.0, bc);
              if (!low && o.rd < 34 && hash(o.i * 31 + j * 7 + f, 3) === 0) { const a2 = off + len * (0.2 + 0.6 * (hash(o.i + f * 13, 10) / 10)); balconyPlants.push([ax + dx * a2 + nx * 0.85, az + dz * a2 + nz * 0.85, y + 0.95, hash(o.i + f, 5)]); }
            }
          }
        }
      }
      // the roof, a low parapet line, things on it
      const roofC = tall ? C('#dfe7ec') : mix(C(PAL.roof), tint, 0.4);
      if (o.k === 't') tileRoof(o, tint); else solid.poly(q, top, roofC);
      if (o.k === 'h' && !o.inSchool && o.rd < 105 / thin && !low) {
        const bb = o.bb, cnt = 1 + hash(o.i, 3);
        for (let t = 0, placed = 0; t < 12 && placed < cnt; t++) {
          const x = rr(bb[0] + 1.5, bb[2] - 1.5), z = rr(bb[1] + 1.5, bb[3] - 1.5);
          if (!inPoly(x, z, q) || !inPoly(x + 1.2, z, q) || !inPoly(x - 1.2, z, q) || !inPoly(x, z + 1.2, q) || !inPoly(x, z - 1.2, q)) continue;
          heaters.push([x, top, z, hash(o.i + placed, 4) * 0.4 - 0.6]);
          placed++;
        }
        if (hash(o.i, 3) === 0) { const c = centroid(q); if (inPoly(c[0], c[1], q)) solid.box(c[0], top + 1.2, c[1], 3, 2.4, 3, mul(tint, 0.97), hash(o.i, 7) * 0.3); }
      }
      if (tall) { const c = centroid(q); solid.box(c[0], top + 2, c[1], Math.min(10, (o.bb[2] - o.bb[0]) * 0.4), 4, Math.min(10, (o.bb[3] - o.bb[1]) * 0.4), C('#eef3f6'), 0); }
    });

    /* places already taken (trees, poles), and round zones where no tree may stand */
    const treeSpots = new Grid();
    const crowded = (x, z, r) => { const l = treeSpots.at(x, z); for (let i = 0; i < l.length; i++) if (Math.hypot(l[i][0] - x, l[i][1] - z) < r) return true; return false; };
    const reserve = (x, z) => treeSpots.add(x - 4.5, z - 4.5, x + 4.5, z + 4.5, [x, z]);
    const keepOut = (data.keep || []).map((k) => k.slice()); // [x, z, radius]: no tree may stand here (the data may ask for clearings)
    /* how close to the centre line anything solid may reach */
    const hard = (s) => (s < ROAD_END + 3 ? 6.15 : s > GATE_S - 16 ? 5.0 : 3.85);

    /* ---------- our house ---------- */
    const houseB = B.find((o) => o.house);
    const flags = []; // things that wave: { mesh, base (Float32Array), w }
    const sways = []; // things that sway: { obj, amp, speed, phase }
    const signs = []; // collected, drawn into one atlas at the end
    const AT = 1024, ROW = 68, PX = 44;
    const probe = document.createElement('canvas').getContext('2d');
    const plateW = (text, h) => { probe.font = `700 ${PX}px ${K.FONT}`; const w = Math.min(AT - 4, Math.ceil(probe.measureText(text).width) + 52); return [w, (h * w) / (ROW - 6)]; };
    /* a plate at x,y,z looking along (nx,nz). anchor 1 / -1: the point is the plate's edge and it hangs to the viewer's right / left */
    function addSign(text, x, y, z, nx, nz, h, style, anchor) {
      const [w, wM] = plateW(text, h);
      if (anchor) { x += (nz * anchor * wM) / 2; z += (-nx * anchor * wM) / 2; }
      const sg = { text, x, y, z, nx, nz, h, style: style || 'street', w, wM };
      signs.push(sg);
      return sg;
    }
    /* a name plate on a pole beside the ride at s, read by riders coming along. It hangs away from the ride;
       where a building is in the way it goes up high instead. posts = 2: a board on two legs */
    function poleSign(s, text, h, y, style, sides, posts) {
      const P = {}, wM = plateW(text, h)[1];
      for (const sg of sides || [1, -1]) {
        at(s, sg * (clearAt(s) + 0.3), P);
        if (inCross(s) || inBuilding(P.x, P.z, 0.3) || roadEdge(P.x, P.z, true) < 0.2) continue;
        const ox = P.nx * sg, oz = P.nz * sg;
        const blocked = inBuilding(P.x + ox * (wM + 0.2), P.z + oz * (wM + 0.2), 0.3) || inBuilding(P.x + (ox * wM) / 2, P.z + (oz * wM) / 2, 0.3);
        const col = C(posts === 2 ? '#8a6a4f' : '#9aa7b2');
        if (blocked) { // high and centred, clear of heads and cameras
          const yy = Math.max(y, 5.0 + h / 2);
          solid.cyl(P.x, 0, P.z, 0.06, 0.06, yy + h / 2, 6, col, false);
          addSign(text, P.x - P.tx * 0.08, yy, P.z - P.tz * 0.08, -P.tx, -P.tz, h, style);
        } else {
          solid.cyl(P.x, 0, P.z, 0.06, 0.06, y + h / 2 + 0.12, 6, col, false);
          if (posts === 2) solid.cyl(P.x + ox * (wM - 0.1), 0, P.z + oz * (wM - 0.1), 0.06, 0.06, y + h / 2 + 0.12, 6, col, false);
          addSign(text, P.x - P.tx * 0.08 + ox * 0.04, y, P.z - P.tz * 0.08 + oz * 0.04, -P.tx, -P.tz, h, style, sg);
          reserve(P.x + ox * wM * 0.6, P.z + oz * wM * 0.6);
        }
        reserve(P.x, P.z);
        return true;
      }
      return false;
    }
    let houseDoor = null;
    if (houseB) {
      // the wall that looks at the start of the route
      const q = houseB.p, n = q.length / 2, ccw = areaOf(q) > 0;
      let bestW = null;
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n, ax = q[j * 2], az = q[j * 2 + 1], bx = q[k * 2], bz = q[k * 2 + 1], L = Math.hypot(bx - ax, bz - az);
        const d = dseg(RX[0], RZ[0], ax, az, bx, bz);
        if (L > 4 && (!bestW || d < bestW.d)) { let nx = (bz - az) / L, nz = -(bx - ax) / L; if (!ccw) { nx = -nx; nz = -nz; } bestW = { d, ax, az, bx, bz, L, nx, nz, dx: (bx - ax) / L, dz: (bz - az) / L }; }
      }
      const w = bestW, mx = (w.ax + w.bx) / 2, mz = (w.az + w.bz) / 2, ry = Math.atan2(w.nx, w.nz);
      const Wp = (along, out) => [mx + w.dx * along + w.nx * out, mz + w.dz * along + w.nz * out];
      houseDoor = { x: mx, z: mz, nx: w.nx, nz: w.nz };
      const pink = C(PAL.pink), dpink = C('#f06aa6');
      // the door, its frame, a step, a striped awning, a heart
      let p = Wp(0, 0.08); solid.box(p[0], 1.2, p[1], 1.5, 2.4, 0.14, pink, ry);
      p = Wp(0, 0.05); solid.box(p[0], 1.28, p[1], 1.86, 2.62, 0.1, WHITE, ry);
      p = Wp(0.42, 0.17); solid.box(p[0], 1.15, p[1], 0.12, 0.12, 0.08, C(PAL.yellow), ry);
      p = Wp(0, 0.17); solid.addAt(model([g(new T.CylinderGeometry(0.3, 0.3, 0.06, 14), '#bfe6f7', 0, 0, 0, Math.PI / 2, 0, 0)]), p[0], 1.85, p[1], ry, 1);
      p = Wp(0, 0.7); solid.box(p[0], 0.09, p[1], 2.6, 0.18, 1.3, C('#efe6d6'), ry);
      p = Wp(0, 1.25); solid.box(p[0], 0.04, p[1], 2.0, 0.08, 0.5, C('#e7dccb'), ry);
      for (let i = -3; i <= 3; i++) { p = Wp(i * 0.36, 0.62); solid.box(p[0], 2.86 - 0.0, p[1], 0.36, 0.08, 1.25, i % 2 ? WHITE : pink, ry); }
      p = Wp(0, 1.2); solid.box(p[0], 2.72, p[1], 2.52, 0.22, 0.06, dpink, ry);
      // heart above the door
      const heart = (() => {
        const sh = new T.Shape();
        sh.moveTo(0, -0.42); sh.bezierCurveTo(-0.7, 0.05, -0.5, 0.55, -0.22, 0.5); sh.bezierCurveTo(-0.08, 0.48, 0, 0.36, 0, 0.3); sh.bezierCurveTo(0, 0.36, 0.08, 0.48, 0.22, 0.5); sh.bezierCurveTo(0.5, 0.55, 0.7, 0.05, 0, -0.42);
        const geo = new T.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: false, curveSegments: 6 });
        return g(geo, '#ff6f9f', 0, 0, 0);
      })();
      p = Wp(0, 0.1); solid.addAt(heart, p[0], 3.75, p[1], ry, 1.25);
      // flower pots by the door and along the wall
      const pot = (cx, cz, s, fc) => {
        solid.cyl(cx, 0, cz, 0.2 * s, 0.28 * s, 0.42 * s, 7, C('#d98e63'), C('#7a5a45'));
        solid.addAt(model([g(new T.IcosahedronGeometry(0.34 * s, 0), '#6fc46a', 0, 0.6 * s, 0, 0, 0, 0, 1, 0.8, 1, true), g(new T.IcosahedronGeometry(0.16 * s, 0), fc, 0.16 * s, 0.86 * s, 0.05, 0, 0, 0, 1, 1, 1, true), g(new T.IcosahedronGeometry(0.15 * s, 0), fc, -0.18 * s, 0.8 * s, 0.1 * s, 0, 0, 0, 1, 1, 1, true), g(new T.IcosahedronGeometry(0.14 * s, 0), fc, 0, 0.92 * s, -0.14 * s, 0, 0, 0, 1, 1, 1, true)]), cx, 0, cz, 0, 1);
      };
      [[-1.5, 0.75, 1.5, '#ff7fb0'], [1.5, 0.75, 1.5, '#ffd54d'], [-2.6, 0.55, 1.1, '#c79bff'], [2.6, 0.55, 1.1, '#ff9d4d'], [-3.6, 0.5, 1.2, '#ffd54d'], [3.6, 0.5, 1.2, '#ff7fb0']].forEach(([a, o2, s, fc]) => { if (Math.abs(a) < w.L / 2 - 0.4) { const pp = Wp(a, o2); pot(pp[0], pp[1], s, fc); } });
      // a front lawn, a stepping-stone path to the street, a low white fence with a gap, bunting
      const depth = Math.max(3, w.d - KERB - 2.7);
      { const kc = Wp(0, depth * 0.6); keepOut.push([kc[0], kc[1], Math.max(w.L / 2 + 2, depth * 0.6 + 3.5)]); }
      const c0 = Wp(-w.L / 2 - 2.5, 0.1), c1 = Wp(w.L / 2 + 2.5, 0.1), c2 = Wp(w.L / 2 + 2.5, depth), c3 = Wp(-w.L / 2 - 2.5, depth);
      L_area.fquad(c0[0], c0[1], c1[0], c1[1], c2[0], c2[1], c3[0], c3[1], 0.04, C(PAL.grass));
      for (let d = 1.9; d < depth + 0.6; d += 1.05) { p = Wp(Math.sin(d * 1.7) * 0.18, d); L_road.fdisc(p[0], p[1], 0.42, 0.06, C('#f2ead9'), 8); }
      for (let a = -w.L / 2 - 2.4; a <= w.L / 2 + 2.4; a += 0.45) {
        if (Math.abs(a) < 1.3) continue;
        p = Wp(a, depth); solid.box(p[0], 0.42, p[1], 0.14, 0.84, 0.06, WHITE, ry);
      }
      [[-w.L / 2 - 2.4, -1.3], [1.3, w.L / 2 + 2.4]].forEach(([a0, a1]) => { p = Wp((a0 + a1) / 2, depth - 0.04); solid.box(p[0], 0.55, p[1], a1 - a0, 0.07, 0.05, WHITE, ry); });
      [-1.3, 1.3].forEach((a) => { p = Wp(a, depth); solid.box(p[0], 0.6, p[1], 0.2, 1.2, 0.2, WHITE, ry); solid.addAt(model([g(new T.IcosahedronGeometry(0.17, 1), '#ff8fc0', 0, 0, 0)]), p[0], 1.3, p[1], 0, 1); });
      // bunting across the front, from wall corner to corner
      const BUNT = [PAL.pink, PAL.yellow, PAL.teal, PAL.purple, PAL.orange, PAL.green];
      for (let i = 0, nb = Math.floor((w.L - 1) / 0.62); i < nb; i++) {
        const a = -w.L / 2 + 0.6 + i * 0.62, sag = Math.sin((i / (nb - 1)) * Math.PI) * 0.45, pp = Wp(a, 0.12), y = 6.3 - sag, col = C(BUNT[i % BUNT.length]);
        const l = [pp[0] - w.dx * 0.24, pp[1] - w.dz * 0.24], r = [pp[0] + w.dx * 0.24, pp[1] + w.dz * 0.24];
        solid.tri(l[0], y, l[1], r[0], y, r[1], pp[0], y - 0.5, pp[1], w.nx, 0, w.nz, col);
      }
      // a mailbox with a heart balloon that sways
      p = Wp(2.1, depth + 0.1); solid.box(p[0], 0.55, p[1], 0.08, 1.1, 0.08, C('#b9c2cc'), ry); solid.box(p[0], 1.2, p[1], 0.46, 0.3, 0.3, C(PAL.red), ry);
      const bal = new T.Group();
      const balM = new T.Mesh(K.merge([g(new T.CylinderGeometry(0.012, 0.012, 1.7, 4), '#ffffff', 0, 0.85, 0), g(heart, '#ff6f9f', 0, 2.05, -0.08, 0, 0, 0, 1.0, 1.0, 1.6)]), lam());
      owned.geoms.push(balM.geometry);
      bal.add(balM); bal.position.set(p[0], 1.3, p[1]); bal.rotation.y = ry;
      root.add(bal);
      sways.push({ obj: bal, amp: 0.1, speed: 1.3, phase: 0 });
      // "home" plate by the gate
      p = Wp(-2.3, depth + 0.05);
      solid.box(p[0], 0.7, p[1], 0.08, 1.4, 0.08, WHITE, ry);
      addSign('הבית שלנו', p[0] + w.nx * 0.06, 1.55, p[1] + w.nz * 0.06, w.nx, w.nz, 0.62, 'home');
    }

    /* ---------- the school ---------- */
    const info = { roadEnd: ROAD_END, parkLat: 5.0, kerbLat: KERB };
    /* the end of the ride (data.end, or data.school): info.gate = where the route enters its area (22 m before the end when it has none) */
    const dest = data.end || data.school, destArea = dest && dest.a !== undefined ? data.areas[dest.a] : null;
    if (dest) {
      let gs = GATE_S;
      if (destArea) for (let s = Math.floor(LEN - 60); s < NS - 1; s++) if (!inPoly(RX[s], RZ[s], destArea.p) && inPoly(RX[s + 1], RZ[s + 1], destArea.p)) { gs = s + 0.5; break; }
      path.at(gs, P1);
      info.gate = { s: gs, x: P1.x, z: P1.z };
    }
    if (school) {
      const q = school.p, n = q.length / 2;
      // where the route enters the yard
      const gs = info.gate.s, gx = info.gate.x, gz = info.gate.z;
      const GAPW = 5.6; // half width of the opening
      const FENCE = [PAL.pink, PAL.yellow, PAL.teal, PAL.purple, PAL.orange, PAL.green, PAL.blue];
      let pi = 0;
      const posts = [];
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n, ax = q[j * 2], az = q[j * 2 + 1], bx = q[k * 2], bz = q[k * 2 + 1], L = Math.hypot(bx - ax, bz - az);
        const dx = (bx - ax) / L, dz = (bz - az) / L, ry = Math.atan2(dx, dz);
        let run = null;
        for (let d = 0; d <= L; d += 0.5) {
          const x = ax + dx * d, z = az + dz * d, inGap = Math.hypot(x - gx, z - gz) < GAPW || routeNear(x, z).d < 5.8;
          if (inGap) { if (run) { posts.push([run.x1, run.z1]); run = null; } continue;
          }
          if (!run) { run = { x0: x, z0: z }; if (d > 0.4) posts.push([x, z]); }
          run.x1 = x; run.z1 = z;
          solid.box(x, 0.72, z, 0.09, 1.3, 0.3, C(FENCE[pi++ % FENCE.length]), ry);
          if (d + 0.5 <= L) { solid.box(x + dx * 0.25, 1.05, z + dz * 0.25, 0.05, 0.07, 0.5, WHITE, ry); solid.box(x + dx * 0.25, 0.4, z + dz * 0.25, 0.05, 0.07, 0.5, WHITE, ry); }
        }
      }
      // gate posts with a ball on top (the balloon arch of the game goes between them)
      posts.sort((a, b) => Math.hypot(a[0] - gx, a[1] - gz) - Math.hypot(b[0] - gx, b[1] - gz));
      posts.slice(0, 2).forEach((pp, i) => {
        solid.box(pp[0], 1.3, pp[1], 0.6, 2.6, 0.6, C(i ? PAL.teal : PAL.pink), 0);
        solid.box(pp[0], 2.68, pp[1], 0.76, 0.16, 0.76, WHITE, 0);
        solid.addAt(model([g(new T.IcosahedronGeometry(0.34, 1), PAL.yellow, 0, 0, 0)]), pp[0], 3.08, pp[1], 0, 1);
      });
      // the school building: a big name sign on the wall that faces the end of the route, and a door
      const sb = B.filter((o) => o.inSchool).sort((a, b) => a.rd - b.rd)[0];
      const ex = RX[NS - 1], ez = RZ[NS - 1];
      if (sb) {
        const bq = sb.p, bn = bq.length / 2, ccw = areaOf(bq) > 0;
        let bw = null;
        for (let j = 0; j < bn; j++) {
          const k = (j + 1) % bn, ax = bq[j * 2], az = bq[j * 2 + 1], bx = bq[k * 2], bz = bq[k * 2 + 1], L = Math.hypot(bx - ax, bz - az);
          let nx = (bz - az) / L, nz = -(bx - ax) / L;
          if (!ccw) { nx = -nx; nz = -nz; }
          const mx = (ax + bx) / 2, mz = (az + bz) / 2, facing = ((ex - mx) * nx + (ez - mz) * nz) / (Math.hypot(ex - mx, ez - mz) || 1);
          const d = dseg(ex, ez, ax, az, bx, bz);
          if (L > 6 && facing > 0.2 && (!bw || d < bw.d)) {
            // the point of the wall nearest to the end of the ride
            const t = Math.max(0.2, Math.min(0.8, ((ex - ax) * (bx - ax) + (ez - az) * (bz - az)) / (L * L)));
            bw = { d, x: ax + (bx - ax) * t, z: az + (bz - az) * t, nx, nz, dx: (bx - ax) / L, dz: (bz - az) / L };
          }
        }
        if (bw) {
          const ry = Math.atan2(bw.nx, bw.nz);
          addSign('בית הספר ביכורים', bw.x + bw.nx * 0.12, 5.3, bw.z + bw.nz * 0.12, bw.nx, bw.nz, 1.5, 'school');
          solid.box(bw.x + bw.nx * 0.06, 1.35, bw.z + bw.nz * 0.06, 2.6, 2.7, 0.12, C(PAL.blue), ry);
          solid.box(bw.x + bw.nx * 0.1, 1.35, bw.z + bw.nz * 0.1, 0.08, 2.7, 0.1, WHITE, ry);
          solid.box(bw.x + bw.nx * 0.04, 1.45, bw.z + bw.nz * 0.04, 3.0, 2.9, 0.08, C(PAL.yellow), ry);
          solid.box(bw.x + bw.nx * 0.7, 3.1, bw.z + bw.nz * 0.7, 3.8, 0.14, 1.5, C(PAL.pink), ry);
          [-1.75, 1.75].forEach((a) => solid.cyl(bw.x + bw.dx * a + bw.nx * 1.25, 0, bw.z + bw.dz * a + bw.nz * 1.25, 0.09, 0.09, 3.05, 6, WHITE, false));
        }
      }
      // a name board by the gate, facing the riders who come down the street
      path.at(gs - 14, P1);
      const side = ((gx - P1.x) * P1.nx + (gz - P1.z) * P1.nz) > 0 ? 1 : -1; // the school's side of the street
      poleSign(gs - 15, 'בית הספר ביכורים', 0.95, 2.7, 'school', [side], 2);
      // the flag, on the far side of the gate from the board
      const yardSpot = (fn) => { // look for a free place in the yard
        const bb = bboxOf(q);
        for (let t = 0; t < 400; t++) { const x = rr(bb[0] + 2, bb[2] - 2), z = rr(bb[1] + 2, bb[3] - 2); if (inPoly(x, z, q) && !inBuilding(x, z, 2.5) && routeNear(x, z).d > 6 && fn(x, z)) return [x, z]; }
        return null;
      };
      const fp = yardSpot((x, z) => Math.hypot(x - gx, z - gz) < 16 && Math.hypot(x - gx, z - gz) > 7 && routeNear(x, z).d > 6.5 && routeNear(x, z).d < 10);
      if (fp) {
        solid.cyl(fp[0], 0, fp[1], 0.07, 0.05, 7.2, 6, C('#dfe5ea'));
        solid.addAt(model([g(new T.IcosahedronGeometry(0.13, 1), PAL.yellow, 0, 0, 0)]), fp[0], 7.3, fp[1], 0, 1);
        const tex = K.canvasTex(256, 176, (ctx) => {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 176);
          ctx.fillStyle = '#2f5fd0'; ctx.fillRect(0, 22, 256, 22); ctx.fillRect(0, 132, 256, 22);
          ctx.strokeStyle = '#2f5fd0'; ctx.lineWidth = 7; ctx.lineJoin = 'miter';
          const tri = (flip) => { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + (flip ? Math.PI / 2 : -Math.PI / 2); ctx[i ? 'lineTo' : 'moveTo'](128 + Math.cos(a) * 32, 88 + Math.sin(a) * 32); } ctx.closePath(); ctx.stroke(); };
          tri(false); tri(true);
        });
        const geo = new T.PlaneGeometry(2.6, 1.8, 10, 2);
        geo.translate(1.3, 0, 0);
        owned.geoms.push(geo);
        const fm = new T.Mesh(geo, own(new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide })));
        fm.position.set(fp[0], 6.2, fp[1]);
        fm.rotation.y = 0.6;
        root.add(fm);
        flags.push({ mesh: fm, base: geo.attributes.position.array.slice(), w: 2.6 });
      }
      // hopscotch + a painted sun in the yard, and a little playground
      const hp = yardSpot((x, z) => Math.hypot(x - ex, z - ez) < 22 && Math.hypot(x - ex, z - ez) > 9);
      if (hp) {
        const a = rnd() * 3, dx = Math.cos(a), dz = Math.sin(a), wx = -dz, wz = dx;
        const lay = [[0, 0], [1, 0], [2, -0.5], [2, 0.5], [3, 0], [4, -0.5], [4, 0.5], [5, 0], [6, 0]];
        lay.forEach(([o, sd], i) => { L_paint.frect(hp[0] + dx * o * 0.95 + wx * sd * 0.95, hp[1] + dz * o * 0.95 + wz * sd * 0.95, dx, dz, 0.86, 0.86, 0.11, C(RAINBOW[i % RAINBOW.length])); });
      }
      const sp = yardSpot((x, z) => Math.hypot(x - ex, z - ez) > 12 && Math.hypot(x - ex, z - ez) < 30);
      if (sp) { L_paint.fdisc(sp[0], sp[1], 1.5, 0.11, C('#ffd54d'), 16); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; L_paint.frect(sp[0] + Math.cos(a) * 2.3, sp[1] + Math.sin(a) * 2.3, Math.cos(a), Math.sin(a), 0.9, 0.3, 0.11, C('#ffb347')); } }
      const pg = yardSpot((x, z) => Math.hypot(x - ex, z - ez) > 13 && !inBuilding(x, z, 5) && inPoly(x + 4, z, q) && inPoly(x - 4, z, q) && inPoly(x, z + 4, q) && inPoly(x, z - 4, q));
      if (pg) playground(pg[0], pg[1], rnd() * 3);
    }
    function playground(x, z, ry) {
      L_area.fdisc(x, z, 5.2, 0.03, C(PAL.sand), 18);
      // slide
      const m = model([
        g(new T.BoxGeometry(1.3, 0.12, 1.3), PAL.teal, 0, 1.7, 0), g(new T.BoxGeometry(0.1, 1.7, 0.1), PAL.yellow, -0.55, 0.85, -0.55), g(new T.BoxGeometry(0.1, 1.7, 0.1), PAL.yellow, 0.55, 0.85, -0.55),
        g(new T.BoxGeometry(0.1, 1.7, 0.1), PAL.yellow, -0.55, 0.85, 0.55), g(new T.BoxGeometry(0.1, 1.7, 0.1), PAL.yellow, 0.55, 0.85, 0.55),
        g(new T.BoxGeometry(0.9, 0.08, 3.4), PAL.pink, 0, 0.92, 2.1, 0.52, 0, 0), g(new T.BoxGeometry(0.08, 0.3, 3.4), PAL.red, -0.45, 1.02, 2.1, 0.52, 0, 0), g(new T.BoxGeometry(0.08, 0.3, 3.4), PAL.red, 0.45, 1.02, 2.1, 0.52, 0, 0),
        g(new T.ConeGeometry(1.15, 0.9, 4), PAL.purple, 0, 3.0, 0, 0, Math.PI / 4, 0), g(new T.BoxGeometry(0.08, 1.0, 0.08), PAL.yellow, -0.55, 2.2, -0.55), g(new T.BoxGeometry(0.08, 1.0, 0.08), PAL.yellow, 0.55, 2.2, -0.55), g(new T.BoxGeometry(0.08, 1.0, 0.08), PAL.yellow, -0.55, 2.2, 0.55), g(new T.BoxGeometry(0.08, 1.0, 0.08), PAL.yellow, 0.55, 2.2, 0.55),
        // swings
        g(new T.BoxGeometry(3.2, 0.12, 0.12), PAL.blue, -3.4, 2.4, 0), g(new T.BoxGeometry(0.12, 2.5, 0.12), PAL.blue, -4.95, 1.2, 0, 0, 0, -0.12), g(new T.BoxGeometry(0.12, 2.5, 0.12), PAL.blue, -1.85, 1.2, 0, 0, 0, 0.12),
        g(new T.BoxGeometry(0.03, 1.7, 0.03), '#ffffff', -4.0, 1.55, 0), g(new T.BoxGeometry(0.03, 1.7, 0.03), '#ffffff', -3.5, 1.55, 0), g(new T.BoxGeometry(0.6, 0.06, 0.3), PAL.orange, -3.75, 0.7, 0),
        g(new T.BoxGeometry(0.03, 1.7, 0.03), '#ffffff', -3.0, 1.55, 0.25, 0.3, 0, 0), g(new T.BoxGeometry(0.03, 1.7, 0.03), '#ffffff', -2.5, 1.55, 0.25, 0.3, 0, 0), g(new T.BoxGeometry(0.6, 0.06, 0.3), PAL.green, -2.75, 0.76, 0.5),
      ]);
      solid.addAt(m, x, 0, z, ry, 1);
    }
    data.areas.forEach((a) => { if (a.k === 'play' && near(a.p, 200)) { const c = centroid(a.p); if (free(c[0], c[1], 3, 2)) playground(c[0], c[1], rnd() * 3); } });

    /* ---------- trees ---------- */
    // street-name plates where a named street meets the ride
    (function streetSigns() {
      const cur = (s) => { let nm = data.streets[0][1]; data.streets.forEach(([a, n2]) => { if (s >= a) nm = n2; }); return nm; };
      const done = [];
      data.roads.forEach((rd) => {
        if (!rd.n || !(rd.k === 'R' || rd.k === 'T' || rd.k === 'A')) return;
        const q = rd.p;
        let best = null;
        for (let j = 0; j < q.length; j += 2) { const r = routeNear(q[j], q[j + 1]); if (r.d < 9 && r.s > 14 && r.s < LEN - 30 && (!best || r.d < best.d)) best = r; }
        if (!best) return;
        const here = cur(best.s).replace('שדרות ', '');
        if (rd.n.replace('שדרות ', '') === here) return;
        if (done.some((d) => d.n === rd.n && Math.abs(d.s - best.s) < 60)) return;
        done.push({ n: rd.n, s: best.s });
        poleSign(Math.max(4, best.s - rd.w / 2 - 4), rd.n, 0.66, 3.45, 'street');
      });
      // the name of each new stretch, bigger, as you enter it
      data.streets.forEach(([s0, nm], i) => {
        if (i === data.streets.length - 1) return; // the school has its own board
        poleSign(Math.min(LEN - 40, s0 + (i === 0 ? 16 : 20)), nm, 0.84, 3.6, 'street');
      });
    })();
    // landmark boards near the ride (parks, theatres…)
    (data.pois || []).forEach((p) => {
      if (p.k === 'food' || p.k === 'tower' || p.k === 'school') return;
      const r = routeNear(p.x, p.z);
      if (r.d > 135 || r.s < 20 || r.s > LEN - 40) return;
      poleSign(Math.max(10, r.s - 10), p.n, 0.8, 2.5, p.k === 'park' ? 'park' : 'land', [r.lat < 0 ? -1 : 1], 2);
    });

    const trunks = [], canA = [], canB = [], palms = [], bushes = [], shades = [];
    function bush(x, z, size, col, y) {
      const r = routeNear(x, z);
      if (!y && r.d - size * 1.3 < hard(r.s)) return false;
      bushes.push([x, z, size, rnd() * 6, col, y || 0]);
      return true;
    }
    const leaf = () => new T.Color(PAL.leaf[Math.floor(rnd() * PAL.leaf.length)]).offsetHSL(rr(-0.012, 0.012), rr(-0.04, 0.04), rr(0.0, 0.06));
    /* kinds: 0 ficus (wide), 1 tall oval, 2 jacaranda, 3 poinciana, 4 palm */
    function tree(x, z, kind, s) {
      if (crowded(x, z, kind === 4 ? 2.5 : 4.2)) return false;
      for (let i = 0; i < keepOut.length; i++) if (Math.hypot(keepOut[i][0] - x, keepOut[i][1] - z) < keepOut[i][2]) return false;
      const r = routeNear(x, z);
      if (r.s > GATE_S - 14 && r.d < 9.2) return false; // room for the finish arch at the gate
      reserve(x, z);
      s = s || rr(0.85, 1.2);
      if (kind === 4) { palms.push([x, z, s * rr(0.9, 1.15), rnd() * 6]); if (r.d < 70) shades.push([x - sunDir.x * 3, z - sunDir.z * 3, 3.2 * s]); return true; }
      const th = kind === 1 ? rr(5.15, 6.0) : rr(4.75, 5.6), tr = (kind === 0 ? 0.42 : 0.3) * s;
      trunks.push([x, z, tr, th, rnd() * 6]);
      const col = kind === 2 ? new T.Color('#b99cf5').offsetHSL(rr(-0.02, 0.02), 0, rr(-0.03, 0.03)) : kind === 3 ? new T.Color('#ff7d5c').offsetHSL(rr(-0.02, 0.02), 0, rr(-0.03, 0.03)) : leaf();
      (kind === 1 ? canB : canA).push([x, th, z, s * (kind === 3 ? 1.05 : 1), rnd() * 6, col, kind === 3 ? 0.7 : 1]);
      if (r.d < 75) shades.push([x - sunDir.x * 2.4, z - sunDir.z * 2.4, (kind === 1 ? 5 : 7.4) * s]);
      return true;
    }
    const streetKind = () => { const v = rnd(); return v < 0.66 ? 0 : v < 0.84 ? 1 : v < 0.9 ? 2 : v < 0.95 ? 3 : 4; };
    // a little kiosk on the boulevard, a few metres from home
    (function kiosk() {
      const R6 = Math.PI / 6;
      const parts = [
        g(new T.CylinderGeometry(1.5, 1.5, 2.3, 6), '#fff3dd', 0, 1.15, 0, 0, R6, 0, 1, 1, 1, true), g(new T.BoxGeometry(1.45, 0.95, 0.08), '#5b6b7c', 0, 1.6, 1.3), g(new T.BoxGeometry(1.7, 0.08, 0.42), '#ffffff', 0, 1.1, 1.45),
        g(new T.ConeGeometry(2.05, 0.95, 6), PAL.teal, 0, 2.78, 0, 0, R6, 0, 1, 1, 1, true), g(new T.IcosahedronGeometry(0.2, 1), PAL.yellow, 0, 3.35, 0),
        g(new T.CylinderGeometry(0.2, 0.2, 0.08, 8), PAL.red, -0.7, 0.72, 2.25), g(new T.CylinderGeometry(0.04, 0.04, 0.7, 5), '#9aa7b2', -0.7, 0.35, 2.25),
        g(new T.CylinderGeometry(0.2, 0.2, 0.08, 8), PAL.yellow, 0.7, 0.72, 2.25), g(new T.CylinderGeometry(0.04, 0.04, 0.7, 5), '#9aa7b2', 0.7, 0.35, 2.25),
        g(new T.BoxGeometry(0.5, 0.36, 0.36), '#ff9d4d', -1.05, 0.2, 1.75), g(new T.BoxGeometry(0.5, 0.36, 0.36), '#8fd16c', 1.05, 0.2, 1.75),
      ];
      for (let i = -2; i <= 2; i++) parts.push(g(new T.BoxGeometry(0.36, 0.06, 1.05), i % 2 ? '#ffffff' : PAL.red, i * 0.36, 2.32, 1.72, 0.36, 0, 0));
      for (const lat of [-11.5, -13.5, 11.5, 13.5]) {
        at(27, lat, P1);
        if (!free(P1.x, P1.z, 2.4, 1.8) || roadEdge(P1.x, P1.z, false) < 1.6 || crowded(P1.x, P1.z, 3)) continue;
        const sg = lat < 0 ? 1 : -1; // it looks at the road
        solid.addAt(model(parts), P1.x, 0, P1.z, Math.atan2(P1.nx * sg, P1.nz * sg), 1);
        addSign('קיוסק', P1.x - P1.tx * 1.4, 3.7, P1.z - P1.tz * 1.4, -P1.tx, -P1.tz, 0.62, 'cafe');
        reserve(P1.x, P1.z); keepOut.push([P1.x, P1.z, 5]);
        break;
      }
    })();
    // along the ride itself
    const stepT = low ? 20 : 11;
    for (let side = 0; side < 2; side++) {
      const sg = side ? 1 : -1;
      for (let s = 4 + side * 5; s < LEN - 30; s += stepT * rr(0.85, 1.2)) {
        const lat = (clearAt(s) + 0.45) * sg;
        at(s, lat, P1);
        if (inCross(s) || !free(P1.x, P1.z, 0.35, 0.9)) continue;
        const blvd = s < 50;
        tree(P1.x, P1.z, blvd && rnd() < 0.3 ? 4 : streetKind());
        if (blvd || rnd() < 0.5) { at(s + 4, lat + sg * rr(3.6, 4.6), P2); if (free(P2.x, P2.z, 0.6, 0.9)) tree(P2.x, P2.z, blvd ? (rnd() < 0.5 ? 4 : 0) : streetKind()); }
      }
    }
    // along the other streets
    data.roads.forEach((rd) => {
      if (!(rd.k === 'R' || rd.k === 'T' || rd.k === 'A')) return;
      const q = rd.p, palmy = rd.k !== 'R' && rd.n && /שדרות|שאול|קפלן/.test(rd.n);
      let carry = rr(2, 8);
      const step = (low ? 24 : 13) * (rd.k === 'A' ? 1.2 : 1) * thin;
      for (let j = 0; j + 3 < q.length; j += 2) {
        const L = Math.hypot(q[j + 2] - q[j], q[j + 3] - q[j + 1]);
        if (L < 0.1) continue;
        const dx = (q[j + 2] - q[j]) / L, dz = (q[j + 3] - q[j + 1]) / L;
        let d = carry;
        for (; d < L; d += step * rr(0.8, 1.25)) {
          const x = q[j] + dx * d, z = q[j + 1] + dz * d;
          const r = routeNear(x, z);
          if (r.d > 200 / thin || (r.d > 110 / thin && rnd() < 0.45)) continue;
          for (let sg = -1; sg <= 1; sg += 2) {
            const off = rd.w / 2 + rr(1.5, 2.3), tx = x - dz * off * sg, tz = z + dx * off * sg;
            if (free(tx, tz, 0.5, 1.0)) tree(tx, tz, palmy && rnd() < 0.55 ? 4 : streetKind());
          }
        }
        carry = d - L;
      }
    });
    data.trees && (() => { for (let i = 0; i < data.trees.length; i += 2) if (free(data.trees[i], data.trees[i + 1], 0.5, 0.6)) tree(data.trees[i], data.trees[i + 1], 0); })();
    // parks and lawns: thick with trees, bushes and flowers
    const FLOWER = ['#ff8fc0', '#ffd54d', '#c79bff', '#ff9d4d', '#ffffff', '#ff6b8f'];
    data.areas.forEach((a) => {
      if (a.k !== 'park' && a.k !== 'grass') return;
      if (!near(a.p, 210 / thin)) return;
      const bb = bboxOf(a.p), ar = Math.abs(areaOf(a.p)), close = near(a.p, 110 / thin);
      const nT = Math.min(low ? 40 : close ? 85 : 45, Math.round(ar / (a.k === 'park' ? 85 : 150)));
      for (let t = 0, placed = 0; t < nT * 6 && placed < nT; t++) {
        const x = rr(bb[0], bb[2]), z = rr(bb[1], bb[3]);
        if (!inPoly(x, z, a.p) || inWater(x, z) || !free(x, z, 1.5, 1.2) || roadEdge(x, z, false) < 1.0) continue;
        const v = rnd();
        if (tree(x, z, v < 0.5 ? 0 : v < 0.75 ? 1 : v < 0.84 ? 2 : v < 0.9 ? 3 : 4)) placed++;
      }
      if (low || !close) return;
      const nB = Math.min(45, Math.round(ar / 90));
      for (let t = 0; t < nB; t++) {
        const x = rr(bb[0], bb[2]), z = rr(bb[1], bb[3]);
        if (!inPoly(x, z, a.p) || inWater(x, z) || !free(x, z, 0.8, 0.8) || roadEdge(x, z, false) < 0.4) continue;
        const fl = rnd() < 0.45;
        bush(x, z, fl ? rr(0.5, 0.8) : rr(0.8, 1.5), fl ? new T.Color(pick(FLOWER)) : leaf());
      }
    });
    // bougainvillea and hedges along the garden fronts of the homes near the route
    if (!low) B.forEach((o) => {
      if (o.far || o.k !== 'h' || o.rd > 42 / thin || o.inSchool) return;
      const q = o.p, n = q.length / 2, ccw = areaOf(q) > 0;
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n, ax = q[j * 2], az = q[j * 2 + 1], bx = q[k * 2], bz = q[k * 2 + 1], L = Math.hypot(bx - ax, bz - az);
        if (L < 4 || routeNear((ax + bx) / 2, (az + bz) / 2).d > 30 / thin) continue;
        let nx = (bz - az) / L, nz = -(bx - ax) / L;
        if (!ccw) { nx = -nx; nz = -nz; }
        for (let d = rr(0.5, 2); d < L; d += rr(2.2, 4.2)) {
          const out = rr(0.7, 1.5), x = ax + ((bx - ax) * d) / L + nx * out, z = az + ((bz - az) * d) / L + nz * out;
          if (o.house && houseDoor && Math.hypot(x - houseDoor.x, z - houseDoor.z) < 2.6) continue;
          if (!free(x, z, 0.3, 0.5)) continue;
          const v = rnd();
          bush(x, z, rr(0.7, 1.25), v < 0.3 ? new T.Color(rnd() < 0.5 ? '#f062a8' : '#c56be0') : v < 0.4 ? new T.Color(pick(FLOWER)) : leaf());
        }
      }
    });
    // flowers where a park meets the ride
    const parks = data.areas.filter((a) => a.k === 'park');
    if (!low) for (let s = 6; s < LEN - 30; s += 1.25) for (let sg = -1; sg <= 1; sg += 2) {
      at(s, sg * (hard(s) + 1.45 + (Math.round(s / 1.25) % 2) * 0.7), P1);
      if (inCross(s) || !parks.some((a) => inPoly(P1.x, P1.z, a.p)) || !free(P1.x, P1.z, 0.5, 0.4)) continue;
      bush(P1.x, P1.z, rr(0.42, 0.56), new T.Color(FLOWER[Math.round(s / 1.25) % FLOWER.length]));
    }
    // planters with flowers along the bike path
    const planter = model([g(new T.BoxGeometry(1.5, 0.5, 0.6), '#f6efe2', 0, 0.25, 0), g(new T.BoxGeometry(1.36, 0.08, 0.46), '#8a6a4f', 0, 0.5, 0)]);
    if (!low) pathBits.forEach(([a, b]) => {
      for (let s = a + 6, i = 0; s < b - 4; s += 13, i++) {
        const sg = i % 2 ? 1 : -1;
        at(s, sg * 4.95, P1);
        if (inCross(s) || s > GATE_S - 18 || !free(P1.x, P1.z, 0.6, 0.4) || crowded(P1.x, P1.z, 1.6)) continue;
        solid.addAt(planter, P1.x, 0, P1.z, Math.atan2(P1.tx, P1.tz) + Math.PI / 2, 1);
        for (let k2 = -1; k2 <= 1; k2++) bush(P1.x + P1.tx * k2 * 0.45, P1.z + P1.tz * k2 * 0.45, rr(0.36, 0.5), new T.Color(k2 === 0 ? pick(FLOWER) : '#6fc46a'), 0.5);
      }
    });

    balconyPlants.forEach(([x, z, y, c]) => bush(x, z, 0.34, c < 2 ? new T.Color(pick(FLOWER)) : leaf(), y));

    /* tree geometry: faceted blobs, darker underneath; white-ish so the instance colour paints the leaves */
    function blob(list, flatTop) {
      const parts = list.map(([x, y, z, rx, ryy, rz, det]) => {
        const geo = new T.IcosahedronGeometry(1, det === undefined ? 1 : det);
        geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0.3 * x, y, 0.2 * z)), new T.Vector3(rx, ryy, rz)));
        geo.computeVertexNormals();
        return geo;
      });
      const m = K.merge(parts);
      const p = m.attributes.position;
      let y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < p.count; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i += 3) { // per face, so it stays faceted
        const yy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, k = (yy - y0) / (y1 - y0 || 1);
        const v = 0.8 + 0.3 * Math.pow(k, flatTop ? 0.7 : 0.9);
        for (let j = 0; j < 3; j++) { col[(i + j) * 3] = v; col[(i + j) * 3 + 1] = v; col[(i + j) * 3 + 2] = v; }
      }
      m.setAttribute('color', new T.BufferAttribute(col, 3));
      owned.geoms.push(m);
      return m;
    }
    function instanced(geo, mat, list, fill, name) {
      if (!list.length) return null;
      const m = new T.InstancedMesh(geo, mat, list.length);
      const d = new T.Object3D();
      const white = new T.Color(1, 1, 1);
      list.forEach((it, i) => { fill(d, it, i, m); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
      if (!m.instanceColor) for (let i = 0; i < list.length; i++) m.setColorAt(i, white);
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.frustumCulled = false;
      m.name = name || '';
      root.add(m);
      return m;
    }
    const treeMat = lam();
    const gA = blob([[0, 1.75, 0, 3.5, 1.95, 3.4, 1], [2.2, 1.3, 0.9, 2.0, 1.3, 1.9, 0], [-1.9, 1.45, -1.3, 2.2, 1.35, 2.1, 0]]);
    const gB = blob([[0, 2.2, 0, 2.3, 2.7, 2.3, 1], [0.9, 1.2, 0.7, 1.5, 1.4, 1.5, 0], [-0.8, 3.4, -0.4, 1.4, 1.5, 1.4, 0]]);
    const gBush = blob([[0, 0.55, 0, 0.95, 0.72, 0.9, 0], [0.62, 0.42, 0.2, 0.62, 0.5, 0.62, 0]]);
    instanced(gA, treeMat, canA, (d, it, i, m) => { d.position.set(it[0], it[1], it[2]); d.rotation.set(0, it[4], 0); d.scale.set(it[3], it[3] * it[6], it[3]); m.setColorAt(i, it[5]); }, 'canopyA');
    instanced(gB, treeMat, canB, (d, it, i, m) => { d.position.set(it[0], it[1], it[2]); d.rotation.set(0, it[4], 0); d.scale.set(it[3], it[3], it[3]); m.setColorAt(i, it[5]); }, 'canopyB');
    instanced(gBush, treeMat, bushes, (d, it, i, m) => { d.position.set(it[0], it[5] || 0, it[1]); d.rotation.set(0, it[3], 0); d.scale.set(it[2], it[2], it[2]); m.setColorAt(i, it[4]); }, 'bushes');
    const gTrunk = (() => { const geo = K.merge([g(new T.CylinderGeometry(0.7, 1, 1, 6, 1, true), PAL.trunk, 0, 0.5, 0, 0, 0, 0, 1, 1, 1, true), g(new T.CylinderGeometry(0.26, 0.4, 0.5, 4, 1, true), '#9a775a', 0.5, 0.86, 0, 0, 0, -0.75, 1, 1, 1, true)]); owned.geoms.push(geo); return geo; })();
    instanced(gTrunk, treeMat, trunks, (d, it) => { d.position.set(it[0], 0, it[1]); d.rotation.set(0, it[4], 0); d.scale.set(it[2], it[3] + 0.4, it[2]); }, 'trunks');
    const gPalm = (() => {
      const parts = [];
      const tc = '#b99b7a';
      [[0, 0, 0.3, 0.26], [0.12, 3, 0.26, 0.22], [0.3, 6, 0.22, 0.19]].forEach(([x, y, r0, r1], i) => parts.push(g(new T.CylinderGeometry(r1, r0, 3.05, 6), i % 2 ? tc : '#a88a69', x + 0.08, y + 1.5, 0, 0, 0, -0.05, 1, 1, 1, true)));
      const top = [0.48, 9.0];
      for (let i = 0; i < 9; i++) { // fronds: three bent segments each
        const a = (i / 9) * Math.PI * 2, droop = i % 2 ? 0.55 : 0.3;
        let px = top[0], py = top[1], pz = 0, pitch = 0.55 - droop * 0.2;
        for (let sgm = 0; sgm < 3; sgm++) {
          const len = 1.25 - sgm * 0.1, w = [0.5, 0.42, 0.2][sgm];
          const dxh = Math.cos(pitch) * len, dy = Math.sin(pitch) * len;
          const q = new T.PlaneGeometry(len, w * 2);
          q.rotateX(-Math.PI / 2); q.rotateZ(pitch); q.translate(dxh / 2, dy / 2, 0);
          const pg = g(q, sgm === 2 ? '#86cf74' : PAL.palm, 0, 0, 0);
          pg.rotateY(a); pg.translate(px, py, pz);
          parts.push(pg);
          px += Math.cos(a) * dxh; pz += -Math.sin(a) * dxh; py += dy; pitch -= 0.62 + droop * 0.35;
        }
      }
      parts.push(g(new T.IcosahedronGeometry(0.34, 0), '#8a6a4f', top[0], top[1] - 0.15, 0));
      const geo = K.merge(parts);
      owned.geoms.push(geo);
      return geo;
    })();
    instanced(gPalm, lam({ side: T.DoubleSide }), palms, (d, it) => { d.position.set(it[0], 0, it[1]); d.rotation.set(0, it[3], 0); d.scale.set(it[2], it[2], it[2]); }, 'palms');
    /* leafy shade on the ground */
    const shadeTex = K.canvasTex(128, 128, (ctx) => {
      const r2 = K.rng(5);
      for (let i = 0; i < 26; i++) {
        const a = r2() * 7, d = Math.sqrt(r2()) * 38, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, rad = 10 + r2() * 16;
        const gr = ctx.createRadialGradient(x, y, 1, x, y, rad);
        gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    });
    const shadeGeo = new T.PlaneGeometry(1, 1);
    shadeGeo.rotateX(-Math.PI / 2);
    owned.geoms.push(shadeGeo);
    const shadeM = instanced(shadeGeo, own(new T.MeshBasicMaterial({ map: shadeTex, color: '#22365a', transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 })), shades,
      (d, it) => { d.position.set(it[0], 0.13, it[1]); d.rotation.set(0, (it[0] * 7.3) % 6, 0); d.scale.set(it[2] * 1.25, 1, it[2] * 1.25); });
    if (shadeM) shadeM.renderOrder = 2;

    /* ---------- street furniture ---------- */
    // solar water heaters (the Tel Aviv roofline)
    const gHeater = (() => { const geo = K.merge([g(new T.CylinderGeometry(0.3, 0.3, 1.25, 6), '#ffffff', 0, 1.25, -0.45, 0, 0, Math.PI / 2), g(new T.BoxGeometry(1.15, 0.06, 1.7), '#3f5f96', 0, 0.62, 0.35, 0.62, 0, 0), g(new T.BoxGeometry(0.9, 1.0, 0.06), '#c9d0d6', 0, 0.5, -0.45)]); owned.geoms.push(geo); return geo; })();
    instanced(gHeater, treeMat, heaters, (d, it) => { d.position.set(it[0], it[1], it[2]); d.rotation.set(0, it[3] - 0.5, 0); d.scale.set(1.15, 1.15, 1.15); }, 'heaters');
    // lamps along the ride
    const lamps = [];
    for (let s = 12, i = 0; s < LEN - 26; s += 27, i++) {
      const sg = i % 2 ? 1 : -1;
      at(s, sg * (clearAt(s) + 0.15), P1);
      if (inCross(s) || inBuilding(P1.x, P1.z, 0.3) || roadEdge(P1.x, P1.z, true) < 0.3 || crowded(P1.x, P1.z, 1.2)) continue;
      lamps.push([P1.x, P1.z, Math.atan2(-P1.nx * sg, -P1.nz * sg)]);
    }
    const gLamp = (() => { const geo = K.merge([g(new T.CylinderGeometry(0.06, 0.1, 6.6, 6), '#8fa7a0', 0, 3.3, 0), g(new T.BoxGeometry(0.09, 0.09, 1.7), '#8fa7a0', 0, 6.55, 0.8), g(new T.BoxGeometry(0.3, 0.14, 0.62), '#f7f3e6', 0, 6.48, 1.6), g(new T.CylinderGeometry(0.16, 0.2, 0.3, 6), '#7d968f', 0, 0.15, 0)]); owned.geoms.push(geo); return geo; })();
    instanced(gLamp, treeMat, lamps, (d, it) => { d.position.set(it[0], 0, it[1]); d.rotation.set(0, it[2], 0); d.scale.set(1, 1, 1); }, 'lamps');

    const bench = model([g(new T.BoxGeometry(1.7, 0.08, 0.5), '#d2a679', 0, 0.46, 0), g(new T.BoxGeometry(1.7, 0.42, 0.07), '#d2a679', 0, 0.86, -0.24, -0.15, 0, 0), g(new T.BoxGeometry(0.08, 0.46, 0.46), '#6f7d8c', -0.7, 0.23, 0), g(new T.BoxGeometry(0.08, 0.46, 0.46), '#6f7d8c', 0.7, 0.23, 0)]);
    const bin = model([g(new T.BoxGeometry(0.62, 0.92, 0.72), '#45a765', 0, 0.52, 0), g(new T.BoxGeometry(0.68, 0.1, 0.78), '#35894f', 0, 1.02, 0), g(new T.CylinderGeometry(0.1, 0.1, 0.06, 8), '#3c3f4a', -0.25, 0.1, 0.3, 0, 0, Math.PI / 2), g(new T.CylinderGeometry(0.1, 0.1, 0.06, 8), '#3c3f4a', 0.25, 0.1, 0.3, 0, 0, Math.PI / 2)]);
    const busStop = model([
      g(new T.BoxGeometry(3.4, 0.12, 1.5), '#f7f7f4', 0, 2.5, 0), g(new T.BoxGeometry(3.4, 0.16, 0.08), PAL.yellow, 0, 2.5, 0.75), g(new T.BoxGeometry(3.2, 1.7, 0.06), '#bfe3f2', 0, 1.35, -0.7),
      g(new T.BoxGeometry(0.08, 2.5, 0.08), '#9aa7b2', -1.6, 1.25, -0.7), g(new T.BoxGeometry(0.08, 2.5, 0.08), '#9aa7b2', 1.6, 1.25, -0.7), g(new T.BoxGeometry(2.2, 0.07, 0.4), '#d2a679', 0, 0.48, -0.4),
      g(new T.BoxGeometry(0.07, 0.48, 0.07), '#9aa7b2', -1, 0.24, -0.4), g(new T.BoxGeometry(0.07, 0.48, 0.07), '#9aa7b2', 1, 0.24, -0.4),
      g(new T.CylinderGeometry(0.05, 0.05, 2.9, 6), '#9aa7b2', 2.3, 1.45, 0.5), g(new T.BoxGeometry(0.6, 0.6, 0.06), PAL.yellow, 2.3, 2.75, 0.5), g(new T.BoxGeometry(0.36, 0.2, 0.08), '#3a3550', 2.3, 2.78, 0.5),
    ]);
    const bikeDock = (() => {
      const parts = [g(new T.BoxGeometry(6.4, 0.12, 0.5), '#d8dde2', 0, 0.06, 0)];
      for (let i = 0; i < 5; i++) {
        const x = -2.6 + i * 1.3;
        parts.push(g(new T.BoxGeometry(0.16, 0.8, 0.16), '#7ac943', x, 0.4, 0));
        parts.push(g(new T.TorusGeometry(0.3, 0.045, 5, 10), '#3c3f4a', x + 0.35, 0.32, 0.55, 0, Math.PI / 2, 0));
        parts.push(g(new T.TorusGeometry(0.3, 0.045, 5, 10), '#3c3f4a', x + 0.35, 0.32, 1.55, 0, Math.PI / 2, 0));
        parts.push(g(new T.BoxGeometry(0.07, 0.07, 1.05), '#7ac943', x + 0.35, 0.62, 1.05, 0.25, 0, 0));
        parts.push(g(new T.BoxGeometry(0.07, 0.5, 0.07), '#7ac943', x + 0.35, 0.72, 0.62));
        parts.push(g(new T.BoxGeometry(0.46, 0.06, 0.06), '#3c3f4a', x + 0.35, 0.98, 0.62));
        parts.push(g(new T.BoxGeometry(0.18, 0.06, 0.26), '#3c3f4a', x + 0.35, 0.9, 1.4));
      }
      return model(parts);
    })();
    const recycle = model([g(new T.BoxGeometry(1.5, 1.7, 1.1), '#ff9d4d', 0, 0.95, 0), g(new T.BoxGeometry(1.56, 0.1, 1.16), '#e5802f', 0, 1.82, 0), g(new T.BoxGeometry(1.2, 0.5, 0.04), '#ffd9b0', 0, 1.2, 0.56)]);
    const roadDir = (x, z) => { // direction of the nearest car road, and which side we are on
      const list = rGrid.at(x, z);
      let best = null;
      for (let i = 0; i < list.length; i++) { const sg = list[i]; if (!DRIVE[sg[5]] || sg[5] === 'S') continue; const d = dseg(x, z, sg[0], sg[1], sg[2], sg[3]); if (!best || d < best.d) best = { d, sg }; }
      if (!best) return null;
      const sg = best.sg, L = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]) || 1, dx = (sg[2] - sg[0]) / L, dz = (sg[3] - sg[1]) / L;
      const sd = ((x - sg[0]) * -dz + (z - sg[1]) * dx) > 0 ? 1 : -1;
      return { dx, dz, nx: -dz * sd, nz: dx * sd, edge: best.d - sg[4], hw: sg[4], cx: x - -dz * sd * best.d, cz: z - dx * sd * best.d };
    };
    /* stand a prop on the sidewalk next to the nearest road, facing the road */
    function atKerb(x, z, off) {
      const r = roadDir(x, z);
      if (!r) return null;
      const px = r.cx + r.nx * (r.hw + off), pz = r.cz + r.nz * (r.hw + off);
      return { x: px, z: pz, ry: Math.atan2(-r.nx, -r.nz) };
    }
    (data.props || []).forEach((p) => {
      if (p.k === 'bus') { const k = atKerb(p.x, p.z, 2.0); if (k && free(k.x, k.z, 1.2, 0.6)) solid.addAt(busStop, k.x, 0, k.z, k.ry, 1); }
      else if (p.k === 'bikes') { const k = atKerb(p.x, p.z, 1.6) || { x: p.x, z: p.z, ry: 0 }; if (free(k.x, k.z, 1.5, 0.3)) solid.addAt(bikeDock, k.x, 0, k.z, k.ry, 1); }
      else if (p.k === 'bench') { const rn = routeNear(p.x, p.z); if (free(p.x, p.z, 0.8, 0.3) && rn.d > hard(rn.s) + 1.2) solid.addAt(bench, p.x, 0, p.z, rnd() * 6, 1); }
      else if (p.k === 'recycle') { if (free(p.x, p.z, 0.8, 0.3)) solid.addAt(recycle, p.x, 0, p.z, rnd() * 6, 1); }
    });
    // benches and bins along the ride (sparse), benches in the parks
    if (!low) for (let s = 30, i = 0; s < LEN - 40; s += 31, i++) {
      const sg = i % 2 ? -1 : 1, lat = sg * (clearAt(s) + 1.0);
      at(s, lat, P1);
      if (inCross(s) || !free(P1.x, P1.z, 0.7, 0.5) || crowded(P1.x, P1.z, 1.5)) continue;
      solid.addAt(i % 3 === 0 ? bin : bench, P1.x, 0, P1.z, Math.atan2(-P1.nx * sg, -P1.nz * sg), 1);
    }
    data.areas.forEach((a) => {
      if (a.k !== 'park' || !near(a.p, 120) || low) return;
      const bb = bboxOf(a.p);
      for (let t = 0, placed = 0; t < 60 && placed < 5; t++) {
        const x = rr(bb[0], bb[2]), z = rr(bb[1], bb[3]);
        if (!inPoly(x, z, a.p) || inWater(x, z) || !free(x, z, 1, 0.5) || crowded(x, z, 2)) continue;
        { const rn = routeNear(x, z); if (rn.d < hard(rn.s) + 1.2) continue; }
        const e = roadEdge(x, z, false);
        if (e < 0.3 || e > 1.6) continue;
        solid.addAt(bench, x, 0, z, rnd() * 6, 1); placed++;
      }
    });
    // fountains in the ponds
    const jets = [];
    waters.forEach((a) => {
      if (!near(a.p, 180)) return;
      const c = centroid(a.p);
      if (!inPoly(c[0], c[1], a.p)) return;
      const m = new T.Mesh(K.merge([g(new T.ConeGeometry(0.5, 2.6, 7, 1, true), '#eaf8ff', 0, 1.3, 0), g(new T.IcosahedronGeometry(0.42, 0), '#ffffff', 0, 2.6, 0)]), own(new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })));
      owned.geoms.push(m.geometry);
      m.position.set(c[0], 0.05, c[1]);
      root.add(m);
      jets.push(m);
      solid.cyl(c[0], 0, c[1], 0.7, 0.55, 0.3, 10, C('#f4efe2'));
    });
    // café corners: tables, chairs and bright umbrellas
    const UMB = [PAL.red, PAL.yellow, PAL.teal, PAL.pink, PAL.orange];
    const cafeSet = (col) => model([
      g(new T.CylinderGeometry(0.42, 0.42, 0.05, 10), '#ffffff', 0, 0.74, 0), g(new T.CylinderGeometry(0.04, 0.04, 0.74, 5), '#9aa7b2', 0, 0.37, 0), g(new T.CylinderGeometry(0.03, 0.03, 2.3, 5), '#f7f3e6', 0, 1.2, 0),
      g(new T.ConeGeometry(1.25, 0.55, 8), col, 0, 2.45, 0, 0, 0, 0, 1, 1, 1, true),
      g(new T.BoxGeometry(0.4, 0.05, 0.4), col, 0.72, 0.45, 0), g(new T.BoxGeometry(0.4, 0.45, 0.05), col, 0.92, 0.68, 0, 0, Math.PI / 2, 0), g(new T.BoxGeometry(0.05, 0.45, 0.05), '#9aa7b2', 0.72, 0.22, 0),
      g(new T.BoxGeometry(0.4, 0.05, 0.4), col, -0.72, 0.45, 0), g(new T.BoxGeometry(0.4, 0.45, 0.05), col, -0.92, 0.68, 0, 0, Math.PI / 2, 0), g(new T.BoxGeometry(0.05, 0.45, 0.05), '#9aa7b2', -0.72, 0.22, 0),
    ]);
    (data.pois || []).forEach((p, pi) => {
      if (p.k !== 'food') return;
      const r = routeNear(p.x, p.z);
      let cx = p.x, cz = p.z, tx = 1, tz = 0;
      if (r.d < 60) { // pull it to the edge of the sidewalk nearest the route
        const sg = r.lat < 0 ? -1 : 1, lat = sg * Math.max(Math.abs(r.lat), clearAt(r.s) + 1.6);
        at(r.s, lat, P1); cx = P1.x; cz = P1.z; tx = P1.tx; tz = P1.tz;
      }
      let placed = 0;
      for (let i = -1; i <= 1; i++) {
        const x = cx + tx * i * 2.9, z = cz + tz * i * 2.9;
        if (!free(x, z, 0.9, 0.5)) continue;
        solid.addAt(cafeSet(UMB[(pi + i + 5) % UMB.length]), x, 0, z, Math.atan2(tx, tz) + (i ? 0.5 : 0), 1); placed++;
      }
      if (placed && r.d < 60) { // a name board that faces the riders
        const x = cx - tx * 4.6, z = cz - tz * 4.6;
        if (free(x, z, 0.4, 0.3)) { const sgn = r.lat < 0 ? -1 : 1; solid.cyl(x, 0, z, 0.05, 0.05, 3.0, 5, C('#8a6a4f'), false); addSign(p.n, x - tx * 0.06, 2.6, z - tz * 0.06, -tx, -tz, 0.72, 'cafe', sgn); }
      }
    });

    /* ---------- signs ---------- */
    /* all the sign texts in one texture, one mesh */
    const STYLE = {
      street: { bg: '#2f6fd6', fg: '#ffffff', border: '#ffffff' }, park: { bg: '#4fae6a', fg: '#ffffff', border: '#ffffff' }, land: { bg: '#fff8e8', fg: '#5a4a6a', border: '#ffb46b' },
      school: { bg: '#ffd54d', fg: '#4a3f6b', border: '#ffffff' }, cafe: { bg: '#fff3dd', fg: '#a05a3c', border: '#ff9d4d' }, home: { bg: '#ff8fc0', fg: '#ffffff', border: '#ffffff' },
    };
    let signTex = null;
    function layoutSigns() {
      let x = 2, y = 2;
      signs.forEach((sg) => {
        if (x + sg.w > AT - 2) { x = 2; y += ROW; }
        sg.ax = x; sg.ay = y; x += sg.w + 4;
      });
    }
    function drawSigns(ctx) {
      ctx.clearRect(0, 0, AT, AT);
      signs.forEach((sg) => {
        const st = STYLE[sg.style] || STYLE.street, h = ROW - 6;
        rrect(ctx, sg.ax + 3, sg.ay + 3, sg.w - 6, h - 6, 16);
        ctx.fillStyle = st.bg; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = st.border; ctx.stroke();
        ctx.font = `700 ${PX}px ${K.FONT}`; ctx.fillStyle = st.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
        ctx.fillText(sg.text, sg.ax + sg.w / 2, sg.ay + h / 2 + 2, sg.w - 30);
      });
    }
    if (signs.length) {
      layoutSigns();
      signTex = K.canvasTex(AT, AT, drawSigns, { anisotropy: 8 });
      const buf = new Buf(true);
      signs.forEach((sg) => {
        const st = STYLE[sg.style] || STYLE.street, hM = sg.h, wM = sg.wM;
        const rx = sg.nz, rz = -sg.nx; // the viewer's right
        const u0 = sg.ax / AT, u1 = (sg.ax + sg.w) / AT, v1 = 1 - sg.ay / AT, v0 = 1 - (sg.ay + ROW - 6) / AT;
        const a = [sg.x - (rx * wM) / 2, sg.y - hM / 2, sg.z - (rz * wM) / 2], b = [sg.x + (rx * wM) / 2, sg.y - hM / 2, sg.z + (rz * wM) / 2];
        buf.quad(a, b, [b[0], sg.y + hM / 2, b[2]], [a[0], sg.y + hM / 2, a[2]], [sg.nx, 0, sg.nz], WHITE, [u0, v0, u1, v0, u1, v1, u0, v1]);
        solid.box(sg.x - sg.nx * 0.05, sg.y, sg.z - sg.nz * 0.05, wM * 0.97, hM * 0.9, 0.05, C(st.bg), Math.atan2(sg.nx, sg.nz));
      });
      const m = buf.mesh(own(new T.MeshBasicMaterial({ map: signTex, alphaTest: 0.5 })), 'signs');
      if (m) m.frustumCulled = false;
    }

    /* ---------- meshes ---------- */
    L_area.mesh(flatMat(1), 'areas');
    L_road.mesh(flatMat(2), 'roads');
    L_lane.mesh(flatMat(3), 'lanes');
    L_paint.mesh(flatMat(4), 'paint');
    Object.keys(facade).forEach((k) => facade[k].buf.mesh(facade[k].mat, 'facade-' + k));
    solid.mesh(lam(), 'solid');
    const farMesh = farBuf.mesh(own(new T.MeshBasicMaterial({ vertexColors: true, fog: false })), 'skyline');
    if (farMesh) farMesh.renderOrder = -5;

    /* ---------- world ---------- */
    let tris = 0, meshes = 0;
    const parts = {};
    root.traverse((o) => {
      if (!o.isMesh && !o.isSprite) return;
      meshes++;
      if (o.geometry) { const cnt = ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); tris += cnt; if (o.name) parts[o.name] = Math.round(cnt); }
    });
    info.parts = parts;
    Object.assign(info, { meshes, tris: Math.round(tris), buildMs: Math.round(performance.now() - t0), trees: trunks.length + palms.length, moved, dropped });

    const world = {
      group: root, sunDir, info,
      /* may a car be parked at s metres along, on side -1 (left) or 1 (right)? (not at a side street, a driveway or a crossing) */
      parkOk(s, side) { return s > -8 && s < ROAD_END - 8 && !nearGap(side > 0 ? 1 : 0, s, 4); },
      ready: K.fontsReady().then(() => { if (signTex && !world.gone) { drawSigns(signTex.image.getContext('2d')); signTex.needsUpdate = true; } }),
      update(dt, t, camera) {
        if (camera) skyGroup.position.set(camera.position.x, 0, camera.position.z);
        cloudRing.rotation.y = t * 0.004;
        for (let i = 0; i < flags.length; i++) {
          const f = flags[i], pos = f.mesh.geometry.attributes.position, base = f.base;
          for (let v = 0; v < pos.count; v++) { const x = base[v * 3], k = x / f.w; pos.setZ(v, Math.sin(x * 2.6 - t * 5) * 0.16 * k); pos.setY(v, base[v * 3 + 1] + Math.sin(x * 1.7 - t * 3.6) * 0.05 * k); }
          pos.needsUpdate = true;
        }
        for (let i = 0; i < sways.length; i++) { const s = sways[i]; s.obj.rotation.z = Math.sin(t * s.speed + s.phase) * s.amp; s.obj.rotation.x = Math.cos(t * s.speed * 0.7 + s.phase) * s.amp * 0.6; }
        for (let i = 0; i < jets.length; i++) { const k = 0.85 + 0.15 * Math.sin(t * 3 + i * 2); jets[i].scale.set(1, k, 1); }
      },
      dispose() {
        world.gone = true;
        scene.remove(root);
        owned.geoms.forEach((x) => x.dispose());
        owned.texs.forEach((x) => x.dispose());
        owned.mats.forEach((x) => x.dispose());
        root.traverse((o) => { if (o.isInstancedMesh && o.dispose) o.dispose(); });
        scene.fog = prevFog || null;
        scene.background = prevBg || null;
      },
    };
    return world;
  }

  DU.rideWorld = { build };
})();
