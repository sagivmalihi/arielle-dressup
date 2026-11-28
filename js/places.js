/* places.js — where she can ride to: the catalogue of places, which of them are hers, and their postcards.
   Always loaded and small; the 3D of a place is fetched only when she rides there (loadRide in app.js).

     DU.places.LIST                  [{ id, name, price, kind: 'city' | 'sky', files: [...], ready }]
     DU.places.get(id)               → the entry, or null
     DU.places.owns(id) / buy(id)    ownership key in the store: 'place:<id>' (a place that costs nothing is hers)
     DU.places.open(id)              → true when she can ride there now (hers, and ready)
     DU.places.cur() / select(id)    the place she chose last (saved in store.data.place); 'school' until she chooses
     DU.places.card(id)              → the postcard of the place: an <svg> string (viewBox 0 0 400 300, drawn here)
   The picker ("לאן רוכבים?") that shows the postcards is in app.js (pickPlace); css/places.css is its look.

   ======================= THE CONTRACT: how a place plugs into the ride =======================
   1. The catalogue entry (LIST below). files = what loadRide fetches for this place, in order, after the
      common ride files (three.js, ride-kit, ride-models, ride-world, ride-bike, ride-rider, ride, ride-garage).
      ready: false → the picker shows a "בקרוב" card that cannot be bought or ridden.

   2. Baked street data of a city place registers itself:
        (DU.RIDE_DATA_OF = DU.RIDE_DATA_OF || {})[id] = { step, length, route, streets, cross, end: { x, z, a },
                                                          house?, roads, buildings, areas, trees, props, pois, alt? }
      the same shape as DU.RIDE_DATA (ride-data.js), except that the destination is `end` where the school data
      has `school` (a = index of its area in `areas`, optional). The school keeps DU.RIDE_DATA.
      streets = [[s, name], …]: the plate shown from s on ("רחוב …"); [s, name, true] shows the name as it is
      (a stretch that is not a street).
      alt (optional) = one height in metres per route point (the same sampling as route): see 4.

   3. The hand-written module of a place registers its own behaviour. Every field is optional:
        (DU.RIDE_PLACE = DU.RIDE_PLACE || {})[id] = {
          data,                       the route data: an object, or a function (id) → object (called once per ride).
                                      Default: DU.RIDE_DATA_OF[id] (for 'school': DU.RIDE_DATA).
          world(scene, data, opts),   → a world with the interface written at the top of ride-world.js
                                      (update(dt, t, camera, s), dispose(), ready, info, parkOk: each one optional;
                                      s = how far along the way she is).
                                      opts = { quality: 'high' | 'low', place: id }. Default: DU.rideWorld.build.
                                      The game parks cars where world.parkOk(s, side) allows, up to world.info.parkEnd
                                      (without it: up to the first crossing); a world of its own without parkOk gets none.
                                      Whatever is added to the scene is freed with it when the ride closes.
          level(api),                 → the list of things on the way (stars, obstacles…). Default: DU.ride.std.level,
                                      the street level, which fits any route length and any number of crossings.
          scenery(api),               puts what stands along the way and at the end into the scene.
                                      Default: DU.ride.std.scenery = the balloon arch + her friends at the end.
          update(dt, api),            called every frame, after the camera and the world were moved.
          texts: { start, arrive, row, arch, archBack, enter },
                                      start "רוכבים ל…!" (the opening title) · arrive "הגעת ל…!" (the arrival line) ·
                                      row (the end-card row) · arch / archBack (the two banners of the arch) ·
                                      enter (the door button; only the school has a door).
                                      Default: made from the name in the catalogue; arch 'הגענו!' / 'כל הכבוד!'.
          icon,                       an <svg viewBox="0 0 48 48"> string, drawn like the icons in DU.ride.ICON:
                                      the end of the progress bar and the end-card row. Default: a little flag.
          sound(api),                 the arrival sound. Default: a soft chime (api.sfx.chime).
        }
      The school's own entry (kids on their way, the crossing patrol, the school bell, "בוקר טוב!") is
      DU.RIDE_PLACE.school, defined in ride.js.

      api = one object per ride, the same one for every hook:
        id, def                 the place id and its catalogue entry
        T, K, P, L, data        THREE, DU.rideKit, the path (K.path(data)), its length, the route data
        scene, camera, world, rider, state, bike, quality
        g                       the live game state: s (metres along), lat, v, y (the hop), mode, t, stars, roadY, slope,
                                rang (how many times she rang her bell)…
        make(kind, opts)        a model from ride-models.js (never throws: a stand-in when a kind is missing)
        place(obj, s, lat, y, flip, turn)   put obj on the way: s metres along, lat to the right, y above the ROAD,
                                facing the way she rides (flip: facing her; turn: a further turn in radians)
        things                  what the game moves, shows near her and frees: push { type, obj, s, lat, … }
                                (types the game knows: star · obst · pigeon · cat · ball · walker · cyclist · kid · guard ·
                                hint; any other type is only shown near her and gets obj.userData.update(dt, t).
                                A 'cat' item may carry cry(): what is heard when she bumps into it, instead of a meow)
        ambient                 objects whose userData.update(dt, t) runs every frame
        friends                 { obj, ph, face } who hop when she arrives (face: true = always turned to the camera)
        crossings, rnd (the seeded random of this ride), RR (DU.rideRider), LANES, VALUE, ICON, texts
        kit()                   → the level tools: star · line · zig · arc · ob · beat(name, s) · zone({ a, b, list }) · items
        std                     DU.ride.std: level(api) · scenery(api) · arch(api, opts) · friends(api) · kids(api, n) · guards(api, s)
        say(html, ms, cls), pop(text, cls), addStars(n, text, cls), tone(freq, opts), sfx
        dead()                  → true once the ride was closed (code that waits for something checks it first)
      A level is a list of items: { type, kind, s, lat, y, … }. The game makes the model of each item
      (make(kind, { seed })), or takes item.obj when the level made its own (userData.r / .h = its size).
      type 'star' is collected (kind: star · bigstar · heart · gem), type 'obst' bumps unless she hops over it.

   4. Heights. With data.alt, K.path(data).at(s) gives y (the height of the way) and slope (rise per metre),
      and the rider, the chase camera, everything put down with place(), the round shadows, the trail,
      collected stars and the hop are all measured from the road; the bike pitches with the slope.
      Things that lie on the road (userData.lie, or a puddle / a car) tilt with it. Without alt nothing changes.
      s stays the distance on the map; between two route points the height runs straight; beyond both ends the
      way goes on level (so let it start and end flat). Tried with slopes of 33 % and a climb of 110 m.

   5. DU.ride.start({ state, bike, place: id, … }) — see the top of ride.js. app.js: loadRide(id), startRide(state, id).

   6. ride-world.js builds from any data of that shape: what belongs to the school and to our house is built
      only when the data has data.school / data.house; world.info.gate comes from data.end || data.school.
      The data may tell the world more about its way (all optional; the list is at the top of ride-world.js):
      roadEnd (where the car streets end and the bike paths begin), humps, blvd, kiosk, keep (clearings for a
      welcome scene), Templer houses (buildings of kind 't'), a river (an area of kind 'river').
      ride-data-sarona.js / ride-place-sarona.js and the two files of Yarkon Park are worked examples of a city place.
   ============================================================================================== */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const PL = (DU.places = {});

  /* The prices: a ride pays about 250–370 stars and a finished character about 900–1600 (most often near 1250),
     so the first place opens within one sitting and Dinosaur City, the dearest thing in the game, after a few. */
  PL.LIST = [
    { id: 'school', name: 'בית הספר', price: 0, kind: 'city', files: ['js/ride-data.js'], ready: true },
    { id: 'sarona', name: 'שרונה', price: 500, kind: 'city', files: ['js/ride-data-sarona.js', 'js/ride-place-sarona.js'], ready: true },
    { id: 'yarkon', name: 'פארק הירקון', price: 1000, kind: 'city', files: ['js/ride-data-yarkon.js', 'js/ride-place-yarkon.js'], ready: true },
    { id: 'dino', name: 'עיר הדינוזאורים', price: 3000, kind: 'sky', files: ['js/ride-data.js', 'js/ride-sky.js', 'js/ride-sky-models.js', 'js/ride-sky-scene.js', 'js/ride-sky-city.js', 'js/ride-sky-world.js', 'js/ride-place-dino.js'], ready: true },
  ];
  PL.HOME = 'school'; // always hers, always there

  PL.get = (id) => PL.LIST.find((p) => p.id === id) || null;
  PL.price = (id) => { const p = PL.get(id); return p ? p.price || 0 : 0; };
  PL.owns = (id) => !!PL.get(id) && (!PL.price(id) || DU.store.owns('place:' + id));
  /* a place that is not ready yet cannot be bought */
  PL.buy = (id) => { const p = PL.get(id); return !!p && (PL.owns(id) || (!!p.ready && DU.store.buy('place:' + id, p.price))); };
  PL.open = (id) => { const p = PL.get(id); return !!p && !!p.ready && PL.owns(id); };
  PL.cur = () => { const id = DU.store.data.place; return PL.open(id) ? id : PL.HOME; };
  PL.select = function (id) { if (!PL.open(id)) return false; DU.store.data.place = id; DU.store.save(); return true; };

  /* ---------------- the postcards (viewBox 0 0 400 300; the middle 300×225 is what every screen shows) ---------------- */
  const n = (v) => Math.round(v * 10) / 10;
  const re = (x, y, w, h, f, more = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${f}" ${more}/>`;
  const ci = (x, y, r, f, more = '') => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${f}" ${more}/>`;
  const el = (x, y, rx, ry, f, more = '') => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${f}" ${more}/>`;
  const pa = (d, f, more = '') => `<path d="${d}" fill="${f}" ${more}/>`;
  const ln = (d, c, w, more = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${more}/>`;
  const lg = (id, stops, more = 'x1="0" y1="0" x2="0" y2="1"') => `<linearGradient id="${id}" ${more}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('')}</linearGradient>`;
  const cloud = (x, y, s, f = '#fff', op = 1) => `<g fill="${f}" fill-opacity="${op}">${el(x, y, s * 1.5, s * 0.5, f)}${ci(x - s * 0.6, y - s * 0.3, s * 0.55, f)}${ci(x + s * 0.1, y - s * 0.55, s * 0.72, f)}${ci(x + s * 0.8, y - s * 0.22, s * 0.48, f)}</g>`;
  const tree = (x, y, s, c = '#7fcf88', c2 = '#98dc9c') => re(x - s * 0.09, y - s * 0.5, s * 0.18, s * 0.55, '#b98f72', `rx="${n(s * 0.05)}"`) + ci(x, y - s * 0.86, s * 0.48, c) + ci(x - s * 0.3, y - s * 0.62, s * 0.34, c) + ci(x + s * 0.32, y - s * 0.6, s * 0.36, c) + ci(x - s * 0.1, y - s * 0.98, s * 0.26, c2) + ci(x + s * 0.2, y - s * 0.8, s * 0.2, c2);
  const RAINBOW = ['#ff8fa8', '#ffb46b', '#ffe07a', '#9be08f', '#8fd3ff', '#c3a6ff'];
  const BALLOON = ['#ff8fc0', '#ffd54d', '#7de3e0', '#b99cff', '#ffffff', '#ff9d4d', '#8fd3ff'];

  const CARDS = {
    /* the school: the gate with its balloon arch, the rainbow carpet, the building with its flag */
    school(u) {
      let s = `<defs>${lg(u + 's', [[0, '#8fd3ff'], [1, '#e6f7ff']])}</defs>` + re(0, 0, 400, 300, `url(#${u}s)`);
      s += ci(336, 50, 40, '#fff6c4', 'fill-opacity=".55"') + ci(336, 50, 23, '#fff3a8') + cloud(74, 54, 22) + cloud(246, 34, 15, '#fff', 0.85);
      s += pa('M0 150h34v-22h26v14h30v-30h24v38h172v-26h26v-18h30v30h28v14h30V200H0Z', '#d7e6fb');
      s += pa('M0 178Q100 150 200 164T400 158V300H0Z', '#b6e8a2') + tree(46, 190, 62) + tree(356, 188, 66) + tree(92, 180, 36, '#8fd9a0', '#aee5b4');
      // the building
      s += re(104, 100, 192, 92, '#fff6e0') + re(98, 92, 204, 12, '#ff9ec4', 'rx="4"') + re(104, 186, 192, 8, '#f0dfbd');
      [118, 142, 242, 266].forEach((x) => [112, 148].forEach((y) => (s += re(x, y, 17, 22, '#a9dcf5', 'rx="3"') + re(x, y, 17, 6, '#d6f0ff', 'rx="3"'))));
      s += re(170, 82, 60, 110, '#fffaf0') + pa('M162 84L200 56L238 84Z', '#ffd24d') + ci(200, 76, 6.5, '#fff', 'stroke="#e9b96b" stroke-width="2"') + ln('M200 76V72.500M200 76L202.500 77.500', '#8a6a5a', 1.4);
      s += pa('M186 192V150A14 14 0 0 1 214 150V192Z', '#8b6cf0') + ln('M200 138V192', '#6a4fd0', 1.6) + ci(204.500, 168, 1.8, '#ffd24d');
      s += ln('M200 58V26', '#c9ced6', 2.4) + pa('M201 28L226 34L201 42Z', '#ff5fa2') + ci(200, 25, 2.6, '#ffd24d');
      // lawn in front, the fence and the gate
      s += pa('M0 216Q110 200 200 208T400 204V300H0Z', '#a2df8c');
      const FENCE = ['#ff8fc0', '#ffd54d', '#7de3e0', '#b99cff', '#ff9d4d', '#63c98a', '#5aa9ff'];
      let f = '';
      for (let i = 0; i < 8; i++) [16 + i * 13.5, 280.5 + i * 13.5].forEach((x, k) => (f += pa(`M${n(x)} 234V207l4.500 -5l4.500 5V234Z`, FENCE[(i + k * 3) % FENCE.length])));
      s += re(12, 213, 116, 4, '#fff', 'rx="2"') + re(272, 213, 116, 4, '#fff', 'rx="2"') + re(12, 225, 116, 4, '#fff', 'rx="2"') + re(272, 225, 116, 4, '#fff', 'rx="2"') + f;
      // the rainbow carpet, from the door to us
      s += pa('M190 192H210L256 234H144Z', '#fbe7a8');
      const ys = [234, 242, 251, 261, 272, 285, 300];
      const edge = (y) => 56 + (y - 234) * 1.02; // half width of the carpet at y
      for (let i = 0; i < 6; i++) s += pa(`M${n(200 - edge(ys[i]))} ${ys[i]}H${n(200 + edge(ys[i]))}L${n(200 + edge(ys[i + 1]))} ${ys[i + 1]}H${n(200 - edge(ys[i + 1]))}Z`, RAINBOW[i]);
      s += ln(`M144 234L${n(200 - edge(300))} 300M256 234L${n(200 + edge(300))} 300`, '#fff', 3);
      // gate posts and the balloon arch between them
      s += re(126, 192, 15, 44, '#ff8fc0', 'rx="3"') + re(259, 192, 15, 44, '#7de3e0', 'rx="3"') + re(123, 188, 21, 6, '#fff', 'rx="3"') + re(256, 188, 21, 6, '#fff', 'rx="3"');
      let b = '';
      for (let i = 0; i <= 22; i++) {
        const a = (i / 22) * Math.PI, k = i % 2 ? 4 : -3, x = 200 - Math.cos(a) * (66.500 + k), y = 190 - Math.sin(a) * (86 + k), r = 8.500 + (i % 3) * 1.1;
        b += ci(x, y, r, BALLOON[(i * 3) % BALLOON.length]) + ci(x - r * 0.3, y - r * 0.36, r * 0.24, '#fff', 'fill-opacity=".75"');
      }
      s += b + ln('M178 110V124M222 110V124', '#fff', 1.4) + re(162, 121, 76, 22, '#fff', 'rx="11" stroke="#ffd54d" stroke-width="2.5"');
      s += `<text x="200" y="137" text-anchor="middle" direction="rtl" font-family="Fredoka, 'Arial Hebrew', system-ui, sans-serif" font-weight="700" font-size="14" fill="#ff5fa2">בוקר טוב!</text>`;
      [[70, 250, '#ff9fc4'], [104, 272, '#fff'], [42, 280, '#ffe08a'], [330, 252, '#fff'], [304, 276, '#ff9fc4'], [366, 282, '#ffe08a']].forEach(([x, y, c]) => (s += ci(x, y, 5, c) + ci(x, y, 2, c === '#ffe08a' ? '#ff9f5c' : '#ffd24d')));
      return s;
    },

    /* Sarona: the old houses with their red roofs on the lawn, the glass towers behind them */
    sarona(u) {
      let s = `<defs>${lg(u + 's', [[0, '#9fd9ff'], [0.7, '#e3f4ff'], [1, '#ffeeda']])}${lg(u + 't', [[0, '#cfeaf7'], [1, '#a9d5ec']])}${lg(u + 'v', [[0, '#bfe0f4'], [1, '#93c7e6']])}</defs>` + re(0, 0, 400, 300, `url(#${u}s)`);
      s += cloud(62, 60, 18, '#fff', 0.9) + cloud(338, 44, 14, '#fff', 0.8);
      // the towers
      const tower = (x, y, w, fill, cap) => {
        let t = cap === 'round' ? pa(`M${x} 190V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V190Z`, fill) : cap === 'slant' ? pa(`M${x} 190V${y + 18}L${x + w} ${y}V190Z`, fill) : re(x, y, w, 190 - y, fill, 'rx="3"');
        for (let yy = y + 22; yy < 176; yy += 12) t += ln(`M${x + 4} ${yy}H${x + w - 4}`, '#fff', 1.6, 'stroke-opacity=".55"');
        return t + re(x, y + (cap ? 20 : 4), 5, 186 - y - (cap ? 20 : 4), '#fff', 'fill-opacity=".28"');
      };
      s += tower(34, 86, 34, `url(#${u}t)`) + tower(96, 34, 44, `url(#${u}v)`, 'round') + tower(152, 62, 36, `url(#${u}t)`, 'slant') + tower(232, 20, 46, `url(#${u}v)`) + tower(290, 70, 40, `url(#${u}t)`, 'round') + tower(340, 100, 34, `url(#${u}v)`);
      s += pa('M0 190Q100 168 200 178T400 172V300H0Z', '#b6e8a2') + tree(196, 190, 44, '#8fd9a0', '#aee5b4') + tree(18, 204, 60) + tree(384, 200, 62);
      // the houses: stone walls, tiled roofs, wooden shutters
      const house = (x, y, w, h, hip, sh) => {
        const r = '#ee6f57', rd = '#d85a45', top = y - w * 0.3;
        let t = re(x, y, w, h, '#fff3dc') + re(x, y + h - 7, w, 7, '#ecd9b8') + re(x, y, w, 5, '#ecd9b8');
        t += hip ? pa(`M${x - 9} ${y}L${n(x + w * 0.2)} ${n(top)}H${n(x + w * 0.8)}L${x + w + 9} ${y}Z`, r) + pa(`M${x - 9} ${y}L${n(x + w * 0.2)} ${n(top)}L${n(x + w * 0.3)} ${y}Z`, rd, 'fill-opacity=".55"')
          : pa(`M${x - 9} ${y}L${n(x + w / 2)} ${n(top - 6)}L${x + w + 9} ${y}Z`, r) + pa(`M${x - 9} ${y}L${n(x + w / 2)} ${n(top - 6)}L${n(x + w / 2)} ${y}Z`, rd, 'fill-opacity=".45"');
        for (let i = 1; i < 4; i++) t += ln(`M${n(x - 9 + i * 7)} ${n(y - i * (y - top) / 4.6)}H${n(x + w + 9 - i * 7)}`, '#fff', 1.2, 'stroke-opacity=".3"');
        const wn = (wx, wy) => re(wx, wy, 12, 17, '#9fd0ea', 'rx="6"') + re(wx - 6, wy + 2, 6, 15, sh, 'rx="1.500"') + re(wx + 12, wy + 2, 6, 15, sh, 'rx="1.500"');
        t += wn(x + w * 0.2 - 6, y + 14) + wn(x + w * 0.8 - 6, y + 14);
        t += pa(`M${n(x + w / 2 - 8)} ${y + h}V${y + h - 26}A8 8 0 0 1 ${n(x + w / 2 + 8)} ${y + h - 26}V${y + h}Z`, '#5fa56b') + ln(`M${n(x + w / 2)} ${y + h}V${y + h - 33}`, '#4a8c58', 1.2) + ci(x + w / 2 + 3, y + h - 13, 1.4, '#ffd24d');
        return t;
      };
      s += house(52, 150, 92, 54, false, '#5fa56b') + re(120, 118, 9, 20, '#ecd9b8') + house(232, 142, 118, 62, true, '#5fa56b'); // green shutters and doors, as on the real houses
      // the lawn, a path, the lily pond with its little bridge, flags between the houses
      s += pa('M0 208Q120 194 220 202T400 198V300H0Z', '#a2df8c') + pa('M0 246Q130 226 250 240T400 232V300H0Z', '#93d67c', 'fill-opacity=".6"');
      s += pa('M176 204Q210 232 168 262Q150 280 168 300H232Q206 280 226 262Q262 228 212 204Z', '#fbeccb');
      let bun = '';
      const BUNT = ['#ff8fc0', '#ffd54d', '#7de3e0', '#b99cff', '#ff9d4d'];
      for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8, x = 150 + t * 78, y = 140 + Math.sin(t * Math.PI) * 14; bun += pa(`M${n(x - 4.500)} ${n(y)}h9l-4.500 9Z`, BUNT[i % 5]); }
      s += ln('M150 140Q189 168 228 140', '#c9b3a0', 1.2) + bun;
      let pond = el(312, 256, 50, 19, '#f1e8d4') + el(312, 256, 45, 15, '#8fd6f2') + el(312, 258, 27, 8, '#6cc4e8', 'fill-opacity=".7"');
      pond += el(284, 257, 6.500, 2.800, '#7fcf88') + el(341, 252, 5.500, 2.400, '#7fcf88') + el(336, 263, 5, 2.200, '#8fd9a0') + ci(284, 255.500, 2.600, '#ff9fc4') + ci(342, 250.500, 2.200, '#fff') + ci(336, 261.500, 2, '#ff9fc4');
      pond += ln('M290 270Q312 240 334 270', '#c9976b', 5.500) + ln('M290 262Q312 232 334 262', '#a97b52', 1.800) + ln('M297 255V263M312 247V255M327 255V263', '#a97b52', 1.800);
      pond += ln('M268 252V238M273 254V242M356 250V236M361 252V241', '#6cc494', 2) + el(268, 236, 2, 5, '#b98f72') + el(356, 234, 2, 5, '#b98f72');
      s += `<g transform="translate(-14 -17)">${pond}</g>`; // (inside the middle of the card, which is all a small screen shows)
      s += tree(92, 262, 50, '#6cc494', '#8fd9b0');
      [[40, 262, '#fff'], [140, 282, '#ffe08a'], [256, 288, '#ff9fc4'], [378, 270, '#fff'], [64, 288, '#ff9fc4'], [352, 290, '#ffe08a']].forEach(([x, y, c]) => (s += ci(x, y, 4.500, c) + ci(x, y, 1.8, c === '#ffe08a' ? '#ff9f5c' : '#ffd24d')));
      return s;
    },

    /* Yarkon Park: the river with the swan boat and a pedal boat on it, a wooden bridge, tall trees, kites,
       a picnic on the lawn, the balloon over the park */
    yarkon(u) {
      let s = `<defs>${lg(u + 's', [[0, '#8fd3ff'], [1, '#e9f8ff']])}${lg(u + 'w', [[0, '#8ed6f2'], [1, '#5fb9e3']])}</defs>` + re(0, 0, 400, 300, `url(#${u}s)`);
      s += ci(60, 48, 38, '#fff6c4', 'fill-opacity=".55"') + ci(60, 48, 22, '#fff3a8') + cloud(168, 44, 17, '#fff', 0.9) + cloud(350, 78, 14, '#fff', 0.8);
      // the balloon of the park
      s += ln('M287 92L292 108M313 92L308 108', '#b99a8a', 1.4) + pa('M270 62A30 30 0 0 1 330 62Q330 80 312 94H288Q270 80 270 62Z', '#ff8fc0') + pa('M290 34Q280 60 290 94H300V32ZM310 34Q320 60 310 94H300V32Z', '#ffd54d') + pa('M296 32.500Q292 60 297 94H303Q308 60 304 32.500Z', '#7de3e0') + re(291, 107, 18, 12, '#e0a868', 'rx="3"');
      s += pa('M0 160h40v-12h30v-18h22v24h40v-14h28v20h80v-16h30v-12h24v22h40v-10h36v16h30V200H0Z', '#d7e6fb', 'fill-opacity=".8"');
      s += pa('M0 176Q90 156 200 168T400 160V300H0Z', '#b6e8a2');
      // a little bridge far away
      s += ln('M150 178Q200 156 250 178', '#c9976b', 6) + ln('M150 171Q200 149 250 171', '#a97b52', 2.2) + ln('M166 166V174M183 161V169M200 159V167M217 161V169M234 166V174', '#a97b52', 2);
      // kites over the lawn, on their strings
      const kite = (x, y, k, c, c2, tx, ty) => ln(`M${x} ${n(y + 12 * k)}Q${n((x + tx) / 2 + 8)} ${n((y + ty) / 2 + 14)} ${tx} ${ty}`, '#fff', 1, 'stroke-opacity=".85"') + pa(`M${x} ${n(y - 13 * k)}L${n(x + 9 * k)} ${y}L${x} ${n(y + 13 * k)}Z`, c) + pa(`M${x} ${n(y - 13 * k)}L${n(x - 9 * k)} ${y}L${x} ${n(y + 13 * k)}Z`, c2) + ln(`M${x} ${n(y + 13 * k)}q${n(5 * k)} ${n(6 * k)} ${n(-1 * k)} ${n(12 * k)}q${n(-5 * k)} ${n(6 * k)} ${n(2 * k)} ${n(11 * k)}`, c, 1.6);
      s += kite(128, 88, 1, '#ff6b6b', '#ffd54d', 96, 212) + kite(226, 96, 0.8, '#b99cff', '#ff8fc0', 340, 214);
      // the river
      s += pa('M172 178Q230 196 196 220Q140 252 176 300H360Q296 262 316 232Q336 198 232 178Z', `url(#${u}w)`);
      s += ln('M212 196q10 -3 20 0M196 226q14 -4 28 0M250 246q14 -4 28 0M214 276q16 -5 32 0M286 286q12 -3 24 0', '#fff', 2.2, 'stroke-opacity=".7"');
      s += pa('M172 178Q230 196 196 220Q140 252 176 300H160Q124 252 180 220Q212 196 160 178Z', '#93d67c') + pa('M232 178Q336 198 316 232Q296 262 360 300H378Q312 262 332 232Q352 198 244 178Z', '#93d67c');
      // tall trees on both banks
      const euc = (x, y, k, c, c2) => ln(`M${x} ${y}Q${x + 3 * k} ${y - 46 * k} ${x - 1 * k} ${y - 84 * k}`, '#c9a98a', 5 * k) + el(x - 2 * k, y - 96 * k, 24 * k, 30 * k, c) + el(x - 20 * k, y - 76 * k, 17 * k, 21 * k, c) + el(x + 18 * k, y - 78 * k, 17 * k, 22 * k, c) + el(x - 6 * k, y - 108 * k, 13 * k, 15 * k, c2) + el(x + 12 * k, y - 90 * k, 9 * k, 11 * k, c2);
      s += euc(52, 206, 0.8, '#7fcf88', '#98dc9c') + euc(360, 204, 0.82, '#7fcf88', '#98dc9c') + euc(106, 196, 0.5, '#8fd9a0', '#aee5b4') + euc(304, 190, 0.46, '#8fd9a0', '#aee5b4');
      s += pa('M0 224Q70 206 138 222Q110 262 140 300H0Z', '#a2df8c') + pa('M400 214Q352 206 338 226Q326 262 388 300H400Z', '#a2df8c');
      s += euc(24, 284, 1.18, '#6cc494', '#8fd9b0');
      // a picnic on the lawn
      s += pa('M58 250l42 -7l11 23l-44 8Z', '#fff') + pa('M58 250l21 -3.500l5 12l-21 4ZM84 258.500l21 -4l6 11.500l-22 4Z', '#ff8fa8') + pa('M82 242h17l-3 13h-11Z', '#e0a868') + ln('M83 242Q90.500 231 98 242', '#c98f4e', 2) + ci(72, 270, 3.600, '#ff6b6b') + ci(78, 272, 3, '#ffd54d');
      // a pedal boat with a striped roof, further up the river
      s += el(232, 213, 17, 2.600, '#3f8fc0', 'fill-opacity=".3"') + pa('M217 204H247Q245 213 239 213H225Q219 213 217 204Z', '#ffd54d') + pa('M217 204H247L246 207H218Z', '#fff') + ln('M221 204V193M243 204V193', '#fff', 1.400) + re(218, 190, 28, 4, '#fff', 'rx="1.500"') + re(218, 190, 5.600, 4, '#ff8fc0') + re(229.200, 190, 5.600, 4, '#ff8fc0') + re(240.400, 190, 5.600, 4, '#ff8fc0') + ci(228, 200, 2.800, '#ffd9c2') + ci(236, 200, 2.800, '#e0a878');
      // the swan boat, with two children in it
      s += el(240, 257, 44, 5.500, '#3f8fc0', 'fill-opacity=".35"');
      s += ln('M270 244Q292 232 280 212Q274 202 284 197', '#fff', 8.500) + ci(286, 197, 7, '#fff') + pa('M291 194.500l11 3.500l-11 3Z', '#ff9d4d') + ci(288, 195.500, 1.200, '#4b3564') + ci(284, 200, 2, '#ffc2d6', 'fill-opacity=".8"');
      s += ci(232, 233, 5.500, '#ffd9c2') + pa('M226.500 232a5.500 5.500 0 0 1 11 0Z', '#ff9d4d') + ci(248, 233, 5.500, '#e0a878') + pa('M242.500 232a5.500 5.500 0 0 1 11 0Z', '#5a3c2a') + pa('M225 238q7 -5 14 0v6h-14Z', '#8b6cf0') + pa('M241 238q7 -5 14 0v6h-14Z', '#63c98a');
      s += pa('M202 240Q202 258 222 258H262Q278 258 280 242Q262 236 240 238Q216 236 202 240Z', '#fff') + pa('M206 246Q220 232 250 242Q240 256 216 254Z', '#eaf2fa') + pa('M202 240Q196 234 190 238Q198 240 204 248Z', '#fff');
      // ducks, lily pads, reeds
      const duck = (x, y, k) => el(x, y, 7 * k, 4.500 * k, '#fff') + ci(x + 6 * k, y - 4.500 * k, 3.4 * k, '#fff') + pa(`M${n(x + 9 * k)} ${n(y - 4.500 * k)}l${n(4 * k)} ${n(1 * k)}l${n(-4 * k)} ${n(1.500 * k)}Z`, '#ff9d4d') + ci(x + 7 * k, y - 5.200 * k, 0.7 * k, '#4b3564');
      s += duck(296, 272, 1) + duck(312, 280, 0.7) + duck(214, 208, 0.6);
      s += el(206, 284, 8, 3.4, '#7fcf88') + el(222, 290, 6, 2.6, '#7fcf88') + ci(207, 283, 2.4, '#ff9fc4');
      s += ln('M150 262V236M156 264V242M144 266V246', '#6cc494', 2.2) + el(150, 234, 2.4, 6, '#b98f72') + el(156, 240, 2.2, 5.500, '#b98f72');
      [[60, 250, '#fff'], [92, 276, '#ffe08a'], [372, 256, '#ff9fc4'], [384, 284, '#fff']].forEach(([x, y, c]) => (s += ci(x, y, 4.500, c) + ci(x, y, 1.8, c === '#ffe08a' ? '#ff9f5c' : '#ffd24d')));
      return s;
    },

    /* Dinosaur City: a rainbow road through the clouds up to the city of egg-domed towers, a friendly long-neck and a unicorn */
    dino(u) {
      let s = `<defs>${lg(u + 's', [[0, '#9f8cff'], [0.5, '#f0b3ee'], [1, '#ffe3c2']])}${lg(u + 'm', [[0, '#ff9ec4'], [0.5, '#c9b3ff'], [1, '#8fd3ff']])}</defs>` + re(0, 0, 400, 300, `url(#${u}s)`);
      [[40, 36, 7], [118, 22, 4.500], [206, 40, 6], [372, 30, 6], [330, 96, 4], [24, 112, 4.500], [164, 78, 3.500]].forEach(([x, y, r]) => (s += pa(DU.sparkleD(x, y, r), '#fff', 'fill-opacity=".9"')));
      s += ci(300, 44, 17, '#fff7d6') + ci(308, 39, 15, '#c7a4f6');
      // the city on its floating island, far away: round towers with spotted eggs for domes, and hearts from the volcano beside it
      s += cloud(204, 140, 30, '#fff', 0.95) + pa('M158 126Q204 118 252 126Q240 147 218 154Q205 161 191 154Q169 147 158 126Z', '#b9a3ea') + el(205, 126, 47, 6.5, '#a8e6a2');
      const twr = (x, y, w, c, c2) => re(x, y, w, 126 - y, c, 'rx="2"') + el(x + w / 2, y - w * 0.5, w * 0.64, w * 0.95, c2) + ci(x + w * 0.3, y - w * 0.85, w * 0.14, '#fff', 'fill-opacity=".9"') + ci(x + w * 0.72, y - w * 0.35, w * 0.11, '#fff', 'fill-opacity=".9"') + re(x - 1.5, y - 1.5, w + 3, 3.2, '#fff', 'rx="1.600"') + ci(x + w / 2, y + 9, 2.1, '#fff3a8');
      s += twr(174, 100, 12, '#ffd9ea', '#ff8fc0') + twr(193, 88, 17, '#fff6ea', '#fff') + twr(216, 98, 12, '#d6f0ff', '#8fb8ff') + ci(198, 76, 2.4, '#ffd35a') + ci(205, 68, 1.9, '#ffd35a');
      s += ln('M201.500 62V52', '#fff', 1.6) + pa('M202 52l10 3l-10 4Z', '#ff8fc0');
      s += pa(DU.heartD(146, 100, 5), '#ff8fc0', 'fill-opacity=".9"') + pa(DU.heartD(137, 84, 3.6), '#ff8fc0', 'fill-opacity=".75"') + pa(DU.heartD(150, 72, 2.6), '#ff8fc0', 'fill-opacity=".6"');
      // the rainbow road: from us, round a bend, up to the city
      const road = 'M150 318C150 262 280 252 276 208C273 176 216 168 206 138';
      [34, 28.500, 23, 17.500, 12, 6.500].forEach((w, i) => (s += ln(road, RAINBOW[i], w, 'stroke-linecap="butt"')));
      // (seen from above the far end is thin: the clouds cover what would stick out)
      s += cloud(214, 150, 22, '#fff', 1) + cloud(316, 216, 30) + cloud(102, 228, 34) + cloud(250, 292, 44) + cloud(30, 296, 40) + cloud(390, 286, 34);
      // the dinosaur, on the cloud at the left
      const G = '#8fdc9a', GD = '#6fc884', GL = '#d2f5cf';
      let d = pa('M38 214Q10 220 6 196Q20 212 44 200Z', G);
      d += re(50, 214, 13, 24, GD, 'rx="6"') + re(84, 214, 13, 24, GD, 'rx="6"');
      d += el(72, 206, 38, 24, G) + el(72, 216, 26, 11, GL);
      d += pa('M86 196Q98 168 102 142Q104 122 122 122Q140 122 140 137Q140 151 122 152Q118 176 106 206Z', G);
      d += re(40, 218, 14, 24, G, 'rx="7"') + re(92, 218, 14, 24, G, 'rx="7"');
      [[48, 186, 6], [62, 180, 7], [77, 180, 7], [91, 186, 6]].forEach(([x, y, r]) => (d += pa(`M${x - r} ${y + 4}Q${x} ${y - r * 1.9} ${x + r} ${y + 4}Z`, '#ffd76a')));
      d += ci(58, 202, 4, GD, 'fill-opacity=".6"') + ci(74, 196, 3, GD, 'fill-opacity=".6"') + ci(90, 204, 3.4, GD, 'fill-opacity=".6"');
      d += ci(126, 133, 3.2, '#4b3564') + ci(127, 132, 1.1, '#fff') + ln('M122 143Q129 147 135 141', '#4b3564', 1.8) + ci(118, 142, 3.6, '#ff9ec4', 'fill-opacity=".8"') + ci(136.500, 133, 1, '#4b3564', 'fill-opacity=".5"');
      s += `<g transform="translate(28.6 24.2) scale(.9)">${d}</g>`; // (both stand a little inside, so a squarer card does not cut them)
      // the unicorn, on the cloud at the right
      const W = '#ffffff', WL = '#d9cdf5';
      let c = pa('M356 190Q384 186 380 214Q372 204 366 212Q362 200 352 200Z', `url(#${u}m)`);
      c += re(310, 198, 8, 24, '#efe8fb', 'rx="4"') + re(338, 198, 8, 24, '#efe8fb', 'rx="4"');
      c += el(328, 192, 28, 17, W, `stroke="${WL}" stroke-width="1.500"`);
      c += re(302, 200, 9, 26, W, `rx="4.500" stroke="${WL}" stroke-width="1.500"`) + re(346, 200, 9, 26, W, `rx="4.500" stroke="${WL}" stroke-width="1.500"`);
      c += re(302, 221, 9, 5, '#ffd54d', 'rx="2"') + re(346, 221, 9, 5, '#ffd54d', 'rx="2"') + re(310, 218, 8, 4, '#ffd54d', 'rx="2"') + re(338, 218, 8, 4, '#ffd54d', 'rx="2"');
      c += pa('M304 190Q296 170 294 154L312 150Q318 172 326 180Z', W, `stroke="${WL}" stroke-width="1.500"`);
      c += pa('M284 148Q282 134 296 132Q312 130 314 146Q314 158 300 160Q284 164 276 158Q274 152 284 148Z', W, `stroke="${WL}" stroke-width="1.500"`);
      c += pa('M297 133L291 108L304 131Z', '#ffd54d') + ln('M294.500 122L299 124M296 128L301.500 129', '#e9a92c', 1.2) + pa('M306 132L312 121L314 135Z', W, `stroke="${WL}" stroke-width="1.500"`);
      c += pa('M308 132Q324 136 322 152Q330 160 324 172Q332 180 326 190Q318 178 318 168Q312 158 314 148Q312 138 308 132Z', `url(#${u}m)`);
      c += ln('M288 146q4 3 8 0', '#4b3564', 1.7) + ci(293, 153, 3.2, '#ff9ec4', 'fill-opacity=".8"') + ci(279, 154, 0.9, '#4b3564', 'fill-opacity=".5"');
      s += `<g transform="translate(20.4 22.6) scale(.9)">${c}</g>`;
      s += pa(DU.sparkleD(166, 206, 6), '#fff') + pa(DU.sparkleD(252, 176, 5), '#fff') + pa(DU.starD(344, 150, 7), '#ffd54d') + pa(DU.starD(56, 150, 6), '#ffd54d') + pa(DU.heartD(232, 234, 6), '#ff8fc0');
      return s;
    },
  };
  /* the picture fills its card and is cropped to its shape ('slice'), so what matters is drawn in the middle */
  PL.card = function (id, cls) {
    const f = CARDS[id];
    if (!f) return '';
    let inner = '';
    try { inner = f(DU.uid('pc')); } catch (e) { console.error('places: postcard failed', id, e); }
    return `<svg class="${cls || 'pl-art'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${inner}</svg>`;
  };
})();
