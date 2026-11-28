/* motion.js — moving a rigged character (DU.renderCard(state, { rig: true })) and small effects.
   Parts are moved by writing the SVG `transform` attribute (not CSS), so it behaves the same in
   every browser. Each [data-part] group has its own origin at the joint, so "rotate(20)" just works. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const n = (v) => Math.round(v * 100) / 100;
  const M = (DU.motion = {});

  M.reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  M.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  M.ease = {
    lin: (k) => k,
    out: (k) => 1 - Math.pow(1 - k, 3),
    inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    back: (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }, // overshoots a little
    bounce: (k) => Math.sin(k * Math.PI), // 0 → 1 → 0
  };
  /* run fn(k) with k from 0 to 1 over ms. → { done: Promise, cancel() } */
  M.tween = function (ms, fn, ease) {
    let raf = 0, stop = false, fin;
    const e = ease || M.ease.out;
    const done = new Promise((r) => (fin = r));
    if (!ms || ms < 0) { fn(1); fin(); return { done, cancel() {} }; }
    const t0 = performance.now();
    const tick = (t) => {
      if (stop) return;
      const k = Math.min(1, (t - t0) / ms);
      fn(e(k), k);
      if (k < 1) raf = requestAnimationFrame(tick); else fin();
    };
    raf = requestAnimationFrame(tick);
    return { done, cancel() { stop = true; cancelAnimationFrame(raf); fin(); } };
  };
  /* set the transform of every [data-part=name] under root, e.g. M.set(svg, 'all', 'translate(0 -20)') */
  M.set = function (root, name, transform) {
    root.querySelectorAll(`[data-part="${name}"]`).forEach((g) => { if (transform) g.setAttribute('transform', transform); else g.removeAttribute('transform'); });
  };

  /* ---------- poses ----------
     pose = { armL: [raise, bend], armR: [raise, bend], head: deg }
     raise: how far the whole arm lifts away from the body (0 hanging · 90 straight out · 150 up)
     bend:  the elbow; + bends the forearm outward / up, − inward (hand to the hip)
     armL is the arm on the LEFT of the picture (it holds wands, cups…), armR the one on the right (bags).
     A pose may also have: lean (deg, her whole body tips around her feet; + = to the right of the picture),
     and, used by DU.strike only: eyes / mouth (ids from face.js), hop (how high), fx ('star' | 'heart'). */
  DU.POSES = {
    rest: {},
    hip: { armR: [40, -112], head: 4 },
    wave: { armL: [62, 112], head: -5 },
    cheer: { armL: [142, 18], armR: [142, 18] },
    peace: { armR: [34, 138], head: 6 },
    shy: { armL: [10, -34], armR: [10, -34], head: -7 },
    star: { armL: [96, 10], armR: [40, -112], head: 5 },
    show: { armL: [78, 28], head: -4 },
    /* the poses of the class design show (school.js): each a different silhouette */
    model: { armL: [40, -112], armR: [40, -112], head: -5, lean: -2, mouth: 'smirk' }, // both hands on her hips
    hello: { armL: [70, 102], head: -5, lean: -3, eyes: 'happy', mouth: 'big' }, // a big wave
    jump: { armL: [142, 18], armR: [142, 18], eyes: 'happy', mouth: 'big', hop: 34, fx: 'star' }, // arms up, and she hops
    vee: { armR: [34, 138], head: 7, lean: 3, eyes: 'wink', mouth: 'grin' }, // a hand by her cheek, a wink
    diva: { armL: [96, 10], armR: [40, -112], head: 5, lean: 2, mouth: 'big', fx: 'star' }, // one arm out, one on the hip
    ballet: { armL: [136, 32], armR: [82, -30], head: 6, eyes: 'calm', mouth: 'smile' }, // one arm curved up, one curved out
    love: { armL: [20, -150], armR: [20, -150], head: 6, eyes: 'happy', mouth: 'smile', fx: 'heart' }, // hands on her heart
    plane: { armL: [84, 4], armR: [84, 4], head: 8, lean: 9, mouth: 'big' }, // arms out like wings, tipping over
    strong: { armL: [88, 98], armR: [88, 98], mouth: 'grin' }, // showing her muscles
    kiss: { armL: [38, 156], armR: [28, 18], head: -6, lean: -3, eyes: 'wink', mouth: 'kiss', fx: 'heart' }, // blows a kiss
    curtsy: { armL: [32, 16], armR: [32, 16], head: 8, eyes: 'calm', mouth: 'smile' }, // holds her skirt out and bows her head
    disco: { armL: [138, 0], armR: [34, 12], head: -5, lean: -5, mouth: 'big', fx: 'star' }, // one arm to the sky, one to the floor
  };
  /* the poses she can choose from, with their names (school.js draws the strip from this) */
  DU.POSE_LIST = [
    { id: 'model', name: 'דוגמנית' }, { id: 'hello', name: 'שלום!' }, { id: 'jump', name: 'קפיצה' }, { id: 'vee', name: 'קריצה' },
    { id: 'diva', name: 'כוכבת' }, { id: 'ballet', name: 'בלרינה' }, { id: 'love', name: 'לב' }, { id: 'plane', name: 'מטוס' },
    { id: 'strong', name: 'חזקה' }, { id: 'kiss', name: 'נשיקה' }, { id: 'curtsy', name: 'קידה' }, { id: 'disco', name: 'דיסקו' },
  ];
  const cur = new WeakMap(); // root → current numbers
  const leanOf = new WeakMap(); // root → how far she leans now; only roots that were ever asked to lean are in it
  const hopping = new WeakSet(); // roots in the middle of a hop (the hop writes the 'all' part then)
  const zero = () => ({ lr: 0, lb: 0, rr: 0, rb: 0, h: 0, ln: 0 });
  const nums = (p) => ({ lr: (p.armL || [0, 0])[0], lb: (p.armL || [0, 0])[1], rr: (p.armR || [0, 0])[0], rb: (p.armR || [0, 0])[1], h: p.head || 0, ln: p.lean || 0 });
  function applyPose(root, v) {
    [['l', -1, v.lr, v.lb], ['r', 1, v.rr, v.rb]].forEach(([side, s, raise, bend]) => {
      M.set(root, 'arm-' + side, raise ? `rotate(${n(-s * raise)})` : '');
      M.set(root, 'fore-' + side, bend ? `rotate(${n(-s * bend)})` : '');
      M.set(root, 'joint-' + side, bend ? `rotate(${n((-s * bend) / 2)})` : '');
      root.querySelectorAll(`[data-joint="${side}"]`).forEach((j) => (j.style.display = Math.abs(bend) > 0.5 ? '' : 'none'));
    });
    M.set(root, 'head', v.h ? `rotate(${n(v.h)})` : '');
    M.set(root, 'hairback', v.h ? `rotate(${n(v.h)})` : '');
    if (leanOf.has(root)) { // a girl who never leans is never touched here: the 'all' part stays with whoever moves it
      leanOf.set(root, v.ln || 0);
      if (!hopping.has(root)) M.set(root, 'all', v.ln ? `rotate(${n(v.ln)})` : '');
    }
  }
  /* move to a pose (name or object) in ms milliseconds. → Promise */
  DU.pose = function (root, pose, ms = 0, ease) {
    if (typeof pose === 'string') pose = DU.POSES[pose] || {};
    const to = nums(pose || {}), from = Object.assign(zero(), cur.get(root));
    if (to.ln && !leanOf.has(root)) leanOf.set(root, 0);
    const old = root._poseTween; if (old) old.cancel();
    const tw = M.tween(M.reduced() ? 0 : ms, (k) => {
      const v = {}; Object.keys(to).forEach((key) => (v[key] = from[key] + (to[key] - from[key]) * k));
      cur.set(root, v); applyPose(root, v);
    }, ease || M.ease.back);
    root._poseTween = tw;
    return tw.done;
  };
  /* a pose that suits what she holds: never swings the bag arm high */
  DU.safePose = function (state, name) {
    const p = Object.assign({}, DU.POSES[name] || {});
    const w = (state && state.wear) || {};
    const bagItem = w.bag && DU.itemById[w.bag.id];
    if (bagItem && p.armR && (p.armR[0] > 45 || Math.abs(p.armR[1]) > 60)) p.armR = [16, -12];
    return p;
  };
  /* the same pose as she can strike it with full hands. An arm that holds something never swings (a thing in the
     'hand' slot is in the arm on the left of the picture, a bag on the right one). A pose whose big arm is the busy one
     moves to her free arm (the mirror picture); if that does not help, the busy arm just stays low. */
  DU.freePose = function (state, pose) {
    const p = Object.assign({}, typeof pose === 'string' ? DU.POSES[pose] || {} : pose || {});
    const w = (state && state.wear) || {};
    const busyL = !!(w.hand && DU.itemById[w.hand.id]), busyR = !!(w.bag && DU.itemById[w.bag.id]);
    const big = (a) => !!a && (a[0] > 45 || Math.abs(a[1]) > 60);
    const clash = (q) => (busyL && big(q.armL)) || (busyR && big(q.armR));
    if (!clash(p)) return p;
    const m = Object.assign({}, p, { armL: p.armR, armR: p.armL, head: -(p.head || 0), lean: -(p.lean || 0) });
    if (!clash(m)) return m;
    if (busyL && big(p.armL)) p.armL = [20, 12];
    if (busyR && big(p.armR)) p.armR = [16, -12];
    return p;
  };

  /* a little hop with squash and stretch (the whole girl, origin at her feet) → Promise */
  M.hop = function (root, height = 26, ms = 420) {
    if (M.reduced()) return Promise.resolve();
    const lean = () => { const a = leanOf.get(root); return a ? `rotate(${n(a)})` : ''; }; // she keeps leaning while she hops
    hopping.add(root);
    return M.tween(ms, (e, k) => {
      const up = Math.sin(k * Math.PI), sq = k < 0.12 ? 1 - k * 0.8 : k > 0.86 ? 1 - (1 - k) * 0.9 : 1 + up * 0.035, l = lean();
      M.set(root, 'all', `translate(0 ${n(-height * up)}) ${l ? l + ' ' : ''}scale(${n(2 - sq)} ${n(sq)})`);
    }, M.ease.lin).done.then(() => { hopping.delete(root); M.set(root, 'all', lean()); });
  };
  /* blink once */
  M.blink = function (root, ms = 150) {
    if (M.reduced()) return Promise.resolve();
    return M.tween(ms, (e, k) => M.set(root, 'eyes', `scale(1 ${n(1 - 0.92 * Math.sin(k * Math.PI))})`), M.ease.lin).done.then(() => M.set(root, 'eyes', ''));
  };

  /* ---------- expressions ---------- */
  const charOf = (root) => (root.matches && root.matches('.du-char') ? root : root.querySelector('.du-char'));
  DU.setEyes = function (root, shape) {
    const c = charOf(root); if (!c) return;
    const g = c.querySelector('[data-part="eyes"] > g');
    if (g) g.innerHTML = DU.drawEyes(shape || c.dataset.eyeShape, c.dataset.eyeColor, c.dataset.uid);
  };
  DU.setMouth = function (root, id) {
    const c = charOf(root); if (!c) return;
    const g = c.querySelector('[data-part="mouth"]');
    if (g) g.innerHTML = DU.drawMouth(id || c.dataset.mouth, c.dataset.lips || null);
  };

  /* ---------- sparkles ----------
     DU.fx.burst(host, x, y, opts): x, y in % of the host box (host must be positioned).
     opts: { count, colors, spread (% of host width), size (% of host width), ms, z, shape: 'star' | 'heart' | 'dot' } */
  const STAR = 'M0 -10C1.2 -3 3 -1.2 10 0C3 1.2 1.2 3 0 10C-1.2 3 -3 1.2 -10 0C-3 -1.2 -1.2 -3 0 -10Z';
  const HEART = 'M0 8C-10 1 -10 -8 -4.5 -8C-2 -8 0 -6 0 -4.5C0 -6 2 -8 4.5 -8C10 -8 10 1 0 8Z';
  DU.fx = {
    STAR,
    burst(host, x, y, opts = {}) {
      if (M.reduced() || !host || !host.animate) return;
      const W = host.clientWidth || 300;
      const count = opts.count || 12, colors = opts.colors || ['#ffd54d', '#ff8fc0', '#ffffff', '#b99cff', '#7de3e0'];
      const spread = ((opts.spread || 16) / 100) * W, size = ((opts.size || 3.4) / 100) * W;
      const d = opts.shape === 'heart' ? HEART : opts.shape === 'dot' ? 'M0 -6A6 6 0 1 1 0 6A6 6 0 1 1 0 -6Z' : STAR;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.6, r = spread * (0.45 + Math.random() * 0.75);
        const s = Math.max(6, size * (0.5 + Math.random()));
        const e = document.createElement('span');
        e.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;pointer-events:none;z-index:${opts.z || 30}`;
        e.innerHTML = `<svg viewBox="-10 -10 20 20" style="display:block;width:100%;height:100%"><path d="${d}" fill="${colors[i % colors.length]}"/></svg>`;
        host.appendChild(e);
        e.animate(
          [
            { transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 1 },
            { transform: `translate(${Math.cos(a) * r * 0.7}px, ${Math.sin(a) * r * 0.7}px) scale(1.15) rotate(${90 + Math.random() * 90}deg)`, opacity: 1, offset: 0.45 },
            { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r + size}px) scale(0) rotate(240deg)`, opacity: 0 },
          ],
          { duration: (opts.ms || 720) * (0.75 + Math.random() * 0.5), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }
        ).onfinish = () => e.remove();
      }
    },
  };

  /* ---------- strike a pose, with everything it has ----------
     Arms, head and lean move as in DU.pose; her face changes with it (pose.eyes / pose.mouth, or back to her own);
     she hops if the pose has a hop; a burst of stars or hearts opens around her head if it has an fx.
     o = { ms, fxHost (a positioned element for the burst), quiet: true = no hop and no burst (just trying it on) } → Promise */
  DU.strike = function (root, pose, o = {}) {
    if (typeof pose === 'string') pose = DU.POSES[pose] || {};
    pose = pose || {};
    const done = DU.pose(root, pose, o.ms == null ? 380 : o.ms);
    DU.setEyes(root, pose.eyes); DU.setMouth(root, pose.mouth);
    if (o.quiet || M.reduced()) return done;
    if (pose.hop) M.hop(root, pose.hop, 480);
    const host = o.fxHost, head = pose.fx && host && root.querySelector('[data-part="head"]');
    if (head) {
      const a = host.getBoundingClientRect(), b = head.getBoundingClientRect();
      if (a.width && b.width) {
        const heart = pose.fx === 'heart';
        DU.fx.burst(host, ((b.left + b.width / 2 - a.left) / a.width) * 100, ((b.top + b.height * 0.45 - a.top) / a.height) * 100,
          { shape: heart ? 'heart' : 'star', count: 12, spread: (b.width / a.width) * 105, size: (b.width / a.width) * 20, colors: heart ? ['#ff5fa2', '#ff9ac1', '#ffffff', '#ffc1d9'] : undefined });
      }
    }
    return done;
  };
})();
