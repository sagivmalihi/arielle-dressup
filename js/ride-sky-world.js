/* ride-sky-world.js — the world of the ride to Dinosaur City (needs THREE, ride-kit.js, ride-world.js, ride-sky.js,
   ride-sky-models.js; ride-sky-scene.js adds the scenery of each stretch).

     DU.rideSky.build(scene, data, { quality }) → world      data = DU.rideSky.data()
       world.update(dt, t, camera, s)   s (optional) = where she is; without it the world works it out from the camera
       world.dispose()
       world.sunDir                     unit Vector3 toward the sun (it sinks along the way)
       world.ready                      Promise (the signs are drawn in the game font)
       world.info                       { meshes, tris, buildMs, city: the real city's info, gate, finish, square, deck, … }
       world.parkOk(s, side)            cars may be parked along her street only before the ramp
       world.group                      the Group with everything of the sky in it
       world.heightAt(s)                the height of the road
       world.at(s, lat, up, out)        a point beside the road → out { x, y, z, ry (the way the road runs), pitch }

   Below the clouds the real city is shown (DU.rideWorld, built from DU.RIDE_DATA) with the rainbow ramp rising out
   of her street. Inside the cloud everything goes white; in that moment the city is switched off and the sky is
   switched on. Above, the colours of the sky, the fog and the light follow her along the way:
   blue, then peach and pink, then lilac with the first stars.
   Everything is merged by stretch of the way (about 150 m), so what is behind her is not drawn. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const S = (DU.rideSky = DU.rideSky || {});
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  const HALF = 4.3;          // half the width of the road (she steers ±2.6 m)
  const CHUNK = 150;         // metres of the way in one merged mesh
  const RAINBOW = ['#ff7b8a', '#ffab5e', '#ffe066', '#7fdc9a', '#6fb8ff', '#b79cff'];

  /* the sky along the way. Each row: from which metre it holds, then the colours of the dome from the top down,
     the fog, the clouds (their lit tops and their shade), the light, how high the sun stands, how many stars. */
  const SKIES = [
    { s: 0, top: '#4f9fff', mid: '#9dd4ff', low: '#cfeaff', hor: '#eaf6ff', fog: '#e3f2ff', cloud: '#ffffff', shade: '#c4dcf6', sea: '#d9e9fa',
      hemi: '#ffffff', ground: '#eef2ff', hemiK: 0.8, sun: '#fff3d6', sunK: 0.36, el: 47, glow: '#fff8e0', glowK: 0.25, stars: 0, near: 150, far: 900 },
    { s: 700, top: '#4f9fff', mid: '#9dd4ff', low: '#cfeaff', hor: '#eaf6ff', fog: '#e3f2ff', cloud: '#ffffff', shade: '#c4dcf6', sea: '#d9e9fa',
      hemi: '#ffffff', ground: '#eef2ff', hemiK: 0.8, sun: '#fff3d6', sunK: 0.36, el: 40, glow: '#fff8e0', glowK: 0.25, stars: 0, near: 150, far: 900 },
    { s: 930, top: '#79a8f2', mid: '#f5bfdc', low: '#ffcfb8', hor: '#ffe9bf', fog: '#ffe0cf', cloud: '#fff6ee', shade: '#f2bcd0', sea: '#f9cfd6',
      hemi: '#fff4ec', ground: '#ffdfe6', hemiK: 0.94, sun: '#ffc48a', sunK: 0.5, el: 13, glow: '#ffd27a', glowK: 0.85, stars: 0, near: 140, far: 820 },
    { s: 1230, top: '#6d8fe6', mid: '#eea8d8', low: '#ffb9b0', hor: '#ffd9a6', fog: '#ffd0cc', cloud: '#fff0ec', shade: '#e9a9cf', sea: '#f2bcd3',
      hemi: '#fff0f2', ground: '#f8d2ea', hemiK: 0.96, sun: '#ffb37a', sunK: 0.46, el: 6, glow: '#ffbe6e', glowK: 0.9, stars: 0.05, near: 140, far: 800 },
    { s: 1600, top: '#4a4bb0', mid: '#8b7fe6', low: '#d9a2ee', hor: '#ffc9e6', fog: '#d6b8f2', cloud: '#f4e8ff', shade: '#b39ae6', sea: '#c3a8ec',
      hemi: '#f4ecff', ground: '#d8c6f8', hemiK: 1.0, sun: '#ffc6e2', sunK: 0.3, el: -3, glow: '#ff9fce', glowK: 0.7, stars: 1, near: 130, far: 760 },
  ];
  const COLS = ['top', 'mid', 'low', 'hor', 'fog', 'cloud', 'shade', 'sea', 'hemi', 'ground', 'sun', 'glow'], NUMS = ['hemiK', 'sunK', 'el', 'glowK', 'stars', 'near', 'far'];

  S.build = function (scene, data, opts) {
    opts = opts || {};
    const T = window.THREE, K = DU.rideKit;
    const t0 = performance.now();
    const low = opts.quality === 'low';
    data = data || S.data();
    const DECK = data.deck, L = data.length, M = data.marks;

    /* ---------- the real city, for the take-off ---------- */
    const city = DU.rideWorld.build(scene, DU.RIDE_DATA, opts);
    const root = new T.Group();
    root.name = 'rideSky';
    scene.add(root);
    const under = new T.Group(), above = new T.Group(); // what is seen from the city, what is seen above the clouds
    root.add(under, above);
    const owned = { geoms: [], mats: [], texs: [] };
    const own = (m) => { owned.mats.push(m); if (m.map) owned.texs.push(m.map); return m; };
    const lam = own(new T.MeshLambertMaterial({ vertexColors: true }));
    const lit = own(new T.MeshBasicMaterial({ vertexColors: true }));           // things that glow: they ignore the light
    const flat = own(new T.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); // paint lying on the road

    /* ---------- colours ---------- */
    const cc = {};
    const C = (hex) => cc[hex] || (cc[hex] = (() => { const c = new T.Color(hex); return [c.r, c.g, c.b]; })());
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    SKIES.forEach((k) => COLS.forEach((n) => (k['_' + n] = C(k[n]))));
    /* the sky s metres along the way → { top: [r,g,b], …, el, stars, … } (out is reused) */
    function skyAt(s, out) {
      out = out || {};
      let i = 0;
      while (i < SKIES.length - 2 && s > SKIES[i + 1].s) i++;
      const A = SKIES[i], B = SKIES[i + 1], t = smooth((s - A.s) / (B.s - A.s));
      COLS.forEach((n) => (out[n] = mix(A['_' + n], B['_' + n], t)));
      NUMS.forEach((n) => (out[n] = A[n] + (B[n] - A[n]) * t));
      return out;
    }

    /* ---------- the way ---------- */
    const path = K.path(data);
    const altAt = (s) => S.altAt(data, s);
    const tmp = {};
    /* a point s metres along, lat metres to the right, up metres above the road */
    function at(s, lat, up, out) {
      out = out || {};
      path.at(s, tmp);
      out.x = tmp.x + tmp.nx * (lat || 0); out.z = tmp.z + tmp.nz * (lat || 0); out.y = altAt(s) + (up || 0);
      out.tx = tmp.tx; out.tz = tmp.tz; out.nx = tmp.nx; out.nz = tmp.nz;
      out.ry = Math.atan2(tmp.tx, tmp.tz); out.pitch = Math.atan2(altAt(s + 1) - altAt(s - 1), 2);
      return out;
    }
    /* the nearest point of the sky part of the way (s ≥ from) to x, z → { s, d, lat }. Coarse (every 4 m), for scenery. */
    const R = data.route, NP = R.length / 2;
    function nearWay(x, z, from, to) {
      let best = 1e12, bi = 0;
      for (let i = Math.floor((from || 0) / data.step); i < Math.min(NP, Math.ceil((to || L) / data.step) + 1); i += 2) { const dx = R[i * 2] - x, dz = R[i * 2 + 1] - z, d = dx * dx + dz * dz; if (d < best) { best = d; bi = i; } }
      path.at(bi * data.step, tmp);
      return { s: bi * data.step, d: Math.sqrt(best), lat: (x - tmp.x) * tmp.nx + (z - tmp.z) * tmp.nz };
    }

    /* ---------- triangle soups, one per stretch of the way and material ---------- */
    function Soup() { this.p = []; this.n = []; this.c = []; }
    const SP = Soup.prototype;
    SP.tri = function (a, b, c, col, colB, colC) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
      const cb = colB || col, c3 = colC || col;
      this.c.push(col[0], col[1], col[2], cb[0], cb[1], cb[2], c3[0], c3[1], c3[2]);
    };
    /* a, b, c, d going round (counter-clockwise seen from outside); colours: one, or one for a,b and one for c,d */
    SP.quad = function (a, b, c, d, col, col2) { this.tri(a, b, c, col, col, col2 || col); this.tri(a, c, d, col, col2 || col, col2 || col); };
    /* stamp a painted geometry: scaled (sx, sy, sz), turned by ry, moved to x, y, z; tint: fn(r,g,b,y) → [r,g,b] */
    SP.add = function (geom, x, y, z, ry, sx, sy, sz, tint) {
      const pos = geom.attributes.position.array, nor = geom.attributes.normal.array, col = geom.attributes.color.array;
      sx = sx === undefined ? 1 : sx; sy = sy === undefined ? sx : sy; sz = sz === undefined ? sx : sz;
      const c = Math.cos(ry || 0), s = Math.sin(ry || 0), P = this.p, N = this.n, Cc = this.c;
      for (let i = 0; i < pos.length; i += 3) {
        const px = pos[i] * sx, py = pos[i + 1] * sy, pz = pos[i + 2] * sz;
        P.push(x + px * c + pz * s, y + py, z - px * s + pz * c);
        let nx = nor[i] / sx, ny = nor[i + 1] / sy, nz = nor[i + 2] / sz;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        N.push(nx * c + nz * s, ny, -nx * s + nz * c);
        if (tint) { const q = tint(col[i], col[i + 1], col[i + 2], pos[i + 1]); Cc.push(q[0], q[1], q[2]); } else Cc.push(col[i], col[i + 1], col[i + 2]);
      }
    };
    SP.mesh = function (mat, name) {
      if (!this.p.length) return null;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(this.p), 3));
      g.setAttribute('normal', new T.BufferAttribute(new Float32Array(this.n), 3));
      g.setAttribute('color', new T.BufferAttribute(new Float32Array(this.c), 3));
      g.computeBoundingSphere();
      owned.geoms.push(g);
      const m = new T.Mesh(g, mat);
      m.name = name || ''; m.matrixAutoUpdate = false;
      this.p = this.n = this.c = null;
      return m;
    };
    const soups = {}; // 'layer|chunk|material' → Soup
    const MATS = { lam, lit, flat };
    /* the soup for things near s metres along. layer: 'under' (seen from the city too) or 'above' */
    function soupAt(s, mat, layer) {
      const key = (layer || 'above') + '|' + Math.max(0, Math.floor(s / CHUNK)) + '|' + (mat || 'lam');
      return soups[key] || (soups[key] = new Soup());
    }
    const PIERCE = (() => { for (let s = M.lift; s < L; s += 2) if (altAt(s) >= DECK) return s; return M.clouds; })(); // where the ramp goes into the cloud
    const layerOf = (s) => (s < PIERCE + 30 ? 'under' : 'above');

    /* ---------- light and fog: taken over from the city, so that they can change along the way ---------- */
    const lights = [];
    city.group.traverse((o) => { if (o.isLight) lights.push(o); });
    let hemi = lights.find((o) => o.isHemisphereLight), sun = lights.find((o) => o.isDirectionalLight);
    if (!hemi) hemi = new T.HemisphereLight('#ffffff', '#f6eee2', 0.78);
    if (!sun) { sun = new T.DirectionalLight(K.PAL.sun, 0.36); sun.position.set(0.52, 0.74, 0.43).multiplyScalar(200); }
    root.add(hemi, sun); if (sun.target) root.add(sun.target); // (a hidden group's lights go out: they live with us now)
    const cityLight = { hemi: hemi.color.clone(), ground: hemi.groundColor.clone(), hemiK: hemi.intensity, sun: sun.color.clone(), sunK: sun.intensity, dir: sun.position.clone().normalize() };
    const sunDir = cityLight.dir.clone();
    const SUN_AZ = Math.atan2(cityLight.dir.x, cityLight.dir.z); // the sun keeps its place over the city, and sinks
    const cityFog = scene.fog ? { color: scene.fog.color.clone(), near: scene.fog.near, far: scene.fog.far } : { color: new T.Color(K.PAL.fog), near: 85, far: 430 };
    if (!scene.fog) scene.fog = new T.Fog(cityFog.color.getHex(), cityFog.near, cityFog.far);
    const cityBg = scene.background && scene.background.isColor ? scene.background.clone() : null;
    const WHITE = new T.Color('#f7fbff');

    /* ---------- the dome of the sky above the clouds ---------- */
    const skyGroup = new T.Group();
    above.add(skyGroup);
    const dome = (() => {
      const geo = new T.SphereGeometry(1900, 32, 16), pos = geo.attributes.position, n = pos.count;
      const el = new Float32Array(n), toSun = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        el[i] = Math.asin(clamp(pos.getY(i) / 1900, -1, 1)) / (PI / 2);
        const az = Math.atan2(pos.getX(i), pos.getZ(i));
        toSun[i] = Math.pow(Math.max(0, Math.cos(az - SUN_AZ)), 3); // 1 = looking the sun's way
      }
      geo.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3), 3));
      owned.geoms.push(geo);
      const m = new T.Mesh(geo, own(new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })));
      m.renderOrder = -10; m.frustumCulled = false;
      skyGroup.add(m);
      return { geo, el, toSun, n };
    })();
    function paintDome(k) {
      const col = dome.geo.attributes.color;
      for (let i = 0; i < dome.n; i++) {
        const e = dome.el[i];
        let c;
        if (e <= 0.01) c = k.fog;
        else if (e < 0.07) c = mix(k.fog, k.hor, (e - 0.01) / 0.06);
        else if (e < 0.2) c = mix(k.hor, k.low, (e - 0.07) / 0.13);
        else if (e < 0.42) c = mix(k.low, k.mid, (e - 0.2) / 0.22);
        else c = mix(k.mid, k.top, Math.min(1, (e - 0.42) / 0.4));
        const g = dome.toSun[i] * k.glowK * clamp(1 - Math.abs(e - 0.04) / 0.5, 0, 1); // the warm glow around the low sun
        if (g > 0.003) c = mix(c, k.glow, g * 0.75);
        col.setXYZ(i, c[0], c[1], c[2]);
      }
      col.needsUpdate = true;
    }
    /* the sun: a soft disc; and the moon over Dinosaur City */
    const discTex = K.canvasTex(128, 128, (ctx) => {
      const gr = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.96)'); gr.addColorStop(0.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
    });
    const sunSp = new T.Sprite(own(new T.SpriteMaterial({ map: discTex, fog: false, depthWrite: false, transparent: true })));
    sunSp.renderOrder = -9;
    skyGroup.add(sunSp);
    const moonTex = K.canvasTex(128, 128, (ctx) => {
      const gr = ctx.createRadialGradient(64, 64, 20, 64, 64, 62);
      gr.addColorStop(0, 'rgba(255,250,225,.5)'); gr.addColorStop(1, 'rgba(255,250,225,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(64, 64, 34, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(80, 54, 30, 0, TAU); ctx.fill(); // bite it into a crescent
    });
    const moon = new T.Sprite(own(new T.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false, transparent: true, opacity: 0 })));
    moon.scale.set(300, 300, 1); moon.renderOrder = -9;
    const endDir = at(L - 20, 0, 0, {});
    moon.position.set(endDir.tx * 0.82 + endDir.nx * -0.3, 0.5, endDir.tz * 0.82 + endDir.nz * -0.3).normalize().multiplyScalar(1700);
    skyGroup.add(moon);
    /* the stars: points high in the dome, they come out toward the end */
    const starMat = own(new T.PointsMaterial({ size: 7, sizeAttenuation: true, map: discTex, transparent: true, opacity: 0, depthWrite: false, fog: false, vertexColors: true }));
    (() => {
      const rnd = K.rng(31), pos = [], col = [], n = low ? 110 : 190;
      for (let i = 0; i < n; i++) {
        const az = rnd() * TAU, e = 0.16 + rnd() * rnd() * 1.2, r = 1750, big = rnd() < 0.14 ? 1 : 0.55 + rnd() * 0.3;
        pos.push(Math.sin(az) * Math.cos(e) * r, Math.sin(e) * r, Math.cos(az) * Math.cos(e) * r);
        const c = mix(C('#ffffff'), C(rnd() < 0.5 ? '#ffe9a8' : '#cfe0ff'), rnd() * 0.6); col.push(c[0] * big, c[1] * big, c[2] * big);
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      owned.geoms.push(g);
      const pts = new T.Points(g, starMat);
      pts.frustumCulled = false; pts.renderOrder = -9;
      skyGroup.add(pts);
    })();

    /* inside the cloud: a white veil round the camera, behind everything near (her, the road), in front of the rest */
    const veil = new T.Mesh(new T.SphereGeometry(30, 12, 8), own(new T.MeshBasicMaterial({ color: '#f7fbff', side: T.BackSide, fog: false, transparent: true, opacity: 0, depthWrite: false })));
    owned.geoms.push(veil.geometry);
    veil.renderOrder = -1; veil.visible = false; veil.frustumCulled = false;
    root.add(veil);

    /* ---------- the sea of clouds ---------- */
    /* its floor: one wide disc that follows her, so nothing shows through the gaps */
    const seaMat = own(new T.MeshBasicMaterial({ color: '#ffffff' }));
    const sea = new T.Mesh(new T.CircleGeometry(2300, 40), seaMat);
    owned.geoms.push(sea.geometry);
    sea.rotation.x = -PI / 2; sea.position.y = DECK - 2.5; sea.frustumCulled = false;
    above.add(sea);
    /* puffs: a few squashed balls each. Seen from above only their tops matter, so the far ones are half balls. */
    const puffHalf = K.g(new T.SphereGeometry(1, 8, 4, 0, TAU, 0, PI * 0.56), '#ffffff'), puffFull = K.g(new T.IcosahedronGeometry(1, 1), '#ffffff');
    const skyTmp = {};
    /* a cloud at x, y (its waist), z of width w; part: 'half' | 'full' */
    function cloud(soup, x, y, z, w, rnd, part, sAlong, squash) {
      const k = skyAt(sAlong, skyTmp), top = k.cloud, shade = k.shade, hgt = (squash || 0.5);
      const n = 2 + Math.floor(rnd() * 3), ry = rnd() * TAU, geo = part === 'full' ? puffFull : puffHalf;
      for (let j = 0; j < n; j++) {
        const off = (j - (n - 1) / 2) * w * 0.34, r = w * (0.3 + rnd() * 0.16) * (1 - Math.abs(j - (n - 1) / 2) / (n + 1));
        const ry2 = r * hgt * (0.85 + rnd() * 0.4);
        soup.add(geo, x + Math.cos(ry) * off + (rnd() - 0.5) * w * 0.12, y + (part === 'full' ? ry2 * 0.2 : 0) + (rnd() - 0.5) * 0.6, z + Math.sin(ry) * off + (rnd() - 0.5) * w * 0.12, rnd() * TAU, r * 1.15, ry2, r,
          (r0, g0, b0, py) => mix(shade, top, clamp(0.25 + 0.75 * (part === 'full' ? (py + 1) / 2 : py), 0, 1)));
      }
    }
    (function seaOfClouds() {
      const rnd = K.rng(4601), s0 = PIERCE - 60;
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      for (let i = Math.floor(s0 / data.step); i < NP; i++) { x0 = Math.min(x0, R[i * 2]); x1 = Math.max(x1, R[i * 2]); z0 = Math.min(z0, R[i * 2 + 1]); z1 = Math.max(z1, R[i * 2 + 1]); }
      const REACH = low ? 380 : 520, CELL = low ? 34 : 27;
      for (let gx = x0 - REACH; gx < x1 + REACH; gx += CELL) for (let gz = z0 - REACH; gz < z1 + REACH; gz += CELL) {
        const x = gx + rnd() * CELL, z = gz + rnd() * CELL, q = nearWay(x, z, s0), d = q.d;
        if (d > REACH) continue;
        // near the way every cell has a cloud; further out they thin out and grow
        const keep = d < 110 ? 1 : 110 / d;
        if (rnd() > keep * keep * (low ? 0.8 : 1)) continue;
        const w = (d < 110 ? 16 + rnd() * 16 : 26 + rnd() * 40 + d * 0.06), room = altAt(q.s) - DECK;
        // right under the road the tops stay below it
        let lift = rnd() * 2.2 + (d > 60 ? rnd() * Math.min(9, d * 0.03) : 0);
        const squash = d < 14 ? Math.min(0.5, Math.max(0.12, (room - 2.5) / (w * 0.4))) : 0.42 + rnd() * 0.2;
        if (d < 14) lift = Math.min(lift, Math.max(-2, room - 4 - w * 0.4 * squash));
        cloud(soupAt(q.s, 'lit' + (((gx / CELL) ^ (gz / CELL)) & 1 ? 'A' : 'B'), 'above'), x, DECK - 1.2 + lift, z, w, rnd, 'half', q.s, squash);
      }
    })();
    /* the bank of cloud she rides up into, seen from the street: whole balls around the place where the ramp goes in */
    (function cloudBank() {
      const rnd = K.rng(77), c = at(PIERCE, 0, 0, {}), soup = soupAt(PIERCE, 'lit', 'under');
      const n = low ? 46 : 70;
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, d = 10 + Math.sqrt(rnd()) * 150, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d * 0.8;
        const q = nearWay(x, z, PIERCE - 90, PIERCE + 60);
        if (q.d < 9 && altAt(q.s) < DECK + 6 && altAt(q.s) > DECK - 14) continue; // the hole the ramp goes through
        cloud(soup, x, DECK - 1 + (rnd() - 0.5) * 5 - d * 0.02, z, 22 + rnd() * 30, rnd, 'full', 0, 0.42);
      }
    })();

    /* ---------- the road ---------- */
    /* On the ramp the whole road is a rainbow of six bands. Above the clouds the bands slide out to the two edges
       (red, orange, yellow on her left; green, blue, violet on her right) and the middle, where her three lanes are,
       takes the colour of the stretch, paved in 2 m tiles so that speed shows. The paving glows: it ignores the light. */
    const ROADS = [
      { s: 0, a: '#ffffff', b: '#ffffff', dash: '#ffffff', rim: '#ffffff', gem: '#ffe680', rainbow: 1 },
      { s: PIERCE + 50, a: '#ffffff', b: '#ffffff', dash: '#ffffff', rim: '#ffffff', gem: '#ffe680', rainbow: 1 },
      { s: PIERCE + 110, a: '#ffffff', b: '#edf4ff', dash: '#a9d4ff', rim: '#ffc1dd', gem: '#ffffff', rainbow: 0 },   // the sea of clouds: white
      { s: M.islands - 30, a: '#ffffff', b: '#edf4ff', dash: '#a9d4ff', rim: '#ffc1dd', gem: '#ffffff', rainbow: 0 },
      { s: M.islands + 30, a: '#fff3d8', b: '#ffe8c0', dash: '#ffffff', rim: '#a9ecd4', gem: '#ffffff', rainbow: 0 }, // the islands: warm sand
      { s: M.rings - 30, a: '#fff3d8', b: '#ffe8c0', dash: '#ffffff', rim: '#a9ecd4', gem: '#ffffff', rainbow: 0 },
      { s: M.rings + 30, a: '#e4d6ff', b: '#d5c4ff', dash: '#fff3b0', rim: '#ffe680', gem: '#ff9fcb', rainbow: 0 },   // the volcano: lilac
      { s: M.city - 20, a: '#e4d6ff', b: '#d5c4ff', dash: '#fff3b0', rim: '#ffe680', gem: '#ff9fcb', rainbow: 0 },
      { s: M.city + 40, a: '#fff0a8', b: '#ffe483', dash: '#ffffff', rim: '#ffc1dd', gem: '#ffffff', rainbow: 0 },    // the golden road to the city
      { s: L + 60, a: '#fff0a8', b: '#ffe483', dash: '#ffffff', rim: '#ffc1dd', gem: '#ffffff', rainbow: 0 },
    ];
    const RKEYS = ['a', 'b', 'dash', 'rim', 'gem'];
    ROADS.forEach((k) => RKEYS.forEach((n) => (k['_' + n] = C(k[n]))));
    function roadAt(s, out) {
      let i = 0;
      while (i < ROADS.length - 2 && s > ROADS[i + 1].s) i++;
      const A = ROADS[i], B = ROADS[i + 1], t = smooth((s - A.s) / (B.s - A.s));
      RKEYS.forEach((n) => (out[n] = mix(A['_' + n], B['_' + n], t)));
      out.rainbow = A.rainbow + (B.rainbow - A.rainbow) * t;
      return out;
    }
    const RB = RAINBOW.map(C);
    const ROAD_END = L + 2, SHOULDER = 0.5; // the width of one rainbow band at the edge of the sky road
    const gemGeo = K.g(new T.OctahedronGeometry(1), '#ffffff', 0, 0, 0, 0, 0, 0, 0.16, 0.24, 0.16, true);
    (function road() {
      const TH = 0.42, RIM_W = 0.5, RIM_H = 0.36;
      const a = {}, b = {}, ka = {};
      /* a cross-section point: lat metres to the right, up metres above the road surface */
      const pt = (q, lat, up) => [q.x + q.nx * lat, q.y + up, q.z + q.nz * lat];
      for (let s = M.lift - 2; s < ROAD_END; s += 2) {
        at(s, 0, 0, a); at(s + 2, 0, 0, b);
        // the ramp grows out of the street: at its foot it lies a finger above the asphalt and its rims rise from nothing
        const fa = clamp((s - M.lift) / 6, 0, 1), fb = clamp((s + 2 - M.lift) / 6, 0, 1);
        a.y += 0.035; b.y += 0.035;
        roadAt(s + 1, ka);
        const layer = layerOf(s), slab = soupAt(s, 'lam', layer), glow = soupAt(s, 'lit', layer);
        const tile = (Math.floor(s / 2) & 1) === 0, r = ka.rainbow;
        // where the seven bands begin and end, from her left to her right
        const edge = (j) => { const wide = -HALF + (Math.min(j, 3) + Math.max(0, j - 4)) * ((HALF * 2) / 6), slim = j <= 3 ? -HALF + j * SHOULDER : HALF - (7 - j) * SHOULDER; return slim + (wide - slim) * r; };
        for (let j = 0; j < 7; j++) {
          const l0 = edge(j), l1 = edge(j + 1);
          if (l1 - l0 < 0.01) continue;
          let col = j === 3 ? (tile ? ka.a : ka.b) : RB[j < 3 ? j : j - 1];
          if (j !== 3 && !tile) col = mix(col, [1, 1, 1], 0.14);
          glow.quad(pt(a, l0, 0), pt(a, l1, 0), pt(b, l1, 0), pt(b, l0, 0), col);
        }
        // the slab under it: its sides and its belly (not where it still lies on the street)
        if (altAt(s + 2) > 0.5) {
          const side = mix(ka.rim, [1, 1, 1], 0.4), belly = mix(ka.b, C('#aab8e2'), 0.4), w = HALF + RIM_W, ta = Math.min(TH, a.y - 0.02), tb = Math.min(TH, b.y - 0.02);
          slab.quad(pt(a, -w, 0), pt(b, -w, 0), pt(b, -w, -tb), pt(a, -w, -ta), side);
          slab.quad(pt(a, w, 0), pt(a, w, -ta), pt(b, w, -tb), pt(b, w, 0), side);
          slab.quad(pt(a, -w, -ta), pt(b, -w, -tb), pt(b, w, -tb), pt(a, w, -ta), belly);
        }
        // the glowing rims: a soft rounded kerb on each side, and a gem on it every 6 m
        const rimLo = mix(ka.rim, [1, 1, 1], 0.12), rimHi = mix(ka.rim, [1, 1, 1], 0.7), ha = RIM_H * fa, hb = RIM_H * fb;
        if (hb > 0.01) [-1, 1].forEach((sd) => {
          const i0 = sd * HALF, i1 = sd * (HALF + RIM_W * 0.3), i2 = sd * (HALF + RIM_W * 0.75), i3 = sd * (HALF + RIM_W);
          const q = (p0, p1, p2, p3, c1) => (sd > 0 ? glow.quad(p0, p1, p2, p3, c1) : glow.quad(p1, p0, p3, p2, c1));
          q(pt(a, i0, 0), pt(a, i1, ha), pt(b, i1, hb), pt(b, i0, 0), rimLo);
          q(pt(a, i1, ha), pt(a, i2, ha), pt(b, i2, hb), pt(b, i1, hb), rimHi);
          q(pt(a, i2, ha), pt(a, i3, 0), pt(b, i3, 0), pt(b, i2, hb), rimLo);
          if (fa >= 1 && s % 6 === 0) { const g = pt(a, sd * (HALF + RIM_W * 0.52), RIM_H + 0.26), gc = (s / 6) & 1 ? ka.gem : mix(ka.rim, [1, 1, 1], 0.2); glow.add(gemGeo, g[0], g[1], g[2], a.ry, 1, 1, 1, () => gc); }
        });
        // the lane dashes (on the rainbow the bands themselves are the lanes)
        if (r < 0.5 && (Math.floor(s / 2) % 3) === 0) {
          const paint = soupAt(s, 'flat', layer);
          [-0.875, 0.875].forEach((l) => paint.quad(pt(a, l - 0.09, 0.012), pt(a, l + 0.09, 0.012), pt(b, l + 0.09, 0.012), pt(b, l - 0.09, 0.012), ka.dash));
        }
      }
    })();

    /* ---------- the scenery of each stretch (ride-sky-scene.js) ---------- */
    const movers = []; // { s, r, update(dt, t, sNow) } — animated things; only those near her are moved
    const kit = { T, K, data, DECK, L, M, PIERCE, HALF, low, C, mix, at, altAt, nearWay, skyAt, roadAt, soupAt, layerOf, Soup, cloud, own, owned, under, above, movers, lam, lit, flat, RAINBOW, RB, info: {} };
    let scenery = null;
    if (S.scenery) { try { scenery = S.scenery(kit); } catch (e) { console.error('sky scenery failed', e); } }

    /* ---------- meshes ---------- */
    const bob = []; // the clouds of the sea breathe: two sets, out of step
    Object.keys(soups).forEach((key) => {
      const [layer, chunk, mat] = key.split('|');
      const cloudSet = mat === 'litA' || mat === 'litB';
      const m = soups[key].mesh(cloudSet ? lit : MATS[mat], 'sky-' + mat + '-' + chunk);
      if (!m) return;
      if (cloudSet) { m.matrixAutoUpdate = true; bob.push({ m, ph: (mat === 'litA' ? 0 : PI) + chunk * 0.7 }); }
      (layer === 'under' ? under : above).add(m);
    });

    /* ---------- the world ---------- */
    let tris = 0, meshes = 0;
    root.traverse((o) => {
      if (!o.isMesh && !o.isSprite && !o.isPoints) return;
      meshes++;
      if (o.geometry && o.isMesh) tris += ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
    });
    const gate = at(M.gate, 0, 0, {}), fin = at(L, 0, 0, {});
    const info = Object.assign({
      meshes, tris: Math.round(tris), buildMs: 0, city: city.info, deck: DECK, pierce: PIERCE,
      roadEnd: M.lift, parkLat: city.info.parkLat, kerbLat: city.info.kerbLat, halfWidth: HALF,
      gate: { s: M.gate, x: gate.x, y: gate.y, z: gate.z }, finish: { s: L, x: fin.x, y: fin.y, z: fin.z },
    }, kit.info);

    const now = {}, col = new T.Color(), v3 = new T.Vector3();
    let sNow = 0, sIdx = 0, lastPaint = -1e9, isAbove = null;
    /* where along the way is she? the route point nearest to the camera, searched from the last one (the camera
       rides 5 m behind her) */
    function follow(camera) {
      const x = camera.position.x, z = camera.position.z, y = camera.position.y;
      const dAt = (i) => { const dx = R[i * 2] - x, dz = R[i * 2 + 1] - z, dy = (data.alt[i] - y) * 0.6; return dx * dx + dz * dz + dy * dy; };
      let best = dAt(sIdx), bi = sIdx;
      for (let i = Math.max(0, sIdx - 12); i <= Math.min(NP - 1, sIdx + 40); i++) { const d = dAt(i); if (d < best) { best = d; bi = i; } }
      if (best > 30 * 30) for (let i = 0; i < NP; i += 2) { const d = dAt(i); if (d < best) { best = d; bi = i; } } // the camera jumped: look everywhere
      sIdx = bi;
      return Math.min(L, bi * data.step + 5);
    }

    const world = {
      group: root, sunDir, info, city,
      heightAt: altAt, at, skyAt,
      parkOk(s, side) { return s < M.lift - 14 && !!(city.parkOk && city.parkOk(s, side)); },
      ready: Promise.all([city.ready, K.fontsReady().then(() => { if (scenery && scenery.fonts && !world.gone) scenery.fonts(); })]),
      update(dt, t, camera, s) {
        if (camera) sNow = s === undefined ? follow(camera) : s;
        const camY = camera ? camera.position.y : 0;
        // inside the cloud everything is white; that is when the city and the sky change places
        const up = camY > DECK - 1;
        if (up !== isAbove) { isAbove = up; city.group.visible = !up; above.visible = up; }
        const white = sNow > M.lift ? smooth(1 - Math.abs(camY - (DECK - 1)) / 11) : 0;
        skyAt(sNow, now);
        const f = scene.fog;
        if (up) { f.color.setRGB(now.fog[0], now.fog[1], now.fog[2]); f.near = now.near; f.far = now.far; }
        else { f.color.copy(cityFog.color); f.near = cityFog.near; f.far = cityFog.far; }
        if (white > 0) { f.color.lerp(WHITE, white); f.near += (1 - f.near) * white; f.far += (34 - f.far) * white; }
        if (scene.background && scene.background.isColor) scene.background.copy(f.color);
        // the light
        if (up) {
          hemi.color.setRGB(now.hemi[0], now.hemi[1], now.hemi[2]); hemi.groundColor.setRGB(now.ground[0], now.ground[1], now.ground[2]); hemi.intensity = now.hemiK;
          sun.color.setRGB(now.sun[0], now.sun[1], now.sun[2]); sun.intensity = now.sunK;
          const e = (Math.max(now.el, 9) * PI) / 180; // the light never comes from below the clouds
          sunDir.set(Math.sin(SUN_AZ) * Math.cos(e), Math.sin(e), Math.cos(SUN_AZ) * Math.cos(e));
        } else {
          hemi.color.copy(cityLight.hemi); hemi.groundColor.copy(cityLight.ground); hemi.intensity = cityLight.hemiK;
          sun.color.copy(cityLight.sun); sun.intensity = cityLight.sunK; sunDir.copy(cityLight.dir);
        }
        if (camera) {
          sun.position.copy(sunDir).multiplyScalar(200).add(camera.position); sun.target.position.copy(camera.position);
          skyGroup.position.copy(camera.position); veil.position.copy(camera.position);
          sea.position.x = camera.position.x; sea.position.z = camera.position.z;
        }
        veil.visible = white > 0.01; veil.material.opacity = white;
        if (up) {
          if (Math.abs(sNow - lastPaint) > 3) { lastPaint = sNow; paintDome(now); }
          seaMat.color.setRGB(now.sea[0], now.sea[1], now.sea[2]);
          const e = (now.el * PI) / 180, sz = 420 + 380 * clamp(1 - now.el / 40, 0, 1);
          sunSp.position.set(Math.sin(SUN_AZ) * Math.cos(e), Math.sin(e), Math.cos(SUN_AZ) * Math.cos(e)).multiplyScalar(1700);
          sunSp.scale.set(sz, sz, 1);
          sunSp.material.color.setRGB(now.glow[0], now.glow[1], now.glow[2]).lerp(col.set('#ffffff'), 0.45);
          starMat.opacity = now.stars; moon.material.opacity = smooth(now.stars * 1.2);
          for (let i = 0; i < bob.length; i++) { const b = bob[i]; b.m.position.y = Math.sin(t * 0.5 + b.ph) * 0.55; }
        }
        for (let i = 0; i < movers.length; i++) { const m = movers[i]; if (Math.abs(m.s - sNow) < (m.r || 260) && (m.under ? !up || sNow < PIERCE + 60 : up)) m.update(dt, t, sNow, camera); }
        if (!up && city.update) city.update(dt, t, camera);
      },
      dispose() {
        world.gone = true;
        scene.remove(root);
        if (scenery && scenery.dispose) scenery.dispose();
        owned.geoms.forEach((x) => x.dispose());
        owned.texs.forEach((x) => x.dispose());
        owned.mats.forEach((x) => x.dispose());
        city.group.visible = true;
        scene.fog.color.copy(cityFog.color); scene.fog.near = cityFog.near; scene.fog.far = cityFog.far;
        if (cityBg && scene.background && scene.background.isColor) scene.background.copy(cityBg);
        city.dispose();
      },
    };
    info.buildMs = Math.round(performance.now() - t0);
    info.skyMs = info.buildMs - (city.info.buildMs || 0);
    return world;
  };
})();
