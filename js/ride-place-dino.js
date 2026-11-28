/* ride-place-dino.js — Dinosaur City as a place to ride to (the contract is at the top of places.js).
   Needs ride.js and the sky files (ride-sky.js, ride-sky-models.js, ride-sky-scene.js, ride-sky-city.js, ride-sky-world.js).

   The world, with everyone who lives in it and the welcome at the end, is DU.rideSky.build. This file is what the
   game puts ON the road, stretch by stretch, and what happens when she meets it:
     the ramp      every trick once: stars, a sleeping cloud to hop over, two clouds with the way between them
     the clouds    small rainbow rings to ride through, clouds, big stars over a hop
     the islands   dinosaur eggs: ride up to one and it hatches (5 stars); pterodactyls swoop across ahead of her;
                   on the meadow island baby dinosaurs cross the road
     the volcano   the five big rings (2 stars each), then puffy hearts all the way round to the top (5 stars each)
     the city      rings and eggs down the golden road, and a runway of stars in through the gate
   Clouds are soft, but riding into one still costs her speed like any bump; eggs and rings are treasures.
   When she rings her bell, the dinosaurs near her wave and hop (a star for each one who answers the first time). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const S = DU.rideSky;
  const PI = Math.PI;
  const NOTES = [784, 880, 988, 1175, 1319, 1568, 1760, 1976];
  let R = null; // what this ride's level put on the road and has to watch (made in level(), once per ride)
  const tmpP = {};

  const icon = '<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke="#4b3564" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">'
    + '<path d="M13 11L10 4L17 7M21 5.500L22 0.500L27 4.500" fill="#ffd35a"/>'
    + '<path d="M9 45V25C9 12.500 16 5.500 26 5.500C36 5.500 43 10.500 43 18C43 24.500 38 27.500 31 27.500H27V45Z" fill="#8fe3b4"/>'
    + '<path d="M13 45V33C13 30 22 30 23 33V45" fill="#eefbe2" stroke-width="2"/>'
    + '<circle cx="31.500" cy="14.500" r="3.400" fill="#fff" stroke-width="2"/><circle cx="32.300" cy="14.800" r="1.700" fill="#4b3564" stroke="none"/>'
    + '<path d="M33 21.500Q37 23 40 20" fill="none" stroke-width="2.200"/><circle cx="26.500" cy="21" r="2.300" fill="#ffb1c9" stroke="none"/>'
    + '</g></svg>';

  (DU.RIDE_PLACE = DU.RIDE_PLACE || {}).dino = {
    data: () => S.data(),
    world: (scene, data, opts) => S.build(scene, data, opts),
    texts: { start: 'רוכבים לעיר הדינוזאורים!', arrive: 'הגעת לעיר הדינוזאורים!', row: 'הגעת לעיר הדינוזאורים', arch: 'הגענו!', archBack: 'כל הכבוד!' },
    icon,
    /* arriving: a little fanfare, and two friendly roars (soft and rising, like a question) */
    sound(api) {
      [523, 659, 784, 1047, 1319].forEach((f, i) => api.tone(f, { at: i * 0.09, dur: 0.26, type: 'triangle', vol: 0.1 }));
      api.tone(196, { at: 0.55, dur: 0.34, type: 'sawtooth', vol: 0.05, slide: 330 }); api.tone(247, { at: 0.95, dur: 0.4, type: 'sawtooth', vol: 0.05, slide: 440 });
      [1568, 2093, 2637].forEach((f, i) => api.tone(f, { at: 1.3 + i * 0.1, dur: 0.3, type: 'sine', vol: 0.07 }));
    },

    /* at the end: the balloon arch and her friends, in the strip of the square that the city leaves free for them
       (the dinosaurs and the unicorns who welcome her are part of the world: ride-sky-city.js) */
    scenery(api) { api.std.arch(api); api.std.friends(api); },

    /* ---------- what lies on the way ---------- */
    level(api) {
      const kit = api.kit(), d = api.data, M = d.marks, L = api.L, LANES = api.LANES, B = kit.BEATS, items = kit.items;
      const zone = (id) => d.zones.find((z) => z.id === id);
      const meadow = (api.world && api.world.info && api.world.info.meadow) || { s0: M.corner - 34, s1: M.corner + 60 };
      R = { M, eggs: [], rings: [], pteros: [], babies: [], gates: ((api.world && api.world.gates) || []).map((q) => ({ s: q.s, obj: q.obj })), rang: 0, streak: 0, off: false, out: false };
      let n = 0;
      /* a thing with a model of ours (the game takes the item's own obj) */
      const own = (type, kind, model, s, lat, opts, more) => { const it = Object.assign({ type, kind, s, lat, y: 0, obj: S.make(model, Object.assign({ seed: n++ }, opts)) }, more); items.push(it); return it; };
      const puff = (s, lat) => own('obst', 'puff', 'puff', s, lat);
      const egg = (s, lat) => R.eggs.push(own('egg', 'egg', 'egg', s, lat, { size: 0.9 }));
      const ring = (s, lat) => { R.rings.push(own('ring', 'ring', 'ring', s, lat)); kit.star(s, lat, 0.65); }; // a star hangs in the middle of each ring
      const heart = (s, lat) => own('star', 'heart', 'heartpuff', s, lat);
      const hint = (s, what) => items.push({ type: 'hint', s, hint: what });
      const squeak = () => { api.tone(1100, { dur: 0.1, type: 'triangle', vol: 0.1, slide: 1700 }); api.tone(1500, { at: 0.12, dur: 0.14, type: 'triangle', vol: 0.08, slide: 1000 }); };

      /* the bits this place adds to the game's own (each takes about 24 m, like those) */
      B.puff = (s) => { const l = kit.lane(); kit.line(s + 1, 2, l); puff(s + 10.5, l); kit.arc(s + 10.5, l); hint(s + 1, 'jump'); };          // a sleeping cloud: hop over it, the stars are above it
      B.puffs = (s) => { const free = kit.lane(); LANES.forEach((l) => { if (l !== free) puff(s + 9, l); }); kit.line(s + 3, 4, free); };       // two clouds side by side: the stars show the way through
      B.rings = (s) => { const a = kit.lane(), b = kit.other(a); ring(s + 5, a); ring(s + 12.5, (a + b) / 2); ring(s + 20, b); };              // three rings, from one lane over to another
      B.egg = (s) => { const l = kit.lane(); kit.line(s + 2, 3, l); egg(s + 12.5, l); };
      B.eggs = (s) => { const sd = kit.side(); egg(s + 5, sd * 1.75); egg(s + 12, 0); egg(s + 19, -sd * 1.75); };
      B.hearts = (s) => { const a = kit.lane(), b = kit.other(a); heart(s + 5, a); kit.line(s + 9, 2, (a + b) / 2, 2.6); heart(s + 16, b); };
      B.baby = (s) => { const sd = kit.side(); R.babies.push(own('cat', 'baby', 'baby', s + 13, sd * 5.3, { size: 1.15 }, { dir: -sd, cry: squeak })); kit.line(s + 4, 3, 0); }; // it crosses like the cat of the street
      B.ptero = (s) => { R.pteros.push(own('ptero', 'ptero', 'ptero', s + 18, 0, { size: 1.5, y: 0, flap: 0.7, shadow: false }, { dir: kit.side() })); kit.zig(s + 2, 6, 1.4); };

      // her street: stars to the rainbow gate and up the first metres of the ramp
      kit.line(14, 6, 0.9, 3.2);
      kit.line(70, 10, 0, 3.6);
      // the ramp teaches every trick once, in this order
      kit.zone({ a: M.lift + 16, b: M.pierce - 22, list: ['line', 'zig', 'puff', 'jumpstars', 'puffs', 'bigstar', 'zig', 'puff', 'line', 'gem'], fixed: true });
      kit.line(M.pierce - 14, 13, 0, 3.4); // a row of stars leads her through the white of the cloud
      // the sea of clouds
      kit.zone({ a: zone('clouds').s0 + 16, b: zone('clouds').s1 - 20, list: ['rings', 'puffs', 'zig', 'puff', 'bigstar', 'heart', 'rings', 'jumpstars', 'gem', 'line'] });
      // the islands: eggs and pterodactyls before the meadow; on it a baby crosses, stars lead round the slow corner, a clutch of eggs after it
      kit.zone({ a: zone('islands').s0 + 4, b: meadow.s0 - 4, list: ['egg', 'ptero', 'eggs', 'zig', 'jumpstars', 'ptero'], fixed: true });
      kit.beat('baby', meadow.s0 + 2);
      for (let s = M.corner - 6; s < M.corner + 30; s += 3.2) kit.star(s, 1.75);
      kit.beat('eggs', M.corner + 32);
      kit.zone({ a: meadow.s1 + 6, b: M.rings + 6, list: ['ptero', 'egg', 'zig'], fixed: true });
      // the big rings (her reward for each is given in update), then hearts all the way round the volcano, and a big star at its top
      kit.line(M.rings + 14, 23, 0, 4);
      kit.zone({ a: M.spiral + 12, b: M.city - 26, list: ['hearts', 'zig', 'puff', 'hearts', 'line', 'gem', 'jumpstars', 'hearts', 'puffs'] });
      kit.beat('bigstar', M.city);
      // the glide down, and the runway of stars in through the gate
      kit.zone({ a: M.city + 34, b: L - 76, list: ['zig', 'rings', 'line', 'jumpstars', 'egg', 'rings', 'zig'], fixed: true });
      kit.beat('baby', L - 71); // one more baby runs across where the road comes onto the island of the city
      kit.line(L - 44, 10, 0, 3.2);
      return items;
    },

    /* ---------- every frame: the things of ours that the game does not know ---------- */
    update(dt, api) {
      if (!R) return;
      const g = api.g, riding = g.mode === 'ride';
      const near = (it, ahead, wide) => { const ds = it.s - g.s; return ds < ahead && ds > -g.moved - 0.9 && Math.abs(it.lat - g.lat) < wide; };
      const two = (f1, f2, type) => { api.tone(f1, { dur: 0.18, type, vol: 0.12 }); api.tone(f2, { at: 0.08, dur: 0.3, type: 'sine', vol: 0.1 }); };
      // the moments of the way: the take-off, and coming out above the clouds
      if (!R.off && g.s >= R.M.lift && riding) {
        R.off = true;
        api.say('<b>ממריאים!</b>', 1300, 'title low');
        api.tone(330, { dur: 0.9, type: 'sine', vol: 0.1, slide: 1320 }); api.tone(440, { at: 0.15, dur: 0.8, type: 'triangle', vol: 0.05, slide: 1760 });
      }
      if (!R.out && g.s >= R.M.pierce + 34 && riding) { R.out = true; [1047, 1319, 1568, 2093, 2637].forEach((f, i) => api.tone(f, { at: i * 0.08, dur: 0.4, type: 'sine', vol: 0.07 })); }
      if (riding) {
        // an egg hatches when she rides up to it: the baby pops out to see her pass
        R.eggs.forEach((it) => {
          if (it.got || it.done || !near(it, 4 + g.v * 0.4, 1.05)) return;
          it.got = true; it.obj.userData.hatch();
          api.addStars(5, '+5', 'big'); api.sfx.big(); api.tone(1400, { at: 0.2, dur: 0.12, type: 'triangle', vol: 0.09, slide: 2100 });
        });
        // a ring she rides through flashes; one ring after the other, they sing higher
        R.rings.forEach((it) => {
          if (it.got || it.done || !near(it, 0.4, 1.15)) return;
          it.got = true; it.obj.userData.pass();
          R.streak = g.t - (R.ringT || -9) < 2.5 ? Math.min(NOTES.length - 2, R.streak + 1) : 0; R.ringT = g.t;
          api.addStars(3, '+3', 'big'); two(NOTES[R.streak], NOTES[R.streak + 1], 'sine');
        });
        // the big rings over the whole road cannot be missed: each one flashes and gives two stars
        R.gates.forEach((q, i) => {
          if (q.got || g.s < q.s) return;
          q.got = true; q.obj.userData.pass();
          const k = Math.min(i, NOTES.length - 3);
          api.addStars(2, '+2', 'big'); two(NOTES[k], NOTES[k + 2], 'triangle');
        });
        // she rang: the dinosaurs who hear her wave and hop
        if ((g.rang || 0) !== R.rang) {
          R.rang = g.rang || 0;
          const k = api.world && api.world.hello ? api.world.hello(g.s) : 0;
          if (k) { g.polite += k; api.addStars(k, 'שלום! \u200E+' + k, 'thanks'); setTimeout(() => { if (!api.dead()) api.sfx.thanks(); }, 260); }
        }
      }
      // a baby that crosses looks where it goes, whichever way the game turned it
      R.babies.forEach((it) => {
        if (it.done) return;
        const q = api.P.at(it.s, tmpP);
        it.obj.userData.turn(Math.atan2(q.nx * it.dir, q.nz * it.dir) - it.obj.rotation.y);
      });
      // pterodactyls: each one circles off to the side until she comes near, then swoops across the road ahead of her
      R.pteros.forEach((it, i) => {
        if (it.done) return;
        const obj = it.obj;
        if (!it.t0) {
          const a = g.t * 0.45 + i * 2.1;
          api.place(obj, it.s + Math.cos(a) * 7, -it.dir * (34 + Math.sin(a) * 7), 12 + Math.sin(a * 2) * 1.5, false, -it.dir * (a + PI / 2));
          if (riding && !it.flown && it.s - g.s < 18 + g.v * 1.4 && it.s - g.s > 4) {
            it.t0 = g.t; it.flown = true;
            api.tone(700, { dur: 0.5, type: 'sine', vol: 0.06, slide: 1500 }); api.tone(1500, { at: 0.45, dur: 0.6, type: 'sine', vol: 0.05, slide: 600 }); // whoosh
          }
          return;
        }
        const u = (g.t - it.t0) / 3.6;
        if (u >= 1) { it.t0 = 0; it.dir = -it.dir; return; } // across: it goes on circling on the other side
        it.s = Math.max(it.s, g.s + 13); // always a little ahead of her, however fast she rides
        api.place(obj, it.s, it.dir * (u * 2 - 1) * 30, 3.1 + 8.5 * (u * 2 - 1) * (u * 2 - 1), false, -it.dir * PI / 2); // lowest over the road, well above her head even when she hops
        obj.rotation.z = -it.dir * 0.3 * Math.sin(u * PI);
      });
    },
  };
})();
