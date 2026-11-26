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
     armL is the arm on the LEFT of the picture (it holds wands, cups…), armR the one on the right (bags). */
  DU.POSES = {
    rest: {},
    hip: { armR: [40, -112], head: 4 },
    wave: { armL: [62, 112], head: -5 },
    cheer: { armL: [142, 18], armR: [142, 18] },
    peace: { armR: [34, 138], head: 6 },
    shy: { armL: [10, -34], armR: [10, -34], head: -7 },
    star: { armL: [96, 10], armR: [40, -112], head: 5 },
    show: { armL: [78, 28], head: -4 },
  };
  const cur = new WeakMap(); // root → current numbers
  const zero = () => ({ lr: 0, lb: 0, rr: 0, rb: 0, h: 0 });
  const nums = (p) => ({ lr: (p.armL || [0, 0])[0], lb: (p.armL || [0, 0])[1], rr: (p.armR || [0, 0])[0], rb: (p.armR || [0, 0])[1], h: p.head || 0 });
  function applyPose(root, v) {
    [['l', -1, v.lr, v.lb], ['r', 1, v.rr, v.rb]].forEach(([side, s, raise, bend]) => {
      M.set(root, 'arm-' + side, raise ? `rotate(${n(-s * raise)})` : '');
      M.set(root, 'fore-' + side, bend ? `rotate(${n(-s * bend)})` : '');
      M.set(root, 'joint-' + side, bend ? `rotate(${n((-s * bend) / 2)})` : '');
      root.querySelectorAll(`[data-joint="${side}"]`).forEach((j) => (j.style.display = Math.abs(bend) > 0.5 ? '' : 'none'));
    });
    M.set(root, 'head', v.h ? `rotate(${n(v.h)})` : '');
    M.set(root, 'hairback', v.h ? `rotate(${n(v.h)})` : '');
  }
  /* move to a pose (name or object) in ms milliseconds. → Promise */
  DU.pose = function (root, pose, ms = 0, ease) {
    if (typeof pose === 'string') pose = DU.POSES[pose] || {};
    const to = nums(pose || {}), from = cur.get(root) || zero();
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

  /* a little hop with squash and stretch (the whole girl, origin at her feet) → Promise */
  M.hop = function (root, height = 26, ms = 420) {
    if (M.reduced()) return Promise.resolve();
    return M.tween(ms, (e, k) => {
      const up = Math.sin(k * Math.PI), sq = k < 0.12 ? 1 - k * 0.8 : k > 0.86 ? 1 - (1 - k) * 0.9 : 1 + up * 0.035;
      M.set(root, 'all', `translate(0 ${n(-height * up)}) scale(${n(2 - sq)} ${n(sq)})`);
    }, M.ease.lin).done.then(() => M.set(root, 'all', ''));
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
})();
