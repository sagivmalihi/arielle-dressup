/* ride.js — the bike ride to school: a small 3D game on the real streets (ride-data.js).
   DU.ride.start({ state, veil, onReward(stars), onExit() }) → { stop() }
   The city comes from ride-world.js, the girl and her bike from ride-rider.js, the stars, cones,
   pigeons, cars and people from ride-models.js. This file is the game itself: the path, the camera,
   steering, what lies on the road, the two traffic lights, the HUD, the arrival.
   Everything here is loaded only when a ride starts (see loadRide in app.js). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const tone = (f, o) => { if (DU.sound && DU.sound.tone) DU.sound.tone(f, o); };
  const ico = (name) => (DU.icon && DU.icon(name)) || '';

  const CRUISE = 6.4;      // m/s
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
    bell: svg('<g stroke="#4b3564" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"><path d="M9 34C13 31 12 26 13 20C14 13 18 9 24 9C30 9 34 13 35 20C36 26 35 31 39 34Z" fill="#ffd24d"/><path d="M20 38C21 41 27 41 28 38" fill="none"/><path d="M24 9V5" fill="none"/><path d="M17 17C18 14 20 13 22 12.5" fill="none" stroke="#fff"/></g>'),
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
      const a = P.at(s), b = P.at(s + 2), w = 3.8;
      pos.push(a.x - a.nx * w, 0.02, a.z - a.nz * w, a.x + a.nx * w, 0.02, a.z + a.nz * w, b.x + b.nx * w, 0.02, b.z + b.nz * w, a.x - a.nx * w, 0.02, a.z - a.nz * w, b.x + b.nx * w, 0.02, b.z + b.nz * w, b.x - b.nx * w, 0.02, b.z - b.nz * w);
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

  /* ---------- what lies on the way ---------- */
  function buildLevel(P, data, rnd) {
    const items = [], L = P.length;
    const star = (s, lat, y = 0, kind = 'star') => items.push({ type: 'star', kind, s, lat, y });
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
    /* stretches of the way and what may appear on each (the corners and the crossings stay free) */
    const cr = data.cross || [];
    const c1 = cr[0] || { s0: 543, s1: 568 }, c2 = cr[1] || { s0: 875, s1: 898 };
    const teach = ['line', 'zig', 'cones', 'jumpstars', 'puddle', 'pigeons'];
    const street = ['cones', 'puddle', 'pigeons', 'bins', 'barrier', 'scooter', 'cat', 'ball', 'zig', 'jumpstars', 'bigstar', 'line', 'heart', 'gem'];
    const zones = [
      { a: 12, b: 44, list: ['line'] },
      { a: 74, b: c1.s0 - 38, list: street, teach },
      { a: c1.s1 + 30, b: c1.s1 + 82, list: ['walkers', 'line', 'walkers'], fixed: true },
      { a: c1.s1 + 112, b: c2.s0 - 38, list: ['cyclist', 'scooter', 'jumpstars', 'bigstar', 'cones', 'cyclist', 'puddle', 'zig', 'gem'] },
      { a: c2.s1 + 12, b: L - 50, list: ['zig', 'jumpstars', 'line', 'heart'], fixed: true },
    ];
    zones.forEach((z) => {
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
    });
    // stars across the two avenues and a runway of stars into the school gate
    line(c1.s0 + 3, 6, 0, 3.4); line(c2.s0 + 3, 6, 0, 3.4);
    line(L - 44, 10, 0, 3.2);
    return items.sort((a, b) => a.s - b.s);
  }

  /* ---------- the ride ---------- */
  DU.ride = {
    live: null,
    start(o) {
      if (DU.ride.live) return DU.ride.live;
      DU.ride.live = makeRide(o || {});
      return DU.ride.live;
    },
  };

  function makeRide(o) {
    const T = window.THREE, K = DU.rideKit, data = DU.RIDE_DATA;
    const state = o.state || DU.defaultState();
    let dead = false, raf = 0;
    const api = { stop: () => quit() };

    /* ----- page ----- */
    const el = document.createElement('div');
    el.className = 'ride'; el.dir = 'rtl';
    el.innerHTML = `
      <canvas class="ride-canvas"></canvas>
      <div class="ride-fade"></div>
      <div class="ride-hud" hidden>
        <div class="ride-top">
          <button class="round-btn" data-ride="exit" aria-label="לצאת">${ico('home')}</button>
          <div class="ride-prog"><span class="rp-end">${ico('home')}</span><div class="rp-bar"><i></i><b>${ICON.bike}</b></div><span class="rp-end">${ICON.school}</span></div>
          <div class="stars-pill ride-stars">${ico('star')} <span>0</span></div>
          <button class="round-btn" data-ride="mute" aria-label="צליל">${ico(DU.sound && DU.sound.muted ? 'mute' : 'sound')}</button>
        </div>
        <div class="ride-street"></div>
        <div class="ride-chip"></div>
        <div class="ride-msg"></div>
        <div class="ride-pops"></div>
        <button class="ride-ctl rc-left" data-hold="left" aria-label="שמאלה">${ICON.left}</button>
        <button class="ride-ctl rc-right" data-hold="right" aria-label="ימינה">${ICON.right}</button>
        <button class="ride-ctl rc-jump" data-tap="jump" aria-label="קפיצה">${ICON.jump}<span>קפיצה</span></button>
        <button class="ride-ctl rc-bell" data-tap="bell" aria-label="פעמון">${ICON.bell}</button>
      </div>
      <div class="ride-panel" hidden></div>`;
    document.body.appendChild(el);
    const veil = o.veil || (() => { const v = document.createElement('div'); v.className = 'ride-load'; v.innerHTML = DU.ride.loadingHtml(); document.body.appendChild(v); return v; })();
    const hud = $('.ride-hud', el), panel = $('.ride-panel', el), fadeEl = $('.ride-fade', el);
    const msgEl = $('.ride-msg', el), streetEl = $('.ride-street', el), chipEl = $('.ride-chip', el), popsEl = $('.ride-pops', el);
    const starsEl = $('.ride-stars span', el), barFill = $('.rp-bar i', el), barBike = $('.rp-bar b', el);

    function fail(e) {
      console.error('ride failed', e);
      veil.remove();
      el.remove(); DU.ride.live = null; dead = true;
      if (DU.app && DU.app.toast) DU.app.toast('אוי, הרכיבה לא עובדת במכשיר הזה');
      if (o.onExit) o.onExit();
    }

    /* ----- 3D ----- */
    let renderer, scene, camera, world, rider, P, Models;
    try {
      renderer = new T.WebGLRenderer({ canvas: $('.ride-canvas', el), antialias: true, powerPreference: 'high-performance' });
    } catch (e) { fail(e); return api; }
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(60, 1.5, 0.3, 2500);
    function resize() {
      const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = w / h < 1 ? 78 : w / h < 1.25 ? 68 : 60;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);
    $('.ride-canvas', el).addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (!dead) fail(new Error('context lost')); });

    /* ----- game state ----- */
    const rnd = K.rng(20261126 + (o.run || 0) * 7919);
    const g = {
      mode: 'load',          // load · intro · count · ride · arrive · done
      t: 0, s: 3, lat: 0.9, v: 0, y: 0, vy: 0, steer: 0, heading: 0,
      stars: 0, polite: 0, bumps: 0, combo: 0, comboT: 0, hurtT: 0, wobble: 0, boostT: 0,
      paused: false, seen: {},
    };
    const input = { left: false, right: false, drag: 0, dragging: false };
    let things = [], lights = [], crossings = [], friends = [], ambient = [], level = [];
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
    function place(obj, s, lat, y, flip, turn) {
      P.at(s, tmp);
      obj.position.set(tmp.x + tmp.nx * lat, y || 0, tmp.z + tmp.nz * lat);
      obj.rotation.y = Math.atan2(tmp.tx, tmp.tz) + (flip ? Math.PI : 0) + (turn || 0);
    }

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
      const txt = /^(שדרות|בית|רחוב)/.test(name) ? name : 'רחוב ' + name;
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
      bell() { tone(2093, { dur: 0.5, type: 'sine', vol: 0.16 }); tone(3136, { dur: 0.35, type: 'sine', vol: 0.06 }); tone(2093, { at: 0.16, dur: 0.6, type: 'sine', vol: 0.15 }); tone(3136, { at: 0.16, dur: 0.4, type: 'sine', vol: 0.05 }); },
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
      meow() { tone(700, { dur: 0.28, type: 'triangle', vol: 0.1, slide: 1100 }); tone(1100, { at: 0.26, dur: 0.22, type: 'triangle', vol: 0.08, slide: 600 }); },
    };
    /* a little riding tune: a soft pattern that loops while she rides */
    const TUNE = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587];
    let tuneI = 0, tuneT = 0;
    function tune(dt) {
      tuneT -= dt;
      if (tuneT > 0) return;
      tuneT = 0.3;
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
      try { world = DU.rideWorld.build(scene, data, { quality: o.quality || 'high' }); }
      catch (e) { console.error('world failed', e); world = fallbackWorld(T, K, scene, data); }
      if (world && world.ready) await world.ready;
      try { DU.rideRider.CHASE = { y: CAM_UP, z: -CAM_BACK }; rider = await DU.rideRider.make(state, {}); }
      catch (e) { console.error('rider failed', e); rider = fallbackRider(T, K); }
      if (dead) return;
      scene.add(rider.group);

      // things on the way
      level = buildLevel(P, data, rnd);
      level.forEach((it) => {
        if (it.type === 'hint') { things.push(it); return; }
        const obj = make(it.kind, { seed: it.seed });
        it.obj = obj; it.r = obj.userData.r || 0.4; it.h = obj.userData.h || 0.8;
        place(obj, it.s, it.lat, it.y, it.type === 'walker' || it.type === 'cyclist');
        if (it.type === 'obst' && it.kind !== 'puddle') obj.rotation.y += (rnd() - 0.5) * 0.5;
        if (it.type === 'cat' || it.type === 'ball') { it.lat0 = it.lat; it.go = false; }
        obj.visible = false; scene.add(obj); things.push(it);
      });

      // the two big crossings: a light on her side, and traffic on the avenue
      (data.cross || []).forEach((c) => {
        const X = { n: c.n, s0: c.s0, s1: c.s1, stopS: c.s0 - 4.5, green: false, waiting: false, timer: 0, told: false, cars: [], spawn: [0.2, 1.1], poles: [] };
        [[X.stopS + 1.2, 3.5], [c.s1 + 1.5, 3.5]].forEach(([s, lat]) => { const p = make('light'); place(p, s, lat, 0, true); scene.add(p); X.poles.push(p); if (p.userData.set) p.userData.set('red'); });
        crossings.push(X);
      });

      parkCars();
      schoolEnd();
      landmarks();
      veil.remove();
      hud.hidden = false;
      intro();
      loop.last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    /* parked cars along the streets, merged into a few meshes so they cost almost nothing */
    function parkCars() {
      const junc = [];
      (data.roads || []).forEach((rd) => {
        if (!'ATRS'.includes(rd.k)) return;
        const near = [], p = rd.p; let far = 0;
        for (let i = 0; i < p.length; i += 2) { const q = P.near(p[i], p[i + 1]); if (q.d < 3) near.push(q.s); else if (q.d > 10) far++; }
        if (near.length && far) near.forEach((s) => junc.push(s));
      });
      const c1 = (data.cross || [])[0] || { s0: 545 };
      const groups = {}; // chunk of the street + material → geometries to merge
      const r2 = K.rng(77);
      for (let side = -1; side <= 1; side += 2) {
        let s = 10 + r2() * 4;
        while (s < c1.s0 - 16) {
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
            if (!hasBlob) { const sh = K.blob(2.4, 0.22); sh.position.set(car.position.x, 0.035, car.position.z); sh.scale.set(0.8, 1.9, 1); sh.rotation.z = -car.rotation.y; eat(sh); }
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

    /* the school gate: the balloon arch, the kids on the way, the crossing patrol, her friends */
    function schoolEnd() {
      const L = P.length;
      const arch = make('arch', { text: 'בוקר טוב!', backText: 'כל הכבוד!' });
      place(arch, L - 9, 0, 0, true); scene.add(arch); ambient.push(arch);
      const r3 = K.rng(5);
      for (let i = 0; i < 7; i++) {
        const kid = make('kid', { seed: 100 + i });
        const it = { type: 'kid', obj: kid, s: L - 150 + i * 19 + r3() * 8, lat: (i % 2 ? 1 : -1) * (3.25 + r3() * 0.25), v: 0.9 + r3() * 0.4 };
        place(kid, it.s, it.lat, 0); scene.add(kid); things.push(it);
      }
      [-3.45, 3.45].forEach((lat, i) => { const gd = make('guard', { seed: i }); place(gd, L - 62, lat, 0, false, lat > 0 ? -1.1 : 1.1); scene.add(gd); things.push({ type: 'guard', obj: gd, s: L - 62, lat }); });
      // friends: paper dolls like her, waiting at the gate
      const RR = DU.rideRider;
      if (RR && RR.friends && RR.doll) {
        let list = [];
        try { list = RR.friends(5, 11, state.kind); } catch (e) { console.error(e); }
        list.forEach((fs, i) => {
          const lat = [-2.7, -1.75, 1.8, 2.8, -3.6][i], s = L + [-2.7, -1.0, -0.8, -2.4, -4.2][i];
          Promise.resolve(RR.doll(fs, { pose: i % 2 ? 'wave' : 'cheer', h: 1.2 + (i % 3) * 0.06 })).then((d) => {
            if (dead) return;
            place(d, s, lat, 0, true); scene.add(d);
            friends.push({ obj: d, ph: i * 1.3, face: true });
          }).catch((e) => console.error('friend failed', e));
        });
      } else {
        [-3.2, -2.3, 2.3, 3.2].forEach((lat, i) => { const kd = make('kid', { seed: 300 + i }); place(kd, L + 1 + (i % 2) * 2, lat, 0, true, lat > 0 ? 0.5 : -0.5); scene.add(kd); ambient.push(kd); friends.push({ obj: kd, ph: i * 1.3 }); });
      }
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
      camPos.set(tmp.x + tmp.nx * (g.lat - 1.5), 1.3, tmp.z + tmp.nz * (g.lat - 1.5));
      P.at(g.s, tmp); camLook.set(tmp.x + tmp.nx * g.lat, 0.86, tmp.z + tmp.nz * g.lat);
      camera.position.copy(camPos); camera.lookAt(camLook);
      say(`<b>רוכבים לבית הספר!</b>${(state.name || '').trim() ? `<small>${esc((state.name || '').trim())} יוצאת לדרך</small>` : ''}`, 2300, 'title');
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
    }
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ----- rider ----- */
    function placeRider(dt) {
      P.at(g.s, tmp);
      const want = Math.atan2(tmp.tx, tmp.tz);
      let d = want - g.heading; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      g.heading = dt ? g.heading + d * (1 - Math.exp(-dt * 12)) : want;
      const wob = g.wobble > 0 ? Math.sin(g.t * 26) * g.wobble * 0.22 : 0;
      rider.group.position.set(tmp.x + tmp.nx * g.lat, g.y, tmp.z + tmp.nz * g.lat);
      rider.group.rotation.set(0, g.heading - g.steer * 0.16 + wob * 0.4, 0);
      return d;
    }
    function chaseTarget(out, look) {
      const back = CAM_BACK, up = CAM_UP;
      P.at(g.s - back, tmp);
      out.set(tmp.x + tmp.nx * g.lat * 0.6, up + g.y * 0.35, tmp.z + tmp.nz * g.lat * 0.6);
      P.at(g.s + 9, tmp);
      look.set(tmp.x + tmp.nx * g.lat * 0.35, 1.25 + g.y * 0.3, tmp.z + tmp.nz * g.lat * 0.35);
    }
    const camT = new T.Vector3(), lookT = new T.Vector3();
    function snapCamera() { chaseTarget(camPos, camLook); camera.position.copy(camPos); camera.lookAt(camLook); }

    function jump() {
      if (g.mode !== 'ride' || g.y > 0.02) return;
      g.vy = 5.3; g.y = 0.03; sfx.jump(); g.seen.jump = true; el.classList.remove('hint-jump');
    }
    function bell() {
      if (g.mode !== 'ride' && g.mode !== 'count' && g.mode !== 'arrive') return;
      sfx.bell(); if (rider.bell) rider.bell();
      g.seen.bell = true; el.classList.remove('hint-bell');
      const b = $('.rc-bell', el); b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring');
      let thanked = 0;
      things.forEach((it) => {
        const ds = it.s - g.s;
        if (it.done || ds < -2 || ds > 30) return;
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
        const sp = clamp(g.v / CRUISE, 0, 1.2);
        g.lat = clamp(g.lat + g.steer * 4.4 * dt * (0.35 + 0.65 * sp), -LAT_MAX, LAT_MAX);
        if (g.mode === 'arrive') g.lat = damp(g.lat, 0, 2.5, dt);

        // speed: cruise, slow for a red light, stop at the school
        let vT = CRUISE;
        const X = crossings.find((c) => !c.passed);
        if (X) {
          const dist = X.stopS - g.s;
          if (!X.green) {
            if (dist < 34) vT = Math.min(vT, Math.sqrt(Math.max(0, 2 * 2.1 * (dist - 0.15))));
            if (dist < 30 && !X.told) { X.told = true; say(`${ICON.red}<b>אור אדום</b><small>עוצרים ומחכים</small>`, 2400, 'light'); sfx.red(); }
            if (dist < 0.5 && g.v < 0.25 && !X.waiting) { X.waiting = true; X.timer = 4.4; g.v = 0; }
            if (X.waiting) {
              vT = 0; X.timer -= dt;
              X.hold = X.timer < 2.4; // the cars get their red a little before she gets her green
              const busy = X.cars.some((c) => { const f = c.u * c.dir; return f > -9 && f < 12 + c.len; });
              if (X.timer <= 0 && (!busy || X.timer < -4)) { X.waiting = false; X.green = true; X.poles.forEach((p) => p.userData.set && p.userData.set('green')); say(`${ICON.green}<b>ירוק!</b><small>ממשיכים</small>`, 1500, 'light go'); sfx.green(); }
            }
          }
          if (g.s > X.s1 + 2) X.passed = true;
        }
        if (g.mode === 'arrive') vT = Math.min(vT, Math.sqrt(Math.max(0, 2 * 2.4 * (L - 0.6 - g.s))));
        if (g.hurtT > 0) { g.hurtT -= dt; vT = Math.min(vT, CRUISE * 0.75); }
        g.wobble = Math.max(0, g.wobble - dt * 1.6);
        g.v = g.v < vT ? Math.min(vT, g.v + 3.4 * dt) : Math.max(vT, g.v - 7 * dt);
        g.s += g.v * dt;

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
      rider.update(dt, { speed: g.v, steer: clamp(g.steer + turn * 6, -1, 1), braking: false });

      updateThings(dt);
      updateTraffic(dt);
      ambient.forEach((a) => a.userData.update && a.userData.update(dt, g.t));
      friends.forEach((f) => {
        f.obj.position.y = g.mode === 'arrive' || g.mode === 'done' ? Math.abs(Math.sin(g.t * 6 + f.ph)) * 0.22 : 0;
        if (f.face) f.obj.rotation.y = Math.atan2(camera.position.x - f.obj.position.x, camera.position.z - f.obj.position.z); // paper friends always turn to us
      });

      // camera
      if (g.mode === 'ride' || g.mode === 'count' || (g.mode === 'arrive' && !g.frontCam)) {
        chaseTarget(camT, lookT);
        camPos.x = damp(camPos.x, camT.x, 5, dt); camPos.y = damp(camPos.y, camT.y, 5, dt); camPos.z = damp(camPos.z, camT.z, 5, dt);
        camLook.x = damp(camLook.x, lookT.x, 7, dt); camLook.y = damp(camLook.y, lookT.y, 7, dt); camLook.z = damp(camLook.z, lookT.z, 7, dt);
      } else if (g.frontCam) {
        g.frontT += dt;
        P.at(L + 3.4 - Math.min(0.8, g.frontT * 0.2), tmp);
        camPos.set(tmp.x + tmp.nx * (-0.8 + g.frontT * 0.05), 1.35, tmp.z + tmp.nz * (-0.8 + g.frontT * 0.05));
        // when the card comes she moves to the side of the picture (to the top on a tall screen)
        g.shift = damp(g.shift || 0, g.mode === 'done' ? 1 : 0, 3, dt);
        const wide = camera.aspect > 1.1, sh = g.shift * (wide ? 1.05 : 0);
        camLook.set(rider.group.position.x + tmp.nx * sh, 0.9 - g.shift * (wide ? 0 : 0.75), rider.group.position.z + tmp.nz * sh);
      } else if (g.mode === 'intro') {
        P.at(g.s + 3.3 - g.t * 0.1, tmp);
        camPos.set(tmp.x + tmp.nx * (g.lat - 1.5), 1.3, tmp.z + tmp.nz * (g.lat - 1.5));
      }
      camera.position.copy(camPos); camera.lookAt(camLook);
      if (world && world.update) world.update(dt, g.t, camera);

      // HUD
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
          if (!it.go && it.s - g.s < 30) {
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

        const ds = it.s - g.s, dl = it.lat - g.lat;
        if (it.type === 'star') {
          if (it.taken) continue;
          // a gentle pull when she is close
          if (ds < 2.2 && ds > -0.8 && Math.abs(dl) < 1.5 && Math.abs(it.y - g.y) < 1.3) { it.lat = damp(it.lat, g.lat, 10, dt); place(obj, it.s, it.lat, damp(obj.position.y, it.y + (g.y - it.y) * 0.6, 8, dt)); }
          if (Math.abs(ds) < 0.9 && Math.abs(dl) < 0.95 && Math.abs(it.y - g.y) < 1.15) {
            it.taken = true;
            const val = VALUE[it.kind] || 1;
            g.combo++; g.comboT = 1.1;
            if (val > 1) { sfx.big(); addStars(val, '+' + val, 'big'); } else { sfx.star(g.combo - 1); addStars(1); }
            obj.position.y = g.y + 1.05;
            if (obj.userData.collect) obj.userData.collect(); else { obj.visible = false; it.done = true; }
          }
        } else if (it.type === 'pigeon') {
          if (!it.fled && ds < 3.2 && Math.abs(dl) < 2.4) { flee(it, false); }
        } else if (it.type === 'obst') {
          if (it.hit) continue;
          const rr = it.r + 0.38;
          if (Math.abs(ds) < Math.max(0.6, it.r * 0.85) && Math.abs(dl) < rr) {
            if (it.kind === 'puddle') { if (g.y < 0.25) { it.hit = true; sfx.splash(); pop('ספלאש!', 'splash'); g.v *= 0.8; if (obj.userData.splash) obj.userData.splash(); } }
            else if (g.y < Math.min(0.75, it.h * 0.7)) { it.hit = true; bump(it); }
          }
        } else if (it.type === 'cat' || it.type === 'ball' || it.type === 'walker' || it.type === 'cyclist') {
          if (it.hit) continue;
          if (Math.abs(ds) < 0.8 && Math.abs(dl) < it.r + 0.4 && g.y < 0.5) {
            it.hit = true; bump(it);
            if (it.type === 'cat') { sfx.meow(); it.dir *= 1; }
          }
        }
      }
    }

    function updateTraffic(dt) {
      crossings.forEach((X) => {
        const near = g.s > X.s0 - 140 && g.s < X.s1 + 45;
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
            c.obj.position.set(tmp2.x + tmp2.nx * c.u, 0, tmp2.z + tmp2.nz * c.u);
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
      sfx.schoolBell();
      if (DU.app && DU.app.confetti) DU.app.confetti(150);
      await fade(0, 320);
      say('<b>הגעת לבית הספר!</b>', 2000, 'title low');
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
        [ICON.school, 'הגעת לבית הספר', 100],
      ];
      if (careful) rows.push([ICON.bike, g.bumps === 0 ? 'רכיבה מושלמת' : 'רכיבה זהירה', careful]);
      panel.innerHTML = `
        <div class="ride-card">
          <h2>איזו רכיבה!</h2>
          <div class="ride-rows">${rows.map((r) => `<div class="ride-row"><span class="i">${r[0]}</span><span class="l">${r[1]}</span><span class="p" dir="ltr">+${r[2]}</span></div>`).join('')}</div>
          <div class="ride-total">${ico('star')} <span dir="ltr">+${total}</span></div>
          ${g.polite ? `<p class="ride-note">${ICON.bell} צלצלת בנימוס ${g.polite} פעמים — כל הכבוד!</p>` : ''}
          <div class="row"><button class="btn big" data-ride="home">${ico('home')} הביתה</button><button class="btn white" data-ride="again">${ICON.bike} עוד רכיבה</button></div>
        </div>`;
      panel.className = 'ride-panel end'; panel.hidden = false; hud.classList.add('quiet');
      if (o.onReward) { try { o.onReward(total, { stars: g.stars, bumps: g.bumps, polite: g.polite }); } catch (e) { console.error(e); } }
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
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
      document.removeEventListener('visibilitychange', onVis);
      try { if (world && world.dispose) world.dispose(); } catch (e) { console.error(e); }
      try { if (rider && rider.dispose) rider.dispose(); } catch (e) { console.error(e); }
      try { K.dispose(scene); renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); } catch (e) { console.error(e); }
      el.remove(); if (veil.isConnected) veil.remove();
      DU.ride.live = null;
      if (again) DU.ride.start(Object.assign({}, o, { veil: null, run: (o.run || 0) + 1 }));
      else if (o.onExit) o.onExit();
    }

    /* ----- input ----- */
    function onKey(e) {
      const down = e.type === 'keydown';
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ש') input.left = down;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'ג') input.right = down;
      else if (down && !e.repeat && (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W')) jump();
      else if (down && !e.repeat && (k === 'Enter' || k === 'b' || k === 'B' || k === 'ArrowDown')) bell();
      else if (down && k === 'Escape') { if (g.paused) { g.paused = false; panel.hidden = true; } else askExit(); }
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
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

    api.debug = { g, scene, camera, renderer, things, crossings, step: (dt) => update(dt), render: () => renderer.render(scene, camera), get P() { return P; }, get rider() { return rider; }, jump, bell };
    build().catch(fail);
    return api;
  }

  DU.ride.loadingHtml = () => `<div class="ride-load-card"><div class="ride-wheel">${ICON.bike}</div><b>מכינים את האופניים…</b></div>`;
})();
