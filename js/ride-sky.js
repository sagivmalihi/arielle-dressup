/* ride-sky.js — the way to Dinosaur City: a road that leaves the real street and climbs into the clouds.
   Needs ride-data.js (the first stretch is her own street); build() also needs THREE, ride-kit.js,
   ride-world.js and ride-sky-models.js.

     DU.rideSky.data() → the route, in the shape of DU.RIDE_DATA plus
        alt     metres above the street for every route point (the engine lifts everything on the road by it)
        zones   [{ id, name, s0, s1 }]  the stretches: street · ramp · clouds · islands · volcano · city
        marks   named places along the way (metres from the start), for the level and the scenery
        deck    the height of the sea of clouds
     DU.rideSky.altAt(data, s) → the height of the road s metres from the start
     DU.rideSky.build(scene, data, opts) → world          (the same interface as DU.rideWorld.build; in ride-sky-world.js)
     DU.rideSky.make(kind, opts) → THREE.Group            (dinosaurs, unicorns, eggs, rings…; in ride-sky-models.js)

   The route is drawn here in code, not baked: a list of straights and bends, and a list of heights. Both are
   smoothed, so every bend eases in and out and every hill is round. Nothing is random. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const S = (DU.rideSky = DU.rideSky || {});
  const RAD = Math.PI / 180;

  const STEP = 2;
  const LIFT = 100;     // here the rainbow ramp leaves the street
  const COPY = 250;     // up to here the way is the school route itself (the ramp climbs right above her street)
  const DECK = 46;      // the sea of clouds lies this high above the street

  /* after the copied stretch: [metres, degrees turned (+ = to her right), name of the point where it starts] */
  const PLAN = [
    [20, 0], [170, -80], [70, 0],                         // over the rooftops, round to the south-east, into the cloud
    [130, 40, 'clouds'], [150, -45], [80, 30],            // the sea of clouds: one long S
    [110, 0, 'islands'], [70, -25], [24, 95, 'corner'], [102, -20],   // the islands: straight at the sun, then the one slow corner
    [110, 0, 'rings'], [300, -330, 'spiral'],             // through the rings, and round the volcano to its top
    [90, 25, 'city'], [90, -25], [70, 0],                 // the glide down to Dinosaur City
  ];
  /* heights: [metres from the start, metres above the street]; straight lines between them, then rounded */
  const HILLS = [
    [LIFT + 28, 0], [468, 57], [530, 60],
    [600, 68], [690, 53], [760, 60], [866, 62],
    [946, 76], [984, 70], [1140, 70], [1204, 60],    // (level across the big island: 1012…1112)
    [1286, 60], [1586, 100],
    [1620, 101], [1768, 80], [1836, 80],
  ];
  const ROUND_BEND = 20, ROUND_HILL = 28; // metres over which a bend / a slope eases in (HILLS[0] uses the 28)

  /* a moving average over w metres (applied twice it rounds the corners of a broken line) */
  function smooth(a, w) {
    const n = a.length, h = Math.max(1, Math.round(w / 2)), out = new Float64Array(n), pre = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];
    for (let i = 0; i < n; i++) { const lo = Math.max(0, i - h), hi = Math.min(n - 1, i + h); out[i] = (pre[hi + 1] - pre[lo]) / (hi - lo + 1); }
    return out;
  }

  let cache = null;
  S.data = function () {
    if (cache) return cache;
    const src = DU.RIDE_DATA, r = src.route, nCopy = COPY / STEP + 1;
    const route = [], alt = [];
    for (let i = 0; i < nCopy; i++) route.push(r[i * 2], r[i * 2 + 1]);

    /* the plan, metre by metre: how much she turns on each metre (rounded so bends ease in and out) */
    let total = 0;
    PLAN.forEach((p) => (total += p[0]));
    let turn = new Float64Array(total);
    const marks = { lift: LIFT };
    let o = 0;
    PLAN.forEach((p) => { if (p[2]) marks[p[2]] = COPY + o; for (let i = 0; i < p[0]; i++) turn[o + i] = (p[1] * RAD) / p[0]; o += p[0]; });
    const sum = (a) => { let t = 0; for (let i = 0; i < a.length; i++) t += a[i]; return t; };
    const want = sum(turn);
    turn = smooth(smooth(turn, ROUND_BEND), ROUND_BEND);
    const fix = want - sum(turn); // rounding the ends of the list loses a hair of the total turn: give it back evenly
    for (let i = 0; i < total; i++) turn[i] += fix / total;

    /* walk it: start where the copied stretch ends, heading the way her street runs (measured over a long
       piece of it, because the baked points are rounded to 10 cm) */
    const a0 = (LIFT / STEP - 20) * 2, a1 = (nCopy - 1) * 2;
    let th = Math.atan2(r[a1] - r[a0], r[a1 + 1] - r[a0 + 1]);
    let x = r[a1], z = r[a1 + 1];
    for (let i = 0; i < total; i++) {
      th -= turn[i] / 2; x += Math.sin(th); z += Math.cos(th); th -= turn[i] / 2;
      if ((i + 1) % STEP === 0) route.push(Math.round(x * 100) / 100, Math.round(z * 100) / 100);
    }
    const N = route.length / 2, length = COPY + total;

    /* heights, metre by metre, then every STEP. The rounding reaches ROUND_HILL metres to each side of a knot
       (the first knot is that far after LIFT, so the ramp leaves the street exactly there, and gently) */
    let h = new Float64Array(length + 1), k = 0;
    for (let s = 0; s <= length; s++) {
      while (k < HILLS.length - 2 && s > HILLS[k + 1][0]) k++;
      const A = HILLS[k], B = HILLS[k + 1], t = Math.max(0, Math.min(1, (s - A[0]) / (B[0] - A[0])));
      h[s] = A[1] + (B[1] - A[1]) * t;
    }
    h = smooth(smooth(h, ROUND_HILL), ROUND_HILL);
    for (let i = 0; i < N; i++) { const s = i * STEP; alt.push(s <= LIFT ? 0 : Math.round(h[Math.min(length, s)] * 100) / 100); }

    /* where the ramp goes into the cloud; about 36 m further on she is above it, and the sea of clouds begins */
    marks.pierce = STEP * alt.findIndex((y) => y >= DECK);
    const out = marks.pierce + 36;
    const Z = (id, name, s0, s1) => ({ id, name, s0, s1 });
    const zones = [
      Z('street', 'הרחוב שלנו', 0, LIFT),
      Z('ramp', 'הרמפה לעננים', LIFT, out),
      Z('clouds', 'ים העננים', out, marks.islands),
      Z('islands', 'האיים המרחפים', marks.islands, marks.rings),
      Z('volcano', 'הר הלבבות', marks.rings, marks.city),
      Z('city', 'עיר הדינוזאורים', marks.city, length),
    ];
    marks.gate = length - 34; // she rides in through the city gate; the square behind it ends the way
    cache = {
      step: STEP, length, route, alt, zones, marks, deck: DECK, sky: true,
      // the plates along the way: her two real streets, then the stretches of the sky (shown as they are, not as "רחוב …")
      streets: src.streets.filter((st) => st[0] < LIFT).map((st) => st.slice()).concat(zones.slice(1).map((z) => [z.s0, z.name, true])),
      cross: [], roads: [], buildings: [], areas: [], trees: [], props: [], pois: [],
      house: src.house, school: null,
    };
    return cache;
  };

  /* the height of the road s metres from the start (beyond the ends it stays level) */
  S.altAt = function (data, s) {
    const a = data.alt, f = Math.max(0, Math.min(a.length - 1, s / data.step)), i = Math.min(a.length - 2, Math.floor(f));
    return a[i] + (a[i + 1] - a[i]) * (f - i);
  };

  /* numbers about the way: climbs, the steepest slope, the tightest bend and how fast the engine lets her take it */
  S.stats = function (data) {
    const a = data.alt, r = data.route, N = a.length, st = data.step;
    let up = 0, down = 0, steep = 0, steepS = 0, top = 0, tight = 0, tightS = 0;
    for (let i = 1; i < N; i++) {
      const d = a[i] - a[i - 1];
      if (d > 0) up += d; else down -= d;
      if (Math.abs(d) / st > Math.abs(steep)) { steep = d / st; steepS = i * st; }
      if (a[i] > top) top = a[i];
    }
    const ang = (i) => Math.atan2(r[i * 2 + 2] - r[i * 2 - 2], r[i * 2 + 3] - r[i * 2 - 1]);
    const bends = [];
    let cur = null;
    for (let i = 3; i < N - 3; i++) {
      let d = ang(i + 2) - ang(i - 2);
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      const k = Math.abs(d) / (4 * st);
      if (k > tight) { tight = k; tightS = i * st; }
      if (k > 13 / (32 * 32)) { if (cur) { cur.s1 = i * st; cur.k = Math.max(cur.k, k); } else bends.push((cur = { s0: i * st, s1: i * st, k })); } else cur = null;
    }
    const v = (k) => Math.max(8, Math.min(32, Math.sqrt(13 / k)));
    return {
      length: data.length, climb: Math.round(up), descent: Math.round(down), top,
      steepest: Math.round(steep * 1000) / 10, steepestAt: steepS,
      tightestRadius: Math.round(10 / tight) / 10, tightestAt: tightS, tightestSpeed: Math.round(v(tight) * 10) / 10,
      slowBends: bends.map((b) => ({ s0: b.s0, s1: b.s1, radius: Math.round(10 / b.k) / 10, v: Math.round(v(b.k) * 10) / 10 })),
    };
  };
})();
