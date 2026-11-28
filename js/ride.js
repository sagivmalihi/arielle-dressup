/* ride.js — the bike ride: a small 3D game along a baked route. Where she rides to is a "place" (places.js):
   the school through the real streets (ride-data.js), and whatever other places register themselves.
     DU.ride.start({ state, bike, place, veil, run, quality,
                     onReward(stars, info), onExit(), onGarage(), onPlaces(state), onSchool(state) }) → { stop() }
   place = a place id ('school' when left out). onPlaces: the end card gets a "another place" button.
   onSchool: at the school the end card gets the door ("להיכנס לבית הספר").
   The city comes from ride-world.js, the girl and her bike from ride-rider.js, the stars, cones,
   pigeons, cars and people from ride-models.js. This file is the game itself: the path, the camera,
   steering, what lies on the road, the traffic lights, the HUD, the arrival.
   What differs from place to place is in DU.RIDE_PLACE[id] (the contract is written at the top of places.js);
   the school's own entry and the standard pieces (DU.ride.std) are defined here.
   Everything here is loaded only when a ride starts (see loadRide in app.js). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const tone = (f, o) => { if (DU.sound && DU.sound.tone) DU.sound.tone(f, o); };
  const ico = (name) => (DU.icon && DU.icon(name)) || '';

  const CRUISE = 6.4;      // m/s: the speed she sets off at
  const VMAX = 32;         // m/s: flat out, about 115 km/h (she chooses her speed with ▲ and ▼)
  const CAM_BACK = 4.9, CAM_UP = 2.55; // the chase camera: metres behind her and above the road
  const LAT_MAX = 2.6;     // how far from the middle of the way she can steer
  const LANES = [-1.75, 0, 1.75];
  const VALUE = { star: 1, bigstar: 10, heart: 5, gem: 5 };

  /* ---------- small drawn icons for the HUD ---------- */
  const svg = (inner, vb = '0 0 48 48') => `<svg class="du-ico" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
  const ICON = {
    bike: svg('<g fill="none" stroke="#4b3564" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="32" r="8.5" fill="#fff"/><circle cx="37" cy="32" r="8.5" fill="#fff"/><path d="M11 32L19 17H31L37 32M19 17L25 32H11M31 17L29 11H34M16 12H22" stroke="#ff5fa2"/></g>'),
    school: svg('<g stroke="#4b3564" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M6 42V22L24 11L42 22V42Z" fill="#ffd24d"/><path d="M19 42V30H29V42" fill="#8b6cf0"/><path d="M24 11V3H33L30.5 6L33 9H24" fill="#ff5fa2"/><rect x="10" y="26" width="6" height="6" rx="1" fill="#fff"/><rect x="32" y="26" width="6" height="6" rx="1" fill="#fff"/></g>'),
    left: svg('<path d="M30 8L13 24L30 40" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'),
    right: svg('<path d="M18 8L35 24L18 40" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'),
    jump: svg('<path d="M24 38V12M11 23L24 9L37 23" fill="none" stroke="#fff" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>'),
    fast: svg('<path d="M10 25L24 11L38 25M10 39L24 25L38 39" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'),
    slow: svg('<path d="M10 9L24 23L38 9M10 23L24 37L38 23" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'),
    rocket: svg('<g stroke="#4b3564" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M17 31C15 20 21 9 32 5C36 16 32 27 23 34Z" fill="#fff"/><path d="M17 31L10 30L16 22M23 34L25 41L31 33" fill="#ff5fa2"/><circle cx="26.500" cy="17" r="4" fill="#7de3e0"/><path d="M15 34C10 35 8 39 7 43C11 42 15 41 17 37" fill="#ffd24d"/></g>'),
    bell: svg('<g stroke="#4b3564" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"><path d="M9 34C13 31 12 26 13 20C14 13 18 9 24 9C30 9 34 13 35 20C36 26 35 31 39 34Z" fill="#ffd24d"/><path d="M20 38C21 41 27 41 28 38" fill="none"/><path d="M24 9V5" fill="none"/><path d="M17 17C18 14 20 13 22 12.5" fill="none" stroke="#fff"/></g>'),
    flag: svg('<g stroke="#4b3564" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M12 44V5" fill="none" stroke-width="3.4"/><path d="M12 7H38L32 15.5L38 24H12Z" fill="#ff5fa2"/><circle cx="12" cy="5" r="2.6" fill="#ffd24d"/><path d="M5 44H20" fill="none"/></g>'),
    pin: svg('<g stroke="#4b3564" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M24 44C15 32 10 26 10 19A14 14 0 0 1 38 19C38 26 33 32 24 44Z" fill="#8b6cf0"/><circle cx="24" cy="19" r="5.500" fill="#fff"/></g>'),
    door: svg('<g stroke="#4b3564" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M6 43H42" fill="none"/><path d="M12 43V7H36V43" fill="#fff"/><path d="M12 7L28 11V46L12 43Z" fill="#ffd24d"/><circle cx="23.500" cy="27" r="2" fill="#4b3564" stroke="none"/></g>'),
    red: svg('<circle cx="24" cy="24" r="17" fill="#ff5a5a" stroke="#fff" stroke-width="5"/>'),
    green: svg('<circle cx="24" cy="24" r="17" fill="#3fd07a" stroke="#fff" stroke-width="5"/>'),
  };

  /* ---------- stand-ins, so the ride still runs if a part failed to load ---------- */
  function fallbackModel(T, K, kind) {
    const col = { star: '#ffd54d', bigstar: '#ffd54d', heart: '#ff8fc0', gem: '#7de3e0', cone: '#ff9d4d', puddle: '#7fd0ee', car: '#8fb7ff', taxi: '#ffffff', bus: '#63c98a', light: '#3a3550', arch: '#ff8fc0' }[kind] || '#b99cff';
    const g = new T.Group();
    let m;
    if (VALUE[kind]) { m = new T.Mesh(new T.OctahedronGeometry(0.32), K.mat(col)); m.position.y = 0.9; g.userData.update = (dt) => (m.rotation.y += dt * 3); g.userData.collect = () => (g.userData.gone = true); }
    else if (kind === 'car' || kind === 'taxi') { m = new T.Mesh(new T.BoxGeometry(1.7, 1.3, 4.1), K.mat(col)); m.position.y = 0.75; }
    else if (kind === 'bus') { m = new T.Mesh(new T.BoxGeometry(2.5, 3, 11), K.mat(col)); m.position.y = 1.6; }
    else if (kind === 'puddle') { m = new T.Mesh(new T.CircleGeometry(1.1, 18), K.mat(col)); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; }
    else if (kind === 'light') { m = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 3.4, 8), K.mat(col)); m.position.y = 1.7; const lamp = new T.Mesh(new T.SphereGeometry(0.28, 12, 8), new T.MeshBasicMaterial({ color: '#ff5a5a' })); lamp.position.y = 3.4; g.add(lamp); g.userData.set = (s) => lamp.material.color.set(s === 'green' ? '#3fd07a' : '#ff5a5a'); }
    else if (kind === 'arch') { m = new T.Mesh(new T.TorusGeometry(4.6, 0.4, 8, 24, Math.PI), K.mat(col)); }
    else { m = new T.Mesh(new T.CylinderGeometry(0.25, 0.3, 0.8, 10), K.mat(col)); m.position.y = 0.4; }
    g.add(m);
    Object.assign(g.userData, { kind, r: kind === 'puddle' ? 1.1 : 0.4, h: 0.8 });
    return g;
  }
  function fallbackWorld(T, K, scene, data) {
    scene.background = new T.Color(K.PAL.skyMid);
    scene.fog = new T.Fog(K.PAL.fog, 80, 420);
    scene.add(new T.HemisphereLight('#ffffff', '#d9c7a6', 0.6));
    const sun = new T.DirectionalLight(K.PAL.sun, 0.5); sun.position.set(40, 80, 30); scene.add(sun);
    const ground = new T.Mesh(new T.PlaneGeometry(4000, 4000), K.mat(K.PAL.pavement)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const P = K.path(data), pos = [];
    for (let s = -10; s < P.length + 10; s += 2) {
      const a = P.at(s), b = P.at(s + 2), w = 3.8, ya = a.y + 0.02, yb = b.y + 0.02;
      pos.push(a.x - a.nx * w, ya, a.z - a.nz * w, a.x + a.nx * w, ya, a.z + a.nz * w, b.x + b.nx * w, yb, b.z + b.nz * w, a.x - a.nx * w, ya, a.z - a.nz * w, b.x + b.nx * w, yb, b.z + b.nz * w, b.x - b.nx * w, yb, b.z - b.nz * w);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    scene.add(new T.Mesh(geo, K.mat(K.PAL.asphalt, { side: T.DoubleSide })));
    return { update() {}, dispose() {} };
  }
  function fallbackRider(T, K) {
    const group = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(0.4, 1.2, 0.2), K.mat(K.PAL.pink)); body.position.y = 0.9; group.add(body, K.blob(0.6));
    return { group, height: 1.5, update(dt, o) { group.rotation.z = -o.steer * 0.15; }, pose() {}, bell() {}, dispose() {} };
  }

  /* ---------- what lies on the way ----------
     levelKit(P, rnd) → the tools a level is made with. Every tool adds to kit.items; a level hook returns that list.
       star(s, lat, y, kind)   kind: 'star' | 'bigstar' | 'heart' | 'gem'        line(s, n, lat, gap)
       zig(s, n, amp, gap)     arc(s, lat, n, len)  (stars over a hop)            ob(kind, s, lat, extra)
       beat(name, s)           one ready-made bit of about 24 m (the names are the keys of kit.BEATS)
       zone({ a, b, list, teach, fixed })   fills a…b with beats from list (shuffled; fixed = in order; teach = these first) */
  function levelKit(P, rnd) {
    const items = [];
    const star =(s, lat, y = 0, kind = 'star') => items.push({ type: 'star', kind, s, lat, y });
    const line = (s, n, lat, gap = 3) => { for (let i = 0; i < n; i++) star(s + i * gap, lat); };
    const zig = (s, n, amp = 1.75, gap = 2.5) => { for (let i = 0; i < n; i++) star(s + i * gap, Math.sin((i / (n - 1)) * Math.PI * 2) * amp); };
    const arc = (s, lat, n = 5, len = 5.2) => { for (let i = 0; i < n; i++) { const k = i / (n - 1); star(s - len / 2 + k * len, lat, Math.sin(k * Math.PI) * 1.05); } };
    const ob = (kind, s, lat, extra) => items.push(Object.assign({ type: 'obst', kind, s, lat, y: 0, seed: (rnd() * 1e6) | 0 }, extra));
    const lane = () => LANES[(rnd() * 3) | 0];
    const other = (l) => { const o = LANES.filter((x) => x !== l); return o[(rnd() * o.length) | 0]; };
    const side = () => (rnd() < 0.5 ? -1 : 1);

    const BEATS = {
      line(s) { line(s + 2, 5, lane()); },
      zig(s) { zig(s + 2, 8); },
      cones(s) { const free = lane(); LANES.forEach((l) => { if (l !== free) ob('cone', s + 9, l); }); line(s + 3, 4, free); },
      jumpstars(s) { const l = lane(); line(s + 1, 2, l); arc(s + 11, l); items.push({ type: 'hint', s: s + 2, hint: 'jump' }); },
      puddle(s) { const l = lane(); ob('puddle', s + 10, l); arc(s + 10, l); items.push({ type: 'hint', s: s + 1, hint: 'jump' }); },
      pigeons(s) { const l = lane() * 0.6; for (let i = 0; i < 5; i++) items.push({ type: 'pigeon', kind: 'pigeon', s: s + 11 + (rnd() - 0.5) * 2.4, lat: l + (rnd() - 0.5) * 2.6, y: 0, flock: s, seed: i }); items.push({ type: 'hint', s: s - 8, hint: 'bell' }); line(s + 16, 3, l); },
      bins(s) { const d = side(); ob('bin', s + 8, d * 2.0); ob('box', s + 10.6, d * 1.0); line(s + 4, 4, -d * 1.75); },
      barrier(s) { const d = side(); ob('barrier', s + 10, d * 1.55); ob('cone', s + 7.5, d * 0.5); ob('cone', s + 5, d * 1.6); line(s + 5, 4, -d * 1.75); },
      scooter(s) { const l = lane(); ob('scooter', s + 9, l); line(s + 3, 4, other(l)); },
      cat(s) { const d = side(); items.push({ type: 'cat', kind: 'cat', s: s + 13, lat: d * 4.6, y: 0, dir: -d, seed: (rnd() * 9) | 0 }); line(s + 4, 3, 0); },
      ball(s) { const d = side(); items.push({ type: 'ball', kind: 'ball', s: s + 14, lat: d * 5.2, y: 0, dir: -d }); zig(s + 2, 5, 1.2); },
      bigstar(s) { const l = lane(); arc(s + 9, l, 4, 4.6); star(s + 9, l, 1.25, 'bigstar'); },
      heart(s) { star(s + 8, side() * 2.2, 0, 'heart'); line(s + 2, 2, 0); },
      gem(s) { star(s + 8, lane(), 0, 'gem'); },
      walkers(s) { const d = side(); for (let i = 0; i < 2; i++) items.push({ type: 'walker', kind: 'walker', s: s + 12 + i * 9, lat: (i ? -d : d) * 1.2, y: 0, v: -1.1, minS: s - 4, seed: (rnd() * 1e6) | 0 }); items.push({ type: 'hint', s: s - 6, hint: 'bell' }); line(s + 2, 3, 0); },
      cyclist(s) { items.push({ type: 'cyclist', kind: 'cyclist', s: s + 34, lat: -1.5, y: 0, v: -4, seed: (rnd() * 1e6) | 0 }); line(s + 2, 6, 1.6); },
    };
    const zone = (z) => {
      let s = z.a, i = 0, last = '', bag = [];
      const queue = (z.teach || []).slice();
      while (s + 24 <= z.b) {
        let name = queue.shift() || (z.fixed ? z.list[i % z.list.length] : null);
        if (!name) {
          if (!bag.length) { bag = z.list.slice(); for (let k = bag.length - 1; k > 0; k--) { const j = (rnd() * (k + 1)) | 0; [bag[k], bag[j]] = [bag[j], bag[k]]; } if (bag[0] === last) bag.push(bag.shift()); }
          name = bag.shift();
        }
        BEATS[name](s); last = name; i++;
        s += 25 + rnd() * 6;
      }
    };
    return { items, star, line, zig, arc, ob, lane, other, side, BEATS, beat: (name, s) => BEATS[name](s), zone, LANES };
  }

  /* ---------- the standard pieces of a ride (DU.ride.std): what a place gets when it does not bring its own.
     Each takes the api object that the hooks of a place get (see places.js). ---------- */
  const std = {
    /* the street level, for a way of any length with any number of big crossings (data.cross):
       a quiet start · a street that first teaches every trick · after a crossing people on foot, then the bike path ·
       an easy run to the end. The crossings themselves stay free of things, with a row of stars across each. */
    level(api) {
      const kit = api.kit(), L = api.L, cr = api.data.cross || [];
      const teach = ['line', 'zig', 'cones', 'jumpstars', 'puddle', 'pigeons'];
      const street = ['cones', 'puddle', 'pigeons', 'bins', 'barrier', 'scooter', 'cat', 'ball', 'zig', 'jumpstars', 'bigstar', 'line', 'heart', 'gem'];
      const path = ['cyclist', 'scooter', 'jumpstars', 'bigstar', 'cones', 'cyclist', 'puddle', 'zig', 'gem'];
      const walk = ['walkers', 'line', 'walkers'], easy = ['zig', 'jumpstars', 'line', 'heart'];
      const END = L - 50; // the last metres belong to the runway of stars
      const zones = [{ a: 12, b: 44, list: ['line'] }];
      zones.push({ a: 74, b: cr.length ? cr[0].s0 - 38 : END, list: street, teach });
      cr.forEach((c, i) => {
        const next = cr[i + 1], b = next ? next.s0 - 38 : END;
        if (!next && b - c.s1 < 200) { zones.push({ a: c.s1 + 12, b, list: easy, fixed: true }); return; } // a short last stretch
        zones.push({ a: c.s1 + 30, b: Math.min(b, c.s1 + 82), list: walk, fixed: true });
        if (next) zones.push({ a: c.s1 + 112, b, list: path });
        else { zones.push({ a: c.s1 + 112, b: b - 130, list: path }); zones.push({ a: b - 118, b, list: easy, fixed: true }); }
      });
      zones.forEach(kit.zone);
      cr.forEach((c) => kit.line(c.s0 + 3, 6, 0, 3.4));
      kit.line(L - 44, 10, 0, 3.2);
      return kit.items;
    },
    /* the balloon arch over the end of the way; its two banners are the place's texts */
    arch(api, opts) {
      const arch = api.make('arch', Object.assign({ text: api.texts.arch, backText: api.texts.archBack }, opts));
      api.place(arch, api.L - 9, 0, 0, true); api.scene.add(arch); api.ambient.push(arch);
      return arch;
    },
    /* children on their way, on both sides of the last 150 metres: they cheer when she passes or rings */
    kids(api, n = 7) {
      const L = api.L, r3 = api.K.rng(5);
      for (let i = 0; i < n; i++) {
        const kid = api.make('kid', { seed: 100 + i });
        const it = { type: 'kid', obj: kid, s: L - 150 + i * 19 + r3() * 8, lat: (i % 2 ? 1 : -1) * (3.25 + r3() * 0.25), v: 0.9 + r3() * 0.4 };
        api.place(kid, it.s, it.lat, 0); api.scene.add(kid); api.things.push(it);
      }
    },
    /* the crossing patrol: two guards who hold up their signs when she comes */
    guards(api, s) {
      if (s === undefined) s = api.L - 62;
      [-3.45, 3.45].forEach((lat, i) => { const gd = api.make('guard', { seed: i }); api.place(gd, s, lat, 0, false, lat > 0 ? -1.1 : 1.1); api.scene.add(gd); api.things.push({ type: 'guard', obj: gd, s, lat }); });
    },
    /* friends: paper dolls like her, waiting at the end and hopping when she arrives */
    friends(api) {
      const L = api.L, RR = api.RR;
      if (RR && RR.friends && RR.doll) {
        let list = [];
        try { list = RR.friends(5, 11, api.state.kind); } catch (e) { console.error(e); }
        list.forEach((fs, i) => {
          const lat = [-2.7, -1.75, 1.8, 2.8, -3.6][i], s = L + [-2.7, -1.0, -0.8, -2.4, -4.2][i];
          Promise.resolve(RR.doll(fs, { pose: i % 2 ? 'wave' : 'cheer', h: 1.2 + (i % 3) * 0.06 })).then((d) => {
            if (api.dead()) return;
            api.place(d, s, lat, 0, true); api.scene.add(d);
            api.friends.push({ obj: d, ph: i * 1.3, face: true });
          }).catch((e) => console.error('friend failed', e));
        });
      } else {
        [-3.2, -2.3, 2.3, 3.2].forEach((lat, i) => { const kd = api.make('kid', { seed: 300 + i }); api.place(kd, L + 1 + (i % 2) * 2, lat, 0, true, lat > 0 ? 0.5 : -0.5); api.scene.add(kd); api.ambient.push(kd); api.friends.push({ obj: kd, ph: i * 1.3 }); });
      }
    },
    /* what stands at the end of a way that brings nothing of its own */
    scenery(api) { std.arch(api); std.friends(api); },
  };

  /* ---------- the places ---------- */
  const PLACES = (DU.RIDE_PLACE = DU.RIDE_PLACE || {});
  /* the school, as it has always been: the gate, the kids on their way, the crossing patrol, her friends */
  PLACES.school = Object.assign({
    texts: { start: 'רוכבים לבית הספר!', arrive: 'הגעת לבית הספר!', row: 'הגעת לבית הספר', arch: 'בוקר טוב!', archBack: 'כל הכבוד!', enter: 'להיכנס לבית הספר' },
    icon: ICON.school,
    sound(api) { api.sfx.schoolBell(); },
    scenery(api) { std.arch(api); std.kids(api); std.guards(api); std.friends(api); },
  }, PLACES.school);
  /* a place put together: its own fields where it has them, the standard ones elsewhere */
  function placeOf(id) {
    const def = (DU.places && DU.places.get(id)) || { id, name: '' }, own = PLACES[id] || {};
    const to = def.name ? 'ל' + def.name : '';
    const rd = typeof own.data === 'function' ? own.data(id) : own.data;
    let icon = own.icon || ICON.flag;
    if (!/class="[^"]*du-ico/.test(icon)) icon = icon.replace('<svg', '<svg class="du-ico"'); // drawn at the size of the text around it, like the other icons
    return {
      id, def, own,
      data: rd || (DU.RIDE_DATA_OF || {})[id] || (id === 'school' ? DU.RIDE_DATA : null),
      texts: Object.assign({ start: to ? `רוכבים ${to}!` : 'יוצאים לרכיבה!', arrive: to ? `הגעת ${to}!` : 'הגעת!', row: to ? `הגעת ${to}` : 'הגעת', arch: 'הגענו!', archBack: 'כל הכבוד!' }, own.texts),
      icon,
    };
  }

  /* ---------- the ride ---------- */
  DU.ride = {
    live: null,
    std, levelKit, ICON,
    start(o) {
      if (DU.ride.live) return DU.ride.live;
      const r = makeRide(o || {});
      if (!r.failed) DU.ride.live = r; // a ride that could not start leaves the way free for the next one
      return r;
    },
  };

  function makeRide(o) {
    const T = window.THREE, K = DU.rideKit;
    const PL = placeOf(o.place || 'school'), data = PL.data, texts = PL.texts; // where she rides to
    const state = o.state || DU.defaultState();
    const bikeSpec = DU.bike.norm(o.bike); // her bike (bike.js): how it looks, its bell, what it leaves behind
    let dead = false, raf = 0, trail = null;
    const api = { stop: () => quit() };

    /* ----- page ----- */
    const el = document.createElement('div');
    el.className = 'ride'; el.dir = 'rtl';
    el.innerHTML = `
      <canvas class="ride-canvas"></canvas>
      <div class="ride-rush"></div>
      <div class="ride-fade"></div>
      <div class="ride-hud" hidden>
        <div class="ride-top">
          <button class="round-btn" data-ride="exit" aria-label="לצאת">${ico('home')}</button>
          <div class="ride-prog"><span class="rp-end">${ico('home')}</span><div class="rp-bar"><i></i><b>${ICON.bike}</b></div><span class="rp-end">${PL.icon}</span></div>
          <div class="stars-pill ride-stars">${ico('star')} <span>0</span></div>
          <button class="round-btn" data-ride="mute" aria-label="צליל">${ico(DU.sound && DU.sound.muted ? 'mute' : 'sound')}</button>
        </div>
        <div class="ride-street"></div>
        <div class="ride-chip"></div>
        <div class="ride-msg"></div>
        <div class="ride-pops"></div>
        <button class="ride-ctl rc-left" data-hold="left" aria-label="שמאלה">${ICON.left}<kbd>←</kbd></button>
        <button class="ride-ctl rc-right" data-hold="right" aria-label="ימינה">${ICON.right}<kbd>→</kbd></button>
        <button class="ride-ctl rc-jump" data-tap="jump" aria-label="קפיצה">${ICON.jump}<span>קפיצה</span><kbd>רווח</kbd></button>
        <button class="ride-ctl rc-bell" data-tap="bell" aria-label="פעמון">${ICON.bell}<kbd>B</kbd></button>
        <div class="ride-speed">
          <button class="rs-btn rs-up" data-hold="up" aria-label="מהר יותר">${ICON.fast}<kbd>↑</kbd></button>
          <div class="rs-read"><b dir="ltr">0</b><small>קמ״ש</small><i><u></u></i></div>
          <button class="rs-btn rs-down" data-hold="down" aria-label="לאט יותר">${ICON.slow}<kbd>↓</kbd></button>
        </div>
      </div>
      <div class="ride-panel" hidden></div>`;
    document.body.appendChild(el);
    const veil = o.veil || (() => { const v = document.createElement('div'); v.className = 'ride-load'; v.innerHTML = DU.ride.loadingHtml(); document.body.appendChild(v); return v; })();
    const hud = $('.ride-hud', el), panel = $('.ride-panel', el), fadeEl = $('.ride-fade', el);
    const msgEl = $('.ride-msg', el), streetEl = $('.ride-street', el), chipEl = $('.ride-chip', el), popsEl = $('.ride-pops', el);
    const starsEl = $('.ride-stars span', el), barFill = $('.rp-bar i', el), barBike = $('.rp-bar b', el);
    const speedEl = $('.ride-speed', el), speedNum = $('.rs-read b', el), speedBar = $('.rs-read u', el), rushEl = $('.ride-rush', el);

    function fail(e) {
      console.error('ride failed', e);
      veil.remove();
      el.remove(); DU.ride.live = null; dead = true; api.failed = true;
      if (DU.app && DU.app.toast) DU.app.toast('אוי, הרכיבה לא עובדת במכשיר הזה');
      if (o.onExit) o.onExit();
    }

    /* ----- 3D ----- */
    let renderer, scene, camera, world, rider, P, Models;
    if (!data || !data.route) { fail(new Error('no route for the place ' + PL.id)); return api; }
    try {
      renderer = new T.WebGLRenderer({ canvas: $('.ride-canvas', el), antialias: true, powerPreference: 'high-performance' });
    } catch (e) { fail(e); return api; }
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(60, 1.5, 0.3, 2500);
    let baseFov = 60;
    function resize() {
      const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; baseFov = w / h < 1 ? 78 : w / h < 1.25 ? 68 : 60;
      camera.fov = baseFov + ((g && g.fast) || 0) * FOV_KICK;
      camera.updateProjectionMatrix();
    }
    const FOV_KICK = 9; // the picture opens up when she goes fast
    let g = null; // the game state (made below; resize() looks at it)
    resize();
    window.addEventListener('resize', resize);
    $('.ride-canvas', el).addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (!dead) fail(new Error('context lost')); });

    /* ----- game state ----- */
    const rnd = K.rng(20261126 + (o.run || 0) * 7919);
    g = {
      mode: 'load',          // load · intro · count · ride · arrive · done
      t: 0, s: 3, lat: 0.9, v: 0, y: 0, vy: 0, steer: 0, heading: 0,
      roadY: 0, slope: 0, pitch: 0, // the road under her, on a way with heights (y, the hop, is measured from it)
      want: CRUISE,          // the speed she asked for: ▲ and ▼ move it and it stays where she leaves it
      fast: 0, top: 0, moved: 0, rideT: 0, stillT: 0, kmh: -1,
      stars: 0, polite: 0, bumps: 0, combo: 0, comboT: 0, hurtT: 0, wobble: 0, boostT: 0,
      paused: false, seen: {},
    };
    const input = { left: false, right: false, up: false, down: false, drag: 0, dragging: false };
    let things = [], lights = [], crossings = [], friends = [], ambient = [], level = [], corners = [];
    /* how fast she may go when she has to stand still d metres ahead: gently near the stop, firmly from far away */
    const stopV = (d) => (d <= 12 ? Math.sqrt(Math.max(0, 4.2 * (d - 0.15))) : Math.sqrt(49.8 + 14 * (d - 12)));
    let streetIdx = -1, chips = [];
    const tmp = {}, tmp2 = {};
    const camPos = new T.Vector3(), camLook = new T.Vector3(), v3 = new T.Vector3();

    const make = (kind, opts) => {
      let m = null;
      try { if (Models) m = Models.make(kind, opts || {}); } catch (e) { console.error('model failed', kind, e); }
      if (!m) m = fallbackModel(T, K, kind);
      if (!m.userData) m.userData = {};
      return m;
    };
    /* put a thing on the way: s metres along, lat metres to the right, y metres above the road, facing the way she rides
       (flip = facing her, turn = a further turn) */
    function place(obj, s, lat, y, flip, turn) {
      P.at(s, tmp);
      obj.position.set(tmp.x + tmp.nx * lat, tmp.y + (y || 0), tmp.z + tmp.nz * lat);
      obj.rotation.y = Math.atan2(tmp.tx, tmp.tz) + (flip ? Math.PI : 0) + (turn || 0);
      if (P.alt) onSlope(obj, tmp.slope, (flip ? Math.PI : 0) + (turn || 0));
    }
    /* a way with heights: what lies on the road (a puddle, a car; anything with userData.lie) tilts with it,
       and under everything else only its round shadow does. rel = how the thing is turned against the way. */
    const LIES = { puddle: 1, car: 1, taxi: 1, bus: 1, moped: 1 };
    const qTilt = new T.Quaternion(), vUp = new T.Vector3(0, 1, 0), vN = new T.Vector3();
    function onSlope(obj, slope, rel) {
      const u = obj.userData, riseZ = slope * Math.cos(rel), riseX = -slope * Math.sin(rel); // rise per metre along its own +Z and +X
      if (u.lie || LIES[u.kind]) { obj.rotation.order = 'YXZ'; obj.rotation.x = -Math.atan(riseZ); obj.rotation.z = Math.atan(riseX); return; }
      if (!u.shades) { u.shades = []; obj.traverse((c) => { if (c.userData.shadow) u.shades.push({ m: c, q: c.quaternion.clone() }); }); }
      if (!u.shades.length) return;
      qTilt.setFromUnitVectors(vUp, vN.set(-riseX, 1, -riseZ).normalize());
      for (let i = 0; i < u.shades.length; i++) u.shades[i].m.quaternion.copy(qTilt).multiply(u.shades[i].q);
    }
    /* what the hooks of a place get (see places.js for the whole list) */
    const hook = {
      id: PL.id, def: PL.def, texts, T, K, data, state, bike: bikeSpec, quality: o.quality || 'high',
      get P() { return P; }, get L() { return P.length; }, get scene() { return scene; }, get camera() { return camera; },
      get world() { return world; }, get rider() { return rider; }, get RR() { return DU.rideRider; }, get g() { return g; },
      get things() { return things; }, get ambient() { return ambient; }, get friends() { return friends; }, get crossings() { return crossings; },
      get rnd() { return rnd; }, get sfx() { return sfx; },
      make: (kind, opts) => make(kind, opts), place, kit: () => levelKit(P, rnd), std, LANES, VALUE, ICON, tone,
      say: (html, ms, cls) => say(html, ms, cls), pop: (text, cls) => pop(text, cls), addStars: (n, text, cls) => addStars(n, text, cls),
      dead: () => dead,
    };

    /* ----- messages ----- */
    let msgTimer = 0;
    function say(html, ms = 1500, cls = '') {
      msgEl.className = 'ride-msg ' + cls; msgEl.innerHTML = html;
      void msgEl.offsetWidth; msgEl.classList.add('on');
      clearTimeout(msgTimer);
      if (ms) msgTimer = setTimeout(() => msgEl.classList.remove('on'), ms);
    }
    function pop(text, cls = '') {
      const p = document.createElement('span');
      p.className = 'ride-pop ' + cls; p.textContent = text;
      p.style.left = 44 + Math.random() * 12 + '%';
      popsEl.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
    function showStreet(name) {
      const txt = /^(שדרות|בית|רחוב|גן|גני|גינת|פארק|כיכר|טיילת) /.test(name + ' ') ? name : 'רחוב ' + name; // a garden, a park or a square is not a street
      streetEl.textContent = txt; streetEl.classList.remove('on'); void streetEl.offsetWidth; streetEl.classList.add('on');
    }
    function fade(to, ms) {
      fadeEl.style.transition = `opacity ${ms}ms`; fadeEl.style.opacity = to;
      return new Promise((r) => setTimeout(r, ms));
    }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    /* ----- sounds ----- */
    const SCALE = [784, 880, 988, 1175, 1319, 1568, 1760, 1976, 2349];
    const sfx = {
      star(n) { tone(SCALE[Math.min(n, SCALE.length - 1)], { dur: 0.09, type: 'sine', vol: 0.12, slide: SCALE[Math.min(n, SCALE.length - 1)] * 1.5 }); },
      big() { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, { at: i * 0.06, dur: 0.16, type: 'triangle', vol: 0.14 })); },
      jump() { tone(420, { dur: 0.16, type: 'sine', vol: 0.12, slide: 880 }); },
      land() { tone(160, { dur: 0.09, type: 'sine', vol: 0.16, slide: 90 }); },
      bump() { tone(300, { dur: 0.22, type: 'triangle', vol: 0.2, slide: 120 }); tone(220, { at: 0.12, dur: 0.2, type: 'sine', vol: 0.12, slide: 110 }); },
      splash() { for (let i = 0; i < 5; i++) tone(900 + Math.random() * 900, { at: i * 0.03, dur: 0.08, type: 'sine', vol: 0.06, slide: 400 }); },
      flap() { for (let i = 0; i < 6; i++) tone(500 + i * 90, { at: i * 0.045, dur: 0.05, type: 'triangle', vol: 0.07 }); },
      red() { tone(330, { dur: 0.16, type: 'sine', vol: 0.14 }); tone(330, { at: 0.24, dur: 0.16, type: 'sine', vol: 0.14 }); },
      green() { tone(660, { dur: 0.12, type: 'triangle', vol: 0.16 }); tone(990, { at: 0.12, dur: 0.22, type: 'triangle', vol: 0.16 }); },
      count(last) { tone(last ? 1047 : 523, { dur: last ? 0.4 : 0.14, type: 'triangle', vol: 0.2 }); },
      thanks() { tone(988, { dur: 0.1, type: 'sine', vol: 0.12 }); tone(1319, { at: 0.1, dur: 0.16, type: 'sine', vol: 0.12 }); },
      schoolBell() { for (let i = 0; i < 14; i++) tone(i % 2 ? 1568 : 1319, { at: i * 0.075, dur: 0.09, type: 'square', vol: 0.045 }); },
      chime() { [1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => tone(f, { at: i * 0.11, dur: 0.3, type: 'sine', vol: 0.09 })); }, // arriving at a place that has no sound of its own
      meow() { tone(700, { dur: 0.28, type: 'triangle', vol: 0.1, slide: 1100 }); tone(1100, { at: 0.26, dur: 0.22, type: 'triangle', vol: 0.08, slide: 600 }); },
    };
    /* a little riding tune: a soft pattern that loops while she rides */
    const TUNE = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587];
    let tuneI = 0, tuneT = 0;
    function tune(dt) {
      tuneT -= dt;
      if (tuneT > 0) return;
      tuneT = 0.3 / (1 + g.fast * 0.7); // the tune hurries along with her
      tone(TUNE[tuneI % TUNE.length], { dur: 0.22, type: 'triangle', vol: 0.035 });
      if (tuneI % 4 === 0) tone(TUNE[tuneI % TUNE.length] / 4, { dur: 0.5, type: 'sine', vol: 0.05 });
      tuneI++;
    }

    /* ----- building the scene ----- */
    async function build() {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))); // let the loading card paint first
      if (K.fontsReady) await K.fontsReady();
      P = K.path(data);
      Models = DU.rideModels || null;
      try { world = (PL.own.world || DU.rideWorld.build)(scene, data, { quality: o.quality || 'high', place: PL.id }); }
      catch (e) { console.error('world failed', e); world = fallbackWorld(T, K, scene, data); }
      if (world && world.ready) await world.ready;
      try { DU.rideRider.CHASE = { y: CAM_UP, z: -CAM_BACK }; rider = await DU.rideRider.make(state, { bike: o.bike }); }
      catch (e) { console.error('rider failed', e); rider = fallbackRider(T, K); }
      if (dead) return;
      scene.add(rider.group);
      if (P.alt) rider.group.rotation.order = 'YXZ'; // on a way with heights the bike pitches with the slope
      try { trail = DU.rideBike.trail(bikeSpec.trail); if (trail) scene.add(trail.obj); } catch (e) { console.error('trail failed', e); trail = null; }

      // things on the way (a level may bring its own model in it.obj)
      try { level = (PL.own.level || std.level)(hook) || []; }
      catch (e) { console.error('level failed', e); level = []; }
      level = level.slice().sort((a, b) => a.s - b.s);
      level.forEach((it) => {
        if (it.type === 'hint') { things.push(it); return; }
        const obj = it.obj || make(it.kind, { seed: it.seed });
        if (!obj.userData) obj.userData = {};
        if (it.y === undefined) it.y = 0;
        it.obj = obj; it.r = obj.userData.r || 0.4; it.h = obj.userData.h || 0.8;
        place(obj, it.s, it.lat, it.y, it.type === 'walker' || it.type === 'cyclist');
        if (it.type === 'obst' && it.kind !== 'puddle') obj.rotation.y += (rnd() - 0.5) * 0.5;
        if (it.type === 'cat' || it.type === 'ball') { it.lat0 = it.lat; it.go = false; }
        obj.visible = false; scene.add(obj); things.push(it);
      });

      // the big crossings: a light on her side, and traffic on the avenue
      (data.cross || []).forEach((c) => {
        const X = { n: c.n, s0: c.s0, s1: c.s1, stopS: c.s0 - 4.5, green: false, waiting: false, timer: 0, told: false, cars: [], spawn: [0.2, 1.1], poles: [] };
        [[X.stopS + 1.2, 3.5], [c.s1 + 1.5, 3.5]].forEach(([s, lat]) => { const p = make('light'); place(p, s, lat, 0, true); scene.add(p); X.poles.push(p); if (p.userData.set) p.userData.set('red'); });
        crossings.push(X);
      });

      parkCars();
      try { (PL.own.scenery || std.scenery)(hook); } catch (e) { console.error('scenery failed', e); }
      landmarks();
      corners = findCorners();
      veil.remove();
      hud.hidden = false;
      intro();
      loop.last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    /* the sharp corners of the way: she slows for them by herself, however fast she was asked to go */
    function findCorners() {
      const out = [];
      const ang = (s) => { P.at(s, tmp); return Math.atan2(tmp.tx, tmp.tz); };
      let cur = null;
      for (let s = 6; s < P.length - 6; s += 2) {
        let d = ang(s + 4) - ang(s - 4);
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        d = Math.abs(d);
        if (d > 0.3) { if (cur) { cur.s1 = s + 4; cur.k = Math.max(cur.k, d / 8); } else out.push((cur = { s0: s - 4, s1: s + 4, k: d / 8 })); }
        else cur = null;
      }
      out.forEach((c) => (c.v = clamp(Math.sqrt(13 / c.k), 8, VMAX)));
      return out;
    }

    /* parked cars along the streets, merged into a few meshes so they cost almost nothing.
       The world says where a car may stand (world.parkOk) and up to where (world.info.parkEnd; without it: up to the
       first big crossing). A world of a place's own that has no parkOk gets no parked cars. */
    function parkCars() {
      if (PL.own.world && !(world && world.parkOk)) return;
      const junc = [];
      (data.roads || []).forEach((rd) => {
        if (!'ATRS'.includes(rd.k)) return;
        const near = [], p = rd.p; let far = 0;
        for (let i = 0; i < p.length; i += 2) { const q = P.near(p[i], p[i + 1]); if (q.d < 3) near.push(q.s); else if (q.d > 10) far++; }
        if (near.length && far) near.forEach((s) => junc.push(s));
      });
      const c1 = (data.cross || [])[0], info = (world && world.info) || {};
      const end = info.parkEnd !== undefined ? info.parkEnd : c1 ? c1.s0 - 16 : P.length - 30;
      const groups = {}; // chunk of the street + material → geometries to merge
      const r2 = K.rng(77);
      for (let side = -1; side <= 1; side += 2) {
        let s = 10 + r2() * 4;
        while (s < end) {
          const skip = (world && world.parkOk ? !world.parkOk(s, side) || !world.parkOk(s + 2.2, side) || !world.parkOk(s - 2.2, side) : junc.some((j) => Math.abs(j - s) < 9.5) || (s > 44 && s < 70)) || r2() < 0.28;
          if (!skip) {
            const car = make(r2() < 0.1 ? 'taxi' : r2() < 0.12 ? 'moped' : 'car', { seed: (r2() * 1e6) | 0 });
            place(car, s, side * (4.95 + r2() * 0.15), 0, side < 0, (r2() - 0.5) * 0.05);
            let hasBlob = false;
            const eat = (root) => {
              root.updateMatrixWorld(true);
              root.traverse((m) => {
                if (!m.isMesh || !m.visible) return;
                const mat = m.material, blob = !!(mat.transparent && mat.map && mat.depthWrite === false);
                if (blob) hasBlob = true;
                const key = Math.floor(s / 90) + '|' + (blob ? 'blob' : mat.uuid);
                const gm = m.geometry.clone(); gm.applyMatrix4(m.matrixWorld);
                (groups[key] = groups[key] || { mat, blob, list: [] }).list.push(gm);
              });
            };
            eat(car);
            if (!hasBlob) { const sh = K.blob(2.4, 0.22); sh.position.set(car.position.x, car.position.y + 0.035, car.position.z); sh.scale.set(0.8, 1.9, 1); sh.rotation.z = -car.rotation.y; eat(sh); }
          }
          s += 5.4 + r2() * 1.6;
        }
      }
      Object.keys(groups).forEach((k) => {
        const G = groups[k], m = new T.Mesh(K.merge(G.list), G.mat);
        if (G.blob) m.renderOrder = 1;
        scene.add(m);
        G.list.forEach((x) => x.dispose());
      });
    }

    /* places she passes: a chip with the name and an arrow to the side it is on */
    function landmarks() {
      const seen = {};
      (data.areas || []).forEach((a) => {
        if (a.k !== 'park' || !a.n || seen[a.n]) return;
        let best = null;
        for (let i = 0; i < a.p.length; i += 2) { const q = P.near(a.p[i], a.p[i + 1]); if (!best || q.d < best.d) best = q; }
        if (best && best.d < 40) { seen[a.n] = 1; chips.push({ s: best.s - 30, n: a.n, side: best.lat > 0 ? 1 : -1 }); }
      });
      (data.pois || []).forEach((p) => {
        if (!['theatre', 'museum', 'library'].includes(p.k) || seen[p.n] || /משכן/.test(p.n)) return;
        const q = P.near(p.x, p.z);
        if (q.d < 170) { seen[p.n] = 1; chips.push({ s: q.s - 35, n: p.n, side: q.lat > 0 ? 1 : -1 }); }
      });
      chips.sort((a, b) => a.s - b.s);
      for (let i = 1; i < chips.length; i++) if (chips[i].s - chips[i - 1].s < 48) chips[i].s = chips[i - 1].s + 48;
    }

    /* ----- the beginning ----- */
    async function intro() {
      g.mode = 'intro';
      placeRider(0);
      if (rider.pose) rider.pose('wave');
      // a look at her from the front, the house behind her
      P.at(g.s + 3.3, tmp);
      camPos.set(tmp.x + tmp.nx * (g.lat - 1.5), tmp.y + 1.3, tmp.z + tmp.nz * (g.lat - 1.5));
      P.at(g.s, tmp); camLook.set(tmp.x + tmp.nx * g.lat, tmp.y + 0.86, tmp.z + tmp.nz * g.lat);
      camera.position.copy(camPos); camera.lookAt(camLook);
      say(`<b>${esc(texts.start)}</b>${(state.name || '').trim() ? `<small>${esc((state.name || '').trim())} יוצאת לדרך</small>` : ''}`, 2300, 'title');
      await fade(0, 500);
      await wait(1900);
      if (dead) return;
      await fade(1, 260);
      if (dead) return;
      if (rider.pose) rider.pose('ride');
      g.mode = 'count'; snapCamera();
      await fade(0, 260);
      for (const n of ['3', '2', '1']) { if (dead) return; say(n, 700, 'count'); sfx.count(false); await wait(720); }
      if (dead) return;
      say('יוצאים!', 900, 'count go'); sfx.count(true);
      g.mode = 'ride';
      el.classList.add('riding');
      setTimeout(() => { if (!dead && !g.seen.steer) { el.classList.add('hint-steer'); setTimeout(() => el.classList.remove('hint-steer'), 4200); } }, 600);
      setTimeout(() => { if (!dead && !g.seen.speed && g.mode === 'ride') { el.classList.add('hint-speed'); setTimeout(() => { if (g.want > 0.5) el.classList.remove('hint-speed'); }, 5200); } }, 6500);
    }
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ----- rider ----- */
    function placeRider(dt) {
      P.at(g.s, tmp);
      const want = Math.atan2(tmp.tx, tmp.tz);
      let d = want - g.heading; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      g.heading = dt ? g.heading + d * (1 - Math.exp(-dt * 12)) : want;
      const wob = g.wobble > 0 ? Math.sin(g.t * 26) * g.wobble * 0.22 : 0;
      // the road under her: g.y (the hop) and everything else that has a height is measured from it
      g.roadY = tmp.y; g.slope = tmp.slope;
      if (P.alt) g.pitch = dt ? damp(g.pitch, -Math.atan(tmp.slope), 10, dt) : -Math.atan(tmp.slope);
      rider.group.position.set(tmp.x + tmp.nx * g.lat, tmp.y + g.y, tmp.z + tmp.nz * g.lat);
      rider.group.rotation.set(g.pitch, g.heading - g.steer * 0.16 + wob * 0.4, 0);
      return d;
    }
    function chaseTarget(out, look) {
      const back = CAM_BACK, up = CAM_UP;
      P.at(g.s - back, tmp);
      out.set(tmp.x + tmp.nx * g.lat * 0.6, tmp.y + up + g.y * 0.35, tmp.z + tmp.nz * g.lat * 0.6);
      P.at(g.s + 9 + g.v * 0.22, tmp); // going fast, she looks further down the road
      look.set(tmp.x + tmp.nx * g.lat * 0.35, tmp.y + 1.25 + g.y * 0.3, tmp.z + tmp.nz * g.lat * 0.35);
    }
    const camT = new T.Vector3(), lookT = new T.Vector3();
    function snapCamera() { chaseTarget(camPos, camLook); camera.position.copy(camPos); camera.lookAt(camLook); }

    function jump() {
      if (g.mode !== 'ride' || g.y > 0.02) return;
      g.vy = 5.3; g.y = 0.03; sfx.jump(); g.seen.jump = true; el.classList.remove('hint-jump');
    }
    function bell() {
      if (g.mode !== 'ride' && g.mode !== 'count' && g.mode !== 'arrive') return;
      DU.bike.ring(bikeSpec.bell); if (rider.bell) rider.bell();
      g.seen.bell = true; el.classList.remove('hint-bell');
      const b = $('.rc-bell', el); b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring');
      let thanked = 0;
      things.forEach((it) => {
        const ds = it.s - g.s;
        if (it.done || ds < -2 || ds > 30 + g.v * 1.2) return;
        if (it.type === 'pigeon' && !it.fled) { flee(it, true); thanked++; }
        if (it.type === 'walker' && !it.aside) { it.aside = true; it.target = (it.lat >= 0 ? 1 : -1) * 3.3; thanked += 2; if (it.obj.userData.wave) it.obj.userData.wave(); }
        if (it.type === 'cyclist' && !it.waved) { it.waved = true; thanked++; if (it.obj.userData.wave) it.obj.userData.wave(); }
        if (it.type === 'kid' && !it.cheered && ds < 18) { it.cheered = true; if (it.obj.userData.cheer) it.obj.userData.cheer(true); }
      });
      if (thanked) { g.polite += thanked; addStars(thanked, 'תודה! \u200E+' + thanked, 'thanks'); setTimeout(sfx.thanks, 260); }
    }
    function flee(it, polite) {
      it.fled = true;
      P.at(it.s, tmp2);
      const side = it.lat >= g.lat ? 1 : -1;
      if (it.obj.userData.flee) it.obj.userData.flee(tmp2.nx * side + tmp2.tx * 0.8, tmp2.nz * side + tmp2.tz * 0.8);
      else it.obj.visible = false;
      if (!polite && !it.flapped) sfx.flap();
    }
    function addStars(n, text, cls) {
      g.stars += n; starsEl.textContent = g.stars;
      const pill = starsEl.parentNode; pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
      if (text) pop(text, cls);
    }
    function bump(it) {
      if (g.hurtT > 0) return;
      g.hurtT = 1.3; g.wobble = 1; g.v *= 0.3; g.bumps++; g.combo = 0;
      g.want = Math.min(g.want, CRUISE); // after a bump she sets off again at the easy speed
      sfx.bump(); pop('אופס!', 'oops');
      if (it && it.obj.userData.bump) it.obj.userData.bump(it.lat >= g.lat ? 1 : -1);
    }

    /* ----- one frame of the game ----- */
    function update(dt) {
      g.t += dt;
      const L = P.length;
      if (g.mode === 'ride' || g.mode === 'arrive') {
        // steering
        const key = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const wantSteer = g.mode === 'ride' ? clamp(key + input.drag, -1, 1) : 0;
        if (wantSteer) { g.seen.steer = true; }
        g.steer = damp(g.steer, wantSteer, 9, dt);
        const sp = clamp(g.v / CRUISE, 0, 1.8);
        g.lat = clamp(g.lat + g.steer * 4.4 * dt * (0.35 + 0.65 * sp), -LAT_MAX, LAT_MAX);
        if (g.mode === 'arrive') g.lat = damp(g.lat, 0, 2.5, dt);

        // speed: as fast as she asked for; she slows by herself for a sharp corner and a red light, and stops at the end of the way
        const X = crossings.find((c) => !c.passed);
        if (g.mode === 'ride') {
          g.rideT += dt;
          const th = (input.up ? 1 : 0) - (input.down ? 1 : 0);
          if (th && !(X && X.waiting)) {
            g.want = clamp(g.want + (th > 0 ? 8 : -16) * dt, 0, VMAX);
            if (!g.seen.speed) { g.seen.speed = true; el.classList.remove('hint-speed'); }
          }
          // she stopped and stays there: the "faster" button glows
          if (g.want < 0.5 && g.v < 0.3 && !(X && X.waiting)) { g.stillT += dt; if (g.stillT > 2.2) el.classList.add('hint-speed'); }
          else if (g.stillT) { g.stillT = 0; el.classList.remove('hint-speed'); }
        }
        let vT = g.mode === 'ride' ? g.want : CRUISE;
        for (let i = 0; i < corners.length; i++) {
          const c = corners[i];
          if (g.s > c.s1) continue;
          vT = Math.min(vT, g.s >= c.s0 ? c.v : Math.sqrt(c.v * c.v + 14 * (c.s0 - g.s)));
          break;
        }
        if (X) {
          const dist = X.stopS - g.s;
          if (!X.green) {
            vT = Math.min(vT, stopV(dist));
            if (dist < 30 + g.v * 2.4 && !X.told) { X.told = true; say(`${ICON.red}<b>אור אדום</b><small>עוצרים ומחכים</small>`, 2400, 'light'); sfx.red(); }
            if (dist < 0.5 && g.v < 0.25 && !X.waiting) { X.waiting = true; X.timer = 4.4; g.v = 0; }
            if (X.waiting) {
              vT = 0; X.timer -= dt;
              X.hold = X.timer < 2.4; // the cars get their red a little before she gets her green
              const busy = X.cars.some((c) => { const f = c.u * c.dir; return f > -9 && f < 12 + c.len; });
              if (X.timer <= 0 && (!busy || X.timer < -4)) { X.waiting = false; X.green = true; g.want = Math.max(g.want, CRUISE); X.poles.forEach((p) => p.userData.set && p.userData.set('green')); say(`${ICON.green}<b>ירוק!</b><small>ממשיכים</small>`, 1500, 'light go'); sfx.green(); }
            }
          }
          if (g.s > X.s1 + 2) X.passed = true;
        }
        vT = Math.min(vT, g.mode === 'arrive' ? Math.sqrt(Math.max(0, 4.8 * (L - 0.6 - g.s))) : stopV(L - 0.6 - g.s));
        if (g.hurtT > 0) { g.hurtT -= dt; vT = Math.min(vT, CRUISE * 0.75); }
        g.wobble = Math.max(0, g.wobble - dt * 1.6);
        g.v = g.v < vT ? Math.min(vT, g.v + (g.v < CRUISE ? 4.5 : 9) * dt) : Math.max(vT, g.v - 14 * dt);
        g.moved = g.v * dt; // how far she goes in this frame (nothing on the way is skipped, however fast she is)
        g.s += g.moved;
        if (g.v > g.top) g.top = g.v;

        // the hop
        if (g.y > 0 || g.vy > 0) {
          g.vy -= 14.5 * dt; g.y += g.vy * dt;
          if (g.y <= 0) { g.y = 0; g.vy = 0; sfx.land(); }
        }
        if (g.mode === 'ride' && g.s >= L - 16) arrive();
        if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }
        if (g.v > 1) tune(dt);
      }
      const turn = placeRider(dt);
      rider.update(dt, { speed: g.v, steer: clamp(g.steer + turn * 6, -1, 1), braking: (g.mode === 'ride' && input.down) || g.v < 0.05 });
      g.fast = damp(g.fast, g.mode === 'ride' ? clamp((g.v - CRUISE) / (VMAX - CRUISE), 0, 1) : 0, 4, dt);
      if (trail) { // it starts at the back wheel
        const sn = Math.sin(rider.group.rotation.y), cs = Math.cos(rider.group.rotation.y);
        trail.update(dt, rider.group.position.x - sn * 0.5, (P.alt ? rider.group.position.y - g.slope * 0.5 : g.y) + 0.125, rider.group.position.z - cs * 0.5, g.mode === 'ride' || g.mode === 'arrive' ? g.v : 0);
      }

      updateThings(dt);
      updateTraffic(dt);
      ambient.forEach((a) => a.userData.update && a.userData.update(dt, g.t));
      friends.forEach((f) => {
        if (f.y0 === undefined) f.y0 = f.obj.position.y; // where it was put (the road may be high up)
        f.obj.position.y = f.y0 + (g.mode === 'arrive' || g.mode === 'done' ? Math.abs(Math.sin(g.t * 6 + f.ph)) * 0.22 : 0);
        if (f.face) f.obj.rotation.y = Math.atan2(camera.position.x - f.obj.position.x, camera.position.z - f.obj.position.z); // paper friends always turn to us
      });

      // camera
      if (g.mode === 'ride' || g.mode === 'count' || (g.mode === 'arrive' && !g.frontCam)) {
        chaseTarget(camT, lookT);
        // the camera follows more tightly the faster she goes, so it only falls a little further behind
        const kf = clamp((g.v - CRUISE) / (VMAX - CRUISE), 0, 1), rc = Math.max(5, g.v / (1.28 + 0.75 * kf)), rl = Math.max(7, g.v / (0.9 + 2 * kf));
        // on a way with heights the camera climbs as fast as it follows, so it stays above the road behind her
        camPos.x = damp(camPos.x, camT.x, rc, dt); camPos.y = damp(camPos.y, camT.y, P.alt ? rc : 5, dt); camPos.z = damp(camPos.z, camT.z, rc, dt);
        camLook.x = damp(camLook.x, lookT.x, rl, dt); camLook.y = damp(camLook.y, lookT.y, P.alt ? rl : 7, dt); camLook.z = damp(camLook.z, lookT.z, rl, dt);
      } else if (g.frontCam) {
        g.frontT += dt;
        P.at(L + 3.4 - Math.min(0.8, g.frontT * 0.2), tmp);
        camPos.set(tmp.x + tmp.nx * (-0.8 + g.frontT * 0.05), tmp.y + 1.35, tmp.z + tmp.nz * (-0.8 + g.frontT * 0.05));
        // when the card comes she moves to the side of the picture (to the top on a tall screen)
        g.shift = damp(g.shift || 0, g.mode === 'done' ? 1 : 0, 3, dt);
        const wide = camera.aspect > 1.1, sh = g.shift * (wide ? 1.05 : 0);
        camLook.set(rider.group.position.x + tmp.nx * sh, g.roadY + 0.9 - g.shift * (wide ? 0 : 0.75), rider.group.position.z + tmp.nz * sh);
      } else if (g.mode === 'intro') {
        P.at(g.s + 3.3 - g.t * 0.1, tmp);
        camPos.set(tmp.x + tmp.nx * (g.lat - 1.5), tmp.y + 1.3, tmp.z + tmp.nz * (g.lat - 1.5));
      }
      const fov = baseFov + g.fast * FOV_KICK;
      if (Math.abs(camera.fov - fov) > 0.04) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.position.copy(camPos); camera.lookAt(camLook);
      if (world && world.update) world.update(dt, g.t, camera);
      if (PL.own.update) { try { PL.own.update(dt, hook); } catch (e) { if (!g.hookErr) { g.hookErr = true; console.error('place update failed', e); } } }

      // HUD
      const kmh = Math.round(g.v * 3.6);
      if (kmh !== g.kmh) {
        g.kmh = kmh; speedNum.textContent = kmh;
        speedBar.style.width = Math.round(clamp(g.v / VMAX, 0, 1) * 100) + '%';
        speedEl.classList.toggle('hot', g.v > 19);
      }
      const rush = Math.round(Math.max(0, g.fast - 0.12) * 1.14 * 20) / 20; // the streaks at the edges of the picture
      if (rush !== g.rush) { g.rush = rush; rushEl.style.opacity = rush; rushEl.style.display = rush ? 'block' : 'none'; }
      const k = clamp(g.s / L, 0, 1);
      barFill.style.width = k * 100 + '%'; barBike.style.right = k * 100 + '%';
      const st = data.streets || [];
      if (g.mode === 'ride') while (streetIdx + 1 < st.length && g.s >= st[streetIdx + 1][0] - 4) { streetIdx++; showStreet(st[streetIdx][1]); }
      if (chips.length && g.s >= chips[0].s && g.mode === 'ride') {
        const c = chips.shift();
        chipEl.className = 'ride-chip ' + (c.side > 0 ? 'r' : 'l'); chipEl.textContent = c.n; void chipEl.offsetWidth; chipEl.classList.add('on');
      }
    }

    function updateThings(dt) {
      const sMin = g.s - 9, sMax = g.s + 115;
      for (let i = 0; i < things.length; i++) {
        const it = things[i];
        if (it.done) continue;
        if (it.type === 'hint') {
          if (g.s >= it.s && g.mode === 'ride') { it.done = true; if (!g.seen[it.hint]) { el.classList.add('hint-' + it.hint); setTimeout(() => el.classList.remove('hint-' + it.hint), 5200); } }
          continue;
        }
        const obj = it.obj;
        if (it.r === undefined) { it.r = obj.userData.r || 0.4; it.h = obj.userData.h || 0.8; if (it.type === 'star' && it.y === undefined) it.y = 0; } // a thing a place pushed in by itself
        // people and animals that move by themselves
        if (it.type === 'walker' || it.type === 'cyclist' || it.type === 'kid') {
          const active = it.type === 'kid' ? Math.abs(it.s - g.s) < 90 : it.s - g.s < (it.type === 'cyclist' ? 70 : 42) && it.s - g.s > -20;
          if (active) {
            if (it.target !== undefined) it.lat = damp(it.lat, it.target, 5, dt);
            if (it.minS === undefined || it.s > it.minS) it.s += it.v * dt;
            place(obj, it.s, it.lat, 0, it.v < 0);
            const u = obj.userData;
            if (it.type === 'cyclist') { if (u.drive) u.drive(dt, Math.abs(it.v)); } else if (u.walk) u.walk(dt, Math.abs(it.v));
            if (it.type === 'kid' && !it.cheered && it.s - g.s < 4 && it.s - g.s > -2) { it.cheered = true; if (u.cheer) u.cheer(true); }
          }
        } else if (it.type === 'cat' || it.type === 'ball') {
          const sp = it.type === 'cat' ? 1.9 : 2.6;
          if (!it.go && it.s - g.s < clamp(g.v * 4.7, 30, 100)) {
            it.go = true;
            if (obj.userData.mode) { obj.userData.mode('walk'); obj.userData.speed = sp; }
            if (it.type === 'ball' && obj.userData.roll) { P.at(it.s, tmp2); obj.userData.roll(tmp2.nx * it.dir * sp, tmp2.nz * it.dir * sp); }
          }
          if (it.go && !it.stopped) {
            it.lat += it.dir * sp * dt;
            if (it.type === 'cat') place(obj, it.s, it.lat, 0, false, it.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
            if (Math.abs(it.lat) > 5.4 && Math.sign(it.lat) === it.dir) { it.stopped = true; if (obj.userData.mode) obj.userData.mode('sit'); if (it.type === 'ball' && obj.userData.roll) obj.userData.roll(0, 0); }
          }
        } else if (it.type === 'guard') {
          const d = it.s - g.s;
          if (!it.up && d < 45) { it.up = true; if (obj.userData.stop) obj.userData.stop(true); }
        }
        const vis = it.s > sMin && it.s < sMax;
        if (obj.visible !== vis) obj.visible = vis;
        if (!vis) { if (it.s < sMin && it.type !== 'kid' && it.type !== 'guard') { it.done = true; } continue; }
        if (obj.userData.update) obj.userData.update(dt, g.t);
        if (obj.userData.gone) { obj.visible = false; it.done = true; continue; }
        if (g.mode !== 'ride') continue;

        const ds = it.s - g.s, dl = it.lat - g.lat, gone = -g.moved; // gone: what she passed during this frame
        if (it.type === 'star') {
          if (it.taken) { obj.position.x = rider.group.position.x; obj.position.z = rider.group.position.z; if (P.alt) obj.position.y = g.roadY + it.over; continue; } // its last sparkle stays over her head, however fast she rides on
          // a gentle pull when she is close (it reaches further when she is fast)
          if (ds < 2.2 + g.v * 0.1 && ds > gone - 0.8 && Math.abs(dl) < 1.5 && Math.abs(it.y - g.y) < 1.3) { it.lat = damp(it.lat, g.lat, 10 + g.v, dt); place(obj, it.s, it.lat, damp(obj.position.y - (P.alt ? P.at(it.s, tmp2).y : 0), it.y + (g.y - it.y) * 0.6, 8, dt)); }
          if (ds < 0.9 && ds > gone - 0.9 && Math.abs(it.lat - g.lat) < 0.95 + g.fast * 0.3 && Math.abs(it.y - g.y) < 1.15) {
            it.taken = true;
            const val = VALUE[it.kind] || 1;
            g.combo++; g.comboT = 1.1;
            if (val > 1) { sfx.big(); addStars(val, '+' + val, 'big'); } else { sfx.star(g.combo - 1); addStars(1); }
            it.over = g.y + 1.05; obj.position.y = g.roadY + it.over;
            if (obj.userData.collect) obj.userData.collect(); else { obj.visible = false; it.done = true; }
          }
        } else if (it.type === 'pigeon') {
          if (!it.fled && ds < 3.2 + g.v * 0.2 && Math.abs(dl) < 2.4) { flee(it, false); }
        } else if (it.type === 'obst') {
          if (it.hit) continue;
          const rr = it.r + 0.38, m = Math.max(0.6, it.r * 0.85);
          if (ds < m && ds > gone - m && Math.abs(dl) < rr) {
            if (it.kind === 'puddle') { if (g.y < 0.25) { it.hit = true; sfx.splash(); pop('ספלאש!', 'splash'); g.v *= 0.8; if (obj.userData.splash) obj.userData.splash(); } }
            else if (g.y < Math.min(0.75, it.h * 0.7)) { it.hit = true; bump(it); }
          }
        } else if (it.type === 'cat' || it.type === 'ball' || it.type === 'walker' || it.type === 'cyclist') {
          if (it.hit) continue;
          if (ds < 0.8 && ds > gone - 0.8 && Math.abs(dl) < it.r + 0.4 && g.y < 0.5) {
            it.hit = true; bump(it);
            if (it.type === 'cat') { sfx.meow(); it.dir *= 1; }
          }
        }
      }
    }

    function updateTraffic(dt) {
      crossings.forEach((X) => {
        const near = g.s > X.s0 - 260 && g.s < X.s1 + 45;
        if (!near) { if (X.cars.length && g.s > X.s1 + 45) { X.cars.forEach((c) => scene.remove(c.obj)); X.cars = []; } return; }
        const W = X.s1 - X.s0, laneS = [X.s0 + W * 0.2, X.s0 + W * 0.38, X.s0 + W * 0.62, X.s0 + W * 0.8];
        for (let d = 0; d < 2; d++) {
          X.spawn[d] -= dt;
          if (X.spawn[d] <= 0 && !X.green && !X.hold && X.cars.length < 9) {
            const lane = d * 2 + ((rnd() * 2) | 0), dir = d ? -1 : 1;
            if (!X.cars.some((c) => c.lane === lane && c.u * dir < -52)) {
              const kind = rnd() < 0.14 ? 'bus' : rnd() < 0.2 ? 'taxi' : 'car';
              const obj = make(kind, { seed: (rnd() * 1e6) | 0 });
              scene.add(obj);
              X.cars.push({ obj, lane, dir, u: -75 * dir, v: 8.5 + rnd() * 2.5, len: kind === 'bus' ? 13 : 6.4 });
            }
            X.spawn[d] = 1.5 + rnd() * 2.4;
          }
        }
        for (let l = 0; l < 4; l++) {
          const list = X.cars.filter((c) => c.lane === l).sort((a, b) => b.u * b.dir - a.u * a.dir);
          let limit = -9.5, prevFront = 1e9;
          list.forEach((c) => {
            let front = c.u * c.dir, next = front + c.v * dt;
            if ((X.green || X.hold) && front < -9) { next = Math.min(next, limit); limit = Math.min(limit, next) - c.len; }
            next = Math.min(next, prevFront - c.len);
            if (next < front) next = front;
            prevFront = next;
            if (c.obj.userData.drive) c.obj.userData.drive(dt, (next - front) / Math.max(dt, 1e-4));
            c.u = next * c.dir;
            P.at(laneS[l], tmp2);
            c.obj.position.set(tmp2.x + tmp2.nx * c.u, tmp2.y, tmp2.z + tmp2.nz * c.u);
            c.obj.rotation.y = Math.atan2(tmp2.nx * c.dir, tmp2.nz * c.dir);
            if (next > 85) { scene.remove(c.obj); c.dead = true; }
          });
        }
        X.cars = X.cars.filter((c) => !c.dead);
      });
    }

    /* ----- the end ----- */
    async function arrive() {
      g.mode = 'arrive';
      el.classList.remove('riding');
      DU.sound && DU.sound.play && DU.sound.play('fanfare');
      // wait until she has really stopped at the gate (game time, so a slow device shows the same thing)
      const t0 = g.t;
      while (!dead && g.v > 0.3 && g.t - t0 < 9) await wait(80);
      await wait(350);
      if (dead) return;
      await fade(1, 280);
      if (dead) return;
      g.frontCam = true; g.frontT = 0;
      if (rider.pose) rider.pose('cheer');
      try { if (PL.own.sound) PL.own.sound(hook); else sfx.chime(); } catch (e) { console.error(e); }
      if (DU.app && DU.app.confetti) DU.app.confetti(150);
      await fade(0, 320);
      say(`<b>${esc(texts.arrive)}</b>`, 2000, 'title low');
      await wait(2300);
      if (dead) return;
      result();
    }
    function result() {
      g.mode = 'done';
      const careful = g.bumps === 0 ? 100 : g.bumps <= 2 ? 40 : 0;
      const total = g.stars + 100 + careful;
      const rows = [
        [ico('star'), 'כוכבים בדרך', g.stars],
        [PL.icon, esc(texts.row), 100],
      ];
      if (careful) rows.push([ICON.bike, g.bumps === 0 ? 'רכיבה מושלמת' : 'רכיבה זהירה', careful]);
      const door = PL.id === 'school' && o.onSchool; // at the school she can go inside
      const more = (o.onPlaces ? `<button class="btn white small" data-ride="places">${ICON.pin} מקום אחר</button>` : '') + (o.onGarage ? `<button class="btn white small" data-ride="garage">${DU.bike.icon('wrench')} לעצב את האופניים</button>` : '');
      panel.innerHTML = `
        <div class="ride-card${door ? ' has-door' : ''}">
          <h2>איזו רכיבה!</h2>
          <div class="ride-rows">${rows.map((r) => `<div class="ride-row"><span class="i">${r[0]}</span><span class="l">${r[1]}</span><span class="p" dir="ltr">+${r[2]}</span></div>`).join('')}</div>
          <div class="ride-total">${ico('star')} <span dir="ltr">+${total}</span></div>
          ${g.polite ? `<p class="ride-note">${ICON.bell} צלצלת בנימוס ${g.polite} פעמים — כל הכבוד!</p>` : ''}
          ${g.top > CRUISE + 1.5 ? `<p class="ride-note">${ICON.rocket} הכי מהר שרכבת: <b dir="ltr">${Math.round(g.top * 3.6)}</b> קמ״ש</p>` : ''}
          ${door ? `<div class="row"><button class="btn big ride-door" data-ride="school">${ICON.door} ${esc(texts.enter || 'להיכנס')}</button></div>` : ''}
          <div class="row"><button class="btn ${door ? 'white' : 'big'}" data-ride="home">${ico('home')} הביתה</button><button class="btn white" data-ride="again">${ICON.bike} עוד רכיבה</button></div>
          ${more ? `<div class="row tight">${more}</div>` : ''}
        </div>`;
      panel.className = 'ride-panel end'; panel.hidden = false; hud.classList.add('quiet');
      if (o.onReward) { try { o.onReward(total, { stars: g.stars, bumps: g.bumps, polite: g.polite, top: g.top, place: PL.id }); } catch (e) { console.error(e); } }
      DU.sound && DU.sound.play && DU.sound.play('buy');
    }
    function askExit() {
      if (g.mode === 'done' || g.mode === 'load') return quit();
      g.paused = true;
      panel.className = 'ride-panel';
      panel.innerHTML = `<div class="ride-card small"><h2>לסיים את הרכיבה?</h2><div class="row"><button class="btn white" data-ride="quit">${ico('home')} כן, הביתה</button><button class="btn big" data-ride="resume">${ICON.bike} להמשיך לרכוב</button></div></div>`;
      panel.hidden = false;
    }
    function quit(again) {
      if (dead) return;
      dead = true; cancelAnimationFrame(raf); clearTimeout(msgTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', letGo);
      document.removeEventListener('visibilitychange', onVis);
      try { if (world && world.dispose) world.dispose(); } catch (e) { console.error(e); }
      try { if (rider && rider.dispose) rider.dispose(); } catch (e) { console.error(e); }
      try { if (trail) trail.dispose(); } catch (e) { console.error(e); }
      try { K.dispose(scene); renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); } catch (e) { console.error(e); }
      el.remove(); if (veil.isConnected) veil.remove();
      DU.ride.live = null;
      if (again === 'garage' && o.onGarage) o.onGarage();
      else if (again === 'places' && o.onPlaces) o.onPlaces(state);
      else if (again === 'school' && o.onSchool) o.onSchool(state);
      else if (again === true) DU.ride.start(Object.assign({}, o, { veil: null, run: (o.run || 0) + 1, bike: DU.bike.cur() })); // the same place once more
      else if (o.onExit) o.onExit();
    }

    /* ----- input ----- */
    function onKey(e) {
      const down = e.type === 'keydown';
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ש') input.left = down;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'ג') input.right = down;
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === "'") input.up = down;
      else if (k === 'ArrowDown' || k === 's' || k === 'S' || k === 'ד') input.down = down;
      else if (k === ' ') { if (down && !e.repeat) jump(); }
      else if (k === 'Enter' || k === 'b' || k === 'B' || k === 'נ') { if (down && !e.repeat) bell(); }
      else if (down && k === 'Escape') { if (g.paused) { g.paused = false; panel.hidden = true; } else askExit(); }
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    const letGo = () => { input.left = input.right = input.up = input.down = false; el.querySelectorAll('.down').forEach((b) => b.classList.remove('down')); }; // a key held when the window lost focus
    window.addEventListener('blur', letGo);
    function onVis() { if (document.hidden && (g.mode === 'ride' || g.mode === 'count') && !g.paused) askExit(); }
    document.addEventListener('visibilitychange', onVis);
    el.querySelectorAll('[data-hold]').forEach((b) => {
      const set = (v) => (e) => { e.preventDefault(); input[b.dataset.hold] = v; b.classList.toggle('down', v); if (v && b.setPointerCapture && e.pointerId !== undefined) { try { b.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } } };
      b.addEventListener('pointerdown', set(true));
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => b.addEventListener(t, set(false)));
    });
    el.querySelectorAll('[data-tap]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); (b.dataset.tap === 'jump' ? jump : bell)(); }));
    // drag anywhere on the picture to steer; a quick tap on it is a hop
    const cv = $('.ride-canvas', el);
    let dragId = null, dragX = 0, dragT = 0, dragMoved = false;
    cv.addEventListener('pointerdown', (e) => { dragId = e.pointerId; dragX = e.clientX; dragT = performance.now(); dragMoved = false; input.dragging = true; });
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerId !== dragId) return;
      const dx = e.clientX - dragX, span = Math.max(60, el.clientWidth * 0.09);
      if (Math.abs(dx) > 10) dragMoved = true;
      input.drag = clamp(dx / span, -1, 1);
    });
    const dragEnd = (e) => {
      if (e.pointerId !== dragId) return;
      if (!dragMoved && performance.now() - dragT < 260 && e.type === 'pointerup') jump();
      dragId = null; input.drag = 0; input.dragging = false;
    };
    cv.addEventListener('pointerup', dragEnd); cv.addEventListener('pointercancel', dragEnd);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ride]'); if (!b) return;
      e.stopPropagation();
      const a = b.dataset.ride;
      if (DU.sound) DU.sound.play('tap');
      if (a === 'exit') askExit();
      else if (a === 'quit' || a === 'home') quit();
      else if (a === 'again') quit(true);
      else if (a === 'garage' || a === 'places' || a === 'school') quit(a);
      else if (a === 'resume') { g.paused = false; panel.hidden = true; loop.last = performance.now(); }
      else if (a === 'mute') { if (DU.app && DU.app.actions) DU.app.actions.mute(); b.innerHTML = ico(DU.sound && DU.sound.muted ? 'mute' : 'sound'); }
    });
    ['touchmove', 'gesturestart'].forEach((t) => el.addEventListener(t, (e) => { if (!e.target.closest || !e.target.closest('.ride-panel')) e.preventDefault(); }, { passive: false }));

    /* ----- the loop ----- */
    let slowT = 0, frames = 0, acc = 0;
    function loop(now) {
      if (dead) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0.001, (now - loop.last) / 1000));
      loop.last = now;
      if (g.paused) return;
      update(dt);
      renderer.render(scene, camera);
      // a slow device gets a smaller picture instead of a choppy ride
      if (g.mode === 'ride') {
        frames++; acc += dt;
        if (acc >= 2) { const avg = acc / frames; frames = 0; acc = 0; if (avg > 0.03 && pixelRatio > 0.8) { slowT++; if (slowT >= 2) { pixelRatio = Math.max(0.75, pixelRatio * 0.75); renderer.setPixelRatio(pixelRatio); resize(); slowT = 0; } } else slowT = 0; }
      }
    }
    loop.last = performance.now();

    api.place = PL.id;
    api.debug = { g, input, scene, camera, renderer, things, crossings, place: PL.id, hook, get world() { return world; }, get corners() { return corners; }, step: (dt) => update(dt), render: () => renderer.render(scene, camera), get P() { return P; }, get rider() { return rider; }, jump, bell };
    build().catch(fail);
    return api;
  }

  DU.ride.loadingHtml = () => `<div class="ride-load-card"><div class="ride-wheel">${ICON.bike}</div><b>מכינים את האופניים…</b></div>`;
})();
